/** Grouped evidence remains a grouped proof, with its actual shared receipts and case attribution. */
import type {
  CodexDbRetryBatchReview,
  CodexRetryBatchInput,
} from "./codexRetryBatch.types";
import {
  CODEX_RETRY_BATCH_VERSION,
  codexRetryBatchBinding,
  verifyCodexBatchCommunication,
} from "./codexRetryBatchReview";
import { validateCodexRetryCaseQualification } from "./codexRetryCaseQualification";
import {
  validateDbRetryQualificationRows,
  uniqueDbRetryQualification,
  type DbRetryQualificationRowsInput,
} from "./dbRetryQualificationRows";
import { reviewDigest } from "./qualification";

export interface CodexRetryBatchQualificationInput extends DbRetryQualificationRowsInput {
  batches: readonly {
    review: CodexDbRetryBatchReview;
    inputs: readonly CodexRetryBatchInput[];
    artifactRoot: string;
  }[];
}
const same = (a: unknown, b: unknown) => reviewDigest(a) === reviewDigest(b);
const ordered = (values: unknown) => {
  if (
    !Array.isArray(values) ||
    values.some((v) => !v || typeof v.id !== "string") ||
    new Set(values.map((v) => v.id)).size !== values.length
  )
    throw new Error("중복/누락 단계 결과");
  return [...values].sort((a, b) => a.id.localeCompare(b.id));
};
export function prepareCodexRetryBatchQualification(
  input: CodexRetryBatchQualificationInput,
) {
  const base = validateDbRetryQualificationRows(input);
  if (!input.batches.length) throw new Error("묶음 검토 필요");
  const selected = new Set(base.groups.keys()),
    verified = new Set<string>(),
    threads = new Set<string>();
  uniqueDbRetryQualification(input.batches, (b) => b.review.batchDigest);
  for (const batch of input.batches) {
    const { review, inputs, artifactRoot } = batch;
    const binding = codexRetryBatchBinding(inputs);
    if (
      review.kind !== "machine-codex-batch-blind-review" ||
      review.version !== CODEX_RETRY_BATCH_VERSION ||
      review.issues.length ||
      review.batchDigest !== binding.batchDigest ||
      !same(review.inputBindings, binding.inputBindings) ||
      review.cases.length !== inputs.length ||
      review.communications.length !== 3
    )
      throw new Error("묶음 검토의 현재 원문/후보/실행 근거 불일치");
    const cases = uniqueDbRetryQualification(review.cases, (c) => c.sourceId);
    const phases = [
      "blind-solve",
      "solution-review",
      "semantic-review",
    ] as const;
    review.communications.forEach((call, index) => {
      if (
        call.phase !== phases[index] ||
        call.status !== "succeeded" ||
        call.auth !== "chatgpt" ||
        !call.threadId?.trim() ||
        threads.has(call.threadId.trim())
      )
        throw new Error("묶음 검토에 실제 독립 세션 세 개 필요");
      threads.add(call.threadId.trim());
      verifyCodexBatchCommunication(call, artifactRoot);
      const raw = call.rawOutput as {
        cases?: {
          caseId: string;
          solutions?: unknown[];
          reviews?: unknown[];
        }[];
      };
      if (
        !Array.isArray(raw?.cases) ||
        raw.cases.length !== call.caseIds.length ||
        new Set(raw.cases.map((c) => c.caseId)).size !== raw.cases.length ||
        !same(
          [...raw.cases.map((c) => c.caseId)].sort(),
          [...call.caseIds].sort(),
        ) ||
        call.caseIds.some((id) => !review.cases.some((c) => c.caseId === id))
      )
        throw new Error("묶음 실제 출력의 문항 연결 불일치");
    });
    for (let index = 0; index < inputs.length; index++) {
      const current = inputs[index]!,
        expected = binding.inputBindings[index]!,
        item = cases.get(expected.sourceId);
      if (
        !item ||
        !same(
          Object.fromEntries(
            Object.keys(expected).map((key) => [
              key,
              item[key as keyof typeof item],
            ]),
          ),
          expected,
        )
      )
        throw new Error("원문별 묶음 연결 불일치");
      if (!selected.has(item.sourceId)) continue;
      if (
        verified.has(item.sourceId) ||
        item.passed !== true ||
        item.issues.length
      )
        throw new Error("통과한 독립 원문 쌍만 선택 가능");
      const pair = [...base.groups.get(item.sourceId)!].sort(
        (a, b) => a.slot - b.slot,
      );
      const origin = base.originalById.get(item.sourceId)!;
      if (!same(origin, current.origin) || !same(pair, current.candidates))
        throw new Error("승격 문안/출처와 묶음 입력 불일치");
      validateCodexRetryCaseQualification(origin.problem, pair, item);
      const expectedOutputs = [
        item.blindSolutions,
        item.solutionReviews,
        item.semanticReviews,
      ];
      review.communications.forEach((call, phase) => {
        if (!call.caseIds.includes(item.caseId))
          throw new Error("통과 문항의 검토 단계 누락");
        const raw = call.rawOutput as {
          cases: {
            caseId: string;
            solutions?: unknown[];
            reviews?: unknown[];
          }[];
        };
        const row = raw.cases.find((r) => r.caseId === item.caseId);
        if (
          !row ||
          !same(
            ordered(phase === 0 ? row.solutions : row.reviews),
            ordered(expectedOutputs[phase]),
          )
        )
          throw new Error("실제 묶음 검산과 원문별 결과 불일치");
      });
      verified.add(item.sourceId);
    }
  }
  if (verified.size !== base.pairs)
    throw new Error("일부 선택 쌍의 묶음 근거 누락");
  return {
    ids: base.ids,
    before: base.before,
    origins: base.origins,
    pairs: base.pairs,
    candidatePayloadDigest: base.candidatePayloadDigest,
    renderDigest: base.renderDigest,
    proofKind: "machine-codex-batch-blind-review" as const,
    reviewDigest: reviewDigest(input.batches.map((b) => b.review)),
  };
}
