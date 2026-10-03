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
});
