/**
 * 중2 「연립일차방정식」 응용 7유형(12~18) + 「연립일차방정식의 활용」 10유형(09~18).
 *
 * 우리 DB 실측(2026-08-23): 연립방정식의 풀이의 응용 0건 · 해가 특수한 연립방정식 3건 ·
 * 활용(일, 속력) 0건 · 활용(농도, 비율, 합금) 0건. RPM 2-1 색인이 유형 정본이다.
 * 활용 01~08 은 보유가 넉넉한 단원(수·평균·나이 253건, 가격·개수·증감·도형 116건)이라
 * 이번 스코프에서 제외 — 필요해지면 같은 틀로 추가한다.
 *
 * 생성 규칙은 m1LinearApply 와 같다 — 정답(해)을 먼저 뽑고 발문 수치를 역산한다.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";
const BOOK = "2-1";
const MINOR_SYS = "연립일차방정식";
const MINOR_APPLY = "연립일차방정식의 활용";

/** 우리 Unit.section 정확한 이름 (공유 DB 실측 2026-08-23) */
const SEC = {
  응용: "연립방정식의 풀이의 응용",
  특수: "해가 특수한 연립방정식",
  일속력: "연립방정식의 활용(일, 속력)",
  농도비율: "연립방정식의 활용(농도, 비율, 합금)",
} as const;

/** 조건을 만족할 때까지 다시 뽑는다 — 못 찾으면 던진다(조용히 기본값 금지). */
function attempt<T>(tries: number, f: () => T | null): T {
  for (let i = 0; i < tries; i += 1) {
    const v = f();
    if (v !== null) return v;
  }
  throw new Error("유형 생성 재시도 초과 — 매개변수 범위를 확인하십시오");
}

/** 0 이 아닌 정수를 [-max, -min]∪[min, max] 에서 뽑는다. */
function nonzero(rng: Rng, min: number, max: number): number {
  const v = intBetween(rng, min, max);
  return pick(rng, [1, -1] as const) * v;
}

/** 이어 붙는 항 — 부호를 앞세운다: sg(3)="+3", sg(-3)="-3". */
function sg(n: number): string {
  return n >= 0 ? `+${n}` : `-${-n}`;
}

/** 이어 붙는 문자항 — sc(1,"y")="+y", sc(-3,"y")="-3y". */
function sc(n: number, v: string): string {
  const s = n >= 0 ? "+" : "-";
  const a = Math.abs(n);
  return a === 1 ? `${s}${v}` : `${s}${a}${v}`;
}

/** 맨 앞 문자항 — mc(1,"x")="x", mc(-1,"x")="-x", mc(3,"x")="3x". */
function mc(n: number, v: string): string {
  if (n === 1) return v;
  if (n === -1) return `-${v}`;
  return `${n}${v}`;
}

type Body = Pick<MidProblem, "content" | "answer" | "solution" | "facts">;

function def(
  rpmMinor: string,
  rpmType: string,
  rpmTitle: string,
  unitSection: string,
  difficulty: MidProblem["difficulty"],
  gen: (rng: Rng) => Body,
): TypeEntry {
  return {
    key: `${BOOK}|${rpmMinor}|${rpmType}`,
    grade: GRADE,
    unitSection,
    rpmBook: BOOK,
    rpmMinor,
    rpmType,
    rpmTitle,
    handler: (rng) => ({
      grade: GRADE,
      unitSection,
      rpmBook: BOOK,
      rpmMinor,
      rpmType,
      rpmTitle,
      difficulty,
      ...gen(rng),
    }),
  };
}

export const M2_SYSTEM_APPLY: TypeEntry[] = [
  // ── 연립일차방정식 (풀이의 응용: 해의 조건·계수 결정) ─
  def(MINOR_SYS, "12", "연립방정식의 해가 주어질 때⑵", SEC.응용, "mid", (rng) =>
    attempt(120, () => {
      const a = nonzero(rng, 1, 5);
      const b = nonzero(rng, 1, 5);
      if (a === b) return null;
      const x0 = nonzero(rng, 2, 5);
      const y0 = nonzero(rng, 2, 5);
      if (Math.abs(x0) === Math.abs(y0)) return null;
      const c1 = a * x0 + b * y0;
      const c2 = b * x0 + a * y0;
      const S = a + b;
      return {
        content: `연립방정식 $\\begin{cases}ax+by=${c1}\\\\bx+ay=${c2}\\end{cases}$ 의 해가 $x=${x0}$, $y=${y0}$ 일 때, 상수 $a$, $b$에 대하여 $a+b$의 값을 구하시오.`,
        answer: `$${S}$`,
        solution: `주어진 해를 두 식에 대입하면 $${mc(x0, "a")}${sc(y0, "b")}=${c1}$, $${mc(x0, "b")}${sc(y0, "a")}=${c2}$이다.\n두 식을 변끼리 더하면 $${x0 + y0}(a+b)=${c1 + c2}$이므로 $a+b=${S}$이다.`,
        facts: { a, b, x0, y0, c1, c2, S },
      };
    }),
  ),

  def(
    MINOR_SYS,
    "13",
    "연립방정식의 해가 다른 일차방정식을 만족시킬 때",
    SEC.응용,
    "mid",
    (rng) =>
      attempt(120, () => {
        const x0 = nonzero(rng, 1, 5);
        const y0 = nonzero(rng, 1, 5);
        const s = x0 + y0;
        const p = intBetween(rng, 2, 4);
        const c2 = p * x0 - y0;
        const q = intBetween(rng, 2, 5);
        const k = nonzero(rng, 1, 5);
        const c3 = q * x0 - k * y0;
        return {
          content: `연립방정식 $\\begin{cases}x+y=${s}\\\\${p}x-y=${c2}\\end{cases}$ 의 해가 일차방정식 $${q}x-ky=${c3}$ 을 만족시킬 때, 상수 $k$의 값을 구하시오.`,
          answer: `$${k}$`,
          solution: `연립방정식의 두 식을 변끼리 더하면 $${p + 1}x=${s + c2}$이므로 $x=${x0}$, $y=${y0}$이다.\n$x=${x0}$, $y=${y0}$ 를 $${q}x-ky=${c3}$에 대입하면 $${q * x0}${sc(-y0, "k")}=${c3}$이다.\n따라서 $k=${k}$이다.`,
          facts: { s, p, c2, q, c3, k, x0, y0 },
        };
      }),
  ),

  def(MINOR_SYS, "14", "해에 대한 조건이 주어질 때", SEC.응용, "mid", (rng) =>
    attempt(120, () => {
      const x0 = nonzero(rng, 1, 5);
      const y0 = nonzero(rng, 1, 5);
      const k = nonzero(rng, 1, 5);
      const t1 = 2 * x0 + y0 - k;
      const t2 = x0 - 2 * y0 - k;
      const m = x0 + y0;
      if (t1 === 0 || t2 === 0 || m === 0) return null;
      return {
        content: `연립방정식 $\\begin{cases}2x+y=k${sg(t1)}\\\\x-2y=k${sg(t2)}\\end{cases}$ 를 만족시키는 $x$, $y$에 대하여 $x+y=${m}$ 일 때, 상수 $k$의 값을 구하시오.`,
        answer: `$${k}$`,
        solution: `두 식을 변끼리 빼면 $x+3y=${t1 - t2}$이다.\n$x+y=${m}$ 와 연립하여 풀면 $2y=${t1 - t2 - m}$, $y=${y0}$, $x=${x0}$이다.\n$x=${x0}$, $y=${y0}$ 를 $2x+y=k${sg(t1)}$에 대입하면 $k=${k}$이다.`,
        facts: { t1, t2, m, k, x0, y0 },
      };
    }),
  ),

  def(
    MINOR_SYS,
    "15",
    "두 연립방정식의 해가 서로 같을 때",
    SEC.응용,
    "hard",
    (rng) =>
      attempt(120, () => {
        const x0 = nonzero(rng, 1, 5);
        const y0 = nonzero(rng, 1, 5);
        const s1 = x0 + y0;
        const s2 = 3 * x0 - y0;
        const a = nonzero(rng, 1, 5);
        const b = nonzero(rng, 1, 5);
        const c1 = a * x0 + 2 * y0;
        const c2 = x0 + b * y0;
        const S = a + b;
        return {
          content: `두 연립방정식 $\\begin{cases}x+y=${s1}\\\\ax+2y=${c1}\\end{cases}$, $\\begin{cases}3x-y=${s2}\\\\x+by=${c2}\\end{cases}$ 의 해가 서로 같을 때, 상수 $a$, $b$에 대하여 $a+b$의 값을 구하시오.`,
          answer: `$${S}$`,
          solution: `네 방정식의 해가 모두 같으므로 그 해는 $\\begin{cases}x+y=${s1}\\\\3x-y=${s2}\\end{cases}$ 의 해와 같다.\n두 식을 변끼리 더하면 $4x=${s1 + s2}$이므로 $x=${x0}$, $y=${y0}$이다.\n$ax+2y=${c1}$에 대입하면 $a=${a}$, $x+by=${c2}$에 대입하면 $b=${b}$이므로 $a+b=${S}$이다.`,
          facts: { s1, s2, c1, c2, a, b, x0, y0, S },
        };
      }),
  ),

  def(
    MINOR_SYS,
    "16",
    "계수 또는 상수항을 잘못 보고 구한 해",
    SEC.응용,
    "hard",
    (rng) =>
      attempt(300, () => {
        const a = nonzero(rng, 2, 4);
        const b = nonzero(rng, 2, 4);
        const x0 = nonzero(rng, 1, 5);
        const y0 = nonzero(rng, 1, 5);
        const c1 = x0 + a * y0;
        const c2 = b * x0 - y0;
        const x1 = nonzero(rng, 2, 5);
        const y1 = b * x1 - c2;
        if (y1 === 0 || Math.abs(y1) > 12) return null;
        if (x1 === x0 && y1 === y0) return null;
        const y2 = nonzero(rng, 2, 5);
        const x2 = c1 - a * y2;
        if (x2 === 0 || Math.abs(x2) > 12) return null;
        if (x2 === x0 && y2 === y0) return null;
        return {
          content: `연립방정식 $\\begin{cases}x+ay=${c1}\\\\bx-y=${c2}\\end{cases}$ 에서 갑은 $a$를 잘못 보고 풀어 $x=${x1}$, $y=${y1}$ 을 얻었고, 을은 $b$를 잘못 보고 풀어 $x=${x2}$, $y=${y2}$ 를 얻었다. 처음 연립방정식의 옳은 해를 구하시오. (단, $a$, $b$는 상수)`,
          answer: `$x=${x0}$, $y=${y0}$`,
          solution: `갑은 $a$를 잘못 보았으므로 갑이 얻은 해는 $bx-y=${c2}$ 를 만족시킨다. $${mc(x1, "b")}${sg(-y1)}=${c2}$에서 $b=${b}$이다.\n을은 $b$를 잘못 보았으므로 을이 얻은 해는 $x+ay=${c1}$ 을 만족시킨다. $${x2}${sc(y2, "a")}=${c1}$에서 $a=${a}$이다.\n따라서 $\\begin{cases}x${sc(a, "y")}=${c1}\\\\${mc(b, "x")}-y=${c2}\\end{cases}$ 를 풀면 $x=${x0}$, $y=${y0}$이다.`,
          facts: { c1, c2, x1, y1, x2, y2, a, b, x0, y0 },
        };
      }),
  ),

  // ── 연립일차방정식 (해가 특수한 경우) ────────────────
  def(
    MINOR_SYS,
    "17",
    "해가 무수히 많은 연립방정식",
    SEC.특수,
    "mid",
    (rng) => {
      const p = intBetween(rng, 2, 4);
      const q = nonzero(rng, 1, 5);
      const r = nonzero(rng, 1, 6);
      const k = intBetween(rng, 2, 4);
      const a = k * q;
      return {
        content: `연립방정식 $\\begin{cases}${p}x${sc(q, "y")}=${r}\\\\${k * p}x+ay=${k * r}\\end{cases}$ 의 해가 무수히 많을 때, 상수 $a$의 값을 구하시오.`,
        answer: `$${a}$`,
        solution: `해가 무수히 많으려면 두 방정식이 같은 방정식이어야 한다.\n첫째 식의 양변에 $${k}$를 곱하면 $${k * p}x${sc(a, "y")}=${k * r}$이다.\n따라서 $a=${a}$이다.`,
        facts: { A1: p, B1: q, C1: r, A2: k * p, C2: k * r, a },
      };
    },
  ),

  def(MINOR_SYS, "18", "해가 없는 연립방정식", SEC.특수, "mid", (rng) =>
    attempt(80, () => {
      const p = intBetween(rng, 2, 4);
      const q = nonzero(rng, 1, 5);
      const r = nonzero(rng, 1, 6);
      const k = intBetween(rng, 2, 4);
      const a = k * q;
      const dlt = nonzero(rng, 1, 5);
      const C2 = k * r + dlt;
      return {
        content: `연립방정식 $\\begin{cases}${p}x${sc(q, "y")}=${r}\\\\${k * p}x+ay=${C2}\\end{cases}$ 의 해가 없을 때, 상수 $a$의 값을 구하시오.`,
        answer: `$${a}$`,
        solution: `해가 없으려면 $x$, $y$의 계수는 각각 같고 상수항은 달라야 한다.\n첫째 식의 양변에 $${k}$를 곱하면 $${k * p}x${sc(a, "y")}=${k * r}$이고, $${k * r}\\ne${C2}$이다.\n따라서 $a=${a}$이다.`,
        facts: { A1: p, B1: q, C1: r, A2: k * p, C2, a },
      };
    }),
  ),

  // ── 연립일차방정식의 활용 (일, 속력) ─────────────────
  def(MINOR_APPLY, "09", "일에 대한 문제", SEC.일속력, "hard", (rng) =>
    attempt(400, () => {
      const T = intBetween(rng, 2, 8);
      const m = T + intBetween(rng, 1, 24);
      if ((m * T) % (m - T) !== 0) return null;
      const n = (m * T) / (m - T);
      if (n > 36 || n === m) return null;
      const a = intBetween(rng, 1, m - 1);
      if ((n * (m - a)) % m !== 0) return null;
      const b = (n * (m - a)) / m;
      if (b < 1 || b === a) return null;
      return {
        content: `어떤 일을 $\\mathrm{A}$, $\\mathrm{B}$ 두 사람이 함께 하면 $${T}$일 만에 끝낼 수 있다. 이 일을 $\\mathrm{A}$가 $${a}$일 동안 한 후, 나머지를 $\\mathrm{B}$가 $${b}$일 동안 하여 끝냈다. 이 일을 $\\mathrm{B}$가 혼자 하면 며칠 만에 끝낼 수 있는지 구하시오.`,
        answer: `$${n}$일`,
        solution: `$\\mathrm{A}$, $\\mathrm{B}$가 혼자 하면 각각 $x$일, $y$일 걸린다고 하면 하루에 하는 일의 양은 각각 $\\dfrac{1}{x}$, $\\dfrac{1}{y}$이다.\n$\\dfrac{1}{x}+\\dfrac{1}{y}=\\dfrac{1}{${T}}$, $\\dfrac{${a}}{x}+\\dfrac{${b}}{y}=1$ 을 풀면 $x=${m}$, $y=${n}$이다.\n따라서 $\\mathrm{B}$가 혼자 하면 $${n}$일 만에 끝낼 수 있다.`,
        facts: { T, a, b, m, n },
      };
    }),
  ),

  def(
    MINOR_APPLY,
    "11",
    "거리 속력 시간에 대한 문제 속력이 바뀌는 경우",
    SEC.일속력,
    "mid",
    (rng) => {
      const [v1, v2] = pick(rng, [
        [3, 4],
        [4, 5],
        [3, 5],
        [4, 6],
        [5, 6],
        [2, 4],
      ] as const);
      const t1 = intBetween(rng, 1, 3);
      const t2 = intBetween(rng, 1, 3);
      const d1 = v1 * t1;
      const d2 = v2 * t2;
      const D = d1 + d2;
      const T = t1 + t2;
      return {
        content: `집에서 $${D}\\,\\mathrm{km}$ 떨어진 공원까지 가는데 처음에는 시속 $${v1}\\,\\mathrm{km}$로 걷다가 도중에 시속 $${v2}\\,\\mathrm{km}$로 걸어서 모두 $${T}$시간이 걸렸다. 시속 $${v1}\\,\\mathrm{km}$로 걸은 거리를 구하시오.`,
        answer: `$${d1}\\,\\mathrm{km}$`,
        solution: `시속 $${v1}\\,\\mathrm{km}$, 시속 $${v2}\\,\\mathrm{km}$로 걸은 거리를 각각 $x\\,\\mathrm{km}$, $y\\,\\mathrm{km}$라 하면 $x+y=${D}$, $\\dfrac{x}{${v1}}+\\dfrac{y}{${v2}}=${T}$이다.\n풀면 $x=${d1}$, $y=${d2}$이다.\n따라서 시속 $${v1}\\,\\mathrm{km}$로 걸은 거리는 $${d1}\\,\\mathrm{km}$이다.`,
        facts: { v1, v2, D, T, d1, d2 },
      };
    },
  ),

  def(
    MINOR_APPLY,
    "12",
    "거리 속력 시간에 대한 문제 만나는 경우",
    SEC.일속력,
    "easy",
    (rng) =>
      attempt(50, () => {
        const p = intBetween(rng, 2, 6);
        const q = intBetween(rng, 2, 6);
        if (p === q) return null;
        const t = intBetween(rng, 1, 3);
        const x = p * t;
        const y = q * t;
        const D = x + y;
        return {
          content: `$${D}\\,\\mathrm{km}$ 떨어진 두 지점에서 갑과 을이 동시에 마주 보고 출발하여 도중에 만났다. 갑은 시속 $${p}\\,\\mathrm{km}$, 을은 시속 $${q}\\,\\mathrm{km}$로 걸었을 때, 갑이 걸은 거리를 구하시오.`,
          answer: `$${x}\\,\\mathrm{km}$`,
          solution: `갑, 을이 걸은 거리를 각각 $x\\,\\mathrm{km}$, $y\\,\\mathrm{km}$라 하면 $x+y=${D}$이고, 두 사람이 걸은 시간이 같으므로 $\\dfrac{x}{${p}}=\\dfrac{y}{${q}}$이다.\n풀면 $x=${x}$, $y=${y}$이다.\n따라서 갑이 걸은 거리는 $${x}\\,\\mathrm{km}$이다.`,
          facts: { p, q, D, x, y },
        };
      }),
  ),

  def(
    MINOR_APPLY,
    "13",
    "거리 속력 시간에 대한 문제 둘레를 도는 경우",
    SEC.일속력,
    "hard",
    (rng) =>
      attempt(300, () => {
        const p = intBetween(rng, 4, 9);
        const q = intBetween(rng, 1, p - 1);
        const b = intBetween(rng, 1, 3);
        const C = (p + q) * b;
        if (C % (p - q) !== 0) return null;
        const a = C / (p - q);
        if (a > 15) return null;
        return {
          content: `둘레의 길이가 $${C}\\,\\mathrm{km}$인 호수 둘레를 갑과 을이 같은 지점에서 동시에 출발하여 도는데, 반대 방향으로 돌면 $${b}$시간 후에 처음으로 만나고, 같은 방향으로 돌면 $${a}$시간 후에 처음으로 만난다. 갑이 을보다 빠를 때, 갑의 속력은 시속 몇 $\\mathrm{km}$인지 구하시오.`,
          answer: `시속 $${p}\\,\\mathrm{km}$`,
          solution: `갑, 을의 속력을 각각 시속 $x\\,\\mathrm{km}$, 시속 $y\\,\\mathrm{km}$ ($x>y$)라 하면 반대 방향으로 돌면 $(x+y)\\times${b}=${C}$, 같은 방향으로 돌면 $(x-y)\\times${a}=${C}$이다.\n풀면 $x=${p}$, $y=${q}$이다.\n따라서 갑의 속력은 시속 $${p}\\,\\mathrm{km}$이다.`,
          facts: { C, a, b, p, q },
        };
      }),
  ),

  def(
    MINOR_APPLY,
    "14",
    "거리 속력 시간에 대한 문제 강물과 배의 속력에 대한 경우",
    SEC.일속력,
    "hard",
    (rng) =>
      attempt(300, () => {
        const bb = intBetween(rng, 4, 12);
        const w = intBetween(rng, 1, Math.min(bb - 2, 5));
        const t2 = intBetween(rng, 1, 3);
        const D = (bb + w) * t2;
        if (D % (bb - w) !== 0) return null;
        const t1 = D / (bb - w);
        if (t1 > 15) return null;
        return {
          content: `배를 타고 강을 따라 $${D}\\,\\mathrm{km}$ 떨어진 두 지점 사이를 왕복하는데 강을 거슬러 올라갈 때는 $${t1}$시간, 내려올 때는 $${t2}$시간이 걸렸다. 흐르지 않는 물에서의 배의 속력은 시속 몇 $\\mathrm{km}$인지 구하시오. (단, 강물과 배의 속력은 각각 일정하다.)`,
          answer: `시속 $${bb}\\,\\mathrm{km}$`,
          solution: `흐르지 않는 물에서의 배의 속력을 시속 $x\\,\\mathrm{km}$, 강물의 속력을 시속 $y\\,\\mathrm{km}$라 하면 거슬러 올라갈 때 $(x-y)\\times${t1}=${D}$, 내려올 때 $(x+y)\\times${t2}=${D}$이다.\n풀면 $x=${bb}$, $y=${w}$이다.\n따라서 배의 속력은 시속 $${bb}\\,\\mathrm{km}$이다.`,
          facts: { D, t1, t2, b: bb, w },
        };
      }),
  ),

  def(
    MINOR_APPLY,
    "17",
    "거리 속력 시간에 대한 문제 기차가 다리 또는 터널을 지나는 경우",
    SEC.일속력,
    "hard",
    (rng) =>
      attempt(120, () => {
        const v = pick(rng, [15, 20, 25, 30] as const);
        const L = 20 * intBetween(rng, 5, 15);
        const t1 = intBetween(rng, 20, 40);
        const t2 = intBetween(rng, 20, 40);
        if (t1 === t2) return null;
        const B1 = v * t1 - L;
        const B2 = v * t2 - L;
        if (B1 <= L || B2 <= L) return null;
        return {
          content: `일정한 속력으로 달리는 기차가 길이 $${B1}\\,\\mathrm{m}$인 다리를 완전히 지나는 데 $${t1}$초가 걸리고, 길이 $${B2}\\,\\mathrm{m}$인 터널을 완전히 지나는 데 $${t2}$초가 걸린다. 이 기차의 속력은 초속 몇 $\\mathrm{m}$인지 구하시오.`,
          answer: `초속 $${v}\\,\\mathrm{m}$`,
          solution: `기차의 길이를 $x\\,\\mathrm{m}$, 속력을 초속 $y\\,\\mathrm{m}$라 하면 $${B1}+x=${t1}y$, $${B2}+x=${t2}y$이다.\n두 식을 변끼리 빼서 풀면 $x=${L}$, $y=${v}$이다.\n따라서 기차의 속력은 초속 $${v}\\,\\mathrm{m}$이다.`,
          facts: { B1, B2, t1, t2, L, v },
        };
      }),
  ),

  // ── 연립일차방정식의 활용 (농도, 비율, 합금) ─────────
  def(MINOR_APPLY, "10", "비율에 대한 문제", SEC.농도비율, "mid", (rng) =>
    attempt(50, () => {
      const a = pick(rng, [10, 20, 25, 30, 40, 50] as const);
      const b = pick(rng, [10, 20, 25, 30, 40, 50] as const);
      if (a === b) return null;
      const x = 20 * intBetween(rng, 2, 15);
      const y = 20 * intBetween(rng, 2, 15);
      const T = x + y;
      const N = (a * x + b * y) / 100;
      return {
        content: `어느 중학교의 전체 학생은 $${T}$명이고, 이 중 남학생의 $${a}\\%$와 여학생의 $${b}\\%$가 안경을 썼다. 안경을 쓴 학생이 모두 $${N}$명일 때, 이 학교의 남학생 수를 구하시오.`,
        answer: `$${x}$명`,
        solution: `남학생을 $x$명, 여학생을 $y$명이라 하면 $x+y=${T}$, $\\dfrac{${a}}{100}x+\\dfrac{${b}}{100}y=${N}$이다.\n풀면 $x=${x}$, $y=${y}$이다.\n따라서 남학생은 $${x}$명이다.`,
        facts: { a, b, T, N, x, y },
      };
    }),
  ),

  def(
    MINOR_APPLY,
    "15",
    "농도에 대한 문제 소금물 또는 소금의 양을 구하는 경우",
    SEC.농도비율,
    "mid",
    (rng) =>
      attempt(400, () => {
        const a = pick(rng, [8, 10, 12, 15] as const);
        const b = pick(rng, [2, 3, 4, 5, 6] as const);
        if (b + 1 > a - 1) return null;
        const c = intBetween(rng, b + 1, a - 1);
        const T = pick(rng, [200, 300, 400, 500, 600] as const);
        const num = T * (c - b);
        if (num % (a - b) !== 0) return null;
        const x = num / (a - b);
        if (x < 50 || x > T - 50) return null;
        return {
          content: `$${a}\\%$의 소금물과 $${b}\\%$의 소금물을 섞어서 $${c}\\%$의 소금물 $${T}\\,\\mathrm{g}$을 만들었다. $${a}\\%$의 소금물은 몇 $\\mathrm{g}$ 섞었는지 구하시오.`,
          answer: `$${x}\\,\\mathrm{g}$`,
          solution: `$${a}\\%$, $${b}\\%$의 소금물을 각각 $x\\,\\mathrm{g}$, $y\\,\\mathrm{g}$ 섞었다고 하면 $x+y=${T}$, $\\dfrac{${a}}{100}x+\\dfrac{${b}}{100}y=\\dfrac{${c}}{100}\\times${T}$이다.\n풀면 $x=${x}$, $y=${T - x}$이다.\n따라서 $${a}\\%$의 소금물은 $${x}\\,\\mathrm{g}$ 섞었다.`,
          facts: { a, b, c, T, x },
        };
      }),
  ),

  def(
    MINOR_APPLY,
    "16",
    "농도에 대한 문제 농도를 구하는 경우",
    SEC.농도비율,
    "hard",
    (rng) =>
      attempt(200, () => {
        const a = intBetween(rng, 2, 15);
        const cands: number[] = [];
        for (let b = 2; b <= 15; b += 1) {
          if (b !== a && b % 3 === a % 3) cands.push(b);
        }
        if (cands.length === 0) return null;
        const b = pick(rng, cands);
        const m = pick(rng, [100, 150, 200] as const);
        const c1 = (2 * a + b) / 3;
        const c2 = (a + 2 * b) / 3;
        return {
          content: `농도가 다른 두 소금물 $\\mathrm{A}$, $\\mathrm{B}$가 있다. 소금물 $\\mathrm{A}$를 $${2 * m}\\,\\mathrm{g}$, 소금물 $\\mathrm{B}$를 $${m}\\,\\mathrm{g}$ 섞으면 $${c1}\\%$의 소금물이 되고, 소금물 $\\mathrm{A}$를 $${m}\\,\\mathrm{g}$, 소금물 $\\mathrm{B}$를 $${2 * m}\\,\\mathrm{g}$ 섞으면 $${c2}\\%$의 소금물이 된다. 소금물 $\\mathrm{A}$의 농도를 구하시오.`,
          answer: `$${a}\\%$`,
          solution: `소금물 $\\mathrm{A}$, $\\mathrm{B}$의 농도를 각각 $x\\%$, $y\\%$라 하면 소금의 양에서 $\\dfrac{x}{100}\\times${2 * m}+\\dfrac{y}{100}\\times${m}=\\dfrac{${c1}}{100}\\times${3 * m}$, $\\dfrac{x}{100}\\times${m}+\\dfrac{y}{100}\\times${2 * m}=\\dfrac{${c2}}{100}\\times${3 * m}$이다.\n정리하면 $2x+y=${3 * c1}$, $x+2y=${3 * c2}$이므로 $x=${a}$, $y=${b}$이다.\n따라서 소금물 $\\mathrm{A}$의 농도는 $${a}\\%$이다.`,
          facts: { mA1: 2 * m, mB1: m, mA2: m, mB2: 2 * m, c1, c2, a, b },
        };
      }),
  ),

  def(MINOR_APPLY, "18", "합금 식품에 대한 문제", SEC.농도비율, "hard", (rng) =>
    attempt(50, () => {
      const p1 = pick(rng, [20, 30, 40, 50, 60, 70, 80] as const);
      const p2 = pick(rng, [20, 30, 40, 50, 60, 70, 80] as const);
      if (p1 === p2) return null;
      const r1 = 100 - p1;
      const r2 = 100 - p2;
      const x = 10 * intBetween(rng, 10, 40);
      const y = 10 * intBetween(rng, 10, 40);
      const C = (p1 * x + p2 * y) / 100;
      const Z = (r1 * x + r2 * y) / 100;
      return {
        content: `구리를 $${p1}\\%$, 주석을 $${r1}\\%$ 포함한 합금 $\\mathrm{A}$와 구리를 $${p2}\\%$, 주석을 $${r2}\\%$ 포함한 합금 $\\mathrm{B}$를 녹여서 구리 $${C}\\,\\mathrm{g}$, 주석 $${Z}\\,\\mathrm{g}$을 얻으려고 한다. 합금 $\\mathrm{A}$는 몇 $\\mathrm{g}$이 필요한지 구하시오.`,
        answer: `$${x}\\,\\mathrm{g}$`,
        solution: `합금 $\\mathrm{A}$, $\\mathrm{B}$가 각각 $x\\,\\mathrm{g}$, $y\\,\\mathrm{g}$ 필요하다고 하면 구리의 양에서 $\\dfrac{${p1}}{100}x+\\dfrac{${p2}}{100}y=${C}$, 주석의 양에서 $\\dfrac{${r1}}{100}x+\\dfrac{${r2}}{100}y=${Z}$이다.\n풀면 $x=${x}$, $y=${y}$이다.\n따라서 합금 $\\mathrm{A}$는 $${x}\\,\\mathrm{g}$이 필요하다.`,
        facts: { p1, p2, r1, r2, C, Z, x, y },
      };
    }),
  ),
];
