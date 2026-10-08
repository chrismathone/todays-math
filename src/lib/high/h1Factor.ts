/**
 * 공통수학1 「인수분해」 — RPM 공통수학1(2022) 색인 10유형. **물결 1 세션 `h1-poly` 소유.**
 *
 * 본보기 `h1Identity.ts` 를 그대로 따른다(꼴마다 칸 · 식 정답이면 오답 넷 · 조사는 `josa.ts`).
 * 브리프 `docs/planning/tracks/high-wave1-brief.md`.
 *
 * ## 교육과정 울타리(브리프 §4)
 *
 * 인수분해 공식은 $(a+b+c)^2$ · $(a\pm b)^3$ · $a^3\pm b^3$ 까지만 쓴다. RPM 개념 상자의
 * $a^4+a^2b^2+b^4$ · $a^3+b^3+c^3-3abc$ 공식은 **안 냈다** — $x^4+ax^2+b$ 꼴은 「이차항을 쪼개
 * $A^2-B^2$」로만 풀리는 수치를 골랐다(공식을 몰라도 풀린다).
 *
 * ## 「옳지 않은 것은?」·「인수인 것은?」은 식 정답으로 옮겼다
 *
 * RPM 대표문제 일부는 보기 다섯 중 고르는 꼴이다. 우리 형식(단답·객관)은 정답 하나에서 객관식을
 * 파생하므로, 같은 판단을 **인수분해한 식을 답하기**(오답 넷은 부호 · 공식 혼동 · 상수 짝 바꿈)나
 * **계수의 결합**으로 묻는다. 「삼각형 모양의 판단」은 모양을 말로 답하는 대신 **그 모양이어야
 * 정해지는 수**(둘레 · 넓이)를 묻는다 — 모양을 잘못 판단하면 수가 안 나온다.
 *
 * ## 우리 단원(시드 `prisma/seed-data/units.ts` 공통수학1 「1. 다항식」)
 *
 *   01 · 07 · 08 · 09 · 10 → 인수분해 · 02~06 → 복잡한 식의 인수분해(1)
 *   `(1)`·`(2)` 를 가르는 근거가 시드에 없어 브리프 규칙대로 `(1)` 에 두었다
 *   (04 여러 문자 · 05 순환 · 06 인수정리가 `(2)` 후보 — 원장님 확인 대상).
 *
 * RPM 원본은 구조만 보았다(`.rpm-src/22/`). 본문·수치를 옮기지 않는다(저작권).
 */
import type { Difficulty } from "@/contracts/difficulty";

import type { Rng } from "../elementary/types";

import { eul, eun, ga, ira, ro } from "./josa";
import { q, qTex, surd, surdTex } from "./numbers";
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
} from "./pick";
import {
  factorParen,
  factorTex,
  fromRoots,
  linTex,
  mul,
  paren,
  polyTex,
  pow,
  term,
} from "./poly";
import type { HighHold, HighProblem, HighTypeEntry } from "./types";

const GRADE = "공통수학1";
const BOOK = "공통수학1";
const MINOR = "인수분해";

/** 우리 `Unit.section` 정확한 이름 (prisma/seed-data/units.ts 공통수학1 1. 다항식). */
const SEC = {
  인수분해: "인수분해",
  복잡: "복잡한 식의 인수분해(1)",
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

// ───────────────────────────── 공용 조각 ─────────────────────────────

function chooseExpr(rng: Rng, exprs: readonly Expr[]): [number, Expr] {
  const id = randInt(rng, 0, exprs.length - 1);
  return [id, exprs[id]!];
}

/** 계수가 0 이면 아무것도 안 쓰는 항 — `+0t` 는 지면 냄새다. */
function termNZ(c: number, body: string): string {
  return c === 0 ? "" : term(c, body);
}

/**
 * x 에 대해 정리할 때의 일차항 — 계수가 $cy\cdot y+c_0$. 두 항이면 괄호(`+(y+1)x`), 상수뿐이면
 * `+5x`, y 항뿐이면 `+(2y)x`. `+(5)x` 는 지면 냄새다.
 */
function xLinear(cy: number, c0: number): string {
  if (cy === 0) return termNZ(c0, "x");
  if (c0 === 0) return `+(${term(cy, "y", true)})x`;
  return `+(${linTex([[cy, "y"]], c0)})x`;
}

function shuffled<T>(rng: Rng, xs: readonly T[]): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const t = out[i]!;
    out[i] = out[j]!;
    out[j] = t;
  }
  return out;
}

function isSquare(n: number): boolean {
  if (n < 0) return false;
  const r = Math.round(Math.sqrt(n));
  return r * r === n;
}

/** 두 수가 서로소인가(0 은 아님). */
function coprime(a: number, b: number): boolean {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x === 1;
}

/**
 * 짝지으면 공통부분이 생기는 네 일차식 $(x+\alpha)(x+\delta)\cdot(x+\beta)(x+\gamma)$ —
 * $\alpha+\delta=\beta+\gamma=s$, 넷 다 다르고 0 이 아니다.
 */
function pairRoots(rng: Rng): {
  s: number;
  al: number;
  de: number;
  be: number;
  gm: number;
} | null {
  const s = nz(rng, -3, 3);
  const [al, be] = distinctInts(rng, -4, 4, 2, { nonzero: true }) as [
    number,
    number,
  ];
  const de = s - al;
  const gm = s - be;
  const all = [al, be, gm, de];
  if (new Set(all).size !== 4 || all.includes(0)) return null;
  return { s, al, de, be, gm };
}

// 공용 후보: 여러 문자 다항식(a·b·c) 셈과 표기 — poly.ts 는 x 한 문자뿐이다.
// 열쇠는 지수 묶음 `"i,j,k"` ($a^ib^jc^k$). 지면에는 지수 묶음 내림차순(사전식)으로 쓴다.
type M3 = readonly [number, number, number];
type MPoly = Map<string, number>;
const ABC = ["a", "b", "c"] as const;

function mpoly(terms: readonly (readonly [number, M3])[]): MPoly {
  const out: MPoly = new Map();
  for (const [c, e] of terms) {
    const k = e.join(",");
    out.set(k, (out.get(k) ?? 0) + c);
  }
  for (const [k, v] of out) if (v === 0) out.delete(k);
  return out;
}

function mpMul(x: MPoly, y: MPoly): MPoly {
  const terms: [number, M3][] = [];
  for (const [kx, vx] of x) {
    const ex = kx.split(",").map(Number);
    for (const [ky, vy] of y) {
      const ey = ky.split(",").map(Number);
      terms.push([
        vx * vy,
        [ex[0]! + ey[0]!, ex[1]! + ey[1]!, ex[2]! + ey[2]!],
      ]);
    }
  }
  return mpoly(terms);
}

function powTex(v: string, i: number): string {
  if (i === 0) return "";
  if (i === 1) return v;
  return `${v}^{${i}}`;
}

function mpTex(p: MPoly): string {
  const keys = [...p.keys()].sort((k1, k2) => {
    const e1 = k1.split(",").map(Number);
    const e2 = k2.split(",").map(Number);
    for (let i = 0; i < 3; i += 1) {
      if (e1[i] !== e2[i]) return e2[i]! - e1[i]!;
    }
    return 0;
  });
  const parts: string[] = [];
  for (const k of keys) {
    const e = k.split(",").map(Number);
    const body = ABC.map((v, i) => powTex(v, e[i]!)).join("");
    parts.push(term(p.get(k)!, body, parts.length === 0));
  }
  return parts.join("");
}

/** 문자 i 의 k 제곱 — 지수 묶음. */
function unit(i: number, k = 1): M3 {
  return [i === 0 ? k : 0, i === 1 ? k : 0, i === 2 ? k : 0];
}

function addE(x: M3, y: M3): M3 {
  return [x[0] + y[0], x[1] + y[1], x[2] + y[2]];
}

/** 두 문자의 합 — 알파벳 순서로(`b+a` 가 아니라 `a+b`). */
function plus2(x: string, y: string): string {
  return [x, y].sort().join("+");
}

// ───────────────────────────── 01 ─────────────────────────────
// 인수분해 공식을 이용한 다항식의 인수분해
// 꼴 0 (기본·대표): $a^3\pm b^3$ · $(a\pm b)^3$ · $(a+b+c)^2$ 로 인수분해 — 답이 식
//   (오답 넷: 가운데 항 부호 · 합과 차 공식 혼동 · 가운데 계수 $2ab$ · 상수 짝 바꿈)
// 꼴 1 (응용): $(x+m)^3\pm n^3$ — 공통부분을 한 덩어리로 보고 세제곱의 합·차

function t01(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const fam = randInt(rng, 0, 2);
      const sg = pickOne(rng, [1, -1]);
      const sgn = sg > 0 ? "+" : "-";
      if (fam === 0) {
        const p = pickOne(rng, [1, 2, 3]);
        const q = pickOne(rng, [1, 2, 3, 4]);
        const withY = rng() < 0.5;
        const E = withY
          ? linTex([
              [p ** 3, "x^{3}"],
              [sg * q ** 3, "y^{3}"],
            ])
          : linTex([[p ** 3, "x^{3}"]], sg * q ** 3);
        const f1 = (s: number): string =>
          withY
            ? linTex([
                [p, "x"],
                [s * q, "y"],
              ])
            : linTex([[p, "x"]], s * q);
        const f2 = (mid: number, last: number): string =>
          withY
            ? linTex([
                [p * p, "x^{2}"],
                [mid * p * q, "xy"],
                [last * q * q, "y^{2}"],
              ])
            : linTex(
                [
                  [p * p, "x^{2}"],
                  [mid * p * q, "x"],
                ],
                last * q * q,
              );
        const ans = `(${f1(sg)})(${f2(-sg, 1)})`;
        const distractors = pickDistractors(rng, ans, [
          `(${f1(sg)})(${f2(sg, 1)})`,
          `(${f1(-sg)})(${f2(-sg, 1)})`,
          `(${f1(sg)})(${f2(-2 * sg, 1)})`,
          `(${f1(-sg)})(${f2(sg, 1)})`,
          `(${f1(sg)})(${f2(-sg, -1)})`,
        ]);
        if (distractors === null) return null;
        const aT = p === 1 ? "x" : `(${p}x)`;
        const bT = withY ? (q === 1 ? "y" : `(${q}y)`) : String(q);
        const cubes = `${aT}^{3}${sgn}${bT}^{3}`;
        return {
          content: `다항식 $${E}$${eul(E)} 인수분해하시오.`,
          answer: $(ans),
          // `x^{3}+y^{3}=x^{3}+y^{3}` 처럼 같은 식을 되풀이하지 않는다
          solution: [
            cubes === E ? `$${E}$` : `$${E}=${cubes}$`,
            `$=${ans}$`,
          ].join("\n"),
          difficulty: "기본",
          facts: { mode, fam, p, q, sg, y: withY ? 1 : 0 },
          distractors,
        };
      }
      if (fam === 1) {
        const p = pickOne(rng, [1, 2, 3]);
        const q = pickOne(rng, [1, 2, 3]);
        const E = linTex([
          [p ** 3, "x^{3}"],
          [sg * 3 * p * p * q, "x^{2}y"],
          [3 * p * q * q, "xy^{2}"],
          [sg * q ** 3, "y^{3}"],
        ]);
        const L = (s: number): string =>
          linTex([
            [p, "x"],
            [s * q, "y"],
          ]);
        const ans = `(${L(sg)})^{3}`;
        const distractors = pickDistractors(rng, ans, [
          `(${L(-sg)})^{3}`,
          `(${L(sg)})^{2}(${L(-sg)})`,
          `(${L(-sg)})^{2}(${L(sg)})`,
          `(${L(sg)})(${linTex([
            [p * p, "x^{2}"],
            [-sg * p * q, "xy"],
            [q * q, "y^{2}"],
          ])})`,
        ]);
        if (distractors === null) return null;
        const aT = p === 1 ? "x" : `(${p}x)`;
        const bT = q === 1 ? "y" : `(${q}y)`;
        return {
          content: `다항식 $${E}$${eul(E)} 인수분해하시오.`,
          answer: $(ans),
          solution: [
            `$${E}=${aT}^{3}${sgn}3\\times ${aT}^{2}\\times ${bT}+3\\times ${aT}\\times ${bT}^{2}${sgn}${bT}^{3}$`,
            `$=${ans}$`,
          ].join("\n"),
          difficulty: "기본",
          facts: { mode, fam, p, q, sg, y: 1 },
          distractors,
        };
      }
      const p = nz(rng, -3, 3);
      const q = nz(rng, -4, 4);
      const E = linTex(
        [
          [1, "x^{2}"],
          [p * p, "y^{2}"],
          [2 * p, "xy"],
          [2 * p * q, "y"],
          [2 * q, "x"],
        ],
        q * q,
      );
      const L = (s: number, t: number): string =>
        linTex(
          [
            [1, "x"],
            [s * p, "y"],
          ],
          t * q,
        );
      const ans = `(${L(1, 1)})^{2}`;
      const distractors = pickDistractors(rng, ans, [
        `(${L(-1, 1)})^{2}`,
        `(${L(1, -1)})^{2}`,
        `(${L(-1, -1)})^{2}`,
        `(${linTex(
          [
            [1, "x"],
            [q, "y"],
          ],
          p,
        )})^{2}`,
      ]);
      if (distractors === null) return null;
      const bT = p === 1 ? "y" : `(${term(p, "y", true)})`;
      const cT = paren(q);
      return {
        content: `다항식 $${E}$${eul(E)} 인수분해하시오.`,
        answer: $(ans),
        solution: [
          `$${E}=x^{2}+${bT}^{2}+${cT}^{2}+2\\times x\\times ${bT}+2\\times ${bT}\\times ${cT}+2\\times ${cT}\\times x$`,
          `$=${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, fam, p, q, sg: 1, y: 1 },
        distractors,
      };
    });
  return attempt<Body>((): Body | null => {
    const m = nz(rng, -3, 3);
    const n = pickOne(rng, [1, 2, 3]);
    const sg = pickOne(rng, [1, -1]);
    const a = m + sg * n;
    const b = 2 * m - sg * n;
    const c = m * m - sg * m * n + n * n;
    if (a === 0) return null;
    const exprs: Expr[] = [
      ["a+b+c", a + b + c],
      ["a-b+c", a - b + c],
    ];
    if (b !== 0) exprs.push(["abc", a * b * c]);
    const [exprId, [et, ev]] = chooseExpr(rng, exprs);
    const X = `(x${plusConst(m)})`;
    const E = `${X}^{3}${sg > 0 ? "+" : "-"}${n ** 3}`;
    return {
      content: `다항식 $${E}$${eul(E)} 인수분해하면 $(x+a)(x^{2}+bx+c)$일 때, 상수 $a$, $b$, $c$에 대하여 $${et}$의 값을 구하시오.`,
      answer: numAnswer(ev),
      solution: [
        `$${E}=${X}^{3}${sg > 0 ? "+" : "-"}${n}^{3}$`,
        `$=\\{${X}${sg > 0 ? "+" : "-"}${n}\\}\\{${X}^{2}${sg > 0 ? "-" : "+"}${coefPrefix(n)}${X}+${n * n}\\}$`,
        `$=(${polyTex([a, 1])})(${polyTex([c, b, 1])})$`,
        `따라서 $a=${a}$, $b=${b}$, $c=${c}$이므로 $${et}=${ev}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, m, n, sg, exprId },
    };
  });
}

// ───────────────────────────── 02 ─────────────────────────────
// 공통부분이 있는 다항식의 인수분해
// 꼴 0 (기본·대표): 네 일차식의 곱 + 상수 — 짝지어 치환, 한 인수는 더 인수분해된다
// 꼴 1 (응용): 공통부분이 있는 두 이차식의 곱 + 상수 → 주어진 인수의 꼴에 맞추기
// 꼴 2 (응용): 네 일차식의 곱 + k 가 완전제곱식이 되는 k

function t02(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const R = pairRoots(rng);
      if (!R) return null;
      const { s, al, de, be, gm } = R;
      const p = al * de;
      const qq = be * gm;
      const u = nz(rng, -4, 4);
      const v = s - u;
      if (v === 0) return null;
      const m = u * v;
      const n = p + qq - m;
      const k = m * n - p * qq;
      if (k === 0 || isSquare(s * s - 4 * n)) return null;
      const prod = shuffled(rng, [al, be, gm, de])
        .map((r) => factorParen(-r))
        .join("");
      const E = `${prod}${plusConst(k)}`;
      const exprs: Expr[] = [
        ["a+b+c", u + v + n],
        ["a+b-c", u + v - n],
      ];
      if (n !== 0) exprs.push(["abc", u * v * n]);
      const [exprId, [et, ev]] = chooseExpr(rng, exprs);
      const form = `(x+a)(x+b)(x^{2}${term(s, "x")}+c)`;
      const base = polyTex([0, s, 1]);
      return {
        content: `다항식 $${E}$${ga(E)} $${form}$${ro(form)} 인수분해될 때, 정수 $a$, $b$, $c$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `$${E}=\\{${factorParen(-al)}${factorParen(-de)}\\}\\{${factorParen(-be)}${factorParen(-gm)}\\}${plusConst(k)}$`,
          `$=(${polyTex([p, s, 1])})(${polyTex([qq, s, 1])})${plusConst(k)}$`,
          `$${base}=t$${ro("t")} 놓으면 (주어진 식)$=(t${plusConst(p)})(t${plusConst(qq)})${plusConst(k)}=t^{2}${termNZ(p + qq, "t")}${plusConst(p * qq + k)}$`,
          `$=(t${plusConst(m)})(t${plusConst(n)})=(${polyTex([m, s, 1])})(${polyTex([n, s, 1])})$`,
          `$=${factorParen(-u)}${factorParen(-v)}(${polyTex([n, s, 1])})$`,
          `따라서 $a$, $b$${eun("b")} $${u}$, $${v}$이고 $c=${n}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, al, de, be, gm, k, exprId },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const s = nz(rng, -3, 3);
      const [p, qq] = distinctInts(rng, -6, 6, 2, { nonzero: true }) as [
        number,
        number,
      ];
      const m = nz(rng, -6, 6);
      const n = p + qq - m;
      if (n === 0 || m === n) return null;
      const k = m * n - p * qq;
      if (k === 0) return null;
      const E = `(${polyTex([p, s, 1])})(${polyTex([qq, s, 1])})${plusConst(k)}`;
      const form = `(x^{2}+ax${plusConst(m)})(x^{2}${term(s, "x")}+b)`;
      const [exprId, [et, ev]] = chooseExpr(rng, [
        ["ab", s * n],
        ["a+b", s + n],
        ["a-b", s - n],
      ]);
      const base = polyTex([0, s, 1]);
      return {
        content: `다항식 $${E}$${eul(E)} 인수분해하면 $${form}$일 때, 상수 $a$, $b$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `$${base}=t$${ro("t")} 놓으면`,
          `(주어진 식)$=(t${plusConst(p)})(t${plusConst(qq)})${plusConst(k)}=t^{2}${termNZ(p + qq, "t")}${plusConst(p * qq + k)}$`,
          `$=(t${plusConst(m)})(t${plusConst(n)})=(${polyTex([m, s, 1])})(${polyTex([n, s, 1])})$`,
          `따라서 $a=${s}$, $b=${n}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, s, p, q: qq, k, m, exprId },
      };
    });
  return attempt<Body>((): Body | null => {
    const R = pairRoots(rng);
    if (!R) return null;
    const { s, al, de, be, gm } = R;
    const p = al * de;
    const qq = be * gm;
    if ((p - qq) % 2 !== 0) return null;
    const h = (p + qq) / 2;
    const k = h * h - p * qq;
    if (k === 0) return null;
    const prod = shuffled(rng, [al, be, gm, de])
      .map((r) => factorParen(-r))
      .join("");
    const lhs = `${prod}+k`;
    const base = polyTex([0, s, 1]);
    return {
      content: `다항식 $${lhs}$${ga(lhs)} $x$에 대한 이차식의 완전제곱식으로 인수분해될 때, 상수 $k$의 값을 구하시오.`,
      answer: numAnswer(k),
      solution: [
        `$${lhs}=\\{${factorParen(-al)}${factorParen(-de)}\\}\\{${factorParen(-be)}${factorParen(-gm)}\\}+k$`,
        `$=(${polyTex([p, s, 1])})(${polyTex([qq, s, 1])})+k$`,
        `$${base}=t$${ro("t")} 놓으면 (주어진 식)$=(t${plusConst(p)})(t${plusConst(qq)})+k=t^{2}${termNZ(p + qq, "t")}${plusConst(p * qq)}+k$`,
        `이 식이 $t$에 대한 완전제곱식이 되려면 $${p * qq}+k=${paren(h)}^{2}$`,
        `따라서 $k=${k}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, al, de, be, gm },
    };
  });
}

// ───────────────────────────── 03 ─────────────────────────────
// $x^4+ax^2+b$ 의 꼴의 다항식의 인수분해
// 꼴 0 (기본·대표): $x^2=X$ 로 치환 — 네 일차식, 크기 순서로 놓은 상수의 결합
// 꼴 1 (응용): 치환으로 안 되는 꼴 — 이차항을 쪼개 $A^2-B^2$
// 꼴 2 (응용): 치환 뒤 한 인수가 $x^2+b$ 로 남는 꼴 · 완전제곱식이 되는 꼴

function t03(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const [u, v] = distinctInts(rng, 1, 5, 2).sort((x, y) => x - y) as [
        number,
        number,
      ];
      const S = u * u + v * v;
      const Pd = u * u * v * v;
      const E = `x^{4}-${S}x^{2}+${Pd}`;
      const [a, b, c, d] = [-v, -u, u, v];
      const [exprId, [et, ev]] = chooseExpr(rng, [
        ["ad-bc", a * d - b * c],
        ["ab+cd", a * b + c * d],
        ["a+2b+3c+4d", a + 2 * b + 3 * c + 4 * d],
      ]);
      return {
        content: `다항식 $${E}$${eul(E)} 인수분해하면 $(x+a)(x+b)(x+c)(x+d)$일 때, 상수 $a$, $b$, $c$, $d$에 대하여 $${et}$의 값을 구하시오. (단, $a<b<c<d$)`,
        answer: numAnswer(ev),
        solution: [
          `$x^{2}=X$${ro("X")} 놓으면 $${E}=X^{2}-${S}X+${Pd}=(X-${u * u})(X-${v * v})$`,
          `$=(x^{2}-${u * u})(x^{2}-${v * v})=(x+${u})(x-${u})(x+${v})(x-${v})$`,
          `따라서 $a=${a}$, $b=${b}$, $c=${c}$, $d=${d}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, u, v, exprId },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const m = randInt(rng, 2, 7);
      const n = randInt(rng, 1, 3);
      if (n * n >= 4 * m) return null;
      const mid = 2 * m - n * n;
      const E = `x^{4}${termNZ(mid, "x^{2}")}+${m * m}`;
      const form = "(x^{2}+ax+b)(x^{2}-cx+d)";
      const [exprId, [et, ev]] = chooseExpr(rng, [
        ["a+b+c+d", 2 * n + 2 * m],
        ["ab+cd", 2 * n * m],
        ["abcd", n * n * m * m],
      ]);
      const nx = n === 1 ? "x" : `${n}x`;
      return {
        content: `다항식 $${E}$${ga(E)} $${form}$${ro(form)} 인수분해될 때, $${et}$의 값을 구하시오. (단, $a$, $b$, $c$, $d$${eun("d")} 양수이다.)`,
        answer: numAnswer(ev),
        solution: [
          `$${E}=(x^{4}+${2 * m}x^{2}+${m * m})-${n === 1 ? "x^{2}" : `${n * n}x^{2}`}$`,
          `$=(x^{2}+${m})^{2}-${n === 1 ? "x^{2}" : `(${nx})^{2}`}$`,
          `$=(x^{2}+${nx}+${m})(x^{2}-${nx}+${m})$`,
          `따라서 $a=${n}$, $b=${m}$, $c=${n}$, $d=${m}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, m, n, exprId },
      };
    });
  return attempt<Body>((): Body | null => {
    const v = randInt(rng, 0, 1);
    if (v === 0) {
      const a = randInt(rng, 1, 3);
      const b = randInt(rng, 1, 6);
      const E = `x^{4}${termNZ(b - a * a, "x^{2}")}-${a * a * b}`;
      const form = "(x-a)(x+a)(x^{2}+b)";
      return {
        content: `다항식 $${E}$${ga(E)} $${form}$${ro(form)} 인수분해될 때, 두 양수 $a$, $b$에 대하여 $a+b$의 값을 구하시오.`,
        answer: numAnswer(a + b),
        solution: [
          `$x^{2}=X$${ro("X")} 놓으면 $${E}=X^{2}${termNZ(b - a * a, "X")}-${a * a * b}=(X-${a * a})(X+${b})$`,
          `$=(x^{2}-${a * a})(x^{2}+${b})=(x-${a})(x+${a})(x^{2}+${b})$`,
          `따라서 $a=${a}$, $b=${b}$이므로 $a+b=${a + b}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, v, a, b },
      };
    }
    const u = randInt(rng, 1, 6);
    const E = `x^{4}-${2 * u * u}x^{2}+${u ** 4}`;
    const form = "(x+a)^{2}(x+b)^{2}";
    return {
      content: `다항식 $${E}$${ga(E)} $${form}$${ro(form)} 인수분해될 때, 상수 $a$, $b$에 대하여 $a-b$의 값을 구하시오. (단, $a>b$)`,
      answer: numAnswer(2 * u),
      solution: [
        `$x^{2}=X$${ro("X")} 놓으면 $${E}=X^{2}-${2 * u * u}X+${u ** 4}=(X-${u * u})^{2}$`,
        `$=(x^{2}-${u * u})^{2}=\\{(x+${u})(x-${u})\\}^{2}=(x+${u})^{2}(x-${u})^{2}$`,
        `따라서 $a=${u}$, $b=${-u}$이므로 $a-b=${2 * u}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, v, u },
    };
  });
}

// ───────────────────────────── 04 ─────────────────────────────
// 여러 개의 문자가 포함된 다항식의 인수분해
// 꼴 0 (기본·대표): 두 문자 이차식 — x 에 대해 정리해 두 일차식의 곱. 답이 식(오답 넷: 상수 짝 바꿈 · 부호)
// 꼴 1 (응용): x² 의 계수가 1 이 아닌 꼴 — 주어진 인수의 꼴에 맞추기
// 꼴 2 (응용): 차수가 가장 낮은 y 에 대해 정리 — 세 일차식의 곱(답이 식)

function t04(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const [p, r] = distinctInts(rng, -3, 3, 2, { nonzero: true }) as [
        number,
        number,
      ];
      const [q, s] = distinctInts(rng, -5, 5, 2, { nonzero: true }) as [
        number,
        number,
      ];
      if (p + r === 0 && q + s === 0) return null;
      const E = linTex(
        [
          [1, "x^{2}"],
          [p + r, "xy"],
          [p * r, "y^{2}"],
          [q + s, "x"],
          [p * s + q * r, "y"],
        ],
        q * s,
      );
      const F = (a: number, b: number): string =>
        `(${linTex(
          [
            [1, "x"],
            [a, "y"],
          ],
          b,
        )})`;
      const ans = `${F(p, q)}${F(r, s)}`;
      const distractors = pickDistractors(rng, ans, [
        `${F(p, s)}${F(r, q)}`,
        // 🔴 $r=-p$ 이면 「$y$ 의 부호를 둘 다 바꾼」 오답이 위의 「상수 짝을 바꾼」 오답과 **인수의 차례만 다른
        //    같은 식**이 된다 — $(x-y-2)(x+y+3)$ 과 $(x+y+3)(x-y-2)$ 가 한 문항의 보기 둘로 나갔다
        //    (2026-10-08 적재 전 관문 — 글자로만 겹침을 보면 안 걸린다). 그때는 상수 하나의 부호만 틀린 오답을 쓴다.
        p + r === 0 ? `${F(p, q)}${F(r, -s)}` : `${F(-p, q)}${F(-r, s)}`,
        `${F(p, -q)}${F(r, -s)}`,
        `${F(-p, -q)}${F(-r, -s)}`,
      ]);
      if (distractors === null) return null;
      const yPart = linTex(
        [
          [p * r, "y^{2}"],
          [p * s + q * r, "y"],
        ],
        q * s,
      );
      return {
        content: `다항식 $${E}$${eul(E)} 인수분해하시오.`,
        answer: $(ans),
        solution: [
          `$x$에 대하여 내림차순으로 정리하면`,
          `$${E}=x^{2}${xLinear(p + r, q + s)}+(${yPart})$`,
          `$=x^{2}${xLinear(p + r, q + s)}+(${linTex([[p, "y"]], q)})(${linTex([[r, "y"]], s)})$`,
          `$=${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, p, q, r, s },
        distractors,
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const a = pickOne(rng, [1, 2, 3]);
      const b = pickOne(rng, [1, 2, 3]);
      const c = pickOne(rng, [-2, -1, 1, 2, 3]);
      const g = nz(rng, -3, 3);
      const h = nz(rng, -3, 3);
      const xy = a * c + b;
      const x1 = a * h + b * g;
      if (xy === 0 && x1 === 0) return null;
      const E = linTex(
        [
          [a * b, "x^{2}"],
          [xy, "xy"],
          [c, "y^{2}"],
          [x1, "x"],
          [h + c * g, "y"],
        ],
        g * h,
      );
      const form = `(ax+y${plusConst(g)})(bx+cy${plusConst(h)})`;
      const [exprId, [et, ev]] = chooseExpr(rng, [
        ["a+b-c", a + b - c],
        ["a+b+c", a + b + c],
        ["abc", a * b * c],
      ]);
      // h=cg이면 인수를 상수배해 바꾼 (b/c, ac, c)도 같은 전개식을 준다.
      // abc는 항상 같고, 합도 c=1 또는 b=ac이면 같다. 묻는 값이 갈리는 조합만 제외한다.
      // 식을 고르는 난수까지 예전대로 소비하므로 원래 정답이 0이라 버리던 판도 유지된다.
      if (h === c * g && c !== 1 && b !== a * c && exprId !== 2) return null;
      const yPart = linTex(
        [
          [c, "y^{2}"],
          [h + c * g, "y"],
        ],
        g * h,
      );
      return {
        content: `다항식 $${E}$${eul(E)} 인수분해하면 $${form}$일 때, 상수 $a$, $b$, $c$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `$x$에 대하여 내림차순으로 정리하면`,
          `$${E}=${coefPrefix(a * b)}x^{2}${xLinear(xy, x1)}+(${yPart})$`,
          `$=${coefPrefix(a * b)}x^{2}${xLinear(xy, x1)}+(y${plusConst(g)})(${linTex([[c, "y"]], h)})$`,
          `$=(${linTex(
            [
              [a, "x"],
              [1, "y"],
            ],
            g,
          )})(${linTex(
            [
              [b, "x"],
              [c, "y"],
            ],
            h,
          )})$`,
          h === c * g && b !== a * c
            ? `따라서 $a=${a}$, $b=${b}$, $c=${c}$ 또는 $a=${qTex(q(b, c))}$, $b=${a * c}$, $c=${c}$이고, 어느 경우에나 $${et}=${ev}$`
            : `따라서 $a=${a}$, $b=${b}$, $c=${c}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, a, b, c, g, h, exprId },
      };
    });
  return attempt<Body>((): Body | null => {
    const [u, v] = distinctInts(rng, -4, 4, 2, { nonzero: true }).sort(
      (x, y) => x - y,
    ) as [number, number];
    if (u + v === 0) return null;
    const E = linTex([
      [1, "x^{3}"],
      [-1, "x^{2}y"],
      [-(u + v), "x^{2}"],
      [u + v, "xy"],
      [u * v, "x"],
      [-u * v, "y"],
    ]);
    const quad = polyTex(fromRoots([u, v]));
    const ans = `${factorParen(u)}${factorParen(v)}(x-y)`;
    const distractors = pickDistractors(rng, ans, [
      `${factorParen(-u)}${factorParen(-v)}(x-y)`,
      `${factorParen(u)}${factorParen(v)}(x+y)`,
      `${factorParen(-u)}${factorParen(-v)}(x+y)`,
      `${factorParen(u)}${factorParen(-v)}(x-y)`,
      `${factorParen(-u)}${factorParen(v)}(x-y)`,
    ]);
    if (distractors === null) return null;
    return {
      content: `다항식 $${E}$${eul(E)} 인수분해하시오.`,
      answer: $(ans),
      solution: [
        `차수가 가장 낮은 $y$에 대하여 내림차순으로 정리하면`,
        `$${E}=-(${quad})y+x^{3}${term(-(u + v), "x^{2}")}${term(u * v, "x")}$`,
        `$=-(${quad})y+x(${quad})=(${quad})(x-y)$`,
        `$=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, u, v },
      distractors,
    };
  });
}

// ───────────────────────────── 05 ─────────────────────────────
// 순환하는 꼴의 다항식의 인수분해
// 꼴 0 (기본·대표): 한 문자에 대해 정리 — 여섯 가지 순환식(문자 세 벌). 답이 식(오답 넷: 부호 · 합/차 혼동)
// 꼴 1 (응용): 세 합이 주어질 때 $(a+b)(b+c)(c+a)$ 로 모이는 식의 값
// 꼴 2 (심화하): 두 차가 주어질 때 $(a-b)(b-c)(c-a)$ 로 모이는 식의 값 — 셋째 차를 스스로 만든다

const LETTERS: readonly (readonly [string, string, string])[] = [
  ["a", "b", "c"],
  ["x", "y", "z"],
  ["p", "q", "r"],
];

type Cyclic = { E: string; ans: string; wrong: string[]; lines: string[] };

function cyclic(id: number, L: readonly [string, string, string]): Cyclic {
  const [a, b, c] = L;
  const sym = `(${a}+${b})(${b}+${c})(${c}+${a})`;
  const alt = `(${a}-${b})(${b}-${c})(${c}-${a})`;
  const symTail = [
    `$=(${b}+${c})${a}^{2}+(${b}+${c})^{2}${a}+${b}${c}(${b}+${c})$`,
    `$=(${b}+${c})\\{${a}^{2}+(${b}+${c})${a}+${b}${c}\\}$`,
    `$=(${b}+${c})(${a}+${b})(${a}+${c})=${sym}$`,
  ];
  const altTail = [
    `$=(${b}-${c})${a}^{2}-(${b}^{2}-${c}^{2})${a}+${b}^{2}${c}-${b}${c}^{2}$`,
    `$=(${b}-${c})\\{${a}^{2}-(${b}+${c})${a}+${b}${c}\\}$`,
    `$=(${b}-${c})(${a}-${b})(${a}-${c})=-${alt}$`,
  ];
  const symWrong = [
    alt,
    `-${sym}`,
    `(${a}+${b}+${c})(${a}${b}+${b}${c}+${c}${a})`,
    `(${a}+${b})(${b}+${c})(${c}-${a})`,
  ];
  const altWrong = [
    alt,
    `-${sym}`,
    sym,
    `-(${a}-${b})(${b}+${c})(${c}-${a})`,
    `(${a}+${b})(${b}-${c})(${c}-${a})`,
  ];
  if (id === 0)
    return {
      E: `${a}(${b}+${c})^{2}+${b}(${c}+${a})^{2}+${c}(${a}+${b})^{2}-4${a}${b}${c}`,
      ans: sym,
      wrong: symWrong,
      lines: symTail,
    };
  if (id === 1)
    return {
      E: `${a}^{2}(${b}+${c})+${b}^{2}(${c}+${a})+${c}^{2}(${a}+${b})+2${a}${b}${c}`,
      ans: sym,
      wrong: symWrong,
      lines: symTail,
    };
  if (id === 2)
    return {
      E: `(${a}+${b}+${c})(${a}${b}+${b}${c}+${c}${a})-${a}${b}${c}`,
      ans: sym,
      wrong: symWrong,
      lines: symTail,
    };
  if (id === 3)
    return {
      E: `${a}^{2}(${b}-${c})+${b}^{2}(${c}-${a})+${c}^{2}(${a}-${b})`,
      ans: `-${alt}`,
      wrong: altWrong,
      lines: altTail,
    };
  if (id === 4)
    return {
      E: `${a}${b}(${a}-${b})+${b}${c}(${b}-${c})+${c}${a}(${c}-${a})`,
      ans: `-${alt}`,
      wrong: altWrong,
      lines: altTail,
    };
  return {
    E: `(${a}-${b})^{3}+(${b}-${c})^{3}+(${c}-${a})^{3}`,
    ans: `3${alt}`,
    wrong: [alt, `-3${alt}`, `3${sym}`, `-${alt}`],
    lines: [
      `$=-3${a}^{2}${b}+3${a}${b}^{2}-3${b}^{2}${c}+3${b}${c}^{2}-3${c}^{2}${a}+3${c}${a}^{2}$`,
      `$=-3\\{(${b}-${c})${a}^{2}-(${b}^{2}-${c}^{2})${a}+${b}^{2}${c}-${b}${c}^{2}\\}$`,
      `$=-3(${b}-${c})\\{${a}^{2}-(${b}+${c})${a}+${b}${c}\\}$`,
      `$=-3(${b}-${c})(${a}-${b})(${a}-${c})=3${alt}$`,
    ],
  };
}

function t05(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  const set = randInt(rng, 0, 2);
  const L = LETTERS[set]!;
  const [a, b, c] = L;
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const id = randInt(rng, 0, 5);
      const cy = cyclic(id, L);
      const distractors = pickDistractors(rng, cy.ans, cy.wrong);
      if (distractors === null) return null;
      return {
        content: `다항식 $${cy.E}$${eul(cy.E)} 인수분해하시오.`,
        answer: $(cy.ans),
        solution: [
          `$${a}$에 대하여 내림차순으로 정리하면`,
          `$${cy.E}$`,
          ...cy.lines,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, id, set },
        distractors,
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const id = randInt(rng, 0, 1);
      const cy = cyclic(id, L);
      const p = nz(rng, -5, 6);
      const q = nz(rng, -5, 6);
      const r = nz(rng, -5, 6);
      const v = p * q * r;
      return {
        content: `$${a}+${b}=${p}$, $${b}+${c}=${q}$, $${c}+${a}=${r}$일 때, $${cy.E}$의 값을 구하시오.`,
        answer: numAnswer(v),
        solution: [
          `$${cy.E}$`,
          ...cy.lines,
          `따라서 구하는 값은 $${paren(p)}\\times ${paren(q)}\\times ${paren(r)}=${v}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, id, set, p, q, r },
      };
    });
  return attempt<Body>((): Body | null => {
    const id = randInt(rng, 3, 5);
    const cy = cyclic(id, L);
    const p = nz(rng, -5, 5);
    const q = nz(rng, -5, 5);
    if (p + q === 0) return null;
    const ca = -(p + q);
    const v = id === 5 ? 3 * p * q * ca : -p * q * ca;
    const k = id === 5 ? "3\\times " : "-";
    return {
      content: `$${a}-${b}=${p}$, $${b}-${c}=${q}$일 때, $${cy.E}$의 값을 구하시오.`,
      answer: numAnswer(v),
      solution: [
        `$${cy.E}$`,
        ...cy.lines,
        `이때 $${c}-${a}=-(${a}-${b})-(${b}-${c})=${ca}$이므로`,
        `구하는 값은 $${k}${paren(p)}\\times ${paren(q)}\\times ${paren(ca)}=${v}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, id, set, p, q },
    };
  });
}

// ───────────────────────────── 06 ─────────────────────────────
// 인수정리를 이용한 다항식의 인수분해
// 꼴 0 (기본·대표): 삼차식 — 근 하나를 찾아 조립제법, 몫을 다시 인수분해. 상수의 결합
// 꼴 1 (응용): 사차식 — 근 둘, 남은 이차식은 더 인수분해되지 않는다. 답이 식(오답 넷)
// 꼴 2 (심화하): $(x-r)^2$ 을 인수로 갖는 삼차식의 미정계수

function t06(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const P = pickOne(rng, [1, 2, 3]);
      const r1 = nz(rng, -3, 3);
      const r2 = nz(rng, -3, 3);
      const r3 = nz(rng, -3, 3);
      if (P > 1 && !coprime(P, r2)) return null;
      const quad = mul([-r2, P], [-r3, 1]);
      const f = mul([-r1, 1], quad);
      const [A, B, Cc] = [-r1, -r2, -r3];
      const [exprId, [et, ev]] = chooseExpr(rng, [
        ["a^{2}+b^{2}+c^{2}", A * A + B * B + Cc * Cc],
        ["a+b+c", A + B + Cc],
        ["abc", A * B * Cc],
      ]);
      if (ev === 0) return null;
      const Ft = polyTex(f);
      const form = P === 1 ? "(x+a)(x+b)(x+c)" : `(x+a)(${P}x+b)(x+c)`;
      const lastLine =
        P === 1
          ? `따라서 $a$, $b$, $c$${eun("c")} $${A}$, $${B}$, $${Cc}$이므로 $${et}=${ev}$`
          : `따라서 $b=${B}$이고 $a$, $c$${eun("c")} $${A}$, $${Cc}$이므로 $${et}=${ev}$`;
      return {
        content: `다항식 $${Ft}$${eul(Ft)} 인수분해하면 $${form}$일 때, 정수 $a$, $b$, $c$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `$f(x)=${Ft}$${ira(Ft)} 하면 $f(${r1})=0$이므로 조립제법을 이용하여 인수분해하면`,
          `$f(x)=(${factorTex(r1)})(${polyTex(quad)})$`,
          `$=${factorParen(r1)}(${linTex([[P, "x"]], -r2)})${factorParen(r3)}$`,
          lastLine,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, P, r1, r2, r3, exprId },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const [r1, r2] = distinctInts(rng, -3, 3, 2, { nonzero: true }).sort(
        (x, y) => x - y,
      ) as [number, number];
      if (r1 + r2 === 0) return null;
      const m = nz(rng, -3, 3);
      const n = randInt(rng, 1, 6);
      if (m * m - 4 * n >= 0) return null;
      const quad = [n, m, 1];
      const f = mul(fromRoots([r1, r2]), quad);
      const Q = polyTex(quad);
      const ans = `${factorParen(r1)}${factorParen(r2)}(${Q})`;
      const distractors = pickDistractors(rng, ans, [
        `${factorParen(-r1)}${factorParen(-r2)}(${Q})`,
        `${factorParen(r1)}${factorParen(r2)}(${polyTex([n, -m, 1])})`,
        `${factorParen(r1)}${factorParen(-r2)}(${Q})`,
        `${factorParen(r1)}${factorParen(r2)}(${polyTex([-n, m, 1])})`,
        `${factorParen(-r1)}${factorParen(r2)}(${Q})`,
      ]);
      if (distractors === null) return null;
      const Ft = polyTex(f);
      return {
        content: `다항식 $${Ft}$${eul(Ft)} 인수분해하시오.`,
        answer: $(ans),
        solution: [
          `$f(x)=${Ft}$${ira(Ft)} 하면 $f(${r1})=0$, $f(${r2})=0$이므로 조립제법을 이용하여 인수분해하면`,
          `$f(x)=${factorParen(r1)}(${polyTex(mul([-r2, 1], quad))})$`,
          `$=${ans}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, r1, r2, m, n },
        distractors,
      };
    });
  return attempt<Body>((): Body | null => {
    const r = nz(rng, -3, 3);
    const s = nz(rng, -4, 4);
    if (s === r) return null;
    const f = mul(pow([-r, 1], 2), [-s, 1]);
    const [c, b, a] = [f[0]!, f[1]!, f[2]!];
    const exprs: Expr[] = [["a+b", a + b]];
    if (a !== 0 && b !== 0) exprs.push(["ab", a * b]);
    const [exprId, [et, ev]] = chooseExpr(rng, exprs);
    const fr = factorTex(r);
    const sq = `(${fr})^{2}`;
    const cubic = `x^{3}+ax^{2}+bx${plusConst(c)}`;
    return {
      content: `다항식 $${cubic}$${ga(cubic)} $${sq}$${eul(sq)} 인수로 가질 때, 상수 $a$, $b$에 대하여 $${et}$의 값을 구하시오.`,
      answer: numAnswer(ev),
      solution: [
        `$${cubic}=${sq}(x+k)$ ($k$${eun("k")} 상수)라 하면`,
        `상수항을 비교하면 $${coefPrefix(r * r)}k=${c}$이므로 $k=${-s}$`,
        `$${sq}(${factorTex(s)})=${polyTex(f)}$`,
        `따라서 $a=${a}$, $b=${b}$이므로 $${et}=${ev}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, r, c, exprId },
    };
  });
}

// ───────────────────────────── 07 ─────────────────────────────
// 조건이 주어진 다항식의 인수분해
// 꼴 0 (기본·대표): $k^2-(ax-by)^2$ 을 인수분해한 뒤 일차 조건을 넣는다 — 답이 단항식(오답 넷: 부호 · 2배)
// 꼴 1 (응용): 공통인수로 묶은 뒤 세 문자 조건을 넣는다 — 답이 식(오답 넷)

function t07(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const a = pickOne(rng, [1, 2, 3, 4]);
      const b = nz(rng, -3, 3);
      const k = nz(rng, -5, 5);
      const cond = `${linTex(
        [
          [a, "x"],
          [b, "y"],
        ],
        k,
      )}=0`;
      const E = `${k * k}${term(-a * a, "x^{2}")}${term(2 * a * b, "xy")}${term(-b * b, "y^{2}")}`;
      const cf = 4 * a * b;
      const mono = (v: number): string => `${coefPrefix(v)}xy`;
      const ans = mono(cf);
      const distractors = pickDistractors(
        rng,
        ans,
        [-cf, 2 * a * b, -2 * a * b, 8 * a * b].map(mono),
      );
      if (distractors === null) return null;
      const L1 = linTex(
        [
          [a, "x"],
          [-b, "y"],
        ],
        k,
      );
      const L2 = linTex(
        [
          [-a, "x"],
          [b, "y"],
        ],
        k,
      );
      const by = term(-b, "y", true);
      const ax = term(-a, "x", true);
      return {
        content: `$${cond}$일 때, $${E}$${eul(E)} $x$, $y$에 대한 식으로 간단히 나타내시오.`,
        answer: $(ans),
        solution: [
          `$${E}=${k * k}-(${linTex([
            [a, "x"],
            [-b, "y"],
          ])})^{2}=(${L1})(${L2})$`,
          `이때 $${cond}$에서 $${linTex([[a, "x"]], k)}=${by}$, $${linTex([[b, "y"]], k)}=${ax}$이므로`,
          `주어진 식은 $(${by}${term(-b, "y")})(${ax}${term(-a, "x")})=${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, a, b, k },
        distractors,
      };
    });
  return attempt<Body>((): Body | null => {
    const c = nz(rng, -3, 3);
    const d = nz(rng, -3, 3);
    const E = `xyz+x^{2}y${term(c, "xy")}${term(-d, "x")}${term(-d, "z")}${plusConst(-c * d)}`;
    const G = `x+z${plusConst(c)}`;
    const in1 = `xy${plusConst(-d)}`;
    const ans = `-y(${in1})`;
    const distractors = pickDistractors(rng, ans, [
      `y(${in1})`,
      `-y(xy${plusConst(d)})`,
      `-x(${in1})`,
      `x(xy${plusConst(d)})`,
      `-z(${in1})`,
    ]);
    if (distractors === null) return null;
    const dAbs = Math.abs(d);
    return {
      content: `$x+y+z=${-c}$일 때, $${E}$${eul(E)} $x$, $y$에 대한 식으로 나타내시오.`,
      answer: $(ans),
      solution: [
        `$${E}=(${G})xy${d > 0 ? "-" : "+"}${dAbs === 1 ? "" : dAbs}(${G})$`,
        `$=(${G})(${in1})$`,
        `이때 $x+y+z=${-c}$에서 $${G}=-y$이므로`,
        `주어진 식은 $${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, c, d },
      distractors,
    };
  });
}

// ───────────────────────────── 08 ─────────────────────────────
// 인수분해를 이용한 식의 값 구하기
// 꼴 0 (기본·대표): 두 문자 식을 인수분해해 합·차·곱으로 — 다섯 가지 식
// 꼴 1 (응용): $x=m\pm\sqrt{r}$ — 차의 제곱 · 합과 곱으로
// 꼴 2 (응용): 세 합으로 $(a+b+c)(ab+bc+ca)-abc=(a+b)(b+c)(c+a)$

function t08(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const tgt = randInt(rng, 0, 4);
      const p = nz(rng, -5, 5);
      const useDiff = tgt === 0 || tgt === 4;
      const g = nz(rng, -5, 5);
      if (useDiff ? g * g + 4 * p < 0 : g * g - 4 * p < 0) return null;
      const G = paren(g);
      const P = paren(p);
      const given = useDiff ? `$a-b=${g}$, $ab=${p}$` : `$a+b=${g}$, $ab=${p}$`;
      let T: string;
      let v: number;
      let lines: string[];
      if (tgt === 0) {
        T = "a^{3}-b^{3}+a^{2}b-ab^{2}";
        const sq = g * g + 4 * p;
        v = g * sq;
        lines = [
          `$${T}=a^{2}(a+b)-b^{2}(a+b)=(a+b)(a^{2}-b^{2})=(a+b)^{2}(a-b)$`,
          `이때 $(a+b)^{2}=(a-b)^{2}+4ab=${G}^{2}+4\\times ${P}=${sq}$이므로`,
          `구하는 값은 $${sq}\\times ${G}=${v}$`,
        ];
      } else if (tgt === 1) {
        T = "a^{3}+b^{3}+a^{2}b+ab^{2}";
        const sq = g * g - 2 * p;
        v = g * sq;
        lines = [
          `$${T}=a^{2}(a+b)+b^{2}(a+b)=(a+b)(a^{2}+b^{2})$`,
          `이때 $a^{2}+b^{2}=(a+b)^{2}-2ab=${G}^{2}-2\\times ${P}=${sq}$이므로`,
          `구하는 값은 $${G}\\times ${paren(sq)}=${v}$`,
        ];
      } else if (tgt === 2) {
        T = "a^{2}b+ab^{2}+a+b";
        v = g * (p + 1);
        lines = [
          `$${T}=ab(a+b)+(a+b)=(a+b)(ab+1)$`,
          `구하는 값은 $${G}\\times(${p}+1)=${v}$`,
        ];
      } else if (tgt === 3) {
        T = "a^{3}b+ab^{3}";
        const sq = g * g - 2 * p;
        v = p * sq;
        lines = [
          `$${T}=ab(a^{2}+b^{2})$`,
          `이때 $a^{2}+b^{2}=(a+b)^{2}-2ab=${G}^{2}-2\\times ${P}=${sq}$이므로`,
          `구하는 값은 $${P}\\times ${paren(sq)}=${v}$`,
        ];
      } else {
        T = "a^{3}-b^{3}-a^{2}b+ab^{2}";
        const sq = g * g + 2 * p;
        v = g * sq;
        lines = [
          `$${T}=a^{2}(a-b)+b^{2}(a-b)=(a-b)(a^{2}+b^{2})$`,
          `이때 $a^{2}+b^{2}=(a-b)^{2}+2ab=${G}^{2}+2\\times ${P}=${sq}$이므로`,
          `구하는 값은 $${G}\\times ${paren(sq)}=${v}$`,
        ];
      }
      return {
        content: `${given}일 때, $${T}$의 값을 구하시오.`,
        answer: numAnswer(v),
        solution: lines.join("\n"),
        difficulty: "기본",
        facts: { mode, tgt, g, p },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const fam = randInt(rng, 0, 1);
      const m = nz(rng, -3, 3);
      const r = pickOne(rng, [2, 3, 5, 6, 7]);
      const p = m * m - r;
      const xT = surdTex(surd(m, 1, r));
      const yT = surdTex(surd(m, -1, r));
      if (fam === 0) {
        const T = "x^{4}-x^{3}y-xy^{3}+y^{4}";
        const d = surdTex(surd(0, 2, r));
        const v = 4 * r * (4 * r + 3 * p);
        return {
          content: `$x=${xT}$, $y=${yT}$일 때, $${T}$의 값을 구하시오.`,
          answer: numAnswer(v),
          solution: [
            `$${T}=x^{3}(x-y)-y^{3}(x-y)=(x-y)(x^{3}-y^{3})$`,
            `$=(x-y)^{2}(x^{2}+xy+y^{2})=(x-y)^{2}\\{(x-y)^{2}+3xy\\}$`,
            `이때 $x-y=${d}$, $xy=${p}$이므로`,
            `구하는 값은 $(${d})^{2}\\times\\{(${d})^{2}+3\\times ${paren(p)}\\}=${4 * r}\\times ${4 * r + 3 * p}=${v}$`,
          ].join("\n"),
          difficulty: "응용",
          facts: { mode, fam, m, r },
        };
      }
      const T = "x^{3}+x^{2}y+xy^{2}+y^{3}";
      const s = 2 * m;
      const sq = s * s - 2 * p;
      const v = s * sq;
      return {
        content: `$x=${xT}$, $y=${yT}$일 때, $${T}$의 값을 구하시오.`,
        answer: numAnswer(v),
        solution: [
          `$${T}=x^{2}(x+y)+y^{2}(x+y)=(x+y)(x^{2}+y^{2})$`,
          `이때 $x+y=${s}$, $xy=${p}$이므로 $x^{2}+y^{2}=(x+y)^{2}-2xy=${paren(s)}^{2}-2\\times ${paren(p)}=${sq}$`,
          `구하는 값은 $${paren(s)}\\times ${sq}=${v}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, fam, m, r },
      };
    });
  return attempt<Body>((): Body | null => {
    const p = nz(rng, -5, 6);
    const q = nz(rng, -5, 6);
    const r = nz(rng, -5, 6);
    const v = p * q * r;
    const T = "(a+b+c)(ab+bc+ca)-abc";
    return {
      content: `$a+b=${p}$, $b+c=${q}$, $c+a=${r}$일 때, $${T}$의 값을 구하시오.`,
      answer: numAnswer(v),
      solution: [
        `$a$에 대하여 내림차순으로 정리하면`,
        `$${T}=(b+c)a^{2}+(b+c)^{2}a+bc(b+c)$`,
        `$=(b+c)\\{a^{2}+(b+c)a+bc\\}=(a+b)(b+c)(c+a)$`,
        `따라서 구하는 값은 $${paren(p)}\\times ${paren(q)}\\times ${paren(r)}=${v}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, p, q, r },
    };
  });
}

// ───────────────────────────── 09 ─────────────────────────────
// 인수분해를 이용한 수의 계산
// 꼴 0 (기본·대표): 수를 문자로 놓고 세제곱의 합·차 · 제곱의 차로 약분
// 꼴 1 (응용): 제곱의 차를 이어 붙인 합 · 네 수의 곱 + 상수의 제곱근 · 인수정리로 f(N)

function t09(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const fam = randInt(rng, 0, 2);
      if (fam < 2) {
        const N = pickOne(rng, [99, 101, 199, 999, 2023, 2024]);
        const plus = fam === 0;
        const expr = plus
          ? `\\dfrac{${N}^{3}+1}{${N - 1}\\times ${N}+1}`
          : `\\dfrac{${N}^{3}-1}{${N}\\times ${N + 1}+1}`;
        const v = plus ? N + 1 : N - 1;
        const Ns = String(N);
        return {
          content: `인수분해를 이용하여 $${expr}$의 값을 구하시오.`,
          answer: numAnswer(v),
          solution: [
            `$x=${N}$${ro(Ns)} 놓으면`,
            plus
              ? `(주어진 식)$=\\dfrac{x^{3}+1}{(x-1)x+1}=\\dfrac{(x+1)(x^{2}-x+1)}{x^{2}-x+1}=x+1$`
              : `(주어진 식)$=\\dfrac{x^{3}-1}{x(x+1)+1}=\\dfrac{(x-1)(x^{2}+x+1)}{x^{2}+x+1}=x-1$`,
            `따라서 구하는 값은 $${N}${plus ? "+" : "-"}1=${v}$`,
          ].join("\n"),
          difficulty: "기본",
          facts: { mode, fam, N, k: 0 },
        };
      }
      const N = pickOne(rng, [10, 20, 50, 100]);
      const k = pickOne(rng, [1, 2]);
      const k2 = k * k;
      const expr = `\\dfrac{${N - k}^{3}\\times ${N + k}^{3}}{${N * N - 2 * k2}\\times ${N * N}+${k ** 4}}`;
      const v = N * N - k2;
      const Ns = String(N);
      return {
        content: `인수분해를 이용하여 $${expr}$의 값을 구하시오.`,
        answer: numAnswer(v),
        solution: [
          `$x=${N}$${ro(Ns)} 놓으면`,
          `(주어진 식)$=\\dfrac{(x-${k})^{3}(x+${k})^{3}}{(x^{2}-${2 * k2})x^{2}+${k ** 4}}=\\dfrac{(x^{2}-${k2})^{3}}{x^{4}-${2 * k2}x^{2}+${k ** 4}}$`,
          `$=\\dfrac{(x^{2}-${k2})^{3}}{(x^{2}-${k2})^{2}}=x^{2}-${k2}$`,
          `따라서 구하는 값은 $${N}^{2}-${k2}=${v}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, fam, N, k },
      };
    });
  return attempt<Body>((): Body | null => {
    const fam = randInt(rng, 0, 2);
    if (fam === 0) {
      const T = pickOne(rng, [7, 11, 15, 19]);
      const odds: number[] = [];
      for (let o = T; o >= 1; o -= 2) odds.push(o);
      const terms = odds.map(
        (o, i) => `${i === 0 ? "" : i % 2 === 1 ? "-" : "+"}${o}^{2}`,
      );
      const shown =
        odds.length <= 8
          ? terms.join("")
          : `${terms.slice(0, 4).join("")}+\\cdots${terms.slice(-2).join("")}`;
      const pairs: string[] = [];
      for (let i = 0; i + 1 < odds.length; i += 2) {
        pairs.push(`(${odds[i]}+${odds[i + 1]})(${odds[i]}-${odds[i + 1]})`);
      }
      const pairShown =
        pairs.length <= 4
          ? pairs.join("+")
          : `${pairs.slice(0, 2).join("+")}+\\cdots+${pairs[pairs.length - 1]}`;
      const sumShown =
        odds.length <= 8
          ? odds.join("+")
          : `${odds.slice(0, 2).join("+")}+\\cdots+${odds.slice(-2).join("+")}`;
      const S = odds.reduce((x, y) => x + y, 0);
      const v = 2 * S;
      return {
        content: `인수분해를 이용하여 $${shown}$의 값을 구하시오.`,
        answer: numAnswer(v),
        solution: [
          `(주어진 식)$=${pairShown}$`,
          `$=2\\times(${sumShown})=2\\times ${S}=${v}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, fam, T },
      };
    }
    if (fam === 1) {
      const x = pickOne(rng, [10, 20, 30, 40]);
      const d = pickOne(rng, [1, 2]);
      const d2 = d * d;
      const d4 = d2 * d2;
      const v = x * x + 3 * d * x + d2;
      const expr = `\\sqrt{${x}\\times ${x + d}\\times ${x + 2 * d}\\times ${x + 3 * d}+${d4}}`;
      const xs = String(x);
      return {
        content: `인수분해를 이용하여 $${expr}$의 값을 구하시오.`,
        answer: numAnswer(v),
        solution: [
          `$a=${x}$${ro(xs)} 놓으면`,
          `$${x}\\times ${x + d}\\times ${x + 2 * d}\\times ${x + 3 * d}+${d4}=a(a+${d})(a+${2 * d})(a+${3 * d})+${d4}$`,
          `$=\\{a(a+${3 * d})\\}\\{(a+${d})(a+${2 * d})\\}+${d4}=(a^{2}+${3 * d}a)(a^{2}+${3 * d}a+${2 * d2})+${d4}$`,
          `$=(a^{2}+${3 * d}a)^{2}+${2 * d2}(a^{2}+${3 * d}a)+${d4}=(a^{2}+${3 * d}a+${d2})^{2}$`,
          `따라서 구하는 값은 $${x}^{2}+${3 * d}\\times ${x}+${d2}=${v}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, fam, x, d },
      };
    }
    const a = pickOne(rng, [1, 2]);
    const b = pickOne(
      rng,
      [-2, -1, 3].filter((z) => z !== a),
    );
    const N = a + pickOne(rng, [10, 20]);
    const f = mul(pow([-a, 1], 3), [-b, 1]);
    const v = (N - a) ** 3 * (N - b);
    return {
      content: `$f(x)=${polyTex(f)}$일 때, 인수분해를 이용하여 $f(${N})$의 값을 구하시오.`,
      answer: numAnswer(v),
      solution: [
        `$f(${a})=0$이므로 조립제법을 이용하여 $f(x)$${eul("f(x)")} 인수분해하면`,
        `$f(x)=(x-${a})^{3}(${factorTex(b)})$`,
        `따라서 $f(${N})=${N - a}^{3}\\times ${paren(N - b)}=${v}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, fam, a, b, N },
    };
  });
}

// ───────────────────────────── 10 ─────────────────────────────
// 인수분해를 이용한 삼각형 모양의 판단 — 모양이어야 정해지는 수를 묻는다(머리말)
// 꼴 0 (기본·대표): 조건식이 (두 변의 차)×(0 이 아닌 식) → 이등변삼각형 → 둘레
// 꼴 1 (심화하): 조건식이 (두 변의 합)×(피타고라스 식) → 직각삼각형 → 넓이

const TRIPLES: readonly (readonly [number, number, number])[] = [
  [3, 4, 5],
  [6, 8, 10],
  [5, 12, 13],
  [8, 15, 17],
  [9, 12, 15],
  [7, 24, 25],
  [12, 16, 20],
];

function t10(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  return attempt<Body>((): Body | null => {
    const [iP, iQ, iR] = shuffled(rng, [0, 1, 2]) as [number, number, number];
    const P = ABC[iP]!;
    const Q = ABC[iQ]!;
    const R = ABC[iR]!;
    if (mode === 0) {
      const fam = randInt(rng, 0, 1);
      const E =
        fam === 0
          ? mpoly([
              [1, unit(iP, 2)],
              [-1, addE(unit(iP), unit(iR))],
              [-1, unit(iQ, 2)],
              [1, addE(unit(iQ), unit(iR))],
            ])
          : mpoly([
              [1, unit(iP, 2)],
              [-1, unit(iQ, 2)],
              [1, addE(unit(iP), unit(iR))],
              [-1, addE(unit(iQ), unit(iR))],
            ]);
      const vp = randInt(rng, 3, 12);
      const vr = randInt(rng, 2, 2 * vp - 1);
      if (vr === vp) return null;
      const showP = rng() < 0.5;
      const givens = [
        [showP ? P : Q, vp],
        [R, vr],
      ].sort(([x], [y]) => String(x).localeCompare(String(y))) as [
        string,
        number,
      ][];
      const Et = mpTex(E);
      const cond = `${Et}=0`;
      const v = 2 * vp + vr;
      const grouped =
        fam === 0
          ? [
              `$${Et}=(${P}^{2}-${Q}^{2})-${R}(${P}-${Q})$`,
              `$=(${plus2(P, Q)})(${P}-${Q})-${R}(${P}-${Q})=(${P}-${Q})(${plus2(P, Q)}-${R})$`,
              `$${P}$, $${Q}$, $${R}$${eun(R)} 삼각형의 세 변의 길이이므로 $${plus2(P, Q)}>${R}$, 즉 $${plus2(P, Q)}-${R}\\neq 0$`,
            ]
          : [
              `$${Et}=(${P}^{2}-${Q}^{2})+${R}(${P}-${Q})$`,
              `$=(${plus2(P, Q)})(${P}-${Q})+${R}(${P}-${Q})=(${P}-${Q})(a+b+c)$`,
              `$${P}$, $${Q}$, $${R}$${eun(R)} 삼각형의 세 변의 길이이므로 $a+b+c>0$`,
            ];
      return {
        content: `삼각형의 세 변의 길이 $a$, $b$, $c$${ga("c")} $${cond}$${eul(cond)} 만족시킨다. $${givens[0]![0]}=${givens[0]![1]}$, $${givens[1]![0]}=${givens[1]![1]}$일 때, 이 삼각형의 둘레의 길이를 구하시오.`,
        answer: numAnswer(v),
        solution: [
          ...grouped,
          `따라서 $${P}=${Q}$인 이등변삼각형이므로 $${P}=${Q}=${vp}$`,
          `구하는 둘레의 길이는 $${vp}+${vp}+${vr}=${v}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, fam, iP, iQ, iR, vp, vr, showP: showP ? 1 : 0 },
      };
    }
    const [l1, l2, h] = pickOne(rng, TRIPLES);
    const [vp, vq] = rng() < 0.5 ? [l1, l2] : [l2, l1];
    const E = mpMul(
      mpoly([
        [1, unit(iP)],
        [1, unit(iQ)],
      ]),
      mpoly([
        [1, unit(iP, 2)],
        [1, unit(iQ, 2)],
        [-1, unit(iR, 2)],
      ]),
    );
    const Et = mpTex(E);
    const cond = `${Et}=0`;
    const givens = [
      [P, vp],
      [R, h],
    ].sort(([x], [y]) => String(x).localeCompare(String(y))) as [
      string,
      number,
    ][];
    const area = (vp * vq) / 2;
    const PQ = plus2(P, Q);
    return {
      content: `삼각형의 세 변의 길이 $a$, $b$, $c$${ga("c")} $${cond}$${eul(cond)} 만족시킨다. $${givens[0]![0]}=${givens[0]![1]}$, $${givens[1]![0]}=${givens[1]![1]}$일 때, 이 삼각형의 넓이를 구하시오.`,
      answer: numAnswer(area),
      solution: [
        `$${Et}=-(${PQ})${R}^{2}+${P}^{2}(${PQ})+${Q}^{2}(${PQ})$`,
        `$=(${PQ})(${P}^{2}+${Q}^{2}-${R}^{2})$`,
        `$${PQ}>0$이므로 $${P}^{2}+${Q}^{2}=${R}^{2}$, 즉 빗변의 길이가 $${R}$인 직각삼각형이다.`,
        `$${Q}^{2}=${R}^{2}-${P}^{2}=${h}^{2}-${vp}^{2}=${vq * vq}$이고 $${Q}>0$이므로 $${Q}=${vq}$`,
        `따라서 구하는 넓이는 $\\dfrac{1}{2}\\times ${vp}\\times ${vq}=${area}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, iP, iQ, iR, vp, vq, h },
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
export const H1_FACTOR: HighTypeEntry[] = [
  entry("01", "인수분해 공식을 이용한 다항식의 인수분해", SEC.인수분해, t01),
  entry("02", "공통부분이 있는 다항식의 인수분해", SEC.복잡, t02),
  entry("03", "x^4+ax^2+b의 꼴의 다항식의 인수분해", SEC.복잡, t03),
  entry("04", "여러 개의 문자가 포함된 다항식의 인수분해", SEC.복잡, t04),
  entry("05", "순환하는 꼴의 다항식의 인수분해", SEC.복잡, t05),
  entry("06", "인수정리를 이용한 다항식의 인수분해", SEC.복잡, t06),
  entry("07", "조건이 주어진 다항식의 인수분해", SEC.인수분해, t07),
  entry("08", "인수분해를 이용한 식의 값 구하기", SEC.인수분해, t08),
  entry("09", "인수분해를 이용한 수의 계산", SEC.인수분해, t09),
  entry("10", "인수분해를 이용한 삼각형 모양의 판단", SEC.인수분해, t10),
];

/** 이 중단원은 색인 10유형을 모두 등록했다 — 보류 없음. */
export const H1_FACTOR_HOLD: HighHold[] = [];
