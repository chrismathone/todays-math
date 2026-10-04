// @vitest-environment node
/**
 * Extraction proof — `server/quickCreate.ts`.
 *
 * Runs quick create against PGlite (the repository's full migration chain) with
 *   · a sequenced `randomUUID` (every id embeds its consumption order),
 *   · a frozen clock,
 *   · a recording `TextbookDb` (every statement, its parameters and the transaction boundary),
 *   · recording injected dependencies,
 * and freezes, per case: the SQL/dependency trace, the returned JSON or the thrown error, the rows
 * left in the database (section `content` as stored text), and the student/answers HTML rendered
 * from the assembled exchange.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const clock = vi.hoisted(() => ({ scope: "boot", n: 0 }));
vi.mock("server-only", () => ({}));
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  // 8 scope-and-order dependent hex digits, then the consumption index: unique per case, stable
  // across runs, and any reordering of id consumption moves every later id.
  const randomUUID = () => {
    const n = ++clock.n;
    const head = actual
      .createHash("sha256")
      .update(`${clock.scope}:${n}`)
      .digest("hex")
      .slice(0, 8);
    return `${head}-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
  };
  return { ...actual, default: { ...actual, randomUUID }, randomUUID };
});

import { randomUUID } from "node:crypto";
import {
  DEFAULT_QUICK_CREATE_COMPONENTS,
  type QuickCreateComponents,
  type QuickCreateInput,
  type QuickCreateScope,
} from "@/contracts/textbookQuickCreate.contract";
import type { TextbookActor } from "@/lib/textbook/access";
import { sha256 } from "@/lib/textbook/hash.server";
import { linkEditionAssets, putAsset } from "@/lib/textbook/server/blobs";
import { assembleExchange } from "@/lib/textbook/server/exchange";
import {
  createQuickTextbook,
  DEFAULT_QUICK_CREATE_CAST,
  listQuickCreateUnits,
  QUICK_CREATE_DIFFICULTIES,
  quickCreateSemester,
  type QuickCreateDependencies,
} from "@/lib/textbook/server/quickCreate";
import type {
  SqlParam,
  TextbookDb,
  TextbookSql,
} from "@/lib/textbook/server/sql";
import { MISSING_ANSWER } from "@/lib/missingAnswer";
import { openTextbookDb, type Db } from "@/__tests__/helpers/textbookPglite";
import {
  insertBankProblem,
  insertTeacher,
  pgliteTextbookDb,
  tinyPng,
} from "@/__tests__/helpers/textbookServerWorld";
import { CURRICULUM_UNITS } from "../../../../prisma/seed-data/units";

import { errorShape, ProofArtifacts, settleProof, sha256Hex } from "./harness";
import { addModelArtifacts } from "./renderModel";

const BASELINE = "143dafcb14585be0132ec75e5885de8c07ee98f8";
const NOW = new Date("2026-10-05T01:02:03.004Z");
const TIERS = ["연산", "기본", "응용", "심화하", "심화중", "심화상"] as const;

type Trace = Array<Record<string, unknown>>;
const encode = (value: unknown): unknown => {
  if (value instanceof Uint8Array)
    return { bytes: value.byteLength, sha256: sha256Hex(value) };
  if (value instanceof Date) return { date: value.toISOString() };
  if (typeof value === "bigint") return { bigint: value.toString() };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, encode(entry)]),
    );
  return value;
};

interface Tamper {
  /** Runs `sql` inside the same transaction just before the first statement matching `before`. */
  before: RegExp;
  sql: string;
}
/**
 * Records every statement with its scope. `failOn` makes one write throw (rollback proof);
 * `tamper` changes the bank between capture and the final lock, as concurrent moderation would.
 */
function tracedDb(
  inner: TextbookDb,
  trace: Trace,
  failOn?: RegExp,
  tamper?: Tamper,
): TextbookDb {
  const wrap = (sql: TextbookSql, scope: "db" | "tx"): TextbookSql => ({
    query: async <T>(text: string, params: readonly SqlParam[] = []) => {
      if (tamper?.before.test(text)) {
        trace.push({ op: "tamper", sql: tamper.sql });
        await sql.execute(tamper.sql);
      }
      trace.push({ op: "query", scope, sql: text, params: encode(params) });
      return sql.query<T>(text, params);
    },
    execute: async (text, params = []) => {
      trace.push({ op: "execute", scope, sql: text, params: encode(params) });
      if (failOn?.test(text)) throw new Error("injected write failure");
      return sql.execute(text, params);
    },
  });
  return {
    ...wrap(inner, "db"),
    transaction: async (run) => {
      trace.push({ op: "begin" });
      try {
        const result = await inner.transaction((tx) => run(wrap(tx, "tx")));
        trace.push({ op: "commit" });
        return result;
      } catch (error) {
        trace.push({ op: "rollback" });
        throw error;
      }
    },
  };
}

const portrait = (seed: string) => {
  const bytes = tinyPng(30, 40, seed);
  return {
    assetId: sha256(bytes),
    mimeType: "image/png" as const,
    name: `${seed}.png`,
    widthPx: 30,
    heightPx: 40,
    bytes,
  };
};
const TEACHER = portrait("teacher"),
  STUDENT = portrait("student"),
  STORY = portrait("story");

type Deps = QuickCreateDependencies;
/** Injected callbacks join the same trace, so their order relative to SQL is frozen too. */
function recordingDeps(
  trace: Trace,
  kind: "visual" | "injected" | "bare" | "empty-dialogue" | "missing-portrait",
  options: { now?: boolean } = {},
): Deps {
  const loadFigure: Deps["loadFigure"] = async (path) => {
    trace.push({ op: "dep", name: "loadFigure", args: [path] });
    return path.includes("missing") ? null : tinyPng(30, 40, `figure:${path}`);
  };
  const now =
    options.now === false
      ? {}
      : {
          now: () => {
            trace.push({ op: "dep", name: "now" });
            return NOW;
          },
        };
  if (kind === "bare") return { loadFigure, ...now };
  const dialogueForSection: NonNullable<Deps["dialogueForSection"]> = async (
    sectionKey,
    cast,
  ) => {
    trace.push({
      op: "dep",
      name: "dialogueForSection",
      args: [sectionKey, cast],
    });
    return {
      turns:
        kind === "empty-dialogue"
          ? []
          : [
              {
                speakerId: `tb-portrait-${cast.teacherId}`,
                side: "left",
                expression: "question",
                portraitAssetId: TEACHER.assetId,
                mirrorPortrait: false,
                markdown: `${sectionKey} 에서 무엇을 배울까요?`,
              },
              {
                speakerId: `tb-portrait-${cast.student1Id}`,
                side: "right",
                expression: "aha",
                portraitAssetId: STUDENT.assetId,
                mirrorPortrait: true,
                markdown: "뜻과 조건을 **설명**해 볼게요.",
              },
            ],
      assets: kind === "missing-portrait" ? [TEACHER] : [TEACHER, STUDENT],
    };
  };
  if (kind !== "visual") return { loadFigure, dialogueForSection, ...now };
  return {
    loadFigure,
    dialogueForSection,
    ...now,
    prepareVisuals: async (tx, scope) => {
      trace.push({
        op: "dep",
        name: "prepareVisuals",
        args: [
          {
            userId: scope.userId,
            editionId: scope.editionId,
            cast: scope.cast,
            units: scope.units,
            dialogue: scope.dialogue,
            rest: scope.rest,
          },
        ],
      });
      for (const asset of [TEACHER, STUDENT, STORY])
        await putAsset(tx, scope.userId, asset, "portrait");
      await linkEditionAssets(tx, scope.editionId, scope.userId, [
        TEACHER.assetId,
        STUDENT.assetId,
        STORY.assetId,
      ]);
      return {
        assetIds: [TEACHER.assetId, STUDENT.assetId, STORY.assetId],
        dialogueForSection: (sectionKey) => {
          trace.push({
            op: "dep",
            name: "visuals.dialogueForSection",
            args: [sectionKey],
          });
          return [
            {
              speakerId: `tb-portrait-${scope.cast.teacherId}`,
              side: "left",
              expression: "neutral",
              portraitAssetId: TEACHER.assetId,
              mirrorPortrait: false,
              markdown: `준비된 대화 · ${sectionKey}`,
            },
            {
              speakerId: `tb-portrait-${scope.cast.student2Id}`,
              side: "right",
              expression: "thinking",
              portraitAssetId: STUDENT.assetId,
              mirrorPortrait: true,
              markdown: "왜 그럴까요? $1 + 1 = 2$",
            },
          ];
        },
        restForUnit: (unit) => {
          trace.push({ op: "dep", name: "visuals.restForUnit", args: [unit] });
          return {
            title: `수학 이야기 · ${unit.chapter}`,
            markdown: "같은 크기의 사과 여섯 개를 세 사람이 똑같이 나눕니다.",
            reflectionQuestions: [
              "한 사람은 몇 개를 받을까요?",
              "두 사람이면 어떻게 달라질까요?",
            ],
            imageAssetId: STORY.assetId,
          };
        },
      };
    },
  };
}

let pg: Db, db: TextbookDb;
const ids = new Map<string, string>();
const seedKey = (u: { grade: string; chapter: string; section: string }) =>
  `${u.grade}::${u.chapter}::${u.section}`;
const supported = CURRICULUM_UNITS.filter((u) =>
  /^(초[3-6]|중[1-3])$/.test(u.grade),
);
const term = (grade: string, semester: 1 | 2) =>
  supported
    .filter((u) => u.grade === grade && quickCreateSemester(u) === semester)
    .sort((a, b) => a.orderIndex - b.orderIndex);
const e3 = term("초3", 1);
const m2 = term("중2", 1);
const boundary = e3.findIndex((u) => u.chapter !== e3[0].chapter);
const idOf = (unit: (typeof supported)[number]) => ids.get(seedKey(unit))!;

const allOff = Object.fromEntries(
  Object.keys(DEFAULT_QUICK_CREATE_COMPONENTS).map((key) => [key, false]),
) as QuickCreateComponents;
const allOn = Object.fromEntries(
  Object.keys(DEFAULT_QUICK_CREATE_COMPONENTS).map((key) => [key, true]),
) as QuickCreateComponents;
const only = (overrides: Partial<QuickCreateComponents>) => ({
  ...allOff,
  ...overrides,
});

beforeAll(async () => {
  vi.useFakeTimers({
    toFake: ["Date"],
    now: new Date("2026-10-05T00:00:00.000Z"),
  });
  pg = await openTextbookDb();
  db = pgliteTextbookDb(pg);
  clock.scope = "seed";
  clock.n = 0;
  for (const [index, unit] of supported.entries()) {
    const id = randomUUID();
    ids.set(seedKey(unit), id);
    await pg.query(
      `INSERT INTO "unit" ("id","grade","chapter","section","order_index","problem_code_prefix") VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        id,
        unit.grade,
        unit.chapter,
        unit.section,
        unit.orderIndex,
        `J3${String(1000 + index)}`,
      ],
    );
  }
  // 초3-1: the whole first chapter and the first two sections of the second; 중2-1: two sections.
  const banked = [...e3.slice(0, boundary + 2), ...m2.slice(0, 2)];
  for (const [unitIndex, unit] of banked.entries()) {
    const id = idOf(unit);
    for (const difficulty of TIERS) {
      await insertBankProblem(pg, id, {
        difficulty,
        content: `${difficulty} 문제 ${unitIndex}: $${unitIndex + 2} \\times 3$ 을 계산하시오.`,
        answer: String((unitIndex + 2) * 3),
        solution: `풀이 ${unitIndex}: 곱셈구구를 이용한다.`,
        figureUrls: ["/figures/proof.png"],
        figureDims: [30, 40],
        figureSourceMm: [35],
        choiceFigureIndex: [0],
      });
      await insertBankProblem(pg, id, {
        difficulty,
        content: `${difficulty} 서술형 문제 ${unitIndex}: 풀이 과정을 쓰시오.`,
        questionType: "서술형",
        answer: `서술 답 ${unitIndex}`,
        solution: null,
      });
    }
    await insertBankProblem(pg, id, {
      difficulty: "응용",
      content: "알맞은 그림을 고르시오.\n\n① [그림]\n② [그림]",
      answer: "①",
      figureUrls: ["/figures/choice-1.png", "/figures/choice-2.png"],
      figureDims: [30, 40, 30, 40],
      figureSourceMm: [20, 20],
      choiceFigureIndex: [1, 2],
    });
    // Capture fails for this one (the loader returns null): the warning path.
    await insertBankProblem(pg, id, {
      difficulty: "심화상",
      content: `그림이 없는 문제 ${unitIndex}`,
      figureUrls: ["/figures/missing.png"],
      figureDims: [30, 40],
      figureSourceMm: [35],
      choiceFigureIndex: [0],
    });
    for (const overrides of [
      { reviewStatus: "pending" as const },
      { directUseAllowed: false },
      { pool: "private" as const },
      { answer: MISSING_ANSWER },
    ])
      await insertBankProblem(pg, id, overrides);
  }
  // Written candidates only (no other format) in one section: written shortage arithmetic.
  await insertBankProblem(pg, idOf(e3[boundary + 2]), {
    difficulty: "기본",
    content: "서술형만 있는 소단원의 문제",
    questionType: "서술형",
    answer: "서술",
  });
  // The insert trigger names a lone family `solo:<gen_random_uuid()>`: pin it to the row's own id.
  await pg.query(`UPDATE "problem" SET "family_key" = 'solo:' || "id"::text`);
});
afterAll(async () => {
  vi.useRealTimers();
  await pg.close();
});

interface Case {
  name: string;
  deps?: Parameters<typeof recordingDeps>[1];
  depOptions?: { now?: boolean };
  input: (base: QuickCreateInput) => QuickCreateInput;
  failOn?: RegExp;
  tamper?: Tamper;
  /** Runs the identical request again and records the replay. */
  replay?: boolean;
  /** Reuses the request id with this different body afterwards. */
  conflictWith?: (first: QuickCreateInput) => QuickCreateInput;
}

function cases(): Case[] {
  const range = (from: number, to: number) => (base: QuickCreateInput) => ({
    ...base,
    startUnitId: idOf(e3[from]),
    endUnitId: idOf(e3[to]),
  });
  const list: Case[] = [];
  const add = (entry: Case) => list.push(entry);

  // Defaults and whole-book mixes.
  add({
    name: "default-components",
    input: (b) => ({ ...b, components: undefined }),
  });
  add({
    name: "default-components-clock",
    depOptions: { now: false },
    input: (b) => ({ ...b, components: undefined, endUnitId: b.startUnitId }),
  });
  add({
    name: "default-without-concepts",
    input: (b) => ({ ...b, components: undefined, includeConcepts: false }),
  });
  add({
    name: "all-on-chapter-boundary",
    input: (b) => ({
      ...range(boundary - 1, boundary + 1)(b),
      components: allOn,
      problemCountPerUnit: 7,
    }),
  });
  add({
    name: "all-on-without-cover",
    input: (b) => ({
      ...b,
      components: { ...allOn, cover: false },
      problemCountPerUnit: 8,
    }),
  });
  add({
    name: "all-on-concepts-excluded",
    input: (b) => ({
      ...b,
      components: allOn,
      includeConcepts: false,
      problemCountPerUnit: 6,
    }),
  });
  add({
    name: "all-on-whole-semester",
    input: (b) => ({
      ...range(0, e3.length - 1)(b),
      components: allOn,
      problemCountPerUnit: 30,
    }),
  });
  add({
    name: "all-on-middle2-semester",
    input: (b) => ({
      ...b,
      schoolLevel: "middle",
      grade: 2,
      startUnitId: idOf(m2[0]),
      endUnitId: idOf(m2[m2.length - 1]),
      components: allOn,
      problemCountPerUnit: 9,
      difficulty: "challenge",
      title: "  중2 수와 식 <자동> & 확인  ",
      cast: {
        teacherId: "teacher-m3",
        student1Id: "student-f5",
        student2Id: "student-m4",
      },
    }),
  });
  add({
    name: "all-on-injected-dialogue",
    deps: "injected",
    input: (b) => ({
      ...b,
      components: { ...allOn, rest: false },
      problemCountPerUnit: 8,
    }),
  });

  // Every component alone, with and without the cover.
  for (const key of Object.keys(DEFAULT_QUICK_CREATE_COMPONENTS) as Array<
    keyof QuickCreateComponents
  >) {
    if (key === "cover") continue;
    for (const cover of [false, true])
      add({
        name: `single-${key}${cover ? "-cover" : ""}`,
        input: (b) => ({ ...b, components: only({ [key]: true, cover }) }),
      });
    add({
      name: `single-${key}-chapter-boundary`,
      input: (b) => ({
        ...range(boundary - 1, boundary)(b),
        components: only({ [key]: true }),
      }),
    });
  }

  // Dependent pairs and partial recall families.
  for (const [name, components] of [
    ["recall-term-cloze", { termRecall: true, clozeRecall: true }],
    ["recall-term-sentence", { termRecall: true, sentenceRecall: true }],
    ["recall-cloze-sentence", { clozeRecall: true, sentenceRecall: true }],
    [
      "recall-all-three",
      { termRecall: true, clozeRecall: true, sentenceRecall: true },
    ],
    ["concept-with-cloze", { concepts: true, clozeRecall: true }],
    ["concept-with-dialogue", { concepts: true, dialogue: true }],
    ["preparation-error", { preparation: true, errorCheck: true }],
    ["error-with-concepts", { errorCheck: true, concepts: true }],
    ["dialogue-practice", { dialogue: true, practice: true }],
    ["intro-rest", { unitIntro: true, rest: true }],
    [
      "front-matter",
      { learningGuide: true, learningPlan: true, questionLog: true },
    ],
    ["worked-practice", { workedExamples: true, practice: true }],
    ["concept-practice", { concepts: true, practice: true }],
  ] as const)
    add({
      name: `pair-${name}`,
      input: (b) => ({
        ...range(boundary - 1, boundary)(b),
        components: only(components),
        problemCountPerUnit: 4,
      }),
    });
  add({
    name: "injected-dialogue-only",
    deps: "injected",
    input: (b) => ({ ...b, components: only({ dialogue: true }) }),
  });

  // Problem stages: quotas, remainders, tiers and shortages.
  const stages = {
    workedExamples: true,
    practice: true,
    review: true,
    assessment: true,
    written: true,
  };
  for (const count of [5, 6, 7, 9, 13, 30])
    add({
      name: `stages-five-count-${count}`,
      input: (b) => ({
        ...b,
        components: only(stages),
        problemCountPerUnit: count,
      }),
    });
  for (const difficulty of Object.keys(QUICK_CREATE_DIFFICULTIES) as Array<
    keyof typeof QUICK_CREATE_DIFFICULTIES
  >) {
    add({
      name: `practice-${difficulty}`,
      input: (b) => ({
        ...b,
        difficulty,
        components: only({ practice: true }),
        problemCountPerUnit: 8,
      }),
    });
    add({
      name: `written-only-${difficulty}`,
      input: (b) => ({
        ...b,
        difficulty,
        components: only({ written: true }),
        problemCountPerUnit: 4,
      }),
    });
    add({
      name: `written-practice-${difficulty}`,
      input: (b) => ({
        ...b,
        difficulty,
        components: only({ written: true, practice: true }),
        problemCountPerUnit: 10,
      }),
    });
  }
  add({
    name: "stages-three-odd",
    input: (b) => ({
      ...b,
      components: only({ practice: true, review: true, assessment: true }),
      problemCountPerUnit: 5,
    }),
  });
  add({
    name: "single-unit",
    input: (b) => ({
      ...b,
      endUnitId: b.startUnitId,
      components: only({ practice: true }),
      problemCountPerUnit: 1,
    }),
  });
  // A section whose candidates are all written: the shortage is redistributed.
  add({
    name: "written-shortage-redistributed",
    input: (b) => ({
      ...range(boundary + 1, boundary + 2)(b),
      difficulty: "basic",
      components: only({ written: true, practice: true }),
      problemCountPerUnit: 6,
    }),
  });
  // One section has candidates, the next has none and nothing else to print: it is dropped.
  add({
    name: "empty-lesson-dropped",
    input: (b) => ({
      ...range(boundary + 1, boundary + 3)(b),
      components: only({ practice: true }),
    }),
  });
  add({
    name: "concepts-kept-without-problems",
    input: (b) => ({
      ...range(boundary + 3, boundary + 4)(b),
      components: only({ concepts: true, practice: true }),
    }),
  });
  add({
    name: "replayed",
    replay: true,
    input: (b) => ({
      ...b,
      components: only({ practice: true, concepts: true }),
    }),
  });
  add({
    name: "request-id-reused",
    conflictWith: (first) => ({ ...first, problemCountPerUnit: 3 }),
    input: (b) => ({ ...b, components: only({ practice: true }) }),
  });

  // Rejections: nothing may remain in the database.
  add({
    name: "reject-reversed-range",
    input: (b) => ({
      ...b,
      startUnitId: b.endUnitId,
      endUnitId: b.startUnitId,
    }),
  });
  add({
    name: "reject-other-semester",
    input: (b) => ({ ...b, endUnitId: idOf(term("초3", 2)[0]) }),
  });
  add({
    name: "reject-unknown-unit",
    input: (b) => ({
      ...b,
      startUnitId: "00000000-0000-4000-8000-000000000001",
    }),
  });
  add({
    name: "reject-other-grade",
    input: (b) => ({ ...b, endUnitId: idOf(m2[0]) }),
  });
  add({
    name: "reject-no-eligible-problems",
    input: (b) => ({
      ...range(boundary + 3, boundary + 4)(b),
      components: only({ practice: true }),
    }),
  });
  add({
    name: "reject-rest-without-visuals",
    deps: "injected",
    input: (b) => ({ ...b, components: only({ rest: true }) }),
  });
  add({
    name: "reject-dialogue-without-source",
    deps: "bare",
    input: (b) => ({ ...b, components: only({ dialogue: true }) }),
  });
  add({
    name: "reject-dialogue-empty",
    deps: "empty-dialogue",
    input: (b) => ({ ...b, components: only({ dialogue: true }) }),
  });
  add({
    name: "reject-dialogue-missing-portrait",
    deps: "missing-portrait",
    input: (b) => ({ ...b, components: only({ dialogue: true }) }),
  });
  for (const [name, failOn] of [
    ["edition", /^INSERT INTO "textbook_edition"/],
    ["outline", /^UPDATE "textbook_edition" SET "outline"/],
    ["section", /^INSERT INTO "textbook_section"/],
    ["concept", /^INSERT INTO "textbook_concept"/],
    ["item", /^INSERT INTO "textbook_item"/],
    ["receipt", /^UPDATE "textbook_request"/],
  ] as const)
    add({
      name: `rollback-late-${name}-failure`,
      failOn,
      input: (b) => ({
        ...b,
        components: only({ practice: true, concepts: true, dialogue: true }),
      }),
    });
  // The bank changes after capture and before the final lock: every write must be undone.
  for (const [name, change] of [
    ["withdrawn", `"direct_use_allowed" = false`],
    ["edited", `"updated_at" = "updated_at" + interval '1 second'`],
    ["harder", `"difficulty" = '심화상'::"difficulty"`],
  ] as const)
    add({
      name: `conflict-source-${name}`,
      tamper: {
        before: /^SELECT "id" FROM "problem" WHERE "id" IN [\s\S]* FOR SHARE$/,
        sql: `UPDATE "problem" SET ${change} WHERE "unit_id" = '${idOf(e3[0])}'::uuid AND "difficulty"::text = '기본'`,
      },
      input: (b) => ({
        ...b,
        components: only({ practice: true, concepts: true }),
      }),
    });
  return list;
}

async function stored(actor: TextbookActor): Promise<unknown> {
  const rows = async (sql: string) =>
    encode((await pg.query(sql, [actor.id])).rows);
  const editions = `(SELECT "id" FROM "textbook_edition" WHERE "user_id" = $1)`;
  return {
    textbook: await rows(
      `SELECT * FROM "textbook" WHERE "user_id" = $1 ORDER BY "id"`,
    ),
    textbook_edition: await rows(
      `SELECT * FROM "textbook_edition" WHERE "user_id" = $1 ORDER BY "id"`,
    ),
    textbook_section: await rows(
      `SELECT s.*, s."content"::text AS "content_text" FROM "textbook_section" s
        WHERE s."edition_id" IN ${editions} ORDER BY s."edition_id", s."order_index", s."id"`,
    ),
    textbook_concept: await rows(
      `SELECT * FROM "textbook_concept" WHERE "edition_id" IN ${editions} ORDER BY "edition_id", "concept_key"`,
    ),
    textbook_item: await rows(
      `SELECT * FROM "textbook_item" WHERE "edition_id" IN ${editions} ORDER BY "edition_id", "section_id", "order_index", "id"`,
    ),
    textbook_problem_snapshot: await rows(
      `SELECT * FROM "textbook_problem_snapshot" WHERE "user_id" = $1 ORDER BY "id"`,
    ),
    textbook_asset: await rows(
      `SELECT * FROM "textbook_asset" WHERE "user_id" = $1 ORDER BY "id"`,
    ),
    textbook_edition_asset: await rows(
      `SELECT * FROM "textbook_edition_asset" WHERE "user_id" = $1 ORDER BY "edition_id", "asset_id"`,
    ),
    textbook_request: await rows(
      `SELECT * FROM "textbook_request" WHERE "user_id" = $1 ORDER BY "request_id"`,
    ),
  };
}

describe("quick create extraction proof", () => {
  it("keeps catalog, SQL, id order, stored rows, results, errors and rendered HTML byte-identical", async () => {
    const artifacts = new ProofArtifacts();
    artifacts.addJson(
      "catalog/semesters.json",
      supported.map((unit) => [seedKey(unit), quickCreateSemester(unit)]),
    );
    artifacts.addJson(
      "catalog/semesters-unsupported.json",
      [
        ...CURRICULUM_UNITS.filter((u) => !/^(초[3-6]|중[1-3])$/.test(u.grade)),
        { grade: "초3", chapter: "새 단원", section: "알 수 없음" },
        { grade: "중2", chapter: "9. 없는 단원", section: "없음" },
      ].map((unit) => [seedKey(unit), quickCreateSemester(unit)]),
    );
    artifacts.addJson("catalog/constants.json", {
      QUICK_CREATE_DIFFICULTIES,
      DEFAULT_QUICK_CREATE_CAST,
    });
    for (const schoolLevel of ["elementary", "middle"] as const)
      for (const grade of schoolLevel === "elementary"
        ? [3, 4, 5, 6]
        : [1, 2, 3])
        for (const semester of [1, 2] as const) {
          const trace: Trace = [];
          const scope: QuickCreateScope = { schoolLevel, grade, semester };
          artifacts.addJson(
            `catalog/${schoolLevel}-${grade}-${semester}.json`,
            {
              catalog: await listQuickCreateUnits(tracedDb(db, trace), scope),
              trace,
            },
          );
        }
    for (const scope of [
      { schoolLevel: "elementary", grade: 2, semester: 1 },
      { schoolLevel: "middle", grade: 4, semester: 1 },
    ])
      try {
        await listQuickCreateUnits(db, scope as QuickCreateScope);
        artifacts.add(
          `catalog/reject-${scope.schoolLevel}-${scope.grade}.json`,
          "no error\n",
        );
      } catch (error) {
        artifacts.addJson(
          `catalog/reject-${scope.schoolLevel}-${scope.grade}.json`,
          errorShape(error),
        );
      }

    const escaped: string[] = [];
    for (const entry of cases()) {
      clock.scope = entry.name;
      clock.n = 0;
      const actor = await insertTeacher(pg, { name: `교사 ${entry.name}` });
      const trace: Trace = [];
      const input = entry.input({
        requestId: randomUUID(),
        schoolLevel: "elementary",
        grade: 3,
        semester: 1,
        startUnitId: idOf(e3[0]),
        endUnitId: idOf(e3[2]),
        difficulty: "standard",
        problemCountPerUnit: 2,
        includeConcepts: true,
        components: only({ practice: true }),
      });
      const run = async (label: string, body: QuickCreateInput) => {
        try {
          const result = await createQuickTextbook(
            tracedDb(db, trace, entry.failOn, entry.tamper),
            actor,
            body,
            recordingDeps(trace, entry.deps ?? "visual", entry.depOptions),
          );
          artifacts.addJson(`cases/${entry.name}/${label}.json`, result);
          return result;
        } catch (error) {
          artifacts.addJson(
            `cases/${entry.name}/${label}.error.json`,
            errorShape(error),
          );
          return null;
        }
      };
      const result = await run("result", input);
      if (entry.replay) {
        trace.push({ op: "mark", name: "replay" });
        await run("replay", input);
      }
      if (entry.conflictWith) {
        trace.push({ op: "mark", name: "request id reused" });
        await run("reused", entry.conflictWith(input));
      }
      artifacts.addJson(`cases/${entry.name}/input.json`, input);
      artifacts.addJson(`cases/${entry.name}/trace.json`, trace);
      artifacts.addJson(`cases/${entry.name}/stored.json`, await stored(actor));
      artifacts.addJson(`cases/${entry.name}/ids-consumed.json`, clock.n);
      // The transaction is the only door: nothing may be written around it.
      if (trace.some((step) => step.scope === "db")) escaped.push(entry.name);
      if (result?.book.draftEditionId)
        addModelArtifacts(
          artifacts,
          `cases/${entry.name}/render`,
          await assembleExchange(db, result.book.draftEditionId, {
            exportedAt: NOW.toISOString(),
          }),
        );
    }
    expect(escaped).toEqual([]);
    const difference = settleProof("quickCreate", artifacts, BASELINE);
    expect(difference).toEqual({ missing: [], unexpected: [], changed: [] });
    expect(artifacts.entries.size).toBeGreaterThan(900);
  });
});
