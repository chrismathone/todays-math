import { describe, it, expect, vi } from "vitest";
const mock = vi.hoisted(() => ({ decode: vi.fn() }));
vi.mock("@/components/unified/aiImageSurface", () => ({
  decodeAiImageSurface: mock.decode,
}));
import { encodeScanPhoto } from "@/components/concept-blank/scan/image";
describe("browser photo encoder", () => {
  it("re-encodes even a small image to remove EXIF orientation, then uses the existing budget ladder", async () => {
    const encode = vi.fn((scale: number, type: string) =>
      type === "image/png"
        ? "data:image/png;base64," + "A".repeat(3_000_001)
        : "data:image/webp;base64,AAAA",
    );
    mock.decode.mockResolvedValue({ width: 2000, height: 3000, encode });
    const result = await encodeScanPhoto(
      new File(["sample"], "photo.jpg", { type: "image/jpeg" }),
    );
    expect(encode.mock.calls[0]).toEqual([1, "image/png"]);
    expect(encode.mock.calls[1]).toEqual([1, "image/webp", 0.92]);
    expect(result.dataUrl).toBe("data:image/webp;base64,AAAA");
  });
  it("bounds decoded pixels before encoding and reports the actual reduction", async () => {
    const encode = vi.fn<(scale: number) => string>(
      () => "data:image/png;base64,AAAA",
    );
    mock.decode.mockResolvedValue({ width: 8000, height: 6000, encode });
    const result = await encodeScanPhoto(
      new File(["sample"], "photo.jpg", { type: "image/jpeg" }),
    );
    expect(encode.mock.calls[0][0]).toBeLessThan(0.58);
    expect(result.reducedTo).toBeLessThan(4700);
  });
});

it.each(["image/heic", "image/heif", ""])(
  "decodes %s when supported and sends JPEG without EXIF",
  async (type) => {
    const encode = vi.fn(() => "data:image/jpeg;base64,AAAA");
    mock.decode.mockResolvedValue({ width: 2000, height: 3000, encode });
    const result = await encodeScanPhoto(
      new File(["heic bytes"], "IMG_1.HEIC", { type }),
    );
    expect(encode.mock.calls[0]).toEqual([1, "image/jpeg", 0.92]);
    expect(result.dataUrl).toBe("data:image/jpeg;base64,AAAA");
  },
);
it("rejects HEIC only after the browser decoder fails with an actionable message", async () => {
  mock.decode.mockReset().mockRejectedValue(new Error("decoder failed"));
  await expect(
    encodeScanPhoto(new File(["x"], "a.heic", { type: "image/heic" })),
  ).rejects.toThrow(/이 브라우저.*HEIC.*JPEG/);
  expect(mock.decode).toHaveBeenCalledOnce();
});
it("keeps an oversized HEIC on a JPEG-only ladder", async () => {
  const encode = vi.fn(
    (scale: number, type: string, quality?: number) =>
      `data:${type};base64,` +
      (quality === 0.92 ? "A".repeat(3_000_000) : "AAAA"),
  );
  mock.decode.mockResolvedValue({ width: 2000, height: 3000, encode });
  const result = await encodeScanPhoto(
    new File(["x"], "a.heic", { type: "image/heic" }),
  );
  expect(result.dataUrl).toBe("data:image/jpeg;base64,AAAA");
  expect(encode.mock.calls.every((call) => call[1] === "image/jpeg")).toBe(
    true,
  );
});

it("never sends a silent PNG fallback for a HEIC JPEG conversion", async () => {
  mock.decode.mockResolvedValue({
    width: 2000,
    height: 3000,
    encode: () => "data:image/png;base64,AAAA",
  });
  await expect(
    encodeScanPhoto(new File(["x"], "a.heic", { type: "image/heic" })),
  ).rejects.toThrow(/JPEG.*변환/);
});
