/**
 * 중3 원 유형의 FigureSpec v2 빌더 — **실증 완료 도형만** 쓴다
 * (09-figure-engine-guide §2: 원의 현 · 원주각·중심각 · 원의 접선).
 *
 * 스펙 검증은 엔진이 정본이다(09 §0.1) — 여기서는 좌표만 계산해 JSON 을 만든다.
 * 좌표 규약: 엔진 `circle_pt` 는 **수학각(도)** 에 y-down 보정을 한다
 * (0°=오른쪽, 90°=위). raw 점도 같은 규약(`polar`)으로 계산해 둘이 갈리지 않게 한다.
 *
 * 그림의 각 위치는 발문의 실제 값으로 계산한다 — 30° 라고 적힌 각이 70° 로
 * 그려지면 값이 찍히는 순간 도형이 값과 안 맞는 것이 보인다(09 §4-20).
 */

type FigureSpec = Record<string, unknown>;

const CX = 120;
const CY = 95;
const R_PX = 76;

const DEG = Math.PI / 180;

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** 수학각(도) → SVG 좌표 (y-down 보정). 엔진 `circle_pt` 와 같은 규약. */
function polar(angleDeg: number, radius: number): [number, number] {
  return [
    r2(CX + radius * Math.cos(angleDeg * DEG)),
    r2(CY - radius * Math.sin(angleDeg * DEG)),
  ];
}

function onCircle(angleDeg: number): Record<string, unknown> {
  return { type: "on_circle", circle: "c", angle: r2(angleDeg) };
}

function base(
  points: Record<string, unknown>,
  rest: Omit<FigureSpec, "version" | "points" | "circles" | "style">,
  radiusPx = R_PX,
): FigureSpec {
  return {
    version: 2,
    style: { show_points: true },
    points: { O: [CX, CY], ...points },
    circles: { c: { center: "O", radius: radiusPx } },
    ...rest,
  };
}

/**
 * 현의 수직이등분선 (원과 직선 01·02) — 원, 현 AB, 수선의 발 M, 반지름 OA.
 *
 * ⚠️ 치수선은 넣지 않는다 — 엔진의 dimension 충돌 검사는 끝점이 원 위에 있는
 * 치수(현 AB·반지름 OA)를 항상 거부한다(실측 2026-08-23: inset 을 키워도 같음).
 * 수치는 발문이 전부 말하므로 그림은 구조(현·수선·반지름)만 보인다.
 */
export function figChordPerp(opts: {
  r: number;
  d: number;
  h: number;
}): FigureSpec {
  const s = R_PX / opts.r;
  const dPx = opts.d * s;
  const hPx = opts.h * s;
  return base(
    {
      A: [r2(CX - hPx), r2(CY + dPx)],
      B: [r2(CX + hPx), r2(CY + dPx)],
      M: [CX, r2(CY + dPx)],
    },
    {
      segments: { AB: ["A", "B"], OM: ["O", "M"], OA: ["O", "A"] },
      labels: { O: "O", A: "A", B: "B", M: "M" },
    },
  );
}

/** 활꼴의 높이 (원과 직선 03) — 현 AB 와 짧은 호의 중점 C, 현의 중점 M. */
export function figArcHeight(opts: {
  r: number;
  c: number;
  h: number;
}): FigureSpec {
  const s = R_PX / opts.r;
  const yM = r2(CY + (opts.r - opts.c) * s);
  const hPx = opts.h * s;
  return base(
    {
      A: [r2(CX - hPx), yM],
      B: [r2(CX + hPx), yM],
      M: [CX, yM],
      C: [CX, r2(CY + R_PX)],
    },
    {
      segments: {
        AB: ["A", "B"],
        CM: ["C", "M"],
        OM: { points: ["O", "M"], dash: "5 4" },
        OA: { points: ["O", "A"], dash: "5 4" },
      },
      labels: { O: "O", A: "A", B: "B", C: "C", M: "M" },
    },
  );
}

/** 중심에서 같은 거리의 두 현 (원과 직선 05) — AB·CD 와 수선의 발 M·N. */
export function figTwoChords(opts: { r: number; d: number }): FigureSpec {
  const gamma = Math.acos(opts.d / opts.r) / DEG;
  const dPx = opts.d * (R_PX / opts.r);
  const PHI1 = 135;
  const PHI2 = 15;
  return base(
    {
      A: onCircle(PHI1 + gamma),
      B: onCircle(PHI1 - gamma),
      C: onCircle(PHI2 + gamma),
      D: onCircle(PHI2 - gamma),
      M: polar(PHI1, dPx),
      N: polar(PHI2, dPx),
    },
    {
      segments: {
        AB: ["A", "B"],
        CD: ["C", "D"],
        OM: ["O", "M"],
        ON: ["O", "N"],
      },
      labels: { O: "O", A: "A", B: "B", C: "C", D: "D", M: "M", N: "N" },
    },
  );
}

/** 내접 이등변삼각형 (원과 직선 06) — 주어진 각과 묻는 각을 함께 전환한다. */
export function figInscribedIso(opts: {
  a: number;
  target?: "apex" | "base";
}): FigureSpec {
  // Match on_circle's analytic coordinates before taking chord midpoints.
  // Rounding both symmetric feet independently can otherwise break OM=ON.
  const exactPoint = (angle: number): [number, number] => [
    CX + R_PX * Math.cos(angle * DEG),
    CY - R_PX * Math.sin(angle * DEG),
  ];
  const A = exactPoint(90);
  const B = exactPoint(270 + opts.a);
  const C = exactPoint(270 - opts.a);
  const mid = (p: [number, number], q: [number, number]): [number, number] => [
    (p[0] + q[0]) / 2,
    (p[1] + q[1]) / 2,
  ];
  return base(
    {
      A: onCircle(90),
      B: onCircle(270 + opts.a),
      C: onCircle(270 - opts.a),
      M: mid(A, B),
      N: mid(A, C),
    },
    {
      segments: {
        AB: ["A", "B"],
        BC: ["B", "C"],
        CA: ["C", "A"],
        OM: ["O", "M"],
        ON: ["O", "N"],
      },
      angles: {
        angA: {
          vertex: "A", points: ["B", "C"],
          label: opts.target === "apex" ? "x" : `${opts.a}°`,
        },
        angB: {
          vertex: "B", points: ["A", "C"],
          label: opts.target === "apex" ? `${(180 - opts.a) / 2}°` : "x",
        },
      },
      labels: { O: "O", A: "A", B: "B", C: "C", M: "M", N: "N" },
    },
  );
}

/**
 * 원주각과 중심각 (원주각 01·02) — P 가 긴 호(`minor=false`) 또는
 * 짧은 호(`minor=true`) 위. 각 라벨은 호출자가 준다(묻는 쪽이 "x").
 */
export function figInscribedCentral(opts: {
  c: number;
  minor: boolean;
  labelO: string;
  labelP: string;
}): FigureSpec {
  const half = opts.c / 2;
  return base(
    {
      A: onCircle(270 - half),
      B: onCircle(270 + half),
      P: onCircle(opts.minor ? 270 : 90),
    },
    {
      segments: {
        PA: ["P", "A"],
        PB: ["P", "B"],
        OA: ["O", "A"],
        OB: ["O", "B"],
      },
      angles: {
        angO: { vertex: "O", points: ["A", "B"], label: opts.labelO },
        angP: { vertex: "P", points: ["A", "B"], label: opts.labelP },
      },
      labels: { O: "O", A: "A", B: "B", P: "P" },
    },
  );
}

/** 두 접선과 원주각 (원주각 03) — 외부점 P, 접점 A·B, 긴 호 위의 C. */
export function figTangentPair(opts: { p: number }): FigureSpec {
  const RP = 66;
  const half = opts.p / 2;
  const opPx = RP / Math.sin(half * DEG);
  return base(
    {
      A: onCircle(90 - half),
      B: onCircle(-(90 - half)),
      C: onCircle(180),
      P: [r2(CX + opPx), CY],
    },
    {
      segments: {
        PA: ["P", "A"],
        PB: ["P", "B"],
        CA: ["C", "A"],
        CB: ["C", "B"],
      },
      angles: {
        angP: { vertex: "P", points: ["A", "B"], label: `${opts.p}°` },
        angC: { vertex: "C", points: ["A", "B"], label: "x" },
      },
      labels: { O: "O", A: "A", B: "B", C: "C", P: "P" },
    },
    RP,
  );
}

/** 두 현의 교점과 원주각 (원주각 04) — ∠ABD=a, ∠BPC=p, ∠BDC=x. */
export function figChordCross(opts: {
  a: number;
  x: number;
  p: number;
}): FigureSpec {
  return base(
    {
      A: onCircle(150),
      B: onCircle(250),
      C: onCircle(250 + 2 * opts.x),
      D: onCircle(150 - 2 * opts.a),
      P: { type: "intersection", segments: ["AC", "BD"] },
    },
    {
      segments: {
        AB: ["A", "B"],
        AC: ["A", "C"],
        BD: ["B", "D"],
        DC: ["D", "C"],
      },
      angles: {
        angB: { vertex: "B", points: ["A", "D"], label: `${opts.a}°` },
        angP: { vertex: "P", points: ["B", "C"], label: `${opts.p}°` },
        angD: { vertex: "D", points: ["B", "C"], label: "x" },
      },
      labels: { A: "A", B: "B", C: "C", D: "D", P: "P" },
    },
  );
}

/** 반원에 대한 원주각 (원주각 05) — 지름 AB, 원 위의 C, ∠A 표시. */
export function figSemicircle(opts: { a: number }): FigureSpec {
  return base(
    { A: onCircle(180), B: onCircle(0), C: onCircle(2 * opts.a) },
    {
      segments: { AB: ["A", "B"], CA: ["C", "A"], CB: ["C", "B"] },
      angles: {
        angA: { vertex: "A", points: ["C", "B"], label: `${opts.a}°` },
        angB: { vertex: "B", points: ["C", "A"], label: "x" },
      },
      labels: { O: "O", A: "A", B: "B", C: "C" },
    },
  );
}

/** 내접삼각형과 삼각비 (원주각 06) — BC·반지름 값은 발문이 말한다(치수선 불가 실측). */
export function figTriSine(opts: { bc: number; r: number }): FigureSpec {
  const half = Math.asin(opts.bc / (2 * opts.r)) / DEG;
  return base(
    {
      A: onCircle(90),
      B: onCircle(270 + half),
      C: onCircle(270 - half),
    },
    {
      segments: { AB: ["A", "B"], BC: ["B", "C"], CA: ["C", "A"] },
      labels: { O: "O", A: "A", B: "B", C: "C" },
    },
  );
}

/** 지름과 두 현의 교점 (원주각 10) — A·D·C·B 순서, P=AC∩BD, ∠CAD=a. */
export function figDiameterCross(opts: { a: number }): FigureSpec {
  return base(
    {
      A: onCircle(180),
      B: onCircle(0),
      C: onCircle(60),
      D: onCircle(60 + 2 * opts.a),
      P: { type: "intersection", segments: ["AC", "BD"] },
    },
    {
      segments: {
        AB: ["A", "B"],
        AC: ["A", "C"],
        BD: ["B", "D"],
        AD: ["A", "D"],
      },
      angles: {
        angA: { vertex: "A", points: ["C", "D"], label: `${opts.a}°` },
        angP: { vertex: "P", points: ["A", "B"], label: "x" },
      },
      labels: { O: "O", A: "A", B: "B", C: "C", D: "D", P: "P" },
    },
  );
}
