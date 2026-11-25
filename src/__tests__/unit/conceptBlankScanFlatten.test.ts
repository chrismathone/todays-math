// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { ScanLayoutPage } from "@/contracts/conceptBlankScanIssued.contract";
import { scanRegistrationSchema } from "@/contracts/conceptBlankScanPhoto.contract";
import {
  flattenedScanRegistration,
  flattenedScanSize,
  warpScanPage,
} from "@/lib/concept-blank/scan/flatten";

// 원장님 2026-11-25 «네 모서리를 인식하고 자동으로 스캔처럼» — 맞춘 사진만 반듯한 A4 로 편다.
const layout = {
  part: "student",
  number: 1,
  width: 210,
  height: 297,
  markers: [
    { id: "tl", x: 6.5, y: 6.5 },
    { id: "tr", x: 203.5, y: 6.5 },
    { id: "br", x: 203.5, y: 290.5 },
    { id: "bl", x: 6.5, y: 290.5 },
  ],
  qr: { x: 176, y: 10, width: 20, height: 20 },
  slots: [
    { slotId: "p1.q1.answer", box: { x: 20, y: 240, width: 165, height: 20 } },
  ],
} satisfies ScanLayoutPage;

describe("사진 펴기", () => {
  it("기울어 찍힌 지면의 한 점을 A4 의 같은 mm 자리로 옮긴다", () => {
    // 지면 mm → 사진 px: 4배 확대 + 30px 밀림 + 약한 원근.
    const transform = [4, 0.3, 30, -0.2, 4, 40, 0.0002, 0.0001, 1];
    const width = 1000,
      height = 1400;
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    // 지면 (100mm, 150mm) 둘레 2mm 를 검게 칠한 사진.
    for (let my = 148; my <= 152; my += 0.05)
      for (let mx = 98; mx <= 102; mx += 0.05) {
        const w = transform[6] * mx + transform[7] * my + transform[8];
        const px = Math.round(
          (transform[0] * mx + transform[1] * my + transform[2]) / w,
        );
        const py = Math.round(
          (transform[3] * mx + transform[4] * my + transform[5]) / w,
        );
        const i = (py * width + px) * 4;
        data[i] = data[i + 1] = data[i + 2] = 0;
      }
    const out = warpScanPage({ data, width, height }, transform, 420, 594);
    expect(out.length).toBe(420 * 594 * 4);
    const at = (mx: number, my: number) =>
      out[
        (Math.round((my / 297) * 594) * 420 + Math.round((mx / 210) * 420)) * 4
      ];
    expect(at(100, 150)).toBeLessThan(60);
    expect(at(60, 60)).toBe(255);
    // 사진 밖은 흰 종이로 채운다.
    expect(out[3]).toBe(255);
  });

  it("편 사진의 크기는 원래 사진의 지면 밀도를 넘지 않고, 300dpi 에서 멈춘다", () => {
    expect(flattenedScanSize([4, 0, 0, 0, 4, 0, 0, 0, 1], layout)).toEqual({
      width: 840,
      height: 1188,
    });
    expect(flattenedScanSize([30, 0, 0, 0, 30, 0, 0, 0, 1], layout).width).toBe(
      2480,
    );
  });

  it("편 사진의 맞춤은 지면 좌표 그대로다", () => {
    const registration = flattenedScanRegistration(layout, 840, 1188, 0.4);
    expect(scanRegistrationSchema.parse(registration)).toEqual(registration);
    if (registration.status !== "matched") throw new Error("matched");
    expect(registration.qrErrorMm).toBe(0.4);
    const [tl, , br] = registration.slots[0].points;
    expect(tl.x).toBeCloseTo(20 / 210);
    expect(tl.y).toBeCloseTo(240 / 297);
    expect(br.x).toBeCloseTo(185 / 210);
    expect(br.y).toBeCloseTo(260 / 297);
  });
});
