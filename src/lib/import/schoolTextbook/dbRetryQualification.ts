import type {
  DbRetryCandidate,
  DbRetryOrigin,
  DbRetryPairReview,
} from "./dbRetry.types";
import { reviewDigest, retryReviewPayloadDigest } from "./qualification";
import {
  DB_RETRY_SEMANTIC_THRESHOLDS,
  dbRetryAnswersAgree,
} from "./dbRetryReview";

/** Calculated again from current DB sources and freshly loaded image bytes. */
export interface DbRetryQualificationBinding {
  sourceId: string;
  sourceDigest: string;
  candidatePayloadDigest: string;
  sourceFigureDigest: string;
  candidateFigureDigests: [string, string];
  bindingDigest: string;
}
export interface DbRetryProductionRender {
  passed: boolean;
  rows: number;
  inspectedCandidates: number;
  candidateViewportChecks: number;
  candidatePayloadSha256: string;
  checks: {
    width: number;
    media: string;
    rows: number;
    mathErrors: number;
    documentOverflow: boolean;
    brokenImages: number;
    contentOverflow: unknown[];
  }[];
}
export interface DbRetryQualificationInput {
  origins: readonly DbRetryOrigin[];
  candidates: readonly DbRetryCandidate[];
  reviews: readonly DbRetryPairReview[];
  bindings: readonly DbRetryQualificationBinding[];
  stored: readonly Record<string, unknown>[];
  ownedIds: ReadonlySet<string>;
  render: DbRetryProductionRender;
}
const payloadFields = {
  content: "content",
  answer: "answer",
  solution: "solution",
  figureSvg: "figure_svg",
  figureUrls: "figure_urls",
  figureDims: "figure_dims",
  figureSourceMm: "figure_source_mm",
  choiceFigureIndex: "choice_figure_index",
} as const;
const unique = <T>(items: readonly T[], key: (item: T) => string) => {
  const map = new Map(items.map((item) => [key(item), item]));
  if (map.size !== items.length) throw new Error("중복 검토/원문/저장 행");
  return map;
};

/** Proof kinds remain explicit; this never impersonates deterministic or human review. */
export function prepareDbRetryQualification(input: DbRetryQualificationInput) {
  const { candidates, reviews, bindings, origins, stored, ownedIds, render } =
    input;
  if (!candidates.length || candidates.length % 2)
    throw new Error("완전한 두 변형 쌍이 필요하다");
  unique(candidates, (candidate) => candidate.externalId);
  const records = candidates.map((candidate) =>
    Object.fromEntries(Object.entries(candidate)),
  );
  const renderModes = new Set<string>();
  if (
    render.passed !== true ||
    render.rows !== candidates.length ||
    render.inspectedCandidates !== candidates.length ||
    render.candidateViewportChecks !== candidates.length * 4 ||
    render.candidatePayloadSha256 !== retryReviewPayloadDigest(records) ||
    !Array.isArray(render.checks) ||
    render.checks.length !== 4
  )
    throw new Error("실제 지면 검사의 문안/모집단 불일치");
  for (const check of render.checks) {
    const mode = `${check.width}:${check.media}`;
    if (
      !["1440:screen", "390:screen", "1440:print", "390:print"].includes(
        mode,
      ) ||
      renderModes.has(mode) ||
      check.rows !== candidates.length ||
      check.mathErrors !== 0 ||
      check.documentOverflow !== false ||
      check.brokenImages !== 0 ||
      !Array.isArray(check.contentOverflow) ||
      check.contentOverflow.length
    )
      throw new Error("화면/인쇄 지면 검사가 완전하지 않다");
    renderModes.add(mode);
  }
  const originalById = unique(origins, (origin) => origin.problem.id);
  const reviewById = unique(reviews, (review) => review.sourceId);
  const bindingById = unique(bindings, (binding) => binding.sourceId);
  const storedByExternalId = unique(stored, (row) => String(row.external_id));
  const groups = new Map<string, DbRetryCandidate[]>();
  for (const candidate of candidates) {
    const group = groups.get(candidate.sourceId) ?? [];
    group.push(candidate);
    groups.set(candidate.sourceId, group);
  }
  if (
    reviews.length !== groups.size ||
    bindings.length !== groups.size ||
    origins.length !== groups.size ||
    stored.length !== candidates.length
  )
    throw new Error("검토/원문/그림/저장 모집단 불일치");
  const targets: Record<string, unknown>[] = [];
  for (const [sourceId, group] of groups) {
    const pair = [...group].sort((a, b) => a.slot - b.slot);
    if (pair.length !== 2 || pair[0]!.slot !== 1 || pair[1]!.slot !== 2)
      throw new Error("변형 슬롯 1과 2가 함께 필요하다");
    const origin = originalById.get(sourceId),
      review = reviewById.get(sourceId),
      binding = bindingById.get(sourceId);
    if (!origin || !review || !binding)
      throw new Error("검토/현재 원문/그림 근거 누락");
    const parent = origin.problem;
    if (
      parent.source !== "school_textbook" ||
      parent.pool !== "shared" ||
      parent.review_status !== "approved" ||
      parent.direct_use_allowed !== true ||
      parent.origin_problem_id !== null
    )
      throw new Error("사용 가능 교과서 원문이 아니다");
    if (
      review.kind !== "machine-blind-reasoning-review" ||
      review.passed !== true ||
      review.issues.length ||
      !review.solverModel ||
      !review.solutionReviewerModel ||
      !review.semanticModel
    )
      throw new Error("독립 풀이 검토가 통과되지 않았다");
    const thresholds = Object.values(review.semanticThresholds);
    const probabilities = Object.values(review.semanticProbabilities);
    if (
      thresholds.length !== 3 ||
      thresholds.some(
        (value) => !Number.isFinite(value) || value < 0.9 || value > 1,
      ) ||
      probabilities.length < 6 ||
      probabilities.some(
        (value) => !Number.isFinite(value) || value < 0.9 || value > 1,
      )
    )
      throw new Error("의미 검토 정책/근거 불일치");
    for (const slot of [1, 2])
      for (const dimension of [
        "sameLearningGoal",
        "sameLevel",
        "complete",
      ] as const) {
        const value = review.semanticProbabilities[`slot-${slot}.${dimension}`];
        if (
          review.semanticThresholds[dimension] <
            DB_RETRY_SEMANTIC_THRESHOLDS[dimension] ||
          !Number.isFinite(value) ||
          value! < review.semanticThresholds[dimension]
        )
          throw new Error("의미 검토의 개별 임계값 미달");
      }
    if (
      review.blindSolutions.length !== 3 ||
      new Set(review.blindSolutions.map((answer) => answer.id)).size !== 3 ||
      !["original", "slot-1", "slot-2"].every((id) =>
        review.blindSolutions.some(
          (answer) =>
            answer.id === id &&
            answer.answer.trim() &&
            answer.solution.trim() &&
            !answer.ambiguous &&
            !answer.missingEvidence.length,
        ),
      )
    )
      throw new Error("원문과 두 변형의 독립 풀이가 완전하지 않다");
    const answerTargets = [
      {
        id: "original",
        content: parent.content,
        answer: parent.answer,
        questionType: parent.question_type,
      },
      ...pair.map((candidate) => ({
        id: `slot-${candidate.slot}`,
        content: candidate.content,
        answer: candidate.answer,
        questionType: candidate.questionType,
      })),
    ];
    for (const problem of answerTargets) {
      const blind = review.blindSolutions.find(
        (solution) => solution.id === problem.id,
      );
      if (
        !blind ||
        !dbRetryAnswersAgree(
          problem.answer,
          blind.answer,
          problem.questionType,
          problem.content,
        )
      )
        throw new Error("독립 풀이와 저장 정답 불일치");
    }
    if (
      review.solutionReviews.length !== 2 ||
      !["slot-1", "slot-2"].every((id) =>
        review.solutionReviews.some(
          (solution) =>
            solution.id === id &&
            solution.agreesWithBlindSolution &&
            solution.allStepsValid &&
            solution.complete &&
            !solution.missingEvidence.length &&
            !solution.issues.length,
        ),
      )
    )
      throw new Error("제안 해설의 독립 검토가 통과되지 않았다");
    if (
      binding.sourceDigest !== reviewDigest(parent) ||
      binding.candidatePayloadDigest !== reviewDigest(pair)
    )
      throw new Error("현재 원문/후보 검토 지문 불일치");
    for (const field of [
      "sourceDigest",
      "candidatePayloadDigest",
      "sourceFigureDigest",
      "candidateFigureDigests",
      "bindingDigest",
    ] as const)
      if (reviewDigest(review[field]) !== reviewDigest(binding[field]))
        throw new Error("현재 실제 그림/문안과 검토 근거 불일치");
    for (const candidate of pair) {
      const row = storedByExternalId.get(candidate.externalId);
      if (
        !row ||
        !ownedIds.has(String(row.id)) ||
        row.pool !== "shared" ||
        row.user_id !== null ||
        row.source !== "transformed" ||
        row.review_status !== "pending" ||
        row.direct_use_allowed !== false
      )
        throw new Error("소유한 공유 대기 변형만 승격할 수 있다");
      if (
        candidate.sourceDigest !== reviewDigest(parent) ||
        candidate.originProblemId !== sourceId ||
        candidate.source !== "transformed" ||
        candidate.externalId !== `tb-retry-v1:${sourceId}:${candidate.slot}` ||
        candidate.unitId !== parent.unit_id ||
        candidate.familyKey !== parent.family_key ||
        candidate.sourceMaterialId !== parent.source_material_id ||
        candidate.questionType !== parent.question_type ||
        candidate.sourceExternalId !== (parent.external_id ?? null) ||
        candidate.sourceFile !== (parent.source_file ?? null)
      )
        throw new Error("검토 후보의 원문/출처/문항류 연결 불일치");
      if (
        row.origin_problem_id !== sourceId ||
        row.unit_id !== parent.unit_id ||
        row.family_key !== parent.family_key ||
        row.source_material_id !== parent.source_material_id ||
        row.question_type !== parent.question_type ||
        row.difficulty !== parent.difficulty ||
        row.problem_type !== parent.problem_type ||
        row.solution_source !== "ai" ||
        row.figure_source !== (candidate.figureSvg ? "engine" : null) ||
        candidate.figureUrls.length
      )
        throw new Error("저장 변형의 원문/출처/그림 연결 불일치");
      for (const [camel, snake] of Object.entries(payloadFields))
        if (
          reviewDigest(row[snake]) !==
          reviewDigest(candidate[camel as keyof typeof payloadFields])
        )
          throw new Error("검토·지면·저장 문안 불일치");
      targets.push(row);
    }
  }
  if (new Set(targets.map((row) => row.id)).size !== targets.length)
    throw new Error("승격 대상 UUID 중복");
  return {
    ids: targets.map((row) => String(row.id)),
    before: targets,
    origins,
    pairs: groups.size,
    proofKind: "machine-blind-reasoning-review" as const,
    candidatePayloadDigest: reviewDigest(candidates),
    reviewDigest: reviewDigest(reviews),
    renderDigest: reviewDigest(render),
  };
}
