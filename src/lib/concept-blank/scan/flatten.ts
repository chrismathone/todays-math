import type { ScanLayoutPage } from "@/contracts/conceptBlankScanIssued.contract";
import {
  scanRegistrationSchema,
  type ScanRegistration,
} from "@/contracts/conceptBlankScanPhoto.contract";
import type { ScanPixels } from "./registration";

/** 원장님 2026-11-25 «네 모서리를 인식하고 자동으로 스캔처럼».
 * 네 표식으로 맞춘 사진만 반듯한 A4 로 편다(맞춤이 불확실하면 원래 사진 그대로). */

const MAX_DPMM = 2480 / 210; // 300dpi — 더 크게 펴도 글씨는 늘지 않고 값만 는다.
const MIN_DPMM = 2; // 망가진 변환에서 빈 그림을 만들지 않으려는 바닥일 뿐 — 원래 밀도보다 키우지 않는다.

/** 원래 사진이 지면 가운데에서 가진 밀도(px/mm)를 따른다 — 없는 글씨를 늘려 만들지 않는다. */
export function flattenedScanSize(
  transform: readonly number[],
  layout: Pick<ScanLayoutPage, "width" | "height">,
) {
  const at = (x: number, y: number) => {
    const d = transform[6] * x + transform[7] * y + transform[8];
    return {
      x: (transform[0] * x + transform[1] * y + transform[2]) / d,
      y: (transform[3] * x + transform[4] * y + transform[5]) / d,
    };
  };
  const cx = layout.width / 2,
    cy = layout.height / 2,
    c = at(cx, cy),
    dx = at(cx + 1, cy),
    dy = at(cx, cy + 1);
  const density = Math.min(
    Math.hypot(dx.x - c.x, dx.y - c.y),
    Math.hypot(dy.x - c.x, dy.y - c.y),
  );
  const dpmm = Math.min(
    MAX_DPMM,
    Math.max(MIN_DPMM, Number.isFinite(density) ? density : MIN_DPMM),
  );
  return {
    width: Math.round(layout.width * dpmm),
    height: Math.round(layout.height * dpmm),
  };
}

/** 지면 mm → 사진 px 변환으로 출력 픽셀마다 사진을 겹선형 표집한다. 사진 밖은 흰 종이. */
export function warpScanPage(
  image: ScanPixels,
  transform: readonly number[],
  width: number,
  height: number,
  page = { width: 210, height: 297 },
) {
  const out = new Uint8ClampedArray(width * height * 4);
  const [a, b, c, d, e, f, g, h, k] = transform;
  const sx = page.width / width,
    sy = page.height / height,
    src = image.data,
    iw = image.width,
    ih = image.height;
  for (let v = 0; v < height; v++) {
    const my = (v + 0.5) * sy;
    for (let u = 0; u < width; u++) {
      const mx = (u + 0.5) * sx;
      const den = g * mx + h * my + k;
      const px = (a * mx + b * my + c) / den - 0.5,
        py = (d * mx + e * my + f) / den - 0.5;
      const o = (v * width + u) * 4;
      if (!(px >= 0 && py >= 0 && px <= iw - 1 && py <= ih - 1)) {
        out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 255;
        continue;
      }
      const x0 = Math.floor(px),
        y0 = Math.floor(py),
        x1 = Math.min(iw - 1, x0 + 1),
        y1 = Math.min(ih - 1, y0 + 1),
        fx = px - x0,
        fy = py - y0;
      const i00 = (y0 * iw + x0) * 4,
        i10 = (y0 * iw + x1) * 4,
        i01 = (y1 * iw + x0) * 4,
        i11 = (y1 * iw + x1) * 4;
      for (let ch = 0; ch < 3; ch++)
        out[o + ch] =
          (src[i00 + ch] * (1 - fx) + src[i10 + ch] * fx) * (1 - fy) +
          (src[i01 + ch] * (1 - fx) + src[i11 + ch] * fx) * fy;
      out[o + 3] = 255;
    }
  }
  return out;
}

/** 편 사진에서는 지면 좌표가 곧 사진 좌표다. 원래 맞춤의 QR 검산 오차는 그대로 남긴다. */
export function flattenedScanRegistration(
  layout: ScanLayoutPage,
  width: number,
  height: number,
  qrErrorMm: number,
): ScanRegistration {
  return scanRegistrationSchema.parse({
    version: 1,
    status: "matched",
    transform: [
      width / layout.width,
      0,
      0,
      0,
      height / layout.height,
      0,
      0,
      0,
      1,
    ],
    qrErrorMm,
    slots: layout.slots.map((slot) => {
      const { x, y, width: bw, height: bh } = slot.box;
      return {
        slotId: slot.slotId,
        points: [
          { x, y },
          { x: x + bw, y },
          { x: x + bw, y: y + bh },
          { x, y: y + bh },
        ].map((p) => ({ x: p.x / layout.width, y: p.y / layout.height })),
      };
    }),
  });
}
