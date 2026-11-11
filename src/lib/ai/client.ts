/**
 * 문항 생성 · 변형 AI 클라이언트 래퍼 — 서버 전용.
 *
 * ⚠️ 이 모듈은 Route Handler(`src/app/api/**`)에서만 import한다. 클라이언트 컴포넌트에서
 * import하면 서버 키(`ANTHROPIC_API_KEY` · 되돌렸을 때 `DEEPSEEK_API_KEY`)가 번들에 노출될 수
 * 있으므로 절대 금지 (07-coding-convention.md "AI API 키를 클라이언트 코드에 노출 금지").
 *
 * ## 공급자 (원장님 2026-11-11 «gemini · deepseek 사용처를 전부 sonnet 으로» · «초고난이도면 opus»)
 *
 * - 기본: **Claude Sonnet 5.5**(effort medium) — `claudeModels.ts` 의 `CLAUDE_DEFAULT_MODEL`.
 * - 난이도가 «심화상»이면 **Claude Opus 5.5**(effort high) — `claudeModelFor(difficulty)`.
 * - 되돌리기: 서버 환경변수 `PROBLEM_AI_VENDOR=deepseek` — 전에 쓰던 DeepSeek `deepseek-v4-pro`
 *   (OpenAI 호환 SDK) 경로가 아래에 그대로 있다. 낯선 값은 설정 오류다(조용히 다른 공급자로 가지 않는다).
 *
 * Claude 호출은 문제 추출과 **같은 경로** `runModelApi`(`src/lib/studio-ai/api.ts`)를 쓴다 — 429 · 5xx
 * 재시도, 상류 거절 원문의 오류 기록, 생각 블록 걷어 내기, `stop_reason` 검사가 거기 한 벌로 있다.
 * 그 모듈은 `server-only` 를 import 하므로 **부를 때만** 불러온다(동적 import) — 이 파일을 import 하는
 * 영어 생성 · 교과서 재시도 도구 · 그 시험들이 적재 단계에서 죽지 않게.
 *
 * 호출마다 새 연결을 만든다 — AI 호출은 상태를 유지할 필요가 없는 단발 HTTP 요청이라
 * `src/lib/db.ts`(Prisma)처럼 전역 싱글턴으로 캐싱할 이유가 없다.
 */
import OpenAI from "openai";

import { claudeModelFor, isHardDifficulty } from "./claudeModels";
import { AiCapacityError, AiConfigError } from "./errors";

/**
 * 되돌렸을 때(`PROBLEM_AI_VENDOR=deepseek`) 쓰는 옛 모델. 영어 생성(`src/lib/english/generate.ts`)과
 * 영어 듣기 재구성 스크립트가 아직 이 이름을 «만든 조건» 표시에 읽는다 — 지우지 않는다.
 */
export const DEEPSEEK_MODEL = "deepseek-v4-pro";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

export type ProblemAiVendor = "anthropic" | "deepseek";

/** 공급자별 서버 키 이름 — 라우트가 «무엇이 없는지»를 말할 때 쓴다(값은 절대 싣지 않는다). */
const KEY_NAMES: Record<ProblemAiVendor, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
};

/**
 * 공급자 — 기본 Claude. `PROBLEM_AI_VENDOR`(anthropic | deepseek)로 코드 없이 되돌린다.
 * 낯선 값은 `AiConfigError` — 오타가 조용히 다른 공급자(다른 요금)로 새지 않게.
 */
export function resolveProblemAiVendor(
  env: Record<string, string | undefined> = process.env,
): ProblemAiVendor {
  const chosen = env.PROBLEM_AI_VENDOR?.trim();
  if (!chosen) return "anthropic";
  if (chosen === "anthropic" || chosen === "deepseek") return chosen;
  throw new AiConfigError(
    "PROBLEM_AI_VENDOR 는 anthropic 또는 deepseek 여야 합니다.",
  );
}

/** 지금 공급자의 서버 키 이름. 공급자 값이 잘못돼 있으면 그 변수 이름을 돌려준다. */
export function problemAiKeyName(
  env: Record<string, string | undefined> = process.env,
): string {
  try {
    return KEY_NAMES[resolveProblemAiVendor(env)];
  } catch {
    return "PROBLEM_AI_VENDOR";
  }
}

/** 그 난이도의 문항을 만드는 모델 이름 — 표시 · 기록용(`callAi` 와 같은 규칙). */
export function problemAiModel(
  difficulty?: string | null,
  env: Record<string, string | undefined> = process.env,
): string {
  return resolveProblemAiVendor(env) === "deepseek"
    ? DEEPSEEK_MODEL
    : claudeModelFor(difficulty);
}

/**
 * 추론형(v4-pro) 전용 max_tokens 하한 — **되돌린 DeepSeek 경로에서만** 쓴다. v4-pro는 사고과정
 * (`reasoning_content`)이 max_tokens를 함께 소모하므로, 호출부 값(4096 등)이 추론에 소진되면 답변 JSON이
 * 잘린다(`finish_reason === "length"`). ⚠️ 32,000 은 부족했다(2026-08-19 실측 — 그림 문항 변형에서
 * 추론만으로 32k 를 다 썼다). API 는 200,000 까지 받는다.
 */
const DEEPSEEK_MIN_MAX_TOKENS = Number(
  process.env.DEEPSEEK_MAX_TOKENS ?? 64000,
);

/**
 * Claude 의 max_tokens 하한. Sonnet 5.5 · Opus 5.5 는 생각을 끌 수 없고(생각도 이 한도를 같이 쓴다)
 * 출력은 128K 까지 받는다. 호출부 값(4096)으로는 생각만으로 바닥나므로 하한을 둔다 — 한도는 상한일 뿐
 * 실제로 쓴 토큰만 과금된다. 심화상(Opus · high)은 생각이 길어 두 배를 준다. `PROBLEM_AI_MAX_TOKENS` 로 조절.
 */
const CLAUDE_MIN_MAX_TOKENS = Number(
  process.env.PROBLEM_AI_MAX_TOKENS ?? 32000,
);

/** Claude 한 번(429 · 5xx 재시도 포함)의 시간 상한 — 라우트 `maxDuration = 300` 안쪽. */
const CLAUDE_CALL_TIMEOUT_MS = 280_000;

function requireApiKey(vendor: ProblemAiVendor): string {
  const name = KEY_NAMES[vendor];
  const apiKey = process.env[name]?.trim();
  if (!apiKey) {
    throw new AiConfigError(
      `${name}가 설정되어 있지 않습니다. 서버 환경변수를 확인해주세요.`,
    );
  }
  return apiKey;
}

export interface CallAiParams {
  system: string;
  prompt: string;
  maxTokens?: number;
  /**
   * 만들 문항의 난이도(난이도 사다리 `contracts/difficulty.ts`). «심화상»이면 Claude Opus 5.5 · effort high,
   * 그 밖(값 없음 포함)은 Sonnet 5.5 · effort medium. 되돌린 DeepSeek 경로는 이 값을 보지 않는다.
   */
  difficulty?: string | null;
}

/**
 * 모델을 불러 응답 텍스트를 반환한다. JSON 잘림 방지를 위해 `maxTokens`에 하한을 둔다 — 문제 생성/변형
 * 응답은 배열 전체가 한 번에 와야 파싱이 가능하다.
 *
 * ⚠️ 구조화 응답(JSON mode · `output_config.format`)은 쓰지 않는다 — 이 프로젝트의 프롬프트는 **JSON 배열**을
 * 요구하고, 코드펜스/잡설은 `parseAiJsonArray`(jsonRepair.ts)가 걷어 낸다. 파싱 실패 재시도는
 * 부르는 쪽(`retry.ts` 의 `withOneRetryOnParseFailure`)이 한다.
 */
export async function callAi(params: CallAiParams): Promise<string> {
  const vendor = resolveProblemAiVendor();
  return vendor === "deepseek" ? callDeepseek(params) : callClaude(params);
}

/** `runModelApi` 를 한 번만 불러 둔다 — 동시에 두 호출이 들어와도 같은 모듈을 받는다. */
let studioApi: Promise<typeof import("@/lib/studio-ai/api")> | undefined;
const loadStudioApi = () => (studioApi ??= import("@/lib/studio-ai/api"));

async function callClaude({
  system,
  prompt,
  maxTokens = 4096,
  difficulty,
}: CallAiParams): Promise<string> {
  requireApiKey("anthropic");
  const hard = isHardDifficulty(difficulty);
  const { runModelApi, StudioApiError } = await loadStudioApi();
  try {
    return await runModelApi({
      vendor: "anthropic",
      model: claudeModelFor(difficulty),
      // `runModelApi` 에는 system 칸이 없다 — 지시를 앞에, 요청을 뒤에 한 메시지로 싣는다.
      prompt: `${system}\n\n---\n\n${prompt}`,
      // Sonnet 5.5 · Opus 5.5 는 temperature 를 받지 않는다(400) — effort 를 주면 runModelApi 가 뺀다.
      effort: hard ? "high" : "medium",
      maxOutputTokens: Math.max(
        maxTokens,
        hard ? CLAUDE_MIN_MAX_TOKENS * 2 : CLAUDE_MIN_MAX_TOKENS,
      ),
      signal: new AbortController().signal,
      // runModelApi 의 기본 110초로는 모자란다 — 2026-11-11 실측: 심화상 10문항(Opus 5.5 · high)이 110초에서
      // 끊겼다(Sonnet 5.5 · medium 10문항은 36.9초). 생성 · 변형 경로의 상한(maxDuration 300초)에서 저장 몫을 뺀 값.
      timeoutMs: CLAUDE_CALL_TIMEOUT_MS,
    });
  } catch (error) {
    // 답을 내기 전에 한도에 걸린 것은 따로 세운다(`AiCapacityError` — 재시도 대상이 아니다).
    // runModelApi 는 이것을 `stop_reason === "max_tokens"` 에서 이 문구로 던진다.
    if (error instanceof StudioApiError && /출력 토큰 한도/.test(error.message))
      throw new AiCapacityError(
        "AI 응답이 최대 길이에서 잘렸습니다(생각이 예산을 소진).",
        { cause: error },
      );
    throw error;
  }
}

/** 되돌린 경로 — DeepSeek Chat API(OpenAI 호환). 전에 운영하던 그대로다. */
async function callDeepseek({
  system,
  prompt,
  maxTokens = 4096,
}: CallAiParams): Promise<string> {
  const client = new OpenAI({
    apiKey: requireApiKey("deepseek"),
    baseURL: DEEPSEEK_BASE_URL,
  });
  const response = await client.chat.completions.create({
    model: DEEPSEEK_MODEL,
    max_tokens: Math.max(maxTokens, DEEPSEEK_MIN_MAX_TOKENS),
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  });

  const choice = response.choices[0];

  // ⚠️ **잘림을 먼저 본다.** 이 검사가 없으면 아래 `reasoning_content` 폴백이 «답이 아닌
  //    생각»을 돌려주고, 그것은 절대 JSON 이 될 수 없어 "유효한 JSON 이 아닙니다"로만 남는다.
  if (choice?.finish_reason === "length") {
    throw new AiCapacityError(
      "AI 응답이 최대 길이에서 잘렸습니다(추론이 예산을 소진).",
    );
  }

  // v4-pro는 답을 `content`에, 사고과정을 `reasoning_content`(OpenAI 표준 타입 밖)에 나눠 담는다.
  const message = choice?.message as
    { content?: string | null; reasoning_content?: string | null } | undefined;

  return (
    (message?.content?.trim() ? message.content : message?.reasoning_content) ??
    ""
  );
}
