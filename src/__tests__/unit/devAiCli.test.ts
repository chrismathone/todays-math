// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
vi.mock("../../lib/dev-ai/cli-models", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../lib/dev-ai/cli-models")>();
  return {
    ...actual,
    readCliModelSettings: vi.fn(async (provider: string) =>
      provider === "codex"
        ? {
            models: ["gpt-6-astra", "gpt-5.6-sol"],
            defaultModel: "gpt-6-astra",
            reasoningEffort: "xhigh",
            efforts: { "gpt-6-astra": ["xhigh"], "gpt-5.6-sol": ["low"] },
          }
        : { models: ["fable", "opus", "sonnet"], efforts: {} },
    ),
  };
});

const help =
  "--ignore-user-config --ignore-rules --ephemeral --sandbox --json --image --safe-mode --restricted --setting-sources --settings --tools --strict-mcp-config --input-format --output-format --permission-prompts --no-session-persistence";

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

describe("public subscription adapter boundary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

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
    // 상태판 모델 칸 — 목록과 «CLI 설정» 기본값만 싣는다
    expect(a.find((p) => p.id === "codex")).toMatchObject({
      models: ["gpt-6-astra", "gpt-5.6-sol"],
      defaultModel: "gpt-6-astra",
    });
    expect(a.find((p) => p.id === "claude")).toMatchObject({
      models: ["fable", "opus", "sonnet"],
    });
    expect(a.find((p) => p.id === "grok")?.models).toBeUndefined();
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
    // 모델을 안 고르면 원장님 Codex 설정(gpt-6-astra · xhigh)을 넘긴다 — 구독 호출은 사용자 설정을 끄고 돈다
    const args = run.mock.calls[2][1];
    expect(args[args.indexOf("-m") + 1]).toBe("gpt-6-astra");
    expect(args).toContain('model_reasoning_effort="xhigh"');
  });

  it("uses the chosen model and refuses one outside the CLI's list before inference", async () => {
    const { api, run } = await harness();
    const ok = { stdout: help, stderr: "", exitCode: 0 };
    const login = {
      stdout: "",
      stderr: "Logged in using ChatGPT",
      exitCode: 0,
    };
    run.mockResolvedValueOnce(ok).mockResolvedValueOnce(login);
    run.mockResolvedValueOnce({
      stdout:
        '{"type":"item.completed","item":{"type":"agent_message","text":"4"}}\n{"type":"turn.completed"}',
      stderr: "",
      exitCode: 0,
    });
    await api.runSubscriptionCli({
      provider: "codex",
      prompt: "2+2",
      model: "gpt-5.6-sol",
    });
    const args = run.mock.calls[2][1];
    expect(args[args.indexOf("-m") + 1]).toBe("gpt-5.6-sol");
    expect(args.join(" ")).not.toContain("model_reasoning_effort");
    run.mockClear();
    await expect(
      api.runSubscriptionCli({
        provider: "codex",
        prompt: "2+2",
        model: "gpt-reserve",
      }),
    ).rejects.toMatchObject({ code: "invalid-model" });
    expect(run).not.toHaveBeenCalled();
  });
});

// 결함 1(2026-09-18): 생성·대조 호출마다 --help 와 auth status 프로세스를 새로 띄웠다 —
// 확인 하나에 중앙값 3.5초. «ready» 확인만 몇 분 저장하고, CLI 본체가 비정상 종료하면 버린다.
describe("login check cache", () => {
  const generation = {
    stdout:
      '{"type":"item.completed","item":{"type":"agent_message","text":"4"}}\n{"type":"turn.completed"}',
    stderr: "",
    exitCode: 0,
  };
  const claudeAuth =
    '{"loggedIn":true,"authMethod":"claude.ai","apiProvider":"firstParty","subscriptionType":"pro"}';
  const isProbe = (args: string[]) =>
    args.includes("--help") || args.includes("status");
  const probeCount = (run: ReturnType<typeof vi.fn>) =>
    run.mock.calls.filter(([, args]) => isProbe(args as string[])).length;

  const claudeGeneration = {
    stdout:
      '{"type":"result","is_error":false,"subtype":"success","result":"4"}',
    stderr: "",
    exitCode: 0,
  };

  function loggedIn(run: Awaited<ReturnType<typeof harness>>["run"]) {
    run.mockImplementation(async (executable, args) => {
      if (args.includes("--help"))
        return { stdout: help, stderr: "", exitCode: 0 };
      if (args.includes("login"))
        return { stdout: "Logged in using ChatGPT", stderr: "", exitCode: 0 };
      if (args.includes("status"))
        return { stdout: claudeAuth, stderr: "", exitCode: 0 };
      return executable.command === "claude" ? claudeGeneration : generation;
    });
  }

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });
  afterEach(() => vi.useRealTimers());

  it("reuses a fresh ready check per tool and probes again after it expires", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const { api, run } = await harness();
    loggedIn(run);
    await api.runSubscriptionCli({ provider: "codex", prompt: "1" });
    expect(probeCount(run)).toBe(2);
    await api.runSubscriptionCli({ provider: "codex", prompt: "2" });
    // 두 번째 호출은 확인 없이 CLI 본체만 띄운다
    expect(probeCount(run)).toBe(2);
    expect(run).toHaveBeenCalledTimes(4);
    // 도구별 캐시 — codex 의 확인이 claude 를 대신하지 않는다
    await api.runSubscriptionCli({ provider: "claude", prompt: "3" });
    expect(probeCount(run)).toBe(4);
    expect(run).toHaveBeenCalledTimes(7);
    // 몇 분 뒤에는 다시 확인한다
    vi.setSystemTime(Date.now() + 5 * 60_000 + 1);
    await api.runSubscriptionCli({ provider: "codex", prompt: "4" });
    expect(probeCount(run)).toBe(6);
    expect(run).toHaveBeenCalledTimes(10);
  });

  it("lets a status request fill the cache so the next generation skips the probe", async () => {
    const { api, run } = await harness();
    loggedIn(run);
    await api.getDevAiProviderStatuses();
    expect(run).toHaveBeenCalledTimes(4);
    await api.runSubscriptionCli({ provider: "claude", prompt: "1" });
    expect(run).toHaveBeenCalledTimes(5);
    expect(isProbe(run.mock.calls[4][1])).toBe(false);
  });

  it("drops the cache when the CLI exits abnormally and reports the reason as-is", async () => {
    const { api, run } = await harness();
    loggedIn(run);
    await api.runSubscriptionCli({ provider: "codex", prompt: "1" });
    expect(run).toHaveBeenCalledTimes(3);
    // 로그인이 풀렸다 — 캐시 덕에 확인 없이 띄운 CLI 본체가 그 사유로 죽는다
    run.mockResolvedValueOnce({
      stdout: "",
      stderr: "Error: not logged in",
      exitCode: 1,
    });
    await expect(
      api.runSubscriptionCli({ provider: "codex", prompt: "2" }),
    ).rejects.toMatchObject({ code: "login-required" });
    expect(run).toHaveBeenCalledTimes(4);
    // 다음 호출은 다시 확인하고, 확인이 «로그인 필요»면 CLI 본체를 띄우지 않는다
    run.mockImplementation(async (_executable, args) => {
      if (args.includes("--help"))
        return { stdout: help, stderr: "", exitCode: 0 };
      if (args.includes("login"))
        return { stdout: "Not logged in", stderr: "", exitCode: 0 };
      return generation;
    });
    await expect(
      api.runSubscriptionCli({ provider: "codex", prompt: "3" }),
    ).rejects.toMatchObject({ code: "login-required" });
    expect(run).toHaveBeenCalledTimes(6);
    expect(probeCount(run)).toBe(4);
  });

  it("never caches a check that did not end in ready", async () => {
    const { api, run } = await harness();
    run.mockImplementation(async (_executable, args) => {
      if (args.includes("--help"))
        return { stdout: help, stderr: "", exitCode: 0 };
      if (args.includes("login"))
        return { stdout: "Not logged in", stderr: "", exitCode: 0 };
      return generation;
    });
    await expect(
      api.runSubscriptionCli({ provider: "codex", prompt: "1" }),
    ).rejects.toMatchObject({ code: "login-required" });
    // 로그인한 뒤의 다음 호출은 곧바로 확인해서 통과한다
    loggedIn(run);
    await expect(
      api.runSubscriptionCli({ provider: "codex", prompt: "2" }),
    ).resolves.toBe("4");
    expect(probeCount(run)).toBe(4);
    expect(run).toHaveBeenCalledTimes(5);
  });
});

// 결함 3·5(2026-09-18): 180초 시계가 줄 서기 전에 켜졌고, CLI 본체 한 번의 대기 한도(기본 120초)가
// 그 예산보다 짧았다 — 실측 99초짜리 성공이 한도에 가깝고, haiku «121초» 오류가 그 자리다.
describe("request budget", () => {
  const generation = {
    stdout:
      '{"type":"item.completed","item":{"type":"agent_message","text":"4"}}\n{"type":"turn.completed"}',
    stderr: "",
    exitCode: 0,
  };
  const ok = { stdout: help, stderr: "", exitCode: 0 };
  const loggedIn = {
    stdout: "Logged in using ChatGPT",
    stderr: "",
    exitCode: 0,
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });
  afterEach(() => vi.useRealTimers());

  it("gives the CLI process the remaining call budget instead of the 120 second default", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const { api, run } = await harness();
    let captured: number | undefined;
    run.mockImplementation(async (_executable, args, options) => {
      if (args.includes("--help")) {
        // 로그인 확인에 30초가 걸렸다
        vi.setSystemTime(Date.now() + 30_000);
        return ok;
      }
      if (args.includes("login")) return loggedIn;
      captured = options.timeoutMs;
      return generation;
    });
    await api.runSubscriptionCli({ provider: "codex", prompt: "1" });
    expect(captured).toBeGreaterThanOrEqual(149_000);
    expect(captured).toBeLessThanOrEqual(150_000);
  });

  it("starts the 180 second budget only after the request is admitted, and cancels while queued", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const { api, run } = await harness();
    const { abortError } = await import("../../lib/dev-ai/cli-process");
    // 탐침은 «취소가 대역에 닿은 시각»에 건다 — 요청이 정착하는 자리는 임시 폴더 정리(실제 I/O)
    // 뒤라서, 가짜 시계만 돌린 직후에 «아직 안 끝났다»를 재면 옛 코드도 초록이 된다(변이 M3b 실측).
    const started: Array<{ timeoutMs?: number; abortedAt?: number }> = [];
    run.mockImplementation(async (_executable, args, options) => {
      if (args.includes("--help")) return ok;
      if (args.includes("login")) return loggedIn;
      return new Promise((_resolve, reject) => {
        if (options.signal?.aborted) return reject(abortError());
        const entry: { timeoutMs?: number; abortedAt?: number } = {
          timeoutMs: options.timeoutMs,
        };
        options.signal?.addEventListener(
          "abort",
          () => {
            entry.abortedAt = Date.now();
            reject(abortError());
          },
          { once: true },
        );
        started.push(entry);
      });
    });
    const controllers = Array.from({ length: 4 }, () => new AbortController());
    const [first, second, third, queued] = controllers;
    const request = (prompt: string, signal: AbortSignal) =>
      api
        .runSubscriptionCli({ provider: "codex", prompt, signal })
        .catch((error: Error) => error);
    try {
      const a = request("a", first.signal);
      const b = request("b", second.signal);
      await vi.waitFor(() => expect(started).toHaveLength(2));
      const c = request("c", third.signal);
      // 줄에서 179초를 기다린다 — 아직 CLI 본체는 두 개뿐
      await vi.advanceTimersByTimeAsync(179_000);
      expect(started).toHaveLength(2);
      // 줄에 선 채로 취소하면 곧바로 끝난다
      const d = request("d", queued.signal);
      queued.abort();
      expect(await d).toMatchObject({ code: "cancelled" });
      first.abort();
      expect(await a).toMatchObject({ code: "cancelled" });
      await vi.waitFor(() => expect(started).toHaveLength(3));
      const admittedAt = Date.now();
      // 승인 뒤 CLI 본체의 대기 한도는 남은 예산이다 — 줄 선 시간을 깎지 않는다
      expect(started[2].timeoutMs).toBeGreaterThanOrEqual(175_000);
      expect(started[2].timeoutMs).toBeLessThanOrEqual(180_000);
      // 승인 뒤 150초 — 옛 코드는 여기서 이미 «전체 대기 시간 초과»로 끊었다
      await vi.advanceTimersByTimeAsync(150_000);
      expect(started[2].abortedAt).toBeUndefined();
      await vi.advanceTimersByTimeAsync(30_001);
      expect(await c).toMatchObject({ code: "timeout" });
      expect(started[2].abortedAt! - admittedAt).toBeGreaterThanOrEqual(
        179_000,
      );
      // 처음부터 칸을 쥔 둘째는 자기 예산 180초가 이미 끝났다
      expect(await b).toMatchObject({ code: "timeout" });
    } finally {
      controllers.forEach((controller) => controller.abort());
    }
  });
});
