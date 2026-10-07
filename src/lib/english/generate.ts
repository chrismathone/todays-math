/**
 * 오늘의 영어 — AI 직접 생성 (D-148 · 25 §4.3). 서버 전용 — 호출부가 키를 읽는다.
 * 운영 공급자: `OPENAI_API_KEY` 가 있으면 gpt-6-luna(`callOpenAi`), 없으면 DeepSeek(`callAi`).
 * 개발 라우트는 구독 CLI 전송을 주입한다. 전송만 바꾸고 파싱·검증·고쳐 쓰기는 함께 쓴다.
 *
 * 흐름: 프롬프트(`src/lib/ai/prompts/englishExam.ts`) → `callOpenAi`/`callAi` → **객체 하나** `parseAiJsonObject`
 *   → 모양 받아 주기(`coerceEnglishDraftShape`) → 검증기 `validateEnglishDraft(value, input)` → `source: "deepseek"`.
 *
 * 재시도: JSON 을 못 읽으면(`AiParseError`) `withOneRetryOnParseFailure` 가 한 번 더 부른다. 길이 한도
 * (`finish_reason === "length"`)는 client 가 `AiCapacityError`, 키 없음은 `AiConfigError` — 둘 다 재시도 대상이 아니다(`retry.ts`).
 *
 * 검증기 실패 → **사유를 되먹여 한 번 고쳐 쓴다**(D-151, 2026-09-30). 똑같이 다시 부르는 재시도가 아니라, 검증기 사유와
 * 결정적 품질 검사 실패(`feedback.ts`)를 문항 번호와 함께 주고 «지적된 문항만» 고치게 한다. 모델 벤치에서 DeepSeek
 * 두 모델의 채택률이 67% → 100% 가 됐다(25 §12). 🔴 라우트 `maxDuration = 300` 을 넘지 않게 **첫 호출이
 * `ENGLISH_REFINE_BUDGET_MS` 안에 끝났을 때만** 고친다 — v4-pro 는 한 번에 130~310초라 대개 건너뛰고,
 * luna(API)는 50~90초라 대개 고친다.
 * 고쳐 쓴 것도 걸리거나 못 읽으면 `EnglishDraftRejectedError`(사유는 마지막으로 읽힌 초안의 것).
 *
 * 대응 라우트: POST /api/english/generate (저장하지 않고 초안만 돌려준다).
 */
import type {
  EnglishDraft,
  EnglishDraftIssue,
  EnglishGenerateRequest,
  EnglishGrade,
} from "@/contracts/english.contract";
import { DEEPSEEK_MODEL, callAi } from "@/lib/ai/client";
import { AiConfigError, AiGenerationError } from "@/lib/ai/errors";
import { parseAiJsonObject } from "@/lib/ai/jsonRepair";
import { ENGLISH_OPENAI_MODEL, callOpenAi } from "@/lib/ai/openai";
import {
  ENGLISH_EXAM_PROMPT_VERSION,
  buildEnglishRefinePrompt,
  buildEnglishSystemPrompt,
  buildEnglishUserPrompt,
} from "@/lib/ai/prompts/englishExam";
import { withOneRetryOnParseFailure } from "@/lib/ai/retry";

import { coerceEnglishDraftShape } from "./chatgpt";
import { englishDraftFeedback } from "./feedback";
import { validateEnglishDraft } from "./validate";

/**
 * 검증기 실패 코드 — 계약 `errorCodeSchema`(common.contract.ts, 리드 커밋 c70ee7509) 의 값과 같은 글자.
 * 라우트가 `jsonError(ENGLISH_DRAFT_REJECTED, …, 502, { issues })` 로 쓴다.
 * 라우트 파일에 두지 않는 까닭: Next 는 route.ts 의 낯선 export 를 빌드 형 검사에서 막는다.
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

export type EnglishAiVendor = "openai" | "deepseek";

/**
 * 영어 생성 공급자 — `OPENAI_API_KEY` 가 있으면 luna(`src/lib/ai/openai.ts`), 없으면 DeepSeek(`callAi`).
 * 운영에 키를 넣기 전까지는 지금 동작 그대로다. `ENGLISH_AI_VENDOR`(openai | deepseek)로 코드 없이 고르거나 되돌린다
 * (`STUDIO_AI_FIGURE_VENDOR` 와 같은 결). 낯선 값은 설정 오류 — 조용히 다른 공급자로 가지 않는다.
 * 원장님 2026-09-30 «luna 로»(25 §12.7). 초안의 `source` 는 공급자와 무관하게 "deepseek"(화면 이름 «AI 생성») —
 * 값을 바꾸려면 DB `source` CHECK 마이그레이션이 필요해 그대로 둔다.
 */
export function resolveEnglishVendor(
  env: Record<string, string | undefined> = process.env,
): EnglishAiVendor {
  const chosen = env.ENGLISH_AI_VENDOR?.trim();
  if (chosen) {
    if (chosen === "openai" || chosen === "deepseek") return chosen;
    throw new AiConfigError(
      "ENGLISH_AI_VENDOR 는 openai 또는 deepseek 여야 합니다.",
    );
  }
  return env.OPENAI_API_KEY?.trim() ? "openai" : "deepseek";
}

/** 고쳐 쓰기를 시작해도 되는 첫 호출의 최대 소요 — 라우트 300초에서 고쳐 쓰기 한 번(~100초)과 여유를 뺀 값 */
/**
 * 운영 API가 부르는 모델 · 프롬프트 판 — 세트의 «만든 조건»에 싣는다(원장님 2026-10-01 «메타데이터 기억되게»).
 * `generateEnglishDraft` 의 기본 API 전송과 같은 `resolveEnglishVendor`로 고른다. 개발은 주입된 CLI의 메타데이터를 쓴다.
 */
export function englishGenerationModel(
  env: Record<string, string | undefined> = process.env,
): { name: string; promptVersion: string } {
  return {
    name:
      resolveEnglishVendor(env) === "openai"
        ? ENGLISH_OPENAI_MODEL
        : DEEPSEEK_MODEL,
    promptVersion: ENGLISH_EXAM_PROMPT_VERSION,
  };
}

export const ENGLISH_REFINE_BUDGET_MS = 150_000;

export type EnglishGenerationTransport = (input: {
  system: string;
  prompt: string;
}) => Promise<string>;

export interface GenerateEnglishOptions {
  /** 시계 — 시험이 예산 분기를 재려고 넣는다 */
  now?: () => number;
  /** 개발 구독 CLI도 같은 파서·검증기·고쳐 쓰기를 거친다. */
  transport?: EnglishGenerationTransport;
}

/**
 * 생성 요청(계약을 지난 값) + 시험의 학년 → 초안. `maxTokens` 는 client 의 하한(추론 예산 64,000)을 따른다 —
 * v4-pro 는 사고과정이 예산을 같이 쓴다(client.ts `DEEPSEEK_MIN_MAX_TOKENS`).
 */
export async function generateEnglishDraft(
  input: EnglishGenerateRequest,
  grade: EnglishGrade,
  { now = Date.now, transport }: GenerateEnglishOptions = {},
): Promise<EnglishDraft> {
  const started = now();
  // 개발 라우트가 전송 주입을 빠뜨려도 과금 API로 내려가지 않는다.
  if (process.env.NODE_ENV === "development" && !transport)
    throw new AiConfigError("개발용 구독 AI 연결이 설정되지 않았습니다.");
  const call =
    transport ?? (resolveEnglishVendor() === "openai" ? callOpenAi : callAi);
  const system = buildEnglishSystemPrompt();
  const attempt = async () => {
    const raw = await call({
      system,
      prompt: buildEnglishUserPrompt(input, grade),
    });
    return parseAiJsonObject(raw);
  };
  const value = coerceEnglishDraftShape(
    await withOneRetryOnParseFailure(attempt),
    "deepseek",
  );

  const verdict = validateEnglishDraft(value, input);
  if (verdict.ok) return verdict.draft;
  if (now() - started > ENGLISH_REFINE_BUDGET_MS)
    throw new EnglishDraftRejectedError(verdict.issues);

  // 한 번 고쳐 쓰기 — 사유 + 품질 검사 실패를 되먹인다
  const issues = englishDraftFeedback(value, input);
  let revised: unknown;
  try {
    revised = coerceEnglishDraftShape(
      parseAiJsonObject(
        await call({
          system,
          prompt: buildEnglishRefinePrompt(
            input,
            grade,
            JSON.stringify(value),
            issues,
          ),
        }),
      ),
      "deepseek",
    );
  } catch {
    // 고쳐 쓰기는 덤이다 — 어떤 이유로 실패하든 원래 동작(첫 초안의 사유로 거절)보다 나빠지지 않는다
    throw new EnglishDraftRejectedError(verdict.issues);
  }
  const second = validateEnglishDraft(revised, input);
  if (!second.ok) throw new EnglishDraftRejectedError(second.issues);
  return second.draft;
}
