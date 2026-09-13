import "server-only";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DEV_AI_PROVIDERS,
  type DevAiProvider,
  type DevAiProviderStatus,
} from "./contracts";
import { discoverSubscriptionCli } from "./cli-discovery";
import { inspectAdditionalProvider } from "./cli-metadata";
import {
  abortError,
  runCliProcess,
  SubscriptionCliError,
  subscriptionEnvironment,
  withCliTemp,
  type CliExecutable,
  type CliEnvironment,
} from "./cli-process";
import {
  buildSubscriptionInvocation,
  CLAUDE_ISOLATION_ARGS,
  classifyCliFailure,
  classifySubscriptionAuth,
  decodeNativeImage,
  parseFinalCliText,
} from "./cli-protocol";

export { SubscriptionCliError } from "./cli-process";

const LABELS: Record<DevAiProvider, string> = {
  codex: "Codex",
  claude: "Claude Code",
  antigravity: "Antigravity",
  grok: "Grok",
};
const REQUIRED_FLAGS = {
  codex: [
    "--ignore-user-config",
    "--ignore-rules",
    "--ephemeral",
    "--sandbox",
    "--json",
    "--image",
  ],
  claude: [
    "--safe-mode",
    "--restricted",
    "--setting-sources",
    "--settings",
    "--tools",
    "--strict-mcp-config",
    "--input-format",
    "--output-format",
    "--permission-prompts",
    "--no-session-persistence",
  ],
} as const;

function providerStatus(
  id: DevAiProvider,
  status: DevAiProviderStatus["status"],
  detail: string,
): DevAiProviderStatus {
  return {
    id,
    label: LABELS[id],
    status,
    detail,
    image: id === "codex" || id === "claude",
  };
}

async function inspectProvider(
  id: DevAiProvider,
  cwd: string,
  env: CliEnvironment,
  signal?: AbortSignal,
): Promise<{ status: DevAiProviderStatus; executable?: CliExecutable }> {
  const executable = await discoverSubscriptionCli(id, env);
  if (!executable)
    return {
      status: providerStatus(
        id,
        "not-installed",
        "공식 CLI를 설치하고 구독 계정으로 로그인해 주세요.",
      ),
    };
  if (id === "antigravity" || id === "grok") {
    const finding = await inspectAdditionalProvider(
      id,
      executable,
      cwd,
      env,
      signal,
    );
    return {
      executable,
      status: providerStatus(id, finding.status, finding.detail),
    };
  }
  const options = { cwd, env, signal, timeoutMs: 20_000, maxBytes: 256 * 1024 };
  try {
    const help = await runCliProcess(
      executable,
      id === "codex" ? ["exec", "--help"] : ["--help"],
      options,
    );
    if (
      help.exitCode !== 0 ||
      !REQUIRED_FLAGS[id].every(
        (flag) => help.stdout.includes(flag) || help.stderr.includes(flag),
      )
    ) {
      return {
        executable,
        status: providerStatus(
          id,
          "unsupported",
          "필요한 격리 또는 이미지 입력 옵션이 없습니다. 공식 CLI를 업데이트해 주세요.",
        ),
      };
    }
    const auth = await runCliProcess(
      executable,
      id === "codex"
        ? ["login", "status"]
        : [...CLAUDE_ISOLATION_ARGS, "auth", "status", "--json"],
      options,
    );
    const status = classifySubscriptionAuth(id, auth);
    const detail =
      status === "ready"
        ? "CLI에서 구독 인증 방식을 확인했습니다. 실제 사용 가능 여부는 요청 시 확인하며 남은 한도는 알 수 없습니다."
        : status === "login-required"
          ? "공식 CLI에서 구독 계정으로 로그인한 후 새로고침해 주세요."
          : status === "unsupported"
            ? "CLI가 API 키 또는 다른 인증 방식을 사용 중입니다. 구독 전용 연결에서는 사용할 수 없습니다."
            : "CLI에서 구독 인증을 확실히 확인하지 못했습니다. 인증을 확인한 후 다시 시도해 주세요.";
    return { executable, status: providerStatus(id, status, detail) };
  } catch (error) {
    if (
      error instanceof SubscriptionCliError &&
      ["cancelled", "termination-unconfirmed"].includes(error.code)
    )
      throw error;
    return {
      executable,
      status: providerStatus(
        id,
        "unverified",
        "제한 시간 내에 로컬 CLI의 구독 인증 상태를 확인하지 못했습니다.",
      ),
    };
  }
}

// Concurrent status HTTP requests share one probe; generation always rechecks auth.
let statusFlight: Promise<DevAiProviderStatus[]> | undefined;
let statusCache: { expires: number; values: DevAiProviderStatus[] } | undefined;
export function getDevAiProviderStatuses(): Promise<DevAiProviderStatus[]> {
  if (statusCache && Date.now() < statusCache.expires)
    return Promise.resolve(statusCache.values.map((value) => ({ ...value })));
  statusFlight ??= withCliTemp(async (cwd) => {
    const env = subscriptionEnvironment(process.env);
    const deadline = AbortSignal.timeout(30_000);
    // allSettled keeps the temp directory alive until every owned probe stops.
    const results = await Promise.allSettled(
      DEV_AI_PROVIDERS.map(
        async (id) => (await inspectProvider(id, cwd, env, deadline)).status,
      ),
    );
    const unsafeTermination = results.find(
      (result) =>
        result.status === "rejected" &&
        result.reason instanceof SubscriptionCliError &&
        result.reason.code === "termination-unconfirmed",
    );
    if (unsafeTermination?.status === "rejected")
      throw unsafeTermination.reason;
    const values = results.map((result, index) =>
      result.status === "fulfilled"
        ? result.value
        : providerStatus(
            DEV_AI_PROVIDERS[index],
            "unverified",
            "제한 시간 내에 로컬 CLI의 구독 인증 상태를 확인하지 못했습니다.",
          ),
    );
    statusCache = { expires: Date.now() + 10_000, values };
    return values;
  })
    .catch((error: unknown) => {
      if (error instanceof SubscriptionCliError) throw error;
      throw new SubscriptionCliError(
        "local-error",
        "구독 CLI 상태 확인을 위한 로컬 환경을 준비하거나 정리하지 못했습니다.",
      );
    })
    .finally(() => {
      statusFlight = undefined;
    });
  return statusFlight;
}

export async function runSubscriptionCli(input: {
  provider: DevAiProvider;
  prompt: string;
  imageDataUrl?: string;
  signal?: AbortSignal;
}): Promise<string> {
  if (!DEV_AI_PROVIDERS.includes(input.provider))
    throw new SubscriptionCliError(
      "invalid-provider",
      "지원하지 않는 구독 CLI 제공자입니다.",
    );
  if (
    typeof input.prompt !== "string" ||
    !input.prompt.trim() ||
    Buffer.byteLength(input.prompt, "utf8") > 128 * 1024
  ) {
    throw new SubscriptionCliError(
      "invalid-prompt",
      "128 KiB 이하의 비어 있지 않은 요청을 입력해 주세요.",
    );
  }
  if (input.signal?.aborted) throw abortError();
  const nativeImage =
    input.imageDataUrl === undefined
      ? undefined
      : decodeNativeImage(input.imageDataUrl);
  const deadline = new AbortController();
  const cancel = () => deadline.abort();
  input.signal?.addEventListener("abort", cancel, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    cancel();
  }, 180_000);
  try {
    return await withCliTemp(async (cwd) => {
      const env = subscriptionEnvironment(process.env);
      const { executable, status } = await inspectProvider(
        input.provider,
        cwd,
        env,
        deadline.signal,
      );
      if (
        !executable ||
        status.status !== "ready" ||
        (input.provider !== "codex" && input.provider !== "claude")
      ) {
        throw new SubscriptionCliError(
          status.status,
          `${status.label}: ${status.detail}`,
        );
      }
      let imagePath: string | undefined;
      if (nativeImage && input.provider === "codex") {
        imagePath = path.join(cwd, `input.${nativeImage.extension}`);
        await writeFile(imagePath, nativeImage.bytes, {
          flag: "wx",
          mode: 0o600,
        });
      }
      const invocation = buildSubscriptionInvocation(
        input.provider,
        input.prompt,
        nativeImage,
        imagePath,
      );
      const result = await runCliProcess(executable, invocation.args, {
        cwd,
        env,
        signal: deadline.signal,
        input: invocation.input,
      });
      if (result.exitCode !== 0) {
        // Never return raw stderr: CLIs may print account identifiers or secrets.
        throw classifyCliFailure(result);
      }
      return parseFinalCliText(input.provider, result.stdout);
    });
  } catch (error) {
    if (
      timedOut &&
      error instanceof SubscriptionCliError &&
      error.code === "cancelled"
    ) {
      throw new SubscriptionCliError(
        "timeout",
        "구독 CLI 요청의 전체 대기 시간이 초과되었습니다.",
      );
    }
    if (error instanceof SubscriptionCliError) throw error;
    throw new SubscriptionCliError(
      "local-error",
      "구독 CLI 실행을 위한 로컬 환경을 준비하거나 정리하지 못했습니다.",
    );
  } finally {
    clearTimeout(timer);
    input.signal?.removeEventListener("abort", cancel);
  }
}
