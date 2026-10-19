import "server-only";
import { Prisma } from "@prisma/client";
import { ANSWER_CIRCLED_CLASS } from "@/lib/math/circledNumber";
import { problemEligibleWhere } from "@/lib/problemEligibility";
import { problemVisibleWhere } from "@/lib/problemPool";
import type { QuestionFormat } from "@/contracts/questionFormats.contract";
import { ENGINE_FAMILY_PREFIXES } from "./provenance";
import { questionFormatWithoutContent } from "./questionFormat";

const columns: Record<string, [string, string?]> = {
  id: ["id", "uuid"],
  unitId: ["unit_id", "uuid"],
  sourceMaterialId: ["source_material_id", "uuid"],
  questionGroupKey: ["question_group_key"],
  familyKey: ["family_key"],
  difficulty: ["difficulty", "enum"],
  source: ["source", "enum"],
  pool: ["pool", "enum"],
  reviewStatus: ["review_status", "enum"],
  questionType: ["question_type"],
  problemType: ["problem_type"],
  answer: ["answer"],
  content: ["content"],
  solution: ["solution"],
  directUseAllowed: ["direct_use_allowed", "boolean"],
  problemCode: ["problem_code"],
  school: ["school"],
  questionNumber: ["question_number", "integer"],
  figureSvg: ["figure_svg"],
  figureUrls: ["figure_urls", "array"],
};
const unitColumns: Record<string, [string, string?]> = {
  id: ["id", "uuid"],
  grade: ["grade"],
  chapter: ["chapter"],
  section: ["section"],
  orderIndex: ["order_index", "integer"],
  semester: ["semester", "integer"],
};
const materialColumns: Record<string, [string, string?]> = {
  id: ["id", "uuid"],
  bookId: ["book_id", "uuid"],
  kind: ["kind"],
};
class UnsupportedCountPredicate extends Error {}
const and = (parts: Prisma.Sql[]) =>
  parts.length
    ? Prisma.sql`(${Prisma.join(parts, " AND ")})`
    : Prisma.sql`TRUE`;
const or = (parts: Prisma.Sql[]) =>
  parts.length
    ? Prisma.sql`(${Prisma.join(parts, " OR ")})`
    : Prisma.sql`FALSE`;

/** Closed, parameterized compiler for the read predicates produced by resolveUnifiedBankQuery.
 * Unknown shapes retain the Prisma path. Identifiers always come from the maps above.
 * NULL negation stays SQL negation; existing callers explicitly include nullable alternatives.
 */
function predicate(
  where: Record<string, unknown>,
  alias = "p",
  map = columns,
): Prisma.Sql {
  const parts: Prisma.Sql[] = [];
  for (const [field, value] of Object.entries(where)) {
    if (["AND", "OR", "NOT"].includes(field)) {
      const children = (Array.isArray(value) ? value : [value]).map((child) =>
        predicate(child as Record<string, unknown>, alias, map),
      );
      parts.push(
        field === "OR"
          ? or(children)
          : field === "NOT"
            ? and(children.map((child) => Prisma.sql`NOT (${child})`))
            : and(children),
      );
      continue;
    }
    if (alias === "p" && (field === "unit" || field === "sourceMaterial")) {
      const table = field === "unit" ? "unit" : "source_material";
      const fk = field === "unit" ? "unit_id" : "source_material_id";
      const related = predicate(
        value as Record<string, unknown>,
        "r",
        field === "unit" ? unitColumns : materialColumns,
      );
      parts.push(
        Prisma.sql`EXISTS (SELECT 1 FROM ${Prisma.raw(table)} r WHERE r.id = p.${Prisma.raw(fk)} AND ${related})`,
      );
      continue;
    }
    const definition = map[field];
    if (!definition) throw new UnsupportedCountPredicate(field);
    const [name, type] = definition;
    const rawColumn = Prisma.raw(`${alias}."${name}"`);
    const col = type === "enum" ? Prisma.sql`${rawColumn}::text` : rawColumn;
    const param = (v: unknown) =>
      type && ["uuid", "boolean", "integer"].includes(type)
        ? Prisma.sql`${v}::${Prisma.raw(type)}`
        : Prisma.sql`${v}`;
    if (value === null) {
      parts.push(Prisma.sql`${col} IS NULL`);
      continue;
    }
    if (typeof value !== "object") {
      parts.push(Prisma.sql`${col} = ${param(value)}`);
      continue;
    }
    const operations = value as Record<string, unknown>;
    if (
      operations.mode === "insensitive" &&
      Object.keys(operations).some(
        (key) => !["contains", "startsWith", "mode"].includes(key),
      )
    )
      throw new UnsupportedCountPredicate("insensitive scalar comparison");
    for (const [operation, argument] of Object.entries(operations)) {
      switch (operation) {
        case "mode":
          if (argument !== "insensitive" && argument !== "default")
            throw new UnsupportedCountPredicate(operation);
          break;
        case "equals":
          parts.push(
            argument === null
              ? Prisma.sql`${col} IS NULL`
              : Prisma.sql`${col} = ${param(argument)}`,
          );
          break;
        case "not": {
          if (typeof argument === "object" && argument !== null)
            throw new UnsupportedCountPredicate(operation);
          parts.push(
            argument === null
              ? Prisma.sql`${col} IS NOT NULL`
              : Prisma.sql`${col} <> ${param(argument)}`,
          );
          break;
        }
        case "in":
        case "notIn": {
          if (!Array.isArray(argument))
            throw new UnsupportedCountPredicate(operation);
          // One array parameter avoids PostgreSQL's bind limit on recent exclusions.
          const arrayType =
            type === "uuid"
              ? "uuid[]"
              : type === "integer"
                ? "integer[]"
                : "text[]";
          const comparison = Prisma.sql`${col} = ANY(${argument}::${Prisma.raw(arrayType)})`;
          parts.push(
            operation === "in" ? comparison : Prisma.sql`NOT (${comparison})`,
          );
          break;
        }
        case "contains":
        case "startsWith": {
          // Preserve Prisma's own wildcard handling for unusual search input via fallback.
          if (typeof argument !== "string" || /[%_\\]/.test(argument))
            throw new UnsupportedCountPredicate(operation);
          const pattern = `${operation === "contains" ? "%" : ""}${argument}%`;
          parts.push(
            operations.mode === "insensitive"
              ? Prisma.sql`${col} ILIKE ${pattern}`
              : Prisma.sql`${col} LIKE ${pattern}`,
          );
          break;
        }
        case "isEmpty":
          if (typeof argument !== "boolean" || type !== "array")
            throw new UnsupportedCountPredicate(operation);
          else
            parts.push(
              argument
                ? Prisma.sql`cardinality(${col}) = 0`
                : Prisma.sql`cardinality(${col}) > 0`,
            );
          break;
        case "gte":
        case "gt":
        case "lte":
        case "lt": {
          const op = { gte: ">=", gt: ">", lte: "<=", lt: "<" }[operation];
          parts.push(Prisma.sql`${col} ${Prisma.raw(op)} ${param(argument)}`);
          break;
        }
        default:
          throw new UnsupportedCountPredicate(operation);
      }
    }
  }
  return and(parts);
}

/** Metadata is consumed only by the in-memory test double; real clients execute the SQL. */
export type CountSql = Prisma.Sql & {
  questionCountRead: {
    where: Prisma.ProblemWhereInput;
    mode: "page";
    skip?: number;
    format?: QuestionFormat;
    formats?: readonly [string, string][];
    orderBy?: Prisma.ProblemOrderByWithRelationInput[];
    availableOnly?: boolean;
    take?: number;
  };
};

export type CountDimension =
  | "unit"
  | "difficulty"
  | "source"
  | "material"
  | "book"
  | "kind"
  | "family"
  | "grade";
export type CountBucket = {
  axis: string;
  key: string;
  extra: string | null;
  held: number;
  available: number;
  rowCount: number;
};

/** Compile a small decision tree by asking the existing TS classifier. The SQL
 * has no independent format rules: each leaf is its answer for an evidence class.
 * Only an undecidable leaf reads a body. Tests exhaust the evidence partitions.
 */
function quickFormatSql(): Prisma.Sql {
  const axes = [
    {
      tests: [Prisma.sql`p.answer ~ ${`[${ANSWER_CIRCLED_CLASS}]`}`],
      values: ["①", "7"],
      field: "answer",
    },
    {
      tests: [Prisma.sql`p.question_group_key ~ '^q:v1:[a-f0-9]{64}$'`],
      values: [`q:v1:${"a".repeat(64)}`, null],
      field: "questionGroupKey",
    },
    {
      tests: [
        Prisma.sql`p.question_type = '단답형'`,
        Prisma.sql`p.question_type = '서술형'`,
        Prisma.sql`p.question_type = '객관식'`,
        Prisma.sql`p.question_type IS NULL OR p.question_type = ''`,
      ],
      values: ["단답형", "서술형", "객관식", null, "other"],
      field: "questionType",
    },
    {
      tests: [
        or(
          ENGINE_FAMILY_PREFIXES.map(
            (prefix) => Prisma.sql`p.family_key LIKE ${`${prefix}%`}`,
          ),
        ),
      ],
      values: [ENGINE_FAMILY_PREFIXES[0], null],
      field: "familyKey",
    },
    {
      tests: [Prisma.sql`p.problem_type = '서술형'`],
      values: ["서술형", null],
      field: "problemType",
    },
  ];
  const same = (a: Prisma.Sql, b: Prisma.Sql) =>
    a.text === b.text && JSON.stringify(a.values) === JSON.stringify(b.values);
  function build(
    index: number,
    evidence: Record<string, string | null>,
  ): Prisma.Sql {
    if (index === axes.length) {
      const value = questionFormatWithoutContent(
        evidence as { answer: string; familyKey: string | null },
      );
      return value === null
        ? Prisma.sql`NULL::text`
        : Prisma.sql`${value}::text`;
    }
    const axis = axes[index];
    const children = axis.values.map((value) =>
      build(index + 1, { ...evidence, [axis.field]: value }),
    );
    if (children.every((child) => same(child, children[0]))) return children[0];
    return Prisma.sql`CASE ${Prisma.join(
      axis.tests.map(
        (test, i) => Prisma.sql`WHEN (${test}) THEN ${children[i]}`,
      ),
      " ",
    )} ELSE ${children.at(-1)!} END`;
  }
  return build(0, {});
}
const QUICK_FORMAT = quickFormatSql();

function formatEvidenceSql(formats: ReadonlyMap<string, string>) {
  if (!formats.size) return { actual: QUICK_FORMAT, join: Prisma.empty };
  // A relation allows a hash join. Testing a long UUID array in a CASE for
  // every corpus row otherwise multiplies the cost of the ambiguous fallback.
  return {
    actual: Prisma.sql`COALESCE(f.actual_format, ${QUICK_FORMAT})`,
    join: Prisma.sql`LEFT JOIN unnest(${[...formats.keys()]}::uuid[], ${[...formats.values()]}::text[]) f(id, actual_format) ON f.id = p.id`,
  };
}

/** Group order comes from the first matching row, even if that row is blocked or
 * has another format. Its representative is the first row which actually fits.
 * Keeping those two positions separate preserves the old group-before-slice rule.
 */
export function questionPageSql(
  where: Prisma.ProblemWhereInput,
  orderBy: Prisma.ProblemOrderByWithRelationInput[],
  availableOnly: boolean,
  format: QuestionFormat | undefined,
  skip: number,
  take: number,
  formats: ReadonlyMap<string, string>,
): CountSql | null {
  try {
    const order = orderBy.flatMap((entry) =>
      Object.entries(entry).map(([field, direction]) => {
        if (
          field === "unit" &&
          direction &&
          typeof direction === "object" &&
          "orderIndex" in direction &&
          Object.keys(direction).length === 1
        )
          return Prisma.sql`u.order_index ${Prisma.raw(direction.orderIndex === "desc" ? "DESC" : "ASC")}`;
        if (
          !["id", "problemCode", "sourceMaterialId", "questionNumber"].includes(
            field,
          ) ||
          !["asc", "desc"].includes(String(direction))
        )
          throw new UnsupportedCountPredicate("order");
        return Prisma.sql`${Prisma.raw(`p."${columns[field][0]}"`)} ${Prisma.raw(direction === "desc" ? "DESC" : "ASC")}`;
      }),
    );
    const scope = predicate({ AND: [problemVisibleWhere(), where] });
    const evidence = formatEvidenceSql(formats);
    const fits = and([
      ...(availableOnly
        ? [Prisma.sql`c.eligible AND c.actual_format <> 'unknown'`]
        : []),
      ...(format ? [Prisma.sql`c.actual_format = ${format}`] : []),
    ]);
    const sql = Prisma.sql`WITH candidates AS MATERIALIZED (
      SELECT p.id, COALESCE(p.question_group_key, 'row:' || p.id::text) COLLATE "C" AS question_id,
        ${predicate(problemEligibleWhere())} AS eligible, ${evidence.actual} AS actual_format,
        row_number() OVER (ORDER BY ${Prisma.join(order)}) AS position
      FROM public.problem p ${evidence.join} LEFT JOIN public.unit u ON u.id = p.unit_id WHERE ${scope}
    ) SELECT (array_agg(c.id ORDER BY c.position) FILTER (WHERE ${fits}))[1] AS id
      FROM candidates c GROUP BY c.question_id HAVING bool_or(${fits})
      ORDER BY min(c.position) LIMIT ${take} OFFSET ${skip}`;
    return Object.assign(sql, {
      questionCountRead: {
        where,
        mode: "page" as const,
        orderBy,
        availableOnly,
        format,
        skip,
        take,
        formats: [...formats],
      },
    });
  } catch (error) {
    if (error instanceof UnsupportedCountPredicate) return null;
    throw error;
  }
}
