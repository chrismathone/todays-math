/**
 * 중2 「도형의 성질」 — RPM 2-2 «삼각형의 외심과 내심»(01~13 전량) +
 * «삼각형의 무게중심»(01~15 전량, 05B/6D 소유). 물결 6D 세션.
 *
 * ## 생성 규칙 — 정답을 먼저 뽑고 발문을 역산한다 (m2GeoTri.ts 와 동일 계약)
 *
 * 외심/내심 각도 유형은 **원 위에 세 점을 arc(=2×내각) 로 직접 배치**한다 —
 * 원주각 정리에 의해 예각·둔각 관계없이 항상 성립하므로, 그림과 값이 반드시
 * 일치한다(별도 공식 분기 불필요). 무게중심 유형은 중선의 발 D=(0,0), 꼭짓점
 * A=(0,h) 로 두어 중선 길이가 좌표에서 바로 h 로 떨어지게 한다.
 *
 * `facts` 에 발문의 원 수치와 함께 검산에 필요한 중간값을 남긴다 — 테스트는
 * 좌표(외심/내심 각) 또는 곱셈꼴로 재배열한 항등식(무게중심 길이/넓이)으로
 * **생성기와 다른 방식**으로 다시 잰다.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";
const BOOK = "2-2";
const MINOR_CIRC = "삼각형의 외심과 내심";
const MINOR_CENTROID = "삼각형의 무게중심";
const MINOR_SIMILAR = "도형의 닮음";
const MINOR_PYTHA = "피타고라스 정리";

/** 우리 Unit.section 정확한 이름 */
const SEC = {
  외심: "삼각형의 외심",
  내심: "삼각형의 내심",
  중점연결: "삼각형의 두 변의 중점을 연결한 선분",
  무게중심: "삼각형의 무게중심",
  닮음: "닮은 도형",
  피타고라스: "피타고라스 정리",
} as const;

const DEG = Math.PI / 180;

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

type XY = [number, number];

function dist(a: XY, b: XY): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function mid(a: XY, b: XY): XY {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function centroidOf(a: XY, b: XY, c: XY): XY {
  return [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3];
}

function lerp(a: XY, b: XY, t: number): XY {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** 두 직선(점+방향)의 교점 — 수학 좌표 (m2GeoTri.ts 와 동일). */
function inter(p: XY, d1: XY, q: XY, d2: XY): XY {
  const det = d1[0] * d2[1] - d1[1] * d2[0];
  const t = ((q[0] - p[0]) * d2[1] - (q[1] - p[1]) * d2[0]) / det;
  return [p[0] + t * d1[0], p[1] + t * d1[1]];
}

function polarPt(thetaDeg: number, cx: number, cy: number, r: number): XY {
  const t = thetaDeg * DEG;
  return [r2(cx + r * Math.cos(t)), r2(cy - r * Math.sin(t))];
}

/** 짝수만 뽑는다 — 각도를 2로 나눈 값이 정수가 되어야 하는 자리에 쓴다. */
function evenBetween(rng: Rng, lo: number, hi: number): number {
  return 2 * intBetween(rng, Math.ceil(lo / 2), Math.floor(hi / 2));
}

/**
 * 수학 좌표(y-위)를 SVG 좌표(y-아래)로 — 220×190 상자에 맞춘다 (m2GeoTri.ts 와 동일).
 */
function fitPts(pts: Record<string, XY>): Record<string, XY> {
  const xs = Object.values(pts).map((p) => p[0]);
  const ys = Object.values(pts).map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const m = 18;
  const boxW = 220;
  const boxH = 190;
  const s = Math.min(
    (boxW - 2 * m) / Math.max(maxX - minX, 1e-9),
    (boxH - 2 * m) / Math.max(maxY - minY, 1e-9),
  );
  const out: Record<string, XY> = {};
  for (const [k, [x, y]] of Object.entries(pts)) {
    out[k] = [r2(m + (x - minX) * s), r2(boxH - m - (y - minY) * s)];
  }
  return out;
}

function fitPtsBox(
  pts: Record<string, XY>,
  boxW: number,
  boxH: number,
): Record<string, XY> {
  const xs = Object.values(pts).map((p) => p[0]);
  const ys = Object.values(pts).map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const m = 16;
  const s = Math.min(
    (boxW - 2 * m) / Math.max(maxX - minX, 1e-9),
    (boxH - 2 * m) / Math.max(maxY - minY, 1e-9),
  );
  const out: Record<string, XY> = {};
  for (const [k, [x, y]] of Object.entries(pts)) {
    out[k] = [r2(m + (x - minX) * s), r2(boxH - m - (y - minY) * s)];
  }
  return out;
}

type Fig = Record<string, unknown>;

/** attempt — 조건을 만족할 때까지 다시 뽑는다. 소진되면 던진다. */
function attempt<T>(tries: number, f: () => T | null): T {
  for (let i = 0; i < tries; i += 1) {
    const v = f();
    if (v !== null) return v;
  }
  throw new Error("유형 생성 재시도 초과 — 매개변수 범위를 확인하십시오");
}

type Body = Pick<
  MidProblem,
  "content" | "answer" | "solution" | "facts" | "figureSpec"
>;

function def(
  minor: string,
  rpmType: string,
  rpmTitle: string,
  unitSection: string,
  difficulty: MidProblem["difficulty"],
  gen: (rng: Rng) => Body,
): TypeEntry {
  return {
    key: `${BOOK}|${minor}|${rpmType}`,
    grade: GRADE,
    unitSection,
    rpmBook: BOOK,
    rpmMinor: minor,
    rpmType,
    rpmTitle,
    handler: (rng) => ({
      grade: GRADE,
      unitSection,
      rpmBook: BOOK,
      rpmMinor: minor,
      rpmType,
      rpmTitle,
      difficulty,
      ...gen(rng),
    }),
  };
}

// ─────────────────────────────────────────────────────────────
// 외심 — 원 위에 세 점을 arc(=2×내각) 로 직접 배치한다.
// ─────────────────────────────────────────────────────────────

const O_CX = 120;
const O_CY = 95;
const O_R = 70;

/** angA,angB,angC(삼각형 세 내각, 합 180) → 원 위의 A,B,C,O. 원주각 정리로 항상 성립. */
function circumPts(
  angA: number,
  angB: number,
  angC: number,
): { A: XY; B: XY; C: XY; O: XY } {
  const thetaA = 90;
  const thetaB = thetaA + 2 * angC;
  const thetaC = thetaB + 2 * angA;
  return {
    A: polarPt(thetaA, O_CX, O_CY, O_R),
    B: polarPt(thetaB, O_CX, O_CY, O_R),
    C: polarPt(thetaC, O_CX, O_CY, O_R),
    O: [O_CX, O_CY],
  };
}

function circumSegments(): Record<string, unknown> {
  return {
    AB: ["A", "B"],
    BC: ["B", "C"],
    CA: ["C", "A"],
    OA: { points: ["O", "A"], ticks: 1 },
    OB: { points: ["O", "B"], ticks: 1 },
    OC: { points: ["O", "C"], ticks: 1 },
  };
}

function figCircum01(
  angA: number,
  angB: number,
  angC: number,
  p: number,
  q: number,
): Fig {
  const pts = circumPts(angA, angB, angC);
  return {
    version: 2,
    points: { A: pts.A, B: pts.B, C: pts.C, O: pts.O },
    circles: { c: { center: "O", radius: O_R } },
    segments: circumSegments(),
    angles: {
      angOAB: { vertex: "A", points: ["O", "B"], label: `${p}°` },
      angOBC: { vertex: "B", points: ["O", "C"], label: `${q}°` },
      angOCA: { vertex: "C", points: ["O", "A"], label: "x" },
    },
    labels: { A: "A", B: "B", C: "C", O: "O" },
  };
}

const RIGHT_EVEN_HYP: readonly (readonly [number, number, number])[] = [
  [6, 8, 10],
  [8, 6, 10],
  [12, 16, 20],
  [16, 12, 20],
  [18, 24, 30],
  [24, 18, 30],
  [10, 24, 26],
  [24, 10, 26],
  [16, 30, 34],
  [30, 16, 34],
  [14, 48, 50],
  [48, 14, 50],
] as const;

function figCircum02(p: number, q: number): Fig {
  const k = 150 / Math.max(p, q);
  const C0: XY = [0, 0];
  const A: XY = [0, q * k];
  const B: XY = [p * k, 0];
  const O = mid(A, B);
  const pts = fitPts({ A, B, C: C0, O });
  const radScaled = r2(dist(pts.O!, pts.C!));
  return {
    version: 2,
    points: pts,
    circles: { c: { center: "O", radius: radScaled } },
    segments: {
      AB: ["A", "B"],
      BC: ["B", "C"],
      CA: ["C", "A"],
      OA: { points: ["O", "A"], ticks: 1 },
      OB: { points: ["O", "B"], ticks: 1 },
      OC: { points: ["O", "C"], ticks: 1 },
    },
    angles: {
      rC: { vertex: "C", points: ["B", "A"], right: true },
    },
    labels: { A: "A", B: "B", C: "C", O: "O" },
  };
}

function figCircum03(angA: number, angB: number, angC: number): Fig {
  const pts = circumPts(angA, angB, angC);
  return {
    version: 2,
    points: { A: pts.A, B: pts.B, C: pts.C, O: pts.O },
    circles: { c: { center: "O", radius: O_R } },
    segments: circumSegments(),
    angles: {
      angA: { vertex: "A", points: ["B", "C"], label: `${angA}°` },
      angOBC: { vertex: "B", points: ["O", "C"], label: "x" },
    },
    labels: { A: "A", B: "B", C: "C", O: "O" },
  };
}

function figCircum04(
  angA: number,
  angB: number,
  angC: number,
  p: number,
  q: number,
): Fig {
  const pts = circumPts(angA, angB, angC);
  return {
    version: 2,
    points: { A: pts.A, B: pts.B, C: pts.C, O: pts.O },
    circles: { c: { center: "O", radius: O_R } },
    segments: circumSegments(),
    angles: {
      angOAB: { vertex: "A", points: ["O", "B"], label: `${p}°` },
      angOAC: { vertex: "A", points: ["O", "C"], label: `${q}°` },
      angBOC: { vertex: "O", points: ["B", "C"], label: "x" },
    },
    labels: { A: "A", B: "B", C: "C", O: "O" },
  };
}

function figCircum05(
  angA: number,
  angB: number,
  angC: number,
  b: number,
  c: number,
): Fig {
  const pts = circumPts(angA, angB, angC);
  return {
    version: 2,
    points: { A: pts.A, B: pts.B, C: pts.C, O: pts.O },
    circles: { c: { center: "O", radius: O_R } },
    segments: circumSegments(),
    angles: {
      angB: { vertex: "B", points: ["A", "C"], label: `${b}°` },
      angC: { vertex: "C", points: ["A", "B"], label: `${c}°` },
      angBOC: { vertex: "O", points: ["B", "C"], label: "x" },
    },
    labels: { A: "A", B: "B", C: "C", O: "O" },
  };
}

// ─────────────────────────────────────────────────────────────
// 내심
// ─────────────────────────────────────────────────────────────

function triFromBaseAngles(
  angB: number,
  angC: number,
  base = 170,
): { A: XY; B: XY; C: XY } {
  const B: XY = [0, 0];
  const C: XY = [base, 0];
  const A = inter(B, [Math.cos(angB * DEG), Math.sin(angB * DEG)], C, [
    -Math.cos(angC * DEG),
    Math.sin(angC * DEG),
  ]);
  return { A, B, C };
}

function incenterOf(A: XY, B: XY, C: XY): XY {
  const a = dist(B, C);
  const b = dist(C, A);
  const c = dist(A, B);
  const s = a + b + c;
  return [
    (a * A[0] + b * B[0] + c * C[0]) / s,
    (a * A[1] + b * B[1] + c * C[1]) / s,
  ];
}

function incenterSegments(): Record<string, unknown> {
  return {
    AB: ["A", "B"],
    BC: ["B", "C"],
    CA: ["C", "A"],
    AI: ["A", "I"],
    BI: ["B", "I"],
    CI: ["C", "I"],
  };
}

function figIncenter06(angB: number, angC: number, p: number, q: number): Fig {
  const { A, B, C } = triFromBaseAngles(angB, angC);
  const I = incenterOf(A, B, C);
  const pts = fitPts({ A, B, C, I });
  return {
    version: 2,
    points: pts,
    segments: incenterSegments(),
    angles: {
      angIAB: { vertex: "A", points: ["I", "B"], label: `${p}°` },
      angIBC: { vertex: "B", points: ["I", "C"], label: `${q}°` },
      angICA: { vertex: "C", points: ["I", "A"], label: "x" },
    },
    labels: { A: "A", B: "B", C: "C", I: "I" },
  };
}

function figIncenter07(angA: number, angB: number, angC: number): Fig {
  const { A, B, C } = triFromBaseAngles(angB, angC);
  const I = incenterOf(A, B, C);
  const pts = fitPts({ A, B, C, I });
  return {
    version: 2,
    points: pts,
    segments: incenterSegments(),
    angles: {
      angA: { vertex: "A", points: ["B", "C"], label: `${angA}°` },
      angBIC: { vertex: "I", points: ["B", "C"], label: "x" },
    },
    labels: { A: "A", B: "B", C: "C", I: "I" },
  };
}

function figIncenter08(m: number, angB: number, angC: number): Fig {
  const { A, B, C } = triFromBaseAngles(angB, angC);
  const I = incenterOf(A, B, C);
  const pts = fitPts({ A, B, C, I });
  return {
    version: 2,
    points: pts,
    segments: incenterSegments(),
    angles: {
      angA: { vertex: "A", points: ["B", "C"], label: "x" },
      angBIC: { vertex: "I", points: ["B", "C"], label: `${m}°` },
    },
    labels: { A: "A", B: "B", C: "C", I: "I" },
  };
}

function figIncenter09(b: number, c: number): Fig {
  const A: XY = [0, 0];
  const B: XY = [c, 0];
  const ang = 62 * DEG;
  const C: XY = [b * Math.cos(ang), b * Math.sin(ang)];
  const I = incenterOf(A, B, C);
  const dBC: XY = [C[0] - B[0], C[1] - B[1]];
  const D = inter(I, dBC, A, [B[0] - A[0], B[1] - A[1]]);
  const E = inter(I, dBC, A, [C[0] - A[0], C[1] - A[1]]);
  const pts = fitPts({ A, B, C, D, E, I });
  return {
    version: 2,
    points: pts,
    segments: {
      AB: ["A", "B"],
      BC: { points: ["B", "C"], parallel: 1 },
      CA: ["C", "A"],
      DE: { points: ["D", "E"], parallel: 1 },
    },
    labels: { A: "A", B: "B", C: "C", D: "D", E: "E", I: "I" },
  };
}

/**
 * 직각삼각형 ABC (∠C=90°) 의 내접원. 접점 D(BC)·E(CA)·F(AB).
 * 치수는 발문이 말하고 그림은 구조만 보인다(09 §4-20-b).
 */
function figRightIncircle(
  p: number,
  q: number,
  opts: { touch?: boolean; circum?: boolean } = {},
): Fig {
  const C0: XY = [0, 0];
  const B: XY = [p, 0];
  const A: XY = [0, q];
  const h = Math.hypot(p, q);
  const r = (p + q - h) / 2;
  const I: XY = [r, r];
  const D: XY = [r, 0];
  const E: XY = [0, r];
  const F = ((): XY => {
    const ux = A[0] - B[0];
    const uy = A[1] - B[1];
    const t = ((I[0] - B[0]) * ux + (I[1] - B[1]) * uy) / (ux * ux + uy * uy);
    return [B[0] + t * ux, B[1] + t * uy];
  })();
  const O = mid(A, B);
  const src: Record<string, XY> = { A, B, C: C0, I, D, E, F };
  if (opts.circum) {
    src.O = O;
    // 외접원은 빗변 반대쪽으로 불룩하다. 그 끝을 상자에 넣어야 viewBox 가 안 넘친다.
    src.Opp = [2 * O[0] - C0[0], 2 * O[1] - C0[1]];
  }
  const pts = fitPtsBox(src, 200, 168);
  delete pts.Opp;
  const rIn = dist(pts.I!, pts.D!);
  const fig: Fig = {
    version: 2,
    points: pts,
    circles: {
      inc: { center: "I", radius: r2(rIn) },
    },
    segments: {
      AB: ["A", "B"],
      BC: ["B", "C"],
      CA: ["C", "A"],
    },
    angles: {
      rC: { vertex: "C", points: ["B", "A"], right: true },
    },
    labels: { A: "A", B: "B", C: "C" },
  };
  if (opts.touch) {
    (fig.labels as Record<string, string>).D = "D";
    (fig.labels as Record<string, string>).E = "E";
    (fig.labels as Record<string, string>).F = "F";
  }
  if (opts.circum) {
    const rOut = dist(pts.O!, pts.C!);
    (fig.circles as Record<string, unknown>).out = {
      center: "O",
      radius: r2(rOut),
    };
  }
  return fig;
}

// ─────────────────────────────────────────────────────────────
// 무게중심 — D=(0,0)=BC 중점, A=(0,h) 로 두어 중선 길이가 좌표에서 h 로 떨어진다.
// ─────────────────────────────────────────────────────────────

function triMedian(
  w: number,
  h: number,
): { A: XY; B: XY; C: XY; D: XY; G: XY } {
  const A: XY = [0, h];
  const B: XY = [-w, 0];
  const C: XY = [w, 0];
  const D: XY = [0, 0];
  const G = centroidOf(A, B, C);
  return { A, B, C, D, G };
}

function figMidseg(w: number, h: number): Fig {
  const { A, B, C } = triMedian(w, h);
  const M = mid(A, B);
  const N = mid(A, C);
  const pts = fitPts({ A, B, C, M, N });
  return {
    version: 2,
    points: pts,
    segments: {
      AB: ["A", "B"],
      BC: { points: ["B", "C"], parallel: 1 },
      CA: ["C", "A"],
      MN: { points: ["M", "N"], parallel: 1 },
    },
    labels: { A: "A", B: "B", C: "C", M: "M", N: "N" },
  };
}

function figMidseg03(w: number, h: number): Fig {
  const { A, B, C, D } = triMedian(w, h);
  const M = mid(A, B);
  const N = mid(A, C);
  const P = mid(A, D);
  const pts = fitPts({ A, B, C, D, M, N, P });
  return {
    version: 2,
    points: pts,
    segments: {
      AB: ["A", "B"],
      BC: { points: ["B", "C"], parallel: 1 },
      CA: ["C", "A"],
      MN: { points: ["M", "N"], parallel: 1 },
      AD: ["A", "D"],
    },
    labels: { A: "A", B: "B", C: "C", D: "D", M: "M", N: "N", P: "P" },
  };
}

function figMidseg04(w: number, h: number): Fig {
  const { A, B, C } = triMedian(w, h);
  const M = mid(A, B);
  const N = mid(A, C);
  const P = mid(A, M);
  const Q = mid(A, N);
  const pts = fitPts({ A, B, C, M, N, P, Q });
  return {
    version: 2,
    points: pts,
    segments: {
      AB: ["A", "B"],
      BC: { points: ["B", "C"], parallel: 1 },
      CA: ["C", "A"],
      MN: { points: ["M", "N"], parallel: 1 },
      PQ: { points: ["P", "Q"], parallel: 1 },
    },
    labels: { A: "A", B: "B", C: "C", M: "M", N: "N", P: "P", Q: "Q" },
  };
}

function triSSS(a: number, b: number, c: number): { A: XY; B: XY; C: XY } {
  const B: XY = [0, 0];
  const C: XY = [a, 0];
  const ax = (c * c - b * b + a * a) / (2 * a);
  const ay = Math.sqrt(Math.max(c * c - ax * ax, 1e-9));
  return { A: [ax, ay], B, C };
}

function figMedial05(a: number, b: number, c: number): Fig {
  const { A, B, C } = triSSS(a, b, c);
  const M = mid(A, B);
  const N = mid(A, C);
  const P = mid(B, C);
  const pts = fitPts({ A, B, C, M, N, P });
  return {
    version: 2,
    points: pts,
    segments: {
      AB: ["A", "B"],
      BC: ["B", "C"],
      CA: ["C", "A"],
      MN: { points: ["M", "N"], dash: "4 3" },
      NP: { points: ["N", "P"], dash: "4 3" },
      PM: { points: ["P", "M"], dash: "4 3" },
    },
    labels: { A: "A", B: "B", C: "C", M: "M", N: "N", P: "P" },
  };
}

function figTrap07(p: number, q: number): Fig {
  const B: XY = [0, 0];
  const C: XY = [q, 0];
  const A: XY = [(q - p) / 2 - 15, 80];
  const D: XY = [A[0] + p, 80];
  const M = mid(A, B);
  const N = mid(D, C);
  const pts = fitPts({ A, B, C, D, M, N });
  return {
    version: 2,
    points: pts,
    segments: {
      AB: ["A", "B"],
      DC: ["D", "C"],
      AD: { points: ["A", "D"], parallel: 1 },
      BC: { points: ["B", "C"], parallel: 1 },
      MN: { points: ["M", "N"], parallel: 1 },
    },
    labels: { A: "A", B: "B", C: "C", D: "D", M: "M", N: "N" },
  };
}

function figMedian08(w: number, h: number): Fig {
  const { A, B, C, D } = triMedian(w, h);
  const pts = fitPts({ A, B, C, D });
  return {
    version: 2,
    points: pts,
    segments: {
      AB: ["A", "B"],
      BC: ["B", "C"],
      CA: ["C", "A"],
      AD: ["A", "D"],
    },
    labels: { A: "A", B: "B", C: "C", D: "D" },
  };
}

function figCentroid09(w: number, h: number): Fig {
  const { A, B, C, D, G } = triMedian(w, h);
  const pts = fitPts({ A, B, C, D, G });
  return {
    version: 2,
    points: pts,
    segments: {
      AB: ["A", "B"],
      BC: ["B", "C"],
      CA: ["C", "A"],
      AG: { points: ["A", "G"], ticks: 2 },
      GD: { points: ["G", "D"], ticks: 1 },
    },
    labels: { A: "A", B: "B", C: "C", D: "D", G: "G" },
  };
}

function figCentroid10(w: number, h: number, k: number): Fig {
  const { A, B, C, D, G } = triMedian(w, h);
  const P = lerp(A, B, k);
  const Q = lerp(A, C, k);
  const Gp = centroidOf(A, P, Q);
  const pts = fitPts({ A, B, C, D, G, P, Q, Gp });
  return {
    version: 2,
    points: pts,
    segments: {
      AB: ["A", "B"],
      BC: { points: ["B", "C"], parallel: 1 },
      CA: ["C", "A"],
      PQ: { points: ["P", "Q"], parallel: 1 },
      AD: ["A", "D"],
    },
    labels: {
      A: "A",
      B: "B",
      C: "C",
      D: "D",
      G: "G",
      P: "P",
      Q: "Q",
      Gp: "G'",
    },
  };
}

function figCentroid11(w: number, h: number): Fig {
  const { A, B, C, D, G } = triMedian(w, h);
  const E = mid(A, C);
  const pts = fitPts({ A, B, C, D, E, G });
  return {
    version: 2,
    points: pts,
    segments: {
      AB: ["A", "B"],
      BC: ["B", "C"],
      CA: ["C", "A"],
      AD: ["A", "D"],
      BE: ["B", "E"],
    },
    labels: { A: "A", B: "B", C: "C", D: "D", E: "E", G: "G" },
  };
}

function figCentroid12(w: number, h: number): Fig {
  const { A, B, C, D, G } = triMedian(w, h);
  const P = lerp(A, B, 2 / 3);
  const Q = lerp(A, C, 2 / 3);
  const pts = fitPts({ A, B, C, D, G, P, Q });
  return {
    version: 2,
    points: pts,
    segments: {
      AB: ["A", "B"],
      BC: { points: ["B", "C"], parallel: 1 },
      CA: ["C", "A"],
      AG: { points: ["A", "G"], ticks: 2 },
      GD: { points: ["G", "D"], ticks: 1 },
      PQ: { points: ["P", "Q"], parallel: 1 },
    },
    labels: { A: "A", B: "B", C: "C", D: "D", G: "G", P: "P", Q: "Q" },
  };
}

function figCentroid13(w: number, h: number): Fig {
  const { A, B, C, D, G } = triMedian(w, h);
  const pts = fitPts({ A, B, C, D, G });
  return {
    version: 2,
    points: pts,
    segments: {
      AB: ["A", "B"],
      BC: ["B", "C"],
      CA: ["C", "A"],
      AG: { points: ["A", "G"], ticks: 2 },
      GD: { points: ["G", "D"], ticks: 1 },
      GB: ["G", "B"],
      GC: ["G", "C"],
    },
    labels: { A: "A", B: "B", C: "C", D: "D", G: "G" },
  };
}

function figCentroid14(w: number, h: number): Fig {
  const { A, B, C, D, G } = triMedian(w, h);
  const pts = fitPts({ A, B, C, D, G });
  return {
    version: 2,
    points: pts,
    segments: {
      AB: ["A", "B"],
      BC: ["B", "C"],
      CA: ["C", "A"],
      AG: { points: ["A", "G"], ticks: 2 },
      GD: { points: ["G", "D"], ticks: 1 },
      GB: ["G", "B"],
    },
    regions: {
      shade: {
        boundary: [
          { seg: ["G", "B"] },
          { seg: ["B", "D"] },
          { seg: ["D", "G"] },
        ],
        fill: "#e8eef8",
      },
    },
    labels: { A: "A", B: "B", C: "C", D: "D", G: "G" },
  };
}

function figParallelogram15(d: number, ex: number, ey: number): Fig {
  const B: XY = [0, 0];
  const D: XY = [d, 0];
  const A: XY = [d / 2 - ex, ey];
  const C: XY = [d / 2 + ex, -ey];
  const M = mid(A, B);
  const P = inter(C, [M[0] - C[0], M[1] - C[1]], B, [1, 0]);
  const pts = fitPts({ A, B, C, D, M, P });
  return {
    version: 2,
    points: pts,
    segments: {
      AB: { points: ["A", "B"], parallel: 1 },
      DC: { points: ["D", "C"], parallel: 1 },
      AD: { points: ["A", "D"], parallel: 2 },
      BC: { points: ["B", "C"], parallel: 2 },
      BD: ["B", "D"],
      CM: ["C", "M"],
    },
    labels: { A: "A", B: "B", C: "C", D: "D", M: "M", P: "P" },
  };
}

// ─────────────────────────────────────────────────────────────
// 외심과 내심 (13유형)
// ─────────────────────────────────────────────────────────────

export const M2_CENTER_CIRC: TypeEntry[] = [
  def(MINOR_CIRC, "01", "삼각형의 외심", SEC.외심, "기본", (rng): Body => {
    const { angA, angB, angC } = attempt(200, () => {
      const a = intBetween(rng, 30, 80);
      const b = intBetween(rng, 30, 80);
      const c = 180 - a - b;
      return c >= 30 && c <= 80 ? { angA: a, angB: b, angC: c } : null;
    });
    const p = 90 - angC;
    const q = 90 - angA;
    const x = 90 - angB;
    return {
      content: `그림과 같이 점 $O$가 $\\triangle ABC$의 외심일 때, $\\angle OAB=${p}^\\circ$, $\\angle OBC=${q}^\\circ$이다. 이때 $\\angle OCA$의 크기를 구하시오.`,
      answer: `$${x}^\\circ$`,
      solution: `외심에서 세 꼭짓점에 이르는 거리가 같으므로 $\\triangle OAB$, $\\triangle OBC$, $\\triangle OCA$는 이등변삼각형이다.\n세 밑각의 합은 $\\angle OAB+\\angle OBC+\\angle OCA=90^\\circ$이므로 $\\angle OCA=90^\\circ-${p}^\\circ-${q}^\\circ=${x}^\\circ$이다.`,
      facts: { angA, angB, angC, p, q, x },
      figureSpec: figCircum01(angA, angB, angC, p, q),
    };
  }),

  def(MINOR_CIRC, "02", "직각삼각형의 외심", SEC.외심, "기본", (rng): Body => {
    const [p, q, c] = pick(rng, RIGHT_EVEN_HYP);
    const x = c / 2;
    return {
      content: `그림과 같이 $\\angle C=90^\\circ$인 직각삼각형 $ABC$의 외심을 $O$라 하자. $\\overline{BC}=${p}\\,\\mathrm{cm}$, $\\overline{CA}=${q}\\,\\mathrm{cm}$일 때, $\\overline{OA}$의 길이를 구하시오.`,
      answer: `$${x}\\,\\mathrm{cm}$`,
      solution: `직각삼각형의 외심은 빗변의 중점이다.\n피타고라스 정리에 의해 $\\overline{AB}=\\sqrt{${p}^2+${q}^2}=${c}\\,(\\mathrm{cm})$이므로 $\\overline{OA}=\\dfrac{1}{2}\\overline{AB}=${x}\\,(\\mathrm{cm})$이다.`,
      facts: { p, q, c, x },
      figureSpec: figCircum02(p, q),
    };
  }),

  def(MINOR_CIRC, "03", "둔각삼각형의 외심", SEC.외심, "응용", (rng): Body => {
    const { angA, angB, angC } = attempt(200, () => {
      const a = intBetween(rng, 100, 150);
      const rem = 180 - a;
      const b = intBetween(rng, 10, rem - 10);
      const c = rem - b;
      return { angA: a, angB: b, angC: c };
    });
    const x = angA - 90;
    return {
      content: `그림과 같이 $\\angle A=${angA}^\\circ$($90^\\circ$보다 크다)인 둔각삼각형 $ABC$의 외심을 $O$라 하자. $\\triangle OBC$가 이등변삼각형임을 이용하여 $\\angle OBC$의 크기를 구하시오.`,
      answer: `$${x}^\\circ$`,
      solution: `외심 $O$에서 $\\overline{OB}=\\overline{OC}$이므로 $\\triangle OBC$는 이등변삼각형이고, $\\angle A$가 둔각이면 $O$는 $\\triangle ABC$의 외부에 있다.\n$\\angle OBC=\\angle OCB=\\angle A-90^\\circ=${angA}^\\circ-90^\\circ=${x}^\\circ$이다.`,
      facts: { angA, angB, angC, x },
      figureSpec: figCircum03(angA, angB, angC),
    };
  }),

  def(
    MINOR_CIRC,
    "04",
    "삼각형의 외심이 주어질 때 각의 크기 구하기 ⑴",
    SEC.외심,
    "응용",
    (rng): Body => {
      const { angA, angB, angC } = attempt(200, () => {
        const a = intBetween(rng, 30, 80);
        const b = intBetween(rng, 30, 80);
        const c = 180 - a - b;
        return c >= 30 && c <= 80 ? { angA: a, angB: b, angC: c } : null;
      });
      const p = 90 - angC;
      const q = 90 - angB;
      const x = 2 * angA;
      return {
        content: `그림과 같이 점 $O$가 $\\triangle ABC$의 외심일 때, $\\angle OAB=${p}^\\circ$, $\\angle OAC=${q}^\\circ$이다. 이때 $\\angle BOC$의 크기를 구하시오.`,
        answer: `$${x}^\\circ$`,
        solution: `$\\angle A=\\angle OAB+\\angle OAC=${p}^\\circ+${q}^\\circ$이다.\n외심에서 세 꼭짓점까지의 거리가 같아 세 삼각형이 모두 이등변삼각형이므로 $\\angle BOC=2\\angle A=${x}^\\circ$이다.`,
        facts: { angA, angB, angC, p, q, x },
        figureSpec: figCircum04(angA, angB, angC, p, q),
      };
    },
  ),

  def(
    MINOR_CIRC,
    "05",
    "삼각형의 외심이 주어질 때 각의 크기 구하기 ⑵",
    SEC.외심,
    "응용",
    (rng): Body => {
      const { angA, angB, angC } = attempt(200, () => {
        const b = intBetween(rng, 20, 70);
        const c = intBetween(rng, 20, 70);
        const a = 180 - b - c;
        return a >= 20 && a < 90 ? { angA: a, angB: b, angC: c } : null;
      });
      const x = 2 * angA;
      return {
        content: `그림과 같이 점 $O$가 $\\triangle ABC$의 외심일 때, $\\angle B=${angB}^\\circ$, $\\angle C=${angC}^\\circ$이다. 이때 $\\angle BOC$의 크기를 구하시오.`,
        answer: `$${x}^\\circ$`,
        solution: `삼각형의 세 내각의 합이 $180^\\circ$이므로 $\\angle A=180^\\circ-${angB}^\\circ-${angC}^\\circ=${angA}^\\circ$이다.\n외심에서 세 꼭짓점까지의 거리가 같아 세 삼각형이 모두 이등변삼각형이므로 $\\angle BOC=2\\angle A=${x}^\\circ$이다.`,
        facts: { angA, angB, angC, x },
        figureSpec: figCircum05(angA, angB, angC, angB, angC),
      };
    },
  ),

  def(MINOR_CIRC, "06", "삼각형의 내심", SEC.내심, "기본", (rng): Body => {
    const { angB, angC } = attempt(200, () => {
      const b = evenBetween(rng, 30, 70);
      const c = evenBetween(rng, 30, 70);
      const a = 180 - b - c;
      return a >= 20 && a <= 100 ? { angB: b, angC: c } : null;
    });
    const angA = 180 - angB - angC;
    const p = angA / 2;
    const q = angB / 2;
    const x = angC / 2;
    return {
      content: `그림과 같이 점 $I$가 $\\triangle ABC$의 내심일 때, $\\angle IAB=${p}^\\circ$, $\\angle IBC=${q}^\\circ$이다. 이때 $\\angle ICA$의 크기를 구하시오.`,
      answer: `$${x}^\\circ$`,
      solution: `내심에서 세 변에 이르는 거리가 같으므로 $\\overline{AI}$, $\\overline{BI}$, $\\overline{CI}$는 각각 $\\angle A$, $\\angle B$, $\\angle C$를 이등분한다.\n삼각형의 세 내각의 합이 $180^\\circ$이므로 $\\angle IAB+\\angle IBC+\\angle ICA=90^\\circ$이다.\n따라서 $\\angle ICA=90^\\circ-${p}^\\circ-${q}^\\circ=${x}^\\circ$이다.`,
      facts: { angA, angB, angC, p, q, x },
      figureSpec: figIncenter06(angB, angC, p, q),
    };
  }),

  def(
    MINOR_CIRC,
    "07",
    "삼각형의 내심이 주어질 때 각의 크기 구하기 ⑴",
    SEC.내심,
    "응용",
    (rng): Body => {
      const angA = evenBetween(rng, 30, 120);
      const rem = 180 - angA;
      const angB = intBetween(rng, 15, rem - 15);
      const angC = rem - angB;
      const x = 90 + angA / 2;
      return {
        content: `그림과 같이 점 $I$가 $\\triangle ABC$의 내심이고 $\\angle A=${angA}^\\circ$일 때, $\\angle BIC$의 크기를 구하시오.`,
        answer: `$${x}^\\circ$`,
        solution: `$\\angle IBC=\\dfrac{1}{2}\\angle B$, $\\angle ICB=\\dfrac{1}{2}\\angle C$이므로 $\\triangle IBC$에서\n$\\angle BIC=180^\\circ-\\dfrac{1}{2}(\\angle B+\\angle C)=180^\\circ-\\dfrac{1}{2}(180^\\circ-${angA}^\\circ)=90^\\circ+${angA / 2}^\\circ=${x}^\\circ$이다.`,
        facts: { angA, angB, angC, x },
        figureSpec: figIncenter07(angA, angB, angC),
      };
    },
  ),

  def(
    MINOR_CIRC,
    "08",
    "삼각형의 내심이 주어질 때 각의 크기 구하기 ⑵",
    SEC.내심,
    "응용",
    (rng): Body => {
      const angA = evenBetween(rng, 30, 120);
      const rem = 180 - angA;
      const angB = intBetween(rng, 15, rem - 15);
      const angC = rem - angB;
      const m = 90 + angA / 2;
      const x = angA;
      return {
        content: `그림과 같이 점 $I$가 $\\triangle ABC$의 내심이고 $\\angle BIC=${m}^\\circ$일 때, $\\angle A$의 크기를 구하시오.`,
        answer: `$${x}^\\circ$`,
        solution: `$\\angle BIC=90^\\circ+\\dfrac{1}{2}\\angle A$이므로 $\\angle A=2(\\angle BIC-90^\\circ)=2(${m}^\\circ-90^\\circ)=${x}^\\circ$이다.`,
        facts: { angA, angB, angC, m, x },
        figureSpec: figIncenter08(m, angB, angC),
      };
    },
  ),

  def(
    MINOR_CIRC,
    "09",
    "삼각형의 내심과 평행선",
    SEC.내심,
    "응용",
    (rng): Body => {
      const c = intBetween(rng, 6, 16);
      const b = attempt(60, () => {
        const v = intBetween(rng, 6, 16);
        return v === c ? null : v;
      });
      const x = b + c;
      return {
        content: `그림과 같이 점 $I$가 $\\triangle ABC$의 내심이고, $I$를 지나 $\\overline{BC}$에 평행한 직선이 $\\overline{AB}$, $\\overline{AC}$와 만나는 점을 각각 $D$, $E$라 하자. $\\overline{AB}=${c}\\,\\mathrm{cm}$, $\\overline{AC}=${b}\\,\\mathrm{cm}$일 때, $\\triangle ADE$의 둘레의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `$\\overline{DE}\\parallel\\overline{BC}$이므로 $\\angle DIB=\\angle IBC$(엇각)이고, $\\overline{BI}$는 $\\angle B$를 이등분하므로 $\\angle DBI=\\angle IBC$이다.\n따라서 $\\angle DIB=\\angle DBI$이므로 $\\overline{DB}=\\overline{DI}$이고, 같은 방법으로 $\\overline{EC}=\\overline{EI}$이다.\n$\\triangle ADE$의 둘레의 길이는 $\\overline{AD}+\\overline{DE}+\\overline{EA}=\\overline{AD}+(\\overline{DI}+\\overline{IE})+\\overline{EA}=(\\overline{AD}+\\overline{DB})+(\\overline{EC}+\\overline{EA})=\\overline{AB}+\\overline{AC}=${c}+${b}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { b, c, x },
        figureSpec: figIncenter09(b, c),
      };
    },
  ),

  def(
    MINOR_CIRC,
    "10",
    "삼각형의 넓이와 내접원의 반지름의 길이",
    SEC.내심,
    "응용",
    (rng): Body => {
      const [p, q, h] = pick(rng, RIGHT_EVEN_HYP);
      const x = (p + q - h) / 2;
      return {
        content: `그림과 같이 $\\angle C=90^\\circ$인 직각삼각형 $ABC$의 내접원의 반지름의 길이를 $r$이라 하자. $\\overline{BC}=${p}\\,\\mathrm{cm}$, $\\overline{CA}=${q}\\,\\mathrm{cm}$일 때, $r$의 값을 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `피타고라스 정리에 의해 $\\overline{AB}=\\sqrt{${p}^2+${q}^2}=${h}\\,(\\mathrm{cm})$이다.\n직각삼각형의 넓이는 $\\dfrac{1}{2}\\times${p}\\times${q}$이고, 내접원의 반지름을 이용하면 넓이는 $\\dfrac{1}{2}r(${p}+${q}+${h})$이므로 두 식이 같다.\n따라서 $r=\\dfrac{${p}+${q}-${h}}{2}=${x}$이다.`,
        facts: { p, q, h, x },
        figureSpec: figRightIncircle(p, q),
      };
    },
  ),

  def(
    MINOR_CIRC,
    "11",
    "삼각형의 내접원과 접선의 길이",
    SEC.내심,
    "심화하",
    (rng): Body => {
      const [p, q, h] = pick(rng, RIGHT_EVEN_HYP);
      const r = (p + q - h) / 2;
      const x = q - r;
      return {
        content: `그림과 같이 $\\angle C=90^\\circ$인 직각삼각형 $ABC$의 내접원이 $\\overline{AB}$, $\\overline{BC}$, $\\overline{CA}$와 접하는 점을 각각 $F$, $D$, $E$라 하자. $\\overline{BC}=${p}\\,\\mathrm{cm}$, $\\overline{CA}=${q}\\,\\mathrm{cm}$일 때, $\\overline{AF}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `한 점에서 원에 그은 두 접선의 길이는 같으므로 $\\overline{CD}=\\overline{CE}$이고, $\\angle C=90^\\circ$이므로 사각형 $CDIE$는 정사각형이다. 따라서 $\\overline{CE}=r=\\dfrac{${p}+${q}-\\sqrt{${p}^2+${q}^2}}{2}=${r}\\,(\\mathrm{cm})$이다.\n$\\overline{AE}=\\overline{CA}-\\overline{CE}=${q}-${r}=${x}\\,(\\mathrm{cm})$이고, $\\overline{AF}=\\overline{AE}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { p, q, h, r, x },
        figureSpec: figRightIncircle(p, q, { touch: true }),
      };
    },
  ),

  def(
    MINOR_CIRC,
    "12",
    "삼각형의 외심과 내심",
    SEC.내심,
    "심화하",
    (rng): Body => {
      const { b, c } = attempt(200, () => {
        const bb = evenBetween(rng, 40, 90);
        const cc = evenBetween(rng, 20, bb - 2);
        return cc >= 20 ? { b: bb, c: cc } : null;
      });
      const x = (b - c) / 2;
      return {
        content: `점 $O$, $I$가 각각 $\\triangle ABC$의 외심, 내심이다. $\\angle B=${b}^\\circ$, $\\angle C=${c}^\\circ$($\\angle B>\\angle C$)일 때, $\\angle OAI$의 크기를 구하시오.`,
        answer: `$${x}^\\circ$`,
        solution: `$\\overline{OA}=\\overline{OB}$이므로 $\\triangle OAB$는 이등변삼각형이고 $\\angle OAB=90^\\circ-\\angle C$이다.\n$\\overline{AI}$는 $\\angle A$를 이등분하므로 $\\angle IAB=\\dfrac{1}{2}\\angle A=90^\\circ-\\dfrac{1}{2}(\\angle B+\\angle C)$이다.\n$\\angle OAI=\\angle OAB-\\angle IAB=\\left(90^\\circ-\\angle C\\right)-\\left(90^\\circ-\\dfrac{\\angle B+\\angle C}{2}\\right)=\\dfrac{\\angle B-\\angle C}{2}=\\dfrac{${b}^\\circ-${c}^\\circ}{2}=${x}^\\circ$이다.`,
        facts: { b, c, x },
        figureSpec: null,
      };
    },
  ),

  def(
    MINOR_CIRC,
    "13",
    "직각삼각형의 외접원과 내접원",
    SEC.외심,
    "심화하",
    (rng): Body => {
      const EVEN_SUM: readonly (readonly [number, number, number])[] = [
        [6, 8, 10],
        [10, 24, 26],
        [24, 10, 26],
        [16, 30, 34],
        [30, 16, 34],
        [14, 48, 50],
        [18, 24, 30],
        [24, 18, 30],
        [12, 16, 20],
        [16, 12, 20],
      ] as const;
      const [p, q, h] = pick(rng, EVEN_SUM);
      const x = (p + q) / 2;
      return {
        content: `그림과 같이 $\\angle C=90^\\circ$인 직각삼각형 $ABC$의 외접원의 반지름의 길이를 $R$, 내접원의 반지름의 길이를 $r$이라 하자. $\\overline{BC}=${p}\\,\\mathrm{cm}$, $\\overline{CA}=${q}\\,\\mathrm{cm}$일 때, $R+r$의 값을 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `피타고라스 정리에 의해 $\\overline{AB}=\\sqrt{${p}^2+${q}^2}=${h}\\,(\\mathrm{cm})$이다.\n직각삼각형의 외접원의 반지름은 빗변의 절반이므로 $R=\\dfrac{${h}}{2}$이고, 내접원의 반지름은 $r=\\dfrac{${p}+${q}-${h}}{2}$이다.\n따라서 $R+r=\\dfrac{${h}}{2}+\\dfrac{${p}+${q}-${h}}{2}=\\dfrac{${p}+${q}}{2}=${x}$이다.`,
        facts: { p, q, h, x },
        figureSpec: figRightIncircle(p, q, { circum: true }),
      };
    },
  ),
];

// ─────────────────────────────────────────────────────────────
// 삼각형의 무게중심 (15유형)
// ─────────────────────────────────────────────────────────────

export const M2_CENTER_CENTROID: TypeEntry[] = [
  def(
    MINOR_CENTROID,
    "01",
    "삼각형의 두 변의 중점을 연결한 선분의 성질⑴",
    SEC.중점연결,
    "기본",
    (rng): Body => {
      const a = evenBetween(rng, 12, 40);
      const h = intBetween(rng, 60, 100);
      const w = a / 2;
      const x = a / 2;
      return {
        content: `그림과 같이 $\\triangle ABC$에서 $\\overline{AB}$, $\\overline{AC}$의 중점을 각각 $M$, $N$이라 하자. $\\overline{BC}=${a}\\,\\mathrm{cm}$일 때, $\\overline{MN}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `삼각형의 두 변의 중점을 연결한 선분은 나머지 한 변과 평행하고 그 길이는 나머지 한 변의 길이의 $\\dfrac{1}{2}$이다.\n따라서 $\\overline{MN}=\\dfrac{1}{2}\\overline{BC}=\\dfrac{1}{2}\\times${a}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { a, x },
        figureSpec: figMidseg(w, h),
      };
    },
  ),

  def(
    MINOR_CENTROID,
    "02",
    "삼각형의 두 변의 중점을 연결한 선분의 성질⑵",
    SEC.중점연결,
    "기본",
    (rng): Body => {
      const n = intBetween(rng, 6, 20);
      const h = intBetween(rng, 60, 100);
      const x = 2 * n;
      return {
        content: `그림과 같이 $\\triangle ABC$에서 $\\overline{AB}$, $\\overline{AC}$의 중점을 각각 $M$, $N$이라 하자. $\\overline{MN}=${n}\\,\\mathrm{cm}$일 때, $\\overline{BC}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `삼각형의 두 변의 중점을 연결한 선분의 길이는 나머지 한 변의 길이의 $\\dfrac{1}{2}$이다.\n따라서 $\\overline{BC}=2\\overline{MN}=2\\times${n}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { n, x },
        figureSpec: figMidseg(n, h),
      };
    },
  ),

  def(
    MINOR_CENTROID,
    "03",
    "삼각형의 두 변의 중점을 연결한 선분의 성질의 응용⑴",
    SEC.중점연결,
    "응용",
    (rng): Body => {
      const h = evenBetween(rng, 20, 80);
      const w = intBetween(rng, 30, 70);
      const x = h / 2;
      return {
        content: `그림과 같이 $\\triangle ABC$에서 $\\overline{AB}$, $\\overline{AC}$의 중점을 각각 $M$, $N$이라 하고, 중선 $\\overline{AD}$와 $\\overline{MN}$의 교점을 $P$라 하자. $\\overline{AD}=${h}\\,\\mathrm{cm}$일 때, $\\overline{AP}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `$\\triangle AMN$은 $\\triangle ABC$와 닮음비 $1:2$인 닮은 도형이고 $\\overline{AD}$는 $\\overline{BC}$의 중점을 지나므로, $\\overline{MN}$은 $\\overline{AD}$를 이등분한다.\n따라서 $\\overline{AP}=\\dfrac{1}{2}\\overline{AD}=\\dfrac{1}{2}\\times${h}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { h, x },
        figureSpec: figMidseg03(w, h),
      };
    },
  ),

  def(
    MINOR_CENTROID,
    "04",
    "삼각형의 두 변의 중점을 연결한 선분의 성질의 응용⑵",
    SEC.중점연결,
    "응용",
    (rng): Body => {
      const a = 4 * intBetween(rng, 4, 15);
      const w = a / 2;
      // 🔴 그림 높이를 **밑변에 비례**시킨다. `fitPts` 는 가로세로 비를 지키므로
      //    `h` 를 밑변과 따로 뽑으면 바늘처럼 길쭉한 판이 나오고, 그때 배율이
      //    세로에 묶여 $\overline{PQ}$(=$w/2$ 단위)가 렌더러의 표시 최소 길이
      //    아래로 내려간다 — 실측 9.33px, 「too short for its tick/parallel marks」.
      //    `h ≤ 1.674w` 면 배율이 늘 가로에 묶여 $\overline{PQ}$ 가 46px 로 고정된다.
      //    뽑는 횟수·차례는 그대로라 발문·정답·해설·facts 는 한 글자도 안 바뀐다.
      const h = Math.round((w * intBetween(rng, 10, 16)) / 10);
      const x = a / 4;
      return {
        content: `그림과 같이 $\\triangle ABC$에서 $\\overline{AB}$, $\\overline{AC}$의 중점을 각각 $M$, $N$이라 하고, $\\overline{AM}$, $\\overline{AN}$의 중점을 각각 $P$, $Q$라 하자. $\\overline{BC}=${a}\\,\\mathrm{cm}$일 때, $\\overline{PQ}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `$\\overline{MN}=\\dfrac{1}{2}\\overline{BC}=\\dfrac{1}{2}\\times${a}$이고, 같은 방법으로 $\\overline{PQ}=\\dfrac{1}{2}\\overline{MN}$이다.\n따라서 $\\overline{PQ}=\\dfrac{1}{4}\\overline{BC}=\\dfrac{1}{4}\\times${a}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { a, x },
        figureSpec: figMidseg04(w, h),
      };
    },
  ),

  def(
    MINOR_CENTROID,
    "05",
    "삼각형의 세 변의 중점을 연결하여 만든 삼각형",
    SEC.중점연결,
    "응용",
    (rng): Body => {
      const [a, b, c] = attempt(300, () => {
        const aa = evenBetween(rng, 10, 30);
        const bb = evenBetween(rng, 10, 30);
        const cc = evenBetween(rng, 10, 30);
        if (new Set([aa, bb, cc]).size !== 3) return null;
        if (aa + bb <= cc || bb + cc <= aa || cc + aa <= bb) return null;
        return [aa, bb, cc] as const;
      });
      const x = (a + b + c) / 2;
      return {
        content: `그림과 같이 $\\triangle ABC$에서 $\\overline{AB}$, $\\overline{BC}$, $\\overline{CA}$의 중점을 각각 $M$, $P$, $N$이라 하자. $\\overline{BC}=${a}\\,\\mathrm{cm}$, $\\overline{CA}=${b}\\,\\mathrm{cm}$, $\\overline{AB}=${c}\\,\\mathrm{cm}$일 때, $\\triangle MNP$의 둘레의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `$\\overline{MN}=\\dfrac{1}{2}\\overline{BC}$, $\\overline{NP}=\\dfrac{1}{2}\\overline{AB}$, $\\overline{PM}=\\dfrac{1}{2}\\overline{CA}$이므로 $\\triangle MNP$의 둘레의 길이는 $\\triangle ABC$의 둘레의 길이의 $\\dfrac{1}{2}$이다.\n따라서 둘레의 길이는 $\\dfrac{1}{2}(${a}+${b}+${c})=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { a, b, c, x },
        figureSpec: figMedial05(a, b, c),
      };
    },
  ),

  def(
    MINOR_CENTROID,
    "06",
    "사각형의 네 변의 중점을 연결하여 만든 사각형",
    SEC.중점연결,
    "응용",
    (rng): Body => {
      const p = evenBetween(rng, 10, 30);
      const q = evenBetween(rng, 10, 30);
      const x = p + q;
      return {
        content: `사각형 $ABCD$의 네 변 $\\overline{AB}$, $\\overline{BC}$, $\\overline{CD}$, $\\overline{DA}$의 중점을 각각 $P$, $Q$, $R$, $S$라 하자. 두 대각선 $\\overline{AC}=${p}\\,\\mathrm{cm}$, $\\overline{BD}=${q}\\,\\mathrm{cm}$일 때, 사각형 $PQRS$의 둘레의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `$\\triangle ABC$에서 $\\overline{PQ}=\\dfrac{1}{2}\\overline{AC}$이고, 같은 방법으로 $\\overline{RS}=\\dfrac{1}{2}\\overline{AC}$, $\\overline{QR}=\\overline{SP}=\\dfrac{1}{2}\\overline{BD}$이다.\n따라서 사각형 $PQRS$의 둘레의 길이는 $\\overline{AC}+\\overline{BD}=${p}+${q}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { p, q, x },
        figureSpec: null,
      };
    },
  ),

  def(
    MINOR_CENTROID,
    "07",
    "사다리꼴의 두 변의 중점을 연결한 선분의 성질",
    SEC.중점연결,
    "응용",
    (rng): Body => {
      const { p, q } = attempt(200, () => {
        const pp = evenBetween(rng, 10, 30);
        const qq = evenBetween(rng, pp + 4, 50);
        return { p: pp, q: qq };
      });
      const x = (p + q) / 2;
      return {
        content: `그림과 같이 $\\overline{AD}\\parallel\\overline{BC}$인 사다리꼴 $ABCD$에서 $\\overline{AB}$, $\\overline{DC}$의 중점을 각각 $M$, $N$이라 하자. $\\overline{AD}=${p}\\,\\mathrm{cm}$, $\\overline{BC}=${q}\\,\\mathrm{cm}$일 때, $\\overline{MN}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `사다리꼴에서 두 변의 중점을 연결한 선분의 길이는 두 밑변의 길이의 합의 $\\dfrac{1}{2}$이다.\n따라서 $\\overline{MN}=\\dfrac{1}{2}(\\overline{AD}+\\overline{BC})=\\dfrac{1}{2}(${p}+${q})=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { p, q, x },
        figureSpec: figTrap07(p, q),
      };
    },
  ),

  def(
    MINOR_CENTROID,
    "08",
    "삼각형의 중선의 성질",
    SEC.무게중심,
    "기본",
    (rng): Body => {
      const w = intBetween(rng, 5, 15);
      const h = evenBetween(rng, 8, 24);
      const S = w * h;
      const x = S / 2;
      return {
        content: `그림과 같이 $\\triangle ABC$에서 $\\overline{BC}$의 중점을 $D$라 하자. $\\triangle ABC$의 넓이가 $${S}\\,\\mathrm{cm}^2$일 때, $\\triangle ABD$의 넓이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}^2$`,
        solution: `중선 $\\overline{AD}$는 $\\triangle ABC$의 넓이를 이등분한다($\\overline{BD}=\\overline{DC}$이고 높이가 같으므로 두 삼각형의 넓이가 같다).\n따라서 $\\triangle ABD=\\dfrac{1}{2}\\triangle ABC=\\dfrac{1}{2}\\times${S}=${x}\\,(\\mathrm{cm}^2)$이다.`,
        facts: { w, h, S, x },
        figureSpec: figMedian08(w, h),
      };
    },
  ),

  def(
    MINOR_CENTROID,
    "09",
    "삼각형의 무게중심의 성질",
    SEC.무게중심,
    "기본",
    (rng): Body => {
      const h = 3 * intBetween(rng, 4, 16);
      const w = intBetween(rng, 30, 70);
      const x = (2 * h) / 3;
      return {
        content: `그림과 같이 점 $G$가 $\\triangle ABC$의 무게중심이고 $\\overline{AD}$가 중선일 때, $\\overline{AD}=${h}\\,\\mathrm{cm}$이다. 이때 $\\overline{AG}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `무게중심은 각 중선을 꼭짓점으로부터 $2:1$로 내분한다.\n따라서 $\\overline{AG}=\\dfrac{2}{3}\\overline{AD}=\\dfrac{2}{3}\\times${h}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { h, x },
        figureSpec: figCentroid09(w, h),
      };
    },
  ),

  def(
    MINOR_CENTROID,
    "10",
    "두 삼각형의 무게중심 길이",
    SEC.무게중심,
    "심화하",
    (rng): Body => {
      const [m, n] = pick(rng, [
        [1, 1],
        [1, 2],
        [2, 1],
        [1, 3],
        [2, 3],
        [3, 2],
      ] as const);
      const j = intBetween(rng, 2, 6);
      const h = 3 * (m + n) * j;
      const w = intBetween(rng, 30, 70);
      const g = 2 * (m + n) * j;
      const x = 2 * j * m;
      const k = m / (m + n);
      return {
        content: `그림과 같이 $\\triangle ABC$에서 $\\overline{DE}\\parallel\\overline{BC}$이고 $\\overline{AD}:\\overline{DB}=${m}:${n}$이다. $\\triangle ABC$의 무게중심을 $G$, $\\triangle ADE$의 무게중심을 $G'$이라 하자. $\\overline{AG}=${g}\\,\\mathrm{cm}$일 때, $\\overline{AG'}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `$\\overline{DE}\\parallel\\overline{BC}$이므로 $\\triangle ADE\\sim\\triangle ABC$(닮음비 $\\overline{AD}:\\overline{AB}=${m}:${m + n}$)이고, 두 삼각형의 무게중심은 모두 중선 $\\overline{AM}$ 위에 있다.\n닮음의 중심이 $A$이므로 $\\overline{AG'}=\\dfrac{${m}}{${m + n}}\\overline{AG}=\\dfrac{${m}}{${m + n}}\\times${g}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { m, n, j, h, w, g, x },
        figureSpec: figCentroid10(w, h, k),
      };
    },
  ),

  def(
    MINOR_CENTROID,
    "11",
    "삼각형의 무게중심의 응용 ⑴",
    SEC.무게중심,
    "응용",
    (rng): Body => {
      const s = intBetween(rng, 1, 6);
      const t = 2 * s;
      const w = 4 * t;
      const h = 9 * t;
      const p = 6 * t;
      const q = 5 * t;
      const x = 11 * s;
      return {
        content: `그림과 같이 두 중선 $\\overline{AD}$, $\\overline{BE}$의 교점을 $G$라 하자. $\\overline{AG}=${p}\\,\\mathrm{cm}$, $\\overline{BG}=${q}\\,\\mathrm{cm}$일 때, $\\overline{GD}+\\overline{GE}$의 값을 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `$G$는 $\\triangle ABC$의 무게중심이므로 $\\overline{AG}:\\overline{GD}=2:1$, $\\overline{BG}:\\overline{GE}=2:1$이다.\n따라서 $\\overline{GD}=\\dfrac{1}{2}\\overline{AG}=\\dfrac{${p}}{2}$, $\\overline{GE}=\\dfrac{1}{2}\\overline{BG}=\\dfrac{${q}}{2}$이므로 $\\overline{GD}+\\overline{GE}=\\dfrac{${p}+${q}}{2}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { s, t, w, h, p, q, x },
        figureSpec: figCentroid11(w, h),
      };
    },
  ),

  def(
    MINOR_CENTROID,
    "12",
    "삼각형의 무게중심의 응용 ⑵",
    SEC.무게중심,
    "응용",
    (rng): Body => {
      const w = 3 * intBetween(rng, 4, 14);
      const h = intBetween(rng, 40, 90);
      const a = 2 * w;
      const x = (4 * w) / 3;
      return {
        content: `그림과 같이 점 $G$가 $\\triangle ABC$의 무게중심이고, $G$를 지나 $\\overline{BC}$에 평행한 직선이 $\\overline{AB}$, $\\overline{AC}$와 만나는 점을 각각 $P$, $Q$라 하자. $\\overline{BC}=${a}\\,\\mathrm{cm}$일 때, $\\overline{PQ}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `무게중심 $G$는 중선을 꼭짓점에서 $2:1$로 내분하므로 $\\overline{AG}:\\overline{AD}=2:3$이고, $\\triangle APQ\\sim\\triangle ABC$(닮음비 $2:3$)이다.\n따라서 $\\overline{PQ}=\\dfrac{2}{3}\\overline{BC}=\\dfrac{2}{3}\\times${a}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { w, h, a, x },
        figureSpec: figCentroid12(w, h),
      };
    },
  ),

  def(
    MINOR_CENTROID,
    "13",
    "삼각형의 무게중심과 넓이",
    SEC.무게중심,
    "응용",
    (rng): Body => {
      const w = 3 * intBetween(rng, 3, 10);
      const h = intBetween(rng, 10, 30);
      const S = w * h;
      const x = S / 3;
      return {
        content: `그림과 같이 점 $G$가 $\\triangle ABC$의 무게중심이다. $\\triangle ABC$의 넓이가 $${S}\\,\\mathrm{cm}^2$일 때, $\\triangle GBC$의 넓이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}^2$`,
        solution: `무게중심 $G$는 세 중선에 의해 $\\triangle ABC$를 넓이가 같은 세 삼각형 $\\triangle GAB$, $\\triangle GBC$, $\\triangle GCA$로 나눈다.\n따라서 $\\triangle GBC=\\dfrac{1}{3}\\triangle ABC=\\dfrac{1}{3}\\times${S}=${x}\\,(\\mathrm{cm}^2)$이다.`,
        facts: { w, h, S, x },
        figureSpec: figCentroid13(w, h),
      };
    },
  ),

  def(
    MINOR_CENTROID,
    "14",
    "두 삼각형의 무게중심 넓이",
    SEC.무게중심,
    "응용",
    (rng): Body => {
      const w = 6 * intBetween(rng, 2, 8);
      const h = intBetween(rng, 8, 24);
      const S = w * h;
      const x = S / 6;
      return {
        content: `그림과 같이 점 $G$가 $\\triangle ABC$의 무게중심이고 $\\overline{BC}$의 중점을 $D$라 하자. $\\triangle ABC$의 넓이가 $${S}\\,\\mathrm{cm}^2$일 때, $\\triangle GBD$의 넓이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}^2$`,
        solution: `무게중심 $G$는 $\\triangle ABC$를 넓이가 같은 $6$개의 삼각형으로 나눈다.\n$\\triangle GBC=\\dfrac{1}{3}\\triangle ABC$이고, $\\overline{BD}=\\overline{DC}$이므로 $\\triangle GBD=\\triangle GDC=\\dfrac{1}{2}\\triangle GBC=\\dfrac{1}{6}\\triangle ABC$이다.\n따라서 $\\triangle GBD=\\dfrac{1}{6}\\times${S}=${x}\\,(\\mathrm{cm}^2)$이다.`,
        facts: { w, h, S, x },
        figureSpec: figCentroid14(w, h),
      };
    },
  ),

  def(
    MINOR_CENTROID,
    "15",
    "평행사변형에서 삼각형의 무게중심의 응용",
    SEC.무게중심,
    "심화하",
    (rng): Body => {
      const d = 3 * intBetween(rng, 4, 20);
      const ex = intBetween(rng, 20, 50);
      const ey = intBetween(rng, 40, 80);
      const x = d / 3;
      return {
        content: `그림과 같이 평행사변형 $ABCD$에서 $\\overline{AB}$의 중점을 $M$이라 하자. $\\overline{CM}$과 $\\overline{BD}$의 교점을 $P$라 할 때, $\\overline{BD}=${d}\\,\\mathrm{cm}$이면 $\\overline{BP}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `$\\overline{AB}\\parallel\\overline{DC}$이고 $\\overline{MB}=\\dfrac{1}{2}\\overline{DC}$이므로 $\\triangle PMB\\sim\\triangle PCD$(닮음비 $1:2$)이다.\n따라서 $\\overline{BP}:\\overline{PD}=1:2$이므로 $\\overline{BP}=\\dfrac{1}{3}\\overline{BD}=\\dfrac{1}{3}\\times${d}=${x}\\,(\\mathrm{cm})$이다. (이는 $P$가 $\\triangle ABC$의 무게중심임을 이용해도 같은 결과를 얻는다.)`,
        facts: { d, ex, ey, x },
        figureSpec: figParallelogram15(d, ex, ey),
      };
    },
  ),
];

export const M2_CENTER_SIMILAR: TypeEntry[] = [
  def(
    MINOR_SIMILAR,
    "70",
    "닮은 도형의 대응변",
    SEC.닮음,
    "기본",
    (rng): Body => {
      const ratio = intBetween(rng, 2, 5);
      const side = intBetween(rng, 3, 12);
      const answer = ratio * side;
      return {
        content: `서로 닮은 두 삼각형 $ABC$, $DEF$의 닮음비가 $1:${ratio}$이고 $\\overline{AB}=${side} cm$일 때, 대응변 $\\overline{DE}$의 길이를 계산하시오.`,
        answer: `$${answer} cm$`,
        solution: `대응변의 길이의 비는 닮음비와 같으므로 $\\overline{AB}:\\overline{DE}=1:${ratio}$이다. 따라서 $\\overline{DE}=${side}\\times${ratio}=${answer} cm$이다.`,
        facts: { ratio, side, answer },
      };
    },
  ),

  def(
    MINOR_SIMILAR,
    "71",
    "닮은 도형의 닮음비",
    SEC.닮음,
    "기본",
    (rng): Body => {
      const ratio = intBetween(rng, 2, 6);
      const unit = intBetween(rng, 2, 8);
      const small = unit;
      const large = unit * ratio;
      return {
        content: `서로 닮은 두 도형에서 서로 대응하는 두 변의 길이가 각각 $${small} cm$, $${large} cm$이다. 작은 도형과 큰 도형의 닮음비를 구하시오.`,
        answer: `$1:${ratio}$`,
        solution: `닮음비는 대응변의 길이의 비와 같으므로 $${small}:${large}=1:${ratio}$이다.`,
        facts: { ratio, small, large },
      };
    },
  ),

  def(
    MINOR_SIMILAR,
    "72",
    "닮은 도형의 둘레의 길이",
    SEC.닮음,
    "응용",
    (rng): Body => {
      const ratio = intBetween(rng, 2, 5);
      const perimeter = intBetween(rng, 12, 40);
      const answer = ratio * perimeter;
      return {
        content: `서로 닮은 두 다각형의 닮음비가 $1:${ratio}$이고 작은 다각형의 둘레의 길이가 $${perimeter} cm$이다. 큰 다각형의 둘레의 길이를 구하시오.`,
        answer: `$${answer} cm$`,
        solution: `닮은 도형의 둘레의 길이의 비는 닮음비와 같다. 따라서 큰 다각형의 둘레의 길이는 $${perimeter}\\times${ratio}=${answer} cm$이다.`,
        facts: { ratio, perimeter, answer },
      };
    },
  ),

  def(
    MINOR_SIMILAR,
    "73",
    "닮은 도형의 넓이",
    SEC.닮음,
    "응용",
    (rng): Body => {
      const ratio = intBetween(rng, 2, 5);
      const area = intBetween(rng, 4, 20);
      const answer = area * ratio * ratio;
      return {
        content: `서로 닮은 두 삼각형의 닮음비가 $1:${ratio}$이고 작은 삼각형의 넓이가 $${area} cm^2$이다. 큰 삼각형의 넓이를 구하시오.`,
        answer: `$${answer} cm^2$`,
        solution: `닮은 도형의 넓이의 비는 닮음비의 제곱과 같으므로 $1:${ratio * ratio}$이다. 따라서 큰 삼각형의 넓이는 $${area}\\times${ratio * ratio}=${answer} cm^2$이다.`,
        facts: { ratio, area, answer },
      };
    },
  ),

  def(
    MINOR_SIMILAR,
    "74",
    "축척을 이용한 실제 거리",
    SEC.닮음,
    "기본",
    (rng): Body => {
      const scale = pick(rng, [1000, 2000, 5000] as const);
      const mapLength = intBetween(rng, 2, 12);
      const answer = (scale * mapLength) / 100;
      return {
        content: `축척이 $1:${scale}$인 지도에서 두 지점 사이의 거리가 $${mapLength} cm$이다. 실제 거리를 $m$ 단위로 계산하시오.`,
        answer: `$${answer} m$`,
        solution: `실제 거리는 $${mapLength}\\times${scale}=${mapLength * scale} cm$이다. $100 cm=1 m$이므로 $${answer} m$이다.`,
        facts: { scale, mapLength, answer },
      };
    },
  ),

  def(
    MINOR_SIMILAR,
    "75",
    "평행선과 닮은 삼각형",
    SEC.닮음,
    "심화하",
    (rng): Body => {
      const upper = intBetween(rng, 2, 8);
      const lower = intBetween(rng, 2, 8);
      const small = intBetween(rng, 3, 10) * upper;
      const whole = upper + lower;
      const answer = (small * whole) / upper;
      return {
        content: `$\\triangle ABC$에서 점 $D$, $E$가 각각 $\\overline{AB}$, $\\overline{AC}$ 위에 있고 $\\overline{DE}\\parallel\\overline{BC}$이다. $AD:DB=${upper}:${lower}$이고 $\\overline{DE}=${small} cm$일 때, $\\overline{BC}$의 길이를 구하시오.`,
        answer: `$${answer} cm$`,
        solution: `$\\triangle ADE\\sim\\triangle ABC$이고 $AD:AB=${upper}:${whole}$이다. 따라서 $DE:BC=${upper}:${whole}$이므로 $\\overline{BC}=${small}\\times\\dfrac{${whole}}{${upper}}=${answer} cm$이다.`,
        facts: { upper, lower, small, whole, answer },
      };
    },
  ),
];

export const M2_CENTER_EXT: TypeEntry[] = [
  // ── 확장 유형 (갈래 C, 70~99) ─────────────────────────
  // RPM 색인은 「삼각형의 외심과 내심」을 13, 「삼각형의 무게중심」을 15,
  // 「피타고라스 정리」를 16 까지만 담는다. 130소단원을 10유형으로 올리려면
  // 색인에 없는 유형을 지어야 하므로 번호를 갈래마다 나눠 쓴다 — 갈래 C 는 70번대.

  def(
    MINOR_CIRC,
    "70",
    "외심에서 생기는 세 각의 크기의 합",
    SEC.외심,
    "기본",
    (rng): Body => {
      const p = intBetween(rng, 15, 40);
      const q = intBetween(rng, 15, 40);
      const x = 90 - p - q;
      return {
        content: `점 $O$가 예각삼각형 $ABC$의 외심이고 $\\angle OAB=${p}^\\circ$, $\\angle OBC=${q}^\\circ$일 때, $\\angle OCA$의 크기를 구하시오.`,
        answer: `$${x}^\\circ$`,
        solution: `외심에서 세 꼭짓점까지의 거리가 같으므로 $\\triangle OAB$, $\\triangle OBC$, $\\triangle OCA$는 모두 이등변삼각형이다.\n따라서 $\\angle OAB+\\angle OBC+\\angle OCA=90^\\circ$이므로 $\\angle OCA=90^\\circ-${p}^\\circ-${q}^\\circ=${x}^\\circ$이다.`,
        facts: { p, q, x },
      };
    },
  ),

  def(
    MINOR_CIRC,
    "71",
    "직각삼각형의 외접원의 넓이",
    SEC.외심,
    "응용",
    (rng): Body => {
      const [p, q, h] = pick(rng, [
        [6, 8, 10],
        [12, 16, 20],
        [10, 24, 26],
        [16, 30, 34],
        [18, 24, 30],
      ] as const);
      const r = h / 2;
      return {
        content: `$\\angle C=90^\\circ$인 직각삼각형 $ABC$에서 $\\overline{BC}=${p}\\,\\mathrm{cm}$, $\\overline{AC}=${q}\\,\\mathrm{cm}$일 때, 이 삼각형의 외접원의 넓이를 구하시오.`,
        answer: `$${r * r}\\pi\\,\\mathrm{cm}^2$`,
        solution: `피타고라스 정리에 의해 $\\overline{AB}=${h}\\,\\mathrm{cm}$이다.\n직각삼각형의 외심은 빗변의 중점이므로 외접원의 반지름은 $\\dfrac{${h}}{2}=${r}\\,\\mathrm{cm}$이다.\n따라서 외접원의 넓이는 $\\pi\\times${r}^2=${r * r}\\pi\\,\\mathrm{cm}^2$이다.`,
        facts: { p, q, h, r, area: r * r },
      };
    },
  ),

  def(
    MINOR_CIRC,
    "72",
    "외접원의 반지름이 주어진 직각삼각형의 변",
    SEC.외심,
    "기본",
    (rng): Body => {
      const [p, q, h] = pick(rng, [
        [6, 8, 10],
        [12, 16, 20],
        [10, 24, 26],
        [16, 30, 34],
        [18, 24, 30],
      ] as const);
      const r = h / 2;
      return {
        content: `$\\angle C=90^\\circ$인 직각삼각형 $ABC$의 외접원의 반지름의 길이가 $${r}\\,\\mathrm{cm}$이고 $\\overline{BC}=${p}\\,\\mathrm{cm}$일 때, $\\overline{AC}$의 길이를 구하시오.`,
        answer: `$${q}\\,\\mathrm{cm}$`,
        solution: `직각삼각형의 외심은 빗변의 중점이므로 $\\overline{AB}=2\\times${r}=${h}\\,\\mathrm{cm}$이다.\n피타고라스 정리에 의해 $\\overline{AC}^2=${h}^2-${p}^2=${h * h - p * p}$이므로 $\\overline{AC}=${q}\\,\\mathrm{cm}$이다.`,
        facts: { p, q, h, r },
      };
    },
  ),

  def(
    MINOR_CIRC,
    "73",
    "외심이 한 변 위에 있는 삼각형",
    SEC.외심,
    "심화하",
    (rng): Body => {
      const [p, q, h] = pick(rng, [
        [3, 4, 5],
        [6, 8, 10],
        [5, 12, 13],
        [8, 15, 17],
        [9, 12, 15],
        [7, 24, 25],
      ] as const);
      return {
        content: `세 변의 길이가 각각 $${q}\\,\\mathrm{cm}$, $${h}\\,\\mathrm{cm}$, $${p}\\,\\mathrm{cm}$인 삼각형의 외심이 한 변 위에 있을 때, 그 변의 길이를 구하시오.`,
        answer: `$${h}\\,\\mathrm{cm}$`,
        solution: `외심이 한 변 위에 있으면 그 변이 외접원의 지름이므로 삼각형은 그 변을 빗변으로 하는 직각삼각형이다.\n$${p}^2+${q}^2=${p * p + q * q}=${h}^2$이므로 빗변은 $${h}\\,\\mathrm{cm}$이다.`,
        facts: { p, q, h },
      };
    },
  ),

  def(
    MINOR_CIRC,
    "74",
    "이등변삼각형의 내심과 밑각의 이등분",
    SEC.내심,
    "기본",
    (rng): Body => {
      const angA = 2 * intBetween(rng, 10, 40); // 밑각이 정수가 되게 짝수만
      const base = (180 - angA) / 2;
      const x = base / 2;
      return {
        content: `$\\overline{AB}=\\overline{AC}$인 이등변삼각형 $ABC$에서 $\\angle A=${angA}^\\circ$이고 점 $I$가 내심일 때, $\\angle IBC$의 크기를 구하시오.`,
        answer: `$${x}^\\circ$`,
        solution: `이등변삼각형이므로 $\\angle B=\\dfrac{180^\\circ-${angA}^\\circ}{2}=${base}^\\circ$이다.\n내심은 세 내각의 이등분선의 교점이므로 $\\angle IBC=\\dfrac{1}{2}\\angle B=${x}^\\circ$이다.`,
        facts: { angA, base, x },
      };
    },
  ),

  def(
    MINOR_CIRC,
    "75",
    "내심으로 나뉜 삼각형의 넓이",
    SEC.내심,
    "응용",
    (rng): Body => {
      const a = 2 * intBetween(rng, 4, 12);
      const r = intBetween(rng, 2, 7);
      const b = intBetween(rng, 5, 15);
      const c = intBetween(rng, 5, 15);
      return {
        content: `점 $I$가 $\\triangle ABC$의 내심이고 내접원의 반지름의 길이가 $${r}\\,\\mathrm{cm}$이다. $\\overline{BC}=${a}\\,\\mathrm{cm}$, $\\overline{CA}=${b}\\,\\mathrm{cm}$, $\\overline{AB}=${c}\\,\\mathrm{cm}$일 때, $\\triangle IBC$의 넓이를 구하시오.`,
        answer: `$${(a * r) / 2}\\,\\mathrm{cm}^2$`,
        solution: `내심에서 각 변까지의 거리는 모두 내접원의 반지름과 같다.\n$\\triangle IBC$는 밑변이 $\\overline{BC}$이고 높이가 $${r}\\,\\mathrm{cm}$이므로 넓이는 $\\dfrac{1}{2}\\times${a}\\times${r}=${(a * r) / 2}\\,\\mathrm{cm}^2$이다.`,
        facts: { a, b, c, r, area: (a * r) / 2 },
      };
    },
  ),

  def(
    MINOR_CIRC,
    "76",
    "내접원의 반지름과 넓이로 둘레 구하기",
    SEC.내심,
    "심화하",
    (rng): Body => {
      const r = intBetween(rng, 2, 6);
      const half = intBetween(rng, 8, 25); // 둘레의 절반
      const S = r * half;
      return {
        content: `$\\triangle ABC$의 내접원의 반지름의 길이가 $${r}\\,\\mathrm{cm}$이고 넓이가 $${S}\\,\\mathrm{cm}^2$일 때, $\\triangle ABC$의 둘레의 길이를 구하시오.`,
        answer: `$${2 * half}\\,\\mathrm{cm}$`,
        solution: `내심에서 세 변에 그은 수선의 길이가 모두 $${r}\\,\\mathrm{cm}$이므로, 세 삼각형의 넓이를 더하면 $\\triangle ABC$의 넓이는 $\\dfrac{1}{2}\\times${r}\\times(둘레)$이다.\n$${S}=\\dfrac{1}{2}\\times${r}\\times(둘레)$이므로 둘레는 $${2 * half}\\,\\mathrm{cm}$이다.`,
        facts: { r, S, perimeter: 2 * half },
      };
    },
  ),

  def(
    MINOR_CENTROID,
    "70",
    "두 변의 중점을 연결한 선분이 자른 사다리꼴의 넓이",
    SEC.중점연결,
    "응용",
    (rng): Body => {
      const S = 4 * intBetween(rng, 4, 20);
      const ans = (S * 3) / 4;
      return {
        content: `$\\triangle ABC$에서 $\\overline{AB}$, $\\overline{AC}$의 중점을 각각 $M$, $N$이라 하자. $\\triangle ABC$의 넓이가 $${S}\\,\\mathrm{cm}^2$일 때, 사각형 $MBCN$의 넓이를 구하시오.`,
        answer: `$${ans}\\,\\mathrm{cm}^2$`,
        solution: `$\\overline{MN}\\parallel\\overline{BC}$이고 $\\overline{MN}=\\dfrac{1}{2}\\overline{BC}$이므로 $\\triangle AMN$과 $\\triangle ABC$의 닮음비는 $1:2$이고 넓이의 비는 $1:4$이다.\n$\\triangle AMN=\\dfrac{1}{4}\\times${S}=${S / 4}\\,\\mathrm{cm}^2$이므로 사각형 $MBCN$의 넓이는 $${S}-${S / 4}=${ans}\\,\\mathrm{cm}^2$이다.`,
        facts: { S, ans },
      };
    },
  ),

  def(
    MINOR_CENTROID,
    "71",
    "사다리꼴의 두 대각선의 중점을 연결한 선분",
    SEC.중점연결,
    "응용",
    (rng): Body => {
      const ad = 2 * intBetween(rng, 2, 9);
      const bc = ad + 2 * intBetween(rng, 2, 9);
      const ans = (bc - ad) / 2;
      return {
        content: `$\\overline{AD}\\parallel\\overline{BC}$인 사다리꼴 $ABCD$에서 두 대각선 $\\overline{AC}$, $\\overline{BD}$의 중점을 각각 $P$, $Q$라 하자. $\\overline{AD}=${ad}\\,\\mathrm{cm}$, $\\overline{BC}=${bc}\\,\\mathrm{cm}$일 때, $\\overline{PQ}$의 길이를 구하시오.`,
        answer: `$${ans}\\,\\mathrm{cm}$`,
        solution: `$\\overline{AB}$의 중점을 $M$이라 하면 $\\overline{MQ}=\\dfrac{1}{2}\\overline{AD}=${ad / 2}\\,\\mathrm{cm}$, $\\overline{MP}=\\dfrac{1}{2}\\overline{BC}=${bc / 2}\\,\\mathrm{cm}$이다.\n따라서 $\\overline{PQ}=\\overline{MP}-\\overline{MQ}=${bc / 2}-${ad / 2}=${ans}\\,\\mathrm{cm}$이다.`,
        facts: { ad, bc, ans },
      };
    },
  ),

  def(
    MINOR_CENTROID,
    "72",
    "세 중점으로 만든 사각형의 둘레",
    SEC.중점연결,
    "심화하",
    (rng): Body => {
      const a = 2 * intBetween(rng, 3, 12); // BC
      const c = 2 * intBetween(rng, 3, 12); // AB
      const b = intBetween(rng, 5, 20); // CA — 답에 안 쓰이지만 발문에 있다
      return {
        content: `$\\triangle ABC$에서 $\\overline{AB}$, $\\overline{AC}$, $\\overline{BC}$의 중점을 각각 $M$, $N$, $D$라 하자. $\\overline{AB}=${c}\\,\\mathrm{cm}$, $\\overline{BC}=${a}\\,\\mathrm{cm}$, $\\overline{CA}=${b}\\,\\mathrm{cm}$일 때, 사각형 $MBDN$의 둘레의 길이를 구하시오.`,
        answer: `$${a + c}\\,\\mathrm{cm}$`,
        solution: `$\\overline{MB}=\\dfrac{1}{2}\\overline{AB}=${c / 2}$, $\\overline{BD}=\\dfrac{1}{2}\\overline{BC}=${a / 2}$이다.\n중점연결정리에 의해 $\\overline{DN}=\\dfrac{1}{2}\\overline{AB}=${c / 2}$, $\\overline{NM}=\\dfrac{1}{2}\\overline{BC}=${a / 2}$이다.\n따라서 둘레는 $${c / 2}+${a / 2}+${c / 2}+${a / 2}=${a + c}\\,\\mathrm{cm}$이다.`,
        facts: { a, b, c, ans: a + c },
      };
    },
  ),

  def(
    MINOR_CENTROID,
    "73",
    "세 중선의 길이의 합과 무게중심",
    SEC.무게중심,
    "기본",
    (rng): Body => {
      const total = 3 * intBetween(rng, 5, 20);
      const ans = (total * 2) / 3;
      return {
        content: `점 $G$가 $\\triangle ABC$의 무게중심이고 세 중선 $\\overline{AD}$, $\\overline{BE}$, $\\overline{CF}$의 길이의 합이 $${total}\\,\\mathrm{cm}$일 때, $\\overline{AG}+\\overline{BG}+\\overline{CG}$의 값을 구하시오.`,
        answer: `$${ans}\\,\\mathrm{cm}$`,
        solution: `무게중심은 각 중선을 꼭짓점에서부터 $2:1$로 나누므로 $\\overline{AG}=\\dfrac{2}{3}\\overline{AD}$이고 나머지도 같다.\n따라서 구하는 값은 세 중선의 길이의 합의 $\\dfrac{2}{3}$이므로 $\\dfrac{2}{3}\\times${total}=${ans}\\,\\mathrm{cm}$이다.`,
        facts: { total, ans },
      };
    },
  ),

  def(
    MINOR_CENTROID,
    "74",
    "무게중심을 지나는 평행선이 자른 사각형의 넓이",
    SEC.무게중심,
    "심화하",
    (rng): Body => {
      const S = 9 * intBetween(rng, 3, 12);
      const ans = (S * 5) / 9;
      return {
        content: `점 $G$가 $\\triangle ABC$의 무게중심이고, $G$를 지나 $\\overline{BC}$에 평행한 직선이 $\\overline{AB}$, $\\overline{AC}$와 만나는 점을 각각 $P$, $Q$라 하자. $\\triangle ABC$의 넓이가 $${S}\\,\\mathrm{cm}^2$일 때, 사각형 $PBCQ$의 넓이를 구하시오.`,
        answer: `$${ans}\\,\\mathrm{cm}^2$`,
        solution: `$\\overline{AG}:\\overline{AD}=2:3$이므로 $\\triangle APQ$와 $\\triangle ABC$의 닮음비는 $2:3$이고 넓이의 비는 $4:9$이다.\n$\\triangle APQ=\\dfrac{4}{9}\\times${S}=${(S * 4) / 9}\\,\\mathrm{cm}^2$이므로 사각형 $PBCQ$의 넓이는 $${S}-${(S * 4) / 9}=${ans}\\,\\mathrm{cm}^2$이다.`,
        facts: { S, ans },
      };
    },
  ),

  def(
    MINOR_PYTHA,
    "70",
    "세 변의 길이로 직각삼각형임을 확인하고 넓이 구하기",
    SEC.피타고라스,
    "응용",
    (rng): Body => {
      const [p, q, h] = pick(rng, [
        [3, 4, 5],
        [6, 8, 10],
        [5, 12, 13],
        [8, 15, 17],
        [9, 12, 15],
        [7, 24, 25],
        [12, 16, 20],
      ] as const);
      return {
        content: `세 변의 길이가 각각 $${p}\\,\\mathrm{cm}$, $${q}\\,\\mathrm{cm}$, $${h}\\,\\mathrm{cm}$인 삼각형의 넓이를 구하시오.`,
        answer: `$${(p * q) / 2}\\,\\mathrm{cm}^2$`,
        solution: `$${p}^2+${q}^2=${p * p}+${q * q}=${p * p + q * q}$이고 $${h}^2=${h * h}$이므로 이 삼각형은 길이가 $${h}\\,\\mathrm{cm}$인 변을 빗변으로 하는 직각삼각형이다.\n따라서 넓이는 $\\dfrac{1}{2}\\times${p}\\times${q}=${(p * q) / 2}\\,\\mathrm{cm}^2$이다.`,
        facts: { p, q, h, area: (p * q) / 2 },
      };
    },
  ),
];

export const M2_CENTER: TypeEntry[] = [
  ...M2_CENTER_CIRC,
  ...M2_CENTER_CENTROID,
  ...M2_CENTER_SIMILAR,
  ...M2_CENTER_EXT,
];
