import type { DbRetryCandidate, DbRetryOrigin } from "./dbRetry.types";
import { reviewDigest, retryReviewPayloadDigest } from "./qualification";
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

export interface DbRetryQualificationRowsInput {
  origins: readonly DbRetryOrigin[];
  candidates: readonly DbRetryCandidate[];
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
export const uniqueDbRetryQualification = <T>(
  items: readonly T[],
  key: (item: T) => string,
) => {
  const map = new Map(items.map((item) => [key(item), item]));
  if (map.size !== items.length) throw new Error("중복 검토/원문/저장 행");
  return map;
};

/** Common source/ownership/render validation; no inference provider or semantic approval. */
export function validateDbRetryQualificationRows(
  input: DbRetryQualificationRowsInput,
) {
  const { candidates, origins, stored, ownedIds, render } = input;
  if (!candidates.length || candidates.length % 2)
    throw new Error("완전한 두 변형 쌍이 필요하다");
  uniqueDbRetryQualification(candidates, (candidate) => candidate.externalId);
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

  const originalById = uniqueDbRetryQualification(
    origins,
    (origin) => origin.problem.id,
  );
  const storedByExternalId = uniqueDbRetryQualification(stored, (row) =>
    String(row.external_id),
  );
  const groups = new Map<string, DbRetryCandidate[]>();
  for (const candidate of candidates) {
    const group = groups.get(candidate.sourceId) ?? [];
    group.push(candidate);
    groups.set(candidate.sourceId, group);
  }

  if (origins.length !== groups.size || stored.length !== candidates.length)
    throw new Error("원문/저장 모집단 불일치");
  const targets: Record<string, unknown>[] = [];
  for (const [sourceId, group] of groups) {
    const pair = [...group].sort((a, b) => a.slot - b.slot);
    if (pair.length !== 2 || pair[0]!.slot !== 1 || pair[1]!.slot !== 2)
      throw new Error("변형 슬롯 1과 2가 함께 필요하다");
    const origin = originalById.get(sourceId);
    if (!origin) throw new Error("현재 원문 근거 누락");
    const parent = origin.problem;
    if (
      parent.source !== "school_textbook" ||
      parent.pool !== "shared" ||
      parent.review_status !== "approved" ||
      parent.direct_use_allowed !== true ||
      parent.origin_problem_id !== null
    )
      throw new Error("사용 가능 교과서 원문이 아니다");

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
    candidatePayloadDigest: reviewDigest(candidates),
    renderDigest: reviewDigest(render),
    groups,
    originalById,
  };
}
