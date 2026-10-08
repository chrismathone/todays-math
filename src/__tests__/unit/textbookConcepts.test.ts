import { describe, expect, it, vi } from "vitest";
import { blankKeywords } from "@/contracts/conceptBlank.contract";
vi.mock("server-only", () => ({}));
import { CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import { composeFrozenTextbookBlank } from "@/lib/concept-blank/textbookPrint";
import {
  conceptCandidatesForSection,
  freezeTextbookConcept,
  resolveReviewedConcept,
  listConceptCatalog,
} from "@/lib/textbook/concepts";
import { conceptContentHash } from "@/lib/textbook/hash.server";
import type { TextbookConcept } from "@/contracts/textbookConcept.contract";

const reviewerId = "11111111-1111-4111-8111-111111111111";
const now = "2026-10-03T00:00:00.000Z";
const entry = CONCEPT_BLANK_BANK.concepts.find(
  (row) => row.id === "e5-1-4-3-c1",
)!;
const candidate = {
  status: "candidate" as const,
  candidateRule: "manual" as const,
  reviewedBy: null,
  reviewedAt: null,
  targetHash: null,
};
function draft(): TextbookConcept {
  return {
    conceptKey: "common-denominator",
    unitKey: "fractions",
    sectionKey: "concept",
    title: "통분",
    kind: "방법",
    unitId: null,
    body: {
      goal: "설명하기",
      prerequisites: [],
      definition: entry.definition,
      conditions: null,
      examples: [],
      counterexamples: [],
      misconceptions: [],
      explainPrompt: null,
    },
    blankItems: [
      {
        blankSectionKey: entry.section,
        entryKind: "concept",
        entryId: entry.id,
        review: candidate,
      },
    ],
    links: [
      {
        linkId: "explorer",
        target: { namespace: "explorer-card", cardId: "g5-common-denominator" },
        relation: "related",
        review: candidate,
      },
    ],
    mappingVersion: "1",
    derivedFromConceptKey: null,
    frozen: null,
  };
}
function reviewed() {
  return resolveReviewedConcept(draft(), {
    reviewerId,
    now,
    confirmBlankEntryIds: [entry.id],
    confirmLinkIds: ["explorer"],
  });
}

describe("reviewed textbook concepts use exact canonical sources", () => {
  it("uses eligible forms per linked concept without inventing an excluded question, and rejects an exact unavailable form", () => {
    const prior=structuredClone(entry);
    try {
      entry.questionRevision="student-clear-test-v1";
      entry.bQuestion=null;
      entry.clozeQuestion={sentence:entry.definition,acceptedAnswers:blankKeywords(entry.definition).map(key=>[key])};
      entry.questionExclusions={term:"이 형식에서는 다른 질문과 목표가 겹쳐 제외한다."};
      const frozen=freezeTextbookConcept(reviewed(),["term","cloze"]);
      expect(frozen.frozen!.selection.map(pick=>pick.form)).toEqual(["cloze"]);
      expect(frozen.frozen!.entries[0].payload.id).toBe(entry.id);
      expect(()=>freezeTextbookConcept(reviewed(),["term"])).toThrow("선택한 형식");
    } finally {
      delete entry.questionRevision;
      delete entry.bQuestion;
      delete entry.clozeQuestion;
      delete entry.questionExclusions;
      Object.assign(entry,prior);
    }
  });
  it("uses an authored bridge only as a candidate and returns actual bank IDs", () => {
    expect(conceptCandidatesForSection(entry.section).status).toBe("candidate");
    const found = listConceptCatalog({ query: entry.id });
    expect(found.entries.some((row) => row.payload.id === entry.id)).toBe(true);
  });
  it("does not accept imported reviewer claims as approval", () => {
    const imported = reviewed();
    expect(
      resolveReviewedConcept(imported, { reviewerId, now }).blankItems[0]
        ?.review.status,
    ).toBe("candidate");
    expect(() => freezeTextbookConcept(imported)).not.toThrow();
    expect(() =>
      freezeTextbookConcept(
        resolveReviewedConcept(imported, { reviewerId, now }),
      ),
    ).toThrow("확인");
  });
  it("invalidates semantic-body changes and keeps unchanged prior server approvals", () => {
    const prior = reviewed();
    expect(
      resolveReviewedConcept(prior, { prior, reviewerId, now }).blankItems[0]
        ?.review,
    ).toEqual(prior.blankItems[0]?.review);
    const changed = {
      ...prior,
      body: { ...prior.body, definition: "다른 설명" },
    };
    expect(
      resolveReviewedConcept(changed, { prior, reviewerId, now }).blankItems[0]
        ?.review.status,
    ).toBe("candidate");
  });
  it("freezes exact entries, labels, order and content hash; old printing ignores current bank", () => {
    const source = reviewed();
    const frozen = freezeTextbookConcept(source, ["cloze", "term"]);
    expect(frozen.frozen!.contentHash).toBe(conceptContentHash(frozen));
    expect(frozen.frozen!.entries.map((row) => row.payload.id)).toEqual([
      entry.id,
    ]);
    expect(frozen.frozen!.selection.map((row) => row.form)).toEqual([
      "cloze",
      "term",
    ]);
    const before = composeFrozenTextbookBlank(frozen.frozen!);
    const original = entry.definition;
    try {
      entry.definition = "정본 은행이 {새 값}으로 바뀌었습니다.";
      expect(composeFrozenTextbookBlank(frozen.frozen!)).toEqual(before);
      expect(() => freezeTextbookConcept(source)).toThrow("바뀌었습니다");
    } finally {
      entry.definition = original;
    }
  });
  it("preserves chosen forms when freezing and rejects duplicate forms", () => {
    const source = { ...reviewed(), blankForms: ["cloze", "term"] as const };
    const saved = freezeTextbookConcept({
      ...source,
      blankForms: [...source.blankForms],
    });
    expect(saved.frozen!.selection.map((pick) => pick.form)).toEqual([
      "cloze",
      "term",
    ]);
    expect(() =>
      freezeTextbookConcept({ ...reviewed(), blankForms: ["term", "term"] }),
    ).toThrow();
  });
  it("rejects wrong source section and recall-incompatible cases instead of substituting", () => {
    const wrong = draft();
    wrong.blankItems[0]!.blankSectionKey = "초5::가짜::가짜";
    expect(() => resolveReviewedConcept(wrong, { reviewerId, now })).toThrow(
      "찾을 수 없습니다",
    );
    // The current bank need not contain this optional kind of prompt.
    const given = entry;
    const originalCase = given.givenCase;
    given.givenCase = true;
    const source = draft();
    source.blankItems = [
      {
        blankSectionKey: given.section,
        entryKind: "concept",
        entryId: given.id,
        review: candidate,
      },
    ];
    source.links = [];
    try {
      const confirmed = resolveReviewedConcept(source, {
        reviewerId,
        now,
        confirmBlankEntryIds: [given.id],
      });
      expect(() => freezeTextbookConcept(confirmed, ["recall"])).toThrow(
        "사례",
      );
    } finally {
      if (originalCase === undefined) delete given.givenCase;
      else given.givenCase = originalCase;
    }
  });
});
