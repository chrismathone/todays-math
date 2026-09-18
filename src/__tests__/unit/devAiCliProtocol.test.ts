// @vitest-environment node
import { describe, expect, it } from "vitest";
import { executableCandidates } from "../../lib/dev-ai/cli-discovery";
import {
  classifyAgyMetadata,
  classifyGrokMetadata,
} from "../../lib/dev-ai/cli-metadata";
import {
  subscriptionEnvironment,
  treeKillInvocation,
} from "../../lib/dev-ai/cli-process";
import {
  buildSubscriptionInvocation,
  classifyCliFailure,
  classifySubscriptionAuth,
  decodeNativeImage,
  parseFinalCliText,
} from "../../lib/dev-ai/cli-protocol";

const result = (stdout: string, exitCode = 0, stderr = "") => ({
  stdout,
  stderr,
  exitCode,
});
const lines = (...values: unknown[]) =>
  values.map((value) => JSON.stringify(value)).join("\n");
const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aM1sAAAAASUVORK5CYII=";

describe("subscription authentication gating", () => {
  it("reports effective hooks/MCP and paid provider settings without exposing configuration", () => {
    const grok = classifyGrokMetadata({
      hooks: [{ target: "private-command" }],
      mcpServers: [],
    });
    expect(grok.status).toBe("unsupported");
    expect(grok.detail).not.toContain("private-command");
    expect(classifyGrokMetadata({ hooks: [], mcpServers: [] }).status).toBe(
      "unverified",
    );
    expect(classifyAgyMetadata({ modelProvider: "gemini" }, {}).status).toBe(
      "unsupported",
    );
    expect(classifyAgyMetadata({ useG1Credits: true }, {}).status).toBe(
      "unsupported",
    );
    expect(
      classifyAgyMetadata(
        {},
        { mcpServers: { private: { env: { secret: "private-key" } } } },
      ).status,
    ).toBe("unsupported");
    expect(
      classifyAgyMetadata({}, { mcpServers: { private: { disabled: true } } })
        .status,
    ).toBe("unverified");
  });
  it("turns known runtime auth/quota failures into fixed messages without raw stderr", () => {
    const error = classifyCliFailure(
      result(
        "",
        1,
        "private@example.test Your refresh token was already used. secret-value",
      ),
    );
    expect(error.code).toBe("login-required");
    expect(error.message).not.toMatch(/private|secret-value/);
    expect(classifyCliFailure(result("quota exceeded", 1)).code).toBe(
      "rate-limited",
    );
    expect(
      classifyCliFailure(result("private raw error", 1)).message,
    ).not.toContain("private raw error");
  });
  it("requires the exact successful Codex ChatGPT status, including stderr status", () => {
    expect(
      classifySubscriptionAuth(
        "codex",
        result("", 0, "Logged in using ChatGPT\n"),
      ),
    ).toBe("ready");
    expect(
      classifySubscriptionAuth("codex", result("Logged in using ChatGPT", 1)),
    ).toBe("unverified");
    expect(
      classifySubscriptionAuth("codex", result("Please sign in using ChatGPT")),
    ).toBe("unverified");
    expect(classifySubscriptionAuth("codex", result("Not logged in", 1))).toBe(
      "login-required",
    );
    expect(
      classifySubscriptionAuth(
        "codex",
        result("Logged in using an API key\nLogged in using ChatGPT"),
      ),
    ).toBe("unsupported");
  });
  it("requires positive Claude subscription and first-party OAuth evidence", () => {
    const auth = {
      loggedIn: true,
      authMethod: "claude.ai",
      apiProvider: "firstParty",
      subscriptionType: "max",
      email: "private@example.test",
    };
    expect(
      classifySubscriptionAuth("claude", result(JSON.stringify(auth))),
    ).toBe("ready");
    for (const change of [
      { subscriptionType: null },
      { subscriptionType: "unknown" },
      { authMethod: "oauth" },
    ]) {
      expect(
        classifySubscriptionAuth(
          "claude",
          result(JSON.stringify({ ...auth, ...change })),
        ),
      ).toBe("unverified");
    }
    expect(
      classifySubscriptionAuth(
        "claude",
        result(JSON.stringify({ ...auth, apiProvider: "bedrock" })),
      ),
    ).toBe("unsupported");
    expect(
      classifySubscriptionAuth("claude", result('{"loggedIn":false}')),
    ).toBe("login-required");
    expect(
      classifySubscriptionAuth("claude", result("unexpected CLI output")),
    ).toBe("unverified");
  });
});

describe("final output parsing", () => {
  it("returns only the final Codex message and rejects failed/truncated turns", () => {
    const events = [
      { type: "turn.started" },
      {
        type: "item.completed",
        item: { type: "reasoning", text: "private reasoning" },
      },
      {
        type: "item.completed",
        item: { type: "agent_message", phase: "commentary", text: "progress" },
      },
      {
        type: "item.completed",
        item: { type: "agent_message", text: '{"answer":"4"}' },
      },
      { type: "turn.completed", usage: { tokens: 123 } },
    ];
    expect(parseFinalCliText("codex", lines(...events))).toBe('{"answer":"4"}');
    expect(() =>
      parseFinalCliText("codex", lines(...events.slice(0, -1))),
    ).toThrow(/완료된 최종/);
    expect(() =>
      parseFinalCliText(
        "codex",
        lines(...events, { type: "turn.failed", error: "secret" }),
      ),
    ).toThrow(/완료된 최종/);
    expect(() =>
      parseFinalCliText("codex", lines(...events) + "\n{broken"),
    ).toThrow(/완료된 최종/);
  });
  it("uses Claude result, not streamed thinking, tool results, or partial text", () => {
    const events = [
      { type: "system", email: "private@example.test" },
      {
        type: "assistant",
        message: { content: [{ type: "text", text: "partial" }] },
      },
      {
        type: "result",
        subtype: "success",
        is_error: false,
        result: "  최종 답: 4  ",
        total_cost_usd: 99,
      },
    ];
    expect(parseFinalCliText("claude", lines(...events))).toBe("최종 답: 4");
    expect(() => parseFinalCliText("claude", lines(events[1]))).toThrow();
    expect(() =>
      parseFinalCliText(
        "claude",
        lines({ ...events[2], subtype: "error_max_turns" }),
      ),
    ).toThrow();
    expect(() =>
      parseFinalCliText("claude", lines({ ...events[2], is_error: true })),
    ).toThrow();
  });
});

describe("safe CLI invocation", () => {
  it("passes text on stdin and image natively without interpolating shell content", () => {
    const prompt =
      '--model bad; $(Get-Content secret) `whoami` 한글\n{"a":"b"}';
    const image = decodeNativeImage(png);
    const codex = buildSubscriptionInvocation(
      "codex",
      prompt,
      image,
      "C:\\Temp\\isolated\\input.png",
    );
    expect(codex.input).toBe(prompt);
    expect(codex.args).not.toContain(prompt);
    expect(codex.args.slice(-4)).toEqual([
      "--image",
      "C:\\Temp\\isolated\\input.png",
      "--",
      "-",
    ]);
    expect(codex.args).toEqual(
      expect.arrayContaining([
        "--ignore-user-config",
        "read-only",
        'forced_login_method="chatgpt"',
      ]),
    );
    const claude = buildSubscriptionInvocation("claude", prompt, image);
    const message = JSON.parse(claude.input).message;
    expect(message.content[0].text).toBe(prompt);
    expect(message.content[1]).toEqual({
      type: "image",
      source: { type: "base64", media_type: "image/png", data: image.base64 },
    });
    expect(claude.args).not.toContain("--bare");
    expect(claude.args).toEqual(
      expect.arrayContaining([
        "--safe-mode",
        "--restricted",
        "--strict-mcp-config",
        "--no-session-persistence",
      ]),
    );
    expect(claude.args[claude.args.indexOf("--tools") + 1]).toBe("");
  });
  it("passes the resolved model (and Codex reasoning effort) only when one is given", () => {
    const image = decodeNativeImage(png);
    const codex = buildSubscriptionInvocation(
      "codex",
      "2+2",
      image,
      "C:\\Temp\\isolated\\input.png",
      { model: "gpt-5.6-sol", reasoningEffort: "xhigh" },
    );
    const m = codex.args.indexOf("-m");
    expect(codex.args[m + 1]).toBe("gpt-5.6-sol");
    expect(codex.args).toContain('model_reasoning_effort="xhigh"');
    expect(codex.args.slice(-4)).toEqual([
      "--image",
      "C:\\Temp\\isolated\\input.png",
      "--",
      "-",
    ]);
    const claude = buildSubscriptionInvocation(
      "claude",
      "2+2",
      image,
      undefined,
      {
        model: "opus[1m]",
      },
    );
    expect(claude.args[claude.args.indexOf("--model") + 1]).toBe("opus[1m]");
    for (const plain of [
      buildSubscriptionInvocation("codex", "2+2"),
      buildSubscriptionInvocation("claude", "2+2"),
    ]) {
      expect(plain.args).not.toContain("-m");
      expect(plain.args).not.toContain("--model");
      expect(plain.args.join(" ")).not.toContain("model_reasoning_effort");
    }
  });
  it("rejects URLs, unsupported files, invalid base64 and mismatched image bytes", () => {
    for (const input of [
      "https://example.test/image.png",
      "data:image/svg+xml;base64,PHN2Zz4=",
      "data:image/png;base64,AAAA",
      png.replace("image/png", "image/jpeg"),
      png + "\n",
    ]) {
      expect(() => decodeNativeImage(input)).toThrow();
    }
    expect(decodeNativeImage(png).extension).toBe("png");
  });
  it("allowlists child env without mutating parent keys or retaining execution overrides", () => {
    const source = {
      Path: "C:\\Windows",
      USERPROFILE: "C:\\Users\\me",
      CODEX_HOME: "C:\\codex-account",
      CLAUDE_CONFIG_DIR: "C:\\claude-account",
      OPENAI_API_KEY: "secret",
      CODEX_API_KEY: "secret",
      ANTHROPIC_API_KEY: "secret",
      ANTHROPIC_AUTH_TOKEN: "secret",
      CLAUDE_CODE_OAUTH_TOKEN: "secret",
      CLAUDE_CODE_USE_BEDROCK: "1",
      GEMINI_API_KEY: "secret",
      XAI_API_KEY: "secret",
      GOOGLE_APPLICATION_CREDENTIALS: "secret",
      AWS_PROFILE: "paid",
      HTTP_PROXY: "proxy",
      OPENAI_BASE_URL: "proxy",
      GOOGLE_GEMINI_BASE_URL: "proxy",
      NODE_OPTIONS: "--require malicious",
      DATABASE_URL: "secret",
      ORCA_AUTH_TOKEN: "secret",
    };
    const env = subscriptionEnvironment(source);
    expect(env.CODEX_HOME).toBe(source.CODEX_HOME);
    expect(env.CLAUDE_CONFIG_DIR).toBe(source.CLAUDE_CONFIG_DIR);
    expect(env.Path).toBe(source.Path);
    for (const key of Object.keys(source).slice(4))
      expect(env[key]).toBeUndefined();
    expect(source.OPENAI_API_KEY).toBe("secret");
  });
  it("selects an existing Codex profile only in the child and rejects relative profile paths", () => {
    const source = {
      CODEX_HOME: "old-profile",
      DEV_AI_CODEX_HOME: process.cwd(),
    };
    expect(subscriptionEnvironment(source).CODEX_HOME).toBe(process.cwd());
    expect(source.CODEX_HOME).toBe("old-profile");
    expect(subscriptionEnvironment(source).DEV_AI_CODEX_HOME).toBeUndefined();
    expect(() =>
      subscriptionEnvironment({ DEV_AI_CODEX_HOME: "relative-path" }),
    ).toThrow();
  });
  it("resolves Windows npm bins without launching shell shims or relative PATH entries", () => {
    const env = {
      Path: '.;relative;"C:\\npm"',
      APPDATA: "C:\\AppData",
      USERPROFILE: "C:\\Users\\me",
      LOCALAPPDATA: "C:\\Local",
    };
    const codex = executableCandidates("codex", env, "win32");
    expect(codex).toContainEqual({
      command: process.execPath,
      prefix: ["C:\\npm\\node_modules\\@openai\\codex\\bin\\codex.js"],
    });
    expect(executableCandidates("claude", env, "win32")).toContainEqual({
      command:
        "C:\\npm\\node_modules\\@anthropic-ai\\claude-code\\bin\\claude.exe",
      prefix: [],
    });
    for (const entry of codex)
      expect(entry.command).not.toMatch(/\.(cmd|ps1)$|relative/i);
    expect(executableCandidates("grok", env, "win32")).toContainEqual({
      command: "C:\\Users\\me\\.grok\\bin\\grok.exe",
      prefix: [],
    });
    expect(executableCandidates("antigravity", env, "win32")).toContainEqual({
      command: "C:\\Local\\agy\\bin\\agy.exe",
      prefix: [],
    });
    expect(treeKillInvocation(123, "C:\\Windows")).toMatchObject({
      command: "C:\\Windows\\System32\\taskkill.exe",
      args: ["/PID", "123", "/T", "/F"],
    });
    expect(() => treeKillInvocation(-1, "C:\\Windows")).toThrow();
  });
});
