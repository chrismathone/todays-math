/**
 * 공통수학1 「다항식의 연산」 — RPM 공통수학1(2022) 색인 14유형. **물결 1 세션 `h1-poly` 소유.**
 *
 * 본보기 `h1Identity.ts` 를 그대로 따른다(꼴마다 칸 · 식 정답이면 오답 넷 · 조사는 `josa.ts`).
 * 브리프 `docs/planning/tracks/high-wave1-brief.md`.
 *
 * ## 교육과정 울타리(브리프 §4)
 *
 * 곱셈 공식은 $(a+b+c)^2$ · $(a\pm b)^3$ · $(a\pm b)(a^2\mp ab+b^2)$ 까지만 쓴다. RPM 이 「문자가 3개」
 * 대표문제·「특수한 식의 변형」에서 쓰는 $a^3+b^3+c^3-3abc$ 인수분해는 2022 공식 목록 밖이라
 * **그 꼴은 안 냈다** — 같은 유형의 다른 꼴(제곱의 합·$(a+b)(b+c)(c+a)$ · $a^2+b^2+c^2=ab+bc+ca$)로
 * 채웠다(보고서에 원장님 확인 대상으로 올린다).
 *
 * ## 표로 성립하는 꼴은 글로 옮겼다
 *
 * RPM 「조립제법」 대표문제는 빈칸이 있는 조립제법 **표**, 「나눗셈 - 몫과 나머지」 일부는 긴 나눗셈
 * 과정이다. 표·과정 조판은 지면 모양을 새로 정하는 일(D-07)이라 넣지 않고, 같은 계산을 글로
 * 묻는다(몫의 계수·나머지를 문자로 두고 묻기). 「곱셈 공식의 도형에의 활용」은 그림 없이 수치가
 * 다 주어지는 꼴(직육면체·직사각형·정사각형 넷)만 냈다 — 그림을 좌표로 때우지 않는다(09 §4).
 *
 * ## 우리 단원(시드 `prisma/seed-data/units.ts` 공통수학1 「1. 다항식」)
 *
 *   01 → 다항식의 덧셈과 뺄셈 · 02 → 다항식의 곱셈 · 03·04·08 → 곱셈공식
 *   · 05·06·07·13·14 → 곱셈공식의 변형 · 09~12 → 다항식의 나눗셈(1)
 *   「다항식의 나눗셈(2)」가 무엇을 가르는지 시드에 적혀 있지 않아 브리프 규칙대로 `(1)` 에 두었다
 *   (11 몫과 나머지의 변형 · 12 조립제법이 `(2)` 후보 — 원장님 확인 대상).
 *
 * RPM 원본은 구조만 보았다(`.rpm-src/22/`). 본문·수치를 옮기지 않는다(저작권).
 */
import type { Difficulty } from "@/contracts/difficulty";

import type { Rng } from "../elementary/types";

import { eul, eun, ga, gwa, ira, ro } from "./josa";
import { q, qTex, surd, surdTex, type Q } from "./numbers";
import {
  $,
  attempt,
  coefPrefix,
  distinctInts,
  numAnswer,
  nz,
  pickDistractors,
  pickOne,
  plusConst,
  randInt,
  Retry,
  withSign,
} from "./pick";
import {
  add,
  degree,
  divMod,
  evalAt,
  factorParen,
  factorTex,
  linTex,
  mul,
  paren,
  polyTex,
  scale,
  sub,
  term,
} from "./poly";
import type { HighHold, HighProblem, HighTypeEntry } from "./types";

const GRADE = "공통수학1";
const BOOK = "공통수학1";
const MINOR = "다항식의 연산";

/** 우리 `Unit.section` 정확한 이름 (prisma/seed-data/units.ts 공통수학1 1. 다항식). */
const SEC = {
  덧셈뺄셈: "다항식의 덧셈과 뺄셈",
  곱셈: "다항식의 곱셈",
  곱셈공식: "곱셈공식",
  변형: "곱셈공식의 변형",
  나눗셈: "다항식의 나눗셈(1)",
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

// ───────────────────────────── 지면 ─────────────────────────────

function chooseExpr(rng: Rng, exprs: readonly Expr[]): [number, Expr] {
  const id = randInt(rng, 0, exprs.length - 1);
  return [id, exprs[id]!];
}

/** 계수가 0 이면 아무것도 안 쓰는 항 — `+0t` 는 지면 냄새다. */
function termNZ(c: number, body: string): string {
  return c === 0 ? "" : term(c, body);
}

function powTex(v: string, i: number): string {
  if (i === 0) return "";
  if (i === 1) return v;
  return `${v}^{${i}}`;
}

/** 곱의 인수로 쓰는 한 항 — 음수면 괄호. `3x^{2}` · `(-2x)` · `(-5)` */
function factorMono(c: number, body: string): string {
  const t = term(c, body, true);
  return c < 0 ? `(${t})` : t;
}

/** 다항식 결합을 괄호째 쓴다 — `-(x^{2}+1)+4(2x-3)`. 계수 0 은 뺀다. */
function comboTex(parts: readonly (readonly [number, string])[]): string {
  let out = "";
  for (const [c, body] of parts) {
    if (c === 0) continue;
    const sign = c < 0 ? "-" : out === "" ? "" : "+";
    const abs = Math.abs(c);
    out += `${sign}${abs === 1 ? "" : abs}(${body})`;
  }
  return out === "" ? "0" : out;
}

/** 수의 곱을 이어 쓴다 — `2\times 20+(-3)\times 4`. */
function sumOfProducts(parts: readonly (readonly [number, number])[]): string {
  return parts
    .map(([a, b], i) => {
      const head = i === 0 ? String(a) : a < 0 ? `-${-a}` : `+${a}`;
      return `${head}\\times ${paren(b)}`;
    })
    .join("");
}

/** 유리수 정답 — 0 이면 다시 뽑는다(`numAnswer` 와 같은 까닭). */
function qAnswer(x: Q): string {
  if (x.n === 0) throw new Retry("정답이 0 이라 객관식 오답을 못 만든다");
  return $(qTex(x));
}

/** 최고차항이 0 아닌 `deg` 차 다항식. */
function randPoly(rng: Rng, deg: number, lo = -5, hi = 5): number[] {
  const p = Array.from({ length: deg }, () => randInt(rng, lo, hi));
  p.push(nz(rng, -3, 3));
  return p;
}

/** `x+\dfrac{b}{a}` — 부호를 분수 밖에 둔다. */
function xPlusFrac(b: number, a: number): string {
  const f = qTex(q(Math.abs(b), a));
  return b < 0 ? `x-${f}` : `x+${f}`;
}

// ───────────────────────────── 01 ─────────────────────────────
// 다항식의 덧셈과 뺄셈
// 꼴 0 (기본·대표): 세 다항식의 결합 — 괄호를 풀어 동류항 정리. 답이 식(오답 넷: 괄호 풀 때 부호 · 분배 빠뜨림)
// 꼴 1 (응용): 두 결합식으로 A, B 를 연립해 다른 결합 — 두 문자 x, y
// 꼴 2 (응용): 다항식 X 에 대한 등식을 풀기. 답이 식(오답 넷)

type Triple = readonly [number, number, number];
type Pair = readonly [number, number];

/** $ax^2+bxy+cy^2$ 의 계수 `[a, b, c]`. */
type Hq = readonly [number, number, number];

function hqTex(v: Hq): string {
  return linTex([
    [v[0], "x^{2}"],
    [v[1], "xy"],
    [v[2], "y^{2}"],
  ]);
}

const SYS01: readonly (readonly [Pair, Pair])[] = [
  [
    [1, 1],
    [1, -2],
  ],
  [
    [1, 1],
    [1, -1],
  ],
  [
    [2, 1],
    [1, -1],
  ],
  [
    [1, 2],
    [2, -1],
  ],
  [
    [1, -1],
    [2, 1],
  ],
  [
    [1, 1],
    [2, -1],
  ],
];

const TGT01: readonly Pair[] = [
  [2, 1],
  [1, 2],
  [3, -1],
  [1, -2],
  [2, -1],
  [1, 3],
  [3, 1],
];

function t01(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const A = randPoly(rng, 2);
      const B = randPoly(rng, 2);
      const C = randPoly(rng, 2);
      const tpl = randInt(rng, 0, 2);
      let k1: number;
      let k2: number;
      let tex: string;
      let co: Triple;
      let wrong: Triple[];
      if (tpl === 0) {
        k1 = pickOne(rng, [2, 3]);
        k2 = pickOne(rng, [1, 2, 3]);
        tex = `A-${k1}(A-${coefPrefix(k2)}B)+C`;
        co = [1 - k1, k1 * k2, 1];
        wrong = [
          [1 - k1, -k1 * k2, 1],
          [1 - k1, k2, 1],
          [1 + k1, k1 * k2, 1],
          [1 - k1, k1 * k2, -1],
        ];
      } else if (tpl === 1) {
        [k1, k2] = distinctInts(rng, 2, 4, 2) as [number, number];
        tex = `${k1}(A+B)-${k2}(B-C)`;
        co = [k1, k1 - k2, k2];
        wrong = [
          [k1, k1 - k2, -k2],
          [k1, k1 + k2, k2],
          [k1, k1 - k2, 1],
          [k1, 1 - k2, k2],
        ];
      } else {
        k1 = pickOne(rng, [1, 2, 3]);
        k2 = pickOne(rng, [2, 3]);
        tex = `${coefPrefix(k1)}A-\\{B-${k2}(A-C)\\}+C`;
        co = [k1 + k2, -1, 1 - k2];
        wrong = [
          [k1 - k2, -1, 1 + k2],
          [k1 + k2, 1, 1 - k2],
          [k1 + k2, -1, 1 + k2],
          [k1, -1, 1 - k2],
        ];
      }
      const combine = (w: Triple): number[] =>
        add(add(scale(A, w[0]), scale(B, w[1])), scale(C, w[2]));
      const X = combine(co);
      if (degree(X) < 1) return null;
      const ans = polyTex(X);
      const distractors = pickDistractors(
        rng,
        ans,
        wrong
          .map(combine)
          .filter((p) => degree(p) >= 1)
          .map((p) => polyTex(p)),
      );
      if (distractors === null) return null;
      const At = polyTex(A);
      const Bt = polyTex(B);
      const Ct = polyTex(C);
      return {
        content: `세 다항식 $A=${At}$, $B=${Bt}$, $C=${Ct}$에 대하여 $${tex}$${eul(tex)} 계산하시오.`,
        answer: $(ans),
        solution: [
          `$${tex}=${linTex([
            [co[0], "A"],
            [co[1], "B"],
            [co[2], "C"],
          ])}$`,
          `$=${comboTex([
            [co[0], At],
            [co[1], Bt],
            [co[2], Ct],
          ])}$`,
          `$=${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: {
          mode,
          tpl,
          k1,
          k2,
          A0: A[0]!,
          A1: A[1]!,
          A2: A[2]!,
          B0: B[0]!,
          B1: B[1]!,
          B2: B[2]!,
          C0: C[0]!,
          C1: C[1]!,
          C2: C[2]!,
        },
        distractors,
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const [[a1, b1], [a2, b2]] = pickOne(rng, SYS01);
      const [r1, r2] = pickOne(
        rng,
        TGT01.filter(
          ([x, y]) => !(x === a1 && y === b1) && !(x === a2 && y === b2),
        ),
      );
      const hq = (): Hq => [
        nz(rng, -3, 3),
        randInt(rng, -4, 4),
        randInt(rng, -4, 4),
      ];
      const A = hq();
      const B = hq();
      const mix = (u: number, v: number): Hq => [
        u * A[0] + v * B[0],
        u * A[1] + v * B[1],
        u * A[2] + v * B[2],
      ];
      const P = mix(a1, b1);
      const Qv = mix(a2, b2);
      const T = mix(r1, r2);
      if ([P, Qv, T].some((h) => h.every((c) => c === 0))) return null;
      const exprs: Expr[] = [
        ["a+b+c", T[0] + T[1] + T[2]],
        ["a-b+c", T[0] - T[1] + T[2]],
      ];
      if (T.every((c) => c !== 0)) exprs.push(["abc", T[0] * T[1] * T[2]]);
      const [exprId, [et, ev]] = chooseExpr(rng, exprs);
      const c1 = linTex([
        [a1, "A"],
        [b1, "B"],
      ]);
      const c2 = linTex([
        [a2, "A"],
        [b2, "B"],
      ]);
      const ct = linTex([
        [r1, "A"],
        [r2, "B"],
      ]);
      const At = hqTex(A);
      const Bt = hqTex(B);
      return {
        content: `두 다항식 $A$, $B$에 대하여 $${c1}=${hqTex(P)}$, $${c2}=${hqTex(Qv)}$이다. $${ct}=ax^{2}+bxy+cy^{2}$일 때, $${et}$의 값을 구하시오. (단, $a$, $b$, $c$${eun("c")} 상수이다.)`,
        answer: numAnswer(ev),
        solution: [
          `$${c1}=${hqTex(P)}$ ……㉠`,
          `$${c2}=${hqTex(Qv)}$ ……㉡`,
          `㉠, ㉡을 연립하여 풀면 $A=${At}$, $B=${Bt}$`,
          `$${ct}=${comboTex([
            [r1, At],
            [r2, Bt],
          ])}=${hqTex(T)}$`,
          `따라서 $a=${T[0]}$, $b=${T[1]}$, $c=${T[2]}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: {
          mode,
          a1,
          b1,
          a2,
          b2,
          r1,
          r2,
          P0: P[0],
          P1: P[1],
          P2: P[2],
          Q0: Qv[0],
          Q1: Qv[1],
          Q2: Qv[2],
          exprId,
        },
      };
    });
  return attempt<Body>((): Body | null => {
    const k = pickOne(rng, [2, 3]);
    const t = pickOne(rng, [1, -1, 2]);
    const s = 1 + k * t;
    const A = randPoly(rng, pickOne(rng, [2, 3]));
    const B = randPoly(rng, 2);
    const X = add(scale(A, -t), B);
    if (degree(X) < 1) return null;
    const ans = polyTex(X);
    const distractors = pickDistractors(
      rng,
      ans,
      [
        add(scale(A, t), B),
        sub(scale(A, -t), B),
        sub(scale(A, t), B),
        add(scale(A, -t), scale(B, k)),
        add(scale(A, -t - 1), B),
      ]
        .filter((p) => degree(p) >= 1)
        .map((p) => polyTex(p)),
    );
    if (distractors === null) return null;
    const At = polyTex(A);
    const Bt = polyTex(B);
    const eq = `A-${k}(X-B)=${coefPrefix(s)}A`;
    return {
      content: `두 다항식 $A=${At}$, $B=${Bt}$에 대하여 $${eq}$${eul(eq)} 만족시키는 다항식 $X$${eul("X")} 구하시오.`,
      answer: $(ans),
      solution: [
        `$${eq}$에서 $A-${k}X+${k}B=${coefPrefix(s)}A$`,
        `$${k}X=${linTex([
          [1 - s, "A"],
          [k, "B"],
        ])}$, 즉 $X=${linTex([
          [-t, "A"],
          [1, "B"],
        ])}$`,
        `$X=${comboTex([
          [-t, At],
          [1, Bt],
        ])}$`,
        `$=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: {
        mode,
        k,
        t,
        s,
        A0: A[0]!,
        A1: A[1]!,
        A2: A[2]!,
        A3: A[3] ?? 0,
        B0: B[0]!,
        B1: B[1]!,
        B2: B[2]!,
      },
      distractors,
    };
  });
}

// ───────────────────────────── 02 ─────────────────────────────
// 다항식의 전개식에서 계수 구하기
// 꼴 0 (기본·대표): 삼차식 두 개의 곱에서 한 항의 계수 — 필요한 곱만 고른다
// 꼴 1 (기본): 두 문자 일차식 두 개의 곱에서 xy · x · y 의 계수
// 꼴 2 (응용): 한 항의 계수가 주어졌을 때 미지의 상수
// 꼴 3 (심화하): $(x+2x^2+\cdots+nx^n)^2$ 에서 한 항의 계수 — 곱의 쌍을 빠짐없이

function t02(rng: Rng): Body {
  const mode = randInt(rng, 0, 3);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const P = Array.from({ length: 4 }, () => nz(rng, -4, 4));
      const Qp = Array.from({ length: 4 }, () => nz(rng, -4, 4));
      const k = pickOne(rng, [2, 3, 4]);
      const pairs: [number, number][] = [];
      for (let i = 0; i <= 3; i += 1) {
        const j = k - i;
        if (j >= 0 && j <= 3) pairs.push([i, j]);
      }
      const coef = pairs.reduce((s, [i, j]) => s + P[i]! * Qp[j]!, 0);
      const xk = powTex("x", k);
      const prod = `(${polyTex(P)})(${polyTex(Qp)})`;
      return {
        content: `다항식 $${prod}$의 전개식에서 $${xk}$의 계수를 구하시오.`,
        answer: numAnswer(coef),
        solution: [
          `$${prod}$의 전개식에서 $${xk}$ 항은`,
          `$${pairs
            .map(
              ([i, j]) =>
                `${factorMono(P[i]!, powTex("x", i))}\\times ${factorMono(Qp[j]!, powTex("x", j))}`,
            )
            .join("+")}=${term(coef, xk, true)}$`,
          `따라서 $${xk}$의 계수는 $${coef}$이다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: {
          mode,
          k,
          p0: P[0]!,
          p1: P[1]!,
          p2: P[2]!,
          p3: P[3]!,
          q0: Qp[0]!,
          q1: Qp[1]!,
          q2: Qp[2]!,
          q3: Qp[3]!,
        },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const a1 = nz(rng, -3, 3);
      const b1 = nz(rng, -3, 3);
      const c1 = nz(rng, -4, 4);
      const a2 = nz(rng, -3, 3);
      const b2 = nz(rng, -3, 3);
      const c2 = nz(rng, -4, 4);
      const tgt = randInt(rng, 0, 2);
      const L1 = linTex(
        [
          [a1, "x"],
          [b1, "y"],
        ],
        c1,
      );
      const L2 = linTex(
        [
          [a2, "x"],
          [b2, "y"],
        ],
        c2,
      );
      const X1 = factorMono(a1, "x");
      const Y1 = factorMono(b1, "y");
      const K1 = paren(c1);
      const X2 = factorMono(a2, "x");
      const Y2 = factorMono(b2, "y");
      const K2 = paren(c2);
      const [body, value, prods] =
        tgt === 0
          ? ["xy", a1 * b2 + b1 * a2, `${X1}\\times ${Y2}+${Y1}\\times ${X2}`]
          : tgt === 1
            ? ["x", a1 * c2 + c1 * a2, `${X1}\\times ${K2}+${K1}\\times ${X2}`]
            : ["y", b1 * c2 + c1 * b2, `${Y1}\\times ${K2}+${K1}\\times ${Y2}`];
      return {
        content: `다항식 $(${L1})(${L2})$의 전개식에서 $${body}$의 계수를 구하시오.`,
        answer: numAnswer(value),
        solution: [
          `$(${L1})(${L2})$의 전개식에서 $${body}$ 항은`,
          `$${prods}=${term(value, body, true)}$`,
          `따라서 $${body}$의 계수는 $${value}$이다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, tgt, a1, b1, c1, a2, b2, c2 },
      };
    });
  if (mode === 2)
    return attempt<Body>((): Body | null => {
      const p = nz(rng, -4, 4);
      const r = nz(rng, -5, 5);
      const s = nz(rng, -4, 4);
      const k = nz(rng, -8, 8);
      const tgt = randInt(rng, 0, 1);
      const F1 = `x^{2}${term(p, "x")}${plusConst(r)}`;
      const F2 = `x^{2}${term(s, "x")}+k`;
      if (tgt === 0) {
        const rest = p * s + r;
        if (rest === 0) return null;
        const G = k + rest;
        return {
          content: `다항식 $(${F1})(${F2})$의 전개식에서 $x^{2}$의 계수가 $${G}$일 때, 상수 $k$의 값을 구하시오.`,
          answer: numAnswer(k),
          solution: [
            `$(${F1})(${F2})$의 전개식에서 $x^{2}$ 항은`,
            `$x^{2}\\times k+${factorMono(p, "x")}\\times ${factorMono(s, "x")}+${paren(r)}\\times x^{2}=(k${plusConst(rest)})x^{2}$`,
            `이때 $x^{2}$의 계수가 $${G}$이므로 $k${plusConst(rest)}=${G}$`,
            `따라서 $k=${k}$`,
          ].join("\n"),
          difficulty: "응용",
          facts: { mode, tgt, p, r, s, G },
        };
      }
      const G = p * k + r * s;
      return {
        content: `다항식 $(${F1})(${F2})$의 전개식에서 $x$의 계수가 $${G}$일 때, 상수 $k$의 값을 구하시오.`,
        answer: numAnswer(k),
        solution: [
          `$(${F1})(${F2})$의 전개식에서 $x$ 항은`,
          `$${factorMono(p, "x")}\\times k+${paren(r)}\\times ${factorMono(s, "x")}=(${linTex([[p, "k"]], r * s)})x$`,
          `이때 $x$의 계수가 $${G}$이므로 $${linTex([[p, "k"]], r * s)}=${G}$`,
          `따라서 $k=${k}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, tgt, p, r, s, G },
      };
    });
  return attempt<Body>((): Body | null => {
    const n = pickOne(rng, [8, 9, 10, 12]);
    const m = randInt(rng, 4, 8);
    const pairs: number[] = [];
    for (let i = 1; i < m; i += 1) pairs.push(i);
    const value = pairs.reduce((s, i) => s + i * (m - i), 0);
    const xm = powTex("x", m);
    const base = `x+2x^{2}+3x^{3}+\\cdots+${n}x^{${n}}`;
    return {
      content: `다항식 $(${base})^{2}$의 전개식에서 $${xm}$의 계수를 구하시오.`,
      answer: numAnswer(value),
      solution: [
        `$(${base})^{2}=(${base})(${base})$이므로 $${xm}$ 항은`,
        `$${pairs
          .map(
            (i) =>
              `${factorMono(i, powTex("x", i))}\\times ${factorMono(m - i, powTex("x", m - i))}`,
          )
          .join("+")}=${value}${xm}$`,
        `따라서 $${xm}$의 계수는 $${value}$이다.`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, n, m },
    };
  });
}

// ───────────────────────────── 03 ─────────────────────────────
// 곱셈 공식을 이용한 다항식의 전개
// 꼴 0 (기본): $(a+b)^3$ · $(a+b+c)^2$ 공식으로 전개해 한 항의 계수
// 꼴 1 (응용): $(a+b)(a^2-ab+b^2)$ 둘의 차가 $ax^3+by^3$ — 항등식의 계수
// 꼴 2 (응용): 공식으로 식을 줄여 주어진 값을 대입($x^6-k^6$ · $x^4-k^4$)

function t03(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const fam = randInt(rng, 0, 1);
      const p = pickOne(rng, [1, 2, 3]);
      const qy = nz(rng, -3, 3);
      const aT = p === 1 ? "x" : `(${p}x)`;
      const bT = qy === 1 ? "y" : `(${term(qy, "y", true)})`;
      if (fam === 0) {
        const tgt = randInt(rng, 0, 1);
        const lin = linTex([
          [p, "x"],
          [qy, "y"],
        ]);
        const full = linTex([
          [p ** 3, "x^{3}"],
          [3 * p * p * qy, "x^{2}y"],
          [3 * p * qy * qy, "xy^{2}"],
          [qy ** 3, "y^{3}"],
        ]);
        const [body, value] =
          tgt === 0 ? ["x^{2}y", 3 * p * p * qy] : ["xy^{2}", 3 * p * qy * qy];
        return {
          content: `다항식 $(${lin})^{3}$의 전개식에서 $${body}$의 계수를 구하시오.`,
          answer: numAnswer(value),
          solution: [
            `$(${lin})^{3}=${aT}^{3}+3\\times ${aT}^{2}\\times ${bT}+3\\times ${aT}\\times ${bT}^{2}+${bT}^{3}$`,
            `$=${full}$`,
            `따라서 $${body}$의 계수는 $${value}$이다.`,
          ].join("\n"),
          difficulty: "기본",
          facts: { mode, fam, p, q: qy, r: 0, tgt },
        };
      }
      const r = nz(rng, -4, 4);
      const tgt = randInt(rng, 0, 2);
      const lin = linTex(
        [
          [p, "x"],
          [qy, "y"],
        ],
        r,
      );
      const cT = paren(r);
      const full = linTex(
        [
          [p * p, "x^{2}"],
          [qy * qy, "y^{2}"],
          [2 * p * qy, "xy"],
          [2 * qy * r, "y"],
          [2 * r * p, "x"],
        ],
        r * r,
      );
      const [body, value] =
        tgt === 0
          ? ["xy", 2 * p * qy]
          : tgt === 1
            ? ["x", 2 * p * r]
            : ["y", 2 * qy * r];
      return {
        content: `다항식 $(${lin})^{2}$의 전개식에서 $${body}$의 계수를 구하시오.`,
        answer: numAnswer(value),
        solution: [
          `$(${lin})^{2}=${aT}^{2}+${bT}^{2}+${cT}^{2}+2\\times ${aT}\\times ${bT}+2\\times ${bT}\\times ${cT}+2\\times ${cT}\\times ${aT}$`,
          `$=${full}$`,
          `따라서 $${body}$의 계수는 $${value}$이다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, fam, p, q: qy, r, tgt },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const [p, r] = distinctInts(rng, 1, 3, 2) as [number, number];
      const qy = nz(rng, -3, 3);
      const sy = nz(rng, -3, 3);
      const a = p ** 3 - r ** 3;
      const b = qy ** 3 - sy ** 3;
      if (b === 0) return null;
      const exprs: Expr[] = [
        ["a-b", a - b],
        ["a+b", a + b],
        ["ab", a * b],
      ];
      const [exprId, [et, ev]] = chooseExpr(rng, exprs);
      const cubeSum = (u: number, v: number): string =>
        `(${linTex([
          [u, "x"],
          [v, "y"],
        ])})(${linTex([
          [u * u, "x^{2}"],
          [-u * v, "xy"],
          [v * v, "y^{2}"],
        ])})`;
      const cubed = (u: number, v: number): string =>
        linTex([
          [u ** 3, "x^{3}"],
          [v ** 3, "y^{3}"],
        ]);
      const E = `${cubeSum(p, qy)}-${cubeSum(r, sy)}`;
      const rhs = "ax^{3}+by^{3}";
      return {
        content: `등식 $${E}=${rhs}$${ga(rhs)} $x$, $y$에 대한 항등식일 때, 상수 $a$, $b$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `$${cubeSum(p, qy)}=${cubed(p, qy)}$`,
          `$${cubeSum(r, sy)}=${cubed(r, sy)}$`,
          `이므로 주어진 식의 좌변은 $(${cubed(p, qy)})-(${cubed(r, sy)})=${linTex(
            [
              [a, "x^{3}"],
              [b, "y^{3}"],
            ],
          )}$`,
          `따라서 $a=${a}$, $b=${b}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, p, q: qy, r, s: sy, exprId },
      };
    });
  return attempt<Body>((): Body | null => {
    const fam = randInt(rng, 0, 1);
    if (fam === 0) {
      const k = pickOne(rng, [1, 2]);
      const k2 = k * k;
      const k6 = k ** 6;
      const N = k === 1 ? randInt(rng, 2, 40) : randInt(rng, 65, 130);
      const v = N - k6;
      const kx = coefPrefix(k);
      const prod = `(x^{2}-${k2})(x^{2}+${kx}x+${k2})(x^{2}-${kx}x+${k2})`;
      return {
        content: `$x^{6}=${N}$일 때, $${prod}$의 값을 구하시오.`,
        answer: numAnswer(v),
        solution: [
          `$${prod}$`,
          `$=\\{(x+${k})(x^{2}-${kx}x+${k2})\\}\\{(x-${k})(x^{2}+${kx}x+${k2})\\}$`,
          `$=(x^{3}+${k ** 3})(x^{3}-${k ** 3})=x^{6}-${k6}$`,
          `따라서 구하는 값은 $${N}-${k6}=${v}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, fam, k, N },
      };
    }
    const k = pickOne(rng, [1, 2, 3]);
    const k2 = k * k;
    const k4 = k ** 4;
    const N = randInt(rng, k4 + 1, k4 + 60);
    const v = N - k4;
    const prod = `(x-${k})(x+${k})(x^{2}+${k2})`;
    return {
      content: `$x^{4}=${N}$일 때, $${prod}$의 값을 구하시오.`,
      answer: numAnswer(v),
      solution: [
        `$${prod}=(x^{2}-${k2})(x^{2}+${k2})$`,
        `$=x^{4}-${k4}$`,
        `따라서 구하는 값은 $${N}-${k4}=${v}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, fam, k, N },
    };
  });
}

// ───────────────────────────── 04 ─────────────────────────────
// 공통부분이 있는 다항식의 전개
// 꼴 0 (기본·대표): $(x^2+mx+p)(x^2+mx+q)$ — 공통부분을 t 로 놓고 전개, 계수의 결합
// 꼴 1 (응용): 네 일차식의 곱 — 짝을 지어 공통부분을 만든다. 답이 식(오답 넷: 치환 전개의 실수)
// 꼴 2 (심화하): 조건식 $a^2+sa=c$ 를 짝지은 곱에 넣는다

function t04(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const m = nz(rng, -3, 3);
      const [p, qq] = distinctInts(rng, -5, 5, 2, { nonzero: true }) as [
        number,
        number,
      ];
      const full = mul([p, m, 1], [qq, m, 1]);
      const [, c, b, a] = full as [number, number, number, number, number];
      const d = full[0]!;
      const exprs: Expr[] = [
        ["a+b+c+d", a + b + c + d],
        ["a-b+c", a - b + c],
        ["a+b-c-d", a + b - c - d],
      ];
      const [exprId, [et, ev]] = chooseExpr(rng, exprs);
      const base = polyTex([0, m, 1]);
      const prod = `(${polyTex([p, m, 1])})(${polyTex([qq, m, 1])})`;
      const rhs = "x^{4}+ax^{3}+bx^{2}+cx+d";
      return {
        content: `$${prod}$${eul(prod)} 전개한 식이 $${rhs}$일 때, 상수 $a$, $b$, $c$, $d$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `$${base}=t$${ro("t")} 놓으면`,
          `$(t${plusConst(p)})(t${plusConst(qq)})=t^{2}${termNZ(p + qq, "t")}${plusConst(p * qq)}$`,
          `$=(${base})^{2}${termNZ(p + qq, `(${base})`)}${plusConst(p * qq)}$`,
          `$=${polyTex(full)}$`,
          `따라서 $a=${a}$, $b=${b}$, $c=${c}$, $d=${d}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, m, p, q: qq, exprId },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const s = nz(rng, -3, 3);
      const [u, v] = distinctInts(rng, -5, 5, 2, { nonzero: true }) as [
        number,
        number,
      ];
      const roots = [u, s - u, v, s - v];
      if (new Set(roots).size !== 4 || roots.includes(0)) return null;
      // (x+u)(x+s-u) · (x+v)(x+s-v)
      const P = u * (s - u);
      const Qc = v * (s - v);
      const factors = [...roots].sort((x, y) => x - y);
      const prod = factors.map((c) => factorParen(-c)).join("");
      const full = mul([P, s, 1], [Qc, s, 1]);
      const ans = polyTex(full);
      const S = P + Qc;
      const distractors = pickDistractors(
        rng,
        ans,
        [
          [P * Qc, s * S, s * s + S, s, 1],
          [P * Qc, s * S, S, 2 * s, 1],
          [-P * Qc, s * S, s * s + S, 2 * s, 1],
          [P * Qc, -s * S, s * s + S, 2 * s, 1],
          [P * Qc, s * (P - Qc), s * s + P - Qc, 2 * s, 1],
        ].map((c) => polyTex(c)),
      );
      if (distractors === null) return null;
      const base = polyTex([0, s, 1]);
      const pair1 = `${factorParen(-u)}${factorParen(-(s - u))}`;
      const pair2 = `${factorParen(-v)}${factorParen(-(s - v))}`;
      return {
        content: `다항식 $${prod}$${eul(prod)} 전개하시오.`,
        answer: $(ans),
        solution: [
          `$${prod}=\\{${pair1}\\}\\{${pair2}\\}$`,
          `$=(${polyTex([P, s, 1])})(${polyTex([Qc, s, 1])})$`,
          `$${base}=t$${ro("t")} 놓으면 $(t${plusConst(P)})(t${plusConst(Qc)})=t^{2}${termNZ(S, "t")}${plusConst(P * Qc)}$`,
          `$=(${base})^{2}${termNZ(S, `(${base})`)}${plusConst(P * Qc)}$`,
          `$=${ans}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: {
          mode,
          r1: roots[0]!,
          r2: roots[1]!,
          r3: roots[2]!,
          r4: roots[3]!,
        },
        distractors,
      };
    });
  return attempt<Body>((): Body | null => {
    const s = randInt(rng, 3, 7);
    const [u, v] = distinctInts(rng, 1, s - 1, 2) as [number, number];
    const z = s - u;
    const w = s - v;
    if (new Set([u, v, w, z]).size !== 4) return null;
    const c = nz(rng, -4, 6);
    const value = (c + u * z) * (c + v * w);
    const sorted = [u, v, w, z].sort((x, y) => x - y);
    const prod = sorted.map((k) => factorParen(-k, "a")).join("");
    const cond = `a^{2}+${s}a${plusConst(-c)}=0`;
    return {
      content: `$${cond}$일 때, $${prod}$의 값을 구하시오.`,
      answer: numAnswer(value),
      solution: [
        `$${prod}=\\{${factorParen(-u, "a")}${factorParen(-z, "a")}\\}\\{${factorParen(-v, "a")}${factorParen(-w, "a")}\\}$`,
        `$=(a^{2}+${s}a+${u * z})(a^{2}+${s}a+${v * w})$`,
        `이때 $${cond}$에서 $a^{2}+${s}a=${c}$`,
        `따라서 구하는 값은 $(${c}+${u * z})\\times(${c}+${v * w})=${value}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, s, c, u, v, w, z },
    };
  });
}

// ───────────────────────────── 05 ─────────────────────────────
// 곱셈 공식의 변형 - 문자가 2개
// 꼴 0 (기본·대표): $x\pm y$, $xy$ 로 $x^2+y^2$ · $(x\mp y)^2$ · $x^3\pm y^3$
// 꼴 1 (응용): 두 단계 — 먼저 $xy$ 를 구한 뒤 목표식
// 꼴 2 (응용): $x=m+\sqrt{r}$, $y=m-\sqrt{r}$ 로 합·곱을 만든 뒤 목표식(분수 목표 포함)

function t05(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const fam = randInt(rng, 0, 1);
      const p = nz(rng, -6, 6);
      const tgt = randInt(rng, 0, 2);
      if (fam === 0) {
        const s = nz(rng, -5, 5);
        if (s * s - 4 * p < 0) return null;
        const S = paren(s);
        const P = paren(p);
        const [tt, v, line] =
          tgt === 0
            ? [
                "x^{2}+y^{2}",
                s * s - 2 * p,
                `$x^{2}+y^{2}=(x+y)^{2}-2xy=${S}^{2}-2\\times ${P}=${s * s - 2 * p}$`,
              ]
            : tgt === 1
              ? [
                  "(x-y)^{2}",
                  s * s - 4 * p,
                  `$(x-y)^{2}=(x+y)^{2}-4xy=${S}^{2}-4\\times ${P}=${s * s - 4 * p}$`,
                ]
              : [
                  "x^{3}+y^{3}",
                  s ** 3 - 3 * p * s,
                  `$x^{3}+y^{3}=(x+y)^{3}-3xy(x+y)=${S}^{3}-3\\times ${P}\\times ${S}=${s ** 3 - 3 * p * s}$`,
                ];
        return {
          content: `$x+y=${s}$, $xy=${p}$일 때, $${tt}$의 값을 구하시오.`,
          answer: numAnswer(v),
          solution: [`$x+y=${s}$, $xy=${p}$이므로`, line].join("\n"),
          difficulty: "기본",
          facts: { mode, fam, tgt, s, p },
        };
      }
      const d = nz(rng, -5, 5);
      if (d * d + 4 * p < 0) return null;
      const D = paren(d);
      const P = paren(p);
      const [tt, v, line] =
        tgt === 0
          ? [
              "x^{2}+y^{2}",
              d * d + 2 * p,
              `$x^{2}+y^{2}=(x-y)^{2}+2xy=${D}^{2}+2\\times ${P}=${d * d + 2 * p}$`,
            ]
          : tgt === 1
            ? [
                "(x+y)^{2}",
                d * d + 4 * p,
                `$(x+y)^{2}=(x-y)^{2}+4xy=${D}^{2}+4\\times ${P}=${d * d + 4 * p}$`,
              ]
            : [
                "x^{3}-y^{3}",
                d ** 3 + 3 * p * d,
                `$x^{3}-y^{3}=(x-y)^{3}+3xy(x-y)=${D}^{3}+3\\times ${P}\\times ${D}=${d ** 3 + 3 * p * d}$`,
              ];
      return {
        content: `$x-y=${d}$, $xy=${p}$일 때, $${tt}$의 값을 구하시오.`,
        answer: numAnswer(v),
        solution: [`$x-y=${d}$, $xy=${p}$이므로`, line].join("\n"),
        difficulty: "기본",
        facts: { mode, fam, tgt, d, p },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const fam = randInt(rng, 0, 2);
      const p = nz(rng, -6, 6);
      const P = paren(p);
      if (fam === 0) {
        const s = nz(rng, -5, 5);
        if (s * s - 4 * p < 0) return null;
        const m = s * s - 2 * p;
        const v = s ** 3 - 3 * p * s;
        const S = paren(s);
        return {
          content: `$x+y=${s}$, $x^{2}+y^{2}=${m}$일 때, $x^{3}+y^{3}$의 값을 구하시오.`,
          answer: numAnswer(v),
          solution: [
            `$x^{2}+y^{2}=(x+y)^{2}-2xy$에서 $${m}=${S}^{2}-2xy$이므로 $xy=${p}$`,
            `$x^{3}+y^{3}=(x+y)^{3}-3xy(x+y)=${S}^{3}-3\\times ${P}\\times ${S}=${v}$`,
          ].join("\n"),
          difficulty: "응용",
          facts: { mode, fam, s, m },
        };
      }
      if (fam === 1) {
        const d = nz(rng, -5, 5);
        if (d * d + 4 * p < 0) return null;
        const m = d * d + 2 * p;
        const v = d ** 3 + 3 * p * d;
        const D = paren(d);
        return {
          content: `$x-y=${d}$, $x^{2}+y^{2}=${m}$일 때, $x^{3}-y^{3}$의 값을 구하시오.`,
          answer: numAnswer(v),
          solution: [
            `$x^{2}+y^{2}=(x-y)^{2}+2xy$에서 $${m}=${D}^{2}+2xy$이므로 $xy=${p}$`,
            `$x^{3}-y^{3}=(x-y)^{3}+3xy(x-y)=${D}^{3}+3\\times ${P}\\times ${D}=${v}$`,
          ].join("\n"),
          difficulty: "응용",
          facts: { mode, fam, d, m },
        };
      }
      const s = nz(rng, -5, 5);
      if (s * s - 4 * p < 0) return null;
      const c = s ** 3 - 3 * p * s;
      const v = s * s - p;
      const S = paren(s);
      return {
        content: `$x+y=${s}$, $x^{3}+y^{3}=${c}$일 때, $x^{2}+xy+y^{2}$의 값을 구하시오.`,
        answer: numAnswer(v),
        solution: [
          `$x^{3}+y^{3}=(x+y)^{3}-3xy(x+y)$에서 $${c}=${S}^{3}-3xy\\times ${S}$이므로 $xy=${p}$`,
          `$x^{2}+xy+y^{2}=(x+y)^{2}-xy=${S}^{2}-${P}=${v}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, fam, s, c },
      };
    });
  return attempt<Body>((): Body | null => {
    const m = nz(rng, -3, 4);
    const r = pickOne(rng, [2, 3, 5, 6, 7]);
    const p = m * m - r;
    if (p === 0) return null;
    const s = 2 * m;
    const xT = surdTex(surd(m, 1, r));
    const yT = surdTex(surd(m, -1, r));
    const tgt = randInt(rng, 0, 3);
    const S = paren(s);
    const P = paren(p);
    const head = [
      `$x+y=(${xT})+(${yT})=${s}$`,
      `$xy=(${xT})(${yT})=${paren(m)}^{2}-(\\sqrt{${r}})^{2}=${p}$`,
    ];
    let tt: string;
    let answer: string;
    let last: string;
    if (tgt === 0) {
      const v = s * s - 2 * p;
      tt = "x^{2}+y^{2}";
      answer = numAnswer(v);
      last = `따라서 $x^{2}+y^{2}=(x+y)^{2}-2xy=${S}^{2}-2\\times ${P}=${v}$`;
    } else if (tgt === 1) {
      const v = s ** 3 - 3 * p * s;
      tt = "x^{3}+y^{3}";
      answer = numAnswer(v);
      last = `따라서 $x^{3}+y^{3}=(x+y)^{3}-3xy(x+y)=${S}^{3}-3\\times ${P}\\times ${S}=${v}$`;
    } else if (tgt === 2) {
      const v = p * s;
      tt = "x^{2}y+xy^{2}";
      answer = numAnswer(v);
      last = `따라서 $x^{2}y+xy^{2}=xy(x+y)=${P}\\times ${S}=${v}$`;
    } else {
      const num = s * s - 2 * p;
      const v = q(num, p);
      tt = "\\dfrac{y}{x}+\\dfrac{x}{y}";
      answer = qAnswer(v);
      const frac = p > 0 ? `\\dfrac{${num}}{${p}}` : `-\\dfrac{${num}}{${-p}}`;
      head.push(`$x^{2}+y^{2}=(x+y)^{2}-2xy=${S}^{2}-2\\times ${P}=${num}$`);
      last = `따라서 $\\dfrac{y}{x}+\\dfrac{x}{y}=\\dfrac{x^{2}+y^{2}}{xy}=${frac}=${qTex(v)}$`;
    }
    return {
      content: `$x=${xT}$, $y=${yT}$일 때, $${tt}$의 값을 구하시오.`,
      answer,
      solution: [...head, last].join("\n"),
      difficulty: "응용",
      facts: { mode, tgt, m, r },
    };
  });
}

// ───────────────────────────── 06 ─────────────────────────────
// 곱셈 공식의 변형 - $x\pm\frac{1}{x}$ 의 꼴
// 꼴 0 (기본·대표): $x^2-kx\pm1=0$ 의 양변을 x 로 나눠 $x\pm\frac1x=k$ → 이차·삼차 목표
// 꼴 1 (응용): $x=m+\sqrt{m^2-1}$ 로 $\frac1x$ 을 유리화 · 또는 네제곱까지 두 단계
// 꼴 2 (심화하): 여섯 항 식을 $x^3\pm\frac1{x^3}$ · $x^2+\frac1{x^2}$ · $x\pm\frac1x$ 로 묶기

const INV1 = "\\dfrac{1}{x}";

/** `x+\dfrac{1}{x}` · `x-\dfrac{1}{x}` */
function xInv(plus: boolean, pow = 1): string {
  const p = powTex("x", pow);
  return `${p}${plus ? "+" : "-"}\\dfrac{1}{${p}}`;
}

/** `\left(x+\dfrac{1}{x}\right)` */
function lr(tex: string): string {
  return `\\left(${tex}\\right)`;
}

/** `+\dfrac{3}{x^{2}}` — 분수 항 */
function fracTerm(c: number, den: string): string {
  if (c === 0) return "";
  return `${c < 0 ? "-" : "+"}\\dfrac{${Math.abs(c)}}{${den}}`;
}

function t06(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const plus = rng() < 0.5;
      const k = nz(rng, -5, 5);
      if (plus && Math.abs(k) < 3) return null;
      const tgt = randInt(rng, 0, 1);
      const eq = `x^{2}${term(-k, "x")}${plus ? "+1" : "-1"}=0`;
      const base = xInv(plus);
      const K = paren(k);
      const two = plus ? "-2" : "+2";
      const v2 = plus ? k * k - 2 : k * k + 2;
      const v3 = plus ? k ** 3 - 3 * k : k ** 3 + 3 * k;
      const [tt, v, line] =
        tgt === 0
          ? [
              xInv(true, 2),
              v2,
              `$${xInv(true, 2)}=${lr(base)}^{2}${two}=${K}^{2}${two}=${v2}$`,
            ]
          : [
              xInv(plus, 3),
              v3,
              `$${xInv(plus, 3)}=${lr(base)}^{3}${plus ? "-" : "+"}3${lr(base)}=${K}^{3}${plus ? "-" : "+"}3\\times ${K}=${v3}$`,
            ];
      return {
        content: `$${eq}$일 때, $${tt}$의 값을 구하시오.`,
        answer: numAnswer(v),
        solution: [
          `$x\\neq 0$이므로 $${eq}$의 양변을 $x$${ro("x")} 나누면`,
          `$x${term(-k, "")}${plus ? "+" : "-"}${INV1}=0$, 즉 $${base}=${k}$`,
          line,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, plus: plus ? 1 : -1, k, tgt },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const fam = randInt(rng, 0, 1);
      if (fam === 0) {
        const m = pickOne(rng, [2, 3, 4, 5]);
        const xT = surdTex(surd(m, 1, m * m - 1));
        const yT = surdTex(surd(m, -1, m * m - 1));
        const s = 2 * m;
        const tgt = randInt(rng, 0, 1);
        const base = xInv(true);
        const [tt, v, line] =
          tgt === 0
            ? [
                xInv(true, 2),
                s * s - 2,
                `$${xInv(true, 2)}=${lr(base)}^{2}-2=${s}^{2}-2=${s * s - 2}$`,
              ]
            : [
                xInv(true, 3),
                s ** 3 - 3 * s,
                `$${xInv(true, 3)}=${lr(base)}^{3}-3${lr(base)}=${s}^{3}-3\\times ${s}=${s ** 3 - 3 * s}$`,
              ];
        return {
          content: `$x=${xT}$일 때, $${tt}$의 값을 구하시오.`,
          answer: numAnswer(v),
          solution: [
            `$${INV1}=\\dfrac{1}{${xT}}=\\dfrac{${yT}}{(${xT})(${yT})}=${yT}$이므로`,
            `$${base}=(${xT})+(${yT})=${s}$`,
            `따라서 ${line}`,
          ].join("\n"),
          difficulty: "응용",
          facts: { mode, fam, m, tgt },
        };
      }
      const plus = rng() < 0.5;
      const k = nz(rng, -5, 5);
      if (plus && Math.abs(k) < 3) return null;
      const base = xInv(plus);
      const K = paren(k);
      const two = plus ? "-2" : "+2";
      const v2 = plus ? k * k - 2 : k * k + 2;
      const v4 = v2 * v2 - 2;
      return {
        content: `$${base}=${k}$일 때, $${xInv(true, 4)}$의 값을 구하시오.`,
        answer: numAnswer(v4),
        solution: [
          `$${xInv(true, 2)}=${lr(base)}^{2}${two}=${K}^{2}${two}=${v2}$`,
          `$${xInv(true, 4)}=${lr(xInv(true, 2))}^{2}-2=${paren(v2)}^{2}-2=${v4}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, fam, plus: plus ? 1 : -1, k },
      };
    });
  return attempt<Body>((): Body | null => {
    const plus = rng() < 0.5;
    const k = nz(rng, -4, 4);
    if (plus && Math.abs(k) < 3) return null;
    const al = pickOne(rng, [1, 2]);
    const be = nz(rng, -2, 2);
    const gm = nz(rng, -3, 3);
    const sg = plus ? 1 : -1;
    const eq = `x^{2}${term(-k, "x")}${plus ? "+1" : "-1"}=0`;
    const E = `${linTex([
      [al, "x^{3}"],
      [be, "x^{2}"],
      [gm, "x"],
    ])}${fracTerm(sg * gm, "x")}${fracTerm(be, "x^{2}")}${fracTerm(sg * al, "x^{3}")}`;
    const base = xInv(plus);
    const K = paren(k);
    const v1 = k;
    const v2 = plus ? k * k - 2 : k * k + 2;
    const v3 = plus ? k ** 3 - 3 * k : k ** 3 + 3 * k;
    const value = al * v3 + be * v2 + gm * v1;
    if (value === 0) return null;
    const grouped = [
      `${coefPrefix(al)}${lr(xInv(plus, 3))}`,
      `${be < 0 ? "-" : "+"}${Math.abs(be) === 1 ? "" : Math.abs(be)}${lr(xInv(true, 2))}`,
      `${gm < 0 ? "-" : "+"}${Math.abs(gm) === 1 ? "" : Math.abs(gm)}${lr(base)}`,
    ].join("");
    const two = plus ? "-2" : "+2";
    return {
      content: `$${eq}$일 때, $${E}$의 값을 구하시오.`,
      answer: numAnswer(value),
      solution: [
        `$x\\neq 0$이므로 $${eq}$의 양변을 $x$${ro("x")} 나누면 $${base}=${k}$`,
        `$${xInv(true, 2)}=${lr(base)}^{2}${two}=${K}^{2}${two}=${v2}$`,
        `$${xInv(plus, 3)}=${lr(base)}^{3}${plus ? "-" : "+"}3${lr(base)}=${K}^{3}${plus ? "-" : "+"}3\\times ${K}=${v3}$`,
        `주어진 식은 $${grouped}$이므로`,
        `구하는 값은 $${sumOfProducts([
          [al, v3],
          [be, v2],
          [gm, v1],
        ])}=${value}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, plus: sg, k, al, be, gm },
    };
  });
}

// ───────────────────────────── 07 ─────────────────────────────
// 곱셈 공식의 변형 - 문자가 3개
// 꼴 0 (기본·대표): $(a+b+c)^2$ 공식 — 제곱의 합 ↔ 두 개씩 곱의 합
// 꼴 1 (응용): $(a+b)(b+c)(c+a)=(s-c)(s-a)(s-b)$
// 꼴 2 (심화하): $a^2b^2+b^2c^2+c^2a^2$ · $a+b+c=0$ 일 때 $a^4+b^4+c^4$
// (RPM 대표문제의 $a^3+b^3+c^3$ 꼴은 2022 공식 목록 밖이라 안 냈다 — 머리말)

function t07(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const v = randInt(rng, 0, 1);
      const s = nz(rng, -5, 5);
      const e2 = nz(rng, -6, 6);
      if (s * s < 3 * e2) return null;
      const qq = s * s - 2 * e2;
      const S = paren(s);
      if (v === 0)
        return {
          content: `$a+b+c=${s}$, $ab+bc+ca=${e2}$일 때, $a^{2}+b^{2}+c^{2}$의 값을 구하시오.`,
          answer: numAnswer(qq),
          solution: [
            `$a^{2}+b^{2}+c^{2}=(a+b+c)^{2}-2(ab+bc+ca)$`,
            `$=${S}^{2}-2\\times ${paren(e2)}=${qq}$`,
          ].join("\n"),
          difficulty: "기본",
          facts: { mode, v, s, e2, e3: 0 },
        };
      return {
        content: `$a+b+c=${s}$, $a^{2}+b^{2}+c^{2}=${qq}$일 때, $ab+bc+ca$의 값을 구하시오.`,
        answer: numAnswer(e2),
        solution: [
          `$a^{2}+b^{2}+c^{2}=(a+b+c)^{2}-2(ab+bc+ca)$에서`,
          `$${qq}=${S}^{2}-2(ab+bc+ca)$`,
          `따라서 $ab+bc+ca=${e2}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, v, s, e2, e3: 0 },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const v = randInt(rng, 0, 1);
      const s = nz(rng, -5, 5);
      const e2 = nz(rng, -6, 6);
      const e3 = nz(rng, -8, 8);
      if (s * s < 3 * e2) return null;
      const value = s * e2 - e3;
      const qq = s * s - 2 * e2;
      const S = paren(s);
      const given =
        v === 0
          ? `$a+b+c=${s}$, $ab+bc+ca=${e2}$, $abc=${e3}$`
          : `$a+b+c=${s}$, $a^{2}+b^{2}+c^{2}=${qq}$, $abc=${e3}$`;
      const pre =
        v === 0
          ? []
          : [
              `$a^{2}+b^{2}+c^{2}=(a+b+c)^{2}-2(ab+bc+ca)$에서 $${qq}=${S}^{2}-2(ab+bc+ca)$이므로 $ab+bc+ca=${e2}$`,
            ];
      return {
        content: `${given}일 때, $(a+b)(b+c)(c+a)$의 값을 구하시오.`,
        answer: numAnswer(value),
        solution: [
          ...pre,
          `$a+b+c=${s}$에서 $a+b=${s}-c$, $b+c=${s}-a$, $c+a=${s}-b$이므로`,
          `$(a+b)(b+c)(c+a)=(${s}-a)(${s}-b)(${s}-c)$`,
          `$=${S}^{3}-(a+b+c)\\times ${S}^{2}+(ab+bc+ca)\\times ${S}-abc$`,
          `$=${S}^{3}-${S}\\times ${S}^{2}+${paren(e2)}\\times ${S}-${paren(e3)}=${value}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, v, s, e2, e3 },
      };
    });
  return attempt<Body>((): Body | null => {
    const v = randInt(rng, 0, 1);
    if (v === 1) {
      const k = randInt(rng, 1, 6);
      const qq = 2 * k;
      const e2 = -k;
      const value = qq * qq - 2 * e2 * e2;
      return {
        content: `$a+b+c=0$, $a^{2}+b^{2}+c^{2}=${qq}$일 때, $a^{4}+b^{4}+c^{4}$의 값을 구하시오.`,
        answer: numAnswer(value),
        solution: [
          `$a^{2}+b^{2}+c^{2}=(a+b+c)^{2}-2(ab+bc+ca)$에서 $${qq}=0^{2}-2(ab+bc+ca)$이므로 $ab+bc+ca=${e2}$`,
          `$(ab+bc+ca)^{2}=a^{2}b^{2}+b^{2}c^{2}+c^{2}a^{2}+2abc(a+b+c)$에서`,
          `$${paren(e2)}^{2}=a^{2}b^{2}+b^{2}c^{2}+c^{2}a^{2}+2abc\\times 0$이므로 $a^{2}b^{2}+b^{2}c^{2}+c^{2}a^{2}=${e2 * e2}$`,
          `$(a^{2}+b^{2}+c^{2})^{2}=a^{4}+b^{4}+c^{4}+2(a^{2}b^{2}+b^{2}c^{2}+c^{2}a^{2})$에서`,
          `$${qq}^{2}=a^{4}+b^{4}+c^{4}+2\\times ${e2 * e2}$이므로 $a^{4}+b^{4}+c^{4}=${value}$`,
        ].join("\n"),
        difficulty: "심화하",
        facts: { mode, v, s: 0, e2, e3: 0 },
      };
    }
    const s = nz(rng, -5, 5);
    const e2 = nz(rng, -6, 6);
    const e3 = nz(rng, -6, 6);
    if (s * s < 3 * e2) return null;
    const qq = s * s - 2 * e2;
    const value = e2 * e2 - 2 * e3 * s;
    if (value === 0) return null;
    const S = paren(s);
    return {
      content: `$a+b+c=${s}$, $a^{2}+b^{2}+c^{2}=${qq}$, $abc=${e3}$일 때, $a^{2}b^{2}+b^{2}c^{2}+c^{2}a^{2}$의 값을 구하시오.`,
      answer: numAnswer(value),
      solution: [
        `$a^{2}+b^{2}+c^{2}=(a+b+c)^{2}-2(ab+bc+ca)$에서 $${qq}=${S}^{2}-2(ab+bc+ca)$이므로 $ab+bc+ca=${e2}$`,
        `$(ab+bc+ca)^{2}=a^{2}b^{2}+b^{2}c^{2}+c^{2}a^{2}+2abc(a+b+c)$에서`,
        `$${paren(e2)}^{2}=a^{2}b^{2}+b^{2}c^{2}+c^{2}a^{2}+2\\times ${paren(e3)}\\times ${S}$`,
        `따라서 $a^{2}b^{2}+b^{2}c^{2}+c^{2}a^{2}=${value}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, v, s, e2, e3 },
    };
  });
}

// ───────────────────────────── 08 ─────────────────────────────
// 곱셈 공식을 이용한 수의 계산
// 꼴 0 (기본·대표): $(b-1)(b+1)(b^2+1)\cdots$ 가 차례로 접힌다 — $b^n-1$ 의 지수
// 꼴 1 (응용): $\dfrac{(p+\sqrt{r})^3+(p-\sqrt{r})^3}{2p}=p^2+3r$
// 꼴 2 (심화하): $(b-1)$ 이 **없는** 곱 — 양변에 $b-1$ 을 곱해야 접힌다

function powB(b: number, e: number): string {
  return e === 1 ? String(b) : `${b}^{${e}}`;
}

/** $(b^{2^j}+1)$ 들 — j 는 `from` 부터 `k` 까지. */
function foldFactors(b: number, from: number, k: number): string {
  let out = "";
  for (let j = from; j <= k; j += 1) out += `(${powB(b, 2 ** j)}+1)`;
  return out;
}

/** 접히는 줄들 — `=(b^2-1)(b^2+1)…` 부터 `=b^{n}-1` 까지. */
function foldLines(b: number, k: number): string[] {
  const lines: string[] = [];
  for (let j = 1; j <= k; j += 1) {
    lines.push(`$=(${powB(b, 2 ** j)}-1)${foldFactors(b, j, k)}$`);
  }
  lines.push(`$=${powB(b, 2 ** (k + 1))}-1$`);
  return lines;
}

function t08(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const fam = randInt(rng, 0, 1);
      if (fam === 0) {
        const k = pickOne(rng, [2, 3]);
        const n = 2 ** (k + 1);
        const prod = foldFactors(2, 0, k);
        return {
          content: `$${prod}=2^{n}-1$일 때, 자연수 $n$의 값을 구하시오.`,
          answer: numAnswer(n),
          solution: [
            `$${prod}=(2-1)${prod}$`,
            ...foldLines(2, k),
            `따라서 $n=${n}$`,
          ].join("\n"),
          difficulty: "기본",
          facts: { mode, fam, b: 2, k },
        };
      }
      const k = pickOne(rng, [1, 2]);
      const n = 2 ** (k + 1);
      const nums = [9];
      for (let j = 0; j <= k; j += 1) nums.push(10 ** (2 ** j) + 1);
      const shown = nums.join("\\times ");
      return {
        content: `$${shown}=10^{n}-1$일 때, 자연수 $n$의 값을 구하시오.`,
        answer: numAnswer(n),
        solution: [
          `$${shown}=(10-1)${foldFactors(10, 0, k)}$`,
          ...foldLines(10, k),
          `따라서 $n=${n}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, fam, b: 10, k },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const A = pickOne(rng, [10, 20, 50, 100]);
      const B = pickOne(rng, [2, 3, 5, 6, 7, 10, 11]);
      const v = A * A + 3 * B;
      const rt = `\\sqrt{${B}}`;
      return {
        content: `$\\dfrac{(${A}+${rt})^{3}+(${A}-${rt})^{3}}{${2 * A}}$의 값을 구하시오.`,
        answer: numAnswer(v),
        solution: [
          `$p=${A}$, $r=${rt}$${ira(rt)} 하면`,
          `(주어진 식)$=\\dfrac{(p+r)^{3}+(p-r)^{3}}{2p}=\\dfrac{2p^{3}+6pr^{2}}{2p}=p^{2}+3r^{2}$`,
          `$=${A}^{2}+3\\times ${B}=${v}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, A, B },
      };
    });
  return attempt<Body>((): Body | null => {
    const b = pickOne(rng, [3, 5, 7]);
    const k = pickOne(rng, [1, 2]);
    const n = 2 ** (k + 1);
    const prod = foldFactors(b, 0, k);
    const bm = String(b - 1);
    return {
      content: `$${prod}=\\dfrac{${b}^{n}-1}{${b - 1}}$일 때, 자연수 $n$의 값을 구하시오.`,
      answer: numAnswer(n),
      solution: [
        `양변에 $${b}-1$, 즉 $${bm}$${eul(bm)} 곱하면 $(${b}-1)${prod}=${b}^{n}-1$`,
        `좌변은 $(${b}-1)${prod}$`,
        ...foldLines(b, k),
        `따라서 $${powB(b, n)}-1=${b}^{n}-1$이므로 $n=${n}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, fam: 2, b, k },
    };
  });
}

// ───────────────────────────── 09 ─────────────────────────────
// 다항식의 나눗셈 - 몫과 나머지
// 꼴 0 (기본·대표): 삼차식 ÷ 이차식 → 몫 Q(x) · 나머지 R(x) 에 값을 넣기
// 꼴 1 (기본): 몫 $ax+b$ · 나머지 $cx+d$ 의 계수 결합
// 꼴 2 (응용): 사차식 ÷ 이차식의 나머지 — 답이 식(오답 넷: 부호 · 몫과 혼동)

function t09(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const D = [nz(rng, -5, 5), randInt(rng, -4, 4), 1];
      const Qp = [nz(rng, -5, 5), 1];
      const R = [randInt(rng, -6, 6), nz(rng, -5, 5)];
      const F = add(mul(D, Qp), R);
      const [s, t] = distinctInts(rng, -3, 3, 2) as [number, number];
      const Qs = evalAt(Qp, s);
      const Rv = evalAt(R, t);
      const v = Qs + Rv;
      const Ft = polyTex(F);
      const Dt = polyTex(D);
      const Rt = polyTex(R);
      return {
        content: `다항식 $${Ft}$${eul(Ft)} $${Dt}$${ro(Dt)} 나누었을 때의 몫을 $Q(x)$, 나머지를 $R(x)$${ira("R(x)")} 할 때, $Q(${s})+R(${t})$의 값을 구하시오.`,
        answer: numAnswer(v),
        solution: [
          `$${Ft}$${eul(Ft)} $${Dt}$${ro(Dt)} 나누면`,
          `$${Ft}=(${Dt})(${polyTex(Qp)})${withSign(Rt)}$이므로 $Q(x)=${polyTex(Qp)}$, $R(x)=${Rt}$`,
          `따라서 $Q(${s})=${Qs}$, $R(${t})=${Rv}$이므로 $Q(${s})+R(${t})=${v}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: {
          mode,
          d0: D[0]!,
          d1: D[1]!,
          q0: Qp[0]!,
          r0: R[0]!,
          r1: R[1]!,
          s,
          t,
        },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const D = [nz(rng, -5, 5), randInt(rng, -4, 4), 1];
      const a = pickOne(rng, [2, 3]);
      const b = nz(rng, -5, 5);
      const c = nz(rng, -5, 5);
      const d = nz(rng, -6, 6);
      const F = add(mul(D, [b, a]), [d, c]);
      const [exprId, [et, ev]] = chooseExpr(rng, [
        ["ab-cd", a * b - c * d],
        ["a+b+c+d", a + b + c + d],
        ["ab+cd", a * b + c * d],
      ]);
      const Ft = polyTex(F);
      const Dt = polyTex(D);
      return {
        content: `다항식 $${Ft}$${eul(Ft)} $${Dt}$${ro(Dt)} 나누었을 때의 몫이 $ax+b$이고, 나머지가 $cx+d$일 때, $${et}$의 값을 구하시오. (단, $a$, $b$, $c$, $d$${eun("d")} 상수이다.)`,
        answer: numAnswer(ev),
        solution: [
          `$${Ft}$${eul(Ft)} $${Dt}$${ro(Dt)} 나누면`,
          `$${Ft}=(${Dt})(${polyTex([b, a])})${withSign(polyTex([d, c]))}$`,
          `이므로 몫은 $${polyTex([b, a])}$, 나머지는 $${polyTex([d, c])}$`,
          `따라서 $a=${a}$, $b=${b}$, $c=${c}$, $d=${d}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, d0: D[0]!, d1: D[1]!, a, b, c, d, exprId },
      };
    });
  return attempt<Body>((): Body | null => {
    const D = [nz(rng, -5, 5), randInt(rng, -4, 4), 1];
    const Qp = [randInt(rng, -5, 5), randInt(rng, -4, 4), pickOne(rng, [1, 2])];
    const r0 = nz(rng, -6, 6);
    const r1 = nz(rng, -5, 5);
    const R = [r0, r1];
    const F = add(mul(D, Qp), R);
    const ans = polyTex(R);
    const distractors = pickDistractors(rng, ans, [
      polyTex([r0, -r1]),
      polyTex([-r0, r1]),
      polyTex([-r0, -r1]),
      polyTex(Qp),
      polyTex([r1, r0]),
    ]);
    if (distractors === null) return null;
    const Ft = polyTex(F);
    const Dt = polyTex(D);
    return {
      content: `다항식 $${Ft}$${eul(Ft)} $${Dt}$${ro(Dt)} 나누었을 때의 나머지를 구하시오.`,
      answer: $(ans),
      solution: [
        `$${Ft}$${eul(Ft)} $${Dt}$${ro(Dt)} 나누면 몫은 $${polyTex(Qp)}$이고`,
        `$${Ft}=(${Dt})(${polyTex(Qp)})${withSign(ans)}$`,
        `따라서 구하는 나머지는 $${ans}$이다.`,
      ].join("\n"),
      difficulty: "응용",
      facts: {
        mode,
        d0: D[0]!,
        d1: D[1]!,
        q0: Qp[0]!,
        q1: Qp[1]!,
        q2: Qp[2]!,
        r0,
        r1,
      },
      distractors,
    };
  });
}

// ───────────────────────────── 10 ─────────────────────────────
// 다항식의 나눗셈 - A=BQ+R
// 꼴 0 (기본·대표): 나뉘는 식 · 몫 · 나머지로 나누는 식 A — 답이 식(오답 넷)
// 꼴 1 (응용): 한 일차식으로 나눈 결과로 f(x) 를 세우고 다른 일차식으로 다시 나누기
// 꼴 2 (응용): 넓이와 가로로 직사각형의 세로 — 답이 식(오답 넷: 조립제법 부호 실수 등)

/** 일차식 $x-c$ 로 나눈 몫 — **부호를 틀린 조립제법**(c 대신 −c)을 흉내 낼 때도 쓴다. */
function syntheticQuotient(p: readonly number[], c: number): number[] {
  const n = p.length - 1;
  const out = new Array<number>(n).fill(0);
  let carry = 0;
  for (let i = n; i >= 1; i -= 1) {
    carry = carry * c + p[i]!;
    out[i - 1] = carry;
  }
  return out;
}

function t10(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const a0 = nz(rng, -6, 6);
      const a1 = nz(rng, -4, 4);
      const A = [a0, a1, 1];
      const Qp = [nz(rng, -4, 4), randInt(rng, -4, 4), pickOne(rng, [1, 2])];
      const R = [randInt(rng, -6, 6), randInt(rng, -4, 4)];
      if (R[0] === 0 && R[1] === 0) return null;
      const F = add(mul(A, Qp), R);
      const ans = polyTex(A);
      const distractors = pickDistractors(rng, ans, [
        polyTex([-a0, a1, 1]),
        polyTex([a0, -a1, 1]),
        polyTex([-a0, -a1, 1]),
        polyTex(add(A, R)),
        polyTex(sub(A, R)),
      ]);
      if (distractors === null) return null;
      const Ft = polyTex(F);
      const Qt = polyTex(Qp);
      const Rt = polyTex(R);
      const FR = polyTex(sub(F, R));
      return {
        content: `다항식 $${Ft}$${eul(Ft)} 다항식 $A$${ro("A")} 나누었을 때의 몫이 $${Qt}$이고, 나머지가 $${Rt}$일 때, 다항식 $A$${eul("A")} 구하시오.`,
        answer: $(ans),
        solution: [
          `$${Ft}=A(${Qt})${withSign(Rt)}$이므로`,
          `$A(${Qt})=${FR}$`,
          `따라서 $A=(${FR})\\div(${Qt})=${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: {
          mode,
          a0,
          a1,
          q0: Qp[0]!,
          q1: Qp[1]!,
          q2: Qp[2]!,
          r0: R[0]!,
          r1: R[1]!,
        },
        distractors,
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const [a, b] = distinctInts(rng, -4, 4, 2, { nonzero: true }) as [
        number,
        number,
      ];
      const Q1 = [nz(rng, -6, 6), pickOne(rng, [1, 2, 3, -1, -2])];
      const r = nz(rng, -6, 6);
      const F = add(mul([-a, 1], Q1), [r]);
      const { q: Q2, r: R2 } = divMod(F, [-b, 1]);
      const R2v = R2[0] ?? 0;
      const t = pickOne(rng, [1, 2, -1]);
      const qv = evalAt(Q2, t);
      const v = qv + R2v;
      const fa = factorTex(a);
      const fb = factorTex(b);
      const Ft = polyTex(F);
      return {
        content: `다항식 $f(x)$${eul("f(x)")} $${fa}$${ro(fa)} 나누었을 때의 몫이 $${polyTex(Q1)}$이고, 나머지가 $${r}$이다. $f(x)$${eul("f(x)")} $${fb}$${ro(fb)} 나누었을 때의 몫을 $Q(x)$, 나머지를 $R$${ira("R")} 할 때, $Q(${t})+R$의 값을 구하시오.`,
        answer: numAnswer(v),
        solution: [
          `$f(x)=(${fa})(${polyTex(Q1)})${plusConst(r)}=${Ft}$`,
          `$${Ft}=(${fb})(${polyTex(Q2)})${plusConst(R2v)}$이므로 $Q(x)=${polyTex(Q2)}$, $R=${R2v}$`,
          `따라서 $Q(${t})=${qv}$이므로 $Q(${t})+R=${v}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, a, n: Q1[0]!, m: Q1[1]!, r, b, t },
      };
    });
  return attempt<Body>((): Body | null => {
    const a = randInt(rng, 1, 5);
    const w1 = nz(rng, -5, 5);
    const w0 = randInt(rng, 1, 9);
    if (w1 * w1 - 4 * w0 >= 0) return null;
    const W = [w0, w1, 1];
    const P = mul([a, 1], W);
    const ans = polyTex(W);
    const distractors = pickDistractors(rng, ans, [
      polyTex(syntheticQuotient(P, a)),
      polyTex([-w0, w1, 1]),
      polyTex([w0, -w1, 1]),
      polyTex([-w0, -w1, 1]),
    ]);
    if (distractors === null) return null;
    const lt = factorTex(-a);
    const Pt = polyTex(P);
    return {
      content: `가로의 길이가 $${lt}$인 직사각형의 넓이가 $${Pt}$일 때, 이 직사각형의 세로의 길이를 구하시오.`,
      answer: $(ans),
      solution: [
        `직사각형의 세로의 길이를 $A$${ira("A")} 하면 $(${lt})A=${Pt}$`,
        `따라서 $A=(${Pt})\\div(${lt})=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, a, w0, w1 },
      distractors,
    };
  });
}

// ───────────────────────────── 11 ─────────────────────────────
// 몫과 나머지의 변형
// 꼴 0 (기본·대표): $x-\frac{b}{a}$ ↔ $ax-b$ 로 나눈 몫 — 답이 $\frac1a Q(x)$ · $aQ(x)$ (오답 넷: 역수·부호)
// 꼴 1 (응용): 구체적인 식을 $ax-b$ 로 — $x-\frac{b}{a}$ 로 조립제법한 몫을 a 로 나눈다
// 꼴 2 (심화하): $xf(x)$ 를 $ax-b$ 로 나눈 나머지

function t11(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  const a = pickOne(rng, mode === 1 ? [2, 3] : [2, 3, 4, 5]);
  const b = attempt<number>(() => {
    const v = nz(rng, -5, 5);
    return Math.abs(v) % a === 0 || (a % 2 === 0 && v % 2 === 0) ? null : v;
  });
  const lin1 = xPlusFrac(-b, a);
  const lin2 = linTex([[a, "x"]], -b);
  if (mode === 0) {
    const dir = randInt(rng, 0, 1);
    const inv = `\\dfrac{1}{${a}}Q(x)`;
    const mult = `${a}Q(x)`;
    const [from, to, ans, wrong] =
      dir === 0
        ? [lin1, lin2, inv, [mult, "Q(x)", `-${inv}`, `-${mult}`]]
        : [lin2, lin1, mult, [inv, "Q(x)", `-${mult}`, `-${inv}`]];
    const lines =
      dir === 0
        ? [
            `$f(x)=${lr(lin1)}Q(x)+R$`,
            `$=\\dfrac{1}{${a}}(${lin2})Q(x)+R=(${lin2})\\times\\dfrac{1}{${a}}Q(x)+R$`,
          ]
        : [
            `$f(x)=(${lin2})Q(x)+R$`,
            `$=${a}${lr(lin1)}Q(x)+R=${lr(lin1)}\\times ${a}Q(x)+R$`,
          ];
    return {
      content: `다항식 $f(x)$${eul("f(x)")} $${from}$${ro(from)} 나누었을 때의 몫을 $Q(x)$, 나머지를 $R$${ira("R")} 할 때, $f(x)$${eul("f(x)")} $${to}$${ro(to)} 나누었을 때의 몫을 구하시오.`,
      answer: $(ans),
      solution: [
        ...lines,
        `따라서 $f(x)$${eul("f(x)")} $${to}$${ro(to)} 나누었을 때의 몫은 $${ans}$, 나머지는 $R$이다.`,
      ].join("\n"),
      difficulty: "기본",
      facts: { mode, dir, a, b },
      distractors: wrong.map((w) => $(w)),
    };
  }
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const Qp = [randInt(rng, -5, 5), randInt(rng, -5, 5), nz(rng, -3, 3)];
      const R = nz(rng, -6, 6);
      const F = add(mul([-b, a], Qp), [R]);
      const t = pickOne(rng, [1, -1, 2]);
      const qv = evalAt(Qp, t);
      const v = qv + R;
      const Ft = polyTex(F);
      const aQ = polyTex(scale(Qp, a));
      const Qt = polyTex(Qp);
      return {
        content: `다항식 $${Ft}$${eul(Ft)} $${lin2}$${ro(lin2)} 나누었을 때의 몫을 $Q(x)$, 나머지를 $R$${ira("R")} 할 때, $Q(${t})+R$의 값을 구하시오.`,
        answer: numAnswer(v),
        solution: [
          `조립제법을 이용하여 $${Ft}$${eul(Ft)} $${lin1}$${ro(lin1)} 나누면 몫은 $${aQ}$, 나머지는 $${R}$이므로`,
          `$${Ft}=${lr(lin1)}(${aQ})${plusConst(R)}=(${lin2})(${Qt})${plusConst(R)}$`,
          `즉 $Q(x)=${Qt}$, $R=${R}$`,
          `따라서 $Q(${t})=${qv}$이므로 $Q(${t})+R=${v}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: {
          mode,
          a,
          b,
          q0: Qp[0]!,
          q1: Qp[1]!,
          q2: Qp[2]!,
          R,
          t,
        },
      };
    });
  return attempt<Body>((): Body | null => {
    const k = nz(rng, -3, 3);
    const R = a * k;
    const v = k * b;
    const Rs = String(R);
    return {
      content: `다항식 $f(x)$${eul("f(x)")} $${lin1}$${ro(lin1)} 나누었을 때의 몫을 $Q(x)$, 나머지를 $${R}$${ira(Rs)} 할 때, 다항식 $xf(x)$${eul("xf(x)")} $${lin2}$${ro(lin2)} 나누었을 때의 나머지를 구하시오.`,
      answer: numAnswer(v),
      solution: [
        `$f(x)=${lr(lin1)}Q(x)${plusConst(R)}$이므로`,
        `$xf(x)=x${lr(lin1)}Q(x)${term(R, "x")}=(${lin2})\\times\\dfrac{x}{${a}}Q(x)${term(R, "x")}$`,
        `이때 $${term(R, "x", true)}=${coefPrefix(k)}(${lin2})${plusConst(v)}$이므로`,
        `$xf(x)=(${lin2})\\left\\{\\dfrac{x}{${a}}Q(x)${plusConst(k)}\\right\\}${plusConst(v)}$`,
        `따라서 구하는 나머지는 $${v}$이다.`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, a, b, k, R },
    };
  });
}

// ───────────────────────────── 12 ─────────────────────────────
// 조립제법
// 꼴 0 (기본·대표): 일차식 $x-\alpha$ 로 조립제법 — 몫의 계수와 나머지(문자로 둔 자리)
// 꼴 1 (응용): $ax+b$ 로 나눈 몫 — 조립제법의 몫을 a 로 나눠야 한다(오답 넷: 안 나눈 몫 · 부호)

function t12(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const al = nz(rng, -3, 3);
      const q2 = pickOne(rng, [1, 2, 3]);
      const q1 = randInt(rng, -5, 5);
      const q0 = randInt(rng, -5, 5);
      const R = randInt(rng, -8, 8);
      const F = add(mul([-al, 1], [q0, q1, q2]), [R]);
      const [f0, f1, f2, f3] = [F[0] ?? 0, F[1] ?? 0, F[2] ?? 0, F[3] ?? 0];
      const v = q1 + q0 + R;
      const Ft = polyTex(F);
      const fa = factorTex(al);
      const A = paren(al);
      return {
        content: `조립제법을 이용하여 다항식 $${Ft}$${eul(Ft)} $${fa}$${ro(fa)} 나누었을 때의 몫이 $${coefPrefix(q2)}x^{2}+bx+c$, 나머지가 $R$일 때, 상수 $b$, $c$, $R$에 대하여 $b+c+R$의 값을 구하시오.`,
        answer: numAnswer(v),
        solution: [
          `조립제법에서 차례로 내려 쓰는 수는`,
          `$${f3}$, $${f3}\\times ${A}${plusConst(f2)}=${q1}$, $${q1}\\times ${A}${plusConst(f1)}=${q0}$, $${q0}\\times ${A}${plusConst(f0)}=${R}$`,
          `이므로 몫은 $${polyTex([q0, q1, q2])}$, 나머지는 $${R}$이다.`,
          `따라서 $b=${q1}$, $c=${q0}$, $R=${R}$이므로 $b+c+R=${v}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, al, f0, f1, f2, f3 },
      };
    });
  return attempt<Body>((): Body | null => {
    const a = pickOne(rng, [2, 3]);
    const b = nz(rng, -5, 5);
    if (b % a === 0 || (a % 2 === 0 && b % 2 === 0)) return null;
    const Qp = [randInt(rng, -5, 5), randInt(rng, -5, 5), nz(rng, -3, 3)];
    const R = randInt(rng, -6, 6);
    const F = add(mul([b, a], Qp), [R]);
    const ans = polyTex(Qp);
    const distractors = pickDistractors(
      rng,
      ans,
      [
        polyTex(scale(Qp, a)),
        polyTex(scale(Qp, -1)),
        polyTex([-Qp[0]!, Qp[1]!, Qp[2]!]),
        polyTex([Qp[0]!, -Qp[1]!, Qp[2]!]),
        polyTex(add(Qp, [R])),
      ].filter((s) => s !== "0"),
    );
    if (distractors === null) return null;
    const lin = linTex([[a, "x"]], b);
    const linH = xPlusFrac(b, a);
    const Ft = polyTex(F);
    const aQ = polyTex(scale(Qp, a));
    return {
      content: `조립제법을 이용하여 다항식 $${Ft}$${eul(Ft)} $${lin}$${ro(lin)} 나누었을 때의 몫을 구하시오.`,
      answer: $(ans),
      solution: [
        `$${lin}=${a}${lr(linH)}$이므로 조립제법을 이용하여 $${Ft}$${eul(Ft)} $${linH}$${ro(linH)} 나누면`,
        `몫은 $${aQ}$, 나머지는 $${R}$이다.`,
        `$${Ft}=${lr(linH)}(${aQ})${plusConst(R)}=(${lin})(${ans})${plusConst(R)}$`,
        `따라서 구하는 몫은 $${ans}$이다.`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, a, b, q0: Qp[0]!, q1: Qp[1]!, q2: Qp[2]!, R },
      distractors,
    };
  });
}

// ───────────────────────────── 13 ─────────────────────────────
// 특수한 식의 변형
// 꼴 0 (기본·대표): 두 차로 $a^2+b^2+c^2-ab-bc-ca=\frac12\{(a-b)^2+(b-c)^2+(c-a)^2\}$
// 꼴 1 (응용): 세 합(근호 포함)으로 $a^2+b^2+c^2+ab+bc+ca=\frac12\{(a+b)^2+\cdots\}$
// 꼴 2 (심화하): 실수 조건 $a^2+b^2+c^2=ab+bc+ca$ → $a=b=c$

function t13(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const v = randInt(rng, 0, 1);
      const p = nz(rng, -5, 5);
      const r = nz(rng, -5, 5);
      // 셋째 차가 0 이면 해설에 `+0^{2}` 가 찍힌다(지면 냄새)
      if ((v === 0 && r === p) || (v === 1 && r === -p)) return null;
      const bc = v === 0 ? r - p : r;
      const ca = v === 0 ? -r : -(p + r);
      const value = (p * p + bc * bc + ca * ca) / 2;
      const given =
        v === 0 ? `$a-b=${p}$, $a-c=${r}$` : `$a-b=${p}$, $b-c=${r}$`;
      const derived = v === 0 ? `$b-c=${bc}$, $c-a=${ca}$` : `$c-a=${ca}$`;
      return {
        content: `${given}일 때, $a^{2}+b^{2}+c^{2}-ab-bc-ca$의 값을 구하시오.`,
        answer: numAnswer(value),
        solution: [
          `$a^{2}+b^{2}+c^{2}-ab-bc-ca=\\dfrac{1}{2}\\{(a-b)^{2}+(b-c)^{2}+(c-a)^{2}\\}$`,
          `${given}에서 ${derived}`,
          `따라서 구하는 값은 $\\dfrac{1}{2}\\times\\{${paren(p)}^{2}+${paren(bc)}^{2}+${paren(ca)}^{2}\\}=${value}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, v, p, r },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const m = nz(rng, -3, 4);
      const rr = pickOne(rng, [2, 3, 5, 6, 7]);
      const k = pickOne(rng, [2, 4, 6, -2, -4]);
      const xT = surdTex(surd(m, 1, rr));
      const yT = surdTex(surd(m, -1, rr));
      const sq = 2 * (m * m + rr);
      const value = (sq + k * k) / 2;
      return {
        content: `$a+b=${xT}$, $b+c=${yT}$, $c+a=${k}$일 때, $a^{2}+b^{2}+c^{2}+ab+bc+ca$의 값을 구하시오.`,
        answer: numAnswer(value),
        solution: [
          `$a^{2}+b^{2}+c^{2}+ab+bc+ca=\\dfrac{1}{2}\\{(a+b)^{2}+(b+c)^{2}+(c+a)^{2}\\}$`,
          `$=\\dfrac{1}{2}\\times\\{(${xT})^{2}+(${yT})^{2}+${paren(k)}^{2}\\}$`,
          `$=\\dfrac{1}{2}\\times(${sq}+${k * k})=${value}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, m, rr, k },
      };
    });
  return attempt<Body>((): Body | null => {
    const t = nz(rng, -4, 4);
    const tgt = randInt(rng, 0, 2);
    const [tt, value] =
      tgt === 0
        ? ["abc", t ** 3]
        : tgt === 1
          ? ["a^{2}+b^{2}+c^{2}", 3 * t * t]
          : ["a+2b+3c", 6 * t];
    return {
      content: `세 실수 $a$, $b$, $c$에 대하여 $a^{2}+b^{2}+c^{2}=ab+bc+ca$, $a+b+c=${3 * t}$일 때, $${tt}$의 값을 구하시오.`,
      answer: numAnswer(value),
      solution: [
        `$a^{2}+b^{2}+c^{2}-ab-bc-ca=0$이므로 $\\dfrac{1}{2}\\{(a-b)^{2}+(b-c)^{2}+(c-a)^{2}\\}=0$`,
        `$a$, $b$, $c$${eun("c")} 실수이므로 $a-b=0$, $b-c=0$, $c-a=0$, 즉 $a=b=c$`,
        `$a+b+c=${3 * t}$에서 $a=b=c=${t}$`,
        `따라서 $${tt}=${value}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, t, tgt },
    };
  });
}

// ───────────────────────────── 14 ─────────────────────────────
// 곱셈 공식의 도형에의 활용 — 그림 없이 수치가 다 주어지는 꼴만(머리말)
// 꼴 0 (기본·대표): 직육면체의 겉넓이 · 모서리의 합 → 대각선의 길이
// 꼴 1 (응용): 직사각형의 대각선 · 둘레 → 넓이
// 꼴 2 (심화하): 세 정사각형과 직사각형 — 넓이의 합 · 둘레의 합 → 넓이의 차

/** 대각선이 자연수인 직육면체 모서리 $(a,b,c)$. */
const BOXES: readonly (readonly [number, number, number])[] = [
  [1, 2, 2],
  [2, 3, 6],
  [1, 4, 8],
  [4, 4, 7],
  [2, 6, 9],
  [6, 6, 7],
  [3, 4, 12],
  [2, 5, 14],
  [2, 10, 11],
  [2, 4, 4],
  [3, 6, 6],
  [4, 8, 8],
  [8, 9, 12],
];

/** 빗변이 자연수인 직각삼각형 — 직사각형의 가로·세로. */
const RECTS: readonly (readonly [number, number])[] = [
  [3, 4],
  [6, 8],
  [5, 12],
  [8, 15],
  [9, 12],
  [7, 24],
  [12, 16],
  [20, 21],
  [15, 20],
];

function t14(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const [a, b, c] = pickOne(rng, BOXES);
      const d = Math.sqrt(a * a + b * b + c * c);
      const S = 2 * (a * b + b * c + c * a);
      const L = 4 * (a + b + c);
      const e2 = S / 2;
      const s = L / 4;
      const dd = d * d;
      return {
        content: `직육면체 모양의 상자의 겉넓이가 $${S}$이고 모든 모서리의 길이의 합이 $${L}$일 때, 이 상자의 대각선의 길이를 구하시오.`,
        answer: numAnswer(d),
        solution: [
          `상자의 가로의 길이, 세로의 길이, 높이를 각각 $a$, $b$, $c$${ira("c")} 하면 대각선의 길이는 $\\sqrt{a^{2}+b^{2}+c^{2}}$이다.`,
          `겉넓이가 $${S}$이므로 $2(ab+bc+ca)=${S}$, 즉 $ab+bc+ca=${e2}$`,
          `모든 모서리의 길이의 합이 $${L}$이므로 $4(a+b+c)=${L}$, 즉 $a+b+c=${s}$`,
          `$a^{2}+b^{2}+c^{2}=(a+b+c)^{2}-2(ab+bc+ca)=${s}^{2}-2\\times ${e2}=${dd}$`,
          `따라서 대각선의 길이는 $\\sqrt{${dd}}=${d}$이다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, a, b, c },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const [x, y] = pickOne(rng, RECTS);
      const d = Math.sqrt(x * x + y * y);
      const P = 2 * (x + y);
      const s = x + y;
      const v = x * y;
      return {
        content: `대각선의 길이가 $${d}$이고 둘레의 길이가 $${P}$인 직사각형의 넓이를 구하시오.`,
        answer: numAnswer(v),
        solution: [
          `직사각형의 가로의 길이와 세로의 길이를 각각 $x$, $y$${ira("y")} 하면`,
          `대각선의 길이가 $${d}$이므로 $\\sqrt{x^{2}+y^{2}}=${d}$, 즉 $x^{2}+y^{2}=${d * d}$`,
          `둘레의 길이가 $${P}$이므로 $2(x+y)=${P}$, 즉 $x+y=${s}$`,
          `$x^{2}+y^{2}=(x+y)^{2}-2xy$에서 $${d * d}=${s}^{2}-2xy$`,
          `따라서 직사각형의 넓이는 $xy=${v}$이다.`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, x, y },
      };
    });
  return attempt<Body>((): Body | null => {
    const [a, b, c] = distinctInts(rng, 1, 9, 3) as [number, number, number];
    const Sa = a * a + b * b + c * c;
    const Pp = 4 * (a + b + c);
    const s = a + b + c;
    const v = a * b + b * c + c * a;
    return {
      content: `한 변의 길이가 각각 $a$, $b$, $c$인 세 정사각형 $A$, $B$, $C$${gwa("C")} 이웃하는 두 변의 길이가 각각 $a+b$, $a+c$인 직사각형 $D$${ga("D")} 있다. 세 정사각형의 넓이의 합은 $${Sa}$이고, 둘레의 길이의 합은 $${Pp}$이다. 정사각형 $A$의 넓이를 $S_{A}$, 직사각형 $D$의 넓이를 $S_{D}$${ira("S_{D}")} 할 때, $S_{D}-S_{A}$의 값을 구하시오.`,
      answer: numAnswer(v),
      solution: [
        `세 정사각형의 넓이의 합이 $${Sa}$이므로 $a^{2}+b^{2}+c^{2}=${Sa}$`,
        `둘레의 길이의 합이 $${Pp}$이므로 $4a+4b+4c=${Pp}$, 즉 $a+b+c=${s}$`,
        `$S_{D}-S_{A}=(a+b)(a+c)-a^{2}=ab+bc+ca$이고`,
        `$a^{2}+b^{2}+c^{2}=(a+b+c)^{2}-2(ab+bc+ca)$에서 $${Sa}=${s}^{2}-2(ab+bc+ca)$`,
        `따라서 $S_{D}-S_{A}=ab+bc+ca=${v}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, a, b, c },
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
export const H1_POLY_OPS: HighTypeEntry[] = [
  entry("01", "다항식의 덧셈과 뺄셈", SEC.덧셈뺄셈, t01),
  entry("02", "다항식의 전개식에서 계수 구하기", SEC.곱셈, t02),
  entry("03", "곱셈 공식을 이용한 다항식의 전개", SEC.곱셈공식, t03),
  entry("04", "공통부분이 있는 다항식의 전개", SEC.곱셈공식, t04),
  entry("05", "곱셈 공식의 변형 - 문자가 2개", SEC.변형, t05),
  entry("06", "곱셈 공식의 변형 -x의 꼴", SEC.변형, t06),
  entry("07", "곱셈 공식의 변형 - 문자가 3개", SEC.변형, t07),
  entry("08", "곱셈 공식을 이용한 수의 계산", SEC.곱셈공식, t08),
  entry("09", "다항식의 나눗셈 - 몫과 나머지", SEC.나눗셈, t09),
  entry("10", "다항식의 나눗셈 -A=BQ+R", SEC.나눗셈, t10),
  entry("11", "몫과 나머지의 변형", SEC.나눗셈, t11),
  entry("12", "조립제법", SEC.나눗셈, t12),
  entry("13", "특수한 식의 변형", SEC.변형, t13),
  entry("14", "곱셈 공식의 도형에의 활용", SEC.변형, t14),
];

/** 이 중단원은 색인 14유형을 모두 등록했다 — 보류 없음. */
export const H1_POLY_OPS_HOLD: HighHold[] = [];
