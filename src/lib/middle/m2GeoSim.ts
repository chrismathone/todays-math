/**
 * 중2 「도형의 닮음·닮음의 활용」 — RPM 2-2 «도형의 닮음»(01~08) +
 * «평행선 사이의 선분의 길이의 비»(01~07).
 *
 * 병렬 세션 소유 모듈 — 이 파일과 `m2GeoTri.ts` 는 2A-중2기하 세션만 만진다
 * (docs/planning/tracks/middle-engine-wave2-plan.md §1 파일 소유권).
 *
 * 계약·그림 원칙은 `m2GeoTri.ts` 머리 주석과 같다. 변 숫자는 자유 점+label
 * 우회(점 마커 없음 — 실렌더 확인 2026-08-23), 길이 비는 발문의 실제 값으로
 * 그린다. 입체(직육면체·원뿔 두 개 나란히)는 v2 에 없으므로 그림 없이
 * 성립하는 발문으로 냈다.
 *
 * ## 2B 대기 목록 (v2 마크 문법 병합 후)
 *
 * - 2-2|도형의 닮음|09~15 (닮음 각 표시 — 같은 각 이중 호·직각 기호)
 * - 2-2|평행선 사이의 선분의 길이의 비|08~11 (평행 » 표시 — 세 평행선·사다리꼴)
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";
const BOOK = "2-2";
const MINOR_SIM = "도형의 닮음";
const MINOR_PAR = "평행선 사이의 선분의 길이의 비";

/** 우리 Unit.section 정확한 이름 (공유 DB 실측 2026-08-23) */
const SEC = {
  닮은도형: "닮은 도형",
  넓이부피비: "닮은 도형의 넓이의 비와 부피의 비",
  삼평행비: "삼각형에서 평행선 사이의 선분의 길이의 비",
  각이등분: "삼각형의 각의 이등분선",
} as const;

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

type XY = [number, number];

/** 수학 좌표(y-위) → SVG 좌표(y-아래), 220×190 균일 배율 (m2GeoTri 와 동일 규약). */
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

/** 선분 p1→p2 위 t 지점을 무게중심 반대쪽으로 push 만큼 민 라벨 앵커. */
function edgeAnchor(p1: XY, p2: XY, t: number, g: XY, push: number): XY {
  const mx = p1[0] + (p2[0] - p1[0]) * t;
  const my = p1[1] + (p2[1] - p1[1]) * t;
  const dx = mx - g[0];
  const dy = my - g[1];
  const n = Math.hypot(dx, dy) || 1;
  return [mx + (dx / n) * push, my + (dy / n) * push];
}

function lerp(p1: XY, p2: XY, t: number): XY {
  return [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t];
}

type Fig = Record<string, unknown>;

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

/**
 * 닮음 기호 오른쪽 삼각형의 꼭짓점 순서 — △ABC ∽ △(p[0]p[1]p[2]).
 * 테스트가 같은 표로 대응변·대응각을 재계산한다.
 */
export const SIM01_PERMS = [
  ["D", "E", "F"],
  ["D", "F", "E"],
  ["E", "D", "F"],
  ["E", "F", "D"],
  ["F", "D", "E"],
  ["F", "E", "D"],
] as const;

/** 두 닮은 삼각형 나란히 (닮음비 p:q, q>p) — 비율대로 그린다. */
function figSim02(
  p: number,
  q: number,
  labels: { bc: string; ef: string; ab: string; de: string },
): Fig {
  const r = q / p;
  const B: XY = [0, 0];
  const C: XY = [64, 0];
  const A: XY = [22, 48];
  const ox = 64 + 34;
  const E: XY = [ox, 0];
  const F: XY = [ox + 64 * r, 0];
  const D: XY = [ox + 22 * r, 48 * r];
  const g1: XY = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
  const g2: XY = [(D[0] + E[0] + F[0]) / 3, (D[1] + E[1] + F[1]) / 3];
  return {
    version: 2,
    points: fitPts({
      A,
      B,
      C,
      D,
      E,
      F,
      n1: edgeAnchor(B, C, 0.5, g1, 16),
      n2: edgeAnchor(E, F, 0.5, g2, 16),
      n3: edgeAnchor(A, B, 0.5, g1, 18),
      n4: edgeAnchor(D, E, 0.5, g2, 18),
    }),
    segments: {
      AB: ["A", "B"],
      BC: ["B", "C"],
      CA: ["C", "A"],
      DE: ["D", "E"],
      EF: ["E", "F"],
      FD: ["F", "D"],
    },
    labels: {
      A: "A",
      B: "B",
      C: "C",
      D: "D",
      E: "E",
      F: "F",
      n1: labels.bc,
      n2: labels.ef,
      n3: labels.ab,
      n4: labels.de,
    },
  };
}

/** △ABC ∽ △ADE 겹친 꼴 (BC ∥ DE) — AB:AD 비율대로. */
function figSim05(ab: number, ad: number): Fig {
  const A: XY = [0, 110];
  const D: XY = [-62, 0];
  const E: XY = [62, 0];
  const t = ab / ad;
  const B = lerp(A, D, t);
  const C = lerp(A, E, t);
  return {
    version: 2,
    points: fitPts({ A, B, C, D, E }),
    segments: {
      AD: ["A", "D"],
      AE: ["A", "E"],
      BC: ["B", "C"],
      DE: ["D", "E"],
    },
    labels: { A: "A", B: "B", C: "C", D: "D", E: "E" },
  };
}

/** 삼각형 + BC∥DE — 각 소구간 라벨. ratio = AD:AB (실제 비율로 그린다). */
function figPar01(
  ratio: number,
  labels: Partial<{
    ad: string;
    db: string;
    ae: string;
    ec: string;
    bc: string;
    de: string;
  }>,
): Fig {
  const A: XY = [4, 120];
  const B: XY = [-70, 0];
  const C: XY = [78, 0];
  const D = lerp(A, B, ratio);
  const E = lerp(A, C, ratio);
  const g: XY = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
  const pts: Record<string, XY> = { A, B, C, D, E };
  const out: Record<string, string> = {
    A: "A",
    B: "B",
    C: "C",
    D: "D",
    E: "E",
  };
  const anchors: Array<[string, XY, string | undefined]> = [
    ["n1", edgeAnchor(A, D, 0.5, g, 20), labels.ad],
    ["n2", edgeAnchor(D, B, 0.5, g, 20), labels.db],
    ["n3", edgeAnchor(A, E, 0.5, g, 20), labels.ae],
    ["n4", edgeAnchor(E, C, 0.5, g, 20), labels.ec],
    ["n5", edgeAnchor(B, C, 0.5, g, 18), labels.bc],
    ["n6", [(D[0] + E[0]) / 2 + 6, (D[1] + E[1]) / 2 + 13], labels.de],
  ];
  for (const [k, at, text] of anchors) {
    if (text !== undefined) {
      pts[k] = at;
      out[k] = text;
    }
  }
  return {
    version: 2,
    points: fitPts(pts),
    segments: {
      AB: ["A", "B"],
      AC: ["A", "C"],
      BC: ["B", "C"],
      DE: ["D", "E"],
    },
    labels: out,
  };
}

/** 나비꼴 — BE·CD 의 교점 A, BC∥DE. ratio = AE:AB (실제 비율). */
function figPar02(
  ratio: number,
  labels: { ab: string; ae: string; bc: string; de: string },
): Fig {
  const A: XY = [0, 0];
  const B: XY = [-72, -66];
  const C: XY = [80, -66];
  const E: XY = [-B[0] * ratio, -B[1] * ratio];
  const D: XY = [-C[0] * ratio, -C[1] * ratio];
  const pts: Record<string, XY> = {
    A,
    B,
    C,
    D,
    E,
    n1: edgeAnchor(B, A, 0.5, [20, -66], 20),
    n2: edgeAnchor(A, E, 0.5, [-40, 30], 20),
    n3: [(B[0] + C[0]) / 2, -66 - 14],
    n4: [(D[0] + E[0]) / 2, -66 * -ratio + 14],
  };
  return {
    version: 2,
    points: fitPts(pts),
    segments: {
      BE: ["B", "E"],
      CD: ["C", "D"],
      BC: ["B", "C"],
      DE: ["D", "E"],
    },
    labels: {
      A: "A",
      B: "B",
      C: "C",
      D: "D",
      E: "E",
      n1: labels.ab,
      n2: labels.ae,
      n3: labels.bc,
      n4: labels.de,
    },
  };
}

/** BC∥DE + 중선꼴 AG, F=AG∩DE — BG:GC 비율대로. */
function figPar03(
  g1: number,
  g2: number,
  labels: { g1: string; g2: string; fe: string },
): Fig {
  const A: XY = [0, 115];
  const B: XY = [-80, 0];
  const C: XY = [85, 0];
  const G = lerp(B, C, g1 / (g1 + g2));
  const r = 0.56;
  const D = lerp(A, B, r);
  const E = lerp(A, C, r);
  const F = lerp(A, G, r);
  const cen: XY = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
  return {
    version: 2,
    points: fitPts({
      A,
      B,
      C,
      D,
      E,
      F,
      G,
      n1: edgeAnchor(B, G, 0.5, cen, 18),
      n2: edgeAnchor(G, C, 0.5, cen, 18),
      n3: [(F[0] + E[0]) / 2, (F[1] + E[1]) / 2 + 13],
    }),
    segments: {
      AB: ["A", "B"],
      AC: ["A", "C"],
      BC: ["B", "C"],
      DE: ["D", "E"],
      AG: ["A", "G"],
    },
    labels: {
      A: "A",
      B: "B",
      C: "C",
      D: "D",
      E: "E",
      F: "F",
      G: "G",
      n1: labels.g1,
      n2: labels.g2,
      n3: labels.fe,
    },
  };
}

/** BC∥DE, DC∥FE 겹사다리 — AF:FD 비율대로 (AB 는 그 비에서 유도된다). */
function figPar04(f1: number, f2: number): Fig {
  const A: XY = [6, 135];
  const B: XY = [-64, 0];
  const C: XY = [86, 0];
  const rD = f1 / (f1 + f2);
  const D = lerp(A, B, rD);
  const F = lerp(A, B, rD * rD);
  const E = lerp(A, C, rD);
  const g: XY = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
  return {
    version: 2,
    points: fitPts({
      A,
      B,
      C,
      D,
      E,
      F,
      n1: edgeAnchor(A, F, 0.5, g, 20),
      n2: edgeAnchor(F, D, 0.5, g, 20),
      n3: edgeAnchor(D, B, 0.5, g, 20),
    }),
    segments: {
      AB: ["A", "B"],
      AC: ["A", "C"],
      BC: ["B", "C"],
      DE: ["D", "E"],
      DC: ["D", "C"],
      FE: ["F", "E"],
    },
    labels: {
      A: "A",
      B: "B",
      C: "C",
      D: "D",
      E: "E",
      F: "F",
      n1: `${f1} cm`,
      n2: `${f2} cm`,
      n3: "x cm",
    },
  };
}

/** |AB|:|AC| = ab:ac 인 삼각형 — 밑변 위 x 좌표를 이차식으로 푼다. */
function apexForRatio(ab: number, ac: number, w: number, h: number): XY {
  const rho = ab / ac;
  if (Math.abs(rho - 1) < 1e-9) return [w / 2, h];
  const a = 1 - rho * rho;
  const b = 2 * rho * rho * w;
  const c = -(rho * rho) * (w * w + h * h) + h * h;
  const disc = Math.sqrt(b * b - 4 * a * c);
  const roots = [(-b + disc) / (2 * a), (-b - disc) / (2 * a)];
  const x = roots.find((v) => v > 0 && v < w);
  if (x === undefined) {
    throw new Error(
      `apexForRatio: ${ab}:${ac} 비율의 꼭짓점이 밑변 안에 없습니다`,
    );
  }
  return [x, h];
}

/** 내각의 이등분선 — AB:AC 비율대로, D 는 BD:DC=AB:AC 자리(=이등분선의 발). */
function figPar06(
  ab: number,
  ac: number,
  labels: { ab: string; ac: string; bd?: string; dc?: string },
): Fig {
  const w = 150;
  const B: XY = [0, 0];
  const C: XY = [w, 0];
  const A = apexForRatio(ab, ac, w, 92);
  const D: XY = [(w * ab) / (ab + ac), 0];
  const g: XY = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
  const pts: Record<string, XY> = {
    A,
    B,
    C,
    D,
    n1: edgeAnchor(A, B, 0.5, g, 20),
    n2: edgeAnchor(A, C, 0.5, g, 20),
  };
  const out: Record<string, string> = {
    A: "A",
    B: "B",
    C: "C",
    D: "D",
    n1: labels.ab,
    n2: labels.ac,
  };
  if (labels.bd !== undefined) {
    pts.n3 = [D[0] / 2, -15];
    out.n3 = labels.bd;
  }
  if (labels.dc !== undefined) {
    pts.n4 = [(D[0] + w) / 2, -15];
    out.n4 = labels.dc;
  }
  return {
    version: 2,
    points: fitPts(pts),
    segments: {
      AB: ["A", "B"],
      AC: ["A", "C"],
      BC: ["B", "C"],
      AD: ["A", "D"],
    },
    labels: out,
  };
}

/** 외각의 이등분선 — D 는 BC 연장 위 실제 자리(BD:CD=AB:AC 가 저절로 성립). */
function figPar07(ab: number, ac: number, b: number, x: number): Fig {
  const B: XY = [0, 0];
  const C: XY = [b, 0];
  const D: XY = [b + x, 0];
  const A = apexForRatio(ab, ac, b, 0.85 * b);
  const g: XY = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
  return {
    version: 2,
    points: fitPts({
      A,
      B,
      C,
      D,
      n1: edgeAnchor(A, B, 0.5, g, 0.16 * b),
      n2: edgeAnchor(A, C, 0.45, g, 0.15 * b),
      n3: [C[0] / 2, -0.14 * b],
      n4: [(C[0] + D[0]) / 2, -0.14 * b],
    }),
    segments: {
      AB: ["A", "B"],
      AC: ["A", "C"],
      BD: ["B", "D"],
      AD: ["A", "D"],
    },
    labels: {
      A: "A",
      B: "B",
      C: "C",
      D: "D",
      n1: `${ab} cm`,
      n2: `${ac} cm`,
      n3: `${b} cm`,
      n4: "x cm",
    },
  };
}

const COPRIME_UP = [
  [1, 2],
  [2, 3],
  [3, 4],
  [1, 3],
  [3, 5],
  [2, 5],
  [4, 5],
] as const;

export const M2_GEO_SIM: TypeEntry[] = [
  // ── 도형의 닮음 ───────────────────────────────────────────
  def(MINOR_SIM, "01", "닮은 도형", SEC.닮은도형, "easy", (rng): Body => {
    const perm = intBetween(rng, 0, 5);
    const si = intBetween(rng, 0, 2);
    const ai = intBetween(rng, 0, 2);
    const rhs = SIM01_PERMS[perm]!;
    const lhs = ["A", "B", "C"] as const;
    const sidePairs = [
      [0, 1],
      [1, 2],
      [2, 0],
    ] as const;
    const [i1, i2] = sidePairs[si]!;
    const askedSide = `${lhs[i1]}${lhs[i2]}`;
    const matchedSide = `${rhs[i1]}${rhs[i2]}`;
    const askedAngle = lhs[ai];
    const matchedAngle = rhs[ai];
    return {
      content: `$\\triangle ABC\\backsim\\triangle ${rhs.join("")}$일 때, $\\overline{${askedSide}}$의 대응변과 $\\angle ${askedAngle}$의 대응각을 차례대로 구하시오.`,
      answer: `$\\overline{${matchedSide}}$, $\\angle ${matchedAngle}$`,
      solution: `닮음 기호에 적힌 순서가 대응 순서다. 점 $${lhs[0]}$, $${lhs[1]}$, $${lhs[2]}$의 대응점은 각각 점 $${rhs[0]}$, $${rhs[1]}$, $${rhs[2]}$이다.\n따라서 $\\overline{${askedSide}}$의 대응변은 $\\overline{${matchedSide}}$이고, $\\angle ${askedAngle}$의 대응각은 $\\angle ${matchedAngle}$이다.`,
      facts: { perm, si, ai },
      figureSpec: null,
    };
  }),

  def(
    MINOR_SIM,
    "02",
    "평면도형에서 닮음의 성질",
    SEC.닮은도형,
    "easy",
    (rng): Body => {
      const [p, q] = pick(rng, COPRIME_UP);
      const k1 = intBetween(rng, 2, 5);
      const k2 = intBetween(rng, 2, 5);
      const bc = p * k1;
      const ef = q * k1;
      const ab = p * k2;
      const x = q * k2;
      return {
        content: `그림에서 $\\triangle ABC\\backsim\\triangle DEF$이고 $\\overline{BC}=${bc}\\,\\mathrm{cm}$, $\\overline{EF}=${ef}\\,\\mathrm{cm}$이다. $\\overline{AB}=${ab}\\,\\mathrm{cm}$일 때, $\\overline{DE}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `$\\overline{BC}$의 대응변은 $\\overline{EF}$이므로 닮음비는 $${bc}:${ef}=${p}:${q}$이다.\n$\\overline{AB}:\\overline{DE}=${p}:${q}$이므로 $\\overline{DE}=${ab}\\times\\dfrac{${q}}{${p}}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { bc, ef, ab, x },
        figureSpec: figSim02(p, q, {
          bc: `${bc} cm`,
          ef: `${ef} cm`,
          ab: `${ab} cm`,
          de: "x cm",
        }),
      };
    },
  ),

  def(
    MINOR_SIM,
    "03",
    "입체도형에서 닮음의 성질",
    SEC.닮은도형,
    "mid",
    (rng): Body => {
      const [p, q] = pick(rng, COPRIME_UP);
      const k = intBetween(rng, 2, 4);
      const k2 = intBetween(rng, 2, 5);
      const k3 = intBetween(rng, 2, 5);
      const a1 = p * k;
      const a2 = q * k;
      const b1 = p * k2;
      const c1 = p * k3;
      const x = q * (k2 + k3);
      return {
        content: `서로 닮은 두 직육면체 $A$, $B$에서 직육면체 $A$의 가로의 길이는 $${a1}\\,\\mathrm{cm}$, 직육면체 $B$의 가로의 길이는 $${a2}\\,\\mathrm{cm}$이다. 직육면체 $A$의 세로의 길이가 $${b1}\\,\\mathrm{cm}$, 높이가 $${c1}\\,\\mathrm{cm}$일 때, 직육면체 $B$의 세로의 길이와 높이의 합을 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `닮음비는 $${a1}:${a2}=${p}:${q}$이다.\n직육면체 $B$의 세로의 길이는 $${b1}\\times\\dfrac{${q}}{${p}}=${(b1 * q) / p}\\,(\\mathrm{cm})$, 높이는 $${c1}\\times\\dfrac{${q}}{${p}}=${(c1 * q) / p}\\,(\\mathrm{cm})$이다.\n따라서 합은 $${(b1 * q) / p}+${(c1 * q) / p}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { a1, a2, b1, c1, x },
        figureSpec: null,
      };
    },
  ),

  def(
    MINOR_SIM,
    "04",
    "원뿔 또는 원기둥의 닮음비",
    SEC.닮은도형,
    "mid",
    (rng): Body => {
      const [m, n] = pick(rng, [
        [1, 2],
        [1, 3],
        [2, 3],
        [3, 4],
        [2, 5],
        [3, 5],
      ] as const);
      const k = intBetween(rng, 1, 4);
      const r1 = m * k;
      const R = n * k;
      const area = R * R;
      return {
        content: `원뿔을 밑면에 평행한 평면으로 잘랐더니, 단면인 원의 중심에서 꼭짓점까지의 거리가 원뿔의 높이의 $\\dfrac{${m}}{${n}}$이었다. 단면인 원의 반지름의 길이가 $${r1}\\,\\mathrm{cm}$일 때, 처음 원뿔의 밑면의 넓이를 구하시오.`,
        answer: `$${area}\\pi\\,\\mathrm{cm}^2$`,
        solution: `잘라 낸 작은 원뿔과 처음 원뿔은 닮은 도형이고 닮음비는 $${m}:${n}$이다.\n밑면의 반지름의 길이의 비도 $${m}:${n}$이므로 처음 원뿔의 밑면의 반지름의 길이는 $${r1}\\times\\dfrac{${n}}{${m}}=${R}\\,(\\mathrm{cm})$이다.\n따라서 밑면의 넓이는 $\\pi\\times${R}^2=${area}\\pi\\,(\\mathrm{cm}^2)$이다.`,
        facts: { m, n, r1, R, area },
        figureSpec: null,
      };
    },
  ),

  def(
    MINOR_SIM,
    "05",
    "닮은 두 평면도형의 넓이의 비",
    SEC.넓이부피비,
    "easy",
    (rng): Body => {
      const [p, q] = pick(rng, COPRIME_UP);
      const t = intBetween(rng, 2, 4);
      const k = intBetween(rng, 2, 5);
      const ab = p * t;
      const ad = q * t;
      const s = p * p * k;
      const x = q * q * k;
      return {
        content: `그림에서 $\\triangle ABC\\backsim\\triangle ADE$이고 $\\overline{AB}=${ab}\\,\\mathrm{cm}$, $\\overline{AD}=${ad}\\,\\mathrm{cm}$이다. $\\triangle ABC$의 넓이가 $${s}\\,\\mathrm{cm}^2$일 때, $\\triangle ADE$의 넓이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}^2$`,
        solution: `닮음비는 $\\overline{AB}:\\overline{AD}=${p}:${q}$이므로 넓이의 비는 $${p * p}:${q * q}$이다.\n$\\triangle ADE$의 넓이는 $${s}\\times\\dfrac{${q * q}}{${p * p}}=${x}\\,(\\mathrm{cm}^2)$이다.`,
        facts: { ab, ad, s, x },
        figureSpec: figSim05(ab, ad),
      };
    },
  ),

  def(
    MINOR_SIM,
    "06",
    "닮은 두 입체도형의 겉넓이의 비와 부피의 비",
    SEC.넓이부피비,
    "mid",
    (rng): Body => {
      const [p, q] = pick(rng, [
        [2, 3],
        [3, 4],
        [1, 2],
        [2, 5],
        [3, 5],
      ] as const);
      const k = intBetween(rng, 2, 6);
      const w = intBetween(rng, 1, 4);
      const s1 = p * p * k;
      const s2 = q * q * k;
      const v1 = p * p * p * w;
      const x = q * q * q * w;
      return {
        content: `서로 닮은 두 직육면체 $A$, $B$의 겉넓이가 각각 $${s1}\\,\\mathrm{cm}^2$, $${s2}\\,\\mathrm{cm}^2$이다. 직육면체 $A$의 부피가 $${v1}\\,\\mathrm{cm}^3$일 때, 직육면체 $B$의 부피를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}^3$`,
        solution: `겉넓이의 비가 $${s1}:${s2}=${p * p}:${q * q}$이므로 닮음비는 $${p}:${q}$이다.\n부피의 비는 $${p * p * p}:${q * q * q}$이므로 직육면체 $B$의 부피는 $${v1}\\times\\dfrac{${q * q * q}}{${p * p * p}}=${x}\\,(\\mathrm{cm}^3)$이다.`,
        facts: { s1, s2, v1, x },
        figureSpec: null,
      };
    },
  ),

  def(
    MINOR_SIM,
    "07",
    "닮은 두 평면도형의 넓이의 비의 활용",
    SEC.넓이부피비,
    "easy",
    (rng): Body => {
      const [p, q] = pick(rng, [
        [4, 5],
        [2, 3],
        [3, 4],
        [1, 2],
        [3, 5],
      ] as const);
      const u = pick(rng, [2, 4] as const);
      const d1 = p * u;
      const d2 = q * u;
      const w = 100 * intBetween(rng, 3, 8);
      const c1 = p * p * w;
      const x = q * q * w;
      const food = pick(rng, ["피자", "팬케이크", "와플"] as const);
      return {
        content: `어느 가게에서 지름의 길이가 $${d1}\\,\\mathrm{cm}$인 원 모양 ${food} 한 판의 가격은 $${c1}$원이다. ${food}의 가격이 ${food}의 넓이에 정비례할 때, 지름의 길이가 $${d2}\\,\\mathrm{cm}$인 ${food} 한 판의 가격을 구하시오. (단, ${food}의 두께는 생각하지 않는다.)`,
        answer: `$${x}$원`,
        solution: `두 ${food}는 닮은 도형이고 닮음비는 $${d1}:${d2}=${p}:${q}$이므로 넓이의 비는 $${p * p}:${q * q}$이다.\n가격이 넓이에 정비례하므로 구하는 가격은 $${c1}\\times\\dfrac{${q * q}}{${p * p}}=${x}$(원)이다.`,
        facts: { d1, d2, c1, x },
        figureSpec: null,
      };
    },
  ),

  def(
    MINOR_SIM,
    "08",
    "닮은 두 입체도형의 겉넓이의 비와 부피의 비의 활용",
    SEC.넓이부피비,
    "hard",
    (rng): Body => {
      const m = intBetween(rng, 2, 4);
      const v = intBetween(rng, 1, 5);
      const x = v * (m * m * m - 1);
      return {
        content: `원뿔 모양의 빈 물통에 물 $${v}\\,\\mathrm{L}$를 부었더니 물의 높이가 물통의 높이의 $\\dfrac{1}{${m}}$이 되었다. 이 물통에 물을 가득 채우려면 물을 몇 $\\mathrm{L}$ 더 부어야 하는지 구하시오. (단, 물통의 두께는 생각하지 않는다.)`,
        answer: `$${x}\\,\\mathrm{L}$`,
        solution: `물이 찬 부분과 물통 전체는 닮은 원뿔이고 닮음비는 $1:${m}$이므로 부피의 비는 $1:${m * m * m}$이다.\n물통 전체의 부피는 $${v}\\times${m * m * m}=${v * m * m * m}\\,(\\mathrm{L})$이다.\n따라서 더 부어야 하는 물의 양은 $${v * m * m * m}-${v}=${x}\\,(\\mathrm{L})$이다.`,
        facts: { v, m, x },
        figureSpec: null,
      };
    },
  ),

  // ── 평행선 사이의 선분의 길이의 비 ────────────────────────
  def(
    MINOR_PAR,
    "01",
    "삼각형에서 평행선 사이의 선분의 길이의 비⑴",
    SEC.삼평행비,
    "easy",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      const [p, q] = pick(rng, COPRIME_UP);
      if (mode === 0) {
        const k = intBetween(rng, 1, 3);
        const t = intBetween(rng, 2, 5);
        const a = p * k;
        const b = q * k;
        const e = p * t;
        const x = q * t;
        return {
          content: `그림과 같은 삼각형 $ABC$에서 점 $D$, $E$는 각각 $\\overline{AB}$, $\\overline{AC}$ 위의 점이고 $\\overline{BC}\\parallel\\overline{DE}$이다. $\\overline{AD}=${a}\\,\\mathrm{cm}$, $\\overline{DB}=${b}\\,\\mathrm{cm}$, $\\overline{AE}=${e}\\,\\mathrm{cm}$일 때, $\\overline{EC}$의 길이를 구하시오.`,
          answer: `$${x}\\,\\mathrm{cm}$`,
          solution: `$\\overline{BC}\\parallel\\overline{DE}$이므로 $\\overline{AD}:\\overline{DB}=\\overline{AE}:\\overline{EC}$이다.\n$${a}:${b}=${e}:\\overline{EC}$에서 $\\overline{EC}=${e}\\times\\dfrac{${b}}{${a}}=${x}\\,(\\mathrm{cm})$이다.`,
          facts: { mode, a, b, e, x },
          figureSpec: figPar01(a / (a + b), {
            ad: `${a} cm`,
            db: `${b} cm`,
            ae: `${e} cm`,
            ec: "x cm",
          }),
        };
      }
      const t = intBetween(rng, 1, 3);
      const s = intBetween(rng, 2, 5);
      const a = p * t;
      const c = (p + q) * t;
      const bc = (p + q) * s;
      const x = p * s;
      return {
        content: `그림과 같은 삼각형 $ABC$에서 점 $D$, $E$는 각각 $\\overline{AB}$, $\\overline{AC}$ 위의 점이고 $\\overline{BC}\\parallel\\overline{DE}$이다. $\\overline{AB}=${c}\\,\\mathrm{cm}$, $\\overline{AD}=${a}\\,\\mathrm{cm}$, $\\overline{BC}=${bc}\\,\\mathrm{cm}$일 때, $\\overline{DE}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `$\\overline{BC}\\parallel\\overline{DE}$이므로 $\\overline{AD}:\\overline{AB}=\\overline{DE}:\\overline{BC}$이다.\n$\\overline{DE}=${bc}\\times\\dfrac{${a}}{${c}}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { mode, a, c, bc, x },
        figureSpec: figPar01(a / c, {
          ad: `${a} cm`,
          bc: `${bc} cm`,
          de: "x cm",
        }),
      };
    },
  ),

  def(
    MINOR_PAR,
    "02",
    "삼각형에서 평행선 사이의 선분의 길이의 비⑵",
    SEC.삼평행비,
    "mid",
    (rng): Body => {
      const [p, q] = pick(rng, COPRIME_UP);
      const t = intBetween(rng, 1, 3);
      const s = intBetween(rng, 2, 5);
      const ab = (p + q) * t;
      const ae = p * t;
      const bc = (p + q) * s;
      const x = p * s;
      return {
        content: `그림과 같이 두 선분 $BE$, $CD$의 교점을 $A$라 하자. $\\overline{BC}\\parallel\\overline{DE}$이고 $\\overline{AB}=${ab}\\,\\mathrm{cm}$, $\\overline{AE}=${ae}\\,\\mathrm{cm}$, $\\overline{BC}=${bc}\\,\\mathrm{cm}$일 때, $\\overline{DE}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `$\\overline{BC}\\parallel\\overline{DE}$이므로 $\\overline{AB}:\\overline{AE}=\\overline{BC}:\\overline{DE}$이다.\n$\\overline{DE}=${bc}\\times\\dfrac{${ae}}{${ab}}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { ab, ae, bc, x },
        figureSpec: figPar02(ae / ab, {
          ab: `${ab} cm`,
          ae: `${ae} cm`,
          bc: `${bc} cm`,
          de: "x cm",
        }),
      };
    },
  ),

  def(
    MINOR_PAR,
    "03",
    "삼각형에서 평행선 사이의 선분의 길이의 비의 응용 ⑴",
    SEC.삼평행비,
    "hard",
    (rng): Body => {
      const [g1u, g2u] = pick(rng, COPRIME_UP);
      const m = intBetween(rng, 2, 4);
      const k = intBetween(rng, 1, 3);
      const g1 = g1u * m;
      const g2 = g2u * m;
      const dTotal = (g1u + g2u) * k;
      const x = g2u * k;
      return {
        content: `그림과 같은 삼각형 $ABC$에서 $\\overline{BC}\\parallel\\overline{DE}$이고, 점 $G$는 $\\overline{BC}$ 위의 점, 점 $F$는 $\\overline{AG}$와 $\\overline{DE}$의 교점이다. $\\overline{BG}=${g1}\\,\\mathrm{cm}$, $\\overline{GC}=${g2}\\,\\mathrm{cm}$, $\\overline{DE}=${dTotal}\\,\\mathrm{cm}$일 때, $\\overline{FE}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `$\\overline{DF}:\\overline{BG}=\\overline{AF}:\\overline{AG}=\\overline{FE}:\\overline{GC}$이므로 $\\overline{DF}:\\overline{FE}=\\overline{BG}:\\overline{GC}=${g1}:${g2}$이다.\n$\\overline{FE}=${dTotal}\\times\\dfrac{${g2}}{${g1 + g2}}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { g1, g2, d: dTotal, x },
        figureSpec: figPar03(g1, g2, {
          g1: `${g1} cm`,
          g2: `${g2} cm`,
          fe: "x cm",
        }),
      };
    },
  ),

  def(
    MINOR_PAR,
    "04",
    "삼각형에서 평행선 사이의 선분의 길이의 비의 응용⑵",
    SEC.삼평행비,
    "hard",
    (rng): Body => {
      const [f1, f2] = pick(rng, [
        [9, 3],
        [8, 4],
        [4, 2],
        [16, 4],
        [12, 6],
        [25, 5],
        [18, 6],
        [16, 8],
        [9, 6],
      ] as const);
      const x = ((f1 + f2) * f2) / f1;
      return {
        content: `그림과 같은 삼각형 $ABC$에서 점 $D$, $F$는 $\\overline{AB}$ 위의 점, 점 $E$는 $\\overline{AC}$ 위의 점이고 $\\overline{BC}\\parallel\\overline{DE}$, $\\overline{DC}\\parallel\\overline{FE}$이다. $\\overline{AF}=${f1}\\,\\mathrm{cm}$, $\\overline{FD}=${f2}\\,\\mathrm{cm}$일 때, $\\overline{DB}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `삼각형 $ADC$에서 $\\overline{DC}\\parallel\\overline{FE}$이므로 $\\overline{AE}:\\overline{EC}=\\overline{AF}:\\overline{FD}=${f1}:${f2}$이다.\n삼각형 $ABC$에서 $\\overline{BC}\\parallel\\overline{DE}$이므로 $\\overline{AD}:\\overline{DB}=\\overline{AE}:\\overline{EC}=${f1}:${f2}$이다.\n$\\overline{AD}=${f1 + f2}\\,\\mathrm{cm}$이므로 $\\overline{DB}=${f1 + f2}\\times\\dfrac{${f2}}{${f1}}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { f1, f2, x },
        figureSpec: figPar04(f1, f2),
      };
    },
  ),

  def(
    MINOR_PAR,
    "05",
    "삼각형에서 평행한 선분 찾기",
    SEC.삼평행비,
    "mid",
    (rng): Body => {
      const [p, q] = pick(rng, COPRIME_UP);
      const t = intBetween(rng, 1, 3);
      const s = intBetween(rng, 2, 5);
      const a = p * t;
      const c = (p + q) * t;
      const f = (p + q) * s;
      const x = p * s;
      return {
        content: `그림과 같은 삼각형 $ABC$에서 점 $D$, $E$는 각각 $\\overline{AB}$, $\\overline{AC}$ 위의 점이다. $\\overline{AB}=${c}\\,\\mathrm{cm}$, $\\overline{AD}=${a}\\,\\mathrm{cm}$, $\\overline{AC}=${f}\\,\\mathrm{cm}$일 때, $\\overline{BC}\\parallel\\overline{DE}$가 되도록 하는 $\\overline{AE}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `$\\overline{AD}:\\overline{AB}=\\overline{AE}:\\overline{AC}$이면 $\\overline{BC}\\parallel\\overline{DE}$이다.\n$${a}:${c}=\\overline{AE}:${f}$에서 $\\overline{AE}=${f}\\times\\dfrac{${a}}{${c}}=${x}\\,(\\mathrm{cm})$이다.`,
        facts: { a, c, f, x },
        figureSpec: figPar01(a / c, { ad: `${a} cm`, ae: "x cm" }),
      };
    },
  ),

  def(
    MINOR_PAR,
    "06",
    "삼각형의 내각의 이등분선의 성질",
    SEC.각이등분,
    "mid",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      const [pu, qu] = pick(rng, [
        [3, 2],
        [4, 3],
        [5, 4],
        [2, 1],
        [5, 3],
        [6, 5],
      ] as const);
      const u = intBetween(rng, 2, 4);
      const ab = pu * u;
      const ac = qu * u;
      if (mode === 0) {
        const k = intBetween(rng, 1, 3);
        const bd = pu * k;
        const x = qu * k;
        return {
          content: `그림과 같은 삼각형 $ABC$에서 $\\overline{AD}$는 $\\angle A$의 이등분선이고 점 $D$는 $\\overline{BC}$ 위의 점이다. $\\overline{AB}=${ab}\\,\\mathrm{cm}$, $\\overline{AC}=${ac}\\,\\mathrm{cm}$, $\\overline{BD}=${bd}\\,\\mathrm{cm}$일 때, $\\overline{CD}$의 길이를 구하시오.`,
          answer: `$${x}\\,\\mathrm{cm}$`,
          solution: `삼각형의 내각의 이등분선의 성질에서 $\\overline{AB}:\\overline{AC}=\\overline{BD}:\\overline{CD}$이다.\n$${ab}:${ac}=${bd}:\\overline{CD}$에서 $\\overline{CD}=${bd}\\times\\dfrac{${ac}}{${ab}}=${x}\\,(\\mathrm{cm})$이다.`,
          facts: { mode, ab, ac, bd, x },
          figureSpec: figPar06(ab, ac, {
            ab: `${ab} cm`,
            ac: `${ac} cm`,
            bd: `${bd} cm`,
            dc: "x cm",
          }),
        };
      }
      const w = intBetween(rng, 2, 6);
      const s = pu * w;
      const x = qu * w;
      return {
        content: `그림과 같은 삼각형 $ABC$에서 $\\overline{AD}$는 $\\angle A$의 이등분선이고 점 $D$는 $\\overline{BC}$ 위의 점이다. $\\overline{AB}=${ab}\\,\\mathrm{cm}$, $\\overline{AC}=${ac}\\,\\mathrm{cm}$이고 삼각형 $ABD$의 넓이가 $${s}\\,\\mathrm{cm}^2$일 때, 삼각형 $ADC$의 넓이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}^2$`,
        solution: `$\\overline{BD}:\\overline{CD}=\\overline{AB}:\\overline{AC}=${ab}:${ac}$이고, 두 삼각형 $ABD$, $ADC$는 높이가 같으므로 넓이의 비는 밑변의 길이의 비와 같다.\n삼각형 $ADC$의 넓이는 $${s}\\times\\dfrac{${ac}}{${ab}}=${x}\\,(\\mathrm{cm}^2)$이다.`,
        facts: { mode, ab, ac, s, x },
        figureSpec: figPar06(ab, ac, { ab: `${ab} cm`, ac: `${ac} cm` }),
      };
    },
  ),

  def(
    MINOR_PAR,
    "07",
    "삼각형의 외각의 이등분선의 성질",
    SEC.각이등분,
    "hard",
    (rng): Body => {
      const r = intBetween(rng, 1, 4);
      const t = intBetween(rng, 1, 3);
      const b = intBetween(rng, t + 1, 8);
      const ab = (r + 1) * t;
      const ac = r * t;
      const x = r * b;
      return {
        content: `그림과 같은 삼각형 $ABC$에서 $\\overline{AD}$는 $\\angle A$의 외각의 이등분선이고 점 $D$는 $\\overline{BC}$의 연장선 위의 점이다. $\\overline{AB}=${ab}\\,\\mathrm{cm}$, $\\overline{AC}=${ac}\\,\\mathrm{cm}$, $\\overline{BC}=${b}\\,\\mathrm{cm}$일 때, $\\overline{CD}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{cm}$`,
        solution: `삼각형의 외각의 이등분선의 성질에서 $\\overline{AB}:\\overline{AC}=\\overline{BD}:\\overline{CD}$이다.\n$\\overline{CD}=x\\,\\mathrm{cm}$라 하면 $${ab}:${ac}=(${b}+x):x$이므로 $${ab}x=${ac}(${b}+x)$, 즉 $${ab - ac}x=${ac * b}$에서 $x=${x}$이다.\n따라서 $\\overline{CD}=${x}\\,\\mathrm{cm}$이다.`,
        facts: { ab, ac, b, x },
        figureSpec: figPar07(ab, ac, b, x),
      };
    },
  ),
];
