// @vitest-environment node
import { createHash, randomUUID } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CODEX_RETRY_BATCH_DIMENSIONS,
  codexRetryBatchBinding,
  reviewCodexDbRetryBatch,
} from "@/lib/import/schoolTextbook/codexRetryBatchReview";
import type { CodexRetryBatchInput } from "@/lib/import/schoolTextbook/codexRetryBatch.types";
import type {
  CodexRetryJsonRequest,
  RunCodexJson,
} from "@/lib/import/schoolTextbook/codexRetry.types";
import type {
  DbRetryCandidate,
  DbRetryFigures,
  DbRetryOrigin,
} from "@/lib/import/schoolTextbook/dbRetry.types";
import { dbRetryFigureDigest } from "@/lib/import/schoolTextbook/dbRetryReviewBinding";
import { reviewDigest } from "@/lib/import/schoolTextbook/qualification";
import { textbookVariantSourceDigest } from "@/lib/import/schoolTextbook/variants";
import {
  parseCodexBatchReviewOptions,
  runCodexBatchReviewCli,
} from "../../../scripts/qa/textbook/codex-batch-review-20261011";
import { createCodexJsonRunner } from "../../../scripts/import/textbook/codex-retry-20261011/transport";

vi.mock("openai", () => {
  throw new Error("paid-provider-imported");
});
vi.mock("@prisma/client", async (importOriginal) => {
  // The repository's global test harness imports Prisma's error/SQL values.
  // Permit that metadata while rejecting every real database client constructor.
  const actual = await importOriginal<typeof import("@prisma/client")>();
  return {
    ...actual,
    PrismaClient: class {
      constructor() {
        throw new Error("database-client-created");
      }
    },
  };
});
vi.mock("@/lib/ai/client", () => {
  throw new Error("paid-client-imported");
});
vi.mock("@/lib/import/schoolTextbook/dbRetryReview", () => {
  throw new Error("paid-reviewer-imported");
});
vi.mock("@/lib/import/schoolTextbook/dbRetryGeneration", () => {
  throw new Error("paid-generation-imported");
});
vi.mock("node:child_process", () => {
  const forbidden = () => {
    throw new Error("process-launch-forbidden");
  };
  return {
    spawn: forbidden,
    spawnSync: forbidden,
    exec: forbidden,
    execSync: forbidden,
    execFile: forbidden,
    execFileSync: forbidden,
    fork: forbidden,
  };
});
const roots: string[] = [];
beforeEach(() => {
  vi.stubGlobal("fetch", () => {
    throw new Error("network-forbidden-in-codex-batch-tests");
  });
});
const temp = () => {
  const root = mkdtempSync(join(tmpdir(), "codex-batch-test-"));
  roots.push(root);
  return root;
};
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const sha = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const empty = (): DbRetryFigures => ({ images: [], digest: reviewDigest([]) });
function fixture(n = 1): CodexRetryBatchInput {
  const id = `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const origin: DbRetryOrigin = {
    grade: "중1",
    chapter: "문자와 식",
    section: "일차방정식",
    problem: {
      id,
      source: "school_textbook",
      content: `x+2=${n + 2}일 때 x의 값을 구하시오.`,
      answer: String(n),
      solution: "SECRET_ORIGINAL_SOLUTION",
      question_type: "단답형",
      direct_use_allowed: true,
      review_status: "approved",
      origin_problem_id: null,
      unit_id: "unit-1",
      source_material_id: "book-1",
      family_key: "family-1",
      external_id: "SECRET_SOURCE_KEY",
      source_file: "SECRET_SOURCE_FILE",
      updated_at: "2026-10-11T00:00:00Z",
      figure_svg: null,
      figure_urls: [],
      figure_dims: [],
      figure_source_mm: [],
      choice_figure_index: [],
    },
  };
  const candidates: DbRetryCandidate[] = ([1, 2] as const).map((slot) => ({
    sourceId: id,
    sourceDigest: textbookVariantSourceDigest(origin.problem),
    originProblemId: id,
    sourceMaterialId: "book-1",
    unitId: "unit-1",
    sourceExternalId: "SECRET_SOURCE_KEY",
    sourceFile: "SECRET_SOURCE_FILE",
    familyKey: "family-1",
    externalId: `tb-retry-v1:${id}:${slot}`,
    source: "transformed",
    questionType: "단답형",
    slot,
    recipe: "ai-db-numbers-v1",
    method: "SECRET_AUTHOR_METHOD",
    content: `x+2=${n + 2 + slot * 20}일 때 x의 값을 구하시오.`,
    answer: String(n + slot * 20),
    solution: `x=${n + 2 + slot * 20}-2=${n + slot * 20}.`,
    figureSvg: null,
    figureUrls: [],
    figureDims: [],
    figureSourceMm: [],
    choiceFigureIndex: [],
    validation: {
      version: "test",
      originalAnswerRecomputed: "SECRET_RECOMPUTED",
      checks: ["SECRET_CHECK"],
    },
  }));
  return {
    origin,
    candidates,
    sourceFigures: empty(),
    candidateFigures: [empty(), empty()],
  };
}
type Output = {
  cases: {
    caseId: string;
    solutions?: Record<string, unknown>[];
    reviews?: Record<string, unknown>[];
  }[];
};
function output(request: CodexRetryJsonRequest): Output {
  const state = JSON.parse(request.prompt.split("INPUT_JSON\n")[1]) as {
    cases: { caseId: string; problems: { id: string; content: string }[] }[];
  };
  return {
    cases: state.cases.map((item) => ({
      caseId: item.caseId,
      ...(request.phase === "blind-solve"
        ? {
            solutions: item.problems.map((problem) => {
              const rhs = Number(/x\+2=(\d+)/.exec(problem.content)![1]);
              return {
                id: problem.id,
                answer: String(rhs - 2),
                solution: `Subtract 2: ${rhs}-2=${rhs - 2}; substitution ${rhs - 2}+2=${rhs}. Domain is real.`,
                missingEvidence: [],
                ambiguous: false,
              };
            }),
          }
        : {
            reviews: ["slot-1", "slot-2"].map((id) =>
              request.phase === "solution-review"
                ? {
                    id,
                    agreesWithBlindSolution: true,
                    allStepsValid: true,
                    complete: true,
                    missingEvidence: [],
                    issues: [],
                    evidence: [
                      `${id}: equality subtracts 2 on both sides, substitution restores RHS, domain all real; final scalar complete.`,
                    ],
                  }
                : {
                    id,
                    ...Object.fromEntries(
                      CODEX_RETRY_BATCH_DIMENSIONS.map((dimension) => [
                        dimension,
                        {
                          passed: true,
                          evidence: {
                            original: item.problems[0].content,
                            candidate: item.problems.find(
                              (problem) => problem.id === id,
                            )!.content,
                            reason: `${dimension}: RHS increased 20 or 40 from original, siblings differ by 20; equality operations stay in grade.`,
                          },
                        },
                      ]),
                    ),
                    missingEvidence: [],
                    issues: [],
                  },
            ),
          }),
    })),
  };
}
function runner(
  mutate?: (value: Output, request: CodexRetryJsonRequest) => void,
) {
  const requests: CodexRetryJsonRequest[] = [];
  const run = vi.fn<RunCodexJson>(async (request) => {
    requests.push(request);
    const value = output(request);
    mutate?.(value, request);
    const dir = join(request.outDir, randomUUID());
    mkdirSync(dir, { recursive: true });
    const outputText = JSON.stringify(value, null, 2) + "\n";
    const schemaText = JSON.stringify(request.schema);
    const receipt = {
      version: "codex-chatgpt-json-v1",
      id: randomUUID(),
      phase: request.phase,
      auth: "chatgpt",
      cliVersion: "codex-cli 0.100.0",
      requestedModel: "codex-account-default",
      model: null,
      modelObserved: false,
      threadId: randomUUID(),
      usage: { inputTokens: 100, cachedInputTokens: 0, outputTokens: 60 },
      startedAt: new Date().toISOString(),
      elapsedMs: 10,
      exitCode: 0,
      signal: null,
      status: "succeeded",
      reason: null,
      turnCompleted: true,
      schemaValid: true,
      promptSha256: sha(request.prompt),
      schemaSha256: sha(schemaText),
      images: (request.images ?? []).map((url) => {
        const bytes = Buffer.from(url.split(",")[1], "base64");
        return { sha256: sha(bytes), bytes: bytes.length, width: 1, height: 1 };
      }),
      outputSha256: sha(outputText),
      stdoutSha256: sha("test-only-stdout"),
      stderrSha256: sha(""),
      receiptPath: join(dir, "receipt.json"),
      outputPath: join(dir, "output.json"),
    };
    writeFileSync(receipt.outputPath, outputText);
    writeFileSync(join(dir, "schema.json"), schemaText);
    writeFileSync(receipt.receiptPath, JSON.stringify(receipt));
    return {
      value,
      auth: "chatgpt",
      threadId: receipt.threadId,
      model: null,
      usage: receipt.usage,
      elapsedMs: 10,
      receipt,
    };
  });
  return { run, requests };
}
async function review(
  inputs = [fixture(), fixture(2)],
  mutate?: Parameters<typeof runner>[0],
) {
  const fake = runner(mutate);
  const result = await reviewCodexDbRetryBatch(inputs, {
    runCodexJson: fake.run,
    outDir: temp(),
  });
  return { ...fake, result };
}
const syncReceipt = (response: Awaited<ReturnType<RunCodexJson>>) => {
  const receipt = response.receipt as Record<string, unknown>;
  writeFileSync(receipt.receiptPath as string, JSON.stringify(receipt));
};

describe("grouped independent Codex review (synthetic transport, no mathematical quality claim)", () => {
  it.each([1, 2, 16])(
    "uses exactly 3 calls and one usage record per phase for %i cases",
    async (size) => {
      const inputs = Array.from({ length: size }, (_, i) => fixture(i + 1));
      const { result, requests } = await review(inputs, (value) => {
        value.cases.reverse();
        for (const item of value.cases)
          (item.solutions ?? item.reviews)!.reverse();
      });
      expect(result.passed).toBe(true);
      expect(requests).toHaveLength(3);
      expect(result.kind).toBe("machine-codex-batch-blind-review");
      expect(result.cases.map((item) => item.sourceId)).toEqual(
        inputs.map((input) => input.origin.problem.id),
      );
      expect(
        result.communications.reduce(
          (sum, call) => sum + call.usage!.inputTokens,
          0,
        ),
      ).toBe(300);
      expect(
        new Set(result.communications.map((call) => call.threadId)).size,
      ).toBe(3);
      expect(result.cases[0]).not.toHaveProperty("communications");
      expect(Object.isFrozen(result.cases[0].blindSolutions[0])).toBe(true);
      expect(result.cases[0].blindSolutionsDigest).toBe(
        reviewDigest(result.cases[0].blindSolutions),
      );
      expect(result.communications[0].rawOutput).toHaveProperty("cases");
      expect(result.communications[0].outputSha256).not.toBe(
        sha(JSON.stringify(result.communications[0].rawOutput)),
      );
    },
  );
  it("only whitelists questions/types/ordered image associations in blind state", async () => {
    const { requests } = await review();
    const blind = requests[0].prompt;
    expect(blind).not.toContain("SECRET_");
    expect(blind).not.toContain(fixture().origin.problem.id);
    const state = JSON.parse(blind.split("INPUT_JSON\n")[1]);
    expect(Object.keys(state.cases[0])).toEqual(["caseId", "problems"]);
    expect(Object.keys(state.cases[0].problems[0])).toEqual([
      "id",
      "content",
      "questionType",
      "images",
    ]);
    expect(blind).toContain("±");
    expect(blind).toContain("없다");
    expect(blind).toContain("literal (1)");
    expect(requests[2].prompt).not.toContain("SECRET_AUTHOR_METHOD");
    expect(requests[2].prompt).toContain("allowed equally in BOTH slots");
  });
  it.each([0, 17])(
    "rejects out-of-bounds size %i without calling",
    async (count) => {
      const fake = runner();
      await expect(
        reviewCodexDbRetryBatch(
          Array.from({ length: count }, (_, i) => fixture(i + 1)),
          { runCodexJson: fake.run, outDir: temp() },
        ),
      ).rejects.toThrow("batch-size");
      expect(fake.run).not.toHaveBeenCalled();
    },
  );
  it("rejects duplicate source IDs", async () => {
    await expect(review([fixture(), fixture()])).rejects.toThrow(
      "duplicate-source-id",
    );
  });
  it.each(["ambiguous", "missingEvidence", "answer", "solution"])(
    "holds only a case with blind %s failure, keeping original indexes",
    async (key) => {
      const { result, requests } = await review(undefined, (value, request) => {
        if (request.phase === "blind-solve")
          value.cases[0].solutions![0][key] =
            key === "ambiguous"
              ? true
              : key === "missingEvidence"
                ? ["missing diagram"]
                : key === "answer"
                  ? "999"
                  : "unknown";
      });
      expect(result.cases.map((item) => item.passed)).toEqual([false, true]);
      expect(result.cases[1].questionIndex).toBe(2);
      expect(requests).toHaveLength(3);
      expect(
        JSON.parse(requests[1].prompt.split("INPUT_JSON\n")[1]).cases.map(
          (item: { caseId: string }) => item.caseId,
        ),
      ).toEqual(["case-0002"]);
      expect(result.communications[0].caseIds).toEqual([
        "case-0001",
        "case-0002",
      ]);
    },
  );
  it("stops safely after all blind cases fail", async () => {
    const { result, requests } = await review(undefined, (value, request) => {
      if (request.phase === "blind-solve")
        for (const item of value.cases) item.solutions![0].ambiguous = true;
    });
    expect(requests).toHaveLength(1);
    expect(result.cases.every((item) => !item.passed)).toBe(true);
  });
  it.each([
    "missing",
    "duplicate",
    "wrong",
    "slot-duplicate",
    "slot-missing",
    "slot-wrong",
  ])("fails closed on %s case/slot attribution", async (kind) => {
    const { result, requests } = await review(undefined, (value, request) => {
      if (request.phase !== "blind-solve") return;
      if (kind === "missing") value.cases.pop();
      if (kind === "duplicate") value.cases[1].caseId = value.cases[0].caseId;
      if (kind === "wrong") value.cases[0].caseId = "case-0099";
      if (kind === "slot-duplicate")
        value.cases[0].solutions![1].id = "original";
      if (kind === "slot-missing") value.cases[0].solutions!.pop();
      if (kind === "slot-wrong") value.cases[0].solutions![0].id = "slot-3";
    });
    expect(result.passed).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(requests).toHaveLength(1);
  });
  it("preserves recipe bytes while allowing either change type in either slot", async () => {
    const input = fixture();
    input.candidates[0].recipe = "ai-db-conditions-v1";
    input.candidates[1].recipe = "ai-db-numbers-v1";
    const { result } = await review([input]);
    expect(result.passed).toBe(true);
    expect(result.cases[0].candidatePayloadDigest).toBe(
      reviewDigest(input.candidates),
    );
  });
  it("holds duplicate questions and missing figures before inference", async () => {
    const input = fixture();
    input.candidates[0].content = input.origin.problem.content;
    input.candidates[1].content += " [그림]";
    const { result, requests } = await review([input]);
    expect(requests).toHaveLength(0);
    expect(result.cases[0].issues).toContain("duplicate-question");
    expect(result.cases[0].issues).toContain("slot-2:missing-figure");
  });
  it("rejects cross-case answer mixing using each original case binding", async () => {
    const { result } = await review(undefined, (value, request) => {
      if (request.phase === "blind-solve")
        [value.cases[0].solutions, value.cases[1].solutions] = [
          value.cases[1].solutions,
          value.cases[0].solutions,
        ];
    });
    expect(
      result.cases.every((item) =>
        item.issues.includes("original:answer-mismatch"),
      ),
    ).toBe(true);
    expect(result.communications).toHaveLength(1);
  });
  it.each([
    ["±2", "2"],
    ["(1) 2 (2) 3", "(1) 2"],
    ["2cm", "2"],
    ["없다", "unknown"],
  ])("rejects incomplete answer %s -> %s", async (stored, answer) => {
    const input = fixture();
    input.candidates[0].answer = stored;
    const { result } = await review([input], (value, request) => {
      if (request.phase === "blind-solve")
        value.cases[0].solutions![1].answer = answer;
    });
    expect(result.cases[0].issues).toContain("slot-1:answer-mismatch");
  });
  it("holds only invalid worked solutions before semantic review", async () => {
    const { result, requests } = await review(undefined, (value, request) => {
      if (request.phase === "solution-review")
        value.cases[0].reviews![0].allStepsValid = false;
    });
    expect(result.cases.map((item) => item.passed)).toEqual([false, true]);
    expect(result.communications[2].caseIds).toEqual(["case-0002"]);
    expect(requests[1].prompt).toContain("EVERY equality");
  });
  it.each(["solution-review", "semantic-review"] as const)(
    "rejects duplicate later cases in %s",
    async (phase) => {
      const { result } = await review(undefined, (value, request) => {
        if (request.phase === phase)
          value.cases[1].caseId = value.cases[0].caseId;
      });
      expect(result.issues).toContain(`${phase}:duplicate-or-missing-case`);
      expect(result.passed).toBe(false);
    },
  );
  it.each(CODEX_RETRY_BATCH_DIMENSIONS)(
    "keeps %s false per-case without probability conversion",
    async (dimension) => {
      const { result } = await review(undefined, (value, request) => {
        if (request.phase === "semantic-review")
          (
            value.cases[0].reviews![0][dimension] as { passed: boolean }
          ).passed = false;
      });
      expect(result.cases.map((item) => item.passed)).toEqual([false, true]);
      expect(result.cases[0].issues).toContain(`slot-1:${dimension}:failed`);
    },
  );
  it.each([
    "numeric-boolean",
    "empty-reason",
    "empty-step-evidence",
    "extra-property",
  ])("rejects malformed stage output: %s", async (kind) => {
    const { result } = await review(undefined, (value, request) => {
      if (kind === "empty-step-evidence" && request.phase === "solution-review")
        value.cases[0].reviews![0].evidence = [];
      if (request.phase !== "semantic-review") return;
      const item = value.cases[0].reviews![0];
      if (kind === "numeric-boolean")
        (item.complete as { passed: unknown }).passed = 0.99;
      if (kind === "empty-reason")
        (item.complete as { evidence: { reason: string } }).evidence.reason =
          " ";
      if (kind === "extra-property") item.humanApproved = true;
    });
    expect(result.passed).toBe(false);
    expect(
      result.issues.some((issue) => issue.endsWith(":malformed-response")),
    ).toBe(true);
  });
  it("binds actual image bytes and ordered attachment associations", async () => {
    const input = fixture();
    const bytes = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
      "base64",
    );
    input.sourceFigures.images.push({
      dataUrl: `data:image/png;base64,${bytes.toString("base64")}`,
      sha256: sha(bytes),
      choiceIndex: 0,
      origin: "database-raster",
    });
    input.sourceFigures.digest = dbRetryFigureDigest(input.sourceFigures);
    const { result, requests } = await review([input]);
    expect(result.passed).toBe(true);
    expect(requests[0].images).toEqual([input.sourceFigures.images[0].dataUrl]);
    expect(result.communications[0].images).toEqual([
      { sha256: sha(bytes), bytes: bytes.length },
    ]);
    const changed = structuredClone(input);
    changed.sourceFigures.images[0].sha256 = "a".repeat(64);
    const held = await review([changed, fixture(2)]);
    expect(held.result.cases.map((item) => item.passed)).toEqual([false, true]);
  });
  it("remaps attached image positions for later subsets without renumbering cases", async () => {
    const inputs = [fixture(), fixture(2)];
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
      "base64",
    );
    for (const input of inputs) {
      input.sourceFigures.images.push({
        dataUrl: `data:image/png;base64,${png.toString("base64")}`,
        sha256: sha(png),
        origin: "database-raster",
        choiceIndex: 0,
      });
      input.sourceFigures.digest = dbRetryFigureDigest(input.sourceFigures);
    }
    const { result, requests } = await review(inputs, (value, request) => {
      if (request.phase === "blind-solve")
        value.cases[0].solutions![0].ambiguous = true;
    });
    expect(requests[0].images).toHaveLength(2);
    expect(requests[1].images).toHaveLength(1);
    const state = JSON.parse(requests[1].prompt.split("INPUT_JSON\n")[1]);
    expect(state.cases[0].caseId).toBe("case-0002");
    expect(state.cases[0].problems[0].images[0].attachment).toBe(1);
    expect(result.cases[1].passed).toBe(true);
  });
  it("keeps raw output and independent answers frozen against later DTO mutation", async () => {
    const fake = runner();
    let originalResponse: Awaited<ReturnType<RunCodexJson>> | undefined;
    const result = await reviewCodexDbRetryBatch([fixture()], {
      outDir: temp(),
      runCodexJson: async (request) => {
        if (originalResponse && request.phase === "solution-review")
          (originalResponse.value as Output).cases[0].solutions![0].answer =
            "injected-after-return";
        const response = await fake.run(request);
        if (request.phase === "blind-solve") originalResponse = response;
        return response;
      },
    });
    expect(result.passed).toBe(true);
    expect(result.cases[0].blindSolutions[0].answer).toBe("1");
    expect(
      (result.communications[0].rawOutput as Output).cases[0].solutions![0]
        .answer,
    ).toBe("1");
  });
  it("detects mutation to original, candidate DTO and ordered batch while frozen state stays intact", async () => {
    for (const change of ["origin", "candidate", "order"]) {
      const inputs = [fixture(), fixture(2)],
        fake = runner();
      const result = await reviewCodexDbRetryBatch(inputs, {
        outDir: temp(),
        runCodexJson: async (request) => {
          if (request.phase === "solution-review") {
            if (change === "origin")
              inputs[0].origin.problem.answer = "changed";
            if (change === "candidate")
              inputs[0].candidates[0].solution = "changed";
            if (change === "order") inputs.reverse();
          }
          return fake.run(request);
        },
      });
      expect(result.issues).toContain("inputs-changed-during-review");
      expect(result.cases.every((item) => !item.passed)).toBe(true);
    }
  });
  it.each([
    "output-hash",
    "raw-value",
    "prompt",
    "schema",
    "auth",
    "exit",
    "completed",
    "receipt-file",
    "model",
    "usage",
    "image-bytes",
  ])("rejects inconsistent authentic receipt metadata: %s", async (kind) => {
    const fake = runner();
    const result = await reviewCodexDbRetryBatch([fixture()], {
      outDir: temp(),
      runCodexJson: async (request) => {
        const response = await fake.run(request);
        const receipt = response.receipt as Record<string, unknown>;
        if (kind === "output-hash") receipt.outputSha256 = "a".repeat(64);
        if (kind === "raw-value")
          (response.value as Output).cases[0].solutions![0].answer = "changed";
        if (kind === "prompt") receipt.promptSha256 = "a".repeat(64);
        if (kind === "schema") receipt.schemaSha256 = "a".repeat(64);
        if (kind === "auth") receipt.auth = "api-key";
        if (kind === "exit") receipt.exitCode = 1;
        if (kind === "completed") receipt.turnCompleted = false;
        if (kind === "model") receipt.model = "wrong-model";
        if (kind === "usage")
          receipt.usage = {
            inputTokens: 9,
            cachedInputTokens: 0,
            outputTokens: 2,
          };
        if (kind === "image-bytes")
          receipt.images = [
            { sha256: "a".repeat(64), bytes: 1, width: 1, height: 1 },
          ];
        if (kind !== "receipt-file") syncReceipt(response);
        else writeFileSync(receipt.receiptPath as string, "{}");
        return response;
      },
    });
    expect(result.passed).toBe(false);
    expect(result.communications).toHaveLength(1);
    expect(result.issues.length).toBeGreaterThan(0);
  });
  it("rejects reused actual thread IDs", async () => {
    const fake = runner();
    const result = await reviewCodexDbRetryBatch([fixture()], {
      outDir: temp(),
      runCodexJson: async (request) => {
        const response = await fake.run(request);
        response.threadId = "same-thread";
        (response.receipt as Record<string, unknown>).threadId = "same-thread";
        syncReceipt(response);
        return response;
      },
    });
    expect(result.issues).toContain("solution-review:reused-session");
    expect(result.communications).toHaveLength(2);
  });
  it("preserves exact returned evidence strings for raw-output attribution", async () => {
    const { result } = await review([fixture()], (value, request) => {
      if (request.phase === "solution-review")
        value.cases[0].reviews![0].evidence = [
          "  Check 23-2=21 and 21+2=23; real domain.  ",
        ];
      if (request.phase === "semantic-review")
        (
          value.cases[0].reviews![0].complete as {
            evidence: { reason: string };
          }
        ).evidence.reason =
          "  Every condition and scalar requested here is present.  ";
    });
    expect(result.passed).toBe(true);
    expect(result.cases[0].solutionReviews[0]).toEqual(
      (result.communications[1].rawOutput as Output).cases[0].reviews![0],
    );
    expect(result.cases[0].semanticReviews[0]).toEqual(
      (result.communications[2].rawOutput as Output).cases[0].reviews![0],
    );
  });
  it("fails closed on timeout and propagates abort to runner", async () => {
    let runnerSignal: AbortSignal | undefined;
    const result = await reviewCodexDbRetryBatch([fixture()], {
      outDir: temp(),
      timeoutMs: 5,
      runCodexJson: async (request) => {
        runnerSignal = request.signal;
        return new Promise(() => {});
      },
    });
    expect(runnerSignal?.aborted).toBe(true);
    expect(result.issues).toContain("blind-solve:aborted-or-timeout");
  });
  it("supports cancellation before and during invocation", async () => {
    const controller = new AbortController(),
      fake = runner();
    controller.abort();
    expect(
      (
        await reviewCodexDbRetryBatch([fixture()], {
          outDir: temp(),
          signal: controller.signal,
          runCodexJson: fake.run,
        })
      ).passed,
    ).toBe(false);
    expect(fake.run).not.toHaveBeenCalled();
    const live = new AbortController();
    const result = await reviewCodexDbRetryBatch([fixture()], {
      outDir: temp(),
      signal: live.signal,
      runCodexJson: async () => {
        live.abort();
        return new Promise(() => {});
      },
    });
    expect(result.issues).toContain("review-aborted");
  });
  it("accepts actual existing transport receipts produced by an injected process runner", async () => {
    const run = createCodexJsonRunner(async (request) => {
      if (request.args[0] === "login")
        return {
          stdout: "Logged in using ChatGPT",
          stderr: "",
          exitCode: 0,
          signal: null,
        };
      if (request.args[0] === "--version")
        return {
          stdout: "codex-cli 0.100.0",
          stderr: "",
          exitCode: 0,
          signal: null,
        };
      const phase = request.stdin.includes("Solve independently")
        ? "blind-solve"
        : request.stdin.includes("Frozen blind solutions are")
          ? "solution-review"
          : "semantic-review";
      const value = output({
        phase,
        prompt: request.stdin,
        schema: {},
        outDir: "unused",
      });
      writeFileSync(
        request.args[request.args.indexOf("--output-last-message") + 1],
        JSON.stringify(value, null, 2) + "\n",
      );
      return {
        stdout:
          JSON.stringify({ type: "thread.started", thread_id: randomUUID() }) +
          "\n" +
          JSON.stringify({
            type: "turn.completed",
            usage: {
              input_tokens: 20,
              cached_input_tokens: 0,
              output_tokens: 10,
            },
          }),
        stderr: "",
        exitCode: 0,
        signal: null,
      };
    });
    const result = await reviewCodexDbRetryBatch([fixture()], {
      runCodexJson: run,
      outDir: temp(),
    });
    expect(result.passed).toBe(true);
  });
});

function cliFixture() {
  const root = temp(),
    input = fixture(),
    snapshot = join(root, "snapshot.json"),
    generationDir = join(root, "generation");
  mkdirSync(join(generationDir, "sources"), { recursive: true });
  writeFileSync(
    snapshot,
    JSON.stringify({
      rows: [
        {
          problem: input.origin.problem,
          unit: {
            grade: input.origin.grade,
            chapter: input.origin.chapter,
            section: input.origin.section,
          },
        },
      ],
      children: [],
    }),
  );
  const checkpointPath = join(
    generationDir,
    "sources",
    `${input.origin.problem.id}.json`,
  );
  const binding = {
    sourceId: input.origin.problem.id,
    sourceDigest: textbookVariantSourceDigest(input.origin.problem),
    originDigest: reviewDigest(input.origin),
  };
  writeFileSync(
    checkpointPath,
    JSON.stringify({
      ...binding,
      state: "generated",
      pair: {
        ...binding,
        sourceFigureDigest: empty().digest,
        candidatePayloadDigest: reviewDigest(input.candidates),
        candidates: input.candidates,
      },
    }),
  );
  const options = {
    snapshot,
    generationDir,
    out: join(root, "proof"),
    sourceIds: [input.origin.problem.id],
    batchSize: 8,
    concurrency: 1,
    timeoutMs: 600_000,
    review: false,
    resume: false,
  };
  return { options, input, checkpointPath };
}
describe("offline grouped CLI", () => {
  it("defaults to plan, launches no process or provider and preserves checkpoint bytes", async () => {
    const { options, checkpointPath } = cliFixture(),
      before = readFileSync(checkpointPath),
      fake = runner();
    const parsed = parseCodexBatchReviewOptions([
      "--snapshot",
      options.snapshot,
      "--generation-dir",
      options.generationDir,
      "--source-ids",
      JSON.stringify(options.sourceIds),
      "--out",
      options.out,
    ]);
    expect(parsed.review).toBe(false);
    const result = await runCodexBatchReviewCli(parsed, {
      runCodexJson: fake.run,
      log: () => {},
    });
    expect(result.reviewed).toBe(0);
    expect(fake.run).not.toHaveBeenCalled();
    expect(readFileSync(checkpointPath)).toEqual(before);
  });
  it("writes durable separate grouped and per-case evidence and resumes without inference", async () => {
    const { options, input, checkpointPath } = cliFixture(),
      before = readFileSync(checkpointPath),
      fake = runner();
    const deps = {
      runCodexJson: fake.run,
      loadFigures: async () => empty(),
      log: () => {},
    };
    const first = await runCodexBatchReviewCli(
      { ...options, review: true },
      deps,
    );
    expect(first.passed).toBe(1);
    const index = JSON.parse(
      readFileSync(
        join(options.out, "cases", `${input.origin.problem.id}.json`),
        "utf8",
      ),
    );
    expect(index.kind).toBe("machine-codex-batch-blind-review");
    expect(index.questionIndex).toBe(1);
    await runCodexBatchReviewCli(
      { ...options, review: true, resume: true },
      deps,
    );
    expect(fake.run).toHaveBeenCalledTimes(3);
    expect(readFileSync(checkpointPath)).toEqual(before);
    await expect(
      runCodexBatchReviewCli({ ...options, review: true }, deps),
    ).rejects.toThrow("exists-use-resume");
  });
  it("resume rejects changed checkpoint bytes and corrupted durable outputs", async () => {
    const { options, checkpointPath } = cliFixture(),
      fake = runner(),
      deps = {
        runCodexJson: fake.run,
        loadFigures: async () => empty(),
        log: () => {},
      };
    await runCodexBatchReviewCli({ ...options, review: true }, deps);
    writeFileSync(checkpointPath, readFileSync(checkpointPath, "utf8") + "\n");
    await expect(
      runCodexBatchReviewCli({ ...options, review: true, resume: true }, deps),
    ).rejects.toThrow("existing-proof-differs");
    const second = cliFixture();
    await runCodexBatchReviewCli({ ...second.options, review: true }, deps);
    const saved = JSON.parse(
      readFileSync(join(second.options.out, "batches", "1.json"), "utf8"),
    );
    writeFileSync(saved.review.communications[0].receipt.outputPath, "{}");
    await expect(
      runCodexBatchReviewCli(
        { ...second.options, review: true, resume: true },
        deps,
      ),
    ).rejects.toThrow("invalid-cli-receipt");
  });
  it("bounds selection, batch size, concurrency and rejects unknown flags", () => {
    const { options } = cliFixture(),
      base = [
        "--snapshot",
        options.snapshot,
        "--generation-dir",
        options.generationDir,
        "--source-ids",
        JSON.stringify(options.sourceIds),
        "--out",
        options.out,
      ];
    for (const args of [
      ["--batch-size", "17"],
      ["--concurrency", "4"],
      ["--unknown"],
      ["--review", "--review"],
    ])
      expect(() => parseCodexBatchReviewOptions([...base, ...args])).toThrow();
    expect(() => codexRetryBatchBinding([fixture(), fixture(2)])).not.toThrow();
  });
});
