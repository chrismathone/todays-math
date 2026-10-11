// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type {
  DbRetryCandidate,
  DbRetryFigures,
  DbRetryOrigin,
  DbRetrySolutionReview,
} from "@/lib/import/schoolTextbook/dbRetry.types";
import {
  buildDbRetrySemanticQuestions,
  dbRetryAnswersAgree,
  dbRetryFigureDigest,
  dbRetryReviewBinding,
  reviewDbRetryPair,
  type DbRetryBlindRequest,
  type DbRetryReviewDependencies,
  type DbRetrySemanticRequest,
  type DbRetrySolutionRequest,
} from "@/lib/import/schoolTextbook/dbRetryReview";
import { reviewDigest } from "@/lib/import/schoolTextbook/qualification";
import { textbookVariantSourceDigest } from "@/lib/import/schoolTextbook/variants";

const empty = (): DbRetryFigures => ({ images: [], digest: reviewDigest([]) });
const origin = (): DbRetryOrigin => ({
  grade: "중1",
  chapter: "문자와 식",
  section: "일차방정식",
  problem: {
    id: "2ff8fe3f-4b29-408b-bf17-e1d5f92c2a39",
    source: "school_textbook",
    content: "$x+2=7$일 때 $x$의 값을 구하시오.",
    answer: "$x=5$",
    solution: "SECRET_ORIGINAL_SOLUTION",
    question_type: "단답형",
    direct_use_allowed: true,
    review_status: "approved",
    origin_problem_id: null,
    unit_id: "unit-1",
    source_material_id: "book-1",
    family_key: "family-1",
    external_id: "original-key",
    source_file: "source.hwp",
    updated_at: "2026-10-11T00:00:00Z",
    figure_svg: null,
    figure_urls: [],
    figure_dims: [],
    figure_source_mm: [],
    choice_figure_index: [],
  },
});
const pair = (source: DbRetryOrigin): [DbRetryCandidate, DbRetryCandidate] => {
  const candidate = (slot: 1 | 2): DbRetryCandidate => {
    return {
      sourceId: source.problem.id,
      sourceDigest: textbookVariantSourceDigest(source.problem),
      originProblemId: source.problem.id,
      sourceMaterialId: source.problem.source_material_id,
      unitId: source.problem.unit_id!,
      sourceExternalId: "original-key",
      sourceFile: "source.hwp",
      familyKey: "family-1",
      externalId: `tb-retry-v1:${source.problem.id}:${slot}`,
      source: "transformed" as const,
      questionType: "단답형" as const,
      slot,
      recipe:
        slot === 1
          ? ("ai-db-numbers-v1" as const)
          : ("ai-db-conditions-v1" as const),
      method: "SECRET_GENERATOR_METHOD",
      content: `$x+${slot + 2}=${slot + 9}$일 때 $x$의 값을 구하시오.`,
      answer: "$x=7$",
      solution: `양변에서 ${slot + 2}을 빼면 $x=7$이다.`,
      figureSvg: null,
      figureUrls: [],
      figureDims: [],
      figureSourceMm: [],
      choiceFigureIndex: [],
      validation: {
        version: "generator-v1",
        originalAnswerRecomputed: "SECRET_RECOMPUTED",
        checks: ["SECRET_CHECK"],
      },
    };
  };
  return [candidate(1), candidate(2)];
};
function dependencies(): DbRetryReviewDependencies {
  return {
    solveBlind: vi.fn(async (request: DbRetryBlindRequest) => ({
      model: request.model,
      usage: { inputTokens: 100, outputTokens: 60 },
      value: request.problems.map((problem) => ({
        id: problem.id,
        answer: problem.id === "original" ? "x = 5" : "x = 7",
        solution: "양변에서 상수항을 빼고 대입하여 확인하였다.",
        missingEvidence: [],
        ambiguous: false,
      })),
    })),
    reviewSolutions: vi.fn(async (request: DbRetrySolutionRequest) => ({
      model: request.model,
      value: request.problems.map(({ problem }) => ({
        id: problem.id as "slot-1" | "slot-2",
        agreesWithBlindSolution: true,
        allStepsValid: true,
        complete: true,
        missingEvidence: [],
        issues: [],
      })),
    })),
    reviewSemantics: vi.fn(async (request: DbRetrySemanticRequest) => ({
      model: "jev-1.13.0",
      usage: { inputTokens: 80, outputTokens: 30 },
      value: Object.fromEntries(
        Object.keys(request.questions).map((id) => [
          id,
          { type: "noul" as const, noul: 0.99 },
        ]),
      ),
    })),
  };
}
const fixture = () => {
  const source = origin();
  return {
    source,
    candidates: pair(source),
    figures: [empty(), empty()] as [DbRetryFigures, DbRetryFigures],
    deps: dependencies(),
  };
};
const run = (input: ReturnType<typeof fixture>) =>
  reviewDbRetryPair(input.source, input.candidates, empty(), input.figures, {
    dependencies: input.deps,
  });
const png = (
  choiceIndex = 0,
  kind: "database-raster" | "generated-svg" = "generated-svg",
): DbRetryFigures => {
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=";
  const image = {
    dataUrl: `data:image/png;base64,${base64}`,
    sha256: createHash("sha256")
      .update(Buffer.from(base64, "base64"))
      .digest("hex"),
    choiceIndex,
    origin: kind,
  };
  const bundle = { images: [image], digest: "" };
  bundle.digest = dbRetryFigureDigest(bundle);
  return bundle;
};

describe("DB retry independent reasoning gate", () => {
  it("keeps balance-blocked review pending and records only the HTTP status", async () => {
    const input = fixture();
    input.deps.solveBlind = vi.fn(async () => {
      throw Object.assign(new Error("SECRET_PROVIDER_BODY"), { status: 402 });
    });
    const review = await run(input);
    expect(review.passed).toBe(false);
    expect(review.issues).toContain(
      "blind-solve:provider-balance-insufficient",
    );
    expect(review.communications).toHaveLength(1);
    expect(review.communications[0]).toMatchObject({
      httpStatus: 402,
      status: "failed",
    });
    expect(JSON.stringify(review)).not.toContain("SECRET_PROVIDER_BODY");
    expect(input.deps.reviewSolutions).not.toHaveBeenCalled();
  });
  it("records three independent answers, two worked-solution reviews, six Noul probabilities and model usage", async () => {
    const input = fixture();
    const before = structuredClone(input.candidates);
    const review = await run(input);
    expect(review).toMatchObject({
      passed: true,
      kind: "machine-blind-reasoning-review",
      solverModel: "deepseek-v4-pro",
      solutionReviewerModel: "deepseek-v4-pro",
      semanticModel: "jev-1.13.0",
      sourceDigest: textbookVariantSourceDigest(input.source.problem),
      candidatePayloadDigest: reviewDigest(input.candidates),
      candidateFigureDigests: [empty().digest, empty().digest],
    });
    expect(review.blindSolutions.map((solution) => solution.id)).toEqual([
      "original",
      "slot-1",
      "slot-2",
    ]);
    expect(review.solutionReviews).toHaveLength(2);
    expect(Object.keys(review.semanticProbabilities)).toHaveLength(6);
    expect(
      review.communications.map((communication) => communication.phase),
    ).toEqual(["blind-solve", "solution-review", "semantic-review"]);
    expect(review.communications[0]).toMatchObject({
      requestedModel: "deepseek-v4-pro",
      returnedModel: "deepseek-v4-pro",
      inputTokens: 100,
      outputTokens: 60,
      status: "succeeded",
    });
    expect(
      review.communications.every(
        (communication) => communication.latencyMs >= 0,
      ),
    ).toBe(true);
    expect(input.candidates).toEqual(before);
    expect(Object.isFrozen(review)).toBe(true);
    expect(Object.isFrozen(review.blindSolutions[0])).toBe(true);
  });
  it("passes only question/type/actual figures to the solver and hides all author evidence", async () => {
    const input = fixture();
    await run(input);
    const request = vi.mocked(input.deps.solveBlind).mock.calls[0][0];
    for (const problem of request.problems)
      expect(Object.keys(problem).sort()).toEqual([
        "content",
        "figures",
        "id",
        "questionType",
      ]);
    expect(JSON.stringify(request.problems)).not.toMatch(
      /SECRET|sourceId|originProblemId|answer|solution|validation|familyKey/,
    );
    expect(Object.isFrozen(request.problems)).toBe(true);
    const solutionRequest = vi.mocked(input.deps.reviewSolutions).mock
      .calls[0][0];
    expect(solutionRequest.problems[0].proposedSolution).toEqual(
      input.candidates[0].solution,
    );
    expect(solutionRequest.problems[0].blindSolution.answer).toEqual("x = 7");
    expect(JSON.stringify(solutionRequest.problems)).not.toMatch(
      /SECRET_ORIGINAL|SECRET_RECOMPUTED|SECRET_GENERATOR/,
    );
    const semanticRequest = vi.mocked(input.deps.reviewSemantics).mock
      .calls[0][0];
    expect(JSON.stringify(semanticRequest)).not.toMatch(
      /SECRET|base64|proposedSolution/,
    );
    expect(Object.keys(semanticRequest.questions)).toHaveLength(6);
  });
  it.each(["original", "slot-1", "slot-2"] as const)(
    "rejects mismatched %s answer even with a perfect semantic stub",
    async (id) => {
      const input = fixture();
      const solve = input.deps.solveBlind;
      input.deps.solveBlind = vi.fn(async (request) => {
        const response = await solve(request);
        response.value.find((solution) => solution.id === id)!.answer = "x=99";
        return response;
      });
      const review = await run(input);
      expect(review.passed).toBe(false);
      expect(review.issues).toContain(`${id}:answer-mismatch`);
      expect(input.deps.reviewSolutions).not.toHaveBeenCalled();
      expect(input.deps.reviewSemantics).not.toHaveBeenCalled();
    },
  );
  it.each(["ambiguous", "missingEvidence", "unknown", "emptySolution"])(
    "rejects %s independent evidence",
    async (failure) => {
      const input = fixture();
      const solve = input.deps.solveBlind;
      input.deps.solveBlind = async (request) => {
        const response = await solve(request);
        const solution = response.value[1];
        if (failure === "ambiguous") solution.ambiguous = true;
        if (failure === "missingEvidence")
          solution.missingEvidence = ["조건 하나가 없다"];
        if (failure === "unknown") solution.answer = "미상";
        if (failure === "emptySolution") solution.solution = " ";
        return response;
      };
      expect((await run(input)).passed).toBe(false);
      expect(input.deps.reviewSemantics).not.toHaveBeenCalled();
    },
  );
  it("rejects omitted roots instead of extracting one matching number", async () => {
    const input = fixture();
    input.candidates[0].answer = "x=7, -7";
    const review = await run(input);
    expect(review.issues).toContain("slot-1:answer-mismatch");
  });
  it.each([
    "agreesWithBlindSolution",
    "allStepsValid",
    "complete",
    "missingEvidence",
    "issues",
  ] as const)("requires worked-solution %s evidence", async (field) => {
    const input = fixture();
    const assess = input.deps.reviewSolutions;
    input.deps.reviewSolutions = async (request) => {
      const response = await assess(request);
      const review = response.value[0];
      if (field === "missingEvidence" || field === "issues")
        review[field] = ["풀이 증거 부족"];
      else review[field] = false;
      return response;
    };
    const review = await run(input);
    expect(review.passed).toBe(false);
    expect(review.issues).toContain("slot-1:invalid-proposed-solution");
    expect(review.blindSolutions[1].answer).toEqual("x = 7");
    expect(review.solutionReviews).toHaveLength(2);
    expect(input.deps.reviewSemantics).not.toHaveBeenCalled();
  });
  it("keeps correct MC answers pending when a true substitution is labeled false (root pilot counterexample)", async () => {
    const input = fixture();
    input.source.problem.question_type = "객관식";
    input.source.problem.content =
      "$x-y=0$과 $x+y=10$의 해 $(x,y)$는?\n① $(5,5)$\n② $(3,6)$\n③ $(7,7)$";
    input.source.problem.answer = "①";
    input.candidates = pair(input.source);
    input.candidates.forEach((candidate) => {
      candidate.questionType = "객관식";
      candidate.content = `$2x-y=0$과 $x+y=${candidate.slot * 3 + 6}$의 해는?\n① $(5,5)$\n② $(${candidate.slot + 2},${candidate.slot * 2 + 4})$\n③ $(7,7)$`;
      candidate.answer = "②";
    });
    input.deps.solveBlind = async (request) => ({
      model: request.model,
      value: request.problems.map((problem) => ({
        id: problem.id,
        answer: problem.id === "original" ? "①" : "②",
        solution: "두 식을 소거하여 유일한 해를 구하고 모든 보기를 대입하였다.",
        missingEvidence: [],
        ambiguous: false,
      })),
    });
    input.candidates[0].solution =
      "$2\\times3-6=0$ (거짓)이므로 해당 보기를 제외한다. 정답은 ②이다.";
    input.deps.reviewSolutions = async (request) => ({
      model: request.model,
      value: request.problems.map(
        ({ problem, proposedSolution }): DbRetrySolutionReview => ({
          id: problem.id as "slot-1" | "slot-2",
          agreesWithBlindSolution: true,
          allStepsValid: !proposedSolution.includes("(거짓)"),
          complete: true,
          missingEvidence: [],
          issues: proposedSolution.includes("(거짓)")
            ? ["2*3-6=0 is true; false label invalidates choice elimination"]
            : [],
        }),
      ),
    });
    const review = await run(input);
    expect(review.passed).toBe(false);
    expect(review.solutionReviews[0].issues[0]).toContain("is true");
  });
  it.each(["sameLearningGoal", "sameLevel", "complete"])(
    "rejects weak %s semantics separately",
    async (dimension) => {
      const input = fixture();
      const semantic = input.deps.reviewSemantics;
      input.deps.reviewSemantics = async (request) => {
        const response = await semantic(request);
        response.value[`slot-2.${dimension}`].noul = 0.5;
        return response;
      };
      const review = await run(input);
      expect(review.passed).toBe(false);
      expect(review.issues).toContain(`slot-2.${dimension}:below-threshold`);
      expect(review.semanticProbabilities[`slot-2.${dimension}`]).toEqual(0.5);
    },
  );
  it("does not approve a different unit despite correct independent answers", async () => {
    const input = fixture();
    input.candidates[1].content = "$3+4$를 계산하시오.";
    const semantic = input.deps.reviewSemantics;
    input.deps.reviewSemantics = async (request) => {
      const response = await semantic(request);
      response.value["slot-2.sameLearningGoal"].noul = 0.03;
      return response;
    };
    expect((await run(input)).issues).toContain(
      "slot-2.sameLearningGoal:below-threshold",
    );
  });
  it.each(["missing", "wrongType", "nan", "outside", "extra"])(
    "rejects malformed Noul response: %s",
    async (shape) => {
      const input = fixture();
      const semantic = input.deps.reviewSemantics;
      input.deps.reviewSemantics = async (request) => {
        const response = await semantic(request);
        if (shape === "missing") delete response.value["slot-1.complete"];
        if (shape === "extra") response.value.extra = { type: "noul", noul: 1 };
        if (shape === "wrongType")
          response.value["slot-1.complete"] = {
            type: "choice",
            noul: 1,
          } as never;
        if (shape === "nan") response.value["slot-1.complete"].noul = NaN;
        if (shape === "outside") response.value["slot-1.complete"].noul = 1.1;
        return response;
      };
      expect((await run(input)).passed).toBe(false);
    },
  );
  it.each(["blind", "steps"])(
    "rejects duplicate or incomplete %s evidence",
    async (phase) => {
      const input = fixture();
      if (phase === "blind") {
        const solve = input.deps.solveBlind;
        input.deps.solveBlind = async (request) => {
          const response = await solve(request);
          response.value[2] = response.value[1];
          return response;
        };
      } else {
        const assess = input.deps.reviewSolutions;
        input.deps.reviewSolutions = async (request) => {
          const response = await assess(request);
          response.value.pop();
          return response;
        };
      }
      expect((await run(input)).passed).toBe(false);
    },
  );
  it.each(["solveBlind", "reviewSolutions", "reviewSemantics"] as const)(
    "records %s service failure without leaking arbitrary exception text",
    async (phase) => {
      const input = fixture();
      input.deps[phase] = vi.fn(async () => {
        throw new Error(
          "SECRET_CREDENTIAL https://secret-db.invalid data:image/png;base64,LEAK",
        );
      });
      const review = await run(input);
      expect(review.passed).toBe(false);
      expect(review.communications.at(-1)?.status).toBe("failed");
      expect(JSON.stringify(review)).not.toMatch(
        /SECRET_CREDENTIAL|secret-db|base64/,
      );
    },
  );
  it("bounds an injected hung dependency that ignores cancellation", async () => {
    const input = fixture();
    input.deps.solveBlind = vi.fn(() => new Promise<never>(() => {}));
    const review = await reviewDbRetryPair(
      input.source,
      input.candidates,
      empty(),
      input.figures,
      { dependencies: input.deps, reasoningTimeoutMs: 5 },
    );
    expect(review.issues).toContain("blind-solve:aborted-or-timeout");
  });
  it("aborts before calling any provider", async () => {
    const input = fixture();
    const controller = new AbortController();
    controller.abort();
    const review = await reviewDbRetryPair(
      input.source,
      input.candidates,
      empty(),
      input.figures,
      { dependencies: input.deps, signal: controller.signal },
    );
    expect(review.issues).toContain("review-aborted");
    expect(input.deps.solveBlind).not.toHaveBeenCalled();
  });
  it("never invokes a paid default dependency under Vitest even when keys are installed", async () => {
    const input = fixture();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const review = await reviewDbRetryPair(
      input.source,
      input.candidates,
      empty(),
      input.figures,
    );
    expect(review.passed).toBe(false);
    expect(review.issues).toContain("blind-solve:service-or-response-failure");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
  it("keeps explicitly configured semantic policy in the immutable evidence", async () => {
    const input = fixture();
    const review = await reviewDbRetryPair(
      input.source,
      input.candidates,
      empty(),
      input.figures,
      { dependencies: input.deps, thresholds: { sameLearningGoal: 1 } },
    );
    expect(review.semanticThresholds.sameLearningGoal).toBe(1);
    expect(review.passed).toBe(false);
    const invalid = await reviewDbRetryPair(
      input.source,
      input.candidates,
      empty(),
      input.figures,
      { dependencies: input.deps, thresholds: { complete: NaN } },
    );
    expect(invalid.issues).toContain("invalid-semantic-thresholds");
  });
});

describe("source, full pair and actual figure binding", () => {
  it.each([
    "one",
    "duplicateSlot",
    "parent",
    "unit",
    "digest",
    "external",
    "sameQuestion",
    "metadata",
    "wrongRecipe",
    "missingAnswer",
  ])("rejects malformed pair: %s before model calls", async (failure) => {
    const input = fixture();
    if (failure === "one") input.candidates.pop();
    if (failure === "duplicateSlot") input.candidates[1].slot = 1;
    if (failure === "parent")
      input.candidates[0].originProblemId = "different-source";
    if (failure === "unit") input.candidates[0].unitId = "different-unit";
    if (failure === "digest") input.candidates[0].sourceDigest = "old-digest";
    if (failure === "external")
      input.candidates[0].externalId = "wrong-slot-key";
    if (failure === "sameQuestion")
      input.candidates[1].content = input.candidates[0].content;
    if (failure === "metadata") input.candidates[0].figureDims = [10];
    if (failure === "wrongRecipe")
      input.candidates[1].recipe = "ai-db-numbers-v1";
    if (failure === "missingAnswer")
      input.candidates[0].answer = undefined as never;
    expect((await run(input)).passed).toBe(false);
    expect(input.deps.solveBlind).not.toHaveBeenCalled();
  });
  it("rejects a missing required source picture with zero text-only fallback calls", async () => {
    const input = fixture();
    input.source.problem.content += " 아래 그림을 참고하시오. [그림]";
    input.source.problem.figure_urls = ["/missing.png"];
    input.source.problem.choice_figure_index = [0];
    input.candidates = pair(input.source);
    const review = await run(input);
    expect(review.issues).toContain("original:missing-figure");
    expect(input.deps.solveBlind).not.toHaveBeenCalled();
  });
  it("sends actual source/candidate pictures to flash, preserving choice indices", async () => {
    const input = fixture();
    input.source.problem.figure_svg = "<svg>source</svg>";
    input.candidates = pair(input.source);
    input.candidates.forEach((candidate) => {
      candidate.figureSvg = `<svg>slot-${candidate.slot}</svg>`;
    });
    input.figures = [png(), png()];
    const sourceFigure = png(0, "database-raster");
    const review = await reviewDbRetryPair(
      input.source,
      input.candidates,
      sourceFigure,
      input.figures,
      { dependencies: input.deps },
    );
    expect(review.passed).toBe(true);
    expect(review.solverModel).toBe("deepseek-flash");
    expect(review.solutionReviewerModel).toBe("deepseek-flash");
    const request = vi.mocked(input.deps.solveBlind).mock.calls[0][0];
    expect(request.problems[0].figures.images[0].dataUrl).toEqual(
      sourceFigure.images[0].dataUrl,
    );
    expect(request.problems[1].figures.images[0].choiceIndex).toBe(0);
    expect(JSON.stringify(review)).not.toContain("base64");
  });
  it.each([
    "badHash",
    "badData",
    "forgedDigest",
    "invalidMagic",
    "badRawHash",
    "choiceMismatch",
    "rasterReuse",
  ])("rejects picture evidence failure: %s", async (failure) => {
    const input = fixture();
    input.source.problem.figure_urls = ["/original.png"];
    input.source.problem.choice_figure_index = [0];
    input.candidates = pair(input.source);
    const figures = png(0, "database-raster");
    if (failure === "badHash") figures.images[0].sha256 = "0".repeat(64);
    if (failure === "badData")
      figures.images[0].dataUrl = "https://example.invalid/image.png";
    if (failure === "forgedDigest") figures.digest = "0".repeat(64);
    if (failure === "invalidMagic") {
      figures.images[0].dataUrl = "data:image/png;base64,YWJj";
      figures.images[0].sha256 = createHash("sha256")
        .update("abc")
        .digest("hex");
    }
    if (failure === "badRawHash") figures.images[0].sourceSha256 = "invalid";
    if (failure === "choiceMismatch") {
      figures.images[0].choiceIndex = 1;
      figures.digest = dbRetryFigureDigest(figures);
    }
    if (failure === "rasterReuse") {
      input.candidates[0].figureSvg = "<svg/>";
      input.figures[0] = png(0, "database-raster");
    }
    const review = await reviewDbRetryPair(
      input.source,
      input.candidates,
      figures,
      input.figures,
      { dependencies: input.deps },
    );
    expect(review.passed).toBe(false);
    expect(input.deps.solveBlind).not.toHaveBeenCalled();
  });
  it("invalidates any origin, candidate, figure-byte, raw-source-byte or figure-order change", () => {
    const input = fixture();
    const sourceFigure = png(0, "database-raster");
    const bind = () =>
      dbRetryReviewBinding(
        input.source,
        input.candidates,
        sourceFigure,
        input.figures,
      );
    const first = bind();
    input.source.grade = "중2";
    expect(bind().bindingDigest).not.toBe(first.bindingDigest);
    input.source.grade = "중1";
    input.source.problem.answer = "x=6";
    expect(bind().sourceDigest).not.toBe(first.sourceDigest);
    input.source.problem.answer = "$x=5$";
    input.candidates[0].validation.checks.push("new-evidence");
    expect(bind().candidatePayloadDigest).not.toBe(
      first.candidatePayloadDigest,
    );
    input.candidates[0].validation.checks.pop();
    input.candidates[1].solution += "changed-step";
    expect(bind().bindingDigest).not.toBe(first.bindingDigest);
    input.candidates[1].solution = pair(input.source)[1].solution;
    sourceFigure.images[0].sourceSha256 = "a".repeat(64);
    expect(bind().bindingDigest).not.toBe(first.bindingDigest);
    expect(dbRetryFigureDigest(sourceFigure)).not.toBe(
      first.sourceFigureDigest,
    );
    sourceFigure.images[0].sourceSha256 = undefined;
    const oldData = sourceFigure.images[0].dataUrl;
    const changed = Buffer.from(oldData.split(",")[1], "base64");
    changed[changed.length - 1] ^= 1;
    sourceFigure.images[0].dataUrl = `data:image/png;base64,${changed.toString("base64")}`;
    expect(bind().bindingDigest).not.toBe(first.bindingDigest);
    sourceFigure.images[0].dataUrl = oldData;
    sourceFigure.images.push({ ...sourceFigure.images[0], choiceIndex: 1 });
    const ordered = bind().bindingDigest;
    sourceFigure.images.reverse();
    expect(bind().bindingDigest).not.toBe(ordered);
  });
  it("rejects asynchronous caller changes and retains the initially reviewed digest", async () => {
    const input = fixture();
    const initial = dbRetryReviewBinding(
      input.source,
      input.candidates,
      empty(),
      input.figures,
    );
    const solve = input.deps.solveBlind;
    input.deps.solveBlind = async (request) => {
      input.candidates[0].solution += "wrong added step";
      return solve(request);
    };
    const review = await run(input);
    expect(review.passed).toBe(false);
    expect(review.issues).toContain("inputs-changed-during-review");
    expect(review.bindingDigest).toEqual(initial.bindingDigest);
  });
});

describe("conservative answer equality", () => {
  it.each([
    ["$5$", "\\(5\\)"],
    ["\\dfrac{1}{2}", "0.50"],
    ["−2", "-2.0"],
    ["\\frac{-2}{4}", "-0.5"],
    ["$x = 2$", "\\(x=2.0\\)"],
    ["$x=2,\\;y=3$", "$(x,y)=(2,3)$"],
    ["y=3,x=2", "x=2,y=3"],
    ["0", "\\frac{0}{-2}"],
    ["x^2+2x+1", "x^{2}+2x+1"],
    ["$7x^{2}-10xy-2y^{2}$", "7x^2 - 10xy - 2y^2"],
    ["(1) $5$ (2) $\\sqrt{6}$ (3) $\\frac{1}{4}$", "(1) 5, (2) √6, (3) 1/4"],
  ])("normalizes only supported formats: %s versus %s", (stored, blind) => {
    expect(
      dbRetryAnswersAgree(stored, blind, "단답형", "변수의 값을 구하시오."),
    ).toBe(true);
  });
  it.each([
    ["2", "x=2"],
    ["x=2", "y=2"],
    ["x=2,y=3", "(2,3)"],
    ["(2,3)", "(3,2)"],
    ["x=2,-2", "x=2"],
    ["2 cm", "2 m"],
    ["5", "정답은 5이다"],
    ["0.333333", "\\frac{1}{3}"],
    ["x=2,y=3", "x=2,y=4"],
    ["미상", "미상"],
    ["", ""],
    ["x=2,x=2", "x=2"],
    ["x y", "xy"],
    ["\\frac{1}{0}", "0"],
    ["\\frac{1}{0}", "\\frac{1}{0}"],
    ["1/0", "1/0"],
    ["x=NaN", "x=NaN"],
    ["x^{2+1}", "x^2+1"],
    ["(1) $5$ (2) $4$", "(1) 5 (2) 3"],
    ["(1) $5$ (2) $4$", "(1) 5"],
    ["(1) $5$ (2) $4$", "(2) 4 (1) 5"],
  ])("does not erase meaning: %s versus %s", (stored, blind) =>
    expect(dbRetryAnswersAgree(stored, blind, "단답형", "문제")).toBe(false),
  );
  const mc = "$x$의 값은?\n① $x=1$\n② $x=2$\n③ $x=3$\n④ $x=4$\n⑤ $x=5$";
  it.each([
    ["②", "2"],
    ["2번", "②"],
    ["②", "$x=2$"],
    ["정답: 2", "②"],
  ])(
    "matches MC choice label or unique explicit value: %s / %s",
    (stored, blind) =>
      expect(dbRetryAnswersAgree(stored, blind, "객관식", mc)).toBe(true),
  );
  it.each([
    ["②", "③"],
    ["2", "1"],
    ["②", "2,3"],
    ["⑥", "⑥"],
    ["2", "x=5"],
  ])(
    "rejects wrong/multiple/out-of-range MC answer: %s / %s",
    (stored, blind) =>
      expect(dbRetryAnswersAgree(stored, blind, "객관식", mc)).toBe(false),
  );
  it("supports sequential numeric choice lines without confusing math numbers", () => {
    expect(
      dbRetryAnswersAgree(
        "2",
        "②",
        "객관식",
        "$x$는?\n1. $x=1$\n2. $x=2$\n3. $x=3$",
      ),
    ).toBe(true);
    expect(
      dbRetryAnswersAgree(
        "②",
        "x=2",
        "객관식",
        "값은?\n① $x=2$\n② $x=2$\n③ $x=3$",
      ),
    ).toBe(false);
    expect(dbRetryAnswersAgree("②", "②", "객관식", "값은?\n① $1$\n③ $3$")).toBe(
      false,
    );
    expect(dbRetryAnswersAgree("2", "2", "객관식", "보기가 누락되었다.")).toBe(
      false,
    );
  });
  it("compares all selected labels only when the question explicitly requests all choices", () => {
    const content =
      "다음 중 옳은 것을 모두 고르면?\n① $1$\n② $2$\n③ $3$\n④ $4$";
    expect(dbRetryAnswersAgree("③, ④", "④,③", "객관식", content)).toBe(true);
    for (const wrong of ["③", "③,②", "③,④,④", "③,⑥"])
      expect(dbRetryAnswersAgree("③,④", wrong, "객관식", content)).toBe(false);
    expect(dbRetryAnswersAgree("③,④", "③,④", "객관식", mc)).toBe(false);
  });
  it("asks six separate Noul questions whose meaning includes their state path", () => {
    const questions = buildDbRetrySemanticQuestions();
    expect(Object.keys(questions)).toHaveLength(6);
    for (const [id, question] of Object.entries(questions)) {
      expect(question.type).toBe("noul");
      expect(question.instructions).toContain(`problems[${id[5]}]`);
      expect(question.criteria.true).toBeTruthy();
      expect(question.criteria.false).toBeTruthy();
    }
    expect(questions["slot-1.complete"].instructions).toContain(
      "not proof of mathematical truth",
    );
  });
});
