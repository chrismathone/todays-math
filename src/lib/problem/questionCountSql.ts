import "server-only";
import { Prisma } from "@prisma/client";
import { problemEligibleWhere } from "@/lib/problemEligibility";
import { problemVisibleWhere } from "@/lib/problemPool";
import type { QuestionFormat } from "@/contracts/questionFormats.contract";
import {
  BANK_SOURCE_GROUPS,
  BANK_SOURCE_GROUP_SOURCES,
} from "@/contracts/bankSource.contract";
import { ACTUAL_FORMAT_VERSION, formatsVerified } from "./actualFormat";

const columns: Record<string, [string, string?]> = {
  id: ["id", "uuid"],
  unitId: ["unit_id", "uuid"],
  sourceMaterialId: ["source_material_id", "uuid"],
  questionGroupKey: ["question_group_key"],
  familyKey: ["family_key"],
  difficulty: ["difficulty", "difficulty"],
  source: ["source", "problem_source"],
  pool: ["pool", "problem_pool"],
  reviewStatus: ["review_status", "review_status"],
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
export function questionPredicateSql(
  where: Record<string, unknown>,
  alias = "p",
  map = columns,
): Prisma.Sql {
  const parts: Prisma.Sql[] = [];
  for (const [field, value] of Object.entries(where)) {
    if (["AND", "OR", "NOT"].includes(field)) {
      const children = (Array.isArray(value) ? value : [value]).map((child) =>
        questionPredicateSql(child as Record<string, unknown>, alias, map),
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
      const related = questionPredicateSql(
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
    const col = rawColumn;
    const param = (v: unknown) =>
      type &&
      [
        "uuid",
        "boolean",
        "integer",
        "difficulty",
        "problem_source",
        "problem_pool",
        "review_status",
      ].includes(type)
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
          const arrayType = [
            "difficulty",
            "problem_source",
            "problem_pool",
            "review_status",
          ].includes(type ?? "")
            ? `${type}[]`
            : type === "uuid"
              ? "uuid[]"
              : type === "integer"
                ? "integer[]"
                : "text[]";
          const comparison = Prisma.sql`${col} = ANY(${argument}::${Prisma.raw(
            [
              "difficulty",
              "problem_source",
              "problem_pool",
              "review_status",
            ].includes(type ?? "")
              ? "text[]"
              : arrayType,
          )}::${Prisma.raw(arrayType)})`;
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

/** SQL metadata is interpreted only by the in-memory test double. */
export type CountSql = Prisma.Sql & {
  questionCountRead: {
    where: Prisma.ProblemWhereInput;
    mode: "page" | "counts" | "formats";
    skip?: number;
    format?: QuestionFormat;
    formats?: readonly [string, string][];
    orderBy?: Prisma.ProblemOrderByWithRelationInput[];
    dimensions?: readonly CountDimension[];
    availableOnly?: boolean;
    onlyInvalid?: boolean;
    includeFormats?: boolean;
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
  /** Non-enumerable internal ordering evidence; never part of a response. */
  firstAvailable?: number;
};

/** Compact JSON text-array encoding matches JSON.stringify without changing
 * spaces inside values. Both JSON escaping and sha256 are built into PG. */
export function actualFormatDigestSql(): Prisma.Sql {
  const fields = [
    Prisma.sql`'problem-actual-format-input-v1'::text`,
    Prisma.sql`p.content`,
    Prisma.sql`p.answer`,
    Prisma.sql`p.question_type`,
    Prisma.sql`p.problem_type`,
    Prisma.sql`p.family_key`,
    Prisma.sql`p.question_group_key`,
  ];
  return Prisma.sql`encode(sha256(convert_to(array_to_json(ARRAY[${Prisma.join(fields)}])::text, 'UTF8')), 'hex')`;
}
export function actualFormatValidSql(): Prisma.Sql {
  // The DB invalidation trigger owns input correspondence. Hashing input text
  // here defeats the stored fact; verify-problem-actual-format.ts audits digests.
  return Prisma.sql`COALESCE(p.actual_format_version = ${ACTUAL_FORMAT_VERSION}
    AND p.actual_format IS NOT NULL, FALSE)`;
}
export function questionFormatReadSql(
  where: Prisma.ProblemWhereInput,
  onlyInvalid: boolean,
): CountSql | null {
  try {
    const valid = actualFormatValidSql();
    const sql = Prisma.sql`SELECT p.id, p.actual_format AS "storedFormat",
      ${onlyInvalid ? Prisma.sql`NULL::text` : Prisma.sql`CASE WHEN ${valid} THEN p.actual_format END`} AS "actualFormat",
      ${onlyInvalid ? Prisma.sql`p.content` : Prisma.sql`CASE WHEN NOT (${valid}) THEN p.content END`} AS content,
      ${onlyInvalid ? Prisma.sql`p.answer` : Prisma.sql`CASE WHEN NOT (${valid}) THEN p.answer END`} AS answer,
      p.question_type AS "questionType", p.problem_type AS "problemType",
      p.family_key AS "familyKey", p.question_group_key AS "questionGroupKey",
      p.actual_format_version AS "actualFormatVersion", p.actual_format_digest AS "actualFormatDigest",
      current_setting('transaction_read_only') = 'off' AS writable
      FROM public.problem p WHERE ${questionPredicateSql({ AND: [problemVisibleWhere(), where] })}
      ${onlyInvalid ? Prisma.sql`AND NOT (${valid})` : Prisma.empty}`;
    return Object.assign(sql, {
      questionCountRead: { where, mode: "formats" as const, onlyInvalid },
    });
  } catch (error) {
    if (error instanceof UnsupportedCountPredicate) return null;
    throw error;
  }
}
function formatEvidenceSql(
  formats: ReadonlyMap<string, string>,
  verified = false,
) {
  const stored = verified
    ? Prisma.sql`p.actual_format`
    : Prisma.sql`CASE WHEN ${actualFormatValidSql()} THEN p.actual_format END`;
  if (!formats.size) return { actual: stored, join: Prisma.empty };
  return {
    actual: Prisma.sql`COALESCE(f.actual_format, ${stored})`,
    join: Prisma.sql`LEFT JOIN unnest(${[...formats.keys()]}::uuid[], ${[...formats.values()]}::text[]) f(id, actual_format) ON f.id = p.id`,
  };
}

/** Every dimension counts a question union. Position preserves the old reader's
 * first-seen facet order, including kind/grade/object key order in JSON. */
export function questionCountsSql(
  where: Prisma.ProblemWhereInput,
  dimensions: readonly CountDimension[],
  format: QuestionFormat | undefined,
  formats: ReadonlyMap<string, string>,
  client?: object,
  includeFormats = true,
): CountSql | null {
  try {
    const evidence = formatEvidenceSql(
      formats,
      formatsVerified(formats, client, where),
    );
    const sourceGroup = Prisma.sql`CASE ${Prisma.join(
      BANK_SOURCE_GROUPS.map(
        (group) =>
          Prisma.sql`WHEN p.source::text = ANY(${[...BANK_SOURCE_GROUP_SOURCES[group]]}::text[]) THEN ${group}::text`,
      ),
      " ",
    )} END`;
    type Group = { axis: string; key: string; extra?: string; ordinal: number };
    const allGroups: Group[] = [
      { axis: "all", key: "", ordinal: 0 },
      ...(includeFormats
        ? [{ axis: "format", key: "actual_format", ordinal: 1 }]
        : []),
      ...dimensions.map((dimension, i) => ({
        axis: dimension,
        key: {
          unit: "unit_id",
          difficulty: "difficulty",
          source: "source_group",
          material: "material_id",
          book: "book_id",
          kind: "book_id",
          family: "unit_id",
          grade: "grade",
        }[dimension],
        extra:
          dimension === "family"
            ? "family_key"
            : dimension === "kind"
              ? "kind"
              : undefined,
        ordinal: i + 2,
      })),
    ];
    const groupQuery = (
      groups: Group[],
      selectedFormat?: QuestionFormat,
    ): Prisma.Sql => {
      const columns = [
        ...new Set(
          groups.flatMap((g) =>
            [g.key, g.extra].filter((name): name is string => !!name),
          ),
        ),
      ];
      const col = (name: string) => Prisma.raw(`c.${name}`);
      const masks = groups.map((group) => ({
        ...group,
        mask: columns.reduce(
          (mask, name, index) =>
            mask +
            ([group.key, group.extra].includes(name)
              ? 0
              : 2 ** (columns.length - index - 1)),
          0,
        ),
      }));
      const grouping = columns.length
        ? Prisma.sql`GROUPING(${Prisma.join(columns.map(col))})`
        : Prisma.sql`0`;
      const sets = groups.map((group) => {
        const fields = [group.key, group.extra]
          .filter((name): name is string => !!name)
          .map(col);
        return Prisma.sql`(c.question_id${fields.length ? Prisma.sql`, ${Prisma.join(fields)}` : Prisma.empty})`;
      });
      const filters = [
        ...(selectedFormat
          ? [Prisma.sql`c.actual_format=${selectedFormat}`]
          : []),
        ...(groups.every((g) => g.key === "book_id")
          ? [Prisma.sql`c.book_id IS NOT NULL`]
          : []),
        ...(groups.every((g) => g.key === "material_id")
          ? [Prisma.sql`c.material_id IS NOT NULL`]
          : []),
      ];
      return Prisma.sql`SELECT b.axis,b.key,b.extra,g.held,g.available,g."rowCount",g."firstAvailable",g.position,b.ordinal
        FROM (SELECT q.mask, ${columns.length ? Prisma.sql`${Prisma.join(columns.map((name) => Prisma.raw(`q.${name}`)))},` : Prisma.empty}
          count(*)::int AS held, count(*) FILTER (WHERE q.available)::int AS available,
          sum(q.row_count)::int AS "rowCount", min(q.first_available)::int AS "firstAvailable", min(q.position) AS position
          FROM (SELECT ${grouping} AS mask, ${columns.length ? Prisma.sql`${Prisma.join(columns.map(col))},` : Prisma.empty}
            bool_or(c.available) AS available, count(*) FILTER (WHERE c.available) AS row_count,
            min(c.position) FILTER (WHERE c.available) AS first_available, min(c.position) AS position
            FROM candidates c ${filters.length ? Prisma.sql`WHERE ${and(filters)}` : Prisma.empty}
            GROUP BY GROUPING SETS (${Prisma.join(sets)})
          ) q GROUP BY q.mask${columns.length ? Prisma.sql`, ${Prisma.join(columns.map((name) => Prisma.raw(`q.${name}`)))}` : Prisma.empty}
        ) g CROSS JOIN LATERAL (VALUES ${Prisma.join(
          masks.map(
            (group) => Prisma.sql`(
          ${group.mask}::int, ${group.axis}::text,
          ${group.key ? Prisma.raw(`g.${group.key}::text`) : Prisma.sql`''::text`},
          ${group.extra ? Prisma.raw(`g.${group.extra}::text`) : Prisma.sql`NULL::text`}, ${group.ordinal}::int
        )`,
          ),
        )}) b(mask,axis,key,extra,ordinal)
        WHERE b.mask=g.mask AND b.key IS NOT NULL AND (b.axis <> 'format' OR b.key <> 'unknown')`;
    };
    // Empty textbook relation keys need no distinct sort over the engine bank.
    const aggregateGroups = (
      groups: Group[],
      selectedFormat?: QuestionFormat,
    ) =>
      Prisma.join(
        [
          groups.filter((g) => !["book_id", "material_id"].includes(g.key)),
          groups.filter((g) => g.key === "book_id"),
          groups.filter((g) => g.key === "material_id"),
        ]
          .filter((part) => part.length)
          .map((part) => groupQuery(part, selectedFormat)),
        " UNION ALL ",
      );
    const needsMaterials = dimensions.some((d) => d === "book" || d === "kind");
    const sql = Prisma.sql`WITH candidates AS ${needsMaterials ? Prisma.sql`MATERIALIZED` : Prisma.sql`NOT MATERIALIZED`} (
      SELECT COALESCE(p.question_group_key, 'row:' || p.id::text) COLLATE "C" AS question_id,
        ${dimensions.some((d) => d === "unit" || d === "family") ? Prisma.sql`p.unit_id,` : Prisma.empty}
        ${dimensions.includes("family") ? Prisma.sql`p.family_key COLLATE "C" AS family_key,` : Prisma.empty}
        ${dimensions.includes("difficulty") ? Prisma.sql`p.difficulty::text COLLATE "C" AS difficulty,` : Prisma.empty}
        ${dimensions.includes("source") ? sourceGroup : Prisma.sql`NULL::text`} COLLATE "C" AS source_group,
        ${dimensions.includes("material") ? Prisma.sql`CASE WHEN p.source='school_textbook' THEN p.source_material_id END AS material_id,` : Prisma.empty}
        ${needsMaterials ? Prisma.sql`m.book_id` : Prisma.sql`NULL::uuid`} AS book_id,
        ${needsMaterials ? Prisma.sql`m.kind` : Prisma.sql`NULL::text`} COLLATE "C" AS kind,
        ${dimensions.includes("grade") ? Prisma.sql`u.grade` : Prisma.sql`NULL::text`} COLLATE "C" AS grade,
        ${evidence.actual} COLLATE "C" AS actual_format,
        (${questionPredicateSql(problemEligibleWhere())} AND ${evidence.actual} <> 'unknown') AS available,
        row_number() OVER () AS position
      FROM public.problem p ${evidence.join}
      ${needsMaterials ? Prisma.sql`LEFT JOIN public.source_material m ON m.id=p.source_material_id AND p.source='school_textbook'` : Prisma.empty}
      ${dimensions.includes("grade") ? Prisma.sql`LEFT JOIN public.unit u ON u.id=p.unit_id` : Prisma.empty}
      WHERE ${questionPredicateSql({ AND: [problemVisibleWhere(), where] })}
    ) SELECT axis,key,extra,held,available,"rowCount","firstAvailable" FROM (
      ${
        format && includeFormats
          ? Prisma.sql`${aggregateGroups(
              allGroups.filter((g) => g.axis !== "format"),
              format,
            )} UNION ALL ${aggregateGroups(allGroups.filter((g) => g.axis === "format"))}`
          : aggregateGroups(allGroups, format)
      }
    ) grouped ORDER BY position,ordinal`;
    return Object.assign(sql, {
      questionCountRead: {
        where,
        mode: "counts" as const,
        dimensions,
        format,
        formats: [...formats],
        includeFormats,
      },
    });
  } catch (error) {
    if (error instanceof UnsupportedCountPredicate) return null;
    throw error;
  }
}

/** First matching row controls group order; the first usable representation
 * controls the selected ID. Group before LIMIT/OFFSET, including blocked siblings. */
export function questionPageSql(
  where: Prisma.ProblemWhereInput,
  orderBy: Prisma.ProblemOrderByWithRelationInput[],
  availableOnly: boolean,
  format: QuestionFormat | undefined,
  skip: number,
  take: number,
  formats: ReadonlyMap<string, string>,
  client?: object,
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
    const evidence = formatEvidenceSql(
      formats,
      formatsVerified(formats, client, where),
    );
    const fits = and([
      ...(availableOnly
        ? [Prisma.sql`c.eligible AND c.actual_format <> 'unknown'`]
        : []),
      ...(format ? [Prisma.sql`c.actual_format = ${format}`] : []),
    ]);
    const sql = Prisma.sql`WITH candidates AS MATERIALIZED (
      SELECT p.id, COALESCE(p.question_group_key, 'row:' || p.id::text) COLLATE "C" AS question_id,
        ${questionPredicateSql(problemEligibleWhere())} AS eligible, ${evidence.actual} AS actual_format,
        row_number() OVER (ORDER BY ${Prisma.join(order)}) AS position
      FROM public.problem p ${evidence.join} LEFT JOIN public.unit u ON u.id = p.unit_id
      WHERE ${questionPredicateSql({ AND: [problemVisibleWhere(), where] })}
    ), selected AS (
      SELECT min(c.position) AS first_position, min(c.position) FILTER (WHERE ${fits}) AS selected_position
      FROM candidates c GROUP BY c.question_id HAVING bool_or(${fits})
      ORDER BY min(c.position) LIMIT ${take} OFFSET ${skip}
    ) SELECT c.id FROM selected s JOIN candidates c ON c.position=s.selected_position ORDER BY s.first_position`;
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
