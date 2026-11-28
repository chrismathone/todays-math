import { describe, expect, it } from "vitest";
import {
  textbookBlockSchema,
  textbookSectionSchema,
  type ManuscriptBlock,
} from "@/contracts/textbookExchange.contract";
import {
  TEXTBOOK_ACTIVITIES,
  type TextbookSemantic,
} from "@/contracts/textbookSemantic.contract";
import {
  DEFAULT_QUICK_CREATE_COMPONENTS,
  effectiveQuickCreateComponents,
  quickCreateSelectionInput,
} from "@/contracts/textbookQuickCreate.contract";
import { createTextbookApi } from "@/lib/textbook/client";
import { canonicalJson } from "@/lib/textbook/canonical";
import {
  conceptMemoryRows,
  memoryRowMarkdown,
} from "@/lib/textbook/conceptRows";
import { bank as e3Bank } from "@/lib/concept-blank/bank/e3";
import {
  coreConceptsForSection,
  getTextbookCoreGradeBank,
} from "@/lib/textbook/coreConceptBank";

const id = "00000000-0000-4000-8000-000000000001";
const semantic: TextbookSemantic = {
  activity: "conceptStudy",
  source: { unit: "U01", page: 18, kind: "fullmaster", path: "pages[17].rows" },
  sourceFooter: [
    {
      tag: "div",
      attributes: { className: "study-footer" },
      children: [
        { tag: "span", rawText: "합성 학습 확인 안내" },
        { tag: "span", rawText: "확인 날짜: ______" },
      ],
    },
  ],
  sourceQuestionHeader: [
    { tag: "strong", attributes: { className: "qid" }, rawText: "007" },
    { tag: "span", attributes: { className: "tag" }, rawText: "합성 확인" },
  ],
  node: {
    kind: "rows",
    groupKey: "U01.C01",
    rows: [
      {
        rowKey: "U01.C01.r1",
        label: "뜻",
        rawText: "유리수는 [[\\frac{a}{b}]] 꼴이다.",
      },
    ],
  },
};
function blocks(): ManuscriptBlock[] {
  return [
    { blockId: "text", kind: "text", markdown: "개념", semantic },
    { blockId: "problem", kind: "problem", itemId: "item", semantic },
    {
      blockId: "image",
      kind: "image",
      assetId: "asset",
      caption: null,
      semantic,
    },
    { blockId: "concept", kind: "concept", conceptKey: "concept", semantic },
    {
      blockId: "recall",
      kind: "concept-recall",
      phase: "study",
      markdown: "개념",
      showRepetitionChecks: true,
      semantic,
    },
    {
      blockId: "dialogue",
      kind: "dialogue",
      semantic: { activity: "dialogue" },
      turns: [
        {
          speakerId: "speaker.teacher",
          side: "left",
          expression: "neutral",
          portraitAssetId: "portrait",
          mirrorPortrait: false,
          markdown: "$\\frac{1}{3}$",
          presentation: {
            kind: "board",
            lessonKey: "v15:U01:1",
            lessonTitle: "유리수와 소수",
          },
        },
      ],
    },
  ];
}
const coreConcepts = ["초3", "초4", "초5", "초6", "중1", "중2", "중3"].flatMap(
  (grade) => getTextbookCoreGradeBank(grade).concepts,
);

describe("textbook semantic compatibility", () => {
  it("matches every supported section to its prepared script and excludes supplemental cards", () => {
    expect(coreConcepts).toHaveLength(1657);
    const sections = new Set(coreConcepts.map((entry) => entry.section));
    expect(sections.size).toBe(360);
    for (const sectionKey of sections)
      expect(coreConceptsForSection(sectionKey).length).toBeGreaterThan(0);
    expect(coreConcepts.some((entry) => entry.id.includes("plus"))).toBe(false);
  });
  it("uses the same source rows in three phases and preserves TeX braces inside keyword blanks", () => {
    const rows = conceptMemoryRows(e3Bank.concepts.slice(0, 3));
    expect(rows.map((row) => row.rowKey)).toEqual(
      e3Bank.concepts.slice(0, 3).map((entry) => `${entry.id}.definition`),
    );
    const row = { ...rows[0], rawText: "몫은 {$\\frac{1}{3}$}이다." };
    expect(memoryRowMarkdown(row, "keywords")).toContain("[[$\\frac{1}{3}$]]");
    expect(memoryRowMarkdown(row, "study")).toContain("$\\frac{1}{3}$");
    expect(memoryRowMarkdown(row, "sentences")).toContain(
      "{{몫은 $\\frac{1}{3}$이다.}}",
    );
  });
  it("does not add optional fields to old stored sections or change their canonical bytes", () => {
    const legacy = {
      sectionKey: "old",
      title: "기존",
      templateKey: "basic",
      startPolicy: "continue",
      blocks: blocks().map((block) => {
        const withoutSemantic = { ...block };
        delete withoutSemantic.semantic;
        if (withoutSemantic.kind === "dialogue")
          return {
            ...withoutSemantic,
            turns: withoutSemantic.turns.map((value) => {
              const turn = { ...value };
              delete turn.presentation;
              return turn;
            }),
          };
        return withoutSemantic;
      }),
    };
    expect(canonicalJson(textbookSectionSchema.parse(legacy))).toBe(
      canonicalJson(legacy),
    );
  });
  it("preserves all six block kinds and speech/board metadata through an editor load/save", async () => {
    const stored = {
      sectionKey: "lesson",
      title: "수업",
      templateKey: "auto-lesson",
      startPolicy: "continue",
      blocks: blocks(),
    };
    const record = {
      id,
      unitKey: "U01",
      revision: 1,
      section: stored,
      updatedAt: "2026-10-05T00:00:00.000Z",
    };
    let saved: unknown;
    const api = createTextbookApi(async (_url, init) => {
      if (init?.method === "PUT") {
        saved = JSON.parse(String(init.body)).section;
        return Response.json({
          data: {
            section: { ...record, revision: 2 },
            aggregateRevision: 2,
            replayed: false,
          },
        });
      }
      return Response.json({ data: record });
    });
    const detail = await api.getSection(id, id);
    await api.saveSection({
      editionId: id,
      sectionId: id,
      requestId: id,
      expectedRevision: 1,
      section: detail,
    });
    expect(saved).toEqual(stored);
    expect(textbookBlockSchema.parse(blocks()[5])).toEqual(blocks()[5]);
  });
  it("retains old master-off behavior while the new UI derives its master from explicit selections", () => {
    expect(TEXTBOOK_ACTIVITIES).toHaveLength(28);
    const selected = {
      ...DEFAULT_QUICK_CREATE_COMPONENTS,
      dialogueCheck: true,
      conceptStudy: true,
    };
    expect(
      effectiveQuickCreateComponents({
        includeConcepts: false,
        components: selected,
      }).dialogueCheck,
    ).toBe(false);
    expect(
      effectiveQuickCreateComponents(quickCreateSelectionInput(selected))
        .conceptStudy,
    ).toBe(true);
    const only = Object.fromEntries(
      TEXTBOOK_ACTIVITIES.map((key) => [key, key === "conceptBlankTest"]),
    ) as typeof selected;
    expect(
      effectiveQuickCreateComponents(quickCreateSelectionInput(only)),
    ).toEqual(only);
  });
});
