import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DbRetryOrigin } from "../../../../src/lib/import/schoolTextbook/dbRetry.types";
import { reviewDigest } from "../../../../src/lib/import/schoolTextbook/qualification";
import {
  DbRetryCheckpointStore,
  freshDbRetryCheckpoint,
  parseCodexGroupedOptions,
  readDbRetrySnapshot,
  runCodexGroupedBatch,
} from "./batch-runner";
import { createCodexJsonRunner, type CodexProcessRequest } from "./transport";
import { DbRetryCheckpointStore as ExistingCheckpointStore } from "../db-retry-20261011/checkpoint";

vi.mock("openai", () => {
  throw new Error("paid-provider-import-forbidden");
});
vi.mock("../../../../src/lib/ai/client", () => {
  throw new Error("paid-provider-import-forbidden");
});
// Exercise the existing reader while substituting its paid-provider-owning dependency.
vi.mock(
  "../../../../src/lib/import/schoolTextbook/dbRetryGeneration",
  async () => {
    const safe = await import("./batch-generation");
    return {
      DB_RETRY_GENERATION_VERSION: safe.GROUPED_PAIR_VERSION,
      dbRetryOriginIssue: safe.groupedOriginIssue,
    };
  },
);
const dirs: string[] = [];
afterEach(async () => {
  for (const dir of dirs.splice(0)) {
    const absolute = resolve(dir),
      base = resolve(tmpdir());
    if (
      !absolute.startsWith(base + sep) ||
      !absolute.slice(base.length + 1).startsWith("codex-grouped-test-")
    )
      throw new Error("unsafe-test-cleanup");
    await rm(absolute, { recursive: true, force: true });
  }
});
function origin(): DbRetryOrigin {
  return {
    grade: "공통수학1",
    chapter: "다항식",
    section: "다항식의 계산",
    problem: {
      id: randomUUID(),
      source: "school_textbook",
      pool: "shared",
      content: "$2+3$을 계산하시오.",
      answer: "$5$",
      solution: "$2+3=5$이다.",
      difficulty: "기본",
      problem_type: "계산",
      question_type: "단답형",
      direct_use_allowed: true,
      review_status: "approved",
      origin_problem_id: null,
      unit_id: randomUUID(),
      source_material_id: randomUUID(),
      family_key: "textbook:poly-1",
      external_id: "original-external",
      source_file: "books/one.hwpx",
      figure_svg: null,
      figure_urls: [],
      figure_dims: [],
      figure_source_mm: [],
      choice_figure_index: [],
    },
  };
}
async function fixture(count = 2) {
  const dir = await mkdtemp(join(tmpdir(), "codex-grouped-test-"));
  dirs.push(dir);
  const origins = Array.from({ length: count }, origin);
  const snapshot = join(dir, "snapshot.json"),
    out = join(dir, "out");
  await writeFile(
    snapshot,
    JSON.stringify({
      rows: origins.map((o) => ({
        problem: o.problem,
        unit: { grade: o.grade, chapter: o.chapter, section: o.section },
      })),
      children: [],
    }),
  );
  return {
    dir,
    origins,
    options: parseCodexGroupedOptions([
      "--snapshot",
      snapshot,
      "--out",
      out,
      "--generate",
      "--limit",
      "1000",
      "--batch-size",
      "8",
    ]),
  };
}
type FakeItem = {
  sourceId: string;
  sourceDigest: string;
  originDigest: string;
  sourceFigureDigest: string;
  slot: number;
  transformation: string;
  changeSummary: string;
  content: string;
  answer: string;
  solution: string;
  originalAnswerRecomputed: string;
  figureSpecJson: null;
};
function fakeGeneration(
  edit?: (items: FakeItem[], call: number) => void | Promise<void>,
) {
  let calls = 0,
    active = 0,
    peak = 0;
  const process = vi.fn(async (request: CodexProcessRequest) => {
    const base = { exitCode: 0, signal: null, stdout: "", stderr: "" };
    if (request.args[0] === "login")
      return { ...base, stdout: "Logged in using ChatGPT" };
    if (request.args[0] === "--version")
      return { ...base, stdout: "codex-cli 0.162.1" };
    const n = ++calls;
    active++;
    peak = Math.max(peak, active);
    try {
      const sources = JSON.parse(
        request.stdin.split("SOURCE_DATA_JSON\n")[1]!,
      ) as {
        sourceId: string;
        sourceDigest: string;
        originDigest: string;
        sourceFigureDigest: string;
      }[];
      const items: FakeItem[] = sources
        .flatMap((s, i) =>
          [1, 2].map((slot) => ({
            ...s,
            slot,
            transformation: "numbers",
            changeSummary: `첫 수를 ${10 + i * 10 + slot}로 변경`,
            content: `$${10 + i * 10 + slot}+3$을 계산하시오.`,
            answer: `$${13 + i * 10 + slot}$`,
            solution: `$${10 + i * 10 + slot}+3=${13 + i * 10 + slot}$이다.`,
            originalAnswerRecomputed: "$5$",
            figureSpecJson: null,
          })),
        )
        .map(
          ({
            sourceId,
            sourceDigest,
            originDigest,
            sourceFigureDigest,
            slot,
            transformation,
            changeSummary,
            content,
            answer,
            solution,
            originalAnswerRecomputed,
            figureSpecJson,
          }) => ({
            sourceId,
            sourceDigest,
            originDigest,
            sourceFigureDigest,
            slot,
            transformation,
            changeSummary,
            content,
            answer,
            solution,
            originalAnswerRecomputed,
            figureSpecJson,
          }),
        );
      await edit?.(items, n);
      await writeFile(
        request.args[request.args.indexOf("--output-last-message") + 1]!,
        JSON.stringify({ items: items.reverse() }),
      );
      return {
        ...base,
        stdout: [
          { type: "thread.started", thread_id: `injected-thread-${n}` },
          {
            type: "turn.completed",
            usage: {
              input_tokens: 100,
              cached_input_tokens: 20,
              output_tokens: 40,
            },
          },
        ]
          .map((e) => JSON.stringify(e))
          .join("\n"),
      };
    } finally {
      active--;
    }
  });
  return {
    process,
    run: createCodexJsonRunner(process),
    count: () => calls,
    peak: () => peak,
  };
}
const emptyFigures = { images: [], digest: reviewDigest([]) };
const dependencies = { loadFigures: async () => emptyFigures, log: vi.fn() };
function saved(out: string, id: string) {
  return JSON.parse(readFileSync(join(out, "sources", `${id}.json`), "utf8"));
}

describe("bounded grouped runner", () => {
  it("defaults to dry-run and strictly bounds flags without apply/provider/model switches", () => {
    expect(
      parseCodexGroupedOptions(["--snapshot", "snapshot.json"]),
    ).toMatchObject({ mode: "plan", batchSize: 8, concurrency: 1 });
    expect(
      parseCodexGroupedOptions([
        "--snapshot",
        "snapshot.json",
        "--generate",
        "--limit",
        "1000",
        "--batch-size",
        "16",
        "--concurrency",
        "3",
      ]),
    ).toMatchObject({ limit: 1000, batchSize: 16, concurrency: 3 });
    for (const flags of [
      ["--generate"],
      ["--apply"],
      ["--model", "x"],
      ["--provider", "x"],
      ["--limit", "1001"],
      ["--limit", "0"],
      ["--batch-size", "17"],
      ["--batch-size", "0"],
      ["--concurrency", "4"],
      ["--concurrency", "1.5"],
      ["--retry-failed"],
      ["--generate", "--dry-run", "--limit", "1"],
      ["--limit", "1", "--limit", "2"],
    ])
      expect(() =>
        parseCodexGroupedOptions(["--snapshot", "snapshot.json", ...flags]),
      ).toThrow();
  });
  it("dry-run creates no output, loads no figures and invokes no model", async () => {
    const { options } = await fixture();
    const run = vi.fn(),
      loadFigures = vi.fn();
    expect(
      await runCodexGroupedBatch(
        { ...options, mode: "plan" },
        { run, loadFigures, log: vi.fn() },
      ),
    ).toEqual({ selected: 2, generated: 0, failed: 0, modelCalls: 0 });
    expect(run).not.toHaveBeenCalled();
    expect(loadFigures).not.toHaveBeenCalled();
    expect(existsSync(options.out)).toBe(false);
  });
  it("one call generates up to 16 source pairs, with once-only shared token accounting", async () => {
    const { options, origins } = await fixture(16),
      fake = fakeGeneration();
    expect(
      await runCodexGroupedBatch(
        { ...options, batchSize: 16 },
        { ...dependencies, run: fake.run },
      ),
    ).toEqual({ selected: 16, generated: 16, failed: 0, modelCalls: 1 });
    expect(fake.count()).toBe(1);
    const calls = readdirSync(join(options.out, "grouped-calls"));
    expect(calls).toHaveLength(1);
    const call = JSON.parse(
      await readFile(join(options.out, "grouped-calls", calls[0]!), "utf8"),
    );
    expect(call.receipt.usage).toEqual({
      inputTokens: 100,
      cachedInputTokens: 20,
      outputTokens: 40,
    });
    expect(call.items).toHaveLength(32);
    const store = new ExistingCheckpointStore(
      options.out,
      readDbRetrySnapshot(await readFile(options.snapshot)).digest,
      true,
    );
    try {
      for (const o of origins) {
        const entry = store.read(o)!;
        expect(entry.state).toBe("generated");
        expect(entry.calls).toEqual([]);
        expect(entry.pair!.calls).toEqual([]);
        const index = JSON.parse(
          await readFile(
            join(options.out, "sources", `${o.problem.id}.codex-grouped.json`),
            "utf8",
          ),
        );
        expect(index.receiptId).toBe(call.receipt.id);
        expect(index.usage).toBeUndefined();
        expect(index.receipts).toBeUndefined();
        expect(
          index.items.map(
            (i: { candidateDigest: string }) => i.candidateDigest,
          ),
        ).toEqual(entry.pair!.candidates.map((c) => reviewDigest(c)));
      }
    } finally {
      store.close();
    }
  });
  it("runs bounded groups concurrently and respects a source count limit including final partial group", async () => {
    const { options } = await fixture(30),
      fake = fakeGeneration(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    expect(
      await runCodexGroupedBatch(
        { ...options, limit: 19, batchSize: 8, concurrency: 2 },
        { ...dependencies, run: fake.run },
      ),
    ).toEqual({ selected: 19, generated: 19, failed: 0, modelCalls: 3 });
    expect(fake.count()).toBe(3);
    expect(fake.peak()).toBeLessThanOrEqual(2);
    expect(fake.peak()).toBe(2);
  });
  it("preserves prior generated checkpoints, old per-slot calls and the original snapshot manifest on resume", async () => {
    const { options, origins } = await fixture(3),
      fake = fakeGeneration();
    await runCodexGroupedBatch(
      { ...options, sourceIds: [origins[0]!.problem.id] },
      { ...dependencies, run: fake.run },
    );
    const digest = readDbRetrySnapshot(await readFile(options.snapshot)).digest;
    const store = new DbRetryCheckpointStore(options.out, digest, true);
    try {
      const entry = store.read(origins[0]!)!;
      entry.calls = [
        {
          slot: 1,
          attempt: 1,
          requestedModel: "codex-account-default",
          model: "codex-model-unobserved",
          startedAt: entry.updatedAt,
          latencyMs: 10,
          usage: { promptTokens: 21, completionTokens: 2, totalTokens: 23 },
          finishReason: "stop",
          status: "received",
        },
      ];
      entry.pair!.calls = [...entry.calls];
      entry.pair!.promptVersion = "v4";
      store.write(entry);
    } finally {
      store.close();
    }
    const path = join(options.out, "sources", `${origins[0]!.problem.id}.json`);
    const before = await readFile(path),
      manifest = await readFile(join(options.out, "checkpoint.json"));
    const result = await runCodexGroupedBatch(
      { ...options, resume: true, retryFailed: true },
      { ...dependencies, run: fake.run },
    );
    expect(result).toEqual({
      selected: 2,
      generated: 2,
      failed: 0,
      modelCalls: 1,
    });
    expect(await readFile(path)).toEqual(before);
    expect(await readFile(join(options.out, "checkpoint.json"))).toEqual(
      manifest,
    );
    const noCalls = vi.fn();
    expect(
      await runCodexGroupedBatch(
        { ...options, resume: true },
        { ...dependencies, run: noCalls },
      ),
    ).toEqual({ selected: 0, generated: 0, failed: 0, modelCalls: 0 });
    expect(noCalls).not.toHaveBeenCalled();
  });
  it("rejects partial output atomically, persists no generated pair and retries only when explicit", async () => {
    const { options, origins } = await fixture(),
      fake = fakeGeneration((items) => {
        items.pop();
      });
    // The transport rejects the incomplete strict schema, and scheduling stops.
    await expect(
      runCodexGroupedBatch(options, { ...dependencies, run: fake.run }),
    ).rejects.toThrow("grouped-batch-stopped");
    for (const o of origins)
      expect(saved(options.out, o.problem.id)).toMatchObject({
        state: "failed",
        attempts: 1,
        reason: "grouped-transport-failed",
      });
    for (const o of origins)
      expect(saved(options.out, o.problem.id).pair).toBeUndefined();
    const never = vi.fn();
    expect(
      (
        await runCodexGroupedBatch(
          { ...options, resume: true },
          { ...dependencies, run: never },
        )
      ).selected,
    ).toBe(0);
    expect(never).not.toHaveBeenCalled();
    const good = fakeGeneration();
    expect(
      (
        await runCodexGroupedBatch(
          { ...options, resume: true, retryFailed: true },
          { ...dependencies, run: good.run },
        )
      ).generated,
    ).toBe(2);
    expect(readdirSync(join(options.out, "grouped-calls"))).toHaveLength(2);
    for (const o of origins)
      expect(saved(options.out, o.problem.id).attempts).toBe(2);
  });
  it("wrong source digests reject a whole group even if another item is valid", async () => {
    const { options, origins } = await fixture(),
      fake = fakeGeneration((items) => {
        items[0]!.sourceDigest = "f".repeat(64);
      });
    expect(
      await runCodexGroupedBatch(options, { ...dependencies, run: fake.run }),
    ).toEqual({ selected: 2, generated: 0, failed: 2, modelCalls: 1 });
    for (const o of origins)
      expect(saved(options.out, o.problem.id).pair).toBeUndefined();
  });
  it("stops scheduling after a transport failure and removes the lock without leaking upstream details", async () => {
    const { options, origins } = await fixture(6);
    const run = vi.fn(async () => {
      throw new Error("secret upstream detail");
    });
    await expect(
      runCodexGroupedBatch(
        { ...options, batchSize: 2 },
        { ...dependencies, run },
      ),
    ).rejects.toThrow("grouped-batch-stopped");
    expect(run).toHaveBeenCalledTimes(1);
    expect(existsSync(join(options.out, ".run.lock"))).toBe(false);
    expect(saved(options.out, origins[0]!.problem.id).pair).toBeUndefined();
    expect(
      JSON.stringify(saved(options.out, origins[0]!.problem.id)),
    ).not.toContain("secret");
    expect(
      existsSync(
        join(options.out, "sources", `${origins[2]!.problem.id}.json`),
      ),
    ).toBe(false);
  });
  it("cancellation before or during the call never leaves a generated checkpoint", async () => {
    const { options, origins } = await fixture(),
      aborted = new AbortController(),
      run = vi.fn();
    aborted.abort();
    await expect(
      runCodexGroupedBatch(options, {
        ...dependencies,
        run,
        signal: aborted.signal,
      }),
    ).rejects.toThrow("grouped-aborted");
    expect(run).not.toHaveBeenCalled();
    expect(existsSync(join(options.out, ".run.lock"))).toBe(false);
    const controller = new AbortController(),
      fake = fakeGeneration(() => controller.abort());
    await expect(
      runCodexGroupedBatch(
        { ...options, resume: true },
        { ...dependencies, run: fake.run, signal: controller.signal },
      ),
    ).rejects.toThrow("grouped-batch-stopped");
    for (const o of origins)
      expect(saved(options.out, o.problem.id).pair).toBeUndefined();
    expect(existsSync(join(options.out, ".run.lock"))).toBe(false);
  });
  it("rejects changed snapshots on resume and snapshots replaced during inference", async () => {
    const { options, origins } = await fixture();
    const before = await readFile(options.snapshot);
    const fake = fakeGeneration(async () => {
      await writeFile(
        options.snapshot,
        Buffer.concat([before, Buffer.from(" ")]),
      );
    });
    await expect(
      runCodexGroupedBatch(options, { ...dependencies, run: fake.run }),
    ).rejects.toThrow("grouped-batch-stopped");
    for (const o of origins)
      expect(saved(options.out, o.problem.id).pair).toBeUndefined();
    const never = vi.fn();
    await expect(
      runCodexGroupedBatch(
        { ...options, resume: true },
        { ...dependencies, run: never },
      ),
    ).rejects.toThrow("checkpoint-snapshot-changed");
    expect(never).not.toHaveBeenCalled();
  });
  it("preserves existing pairs, skips held originals and validates current source IDs", async () => {
    const { options, origins, dir } = await fixture(4);
    const snapshot = JSON.parse(await readFile(options.snapshot, "utf8"));
    snapshot.rows[1].problem.direct_use_allowed = false;
    snapshot.children = [1, 2].map((slot) => ({
      ...origins[0]!.problem,
      id: randomUUID(),
      source: "transformed",
      origin_problem_id: origins[0]!.problem.id,
      external_id: `tb-retry-v1:${origins[0]!.problem.id}:${slot}`,
    }));
    await writeFile(options.snapshot, JSON.stringify(snapshot));
    const idsPath = join(dir, "ids.json");
    await writeFile(idsPath, JSON.stringify(origins.map((o) => o.problem.id)));
    const parsed = parseCodexGroupedOptions([
      "--snapshot",
      options.snapshot,
      "--source-ids",
      idsPath,
    ]);
    expect(
      (
        await runCodexGroupedBatch(
          { ...options, mode: "plan", sourceIds: parsed.sourceIds },
          dependencies,
        )
      ).selected,
    ).toBe(2);
    await expect(
      runCodexGroupedBatch(
        { ...options, mode: "plan", sourceIds: [randomUUID()] },
        dependencies,
      ),
    ).rejects.toThrow("selection-source-ids");
    for (const invalid of [
      [],
      ["bad"],
      [origins[0]!.problem.id, origins[0]!.problem.id],
    ]) {
      await writeFile(idsPath, JSON.stringify(invalid));
      expect(() =>
        parseCodexGroupedOptions([
          "--snapshot",
          options.snapshot,
          "--source-ids",
          idsPath,
        ]),
      ).toThrow("source-ids-file-invalid");
    }
  });
  it("fails closed on stale source checkpoints rather than overwriting them", async () => {
    const { options, origins } = await fixture();
    const store = new DbRetryCheckpointStore(
      options.out,
      readDbRetrySnapshot(await readFile(options.snapshot)).digest,
      false,
    );
    try {
      store.write({
        ...freshDbRetryCheckpoint(origins[0]!),
        sourceDigest: "a".repeat(64),
      });
    } finally {
      store.close();
    }
    const path = join(options.out, "sources", `${origins[0]!.problem.id}.json`),
      before = await readFile(path),
      run = vi.fn();
    await expect(
      runCodexGroupedBatch(
        { ...options, resume: true },
        { ...dependencies, run },
      ),
    ).rejects.toThrow("checkpoint-source-changed");
    expect(run).not.toHaveBeenCalled();
    expect(await readFile(path)).toEqual(before);
  });
  it("rejects source mutation by a figure loader before checkpoint persistence", async () => {
    const { options, origins } = await fixture(),
      fake = fakeGeneration();
    await expect(
      runCodexGroupedBatch(options, {
        ...dependencies,
        run: fake.run,
        loadFigures: async (p) => {
            Object.assign(p, { extraMutatedField: "changed" });
          return emptyFigures;
        },
      }),
    ).rejects.toThrow("grouped-batch-stopped");
    for (const o of origins)
      expect(saved(options.out, o.problem.id).pair).toBeUndefined();
  });
});
