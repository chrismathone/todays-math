/**
 * 공통수학1 「여러 가지 방정식」 — RPM 공통수학1(2022) 색인 18유형. **물결 1 세션 `h1-equation` 소유.**
 *
 * 브리프 `docs/planning/tracks/high-wave1-brief.md` · 본보기 `h1Identity.ts` 를 그대로 따른다:
 * 답을 먼저 정하고 식을 짓는다(근을 먼저 뽑고 방정식을 전개한다) · 꼴(mode)마다 칸을 적는다
 * (대표문제 꼴은 `기본`) · 수식 뒤 조사는 `josa.ts` 로만 · 수 정답은 `numAnswer`, 분수는 `qAnswer`,
 * 근호·복소수 정답은 오답 넷(`distractors`)을 이 파일이 낸다.
 *
 * ## 교육과정 범위 — [10공수1-02-07·08]
 *
 * 삼·사차방정식은 **인수분해 공식·인수정리·조립제법으로 풀리는 것**만(근을 먼저 정수·이차식으로
 * 정하므로 늘 그렇다). 연립이차방정식은 **일차+이차**, 또는 **한 이차식이 인수분해되는** 것, 또는
 * 대칭식(합·곱 치환)까지. 삼원 연립은 내지 않는다.
 *
 * ## 연립방정식 조사
 *
 * `\begin{cases}…\end{cases}` 뒤에 을/를·이/가를 붙이면 `josa.ts` 가 `cases` 의 `s` 를 읽는다
 * (「…=1을」로 읽어야 할 자리에 「를」). 그래서 연립방정식 뒤에는 «의»만 붙이게 발문을 짰다.
 *
 * ## 우리 단원(시드 `prisma/seed-data/units.ts` 공통수학1 「2. 방정식과 부등식」)
 *
 *   01·04·09 → 삼차방정식과 사차방정식(1) · 02·03 → 삼차방정식과 사차방정식(2)
 *   · 05 → 삼차방정식의 근의 조건 · 06·07·08 → 삼차방정식의 근과 계수의 관계
 *   · 16 → 허근의 성질 x³=1,x³=-1 · 10·13·15 → 미지수가 2개인 연립이차방정식(1)
 *   · 11·14 → 미지수가 2개인 연립이차방정식(2) · 12 → 인수분해가 되지 않는 연립이차방정식
 *   · 17·18 → 부정방정식.
 *   (1)·(2) 는 「인수정리로 푸는 것 / 치환으로 푸는 것」, 「일차+이차 / 이차+이차」로 읽었다(계획 §1-6).
 *   08(켤레근)은 근과 계수의 관계로 푸는 유형이라 그 소단원에 두었다. 원장님 확인 대상.
 *
 * RPM 원본은 구조만 보았다. 본문·수치·소재는 옮기지 않았다(저작권).
 */
import type { Difficulty } from "@/contracts/difficulty";

import type { Rng } from "../elementary/types";

import { eul, eun, ga, ira, ro } from "./josa";
import { gcd, q, qTex, surd, surdPmTex, surdTex, type Q } from "./numbers";
import {
  $,
  Retry,
  attempt,
  coefPrefix,
  distinctInts,
  numAnswer,
  nz,
  pickDistractors,
  pickOne,
  plusConst,
  randInt,
} from "./pick";
import {
  divMod,
  factorParen,
  factorTex,
  fromRoots,
  linTex,
  mul,
  paren,
  polyTex,
  term,
} from "./poly";
import type { HighHold, HighProblem, HighTypeEntry } from "./types";

const GRADE = "공통수학1";
const BOOK = "공통수학1";
const MINOR = "여러 가지 방정식";

/** 우리 `Unit.section` 정확한 이름 (prisma/seed-data/units.ts 공통수학1 2. 방정식과 부등식). */
const SEC = {
  삼사1: "삼차방정식과 사차방정식(1)",
  삼사2: "삼차방정식과 사차방정식(2)",
  근조건: "삼차방정식의 근의 조건",
  근계수: "삼차방정식의 근과 계수의 관계",
  허근: "허근의 성질 x³=1,x³=-1",
  연립1: "미지수가 2개인 연립이차방정식(1)",
  연립2: "미지수가 2개인 연립이차방정식(2)",
  대칭: "인수분해가 되지 않는 연립이차방정식",
  부정: "부정방정식",
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
// 공용 후보: qAnswer(분수 정답 — pick.ts) · termIf·linTerm·prodTex(문자 계수 항·문자 인자판 — poly.ts) ·
//   cases(연립방정식 표기 — 부등식 세션의 연립부등식도 쓴다) · pmSqrtTex·isSquare·squarefree(numbers.ts) ·
//   wPow·wTex(ω 셈 — 복소수 세션의 i 거듭제곱과 같은 모양). 리드가 병합 때 한 벌로 올린다.

function chooseOne<T>(rng: Rng, xs: readonly T[]): [number, T] {
  const id = randInt(rng, 0, xs.length - 1);
  return [id, xs[id]!];
}

/** 분수 정답 — 0 이면 다시 뽑는다(`numAnswer` 와 같은 까닭). */
function qAnswer(x: Q): string {
  if (x.n === 0) throw new Retry("정답이 0 이라 객관식 오답을 못 만든다");
  return $(qTex(x));
}

/** 계수가 0 이면 항을 안 쓴다(`term` 은 `+0x` 를 쓴다 — 지면 냄새). */
function termIf(c: number, body: string): string {
  return c === 0 ? "" : term(c, body);
}

/** $(v-u)(v-w)\cdots$ — 근이 0 이면 `v` 를 앞에 둔다(`x(x-1)`). */
function prodTex(roots: readonly number[], v = "x"): string {
  return [...roots]
    .sort((a, b) => Number(b === 0) - Number(a === 0))
    .map((r) => factorParen(r, v))
    .join("");
}

/**
 * 문자에 대한 일차식을 계수로 둔 항 — `+(a-3)x^{2}` · `-(a-3)x^{2}`(음의 계수는 부호를 밖으로) ·
 * `+2ax` · `-ax`. `m` 은 문자의 계수, `k` 는 상수.
 */
function linTerm(m: number, k: number, sym: string, body: string): string {
  if (m === 0) return termIf(k, body);
  if (k === 0) return term(m, `${sym}${body}`);
  return m > 0
    ? `+(${linTex([[m, sym]], k)})${body}`
    : `-(${linTex([[-m, sym]], -k)})${body}`;
}

/** 연립방정식 — 저장소 관례(`m2System.ts`) 그대로 `\begin{cases}A\\B\end{cases}`. */
function cases(a: string, b: string): string {
  return `\\begin{cases}${a}\\\\${b}\\end{cases}`;
}

function isSquare(n: number): boolean {
  if (n < 0) return false;
  const r = Math.round(Math.sqrt(n));
  return r * r === n;
}

function squarefree(n: number): boolean {
  for (let p = 2; p * p <= n; p += 1) if (n % (p * p) === 0) return false;
  return true;
}

/** $\pm\sqrt{n/d}$ — 제곱수면 근호 없이, 음수면 허수(`\pm\sqrt{5}i`). */
function pmSqrtTex(n: number, d = 1): string {
  const s = surd(0, 1, n * d, d);
  if (s.b === 0) return `\\pm ${qTex(q(s.a, s.d))}`;
  return surdPmTex(s);
}

const ROMAN = ["ⅰ", "ⅱ", "ⅲ", "ⅳ"] as const;

/**
 * 치환한 이차방정식 $x^{2}+px-t=0$ 한 갈래의 해설 — 실근이면 두 근의 합·곱을 말한다.
 * 판별식이 0 인 판은 만들지 않는다(중근을 «서로 다른 실근»으로 세면 거짓이 된다).
 */
function branchLine(i: number, t: number, p: number, ask: "합" | "곱"): string {
  const Q = polyTex([-t, p, 1]);
  const disc = p * p + 4 * t;
  const head = `(${ROMAN[i]}) $t=${t}$일 때, 이차방정식 $${Q}=0$의 판별식이 $${disc}${disc > 0 ? ">" : "<"}0$이므로 `;
  if (disc < 0) return `${head}서로 다른 두 허근을 갖는다.`;
  return `${head}서로 다른 두 실근을 갖고, 그 ${ask}은 $${ask === "합" ? -p : -t}$이다.`;
}

// ───────────────────────────── 01 ─────────────────────────────
// 삼차방정식과 사차방정식의 풀이
// 꼴 0 (기본·대표): 정수근 셋 — 가장 큰 근과 가장 작은 근의 곱·합
// 꼴 1 (응용): 한 실근과 두 허근 — 근을 주어진 꼴로 맞춘다
// 꼴 2 (응용): 사차방정식 — 모든 실근의 합 · 두 허근의 제곱의 합
// 꼴 3 (심화하): 공통인수로 묶은 뒤 두 근의 차 — 근과 계수의 관계

function t01(rng: Rng): Body {
  const mode = randInt(rng, 0, 3);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const roots = distinctInts(rng, -5, 5, 3, { nonzero: true }).sort(
        (a, b) => a - b,
      ) as [number, number, number];
      const [u, v, w] = roots;
      const f = fromRoots(roots);
      const poly = polyTex(f);
      const r = [...roots].sort(
        (a, b) => Math.abs(a) - Math.abs(b) || a - b,
      )[0]!;
      const quad = polyTex(divMod(f, [-r, 1]).q);
      const kind = randInt(rng, 0, 1);
      const ans = kind === 0 ? u * w : u + w;
      const rt = factorTex(r);
      return {
        content: `삼차방정식 $${poly}=0$의 세 근 중 가장 큰 근과 가장 작은 근의 ${kind === 0 ? "곱" : "합"}을 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `$f(x)=${poly}$${ira(poly)} 하면 $f(${r})=0$이므로 $f(x)$${eun("f(x)")} $${rt}$${ro(rt)} 나누어떨어진다.`,
          `조립제법을 이용하여 인수분해하면 $f(x)=${factorParen(r)}(${quad})=${prodTex(roots)}$`,
          `따라서 주어진 방정식의 근은 $x=${u}$ 또는 $x=${v}$ 또는 $x=${w}$이므로`,
          kind === 0
            ? `구하는 곱은 $${w}\\times ${paren(u)}=${ans}$`
            : `구하는 합은 $${w}+${paren(u)}=${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, u, v, w, kind },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const r = nz(rng, -4, 4);
      const p = pickOne(rng, [-3, -1, 1, 3]);
      const qq = randInt(rng, 1, 8);
      const c = 4 * qq - p * p;
      // (b±√c i)/2 꼴이 정규형이려면 c 가 제곱인수 없는 수여야 한다(p 가 홀수라 2 로 약분도 안 된다).
      if (c <= 1 || !squarefree(c)) return null;
      const quad = polyTex([qq, p, 1]);
      const poly = polyTex(mul([-r, 1], [qq, p, 1]));
      const pm = surdPmTex(surd(-p, 1, -c, 2));
      const ans = r - p + c;
      return {
        content: `삼차방정식 $${poly}=0$의 해는 $x=a$ 또는 $x=\\dfrac{b\\pm\\sqrt{c}i}{2}$이다. 이때 유리수 $a$, $b$, $c$에 대하여 $a+b+c$의 값을 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `$f(x)=${poly}$${ira(poly)} 하면 $f(${r})=0$이므로 조립제법을 이용하여 인수분해하면`,
          `$f(x)=${factorParen(r)}(${quad})$`,
          `이차방정식 $${quad}=0$의 근은 $x=${pm}$이므로 주어진 방정식의 해는 $x=${r}$ 또는 $x=${pm}$`,
          `따라서 $a=${r}$, $b=${-p}$, $c=${c}$이므로 $a+b+c=${ans}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, r, p, q: qq },
      };
    });
  if (mode === 2)
    return attempt<Body>((): Body | null => {
      const [u, v] = distinctInts(rng, -4, 4, 2, { nonzero: true }) as [
        number,
        number,
      ];
      const p = randInt(rng, -3, 3);
      const qq = randInt(rng, 1, 6);
      if (p * p - 4 * qq >= 0) return null;
      const quad = polyTex([qq, p, 1]);
      const poly = polyTex(mul(fromRoots([u, v]), [qq, p, 1]));
      const kind = randInt(rng, 0, 1);
      const ans = kind === 0 ? u + v : p * p - 2 * qq;
      return {
        content:
          kind === 0
            ? `사차방정식 $${poly}=0$의 모든 실근의 합을 구하시오.`
            : `사차방정식 $${poly}=0$의 두 허근을 $\\alpha$, $\\beta$${ira("\\beta")} 할 때, $\\alpha^{2}+\\beta^{2}$의 값을 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `$f(x)=${poly}$${ira(poly)} 하면 $f(${u})=0$, $f(${v})=0$이므로 조립제법을 이용하여 인수분해하면`,
          `$f(x)=${prodTex([u, v])}(${quad})$`,
          `이차방정식 $${quad}=0$의 판별식을 $D$라 하면 $D=${p * p - 4 * qq}<0$이므로 이 이차방정식은 서로 다른 두 허근을 갖는다.`,
          ...(kind === 0
            ? [
                `따라서 주어진 방정식의 실근은 $${u}$, $${v}$이므로 구하는 합은 $${u}+${paren(v)}=${ans}$`,
              ]
            : [
                `두 허근 $\\alpha$, $\\beta$${eun("\\beta")} 이 이차방정식의 두 근이므로 $\\alpha+\\beta=${-p}$, $\\alpha\\beta=${qq}$`,
                `따라서 $\\alpha^{2}+\\beta^{2}=(\\alpha+\\beta)^{2}-2\\alpha\\beta=${paren(-p)}^{2}-2\\times ${qq}=${ans}$`,
              ]),
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, u, v, p, q: qq, kind },
      };
    });
  return attempt<Body>((): Body | null => {
    const s = nz(rng, -5, 5);
    const d = randInt(rng, 1, 8);
    if ((s - d) % 2 !== 0) return null;
    const a = (s * s - d * d) / 4;
    if (a === 0) return null;
    const quad = `x^{2}${term(-s, "x")}+a`;
    return {
      content: `삼차방정식 $x^{3}${term(-s, "x^{2}")}+ax=0$의 두 근 $\\alpha$, $\\beta$에 대하여 $\\alpha-\\beta=${d}$일 때, 실수 $a$의 값을 구하시오. (단, $\\alpha\\beta\\ne 0$)`,
      answer: numAnswer(a),
      solution: [
        `주어진 방정식에서 $x(${quad})=0$이므로 $x=0$ 또는 $${quad}=0$`,
        `이때 $\\alpha\\beta\\ne 0$이므로 $\\alpha$, $\\beta$${eun("\\beta")} 이차방정식 $${quad}=0$의 두 근이다.`,
        `근과 계수의 관계에 의하여 $\\alpha+\\beta=${s}$, $\\alpha\\beta=a$`,
        `$(\\alpha-\\beta)^{2}=(\\alpha+\\beta)^{2}-4\\alpha\\beta$이므로 $${d}^{2}=${paren(s)}^{2}-4a$`,
        `따라서 $a=${a}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, s, d },
    };
  });
}

// ───────────────────────────── 02 ─────────────────────────────
// 공통부분이 있는 사차방정식의 풀이
// 꼴 0 (기본·대표): (x²+px)² 꼴 — 치환한 뒤 갈래마다 판별식
// 꼴 1 (응용): (x²+px+c₁)(x²+px+c₂)+d=0 — 모든 근의 곱 · 모든 실근의 합
// 꼴 2 (응용): 일차식 넷의 곱 — 합이 같은 짝을 먼저 묶는다

function t02(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  const discOf = (p: number, t: number): number => p * p + 4 * t;
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const p = nz(rng, -4, 4);
      const [t1, t2] = distinctInts(rng, -6, 8, 2).sort((a, b) => a - b) as [
        number,
        number,
      ];
      if ([t1, t2].some((t) => discOf(p, t) === 0)) return null;
      const reals = [t1, t2].filter((t) => discOf(p, t) > 0);
      if (reals.length === 0) return null;
      const ask = randInt(rng, 0, 1) === 0 ? "합" : "곱";
      const vals = reals.map((t) => (ask === "합" ? -p : -t));
      const ans =
        ask === "합"
          ? vals.reduce((x, y) => x + y)
          : vals.reduce((x, y) => x * y);
      const A = -(t1 + t2);
      const B = t1 * t2;
      const inner = `x^{2}${term(p, "x")}`;
      const Y = `(${inner})^{2}${termIf(A, `(${inner})`)}${plusConst(B)}`;
      const sub = `${inner}=t`;
      return {
        content: `사차방정식 $${Y}=0$의 모든 실근의 ${ask}을 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `$${sub}$${ro(sub)} 놓으면 주어진 방정식은 $t^{2}${termIf(A, "t")}${plusConst(B)}=0$`,
          `$${prodTex([t1, t2], "t")}=0$이므로 $t=${t1}$ 또는 $t=${t2}$`,
          branchLine(0, t1, p, ask),
          branchLine(1, t2, p, ask),
          vals.length === 2
            ? `(ⅰ), (ⅱ)에서 모든 실근의 ${ask}은 $${vals[0]}${ask === "합" ? "+" : "\\times "}${paren(vals[1]!)}=${ans}$`
            : `(ⅰ), (ⅱ)에서 모든 실근의 ${ask}은 $${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, p, t1, t2, ask: ask === "합" ? 0 : 1 },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const p = nz(rng, -4, 4);
      const [t1, t2] = distinctInts(rng, -6, 8, 2).sort((a, b) => a - b) as [
        number,
        number,
      ];
      const c1 = randInt(rng, -6, 6);
      const c2 = -(t1 + t2) - c1;
      if (c1 === c2) return null;
      const d = t1 * t2 - c1 * c2;
      if (d === 0) return null;
      if ([t1, t2].some((t) => discOf(p, t) === 0)) return null;
      const reals = [t1, t2].filter((t) => discOf(p, t) > 0);
      const kind = randInt(rng, 0, 1);
      if (kind === 1 && reals.length === 0) return null;
      const ans = kind === 0 ? t1 * t2 : -p * reals.length;
      const Y = `(${polyTex([c1, p, 1])})(${polyTex([c2, p, 1])})${plusConst(d)}`;
      const tf = (c: number): string => (c === 0 ? "t" : `(t${plusConst(c)})`);
      const sub = `x^{2}${term(p, "x")}=t`;
      const lines = [
        `$${sub}$${ro(sub)} 놓으면 주어진 방정식은 $${tf(c1)}${tf(c2)}${plusConst(d)}=0$`,
        `$t^{2}${termIf(c1 + c2, "t")}${plusConst(t1 * t2)}=0$, $${prodTex([t1, t2], "t")}=0$이므로 $t=${t1}$ 또는 $t=${t2}$`,
      ];
      if (kind === 0) {
        lines.push(
          `(ⅰ) $t=${t1}$일 때, 이차방정식 $${polyTex([-t1, p, 1])}=0$의 두 근의 곱은 $${-t1}$`,
          `(ⅱ) $t=${t2}$일 때, 이차방정식 $${polyTex([-t2, p, 1])}=0$의 두 근의 곱은 $${-t2}$`,
          `(ⅰ), (ⅱ)에서 주어진 방정식의 모든 근의 곱은 $${-t1}\\times ${paren(-t2)}=${ans}$`,
        );
      } else {
        lines.push(
          branchLine(0, t1, p, "합"),
          branchLine(1, t2, p, "합"),
          reals.length === 2
            ? `(ⅰ), (ⅱ)에서 모든 실근의 합은 $${-p}+${paren(-p)}=${ans}$`
            : `(ⅰ), (ⅱ)에서 모든 실근의 합은 $${ans}$`,
        );
      }
      return {
        content: `사차방정식 $${Y}=0$의 모든 ${kind === 0 ? "근의 곱" : "실근의 합"}을 구하시오.`,
        answer: numAnswer(ans),
        solution: lines.join("\n"),
        difficulty: "응용",
        facts: { mode, p, c1, c2, d, kind },
      };
    });
  return attempt<Body>((): Body | null => {
    const p = nz(rng, -4, 4);
    const [u1, v1] = distinctInts(rng, -5, 5, 2) as [number, number];
    const u2 = -p - u1;
    const v2 = -p - v1;
    const all = [u1, u2, v1, v2];
    if (new Set(all).size !== 4) return null;
    const U = u1 * u2;
    const V = v1 * v2;
    const t1 = randInt(rng, -8, 8);
    const t2 = -(U + V) - t1;
    if (t1 === t2) return null;
    const k = t1 * t2 - U * V;
    if (k === 0) return null;
    if ([t1, t2].some((t) => discOf(p, t) === 0)) return null;
    const reals = [t1, t2].filter((t) => discOf(p, t) > 0);
    if (reals.length === 0) return null;
    const ans = -p * reals.length;
    const perm = distinctInts(rng, 0, 3, 4);
    const Y = `${prodTex(perm.map((i) => all[i]!))}${plusConst(k)}`;
    const tf = (c: number): string => (c === 0 ? "t" : `(t${plusConst(c)})`);
    const sub = `x^{2}${term(p, "x")}=t`;
    const [lo, hi] = [Math.min(t1, t2), Math.max(t1, t2)];
    return {
      content: `사차방정식 $${Y}=0$의 모든 실근의 합을 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `주어진 방정식에서 $\\{${prodTex([u1, u2])}\\}\\{${prodTex([v1, v2])}\\}${plusConst(k)}=0$`,
        `$(${polyTex(fromRoots([u1, u2]))})(${polyTex(fromRoots([v1, v2]))})${plusConst(k)}=0$`,
        `$${sub}$${ro(sub)} 놓으면 $${tf(U)}${tf(V)}${plusConst(k)}=0$`,
        `$t^{2}${termIf(U + V, "t")}${plusConst(t1 * t2)}=0$, $${prodTex([lo, hi], "t")}=0$이므로 $t=${lo}$ 또는 $t=${hi}$`,
        branchLine(0, lo, p, "합"),
        branchLine(1, hi, p, "합"),
        reals.length === 2
          ? `(ⅰ), (ⅱ)에서 모든 실근의 합은 $${-p}+${paren(-p)}=${ans}$`
          : `(ⅰ), (ⅱ)에서 모든 실근의 합은 $${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, p, u1, v1, k },
    };
  });
}

// ───────────────────────────── 03 ─────────────────────────────
// x^4+ax^2+b=0의 꼴의 방정식의 풀이
// 꼴 0 (기본·대표): x²=t 로 치환해 인수분해 — 모든 실근의 곱
// 꼴 1 (응용): 인수분해가 안 되면 A²-B² 꼴 — 모든 양수인 근의 곱
// 꼴 2 (심화하): 같은 꼴에서 양수인 근의 합 — 근호 정답(오답 넷)

function t03(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const s = randInt(rng, 1, 4);
      const t1 = s * s;
      const t2 = nz(rng, -8, 12);
      if (t2 === t1) return null;
      const A = -(t1 + t2);
      const B = t1 * t2;
      const poly = `x^{4}${termIf(A, "x^{2}")}${plusConst(B)}`;
      const ans = t2 > 0 ? t1 * t2 : -t1;
      return {
        content: `사차방정식 $${poly}=0$의 모든 실근의 곱을 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `$x^{2}=t$${ro("x^{2}=t")} 놓으면 주어진 방정식은 $t^{2}${termIf(A, "t")}${plusConst(B)}=0$`,
          `$${prodTex([t1, t2], "t")}=0$이므로 $t=${t1}$ 또는 $t=${t2}$`,
          `즉 $x^{2}=${t1}$ 또는 $x^{2}=${t2}$이므로 $x=\\pm ${s}$ 또는 $x=${pmSqrtTex(t2)}$`,
          t2 > 0
            ? `$x^{2}=${t1}$의 두 실근의 곱은 $${-t1}$, $x^{2}=${t2}$의 두 실근의 곱은 $${-t2}$이므로 모든 실근의 곱은 $${-t1}\\times ${paren(-t2)}=${ans}$`
            : `$x^{2}=${t2}$의 근은 허근이므로 모든 실근의 곱은 $${s}\\times ${paren(-s)}=${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, t1, t2 },
      };
    });
  return attempt<Body>((): Body | null => {
    const k = randInt(rng, 1, 4);
    const m = randInt(rng, 1, 6);
    const D = k * k + 4 * m;
    // t 에 대해 인수분해되지 않아야 A²-B² 로 가는 까닭이 선다.
    if (isSquare(D)) return null;
    const poly = `x^{4}${term(-(2 * m + k * k), "x^{2}")}+${m * m}`;
    const f1 = polyTex([-m, k, 1]);
    const f2 = polyTex([-m, -k, 1]);
    const pos1 = surdTex(surd(-k, 1, D, 2));
    const pos2 = surdTex(surd(k, 1, D, 2));
    const kx = k === 1 ? "x^{2}" : `(${k}x)^{2}`;
    const head = [
      `주어진 방정식에서 $(x^{2}-${m})^{2}-${kx}=0$`,
      `$(${f1})(${f2})=0$이므로 $${f1}=0$ 또는 $${f2}=0$`,
      `$x=${surdPmTex(surd(-k, 1, D, 2))}$ 또는 $x=${surdPmTex(surd(k, 1, D, 2))}$`,
    ];
    if (mode === 1) {
      return {
        content: `사차방정식 $${poly}=0$의 모든 양수인 근의 곱을 구하시오.`,
        answer: numAnswer(m),
        solution: [
          ...head,
          `이때 양수인 근은 $${pos1}$, $${pos2}$이므로 구하는 곱은 $(${pos1})(${pos2})=${m}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, k, m },
      };
    }
    const ans = surdTex(surd(0, 1, D));
    // 틀리기 쉬운 자리: 곱과 혼동 · 판별식의 4 빠뜨림 · 한 인수의 근만 · 2 로 안 나눔
    const distractors = pickDistractors(rng, ans, [
      String(m),
      surdTex(surd(0, 1, k * k + m)),
      pos1,
      pos2,
      surdTex(surd(0, 2, D)),
      surdTex(surd(0, 1, D, 2)),
    ]);
    if (distractors === null) return null;
    return {
      content: `사차방정식 $${poly}=0$의 모든 양수인 근의 합을 구하시오.`,
      answer: $(ans),
      solution: [
        ...head,
        `이때 양수인 근은 $${pos1}$, $${pos2}$이므로 구하는 합은 $(${pos1})+(${pos2})=${ans}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, k, m },
      distractors,
    };
  });
}

// ───────────────────────────── 04 ─────────────────────────────
// 근이 주어진 삼사차방정식
// 꼴 0 (기본·대표): 한 근으로 계수를 정하고 나머지 두 근의 식
// 꼴 1 (응용): 두 근으로 두 계수 — 나머지 한 근
// 꼴 2 (응용): 사차방정식의 두 근 — 나머지 두 근의 식

function t04(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const r = nz(rng, -3, 3);
      const m = randInt(rng, -4, 4);
      const n = nz(rng, -6, 6);
      if (r * r + m * r + n === 0) return null;
      const P = m - r;
      const a = n - r * m;
      const K = -r * n;
      const [exprId, [et, ev]] = chooseOne(rng, [
        ["a+\\alpha+\\beta", a - m],
        ["a\\alpha\\beta", a * n],
        ["\\alpha^{2}+\\beta^{2}", m * m - 2 * n],
      ] as const);
      const eq = `x^{3}${termIf(P, "x^{2}")}+ax${plusConst(K)}`;
      const quad = polyTex([n, m, 1]);
      return {
        content: `삼차방정식 $${eq}=0$의 한 근이 $${r}$이다. 이 방정식의 다른 두 근을 $\\alpha$, $\\beta$${ira("\\beta")} 할 때, $${et}$의 값을 구하시오. (단, $a$는 상수이다.)`,
        answer: numAnswer(ev),
        solution: [
          `$f(x)=${eq}$${ira(eq)} 하면 $f(${r})=0$이므로 $${linTex([[r, "a"]], r ** 3 + P * r * r + K)}=0$에서 $a=${a}$`,
          `즉 주어진 방정식은 $${polyTex([K, a, P, 1])}=0$이므로 $${factorParen(r)}(${quad})=0$`,
          `이때 $\\alpha$, $\\beta$${eun("\\beta")} 이차방정식 $${quad}=0$의 두 근이므로 $\\alpha+\\beta=${-m}$, $\\alpha\\beta=${n}$`,
          `따라서 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, r, P, K, exprId },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const [u, v, w] = distinctInts(rng, -4, 4, 3, { nonzero: true }) as [
        number,
        number,
        number,
      ];
      const K = -u * v * w;
      const a = -(u + v + w);
      const b = u * v + v * w + w * u;
      const eq = `x^{3}+ax^{2}+bx${plusConst(K)}`;
      return {
        content: `삼차방정식 $${eq}=0$의 두 근이 $${u}$, $${v}$일 때, 나머지 한 근을 구하시오. (단, $a$, $b$는 상수이다.)`,
        answer: numAnswer(w),
        solution: [
          `$f(x)=${eq}$${ira(eq)} 하면 $f(${u})=0$, $f(${v})=0$이므로`,
          `$${linTex(
            [
              [u * u, "a"],
              [u, "b"],
            ],
            u ** 3 + K,
          )}=0$, $${linTex(
            [
              [v * v, "a"],
              [v, "b"],
            ],
            v ** 3 + K,
          )}=0$`,
          `두 식을 연립하여 풀면 $a=${a}$, $b=${b}$`,
          `즉 주어진 방정식은 $${polyTex([K, b, a, 1])}=0$이므로 $${prodTex([u, v, w])}=0$`,
          `따라서 나머지 한 근은 $${w}$이다.`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, u, v, K },
      };
    });
  return attempt<Body>((): Body | null => {
    const [u, v] = distinctInts(rng, -3, 3, 2, { nonzero: true }) as [
      number,
      number,
    ];
    // m=0 이면 해설에 `6+0+1` 이 찍힌다(«상수 0» 지면 냄새).
    const m = nz(rng, -3, 3);
    const n = randInt(rng, 1, 6);
    if (m * m - 4 * n >= 0) return null;
    const s = u + v;
    const P = u * v;
    const c3 = m - s;
    const c2 = n - s * m + P;
    const a = P * m - s * n;
    const b = P * n;
    const [exprId, [et, ev, how]] = chooseOne(rng, [
      [
        "\\alpha^{2}+\\beta^{2}",
        m * m - 2 * n,
        `(\\alpha+\\beta)^{2}-2\\alpha\\beta=${paren(-m)}^{2}-2\\times ${n}`,
      ],
      [
        "(\\alpha+1)(\\beta+1)",
        n - m + 1,
        `\\alpha\\beta+(\\alpha+\\beta)+1=${n}+${paren(-m)}+1`,
      ],
    ] as const);
    const eq = `x^{4}${termIf(c3, "x^{3}")}${termIf(c2, "x^{2}")}+ax+b`;
    const quad = polyTex([n, m, 1]);
    const at = (x: number): number => x ** 4 + c3 * x ** 3 + c2 * x * x;
    return {
      content: `사차방정식 $${eq}=0$의 두 근이 $${u}$, $${v}$이다. 이 방정식의 다른 두 근을 $\\alpha$, $\\beta$${ira("\\beta")} 할 때, $${et}$의 값을 구하시오. (단, $a$, $b$는 상수이다.)`,
      answer: numAnswer(ev),
      solution: [
        `$f(x)=${eq}$${ira(eq)} 하면 $f(${u})=0$, $f(${v})=0$이므로`,
        `$${linTex(
          [
            [u, "a"],
            [1, "b"],
          ],
          at(u),
        )}=0$, $${linTex(
          [
            [v, "a"],
            [1, "b"],
          ],
          at(v),
        )}=0$`,
        `두 식을 연립하여 풀면 $a=${a}$, $b=${b}$`,
        `즉 주어진 방정식은 $${polyTex([b, a, c2, c3, 1])}=0$이므로 $${prodTex([u, v])}(${quad})=0$`,
        `이때 $\\alpha$, $\\beta$${eun("\\beta")} 이차방정식 $${quad}=0$의 두 근이므로 $\\alpha+\\beta=${-m}$, $\\alpha\\beta=${n}$`,
        `따라서 $${et}=${how}=${ev}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, u, v, c3, c2, exprId },
    };
  });
}

// ───────────────────────────── 05 ─────────────────────────────
// 삼차방정식의 근의 조건
// 꼴 0 (기본·대표): 중근을 갖도록 — 두 경우(이차식이 x=r 을 근으로 · 이차식의 중근)의 a 를 모두 더한다
// 꼴 1 (응용): 근이 모두 실수 · 한 실근과 두 허근 — 자연수 k
// 꼴 2 (심화하): 서로 다른 실근이 1개 — 두 경우를 합쳐 a 의 최댓값

function t05(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const m = pickOne(rng, [1, -1]);
      const r = pickOne(rng, [-2, -1, 1, 2]);
      const e = randInt(rng, 1, 4);
      // 이차식의 중근(∓e)이 r 이면 삼중근이 된다 — 경우가 겹친다.
      if (e === Math.abs(r)) return null;
      const c = e * e;
      const n = randInt(rng, -5, 5);
      const num = -(r * r + n * r + c);
      if (num % (m * r) !== 0) return null;
      const a1 = num / (m * r);
      const a2 = (2 * e - n) / m;
      const a3 = (-2 * e - n) / m;
      if (new Set([a1, a2, a3]).size !== 3) return null;
      // 해설의 합 `9+8+0` 은 «상수 0» 지면 냄새다 — 0 인 a 가 끼면 버린다(씨앗 120 훑개가 찾았다).
      if ([a1, a2, a3].includes(0)) return null;
      const sum = a1 + a2 + a3;
      const cubic = `x^{3}${linTerm(m, n - r, "a", "x^{2}")}${linTerm(-r * m, c - r * n, "a", "x")}${plusConst(-r * c)}`;
      const quad = `x^{2}${linTerm(m, n, "a", "x")}+${c}`;
      const eq = `${cubic}=0`;
      return {
        content: `삼차방정식 $${eq}$${ga(eq)} 중근을 갖도록 하는 모든 실수 $a$의 값의 합을 구하시오.`,
        answer: numAnswer(sum),
        solution: [
          `주어진 방정식에서 $${factorParen(r)}\\{${quad}\\}=0$`,
          `이때 주어진 방정식이 중근을 가지려면`,
          `(ⅰ) 이차방정식 $${quad}=0$${ga(`${quad}=0`)} $x=${r}$${eul(String(r))} 근으로 갖는 경우`,
          `$${r * r}${linTerm(m * r, n * r, "a", "")}+${c}=0$에서 $a=${a1}$`,
          `(ⅱ) 이차방정식 $${quad}=0$${ga(`${quad}=0`)} 중근을 갖는 경우`,
          `이 이차방정식의 판별식을 $D$라 하면 $D=(${linTex([[m, "a"]], n)})^{2}-${4 * c}=0$에서 $a=${a2}$ 또는 $a=${a3}$`,
          `(ⅰ), (ⅱ)에서 구하는 합은 $${a1}+${paren(a2)}+${paren(a3)}=${sum}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, m, r, n, c },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const r = nz(rng, -3, 3);
      const h = nz(rng, -3, 3);
      const kind = randInt(rng, 0, 1);
      const cubic = `x^{3}${termIf(-(2 * h + r), "x^{2}")}${linTerm(1, 2 * h * r, "k", "x")}${term(-r, "k")}`;
      const quad = `x^{2}${term(-2 * h, "x")}+k`;
      const eq = `${cubic}=0`;
      const qeq = `${quad}=0`;
      const hh = h * h;
      const ans = kind === 0 ? hh : hh + 1;
      return {
        content:
          kind === 0
            ? `삼차방정식 $${eq}$의 근이 모두 실수가 되도록 하는 자연수 $k$의 개수를 구하시오.`
            : `삼차방정식 $${eq}$${ga(eq)} 한 실근과 두 허근을 갖도록 하는 자연수 $k$의 최솟값을 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `주어진 방정식에서 $${factorParen(r)}(${quad})=0$`,
          kind === 0
            ? `이때 주어진 방정식의 근이 모두 실수가 되려면 이차방정식 $${qeq}$${ga(qeq)} 실근을 가져야 하므로 이 이차방정식의 판별식을 $D$라 하면`
            : `이때 주어진 방정식이 한 실근과 두 허근을 가지려면 이차방정식 $${qeq}$${ga(qeq)} 허근을 가져야 하므로 이 이차방정식의 판별식을 $D$라 하면`,
          kind === 0
            ? `$\\dfrac{D}{4}=${paren(-h)}^{2}-k\\ge 0$, 즉 $k\\le ${hh}$`
            : `$\\dfrac{D}{4}=${paren(-h)}^{2}-k<0$, 즉 $k>${hh}$`,
          kind === 0
            ? `따라서 자연수 $k$는 ${hh === 1 ? "$1$" : hh <= 4 ? Array.from({ length: hh }, (_, i) => `$${i + 1}$`).join(", ") : `$1$, $2$, $\\cdots$, $${hh}$`}의 $${hh}$개이다.`
            : `따라서 자연수 $k$의 최솟값은 $${ans}$이다.`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, r, h, kind },
      };
    });
  return attempt<Body>((): Body | null => {
    const p = pickOne(rng, [1, 2, 3]);
    const r = pickOne(rng, [-2, -1, 1, 2]);
    const amax = -p * r * r;
    const cubic = `${coefPrefix(p)}x^{3}${term(-3 * p * r, "x^{2}")}${linTerm(-1, 2 * p * r * r, "a", "x")}${term(r, "a")}`;
    const Q = `${coefPrefix(p)}x^{2}${term(-2 * p * r, "x")}-a`;
    const qeq = `${Q}=0`;
    return {
      content: `삼차방정식 $${cubic}=0$의 서로 다른 실근이 $1$개일 때, 실수 $a$의 최댓값을 구하시오.`,
      answer: numAnswer(amax),
      solution: [
        `주어진 방정식에서 $${factorParen(r)}(${Q})=0$`,
        `이때 주어진 방정식의 서로 다른 실근이 $1$개이려면`,
        `(ⅰ) 이차방정식 $${qeq}$${ga(qeq)} $x=${r}$${eul(String(r))} 중근으로 갖는 경우`,
        `$${p * r * r}${term(-2 * p * r * r, "")}-a=0$에서 $a=${amax}$`,
        `(ⅱ) 이차방정식 $${qeq}$${ga(qeq)} 허근을 갖는 경우`,
        `이 이차방정식의 판별식을 $D$라 하면 $\\dfrac{D}{4}=${paren(-p * r)}^{2}+${coefPrefix(p)}a<0$에서 $a<${amax}$`,
        `(ⅰ), (ⅱ)에서 $a\\le ${amax}$이므로 실수 $a$의 최댓값은 $${amax}$이다.`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, p, r },
    };
  });
}

// ───────────────────────────── 06 ─────────────────────────────
// 삼차방정식의 근과 계수의 관계
// 꼴 0 (기본·대표): 세 근의 대칭식(정수값)
// 꼴 1 (응용): 역수가 들어간 대칭식 — 분수 정답
// 꼴 2 (응용): 세 근의 비가 주어질 때 계수

const S1 = "\\alpha+\\beta+\\gamma";
const S2 = "\\alpha\\beta+\\beta\\gamma+\\gamma\\alpha";
const S3 = "\\alpha\\beta\\gamma";

function vietaLine(s1: number, s2: number, s3: number): string {
  return `근과 계수의 관계에 의하여 $${S1}=${s1}$, $${S2}=${s2}$, $${S3}=${s3}$이므로`;
}

function t06(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const s1 = nz(rng, -5, 5);
      const s2 = nz(rng, -6, 6);
      const s3 = nz(rng, -6, 6);
      const [exprId, [et, ev, how]] = chooseOne(rng, [
        [
          "\\alpha^{2}+\\beta^{2}+\\gamma^{2}",
          s1 * s1 - 2 * s2,
          `(${S1})^{2}-2(${S2})=${paren(s1)}^{2}-2\\times ${paren(s2)}`,
        ],
        [
          "(1-\\alpha)(1-\\beta)(1-\\gamma)",
          1 - s1 + s2 - s3,
          `1-(${S1})+(${S2})-${S3}=1-${paren(s1)}+${paren(s2)}-${paren(s3)}`,
        ],
        [
          "(1+\\alpha)(1+\\beta)(1+\\gamma)",
          1 + s1 + s2 + s3,
          `1+(${S1})+(${S2})+${S3}=1+${paren(s1)}+${paren(s2)}+${paren(s3)}`,
        ],
        [
          "(\\alpha+\\beta)(\\beta+\\gamma)(\\gamma+\\alpha)",
          s1 * s2 - s3,
          `(${S1})(${S2})-${S3}=${paren(s1)}\\times ${paren(s2)}-${paren(s3)}`,
        ],
      ] as const);
      const poly = polyTex([-s3, s2, -s1, 1]);
      return {
        content: `삼차방정식 $${poly}=0$의 세 근을 $\\alpha$, $\\beta$, $\\gamma$${ira("\\gamma")} 할 때, $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [vietaLine(s1, s2, s3), `$${et}=${how}=${ev}$`].join("\n"),
        difficulty: "기본",
        facts: { mode, s1, s2, s3, exprId },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const s1 = nz(rng, -5, 5);
      const s2 = nz(rng, -6, 6);
      const s3 = nz(rng, -4, 4);
      const inv = "\\dfrac{1}{\\alpha}+\\dfrac{1}{\\beta}+\\dfrac{1}{\\gamma}";
      const [exprId, [et, ev, how]] = chooseOne(rng, [
        [inv, q(s2, s3), `\\dfrac{${S2}}{${S3}}`],
        [
          "\\dfrac{1}{\\alpha^{2}}+\\dfrac{1}{\\beta^{2}}+\\dfrac{1}{\\gamma^{2}}",
          q(s2 * s2 - 2 * s1 * s3, s3 * s3),
          `\\dfrac{(${S2})^{2}-2${S3}(${S1})}{(${S3})^{2}}`,
        ],
        [
          "\\dfrac{\\beta+\\gamma}{\\alpha}+\\dfrac{\\gamma+\\alpha}{\\beta}+\\dfrac{\\alpha+\\beta}{\\gamma}",
          q(s1 * s2 - 3 * s3, s3),
          `(${S1})\\left(${inv}\\right)-3=${paren(s1)}\\times ${qParen(q(s2, s3))}-3`,
        ],
      ] as const);
      const poly = polyTex([-s3, s2, -s1, 1]);
      return {
        content: `삼차방정식 $${poly}=0$의 세 근을 $\\alpha$, $\\beta$, $\\gamma$${ira("\\gamma")} 할 때, $${et}$의 값을 구하시오.`,
        answer: qAnswer(ev),
        solution: [vietaLine(s1, s2, s3), `$${et}=${how}=${qTex(ev)}$`].join(
          "\n",
        ),
        difficulty: "응용",
        facts: { mode, s1, s2, s3, exprId },
      };
    });
  return attempt<Body>((): Body | null => {
    const [k, l] = pickOne(rng, [
      [2, 3],
      [2, 4],
      [3, 4],
      [2, 5],
      [3, 5],
    ] as const);
    const t = nz(rng, -3, 3);
    const P = -(1 + k + l) * t;
    const a = (k + l + k * l) * t * t;
    const b = -(k * l) * t ** 3;
    if (a + b === 0) return null;
    return {
      content: `삼차방정식 $x^{3}${term(P, "x^{2}")}+ax+b=0$의 세 근의 비가 $1:${k}:${l}$일 때, 상수 $a$, $b$에 대하여 $a+b$의 값을 구하시오.`,
      answer: numAnswer(a + b),
      solution: [
        `세 근을 $\\alpha$, $${k}\\alpha$, $${l}\\alpha$ ($\\alpha\\ne 0$)라 하면 근과 계수의 관계에 의하여`,
        `$\\alpha+${k}\\alpha+${l}\\alpha=${-P}$에서 $\\alpha=${t}$`,
        `즉 세 근이 $${t}$, $${k * t}$, $${l * t}$이므로`,
        `$a=${t}\\times ${paren(k * t)}+${paren(k * t)}\\times ${paren(l * t)}+${paren(l * t)}\\times ${paren(t)}=${a}$`,
        `$b=-${paren(t)}\\times ${paren(k * t)}\\times ${paren(l * t)}=${b}$`,
        `따라서 $a+b=${a + b}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, k, l, P },
    };
  });
}

/** 곱셈 옆에 놓는 분수 — 음수면 괄호. */
function qParen(x: Q): string {
  return x.n < 0 ? `(${qTex(x)})` : qTex(x);
}

// ───────────────────────────── 07 ─────────────────────────────
// 세 수를 근으로 하는 삼차방정식
// 꼴 0 (기본·대표): 두 근의 합 α+β, β+γ, γ+α 를 근으로
// 꼴 1 (응용): 역수 · 상수배를 근으로
// 꼴 2 (심화하): f(u)=f(v)=f(w)=K 인 삼차식 — f(x)-K 의 근으로 되돌린다

function t07(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  const tail = `세 근으로 하고 $x^{3}$의 계수가 $1$인 삼차방정식을 $x^{3}+ax^{2}+bx+c=0$${ira("x^{3}+ax^{2}+bx+c=0")} 하자.`;
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const s1 = nz(rng, -4, 4);
      const s2 = nz(rng, -5, 5);
      const s3 = nz(rng, -5, 5);
      const a = -2 * s1;
      const b = s1 * s1 + s2;
      const c = -(s1 * s2 - s3);
      const [exprId, [et, ev]] = chooseOne(rng, [
        ["a+b+c", a + b + c],
        ["abc", a * b * c],
      ] as const);
      const poly = polyTex([-s3, s2, -s1, 1]);
      const last = "\\gamma+\\alpha";
      return {
        content: `삼차방정식 $${poly}=0$의 세 근을 $\\alpha$, $\\beta$, $\\gamma$${ira("\\gamma")} 할 때, $\\alpha+\\beta$, $\\beta+\\gamma$, $${last}$${eul(last)} ${tail} 이때 상수 $a$, $b$, $c$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          vietaLine(s1, s2, s3),
          `세 근의 합은 $(\\alpha+\\beta)+(\\beta+\\gamma)+(\\gamma+\\alpha)=2(${S1})=${2 * s1}$`,
          `두 근끼리의 곱의 합은 $(${S1})^{2}+(${S2})=${s1 * s1 + s2}$`,
          `세 근의 곱은 $(\\alpha+\\beta)(\\beta+\\gamma)(\\gamma+\\alpha)=(${S1})(${S2})-${S3}=${s1 * s2 - s3}$`,
          `따라서 $a=${a}$, $b=${b}$, $c=${c}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, s1, s2, s3, exprId },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const kind = randInt(rng, 0, 1);
      const s1 = nz(rng, -4, 4);
      const s2 = nz(rng, -5, 5);
      const s3 = kind === 0 ? pickOne(rng, [1, -1]) : nz(rng, -3, 3);
      const k = pickOne(rng, [2, 3, -2]);
      const A = kind === 0 ? -s2 / s3 : -k * s1;
      const B = kind === 0 ? s1 / s3 : k * k * s2;
      const C = kind === 0 ? -1 / s3 : -(k ** 3) * s3;
      const [exprId, [et, ev]] = chooseOne(rng, [
        ["a+b+c", A + B + C],
        ["abc", A * B * C],
      ] as const);
      const poly = polyTex([-s3, s2, -s1, 1]);
      const last = kind === 0 ? "\\dfrac{1}{\\gamma}" : `${k}\\gamma`;
      const roots =
        kind === 0
          ? `$\\dfrac{1}{\\alpha}$, $\\dfrac{1}{\\beta}$, $${last}$`
          : `$${k}\\alpha$, $${k}\\beta$, $${last}$`;
      const lines =
        kind === 0
          ? [
              `세 근의 합은 $\\dfrac{1}{\\alpha}+\\dfrac{1}{\\beta}+\\dfrac{1}{\\gamma}=\\dfrac{${S2}}{${S3}}=${s2 / s3}$`,
              `두 근끼리의 곱의 합은 $\\dfrac{1}{\\alpha\\beta}+\\dfrac{1}{\\beta\\gamma}+\\dfrac{1}{\\gamma\\alpha}=\\dfrac{${S1}}{${S3}}=${s1 / s3}$`,
              `세 근의 곱은 $\\dfrac{1}{${S3}}=${1 / s3}$`,
            ]
          : [
              `세 근의 합은 $${k}(${S1})=${k * s1}$`,
              `두 근끼리의 곱의 합은 $${k * k}(${S2})=${k * k * s2}$`,
              `세 근의 곱은 $${k ** 3}${S3}=${k ** 3 * s3}$`,
            ];
      return {
        content: `삼차방정식 $${poly}=0$의 세 근을 $\\alpha$, $\\beta$, $\\gamma$${ira("\\gamma")} 할 때, ${roots}${eul(last)} ${tail} 이때 상수 $a$, $b$, $c$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          vietaLine(s1, s2, s3),
          ...lines,
          `따라서 $a=${A}$, $b=${B}$, $c=${C}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, kind, s1, s2, s3, k, exprId },
      };
    });
  return attempt<Body>((): Body | null => {
    const [u, v, w] = distinctInts(rng, -3, 4, 3).sort((x, y) => x - y) as [
      number,
      number,
      number,
    ];
    const K = nz(rng, -6, 6);
    const g = fromRoots([u, v, w]);
    const f = [g[0]! + K, g[1]!, g[2]!, g[3]!];
    const ans = u * v * w - K;
    const fk = (t: number): string => `f(${t})${plusConst(-K)}`;
    return {
      content: `$x^{3}$의 계수가 $1$인 삼차식 $f(x)$에 대하여 $f(${u})=f(${v})=f(${w})=${K}$${ga(String(K))} 성립할 때, 방정식 $f(x)=0$의 모든 근의 곱을 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `$${fk(u)}=${fk(v)}=${fk(w)}=0$이므로 삼차방정식 $f(x)${plusConst(-K)}=0$의 세 근이 $${u}$, $${v}$, $${w}$이다.`,
        `이때 $f(x)$의 $x^{3}$의 계수가 $1$이므로 $f(x)${plusConst(-K)}=${prodTex([u, v, w])}=${polyTex(g)}$`,
        `즉 $f(x)=${polyTex(f)}$이므로 근과 계수의 관계에 의하여 방정식 $f(x)=0$의 모든 근의 곱은 $${ans}$이다.`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, u, v, w, K },
    };
  });
}

// ───────────────────────────── 08 ─────────────────────────────
// 삼차방정식의 켤레근
// 꼴 0 (기본·대표): 유리수 계수 — 무리수 근의 켤레로 두 계수
// 꼴 1 (기본): 실수 계수 — 허근의 켤레로 나머지 두 근의 합(복소수 정답, 오답 넷)
// 꼴 2 (응용): 두 근이 주어진 유리수 계수 삼차식의 함숫값

function t08(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const p = randInt(rng, -3, 3);
      const r = pickOne(rng, [2, 3, 5, 6, 7]);
      const w = nz(rng, -4, 4);
      const N = p * p - r;
      const c0 = -w * N;
      const a = -(2 * p + w);
      const b = N + 2 * p * w;
      const [exprId, [et, ev]] = chooseOne(rng, [
        ["ab", a * b],
        ["a+b", a + b],
      ] as const);
      const root = surdTex(surd(p, 1, r));
      const conj = surdTex(surd(p, -1, r));
      return {
        content: `삼차방정식 $x^{3}+ax^{2}+bx${plusConst(c0)}=0$의 한 근이 $${root}$일 때, 유리수 $a$, $b$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `계수가 유리수이므로 $${root}$${ga(root)} 근이면 $${conj}$도 근이다.`,
          `나머지 한 근을 $\\gamma$${ira("\\gamma")} 하면 세 근의 곱에서 $(${root})(${conj})\\gamma=${-c0}$, 즉 $${coefPrefix(N)}\\gamma=${-c0}$이므로 $\\gamma=${w}$`,
          `세 근의 합에서 $(${root})+(${conj})+${paren(w)}=-a$이므로 $a=${a}$`,
          `두 근끼리의 곱의 합에서 $(${root})(${conj})+${paren(w)}\\{(${root})+(${conj})\\}=b$이므로 $b=${b}$`,
          `따라서 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, p, r, w, exprId },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const p = randInt(rng, -3, 3);
      const s = pickOne(rng, [1, 2, 3, 4, 5]);
      const sg = pickOne(rng, [1, -1]);
      const w = nz(rng, -4, 4);
      const N = p * p + s;
      const c0 = -w * N;
      const z = surdTex(surd(p, sg, -s));
      const zc = surdTex(surd(p, -sg, -s));
      const ans = surdTex(surd(p + w, -sg, -s));
      // 틀리기 쉬운 자리: 켤레를 안 씀 · 나머지 실근을 빠뜨림 · 그 부호 · 세 근을 다 더함 · 전체 부호
      const distractors = pickDistractors(rng, ans, [
        surdTex(surd(p + w, sg, -s)),
        zc,
        surdTex(surd(p - w, -sg, -s)),
        ...(2 * p + w === 0 ? [] : [String(2 * p + w)]),
        surdTex(surd(-(p + w), sg, -s)),
      ]);
      if (distractors === null) return null;
      return {
        content: `삼차방정식 $x^{3}+ax^{2}+bx${plusConst(c0)}=0$의 한 근이 $${z}$일 때, 나머지 두 근의 합을 구하시오. (단, $a$, $b$는 실수이다.)`,
        answer: $(ans),
        solution: [
          `계수가 실수이므로 $${z}$${ga(z)} 근이면 $${zc}$도 근이다.`,
          `나머지 한 근을 $\\gamma$${ira("\\gamma")} 하면 세 근의 곱에서 $(${z})(${zc})\\gamma=${-c0}$, 즉 $${coefPrefix(N)}\\gamma=${-c0}$이므로 $\\gamma=${w}$`,
          `따라서 나머지 두 근의 합은 $(${zc})+${paren(w)}=${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, p, s, sg, w },
        distractors,
      };
    });
  return attempt<Body>((): Body | null => {
    const u = randInt(rng, -3, 3);
    const p = randInt(rng, -3, 3);
    const r = pickOne(rng, [2, 3, 5, 6, 7]);
    const k = randInt(rng, -3, 3);
    if (k === u) return null;
    const quad = [p * p - r, -2 * p, 1];
    const qk = (k - p) ** 2 - r;
    const ans = (k - u) * qk;
    const root = surdTex(surd(p, -1, r));
    const conj = surdTex(surd(p, 1, r));
    return {
      content: `계수가 유리수이고 $x^{3}$의 계수가 $1$인 삼차방정식 $f(x)=0$의 두 근이 $${u}$, $${root}$일 때, $f(${k})$의 값을 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `계수가 유리수이므로 $${root}$${ga(root)} 근이면 $${conj}$도 근이다.`,
        `즉 $f(x)=${factorParen(u)}\\{x-(${root})\\}\\{x-(${conj})\\}=${factorParen(u)}(${polyTex(quad)})$`,
        `따라서 $f(${k})=${paren(k - u)}\\times ${paren(qk)}=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, u, p, r, k },
    };
  });
}

// ───────────────────────────── 09 ─────────────────────────────
// 삼차방정식의 활용 — 변수의 뜻이 범위를 준다
// 꼴 0 (기본·대표): 모서리가 x, x+p, x+q 인 직육면체의 부피
// 꼴 1 (심화하): 원기둥의 반지름을 늘이고 높이를 줄여도 부피가 같다
// 꼴 2 (응용): 정육면체에 기둥 모양 구멍을 뚫은 뒤 남은 부피

/** 꼴 1 의 (반지름, 높이, 늘인 길이) — 늘인 길이가 자연수인 것만(모듈이 뜰 때 한 번 센다). */
const CYLINDERS: readonly (readonly [number, number, number])[] = (() => {
  const out: [number, number, number][] = [];
  for (let r = 1; r <= 12; r += 1) {
    for (let h = 2; h <= 20; h += 1) {
      const D = h * h + 4 * r * h;
      if (!isSquare(D)) continue;
      const x = (h - 2 * r + Math.round(Math.sqrt(D))) / 2;
      if (Number.isInteger(x) && x > 0 && x < h) out.push([r, h, x]);
    }
  }
  return out;
})();

function t09(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const [p, qq] = distinctInts(rng, 1, 4, 2).sort((a, b) => a - b) as [
        number,
        number,
      ];
      const x0 = randInt(rng, 2, 6);
      const V = x0 * (x0 + p) * (x0 + qq);
      const f = [-V, p * qq, p + qq, 1];
      const quad = polyTex(divMod(f, [-x0, 1]).q);
      const qeq = `${quad}=0`;
      return {
        content: `가로의 길이, 세로의 길이, 높이가 각각 $x$, $x+${p}$, $x+${qq}$인 직육면체의 부피가 $${V}$일 때, $x$의 값을 구하시오.`,
        answer: numAnswer(x0),
        solution: [
          `$x(x+${p})(x+${qq})=${V}$이므로 $${polyTex(f)}=0$`,
          `조립제법을 이용하여 인수분해하면 $${factorParen(x0)}(${quad})=0$`,
          `이때 $x>0$이고 이차방정식 $${qeq}$${eun(qeq)} 양의 실근을 갖지 않으므로 $x=${x0}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, p, q: qq, V },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const [r, h, x0] = pickOne(rng, CYLINDERS);
      const xneg = h - 2 * r - x0;
      const quad = polyTex([-(2 * r * h - r * r), -(h - 2 * r), 1]);
      return {
        content: `밑면의 반지름의 길이가 $${r}$, 높이가 $${h}$인 원기둥이 있다. 이 원기둥의 밑면의 반지름의 길이를 $x$만큼 늘이고 높이를 $x$만큼 줄였더니 부피가 처음과 같았다. 이때 새로운 원기둥의 밑면의 반지름의 길이를 구하시오. (단, $0<x<${h}$)`,
        answer: numAnswer(r + x0),
        solution: [
          `$\\pi\\times ${r}^{2}\\times ${h}=\\pi(${r}+x)^{2}(${h}-x)$이므로`,
          `$${r * r * h}=(${r}+x)^{2}(${h}-x)$, 즉 $x^{3}${termIf(2 * r - h, "x^{2}")}${termIf(r * r - 2 * r * h, "x")}=0$`,
          `$x(${quad})=0$, $${prodTex([0, x0, xneg])}=0$`,
          `이때 $0<x<${h}$이므로 $x=${x0}$`,
          `따라서 새로운 원기둥의 밑면의 반지름의 길이는 $${r}+${x0}=${r + x0}$`,
        ].join("\n"),
        difficulty: "심화하",
        facts: { mode, r, h },
      };
    });
  return attempt<Body>((): Body | null => {
    const a = randInt(rng, 1, 4);
    const b = randInt(rng, 1, 4);
    const m = Math.max(a, b);
    const x0 = randInt(rng, m + 1, m + 4);
    const ab = a * b;
    const V = x0 ** 3 - ab * x0;
    const quad = polyTex([x0 * x0 - ab, x0, 1]);
    const qeq = `${quad}=0`;
    return {
      content: `한 모서리의 길이가 $x$인 정육면체에서 밑면의 가로의 길이가 $${a}$, 세로의 길이가 $${b}$이고 높이가 $x$인 직육면체 모양의 구멍을 위아래로 뚫었더니 남은 부분의 부피가 $${V}$${ga(String(V))} 되었다. 이때 $x$의 값을 구하시오. (단, $x>${m}$)`,
      answer: numAnswer(x0),
      solution: [
        `$x^{3}${term(-ab, "x")}=${V}$이므로 $x^{3}${term(-ab, "x")}${plusConst(-V)}=0$`,
        `조립제법을 이용하여 인수분해하면 $${factorParen(x0)}(${quad})=0$`,
        `이때 $x>${m}$이고 이차방정식 $${qeq}$${eun(qeq)} 양의 실근을 갖지 않으므로 $x=${x0}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, a, b, V },
    };
  });
}

// ───────────────────────────── 10 ─────────────────────────────
// 일차방정식과 이차방정식으로 이루어진 연립이차방정식
// 꼴 0 (기본·대표): x±y=p, x²+y²=q — 대입해 x 의 이차방정식
// 꼴 1 (응용): x+my=n, x²+kxy=c — 두 해 가운데 식의 값의 최대·최소
// 꼴 2 (심화하): 두 연립방정식의 공통인 해 — 조건 a>0 으로 한 쌍을 고른다

function t10(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const lt = randInt(rng, 0, 1);
      const x1 = nz(rng, -5, 5);
      const y1 = nz(rng, -5, 5);
      const p = lt === 0 ? x1 - y1 : x1 + y1;
      if (p === 0) return null;
      const other = lt === 0 ? [-y1, -x1] : [y1, x1];
      if (other[0] === x1 && other[1] === y1) return null;
      const qq = x1 * x1 + y1 * y1;
      const lin = lt === 0 ? `x-y=${p}` : `x+y=${p}`;
      const ytex = lt === 0 ? polyTex([-p, 1]) : polyTex([p, -1]);
      const c0 = (p * p - qq) / 2;
      const xs = [x1, other[0]!].sort((a, b) => a - b);
      const kind = randInt(rng, 0, 1);
      const et = kind === 0 ? "ab" : lt === 0 ? "a+b" : "a-b";
      const val = (x: number, y: number): number =>
        kind === 0 ? x * y : lt === 0 ? x + y : x - y;
      const v1 = val(x1, y1);
      const v2 = val(other[0]!, other[1]!);
      const ans = Math.max(v1, v2);
      return {
        content: `연립방정식 $${cases(lin, `x^{2}+y^{2}=${qq}`)}$의 해를 $x=a$, $y=b$${ira("y=b")} 할 때, $${et}$${kind === 0 ? "의 값을" : "의 최댓값을"} 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `$${lin}$에서 $y=${ytex}$이므로 이것을 $x^{2}+y^{2}=${qq}$에 대입하면`,
          `$x^{2}+(${ytex})^{2}=${qq}$, 즉 $${polyTex([c0, -p, 1])}=0$`,
          `$${prodTex(xs)}=0$에서 $x=${xs[0]}$ 또는 $x=${xs[1]}$`,
          `$y=${ytex}$이므로 $x=${x1}$, $y=${y1}$ 또는 $x=${other[0]}$, $y=${other[1]}$`,
          kind === 0
            ? `따라서 $ab=${ans}$`
            : `따라서 $${et}=${v1}$ 또는 $${et}=${v2}$이므로 $${et}$의 최댓값은 $${ans}$이다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, lt, p, q: qq, kind },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const m = pickOne(rng, [1, 2, -1, -2, 3]);
      const k = pickOne(rng, [1, 2, 3, -1, -2]);
      const n = nz(rng, -4, 4);
      const L = m * m - k * m;
      if (L === 0) return null;
      const B = k * n - 2 * m * n;
      if (B % L !== 0) return null;
      const S = -B / L;
      const y1 = randInt(rng, -4, 4);
      const y2 = S - y1;
      if (y1 === y2) return null;
      const c = n * n - L * y1 * y2;
      if (c === 0) return null;
      const ys = [y1, y2].sort((a, b) => a - b) as [number, number];
      const sols = ys.map((y) => [n - m * y, y] as const);
      const [exprId, [et, f]] = chooseOne(rng, [
        ["a-b", (x: number, y: number): number => x - y],
        ["a+b", (x: number, y: number): number => x + y],
        ["ab", (x: number, y: number): number => x * y],
      ] as const);
      const vals = sols.map(([x, y]) => f(x, y));
      if (vals[0] === vals[1]) return null;
      const askMax = randInt(rng, 0, 1) === 0;
      const ask = askMax ? "최댓값" : "최솟값";
      const ans = askMax ? Math.max(...vals) : Math.min(...vals);
      const lin = `x${term(m, "y")}=${n}`;
      const quadEq = `x^{2}${term(k, "xy")}=${c}`;
      const xOfY = polyTex([n, -m], "y");
      const raw = [n * n - c, B, L];
      const g = Math.abs(raw.reduce((x, y) => gcd(x, y)));
      const sgn = L > 0 ? 1 : -1;
      const norm = raw.map((x) => (x / g) * sgn);
      return {
        content: `연립방정식 $${cases(lin, quadEq)}$의 해를 $x=a$, $y=b$${ira("y=b")} 할 때, $${et}$의 ${ask}을 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `$${lin}$에서 $x=${xOfY}$이므로 이것을 $${quadEq}$에 대입하면`,
          `$(${xOfY})^{2}${term(k, `y(${xOfY})`)}=${c}$`,
          `정리하면 $${polyTex(norm, "y")}=0$, $${coefPrefix(norm[2]!)}${prodTex(ys, "y")}=0$`,
          `$y=${ys[0]}$ 또는 $y=${ys[1]}$`,
          `$x=${xOfY}$이므로 $x=${sols[0]![0]}$, $y=${ys[0]}$ 또는 $x=${sols[1]![0]}$, $y=${ys[1]}$`,
          `따라서 $${et}=${vals[0]}$ 또는 $${et}=${vals[1]}$이므로 $${et}$의 ${ask}은 $${ans}$이다.`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, m, k, n, c, exprId, askMax: askMax ? 1 : 0 },
      };
    });
  return attempt<Body>((): Body | null => {
    const x1 = nz(rng, -5, 5);
    const y1 = nz(rng, -5, 5);
    const p = x1 - y1;
    if (p === 0 || x1 + y1 === 0) return null;
    const qq = x1 * x1 + y1 * y1;
    const [xs, ys] = x1 + y1 > 0 ? [x1, y1] : [-y1, -x1];
    const a = xs + ys;
    const b = nz(rng, -4, 4);
    const n = xs + b * ys;
    if (a + b === 0) return null;
    const c0 = (p * p - qq) / 2;
    const xr = [x1, -y1].sort((u, v) => u - v);
    return {
      content: `두 연립방정식 $${cases(`x-y=${p}`, "x+y=a")}$, $${cases(`x^{2}+y^{2}=${qq}`, `x+by=${n}`)}$의 공통인 해가 존재할 때, 실수 $a$, $b$에 대하여 $a+b$의 값을 구하시오. (단, $a>0$)`,
      answer: numAnswer(a + b),
      solution: [
        `두 연립방정식의 공통인 해는 연립방정식 $${cases(`x-y=${p}`, `x^{2}+y^{2}=${qq}`)}$의 해이다.`,
        `$x-y=${p}$에서 $y=${polyTex([-p, 1])}$이므로 이것을 $x^{2}+y^{2}=${qq}$에 대입하여 정리하면 $${polyTex([c0, -p, 1])}=0$`,
        `$${prodTex(xr)}=0$에서 $x=${xr[0]}$ 또는 $x=${xr[1]}$`,
        `즉 $x=${x1}$, $y=${y1}$ 또는 $x=${-y1}$, $y=${-x1}$`,
        `이때 $a=x+y>0$이므로 $x=${xs}$, $y=${ys}$`,
        `$x+y=a$, $x+by=${n}$에 대입하면 $a=${a}$, $${linTex([[ys, "b"]], xs)}=${n}$에서 $b=${b}$`,
        `따라서 $a+b=${a + b}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, p, q: qq, n },
    };
  });
}

// ───────────────────────────── 11 ─────────────────────────────
// 두 이차방정식으로 이루어진 연립이차방정식
// 꼴 0 (기본·대표): 한 식을 인수분해 — 정수인 해의 xy
// 꼴 1 (응용): 한 갈래는 해가 없다 — a²+b²
// 꼴 2 (응용): 갈래마다 xy — 최솟값·최댓값

function t11(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  const quadXY = (p: number, r: number): string =>
    `x^{2}${termIf(-(p + r), "xy")}${term(p * r, "y^{2}")}`;
  const lineY = (p: number): string => `x=${coefPrefix(p)}y`;
  const fac = (p: number, r: number): string =>
    `(x${term(-p, "y")})(x${term(-r, "y")})`;
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const [p, qv] = distinctInts(rng, -3, 3, 2, { nonzero: true }) as [
        number,
        number,
      ];
      const y0 = randInt(rng, 1, 3);
      const c = (p * p + 1) * y0 * y0;
      const other = q(c, qv * qv + 1);
      if (other.d === 1 && isSquare(other.n)) return null;
      const E1 = quadXY(p, qv);
      const ans = p * y0 * y0;
      const lp = lineY(p);
      const lq = lineY(qv);
      return {
        content: `연립방정식 $${cases(`${E1}=0`, `x^{2}+y^{2}=${c}`)}$의 해 중 $x$, $y$${ga("y")} 모두 정수인 것에 대하여 $xy$의 값을 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `$${E1}=0$에서 $${fac(p, qv)}=0$이므로 $${lp}$ 또는 $${lq}$`,
          `(ⅰ) $${lp}$${eul(lp)} $x^{2}+y^{2}=${c}$에 대입하면 $${p * p + 1}y^{2}=${c}$, $y=\\pm ${y0}$`,
          `이때 $x=${p * y0}$, $y=${y0}$ 또는 $x=${-p * y0}$, $y=${-y0}$`,
          `(ⅱ) $${lq}$${eul(lq)} $x^{2}+y^{2}=${c}$에 대입하면 $${qv * qv + 1}y^{2}=${c}$, $y=${pmSqrtTex(c, qv * qv + 1)}$이므로 $y$${eun("y")} 정수가 아니다.`,
          `(ⅰ), (ⅱ)에서 $x$, $y$${ga("y")} 모두 정수인 해는 (ⅰ)의 두 쌍이므로 $xy=${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, p, q: qv, c },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const [p, qv, r] = distinctInts(rng, -3, 3, 3, { nonzero: true }) as [
        number,
        number,
        number,
      ];
      const y0 = randInt(rng, 1, 3);
      const kq = (qv - p) * (qv - r);
      const c = kq * y0 * y0;
      const E1 = quadXY(p, qv);
      const E2 = quadXY(p, r);
      const ans = (qv * qv + 1) * y0 * y0;
      const lp = lineY(p);
      const lq = lineY(qv);
      return {
        content: `연립방정식 $${cases(`${E1}=0`, `${E2}=${c}`)}$의 해를 $x=a$, $y=b$${ira("y=b")} 할 때, $a^{2}+b^{2}$의 값을 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `$${E1}=0$에서 $${fac(p, qv)}=0$이므로 $${lp}$ 또는 $${lq}$`,
          `(ⅰ) $${lp}$${eul(lp)} $${E2}=${c}$에 대입하면 $0=${c}$이므로 이를 만족시키는 $x$, $y$의 값은 존재하지 않는다.`,
          `(ⅱ) $${lq}$${eul(lq)} $${E2}=${c}$에 대입하면 $${coefPrefix(kq)}y^{2}=${c}$, $y=\\pm ${y0}$`,
          `즉 $x=${qv * y0}$, $y=${y0}$ 또는 $x=${-qv * y0}$, $y=${-y0}$`,
          `따라서 $a^{2}+b^{2}=${ans}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, p, q: qv, r, c },
      };
    });
  return attempt<Body>((): Body | null => {
    const [p, qv] = distinctInts(rng, -3, 3, 2, { nonzero: true }) as [
      number,
      number,
    ];
    const t = randInt(rng, 1, 2);
    const c = (p * p + 1) * (qv * qv + 1) * t;
    if (c > 120) return null;
    const v1 = p * (qv * qv + 1) * t;
    const v2 = qv * (p * p + 1) * t;
    if (v1 === v2) return null;
    const askMin = randInt(rng, 0, 1) === 0;
    const ask = askMin ? "최솟값" : "최댓값";
    const ans = askMin ? Math.min(v1, v2) : Math.max(v1, v2);
    const E1 = quadXY(p, qv);
    const lp = lineY(p);
    const lq = lineY(qv);
    return {
      content: `연립방정식 $${cases(`${E1}=0`, `x^{2}+y^{2}=${c}`)}$의 해 $x$, $y$에 대하여 $xy$의 ${ask}을 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `$${E1}=0$에서 $${fac(p, qv)}=0$이므로 $${lp}$ 또는 $${lq}$`,
        `(ⅰ) $${lp}$일 때, $${p * p + 1}y^{2}=${c}$이므로 $y^{2}=${c / (p * p + 1)}$, $xy=${coefPrefix(p)}y^{2}=${v1}$`,
        `(ⅱ) $${lq}$일 때, $${qv * qv + 1}y^{2}=${c}$이므로 $y^{2}=${c / (qv * qv + 1)}$, $xy=${coefPrefix(qv)}y^{2}=${v2}$`,
        `(ⅰ), (ⅱ)에서 $xy$의 ${ask}은 $${ans}$이다.`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, p, q: qv, c, askMin: askMin ? 1 : 0 },
    };
  });
}

// ───────────────────────────── 12 ─────────────────────────────
// x, y에 대한 대칭식인 연립이차방정식 — 합·곱 치환
// 꼴 0 (기본·대표): x²+y², xy 가 주어질 때 — x+y 를 먼저
// 꼴 1 (심화하): xy+x+y, x²+xy+y² — u=x+y, v=xy 의 연립

function t12(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const [u, v] = distinctInts(rng, -5, 5, 2, { nonzero: true }) as [
        number,
        number,
      ];
      if (u + v === 0) return null;
      const S = u * u + v * v;
      const P = u * v;
      const s = Math.abs(u + v);
      const pos = u + v === s ? [u, v] : [-u, -v];
      const neg = pos.map((x) => -x);
      const kind = randInt(rng, 0, 1);
      const [a1, b1] = pos as [number, number];
      const cube = a1 ** 3 + b1 ** 3;
      const d = Math.abs(a1 ** 3 - b1 ** 3);
      const ans = kind === 0 ? Math.abs(cube) : 2 * d;
      const branch = (i: number, sum: number, rts: number[]): string =>
        `(${ROMAN[i]}) $x+y=${sum}$, $xy=${P}$일 때, $x$, $y$${eun("y")} 이차방정식 $t^{2}${term(-sum, "t")}${plusConst(P)}=0$의 두 근이므로 $${prodTex(rts, "t")}=0$에서 $x=${rts[0]}$, $y=${rts[1]}$ 또는 $x=${rts[1]}$, $y=${rts[0]}$`;
      return {
        content:
          kind === 0
            ? `연립방정식 $${cases(`x^{2}+y^{2}=${S}`, `xy=${P}`)}$의 해 $x$, $y$에 대하여 $x^{3}+y^{3}$의 최댓값을 구하시오.`
            : `연립방정식 $${cases(`x^{2}+y^{2}=${S}`, `xy=${P}`)}$의 해 $x$, $y$에 대하여 $x^{3}-y^{3}$의 최댓값을 $M$, 최솟값을 $m$${ira("m")} 할 때, $M-m$의 값을 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `$x^{2}+y^{2}=(x+y)^{2}-2xy=(x+y)^{2}${plusConst(-2 * P)}=${S}$이므로 $(x+y)^{2}=${s * s}$, 즉 $x+y=\\pm ${s}$`,
          branch(0, s, pos),
          branch(1, -s, neg),
          kind === 0
            ? `(ⅰ), (ⅱ)에서 $x^{3}+y^{3}$의 값은 $${cube}$ 또는 $${-cube}$이므로 최댓값은 $${ans}$이다.`
            : `(ⅰ), (ⅱ)에서 $x^{3}-y^{3}$의 값은 $${d}$ 또는 $${-d}$이므로 $M=${d}$, $m=${-d}$이고 $M-m=${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, S, P, kind },
      };
    });
  return attempt<Body>((): Body | null => {
    const u1 = randInt(rng, -4, 3);
    const u2 = -1 - u1;
    const A = randInt(rng, -8, 8);
    const B = u1 * u1 + u1 - A;
    const v1 = A - u1;
    const v2 = A - u2;
    const d1 = u1 * u1 - 4 * v1;
    const d2 = u2 * u2 - 4 * v2;
    const reals = [d1, d2].filter((d) => d >= 0);
    if (reals.length === 0 || reals.some((d) => !isSquare(d))) return null;
    const ans = Math.max(...reals.map((d) => Math.sqrt(d)));
    if (ans === 0) return null;
    const branch = (i: number, u: number, v: number, d: number): string => {
      const head = `(${ROMAN[i]}) $x+y=${u}$, $xy=${v}$일 때, $x$, $y$${eun("y")} 이차방정식 $t^{2}${termIf(-u, "t")}${plusConst(v)}=0$의 두 근이다.`;
      if (d < 0)
        return `${head} 이 이차방정식의 판별식이 $${d}<0$이므로 실수인 해가 없다.`;
      const sq = Math.sqrt(d);
      return `${head} $${prodTex([(u - sq) / 2, (u + sq) / 2], "t")}=0$이므로 $|a-b|=${sq}$`;
    };
    const uv = "xy=v";
    return {
      content: `연립방정식 $${cases(`xy+x+y=${A}`, `x^{2}+xy+y^{2}=${B}`)}$의 해를 $x=a$, $y=b$${ira("y=b")} 할 때, $|a-b|$의 최댓값을 구하시오. (단, $a$, $b$는 실수이다.)`,
      answer: numAnswer(ans),
      solution: [
        `$x+y=u$, $${uv}$${ro(uv)} 놓으면 $u+v=${A}$, $u^{2}-v=${B}$`,
        `두 식을 더하면 $u^{2}+u${plusConst(-(A + B))}=0$, $${prodTex([u1, u2], "u")}=0$`,
        `즉 $u=${u1}$, $v=${v1}$ 또는 $u=${u2}$, $v=${v2}$`,
        branch(0, u1, v1, d1),
        branch(1, u2, v2, d2),
        `(ⅰ), (ⅱ)에서 $|a-b|$의 최댓값은 $${ans}$이다.`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, A, B },
    };
  });
}

const floorQ = (x: Q): number => Math.floor(x.n / x.d);

// ───────────────────────────── 13 ─────────────────────────────
// 연립이차방정식의 해의 조건 — 일차식을 대입한 이차방정식의 판별식
// 꼴 0 (기본·대표): 해가 오직 한 쌍 — 판별식 0
// 꼴 1 (응용): 합·곱이 주어진 연립방정식의 해가 실수 — 판별식 ≥ 0
// 꼴 2 (응용): 실근이 없다 — 판별식 < 0 인 정수의 최솟값

function t13(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const m = pickOne(rng, [1, -1, 2, -2]);
      const s = randInt(rng, 1, 3);
      const w = 1 + m * m;
      const a = w * s;
      const r = w * s * s;
      const lx = polyTex([0, m]);
      const lin = `${lx}-y=a`;
      return {
        content: `연립방정식 $${cases(lin, `x^{2}+y^{2}=${r}`)}$의 해가 오직 한 쌍이 되도록 하는 양수 $a$의 값을 구하시오.`,
        answer: numAnswer(a),
        solution: [
          `$${lin}$에서 $y=${lx}-a$이므로 이것을 $x^{2}+y^{2}=${r}$에 대입하면`,
          `$x^{2}+(${lx}-a)^{2}=${r}$, 즉 $${w}x^{2}${term(-2 * m, "ax")}+a^{2}${plusConst(-r)}=0$`,
          `이 이차방정식의 판별식을 $D$라 하면 $\\dfrac{D}{4}=${coefPrefix(m * m)}a^{2}-${w}(a^{2}${plusConst(-r)})=0$`,
          `즉 $a^{2}=${a * a}$이고 $a>0$이므로 $a=${a}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, m, r },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const m = nz(rng, -3, 3);
      const c = randInt(rng, -6, 8);
      const ext = q(m * m - c, 2 * m);
      const isMax = m > 0;
      const ask = isMax ? "최댓값" : "최솟값";
      const e1 = `x+y=2(a${plusConst(-m)})`;
      const e2 = `xy=a^{2}${plusConst(c)}`;
      return {
        content: `연립방정식 $${cases(e1, e2)}$의 해 $x$, $y$${ga("y")} 모두 실수일 때, 실수 $a$의 ${ask}을 구하시오.`,
        answer: qAnswer(ext),
        solution: [
          `$x$, $y$${eun("y")} 이차방정식 $t^{2}-2(a${plusConst(-m)})t+a^{2}${plusConst(c)}=0$의 두 실근이므로 이 이차방정식의 판별식을 $D$라 하면`,
          `$\\dfrac{D}{4}=(a${plusConst(-m)})^{2}-${c === 0 ? "a^{2}" : `(a^{2}${plusConst(c)})`}\\ge 0$`,
          `$${linTex([[-2 * m, "a"]], m * m - c)}\\ge 0$이므로 $a${isMax ? "\\le" : "\\ge"} ${qTex(ext)}$`,
          `따라서 실수 $a$의 ${ask}은 $${qTex(ext)}$이다.`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, m, c },
      };
    });
  return attempt<Body>((): Body | null => {
    const p = pickOne(rng, [1, 2, 3, -1, -2]);
    const u = randInt(rng, -4, 4);
    const v = randInt(rng, 1, 3);
    const g = u - v * p;
    if (g === 0) return null;
    const bound = q(g * g, 4 * v);
    const ans = floorQ(bound) + 1;
    const lx = polyTex([0, p]);
    const lin = `${lx}-y=k`;
    const quadL = `x^{2}${termIf(u, "x")}${term(-v, "y")}`;
    return {
      content: `연립방정식 $${cases(lin, `${quadL}=0`)}$의 실근이 존재하지 않도록 하는 정수 $k$의 최솟값을 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `$${lin}$에서 $y=${lx}-k$이므로 이것을 $${quadL}=0$에 대입하면`,
        `$x^{2}${termIf(u, "x")}${term(-v, `(${lx}-k)`)}=0$, 즉 $x^{2}${term(g, "x")}${term(v, "k")}=0$`,
        g % 2 === 0
          ? `이 이차방정식의 판별식을 $D$라 하면 $\\dfrac{D}{4}=${paren(g / 2)}^{2}-${coefPrefix(v)}k<0$`
          : `이 이차방정식의 판별식을 $D$라 하면 $D=${paren(g)}^{2}-${4 * v}k<0$`,
        `즉 $k>${qTex(bound)}$`,
        `따라서 정수 $k$의 최솟값은 $${ans}$이다.`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, p, u, v },
    };
  });
}

// ───────────────────────────── 14 ─────────────────────────────
// 공통인 근을 갖는 방정식
// 꼴 0 (기본·대표): 계수 자리를 바꾼 두 이차방정식 — 두 식이 같아지는 경우를 뺀다
// 꼴 1 (기본): 일차항 계수만 다른 두 이차방정식 — 빼면 공통인 근이 바로 나온다
// 꼴 2 (응용): 오직 한 개의 공통인 근 — 두 식이 일치하는 k 를 뺀다

function t14(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const c = nz(rng, -6, 6);
      const k = -1 - c;
      const [exprId, [et, ev]] = chooseOne(rng, [
        ["k+\\alpha", k + 1],
        ["k\\alpha", k],
        ["k-\\alpha", k - 1],
      ] as const);
      const e1 = `x^{2}+kx${plusConst(c)}=0`;
      const e2 = `x^{2}${term(c, "x")}+k=0`;
      return {
        content: `서로 다른 두 이차방정식 $${e1}$, $${e2}$${ga(e2)} 공통인 근 $\\alpha$${eul("\\alpha")} 가질 때, $${et}$의 값을 구하시오. (단, $k$는 실수이다.)`,
        answer: numAnswer(ev),
        solution: [
          `공통인 근이 $\\alpha$이므로 $\\alpha^{2}+k\\alpha${plusConst(c)}=0$ ……㉠, $\\alpha^{2}${term(c, "\\alpha")}+k=0$ ……㉡`,
          `㉠-㉡을 하면 $(k${plusConst(-c)})\\alpha${plusConst(c)}-k=0$, $(k${plusConst(-c)})(\\alpha-1)=0$이므로 $k=${c}$ 또는 $\\alpha=1$`,
          `(ⅰ) $k=${c}$일 때, 두 이차방정식이 일치하므로 서로 다른 두 이차방정식이라는 조건을 만족시키지 않는다.`,
          `(ⅱ) $\\alpha=1$일 때, ㉠에 대입하면 $1+k${plusConst(c)}=0$이므로 $k=${k}$`,
          `(ⅰ), (ⅱ)에서 $k=${k}$, $\\alpha=1$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, c, exprId },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const [p1, p2] = distinctInts(rng, -4, 4, 2) as [number, number];
      const al = nz(rng, -3, 3);
      const m = nz(rng, -4, 4);
      const q1 = -al * al - (m + p1) * al;
      const q2 = q1 + (p1 - p2) * al;
      if (m + al === 0) return null;
      const e1 = `x^{2}${linTerm(1, p1, "m", "x")}${plusConst(q1)}=0`;
      const e2 = `x^{2}${linTerm(1, p2, "m", "x")}${plusConst(q2)}=0`;
      return {
        content: `두 이차방정식 $${e1}$, $${e2}$${ga(e2)} 공통인 근 $\\alpha$${eul("\\alpha")} 가질 때, 실수 $m$에 대하여 $m+\\alpha$의 값을 구하시오.`,
        answer: numAnswer(m + al),
        solution: [
          `공통인 근이 $\\alpha$이므로 $\\alpha^{2}${linTerm(1, p1, "m", "\\alpha")}${plusConst(q1)}=0$ ……㉠, $\\alpha^{2}${linTerm(1, p2, "m", "\\alpha")}${plusConst(q2)}=0$ ……㉡`,
          `㉠-㉡을 하면 $${term(p1 - p2, "\\alpha", true)}${plusConst(q1 - q2)}=0$이므로 $\\alpha=${al}$`,
          `$\\alpha=${al}$${eul(String(al))} ㉠에 대입하면 $${al * al}${linTerm(al, p1 * al, "m", "")}${plusConst(q1)}=0$이므로 $m=${m}$`,
          `따라서 $m+\\alpha=${m + al}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, p1, p2, q1, q2 },
      };
    });
  return attempt<Body>((): Body | null => {
    const w = randInt(rng, -3, 3);
    const P = randInt(rng, -3, 3);
    if (w + P === 0) return null;
    const k0 = nz(rng, -4, 4);
    const Q = -k0 * (w + P) - w * w;
    const R = randInt(rng, -4, 4);
    if (R === k0) return null;
    const sCoef = P - w + R;
    const sConst = Q + R * w;
    const e1 = `x^{2}+kx${termIf(P, "k")}${plusConst(Q)}=0`;
    const e2 = `x^{2}${termIf(R, "x")}-k^{2}${termIf(sCoef, "k")}${plusConst(sConst)}=0`;
    const al = polyTex([-w, -1], "k");
    const kr = R === 0 ? "k" : `(k${plusConst(-R)})`;
    return {
      content: `두 이차방정식 $${e1}$, $${e2}$${ga(e2)} 오직 한 개의 공통인 근을 가질 때, 실수 $k$의 값을 구하시오.`,
      answer: numAnswer(k0),
      solution: [
        `공통인 근을 $\\alpha$${ira("\\alpha")} 하면`,
        `$\\alpha^{2}+k\\alpha${termIf(P, "k")}${plusConst(Q)}=0$ ……㉠, $\\alpha^{2}${termIf(R, "\\alpha")}-k^{2}${termIf(sCoef, "k")}${plusConst(sConst)}=0$ ……㉡`,
        `㉠-㉡을 하면 $${kr}\\alpha+k^{2}${termIf(w - R, "k")}${plusConst(-R * w)}=0$, $${kr}(\\alpha+k${plusConst(w)})=0$이므로 $k=${R}$ 또는 $\\alpha=${al}$`,
        `(ⅰ) $k=${R}$일 때, 두 이차방정식이 일치하므로 주어진 조건을 만족시키지 않는다.`,
        `(ⅱ) $\\alpha=${al}$${eul(al)} ㉠에 대입하면 $(${al})^{2}+k(${al})${termIf(P, "k")}${plusConst(Q)}=0$`,
        `정리하면 $${linTex([[w + P, "k"]], w * w + Q)}=0$이므로 $k=${k0}$`,
        `(ⅰ), (ⅱ)에서 $k=${k0}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, w, P, Q, R },
    };
  });
}

// ───────────────────────────── 15 ─────────────────────────────
// 연립이차방정식의 활용
// 꼴 0 (기본·대표): 원 위에 네 꼭짓점이 있는 직사각형 — 대각선이 지름
// 꼴 1 (응용): 두 자리 자연수 — 자리를 바꾼 수와의 합이 x+y 를 준다
// 꼴 2 (응용): 두 원의 둘레의 합과 넓이의 합

function t15(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const [a, b, d] = pickOne(rng, [
        [3, 4, 5],
        [6, 8, 10],
        [5, 12, 13],
        [8, 15, 17],
        [9, 12, 15],
        [12, 16, 20],
        [7, 24, 25],
      ] as const);
      const longSide = randInt(rng, 0, 1) === 0;
      const side = longSide ? "긴" : "짧은";
      const ans = longSide ? b : a;
      const P = 2 * (a + b);
      const s = a + b;
      const ysub = `y=${s}-x`;
      return {
        content: `둘레의 길이가 $${P}$인 직사각형의 네 꼭짓점이 모두 지름의 길이가 $${d}$인 원 위에 있을 때, 이 직사각형의 ${side} 변의 길이를 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `직사각형의 가로, 세로의 길이를 각각 $x$, $y$${ira("y")} 하면 직사각형의 대각선이 원의 지름이므로`,
          `$${cases(`2(x+y)=${P}`, `x^{2}+y^{2}=${d * d}`)}$`,
          `$x+y=${s}$에서 $${ysub}$${eul(ysub)} $x^{2}+y^{2}=${d * d}$에 대입하여 정리하면 $x^{2}${term(-s, "x")}+${a * b}=0$`,
          `$${prodTex([a, b])}=0$이므로 $x=${a}$, $y=${b}$ 또는 $x=${b}$, $y=${a}$`,
          `따라서 직사각형의 ${side} 변의 길이는 $${ans}$이다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, P, d, longSide: longSide ? 1 : 0 },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const [x, y] = distinctInts(rng, 1, 9, 2) as [number, number];
      const big = x > y;
      const S = x * x + y * y;
      const s = x + y;
      const T = 11 * s;
      const [lo, hi] = [Math.min(x, y), Math.max(x, y)];
      const ysub = `y=${s}-x`;
      return {
        content: `어떤 두 자리 자연수의 십의 자리의 숫자와 일의 자리의 숫자의 제곱의 합은 $${S}$이다. 이 수와 이 수의 십의 자리의 숫자와 일의 자리의 숫자를 서로 바꾼 수를 더하면 $${T}$일 때, 이 두 자리 자연수를 구하시오. (단, 십의 자리의 숫자가 일의 자리의 숫자보다 ${big ? "크다" : "작다"}.)`,
        answer: numAnswer(10 * x + y),
        solution: [
          `처음 수의 십의 자리의 숫자를 $x$, 일의 자리의 숫자를 $y$${ira("y")} 하면`,
          `$${cases(`x^{2}+y^{2}=${S}`, `(10x+y)+(10y+x)=${T}`)}$`,
          `두 번째 식에서 $x+y=${s}$이므로 $${ysub}$${eul(ysub)} 첫 번째 식에 대입하여 정리하면 $x^{2}${term(-s, "x")}+${x * y}=0$`,
          `$${prodTex([lo, hi])}=0$이므로 $x=${lo}$, $y=${hi}$ 또는 $x=${hi}$, $y=${lo}$`,
          `이때 십의 자리의 숫자가 일의 자리의 숫자보다 ${big ? "크므로" : "작으므로"} $x=${x}$, $y=${y}$`,
          `따라서 처음 수는 $${10 * x + y}$이다.`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, S, T, big: big ? 1 : 0 },
      };
    });
  return attempt<Body>((): Body | null => {
    const [r1, r2] = distinctInts(rng, 1, 8, 2).sort((a, b) => a - b) as [
      number,
      number,
    ];
    const s = r1 + r2;
    const A = r1 * r1 + r2 * r2;
    const p = r1 * r2;
    return {
      content: `반지름의 길이가 서로 다른 두 원이 있다. 두 원의 둘레의 길이를 더하면 $${2 * s}\\pi$이고 넓이를 더하면 $${A}\\pi$일 때, 두 원의 반지름의 길이의 차를 구하시오.`,
      answer: numAnswer(r2 - r1),
      solution: [
        `작은 원과 큰 원의 반지름의 길이를 각각 $r_{1}$, $r_{2}$${ira("r_{2}")} 하면`,
        `$${cases(`2\\pi r_{1}+2\\pi r_{2}=${2 * s}\\pi`, `\\pi r_{1}^{2}+\\pi r_{2}^{2}=${A}\\pi`)}$`,
        `즉 $r_{1}+r_{2}=${s}$, $r_{1}^{2}+r_{2}^{2}=${A}$이므로 $r_{1}r_{2}=\\dfrac{(r_{1}+r_{2})^{2}-(r_{1}^{2}+r_{2}^{2})}{2}=${p}$`,
        `$r_{1}$, $r_{2}$${eun("r_{2}")} 이차방정식 $t^{2}${term(-s, "t")}+${p}=0$의 두 근이므로 $${prodTex([r1, r2], "t")}=0$`,
        `따라서 두 원의 반지름의 길이는 $${r1}$, $${r2}$이고 그 차는 $${r2 - r1}$이다.`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, s, A },
    };
  });
}

// ───────────────────────────── 16 ─────────────────────────────
// 방정식 x³=1, x³=-1의 허근의 성질
// 꼴 0 (기본·대표): ω 의 거듭제곱의 합 — ω³=±1 로 줄이고 ω²±ω+1=0
// 꼴 1 (응용): ω 와 켤레 ω̄ 의 식 — 합과 곱
// 꼴 2 (심화하): f(n)=ω^{an+b} 의 합 — 되풀이 주기

/** ω 의 식 `a+bω` — `sg` 는 ω³ 의 값(±1). ω² = -1 - sg·ω. */
type Wv = readonly [number, number];

function wAdd(x: Wv, y: Wv): Wv {
  return [x[0] + y[0], x[1] + y[1]];
}

/** ω^n (음의 n 도) — ω^n = (ω³)^{몫}·ω^{나머지}. */
function wPow(n: number, sg: 1 | -1): Wv {
  const r = ((n % 3) + 3) % 3;
  const qd = (n - r) / 3;
  const f = sg === -1 && qd % 2 !== 0 ? -1 : 1;
  const base: Wv = r === 0 ? [1, 0] : r === 1 ? [0, 1] : [-1, -sg];
  return [base[0] * f, base[1] * f];
}

/** ω^n 을 줄인 지면 — `1` · `-\omega` · `\omega^{2}` … (첫 항이 아니면 `+` 를 붙인다). */
function wTex(n: number, sg: 1 | -1, first = true): string {
  const r = ((n % 3) + 3) % 3;
  const qd = (n - r) / 3;
  const f = sg === -1 && qd % 2 !== 0 ? -1 : 1;
  const body = r === 0 ? "1" : r === 1 ? "\\omega" : "\\omega^{2}";
  return `${f < 0 ? "-" : first ? "" : "+"}${body}`;
}

function omegaHead(sg: 1 | -1): string {
  const rel = `\\omega^{2}${sg > 0 ? "+" : "-"}\\omega+1=0`;
  return `$x^{3}=${sg}$에서 $(x${plusConst(-sg)})(x^{2}${sg > 0 ? "+" : "-"}x+1)=0$이므로 $\\omega^{3}=${sg}$, $${rel}$`;
}

function t16(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  const W = "\\omega";
  const Wb = "\\overline{\\omega}";
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const sg = pickOne(rng, [1, -1] as const);
      const tmpl = randInt(rng, 0, 1);
      if (tmpl === 0) {
        const L = randInt(rng, 4, 6);
        const N = randInt(rng, 20, 120);
        const exps = Array.from({ length: L }, (_, i) => N - i);
        const val = exps.map((e) => wPow(e, sg)).reduce(wAdd);
        if (val[1] !== 0 || val[0] === 0) return null;
        const expr = exps
          .map((e, i) => `${i === 0 ? "" : "+"}${W}^{${e}}`)
          .join("");
        const reduced = exps.map((e, i) => wTex(e, sg, i === 0)).join("");
        return {
          content: `방정식 $x^{3}=${sg}$의 한 허근을 $${W}$${ira(W)} 할 때, $${expr}$의 값을 구하시오.`,
          answer: numAnswer(val[0]),
          solution: [
            omegaHead(sg),
            `따라서 $${expr}=${reduced}=${val[0]}$`,
          ].join("\n"),
          difficulty: "기본",
          facts: { mode, sg, tmpl, N, L },
        };
      }
      const n = randInt(rng, 10, 2100);
      const val = wAdd(wPow(n, sg), wPow(-n, sg));
      if (val[1] !== 0 || val[0] === 0) return null;
      const expr = `${W}^{${n}}+\\dfrac{1}{${W}^{${n}}}`;
      const A = wTex(n, sg);
      const B = wTex(-n, sg);
      return {
        content: `방정식 $x^{3}=${sg}$의 한 허근을 $${W}$${ira(W)} 할 때, $${expr}$의 값을 구하시오.`,
        answer: numAnswer(val[0]),
        solution: [
          omegaHead(sg),
          `$${W}^{3}=${sg}$이므로 $${W}^{${n}}=${A}$, $\\dfrac{1}{${W}^{${n}}}=${B}$`,
          `따라서 $${expr}=${A}${B.startsWith("-") ? B : `+${B}`}=${val[0]}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, sg, tmpl, n },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const sg = pickOne(rng, [1, -1] as const);
      const t = -sg;
      const p = nz(rng, -3, 3);
      const qv = nz(rng, -4, 4);
      const r = nz(rng, -3, 3);
      const s = nz(rng, -4, 4);
      if (p === r && qv === s) return null;
      const N = p * p + p * qv * t + qv * qv;
      const D = r * r + r * s * t + s * s;
      const val = q(N, D);
      const lin = (a: number, b: number, w: string): string =>
        `${coefPrefix(a)}${w}${plusConst(b)}`;
      const expr = `\\dfrac{(${lin(p, qv, W)})(${lin(p, qv, Wb)})}{(${lin(r, s, W)})(${lin(r, s, Wb)})}`;
      const sym = (a: number, b: number): string =>
        `${coefPrefix(a * a)}${W}${Wb}${term(a * b, `(${W}+${Wb})`)}${plusConst(b * b)}`;
      const num = (a: number, b: number): string =>
        `${a * a}${plusConst(a * b * t)}${plusConst(b * b)}`;
      const quad = `x^{2}${sg > 0 ? "+" : "-"}x+1=0`;
      return {
        content: `방정식 $x^{3}=${sg}$의 한 허근을 $${W}$${ira(W)} 할 때, $${expr}$의 값을 구하시오. (단, $${Wb}$${eun(Wb)} $${W}$의 켤레복소수이다.)`,
        answer: qAnswer(val),
        solution: [
          `$x^{3}=${sg}$에서 $(x${plusConst(-sg)})(${quad.replace("=0", "")})=0$이므로 $${W}$, $${Wb}$${eun(Wb)} 이차방정식 $${quad}$의 두 근이다.`,
          `따라서 $${W}+${Wb}=${t}$, $${W}${Wb}=1$`,
          `$${expr}=\\dfrac{${sym(p, qv)}}{${sym(r, s)}}=\\dfrac{${num(p, qv)}}{${num(r, s)}}=${qTex(val)}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, sg, p, q: qv, r, s },
      };
    });
  return attempt<Body>((): Body | null => {
    const sg = pickOne(rng, [1, -1] as const);
    const a = pickOne(rng, [1, 2]);
    const b = randInt(rng, 0, 2);
    const N = randInt(rng, 10, 30);
    const per = sg === -1 && a === 1 ? 6 : 3;
    const expOf = (n: number): number => a * n + b;
    const val = Array.from({ length: N }, (_, i) =>
      wPow(expOf(i + 1), sg),
    ).reduce(wAdd);
    const rem = N % per;
    if (rem === 0 || val[1] !== 0 || val[0] === 0) return null;
    const fn = `${W}^{${a === 1 ? "" : a}n${plusConst(b)}}`;
    const fdef = `f(n)=${fn}`;
    const firsts = Array.from(
      { length: per },
      (_, i) => `f(${i + 1})=${wTex(expOf(i + 1), sg)}`,
    );
    const fullSum = Array.from({ length: per }, (_, i) =>
      wTex(expOf(i + 1), sg, i === 0),
    ).join("");
    const remSum = Array.from({ length: rem }, (_, i) =>
      wTex(expOf(i + 1), sg, i === 0),
    ).join("");
    return {
      content: `방정식 $x^{3}=${sg}$의 한 허근을 $${W}$${ira(W)} 할 때, 자연수 $n$에 대하여 $${fdef}$${ira(fdef)} 하자. 이때 $f(1)+f(2)+f(3)+\\cdots+f(${N})$의 값을 구하시오.`,
      answer: numAnswer(val[0]),
      solution: [
        omegaHead(sg),
        `$${firsts.join("$, $")}$이고 $f(n+${per})=f(n)$이다.`,
        `이때 $f(1)+f(2)+\\cdots+f(${per})=${fullSum}=0$이므로`,
        `$f(1)+f(2)+\\cdots+f(${N})=${rem === 1 ? "f(1)" : `f(1)+\\cdots+f(${rem})`}=${remSum}=${val[0]}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, sg, a, b, N },
    };
  });
}

// ───────────────────────────── 17 ─────────────────────────────
// 정수 조건의 부정방정식 — (일차식)×(일차식)=(정수)
// 꼴 0 (기본·대표): xy+px+qy+r=0 의 자연수 해
// 꼴 1 (심화하): x²-xy+… 의 정수 해 — (x+1) 로 묶는다
// 꼴 2 (심화하): 1/x+1/y=1/n 의 자연수 해의 개수

function divisorPairs(N: number): [number, number][] {
  const out: [number, number][] = [];
  for (let d = -Math.abs(N); d <= Math.abs(N); d += 1) {
    if (d !== 0 && N % d === 0) out.push([d, N / d]);
  }
  return out;
}

function pairList(ps: readonly (readonly [number, number])[]): string {
  return ps.map(([a, b]) => `$(${a}, ${b})$`).join(", ");
}

function t17(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const p = nz(rng, -4, 5);
      const qv = nz(rng, -4, 5);
      const N = pickOne(rng, [6, 8, 10, 12, 15, 18, 20, -6, -8, -10, -12]);
      const used = divisorPairs(N).filter(
        ([d, e]) => p + d >= 1 && qv + e >= 1,
      );
      if (used.length < 2) return null;
      const sols = used.map(([d, e]) => [p + d, qv + e] as const);
      const kind = randInt(rng, 0, 3);
      const sums = sols.map(([x, y]) => x + y);
      const prods = sols.map(([x, y]) => x * y);
      const [askText, ans] =
        kind === 0
          ? ["$x+y$의 최댓값", Math.max(...sums)]
          : kind === 1
            ? ["$x+y$의 최솟값", Math.min(...sums)]
            : kind === 2
              ? ["순서쌍 $(x, y)$의 개수", sols.length]
              : ["$xy$의 최댓값", Math.max(...prods)];
      const eq = `xy${term(-qv, "x")}${term(-p, "y")}${plusConst(p * qv - N)}=0`;
      const lhs = `(x${plusConst(-p)}, y${plusConst(-qv)})`;
      return {
        content: `방정식 $${eq}$${eul(eq)} 만족시키는 자연수 $x$, $y$에 대하여 ${askText}${kind === 2 ? "를" : "을"} 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `$${eq}$에서 $(x${plusConst(-p)})(y${plusConst(-qv)})=${N}$`,
          `$x$, $y$${ga("y")} 자연수이므로 $x${plusConst(-p)}\\ge ${1 - p}$, $y${plusConst(-qv)}\\ge ${1 - qv}$이고, 이를 만족시키는 $${lhs}$${eun(lhs)} ${pairList(used)}이다.`,
          `즉 순서쌍 $(x, y)$는 ${pairList(sols)}이다.`,
          `따라서 ${askText}${kind === 2 ? "는" : "은"} $${ans}$이다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, p, q: qv, N, kind },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const c = randInt(rng, -2, 2);
      const M = nz(rng, -12, 12);
      if (Math.abs(M) === 1) return null;
      const pairs = divisorPairs(M);
      const sols = pairs.map(([d, e]) => [d - 1, d - 1 + c - e] as const);
      const kind = randInt(rng, 0, 2);
      const sums = sols.map(([x, y]) => x + y);
      const prods = sols.map(([x, y]) => x * y);
      const [askText, ans] =
        kind === 0
          ? ["$xy$의 최댓값", Math.max(...prods)]
          : kind === 1
            ? ["$x+y$의 최댓값", Math.max(...sums)]
            : ["$x+y$의 최솟값", Math.min(...sums)];
      const eq = `x^{2}-xy${termIf(c + 1, "x")}-y=${M - c}`;
      const lhs = `(x+1, x-y${plusConst(c)})`;
      const group = c === 0 ? "x(x+1)" : `(x+1)(x${plusConst(c)})`;
      return {
        content: `방정식 $${eq}$${eul(eq)} 만족시키는 정수 $x$, $y$에 대하여 ${askText}을 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `$${eq}$에서 $${group}-y(x+1)=${M}$, 즉 $(x+1)(x-y${plusConst(c)})=${M}$`,
          `$x$, $y$${ga("y")} 정수이므로 $${lhs}$${eun(lhs)} ${pairList(pairs)}이다.`,
          `즉 순서쌍 $(x, y)$는 ${pairList(sols)}이다.`,
          `따라서 ${askText}은 $${ans}$이다.`,
        ].join("\n"),
        difficulty: "심화하",
        facts: { mode, c, M, kind },
      };
    });
  return attempt<Body>((): Body | null => {
    const n = randInt(rng, 2, 8);
    const n2 = n * n;
    const pos = divisorPairs(n2).filter(([d]) => d > 0);
    const count = pos.length;
    const rhs = `\\dfrac{1}{${n}}`;
    const nxy = `${n}xy`;
    const yn = `y-${n}`;
    const lhs = `(x-${n}, y-${n})`;
    return {
      content: `방정식 $\\dfrac{1}{x}+\\dfrac{1}{y}=${rhs}$${eul(rhs)} 만족시키는 자연수 $x$, $y$의 순서쌍 $(x, y)$의 개수를 구하시오.`,
      answer: numAnswer(count),
      solution: [
        `양변에 $${nxy}$${eul(nxy)} 곱하면 $${n}y+${n}x=xy$, 즉 $xy-${n}x-${n}y=0$이므로 $(x-${n})(y-${n})=${n2}$`,
        `$x$, $y$${ga("y")} 자연수이므로 $x-${n}>${-n}$, $${yn}>${-n}$이다. 이때 $x-${n}$, $${yn}$${ga(yn)} 모두 음수이면 그 곱이 $${n2}$보다 작으므로 $x-${n}$, $${yn}$${eun(yn)} 모두 자연수이다.`,
        `따라서 $${lhs}$${eun(lhs)} ${pairList(pos)}의 $${count}$개이고, 순서쌍 $(x, y)$의 개수도 $${count}$이다.`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, n },
    };
  });
}

// ───────────────────────────── 18 ─────────────────────────────
// 실수 조건의 부정방정식
// 꼴 0 (기본·대표): (완전제곱식)+(완전제곱식)=0 으로 묶는다
// 꼴 1 (심화하): 한 문자에 대해 내림차순 — 판별식 ≥ 0

function t18(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  return attempt<Body>((): Body | null => {
    const x0 = randInt(rng, -4, 4);
    const y0 = nz(rng, -4, 4);
    const al = mode === 0 ? pickOne(rng, [1, 2, 3]) : 1;
    const be = nz(rng, -3, 3);
    const de = pickOne(rng, [1, 2]);
    const K = al * x0 + be * y0;
    const A = al * al;
    const Bxy = 2 * al * be;
    const C = be * be + de * de;
    const D = -2 * al * K;
    const E = -2 * be * K - 2 * de * de * y0;
    const F = K * K + de * de * y0 * y0;
    const poly = `${term(A, "x^{2}", true)}${termIf(Bxy, "xy")}${term(C, "y^{2}")}${termIf(D, "x")}${termIf(E, "y")}${plusConst(F)}`;
    const [exprId, [et, ev]] = chooseOne(rng, [
      ["x+y", x0 + y0],
      ["x-y", x0 - y0],
      ["xy", x0 * y0],
    ] as const);
    const eq = `${poly}=0`;
    const content = `실수 $x$, $y$에 대하여 $${eq}$${ga(eq)} 성립할 때, $${et}$의 값을 구하시오.`;
    const ysq = `${coefPrefix(de * de)}(y${plusConst(-y0)})^{2}`;
    if (mode === 0) {
      const U = `${coefPrefix(al)}x${term(be, "y")}${plusConst(-K)}`;
      return {
        content,
        answer: numAnswer(ev),
        solution: [
          `$${eq}$에서 $(${U})^{2}+${ysq}=0$`,
          `이때 $x$, $y$${ga("y")} 실수이므로 $${U}=0$, $y${plusConst(-y0)}=0$`,
          `따라서 $x=${x0}$, $y=${y0}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, al, be, de, x0, y0, exprId },
      };
    }
    const inner = polyTex([-K, be], "y");
    const xcoef =
      K === 0
        ? term(2 * be, "xy")
        : be < 0
          ? `-2(${polyTex([K, -be], "y")})x`
          : `+2(${inner})x`;
    const rest = polyTex([F, E, C], "y");
    return {
      content,
      answer: numAnswer(ev),
      solution: [
        `주어진 식을 $x$에 대하여 내림차순으로 정리하면 $x^{2}${xcoef}+${rest}=0$ ……㉠`,
        `$x$${ga("x")} 실수이므로 ㉠의 판별식을 $D$라 하면 $\\dfrac{D}{4}=(${inner})^{2}-(${rest})\\ge 0$`,
        `정리하면 $-${ysq}\\ge 0$, 즉 $(y${plusConst(-y0)})^{2}\\le 0$`,
        `이때 $y$도 실수이므로 $y=${y0}$`,
        `$y=${y0}$${eul(String(y0))} ㉠에 대입하면 $${x0 === 0 ? "x^{2}" : `(x${plusConst(-x0)})^{2}`}=0$이므로 $x=${x0}$`,
        `따라서 $${et}=${ev}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, al, be, de, x0, y0, exprId },
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

/**
 * 번호·제목은 `scripts/rpm/rpm-high-type-catalog.json` 의 **바이트 그대로**다. 12·16 의 머리 `, `
 * 와 `x^3=1x^3=-1` 은 추출기가 제목 앞 수식(「x+y,」·「x³=1,」)을 놓친 자국이다 — 고치지 않는다
 * (색인을 고치는 것은 리드의 추출기 일이다).
 */
export const H1_EQUATIONS: HighTypeEntry[] = [
  entry("01", "삼차방정식과 사차방정식의 풀이", SEC.삼사1, t01),
  entry("02", "공통부분이 있는 사차방정식의 풀이", SEC.삼사2, t02),
  entry("03", "x^4+ax^2+b=0의 꼴의 방정식의 풀이", SEC.삼사2, t03),
  entry("04", "근이 주어진 삼사차방정식", SEC.삼사1, t04),
  entry("05", "삼차방정식의 근의 조건", SEC.근조건, t05),
  entry("06", "삼차방정식의 근과 계수의 관계", SEC.근계수, t06),
  entry("07", "세 수를 근으로 하는 삼차방정식", SEC.근계수, t07),
  entry("08", "삼차방정식의 켤레근", SEC.근계수, t08),
  entry("09", "삼차방정식의 활용", SEC.삼사1, t09),
  entry(
    "10",
    "일차방정식과 이차방정식으로 이루어진 연립이차방정식",
    SEC.연립1,
    t10,
  ),
  entry("11", "두 이차방정식으로 이루어진 연립이차방정식", SEC.연립2, t11),
  entry("12", ", xy에 대한 대칭식인 연립이차방정식", SEC.대칭, t12),
  entry("13", "연립이차방정식의 해의 조건", SEC.연립1, t13),
  entry("14", "공통인 근을 갖는 방정식", SEC.연립2, t14),
  entry("15", "연립이차방정식의 활용", SEC.연립1, t15),
  entry("16", ", 방정식 x^3=1x^3=-1의 허근의 성질", SEC.허근, t16),
  entry("17", "정수 조건의 부정방정식", SEC.부정, t17),
  entry("18", "실수 조건의 부정방정식", SEC.부정, t18),
];

/** 18유형 모두 등록했다 — 보류 없음. */
export const H1_EQUATIONS_HOLD: HighHold[] = [];
