/**
 * 오늘의 영어 — 사진 자료에서 글 읽기 (D-158 · 25 §13.8). 서버 전용.
 *
 * 사진(png · jpg) 한 장을 사진을 보는 모델에 보내 인쇄된 글자를 옮겨 받는다. **저장하지 않는다** — 읽은 글은 선생님이
 * 사진과 견주어 고친 뒤 글 자료로 저장한다(자료 POST). 그래서 여기서는 «옮긴 글» 하나만 돌려준다.
 *
 * 모델 호출은 작업실의 배관(`src/lib/studio-ai/api.ts` `runModelApi`)을 쓴다 — 키 · 고정 주소 · 재시도 · 오류 기록이
 * 거기 있다. 🔴 작업실의 **라우트**(`/api/studio/ai`)나 메뉴 권한은 쓰지 않는다(영어 계정은 `studio` 메뉴가 없다 ·
 * 자료 개선 계획 §A-4). 수학 문항 인식 작업(`page-ocr`)의 프롬프트도 쓰지 않는다 — 영어 글의 전사는 다른 일이다.
 *
 * 읽는 모델: 사진을 보는 키 가운데 Gemini → OpenAI → Claude 차례. `ENGLISH_READ_VENDOR` 로 코드 없이 고른다
 * (`STUDIO_AI_FIGURE_VENDOR` 와 같은 결). DeepSeek 는 사진을 못 본다. 모델은 읽기를 잰 것이 기본이고(`READ_MODELS` 의
 * 첫째 — Gemini 3.8 Flash · Opus 5.5), `ENGLISH_READ_MODEL` 로 그 제공자의 목록 안에서 바꾼다. 작업실의 모델 설정
 * (`STUDIO_AI_{VENDOR}_MODEL`)은 읽기를 바꾸지 않는다 — 문항 인식의 모델을 바꿨다고 영어 읽기가 조용히 달라지지 않게.
 *
 * 2026-10-06 구독 CLI 로 잰 것(25 §13.9 · 사진 11장을 조합마다 서른 번 남짓): 흠 없이 옮긴 쪽이 **Opus 5.5 는 99번 중 98번**,
 * Gemini 3.8 Flash 88%(대조를 붙여) · Sonnet 5.5 73 ~ 82% · Opus 5 70% · Sonnet 4.6 50% · Haiku 4.5 는 열한 번을 다 틀렸다.
 * 가장 덜 틀리는 것은 Opus 5.5 다 — `ENGLISH_READ_VENDOR=anthropic` 하나로 그리로 간다(값은 Gemini 의 스무 배쯤이고,
 * 운영 API 로는 아직 부르지 않았다 — 바꾸기 전에 한 장 읽혀 본다).
 */
import "server-only";

import { ENGLISH_MATERIAL_CONTENT_MAX } from "@/contracts/english.contract";
import {
  buildEnglishReadPrompt,
  buildEnglishReadVerifyPrompt,
} from "@/lib/ai/prompts/englishRead";
import { runModelApi } from "@/lib/studio-ai/api";
import {
  API_KEY_NAMES,
  API_MODELS,
  type ApiVendor,
} from "@/lib/studio-ai/routing";

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

/**
 * 읽기에 쓸 수 있는 모델 — 첫째가 기본이다. 작업실의 목록에, 읽기를 잰 Claude 5.5 둘을 더했다(작업실 목록에는 없다).
 * Gemini 3.8 Flash 는 배관이 생각 강도 LOW 로 부른다(`routing.ts` `geminiSampling`) — 잰 것도 Low 다.
 */
const READ_MODELS: Record<(typeof READ_VENDORS)[number], readonly string[]> = {
  gemini: API_MODELS.gemini,
  openai: API_MODELS.openai,
  anthropic: ["claude-opus-5-5", "claude-sonnet-5-5", ...API_MODELS.anthropic],
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
  const vendor = chosen
    ? READ_VENDORS.find((item) => item === chosen)
    : READ_VENDORS.find((item) => env[API_KEY_NAMES[item]]?.trim());
  if (!vendor || !env[API_KEY_NAMES[vendor]]?.trim())
    throw new EnglishReadConfigError();
  const model = env.ENGLISH_READ_MODEL?.trim() || READ_MODELS[vendor][0]!;
  // 그 제공자의 목록에 있는 이름만 — 틀린 이름으로 모델을 부르지 않는다
  if (!READ_MODELS[vendor].includes(model)) throw new EnglishReadConfigError();
  return { vendor, model };
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
  const chosen = env.ENGLISH_READ_VERIFY?.trim().toLowerCase();
  if (chosen && ["off", "0", "false", "no"].includes(chosen)) return false;
  if (chosen && ["on", "1", "true", "yes"].includes(chosen)) return true;
  return vendor === "gemini";
}

/** 대조 호출의 시간 한도 — 처음 읽기가 길었어도 요청 전체가 라우트의 제한(`maxDuration`)을 넘지 않게 */
const VERIFY_BUDGET_MS = 60_000;

/**
 * 대조한 글을 믿을 것인가 — 비었거나 처음 글의 절반도 안 되면 «고칠 곳이 없습니다» 같은 말이거나 잘린 글이다.
 * 손글씨를 걷어 짧아지는 것은 정상이라 문턱을 낮게 둔다.
 */
const acceptVerified = (first: string, second: string) =>
  second.length > 0 && second.length >= first.length * 0.5;

/** 모델이 낸 글 다듬기 — 코드펜스 걷기 · 줄끝 맞추기 · 빈 줄 하나로 접기 · 자료 지문 상한에서 자르기 */
export function cleanEnglishReadText(raw: string): string {
  const text = raw
    .replace(/\r\n?/g, "\n")
    .trim()
    // 여는 펜스 — 백틱과, 그 줄에 언어 이름만 있으면 그 줄까지. 글이 붙어 있으면 글은 남긴다(첫 줄을 잃지 않게)
    .replace(/^`{3,}(?:[A-Za-z]+[ \t]*\n)?/, "")
    .replace(/\n?`{3,}[ \t]*$/, "")
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
}

export async function readEnglishPhoto(
  photo: { mimeType: string; bytes: Uint8Array },
  { signal, env = process.env, run = runModelApi }: ReadEnglishPhotoOptions,
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
  const tuning = effort ? { effort } : {};
  // 시험지 한 쪽을 통째로 옮긴다 — 기본 한도(16,000)면 넉넉하다. 잘리면 배관이 «잘렸다»고 던진다
  const first = cleanEnglishReadText(
    await run({
      vendor,
      model,
      prompt: buildEnglishReadPrompt(),
      imageDataUrl,
      signal,
      ...tuning,
    }),
  );
  if (!first) throw new EnglishReadEmptyError();
  if (!resolveEnglishReadVerify(env, vendor)) return first;
  try {
    const second = cleanEnglishReadText(
      await run({
        vendor,
        model,
        prompt: buildEnglishReadVerifyPrompt(first),
        imageDataUrl,
        signal: AbortSignal.any([
          signal,
          AbortSignal.timeout(VERIFY_BUDGET_MS),
        ]),
        ...tuning,
      }),
    );
    return acceptVerified(first, second) ? second : first;
  } catch (error) {
    // 화면이 끊은 요청은 그대로 올린다. 그 밖의 실패(상류 오류 · 대조의 시간 한도)는 읽기를 실패로 만들지 않는다 —
    // 처음 읽은 글은 이미 있다
    if (signal.aborted) throw error;
    return first;
  }
}
