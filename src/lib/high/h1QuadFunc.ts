/**
 * 공통수학1 「이차방정식과 이차함수」 — RPM 공통수학1(2022) 색인 11유형. **물결 1 세션 `h1-equation` 소유.**
 *
 * 브리프 `docs/planning/tracks/high-wave1-brief.md` · 본보기 `h1Identity.ts` 를 그대로 따른다:
 * 답을 먼저 정하고 식을 짓는다 · 꼴(mode)마다 칸을 적는다(대표문제 꼴은 `기본`) · 수식 뒤 조사는
 * `josa.ts` 로만 · 수 정답은 `numAnswer`(0 이면 다시 뽑는다), 분수 정답은 `qAnswer`.
 *
 * ## 그림 없이 성립하나
 *
 * RPM 이 이 중단원에서 그림을 쓰는 문항은 활용(11)의 도형·물받이·울타리와 01 의 한 문항뿐이다.
 * 11유형 모두 **대표 구조는 글과 식만으로 선다** — 그래서 보류가 없다. 11 의 직사각형 꼴은
 * 좌표가 문제의 본뜻(포물선 위의 꼭짓점)이라 «좌표로 때운» 것이 아니다(09 §4 는 도형 그림을 좌표로
 * 대신하는 것을 막는다).
 *
 * ## 교육과정 범위 — [10공수1-02-06]
 *
 * 이차함수의 최대·최소는 **제한된 범위**에서만 묻는다(06·07·10). 범위 없는 꼭짓점 최대·최소는 중3 으로
 * 내려갔으므로 08(치환한 변수의 범위)·09(두 문자의 완전제곱식)·11(활용 — 변수의 뜻이 범위를 준다)도
 * 범위가 드러나거나 숨어 있는 꼴만 낸다.
 *
 * ## 우리 단원(시드 `prisma/seed-data/units.ts` 공통수학1 「2. 방정식과 부등식」)
 *
 *   01~05 → 이차방정식과 이차함수의 관계 · 06·07 → 이차함수의 최대·최소(1)
 *   · 08~11 → 이차함수의 최대·최소(2).
 *   (1)·(2) 는 시드가 이름만 가른다. 「제한된 범위의 최대·최소 자체」를 (1), 「치환·두 문자·조건식·활용」을
 *   (2) 로 읽었다(계획 §1-6 — 유형 제목이 가리키는 쪽). 원장님 확인 대상.
 *
 * RPM 원본은 구조만 보았다. 본문·수치·소재는 옮기지 않았다(저작권).
 */
import type { Difficulty } from "@/contracts/difficulty";

import type { Rng } from "../elementary/types";

import { eul, eun, ga, ira, ro } from "./josa";
import { q, qTex, surd, surdPmTex, surdTex, type Q } from "./numbers";
import {
  $,
  Retry,
  attempt,
  coefPrefix,
  distinctInts,
  numAnswer,
  nz,
  pickOne,
  plusConst,
  randInt,
  withSign,
} from "./pick";
import { factorParen, linTex, paren, polyTex, term } from "./poly";
import type { HighHold, HighProblem, HighTypeEntry } from "./types";

const GRADE = "공통수학1";
const BOOK = "공통수학1";
const MINOR = "이차방정식과 이차함수";

/** 우리 `Unit.section` 정확한 이름 (prisma/seed-data/units.ts 공통수학1 2. 방정식과 부등식). */
const SEC = {
  관계: "이차방정식과 이차함수의 관계",
  최대1: "이차함수의 최대·최소(1)",
  최대2: "이차함수의 최대·최소(2)",
} as const;

type Body = {
  content: string;
  answer: string;
  solution: string;
  difficulty: Difficulty;
  facts: Record<string, number>;
  distractors?: readonly string[];
};

// ───────────────────────────── 지면 ─────────────────────────────
// 공용 후보: qAnswer(분수 정답 — pick.ts) · termIf·symTerm(문자 계수 항)·prodTex(문자 인자판)·
//   sqTex·vertexTex(꼭짓점 꼴) — poly.ts · extrema·extremaLine(구간 최대·최소 해설 — 이차부등식 세션과 같은 셈).
//   `h1Equations.ts` 에도 qAnswer·termIf·prodTex 가 있다 — 리드가 병합 때 한 벌로 올린다.

function chooseOne<T>(rng: Rng, xs: readonly T[]): [number, T] {
  const id = randInt(rng, 0, xs.length - 1);
  return [id, xs[id]!];
}

/** 분수 정답 — 0 이면 다시 뽑는다(`numAnswer` 와 같은 까닭: 공용 오답 경로가 0 에서 넷을 못 만든다). */
function qAnswer(x: Q): string {
  if (x.n === 0) throw new Retry("정답이 0 이라 객관식 오답을 못 만든다");
  return $(qTex(x));
}

const floorQ = (x: Q): number => Math.floor(x.n / x.d);
const ceilQ = (x: Q): number => Math.ceil(x.n / x.d);

/** $a(v-h)^{2}$ — `h=0` 이면 $av^{2}$, 계수 ±1 은 숫자를 안 쓴다. */
function sqTex(a: number, h: number, v = "x"): string {
  const inner = h === 0 ? v : `(${v}${plusConst(-h)})`;
  return `${coefPrefix(a)}${inner}^{2}`;
}

/** 꼭짓점 꼴 $a(v-h)^{2}+k$. */
function vertexTex(a: number, h: number, k: number, v = "x"): string {
  return `${sqTex(a, h, v)}${plusConst(k)}`;
}

/** $(v-u)(v-w)\cdots$ — 근이 0 이면 `v` 를 앞에 둔다(`x(x-1)`). */
function prodTex(roots: readonly number[], v = "x"): string {
  return [...roots]
    .sort((a, b) => Number(b === 0) - Number(a === 0))
    .map((r) => factorParen(r, v))
    .join("");
}

/**
 * 문자식 계수 항 — `+(a-2)x` · `+ax` · `-ax` · `+3ax`. 계수가 수뿐이면 `term` 과 같다.
 * 손으로 `+(${e})x` 를 적으면 `e` 가 한 항일 때 `+(-a)x` 가 나간다.
 */
function symTerm(coef: string, body: string): string {
  if (coef === "0") return "";
  if (/^-?\d+$/.test(coef)) return term(Number(coef), body);
  if (/^-?\d*[a-zA-Z]$/.test(coef)) {
    return coef.startsWith("-") ? `${coef}${body}` : `+${coef}${body}`;
  }
  return `+(${coef})${body}`;
}

type Ext = { M: number; m: number; atM: number[]; atm: number[] };

/** $A(v-h)^{2}+k$ 의 $lo\le v\le hi$ 에서 최댓값·최솟값과 그 자리(끝점과 꼭짓점만 본다). */
function extrema(A: number, h: number, k: number, lo: number, hi: number): Ext {
  const pts = [lo, hi];
  if (lo < h && h < hi) pts.push(h);
  const val = (v: number): number => A * (v - h) ** 2 + k;
  const vals = pts.map(val);
  const M = Math.max(...vals);
  const m = Math.min(...vals);
  const at = (y: number): number[] =>
    pts.filter((p) => val(p) === y).sort((a, b) => a - b);
  return { M, m, atM: at(M), atm: at(m) };
}

function atTex(v: string, pts: readonly number[]): string {
  return pts.map((p) => `$${v}=${p}$`).join(" 또는 ");
}

/** 「$x=1$일 때 최댓값 $5$, $x=-2$일 때 최솟값 $-4$를 갖는다.」 */
function extremaLine(v: string, e: Ext): string {
  return `${atTex(v, e.atM)}일 때 최댓값 $${e.M}$, ${atTex(v, e.atm)}일 때 최솟값 $${e.m}$${eul(String(e.m))} 갖는다.`;
}

/** 자연수 목록 — 넷을 넘으면 가운데를 줄인다. */
function listTex(ns: readonly number[]): string {
  if (ns.length <= 4) return ns.map((n) => `$${n}$`).join(", ");
  return `$${ns[0]}$, $${ns[1]}$, $\\cdots$, $${ns[ns.length - 1]}$`;
}

// ───────────────────────────── 01 ─────────────────────────────
// 이차함수의 그래프와 x축의 교점
// 꼴 0 (기본·대표): 두 교점으로 계수 a, b
// 꼴 1 (응용): 교점의 x좌표 α, β 의 대칭식 — 근과 계수의 관계
// 꼴 2 (응용): 두 교점 사이의 거리로 상수항

function t01(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const k = pickOne(rng, [1, 2, 3, -1, -2]);
      const [p, r] = distinctInts(rng, -5, 5, 2, { nonzero: true }).sort(
        (x, y) => x - y,
      ) as [number, number];
      if (p + r === 0) return null;
      const a = -k * (p + r);
      const b = k * p * r;
      const [exprId, [et, ev]] = chooseOne(rng, [
        ["a+b", a + b],
        ["ab", a * b],
        ["a-b", a - b],
      ] as const);
      const f = `${coefPrefix(k)}x^{2}+ax+b`;
      return {
        content: `이차함수 $y=${f}$의 그래프가 $x$축과 두 점 $(${p}, 0)$, $(${r}, 0)$에서 만날 때, 상수 $a$, $b$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `이차방정식 $${f}=0$의 두 근이 $${p}$, $${r}$이므로`,
          `$${f}=${coefPrefix(k)}${prodTex([p, r])}=${polyTex([b, a, k])}$`,
          `양변의 계수를 비교하면 $a=${a}$, $b=${b}$`,
          `따라서 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, k, p, r, a, b, exprId },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const k = pickOne(rng, [1, -1, 2, -2, 3]);
      const s = nz(rng, -4, 4);
      const pr = nz(rng, -6, 6);
      if (s * s - 4 * pr <= 0) return null;
      const B = -k * s;
      const C = k * pr;
      const [exprId, [et, ev, how]] = chooseOne(rng, [
        [
          "\\alpha^{2}+\\beta^{2}",
          s * s - 2 * pr,
          `(\\alpha+\\beta)^{2}-2\\alpha\\beta=${paren(s)}^{2}-2\\times ${paren(pr)}`,
        ],
        [
          "\\alpha^{3}+\\beta^{3}",
          s ** 3 - 3 * pr * s,
          `(\\alpha+\\beta)^{3}-3\\alpha\\beta(\\alpha+\\beta)=${paren(s)}^{3}-3\\times ${paren(pr)}\\times ${paren(s)}`,
        ],
        [
          "(\\alpha-\\beta)^{2}",
          s * s - 4 * pr,
          `(\\alpha+\\beta)^{2}-4\\alpha\\beta=${paren(s)}^{2}-4\\times ${paren(pr)}`,
        ],
      ] as const);
      const poly = polyTex([C, B, k]);
      return {
        content: `이차함수 $y=${poly}$의 그래프와 $x$축의 교점의 $x$좌표를 $\\alpha$, $\\beta$${ira("\\beta")} 할 때, $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `$\\alpha$, $\\beta$${eun("\\beta")} 이차방정식 $${poly}=0$의 두 근이므로 근과 계수의 관계에 의하여`,
          `$\\alpha+\\beta=${s}$, $\\alpha\\beta=${pr}$`,
          `따라서 $${et}=${how}=${ev}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, k, B, C, exprId },
      };
    });
  return attempt<Body>((): Body | null => {
    const d = randInt(rng, 2, 8);
    const r1 = randInt(rng, -6, 4);
    const r2 = r1 + d;
    const b = -(r1 + r2);
    if (b === 0) return null;
    const a = r1 * r2;
    const f = `x^{2}${term(b, "x")}+a`;
    return {
      content: `이차함수 $y=${f}$의 그래프가 $x$축과 두 점 $\\mathrm{A}$, $\\mathrm{B}$에서 만난다. $\\overline{\\mathrm{AB}}=${d}$일 때, 상수 $a$의 값을 구하시오.`,
      answer: numAnswer(a),
      solution: [
        `두 점 $\\mathrm{A}$, $\\mathrm{B}$의 $x$좌표를 각각 $\\alpha$, $\\beta$${ira("\\beta")} 하면 $\\alpha$, $\\beta$${eun("\\beta")} 이차방정식 $${f}=0$의 두 근이므로`,
        `$\\alpha+\\beta=${-b}$, $\\alpha\\beta=a$`,
        `이때 $|\\alpha-\\beta|=${d}$이므로 $(\\alpha-\\beta)^{2}=(\\alpha+\\beta)^{2}-4\\alpha\\beta$에서`,
        `$${d * d}=${paren(-b)}^{2}-4a$`,
        `따라서 $a=${a}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, b, d, a },
    };
  });
}

// ───────────────────────────── 02 ─────────────────────────────
// 이차함수의 그래프와 직선의 교점
// 꼴 0 (기본·대표): 두 교점의 x좌표로 계수 a, b
// 꼴 1 (응용): 한 교점을 알 때 다른 교점의 y좌표
// 꼴 2 (응용): 한 교점의 x좌표가 무리수 — 켤레근으로 직선의 계수

function t02(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const k = pickOne(rng, [1, -1, 2]);
      const m = nz(rng, -3, 3);
      const [p, r] = distinctInts(rng, -4, 5, 2, { nonzero: true }).sort(
        (x, y) => x - y,
      ) as [number, number];
      const a = m - k * (p + r);
      const b = -k * p * r;
      if (a === 0) return null;
      const [exprId, [et, ev]] = chooseOne(rng, [
        ["ab", a * b],
        ["a+b", a + b],
        ["a-b", a - b],
      ] as const);
      const P = `${coefPrefix(k)}x^{2}+ax`;
      const L = `${polyTex([0, m])}+b`;
      const am = linTex([[1, "a"]], -m);
      const eq = `${coefPrefix(k)}x^{2}${symTerm(am, "x")}-b`;
      return {
        content: `이차함수 $y=${P}$의 그래프와 직선 $y=${L}$${ga(L)} 서로 다른 두 점에서 만난다. 두 교점의 $x$좌표가 $${p}$, $${r}$일 때, 상수 $a$, $b$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `$${P}=${L}$, 즉 $${eq}=0$의 두 근이 $${p}$, $${r}$이므로`,
          `$${eq}=${coefPrefix(k)}${prodTex([p, r])}=${polyTex([k * p * r, -k * (p + r), k])}$`,
          `양변의 계수를 비교하면 $${am}=${-k * (p + r)}$, $-b=${k * p * r}$`,
          `따라서 $a=${a}$, $b=${b}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, k, m, p, r, a, b, exprId },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const L = pickOne(rng, [1, 2, -1]);
      const m = nz(rng, -4, 4);
      const [t, t2] = distinctInts(rng, -4, 4, 2) as [number, number];
      const p = m - L * (t + t2);
      const c = randInt(rng, -6, 6);
      const k = L * t * t + (p - m) * t + c;
      if (k === 0) return null;
      const y2 = m * t2 + k;
      const P = polyTex([c, p, L]);
      const line = `${polyTex([0, m])}+k`;
      const eqL = polyTex([c, p - m, L]);
      return {
        content: `이차함수 $y=${P}$의 그래프와 직선 $y=${line}$${ga(line)} 서로 다른 두 점 $\\mathrm{A}$, $\\mathrm{B}$에서 만난다. 점 $\\mathrm{A}$의 $x$좌표가 $${t}$일 때, 점 $\\mathrm{B}$의 $y$좌표를 구하시오. (단, $k$는 상수이다.)`,
        answer: numAnswer(y2),
        solution: [
          `$${P}=${line}$에서 $${eqL}-k=0$ ……㉠`,
          `㉠의 한 근이 $${t}$이므로 $${k}-k=0$에서 $k=${k}$`,
          `$k=${k}$${eul(String(k))} ㉠에 대입하면 $${polyTex([c - k, p - m, L])}=0$, $${coefPrefix(L)}${prodTex([t, t2])}=0$`,
          `이때 점 $\\mathrm{B}$의 $x$좌표는 $${t2}$이므로 구하는 $y$좌표는 $${m}\\times ${paren(t2)}${plusConst(k)}=${y2}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, L, p, c, m, t, t2, k, y2 },
      };
    });
  return attempt<Body>((): Body | null => {
    const u = randInt(rng, -3, 3);
    const c0 = nz(rng, -5, 5);
    const p = randInt(rng, -3, 3);
    const r = pickOne(rng, [2, 3, 5, 6, 7]);
    const a = 2 * p + u;
    const b = c0 - p * p + r;
    const [exprId, [et, ev]] = chooseOne(rng, [
      ["a+b", a + b],
      ["ab", a * b],
      ["a-b", a - b],
    ] as const);
    const P = polyTex([c0, u, 1]);
    const x1 = surdTex(surd(p, 1, r));
    const x2 = surdTex(surd(p, -1, r));
    // x² - (a-u)x + c0 - b = 0 — `(-a-1)x` 보다 `-(a+1)x` 가 읽힌다.
    const eq = `x^{2}-${u === 0 ? "a" : `(a${plusConst(-u)})`}x${plusConst(c0)}-b=0`;
    return {
      content: `이차함수 $y=${P}$의 그래프와 직선 $y=ax+b$${ga("ax+b")} 서로 다른 두 점 $\\mathrm{P}$, $\\mathrm{Q}$에서 만난다. 점 $\\mathrm{P}$의 $x$좌표가 $${x1}$일 때, 유리수 $a$, $b$에 대하여 $${et}$의 값을 구하시오.`,
      answer: numAnswer(ev),
      solution: [
        `$${P}=ax+b$, 즉 $${eq}$의 계수가 모두 유리수이고 한 근이 $${x1}$이므로 다른 한 근은 $${x2}$이다.`,
        `두 근의 합은 $(${x1})+(${x2})=${2 * p}$, 두 근의 곱은 $(${x1})(${x2})=${p * p - r}$이므로`,
        `$${linTex([[1, "a"]], -u)}=${2 * p}$, $${c0}-b=${p * p - r}$`,
        `따라서 $a=${a}$, $b=${b}$이므로 $${et}=${ev}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, u, c0, p, r, a, b, exprId },
    };
  });
}

// ───────────────────────────── 03 ─────────────────────────────
// 이차함수의 그래프와 x축의 위치 관계
// 꼴 0 (기본·대표): 판별식의 부호로 정수 k 의 최솟값·최댓값
// 꼴 1 (응용): x축과 만나지 않을 때 자연수 순서쌍의 개수
// 꼴 2 (심화하): 한 그래프는 접하고 다른 그래프는 만나지 않는(두 점에서 만나는) k

function t03(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const c = nz(rng, -4, 4);
      const d = randInt(rng, -8, 8);
      const cond = randInt(rng, 0, 1);
      // D/4 = -ck-d = -c(k-B), B = -d/c. D>0 이면 c<0 에서 k>B.
      const B = q(-d, c);
      const greater = c < 0 === (cond === 0);
      const ans = greater ? floorQ(B) + 1 : ceilQ(B) - 1;
      const f = `x^{2}-2kx+k^{2}${term(c, "k")}${plusConst(d)}`;
      const ask = greater ? "최솟값" : "최댓값";
      return {
        content: `이차함수 $y=${f}$의 그래프가 $x$축과 ${cond === 0 ? "서로 다른 두 점에서 만나도록" : "만나지 않도록"} 하는 정수 $k$의 ${ask}을 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `이차방정식 $${f}=0$의 판별식을 $D$라 하면`,
          `$\\dfrac{D}{4}=(-k)^{2}-(k^{2}${term(c, "k")}${plusConst(d)})=${linTex([[-c, "k"]], -d)}${cond === 0 ? ">" : "<"}0$`,
          `즉 $k${greater ? ">" : "<"}${qTex(B)}$`,
          `따라서 정수 $k$의 ${ask}은 $${ans}$이다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, c, d, cond },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const w = pickOne(rng, [1, 2]);
      const N = randInt(rng, 4, w === 1 ? 20 : 26);
      const pairs: [number, number][] = [];
      for (let a = 1; a <= 6; a += 1)
        for (let b = 1; b <= 6; b += 1)
          if (a * a + w * b * b < N) pairs.push([a, b]);
      if (pairs.length === 0 || pairs.length > 10) return null;
      const wb = `${coefPrefix(w)}b^{2}`;
      const f = `x^{2}+2ax-${wb}+${N}`;
      return {
        content: `이차함수 $y=${f}$의 그래프가 $x$축과 만나지 않을 때, 자연수 $a$, $b$의 순서쌍 $(a, b)$의 개수를 구하시오.`,
        answer: numAnswer(pairs.length),
        solution: [
          `이차방정식 $${f}=0$의 판별식을 $D$라 하면`,
          `$\\dfrac{D}{4}=a^{2}-(-${wb}+${N})<0$, 즉 $a^{2}+${wb}<${N}$`,
          `이를 만족시키는 자연수 $a$, $b$의 순서쌍 $(a, b)$는 ${pairs.map(([x, y]) => `$(${x}, ${y})$`).join(", ")}의 $${pairs.length}$개이다.`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, w, N },
      };
    });
  return attempt<Body>((): Body | null => {
    const [k1, k2] = distinctInts(rng, -4, 5, 2).sort((x, y) => x - y) as [
      number,
      number,
    ];
    const s = k1 + k2;
    const t = -k1 * k2;
    if (s === 0) return null;
    const h = nz(rng, -2, 2);
    const cond2 = randInt(rng, 0, 1);
    // D₂/4 = h²+k+e. 만나지 않음(cond2=0)은 k<B 라 k₁ 만, 두 점(cond2=1)은 k>B 라 k₂ 만 남게 B 를 둔다.
    const Bv =
      cond2 === 0 ? randInt(rng, k1 + 1, k2) : randInt(rng, k1, k2 - 1);
    const e = -h * h - Bv;
    const ans = cond2 === 0 ? k1 : k2;
    if (ans === 0) return null;
    const C = linTex([[s, "k"]], t);
    const f1 = `x^{2}-2kx${withSign(C)}`;
    const f2 = `-x^{2}${term(2 * h, "x")}+k${plusConst(e)}`;
    const op = cond2 === 0 ? "<" : ">";
    return {
      content: `이차함수 $y=${f1}$의 그래프는 $x$축에 접하고, 이차함수 $y=${f2}$의 그래프는 $x$축과 ${cond2 === 0 ? "만나지 않도록" : "서로 다른 두 점에서 만나도록"} 하는 실수 $k$의 값을 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `이차방정식 $${f1}=0$의 판별식을 $D_{1}$${ira("D_{1}")} 하면`,
        `$\\dfrac{D_{1}}{4}=(-k)^{2}-(${C})=${polyTex([-t, -s, 1], "k")}=0$`,
        `$${prodTex([k1, k2], "k")}=0$에서 $k=${k1}$ 또는 $k=${k2}$ ……㉠`,
        `이차방정식 $${f2}=0$의 판별식을 $D_{2}$${ira("D_{2}")} 하면`,
        `$\\dfrac{D_{2}}{4}=${paren(h)}^{2}+${e === 0 ? "k" : `(k${plusConst(e)})`}${op}0$에서 $k${op}${Bv}$ ……㉡`,
        `㉠, ㉡에서 $k=${ans}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, k1, k2, h, e, cond2 },
    };
  });
}

// ───────────────────────────── 04 ─────────────────────────────
// 이차함수의 그래프와 직선의 위치 관계
// 꼴 0 (기본·대표): 서로 다른 두 점에서 만나도록 하는 자연수의 개수
// 꼴 1 (기본): 접하도록 하는 양수 k
// 꼴 2 (응용): 적어도 한 점에서 만나도록 하는 실수 a 의 최댓값·최솟값

function t04(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const p = pickOne(rng, [1, 2, 3]);
      const qq = randInt(rng, -5, 5);
      const m = nz(rng, -4, 4);
      const g = qq - m;
      if (g === 0) return null;
      // p x² + g x + a = 0 — D = g²-4pa > 0 에서 a < g²/(4p)
      const bound = q(g * g, 4 * p);
      const count = ceilQ(bound) - 1;
      if (count < 1 || count > 8) return null;
      const P = polyTex([0, qq, p]);
      const L = `${polyTex([0, m])}-a`;
      const naturals = Array.from({ length: count }, (_, i) => i + 1);
      return {
        content: `이차함수 $y=${P}$의 그래프와 직선 $y=${L}$${ga(L)} 서로 다른 두 점에서 만나도록 하는 자연수 $a$의 개수를 구하시오.`,
        answer: numAnswer(count),
        solution: [
          `$${P}=${L}$, 즉 $${polyTex([0, g, p])}+a=0$의 판별식을 $D$라 하면`,
          g % 2 === 0
            ? `$\\dfrac{D}{4}=${paren(g / 2)}^{2}-${coefPrefix(p)}a>0$`
            : `$D=${paren(g)}^{2}-${4 * p}a>0$`,
          `즉 $a<${qTex(bound)}$`,
          `따라서 자연수 $a$는 ${listTex(naturals)}의 $${count}$개이다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, p, q: qq, m },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const p = pickOne(rng, [1, 2, 3, -1, -2]);
      const j = randInt(rng, 1, 6);
      if ((j * j) % Math.abs(p) !== 0) return null;
      const e = -(j * j) / p;
      const k = 2 * j;
      const P = `${coefPrefix(p)}x^{2}`;
      const L = `kx${plusConst(e)}`;
      return {
        content: `이차함수 $y=${P}$의 그래프와 직선 $y=${L}$${ga(L)} 접하도록 하는 양수 $k$의 값을 구하시오.`,
        answer: numAnswer(k),
        solution: [
          `$${P}=${L}$, 즉 $${P}-kx${plusConst(-e)}=0$의 판별식을 $D$라 하면`,
          `$D=(-k)^{2}-4\\times ${paren(p)}\\times ${paren(-e)}=0$, 즉 $k^{2}=${k * k}$`,
          `이때 $k>0$이므로 $k=${k}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, p, e },
      };
    });
  return attempt<Body>((): Body | null => {
    const m = nz(rng, -3, 3);
    const g = randInt(rng, -5, 5);
    const c = randInt(rng, -6, 6);
    const W = m * m - g + c;
    const ext = q(W, 2 * m);
    const isMax = m > 0;
    const ask = isMax ? "최댓값" : "최솟값";
    const P = `x^{2}+2ax+a^{2}${plusConst(g)}`;
    const L = polyTex([c, 2 * m]);
    const cst = g - c;
    return {
      content: `이차함수 $y=${P}$의 그래프와 직선 $y=${L}$${ga(L)} 적어도 한 점에서 만나도록 하는 실수 $a$의 ${ask}을 구하시오.`,
      answer: qAnswer(ext),
      solution: [
        `$${P}=${L}$, 즉 $x^{2}+2(a${plusConst(-m)})x+a^{2}${plusConst(cst)}=0$의 판별식을 $D$라 하면`,
        `$\\dfrac{D}{4}=(a${plusConst(-m)})^{2}-${cst === 0 ? "a^{2}" : `(a^{2}${plusConst(cst)})`}\\ge 0$`,
        `$${linTex([[-2 * m, "a"]], W)}\\ge 0$이므로 $a${isMax ? "\\le" : "\\ge"} ${qTex(ext)}$`,
        `따라서 실수 $a$의 ${ask}은 $${qTex(ext)}$이다.`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, m, g, c },
    };
  });
}

// ───────────────────────────── 05 ─────────────────────────────
// 이차함수의 그래프의 접선의 방정식
// 꼴 0 (기본·대표): 주어진 직선에 평행한 접선
// 꼴 1 (응용): 그래프 밖의 한 점을 지나는 두 접선의 기울기의 곱·합
// 꼴 2 (심화하): 실수 a 의 값에 관계없이 늘 접하는 직선

function t05(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const k = pickOne(rng, [1, -1, 2, -2]);
      const t = nz(rng, -3, 3);
      const m = nz(rng, -4, 4);
      const p = m + 2 * k * t;
      const c = randInt(rng, -5, 6);
      const b = c - k * t * t;
      const n = randInt(rng, -8, 8);
      if (n === b) return null;
      const [exprId, [et, ev]] = chooseOne(rng, [
        ["a+b", m + b],
        ["ab", m * b],
        ["a-b", m - b],
      ] as const);
      const P = polyTex([c, p, k]);
      const line = polyTex([n, m]);
      const cb = c === 0 ? "-b" : `${c}-b`;
      return {
        content: `이차함수 $y=${P}$의 그래프에 접하고 직선 $y=${line}$에 평행한 직선의 방정식이 $y=ax+b$일 때, 상수 $a$, $b$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `직선 $y=ax+b$${ga("ax+b")} 직선 $y=${line}$에 평행하므로 $a=${m}$`,
          `$${P}=${polyTex([0, m])}+b$, 즉 $${polyTex([c, p - m, k])}-b=0$의 판별식을 $D$라 하면`,
          `$\\dfrac{D}{4}=${paren((p - m) / 2)}^{2}${k === 1 ? "-" : k === -1 ? "+" : `-${paren(k)}\\times `}(${cb})=0$`,
          `따라서 $b=${b}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, k, p, c, m, n, b, exprId },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const k = pickOne(rng, [1, -1]);
      const p = randInt(rng, -4, 4);
      const c = randInt(rng, -6, 8);
      const x0 = randInt(rng, -3, 3);
      const y0 = randInt(rng, -6, 8);
      if (x0 === 0 && c === y0) return null;
      // 기울기 m 의 접선 — D(m) = m² - S m + Pm = 0
      const S = 2 * p + 4 * k * x0;
      const Pm = p * p - 4 * k * (c - y0);
      if (S * S - 4 * Pm <= 0) return null;
      const kind = randInt(rng, 0, 1);
      const ans = kind === 0 ? Pm : S;
      const ask = kind === 0 ? "곱" : "합";
      const P = polyTex([c, p, k]);
      const pt = `(${x0}, ${y0})`;
      const lineM =
        x0 === 0 ? `mx${plusConst(y0)}` : `m${factorParen(x0)}${plusConst(y0)}`;
      const xc = linTex([[-1, "m"]], p);
      const cc = linTex([[x0, "m"]], c - y0);
      const eq = `${coefPrefix(k)}x^{2}${symTerm(xc, "x")}${withSign(cc)}`;
      return {
        content: `점 $${pt}$${eul(pt)} 지나고 이차함수 $y=${P}$의 그래프에 접하는 두 직선의 기울기의 ${ask}을 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `점 $${pt}$${eul(pt)} 지나는 직선의 방정식을 $y=${lineM}$${ira(lineM)} 하자.`,
          `$${P}=${lineM}$, 즉 $${eq}=0$의 판별식을 $D$라 하면`,
          `$D=(${xc})^{2}-4\\times ${paren(k)}\\times (${cc})=0$, 즉 $${polyTex([Pm, -S, 1], "m")}=0$`,
          `이 $m$에 대한 이차방정식의 판별식이 양수이므로 서로 다른 두 실근이 두 접선의 기울기이다.`,
          `따라서 근과 계수의 관계에 의하여 구하는 ${ask}은 $${ans}$이다.`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, k, p, c, x0, y0, kind },
      };
    });
  return attempt<Body>((): Body | null => {
    const j = nz(rng, -3, 3);
    const c = randInt(rng, -5, 6);
    const p = 2 * j;
    const qv = c - j * j;
    const [exprId, [et, ev]] = chooseOne(rng, [
      ["p+q", p + qv],
      ["pq", p * qv],
      ["p-q", p - qv],
    ] as const);
    const rest = `a^{2}${term(2 * j, "a")}${plusConst(c)}`;
    const F = `x^{2}-2ax+${rest}`;
    return {
      content: `실수 $a$의 값에 관계없이 이차함수 $y=${F}$의 그래프에 항상 접하는 직선의 방정식이 $y=px+q$일 때, 상수 $p$, $q$에 대하여 $${et}$의 값을 구하시오.`,
      answer: numAnswer(ev),
      solution: [
        `$${F}=px+q$, 즉 $x^{2}-(2a+p)x+${rest}-q=0$의 판별식을 $D$라 하면`,
        `$D=(2a+p)^{2}-4(${rest}-q)=0$`,
        `정리하면 $4(p${plusConst(-2 * j)})a+p^{2}+4q${plusConst(-4 * c)}=0$`,
        `이 식이 $a$의 값에 관계없이 항상 성립하므로 $p${plusConst(-2 * j)}=0$, $p^{2}+4q${plusConst(-4 * c)}=0$`,
        `따라서 $p=${p}$, $q=${qv}$이므로 $${et}=${ev}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, j, c, p, q: qv, exprId },
    };
  });
}

// ───────────────────────────── 06 ─────────────────────────────
// 제한된 범위에서 이차함수의 최대·최소
// 꼴 0 (기본·대표): 범위에서 최댓값과 최솟값의 합
// 꼴 1 (응용): 지나는 점으로 계수를 정한 뒤 최댓값·최솟값의 곱·합
// 꼴 2 (심화하): 최솟값을 a 의 함수로 두고 그 함수의 범위 최대·최소

function t06(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const a = pickOne(rng, [1, -1, 2, -2]);
      const h = randInt(rng, -3, 3);
      const k = randInt(rng, -6, 6);
      const lo = randInt(rng, -4, 2);
      const hi = lo + randInt(rng, 2, 5);
      const e = extrema(a, h, k, lo, hi);
      const f = polyTex([a * h * h + k, -2 * a * h, a]);
      const inside = lo <= h && h <= hi;
      const hs = String(h);
      return {
        content: `이차함수 $f(x)=${f}$에 대하여 $${lo}\\le x\\le ${hi}$에서 $f(x)$의 최댓값을 $M$, 최솟값을 $m$${ira("m")} 할 때, $M+m$의 값을 구하시오.`,
        answer: numAnswer(e.M + e.m),
        solution: [
          `$f(x)=${f}=${vertexTex(a, h, k)}$`,
          `꼭짓점의 $x$좌표 $${h}$${ga(hs)} 범위에 포함${inside ? "되므로" : "되지 않으므로"} $${lo}\\le x\\le ${hi}$에서 $f(x)$는 ${extremaLine("x", e)}`,
          `따라서 $M=${e.M}$, $m=${e.m}$이므로 $M+m=${e.M + e.m}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, a, h, k, lo, hi },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const a = pickOne(rng, [1, -1, 2, -2]);
      const h = nz(rng, -3, 3);
      const k = -2 * a * h;
      const c0 = randInt(rng, -6, 8);
      const s = nz(rng, -3, 3);
      const t = a * s * s + k * s + c0;
      const lo = randInt(rng, -4, 2);
      const hi = lo + randInt(rng, 2, 5);
      const top = c0 - a * h * h;
      const e = extrema(a, h, top, lo, hi);
      const kind = randInt(rng, 0, 1);
      // 합의 해설 `$5+0=5$` 는 «상수 0 을 더한» 지면이다 — 그런 판은 버린다.
      if (kind === 1 && e.m === 0) return null;
      const ans = kind === 0 ? e.M * e.m : e.M + e.m;
      const pt = `(${s}, ${t})`;
      const fk = `${coefPrefix(a)}x^{2}+kx${plusConst(c0)}`;
      return {
        content: `이차함수 $f(x)=${fk}$에 대하여 $y=f(x)$의 그래프가 점 $${pt}$${eul(pt)} 지날 때, $${lo}\\le x\\le ${hi}$에서 $f(x)$의 최댓값과 최솟값의 ${kind === 0 ? "곱" : "합"}을 구하시오. (단, $k$는 상수이다.)`,
        answer: numAnswer(ans),
        solution: [
          `$y=f(x)$의 그래프가 점 $${pt}$${eul(pt)} 지나므로 $${t}=${linTex([[s, "k"]], a * s * s + c0)}$에서 $k=${k}$`,
          `즉 $f(x)=${polyTex([c0, k, a])}=${vertexTex(a, h, top)}$이므로 $${lo}\\le x\\le ${hi}$에서 $f(x)$는 ${extremaLine("x", e)}`,
          kind === 0
            ? `따라서 구하는 곱은 $${e.M}\\times ${paren(e.m)}=${ans}$`
            : `따라서 구하는 합은 $${e.M}+${paren(e.m)}=${ans}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, a, c0, s, t, lo, hi, kind },
      };
    });
  return attempt<Body>((): Body | null => {
    const p = pickOne(rng, [1, 2]);
    const v = randInt(rng, -2, 3);
    const qa = 2 * p * p * v;
    const r = randInt(rng, -8, 8);
    const lo = randInt(rng, -2, 1);
    const hi = lo + randInt(rng, 2, 4);
    // f(a) = -p²a² + qa + r = -p²(a-v)² + p²v² + r
    const top = p * p * v * v + r;
    const e = extrema(-p * p, v, top, lo, hi);
    const kind = randInt(rng, 0, 1);
    const ans = kind === 0 ? e.M - e.m : e.M + e.m;
    const expr = kind === 0 ? "M-m" : "M+m";
    const Y = `x^{2}-${2 * p}ax${termIf(qa, "a")}${plusConst(r)}`;
    const fa = polyTex([r, qa, -p * p], "a");
    const ax = `${coefPrefix(p)}a`;
    return {
      content: `이차함수 $y=${Y}$의 최솟값을 $f(a)$${ira("f(a)")} 하자. $${lo}\\le a\\le ${hi}$에서 $f(a)$의 최댓값을 $M$, 최솟값을 $m$${ira("m")} 할 때, $${expr}$의 값을 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `$y=${Y}=(x-${ax})^{2}${withSign(fa)}$이므로 $x=${ax}$일 때 최솟값 $${fa}$${eul(fa)} 갖는다.`,
        `따라서 $f(a)=${fa}=${vertexTex(-p * p, v, top, "a")}$이므로 $${lo}\\le a\\le ${hi}$에서 $f(a)$는 ${extremaLine("a", e)}`,
        `즉 $M=${e.M}$, $m=${e.m}$이므로 $${expr}=${ans}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, p, qa, r, lo, hi, kind },
    };
  });
}

/** 계수가 0 이면 항을 안 쓴다(`term` 은 `+0a` 를 쓴다 — 지면 냄새). */
function termIf(c: number, body: string): string {
  return c === 0 ? "" : term(c, body);
}

// ───────────────────────────── 07 ─────────────────────────────
// 최댓값 또는 최솟값이 주어질 때 미지수의 값 구하기
// 꼴 0 (기본·대표): 한 극값이 주어질 때 다른 극값
// 꼴 1 (응용): 최댓값과 최솟값이 모두 주어질 때 두 계수
// 꼴 2 (심화하): 범위의 한쪽 끝이 미지수 — 꼭짓점이 범위 안인가로 경우를 나눈다

function t07(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const a = pickOne(rng, [1, -1, 2, -2]);
      const h = nz(rng, -3, 3);
      const b = -2 * a * h;
      const lo = randInt(rng, -4, 2);
      const hi = lo + randInt(rng, 2, 5);
      const kind = randInt(rng, 0, 1);
      const k = randInt(rng, -6, 6);
      const base = -a * h * h;
      const e = extrema(a, h, base + k, lo, hi);
      const V = kind === 0 ? e.M : e.m;
      const ans = kind === 0 ? e.m : e.M;
      const given = kind === 0 ? "최댓값" : "최솟값";
      const asked = kind === 0 ? "최솟값" : "최댓값";
      const argV = kind === 0 ? e.atM : e.atm;
      const argA = kind === 0 ? e.atm : e.atM;
      const vk = linTex([[1, "k"]], a * (argV[0]! - h) ** 2 + base);
      const fx = `${polyTex([0, b, a])}+k`;
      return {
        content: `$${lo}\\le x\\le ${hi}$에서 이차함수 $f(x)=${fx}$의 ${given}이 $${V}$일 때, $f(x)$의 ${asked}을 구하시오. (단, $k$는 상수이다.)`,
        answer: numAnswer(ans),
        solution: [
          `$f(x)=${fx}=${sqTex(a, h)}${plusConst(base)}+k$`,
          `$${lo}\\le x\\le ${hi}$에서 ${atTex("x", argV)}일 때 ${given} $${vk}$${eul(vk)} 가지므로 $${vk}=${V}$, 즉 $k=${k}$`,
          `따라서 ${atTex("x", argA)}일 때 ${asked} $${ans}$${eul(String(ans))} 갖는다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, a, h, lo, hi, kind, V },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const h = nz(rng, -3, 3);
      const lo = randInt(rng, -4, 2);
      const hi = lo + randInt(rng, 2, 5);
      const a = randInt(rng, 1, 3);
      const c = randInt(rng, -6, 6);
      const e = extrema(a, h, c, lo, hi);
      const b = c + a * h * h;
      const [exprId, [et, ev]] = chooseOne(rng, [
        ["a+b", a + b],
        ["a-b", a - b],
        ["ab", a * b],
      ] as const);
      const Y = `ax^{2}${term(-2 * h, "ax")}+b`;
      const coefAt = (x: number): number => (x - h) ** 2 - h * h;
      const Mlin = linTex([
        [coefAt(e.atM[0]!), "a"],
        [1, "b"],
      ]);
      const mlin = linTex([
        [coefAt(e.atm[0]!), "a"],
        [1, "b"],
      ]);
      return {
        content: `$${lo}\\le x\\le ${hi}$에서 이차함수 $y=${Y}$의 최댓값이 $${e.M}$, 최솟값이 $${e.m}$일 때, 상수 $a$, $b$에 대하여 $${et}$의 값을 구하시오. (단, $a>0$)`,
        answer: numAnswer(ev),
        solution: [
          `$y=${Y}=a${sqTex(1, h)}${withSign(
            linTex([
              [-h * h, "a"],
              [1, "b"],
            ]),
          )}$`,
          `$a>0$이므로 $${lo}\\le x\\le ${hi}$에서 ${atTex("x", e.atM)}일 때 최댓값 $${Mlin}$, ${atTex("x", e.atm)}일 때 최솟값 $${mlin}$${eul(mlin)} 갖는다.`,
          `즉 $${Mlin}=${e.M}$, $${mlin}=${e.m}$`,
          `두 식을 연립하여 풀면 $a=${a}$, $b=${b}$`,
          `따라서 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, h, lo, hi, M: e.M, m: e.m, a, b, exprId },
      };
    });
  const variant = randInt(rng, 0, 1);
  if (variant === 0)
    return attempt<Body>((): Body | null => {
      // 답이 늘 √V 쪽이면 경우 나누기 없이 풀린다 — 꼭짓점이 범위 밖인 쪽(ⅱ)이 답인 판도 낸다.
      const branch = randInt(rng, 0, 1);
      const c = randInt(rng, branch === 0 ? 1 : 2, branch === 0 ? 3 : 4);
      const k0 =
        branch === 0 ? randInt(rng, c, c + 4) : randInt(rng, c - 4, c - 1);
      const V = branch === 0 ? k0 * k0 : 2 * k0 * c - c * c;
      const fc = linTex([[2 * c, "k"]], -c * c);
      const vt = "-(x-k)^{2}+k^{2}";
      const kc = `k\\ge ${c}`;
      let first: string;
      if (branch === 0) {
        first = `(ⅰ) $${kc}$일 때, 최댓값은 $f(k)=k^{2}$이므로 $k^{2}=${V}$에서 $k=${k0}$ ($${kc}$)`;
      } else if (V < 0) {
        first = `(ⅰ) $${kc}$일 때, 최댓값은 $f(k)=k^{2}$이므로 $k^{2}=${V}$이고, 이를 만족시키는 실수 $k$는 없다.`;
      } else {
        const root = Math.sqrt(V);
        const pm = Number.isInteger(root)
          ? root === 0
            ? "0"
            : `\\pm ${root}`
          : surdPmTex(surd(0, 1, V));
        first = `(ⅰ) $${kc}$일 때, 최댓값은 $f(k)=k^{2}$이므로 $k^{2}=${V}$에서 $k=${pm}$이고, 이는 $${kc}$${eul(kc)} 만족시키지 않는다.`;
      }
      const second =
        branch === 0
          ? [
              `(ⅱ) $k<${c}$일 때, 최댓값은 $f(${c})=${fc}$이므로 $${fc}=${V}$에서 $k=${qTex(q(V + c * c, 2 * c))}$`,
              `그런데 $k<${c}$이어야 하므로 조건을 만족시키지 않는다.`,
            ]
          : [
              `(ⅱ) $k<${c}$일 때, 최댓값은 $f(${c})=${fc}$이므로 $${fc}=${V}$에서 $k=${k0}$ ($k<${c}$)`,
            ];
      return {
        content: `$x\\ge ${c}$에서 이차함수 $y=-x^{2}+2kx$의 최댓값이 $${V}$일 때, 실수 $k$의 값을 구하시오.`,
        answer: numAnswer(k0),
        solution: [
          `$f(x)=-x^{2}+2kx=${vt}$${ira(vt)} 하면`,
          first,
          ...second,
          `(ⅰ), (ⅱ)에서 $k=${k0}$`,
        ].join("\n"),
        difficulty: "심화하",
        facts: { mode, variant, branch, c, V },
      };
    });
  return attempt<Body>((): Body | null => {
    const p = randInt(rng, 2, 5);
    const t0 = randInt(rng, 1, p - 1);
    const qq = randInt(rng, -4, 8);
    const low = qq - p * p;
    const V = (t0 - p) ** 2 + low;
    const Y = polyTex([qq, -2 * p, 1]);
    const vt = vertexTex(1, p, low);
    return {
      content: `$0\\le x\\le a$에서 이차함수 $y=${Y}$의 최솟값이 $${V}$일 때, 상수 $a$의 값을 구하시오. (단, $a>0$)`,
      answer: numAnswer(t0),
      solution: [
        `$f(x)=${Y}=${vt}$${ira(vt)} 하자.`,
        `$a\\ge ${p}$이면 최솟값이 $f(${p})=${low}$이어야 하는데 $${V}>${low}$이므로 $0<a<${p}$`,
        `이때 $0\\le x\\le a$에서 $f(x)$는 $x=a$일 때 최소이므로 $f(a)=${V}$`,
        `$a^{2}-${2 * p}a${plusConst(qq - V)}=0$, $${prodTex([t0, 2 * p - t0], "a")}=0$`,
        `따라서 $0<a<${p}$이므로 $a=${t0}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, variant, p, q: qq, V },
    };
  });
}

// ───────────────────────────── 08 ─────────────────────────────
// 공통부분이 있는 함수의 최대·최소
// 꼴 0 (기본·대표): 범위가 있는 x — 공통부분 t 의 범위를 먼저 구한다
// 꼴 1 (응용): 범위가 없는 x — t 의 범위가 꼭짓점에서 생긴다, 극값으로 상수
// 꼴 2 (심화하): 두 공통부분이 상수만 다르다 — 극값을 주는 x 까지

function t08(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const h = nz(rng, -2, 2);
      const B = nz(rng, -4, 4);
      const c = randInt(rng, -6, 6);
      const lo = randInt(rng, -3, 1);
      const hi = lo + randInt(rng, 1, 3);
      const tv = (x: number): number => x * x + 2 * h * x;
      const cand = [tv(lo), tv(hi)];
      if (lo < -h && -h < hi) cand.push(-h * h);
      const tlo = Math.min(...cand);
      const thi = Math.max(...cand);
      if (tlo === thi) return null;
      const e = extrema(1, -B, c - B * B, tlo, thi);
      const kind = randInt(rng, 0, 1);
      const ask = kind === 0 ? "최댓값" : "최솟값";
      const ans = kind === 0 ? e.M : e.m;
      const inner = `x^{2}${term(2 * h, "x")}`;
      const Y = `(${inner})^{2}${term(2 * B, `(${inner})`)}${plusConst(c)}`;
      const sub = `${inner}=t`;
      return {
        content: `$${lo}\\le x\\le ${hi}$에서 함수 $y=${Y}$의 ${ask}을 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `$${sub}$${ro(sub)} 놓으면 $t=${vertexTex(1, -h, -h * h)}$`,
          `$${lo}\\le x\\le ${hi}$이므로 $${tlo}\\le t\\le ${thi}$`,
          `이때 주어진 함수는 $y=t^{2}${term(2 * B, "t")}${plusConst(c)}=${vertexTex(1, -B, c - B * B, "t")}$ ($${tlo}\\le t\\le ${thi}$)`,
          `따라서 ${atTex("t", kind === 0 ? e.atM : e.atm)}일 때 ${ask} $${ans}$${eul(String(ans))} 갖는다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, h, B, c, lo, hi, kind },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const A = pickOne(rng, [-1, -2, 1, 2]);
      const p = 2 * nz(rng, -2, 2);
      const t0 = randInt(rng, -2, 4);
      const qq = t0 + (p / 2) ** 2;
      const s = randInt(rng, t0 - 2, t0 + 3);
      const C = -2 * A * s;
      if (C === 0) return null;
      const V = randInt(rng, -8, 10);
      const tStar = s >= t0 ? s : t0;
      const g = A * (tStar - s) ** 2 - A * s * s;
      // 🔴 $g=0$ 이면 극값이 $k$ 그대로라 「최솟값이 $4$일 때 $k$의 값」의 답이 $4$ 다 — 발문의 수를 옮겨 적으면
      //    맞는다(2026-10-08 적재 전 관문 — 씨앗 여덟의 이 꼴 35판 가운데 4판). 그런 판은 다시 뽑는다.
      if (g === 0) return null;
      const k = V - g;
      if (k === 0) return null;
      const inner = polyTex([qq, p, 1]);
      const Y = `${coefPrefix(A)}(${inner})^{2}${term(C, `(${inner})`)}+k`;
      const ask = A < 0 ? "최댓값" : "최솟값";
      const sub = `${inner}=t`;
      const lin = linTex([[1, "k"]], g);
      return {
        content: `함수 $y=${Y}$의 ${ask}이 $${V}$일 때, 상수 $k$의 값을 구하시오.`,
        answer: numAnswer(k),
        solution: [
          `$${sub}$${ro(sub)} 놓으면 $t=${vertexTex(1, -p / 2, t0)}$이므로 $t\\ge ${t0}$`,
          `이때 주어진 함수는 $y=${coefPrefix(A)}t^{2}${term(C, "t")}+k=${sqTex(A, s, "t")}+k${plusConst(-A * s * s)}$ ($t\\ge ${t0}$)`,
          s >= t0
            ? `따라서 $t=${s}$일 때 ${ask} $${lin}$${eul(lin)} 가지므로 $${lin}=${V}$`
            : `꼭짓점의 $t$좌표 $${s}$${ga(String(s))} 범위에 포함되지 않으므로 $t=${t0}$일 때 ${ask} $${lin}$${eul(lin)} 가지므로 $${lin}=${V}$`,
          `즉 $k=${k}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, A, C, p, qq, V },
      };
    });
  return attempt<Body>((): Body | null => {
    const A = pickOne(rng, [-1, -2]);
    const p = 2 * nz(rng, -2, 2);
    const t0 = randInt(rng, 1, 4);
    const qq = t0 + (p / 2) ** 2;
    const s = randInt(rng, t0 - 4, t0 - 1);
    const C = -2 * A * s;
    if (C === 0) return null;
    const d = nz(rng, -4, 4);
    const q2 = qq + d;
    const r = randInt(rng, -6, 6);
    const b = A * t0 * t0 + C * (t0 + d) + r;
    const a = -p / 2;
    if (a + b === 0) return null;
    const in1 = polyTex([qq, p, 1]);
    const in2 = polyTex([q2, p, 1]);
    const Y = `${coefPrefix(A)}(${in1})^{2}${term(C, `(${in2})`)}${plusConst(r)}`;
    const sub = `${in1}=t`;
    return {
      content: `함수 $y=${Y}$${ga(Y)} $x=a$에서 최댓값 $b$${eul("b")} 갖는다. 이때 상수 $a$, $b$에 대하여 $a+b$의 값을 구하시오.`,
      answer: numAnswer(a + b),
      solution: [
        `$${sub}$${ro(sub)} 놓으면 $t=${vertexTex(1, a, t0)}$이므로 $t\\ge ${t0}$`,
        `이때 $${in2}=t${plusConst(d)}$이므로 주어진 함수는`,
        `$y=${coefPrefix(A)}t^{2}${term(C, `(t${plusConst(d)})`)}${plusConst(r)}=${vertexTex(A, s, C * d + r - A * s * s, "t")}$ ($t\\ge ${t0}$)`,
        `꼭짓점의 $t$좌표 $${s}$${ga(String(s))} 범위에 포함되지 않으므로 $t=${t0}$일 때 최댓값 $${b}$${eul(String(b))} 갖는다.`,
        `$${in1}=${t0}$에서 $${sqTex(1, a)}=0$이므로 $x=${a}$`,
        `따라서 $a=${a}$, $b=${b}$이므로 $a+b=${a + b}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, A, C, p, qq, d, r },
    };
  });
}

// ───────────────────────────── 09 ─────────────────────────────
// 완전제곱식을 이용한 이차식의 최대·최소
// 꼴 0 (기본·대표): 두 문자의 완전제곱식 — 최솟값(최댓값)
// 꼴 1 (응용): 최댓값을 주는 x, y 와 최댓값을 함께

function t09(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  return attempt<Body>((): Body | null => {
    const sign = mode === 0 ? pickOne(rng, [1, -1]) : -1;
    const al = sign * randInt(rng, 1, 3);
    const be = sign * randInt(rng, 1, 3);
    const m = randInt(rng, -4, 4);
    const n = randInt(rng, -4, 4);
    if (m === 0 && n === 0) return null;
    const k = randInt(rng, -9, 9);
    const C = al * m * m + be * n * n + k;
    const E = `${term(al, "x^{2}", true)}${termIf(-2 * al * m, "x")}${term(be, "y^{2}")}${termIf(-2 * be * n, "y")}${plusConst(C)}`;
    const vt = `${sqTex(al, m)}${be > 0 ? "+" : ""}${sqTex(be, n, "y")}${plusConst(k)}`;
    const nonneg = `이때 $x$, $y$${ga("y")} 실수이므로 $${sqTex(1, m)}\\ge 0$, $${sqTex(1, n, "y")}\\ge 0$`;
    if (mode === 0) {
      const ask = sign > 0 ? "최솟값" : "최댓값";
      return {
        content: `$x$, $y$${ga("y")} 실수일 때, $${E}$의 ${ask}을 구하시오.`,
        answer: numAnswer(k),
        solution: [
          `$${E}=${vt}$`,
          nonneg,
          `따라서 $${E}${sign > 0 ? "\\ge" : "\\le"} ${k}$이므로 주어진 식의 ${ask}은 $${k}$이다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, al, be, m, n, k },
      };
    }
    return {
      content: `실수 $x$, $y$에 대하여 $${E}$${eun(E)} $x=a$, $y=b$일 때 최댓값 $c$${eul("c")} 갖는다. 이때 상수 $a$, $b$, $c$에 대하여 $a+b+c$의 값을 구하시오.`,
      answer: numAnswer(m + n + k),
      solution: [
        `$${E}=${vt}$`,
        nonneg,
        `따라서 주어진 식은 $x=${m}$, $y=${n}$일 때 최댓값 $${k}$${eul(String(k))} 가지므로 $a=${m}$, $b=${n}$, $c=${k}$`,
        `즉 $a+b+c=${m + n + k}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, al, be, m, n, k },
    };
  });
}

// ───────────────────────────── 10 ─────────────────────────────
// 조건이 주어진 이차식의 최대·최소
// 꼴 0 (기본·대표): 일차 조건식으로 한 문자를 지우고 범위에서 최대·최소
// 꼴 1 (응용): 근과 계수의 관계로 만든 식을 매개변수의 범위에서
// 꼴 2 (심화하): 원 모양 조건 x²+y²=r² — 숨은 범위(y²≥0)

function t10(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const u = pickOne(rng, [1, -1, 2, -2, 3]);
      const v = randInt(rng, -6, 6);
      const kindE = randInt(rng, 0, 1);
      const w = pickOne(rng, [1, 2, 3]);
      const A = kindE === 0 ? 1 + w * u * u : -u;
      const Bc = kindE === 0 ? -2 * w * u * v : v;
      const Cc = kindE === 0 ? w * v * v : 0;
      if (Bc % (2 * A) !== 0) return null;
      const h = -Bc / (2 * A);
      const top = Cc - A * h * h;
      const lo = randInt(rng, -4, 1);
      const hi = lo + randInt(rng, 2, 5);
      const e = extrema(A, h, top, lo, hi);
      // 해설 `$9-0=9$` 는 «상수 0» 지면 냄새다 — 최솟값이 0 인 판은 버린다.
      if (e.m === 0) return null;
      const ask = randInt(rng, 0, 1);
      const ans = ask === 0 ? e.M + e.m : e.M - e.m;
      const cond = `${polyTex([0, u])}+y=${v}`;
      const ytex = polyTex([v, -u]);
      const E = kindE === 0 ? `x^{2}+${coefPrefix(w)}y^{2}` : "xy";
      const sub =
        kindE === 0 ? `x^{2}+${coefPrefix(w)}(${ytex})^{2}` : `x(${ytex})`;
      return {
        content: `$${cond}$${eul(cond)} 만족시키는 실수 $x$, $y$에 대하여 $${E}$의 최댓값과 최솟값의 ${ask === 0 ? "합을" : "차를"} 구하시오. (단, $${lo}\\le x\\le ${hi}$)`,
        answer: numAnswer(ans),
        solution: [
          `$${cond}$에서 $y=${ytex}$이므로`,
          `$${E}=${sub}=${vertexTex(A, h, top)}$`,
          `이때 $${lo}\\le x\\le ${hi}$이므로 ${extremaLine("x", e)}`,
          `따라서 최댓값과 최솟값의 ${ask === 0 ? "합은" : "차는"} $${e.M}${ask === 0 ? "+" : "-"}${paren(e.m)}=${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, u, v, kindE, w, lo, hi, ask },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const s = nz(rng, -3, 3);
      const w = pickOne(rng, [1, 2, 3, 4]);
      const c = nz(rng, -3, 3);
      if ((c * s) % w !== 0) return null;
      const h = (c * s) / w;
      const top = c * c + w * h * h;
      const lo = randInt(rng, 1, 3);
      const hi = lo + randInt(rng, 1, 4);
      const e = extrema(-w, h, top, lo, hi);
      const kind = randInt(rng, 0, 1);
      const ask = kind === 0 ? "최솟값" : "최댓값";
      const ans = kind === 0 ? e.m : e.M;
      const eq = `x^{2}${term(-2 * s, "ax")}-${coefPrefix(w)}a^{2}=0`;
      const pa = `(\\alpha${plusConst(c)})(\\beta${plusConst(c)})`;
      return {
        content: `$x$에 대한 이차방정식 $${eq}$의 두 실근을 $\\alpha$, $\\beta$${ira("\\beta")} 할 때, $${pa}$의 ${ask}을 구하시오. (단, $${lo}\\le a\\le ${hi}$)`,
        answer: numAnswer(ans),
        solution: [
          `이차방정식의 근과 계수의 관계에 의하여 $\\alpha+\\beta=${polyTex([0, 2 * s], "a")}$, $\\alpha\\beta=${polyTex([0, 0, -w], "a")}$이므로`,
          `$${pa}=\\alpha\\beta${term(c, "(\\alpha+\\beta)")}${plusConst(c * c)}=${polyTex([c * c, 2 * c * s, -w], "a")}=${vertexTex(-w, h, top, "a")}$`,
          `이때 $${lo}\\le a\\le ${hi}$이므로 ${extremaLine("a", e)}`,
          `따라서 구하는 ${ask}은 $${ans}$이다.`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, s, w, c, lo, hi, kind },
      };
    });
  return attempt<Body>((): Body | null => {
    const rho = randInt(rng, 2, 4);
    const R = rho * rho;
    const al = pickOne(rng, [0, 1, 2]);
    const be = pickOne(rng, [1, 2, 3]);
    if (al === be) return null;
    const D = al - be;
    const u = nz(rng, -6, 6);
    if (u % (2 * D) !== 0) return null;
    const h = -u / (2 * D);
    const top = be * R - D * h * h;
    const e = extrema(D, h, top, -rho, rho);
    if (e.m === 0) return null;
    const ask = randInt(rng, 0, 1);
    const ans = ask === 0 ? e.M + e.m : e.M - e.m;
    const xx = al === 0 ? "" : `${coefPrefix(al)}x^{2}+`;
    const E = `${xx}${coefPrefix(be)}y^{2}${term(u, "x")}`;
    const sub = `${xx}${coefPrefix(be)}(${R}-x^{2})${term(u, "x")}`;
    return {
      content: `실수 $x$, $y$에 대하여 $x^{2}+y^{2}=${R}$일 때, $${E}$의 최댓값과 최솟값의 ${ask === 0 ? "합을" : "차를"} 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `$x^{2}+y^{2}=${R}$에서 $y^{2}=${R}-x^{2}$`,
        `이때 $y$${eun("y")} 실수이므로 $y^{2}\\ge 0$에서 $${R}-x^{2}\\ge 0$, 즉 $-${rho}\\le x\\le ${rho}$`,
        `$${E}=${sub}=${vertexTex(D, h, top)}$`,
        `따라서 $-${rho}\\le x\\le ${rho}$에서 ${extremaLine("x", e)}`,
        `그러므로 최댓값과 최솟값의 ${ask === 0 ? "합은" : "차는"} $${e.M}${ask === 0 ? "+" : "-"}${paren(e.m)}=${ans}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, al, be, u, R, ask },
    };
  });
}

// ───────────────────────────── 11 ─────────────────────────────
// 이차함수의 최대·최소의 활용 — 변수의 뜻이 범위를 준다
// 꼴 0 (기본·대표): 위로 던진 공의 최고 높이
// 꼴 1 (응용): 가격을 올리면 판매량이 줄 때 판매 금액이 최대인 가격
// 꼴 2 (심화하): 인원에 따라 요금 규칙이 바뀐다 — 두 구간을 따로 본다
// 꼴 3 (응용): 포물선 아래 직사각형의 둘레

function t11(rng: Rng): Body {
  const mode = randInt(rng, 0, 3);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const T = randInt(rng, 1, 5);
      const a = 10 * T;
      const b = randInt(rng, 5, 40);
      const top = 5 * T * T + b;
      return {
        content: `지면으로부터 높이가 $${b}\\,\\mathrm{m}$인 곳에서 공을 똑바로 위로 던졌을 때, $t$초 후 공의 지면으로부터의 높이 $h(t)\\,\\mathrm{m}$에 대하여 $h(t)=-5t^{2}+${a}t+${b}$인 관계가 성립한다. 이 공이 가장 높이 올라갔을 때의 지면으로부터의 높이는 몇 $\\mathrm{m}$인지 구하시오. (단, 공의 크기는 생각하지 않는다.)`,
        answer: numAnswer(top),
        solution: [
          `$h(t)=-5t^{2}+${a}t+${b}=${vertexTex(-5, T, top, "t")}$`,
          `이때 $t\\ge 0$이므로 $t=${T}$일 때 최댓값 $${top}$${eul(String(top))} 갖는다.`,
          `따라서 구하는 높이는 $${top}\\,\\mathrm{m}$이다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, a, b },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const D = pickOne(rng, [100, 200, 500]);
      const d = pickOne(rng, [1, 2, 4, 5, 10]);
      const xs = randInt(rng, 1, 8);
      const P = D * randInt(rng, 5, 30);
      const N = 2 * d * xs + (d * P) / D;
      if (N > 500) return null;
      const ans = P + D * xs;
      const top = (P + D * xs) * (N - d * xs);
      const dx = `${coefPrefix(d)}x`;
      return {
        content: `어느 가게에서 한 개에 $${P}$원인 물건을 팔면 하루에 $${N}$개가 팔리고, 가격을 $${D}$원씩 올릴 때마다 하루 판매량이 $${d}$개씩 줄어든다고 한다. 하루 판매 금액이 최대가 되도록 하는 이 물건 한 개의 가격은 몇 원인지 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `가격을 $${D}x$원 올린다고 하면 한 개의 가격은 $(${P}+${D}x)$원, 하루 판매량은 $(${N}-${dx})$개이다.`,
          `하루 판매 금액을 $y$원이라 하면`,
          `$y=(${P}+${D}x)(${N}-${dx})=${vertexTex(-D * d, xs, top)}$`,
          `이때 $0\\le x<${qTex(q(N, d))}$이므로 $x=${xs}$일 때 $y$${eun("y")} 최대이다.`,
          `따라서 구하는 가격은 $${P}+${D}\\times ${xs}=${ans}$(원)이다.`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, P, N, D, d },
      };
    });
  if (mode === 2)
    return attempt<Body>((): Body | null => {
      const D = pickOne(rng, [500, 1000, 2000]);
      const K = pickOne(rng, [10, 15, 20, 25, 30]);
      const xs = K + randInt(rng, 3, 15);
      const P = D * (2 * xs - K);
      const Cap = xs + randInt(rng, 2, 10);
      const Y = D * xs * xs;
      return {
        content: `어느 체험 프로그램은 최대 $${Cap}$명까지 신청을 받는다. 신청자가 $${K}$명 이하이면 $1$인당 참가비가 $${P}$원이고, 신청자가 $${K}$명보다 $1$명 늘어날 때마다 $1$인당 참가비가 $${D}$원씩 내려간다. 참가비 총액이 최대가 되려면 신청자는 몇 명이어야 하는지 구하시오.`,
        answer: numAnswer(xs),
        solution: [
          `신청자가 $x$명일 때 참가비 총액을 $y$원이라 하자.`,
          `(ⅰ) $0<x\\le ${K}$일 때, $y=${P}x$이므로 $x=${K}$일 때 최댓값 $${P * K}$${eul(String(P * K))} 갖는다.`,
          `(ⅱ) $${K}<x\\le ${Cap}$일 때, $y=\\{${P}-${D}(x-${K})\\}x=${vertexTex(-D, xs, Y)}$이므로 $x=${xs}$일 때 최댓값 $${Y}$${eul(String(Y))} 갖는다.`,
          `(ⅰ), (ⅱ)에서 참가비 총액이 최대가 되려면 신청자는 $${xs}$명이어야 한다.`,
        ].join("\n"),
        difficulty: "심화하",
        facts: { mode, Cap, K, P, D },
      };
    });
  return attempt<Body>((): Body | null => {
    const k = randInt(rng, 2, 16);
    const sq = surdTex(surd(0, 1, k));
    const ans = 2 * k + 2;
    const B0 = "(a, 0)";
    return {
      content: `직사각형 $\\mathrm{ABCD}$의 두 꼭짓점 $\\mathrm{A}$, $\\mathrm{B}$${eun("\\mathrm{B}")} $x$축 위에 있고, 두 꼭짓점 $\\mathrm{C}$, $\\mathrm{D}$${eun("\\mathrm{D}")} 이차함수 $y=-x^{2}+${k}$의 그래프 위에 있다. 점 $\\mathrm{C}$${ga("\\mathrm{C}")} 제$1$사분면 위의 점일 때, 직사각형 $\\mathrm{ABCD}$의 둘레의 길이의 최댓값을 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `점 $\\mathrm{B}$의 좌표를 $${B0}$${ira(B0)} 하면 $\\mathrm{A}(-a, 0)$, $\\mathrm{C}(a, -a^{2}+${k})$이고 $0<a<${sq}$이다.`,
        `$\\overline{\\mathrm{AB}}=2a$, $\\overline{\\mathrm{BC}}=-a^{2}+${k}$이므로 직사각형 $\\mathrm{ABCD}$의 둘레의 길이는`,
        `$2\\{2a+(-a^{2}+${k})\\}=${vertexTex(-2, 1, ans, "a")}$`,
        `이때 $0<a<${sq}$이므로 $a=1$일 때 최댓값 $${ans}$${eul(String(ans))} 갖는다.`,
        `따라서 둘레의 길이의 최댓값은 $${ans}$이다.`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, k },
    };
  });
}

// ───────────────────────────── 등록 ─────────────────────────────

function entry(
  number: string,
  title: string,
  unitSection: string,
  make: (rng: Rng) => Body,
): HighTypeEntry {
  const meta = {
    grade: GRADE,
    unitSection,
    rpmBook: BOOK,
    rpmMinor: MINOR,
    rpmType: number,
    rpmTitle: title,
  };
  return {
    key: `${BOOK}|${MINOR}|${number}`,
    ...meta,
    handler: (rng: Rng): HighProblem => ({ ...meta, ...make(rng) }),
  };
}

/** 색인의 유형 번호는 보존하고, 표시 제목의 OCR 가운뎃점만 바로잡았다. */
export const H1_QUAD_FUNC: HighTypeEntry[] = [
  entry("01", "이차함수의 그래프와 x축의 교점", SEC.관계, t01),
  entry("02", "이차함수의 그래프와 직선의 교점", SEC.관계, t02),
  entry("03", "이차함수의 그래프와 x축의 위치 관계", SEC.관계, t03),
  entry("04", "이차함수의 그래프와 직선의 위치 관계", SEC.관계, t04),
  entry("05", "이차함수의 그래프의 접선의 방정식", SEC.관계, t05),
  entry("06", "제한된 범위에서 이차함수의 최대·최소", SEC.최대1, t06),
  entry(
    "07",
    "최댓값 또는 최솟값이 주어질 때 미지수의 값 구하기",
    SEC.최대1,
    t07,
  ),
  entry("08", "공통부분이 있는 함수의 최대·최소", SEC.최대2, t08),
  entry("09", "완전제곱식을 이용한 이차식의 최대·최소", SEC.최대2, t09),
  entry("10", "조건이 주어진 이차식의 최대·최소", SEC.최대2, t10),
  entry("11", "이차함수의 최대·최소의 활용", SEC.최대2, t11),
];

/** 11유형 모두 등록했다 — 보류 없음. */
export const H1_QUAD_FUNC_HOLD: HighHold[] = [];
