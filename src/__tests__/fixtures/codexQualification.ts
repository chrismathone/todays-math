/** Synthetic approval boundary inputs for unit tests only. No real inference evidence. */
import type { CodexRetryQualificationInput } from "@/lib/import/schoolTextbook/codexRetryQualification";
import type { DbRetryCandidate } from "@/lib/import/schoolTextbook/dbRetry.types";
import type { CodexDbRetryPairReview } from "@/lib/import/schoolTextbook/codexRetry.types";
import {
  CODEX_RETRY_REVIEW_VERSION,
  CODEX_RETRY_SEMANTIC_DIMENSIONS,
} from "@/lib/import/schoolTextbook/codexRetryReview";
import {
  reviewDigest,
  retryReviewPayloadDigest,
} from "@/lib/import/schoolTextbook/qualification";
export function codexQualificationFixture(): CodexRetryQualificationInput {
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
  const blindSolutions = (["original", "slot-1", "slot-2"] as const).map(
    (id) => ({
      id,
      answer:
        id === "original" ? "5" : candidates[id === "slot-1" ? 0 : 1]!.answer,
      solution: "독립 계산",
      missingEvidence: [],
      ambiguous: false,
    }),
  );
  const solutionReviews = (["slot-1", "slot-2"] as const).map((id) => ({
    id,
    agreesWithBlindSolution: true,
    allStepsValid: true,
    complete: true,
    missingEvidence: [],
    issues: [],
    evidence: ["각 등식을 직접 계산했다"],
  }));
  const semanticReviews = (["slot-1", "slot-2"] as const).map((id) => ({
    id,
    ...Object.fromEntries(
      CODEX_RETRY_SEMANTIC_DIMENSIONS.map((d) => [
        d,
        {
          passed: true,
          evidence: {
            original: "2+3",
            candidate: "4+3",
            reason: d + "구체적인 검토",
          },
        },
      ]),
    ),
    missingEvidence: [],
    issues: [],
  })) as unknown as CodexDbRetryPairReview["semanticReviews"];
  const outputs = [
    { solutions: blindSolutions },
    { reviews: solutionReviews },
    { reviews: semanticReviews },
  ];
  const communications = (
    ["blind-solve", "solution-review", "semantic-review"] as const
  ).map((phase, index) => ({
    phase,
    status: "succeeded" as const,
    auth: "chatgpt" as const,
    threadId: "test-only-" + phase,
    model: null,
    usage: null,
    elapsedMs: 1,
    inputDigest: reviewDigest(phase),
    schemaDigest: reviewDigest({ phase }),
    imageSha256s: [],
    outputDigest: reviewDigest(outputs[index]),
    receiptDigest: reviewDigest({ testOnly: true, phase }),
    receipt: {
      version: "codex-chatgpt-json-v1" as const,
      phase,
      auth: "chatgpt" as const,
      cliVersion: "test-only",
      requestedModel: "codex-account-default" as const,
      model: null,
      modelObserved: false,
      threadId: "test-only-" + phase,
      exitCode: 0 as const,
      signal: null,
      status: "succeeded" as const,
      reason: null,
      turnCompleted: true as const,
      schemaValid: true as const,
      promptSha256: reviewDigest(phase),
      schemaSha256: reviewDigest({ phase }),
      images: [],
      outputSha256: reviewDigest(outputs[index]),
      receiptPath: "test-fixture/receipt.json",
      outputPath: "test-fixture/output.json",
    },
  }));
  const review: CodexDbRetryPairReview = {
    ...structuredClone(binding),
    version: CODEX_RETRY_REVIEW_VERSION,
    kind: "machine-codex-blind-review",
    passed: true,
    blindSolutionsDigest: reviewDigest(blindSolutions),
    blindSolutions,
    solutionReviews,
    semanticReviews,
    communications,
    issues: [],
  };
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
