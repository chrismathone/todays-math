/**
 * 중2 「피타고라스 정리」 — RPM 2-2 «피타고라스 정리»(01~16 전량).
 *
 * 물결 6E 소유 모듈. 이 파일의 그림은 `m2GeoTri.ts`·`m2GeoQuad.ts` 등 다른 세션의
 * 파일을 건드리지 않고 이 파일 안에서 직접 짓는다(파일 소유권 — 6E 는 이 파일과
 * 그림 엔진(`scripts/figure/*`)만 만진다).
 *
 * 우리 Unit.section 은 RPM 중단원 하나(「피타고라스 정리」)를 **DB 는 둘로 쪼갠다**
 * (`prisma/seed-data/units.ts` 8단원 — 「피타고라스 정리」·「피타고라스 정리의 활용」).
 * 정리 자체·증명·역·닮음(01~09)은 「피타고라스 정리」, 그 성질을 문제에 **적용**하는
 * 유형(10~16 — 제목이 「…를 이용한」·「…의 넓이」·「최단 거리」·「종이접기」로 시작)은
 * 「피타고라스 정리의 활용」. RPM 제목 문구 자체가 그 경계를 가른다(10번부터
 * 「피타고라스 정리를 이용한」이 처음 등장).
 *
 * ## 생성 규칙 — 정답을 먼저 뽑고 발문을 역산한다 (m3.ts 와 동일 계약)
 *
 * 세 변의 길이가 필요한 유형은 전부 `TRIPLES`(피타고라스 세 쌍)에서 뽑아 답이 항상
 * 정수(또는 기약분수)가 된다. `facts` 에 발문의 원 수치를 남겨 테스트가 **다른 식**
 * (넓이를 두 가지로 표현·편차의 합=0 과 무관한 재계산 등)으로 독립 검산한다.
 *
 * ## 그림 (FigureSpec v2 · 실증 완료 도형만, 09 §2)
 *
 * 직각삼각형·직사각형·마름모·「피타고라스의 방법」 풍차 그림은 점·선분·각(직각)·치수로
 * 짓는다. 세 반원(13·14)·사각형 내부 임의의 점(11·12)·종이 접힘(16 은 예외 — 아래
 * 참조)처럼 v2 가 못 그리는 것은 **그림 없이 발문이 완결되게** 썼다(m3.ts 「접힌 원」
 * 유형 04 와 같은 결정).
 *
 * 16(종이접기)만 예외로 그림을 낸다 — 접은 모양 자체(겹친 삼각형)는 안 그리고,
 * 접기가 만드는 **직각삼각형 EBC**(대응하는 실제 도형)만 그린다.
 */
import { intBetween, pick } from "../elementary/rng";
import { drawScale } from "../figure/drawScale";
import type { Rng } from "../elementary/types";

import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";
const BOOK = "2-2";
const MINOR = "피타고라스 정리";

/** 우리 Unit.section 정확한 이름 (`prisma/seed-data/units.ts` 8단원, 실측 2026-08-24) */
const SEC = {
  정리: "피타고라스 정리",
  활용: "피타고라스 정리의 활용",
} as const;

/** 피타고라스 세 쌍 [짧은 변, 긴 변, 빗변] — m3.ts 의 같은 표를 이 파일에도 둔다
 * (그 파일은 export 하지 않고, 이 저장소의 다른 TRIPLES 도 전부 파일마다 따로
 * 둔다 — m1Solid.ts·m3Trig.ts 도 같은 무늬).
 */
const TRIPLES = [
  [3, 4, 5],
  [6, 8, 10],
  [5, 12, 13],
  [9, 12, 15],
  [8, 15, 17],
  [12, 16, 20],
  [7, 24, 25],
  [15, 20, 25],
  [10, 24, 26],
  [20, 21, 29],
] as const;

/** 조건을 만족할 때까지 다시 뽑는다 — 못 찾으면 던진다(조용히 기본값 금지). */
function attempt<T>(tries: number, f: () => T | null): T {
  for (let i = 0; i < tries; i += 1) {
    const v = f();
    if (v !== null) return v;
  }
  throw new Error("유형 생성 재시도 초과 — 매개변수 범위를 확인하십시오");
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === 0 ? 1 : x;
}

/** 기약분수 LaTeX. 분모가 1 이면 정수. 음수는 분자로 모은다. */
function frac(n: number, d: number): string {
  if (d === 0) throw new Error("분모가 0입니다");
  let nn = n;
  let dd = d;
  if (dd < 0) {
    nn = -nn;
    dd = -dd;
  }
  const g = gcd(nn, dd) || 1;
  nn /= g;
  dd /= g;
  if (dd === 1) return String(nn);
  return nn < 0 ? `-\\dfrac{${-nn}}{${dd}}` : `\\dfrac{${nn}}{${dd}}`;
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

// ── FigureSpec v2 도우미 — 이 파일 안에서만 쓴다 ──────────────────────────

type XY = [number, number];

/** 세 점 직각삼각형 + 직각 표시 + 두 변 치수(주어진 변만). `s_pythagoras()` 표본과
 * 같은 무늬(09-figure-engine-guide.md §「실증 완료」).
 */
function figRightTri(opts: {
  a: XY; // 직각 꼭짓점
  b: XY; // 다리 끝 1
  c: XY; // 다리 끝 2
  labelA: string;
  labelB: string;
  labelC: string;
  dimAB?: string;
  dimAC?: string;
}): Record<string, unknown> {
  const { a, b, c, labelA, labelB, labelC, dimAB, dimAC } = opts;
  const dimensions: Record<string, unknown> = {};
  if (dimAB) dimensions.ab = { points: ["A", "B"], label: dimAB, side: "auto" };
  if (dimAC) dimensions.ac = { points: ["A", "C"], label: dimAC, side: "auto" };
  return {
    version: 2,
    points: { A: a, B: b, C: c },
    segments: { AB: ["A", "B"], BC: ["B", "C"], CA: ["C", "A"] },
    angles: { a: { vertex: "A", points: ["B", "C"], right: true } },
    dimensions,
    labels: { A: labelA, B: labelB, C: labelC },
  };
}

/** 직사각형 ABCD + 대각선 AC + 두 변 치수. */
function figRectDiag(
  w: number,
  h: number,
  dimW: string,
  dimH: string,
): Record<string, unknown> {
  const s = drawScale(Math.max(w, h), 180);
  const A: XY = [0, h * s];
  const B: XY = [w * s, h * s];
  const C: XY = [w * s, 0];
  const D: XY = [0, 0];
  return {
    version: 2,
    points: { A, B, C, D },
    segments: {
      AB: ["A", "B"],
      BC: ["B", "C"],
      CD: ["C", "D"],
      DA: ["D", "A"],
      AC: ["A", "C"],
    },
    angles: { b: { vertex: "B", points: ["A", "C"], right: true } },
    dimensions: {
      ab: { points: ["A", "B"], label: dimW, side: "auto" },
      bc: { points: ["B", "C"], label: dimH, side: "auto" },
    },
    labels: { A: "A", B: "B", C: "C", D: "D" },
  };
}

/** 마름모 ABCD(대각선 AC·BD가 O에서 수직). **치수선을 안 단다** — 세로
 * 대각선 위에 곡선 치수선을 놓을 여백이 마름모의 뾰족한 꼭짓점 근처에는
 * 없어 v2 엔진이 "collision-free layout" 을 못 찾고 던진다(실렌더로 확인,
 * side·inset을 바꿔도 여러 종횡비에서 재현). 두 대각선 값은 발문이 이미
 * 말하므로(09 §4-20-b) 그림은 직각 표시만 보여준다.
 */
function figRhombusDiag(p: number, q: number): Record<string, unknown> {
  // p = 가로 대각선(BD) 전체 길이, q = 세로 대각선(AC) 전체 길이.
  const s = drawScale(Math.max(p, q), 160);
  const shortSide = Math.min(p, q);
  const s2 = shortSide * s < 90 ? 90 / shortSide : s;
  const cx = (p / 2) * s2;
  const cy = (q / 2) * s2;
  const A: XY = [cx, 0];
  const B: XY = [p * s2, cy];
  const C: XY = [cx, q * s2];
  const D: XY = [0, cy];
  return {
    version: 2,
    points: {
      A,
      B,
      C,
      D,
      O: { type: "intersection", segments: ["AC", "BD"] },
    },
    segments: {
      AB: ["A", "B"],
      BC: ["B", "C"],
      CD: ["C", "D"],
      DA: ["D", "A"],
      AC: ["A", "C"],
      BD: ["B", "D"],
    },
    angles: { o: { vertex: "O", points: ["A", "B"], right: true } },
    dimensions: {},
    labels: { A: "A", B: "B", C: "C", D: "D" },
  };
}

/** 「피타고라스의 방법」 풍차 그림 — 바깥 정사각형(한 변 a+b) 안에 합동인 직각삼각형
 * 넷을 돌려 배치하면 가운데에 (기울어진) 정사각형이 생긴다. 09 §4-19 의
 * 「좌표를 지어내지 말고 실제 비를 계산」을 그대로 따른다 — 안 점은 바깥 변을
 * 정확히 a:b 로 나누는 좌표다(손으로 어림한 위치가 아니다).
 */
function figPinwheel(a: number, b: number): Record<string, unknown> {
  // 상한을 14 로 둔다(7 이었을 때는 가장 작은 TRIPLES 쌍(3,4,5, 바깥 정사각형
  // 한 변 7)에서 도형이 49×49 로 작아져 다리 치수선 'as' 를 놓을 여백이
  // 없어 v2 엔진이 던졌다 — 실렌더로 확인, scale=14부터 안전).
  const s = drawScale(a + b, 170);
  const side = (a + b) * s;
  const A: XY = [0, side];
  const B: XY = [side, side];
  const C: XY = [side, 0];
  const D: XY = [0, 0];
  const P: XY = [a * s, side]; // AB 위, A 에서 a 만큼
  const Q: XY = [side, side - a * s]; // BC 위, B 에서 a 만큼
  const R: XY = [side - a * s, 0]; // CD 위, C 에서 a 만큼
  const S: XY = [0, a * s]; // DA 위, D 에서 a 만큼
  return {
    version: 2,
    points: { A, B, C, D, P, Q, R, S },
    segments: {
      AB: ["A", "B"],
      BC: ["B", "C"],
      CD: ["C", "D"],
      DA: ["D", "A"],
      PQ: ["P", "Q"],
      QR: ["Q", "R"],
      RS: ["R", "S"],
      SP: ["S", "P"],
    },
    angles: {
      a: { vertex: "A", points: ["B", "D"], right: true },
      b: { vertex: "B", points: ["C", "A"], right: true },
      c: { vertex: "C", points: ["D", "B"], right: true },
      d: { vertex: "D", points: ["A", "C"], right: true },
    },
    dimensions: {
      ap: { points: ["A", "P"], label: `${a}`, side: "auto" },
      as: { points: ["A", "S"], label: `${b}`, side: "auto" },
    },
    labels: { A: "A", B: "B", C: "C", D: "D" },
  };
}

/** 직각삼각형 + 빗변 위의 수선의 발 D. 09 지침의 「교점은 좌표로 미리 계산」 원칙 —
 * D 는 v2 에 없는 점 종류라 사영 공식으로 직접 계산해 좌표로 넣는다.
 */
function figAltitude(opts: {
  legA: number; // A 에서 만나는 다리(=CA)
  legB: number; // B 에서 만나는 다리(=CB)
  hyp: number;
  dimA?: string;
  dimB?: string;
  dimHyp?: string;
}): Record<string, unknown> {
  const { legA, legB, hyp, dimA, dimB, dimHyp } = opts;
  const s = drawScale(Math.max(legA, legB, hyp), 170);
  // 직각은 C. A=(0,0), B=(hyp,0) 로 두고 C 를 legA=CA, legB=CB 를 만족하게 배치.
  const cx = (legA * legA - legB * legB + hyp * hyp) / (2 * hyp);
  const cy = -Math.sqrt(Math.max(legA * legA - cx * cx, 0));
  const A: XY = [0, 0];
  const B: XY = [hyp * s, 0];
  const C: XY = [cx * s, cy * s];
  // D = C 에서 AB(=x축)에 내린 수선의 발.
  const D: XY = [cx * s, 0];
  return {
    version: 2,
    points: { A, B, C, D },
    segments: {
      AB: ["A", "B"],
      BC: ["B", "C"],
      CA: ["C", "A"],
      CD: ["C", "D"],
    },
    angles: {
      c: { vertex: "C", points: ["A", "B"], right: true },
      d: { vertex: "D", points: ["C", "A"], right: true },
    },
    dimensions: {
      ...(dimA ? { ca: { points: ["C", "A"], label: dimA, side: "auto" } } : {}),
      ...(dimB ? { cb: { points: ["C", "B"], label: dimB, side: "auto" } } : {}),
      ...(dimHyp ? { ab: { points: ["A", "B"], label: dimHyp, side: "auto" } } : {}),
    },
    labels: { A: "A", B: "B", C: "C", D: "D" },
  };
}

/** 종이접기(16) — 직사각형 ABCD + AB 위의 점 E + 선분 EC(접었을 때 EA 가 겹치는
 * 대상). 접힌 모양 자체(겹친 삼각형)는 v2 에 없어 그리지 않고, 풀이에 실제로
 * 쓰이는 직각삼각형 EBC 만 보인다.
 */
function figFoldRect(w: number, h: number, e: number): Record<string, unknown> {
  const s = drawScale(Math.max(w, h), 180);
  const A: XY = [0, h * s];
  const B: XY = [w * s, h * s];
  const C: XY = [w * s, 0];
  const D: XY = [0, 0];
  const E: XY = [e * s, h * s];
  return {
    version: 2,
    points: { A, B, C, D, E },
    segments: {
      AB: ["A", "B"],
      BC: ["B", "C"],
      CD: ["C", "D"],
      DA: ["D", "A"],
      EC: ["E", "C"],
    },
    angles: { b: { vertex: "B", points: ["E", "C"], right: true } },
    dimensions: {
      ab: { points: ["A", "B"], label: `${w} cm`, side: "auto" },
      bc: { points: ["B", "C"], label: `${h} cm`, side: "auto" },
    },
    labels: { A: "A", B: "B", C: "C", D: "D", E: "E" },
  };
}

export const M2_PYTHA: TypeEntry[] = [
  // ── 01 직각삼각형의 변의 길이 ───────────────────────────────────────
  def("01", "직각삼각형의 변의 길이", SEC.정리, "기본", (rng) => {
    const [p, q, r] = pick(rng, TRIPLES);
    const mode = pick(rng, [0, 1] as const);
    if (mode === 0) {
      return {
        content: `직각삼각형 ABC에서 $\\angle A=90^\\circ$이고 $\\overline{AB}=${p}\\,\\mathrm{cm}$, $\\overline{AC}=${q}\\,\\mathrm{cm}$일 때, $\\overline{BC}$의 길이를 구하시오.`,
        answer: `$${r}\\,\\mathrm{cm}$`,
        solution: `직각삼각형 $ABC$에서 피타고라스 정리에 의해 $\\overline{BC}^2=\\overline{AB}^2+\\overline{AC}^2=${p}^2+${q}^2=${r}^2$이다.\n따라서 $\\overline{BC}=${r}\\,\\mathrm{cm}$이다.`,
        facts: { p, q, r, mode },
        figureSpec: figRightTri({
          a: [0, 0],
          b: [0, p * drawScale(r, 170)],
          c: [q * drawScale(r, 170), 0],
          labelA: "A",
          labelB: "B",
          labelC: "C",
          dimAB: `${p} cm`,
          dimAC: `${q} cm`,
        }),
      };
    }
    return {
      content: `직각삼각형 ABC에서 $\\angle A=90^\\circ$이고 $\\overline{AB}=${p}\\,\\mathrm{cm}$, $\\overline{BC}=${r}\\,\\mathrm{cm}$일 때, $\\overline{AC}$의 길이를 구하시오.`,
      answer: `$${q}\\,\\mathrm{cm}$`,
      solution: `직각삼각형 $ABC$에서 피타고라스 정리에 의해 $\\overline{AC}^2=\\overline{BC}^2-\\overline{AB}^2=${r}^2-${p}^2=${q}^2$이다.\n따라서 $\\overline{AC}=${q}\\,\\mathrm{cm}$이다.`,
      facts: { p, q, r, mode },
      figureSpec: figRightTri({
        a: [0, 0],
        b: [0, p * drawScale(r, 170)],
        c: [q * drawScale(r, 170), 0],
        labelA: "A",
        labelB: "B",
        labelC: "C",
        dimAB: `${p} cm`,
      }),
    };
  }),

  // ── 02 삼각형에서 피타고라스 정리의 이용 (이등변삼각형의 높이) ──────
  def("02", "삼각형에서 피타고라스 정리의 이용", SEC.정리, "응용", (rng) => {
    const [half, h, leg] = pick(rng, TRIPLES);
    const base = 2 * half;
    const area = half * h;
    return {
      content: `이등변삼각형 ABC에서 $\\overline{AB}=\\overline{AC}=${leg}\\,\\mathrm{cm}$, $\\overline{BC}=${base}\\,\\mathrm{cm}$일 때, $\\triangle ABC$의 넓이를 구하시오.`,
      answer: `$${area}\\,\\mathrm{cm}^2$`,
      solution: `꼭짓점 $A$에서 $\\overline{BC}$에 내린 수선의 발을 $D$라 하면, 이등변삼각형의 성질에 의해 $D$는 $\\overline{BC}$의 중점이다.\n$\\overline{BD}=\\dfrac{1}{2}\\times${base}=${half}\\,(\\mathrm{cm})$이므로 직각삼각형 $ABD$에서 $\\overline{AD}=\\sqrt{${leg}^2-${half}^2}=${h}\\,(\\mathrm{cm})$이다.\n따라서 $\\triangle ABC=\\dfrac{1}{2}\\times${base}\\times${h}=${area}\\,\\mathrm{cm}^2$이다.`,
      facts: { half, h, leg, base, area },
      figureSpec: (() => {
        const s = drawScale(Math.max(base, h), 170);
        const A: XY = [half * s, 0];
        const B: XY = [0, h * s];
        const C: XY = [base * s, h * s];
        return {
          version: 2,
          points: { A, B, C },
          segments: { AB: ["A", "B"], BC: ["B", "C"], CA: ["C", "A"] },
          dimensions: {
            ab: {
              points: ["A", "B"],
              label: `${leg} cm`,
              side: "auto",
            },
            bc: {
              points: ["B", "C"],
              label: `${base} cm`,
              side: "auto",
            },
          },
          labels: { A: "A", B: "B", C: "C" },
        };
      })(),
    };
  }),

  // ── 03 직사각형의 대각선의 길이 ──────────────────────────────────────
  def("03", "직사각형의 대각선의 길이", SEC.정리, "기본", (rng) => {
    const [w, h, d] = pick(rng, TRIPLES);
    return {
      content: `직사각형 ABCD에서 $\\overline{AB}=${w}\\,\\mathrm{cm}$, $\\overline{BC}=${h}\\,\\mathrm{cm}$일 때, 대각선 $\\overline{AC}$의 길이를 구하시오.`,
      answer: `$${d}\\,\\mathrm{cm}$`,
      solution: `직각삼각형 $ABC$에서 $\\angle B=90^\\circ$이므로 피타고라스 정리에 의해 $\\overline{AC}=\\sqrt{\\overline{AB}^2+\\overline{BC}^2}=\\sqrt{${w}^2+${h}^2}=${d}\\,\\mathrm{cm}$이다.`,
      facts: { w, h, d },
      figureSpec: figRectDiag(w, h, `${w} cm`, `${h} cm`),
    };
  }),

  // ── 04 사각형에서 피타고라스 정리의 이용 (마름모의 한 변) ───────────
  def("04", "사각형에서 피타고라스 정리의 이용", SEC.정리, "응용", (rng) =>
    attempt(60, () => {
      const [hp, hq, side] = pick(rng, TRIPLES);
      // 두 반대각선의 비가 너무 크면(마름모가 아주 좁고 길어지면) 세로 대각선
      // 치수선을 놓을 옆 여백이 없어 v2 엔진이 "collision-free layout" 을 못
      // 찾고 던진다(실렌더로 확인 — 7,24 쌍에서 재현). 조용히 그림 없이 내는
      // 대신 비율을 걸러 다시 뽑는다 — 대부분의 TRIPLES 는 이 조건을 만족한다.
      if (Math.max(hp, hq) / Math.min(hp, hq) > 3) return null;
      const p = 2 * hp;
      const q = 2 * hq;
      return {
        content: `마름모 ABCD의 두 대각선의 길이가 각각 $\\overline{BD}=${p}\\,\\mathrm{cm}$, $\\overline{AC}=${q}\\,\\mathrm{cm}$일 때, 마름모의 한 변의 길이를 구하시오.`,
        answer: `$${side}\\,\\mathrm{cm}$`,
        solution: `마름모의 두 대각선은 서로 다른 것을 수직이등분하므로 두 대각선의 교점을 $O$라 하면 $\\overline{BO}=${hp}\\,\\mathrm{cm}$, $\\overline{AO}=${hq}\\,\\mathrm{cm}$이다.\n직각삼각형 $ABO$에서 피타고라스 정리에 의해 $\\overline{AB}=\\sqrt{${hp}^2+${hq}^2}=${side}\\,\\mathrm{cm}$이다.\n마름모는 네 변의 길이가 같으므로 한 변의 길이는 $${side}\\,\\mathrm{cm}$이다.`,
        facts: { hp, hq, side, p, q },
        figureSpec: figRhombusDiag(p, q),
      };
    }),
  ),

  // ── 05 피타고라스 정리의 증명 유클리드의 방법 ───────────────────────
  def(
    "05",
    "피타고라스 정리의 증명 유클리드의 방법",
    SEC.정리,
    "응용",
    (rng) => {
      const [a, b, c] = pick(rng, TRIPLES);
      const c2 = c * c;
      return {
        content: `직각삼각형 ABC에서 $\\angle C=90^\\circ$이고, 세 변을 각각 한 변으로 하는 정사각형을 그렸다. 유클리드는 빗변 위의 정사각형을 수선으로 두 직사각형으로 나누어, 각 직사각형의 넓이가 나머지 두 정사각형 중 하나의 넓이와 같음을 보이는 방법으로 피타고라스 정리를 증명했다. $\\overline{CA}=${b}\\,\\mathrm{cm}$, $\\overline{CB}=${a}\\,\\mathrm{cm}$일 때, 빗변 $\\overline{AB}$ 위의 정사각형의 넓이를 구하시오.`,
        answer: `$${c2}\\,\\mathrm{cm}^2$`,
        solution: `유클리드의 증명에서 빗변 위의 정사각형의 넓이는 나머지 두 정사각형의 넓이의 합과 같다.\n$\\overline{CA}$ 위의 정사각형의 넓이는 $${b}^2=${b * b}\\,(\\mathrm{cm}^2)$, $\\overline{CB}$ 위의 정사각형의 넓이는 $${a}^2=${a * a}\\,(\\mathrm{cm}^2)$이다.\n따라서 구하는 넓이는 $${a * a}+${b * b}=${c2}\\,\\mathrm{cm}^2$이다.`,
        facts: { a, b, c, c2 },
        figureSpec: null, // 유클리드 증명 특유의 보조선(수선의 발·연장선)은 v2 도형이 아니다 — 발문이 그림 없이 완결된다.
      };
    },
  ),

  // ── 06 피타고라스 정리의 증명 피타고라스의 방법 (풍차 그림) ─────────
  def(
    "06",
    "피타고라스 정리의 증명 피타고라스의 방법",
    SEC.정리,
    "응용",
    (rng) => {
      const [a, b, c] = pick(rng, TRIPLES);
      const c2 = c * c;
      return {
        content: `한 변의 길이가 $${a + b}\\,\\mathrm{cm}$인 정사각형 안에 합동인 직각삼각형(두 직각변의 길이 $${a}\\,\\mathrm{cm}$, $${b}\\,\\mathrm{cm}$) $4$개를 그림과 같이 배치하였더니 가운데에 정사각형이 생겼다. 가운데 정사각형의 넓이를 구하시오.`,
        answer: `$${c2}\\,\\mathrm{cm}^2$`,
        solution: `가운데 정사각형의 한 변의 길이는 직각삼각형의 빗변의 길이와 같다.\n직각삼각형의 빗변의 길이를 $c\\,\\mathrm{cm}$라 하면 피타고라스 정리에 의해 $c^2=${a}^2+${b}^2=${c2}$이다.\n따라서 가운데 정사각형의 넓이는 $${c2}\\,\\mathrm{cm}^2$이다.`,
        facts: { a, b, c, c2 },
        figureSpec: figPinwheel(a, b),
      };
    },
  ),

  // ── 07 직각삼각형이 되기 위한 조건 (역) ──────────────────────────────
  def("07", "직각삼각형이 되기 위한 조건", SEC.정리, "응용", (rng) => {
    const [p, q, r] = pick(rng, TRIPLES);
    return {
      content: `세 변의 길이가 각각 $${p}\\,\\mathrm{cm}$, $${q}\\,\\mathrm{cm}$, $x\\,\\mathrm{cm}$인 삼각형이 직각삼각형이 되도록 하는 자연수 $x$의 값을 구하시오. (단, $x$는 가장 긴 변의 길이이다.)`,
      answer: `$x=${r}$`,
      solution: `$x$가 가장 긴 변이므로 $x$의 대변인 각이 직각이 되어야 한다.\n피타고라스 정리의 역에 의해 $x^2=${p}^2+${q}^2=${r}^2$이면 직각삼각형이다.\n따라서 $x=${r}$이다.`,
      facts: { p, q, r },
      figureSpec: null, // 직각·예각·둔각을 가르는 유형은 그림을 실제 비율로 그리면 답이 그림에 드러난다(D-66 ⑺) — 그림 없이 낸다.
    };
  }),

  // ── 08 삼각형의 변의 길이와 각의 크기 사이의 관계 ───────────────────
  def(
    "08",
    "삼각형의 변의 길이와 각의 크기 사이의 관계",
    SEC.정리,
    "심화하",
    (rng) =>
      attempt(60, () => {
        const [p, q, r] = pick(rng, TRIPLES);
        const k = intBetween(rng, 1, 2);
        const [P, Q, R] = [p * k, q * k, r * k];
        const acute = pick(rng, [true, false] as const);
        // 예각: Q < x < R (x 가 가장 긴 변) · 둔각: R < x < P+Q.
        const lo = acute ? Q : R;
        const hi = acute ? R : P + Q;
        const xs: number[] = [];
        for (let x = lo + 1; x < hi; x += 1) xs.push(x);
        if (xs.length === 0 || xs.length > 6) return null;
        const kind = acute ? "예각삼각형" : "둔각삼각형";
        return {
          content: `세 변의 길이가 각각 $${P}\\,\\mathrm{cm}$, $${Q}\\,\\mathrm{cm}$, $x\\,\\mathrm{cm}$인 삼각형이 ${kind}이 되도록 하는 자연수 $x$의 값을 모두 구하시오. (단, $x$는 가장 긴 변의 길이이다.)`,
          answer: xs.map((x) => `$${x}$`).join(", "),
          solution: acute
            ? `$x$가 가장 긴 변일 때 삼각형이 예각삼각형이 되려면 $x^2<${P}^2+${Q}^2=${R}^2$, 즉 $${Q}<x<${R}$이어야 한다.\n이를 만족하는 자연수 $x$는 ${xs.map((x) => `$${x}$`).join(", ")}이다.`
            : `$x$가 가장 긴 변일 때 삼각형이 둔각삼각형이 되려면 $x^2>${P}^2+${Q}^2=${R}^2$이고 삼각형이 성립해야 하므로 $${R}<x<${P + Q}$이어야 한다.\n이를 만족하는 자연수 $x$는 ${xs.map((x) => `$${x}$`).join(", ")}이다.`,
          facts: {
            p: P,
            q: Q,
            r: R,
            acute: acute ? 1 : 0,
            lo,
            hi,
            count: xs.length,
          },
          figureSpec: null, // 07 과 같은 이유 — 예각·둔각을 실제 비율로 그리면 답이 드러난다.
        };
      }),
  ),

  // ── 09 직각삼각형의 닮음과 피타고라스 정리 (빗변 위의 수선) ─────────
  def(
    "09",
    "직각삼각형의 닮음과 피타고라스 정리",
    SEC.정리,
    "심화하",
    (rng) => {
      const [a, b, c] = pick(rng, TRIPLES);
      // △ABC(∠C=90°) 넓이를 두 가지로: (1/2)ab = (1/2)*c*h → h = ab/c.
      const h = frac(a * b, c);
      return {
        content: `직각삼각형 ABC에서 $\\angle C=90^\\circ$이고 $\\overline{CA}=${b}\\,\\mathrm{cm}$, $\\overline{CB}=${a}\\,\\mathrm{cm}$이다. 꼭짓점 $C$에서 빗변 $\\overline{AB}$에 내린 수선의 발을 $D$라 할 때, $\\overline{CD}$의 길이를 구하시오.`,
        answer: `$${h}\\,\\mathrm{cm}$`,
        solution: `피타고라스 정리에 의해 $\\overline{AB}=\\sqrt{${a}^2+${b}^2}=${c}\\,(\\mathrm{cm})$이다.\n$\\triangle ABC$의 넓이를 두 가지 방법으로 나타내면 $\\dfrac{1}{2}\\times${a}\\times${b}=\\dfrac{1}{2}\\times${c}\\times\\overline{CD}$이므로 $\\overline{CD}=\\dfrac{${a * b}}{${c}}=${h}\\,\\mathrm{cm}$이다.`,
        facts: { a, b, c },
        figureSpec: figAltitude({
          legA: b,
          legB: a,
          hyp: c,
          dimA: `${b} cm`,
          dimB: `${a} cm`,
        }),
      };
    },
  ),

  // ── 10 피타고라스 정리를 이용한 직각삼각형의 성질 (기하평균) ────────
  def(
    "10",
    "피타고라스 정리를 이용한 직각삼각형의 성질",
    SEC.활용,
    "응용",
    (rng) => {
      const [a, b, c] = pick(rng, TRIPLES);
      // ∠C=90°, 수선의 발 D. AB^2 = AD*AC 대신 BC^2 = BD*BA (BD = a^2/c) 를 쓴다.
      const bd = frac(a * a, c);
      return {
        content: `직각삼각형 ABC에서 $\\angle C=90^\\circ$이고 $\\overline{CB}=${a}\\,\\mathrm{cm}$, $\\overline{AB}=${c}\\,\\mathrm{cm}$이다. 꼭짓점 $C$에서 $\\overline{AB}$에 내린 수선의 발을 $D$라 할 때, $\\overline{BD}$의 길이를 구하시오.`,
        answer: `$${bd}\\,\\mathrm{cm}$`,
        solution: `직각삼각형 $ABC$와 직각삼각형 $CBD$는 $\\angle B$를 공유하고 각각 $\\angle C=\\angle BDC=90^\\circ$이므로 서로 닮음이다 (AA 닮음).\n따라서 $\\overline{CB}^2=\\overline{BD}\\times\\overline{BA}$, 즉 $${a}^2=\\overline{BD}\\times${c}$이므로 $\\overline{BD}=\\dfrac{${a * a}}{${c}}=${bd}\\,\\mathrm{cm}$이다.`,
        facts: { a, b, c },
        figureSpec: figAltitude({
          legA: b,
          legB: a,
          hyp: c,
          // CA is a derived length; show only the CB and AB given in the stem.
          dimHyp: `${c} cm`,
          dimB: `${a} cm`,
        }),
      };
    },
  ),

  // ── 11 피타고라스 정리를 이용한 사각형의 성질 ⑴ (직사각형 내부의 점) ─
  def(
    "11",
    "피타고라스 정리를 이용한 사각형의 성질 ⑴",
    SEC.활용,
    "심화하",
    (rng) => {
      const QUADS = [
        [10, 15, 6, 17],
        [7, 24, 15, 20],
        [5, 20, 8, 19],
        [2, 11, 5, 10],
        [5, 15, 9, 13],
      ] as const;
      const [pa, pc, pb, pd] = pick(rng, QUADS);
      return {
        content: `직사각형 ABCD 내부의 한 점 P에 대하여 $\\overline{PA}^2+\\overline{PC}^2=\\overline{PB}^2+\\overline{PD}^2$이 성립한다. $\\overline{PA}=${pa}\\,\\mathrm{cm}$, $\\overline{PB}=${pb}\\,\\mathrm{cm}$, $\\overline{PC}=${pc}\\,\\mathrm{cm}$일 때, $\\overline{PD}$의 길이를 구하시오.`,
        answer: `$${pd}\\,\\mathrm{cm}$`,
        solution: `직사각형 내부의 점의 성질에 의해 $\\overline{PA}^2+\\overline{PC}^2=\\overline{PB}^2+\\overline{PD}^2$이다.\n$${pa}^2+${pc}^2=${pb}^2+\\overline{PD}^2$이므로 $\\overline{PD}^2=${pa}^2+${pc}^2-${pb}^2=${pd}^2$이다.\n따라서 $\\overline{PD}=${pd}\\,\\mathrm{cm}$이다.`,
        facts: { pa, pb, pc, pd },
        figureSpec: null, // 임의의 내부 점 P — v2 로 그리려면 좌표 역산이 추가로 필요해 그림 없이 낸다.
      };
    },
  ),

  // ── 12 피타고라스 정리를 이용한 사각형의 성질 ⑵ (대각선이 수직인 사각형) ─
  def(
    "12",
    "피타고라스 정리를 이용한 사각형의 성질 ⑵",
    SEC.활용,
    "심화하",
    (rng) => {
      const QUADS = [
        [10, 15, 6, 17],
        [7, 24, 15, 20],
        [5, 20, 8, 19],
        [2, 11, 5, 10],
        [5, 15, 9, 13],
      ] as const;
      const [ab, cd, bc, da] = pick(rng, QUADS);
      return {
        content: `사각형 ABCD의 두 대각선 $\\overline{AC}$와 $\\overline{BD}$가 서로 수직일 때, $\\overline{AB}^2+\\overline{CD}^2=\\overline{BC}^2+\\overline{DA}^2$이 성립한다. $\\overline{AB}=${ab}\\,\\mathrm{cm}$, $\\overline{BC}=${bc}\\,\\mathrm{cm}$, $\\overline{CD}=${cd}\\,\\mathrm{cm}$일 때, $\\overline{DA}$의 길이를 구하시오.`,
        answer: `$${da}\\,\\mathrm{cm}$`,
        solution: `두 대각선이 수직인 사각형의 성질에 의해 $\\overline{AB}^2+\\overline{CD}^2=\\overline{BC}^2+\\overline{DA}^2$이다.\n$${ab}^2+${cd}^2=${bc}^2+\\overline{DA}^2$이므로 $\\overline{DA}^2=${ab}^2+${cd}^2-${bc}^2=${da}^2$이다.\n따라서 $\\overline{DA}=${da}\\,\\mathrm{cm}$이다.`,
        facts: { ab, bc, cd, da },
        figureSpec: null, // 두 대각선이 수직인 일반 사각형 — 11 과 같은 이유로 그림 없이 낸다.
      };
    },
  ),

  // ── 13 직각삼각형에서 세 반원 사이의 관계 ────────────────────────────
  def("13", "직각삼각형에서 세 반원 사이의 관계", SEC.활용, "응용", (rng) => {
    const [a, b, c] = pick(rng, TRIPLES);
    const num = a * a + b * b; // = c^2
    const [n, d] = [num, 8];
    const g = gcd(n, d);
    const rn = n / g;
    const rd = d / g;
    const areaTex = rd === 1 ? `${rn}\\pi` : `\\dfrac{${rn}}{${rd}}\\pi`;
    return {
      content: `직각삼각형 ABC에서 $\\angle C=90^\\circ$이고 세 변 AB, BC, CA를 각각 지름으로 하는 반원을 그렸다. $\\overline{BC}=${a}\\,\\mathrm{cm}$, $\\overline{CA}=${b}\\,\\mathrm{cm}$일 때, AB를 지름으로 하는 반원의 넓이를 구하시오.`,
      answer: `$${areaTex}\\,\\mathrm{cm}^2$`,
      solution: `피타고라스 정리에 의해 $\\overline{AB}^2=\\overline{BC}^2+\\overline{CA}^2=${a}^2+${b}^2=${num}$이다.\n지름이 $l$인 반원의 넓이는 $\\dfrac{1}{8}\\pi l^2$이므로, $\\overline{AB}$를 지름으로 하는 반원의 넓이는 $\\dfrac{1}{8}\\pi\\times${num}=${areaTex}\\,\\mathrm{cm}^2$이다.`,
      facts: { a, b, c, num },
      figureSpec: null, // 세 변 위 세 반원 — v2 의 실증 완료 목록에 없는 조합이라 그림 없이 낸다.
    };
  }),

  // ── 14 히포크라테스의 원의 넓이 ──────────────────────────────────────
  def("14", "히포크라테스의 원의 넓이", SEC.활용, "심화하", (rng) => {
    const [a, b, c] = pick(rng, TRIPLES);
    const area = (a * b) / 2;
    return {
      content: `직각삼각형 ABC에서 $\\angle C=90^\\circ$이고, 세 변을 각각 지름으로 하는 반원을 그렸다. $\\overline{BC}=${a}\\,\\mathrm{cm}$, $\\overline{CA}=${b}\\,\\mathrm{cm}$일 때, 색칠된 두 초승달 모양의 넓이의 합을 구하시오.`,
      answer: `$${area}\\,\\mathrm{cm}^2$`,
      solution: `히포크라테스의 원의 넓이 정리에 의해, 두 초승달 모양의 넓이의 합은 직각삼각형 $ABC$의 넓이와 같다.\n따라서 구하는 넓이는 $\\dfrac{1}{2}\\times${a}\\times${b}=${area}\\,\\mathrm{cm}^2$이다.`,
      facts: { a, b, c, area },
      figureSpec: null, // 13 과 같은 이유로 그림 없이 낸다.
    };
  }),

  // ── 15 입체도형에서의 최단 거리 (직육면체 표면) ─────────────────────
  def("15", "입체도형에서의 최단 거리", SEC.활용, "심화하", (rng) =>
    attempt(60, () => {
      const [leg, q, r] = pick(rng, TRIPLES);
      const split = intBetween(rng, 1, leg - 1);
      const p = leg - split; // AE
      const h = split; // EG(높이)
      return {
        content: `그림과 같은 직육면체에서 $\\overline{AB}=${p}\\,\\mathrm{cm}$, $\\overline{BC}=${q}\\,\\mathrm{cm}$, $\\overline{CG}=${h}\\,\\mathrm{cm}$이다. 옆면을 지나 꼭짓점 $A$에서 꼭짓점 $G$까지 실을 최단 거리로 감을 때, 그 실의 길이를 구하시오.`,
        answer: `$${r}\\,\\mathrm{cm}$`,
        solution: `옆면 $BCGF$와 밑면에 이어진 면을 펼치면 $A$에서 $G$까지의 최단 거리는 직각삼각형의 빗변이 된다.\n펼친 그림에서 한 직각변은 $\\overline{AB}+\\overline{CG}=${p}+${h}=${leg}\\,(\\mathrm{cm})$, 다른 직각변은 $\\overline{BC}=${q}\\,\\mathrm{cm}$이다.\n피타고라스 정리에 의해 최단 거리는 $\\sqrt{${leg}^2+${q}^2}=${r}\\,\\mathrm{cm}$이다.`,
        facts: { p, q, h, leg, r },
        figureSpec: { version: "elem-1", kind: "cuboid", w: p, d: q, h },
      };
    }),
  ),

  // ── 16 피타고라스 정리 종이접기 ──────────────────────────────────────
  def("16", "피타고라스 정리 종이접기", SEC.활용, "심화하", (rng) => {
    const [p, q, r] = pick(rng, TRIPLES);
    const w = r + p; // AB
    const h = q; // AD = BC
    const ae = r;
    return {
      content: `직사각형 모양의 종이 ABCD를 꼭짓점 C가 꼭짓점 A와 겹치도록 접었다. 접은 선과 변 AB가 만나는 점을 E라 하자. $\\overline{AB}=${w}\\,\\mathrm{cm}$, $\\overline{AD}=${h}\\,\\mathrm{cm}$일 때, $\\overline{AE}$의 길이를 구하시오.`,
      answer: `$${ae}\\,\\mathrm{cm}$`,
      solution: `접은 선에 의해 $\\overline{EA}=\\overline{EC}$이다. $\\overline{AE}=x\\,\\mathrm{cm}$라 하면 $\\overline{EB}=(${w}-x)\\,\\mathrm{cm}$이다.\n직각삼각형 $EBC$에서 $\\angle B=90^\\circ$이므로 $\\overline{EC}^2=\\overline{EB}^2+\\overline{BC}^2$, 즉 $x^2=(${w}-x)^2+${h}^2$이다.\n이를 풀면 $${2 * w}x=${w}^2+${h}^2$이므로 $x=${ae}$이다.\n따라서 $\\overline{AE}=${ae}\\,\\mathrm{cm}$이다.`,
      facts: { w, h, ae, eb: p },
      figureSpec: figFoldRect(w, h, ae),
    };
  }),
];

/**
 * 갈래 B 보강 — **RPM 색인 밖의 번호**다. `M2_PYTHA` 에 넣지 않는다
 * (`midSupB.ts` 머리말 참조 — 모듈 명부는 「색인 그대로」를 잠근다).
 *
 * 「피타고라스 정리의 활용」은 pool 갈래가 **응용2·심화5** 라 기본이 하나도 없다.
 * 「기본 4」를 인접 대체로 메우다 응용이 다 먹혀 시험지가 안 선다. 그래서 셋 다 기본이다.
 * 그림은 안 붙인다 — 세 문형 다 치수가 발문에 전부 있어 그림 없이 풀린다.
 */
export const M2_PYTHA_SUP_B: TypeEntry[] = [
  // ⚠️ 제목을 「직사각형의 대각선의 길이」로 두었더니 **색인 03 과 같아서** 이 갈래
  //    시험이 잡았다(같은 유형을 번호만 바꿔 두 번 세는 것). 문형을 바꿨다.
  def(
    "50",
    "직각으로 꺾어 간 길에서 두 지점 사이의 거리",
    SEC.활용,
    "기본",
    (rng) => {
      const [p, q, r] = pick(rng, TRIPLES);
      return {
        content: `민수가 $A$ 지점에서 동쪽으로 $${p}\\,\\mathrm{m}$ 걸어간 뒤 북쪽으로 $${q}\\,\\mathrm{m}$ 걸어가 $B$ 지점에 도착하였다. 두 지점 $A$, $B$ 사이의 거리를 구하시오.`,
        answer: `$${r}\\,\\mathrm{m}$`,
        solution: `동쪽과 북쪽은 서로 수직이므로 두 방향으로 간 거리를 두 변으로 하는 직각삼각형이 생긴다.\n피타고라스 정리에 의해 $\\overline{AB}^2=${p}^2+${q}^2=${p * p + q * q}$이므로 $\\overline{AB}=${r}\\,\\mathrm{m}$이다.`,
        facts: { p, q, x: r },
      };
    },
  ),

  def("51", "벽에 세운 사다리의 높이", SEC.활용, "기본", (rng) => {
    const [p, q, r] = pick(rng, TRIPLES);
    return {
      content: `길이가 $${r}\\,\\mathrm{m}$인 사다리를 벽에 기대어 세웠더니 사다리의 아랫부분이 벽에서 $${p}\\,\\mathrm{m}$ 떨어져 있었다. 사다리의 윗부분이 벽에 닿은 지점의 높이를 구하시오.`,
      answer: `$${q}\\,\\mathrm{m}$`,
      solution: `벽과 지면이 이루는 각이 직각이므로 사다리를 빗변으로 하는 직각삼각형이 생긴다.\n(높이)$^2=${r}^2-${p}^2=${r * r - p * p}$이므로 높이는 $${q}\\,\\mathrm{m}$이다.`,
      facts: { p, r, x: q },
    };
  }),

  def("52", "직각삼각형 모양의 땅의 넓이", SEC.활용, "기본", (rng) => {
    const [p, q, r] = pick(rng, TRIPLES);
    const area = (p * q) / 2;
    return {
      content: `직각을 낀 한 변의 길이가 $${p}\\,\\mathrm{m}$이고 빗변의 길이가 $${r}\\,\\mathrm{m}$인 직각삼각형 모양의 땅이 있다. 이 땅의 넓이를 구하시오.`,
      answer: `$${area}\\,\\mathrm{m}^2$`,
      solution: `직각을 낀 나머지 한 변을 구하면 (나머지 변)$^2=${r}^2-${p}^2=${r * r - p * p}$이므로 그 길이는 $${q}\\,\\mathrm{m}$이다.\n따라서 넓이는 $\\dfrac{1}{2}\\times${p}\\times${q}=${area}\\,(\\mathrm{m}^2)$이다.`,
      facts: { p, q, r, x: area },
    };
  }),
];
