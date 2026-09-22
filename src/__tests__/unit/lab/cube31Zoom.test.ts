import { describe, expect, it } from "vitest";
import { labZoom } from "@/lib/lab/cube31/zoom";

// 원장님 2026-09-22 «공간이 많으므로 글자를 적당히 크게 키우고 전체적으로 크기를 키워도 될것 같은데»
describe("labZoom — 큰 화면에서 랩실 전체를 키우는 배율", () => {
  it("설계 크기(1500×860)보다 큰 만큼 키운다 — 좁은 쪽을 따르고 소수 둘째 자리에서 내린다", () => {
    expect(labZoom(2560, 1283)).toBe(1.49);
    expect(labZoom(1920, 1080)).toBe(1.25);
    expect(labZoom(3000, 1000)).toBe(1.16);
    expect(labZoom(1920, 920)).toBe(1.06);
  });
  it("작은 화면은 키우지도 줄이지도 않는다 — 줄이는 것은 활동 칸이 맡는다", () => {
    expect(labZoom(1440, 900)).toBe(1);
    expect(labZoom(1366, 768)).toBe(1);
    expect(labZoom(390, 844)).toBe(1);
  });
  it("아주 큰 화면도 1.6배까지만", () => {
    expect(labZoom(3840, 2160)).toBe(1.6);
  });
  it("키운 뒤에도 쓸 수 있는 크기는 설계 크기 이상이다", () => {
    for (const [w, h] of [
      [2560, 1283],
      [1920, 1080],
      [1920, 920],
      [2560, 1440],
    ]) {
      const z = labZoom(w, h);
      expect(w / z).toBeGreaterThanOrEqual(1500 - 1);
      expect(h / z).toBeGreaterThanOrEqual(860 - 1);
    }
  });
});
