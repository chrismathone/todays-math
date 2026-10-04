// @vitest-environment node
/**
 * Recovery writers checked end to end: the 28 independent activities, example/confirmation
 * pairs from recorded source families, shared quotas and shortages — on PGlite, then through
 * the render model and the student HTML. All bank rows and manuscript text are synthetic.
 */
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const fragmentCalls = vi.hoisted(() => [] as unknown[][]);
vi.mock("@/lib/textbook/render/blocks/semantic", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/lib/textbook/render/blocks/semantic")
    >();
  const original = actual.renderSourceFragments as (
    ...args: unknown[]
  ) => string;
  return {
    ...actual,
    renderSourceFragments: (...args: unknown[]) => {
      fragmentCalls.push(args);
      return original(...args);
    },
  };
});
import {
  DEFAULT_QUICK_CREATE_COMPONENTS,
  effectiveQuickCreateComponents,
  quickCreateInputSchema,
  quickCreateSelectionInput,
  type QuickCreateComponents,
  type QuickCreateInput,
} from "@/contracts/textbookQuickCreate.contract";
import type { TextbookSemanticRow } from "@/contracts/textbookSemantic.contract";
import { classifyFormat } from "@/lib/problem/provenance";
import type { TextbookActor } from "@/lib/textbook/access";
import { sha256 } from "@/lib/textbook/hash.server";
import {
  recallDisplayRows,
  type RecallDisplayRow,
  type RecallPhase,
} from "@/lib/textbook/render/blocks/recall";
import { renderBlockHtml } from "@/lib/textbook/render/html";
import {
  createTextbookRenderModel,
  type RenderBlock,
} from "@/lib/textbook/render/model";
import { linkEditionAssets, putAsset } from "@/lib/textbook/server/blobs";
import { assembleExchange } from "@/lib/textbook/server/exchange";
import {
  createQuickTextbook,
  quickCreateSemester,
  type QuickCreateDependencies,
} from "@/lib/textbook/server/quickCreate";
import {
  quickCreateItemLayout,
  verifiedExamplePairKey,
} from "@/lib/textbook/server/quickCreate/problemStages";
import { ACTIVITY_LABELS } from "@/lib/textbook/server/quickCreateRecovery";
import type {
  SqlParam,
  TextbookDb,
  TextbookSql,
} from "@/lib/textbook/server/sql";
import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import { openTextbookDb, sqlNow, type Db } from "../helpers/textbookPglite";
import {
  insertTeacher,
  pgliteTextbookDb,
  tinyPng,
} from "../helpers/textbookServerWorld";

const resources = {
  assetUrl: (id: string) => `/assets/${id}.png`,
  qrDataUrl: () => "data:image/png;base64,AA==",
};
// PGlite needs the Node environment; the DOM is built only to read rendered HTML.
const { JSDOM } = createRequire(import.meta.url)("jsdom") as {
  JSDOM: new (html: string) => { window: { document: Document } };
};
const parse = (html: string) => new JSDOM(html).window.document;
const base = { id: "b1", sourceBlockId: "b1", unitKey: "u", sectionKey: "s" };

describe("renderer privacy and resource wiring", () => {
  const rows: TextbookSemanticRow[] = [
    {
      rowKey: "c1.definition",
      label: "약수",
      rawText: "어떤 수를 {나누어떨어지게} 하는 수이다.",
      textFormat: "bank-blank",
    },
  ];
  /** What the model sends a student: projected rows, and a node whose text is stripped. */
  const stripped = (
    phase: RecallPhase,
    displayRows: RecallDisplayRow[] | undefined,
    extra: Record<string, unknown> = {},
  ): RenderBlock =>
    ({
      ...base,
      kind: "recall",
      phase,
      pieces: [],
      repetitionChecks: false,
      semantic: {
        activity: phase === "keywords" ? "clozeRecall" : "sentenceRecall",
        node: {
          kind: "rows",
          groupKey: "concept-x.memory-0",
          rows: rows.map((row) => ({ ...row, rawText: "" })),
        },
      },
      ...(displayRows ? { displayRows } : {}),
      ...extra,
    }) as RenderBlock;

  it("prints projected rows and never reads the stripped node text", () => {
    for (const phase of ["keywords", "sentences"] as const) {
      const html = renderBlockHtml(
        stripped(phase, recallDisplayRows(rows, phase, false)),
        resources,
      );
      const row = parse(html).querySelector("[data-row-key]")!;
      expect(row.getAttribute("data-row-key")).toBe("c1.definition");
      expect(row.getAttribute("data-row-group")).toBe("concept-x.memory-0");
      expect(row.querySelector(".tb-memory-label")?.textContent).toBe("약수");
      expect(html).not.toContain("나누어떨어지게");
      if (phase === "keywords") {
        expect(row.querySelectorAll(".tb-blank-keyword")).toHaveLength(1);
        expect(row.textContent).toContain("어떤 수를");
      } else {
        expect(row.querySelector(".tb-memory-body")?.textContent).toBe("");
        expect(row.querySelectorAll(".tb-write-line")).toHaveLength(1);
      }
    }
    // The answer variant receives revealed rows through the same field.
    const answers = renderBlockHtml(
      stripped("keywords", recallDisplayRows(rows, "keywords", true)),
      resources,
    );
    expect(parse(answers).querySelector(".tb-memory-key")?.textContent).toBe(
      "나누어떨어지게",
    );
  });

  it("removes revealed text from projected rows when the block is marked student", () => {
    const revealed = recallDisplayRows(rows, "keywords", true);
    const keywords = renderBlockHtml(
      stripped("keywords", revealed, { answersVisible: false }),
      resources,
    );
    expect(keywords).not.toContain("나누어떨어지게");
    expect(parse(keywords).querySelectorAll(".tb-blank-keyword")).toHaveLength(
      1,
    );
    const sentences = renderBlockHtml(
      stripped("sentences", recallDisplayRows(rows, "sentences", true), {
        answersVisible: false,
      }),
      resources,
    );
    expect(sentences).not.toContain("어떤 수를");
    expect(parse(sentences).querySelectorAll(".tb-write-line")).toHaveLength(1);
  });

  it("still projects the node's own rows when the model sends none", () => {
    const block = stripped("keywords", undefined) as RenderBlock & {
      semantic: { node: { rows: TextbookSemanticRow[] } };
    };
    block.semantic.node.rows = rows;
    const html = renderBlockHtml(
      { ...block, answersVisible: false } as unknown as RenderBlock,
      resources,
    );
    expect(html).not.toContain("나누어떨어지게");
    expect(parse(html).querySelectorAll(".tb-blank-keyword")).toHaveLength(1);
  });

  it("never takes a paragraph part without a blank as the answer variant", () => {
    // What the model sends today for one keyword block: its label paragraph and its body
    // paragraph as two parts, each carrying the whole row list and no variant flag.
    const part = (extra: Record<string, unknown>): RenderBlock =>
      ({
        ...base,
        kind: "recall",
        phase: "keywords",
        repetitionChecks: false,
        semantic: {
          activity: "clozeRecall",
          node: { kind: "rows", groupKey: "concept-x.memory-0", rows },
        },
        ...extra,
      }) as unknown as RenderBlock;
    const label = [{ kind: "text", markdown: "**약수**" }];
    for (const student of [
      part({ pieces: label, continuation: false, lastPart: false }),
      part({ pieces: label, continuation: true, lastPart: false }),
      part({ pieces: label, continuation: true, lastPart: true }),
      part({ pieces: [], continuation: false, lastPart: true }),
    ]) {
      const html = renderBlockHtml(student, resources);
      expect(html).not.toContain("나누어떨어지게");
      expect(parse(html).querySelectorAll(".tb-blank-keyword")).toHaveLength(1);
    }
    // A whole block with no blank is still read as the answer variant.
    expect(
      renderBlockHtml(
        part({ pieces: label, continuation: false, lastPart: true }),
        resources,
      ),
    ).toContain("나누어떨어지게");
  });

  it("hands the resources to the shared fragment renderer for a concept block", () => {
    fragmentCalls.length = 0;
    const fragments = [
      {
        tag: "div" as const,
        attributes: { className: "rule-box" },
        children: [{ tag: "span" as const, rawText: "두 수의 합" }],
      },
    ];
    const html = renderBlockHtml(
      {
        ...base,
        kind: "concept",
        conceptKey: "C01",
        title: "합",
        body: {
          goal: "",
          prerequisites: [],
          definition: "저장된 정의",
          conditions: null,
          examples: [],
          counterexamples: [],
          misconceptions: [],
          explainPrompt: null,
        },
        qr: null,
        semantic: {
          activity: "concepts",
          node: { kind: "fragments", fragments },
        },
      } as RenderBlock,
      resources,
    );
    expect(fragmentCalls).toHaveLength(1);
    expect(fragmentCalls[0][0]).toBe(fragments);
    expect(fragmentCalls[0][1]).toBe(resources);
    expect(parse(html).querySelector(".rule-box")?.textContent).toBe(
      "두 수의 합",
    );
    expect(html).not.toContain("저장된 정의");
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Writers on PGlite. One section is rich, one has only lone calculations, one is empty.
// ───────────────────────────────────────────────────────────────────────────
type Key = keyof QuickCreateComponents;
const KEYS = Object.keys(DEFAULT_QUICK_CREATE_COMPONENTS) as Key[];
const PROBLEM_GROUPS: Key[] = [
  "basicCheck",
  "workedExamples",
  "practice",
  "reasoning",
  "review",
  "assessment",
  "written",
];
const allOn = Object.fromEntries(
  KEYS.map((key) => [key, true]),
) as QuickCreateComponents;
const allOff = Object.fromEntries(
  KEYS.map((key) => [key, false]),
) as QuickCreateComponents;
const only = (on: Partial<QuickCreateComponents>): QuickCreateComponents => ({
  ...allOff,
  ...on,
});
const problemsOnly = only(
  Object.fromEntries(PROBLEM_GROUPS.map((key) => [key, true])),
);

let pg: Db, db: TextbookDb;
const unitIds = new Map<string, string>();
const seedKey = (u: { grade: string; chapter: string; section: string }) =>
  `${u.grade}::${u.chapter}::${u.section}`;
const e3 = CURRICULUM_UNITS.filter(
  (u) => u.grade === "초3" && quickCreateSemester(u) === 1,
).sort((a, b) => a.orderIndex - b.orderIndex);
const [RICH, SPARSE, EMPTY] = [0, 1, 2];
const unitId = (index: number) => unitIds.get(seedKey(e3[index]))!;

interface Seed {
  content: string;
  answer: string;
  solution: string | null;
  difficulty?: string;
  problemType?: string;
  questionType?: string | null;
  familyKey?: string | null;
}
/** Bank row ids by name, to tell which source row a printed question came from. */
const bank: Record<string, string> = {};
async function seed(name: string, unit: string, row: Seed): Promise<void> {
  const id = randomUUID();
  bank[name] = id;
  await pg.query(
    `INSERT INTO "problem" ("id","unit_id","source","difficulty","problem_type","question_type","content","answer","solution",
       "family_key","review_status","direct_use_allowed","pool","updated_at")
     VALUES ($1,$2,'manual',$3::"difficulty",$4,$5,$6,$7,$8,$9,'approved',true,'shared',$10)`,
    [
      id,
      unit,
      row.difficulty ?? "기본",
      row.problemType ?? "계산",
      row.questionType ?? null,
      row.content,
      row.answer,
      row.solution,
      row.familyKey ?? null,
      sqlNow(),
    ],
  );
}
const sum = (a: number, b: number): Seed => ({
  content: `$${a} + ${b}$ 를 계산하시오.`,
  answer: String(a + b),
  solution: `일의 자리부터 차례로 더하면 $${a} + ${b} = ${a + b}$ 이다.`,
});
const difference = (a: number, b: number): Seed => ({
  content: `$${a} - ${b}$ 를 계산하시오.`,
  answer: String(a - b),
  solution: `일의 자리부터 차례로 빼면 $${a} - ${b} = ${a - b}$ 이다.`,
});

const png = tinyPng(30, 40, "portrait");
const portraitId = sha256(png);
const deps: QuickCreateDependencies = {
  loadFigure: async () => png,
  prepareVisuals: async (tx, scope) => {
    await putAsset(
      tx,
      scope.userId,
      {
        assetId: portraitId,
        mimeType: "image/png",
        name: "portrait.png",
        widthPx: 30,
        heightPx: 40,
        bytes: png,
      },
      "portrait",
    );
    await linkEditionAssets(tx, scope.editionId, scope.userId, [portraitId]);
    return {
      assetIds: [portraitId],
      dialogueForSection: () => [
        {
          speakerId: scope.cast.teacherId,
          side: "left",
          expression: "neutral",
          portraitAssetId: portraitId,
          mirrorPortrait: false,
          markdown: "세 자리 수의 덧셈을 자리별로 살펴봅시다.",
        },
      ],
      restForUnit: () => ({
        title: "수학 이야기",
        markdown: "같은 크기의 사과 여섯 개를 세 사람이 똑같이 나눕니다.",
        reflectionQuestions: ["한 사람은 몇 개를 받을까요?"],
        imageAssetId: portraitId,
      }),
    };
  },
};

beforeAll(async () => {
  pg = await openTextbookDb();
  db = pgliteTextbookDb(pg);
  for (const [index, unit] of e3.entries()) {
    const id = randomUUID();
    unitIds.set(seedKey(unit), id);
    await pg.query(
      `INSERT INTO "unit" ("id","grade","chapter","section","order_index","problem_code_prefix") VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        id,
        unit.grade,
        unit.chapter,
        unit.section,
        unit.orderIndex,
        `E3${String(1000 + index)}`,
      ],
    );
  }
  const rich = unitId(RICH);
  // Two recorded pairs: same engine family, type, difficulty and format; different questions.
  await seed("pairA1", rich, {
    ...sum(213, 325),
    familyKey: "elem:add-three-digit",
  });
  await seed("pairA2", rich, {
    ...sum(416, 372),
    familyKey: "elem:add-three-digit",
  });
  await seed("pairB1", rich, {
    ...difference(587, 243),
    familyKey: "elem:subtract-three-digit",
    difficulty: "응용",
  });
  await seed("pairB2", rich, {
    ...difference(968, 415),
    familyKey: "elem:subtract-three-digit",
    difficulty: "응용",
  });
  // Traps: none of these may ever be printed as an example with its confirmation.
  await seed("lone", rich, { ...sum(124, 231), familyKey: "elem:lone-family" });
  await seed("noSolution1", rich, {
    ...sum(302, 145),
    familyKey: "elem:missing-solution",
  });
  await seed("noSolution2", rich, {
    ...sum(511, 236),
    solution: null,
    familyKey: "elem:missing-solution",
  });
  await seed("repeated1", rich, {
    ...sum(120, 340),
    familyKey: "elem:repeated-question",
  });
  await seed("repeated2", rich, {
    ...sum(120, 340),
    familyKey: "elem:repeated-question",
  });
  await seed("twoDifficulties1", rich, {
    ...sum(251, 124),
    familyKey: "elem:two-difficulties",
  });
  await seed("twoDifficulties2", rich, {
    ...sum(262, 135),
    familyKey: "elem:two-difficulties",
    difficulty: "응용",
  });
  await seed("twoTypes1", rich, {
    ...sum(153, 224),
    familyKey: "elem:two-types",
  });
  await seed("twoTypes2", rich, {
    ...sum(164, 213),
    familyKey: "elem:two-types",
    problemType: "개념",
  });
  // The same key on both rows, but not an engine family: a label is not recorded provenance.
  await seed("otherKey1", rich, {
    ...sum(142, 253),
    familyKey: "book:addition-page-12",
  });
  await seed("otherKey2", rich, {
    ...sum(263, 314),
    familyKey: "book:addition-page-12",
  });
  await seed("solo1", rich, sum(331, 142));
  await seed("solo2", rich, sum(152, 236));
  await seed("word1", rich, {
    content: "사과가 $213$개, 배가 $142$개 있습니다. 과일은 모두 몇 개입니까?",
    answer: "355개",
    solution: "$213 + 142 = 355$ 이므로 모두 $355$개이다.",
    problemType: "활용",
    difficulty: "응용",
  });
  await seed("word2", rich, {
    content:
      "책이 $468$권 있었는데 $125$권을 빌려주었습니다. 남은 책은 몇 권입니까?",
    answer: "343권",
    solution: "$468 - 125 = 343$ 이므로 $343$권이 남는다.",
    problemType: "활용",
    difficulty: "응용",
  });
  await seed("written1", rich, {
    content: "$245 + 132$ 의 계산 과정을 자릿값을 써서 설명하시오.",
    answer: "377",
    solution:
      "백의 자리 $2+1$, 십의 자리 $4+3$, 일의 자리 $5+2$ 를 각각 더하면 $377$ 이다.",
    questionType: "서술형",
  });
  await seed("written2", rich, {
    content: "$674 - 231$ 의 계산 과정을 자릿값을 써서 설명하시오.",
    answer: "443",
    solution:
      "백의 자리 $6-2$, 십의 자리 $7-3$, 일의 자리 $4-1$ 을 각각 빼면 $443$ 이다.",
    questionType: "서술형",
  });
  await seed("choice", rich, {
    content: "$321 + 264$ 의 값은?\n\n① 575\n② 585\n③ 595\n④ 485\n⑤ 685",
    answer: "②",
    solution: "$321 + 264 = 585$ 이다.",
    questionType: "객관식",
  });
  for (let index = 0; index < 20; index++)
    await seed(`filler${index}`, rich, sum(101 + 7 * index, 102 + 3 * index));
  for (let index = 0; index < 6; index++)
    await seed(`sparse${index}`, unitId(SPARSE), sum(201 + 10 * index, 105));
}, 240_000);
afterAll(async () => {
  await pg.close();
});

type Trace = Array<{ op: string; scope?: string; sql?: string }>;
/** Records every statement and its scope; can fail one write or change the bank mid-flight. */
function traced(
  trace: Trace,
  options: { failOn?: RegExp; tamper?: { before: RegExp; sql: string } } = {},
): TextbookDb {
  const wrap = (sql: TextbookSql, scope: "db" | "tx"): TextbookSql => ({
    query: async <T>(text: string, params: readonly SqlParam[] = []) => {
      if (options.tamper?.before.test(text))
        await sql.execute(options.tamper.sql);
      trace.push({ op: "query", scope, sql: text });
      return sql.query<T>(text, params);
    },
    execute: async (text, params = []) => {
      trace.push({ op: "execute", scope, sql: text });
      if (options.failOn?.test(text)) throw new Error("injected write failure");
      return sql.execute(text, params);
    },
  });
  return {
    ...wrap(db, "db"),
    transaction: async (run) => {
      trace.push({ op: "begin" });
      try {
        const result = await db.transaction((tx) => run(wrap(tx, "tx")));
        trace.push({ op: "commit" });
        return result;
      } catch (error) {
        trace.push({ op: "rollback" });
        throw error;
      }
    },
  };
}

function body(overrides: Partial<QuickCreateInput> = {}): QuickCreateInput {
  return {
    requestId: randomUUID(),
    schoolLevel: "elementary",
    grade: 3,
    semester: 1,
    startUnitId: unitId(RICH),
    endUnitId: unitId(RICH),
    difficulty: "standard",
    problemCountPerUnit: 8,
    includeConcepts: true,
    components: allOn,
    ...overrides,
  };
}
const newActor = () => insertTeacher(pg);
async function create(
  overrides: Partial<QuickCreateInput> = {},
  actor?: TextbookActor,
) {
  return createQuickTextbook(
    db,
    actor ?? (await newActor()),
    body(overrides),
    deps,
  );
}
/** The saved manuscript: sections, blocks and every printed question with its source row. */
async function read(editionId: string) {
  const exchange = await assembleExchange(db, editionId, {
    exportedAt: "2026-10-05T00:00:00Z",
  });
  const items = new Map(exchange.items.map((item) => [item.itemId, item]));
  const snapshots = new Map(
    exchange.snapshots.map((snapshot) => [snapshot.snapshotId, snapshot]),
  );
  const sections = exchange.units.flatMap((unit) =>
    unit.sections.map((section) => ({ unitKey: unit.unitKey, ...section })),
  );
  const blocks = sections.flatMap((section) => section.blocks);
  const problems = blocks.flatMap((block) => {
    if (block.kind !== "problem") return [];
    const item = items.get(block.itemId)!;
    const snapshot = snapshots.get(item.snapshotId)!;
    const node =
      block.semantic?.node?.kind === "exampleGroup"
        ? block.semantic.node
        : undefined;
    return [
      {
        itemId: item.itemId,
        activity: block.semantic?.activity,
        stage: item.learningStage,
        layout: item.layout,
        problemId:
          "problemId" in snapshot.source ? snapshot.source.problemId : "",
        content: snapshot.payload.content,
        answer: snapshot.payload.answer,
        solution: snapshot.payload.solution,
        questionType: snapshot.payload.questionType,
        familyKey: snapshot.familyKey,
        problemType: snapshot.problemType,
        difficulty: snapshot.difficulty,
        groupId: node?.groupId,
        role: !node
          ? undefined
          : node.exampleItemId === item.itemId
            ? "example"
            : node.confirmItemIds.includes(item.itemId)
              ? "confirm"
              : "stray",
      },
    ];
  });
  return { exchange, sections, blocks, problems };
}
type Book = Awaited<ReturnType<typeof read>>;
/** Whether a selectable activity left anything in the saved book. */
function present(book: Book, key: Key): boolean {
  if (key === "cover")
    return book.exchange.config.print.coverMode === "included";
  if (key === "unitIntro")
    return book.sections.some((s) => s.templateKey === "auto-unit-intro");
  if (key === "preparation")
    return book.blocks.some(
      (b) => b.kind === "text" && b.markdown.startsWith("### 준비 학습"),
    );
  return book.blocks.some((b) => b.semantic?.activity === key);
}
const bankName = (problemId: string) =>
  Object.entries(bank).find(([, id]) => id === problemId)?.[0] ?? problemId;
async function counts() {
  const [row] = await db.query<Record<string, number>>(`SELECT
    (SELECT count(*)::int FROM "textbook") AS books, (SELECT count(*)::int FROM "textbook_edition") AS editions,
    (SELECT count(*)::int FROM "textbook_section") AS sections, (SELECT count(*)::int FROM "textbook_concept") AS concepts,
    (SELECT count(*)::int FROM "textbook_item") AS items, (SELECT count(*)::int FROM "textbook_request") AS requests,
    (SELECT count(*)::int FROM "textbook_problem_snapshot") AS snapshots, (SELECT count(*)::int FROM "textbook_asset") AS assets`);
  return row;
}

describe("28 independent activities", () => {
  it("writes only the selected activity when one toggle is on", async () => {
    for (const key of KEYS) {
      if (key === "cover") continue;
      const result = await create({
        components: only({ [key]: true }),
        problemCountPerUnit: 2,
      });
      const book = await read(result.book.draftEditionId!);
      expect(
        KEYS.filter((other) => present(book, other)),
        `${key} alone`,
      ).toEqual([key]);
      expect(book.problems.length > 0, `${key} questions`).toBe(
        PROBLEM_GROUPS.includes(key),
      );
      // Every block that names an activity names the selected one.
      expect(
        new Set(book.blocks.flatMap((b) => b.semantic?.activity ?? [])),
        `${key} semantic`,
      ).toEqual(
        new Set(["unitIntro", "preparation"].includes(key) ? [] : [key]),
      );
    }
  }, 300_000);

  it("refuses an empty book and a cover without content", () => {
    for (const components of [allOff, only({ cover: true })])
      expect(
        quickCreateInputSchema.safeParse(body({ components })).success,
      ).toBe(false);
    // Concept activities switched off by the legacy flag leave nothing either.
    expect(
      quickCreateInputSchema.safeParse(
        body({
          includeConcepts: false,
          components: only({ concepts: true, conceptStudy: true, cover: true }),
        }),
      ).success,
    ).toBe(false);
  });

  it("drops exactly the activity that is switched off from a full book", async () => {
    const full = await read(
      (await create({ problemCountPerUnit: 30 })).book.draftEditionId!,
    );
    expect(KEYS.filter((key) => !present(full, key))).toEqual([]);
    expect(full.problems).toHaveLength(30);
    expect(new Set(full.problems.map((p) => p.activity))).toEqual(
      new Set(PROBLEM_GROUPS),
    );
    for (const key of KEYS) {
      const book = await read(
        (
          await create({
            components: { ...allOn, [key]: false },
            problemCountPerUnit: 30,
          })
        ).book.draftEditionId!,
      );
      expect(
        KEYS.filter((other) => !present(book, other)),
        `${key} off`,
      ).toEqual([key]);
      // The guide never explains an activity that is not in the book.
      const guide = book.blocks.find(
        (b) => b.semantic?.activity === "learningGuide",
      );
      if (guide?.kind === "text")
        expect(guide.markdown, `${key} off: guide`).not.toContain(
          `**${ACTIVITY_LABELS[key]}**`,
        );
      // The table of contents lists only sections that exist.
      const toc = book.blocks.flatMap((b) =>
        b.semantic?.node?.kind === "references" &&
        b.semantic.activity === "tableOfContents"
          ? b.semantic.node.entries
          : [],
      );
      const sectionKeys = new Set(book.sections.map((s) => s.sectionKey));
      expect(
        toc.every(
          (entry) =>
            entry.targetSectionKey && sectionKeys.has(entry.targetSectionKey),
        ),
        `${key} off: table of contents`,
      ).toBe(true);
    }
  }, 600_000);
});

describe("legacy requests and dependencies", () => {
  it("reads an old 18-key request with the new activities off", () => {
    const legacyKeys = KEYS.slice(0, 18);
    expect(legacyKeys.at(-1)).toBe("errorCheck");
    const legacy = Object.fromEntries(legacyKeys.map((key) => [key, true]));
    const parsed = quickCreateInputSchema.parse(
      body({ components: legacy as QuickCreateComponents }),
    );
    const effective = effectiveQuickCreateComponents(parsed);
    for (const key of KEYS)
      expect(effective[key], key).toBe(legacyKeys.includes(key));
    // Omitted components keep the seven historical defaults.
    const defaults = effectiveQuickCreateComponents(
      quickCreateInputSchema.parse(body({ components: undefined })),
    );
    expect(KEYS.filter((key) => defaults[key])).toEqual([
      "unitIntro",
      "dialogue",
      "concepts",
      "termRecall",
      "clozeRecall",
      "sentenceRecall",
      "practice",
      "cover",
    ]);
  });

  it("keeps includeConcepts=false as the master switch of the concept family", async () => {
    const conceptFamily: Key[] = [
      "dialogue",
      "concepts",
      "termRecall",
      "clozeRecall",
      "sentenceRecall",
      "preparation",
      "errorCheck",
      "dialogueCheck",
      "conceptStudy",
      "conceptBlankTest",
      "basicCheck",
      "explainActivity",
      "conceptMap",
      "conceptIndex",
    ];
    const effective = effectiveQuickCreateComponents({
      includeConcepts: false,
      components: allOn,
    });
    expect(KEYS.filter((key) => !effective[key])).toEqual(
      KEYS.filter((key) => conceptFamily.includes(key)),
    );
    const result = await create({
      includeConcepts: false,
      problemCountPerUnit: 12,
    });
    const book = await read(result.book.draftEditionId!);
    expect(result.conceptCount).toBe(0);
    expect(KEYS.filter((key) => present(book, key))).toEqual(
      KEYS.filter((key) => !conceptFamily.includes(key)),
    );
    // The new adapter states the switch from the explicit selection.
    expect(quickCreateSelectionInput(allOn).includeConcepts).toBe(true);
    expect(
      quickCreateSelectionInput(
        only({ practice: true, written: true, rest: true }),
      ).includeConcepts,
    ).toBe(false);
    for (const key of conceptFamily)
      expect(
        quickCreateSelectionInput(only({ [key]: true })).includeConcepts,
        key,
      ).toBe(true);
  });
});

describe("one maximum shared by the selected problem groups", () => {
  it("fills exactly the requested 7..30 different questions and refuses fewer than the groups", async () => {
    for (const count of [0, 31])
      expect(
        quickCreateInputSchema.safeParse(
          body({
            components: only({ practice: true }),
            problemCountPerUnit: count,
          }),
        ).success,
        `count ${count}`,
      ).toBe(false);
    for (let count = 1; count <= 30; count++) {
      const input = body({
        components: problemsOnly,
        problemCountPerUnit: count,
      });
      if (count < PROBLEM_GROUPS.length) {
        expect(
          quickCreateInputSchema.safeParse(input).success,
          `count ${count}`,
        ).toBe(false);
        continue;
      }
      const result = await createQuickTextbook(
        db,
        await newActor(),
        input,
        deps,
      );
      const { problems } = await read(result.book.draftEditionId!);
      expect(result.problemCount, `count ${count}`).toBe(count);
      expect(problems, `count ${count}`).toHaveLength(count);
      expect(new Set(problems.map((p) => p.content)).size).toBe(count);
      expect(new Set(problems.map((p) => p.problemId)).size).toBe(count);
      // Examples come in whole pairs or not at all.
      const worked = problems.filter((p) => p.activity === "workedExamples");
      expect(worked.length % 2, `count ${count}`).toBe(0);
      expect(worked.filter((p) => p.role === "example")).toHaveLength(
        worked.length / 2,
      );
    }
  }, 600_000);

  it("gives a single group the whole maximum", async () => {
    for (const count of [1, 2, 30]) {
      const result = await create({
        components: only({ practice: true }),
        problemCountPerUnit: count,
      });
      expect(result.problemCount).toBe(count);
      expect(result.warnings).toEqual([]);
    }
  });
});

describe("worked examples are recorded pairs", () => {
  it("prints a solved example with a different unsolved confirmation of the same source family", async () => {
    const result = await create({ problemCountPerUnit: 30 });
    const book = await read(result.book.draftEditionId!);
    const worked = book.problems.filter((p) => p.activity === "workedExamples");
    expect(worked.map((p) => [bankName(p.problemId), p.role, p.stage])).toEqual(
      [
        ["pairA1", "example", "worked-example"],
        ["pairA2", "confirm", "concept-check"],
        ["pairB1", "example", "worked-example"],
        ["pairB2", "confirm", "concept-check"],
      ],
    );
    for (const groupId of new Set(worked.map((p) => p.groupId))) {
      const [example, confirm] = worked.filter((p) => p.groupId === groupId);
      expect(example.familyKey).toMatch(/^elem:/);
      expect([
        confirm.familyKey,
        confirm.problemType,
        confirm.difficulty,
        classifyFormat(confirm),
      ]).toEqual([
        example.familyKey,
        example.problemType,
        example.difficulty,
        classifyFormat(example),
      ]);
      expect(confirm.content).not.toBe(example.content);
      expect(confirm.answer).not.toBe(example.answer);
      expect(example.solution?.trim()).toBeTruthy();
      expect(confirm.solution?.trim()).toBeTruthy();
    }
    // Every trap row was printed as an ordinary question, never inside a group.
    const ordinary = book.problems.filter((p) => !p.groupId);
    for (const trap of [
      "lone",
      "noSolution1",
      "noSolution2",
      "twoDifficulties1",
      "twoDifficulties2",
      "twoTypes1",
      "twoTypes2",
      "otherKey1",
      "otherKey2",
      "solo1",
      "solo2",
    ])
      expect(
        ordinary.some((p) => bankName(p.problemId) === trap),
        trap,
      ).toBe(true);
    // The repeated question is printed once.
    expect(
      book.problems.filter((p) => p.content === sum(120, 340).content),
    ).toHaveLength(1);
    // Five were budgeted, two whole pairs fit: the shortage is said, not padded.
    expect(result.warnings).toContainEqual(
      expect.stringContaining(
        "대표예제와 확인문제 5문항 중 4문항을 넣었습니다. 같은 유형·난이도의 서로 다른 예제와 확인문제가 모두 준비된 짝만 사용합니다.",
      ),
    );
    // Each group opens with its own title block, directly before its example.
    const blocks = book.blocks;
    for (const example of worked.filter((p) => p.role === "example")) {
      const at = blocks.findIndex(
        (b) => b.kind === "problem" && b.itemId === example.itemId,
      );
      const title = blocks[at - 1];
      expect(title.kind).toBe("text");
      expect(title.semantic?.node).toMatchObject({
        kind: "exampleGroup",
        groupId: example.groupId,
        exampleItemId: example.itemId,
        strategy: example.solution,
      });
    }
  });

  it("pairs nothing else even when the whole maximum is free for examples", async () => {
    const result = await create({
      components: only({ workedExamples: true }),
      problemCountPerUnit: 30,
    });
    const book = await read(result.book.draftEditionId!);
    // Lone, solo, repeated, unsolved and mixed families stay unpaired however much room there is.
    expect(book.problems.map((p) => [bankName(p.problemId), p.role])).toEqual([
      ["pairA1", "example"],
      ["pairA2", "confirm"],
      ["pairB1", "example"],
      ["pairB2", "confirm"],
    ]);
    expect(result.warnings).toEqual([
      expect.stringContaining(
        "대표예제와 확인문제 30문항 중 4문항을 넣었습니다.",
      ),
      expect.stringContaining(
        "요청한 최대 30문항 중 출제 가능한 서로 다른 4문항을 넣었습니다.",
      ),
    ]);
  });

  it("accepts only recorded engine families with a solution as pair evidence", () => {
    const row = {
      id: "p",
      unitId: "u",
      familyKey: "elem:add-three-digit",
      problemType: "계산",
      difficulty: "기본",
      questionType: null,
      content: "$1 + 1$ 을 계산하시오.",
      answer: "2",
      solution: "$1 + 1 = 2$ 이다.",
    } as unknown as Parameters<typeof verifiedExamplePairKey>[0];
    expect(verifiedExamplePairKey(row)).not.toBeNull();
    for (const familyKey of [null, "", "solo:1b2c", "manual:x", "elem:"])
      expect(
        verifiedExamplePairKey({ ...row, familyKey }),
        String(familyKey),
      ).toBeNull();
    for (const solution of [null, "", "   "])
      expect(verifiedExamplePairKey({ ...row, solution })).toBeNull();
    const key = verifiedExamplePairKey(row);
    for (const change of [
      { unitId: "other" },
      { problemType: "개념" },
      { difficulty: "응용" },
      { questionType: "서술형" },
      { familyKey: "mid:add-three-digit" },
    ])
      expect(verifiedExamplePairKey({ ...row, ...change })).not.toBe(key);
  });

  it("suppresses the example heading and says so when no recorded pair exists", async () => {
    const result = await create({
      startUnitId: unitId(SPARSE),
      endUnitId: unitId(SPARSE),
      components: only({ workedExamples: true, practice: true }),
      problemCountPerUnit: 6,
    });
    const book = await read(result.book.draftEditionId!);
    expect(present(book, "workedExamples")).toBe(false);
    expect(
      book.blocks.some(
        (b) => b.kind === "text" && b.markdown.includes("대표예제"),
      ),
    ).toBe(false);
    expect(book.problems.map((p) => [p.activity, p.stage, p.role])).toEqual(
      Array.from({ length: 6 }, () => ["practice", "type-practice", undefined]),
    );
    expect(result.warnings).toEqual([
      expect.stringContaining(
        "대표예제와 확인문제 3문항 중 0문항을 넣었습니다.",
      ),
    ]);
  });

  it("rejects and rolls back a request for examples alone when none can be paired", async () => {
    const before = await counts();
    for (const overrides of [
      { startUnitId: unitId(SPARSE), endUnitId: unitId(SPARSE) },
      { startUnitId: unitId(EMPTY), endUnitId: unitId(EMPTY) },
    ])
      await expect(
        create({
          ...overrides,
          components: only({ workedExamples: true }),
          problemCountPerUnit: 4,
        }),
      ).rejects.toMatchObject({ status: 400 });
    // Nothing of a book, a receipt or a frozen question remains.
    expect(await counts()).toEqual(before);
  });
});

describe("stages, eligibility and writing space", () => {
  it("saves practice as type practice, basic check as concept check and reasoning as application", async () => {
    const book = await read(
      (await create({ components: problemsOnly, problemCountPerUnit: 30 })).book
        .draftEditionId!,
    );
    const stages = (activity: string) =>
      new Set(
        book.problems
          .filter((p) => p.activity === activity && p.role !== "confirm")
          .map((p) => p.stage),
      );
    expect(stages("practice")).toEqual(new Set(["type-practice"]));
    expect(stages("basicCheck")).toEqual(new Set(["concept-check"]));
    expect(stages("reasoning")).toEqual(new Set(["application"]));
    expect(stages("review")).toEqual(new Set(["cumulative-review"]));
    expect(stages("assessment")).toEqual(new Set(["unit-assessment"]));
    expect(stages("written")).toEqual(new Set(["written"]));
    expect(stages("workedExamples")).toEqual(new Set(["worked-example"]));
    expect(book.problems.some((p) => p.stage === "basic")).toBe(false);
  });

  it("gives reasoning only recorded word problems or written questions, never a relabelled calculation", async () => {
    const result = await create({
      components: only({ reasoning: true }),
      problemCountPerUnit: 10,
    });
    const book = await read(result.book.draftEditionId!);
    expect(book.problems.map((p) => bankName(p.problemId)).sort()).toEqual([
      "word1",
      "word2",
      "written1",
      "written2",
    ]);
    expect(
      book.problems.every(
        (p) => p.problemType === "활용" || p.questionType === "서술형",
      ),
    ).toBe(true);
    expect(result.warnings).toEqual([
      expect.stringContaining("생각을 설명하기 10문항 중 4문항을 넣었습니다."),
      expect.stringContaining(
        "요청한 최대 10문항 중 출제 가능한 서로 다른 4문항을 넣었습니다.",
      ),
    ]);
    // A section with calculations only has nothing to offer: reasoning stays empty.
    const sparse = await create({
      startUnitId: unitId(SPARSE),
      endUnitId: unitId(SPARSE),
      components: only({ reasoning: true, practice: true }),
      problemCountPerUnit: 4,
    });
    const sparseBook = await read(sparse.book.draftEditionId!);
    expect(sparseBook.problems.map((p) => p.activity)).toEqual(
      Array.from({ length: 4 }, () => "practice"),
    );
    expect(sparseBook.problems.some((p) => p.stage === "application")).toBe(
      false,
    );
    expect(sparse.warnings).toContainEqual(
      expect.stringContaining("생각을 설명하기 2문항 중 0문항을 넣었습니다."),
    );
    await expect(
      create({
        startUnitId: unitId(SPARSE),
        endUnitId: unitId(SPARSE),
        components: only({ reasoning: true }),
        problemCountPerUnit: 4,
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("gives every new question ruled lines for its format and leaves saved layouts alone", async () => {
    const trace: Trace = [];
    const actor = await newActor();
    const result = await createQuickTextbook(
      traced(trace),
      actor,
      body({ components: problemsOnly, problemCountPerUnit: 30 }),
      deps,
    );
    const book = await read(result.book.draftEditionId!);
    for (const problem of book.problems) {
      const { minWorkLines, preferredWorkLines, maxWorkLines } = problem.layout;
      expect(preferredWorkLines, bankName(problem.problemId)).toBeGreaterThan(
        0,
      );
      expect(preferredWorkLines).toBe(
        problem.questionType === "서술형" || problem.stage === "written"
          ? 6
          : problem.stage === "application"
            ? 4
            : problem.questionType === "객관식"
              ? 2
              : 3,
      );
      expect(minWorkLines).toBeLessThanOrEqual(preferredWorkLines);
      expect(maxWorkLines).toBeGreaterThanOrEqual(preferredWorkLines);
    }
    expect(
      quickCreateItemLayout("type-practice", "단답형").preferredWorkLines,
    ).toBe(3);
    expect(
      quickCreateItemLayout("type-practice", "객관식").preferredWorkLines,
    ).toBe(2);
    expect(quickCreateItemLayout("application", null).preferredWorkLines).toBe(
      4,
    );
    expect(quickCreateItemLayout("written", null).preferredWorkLines).toBe(6);
    // A layout saved with zero lines is a decision of that draft. Creating another book
    // issues no update to any saved item and the zero survives.
    const saved = book.problems.find((p) => p.stage === "type-practice")!;
    await pg.query(
      `UPDATE "textbook_item" SET "layout" = jsonb_set("layout", '{preferredWorkLines}', '0') || '{"minWorkLines":0}' WHERE "id" = $1`,
      [saved.itemId],
    );
    const later: Trace = [];
    await createQuickTextbook(
      traced(later),
      actor,
      body({ components: problemsOnly, problemCountPerUnit: 30 }),
      deps,
    );
    expect(
      [...trace, ...later].filter((step) =>
        /UPDATE\s+"textbook_item"/.test(step.sql ?? ""),
      ),
    ).toEqual([]);
    const reread = await read(result.book.draftEditionId!);
    expect(
      reread.problems.find((p) => p.itemId === saved.itemId)!.layout
        .preferredWorkLines,
    ).toBe(0);
    const model = createTextbookRenderModel(reread.exchange, "student");
    const zero = model.sections
      .flatMap((s) => s.blocks)
      .find((b) => b.kind === "problem" && b.itemId === saved.itemId)!;
    const html = parse(renderBlockHtml(zero, resources));
    expect(html.querySelector(".tb-work-lines")).toBeNull();
    expect(html.querySelector(".tb-work-area")?.getAttribute("style")).toBe(
      "min-height:0mm",
    );
  });
});

describe("one native transaction", () => {
  it("captures inside a single transaction, under the unit and source locks, without touching the bank", async () => {
    const before = await pg.query(
      `SELECT "id","updated_at","content","answer","solution","family_key" FROM "problem" ORDER BY "id"`,
    );
    const trace: Trace = [];
    const result = await createQuickTextbook(
      traced(trace),
      await newActor(),
      body({ problemCountPerUnit: 30 }),
      deps,
    );
    expect(trace[0]).toEqual({ op: "begin" });
    expect(trace.at(-1)).toEqual({ op: "commit" });
    expect(trace.filter((step) => step.scope === "db")).toEqual([]);
    expect(trace.filter((step) => step.op === "begin")).toHaveLength(1);
    const statements = trace.flatMap((step) => step.sql ?? []);
    const at = (pattern: RegExp) =>
      statements.findIndex((sql) => pattern.test(sql));
    // The curriculum rows are share-locked before anything is read from them.
    expect(at(/FROM "unit" u[\s\S]*FOR SHARE OF u/)).toBeGreaterThan(-1);
    // The chosen source rows are share-locked before the final eligibility check and the items.
    const lock = at(
      /^SELECT "id" FROM "problem" WHERE "id" IN[\s\S]*FOR SHARE$/,
    );
    expect(lock).toBeGreaterThan(at(/INSERT INTO "textbook_problem_snapshot"/));
    expect(at(/INSERT INTO "textbook_item"/)).toBeGreaterThan(lock);
    // Every printed question is a frozen copy of a bank row that is still as it was.
    const book = await read(result.book.draftEditionId!);
    expect(book.problems).toHaveLength(30);
    for (const problem of book.problems) {
      const source = before.rows.find(
        (row) => (row as { id: string }).id === problem.problemId,
      ) as { content: string; answer: string; solution: string | null };
      expect(source).toBeDefined();
      expect([problem.content, problem.answer, problem.solution]).toEqual([
        source.content,
        source.answer,
        source.solution,
      ]);
    }
    expect(
      await pg.query(
        `SELECT "id","updated_at","content","answer","solution","family_key" FROM "problem" ORDER BY "id"`,
      ),
    ).toMatchObject({ rows: before.rows });
  });

  it("rolls back the receipt and every row when any late write fails", async () => {
    const actor = await newActor();
    const before = await counts();
    for (const failOn of [
      /^UPDATE "textbook_edition" SET "outline"/,
      /^INSERT INTO "textbook_section"/,
      /^INSERT INTO "textbook_concept"/,
      /^INSERT INTO "textbook_item"/,
      /^UPDATE "textbook_request"/,
    ]) {
      const trace: Trace = [];
      const input = body({ problemCountPerUnit: 30 });
      await expect(
        createQuickTextbook(traced(trace, { failOn }), actor, input, deps),
      ).rejects.toThrow("injected write failure");
      expect(trace.at(-1), String(failOn)).toEqual({ op: "rollback" });
      expect(await counts(), String(failOn)).toEqual(before);
      // The same request id is free again.
      expect(
        (await createQuickTextbook(db, actor, input, deps)).problemCount,
      ).toBe(30);
      Object.assign(before, await counts());
    }
  }, 300_000);

  it("replays a finished request without reading the bank and refuses a reused id", async () => {
    const actor = await newActor();
    const input = body({ problemCountPerUnit: 30 });
    const first = await createQuickTextbook(db, actor, input, deps);
    const before = await counts();
    const trace: Trace = [];
    const loadFigure = vi.fn(async () => {
      throw new Error("must not reread");
    });
    const replay = await createQuickTextbook(traced(trace), actor, input, {
      ...deps,
      loadFigure,
      prepareVisuals: async () => {
        throw new Error("must not prepare again");
      },
    });
    expect(replay).toEqual(first);
    expect(loadFigure).not.toHaveBeenCalled();
    expect(await counts()).toEqual(before);
    expect(
      trace
        .flatMap((step) => step.sql ?? [])
        .some((sql) => /FROM "problem"/.test(sql)),
    ).toBe(false);
    await expect(
      createQuickTextbook(
        db,
        actor,
        { ...input, problemCountPerUnit: 29 },
        deps,
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(await counts()).toEqual(before);
  });

  it("refuses the whole book when a chosen source row changes before the lock", async () => {
    const before = await counts();
    const actor = await newActor();
    for (const change of [
      `"direct_use_allowed" = false`,
      `"updated_at" = "updated_at" + interval '1 second'`,
    ]) {
      const trace: Trace = [];
      await expect(
        createQuickTextbook(
          traced(trace, {
            tamper: {
              before:
                /^SELECT "id" FROM "problem" WHERE "id" IN[\s\S]*FOR SHARE$/,
              sql: `UPDATE "problem" SET ${change} WHERE "id" = '${bank.pairA2}'::uuid`,
            },
          }),
          actor,
          body({ problemCountPerUnit: 30 }),
          deps,
        ),
      ).rejects.toMatchObject({ status: 409 });
      expect(trace.at(-1)).toEqual({ op: "rollback" });
    }
    expect(await counts()).toEqual({ ...before });
    // The bank row itself was restored by the rollback.
    const [row] = await db.query<{ allowed: boolean }>(
      `SELECT "direct_use_allowed" AS allowed FROM "problem" WHERE "id" = $1::uuid`,
      [bank.pairA2],
    );
    expect(row.allowed).toBe(true);
  });
});

describe("student pages never carry a confirmation's answer", () => {
  /** Rendered HTML of the question blocks and their group titles only. */
  function problemHtml(book: Book, variant: "student" | "answers") {
    const model = createTextbookRenderModel(book.exchange, variant);
    const blocks = model.sections
      .flatMap((section) => section.blocks)
      .filter(
        (block) =>
          block.kind === "problem" ||
          block.semantic?.node?.kind === "exampleGroup",
      );
    return {
      blocks,
      html: blocks.map((block) => renderBlockHtml(block, resources)).join(""),
    };
  }

  it("shows the example's solution and withholds the confirmation's answer and solution, in the DTO and in the HTML", async () => {
    const book = await read(
      (await create({ problemCountPerUnit: 30 })).book.draftEditionId!,
    );
    const confirms = book.problems.filter((p) => p.role === "confirm");
    const examples = book.problems.filter((p) => p.role === "example");
    expect(confirms.map((p) => p.answer)).toEqual(["788", "553"]);
    const student = problemHtml(book, "student");
    const dto = JSON.stringify(student.blocks);
    const text = parse(student.html).body.textContent ?? "";
    for (const confirm of confirms) {
      const block = student.blocks.find(
        (b) => b.kind === "problem" && b.itemId === confirm.itemId,
      )!;
      // No answer field of any kind reaches the student DTO of a confirmation.
      for (const field of ["answer", "solution", "publicWorkedExample"])
        expect(field in block, `${confirm.answer}: ${field}`).toBe(false);
      // Neither the link metadata nor any other block repeats it.
      expect(dto).not.toContain(confirm.solution!);
      expect(dto).not.toContain(`= ${confirm.answer}`);
      expect(text).not.toContain(confirm.answer);
      const dom = parse(renderBlockHtml(block, resources));
      const section = dom.querySelector(".tb-problem")!;
      expect(section.getAttribute("data-example-role")).toBe("confirm");
      expect(section.querySelector(".tb-confirm-label")?.textContent).toBe(
        "확인문제",
      );
      expect(section.querySelector(".tb-example-label")).toBeNull();
      expect(section.querySelector(".tb-answer,.tb-worked")).toBeNull();
      expect(section.querySelectorAll(".tb-work-line")).toHaveLength(3);
    }
    // The example is public by design: its own solution and answer are printed.
    for (const example of examples) {
      const block = student.blocks.find(
        (b) => b.kind === "problem" && b.itemId === example.itemId,
      )!;
      const dom = parse(renderBlockHtml(block, resources));
      expect(
        dom.querySelector(".tb-problem")?.getAttribute("data-example-role"),
      ).toBe("example");
      expect(dom.querySelector(".tb-worked-answer")?.textContent).toContain(
        example.answer,
      );
    }
    // Ordinary questions carry no answer either.
    for (const block of student.blocks)
      if (
        block.kind === "problem" &&
        !examples.some((p) => p.itemId === block.itemId)
      )
        expect("answer" in block || "publicWorkedExample" in block).toBe(false);
    // The answer variant is independent and complete.
    const answers = parse(problemHtml(book, "answers").html).body.textContent;
    for (const confirm of confirms) expect(answers).toContain(confirm.answer);
  });

  it("prints no hidden keyword or sentence of the memory sheets in the student HTML", async () => {
    const book = await read(
      (
        await create({
          components: only({
            conceptStudy: true,
            clozeRecall: true,
            sentenceRecall: true,
          }),
        })
      ).book.draftEditionId!,
    );
    const model = createTextbookRenderModel(book.exchange, "student");
    const recall = model.sections
      .flatMap((section) => section.blocks)
      .filter((block) => block.kind === "recall");
    let keywords = 0,
      sentences = 0;
    for (const block of recall) {
      const node = block.semantic?.node;
      if (node?.kind !== "rows") throw new Error("memory rows expected");
      const dom = parse(renderBlockHtml(block, resources));
      for (const row of node.rows) {
        const body = Array.from(dom.querySelectorAll("[data-row-key]"))
          .find((el) => el.getAttribute("data-row-key") === row.rowKey)!
          .querySelector(".tb-memory-body")!;
        const keys = Array.from(row.rawText.matchAll(/\{([^{}$]+)\}/g), (m) =>
          m[1].trim(),
        );
        if (block.phase === "sentences") {
          expect(body.textContent, row.rowKey).toBe("");
          sentences++;
        }
        if (block.phase === "keywords") {
          const visible = row.rawText.replace(/\{[^{}]*\}/g, "");
          for (const key of keys)
            if (!visible.includes(key)) {
              expect(body.textContent, `${row.rowKey}: ${key}`).not.toContain(
                key,
              );
              keywords++;
            }
          expect(
            body.querySelectorAll(".tb-blank-keyword").length,
            row.rowKey,
          ).toBeGreaterThanOrEqual(keys.length);
        }
      }
    }
    expect(keywords).toBeGreaterThan(0);
    expect(sentences).toBeGreaterThan(0);
  });
});

/**
 * Faults of the render model at 16dfd927d, outside this file's ownership. Each test states the
 * behaviour the plan requires and is marked `fails`: it turns red the moment the model is
 * fixed, and the mark must then be removed.
 */
describe("known render-model faults (remove `.fails` when fixed)", () => {
  async function lesson(components: QuickCreateComponents) {
    const book = await read(
      (await create({ components, problemCountPerUnit: 8 })).book
        .draftEditionId!,
    );
    const model = createTextbookRenderModel(book.exchange, "student");
    return {
      book,
      blocks: model.sections.find((s) => s.templateKey === "auto-lesson")!
        .blocks,
    };
  }

  it.fails(
    "keeps a confirmation directly after its example, with no stage heading or page break between",
    async () => {
      const { book, blocks } = await lesson(
        only({ workedExamples: true, practice: true }),
      );
      const example = book.problems.find((p) => p.role === "example")!;
      const at = blocks.findIndex(
        (b) => b.kind === "problem" && b.itemId === example.itemId,
      );
      const next = blocks[at + 1];
      expect(next.kind).toBe("problem");
      expect(next.kind === "problem" && next.itemId).toBe(
        book.problems.find((p) => p.role === "confirm")!.itemId,
      );
    },
  );

  it.fails(
    "projects a memory block with source rows as one render block, so each row prints once",
    async () => {
      const { blocks } = await lesson(only({ conceptStudy: true }));
      const html = blocks
        .filter((b) => b.kind === "recall")
        .map((b) => renderBlockHtml(b, resources))
        .join("");
      const keys = Array.from(
        parse(html).querySelectorAll("[data-row-key]"),
        (el) => el.getAttribute("data-row-key"),
      );
      expect(keys.length).toBeGreaterThan(0);
      expect(keys).toHaveLength(new Set(keys).size);
    },
  );

  it.fails(
    "keeps an activity title on the page of the questions it introduces",
    async () => {
      const { blocks } = await lesson(
        only({ practice: true, reasoning: true }),
      );
      const title = blocks.findIndex(
        (b) => b.kind === "text" && b.semantic?.activity === "reasoning",
      );
      expect(title).toBeGreaterThan(-1);
      const next = blocks[title + 1];
      expect(next.kind === "heading" && next.startNewPage).toBe(false);
    },
  );
});
