// @vitest-environment node
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import QRCode from "qrcode";
import { inspectScanPhoto } from "@/lib/concept-blank/scan/photo.server";
import { scanQrUrl } from "@/lib/concept-blank/scan/layout";

const id = "00000000-0000-4000-8000-000000000001";
const origin = "https://today.aywa.co.kr";
const expected = { printedSheetId: id, pageCount: 3, origin };
async function photo(
  part: "student" | "key" = "student",
  page = 2,
  issue = id,
  twice = false,
) {
  const qr = await QRCode.toBuffer(
    scanQrUrl(origin, { printedSheetId: issue, page, part }),
    { errorCorrectionLevel: "M", margin: 4, scale: 6 },
  );
  const buffer = await sharp({
    create: { width: 900, height: 1200, channels: 3, background: "white" },
  })
    .composite([
      { input: qr, left: 560, top: 50 },
      ...(twice ? [{ input: qr, left: 50, top: 600 }] : []),
    ])
    .png()
    .toBuffer();
  return `data:image/png;base64,${buffer.toString("base64")}`;
}
describe("actual uploaded photo inspection", () => {
  it("decodes the photo's own QR and preserves bytes for the later paid reading", async () => {
    const imageDataUrl = await photo();
    const result = await inspectScanPhoto(imageDataUrl, expected);
    expect(result.qr).toEqual({ printedSheetId: id, page: 2, part: "student" });
    expect(result.width).toBe(900);
    expect(result.height).toBe(1200);
    expect(result.mime).toBe("image/png");
    expect(result.bytes.toString("base64")).toBe(imageDataUrl.split(",")[1]);
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.geometry.corners).toHaveLength(4);
  });
  it("rejects answer keys, another issue, out-of-range pages and multiple page QRs", async () => {
    for (const image of [
      await photo("key"),
      await photo("student", 2, "00000000-0000-4000-8000-000000000002"),
      await photo("student", 4),
    ])
      await expect(inspectScanPhoto(image, expected)).rejects.toThrow(
        /채점표|다른 발행|쪽 번호|QR이 여러/,
      );
    // Two codes can also defeat the initial decoder; either way the photo must be refused.
    await expect(
      inspectScanPhoto(await photo("student", 2, id, true), expected),
    ).rejects.toThrow(/QR/);
  });
  it("rejects missing QR, fake image content and MIME mismatch before any persistence or model call", async () => {
    const plain = await sharp({
      create: { width: 100, height: 100, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    for (const image of [
      `data:image/png;base64,${plain.toString("base64")}`,
      "data:image/png;base64,SGVsbG8=",
      (await photo()).replace("image/png", "image/jpeg"),
    ])
      await expect(inspectScanPhoto(image, expected)).rejects.toThrow();
  });
});
