// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { TextbookDb, TextbookSql } from "@/lib/textbook/server/sql";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_name: string, handler: unknown) => handler,
}));
const gate = vi.hoisted(() => ({ db: null as TextbookDb | null }));
vi.mock("@/lib/textbook/server/authorize", () => ({
  textbookHeaders: {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  },
  authorizeTextbook: async () => ({ actor: {}, response: null }),
}));
vi.mock("@/lib/textbook/server/prismaSql", () => ({
  get textbookDb() {
    return gate.db;
  },
}));
import { GET } from "@/app/api/textbook/quick-create/route";
import {
  quickCreateCatalogSchema,
  type QuickCreateScope,
} from "@/contracts/textbookQuickCreate.contract";
import {
  ACTUAL_FORMAT_VERSION,
  actualFormatDigest,
} from "@/lib/problem/actualFormat";
import { classifyFormat, type FormatInput } from "@/lib/problem/provenance";
import { MISSING_ANSWER } from "@/lib/missingAnswer";
import { quickCreateSemester } from "@/lib/textbook/server/quickCreate";
import {
  loadQuickCreateAvailability,
  QUICK_CREATE_TRIM_CHARACTERS,
} from "@/lib/textbook/server/quickCreate/availability";
import {
  listQuickCreateUnitsBefore,
  quickCreateReadOnlySql,
  runQuickCreateMeasurement,
} from "../../../scripts/qa/sweep-20261020/quickCreate";
import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import { openTextbookDb, type Db } from "../helpers/textbookPglite";
import {
  insertBankProblem,
  pgliteTextbookDb,
} from "../helpers/textbookServerWorld";

let pg: Db, sql: TextbookDb, semanticUnit: string;
const units: ((typeof CURRICULUM_UNITS)[number] & { id: string })[] = [];
const scopes: QuickCreateScope[] = ["elementary", "middle"].flatMap(
  (schoolLevel) =>
    (schoolLevel === "elementary" ? [3, 4, 5, 6] : [1, 2, 3]).flatMap((grade) =>
      ([1, 2] as const).map((semester) => ({
        schoolLevel: schoolLevel as QuickCreateScope["schoolLevel"],
        grade,
        semester,
      })),
    ),
);

async function problem(
  unitId: string,
  input: Parameters<typeof insertBankProblem>[2] & {
    fact?: "current" | "old" | "missing";
  } = {},
) {
  const inserted = await insertBankProblem(pg, unitId, input);
  if (input.fact !== "missing") {
    const row = (
      await pg.query<FormatInput>(
        `SELECT content, answer, question_type AS "questionType", problem_type AS "problemType",
        family_key AS "familyKey" FROM problem WHERE id=$1`,
        [inserted.id],
      )
    ).rows[0];
    await pg.query(
      `UPDATE problem SET actual_format=$2, actual_format_version=$3, actual_format_digest=$4 WHERE id=$1`,
      [
        inserted.id,
        input.fact === "old" ? "descriptive" : classifyFormat(row),
        input.fact === "old" ? "old-format-version" : ACTUAL_FORMAT_VERSION,
        actualFormatDigest(row),
      ],
    );
  }
  return inserted.id;
}

beforeAll(async () => {
  pg = await openTextbookDb();
  sql = pgliteTextbookDb(pg);
  gate.db = sql;
  const supported = CURRICULUM_UNITS.filter((unit) =>
    /^(초[3-6]|중[1-3])$/.test(unit.grade),
  );
  for (const [index, unit] of supported.entries()) {
    const id = randomUUID();
    units.push({ ...unit, id });
    await pg.query(
      `INSERT INTO unit (id, grade, chapter, section, order_index, problem_code_prefix)
        VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        id,
        unit.grade,
        unit.chapter,
        unit.section,
        unit.orderIndex,
        `J2${String(index).padStart(4, "0")}`,
      ],
    );
  }
  for (const scope of scopes) {
    const unit = units.find(
      (u) =>
        u.grade ===
          `${scope.schoolLevel === "elementary" ? "초" : "중"}${scope.grade}` &&
        quickCreateSemester(u) === scope.semester,
    )!;
    for (const [index, difficulty] of [
      "연산",
      "기본",
      "응용",
      "심화하",
      "심화중",
      "심화상",
    ].entries())
      await problem(unit.id, {
        content: `${difficulty}의 서로 다른 물음`,
        difficulty,
        answer: "7",
        questionType: index % 2 ? "서술형" : "단답형",
        fact: index % 3 === 0 ? "old" : index % 3 === 1 ? "current" : "missing",
      });
  }
  semanticUnit = units.filter(
    (u) => u.grade === "중2" && quickCreateSemester(u) === 1,
  )[1].id;
  // Within a bucket, the first row's format wins, never bool_or(written).
  await problem(semanticUnit, {
    content: "\t같은 물음 A\ufeff",
    difficulty: "기본",
    questionType: "단답형",
  });
  await problem(semanticUnit, {
    content: "같은 물음 A",
    difficulty: "응용",
    questionType: "서술형",
  });
  await problem(semanticUnit, {
    content: "같은 물음 B",
    difficulty: "기본",
    questionType: "서술형",
  });
  await problem(semanticUnit, {
    content: "\u3000같은 물음 B\n",
    difficulty: "응용",
    questionType: "단답형",
  });
  await problem(semanticUnit, {
    content: "같은 물음 C",
    difficulty: "기본",
    questionType: null,
  });
  await problem(semanticUnit, {
    content: "같은 물음 C",
    difficulty: "기본",
    questionType: "서술형",
  });
  await problem(semanticUnit, {
    content: "missing fact",
    difficulty: "심화상",
    questionType: "서술형",
    fact: "missing",
  });
  await problem(semanticUnit, {
    content: "old fact",
    difficulty: "심화하",
    questionType: "단답형",
    fact: "old",
  });
  const invalidated = await problem(semanticUnit, {
    content: "수정 전",
    difficulty: "연산",
    questionType: "서술형",
  });
  await pg.query(
    `UPDATE problem SET content='수정 후', question_type='단답형' WHERE id=$1`,
    [invalidated],
  );
  for (const char of QUICK_CREATE_TRIM_CHARACTERS)
    await problem(semanticUnit, {
      content: `${char}공백 중복${char}`,
      difficulty: "기본",
      questionType: "단답형",
    });
  for (const content of [
    "\u0085공백 중복\u0085",
    "\u180e공백 중복",
    "\u200b공백 중복",
    "공백  중복",
    "é",
    "e\u0301",
    "",
    " \t\u3000",
  ])
    await problem(semanticUnit, {
      content,
      difficulty: "기본",
      questionType: "단답형",
    });
  for (const patch of [
    { pool: "private" as const },
    { reviewStatus: "pending" as const },
    { reviewStatus: "rejected" as const },
    { directUseAllowed: false },
    { answer: MISSING_ANSWER },
  ])
    await problem(semanticUnit, {
      content: "제외하는 물음",
      questionType: "서술형",
      ...patch,
    });
  await pg.query(
    `INSERT INTO unit(id, grade, chapter, section, order_index, problem_code_prefix)
      VALUES ($1, '중2', '비교육과정', '제외 단원', -1, 'J29999')`,
    [randomUUID()],
  );
}, 120_000);
afterAll(async () => {
  await pg?.close();
  vi.unstubAllEnvs();
});

describe("quick-create SQL catalog parity", () => {
  it.each(scopes)(
    "keeps the complete GET response byte-identical for $schoolLevel $grade-$semester",
    async (scope) => {
      const writerReady = scope.semester === 1;
      vi.stubEnv("TEXTBOOK_RECOVERY_WRITER_ENABLED", String(writerReady));
      const before = quickCreateCatalogSchema.parse({
        ...(await listQuickCreateUnitsBefore(sql, scope)),
        writerReady,
      });
      const params = new URLSearchParams(
        Object.entries(scope).map(([key, value]) => [key, String(value)]),
      );
      const response = await GET(
        new Request(`https://today.test/api/textbook/quick-create?${params}`),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(await response.text()).toBe(JSON.stringify(before));
    },
  );

  it("keeps first-row written semantics separately in each tier, raw problemCount and empty units", async () => {
    const catalog = await listQuickCreateUnitsBefore(sql, {
      schoolLevel: "middle",
      grade: 2,
      semester: 1,
    });
    const result = catalog.units.find((unit) => unit.id === semanticUnit)!;
    const counts = await loadQuickCreateAvailability(sql, [semanticUnit]);
    expect(counts.get(semanticUnit)).toEqual(result.availability);
    expect(counts.get(semanticUnit)?.challenge).toEqual({
      total: 4,
      written: 2,
    });
    // A/B/C each have a written duplicate, so bool_or would count all three.
    // The original SELECT has no ORDER BY; use its observed first row, not ID
    // or insertion order (fact UPDATEs can move heap tuples).
    expect(counts.get(semanticUnit)?.standard.written).toBeLessThan(3);
    expect(result.problemCount).toBeGreaterThan(
      result.availability!.standard.total,
    );
    expect(
      catalog.units.some(
        (unit) =>
          unit.problemCount === 0 && unit.availability?.basic.total === 0,
      ),
    ).toBe(true);
    const none = vi.fn();
    expect(
      await loadQuickCreateAvailability({ query: none, execute: none }, []),
    ).toEqual(new Map());
    expect(none).not.toHaveBeenCalled();
  });

  it("matches JS trim for every ECMAScript whitespace character and preserves nearby non-whitespace", async () => {
    const whitespace = Array.from({ length: 0x10000 }, (_, i) =>
      String.fromCharCode(i),
    ).filter((char) => char.trim() === "");
    expect([...QUICK_CREATE_TRIM_CHARACTERS].sort()).toEqual(whitespace.sort());
    const edges = [...whitespace, "\u0085", "\u180e", "\u200b", "\u2060"];
    const values = edges.flatMap((char) => [
      char,
      `${char}값${char}`,
      `${char}a${char}b${char}`,
    ]);
    const trimmed = (
      await pg.query<{ value: string }>(
        `SELECT btrim(value, $2::text) COLLATE "C" AS value FROM jsonb_array_elements_text($1::jsonb)`,
        [JSON.stringify(values), QUICK_CREATE_TRIM_CHARACTERS],
      )
    ).rows.map((row) => row.value);
    expect(trimmed).toEqual(values.map((value) => value.trim()));
  });

  it("transfers only invalid representative text and falls back after trigger invalidation or version mismatch", async () => {
    const fallback: { id: string; content: string }[] = [];
    const traced: TextbookSql = {
      ...sql,
      query: async <T>(
        text: string,
        params: Parameters<TextbookSql["query"]>[1],
      ) => {
        const rows = await sql.query<T>(text, params);
        for (const row of rows)
          fallback.push(
            ...((row as { fallback?: typeof fallback }).fallback ?? []),
          );
        return rows;
      },
    };
    await loadQuickCreateAvailability(traced, [semanticUnit]);
    expect(new Set(fallback.map((row) => row.content))).toEqual(
      new Set(["missing fact", "old fact", "수정 후"]),
    );
    expect(
      (
        await pg.query<{ format: string | null }>(
          `SELECT actual_format AS format FROM problem WHERE content='수정 후'`,
        )
      ).rows[0].format,
    ).toBeNull();
  });

  it("uses the current stored fact without a digest audit, including unknown; never writes", async () => {
    const unitId = units.find(
      (u) =>
        u.grade === "중3" &&
        quickCreateSemester(u) === 2 &&
        !units.some(
          (other) =>
            other.grade === u.grade &&
            other.orderIndex < u.orderIndex &&
            quickCreateSemester(other) === 2,
        ),
    )!.id;
    const id = await problem(unitId, {
      content: "현재 fact 증거",
      difficulty: "기본",
      questionType: "서술형",
    });
    await pg.query(
      `UPDATE problem SET actual_format='unknown', actual_format_digest=$2 WHERE id=$1`,
      [id, "0".repeat(64)],
    );
    const readOnly = quickCreateReadOnlySql(sql);
    const before = (await pg.query(`SELECT * FROM problem WHERE id=$1`, [id]))
      .rows;
    const counts = await loadQuickCreateAvailability(readOnly, [unitId]);
    expect(counts.get(unitId)?.basic.written).toBe(1); // Existing basic question, not this unknown fact.
    expect(
      (await pg.query(`SELECT * FROM problem WHERE id=$1`, [id])).rows,
    ).toEqual(before);
  });

  it("refuses measurement without DB READ ONLY and blocks writes hidden in CTEs", async () => {
    await expect(
      runQuickCreateMeasurement({
        db: { $queryRawUnsafe: async () => [{ readOnly: "off" }] } as never,
        sql,
      }),
    ).rejects.toThrow("QUICK_CREATE_READ_ONLY_GUARD");
    const guarded = quickCreateReadOnlySql(sql);
    expect(() =>
      guarded.query(
        `WITH gone AS (DELETE FROM problem RETURNING id) SELECT id FROM gone`,
      ),
    ).toThrow("QUICK_CREATE_READ_ONLY_GUARD");
    await expect(guarded.execute("DELETE FROM problem")).rejects.toThrow(
      "QUICK_CREATE_READ_ONLY_GUARD",
    );
  });
});
