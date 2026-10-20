import "server-only";
import type { QuickCreateCatalog } from "@/contracts/textbookQuickCreate.contract";
import { ACTUAL_FORMAT_VERSION } from "@/lib/problem/actualFormat";
import { classifyFormat, type FormatInput } from "@/lib/problem/provenance";
import { DEFAULT_PROBLEM_POOL } from "@/lib/problemPool";
import { MISSING_ANSWER } from "@/lib/missingAnswer";
import { type TextbookSql, uuidList } from "../sql";
import { QUICK_CREATE_DIFFICULTIES } from "./context";

type Availability = NonNullable<
  QuickCreateCatalog["units"][number]["availability"]
>;
type Difficulty = keyof Availability;
type Fallback = FormatInput & { id: string };
type Counts = {
  unitId: string;
  difficulty: Difficulty;
  total: number;
  written: number;
  fallback: Fallback[] | null;
};

/** ECMAScript WhiteSpace + LineTerminator, exactly String.prototype.trim().
 * PostgreSQL's default btrim removes only U+0020. Keep U+0085/U+180E/U+200B. */
export const QUICK_CREATE_TRIM_CHARACTERS =
  "\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680" +
  "\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a" +
  "\u2028\u2029\u202f\u205f\u3000\ufeff";

/** No bank write or process cache. Only invalid representatives carry text out
 * of PostgreSQL; the existing classifier remains their source of truth. */
export async function loadQuickCreateAvailability(
  sql: TextbookSql,
  unitIds: readonly string[],
): Promise<Map<string, Availability>> {
  const availability = new Map<string, Availability>(
    unitIds.map((id) => [
      id,
      {
        basic: { total: 0, written: 0 },
        standard: { total: 0, written: 0 },
        challenge: { total: 0, written: 0 },
      },
    ]),
  );
  if (!unitIds.length) return availability;
  // Capture first-seen scan positions before sorting/grouping. The old reader
  // has no ORDER BY: min(id), bool_or(format) or a new ID sort would change which
  // duplicate supplies written. Compare against that same legacy scan in QA.
  const rows = await sql.query<Counts>(
    `WITH candidates AS MATERIALIZED (
      SELECT row_number() OVER () AS position, p.unit_id AS "unitId",
        p.difficulty::text AS tier,
        btrim(p.content, $5::text) COLLATE "C" AS content,
        CASE WHEN p.actual_format_version = $4::text AND p.actual_format IS NOT NULL
          THEN p.actual_format END AS format,
        CASE WHEN COALESCE(p.actual_format_version = $4::text AND p.actual_format IS NOT NULL, false)
          THEN NULL ELSE jsonb_build_object('id', p.id, 'content', p.content, 'answer', p.answer,
            'questionType', p.question_type, 'problemType', p.problem_type::text,
            'familyKey', p.family_key) END AS fallback
      FROM "problem" p WHERE p."unit_id" IN ${uuidList("$1")} AND p."pool"::text = $2::text
        AND p."review_status"::text = 'approved' AND p."direct_use_allowed" = true AND p."answer" <> $3::text
    ), representatives AS (
      SELECT DISTINCT ON (c."unitId", d.difficulty, c.content COLLATE "C")
        c."unitId", d.difficulty, c.format, c.fallback
      FROM candidates c CROSS JOIN jsonb_to_recordset($6::jsonb) d(difficulty text, tiers jsonb)
      WHERE d.tiers ? c.tier
      ORDER BY c."unitId", d.difficulty, c.content COLLATE "C", c.position
    )
    SELECT "unitId", difficulty, count(*)::int AS total,
      count(*) FILTER (WHERE format = 'descriptive')::int AS written,
      jsonb_agg(fallback) FILTER (WHERE fallback IS NOT NULL) AS fallback
    FROM representatives GROUP BY "unitId", difficulty`,
    [
      JSON.stringify(unitIds),
      DEFAULT_PROBLEM_POOL,
      MISSING_ANSWER,
      ACTUAL_FORMAT_VERSION,
      QUICK_CREATE_TRIM_CHARACTERS,
      JSON.stringify(
        Object.entries(QUICK_CREATE_DIFFICULTIES).map(
          ([difficulty, tiers]) => ({
            difficulty,
            tiers,
          }),
        ),
      ),
    ],
  );
  // Like actualFormatValidSql, trust the current stored fact, including unknown.
  // Input changes invalidate it in the DB trigger; digest audits are separate.
  // Do not turn this reader into a per-request digest scan or a lazy writer.
  const writtenById = new Map<string, boolean>();
  for (const row of rows) {
    let written = row.written;
    for (const fallback of row.fallback ?? []) {
      let isWritten = writtenById.get(fallback.id);
      if (isWritten === undefined) {
        isWritten = classifyFormat(fallback) === "descriptive";
        writtenById.set(fallback.id, isWritten);
      }
      if (isWritten) written++;
    }
    availability.get(row.unitId)![row.difficulty] = {
      total: row.total,
      written,
    };
  }
  return availability;
}
