/**
 * 🔴 **2026-08-30 에 `.tmp-orca/` 에서 여기로 옮겼다.** `print-check` 항목
 *    `middle-dimension-outside` 가 이 파일을 **근거로 인용**하는데, `.tmp-orca/` 는
 *    gitignore 라 **다른 워크트리에서는 존재하지 않았다.** 그래서
 *    `PrintCheck.test.tsx` 의 「근거가 가리키는 파일은 실재한다」가 이 워크트리에서만
 *    초록이었다 — 파일이 **우연히 여기 있었기 때문**이다. 초3 파일럿이 딴 워크트리에서
 *    관문을 돌리다 잡았다. 「우리 컴퓨터에서 되는가와 배포본에서 되는가는 다른 질문」
 *    (2026-08-20)의 또 한 얼굴이다.
 *
 * 「치수의 두 끝점이 **같은 선분 위**에 있는가」를 좌표로 재어, 반올림 오차가
 * 얼마나 되는지 본다 — 문턱을 손으로 고르지 않고 **분포에서** 고르려는 것이다.
 *
 * 갈라야 하는 둘:
 *   ㉠ 진짜로 그 선분 위인데 반올림으로 조금 어긋난 점 (자기 현으로 봐야 한다)
 *   ㉡ 정말 선분 «옆»에 있는 점 (교차로 봐야 한다)
 * 둘이 겹치는 구간이 있으면 이 축으로는 못 가른다.
 */
import { generateMiddleProblem, registeredTypes } from "@/lib/middle/generate";

type XY = [number, number];
type Spec = {
  version?: number;
  points?: Record<string, XY>;
  segments?: Record<string, XY | string[] | { points: string[] }>;
  dimensions?: Record<string, { points: string[] }>;
};

function segPoints(v: unknown): string[] | null {
  if (Array.isArray(v) && v.length === 2 && typeof v[0] === "string")
    return v as string[];
  if (v && typeof v === "object" && "points" in v) {
    const p = (v as { points: unknown }).points;
    if (Array.isArray(p) && p.length === 2) return p as string[];
  }
  return null;
}

function distToLine(p: XY, a: XY, b: XY): number {
  const ex = b[0] - a[0];
  const ey = b[1] - a[1];
  const len = Math.hypot(ex, ey) || 1;
  return Math.abs((p[0] - a[0]) * ey - (p[1] - a[1]) * ex) / len;
}

function withinSegment(p: XY, a: XY, b: XY): boolean {
  const ex = b[0] - a[0];
  const ey = b[1] - a[1];
  const len2 = ex * ex + ey * ey || 1;
  const t = ((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / len2;
  return t >= -0.02 && t <= 1.02;
}

const gaps: number[] = [];
const near: number[] = [];
let checked = 0;
for (const t of registeredTypes()) {
  for (const seed of [20260829, 20260827]) {
    for (const v of [0, 1]) {
      let p;
      try {
        p = generateMiddleProblem(t.key, seed, v);
      } catch {
        continue;
      }
      const spec = p.figureSpec as Spec | null;
      if (!spec || spec.version !== 2 || !spec.points || !spec.dimensions)
        continue;
      const pts = spec.points;
      for (const dim of Object.values(spec.dimensions)) {
        const [n1, n2] = dim.points ?? [];
        const p1 = n1 ? pts[n1] : undefined;
        const p2 = n2 ? pts[n2] : undefined;
        if (!p1 || !p2) continue;
        checked += 1;
        for (const [, raw] of Object.entries(spec.segments ?? {})) {
          const sp = segPoints(raw);
          if (!sp) continue;
          const a = pts[sp[0]!];
          const b = pts[sp[1]!];
          if (!a || !b) continue;
          // 그 치수의 두 끝이 곧 이 선분의 두 끝이면 명백한 자기 현 — 셀 것 없다.
          const same =
            (sp[0] === n1 && sp[1] === n2) || (sp[0] === n2 && sp[1] === n1);
          if (same) continue;
          const d1 = distToLine(p1, a, b);
          const d2 = distToLine(p2, a, b);
          const worst = Math.max(d1, d2);
          if (!withinSegment(p1, a, b) || !withinSegment(p2, a, b)) continue;
          if (worst < 2.0) gaps.push(worst);
          else if (worst < 30) near.push(worst);
        }
      }
    }
  }
}
gaps.sort((a, b) => a - b);
near.sort((a, b) => a - b);
console.log(`치수 ${checked}자리를 봤다.`);
console.log(`\n㉠ 「거의 선분 위」(<2px) ${gaps.length}건`);
const q = (arr: number[], f: number) =>
  arr.length ? arr[Math.floor(f * (arr.length - 1))]! : NaN;
console.log(
  `   최소 ${q(gaps, 0).toFixed(6)} · 중앙 ${q(gaps, 0.5).toFixed(6)} · p90 ${q(gaps, 0.9).toFixed(6)} · 최대 ${q(gaps, 1).toFixed(6)}`,
);
const bins = [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2];
let prev = 0;
for (const b of bins) {
  console.log(
    `   [${prev}, ${b})  ${gaps.filter((g) => g >= prev && g < b).length}`,
  );
  prev = b;
}
console.log(
  `\n㉡ 「선분 옆」(2~30px) ${near.length}건 · 최소 ${q(near, 0).toFixed(3)}`,
);
