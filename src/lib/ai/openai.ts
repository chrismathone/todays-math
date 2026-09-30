/**
 * OpenAI API 래퍼 — 서버 전용. 지금은 **오늘의 영어 생성**만 쓴다(gpt-6-luna, D-150 · 25 §12.7).
 *
 * ⚠️ `client.ts`(DeepSeek)와 같이 Route Handler 가 부르는 서버 모듈에서만 import 한다 — `OPENAI_API_KEY` 가 번들에 들어가면 안 된다.
 *
 * 왜 luna 인가: 원장님 2026-09-30 «luna 로». 벤치(25 §12.4 · §12.7)에서 품질 87.0(deepseek-flash 82.5) · 값 1/5 ·
 * 속도 비슷. 호출 모양은 DeepSeek 와 같은 Chat Completions 인데 추론 모델이라 두 가지가 다르다 —
 * `max_tokens` 대신 `max_completion_tokens`, 강도는 `reasoning_effort`.
 * 호출마다 새 클라이언트를 만든다(`client.ts` 와 같은 까닭 — 단발 요청 · 시험 격리).
 */
import OpenAI from "openai";

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

function requireApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey)
    throw new AiConfigError(
      "OPENAI_API_KEY가 설정되어 있지 않습니다. 서버 환경변수를 확인해주세요.",
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
