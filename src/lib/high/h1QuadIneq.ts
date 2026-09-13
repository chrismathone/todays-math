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
  ivsText,
  ivTex,
  ivUnion,
  linX,
  pointIv,
  qCmp,
  REAL_LINE,
  REL_CODE,
  relTex,
  type Iv,
  type Rel,
} from "./h1LinIneq";
import { eul } from "./josa";
import { q, qTex, surd, surdPmTex, surdTex, type Q } from "./numbers";
import {
  $,
  attempt,
  coefPrefix,
  distinctInts,
  numAnswer,
  pickDistractors,
  pickOne,
  plusConst,
  randInt,
} from "./pick";
import { factorTex, linTex, polyTex, term } from "./poly";
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
];

const WIP = "작업 중 — h1-ineq 세션이 이어서 만든다(2026-09-13)";

export const H1_QUAD_INEQ_HOLD: HighHold[] = [
  {
    key: `${BOOK}|${MINOR}|01`,
    reason:
      "포물선·직선 그래프를 읽고 푸는 유형 — 그림이 있어야 성립한다. 물결 2 funcGraph 로 넘긴다(좌표로 때우지 않는다, 09 §4)",
  },
  ...[
    "05",
    "06",
    "07",
    "08",
    "09",
    "10",
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "20",
    "21",
  ].map((n) => ({ key: `${BOOK}|${MINOR}|${n}`, reason: WIP })),
];
