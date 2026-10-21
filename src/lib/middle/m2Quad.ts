/**
 * 중2 「평행사변형」 — RPM 2-2 «평행사변형»(01~13, 전량 새 단원).
 *
 * `m2GeoQuad.ts`(여러 가지 사각형)와 같은 계약을 쓴다 — 정답을 먼저 정하고
 * 발문을 역산, `facts` 로 독립 검산, 숫자는 전부 `$...$` 안. 이 파일은 그
 * 파일을 본보기로 삼되 **따로 복사**했다(공유 헬퍼로 묶지 않는다 — 병렬
 * 세션이 그 파일을 아직 만지고 있을 수도 있어서다).
 *
 * ## 그림 규약
 * 사각형 꼭짓점 배치는 `m2GeoQuad.ts`와 같다 — **A 왼쪽 위 · B 왼쪽 아래 ·
 * C 오른쪽 아래 · D 오른쪽 위**(살짝 기울여 평행사변형처럼 보이게 `slant`).
 *
 * ⚠️ 평행 표시(»)는 **이미 평행사변형으로 확정된 도형에만** 찍는다. 07·08
 * (평행사변형이 되는 조건⑴⑵)은 아직 확정 전이라 길이·각 tick 만 찍고
 * 평행 표시는 찍지 않는다 — 결론을 그림이 먼저 말해 버리면 안 된다.
 * 13(조건의 응용⑵)은 「AB∥DC」 자체가 **주어진 전제**라 그 한 쌍만 찍는다.
 */
import { intBetween } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";
const BOOK = "2-2";
const MINOR = "평행사변형";

/** 우리 `Unit.section` 정확한 이름 (`prisma/seed-data/units.ts` 실측 2026-08-24) */
const SEC = {
  성질: "평행사변형의 성질",
  조건: "평행사변형이 되는 조건",
} as const;

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

type XY = [number, number];
type Fig = Record<string, unknown>;

/** 수학 좌표(y-위) → SVG 좌표(y-아래), 220×190 균일 배율 (m2GeoQuad 와 동일 규약). */
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
  rpmType: string,
  rpmTitle: string,
  unitSection: string,
  difficulty: MidProblem["difficulty"],
  gen: (rng: Rng) => Body,
): TypeEntry {
  return {
    key: `${BOOK}|${MINOR}|${rpmType}`,
    grade: GRADE,
    unitSection,
    rpmBook: BOOK,
    rpmMinor: MINOR,
    rpmType,
    rpmTitle,
    handler: (rng) => ({
      grade: GRADE,
      unitSection,
      rpmBook: BOOK,
      rpmMinor: MINOR,
      rpmType,
      rpmTitle,
      difficulty,
      ...gen(rng),
    }),
  };
}

/**
 * 「$cx=d$이므로 $x=…$」 — 계수 $c$ 가 $1$ 이면 「$1x=8$」을 적지 않고, 가운데 줄이 결론과
 * 같아져 「$x=8$이므로 $x=8$이고」로 되풀이되므로 바로 「$x=8$」로 쓴다.
 */
function solveX(c: number, d: number, x: number): string {
  return c === 1 ? `$x=${x}$` : `$${c}x=${d}$이므로 $x=${x}$`;
}

// ── 도형 ────────────────────────────────────────────────────────────────

/** 기본 네 꼭짓점 (A 왼위 · B 왼아래 · C 오른아래 · D 오른위, 기울기 slant). */
function quadPts(w: number, h: number, slant: number): Record<string, XY> {
  return { A: [slant, h], B: [0, 0], C: [w, 0], D: [w + slant, h] };
}

/**
 * 이미 확정된 평행사변형 — 평행 표시(AB∥DC 1개·AD∥BC 2개)만, 대각선 없음.
 * 02·03(대변·대각의 길이/크기)이 쓴다.
 */
function figParaBasic(w: number, h: number, slant: number): Fig {
  const pts = quadPts(w, h, slant);
  return {
    version: 2,
    points: fitPts(pts),
    segments: {
      AB: { points: ["A", "B"], parallel: 1 },
      DC: { points: ["D", "C"], parallel: 1 },
      AD: { points: ["A", "D"], parallel: 2 },
      BC: { points: ["B", "C"], parallel: 2 },
    },
    labels: { A: "A", B: "B", C: "C", D: "D" },
  };
}

/**
 * 확정된 평행사변형 + 대각선 교점 O(intersection). `tickAO`·`tickBO` 로
 * AO=CO·BO=DO 표시를 고른다(0 이면 표시 없음). `onlyAB` 면 AB∥DC 만 찍는다
 * (13 — 「한 쌍만 주어짐」 프레이밍).
 */
function figParaDiag(
  w: number,
  h: number,
  slant: number,
  opts: { tickAO?: number; tickBO?: number; onlyAB?: boolean } = {},
): Fig {
  const pts: Record<string, XY> = quadPts(w, h, slant);
  pts.O = [(w + slant) / 2, h / 2];
  const segments: Record<string, unknown> = {
    AB: { points: ["A", "B"], parallel: 1 },
    DC: { points: ["D", "C"], parallel: 1 },
    AO: { points: ["A", "O"], ticks: opts.tickAO ?? 0 },
    OC: { points: ["O", "C"], ticks: opts.tickAO ?? 0 },
    BO: { points: ["B", "O"], ticks: opts.tickBO ?? 0 },
    OD: { points: ["O", "D"], ticks: opts.tickBO ?? 0 },
  };
  if (!opts.onlyAB) {
    segments.AD = { points: ["A", "D"], parallel: 2 };
    segments.BC = { points: ["B", "C"], parallel: 2 };
  }
  return {
    version: 2,
    points: fitPts(pts),
    segments,
    labels: { A: "A", B: "B", C: "C", D: "D", O: "O" },
  };
}

/** 확정된 평행사변형 + 대각선 하나(AC 만) — 10 유형(넓이가 반씩 나뉨)이 쓴다. */
function figParaOneDiag(w: number, h: number, slant: number): Fig {
  const pts = quadPts(w, h, slant);
  return {
    version: 2,
    points: fitPts(pts),
    segments: {
      AB: { points: ["A", "B"], parallel: 1 },
      DC: { points: ["D", "C"], parallel: 1 },
      AD: { points: ["A", "D"], parallel: 2 },
      BC: { points: ["B", "C"], parallel: 2 },
      AC: ["A", "C"],
    },
    labels: { A: "A", B: "B", C: "C", D: "D" },
  };
}

/**
 * ∠A 의 이등분선이 BC 와 만나는 점 E — 04·05 공용(BE=AB 가 되는 이등변삼각형).
 * `E = B + (m/n)·(C-B)`, 즉 BE=m, BC=n 이 되는 자리에 직접 찍는다.
 * `angB` 를 주면 ∠B 에 라벨을 붙인다(05 전용, 숫자는 발문이 준 값만).
 */
function figParaBisectE(
  m: number,
  n: number,
  angB?: string,
  /** 라벨이 요구하는 $\angle B$(도). 주면 그 각이 **실제로** 그려진다. */
  angBDeg?: number,
): Fig {
  const w = 14 * n;
  const h = 90;
  // 🔴 **라벨을 붙일 거면 모양이 그 각을 따라야 한다.**
  //
  // `quadPts` 는 $B=(0,0)$·$C=(w,0)$·$A=(\text{slant},h)$ 다. 그러므로
  // $\tan(\angle B) = h/\text{slant}$ 이고, 요구된 각 $t$ 를 그리려면
  // `slant = h / tan(t)` 여야 한다($t>90^\circ$ 면 음수 — 둔각이라 $A$ 가 $B$ 의
  // 왼쪽으로 눕는 것이 옳다).
  //
  // ⚠️ 종전에는 `slant = 40` **고정**이라 어떤 $b$ 를 받아도 지면의 각은 늘
  //    $\arctan(90/40) = 66^\circ$ 였다. 라벨만 $40^\circ$~$140^\circ$ 로 바뀌었다.
  //    실측 최악 **58° 어긋남** — 원장님이 2026-08-27 에 지적하신 그 부류다.
  const slant =
    angBDeg === undefined ? 40 : r2(h / Math.tan(angBDeg * (Math.PI / 180)));
  const pts: Record<string, XY> = quadPts(w, h, slant);
  pts.E = [r2(w * (m / n)), 0];
  const angles: Record<string, unknown> = {};
  if (angB !== undefined) {
    angles.angB = { vertex: "B", points: ["A", "C"], label: angB };
  }
  return {
    version: 2,
    points: fitPts(pts),
    segments: {
      AB: { points: ["A", "B"], ticks: 1, parallel: 1 },
      DC: { points: ["D", "C"], parallel: 1 },
      AD: { points: ["A", "D"], parallel: 2 },
      BC: ["B", "C"],
      BE: { points: ["B", "E"], ticks: 1 },
      AE: ["A", "E"],
    },
    angles,
    labels: { A: "A", B: "B", C: "C", D: "D", E: "E" },
  };
}

/** 조건⑴⑵(07·08) — 아직 미확정 사각형. 변 tick 만(평행 표시 없음). */
function figCondSides(
  w: number,
  h: number,
  slant: number,
  tickAB: number,
  tickAD: number,
): Fig {
  const pts = quadPts(w, h, slant);
  return {
    version: 2,
    points: fitPts(pts),
    segments: {
      AB: { points: ["A", "B"], ticks: tickAB },
      DC: { points: ["D", "C"], ticks: tickAB },
      AD: { points: ["A", "D"], ticks: tickAD },
      BC: { points: ["B", "C"], ticks: tickAD },
    },
    labels: { A: "A", B: "B", C: "C", D: "D" },
  };
}

/** 조건⑵(08) — 미확정 사각형, ∠A·∠C 에 이중 호(같은 각임을 표시, 숫자 없음). */
function figCondAngles(w: number, h: number, slant: number, angleBDeg?: number): Fig {
  // Engine-only coordinates; no evaluated angle/answer is added to student labels.
  if (angleBDeg !== undefined && (!Number.isFinite(angleBDeg) || angleBDeg <= 0 || angleBDeg >= 180)) {
    throw new Error("조건 각은 0도와 180도 사이여야 합니다");
  }
  const theta = angleBDeg === undefined ? undefined : angleBDeg * Math.PI / 180;
  const leg = Math.hypot(h, slant);
  const pts = theta === undefined
    ? quadPts(w, h, slant)
    : quadPts(w, leg * Math.sin(theta), leg * Math.cos(theta));
  const points = fitPts(pts);
  let angleRadius: number | undefined;
  if (theta !== undefined) {
    // Radius is in the fitted diagram's units. Keep the given A/C arcs inside
    // both nonincident sides even when the supplementary B/D angle is small.
    const A = points.A!;
    const B = points.B!;
    const C = points.C!;
    const abX = A[0] - B[0], abY = A[1] - B[1];
    const bcX = C[0] - B[0], bcY = C[1] - B[1];
    const twiceArea = Math.abs(abX * bcY - abY * bcX);
    const clearance = Math.min(twiceArea / Math.hypot(abX, abY), twiceArea / Math.hypot(bcX, bcY));
    angleRadius = Math.min(18, 0.65 * clearance);
    if (!Number.isFinite(angleRadius) || angleRadius <= 0) throw new Error("각 표시 여유가 없습니다");
  }
  return {
    version: 2,
    points,
    segments: {
      AB: ["A", "B"],
      DC: ["D", "C"],
      AD: ["A", "D"],
      BC: ["B", "C"],
    },
    angles: {
      angA: { vertex: "A", points: ["B", "D"], arcs: 1, ...(angleRadius === undefined ? {} : { radius: angleRadius, serialized_inset: true }) },
      angC: { vertex: "C", points: ["B", "D"], arcs: 1, ...(angleRadius === undefined ? {} : { radius: angleRadius, serialized_inset: true }) },
    },
    labels: { A: "A", B: "B", C: "C", D: "D" },
  };
}

/** 조건의 응용⑴(09) — 대각선 교점 O, AO=CO tick 만(다른 대각선은 안 그림). */
function figCondDiagOne(w: number, h: number, slant: number): Fig {
  const pts: Record<string, XY> = quadPts(w, h, slant);
  pts.O = [(w + slant) / 2, h / 2];
  return {
    version: 2,
    points: fitPts(pts),
    segments: {
      AB: { points: ["A", "B"], parallel: 1 },
      DC: { points: ["D", "C"], parallel: 1 },
      AD: { points: ["A", "D"], parallel: 2 },
      BC: { points: ["B", "C"], parallel: 2 },
      AO: { points: ["A", "O"], ticks: 1 },
      OC: { points: ["O", "C"], ticks: 1 },
      BD: ["B", "D"],
    },
    labels: { A: "A", B: "B", C: "C", D: "D", O: "O" },
  };
}

/** 넓이 — 내부의 한 점 P (11 유형). 대각선 없이 P 에서 네 꼭짓점으로 선분. */
function figParaInterior(
  w: number,
  h: number,
  slant: number,
  jx: number,
  jy: number,
): Fig {
  const pts: Record<string, XY> = quadPts(w, h, slant);
  const cx = (pts.A![0] + pts.B![0] + pts.C![0] + pts.D![0]) / 4;
  const cy = (pts.A![1] + pts.B![1] + pts.C![1] + pts.D![1]) / 4;
  pts.P = [r2(cx + jx * w), r2(cy + jy * h)];
  return {
    version: 2,
    points: fitPts(pts),
    segments: {
      AB: { points: ["A", "B"], parallel: 1 },
      DC: { points: ["D", "C"], parallel: 1 },
      AD: { points: ["A", "D"], parallel: 2 },
      BC: { points: ["B", "C"], parallel: 2 },
      PA: ["P", "A"],
      PB: ["P", "B"],
      PC: ["P", "C"],
      PD: ["P", "D"],
    },
    labels: { A: "A", B: "B", C: "C", D: "D", P: "P" },
  };
}

/**
 * 12 — ∠A, ∠B 의 이등분선의 교점 P 가 변 CD 위(항상 CD 의 중점, DP=PC=AD 이므로).
 * DP·DA 짝에 tick 1, PC·CB 짝에 tick 2.
 */
function figParaBisectP(w: number, h: number, slant: number): Fig {
  const pts: Record<string, XY> = quadPts(w, h, slant);
  pts.P = [r2((pts.D![0] + pts.C![0]) / 2), r2((pts.D![1] + pts.C![1]) / 2)];
  return {
    version: 2,
    points: fitPts(pts),
    segments: {
      AB: { points: ["A", "B"], parallel: 1 },
      AD: { points: ["A", "D"], ticks: 1 },
      BC: { points: ["B", "C"], ticks: 2 },
      DP: { points: ["D", "P"], ticks: 1 },
      PC: { points: ["P", "C"], ticks: 2 },
      AP: ["A", "P"],
      BP: ["B", "P"],
    },
    labels: { A: "A", B: "B", C: "C", D: "D", P: "P" },
  };
}

// ── 명제 은행 (01 유형) ─────────────────────────────────────────────────

/**
 * «평행사변형의 뜻» 명제 은행. `true` = 옳은 명제.
 * 테스트가 **자기 표**로 같은 판정을 다시 세운다(동어반복 방지) — 여기 값을
 * 고치면 테스트가 빨개진다.
 */
export const PARA01_CLAIMS: readonly (readonly [string, boolean])[] = [
  ["두 쌍의 대변이 각각 평행한 사각형을 평행사변형이라 한다.", true],
  ["평행사변형의 두 쌍의 대변의 길이는 각각 같다.", true],
  ["평행사변형의 두 쌍의 대각의 크기는 각각 같다.", true],
  ["평행사변형의 두 대각선은 서로 다른 것을 수직이등분한다.", false],
  ["평행사변형에서 이웃하는 두 내각의 크기의 합은 $180^\\circ$이다.", true],
  ["한 쌍의 대변이 평행하고 그 길이가 같은 사각형은 평행사변형이다.", true],
  ["네 변의 길이가 모두 같은 사각형은 평행사변형이다.", true],
  ["두 대각선의 길이가 서로 같은 사각형은 평행사변형이다.", false],
  ["평행사변형의 한 대각선은 그 평행사변형의 넓이를 이등분한다.", true],
  ["한 쌍의 대변의 길이가 같은 사각형은 평행사변형이다.", false],
  ["두 쌍의 대각의 크기가 각각 같은 사각형은 평행사변형이다.", true],
  ["평행사변형은 항상 마름모이다.", false],
] as const;

const BOGI = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ"] as const;

/**
 * 서로 다른 색인 `count` 개를 오름차순으로 뽑는다 (Fisher–Yates).
 * ⚠️ 「중복이면 다시 뽑기」는 앞쪽 색인이 편중된다(2026-08-23 실측) — 섞어 뽑는다.
 */
function distinctIndices(rng: Rng, total: number, count: number): number[] {
  if (count > total) throw new Error("뽑을 개수가 전체보다 많습니다");
  const bag = Array.from({ length: total }, (_, i) => i);
  for (let i = total - 1; i > 0; i -= 1) {
    const j = intBetween(rng, 0, i);
    [bag[i], bag[j]] = [bag[j]!, bag[i]!];
  }
  return bag.slice(0, count).sort((a, b) => a - b);
}

// ── 유형 ────────────────────────────────────────────────────────────────

export const M2_QUAD: TypeEntry[] = [
  def("01", "평행사변형의 뜻", SEC.성질, "기본", (rng): Body => {
    const idx = distinctIndices(rng, PARA01_CLAIMS.length, 5);
    const x = idx.filter((i) => PARA01_CLAIMS[i]![1]).length;
    const lines = idx
      .map((i, k) => `${BOGI[k]}. ${PARA01_CLAIMS[i]![0]}`)
      .join("\n");
    const truth = idx
      .map(
        (i, k) => `${BOGI[k]}. ${PARA01_CLAIMS[i]![1] ? "옳다" : "옳지 않다"}`,
      )
      .join("\n");
    return {
      content: `다음 보기 중 옳은 것은 모두 몇 개인지 구하시오.\n\n${lines}`,
      answer: `$${x}$개`,
      solution: `평행사변형의 뜻과 성질에 따라 각 명제의 참·거짓을 살피면 다음과 같다.\n${truth}\n따라서 옳은 것은 $${x}$개이다.`,
      facts: {
        i0: idx[0]!,
        i1: idx[1]!,
        i2: idx[2]!,
        i3: idx[3]!,
        i4: idx[4]!,
        x,
      },
      figureSpec: null,
    };
  }),

  def("02", "평행사변형의 성질⑴", SEC.성질, "기본", (rng): Body => {
    const mode = intBetween(rng, 0, 1);
    if (mode === 0) {
      const p = intBetween(rng, 2, 4);
      const x = intBetween(rng, 3, 8);
      const q = intBetween(rng, 1, 7);
      const s = (p - 1) * x + q;
      const L = p * x + q;
      return {
        content: `평행사변형 $ABCD$에서 $\\overline{AB}=(${p}x+${q})\\,\\mathrm{cm}$, $\\overline{CD}=(x+${s})\\,\\mathrm{cm}$이다. $\\overline{AB}$의 길이를 구하시오.`,
        answer: `$${L}\\,\\mathrm{cm}$`,
        solution: `평행사변형의 두 쌍의 대변의 길이는 각각 같으므로 $\\overline{AB}=\\overline{CD}$이다.\n$${p}x+${q}=x+${s}$에서 ${solveX(p - 1, s - q, x)}이고, $\\overline{AB}=${p}\\times${x}+${q}=${L}\\,(\\mathrm{cm})$이다.`,
        facts: { mode, p, q, x, s, L, ans: L },
        figureSpec: figParaBasic(150, 92, 40),
      };
    }
    const m = intBetween(rng, 2, 5);
    const n = attempt(60, () => {
      const v = intBetween(rng, 2, 5);
      return v !== m ? v : null;
    });
    const k = intBetween(rng, 2, 9);
    const AB = m * k;
    const BC = n * k;
    const peri = 2 * (AB + BC);
    return {
      content: `평행사변형 $ABCD$의 둘레의 길이가 $${peri}\\,\\mathrm{cm}$이고 $\\overline{AB}:\\overline{BC}=${m}:${n}$일 때, $\\overline{AB}$의 길이를 구하시오.`,
      answer: `$${AB}\\,\\mathrm{cm}$`,
      solution: `$\\overline{AB}:\\overline{BC}=${m}:${n}$이므로 $\\overline{AB}=${m}k$, $\\overline{BC}=${n}k$ ($k$는 상수)라 하면 둘레는 $2(${m}k+${n}k)=${2 * (m + n)}k=${peri}$이다.\n따라서 $k=${k}$이고 $\\overline{AB}=${m}\\times${k}=${AB}\\,(\\mathrm{cm})$이다.`,
      facts: { mode, m, n, k, AB, BC, peri, ans: AB },
      figureSpec: figParaBasic(m * 20, n * 20, 30),
    };
  }),

  def("03", "평행사변형의 성질⑵", SEC.성질, "기본", (rng): Body => {
    const mode = intBetween(rng, 0, 1);
    if (mode === 0) {
      const p = intBetween(rng, 2, 5);
      const x = intBetween(rng, 5, 15);
      const q = intBetween(rng, 1, 20);
      const s = (p - 1) * x + q;
      const C = p * x + q;
      return {
        content: `평행사변형 $ABCD$에서 $\\angle A=(${p}x+${q})^\\circ$, $\\angle C=(x+${s})^\\circ$일 때, $\\angle C$의 크기를 구하시오.`,
        answer: `$${C}^\\circ$`,
        solution: `평행사변형의 두 쌍의 대각의 크기는 각각 같으므로 $\\angle A=\\angle C$이다.\n$${p}x+${q}=x+${s}$에서 ${solveX(p - 1, s - q, x)}이고, $\\angle C=x+${s}=${C}^\\circ$이다.`,
        facts: { mode, p, q, x, s, C, ans: C },
        figureSpec: figParaBasic(150, 92, 40),
      };
    }
    const [p, x, q, s, A, B] = attempt(80, () => {
      const p2 = intBetween(rng, 2, 5);
      const x2 = intBetween(rng, 5, 15);
      const q2 = intBetween(rng, 1, 20);
      const A2 = p2 * x2 + q2;
      if (A2 < 50 || A2 > 130) return null;
      const B2 = 180 - A2;
      const s2 = B2 - x2;
      if (s2 <= 0) return null;
      return [p2, x2, q2, s2, A2, B2] as const;
    });
    return {
      content: `평행사변형 $ABCD$에서 $\\angle A=(${p}x+${q})^\\circ$, $\\angle B=(x+${s})^\\circ$일 때, $\\angle B$의 크기를 구하시오.`,
      answer: `$${B}^\\circ$`,
      solution: `$\\overline{AD}\\parallel\\overline{BC}$이므로 이웃하는 두 내각의 크기의 합은 $180^\\circ$이다.\n$(${p}x+${q})+(x+${s})=180$에서 $${p + 1}x=${180 - q - s}$이므로 $x=${x}$이고, $\\angle B=x+${s}=${B}^\\circ$이다.`,
      facts: { mode, p, q, x, s, A, B, ans: B },
      figureSpec: figParaBasic(150, 92, 40),
    };
  }),

  def(
    "04",
    "평행사변형의 성질의 응용 대변의 길이",
    SEC.성질,
    "응용",
    (rng): Body => {
      const m = intBetween(rng, 4, 10);
      const n = attempt(60, () => {
        const v = intBetween(rng, m + 2, 20);
        return v > m ? v : null;
      });
      const ans = n - m;
      return {
        content: `평행사변형 $ABCD$에서 $\\angle A$의 이등분선이 변 $BC$와 만나는 점을 $E$라 하자. $\\overline{AB}=${m}\\,\\mathrm{cm}$, $\\overline{BC}=${n}\\,\\mathrm{cm}$일 때, $\\overline{EC}$의 길이를 구하시오.`,
        answer: `$${ans}\\,\\mathrm{cm}$`,
        solution: `$\\overline{AD}\\parallel\\overline{BC}$이므로 엇각에서 $\\angle DAE=\\angle AEB$이고, $\\overline{AE}$가 $\\angle A$를 이등분하므로 $\\angle DAE=\\angle BAE$이다.\n따라서 $\\angle BAE=\\angle AEB$이므로 삼각형 $ABE$는 이등변삼각형이고 $\\overline{BE}=\\overline{AB}=${m}\\,\\mathrm{cm}$이다.\n따라서 $\\overline{EC}=\\overline{BC}-\\overline{BE}=${n}-${m}=${ans}\\,(\\mathrm{cm})$이다.`,
        facts: { m, n, ans },
        figureSpec: figParaBisectE(m, n),
      };
    },
  ),

  def(
    "05",
    "평행사변형의 성질의 응용 대각의 크기",
    SEC.성질,
    "응용",
    (rng): Body => {
      const b = 2 * intBetween(rng, 20, 70);
      const m = intBetween(rng, 5, 9);
      const n = intBetween(rng, m + 2, 14);
      const angleA = 180 - b;
      const ans = 90 - b / 2;
      return {
        content: `평행사변형 $ABCD$에서 $\\angle A$의 이등분선이 변 $BC$와 만나는 점을 $E$, $\\angle B=${b}^\\circ$일 때, $\\angle AEB$의 크기를 구하시오.`,
        answer: `$${ans}^\\circ$`,
        solution: `$\\overline{AD}\\parallel\\overline{BC}$이므로 이웃하는 두 내각의 합이 $180^\\circ$이다. $\\angle A=180^\\circ-${b}^\\circ=${angleA}^\\circ$이다.\n$\\overline{AE}$가 $\\angle A$를 이등분하므로 $\\angle BAE=\\dfrac{${angleA}^\\circ}{2}=${ans}^\\circ$이다.\n삼각형 $ABE$에서 $\\angle AEB=180^\\circ-${b}^\\circ-${ans}^\\circ=${ans}^\\circ$이다.`,
        facts: { b, m, n, angleA, ans },
        figureSpec: figParaBisectE(m, n, `${b}°`, b),
      };
    },
  ),

  def(
    "06",
    "평행사변형의 성질의 응용 대각선의 성질",
    SEC.성질,
    "응용",
    (rng): Body => {
      const s = intBetween(rng, 4, 14);
      const T = intBetween(rng, 6, 20);
      const P = s + T;
      const ans = 2 * T;
      return {
        content: `평행사변형 $ABCD$에서 두 대각선의 교점을 $O$라 하자. 삼각형 $AOB$의 둘레의 길이가 $${P}\\,\\mathrm{cm}$이고 $\\overline{AB}=${s}\\,\\mathrm{cm}$일 때, $\\overline{AC}+\\overline{BD}$의 값을 구하시오.`,
        answer: `$${ans}\\,\\mathrm{cm}$`,
        solution: `평행사변형의 두 대각선은 서로 다른 것을 이등분하므로 $\\overline{AO}=\\overline{CO}$, $\\overline{BO}=\\overline{DO}$이다.\n삼각형 $AOB$의 둘레는 $\\overline{AO}+\\overline{BO}+\\overline{AB}=${P}$이므로 $\\overline{AO}+\\overline{BO}=${P}-${s}=${T}$이다.\n따라서 $\\overline{AC}+\\overline{BD}=2(\\overline{AO}+\\overline{BO})=2\\times${T}=${ans}\\,(\\mathrm{cm})$이다.`,
        facts: { s, T, P, ans },
        figureSpec: figParaDiag(150, 92, 40, { tickAO: 1, tickBO: 2 }),
      };
    },
  ),

  def("07", "평행사변형이 되는 조건⑴", SEC.조건, "응용", (rng): Body => {
    const p = intBetween(rng, 2, 5);
    const x = intBetween(rng, 3, 12);
    const q = intBetween(rng, 1, 9);
    const s = (p - 1) * x + q;
    return {
      content: `사각형 $ABCD$에서 $\\overline{AB}=(${p}x+${q})\\,\\mathrm{cm}$, $\\overline{CD}=(x+${s})\\,\\mathrm{cm}$이다. 다른 한 쌍의 대변의 길이도 각각 같을 때, $\\square ABCD$가 평행사변형이 되도록 하는 $x$의 값을 구하시오.`,
      answer: `$${x}$`,
      solution: `두 쌍의 대변의 길이가 각각 같은 사각형은 평행사변형이므로 $\\overline{AB}=\\overline{CD}$이어야 한다.\n$${p}x+${q}=x+${s}$에서 ${solveX(p - 1, s - q, x)}이다.`,
      facts: { p, q, x, s, ans: x },
      figureSpec: figCondSides(150, 92, 40, 1, 2),
    };
  }),

  def("08", "평행사변형이 되는 조건 ⑵", SEC.조건, "응용", (rng): Body => {
    const p = intBetween(rng, 2, 5);
    const x = intBetween(rng, 5, 15);
    const q = intBetween(rng, 1, 20);
    const s = (p - 1) * x + q;
    return {
      content: `사각형 $ABCD$에서 $\\angle A=(${p}x+${q})^\\circ$, $\\angle C=(x+${s})^\\circ$이다. 다른 한 쌍의 대각의 크기도 각각 같을 때, $\\square ABCD$가 평행사변형이 되도록 하는 $x$의 값을 구하시오.`,
      answer: `$${x}$`,
      solution: `두 쌍의 대각의 크기가 각각 같은 사각형은 평행사변형이므로 $\\angle A=\\angle C$이어야 한다.\n$${p}x+${q}=x+${s}$에서 ${solveX(p - 1, s - q, x)}이다.`,
      facts: { p, q, x, s, ans: x },
      figureSpec: figCondAngles(150, 92, 40),
    };
  }),

  def("09", "평행사변형이 되는 조건의 응용⑴", SEC.조건, "응용", (rng): Body => {
    const p = intBetween(rng, 2, 4);
    const x = intBetween(rng, 4, 12);
    const q = intBetween(rng, 1, 8);
    const s = (p - 1) * x + q;
    const AO = p * x + q;
    const AC = 2 * AO;
    return {
      content: `평행사변형 $ABCD$에서 두 대각선의 교점을 $O$라 하자. $\\overline{AO}=(${p}x+${q})\\,\\mathrm{cm}$, $\\overline{CO}=(x+${s})\\,\\mathrm{cm}$일 때, $\\overline{AC}$의 길이를 구하시오.`,
      answer: `$${AC}\\,\\mathrm{cm}$`,
      solution: `평행사변형의 두 대각선은 서로 다른 것을 이등분하므로 $\\overline{AO}=\\overline{CO}$이다.\n$${p}x+${q}=x+${s}$에서 ${solveX(p - 1, s - q, x)}이고, $\\overline{AO}=${p}\\times${x}+${q}=${AO}\\,\\mathrm{cm}$이다.\n따라서 $\\overline{AC}=2\\times${AO}=${AC}\\,(\\mathrm{cm})$이다.`,
      facts: { p, q, x, s, AO, AC, ans: AC },
      figureSpec: figCondDiagOne(150, 92, 40),
    };
  }),

  def(
    "10",
    "평행사변형과 넓이 대각선에 의해 나누어지는 경우",
    SEC.성질,
    "응용",
    (rng): Body => {
      const branch = intBetween(rng, 0, 2);
      if (branch === 0) {
        const S = 2 * intBetween(rng, 8, 60);
        const ans = S / 2;
        return {
          content: `평행사변형 $ABCD$의 넓이가 $${S}\\,\\mathrm{cm}^2$일 때, 대각선 $AC$에 의해 나누어지는 삼각형 $ABC$의 넓이를 구하시오.`,
          answer: `$${ans}\\,\\mathrm{cm}^2$`,
          solution: `평행사변형의 한 대각선은 그 넓이를 이등분하므로 삼각형 $ABC$의 넓이는 $\\dfrac{${S}}{2}=${ans}\\,(\\mathrm{cm}^2)$이다.`,
          facts: { branch, S, ans },
          figureSpec: figParaOneDiag(150, 92, 40),
        };
      }
      if (branch === 1) {
        const U = intBetween(rng, 8, 60);
        const ans = 2 * U;
        return {
          content: `평행사변형 $ABCD$에서 대각선 $AC$에 의해 나누어지는 삼각형 $ABC$의 넓이가 $${U}\\,\\mathrm{cm}^2$일 때, 평행사변형 $ABCD$의 넓이를 구하시오.`,
          answer: `$${ans}\\,\\mathrm{cm}^2$`,
          solution: `평행사변형의 한 대각선은 그 넓이를 이등분하므로 평행사변형의 넓이는 삼각형 $ABC$의 넓이의 $2$배이다.\n따라서 $2\\times${U}=${ans}\\,(\\mathrm{cm}^2)$이다.`,
          facts: { branch, U, ans },
          figureSpec: figParaOneDiag(150, 92, 40),
        };
      }
      const S = 4 * intBetween(rng, 4, 30);
      const ans = S / 4;
      return {
        content: `평행사변형 $ABCD$의 넓이가 $${S}\\,\\mathrm{cm}^2$이고 두 대각선의 교점을 $O$라 하자. 삼각형 $AOB$의 넓이를 구하시오.`,
        answer: `$${ans}\\,\\mathrm{cm}^2$`,
        solution: `평행사변형의 두 대각선은 넓이를 똑같은 넓이의 삼각형 $4$개로 나눈다.\n따라서 삼각형 $AOB$의 넓이는 $\\dfrac{${S}}{4}=${ans}\\,(\\mathrm{cm}^2)$이다.`,
        facts: { branch, S, ans },
        figureSpec: figParaDiag(150, 92, 40, { tickAO: 0, tickBO: 0 }),
      };
    },
  ),

  def(
    "11",
    "평행사변형과 넓이 내부의 한 점이 주어지는 경우",
    SEC.성질,
    "응용",
    (rng): Body => {
      const jx = intBetween(rng, -15, 15) / 100;
      const jy = intBetween(rng, -10, 10) / 100;
      const branch = intBetween(rng, 0, 1);
      if (branch === 0) {
        const u = intBetween(rng, 6, 30);
        const v = intBetween(rng, 6, 30);
        const ans = 2 * (u + v);
        return {
          content: `평행사변형 $ABCD$ 내부의 한 점 $P$에 대하여 삼각형 $PAB$의 넓이가 $${u}\\,\\mathrm{cm}^2$, 삼각형 $PCD$의 넓이가 $${v}\\,\\mathrm{cm}^2$일 때, 평행사변형 $ABCD$의 넓이를 구하시오.`,
          answer: `$${ans}\\,\\mathrm{cm}^2$`,
          solution: `평행사변형 내부의 한 점 $P$에 대하여 (삼각형 $PAB$의 넓이)$+$(삼각형 $PCD$의 넓이)는 평행사변형 넓이의 절반이다.\n따라서 평행사변형의 넓이는 $2\\times(${u}+${v})=${ans}\\,(\\mathrm{cm}^2)$이다.`,
          facts: { branch, u, v, ans },
          figureSpec: figParaInterior(150, 92, 40, jx, jy),
        };
      }
      const S = 2 * intBetween(rng, 16, 60);
      const u = intBetween(rng, 4, S / 2 - 4);
      const ans = S / 2 - u;
      return {
        content: `평행사변형 $ABCD$의 넓이가 $${S}\\,\\mathrm{cm}^2$이고, 내부의 한 점 $P$에 대하여 삼각형 $PAB$의 넓이가 $${u}\\,\\mathrm{cm}^2$일 때, 삼각형 $PCD$의 넓이를 구하시오.`,
        answer: `$${ans}\\,\\mathrm{cm}^2$`,
        solution: `평행사변형 내부의 한 점 $P$에 대하여 (삼각형 $PAB$의 넓이)$+$(삼각형 $PCD$의 넓이)는 평행사변형 넓이의 절반이다.\n따라서 삼각형 $PCD$의 넓이는 $\\dfrac{${S}}{2}-${u}=${ans}\\,(\\mathrm{cm}^2)$이다.`,
        facts: { branch, S, u, ans },
        figureSpec: figParaInterior(150, 92, 40, jx, jy),
      };
    },
  ),

  def(
    "12",
    "평행사변형의 성질의 응용 두 내각의 이등분선이 주어진 경우",
    SEC.성질,
    "심화하",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      if (mode === 0) {
        const p = intBetween(rng, 2, 4);
        const x = intBetween(rng, 3, 10);
        const q = intBetween(rng, 1, 8);
        const AD = p * x + q;
        const CD = 2 * AD;
        const s = CD - x;
        return {
          content: `평행사변형 $ABCD$에서 $\\angle A$, $\\angle B$의 이등분선의 교점 $P$가 변 $CD$ 위에 있다. $\\overline{AD}=(${p}x+${q})\\,\\mathrm{cm}$, $\\overline{CD}=(x+${s})\\,\\mathrm{cm}$일 때, $\\overline{CD}$의 길이를 구하시오.`,
          answer: `$${CD}\\,\\mathrm{cm}$`,
          solution: `$\\angle A$, $\\angle B$의 이등분선의 교점 $P$가 $\\overline{CD}$ 위에 있으면 $\\overline{DP}=\\overline{DA}$, $\\overline{CP}=\\overline{CB}$이다(엇각과 이등분선으로 생기는 이등변삼각형).\n$\\overline{AD}=\\overline{BC}$이므로 $\\overline{CD}=\\overline{DP}+\\overline{PC}=\\overline{DA}+\\overline{CB}=2\\times\\overline{AD}$이다.\n$x+${s}=2(${p}x+${q})$에서 $${2 * p - 1}x=${s - 2 * q}$이므로 $x=${x}$이고, $\\overline{AD}=${AD}\\,\\mathrm{cm}$, $\\overline{CD}=2\\times${AD}=${CD}\\,(\\mathrm{cm})$이다.`,
          facts: { mode, p, q, x, s, AD, CD, ans: CD },
          figureSpec: figParaBisectP(150, 92, 40),
        };
      }
      const r = intBetween(rng, 3, 15);
      const ans = 2 * r;
      return {
        content: `평행사변형 $ABCD$에서 $\\angle A$, $\\angle B$의 이등분선의 교점 $P$가 변 $CD$ 위에 있다. $\\overline{AD}=${r}\\,\\mathrm{cm}$일 때, $\\overline{CD}$의 길이를 구하시오.`,
        answer: `$${ans}\\,\\mathrm{cm}$`,
        solution: `$\\angle A$, $\\angle B$의 이등분선의 교점 $P$가 $\\overline{CD}$ 위에 있으면 $\\overline{DP}=\\overline{DA}$, $\\overline{CP}=\\overline{CB}=\\overline{AD}$이다.\n따라서 $\\overline{CD}=\\overline{DP}+\\overline{PC}=2\\times\\overline{AD}=2\\times${r}=${ans}\\,(\\mathrm{cm})$이다.`,
        facts: { mode, r, ans },
        figureSpec: figParaBisectP(150, 92, 40),
      };
    },
  ),

  def(
    "13",
    "평행사변형이 되는 조건의 응용 ⑵",
    SEC.조건,
    "심화하",
    (rng): Body => {
      const s = intBetween(rng, 5, 16);
      const T = intBetween(rng, 6, 22);
      const P = s + T;
      const ans = 2 * T;
      return {
        content: `사각형 $ABCD$에서 $\\overline{AB}\\parallel\\overline{DC}$이고 $\\overline{AB}=\\overline{DC}$이다(따라서 $\\square ABCD$는 평행사변형이다). 두 대각선의 교점을 $O$라 하자. $\\overline{AD}=${s}\\,\\mathrm{cm}$이고 삼각형 $AOD$의 둘레의 길이가 $${P}\\,\\mathrm{cm}$일 때, $\\overline{AC}+\\overline{BD}$의 값을 구하시오.`,
        answer: `$${ans}\\,\\mathrm{cm}$`,
        solution: `한 쌍의 대변이 평행하고 그 길이가 같으므로 $\\square ABCD$는 평행사변형이고, 두 대각선은 서로 다른 것을 이등분하므로 $\\overline{AO}=\\overline{CO}$, $\\overline{DO}=\\overline{BO}$이다.\n삼각형 $AOD$의 둘레는 $\\overline{AO}+\\overline{DO}+\\overline{AD}=${P}$이므로 $\\overline{AO}+\\overline{DO}=${P}-${s}=${T}$이다.\n따라서 $\\overline{AC}+\\overline{BD}=2(\\overline{AO}+\\overline{DO})=2\\times${T}=${ans}\\,(\\mathrm{cm})$이다.`,
        facts: { s, T, P, ans },
        figureSpec: figParaDiag(150, 92, 40, {
          tickAO: 1,
          tickBO: 2,
          onlyAB: true,
        }),
      };
    },
  ),
  def("14A", "두 쌍의 대변이 같은 조건", SEC.조건, "연산", (rng): Body => {
    const answer = intBetween(rng, 3, 14);
    const p = intBetween(rng, 2, 5);
    const q = intBetween(rng, 1, 9);
    const s = (p - 1) * answer + q;
    return {
      content: `사각형 $ABCD$에서 $\\overline{AB}=\\overline{CD}$, $\\overline{AD}=\\overline{BC}$이다. $\\overline{AB}=(${p}x+${q})\\,\\mathrm{cm}$, $\\overline{CD}=(x+${s})\\,\\mathrm{cm}$일 때, $x$의 값을 구하시오.`,
      answer: `$${answer}$`,
      solution: `두 쌍의 대변의 길이가 각각 같으므로 이 사각형은 평행사변형이다. $${p}x+${q}=x+${s}$에서 $x=${answer}$이다.`,
      facts: { p, q, s, ans: answer },
      figureSpec: figCondSides(150, 92, 40, 1, 2),
    };
  }),
  def("15A", "두 쌍의 대각이 같은 조건", SEC.조건, "기본", (rng): Body => {
    const answer = intBetween(rng, 4, 15);
    const p = intBetween(rng, 2, 4);
    const q = intBetween(rng, 1, 12);
    const s = (p - 1) * answer + q;
    return {
      content: `사각형 $ABCD$에서 $\\angle A=\\angle C$, $\\angle B=\\angle D$이다. $\\angle B=(${p}x+${q})^\\circ$, $\\angle D=(x+${s})^\\circ$일 때, $x$의 값을 구하시오.`,
      answer: `$${answer}$`,
      solution: `두 쌍의 대각의 크기가 각각 같으므로 이 사각형은 평행사변형이다. $${p}x+${q}=x+${s}$에서 $x=${answer}$이다.`,
      facts: { p, q, s, ans: answer },
      // Solve the printed B=D relation for its angle, without changing the RNG or task.
      figureSpec: figCondAngles(150, 92, 40, (p * s - q) / (p - 1)),
    };
  }),
  def(
    "16A",
    "두 대각선이 서로 이등분하는 조건",
    SEC.조건,
    "기본",
    (rng): Body => {
      const answer = intBetween(rng, 3, 12);
      const p = intBetween(rng, 2, 5);
      const q = intBetween(rng, 1, 8);
      const s = (p - 1) * answer + q;
      return {
        content: `사각형 $ABCD$의 두 대각선의 교점을 $O$라 하자. $\\overline{BO}=\\overline{DO}$이고 $\\overline{AO}=(${p}x+${q})\\,\\mathrm{cm}$, $\\overline{CO}=(x+${s})\\,\\mathrm{cm}$이다. 이 사각형이 평행사변형이 되도록 하는 $x$의 값을 구하시오.`,
        answer: `$${answer}$`,
        solution: `두 대각선이 서로 다른 것을 이등분하려면 $\\overline{AO}=\\overline{CO}$이어야 한다. $${p}x+${q}=x+${s}$에서 $x=${answer}$이다.`,
        facts: { p, q, s, ans: answer },
        figureSpec: figCondDiagOne(150, 92, 40),
      };
    },
  ),
  def(
    "17A",
    "한 쌍의 대변이 평행하고 같은 조건",
    SEC.조건,
    "응용",
    (rng): Body => {
      const answer = intBetween(rng, 4, 14);
      const p = intBetween(rng, 2, 5);
      const q = intBetween(rng, 1, 9);
      const s = (p - 1) * answer + q;
      return {
        content: `사각형 $ABCD$에서 $\\overline{AB}\\parallel\\overline{DC}$이다. $\\overline{AB}=(${p}x+${q})\\,\\mathrm{cm}$, $\\overline{DC}=(x+${s})\\,\\mathrm{cm}$일 때, 이 사각형이 평행사변형이 되도록 하는 $x$의 값을 구하시오.`,
        answer: `$${answer}$`,
        solution: `한 쌍의 대변이 평행하고 그 길이가 같으면 평행사변형이다. $${p}x+${q}=x+${s}$에서 $x=${answer}$이다.`,
        facts: { p, q, s, ans: answer },
        figureSpec: figParaDiag(150, 92, 40, { onlyAB: true }),
      };
    },
  ),
  def(
    "18A",
    "대각선의 이등분 조건으로 길이 구하기",
    SEC.조건,
    "응용",
    (rng): Body => {
      const half = intBetween(rng, 6, 24);
      const answer = 2 * half;
      return {
        content: `사각형 $ABCD$의 두 대각선의 교점 $O$에 대하여 $\\overline{AO}=\\overline{CO}$, $\\overline{BO}=\\overline{DO}$이다. $\\overline{AO}=${half}\\,\\mathrm{cm}$일 때, $\\overline{AC}$의 길이를 구하시오.`,
        answer: `$${answer}\\,\\mathrm{cm}$`,
        solution: `두 대각선이 서로 다른 것을 이등분하므로 이 사각형은 평행사변형이다. $\\overline{AC}=2\\times\\overline{AO}=2\\times${half}=${answer}\\,(\\mathrm{cm})$이다.`,
        facts: { half, ans: answer },
        figureSpec: figCondDiagOne(150, 92, 40),
      };
    },
  ),
  def(
    "19A",
    "한 쌍의 대변 조건으로 둘레 구하기",
    SEC.조건,
    "심화하",
    (rng): Body => {
      const sideA = intBetween(rng, 5, 18);
      const sideB = intBetween(rng, 5, 18);
      const answer = 2 * (sideA + sideB);
      return {
        content: `사각형 $ABCD$에서 $\\overline{AB}\\parallel\\overline{DC}$이고 $\\overline{AB}=\\overline{DC}=${sideA}\\,\\mathrm{cm}$이다. $\\overline{AD}=${sideB}\\,\\mathrm{cm}$일 때, 사각형 $ABCD$의 둘레의 길이를 구하시오.`,
        answer: `$${answer}\\,\\mathrm{cm}$`,
        solution: `한 쌍의 대변이 평행하고 그 길이가 같으므로 평행사변형이다. 따라서 $\\overline{BC}=\\overline{AD}=${sideB}\\,\\mathrm{cm}$이고 둘레는 $2(${sideA}+${sideB})=${answer}\\,(\\mathrm{cm})$이다.`,
        facts: { sideA, sideB, ans: answer },
        figureSpec: figParaDiag(150, 92, 40, { onlyAB: true }),
      };
    },
  ),

  /*
   * 20A — 「평행사변형의 성질」에는 `연산` 이 **하나도 없었다**(01·02·03 기본,
   * 04·05·06·10·11 응용, 12 심화). 하위반 프리셋이 이 소단원에서 밑단을 한
   * 문항도 못 채운다(D-106). 성질 둘(대각이 같다 · 이웃각의 합이 $180^\circ$ ·
   * 대변이 같다)을 **식 없이 곧바로 쓰는** 밑단으로 세운다.
   */
  def("20A", "평행사변형의 대각과 대변", SEC.성질, "연산", (rng): Body => {
    const mode = intBetween(rng, 0, 1);
    if (mode === 0) {
      const a = intBetween(rng, 35, 145);
      const b = 180 - a;
      return {
        content: `평행사변형 $ABCD$에서 $\\angle A=${a}^\\circ$일 때, $\\angle B$의 크기를 구하시오.`,
        answer: `$${b}^\\circ$`,
        solution: `$\\overline{AD}\\parallel\\overline{BC}$이므로 이웃하는 두 내각의 크기의 합은 $180^\\circ$이다.\n따라서 $\\angle B=180^\\circ-${a}^\\circ=${b}^\\circ$이다.`,
        facts: { mode, a, ans: b },
        figureSpec: figParaBasic(150, 92, 40),
      };
    }
    const m = intBetween(rng, 3, 16);
    const n = intBetween(rng, 3, 16);
    const peri = 2 * (m + n);
    return {
      content: `평행사변형 $ABCD$에서 $\\overline{AB}=${m}\\,\\mathrm{cm}$, $\\overline{BC}=${n}\\,\\mathrm{cm}$일 때, $\\square ABCD$의 둘레의 길이를 구하시오.`,
      answer: `$${peri}\\,\\mathrm{cm}$`,
      solution: `평행사변형의 두 쌍의 대변의 길이는 각각 같으므로 $\\overline{CD}=\\overline{AB}=${m}\\,\\mathrm{cm}$, $\\overline{AD}=\\overline{BC}=${n}\\,\\mathrm{cm}$이다.\n따라서 둘레의 길이는 $2\\times(${m}+${n})=${peri}\\,(\\mathrm{cm})$이다.`,
      facts: { mode, m, n, ans: peri },
      figureSpec: figParaBasic(150, 92, 40),
    };
  }),
];
