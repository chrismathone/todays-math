// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DevAiProvider } from "../../lib/dev-ai/contracts";

vi.mock("server-only", () => ({}));
vi.mock("../../lib/dev-ai/cli-discovery", () => ({
  discoverSubscriptionCli: vi.fn(),
}));
vi.mock("../../lib/dev-ai/cli-process", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../lib/dev-ai/cli-process")>();
  return {
    ...actual,
    runCliProcess: vi.fn(),
    withCliTemp: vi.fn(actual.withCliTemp),
  };
});
vi.mock("../../lib/dev-ai/cli-metadata", () => ({
  inspectAdditionalProvider: vi.fn(),
}));

const help =
  "--ignore-user-config --ignore-rules --ephemeral --sandbox --json --image --safe-mode --restricted --setting-sources --settings --tools --strict-mcp-config --input-format --output-format --permission-prompts --no-session-persistence";

describe("public subscription adapter boundary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function harness() {
    const discovery = await import("../../lib/dev-ai/cli-discovery");
    const processes = await import("../../lib/dev-ai/cli-process");
    const metadata = await import("../../lib/dev-ai/cli-metadata");
    vi.mocked(discovery.discoverSubscriptionCli).mockImplementation(
      async (provider) => ({ command: provider, prefix: [] }),
    );
    vi.mocked(metadata.inspectAdditionalProvider).mockResolvedValue({
      status: "unverified",
      detail: "Login not verified.",
    });
    const run = vi.mocked(processes.runCliProcess);
    const api = await import("../../lib/dev-ai/cli");
    return { api, run, temp: vi.mocked(processes.withCliTemp) };
  }

  it("admits two whole requests, queues FIFO, and frees admission after abort or failure", async () => {
    const { api, run, temp } = await harness();
    const { abortError } = await import("../../lib/dev-ai/cli-process");
    const started: string[] = [];
    const pending = new Map<
      string,
      { complete: () => void; fail: () => void }
    >();
    let peak = 0;
    run.mockImplementation(async (_executable, args, options) => {
      if (args.includes("--help"))
        return { stdout: help, stderr: "", exitCode: 0 };
      if (args.includes("login"))
        return { stdout: "Logged in using ChatGPT", stderr: "", exitCode: 0 };
      const prompt = options.input!;
      started.push(prompt);
      return new Promise((resolve, reject) => {
        const cleanup = () => {
          pending.delete(prompt);
          options.signal?.removeEventListener("abort", abort);
        };
        const abort = () => {
          cleanup();
          reject(abortError());
        };
        pending.set(prompt, {
          complete: () => {
            cleanup();
            resolve({
              stdout:
                '{"type":"item.completed","item":{"type":"agent_message","text":"4"}}\n{"type":"turn.completed"}',
              stderr: "",
              exitCode: 0,
            });
          },
          fail: () => {
            cleanup();
            reject(new Error("local launch failed"));
          },
        });
        peak = Math.max(peak, pending.size);
        options.signal?.addEventListener("abort", abort, { once: true });
        if (options.signal?.aborted) abort();
      });
    });
    const request = (prompt: string, signal?: AbortSignal) =>
      api
        .runSubscriptionCli({ provider: "codex", prompt, signal })
        .catch((error: Error) => error);
    const first = request("first");
    const second = request("second");
    const queuedAbort = new AbortController();
    const cancelled = request("cancelled", queuedAbort.signal);
    const activeAbort = new AbortController();
    const third = request("third", activeAbort.signal);
    const fourth = request("fourth");
    await vi.waitFor(() => expect(pending.size).toBe(2));
    expect(started.toSorted()).toEqual(["first", "second"]);
    expect(temp).toHaveBeenCalledTimes(2);
    queuedAbort.abort();
    expect(await cancelled).toMatchObject({ code: "cancelled" });
    expect(temp).toHaveBeenCalledTimes(2);
    pending.get("first")!.complete();
    expect(await first).toBe("4");
    await vi.waitFor(() => expect(started[2]).toBe("third"));
    pending.get("second")!.fail();
    expect(await second).toMatchObject({ code: "local-error" });
    await vi.waitFor(() => expect(started[3]).toBe("fourth"));
    activeAbort.abort();
    expect(await third).toMatchObject({ code: "cancelled" });
    const fifth = request("fifth");
    await vi.waitFor(() => expect(started[4]).toBe("fifth"));
    pending.get("fourth")!.complete();
    pending.get("fifth")!.complete();
    expect(await Promise.all([fourth, fifth])).toEqual(["4", "4"]);
    expect(peak).toBe(2);
    expect(pending.size).toBe(0);
  });

  it("releases admission when every queued caller cancels and a new batch arrives", async () => {
    const { api, run } = await harness();
    const { abortError } = await import("../../lib/dev-ai/cli-process");
    run.mockImplementation(async (_executable, _args, options) => {
      return new Promise((_resolve, reject) => {
        const abort = () => reject(abortError());
        options.signal?.addEventListener("abort", abort, { once: true });
        if (options.signal?.aborted) abort();
      });
    });
    const controllers = Array.from({ length: 5 }, () => new AbortController());
    const calls = controllers.map((controller) =>
      api
        .runSubscriptionCli({
          provider: "codex",
          prompt: "solve",
          signal: controller.signal,
        })
        .catch((error: Error) => error),
    );
    await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(2));
    controllers.forEach((controller) => controller.abort());
    expect(await Promise.all(calls)).toEqual(
      controllers.map(() => expect.objectContaining({ code: "cancelled" })),
    );
    expect(run).toHaveBeenCalledTimes(2);
    // Preflight failure also returns both permits to the next callers.
    run.mockRejectedValue(new Error("local probe failed"));
    await Promise.all(
      Array.from({ length: 3 }, () =>
        expect(
          api.runSubscriptionCli({ provider: "codex", prompt: "next" }),
        ).rejects.toMatchObject({ code: "unverified" }),
      ),
    );
    expect(run).toHaveBeenCalledTimes(5);
  });

  it("sanitizes local filesystem failures in status and generation", async () => {
    const { api, temp } = await harness();
    temp.mockRejectedValueOnce(
      new Error("private-account-path status failure"),
    );
    await expect(api.getDevAiProviderStatuses()).rejects.toMatchObject({
      code: "local-error",
    });
    temp.mockRejectedValueOnce(
      new Error("private-account-path generation failure"),
    );
    const error = await api
      .runSubscriptionCli({ provider: "codex", prompt: "solve" })
      .catch((failure: Error) => failure);
    expect(error).toMatchObject({ code: "local-error" });
    expect((error as Error).message).not.toContain("private-account-path");
  });

  it("never launches inference from a status request and deduplicates/caches probes", async () => {
    const { api, run } = await harness();
    run.mockImplementation(async (_executable, args) => ({
      exitCode: 0,
      stderr: "",
      stdout: args.includes("--help")
        ? help
        : args.includes("login")
          ? "Logged in using ChatGPT"
          : '{"loggedIn":true,"authMethod":"claude.ai","apiProvider":"firstParty","subscriptionType":"pro","email":"private@example.test"}',
    }));
    const [a, b] = await Promise.all([
      api.getDevAiProviderStatuses(),
      api.getDevAiProviderStatuses(),
    ]);
    expect(a).toEqual(b);
    expect(a[0].status).toBe("ready");
    expect(JSON.stringify(a)).not.toContain("private@example.test");
    expect(run).toHaveBeenCalledTimes(4);
    await api.getDevAiProviderStatuses();
    expect(run).toHaveBeenCalledTimes(4);
    for (const [, args] of run.mock.calls)
      expect(args.includes("--help") || args.includes("status")).toBe(true);
  });

  it("blocks API-key auth before inference, even when another provider is available", async () => {
    const { api, run } = await harness();
    run.mockResolvedValueOnce({ stdout: help, stderr: "", exitCode: 0 });
    run.mockResolvedValueOnce({
      stdout: "Logged in using an API key",
      stderr: "",
      exitCode: 0,
    });
    await expect(
      api.runSubscriptionCli({ provider: "codex", prompt: "solve" }),
    ).rejects.toMatchObject({ code: "unsupported" });
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("does not execute an unverified additional provider or invalid input", async () => {
    const { api, run } = await harness();
    await expect(
      api.runSubscriptionCli({ provider: "grok", prompt: "solve" }),
    ).rejects.toMatchObject({ code: "unverified" });
    await expect(
      api.runSubscriptionCli({
        provider: "bad" as DevAiProvider,
        prompt: "solve",
      }),
    ).rejects.toMatchObject({ code: "invalid-provider" });
    await expect(
      api.runSubscriptionCli({ provider: "codex", prompt: "" }),
    ).rejects.toMatchObject({ code: "invalid-prompt" });
    expect(run).not.toHaveBeenCalled();
  });

  it("rechecks login for generation and returns only final model text", async () => {
    const { api, run } = await harness();
    run.mockResolvedValueOnce({ stdout: help, stderr: "", exitCode: 0 });
    run.mockResolvedValueOnce({
      stdout: "",
      stderr: "Logged in using ChatGPT",
      exitCode: 0,
    });
    run.mockResolvedValueOnce({
      stdout:
        '{"type":"item.completed","item":{"type":"agent_message","text":"4"}}\n{"type":"turn.completed"}',
      stderr: "private logs",
      exitCode: 0,
    });
    await expect(
      api.runSubscriptionCli({ provider: "codex", prompt: "2+2" }),
    ).resolves.toBe("4");
    expect(run.mock.calls[2][2].input).toBe("2+2");
    expect(run.mock.calls[2][2].cwd).not.toBe(process.cwd());
  });
});
