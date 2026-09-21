import { afterEach, describe, expect, it, vi } from "vitest";
import { studioRotateCanvas } from "@/components/unified/studioAiHelpers";

/**
 * 트랙 39 (2026-09-21) — 쪽 회전은 두 벌이었다. 화면·AI 쪽 렌더(`StudioView` 의 `rotatePageCanvas`)는
 * 90°·270° 에서 폭·높이를 바꾸는데, 자동 회전 재인식(`useStudioAi.recognizePage` 의 `load`)은
 * `rotated.width = canvas.width` 로 **안 바꿨다** — 가로 2200×1553 을 90° 돌리면 잘린다.
 * 한 함수로 모은다.
 */
function context() {
  const ctx = {
    translate: vi.fn(),
    rotate: vi.fn(),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: "",
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D,
  );
  return ctx;
}
function page(width = 2200, height = 1553) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

afterEach(() => vi.restoreAllMocks());

describe("쪽 회전 — 한 함수", () => {
  it.each([90, 270, -90, 450])(
    "%i° 는 폭과 높이를 바꾸고 새 캔버스 한가운데를 축으로 돈다",
    (angle) => {
      const ctx = context();
      const rotated = studioRotateCanvas(page(), angle);
      expect([rotated.width, rotated.height]).toEqual([1553, 2200]);
      expect(ctx.translate).toHaveBeenCalledWith(1553 / 2, 2200 / 2);
      expect(ctx.drawImage).toHaveBeenCalledWith(
        expect.any(HTMLCanvasElement),
        -2200 / 2,
        -1553 / 2,
      );
    },
  );

  it("180° 는 크기를 그대로 둔다", () => {
    context();
    const rotated = studioRotateCanvas(page(), 180);
    expect([rotated.width, rotated.height]).toEqual([2200, 1553]);
  });

  it("0°·360° 는 원본 캔버스를 그대로 돌려준다", () => {
    const source = page();
    expect(studioRotateCanvas(source, 0)).toBe(source);
    expect(studioRotateCanvas(source, 360)).toBe(source);
  });
});
