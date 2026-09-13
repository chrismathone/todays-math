/**
 * 공통수학1 「연립일차부등식」 — RPM 공통수학1(2022) 색인 12유형. **물결 1 세션 `h1-ineq` 소유.**
 *
 * 브리프 `docs/planning/tracks/high-wave1-brief.md` · 본보기 `h1Identity.ts` 를 그대로 따른다.
 *
 * ## 생성 규칙 — 해의 끝점을 먼저 정하고 부등식을 짓는다
 *
 * 끝점(정수·유리수)과 부등호를 먼저 뽑고, 그 해가 나오도록 양변을 짓는다(`makeLin`).
 * `facts` 에는 발문 부등식의 **정리형**(`m·x rel c`, 부등호는 `REL_CODE`)을 싣는다. 시험은
 * ⑴ 지면의 부등식을 직접 읽어 값을 매겨 정리형과 같은 부등식인지(`SHOWN`) ⑵ 정리형으로 정수를
 * 하나하나 대입하거나 부호표를 따로 그려 답을 다시 내는지(`VERIFY`) 본다 — 이 파일의 풀이 경로를
 * 한 줄도 안 부른다.
 *
 * ## 정답이 구간이면 오답 넷을 여기서 낸다
 *
 * 「$k$의 값의 범위」처럼 답이 부등식이면 공용 수 오답 경로가 못 짓는다. 그 꼴은 `distractors` 에
 * **틀리기 쉬운 자리** — 등호 포함 여부 · 부등호 방향(음수로 나눌 때) · 끝점 부호 · 한 조건 빠뜨림 —
 * 의 오답을 넣는다(브리프 §3-4).
 *
 * ## 우리 단원(시드 `prisma/seed-data/units.ts` 공통수학1 「2. 방정식과 부등식」)
 *
 *   01~03 → 일차부등식, 연립일차부등식(1) · 04~06·11·12 → 연립일차부등식(2)
 *   · 07~10 → 절댓값 기호를 포함한 일차부등식.
 *   ⚠️ (1)·(2) 는 시드 이름만으로 못 가른다. 「풀이」(01~03)를 (1), 「해의 조건·활용」을 (2) 로
 *   두었다 — 원장님 확인 대상(보고서에 올린다).
 *
 * RPM 원본은 구조만 봤다. 본문·수치·소재는 새로 지었다(저작권).
 */
import type { Difficulty } from "@/contracts/difficulty";

import type { Rng } from "../elementary/types";

import { eul, ga, gwa } from "./josa";
import { gcd, q, qTex, type Q } from "./numbers";
import {
  $,
  attempt,
  coefPrefix,
  distinctInts,
  nz,
  numAnswer,
  pickDistractors,
  pickOne,
  randInt,
  Retry,
} from "./pick";
import { linTex, polyTex, term } from "./poly";
import type { HighHold, HighProblem, HighTypeEntry } from "./types";

const GRADE = "공통수학1";
const BOOK = "공통수학1";
const MINOR = "연립일차부등식";

/** 우리 `Unit.section` 정확한 이름 (prisma/seed-data/units.ts 공통수학1 2. 방정식과 부등식). */
const SEC = {
  연립1: "일차부등식, 연립일차부등식(1)",
  연립2: "연립일차부등식(2)",
  절댓값: "절댓값 기호를 포함한 일차부등식",
} as const;

type Body = {
  content: string;
  answer: string;
  solution: string;
  difficulty: Difficulty;
  facts: Record<string, number>;
  distractors?: readonly string[];
};

type Expr = readonly [tex: string, value: number];

function chooseExpr(rng: Rng, exprs: readonly Expr[]): [number, Expr] {
  const id = randInt(rng, 0, exprs.length - 1);
  return [id, exprs[id]!];
}

// ═════════════════════════ 공용 후보: 부등식 표기 ═════════════════════════
// 공용 후보: 부등호 · 구간 · 해의 합집합 · 일차식 한 변. 공용(`numbers.ts`·`poly.ts`)에 없는 표기라
//   여기 둔다(브리프 §3-5). `h1QuadIneq.ts` 가 가져다 쓴다 — 리드가 병합 때 공용으로 올릴 후보.

export type Rel = "<" | ">" | "le" | "ge";

/** facts 에 싣는 부등호 번호 — 시험이 같은 표로 읽는다. */
export const REL_CODE: Readonly<Record<Rel, number>> = {
  "<": 0,
  ">": 1,
  le: 2,
  ge: 3,
};

/** 부등호 글자 — `\le`·`\ge` 뒤에는 늘 한 칸(`\le x` 가 `\lex` 로 붙지 않게). */
export function relTex(r: Rel): string {
  if (r === "<") return "<";
  if (r === ">") return ">";
  return r === "le" ? "\\le " : "\\ge ";
}

/** 양변에 음수를 곱하거나 좌우를 바꿀 때 — `<`↔`>`, `≤`↔`≥`. */
export function flipRel(r: Rel): Rel {
  if (r === "<") return ">";
  if (r === ">") return "<";
  return r === "le" ? "ge" : "le";
}

export const isStrict = (r: Rel): boolean => r === "<" || r === ">";

/** `x>t`·`x≥t` — 아래로 막힌 해를 내는 부등호 */
export const isGreater = (r: Rel): boolean => r === ">" || r === "ge";

/** 부등호 모양 그대로 참·거짓 — 시험 쪽이 아니라 생성기가 조건을 거를 때 쓴다. */
export function holds(r: Rel, sign: number): boolean {
  if (r === "<") return sign < 0;
  if (r === ">") return sign > 0;
  return r === "le" ? sign <= 0 : sign >= 0;
}

/** 두 유리수의 크기 비교 — 부호만 본다. */
export function qCmp(a: Q, b: Q): number {
  return a.n * b.d - b.n * a.d;
}

export function qFloor(x: Q): number {
  return Math.floor(x.n / x.d);
}

export function qCeil(x: Q): number {
  return Math.ceil(x.n / x.d);
}

export const qIsInt = (x: Q): boolean => x.d === 1;

/** 끝점 하나 — 닫혔으면 그 점을 포함한다. */
export type Bound = { readonly at: Q; readonly closed: boolean };

/** 수직선 위의 이어진 구간 — `null` 이면 그쪽으로 끝이 없다. */
export type Iv = { readonly lo: Bound | null; readonly hi: Bound | null };

export const REAL_LINE: Iv = { lo: null, hi: null };

/** `x rel t` 의 해 */
export function rayIv(rel: Rel, t: Q): Iv {
  const b: Bound = { at: t, closed: !isStrict(rel) };
  return isGreater(rel) ? { lo: b, hi: null } : { lo: null, hi: b };
}

export function pointIv(t: Q): Iv {
  return { lo: { at: t, closed: true }, hi: { at: t, closed: true } };
}

function tighterLo(a: Bound | null, b: Bound | null): Bound | null {
  if (!a) return b;
  if (!b) return a;
  const c = qCmp(a.at, b.at);
  if (c !== 0) return c > 0 ? a : b;
  return { at: a.at, closed: a.closed && b.closed };
}

function tighterHi(a: Bound | null, b: Bound | null): Bound | null {
  if (!a) return b;
  if (!b) return a;
  const c = qCmp(a.at, b.at);
  if (c !== 0) return c < 0 ? a : b;
  return { at: a.at, closed: a.closed && b.closed };
}

export function ivEmpty(iv: Iv): boolean {
  if (!iv.lo || !iv.hi) return false;
  const c = qCmp(iv.lo.at, iv.hi.at);
  return c > 0 || (c === 0 && !(iv.lo.closed && iv.hi.closed));
}

/** 공통부분 — 비면 `null`. */
export function ivMeet(a: Iv, b: Iv): Iv | null {
  const iv: Iv = { lo: tighterLo(a.lo, b.lo), hi: tighterHi(a.hi, b.hi) };
  return ivEmpty(iv) ? null : iv;
}

/** 여러 구간의 공통부분을 구간 묶음끼리 — `(A∪B)∩(C∪D)`. */
export function ivsMeet(a: readonly Iv[], b: readonly Iv[]): Iv[] {
  const out: Iv[] = [];
  for (const x of a)
    for (const y of b) {
      const m = ivMeet(x, y);
      if (m) out.push(m);
    }
  return ivUnion(out);
}

function loKey(b: Bound | null): number {
  return b === null ? -Infinity : b.at.n / b.at.d;
}

/** 합집합 정리 — 겹치거나 맞닿은(한쪽이라도 닫힌) 구간은 하나로, 왼쪽부터. */
export function ivUnion(ivs: readonly Iv[]): Iv[] {
  const xs = [...ivs].sort((a, b) => {
    const d = loKey(a.lo) - loKey(b.lo);
    if (d !== 0) return d;
    return Number(b.lo?.closed ?? false) - Number(a.lo?.closed ?? false);
  });
  const out: Iv[] = [];
  for (const iv of xs) {
    const last = out[out.length - 1];
    if (!last) {
      out.push(iv);
      continue;
    }
    const joins =
      last.hi === null ||
      iv.lo === null ||
      qCmp(iv.lo.at, last.hi.at) < 0 ||
      (qCmp(iv.lo.at, last.hi.at) === 0 && (iv.lo.closed || last.hi.closed));
    if (!joins) {
      out.push(iv);
      continue;
    }
    let hi: Bound | null;
    if (last.hi === null || iv.hi === null) hi = null;
    else {
      const c = qCmp(last.hi.at, iv.hi.at);
      hi =
        c > 0
          ? last.hi
          : c < 0
            ? iv.hi
            : { at: iv.hi.at, closed: iv.hi.closed || last.hi.closed };
    }
    out[out.length - 1] = { lo: last.lo, hi };
  }
  return out;
}

/** 한 구간의 지면 — `-2<x\le 3` · `x\ge 1` · `x=2`. 모든 실수는 부르는 쪽이 따로 쓴다. */
export function ivTex(iv: Iv, v = "x"): string {
  const { lo, hi } = iv;
  if (lo && hi) {
    if (qCmp(lo.at, hi.at) === 0) return `${v}=${qTex(lo.at)}`;
    return `${qTex(lo.at)}${lo.closed ? "\\le " : "<"}${v}${hi.closed ? "\\le " : "<"}${qTex(hi.at)}`;
  }
  if (lo) return `${v}${lo.closed ? "\\ge " : ">"}${qTex(lo.at)}`;
  if (hi) return `${v}${hi.closed ? "\\le " : "<"}${qTex(hi.at)}`;
  throw new Error(
    "모든 실수는 구간 식으로 쓰지 않는다 — 부르는 쪽이 글로 쓴다",
  );
}

/** 끝점을 문자로 가린 구간 — `a\le x<b`. 등호 포함 여부는 **참인 해**를 그대로 따른다. */
export function ivLetters(iv: Iv, lo = "a", hi = "b", v = "x"): string {
  if (iv.lo && iv.hi)
    return `${lo}${iv.lo.closed ? "\\le " : "<"}${v}${iv.hi.closed ? "\\le " : "<"}${hi}`;
  if (iv.lo) return `${v}${iv.lo.closed ? "\\ge " : ">"}${lo}`;
  if (iv.hi) return `${v}${iv.hi.closed ? "\\le " : "<"}${hi}`;
  throw new Error("끝이 없는 구간은 문자로 가릴 수 없다");
}

/** 해 전체의 지면 글 — `$x<-1$ 또는 $x>3$` · 모든 실수. 해가 없으면 부르는 쪽이 따로 쓴다. */
export function ivsText(ivs: readonly Iv[], v = "x"): string {
  if (ivs.length === 0)
    throw new Error("해가 없는 경우는 부르는 쪽이 글로 쓴다");
  if (ivs.length === 1 && !ivs[0]!.lo && !ivs[0]!.hi) return "모든 실수";
  return ivs.map((iv) => $(ivTex(iv, v))).join(" 또는 ");
}

/** 구간 안의 정수 — 끝이 있어야 한다. */
export function intsIn(iv: Iv): number[] {
  if (!iv.lo || !iv.hi) throw new Error("끝이 없는 구간의 정수는 셀 수 없다");
  let a = qCeil(iv.lo.at);
  if (!iv.lo.closed && qIsInt(iv.lo.at)) a += 1;
  let b = qFloor(iv.hi.at);
  if (!iv.hi.closed && qIsInt(iv.hi.at)) b -= 1;
  const out: number[] = [];
  for (let n = a; n <= b; n += 1) out.push(n);
  return out;
}

/** 여러 구간에 걸친 정수 */
export function intsInAll(ivs: readonly Iv[]): number[] {
  return ivs.flatMap((iv) => intsIn(iv));
}

/** 가장 큰(작은) 정수 — 그쪽 끝이 막혀 있어야 한다. */
export function maxInt(iv: Iv): number {
  if (!iv.hi) throw new Error("위로 끝이 없다");
  let b = qFloor(iv.hi.at);
  if (!iv.hi.closed && qIsInt(iv.hi.at)) b -= 1;
  return b;
}

export function minInt(iv: Iv): number {
  if (!iv.lo) throw new Error("아래로 끝이 없다");
  let a = qCeil(iv.lo.at);
  if (!iv.lo.closed && qIsInt(iv.lo.at)) a += 1;
  return a;
}

/** 정수 나열 — `$-2$, $-1$, $0$` (많으면 가운데를 줄인다). */
export function intsText(ns: readonly number[]): string {
  if (ns.length <= 6) return ns.map((n) => $(n)).join(", ");
  return `${$(ns[0]!)}, ${$(ns[1]!)}, $\\cdots$, ${$(ns[ns.length - 1]!)}`;
}

/** `ux+w` 의 교과서 모양 — 앞이 음수이고 상수가 양수면 상수 먼저(`3-x`). */
export function linX(u: number, w: number, v = "x"): string {
  if (u < 0 && w > 0) return `${w}${term(u, v)}`;
  return polyTex([w, u], v);
}

/** 연립부등식 한 덩어리 — `\begin{cases}…\\…\end{cases}` (중등 연립방정식과 같은 모양). */
export function casesTex(rows: readonly string[]): string {
  return `\\begin{cases}${rows.join("\\\\")}\\end{cases}`;
}

/** 소수 계수 한 변 — 값은 `(u·x+w)/10`, 지면은 `0.2x-3`. */
export function decSide(u: number, w: number): string {
  if (u === 0) return String(w / 10);
  return `${term(u / 10, "x", true)}${w === 0 ? "" : term(w / 10, "")}`;
}

// ═════════════════════════ 일차식 한 변과 일차부등식 ═════════════════════════

/** 일차식 한 변 — 값은 `a·x+b`, 지면은 `tex`. */
type Side = { a: number; b: number; tex: string };

const plainSide = (a: number, b: number): Side => ({
  a,
  b,
  tex: polyTex([b, a]),
});

/** `k(ux+w)` — 괄호 꼴. 괄호 안이 둘 다 음수면 부호를 밖으로 뺀다(`-3(-x-4)` → `3(x+4)`). */
function parenSide(k: number, u: number, w: number): Side {
  if (u < 0 && w < 0) return parenSide(-k, -u, -w);
  return { a: k * u, b: k * w, tex: `${coefPrefix(k)}(${linX(u, w)})` };
}

/** 계수가 공약수를 가지면 반쯤은 괄호로 묶어 보여 준다. */
function randomSide(rng: Rng, a: number, b: number): Side {
  const g = gcd(a, b);
  if (a !== 0 && b !== 0 && g >= 2 && rng() < 0.5) {
    const k = a < 0 && rng() < 0.5 ? -g : g;
    return parenSide(k, a / k, b / k);
  }
  return plainSide(a, b);
}

/**
 * 일차부등식 하나 — 지면 `tex`, 정리하면 `m·x rel c`(정수), 해는 `sol`.
 * `clear` 가 있으면 분모를 없애는 줄(「양변에 $10$을 곱하면 …」)을 해설에 넣는다.
 */
type Lin = {
  tex: string;
  m: number;
  c: number;
  rel: Rel;
  sol: Iv;
  clear?: { by: number; tex: string };
};

function linFacts(i: number, l: Lin): Record<string, number> {
  return {
    [`m${i}`]: l.m,
    [`c${i}`]: l.c,
    [`r${i}`]: REL_CODE[l.rel],
  };
}

/** 해 `x relX t` 가 나오는 `L rel R` — 정수 계수, 한쪽은 반쯤 괄호 꼴. */
function makeLin(rng: Rng, t: Q, relX: Rel): Lin {
  const m = t.d * pickOne(rng, [-3, -2, -1, 1, 2, 3]);
  const L =
    rng() < 0.5
      ? parenSide(
          pickOne(rng, [2, 3, -2, -3]),
          pickOne(rng, [1, -1, 2]),
          nz(rng, -5, 5),
        )
      : plainSide(nz(rng, -5, 6), nz(rng, -9, 9));
  const c = (m * t.n) / t.d;
  const R = randomSide(rng, L.a - m, L.b + c);
  const rel = m > 0 ? relX : flipRel(relX);
  return {
    tex: `${L.tex}${relTex(rel)}${R.tex}`,
    m,
    c,
    rel,
    sol: rayIv(relX, t),
  };
}

/** 분수 계수 — `\dfrac{u1x+w1}{d1} rel \dfrac{u2x+w2}{d2}`. 두 분모의 최소공배수를 곱해 정리한다. */
function makeFracLin(rng: Rng, t: Q, relX: Rel): Lin {
  return attempt<Lin>((): Lin | null => {
    const [d1, d2] = distinctInts(rng, 2, 6, 2) as [number, number];
    const D = (d1 * d2) / gcd(d1, d2);
    const u1 = nz(rng, -3, 3);
    const u2 = nz(rng, -3, 3);
    const w1 = nz(rng, -6, 6);
    const m = (D / d1) * u1 - (D / d2) * u2;
    if (m === 0 || (m * t.n) % t.d !== 0) return null;
    const c = (m * t.n) / t.d;
    const num = c + (D / d1) * w1;
    if (num % (D / d2) !== 0) return null;
    const w2 = num / (D / d2);
    if (Math.abs(w2) > 12 || (w2 === 0 && u2 < 0)) return null;
    const rel = m > 0 ? relX : flipRel(relX);
    const side = (u: number, w: number, d: number) =>
      `\\dfrac{${linX(u, w)}}{${d}}`;
    const k1 = D / d1;
    const k2 = D / d2;
    const cleared = (k: number, u: number, w: number) =>
      k === 1 ? linX(u, w) : `${k}(${linX(u, w)})`;
    return {
      tex: `${side(u1, w1, d1)}${relTex(rel)}${side(u2, w2, d2)}`,
      m,
      c,
      rel,
      sol: rayIv(relX, t),
      clear: {
        by: D,
        tex: `${cleared(k1, u1, w1)}${relTex(rel)}${cleared(k2, u2, w2)}`,
      },
    };
  });
}

/** 소수 계수 — `0.2x-3\ge 0.5-0.1x`. 양변에 $10$ 을 곱해 정리한다. */
function makeDecLin(rng: Rng, t: Q, relX: Rel): Lin {
  return attempt<Lin>((): Lin | null => {
    const u1 = nz(rng, -9, 9);
    const u2 = randInt(rng, -9, 9);
    const w1 = nz(rng, -40, 40);
    const m = u1 - u2;
    if (m === 0 || (m * t.n) % t.d !== 0) return null;
    const c = (m * t.n) / t.d;
    const w2 = w1 + c;
    if (Math.abs(w2) > 60 || (u2 === 0 && w2 === 0)) return null;
    const rel = m > 0 ? relX : flipRel(relX);
    return {
      tex: `${decSide(u1, w1)}${relTex(rel)}${decSide(u2, w2)}`,
      m,
      c,
      rel,
      sol: rayIv(relX, t),
      clear: {
        by: 10,
        tex: `${polyTex([w1, u1])}${relTex(rel)}${polyTex([w2, u2])}`,
      },
    };
  });
}

/** 해설 한 줄 — 「$L\le R$에서 $3x\le -12$이므로 $x\le -4$」. */
function linStep(l: Lin): string {
  const by = l.clear
    ? `양변에 $${l.clear.by}$${eul(String(l.clear.by))} 곱하면 $${l.clear.tex}$, `
    : "";
  const mid =
    l.m === 1 ? "" : `$${term(l.m, "x", true)}${relTex(l.rel)}${l.c}$이므로 `;
  return `$${l.tex}$에서 ${by}${mid}$${ivTex(l.sol)}$`;
}

const LOWER: readonly Rel[] = [">", "ge"];
const UPPER: readonly Rel[] = ["<", "le"];

/** 끝점 `t` 에서 닫힌 쪽/열린 쪽 부등호 */
const lowerRel = (closed: boolean): Rel => (closed ? "ge" : ">");
const upperRel = (closed: boolean): Rel => (closed ? "le" : "<");

// ═════════════════════════ A<B<C 의 꼴 ═════════════════════════

/**
 * `A rel1 B rel2 C` — 두 부등호는 같은 쪽(`<`·`≤`)이다. 한 부분은 아래로, 다른 부분은 위로 막힌 해를
 * 낸다(`lowerFirst` 가 왼쪽 부분이 아래쪽인가). 가운데 `B` 는 `d` 로 나눈 분수일 수 있다.
 */
type Chain = { tex: string; left: Lin; right: Lin; mid: string };

export function makeChain(
  rng: Rng,
  lower: Bound,
  upper: Bound,
  opts: { fracMid?: boolean } = {},
): Chain {
  const lowerFirst = rng() < 0.5;
  const [b1, b2] = lowerFirst ? [lower, upper] : [upper, lower];
  const rel1: Rel = b1.closed ? "le" : "<";
  const rel2: Rel = b2.closed ? "le" : "<";
  const t1 = b1.at;
  const t2 = b2.at;
  // 왼쪽 부분: d·A rel1 u·x+w → (d·Aa − u)x rel1 w − d·Ab (아래쪽이면 m1<0).
  // 오른쪽 부분: u·x+w rel2 d·C → (u − d·Ca)x rel2 d·Cb − w (위쪽이면 m2>0).
  // 되는 조합을 **다 늘어놓고** 하나를 고른다 — 무작위로 찔러 보면 분모가 있을 때 거의 안 맞는다
  // (실측: 끝점 쌍에 따라 300번 안에 못 찾는 판이 40판 중 29판).
  const s1 = lowerFirst ? -1 : 1;
  const chainCands = (d: number): [number, number, number, number][] => {
    const out: [number, number, number, number][] = [];
    for (let u = -4; u <= 4; u += 1) {
      if (u === 0) continue;
      for (let k1 = 1; k1 <= 8; k1 += 1) {
        const m1 = s1 * k1;
        if ((m1 + u) % d !== 0 || (m1 * t1.n) % t1.d !== 0) continue;
        for (let k2 = 1; k2 <= 8; k2 += 1) {
          const m2 = -s1 * k2;
          if ((u - m2) % d !== 0 || (m2 * t2.n) % t2.d !== 0) continue;
          if (Math.abs((m1 + u) / d) > 5 || Math.abs((u - m2) / d) > 5)
            continue;
          const c1 = (m1 * t1.n) / t1.d;
          const c2 = (m2 * t2.n) / t2.d;
          for (let w = -9; w <= 9; w += 1) {
            if (w === 0 || (w - c1) % d !== 0 || (c2 + w) % d !== 0) continue;
            if (Math.abs((w - c1) / d) > 14 || Math.abs((c2 + w) / d) > 14)
              continue;
            // 한 변이 통째로 0 이 되는 조합(A=0 또는 C=0)은 뺀다
            if ((m1 + u === 0 && w === c1) || (u === m2 && w === -c2)) continue;
            // 약분되는 분수(`\dfrac{2x+4}{2}`) · 양 끝이 둘 다 상수인 사슬(`2\le …\le 2`)은 뺀다
            if (d > 1 && gcd(gcd(u, w), d) !== 1) continue;
            if (m1 + u === 0 && u === m2) continue;
            // 양 끝이 같은 식(`3x+1\le …\le 3x+1`) · 분자가 통째로 음수(`\dfrac{-3x-3}{4}`)도 뺀다
            if (m1 === -m2 && c1 === -c2) continue;
            if (d > 1 && u < 0 && w < 0) continue;
            out.push([u, m1, m2, w]);
          }
        }
      }
    }
    return out;
  };
  // 분모는 섞은 순서로 하나씩 — 그 끝점에서 되는 분모가 나올 때까지
  let d = 1;
  let cands: [number, number, number, number][] = [];
  for (const dd of opts.fracMid ? distinctInts(rng, 2, 5, 4) : [1]) {
    cands = chainCands(dd);
    if (cands.length > 0) {
      d = dd;
      break;
    }
  }
  if (cands.length === 0) throw new Retry("이 끝점으로는 A<B<C 꼴을 못 짓는다");
  const [u, m1, m2, w] = pickOne(rng, cands);
  const c1 = (m1 * t1.n) / t1.d;
  const c2 = (m2 * t2.n) / t2.d;
  const Aa = (m1 + u) / d;
  const Ca = (u - m2) / d;
  const Ab = (w - c1) / d;
  const Cb = (c2 + w) / d;
  return attempt<Chain>((): Chain | null => {
    const A = d === 1 ? randomSide(rng, Aa, Ab) : plainSide(Aa, Ab);
    const C = d === 1 ? randomSide(rng, Ca, Cb) : plainSide(Ca, Cb);
    if (A.tex === "0" || C.tex === "0")
      throw new Error("A<B<C 의 한 변이 0 이다");
    const Bt =
      d === 1
        ? rng() < 0.5
          ? linX(u, w)
          : polyTex([w, u])
        : `\\dfrac{${linX(u, w)}}{${d}}`;
    const relX1 = m1 > 0 ? rel1 : flipRel(rel1);
    const relX2 = m2 > 0 ? rel2 : flipRel(rel2);
    const dPre = (s: Side) =>
      d === 1 ? s.tex : `${d}(${polyTex([s.b, s.a])})`;
    const left: Lin = {
      tex: `${A.tex}${relTex(rel1)}${Bt}`,
      m: m1,
      c: c1,
      rel: rel1,
      sol: rayIv(relX1, t1),
      ...(d === 1
        ? {}
        : { clear: { by: d, tex: `${dPre(A)}${relTex(rel1)}${linX(u, w)}` } }),
    };
    const right: Lin = {
      tex: `${Bt}${relTex(rel2)}${C.tex}`,
      m: m2,
      c: c2,
      rel: rel2,
      sol: rayIv(relX2, t2),
      ...(d === 1
        ? {}
        : { clear: { by: d, tex: `${linX(u, w)}${relTex(rel2)}${dPre(C)}` } }),
    };
    return {
      tex: `${A.tex}${relTex(rel1)}${Bt}${relTex(rel2)}${C.tex}`,
      left,
      right,
      mid: Bt,
    };
  });
}

// ───────────────────────────── 01 ─────────────────────────────
// 연립일차부등식의 풀이
// 꼴 0 (기본·대표): 정수 계수 두 부등식, 한쪽으로 열린 해 — 가장 큰(작은) 정수
// 꼴 1 (응용): 해가 a≤x<b 꼴일 때 b−a · a+b · ab
// 꼴 2 (응용): 분수·소수 계수 — 정수인 해의 개수 · 합

function t01(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const up = rng() < 0.5;
      const [t1, t2] = distinctInts(rng, -6, 6, 2) as [number, number];
      const rels = up ? UPPER : LOWER;
      const l1 = makeLin(rng, q(t1), pickOne(rng, rels));
      const l2 = makeLin(rng, q(t2), pickOne(rng, rels));
      const sol = ivMeet(l1.sol, l2.sol)!;
      const ans = up ? maxInt(sol) : minInt(sol);
      const sys = casesTex([l1.tex, l2.tex]);
      const word = up ? "가장 큰" : "가장 작은";
      return {
        content: `연립부등식 $${sys}$${eul(sys)} 만족시키는 ${word} 정수 $x$의 값을 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          linStep(l1),
          linStep(l2),
          `따라서 주어진 연립부등식의 해는 $${ivTex(sol)}$이므로 ${word} 정수 $x$는 $${ans}$이다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: {
          mode,
          ...linFacts(1, l1),
          ...linFacts(2, l2),
          ask: up ? 0 : 1,
        },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const [lo, hi] = (distinctInts(rng, -7, 8, 2) as [number, number]).sort(
        (a, b) => a - b,
      );
      if (hi - lo < 2) return null;
      const pair = [
        makeLin(rng, q(lo), pickOne(rng, LOWER)),
        makeLin(rng, q(hi), pickOne(rng, UPPER)),
      ];
      if (rng() < 0.5) pair.reverse();
      const [l1, l2] = pair as [Lin, Lin];
      const sol = ivMeet(l1.sol, l2.sol)!;
      const [exprId, [et, ev]] = chooseExpr(rng, [
        ["b-a", hi - lo],
        ["a+b", lo + hi],
        ["ab", lo * hi],
      ]);
      const sys = casesTex([l1.tex, l2.tex]);
      return {
        content: `연립부등식 $${sys}$의 해가 $${ivLetters(sol)}$일 때, $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          linStep(l1),
          linStep(l2),
          `따라서 주어진 연립부등식의 해는 $${ivTex(sol)}$이므로 $a=${lo}$, $b=${hi}$`,
          `즉 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, ...linFacts(1, l1), ...linFacts(2, l2), exprId },
      };
    });
  return attempt<Body>((): Body | null => {
    const den = pickOne(rng, [1, 1, 2, 3]);
    const loN = randInt(rng, -8 * den, 4 * den);
    const hiN = loN + randInt(rng, 2 * den, 7 * den);
    const lo = q(loN, den);
    const hi = q(hiN, den);
    const makers = [makeFracLin, makeDecLin];
    const f1 = pickOne(rng, makers);
    const f2 = pickOne(rng, [makeFracLin, makeDecLin, makeLin]);
    const pair = [
      f1(rng, lo, pickOne(rng, LOWER)),
      f2(rng, hi, pickOne(rng, UPPER)),
    ];
    if (rng() < 0.5) pair.reverse();
    const [l1, l2] = pair as [Lin, Lin];
    const sol = ivMeet(l1.sol, l2.sol);
    if (!sol) return null;
    const ints = intsIn(sol);
    if (ints.length < 2) return null;
    const kind = randInt(rng, 0, 1);
    const sum = ints.reduce((s, n) => s + n, 0);
    const ans = kind === 0 ? ints.length : sum;
    const sys = casesTex([l1.tex, l2.tex]);
    return {
      content: `연립부등식 $${sys}$${eul(sys)} 만족시키는 정수 $x$의 ${kind === 0 ? "개수를" : "값의 합을"} 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        linStep(l1),
        linStep(l2),
        `따라서 주어진 연립부등식의 해는 $${ivTex(sol)}$이므로 정수 $x$는 ${intsText(ints)}`,
        kind === 0
          ? `즉 정수 $x$의 개수는 $${ans}$이다.`
          : `즉 정수 $x$의 값의 합은 $${ans}$이다.`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, ...linFacts(1, l1), ...linFacts(2, l2), kind },
    };
  });
}

// ───────────────────────────── 02 ─────────────────────────────
// A<B<C의 꼴의 부등식
// 꼴 0 (기본·대표): 정수 계수 — 정수인 해의 합 · 개수
// 꼴 1 (응용): 가운데가 분수 — 해가 a<x≤b 꼴일 때 a+b · b−a
// 꼴 2 (심화하): 해를 만족시키는 x 로 y=px+q 의 값의 범위 — 답이 구간(오답 넷)

function chainSolution(ch: Chain): Iv {
  return ivMeet(ch.left.sol, ch.right.sol)!;
}

function t02(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const [lo, hi] = (distinctInts(rng, -8, 9, 2) as [number, number]).sort(
        (a, b) => a - b,
      );
      if (hi - lo < 2) return null;
      const ch = makeChain(
        rng,
        { at: q(lo), closed: rng() < 0.5 },
        { at: q(hi), closed: rng() < 0.5 },
        { fracMid: true },
      );
      const sol = chainSolution(ch);
      const [exprId, [et, ev]] = chooseExpr(rng, [
        ["a+b", lo + hi],
        ["b-a", hi - lo],
      ]);
      return {
        content: `부등식 $${ch.tex}$의 해가 $${ivLetters(sol)}$일 때, $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          chainAsSystem(ch),
          linStep(ch.left),
          linStep(ch.right),
          `따라서 해는 $${ivTex(sol)}$이므로 $a=${lo}$, $b=${hi}$`,
          `즉 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: {
          mode,
          ...linFacts(1, ch.left),
          ...linFacts(2, ch.right),
          exprId,
        },
      };
    });
  return attempt<Body>((): Body | null => {
    const [lo, hi] = (distinctInts(rng, -6, 7, 2) as [number, number]).sort(
      (a, b) => a - b,
    );
    if (hi - lo < 2 || hi - lo > 7) return null;
    const ch = makeChain(
      rng,
      { at: q(lo), closed: rng() < 0.5 },
      { at: q(hi), closed: rng() < 0.5 },
    );
    const sol = chainSolution(ch);
    const ints = intsIn(sol);
    if (ints.length < 2) return null;
    const head = [chainAsSystem(ch), linStep(ch.left), linStep(ch.right)];
    if (mode === 0) {
      const kind = randInt(rng, 0, 1);
      const sum = ints.reduce((s, n) => s + n, 0);
      const ans = kind === 0 ? sum : ints.length;
      return {
        content: `부등식 $${ch.tex}$${eul(ch.tex)} 만족시키는 모든 정수 $x$의 ${kind === 0 ? "값의 합을" : "개수를"} 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          ...head,
          `따라서 해는 $${ivTex(sol)}$이므로 정수 $x$는 ${intsText(ints)}`,
          kind === 0
            ? `즉 모든 정수 $x$의 값의 합은 $${ans}$이다.`
            : `즉 정수 $x$의 개수는 $${ans}$이다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: {
          mode,
          ...linFacts(1, ch.left),
          ...linFacts(2, ch.right),
          kind,
        },
      };
    }
    const p = pickOne(rng, [-3, -2, -1, 2, 3]);
    const k = nz(rng, -6, 6);
    const map = (b: Bound): Bound => ({
      at: q(p * b.at.n + k * b.at.d, b.at.d),
      closed: b.closed,
    });
    const lo2 = sol.lo!;
    const hi2 = sol.hi!;
    const yIv: Iv =
      p > 0 ? { lo: map(lo2), hi: map(hi2) } : { lo: map(hi2), hi: map(lo2) };
    const yTex = ivTex(yIv, "y");
    const alt = (a: Bound, b: Bound): string => ivTex({ lo: a, hi: b }, "y");
    const flip = (b: Bound): Bound => ({ at: b.at, closed: !b.closed });
    const noK = (b: Bound): Bound => ({
      at: q(p * b.at.n, b.at.d),
      closed: b.closed,
    });
    const negK = (b: Bound): Bound => ({
      at: q(p * b.at.n - k * b.at.d, b.at.d),
      closed: b.closed,
    });
    const [yl, yh] = [yIv.lo!, yIv.hi!];
    const cands = [
      alt(flip(yl), flip(yh)),
      alt(yl, flip(yh)),
      alt(flip(yl), yh),
      p > 0 ? alt(noK(lo2), noK(hi2)) : alt(noK(hi2), noK(lo2)),
      p > 0 ? alt(negK(lo2), negK(hi2)) : alt(negK(hi2), negK(lo2)),
    ];
    const distractors = pickDistractors(rng, yTex, cands);
    if (distractors === null) return null;
    const yExpr = linX(p, k);
    const pIv: Iv =
      p > 0 ? { lo: noK(lo2), hi: noK(hi2) } : { lo: noK(hi2), hi: noK(lo2) };
    const px = `${coefPrefix(p)}x`;
    const turn = p > 0 ? "" : " (음수를 곱하면 부등호의 방향이 바뀐다)";
    return {
      content: `부등식 $${ch.tex}$${eul(ch.tex)} 만족시키는 $x$에 대하여 $y=${yExpr}$일 때, $y$의 값의 범위를 구하시오.`,
      answer: $(yTex),
      solution: [
        ...head,
        `따라서 주어진 부등식의 해는 $${ivTex(sol)}$`,
        `각 변에 $${p}$${eul(String(p))} 곱하면 $${ivTex(pIv, px)}$${turn}`,
        `각 변에 $${k}$${eul(String(k))} 더하면 $${yTex}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, ...linFacts(1, ch.left), ...linFacts(2, ch.right), p, k },
      distractors,
    };
  });
}

/** 해설 첫 줄 — 「주어진 부등식은 연립부등식 {…}와 같다.」 */
function chainAsSystem(ch: Chain): string {
  const sys = casesTex([ch.left.tex, ch.right.tex]);
  return `주어진 부등식은 연립부등식 $${sys}$${gwa(sys)} 같다.`;
}

// ───────────────────────────── 03 ─────────────────────────────
// 특수한 해를 갖는 연립일차부등식
// 꼴 0 (기본·대표): 두 부등식의 해가 한 점에서만 만난다 — 해 x=t (오답 넷)
// 꼴 1 (응용): A≤B≤C 의 꼴, 가운데가 분수 — 해 x=t (오답 넷)

function pointDistractors(rng: Rng, t: number): string[] | null {
  const cands = [
    ivTex(rayIv("ge", q(t))),
    ivTex(rayIv("le", q(t))),
    `x=${t + 1}`,
    `x=${t - 1}`,
  ];
  if (t !== 0) cands.push(`x=${-t}`);
  return pickDistractors(rng, `x=${t}`, cands);
}

function t03(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  return attempt<Body>((): Body | null => {
    const t = nz(rng, -6, 6);
    const distractors = pointDistractors(rng, t);
    if (distractors === null) return null;
    const ans = `x=${t}`;
    if (mode === 0) {
      const pair = [makeLin(rng, q(t), "ge"), makeLin(rng, q(t), "le")];
      if (rng() < 0.5) pair.reverse();
      const [l1, l2] = pair as [Lin, Lin];
      const sys = casesTex([l1.tex, l2.tex]);
      return {
        content: `연립부등식 $${sys}$${eul(sys)} 푸시오.`,
        answer: $(ans),
        solution: [
          linStep(l1),
          linStep(l2),
          `두 부등식의 해의 공통부분은 한 점뿐이므로 주어진 연립부등식의 해는 $${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, ...linFacts(1, l1), ...linFacts(2, l2), t },
        distractors,
      };
    }
    const ch = makeChain(
      rng,
      { at: q(t), closed: true },
      { at: q(t), closed: true },
      { fracMid: true },
    );
    return {
      content: `부등식 $${ch.tex}$${eul(ch.tex)} 푸시오.`,
      answer: $(ans),
      solution: [
        chainAsSystem(ch),
        linStep(ch.left),
        linStep(ch.right),
        `두 부등식의 해의 공통부분은 한 점뿐이므로 주어진 부등식의 해는 $${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, ...linFacts(1, ch.left), ...linFacts(2, ch.right), t },
      distractors,
    };
  });
}

// ═════════════════════════ 문자 상수가 붙은 부등식 ═════════════════════════

/**
 * `(c·s+k)/m` 의 지면 — 분모는 양수로 돌리고 약분한다. 분모가 1 이면 분수를 안 쓴다.
 * `\dfrac{a-2}{3}` · `3-a` · `-\dfrac{a+1}{2}`.
 */
function affTex(c: number, s: string, k: number, m: number): string {
  if (m < 0) return affTex(-c, s, -k, -m);
  const g = gcd(gcd(c, k), m);
  const [C, K, M] = [c / g, k / g, m / g];
  if (M === 1)
    return C < 0 && K > 0 ? `${K}${term(C, s)}` : linTex([[C, s]], K);
  if (C < 0 && K <= 0) return `-\\dfrac{${linTex([[-C, s]], -K)}}{${M}}`;
  const num = C < 0 ? `${K}${term(C, s)}` : linTex([[C, s]], K);
  return `\\dfrac{${num}}{${M}}`;
}

/** `αx±s` — 문자 상수가 붙은 한 변(`2x+a` · `b-x` · `-a`). */
function withParam(alpha: number, sigma: 1 | -1, s: string): string {
  if (alpha === 0) return sigma > 0 ? s : `-${s}`;
  if (alpha < 0 && sigma > 0) return `${s}${term(alpha, "x")}`;
  return `${polyTex([0, alpha])}${sigma > 0 ? "+" : "-"}${s}`;
}

/** 해설 한 줄 — 「$5x-a>2x-2$에서 $3x>a-2$이므로 $x>\dfrac{a-2}{3}$」. */
function paramStep(
  tex: string,
  m: number,
  rel: Rel,
  rhs: string,
  relX: Rel,
  bound: string,
): string {
  const mid =
    m === 1 ? "" : `$${term(m, "x", true)}${relTex(rel)}${rhs}$이므로 `;
  return `$${tex}$에서 ${mid}$x${relTex(relX)}${bound}$`;
}

/** 등호 포함 여부만 바꾼다 — `<`↔`≤`, `>`↔`≥`. */
function toggleRel(r: Rel): Rel {
  if (r === "<") return "le";
  if (r === "le") return "<";
  return r === ">" ? "ge" : ">";
}

/**
 * 답이 `k rel K` 인 꼴의 오답 — 등호 포함 여부 · 부등호 방향 · 둘 다 · 끝점 부호 · 끝점 하나 어긋남.
 */
function rayDistractors(rng: Rng, rel: Rel, K: Q, v: string): string[] | null {
  const tex = (r: Rel, t: Q) => ivTex(rayIv(r, t), v);
  const cands = [
    tex(toggleRel(rel), K),
    tex(flipRel(rel), K),
    tex(flipRel(toggleRel(rel)), K),
    tex(rel, q(K.n + K.d, K.d)),
    tex(rel, q(K.n - K.d, K.d)),
  ];
  if (K.n !== 0) cands.splice(3, 0, tex(rel, q(-K.n, K.d)));
  return pickDistractors(rng, tex(rel, K), cands);
}

// ───────────────────────────── 04 ─────────────────────────────
// 연립일차부등식의 해가 주어진 경우
// 꼴 0 (기본·대표): 한 부등식에 미정계수 a, 해가 lo<x≤b — a+b · a−b · ab
// 꼴 1 (응용): A≤B≤C 의 양 끝에 a, b — 해가 수로 주어짐
// 꼴 2 (응용): 두 부등식에 a, b — 해가 x=t 한 점

function t04(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const [lo, hi] = (distinctInts(rng, -6, 7, 2) as [number, number]).sort(
        (x, y) => x - y,
      );
      if (hi - lo < 2) return null;
      const loC = rng() < 0.5;
      const hiC = rng() < 0.5;
      const k = pickOne(rng, [-2, -1, 1, 2, 3]);
      const m1 = randInt(rng, 1, 4);
      const p = k + m1;
      const w = nz(rng, -5, 5);
      const a = m1 * lo - k * w;
      if (p === 0 || a === 0) return null;
      const R = randomSide(rng, k, k * w);
      const rel1 = lowerRel(loC);
      // px−a rel1 kx+kw ⇔ m1·x rel1 a+kw ⇔ x rel1 (a+kw)/m1
      const l1: Lin = {
        tex: `${withParam(p, -1, "a")}${relTex(rel1)}${R.tex}`,
        m: m1,
        c: m1 * lo,
        rel: rel1,
        sol: rayIv(rel1, q(lo)),
      };
      const l2 = makeLin(rng, q(hi), upperRel(hiC));
      const [exprId, [et, ev]] = chooseExpr(rng, [
        ["a+b", a + hi],
        ["a-b", a - hi],
        ["ab", a * hi],
      ]);
      const sys = casesTex(rng() < 0.5 ? [l1.tex, l2.tex] : [l2.tex, l1.tex]);
      const bt = affTex(1, "a", k * w, m1);
      const given = `${lo}${loC ? "\\le " : "<"}x${hiC ? "\\le " : "<"}b`;
      return {
        content: `연립부등식 $${sys}$의 해가 $${given}$일 때, 상수 $a$, $b$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          paramStep(l1.tex, m1, rel1, affTex(1, "a", k * w, 1), rel1, bt),
          linStep(l2),
          `주어진 연립부등식의 해가 $${given}$이므로 $${bt}=${lo}$, $b=${hi}$`,
          `따라서 $a=${a}$, $b=${hi}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: {
          mode,
          ...linFacts(1, l1),
          ...linFacts(2, l2),
          a,
          b: hi,
          exprId,
        },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const [lo, hi] = (distinctInts(rng, -6, 8, 2) as [number, number]).sort(
        (x, y) => x - y,
      );
      if (hi - lo < 2) return null;
      const loC = rng() < 0.5;
      const hiC = rng() < 0.5;
      const lowerFirst = rng() < 0.5;
      const t1 = lowerFirst ? lo : hi;
      const t2 = lowerFirst ? hi : lo;
      const rel1: Rel = (lowerFirst ? loC : hiC) ? "le" : "<";
      const rel2: Rel = (lowerFirst ? hiC : loC) ? "le" : "<";
      const beta = nz(rng, -3, 4);
      const b0 = randInt(rng, -8, 8);
      const alpha = randInt(rng, -3, 3);
      const gamma = randInt(rng, -3, 3);
      const m1 = alpha - beta;
      const m2 = beta - gamma;
      if (m1 === 0 || m2 === 0) return null;
      if (lowerFirst ? m1 > 0 || m2 < 0 : m1 < 0 || m2 > 0) return null;
      // A rel1 B: m1·x rel1 b0−a · B rel2 C: m2·x rel2 b−b0
      const a = b0 - m1 * t1;
      const b = b0 + m2 * t2;
      if (a === 0 || b === 0 || Math.abs(a) > 25 || Math.abs(b) > 25)
        return null;
      const A = withParam(alpha, 1, "a");
      const B = linX(beta, b0);
      const C = withParam(gamma, 1, "b");
      const relX1 = m1 > 0 ? rel1 : flipRel(rel1);
      const relX2 = m2 > 0 ? rel2 : flipRel(rel2);
      const left: Lin = {
        tex: `${A}${relTex(rel1)}${B}`,
        m: m1,
        c: m1 * t1,
        rel: rel1,
        sol: rayIv(relX1, q(t1)),
      };
      const right: Lin = {
        tex: `${B}${relTex(rel2)}${C}`,
        m: m2,
        c: m2 * t2,
        rel: rel2,
        sol: rayIv(relX2, q(t2)),
      };
      const sol = ivMeet(left.sol, right.sol)!;
      const [exprId, [et, ev]] = chooseExpr(rng, [
        ["a-b", a - b],
        ["a+b", a + b],
        ["ab", a * b],
      ]);
      const bt1 = affTex(-1, "a", b0, m1);
      const bt2 = affTex(1, "b", -b0, m2);
      const sys = casesTex([left.tex, right.tex]);
      return {
        content: `부등식 $${A}${relTex(rel1)}${B}${relTex(rel2)}${C}$의 해가 $${ivTex(sol)}$일 때, 상수 $a$, $b$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `주어진 부등식은 연립부등식 $${sys}$${gwa(sys)} 같다.`,
          paramStep(left.tex, m1, rel1, affTex(-1, "a", b0, 1), relX1, bt1),
          paramStep(right.tex, m2, rel2, affTex(1, "b", -b0, 1), relX2, bt2),
          `주어진 부등식의 해가 $${ivTex(sol)}$이므로 $${bt1}=${t1}$, $${bt2}=${t2}$`,
          `따라서 $a=${a}$, $b=${b}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: {
          mode,
          ...linFacts(1, left),
          ...linFacts(2, right),
          a,
          b,
          exprId,
        },
      };
    });
  return attempt<Body>((): Body | null => {
    const t = nz(rng, -5, 6);
    // p1x+w1 rel1 k1x+a ⇔ m1·x rel1 a−w1 — 위로 닫힌 해 x≤t
    const p1 = nz(rng, -3, 4);
    const k1 = randInt(rng, -3, 3);
    const w1 = nz(rng, -9, 9);
    const m1 = p1 - k1;
    // k2x+b rel2 p2x+w2 ⇔ m2·x rel2 w2−b — 아래로 닫힌 해 x≥t
    const p2 = nz(rng, -3, 4);
    const k2 = randInt(rng, -3, 3);
    const w2 = nz(rng, -9, 9);
    const m2 = k2 - p2;
    if (m1 === 0 || m2 === 0) return null;
    const rel1: Rel = m1 > 0 ? "le" : "ge";
    const rel2: Rel = m2 > 0 ? "ge" : "le";
    const a = m1 * t + w1;
    const b = w2 - m2 * t;
    if (a === 0 || b === 0 || Math.abs(a) > 30 || Math.abs(b) > 30) return null;
    const l1: Lin = {
      tex: `${polyTex([w1, p1])}${relTex(rel1)}${withParam(k1, 1, "a")}`,
      m: m1,
      c: m1 * t,
      rel: rel1,
      sol: rayIv("le", q(t)),
    };
    const l2: Lin = {
      tex: `${withParam(k2, 1, "b")}${relTex(rel2)}${polyTex([w2, p2])}`,
      m: m2,
      c: m2 * t,
      rel: rel2,
      sol: rayIv("ge", q(t)),
    };
    const [exprId, [et, ev]] = chooseExpr(rng, [
      ["a+b", a + b],
      ["ab", a * b],
      ["a-b", a - b],
    ]);
    const bt1 = affTex(1, "a", -w1, m1);
    const bt2 = affTex(-1, "b", w2, m2);
    const sys = casesTex(rng() < 0.5 ? [l1.tex, l2.tex] : [l2.tex, l1.tex]);
    return {
      content: `연립부등식 $${sys}$의 해가 $x=${t}$일 때, 상수 $a$, $b$에 대하여 $${et}$의 값을 구하시오.`,
      answer: numAnswer(ev),
      solution: [
        paramStep(l1.tex, m1, rel1, affTex(1, "a", -w1, 1), "le", bt1),
        paramStep(l2.tex, m2, rel2, affTex(-1, "b", w2, 1), "ge", bt2),
        `주어진 연립부등식의 해가 $x=${t}$이므로 $${bt1}=${t}$, $${bt2}=${t}$`,
        `따라서 $a=${a}$, $b=${b}$이므로 $${et}=${ev}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, ...linFacts(1, l1), ...linFacts(2, l2), a, b, t, exprId },
    };
  });
}

// ───────────────────────────── 05 ─────────────────────────────
// 연립일차부등식이 해를 갖거나 갖지 않는 경우
// 꼴 0 (기본·대표): 한 부등식에 a — 해를 갖도록 하는 정수 a 의 최댓값·최솟값
// 꼴 1 (응용): 한 부등식에 k — 해가 없을 때 k 의 값의 범위 (답이 구간, 오답 넷)
// 꼴 2 (응용): A<B<C 의 한 끝에 a — 해를 갖도록 하는 a 의 값의 범위 (답이 구간, 오답 넷)

function t05(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const u = nz(rng, -3, 3);
      const w = nz(rng, -8, 8);
      const d = pickOne(rng, [1, 2, 3]);
      if (d > 1 && gcd(gcd(u, w), d) !== 1) return null;
      const closed1 = rng() < 0.5;
      const relX1 = lowerRel(closed1);
      const rho = u > 0 ? relX1 : flipRel(relX1);
      const t2 = randInt(rng, -5, 6);
      const closed2 = rng() < 0.5;
      const l2 = makeLin(rng, q(t2), upperRel(closed2));
      const both = closed1 && closed2;
      // (ux+w)/d ρ a ⇔ ux ρ da−w ⇔ x relX1 (da−w)/u. 해가 있으려면 (da−w)/u < t2 (둘 다 닫히면 ≤)
      const T = q(u * t2 + w, d);
      const up = u > 0;
      const ans = up
        ? both || !qIsInt(T)
          ? qFloor(T)
          : T.n - 1
        : both || !qIsInt(T)
          ? qCeil(T)
          : T.n + 1;
      const aRel: Rel = up ? (both ? "le" : "<") : both ? "ge" : ">";
      const num = linX(u, w);
      const tex1 = `${d === 1 ? num : `\\dfrac{${num}}{${d}}`}${relTex(rho)}a`;
      const sys = casesTex(rng() < 0.5 ? [tex1, l2.tex] : [l2.tex, tex1]);
      const bt = affTex(d, "a", -w, u);
      const word = up ? "최댓값" : "최솟값";
      return {
        content: `연립부등식 $${sys}$${ga(sys)} 해를 갖도록 하는 정수 $a$의 ${word}을 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          paramStep(tex1, u, rho, affTex(d, "a", -w, 1), relX1, bt),
          linStep(l2),
          `주어진 연립부등식이 해를 가지려면 $${bt}${both ? "\\le " : "<"}${t2}$이어야 하므로 $a${relTex(aRel)}${qTex(T)}$`,
          `따라서 정수 $a$의 ${word}은 $${ans}$이다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: {
          mode,
          u,
          w,
          d,
          r1: REL_CODE[rho],
          ...linFacts(2, l2),
          ask: up ? 0 : 1,
        },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const t1 = randInt(rng, -5, 5);
      const closed1 = rng() < 0.5;
      const l1 = makeLin(rng, q(t1), lowerRel(closed1));
      const p = nz(rng, -3, 4);
      const w0 = nz(rng, -9, 9);
      const r = randInt(rng, -3, 4);
      const m2 = p - r;
      if (m2 === 0) return null;
      const s = pickOne(rng, [-4, -3, -2, -1, 1, 2, 3, 4]);
      const closed2 = rng() < 0.5;
      const relX2 = upperRel(closed2);
      const rel2 = m2 > 0 ? relX2 : flipRel(relX2);
      const Qt =
        Math.abs(r) >= 2 && (s === r || s === -r)
          ? `${coefPrefix(r)}(x${s === r ? "+" : "-"}k)`
          : r === 0
            ? term(s, "k", true)
            : `${polyTex([0, r])}${term(s, "k")}`;
      // px+w0 rel2 rx+sk ⇔ m2·x rel2 sk−w0 ⇔ x relX2 (sk−w0)/m2
      const tex2 = `${polyTex([w0, p])}${relTex(rel2)}${Qt}`;
      const both = closed1 && closed2;
      // 해가 없으려면 (sk−w0)/m2 < t1 (둘 다 닫히면) · ≤ t1 (아니면)
      const K = q(m2 * t1 + w0, s);
      const base: Rel = both ? "<" : "le";
      const relK = s * m2 > 0 ? base : flipRel(base);
      const ans = ivTex(rayIv(relK, K), "k");
      const distractors = rayDistractors(rng, relK, K, "k");
      if (distractors === null) return null;
      const bt = affTex(s, "k", -w0, m2);
      const sys = casesTex(rng() < 0.5 ? [l1.tex, tex2] : [tex2, l1.tex]);
      return {
        content: `연립부등식 $${sys}$의 해가 없을 때, 실수 $k$의 값의 범위를 구하시오.`,
        answer: $(ans),
        solution: [
          linStep(l1),
          paramStep(tex2, m2, rel2, affTex(s, "k", -w0, 1), relX2, bt),
          `주어진 연립부등식의 해가 없으려면 $${bt}${both ? "<" : "\\le "}${t1}$`,
          `따라서 $${ans}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, ...linFacts(1, l1), m2, s, w0, r2: REL_CODE[rel2] },
        distractors,
      };
    });
  return attempt<Body>((): Body | null => {
    // caseA: 왼쪽(A<B)이 위로 막힌 해, 오른쪽(B<C)이 아래로 — caseB 는 반대
    const caseA = rng() < 0.5;
    const t2 = randInt(rng, -5, 6);
    const closed1 = rng() < 0.5;
    const closed2 = rng() < 0.5;
    const rel1: Rel = closed1 ? "le" : "<";
    const rel2: Rel = closed2 ? "le" : "<";
    const beta = nz(rng, -3, 4);
    const b0 = randInt(rng, -8, 8);
    const alpha = randInt(rng, -3, 4);
    const sigma = pickOne(rng, [1, -1] as const);
    const m1 = alpha - beta;
    if (m1 === 0 || (caseA ? m1 < 0 : m1 > 0)) return null;
    const m2 = caseA ? -randInt(rng, 1, 4) : randInt(rng, 1, 4);
    const C = randomSide(rng, beta - m2, b0 + m2 * t2);
    if (C.tex === "0") return null;
    const A = withParam(alpha, sigma, "a");
    const B = linX(beta, b0);
    const relX1 = m1 > 0 ? rel1 : flipRel(rel1);
    const relX2 = m2 > 0 ? rel2 : flipRel(rel2);
    const right: Lin = {
      tex: `${B}${relTex(rel2)}${C.tex}`,
      m: m2,
      c: m2 * t2,
      rel: rel2,
      sol: rayIv(relX2, q(t2)),
    };
    const leftTex = `${A}${relTex(rel1)}${B}`;
    // 왼쪽: m1·x rel1 b0−σa → 끝점 (b0−σa)/m1. 두 경우 모두 해가 있으려면 σa < b0−m1·t2 (둘 다 닫히면 ≤)
    const both = closed1 && closed2;
    const T = q(b0 - m1 * t2, sigma);
    const base: Rel = both ? "le" : "<";
    const relA = sigma > 0 ? base : flipRel(base);
    const ans = ivTex(rayIv(relA, T), "a");
    const distractors = rayDistractors(rng, relA, T, "a");
    if (distractors === null) return null;
    const bt1 = affTex(-sigma, "a", b0, m1);
    const need = caseA
      ? `${bt1}${both ? "\\ge " : ">"}${t2}`
      : `${bt1}${both ? "\\le " : "<"}${t2}`;
    const chain = `${leftTex}${relTex(rel2)}${C.tex}`;
    const sys = casesTex([leftTex, right.tex]);
    return {
      content: `부등식 $${chain}$${ga(chain)} 해를 갖도록 하는 실수 $a$의 값의 범위를 구하시오.`,
      answer: $(ans),
      solution: [
        `주어진 부등식은 연립부등식 $${sys}$${gwa(sys)} 같다.`,
        paramStep(leftTex, m1, rel1, affTex(-sigma, "a", b0, 1), relX1, bt1),
        linStep(right),
        `주어진 부등식이 해를 가지려면 $${need}$이어야 하므로`,
        `$${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: {
        mode,
        m1,
        b0,
        sigma,
        r1: REL_CODE[rel1],
        ...linFacts(2, right),
      },
      distractors,
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

/** 번호·제목은 `scripts/rpm/rpm-high-type-catalog.json` 의 **바이트 그대로**다(시험이 대조한다). */
export const H1_LIN_INEQ: HighTypeEntry[] = [
  entry("01", "연립일차부등식의 풀이", SEC.연립1, t01),
  entry("02", "A<B<C의 꼴의 부등식", SEC.연립1, t02),
  entry("03", "특수한 해를 갖는 연립일차부등식", SEC.연립1, t03),
  entry("04", "연립일차부등식의 해가 주어진 경우", SEC.연립2, t04),
  entry("05", "연립일차부등식이 해를 갖거나 갖지 않는 경우", SEC.연립2, t05),
];

const WIP = "작업 중 — h1-ineq 세션이 이어서 만든다(2026-09-13)";

export const H1_LIN_INEQ_HOLD: HighHold[] = [
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
].map((n) => ({ key: `${BOOK}|${MINOR}|${n}`, reason: WIP }));
