/**
 * 교과서 재시도 도구(오프라인 · 스크립트)의 Claude 전송 — Anthropic Messages API 를 한 번 부른다.
 *
 * 원장님 2026-11-11 «gemini · deepseek 사용처를 전부 sonnet 으로» · «초고난이도면 opus». 전에는 두 도구가 DeepSeek
 * (OpenAI 호환 SDK)를 따로 불렀다. 앱의 공용 경로 `runModelApi`(`src/lib/studio-ai/api.ts`)를 쓰지 않는 까닭:
 * 이 도구는 **그림을 여러 장** 싣고(그 경로는 한 장), 한 번에 몇 분씩 걸리며(그 경로는 110초에 끊는다),
 * 재시도를 **부르는 쪽이** 세어 기록한다(그 경로는 안에서 다시 부른다). 그래서 여기서는 한 번만 부르고
 * 결과 · 사용량 · 끝난 까닭을 그대로 돌려준다.
 *
 * - 키는 서버 환경변수 `ANTHROPIC_API_KEY` 만. 시험에서는 `fetch` 를 갈아 끼운다(실호출 금지 — CLAUDE.md 규칙 7).
 * - Sonnet 5.5 · Opus 5.5 는 temperature 를 받지 않는다(400) — 깊이는 `output_config.effort` 로만 정한다.
 * - 실패 오류에는 HTTP 상태(`status`)만 싣는다 — 상류 본문은 키 · 원문이 섞일 수 있어 싣지 않는다.
 */

export type ClaudeTransportPart =
  { type: "text"; text: string } | { type: "image"; dataUrl: string };

export interface ClaudeTransportRequest {
  model: string;
  system: string;
  parts: readonly ClaudeTransportPart[];
  maxTokens: number;
  effort: "low" | "medium" | "high";
  signal?: AbortSignal;
}

export interface ClaudeTransportResponse {
  /** 답 글(생각 블록은 뺀다). */
  text: string;
  /** 상류가 알려 준 모델 — 없으면 요청한 모델. */
  model: string;
  /** Claude 의 `stop_reason` 그대로(`end_turn` · `max_tokens` · `refusal` …). */
  stopReason: string | null;
  usage: {
    inputTokens?: number;
    outputTokens?: number;
    cacheReadInputTokens?: number;
  } | null;
}

/** 키 · 상류 본문을 싣지 않는 실패 — `status` 는 HTTP 상태(있으면). */
export class ClaudeTransportError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ClaudeTransportError";
  }
}

const IMAGE_DATA_URL = /^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/;

function imageBlock(dataUrl: string) {
  const match = dataUrl.match(IMAGE_DATA_URL);
  if (!match) throw new ClaudeTransportError("claude-image-format");
  return {
    type: "image" as const,
    source: { type: "base64" as const, media_type: match[1], data: match[2] },
  };
}

const count = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : undefined;

export async function callClaudeMessages(
  request: ClaudeTransportRequest,
): Promise<ClaudeTransportResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new ClaudeTransportError("anthropic-key-missing");
  const content = request.parts.map((part) =>
    part.type === "text"
      ? { type: "text" as const, text: part.text }
      : imageBlock(part.dataUrl),
  );
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: request.model,
      max_tokens: request.maxTokens,
      system: request.system,
      output_config: { effort: request.effort },
      messages: [{ role: "user", content }],
    }),
    signal: request.signal,
    cache: "no-store",
  });
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new ClaudeTransportError("claude-http-failed", response.status);
  }
  const data = (await response.json()) as {
    model?: unknown;
    stop_reason?: unknown;
    content?: unknown;
    usage?: Record<string, unknown>;
  };
  // 도구를 청하지 않았다 — 답 글 · 생각 말고 다른 블록이 오면 남은 글을 답으로 받지 않는다.
  if (
    !Array.isArray(data.content) ||
    data.content.some(
      (block: { type?: unknown; text?: unknown }) =>
        !block ||
        (block.type === "text"
          ? typeof block.text !== "string"
          : block.type !== "thinking" && block.type !== "redacted_thinking"),
    )
  )
    throw new ClaudeTransportError("claude-unexpected-content");
  return {
    text: (data.content as { type: string; text?: string }[])
      .filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join(""),
    model:
      typeof data.model === "string" && data.model ? data.model : request.model,
    stopReason: typeof data.stop_reason === "string" ? data.stop_reason : null,
    usage: data.usage
      ? {
          inputTokens: count(data.usage.input_tokens),
          outputTokens: count(data.usage.output_tokens),
          cacheReadInputTokens: count(data.usage.cache_read_input_tokens),
        }
      : null,
  };
}
