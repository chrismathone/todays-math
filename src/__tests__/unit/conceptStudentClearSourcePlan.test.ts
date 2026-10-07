import { describe, expect, it } from "vitest";
import type { ConceptBlankBank } from "@/contracts/conceptBlank.contract";
import { withAssessments } from "@/lib/concept-blank/bank/assessment";
import { QUESTION_REVISION } from "@/lib/concept-blank/questions";
import type { ContentApplicationPlan } from "../../../scripts/qa/concept-blank/student-clear/application";
import { contentHash } from "../../../scripts/qa/concept-blank/student-clear/proposals";
import { prepareBankSourceChanges } from "../../../scripts/qa/concept-blank/student-clear/source-plan";

function fixture() {
  const entry = {
    id: "e3-1-1-1-c1",
    section: "초3::1-1 덧셈과 뺄셈::1-1-1 덧셈",
    term: "받아올림",
    kind: "방법" as const,
    level: "하" as const,
    definition: "낱개 열 개를 십 {한} 개로 바꾼다.",
  };
  const bank: ConceptBlankBank = {
    concepts: [entry],
    ox: [],
    apply: [],
    figures: [],
  };
  const baseline = { e3: bank };
  const after = "낱개가 열 개 모이면 십 {한} 개로 바꿀 수 있다.";
  const table = {
    [entry.id]: {
      bQuestion: {
        prompt: "낱개 열 개를 십 몇 개로 바꿀 수 있나요?",
        answer: "십 한 개로 바꿀 수 있다.",
        requiredIdeas: [{ anyOf: ["십 한 개"] }],
      },
      clozeQuestion: {
        sentence: after,
        acceptedAnswers: [["한", "하나"]],
      },
    },
  };
  const candidate = withAssessments(
    { ...bank, concepts: [{ ...entry, definition: after }] },
    table,
  );
  const plan: ContentApplicationPlan = {
    status: "content-reviewed-plan; print-and-memory-activation-pending",
    revision: QUESTION_REVISION,
    baselineHash: contentHash(baseline),
    candidateBankHash: contentHash({ e3: candidate }),
    count: 1,
    assessmentTables: { e3: table },
    definitionChanges: [
      {
        part: "e3",
        id: entry.id,
        before: entry.definition,
        after,
        reason: "낱개 열 개와 십 한 개의 교환을 일반 문장으로 풀어 쓴다.",
        contentHash: "fixture-reviewed-content",
      },
    ],
    reviewedRows: [
      {
        id: entry.id,
        part: "e3",
        contentHash: "fixture-reviewed-content",
        independentPackets: ["fixture-two-stage"],
      },
    ],
  };
  const sources = {
    e3: `export const bank = ${JSON.stringify(bank)};\n// 이 뒤에 원래 그림 helper가 있다.\n`,
  };
  return { baseline, sources, plan };
}

describe("reviewable bank file plan", () => {
  it("prepares separate question data and only the approved definition while keeping source objects untouched", () => {
    const input = fixture();
    const saved = structuredClone(input);
    const result = prepareBankSourceChanges(input);
    expect(input).toEqual(saved);
    expect(result.changes.map((row) => row.file)).toEqual([
      "src/lib/concept-blank/bank/e3.ts",
      "src/lib/concept-blank/bank/assessments/e3.json",
    ]);
    expect(result.changes[0]!.after).toContain(
      input.plan.definitionChanges[0]!.after,
    );
    expect(
      result.changes[0]!.after.indexOf(
        "bank.concepts = attachReviewedQuestions",
      ),
    ).toBeGreaterThan(result.changes[0]!.after.indexOf("원래 그림 helper"));
    expect(result.changes[1]!.before).toBeNull();
    expect(JSON.parse(result.changes[1]!.after)).toEqual(
      input.plan.assessmentTables.e3,
    );
    expect(result.candidateParts.e3!.ox).toEqual(input.baseline.e3.ox);
  });
  it("refuses changed content or code after compilation instead of emitting a partial file plan", () => {
    const changedTable = fixture();
    changedTable.plan.assessmentTables.e3!["e3-1-1-1-c1"]!.bQuestion!.answer =
      "다른 답";
    expect(() => prepareBankSourceChanges(changedTable)).toThrow("후보 은행");
    const changedSource = fixture();
    changedSource.sources.e3 = changedSource.sources.e3.replace(
      "십 {한}",
      "십 {두}",
    );
    expect(() => prepareBankSourceChanges(changedSource)).toThrow(
      "원천 일반 설명 코드",
    );
  });
  it("refuses missing source parts and duplicated or misassigned reviewed IDs", () => {
    const missing = fixture();
    delete (missing.sources as Partial<typeof missing.sources>).e3;
    expect(() => prepareBankSourceChanges(missing)).toThrow("범위");
    const duplicate = fixture();
    duplicate.plan.reviewedRows.push(duplicate.plan.reviewedRows[0]!);
    expect(() => prepareBankSourceChanges(duplicate)).toThrow("전 ID");
    const moved = fixture();
    moved.plan.definitionChanges[0]!.part = "e4";
    expect(() => prepareBankSourceChanges(moved)).toThrow("출처");
  });
});
