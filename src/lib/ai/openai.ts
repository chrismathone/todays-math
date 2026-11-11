/**
 * OpenAI 호환 API 래퍼 — 서버 전용. **오늘의 영어 생성의 되돌리는 길**만 쓴다.
 *
 * 🔴 원장님 2026-11-11 «gemini · deepseek 사용처를 전부 sonnet 으로» — 영어 생성의 기본은 Claude Sonnet 5.5
 * (`src/lib/english/generate.ts` `callEnglishClaude`)다. 여기 둘은 `ENGLISH_AI_VENDOR` 로 되돌릴 때만 불린다:
 *   - openai   → gpt-6-luna(`callOpenAi` — D-151 · 25 §12.7)
 *   - deepseek → deepseek-v4-pro(`callEnglishDeepseek`)
 * DeepSeek 를 `client.ts` 의 `callAi` 로 부르지 않는 까닭: `callAi` 는 이제 문제 생성의 변수(`PROBLEM_AI_VENDOR`)로
 * 공급자를 고른다 — 영어를 deepseek 로 되돌려도 그 변수가 비어 있으면 Claude 로 가 버린다.
 *
 * ⚠️ `client.ts`(DeepSeek)와 같이 Route Handler 가 부르는 서버 모듈에서만 import 한다 — `OPENAI_API_KEY` 가 번들에 들어가면 안 된다.
 *
 * 왜 luna 인가: 원장님 2026-09-30 «luna 로». 벤치(25 §12.4 · §12.7)에서 품질 87.0(deepseek-flash 82.5) · 값 1/5 ·
 * 속도 비슷. 호출 모양은 DeepSeek 와 같은 Chat Completions 인데 추론 모델이라 두 가지가 다르다 —
 * `max_tokens` 대신 `max_completion_tokens`, 강도는 `reasoning_effort`.
 * 호출마다 새 클라이언트를 만든다(`client.ts` 와 같은 까닭 — 단발 요청 · 시험 격리).
 */
import OpenAI from "openai";

import { DEEPSEEK_MODEL } from "./client";
import { AiCapacityError, AiConfigError } from "./errors";

/** 영어 생성 모델 — 바꾸면 사유를 남긴다(벤치 `scripts/qa/english-bench/` 로 다시 잰 뒤) */
export const ENGLISH_OPENAI_MODEL = "gpt-6-luna";

/** 추론 강도 — 벤치로 정한다(25 §12.7) */
export const ENGLISH_OPENAI_EFFORT = "medium";

/**
 * 답 길이 상한 — 추론 토큰도 여기서 같이 쓴다. 실사용만 과금되니 넉넉히(세트 하나 실측 출력 약 6천).
 * DeepSeek 쪽 교훈(2026-08-19 «32,000 은 부족했다»)과 같은 결로 64,000.
 */
const OPENAI_MAX_COMPLETION_TOKENS = 64000;

function requireApiKey(name = "OPENAI_API_KEY"): string {
  const apiKey = process.env[name]?.trim();
  if (!apiKey)
    throw new AiConfigError(
      `${name}가 설정되어 있지 않습니다. 서버 환경변수를 확인해주세요.`,
    );
  return apiKey;
}

export interface CallOpenAiParams {
  system: string;
  prompt: string;
}

/** 영어 생성용 luna 호출 — 응답 텍스트. 길이 한도에 걸리면 `AiCapacityError`(재시도 대상 아님). */
export async function callOpenAi({
  system,
  prompt,
}: CallOpenAiParams): Promise<string> {
  const client = new OpenAI({ apiKey: requireApiKey() });
  const response = await client.chat.completions.create({
    model: ENGLISH_OPENAI_MODEL,
    max_completion_tokens: OPENAI_MAX_COMPLETION_TOKENS,
    reasoning_effort: ENGLISH_OPENAI_EFFORT,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  });
  const choice = response.choices[0];
  // 잘림을 먼저 본다 — 추론이 예산을 다 쓰면 content 가 비어 «JSON 이 아닙니다»로만 남는다(client.ts 와 같은 자리)
  if (choice?.finish_reason === "length")
    throw new AiCapacityError(
      "AI 응답이 최대 길이에서 잘렸습니다(추론이 예산을 소진).",
    );
  return choice?.message?.content ?? "";
}

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

/**
 * 추론 예산 하한 — v4-pro 는 사고과정이 max_tokens 를 같이 쓴다(`client.ts` 와 같은 값 · 같은 변수).
 * 2026-08-19 실측: 32,000 은 부족했다.
 */
const DEEPSEEK_MAX_TOKENS = Number(process.env.DEEPSEEK_MAX_TOKENS ?? 64000);

/** 영어 생성용 DeepSeek 호출(되돌리는 길) — 전에 운영하던 `callAi` 의 DeepSeek 경로와 같은 요청이다. */
export async function callEnglishDeepseek({
  system,
  prompt,
}: CallOpenAiParams): Promise<string> {
  const client = new OpenAI({
    apiKey: requireApiKey("DEEPSEEK_API_KEY"),
    baseURL: DEEPSEEK_BASE_URL,
  });
  const response = await client.chat.completions.create({
    model: DEEPSEEK_MODEL,
    max_tokens: DEEPSEEK_MAX_TOKENS,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  });
  const choice = response.choices[0];
  // 잘림을 먼저 본다 — 아래 reasoning_content 폴백이 «답이 아닌 생각»을 돌려주지 않게
  if (choice?.finish_reason === "length")
    throw new AiCapacityError(
      "AI 응답이 최대 길이에서 잘렸습니다(추론이 예산을 소진).",
    );
  // v4-pro 는 답을 content 에, 사고과정을 reasoning_content(OpenAI 표준 타입 밖)에 나눠 담는다
  const message = choice?.message as
    { content?: string | null; reasoning_content?: string | null } | undefined;
  return (
    (message?.content?.trim() ? message.content : message?.reasoning_content) ??
    ""
  );
}
