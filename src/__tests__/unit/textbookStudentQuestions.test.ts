// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import { textbookBlockSchema } from "@/contracts/textbookExchange.contract";
import { conceptQuestionBlocks } from "@/lib/textbook/conceptQuestions";
import {
  QUESTION_REVISION,
  reviewedQuestionMode,
  mapQuestionMode,
} from "@/lib/concept-blank/questions";
import {
  memoryActivityBlocks,
  selectedLearningGuide,
} from "@/lib/textbook/server/quickCreateRecovery";
import { DEFAULT_QUICK_CREATE_COMPONENTS } from "@/contracts/textbookQuickCreate.contract";
import { conceptMemoryRows } from "@/lib/textbook/conceptRows";
import { createTextbookRenderModel } from "@/lib/textbook/render/model";
import { renderBlockHtml } from "@/lib/textbook/render/html";
import { textbookFixture } from "../helpers/textbookFixture";

const entry: ConceptEntry = {
  id: "e3-question-fixture",
  section: "초3::1-1 덧셈과 뺄셈::받아올림이 있는 덧셈",
  level: "중",
  term: "낱개 묶기",
  kind: "방법",
  definition: "낱개 $10$개는 십 {1}개와 같다.",
  questionRevision: QUESTION_REVISION,
  bQuestion: {
    prompt: "낱개 $10$개를 십 묶음으로 바꾸면 몇 묶음인가요?",
    answer: "십 한 묶음이다.",
    requiredIdeas: [{ anyOf: ["십 묶음 하나"] }],
  },
  clozeQuestion: {
    sentence: "낱개 $20$개를 십 묶음으로 바꾸면 {$2$}묶음이다.",
    acceptedAnswers: [["$2$", "두"]],
  },
};
const resources = { assetUrl: () => "", qrDataUrl: () => "" };

describe("reviewed questions in new automatic textbooks", () => {
  it("keeps the actual new C heading and instruction in a student projection", () => {
    const exchange = textbookFixture(1, 0);
    exchange.units[0].sections[0].templateKey = "auto-lesson";
    exchange.units[0].sections[0].blocks = memoryActivityBlocks({
      entries: [entry],
      conceptKey: "test",
      components: {
        ...DEFAULT_QUICK_CREATE_COMPONENTS,
        conceptStudy: false,
        sentenceRecall: false,
        clozeRecall: true,
      },
    });
    const model = createTextbookRenderModel(exchange, "student");
    expect(
      model.sections[0].blocks.find((block) => block.kind === "heading"),
    ).toMatchObject({
      title: "빈칸 문항",
      subtitle: "문장을 읽고 빈칸에 알맞은 내용을 쓰세요.",
    });
    expect(JSON.stringify(model)).not.toContain("$2$");
  });
  it.each([
    "sentenceRecall",
    "explainActivity",
    "conceptMap",
    "preparation",
  ] as const)(
    "%s retains its question heading and continued block in both variants",
    (activity) => {
      const exchange = textbookFixture(1, 0);
      exchange.units[0].sections[0].templateKey = "auto-lesson";
      const title =
        activity === "sentenceRecall" ? "책 없이 답 쓰기" : "활동 제목";
      const entries = [
        entry,
        { ...entry, id: "question-second" },
        { ...entry, id: "question-third" },
      ];
      exchange.units[0].sections[0].blocks = conceptQuestionBlocks({
        entries,
        conceptKey: "test",
        activity,
        title,
      });
      for (const variant of ["student", "answers"] as const) {
        const model = createTextbookRenderModel(exchange, variant);
        expect(
          model.sections[0].blocks.find((block) => block.kind === "heading"),
        ).toMatchObject({ title });
        const recalls = model.sections[0].blocks.filter(
          (block) => block.kind === "recall",
        );
        expect(recalls).toHaveLength(2);
        expect(recalls[1]).toMatchObject({ continuation: true });
        const json = JSON.stringify(model);
        if (variant === "student") expect(json).not.toContain("십 한 묶음이다");
        else expect(json).toContain("십 한 묶음이다");
      }
    },
  );
  it("rejects incompatible revisions, mixed source payloads and false manuscript edits", () => {
    expect(() =>
      reviewedQuestionMode([{ ...entry, questionRevision: "unreviewed-v2" }]),
    ).toThrow("질문 판");
    const legacy = { ...entry };
    delete legacy.questionRevision;
    delete legacy.bQuestion;
    delete legacy.clozeQuestion;
    expect(() => reviewedQuestionMode([entry, legacy])).toThrow("질문 판");
    const block = conceptQuestionBlocks({
      entries: [entry],
      conceptKey: "test",
      activity: "termRecall",
      title: "개념 질문",
    })[0];
    expect(
      textbookBlockSchema.safeParse({
        ...block,
        markdown: "지면에 반영되지 않을 수정",
      }).success,
    ).toBe(false);
    expect(
      textbookBlockSchema.safeParse({ ...block, kind: "text" }).success,
    ).toBe(false);
    expect(
      textbookBlockSchema.safeParse({ ...block, phase: "study" }).success,
    ).toBe(false);
    expect(
      textbookBlockSchema.safeParse({
        ...block,
        semantic: { ...block.semantic, activity: "concepts" },
      }).success,
    ).toBe(false);
    const wrongText = {
      blockId: block.blockId,
      kind: "text",
      markdown: block.kind === "concept-recall" ? block.markdown : "",
      semantic: block.semantic,
    };
    expect(textbookBlockSchema.safeParse(wrongText).success).toBe(false);
    const exchange = textbookFixture(1, 0);
    exchange.units[0].sections[0].blocks = [
      {
        blockId: block.blockId,
        kind: "text",
        markdown: "허용되지 않는 구조를 투영만 검증한다.",
        semantic: block.semantic,
      },
    ];
    const student = JSON.stringify(
      createTextbookRenderModel(exchange, "student"),
    );
    expect(student).not.toContain("십 한 묶음이다");
    expect(student).not.toContain("십 묶음 하나");
  });
  it.each([
    "termRecall",
    "sentenceRecall",
    "explainActivity",
    "conceptMap",
    "preparation",
  ] as const)(
    "%s freezes an explicit question and removes the key before a student model exists",
    (activity) => {
      const exchange = textbookFixture(1, 0);
      const blocks = conceptQuestionBlocks({
        entries: [entry],
        conceptKey: "test-concept",
        activity,
        title: "개념 질문",
      });
      expect(textbookBlockSchema.safeParse(blocks[0]).success).toBe(true);
      exchange.units[0].sections[0].blocks = blocks;
      const student = createTextbookRenderModel(exchange, "student");
      const serialized = JSON.stringify(student);
      expect(serialized).toContain("몇 묶음인가요?");
      expect(serialized).not.toContain(entry.bQuestion!.answer);
      expect(serialized).not.toContain("십 묶음 하나");
      const block = student.sections[0].blocks.find(
        (row) => row.kind === "recall",
      )!;
      const studentHtml = renderBlockHtml(block, resources);
      expect(studentHtml).toContain("몇 묶음인가요?");
      expect(studentHtml).toContain("물음에 대한 답 쓰기");
      expect(studentHtml).not.toContain("십 한 묶음이다");
      const teacher = createTextbookRenderModel(exchange, "answers");
      const teacherHtml = teacher.sections[0].blocks
        .map((row) => renderBlockHtml(row, resources))
        .join("");
      expect(teacherHtml).toContain("십 한 묶음이다.");
      expect(teacherHtml).toContain("십 묶음 하나");
      expect(exchange.units[0].sections[0].blocks).toEqual(blocks);
    },
  );

  it("uses the independently reviewed C sentence while study and full recall retain the explanation", () => {
    expect(conceptMemoryRows([entry], "keywords")[0]).toMatchObject({
      label: "문항 1",
      rawText: entry.clozeQuestion!.sentence,
    });
    expect(conceptMemoryRows([entry], "study")[0].rawText).toBe(
      entry.definition,
    );
    expect(conceptMemoryRows([entry], "sentences")[0].rawText).toBe(
      entry.definition,
    );
    const excluded = { ...entry, bQuestion: null, clozeQuestion: null };
    expect(conceptMemoryRows([excluded], "keywords")).toEqual([]);
    expect(() =>
      conceptQuestionBlocks({
        entries: [excluded],
        conceptKey: "test",
        activity: "termRecall",
        title: "개념 질문",
      }),
    ).toThrow("출제 가능한");
    expect(conceptMemoryRows([excluded], "study")).toHaveLength(1);
    expect(() => mapQuestionMode([excluded])).toThrow("제외한");
    expect(() =>
      memoryActivityBlocks({
        entries: [excluded],
        conceptKey: "test",
        components: {
          ...DEFAULT_QUICK_CREATE_COMPONENTS,
          conceptStudy: false,
          sentenceRecall: false,
          clozeRecall: true,
        },
      }),
    ).toThrow("빈칸 문항");
    const guide = JSON.stringify(
      selectedLearningGuide(
        { ...DEFAULT_QUICK_CREATE_COMPONENTS, conceptMap: true },
        true,
      ),
    );
    expect(guide).not.toContain("답과 이유를 쓰세요");
    expect(guide).toContain("단원 개념 확인 모음");
  });

  it("leaves legacy frozen learning rows on their original definition and label", () => {
    const {
      questionRevision: _r,
      bQuestion: _b,
      clozeQuestion: _c,
      ...legacy
    } = entry;
    expect(conceptMemoryRows([legacy], "keywords")).toEqual(
      conceptMemoryRows([legacy], "study"),
    );
  });
});
