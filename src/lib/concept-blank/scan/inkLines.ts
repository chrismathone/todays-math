import "server-only";

import {
  scanBoxSchema,
  type ScanBox,
} from "@/contracts/conceptBlankScanIssued.contract";
import type { ScanInkLines } from "@/contracts/conceptBlankScanInkLines.contract";
import type { ScanPixels } from "./registration";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const BLEED_MM = 3;
const INK_CONTRAST = 0.2;

function luminance(raster: ScanPixels, x: number, y: number) {
  const i = (y * raster.width + x) * 4;
  const { data } = raster;
  return (77 * data[i] + 150 * data[i + 1] + 29 * data[i + 2]) / 256;
}

function validRaster(raster: ScanPixels) {
  return (
    Number.isSafeInteger(raster.width) &&
    Number.isSafeInteger(raster.height) &&
    raster.width >= PAGE_WIDTH &&
    raster.height >= PAGE_HEIGHT &&
    raster.data.length === raster.width * raster.height * 4
  );
}

function unreliable(reason: string): ScanInkLines {
  return { status: "unreliable", lines: [], emptyLines: [], reason };
}

type Band = { start: number; end: number };

function bands(
  rows: ArrayLike<number>,
  threshold: number,
  gap: number,
): Band[] {
  const result: Band[] = [];
  for (let y = 0; y < rows.length; y++) {
    if (rows[y] < threshold) continue;
    const last = result.at(-1);
    if (last && y - last.end <= gap) last.end = y + 1;
    else result.push({ start: y, end: y + 1 });
  }
  return result;
}

/** An upper quantile within a narrow column of the cell estimates nearby
 * paper even in a shadow. Small y windows let the baseline follow shading. */
function paperLevel(
  gray: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  radiusY: number,
) {
  const hist = new Uint32Array(256);
  let count = 0;
  for (
    let row = Math.max(0, y - radiusY);
    row < Math.min(height, y + radiusY + 1);
    row += 2
  ) {
    hist[gray[row * width + x]]++;
    count++;
  }
  let remaining = Math.ceil(count * 0.12);
  for (let i = 255; i > 0; i--) {
    remaining -= hist[i];
    if (remaining <= 0) return i;
  }
  return 0;
}

/** Vote for a small local displacement using multiple printed pixels. A flat
 * patch or a weak vote leaves the reference in its original position. */
function alignPrint(
  gray: Uint8Array,
  print: Uint8Array,
  width: number,
  height: number,
  sx: number,
  sy: number,
) {
  const aligned = new Uint8Array(print.length);
  const stepX = Math.round(12 * sx);
  const stepY = Math.round(10 * sy);
  const radius = Math.max(2, Math.round(1.75 * Math.max(sx, sy)));
  for (let top = 0; top < height; top += stepY) {
    const bottom = Math.min(top + stepY, height);
    for (let left = 0; left < width; left += stepX) {
      const right = Math.min(left + stepX, width);
      const points: [number, number][] = [];
      for (let y = top; y < bottom; y++) {
        for (let x = left; x < right; x++) {
          if (
            print[y * width + x] >= 24 &&
            x >= radius &&
            x < width - radius &&
            y >= radius &&
            y < height - radius
          )
            points.push([x, y]);
        }
      }
      const stride = Math.max(1, Math.ceil(points.length / 170));
      const sample = points.filter((_, index) => index % stride === 0);
      let dx = 0;
      let dy = 0;
      if (sample.length >= 8) {
        const score = (u: number, v: number) =>
          sample.reduce(
            (sum, [x, y]) => sum + gray[(y + v) * width + x + u],
            0,
          ) / sample.length;
        const original = score(0, 0);
        let best = original - 3;
        for (let v = -radius; v <= radius; v++) {
          for (let u = -radius; u <= radius; u++) {
            const candidate = score(u, v) + 0.45 * Math.hypot(u, v);
            if (candidate >= best) continue;
            best = candidate;
            dx = u;
            dy = v;
          }
        }
      }
      for (let y = Math.max(top, -dy); y < Math.min(bottom, height - dy); y++) {
        for (
          let x = Math.max(left, -dx);
          x < Math.min(right, width - dx);
          x++
        ) {
          if (print[y * width + x] >= 16)
            aligned[(y + dy) * width + x + dx] = 1;
        }
      }
    }
  }
  return aligned;
}

/** Both rasters show the same whole A4 page. The reference can be at a
 * different resolution. Coordinates are in page mm, including small overruns. */
export function findInkLines(
  photo: ScanPixels,
  slot: ScanBox,
  reference: ScanPixels,
): ScanInkLines {
  if (
    !validRaster(photo) ||
    !validRaster(reference) ||
    !scanBoxSchema.safeParse(slot).success ||
    slot.x + slot.width > PAGE_WIDTH + 1e-6 ||
    slot.y + slot.height > PAGE_HEIGHT + 1e-6
  ) {
    return unreliable("invalid-raster-or-slot");
  }
  const sx = photo.width / PAGE_WIDTH;
  const sy = photo.height / PAGE_HEIGHT;
  const x0 = Math.max(0, Math.floor((slot.x - BLEED_MM) * sx));
  const y0 = Math.max(0, Math.floor((slot.y - BLEED_MM) * sy));
  const x1 = Math.min(
    photo.width,
    Math.ceil((slot.x + slot.width + BLEED_MM) * sx),
  );
  const y1 = Math.min(
    photo.height,
    Math.ceil((slot.y + slot.height + BLEED_MM) * sy),
  );
  const width = x1 - x0;
  const height = y1 - y0;
  const gray = new Uint8Array(width * height);
  const print = new Uint8Array(width * height);
  const ruleRows = new Uint32Array(height);
  const left = Math.ceil(slot.x * sx) - x0;
  const right = Math.min(width, Math.floor((slot.x + slot.width) * sx) - x0);
  const span = right - left;
  if (span < 2) return unreliable("slot-too-small");
  for (let y = 0; y < height; y++) {
    const ry = Math.floor(((y0 + y + 0.5) * reference.height) / photo.height);
    for (let x = 0; x < width; x++) {
      const rx = Math.floor(((x0 + x + 0.5) * reference.width) / photo.width);
      const i = y * width + x;
      gray[i] = luminance(photo, x0 + x, y0 + y);
      // Blank print backgrounds are white. Keep even pale rules in the mask.
      print[i] = 255 - luminance(reference, rx, ry);
      if (x >= left && x < right && print[i] >= 16) ruleRows[y]++;
    }
  }

  const ruled = bands(ruleRows, Math.ceil(span * 0.65), 0).filter(
    ({ start, end }) =>
      (y0 + start) / sy >= slot.y - 0.5 &&
      (y0 + end) / sy <= slot.y + slot.height + 0.5,
  );
  const rowCounts = new Uint32Array(height);
  const faintRows = new Uint32Array(height);
  const ink = new Uint8Array(width * height);
  const alignedPrint = alignPrint(gray, print, width, height, sx, sy);
  const stepY = Math.max(1, Math.round(4 * sy));
  const radiusY = Math.ceil(16 * sy);
  const maskRadius = 2;
  for (let top = 0; top < height; top += stepY) {
    for (let x = 0; x < width; x++) {
      const bottom = Math.min(top + stepY, height);
      const paper = paperLevel(
        gray,
        width,
        height,
        x,
        (top + bottom) >> 1,
        radiusY,
      );
      if (paper === 0) return unreliable("paper-clipped-to-black");
      for (let y = top; y < bottom; y++) {
        const i = y * width + x;
        const contrast = (paper - gray[i]) / paper;
        if (contrast < 0.12) continue;
        let printed = false;
        for (
          let py = Math.max(0, y - maskRadius);
          py <= Math.min(height - 1, y + maskRadius) && !printed;
          py++
        ) {
          for (
            let px = Math.max(0, x - maskRadius);
            px <= Math.min(width - 1, x + maskRadius);
            px++
          ) {
            if (alignedPrint[py * width + px]) {
              printed = true;
              break;
            }
          }
        }
        if (printed) continue;
        faintRows[y]++;
        if (contrast < INK_CONTRAST) continue;
        ink[i] = 1;
        rowCounts[y]++;
      }
    }
  }

  const lines: ScanInkLines["lines"] = [];
  for (const { start, end } of bands(
    rowCounts,
    Math.max(2, Math.ceil(1.0 * sx)),
    Math.round(1.35 * sy),
  )) {
    if ((end - start) / sy < 0.85) continue;
    let minX = width;
    let maxX = -1;
    let count = 0;
    let inside = 0;
    for (let y = start; y < end; y++) {
      for (let x = 0; x < width; x++) {
        if (!ink[y * width + x]) continue;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        count++;
        if (
          x >= left &&
          x < right &&
          (y + y0 + 0.5) / sy >= slot.y &&
          (y + y0 + 0.5) / sy < slot.y + slot.height
        )
          inside++;
      }
    }
    if (
      count < 0.7 * sx * sy ||
      inside < count * 0.55 ||
      (maxX - minX + 1) / sx < 1.1
    )
      continue;
    const box = {
      x: (x0 + minX) / sx,
      y: (y0 + start) / sy,
      width: (maxX - minX + 1) / sx,
      height: (end - start) / sy,
    };
    if (box.height > 11 || count > span * slot.height * sy * 0.42) {
      return unreliable("ink-bands-overlap-or-smear");
    }
    const inkRatio = count / ((maxX - minX + 1) * (end - start));
    // A few detached dark pixels on a residual rule can stretch the anchor
    // well beyond the text. In this case the full x span is ambiguous.
    if (box.width >= 20 && inkRatio < 0.055) {
      return unreliable("sparse-ink-span");
    }
    lines.push({ box, inkRatio });
  }

  const emptyLines: ScanInkLines["emptyLines"] = [];
  for (let i = 1; i < ruled.length; i++) {
    const start = ruled[i - 1].end;
    const end = ruled[i].start;
    if ((end - start) / sy < 2 || (end - start) / sy > 20) continue;
    // A stroke can straddle a rule while the mask hides its middle.
    const edgeGuard = maskRadius + 2;
    const occupied =
      faintRows
        .subarray(Math.max(0, start - edgeGuard), end + edgeGuard)
        .some((count) => count >= Math.max(2, sx * 0.65)) ||
      lines.some(
        ({ box }) =>
          box.y < (y0 + end) / sy && box.y + box.height > (y0 + start) / sy,
      );
    if (!occupied)
      emptyLines.push({ y: (y0 + start) / sy, height: (end - start) / sy });
  }
  return { status: "ok", lines, emptyLines };
}
