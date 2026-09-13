/**
 * 공통수학1 「이차부등식과 연립이차부등식」 — RPM 공통수학1(2022) 색인 21유형. **물결 1 세션 `h1-ineq` 소유.**
 *
 * 브리프 `docs/planning/tracks/high-wave1-brief.md` · 본보기 `h1Identity.ts` 를 따른다. 부등호·구간·
 * 합집합 표기는 `h1LinIneq.ts` 머리의 **공용 후보를 그대로** 쓴다(두 벌 두지 않는다).
 *
 * ## 생성 규칙 — 근을 먼저 정하고 식을 짓는다
 *
 * 이차식은 **유리근을 먼저** 뽑아 전개한다(`a(x−r₁)(x−r₂)`). 그래서 풀이는 늘 인수분해로 끝나고,
 * 근이 무리수인 꼴(02 꼴 1)만 근의 공식을 쓴다. `facts` 에는 발문 이차식의 **계수**를 싣는다 —
 * 시험은 그 계수로 이차식을 다시 세워 정수를 하나하나 대입하거나 부호표를 따로 그려 답을 다시 낸다.
 *
 * ## 보류
 *
 *   01 그래프를 이용한 부등식의 풀이 — 포물선·직선 그래프를 **읽어야** 성립한다. 물결 2 `funcGraph`.
 *
 * ## 우리 단원(시드 `prisma/seed-data/units.ts` 공통수학1 「2. 방정식과 부등식」)
 *
 *   02·04·05·11·13 → 이차부등식 · 03 → 절댓값(가우스) 기호를 포함한 이차부등식
 *   · 06~09·12 → 이차부등식의 해의 조건 · 10 → 제한된 범위에서 항상 성립하는 이차부등식
 *   · 14~18·20 → 연립이차부등식(RPM 개념 묶음 「연립이차부등식 14~18, 20」) · 19 → 이차방정식의 실근의 부호
 *   · 21 → 이차방정식의 실근의 위치.
 *
 * RPM 원본은 구조만 봤다. 본문·수치·소재는 새로 지었다(저작권).
 */
import type { Difficulty } from "@/contracts/difficulty";

import type { Rng } from "../elementary/types";

import {
  casesTex,
  flipRel,
  holds,
  intsInAll,
  intsText,
  isStrict,
  ivsMeet,
  ivLetters,
  ivsText,
  ivTex,
  ivUnion,
  linX,
  pointIv,
  qAnswer,
  qCeil,
  qCmp,
  qFloor,
  qIsInt,
  rayDistractors,
  rayIv,
  REAL_LINE,
  REL_CODE,
  relTex,
  type Iv,
  type Rel,
} from "./h1LinIneq";
import { eul, eun, ga, gwa, ira } from "./josa";
import { q, qAdd, qTex, surd, surdPmTex, surdTex, type Q } from "./numbers";
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
import { factorTex, linTex, paren, polyTex, term } from "./poly";
import type { HighHold, HighProblem, HighTypeEntry } from "./types";

const GRADE = "공통수학1";
const BOOK = "공통수학1";
const MINOR = "이차부등식과 연립이차부등식";

/** 우리 `Unit.section` 정확한 이름 (prisma/seed-data/units.ts 공통수학1 2. 방정식과 부등식). */
const SEC = {
  이차: "이차부등식",
  절댓값: "절댓값(가우스) 기호를 포함한 이차부등식",
  조건: "이차부등식의 해의 조건",
  제한: "제한된 범위에서 항상 성립하는 이차부등식",
  연립: "연립이차부등식",
  부호: "이차방정식의 실근의 부호",
  위치: "이차방정식의 실근의 위치",
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

const UPPER: readonly Rel[] = ["<", "le"];
const LOWER: readonly Rel[] = [">", "ge"];

function termIf(c: number, body: string): string {
  return c === 0 ? "" : term(c, body);
}

// ═════════════════════════ 이차식 ═════════════════════════
// 공용 후보: 유리근 인수분해 지면 `rootFactor`·`factoredTex` — `poly.ts` 의 `factorTex`·`factorParen` 은
//   정수근만 받는다. 근이 `\dfrac{1}{2}` 이면 분모를 계수로 올려 `(2x-1)(x+3)` 으로 쓴다(이차방정식·
//   이차함수 모듈도 같은 지면을 쓸 것이라 리드가 병합 때 올릴 후보).

function isqrt(n: number): number | null {
  if (n < 0) return null;
  const r = Math.round(Math.sqrt(n));
  return r * r === n ? r : null;
}

/** 정수 계수 `ax²+bx+c` 의 실근(작은 것부터) — 판별식이 음수면 빈 배열, 제곱수가 아니면 `null`. */
function rootsQ(a: number, b: number, c: number): Q[] | null {
  const D = b * b - 4 * a * c;
  if (D < 0) return [];
  const s = isqrt(D);
  if (s === null) return null;
  const r1 = q(-b - s, 2 * a);
  const r2 = q(-b + s, 2 * a);
  if (s === 0) return [r1];
  return qCmp(r1, r2) < 0 ? [r1, r2] : [r2, r1];
}

/**
 * `ax²+bx+c rel 0` 의 해 — 근이 유리수이거나 실근이 없을 때. 무리근이면 던진다(이 함수는
 * 인수분해로 끝나는 꼴에만 쓴다). 두 근 밖에서 이차식의 부호는 `a` 의 부호다.
 */
function quadSol(a: number, b: number, c: number, rel: Rel): Iv[] {
  const rs = rootsQ(a, b, c);
  if (rs === null)
    throw new Error("무리근 — quadSol 은 유리근·허근일 때만 쓴다");
  const sgn = a > 0 ? 1 : -1;
  if (rs.length === 0) return holds(rel, sgn) ? [REAL_LINE] : [];
  if (rs.length === 1) {
    const r = rs[0]!;
    const at0 = holds(rel, 0);
    const off = holds(rel, sgn);
    if (at0 && off) return [REAL_LINE];
    if (off)
      return [
        { lo: null, hi: { at: r, closed: false } },
        { lo: { at: r, closed: false }, hi: null },
      ];
    return at0 ? [pointIv(r)] : [];
  }
  const [r1, r2] = rs as [Q, Q];
  const closed = !isStrict(rel);
  return holds(rel, sgn)
    ? [
        { lo: null, hi: { at: r1, closed } },
        { lo: { at: r2, closed }, hi: null },
      ]
    : [{ lo: { at: r1, closed }, hi: { at: r2, closed } }];
}

/** 근 r 의 일차 인수 — `x-3` · `2x+1` · `x` (분모를 계수로 올린다). */
function rootFactor(r: Q): string {
  return r.n === 0 ? "x" : polyTex([-r.n, r.d]);
}

/** `ax²+bx+c` 를 유리근으로 인수분해한 지면 — `2(x-1)(x+3)` · `(2x+1)(x-3)` · `(x-2)^{2}`. */
function factoredTex(a: number, roots: readonly Q[]): string {
  const den = roots.length === 1 ? roots[0]!.d ** 2 : roots[0]!.d * roots[1]!.d;
  const k = a / den;
  if (!Number.isInteger(k))
    throw new Error("인수분해의 앞 계수가 정수가 아니다");
  if (roots.length === 1) {
    const r = roots[0]!;
    return r.n === 0
      ? `${coefPrefix(k)}x^{2}`
      : `${coefPrefix(k)}(${rootFactor(r)})^{2}`;
  }
  const parts = [...roots]
    .sort((u, v) => Number(v.n === 0) - Number(u.n === 0))
    .map((r) => (r.n === 0 ? "x" : `(${rootFactor(r)})`));
  return `${coefPrefix(k)}${parts.join("")}`;
}

/** 해 전체를 말로 — 「해는 없다」 · 「해는 모든 실수」 · `$x<-1$ 또는 $x>3$`. */
function solWords(sol: readonly Iv[]): string {
  if (sol.length === 0) return "해는 없다";
  if (sol.length === 1 && !sol[0]!.lo && !sol[0]!.hi) return "해는 모든 실수";
  return ivsText(sol);
}

/**
 * 이차부등식 풀이 한 줄 — 「$L rel R$에서 $f rel 0$, $(x-1)(x-3)\le 0$이므로 $1\le x\le 3$」.
 * 이차항의 계수가 음수면 먼저 $-1$ 을 곱해 뒤집는다.
 */
function quadStep(
  a: number,
  b: number,
  c: number,
  rel: Rel,
  from?: string,
): string {
  const f0 = `${polyTex([c, b, a])}${relTex(rel)}0`;
  let text = from && from !== f0 ? `$${from}$에서 $${f0}$, ` : `$${f0}$에서 `;
  let [A, B, C, R] = [a, b, c, rel];
  if (a < 0) {
    [A, B, C, R] = [-a, -b, -c, flipRel(rel)];
    text += `양변에 $-1$${eul("-1")} 곱하면 $${polyTex([C, B, A])}${relTex(R)}0$, `;
  }
  const rs = rootsQ(A, B, C);
  if (rs === null) throw new Error("quadStep 은 유리근·허근일 때만 쓴다");
  const sol = quadSol(A, B, C, R);
  if (rs.length === 0) {
    return `${text}이차방정식 $${polyTex([C, B, A])}=0$의 판별식이 음수이므로 ${solWords(sol)}`;
  }
  return `${text}$${factoredTex(A, rs)}${relTex(R)}0$이므로 ${solWords(sol)}`;
}

/**
 * 범위를 나눠 푸는 이차부등식(절댓값) — 조각마다 풀이 줄과 「이 범위에서 해」를 내고, 합친 해를 돌려준다.
 */
type QPiece = {
  tag: string;
  region: Iv;
  head: string;
  body: string;
  a: number;
  b: number;
  c: number;
  rel: Rel;
};

function solvePieces(ps: readonly QPiece[]): { lines: string[]; sol: Iv[] } {
  const lines: string[] = [];
  const got: Iv[] = [];
  for (const p of ps) {
    const meet = ivsMeet(quadSol(p.a, p.b, p.c, p.rel), [p.region]);
    lines.push(`${p.tag} ${p.head}, ${quadStep(p.a, p.b, p.c, p.rel, p.body)}`);
    lines.push(
      meet.length === 0
        ? "이 범위에서 해는 없다."
        : `이 범위에서 해는 ${ivsText(meet)}`,
    );
    got.push(...meet);
  }
  return { lines, sol: ivUnion(got) };
}

const below = (z: Q): Iv => ({ lo: null, hi: { at: z, closed: false } });
const fromAt = (z: Q): Iv => ({ lo: { at: z, closed: true }, hi: null });

// ───────────────────────────── 02 ─────────────────────────────
// 이차부등식의 풀이
// 꼴 0 (기본·대표): 양변에 식이 있는 이차부등식 — 정수인 해의 개수 · 합
// 꼴 1 (응용): 근이 무리수 — 해가 x≤α 또는 x≥β 일 때 β−α (답이 근호, 오답 넷)
// 꼴 2 (응용): 이차부등식과 해가 같은 |x−p| rel q — p+q · pq

function t02(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const den = pickOne(rng, [1, 1, 2, 3]);
      const r1 = q(randInt(rng, -6, 4));
      const r2 = q(randInt(rng, -7 * den, 7 * den), den);
      if (qCmp(r1, r2) === 0) return null;
      const [lo, hi] = qCmp(r1, r2) < 0 ? [r1, r2] : [r2, r1];
      const k = pickOne(rng, [1, 2, -1, -2, 3, -3]);
      const a = k * lo.d * hi.d;
      const b = -k * (lo.n * hi.d + hi.n * lo.d);
      const c = k * lo.n * hi.n;
      const rel = pickOne(rng, a > 0 ? UPPER : LOWER);
      const ints = intsInAll(quadSol(a, b, c, rel));
      if (ints.length < 2 || ints.length > 9) return null;
      const m = randInt(rng, -3, 3);
      const n = randInt(rng, -6, 6);
      const from = `${polyTex([c + n, b + m, a])}${relTex(rel)}${polyTex([n, m])}`;
      const kind = randInt(rng, 0, 1);
      const ans = kind === 0 ? ints.length : ints.reduce((s, x) => s + x, 0);
      return {
        content: `이차부등식 $${from}$${eul(from)} 만족시키는 정수 $x$의 ${kind === 0 ? "개수를" : "값의 합을"} 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          quadStep(a, b, c, rel, from),
          `따라서 정수 $x$는 ${intsText(ints)}이므로 ${kind === 0 ? `그 개수는 $${ans}$이다.` : `그 합은 $${ans}$이다.`}`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, a, b, c, r: REL_CODE[rel], kind },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const b = randInt(rng, -6, 6);
      const c = randInt(rng, -12, 6);
      const D = b * b - 4 * c;
      if (D <= 0 || isqrt(D) !== null) return null;
      const rel = pickOne(rng, LOWER);
      const less = flipRel(rel);
      const f = polyTex([c, b, 1]);
      const alpha = surdTex(surd(-b, -1, D, 2));
      const beta = surdTex(surd(-b, 1, D, 2));
      const ans = surdTex(surd(0, 1, D));
      const cands = [
        surd(0, 1, D, 2),
        surd(0, 2, D),
        surd(0, 1, D + 4),
        surd(0, 1, D - 4),
        surd(0, 1, b * b + 4 * c),
      ]
        .filter((s) => s.b !== 0 && s.r > 0)
        .map(surdTex);
      const distractors = pickDistractors(rng, ans, cands);
      if (distractors === null) return null;
      return {
        content: `이차부등식 $${f}${relTex(rel)}0$의 해가 $x${relTex(less)}\\alpha$ 또는 $x${relTex(rel)}\\beta$일 때, $\\beta-\\alpha$의 값을 구하시오.`,
        answer: $(ans),
        solution: [
          `이차방정식 $${f}=0$의 근은 $x=${surdPmTex(surd(-b, 1, D, 2))}$이므로`,
          `주어진 부등식의 해는 $x${relTex(less)}${alpha}$ 또는 $x${relTex(rel)}${beta}$`,
          `즉 $\\alpha=${alpha}$, $\\beta=${beta}$이므로 $\\beta-\\alpha=${ans}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, b, c, r: REL_CODE[rel] },
        distractors,
      };
    });
  return attempt<Body>((): Body | null => {
    const c0 = randInt(rng, -6, 6);
    const h = randInt(rng, 1, 6);
    const r1 = c0 - h;
    const r2 = c0 + h;
    const outside = rng() < 0.5;
    const closed = rng() < 0.5;
    const rel: Rel = outside ? (closed ? "ge" : ">") : closed ? "le" : "<";
    const k = pickOne(rng, [1, 1, 2, -1]);
    const shownRel = k > 0 ? rel : flipRel(rel);
    const A = k;
    const B = -k * (r1 + r2);
    const C = k * r1 * r2;
    const [exprId, [et, ev]] = chooseExpr(rng, [
      ["p+q", c0 + h],
      ["pq", c0 * h],
    ]);
    const absSol = outside
      ? `$x${relTex(flipRel(rel))}p-q$ 또는 $x${relTex(rel)}p+q$`
      : `$p-q${relTex(rel)}x${relTex(rel)}p+q$`;
    return {
      content: `이차부등식 $${polyTex([C, B, A])}${relTex(shownRel)}0$의 해와 부등식 $|x-p|${relTex(rel)}q$의 해가 같을 때, 상수 $p$, $q$에 대하여 $${et}$의 값을 구하시오. (단, $q>0$)`,
      answer: numAnswer(ev),
      solution: [
        quadStep(A, B, C, shownRel),
        `부등식 $|x-p|${relTex(rel)}q$의 해는 ${absSol}`,
        `두 해가 같으므로 $p-q=${r1}$, $p+q=${r2}$`,
        `따라서 $p=${c0}$, $q=${h}$이므로 $${et}=${ev}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: {
        mode,
        A,
        B,
        C,
        r: REL_CODE[shownRel],
        rAbs: REL_CODE[rel],
        exprId,
      },
    };
  });
}

// ───────────────────────────── 03 ─────────────────────────────
// 절댓값 기호를 포함한 이차부등식
// 꼴 0 (기본·대표): x²+bx+c ≤ |px+q| — 정수인 해의 개수
// 꼴 1 (응용): x²+p|x|+q<0 — 해를 구하시오 (답이 구간, 오답 넷)
// 꼴 2 (응용): |x²+bx|<c — 정수인 해의 개수 · 합

type AbsQuad = { b: number; c: number; p: number; qq: number };

let absQuadCache: AbsQuad[] | null = null;

/** x²+bx+c ≤ |px+q| 의 두 조각이 다 유리근(또는 허근)으로 풀리는 계수 조합 — 한 번 늘어놓는다. */
function absQuadCombos(): AbsQuad[] {
  if (absQuadCache) return absQuadCache;
  const out: AbsQuad[] = [];
  for (const p of [1, 2, -1, -2])
    for (let qq = -5; qq <= 5; qq += 1)
      for (let b = -5; b <= 5; b += 1)
        for (let c = -10; c <= 6; c += 1) {
          // x ≥ z 쪽: x²+(b−p)x+(c−q) · x < z 쪽: x²+(b+p)x+(c+q)  (p>0 기준 — p<0 이면 둘이 바뀐다)
          const A = rootsQ(1, b - p, c - qq);
          const B = rootsQ(1, b + p, c + qq);
          if (A === null || B === null || A.length < 2) continue;
          out.push({ b, c, p, qq });
        }
  absQuadCache = out;
  return out;
}

function t03(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const e = pickOne(rng, absQuadCombos());
      const rel = pickOne(rng, UPPER);
      const pp = Math.abs(e.p);
      const qAbs = e.p > 0 ? e.qq : -e.qq; // |px+q| = |pp·x + qAbs|
      const z = q(-qAbs, pp);
      const inner = polyTex([qAbs, pp]);
      const g = polyTex([e.c, e.b, 1]);
      const { lines, sol } = solvePieces([
        {
          tag: "(i)",
          region: below(z),
          head: `$x<${qTex(z)}$일 때`,
          body: `${g}${relTex(rel)}-(${inner})`,
          a: 1,
          b: e.b + pp,
          c: e.c + qAbs,
          rel,
        },
        {
          tag: "(ii)",
          region: fromAt(z),
          head: `$x\\ge ${qTex(z)}$일 때`,
          body: `${g}${relTex(rel)}${inner}`,
          a: 1,
          b: e.b - pp,
          c: e.c - qAbs,
          rel,
        },
      ]);
      if (sol.length === 0) return null;
      const ints = intsInAll(sol);
      if (ints.length < 2 || ints.length > 12) return null;
      // 절댓값을 **왼쪽**에 둔다 — 수식이 `|…|` 로 끝나면 뒤 조사를 읽을 수 없다(josa 가 던진다)
      const tex = `|${linX(e.p, e.qq)}|${relTex(flipRel(rel))}${g}`;
      return {
        content: `부등식 $${tex}$${eul(tex)} 만족시키는 정수 $x$의 개수를 구하시오.`,
        answer: numAnswer(ints.length),
        solution: [
          ...lines,
          `(i), (ii)에서 주어진 부등식의 해는 ${ivsText(sol)}`,
          `따라서 정수 $x$는 ${intsText(ints)}의 $${ints.length}$개이다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, b: e.b, c: e.c, p: e.p, q: e.qq, r: REL_CODE[rel] },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const r2 = randInt(rng, 1, 6);
      const r1 = -randInt(rng, 1, 7);
      if (r1 === -r2) return null;
      const p = -(r1 + r2);
      const qq = r1 * r2;
      const rel = pickOne(rng, UPPER);
      const closed = rel === "le";
      const { lines, sol } = solvePieces([
        {
          tag: "(i)",
          region: below(q(0)),
          head: "$x<0$일 때",
          body: `x^{2}${termIf(-p, "x")}${plusConst(qq)}${relTex(rel)}0`,
          a: 1,
          b: -p,
          c: qq,
          rel,
        },
        {
          tag: "(ii)",
          region: fromAt(q(0)),
          head: "$x\\ge 0$일 때",
          body: `x^{2}${termIf(p, "x")}${plusConst(qq)}${relTex(rel)}0`,
          a: 1,
          b: p,
          c: qq,
          rel,
        },
      ]);
      if (sol.length !== 1) return null;
      const ans = ivTex(sol[0]!);
      const iv = (lo: number, lc: boolean, hi: number, hc: boolean): string =>
        ivTex({ lo: { at: q(lo), closed: lc }, hi: { at: q(hi), closed: hc } });
      const distractors = pickDistractors(rng, ans, [
        iv(-r2, !closed, r2, !closed),
        iv(r1, closed, r2, closed),
        iv(0, true, r2, closed),
        iv(-r2, closed, 0, false),
        iv(r1, closed, -r1, closed),
      ]);
      if (distractors === null) return null;
      const tex = `x^{2}${term(p, "|x|")}${plusConst(qq)}${relTex(rel)}0`;
      return {
        content: `부등식 $${tex}$${eul(tex)} 푸시오.`,
        answer: $(ans),
        solution: [
          ...lines,
          `(i), (ii)에서 주어진 부등식의 해는 $${ans}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, p, q: qq, r: REL_CODE[rel] },
        distractors,
      };
    });
  return attempt<Body>((): Body | null => {
    // 근을 먼저 — 안쪽 두 근 s<t 와 바깥 두 근 s−e, t+e 는 합이 같다(같은 x²+bx 에서 상수만 다르다).
    // 무작위 (b, c) 로 두 판별식이 **동시에** 제곱수가 되는 판은 거의 없다(재시도 300번 초과로 실측).
    const [s, t] = (distinctInts(rng, -6, 6, 2) as [number, number]).sort(
      (x, y) => x - y,
    );
    const e = randInt(rng, 1, 4);
    if ((e * (t - s + e)) % 2 !== 0) return null;
    const c = (e * (t - s + e)) / 2;
    const d = s * t - c;
    const b = -(s + t);
    const rel: Rel = rng() < 0.5 ? "<" : "le";
    // −c rel x²+bx+d rel c  ⇔  x²+bx+(d−c) rel 0  그리고  x²+bx+(d+c) (rel 의 반대쪽) 0
    const up = quadSol(1, b, d - c, rel);
    const down = quadSol(1, b, d + c, flipRel(rel));
    const sol = ivsMeet(up, down);
    const ints = intsInAll(sol);
    if (ints.length < 2) return null;
    const kind = randInt(rng, 0, 1);
    const ans = kind === 0 ? ints.length : ints.reduce((acc, x) => acc + x, 0);
    const inner = polyTex([d, b, 1]);
    const tex = `|${inner}|${relTex(rel)}${c}`;
    return {
      content: `부등식 $${tex}$${eul(tex)} 만족시키는 정수 $x$의 ${kind === 0 ? "개수를" : "값의 합을"} 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `$${tex}$에서 $${-c}${relTex(rel)}${inner}${relTex(rel)}${c}$`,
        quadStep(1, b, d - c, rel, `${inner}${relTex(rel)}${c}`),
        quadStep(1, b, d + c, flipRel(rel), `${-c}${relTex(rel)}${inner}`),
        `두 해의 공통부분은 ${ivsText(sol)}`,
        `따라서 정수 $x$는 ${intsText(ints)}이므로 ${kind === 0 ? `그 개수는 $${ans}$이다.` : `그 합은 $${ans}$이다.`}`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, b, c, d, r: REL_CODE[rel], kind },
    };
  });
}

// ───────────────────────────── 04 ─────────────────────────────
// 해가 주어진 이차부등식
// 꼴 0 (기본·대표): x²+ax+b rel 0 의 해가 주어짐 — a+b · ab · a−b
// 꼴 1 (응용): ax²+bx+c₀>0 의 해로 a, b 를 정해 다른 이차부등식의 해 (답이 구간, 오답 넷)
// 꼴 2 (심화하): ax²+bx+c>0 의 해가 1/p₂<x<1/p₁ — cx²+bx+a>0 을 만족시키는 정수의 합

function givenTex(r1: number, r2: number, rel: Rel): string {
  return holds(rel, 1)
    ? `$x${relTex(flipRel(rel))}${r1}$ 또는 $x${relTex(rel)}${r2}$`
    : `$${r1}${relTex(rel)}x${relTex(rel)}${r2}$`;
}

function t04(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const [r1, r2] = (distinctInts(rng, -7, 8, 2) as [number, number]).sort(
        (x, y) => x - y,
      );
      const rel = pickOne(rng, ["<", ">", "le", "ge"] as const);
      const a = -(r1 + r2);
      const b = r1 * r2;
      const [exprId, [et, ev]] = chooseExpr(rng, [
        ["a+b", a + b],
        ["ab", a * b],
        ["a-b", a - b],
      ]);
      const given = givenTex(r1, r2, rel);
      return {
        content: `이차부등식 $x^{2}+ax+b${relTex(rel)}0$의 해가 ${given}일 때, 상수 $a$, $b$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `해가 ${given}이고 $x^{2}$의 계수가 $1$인 이차부등식은 $${factoredTex(1, [q(r1), q(r2)])}${relTex(rel)}0$`,
          `즉 $${polyTex([b, a, 1])}${relTex(rel)}0$이므로 $a=${a}$, $b=${b}$`,
          `따라서 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, a, b, r: REL_CODE[rel], exprId },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      // 둘째 부등식의 근 u<v 를 먼저 — x²+s·a·x+t·b 가 (x−u)(x−v) 가 되게 a, b 를 정하고,
      // 첫 부등식 a(x−r₁)(x−r₂) 의 x 계수가 b 가 되게 r₁+r₂ 를 맞춘다
      const [u0, v0] = (distinctInts(rng, -6, 6, 2) as [number, number]).sort(
        (x, y) => x - y,
      );
      const s = pickOne(rng, [-2, -1, 1, 2]);
      const t = pickOne(rng, [-1, 1]);
      if ((u0 + v0) % s !== 0) return null;
      const a = -(u0 + v0) / s;
      if (a < 1 || a > 3) return null;
      const bb = t * u0 * v0;
      if (bb % a !== 0) return null;
      const r1 = randInt(rng, -6, 6);
      const r2 = -bb / a - r1;
      if (r1 === 0 || r2 === 0 || r1 >= r2 || Math.abs(r2) > 9) return null;
      const c0 = a * r1 * r2;
      const B2 = s * a;
      const C2 = t * bb;
      const rs = rootsQ(1, B2, C2);
      if (rs === null || rs.length !== 2) return null;
      const rel1 = pickOne(rng, LOWER);
      const rel2 = pickOne(rng, UPPER);
      const sol2 = quadSol(1, B2, C2, rel2);
      const ans = ivTex(sol2[0]!);
      const [u, v] = rs as [Q, Q];
      const closed = rel2 === "le";
      const band = (x: Q, y: Q, cl: boolean) =>
        ivTex({ lo: { at: x, closed: cl }, hi: { at: y, closed: cl } });
      const cands = [
        band(u, v, !closed),
        band(q(-v.n, v.d), q(-u.n, u.d), closed),
        band(q(r1), q(r2), closed),
      ];
      const slip = rootsQ(1, -B2, -C2);
      if (slip && slip.length === 2)
        cands.push(band(slip[0]!, slip[1]!, closed));
      cands.push(band(u, q(v.n + v.d, v.d), closed));
      const distractors = pickDistractors(rng, ans, cands);
      if (distractors === null) return null;
      const second = `x^{2}${term(s, "ax")}${term(t, "b")}${relTex(rel2)}0`;
      const given = givenTex(r1, r2, rel1);
      return {
        content: `이차부등식 $ax^{2}+bx${plusConst(c0)}${relTex(rel1)}0$의 해가 ${given}일 때, 이차부등식 $${second}$의 해를 구하시오. (단, $a$, $b$는 상수이다.)`,
        answer: $(ans),
        solution: [
          `해가 ${given}이고 $x^{2}$의 계수가 $1$인 이차부등식은 $${factoredTex(1, [q(r1), q(r2)])}${relTex(rel1)}0$, 즉 $${polyTex([r1 * r2, -(r1 + r2), 1])}${relTex(rel1)}0$`,
          `$a>0$이므로 양변에 $a$를 곱하면 $ax^{2}${termIf(-(r1 + r2), "ax")}${term(r1 * r2, "a")}${relTex(rel1)}0$`,
          `주어진 부등식과 비교하면 $b=${linTex([[-(r1 + r2), "a"]])}$, $${c0}=${linTex([[r1 * r2, "a"]])}$이므로 $a=${a}$, $b=${bb}$`,
          `이것을 $${second}$에 대입하면 ${quadStep(1, B2, C2, rel2)}`,
        ].join("\n"),
        difficulty: "응용",
        facts: {
          mode,
          a,
          b: bb,
          c0,
          s,
          t,
          r1: REL_CODE[rel1],
          r2: REL_CODE[rel2],
        },
        distractors,
      };
    });
  return attempt<Body>((): Body | null => {
    const [p1, p2] = (distinctInts(rng, 1, 9, 2) as [number, number]).sort(
      (x, y) => x - y,
    );
    if (p2 - p1 < 2) return null;
    const ints: number[] = [];
    for (let n = p1 + 1; n < p2; n += 1) ints.push(n);
    const ans = ints.reduce((s, x) => s + x, 0);
    const P = p1 * p2;
    const S = p1 + p2;
    const lo = qTex(q(1, p2));
    const hi = qTex(q(1, p1));
    const second = "cx^{2}+bx+a>0";
    const bCoef = qTex(q(-S, P));
    const cCoef = qTex(q(1, P));
    return {
      content: `이차부등식 $ax^{2}+bx+c>0$의 해가 $${lo}<x<${hi}$일 때, 이차부등식 $${second}$${eul(second)} 만족시키는 모든 정수 $x$의 값의 합을 구하시오. (단, $a$, $b$, $c$는 상수이다.)`,
      answer: numAnswer(ans),
      solution: [
        `해가 $${lo}<x<${hi}$이므로 $a<0$이고 $ax^{2}+bx+c=a\\left(x-${lo}\\right)\\left(x-${hi}\\right)$`,
        `$=a\\left(x^{2}${S === P ? "-x" : `-${qTex(q(S, P))}x`}+${cCoef}\\right)$이므로 $b=${bCoef}a$, $c=${cCoef}a$`,
        `이것을 $${second}$에 대입하면 $${cCoef}ax^{2}${bCoef.startsWith("-") ? "" : "+"}${bCoef}ax+a>0$`,
        `$a<0$이므로 양변에 $\\dfrac{${P}}{a}$${eul(`\\dfrac{${P}}{a}`)} 곱하면 $${polyTex([P, -S, 1])}<0$`,
        `즉 $${factoredTex(1, [q(p1), q(p2)])}<0$이므로 $${p1}<x<${p2}$`,
        `따라서 정수 $x$는 ${intsText(ints)}이므로 구하는 합은 $${ans}$이다.`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, p1, p2 },
    };
  });
}

// ───────────────────────────── 05 ─────────────────────────────
// 부등식 f(x)<0과 부등식 f(ax+b)<0의 관계
// 꼴 0 (기본·대표): f(x) rel 0 의 해로 f(px+q) rel 0 의 해 (답이 구간, 오답 넷)
// 꼴 1 (응용): 같은 설정에서 해가 m≤x≤n 일 때 m+n
// 꼴 2 (심화하): ax²+bx+c≤0 의 해로 a(x−s)²±b(x−s)+c<0 을 만족시키는 정수의 합

/** f 의 두 근 r₁<r₂ 사이에 px+q 가 들어가는 x — p 가 음수면 두 끝이 바뀐다. */
function innerBand(
  r1: number,
  r2: number,
  p: number,
  qq: number,
  closed: boolean,
): Iv {
  const a = q(r1 - qq, p);
  const b = q(r2 - qq, p);
  const [lo, hi] = qCmp(a, b) < 0 ? [a, b] : [b, a];
  return { lo: { at: lo, closed }, hi: { at: hi, closed } };
}

function givenSol(r1: number, r2: number, rel: Rel, sgn: number): string {
  const closed = !isStrict(rel);
  return holds(rel, sgn)
    ? `$x${closed ? "\\le " : "<"}${r1}$ 또는 $x${closed ? "\\ge " : ">"}${r2}$`
    : `$${r1}${closed ? "\\le " : "<"}x${closed ? "\\le " : "<"}${r2}$`;
}

function t05(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 2)
    return attempt<Body>((): Body | null => {
      const [u, v] = (distinctInts(rng, -5, 6, 2) as [number, number]).sort(
        (x, y) => x - y,
      );
      const s = nz(rng, -4, 5);
      const sigma = pickOne(rng, [1, -1] as const);
      const rel = pickOne(rng, UPPER);
      // σ=1: f(x−s) — x−s 가 [u, v] 안 · σ=−1: f(s−x) — s−x 가 [u, v] 안
      const [lo, hi] = sigma > 0 ? [u + s, v + s] : [s - v, s - u];
      const iv: Iv = {
        lo: { at: q(lo), closed: rel === "le" },
        hi: { at: q(hi), closed: rel === "le" },
      };
      const ints = intsInAll([iv]);
      const ans = ints.reduce((acc, x) => acc + x, 0);
      if (ints.length === 0) return null;
      const xs = `(${factorTex(s)})`;
      const disp = `a${xs}^{2}${sigma > 0 ? "+" : "-"}b${xs}+c${relTex(rel)}0`;
      const arg = sigma > 0 ? factorTex(s) : linX(-1, s);
      const inner = factoredTex(1, [q(lo), q(hi)]);
      return {
        content: `이차부등식 $ax^{2}+bx+c\\le 0$의 해가 $${u}\\le x\\le ${v}$일 때, 이차부등식 $${disp}$${eul(disp)} 만족시키는 모든 정수 $x$의 값의 합을 구하시오. (단, $a$, $b$, $c$는 상수이다.)`,
        answer: numAnswer(ans),
        solution: [
          `$ax^{2}+bx+c\\le 0$의 해가 $${u}\\le x\\le ${v}$이므로 $a>0$이고 $ax^{2}+bx+c=a${factoredTex(1, [q(u), q(v)])}$`,
          `$f(x)=ax^{2}+bx+c$라 하면 주어진 부등식은 $f(${arg})${relTex(rel)}0$이고 $f(${arg})=a${inner}$`,
          `$a>0$이므로 $${inner}${relTex(rel)}0$, 즉 $${ivTex(iv)}$`,
          `따라서 정수 $x$는 ${intsText(ints)}이므로 구하는 합은 $${ans}$이다.`,
        ].join("\n"),
        difficulty: "심화하",
        facts: { mode, u, v, s, sigma, rel: REL_CODE[rel] },
      };
    });
  return attempt<Body>((): Body | null => {
    const [r1, r2] = (distinctInts(rng, -5, 6, 2) as [number, number]).sort(
      (x, y) => x - y,
    );
    const sgn = rng() < 0.5 ? 1 : -1;
    const rel1 = pickOne(rng, ["<", ">", "le", "ge"] as const);
    // 둘째 부등식은 «두 근 사이» 쪽 — f 의 부호가 이차항 계수와 반대인 쪽
    const rel2 = pickOne(rng, sgn > 0 ? UPPER : LOWER);
    const p = pickOne(rng, [-1, 2, -2, 3]);
    const qq = randInt(rng, -3, 3);
    // px+q−r 가 `px` 하나로 떨어지면 `a(2x)(2x-1)` 같은 지면이 된다 — 그 판은 버린다
    if (qq === r1 || qq === r2) return null;
    const closed2 = !isStrict(rel2);
    const iv = innerBand(r1, r2, p, qq, closed2);
    const arg = linX(p, qq);
    const fac = (r: number): string => {
      const t = linX(p, qq - r);
      return t === "x" ? "x" : `(${t})`;
    };
    const aRel = sgn > 0 ? ">" : "<";
    const relB = sgn > 0 ? rel2 : flipRel(rel2);
    const given = givenSol(r1, r2, rel1, sgn);
    const head = [
      `$f(x)${relTex(rel1)}0$의 해가 ${given}이므로 $f(x)=a${factoredTex(1, [q(r1), q(r2)])}$ ($a${aRel}0$)로 놓을 수 있다.`,
      `$f(${arg})=a${fac(r1)}${fac(r2)}$이므로 $f(${arg})${relTex(rel2)}0$에서 $a${fac(r1)}${fac(r2)}${relTex(rel2)}0$`,
      `$a${aRel}0$이므로 $${fac(r1)}${fac(r2)}${relTex(relB)}0$`,
    ];
    const facts = {
      mode,
      sgn,
      u: r1,
      v: r2,
      rel1: REL_CODE[rel1],
      p,
      q: qq,
      rel2: REL_CODE[rel2],
    };
    const ans = ivTex(iv);
    if (mode === 1) {
      const v = qAdd(iv.lo!.at, iv.hi!.at);
      return {
        content: `이차부등식 $f(x)${relTex(rel1)}0$의 해가 ${given}일 때, 부등식 $f(${arg})${relTex(rel2)}0$의 해가 $${ivLetters(iv, "m", "n")}$이다. 이때 $m+n$의 값을 구하시오.`,
        answer: qAnswer(v),
        solution: [
          ...head,
          `즉 $${ans}$이므로 $m=${qTex(iv.lo!.at)}$, $n=${qTex(iv.hi!.at)}$`,
          `따라서 $m+n=${qTex(v)}$`,
        ].join("\n"),
        difficulty: "응용",
        facts,
      };
    }
    const band = (a: number, b: number, cl: boolean): string =>
      ivTex({
        lo: { at: q(Math.min(a, b)), closed: cl },
        hi: { at: q(Math.max(a, b)), closed: cl },
      });
    const distractors = pickDistractors(rng, ans, [
      ivTex({
        lo: { ...iv.lo!, closed: !closed2 },
        hi: { ...iv.hi!, closed: !closed2 },
      }),
      band(p * r1 + qq, p * r2 + qq, closed2),
      ivTex(innerBand(r1, r2, p, -qq, closed2)),
      band(r1, r2, closed2),
    ]);
    if (distractors === null) return null;
    return {
      content: `이차부등식 $f(x)${relTex(rel1)}0$의 해가 ${given}일 때, 부등식 $f(${arg})${relTex(rel2)}0$의 해를 구하시오.`,
      answer: $(ans),
      solution: [...head, `따라서 구하는 해는 $${ans}$`].join("\n"),
      difficulty: "기본",
      facts,
      distractors,
    };
  });
}

// ───────────────────────────── 06 ─────────────────────────────
// 이차부등식의 해가 한 개일 조건
// 꼴 0 (기본·대표): Ax²±(k+β)x+γk+δ ≤ 0 의 해가 한 개 — 모든 실수 k 의 합 · 곱
// 꼴 1 (응용): kx²+2mx+k+c ≥ 0 의 해가 한 개 — 실수 k (이차항 계수의 부호 조건)

let oneRootCache: [number, number][] | null = null;

/** k²+ck−m²=0 이 정수근을 갖는 (c, m) — kx²+2mx+k+c 가 중근을 갖게 하는 k 가 정수. */
function oneRootPairs(): [number, number][] {
  if (oneRootCache) return oneRootCache;
  const out: [number, number][] = [];
  for (let c = -8; c <= 8; c += 1)
    for (let m = -8; m <= 8; m += 1) {
      if (m === 0) continue;
      const s = isqrt(c * c + 4 * m * m);
      if (s !== null && (s - c) % 2 === 0) out.push([c, m]);
    }
  oneRootCache = out;
  return out;
}

function t06(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const A = pickOne(rng, [1, 2, 3, -1, -2]);
      const sigma = pickOne(rng, [1, -1] as const);
      const beta = randInt(rng, -4, 4);
      const gamma = pickOne(rng, [1, 2, -1, -2]);
      const delta = randInt(rng, -6, 6);
      // D(k) = (k+β)² − 4A(γk+δ) = k² + P1·k + P0
      const P1 = 2 * beta - 4 * A * gamma;
      const P0 = beta * beta - 4 * A * delta;
      if (P1 * P1 - 4 * P0 <= 0) return null;
      const kind = randInt(rng, 0, 1);
      const ans = kind === 0 ? -P1 : P0;
      const rel: Rel = A > 0 ? "le" : "ge";
      const kx =
        beta === 0
          ? `${sigma > 0 ? "+" : "-"}kx`
          : `${sigma > 0 ? "+" : "-"}(k${plusConst(beta)})x`;
      const cst = `${gamma > 0 ? "+" : "-"}${Math.abs(gamma) === 1 ? "" : Math.abs(gamma)}k${plusConst(delta)}`;
      const lhs = `${coefPrefix(A)}x^{2}${kx}${cst}`;
      const word = kind === 0 ? "합" : "곱";
      return {
        content: `이차부등식 $${lhs}${relTex(rel)}0$의 해가 오직 한 개 존재할 때, 모든 실수 $k$의 값의 ${word}을 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `이차부등식의 해가 오직 한 개이려면 이차방정식 $${lhs}=0$이 중근을 가져야 한다.`,
          `이 이차방정식의 판별식을 $D$라 하면 $D=(k${plusConst(beta)})^{2}-4\\times ${paren(A)}\\times (${linTex([[gamma, "k"]], delta)})=0$`,
          `즉 $${polyTex([P0, P1, 1], "k")}=0$`,
          `이 $k$에 대한 이차방정식의 판별식이 양수이므로 서로 다른 두 실근을 갖고, 근과 계수의 관계에 의하여 두 근의 ${word}은 $${ans}$이다.`,
          `따라서 모든 실수 $k$의 값의 ${word}은 $${ans}$이다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, A, sigma, beta, gamma, delta, kind, r: REL_CODE[rel] },
      };
    });
  return attempt<Body>((): Body | null => {
    const [c, m] = pickOne(rng, oneRootPairs());
    const s = isqrt(c * c + 4 * m * m)!;
    const kPlus = (-c + s) / 2;
    const kMinus = (-c - s) / 2;
    const rel = pickOne(rng, ["ge", "le"] as const);
    // ≥ 0 이 한 점에서만 성립 ⇒ 위로 볼록(k<0) · ≤ 0 ⇒ 아래로 볼록(k>0)
    const ans = rel === "ge" ? kMinus : kPlus;
    const tex = `kx^{2}${term(2 * m, "x")}+k${plusConst(c)}${relTex(rel)}0`;
    const sign = rel === "ge" ? "<" : ">";
    return {
      content: `이차부등식 $${tex}$${ga(tex)} 단 하나의 해를 갖도록 하는 상수 $k$의 값을 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `이차부등식 $${tex}$${ga(tex)} 단 하나의 해를 가지려면 $k${sign}0$이고, 이차방정식 $kx^{2}${term(2 * m, "x")}+k${plusConst(c)}=0$이 중근을 가져야 한다.`,
        `판별식을 $D$라 하면 $\\dfrac{D}{4}=${paren(m)}^{2}${c === 0 ? "-k^{2}" : `-k(k${plusConst(c)})`}=0$, 즉 $k^{2}${termIf(c, "k")}${plusConst(-m * m)}=0$`,
        `$${factoredTex(1, [q(kMinus), q(kPlus)]).replace(/x/g, "k")}=0$이므로 $k=${kMinus}$ 또는 $k=${kPlus}$`,
        `그런데 $k${sign}0$이므로 $k=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, m, c, r: REL_CODE[rel] },
    };
  });
}

// ───────────────────────────── 07 ─────────────────────────────
// 이차부등식이 해를 가질 조건
// 꼴 0 (기본·대표): Ax²+Bx±a<0 이 해를 갖도록 — 정수 a 의 최솟값(최댓값)
// 꼴 1 (심화하): (a−m)x²+2b(a−m)x+c>0 이 해를 갖도록 — a<p 또는 a>q 일 때 p+q

function t07(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const A = pickOne(rng, [1, 2, 3]);
      const B = nz(rng, -8, 8);
      const sigma = pickOne(rng, [1, -1] as const);
      const rel = pickOne(rng, UPPER);
      // 해를 가질 조건 — 판별식 D=B²−4A(σa) >0 (<) · ≥0 (≤)  ⇔  σa < B²/4A (≤)
      const T = q(B * B, 4 * A);
      let ans: number;
      if (sigma > 0) ans = rel === "le" || !qIsInt(T) ? qFloor(T) : T.n - 1;
      else ans = rel === "le" || !qIsInt(T) ? qCeil(q(-T.n, T.d)) : -T.n + 1;
      const aTerm = sigma > 0 ? "+a" : "-a";
      const lhs = `${coefPrefix(A)}x^{2}${term(B, "x")}${aTerm}`;
      const tex = `${lhs}${relTex(rel)}0`;
      const word = sigma > 0 ? "최댓값" : "최솟값";
      const dRel = rel === "le" ? "\\ge " : ">";
      const aRel =
        sigma > 0
          ? rel === "le"
            ? "\\le "
            : "<"
          : rel === "le"
            ? "\\ge "
            : ">";
      const bound = sigma > 0 ? qTex(T) : qTex(q(-T.n, T.d));
      return {
        content: `이차부등식 $${tex}$${ga(tex)} 해를 갖도록 하는 정수 $a$의 ${word}을 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `이차부등식 $${tex}$${ga(tex)} 해를 가지려면 이차방정식 $${lhs}=0$이 ${rel === "le" ? "실근" : "서로 다른 두 실근"}을 가져야 한다.`,
          `판별식을 $D$라 하면 $D=${paren(B)}^{2}-4\\times ${A}\\times ${sigma > 0 ? "a" : "(-a)"}${dRel}0$이므로 $a${aRel}${bound}$`,
          `따라서 정수 $a$의 ${word}은 $${ans}$이다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, A, B, sigma, r: REL_CODE[rel] },
      };
    });
  return attempt<Body>((): Body | null => {
    const m = randInt(rng, -4, 4);
    const b = pickOne(rng, [1, 1, 2]);
    const c = -randInt(rng, 1, 9);
    // 해를 갖는 a: a>m (위로 열림) 또는 a−m < c/b² (아래로 열림, 판별식 양수)
    const p = q(m * b * b + c, b * b);
    const ans = q(2 * m * b * b + c, b * b);
    const aT = m === 0 ? "a" : `(a${plusConst(-m)})`;
    const sq = m === 0 ? "a^{2}" : `${aT}^{2}`;
    const tex = `${aT}x^{2}+${2 * b}${aT}x${plusConst(c)}>0`;
    const b2 = b * b === 1 ? "" : String(b * b);
    // 홀로 쓰는 자리는 괄호 없이(`a-2>0`), 계수 1 은 안 쓴다(`+1(a-3)` 금지)
    const aBare = m === 0 ? "a" : `a${plusConst(-m)}`;
    const cc = -c === 1 ? "" : String(-c);
    return {
      content: `부등식 $${tex}$${ga(tex)} 해를 갖도록 하는 실수 $a$의 값의 범위가 $a<p$ 또는 $a>q$일 때, $p+q$의 값을 구하시오.`,
      answer: qAnswer(ans),
      solution: [
        `(i) $a>${m}$일 때, 이차항의 계수 $${aBare}$${ga(aBare)} 양수이므로 주어진 부등식은 항상 해를 갖는다.`,
        `(ii) $a=${m}$일 때, 주어진 부등식은 $${c}>0$이 되어 해를 갖지 않는다.`,
        `(iii) $a<${m}$일 때, 이차방정식 $${aT}x^{2}+${2 * b}${aT}x${plusConst(c)}=0$의 판별식을 $D$라 하면 해를 가지려면 $\\dfrac{D}{4}=${b2}${sq}+${cc}${aT}>0$`,
        `$${aT}\\{${b2}${aT}+${-c}\\}>0$에서 $${aBare}<0$이므로 $${b2}${aT}+${-c}<0$, 즉 $a<${qTex(p)}$`,
        `(i)~(iii)에서 $a<${qTex(p)}$ 또는 $a>${m}$이므로 $p=${qTex(p)}$, $q=${m}$`,
        `따라서 $p+q=${qTex(ans)}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, m, b, c },
    };
  });
}

// ───────────────────────────── 08 ─────────────────────────────
// 이차부등식이 항상 성립할 조건
// 꼴 0 (기본·대표): ax²+Bx ≤ C−a 가 모든 x 에서 — 정수 a 의 최댓값(최솟값)
// 꼴 1 (응용): Ax²−2(k+β)x+γ(k+β)>0 이 항상 — 정수 k 의 개수
// 꼴 2 (응용): ax²−2(a+u)x+2a+w<0 의 해가 모든 실수 — a 의 값의 범위 (답이 구간, 오답 넷)
// 꼴 3 (심화하): (k−m)x²−2(k−m)x+c>0 이 항상 (k=m 포함) — 정수 k 의 최댓값과 최솟값의 합

const PYTH: readonly [number, number][] = [
  [3, 4],
  [4, 3],
  [6, 8],
  [8, 6],
  [5, 12],
  [12, 5],
];

let allRealCache: [number, number][] | null = null;

/** a²−(2u−w)a−u²=0 이 정수근을 갖는 (u, w). */
function allRealPairs(): [number, number][] {
  if (allRealCache) return allRealCache;
  const out: [number, number][] = [];
  for (let u = 1; u <= 4; u += 1)
    for (let w = -9; w <= 9; w += 1) {
      const e = 2 * u - w;
      const s = isqrt(e * e + 4 * u * u);
      if (s !== null && (e - s) % 2 === 0) out.push([u, w]);
    }
  allRealCache = out;
  return out;
}

function t08(rng: Rng): Body {
  const mode = randInt(rng, 0, 3);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const [B0, C0] = pickOne(rng, PYTH);
      const B = B0 * pickOne(rng, [1, -1]);
      const C = C0 * pickOne(rng, [1, -1]);
      const h = isqrt(B * B + C * C)!;
      const rel = pickOne(rng, ["le", "ge"] as const);
      // 모든 x 에서 ax²+Bx+a−C rel 0 ⇔ (a 의 부호) · D=B²−4a(a−C) ≤ 0 ⇔ 4a²−4Ca−B² ≥ 0
      const rMinus = q(C - h, 2);
      const rPlus = q(C + h, 2);
      const up = rel === "ge";
      const ans = up ? qCeil(rPlus) : qFloor(rMinus);
      const word = up ? "최솟값" : "최댓값";
      const tex = `ax^{2}${term(B, "x")}${relTex(rel)}${C}-a`;
      const norm = `ax^{2}${term(B, "x")}+a${plusConst(-C)}`;
      return {
        content: `이차부등식 $${tex}$${ga(tex)} 모든 실수 $x$에 대하여 성립하도록 하는 정수 $a$의 ${word}을 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `$${tex}$에서 $${norm}${relTex(rel)}0$`,
          `이 이차부등식이 모든 실수 $x$에 대하여 성립하려면 $a${up ? ">" : "<"}0$이고, 이차방정식 $${norm}=0$의 판별식을 $D$라 하면 $D=${paren(B)}^{2}-4a(a${plusConst(-C)})\\le 0$`,
          `$4a^{2}${term(-4 * C, "a")}${plusConst(-B * B)}\\ge 0$에서 $a\\le ${qTex(rMinus)}$ 또는 $a\\ge ${qTex(rPlus)}$`,
          `그런데 $a${up ? ">" : "<"}0$이므로 $a${up ? "\\ge " : "\\le "}${qTex(up ? rPlus : rMinus)}$`,
          `따라서 정수 $a$의 ${word}은 $${ans}$이다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, B, C, r: REL_CODE[rel] },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const A = pickOne(rng, [1, 2, 3]);
      const beta = randInt(rng, -3, 3);
      const gamma = pickOne(rng, [1, 2, 3]);
      const rel = pickOne(rng, LOWER);
      const top = A * gamma;
      // D/4 = (k+β)² − Aγ(k+β) < 0 (>) · ≤ 0 (≥)  ⇔  0 < k+β < Aγ (열린 끝) · 0 ≤ k+β ≤ Aγ
      const lo = -beta;
      const hi = top - beta;
      const count = rel === ">" ? top - 1 : top + 1;
      if (count < 1) return null;
      const kT = beta === 0 ? "k" : `(k${plusConst(beta)})`;
      const tex = `${coefPrefix(A)}x^{2}-2${kT}x+${coefPrefix(gamma)}${kT}${relTex(rel)}0`;
      const inner = rel === ">" ? "<" : "\\le ";
      return {
        content: `이차부등식 $${tex}$${ga(tex)} $x$의 값에 관계없이 항상 성립할 때, 정수 $k$의 개수를 구하시오.`,
        answer: numAnswer(count),
        solution: [
          `이차방정식 $${coefPrefix(A)}x^{2}-2${kT}x+${coefPrefix(gamma)}${kT}=0$의 판별식을 $D$라 하면 항상 성립하려면`,
          `$\\dfrac{D}{4}=${beta === 0 ? "k^{2}" : `${kT}^{2}`}-${top}${kT}${rel === ">" ? "<" : "\\le "}0$`,
          `$${kT}(k${plusConst(beta - top)})${rel === ">" ? "<" : "\\le "}0$이므로 $${lo}${inner}k${inner}${hi}$`,
          `따라서 정수 $k$의 개수는 $${count}$이다.`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, A, beta, gamma, r: REL_CODE[rel] },
      };
    });
  if (mode === 2)
    return attempt<Body>((): Body | null => {
      const [u, w] = pickOne(rng, allRealPairs());
      const e = 2 * u - w;
      const s = isqrt(e * e + 4 * u * u)!;
      const R1 = (e - s) / 2;
      const R2 = (e + s) / 2;
      const rel = pickOne(rng, UPPER);
      const relA: Rel = rel === "<" ? "<" : "le";
      const ans = ivTex(rayIv(relA, q(R1)), "a");
      const distractors = rayDistractors(rng, relA, q(R1), "a");
      if (distractors === null) return null;
      const tex = `ax^{2}-2(a+${u})x+2a${plusConst(w)}${relTex(rel)}0`;
      const dRel = rel === "<" ? "<" : "\\le ";
      const flip = rel === "<" ? ">" : "\\ge ";
      return {
        content: `이차부등식 $${tex}$의 해가 모든 실수가 되도록 하는 실수 $a$의 값의 범위를 구하시오.`,
        answer: $(ans),
        solution: [
          `이차부등식의 해가 모든 실수이려면 $a<0$이고, 이차방정식 $ax^{2}-2(a+${u})x+2a${plusConst(w)}=0$의 판별식을 $D$라 하면`,
          `$\\dfrac{D}{4}=(a+${u})^{2}-a(2a${plusConst(w)})${dRel}0$, 즉 $a^{2}${termIf(-e, "a")}${plusConst(-u * u)}${flip}0$`,
          `$${factoredTex(1, [q(R1), q(R2)]).replace(/x/g, "a")}${flip}0$이므로 $a${rel === "<" ? "<" : "\\le "}${R1}$ 또는 $a${rel === "<" ? ">" : "\\ge "}${R2}$`,
          `그런데 $a<0$이므로 $${ans}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, u, w, r: REL_CODE[rel] },
        distractors,
      };
    });
  return attempt<Body>((): Body | null => {
    const m = randInt(rng, -4, 5);
    const c = randInt(rng, 2, 8);
    const ks: number[] = [];
    for (let k = m; k < m + c; k += 1) ks.push(k);
    const ans = ks[0]! + ks[ks.length - 1]!;
    const kT = m === 0 ? "k" : `(k${plusConst(-m)})`;
    const tex = `${kT}x^{2}-2${kT}x+${c}>0`;
    return {
      content: `부등식 $${tex}$${ga(tex)} 모든 실수 $x$에 대하여 성립하도록 하는 정수 $k$의 최댓값과 최솟값의 합을 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `(i) $k=${m}$일 때, $${c}>0$이므로 모든 실수 $x$에 대하여 성립한다.`,
        `(ii) $k\\ne ${m}$일 때, 모든 실수 $x$에 대하여 성립하려면 $${m === 0 ? "k" : `k${plusConst(-m)}`}>0$이고, 판별식을 $D$라 하면 $\\dfrac{D}{4}=${m === 0 ? "k^{2}" : `${kT}^{2}`}-${c}${kT}<0$`,
        `즉 $0<${m === 0 ? "k" : `k${plusConst(-m)}`}<${c}$이므로 $${m}<k<${m + c}$`,
        `(i), (ii)에서 $${m}\\le k<${m + c}$이므로 정수 $k$의 최댓값은 $${m + c - 1}$, 최솟값은 $${m}$이고 구하는 합은 $${ans}$이다.`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, m, c },
    };
  });
}

// ───────────────────────────── 09 ─────────────────────────────
// 이차부등식이 해를 갖지 않을 조건
// 꼴 0 (기본·대표): x²+2(n+p)x+c(n+p)<0 이 해를 갖지 않도록 — 정수 n 의 개수
// 꼴 1 (응용): ax²+bx>ax+b 가 해를 갖지 않을 때 — a 의 값
// 꼴 2 (심화하): (k−m)x²+2(k−m)x−c≥0 이 해를 갖지 않도록 — 정수 k 의 최댓값과 최솟값의 합

function t09(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const p = randInt(rng, -3, 3);
      const c = pickOne(rng, [-6, -5, -4, -3, -2, 2, 3, 4, 5, 6]);
      const count = Math.abs(c) + 1;
      const nT = p === 0 ? "n" : `(n${plusConst(p)})`;
      const cT = `${c > 0 ? "+" : "-"}${Math.abs(c)}${nT}`;
      const tex = `x^{2}+2${nT}x${cT}<0`;
      const [lo, hi] = c > 0 ? [-p, c - p] : [c - p, -p];
      return {
        content: `이차부등식 $${tex}$${ga(tex)} 해를 갖지 않도록 하는 정수 $n$의 개수를 구하시오.`,
        answer: numAnswer(count),
        solution: [
          `주어진 부등식이 해를 갖지 않으려면 모든 실수 $x$에 대하여 $x^{2}+2${nT}x${cT}\\ge 0$이 성립해야 한다.`,
          `이차방정식 $x^{2}+2${nT}x${cT}=0$의 판별식을 $D$라 하면 $\\dfrac{D}{4}=${p === 0 ? "n^{2}" : `${nT}^{2}`}${c > 0 ? "-" : "+"}${Math.abs(c)}${nT}\\le 0$`,
          `$${nT}(n${plusConst(p - c)})\\le 0$이므로 $${lo}\\le n\\le ${hi}$`,
          `따라서 정수 $n$의 개수는 $${count}$이다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, p, c },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const b = randInt(rng, 1, 9);
      // b=1 이면 `+1x` 가 된다(계수 1 은 지면 냄새) — 리드 병합 검수의 넓은 훑개가 찾았다(2026-09-13).
      const tex = `ax^{2}+${b === 1 ? "" : b}x>ax+${b}`;
      return {
        content: `이차부등식 $${tex}$${ga(tex)} 해를 갖지 않을 때, 실수 $a$의 값을 구하시오.`,
        answer: numAnswer(-b),
        solution: [
          `$${tex}$에서 $ax^{2}+(${b}-a)x-${b}>0$`,
          `이 부등식이 해를 갖지 않으려면 모든 실수 $x$에 대하여 $ax^{2}+(${b}-a)x-${b}\\le 0$이 성립해야 하므로 $a<0$`,
          `이차방정식 $ax^{2}+(${b}-a)x-${b}=0$의 판별식을 $D$라 하면 $D=(${b}-a)^{2}+${4 * b}a\\le 0$, 즉 $(a+${b})^{2}\\le 0$`,
          `따라서 $a=${-b}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, b },
      };
    });
  return attempt<Body>((): Body | null => {
    const m = randInt(rng, -3, 6);
    const c = randInt(rng, 2, 8);
    const lo = m - c + 1;
    const ans = lo + m;
    if (ans === 0) return null;
    const kT = m === 0 ? "k" : `(k${plusConst(-m)})`;
    const tex = `${kT}x^{2}+2${kT}x-${c}\\ge 0`;
    return {
      content: `부등식 $${tex}$${ga(tex)} 해를 갖지 않도록 하는 정수 $k$의 최댓값과 최솟값의 합을 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `주어진 부등식이 해를 갖지 않으려면 모든 실수 $x$에 대하여 $${kT}x^{2}+2${kT}x-${c}<0$이 성립해야 한다.`,
        `(i) $k=${m}$일 때, $-${c}<0$이므로 모든 실수 $x$에 대하여 성립한다.`,
        `(ii) $k\\ne ${m}$일 때, $${m === 0 ? "k" : `k${plusConst(-m)}`}<0$이고 판별식을 $D$라 하면 $\\dfrac{D}{4}=${m === 0 ? "k^{2}" : `${kT}^{2}`}+${c}${kT}<0$`,
        `즉 $-${c}<${m === 0 ? "k" : `k${plusConst(-m)}`}<0$이므로 $${m - c}<k<${m}$`,
        `(i), (ii)에서 $${m - c}<k\\le ${m}$이므로 정수 $k$의 최댓값은 $${m}$, 최솟값은 $${lo}$이고 구하는 합은 $${ans}$이다.`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, m, c },
    };
  });
}

// ───────────────────────────── 10 ─────────────────────────────
// 제한된 범위에서 항상 성립하는 이차부등식
// 꼴 0 (기본·대표): p≤x≤q 에서 −x²+2hx+e+sk≥0 이 항상 — 정수 k 의 최솟값
// 꼴 1 (응용): p≤x≤q 에서 Ax²+ax−ca<0 이 항상 — a 의 값의 범위 (답이 구간, 오답 넷)
// 꼴 2 (심화하): p≤x≤q 에서 f(x)≤g(x) 가 항상 — 실수 a 의 최솟값

function t10(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  return attempt<Body>((): Body | null => {
    const [p, qE] = (distinctInts(rng, -3, 7, 2) as [number, number]).sort(
      (x, y) => x - y,
    );
    if (qE - p < 2) return null;
    const range = `${p}\\le x\\le ${qE}`;
    if (mode === 0) {
      const h = randInt(rng, -2, 4);
      const s = pickOne(rng, [1, 2, 3, 4]);
      const e = randInt(rng, -8, 6);
      const rel = pickOne(rng, LOWER);
      // 위로 볼록 — 범위에서 최솟값은 꼭짓점에서 먼 끝
      const far = Math.abs(p - h) >= Math.abs(qE - h) ? p : qE;
      const fFar = -far * far + 2 * h * far + e;
      const K = q(-fFar, s);
      const ans = rel === "ge" || !qIsInt(K) ? qCeil(K) : K.n + 1;
      const poly = `-x^{2}${termIf(2 * h, "x")}${plusConst(e)}${term(s, "k")}`;
      const vtxT = h === 0 ? "x^{2}" : `(${factorTex(h)})^{2}`;
      const atFar = fFar === 0 ? term(s, "k", true) : `${fFar}${term(s, "k")}`;
      return {
        content: `$${range}$에서 이차부등식 $${poly}${relTex(rel)}0$${ga(`${poly}${relTex(rel)}0`)} 항상 성립할 때, 정수 $k$의 최솟값을 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          h === 0
            ? `$f(x)=${poly}$${ira(poly)} 하자.`
            : `$f(x)=${poly}$${ira(poly)} 하면 $f(x)=-${vtxT}${plusConst(h * h + e)}${term(s, "k")}$`,
          `$${range}$에서 $f(x)$는 $x=${far}$일 때 최소이므로 $f(${far})${relTex(rel)}0$이어야 한다.`,
          `$${atFar}${relTex(rel)}0$에서 $k${relTex(rel)}${qTex(K)}$`,
          `따라서 정수 $k$의 최솟값은 $${ans}$이다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, h, e, s, p, q: qE, r: REL_CODE[rel] },
      };
    }
    if (mode === 1) {
      const A = pickOne(rng, [1, 2, 3]);
      const c = rng() < 0.5 ? qE + randInt(rng, 1, 3) : p - randInt(rng, 1, 3);
      if (c === 0) return null;
      const rel = pickOne(rng, UPPER);
      // 끝점 e 에서 Ae²+a(e−c) rel 0 — (e−c) 의 부호가 두 끝에서 같아 방향이 하나로 모인다
      const bound = (e: number): Q => q(-A * e * e, e - c);
      const greater = c > qE;
      const Kp = bound(p);
      const Kq = bound(qE);
      const K = greater
        ? qCmp(Kp, Kq) > 0
          ? Kp
          : Kq
        : qCmp(Kp, Kq) < 0
          ? Kp
          : Kq;
      const other = K === Kp ? Kq : Kp;
      const relA: Rel = greater
        ? rel === "<"
          ? ">"
          : "ge"
        : rel === "<"
          ? "<"
          : "le";
      const ans = ivTex(rayIv(relA, K), "a");
      const base = rayDistractors(rng, relA, K, "a") ?? [];
      const distractors = pickDistractors(rng, ans, [
        ivTex(rayIv(relA, other), "a"),
        ...base.map((d) => d.slice(1, -1)),
      ]);
      if (distractors === null) return null;
      const poly = `${coefPrefix(A)}x^{2}+ax${term(-c, "a")}`;
      const endLine = (e: number, Ke: Q): string =>
        `$f(${e})=${linTex([[e - c, "a"]], A * e * e)}${relTex(rel)}0$에서 $a${relTex(relA)}${qTex(Ke)}$`;
      return {
        content: `$${range}$에서 이차부등식 $${poly}${relTex(rel)}0$${ga(`${poly}${relTex(rel)}0`)} 항상 성립하도록 하는 실수 $a$의 값의 범위를 구하시오.`,
        answer: $(ans),
        solution: [
          `$f(x)=${poly}$${ira(poly)} 하면 $y=f(x)$의 그래프는 아래로 볼록하므로 $${range}$에서 $f(x)${relTex(rel)}0$이 항상 성립하려면 $f(${p})${relTex(rel)}0$, $f(${qE})${relTex(rel)}0$이어야 한다.`,
          endLine(p, Kp),
          endLine(qE, Kq),
          `따라서 $${ans}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, A, c, p, q: qE, r: REL_CODE[rel] },
        distractors,
      };
    }
    const b1 = randInt(rng, -4, 4);
    const c1 = randInt(rng, -6, 6);
    const b2 = randInt(rng, -4, 4);
    const c2 = randInt(rng, -6, 6);
    // h = g − f = −2x² + (b2−b1)x + (a + c2 − c1) ≥ 0 — 위로 볼록이라 범위의 한 끝에서 최소
    const hAt = (e: number): number => -2 * e * e + (b2 - b1) * e + (c2 - c1);
    const far = hAt(p) <= hAt(qE) ? p : qE;
    const need = -hAt(far);
    const fT = polyTex([c1, b1, 1]);
    const gT = `-x^{2}${termIf(b2, "x")}+a${plusConst(c2)}`;
    const hT = `-2x^{2}${termIf(b2 - b1, "x")}+a${plusConst(c2 - c1)}`;
    return {
      content: `두 이차함수 $f(x)=${fT}$, $g(x)=${gT}$에 대하여 $${range}$에서 부등식 $f(x)\\le g(x)$가 항상 성립할 때, 실수 $a$의 최솟값을 구하시오.`,
      answer: numAnswer(need),
      solution: [
        `$f(x)\\le g(x)$에서 $g(x)-f(x)\\ge 0$`,
        `$h(x)=g(x)-f(x)$라 하면 $h(x)=${hT}$`,
        `$y=h(x)$의 그래프는 위로 볼록하므로 $${range}$에서 $h(x)$는 $x=${far}$일 때 최소이다.`,
        `$h(${far})\\ge 0$에서 $${linTex([[1, "a"]], hAt(far))}\\ge 0$이므로 $a\\ge ${need}$`,
        `따라서 실수 $a$의 최솟값은 $${need}$이다.`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, b1, c1, b2, c2, p, q: qE },
    };
  });
}

// ───────────────────────────── 11 ─────────────────────────────
// 이차부등식과 두 그래프의 위치 관계 - 특정한 범위에서 성립하는 경우
// 꼴 0 (기본·대표): 포물선이 직선보다 위쪽인 범위가 x<r 또는 x>b — a+b
// 꼴 1 (응용): 두 포물선 — 아래쪽에 있는 부분의 x 의 값의 범위 (답이 구간, 오답 넷)
// 꼴 2 (응용): 위로 볼록한 포물선이 y=b 보다 위쪽인 범위가 u<x<v — b−a · a+b · ab

function t11(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  return attempt<Body>((): Body | null => {
    if (mode === 0) {
      const [r1, bb] = (
        distinctInts(rng, -6, 7, 2, { nonzero: true }) as [number, number]
      ).sort((x, y) => x - y);
      const m = randInt(rng, -3, 3);
      const n = randInt(rng, -6, 6);
      const line = polyTex([n, m]);
      if (line === "0") return null;
      const c0 = r1 * bb + n;
      const a = r1 + bb - m;
      if (a === 0 || a + bb === 0) return null;
      const par = `x^{2}-ax${plusConst(c0)}`;
      const axT = m === 0 ? "ax" : `(a${plusConst(m)})x`;
      return {
        content: `이차함수 $y=${par}$의 그래프가 직선 $y=${line}$보다 위쪽에 있는 부분의 $x$의 값의 범위가 $x<${r1}$ 또는 $x>b$일 때, 상수 $a$, $b$에 대하여 $a+b$의 값을 구하시오. (단, $b>${r1}$)`,
        answer: numAnswer(a + bb),
        solution: [
          `이차함수의 그래프가 직선보다 위쪽에 있는 부분의 $x$의 값의 범위는 부등식 $${par}>${line}$, 즉 $x^{2}-${axT}${plusConst(c0 - n)}>0$의 해이다.`,
          `해가 $x<${r1}$ 또는 $x>b$이고 $x^{2}$의 계수가 $1$인 이차부등식은 $(${factorTex(r1)})(x-b)>0$, 즉 $x^{2}-(${r1}+b)x${term(r1, "b")}>0$`,
          `두 부등식이 같으므로 $${c0 - n}=${linTex([[r1, "b"]])}$, $a${plusConst(m)}=${r1}+b$에서 $b=${bb}$, $a=${a}$`,
          `따라서 $a+b=${a + bb}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, a, b: bb, c0, m, n },
      };
    }
    if (mode === 1) {
      const A1 = pickOne(rng, [1, 2]);
      const A2 = pickOne(rng, [-1, -2]);
      const k = A1 - A2;
      const [u, v] = (distinctInts(rng, -5, 5, 2) as [number, number]).sort(
        (x, y) => x - y,
      );
      const b1 = randInt(rng, -5, 5);
      const c1 = randInt(rng, -8, 8);
      const b2 = b1 + k * (u + v);
      const c2 = c1 - k * u * v;
      if (Math.abs(b2) > 12 || Math.abs(c2) > 20) return null;
      const ans = `${u}<x<${v}`;
      const distractors = pickDistractors(rng, ans, [
        `${u}\\le x\\le ${v}`,
        `${-v}<x<${-u}`,
        `${u - 1}<x<${v}`,
        `${u}<x<${v + 1}`,
      ]);
      if (distractors === null) return null;
      const f1 = polyTex([c1, b1, A1]);
      const f2 = polyTex([c2, b2, A2]);
      return {
        content: `이차함수 $y=${f1}$의 그래프가 이차함수 $y=${f2}$의 그래프보다 아래쪽에 있는 부분의 $x$의 값의 범위를 구하시오.`,
        answer: $(ans),
        solution: [
          `구하는 범위는 부등식 $${f1}<${f2}$의 해이다.`,
          quadStep(k, b1 - b2, c1 - c2, "<", `${f1}<${f2}`),
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, A1, b1, c1, A2, b2, c2 },
        distractors,
      };
    }
    const [u, v] = (distinctInts(rng, -4, 6, 2) as [number, number]).sort(
      (x, y) => x - y,
    );
    const c0 = randInt(rng, -6, 8);
    const a = u + v;
    const b = u * v + c0;
    const [exprId, [et, ev]] = chooseExpr(rng, [
      ["b-a", b - a],
      ["a+b", a + b],
      ["ab", a * b],
    ]);
    const par = `-x^{2}+ax${plusConst(c0)}`;
    return {
      content: `이차함수 $y=${par}$의 그래프가 직선 $y=b$보다 위쪽에 있는 부분의 $x$의 값의 범위가 $${u}<x<${v}$일 때, 상수 $a$, $b$에 대하여 $${et}$의 값을 구하시오.`,
      answer: numAnswer(ev),
      solution: [
        `구하는 범위는 부등식 $${par}>b$, 즉 $x^{2}-ax+b${plusConst(-c0)}<0$의 해이다.`,
        `해가 $${u}<x<${v}$이고 $x^{2}$의 계수가 $1$인 이차부등식은 $${factoredTex(1, [q(u), q(v)])}<0$, 즉 $${polyTex([u * v, -(u + v), 1])}<0$`,
        `두 부등식이 같으므로 $a=${a}$, $b${plusConst(-c0)}=${u * v}$에서 $b=${b}$`,
        `따라서 $${et}=${ev}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, a, b, c0, exprId },
    };
  });
}

// ───────────────────────────── 12 ─────────────────────────────
// 이차부등식과 두 그래프의 위치 관계 - 항상 성립하는 경우
// 꼴 0 (기본·대표): 포물선이 직선 y=m(x−s)+t 보다 항상 아래 — m 의 범위 α<m<β 일 때 αβ
// 꼴 1 (응용): 포물선이 직선보다 항상 위 — 정수 k 의 개수
// 꼴 2 (응용): y=kx²+… 가 직선보다 항상 아래 — k 의 값의 범위 (답이 구간, 오답 넷)

let alwaysBelowCache: [number, number][] | null = null;

/** k²+Ck−β²=0 이 정수근을 갖는 (C, β). */
function alwaysBelowPairs(): [number, number][] {
  if (alwaysBelowCache) return alwaysBelowCache;
  const out: [number, number][] = [];
  for (let C = -8; C <= 8; C += 1)
    for (let b = 1; b <= 8; b += 1) {
      const s = isqrt(C * C + 4 * b * b);
      if (s !== null && (s - C) % 2 === 0) out.push([C, b]);
    }
  alwaysBelowCache = out;
  return out;
}

function t12(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  return attempt<Body>((): Body | null => {
    if (mode === 0) {
      const p = randInt(rng, -4, 6);
      const q0 = randInt(rng, -8, 2);
      const s = randInt(rng, -3, 3);
      const t = randInt(rng, -4, 6);
      // m² + (4s−2p)m + (p²−4t+4q0) < 0 — 두 실근 α<β
      const P1 = 4 * s - 2 * p;
      const P0 = p * p - 4 * t + 4 * q0;
      if (P1 * P1 - 4 * P0 <= 0) return null;
      const par = `-x^{2}${termIf(p, "x")}${plusConst(q0)}`;
      const line =
        s === 0 ? `mx${plusConst(t)}` : `m(${factorTex(s)})${plusConst(t)}`;
      const mp = p === 0 ? "m" : `m${plusConst(-p)}`;
      const lhs = `x^{2}+${p === 0 ? "m" : `(${mp})`}x${termIf(-s, "m")}${plusConst(t - q0)}`;
      const mq = `m^{2}${termIf(P1, "m")}${plusConst(P0)}`;
      return {
        content: `이차함수 $y=${par}$의 그래프가 직선 $y=${line}$보다 항상 아래쪽에 있도록 하는 실수 $m$의 값의 범위가 $\\alpha<m<\\beta$일 때, $\\alpha\\beta$의 값을 구하시오.`,
        answer: numAnswer(P0),
        solution: [
          `$${par}<${line}$, 즉 $${lhs}>0$이 모든 실수 $x$에 대하여 성립해야 한다.`,
          `이차방정식 $${lhs}=0$의 판별식을 $D$라 하면 $D=${p === 0 ? "m^{2}" : `(${mp})^{2}`}${s === 0 ? plusConst(-4 * (t - q0)) : `-4(${linTex([[-s, "m"]], t - q0)})`}<0$, 즉 $${mq}<0$`,
          `이 부등식의 해가 $\\alpha<m<\\beta$이므로 $\\alpha$, $\\beta$는 이차방정식 $${mq}=0$의 두 근이고, 근과 계수의 관계에 의하여 $\\alpha\\beta=${P0}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, p, q0, s, t },
      };
    }
    if (mode === 1) {
      const sq = pickOne(rng, [1, 2, 3]);
      const beta = randInt(rng, -3, 3);
      const m = randInt(rng, -3, 3);
      const n = randInt(rng, -6, 4);
      const line = polyTex([n, m]);
      if (line === "0") return null;
      const c1 = n + sq * sq;
      const count = 4 * sq - 1;
      const kx = beta === 0 ? "kx" : `(k${plusConst(beta)})x`;
      const par = `x^{2}+${kx}${plusConst(c1)}`;
      const d = beta - m;
      const kd = d === 0 ? "k" : `k${plusConst(d)}`;
      return {
        content: `이차함수 $y=${par}$의 그래프가 직선 $y=${line}$보다 항상 위쪽에 있도록 하는 정수 $k$의 개수를 구하시오.`,
        answer: numAnswer(count),
        solution: [
          `$${par}>${line}$, 즉 $x^{2}+${d === 0 ? "kx" : `(${kd})x`}${plusConst(sq * sq)}>0$이 모든 실수 $x$에 대하여 성립해야 한다.`,
          `이차방정식 $x^{2}+${d === 0 ? "kx" : `(${kd})x`}${plusConst(sq * sq)}=0$의 판별식을 $D$라 하면 $D=${d === 0 ? "k^{2}" : `(${kd})^{2}`}-${4 * sq * sq}<0$`,
          `$(k${plusConst(d + 2 * sq)})(k${plusConst(d - 2 * sq)})<0$이므로 $${-d - 2 * sq}<k<${-d + 2 * sq}$`,
          `따라서 정수 $k$의 개수는 $${count}$이다.`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, beta, c1, m, n },
      };
    }
    const [C, beta] = pickOne(rng, alwaysBelowPairs());
    const s = isqrt(C * C + 4 * beta * beta)!;
    const kN = (-C - s) / 2;
    const kP = (-C + s) / 2;
    const m = randInt(rng, -3, 3);
    const n = randInt(rng, -5, 5);
    const b1 = 2 * beta + m;
    const c1 = C + n;
    const par = `kx^{2}${termIf(b1, "x")}+2k${plusConst(c1)}`;
    const lineT = `${m === 0 ? "k" : `${polyTex([0, m])}+k`}${plusConst(n)}`;
    const ans = ivTex(rayIv("<", q(kN)), "k");
    const distractors = rayDistractors(rng, "<", q(kN), "k");
    if (distractors === null) return null;
    const diff = `kx^{2}${term(2 * beta, "x")}+k${plusConst(C)}`;
    return {
      content: `이차함수 $y=${par}$의 그래프가 직선 $y=${lineT}$보다 항상 아래쪽에 있도록 하는 실수 $k$의 값의 범위를 구하시오.`,
      answer: $(ans),
      solution: [
        `$${par}<${lineT}$, 즉 $${diff}<0$이 모든 실수 $x$에 대하여 성립해야 하므로 $k<0$`,
        `이차방정식 $${diff}=0$의 판별식을 $D$라 하면 $\\dfrac{D}{4}=${paren(beta)}^{2}${C === 0 ? "-k^{2}" : `-k(k${plusConst(C)})`}<0$`,
        `$k^{2}${termIf(C, "k")}${plusConst(-beta * beta)}>0$, $${factoredTex(1, [q(kN), q(kP)]).replace(/x/g, "k")}>0$이므로 $k<${kN}$ 또는 $k>${kP}$`,
        `그런데 $k<0$이므로 $${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, b1, c1, m, n },
      distractors,
    };
  });
}

// ───────────────────────────── 13 ─────────────────────────────
// 이차부등식의 활용
// 꼴 0 (기본·대표): 끈으로 만든 직사각형의 넓이 — 가로의 길이의 최댓값과 최솟값의 차
// 꼴 1 (응용): 위로 던진 공의 높이 — 높이가 H 이상인 시간
// 꼴 2 (심화하): 할인과 판매량 — 하루 판매액이 R 이상인 최소 가격

function t13(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  return attempt<Body>((): Body | null => {
    if (mode === 0) {
      const [r1, r2] = (distinctInts(rng, 2, 20, 2) as [number, number]).sort(
        (x, y) => x - y,
      );
      const half = r1 + r2;
      const L = 2 * half;
      const S = r1 * r2;
      return {
        content: `길이가 $${L}\\,\\mathrm{cm}$인 끈으로 넓이가 $${S}\\,\\mathrm{cm^2}$ 이상인 직사각형을 만들려고 한다. 직사각형의 가로의 길이의 최댓값과 최솟값의 차를 구하시오. (단, 끈의 두께는 무시한다.)`,
        answer: numAnswer(r2 - r1),
        solution: [
          `가로의 길이를 $x\\,\\mathrm{cm}$라 하면 세로의 길이는 $(${half}-x)\\,\\mathrm{cm}$이므로`,
          `$x(${half}-x)\\ge ${S}$, 즉 $${polyTex([S, -half, 1])}\\le 0$`,
          `$${factoredTex(1, [q(r1), q(r2)])}\\le 0$이므로 $${r1}\\le x\\le ${r2}$`,
          `따라서 가로의 길이의 최댓값과 최솟값의 차는 $${r2}-${r1}=${r2 - r1}$이다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, L, S },
      };
    }
    if (mode === 1) {
      const [t1, t2] = (distinctInts(rng, 1, 6, 2) as [number, number]).sort(
        (x, y) => x - y,
      );
      const h0 = pickOne(rng, [0, 5, 10, 15, 20, 25]);
      const v = 5 * (t1 + t2);
      const H = h0 + 5 * t1 * t2;
      const from =
        h0 === 0
          ? "지면에서"
          : `지면으로부터 높이가 $${h0}\\,\\mathrm{m}$인 곳에서`;
      const hExpr = `-5t^{2}+${v}t${plusConst(h0)}`;
      return {
        content: `${from} 똑바로 위로 던진 공의 $t$초 후의 지면으로부터의 높이를 $h\\,\\mathrm{m}$라 하면 $h=${hExpr}$인 관계가 성립한다. 이 공의 높이가 $${H}\\,\\mathrm{m}$ 이상인 시간은 몇 초 동안인지 구하시오.`,
        answer: numAnswer(t2 - t1),
        solution: [
          `공의 높이가 $${H}\\,\\mathrm{m}$ 이상이려면 $${hExpr}\\ge ${H}$`,
          `$t^{2}-${t1 + t2}t+${t1 * t2}\\le 0$, $(t-${t1})(t-${t2})\\le 0$이므로 $${t1}\\le t\\le ${t2}$`,
          `따라서 공의 높이가 $${H}\\,\\mathrm{m}$ 이상인 시간은 $${t2}-${t1}=${t2 - t1}$ (초) 동안이다.`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, v, h0, H },
      };
    }
    const Pp = randInt(rng, 30, 55);
    const P = 100 * Pp;
    const d = pickOne(rng, [10, 20, 25, 50]);
    const [x1, x2] = (distinctInts(rng, 2, 20, 2) as [number, number]).sort(
      (x, y) => x - y,
    );
    if (x1 + x2 >= Pp - 5) return null;
    const N = d * (Pp - x1 - x2);
    const R = P * N + 100 * d * x1 * x2;
    const ans = P - 100 * x2;
    return {
      content: `어느 카페에서 커피 한 잔을 $${P}$원에 판매하면 하루에 $${N}$잔이 판매되고, 가격을 $100$원씩 내릴 때마다 하루 판매량이 $${d}$잔씩 늘어난다고 한다. 이 커피의 하루 판매액이 $${R}$원 이상이 되도록 할 때, 커피 한 잔의 최소 가격을 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `가격을 $100x$원 내린다고 하면 한 잔의 가격은 $(${P}-100x)$원, 하루 판매량은 $(${N}+${d}x)$잔이므로`,
        `$(${P}-100x)(${N}+${d}x)\\ge ${R}$`,
        `정리하면 $${polyTex([x1 * x2, -(x1 + x2), 1])}\\le 0$, $${factoredTex(1, [q(x1), q(x2)])}\\le 0$이므로 $${x1}\\le x\\le ${x2}$`,
        `따라서 커피 한 잔의 최소 가격은 $${P}-100\\times ${x2}=${ans}$(원)이다.`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, P, N, d, R },
    };
  });
}

// ═════════════════════════ 연립이차부등식 ═════════════════════════

/** 근 r₁, r₂(유리수)를 갖는 정수 계수 이차식 `k·(분모들)·(x−r₁)(x−r₂)` — 계수 [c, b, a]. */
function quadFrom(k: number, r1: Q, r2: Q): [number, number, number] {
  return [k * r1.n * r2.n, -k * (r1.n * r2.d + r2.n * r1.d), k * r1.d * r2.d];
}

/** 한 줄 이차부등식의 지면 — 반쯤은 양변에 일차식을 더해 옮겨 적는다(`2x^{2}-x\le x+3`). */
function quadRow(rng: Rng, [c, b, a]: readonly number[], rel: Rel): string {
  if (rng() < 0.5) return `${polyTex([c, b, a])}${relTex(rel)}0`;
  const m = randInt(rng, -3, 3);
  const n = randInt(rng, -6, 6);
  return `${polyTex([c + n, b + m, a])}${relTex(rel)}${polyTex([n, m])}`;
}

// ───────────────────────────── 14 ─────────────────────────────
// 연립이차부등식의 풀이
// 꼴 0 (기본·대표): 이차부등식 두 개 — 정수인 해의 개수 · 합
// 꼴 1 (응용): 일차부등식과 이차부등식 — 해를 구하시오 (답이 구간, 오답 넷)
// 꼴 2 (응용): A≤B<C 의 꼴(이차식) — 정수인 해의 합 · 개수

function t14(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  return attempt<Body>((): Body | null => {
    if (mode === 1) {
      const [u, v] = (distinctInts(rng, -6, 6, 2) as [number, number]).sort(
        (x, y) => x - y,
      );
      if (v - u < 2) return null;
      const k = pickOne(rng, [1, 2, -1]);
      const [c, b, a] = quadFrom(k, q(u), q(v));
      const r = pickOne(rng, k > 0 ? UPPER : LOWER);
      const t = randInt(rng, u + 1, v - 1);
      const relX = pickOne(rng, ["<", ">", "le", "ge"] as const);
      const m = pickOne(rng, [1, 2, 3, -1, -2]);
      const La = nz(rng, -4, 5);
      const Lb = randInt(rng, -8, 8);
      const relL = m > 0 ? relX : flipRel(relX);
      const linRow = `${polyTex([Lb, La])}${relTex(relL)}${polyTex([Lb + m * t, La - m])}`;
      const qRow = quadRow(rng, [c, b, a], r);
      const ray = rayIv(relX, q(t));
      const band = quadSol(a, b, c, r);
      const sol = ivsMeet([ray], band);
      if (sol.length !== 1) return null;
      const ans = ivTex(sol[0]!);
      const flipAll = (iv: Iv): Iv => ({
        lo: iv.lo && { at: iv.lo.at, closed: !iv.lo.closed },
        hi: iv.hi && { at: iv.hi.at, closed: !iv.hi.closed },
      });
      const other = ivsMeet([rayIv(flipRel(relX), q(t))], band);
      const cands = [ivTex(flipAll(sol[0]!)), ivTex(band[0]!)];
      if (other.length === 1) cands.push(ivTex(other[0]!));
      cands.push(ivTex(rayIv(relX, q(t))), ivTex(flipAll(band[0]!)));
      const distractors = pickDistractors(rng, ans, cands);
      if (distractors === null) return null;
      const rows = rng() < 0.5 ? [linRow, qRow] : [qRow, linRow];
      const sys = casesTex(rows);
      const linLine =
        m === 1
          ? `$${linRow}$에서 $${ivTex(ray)}$`
          : `$${linRow}$에서 $${term(m, "x", true)}${relTex(relL)}${m * t}$이므로 $${ivTex(ray)}$`;
      return {
        content: `연립부등식 $${sys}$${eul(sys)} 푸시오.`,
        answer: $(ans),
        solution: [
          linLine,
          quadStep(a, b, c, r, qRow),
          `따라서 주어진 연립부등식의 해는 $${ans}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: {
          mode,
          lm: m,
          lc: m * t,
          lr: REL_CODE[relL],
          a,
          b,
          c,
          r: REL_CODE[r],
        },
        distractors,
      };
    }
    const pick = (): { co: [number, number, number]; rel: Rel } => {
      const den = pickOne(rng, [1, 1, 2]);
      const [x1, x2] = (
        distinctInts(rng, -6 * den, 6 * den, 2) as [number, number]
      ).sort((x, y) => x - y);
      const k = pickOne(rng, [1, 2, 3, -1]);
      return {
        co: quadFrom(k, q(x1, den), q(x2, den)),
        rel: pickOne(rng, ["<", ">", "le", "ge"] as const),
      };
    };
    const f1 = pick();
    const f2 = pick();
    // 꼴 2 는 A rel₁ B rel₂ C — 두 부등호가 < 또는 ≤
    if (mode === 2) {
      f1.rel = pickOne(rng, UPPER);
      f2.rel = pickOne(rng, UPPER);
    }
    const [c1, b1, a1] = f1.co;
    const [c2, b2, a2] = f2.co;
    const sol = ivsMeet(
      quadSol(a1, b1, c1, f1.rel),
      quadSol(a2, b2, c2, f2.rel),
    );
    if (sol.some((iv) => !iv.lo || !iv.hi)) return null;
    const ints = intsInAll(sol);
    if (ints.length < 2 || ints.length > 10) return null;
    const kind = randInt(rng, 0, 1);
    const ans = kind === 0 ? ints.length : ints.reduce((s, x) => s + x, 0);
    const facts = {
      mode,
      a1,
      b1,
      c1,
      r1: REL_CODE[f1.rel],
      a2,
      b2,
      c2,
      r2: REL_CODE[f2.rel],
      kind,
    };
    const tail = [
      `두 해의 공통부분은 ${ivsText(sol)}`,
      `따라서 정수 $x$는 ${intsText(ints)}이므로 ${kind === 0 ? `그 개수는 $${ans}$이다.` : `그 합은 $${ans}$이다.`}`,
    ];
    const ask = kind === 0 ? "정수 $x$의 개수를" : "모든 정수 $x$의 값의 합을";
    if (mode === 0) {
      const r1 = quadRow(rng, f1.co, f1.rel);
      const r2 = quadRow(rng, f2.co, f2.rel);
      const sys = casesTex([r1, r2]);
      return {
        content: `연립부등식 $${sys}$${eul(sys)} 만족시키는 ${ask} 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          quadStep(a1, b1, c1, f1.rel, r1),
          quadStep(a2, b2, c2, f2.rel, r2),
          ...tail,
        ].join("\n"),
        difficulty: "기본",
        facts,
      };
    }
    const B = [
      randInt(rng, -6, 6),
      randInt(rng, -4, 4),
      pickOne(rng, [1, 2, -1]),
    ];
    const A = [B[0]! + c1, B[1]! + b1, B[2]! + a1];
    const C = [B[0]! - c2, B[1]! - b2, B[2]! - a2];
    const [At, Bt, Ct] = [polyTex(A), polyTex(B), polyTex(C)];
    if (At === "0" || Ct === "0" || At === Bt || Bt === Ct) return null;
    const left = `${At}${relTex(f1.rel)}${Bt}`;
    const right = `${Bt}${relTex(f2.rel)}${Ct}`;
    const chain = `${left}${relTex(f2.rel)}${Ct}`;
    const sys = casesTex([left, right]);
    return {
      content: `부등식 $${chain}$${eul(chain)} 만족시키는 ${ask} 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `주어진 부등식은 연립부등식 $${sys}$${gwa(sys)} 같다.`,
        quadStep(a1, b1, c1, f1.rel, left),
        quadStep(a2, b2, c2, f2.rel, right),
        ...tail,
      ].join("\n"),
      difficulty: "응용",
      facts,
    };
  });
}

// ───────────────────────────── 15 ─────────────────────────────
// 절댓값 기호를 포함한 연립부등식의 풀이
// 꼴 0 (기본·대표): |x−s|≤t 와 이차부등식 — 해가 a≤x≤b 일 때 b−a · a+b
// 꼴 1 (기본): |x−s|<t 와 두 근 밖의 이차부등식 — 정수인 해의 개수
// 꼴 2 (응용): x²−K|x|<0 과 이차부등식 — 정수인 해의 개수

function t15(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  return attempt<Body>((): Body | null => {
    const [u, v] = (distinctInts(rng, -6, 6, 2) as [number, number]).sort(
      (x, y) => x - y,
    );
    const k = pickOne(rng, [1, 2]);
    const [c, b, a] = quadFrom(k, q(u), q(v));
    const qRow = (rel: Rel): string => `${polyTex([c, b, a])}${relTex(rel)}0`;
    if (mode === 2) {
      const K = randInt(rng, 2, 5);
      const r = pickOne(rng, UPPER);
      const absSol: Iv[] = [
        { lo: { at: q(-K), closed: false }, hi: { at: q(0), closed: false } },
        { lo: { at: q(0), closed: false }, hi: { at: q(K), closed: false } },
      ];
      const sol = ivsMeet(absSol, quadSol(a, b, c, r));
      const ints = intsInAll(sol.filter((iv) => iv.lo && iv.hi));
      if (sol.some((iv) => !iv.lo || !iv.hi) || ints.length < 2) return null;
      const row1 = `x^{2}-${K}|x|<0`;
      const sys = casesTex([row1, qRow(r)]);
      return {
        content: `연립부등식 $${sys}$${eul(sys)} 만족시키는 정수 $x$의 개수를 구하시오.`,
        answer: numAnswer(ints.length),
        solution: [
          `$${row1}$에서 $x<0$일 때 $x^{2}+${K}x<0$이므로 $${-K}<x<0$, $x\\ge 0$일 때 $x^{2}-${K}x<0$이므로 $0<x<${K}$`,
          `즉 $${-K}<x<0$ 또는 $0<x<${K}$`,
          quadStep(a, b, c, r),
          `두 해의 공통부분은 ${ivsText(sol)}`,
          `따라서 정수 $x$는 ${intsText(ints)}의 $${ints.length}$개이다.`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, K, a, b, c, r: REL_CODE[r] },
      };
    }
    const s0 = randInt(rng, -4, 4);
    const t = randInt(rng, 2, 6);
    const ra: Rel = mode === 0 ? pickOne(rng, UPPER) : "<";
    const closedA = ra === "le";
    const absIv: Iv = {
      lo: { at: q(s0 - t), closed: closedA },
      hi: { at: q(s0 + t), closed: closedA },
    };
    const absRow = `|${factorTex(s0)}|${relTex(ra)}${t}`;
    // 절댓값 안이 `x` 하나면 풀어 쓴 줄이 곧 해다(`-3<x<3이므로 -3<x<3` 되풀이 금지)
    const absLine =
      s0 === 0
        ? `$${absRow}$에서 $${ivTex(absIv)}$`
        : `$${absRow}$에서 $${-t}${relTex(ra)}${factorTex(s0)}${relTex(ra)}${t}$이므로 $${ivTex(absIv)}$`;
    const r: Rel = mode === 0 ? pickOne(rng, UPPER) : pickOne(rng, LOWER);
    const sol = ivsMeet([absIv], quadSol(a, b, c, r));
    const facts = { mode, s0, t, ra: REL_CODE[ra], a, b, c, r: REL_CODE[r] };
    const sys = casesTex(rng() < 0.5 ? [absRow, qRow(r)] : [qRow(r), absRow]);
    if (mode === 0) {
      if (sol.length !== 1) return null;
      const s = sol[0]!;
      const lo = s.lo!.at.n;
      const hi = s.hi!.at.n;
      if (lo >= hi) return null;
      const [exprId, [et, ev]] = chooseExpr(rng, [
        ["b-a", hi - lo],
        ["a+b", lo + hi],
      ]);
      return {
        content: `연립부등식 $${sys}$의 해가 $${ivLetters(s)}$일 때, $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          absLine,
          quadStep(a, b, c, r),
          `따라서 주어진 연립부등식의 해는 $${ivTex(s)}$이므로 $a=${lo}$, $b=${hi}$`,
          `즉 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { ...facts, exprId },
      };
    }
    const ints = intsInAll(sol);
    if (ints.length < 2) return null;
    return {
      content: `연립부등식 $${sys}$${eul(sys)} 만족시키는 정수 $x$의 개수를 구하시오.`,
      answer: numAnswer(ints.length),
      solution: [
        absLine,
        quadStep(a, b, c, r),
        `두 해의 공통부분은 ${ivsText(sol)}`,
        `따라서 정수 $x$는 ${intsText(ints)}의 $${ints.length}$개이다.`,
      ].join("\n"),
      difficulty: "기본",
      facts,
    };
  });
}

// ───────────────────────────── 16 ─────────────────────────────
// 해가 주어진 연립이차부등식
// 꼴 0 (기본·대표): 한 근이 k 로 움직이는 둘째 부등식 — 해가 주어진 구간일 때 k 의 범위 (답이 구간, 오답 넷)
// 꼴 1 (심화하): x²+βx−a<0, x²+βx+b≥0 의 해가 두 조각 — a+b · ab · a−b
// 꼴 2 (심화하): 해를 갖지 않도록 하는 k 의 최댓값 M 과 최솟값 m — M−m

function t16(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  return attempt<Body>((): Body | null => {
    if (mode === 0) {
      const [u, v] = (distinctInts(rng, -6, 6, 2) as [number, number]).sort(
        (x, y) => x - y,
      );
      if (v - u < 3) return null;
      const side = rng() < 0.5 ? 1 : -1;
      const w = randInt(rng, u + 1, v - 1);
      const e = randInt(rng, -4, 4);
      // 둘째: (x−w)(x+k+e)<0 — 움직이는 근 ρ=−k−e
      const kx = e - w === 0 ? "kx" : `(k${plusConst(e - w)})x`;
      const second = `x^{2}+${kx}${w === 0 ? "" : term(-w, "k")}${plusConst(-w * e)}<0`;
      const first = `${polyTex([u * v, -(u + v), 1])}\\le 0`;
      const given = side > 0 ? `${w}<x\\le ${v}` : `${u}\\le x<${w}`;
      const K = q(side > 0 ? -e - v : -e - u);
      const relK: Rel = side > 0 ? "<" : ">";
      const ans = ivTex(rayIv(relK, K), "k");
      const distractors = rayDistractors(rng, relK, K, "k");
      if (distractors === null) return null;
      return {
        content: `연립부등식 $${casesTex([first, second])}$의 해가 $${given}$일 때, 실수 $k$의 값의 범위를 구하시오.`,
        answer: $(ans),
        solution: [
          quadStep(1, -(u + v), u * v, "le"),
          `$${second}$에서 $${factorParenText(w)}(x+k${plusConst(e)})<0$`,
          `두 부등식의 해의 공통부분이 $${given}$이 되려면 $-k${plusConst(-e)}${side > 0 ? ">" : "<"}${side > 0 ? v : u}$`,
          `따라서 $${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, u, v, w, e, side },
        distractors,
      };
    }
    if (mode === 1) {
      const h = randInt(rng, -3, 3);
      const d1 = randInt(rng, 2, 4);
      const d2 = randInt(rng, 1, d1 - 1);
      const [p1, p2, q1, q2] = [h - d1, h + d1, h - d2, h + d2];
      const beta = -2 * h;
      const a = -p1 * p2;
      const b = q1 * q2;
      const [exprId, [et, ev]] = chooseExpr(rng, [
        ["a+b", a + b],
        ["ab", a * b],
        ["a-b", a - b],
      ]);
      const rows = [
        `x^{2}${termIf(beta, "x")}-a<0`,
        `x^{2}${termIf(beta, "x")}+b\\ge 0`,
      ];
      const given = `$${p1}<x\\le ${q1}$ 또는 $${q2}\\le x<${p2}$`;
      return {
        content: `연립부등식 $${casesTex(rows)}$의 해가 ${given}일 때, 상수 $a$, $b$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `주어진 해가 되려면 첫째 부등식의 해는 $${p1}<x<${p2}$, 둘째 부등식의 해는 $x\\le ${q1}$ 또는 $x\\ge ${q2}$이어야 한다.`,
          `해가 $${p1}<x<${p2}$이고 $x^{2}$의 계수가 $1$인 이차부등식은 $${factoredTex(1, [q(p1), q(p2)])}<0$, 즉 $${polyTex([p1 * p2, -(p1 + p2), 1])}<0$이므로 $a=${a}$`,
          `해가 $x\\le ${q1}$ 또는 $x\\ge ${q2}$이고 $x^{2}$의 계수가 $1$인 이차부등식은 $${factoredTex(1, [q(q1), q(q2)])}\\ge 0$, 즉 $${polyTex([q1 * q2, -(q1 + q2), 1])}\\ge 0$이므로 $b=${b}$`,
          `따라서 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "심화하",
        facts: { mode, beta, a, b, exprId },
      };
    }
    const [u, v] = (distinctInts(rng, -5, 5, 2) as [number, number]).sort(
      (x, y) => x - y,
    );
    if (v - u < 2) return null;
    const al = randInt(rng, -4, 0);
    const be = randInt(rng, 1, 5);
    if (be - al <= v - u) return null;
    const M = u - al;
    const m0 = v - be;
    const kF = (s: number): string => (s === 0 ? "k" : `(k${plusConst(s)})`);
    const lin = al + be === 0 ? "-2kx" : `-(2k${plusConst(al + be)})x`;
    const second = `x^{2}${lin}+${kF(al)}${kF(be)}>0`;
    const first = quadRow(rng, [u * v, -(u + v), 1], "le");
    const sys = casesTex([first, second]);
    return {
      content: `연립부등식 $${sys}$${ga(sys)} 해를 갖지 않도록 하는 실수 $k$의 최댓값을 $M$, 최솟값을 $m$${ira("m")} 할 때, $M-m$의 값을 구하시오.`,
      answer: numAnswer(M - m0),
      solution: [
        quadStep(1, -(u + v), u * v, "le", first),
        `$${second}$에서 $(x-${kF(al)})(x-${kF(be)})>0$이므로 $x<k${plusConst(al)}$ 또는 $x>k${plusConst(be)}$`,
        `연립부등식이 해를 갖지 않으려면 $k${plusConst(al)}\\le ${u}$, $k${plusConst(be)}\\ge ${v}$`,
        `즉 $${m0}\\le k\\le ${M}$이므로 $M=${M}$, $m=${m0}$`,
        `따라서 $M-m=${M - m0}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, u, v, al, be },
    };
  });
}

/** `(x-3)` · `x` — 근 w 의 인수(0 이면 x 하나). */
function factorParenText(w: number): string {
  return w === 0 ? "x" : `(${factorTex(w)})`;
}

// ───────────────────────────── 17 ─────────────────────────────
// 연립이차부등식의 활용
// 꼴 0 (기본·대표): 세 변의 길이가 n−d, n, n+d 인 둔각삼각형 — 자연수 n 의 개수
// 꼴 1 (응용): 직사각형 화단 둘레의 길 — 길의 넓이 범위로 폭 x 의 범위 a≤x≤b 일 때 a+b
// 꼴 2 (심화하): 가로가 세로보다 d 긴 직사각형 — 둘레·넓이 조건으로 세로의 최댓값과 최솟값의 합

function t17(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  return attempt<Body>((): Body | null => {
    if (mode === 0) {
      const d = randInt(rng, 2, 8);
      const count = 2 * d - 1;
      return {
        content: `세 변의 길이가 $n-${d}$, $n$, $n+${d}$인 삼각형이 둔각삼각형이 되도록 하는 자연수 $n$의 개수를 구하시오.`,
        answer: numAnswer(count),
        solution: [
          `변의 길이는 양수이므로 $n-${d}>0$, 즉 $n>${d}$`,
          `가장 긴 변의 길이가 나머지 두 변의 길이의 합보다 작아야 하므로 $n+${d}<(n-${d})+n$, 즉 $n>${2 * d}$`,
          `둔각삼각형이려면 $(n+${d})^{2}>n^{2}+(n-${d})^{2}$, 즉 $n^{2}-${4 * d}n<0$이므로 $0<n<${4 * d}$`,
          `세 조건을 동시에 만족시키는 $n$의 값의 범위는 $${2 * d}<n<${4 * d}$`,
          `따라서 자연수 $n$의 개수는 $${count}$이다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, d },
      };
    }
    if (mode === 1) {
      const W = randInt(rng, 4, 12);
      const H = randInt(rng, 3, 10);
      const [n1, n2] = (distinctInts(rng, 1, 10, 2) as [number, number]).sort(
        (x, y) => x - y,
      );
      // 폭은 반 단위 — 넓이 4x²+2(W+H)x 가 정수로 떨어진다
      const x1 = q(n1, 2);
      const x2 = q(n2, 2);
      const areaAt = (x: Q): number =>
        (4 * x.n * x.n) / (x.d * x.d) + (2 * (W + H) * x.n) / x.d;
      const S1 = areaAt(x1);
      const S2 = areaAt(x2);
      if (!Number.isInteger(S1) || !Number.isInteger(S2)) return null;
      const ans = qAdd(x1, x2);
      const m = (n: number) => `$${n}\\,\\mathrm{m}$`;
      return {
        content: `가로의 길이가 ${m(W)}, 세로의 길이가 ${m(H)}인 직사각형 모양의 화단의 둘레에 폭이 일정하게 $x\\,\\mathrm{m}$인 길을 만들려고 한다. 길의 넓이가 $${S1}\\,\\mathrm{m^2}$ 이상 $${S2}\\,\\mathrm{m^2}$ 이하가 되도록 하는 $x$의 값의 범위가 $a\\le x\\le b$일 때, $a+b$의 값을 구하시오.`,
        answer: qAnswer(ans),
        solution: [
          `길의 넓이는 $(${W}+2x)(${H}+2x)-${W}\\times ${H}=4x^{2}+${2 * (W + H)}x$이므로`,
          `$${S1}\\le 4x^{2}+${2 * (W + H)}x\\le ${S2}$`,
          `$4x^{2}+${2 * (W + H)}x\\ge ${S1}$에서 $x>0$이므로 $x\\ge ${qTex(x1)}$`,
          `$4x^{2}+${2 * (W + H)}x\\le ${S2}$에서 $x>0$이므로 $0<x\\le ${qTex(x2)}$`,
          `따라서 $${qTex(x1)}\\le x\\le ${qTex(x2)}$이므로 $a+b=${qTex(ans)}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, W, H, S1, S2 },
      };
    }
    const d = randInt(rng, 1, 6);
    const lo = randInt(rng, 2, 8);
    const hi = lo + randInt(rng, 2, 8);
    const P = 2 * (2 * lo + d);
    const S = hi * (hi + d);
    return {
      content: `가로의 길이가 세로의 길이보다 $${d}\\,\\mathrm{cm}$ 긴 직사각형이 있다. 이 직사각형의 둘레의 길이가 $${P}\\,\\mathrm{cm}$ 이상이고 넓이가 $${S}\\,\\mathrm{cm^2}$ 이하일 때, 세로의 길이의 최댓값과 최솟값의 합을 구하시오.`,
      answer: numAnswer(lo + hi),
      solution: [
        `세로의 길이를 $x\\,\\mathrm{cm}$라 하면 가로의 길이는 $(x+${d})\\,\\mathrm{cm}$이므로`,
        `둘레의 길이에서 $2(2x+${d})\\ge ${P}$, 즉 $x\\ge ${lo}$`,
        `넓이에서 $x(x+${d})\\le ${S}$, 즉 $${polyTex([-S, d, 1])}\\le 0$, $${factoredTex(1, [q(-hi - d), q(hi)])}\\le 0$이므로 $${-hi - d}\\le x\\le ${hi}$`,
        `$x>0$이므로 두 조건을 동시에 만족시키는 범위는 $${lo}\\le x\\le ${hi}$`,
        `따라서 세로의 길이의 최댓값과 최솟값의 합은 $${hi}+${lo}=${lo + hi}$이다.`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, d, P, S },
    };
  });
}

// ───────────────────────────── 18 ─────────────────────────────
// 이차방정식의 근의 판별과 이차부등식
// 꼴 0 (기본·대표): x²+(k+p)x+k²+q=0 이 서로 다른 두 실근(실근) — k 의 범위 (답이 구간, 오답 넷)
// 꼴 1 (응용): 한 방정식은 허근, 다른 방정식은 서로 다른 두 실근 — 정수 k 의 개수
// 꼴 2 (응용): 한 방정식은 중근(→ a), 다른 방정식은 허근 — 정수 b 의 최댓값

let discCache: [number, number, number][] | null = null;

/** p²−3q 가 양의 제곱수 s² 인 (p, q, s) — D(k)=−3k²+2pk+p²−4q 의 근 (p±2s)/3 이 유리수. */
function discTriples(): [number, number, number][] {
  if (discCache) return discCache;
  const out: [number, number, number][] = [];
  for (let p = -4; p <= 4; p += 1)
    for (let q0 = -6; q0 <= 6; q0 += 1) {
      const s = isqrt(p * p - 3 * q0);
      if (s !== null && s > 0) out.push([p, q0, s]);
    }
  discCache = out;
  return out;
}

function t18(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  return attempt<Body>((): Body | null => {
    if (mode === 0) {
      const [p, q0, s] = pickOne(rng, discTriples());
      const strict = rng() < 0.6;
      const lo = q(p - 2 * s, 3);
      const hi = q(p + 2 * s, 3);
      const iv = (a: Q, b: Q, cl: boolean): string =>
        ivTex({ lo: { at: a, closed: cl }, hi: { at: b, closed: cl } }, "k");
      const ans = iv(lo, hi, !strict);
      const distractors = pickDistractors(rng, ans, [
        iv(lo, hi, strict),
        iv(q(p - s, 3), q(p + s, 3), !strict),
        iv(q(-p - 2 * s, 3), q(-p + 2 * s, 3), !strict),
        iv(q(p - 2 * s, 6), q(p + 2 * s, 6), !strict),
        ivTex(
          { lo: { at: lo, closed: true }, hi: { at: hi, closed: false } },
          "k",
        ),
      ]);
      if (distractors === null) return null;
      const kx = p === 0 ? "kx" : `(k${plusConst(p)})x`;
      const eq = `x^{2}+${kx}+k^{2}${plusConst(q0)}=0`;
      const cond = strict ? "서로 다른 두 실근" : "실근";
      const dRel = strict ? ">" : "\\ge ";
      const flip = strict ? "<" : "\\le ";
      return {
        content: `이차방정식 $${eq}$${ga(eq)} ${cond}을 갖도록 하는 실수 $k$의 값의 범위를 구하시오.`,
        answer: $(ans),
        solution: [
          `주어진 이차방정식의 판별식을 $D$라 하면 ${cond}을 가지려면 $D=${p === 0 ? "k^{2}" : `(k${plusConst(p)})^{2}`}-${q0 === 0 ? "4k^{2}" : `4(k^{2}${plusConst(q0)})`}${dRel}0$`,
          `$${polyTex([p * p - 4 * q0, 2 * p, -3], "k")}${dRel}0$, 즉 $${polyTex([-(p * p - 4 * q0), -2 * p, 3], "k")}${flip}0$`,
          `따라서 $${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, p, q: q0, strict: strict ? 1 : 0 },
        distractors,
      };
    }
    if (mode === 1) {
      const s1 = randInt(rng, 2, 5);
      const c1 = s1 * s1;
      const t = randInt(rng, 1, 4);
      const r1 = -1 - t;
      const r2 = t;
      const c2 = t * (1 + t);
      const ks: number[] = [];
      for (let k = -s1 + 1; k < s1; k += 1) if (k < r1 || k > r2) ks.push(k);
      if (ks.length < 2) return null;
      const eq1 = `x^{2}-2kx+${c1}=0`;
      const eq2 = `x^{2}+2kx-k+${c2}=0`;
      return {
        content: `이차방정식 $${eq1}$${eun(eq1)} 허근을 갖고, 이차방정식 $${eq2}$${eun(eq2)} 서로 다른 두 실근을 갖도록 하는 정수 $k$의 개수를 구하시오.`,
        answer: numAnswer(ks.length),
        solution: [
          `$${eq1}$의 판별식을 $D_{1}$${ira("D_{1}")} 하면 $\\dfrac{D_{1}}{4}=k^{2}-${c1}<0$이므로 $${-s1}<k<${s1}$`,
          `$${eq2}$의 판별식을 $D_{2}$${ira("D_{2}")} 하면 $\\dfrac{D_{2}}{4}=k^{2}+k-${c2}>0$, $(k${plusConst(-r1)})(k${plusConst(-r2)})>0$이므로 $k<${r1}$ 또는 $k>${r2}$`,
          `두 조건을 동시에 만족시키는 정수 $k$는 ${intsText(ks)}이므로 그 개수는 $${ks.length}$이다.`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, c1, c2 },
      };
    }
    const p = pickOne(rng, [1, -1, 2, -2]);
    const a0 = nz(rng, -4, 4);
    const q0 = 2 * p * a0 + p * p;
    const r = randInt(rng, -3, 3);
    const t = randInt(rng, -4, 4);
    // 둘째: (b+r)² − 4(a0+b+t) < 0 ⇔ b² + (2r−4)b + r² − 4a0 − 4t < 0
    const B1 = 2 * r - 4;
    const B0 = r * r - 4 * a0 - 4 * t;
    const rs = rootsQ(1, B1, B0);
    if (rs === null || rs.length !== 2) return null;
    const [lo, hi] = rs as [Q, Q];
    const ans = qIsInt(hi) ? hi.n - 1 : qFloor(hi);
    if (qCmp(q(ans), lo) <= 0) return null;
    const bx = r === 0 ? "bx" : `(b${plusConst(r)})x`;
    const eq1 = `x^{2}+2(a${plusConst(p)})x+a^{2}${plusConst(q0)}=0`;
    const eq2 = `x^{2}-${bx}+a+b${plusConst(t)}=0`;
    const eq2a = `x^{2}-${bx}+b${plusConst(a0 + t)}=0`;
    const aSq = q0 === 0 ? "-a^{2}" : `-(a^{2}${plusConst(q0)})`;
    const bSq = r === 0 ? "b^{2}" : `(b${plusConst(r)})^{2}`;
    const b4 = a0 + t === 0 ? "4b" : `4(b${plusConst(a0 + t)})`;
    return {
      content: `이차방정식 $${eq1}$${eun(eq1)} 중근을 갖고, 이차방정식 $${eq2}$${eun(eq2)} 허근을 갖도록 하는 정수 $b$의 최댓값을 구하시오. (단, $a$는 실수이다.)`,
      answer: numAnswer(ans),
      solution: [
        `$${eq1}$의 판별식을 $D_{1}$${ira("D_{1}")} 하면 $\\dfrac{D_{1}}{4}=(a${plusConst(p)})^{2}${aSq}=0$, 즉 $${linTex([[2 * p, "a"]], p * p - q0)}=0$이므로 $a=${a0}$`,
        `$a=${a0}$일 때 둘째 방정식은 $${eq2a}$이고, 판별식을 $D_{2}$${ira("D_{2}")} 하면 $D_{2}=${bSq}-${b4}<0$, 즉 $${polyTex([B0, B1, 1], "b")}<0$`,
        `$${factoredTex(1, [lo, hi]).replace(/x/g, "b")}<0$이므로 $${qTex(lo)}<b<${qTex(hi)}$`,
        `따라서 정수 $b$의 최댓값은 $${ans}$이다.`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, p, q: q0, r, t },
    };
  });
}

// ───────────────────────────── 19 ─────────────────────────────
// 이차방정식의 실근의 부호
// 꼴 0 (기본·대표): 두 근이 모두 양수 — a 의 값의 범위 (답이 구간, 오답 넷)
// 꼴 1 (응용): kx²+Bkx+C=0 의 두 근이 모두 음수 — k 의 최솟값
// 꼴 2 (응용): 두 근의 부호가 다르다(양수인 근의 절댓값이 더 크다) — k 의 범위 (답이 구간, 오답 넷)

function t19(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  return attempt<Body>((): Body | null => {
    if (mode === 0) {
      const p = randInt(rng, -4, 6);
      const sigma = pickOne(rng, [1, -1, 2, -2]);
      const r = nz(rng, -6, 6);
      // D ≥ 0 · 합 a+p > 0 · 곱 σa+r > 0
      const Dco: [number, number, number] = [
        p * p - 4 * r,
        2 * p - 4 * sigma,
        1,
      ];
      if (rootsQ(1, Dco[1], Dco[0]) === null) return null;
      const dSol = quadSol(1, Dco[1], Dco[0], "ge");
      const sumRay = rayIv(">", q(-p));
      const prodRay = rayIv(sigma > 0 ? ">" : "<", q(-r, sigma));
      const sol = ivsMeet(ivsMeet(dSol, [sumRay]), [prodRay]);
      if (sol.length !== 1 || !sol[0]!.lo || !sol[0]!.hi) return null;
      const s = sol[0]!;
      if (qCmp(s.lo!.at, s.hi!.at) >= 0) return null;
      const ans = ivTex(s, "a");
      const noD = ivsMeet([sumRay], [prodRay]);
      // 판별식 조건이 안 걸리면(합·곱만으로 답이 나오면) (i) 이 장식이 된다 — 다시 뽑는다.
      // (이 경우 오답 넷도 못 짓는다 — 전엔 그걸로 걸러졌다. 뜻을 드러내려고 따로 적는다.)
      if (noD.length === 1 && ivTex(noD[0]!, "a") === ans) return null;
      const flipAll: Iv = {
        lo: { at: s.lo!.at, closed: !s.lo!.closed },
        hi: { at: s.hi!.at, closed: !s.hi!.closed },
      };
      // 틀리기 쉬운 자리 — 판별식 조건을 빠뜨림 · 두 근의 합의 부호를 거꾸로(α+β=−(a+p))
      const wrongSum = ivsMeet(ivsMeet(dSol, [rayIv("<", q(-p))]), [prodRay]);
      const cands = [ivTex(flipAll, "a")];
      for (const alt of [noD, wrongSum]) {
        const w = alt.length === 1 ? alt[0]! : null;
        if (w?.lo && w.hi && qCmp(w.lo.at, w.hi.at) < 0)
          cands.push(ivTex(w, "a"));
      }
      cands.push(
        ivTex(
          { lo: { ...s.lo!, closed: true }, hi: { ...s.hi!, closed: true } },
          "a",
        ),
        ivTex(
          { lo: { ...s.lo!, closed: false }, hi: { ...s.hi!, closed: false } },
          "a",
        ),
        ivTex(
          {
            lo: { at: q(-s.hi!.at.n, s.hi!.at.d), closed: s.hi!.closed },
            hi: { at: q(-s.lo!.at.n, s.lo!.at.d), closed: s.lo!.closed },
          },
          "a",
        ),
      );
      const distractors = pickDistractors(rng, ans, cands);
      if (distractors === null) return null;
      const ax = p === 0 ? "ax" : `(a${plusConst(p)})x`;
      const prodT = linTex([[sigma, "a"]], r);
      const eq = `x^{2}-${ax}${sigma > 0 ? "+" : ""}${prodT}=0`;
      const dText =
        dSol.length === 1 && !dSol[0]!.lo && !dSol[0]!.hi
          ? "$a$는 모든 실수"
          : ivsText(dSol, "a");
      return {
        content: `이차방정식 $${eq}$의 두 근이 모두 양수일 때, 실수 $a$의 값의 범위를 구하시오.`,
        answer: $(ans),
        solution: [
          `두 근을 $\\alpha$, $\\beta$, 판별식을 $D$라 하면 두 근이 모두 양수이려면`,
          `(i) $D=${p === 0 ? "a^{2}" : `(a${plusConst(p)})^{2}`}-4(${prodT})\\ge 0$, 즉 $${polyTex(Dco, "a")}\\ge 0$에서 ${dText}`,
          `(ii) $\\alpha+\\beta=${p === 0 ? "a" : `a${plusConst(p)}`}>0$에서 $a>${-p}$`,
          `(iii) $\\alpha\\beta=${prodT}>0$에서 $a${sigma > 0 ? ">" : "<"}${qTex(q(-r, sigma))}$`,
          `(i)~(iii)에서 $${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, p, sigma, r },
        distractors,
      };
    }
    if (mode === 1) {
      const B = randInt(rng, 2, 5);
      const C = randInt(rng, 1, 9);
      const K = q(4 * C, B * B);
      const eq = `kx^{2}+${B}kx+${C}=0`;
      return {
        content: `이차방정식 $${eq}$의 두 근이 모두 음수가 되도록 하는 실수 $k$의 최솟값을 구하시오.`,
        answer: qAnswer(K),
        solution: [
          `두 근을 $\\alpha$, $\\beta$, 판별식을 $D$라 하면`,
          `(i) $D=${B * B}k^{2}-${4 * C}k\\ge 0$, $k(${B * B}k-${4 * C})\\ge 0$이므로 $k<0$ 또는 $k\\ge ${qTex(K)}$ ($k\\ne 0$)`,
          `(ii) $\\alpha+\\beta=-${B}<0$`,
          `(iii) $\\alpha\\beta=\\dfrac{${C}}{k}>0$에서 $k>0$`,
          `(i)~(iii)에서 $k\\ge ${qTex(K)}$이므로 실수 $k$의 최솟값은 $${qTex(K)}$이다.`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, B, C },
      };
    }
    const beta = randInt(rng, 1, 4);
    const s = randInt(rng, 1, 6);
    const variant = randInt(rng, 0, 1);
    const iv = (lo: number, hi: number, cl = false): string =>
      ivTex(
        { lo: { at: q(lo), closed: cl }, hi: { at: q(hi), closed: cl } },
        "k",
      );
    const ans = variant === 0 ? iv(-s, s) : iv(-s, 0);
    const distractors = pickDistractors(rng, ans, [
      iv(-s, s),
      iv(-s, s, true),
      iv(-s, 0),
      iv(0, s),
      iv(-s * s, s * s),
      iv(-s, 0, true),
    ]);
    if (distractors === null) return null;
    const eq = `x^{2}${term(beta, "kx")}+k^{2}-${s * s}=0`;
    const cond =
      variant === 0
        ? "두 근의 부호가 서로 다를 때"
        : "두 근의 부호가 서로 다르고, 양수인 근의 절댓값이 음수인 근의 절댓값보다 클 때";
    return {
      content: `이차방정식 $${eq}$의 ${cond}, 실수 $k$의 값의 범위를 구하시오.`,
      answer: $(ans),
      solution: [
        `두 근을 $\\alpha$, $\\beta$라 하면 두 근의 부호가 서로 다르려면 $\\alpha\\beta=k^{2}-${s * s}<0$이므로 $${-s}<k<${s}$`,
        ...(variant === 0
          ? []
          : [
              `양수인 근의 절댓값이 더 크려면 $\\alpha+\\beta=${term(-beta, "k", true)}>0$이므로 $k<0$`,
            ]),
        `따라서 $${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, beta, s, variant },
      distractors,
    };
  });
}

// ───────────────────────────── 20 ─────────────────────────────
// 정수인 해의 조건이 주어진 연립이차부등식
// 꼴 0 (기본·대표): 한 근이 a 인 둘째 부등식 — 정수인 해가 N개일 때 a 의 범위 (답이 구간, 오답 넷)
// 꼴 1 (심화하): 정수인 해가 주어진 몇 개뿐일 때 a 의 범위 (답이 구간, 오답 넷)
// 꼴 2 (심화하): |x−a|≤1 과 이차부등식 — 정수인 해의 합이 S 일 때 정수 a

function t20(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  return attempt<Body>((): Body | null => {
    const band = (lo: number, hi: number, lc: boolean, hc: boolean): string =>
      ivTex(
        { lo: { at: q(lo), closed: lc }, hi: { at: q(hi), closed: hc } },
        "a",
      );
    if (mode === 0) {
      const [p, qq] = (distinctInts(rng, -5, 7, 2) as [number, number]).sort(
        (x, y) => x - y,
      );
      const N = randInt(rng, 1, 2);
      if (qq - p - 1 <= N) return null;
      const fx = p - randInt(rng, 0, 3);
      const ans = band(p + N, p + N + 1, true, false);
      const distractors = pickDistractors(rng, ans, [
        band(p + N, p + N + 1, false, true),
        band(p + N, p + N + 1, true, true),
        band(p + N, p + N + 1, false, false),
        band(p + N - 1, p + N, true, false),
        band(p + N + 1, p + N + 2, true, false),
      ]);
      if (distractors === null) return null;
      const first = `${polyTex([p * qq, -(p + qq), 1])}<0`;
      const ax = fx === 0 ? "ax" : `(a${plusConst(fx)})x`;
      const second = `x^{2}-${ax}${fx === 0 ? "" : term(fx, "a")}\\le 0`;
      const sys = casesTex([first, second]);
      const ints = Array.from({ length: N }, (_, i) => p + 1 + i);
      return {
        content: `연립부등식 $${sys}$${eul(sys)} 만족시키는 정수 $x$가 오직 $${N}$개일 때, 실수 $a$의 값의 범위를 구하시오.`,
        answer: $(ans),
        solution: [
          quadStep(1, -(p + qq), p * qq, "<"),
          `$${second}$에서 $${factorParenText(fx)}(x-a)\\le 0$`,
          `$a\\le ${fx}$이면 공통부분이 없으므로 $a>${fx}$이고, 이때 둘째 부등식의 해는 $${fx}\\le x\\le a$`,
          `공통부분에 속하는 정수가 ${intsText(ints)}뿐이려면 $${p + N}\\le a<${p + N + 1}$`,
          `따라서 $${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, p, q: qq, f: fx, N },
        distractors,
      };
    }
    if (mode === 1) {
      const [r1, r2] = (distinctInts(rng, -4, 4, 2) as [number, number]).sort(
        (x, y) => x - y,
      );
      const N = randInt(rng, 2, 3);
      const rho2 = 2 * r2 + 1;
      const ints = Array.from({ length: N }, (_, i) => r1 - N + i);
      const lo = r1 - N - 1;
      const ans = band(lo, lo + 1, true, false);
      const distractors = pickDistractors(rng, ans, [
        band(lo, lo + 1, false, true),
        band(lo, lo + 1, true, true),
        band(lo, lo + 1, false, false),
        band(lo + 1, lo + 2, true, false),
        band(lo - 1, lo, true, false),
      ]);
      if (distractors === null) return null;
      const first = `x^{2}${termIf(-(r1 + r2), "x")}>${-r1 * r2 || 0}`;
      const second = `2x^{2}-2ax${term(-rho2, "x")}${term(rho2, "a")}<0`;
      const sys = casesTex([first, second]);
      const listed =
        N === 2
          ? `$${ints[0]}$${gwa(String(ints[0]))} $${ints[1]}$`
          : ints.map((n) => $(n)).join(", ");
      return {
        content: `연립부등식 $${sys}$${eul(sys)} 만족시키는 정수 $x$가 ${listed}뿐일 때, 실수 $a$의 값의 범위를 구하시오.`,
        answer: $(ans),
        solution: [
          `$${first}$에서 $${factoredTex(1, [q(r1), q(r2)])}>0$이므로 $x<${r1}$ 또는 $x>${r2}$`,
          `$${second}$에서 $(${polyTex([-rho2, 2])})(x-a)<0$이고, $a<${qTex(q(rho2, 2))}$일 때 해는 $a<x<${qTex(q(rho2, 2))}$`,
          `$${r2}<x<${qTex(q(rho2, 2))}$에는 정수가 없으므로, 공통부분에 속하는 정수가 ${listed}뿐이려면 $${lo}\\le a<${lo + 1}$`,
          `따라서 $${ans}$`,
        ].join("\n"),
        difficulty: "심화하",
        facts: { mode, r1, r2, N },
        distractors,
      };
    }
    const [u, v] = (distinctInts(rng, -5, 8, 2) as [number, number]).sort(
      (x, y) => x - y,
    );
    if (v - u < 3) return null;
    const a0 = randInt(rng, u + 1, v - 1);
    const S = 3 * a0;
    // 합이 S 가 되는 정수 a 가 하나뿐인지 — 끝에 걸치는 a 도 따져 본다
    const sumFor = (a: number): number => {
      let acc = 0;
      for (let x = a - 1; x <= a + 1; x += 1) if (x >= u && x <= v) acc += x;
      return acc;
    };
    const hits: number[] = [];
    for (let a = u - 3; a <= v + 3; a += 1) {
      const any = [a - 1, a, a + 1].some((x) => x >= u && x <= v);
      if (any && sumFor(a) === S) hits.push(a);
    }
    if (hits.length !== 1 || a0 === 0) return null;
    const qRow = `${polyTex([u * v, -(u + v), 1])}\\le 0`;
    const sys = casesTex(["|x-a|\\le 1", qRow]);
    return {
      content: `연립부등식 $${sys}$${eul(sys)} 만족시키는 모든 정수 $x$의 값의 합이 $${S}$일 때, 정수 $a$의 값을 구하시오.`,
      answer: numAnswer(a0),
      solution: [
        `$|x-a|\\le 1$에서 $a-1\\le x\\le a+1$`,
        quadStep(1, -(u + v), u * v, "le"),
        `$${u + 1}\\le a\\le ${v - 1}$이면 정수인 해는 $a-1$, $a$, $a+1$이므로 그 합은 $3a$`,
        `$a$가 $${u - 1}$, $${u}$, $${v}$, $${v + 1}$이면 정수인 해의 합은 각각 $${u}$, $${2 * u + 1}$, $${2 * v - 1}$, $${v}$이고, 어느 것도 $${S}$${gwa(String(S))} 같지 않다. (그 밖의 $a$에서는 정수인 해가 없다.)`,
        `따라서 $3a=${S}$에서 $a=${a0}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, u, v, S },
    };
  });
}

// ───────────────────────────── 21 ─────────────────────────────
// 이차방정식의 실근의 위치
// 꼴 0 (기본·대표): x²−2kx+s²=0 의 두 근이 모두 p 보다 크다 — k 의 최솟값
// 꼴 1 (응용): 두 근 사이에 p 가 있다 — k 의 범위 (답이 구간, 오답 넷)
// 꼴 2 (심화하): 두 근이 모두 m₁ 과 m₂ 사이에 있다 — k 의 범위 (답이 구간, 오답 넷)
// 꼴 3 (심화하): 두 근이 각각 (u, u+1), (w, w+1) 에 있다 — k 의 범위 (답이 구간, 오답 넷)

/** 일차식 `ck+d` 가 부등호 rel 을 만족하는 k (c≠0) — 반직선. */
function kRay(c: number, d: number, rel: Rel): Iv {
  return rayIv(c > 0 ? rel : flipRel(rel), q(-d, c));
}

function t21(rng: Rng): Body {
  const mode = randInt(rng, 0, 3);
  return attempt<Body>((): Body | null => {
    if (mode === 0) {
      const s = randInt(rng, 2, 5);
      const p = randInt(rng, 1, s - 1);
      const top = q(p * p + s * s, 2 * p);
      const eq = `x^{2}-2kx+${s * s}`;
      return {
        content: `이차방정식 $${eq}=0$의 두 근이 모두 $${p}$보다 클 때, 실수 $k$의 최솟값을 구하시오.`,
        answer: numAnswer(s),
        solution: [
          `$f(x)=${eq}$${ira(eq)} 하자.`,
          `(i) 판별식을 $D$라 하면 $\\dfrac{D}{4}=k^{2}-${s * s}\\ge 0$이므로 $k\\le ${-s}$ 또는 $k\\ge ${s}$`,
          `(ii) $f(${p})=${linTex([[-2 * p, "k"]], p * p + s * s)}>0$이므로 $k<${qTex(top)}$`,
          `(iii) 축의 방정식이 $x=k$이므로 $k>${p}$`,
          `(i)~(iii)에서 $${s}\\le k<${qTex(top)}$이므로 실수 $k$의 최솟값은 $${s}$이다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, p, s },
      };
    }
    if (mode === 1) {
      const p = randInt(rng, -3, 3);
      const al = pickOne(rng, [1, -1]);
      const be = randInt(rng, -3, 3);
      const gm = randInt(rng, -3, 3);
      const de = randInt(rng, -5, 5);
      const c = al * p + gm;
      const d = p * p + be * p + de;
      if (c === 0) return null;
      const ray = kRay(c, d, "<");
      const K = q(-d, c);
      const relK: Rel = c > 0 ? "<" : ">";
      const ans = ivTex(ray, "k");
      const distractors = rayDistractors(rng, relK, K, "k");
      if (distractors === null) return null;
      const Bt =
        be === 0
          ? al > 0
            ? "+kx"
            : "-kx"
          : al > 0
            ? `+(k${plusConst(be)})x`
            : `-(k${plusConst(-be)})x`;
      const Ct =
        gm === 0
          ? plusConst(de)
          : `${gm > 0 ? "+" : ""}${linTex([[gm, "k"]], de)}`;
      const lhs = `x^{2}${Bt}${Ct}`;
      return {
        content: `이차방정식 $${lhs}=0$의 두 근 사이에 $${p}$${ga(String(p))} 있도록 하는 실수 $k$의 값의 범위를 구하시오.`,
        answer: $(ans),
        solution: [
          `$f(x)=${lhs}$${ira(lhs)} 하면 $y=f(x)$의 그래프는 아래로 볼록하므로 두 근 사이에 $${p}$${ga(String(p))} 있으려면 $f(${p})<0$`,
          `$f(${p})=${linTex([[c, "k"]], d)}<0$이므로 $${ans}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, p, al, be, gm, de },
        distractors,
      };
    }
    if (mode === 2) {
      const beta = nz(rng, -4, 4);
      const gamma = randInt(rng, -6, 6);
      const [m1, m2] = (distinctInts(rng, -3, 4, 2) as [number, number]).sort(
        (x, y) => x - y,
      );
      if (m2 - m1 < 2) return null;
      // D/4 = k²−βk−γ ≥ 0 · f(m)=m²−2mk+βk+γ > 0 · m₁<k<m₂
      if (rootsQ(1, -beta, -gamma) === null) return null;
      const dSol = quadSol(1, -beta, -gamma, "ge");
      const fAt = (m: number): Iv[] => {
        const c = beta - 2 * m;
        const d = m * m + gamma;
        if (c === 0) return d > 0 ? [REAL_LINE] : [];
        return [kRay(c, d, ">")];
      };
      const axis: Iv = {
        lo: { at: q(m1), closed: false },
        hi: { at: q(m2), closed: false },
      };
      const sol = ivsMeet(ivsMeet(ivsMeet(dSol, fAt(m1)), fAt(m2)), [axis]);
      if (sol.length !== 1 || !sol[0]!.lo || !sol[0]!.hi) return null;
      const s = sol[0]!;
      if (qCmp(s.lo!.at, s.hi!.at) >= 0 || s.lo!.at.d > 5 || s.hi!.at.d > 5)
        return null;
      const ans = ivTex(s, "k");
      const toggled: Iv = {
        lo: { at: s.lo!.at, closed: !s.lo!.closed },
        hi: { at: s.hi!.at, closed: !s.hi!.closed },
      };
      const noAxis = ivsMeet(ivsMeet(dSol, fAt(m1)), fAt(m2));
      const noD = ivsMeet(ivsMeet(fAt(m1), fAt(m2)), [axis]);
      const cands = [ivTex(toggled, "k")];
      for (const alt of [noAxis, noD]) {
        if (alt.length === 1 && alt[0]!.lo && alt[0]!.hi)
          cands.push(ivTex(alt[0]!, "k"));
      }
      cands.push(
        ivTex(
          { lo: { ...s.lo!, closed: true }, hi: { ...s.hi!, closed: true } },
          "k",
        ),
        ivTex(
          { lo: { ...s.lo!, closed: false }, hi: { ...s.hi!, closed: false } },
          "k",
        ),
      );
      const distractors = pickDistractors(rng, ans, cands);
      if (distractors === null) return null;
      const lhs = `x^{2}-2kx${term(beta, "k")}${plusConst(gamma)}`;
      // fAt 이 빈 배열이면 sol 도 비어 위에서 걸렀다 — 여기 오는 것은 반직선 또는 «늘 성립»
      const fLine = (m: number): string => {
        const c = beta - 2 * m;
        const d = m * m + gamma;
        if (c === 0)
          return `$f(${m})=${d}>0$이므로 $k$의 값에 관계없이 성립한다`;
        return `$f(${m})=${linTex([[c, "k"]], d)}>0$에서 $${ivTex(fAt(m)[0]!, "k")}$`;
      };
      const dText =
        dSol.length === 1 && !dSol[0]!.lo && !dSol[0]!.hi
          ? "$k$는 모든 실수"
          : ivsText(dSol, "k");
      return {
        content: `이차방정식 $${lhs}=0$의 두 근이 모두 $${m1}$${gwa(String(m1))} $${m2}$ 사이에 있을 때, 실수 $k$의 값의 범위를 구하시오.`,
        answer: $(ans),
        solution: [
          `$f(x)=${lhs}$${ira(lhs)} 하자.`,
          `(i) 판별식을 $D$라 하면 $\\dfrac{D}{4}=k^{2}${term(-beta, "k")}${plusConst(-gamma)}\\ge 0$에서 ${dText}`,
          `(ii) ${fLine(m1)}`,
          `(iii) ${fLine(m2)}`,
          `(iv) 축의 방정식이 $x=k$이므로 $${m1}<k<${m2}$`,
          `(i)~(iv)에서 $${ans}$`,
        ].join("\n"),
        difficulty: "심화하",
        facts: { mode, beta, gamma, m1, m2 },
        distractors,
      };
    }
    const b = nz(rng, -6, 6);
    const c = randInt(rng, -6, 6);
    const u = randInt(rng, -3, 1);
    const w = u + randInt(rng, 1, 3);
    // f(e) = k(e²+1) + be + c — 한 근이 (e₁, e₂) 에 있다 ⇔ f(e₁)f(e₂) < 0 ⇔ k 가 두 영점 사이
    const kz = (e: number): Q => q(-(b * e + c), e * e + 1);
    const between = (e1: number, e2: number): Iv => {
      const [x, y] = [kz(e1), kz(e2)];
      const [lo, hi] = qCmp(x, y) < 0 ? [x, y] : [y, x];
      return { lo: { at: lo, closed: false }, hi: { at: hi, closed: false } };
    };
    const I1 = between(u, u + 1);
    const I2 = between(w, w + 1);
    const sol = ivsMeet([I1], [I2]);
    if (sol.length !== 1) return null;
    const s = sol[0]!;
    if (qCmp(s.lo!.at, s.hi!.at) >= 0) return null;
    // k=0 이면 이차방정식이 아니다
    if (qCmp(s.lo!.at, q(0)) < 0 && qCmp(s.hi!.at, q(0)) > 0) return null;
    if (s.lo!.at.d > 10 || s.hi!.at.d > 10) return null;
    const ans = ivTex(s, "k");
    // 틀리기 쉬운 자리 — 두 조건 가운데 하나만 · 등호를 넣음 · 부호를 거꾸로
    const cands = [ivTex(I1, "k"), ivTex(I2, "k")];
    cands.push(
      ivTex(
        { lo: { ...s.lo!, closed: true }, hi: { ...s.hi!, closed: true } },
        "k",
      ),
      ivTex(
        { lo: { ...s.lo!, closed: true }, hi: { ...s.hi!, closed: false } },
        "k",
      ),
      ivTex(
        {
          lo: { at: q(-s.hi!.at.n, s.hi!.at.d), closed: false },
          hi: { at: q(-s.lo!.at.n, s.lo!.at.d), closed: false },
        },
        "k",
      ),
    );
    const distractors = pickDistractors(rng, ans, cands);
    if (distractors === null) return null;
    const lhs = `kx^{2}${term(b, "x")}+k${plusConst(c)}`;
    const fval = (e: number): string => linTex([[e * e + 1, "k"]], b * e + c);
    return {
      content: `이차방정식 $${lhs}=0$의 두 근을 $\\alpha$, $\\beta$라 할 때, $${u}<\\alpha<${u + 1}$, $${w}<\\beta<${w + 1}$이 되도록 하는 실수 $k$의 값의 범위를 구하시오.`,
      answer: $(ans),
      solution: [
        `$f(x)=${lhs}$${ira(lhs)} 하면 $y=f(x)$의 그래프가 두 구간에서 각각 $x$축과 만나야 한다.`,
        `$f(${u})f(${u + 1})<0$에서 $(${fval(u)})(${fval(u + 1)})<0$이므로 $${ivTex(I1, "k")}$`,
        `$f(${w})f(${w + 1})<0$에서 $(${fval(w)})(${fval(w + 1)})<0$이므로 $${ivTex(I2, "k")}$`,
        `따라서 $${ans}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, b, c, u, w },
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
export const H1_QUAD_INEQ: HighTypeEntry[] = [
  entry("02", "이차부등식의 풀이", SEC.이차, t02),
  entry("03", "절댓값 기호를 포함한 이차부등식", SEC.절댓값, t03),
  entry("04", "해가 주어진 이차부등식", SEC.이차, t04),
  entry("05", "부등식 과 f(x)<0 부등식 f(ax+b)<0의 관계", SEC.이차, t05),
  entry("06", "이차부등식의 해가 한 개일 조건", SEC.조건, t06),
  entry("07", "이차부등식이 해를 가질 조건", SEC.조건, t07),
  entry("08", "이차부등식이 항상 성립할 조건", SEC.조건, t08),
  entry("09", "이차부등식이 해를 갖지 않을 조건", SEC.조건, t09),
  entry("10", "제한된 범위에서 항상 성립하는 이차부등식", SEC.제한, t10),
  entry(
    "11",
    "이차부등식과 두 그래프의 위치 관계 - 특정한 범위에서 성립하는 경우",
    SEC.이차,
    t11,
  ),
  entry(
    "12",
    "이차부등식과 두 그래프의 위치 관계 - 항상 성립하는 경우",
    SEC.조건,
    t12,
  ),
  entry("13", "이차부등식의 활용", SEC.이차, t13),
  entry("14", "연립이차부등식의 풀이", SEC.연립, t14),
  entry("15", "절댓값 기호를 포함한 연립부등식의 풀이", SEC.연립, t15),
  entry("16", "해가 주어진 연립이차부등식", SEC.연립, t16),
  entry("17", "연립이차부등식의 활용", SEC.연립, t17),
  entry("18", "이차방정식의 근의 판별과 이차부등식", SEC.연립, t18),
  entry("19", "이차방정식의 실근의 부호", SEC.부호, t19),
  entry("20", "정수인 해의 조건이 주어진 연립이차부등식", SEC.연립, t20),
  entry("21", "이차방정식의 실근의 위치", SEC.위치, t21),
];

export const H1_QUAD_INEQ_HOLD: HighHold[] = [
  {
    key: `${BOOK}|${MINOR}|01`,
    reason:
      "포물선·직선 그래프를 읽고 푸는 유형 — 그림이 있어야 성립한다. 물결 2 funcGraph 로 넘긴다(좌표로 때우지 않는다, 09 §4)",
  },
];
