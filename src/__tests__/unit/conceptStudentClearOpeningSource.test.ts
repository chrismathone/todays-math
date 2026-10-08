import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import type { UnitOpening } from "@/lib/textbook/unitOpenings";
import {
  coreSectionSourceHash,
  planOpeningSourceHashes,
} from "../../../scripts/qa/concept-blank/student-clear/opening-source";

const entry: ConceptEntry = {
  id: "e5-1-1-1-c1",
  section: "초5::1-1 혼합 계산::1-1-1 순서",
  kind: "법칙",
  term: "계산 순서",
  definition: "괄호가 있으면 {괄호 안}을 먼저 계산한다.",
  level: "하",
};
const opening = (): UnitOpening => {
  const sourceHash = coreSectionSourceHash(entry.section, [entry]);
  return {
    id: "e5-1-1",
    grade: "초5",
    semester: 1,
    chapter: "1-1 혼합 계산",
    title: "혼합 계산",
    question: "다른 세션이 다듬은 질문",
    explanation: "저자가 작성한 도입 설명",
    keyPhrase: "계산 순서",
    check: [],
    sections: [
      {
        id: "e5-1-1-1",
        key: entry.section,
        title: "1-1-1 순서",
        goal: "계산 순서를 설명할 수 있어요.",
        conceptIds: [entry.id],
        sourceHash,
      },
    ],
    provenance: {
      origin: "bank-derived",
      bankFile: "e5.ts",
      scriptFile: "e5.json",
      sourceHash: createHash("sha256").update(sourceHash).digest("hex"),
      editor: "기존 작성자",
      reviewer: "기존 검토자",
      status: "AI 검수",
      humanReview: false,
      reviewedOn: "2026-10-05",
    },
  };
};

describe("authored opening source plan", () => {
  it("keeps learning provenance stable when only B/C assessments change", () => {
    const changed: ConceptEntry = {
      ...entry,
      questionRevision: "student-clear-20261006-v1",
      bQuestion: null,
      clozeQuestion: {
        sentence: "$2+3=${$5$}이다.",
        acceptedAnswers: [["$5$"]],
      },
      questionExclusions: { term: "다른 문항으로 확인한다." },
    };
    const original = opening();
    const result = planOpeningSourceHashes({
      openings: [original],
      baseline: [entry],
      candidate: [changed],
    });
    expect(result.sectionChanges).toEqual([]);
    expect(result.openings).toEqual([original]);
    expect(coreSectionSourceHash(entry.section, [changed])).toBe(
      coreSectionSourceHash(entry.section, [entry]),
    );
  });
  it("updates only source hashes for a changed general explanation without inventing a new reading", () => {
    const original = opening();
    const changed = {
      ...entry,
      definition: "덧셈과 곱셈만 있으면 {곱셈}을 먼저 계산한다.",
    };
    const result = planOpeningSourceHashes({
      openings: [original],
      baseline: [entry],
      candidate: [changed],
    });
    expect(result.sectionChanges[0]!.changedIds).toEqual([entry.id]);
    expect(result.openings[0]!.sections[0]!.sourceHash).not.toBe(
      original.sections[0]!.sourceHash,
    );
    const next = structuredClone(result.openings[0]!);
    (next.sections[0]! as { sourceHash: string }).sourceHash =
      original.sections[0]!.sourceHash;
    (next.provenance as { sourceHash: string }).sourceHash =
      original.provenance.sourceHash;
    expect(next).toEqual(original);
    expect(original).toEqual(opening());
  });
  it("refuses a stale source, moved card, changed non-definition content, or missing scope", () => {
    const stale = opening();
    (stale.sections[0]! as { sourceHash: string }).sourceHash = "0".repeat(64);
    expect(() =>
      planOpeningSourceHashes({
        openings: [stale],
        baseline: [entry],
        candidate: [entry],
      }),
    ).toThrow("지문");
    for (const changed of [
      { ...entry, section: "다른 소단원" },
      { ...entry, term: "다른 개념" },
      { ...entry, id: "다른 ID" },
    ]) {
      expect(() =>
        planOpeningSourceHashes({
          openings: [opening()],
          baseline: [entry],
          candidate: [changed],
        }),
      ).toThrow("원천");
    }
    expect(() =>
      planOpeningSourceHashes({
        openings: [],
        baseline: [entry],
        candidate: [entry],
      }),
    ).toThrow("대응하지 않은");
  });
});
