import { PGlite } from "@electric-sql/pglite";
import type { CountSql } from "@/lib/problem/questionCountSql";
import { problemVisibleWhere } from "@/lib/problemPool";

type Row = Record<string, unknown>;
type Args = {
  where?: Row;
  select?: Row;
  by?: string[];
  orderBy?: Row | Row[];
  skip?: number;
  take?: number;
};
const quote = (field: string) => `"${field.replaceAll('"', '""')}"`;

/** Real local PostgreSQL for the measured Prisma read subset. Unsupported shapes fail. */
export async function builderSpeedPglite(
  rows: Row[],
  units: Row[],
  materials: Row[] = [],
) {
  rows = rows.map((row) => ({
    actualFormat: null,
    actualFormatVersion: null,
    actualFormatDigest: null,
    ...row,
  }));
  const pg = new PGlite();
  await pg.exec(`CREATE TYPE difficulty AS ENUM ('연산','기본','응용','심화하','심화중','심화상','기초','실력','심화','최상위');
    CREATE TYPE problem_source AS ENUM ('manual','past_exam','school_textbook','transformed','ai_generated');
    CREATE TYPE problem_pool AS ENUM ('shared','private');
    CREATE TYPE review_status AS ENUM ('pending','approved','rejected');`);
  const types: Record<string, string> = {
    difficulty: "difficulty",
    source: "problem_source",
    pool: "problem_pool",
    reviewStatus: "review_status",
    id: "uuid",
    unitId: "uuid",
    sourceMaterialId: "uuid",
    originProblemId: "uuid",
    userId: "uuid",
    directUseAllowed: "boolean",
    questionNumber: "integer",
    figureUrls: "text[]",
    figureDims: "integer[]",
    figureSourceMm: "double precision[]",
    choiceFigureIndex: "integer[]",
    createdAt: "timestamptz",
    updatedAt: "timestamptz",
  };
  const names = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  await pg.exec(`CREATE TABLE fixture_problem (${names.map((name) => `${quote(name)} ${types[name] ?? "text"}`).join(",")});
    CREATE TABLE fixture_unit (id uuid, grade text, chapter text, section text, "orderIndex" integer, semester integer);`);
  await pg.query(
    `INSERT INTO fixture_problem SELECT * FROM jsonb_populate_recordset(NULL::fixture_problem, $1::jsonb)`,
    [JSON.stringify(rows)],
  );
  await pg.query(
    `INSERT INTO fixture_unit SELECT * FROM jsonb_populate_recordset(NULL::fixture_unit, $1::jsonb)`,
    [JSON.stringify(units)],
  );
  const mapped = [
    "unitId",
    "sourceMaterialId",
    "questionGroupKey",
    "familyKey",
    "questionType",
    "problemType",
    "reviewStatus",
    "directUseAllowed",
    "problemCode",
    "questionNumber",
    "figureSvg",
    "figureUrls",
    "actualFormat",
    "actualFormatVersion",
    "actualFormatDigest",
  ];
  await pg.exec(`CREATE TABLE source_material (id uuid, book_id uuid, kind text);
    CREATE TABLE source_book (id uuid);
    CREATE VIEW problem AS SELECT *, xmin, ${mapped.map((field) => `${quote(field)} AS ${quote(field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`))}`).join(",")} FROM fixture_problem;
    CREATE VIEW unit AS SELECT *, xmin, "orderIndex" AS order_index FROM fixture_unit;
    CREATE UNIQUE INDEX ON fixture_problem (id);
    CREATE INDEX ON fixture_problem ("unitId"); CREATE INDEX ON fixture_problem ("questionGroupKey"); ANALYZE fixture_problem;`);
  if (materials.length)
    await pg.query(
      `INSERT INTO source_material SELECT * FROM jsonb_populate_recordset(NULL::source_material, $1::jsonb)`,
      [
        JSON.stringify(
          materials.map((m) => ({ id: m.id, book_id: m.bookId, kind: m.kind })),
        ),
      ],
    );
  await pg.exec("SET default_transaction_read_only = on");

  function compile(
    where: Row | undefined,
    values: unknown[],
    alias = "p",
  ): string {
    const param = (value: unknown) => {
      values.push(value);
      return `$${values.length}`;
    };
    const clauses: string[] = [];
    for (const [field, condition] of Object.entries(where ?? {})) {
      if (field === "AND" || field === "OR") {
        const array = Array.isArray(condition) ? condition : [condition];
        const parts = array.map((clause) =>
          compile(clause as Row, values, alias),
        );
        clauses.push(
          `(${parts.join(field === "AND" ? " AND " : " OR ") || (field === "AND" ? "TRUE" : "FALSE")})`,
        );
        continue;
      }
      if (field === "NOT") {
        const array = Array.isArray(condition) ? condition : [condition];
        clauses.push(
          ...array.map(
            (clause) => `(NOT (${compile(clause as Row, values, alias)}))`,
          ),
        );
        continue;
      }
      if (field === "unit") {
        clauses.push(
          `EXISTS (SELECT 1 FROM unit u WHERE u.id=p."unitId" AND ${compile(condition as Row, values, "u")})`,
        );
        continue;
      }
      if (field === "sourceMaterial") {
        clauses.push(
          `EXISTS (SELECT 1 FROM source_material m WHERE m.id=p."sourceMaterialId" AND ${compile(condition as Row, values, "m")})`,
        );
        continue;
      }
      if (
        !names.includes(field) &&
        ![
          "grade",
          "chapter",
          "section",
          "orderIndex",
          "semester",
          "bookId",
          "kind",
        ].includes(field)
      )
        throw Error(`Unmeasured field: ${field}`);
      const col = `${alias}.${quote(alias === "m" && field === "bookId" ? "book_id" : field)}`;
      if (condition === null) {
        clauses.push(`${col} IS NULL`);
        continue;
      }
      if (typeof condition !== "object") {
        clauses.push(`${col} = ${param(condition)}`);
        continue;
      }
      const object = condition as Row;
      for (const [operator, value] of Object.entries(object)) {
        switch (operator) {
          case "mode":
            break;
          case "equals":
            clauses.push(
              value === null ? `${col} IS NULL` : `${col} = ${param(value)}`,
            );
            break;
          case "not":
            clauses.push(
              value === null
                ? `${col} IS NOT NULL`
                : `${col} <> ${param(value)}`,
            );
            break;
          case "in":
          case "notIn": {
            const list = value as unknown[];
            clauses.push(
              list.length
                ? `${col} ${operator === "in" ? "IN" : "NOT IN"} (${list.map(param).join(",")})`
                : operator === "in"
                  ? "FALSE"
                  : "TRUE",
            );
            break;
          }
          case "contains":
          case "startsWith": {
            const escaped = String(value)
              .replaceAll("\\", "\\\\")
              .replaceAll("%", "\\%")
              .replaceAll("_", "\\_");
            clauses.push(
              `${col} ${object.mode === "insensitive" ? "ILIKE" : "LIKE"} ${param(`${operator === "contains" ? "%" : ""}${escaped}%`)}`,
            );
            break;
          }
          case "gte":
          case "lte":
            clauses.push(
              `${col} ${operator === "gte" ? ">=" : "<="} ${param(value)}`,
            );
            break;
          case "isEmpty":
            clauses.push(`cardinality(${col}) ${value ? "=" : ">"} 0`);
            break;
          default:
            throw Error(`Unmeasured operator: ${operator}`);
        }
      }
    }
    return clauses.join(" AND ") || "TRUE";
  }
  const whereSql = (args: Args, values: unknown[]) =>
    compile({ AND: [problemVisibleWhere(), args.where ?? {}] }, values);
  return {
    close: () => pg.close(),
    async queryRaw(query: CountSql) {
      return (await pg.query<Row>(query.text, query.values)).rows;
    },
    async findMany(args: Args = {}) {
      const values: unknown[] = [];
      const fields = Object.entries(
        args.select ?? Object.fromEntries(names.map((name) => [name, true])),
      )
        .filter(([, selected]) => selected)
        .map(([field]) => {
          if (field === "unit")
            return "(SELECT json_build_object('grade',u.grade,'chapter',u.chapter,'section',u.section) FROM unit u WHERE u.id=p.\"unitId\") AS unit";
          if (!names.includes(field))
            throw Error(`Unmeasured selection: ${field}`);
          return `p.${quote(field)}`;
        });
      const order = (
        Array.isArray(args.orderBy)
          ? args.orderBy
          : args.orderBy
            ? [args.orderBy]
            : []
      ).flatMap((item) =>
        Object.entries(item).map(([field, direction]) => {
          if (field === "unit")
            return `(SELECT u."orderIndex" FROM unit u WHERE u.id=p."unitId") ${String((direction as Row).orderIndex)}`;
          return `p.${quote(field)} ${String(direction)}`;
        }),
      );
      return (
        await pg.query<Row>(
          `SELECT ${fields.join(",")} FROM problem p WHERE ${whereSql(args, values)} ${order.length ? `ORDER BY ${order.join(",")}` : ""} ${args.take === undefined ? "" : `LIMIT ${args.take}`} OFFSET ${args.skip ?? 0}`,
          values,
        )
      ).rows;
    },
    async groupBy(args: Args) {
      const values: unknown[] = [];
      const columns = args.by!.map((field) => `p.${quote(field)}`).join(",");
      const result = (
        await pg.query<Row>(
          `SELECT ${columns}, count(*)::int AS n FROM problem p WHERE ${whereSql(args, values)} GROUP BY ${columns}`,
          values,
        )
      ).rows;
      return result.map(({ n, ...row }) => ({ ...row, _count: { _all: n } }));
    },
    async count(args: Args) {
      const values: unknown[] = [];
      return (
        await pg.query<{ n: number }>(
          `SELECT count(*)::int AS n FROM problem p WHERE ${whereSql(args, values)}`,
          values,
        )
      ).rows[0].n;
    },
  };
}
