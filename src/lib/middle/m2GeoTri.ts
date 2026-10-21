/**
 * 중2 「도형의 성질」 — RPM 2-2 «삼각형의 성질»(01~12 **전량**) + «여러 가지
 * 사각형»(13~16 평행선과 삼각형의 넓이 계열).
 *
 * 병렬 세션 소유 모듈 (2A-중2기하 → 2B-v2마크 로 인계, 2026-08-23).
 * 같은 중단원의 «여러 가지 사각형» 01~12·17 은 `m2GeoQuad.ts` 에 있다.
 *
 * ## 생성 규칙 — 정답을 먼저 뽑고 발문을 역산한다 (m1LinearApply 와 동일 계약)
 *
 * 각은 정수(대개 짝수)로 뽑아 답이 항상 정수다. 길이·넓이는 비가 정수로
 * 떨어지게 역산한다. `facts` 에 발문의 원 수치를 남겨 테스트가 조건식을
 * **독립 재계산**한다. 숫자는 전부 `$...$` 안.
 *
 * ## 그림 (FigureSpec v2)
 *
 * 각 라벨·자유 점+label(변 숫자) 우회에 더해, 2B 부터는 마크 문법
 * (같음 tick·평행 »·이중 호·직각 기호)을 쓴다. 점 마커가 숫자 옆에 찍히지
 * 않는 것을 실렌더로 확인했다(2026-08-23, show_points 기본 꺼짐 — 마커 0개).
 * 그림의 각·길이 비는 발문의 실제 값으로 계산한다(09 §4-20).
 *
 * ## 2B 대기 목록 — **전부 해소됨** (2026-08-23)
 *
 * v2 마크 문법(ticks·parallel·arcs·right)이 들어와 남은 유형을 다 냈다.
 * - 2-2|삼각형의 성질|06·07·08·12 → 이 파일 아래쪽
 * - 2-2|여러 가지 사각형|01~12·17 → `m2GeoQuad.ts` (새 모듈)
 * 이로써 RPM 2-2 «삼각형의 성질» 12유형이 빠짐없이 등록됐다.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { withDims } from "./figureDims";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";
const BOOK = "2-2";
const MINOR_TRI = "삼각형의 성질";
const MINOR_QUAD = "여러 가지 사각형";

/** 우리 Unit.section 정확한 이름 (공유 DB 실측 2026-08-23) */
const SEC = {
  이등변: "이등변삼각형의 성질",
  직각합동: "직각삼각형의 합동",
  평삼넓이: "평행선과 삼각형의 넓이",
} as const;

const DEG = Math.PI / 180;

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

type XY = [number, number];

/**
 * 수학 좌표(y-위)를 SVG 좌표(y-아래)로 — 비율을 지키는 균일 배율로 220×190
 * 상자에 맞춘다. 각을 값대로 그리기 위해 비균일 늘림은 쓰지 않는다.
 */
function fitPts(pts: Record<string, XY>): Record<string, XY> {
  const xs = Object.values(pts).map((p) => p[0]);
  const ys = Object.values(pts).map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const m = 18;
  const s = Math.min(
    (220 - 2 * m) / Math.max(maxX - minX, 1e-9),
    (190 - 2 * m) / Math.max(maxY - minY, 1e-9),
  );
  const out: Record<string, XY> = {};
  for (const [k, [x, y]] of Object.entries(pts)) {
    out[k] = [r2(m + (x - minX) * s), r2(190 - m - (y - minY) * s)];
  }
  return out;
}

/** 두 직선(점+방향)의 교점 — 수학 좌표. */
function inter(p: XY, d1: XY, q: XY, d2: XY): XY {
  const det = d1[0] * d2[1] - d1[1] * d2[0];
  const t = ((q[0] - p[0]) * d2[1] - (q[1] - p[1]) * d2[0]) / det;
  return [p[0] + t * d1[0], p[1] + t * d1[1]];
}

/** p1→p2 를 t 로 나눈 점을 무게중심 반대쪽으로 push 만큼 민 자리 (라벨 앵커). */
type Fig = Record<string, unknown>;

function svgPoints(pts: Record<string, XY>): Record<string, XY> {
  return fitPts(pts);
}

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

/** 이등변삼각형 (꼭지각 a°, 밑변 아래) — 수학 좌표로 만든 뒤 fit. */
function isoPts(a: number): { A: XY; B: XY; C: XY } {
  const h = 100;
  const half = h * Math.tan((a / 2) * DEG);
  return { A: [0, h], B: [-half, 0], C: [half, 0] };
}

function figIso01(a: number, mode: number): Fig {
  const { A, B, C } = isoPts(a);
  const angles: Record<string, unknown> =
    mode === 0
      ? {
          angA: { vertex: "A", points: ["B", "C"], label: `${a}°` },
          angB: { vertex: "B", points: ["A", "C"], label: "x" },
        }
      : { angC: { vertex: "C", points: ["A", "B"], label: "x" } };
  return {
    version: 2,
    points: svgPoints({ A, B, C }),
    segments: { AB: ["A", "B"], AC: ["A", "C"], BC: ["B", "C"] },
    angles,
    labels: { A: "A", B: "B", C: "C" },
  };
}

function figIso02(t: number, d: number): Fig {
  const { A, B, C } = isoPts(2 * t);
  const D: XY = [0, 0];
  const shape: Fig = {
    version: 2,
    points: svgPoints({ A, B, C, D }),
    segments: {
      AB: ["A", "B"],
      AC: ["A", "C"],
      BC: ["B", "C"],
      AD: ["A", "D"],
    },
    angles: {
      angA: { vertex: "A", points: ["B", "D"], label: `${t}°` },
      angB: { vertex: "B", points: ["A", "D"], label: "y°" },
    },
    labels: { A: "A", B: "B", C: "C", D: "D" },
  };
  return withDims(shape, { BD: "x cm", DC: `${d} cm` }) as Fig;
}

function figIso03(a: number, mode: number): Fig {
  const L = 110;
  // 🔴 사인법칙의 분모가 틀려 있었다 — `sin(4a)` 였다.
  //
  // 이 그림의 삼각형 $ABC$ 는 $\angle B=a$, $\angle ADC=2a$(외각), $\overline{CD}=\overline{CA}$
  // 이므로 $\angle A=\angle ADC=2a$ 이고 $\angle ACB=180^\circ-3a$ 다. 사인법칙은
  //   $\overline{BA}/\sin(\angle ACB) = \overline{BC}/\sin(\angle A)$
  // 즉 $s = L\cdot\sin(3a)/\sin(\mathbf{2}a)$ 다.
  //
  // ⚠️ $4a$ 를 쓰면 $\overline{CA}\neq\overline{CD}$ 가 되어 **발문의 전제가 그림에서
  //    깨진다.** 실측 $a=32$ 에서 $\angle ACE$ 를 $96^\circ$ 라 적고 $84^\circ$ 를 그렸다.
  const s = (L * Math.sin(3 * a * DEG)) / Math.sin(2 * a * DEG);
  const B: XY = [0, 0];
  const C: XY = [L, 0];
  const E: XY = [L + 34, 0];
  const A: XY = [s * Math.cos(a * DEG), s * Math.sin(a * DEG)];
  const D: XY = [L / 2, (L / 2) * Math.tan(a * DEG)];
  const angles: Record<string, unknown> =
    mode === 0
      ? {
          // B 의 광선은 D 방향으로 적는다(A 와 같은 방향) — BD 세그먼트가 덮는다.
          angB: { vertex: "B", points: ["D", "C"], label: `${a}°` },
          angC: { vertex: "C", points: ["A", "E"], label: "x" },
        }
      : {
          angC: { vertex: "C", points: ["A", "E"], label: `${3 * a}°` },
          angD: { vertex: "D", points: ["A", "C"], label: "x" },
        };
  return {
    version: 2,
    points: svgPoints({ A, B, C, D, E }),
    segments: {
      // BA 를 BD·DA 로 나눠 그린다 — 각 광선 검증은 꼭짓점이 세그먼트 위에
      // 정확히 있어야 하는데 fit 반올림(0.01px)이 공선성을 깬다.
      BE: ["B", "E"],
      BD: ["B", "D"],
      DA: ["D", "A"],
      AC: ["A", "C"],
      DC: ["D", "C"],
    },
    angles,
    labels: { A: "A", B: "B", C: "C", D: "D", E: "E" },
  };
}

function figIso04(a: number, b: number): Fig {
  const c = 180 - a - b;
  const W = 150;
  const B: XY = [0, 0];
  const C: XY = [W, 0];
  const A = inter(B, [Math.cos(b * DEG), Math.sin(b * DEG)], C, [
    -Math.cos(c * DEG),
    Math.sin(c * DEG),
  ]);
  const D = inter(B, [Math.cos((b / 2) * DEG), Math.sin((b / 2) * DEG)], C, [
    -Math.cos((c / 2) * DEG),
    Math.sin((c / 2) * DEG),
  ]);
  return {
    version: 2,
    points: svgPoints({ A, B, C, D }),
    segments: {
      AB: ["A", "B"],
      AC: ["A", "C"],
      BC: ["B", "C"],
      BD: ["B", "D"],
      CD: ["C", "D"],
    },
    angles: {
      angA: { vertex: "A", points: ["B", "C"], label: `${a}°` },
      angD: { vertex: "D", points: ["B", "C"], label: "x" },
    },
    labels: { A: "A", B: "B", C: "C", D: "D" },
  };
}

function figIso05(
  apex: number,
  opts: {
    /** AB 옆에 붙는 라벨 (묻는 변 «x cm») */
    abLabel: string;
    /** BC 아래 라벨 — 없으면 생략 */
    baseLabel?: string;
    /** AC 옆 라벨 — 없으면 생략 */
    acLabel?: string;
    angA?: number;
    angB?: number;
  },
): Fig {
  const { A, B, C } = isoPts(apex);
  const pts: Record<string, XY> = { A, B, C };
  const labels: Record<string, string> = { A: "A", B: "B", C: "C" };
  const angles: Record<string, unknown> = {};
  if (opts.angA !== undefined) {
    angles.angA = { vertex: "A", points: ["B", "C"], label: `${opts.angA}°` };
  }
  if (opts.angB !== undefined) {
    angles.angB = { vertex: "B", points: ["A", "C"], label: `${opts.angB}°` };
  }
  const shape: Fig = {
    version: 2,
    points: svgPoints(pts),
    segments: { AB: ["A", "B"], AC: ["A", "C"], BC: ["B", "C"] },
    ...(Object.keys(angles).length > 0 ? { angles } : {}),
    labels,
  };
  return withDims(shape, {
    AB: opts.abLabel,
    BC: opts.baseLabel,
    AC: opts.acLabel,
  }) as Fig;
}

function figBisector09(w: number, mode: number, d?: number): Fig {
  const O: XY = [0, 0];
  const B: XY = [150, 0];
  const A: XY = [150 * Math.cos(w * DEG), 150 * Math.sin(w * DEG)];
  const P: XY = [95 * Math.cos((w / 2) * DEG), 95 * Math.sin((w / 2) * DEG)];
  const proj = 95 * Math.cos((w / 2) * DEG);
  const C: XY = [proj * Math.cos(w * DEG), proj * Math.sin(w * DEG)];
  const D: XY = [proj, 0];
  const pts: Record<string, XY> = { O, A, B, P, C, D };
  const labels: Record<string, string> = {
    O: "O",
    A: "A",
    B: "B",
    P: "P",
    C: "C",
    D: "D",
  };
  let angles: Record<string, unknown> | undefined;
  const dims: Record<string, string | undefined> = {};
  if (mode === 0 && d !== undefined) {
    dims.PC = `${d} cm`;
    dims.PD = "x cm";
  } else {
    angles = {
      // The halves are equal; only the whole angle is given numerically.
      a1: { vertex: "O", points: ["A", "P"], radius: 14, arcs: 1 },
      a2: { vertex: "O", points: ["P", "B"], radius: 14, arcs: 1 },
      givenAOB: { vertex: "O", points: ["A", "B"], radius: 38, label: `${w}°` },
      ax: { vertex: "P", points: ["C", "D"], label: "x" },
    };
  }
  const shape: Fig = {
    version: 2,
    points: svgPoints(pts),
    segments: {
      OA: ["O", "A"],
      OB: ["O", "B"],
      OP: ["O", "P"],
      PC: ["P", "C"],
      PD: ["P", "D"],
    },
    ...(angles ? { angles } : {}),
    ...(mode === 1 ? { style: { clear_angle_labels: true } } : {}),
    labels,
  };
  return withDims(shape, dims) as Fig;
}

function figRight10(ab: number, bc: number, bd: number, ac: number): Fig {
  const A: XY = [0, ab];
  const B: XY = [0, 0];
  const C: XY = [bc, 0];
  const D: XY = [bd, 0];
  const pts: Record<string, XY> = { A, B, C, D };
  const shape: Fig = {
    version: 2,
    points: svgPoints(pts),
    segments: {
      AB: ["A", "B"],
      BC: ["B", "C"],
      CA: ["C", "A"],
      AD: ["A", "D"],
    },
    labels: { A: "A", B: "B", C: "C", D: "D" },
  };
  // `n2` 는 BD — 밑변 BC 전체가 아니라 D 로 끊긴 앞 토막이다.
  return withDims(shape, {
    AB: `${ab} cm`,
    BD: `${bd} cm`,
    CA: `${ac} cm`,
  }) as Fig;
}

function figIso11(a: number): Fig {
  const B: XY = [0, 0];
  const C: XY = [160, 0];
  const h = 80 / Math.tan((a / 2) * DEG);
  const A: XY = [80, h];
  const L = Math.hypot(80, h);
  const bd = 0.42 * L;
  const D: XY = [
    B[0] + ((A[0] - B[0]) * bd) / L,
    B[1] + ((A[1] - B[1]) * bd) / L,
  ];
  const E: XY = [160 - bd, 0];
  const cf = 160 - bd;
  const D2: XY = [
    C[0] + ((A[0] - C[0]) * cf) / L,
    C[1] + ((A[1] - C[1]) * cf) / L,
  ];
  return {
    version: 2,
    points: svgPoints({ A, B, C, D, E, F: D2 }),
    segments: {
      AB: ["A", "B"],
      BC: ["B", "C"],
      CA: ["C", "A"],
      DE: ["D", "E"],
      EF: ["E", "F"],
    },
    angles: {
      angA: { vertex: "A", points: ["B", "C"], label: `${a}°` },
      angE: { vertex: "E", points: ["D", "F"], label: "x" },
    },
    labels: { A: "A", B: "B", C: "C", D: "D", E: "E", F: "F" },
  };
}

function figQuad13(
  mode: number,
  p: { s1?: number; s2?: number; h?: number; w?: number },
): Fig {
  if (mode === 0) {
    const bc = 110;
    const ce = (bc * p.s2!) / p.s1!;
    const B: XY = [0, 0];
    const C: XY = [bc, 0];
    const E: XY = [bc + ce, 0];
    const A: XY = [32, 88];
    const D: XY = [E[0] + 0.62 * (A[0] - C[0]), 0.62 * (A[1] - C[1])];
    return {
      version: 2,
      points: svgPoints({ A, B, C, D, E }),
      segments: {
        AB: ["A", "B"],
        BC: ["B", "C"],
        CE: ["C", "E"],
        CD: ["C", "D"],
        DA: ["D", "A"],
        AC: ["A", "C"],
        DE: { points: ["D", "E"], dash: "5 4" },
      },
      labels: { A: "A", B: "B", C: "C", D: "D", E: "E" },
    };
  }
  const h = p.h!;
  const w = p.w!;
  const B: XY = [0, 0];
  const A: XY = [0, h];
  const C: XY = [w, 0];
  const E: XY = [2 * w, 0];
  const D: XY = [E[0] + 0.6 * (A[0] - C[0]), 0.6 * (A[1] - C[1])];
  const pts: Record<string, XY> = { A, B, C, D, E };
  const shape: Fig = {
    version: 2,
    points: svgPoints(pts),
    segments: {
      AB: ["A", "B"],
      BC: ["B", "C"],
      CE: ["C", "E"],
      CD: ["C", "D"],
      DA: ["D", "A"],
      AC: ["A", "C"],
      DE: { points: ["D", "E"], dash: "5 4" },
    },
    labels: { A: "A", B: "B", C: "C", D: "D", E: "E" },
  };
  return withDims(shape, {
    AB: `${h} cm`,
    BC: `${w} cm`,
    CE: `${w} cm`,
  }) as Fig;
}

function figTri14(
  m: number,
  n: number,
  mode: number,
  p?: number,
  q?: number,
): Fig {
  const B: XY = [0, 0];
  const C: XY = [150, 0];
  const A: XY = [52, 96];
  const D: XY = [(150 * m) / (m + n), 0];
  const pts: Record<string, XY> = { A, B, C, D };
  const segments: Record<string, unknown> = {
    AB: ["A", "B"],
    BC: ["B", "C"],
    CA: ["C", "A"],
    AD: ["A", "D"],
  };
  const labels: Record<string, string> = { A: "A", B: "B", C: "C", D: "D" };
  if (mode === 1) {
    const t = p! / (p! + q!);
    pts.E = [A[0] + (C[0] - A[0]) * t, A[1] + (C[1] - A[1]) * t];
    segments.DE = ["D", "E"];
    labels.E = "E";
  }
  return {
    version: 2,
    points: svgPoints(pts),
    segments,
    labels,
  };
}

function figPara15(m: number, n: number): Fig {
  const B: XY = [0, 0];
  const C: XY = [140, 0];
  const A: XY = [36, 80];
  const D: XY = [176, 80];
  const E: XY = [(140 * m) / (m + n), 0];
  return {
    version: 2,
    points: svgPoints({ A, B, C, D, E }),
    segments: {
      AB: ["A", "B"],
      BC: ["B", "C"],
      CD: ["C", "D"],
      DA: ["D", "A"],
      DE: ["D", "E"],
    },
    labels: { A: "A", B: "B", C: "C", D: "D", E: "E" },
  };
}

function figTrap16(adOverBc: number): Fig {
  const B: XY = [0, 0];
  const C: XY = [180, 0];
  const ad = 180 * adOverBc;
  const A: XY = [(180 - ad) / 2 - 12, 88];
  const D: XY = [A[0] + ad, 88];
  const O = inter(A, [C[0] - A[0], C[1] - A[1]], B, [D[0] - B[0], D[1] - B[1]]);
  return {
    version: 2,
    points: svgPoints({ A, B, C, D, O }),
    segments: {
      AB: ["A", "B"],
      BC: ["B", "C"],
      CD: ["C", "D"],
      DA: ["D", "A"],
      AC: ["A", "C"],
      BD: ["B", "D"],
    },
    labels: { A: "A", B: "B", C: "C", D: "D", O: "O" },
  };
}

const RATIOS_14 = [
  [1, 2],
  [2, 3],
  [1, 3],
  [3, 4],
  [2, 5],
  [3, 2],
  [2, 1],
  [4, 3],
] as const;

/**
 * (AB, BC, AC, BD) — 세 변은 피타고라스 세 쌍(∠B=90°)이고,
 * BD 는 ∠A 이등분선의 발이라 **BD·(AB+AC)=AB·BC** 를 만족해야 한다.
 * ⚠️ (24,10,26,5) 는 이 식을 깨또다(24·10/50=4.8) — 독립 검산이 잡았다.
 * 새 줄을 넣을 때는 그 식을 먼저 맞춰 볼 것(테스트가 다시 센다).
 */
const TRI10_SETS = [
  [6, 8, 10, 3],
  [12, 9, 15, 4],
  [12, 16, 20, 6],
  [24, 32, 40, 12],
  [24, 18, 30, 8],
  [18, 24, 30, 9],
] as const;

/**
 * (BC, AC, AB) — ∠C=90° 인 피타고라스 세 쌍. 08 유형은 빗변 위에
 * `AD=AC` 를 잡으므로 **AC < AB** 여야 한다(세 쌍이면 항상 성립).
 */
const PYTH_LEGS = [
  [4, 3, 5],
  [3, 4, 5],
  [8, 6, 10],
  [6, 8, 10],
  [12, 5, 13],
  [5, 12, 13],
  [12, 9, 15],
  [9, 12, 15],
  [15, 8, 17],
  [8, 15, 17],
] as const;

/**
 * 폭이 일정한 종이접기의 **띠 폭** — AC(=AB)=m, BC=n 이 정해지면 폭도 정해진다.
 * A=(0,w)·C=(m,w)·B=(bx,0) 에서 |AB|=m 과 |BC|=n 을 함께 풀면
 * `bx = (2m²-n²)/(2m)`, `w = √(m²-bx²)` 이다. 발문이 두 길이를 말하므로
 * 폭을 따로 고르면 그림이 발문과 어긋난다(09 §4-20).
 */
function foldWidth(m: number, n: number): number {
  const bx = (2 * m * m - n * n) / (2 * m);
  return Math.sqrt(Math.max(m * m - bx * bx, 1e-9));
}

// ── 2B 마크 문법 도형 (ticks·parallel·arcs·right) ─────────────────────────
// 2026-08-23: v2 엔진에 같음 tick·평행 »·이중 호·직각 기호가 들어와
// 「06~08 직각삼각형의 합동」·「12 폭이 일정한 종이접기」를 그릴 수 있게 됐다.

/** 직각삼각형 두 개 나란히 — ∠C=∠F=90°. 같은 것끼리 같은 개수의 tick. */
function figRightPair06(acute: number, mode: number): Fig {
  // 직각을 낀 두 변이 좌표축과 나란해야 fit 반올림 뒤에도 정확히 90°가 된다.
  const base = 78;
  // 🔴 **라벨이 가리키는 각에서 좌표를 유도한다.**
  //
  // 직각이 $C$ 이므로 $\angle A = 90^\circ - \angle B$ 다. `base·tan(t)` 는
  // **$\angle B$** 를 $t$ 로 만든다 — mode 1 은 라벨을 **$\angle A$** 에 붙이므로
  // 그 식을 쓰면 지면의 각이 $90^\circ - t$ 가 된다. 원장님이 2026-08-27 에
  // 「각이 70도인데 전혀 70도처럼 안 생김」이라 하신 것이 이것이다(실제 20°).
  //
  // ⚠️ 그리는 각과 적는 각이 갈리면 **아무 관문도 안 운다** — 발문과 정답은 서로
  //    맞고, 좌표가 유효하니 렌더도 성공한다. `probe-middle-figure-angles.ts` 가
  //    그래서 태어났다.
  const labelled = mode === 0 ? acute : 90 - acute; // 그림의 ∠B 가 될 각
  const rise = r2(base * Math.tan(labelled * DEG));
  const gap = 46;
  const B: XY = [0, 0];
  const C: XY = [base, 0];
  const A: XY = [base, rise];
  const E: XY = [base + gap, 0];
  const F: XY = [2 * base + gap, 0];
  const D: XY = [2 * base + gap, rise];
  // mode 0 = RHA (빗변 1줄 + 예각), mode 1 = RHS (빗변 1줄 + 다른 한 변 2줄)
  const hypTicks = 1;
  const legTicks = mode === 1 ? 2 : 0;
  const segments: Record<string, unknown> = {
    AB: { points: ["A", "B"], ticks: hypTicks },
    BC: ["B", "C"],
    CA: legTicks > 0 ? { points: ["C", "A"], ticks: legTicks } : ["C", "A"],
    DE: { points: ["D", "E"], ticks: hypTicks },
    EF: ["E", "F"],
    FD: legTicks > 0 ? { points: ["F", "D"], ticks: legTicks } : ["F", "D"],
  };
  const angles: Record<string, unknown> = {
    rC: { vertex: "C", points: ["B", "A"], right: true },
    rF: { vertex: "F", points: ["E", "D"], right: true },
  };
  if (mode === 0) {
    angles.angB = { vertex: "B", points: ["A", "C"], label: `${acute}°` };
    angles.angE = { vertex: "E", points: ["D", "F"], label: `${acute}°` };
  } else {
    angles.angA = { vertex: "A", points: ["B", "C"], label: `${acute}°` };
  }
  return {
    version: 2,
    points: svgPoints({ A, B, C, D, E, F }),
    segments,
    angles,
    labels: { A: "A", B: "B", C: "C", D: "D", E: "E", F: "F" },
  };
}

/**
 * 직각이등변삼각형 ABC(∠BAC=90°)의 두 꼭짓점에서 A 를 지나는 직선 l 에
 * 내린 수선 — CD=p, BE=q 이면 △ACD≡△BAE(RHA) 이므로 DE=p+q.
 */
function figRhaFoot07(p: number, q: number): Fig {
  const k = 15;
  const P = p * k;
  const Q = q * k;
  const D: XY = [0, 0];
  const A: XY = [Q, 0];
  const E: XY = [Q + P, 0];
  const C: XY = [0, P];
  const B: XY = [Q + P, Q];
  const L1: XY = [-22, 0];
  const L2: XY = [Q + P + 22, 0];
  const pts: Record<string, XY> = { A, B, C, D, E, L1, L2 };
  const shape: Fig = {
    version: 2,
    points: svgPoints(pts),
    segments: {
      l: ["L1", "L2"],
      CD: ["C", "D"],
      BE: ["B", "E"],
      CA: { points: ["C", "A"], ticks: 1 },
      AB: { points: ["A", "B"], ticks: 1 },
      CB: ["C", "B"],
    },
    angles: {
      rD: { vertex: "D", points: ["C", "A"], right: true },
      rE: { vertex: "E", points: ["B", "A"], right: true },
      rA: { vertex: "A", points: ["C", "B"], right: true },
    },
    labels: {
      A: "A",
      B: "B",
      C: "C",
      D: "D",
      E: "E",
      L2: { text: "l", italic: true },
    },
  };
  return withDims(shape, { CD: `${p} cm`, BE: `${q} cm` }) as Fig;
}

/**
 * ∠C=90° 인 직각삼각형에서 AC=AD(D 는 빗변 위), DE⊥AB(E 는 BC 위).
 * △ACE≡△ADE (RHS) 이므로 CE=DE 이고 △BED 의 둘레 = BC+(AB-AC).
 */
function figRhsFold08(a: number, b: number, c: number): Fig {
  const k = 13;
  const C: XY = [0, 0];
  const A: XY = [0, b * k];
  const B: XY = [a * k, 0];
  const D: XY = [(a * b * k) / c, b * k - (b * b * k) / c];
  const ex = ((a * a * b + b * b * b - b * b * c) / (a * c)) * k;
  const E: XY = [ex, 0];
  const pts: Record<string, XY> = { A, B, C, D, E };
  const shape: Fig = {
    version: 2,
    points: svgPoints(pts),
    segments: {
      CA: { points: ["C", "A"], ticks: 1 },
      CB: ["C", "B"],
      AD: { points: ["A", "D"], ticks: 1 },
      DB: ["D", "B"],
      DE: ["D", "E"],
      AE: ["A", "E"],
    },
    angles: {
      rC: { vertex: "C", points: ["A", "B"], right: true },
      rD: { vertex: "D", points: ["A", "E"], right: true },
    },
    labels: { A: "A", B: "B", C: "C", D: "D", E: "E" },
  };
  // `n3` 는 빗변 AB — AD·DB 로 끊겨 있지만 잰 것은 **전장**이다.
  return withDims(shape, {
    CA: `${b} cm`,
    CB: `${a} cm`,
    AB: `${c} cm`,
  }) as Fig;
}

/**
 * 폭이 일정한 종이접기 — 띠(위·아래 평행선)를 크레아스 BC 로 접는다.
 * A 는 접힌 아랫변이 윗변과 만나는 점. ∠ABC=∠CBD(접은 각)·∠ACB=∠CBD(엇각).
 * `m` = AC(=AB), `w` = 띠의 폭. B 의 가로 위치는 두 값이 정한다.
 */
function figFold12(m: number, w: number, labels: Record<string, string>): Fig {
  const k = 17;
  const M = m * k;
  const W = w * k;
  const bx = Math.sqrt(M * M - W * W);
  const A: XY = [0, W];
  const C: XY = [M, W];
  const B: XY = [bx, 0];
  // 접힌 띠 — +x 방향을 크레아스 BC 에 대해 대칭시킨 방향.
  const ux = (M - bx) / Math.hypot(M - bx, W);
  const uy = W / Math.hypot(M - bx, W);
  const dx = 2 * ux * ux - 1;
  const dy = 2 * ux * uy;
  const L = M + 0.3 * M;
  const P: XY = [bx + L * dx, L * dy];
  const Q: XY = [M + L * dx, W + L * dy];
  const TL: XY = [-0.22 * M, W];
  const BL: XY = [-0.22 * M, 0];
  const TR: XY = [M + 0.28 * M, W];
  const D: XY = [bx + 0.55 * M, 0];
  const pts: Record<string, XY> = { A, B, C, D, P, Q, TL, BL, TR };
  const out: Record<string, string> = { A: "A", B: "B", C: "C", D: "D" };
  const shape: Fig = {
    version: 2,
    points: svgPoints(pts),
    segments: {
      topL: { points: ["TL", "A"], parallel: 1 },
      AC: ["A", "C"],
      topR: { points: ["C", "TR"], dash: "5 4" },
      botL: { points: ["BL", "B"], parallel: 1 },
      edgeL: ["TL", "BL"],
      BD: { points: ["B", "D"], dash: "5 4" },
      crease: ["B", "C"],
      AB: ["A", "B"],
      AP: ["A", "P"],
      CQ: ["C", "Q"],
      PQ: ["P", "Q"],
    },
    angles: {
      fold1: { vertex: "B", points: ["A", "C"] },
      fold2: { vertex: "B", points: ["C", "D"] },
    },
    labels: out,
  };
  // 띠의 «폭» 은 두 평행선 사이 거리 — 왼쪽 모서리 TL-BL 이 그 치수다.
  return withDims(shape, {
    AC: labels.ac,
    BC: labels.bc,
    TLBL: labels.width,
    AB: labels.ab,
  }) as Fig;
}

export const M2_GEO_TRI: TypeEntry[] = [
  // ── 삼각형의 성질 (이등변·각의 이등분선) ───────────────────
  // ── 직각삼각형의 합동 (2B 마크 문법: 직각 기호·같음 tick) ──────────
  def(
    MINOR_TRI,
    "06",
    "직각삼각형의 합동 조건",
    SEC.직각합동,
    "기본",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      const acute = 2 * intBetween(rng, 15, 37);
      const x = 90 - acute;
      if (mode === 0) {
        return {
          content: `그림의 두 직각삼각형 $ABC$와 $DEF$에서 $\\angle C=\\angle F=90^\\circ$, $\\overline{AB}=\\overline{DE}$이고 $\\angle B=\\angle E=${acute}^\\circ$이다. 이때 $\\angle D$의 크기를 구하시오.`,
          answer: `$${x}^\\circ$`,
          solution: `빗변의 길이와 한 예각의 크기가 각각 같으므로 삼각형 $ABC$와 삼각형 $DEF$는 $\\mathrm{RHA}$ 합동이다.\n따라서 $\\angle D=\\angle A=180^\\circ-90^\\circ-${acute}^\\circ=${x}^\\circ$이다.`,
          facts: { mode, acute, x },
          figureSpec: figRightPair06(acute, 0),
        };
      }
      return {
        content: `그림의 두 직각삼각형 $ABC$와 $DEF$에서 $\\angle C=\\angle F=90^\\circ$, $\\overline{AB}=\\overline{DE}$, $\\overline{CA}=\\overline{FD}$이다. $\\angle A=${acute}^\\circ$일 때, $\\angle E$의 크기를 구하시오.`,
        answer: `$${x}^\\circ$`,
        solution: `빗변의 길이와 다른 한 변의 길이가 각각 같으므로 삼각형 $ABC$와 삼각형 $DEF$는 $\\mathrm{RHS}$ 합동이다.\n따라서 $\\angle E=\\angle B=180^\\circ-90^\\circ-${acute}^\\circ=${x}^\\circ$이다.`,
        facts: { mode, acute, x },
        figureSpec: figRightPair06(acute, 1),
      };
    },
  ),

  def(
    MINOR_TRI,
    "07",
    "직각삼각형의 합동 조건의 응용 합동",
    SEC.직각합동,
    "응용",
    (rng): Body => {
      const p = intBetween(rng, 3, 9);
      const q = attempt(40, () => {
        const v = intBetween(rng, 3, 9);
        return v === p ? null : v;
      });
      const x = p + q;
      return {
        content: `그림과 같이 $\\overline{AB}=\\overline{AC}$이고 $\\angle BAC=90^\\circ$인 직각이등변삼각형 $ABC$의 두 꼭짓점 $C$, $B$에서 꼭짓점 $A$를 지나는 직선 $l$에 내린 수선의 발을 각각 $D$, $E$라 하자. $\\overline{CD}=${p}\\,\\mathrm{cm}$, $\\overline{BE}=${q}\\,\\mathrm{cm}$일 때, $\\overline{DE}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `삼각형 $ACD$와 삼각형 $BAE$에서 $\\angle ADC=\\angle BEA=90^\\circ$, $\\overline{AC}=\\overline{BA}$이고 $\\angle CAD=90^\\circ-\\angle BAE=\\angle ABE$이다.\n빗변의 길이와 한 예각의 크기가 각각 같으므로 두 삼각형은 $\\mathrm{RHA}$ 합동이다.\n따라서 $\\overline{AE}=\\overline{CD}=${p}\\,\\mathrm{cm}$, $\\overline{AD}=\\overline{BE}=${q}\\,\\mathrm{cm}$이므로 $\\overline{DE}=${q}+${p}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { p, q, x },
        figureSpec: figRhaFoot07(p, q),
      };
    },
  ),

  def(
    MINOR_TRI,
    "08",
    "직각삼각형의 합동 조건의 응용 합동",
    SEC.직각합동,
    "응용",
    (rng): Body => {
      const [a, b, c] = pick(rng, PYTH_LEGS);
      const x = a + c - b;
      return {
        content: `그림과 같이 $\\angle C=90^\\circ$인 직각삼각형 $ABC$에서 빗변 $AB$ 위에 $\\overline{AC}=\\overline{AD}$가 되도록 점 $D$를 잡고, $\\overline{DE}\\perp\\overline{AB}$가 되도록 $\\overline{BC}$ 위에 점 $E$를 잡았다. $\\overline{AB}=${c}\\,\\mathrm{cm}$, $\\overline{BC}=${a}\\,\\mathrm{cm}$, $\\overline{AC}=${b}\\,\\mathrm{cm}$일 때, 삼각형 $BED$의 둘레의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `삼각형 $ACE$와 삼각형 $ADE$에서 $\\angle ACE=\\angle ADE=90^\\circ$, $\\overline{AE}$는 공통, $\\overline{AC}=\\overline{AD}$이므로 두 삼각형은 $\\mathrm{RHS}$ 합동이다.\n따라서 $\\overline{CE}=\\overline{DE}$이고 $\\overline{BD}=${c}-${b}=${c - b}\\,(\\mathrm{cm})$이다.\n삼각형 $BED$의 둘레의 길이는 $\\overline{BE}+\\overline{ED}+\\overline{DB}=(\\overline{BE}+\\overline{EC})+\\overline{DB}=\\overline{BC}+\\overline{DB}=${a}+${c - b}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { a, b, c, x },
        figureSpec: figRhsFold08(a, b, c),
      };
    },
  ),

  def(
    MINOR_TRI,
    "12",
    "폭이 일정한 종이접기",
    SEC.이등변,
    "응용",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      if (mode === 0) {
        const m = intBetween(rng, 6, 12);
        // BC 는 접힌 자리라 AC 보다 짧아야 그림이 성립한다(폭 > 0).
        const n = attempt(60, () => {
          const v = intBetween(rng, 4, 12);
          return v < m && 2 * m * m - v * v > 0 && 2 * m * m - v * v < 2 * m * m
            ? v
            : null;
        });
        const x = m;
        return {
          content: `폭이 일정한 직사각형 모양의 종이를 그림과 같이 접었다. $\\overline{AC}=${m}\\,\\mathrm{cm}$, $\\overline{BC}=${n}\\,\\mathrm{cm}$일 때, $\\overline{AB}$의 길이를 구하시오.`,
          answer: `$${x}\\,\\mathrm{cm}$`,
          solution: `접은 각이므로 $\\angle ABC=\\angle CBD$이고, $\\overline{AC}\\parallel\\overline{BD}$이므로 엇각에서 $\\angle ACB=\\angle CBD$이다.\n따라서 $\\angle ABC=\\angle ACB$이므로 삼각형 $ABC$는 $\\overline{AB}=\\overline{AC}$인 이등변삼각형이다.\n$\\overline{AB}=\\overline{AC}=${m}\\,\\mathrm{cm}$이다.`,
          facts: { mode, m, n, x },
          figureSpec: figFold12(m, foldWidth(m, n), {
            ac: `${m} cm`,
            bc: `${n} cm`,
          }),
        };
      }
      const w = 2 * intBetween(rng, 2, 5);
      const m = attempt(60, () => {
        const v = intBetween(rng, w + 1, w + 8);
        return (v * w) % 2 === 0 ? v : null;
      });
      const x = (m * w) / 2;
      return {
        content: `폭이 $${w}\\,\\mathrm{cm}$인 직사각형 모양의 종이를 그림과 같이 접었다. $\\overline{AB}=${m}\\,\\mathrm{cm}$일 때, 삼각형 $ABC$의 넓이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}^2$`,
        solution: `접은 각과 엇각에서 $\\angle ABC=\\angle ACB$이므로 삼각형 $ABC$는 $\\overline{AB}=\\overline{AC}$인 이등변삼각형이고 $\\overline{AC}=${m}\\,\\mathrm{cm}$이다.\n밑변을 $\\overline{AC}$로 보면 높이는 종이의 폭인 $${w}\\,\\mathrm{cm}$이므로 넓이는 $\\dfrac{1}{2}\\times${m}\\times${w}=${x}\\,(\\mathrm{cm}^2)$이다.`,
        facts: { mode, w, m, x },
        figureSpec: figFold12(m, w, { ab: `${m} cm`, width: `${w} cm` }),
      };
    },
  ),

  def(
    MINOR_TRI,
    "01",
    "이등변삼각형의 성질 ⑴",
    SEC.이등변,
    "기본",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      if (mode === 0) {
        const a = 2 * intBetween(rng, 16, 40);
        const x = (180 - a) / 2;
        return {
          content: `그림과 같이 $\\overline{AB}=\\overline{AC}$인 이등변삼각형 $ABC$에서 $\\angle A=${a}^\\circ$일 때, $\\angle x$의 크기를 구하시오.`,
          answer: `$${x}^\\circ$`,
          solution: `이등변삼각형의 두 밑각의 크기는 같으므로 $\\angle B=\\angle C$이다.\n$\\angle x=\\angle B=\\dfrac{1}{2}\\times(180^\\circ-${a}^\\circ)=${x}^\\circ$이다.`,
          facts: { mode, a, x },
          figureSpec: figIso01(a, 0),
        };
      }
      const [m, n] = pick(rng, [
        [4, 3],
        [1, 2],
        [3, 1],
        [1, 4],
        [2, 1],
      ] as const);
      const x = (180 * n) / (m + 2 * n);
      const apex = (180 * m) / (m + 2 * n);
      return {
        content: `그림과 같이 $\\overline{AB}=\\overline{AC}$인 이등변삼각형 $ABC$에서 $\\angle A:\\angle B=${m}:${n}$일 때, $\\angle x$의 크기를 구하시오.`,
        answer: `$${x}^\\circ$`,
        solution: `$\\angle B=\\angle C$이므로 $\\angle A:\\angle B:\\angle C=${m}:${n}:${n}$이다.\n$\\angle x=\\angle C=180^\\circ\\times\\dfrac{${n}}{${m + 2 * n}}=${x}^\\circ$이다.`,
        facts: { mode, m, n, x },
        figureSpec: figIso01(apex, 1),
      };
    },
  ),

  def(
    MINOR_TRI,
    "02",
    "이등변삼각형의 성질 ⑵",
    SEC.이등변,
    "응용",
    (rng): Body => {
      const t = intBetween(rng, 20, 40);
      const d = intBetween(rng, 2, 7);
      const x = d;
      const y = 90 - t;
      const sum = x + y;
      return {
        content: `그림과 같이 $\\overline{AB}=\\overline{AC}$인 이등변삼각형 $ABC$에서 $\\angle A$의 이등분선과 $\\overline{BC}$의 교점을 $D$라 하자. $\\angle BAD=${t}^\\circ$, $\\overline{DC}=${d}\\,\\mathrm{cm}$이고 $\\overline{BD}=x\\,\\mathrm{cm}$, $\\angle ABD=y^\\circ$일 때, $x+y$의 값을 구하시오.`,
        answer: `$${sum}$`,
        solution: `이등변삼각형의 꼭지각의 이등분선은 밑변을 수직이등분한다.\n$\\overline{BD}=\\overline{DC}$이므로 $x=${d}$이고, $\\overline{AD}\\perp\\overline{BC}$이므로 $\\angle ADB=90^\\circ$이다.\n삼각형 $ABD$에서 $y=180-90-${t}=${y}$이다.\n따라서 $x+y=${x}+${y}=${sum}$이다.`,
        facts: { t, d, x, y, sum },
        figureSpec: figIso02(t, d),
      };
    },
  ),

  def(
    MINOR_TRI,
    "03",
    "이등변삼각형의 성질의 응용 이웃한 이등변삼각형",
    SEC.이등변,
    "응용",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      const a = intBetween(rng, 20, 34);
      if (mode === 0) {
        const x = 3 * a;
        return {
          content: `그림과 같은 삼각형 $ABC$에서 점 $D$는 $\\overline{AB}$ 위의 점이고 $\\overline{DB}=\\overline{DC}=\\overline{CA}$이다. 점 $E$는 $\\overline{BC}$의 연장선 위의 점이고 $\\angle B=${a}^\\circ$일 때, $\\angle ACE$의 크기를 구하시오.`,
          answer: `$${x}^\\circ$`,
          solution: `$\\overline{DB}=\\overline{DC}$이므로 $\\angle DCB=\\angle B=${a}^\\circ$이고, 삼각형 $DBC$의 외각에서 $\\angle ADC=${a}^\\circ+${a}^\\circ=${2 * a}^\\circ$이다.\n$\\overline{CD}=\\overline{CA}$이므로 $\\angle A=\\angle ADC=${2 * a}^\\circ$이다.\n삼각형 $ABC$의 외각에서 $\\angle ACE=\\angle A+\\angle B=${2 * a}^\\circ+${a}^\\circ=${x}^\\circ$이다.`,
          facts: { mode, a, x },
          figureSpec: figIso03(a, 0),
        };
      }
      const e = 3 * a;
      const x = 2 * a;
      return {
        content: `그림과 같은 삼각형 $ABC$에서 점 $D$는 $\\overline{AB}$ 위의 점이고 $\\overline{DB}=\\overline{DC}=\\overline{CA}$이다. 점 $E$는 $\\overline{BC}$의 연장선 위의 점이고 $\\angle ACE=${e}^\\circ$일 때, $\\angle ADC$의 크기를 구하시오.`,
        answer: `$${x}^\\circ$`,
        solution: `$\\angle B=\\angle a$라 하면 $\\overline{DB}=\\overline{DC}$에서 $\\angle DCB=\\angle a$, 외각에서 $\\angle ADC=2\\angle a$이다.\n$\\overline{CD}=\\overline{CA}$에서 $\\angle A=\\angle ADC=2\\angle a$이므로 $\\angle ACE=\\angle A+\\angle B=3\\angle a=${e}^\\circ$, 즉 $\\angle a=${a}^\\circ$이다.\n따라서 $\\angle ADC=2\\times${a}^\\circ=${x}^\\circ$이다.`,
        facts: { mode, a, e, x },
        figureSpec: figIso03(a, 1),
      };
    },
  ),

  def(
    MINOR_TRI,
    "04",
    "이등변삼각형의 성질의 응용 각의 이등분선",
    SEC.이등변,
    "심화하",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      const a = 2 * intBetween(rng, 20, 40);
      if (mode === 0) {
        const x = 90 + a / 2;
        const b = pick(rng, [56, 62, 66] as const);
        return {
          content: `그림과 같은 삼각형 $ABC$에서 $\\angle B$의 이등분선과 $\\angle C$의 이등분선의 교점을 $D$라 하자. $\\angle A=${a}^\\circ$일 때, $\\angle BDC$의 크기를 구하시오.`,
          answer: `$${x}^\\circ$`,
          solution: `$\\angle B+\\angle C=180^\\circ-${a}^\\circ=${180 - a}^\\circ$이므로 $\\angle DBC+\\angle DCB=\\dfrac{1}{2}\\times${180 - a}^\\circ=${(180 - a) / 2}^\\circ$이다.\n따라서 $\\angle BDC=180^\\circ-${(180 - a) / 2}^\\circ=${x}^\\circ$이다.`,
          facts: { mode, a, x },
          figureSpec: figIso04(a, b),
        };
      }
      const x = a / 2;
      return {
        content: `$\\overline{AB}=\\overline{AC}$인 이등변삼각형 $ABC$에서 $\\angle B$의 이등분선과 $\\angle C$의 외각의 이등분선의 교점을 $D$라 하자. $\\angle A=${a}^\\circ$일 때, $\\angle BDC$의 크기를 구하시오.`,
        answer: `$${x}^\\circ$`,
        solution: `$\\angle ABC=\\angle ACB=\\dfrac{1}{2}\\times(180^\\circ-${a}^\\circ)=${(180 - a) / 2}^\\circ$이다.\n$\\angle DBC=\\dfrac{1}{2}\\angle ABC=${(180 - a) / 4}^\\circ$이고, $\\angle C$의 외각은 $180^\\circ-${(180 - a) / 2}^\\circ=${(180 + a) / 2}^\\circ$이므로 $\\angle DCE=${(180 + a) / 4}^\\circ$이다.\n삼각형 $DBC$의 외각에서 $\\angle DCE=\\angle DBC+\\angle BDC$이므로 $\\angle BDC=${(180 + a) / 4}^\\circ-${(180 - a) / 4}^\\circ=${x}^\\circ$이다.`,
        facts: { mode, a, x },
        figureSpec: null,
      };
    },
  ),

  def(
    MINOR_TRI,
    "05",
    "이등변삼각형이 되는 조건",
    SEC.이등변,
    "기본",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      if (mode === 0) {
        const k = intBetween(rng, 6, 12);
        const m = intBetween(rng, 5, 12);
        const p = 2 * m + k;
        return {
          content: `그림과 같은 삼각형 $ABC$에서 $\\angle B=\\angle C$이고 $\\overline{BC}=${k}\\,\\mathrm{cm}$이다. 삼각형 $ABC$의 둘레의 길이가 $${p}\\,\\mathrm{cm}$일 때, $\\overline{AB}$의 길이를 구하시오.`,
          answer: `$${m}\\,\\mathrm{cm}$`,
          solution: `두 내각의 크기가 같은 삼각형은 이등변삼각형이므로 $\\overline{AB}=\\overline{AC}$이다.\n$\\overline{AB}+\\overline{AC}=${p}-${k}=${2 * m}\\,(\\mathrm{cm})$이므로 $\\overline{AB}=${m}\\,\\mathrm{cm}$이다.`,
          facts: { mode, k, p, x: m },
          figureSpec: figIso05(50, { abLabel: "x cm", baseLabel: `${k} cm` }),
        };
      }
      const b = intBetween(rng, 40, 80);
      const a = 180 - 2 * b;
      const m = intBetween(rng, 4, 12);
      return {
        content: `그림과 같은 삼각형 $ABC$에서 $\\angle A=${a}^\\circ$, $\\angle B=${b}^\\circ$이고 $\\overline{AC}=${m}\\,\\mathrm{cm}$일 때, $\\overline{AB}$의 길이를 구하시오.`,
        answer: `$${m}\\,\\mathrm{cm}$`,
        solution: `$\\angle C=180^\\circ-${a}^\\circ-${b}^\\circ=${b}^\\circ$이므로 $\\angle B=\\angle C$이다.\n두 내각의 크기가 같은 삼각형은 이등변삼각형이므로 $\\overline{AB}=\\overline{AC}=${m}\\,\\mathrm{cm}$이다.`,
        facts: { mode, a, b, m, x: m },
        figureSpec: figIso05(a, {
          abLabel: "x cm",
          acLabel: `${m} cm`,
          angA: a,
          angB: b,
        }),
      };
    },
  ),

  def(
    MINOR_TRI,
    "09",
    "각의 이등분선의 성질",
    SEC.직각합동,
    "기본",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      const w = 2 * intBetween(rng, 20, 40);
      if (mode === 0) {
        const d = intBetween(rng, 3, 9);
        return {
          content: `그림과 같이 $\\angle AOB$의 이등분선 위의 한 점 $P$에서 두 변 $OA$, $OB$에 내린 수선의 발을 각각 $C$, $D$라 하자. $\\overline{PC}=${d}\\,\\mathrm{cm}$일 때, $\\overline{PD}$의 길이를 구하시오.`,
          answer: `$${d}\\,\\mathrm{cm}$`,
          solution: `각의 이등분선 위의 한 점에서 그 각을 이루는 두 변까지의 거리는 같다.\n따라서 $\\overline{PD}=\\overline{PC}=${d}\\,\\mathrm{cm}$이다.`,
          facts: { mode, d, x: d },
          figureSpec: figBisector09(w, 0, d),
        };
      }
      const x = 180 - w;
      return {
        content: `그림과 같이 $\\angle AOB$의 이등분선 위의 한 점 $P$에서 두 변 $OA$, $OB$에 내린 수선의 발을 각각 $C$, $D$라 하자. $\\angle AOB=${w}^\\circ$일 때, $\\angle CPD$의 크기를 구하시오.`,
        answer: `$${x}^\\circ$`,
        solution: `사각형 $OCPD$에서 $\\angle OCP=\\angle ODP=90^\\circ$이다.\n사각형의 내각의 크기의 합은 $360^\\circ$이므로 $\\angle CPD=360^\\circ-90^\\circ-90^\\circ-${w}^\\circ=${x}^\\circ$이다.`,
        facts: { mode, w, x },
        figureSpec: figBisector09(w, 1),
      };
    },
  ),

  def(
    MINOR_TRI,
    "10",
    "각의 이등분선의 성질의 응용",
    SEC.직각합동,
    "응용",
    (rng): Body => {
      const [ab, bc, ac, bd] = pick(rng, TRI10_SETS);
      const s = (ac * bd) / 2;
      return {
        content: `그림과 같이 $\\angle B=90^\\circ$인 직각삼각형 $ABC$에서 $\\angle A$의 이등분선과 $\\overline{BC}$의 교점을 $D$라 하자. $\\overline{AB}=${ab}\\,\\mathrm{cm}$, $\\overline{AC}=${ac}\\,\\mathrm{cm}$, $\\overline{BD}=${bd}\\,\\mathrm{cm}$일 때, 삼각형 $ADC$의 넓이를 구하시오.`,
        answer: `$${s}\\,\\mathrm{cm}^2$`,
        solution: `점 $D$에서 $\\overline{AC}$에 내린 수선의 발을 $E$라 하면, 각의 이등분선의 성질에서 $\\overline{DE}=\\overline{BD}=${bd}\\,\\mathrm{cm}$이다.\n따라서 삼각형 $ADC$의 넓이는 $\\dfrac{1}{2}\\times\\overline{AC}\\times\\overline{DE}=\\dfrac{1}{2}\\times${ac}\\times${bd}=${s}\\,(\\mathrm{cm}^2)$이다.`,
        facts: { ab, bc, ac, bd, s },
        figureSpec: figRight10(ab, bc, bd, ac),
      };
    },
  ),

  def(
    MINOR_TRI,
    "11",
    "합동인 삼각형을 찾아 각의 크기 구하기",
    SEC.이등변,
    "심화하",
    (rng): Body => {
      const a = 2 * intBetween(rng, 20, 36);
      const x = 90 - a / 2;
      return {
        content: `그림과 같이 $\\overline{AB}=\\overline{AC}$인 이등변삼각형 $ABC$에서 세 점 $D$, $E$, $F$는 각각 $\\overline{AB}$, $\\overline{BC}$, $\\overline{CA}$ 위의 점이고 $\\overline{BD}=\\overline{CE}$, $\\overline{BE}=\\overline{CF}$이다. $\\angle A=${a}^\\circ$일 때, $\\angle DEF$의 크기를 구하시오.`,
        answer: `$${x}^\\circ$`,
        solution: `$\\angle B=\\angle C=\\dfrac{1}{2}\\times(180^\\circ-${a}^\\circ)=${(180 - a) / 2}^\\circ$이다.\n$\\overline{BD}=\\overline{CE}$, $\\overline{BE}=\\overline{CF}$, $\\angle B=\\angle C$이므로 삼각형 $DBE$와 삼각형 $ECF$는 합동이고 $\\angle BDE=\\angle CEF$이다.\n$\\angle DEB+\\angle CEF=\\angle DEB+\\angle BDE=180^\\circ-\\angle B$이므로 $\\angle DEF=180^\\circ-(\\angle DEB+\\angle CEF)=\\angle B=${x}^\\circ$이다.`,
        facts: { a, x },
        figureSpec: figIso11(a),
      };
    },
  ),

  // ── 여러 가지 사각형 (평행선과 삼각형의 넓이 계열) ──────────
  def(
    MINOR_QUAD,
    "13",
    "평행선과 삼각형의 넓이",
    SEC.평삼넓이,
    "응용",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      if (mode === 0) {
        const s1 = intBetween(rng, 12, 40);
        const s2 = attempt(80, () => {
          const v = intBetween(rng, 8, 40);
          return v * 2 >= s1 && v * 2 <= s1 * 3 ? v : null;
        });
        const x = s1 + s2;
        return {
          content: `그림과 같이 사각형 $ABCD$의 꼭짓점 $D$를 지나고 $\\overline{AC}$에 평행한 직선이 $\\overline{BC}$의 연장선과 만나는 점을 $E$라 하자. 삼각형 $ABC$의 넓이가 $${s1}\\,\\mathrm{cm}^2$, 삼각형 $ACE$의 넓이가 $${s2}\\,\\mathrm{cm}^2$일 때, 사각형 $ABCD$의 넓이를 구하시오.`,
          answer: `$${x}\\,\\mathrm{cm}^2$`,
          solution: `$\\overline{AC}\\parallel\\overline{DE}$이므로 삼각형 $ACD$와 삼각형 $ACE$는 밑변 $\\overline{AC}$가 같고 높이가 같아 넓이가 같다.\n사각형 $ABCD$의 넓이는 삼각형 $ABC$와 삼각형 $ACD$의 넓이의 합이므로 $${s1}+${s2}=${x}\\,(\\mathrm{cm}^2)$이다.`,
          facts: { mode, s1, s2, x },
          figureSpec: figQuad13(0, { s1, s2 }),
        };
      }
      const h = intBetween(rng, 4, 9);
      const w = intBetween(rng, 4, 9);
      const x = h * w;
      return {
        content: `그림과 같이 사각형 $ABCD$의 꼭짓점 $D$를 지나고 $\\overline{AC}$에 평행한 직선이 $\\overline{BC}$의 연장선과 만나는 점을 $E$라 하자. $\\angle B=90^\\circ$이고 $\\overline{AB}=${h}\\,\\mathrm{cm}$, $\\overline{BC}=\\overline{CE}=${w}\\,\\mathrm{cm}$일 때, 사각형 $ABCD$의 넓이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}^2$`,
        solution: `$\\overline{AC}\\parallel\\overline{DE}$이므로 삼각형 $ACD$와 삼각형 $ACE$의 넓이가 같고, 사각형 $ABCD$의 넓이는 삼각형 $ABE$의 넓이와 같다.\n$\\overline{BE}=${w}+${w}=${2 * w}\\,(\\mathrm{cm})$이므로 넓이는 $\\dfrac{1}{2}\\times${2 * w}\\times${h}=${x}\\,(\\mathrm{cm}^2)$이다.`,
        facts: { mode, h, w, x },
        figureSpec: figQuad13(1, { h, w }),
      };
    },
  ),

  def(
    MINOR_QUAD,
    "14",
    "높이가 같은 두 삼각형의 넓이",
    SEC.평삼넓이,
    "기본",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      if (mode === 0) {
        const [m, n] = pick(rng, RATIOS_14);
        const k = intBetween(rng, 2, 8);
        const S = k * (m + n);
        const x = k * m;
        return {
          content: `그림과 같은 삼각형 $ABC$에서 점 $D$는 $\\overline{BC}$ 위의 점이고 $\\overline{BD}:\\overline{DC}=${m}:${n}$이다. 삼각형 $ABC$의 넓이가 $${S}\\,\\mathrm{cm}^2$일 때, 삼각형 $ABD$의 넓이를 구하시오.`,
          answer: `$${x}\\,\\mathrm{cm}^2$`,
          solution: `높이가 같은 두 삼각형의 넓이의 비는 밑변의 길이의 비와 같다.\n삼각형 $ABD$의 넓이는 $${S}\\times\\dfrac{${m}}{${m + n}}=${x}\\,(\\mathrm{cm}^2)$이다.`,
          facts: { mode, m, n, S, x },
          figureSpec: figTri14(m, n, 0),
        };
      }
      const [m, n] = pick(rng, RATIOS_14);
      const [p, q] = pick(rng, RATIOS_14);
      const k = intBetween(rng, 1, 3);
      const S = k * (m + n) * (p + q);
      const x = k * n * q;
      return {
        content: `그림과 같은 삼각형 $ABC$에서 점 $D$는 $\\overline{BC}$ 위의 점, 점 $E$는 $\\overline{AC}$ 위의 점이고 $\\overline{BD}:\\overline{DC}=${m}:${n}$, $\\overline{AE}:\\overline{EC}=${p}:${q}$이다. 삼각형 $ABC$의 넓이가 $${S}\\,\\mathrm{cm}^2$일 때, 삼각형 $DCE$의 넓이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}^2$`,
        solution: `삼각형 $ADC$의 넓이는 $${S}\\times\\dfrac{${n}}{${m + n}}=${k * n * (p + q)}\\,(\\mathrm{cm}^2)$이다.\n삼각형 $DCE$의 넓이는 삼각형 $ADC$의 넓이의 $\\dfrac{${q}}{${p + q}}$이므로 $${k * n * (p + q)}\\times\\dfrac{${q}}{${p + q}}=${x}\\,(\\mathrm{cm}^2)$이다.`,
        facts: { mode, m, n, p, q, S, x },
        figureSpec: figTri14(m, n, 1, p, q),
      };
    },
  ),

  def(
    MINOR_QUAD,
    "15",
    "평행사변형에서 높이가 같은 두 삼각형의 넓이",
    SEC.평삼넓이,
    "응용",
    (rng): Body => {
      const [m, n] = pick(rng, RATIOS_14);
      const k = intBetween(rng, 2, 6);
      const S = 2 * k * (m + n);
      const x = k * n;
      return {
        content: `그림과 같은 평행사변형 $ABCD$에서 점 $E$는 $\\overline{BC}$ 위의 점이고 $\\overline{BE}:\\overline{EC}=${m}:${n}$이다. 평행사변형 $ABCD$의 넓이가 $${S}\\,\\mathrm{cm}^2$일 때, 삼각형 $DEC$의 넓이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}^2$`,
        solution: `삼각형 $DBC$의 넓이는 평행사변형 $ABCD$의 넓이의 $\\dfrac{1}{2}$이므로 $${k * (m + n)}\\,\\mathrm{cm}^2$이다.\n높이가 같은 두 삼각형에서 $\\overline{BE}:\\overline{EC}=${m}:${n}$이므로 삼각형 $DEC$의 넓이는 $${k * (m + n)}\\times\\dfrac{${n}}{${m + n}}=${x}\\,(\\mathrm{cm}^2)$이다.`,
        facts: { m, n, S, x },
        figureSpec: figPara15(m, n),
      };
    },
  ),

  def(
    MINOR_QUAD,
    "16",
    "사다리꼴에서 높이가 같은 두 삼각형의 넓이",
    SEC.평삼넓이,
    "심화하",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      if (mode === 0) {
        const [m, n] = pick(rng, [
          [7, 5],
          [3, 2],
          [2, 1],
          [5, 3],
          [4, 3],
        ] as const);
        const k = intBetween(rng, 2, 6);
        const s = m * k;
        const x = k * (m + n);
        return {
          content: `그림과 같이 $\\overline{AD}\\parallel\\overline{BC}$인 사다리꼴 $ABCD$에서 두 대각선의 교점을 $O$라 하자. $\\overline{BO}:\\overline{OD}=${m}:${n}$이고 삼각형 $OBC$의 넓이가 $${s}\\,\\mathrm{cm}^2$일 때, 삼각형 $ABC$의 넓이를 구하시오.`,
          answer: `$${x}\\,\\mathrm{cm}^2$`,
          solution: `$\\overline{AD}\\parallel\\overline{BC}$이므로 삼각형 $ABC$와 삼각형 $DBC$는 넓이가 같다.\n높이가 같은 두 삼각형에서 $\\overline{BO}:\\overline{OD}=${m}:${n}$이므로 삼각형 $DOC$의 넓이는 $${s}\\times\\dfrac{${n}}{${m}}=${n * k}\\,(\\mathrm{cm}^2)$이다.\n따라서 삼각형 $ABC$의 넓이는 삼각형 $DBC$의 넓이와 같은 $${s}+${n * k}=${x}\\,(\\mathrm{cm}^2)$이다.`,
          facts: { mode, m, n, s, x },
          figureSpec: figTrap16(n / m),
        };
      }
      const u = intBetween(rng, 6, 16);
      const x = attempt(80, () => {
        const v = intBetween(rng, 10, 30);
        const ratio = u / v;
        return ratio >= 0.3 && ratio <= 0.8 ? v : null;
      });
      const t = x + u;
      return {
        content: `그림과 같이 $\\overline{AD}\\parallel\\overline{BC}$인 사다리꼴 $ABCD$에서 두 대각선의 교점을 $O$라 하자. 삼각형 $ABC$의 넓이가 $${t}\\,\\mathrm{cm}^2$, 삼각형 $DOC$의 넓이가 $${u}\\,\\mathrm{cm}^2$일 때, 삼각형 $OBC$의 넓이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}^2$`,
        solution: `$\\overline{AD}\\parallel\\overline{BC}$이므로 삼각형 $DBC$의 넓이는 삼각형 $ABC$의 넓이와 같은 $${t}\\,\\mathrm{cm}^2$이다.\n삼각형 $OBC$의 넓이는 $${t}-${u}=${x}\\,(\\mathrm{cm}^2)$이다.`,
        facts: { mode, t, u, x },
        figureSpec: figTrap16(u / x),
      };
    },
  ),
];
