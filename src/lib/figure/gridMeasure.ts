/** Bounded comparison-image advisory support. Deterministic pixel heuristic, never a mathematical/approval oracle.
 * No DOM, image decoder, sharp, network, model, snapping, SVG mutation or stored contract.
 * A regular table can be pixel-identical to a grid: even a result REQUIRES review.
 */
export const GRID_MEASURE_POLICY = '20261021-bounded-gray-advisory-r1';
export const COMPARISON_GRID_LAYOUT = Object.freeze({ frame: 900, inset: 48, side: 804 });
const MAX_SIDE = 1400;
const MAX_PIXELS = 2_000_000;
export interface GridAxis {
  first: number; last: number; cell: number; count: number; found: number;
}
export interface MeasuredGrid {
  kind: 'heuristic-only'; requiresReview: true;
  width: number; height: number;
  coordinateSpace: 'analysis-pixels-x-right-y-down';
  x: GridAxis; y: GridAxis;
}

/** Peripheral indices for the 900px comparison panel, never source coordinates. */
export function gridIndexOverlay(grid: MeasuredGrid, naturalWidth: number, naturalHeight: number) {
  if (!Number.isSafeInteger(naturalWidth) || !Number.isSafeInteger(naturalHeight) ||
      naturalWidth < 1 || naturalHeight < 1 || naturalWidth > 16000 || naturalHeight > 16000 ||
      naturalWidth * naturalHeight > 40_000_000 || !dimensions(grid.width, grid.height) ||
      grid.kind !== 'heuristic-only' || grid.requiresReview !== true ||
      grid.coordinateSpace !== 'analysis-pixels-x-right-y-down') return null;
  for (const [axis, size] of [[grid.x, grid.width], [grid.y, grid.height]] as const) {
    if (!axis || !Number.isSafeInteger(axis.count) || axis.count < 3 || axis.count > 60 ||
        axis.found !== axis.count + 1 || ![axis.first, axis.last, axis.cell].every(Number.isFinite) ||
        axis.first <= 2 || axis.last >= size - 3 || axis.cell < 4 ||
        Math.abs(axis.first + axis.count * axis.cell - axis.last) > 1e-6) return null;
  }
  const { inset, side } = COMPARISON_GRID_LAYOUT;
  const fit = Math.min(side / naturalWidth, side / naturalHeight);
  const left = inset + (side - naturalWidth * fit) / 2;
  const top = inset + (side - naturalHeight * fit) / 2;
  const sx = naturalWidth / grid.width * fit;
  const sy = naturalHeight / grid.height * fit;
  const ticks: { x: number; y: number; label: string }[] = [];
  // Dense grids retain every line in the image; sparse ordinal labels avoid overlap.
  const xStride = Math.max(1, Math.ceil(24 / (grid.x.cell * sx)));
  const yStride = Math.max(1, Math.ceil(24 / (grid.y.cell * sy)));
  for (let i = 0; i <= grid.x.count; i += xStride) {
    const x = left + (grid.x.first + i * grid.x.cell) * sx;
    ticks.push({ x, y: top - 14, label: String(i) },
      { x, y: top + naturalHeight * fit + 14, label: String(i) });
  }
  for (let i = 0; i <= grid.y.count; i += yStride) {
    const y = top + (grid.y.last - i * grid.y.cell) * sy;
    ticks.push({ x: left - 18, y, label: String(i) },
      { x: left + naturalWidth * fit + 18, y, label: String(i) });
  }
  return { ticks, legend: `분석용 칸 번호(추정 ${grid.x.count}×${grid.y.count}) · 원문 좌표 아님` };
}
function dimensions(width: unknown, height: unknown): [number, number] | null {
  if (typeof width !== 'number' || typeof height !== 'number' ||
      !Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
      width < 1 || height < 1 || width > MAX_SIDE || height > MAX_SIDE ||
      width * height > MAX_PIXELS) return null;
  return [width, height];
}
function snapshot(gray: unknown, count: number): Uint8Array | null {
  // Reject arbitrary ArrayLike objects rather than trusting a forged length.
  if (!(gray instanceof Uint8Array) && !(gray instanceof Uint8ClampedArray) && !Array.isArray(gray)) return null;
  if (gray.length !== count) return null;
  const copy = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const value: unknown = gray[i];
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 255) return null;
    copy[i] = value;
  }
  return copy;
}
function lattice(profile: number[]): GridAxis | null {
  let max = 0;
  for (const v of profile) { if (!Number.isFinite(v)) return null; if (v > max) max = v; }
  if (max < 0.35) return null;
  const cut = max * 0.5;
  const centers: number[] = [];
  for (let i = 0; i < profile.length;) {
    if (profile[i]! < cut) { i++; continue; }
    let j = i, weight = 0, sum = 0;
    while (j < profile.length && profile[j]! >= cut) { weight += profile[j]!; sum += profile[j]! * j; j++; }
    if (!(weight > 0)) return null;
    centers.push(sum / weight); i = j;
  }
  if (centers.length < 4 || centers.length > 61) return null;
  // Conservative: no invented missing lines or extrapolation to cropped edges.
  const first = centers[0]!, last = centers[centers.length - 1]!;
  if (first <= 2 || last >= profile.length - 3) return null;
  const count = centers.length - 1, cell = (last - first) / count;
  if (!Number.isFinite(cell) || cell < 4 || count > 60) return null;
  for (let i = 1; i < centers.length; i++) {
    if (Math.abs((centers[i]! - centers[i - 1]!) / cell - 1) > 0.1) return null;
  }
  return {first, last, cell, count, found: centers.length};
}
function nearDark(gray: Uint8Array, w: number, h: number, x: number, y: number, threshold: number): boolean {
  const cx = Math.round(x), cy = Math.round(y);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const px = cx + dx, py = cy + dy;
    if (px >= 0 && py >= 0 && px < w && py < h && gray[py * w + px]! < threshold) return true;
  }
  return false;
}
/** Invalid inputs, cropped/ambiguous/insufficient evidence => null (NOT passed).
 * Dense ordinary number arrays or byte arrays only; integer gray values 0..255.
 * Accessor/proxy sandboxing is NOT promised. Caller must supply decoded server-owned pixels.
 */
export function measureGridFromGray(gray: unknown, width: unknown, height: unknown): MeasuredGrid | null {
  try {
    const size = dimensions(width, height);
    if (!size) return null;
    const [w,h] = size, data = snapshot(gray, w*h);
    if (!data) return null;
    const sample: number[] = [], stride = Math.max(1, Math.ceil(data.length / 4000));
    for (let i = 0; i < data.length; i += stride) sample.push(data[i]!);
    sample.sort((a,b) => a-b);
    const background = sample[Math.floor(sample.length/2)];
    if (background === undefined || background < 95) return null;
    const threshold = Math.max(60, background - 35);
    const xp = new Array<number>(w).fill(0), yp = new Array<number>(h).fill(0);
    for (let y=0;y<h;y++) for(let x=0;x<w;x++) {
      if (data[y*w+x]! < threshold) { xp[x]!++; yp[y]!++; }
    }
    for (let x=0;x<w;x++) xp[x]! /= h;
    for (let y=0;y<h;y++) yp[y]! /= w;
    const x=lattice(xp), y=lattice(yp);
    if (!x || !y || x.cell/y.cell < 0.9 || x.cell/y.cell > 1.1) return null;
    // Require actual long-line support in BOTH directions, not just projection peaks.
    for (let k=0;k<=x.count;k++) {
      let dark=0, total=0;
      for(let t=Math.ceil(y.first);t<=Math.floor(y.last);t++){total++;if(nearDark(data,w,h,x.first+k*x.cell,t,threshold))dark++;}
      if (!total || dark/total < 0.85) return null;
    }
    for (let k=0;k<=y.count;k++) {
      let dark=0,total=0;
      for(let t=Math.ceil(x.first);t<=Math.floor(x.last);t++){total++;if(nearDark(data,w,h,t,y.first+k*y.cell,threshold))dark++;}
      if (!total || dark/total < 0.85) return null;
    }
    return {kind:'heuristic-only',requiresReview:true,width:w,height:h,
      coordinateSpace:'analysis-pixels-x-right-y-down',x,y};
  } catch { return null; }
}
