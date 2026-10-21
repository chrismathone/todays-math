/**
 * 중1 RPM 1-2 「작도와 합동」14 + 「다각형」22(남은 번호, 07·08 은 `m1Book2.ts` 가
 * 이미 냈다) = 36유형. 물결 6B 세션 소유.
 *
 * ## 그림이 처음 실사용된다 (물결 6 공통 계약)
 *
 * 작도 02·03·04 는 실제 컴퍼스 자국(`arcs`)·각 표시를 그린다. 다각형 04는
 * 경계와 꼭짓점만, 05는 대각선도 그린다(오각형 예시는
 * `docs/planning/tracks/wave6-geometry-sheet/index.html` 참고 — v2 에
 * `midpoint` 점 종류가 없어 중점은 좌표로 직접 계산하고, 호 끝점은 반드시
 * `on_circle` 로 만든다). 나머지 유형은 「삼각형 ABC에서 …」 식 텍스트만으로
 * 구성이 명확해 그림을 붙이지 않았다(`m1Book2.ts` 07·08 과 같은 판단).
 *
 * ## 검산 방침
 *
 * 09·10·11·23(이등분선이 이루는 각) 은 교과서 공식(외각의 성질·삼각형의 내각의
 * 합)을 텍스트로 유도했지만, 구현 전에 좌표 기하로 별도 검산해 값을 맞췄다
 * (∠BPC=A/2, ∠BIC=90+A/2, 외각 이등분선 교점=90−A/2 — 세 식 모두 삼각형 좌표를
 * 세워 벡터 각도로 재확인함). 테스트는 그 공식을 **다시 삼각형 내각의 합으로**
 * 재유도한다(생성기가 쓴 것과 다른 식).
 */
import { intBetween, pick } from "../elementary/rng";

import { gonName } from "./m1Geo1";
import type { Rng } from "../elementary/types";

import { CHOICE_COUNT } from "../problem/choiceCountRule";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중1";
const BOOK = "1-2";
const MINOR_CONSTR = "작도와 합동";
const MINOR_POLY = "다각형";

/** 우리 Unit.section 정확한 이름 (`prisma/seed-data/units.ts` 정본, 2026-08-24). */
const SEC = {
  작도: "작도",
  합동: "합동",
  다각형: "다각형",
  삼각형내외각: "삼각형의 내각과 외각",
  다각형내외각: "다각형의 내각과 외각",
  이등변: "이등변삼각형의 성질",
} as const;

const DEG = Math.PI / 180;

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

type XY = [number, number];
type Fig = Record<string, unknown>;
type Body = Pick<
  MidProblem,
  "content" | "answer" | "solution" | "facts" | "figureSpec"
>;

/** 조건을 만족할 때까지 다시 뽑는다 — 못 찾으면 던진다(조용히 기본값 금지). */
function attempt<T>(tries: number, f: () => T | null): T {
  for (let i = 0; i < tries; i += 1) {
    const v = f();
    if (v !== null) return v;
  }
  throw new Error("유형 생성 재시도 초과 — 매개변수 범위를 확인하십시오");
}

function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const t = out[i]!;
    out[i] = out[j]!;
    out[j] = t;
  }
  return out;
}

function pickDistinct<T>(rng: Rng, pool: readonly T[], n: number): T[] {
  if (pool.length < n) throw new Error("pickDistinct 풀이 모자랍니다");
  return shuffle(rng, pool).slice(0, n);
}

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

const BOGI = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ"] as const;
const CIRCLED = ["①", "②", "③", "④", "⑤"] as const;

/** ㄱ~ㄹ 넷을 고정 은행에서 뽑아 "옳은 것을 모두 고른 것의 개수" 로 묻는다. */
function truthPick(
  rng: Rng,
  bank: readonly (readonly [string, boolean])[],
  k = 4,
): { lines: string; ans: number } {
  const picked = pickDistinct(
    rng,
    bank.map((_, i) => i),
    k,
  ).map((i) => bank[i]!);
  const lines = picked.map(([text], i) => `${BOGI[i]}. ${text}`).join("\n");
  const ans = picked.filter(([, t]) => t).length;
  return { lines, ans };
}

/* ────────────────────────────────────────────────────────────────────────
 * FigureSpec v2 도우미 — 작도 02·03·04, 다각형 04·05 만 쓴다
 * ──────────────────────────────────────────────────────────────────────── */

function onCircle(circle: string, deg: number): Fig {
  return { type: "on_circle", circle, angle: r2(deg) };
}

/**
 * 컴퍼스로 길이를 옮기는 한 단계 — `from` 에서 `rayDeg` 방향으로 `radiusPx`
 * 만큼 원을 그려(draw:false) 그 원과 직선의 교점을 `toName` 으로 잡고,
 * 그 교점 근방에 실제 호 자국(`arcs`)을 남긴다. 반환값은 `toName` 의 SVG 좌표
 * (다음 단계의 중심으로 체이닝할 때 쓴다).
 */
function compassStep(
  points: Record<string, unknown>,
  circles: Record<string, unknown>,
  arcs: Record<string, unknown>,
  fromName: string,
  fromXY: XY,
  toName: string,
  radiusPx: number,
  circleKey: string,
  rayDeg = 0,
  spread = 18,
): XY {
  circles[circleKey] = { center: fromName, radius: r2(radiusPx), draw: false };
  points[toName] = onCircle(circleKey, rayDeg);
  const a1 = `${circleKey}a`;
  const a2 = `${circleKey}b`;
  const arcKey = `${circleKey}Arc`;
  points[a1] = onCircle(circleKey, rayDeg - spread);
  points[a2] = onCircle(circleKey, rayDeg + spread);
  arcs[arcKey] = { circle: circleKey, from: a1, to: a2, dir: "ccw" };
  const rad = rayDeg * DEG;
  return [
    r2(fromXY[0] + radiusPx * Math.cos(rad)),
    r2(fromXY[1] - radiusPx * Math.sin(rad)),
  ];
}

/** 정n각형 꼭짓점 — 위쪽부터 시계 반대로, 이름은 A,B,C,… */
function regularPolygon(
  n: number,
  cx: number,
  cy: number,
  radius: number,
): { pts: Record<string, XY>; names: string[] } {
  const names = Array.from({ length: n }, (_, i) =>
    String.fromCharCode(65 + i),
  );
  const pts: Record<string, XY> = {};
  names.forEach((name, i) => {
    const a = 90 + i * (360 / n);
    pts[name] = [
      r2(cx + radius * Math.cos(a * DEG)),
      r2(cy - radius * Math.sin(a * DEG)),
    ];
  });
  return { pts, names };
}

/* ────────────────────────────────────────────────────────────────────────
 * 작도 01~07
 * ──────────────────────────────────────────────────────────────────────── */

const BANK_01: readonly (readonly [string, boolean])[] = [
  ["작도에서는 눈금 없는 자를 사용하여 두 점을 지나는 직선을 그린다.", true],
  ["작도에서는 컴퍼스를 사용하여 두 선분의 길이를 비교한다.", true],
  ["작도에서는 눈금 있는 자를 사용하여 선분의 길이를 잰다.", false],
  ["작도에서는 각도기를 사용하여 각의 크기를 잰다.", false],
  ["작도에서는 컴퍼스를 사용하여 원을 그린다.", true],
  [
    "작도에서는 컴퍼스를 사용하여 주어진 선분과 길이가 같은 선분을 다른 위치에 옮긴다.",
    true,
  ],
  ["작도에서는 눈금 없는 자를 사용하여 선분을 연장한다.", true],
  ["작도에서는 삼각자를 사용하여 평행선을 그린다.", false],
];

const BANK_07: readonly (readonly [string, boolean])[] = [
  [
    "세 변의 길이가 주어질 때 (단, 가장 긴 변의 길이가 나머지 두 변의 길이의 합보다 작다.)",
    true,
  ],
  ["두 변의 길이와 그 끼인각의 크기가 주어질 때", true],
  ["한 변의 길이와 그 양 끝 각의 크기가 주어질 때", true],
  ["세 각의 크기가 주어질 때", false],
  ["두 변의 길이와 그 끼인각이 아닌 다른 한 각의 크기가 주어질 때", false],
  ["한 변의 길이와 그 변에 이웃한 한 각의 크기가 주어질 때", false],
  [
    "세 변의 길이가 주어질 때 (단, 가장 긴 변의 길이가 나머지 두 변의 길이의 합과 같다.)",
    false,
  ],
  ["두 각의 크기와 그 끼인변이 아닌 다른 한 변의 길이가 주어질 때", true],
];

function figConstruction02(p: number, q: number): Fig {
  const points: Record<string, unknown> = { P: [30, 150] };
  const circles: Record<string, unknown> = {};
  const arcs: Record<string, unknown> = {};
  const K = 13;
  const Q = compassStep(
    points,
    circles,
    arcs,
    "P",
    [30, 150],
    "Q",
    p * K,
    "c1",
  );
  compassStep(points, circles, arcs, "Q", Q, "R", q * K, "c2");
  return {
    version: 2,
    points,
    circles,
    segments: { PR: ["P", "R"] },
    arcs,
    labels: { P: "P", Q: "Q", R: "R" },
  };
}

function figAngleCopy03(baseDeg: number, extraDeg?: number): Fig {
  const P: XY = [140, 150];
  const L: XY = [30, 150];
  const Rgt: XY = [250, 150];
  const rad = 90;
  const A: XY = [
    r2(P[0] + rad * Math.cos(baseDeg * DEG)),
    r2(P[1] - rad * Math.sin(baseDeg * DEG)),
  ];
  const points: Record<string, unknown> = { P, L, R: Rgt, A };
  const angles: Record<string, unknown> = {
    given: { vertex: "P", points: ["R", "A"], label: `${baseDeg}°` },
  };
  const segments: Record<string, unknown> = {
    base: ["L", "R"],
    PA: ["P", "A"],
  };
  if (extraDeg !== undefined) {
    const totalDeg = baseDeg + extraDeg;
    const B: XY = [
      r2(P[0] + rad * Math.cos(totalDeg * DEG)),
      r2(P[1] - rad * Math.sin(totalDeg * DEG)),
    ];
    points.B = B;
    segments.PB = ["P", "B"];
    angles.given2 = { vertex: "P", points: ["A", "B"], label: `${extraDeg}°` };
    angles.asked = { vertex: "P", points: ["B", "L"], label: "x" };
  } else {
    angles.asked = { vertex: "P", points: ["A", "L"], label: "x" };
  }
  return { version: 2, points, segments, angles, labels: { P: "P" } };
}

// ⚠️ 여기 있던 `inter`(두 직선의 교점)를 지웠다 — **반올림을 품고 있어서** 이 파일의
//    유일한 소비자였던 `figParallel04` 를 죽였다. 교점이 필요하면 반올림 없이 세울 것.

function figParallel04(theta: number): Fig {
  const A: XY = [20, 60];
  const B: XY = [220, 60];
  const C: XY = [20, 140];
  const D: XY = [220, 140];
  // 🔴 **가로지르는 직선의 기울기를 $\theta$ 에서 유도한다.**
  //
  // 종전에는 $P=[50,20]$·$Q=[200,180]$ **고정**이라 $\theta$ 가 $40^\circ$든
  // $85^\circ$든 지면의 각은 늘 $46.8^\circ$ 였다. 라벨만 바뀌었다.
  //
  // 이 좌표는 **SVG 계**(y 아래)라 $\angle a$ 는 $\overrightarrow{XB}=(1,0)$ 와
  // $\overrightarrow{XQ}$ 의 사잇각이다. 그러므로 방향을 $(\cos\theta,\ \sin\theta)$
  // 로 두면 그 각이 정확히 $\theta$ 가 된다($Q$ 가 아래쪽이라 부호도 맞다).
  //
  // $P$·$Q$ 는 $y=20$·$y=180$ 에 닿게 잡고, $X$ 의 가로 자리는 둘이 지면 가운데에
  // 오도록 고른다 — 안 그러면 $\theta$ 가 클 때 한쪽으로 쏠린다.
  const rad = (theta * Math.PI) / 180;
  const cot = Math.cos(rad) / Math.sin(rad);
  const dyP = 20 - 60;
  const dyQ = 180 - 60;
  // ⚠️ **여기서는 반올림하지 않는다.** 이 그림은 `fitPts` 를 안 거치므로 좌표가 그대로
  //    나가는데, $P$·$Q$ 를 반올림해 놓으면 $X$·$Y$ 가 그 선분 위를 벗어나 엔진이
  //    「각의 광선이 그려진 선분에 안 얹혔다」로 **던진다**(실측 `seed 20260824`).
  //    09 §4-1 이 적어 둔 「손 계산 좌표는 선 위를 벗어난다」와 같은 자리다.
  const anchorX = 120 - ((dyP + dyQ) / 2) * cot;
  const P: XY = [anchorX + dyP * cot, 20];
  const Q: XY = [anchorX + dyQ * cot, 180];
  const X: XY = [anchorX, 60];
  const Y: XY = [anchorX + (140 - 60) * cot, 140];
  return {
    version: 2,
    points: { A, B, C, D, P, Q, X, Y },
    segments: {
      l: { points: ["A", "B"], parallel: 1 },
      m: { points: ["C", "D"], parallel: 1 },
      t: ["P", "Q"],
    },
    angles: {
      given: { vertex: "X", points: ["B", "Q"], label: `${theta}°` },
      asked: { vertex: "Y", points: ["D", "P"], label: "x" },
    },
    labels: { A: "l", C: "m", P: "t" },
  };
}

const M1_CONSTR: TypeEntry[] = [
  def(MINOR_CONSTR, "01", "작도", SEC.작도, "기본", (rng): Body => {
    const { lines, ans } = truthPick(rng, BANK_01);
    return {
      content: `작도에 대한 다음 설명 중 옳은 것을 모두 고를 때, 그 개수를 구하시오.\n${lines}`,
      answer: `$${ans}$개`,
      solution: `옳은 설명의 개수는 $${ans}$개이다.`,
      facts: { ans },
    };
  }),

  def(
    MINOR_CONSTR,
    "02",
    "길이가 같은 선분의 작도",
    SEC.작도,
    "기본",
    (rng): Body =>
      attempt(200, () => {
        const mode = intBetween(rng, 0, 1);
        const p = intBetween(rng, 3, 8);
        const q = attempt(40, () => {
          const v = intBetween(rng, 3, 8);
          return v === p ? null : v;
        });
        const sum = p + q;
        const fig = figConstruction02(p, q);
        if (mode === 0) {
          return {
            content: `그림과 같이 점 $P$를 지나는 직선 위에 컴퍼스를 이용하여 $\\overline{PQ}=${p}\\,\\mathrm{cm}$, $\\overline{QR}=${q}\\,\\mathrm{cm}$가 되도록 두 선분의 길이를 옮겨 작도하였다. $\\overline{PR}$의 길이를 구하시오.`,
            answer: `$${sum}\\,\\mathrm{cm}$`,
            solution: `$\\overline{PR}=\\overline{PQ}+\\overline{QR}=${p}+${q}=${sum}\\,(\\mathrm{cm})$이다.`,
            facts: { mode, p, q, ans: sum },
            figureSpec: fig,
          };
        }
        return {
          content: `그림과 같이 점 $P$를 지나는 직선 위에 컴퍼스를 이용하여 두 선분의 길이를 옮겨 $\\overline{PQ}=${p}\\,\\mathrm{cm}$가 되도록 하였더니 $\\overline{PR}=${sum}\\,\\mathrm{cm}$가 되었다. $\\overline{QR}$의 길이를 구하시오.`,
          answer: `$${q}\\,\\mathrm{cm}$`,
          solution: `$\\overline{QR}=\\overline{PR}-\\overline{PQ}=${sum}-${p}=${q}\\,(\\mathrm{cm})$이다.`,
          facts: { mode, p, q, ans: q },
          figureSpec: fig,
        };
      }),
  ),

  def(
    MINOR_CONSTR,
    "03",
    "크기가 같은 각의 작도",
    SEC.작도,
    "기본",
    (rng): Body =>
      attempt(200, (): Body | null => {
        const mode = intBetween(rng, 0, 1);
        if (mode === 0) {
          const theta = intBetween(rng, 8, 34) * 5;
          const x = 180 - theta;
          return {
            content: `그림과 같이 직선 위의 점 $P$를 꼭짓점으로 하여 $\\angle RPA=${theta}^\\circ$가 되도록 각을 작도하였다. $\\angle x$의 크기를 구하시오.`,
            answer: `$${x}^\\circ$`,
            solution: `점 $P$가 직선 위에 있으므로 $\\angle RPA+\\angle x=180^\\circ$이다.\n$\\angle x=180^\\circ-${theta}^\\circ=${x}^\\circ$이다.`,
            facts: { mode, theta, x },
            figureSpec: figAngleCopy03(theta),
          };
        }
        const t1 = intBetween(rng, 4, 16) * 5;
        const t2 = intBetween(rng, 4, 16) * 5;
        const sum = t1 + t2;
        if (sum >= 175) return null;
        const x = 180 - sum;
        return {
          content: `그림과 같이 직선 위의 점 $P$를 꼭짓점으로 하여 컴퍼스로 크기가 같은 각을 두 번 옮겨 $\\angle RPA=${t1}^\\circ$, $\\angle APB=${t2}^\\circ$가 되도록 작도하였다. $\\angle x$의 크기를 구하시오.`,
          answer: `$${x}^\\circ$`,
          solution: `점 $P$가 직선 위에 있으므로 $\\angle RPA+\\angle APB+\\angle x=180^\\circ$이다.\n$\\angle x=180^\\circ-${t1}^\\circ-${t2}^\\circ=${x}^\\circ$이다.`,
          facts: { mode, t1, t2, x },
          figureSpec: figAngleCopy03(t1, t2),
        };
      }),
  ),

  def(MINOR_CONSTR, "04", "평행선의 작도", SEC.작도, "응용", (rng): Body => {
    const theta = intBetween(rng, 8, 17) * 5;
    const x = 180 - theta;
    return {
      content: `그림과 같이 서로 다른 두 직선 $l$, $m$이 한 직선 $t$와 만난다. 컴퍼스를 이용하여 동위각의 크기가 같도록 작도하여 $l\\parallel m$이 되었다. $\\angle a=${theta}^\\circ$일 때, $\\angle x$의 크기를 구하시오.`,
      answer: `$${x}^\\circ$`,
      solution: `$l\\parallel m$이면 동위각의 크기는 같으므로 작도된 각은 $${theta}^\\circ$이다.\n$\\angle x$는 그 각과 이웃한 직선 $t$ 위의 각이므로 $\\angle x=180^\\circ-${theta}^\\circ=${x}^\\circ$이다.`,
      facts: { theta, x },
      figureSpec: figParallel04(theta),
    };
  }),

  def(
    MINOR_CONSTR,
    "05",
    "삼각형의 세 변의 길이 사이의 관계",
    SEC.작도,
    "응용",
    (rng): Body =>
      attempt(200, () => {
        const b = intBetween(rng, 3, 9);
        const a = attempt(40, () => {
          const v = intBetween(rng, b + 1, b + 10);
          return v === b ? null : v;
        });
        const ans = 2 * b - 1;
        return {
          content: `삼각형의 세 변의 길이가 각각 $${a}\\,\\mathrm{cm}$, $${b}\\,\\mathrm{cm}$, $x\\,\\mathrm{cm}$이다. $x$가 될 수 있는 자연수의 개수를 구하시오.`,
          answer: `$${ans}$개`,
          solution: `삼각형의 세 변의 길이 사이의 관계에 의해 $${a}-${b}<x<${a}+${b}$, 즉 $${a - b}<x<${a + b}$이다.\n이를 만족하는 자연수 $x$의 개수는 $${ans}$개이다.`,
          facts: { a, b, ans },
        };
      }),
  ),

  def(MINOR_CONSTR, "06", "삼각형의 작도", SEC.작도, "응용", (rng): Body => {
    const facts: Record<string, number> = {};
    const lines: string[] = [];
    let ans = 0;
    for (let i = 0; i < 4; i += 1) {
      const s1 = intBetween(rng, 3, 9);
      const s2 = intBetween(rng, 3, 9);
      const valid = pick(rng, [true, false] as const);
      const s3 = valid
        ? attempt(40, () => {
            const lo = Math.abs(s1 - s2) + 1;
            const hi = s1 + s2 - 1;
            if (lo > hi) return null;
            return intBetween(rng, lo, hi);
          })
        : s1 + s2;
      facts[`s${i}a`] = s1;
      facts[`s${i}b`] = s2;
      facts[`s${i}c`] = s3;
      if (valid) ans += 1;
      lines.push(
        `${BOGI[i]}. $${s1}\\,\\mathrm{cm}$, $${s2}\\,\\mathrm{cm}$, $${s3}\\,\\mathrm{cm}$`,
      );
    }
    facts.ans = ans;
    return {
      content: `다음 중 삼각형을 작도할 수 있는 세 변의 길이인 것을 모두 고를 때, 그 개수를 구하시오.\n${lines.join("\n")}`,
      answer: `$${ans}$개`,
      solution: `가장 긴 변의 길이가 나머지 두 변의 길이의 합보다 작아야 삼각형이 작도된다.\n작도할 수 있는 것의 개수는 $${ans}$개이다.`,
      facts,
    };
  }),

  def(
    MINOR_CONSTR,
    "07",
    "삼각형이 하나로 정해질 조건",
    SEC.작도,
    "응용",
    (rng): Body => {
      const { lines, ans } = truthPick(rng, BANK_07);
      return {
        content: `다음 중 삼각형 $ABC$가 하나로 정해지는 것을 모두 고를 때, 그 개수를 구하시오.\n${lines}`,
        answer: `$${ans}$개`,
        solution: `삼각형이 하나로 정해지는 조건의 개수는 $${ans}$개이다.`,
        facts: { ans },
      };
    },
  ),
];

/* ────────────────────────────────────────────────────────────────────────
 * 합동 08~14
 * ──────────────────────────────────────────────────────────────────────── */

/** 3개 원소의 순열 6가지 — 대응 순서를 읽는 능력을 시험한다. */
const PERM3: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

const M1_JOINT: TypeEntry[] = [
  def(MINOR_CONSTR, "08", "합동인 도형의 성질", SEC.합동, "기본", (rng): Body =>
    attempt(200, () => {
      const p = intBetween(rng, 60, 130);
      const q = intBetween(rng, 60, 130);
      const r = intBetween(rng, 60, 130);
      const ans = 360 - p - q - r;
      if (ans < 10 || ans > 170) return null;
      return {
        content: `사각형 $ABCD$와 사각형 $EFGH$가 합동이다. $\\angle A=${p}^\\circ$, $\\angle B=${q}^\\circ$, $\\angle C=${r}^\\circ$일 때, $\\angle H$의 크기를 구하시오.`,
        answer: `$${ans}^\\circ$`,
        solution: `사각형의 네 내각의 크기의 합은 $360^\\circ$이므로 $\\angle D=360^\\circ-${p}^\\circ-${q}^\\circ-${r}^\\circ=${ans}^\\circ$이다.\n두 사각형이 합동이므로 대응각의 크기는 같다. $\\angle H=\\angle D=${ans}^\\circ$이다.`,
        facts: { p, q, r, ans },
      };
    }),
  ),

  def(
    MINOR_CONSTR,
    "09",
    "합동인 삼각형 찾기",
    SEC.합동,
    "응용",
    (rng): Body => {
      const facts: Record<string, number> = {};
      const lines: string[] = [];
      let ans = 0;
      for (let i = 0; i < 3; i += 1) {
        const s1 = intBetween(rng, 3, 9);
        const s2 = intBetween(rng, 3, 9);
        const s3 = attempt(40, () => {
          const lo = Math.abs(s1 - s2) + 1;
          const hi = s1 + s2 - 1;
          if (lo > hi) return null;
          return intBetween(rng, lo, hi);
        });
        const congruent = pick(rng, [true, false] as const);
        const order = shuffle(rng, [s1, s2, s3]) as [number, number, number];
        let other: [number, number, number];
        if (congruent) {
          other = shuffle(rng, [s1, s2, s3]) as [number, number, number];
        } else {
          const delta = intBetween(rng, 1, 3);
          other = [s1 + delta, s2, s3];
        }
        facts[`p${i}a1`] = order[0];
        facts[`p${i}a2`] = order[1];
        facts[`p${i}a3`] = order[2];
        facts[`p${i}b1`] = other[0];
        facts[`p${i}b2`] = other[1];
        facts[`p${i}b3`] = other[2];
        const sortedA = [...order].sort((a, b) => a - b).join(",");
        const sortedB = [...other].sort((a, b) => a - b).join(",");
        const actuallyCongruent = sortedA === sortedB;
        if (actuallyCongruent) ans += 1;
        lines.push(
          `${BOGI[i]}. 세 변의 길이가 $${order[0]}\\,\\mathrm{cm}$, $${order[1]}\\,\\mathrm{cm}$, $${order[2]}\\,\\mathrm{cm}$인 삼각형과 $${other[0]}\\,\\mathrm{cm}$, $${other[1]}\\,\\mathrm{cm}$, $${other[2]}\\,\\mathrm{cm}$인 삼각형`,
        );
      }
      facts.ans = ans;
      return {
        content: `다음 중 두 삼각형이 서로 합동인 것을 모두 고를 때, 그 개수를 구하시오.\n${lines.join("\n")}`,
        answer: `$${ans}$개`,
        solution: `세 변의 길이가 각각 같은 두 삼각형은 $\\mathrm{SSS}$ 합동이다.\n서로 합동인 쌍의 개수는 $${ans}$개이다.`,
        facts,
      };
    },
  ),

  def(
    MINOR_CONSTR,
    "10",
    "두 삼각형이 합동이 되기 위한 조건",
    SEC.합동,
    "응용",
    (rng): Body => {
      const config = intBetween(rng, 0, 2);
      // config 0: AB=DE, BC=EF 가 이미 같다 → 끼인각은 ∠B(=∠E).
      // config 1: AB=DE, CA=FD 가 이미 같다 → 끼인각은 ∠A(=∠D).
      // config 2: BC=EF, CA=FD 가 이미 같다 → 끼인각은 ∠C(=∠F).
      const CORR: Record<string, string> = { A: "D", B: "E", C: "F" };
      const CONFIGS: readonly {
        known: string;
        angle: string;
        thirdOwn: string;
        thirdOther: string;
        /**
         * 🔴 **확실히 모자란** 변 조건 — 대응이 어긋난 짝이다.
         * 이미 같다고 준 변과 짝지어져 「그 삼각형이 이등변이다」만 뜻하므로
         * 합동을 못 준다. (남은 변끼리 같다고 하면 SSS 가 되어 **정답이 된다.**)
         */
        wrongSide: string;
      }[] = [
        {
          known:
            "$\\overline{AB}=\\overline{DE}$, $\\overline{BC}=\\overline{EF}$",
          angle: "B",
          thirdOwn: "CA",
          thirdOther: "FD",
          // $\overline{EF}=\overline{BC}$ 는 이미 같다 → 「$\overline{CA}=\overline{BC}$」일 뿐.
          wrongSide: "$\\overline{CA}=\\overline{EF}$",
        },
        {
          known:
            "$\\overline{AB}=\\overline{DE}$, $\\overline{CA}=\\overline{FD}$",
          angle: "A",
          thirdOwn: "BC",
          thirdOther: "EF",
          // $\overline{FD}=\overline{CA}$ 는 이미 같다 → 「$\overline{BC}=\overline{CA}$」일 뿐.
          wrongSide: "$\\overline{BC}=\\overline{FD}$",
        },
        {
          known:
            "$\\overline{BC}=\\overline{EF}$, $\\overline{CA}=\\overline{FD}$",
          angle: "C",
          thirdOwn: "AB",
          thirdOther: "DE",
          // $\overline{FD}=\overline{CA}$ 는 이미 같다 → 「$\overline{AB}=\overline{CA}$」일 뿐.
          wrongSide: "$\\overline{AB}=\\overline{FD}$",
        },
      ];
      const cfg = CONFIGS[config]!;
      const OTHERS = ["A", "B", "C"].filter((a) => a !== cfg.angle);
      const correctText = `$\\angle ${cfg.angle}=\\angle ${CORR[cfg.angle]}$`;
      // 🔴 보기는 **정확히 다섯** (원장님 2026-08-25) — `CHOICE_COUNT` 한 곳에서 온다.
      //
      // 🔴 그리고 예전 넷째 보기 `$\overline{thirdOwn}=\overline{thirdOther}$` 는
      //    **빼야 한다.** 두 쌍의 변이 이미 같은데 남은 한 쌍까지 같으면 그건 SSS 라
      //    **실제로 합동이 된다** — 정답이 둘인 문항이었다(2026-08-25 발견).
      //    대신 «확실히 모자란» 조건 둘로 갈음한다.
      const options = shuffle(rng, [
        correctText,
        `$\\angle ${OTHERS[0]}=\\angle ${CORR[OTHERS[0]!]}$`,
        `$\\angle ${OTHERS[1]}=\\angle ${CORR[OTHERS[1]!]}$`,
        // 대응이 어긋난 끼인각 — 크기가 같아도 «서로 대응하는 끼인각»이 아니다.
        `$\\angle ${cfg.angle}=\\angle ${CORR[OTHERS[0]!]}$`,
        // 대응이 어긋난 변 — 이미 같다고 준 변과 짝지어져 «그 삼각형이 이등변이다»만
        // 뜻한다. 합동을 못 준다.
        cfg.wrongSide,
      ]);
      if (options.length !== CHOICE_COUNT) {
        throw new Error(
          `보기가 ${options.length}개다 — ${CHOICE_COUNT}개여야 한다`,
        );
      }
      const correctPos = options.indexOf(correctText);
      const lines = options.map((o, i) => `${CIRCLED[i]} ${o}`).join("\n");
      return {
        content: `삼각형 $ABC$와 삼각형 $DEF$에서 ${cfg.known}일 때, 다음 중 두 삼각형이 합동이 되기 위해 추가로 필요한 조건으로 알맞은 것은?\n${lines}`,
        answer: CIRCLED[correctPos]!,
        solution: `두 쌍의 변의 길이가 각각 같으므로 그 끼인각인 $\\angle ${cfg.angle}$와 $\\angle ${CORR[cfg.angle]}$의 크기가 같으면 $\\mathrm{SAS}$ 합동이다.\n답은 ${CIRCLED[correctPos]}이다.`,
        facts: { config, correctPos },
      };
    },
  ),

  def(
    MINOR_CONSTR,
    "11",
    "삼각형의 합동 조건합동",
    SEC.합동,
    "기본",
    (rng): Body => {
      const a = intBetween(rng, 4, 12);
      const b = intBetween(rng, 4, 12);
      const c = attempt(40, () => {
        const lo = Math.abs(a - b) + 1;
        const hi = a + b - 1;
        if (lo > hi) return null;
        return intBetween(rng, lo, hi);
      });
      const perm = pick(rng, PERM3);
      const rhs = perm.map((i) => ["D", "E", "F"][i]);
      const ask = intBetween(rng, 0, 2);
      const sides = [a, b, c];
      const askSide = [
        [rhs[0], rhs[1]],
        [rhs[1], rhs[2]],
        [rhs[2], rhs[0]],
      ][ask]!;
      return {
        content: `삼각형 $ABC$와 삼각형 $\\mathrm{${rhs.join("")}}$에서 $\\overline{AB}=${a}\\,\\mathrm{cm}$, $\\overline{BC}=${b}\\,\\mathrm{cm}$, $\\overline{CA}=${c}\\,\\mathrm{cm}$이고, 두 삼각형이 $\\mathrm{SSS}$ 합동일 때 $\\overline{${askSide[0]}${askSide[1]}}$의 길이를 구하시오.`,
        answer: `$${sides[ask]}\\,\\mathrm{cm}$`,
        // 변 이름의 끝은 $D$·$E$·$F$(디·이·에프) — 받침이 없어 「는」.
        solution: `대응하는 변의 길이는 같으므로 $\\overline{${askSide[0]}${askSide[1]}}$는 $\\overline{${["AB", "BC", "CA"][ask]}}$에 대응하여 $${sides[ask]}\\,\\mathrm{cm}$이다.`,
        facts: { a, b, c, perm: PERM3.indexOf(perm), ask },
      };
    },
  ),

  def(
    MINOR_CONSTR,
    "12",
    "삼각형의 합동 조건 합동",
    SEC.합동,
    "기본",
    (rng): Body => {
      const a = intBetween(rng, 4, 14);
      const b = intBetween(rng, 4, 14);
      const theta = intBetween(rng, 5, 33) * 5;
      const perm = pick(rng, PERM3);
      const rhs = perm.map((i) => ["D", "E", "F"][i]);
      const vertex = "B"; // ∠B 가 끼인각(AB,BC)
      const rhsVertex = rhs[1]!;
      return {
        content: `삼각형 $ABC$와 삼각형 $\\mathrm{${rhs.join("")}}$에서 $\\overline{AB}=${a}\\,\\mathrm{cm}$, $\\overline{BC}=${b}\\,\\mathrm{cm}$, $\\angle B=${theta}^\\circ$이고, 두 삼각형이 $\\mathrm{SAS}$ 합동일 때 $\\angle ${rhsVertex}$의 크기를 구하시오.`,
        answer: `$${theta}^\\circ$`,
        solution: `대응하는 각의 크기는 같으므로 $\\angle ${rhsVertex}$는 $\\angle ${vertex}$에 대응하여 $${theta}^\\circ$이다.`,
        facts: { a, b, theta, perm: PERM3.indexOf(perm) },
      };
    },
  ),

  def(
    MINOR_CONSTR,
    "13",
    "삼각형의 합동 조건 합동",
    SEC.합동,
    "응용",
    (rng): Body =>
      attempt(200, () => {
        const a = intBetween(rng, 30, 80);
        const b = intBetween(rng, 30, 80);
        const c = 180 - a - b;
        if (c < 15 || c > 130) return null;
        const perm = pick(rng, PERM3);
        const rhs = perm.map((i) => ["D", "E", "F"][i]);
        const rhsVertexC = rhs[2]!; // ∠C 에 대응
        return {
          content: `삼각형 $ABC$와 삼각형 $\\mathrm{${rhs.join("")}}$에서 $\\angle A=${a}^\\circ$, $\\angle B=${b}^\\circ$이고 $\\overline{AB}=\\overline{${rhs[0]}${rhs[1]}}$이다. 두 삼각형이 $\\mathrm{ASA}$ 합동일 때 $\\angle ${rhsVertexC}$의 크기를 구하시오.`,
          answer: `$${c}^\\circ$`,
          solution: `삼각형의 세 내각의 크기의 합은 $180^\\circ$이므로 $\\angle C=180^\\circ-${a}^\\circ-${b}^\\circ=${c}^\\circ$이다.\n대응하는 각의 크기는 같으므로 $\\angle ${rhsVertexC}=\\angle C=${c}^\\circ$이다.`,
          facts: { a, b, c, perm: PERM3.indexOf(perm) },
        };
      }),
  ),

  def(
    MINOR_CONSTR,
    "14",
    "삼각형의 합동의 활용",
    SEC.합동,
    "응용",
    (rng): Body => {
      const x = intBetween(rng, 12, 90);
      const mode = intBetween(rng, 0, 1);
      const scene = pick(rng, [
        "호수를 사이에 둔 두 지점 $A$, $B$",
        "산을 사이에 둔 두 지점 $A$, $B$",
        "건물을 사이에 둔 두 지점 $A$, $B$",
      ] as const);
      if (mode === 0) {
        return {
          content: `${scene} 사이의 거리를 구하기 위해 한 지점 $C$를 정하고, $\\overline{AC}$의 연장선 위에 $\\overline{CD}=\\overline{CA}$, $\\overline{BC}$의 연장선 위에 $\\overline{CE}=\\overline{CB}$가 되도록 점 $D$, $E$를 잡았다. $\\overline{DE}=${x}\\,\\mathrm{m}$일 때, $\\overline{AB}$의 길이를 구하시오.`,
          answer: `$${x}\\,\\mathrm{m}$`,
          solution: `$\\overline{CA}=\\overline{CD}$, $\\overline{CB}=\\overline{CE}$이고 $\\angle ACB=\\angle DCE$(맞꼭지각)이므로 삼각형 $ABC$와 삼각형 $DEC$는 $\\mathrm{SAS}$ 합동이다.\n대응하는 변의 길이는 같으므로 $\\overline{AB}=\\overline{DE}=${x}\\,\\mathrm{m}$이다.`,
          facts: { mode, x },
        };
      }
      return {
        content: `${scene} 사이의 거리를 구하기 위해 한 지점 $C$를 정하고, $\\overline{AC}$의 연장선 위에 $\\overline{CD}=\\overline{CA}$, $\\overline{BC}$의 연장선 위에 $\\overline{CE}=\\overline{CB}$가 되도록 점 $D$, $E$를 잡았다. $\\overline{AB}=${x}\\,\\mathrm{m}$일 때, $\\overline{DE}$의 길이를 구하시오.`,
        answer: `$${x}\\,\\mathrm{m}$`,
        solution: `$\\overline{CA}=\\overline{CD}$, $\\overline{CB}=\\overline{CE}$이고 $\\angle ACB=\\angle DCE$(맞꼭지각)이므로 삼각형 $ABC$와 삼각형 $DEC$는 $\\mathrm{SAS}$ 합동이다.\n대응하는 변의 길이는 같으므로 $\\overline{DE}=\\overline{AB}=${x}\\,\\mathrm{m}$이다.`,
        facts: { mode, x },
      };
    },
  ),
];

/* ────────────────────────────────────────────────────────────────────────
 * 다각형 01~06 (07·08 은 m1Book2.ts)
 * ──────────────────────────────────────────────────────────────────────── */

const BANK_POLY01: readonly (readonly [string, boolean])[] = [
  ["정육각형", true],
  ["원", false],
  ["부채꼴", false],
  ["직사각형", true],
  ["마름모", true],
  ["원기둥", false],
  ["오각형", true],
  ["구", false],
];

const BANK_POLY03: readonly (readonly [string, boolean])[] = [
  ["정삼각형", true],
  ["정사각형", true],
  ["직사각형", false],
  ["마름모", false],
  ["정오각형", true],
  ["이등변삼각형", false],
  ["정육각형", true],
  ["평행사변형", false],
];

function figPolygonOutline(n: number): Fig {
  const { pts, names } = regularPolygon(n, 120, 105, 78);
  const segments: Record<string, unknown> = {};
  for (let i = 0; i < n; i += 1) {
    segments[`s${i}`] = [names[i], names[(i + 1) % n]];
  }
  // Do not pre-draw the connections whose number the student must find.
  return {
    version: 2,
    points: pts,
    segments,
    labels: Object.fromEntries(names.map((nm) => [nm, nm])),
  };
}

function figPolygonAllDiagonals(n: number): Fig {
  const { pts, names } = regularPolygon(n, 120, 105, 78);
  const segments: Record<string, unknown> = {};
  for (let i = 0; i < n; i += 1) {
    segments[`s${i}`] = [names[i], names[(i + 1) % n]];
  }
  let d = 0;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 2; j < n; j += 1) {
      if (i === 0 && j === n - 1) continue; // 변과 겹침
      segments[`d${d}`] = [names[i], names[j]];
      d += 1;
    }
  }
  return {
    version: 2,
    points: pts,
    segments,
    labels: Object.fromEntries(names.map((nm) => [nm, nm])),
  };
}

const M1_POLY_BASIC: TypeEntry[] = [
  def(MINOR_POLY, "01", "다각형", SEC.다각형, "기본", (rng): Body => {
    const { lines, ans } = truthPick(rng, BANK_POLY01);
    return {
      content: `다음 중 다각형인 것을 모두 고를 때, 그 개수를 구하시오.\n${lines}`,
      answer: `$${ans}$개`,
      solution: `여러 개의 선분으로만 둘러싸인 평면도형이 다각형이다.\n다각형인 것의 개수는 $${ans}$개이다.`,
      facts: { ans },
    };
  }),

  def(
    MINOR_POLY,
    "02",
    "다각형의 내각과 외각",
    SEC.다각형내외각,
    "기본",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      const known = intBetween(rng, 20, 160);
      const other = 180 - known;
      if (mode === 0) {
        return {
          content: `다각형의 한 꼭짓점에서 내각의 크기가 $${known}^\\circ$일 때, 그 꼭짓점에서의 외각의 크기를 구하시오.`,
          answer: `$${other}^\\circ$`,
          solution: `한 꼭짓점에서 내각과 외각의 크기의 합은 $180^\\circ$이므로 외각의 크기는 $180^\\circ-${known}^\\circ=${other}^\\circ$이다.`,
          facts: { mode, known, ans: other },
        };
      }
      return {
        content: `다각형의 한 꼭짓점에서 외각의 크기가 $${known}^\\circ$일 때, 그 꼭짓점에서의 내각의 크기를 구하시오.`,
        answer: `$${other}^\\circ$`,
        solution: `한 꼭짓점에서 내각과 외각의 크기의 합은 $180^\\circ$이므로 내각의 크기는 $180^\\circ-${known}^\\circ=${other}^\\circ$이다.`,
        facts: { mode, known, ans: other },
      };
    },
  ),

  def(MINOR_POLY, "03", "정다각형", SEC.다각형, "기본", (rng): Body => {
    const { lines, ans } = truthPick(rng, BANK_POLY03);
    return {
      content: `다음 중 정다각형인 것을 모두 고를 때, 그 개수를 구하시오.\n${lines}`,
      answer: `$${ans}$개`,
      solution: `변의 길이가 모두 같고 내각의 크기가 모두 같은 다각형이 정다각형이다.\n정다각형인 것의 개수는 $${ans}$개이다.`,
      facts: { ans },
    };
  }),

  def(
    MINOR_POLY,
    "04",
    "한 꼭짓점에서 그을 수 있는 대각선의 개수",
    SEC.다각형,
    "기본",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      const n = intBetween(rng, 5, 12);
      const v = n - 3;
      const fig = figPolygonOutline(n);
      if (mode === 0) {
        return {
          content: `그림과 같은 $${n}$각형의 한 꼭짓점에서 그을 수 있는 대각선의 개수를 구하시오.`,
          answer: `$${v}$개`,
          solution: `$n$각형의 한 꼭짓점에서 그을 수 있는 대각선의 개수는 $(n-3)$개이므로 $${n}-3=${v}$(개)이다.`,
          facts: { mode, n, v },
          figureSpec: fig,
        };
      }
      return {
        content: `어떤 다각형의 한 꼭짓점에서 그을 수 있는 대각선의 개수가 $${v}$개일 때, 이 다각형의 변의 개수를 구하시오.`,
        answer: `$${n}$`,
        solution: `한 꼭짓점에서 그을 수 있는 대각선의 개수는 $(n-3)$개이므로 $n-3=${v}$, $n=${n}$이다.`,
        facts: { mode, n, v },
        // 이 갈래는 변의 개수 n 을 묻는다 — 그림에 n각형을 그려 주면 꼭짓점을
        // 세어 답을 그대로 읽을 수 있으므로 붙이지 않는다(09 §2.2 규칙①).
        figureSpec: null,
      };
    },
  ),

  def(
    MINOR_POLY,
    "05",
    "다각형의 대각선의 개수",
    SEC.다각형,
    "응용",
    (rng): Body => {
      const n = intBetween(rng, 5, 12);
      const d = (n * (n - 3)) / 2;
      return {
        content: `$${n}$각형의 대각선의 개수를 구하시오.`,
        answer: `$${d}$개`,
        solution: `$n$각형의 대각선의 개수는 $\\dfrac{n(n-3)}{2}$이므로 $\\dfrac{${n}\\times${n - 3}}{2}=${d}$(개)이다.`,
        facts: { n, d },
        figureSpec: n <= 8 ? figPolygonAllDiagonals(n) : null,
      };
    },
  ),

  def(
    MINOR_POLY,
    "06",
    "대각선의 개수가 주어질 때 다각형 구하기",
    SEC.다각형,
    "응용",
    (rng): Body => {
      const n = intBetween(rng, 4, 15);
      const d = (n * (n - 3)) / 2;
      return {
        content: `대각선의 개수가 $${d}$개인 다각형의 변의 개수를 구하시오.`,
        answer: `$${n}$`,
        solution: `구하는 다각형을 $n$각형이라 하면 $\\dfrac{n(n-3)}{2}=${d}$에서 $n(n-3)=${2 * d}$이다.\n$n=${n}$일 때 성립하므로 변의 개수는 $${n}$이다.`,
        facts: { n, d },
      };
    },
  ),
];

/* ────────────────────────────────────────────────────────────────────────
 * 다각형 09~24
 * ──────────────────────────────────────────────────────────────────────── */

const VALID_N_19: readonly number[] = [3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20];
// n=4(정사각형)는 k=1 이 되어 "몇 배"를 묻기엔 자명하다 — 뺀다.
const EVEN_N_21: readonly number[] = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24];

const M1_POLY_ANGLE: TypeEntry[] = [
  def(
    MINOR_POLY,
    "09",
    "삼각형의 한 내각의 이등분선이 이루는 각",
    SEC.삼각형내외각,
    "응용",
    (rng): Body =>
      attempt(200, () => {
        const B = 2 * intBetween(rng, 10, 60);
        const C = 2 * intBetween(rng, 10, 60);
        const A = 180 - B - C;
        if (A < 10 || A > 150) return null;
        const half = A / 2;
        const mode = intBetween(rng, 0, 1);
        const ans = mode === 0 ? C + half : B + half;
        return {
          content: `삼각형 $ABC$에서 $\\angle A$의 이등분선과 변 $BC$의 교점을 $D$라 하자. $\\angle B=${B}^\\circ$, $\\angle C=${C}^\\circ$일 때, $\\angle AD${mode === 0 ? "B" : "C"}$의 크기를 구하시오.`,
          answer: `$${ans}^\\circ$`,
          solution:
            mode === 0
              ? `$\\angle A=180^\\circ-${B}^\\circ-${C}^\\circ=${A}^\\circ$이고 $\\angle CAD=\\dfrac{1}{2}\\angle A=${half}^\\circ$이다.\n삼각형 $ACD$의 외각의 성질에 의해 $\\angle ADB=\\angle ACD+\\angle CAD=${C}^\\circ+${half}^\\circ=${ans}^\\circ$이다.`
              : `$\\angle A=180^\\circ-${B}^\\circ-${C}^\\circ=${A}^\\circ$이고 $\\angle BAD=\\dfrac{1}{2}\\angle A=${half}^\\circ$이다.\n삼각형 $ABD$의 외각의 성질에 의해 $\\angle ADC=\\angle ABD+\\angle BAD=${B}^\\circ+${half}^\\circ=${ans}^\\circ$이다.`,
          facts: { B, C, A, mode, ans },
        };
      }),
  ),

  def(
    MINOR_POLY,
    "10",
    "삼각형의 두 내각의 이등분선이 이루는 각",
    SEC.삼각형내외각,
    "응용",
    (rng): Body => {
      const A = 2 * intBetween(rng, 5, 60);
      const ans = 90 + A / 2;
      return {
        content: `삼각형 $ABC$에서 $\\angle B$와 $\\angle C$의 이등분선의 교점을 $I$라 하자. $\\angle A=${A}^\\circ$일 때, $\\angle BIC$의 크기를 구하시오.`,
        answer: `$${ans}^\\circ$`,
        solution: `삼각형 $IBC$에서 $\\angle IBC+\\angle ICB=\\dfrac{1}{2}(\\angle B+\\angle C)=\\dfrac{1}{2}(180^\\circ-${A}^\\circ)$이다.\n$\\angle BIC=180^\\circ-\\dfrac{1}{2}(180^\\circ-${A}^\\circ)=90^\\circ+${A / 2}^\\circ=${ans}^\\circ$이다.`,
        facts: { A, ans },
      };
    },
  ),

  def(
    MINOR_POLY,
    "11",
    "삼각형의 한 내각의 이등분선과 한 외각의 이등분선이 이루는 각",
    SEC.삼각형내외각,
    "심화하",
    (rng): Body => {
      const A = 2 * intBetween(rng, 5, 60);
      const ans = A / 2;
      return {
        content: `삼각형 $ABC$에서 $\\angle B$의 이등분선과 $\\angle C$의 외각의 이등분선의 교점을 $P$라 하자. $\\angle A=${A}^\\circ$일 때, $\\angle BPC$의 크기를 구하시오.`,
        answer: `$${ans}^\\circ$`,
        solution: `$\\angle PBC=\\dfrac{1}{2}\\angle B$이고, $\\angle C$의 외각의 이등분선이 $\\overline{BC}$와 이루는 각은 $90^\\circ+\\dfrac{1}{2}\\angle C$이므로 $\\angle PCB=90^\\circ+\\dfrac{1}{2}\\angle C$이다.\n삼각형 $PBC$에서 $\\angle BPC=180^\\circ-\\dfrac{1}{2}\\angle B-90^\\circ-\\dfrac{1}{2}\\angle C=90^\\circ-\\dfrac{1}{2}(\\angle B+\\angle C)=90^\\circ-\\dfrac{1}{2}(180^\\circ-${A}^\\circ)=\\dfrac{${A}^\\circ}{2}=${ans}^\\circ$이다.`,
        facts: { A, ans },
      };
    },
  ),

  def(
    MINOR_POLY,
    "12",
    "이등변삼각형의 성질을 이용하여 각의 크기 구하기",
    SEC.삼각형내외각,
    "기본",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      if (mode === 0) {
        const apex = 2 * intBetween(rng, 16, 40);
        const base = (180 - apex) / 2;
        return {
          content: `$\\overline{AB}=\\overline{AC}$인 이등변삼각형 $ABC$에서 $\\angle A=${apex}^\\circ$일 때, $\\angle B$의 크기를 구하시오.`,
          answer: `$${base}^\\circ$`,
          solution: `이등변삼각형의 두 밑각의 크기는 같으므로 $\\angle B=\\dfrac{1}{2}\\times(180^\\circ-${apex}^\\circ)=${base}^\\circ$이다.`,
          facts: { mode, apex, base, ans: base },
        };
      }
      // 밑각이 정수가 되는 비만 골랐다 — 180n/(m+2n) 이 정수여야 한다.
      const [m, n] = pick(rng, [
        [4, 3],
        [1, 2],
        [3, 1],
        [1, 4],
        [2, 1],
        [4, 1],
        [5, 2],
      ] as const);
      const base = (180 * n) / (m + 2 * n);
      return {
        content: `$\\overline{AB}=\\overline{AC}$인 이등변삼각형 $ABC$에서 $\\angle A:\\angle B=${m}:${n}$일 때, $\\angle C$의 크기를 구하시오.`,
        answer: `$${base}^\\circ$`,
        solution: `$\\angle B=\\angle C$이므로 $\\angle A:\\angle B:\\angle C=${m}:${n}:${n}$이다.\n$\\angle C=180^\\circ\\times\\dfrac{${n}}{${m + 2 * n}}=${base}^\\circ$이다.`,
        facts: { mode, m, n, base, ans: base },
      };
    },
  ),

  def(
    MINOR_POLY,
    "13",
    "모양의 도형에서 각의 크기 구하기",
    SEC.삼각형내외각,
    "응용",
    (rng): Body =>
      attempt(200, () => {
        const a = intBetween(rng, 20, 90);
        const b = intBetween(rng, 20, 90);
        const c = intBetween(rng, 20, 90);
        const d = a + b - c;
        if (d < 15 || d > 130) return null;
        return {
          content: `두 선분 $AC$, $BD$가 점 $E$에서 만난다. $\\angle BAE=${a}^\\circ$, $\\angle ABE=${b}^\\circ$, $\\angle DCE=${c}^\\circ$일 때, $\\angle CDE$의 크기를 구하시오.`,
          answer: `$${d}^\\circ$`,
          solution: `$\\angle AEB=\\angle CED$(맞꼭지각)이다.\n삼각형 $ABE$에서 $\\angle AEB=180^\\circ-${a}^\\circ-${b}^\\circ$이고, 삼각형 $CDE$에서 $\\angle CED=180^\\circ-${c}^\\circ-\\angle CDE$이므로 $${a}^\\circ+${b}^\\circ=${c}^\\circ+\\angle CDE$이다.\n$\\angle CDE=${a}^\\circ+${b}^\\circ-${c}^\\circ=${d}^\\circ$이다.`,
          facts: { a, b, c, d },
        };
      }),
  ),

  def(
    MINOR_POLY,
    "14",
    "별 모양의 도형에서 각의 크기 구하기",
    SEC.삼각형내외각,
    "응용",
    (rng): Body =>
      attempt(200, () => {
        const a = intBetween(rng, 15, 45);
        const b = intBetween(rng, 15, 45);
        const c = intBetween(rng, 15, 45);
        const d = intBetween(rng, 15, 45);
        const e = 180 - a - b - c - d;
        if (e < 10 || e > 60) return null;
        return {
          content: `별 모양의 도형의 다섯 꼭짓점에서의 각을 각각 $\\angle a$, $\\angle b$, $\\angle c$, $\\angle d$, $\\angle e$라 하자. $\\angle a=${a}^\\circ$, $\\angle b=${b}^\\circ$, $\\angle c=${c}^\\circ$, $\\angle d=${d}^\\circ$일 때, $\\angle e$의 크기를 구하시오.`,
          answer: `$${e}^\\circ$`,
          solution: `별 모양의 도형에서 다섯 꼭짓점의 각의 크기의 합은 $180^\\circ$이다.\n$\\angle e=180^\\circ-${a}^\\circ-${b}^\\circ-${c}^\\circ-${d}^\\circ=${e}^\\circ$이다.`,
          facts: { a, b, c, d, e },
        };
      }),
  ),

  def(
    MINOR_POLY,
    "15",
    "다각형의 내각의 크기의 합",
    SEC.다각형내외각,
    "기본",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      const n = intBetween(rng, 4, 15);
      const s = (n - 2) * 180;
      if (mode === 0) {
        return {
          content: `$${n}$각형의 내각의 크기의 합을 구하시오.`,
          answer: `$${s}^\\circ$`,
          solution: `$n$각형의 내각의 크기의 합은 $180^\\circ\\times(n-2)$이므로 $180^\\circ\\times${n - 2}=${s}^\\circ$이다.`,
          facts: { mode, n, s },
        };
      }
      return {
        content: `내각의 크기의 합이 $${s}^\\circ$인 다각형의 변의 개수를 구하시오.`,
        answer: `$${n}$`,
        solution: `구하는 다각형을 $n$각형이라 하면 $180^\\circ\\times(n-2)=${s}^\\circ$에서 $n-2=${n - 2}$, $n=${n}$이다.`,
        facts: { mode, n, s },
      };
    },
  ),

  def(
    MINOR_POLY,
    "16",
    "다각형의 내각의 크기 구하기",
    SEC.다각형내외각,
    "응용",
    (rng): Body =>
      attempt(200, () => {
        const n = intBetween(rng, 4, 8);
        const sum = (n - 2) * 180;
        const given: number[] = [];
        for (let i = 0; i < n - 1; i += 1) given.push(intBetween(rng, 60, 160));
        const last = sum - given.reduce((s, v) => s + v, 0);
        if (last < 15 || last > 170) return null;
        const facts: Record<string, number> = { n, sum, ans: last };
        given.forEach((v, i) => {
          facts[`a${i}`] = v;
        });
        const listed = given.map((v) => `$${v}^\\circ$`).join(", ");
        return {
          content: `$${n}$각형의 $${n - 1}$개의 내각의 크기가 각각 ${listed}일 때, 나머지 한 내각의 크기를 구하시오.`,
          answer: `$${last}^\\circ$`,
          solution: `$${n}$각형의 내각의 크기의 합은 $180^\\circ\\times(${n}-2)=${sum}^\\circ$이다.\n나머지 한 내각의 크기는 $${sum}^\\circ-(${given.join("+")})^\\circ=${last}^\\circ$이다.`,
          facts,
        };
      }),
  ),

  def(
    MINOR_POLY,
    "17",
    "다각형의 외각의 크기 구하기",
    SEC.다각형내외각,
    "응용",
    (rng): Body =>
      attempt(200, () => {
        const n = intBetween(rng, 4, 8);
        const given: number[] = [];
        for (let i = 0; i < n - 1; i += 1) given.push(intBetween(rng, 20, 70));
        const last = 360 - given.reduce((s, v) => s + v, 0);
        if (last < 10 || last > 120) return null;
        const facts: Record<string, number> = { n, ans: last };
        given.forEach((v, i) => {
          facts[`a${i}`] = v;
        });
        const listed = given.map((v) => `$${v}^\\circ$`).join(", ");
        return {
          content: `$${n}$각형의 $${n - 1}$개의 외각의 크기가 각각 ${listed}일 때, 나머지 한 외각의 크기를 구하시오.`,
          answer: `$${last}^\\circ$`,
          solution: `다각형의 외각의 크기의 합은 항상 $360^\\circ$이다.\n나머지 한 외각의 크기는 $360^\\circ-(${given.join("+")})^\\circ=${last}^\\circ$이다.`,
          facts,
        };
      }),
  ),

  def(
    MINOR_POLY,
    "18",
    "다각형의 내각의 크기의 합의 활용",
    SEC.다각형내외각,
    "응용",
    (rng): Body => {
      const n = intBetween(rng, 5, 12);
      const s = (n - 2) * 180;
      const mode = intBetween(rng, 0, 1);
      if (mode === 0) {
        const diag = (n * (n - 3)) / 2;
        return {
          content: `내각의 크기의 합이 $${s}^\\circ$인 다각형의 대각선의 개수를 구하시오.`,
          answer: `$${diag}$개`,
          solution: `$180^\\circ\\times(n-2)=${s}^\\circ$에서 $n=${n}$이다.\n대각선의 개수는 $\\dfrac{n(n-3)}{2}=\\dfrac{${n}\\times${n - 3}}{2}=${diag}$(개)이다.`,
          facts: { n, s, mode, ans: diag },
        };
      }
      const v = n - 3;
      return {
        content: `내각의 크기의 합이 $${s}^\\circ$인 다각형의 한 꼭짓점에서 그을 수 있는 대각선의 개수를 구하시오.`,
        answer: `$${v}$개`,
        solution: `$180^\\circ\\times(n-2)=${s}^\\circ$에서 $n=${n}$이다.\n한 꼭짓점에서 그을 수 있는 대각선의 개수는 $n-3=${v}$(개)이다.`,
        facts: { n, s, mode, ans: v },
      };
    },
  ),

  def(
    MINOR_POLY,
    "19",
    "정다각형의 한 내각의 크기와 한 외각의 크기",
    SEC.다각형내외각,
    "기본",
    (rng): Body => {
      const mode = intBetween(rng, 0, 1);
      const n = pick(rng, VALID_N_19);
      const ext = 360 / n;
      const int = 180 - ext;
      if (mode === 0) {
        const which = intBetween(rng, 0, 1);
        const ans = which === 0 ? int : ext;
        return {
          content: `정$${n}$각형의 한 ${which === 0 ? "내각" : "외각"}의 크기를 구하시오.`,
          answer: `$${ans}^\\circ$`,
          solution: `정$${n}$각형의 한 외각의 크기는 $\\dfrac{360^\\circ}{${n}}=${ext}^\\circ$이다.\n${which === 0 ? `한 내각의 크기는 $180^\\circ-${ext}^\\circ=${int}^\\circ$이다.` : `구하는 값은 $${ext}^\\circ$이다.`}`,
          facts: { mode, n, int, ext, which, ans },
        };
      }
      const which = intBetween(rng, 0, 1);
      const given = which === 0 ? int : ext;
      return {
        content: `한 ${which === 0 ? "내각" : "외각"}의 크기가 $${given}^\\circ$인 정다각형의 변의 개수를 구하시오.`,
        answer: `$${n}$`,
        solution: `${which === 0 ? `한 외각의 크기는 $180^\\circ-${given}^\\circ=${ext}^\\circ$이다.` : `한 외각의 크기는 $${given}^\\circ$이다.`}\n$\\dfrac{360^\\circ}{n}=${ext}^\\circ$에서 $n=${n}$이다.`,
        facts: { mode, n, int, ext, which, ans: n },
      };
    },
  ),

  def(
    MINOR_POLY,
    "20",
    "정다각형에서 각의 크기 구하기 ⑴",
    SEC.다각형내외각,
    "응용",
    (rng): Body => {
      const n = intBetween(rng, 4, 20);
      // 비는 **가장 간단한 자연수의 비**로 준다 — 전에는 $(n-2):2$ 에 $1$~$4$배를 곱해
      // 「$42:6$」·「$4:4$」가 나갔다(씨앗 1,000 중 86.9%, 2026-09-27 실측).
      // $n=4$ 는 $1:1$ 이 된다(정사각형 — 옳은 비).
      const g = n % 2 === 0 ? 2 : 1; // gcd(n-2, 2)
      const a = (n - 2) / g;
      const b = 2 / g;
      return {
        content: `정다각형의 한 내각의 크기와 한 외각의 크기의 비가 $${a}:${b}$일 때, 이 정다각형의 변의 개수를 구하시오.`,
        answer: `$${n}$`,
        solution: `한 내각과 한 외각의 크기의 합은 $180^\\circ$이므로 한 외각의 크기는 $180^\\circ\\times\\dfrac{${b}}{${a + b}}$이다.\n$n=\\dfrac{360^\\circ}{180^\\circ\\times\\frac{${b}}{${a + b}}}=\\dfrac{360^\\circ\\times(${a}+${b})}{180^\\circ\\times${b}}=${n}$이다.`,
        facts: { n, a, b },
      };
    },
  ),

  def(
    MINOR_POLY,
    "21",
    "정다각형에서 각의 크기 구하기 ⑵",
    SEC.다각형내외각,
    "응용",
    (rng): Body => {
      const n = pick(rng, EVEN_N_21);
      const k = (n - 2) / 2;
      return {
        content: `한 내각의 크기가 한 외각의 크기의 $${k}$배인 정다각형의 변의 개수를 구하시오.`,
        answer: `$${n}$`,
        solution: `한 외각의 크기를 $x^\\circ$라 하면 한 내각의 크기는 $${k}x^\\circ$이고, $${k}x+x=180$에서 $x=\\dfrac{180}{${k + 1}}^\\circ$이다.\n$n=\\dfrac{360}{x}=\\dfrac{360\\times${k + 1}}{180}=${n}$이다.`,
        facts: { n, k },
      };
    },
  ),

  def(
    MINOR_POLY,
    "22",
    "다각형의 대각선의 개수의 활용",
    SEC.다각형,
    "심화하",
    (rng): Body => {
      const n = intBetween(rng, 4, 15);
      const K = (n * (n - 1)) / 2;
      return {
        content: `어떤 다각형의 변의 개수와 대각선의 개수의 합이 $${K}$일 때, 이 다각형의 변의 개수를 구하시오.`,
        answer: `$${n}$`,
        solution: `구하는 다각형을 $n$각형이라 하면 변의 개수와 대각선의 개수의 합은 $n+\\dfrac{n(n-3)}{2}=\\dfrac{n(n-1)}{2}$이다.\n$\\dfrac{n(n-1)}{2}=${K}$에서 $n(n-1)=${2 * K}$이므로 $n=${n}$이다.`,
        facts: { n, K },
      };
    },
  ),

  def(
    MINOR_POLY,
    "23",
    "삼각형의 두 외각의 이등분선이 이루는 각",
    SEC.삼각형내외각,
    "심화하",
    (rng): Body => {
      const A = 2 * intBetween(rng, 5, 60);
      const ans = 90 - A / 2;
      return {
        content: `삼각형 $ABC$에서 $\\angle B$와 $\\angle C$의 외각의 이등분선의 교점을 $P$라 하자. $\\angle A=${A}^\\circ$일 때, $\\angle BPC$의 크기를 구하시오.`,
        answer: `$${ans}^\\circ$`,
        solution: `두 외각의 이등분선의 교점은 $\\angle A$의 내각의 이등분선 위에 있고, $\\angle BPC=90^\\circ-\\dfrac{1}{2}\\angle A$가 성립한다.\n$\\angle A=${A}^\\circ$이므로 $\\angle BPC=90^\\circ-\\dfrac{${A}}{2}^\\circ=${ans}^\\circ$이다.`,
        facts: { A, ans },
      };
    },
  ),

  def(
    MINOR_POLY,
    "24",
    "삼각형의 외각의 성질을 이용하여 각의 크기 구하기",
    SEC.삼각형내외각,
    "응용",
    (rng): Body =>
      attempt(200, () => {
        const a = intBetween(rng, 15, 55);
        const b = intBetween(rng, 15, 55);
        const d = intBetween(rng, 15, 55);
        const x = 180 - a - b - d;
        if (x < 10 || x > 130) return null;
        return {
          content: `삼각형 $ABC$의 변 $BC$의 연장선 위에 점 $D$가 있다. $\\angle BAC=${a}^\\circ$, $\\angle ABC=${b}^\\circ$이고, 삼각형 $ACD$에서 $\\angle ADC=${d}^\\circ$일 때, $\\angle DAC$의 크기를 구하시오.`,
          answer: `$${x}^\\circ$`,
          solution: `삼각형 $ABC$의 외각의 성질에 의해 $\\angle ACD=\\angle BAC+\\angle ABC=${a}^\\circ+${b}^\\circ=${a + b}^\\circ$이다.\n삼각형 $ACD$의 세 내각의 크기의 합은 $180^\\circ$이므로 $\\angle DAC=180^\\circ-${a + b}^\\circ-${d}^\\circ=${x}^\\circ$이다.`,
          facts: { a, b, d, x },
        };
      }),
  ),
];

export const M1_CONSTR_TYPES: TypeEntry[] = [...M1_CONSTR, ...M1_JOINT];
export const M1_POLY2_TYPES: TypeEntry[] = [...M1_POLY_BASIC, ...M1_POLY_ANGLE];
/**
 * 중2 · RPM 2-2 용 등록기 — 「이등변삼각형의 성질」이 이 파일에 들어오면서 필요해졌다.
 * `def` 는 중1 · 1-2 로 굳어 있어 그대로 쓰면 학년이 잘못 붙는다.
 */
function def2(
  minor: string,
  rpmType: string,
  rpmTitle: string,
  unitSection: string,
  difficulty: MidProblem["difficulty"],
  gen: (rng: Rng) => Body,
): TypeEntry {
  return {
    key: `2-2|${minor}|${rpmType}`,
    grade: "중2",
    unitSection,
    rpmBook: "2-2",
    rpmMinor: minor,
    rpmType,
    rpmTitle,
    handler: (rng) => ({
      grade: "중2",
      unitSection,
      rpmBook: "2-2",
      rpmMinor: minor,
      rpmType,
      rpmTitle,
      difficulty,
      ...gen(rng),
    }),
  };
}

export const M1_GEO2_EXT: TypeEntry[] = [
  // ── 확장 유형 (갈래 C, 70~99) ─────────────────────────
  // RPM 색인은 「작도와 합동」을 14, 「다각형」을 24, 「삼각형의 성질」을 12 까지만
  // 담는다. 색인에 없는 유형을 지어야 하므로 번호를 갈래마다 나눠 쓴다 — C 는 70번대.

  def(
    MINOR_CONSTR,
    "70",
    "나머지 한 변이 될 수 있는 자연수의 개수",
    SEC.작도,
    "기본",
    (rng): Body => {
      const a = intBetween(rng, 4, 12);
      const b = intBetween(rng, 4, 12);
      const lo = Math.abs(a - b); // x > lo
      const hi = a + b; // x < hi
      const ans = hi - lo - 1;
      return {
        content: `삼각형의 두 변의 길이가 각각 $${a}\\,\\mathrm{cm}$, $${b}\\,\\mathrm{cm}$일 때, 나머지 한 변의 길이가 될 수 있는 자연수는 모두 몇 개인지 구하시오.`,
        answer: `$${ans}$개`,
        solution: `삼각형에서 한 변의 길이는 나머지 두 변의 길이의 합보다 작고 차보다 커야 한다.\n나머지 한 변의 길이를 $x\\,\\mathrm{cm}$라 하면 $${lo}<x<${hi}$이다.\n따라서 $x$는 $${lo + 1}$부터 $${hi - 1}$까지 $${ans}$개이다.`,
        facts: { a, b, lo, hi, ans },
      };
    },
  ),

  def(
    MINOR_CONSTR,
    "71",
    "세 수를 골라 삼각형을 만들 수 있는 경우의 수",
    SEC.작도,
    "응용",
    (rng): Body => {
      const pool = pickDistinct(rng, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 4).sort(
        (x, y) => x - y,
      );
      let ans = 0;
      for (let i = 0; i < 4; i += 1) {
        for (let j = i + 1; j < 4; j += 1) {
          for (let k = j + 1; k < 4; k += 1) {
            if (pool[i]! + pool[j]! > pool[k]!) ans += 1;
          }
        }
      }
      return {
        content: `네 개의 선분의 길이가 각각 $${pool[0]}\\,\\mathrm{cm}$, $${pool[1]}\\,\\mathrm{cm}$, $${pool[2]}\\,\\mathrm{cm}$, $${pool[3]}\\,\\mathrm{cm}$이다. 이 중 세 개를 골라 삼각형을 만들 수 있는 경우는 모두 몇 가지인지 구하시오.`,
        answer: `$${ans}$가지`,
        solution: `세 개를 고르는 경우는 $4$가지이고, 그때마다 가장 긴 변이 나머지 두 변의 길이의 합보다 작은지 본다.\n조건을 만족시키는 것은 $${ans}$가지이다.`,
        facts: {
          p0: pool[0]!,
          p1: pool[1]!,
          p2: pool[2]!,
          p3: pool[3]!,
          ans,
        },
      };
    },
  ),

  def(
    MINOR_CONSTR,
    "72",
    "가장 긴 변의 길이의 최댓값",
    SEC.작도,
    "심화하",
    (rng): Body => {
      const a = intBetween(rng, 5, 14);
      const b = intBetween(rng, 5, 14);
      const ans = a + b - 1;
      return {
        content: `삼각형의 두 변의 길이가 각각 $${a}\\,\\mathrm{cm}$, $${b}\\,\\mathrm{cm}$이고 나머지 한 변의 길이가 가장 길다. 나머지 한 변의 길이가 자연수일 때 그 최댓값을 구하시오.`,
        answer: `$${ans}\\,\\mathrm{cm}$`,
        solution: `나머지 한 변의 길이를 $x\\,\\mathrm{cm}$라 하면 가장 긴 변이므로 $x$는 나머지 두 변의 길이의 합보다 작아야 한다.\n$x<${a}+${b}=${a + b}$이므로 자연수 $x$의 최댓값은 $${ans}$이다.`,
        facts: { a, b, ans },
      };
    },
  ),

  def(
    MINOR_CONSTR,
    "73",
    "합동인 두 다각형의 둘레",
    SEC.합동,
    "기본",
    (rng): Body => {
      const s1 = intBetween(rng, 3, 12);
      const s2 = intBetween(rng, 3, 12);
      const s3 = intBetween(rng, 3, 12);
      const s4 = intBetween(rng, 3, 12);
      const total = s1 + s2 + s3 + s4;
      return {
        content: `사각형 $ABCD$와 사각형 $EFGH$가 합동이고 $\\overline{AB}=${s1}\\,\\mathrm{cm}$, $\\overline{BC}=${s2}\\,\\mathrm{cm}$, $\\overline{CD}=${s3}\\,\\mathrm{cm}$, $\\overline{DA}=${s4}\\,\\mathrm{cm}$이다. 사각형 $EFGH$의 둘레의 길이를 구하시오.`,
        answer: `$${total}\\,\\mathrm{cm}$`,
        solution: `합동인 두 도형은 대응변의 길이가 각각 같으므로 둘레의 길이도 같다.\n따라서 $${s1}+${s2}+${s3}+${s4}=${total}\\,\\mathrm{cm}$이다.`,
        facts: { s1, s2, s3, s4, total },
      };
    },
  ),

  def(
    MINOR_CONSTR,
    "74",
    "합동인 두 삼각형에서 나머지 각",
    SEC.합동,
    "기본",
    (rng): Body => {
      const p = intBetween(rng, 30, 80);
      const q = intBetween(rng, 30, 80);
      const r = 180 - p - q;
      if (r < 20) return { content: "", answer: "", solution: "" } as Body;
      return {
        content: `$\\triangle ABC$와 $\\triangle DEF$가 합동이고 $\\angle A=${p}^\\circ$, $\\angle B=${q}^\\circ$이다. $\\angle F$의 크기를 구하시오.`,
        answer: `$${r}^\\circ$`,
        solution: `합동인 두 삼각형은 대응각의 크기가 각각 같으므로 $\\angle D=${p}^\\circ$, $\\angle E=${q}^\\circ$이다.\n삼각형의 세 내각의 크기의 합은 $180^\\circ$이므로 $\\angle F=180^\\circ-${p}^\\circ-${q}^\\circ=${r}^\\circ$이다.`,
        facts: { p, q, r },
      };
    },
  ),

  def(
    MINOR_CONSTR,
    "75",
    "합동인 두 사각형에서 나머지 각",
    SEC.합동,
    "심화하",
    (rng): Body =>
      attempt(200, (): Body | null => {
        const p = intBetween(rng, 50, 110);
        const q = intBetween(rng, 50, 110);
        const r = intBetween(rng, 50, 110);
        const s = 360 - p - q - r;
        if (s < 30 || s > 150) return null;
        return {
          content: `사각형 $ABCD$와 사각형 $EFGH$가 합동이고 $\\angle A=${p}^\\circ$, $\\angle B=${q}^\\circ$, $\\angle C=${r}^\\circ$이다. $\\angle H$의 크기를 구하시오.`,
          answer: `$${s}^\\circ$`,
          solution: `합동이므로 대응각의 크기가 각각 같아 $\\angle E=${p}^\\circ$, $\\angle F=${q}^\\circ$, $\\angle G=${r}^\\circ$이다.\n사각형의 네 내각의 크기의 합은 $360^\\circ$이므로 $\\angle H=360^\\circ-${p}^\\circ-${q}^\\circ-${r}^\\circ=${s}^\\circ$이다.`,
          facts: { p, q, r, s },
        };
      }),
  ),

  def(
    MINOR_CONSTR,
    "76",
    "합동인 두 삼각형에서 나머지 변",
    SEC.합동,
    "응용",
    (rng): Body => {
      const s1 = intBetween(rng, 4, 13);
      const s2 = intBetween(rng, 4, 13);
      const s3 = intBetween(rng, 4, 13);
      const total = s1 + s2 + s3;
      return {
        content: `$\\triangle ABC$와 $\\triangle DEF$가 합동이고 $\\triangle DEF$의 둘레의 길이가 $${total}\\,\\mathrm{cm}$이다. $\\overline{AB}=${s1}\\,\\mathrm{cm}$, $\\overline{BC}=${s2}\\,\\mathrm{cm}$일 때, $\\overline{FD}$의 길이를 구하시오.`,
        answer: `$${s3}\\,\\mathrm{cm}$`,
        solution: `합동이므로 대응변의 길이가 각각 같아 $\\overline{DE}=${s1}$, $\\overline{EF}=${s2}\\,\\mathrm{cm}$이다.\n$\\overline{FD}=${total}-${s1}-${s2}=${s3}\\,\\mathrm{cm}$이다.`,
        facts: { s1, s2, s3, total },
      };
    },
  ),

  def2(
    "삼각형의 성질",
    "70",
    "밑각이 주어질 때 이등변삼각형의 꼭지각",
    SEC.이등변,
    "기본",
    (rng): Body => {
      const base = intBetween(rng, 25, 80);
      const apex = 180 - 2 * base;
      return {
        content: `$\\overline{AB}=\\overline{AC}$인 이등변삼각형 $ABC$에서 $\\angle B=${base}^\\circ$일 때, $\\angle A$의 크기를 구하시오.`,
        answer: `$${apex}^\\circ$`,
        solution: `이등변삼각형의 두 밑각의 크기는 같으므로 $\\angle C=\\angle B=${base}^\\circ$이다.\n세 내각의 크기의 합은 $180^\\circ$이므로 $\\angle A=180^\\circ-2\\times${base}^\\circ=${apex}^\\circ$이다.`,
        facts: { base, apex },
      };
    },
  ),

  def2(
    "삼각형의 성질",
    "71",
    "꼭지각의 이등분선과 밑변",
    SEC.이등변,
    "응용",
    (rng): Body => {
      const half = intBetween(rng, 3, 12);
      const bc = 2 * half;
      const ab = intBetween(rng, bc, bc + 12);
      return {
        content: `$\\overline{AB}=\\overline{AC}=${ab}\\,\\mathrm{cm}$인 이등변삼각형 $ABC$에서 $\\angle A$의 이등분선이 $\\overline{BC}$와 만나는 점을 $D$라 하자. $\\overline{BC}=${bc}\\,\\mathrm{cm}$일 때, $\\overline{BD}$의 길이를 구하시오.`,
        answer: `$${half}\\,\\mathrm{cm}$`,
        solution: `이등변삼각형에서 꼭지각의 이등분선은 밑변을 수직이등분한다.\n따라서 $\\overline{BD}=\\dfrac{1}{2}\\overline{BC}=\\dfrac{${bc}}{2}=${half}\\,\\mathrm{cm}$이다.`,
        facts: { ab, bc, half },
      };
    },
  ),

  def2(
    "삼각형의 성질",
    "72",
    "밑각의 이등분선이 이루는 각",
    SEC.이등변,
    "심화하",
    (rng): Body => {
      // 밑각이 4의 배수라야 이등분한 각이 정수로 떨어진다.
      const base = 4 * intBetween(rng, 8, 20);
      const apex = 180 - 2 * base;
      const x = 180 - base - base / 2;
      return {
        content: `$\\overline{AB}=\\overline{AC}$이고 $\\angle A=${apex}^\\circ$인 이등변삼각형 $ABC$에서 $\\angle B$의 이등분선이 $\\overline{AC}$와 만나는 점을 $D$라 하자. $\\angle BDC$의 크기를 구하시오.`,
        answer: `$${x}^\\circ$`,
        solution: `밑각은 $\\angle B=\\angle C=\\dfrac{180^\\circ-${apex}^\\circ}{2}=${base}^\\circ$이다.\n$\\angle DBC=\\dfrac{1}{2}\\angle B=${base / 2}^\\circ$이므로 $\\triangle DBC$에서 $\\angle BDC=180^\\circ-${base}^\\circ-${base / 2}^\\circ=${x}^\\circ$이다.`,
        facts: { apex, base, x },
      };
    },
  ),

  def(
    MINOR_POLY,
    "70",
    "내각의 크기의 합이 주어질 때 대각선의 개수",
    SEC.다각형내외각,
    "응용",
    (rng): Body => {
      const n = intBetween(rng, 5, 12); // koNum 표가 12까지다
      const sum = 180 * (n - 2);
      const diag = (n * (n - 3)) / 2;
      return {
        content: `내각의 크기의 합이 $${sum}^\\circ$인 다각형의 대각선의 개수를 구하시오.`,
        answer: `$${diag}$개`,
        solution: `$n$각형의 내각의 크기의 합은 $180^\\circ\\times(n-2)$이므로 $180\\times(n-2)=${sum}$에서 $n-2=${n - 2}$, $n=${n}$이다.\n${gonName(n)}의 대각선의 개수는 $\\dfrac{${n}\\times(${n}-3)}{2}=${diag}$개이다.`,
        facts: { n, sum, diag },
      };
    },
  ),

  def(
    MINOR_POLY,
    "71",
    "한 외각의 크기로 내각의 크기의 합 구하기",
    SEC.다각형내외각,
    "심화하",
    (rng): Body => {
      const n = pick(rng, [5, 6, 8, 9, 10, 12] as const);
      const ext = 360 / n;
      const sum = 180 * (n - 2);
      return {
        content: `한 외각의 크기가 $${ext}^\\circ$인 정다각형의 내각의 크기의 합을 구하시오.`,
        answer: `$${sum}^\\circ$`,
        solution: `정다각형의 외각의 크기의 합은 $360^\\circ$이므로 $\\dfrac{360}{n}=${ext}$에서 $n=${n}$이다.\n${gonName(n)}의 내각의 크기의 합은 $180^\\circ\\times(${n}-2)=${sum}^\\circ$이다.`,
        facts: { n, ext, sum },
      };
    },
  ),
];

export const M1_GEO2: TypeEntry[] = [
  ...M1_CONSTR_TYPES,
  ...M1_POLY2_TYPES,
  ...M1_GEO2_EXT,
];
