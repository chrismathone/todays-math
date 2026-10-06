/**
 * 오늘의 영어 — 사진 자료에서 글 읽기 (D-158 · 25 §13.8 ~ §13.10). 서버 전용.
 *
 * 사진(png · jpg) 한 장을 사진을 보는 모델에 보내 인쇄된 글자를 옮겨 받는다. **저장하지 않는다** — 읽은 글은 선생님이
 * 사진과 견주어 고친 뒤 글 자료로 저장한다(자료 POST). 그래서 여기서는 «옮긴 글» 하나만 돌려준다.
 *
 * 모델 호출은 작업실의 배관(`src/lib/studio-ai/api.ts` `runModelApi`)을 쓴다 — 키 · 고정 주소 · 재시도 · 오류 기록이
 * 거기 있다. 🔴 작업실의 **라우트**(`/api/studio/ai`)나 메뉴 권한은 쓰지 않는다(영어 계정은 `studio` 메뉴가 없다 ·
 * 자료 개선 계획 §A-4). 수학 문항 인식 작업(`page-ocr`)의 프롬프트도 쓰지 않는다 — 영어 글의 전사는 다른 일이다.
 *
 * **읽는 길**(기본 — Gemini 3.8 Flash · 원장님 2026-10-06 «gemini 3.8 flash 로 하고 강력한 후보정으로 추측 보정»):
 *
 *     읽기 A ──→ 대조(A 를 같은 사진과 다시 맞춰 본다) ─┐
 *     읽기 B(따로 한 번 더 · A 와 나란히) ────────────┴→ 빈칸 맞추기 → 추측 보정 → 글
 *
 * 모델 호출은 셋이고(읽기 둘은 나란히 나간다), 뒤의 둘은 결정적 후보정이다(`readRefine.ts` — 모델을 부르지 않는다).
 * 대조나 따로 읽기가 실패해도 읽기는 성공이다 — 처음 읽은 글로 간다.
 * 구독 CLI 로 받아 둔 글로 잰 것(§13.10): 한 번 읽기 79% → 이 길 92%(흠 없이 옮긴 쪽), 큰 흠은 쪽당 0.42 → 0.08.
 *
 * 읽는 모델: 사진을 보는 키 가운데 Gemini → OpenAI → Claude 차례. `ENGLISH_READ_VENDOR` 로 코드 없이 고른다
 * (`STUDIO_AI_FIGURE_VENDOR` 와 같은 결). DeepSeek 는 사진을 못 본다. 모델은 읽기를 잰 것이 기본이고(`READ_MODELS` 의 첫째),
 * `ENGLISH_READ_MODEL` 로 그 제공자의 목록 안에서 바꾼다. 작업실의 모델 설정(`STUDIO_AI_{VENDOR}_MODEL`)은 읽기를
 * 바꾸지 않는다 — 문항 인식의 모델을 바꿨다고 영어 읽기가 조용히 달라지지 않게.
 * 잰 것(§13.9 — 흠 없이 옮긴 쪽): Opus 5.5 98/99 · Gemini 3.8 Flash 88%(대조까지) · Sonnet 5.5 73 ~ 82% · Opus 5 70% ·
 * Sonnet 4.6 50% · Haiku 4.5 0/11. 원장님이 Opus 는 «너무 비싸 · 과하다»고 하셨다 — 기본은 Gemini 다.
 * 🔴 전부 구독 CLI 로 잰 것이다. 운영 API 로는 아직 부르지 않았다.
 */
import "server-only";

import { ENGLISH_MATERIAL_CONTENT_MAX } from "@/contracts/english.contract";
import {
  buildEnglishReadPrompt,
  buildEnglishReadVerifyPrompt,
} from "@/lib/ai/prompts/englishRead";
import { runModelApi } from "@/lib/studio-ai/api";
import { StudioApiError } from "@/lib/studio-ai/errors";
import {
  API_KEY_NAMES,
  API_MODELS,
  type ApiVendor,
} from "@/lib/studio-ai/routing";

import { polishEnglishReadText, reconcileEnglishBlanks } from "./readRefine";

/** 사진을 보는 모델의 키가 없거나 설정이 틀렸다 — 503 */
export class EnglishReadConfigError extends Error {
  constructor() {
    super("AI 연결이 설정되지 않았습니다.");
    this.name = "EnglishReadConfigError";
  }
}

/** 모델이 글을 하나도 내지 않았다 — 빈 지문을 만들지 않는다. 502 */
export class EnglishReadEmptyError extends Error {
  constructor() {
    super("사진에서 읽은 글이 없습니다.");
    this.name = "EnglishReadEmptyError";
  }
}

/** 올린 파일이 사진이 아니다 — 이름만 png · jpg 인 파일. 400 */
export class EnglishReadNotPhotoError extends Error {
  constructor() {
    super("사진 자료만 글을 읽을 수 있습니다.");
    this.name = "EnglishReadNotPhotoError";
  }
}

/** 글을 읽을 수 있는 자료 — 사진뿐이다(PDF · DOCX 는 보관용) */
export const ENGLISH_READABLE_MIME = ["image/png", "image/jpeg"] as const;

/** 파일 머리 바이트 — 올릴 때는 이름의 확장자로 형을 정하므로(`routeSupport.ts`), 모델로 보내기 전에 바이트로 한 번 더 본다 */
const PHOTO_MAGIC: Record<(typeof ENGLISH_READABLE_MIME)[number], number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/jpeg": [0xff, 0xd8, 0xff],
};

export function isReadablePhoto(photo: {
  mimeType: string;
  bytes: Uint8Array;
}): boolean {
  const magic = (PHOTO_MAGIC as Record<string, number[] | undefined>)[
    photo.mimeType
  ];
  return (
    magic !== undefined &&
    photo.bytes.length >= magic.length &&
    magic.every((byte, index) => photo.bytes[index] === byte)
  );
}

const READ_VENDORS = ["gemini", "openai", "anthropic"] as const;
type ReadVendor = (typeof READ_VENDORS)[number];

/**
 * 읽기에 쓸 수 있는 모델 — 첫째가 기본이다.
 * Gemini · OpenAI 는 작업실의 목록 그대로다(Gemini 3.8 Flash 는 배관이 생각 강도 LOW 로 부른다 — 잰 것도 Low 다).
 * Claude 는 **읽기를 재서 쓸 만했던 것만** 둔다 — 작업실 목록의 Haiku 4.5 는 열한 장을 다 틀렸고, Opus 4.7 은 재지 않았다.
 */
const READ_MODELS: Record<ReadVendor, readonly string[]> = {
  gemini: API_MODELS.gemini,
  openai: API_MODELS.openai,
  anthropic: [
    "claude-opus-5-5",
    "claude-sonnet-5-5",
    "claude-opus-5",
    "claude-sonnet-4-6",
  ],
};

/**
 * Claude 5.5 는 생각이 늘 켜져 있고 강도(`output_config.effort`)로 조절한다 — 잰 설정 그대로 **low** 로 부른다
 * (Opus 5.5 는 low 로 66번을 다 흠 없이 옮겼고 한 장 10 ~ 13초였다). 그 밖의 모델은 배관의 기본을 따른다.
 */
const readEffort = (model: string) =>
  /^claude-(opus|sonnet)-5-5$/.test(model) ? ("low" as const) : undefined;

type Env = Record<string, string | undefined>;

export function resolveEnglishReadModel(env: Env = process.env): {
  vendor: ApiVendor;
  model: string;
} {
  const chosen = env.ENGLISH_READ_VENDOR?.trim().toLowerCase();
  const named = env.ENGLISH_READ_MODEL?.trim();
  const vendor = chosen
    ? READ_VENDORS.find((item) => item === chosen)
    : named
      ? // 모델만 적었으면 그 모델의 제공자 — 제공자 변수를 빠뜨렸다고 전부 503 이 되지 않게
        READ_VENDORS.find((item) => READ_MODELS[item].includes(named))
      : READ_VENDORS.find((item) => env[API_KEY_NAMES[item]]?.trim());
  if (!vendor || !env[API_KEY_NAMES[vendor]]?.trim())
    throw new EnglishReadConfigError();
  const model = named || READ_MODELS[vendor][0]!;
  // 그 제공자의 목록에 있는 이름만 — 틀린 이름으로 모델을 부르지 않는다
  if (!READ_MODELS[vendor].includes(model)) throw new EnglishReadConfigError();
  return { vendor, model };
}

/** 운영 변수의 켬 · 끔 — 알아볼 수 없는 값은 기본을 따른다 */
function toggle(value: string | undefined, fallback: boolean) {
  const chosen = value?.trim().toLowerCase();
  if (chosen && ["off", "0", "false", "no"].includes(chosen)) return false;
  if (chosen && ["on", "1", "true", "yes"].includes(chosen)) return true;
  return fallback;
}

/**
 * 읽은 글을 사진과 한 번 더 대조할 것인가 — `ENGLISH_READ_VERIFY`(on · off)가 있으면 그것, 없으면 **잰 대로**다(25 §13.9):
 * Gemini 3.8 Flash 는 켬 — 대조를 붙이자 흠 없이 옮긴 쪽이 73% → 88%, 큰 흠이 19 → 8 곳이 됐다(33번 읽기).
 * 다른 제공자는 끔 — Sonnet 5.5 는 좋아졌다 나빠졌다 해 차이를 말할 수 없었고, Opus 5.5 는 한 번으로 다 맞혔다(값만 두 배).
 */
export function resolveEnglishReadVerify(
  env: Env = process.env,
  vendor: ApiVendor = "gemini",
): boolean {
  return toggle(env.ENGLISH_READ_VERIFY, vendor === "gemini");
}

/**
 * 같은 사진을 **따로 한 번 더** 읽어 빈칸 자리를 맞출 것인가 — `ENGLISH_READ_TWICE`(on · off), 없으면 Gemini 일 때만 켬.
 * Gemini 의 읽기는 틀리는 자리가 회차마다 달랐다(빈칸 앞 글자). 대조는 처음 읽은 글에 끌려가 그 자리를 못 고쳤고
 * (세 번에 세 번 그대로), 따로 읽은 글과 맞추면 고쳐졌다(§13.10). 다른 제공자는 재지 않아 끈다.
 */
export function resolveEnglishReadTwice(
  env: Env = process.env,
  vendor: ApiVendor = "gemini",
): boolean {
  return toggle(env.ENGLISH_READ_TWICE, vendor === "gemini");
}

/** 대조 호출의 시간 한도 — 처음 읽기가 길었어도 요청 전체가 라우트의 제한(`maxDuration`)을 넘지 않게 */
const VERIFY_BUDGET_MS = 60_000;

const wordsOf = (text: string) => text.split(/\s+/).filter(Boolean);

/**
 * 대조한 글을 믿을 것인가 — **같은 사진의 글로 보일 때만** 받는다. 모델은 가끔 «고칠 곳이 없습니다» 같은 말을 하거나,
 * 지시문을 되뱉거나, 딴 글을 낸다(검토 2026-10-06 — 길이만 보면 짧은 글에서 그 말이 지문이 된다).
 *   - 지시문의 표지([지시문] · [옮긴 글])가 들어 있으면 되뱉은 것이다
 *   - 길이는 처음 글의 절반 ~ 두 배 남짓(손글씨를 걷어 짧아지고, 빠뜨린 줄을 채워 길어진다)
 *   - 낱말이 대부분 겹친다 — 짧은 쪽 낱말의 열에 여섯은 다른 쪽에도 있다
 */
function acceptVerified(first: string, second: string) {
  if (!second || /\[지시문\]|\[옮긴 글\]/.test(second)) return false;
  if (second.length < first.length * 0.5) return false;
  if (second.length > first.length * 2 + 200) return false;
  const a = new Set(wordsOf(first));
  const b = new Set(wordsOf(second));
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let shared = 0;
  for (const word of small) if (large.has(word)) shared++;
  return small.size > 0 && shared / small.size >= 0.6;
}

/** AI 쪽 실패(상류 오류 · 시간 한도)인가 — 그 밖은 우리 쪽 결함이라 덮지 않는다 */
const isModelFailure = (error: unknown) =>
  error instanceof StudioApiError ||
  (error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError"));

/** 덧붙인 호출(대조 · 따로 읽기)이 실패했다 — 읽기는 성공이라 오류 기록에 안 남는다. 서버 기록에 한 줄 남긴다 */
function warnSkipped(step: string, error: unknown) {
  console.warn(
    `[english-read] ${step} 실패 — 처음 읽은 글로 갑니다:`,
    error instanceof Error ? `${error.name}: ${error.message}` : String(error),
  );
}

/**
 * 모델이 낸 글 다듬기 — 코드펜스 걷기 · 줄끝 맞추기 · 빈 줄 하나로 접기 · 자료 지문 상한에서 자르기.
 * 여는 펜스 줄에서는 **아는 언어 이름만** 걷는다(첫 줄이 낱말 하나인 글 «Vocabulary»를 언어 이름으로 알고 버리지 않게).
 * 닫는 펜스 뒤에 붙은 설명은 버린다.
 */
export function cleanEnglishReadText(raw: string): string {
  let text = raw.replace(/\r\n?/g, "\n").trim();
  if (/^`{3,}/.test(text)) {
    text = text.replace(
      /^`{3,}(?:(?:text|txt|plaintext|plain|markdown|md)[ \t]*(?=\n|$))?/i,
      "",
    );
    const close = text.search(/(?:^|\n)`{3,}/);
    if (close >= 0) text = text.slice(0, close);
  } else text = text.replace(/\n`{3,}[ \t]*$/, "");
  text = text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const cut = text.slice(0, ENGLISH_MATERIAL_CONTENT_MAX);
  // 서로게이트 쌍 가운데를 끊지 않는다(자료 POST 와 같은 결)
  const last = cut.charCodeAt(cut.length - 1);
  return last >= 0xd800 && last <= 0xdbff ? cut.slice(0, -1) : cut;
}

export interface ReadEnglishPhotoOptions {
  signal: AbortSignal;
  env?: Env;
  /** 모델 호출 — 시험이 대역을 넣는다 */
  run?: typeof runModelApi;
  /** 대조 호출의 시간 한도(ms) — 시험이 줄여 넣는다 */
  verifyBudgetMs?: number;
}

export async function readEnglishPhoto(
  photo: { mimeType: string; bytes: Uint8Array },
  {
    signal,
    env = process.env,
    run = runModelApi,
    verifyBudgetMs = VERIFY_BUDGET_MS,
  }: ReadEnglishPhotoOptions,
): Promise<string> {
  // 사진이 아니면 배관이 사진 없이 지시문만 보낸다(`api.ts` 의 data URL 판정) — 여기서 막는다
  if (!isReadablePhoto(photo)) throw new EnglishReadNotPhotoError();
  const { vendor, model } = resolveEnglishReadModel(env);
  // 바이트를 다시 베끼지 않는다(4MB 사진) — 같은 메모리를 보는 버퍼로 base64 만 만든다
  const base64 = Buffer.from(
    photo.bytes.buffer,
    photo.bytes.byteOffset,
    photo.bytes.byteLength,
  ).toString("base64");
  const imageDataUrl = `data:${photo.mimeType};base64,${base64}`;
  const effort = readEffort(model);
  // 시험지 한 쪽을 통째로 옮긴다 — 기본 한도(16,000)면 넉넉하다. 잘리면 배관이 «잘렸다»고 던진다
  const call = (prompt: string, callSignal: AbortSignal) =>
    run({
      vendor,
      model,
      prompt,
      imageDataUrl,
      signal: callSignal,
      ...(effort ? { effort } : {}),
    });

  const reading = call(buildEnglishReadPrompt(), signal);
  // 따로 읽기 — 처음 읽기와 나란히 띄운다(기다리는 시간이 늘지 않는다). 던지지 않는 약속으로 감싸 둔다:
  // 처음 읽기가 먼저 실패해 아무도 기다리지 않게 돼도 «처리 안 된 거절»이 남지 않게
  const companion = new AbortController();
  const other = resolveEnglishReadTwice(env, vendor)
    ? call(
        buildEnglishReadPrompt(),
        AbortSignal.any([signal, companion.signal]),
      ).then(
        (raw) => ({ text: cleanEnglishReadText(raw), error: null }),
        (error: unknown) => ({ text: "", error }),
      )
    : null;

  let text: string;
  try {
    text = cleanEnglishReadText(await reading);
    if (!text) throw new EnglishReadEmptyError();
  } catch (error) {
    // 받을 쪽이 없는 호출을 남기지 않는다
    companion.abort();
    throw error;
  }

  if (resolveEnglishReadVerify(env, vendor)) {
    try {
      const verified = cleanEnglishReadText(
        await call(
          buildEnglishReadVerifyPrompt(text),
          AbortSignal.any([signal, AbortSignal.timeout(verifyBudgetMs)]),
        ),
      );
      if (acceptVerified(text, verified)) text = verified;
    } catch (error) {
      // 화면이 끊은 요청 · 우리 쪽 결함은 그대로 올린다. AI 쪽 실패(상류 오류 · 대조의 시간 한도)는 읽기를 실패로
      // 만들지 않는다 — 처음 읽은 글은 이미 있다
      if (signal.aborted || !isModelFailure(error)) {
        companion.abort();
        throw error;
      }
      warnSkipped("대조", error);
    }
  }

  if (other) {
    const second = await other;
    if (signal.aborted) throw signal.reason;
    if (second.error) {
      if (!isModelFailure(second.error)) throw second.error;
      warnSkipped("따로 읽기", second.error);
    } else if (second.text) text = reconcileEnglishBlanks(text, second.text);
  }
  return polishEnglishReadText(text);
}
