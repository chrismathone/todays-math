// @vitest-environment node
/**
 * Extraction proof — `render/html.ts`.
 *
 * Every block kind, editorial stage, page archetype and guard of the renderer is driven with
 * synthetic input, and the emitted HTML (plus the order in which resource callbacks were called)
 * is compared with digests frozen from the pre-extraction source.
 */
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { TextbookExchange } from "@/contracts/textbookExchange.contract";
import type { TextbookPage } from "@/lib/textbook/layout/paginate";
import type {
  EditorialBlock,
  EditorialStage,
} from "@/lib/textbook/render/editorial";
import { EDITORIAL_STAGES } from "@/lib/textbook/render/editorial";
import {
  renderBlockHtml,
  renderPageHtml,
  TEXTBOOK_CSS,
  textbookHtmlDocument,
  type RenderResources,
} from "@/lib/textbook/render/html";
import {
  createTextbookRenderModel,
  type RenderBlock,
} from "@/lib/textbook/render/model";
import { textbookFixture } from "@/__tests__/helpers/textbookFixture";

import { errorShape, ProofArtifacts, settleProof } from "./harness";
import { addModelArtifacts, recordingResources } from "./renderModel";

const BASELINE = "143dafcb14585be0132ec75e5885de8c07ee98f8";
const base = {
  id: "block-1",
  sourceBlockId: "block-1",
  unitKey: "U03",
  sectionKey: "s1",
};
const RICH = [
  "## 정의와 조건",
  "",
  "유리수 $\\frac{a}{b}$ 에서 $b \\ne 0$ 이다. **굵게**, *기울임*, `code`, <b>raw</b> & \"quote\" 'single'.",
  "",
  "$$\\frac{1}{3} = 0.\\dot{3}$$",
  "",
  "- 첫째 항목",
  "- 둘째 항목 $x^2$",
  "",
  "1. 순서 하나",
  "2. 순서 둘",
  "",
  "| 수 | 분류 |",
  "|---|---|",
  "| $\\frac{1}{2}$ | 유한소수 |",
  "",
  "> 인용한 문장",
  "",
  "```",
  "a < b && c",
  "```",
].join("\n");

function blockCases(): Array<[string, EditorialBlock]> {
  const cases: Array<[string, EditorialBlock]> = [];
  const add = (name: string, block: EditorialBlock) =>
    cases.push([name, block]);

  // ── front: unit intro and headings ──────────────────────────────────────
  add("unit-intro/full", {
    ...base,
    kind: "unit-intro",
    title: '순환소수와 <분수> & "식"',
    unitNumber: 5,
    goals: ["목표 $x$ 를 설명한다.", "둘째 **목표**"],
    prerequisites: ["준비 개념 <1>", "준비 $\\frac{1}{2}$"],
  });
  add("unit-intro/no-prerequisites-key-number", {
    ...base,
    unitKey: "unit-07-extra",
    kind: "unit-intro",
    title: "일차부등식",
    goals: ["목표 하나"],
    prerequisites: [],
  });
  add("unit-intro/no-goals-unnumbered-key", {
    ...base,
    unitKey: "front-matter",
    kind: "unit-intro",
    title: "안내",
    unitNumber: 0,
    goals: [],
    prerequisites: [],
  });
  for (const stage of Object.keys(EDITORIAL_STAGES) as EditorialStage[]) {
    add(`heading/${stage}-default`, {
      ...base,
      kind: "heading",
      title: `제목 <${stage}> & "따옴표"`,
      editorialStage: stage,
    });
    add(`heading/${stage}-authored`, {
      ...base,
      kind: "heading",
      title: "정의와 조건",
      subtitle: "직접 <설명>해 봅시다.",
      stageNumber: "7",
      unitNumber: 9,
      editorialStage: stage,
    });
    add(`heading/${stage}-blank-number`, {
      ...base,
      kind: "heading",
      title: "번호 없는 제목",
      subtitle: "",
      stageNumber: "",
      editorialStage: stage,
    });
  }
  add("heading/implicit-stage", {
    ...base,
    kind: "heading",
    title: "단계 없는 제목",
  });
  add("heading/numeric-stage-number", {
    ...base,
    kind: "heading",
    title: "숫자 번호",
    stageNumber: 3 as unknown as string,
    editorialStage: "basic",
  });
  add("heading/whitespace-stage-number", {
    ...base,
    kind: "heading",
    title: "공백 번호",
    stageNumber: " ",
    editorialStage: "practice",
  });

  // ── generic prose and figures ───────────────────────────────────────────
  add("text/rich", { ...base, kind: "text", markdown: RICH });
  add("text/empty", { ...base, kind: "text", markdown: "" });
  add("image/caption", {
    ...base,
    kind: "image",
    assetId: 'asset-<1>&"x"',
    caption: '그림 <1> & "설명"',
  });
  add("image/no-caption", {
    ...base,
    kind: "image",
    assetId: "asset-2",
    caption: null,
  });

  // ── dialogue ────────────────────────────────────────────────────────────
  const turn = {
    ...base,
    kind: "dialogue" as const,
    portraitAssetId: "portrait-1",
    markdown: "왜 $\\frac{1}{3}$ 은 **순환소수**일까요? <b>raw</b>",
  };
  for (const speaker of [
    "teacher-f1",
    "teacher-m3",
    "student-f5",
    "student-m4",
  ])
    for (const expression of [
      "neutral",
      "question",
      "thinking",
      "aha",
      "surprised",
      "toString",
    ])
      for (const side of ["left", "right"] as const)
        for (const mirrorPortrait of [false, true])
          add(
            `dialogue/atlas-${speaker}-${expression}-${side}${mirrorPortrait ? "-mirrored" : ""}`,
            {
              ...turn,
              speakerId: `tb-portrait-${speaker}`,
              expression,
              side,
              mirrorPortrait,
            },
          );
  for (const side of ["left", "right"] as const)
    for (const mirrorPortrait of [false, true]) {
      add(`dialogue/legacy-${side}${mirrorPortrait ? "-mirrored" : ""}`, {
        ...turn,
        speakerId: '선생님 <A> & "B"',
        expression: 'a"b<c>',
        side,
        mirrorPortrait,
      });
      add(
        `dialogue/unknown-portrait-${side}${mirrorPortrait ? "-mirrored" : ""}`,
        {
          ...turn,
          speakerId: "tb-portrait-teacher-x9",
          expression: "neutral",
          side,
          mirrorPortrait,
        },
      );
    }

  // ── concept ─────────────────────────────────────────────────────────────
  const body = {
    goal: "목표 $x$ 를 설명한다.",
    prerequisites: ["준비 <1>", "준비 $y$"],
    definition: RICH,
    conditions: "조건: $b \\ne 0$",
    examples: ["예 $\\frac{1}{2}$ → 0.5", "예 <둘>"],
    counterexamples: ["반례 $\\pi$"],
    misconceptions: ["주의 & 확인"],
    explainPrompt: "배운 개념을 자신의 말로 설명해 보세요.",
  };
  const emptyBody = {
    goal: "",
    prerequisites: [],
    definition: "",
    conditions: null,
    examples: [],
    counterexamples: [],
    misconceptions: [],
    explainPrompt: null,
  };
  for (const conceptKey of [
    "C03",
    "c7",
    "concept-12",
    "concept_4",
    "CONCEPT123",
    "abc-5",
    "x_9",
    "plain",
    "concept-0c41d2e8-0000-4000-8000-000000000a1f",
    "concept-ffffffff-0000-4000-8000-00000000beef",
    "concept-5eed0000-0000-4000-8000-000000000042",
  ]) {
    add(`concept/key-${conceptKey}`, {
      ...base,
      kind: "concept",
      conceptKey,
      title: "유리수와 <순환소수>",
      body,
      continuation: false,
      qr: null,
    });
  }
  add("concept/qr", {
    ...base,
    kind: "concept",
    conceptKey: "C01",
    title: "유리수",
    body,
    qr: { id: "qr-<c>", url: "https://school.example.test/c/slug?a=1&b=2" },
  });
  add("concept/continuation", {
    ...base,
    kind: "concept",
    conceptKey: "C02",
    title: "유리수",
    body: { ...emptyBody, examples: ["이어지는 예"] },
    continuation: true,
    qr: { id: "qr-2", url: "https://school.example.test/c/2" },
  });
  add("concept/empty-body", {
    ...base,
    kind: "concept",
    conceptKey: "C09",
    title: "빈 개념",
    body: emptyBody,
    qr: null,
  });
  add("concept/empty-strings", {
    ...base,
    kind: "concept",
    conceptKey: "C10",
    title: "",
    body: { ...emptyBody, conditions: "", explainPrompt: "" },
    continuation: false,
    qr: null,
  });

  // ── recall ──────────────────────────────────────────────────────────────
  for (const phase of ["study", "keywords", "sentences"] as const)
    for (const continuation of [undefined, false, true])
      for (const lastPart of [undefined, true, false])
        for (const repetitionChecks of [false, true])
          add(
            `recall/${phase}-c${String(continuation)}-l${String(lastPart)}-r${String(repetitionChecks)}`,
            {
              ...base,
              kind: "recall",
              phase,
              continuation,
              lastPart,
              repetitionChecks,
              pieces: [
                { kind: "text", markdown: "합이 " },
                { kind: "blank", scope: "keyword" },
                { kind: "text", markdown: " 이면 **올린다**. $x<1$" },
                { kind: "text", markdown: "\n앞뒤 공백\n" },
                { kind: "text", markdown: "공백 없음" },
                { kind: "blank", scope: "sentence" },
                { kind: "text", markdown: "" },
              ],
            },
          );
  add("recall/empty", {
    ...base,
    kind: "recall",
    phase: "keywords",
    pieces: [],
    repetitionChecks: false,
  });

  // ── problem ─────────────────────────────────────────────────────────────
  const layout = {
    columnSpan: 1 as const,
    minWorkLines: 4,
    preferredWorkLines: 6,
    maxWorkLines: 10,
    keepTogether: true,
  };
  const problem = {
    ...base,
    kind: "problem" as const,
    itemId: "item-1",
    displayNumber: "007",
    content: '두 수 $12$와 $18$의 공약수를 구하시오. <b>raw</b> & "q"',
    figures: [],
    questionType: "단답형",
    learningStage: "basic" as const,
    layout,
    qr: null,
    sourcePageLabel: null,
  };
  const qr = {
    id: "qr-<1>",
    url: "https://school.example.test/q/slug?a=1&b=2",
  };
  const figure = (
    assetId: string,
    choiceIndex: number | null,
    sourceWidthMm: number | null,
    altText: string | null,
  ) => ({ assetId, choiceIndex, sourceWidthMm, altText }) as never;
  const choices =
    "알맞은 그림을 고르시오.\n\n① [그림]\n② [그림]\n③ [그림]\n④ [그림]\n⑤ [그림]";
  add("problem/student-lines", problem);
  add("problem/student-lines-qr", { ...problem, qr });
  add("problem/student-no-lines", {
    ...problem,
    layout: { ...layout, preferredWorkLines: 0 },
  });
  add("problem/student-no-lines-qr", {
    ...problem,
    layout: { ...layout, preferredWorkLines: 0 },
    qr,
  });
  add("problem/student-short-lines-qr", {
    ...problem,
    layout: { ...layout, preferredWorkLines: 2 },
    qr,
  });
  add("problem/wide-no-type", {
    ...problem,
    layout: { ...layout, columnSpan: 2 },
    questionType: null,
    displayNumber: '<1>&"2"',
  });
  add("problem/empty-type", { ...problem, questionType: "" });
  add("problem/figures-linked", {
    ...problem,
    content: choices,
    figures: [
      figure("fig-0", 0, 35.5, "발문 <그림>"),
      figure("fig-1", 1, null, null),
      figure("fig-2", 2, 20, "보기 2"),
      figure("fig-3", 3, null, "보기 3"),
      figure("fig-4", 4, 12.25, null),
      figure("fig-5", 5, null, null),
    ],
  });
  add("problem/figures-unlinked-notice", {
    ...problem,
    content: choices,
    figures: [
      figure("fig-a", null, null, null),
      figure("fig-b", null, 40, "설명"),
    ],
  });
  add("problem/figures-no-choices", {
    ...problem,
    figures: [
      figure("fig-c", null, 30, null),
      figure("fig-d", 0, null, "발문"),
    ],
  });
  add("problem/figure-choices-without-figures", {
    ...problem,
    content: choices,
  });
  add("problem/answers-full", {
    ...problem,
    answer: "$6$ <답>",
    solution: "풀이 **과정** $12 = 2^2 \\times 3$",
    sourcePageLabel: "12",
    qr,
  });
  add("problem/answers-null-solution", {
    ...problem,
    answer: "3",
    solution: null,
  });
  add("problem/answers-undefined-solution", { ...problem, answer: "3" });
  add("problem/answers-empty-strings", {
    ...problem,
    answer: "",
    solution: "",
    sourcePageLabel: "",
  });
  add("problem/answers-page-label-escaped", {
    ...problem,
    answer: "3",
    solution: "풀이",
    sourcePageLabel: "<12>&",
  });
  add("problem/worked-public", {
    ...problem,
    learningStage: "worked-example",
    publicWorkedExample: { answer: "$6$", solution: "공개 **풀이**" },
    qr,
  });
  add("problem/worked-public-no-solution", {
    ...problem,
    learningStage: "worked-example",
    publicWorkedExample: { answer: "6", solution: null },
  });
  add("problem/worked-public-empty-solution", {
    ...problem,
    learningStage: "worked-example",
    publicWorkedExample: { answer: "6", solution: "" },
  });
  add("problem/worked-public-other-stage", {
    ...problem,
    learningStage: "basic",
    publicWorkedExample: { answer: "6", solution: "풀이" },
  });
  add("problem/worked-answers", {
    ...problem,
    learningStage: "worked-example",
    answer: "6",
    solution: "풀이",
  });
  add("problem/worked-stage-only", {
    ...problem,
    learningStage: "worked-example",
  });
  add("problem/worked-wide", {
    ...problem,
    learningStage: "worked-example",
    layout: { ...layout, columnSpan: 2 },
    publicWorkedExample: { answer: "6", solution: "풀이" },
  });
  for (const learningStage of [
    "preparation",
    "concept-check",
    "type-practice",
    "application",
    "error-check",
    "written",
    "cumulative-review",
    "unit-assessment",
  ] as const)
    add(`problem/stage-${learningStage}`, { ...problem, learningStage });
  add("problem/no-learning-stage", { ...problem, learningStage: undefined });
  return cases;
}

/** A hand-built manuscript covering every template, block kind and item stage the model projects. */
function richExchange(): TextbookExchange {
  const exchange = textbookFixture(1, 8);
  const [practice] = exchange.units[0].sections;
  const stages = [
    "worked-example",
    "type-practice",
    "basic",
    "written",
    "cumulative-review",
    "unit-assessment",
    "error-check",
    "concept-check",
  ] as const;
  exchange.items.forEach((item, index) => {
    item.learningStage = stages[index];
    if (index % 2) item.layout = { ...item.layout, columnSpan: 2 };
    if (index === 3) item.qrTargetId = null;
  });
  exchange.snapshots[1].payload.figures = [
    {
      assetId: "figure-asset-1",
      choiceIndex: null,
      sourceWidthMm: 35,
      altText: "합성 그림",
    },
  ] as never;
  exchange.pageMap = exchange.items.map((item, index) => ({
    itemId: item.itemId,
    physicalPageIndex: 2 + index,
    printedPageLabel: String(2 + index),
    column: 1,
  }));
  const concept = (conceptKey: string, title: string, long: boolean) => ({
    conceptKey,
    unitKey: "u-lesson",
    sectionKey: "lesson",
    title,
    kind: "definition",
    unitId: null,
    mappingVersion: "quick-create.unit-triple.v1",
    body: {
      goal: `${title}의 뜻과 적용 방법을 설명할 수 있습니다.`,
      prerequisites: long ? ["하나", "둘", "셋", "넷", "다섯"] : [],
      definition: long
        ? Array.from(
            { length: 6 },
            (_, i) => `**용어 ${i + 1}**: 뜻 $x_${i}$ 를 설명한 문장입니다.`,
          ).join("\n\n")
        : `**${title}**: 분수로 나타낼 수 있는 수`,
      conditions: long ? "분모는 $0$ 이 아니다." : null,
      examples: ["$\\frac{1}{2}$ → 0.5"],
      counterexamples: long ? ["$\\pi$"] : [],
      misconceptions: long ? ["0 은 유리수가 아니다 (틀림)"] : [],
      explainPrompt: "배운 개념을 자신의 말로 설명해 보세요.",
    },
  });
  exchange.conceptIntegration = {
    concepts: [
      concept("concept-0c41d2e8-0000-4000-8000-000000000a1f", "유리수", false),
      concept("C02", "순환소수", true),
    ],
  } as never;
  exchange.conceptQrTargets = [
    {
      qrTargetId: "concept-qr-1",
      conceptKey: "C02",
      url: "https://school.example.test/c/synthetic_concept_00000001",
    },
  ] as never;
  const text = (blockId: string, markdown: string) => ({
    blockId,
    kind: "text" as const,
    markdown,
  });
  const recall = (
    blockId: string,
    phase: "study" | "keywords" | "sentences",
    markdown: string,
    showRepetitionChecks: boolean,
  ) => ({
    blockId,
    kind: "concept-recall" as const,
    phase,
    markdown,
    showRepetitionChecks,
    conceptKey: "C02",
  });
  const dialogue = {
    blockId: "dialogue-1",
    kind: "dialogue" as const,
    turns: [
      {
        speakerId: "tb-portrait-teacher-f1",
        side: "left" as const,
        expression: "question",
        portraitAssetId: "portrait-teacher",
        mirrorPortrait: false,
        markdown: "오늘은 **유리수**를 알아봅시다.",
      },
      {
        speakerId: "tb-portrait-student-m1",
        side: "right" as const,
        expression: "aha",
        portraitAssetId: "portrait-student",
        mirrorPortrait: true,
        markdown: "분수 $\\frac{a}{b}$ 로 쓸 수 있는 수예요!",
      },
      {
        speakerId: "옛 화자",
        side: "left" as const,
        expression: "neutral",
        portraitAssetId: "portrait-legacy",
        mirrorPortrait: false,
        markdown: "가져온 원고의 대사입니다.",
      },
    ],
  };
  const lessonBlocks = [
    dialogue,
    text("prep", "### 준비 학습\n\n오늘의 목표를 적어 보세요.\n\n- **유리수**"),
    text("error-title", "### 오류 점검 · 문장의 옳고 그름을 판단하세요."),
    recall(
      "error",
      "sentences",
      "1. 0 은 유리수이다.\n\n{{옳음: 분수로 쓸 수 있다}}",
      false,
    ),
    {
      blockId: "concept-short",
      kind: "concept" as const,
      conceptKey: "concept-0c41d2e8-0000-4000-8000-000000000a1f",
    },
    { blockId: "concept-long", kind: "concept" as const, conceptKey: "C02" },
    text("term-title", "### 용어 백지"),
    recall(
      "term",
      "keywords",
      "[[유리수]]: 분수로 나타낼 수 있는 수\n\n[[순환소수]]: 같은 숫자가 되풀이되는 소수",
      false,
    ),
    text("cloze-title", "### 핵심어 빈칸"),
    recall(
      "cloze",
      "keywords",
      "**유리수**: [[분수]]로 나타낼 수 있는 수",
      false,
    ),
    text("sentence-title", "### 문장 백지"),
    recall(
      "sentence",
      "sentences",
      "**유리수**\n\n{{분수로 나타낼 수 있는 수}}",
      false,
    ),
    recall(
      "study",
      "study",
      "유리수는 [[분수]]로 나타낼 수 있다.\n\n{{분모는 0 이 아니다.}}",
      true,
    ),
    text("worked-title", "### 대표예제로 익히기"),
    { blockId: "p0", kind: "problem" as const, itemId: "item-0" },
    text("practice-title", "### 유형 연습"),
    { blockId: "p1", kind: "problem" as const, itemId: "item-1" },
    { blockId: "p2", kind: "problem" as const, itemId: "item-2" },
    text("review-title", "### 누적 복습"),
    { blockId: "p4", kind: "problem" as const, itemId: "item-4" },
    text("assessment-title", "### 단원 평가"),
    { blockId: "p5", kind: "problem" as const, itemId: "item-5" },
    text("written-title", "### 서술형"),
    { blockId: "p3", kind: "problem" as const, itemId: "item-3" },
  ];
  for (const index of [0, 1, 2, 3, 4, 5])
    exchange.items[index].sectionKey = "lesson";
  for (const index of [0, 1, 2, 3, 4, 5])
    exchange.items[index].unitKey = "u-lesson";
  practice.startPolicy = "continue";
  practice.blocks = practice.blocks.filter(
    (block) =>
      block.kind !== "problem" || ["item-6", "item-7"].includes(block.itemId),
  );
  const section = (
    sectionKey: string,
    title: string,
    templateKey: string,
    blocks: unknown[],
    startPolicy: "even-left" | "continue" = "continue",
  ) => ({ sectionKey, title, templateKey, startPolicy, blocks }) as never;
  const unit = (
    unitKey: string,
    title: string,
    sections: TextbookExchange["units"][number]["sections"],
  ) => ({
    unitKey,
    title,
    sourceUnitIds: [],
    prerequisites: ["분수와 소수"],
    goals: ["유리수와 순환소수", "순환소수의 분수 표현"],
    conceptLectureRefs: [],
    sections,
  });
  exchange.units = [
    unit("front-matter", "교재 사용 안내", [
      section("guide", "학습 안내", "learning-guide", [
        text(
          "guide-text",
          "### 나의 학습 순서\n\n1. 하나\n2. 둘\n3. 셋\n4. 넷\n5. 다섯",
        ),
      ]),
      section("plan", "학습 계획", "learning-plan", [
        text("plan-text", "| 차례 | 소단원 |\n|---|---|\n| 1 | 유리수 |"),
      ]),
      section("log", "질문 기록", "question-log", [
        text("log-text", "### 질문"),
      ]),
      section("plain-guide", "안내", "guide", [
        text("plain-guide-text", "안내"),
      ]),
    ]),
    unit("u-lesson", "1. 수와 식", [
      section("auto-intro", "단원 소개", "auto-unit-intro", [
        text(
          "intro-text",
          "### 1. 수와 식의 학습 목표와 순서\n\n1. 유리수\n\n학습 전에 적어 보세요.",
        ),
      ]),
      section("lesson", "유리수와 순환소수", "auto-lesson", lessonBlocks),
      section("legacy-lesson", "옛 자동 구획", "basic", [
        {
          blockId: "legacy-concept",
          kind: "concept" as const,
          conceptKey: "concept-0c41d2e8-0000-4000-8000-000000000a1f",
        },
      ]),
      section("recall-template", "개념 정리", "concept-recall", [
        recall("recall-template-block", "keywords", "[[유리수]]", false),
      ]),
      section("rest", "쉬어가기 · 수학 이야기", "rest", [
        {
          blockId: "rest-image",
          kind: "image" as const,
          assetId: "rest-asset",
          caption: "수학 이야기",
        },
        text("rest-text", "같은 크기의 사과 여섯 개를 세 사람이 나눕니다."),
        text(
          "rest-questions",
          "### 함께 생각해요\n\n- 한 사람은 몇 개를 받을까요?",
        ),
      ]),
    ]),
    {
      ...exchange.units[0],
      // Parity is the paginator's concern; here every section must reach placement.
      sections: [
        practice,
        section("types", "유형", "types", [text("types-text", "유형 안내")]),
        section("application", "적용", "application", [
          text("application-text", "적용 안내"),
        ]),
        section("review", "복습", "review", [text("review-text", "복습 안내")]),
        section("basic", "기본", "basic", [text("basic-text", "기본 안내")]),
        section("unknown", "기타", "custom-template", [
          {
            blockId: "plain-image",
            kind: "image" as const,
            assetId: "plain-asset",
            caption: null,
          },
        ]),
      ],
    },
  ];
  return exchange;
}

function coverPage(physicalPageIndex = 1): TextbookPage {
  return {
    physicalPageIndex,
    printedPageLabel: String(physicalPageIndex),
    unitKey: "",
    sectionKey: "",
    unitTitle: "",
    sectionTitle: "",
    kind: "cover",
    blocks: [],
  };
}

describe("textbook renderer extraction proof", () => {
  it("emits byte-identical HTML for every frozen render fixture", () => {
    const artifacts = new ProofArtifacts();
    artifacts.add("css/TEXTBOOK_CSS.css", TEXTBOOK_CSS);
    artifacts.add(
      "document/ok.html",
      textbookHtmlDocument(
        '제목 <1> & "2"',
        "<main>본문</main>",
        "@font-face{font-family:TextbookPretendard}",
        ".katex{font:normal}",
      ),
    );
    for (const [name, fontCss, katexCss] of [
      ["font", "a</style><script>", ""],
      ["katex", "", "b</STYLE >"],
    ])
      try {
        textbookHtmlDocument("t", "b", fontCss, katexCss);
        artifacts.add(`document/unsafe-${name}.json`, "no error\n");
      } catch (error) {
        artifacts.addJson(`document/unsafe-${name}.json`, errorShape(error));
      }

    // Every block, with and without the bundled editorial resolver.
    for (const [name, block] of blockCases())
      for (const editorial of [true, false]) {
        const { calls, resources } = recordingResources(editorial);
        const key = `blocks/${name}${editorial ? "" : ".fallback"}`;
        try {
          artifacts.add(`${key}.html`, renderBlockHtml(block, resources));
        } catch (error) {
          artifacts.addJson(`${key}.error.json`, errorShape(error));
        }
        artifacts.addJson(`${key}.calls.json`, calls);
      }

    // URL guard: every resolver and every rejected scheme, at the block that consumes it.
    const guarded: Array<[string, EditorialBlock]> = blockCases().filter(
      ([name]) =>
        [
          "heading/unit-default",
          "heading/rest-default",
          "unit-intro/full",
          "image/caption",
          "dialogue/atlas-teacher-f1-neutral-left",
          "dialogue/legacy-left",
          "concept/qr",
          "problem/figures-linked",
          "problem/student-lines-qr",
        ].includes(name),
    );
    for (const [urlName, url] of [
      ["external", "https://untrusted.example/image.png"],
      ["script", "javascript:alert(1)"],
      ["protocol-relative", "//evil.example/x.png"],
      ["svg-text", "data:image/svg+xml;utf8,<svg/>"],
      ["relative", "assets/x.png"],
      ["data-png", "data:image/png;base64,AA=="],
      ["data-svg", "data:image/svg+xml;base64,AA=="],
      ["textbook-invalid", 'https://textbook.invalid/a"b<c>&d'],
      ["root-relative", '/a"b<c>&d'],
    ] as const)
      for (const target of [
        "assetUrl",
        "qrDataUrl",
        "editorialAssetUrl",
      ] as const)
        for (const [name, block] of guarded) {
          const { resources } = recordingResources();
          const poisoned: RenderResources = {
            ...resources,
            [target]: () => url,
          };
          const key = `guards/${urlName}/${target}/${name}`;
          try {
            artifacts.add(`${key}.html`, renderBlockHtml(block, poisoned));
          } catch (error) {
            artifacts.addJson(`${key}.error.json`, errorShape(error));
          }
        }

    // Covers: title and code size thresholds, school levels, both variants.
    for (const variant of ["student", "answers"] as const)
      for (const [name, title, displayCode, schoolLevel] of [
        ["short", "수와 식", "2-1-1", "middle"],
        ["seven", "일곱글자제목임", "초3-1", "elementary"],
        ["eight", "여덟글자의제목임", "123456789012", "high"],
        ["eighteen", "가".repeat(18), "1234567890123", "middle"],
        ["nineteen", "가".repeat(19), "2-1-1", "middle"],
        ["forty", "나".repeat(40), "2-1-1", "middle"],
        ["forty-one", "다".repeat(41), "2-1-1", "middle"],
        ["escaped", '수와 식 <검증> & "확인"', '<2>&"1"', "middle"],
      ] as const) {
        const model = createTextbookRenderModel(textbookFixture(), variant);
        model.title = title;
        model.config = { ...model.config, displayCode, schoolLevel };
        for (const editorial of [true, false]) {
          const { calls, resources } = recordingResources(editorial);
          const key = `covers/${variant}-${name}${editorial ? "" : ".fallback"}`;
          artifacts.add(
            `${key}.html`,
            renderPageHtml(coverPage(), model, resources),
          );
          artifacts.addJson(`${key}.calls.json`, calls);
        }
      }

    // Whole manuscripts through measurement and placement.
    addModelArtifacts(artifacts, "models/fixture-1x4", textbookFixture());
    addModelArtifacts(artifacts, "models/fixture-3x5", textbookFixture(3, 5));
    // Parity failures are the paginator's; the measurement HTML is still frozen for them.
    addModelArtifacts(artifacts, "models/fixture-2x0", textbookFixture(2, 0));
    const separate = textbookFixture(2, 2);
    separate.config.print.coverMode = "separate";
    separate.config.print.firstPhysicalPageIndex = 2;
    separate.units[0].sections[1].startPolicy = "continue";
    separate.config.print.innerMarginMm = 22;
    separate.config.print.outerMarginMm = 11;
    addModelArtifacts(artifacts, "models/fixture-separate-cover", separate);
    addModelArtifacts(artifacts, "models/rich", richExchange());
    // An authored unit spread: generated unit-intro block on the even page, manuscript opposite.
    const spread = textbookFixture(1, 2);
    spread.units[0].sections.unshift({
      sectionKey: "authored-intro",
      title: "단원 도입",
      templateKey: "unit-intro",
      startPolicy: "even-left",
      blocks: [
        { blockId: "intro-prose", kind: "text", markdown: "단원을 여는 글" },
      ],
    });
    spread.units[0].sections[1].startPolicy = "continue";
    addModelArtifacts(artifacts, "models/unit-intro-spread", spread);

    // Hand-placed pages: parity, an empty page, an unknown section and a missing block.
    const model = createTextbookRenderModel(richExchange(), "student");
    const lesson = model.sections.find((s) => s.sectionKey === "lesson")!;
    const page = (
      physicalPageIndex: number,
      sectionKey: string,
      blockIds: string[],
      itemId?: string,
    ): TextbookPage => ({
      physicalPageIndex,
      printedPageLabel: `p<${physicalPageIndex}>`,
      unitKey: lesson.unitKey,
      sectionKey,
      unitTitle: '단원 <제목> & "확인"',
      sectionTitle: lesson.title,
      kind: "content",
      blocks: blockIds.map((blockId, index) => ({
        blockId,
        ...(itemId ? { itemId } : {}),
        column: 1,
        xMm: 18.5 + index,
        yMm: 40.25 + index * 10,
        widthMm: 86.75,
        heightMm: 30.5,
      })),
    });
    const lessonIds = lesson.blocks.map((block) => block.id);
    for (const [name, placed] of [
      ["even", page(2, "lesson", lessonIds.slice(0, 4))],
      ["odd", page(3, "lesson", lessonIds.slice(4, 9))],
      ["item-id", page(4, "lesson", ["p0"], "item-<0>")],
      ["empty", page(5, "lesson", [])],
      ["unknown-section", page(6, "no-such-section", lessonIds.slice(0, 1))],
      ["missing-block", page(7, "lesson", ["no-such-block"])],
    ] as const) {
      const { calls, resources } = recordingResources();
      try {
        artifacts.add(
          `pages/${name}.html`,
          renderPageHtml(placed, model, resources),
        );
      } catch (error) {
        artifacts.addJson(`pages/${name}.error.json`, errorShape(error));
      }
      artifacts.addJson(`pages/${name}.calls.json`, calls);
    }
    const answers = createTextbookRenderModel(richExchange(), "answers");
    artifacts.add(
      "pages/answers-even.html",
      renderPageHtml(
        page(2, "lesson", lessonIds.slice(0, 4)),
        answers,
        recordingResources().resources,
      ),
    );

    // The same RenderBlock object must not be mutated by rendering.
    const frozen: RenderBlock = Object.freeze({
      ...base,
      kind: "text",
      markdown: "변하지 않는 원고",
    }) as RenderBlock;
    artifacts.add(
      "blocks/frozen-input.html",
      renderBlockHtml(frozen, recordingResources().resources),
    );

    const difference = settleProof("render", artifacts, BASELINE);
    expect(difference).toEqual({ missing: [], unexpected: [], changed: [] });
    expect(artifacts.entries.size).toBeGreaterThan(900);
  });
});
