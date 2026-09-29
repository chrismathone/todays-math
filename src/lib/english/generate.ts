/**
 * 오늘의 영어 — DeepSeek 직접 생성 (D-148 · 25 §4.3). 서버 전용 — `callAi` 가 키를 읽는다.
 *
 * 흐름: 프롬프트(`src/lib/ai/prompts/englishExam.ts`) → `callAi` → **객체 하나** `parseAiJsonObject`
 *   → 모양 받아 주기(`coerceEnglishDraftShape`) → 검증기 `validateEnglishDraft(value, input)` → `source: "deepseek"`.
 *
 * 재시도: JSON 을 못 읽으면(`AiParseError`) `withOneRetryOnParseFailure` 가 한 번 더 부른다. **검증기 실패는
 * 재시도하지 않는다** — 한 번에 40초~2분이 드는 호출을 조용히 두 번 태우는 대신 사유를 화면으로 올린다
 * (`EnglishDraftRejectedError.issues`). 길이 한도(`finish_reason === "length"`)는 client 가 `AiCapacityError`,
 * 키 없음은 `AiConfigError` — 둘 다 재시도 대상이 아니다(`retry.ts`).
 *
 * 대응 라우트: POST /api/english/generate (저장하지 않고 초안만 돌려준다).
 */
import type {
  EnglishDraft,
  EnglishDraftIssue,
  EnglishGenerateRequest,
  EnglishGrade,
} from "@/contracts/english.contract";
import { callAi } from "@/lib/ai/client";
import { AiGenerationError } from "@/lib/ai/errors";
import { parseAiJsonObject } from "@/lib/ai/jsonRepair";
import {
  buildEnglishSystemPrompt,
  buildEnglishUserPrompt,
} from "@/lib/ai/prompts/englishExam";
import { withOneRetryOnParseFailure } from "@/lib/ai/retry";

import { coerceEnglishDraftShape } from "./chatgpt";
import { validateEnglishDraft } from "./validate";

/**
 * 🔴 검증기 실패 코드 — 계약 `errorCodeSchema`(common.contract.ts) 에 아직 `ENGLISH_DRAFT_REJECTED` 가 없다
 *    (리드 소유, 트랙은 계약을 고치지 않는다). 그래서 라우트는 코드를 `AI_GENERATION_FAILED` 로 두고 `details.code`
 *    에 이 값을 싣는다. 리드가 계약에 더하면 이 상수를 `code` 자리로 올린다 — 보고서 «리드가 정할 것».
 *    라우트 파일에 두지 않는 까닭: Next 는 route.ts 의 낯선 export 를 빌드 형 검사에서 막는다.
 */
export const ENGLISH_DRAFT_REJECTED = "ENGLISH_DRAFT_REJECTED";

/**
 * AI 가 낸 초안이 검증기(25 §4.4)를 통과하지 못했다. `AiGenerationError` 의 하위 타입이라 기존
 * `instanceof AiGenerationError` 검사는 그대로 잡지만, 라우트는 이것을 **먼저** 검사해 사유(`issues`)를
 * 응답에 싣는다(`AiConfigError` · `AiCapacityError` 와 같은 순서 함정).
 */
export class EnglishDraftRejectedError extends AiGenerationError {
  readonly issues: EnglishDraftIssue[];
  constructor(issues: EnglishDraftIssue[]) {
    super("AI 가 만든 초안이 검증을 통과하지 못했습니다.");
    this.name = "EnglishDraftRejectedError";
    this.issues = issues;
  }
}

/**
 * 생성 요청(계약을 지난 값) + 시험의 학년 → 초안. `maxTokens` 는 client 의 하한(추론 예산 64,000)을 따른다 —
 * v4-pro 는 사고과정이 예산을 같이 쓴다(client.ts `DEEPSEEK_MIN_MAX_TOKENS`).
 */
export async function generateEnglishDraft(
  input: EnglishGenerateRequest,
  grade: EnglishGrade,
): Promise<EnglishDraft> {
  const attempt = async () => {
    const raw = await callAi({
      system: buildEnglishSystemPrompt(),
      prompt: buildEnglishUserPrompt(input, grade),
    });
    return parseAiJsonObject(raw);
  };
  const value = await withOneRetryOnParseFailure(attempt);

  const verdict = validateEnglishDraft(
    coerceEnglishDraftShape(value, "deepseek"),
    input,
  );
  if (!verdict.ok) throw new EnglishDraftRejectedError(verdict.issues);
  return verdict.draft;
}
