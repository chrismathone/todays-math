import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  codexChildEnvironment,
  codexSha256,
  createCodexJsonRunner,
  type CodexProcessRequest,
  type CodexProcessResult,
} from "./transport";

const dirs: string[] = [];
async function temporary() {
  const dir = await mkdtemp(join(tmpdir(), "codex-transport-test-"));
  dirs.push(dir);
  return dir;
}
afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(
    dirs.splice(0).map((dir) => {
      if (!dir.startsWith(join(tmpdir(), "codex-transport-test-")))
        throw new Error("unsafe-test-cleanup");
      return rm(dir, { recursive: true, force: true });
    }),
  );
});
const schema = {
  type: "object",
  properties: { answer: { type: "integer" } },
  required: ["answer"],
  additionalProperties: false,
};
function fake(
  options: {
    auth?: string;
    version?: string;
    result?: Partial<CodexProcessResult>;
    output?: string;
    noOutput?: boolean;
    events?: unknown[];
  } = {},
) {
  return vi.fn(
    async (request: CodexProcessRequest): Promise<CodexProcessResult> => {
      const base = { stdout: "", stderr: "", exitCode: 0, signal: null };
      if (request.args[0] === "login")
        return { ...base, stderr: options.auth ?? "Logged in using ChatGPT\n" };
      if (request.args[0] === "--version")
        return { ...base, stdout: options.version ?? "codex-cli 0.162.1\n" };
      if (!options.noOutput)
        await writeFile(
          request.args[request.args.indexOf("--output-last-message") + 1]!,
          options.output ?? '{"answer":5}',
        );
      return {
        ...base,
        stdout: (
          options.events ?? [
            { type: "thread.started", thread_id: "test-thread" },
            {
              type: "item.completed",
              item: { type: "agent_message", text: "redacted" },
            },
            {
              type: "turn.completed",
              usage: {
                input_tokens: 11,
                cached_input_tokens: 4,
                output_tokens: 7,
              },
            },
          ]
        )
          .map((event) => JSON.stringify(event))
          .join("\n"),
        ...options.result,
      };
    },
  );
}
async function input() {
  return {
    phase: "test",
    prompt: 'Do math only. Literal $() `quotes` " && | 한글',
    schema,
    outDir: await temporary(),
  };
}

describe("Codex subscription transport (injected processes only)", () => {
  it("checks saved auth, passes stdin/argv, validates PNG bytes, and binds a receipt", async () => {
    const bytes = await sharp({
      create: { width: 2, height: 3, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();
    const args = await input();
    const path = join(args.outDir, "name with spaces.png");
    await writeFile(path, bytes);
    vi.stubEnv("OPENAI_API_KEY", "private-key");
    vi.stubEnv("CODEX_API_KEY", "private-codex-key");
    vi.stubEnv("DATABASE_URL", "private-db");
    const process = fake();
    const result = await createCodexJsonRunner(process)<{ answer: number }>({
      ...args,
      images: [path, `data:image/png;base64,${bytes.toString("base64")}`],
    });
    expect(result.value.answer).toBe(5);
    expect(result.auth).toBe("chatgpt");
    expect(result.model).toBeNull();
    expect(result.usage).toEqual({
      inputTokens: 11,
      cachedInputTokens: 4,
      outputTokens: 7,
    });
    expect(result.receipt).toMatchObject({
      status: "succeeded",
      exitCode: 0,
      cliVersion: "codex-cli 0.162.1",
      schemaValid: true,
      turnCompleted: true,
      modelObserved: false,
      promptSha256: codexSha256(args.prompt),
    });
    expect(result.receipt.images).toEqual(
      [0, 1].map(() => ({
        sha256: codexSha256(bytes),
        bytes: bytes.length,
        width: 2,
        height: 3,
      })),
    );
    const execution = process.mock.calls[2]![0];
    expect(execution.stdin).toBe(args.prompt);
    expect(execution.args).not.toContain(args.prompt);
    expect(execution.args).not.toContain("--model");
    expect(execution.args.at(-1)).toBe("-");
    expect(execution.args.filter((arg) => arg === "--image")).toHaveLength(2);
    expect(execution.env.OPENAI_API_KEY).toBeUndefined();
    expect(execution.env.CODEX_API_KEY).toBeUndefined();
    expect(execution.env.DATABASE_URL).toBeUndefined();
    expect(
      JSON.parse(await readFile(result.receipt.receiptPath, "utf8")),
    ).toEqual(result.receipt);
  });
  it("strips credentials case-insensitively while preserving saved auth location", () => {
    expect(
      codexChildEnvironment({
        CODEX_HOME: "existing-home",
        PATH: "binary-path",
        OpenAI_Api_Key: "a",
        DEEPSEEK_API_KEY: "b",
        TYPESAFE_API_KEY: "c",
        CODEX_ACCESS_TOKEN: "d",
        DATABASE_URL: "e",
        OPENAI_BASE_URL: "f",
        NODE_OPTIONS: "g",
      }),
    ).toEqual({ CODEX_HOME: "existing-home", PATH: "binary-path" });
  });
  it.each([
    "Logged in using an API key",
    "Not logged in",
    "Logged in using ChatGPT\nAPI key active",
  ])("rejects non-subscription auth: %s", async (auth) => {
    const process = fake({ auth });
    await expect(
      createCodexJsonRunner(process)(await input()),
    ).rejects.toMatchObject({
      code: "codex-chatgpt-auth-required",
      receipt: { status: "failed", auth: null },
    });
    expect(process).toHaveBeenCalledTimes(1);
  });
  it.each([
    [{ exitCode: 1 }, "codex-exit-failed"],
    [{ signal: "SIGTERM", exitCode: null }, "codex-exit-failed"],
    [{ stopped: "timeout", exitCode: null }, "codex-timeout"],
    [{ stopped: "aborted", exitCode: null }, "codex-aborted"],
    [{ stopped: "output-limit", exitCode: null }, "codex-output-limit"],
    [{ stopped: "spawn-failed", exitCode: null }, "codex-spawn-failed"],
    [{ stdout: "not JSON" }, "codex-events-invalid"],
  ] as const)("fails closed on process failure %j", async (result, code) => {
    await expect(
      createCodexJsonRunner(fake({ result }))(await input()),
    ).rejects.toMatchObject({
      code,
      receipt: { status: "failed", schemaValid: false },
    });
  });
  it.each([
    ['```json\n{"answer":5}\n```', "codex-json-invalid"],
    ['{"answer":"5"}', "codex-output-schema"],
    ['{"answer":5,"extra":true}', "codex-output-schema"],
    ["{}", "codex-output-schema"],
  ])("rejects broken JSON or schema mismatch", async (output, code) => {
    await expect(
      createCodexJsonRunner(fake({ output }))(await input()),
    ).rejects.toMatchObject({ code });
  });
  it("requires a newly written final output file", async () => {
    await expect(
      createCodexJsonRunner(fake({ noOutput: true }))(await input()),
    ).rejects.toMatchObject({ code: "codex-operation-failed" });
  });
  it.each([
    [{ type: "thread.started", thread_id: "t" }],
    [{ type: "turn.completed" }],
    [
      { type: "thread.started", thread_id: "t" },
      { type: "turn.completed" },
      { type: "turn.failed" },
    ],
  ])("requires a thread and unfailed completed turn", async (...events) => {
    await expect(
      createCodexJsonRunner(fake({ events }))(await input()),
    ).rejects.toMatchObject({ code: "codex-turn-incomplete" });
  });
  it("rejects unexpected tool activity and never records raw stdout", async () => {
    const events = [
      { type: "thread.started", thread_id: "t" },
      {
        type: "item.completed",
        item: { type: "command_execution", command: "SECRET" },
      },
      { type: "turn.completed" },
    ];
    try {
      await createCodexJsonRunner(fake({ events }))(await input());
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toMatchObject({ code: "codex-unexpected-tool-use" });
      expect(JSON.stringify(error)).not.toContain("SECRET");
    }
  });
  it("only records observed model names and leaves missing usage unknown", async () => {
    const result = await createCodexJsonRunner(
      fake({
        events: [
          {
            type: "thread.started",
            thread_id: "t",
            model: "observed-test-model",
          },
          { type: "turn.completed" },
        ],
      }),
    )(await input());
    expect(result.model).toBe("observed-test-model");
    expect(result.usage).toBeNull();
    expect(result.receipt.modelObserved).toBe(true);
  });
  it("rejects invalid PNG and unsupported schema before inference", async () => {
    const process = fake();
    await expect(
      createCodexJsonRunner(process)({
        ...(await input()),
        images: ["data:image/png;base64,aGVsbG8="],
      }),
    ).rejects.toMatchObject({ code: "codex-image-format" });
    expect(
      process.mock.calls.some(([request]) => request.args[0] === "exec"),
    ).toBe(false);
    process.mockClear();
    await expect(
      createCodexJsonRunner(process)({
        ...(await input()),
        schema: { type: "object", unsupportedKeyword: true },
      }),
    ).rejects.toMatchObject({ code: "codex-schema-unsupported" });
    expect(process).not.toHaveBeenCalled();
  });
});
