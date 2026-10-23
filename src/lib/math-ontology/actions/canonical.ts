import { createHash } from "node:crypto";

export type CanonicalValue =
  | null
  | boolean
  | number
  | string
  | CanonicalValue[]
  | { [key: string]: CanonicalValue };

/** tm-json-1: UTF-8 JSON; UTF-16 key order; arrays retain order; no coercion.
 * This bounded application format is not advertised as general RFC 8785.
 */
export function canonicalBytes(input: unknown): string {
  const active = new Set<object>();
  function visit(value: unknown, depth: number): CanonicalValue {
    if (depth > 64) throw new Error("canonical-depth");
    if (
      value === null ||
      typeof value === "boolean" ||
      typeof value === "string"
    )
      return value;
    if (typeof value === "number") {
      if (
        !Number.isFinite(value) ||
        Object.is(value, -0) ||
        Math.abs(value) > Number.MAX_SAFE_INTEGER
      )
        throw new Error("canonical-number");
      return value;
    }
    if (typeof value !== "object" || active.has(value))
      throw new Error("canonical-value");
    if (
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null
    )
      throw new Error("canonical-object");
    active.add(value);
    try {
      if (Array.isArray(value)) {
        if (Object.keys(value).length !== value.length)
          throw new Error("canonical-array");
        return value.map((entry) => visit(entry, depth + 1));
      }
      if (Object.getOwnPropertySymbols(value).length)
        throw new Error("canonical-symbol");
      const output: { [key: string]: CanonicalValue } = Object.create(null);
      for (const key of Object.keys(value).sort()) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
        if (!("value" in descriptor)) throw new Error("canonical-accessor");
        output[key] = visit(descriptor.value, depth + 1);
      }
      return output;
    } finally {
      active.delete(value);
    }
  }
  const bytes = JSON.stringify(visit(input, 0));
  if (Buffer.byteLength(bytes, "utf8") > 1_048_576)
    throw new Error("canonical-size");
  return bytes;
}

export function digest(bytes: string): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(bytes, "utf8").digest("hex")}`;
}

export function checkedCanonical(
  bytes: string,
  expectedHash: string,
): CanonicalValue {
  const value: unknown = JSON.parse(bytes);
  if (canonicalBytes(value) !== bytes || digest(bytes) !== expectedHash)
    throw new Error("binding-bytes");
  return value as CanonicalValue;
}
