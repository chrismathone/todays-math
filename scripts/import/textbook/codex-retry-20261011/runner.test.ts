import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { reviewDigest } from "../../../../src/lib/import/schoolTextbook/qualification";
import type { DbRetryOrigin } from "../../../../src/lib/import/schoolTextbook/dbRetry.types";
import {
  DbRetryCheckpointStore,
  readDbRetrySnapshot,
} from "../db-retry-20261011/checkpoint";
import { parseCodexBatchOptions, runCodexBatch } from "./runner";
import { createCodexJsonRunner, type CodexProcessRequest } from "./transport";

const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((dir) => {
      if (!dir.startsWith(join(tmpdir(), "codex-batch-test-")))
        throw new Error("unsafe-test-cleanup");
      return rm(dir, { recursive: true, force: true });
    }),
  );
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
      external_id: "original-external-1",
      source_file: "books/one.hwpx",
      figure_svg: null,
      figure_urls: [],
      figure_dims: [],
      figure_source_mm: [],
      choice_figure_index: [],
    },
  };
}
async function fixture(count = 1) {
  const dir = await mkdtemp(join(tmpdir(), "codex-batch-test-"));
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
    origins,
    options: {
      ...parseCodexBatchOptions([
        "--snapshot",
        snapshot,
        "--out",
        out,
        "--generate",
        "--limit",
        "10",
      ]),
      snapshot,
      out,
    },
  };
}
function fakeGeneration() {
  let calls = 0;
  const process = vi.fn(async (request: CodexProcessRequest) => {
    const base = { exitCode: 0, signal: null, stdout: "", stderr: "" };
    if (request.args[0] === "login")
      return { ...base, stdout: "Logged in using ChatGPT" };
    if (request.args[0] === "--version")
      return { ...base, stdout: "codex-cli 0.162.1" };
    calls++;
    await writeFile(
      request.args[request.args.indexOf("--output-last-message") + 1]!,
      JSON.stringify({
        content: `$${calls + 3}+3$을 계산하시오.`,
        answer: `$${calls + 6}$`,
        solution: `$${calls + 3}+3=${calls + 6}$이다.`,
        originalAnswerRecomputed: "$5$",
        figureSpecJson: null,
      }),
    );
    return {
      ...base,
      stdout: [
        { type: "thread.started", thread_id: `test-thread-${calls}` },
        {
          type: "turn.completed",
          usage: {
            input_tokens: 10,
            cached_input_tokens: 0,
            output_tokens: 20,
          },
        },
      ]
        .map((o) => JSON.stringify(o))
        .join("\n"),
    };
  });
  return { process, run: createCodexJsonRunner(process) };
}
const figures = { images: [], digest: reviewDigest([]) };

describe("bounded Codex generation", () => {
  it("defaults to dry-run and rejects unbounded, unsupported and DB-writing modes", () => {
    expect(parseCodexBatchOptions(["--snapshot", "example.json"]).mode).toBe(
      "plan",
    );
    for (const flags of [
      ["--generate"],
      ["--apply"],
      ["--generate", "--limit", "101"],
      ["--concurrency", "5"],
      ["--limit", "0"],
      ["--generate", "--dry-run", "--limit", "1"],
      ["--model", "paid-api-model"],
    ]) {
      expect(() =>
        parseCodexBatchOptions(["--snapshot", "example.json", ...flags]),
      ).toThrow();
    }
  });
  it("dry-run never invokes inference or even figure loading", async () => {
    const { options } = await fixture();
    const run = vi.fn(),
      loadFigures = vi.fn(),
      log = vi.fn();
    const result = await runCodexBatch(
      { ...options, mode: "plan" },
      { run, loadFigures, log },
    );
    expect(result).toEqual({ failed: 0, generated: 0, selected: 1 });
    expect(run).not.toHaveBeenCalled();
    expect(loadFigures).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ modelCalls: 0, dbWrites: 0 }),
    );
  });
  it("generates two pending slots with honest model labels and resumes without more calls", async () => {
    const { options, origins } = await fixture();
    const transport = fakeGeneration();
    const log = vi.fn();
    const result = await runCodexBatch(options, {
      run: transport.run,
      loadFigures: async () => figures,
      log,
    });
    expect(result.generated).toBe(1);
    const data = readDbRetrySnapshot(await readFile(options.snapshot));
    const store = new DbRetryCheckpointStore(options.out, data.digest, true);
    try {
      const saved = store.read(origins[0]!)!;
      expect(saved.state).toBe("generated");
      expect(saved.pair?.mathematicalApproval).toBe(false);
      expect(saved.pair?.candidates.map((c) => c.slot)).toEqual([1, 2]);
      expect(saved.pair?.calls.map((c) => c.requestedModel)).toEqual([
        "codex-account-default",
        "codex-account-default",
      ]);
      expect(saved.pair?.calls.map((c) => c.model)).toEqual([
        "codex-model-unobserved",
        "codex-model-unobserved",
      ]);
      expect(saved.pair?.candidatePayloadDigest).toBe(
        reviewDigest(saved.pair?.candidates),
      );
      expect(saved.pair?.sourceFigureDigest).toBe(figures.digest);
      const index = JSON.parse(
        await readFile(
          join(options.out, "sources", `${origins[0]!.problem.id}.codex.json`),
          "utf8",
        ),
      );
      expect(index.receipts).toHaveLength(2);
    } finally {
      store.close();
    }
    transport.process.mockClear();
    expect(
      await runCodexBatch(
        { ...options, resume: true },
        { run: transport.run, log },
      ),
    ).toEqual({ failed: 0, generated: 0, selected: 0 });
    expect(transport.process).not.toHaveBeenCalled();
  });
  it("persists a failed source and stops scheduling after a transport failure", async () => {
    const { options, origins } = await fixture(3);
    const run = vi.fn(async () => {
      throw new Error("secret upstream failure");
    });
    await expect(
      runCodexBatch(options, {
        run,
        loadFigures: async () => figures,
        log: vi.fn(),
      }),
    ).rejects.toThrow("batch-transport-stopped");
    expect(run).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(
      await readFile(
        join(options.out, "sources", `${origins[0]!.problem.id}.json`),
        "utf8",
      ),
    );
    expect(saved).toMatchObject({
      state: "failed",
      reason: "generation-transport",
    });
    expect(saved.pair).toBeUndefined();
    expect(JSON.stringify(saved)).not.toContain("secret");
    const transport = fakeGeneration();
    expect(
      (
        await runCodexBatch(
          { ...options, resume: true, sourceIds: [origins[0]!.problem.id] },
          { run: transport.run, log: vi.fn() },
        )
      ).selected,
    ).toBe(0);
    expect(
      (
        await runCodexBatch(
          {
            ...options,
            resume: true,
            retryFailed: true,
            sourceIds: [origins[0]!.problem.id],
          },
          {
            run: transport.run,
            loadFigures: async () => figures,
            log: vi.fn(),
          },
        )
      ).generated,
    ).toBe(1);
  });
  it("never schedules a source after cancellation, and releases the run lock", async () => {
    const { options } = await fixture();
    const controller = new AbortController();
    controller.abort();
    const run = vi.fn();
    await expect(
      runCodexBatch(options, { run, signal: controller.signal, log: vi.fn() }),
    ).rejects.toThrow("batch-aborted");
    expect(run).not.toHaveBeenCalled();
    await expect(
      readFile(join(options.out, ".run.lock")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
  it("refuses a changed snapshot on resume", async () => {
    const { options } = await fixture();
    const transport = fakeGeneration();
    await runCodexBatch(options, {
      run: transport.run,
      loadFigures: async () => figures,
      log: vi.fn(),
    });
    await writeFile(
      options.snapshot,
      (await readFile(options.snapshot, "utf8")) + " ",
    );
    await expect(
      runCodexBatch(
        { ...options, resume: true },
        { run: transport.run, log: vi.fn() },
      ),
    ).rejects.toThrow("checkpoint-snapshot-changed");
  });
});
