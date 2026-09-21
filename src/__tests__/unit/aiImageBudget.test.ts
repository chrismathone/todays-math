import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * 트랙 39 (2026-09-21) — 작업실이 쪽 그림을 긴 변 2200px PNG 로 보내 운영이 413 을 냈다.
 * 원장님 PDF(경신중 23-2 기말 중2, 5쪽)를 크롬에서 같은 규칙으로 렌더해 잰 값이 아래 «실측 밀도»다:
 * PNG data URL 4,767,858~5,094,934자(전부 Vercel 본문 상한 4.5MB 초과) · WebP q0.92 616,347~876,527자.
 * 시험은 **만든 문자열의 실제 길이**를 잰다 — «WebP 로 바꿨다»만 보면 도장이 된다.
 */
vi.mock("@/components/unified/aiImageSurface", () => ({
  decodeAiImageSurface: vi.fn(),
}));
import { decodeAiImageSurface } from "@/components/unified/aiImageSurface";
import {
  AI_IMAGE_BUDGET,
  AI_IMAGE_TOO_LARGE,
  fitAiImage,
  fitAiImageDataUrl,
  type AiImageSurface,
} from "@/components/unified/aiImageBudget";

// 5쪽(2200×1553 = 3,416,600px)을 크롬으로 잰 data URL 글자 수 ÷ 화소 수.
const MEASURED: Record<string, number> = {
  "image/png": 4970414 / 3416600,
  "image/webp@0.92": 756023 / 3416600,
  "image/webp@0.85": 444079 / 3416600,
  "image/jpeg@0.92": 1025000 / 3416600,
  "image/jpeg@0.85": 727000 / 3416600,
};

/** 실측 밀도로 길이가 정해지는 가짜 캔버스. `webp: false` 는 WebP 인코딩이 없는 브라우저(사파리). */
function surface(
  width: number,
  height: number,
  { density = 1, webp = true } = {},
) {
  const calls: { scale: number; type: string; quality?: number }[] = [];
  const value: AiImageSurface = {
    width,
    height,
    encode(scale, type, quality) {
      calls.push({ scale, type, quality });
      // WebP 를 못 만드는 브라우저는 조용히 PNG 를 돌려준다(toDataURL 의 규칙)
      const actual = type === "image/webp" && !webp ? "image/png" : type;
      const key =
        actual === "image/png" ? actual : `${actual}@${quality?.toFixed(2)}`;
      const perPixel = MEASURED[key];
      if (perPixel === undefined) throw new Error(`표에 없는 인코딩 ${key}`);
      const pixels = Math.round(width * scale) * Math.round(height * scale);
      const prefix = `data:${actual};base64,`;
      return prefix + "A".repeat(Math.round(pixels * perPixel * density));
    },
  };
  return { value, calls };
}

afterEach(() => vi.clearAllMocks());

describe("AI 로 보내는 그림 — 예산 안으로 줄이기", () => {
  it("예산은 Vercel 본문 상한 4.5MB 보다 넉넉히 낮다", () => {
    expect(AI_IMAGE_BUDGET).toBeLessThanOrEqual(3_000_000);
  });

  it("빽빽한 스캔 쪽(2200×1553)은 해상도를 지키고 WebP 로 예산 안에 든다", () => {
    const { value } = surface(2200, 1553);
    const png = value.encode(1, "image/png");
    expect(png.length).toBeGreaterThan(4_500_000); // 지금 보내는 것 — 413
    const fit = fitAiImage(value);
    expect(fit.dataUrl.length).toBeLessThanOrEqual(AI_IMAGE_BUDGET);
    expect(fit.dataUrl.length).toBeLessThan(png.length / 4);
    expect(fit.dataUrl.startsWith("data:image/webp;base64,")).toBe(true);
    expect(fit.reducedTo).toBeUndefined();
  });

  it("WebP 를 못 만드는 브라우저는 PNG 를 다시 보내지 않고 JPEG 로 넘어간다", () => {
    const { value } = surface(2200, 1553, { webp: false });
    const fit = fitAiImage(value);
    expect(fit.dataUrl.startsWith("data:image/jpeg;base64,")).toBe(true);
    expect(fit.dataUrl.length).toBeLessThanOrEqual(AI_IMAGE_BUDGET);
    expect(fit.reducedTo).toBeUndefined();
  });

  it("품질로 안 되면 마지막에 해상도를 줄이고, 줄인 긴 변을 알린다", () => {
    // 휴대폰 사진(4032×3024)에 스캔 잡티가 네 배 — 품질만으로는 예산을 못 맞춘다
    const { value, calls } = surface(4032, 3024, { density: 4 });
    const fit = fitAiImage(value);
    expect(fit.dataUrl.length).toBeLessThanOrEqual(AI_IMAGE_BUDGET);
    expect(fit.reducedTo).toBeLessThan(4032);
    expect(fit.reducedTo).toBeGreaterThanOrEqual(1000);
    // 축소는 품질 두 단계를 다 써 본 뒤에만
    const firstReduced = calls.findIndex((call) => call.scale < 1);
    expect(
      calls
        .slice(0, firstReduced)
        .map((call) => `${call.type}@${call.quality}`),
    ).toEqual(["image/webp@0.92", "image/webp@0.85"]);
  });

  it("아무리 줄여도 안 들어가면 사람 말로 멈춘다", () => {
    const { value } = surface(2200, 1553, { density: 200 });
    expect(() => fitAiImage(value)).toThrow(AI_IMAGE_TOO_LARGE);
    expect(AI_IMAGE_TOO_LARGE).not.toMatch(/JSON|token|Unexpected/i);
  });

  it("예산 안의 그림은 풀지도 않고 그대로 보낸다(무손실 PNG 유지)", async () => {
    const small = "data:image/png;base64," + "A".repeat(1000);
    expect(await fitAiImageDataUrl(small)).toEqual({ dataUrl: small });
    expect(decodeAiImageSurface).not.toHaveBeenCalled();
  });

  it("예산을 넘는 그림은 풀어서 다시 인코딩한다", async () => {
    const { value } = surface(2200, 1553);
    vi.mocked(decodeAiImageSurface).mockResolvedValue(value);
    const big = value.encode(1, "image/png");
    const fit = await fitAiImageDataUrl(big);
    expect(decodeAiImageSurface).toHaveBeenCalledWith(big, undefined);
    expect(fit.dataUrl.length).toBeLessThanOrEqual(AI_IMAGE_BUDGET);
  });

  it("더 좁은 예산을 주면 거기에 맞춘다(413 뒤 다시 보낼 때)", async () => {
    const { value } = surface(2200, 1553);
    vi.mocked(decodeAiImageSurface).mockResolvedValue(value);
    const big = value.encode(1, "image/png");
    const fit = await fitAiImageDataUrl(big, 400_000);
    expect(fit.dataUrl.length).toBeLessThanOrEqual(400_000);
  });
});
