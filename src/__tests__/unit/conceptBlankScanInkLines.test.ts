import { describe, expect, it, vi } from "vitest";
import { findInkLines } from "@/lib/concept-blank/scan/inkLines";
import { scanInkLinesSchema } from "@/contracts/conceptBlankScanInkLines.contract";

vi.mock("server-only", () => ({}));

const width = 420;
const height = 594;
const slot = { x: 20, y: 30, width: 70, height: 30 };

function raster(paper: (x: number) => number = () => 255) {
  const data = new Uint8ClampedArray(width * height * 4);
  const paint = (x: number, y: number, value: number) =>
    data.set([value, value, value, 255], (y * width + x) * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) paint(x, y, paper(x));
  }
  const rect = (x: number, y: number, w: number, h: number, value: number) => {
    for (let row = y; row < y + h; row++) {
      for (let col = x; col < x + w; col++) paint(col, row, value);
    }
  };
  return { image: { data, width, height }, rect };
}

describe("findInkLines", () => {
  it("removes shifted printed rules and type on shaded paper and finds empty ruled bands", () => {
    const blank = raster();
    const photo = raster((x) => 132 + x / 4);
    for (const y of [62, 82, 102, 118]) {
      blank.rect(40, y, 140, 1, 170);
      photo.rect(40, y + 2, 140, 1, 100);
    }
    blank.rect(56, 67, 9, 7, 15);
    photo.rect(57, 68, 9, 7, 12);
    const result = scanInkLinesSchema.parse(
      findInkLines(photo.image, slot, blank.image),
    );
    expect(result.status).toBe("ok");
    expect(result.lines).toEqual([]);
    expect(result.emptyLines).toHaveLength(3);
  });

  it("reports complete x ranges in reading order including tilted and crossed out ink outside the slot", () => {
    const blank = raster();
    const photo = raster();
    for (const x of [36, 49, 63, 79, 96]) {
      photo.rect(x, 71 + Math.floor((x - 36) / 20), 7, 8, 95);
    }
    photo.rect(38, 77, 70, 1, 95);
    photo.rect(38, 80, 70, 1, 95);
    photo.rect(54, 99, 40, 6, 95);
    const result = findInkLines(photo.image, slot, blank.image);
    expect(result.status).toBe("ok");
    expect(result.lines.map(({ box }) => [box.x, box.x + box.width])).toEqual([
      [18, 54],
      [27, 47],
    ]);
    expect(result.lines[0].box.height).toBeGreaterThan(5);
    expect(result.lines[0].inkRatio).toBeGreaterThan(0);
  });

  it("retains strong ink on dark paper and rejects a faint erasure on brighter paper", () => {
    const blank = raster();
    const photo = raster((x) => (x < 95 ? 145 : 215));
    photo.rect(46, 70, 25, 7, 102);
    photo.rect(110, 99, 25, 7, 182);
    const result = findInkLines(photo.image, slot, blank.image);
    expect(result.status).toBe("ok");
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].box.y).toBe(35);
  });

  it("withholds anchors for a dark smear across the slot", () => {
    const blank = raster();
    const photo = raster();
    photo.rect(45, 66, 130, 49, 40);
    expect(findInkLines(photo.image, slot, blank.image)).toMatchObject({
      status: "unreliable",
      lines: [],
      emptyLines: [],
    });
  });

  it("withholds anchors when two overlapping lines cannot be separated", () => {
    const blank = raster();
    const photo = raster();
    photo.rect(46, 65, 30, 16, 40);
    photo.rect(80, 78, 30, 16, 40);
    expect(findInkLines(photo.image, slot, blank.image).status).toBe(
      "unreliable",
    );
  });

  it("reserves a ruled band with faint marks or ink crossing its edge", () => {
    const blank = raster();
    const photo = raster();
    for (const y of [62, 80, 98, 117]) {
      blank.rect(40, y, 140, 1, 150);
      photo.rect(40, y, 140, 1, 150);
    }
    photo.rect(62, 68, 14, 5, 212);
    photo.rect(62, 96, 20, 9, 80);
    const result = findInkLines(photo.image, slot, blank.image);
    expect(result.lines).toHaveLength(1);
    expect(result.emptyLines).toEqual([]);
    expect(findInkLines(photo.image, slot, blank.image)).toEqual(result);
  });

  it("withholds anchors for a malformed raster or a slot outside A4", () => {
    const { image } = raster();
    expect(
      findInkLines({ ...image, width: width - 1 }, slot, image),
    ).toMatchObject({ status: "unreliable", reason: "invalid-raster-or-slot" });
    expect(findInkLines(image, { ...slot, y: 290 }, image)).toMatchObject({
      status: "unreliable",
      reason: "invalid-raster-or-slot",
    });
  });

  it("withholds a long span supported mostly by sparse rule-like residue", () => {
    const blank = raster();
    const photo = raster();
    for (let x = 45; x < 170; x += 3) photo.rect(x, 82, 1, 1, 85);
    photo.rect(162, 72, 3, 12, 85);
    expect(findInkLines(photo.image, slot, blank.image)).toMatchObject({
      status: "unreliable",
      reason: "sparse-ink-span",
    });
  });
});
