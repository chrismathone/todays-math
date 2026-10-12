// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type {
  DbRetryCandidate,
  DbRetryFigures,
  DbRetryOrigin,
} from "@/lib/import/schoolTextbook/dbRetry.types";
import type {
  CodexRetryJsonRequest,
  RunCodexJson,
} from "@/lib/import/schoolTextbook/codexRetry.types";
import {
  CODEX_RETRY_SEMANTIC_DIMENSIONS,
  reviewCodexDbRetryPair,
} from "@/lib/import/schoolTextbook/codexRetryReview";
import {
  dbRetryFigureDigest,
  dbRetryReviewBinding,
} from "@/lib/import/schoolTextbook/dbRetryReviewBinding";
import { reviewDigest } from "@/lib/import/schoolTextbook/qualification";
import { textbookVariantSourceDigest } from "@/lib/import/schoolTextbook/variants";

// The offline import graph must never load a paid provider or the existing paid reviewer.
vi.mock("openai", () => {
  throw new Error("paid-provider-imported");
});
vi.mock("@/lib/import/schoolTextbook/dbRetryReview", () => {
  throw new Error("paid-reviewer-imported");
});

const empty = (): DbRetryFigures => ({ images: [], digest: reviewDigest([]) });
function fixture() {
  const origin: DbRetryOrigin = {
    grade: "중1",
    chapter: "문자와 식",
    section: "일차방정식",
    problem: {
      id: "original-id",
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
  };
  const candidates: DbRetryCandidate[] = [1, 2].map((n) => ({
    sourceId: origin.problem.id,
    sourceDigest: textbookVariantSourceDigest(origin.problem),
    originProblemId: origin.problem.id,
    sourceMaterialId: "book-1",
    unitId: "unit-1",
    sourceExternalId: "original-key",
    sourceFile: "source.hwp",
    familyKey: "family-1",
    externalId: `tb-retry-v1:${origin.problem.id}:${n}`,
    source: "transformed",
    questionType: "단답형",
    slot: n as 1 | 2,
    recipe: n === 1 ? "ai-db-numbers-v1" : "ai-db-conditions-v1",
    method: "SECRET_AUTHOR_METHOD",
    content:
      n === 1
        ? "$x+3=10$일 때 $x$의 값을 구하시오."
        : "$2x+4=18$일 때 $x$의 값을 구하시오.",
    answer: "$x=7$",
    solution: n === 1 ? "$x=10-3=7$이다." : "$2x=14$이므로 $x=7$이다.",
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
  }));
  const blind = {
    solutions: [
      {
        id: "original",
        answer: "x=5",
        solution: "x=7-2=5; 대입하면 5+2=7.",
        missingEvidence: [],
        ambiguous: false,
      },
      {
        id: "slot-1",
        answer: "x=7",
        solution: "x=10-3=7; 대입하면 7+3=10.",
        missingEvidence: [],
        ambiguous: false,
      },
      {
        id: "slot-2",
        answer: "x=7",
        solution: "2x=18-4=14; x=7; 대입하면 2*7+4=18.",
        missingEvidence: [],
        ambiguous: false,
      },
    ],
  };
  const solutions = {
    reviews: ["slot-1", "slot-2"].map((id, index) => ({
      id,
      agreesWithBlindSolution: true,
      allStepsValid: true,
      complete: true,
      missingEvidence: [] as string[],
      issues: [] as string[],
      evidence: [
        index === 0
          ? "10-3=7 and 7+3=10; no excluded domain."
          : "18-4=14, 14/2=7, and 2*7+4=18; no excluded domain.",
      ],
    })),
  };
  const semantics = {
    reviews: ["slot-1", "slot-2"].map((id, index) => ({
      id,
      ...Object.fromEntries(
        CODEX_RETRY_SEMANTIC_DIMENSIONS.map((dimension) => [
          dimension,
          {
            passed: true,
            evidence: {
              original: "x+2=7",
              candidate: index === 0 ? "x+3=10" : "2x+4=18",
              reason: `${dimension}: solve a one-variable linear equation with middle-school equality operations; constants ${index === 0 ? "2 and 7 become 3 and 10" : "change and coefficient 2 adds a division step"}.`,
            },
          },
        ]),
      ),
      missingEvidence: [] as string[],
      issues: [] as string[],
    })),
  };
  const requests: CodexRetryJsonRequest[] = [];
  const responses = {
    "blind-solve": blind,
    "solution-review": solutions,
    "semantic-review": semantics,
  };
  const runner = vi.fn<RunCodexJson>(async (request) => {
    requests.push(structuredClone(request));
    return {
      value: responses[request.phase],
      auth: "chatgpt",
      threadId: `thread-${request.phase}`,
      model: null,
      usage: { inputTokens: 100, cachedInputTokens: 0, outputTokens: 60 },
      elapsedMs: 10,
      receipt: {
        version: "codex-chatgpt-json-v1",
        cliVersion: "test-only",
        phase: request.phase,
        auth: "chatgpt",
        requestedModel: "codex-account-default",
        model: null,
        modelObserved: false,
        threadId: `thread-${request.phase}`,
        exitCode: 0,
        signal: null,
        status: "succeeded",
        reason: null,
        turnCompleted: true,
        schemaValid: true,
        promptSha256: createHash("sha256").update(request.prompt).digest("hex"),
        schemaSha256: createHash("sha256")
          .update(JSON.stringify(request.schema))
          .digest("hex"),
        images: (request.images ?? []).map((url) => {
          const bytes = Buffer.from(url.split(",")[1], "base64");
          return {
            sha256: createHash("sha256").update(bytes).digest("hex"),
            bytes: bytes.length,
            width: 1,
            height: 1,
          };
        }),
        outputSha256: createHash("sha256")
          .update(JSON.stringify(responses[request.phase]))
          .digest("hex"),
        receiptPath: `${request.outDir}/receipt.json`,
        outputPath: `${request.outDir}/output.json`,
      },
    };
  });
  return {
    origin,
    candidates,
    sourceFigures: empty(),
    candidateFigures: [empty(), empty()],
    blind,
    solutions,
    semantics,
    requests,
    runner,
  };
}
type Fixture = ReturnType<typeof fixture>;
const run = (f: Fixture, options = {}) =>
  reviewCodexDbRetryPair(
    f.origin,
    f.candidates,
    f.sourceFigures,
    f.candidateFigures,
    { runCodexJson: f.runner, outDir: "test-artifacts", ...options },
  );
const state = (request: CodexRetryJsonRequest) =>
  JSON.parse(request.prompt.split("\nINPUT_JSON\n")[1]);
function png(): DbRetryFigures {
  const bytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=",
    "base64",
  );
  const figures = {
    images: [
      {
        dataUrl: `data:image/png;base64,${bytes.toString("base64")}`,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        choiceIndex: 0,
        origin: "generated-svg" as const,
      },
    ],
    digest: "",
  };
  figures.digest = dbRetryFigureDigest(figures);
  return figures;
}

describe("offline Codex subscription review (injected fixtures, no real CLI inference)", () => {
  it("uses three distinct sessions and explicit booleans without inventing model names or probabilities", async () => {
    const f = fixture();
    const result = await run(f);
    expect(result).toMatchObject({
      passed: true,
      kind: "machine-codex-blind-review",
      issues: [],
      blindSolutionsDigest: reviewDigest(f.blind.solutions),
    });
    expect(result.communications.map((c) => c.phase)).toEqual([
      "blind-solve",
      "solution-review",
      "semantic-review",
    ]);
    expect(new Set(result.communications.map((c) => c.threadId)).size).toBe(3);
    expect(
      result.communications.every(
        (c) =>
          c.model === null &&
          c.auth === "chatgpt" &&
          c.outputDigest &&
          c.receiptDigest,
      ),
    ).toBe(true);
    expect(result.communications[0].usage).toEqual({
      inputTokens: 100,
      cachedInputTokens: 0,
      outputTokens: 60,
    });
    expect(JSON.stringify(result)).not.toMatch(
      /semanticProbabilities|semanticThresholds|human-review|noul/,
    );
    expect(f.requests.every((r) => !("model" in r))).toBe(true);
    expect(new Set(f.requests.map((r) => r.outDir)).size).toBe(3);
    expect(Object.isFrozen(result.blindSolutions[0])).toBe(true);
  });
  it("whitelists the blind prompt and hides all answer/author/source fields", async () => {
    const f = fixture();
    await run(f);
    expect(state(f.requests[0])).toEqual({
      problems: [
        {
          id: "original",
          content: f.origin.problem.content,
          questionType: "단답형",
          images: [],
        },
        ...f.candidates.map((c) => ({
          id: `slot-${c.slot}`,
          content: c.content,
          questionType: c.questionType,
          images: [],
        })),
      ],
    });
    expect(f.requests[0].prompt).not.toMatch(
      /SECRET|original-id|source\.hwp|x=5|x=7/,
    );
    expect(state(f.requests[1]).frozenBlindSolutions).toEqual(
      f.blind.solutions,
    );
    expect(state(f.requests[1]).proposedSolutions[0].solution).toBe(
      f.candidates[0].solution,
    );
    expect(f.requests[2].prompt).not.toContain("SECRET_AUTHOR_METHOD");
    expect(state(f.requests[2])).not.toHaveProperty("proposedSolutions");
    expect(state(f.requests[2]).frozenBlindSolutions).toEqual(
      f.blind.solutions,
    );
  });
  it("binds every raw source field, entire candidate DTO, actual byte and phase output", async () => {
    const f = fixture();
    f.candidates[0].figureSvg = "<svg/>";
    f.candidateFigures[0] = png();
    const result = await run(f);
    expect(result.passed).toBe(true);
    const image = f.candidateFigures[0].images[0];
    expect(f.requests.every((r) => r.images?.[0] === image.dataUrl)).toBe(true);
    expect(state(f.requests[0]).problems[1].images).toEqual([
      { attachment: 1, choiceIndex: 0 },
    ]);
    expect(result.communications[0].imageSha256s).toEqual([image.sha256]);
    expect(result.communications[0].outputDigest).toBe(reviewDigest(f.blind));
    const binding = () =>
      dbRetryReviewBinding(
        f.origin,
        f.candidates,
        f.sourceFigures,
        f.candidateFigures,
      );
    expect(binding().bindingDigest).toBe(result.bindingDigest);
    f.origin.problem.unmodeledAuditField = "changed";
    expect(binding().sourceDigest).not.toBe(result.sourceDigest);
    delete f.origin.problem.unmodeledAuditField;
    f.candidates[0].validation.checks.push("changed");
    expect(binding().candidatePayloadDigest).not.toBe(
      result.candidatePayloadDigest,
    );
    f.candidates[0].validation.checks.pop();
    image.dataUrl = image.dataUrl.replace("iVBOR", "aVBOR");
    expect(binding().bindingDigest).not.toBe(result.bindingDigest);
  });
  it("has no default paid or CLI execution when runner is omitted", async () => {
    const f = fixture();
    const result = await run(f, { runCodexJson: undefined });
    expect(result.passed).toBe(false);
    expect(result.issues).toContain("missing-codex-runner");
    expect(f.runner).not.toHaveBeenCalled();
  });
  it.each(["original", "slot-1", "slot-2"])(
    "reconciles the frozen %s answer before revealing proposals",
    async (id) => {
      const f = fixture();
      f.blind.solutions.find((s) => s.id === id)!.answer = "x=123";
      const result = await run(f);
      expect(result.issues).toContain(`${id}:answer-mismatch`);
      expect(f.runner).toHaveBeenCalledTimes(1);
      expect(result.blindSolutionsDigest).toBe(
        reviewDigest(result.blindSolutions),
      );
    },
  );
  it.each([
    ["x=2,3", "x=2"],
    ["(1) x=2; (2) y=3", "(1) x=2"],
    ["5cm", "5"],
  ])(
    "does not erase missing roots, subparts or units (%s)",
    async (expected, actual) => {
      const f = fixture();
      f.candidates[0].answer = expected;
      f.blind.solutions[1].answer = actual;
      expect((await run(f)).issues).toContain("slot-1:answer-mismatch");
    },
  );
  it.each(["ambiguous", "missingEvidence", "solution"])(
    "fails unresolved blind evidence: %s",
    async (field) => {
      const f = fixture();
      Object.assign(f.blind.solutions[0], {
        [field]:
          field === "ambiguous"
            ? true
            : field === "missingEvidence"
              ? ["unreadable axis"]
              : "unknown",
      });
      expect((await run(f)).passed).toBe(false);
      expect(f.runner).toHaveBeenCalledTimes(1);
    },
  );
  it("rejects duplicate blind IDs even with three outputs", async () => {
    const f = fixture();
    f.blind.solutions[2].id = "slot-1";
    expect((await run(f)).issues).toContain(
      "blind-solve:duplicate-or-missing-id",
    );
  });
  it.each(["allStepsValid", "complete", "agreesWithBlindSolution"])(
    "does not let a matching final answer excuse %s",
    async (field) => {
      const f = fixture();
      Object.assign(f.solutions.reviews[0], { [field]: false });
      expect((await run(f)).issues).toContain(
        "slot-1:invalid-proposed-solution",
      );
      expect(f.runner).toHaveBeenCalledTimes(2);
    },
  );
  it("requires specific worked-solution evidence", async () => {
    const f = fixture();
    f.solutions.reviews[0].evidence = [];
    expect((await run(f)).issues).toContain(
      "solution-review:malformed-response",
    );
  });
  it.each(CODEX_RETRY_SEMANTIC_DIMENSIONS)(
    "fails the independent %s dimension",
    async (dimension) => {
      const f = fixture();
      Object.assign(f.semantics.reviews[0], {
        [dimension]: {
          passed: false,
          evidence: {
            original: "x+2=7",
            candidate: "renamed only",
            reason: "The required criterion is absent.",
          },
        },
      });
      expect((await run(f)).issues).toContain(`slot-1:${dimension}:failed`);
    },
  );
  it("rejects fake probabilities and missing semantic evidence", async () => {
    const f = fixture();
    Object.assign(f.semantics.reviews[0], {
      complete: {
        passed: 1,
        evidence: { original: "", candidate: "", reason: "" },
      },
    });
    expect((await run(f)).issues).toContain(
      "semantic-review:malformed-response",
    );
  });
  it.each(["solution-review", "semantic-review"] as const)(
    "rejects duplicate IDs in %s",
    async (phase) => {
      const f = fixture();
      const reviews =
        phase === "solution-review" ? f.solutions.reviews : f.semantics.reviews;
      reviews[1].id = "slot-1";
      expect((await run(f)).issues).toContain(
        `${phase}:duplicate-or-missing-id`,
      );
    },
  );
  it.each(["api-key", "missing-thread", "missing-receipt", "missing-model"])(
    "rejects invalid provenance: %s",
    async (kind) => {
      const f = fixture();
      f.runner.mockResolvedValueOnce({
        value: f.blind,
        auth: kind === "api-key" ? "api-key" : "chatgpt",
        threadId: kind === "missing-thread" ? "" : "thread",
        model: kind === "missing-model" ? undefined : null,
        usage: null,
        elapsedMs: 1,
        receipt: kind === "missing-receipt" ? null : {},
      } as unknown as Awaited<ReturnType<RunCodexJson>>);
      expect((await run(f)).issues).toContain(
        "blind-solve:invalid-subscription-provenance",
      );
      expect(f.runner).toHaveBeenCalledTimes(1);
    },
  );
  it("rejects reuse of the solver session for solution review", async () => {
    const f = fixture();
    const base = f.runner.getMockImplementation()!;
    f.runner.mockImplementation(async (request) => {
      const response = await base(request);
      return {
        ...response,
        threadId: "one-session",
        receipt: { ...(response.receipt as object), threadId: "one-session" },
      };
    });
    expect((await run(f)).issues).toContain("solution-review:reused-session");
    expect(f.runner).toHaveBeenCalledTimes(2);
  });
  it("keeps provider errors and credentials out of evidence", async () => {
    const f = fixture();
    f.runner.mockRejectedValueOnce(new Error("SECRET_API_KEY provider-body"));
    const result = await run(f);
    expect(result.issues).toContain("blind-solve:runner-or-response-failure");
    expect(JSON.stringify(result)).not.toContain("SECRET");
  });
  it.each([
    ["exitCode", 1],
    ["status", "failed"],
    ["schemaValid", false],
    ["turnCompleted", false],
    ["promptSha256", "0".repeat(64)],
    ["schemaSha256", "0".repeat(64)],
    ["threadId", "different"],
    ["images", [{ sha256: "0".repeat(64), bytes: 1, width: 1, height: 1 }]],
  ])("rejects a CLI receipt with inconsistent %s", async (field, value) => {
    const f = fixture();
    const base = f.runner.getMockImplementation()!;
    f.runner.mockImplementation(async (request) => {
      const response = await base(request);
      return {
        ...response,
        receipt: { ...(response.receipt as object), [field]: value },
      };
    });
    expect((await run(f)).issues).toContain("blind-solve:invalid-cli-receipt");
    expect(f.runner).toHaveBeenCalledTimes(1);
  });
  it("forwards timeout cancellation to the runner's child process signal", async () => {
    const f = fixture();
    let signal: AbortSignal | undefined;
    f.runner.mockImplementationOnce((request) => {
      signal = request.signal;
      return new Promise(() => {});
    });
    await run(f, { timeoutMs: 5 });
    expect(signal?.aborted).toBe(true);
  });
  it("bounds an unresponsive injected runner", async () => {
    const f = fixture();
    f.runner.mockImplementationOnce(() => new Promise(() => {}));
    expect((await run(f, { timeoutMs: 5 })).issues).toContain(
      "blind-solve:aborted-or-timeout",
    );
  });
  it("does not start a phase when already aborted", async () => {
    const f = fixture();
    const abort = new AbortController();
    abort.abort();
    expect((await run(f, { signal: abort.signal })).issues).toContain(
      "review-aborted",
    );
    expect(f.runner).not.toHaveBeenCalled();
  });
  it("rejects an input changed while CLI work was running", async () => {
    const f = fixture();
    const base = f.runner.getMockImplementation()!;
    f.runner.mockImplementation(async (request) => {
      const response = await base(request);
      if (request.phase === "semantic-review")
        f.candidates[0].solution += " altered";
      return response;
    });
    expect((await run(f)).issues).toContain("inputs-changed-during-review");
  });
  it("protects frozen answers from a retained runner response object", async () => {
    const f = fixture();
    const base = f.runner.getMockImplementation()!;
    f.runner.mockImplementation(async (request) => {
      if (request.phase === "solution-review")
        f.blind.solutions[0].answer = "MUTATED";
      return base(request);
    });
    const result = await run(f);
    expect(result.passed).toBe(true);
    expect(result.blindSolutions[0].answer).toBe("x=5");
    expect(state(f.requests[2]).frozenBlindSolutions[0].answer).toBe("x=5");
  });
  it("rejects missing images and forged hashes before running inference", async () => {
    const missing = fixture();
    missing.candidates[0].content += " [그림]";
    expect((await run(missing)).issues).toContain("slot-1:missing-figure");
    expect(missing.runner).not.toHaveBeenCalled();
    const forged = fixture();
    forged.candidateFigures[0] = png();
    forged.candidateFigures[0].images[0].sha256 = "0".repeat(64);
    expect((await run(forged)).issues).toContain(
      "slot-1:figure-bytes-digest-mismatch",
    );
    expect(forged.runner).not.toHaveBeenCalled();
  });
  it("rejects stale source bindings and malformed candidate metadata before inference", async () => {
    const f = fixture();
    f.candidates[0].sourceDigest = "stale";
    expect((await run(f)).issues).toContain("slot-1:source-binding-mismatch");
    expect(f.runner).not.toHaveBeenCalled();
  });
});
