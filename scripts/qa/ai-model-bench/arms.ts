/**
 * AI 모델 비교 하네스 — 모델 «팔» 정의 (원장님 2026-10-19 «새 모델이 나와도 다시 돌릴 수 있게»).
 *
 * 팔 하나 = 공급자 · 모델 · 설정 · 단가. 새 모델은 여기에 한 줄을 더하고 `run.ts --arms <id>` 로 돌린다.
 * 설정의 기본은 **제품과 같게** 둔다(`src/lib/studio-ai/api.ts` `runModelApiOnce`):
 *   - deepseek: chat.completions · `reasoning_effort: "low"` · `max_tokens` 16000
 *   - openai(gpt-5 계열): chat.completions · `max_completion_tokens` 16000 · 이미지 `detail: "high"`
 *   - gemini: generateContent · 3.8 Flash 는 `thinkingLevel: LOW` · `maxOutputTokens` 16000
 *   - anthropic: messages · Opus 5 는 effort medium, 그 밖은 temperature 0 · `max_tokens` 16000
 * 제품과 다른 설정을 재고 싶으면 그 차이를 팔의 id 에 드러낸다(예: `deepseek-flash@16k`).
 *
 * 단가는 100만 토큰당 달러, 공급자 공식 가격표 기준. 출처와 날짜를 같이 적는다 — 값이 바뀌면 여기만 고친다.
 */
/** agy = Antigravity 구독 CLI(Gemini) — 유료 API 가 아니다(비용 0 으로 센다). 사진은 파일 보기 도구로 연다(제품 API 와 싣는 길이 다르다) */
export type Vendor = "deepseek" | "openai" | "gemini" | "anthropic" | "agy";

export interface Price {
  /** 입력(캐시 안 맞음) */
  input: number;
  /** 입력(캐시 맞음) — 공급자가 따로 받지 않으면 input 과 같게 */
  cachedInput: number;
  /** 출력(생각 토큰 포함) */
  output: number;
  /** 혼잡 시간 배수 · 판정 — 딥시크만 쓴다 */
  peak?: { multiplier: number; isPeak: (at: Date) => boolean };
  source: string;
}

export interface Arm {
  id: string;
  vendor: Vendor;
  model: string;
  /** 비우면 제품 기본(모든 공급자 16000) */
  maxOutputTokens?: number;
  /** 사진을 받을 수 있나 — 받지 못하는 팔은 이미지 작업에서 건너뛴다 */
  vision: boolean;
  /** 제품에서 지금 이 작업에 쓰는 팔인가(표에 «현역» 표시) */
  note?: string;
  price: Price;
  /**
   * 대체 경로: 이 팔의 답이 비거나 잘리거나 형식이 깨지면 그 문항만 `fallback` 팔로 다시 부른다.
   * 시간 · 비용은 두 호출의 합으로 센다.
   */
  fallback?: string;
}

/** 딥시크 혼잡 시간 — 월~금 UTC 01:00–04:00 · 06:00–10:00(중국 공휴일 제외 — 여기서는 무시해 비싸게 센다) */
export const deepseekPeak = (at: Date) => {
  const day = at.getUTCDay();
  if (day === 0 || day === 6) return false;
  const h = at.getUTCHours();
  return (h >= 1 && h < 4) || (h >= 6 && h < 10);
};

const DEEPSEEK_SOURCE =
  "https://api-docs.deepseek.com/quick_start/pricing (2026-10-19 열람, 비혼잡 단가 · 혼잡 2배)";

export const ARMS: Record<string, Arm> = {
  "deepseek-v4-pro": {
    id: "deepseek-v4-pro",
    vendor: "deepseek",
    model: "deepseek-v4-pro",
    vision: false,
    note: "현역: 해설 기본(studio-ai routing «solution»)",
    price: {
      input: 0.66,
      cachedInput: 0.022,
      output: 1.98,
      peak: { multiplier: 2, isPeak: deepseekPeak },
      source: DEEPSEEK_SOURCE,
    },
  },
  "deepseek-flash": {
    id: "deepseek-flash",
    vendor: "deepseek",
    model: "deepseek-flash",
    vision: true,
    note: "후보: DeepSeek-V4.1-Flash(-1017) · 제품 설정 그대로(16000)",
    price: {
      input: 0.15,
      cachedInput: 0.003,
      output: 0.6,
      peak: { multiplier: 2, isPeak: deepseekPeak },
      source: DEEPSEEK_SOURCE,
    },
  },
  "deepseek-flash@16k": {
    id: "deepseek-flash@16k",
    vendor: "deepseek",
    model: "deepseek-flash",
    maxOutputTokens: 16000,
    vision: true,
    note: "후보: flash · 출력 한도 16000",
    price: {
      input: 0.15,
      cachedInput: 0.003,
      output: 0.6,
      peak: { multiplier: 2, isPeak: deepseekPeak },
      source: DEEPSEEK_SOURCE,
    },
  },
  "deepseek-v4-pro@16k": {
    id: "deepseek-v4-pro@16k",
    vendor: "deepseek",
    model: "deepseek-v4-pro",
    maxOutputTokens: 16000,
    vision: false,
    note: "비교 기준: v4-pro · 출력 한도 16000",
    price: {
      input: 0.66,
      cachedInput: 0.022,
      output: 1.98,
      peak: { multiplier: 2, isPeak: deepseekPeak },
      source: DEEPSEEK_SOURCE,
    },
  },
  "flash→v4-pro": {
    id: "flash→v4-pro",
    vendor: "deepseek",
    model: "deepseek-flash",
    vision: false,
    note: "후보 경로: flash 먼저, 답이 비거나 잘리면 그 문항만 v4-pro",
    fallback: "deepseek-v4-pro",
    price: {
      input: 0.15,
      cachedInput: 0.003,
      output: 0.6,
      peak: { multiplier: 2, isPeak: deepseekPeak },
      source: DEEPSEEK_SOURCE,
    },
  },
  "gpt-5.5": {
    id: "gpt-5.5",
    vendor: "openai",
    model: "gpt-5.5",
    vision: true,
    note: "작업실에서 고를 수 있는 OpenAI 첫 모델",
    price: {
      input: 5,
      cachedInput: 0.5,
      output: 30,
      source:
        "https://developers.openai.com/api/docs/pricing (제3자 집계 morphllm.com/openai-api-pricing 로 대조, 2026-10-19)",
    },
  },
  "gemini-3.8-flash": {
    id: "gemini-3.8-flash",
    vendor: "gemini",
    model: "gemini-3.8-flash",
    vision: true,
    note: "현역: 문항 인식 · 그림 영역 · 도형 · 영어 사진 읽기 기본",
    price: {
      input: 0.75,
      cachedInput: 0.75,
      output: 3.75,
      source:
        "Google 소개 단가(2026-12-31까지) — 제3자 집계 eesel.ai/blog/gemini-3-8-flash-pricing · 2027-01-01부터 1.5/7.5",
    },
  },
  "gemini-3.8-flash@agy": {
    id: "gemini-3.8-flash@agy",
    vendor: "agy",
    model: "gemini-3.8-flash-low",
    vision: true,
    note: "현역 모델(Gemini 3.8 Flash LOW)을 구독 CLI 로 — API 키 없을 때의 대리 측정. 시간은 에이전트 왕복이 섞여 API 보다 길다",
    price: { input: 0, cachedInput: 0, output: 0, source: "구독 CLI(agy) — 건당 요금 없음" },
  },
  "claude-opus-5-5": {
    id: "claude-opus-5-5",
    vendor: "anthropic",
    model: "claude-opus-5-5",
    vision: true,
    note: "영어 사진 읽기 대안(ENGLISH_READ_VENDOR=anthropic)",
    price: {
      input: 4,
      cachedInput: 4,
      output: 20,
      source: "docs/planning/25-english-studio.md §13.9 (2026-10-06 가격표)",
    },
  },
};

export function armById(id: string): Arm {
  const arm = ARMS[id];
  if (!arm) throw new Error(`모르는 팔: ${id} — arms.ts 의 ${Object.keys(ARMS).join(", ")}`);
  return arm;
}

/** 공급자별 서버 키 이름 — 제품(`API_KEY_NAMES`)과 같다 */
export const KEY_NAMES: Record<Vendor, string> = {
  deepseek: "DEEPSEEK_API_KEY",
  openai: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  agy: "",
};
