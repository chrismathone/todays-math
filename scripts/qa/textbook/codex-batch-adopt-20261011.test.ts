/** Synthetic local fixtures only. Every process API and network/DB/model entrypoint is forbidden. */
import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { runInNewContext } from "node:vm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { codexQualificationFixture } from "../../../src/__tests__/fixtures/codexQualification";
import {
  codexRetryBatchBinding,
  CODEX_RETRY_BATCH_VERSION,
} from "../../../src/lib/import/schoolTextbook/codexRetryBatchReview";
import type {
  CodexDbRetryBatchReview,
  CodexRetryBatchCommunication,
} from "../../../src/lib/import/schoolTextbook/codexRetryBatch.types";
import {
  reviewDigest,
  retryReviewPayloadDigest,
} from "../../../src/lib/import/schoolTextbook/qualification";
import type { DbRetryCheckpoint } from "../../import/textbook/db-retry-20261011/checkpoint";
import type { DbRetryCandidate } from "../../../src/lib/import/schoolTextbook/dbRetry.types";
import {
  ADOPTION_CHILD_PRELOAD,
  adoptionChildEnv,
  parseCodexBatchAdoptOptions,
  runCodexBatchAdopt,
  type AdoptProcessRequest,
  type CodexBatchAdoptOptions,
} from "./codex-batch-adopt-20261011";

vi.mock("@prisma/client", () => {
  throw new Error("database-import-forbidden");
});
vi.mock("openai", () => {
  throw new Error("model-import-forbidden");
});
vi.mock("../../../src/lib/ai/client", () => {
  throw new Error("paid-client-forbidden");
});
vi.mock("../../../src/lib/import/schoolTextbook/dbRetryGeneration", () => {
  throw new Error("generation-import-forbidden");
});
const roots: string[] = [];
const sha = (value: Buffer | string) =>
  createHash("sha256").update(value).digest("hex");
const hash = (file: string) => sha(readFileSync(file));
const read = <T>(file: string): T =>
  JSON.parse(readFileSync(file, "utf8")) as T;
const write = (file: string, value: unknown) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
};
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
beforeEach(() => {
  vi.stubGlobal("fetch", () => {
    throw new Error("network-forbidden");
  });
});
afterEach(async () => {
  for (const root of roots.splice(0)) {
    // mkdtemp-owned absolute paths only; no shell deletion or workspace traversal.
    expect(root.startsWith(join(tmpdir(), "adoption-test-"))).toBe(true);
    await rm(root, { recursive: true, force: true });
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function fixture(count = 2, held = 1, offset = 0) {
  const root = mkdtempSync(join(tmpdir(), "adoption-test-"));
  roots.push(root);
  const options: CodexBatchAdoptOptions = {
    snapshot: join(root, "원본 with spaces.json"),
    generationDir: join(root, "생성 cohort"),
    reviewDir: join(root, "검토 cohort"),
    out: join(root, "채택 output"),
    apply: false,
  };
  const empty = { images: [], digest: reviewDigest([]) };
  const bases = Array.from({ length: count }, (_, index) => {
    const base = codexQualificationFixture(),
      origin = base.origins[0];
    origin.problem.id = id(index + 1 + offset);
    base.candidates.forEach((candidate) => {
      candidate.sourceId = candidate.originProblemId = origin.problem.id;
      candidate.externalId = `tb-retry-v1:${origin.problem.id}:${candidate.slot}`;
      candidate.sourceDigest = reviewDigest(origin.problem);
    });
    return base;
  });
  const inputs = bases.map((base) => ({
    origin: base.origins[0],
    candidates: base.candidates,
    sourceFigures: empty,
    candidateFigures: [empty, empty],
  }));
  write(options.snapshot, {
    rows: inputs.map(({ origin }) => ({
      problem: origin.problem,
      unit: {
        grade: origin.grade,
        chapter: origin.chapter,
        section: origin.section,
      },
    })),
    children: [],
  });
  write(join(options.generationDir, "checkpoint.json"), {
    version: "db-retry-generation-v1",
    snapshotDigest: hash(options.snapshot),
    runId: randomUUID(),
    createdAt: "2026-10-11T00:00:00Z",
  });
  for (const input of inputs)
    write(
      join(options.generationDir, "sources", input.origin.problem.id + ".json"),
      {
        sourceId: input.origin.problem.id,
        sourceDigest: reviewDigest(input.origin.problem),
        originDigest: reviewDigest(input.origin),
        state: "generated",
        updatedAt: "2026-10-11T00:00:00Z",
        attempts: 1,
        calls: [],
        pair: {
          version: "db-retry-generation-v1",
          promptVersion: "synthetic-test-only",
          sourceId: input.origin.problem.id,
          sourceDigest: reviewDigest(input.origin.problem),
          originDigest: reviewDigest(input.origin),
          sourceFigureDigest: empty.digest,
          candidatePayloadDigest: reviewDigest(input.candidates),
          candidates: input.candidates,
          calls: [],
          mathematicalApproval: false,
        },
      },
    );
  const binding = count
    ? codexRetryBatchBinding(inputs)
    : { inputBindings: [], batchDigest: "" };
  const cases = bases.map((base, index) => {
    const evidence = base.reviews[0];
    return {
      ...binding.inputBindings[index],
      passed: index < count - held,
      issues: index < count - held ? [] : ["synthetic-held-case"],
      blindSolutions: evidence.blindSolutions,
      blindSolutionsDigest: evidence.blindSolutionsDigest,
      solutionReviews: evidence.solutionReviews,
      semanticReviews: evidence.semanticReviews,
    };
  });
  const communications: CodexRetryBatchCommunication[] = (
    ["blind-solve", "solution-review", "semantic-review"] as const
  ).map((phase, index) => {
    const dir = join(
      options.reviewDir,
      "artifacts",
      binding.batchDigest,
      phase,
    );
    const prompt = "SYNTHETIC LOCAL TEST ONLY " + phase,
      schema = { type: "object" };
    const rawOutput = {
      cases: cases.map((item) => ({
        caseId: item.caseId,
        ...(index === 0
          ? { solutions: item.blindSolutions }
          : {
              reviews:
                index === 1 ? item.solutionReviews : item.semanticReviews,
            }),
      })),
    };
    const output = JSON.stringify(rawOutput),
      schemaText = JSON.stringify(schema);
    const receipt = {
      version: "codex-chatgpt-json-v1" as const,
      id: randomUUID(),
      phase,
      auth: "chatgpt" as const,
      cliVersion: "codex-cli 0.0.0-synthetic-test-only",
      requestedModel: "codex-account-default" as const,
      model: null,
      modelObserved: false,
      threadId: `synthetic-only-${index}`,
      usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1 },
      startedAt: "2026-10-11T00:00:00Z",
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
      stdoutSha256: sha("synthetic-test-only"),
      stderrSha256: sha(""),
      receiptPath: join(dir, "receipt.json"),
      outputPath: join(dir, "output.json"),
    };
    write(receipt.receiptPath, receipt);
    writeFileSync(receipt.outputPath, output);
    writeFileSync(join(dir, "schema.json"), schemaText);
    return {
      phase,
      caseIds: cases.map((c) => c.caseId),
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
      outputDigest: reviewDigest(rawOutput),
      rawOutput,
    };
  });
  const review: CodexDbRetryBatchReview = {
    version: CODEX_RETRY_BATCH_VERSION,
    kind: "machine-codex-batch-blind-review",
    ...binding,
    passed: cases.every((c) => c.passed),
    issues: [],
    cases,
    communications,
  };
  const saveReview = () => {
    if (count) {
      const batchPath = join(options.reviewDir, "batches", "1.json");
      write(batchPath, { reviewDigest: reviewDigest(review), review });
      for (const item of review.cases)
        write(join(options.reviewDir, "cases", item.sourceId + ".json"), {
          version: review.version,
          kind: review.kind,
          sourceId: item.sourceId,
          caseId: item.caseId,
          questionIndex: item.questionIndex,
          batchDigest: review.batchDigest,
          bindingDigest: item.bindingDigest,
          passed: item.passed,
          issues: item.issues,
          batchPath,
          reviewDigest: reviewDigest(review),
        });
    }
  };
  saveReview();
  write(join(options.reviewDir, "manifest.json"), {
    version: CODEX_RETRY_BATCH_VERSION,
    snapshotDigest: hash(options.snapshot),
    sourceIds: inputs.map((i) => i.origin.problem.id),
    checkpoints: inputs.map((i) => ({
      sourceId: i.origin.problem.id,
      sha256: hash(
        join(options.generationDir, "sources", i.origin.problem.id + ".json"),
      ),
    })),
    batchSize: 8,
  });
  write(join(options.reviewDir, "summary.json"), {
    version: CODEX_RETRY_BATCH_VERSION,
    reviewed: count,
    passed: count - held,
    held,
    batches: count ? [binding.batchDigest] : [],
    databaseOperations: 0,
  });
  return { root, options, inputs, review, saveReview };
}
type Fixture = ReturnType<typeof fixture>;
const arg = (request: AdoptProcessRequest, flag: string) =>
  request.args[request.args.indexOf(flag) + 1];
function inserted(file: string, ordinal = 0) {
  const entry = read<DbRetryCheckpoint>(file);
  entry.state = "inserted";
  entry.insertionIds ??= [id(100 + ordinal * 2), id(101 + ordinal * 2)];
  entry.rowPayloadDigest ??= sha("synthetic-only-row-" + ordinal);
  entry.receipt = {
    sourceId: entry.sourceId,
    sourceDigest: entry.sourceDigest,
    candidatePayloadDigest: entry.pair!.candidatePayloadDigest,
    rowPayloadDigest: entry.rowPayloadDigest,
    ownedIds: entry.insertionIds,
    externalIds: entry.pair!.candidates.map((c) => c.externalId) as [
      string,
      string,
    ],
    committedAt: "2026-10-11T00:00:00Z",
  };
  write(file, entry);
}
function fakeRenderer(request: AdoptProcessRequest) {
  const packet = arg(request, "--input"),
    candidates = read<{ candidates: DbRetryCandidate[] }>(packet).candidates,
    rows = candidates.length;
  write(join(arg(request, "--out"), "browser-qa.json"), {
    version: "textbook-production-browser-v1",
    passed: true,
    rows,
    inspectedCandidates: rows,
    candidateViewportChecks: rows * 4,
    candidatePayloadSha256: retryReviewPayloadDigest(
      candidates.map((c) => ({ ...c })),
    ),
    inputSha256: hash(packet),
    failures: [],
    checks: [1440, 390].flatMap((width) =>
      ["screen", "print"].map((media) => ({
        width,
        media,
        rows,
        mathErrors: 0,
        documentOverflow: false,
        brokenImages: 0,
        contentOverflow: [],
      })),
    ),
  });
}
function fakeQualifier(request: AdoptProcessRequest) {
  const packet = arg(request, "--packet"),
    reviews = arg(request, "--reviews"),
    render = arg(request, "--render");
  const ownerFiles = request.args.flatMap((a, index) =>
    a === "--owner-receipt" ? [request.args[index + 1]] : [],
  );
  const owners = ownerFiles.map((file) => read<DbRetryCheckpoint>(file));
  const candidates = read<{ candidates: DbRetryCandidate[] }>(
    packet,
  ).candidates;
  write(join(arg(request, "--out"), "receipt.json"), {
    packetFileHash: hash(packet),
    reviewsFileHash: hash(reviews),
    renderFileHash: hash(render),
    ownerReceipts: ownerFiles.map((file) => ({ file, hash: hash(file) })),
    ids: owners.flatMap((e) => e.receipt!.ownedIds),
    pairs: owners.length,
    candidatePayloadDigest: reviewDigest(candidates),
    renderDigest: reviewDigest(read(render)),
    reviewDigest: reviewDigest(read<{ batches: unknown[] }>(reviews).batches),
    proofKind: "machine-codex-batch-blind-review",
    humanLogsCreated: 0,
    appliedAt: "2026-10-11T00:00:00Z",
    after: owners.flatMap((e) =>
      e.receipt!.ownedIds.map((id, index) => ({
        id,
        externalId: e.pair!.candidates[index].externalId,
        reviewStatus: "approved",
        directUseAllowed: true,
      })),
    ),
  });
}
function processFixture(
  f: Fixture,
  intercept?: (
    stage: string,
    request: AdoptProcessRequest,
  ) => Promise<void> | void,
) {
  const stages: string[] = [];
  const runProcess = vi.fn(async (request: AdoptProcessRequest) => {
    const stage = request.args.some((a) => a.endsWith("run.cjs"))
      ? "renderer"
      : request.args.some((a) => a.endsWith("cli.ts"))
        ? "insertion"
        : "qualification";
    stages.push(stage);
    await intercept?.(stage, request);
    if (stage === "renderer") fakeRenderer(request);
    else if (stage === "insertion") {
      const ids = read<string[]>(arg(request, "--source-ids"));
      ids.forEach((id, index) =>
        inserted(join(arg(request, "--out"), "sources", id + ".json"), index),
      );
    } else fakeQualifier(request);
    return {
      exitCode: 0,
      stdout: "postgresql://private:credential@host/db",
      stderr: "api-key=must-never-persist",
    };
  });
  const deps = {
    runProcess,
    env: {
      ALLOW_SHARED_IMPORT: "1",
      DATABASE_URL: "postgresql://inherited-db",
      DIRECT_URL: "postgresql://direct-db",
      DEEPSEEK_API_KEY: "paid-secret",
      OPENAI_API_KEY: "api-secret",
      TYPESAFE_API_KEY: "jev-secret",
      AI_GATEWAY_API_KEY: "gateway-secret",
      OPENAI_BASE_URL: "https://provider",
      NODE_OPTIONS: "--env-file=.env",
      HTTPS_PROXY: "http://routing",
      Path: "test-path",
    },
  };
  return {
    deps,
    stages,
    run: () => runCodexBatchAdopt({ ...f.options, apply: true }, deps),
  };
}

describe("bounded completed-cohort adoption", () => {
  it("parses only required paths and an explicit apply flag, preserving Unicode/spaces", () => {
    const f = fixture();
    const flags = [
      "--snapshot",
      f.options.snapshot,
      "--generation-dir",
      f.options.generationDir,
      "--review-dir",
      f.options.reviewDir,
      "--out",
      f.options.out,
    ];
    expect(parseCodexBatchAdoptOptions(flags)).toEqual(f.options);
    expect(parseCodexBatchAdoptOptions([...flags, "--apply"]).apply).toBe(true);
    for (const extra of [
      ["--generate"],
      ["--apply", "--apply"],
      ["--snapshot", "oops"],
    ])
      expect(() => parseCodexBatchAdoptOptions([...flags, ...extra])).toThrow();
  });
  it("plans without a process, DB, model or network and preserves the full held sibling proof", async () => {
    const f = fixture(),
      runProcess = vi.fn(() => {
        throw new Error("process-forbidden");
      });
    const result = await runCodexBatchAdopt(f.options, { runProcess, env: {} });
    expect(result.status).toBe("planned");
    expect(result.plan).toMatchObject({
      pairs: 1,
      held: 1,
      modelCalls: 0,
      planDatabaseOperations: 0,
    });
    expect(runProcess).not.toHaveBeenCalled();
    expect(read(join(f.options.out, "full-reviews.json"))).toEqual({
      batches: [f.review],
    });
    expect(read(join(f.options.out, "source-ids.json"))).toEqual([id(1)]);
    expect(
      read<{ candidates: DbRetryCandidate[] }>(
        join(f.options.out, "packet.json"),
      ).candidates,
    ).toEqual(f.inputs[0].candidates);
    expect(existsSync(join(f.options.out, "insertion"))).toBe(false);
    await expect(
      runCodexBatchAdopt(f.options, { runProcess, env: {} }),
    ).resolves.toMatchObject({ status: "planned" });
  });
  it("archives a wholly held incomplete-phase batch without submitting it for qualification", async () => {
    const f = fixture(),
      held = fixture(1, 1, 2),
      heldId = id(3);
    const snapshot = read<{ rows: unknown[]; children: unknown[] }>(
      f.options.snapshot,
    );
    snapshot.rows.push(
      ...read<{ rows: unknown[] }>(held.options.snapshot).rows,
    );
    write(f.options.snapshot, snapshot);
    const generationManifestPath = join(
      f.options.generationDir,
      "checkpoint.json",
    );
    const generationManifest = read<Record<string, unknown>>(
      generationManifestPath,
    );
    generationManifest.snapshotDigest = hash(f.options.snapshot);
    write(generationManifestPath, generationManifest);
    const checkpointFile = join(
      f.options.generationDir,
      "sources",
      heldId + ".json",
    );
    write(
      checkpointFile,
      read(join(held.options.generationDir, "sources", heldId + ".json")),
    );
    held.review.communications = [];
    const batchPath = join(f.options.reviewDir, "batches", "2.json");
    write(batchPath, {
      reviewDigest: reviewDigest(held.review),
      review: held.review,
    });
    const caseValue = read<Record<string, unknown>>(
      join(held.options.reviewDir, "cases", heldId + ".json"),
    );
    write(join(f.options.reviewDir, "cases", heldId + ".json"), {
      ...caseValue,
      batchPath,
      reviewDigest: reviewDigest(held.review),
    });
    const manifestPath = join(f.options.reviewDir, "manifest.json");
    const manifest = read<{
      snapshotDigest: string;
      sourceIds: string[];
      checkpoints: { sourceId: string; sha256: string }[];
      batchSize: number;
    }>(manifestPath);
    manifest.snapshotDigest = hash(f.options.snapshot);
    manifest.batchSize = 2;
    manifest.sourceIds.push(heldId);
    manifest.checkpoints.push({
      sourceId: heldId,
      sha256: hash(checkpointFile),
    });
    write(manifestPath, manifest);
    write(join(f.options.reviewDir, "summary.json"), {
      version: CODEX_RETRY_BATCH_VERSION,
      reviewed: 3,
      passed: 1,
      held: 2,
      batches: [f.review.batchDigest, held.review.batchDigest],
      databaseOperations: 0,
    });
    const p = processFixture(f);
    await p.run();
    expect(read(join(f.options.out, "cohort-reviews.json"))).toEqual({
      batches: [f.review, held.review],
    });
    expect(read(join(f.options.out, "full-reviews.json"))).toEqual({
      batches: [f.review],
    });
    expect(p.stages).toEqual(["renderer", "insertion", "qualification"]);
  });
  it.each(["summary", "batch", "case", "output", "receipt"])(
    "rejects incomplete/corrupted %s proof with no process",
    async (kind) => {
      const f = fixture(),
        p = processFixture(f);
      const file =
        kind === "summary"
          ? join(f.options.reviewDir, "summary.json")
          : kind === "batch"
            ? join(f.options.reviewDir, "batches", "1.json")
            : kind === "case"
              ? join(f.options.reviewDir, "cases", id(1) + ".json")
              : kind === "output"
                ? f.review.communications[0].receipt!.outputPath
                : f.review.communications[0].receipt!.receiptPath;
      if (kind === "summary") unlinkSync(file);
      else write(file, { corrupted: true });
      await expect(p.run()).rejects.toThrow();
      expect(p.stages).toEqual([]);
    },
  );
  it.each(["source", "duplicate-slot", "payload", "duplicate-source"])(
    "rejects changed checkpoint %s bindings",
    async (kind) => {
      const f = fixture(),
        p = processFixture(f);
      if (kind === "duplicate-source") {
        const file = join(f.options.reviewDir, "manifest.json"),
          value = read<{ sourceIds: string[] }>(file);
        value.sourceIds[1] = value.sourceIds[0];
        write(file, value);
      } else {
        const file = join(f.options.generationDir, "sources", id(1) + ".json"),
          entry = read<DbRetryCheckpoint>(file);
        if (kind === "source") entry.pair!.candidates[0].sourceId = id(2);
        else if (kind === "duplicate-slot") entry.pair!.candidates[1].slot = 1;
        else entry.pair!.candidates[0].answer = "changed";
        entry.pair!.candidatePayloadDigest = reviewDigest(
          entry.pair!.candidates,
        );
        write(file, entry);
        const manifestFile = join(f.options.reviewDir, "manifest.json");
        const manifest = read<{
          checkpoints: { sourceId: string; sha256: string }[];
        }>(manifestFile);
        manifest.checkpoints[0].sha256 = hash(file);
        write(manifestFile, manifest);
      }
      await expect(p.run()).rejects.toThrow();
      expect(p.stages).toEqual([]);
    },
  );
  it("rejects a forged passed case even if batch, case and summary digests are updated", async () => {
    const f = fixture(),
      p = processFixture(f);
    f.review.cases[0].blindSolutions[0].answer = "12345";
    f.review.cases[0].blindSolutionsDigest = reviewDigest(
      f.review.cases[0].blindSolutions,
    );
    f.saveReview();
    await expect(p.run()).rejects.toThrow();
    expect(p.stages).toEqual([]);
  });
  it("bounds at 256 source pairs and treats an empty/all-held cohort as no-op", async () => {
    for (const f of [fixture(0, 0), fixture(2, 2)]) {
      const p = processFixture(f);
      await expect(p.run()).resolves.toMatchObject({ status: "empty" });
      expect(p.stages).toEqual([]);
    }
    const f = fixture(),
      p = processFixture(f),
      file = join(f.options.reviewDir, "manifest.json");
    const manifest = read<{ sourceIds: string[] }>(file);
    manifest.sourceIds = Array.from({ length: 257 }, (_, n) => id(n));
    write(file, manifest);
    await expect(p.run()).rejects.toThrow("review-source-ids-invalid");
    expect(p.stages).toEqual([]);
  });
  it("requires apply authorization and refuses global live generation/review locks", async () => {
    const f = fixture(),
      p = processFixture(f);
    await expect(
      runCodexBatchAdopt({ ...f.options, apply: true }, { ...p.deps, env: {} }),
    ).rejects.toThrow("allow-shared-import-required");
    for (const [root, lock] of [
      [f.options.generationDir, ".run.lock"],
      [f.options.reviewDir, ".review.lock"],
    ]) {
      write(join(root, lock), { pid: "synthetic-test" });
      await expect(p.run()).rejects.toThrow("live-lock");
      unlinkSync(join(root, lock));
    }
    expect(p.stages).toEqual([]);
  });
  it("runs renderer, insertion, qualifier in order with exact argv and sanitized inherited env", async () => {
    const f = fixture(),
      p = processFixture(f),
      before = hash(join(f.options.generationDir, "sources", id(1) + ".json"));
    const result = await p.run();
    expect(result.status).toBe("qualified");
    expect(p.stages).toEqual(["renderer", "insertion", "qualification"]);
    for (const [request] of p.deps.runProcess.mock.calls) {
      expect(request.executable).toBe(process.execPath);
      expect(request.shell).toBe(false);
      expect(request.windowsHide).toBe(true);
      expect(request.args).not.toContain("--generate");
      expect(request.args.join(" ")).not.toContain("--env-file");
      expect(request.env).toEqual({
        ALLOW_SHARED_IMPORT: "1",
        DATABASE_URL: "postgresql://inherited-db",
        DIRECT_URL: "postgresql://direct-db",
        Path: "test-path",
      });
      expect(request.args.slice(0, 2)).toEqual([
        "--require",
        join(f.options.out, "child-no-dotenv.cjs"),
      ]);
    }
    const insertion = p.deps.runProcess.mock.calls[1][0],
      qualification = p.deps.runProcess.mock.calls[2][0];
    expect(insertion.args).toContain(f.options.snapshot);
    expect(insertion.args).toContain("--resume");
    expect(arg(qualification, "--generation-dir")).toBe(
      f.options.generationDir,
    );
    expect(arg(qualification, "--receipt-root")).toBe(
      join(f.options.reviewDir, "artifacts"),
    );
    expect(arg(qualification, "--owner-receipt")).toBe(
      join(f.options.out, "insertion", "sources", id(1) + ".json"),
    );
    expect(
      hash(join(f.options.generationDir, "sources", id(1) + ".json")),
    ).toBe(before);
    const logs = readdirSync(join(f.options.out, "stages"))
      .map((name) => readFileSync(join(f.options.out, "stages", name), "utf8"))
      .join("\n");
    expect(logs).not.toMatch(/credential|api-key|postgresql/);
  });
  it.each(["renderer", "insertion", "qualification"])(
    "stops after failed %s, retains files, and never manufactures success",
    async (failed) => {
      const f = fixture(),
        p = processFixture(f);
      const good = p.deps.runProcess;
      const failing = vi.fn(async (request: AdoptProcessRequest) => {
        const stage = request.args.some((a) => a.endsWith("run.cjs"))
          ? "renderer"
          : request.args.some((a) => a.endsWith("cli.ts"))
            ? "insertion"
            : "qualification";
        if (stage === failed)
          return { exitCode: 1, stderr: "postgres://secret" };
        return good(request);
      });
      await expect(
        runCodexBatchAdopt(
          { ...f.options, apply: true },
          { ...p.deps, runProcess: failing },
        ),
      ).rejects.toThrow(`${failed}-failed`);
      expect(failing).toHaveBeenCalledTimes(
        ["renderer", "insertion", "qualification"].indexOf(failed) + 1,
      );
      expect(
        existsSync(join(f.options.out, "qualification", "receipt.json")),
      ).toBe(false);
      expect(existsSync(join(f.options.out, "full-reviews.json"))).toBe(true);
      if (failed === "qualification") {
        expect(
          read<DbRetryCheckpoint>(
            join(f.options.out, "insertion", "sources", id(1) + ".json"),
          ).state,
        ).toBe("inserted");
        await expect(p.run()).rejects.toThrow(
          "qualification-receipt-missing-audit-required",
        );
      }
    },
  );
  it.each(["payload", "modes", "missing"])(
    "does not insert after a zero-exit renderer with %s evidence",
    async (bad) => {
      const f = fixture(),
        p = processFixture(f);
      p.deps.runProcess.mockImplementation(async (request) => {
        if (bad !== "missing") {
          fakeRenderer(request);
          const file = join(arg(request, "--out"), "browser-qa.json");
          const render = read<{
            candidatePayloadSha256: string;
            checks: unknown[];
          }>(file);
          if (bad === "payload")
            render.candidatePayloadSha256 = sha("different");
          else render.checks[1] = render.checks[0];
          write(file, render);
        }
        return { exitCode: 0, stdout: "", stderr: "" };
      });
      await expect(p.run()).rejects.toThrow();
      expect(p.deps.runProcess).toHaveBeenCalledTimes(1);
    },
  );
  it("detects payload/checkpoint changes between stages", async () => {
    const f = fixture(),
      p = processFixture(f, (stage) => {
        if (stage === "renderer")
          write(join(f.options.generationDir, "sources", id(1) + ".json"), {
            changed: true,
          });
      });
    await expect(p.run()).rejects.toThrow("input-changed-during-adoption");
    expect(p.stages).toEqual(["renderer"]);
  });
  it("returns an intact existing qualification receipt with no new processes", async () => {
    const f = fixture(),
      p = processFixture(f);
    await p.run();
    const file = join(f.options.out, "qualification", "receipt.json"),
      before = readFileSync(file);
    const tree = (directory: string): unknown =>
      readdirSync(directory).map((name) => {
        const file = join(directory, name),
          stat = statSync(file);
        return [
          name,
          stat.mtimeMs,
          stat.isDirectory() ? tree(file) : hash(file),
        ];
      });
    const beforeTree = tree(f.options.out);
    const result = await p.run();
    expect(result.status).toBe("qualified");
    expect(p.stages).toHaveLength(3);
    expect(readFileSync(file)).toEqual(before);
    expect(tree(f.options.out)).toEqual(beforeTree);
  });
  it("rejects adoption output overlapping generation or snapshot paths", async () => {
    const f = fixture(),
      p = processFixture(f);
    for (const out of [
      f.options.generationDir,
      join(f.options.generationDir, "adoption"),
      f.root,
    ]) {
      await expect(
        runCodexBatchAdopt({ ...f.options, out, apply: true }, p.deps),
      ).rejects.toThrow("output-overlaps");
    }
    expect(p.stages).toEqual([]);
  });
  it("rejects an insertion junction to the original checkpoint tree", async () => {
    const f = fixture(),
      p = processFixture(f);
    await runCodexBatchAdopt(f.options, p.deps);
    const link = join(f.options.out, "insertion");
    symlinkSync(
      f.options.generationDir,
      link,
      process.platform === "win32" ? "junction" : "dir",
    );
    try {
      await expect(p.run()).rejects.toThrow("adoption-output-link-forbidden");
    } finally {
      await rm(link);
    }
    expect(p.stages).toEqual([]);
  });
  it("detects a new generation live lock between renderer and insertion", async () => {
    const f = fixture(),
      p = processFixture(f, (stage) => {
        if (stage === "renderer")
          write(join(f.options.generationDir, ".run.lock"), {
            synthetic: true,
          });
      });
    await expect(p.run()).rejects.toThrow("generation-live-lock");
    expect(p.stages).toEqual(["renderer"]);
  });
  it("refuses an unowned successful insertion result", async () => {
    const f = fixture(),
      p = processFixture(f),
      good = p.deps.runProcess;
    const runProcess = vi.fn(async (request: AdoptProcessRequest) => {
      if (request.args.some((a) => a.endsWith("cli.ts")))
        return { exitCode: 0 };
      return good(request);
    });
    await expect(
      runCodexBatchAdopt(
        { ...f.options, apply: true },
        { ...p.deps, runProcess },
      ),
    ).rejects.toThrow("ownership-intent-missing");
    expect(runProcess).toHaveBeenCalledTimes(2);
  });
  it.each(["ids", "packet", "reviews", "render", "owner", "proof"])(
    "fails closed when completed adoption %s changes",
    async (what) => {
      const f = fixture(),
        p = processFixture(f);
      await p.run();
      const receipt = join(f.options.out, "qualification", "receipt.json"),
        original = readFileSync(receipt);
      if (what === "ids") {
        const value = read<{ ids: string[] }>(receipt);
        value.ids[0] = id(999);
        write(receipt, value);
      } else if (what === "packet")
        write(join(f.options.out, "packet.json"), { candidates: [] });
      else if (what === "reviews")
        write(join(f.options.out, "full-reviews.json"), { batches: [] });
      else if (what === "render")
        write(
          read<{ file: string }>(join(f.options.out, "render-receipt.json"))
            .file,
          {},
        );
      else if (what === "owner")
        write(join(f.options.out, "insertion", "sources", id(1) + ".json"), {});
      else
        write(f.review.communications[0].receipt!.outputPath, {
          changed: true,
        });
      await expect(p.run()).rejects.toThrow();
      expect(p.stages).toHaveLength(3);
      if (what !== "ids") expect(readFileSync(receipt)).toEqual(original);
    },
  );
  it("preserves a lost qualification receipt boundary without rerunning DB stages", async () => {
    const f = fixture(),
      p = processFixture(f);
    await p.run();
    unlinkSync(join(f.options.out, "qualification", "receipt.json"));
    const owner = join(f.options.out, "insertion", "sources", id(1) + ".json"),
      before = hash(owner);
    await expect(p.run()).rejects.toThrow(
      "qualification-receipt-missing-audit-required",
    );
    expect(p.stages).toHaveLength(3);
    expect(hash(owner)).toBe(before);
  });
  it("recovers a real owned inserted checkpoint without inventing IDs or rerunning insertion", async () => {
    const f = fixture(),
      file = join(f.options.generationDir, "sources", id(1) + ".json");
    inserted(file);
    const p = processFixture(f),
      before = hash(file);
    await p.run();
    expect(p.stages).toEqual(["renderer", "qualification"]);
    expect(hash(file)).toBe(before);
  });
  it("preserves inserting intent after a lost insertion receipt and delegates recovery to the old CLI", async () => {
    const f = fixture(),
      p = processFixture(f),
      good = p.deps.runProcess;
    const failed = vi.fn(async (request: AdoptProcessRequest) => {
      if (request.args.some((a) => a.endsWith("cli.ts"))) {
        const file = join(arg(request, "--out"), "sources", id(1) + ".json");
        inserted(file);
        const entry = read<DbRetryCheckpoint>(file);
        entry.state = "inserting";
        delete entry.receipt;
        write(file, entry);
        return { exitCode: 1, stdout: "", stderr: "" };
      }
      return good(request);
    });
    await expect(
      runCodexBatchAdopt(
        { ...f.options, apply: true },
        { ...p.deps, runProcess: failed },
      ),
    ).rejects.toThrow("insertion-failed");
    const owner = join(f.options.out, "insertion", "sources", id(1) + ".json"),
      intent = read<DbRetryCheckpoint>(owner).insertionIds;
    await p.run();
    expect(read<DbRetryCheckpoint>(owner).insertionIds).toEqual(intent);
  });
  it("does not regenerate missing ownership checkpoints after insertion started", async () => {
    const f = fixture(),
      p = processFixture(f);
    await p.run();
    unlinkSync(join(f.options.out, "qualification", "receipt.json"));
    const owner = join(f.options.out, "insertion", "sources", id(1) + ".json");
    unlinkSync(owner);
    await expect(p.run()).rejects.toThrow();
    expect(existsSync(owner)).toBe(false);
    expect(p.stages).toHaveLength(3);
  });
});

describe("child dotenv and credential boundary", () => {
  it("uses an allowlist even for unknown providers and Windows case variants", () => {
    expect(
      adoptionChildEnv({
        Database_URL: "db",
        pgpassword: "db-pass",
        Path: "os",
        Unknown_PROVIDER_KEY: "x",
        azure_openai_endpoint: "route",
        ANTHROPIC_AUTH_TOKEN: "token",
        CODEX_HOME: "config",
        NODE_PATH: "inject",
        DOTENV_CONFIG_PATH: "keys",
      }),
    ).toEqual({ Database_URL: "db", pgpassword: "db-pass", Path: "os" });
  });
  it("preload blocks sync/async/promise dotenv reads and process.loadEnvFile without a process", async () => {
    const reached = vi.fn(() => "non-env-ok");
    const fs: Record<string, unknown> = { existsSync: reached, promises: {} };
    for (const key of [
      "readFileSync",
      "openSync",
      "statSync",
      "accessSync",
      "createReadStream",
      "readFile",
      "open",
      "stat",
      "access",
    ])
      fs[key] = reached;
    for (const key of ["readFile", "open", "stat", "access"])
      (fs.promises as Record<string, unknown>)[key] = reached;
    const proc = { loadEnvFile: reached };
    runInNewContext(ADOPTION_CHILD_PRELOAD, {
      require: (name: string) =>
        name === "node:fs"
          ? fs
          : name === "node:path"
            ? { basename: (value: string) => value.split(/[\\/]/).pop() }
            : name === "node:url"
              ? { fileURLToPath: (url: URL) => url.pathname }
              : { syncBuiltinESMExports: () => {} },
      process: proc,
      URL,
      queueMicrotask,
    });
    expect(
      (fs.existsSync as (file: string) => boolean)("C:/private/.env"),
    ).toBe(false);
    expect(() =>
      (fs.readFileSync as (file: string) => unknown)("C:/private/.env.local"),
    ).toThrow("dotenv-read-disabled");
    await expect(
      (
        fs.promises as { readFile: (file: string) => Promise<unknown> }
      ).readFile("/private/.env"),
    ).rejects.toThrow("dotenv-read-disabled");
    expect(() => proc.loadEnvFile()).toThrow("dotenv-read-disabled");
    expect(reached).not.toHaveBeenCalled();
    expect(
      (fs.readFileSync as (file: string) => unknown)("snapshot.json"),
    ).toBe("non-env-ok");
  });
});
