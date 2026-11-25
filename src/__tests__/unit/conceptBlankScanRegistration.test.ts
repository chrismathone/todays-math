// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { ScanLayoutPage } from "@/contracts/conceptBlankScanIssued.contract";
import { scanRegistrationSchema } from "@/contracts/conceptBlankScanPhoto.contract";
import {
  registerScanPhoto,
  fitScanHomography,
  projectScanPoint,
  scanQrDataCorners,
} from "@/lib/concept-blank/scan/registration";

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
const transform = [4, 0, 30, 0, 4, 30, 0, 0, 1];
function picture(omit = -1, extra = false) {
  const width = 900,
    height = 1250;
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  const ring = (x: number, y: number) => {
    for (let py = y - 6; py < y + 6; py++)
      for (let px = x - 6; px < x + 6; px++) {
        if (Math.abs(px - x) < 3 && Math.abs(py - y) < 3) continue;
        const index = (py * width + px) * 4;
        data[index] = data[index + 1] = data[index + 2] = 0;
      }
  };
  layout.markers.forEach((m, i) => {
    if (i !== omit) {
      const p = projectScanPoint(transform, m);
      ring(p.x, p.y);
    }
  });
  if (extra) ring(80, 56);
  const corners = scanQrDataCorners(layout.qr, 6).map((p) =>
    projectScanPoint(transform, p),
  );
  return { image: { data, width, height }, qr: { version: 6, corners } };
}

describe("trusted paper to photo registration", () => {
  it("recovers perspective from four spread points and rejects singular correspondences", () => {
    const actual = [3.5, 0.2, 40, -0.1, 3.6, 80, 0.0002, -0.0001, 1];
    const source = layout.markers;
    const h = fitScanHomography(
      source,
      source.map((p) => projectScanPoint(actual, p)),
    );
    expect(h).not.toBeNull();
    const probe = { x: 110, y: 270 };
    const expected = projectScanPoint(actual, probe);
    expect(projectScanPoint(h!, probe).x).toBeCloseTo(expected.x, 7);
    expect(projectScanPoint(h!, probe).y).toBeCloseTo(expected.y, 7);
    expect(
      fitScanHomography(
        source.map(() => source[0]),
        source,
      ),
    ).toBeNull();
  });
  it("accounts for the QR quiet zone rather than stretching its data corners to the full box", () => {
    const [tl, tr] = scanQrDataCorners(layout.qr, 6);
    expect(tl.x).toBeCloseTo(176 + (20 * 4) / 49);
    expect(tr.x - tl.x).toBeCloseTo((20 * 41) / 49);
  });
  it("registers all slots in stable order only after independent QR agreement", () => {
    const { image, qr } = picture();
    const result = registerScanPhoto(image, layout, qr);
    expect(result.status).toBe("matched");
    if (result.status !== "matched") throw new Error(result.reason);
    expect(result.slots.map((s) => s.slotId)).toEqual(["p1.q1.answer"]);
    expect(result.slots[0].points[0].x * image.width).toBeCloseTo(109.5, 1);
    expect(result.slots[0].points[0].y * image.height).toBeCloseTo(989.5, 1);
    expect(result.qrErrorMm).toBeLessThan(0.3);
    expect(scanRegistrationSchema.safeParse(result).success).toBe(true);
  });
  it("returns no coordinates for missing or ambiguous markers", () => {
    for (const sample of [picture(2), picture(-1, true)]) {
      const result = registerScanPhoto(sample.image, layout, sample.qr);
      expect(result.status).toBe("uncertain");
      expect(result).not.toHaveProperty("slots");
      expect(result).not.toHaveProperty("transform");
    }
  });
  it("does not extrapolate small QR corner noise into distant answer positions", () => {
    const { image, qr } = picture();
    qr.corners[2] = { x: qr.corners[2].x + 1.2, y: qr.corners[2].y + 1.2 };
    const result = registerScanPhoto(image, layout, qr);
    expect(result.status).toBe("matched");
    if (result.status !== "matched") throw new Error(result.reason);
    expect(result.slots[0].points[0].y * image.height).toBeCloseTo(989.5, 1);
  });
  it("does not use the markers' own fitting residual as proof of correctness", () => {
    const { image, qr } = picture();
    const changed = {
      ...qr,
      corners: qr.corners.map((p) => ({ x: p.x + 12, y: p.y })),
    };
    const result = registerScanPhoto(image, layout, changed);
    expect(result.status).toBe("uncertain");
    expect(result).not.toHaveProperty("slots");
  });
  it("strictly forbids stale overlays in fallback responses and unbounded coordinates", () => {
    expect(
      scanRegistrationSchema.safeParse({
        version: 1,
        status: "uncertain",
        reason: "다시 찍어 주세요.",
        slots: [],
      }).success,
    ).toBe(false);
    const { image, qr } = picture();
    const result = registerScanPhoto(image, layout, qr);
    if (result.status !== "matched") throw new Error(result.reason);
    result.slots[0].points[0].x = -1;
    expect(scanRegistrationSchema.safeParse(result).success).toBe(false);
  });
});
