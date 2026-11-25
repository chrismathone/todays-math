import { Prisma } from "@prisma/client";
import type { PGlite } from "@electric-sql/pglite";
import type { ScanSql } from "@/lib/concept-blank/scan/database";

/** Prisma 6.19.3 native engine, NOT SQL-context inference.
 * Client encoding: https://github.com/prisma/prisma/blob/6.19.3/packages/client/src/runtime/utils/serializeRawParameters.ts
 * Engine c2990dca591cba766e3b7ef5d9e8a84796e47ab7:
 * https://github.com/prisma/prisma-engines/blob/c2990dca591cba766e3b7ef5d9e8a84796e47ab7/libs/prisma-value/src/lib.rs#L170
 * https://github.com/prisma/prisma-engines/blob/c2990dca591cba766e3b7ef5d9e8a84796e47ab7/query-engine/connectors/sql-query-connector/src/query_ext.rs#L204
 * https://github.com/prisma/prisma-engines/blob/c2990dca591cba766e3b7ef5d9e8a84796e47ab7/quaint/src/connector/postgres/native/conversion.rs#L29
 * JS integer/bigint -> INT8; fraction/Decimal -> NUMERIC; string -> TEXT
 * (including UUID/ISO/JSON strings); object -> JSONB; null -> UNKNOWN.
 * Empty, heterogeneous and nested arrays are UNKNOWN; homogeneous arrays
 * use the element array OID. Null array elements have the Int32 variant.
 * This models parameter typing and void rejection, not every Prisma result codec.
 */
export function prismaPgParameter(value: unknown): {
  oid: number;
  value: unknown;
  kind: string;
} {
  if (value == null || typeof value === "function" || typeof value === "symbol")
    return { oid: 705, value: null, kind: "int32" };
  if (typeof value === "string") return { oid: 25, value, kind: "text" };
  if (typeof value === "boolean") return { oid: 16, value, kind: "bool" };
  if (typeof value === "bigint")
    return { oid: 20, value: value.toString(), kind: "int64" };
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      return { oid: 705, value: null, kind: "int32" };
    const integer =
      Number.isInteger(value) && value >= -(2 ** 63) && value < 2 ** 63;
    return {
      oid: integer ? 20 : 1700,
      value,
      kind: integer ? "int64" : "numeric",
    };
  }
  if (value instanceof Date)
    return { oid: 1184, value: value.toISOString(), kind: "date" };
  if (Prisma.Decimal.isDecimal(value))
    return { oid: 1700, value: value.toString(), kind: "numeric" };
  if (
    value instanceof ArrayBuffer ||
    value instanceof SharedArrayBuffer ||
    ArrayBuffer.isView(value)
  ) {
    const bytes = ArrayBuffer.isView(value)
      ? Buffer.from(value.buffer, value.byteOffset, value.byteLength)
      : Buffer.from(value);
    return { oid: 17, value: bytes, kind: "bytes" };
  }
  if (Array.isArray(value)) {
    const items = value.map(prismaPgParameter);
    const arrayOids: Record<string, number> = {
      int32: 1007,
      int64: 1016,
      numeric: 1231,
      text: 1009,
      bool: 1000,
      date: 1185,
      bytes: 1001,
      json: 3807,
    };
    return {
      oid:
        items.length && items.every((item) => item.kind === items[0].kind)
          ? (arrayOids[items[0].kind] ?? 705)
          : 705,
      value: items.map((item) => item.value),
      kind: "array",
    };
  }
  // JSON serialization also honors toJSON and the client's nested bigint fallback.
  const json = JSON.parse(
    JSON.stringify(value, (_key, item) =>
      typeof item === "bigint" ? item.toString() : item,
    ),
  );
  if (json === null || typeof json !== "object" || Array.isArray(json))
    return prismaPgParameter(json);
  return { oid: 3802, value: json, kind: "json" };
}

export function bindPrismaPglite(client: Pick<PGlite, "query">): ScanSql {
  return {
    async query<T extends object>(
      sql: string,
      values: readonly unknown[] = [],
    ) {
      const params = values.map(prismaPgParameter);
      const result = await client.query<T>(
        sql,
        params.map((p) => p.value),
        { paramTypes: params.map((p) => p.oid) },
      );
      if (result.fields.some((field) => field.dataTypeID === 2278))
        throw new Error("Failed to deserialize column of type 'void'");
      return result.rows;
    },
  };
}
