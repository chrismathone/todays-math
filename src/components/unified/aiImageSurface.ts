import type { AiImageSurface } from "./aiImageBudget";

/**
 * data URL 을 캔버스로 풀어 «배율·형식·품질을 받아 data URL 을 돌려주는» 표면으로 만든다.
 * 흰 바탕을 먼저 깐다 — JPEG 로 떨어지면 투명한 자리가 검게 칠해진다(AI 에게는 종이가 흰색이다).
 * 브라우저 전용(jsdom 에는 그림 해독이 없다) — 단위 시험은 이 모듈을 모킹하고, 실제 인코더는 e2e 가 잰다.
 */
export async function decodeAiImageSurface(
  dataUrl: string,
  signal?: AbortSignal,
): Promise<AiImageSurface> {
  const abort = () => {
    if (signal?.aborted) throw new DOMException("작업 취소", "AbortError");
  };
  abort();
  const image = new Image();
  image.src = dataUrl;
  try {
    await image.decode();
  } catch {
    abort();
    throw new Error("원본 그림을 읽지 못했습니다. 다시 시도해 주세요.");
  }
  abort();
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (!width || !height)
    throw new Error("원본 그림을 읽지 못했습니다. 다시 시도해 주세요.");
  return {
    width,
    height,
    encode(scale, type, quality) {
      abort();
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("그림을 줄일 수 없습니다.");
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL(type, quality);
    },
  };
}
