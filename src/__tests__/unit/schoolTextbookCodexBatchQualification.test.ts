// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash, randomUUID } from "node:crypto";
import { codexQualificationFixture } from "../fixtures/codexQualification";
import {
  prepareCodexRetryBatchQualification,
  type CodexRetryBatchQualificationInput,
} from "@/lib/import/schoolTextbook/codexRetryBatchQualification";
import {
  CODEX_RETRY_BATCH_VERSION,
  codexRetryBatchBinding,
} from "@/lib/import/schoolTextbook/codexRetryBatchReview";
import type { CodexRetryBatchCommunication } from "@/lib/import/schoolTextbook/codexRetryBatch.types";
import { reviewDigest } from "@/lib/import/schoolTextbook/qualification";
const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
function fixture(): CodexRetryBatchQualificationInput {
  const base = codexQualificationFixture(),
    r = base.reviews[0]!;
  const artifactRoot = mkdtempSync(
    join(tmpdir(), "codex-batch-qualification-test-"),
  );
  roots.push(artifactRoot);
  const empty = { images: [], digest: reviewDigest([]) };
  const inputs = [
    {
      origin: base.origins[0]!,
      candidates: base.candidates,
      sourceFigures: empty,
      candidateFigures: [empty, empty],
    },
  ];
  const binding = codexRetryBatchBinding(inputs),
    item = {
      ...binding.inputBindings[0]!,
      passed: true,
      issues: [],
      blindSolutions: r.blindSolutions,
      blindSolutionsDigest: r.blindSolutionsDigest,
      solutionReviews: r.solutionReviews,
      semanticReviews: r.semanticReviews,
    };
  const outputs = [
    { cases: [{ caseId: item.caseId, solutions: item.blindSolutions }] },
    { cases: [{ caseId: item.caseId, reviews: item.solutionReviews }] },
    { cases: [{ caseId: item.caseId, reviews: item.semanticReviews }] },
  ];
  const communications: CodexRetryBatchCommunication[] = (
    ["blind-solve", "solution-review", "semantic-review"] as const
  ).map((phase, index) => {
    const dir = join(artifactRoot, phase);
    mkdirSync(dir);
    const prompt = "Synthetic test-only " + phase,
      schema = {},
      output = JSON.stringify(outputs[index]),
      schemaText = JSON.stringify(schema);
    const receipt = {
      version: "codex-chatgpt-json-v1" as const,
      id: randomUUID(),
      phase,
      auth: "chatgpt" as const,
      cliVersion: "codex-cli 0.0.0",
      requestedModel: "codex-account-default" as const,
      model: null,
      modelObserved: false,
      threadId: "test-only-" + phase,
      usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1 },
      startedAt: new Date().toISOString(),
      elapsedMs: 1,
      exitCode: 0 as const,
      signal: null,
      status: "succeeded" as const,
      reason: null,
      turnCompleted: true as const,
      schemaValid: true as const,
      promptSha256: sha(prompt),
      schemaSha256: sha(schemaText),
      images: [],
      outputSha256: sha(output),
      stdoutSha256: sha("test-only"),
      stderrSha256: sha(""),
      receiptPath: join(dir, "receipt.json"),
      outputPath: join(dir, "output.json"),
    };
    writeFileSync(receipt.receiptPath, JSON.stringify(receipt));
    writeFileSync(receipt.outputPath, output);
    writeFileSync(join(dir, "schema.json"), schemaText);
    return {
      phase,
      caseIds: [item.caseId],
      status: "succeeded",
      prompt,
      schema,
      inputDigest: reviewDigest({ prompt, images: [] }),
      promptSha256: receipt.promptSha256,
      schemaSha256: receipt.schemaSha256,
      images: [],
      auth: "chatgpt",
      threadId: receipt.threadId,
      model: null,
      usage: receipt.usage,
      elapsedMs: 1,
      receipt,
      receiptDigest: reviewDigest(receipt),
      outputSha256: receipt.outputSha256,
      outputDigest: reviewDigest(outputs[index]),
      rawOutput: outputs[index],
    };
  });
  return {
    ...base,
    batches: [
      {
        artifactRoot,
        inputs,
        review: {
          version: CODEX_RETRY_BATCH_VERSION,
          kind: "machine-codex-batch-blind-review",
          inputBindings: binding.inputBindings,
          batchDigest: binding.batchDigest,
          passed: true,
          issues: [],
          cases: [item],
          communications,
        },
      },
    ],
  };
}
describe("Grouped approval preserves authentic shared evidence and exact attribution (synthetic only)", () => {
  it("accepts one full owned pair under its explicit grouped proof kind", () =>
    expect(prepareCodexRetryBatchQualification(fixture())).toMatchObject({
      pairs: 1,
      ids: ["owned-1", "owned-2"],
      proofKind: "machine-codex-batch-blind-review",
    }));
  const mutations: Array<
    [string, (x: CodexRetryBatchQualificationInput) => void]
  > = [
    [
      "changed original",
      (x) => {
        x.origins[0]!.problem.content += "変更";
      },
    ],
    [
      "altered batch input",
      (x) => {
        x.batches[0]!.inputs[0]!.candidates[0]!.method += "changed";
      },
    ],
    [
      "failed batch transport",
      (x) => {
        x.batches[0]!.review.issues.push("failed");
      },
    ],
    [
      "held selected case",
      (x) => {
        x.batches[0]!.review.cases[0]!.passed = false;
      },
    ],
    [
      "unknown case",
      (x) => {
        x.batches[0]!.review.cases[0]!.caseId = "other";
      },
    ],
    [
      "lost case",
      (x) => {
        x.batches[0]!.review.cases = [];
      },
    ],
    [
      "wrong case index",
      (x) => {
        x.batches[0]!.review.cases[0]!.questionIndex = 2;
      },
    ],
    [
      "missing phase",
      (x) => {
        x.batches[0]!.review.communications.pop();
      },
    ],
    [
      "reused thread",
      (x) => {
        x.batches[0]!.review.communications[2]!.threadId =
          x.batches[0]!.review.communications[0]!.threadId;
      },
    ],
    [
      "fabricated solution result",
      (x) => {
        x.batches[0]!.review.cases[0]!.solutionReviews[0]!.evidence = [
          "fabricated",
        ];
      },
    ],
    [
      "edited output bytes",
      (x) => {
        writeFileSync(
          x.batches[0]!.review.communications[0]!.receipt!.outputPath,
          "{}",
        );
      },
    ],
    [
      "edited schema bytes",
      (x) => {
        const call = x.batches[0]!.review.communications[0]!;
        writeFileSync(
          join(x.batches[0]!.artifactRoot, call.phase, "schema.json"),
          "{} ",
        );
      },
    ],
    [
      "altered actual grouped output",
      (x) => {
        x.batches[0]!.review.communications[0]!.rawOutput = { cases: [] };
      },
    ],
    [
      "case absent from actual phase",
      (x) => {
        x.batches[0]!.review.communications[1]!.caseIds = [];
      },
    ],
    [
      "unowned row",
      (x) => {
        x.ownedIds = new Set();
      },
    ],
    [
      "render mismatch",
      (x) => {
        x.render.inspectedCandidates = 1;
      },
    ],
    [
      "no authentic receipt",
      (x) => {
        x.batches[0]!.review.communications[0]!.receipt = null;
      },
    ],
    [
      "receipt path outside artifact scope",
      (x) => {
        x.batches[0]!.artifactRoot = join(
          x.batches[0]!.artifactRoot,
          "semantic-review",
        );
      },
    ],
  ];
  it.each(mutations)("rejects %s", (_, mutate) => {
    const x = fixture();
    mutate(x);
    expect(() => prepareCodexRetryBatchQualification(x)).toThrow();
  });
});
