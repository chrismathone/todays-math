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
 * (`STUDIO_AI_FIGURE_VENDOR` 와 같은 결). DeepSeek 는 사진을 못 본다. 모델 이름은 작업실과 같은 설정을 따른다.
 */
import "server-only";

import { ENGLISH_MATERIAL_CONTENT_MAX } from "@/contracts/english.contract";
import { buildEnglishReadPrompt } from "@/lib/ai/prompts/englishRead";
import { runModelApi } from "@/lib/studio-ai/api";
import {
  API_KEY_NAMES,
  resolveApiModel,
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

/** 글을 읽을 수 있는 자료 — 사진뿐이다(PDF · DOCX 는 보관용) */
export const ENGLISH_READABLE_MIME = ["image/png", "image/jpeg"] as const;

const READ_VENDORS: readonly ApiVendor[] = ["gemini", "openai", "anthropic"];

type Env = Record<string, string | undefined>;

export function resolveEnglishReadModel(env: Env = process.env): {
  vendor: ApiVendor;
  model: string;
} {
  const chosen = env.ENGLISH_READ_VENDOR?.trim();
  const vendor = chosen
    ? READ_VENDORS.find((item) => item === chosen)
    : READ_VENDORS.find((item) => env[API_KEY_NAMES[item]]?.trim());
  if (!vendor || !env[API_KEY_NAMES[vendor]]?.trim())
    throw new EnglishReadConfigError();
  try {
    // 모델 이름은 작업실의 문항 인식과 같은 설정(`STUDIO_AI_{VENDOR}_MODEL` · 없으면 그 제공자의 기본)을 따른다
    return resolveApiModel(vendor, "page-ocr", env as NodeJS.ProcessEnv);
  } catch {
    throw new EnglishReadConfigError();
  }
}

/** 모델이 낸 글 다듬기 — 코드펜스 걷기 · 줄끝 맞추기 · 빈 줄 하나로 접기 · 자료 지문 상한에서 자르기 */
export function cleanEnglishReadText(raw: string): string {
  const text = raw
    .replace(/\r\n?/g, "\n")
    .trim()
    .replace(/^```[^\n]*\n?/, "")
    .replace(/\n?```$/, "")
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
  const { vendor, model } = resolveEnglishReadModel(env);
  const raw = await run({
    vendor,
    model,
    prompt: buildEnglishReadPrompt(),
    imageDataUrl: `data:${photo.mimeType};base64,${Buffer.from(photo.bytes).toString("base64")}`,
    signal,
    // 시험지 한 쪽을 통째로 옮긴다 — 기본 한도(16,000)면 넉넉하다. 잘리면 배관이 «잘렸다»고 던진다
  });
  const text = cleanEnglishReadText(raw);
  if (!text) throw new EnglishReadEmptyError();
  return text;
}
