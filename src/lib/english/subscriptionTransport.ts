import "server-only";

import { AiConfigError, AiGenerationError } from "@/lib/ai/errors";
import { ENGLISH_EXAM_PROMPT_VERSION } from "@/lib/ai/prompts/englishExam";
import { runSubscriptionCli } from "@/lib/dev-ai/cli";
import { readCliModelSettings, resolveCliModel } from "@/lib/dev-ai/cli-models";
import { subscriptionEnvironment } from "@/lib/dev-ai/cli-process";
import type { EnglishGenerationTransport } from "./generate";

/** The route must first pass the shared loopback/origin guard and English access checks. */
export async function createEnglishSubscriptionTransport(
  signal: AbortSignal,
): Promise<{
  call: EnglishGenerationTransport;
  model: { name: string; promptVersion: string };
}> {
  const provider = process.env.DEV_AI_PROVIDER;
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.DEV_AI_MODE !== "subscription-cli" ||
    (provider !== "claude" && provider !== "codex")
  )
    throw new AiConfigError("개발용 구독 AI 연결이 설정되지 않았습니다.");

  let model: string | undefined;
  try {
    signal.throwIfAborted();
    const settings = await readCliModelSettings(
      provider,
      subscriptionEnvironment(process.env),
    );
    model = resolveCliModel(settings, undefined).model;
    signal.throwIfAborted();
  } catch {
    // Do not log or return local profile paths, CLI output or account details.
    throw new AiConfigError("개발용 구독 AI 모델 설정을 읽지 못했습니다.");
  }

  return {
    model: {
      // Pin the same configured model/alias for every parse retry and refinement.
      // The string-only adapter does not report a resolved model for CLI defaults.
      name: `${provider}-cli/${model ?? "default"}`,
      promptVersion: ENGLISH_EXAM_PROMPT_VERSION,
    },
    call: async ({ system, prompt }) => {
      try {
        signal.throwIfAborted();
        return await runSubscriptionCli({
          provider,
          ...(model ? { model } : {}),
          prompt: `${system}\n\n${prompt}`,
          signal,
        });
      } catch {
        // All CLI failures are terminal for this transport; never try an API key.
        throw new AiGenerationError(
          "구독 CLI로 영어 초안을 생성하지 못했습니다.",
        );
      }
    },
  };
}
