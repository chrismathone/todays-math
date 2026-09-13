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
import { eul, ga, ira } from "./josa";
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
      const tex = `ax^{2}+${b}x>ax+${b}`;
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
];

const WIP = "작업 중 — h1-ineq 세션이 이어서 만든다(2026-09-13)";

export const H1_QUAD_INEQ_HOLD: HighHold[] = [
  {
    key: `${BOOK}|${MINOR}|01`,
    reason:
      "포물선·직선 그래프를 읽고 푸는 유형 — 그림이 있어야 성립한다. 물결 2 funcGraph 로 넘긴다(좌표로 때우지 않는다, 09 §4)",
  },
  ...["14", "15", "16", "17", "18", "19", "20", "21"].map((n) => ({
    key: `${BOOK}|${MINOR}|${n}`,
    reason: WIP,
  })),
];
