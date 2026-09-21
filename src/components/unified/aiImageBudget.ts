import {
  STUDIO_AI_IMAGE_BUDGET,
  STUDIO_AI_TOO_LARGE,
} from "@/lib/studio-ai/limits";
import { decodeAiImageSurface } from "./aiImageSurface";

/**
 * AI 로 보내는 그림을 본문 예산 안에 넣는다(트랙 39, 2026-09-21 — 운영 413 «Unexpected token 'R'»).
 *
 * 예산 안이면 **손대지 않는다**(무손실 PNG 그대로). 넘을 때만 아래 사다리를 한 칸씩 내려가며
 * **만든 문자열의 길이를 매번 다시 재고**, 들어가는 첫 칸에서 멈춘다.
 *   ① WebP q0.92 ② WebP q0.85 — 해상도 그대로 ③ 긴 변 ×0.8 ④ ×0.64 ⑤ ×0.5 (q0.85, 긴 변 1000px 아래로는 안 내린다)
 * 원장님 기출 PDF 5쪽을 크롬으로 잰 근거(보고서 `page-payload-413.md`):
 *   - PNG 4.77~5.09MB → WebP q0.92 0.62~0.88MB. 휘도 PSNR 44.0~44.6dB(무손실 대비), 1:1 로 눈에 안 갈린다.
 *   - 같은 길이의 JPEG 는 PSNR 39.9~40.6dB — WebP 가 4dB 낫다. 그래서 WebP 가 먼저다.
 *   - 긴 변 1800px 로 줄이면 WebP 여도 PSNR 30.4~31.4dB — 해상도가 가장 큰 손실이라 마지막 수단이다.
 * WebP 를 못 만드는 브라우저(사파리)는 `toDataURL('image/webp')` 가 **조용히 PNG** 를 돌려준다 —
 * 앞 글자로 판정해 JPEG 로 넘어간다.
 */
export const AI_IMAGE_BUDGET = STUDIO_AI_IMAGE_BUDGET;
export const AI_IMAGE_TOO_LARGE = STUDIO_AI_TOO_LARGE;
const MIN_LONG_SIDE = 1000;
const LADDER = [
  { scale: 1, quality: 0.92 },
  { scale: 1, quality: 0.85 },
  { scale: 0.8, quality: 0.85 },
  { scale: 0.64, quality: 0.85 },
  { scale: 0.5, quality: 0.85 },
];

export interface AiImageSurface {
  width: number;
  height: number;
  encode(scale: number, type: string, quality?: number): string;
}

export interface AiImageFit {
  dataUrl: string;
  /** 해상도까지 줄였을 때만 — 줄인 뒤의 긴 변(px). 사람에게 알리는 근거다. */
  reducedTo?: number;
}

export function fitAiImage(
  surface: AiImageSurface,
  budget = AI_IMAGE_BUDGET,
): AiImageFit {
  const longSide = Math.max(surface.width, surface.height);
  let type = "image/webp";
  for (const { scale, quality } of LADDER) {
    if (scale < 1 && Math.round(longSide * scale) < MIN_LONG_SIDE) break;
    let dataUrl = surface.encode(scale, type, quality);
    if (!dataUrl.startsWith(`data:${type};`)) {
      type = "image/jpeg";
      dataUrl = surface.encode(scale, type, quality);
    }
    if (dataUrl.length <= budget)
      return scale < 1
        ? { dataUrl, reducedTo: Math.round(longSide * scale) }
        : { dataUrl };
  }
  throw new Error(AI_IMAGE_TOO_LARGE);
}

export async function fitAiImageDataUrl(
  dataUrl: string,
  budget = AI_IMAGE_BUDGET,
  signal?: AbortSignal,
): Promise<AiImageFit> {
  if (dataUrl.length <= budget) return { dataUrl };
  return fitAiImage(await decodeAiImageSurface(dataUrl, signal), budget);
}

/** 해상도를 줄였을 때 결과 경고에 붙는 한 줄(D-08 — 간결·사무적). */
export const aiImageReducedWarning = (longSide: number) =>
  `그림이 커서 해상도를 줄여 보냈습니다(긴 변 ${longSide}px). 인식 결과를 확인해 주세요.`;
