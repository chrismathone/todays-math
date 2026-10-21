import type { DevAiFigureSpec } from "@/lib/dev-ai/contracts";

/**
 * 모눈 그림의 끝점을 격자점에 맞추기 — math-figure-editor 2026-10-21 «그림을 최대치로 정확하게».
 *
 * 모눈종이 위 벡터·도형은 끝점이 격자점에 놓인다. 모델은 픽셀을 어림해 좌표를 내므로 3.1·6.9·13.5 처럼 빗나가고,
 * 그러면 «같은 방향인 벡터»를 고르는 문제에서 기울기가 달라진다. graph-1 에 `grid` 가 있으면:
 * - **선분(벡터) 끝점·다각형 꼭짓점**은 늘 가장 가까운 격자점으로 — 모눈종이 위 선은 격자점에서 격자점으로 긋는다
 *   (2026-10-21 실측: 벡터 6개의 끝점 12개 중 4개를 모델이 반 칸 13.5·14.5 로 어림했다).
 * - **점·원 중심**은 칸의 0.3 이내일 때만(중점처럼 일부러 칸 사이에 둔 점은 그대로).
 * 글자 자리(labels)는 옮기지 않는다.
 */
const TOLERANCE = 0.3;

type Pair = [number, number];
const isPair = (v: unknown): v is Pair =>
  Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === "number" && Number.isFinite(n));

export function snapGraphSpecToGrid(spec: DevAiFigureSpec): { spec: DevAiFigureSpec; snapped: number } {
  const s = spec as Record<string, unknown>;
  if (s.version !== "graph-1" || !s.grid || typeof s.grid !== "object") return { spec, snapped: 0 };
  const grid = s.grid as { step?: unknown; from?: unknown };
  const step = grid.step ?? 1;
  const [dx, dy] = isPair(step) ? step : typeof step === "number" && step > 0 ? [step, step] : [NaN, NaN];
  if (!(dx! > 0) || !(dy! > 0)) return { spec, snapped: 0 };
  const xRange = isPair(s.xRange) ? s.xRange : [0, 0];
  const yRange = isPair(s.yRange) ? s.yRange : [0, 0];
  const [ox, oy] = isPair(grid.from) ? grid.from : [xRange[0], yRange[0]];
  let snapped = 0;
  const snap1 = (v: number, origin: number, d: number, always: boolean) => {
    const k = Math.round((v - origin) / d);
    const target = origin + k * d;
    if ((always || Math.abs(v - target) <= TOLERANCE * d) && Math.abs(v - target) > 1e-9) {
      snapped++;
      return Number(target.toFixed(6));
    }
    return v;
  };
  const snap = (p: unknown, always = false) =>
    isPair(p) ? [snap1(p[0], ox!, dx!, always), snap1(p[1], oy!, dy!, always)] : p;
  const corner = (p: unknown) => snap(p, true);
  const next = structuredClone(s);
  const list = (key: string) => (Array.isArray(next[key]) ? (next[key] as Record<string, unknown>[]) : []);
  for (const segment of list("segments")) {
    segment.from = corner(segment.from);
    segment.to = corner(segment.to);
  }
  for (const point of list("points")) point.at = snap(point.at);
  for (const circle of list("circles")) circle.center = snap(circle.center);
  for (const polygon of list("polygons"))
    if (Array.isArray(polygon.points)) polygon.points = polygon.points.map(corner);
  return { spec: next as DevAiFigureSpec, snapped };
}
