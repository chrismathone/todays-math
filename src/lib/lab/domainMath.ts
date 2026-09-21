import type { NetCell } from "./types";

export function nudgeTens(total: number, tens: number, delta: number): number {
  const next = tens + delta;
  if (next < 0) return 0;
  if (next * 10 > total) return tens;
  return next;
}

export function bundleParts(total: number, tens: number) {
  const t = nudgeTens(total, tens, 0);
  return { tens: t, ones: total - t * 10 };
}

export function isBundled(total: number, tens: number): boolean {
  const { tens: t, ones } = bundleParts(total, tens);
  return t === Math.floor(total / 10) && ones === total % 10;
}

export function shadeCount(selected: number[], parts: number): number {
  return new Set(selected.filter((i) => i >= 0 && i < parts)).size;
}

export function isShaded(
  selected: number[],
  parts: number,
  filled: number,
): boolean {
  return shadeCount(selected, parts) === filled;
}

export function mirrorCell(
  r: number,
  c: number,
  rows: number,
  cols: number,
  axis: "v" | "h",
): NetCell {
  if (axis === "v") return [r, cols - 1 - c];
  return [rows - 1 - r, c];
}

export function symmetryNeeded(
  seed: NetCell[],
  rows: number,
  cols: number,
  axis: "v" | "h",
): string[] {
  const seedKeys = new Set(seed.map(([r, c]) => `${r},${c}`));
  const need = new Set<string>();
  for (const [r, c] of seed) {
    const [mr, mc] = mirrorCell(r, c, rows, cols, axis);
    const key = `${mr},${mc}`;
    if (!seedKeys.has(key)) need.add(key);
  }
  return [...need].sort();
}

export function symmetryComplete(
  seed: NetCell[],
  filled: string[],
  rows: number,
  cols: number,
  axis: "v" | "h",
): boolean {
  const need = symmetryNeeded(seed, rows, cols, axis);
  const got = [...new Set(filled)].sort();
  return got.length === need.length && got.every((k, i) => k === need[i]);
}

export function machineComplete(
  revealed: string[],
  pairCount: number,
): boolean {
  return new Set(revealed).size === pairCount && pairCount > 0;
}

export function ratioAmounts(a: number, b: number, copies: number) {
  const n = Math.max(0, copies);
  return { left: a * n, right: b * n };
}

export function nudgeCopies(
  copies: number,
  delta: number,
  max: number,
): number {
  const next = copies + delta;
  if (next < 0) return 0;
  if (next > max) return max;
  return next;
}

export function shareEach(total: number, groups: number): number {
  return groups > 0 ? Math.floor(total / groups) : 0;
}

export function isShared(
  placed: number[],
  total: number,
  groups: number,
): boolean {
  if (placed.length !== groups) return false;
  const each = shareEach(total, groups);
  return (
    placed.every((n) => n === each) &&
    placed.reduce((a, b) => a + b, 0) === each * groups
  );
}

export function remainingShare(placed: number[], total: number): number {
  return total - placed.reduce((a, b) => a + b, 0);
}

export function nudgeShare(
  placed: number[],
  index: number,
  delta: number,
  total: number,
): number[] {
  const next = [...placed];
  const left = remainingShare(placed, total);
  const cur = next[index] ?? 0;
  if (delta > 0) {
    if (left < 1) return placed;
    next[index] = cur + 1;
    return next;
  }
  if (cur < 1) return placed;
  next[index] = cur - 1;
  return next;
}

export function clockMatch(
  hour: number,
  minute: number,
  wantHour: number,
  wantMinute: number,
): boolean {
  const h = ((hour - 1) % 12) + 1;
  const wh = ((wantHour - 1) % 12) + 1;
  return h === wh && minute === wantMinute;
}

export function clockAngle(x: number, y: number, cx = 100, cy = 100): number {
  let deg = (Math.atan2(x - cx, cy - y) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

export function hourFromAngle(deg: number, minute = 0): number {
  const adj = (((deg - minute * 0.5) % 360) + 360) % 360;
  const h = Math.round(adj / 30) % 12;
  return h === 0 ? 12 : h;
}

export function minuteFromAngle(deg: number): number {
  const m = Math.round(deg / 30) * 5;
  if (m >= 60 || m < 0) return 0;
  return m;
}

export function nudgeClock(
  hour: number,
  minute: number,
  which: "h" | "m",
  delta: number,
): { hour: number; minute: number } {
  if (which === "h") {
    let h = hour + delta;
    if (h < 1) h = 12;
    if (h > 12) h = 1;
    return { hour: h, minute };
  }
  let m = minute + delta;
  if (m < 0) m = 55;
  if (m > 55) m = 0;
  return { hour, minute: m };
}

export function nudgeAngle(deg: number, delta: number): number {
  const next = deg + delta;
  if (next < 0) return 0;
  if (next > 180) return 180;
  return next;
}

export function isLevel(piles: number[], target: number): boolean {
  return (
    piles.length > 0 &&
    piles.every((n) => n === target) &&
    piles.reduce((a, b) => a + b, 0) === target * piles.length
  );
}

export function movePile(piles: number[], from: number, to: number): number[] {
  if (from === to) return piles;
  const cur = piles[from] ?? 0;
  if (cur < 1) return piles;
  const next = [...piles];
  next[from] = cur - 1;
  next[to] = (next[to] ?? 0) + 1;
  return next;
}

export function cuboidSurface(l: number, w: number, h: number): number {
  return 2 * (l * w + l * h + w * h);
}

export function cuboidVolume(l: number, w: number, h: number): number {
  return l * w * h;
}

export const SURFACE_FACES = [
  "top",
  "bottom",
  "front",
  "back",
  "left",
  "right",
] as const;

export function surfaceComplete(selected: string[]): boolean {
  const got = new Set(selected);
  return SURFACE_FACES.every((id) => got.has(id)) && got.size === 6;
}
