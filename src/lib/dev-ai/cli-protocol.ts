import type { DevAiProviderStatus } from "./contracts";
import { SubscriptionCliError, type CliProcessResult } from "./cli-process";

type SupportedProvider = "codex" | "claude";
type JsonObject = Record<string, unknown>;
const object = (value: unknown): JsonObject | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;

export function classifySubscriptionAuth(
  provider: SupportedProvider,
  output: CliProcessResult,
): DevAiProviderStatus["status"] {
  if (provider === "codex") {
    const text = `${output.stdout}\n${output.stderr}`.trim();
    if (/api[ -]?key|access[ -]?token/i.test(text)) return "unsupported";
    if (/^Not logged in\s*$/im.test(text)) return "login-required";
    // Exact CLI status line, not arbitrary text mentioning ChatGPT.
    if (output.exitCode === 0 && /^Logged in using ChatGPT\s*$/im.test(text))
      return "ready";
    return "unverified";
  }
  try {
    const auth = object(JSON.parse(output.stdout));
    if (!auth) return "unverified";
    if (auth.loggedIn === false) return "login-required";
    if (
      auth.authMethod === "api_key" ||
      auth.authMethod === "api-key" ||
      (typeof auth.apiProvider === "string" &&
        auth.apiProvider !== "firstParty")
    )
      return "unsupported";
    if (
      output.exitCode === 0 &&
      auth.loggedIn === true &&
      auth.authMethod === "claude.ai" &&
      auth.apiProvider === "firstParty" &&
      typeof auth.subscriptionType === "string" &&
      ["pro", "max", "team", "enterprise"].includes(
        auth.subscriptionType.toLowerCase(),
      )
    )
      return "ready";
  } catch {
    /* A new/unknown status format cannot establish subscription billing. */
  }
  return "unverified";
}

export function classifyCliFailure(
  output: CliProcessResult,
): SubscriptionCliError {
  const text = output.stdout + "\n" + output.stderr;
  if (
    /refresh token was already used|token could not be refreshed|not logged in|authentication[_ -]required|unauthorized|\b401\b/i.test(
      text,
    )
  ) {
    return new SubscriptionCliError(
      "login-required",
      "저장된 구독 로그인을 사용할 수 없습니다. 공식 CLI에서 다시 로그인한 후 시도해 주세요. 다른 인증 방식으로 전환하지 않았습니다.",
    );
  }
  if (/rate[_ -]?limit|usage limit|quota exceeded|\b429\b/i.test(text)) {
    return new SubscriptionCliError(
      "rate-limited",
      "구독 CLI의 사용 한도에 도달했습니다. 한도가 복구된 후 다시 시도해 주세요. 다른 인증 방식으로 전환하지 않았습니다.",
    );
  }
  return new SubscriptionCliError(
    "cli-failed",
    "구독 CLI 요청을 완료하지 못했습니다. 공식 CLI의 로그인·사용 한도·네트워크를 확인해 주세요. 다른 인증 방식으로 전환하지 않았습니다.",
  );
}

function invalidOutput(): never {
  throw new SubscriptionCliError(
    "invalid-output",
    "구독 CLI에서 완료된 최종 응답을 받지 못했습니다.",
  );
}

/** Discard reasoning, progress, tools, usage, identifiers and account metadata. */
export function parseFinalCliText(
  provider: SupportedProvider,
  stdout: string,
): string {
  let finalText: string | undefined;
  let completed = false;
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let event: JsonObject | undefined;
    try {
      event = object(JSON.parse(line));
    } catch {
      invalidOutput();
    }
    if (!event) invalidOutput();
    if (provider === "codex") {
      if (["error", "turn.failed"].includes(String(event.type)))
        invalidOutput();
      if (event.type === "turn.started") {
        completed = false;
        finalText = undefined;
      }
      if (event.type === "item.completed") {
        const item = object(event.item);
        if (
          item?.type === "agent_message" &&
          typeof item.text === "string" &&
          (item.phase === undefined || item.phase === "final_answer")
        )
          finalText = item.text;
      }
      if (event.type === "turn.completed") completed = true;
    } else if (event.type === "result") {
      if (
        event.is_error !== false ||
        event.subtype !== "success" ||
        typeof event.result !== "string"
      )
        invalidOutput();
      finalText = event.result;
      completed = true;
    }
  }
  if (!completed || !finalText?.trim()) invalidOutput();
  if (Buffer.byteLength(finalText, "utf8") > 512 * 1024) invalidOutput();
  return finalText.trim();
}

export interface NativeImage {
  mime: "image/png" | "image/jpeg" | "image/webp";
  extension: "png" | "jpg" | "webp";
  base64: string;
  bytes: Buffer;
}

export function decodeNativeImage(dataUrl: string): NativeImage {
  const match =
    /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
      dataUrl,
    );
  if (
    !match ||
    match[2].length > 14 * 1024 * 1024 ||
    match[2].length % 4 !== 0
  ) {
    throw new SubscriptionCliError(
      "invalid-image",
      "10 MiB 이하 PNG·JPEG·WebP 이미지 데이터 URL을 사용해 주세요.",
    );
  }
  const bytes = Buffer.from(match[2], "base64");
  const mime = match[1] as NativeImage["mime"];
  const validMagic =
    mime === "image/png"
      ? bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : mime === "image/jpeg"
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
          bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (
    !validMagic ||
    bytes.length > 10 * 1024 * 1024 ||
    bytes.toString("base64") !== match[2]
  ) {
    throw new SubscriptionCliError(
      "invalid-image",
      "이미지 데이터가 지정된 형식이나 크기 제한에 맞지 않습니다.",
    );
  }
  return {
    mime,
    extension:
      mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp",
    bytes,
    base64: match[2],
  };
}

export const CLAUDE_ISOLATION_ARGS = [
  "--safe-mode",
  "--restricted",
  "--setting-sources",
  "",
  "--settings",
  JSON.stringify({
    disableAllHooks: true,
    forceLoginMethod: "claudeai",
    autoMemoryEnabled: false,
  }),
] as const;

export function buildSubscriptionInvocation(
  provider: SupportedProvider,
  prompt: string,
  image?: NativeImage,
  imagePath?: string,
): { args: string[]; input: string } {
  if (provider === "codex") {
    const args = [
      "exec",
      "--ignore-user-config",
      "--ignore-rules",
      "--skip-git-repo-check",
      "--ephemeral",
      "--sandbox",
      "read-only",
      "--json",
      "--color",
      "never",
      "-c",
      'forced_login_method="chatgpt"',
      "-c",
      'model_provider="openai"',
      "-c",
      'approval_policy="never"',
      "-c",
      'web_search="disabled"',
      "-c",
      "project_doc_max_bytes=0",
      "--disable",
      "hooks",
      "--disable",
      "shell_tool",
      "--disable",
      "unified_exec",
      "--disable",
      "multi_agent",
      "--disable",
      "multi_agent_v2",
      "--disable",
      "apps",
    ];
    if (image) {
      if (!imagePath) throw new Error("Native Codex image path is required.");
      args.push("--image", imagePath);
    }
    args.push("--", "-");
    return { args, input: prompt };
  }
  const content: unknown[] = [{ type: "text", text: prompt }];
  if (image)
    content.push({
      type: "image",
      source: { type: "base64", media_type: image.mime, data: image.base64 },
    });
  return {
    args: [
      ...CLAUDE_ISOLATION_ARGS,
      "--print",
      "--verbose",
      "--input-format",
      "stream-json",
      "--output-format",
      "stream-json",
      "--tools",
      "",
      "--strict-mcp-config",
      "--mcp-config",
      '{"mcpServers":{}}',
      "--permission-mode",
      "dontAsk",
      "--permission-prompts",
      "none",
      "--disable-slash-commands",
      "--no-chrome",
      "--no-session-persistence",
      "--system-prompt",
      "Answer the supplied math request using only the supplied text and image. Return the requested final answer directly.",
    ],
    input:
      JSON.stringify({ type: "user", message: { role: "user", content } }) +
      "\n",
  };
}
