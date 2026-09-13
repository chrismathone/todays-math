import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { DevAiProviderStatus } from "./contracts";
import {
  envValue,
  runCliProcess,
  SubscriptionCliError,
  type CliExecutable,
} from "./cli-process";

type Finding = Pick<DevAiProviderStatus, "status" | "detail">;
function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

// Only non-credential configuration is read. Raw values never leave this module.
async function configJson(file: string): Promise<Record<string, unknown>> {
  try {
    if ((await stat(file)).size > 256 * 1024)
      throw new Error("Configuration exceeds inspection limit.");
    return object(JSON.parse(await readFile(file, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw new Error("Configuration cannot be inspected.");
  }
}

export function classifyAgyMetadata(
  settings: Record<string, unknown>,
  mcp: Record<string, unknown>,
): Finding {
  if (settings.modelProvider !== undefined && settings.modelProvider !== "")
    return {
      status: "unsupported",
      detail:
        "Antigravity에 외부/API 모델 제공자가 설정되어 구독 전용 실행을 지원하지 않습니다.",
    };
  if (settings.useG1Credits === true)
    return {
      status: "unsupported",
      detail:
        "Antigravity에 추가 AI 크레딧 사용이 설정되어 구독 전용 실행을 지원하지 않습니다.",
    };
  if (
    Object.values(object(mcp.mcpServers)).some(
      (server) => object(server).disabled !== true,
    )
  )
    return {
      status: "unsupported",
      detail:
        "Antigravity의 전역 MCP 서버가 활성화되어 있습니다. 설치된 CLI에서 요청별 MCP 격리를 확인할 수 없어 실행을 지원하지 않습니다.",
    };
  return {
    status: "unverified",
    detail:
      "Antigravity는 계정 인증 모드입니다. 구독 로그인·이미지 입력·요청별 도구 및 훅 격리를 아직 확인하지 못했습니다.",
  };
}

export function classifyGrokMetadata(
  metadata: Record<string, unknown>,
): Finding {
  if (
    (Array.isArray(metadata.hooks) && metadata.hooks.length > 0) ||
    (Array.isArray(metadata.mcpServers) && metadata.mcpServers.length > 0)
  ) {
    return {
      status: "unsupported",
      detail:
        "Grok에 전역 훅 또는 MCP 서버가 연결되어 있습니다. 설치된 CLI에서 요청별 격리를 확인할 수 없어 실행을 지원하지 않습니다.",
    };
  }
  return {
    status: "unverified",
    detail:
      "Grok CLI는 비대화형·이미지 입력을 지원하지만 실제 구독 인증과 설정 격리를 아직 확인하지 못했습니다.",
  };
}

export async function inspectAdditionalProvider(
  provider: "grok" | "antigravity",
  executable: CliExecutable,
  cwd: string,
  env: NodeJS.ProcessEnv,
  signal?: AbortSignal,
): Promise<Finding> {
  try {
    if (provider === "antigravity") {
      const user = envValue(env, "USERPROFILE") ?? envValue(env, "HOME");
      if (!user || !path.isAbsolute(user))
        throw new Error("No known user directory.");
      const settings = await configJson(
        path.join(user, ".gemini", "antigravity-cli", "settings.json"),
      );
      const mcp = await configJson(
        path.join(user, ".gemini", "config", "mcp_config.json"),
      );
      return classifyAgyMetadata(settings, mcp);
    }
    // Official read-only inspection includes compatibility-imported hooks/MCP;
    // checking only ~/.grok/config.toml would miss them.
    const output = await runCliProcess(executable, ["inspect", "--json"], {
      cwd,
      env,
      signal,
      timeoutMs: 10_000,
      maxBytes: 256 * 1024,
    });
    if (output.exitCode !== 0) throw new Error("Inspection failed.");
    return classifyGrokMetadata(object(JSON.parse(output.stdout)));
  } catch (error) {
    if (
      error instanceof SubscriptionCliError &&
      ["cancelled", "termination-unconfirmed"].includes(error.code)
    )
      throw error;
    return {
      status: "unverified",
      detail: "제공자의 현재 로컬 설정을 안전하게 확인하지 못했습니다.",
    };
  }
}
