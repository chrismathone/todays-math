/**
 * 오늘의 영어 — AI 직접 생성 (D-148 · 25 §4.3). 서버 전용 — 호출부가 키를 읽는다.
 * 운영 공급자: Claude Sonnet 5.5(`callEnglishClaude` — 원장님 2026-11-11 «gemini · deepseek 사용처를 전부 sonnet 으로»).
 * 되돌리는 길: `ENGLISH_AI_VENDOR` = openai(gpt-6-luna · `callOpenAi`) · deepseek(`callEnglishDeepseek`).
 * 개발 라우트는 구독 CLI 전송을 주입한다. 전송만 바꾸고 파싱·검증·고쳐 쓰기는 함께 쓴다.
 *
 * 흐름: 프롬프트(`src/lib/ai/prompts/englishExam.ts`) → 전송 → **객체 하나** `parseAiJsonObject`
 *   → 모양 받아 주기(`coerceEnglishDraftShape`) → 검증기 `validateEnglishDraft(value, input)` → `source: "deepseek"`.
 *
 * 재시도: JSON 을 못 읽으면(`AiParseError`) `withOneRetryOnParseFailure` 가 한 번 더 부른다. 길이 한도
 * (Claude `stop_reason === "max_tokens"` · OpenAI 호환 `finish_reason === "length"`)는 `AiCapacityError`, 키 없음은
 * `AiConfigError` — 둘 다 재시도 대상이 아니다(`retry.ts`). Claude 의 429 · 5xx 는 배관(`withModelRetry`)이 다시 부른다.
 *
 * 검증기 실패 → **사유를 되먹여 한 번 고쳐 쓴다**(D-151, 2026-09-30). 똑같이 다시 부르는 재시도가 아니라, 검증기 사유와
 * 결정적 품질 검사 실패(`feedback.ts`)를 문항 번호와 함께 주고 «지적된 문항만» 고치게 한다. 모델 벤치에서 DeepSeek
 * 두 모델의 채택률이 67% → 100% 가 됐다(25 §12). 🔴 라우트 `maxDuration = 300` 을 넘지 않게 **첫 호출이
 * `ENGLISH_REFINE_BUDGET_MS` 안에 끝났을 때만** 고친다 — v4-pro 는 한 번에 130~310초라 대개 건너뛰고,
 * luna(API)는 50~90초라 대개 고친다. Claude 는 배관의 시간 한도(호출 하나 110초)가 먼저라 늘 고친다.
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
import { CLAUDE_DEFAULT_MODEL } from "@/lib/ai/claudeModels";
import { DEEPSEEK_MODEL } from "@/lib/ai/client";
import {
  AiCapacityError,
  AiConfigError,
  AiGenerationError,
} from "@/lib/ai/errors";
import { parseAiJsonObject } from "@/lib/ai/jsonRepair";
import {
  ENGLISH_OPENAI_MODEL,
  callEnglishDeepseek,
  callOpenAi,
} from "@/lib/ai/openai";
import {
  ENGLISH_EXAM_PROMPT_VERSION,
  buildEnglishRefinePrompt,
  buildEnglishSystemPrompt,
  buildEnglishUserPrompt,
} from "@/lib/ai/prompts/englishExam";
import { withOneRetryOnParseFailure } from "@/lib/ai/retry";
import { runModelApi } from "@/lib/studio-ai/api";
import { StudioApiError } from "@/lib/studio-ai/errors";

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

const ENGLISH_AI_VENDORS = ["anthropic", "openai", "deepseek"] as const;
export type EnglishAiVendor = (typeof ENGLISH_AI_VENDORS)[number];

/**
 * 영어 생성 공급자 — 기본은 Claude Sonnet 5.5(원장님 2026-11-11 «전부 sonnet 으로»). **키로 고르지 않는다** —
 * Claude 키가 없으면 다른 공급자로 조용히 넘어가지 않고 설정 오류(503)다.
 * `ENGLISH_AI_VENDOR`(anthropic | openai | deepseek)로 코드 없이 되돌린다 — openai 는 전에 쓰던 luna(원장님 2026-09-30
 * «luna 로» · 25 §12.7), deepseek 는 그 앞의 v4-pro. 낯선 값은 설정 오류 — 조용히 다른 공급자로 가지 않는다.
 * 초안의 `source` 는 공급자와 무관하게 "deepseek"(화면 이름 «AI 생성») — 값을 바꾸려면 DB `source` CHECK
 * 마이그레이션이 필요해 그대로 둔다.
 */
export function resolveEnglishVendor(
  env: Record<string, string | undefined> = process.env,
): EnglishAiVendor {
  const chosen = env.ENGLISH_AI_VENDOR?.trim().toLowerCase();
  if (!chosen) return "anthropic";
  const vendor = ENGLISH_AI_VENDORS.find((item) => item === chosen);
  if (vendor) return vendor;
  throw new AiConfigError(
    "ENGLISH_AI_VENDOR 는 anthropic · openai · deepseek 가운데 하나여야 합니다.",
  );
}

/**
 * 생각 강도 — 지문 · 문항 · 해설을 한 번에 짓는 일이라 medium(작업실의 해설과 같은 강도).
 * Sonnet 5.5 는 `temperature` 를 받지 않는다(400) — 강도를 주면 배관이 temperature 를 빼고 보낸다.
 */
export const ENGLISH_CLAUDE_EFFORT = "medium" as const;

/**
 * 출력 한도 — 생각도 여기서 같이 쓴다. 세트 하나의 답은 6천 토큰 남짓(luna 실측)이고, 실사용만 과금되니 넉넉히.
 * 배관의 기본(16,000)이면 긴 세트에서 생각이 예산을 먹어 잘릴 수 있다.
 */
export const ENGLISH_CLAUDE_MAX_OUTPUT_TOKENS = 32000;
/** 재시도까지 합친 생성 시간 상한 — 경로(`/api/english/generate`) maxDuration 300초 안. */
export const ENGLISH_CLAUDE_TIMEOUT_MS = 280_000;

/** 배관이 «출력 한도로 잘렸다»고 알리는 문장 — 배관은 형을 따로 두지 않아 문장으로 가른다(시험이 문장을 잠근다) */
const TRUNCATED = /출력 토큰 한도로 잘렸/;

/**
 * 영어 생성용 Claude 호출 — 작업실의 배관(`src/lib/studio-ai/api.ts` `runModelApi`)을 쓴다(키 · 고정 주소 · 429/5xx
 * 재시도 · 오류 기록이 거기 있다). 🔴 배관에는 system 칸이 없어 규칙(system)을 앞에, 요청을 뒤에 한 글로 싣는다.
 * 배관의 오류는 `src/lib/ai/errors` 의 형으로 옮긴다 — 라우트의 오류 순서(길이 502 → 설정 503 → 일반 502)가 그대로 돈다.
 */
export async function callEnglishClaude({
  system,
  prompt,
}: {
  system: string;
  prompt: string;
}): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY?.trim())
    throw new AiConfigError(
      "ANTHROPIC_API_KEY가 설정되어 있지 않습니다. 서버 환경변수를 확인해주세요.",
    );
  try {
    return await runModelApi({
      vendor: "anthropic",
      model: CLAUDE_DEFAULT_MODEL,
      prompt: `${system}\n\n${prompt}`,
      // 라우트는 화면의 끊김을 운영에서 받지 못한다(D-158 교훈) — 시간 한도는 배관이 건다
      signal: new AbortController().signal,
      effort: ENGLISH_CLAUDE_EFFORT,
      maxOutputTokens: ENGLISH_CLAUDE_MAX_OUTPUT_TOKENS,
      // 한 세트를 한 번에 만든다 — 배관 기본 110초는 짧다(경로 상한 300초 안에서 끊는다)
      timeoutMs: ENGLISH_CLAUDE_TIMEOUT_MS,
    });
  } catch (error) {
    if (error instanceof StudioApiError) {
      if (TRUNCATED.test(error.message))
        throw new AiCapacityError(
          "AI 응답이 최대 길이에서 잘렸습니다(생각이 예산을 소진).",
          { cause: error },
        );
      if (error.status === 503)
        throw new AiConfigError("AI 연결이 설정되지 않았습니다.", {
          cause: error,
        });
      throw new AiGenerationError(error.message, { cause: error });
    }
    // 시간 한도(TimeoutError) 같은 그 밖의 실패는 `withOneRetryOnParseFailure` 가 AiGenerationError 로 감싼다
    throw error;
  }
}

const ENGLISH_TRANSPORTS = {
  anthropic: callEnglishClaude,
  openai: callOpenAi,
  deepseek: callEnglishDeepseek,
} as const;

const ENGLISH_MODEL_NAMES: Record<EnglishAiVendor, string> = {
  anthropic: CLAUDE_DEFAULT_MODEL,
  openai: ENGLISH_OPENAI_MODEL,
  deepseek: DEEPSEEK_MODEL,
};

/** 고쳐 쓰기를 시작해도 되는 첫 호출의 최대 소요 — 라우트 300초에서 고쳐 쓰기 한 번(~100초)과 여유를 뺀 값 */
/**
 * 운영 API가 부르는 모델 · 프롬프트 판 — 세트의 «만든 조건»에 싣는다(원장님 2026-10-01 «메타데이터 기억되게»).
 * `generateEnglishDraft` 의 기본 API 전송과 같은 `resolveEnglishVendor`로 고른다. 개발은 주입된 CLI의 메타데이터를 쓴다.
 */
export function englishGenerationModel(
  env: Record<string, string | undefined> = process.env,
): { name: string; promptVersion: string } {
  return {
    name: ENGLISH_MODEL_NAMES[resolveEnglishVendor(env)],
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
 * 생성 요청(계약을 지난 값) + 시험의 학년 → 초안. 출력 한도는 전송마다 정한다 — Claude 는
 * `ENGLISH_CLAUDE_MAX_OUTPUT_TOKENS`, 되돌린 길은 `openai.ts` 의 값(생각 · 추론이 예산을 같이 쓴다).
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
  const call: EnglishGenerationTransport =
    transport ?? ENGLISH_TRANSPORTS[resolveEnglishVendor()];
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
