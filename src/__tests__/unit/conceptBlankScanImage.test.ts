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
