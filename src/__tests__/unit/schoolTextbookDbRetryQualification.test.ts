import { describe, expect, it } from "vitest";
import {
  prepareDbRetryQualification,
  type DbRetryQualificationInput,
} from "@/lib/import/schoolTextbook/dbRetryQualification";
import {
  reviewDigest,
  retryReviewPayloadDigest,
} from "@/lib/import/schoolTextbook/qualification";
import type {
  DbRetryCandidate,
  DbRetryPairReview,
} from "@/lib/import/schoolTextbook/dbRetry.types";

function fixture(): DbRetryQualificationInput {
  const problem = {
    id: "source-1",
    source: "school_textbook",
    pool: "shared",
    unit_id: "unit-1",
    family_key: "solo:source-1",
    source_material_id: "material-1",
    external_id: "original-1",
    source_file: "old-path.hwp",
    content: "$2+3$을 계산하시오.",
    answer: "$5$",
    solution: "$2+3=5$이다.",
    question_type: "단답형",
    difficulty: "기본",
    problem_type: "계산",
    review_status: "approved",
    direct_use_allowed: true,
    origin_problem_id: null,
    updated_at: "2026-10-11T00:00:00.123456",
  };
  const candidates = ([1, 2] as const).map((slot): DbRetryCandidate => ({
    sourceId: problem.id,
    sourceDigest: reviewDigest(problem),
    originProblemId: problem.id,
    sourceMaterialId: problem.source_material_id,
    unitId: problem.unit_id,
    sourceExternalId: problem.external_id,
    sourceFile: problem.source_file,
    familyKey: problem.family_key,
    externalId: `tb-retry-v1:${problem.id}:${slot}`,
    source: "transformed",
    questionType: "단답형",
    slot,
    recipe: "ai-db-numbers-v1",
    method: "수 변경",
    content: `$${slot + 3}+3$을 계산하시오.`,
    answer: `$${slot + 6}$`,
    solution: `$${slot + 3}+3=${slot + 6}$이다.`,
    figureSvg: null,
    figureUrls: [],
    figureDims: [],
    figureSourceMm: [],
    choiceFigureIndex: [],
    validation: {
      version: "test",
      originalAnswerRecomputed: "$5$",
      checks: [],
    },
  }));
  const binding = {
    sourceId: problem.id,
    sourceDigest: reviewDigest(problem),
    candidatePayloadDigest: reviewDigest(candidates),
    sourceFigureDigest: reviewDigest([]),
    candidateFigureDigests: [reviewDigest([]), reviewDigest([])] as [
      string,
      string,
    ],
    bindingDigest: "fresh-real-evidence-binding",
  };
  const review = {
    ...binding,
    version: "test-review",
    passed: true,
    kind: "machine-blind-reasoning-review",
    solverModel: "solver",
    solutionReviewerModel: "reviewer",
    semanticModel: "jev",
    semanticThresholds: {
      sameLearningGoal: 0.95,
      sameLevel: 0.95,
      complete: 0.95,
    },
    semanticProbabilities: {
      "slot-1.sameLearningGoal": 0.99,
      "slot-2.sameLearningGoal": 0.99,
      "slot-1.sameLevel": 0.99,
      "slot-2.sameLevel": 0.99,
      "slot-1.complete": 0.99,
      "slot-2.complete": 0.99,
    },
    blindSolutions: (["original", "slot-1", "slot-2"] as const).map((id) => ({
      id,
      answer:
        id === "original" ? "$5$" : candidates[id === "slot-1" ? 0 : 1]!.answer,
      solution: "독립 계산",
      missingEvidence: [],
      ambiguous: false,
    })),
    solutionReviews: (["slot-1", "slot-2"] as const).map((id) => ({
      id,
      agreesWithBlindSolution: true,
      allStepsValid: true,
      complete: true,
      missingEvidence: [],
      issues: [],
    })),
    communications: [],
    issues: [],
  } as DbRetryPairReview;
  const stored = candidates.map((c) => ({
    id: `owned-${c.slot}`,
    external_id: c.externalId,
    origin_problem_id: problem.id,
    source: "transformed",
    pool: "shared",
    user_id: null,
    unit_id: problem.unit_id,
    family_key: problem.family_key,
    source_material_id: problem.source_material_id,
    question_type: problem.question_type,
    difficulty: problem.difficulty,
    problem_type: problem.problem_type,
    review_status: "pending",
    direct_use_allowed: false,
    solution_source: "ai",
    figure_source: null,
    content: c.content,
    answer: c.answer,
    solution: c.solution,
    figure_svg: c.figureSvg,
    figure_urls: c.figureUrls,
    figure_dims: c.figureDims,
    figure_source_mm: c.figureSourceMm,
    choice_figure_index: c.choiceFigureIndex,
  }));
  return {
    origins: [{ problem, grade: "중1", chapter: "계산", section: "덧셈" }],
    candidates,
    reviews: [review],
    bindings: [binding],
    stored,
    ownedIds: new Set(stored.map((row) => row.id)),
    render: {
      passed: true,
      rows: 2,
      inspectedCandidates: 2,
      candidateViewportChecks: 8,
      candidatePayloadSha256: retryReviewPayloadDigest(
        candidates.map((c) => Object.fromEntries(Object.entries(c))),
      ),
      checks: [1440, 390].flatMap((width) =>
        ["screen", "print"].map((media) => ({
          width,
          media,
          rows: 2,
          mathErrors: 0,
          documentOverflow: false,
          brokenImages: 0,
          contentOverflow: [],
        })),
      ),
    },
  };
}
describe("DB 교과서 변형의 독립 검토 승격 경계", () => {
  it("실제 원문/그림/독립 풀이/해설/지면이 같은 소유한 두 대기 행만 계획한다", () => {
    const input = fixture();
    const before = reviewDigest(input);
    expect(prepareDbRetryQualification(input)).toMatchObject({
      ids: ["owned-1", "owned-2"],
      pairs: 1,
      proofKind: "machine-blind-reasoning-review",
    });
    expect(reviewDigest(input)).toBe(before);
  });
  it.each([
    "content",
    "answer",
    "solution",
    "updated_at",
    "family_key",
    "source_material_id",
  ])("현재 원문 %s가 바뀌면 이전 검토를 거부한다", (field) => {
    const input = fixture();
    input.origins[0]!.problem[field] = "changed";
    expect(() => prepareDbRetryQualification(input)).toThrow();
  });
  it.each(["content", "answer", "solution"])(
    "저장된 후보 %s의 편집을 덮어쓰지 않는다",
    (field) => {
      const input = fixture();
      input.stored[0]![field] = "human edit";
      expect(() => prepareDbRetryQualification(input)).toThrow("문안 불일치");
    },
  );
  it("다른 그림 바이트의 검토를 재사용하지 않는다", () => {
    const input = fixture();
    input.bindings[0]!.sourceFigureDigest = "new-bytes";
    expect(() => prepareDbRetryQualification(input)).toThrow("그림/문안");
  });
  it("숫자가 맞아도 잘못된 해설이나 아직 풀지 못한 원문을 거부한다", () => {
    const input = fixture();
    input.reviews[0]!.solutionReviews[0]!.allStepsValid = false;
    expect(() => prepareDbRetryQualification(input)).toThrow("해설");
    const missing = fixture();
    missing.reviews[0]!.blindSolutions[0]!.missingEvidence.push(
      "미확인 원문 조건",
    );
    expect(() => prepareDbRetryQualification(missing)).toThrow("독립 풀이");
  });
  it("Jev의 높은 확률만으로 수학 검토 실패를 통과시키지 않는다", () => {
    const input = fixture();
    input.reviews[0]!.passed = false;
    expect(() => prepareDbRetryQualification(input)).toThrow("독립 풀이 검토");
  });
  it("통과 표시를 유지한 채 독립 정답만 바꾸어도 승격을 거부한다", () => {
    const input = fixture();
    input.reviews[0]!.blindSolutions[1]!.answer = "$999$";
    expect(() => prepareDbRetryQualification(input)).toThrow("저장 정답");
  });
  it("임계값을 낮추거나 확률을 비정상 값으로 바꾼 검토를 거부한다", () => {
    const input = fixture();
    input.reviews[0]!.semanticThresholds.complete = 0.2;
    expect(() => prepareDbRetryQualification(input)).toThrow("의미 검토");
    const invalid = fixture();
    invalid.reviews[0]!.semanticProbabilities["slot-1.sameLearningGoal"] =
      Number.NaN;
    expect(() => prepareDbRetryQualification(invalid)).toThrow("의미 검토");
  });
  it("두 변형 중 한 개나 다른 슬롯을 묶지 않는다", () => {
    const input = fixture();
    input.candidates = input.candidates.slice(0, 1);
    expect(() => prepareDbRetryQualification(input)).toThrow("두 변형");
    const duplicate = fixture();
    duplicate.candidates[1]!.slot = 1;
    duplicate.render.candidatePayloadSha256 = retryReviewPayloadDigest(
      duplicate.candidates.map((candidate) =>
        Object.fromEntries(Object.entries(candidate)),
      ),
    );
    expect(() => prepareDbRetryQualification(duplicate)).toThrow("슬롯");
  });
  it.each(["owned", "pending", "family", "source"])(
    "%s 연결을 잃은 저장 행을 거부한다",
    (kind) => {
      const input = fixture();
      if (kind === "owned") input.ownedIds = new Set();
      if (kind === "pending") input.stored[0]!.review_status = "approved";
      if (kind === "family") input.stored[0]!.family_key = "unrelated";
      if (kind === "source") input.stored[0]!.origin_problem_id = "unrelated";
      expect(() => prepareDbRetryQualification(input)).toThrow();
    },
  );
  it("모바일/인쇄 누락, 다른 후보 지문, 수식 오류를 거부한다", () => {
    const input = fixture();
    input.render.checks.pop();
    expect(() => prepareDbRetryQualification(input)).toThrow("지면");
    const mismatch = fixture();
    mismatch.render.candidatePayloadSha256 = "old-payload";
    expect(() => prepareDbRetryQualification(mismatch)).toThrow("지면");
    const error = fixture();
    error.render.checks[0]!.mathErrors = 1;
    expect(() => prepareDbRetryQualification(error)).toThrow("지면");
  });
});
