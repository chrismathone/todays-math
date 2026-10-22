import "server-only";
import OpenAI from "openai";
import type {
  DevAiAction,
  DevAiStatus,
  StudioApiProvider,
} from "@/lib/dev-ai/contracts";
import {
  API_KEY_NAMES,
  geminiSampling,
  requiresResponsesApi,
  usesCompletionTokens,
  type ApiVendor,
  describeAutoRoutes,
} from "./routing";

import { pushErrorLogContext } from "@/lib/errorLog/scope";

import { StudioApiError, retryAfterMs } from "./errors";
import { withModelRetry } from "./retry";
export { StudioApiError } from "./errors";
type InferenceInput = {
  vendor: ApiVendor;
  model: string;
  prompt: string;
  imageDataUrl?: string;
  signal: AbortSignal;
  action?: DevAiAction;
  maxOutputTokens?: number;
  /**
   * Claude 의 생각 강도(`output_config.effort`) — 부르는 쪽이 정할 때만. 없으면 지금 그대로다(Opus 5 는 medium ·
   * 그 밖은 temperature 0). 오늘의 영어의 사진 읽기가 Opus 5.5 를 low 로 부른다(D-158 · 25 §13.9).
   */
  effort?: "low" | "medium" | "high";
};
function nonempty(text: string | null | undefined) {
  if (!text?.trim()) throw new StudioApiError("AI가 빈 응답을 반환했습니다.");
  if (text.length > 1_000_000)
    throw new StudioApiError("AI 응답이 너무 큽니다.");
  return text;
}
/** 실패한 상류 응답의 앞부분 — 오류 기록 메모용. 읽다 실패하면 빈 글. */
async function upstreamHead(response: Response, max = 2000): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let text = "";
  try {
    while (text.length < max) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
  } catch {
    // 끊긴 본문 — 읽은 데까지
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return text.slice(0, max);
}

async function rest(
  url: string,
  keyHeaders: Record<string, string>,
  body: unknown,
  signal: AbortSignal,
) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...keyHeaders },
    body: JSON.stringify(body),
    signal,
    cache: "no-store",
  });
  if (!response.ok) {
    // 상류의 거절 원문은 **오류 기록에만** 남긴다(원장님 2026-09-22 «AI 거절 원문») — 화면·응답에는 안 나간다.
    // 키 값·Bearer 따위는 기록기(src/lib/errorLog/sanitize.ts)가 거른다.
    const target = new URL(url);
    pushErrorLogContext("upstream", {
      host: target.host,
      path: target.pathname,
      status: response.status,
      retryAfter: response.headers.get("retry-after"),
      body: await upstreamHead(response),
    });
    throw new StudioApiError(
      response.status === 429
        ? "AI 사용량 한도에 도달했습니다. 잠시 후 다시 시도해 주세요."
        : "모델 API 요청에 실패했습니다. 서버의 연결 설정을 확인해 주세요.",
      response.status,
      response.status === 429 || response.status >= 500,
      retryAfterMs(response.headers.get("retry-after")),
    );
  }
  // Bound provider output even when content-length is absent.
  const reader = response.body?.getReader();
  if (!reader) throw new StudioApiError("AI 응답을 읽지 못했습니다.");
  let size = 0,
    raw = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4_000_000) {
        await reader.cancel();
        throw new StudioApiError("AI 응답이 너무 큽니다.");
      }
      raw += decoder.decode(value, { stream: true });
    }
    return JSON.parse(raw + decoder.decode());
  } finally {
    reader.releaseLock();
  }
}

/** Server credentials and fixed official endpoints only; no CLI fallback or tool access. */
export async function runModelApi(input: InferenceInput): Promise<string> {
  input = {
    ...input,
    signal: AbortSignal.any([input.signal, AbortSignal.timeout(110_000)]),
  };
  return withModelRetry(() => runModelApiOnce(input), input.signal);
}

async function runModelApiOnce(input: InferenceInput): Promise<string> {
  input.signal.throwIfAborted();
  const key = process.env[API_KEY_NAMES[input.vendor]]?.trim();
  if (!key)
    throw new StudioApiError(
      "선택한 모델의 서버 API 키가 설정되지 않았습니다.",
      503,
    );
  const image = input.imageDataUrl?.match(
    /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/,
  );
  const maxTokens = input.maxOutputTokens ?? 16000;
  try {
    if (input.vendor === "gemini") {
      const result = await rest(
        `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:generateContent`,
        { "x-goog-api-key": key },
        {
          contents: [
            {
              role: "user",
              parts: [
                { text: input.prompt },
                ...(image
                  ? [{ inlineData: { mimeType: image[1], data: image[2] } }]
                  : []),
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: maxTokens,
            ...geminiSampling(input.model),
          },
        },
        input.signal,
      );
      const candidate = result.candidates?.[0];
      if (candidate?.finishReason === "MAX_TOKENS")
        throw new StudioApiError(
          "Gemini 응답이 출력 토큰 한도로 잘렸습니다. 문항을 나누어 다시 시도해 주세요.",
        );
      if (candidate?.finishReason !== "STOP")
        throw new StudioApiError(
          "Gemini 응답이 완료되지 않았습니다. 문항을 나누어 다시 시도해 주세요.",
        );
      return nonempty(
        candidate.content?.parts
          ?.filter((p: { thought?: boolean; text?: string }) => !p.thought)
          .map((p: { text?: string }) => p.text ?? "")
          .join(""),
      );
    }
    if (input.vendor === "anthropic") {
      const result = await rest(
        "https://api.anthropic.com/v1/messages",
        {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        {
          model: input.model,
          max_tokens: maxTokens,
          ...(input.effort
            ? { output_config: { effort: input.effort } }
            : input.model === "claude-opus-5"
              ? { output_config: { effort: "medium" } }
              : { temperature: 0 }),
          messages: [
            {
              role: "user",
              content: [
                ...(image
                  ? [
                      {
                        type: "image",
                        source: {
                          type: "base64",
                          media_type: image[1],
                          data: image[2],
                        },
                      },
                    ]
                  : []),
                { type: "text", text: input.prompt },
              ],
            },
          ],
        },
        input.signal,
      );
      if (result.stop_reason === "max_tokens")
        throw new StudioApiError(
          "Claude 응답이 출력 토큰 한도로 잘렸습니다. 문항을 나누어 다시 시도해 주세요.",
        );
      if (result.stop_reason !== "end_turn")
        throw new StudioApiError(
          "Claude 응답이 완료되지 않았습니다. 문항을 나누어 다시 시도해 주세요.",
        );
      // No tools were requested. Never silently drop an unexpected block and
      // accept the remaining text as an ordinary completed answer.
      if (
        !Array.isArray(result.content) ||
        result.content.some((block: unknown) => {
          if (!block || typeof block !== "object" || !("type" in block))
            return true;
          if (block.type === "text")
            return !("text" in block) || typeof block.text !== "string";
          return (
            block.type !== "thinking" && block.type !== "redacted_thinking"
          );
        })
      )
        throw new StudioApiError(
          "Claude 응답에 예상하지 않은 내용이 포함되어 적용하지 않았습니다. 다시 시도해 주세요.",
        );
      return nonempty(
        result.content
          .filter((p: { type: string }) => p.type === "text")
          .map((p: { text: string }) => p.text)
          .join(""),
      );
    }
    const client = new OpenAI({
      apiKey: key,
      maxRetries: 0,
      timeout: 110_000,
      baseURL:
        input.vendor === "deepseek"
          ? "https://api.deepseek.com"
          : "https://api.openai.com/v1",
    });
    if (requiresResponsesApi(input.model)) {
      const result = await client.responses.create(
        {
          model: input.model,
          store: false,
          max_output_tokens: input.action === "solution" ? 16000 : 64000,
          reasoning: { effort: "low" },
          input: [
            {
              role: "user",
              content: [
                { type: "input_text", text: input.prompt },
                ...(input.imageDataUrl
                  ? [
                      {
                        type: "input_image" as const,
                        image_url: input.imageDataUrl,
                        detail: "high" as const,
                      },
                    ]
                  : []),
              ],
            },
          ],
        },
        { signal: input.signal },
      );
      if (result.incomplete_details?.reason === "max_output_tokens")
        throw new StudioApiError(
          "OpenAI 응답이 출력 토큰 한도로 잘렸습니다. 문항을 나누어 다시 시도해 주세요.",
        );
      if (result.status !== "completed")
        throw new StudioApiError(
          "OpenAI 응답이 완료되지 않았습니다. 문항을 나누어 다시 시도해 주세요.",
        );
      return nonempty(
        result.output_text?.trim()
          ? result.output_text
          : result.output
              ?.filter((item) => item.type === "message")
              .flatMap((item) => item.content)
              .filter((part) => part.type === "output_text")
              .map((part) => part.text)
              .join(""),
      );
    }
    const result = await client.chat.completions.create(
      {
        model: input.model,
        messages: [
          {
            role: "user",
            content:
              input.vendor === "deepseek"
                ? input.prompt
                : [
                    { type: "text", text: input.prompt },
                    ...(input.imageDataUrl
                      ? [
                          {
                            type: "image_url" as const,
                            image_url: {
                              url: input.imageDataUrl,
                              detail: "high" as const,
                            },
                          },
                        ]
                      : []),
                  ],
          },
        ],
        ...(input.vendor === "deepseek"
          ? { max_tokens: maxTokens, reasoning_effort: "low" as const }
          : usesCompletionTokens(input.model)
            ? { max_completion_tokens: maxTokens }
            : { max_tokens: maxTokens, temperature: 0.1 }),
      },
      { signal: input.signal },
    );
    if (result.choices[0]?.finish_reason === "length")
      throw new StudioApiError(
        "AI 응답이 출력 토큰 한도로 잘렸습니다. 문항을 나누어 다시 시도해 주세요.",
      );
    if (result.choices[0]?.finish_reason !== "stop")
      throw new StudioApiError(
        "AI 응답이 완료되지 않았습니다. 문항을 나누어 다시 시도해 주세요.",
      );
    return nonempty(result.choices[0].message.content);
  } catch (error) {
    input.signal.throwIfAborted();
    if (error instanceof StudioApiError) throw error;
    // SDK/raw upstream errors may contain credentials or source material.
    // 화면에는 안 싣고, 오류 기록에만 원문을 남긴다(비밀 값은 기록기가 거른다).
    pushErrorLogContext("upstream", {
      vendor: input.vendor,
      model: input.model,
      status: (error as { status?: unknown } | null)?.status ?? null,
      message:
        error instanceof Error
          ? `${error.name}: ${error.message}`.slice(0, 2000)
          : String(error).slice(0, 2000),
    });
    const upstream = error as {
      status?: unknown;
      headers?: Headers;
      message?: string;
    } | null;
    const status =
      typeof upstream?.status === "number" &&
      upstream.status >= 400 &&
      upstream.status <= 599
        ? upstream.status
        : 502;
    const transient =
      typeof upstream?.status === "number"
        ? status === 429 || status >= 500
        : /network|connection|timeout|temporarily/i.test(
            upstream?.message ?? "",
          );
    throw new StudioApiError(
      "모델 API 요청에 실패했습니다. 서버의 연결 설정을 확인해 주세요.",
      status,
      transient,
      retryAfterMs(
        upstream?.headers instanceof Headers
          ? upstream.headers.get("retry-after")
          : undefined,
      ),
    );
  }
}

export function getModelApiStatus(): DevAiStatus {
  const ready = (vendor: ApiVendor) =>
    !!process.env[API_KEY_NAMES[vendor]]?.trim();
  const vendors: ApiVendor[] = ["gemini", "deepseek", "anthropic", "openai"];
  const labels = {
    gemini: "Gemini",
    deepseek: "DeepSeek · 해설 전용",
    anthropic: "Claude",
    openai: "OpenAI",
  };
  return {
    enabled: vendors.some(ready),
    mode: "model-api",
    defaultProvider:
      ready("gemini") || ready("deepseek")
        ? "auto"
        : (vendors.find(ready) ?? "auto"),
    providers: [
      {
        id: "auto" as StudioApiProvider,
        label: "원본 기본 모델",
        status: ready("gemini") || ready("deepseek") ? "unverified" : "error",
        detail: describeAutoRoutes(process.env),
        image: ready("gemini"),
      },
      ...vendors.map((vendor) => ({
        id: vendor,
        label: labels[vendor],
        status: ready(vendor) ? ("unverified" as const) : ("error" as const),
        detail: ready(vendor)
          ? "서버 키 설정됨 · 실제 요청 확인 전"
          : "서버 API 키 설정 필요",
        image: vendor !== "deepseek",
      })),
    ],
  };
}
