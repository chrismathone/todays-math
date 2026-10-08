import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import { blankKeywords } from "@/contracts/conceptBlank.contract";
import type { TextbookConcept } from "@/contracts/textbookConcept.contract";
import {
  studentConceptOf,
  studentAttemptOf,
} from "@/lib/textbook/studentProjection";

const id = "11111111-1111-4111-8111-111111111111";
const hash = "a".repeat(64);
const entry = CONCEPT_BLANK_BANK.concepts.find(
  (row) => row.id === "e5-1-4-3-c1",
)!;
const concept: TextbookConcept = {
  conceptKey: "common-denominator",
  unitKey: "fractions",
  sectionKey: "concept",
  title: "통분",
  kind: "방법",
  unitId: null,
  body: {
    goal: "설명하기",
    prerequisites: [],
    definition: "교사용 원고",
    conditions: null,
    examples: [],
    counterexamples: [],
    misconceptions: [],
    explainPrompt: null,
  },
  blankItems: [],
  links: [],
  mappingVersion: "1",
  derivedFromConceptKey: null,
  frozen: {
    contentHash: hash,
    parserVersion: "1",
    compositionVersion: "1",
    mappingVersion: "1",
    sections: [
      { blankSectionKey: entry.section, title: "통분", unitLabel: "분수" },
    ],
    entries: [{ entryKind: "concept", payload: entry }],
    selection: [
      {
        blankSectionKey: entry.section,
        entryKind: "concept",
        entryId: entry.id,
        form: "cloze",
        level: entry.level,
      },
    ],
    assetHashes: [],
  },
};
describe("textbook student projection from actual frozen bank entries", () => {
  it("removes the actual answer keywords and teacher content before serialization", () => {
    const dto = studentConceptOf(id, concept, {
      available: false,
      reasonCode: "unrecorded",
    });
    const json = JSON.stringify(dto);
    expect(
      dto.blanks[0]?.prompts[0]?.pieces.some((piece) => piece.kind === "blank"),
    ).toBe(true);
    for (const answer of blankKeywords(entry.definition))
      expect(json).not.toContain(answer);
    expect(json).not.toContain("교사용 원고");
    expect(json).not.toContain('"definition"');
  });
  it("uses the frozen payload even when the live bank is subsequently edited", () => {
    const captured = structuredClone(concept);
    const prior = studentConceptOf(id, captured, {
      available: false,
      reasonCode: "unrecorded",
    });
    const saved = entry.definition;
    try {
      entry.definition = "현재 은행에만 있는 {새로운 정답} 문장입니다.";
      expect(
        studentConceptOf(id, captured, {
          available: false,
          reasonCode: "unrecorded",
        }),
      ).toEqual(prior);
    } finally {
      entry.definition = saved;
    }
  });
  it("does not substitute a live entry for a missing frozen entry", () => {
    const broken = structuredClone(concept);
    broken.frozen!.entries = [];
    expect(() =>
      studentConceptOf(id, broken, {
        available: false,
        reasonCode: "unrecorded",
      }),
    ).toThrow();
  });
  it("returns only the review status for a teacher observation", () => {
    const dto = studentAttemptOf({
      attemptId: id,
      requestId: id,
      bodyHash: hash,
      studentId: id,
      editionId: id,
      conceptKey: "common-denominator",
      frozenHash: hash,
      form: "map",
      channel: "teacher-observed",
      response: "교사 관찰 비공개",
      submittedAt: "2026-10-03T00:00:00.000Z",
      revision: 1,
      reviewStatus: "checked",
      reviewedBy: id,
      reviewedAt: "2026-10-03T00:00:00.000Z",
      note: "교사 메모 비공개",
    });
    expect(dto.response).toBeNull();
    expect(JSON.stringify(dto)).not.toContain("비공개");
  });

  it("projects the frozen B/C questions without giving the student the model answer, criteria, alternatives or a C answer title", () => {
    const updated = structuredClone(concept);
    const payload = {
      ...entry,
      term: "표시하면 안 되는 편집 제목",
      questionRevision: "student-clear-test-v1",
      bQuestion: {
        prompt: "3/4÷1/4=3이 맞는지 곱셈식으로 확인하세요.",
        answer: "3×1/4=3/4이므로 계산이 옳다.",
        requiredIdeas: [{ anyOf: ["곱이 처음 양과 같다"] }],
      },
      clozeQuestion: {
        sentence: "3/5÷1/5의 몫을 2라고 쓴 답을 확인하면 2×1/5={2/5}이다.",
        acceptedAnswers: [["2/5", "0.4"]],
      },
    };
    updated.frozen!.entries = [{ entryKind: "concept", payload }];
    updated.frozen!.selection = ["term", "cloze"].map((form) => ({
      ...updated.frozen!.selection[0],
      form: form as "term" | "cloze",
    }));
    const dto = studentConceptOf(id, updated, {
      available: false,
      reasonCode: "unrecorded",
    });
    const json = JSON.stringify(dto);
    expect(dto.blanks[0].prompts[0].pieces).toEqual([
      { kind: "text", text: payload.bQuestion.prompt },
      { kind: "blank", index: 0 },
    ]);
    expect(
      dto.blanks[1].prompts[0].pieces.some((p) => p.kind === "blank"),
    ).toBe(true);
    expect(json).not.toContain(payload.term);
    for (const hidden of [
      payload.bQuestion.answer,
      "requiredIdeas",
      "acceptedAnswers",
      "0.4",
      "2/5",
    ])
      expect(json).not.toContain(hidden);
    expect(dto.frozenHash).toBe(hash);
  });

  it("keeps long math markup in the student question pieces rather than the limited label field", () => {
    const updated = structuredClone(concept);
    const prompt =
      "다음 식의 의미를 쓰세요. " +
      String.raw`$\displaystyle\frac{123}{456}$ `.repeat(15);
    updated.frozen!.entries = [
      {
        entryKind: "concept",
        payload: {
          ...entry,
          questionRevision: "student-clear-test-v1",
          bQuestion: {
            prompt,
            answer: "서로 같은 분수를 나타낸다.",
            requiredIdeas: [{ anyOf: ["동치인 분수"] }],
          },
          clozeQuestion: {
            sentence: entry.definition,
            acceptedAnswers: blankKeywords(entry.definition).map((key) => [
              key,
            ]),
          },
        },
      },
    ];
    updated.frozen!.selection[0].form = "term";
    const dto = studentConceptOf(id, updated, {
      available: false,
      reasonCode: "unrecorded",
    });
    expect(prompt.length).toBeGreaterThan(300);
    expect(dto.blanks[0].prompts[0].label).toBe("문항 1");
    expect(dto.blanks[0].prompts[0].pieces[0]).toEqual({
      kind: "text",
      text: prompt,
    });
  });
});
