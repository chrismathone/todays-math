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
  return { ...actual, runCliProcess: vi.fn() };
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
    return { api, run };
  }

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
