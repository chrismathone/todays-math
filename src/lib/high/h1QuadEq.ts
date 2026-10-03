/**
 * 공통수학1 「이차방정식」 — RPM 공통수학1(2022) 색인 17유형. **물결 1 세션 `h1-complex` 소유.**
 *
 * 본보기 `h1Identity.ts` 를 그대로 따른다 — 답을 먼저 정하고 식을 짓는다 · 꼴(mode)마다 칸 ·
 * 대표문제 꼴은 `기본` · 수식 뒤 조사는 `josa.ts` 로만. 이 중단원이라서 더한 것:
 *
 * ## ⑴ 근이 무리수·허수인 답은 `±` 한 덩어리 — 오답은 근의 공식에서 틀리기 쉬운 자리
 *
 * 「해를 구하시오」의 답은 `numbers.surdPmTex` 로 `\dfrac{2\pm\sqrt{26}i}{2}` 처럼 쓴다. 오답은
 * −b 의 부호 · 분모 2a 를 a 로 · 판별식의 부호(i 를 붙이고 떼기) · b²+4ac 로 셈 에서 짓는다.
 * 방정식이 답인 꼴(13)은 `x^{2}-x-3=0` 을 통째로 내고 합·곱의 부호를 바꾼 방정식을 오답으로 둔다.
 *
 * ## ⑵ 문장 정답은 수로 묻는다
 *
 * 06(계수가 문자인 이차방정식의 근의 판별)의 대표문제 답은 「서로 다른 두 허근」 같은 문장이다.
 * 우리 정답은 수식 한 덩어리여야 하므로(`highRegistry`) **판별식의 값·최댓값**을 묻는다 — 해설
 * 끝 줄에서 판별 결과를 같이 말한다. 문장 정답 형식이 생기면 옮길 자리다(보고서).
 *
 * ## ⑶ `|…|` 와 단위 뒤에는 조사를 두지 않는다 (복소수 모듈 머리말 ⑶ 과 같다)
 *
 * 04(활용)는 그림 없이 말로 성립하는 상황만 쓴다(길 · 상자 · 가격) — 그림이 있어야 하는 꼴은 없다.
 *
 * ## 우리 단원(시드 공통수학1 「2. 방정식과 부등식」)
 *
 *   01·02·04 → 이차방정식 · 03 → 절댓값(가우스) 기호를 포함한 방정식
 *   · 05·06·07·15 → 이차방정식의 판별식 · 08~12·17 → 이차방정식의 근과 계수의 관계
 *   · 13·14·16 → 이차방정식의 식 구하기(방정식을 다시 짓는 유형 — 제목이 가리키는 쪽, §1-6).
 *
 * RPM 원본은 구조만 봤다(`.rpm-src/22/`). 본문·수치를 옮기지 않는다(저작권).
 */
import type { Difficulty } from "@/contracts/difficulty";

import type { Rng } from "../elementary/types";

import { eul, eun, ga, ira, ro } from "./josa";
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
  cConj,
  cplx,
  cTex,
  gcd,
  q,
  qAdd,
  qDiv,
  qMul,
  qSub,
  qTex,
  surd,
  surdPmTex,
  surdTex,
  type Q,
} from "./numbers";
import { factorParen, factorTex, linTex, paren, polyTex, term } from "./poly";
import type { HighHold, HighProblem, HighTypeEntry } from "./types";

const GRADE = "공통수학1";
const BOOK = "공통수학1";
const MINOR = "이차방정식";

/** 우리 `Unit.section` 정확한 이름 (prisma/seed-data/units.ts 공통수학1 2. 방정식과 부등식). */
const SEC = {
  풀이: "이차방정식",
  절댓값: "절댓값(가우스) 기호를 포함한 방정식",
  판별식: "이차방정식의 판별식",
  근계수: "이차방정식의 근과 계수의 관계",
  식구하기: "이차방정식의 식 구하기",
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

const coef = coefPrefix;

/**
 * 유리수 정답 — 0 이면 다시 뽑는다(공용 오답 경로가 0 에서 넷을 못 낸다).
 * 공용 후보: `pick.numAnswer` 옆 — 복소수 모듈에도 같은 판이 있다.
 */
function qAnswer(x: Q): string {
  if (x.n === 0) throw new Retry("정답이 0 이라 객관식 오답을 못 만든다");
  return $(qTex(x));
}

/** 이어 붙이는 항 — `+2(k-1)` · `-x`. 계수 ±1 은 숫자를 안 쓴다. */
function sgnTerm(k: number, body: string): string {
  const abs = Math.abs(k);
  return `${k < 0 ? "-" : "+"}${abs === 1 ? "" : abs}${body}`;
}

/** `sgnTerm` 인데 계수 0 이면 아무것도 안 쓴다. */
const termIf = (k: number, body: string): string =>
  k === 0 ? "" : sgnTerm(k, body);

/** 근을 늘어놓은 합 — 0 은 맨 앞에(`+0` 은 지면 냄새). */
function sumTex(xs: readonly number[]): string {
  const ordered = [...xs].sort((a, b) => Number(b === 0) - Number(a === 0));
  return ordered.map((x, i) => (i === 0 ? String(x) : `+${paren(x)}`)).join("");
}

/** $(v-u)(v-w)\cdots$ — 근이 0 이면 문자만 앞에 둔다. */
function prodTex(roots: readonly number[], v = "x"): string {
  return [...roots]
    .sort((a, b) => Number(b === 0) - Number(a === 0))
    .map((r) => factorParen(r, v))
    .join("");
}

/** `\dfrac{a\pm\sqrt{r}}{d}` — 근호가 풀려 버리면(제곱수) `null`. */
function pm(a: number, r: number, d: number): string | null {
  if (r === 0) return null;
  const s = surd(a, 1, r, d);
  return s.b === 0 ? null : surdPmTex(s);
}

const notNull = <T>(x: T | null): x is T => x !== null;

const isSquare = (n: number): boolean =>
  n >= 0 && Number.isInteger(Math.sqrt(n));

/** 「$x=a$ 또는 $x=b$」 */
const orList = (xs: readonly (number | string)[], v = "x"): string =>
  xs.map((x) => `$${v}=${x}$`).join(" 또는 ");

// ───────────────────────────── 01 ─────────────────────────────
// 이차방정식의 풀이 (표: 중하1 중1 상중1)
// 꼴 0 (기본·대표): (x+p)(x+q)=(식) 을 정리해 근의 공식 — 답이 ± 한 덩어리(오답 넷)
// 꼴 1 (기본): 해가 (a±√b i)/2A 꼴일 때 a+b
// 꼴 2 (응용): 정의된 연산으로 세운 이차방정식의 모든 실근의 합·곱
// 꼴 3 (심화하): 계수에 근호가 있는 이차방정식 — 양변을 나눠 인수분해

type Zs = readonly [number, number];

function t01(rng: Rng): Body {
  const mode = randInt(rng, 0, 3);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const A = pickOne(rng, [1, 2, 3]);
      const B = randInt(rng, -8, 8);
      const Cc = nz(rng, -9, 9);
      const D = B * B - 4 * A * Cc;
      if (D === 0 || isSquare(D)) return null;
      const p = nz(rng, -5, 5);
      const qq = nz(rng, -5, 5);
      const lhsP = [p * qq, p + qq, 1];
      const rhsP = [lhsP[0]! - Cc, lhsP[1]! - B, 1 - A];
      const ans = pm(-B, D, 2 * A)!;
      const ds = pickDistractors(
        rng,
        ans,
        [
          pm(B, D, 2 * A),
          pm(-B, D, A),
          pm(-B, -D, 2 * A),
          pm(B, -D, 2 * A),
          pm(-B, B * B + 4 * A * Cc, 2 * A),
        ].filter(notNull),
      );
      if (ds === null) return null;
      const eqT = `${factorParen(-p)}${factorParen(-qq)}=${polyTex(rhsP)}`;
      const top = B === 0 ? "" : String(-B);
      return {
        content: `이차방정식 $${eqT}$의 해를 구하시오.`,
        answer: $(ans),
        solution: [
          `주어진 방정식을 정리하면 $${polyTex([Cc, B, A])}=0$`,
          `근의 공식에 의하여 $x=\\dfrac{${top}\\pm\\sqrt{${paren(B)}^{2}-4\\times ${A}\\times ${paren(Cc)}}}{2\\times ${A}}=\\dfrac{${top}\\pm\\sqrt{${D}}}{${2 * A}}$`,
          `따라서 $x=${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, A, B, C: Cc },
        distractors: ds,
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const A = pickOne(rng, [2, 3]);
      const B = nz(rng, -9, 9);
      const Cc = nz(rng, -9, 9);
      const D = B * B - 4 * A * Cc;
      if (D === 0 || (D > 0 && isSquare(D))) return null;
      const imag = D < 0;
      const rad = imag ? "\\sqrt{b}i" : "\\sqrt{b}";
      const form = `x=\\dfrac{a\\pm${rad}}{${2 * A}}`;
      const value = -B + Math.abs(D);
      return {
        content: `이차방정식 $${polyTex([Cc, B, A])}=0$의 해가 $${form}$일 때, 유리수 $a$, $b$에 대하여 $a+b$의 값을 구하시오.`,
        answer: numAnswer(value),
        solution: [
          `근의 공식에 의하여 $x=\\dfrac{${-B}\\pm\\sqrt{${paren(B)}^{2}-4\\times ${A}\\times ${paren(Cc)}}}{2\\times ${A}}=\\dfrac{${-B}\\pm${imag ? `\\sqrt{${-D}}i` : `\\sqrt{${D}}`}}{${2 * A}}$`,
          `따라서 $a=${-B}$, $b=${Math.abs(D)}$이므로 $a+b=${value}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, A, B, C: Cc },
      };
    });
  if (mode === 2)
    return attempt<Body>((): Body | null => {
      const al = pickOne(rng, [1, 2]);
      const c = nz(rng, -3, 3);
      const [r1, r2] = distinctInts(rng, -5, 5, 2) as [number, number];
      const be = nz(rng, -3, 3);
      const gm = al * c - al * (r1 + r2);
      const K = -gm * c - al * r1 * r2;
      const ask = randInt(rng, 0, 1);
      const def = linTex([
        [al, "ab"],
        [be, "a"],
        [gm, "b"],
      ]);
      const eq = `(x\\odot x)-(x\\odot ${paren(c)})=${K}`;
      const fin = [al * r1 * r2, -al * (r1 + r2), al];
      const [lo, hi] = [Math.min(r1, r2), Math.max(r1, r2)];
      const value = ask === 0 ? r1 + r2 : r1 * r2;
      return {
        content: `두 실수 $a$, $b$에 대하여 $a\\odot b=${def}$${ira(def)} 할 때, $${eq}$${eul(eq)} 만족시키는 모든 실수 $x$의 값의 ${ask === 0 ? "합" : "곱"}을 구하시오.`,
        answer: numAnswer(value),
        solution: [
          `$x\\odot x=${linTex([
            [al, "x^{2}"],
            [be + gm, "x"],
          ])}$, $x\\odot ${paren(c)}=${linTex([[al * c + be, "x"]], gm * c)}$이므로`,
          // 우변이 0 이면 「…=0, 즉 …=0」 이 같은 식을 두 번 찍는다(미리보기에서 봄).
          K === 0
            ? `주어진 등식은 $${polyTex(fin)}=0$`
            : `주어진 등식은 $${polyTex([-gm * c, gm - al * c, al])}=${K}$, 즉 $${polyTex(fin)}=0$`,
          `$${coef(al)}${prodTex([r1, r2])}=0$이므로 ${orList([lo, hi])}`,
          `따라서 모든 실수 $x$의 값의 ${ask === 0 ? `합은 $${sumTex([lo, hi])}` : `곱은 $${lo}\\times ${paren(hi)}`}=${value}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, al, be, gm, c, K, ask },
      };
    });
  return attempt<Body>((): Body | null => {
    const m = pickOne(rng, [2, 3, 5]);
    const t = pickOne(rng, [1, 2]);
    const [p1, p2] = distinctInts(rng, -3, 3, 2) as [number, number];
    const mulZ = (x: Zs, y: Zs): Zs => [
      x[0] * y[0] + m * x[1] * y[1],
      x[0] * y[1] + x[1] * y[0],
    ];
    const L: Zs = [-t, 1];
    const negSum: Zs = [-(p1 + p2), -2];
    const prodUV: Zs = [p1 * p2 + m, p1 + p2];
    const B = mulZ(negSum, L);
    const Cz = mulZ(prodUV, L);
    const zt = (z: Zs): string => surdTex(surd(z[0], z[1], m));
    /** 무리수 계수의 항 — 두 부분이 다 있으면 괄호. */
    const zTerm = (z: Zs, body: string): string => {
      if (z[1] === 0) return termIf(z[0], body);
      if (z[0] === 0) return sgnTerm(z[1], `\\sqrt{${m}}${body}`);
      if (z[0] < 0 && z[1] < 0) return `-(${zt([-z[0], -z[1]])})${body}`;
      return `+(${zt(z)})${body}`;
    };
    const zConst = (z: Zs): string =>
      z[1] === 0 ? plusConst(z[0]) : withSign(zt(z));
    const eq = `(${zt(L)})x^{2}${zTerm(B, "x")}${zConst(Cz)}=0`;
    const u = zt([p1, 1]);
    const v = zt([p2, 1]);
    const [hiT, loT] = p1 > p2 ? [u, v] : [v, u];
    const value = Math.abs(p1 - p2);
    const Lt = zt(L);
    return {
      content: `이차방정식 $${eq}$의 두 근을 $\\alpha$, $\\beta$${ira("\\beta")} 할 때, $\\alpha-\\beta$의 값을 구하시오. (단, $\\alpha>\\beta$)`,
      answer: numAnswer(value),
      solution: [
        `양변을 $${Lt}$${ro(Lt)} 나누면 $x^{2}${zTerm(negSum, "x")}${zConst(prodUV)}=0$`,
        `즉 $\\{x-(${u})\\}\\{x-(${v})\\}=0$이므로 $x=${u}$ 또는 $x=${v}$`,
        `$\\alpha>\\beta$이므로 $\\alpha=${hiT}$, $\\beta=${loT}$`,
        `따라서 $\\alpha-\\beta=${value}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, m, t, p1, p2 },
    };
  });
}

// ───────────────────────────── 02 ─────────────────────────────
// 한 근이 주어진 이차방정식 (표: 중하1 중1 상중1)
// 꼴 0 (기본·대표): k 에 관계없이 x=r 을 근으로 → k 에 대한 항등식
// 꼴 1 (기본): 한 근을 대입해 k, 다른 근 α
// 꼴 2 (응용): 상수항에 근호가 있고 한 근이 p+√m → a
// 꼴 3 (심화하): 한 근 α 로 α±1/α 를 얻어 거듭제곱 합

function t02(rng: Rng): Body {
  const mode = randInt(rng, 0, 3);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const r = nz(rng, -3, 3);
      const m = nz(rng, -3, 3);
      const b = -r * r;
      const a = m * r;
      const ask = randInt(rng, 0, 2);
      const [et, ev] = (
        [
          ["a-b", a - b],
          ["a+b", a + b],
          ["ab", a * b],
        ] as const
      )[ask]!;
      const eq = `kx^{2}+ax+(k${plusConst(m)})b=0`;
      const root = `x=${r}`;
      const c1 = linTex([[1, "b"]], r * r);
      const c0 = linTex([
        [r, "a"],
        [m, "b"],
      ]);
      return {
        content: `$x$에 대한 방정식 $${eq}$${ga(eq)} 실수 $k$의 값에 관계없이 $${root}$${eul(root)} 근으로 가질 때, 실수 $a$, $b$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `$${root}$${eul(root)} 대입하면 $${coef(r * r)}k${sgnTerm(r, "a")}+(k${plusConst(m)})b=0$`,
          `$k$에 대하여 정리하면 $(${c1})k${withSign(c0)}=0$`,
          `이 등식이 $k$에 대한 항등식이므로 $${c1}=0$, $${c0}=0$`,
          `따라서 $b=${b}$, $a=${a}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, r, m, ask },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const r = nz(rng, -4, 4);
      const al = nz(rng, -6, 6);
      if (al === r) return null;
      const qd = pickOne(rng, [-3, -2, -1, 1, 2, 3]);
      if ((r * al) % qd !== 0 || r + qd === 0) return null;
      const k = (r * al) / qd;
      if (k === 0) return null;
      const p = -(r + al) - k;
      const kx = p === 0 ? "k" : `(k${plusConst(p)})`;
      const eq = `x^{2}+${kx}x${sgnTerm(qd, "k")}=0`;
      return {
        content: `이차방정식 $${eq}$의 두 근이 $${r}$, $\\alpha$일 때, 실수 $k$, $\\alpha$에 대하여 $k+\\alpha$의 값을 구하시오.`,
        answer: numAnswer(k + al),
        solution: [
          `$x=${r}$${ga(`x=${r}`)} 근이므로 대입하면 $${r * r}${sgnTerm(r, kx)}${sgnTerm(qd, "k")}=0$`,
          `$${linTex([[r + qd, "k"]], r * r + p * r)}=0$이므로 $k=${k}$`,
          `$k=${k}$${eul(String(k))} 주어진 방정식에 대입하면 $${polyTex([qd * k, k + p, 1])}=0$, $${prodTex([r, al])}=0$`,
          `따라서 다른 한 근은 $${al}$이므로 $\\alpha=${al}$이고 $k+\\alpha=${k + al}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, r, p, qd },
      };
    });
  if (mode === 2)
    return attempt<Body>((): Body | null => {
      const p = nz(rng, -3, 3);
      const m = pickOne(rng, [2, 3, 5, 6, 7]);
      const a = nz(rng, -6, 6);
      if (a === 2 * p) return null;
      const c0 = p * (a - p) - m;
      const c1 = a - 2 * p;
      const cT = surdTex(surd(c0, c1, m));
      const u = surdTex(surd(p, 1, m));
      const eq = `x^{2}-ax${withSign(cT)}=0`;
      return {
        content: `이차방정식 $${eq}$의 한 근이 $${u}$일 때, 실수 $a$의 값을 구하시오.`,
        answer: numAnswer(a),
        solution: [
          `$x=${u}$${eul(u)} 대입하면 $(${u})^{2}-a(${u})${withSign(cT)}=0$`,
          `$(${u})^{2}=${surdTex(surd(p * p + m, 2 * p, m))}$이므로 $a(${u})=${surdTex(surd(p * p + m + c0, 2 * p + c1, m))}$`,
          `따라서 $a=${a}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, p, m, c0, c1 },
      };
    });
  return attempt<Body>((): Body | null => {
    const s = pickOne(rng, [1, -1]);
    const p = nz(rng, -4, 4);
    const ask = randInt(rng, 0, 1);
    const inv = s > 0 ? "+" : "-";
    const expr =
      ask === 0
        ? `\\alpha^{3}${inv}\\dfrac{1}{\\alpha^{3}}`
        : "\\alpha^{2}+\\dfrac{1}{\\alpha^{2}}";
    const value = ask === 0 ? p ** 3 - 3 * s * p : p * p - 2 * s;
    const grp = `\\left(\\alpha${inv}\\dfrac{1}{\\alpha}\\right)`;
    const how =
      ask === 0
        ? `${grp}^{3}${s > 0 ? "-" : "+"}3${grp}=${paren(p)}^{3}${s > 0 ? "-" : "+"}3\\times ${paren(p)}`
        : `${grp}^{2}${s > 0 ? "-" : "+"}2=${paren(p)}^{2}${s > 0 ? "-" : "+"}2`;
    // α+1/α=p 이면 α²−pα+1=0, α−1/α=p 이면 α²−pα−1=0 — 상수항이 s 다.
    const eq = polyTex([s, -p, 1]);
    return {
      content: `이차방정식 $${eq}=0$의 한 근을 $\\alpha$${ira("\\alpha")} 할 때, $${expr}$의 값을 구하시오.`,
      answer: numAnswer(value),
      solution: [
        `$\\alpha$${ga("\\alpha")} 근이므로 $${polyTex([s, -p, 1], "\\alpha")}=0$`,
        `$\\alpha\\ne 0$이므로 양변을 $\\alpha$${ro("\\alpha")} 나누면 $\\alpha${term(-p, "")}${inv}\\dfrac{1}{\\alpha}=0$, 즉 $\\alpha${inv}\\dfrac{1}{\\alpha}=${p}$`,
        `따라서 $${expr}=${how}=${value}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, s, p, ask },
    };
  });
}

// ───────────────────────────── 03 ─────────────────────────────
// 절댓값 기호를 포함한 이차방정식 (표: 중2 상중1)
// 꼴 0 (기본·대표): x²+s|x−c|+t=0 — c 를 기준으로 나눠 풀고 범위 밖 근을 버린다 → 모든 근의 합
// 꼴 1 (응용): |x²+px|=q → x²+px=±q · 실근이 없는 쪽은 버린다 → 모든 실근의 곱
// 꼴 2 (응용): x²−a|x|−b=0 → 음수·양수 범위의 근 하나씩 → 모든 근의 곱(오답 넷)
// 식 뒤에 조사를 두지 않는다 — `|…|` 로 끝나는 수식은 조사를 못 고른다(머리말 ⑶).

function t03(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const s = pickOne(rng, [-3, -2, -1, 1, 2, 3]);
      const r1 = randInt(rng, -6, 6);
      const r2 = -s - r1;
      const q1 = randInt(rng, -6, 6);
      const q2 = s - q1;
      if (r1 === r2 || q1 === q2) return null;
      const num = q1 * q2 - r1 * r2;
      if (num % (2 * s) !== 0) return null;
      const c = num / (2 * s);
      const t = r1 * r2 + s * c;
      const hi = [r1, r2].filter((x) => x >= c).sort((a, b) => a - b);
      const lo = [q1, q2].filter((x) => x < c).sort((a, b) => a - b);
      const all = [...lo, ...hi];
      // 버려지는 근이 하나도 없으면 범위를 나누는 까닭이 지면에서 사라진다.
      if (all.length === 0 || all.length === 4) return null;
      const sum = all.reduce((a, b) => a + b, 0);
      const xc = c === 0 ? "x" : `(x${plusConst(-c)})`;
      const eq = `x^{2}${sgnTerm(s, `|x${plusConst(-c)}|`)}${plusConst(t)}=0`;
      const keep = (xs: readonly number[], cond: string): string =>
        xs.length === 0
          ? `이 범위에는 근이 없다.`
          : `$${cond}$이므로 ${orList(xs)}`;
      return {
        content: `방정식 $${eq}$의 모든 근의 합을 구하시오.`,
        answer: numAnswer(sum),
        solution: [
          `$x<${c}$일 때, $x^{2}${sgnTerm(-s, xc)}${plusConst(t)}=0$에서 $${polyTex([q1 * q2, -s, 1])}=0$, $${prodTex([q1, q2])}=0$`,
          keep(lo, `x<${c}`),
          `$x\\ge ${c}$일 때, $x^{2}${sgnTerm(s, xc)}${plusConst(t)}=0$에서 $${polyTex([r1 * r2, s, 1])}=0$, $${prodTex([r1, r2])}=0$`,
          keep(hi, `x\\ge ${c}`),
          `따라서 모든 근의 합은 $${sumTex(all)}=${sum}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, s, c, t },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const [r1, r2] = distinctInts(rng, -7, 7, 2, { nonzero: true }) as [
        number,
        number,
      ];
      if (r1 * r2 >= 0) return null;
      const p = -(r1 + r2);
      if (p === 0) return null;
      const qv = -r1 * r2;
      const D = p * p - 4 * qv;
      if (D === 0) return null;
      const lin = polyTex([0, p, 1]);
      const second = polyTex([qv, p, 1]);
      const [lo, hi] = [Math.min(r1, r2), Math.max(r1, r2)];
      const value = D < 0 ? r1 * r2 : -qv * qv;
      const lines = [
        `주어진 방정식에서 $${lin}=${qv}$ 또는 $${lin}=${-qv}$`,
        `$${lin}=${qv}$일 때, $${polyTex([-qv, p, 1])}=0$, $${prodTex([r1, r2])}=0$이므로 ${orList([lo, hi])}`,
      ];
      if (D < 0) {
        lines.push(
          `$${lin}=${-qv}$일 때, $${second}=0$의 판별식을 $D$${ira("D")} 하면 $D=${paren(p)}^{2}-4\\times ${qv}=${D}<0$이므로 실근이 없다.`,
          `따라서 모든 실근의 곱은 $${lo}\\times ${paren(hi)}=${value}$`,
        );
      } else {
        if (isSquare(D)) {
          const w = Math.sqrt(D);
          const s1 = (-p - w) / 2;
          const s2 = (-p + w) / 2;
          lines.push(
            `$${lin}=${-qv}$일 때, $${second}=0$, $${prodTex([s1, s2])}=0$이므로 ${orList([s1, s2])}이고 이 두 근의 곱은 $${qv}$이다.`,
          );
        } else {
          lines.push(
            `$${lin}=${-qv}$일 때, $${second}=0$에서 $x=${pm(-p, D, 2)}$이고 이 두 근의 곱은 $\\dfrac{${p * p}-${D}}{4}=${qv}$이다.`,
          );
        }
        lines.push(
          `따라서 모든 실근의 곱은 $${lo}\\times ${paren(hi)}\\times ${qv}=${value}$`,
        );
      }
      return {
        content: `방정식 $|${lin}|=${qv}$의 모든 실근의 곱을 구하시오.`,
        answer: numAnswer(value),
        solution: lines.join("\n"),
        difficulty: "응용",
        facts: { mode, p, q: qv },
      };
    });
  return attempt<Body>((): Body | null => {
    const a = pickOne(rng, [-4, -3, -2, -1, 1, 2, 3, 4]);
    const b = randInt(rng, 1, 6);
    const D = a * a + 4 * b;
    const ans = surdTex(surd(-(a * a + 2 * b), -a, D, 2));
    const pos = surdTex(surd(a, 1, D, 2));
    const negRoot = surdTex(surd(-a, -1, D, 2));
    const ds = pickDistractors(rng, ans, [
      String(-b),
      surdTex(surd(a * a + 2 * b, a, D, 2)),
      surdTex(surd(-(a * a + 2 * b), a, D, 2)),
      String(b * b),
    ]);
    if (ds === null) return null;
    const eq = `x^{2}${sgnTerm(-a, "|x|")}${plusConst(-b)}=0`;
    const rootsTex = (B: number): string => {
      if (!isSquare(D)) return `$x=${pm(-B, D, 2)}$`;
      const w = Math.sqrt(D);
      return orList([(-B - w) / 2, (-B + w) / 2]);
    };
    return {
      content: `방정식 $${eq}$의 모든 근의 곱을 구하시오.`,
      answer: $(ans),
      solution: [
        `$x<0$일 때, $${polyTex([-b, a, 1])}=0$에서 ${rootsTex(a)}이고 $x<0$이므로 $x=${negRoot}$`,
        `$x\\ge 0$일 때, $${polyTex([-b, -a, 1])}=0$에서 ${rootsTex(-a)}이고 $x\\ge 0$이므로 $x=${pos}$`,
        `따라서 모든 근의 곱은 $\\left(${pos}\\right)\\left(${negRoot}\\right)=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, a, b },
      distractors: ds,
    };
  });
}

// ───────────────────────────── 04 ─────────────────────────────
// 이차방정식의 활용 (표: 중1 상중1) — 그림 없이 말로 성립하는 상황만
// 꼴 0 (기본·대표): 직사각형 땅에 가로·세로 길을 하나씩 → 남은 넓이 (a−x)(b−x)
// 꼴 1 (응용): 종이 네 모퉁이를 잘라 만든 상자의 부피 → 처음 종이의 넓이
// 꼴 2 (심화하): 가격을 x% 올리고 내리기(또는 판매량이 2x% 줄기) → x
// 단위 뒤에는 조사를 두지 않는다 — `\mathrm{m}` 을 「엠」으로 읽어 「미터」의 조사가 틀린다(머리말 ⑶).

function t04(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  const M_ = "\\,\\mathrm{m}";
  const CM = "\\,\\mathrm{cm}";
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const a = randInt(rng, 12, 30);
      const b = randInt(rng, 8, 24);
      const x = randInt(rng, 1, Math.min(a, b) - 2);
      const S = (a - x) * (b - x);
      const other = a + b - x;
      return {
        content: `가로, 세로의 길이가 각각 $${a}${M_}$, $${b}${M_}$인 직사각형 모양의 땅에 폭이 일정한 길을 가로 방향과 세로 방향으로 하나씩 내려고 한다. 길을 제외한 땅의 넓이가 $${S}${M_}^{2}$일 때, 길의 폭은 몇 $\\mathrm{m}$인지 구하시오.`,
        answer: numAnswer(x),
        solution: [
          `길의 폭이 $x${M_}$일 때, 길을 제외한 땅을 한데 모으면 가로의 길이가 $(${a}-x)${M_}$, 세로의 길이가 $(${b}-x)${M_}$인 직사각형이 되므로`,
          `$(${a}-x)(${b}-x)=${S}$, $${polyTex([a * b - S, -(a + b), 1])}=0$`,
          `$${prodTex([x, other])}=0$이므로 ${orList([x, other])}`,
          `그런데 $0<x<${Math.min(a, b)}$이므로 길의 폭은 $${x}${M_}$이다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, a, b, S },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const k = pickOne(rng, [2, 3]);
      const s = pickOne(rng, [1, 2, 3]);
      const L = randInt(rng, 2 * s + 2, 2 * s + 12);
      const V = s * (k * L - 2 * s) * (L - 2 * s);
      const B1 = -2 * s * (k + 1);
      const C1 = 4 * s * s - V / s;
      const Mv = 2 * s * (k + 1) - k * L;
      const area = k * L * L;
      return {
        content: `가로의 길이가 세로의 길이의 $${k}$배인 직사각형 모양의 종이가 있다. 이 종이의 네 모퉁이에서 한 변의 길이가 $${s}${CM}$인 정사각형을 잘라 내고 남은 부분을 접어 부피가 $${V}${CM}^{3}$인 뚜껑이 없는 직육면체 모양의 상자를 만들었다. 처음 종이의 넓이는 몇 $\\mathrm{cm}^{2}$인지 구하시오. (단, 종이의 두께는 생각하지 않는다.)`,
        answer: numAnswer(area),
        solution: [
          `종이의 세로의 길이가 $x${CM}$일 때 가로의 길이는 $${k}x${CM}$이고, 상자의 밑면은 가로 $(${k}x-${2 * s})${CM}$, 세로 $(x-${2 * s})${CM}$, 높이는 $${s}${CM}$이므로`,
          `$${coef(s)}(${k}x-${2 * s})(x-${2 * s})=${V}$`,
          `${s === 1 ? "" : `양변을 $${s}$${ro(String(s))} 나누어 `}정리하면 $${polyTex([C1, B1, k])}=0$, $(x-${L})(${polyTex([-Mv, k])})=0$`,
          `$x=${L}$ 또는 $x=${qTex(q(Mv, k))}$이고 $x>${2 * s}$이므로 $x=${L}$`,
          `따라서 처음 종이의 넓이는 $${k * L}\\times ${L}=${area}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, k, s, V },
      };
    });
  return attempt<Body>((): Body | null => {
    const variant = randInt(rng, 0, 1);
    const PCT = "\\,\\%";
    if (variant === 0) {
      const x = pickOne(rng, [10, 20, 30, 40, 50]);
      const p = (x * x) / 100;
      return {
        content: `어떤 물건의 가격을 $x${PCT}$ 인상한 후 다시 $x${PCT}$ 인하하였더니 처음 가격보다 $${p}${PCT}$ 낮아졌다. 이때 $x$의 값을 구하시오. (단, $x>0$)`,
        answer: numAnswer(x),
        solution: [
          `처음 가격을 $a$${ira("a")} 하면 $a\\left(1+\\dfrac{x}{100}\\right)\\left(1-\\dfrac{x}{100}\\right)=a\\left(1-\\dfrac{${p}}{100}\\right)$`,
          `$1-\\dfrac{x^{2}}{10000}=1-\\dfrac{${p}}{100}$이므로 $x^{2}=${100 * p}$`,
          `$x>0$이므로 $x=${x}$`,
        ].join("\n"),
        difficulty: "심화하",
        facts: { mode, variant, p },
      };
    }
    const x = pickOne(rng, [10, 20, 30]);
    const p = (x * x + 50 * x) / 50;
    return {
      content: `어떤 물건의 가격을 $x${PCT}$ 올렸더니 판매량이 $2x${PCT}$ 줄어 판매 금액이 처음보다 $${p}${PCT}$ 줄었다. 이때 $x$의 값을 구하시오. (단, $0<x<50$)`,
      answer: numAnswer(x),
      solution: [
        `처음 가격을 $a$, 판매량을 $b$${ira("b")} 하면 $a\\left(1+\\dfrac{x}{100}\\right)\\times b\\left(1-\\dfrac{2x}{100}\\right)=ab\\left(1-\\dfrac{${p}}{100}\\right)$`,
        `양변을 $ab$${ro("ab")} 나누고 $10000$${eul("10000")} 곱하면 $(100+x)(100-2x)=100(100-${p})$`,
        `$x^{2}+50x-${50 * p}=0$, $(x-${x})(x+${x + 50})=0$`,
        `$0<x<50$이므로 $x=${x}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, variant, p },
    };
  });
}

// ───────────────────────────── 05 ─────────────────────────────
// 이차방정식의 근의 판별 (표: 중2 상중1)
// 꼴 0 (기본·대표): x²+bx+k+c=0 이 두 실근·두 허근·실근 → 가장 큰(작은) 정수 k
// 꼴 1 (응용): (m²+A)x²+2(m+B)x+1=0 이 두 허근 → 자연수 m 의 개수
// 꼴 2 (응용): (x−p)²−k(2x−q)+r=0 이 중근 → 모든 k 의 합
// 꼴 3 (심화하): k 에 관계없이 늘 중근 → k 에 대한 항등식

/** 자연수 1..n 늘어놓기 — 많으면 줄임표. */
function naturals(n: number): string {
  if (n <= 3)
    return Array.from({ length: n }, (_, i) => `$${i + 1}$`).join(", ");
  return `$1$, $2$, $\\cdots$, $${n}$`;
}

function t05(rng: Rng): Body {
  const mode = randInt(rng, 0, 3);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const b = nz(rng, -7, 7);
      const c = randInt(rng, -5, 5);
      const kind = randInt(rng, 0, 2);
      const bound = q(b * b - 4 * c, 4);
      const fl = Math.floor(bound.n / bound.d);
      const ans =
        kind === 0 ? (bound.d === 1 ? fl - 1 : fl) : kind === 1 ? fl + 1 : fl;
      const eq = `x^{2}${term(b, "x")}+k${plusConst(c)}=0`;
      const cond = ["서로 다른 두 실근", "서로 다른 두 허근", "실근"][kind]!;
      const big = kind === 1 ? "작은" : "큰";
      const rel = [">", "<", "\\ge"][kind]!;
      const relK = ["<", ">", "\\le"][kind]!;
      const Dk = linTex([[-4, "k"]], b * b - 4 * c);
      const kc = c === 0 ? "k" : `(k${plusConst(c)})`;
      return {
        content: `이차방정식 $${eq}$${ga(eq)} ${cond}을 갖도록 하는 가장 ${big} 정수 $k$의 값을 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `판별식을 $D$${ira("D")} 하면 $D=${paren(b)}^{2}-4\\times 1\\times ${kc}=${Dk}$`,
          `${cond}을 가지려면 $D${rel}0$이므로 $${Dk}${rel}0$, $k${relK}${qTex(bound)}$`,
          `따라서 가장 ${big} 정수 $k$의 값은 $${ans}$이다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, b, c, kind },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const B = pickOne(rng, [1, 2, 3]);
      const A = randInt(rng, B * B + 2 * B + 1, B * B + 18 * B);
      const bound = q(A - B * B, 2 * B);
      const count = bound.d === 1 ? bound.n - 1 : Math.floor(bound.n / bound.d);
      if (count < 1 || count > 9) return null;
      const eq = `(m^{2}+${A})x^{2}+2(m+${B})x+1=0`;
      return {
        content: `$x$에 대한 이차방정식 $${eq}$${ga(eq)} 서로 다른 두 허근을 갖도록 하는 자연수 $m$의 개수를 구하시오.`,
        answer: numAnswer(count),
        solution: [
          `판별식을 $D$${ira("D")} 하면 $\\dfrac{D}{4}=(m+${B})^{2}-(m^{2}+${A})<0$`,
          `$${linTex([[2 * B, "m"]], B * B - A)}<0$이므로 $m<${qTex(bound)}$`,
          `따라서 자연수 $m$${eun("m")} ${naturals(count)}의 $${count}$개이다.`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, A, B },
      };
    });
  if (mode === 2)
    return attempt<Body>((): Body | null => {
      const p = nz(rng, -3, 3);
      const [k1, k2] = distinctInts(rng, -5, 5, 2) as [number, number];
      const qq = 2 * p + k1 + k2;
      if (qq === 0) return null;
      const r = -k1 * k2;
      const eq = `(x${plusConst(-p)})^{2}-k(2x${plusConst(-qq)})${plusConst(r)}=0`;
      const cst = linTex([[qq, "k"]], p * p + r);
      const [lo, hi] = [Math.min(k1, k2), Math.max(k1, k2)];
      return {
        content: `이차방정식 $${eq}$${ga(eq)} 중근을 갖도록 하는 모든 실수 $k$의 값의 합을 구하시오.`,
        answer: numAnswer(k1 + k2),
        solution: [
          `주어진 방정식을 정리하면 $x^{2}-2(k${plusConst(p)})x${withSign(cst)}=0$`,
          `판별식을 $D$${ira("D")} 하면 $\\dfrac{D}{4}=(k${plusConst(p)})^{2}-(${cst})=0$`,
          `$${polyTex([k1 * k2, -(k1 + k2), 1], "k")}=0$, $${prodTex([k1, k2], "k")}=0$이므로 ${orList([lo, hi], "k")}`,
          `따라서 모든 실수 $k$의 값의 합은 $${sumTex([lo, hi])}=${k1 + k2}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, p, q: qq, r },
      };
    });
  return attempt<Body>((): Body | null => {
    const a = nz(rng, -4, 4);
    const c = -2 * a;
    const b = a * a;
    const ask = randInt(rng, 0, 1);
    const [et, ev] = ask === 0 ? ["a+b", a + b] : ["ab", a * b];
    const eq = `x^{2}-2(k-a)x+(k^{2}${term(c, "k")}+b)=0`;
    const lin = linTex([[-2, "a"]], -c);
    return {
      content: `$x$에 대한 이차방정식 $${eq}$${ga(eq)} 실수 $k$의 값에 관계없이 항상 중근을 가질 때, 실수 $a$, $b$에 대하여 $${et}$의 값을 구하시오.`,
      answer: numAnswer(ev),
      solution: [
        `판별식을 $D$${ira("D")} 하면 $\\dfrac{D}{4}=(k-a)^{2}-(k^{2}${term(c, "k")}+b)=0$`,
        `$(${lin})k+a^{2}-b=0$`,
        `이 등식이 $k$의 값에 관계없이 항상 성립하므로 $${lin}=0$, $a^{2}-b=0$`,
        `따라서 $a=${a}$, $b=${b}$이므로 $${et}=${ev}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, c, ask },
    };
  });
}

// ───────────────────────────── 06 ─────────────────────────────
// 계수가 문자인 이차방정식의 근의 판별 (표: 중2)
// 대표문제의 답은 「서로 다른 두 허근」 같은 문장 — 판별식의 값을 묻고 판별은 해설 끝에서 말한다(머리말 ⑵)
// 꼴 0 (기본): 앞 방정식이 중근 → a → 뒤 방정식의 판별식 D 의 값
// 꼴 1 (응용): 앞 방정식이 두 허근(실근) → a 의 범위 → 정수 a 에서 뒤 판별식의 최댓값(최솟값)

function t06(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const a1 = pickOne(rng, [2, 4, 6, 8]);
      const a2 = -4 - a1;
      const c = -(a1 * a2) / 4;
      const P = pickOne(rng, [1, 2, 3]);
      const Q = randInt(rng, -2, 3);
      const D2 = a1 * a1 - 4 * P * (a1 + Q);
      if (D2 === 0) return null;
      const e1 = `x^{2}+ax+${c}-a=0`;
      const e2 = `${coef(P)}x^{2}-ax+a${plusConst(Q)}=0`;
      const aq = Q === 0 ? "a" : `(a${plusConst(Q)})`;
      return {
        content: `이차방정식 $${e1}$${ga(e1)} 중근을 가질 때, 이차방정식 $${e2}$의 판별식 $D$의 값을 구하시오. (단, $a>0$)`,
        answer: numAnswer(D2),
        solution: [
          `$${e1}$의 판별식을 $D_{1}$${ira("D_{1}")} 하면 $D_{1}=a^{2}-4(${c}-a)=0$`,
          `$${polyTex([-4 * c, 4, 1], "a")}=0$, $${prodTex([a1, a2], "a")}=0$이고 $a>0$이므로 $a=${a1}$`,
          `이때 $${e2}$의 판별식은 $D=(-a)^{2}-4\\times ${P}\\times ${aq}$`,
          `따라서 $D=${a1 * a1}-${4 * P}\\times ${paren(a1 + Q)}=${D2}$이고, 이 이차방정식은 서로 다른 두 ${D2 > 0 ? "실근" : "허근"}을 갖는다.`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, c, P, Q },
      };
    });
  return attempt<Body>((): Body | null => {
    const p = nz(rng, -3, 3);
    const qv = nz(rng, -5, 5);
    const r = nz(rng, -4, 4);
    const imag = rng() < 0.5;
    const aEdge = imag ? -p * p - 1 : -p * p + 1;
    const Dedge = 4 * aEdge + qv * qv + 4 * r;
    // 판별이 정해지는 판만 — 끝값에서도 부호가 같아야 「근을 판별하시오」가 성립한다.
    if (imag ? Dedge >= 0 : Dedge <= 0) return null;
    const e1 = `x^{2}${term(2 * p, "x")}-a=0`;
    const e2 = `x^{2}${term(qv, "x")}-(a${plusConst(r)})=0`;
    const kind = imag ? "허근" : "실근";
    const ext = imag ? "최댓값" : "최솟값";
    return {
      content: `이차방정식 $${e1}$${ga(e1)} 서로 다른 두 ${kind}을 가질 때, 이차방정식 $${e2}$의 판별식을 $D$${ira("D")} 하자. 정수 $a$에 대하여 $D$의 ${ext}을 구하시오.`,
      answer: numAnswer(Dedge),
      solution: [
        `$${e1}$의 판별식을 $D_{1}$${ira("D_{1}")} 하면 $\\dfrac{D_{1}}{4}=${p * p}+a${imag ? "<" : ">"}0$이므로 $a${imag ? "<" : ">"}${-p * p}$`,
        `$D=${paren(qv)}^{2}+4(a${plusConst(r)})=4a${plusConst(qv * qv + 4 * r)}$`,
        `$a$${eun("a")} 정수이므로 $a${imag ? "\\le" : "\\ge"} ${aEdge}$이고 $D${imag ? "\\le" : "\\ge"} 4\\times ${paren(aEdge)}${plusConst(qv * qv + 4 * r)}=${Dedge}$`,
        `따라서 $D$의 ${ext}은 $${Dedge}$이고, 이때 이 이차방정식은 서로 다른 두 ${kind}을 갖는다.`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, p, q: qv, r, imag: imag ? 1 : 0 },
    };
  });
}

// ───────────────────────────── 07 ─────────────────────────────
// 이차식이 완전제곱식이 될 조건 (표: 중2)
// 꼴 0 (기본·대표): (k+a)x²+(2k+b)x+k+c 가 완전제곱식 → k (분수가 흔하다)
// 꼴 1 (응용): k 에 관계없이 늘 완전제곱식 → k 에 대한 항등식
// 꼴 2 (응용): x²−mx+Pm+Q 가 (x−n)² 으로 인수분해 → m+n

function t07(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const a = nz(rng, -3, 3);
      const b = nz(rng, -4, 4);
      const c = nz(rng, -3, 3);
      const den = 4 * (b - a - c);
      if (den === 0) return null;
      const k = q(4 * a * c - b * b, den);
      if (k.n === 0 || (k.n === -a && k.d === 1)) return null;
      const expr = `(k${plusConst(a)})x^{2}+(2k${plusConst(b)})x+k${plusConst(c)}`;
      return {
        content: `$x$에 대한 이차식 $${expr}$${ga(expr)} 완전제곱식이 되도록 하는 실수 $k$의 값을 구하시오.`,
        answer: qAnswer(k),
        solution: [
          `주어진 식이 $x$에 대한 이차식이므로 $k\\ne ${-a}$`,
          `이차방정식 $${expr}=0$의 판별식을 $D$${ira("D")} 하면 $D=(2k${plusConst(b)})^{2}-4(k${plusConst(a)})(k${plusConst(c)})=0$`,
          `$${linTex([[4 * (b - a - c), "k"]], b * b - 4 * a * c)}=0$`,
          `따라서 $k=${qTex(k)}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, a, b, c },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const p = nz(rng, -3, 3);
      const ask = randInt(rng, 0, 1);
      const [et, ev] = ask === 0 ? ["a+b", 1 + 2 * p] : ["ab", 2 * p];
      const cst = `k^{2}+bk${sgnTerm(p * p, "a")}`;
      const expr = `ax^{2}+2(k${plusConst(p)})x+${cst}`;
      const last = `${p * p}${sgnTerm(-p * p, "a^{2}")}`;
      return {
        content: `$x$에 대한 이차식 $${expr}$${ga(expr)} 실수 $k$의 값에 관계없이 항상 완전제곱식이 될 때, 실수 $a$, $b$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `주어진 식이 $x$에 대한 이차식이므로 $a\\ne 0$`,
          `이차방정식 $${expr}=0$의 판별식을 $D$${ira("D")} 하면 $\\dfrac{D}{4}=(k${plusConst(p)})^{2}-a(${cst})=0$`,
          `$(1-a)k^{2}+(${2 * p}-ab)k+${last}=0$`,
          `이 등식이 $k$의 값에 관계없이 항상 성립하므로 $1-a=0$, $${2 * p}-ab=0$, $${last}=0$`,
          `따라서 $a=1$, $b=${2 * p}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, p, ask },
      };
    });
  return attempt<Body>((): Body | null => {
    const m1 = pickOne(rng, [2, 4, 6, 8, 10, 12]);
    const m2 = -randInt(rng, 1, 10);
    if ((m1 + m2) % 4 !== 0 || (m1 * m2) % 4 !== 0 || m1 + m2 === 0)
      return null;
    const P = (m1 + m2) / 4;
    const Q = -(m1 * m2) / 4;
    const n = m1 / 2;
    const expr = `x^{2}-mx${sgnTerm(P, "m")}${plusConst(Q)}`;
    const sq = "(x-n)^{2}";
    return {
      content: `$x$에 대한 이차식 $${expr}$${ga(expr)} $${sq}$${ro(sq)} 인수분해될 때, 실수 $m$, $n$에 대하여 $m+n$의 값을 구하시오. (단, $m>0$)`,
      answer: numAnswer(m1 + n),
      solution: [
        `이차방정식 $${expr}=0$의 판별식을 $D$${ira("D")} 하면 $D=(-m)^{2}-4(${linTex([[P, "m"]], Q)})=0$`,
        `$${polyTex([-4 * Q, -4 * P, 1], "m")}=0$, $${prodTex([m1, m2], "m")}=0$이고 $m>0$이므로 $m=${m1}$`,
        `주어진 이차식은 $${polyTex([P * m1 + Q, -m1, 1])}=(x-${n})^{2}$이므로 $n=${n}$`,
        `따라서 $m+n=${m1 + n}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, P, Q },
    };
  });
}

// ───────────────────────────── 08 ─────────────────────────────
// 이차방정식의 근과 계수의 관계를 이용하여 식의 값 구하기 (1) (표: 중3)
// 꼴 0 (기본·대표): x²−Sx+P=0 의 α, β 대칭식(정수)
// 꼴 1 (응용): 이차항의 계수가 1 이 아님 — 분수 값의 대칭식
// 꼴 2 (응용): √α+√β · |α−β| — 답이 근호(오답 넷)

const AB = "\\alpha+\\beta";
const AxB = "\\alpha\\beta";

/** 분수·음수를 거듭제곱·곱 안에 넣을 때 괄호. */
const qp = (x: Q): string =>
  x.n < 0 || x.d !== 1 ? `\\left(${qTex(x)}\\right)` : qTex(x);

const sqrtTex = (n: number): string | null =>
  n > 0 ? surdTex(surd(0, 1, n)) : null;

function t08(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const S = nz(rng, -6, 6);
      const P = nz(rng, -6, 6);
      const e = randInt(rng, 0, 4);
      const [tex, value, how] = (
        [
          [
            "\\alpha^{3}+\\beta^{3}",
            S ** 3 - 3 * P * S,
            `(${AB})^{3}-3${AxB}(${AB})=${paren(S)}^{3}-3\\times ${paren(P)}\\times ${paren(S)}`,
          ],
          [
            "\\alpha^{2}+\\beta^{2}",
            S * S - 2 * P,
            `(${AB})^{2}-2${AxB}=${paren(S)}^{2}-2\\times ${paren(P)}`,
          ],
          [
            "(\\alpha-\\beta)^{2}",
            S * S - 4 * P,
            `(${AB})^{2}-4${AxB}=${paren(S)}^{2}-4\\times ${paren(P)}`,
          ],
          [
            "\\alpha^{2}\\beta+\\alpha\\beta^{2}",
            P * S,
            `${AxB}(${AB})=${paren(P)}\\times ${paren(S)}`,
          ],
          [
            "(\\alpha+1)(\\beta+1)",
            P + S + 1,
            `${AxB}+(${AB})+1=${P}+${paren(S)}+1`,
          ],
        ] as const
      )[e]!;
      return {
        content: `이차방정식 $${polyTex([P, -S, 1])}=0$의 두 근을 $\\alpha$, $\\beta$${ira("\\beta")} 할 때, $${tex}$의 값을 구하시오.`,
        answer: numAnswer(value),
        solution: [
          `근과 계수의 관계에 의하여 $${AB}=${S}$, $${AxB}=${P}$`,
          `따라서 $${tex}=${how}=${value}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, S, P, e },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const A = pickOne(rng, [2, 3, 4]);
      const B = nz(rng, -7, 7);
      const Cc = nz(rng, -7, 7);
      const S = q(-B, A);
      const P = q(Cc, A);
      const e = randInt(rng, 0, 4);
      const one = q(1);
      const two = q(2);
      const S2 = qMul(S, S);
      let v: Q;
      let tex: string;
      let how: string;
      if (e === 0) {
        v = qDiv(qSub(S2, qMul(two, P)), P);
        tex = "\\dfrac{\\beta}{\\alpha}+\\dfrac{\\alpha}{\\beta}";
        how = `\\dfrac{(${AB})^{2}-2${AxB}}{${AxB}}=\\dfrac{${qp(S)}^{2}-2\\times ${qp(P)}}{${qTex(P)}}`;
      } else if (e === 1) {
        v = qDiv(S, P);
        tex = "\\dfrac{1}{\\alpha}+\\dfrac{1}{\\beta}";
        how = `\\dfrac{${AB}}{${AxB}}=${qTex(S)}\\div ${qp(P)}`;
      } else if (e === 2) {
        v = qAdd(qSub(qMul(q(4), P), qMul(two, S)), one);
        tex = "(2\\alpha-1)(2\\beta-1)";
        how = `4${AxB}-2(${AB})+1=4\\times ${qp(P)}-2\\times ${qp(S)}+1`;
      } else if (e === 3) {
        v = qSub(S2, qMul(two, P));
        tex = "\\alpha^{2}+\\beta^{2}";
        how = `(${AB})^{2}-2${AxB}=${qp(S)}^{2}-2\\times ${qp(P)}`;
      } else {
        const den = qAdd(qAdd(one, S), P);
        if (den.n === 0) return null;
        v = qDiv(qAdd(S, two), den);
        tex = "\\dfrac{1}{1+\\alpha}+\\dfrac{1}{1+\\beta}";
        how = `\\dfrac{(${AB})+2}{1+(${AB})+${AxB}}`;
      }
      return {
        content: `이차방정식 $${polyTex([Cc, B, A])}=0$의 두 근을 $\\alpha$, $\\beta$${ira("\\beta")} 할 때, $${tex}$의 값을 구하시오.`,
        answer: qAnswer(v),
        solution: [
          `근과 계수의 관계에 의하여 $${AB}=${qTex(S)}$, $${AxB}=${qTex(P)}$`,
          `따라서 $${tex}=${how}=${qTex(v)}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, A, B, C: Cc, e },
      };
    });
  return attempt<Body>((): Body | null => {
    const ask = randInt(rng, 0, 1);
    if (ask === 0) {
      const s = randInt(rng, 1, 4);
      const P = s * s;
      const S = randInt(rng, 2 * s, 2 * s + 10);
      const ans = sqrtTex(S + 2 * s)!;
      const ds = pickDistractors(
        rng,
        ans,
        [
          sqrtTex(S - 2 * s),
          String(S + 2 * s),
          sqrtTex(S + s),
          sqrtTex(S + 4 * s),
          sqrtTex(2 * S + 2 * s),
        ].filter(notNull),
      );
      if (ds === null) return null;
      return {
        content: `이차방정식 $${polyTex([P, -S, 1])}=0$의 두 근을 $\\alpha$, $\\beta$${ira("\\beta")} 할 때, $\\sqrt{\\alpha}+\\sqrt{\\beta}$의 값을 구하시오.`,
        answer: $(ans),
        solution: [
          `근과 계수의 관계에 의하여 $${AB}=${S}$, $${AxB}=${P}$이고 판별식이 $0$ 이상이므로 두 근은 실수이다. 따라서 $\\alpha>0$, $\\beta>0$`,
          `$(\\sqrt{\\alpha}+\\sqrt{\\beta})^{2}=${AB}+2\\sqrt{${AxB}}=${S}+2\\times ${s}=${S + 2 * s}$`,
          `$\\sqrt{\\alpha}+\\sqrt{\\beta}>0$이므로 $\\sqrt{\\alpha}+\\sqrt{\\beta}=${ans}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, S, P, ask },
        distractors: ds,
      };
    }
    const S = nz(rng, -7, 7);
    const P = nz(rng, -6, 6);
    const D = S * S - 4 * P;
    if (D <= 0) return null;
    const ans = sqrtTex(D)!;
    const ds = pickDistractors(
      rng,
      ans,
      [
        sqrtTex(S * S + 4 * P),
        String(D),
        sqrtTex(S * S - 2 * P),
        sqrtTex(S * S - P),
        sqrtTex(D + 4),
      ].filter(notNull),
    );
    if (ds === null) return null;
    return {
      content: `이차방정식 $${polyTex([P, -S, 1])}=0$의 두 근을 $\\alpha$, $\\beta$${ira("\\beta")} 할 때, $|\\alpha-\\beta|$의 값을 구하시오.`,
      answer: $(ans),
      solution: [
        `근과 계수의 관계에 의하여 $${AB}=${S}$, $${AxB}=${P}$`,
        `$|\\alpha-\\beta|^{2}=(\\alpha-\\beta)^{2}=(${AB})^{2}-4${AxB}=${paren(S)}^{2}-4\\times ${paren(P)}=${D}$`,
        `$|\\alpha-\\beta|\\ge 0$이므로 $|\\alpha-\\beta|=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, S, P, ask },
      distractors: ds,
    };
  });
}

// ───────────────────────────── 09 ─────────────────────────────
// 이차방정식의 근과 계수의 관계를 이용하여 식의 값 구하기 (2) (표: 중3)
// 근을 방정식에 넣어 차수를 내린 뒤 근과 계수의 관계
// 꼴 0 (기본·대표): (α²+uα+v)(β²+uβ+v)
// 꼴 1 (응용): c₁α²+c₂β²+d₁α+d₂β+e — α², β² 를 일차식으로 바꾸면 α+β 만 남는다
// 꼴 2 (응용): β/(α²−(S−k)α+P)+α/(β²−(S−k)β+P) = (β/α+α/β)/k

function t09(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const p = nz(rng, -5, 5);
      const qc = nz(rng, -6, 6);
      const u = randInt(rng, -5, 5);
      const v = nz(rng, -6, 6);
      if (u === p) return null;
      const S = -p;
      const P = qc;
      const k1 = u - p;
      const k0 = v - qc;
      const value = k1 * k1 * P + k1 * k0 * S + k0 * k0;
      const fa = `\\alpha^{2}${termIf(u, "\\alpha")}${plusConst(v)}`;
      const fb = `\\beta^{2}${termIf(u, "\\beta")}${plusConst(v)}`;
      const la = linTex([[k1, "\\alpha"]], k0);
      const lb = linTex([[k1, "\\beta"]], k0);
      return {
        content: `이차방정식 $${polyTex([qc, p, 1])}=0$의 두 근을 $\\alpha$, $\\beta$${ira("\\beta")} 할 때, $(${fa})(${fb})$의 값을 구하시오.`,
        answer: numAnswer(value),
        solution: [
          `$\\alpha$, $\\beta$${ga("\\beta")} 근이므로 $${polyTex([qc, p, 1], "\\alpha")}=0$, $${polyTex([qc, p, 1], "\\beta")}=0$`,
          `즉 $${fa}=${la}$, $${fb}=${lb}$`,
          `근과 계수의 관계에 의하여 $${AB}=${S}$, $${AxB}=${P}$이므로`,
          `(주어진 식)$=(${la})(${lb})=${coef(k1 * k1)}${AxB}${termIf(k1 * k0, `(${AB})`)}${plusConst(k0 * k0)}=${value}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, p, q: qc, u, v },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const S = nz(rng, -6, 6);
      const P = nz(rng, -6, 6);
      const c1 = pickOne(rng, [1, 2]);
      const c2 = pickOne(rng, [1, 2, 3]);
      const d1 = randInt(rng, -5, 5);
      const d2 = d1 + S * (c1 - c2);
      const e = randInt(rng, -6, 6);
      const lead = c1 * S + d1;
      const rest = e - P * (c1 + c2);
      const value = lead * S + rest;
      const expr = `${coef(c1)}\\alpha^{2}${sgnTerm(c2, "\\beta^{2}")}${termIf(d1, "\\alpha")}${termIf(d2, "\\beta")}${plusConst(e)}`;
      const la = linTex([[S, "\\alpha"]], -P);
      const lb = linTex([[S, "\\beta"]], -P);
      return {
        content: `이차방정식 $${polyTex([P, -S, 1])}=0$의 두 근을 $\\alpha$, $\\beta$${ira("\\beta")} 할 때, $${expr}$의 값을 구하시오.`,
        answer: numAnswer(value),
        solution: [
          `$\\alpha$, $\\beta$${ga("\\beta")} 근이므로 $\\alpha^{2}=${la}$, $\\beta^{2}=${lb}$`,
          `(주어진 식)$=${coef(c1)}(${la})${sgnTerm(c2, `(${lb})`)}${termIf(d1, "\\alpha")}${termIf(d2, "\\beta")}${plusConst(e)}=${linTex([[lead, `(${AB})`]], rest)}$`,
          `근과 계수의 관계에 의하여 $${AB}=${S}$이므로 (주어진 식)$=${value}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, S, P, c1, c2, d1, e },
      };
    });
  return attempt<Body>((): Body | null => {
    const S = nz(rng, -6, 6);
    const P = nz(rng, -6, 6);
    const k = pickOne(rng, [1, 2, 3]);
    if (S === k) return null;
    const v = q(S * S - 2 * P, k * P);
    const den = (x: string): string =>
      `${x}^{2}${termIf(-(S - k), x)}${plusConst(P)}`;
    const expr = `\\dfrac{\\beta}{${den("\\alpha")}}+\\dfrac{\\alpha}{${den("\\beta")}}`;
    const ka = `${coef(k)}\\alpha`;
    const kb = `${coef(k)}\\beta`;
    return {
      content: `이차방정식 $${polyTex([P, -S, 1])}=0$의 두 근을 $\\alpha$, $\\beta$${ira("\\beta")} 할 때, $${expr}$의 값을 구하시오.`,
      answer: qAnswer(v),
      solution: [
        `$\\alpha$${ga("\\alpha")} 근이므로 $\\alpha^{2}${term(-S, "\\alpha")}${plusConst(P)}=0$에서 $${den("\\alpha")}=${ka}$`,
        `같은 방법으로 $${den("\\beta")}=${kb}$`,
        `(주어진 식)$=\\dfrac{\\beta}{${ka}}+\\dfrac{\\alpha}{${kb}}=\\dfrac{\\alpha^{2}+\\beta^{2}}{${coef(k)}${AxB}}=\\dfrac{(${AB})^{2}-2${AxB}}{${coef(k)}${AxB}}$`,
        `근과 계수의 관계에 의하여 $${AB}=${S}$, $${AxB}=${P}$이므로 (주어진 식)$=\\dfrac{${paren(S)}^{2}-2\\times ${paren(P)}}{${k * P}}=${qTex(v)}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, S, P, k },
    };
  });
}

// ───────────────────────────── 10 ─────────────────────────────
// 이차방정식의 근과 계수의 관계를 이용하여 미정계수 구하기 (표: 중1 상중1)
// 꼴 0 (기본·대표): (α−β)²=N → k 에 대한 이차방정식 → 양수 k
// 꼴 1 (응용): α²β+α+αβ²+β=N → (α+β)(αβ+1) → 정수 k (다른 근은 분수)
// 꼴 2 (심화하): 두 실근이 |α|+|β|=N → 제곱해 αβ 의 부호로 나눈다

function t10(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const k1 = randInt(rng, 1, 6);
      const k2 = randInt(rng, -5, 0);
      if ((k1 + k2) % 2 !== 0) return null;
      const a = (4 - k1 - k2) / 2;
      const b = nz(rng, -4, 4);
      const N = a * a - 4 * b - k1 * k2;
      if (N <= 0) return null;
      const ka = a === 0 ? "k" : `(k${plusConst(a)})`;
      const eq = `x^{2}-${ka}x+k${plusConst(b)}=0`;
      const cond = `(\\alpha-\\beta)^{2}=${N}`;
      const expd = polyTex([a * a - 4 * b, 2 * a - 4, 1], "k");
      return {
        content: `이차방정식 $${eq}$의 두 근을 $\\alpha$, $\\beta$${ira("\\beta")} 할 때, $${cond}$${eul(cond)} 만족시키는 양수 $k$의 값을 구하시오.`,
        answer: numAnswer(k1),
        solution: [
          `근과 계수의 관계에 의하여 $${AB}=k${plusConst(a)}$, $${AxB}=k${plusConst(b)}$`,
          `$(\\alpha-\\beta)^{2}=(${AB})^{2}-4${AxB}=${ka}^{2}-4(k${plusConst(b)})=${expd}$`,
          `$${expd}=${N}$에서 $${polyTex([k1 * k2, -(k1 + k2), 1], "k")}=0$, $${prodTex([k1, k2], "k")}=0$`,
          `$k>0$이므로 $k=${k1}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, a, b, N },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const p = pickOne(rng, [2, 3]);
      const qc = nz(rng, -4, 4);
      const r = randInt(rng, -4, 3);
      if (r + 1 === 0) return null;
      const k0 = nz(rng, -4, 4);
      const N = (p * k0 + qc) * (k0 + r + 1);
      if (N === 0) return null;
      const lin2 = p * (r + 1) + qc + p * k0;
      // 다른 근 −lin2/p 가 정수이면 「정수 k」 가 하나로 안 정해진다.
      if (lin2 % p === 0) return null;
      const eq = `x^{2}-(${p}k${plusConst(qc)})x+k${plusConst(r)}=0`;
      const cond = `\\alpha^{2}\\beta+\\alpha+\\alpha\\beta^{2}+\\beta=${N}`;
      const prod = `(${p}k${plusConst(qc)})(k${plusConst(r + 1)})`;
      return {
        content: `이차방정식 $${eq}$의 두 근을 $\\alpha$, $\\beta$${ira("\\beta")} 할 때, $${cond}$${eul(cond)} 만족시키는 정수 $k$의 값을 구하시오.`,
        answer: numAnswer(k0),
        solution: [
          `근과 계수의 관계에 의하여 $${AB}=${p}k${plusConst(qc)}$, $${AxB}=k${plusConst(r)}$`,
          `$\\alpha^{2}\\beta+\\alpha+\\alpha\\beta^{2}+\\beta=${AxB}(${AB})+(${AB})=(${AB})(${AxB}+1)=${prod}$`,
          `$${prod}=${N}$에서 $${polyTex([qc * (r + 1) - N, p * (r + 1) + qc, p], "k")}=0$`,
          `$${factorParen(k0, "k")}(${polyTex([lin2, p], "k")})=0$이고 $k$${eun("k")} 정수이므로 $k=${k0}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, p, q: qc, r, N },
      };
    });
  return attempt<Body>((): Body | null => {
    const p = nz(rng, -6, 6);
    const N = randInt(rng, Math.abs(p) + 1, Math.abs(p) + 8);
    if ((N - Math.abs(p)) % 2 !== 0) return null;
    const k = (p * p - N * N) / 4;
    const cond = `|\\alpha|+|\\beta|=${N}`;
    const bad = `${p * p}=${N * N}`;
    return {
      content: `이차방정식 $x^{2}${term(p, "x")}+k=0$의 두 실근 $\\alpha$, $\\beta$${ga("\\beta")} $${cond}$${eul(cond)} 만족시킬 때, 실수 $k$의 값을 구하시오.`,
      answer: numAnswer(k),
      solution: [
        `근과 계수의 관계에 의하여 $${AB}=${-p}$, $${AxB}=k$`,
        `$${cond}$의 양변을 제곱하면 $\\alpha^{2}+\\beta^{2}+2|${AxB}|=${N * N}$`,
        `$(${AB})^{2}-2${AxB}+2|${AxB}|=${N * N}$, 즉 $${p * p}-2k+2|k|=${N * N}$`,
        `$k\\ge 0$이면 $${bad}$${ga(bad)} 되어 성립하지 않으므로 $k<0$`,
        `따라서 $${p * p}-4k=${N * N}$이므로 $k=${k}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, p, N },
    };
  });
}

// ───────────────────────────── 11 ─────────────────────────────
// 두 근 사이의 관계가 주어진 이차방정식 (표: 중2 상중1)
// 꼴 0 (기본·대표): 두 근의 비 p:q → α 에 대한 이차방정식 → 모든 k 의 합(근과 계수)
// 꼴 1 (응용): 두 근의 차가 d → m → 다른 이차방정식의 두 근의 곱
// 꼴 2 (응용): 두 근이 연속인 자연수 → m
// 꼴 3 (심화하): 두 근의 절댓값이 같고 부호가 다름 → 합 0 · 곱 음수

function t11(rng: Rng): Body {
  const mode = randInt(rng, 0, 3);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const [p, qq] = pickOne(rng, [
        [1, 2],
        [1, 3],
        [2, 3],
        [1, 4],
        [3, 4],
        [2, 5],
      ] as const);
      const a = nz(rng, -3, 3);
      const b = pickOne(rng, [1, 2, 3]);
      const disc = b * b * (p + qq) ** 2 - 4 * p * qq * a * b;
      if (disc <= 0) return null;
      const sumAl = q(b * (p + qq), p * qq);
      const v = qSub(qMul(q(p + qq), sumAl), q(2 * a));
      const eq = `x^{2}-(k${plusConst(a)})x${sgnTerm(b, "k")}=0`;
      const kOf = `k=${p + qq}\\alpha${plusConst(-a)}`;
      return {
        content: `이차방정식 $${eq}$의 두 근의 비가 $${p}:${qq}$일 때, 모든 실수 $k$의 값의 합을 구하시오.`,
        answer: qAnswer(v),
        solution: [
          `두 근을 $${coef(p)}\\alpha$, $${qq}\\alpha$ ($\\alpha\\ne 0$)라 하면 $${p + qq}\\alpha=k${plusConst(a)}$, $${p * qq}\\alpha^{2}=${coef(b)}k$`,
          `첫째 식에서 $${kOf}$${eul(kOf)} 둘째 식에 대입하면 $${polyTex([a * b, -b * (p + qq), p * qq], "\\alpha")}=0$ ……㉠`,
          `㉠의 판별식은 $${disc}>0$이므로 ㉠은 서로 다른 두 실근 $\\alpha_{1}$, $\\alpha_{2}$${eul("\\alpha_{2}")} 갖고 $\\alpha_{1}+\\alpha_{2}=${qTex(sumAl)}$`,
          `따라서 모든 실수 $k$의 값의 합은 $${p + qq}(\\alpha_{1}+\\alpha_{2})${plusConst(-2 * a)}=${p + qq}\\times ${qp(sumAl)}${plusConst(-2 * a)}=${qTex(v)}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, p, q: qq, a, b },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const d = pickOne(rng, [1, 2, 3, 4]);
      const P = nz(rng, -6, 6);
      if ((P + d) % 2 !== 0) return null;
      const al = (-P - d) / 2;
      const c = al * (al + d);
      const cz = randInt(rng, 0, 1);
      const m1 = randInt(rng, 1, 5);
      const m2 = cz === 0 ? 0 : -randInt(rng, 1, 5);
      const u = -(m1 + m2);
      const v = m1 * m2 + c;
      const A = pickOne(rng, [1, 2, 3]);
      const B2 = nz(rng, -3, 3);
      const C2 = nz(rng, -4, 4);
      const E = randInt(rng, -5, 5);
      const top = C2 * m1 + E;
      const prod = q(top, A);
      const mq = `m^{2}${termIf(u, "m")}${plusConst(v)}`;
      const e1 = `x^{2}${term(P, "x")}+${mq}=0`;
      const e2 = `${coef(A)}x^{2}${sgnTerm(-B2, "mx")}${sgnTerm(C2, "m")}${plusConst(E)}=0`;
      const cond = cz === 0 ? "m\\ne 0" : "m>0";
      const ad = `\\alpha+${d}`;
      return {
        content: `$x$에 대한 이차방정식 $${e1}$의 두 근의 차가 $${d}$일 때, 이차방정식 $${e2}$의 두 근의 곱을 구하시오. (단, $${cond}$)`,
        answer: qAnswer(prod),
        solution: [
          `두 근을 $\\alpha$, $${ad}$${ira(ad)} 하면 $\\alpha+(${ad})=${-P}$, $\\alpha(${ad})=${mq}$`,
          `첫째 식에서 $\\alpha=${al}$이므로 $${mq}=${c}$, $${polyTex([m1 * m2, u, 1], "m")}=0$`,
          `$${prodTex([m1, m2], "m")}=0$이고 $${cond}$이므로 $m=${m1}$`,
          `$m=${m1}$${eul(String(m1))} 대입하면 $${polyTex([top, -B2 * m1, A])}=0$`,
          `따라서 두 근의 곱은 $${A === 1 ? qTex(prod) : `\\dfrac{${top}}{${A}}=${qTex(prod)}`}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, P, d, u, v, cz, A, C2, E },
      };
    });
  if (mode === 2)
    return attempt<Body>((): Body | null => {
      const al = randInt(rng, 1, 5);
      const c = al * al - al - 1;
      const m = 2 * al + 1;
      const eq = `x^{2}-mx+m${plusConst(c)}=0`;
      return {
        content: `이차방정식 $${eq}$의 두 근이 연속인 자연수가 되도록 하는 실수 $m$의 값을 구하시오.`,
        answer: numAnswer(m),
        solution: [
          `두 근을 $\\alpha$, $\\alpha+1$ ($\\alpha$${eun("\\alpha")} 자연수)이라 하면 $\\alpha+(\\alpha+1)=m$, $\\alpha(\\alpha+1)=m${plusConst(c)}$`,
          `두 식에서 $m$${eul("m")} 없애면 $\\alpha^{2}+\\alpha=2\\alpha+1${plusConst(c)}$, $${polyTex([-(1 + c), -1, 1], "\\alpha")}=0$`,
          `$${prodTex([al, 1 - al], "\\alpha")}=0$이고 $\\alpha$${eun("\\alpha")} 자연수이므로 $\\alpha=${al}$`,
          `따라서 $m=2\\times ${al}+1=${m}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, c },
      };
    });
  return attempt<Body>((): Body | null => {
    const [m1, m2] = distinctInts(rng, -4, 4, 2, { nonzero: true }) as [
      number,
      number,
    ];
    const u = -(m1 + m2);
    const v = m1 * m2;
    const A = pickOne(rng, [1, 2, 3]);
    const w = nz(rng, -3, 3);
    const z = randInt(rng, -6, 6);
    const f1 = w * m1 + z;
    const f2 = w * m2 + z;
    if (f1 === 0 || f2 === 0 || f1 < 0 === f2 < 0) return null;
    const ans = f1 < 0 ? m1 : m2;
    const mp = polyTex([v, u, 1], "m");
    const lin = linTex([[w, "m"]], z);
    const eq = `${coef(A)}x^{2}+(${mp})x${sgnTerm(w, "m")}${plusConst(z)}=0`;
    return {
      content: `$x$에 대한 이차방정식 $${eq}$의 두 근의 절댓값이 같고 부호가 서로 다를 때, 실수 $m$의 값을 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `두 근을 $\\alpha$, $-\\alpha$ ($\\alpha\\ne 0$)라 하면 두 근의 합이 $0$이므로 $${mp}=0$`,
        `$${prodTex([m1, m2], "m")}=0$에서 ${orList([Math.min(m1, m2), Math.max(m1, m2)], "m")}`,
        `두 근의 곱 $\\alpha\\times(-\\alpha)$${ga("\\alpha\\times(-\\alpha)")} 음수이므로 $${A === 1 ? lin : `\\dfrac{${lin}}{${A}}`}<0$, 즉 $m${w > 0 ? "<" : ">"}${qTex(q(-z, w))}$`,
        `따라서 $m=${ans}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, u, v, A, w, z },
    };
  });
}

// ───────────────────────────── 12 ─────────────────────────────
// 두 이차방정식이 주어질 때 미정계수 구하기 (표: 중2)
// 꼴 0 (기본·대표): x²+ax+b=0 의 두 근 α, β · x²+bx+a=0 의 두 근 α+t, β+t
// 꼴 1 (응용): 두 근이 α+β, αβ 인 이차방정식
// 꼴 2 (응용): 두 근이 α±1/α, β±1/β 인 이차방정식(αβ=±1)

function t12(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const t = pickOne(rng, [-4, -3, -1, 1, 3, 4]);
      const a = t - 2;
      const b = -t - 2;
      const ask = randInt(rng, 0, 2);
      const [et, ev] = (
        [
          ["ab", a * b],
          ["a-b", a - b],
          ["a^{2}+b^{2}", a * a + b * b],
        ] as const
      )[ask]!;
      const at = `\\alpha${plusConst(t)}`;
      const bt = `\\beta${plusConst(t)}`;
      return {
        content: `이차방정식 $x^{2}+ax+b=0$의 두 근을 $\\alpha$, $\\beta$${ira("\\beta")} 할 때, 이차방정식 $x^{2}+bx+a=0$의 두 근은 $${at}$, $${bt}$이다. 이때 실수 $a$, $b$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `$x^{2}+ax+b=0$에서 $${AB}=-a$, $${AxB}=b$ ……㉠`,
          `$x^{2}+bx+a=0$에서 $(${at})+(${bt})=-b$, $(${at})(${bt})=a$`,
          `즉 $${AB}${plusConst(2 * t)}=-b$, $${AxB}${sgnTerm(t, `(${AB})`)}${plusConst(t * t)}=a$ ……㉡`,
          `㉠을 ㉡에 대입하면 $-a${plusConst(2 * t)}=-b$, $b${sgnTerm(-t, "a")}${plusConst(t * t)}=a$`,
          `두 식을 연립하여 풀면 $a=${a}$, $b=${b}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, t, ask },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const P = nz(rng, -5, 5);
      const a = nz(rng, -5, 5);
      const Q = a * P;
      const b = -(a + P);
      const ask = randInt(rng, 0, 1);
      const [et, ev] = ask === 0 ? ["a-b", a - b] : ["ab", a * b];
      return {
        content: `이차방정식 $x^{2}-ax${plusConst(P)}=0$의 두 근이 $\\alpha$, $\\beta$이고, 이차방정식 $x^{2}+bx${plusConst(Q)}=0$의 두 근이 $${AB}$, $${AxB}$일 때, 실수 $a$, $b$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `$x^{2}-ax${plusConst(P)}=0$에서 $${AB}=a$, $${AxB}=${P}$ ……㉠`,
          `$x^{2}+bx${plusConst(Q)}=0$에서 $(${AB})+${AxB}=-b$, $(${AB})${AxB}=${Q}$ ……㉡`,
          `㉠을 ㉡에 대입하면 $a${plusConst(P)}=-b$, $${coef(P)}a=${Q}$`,
          `따라서 $a=${a}$, $b=${b}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, P, Q, ask },
      };
    });
  return attempt<Body>((): Body | null => {
    const p = nz(rng, -5, 5);
    const P = pickOne(rng, [1, -1]);
    const sg = pickOne(rng, [1, -1]);
    const S = -p;
    const o = sg > 0 ? "+" : "-";
    const sum = S + sg * S * P;
    const prod = P + sg * (S * S - 2 * P) * P + P;
    const a = -sum;
    const b = prod;
    const r1 = `\\alpha${o}\\dfrac{1}{\\alpha}`;
    const r2 = `\\beta${o}\\dfrac{1}{\\beta}`;
    return {
      content: `이차방정식 $${polyTex([P, p, 1])}=0$의 두 근이 $\\alpha$, $\\beta$이고, 이차방정식 $x^{2}+ax+b=0$의 두 근이 $${r1}$, $${r2}$일 때, 실수 $a$, $b$에 대하여 $a+b$의 값을 구하시오.`,
      answer: numAnswer(a + b),
      solution: [
        `$${polyTex([P, p, 1])}=0$에서 $${AB}=${S}$, $${AxB}=${P}$`,
        `두 근의 합은 $\\left(${r1}\\right)+\\left(${r2}\\right)=${AB}${o}\\dfrac{${AB}}{${AxB}}=${sum}$`,
        `두 근의 곱은 $\\left(${r1}\\right)\\left(${r2}\\right)=${AxB}${o}\\dfrac{(${AB})^{2}-2${AxB}}{${AxB}}+\\dfrac{1}{${AxB}}=${prod}$`,
        `따라서 $a=${a}$, $b=${b}$이므로 $a+b=${a + b}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, p, P, sg },
    };
  });
}

// ───────────────────────────── 13 ─────────────────────────────
// 두 수를 근으로 하는 이차방정식 (표: 중2 상중1)
// 꼴 0 (기본·대표): α, β 로 만든 두 수를 근으로 하는 이차방정식 — 답이 방정식(오답 넷: 합·곱의 부호)
// 꼴 1 (응용): α², β² 를 근으로 하는 x²+ax+b=0
// 꼴 2 (응용): α+1/β, β+1/α 를 근으로 하고 x² 의 계수가 L 인 이차방정식
// 꼴 3 (심화하): 허근 p+qi 로 m, n → 1/m, n 을 근으로 하는 이차방정식(오답 넷)

const lcm = (a: number, b: number): number => (a / gcd(a, b)) * b;

/** 이어 붙이는 유리수 — `+\dfrac{1}{2}` · `-3`. 0 이면 아무것도 안 쓴다. */
const plusQ = (x: Q): string =>
  x.n === 0 ? "" : x.n < 0 ? qTex(x) : `+${qTex(x)}`;

/** 유리수 계수의 항 — `-\dfrac{1}{2}x` · `+x`. */
function qTerm(x: Q, body: string): string {
  if (x.n === 0) return "";
  const abs = q(Math.abs(x.n), x.d);
  const c = body !== "" && abs.n === 1 && abs.d === 1 ? "" : qTex(abs);
  return `${x.n < 0 ? "-" : "+"}${c}${body}`;
}

const eq0 = (c: readonly number[]): string => `${polyTex(c)}=0`;

function t13(rng: Rng): Body {
  const mode = randInt(rng, 0, 3);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const S = nz(rng, -6, 6);
      const P = nz(rng, -6, 6);
      const kind = randInt(rng, 0, 2);
      const k = kind === 1 ? pickOne(rng, [2, 3, -2, -3]) : nz(rng, -3, 3);
      let S2: number;
      let P2: number;
      let r1: string;
      let r2: string;
      let sumHow: string;
      let prodHow: string;
      if (kind === 0) {
        S2 = 2 * k - S;
        P2 = k * k - k * S + P;
        r1 = `${k}-\\alpha`;
        r2 = `${k}-\\beta`;
        sumHow = `(${r1})+(${r2})=${2 * k}-(${AB})`;
        prodHow = `(${r1})(${r2})=${k * k}${sgnTerm(-k, `(${AB})`)}+${AxB}`;
      } else if (kind === 1) {
        S2 = k * S;
        P2 = k * k * P;
        r1 = `${k}\\alpha`;
        r2 = `${k}\\beta`;
        sumHow = `${r1}${sgnTerm(k, "\\beta")}=${k}(${AB})`;
        prodHow = `(${r1})(${r2})=${k * k}${AxB}`;
      } else {
        S2 = S + 2 * k;
        P2 = P + k * S + k * k;
        r1 = `\\alpha${plusConst(k)}`;
        r2 = `\\beta${plusConst(k)}`;
        sumHow = `(${r1})+(${r2})=${AB}${plusConst(2 * k)}`;
        prodHow = `(${r1})(${r2})=${AxB}${sgnTerm(k, `(${AB})`)}${plusConst(k * k)}`;
      }
      if (S2 === 0 || P2 === 0) return null;
      const ans = eq0([P2, -S2, 1]);
      const ds = pickDistractors(rng, ans, [
        eq0([P2, S2, 1]),
        eq0([-P2, -S2, 1]),
        eq0([-P2, S2, 1]),
        eq0([S2, -P2, 1]),
      ]);
      if (ds === null) return null;
      return {
        content: `이차방정식 $${polyTex([P, -S, 1])}=0$의 두 근을 $\\alpha$, $\\beta$${ira("\\beta")} 할 때, $${r1}$, $${r2}$${eul(r2)} 두 근으로 하고 $x^{2}$의 계수가 $1$인 이차방정식을 구하시오.`,
        answer: $(ans),
        solution: [
          `근과 계수의 관계에 의하여 $${AB}=${S}$, $${AxB}=${P}$`,
          `두 근의 합은 $${sumHow}=${S2}$, 두 근의 곱은 $${prodHow}=${P2}$`,
          `따라서 구하는 이차방정식은 $${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, S, P, kind, k },
        distractors: ds,
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const S = nz(rng, -5, 5);
      const P = nz(rng, -5, 5);
      const a = -(S * S - 2 * P);
      const b = P * P;
      const ask = randInt(rng, 0, 2);
      const [et, ev] = (
        [
          ["a+b", a + b],
          ["ab", a * b],
          ["a-b", a - b],
        ] as const
      )[ask]!;
      return {
        content: `이차방정식 $${polyTex([P, -S, 1])}=0$의 두 근을 $\\alpha$, $\\beta$${ira("\\beta")} 할 때, $\\alpha^{2}$, $\\beta^{2}$${eul("\\beta^{2}")} 두 근으로 하고 $x^{2}$의 계수가 $1$인 이차방정식이 $x^{2}+ax+b=0$이다. 이때 실수 $a$, $b$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `근과 계수의 관계에 의하여 $${AB}=${S}$, $${AxB}=${P}$이므로`,
          `$\\alpha^{2}+\\beta^{2}=(${AB})^{2}-2${AxB}=${S * S - 2 * P}$, $\\alpha^{2}\\beta^{2}=(${AxB})^{2}=${P * P}$`,
          `구하는 이차방정식은 $${eq0([b, a, 1])}$이므로 $a=${a}$, $b=${b}$`,
          `따라서 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, S, P, ask },
      };
    });
  if (mode === 2)
    return attempt<Body>((): Body | null => {
      const A = pickOne(rng, [2, 3]);
      const B = nz(rng, -7, 7);
      const Cc = nz(rng, -5, 5);
      const S = q(-B, A);
      const P = q(Cc, A);
      const sum = qAdd(S, qDiv(S, P));
      const prod = qAdd(qAdd(P, q(2)), qDiv(q(1), P));
      const L = lcm(sum.d, prod.d);
      const a = -(sum.n * L) / sum.d;
      const b = (prod.n * L) / prod.d;
      const r2 = "\\beta+\\dfrac{1}{\\alpha}";
      return {
        content: `이차방정식 $${polyTex([Cc, B, A])}=0$의 두 근을 $\\alpha$, $\\beta$${ira("\\beta")} 할 때, $\\alpha+\\dfrac{1}{\\beta}$, $${r2}$${eul(r2)} 두 근으로 하는 이차방정식이 $${coef(L)}x^{2}+ax+b=0$이다. 이때 실수 $a$, $b$에 대하여 $a+b$의 값을 구하시오.`,
        answer: numAnswer(a + b),
        solution: [
          `근과 계수의 관계에 의하여 $${AB}=${qTex(S)}$, $${AxB}=${qTex(P)}$`,
          `두 근의 합은 $\\left(\\alpha+\\dfrac{1}{\\beta}\\right)+\\left(${r2}\\right)=${AB}+\\dfrac{${AB}}{${AxB}}=${qTex(sum)}$`,
          `두 근의 곱은 $\\left(\\alpha+\\dfrac{1}{\\beta}\\right)\\left(${r2}\\right)=${AxB}+2+\\dfrac{1}{${AxB}}=${qTex(prod)}$`,
          `$x^{2}$의 계수가 $${L}$이므로 구하는 이차방정식은 $${eq0([b, a, L])}$`,
          `따라서 $a=${a}$, $b=${b}$이므로 $a+b=${a + b}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, A, B, C: Cc },
      };
    });
  return attempt<Body>((): Body | null => {
    const p = nz(rng, -3, 3);
    const qv = nz(rng, -3, 3);
    const m = -2 * p;
    const n = p * p + qv * qv;
    const L = Math.abs(m);
    const s = L / m;
    // L(x−1/m)(x−n) = Lx² − L(1/m+n)x + Ln/m, L/m = ±1
    const ans = eq0([s * n, -s - L * n, L]);
    const n2 = p * p - qv * qv;
    const ds = pickDistractors(rng, ans, [
      eq0([-s * n, s - L * n, L]),
      eq0([-s * n, -s + L * n, L]),
      eq0([s * n2, -s - L * n2, L]),
      eq0([s * n, s + L * n, L]),
    ]);
    if (ds === null) return null;
    const z = cplx(p, qv);
    const zb = cConj(z);
    return {
      content: `이차방정식 $x^{2}+mx+n=0$의 한 근이 $${cTex(z)}$일 때, $\\dfrac{1}{m}$, $n$${eul("n")} 두 근으로 하고 $x^{2}$의 계수가 $${L}$인 이차방정식을 구하시오. (단, $m$, $n$${eun("n")} 실수이다.)`,
      answer: $(ans),
      solution: [
        `계수가 실수이므로 다른 한 근은 $${cTex(zb)}$`,
        `근과 계수의 관계에 의하여 $(${cTex(z)})+(${cTex(zb)})=-m$, $(${cTex(z)})(${cTex(zb)})=n$이므로 $m=${m}$, $n=${n}$`,
        `$\\dfrac{1}{m}=${qTex(q(1, m))}$, $n=${n}$${eul(String(n))} 두 근으로 하고 $x^{2}$의 계수가 $${L}$인 이차방정식은 $${L}\\left(x${plusQ(q(-1, m))}\\right)(x${plusConst(-n)})=0$`,
        `따라서 $${ans}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, p, q: qv },
      distractors: ds,
    };
  });
}

// ───────────────────────────── 14 ─────────────────────────────
// 이차방정식의 켤레근의 성질 (표: 중2)
// 꼴 0 (기본·대표): 계수가 유리수 · 한 근 p+q√m → 다른 근 p−q√m → a, b
// 꼴 1 (응용): 계수가 실수 · 한 근 c/(u−vi) → 다른 근 켤레 → f(t)
// 꼴 2 (응용): 계수가 유리수 · 한 근 k/(w−√m) → 유리화한 뒤 켤레근

function t14(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const p = nz(rng, -4, 4);
      const qv = pickOne(rng, [1, 2, 3]);
      const m = pickOne(rng, [2, 3, 5, 6, 7]);
      const k = pickOne(rng, [1, 2, 3]);
      const prodN = p * p - qv * qv * m;
      if (prodN % k !== 0) return null;
      const a = -2 * p;
      const b = prodN / k;
      const ask = randInt(rng, 0, 2);
      const [et, ev] = (
        [
          ["a-b", a - b],
          ["a+b", a + b],
          ["ab", a * b],
        ] as const
      )[ask]!;
      const u = surdTex(surd(p, qv, m));
      const ub = surdTex(surd(p, -qv, m));
      return {
        content: `이차방정식 $x^{2}+ax+${coef(k)}b=0$의 한 근이 $${u}$일 때, 유리수 $a$, $b$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `계수가 유리수이므로 다른 한 근은 $${ub}$`,
          `근과 계수의 관계에 의하여 $(${u})+(${ub})=-a$, $(${u})(${ub})=${coef(k)}b$`,
          `즉 $${2 * p}=-a$, $${prodN}=${coef(k)}b$이므로 $a=${a}$, $b=${b}$`,
          `따라서 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, p, q: qv, m, k, ask },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const u = nz(rng, -3, 3);
      const v = nz(rng, -3, 3);
      const N = u * u + v * v;
      const c = pickOne(rng, [1, 2, 3, 5]);
      const re = q(c * u, N);
      const im = q(c * v, N);
      const z = cplx(re, im);
      const a = qMul(q(-2), re);
      const b = q(c * c, N);
      const t = pickOne(rng, [-2, -1, 1, 2, 3]);
      const value = qAdd(qAdd(q(t * t), qMul(a, q(t))), b);
      const den = cplx(u, -v);
      const conjDen = cplx(u, v);
      const top = c === 1 ? cTex(conjDen) : `${c}(${cTex(conjDen)})`;
      const fx = "f(x)=x^{2}+ax+b";
      const dv = factorTex(t);
      return {
        content: `실수 $a$, $b$에 대하여 이차방정식 $x^{2}+ax+b=0$의 한 근이 $\\dfrac{${c}}{${cTex(den)}}$일 때, 다항식 $${fx}$${eul(fx)} $${dv}$${ro(dv)} 나누었을 때의 나머지를 구하시오.`,
        answer: qAnswer(value),
        solution: [
          `$\\dfrac{${c}}{${cTex(den)}}=\\dfrac{${top}}{(${cTex(den)})(${cTex(conjDen)})}=${cTex(z)}$`,
          `계수가 실수이므로 다른 한 근은 $${cTex(cConj(z))}$`,
          `근과 계수의 관계에 의하여 $-a=${qTex(qMul(q(2), re))}$, $b=${qTex(b)}$`,
          `$f(x)=x^{2}${qTerm(a, "x")}${qTerm(b, "")}$이므로 나머지정리에 의하여 구하는 나머지는 $f(${t})=${qTex(value)}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, c, u, v, t },
      };
    });
  return attempt<Body>((): Body | null => {
    const w = pickOne(rng, [2, 3, 4]);
    const d = pickOne(rng, [-2, -1, 1, 2, 3]);
    const m = w * w - d;
    if (m <= 1 || isSquare(m)) return null;
    const g = pickOne(rng, [1, 2, -1]);
    const k = d * g;
    const p = g * w;
    const qv = g;
    const a = -2 * p;
    const b = p * p - qv * qv * m;
    const u = surdTex(surd(p, qv, m));
    const ub = surdTex(surd(p, -qv, m));
    const frac = `\\dfrac{${k}}{${w}-\\sqrt{${m}}}`;
    const mid =
      d === 1
        ? ""
        : `=\\dfrac{${coef(k)}(${w}+\\sqrt{${m}})}{(${w}-\\sqrt{${m}})(${w}+\\sqrt{${m}})}`;
    return {
      content: `이차방정식 $x^{2}+ax+b=0$의 한 근이 $${frac}$일 때, 유리수 $a$, $b$에 대하여 $a+b$의 값을 구하시오.`,
      answer: numAnswer(a + b),
      solution: [
        `$${frac}${mid}=${u}$`,
        `계수가 유리수이므로 다른 한 근은 $${ub}$`,
        `근과 계수의 관계에 의하여 $-a=(${u})+(${ub})=${2 * p}$, $b=(${u})(${ub})=${b}$`,
        `따라서 $a=${a}$, $b=${b}$이므로 $a+b=${a + b}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, w, m, k },
    };
  });
}

// ───────────────────────────── 15 ─────────────────────────────
// 이차식을 두 일차식의 곱으로 인수분해하기 (표: 상중1)
// x 에 대한 판별식 D 가 y 에 대한 완전제곱식 ⇔ D=0 의 판별식 D₁=0
// 꼴 0 (기본·대표): 상수항이 미지수
// 꼴 1 (심화하): y² 의 계수가 미지수

function t15(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const [a, c] = distinctInts(rng, -3, 3, 2, { nonzero: true }) as [
        number,
        number,
      ];
      const b = nz(rng, -4, 4);
      const d = nz(rng, -4, 4);
      if (b === d) return null;
      const B = a + c;
      const Cy = a * c;
      const Dx = b + d;
      const E = a * d + b * c;
      const k = -b * d;
      if (B === 0 || Dx === 0 || E === 0) return null;
      const rest = `${term(Cy, "y^{2}", true)}${term(E, "y")}-k`;
      const expr = `x^{2}${term(B, "xy")}${term(Cy, "y^{2}")}${term(Dx, "x")}${term(E, "y")}-k`;
      const lin = linTex([[B, "y"]], Dx);
      const h = B * Dx - 2 * E;
      const lead = B * B - 4 * Cy;
      return {
        content: `$x$, $y$에 대한 이차식 $${expr}$${ga(expr)} 두 일차식의 곱으로 인수분해될 때, 실수 $k$의 값을 구하시오.`,
        answer: numAnswer(k),
        solution: [
          `주어진 식을 $x$에 대하여 정리하면 $x^{2}+(${lin})x${rest.startsWith("-") ? "" : "+"}${rest}$`,
          `이차방정식 $x^{2}+(${lin})x${rest.startsWith("-") ? "" : "+"}${rest}=0$의 판별식을 $D$${ira("D")} 하면 $D=(${lin})^{2}-4(${rest})=${polyTex([Dx * Dx, 2 * h, lead], "y")}+4k$`,
          `$D$${ga("D")} $y$에 대한 완전제곱식이어야 하므로 $D=0$의 판별식을 $D_{1}$${ira("D_{1}")} 하면 $\\dfrac{D_{1}}{4}=${paren(h)}^{2}-${coef(lead)}(${Dx * Dx}+4k)=0$`,
          `따라서 $k=${k}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, B, C: Cy, D: Dx, E },
      };
    });
  return attempt<Body>((): Body | null => {
    const [pp, ss] = pickOne(rng, [
      [1, 1],
      [1, 2],
      [2, 1],
      [1, 3],
    ] as const);
    const qq = nz(rng, -3, 3);
    const tt = nz(rng, -3, 3);
    const rr = nz(rng, -3, 3);
    const uu = nz(rng, -3, 3);
    const A = pp * ss;
    const B = pp * tt + qq * ss;
    const Cy = qq * tt;
    const D = pp * uu + rr * ss;
    const E = qq * uu + rr * tt;
    const F = rr * uu;
    // a 가 하나로 정해지고(D²≠4AF), 답에서 D(y) 가 이차식이게(B²≠4A·a)
    if (pp * tt === qq * ss || pp * uu === rr * ss) return null;
    if (B === 0 || D === 0 || E === 0) return null;
    const expr = `${coef(A)}x^{2}${term(B, "xy")}+ay^{2}${term(D, "x")}${term(E, "y")}${plusConst(F)}`;
    const lin = linTex([[B, "y"]], D);
    const inner = `ay^{2}${term(E, "y")}${plusConst(F)}`;
    const h = B * D - 2 * A * E;
    const c0 = D * D - 4 * A * F;
    return {
      content: `$x$, $y$에 대한 이차식 $${expr}$${ga(expr)} 두 일차식의 곱으로 인수분해될 때, 실수 $a$의 값을 구하시오.`,
      answer: numAnswer(Cy),
      solution: [
        `주어진 식을 $x$에 대하여 정리하면 $${coef(A)}x^{2}+(${lin})x+${inner}$`,
        `판별식을 $D$${ira("D")} 하면 $D=(${lin})^{2}${A === 1 ? "-4" : `-4\\times ${A}`}(${inner})=(${B * B}-${4 * A}a)y^{2}${termIf(2 * h, "y")}${plusConst(c0)}$`,
        `$D$${ga("D")} $y$에 대한 완전제곱식이어야 하므로 $D=0$의 판별식을 $D_{1}$${ira("D_{1}")} 하면 $\\dfrac{D_{1}}{4}=${paren(h)}^{2}-(${B * B}-${4 * A}a)\\times ${paren(c0)}=0$`,
        `따라서 $a=${Cy}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, A, B, D, E, F },
    };
  });
}

// ───────────────────────────── 16 ─────────────────────────────
// 잘못 푼 이차방정식 (표: 상중1)
// 꼴 0 (기본·대표): 한 사람은 x 의 계수(곱은 바름) · 한 사람은 상수항(합은 바름)을 잘못 봄 → 올바른 근
// 꼴 1 (심화하): 근의 공식을 (−b±√(b²−ac))/2a 로 잘못 적용 → 합은 바름 · 곱은 c/4a

/** 꼴 1 의 재료 — 올바른 두 정수근 u<v 가운데 잘못 적용한 공식의 두 근도 정수인 것(모듈을 읽을 때 한 번 센다). */
const WRONG_FORMULA_PAIRS: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  for (let u = -16; u <= 16; u += 1) {
    for (let v = u + 1; v <= 16; v += 1) {
      if (u === 0 || v === 0 || (u * v) % 4 !== 0) continue;
      const w2 = u * u + u * v + v * v;
      const w = Math.round(Math.sqrt(w2));
      if (w * w !== w2 || (u + v + w) % 2 !== 0) continue;
      out.push([u, v]);
    }
  }
  return out;
})();

function t16(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  const big = randInt(rng, 0, 1);
  const which = big === 1 ? "큰" : "작은";
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const [u, v] = distinctInts(rng, -7, 7, 2, { nonzero: true }) as [
        number,
        number,
      ];
      const S = u + v;
      const P = u * v;
      const pairs: [number, number][] = [];
      for (let r = -Math.abs(P); r <= Math.abs(P); r += 1) {
        if (r === 0 || P % r !== 0) continue;
        const r2 = P / r;
        if (r <= r2 && r + r2 !== S) pairs.push([r, r2]);
      }
      if (pairs.length === 0) return null;
      const [r1, r2] = pickOne(rng, pairs);
      const irr = S % 2 === 0 && rng() < 0.5;
      let s1t: string;
      let s2t: string;
      let facts: Record<string, number>;
      if (irr) {
        const h = S / 2;
        const m = pickOne(rng, [2, 3, 5, 6, 7]);
        if (h * h - m === P) return null;
        s1t = surdTex(surd(h, 1, m));
        s2t = surdTex(surd(h, -1, m));
        facts = { mode, r1, r2, irr: 1, s1: 0, s2: 0, h, m, big };
      } else {
        const s1 = randInt(rng, -7, 7);
        const s2 = S - s1;
        if (s1 === s2 || s1 * s2 === P || s1 > s2) return null;
        s1t = String(s1);
        s2t = String(s2);
        facts = { mode, r1, r2, irr: 0, s1, s2, h: 0, m: 0, big };
      }
      const [lo, hi] = [Math.min(u, v), Math.max(u, v)];
      const ans = big === 1 ? hi : lo;
      const eq = "ax^{2}+bx+c=0";
      return {
        content: `지훈이와 서연이가 이차방정식 $${eq}$${eul(eq)} 푸는데, 지훈이는 $x$의 계수를 잘못 보고 풀어 두 근 $${r1}$, $${r2}$${eul(String(r2))} 얻었고, 서연이는 상수항을 잘못 보고 풀어 두 근 $${s1t}$, $${s2t}$${eul(s2t)} 얻었다. 이 이차방정식의 두 근 중 ${which} 근을 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `지훈이는 $a$, $c$${eul("c")} 바르게 보았으므로 $\\dfrac{c}{a}=${r1}\\times ${paren(r2)}=${P}$`,
          `서연이는 $a$, $b$${eul("b")} 바르게 보았으므로 $-\\dfrac{b}{a}=(${s1t})+(${s2t})=${S}$`,
          `따라서 처음 이차방정식은 $${polyTex([P, -S, 1])}=0$, $${prodTex([u, v])}=0$이므로 ${orList([lo, hi])}`,
          `구하는 근은 $${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts,
      };
    });
  return attempt<Body>((): Body | null => {
    const [u, v] = pickOne(rng, WRONG_FORMULA_PAIRS);
    const S = u + v;
    const P = u * v;
    const w = Math.round(Math.sqrt(u * u + u * v + v * v));
    const r1 = (S - w) / 2;
    const r2 = (S + w) / 2;
    const ans = big === 1 ? v : u;
    const wrong = "x=\\dfrac{-b\\pm\\sqrt{b^{2}-ac}}{2a}";
    return {
      content: `이차방정식 $ax^{2}+bx+c=0$에서 근의 공식을 $${wrong}$${ro(wrong)} 잘못 적용하여 풀었더니 두 근 $${r1}$, $${r2}$${eul(String(r2))} 얻었다. 이 이차방정식의 두 근 중 ${which} 근을 구하시오. (단, $a$, $b$, $c$${eun("c")} 실수이다.)`,
      answer: numAnswer(ans),
      solution: [
        `잘못 적용한 공식으로 얻은 두 근의 합은 $\\dfrac{-2b}{2a}=-\\dfrac{b}{a}$이므로 $-\\dfrac{b}{a}=${r1}+${paren(r2)}=${S}$`,
        `두 근의 곱은 $\\dfrac{b^{2}-(b^{2}-ac)}{4a^{2}}=\\dfrac{c}{4a}$이므로 $\\dfrac{c}{4a}=${r1}\\times ${paren(r2)}=${P / 4}$, 즉 $\\dfrac{c}{a}=${P}$`,
        `따라서 처음 이차방정식은 $${polyTex([P, -S, 1])}=0$, $${prodTex([u, v])}=0$이므로 ${orList([u, v])}`,
        `구하는 근은 $${ans}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, r1, r2, big },
    };
  });
}

// ───────────────────────────── 17 ─────────────────────────────
// 이차방정식 f(x)=0 과 f(ax+b)=0 의 관계 (표: 중1 상중1)
// f(ax+b)=0 의 근은 (α−b)/a, (β−b)/a
// 꼴 0 (기본·대표): 두 근의 합 S → (S−2b)/a
// 꼴 1 (응용): 두 근의 곱 P → f(ax)=0 의 곱 P/a²
// 꼴 2 (심화하): 합·곱이 주어질 때 f(ax+b)=0 의 곱 (P−bS+b²)/a²

function t17(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const a = pickOne(rng, [2, 3, 4]);
      const b = nz(rng, -4, 4);
      const S = nz(rng, -9, 9);
      const v = q(S - 2 * b, a);
      const inner = polyTex([b, a]);
      return {
        content: `이차방정식 $f(x)=0$의 두 근의 합이 $${S}$일 때, 이차방정식 $f(${inner})=0$의 두 근의 합을 구하시오.`,
        answer: qAnswer(v),
        solution: [
          `$f(x)=0$의 두 근을 $\\alpha$, $\\beta$${ira("\\beta")} 하면 $${AB}=${S}$`,
          `$f(\\alpha)=0$, $f(\\beta)=0$이므로 $f(${inner})=0$이려면 $${inner}=\\alpha$ 또는 $${inner}=\\beta$`,
          `즉 $x=\\dfrac{\\alpha${plusConst(-b)}}{${a}}$ 또는 $x=\\dfrac{\\beta${plusConst(-b)}}{${a}}$`,
          `따라서 두 근의 합은 $\\dfrac{${AB}${plusConst(-2 * b)}}{${a}}=\\dfrac{${S}${plusConst(-2 * b)}}{${a}}=${qTex(v)}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, a, b, S },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const a = pickOne(rng, [2, 3, 4, -2]);
      const P = nz(rng, -20, 20);
      const v = q(P, a * a);
      return {
        content: `이차방정식 $f(x)=0$의 두 근의 곱이 $${P}$일 때, 이차방정식 $f(${a}x)=0$의 두 근의 곱을 구하시오.`,
        answer: qAnswer(v),
        solution: [
          `$f(x)=0$의 두 근을 $\\alpha$, $\\beta$${ira("\\beta")} 하면 $${AxB}=${P}$`,
          `$f(${a}x)=0$이려면 $${a}x=\\alpha$ 또는 $${a}x=\\beta$, 즉 $x=\\dfrac{\\alpha}{${a}}$ 또는 $x=\\dfrac{\\beta}{${a}}$`,
          `따라서 두 근의 곱은 $\\dfrac{\\alpha}{${a}}\\times\\dfrac{\\beta}{${a}}=\\dfrac{${AxB}}{${a * a}}=${qTex(v)}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, a, P },
      };
    });
  return attempt<Body>((): Body | null => {
    const a = pickOne(rng, [2, 3]);
    const b = nz(rng, -5, 5);
    const S = nz(rng, -6, 6);
    const P = nz(rng, -8, 8);
    const v = q(P - b * S + b * b, a * a);
    const inner = polyTex([b, a]);
    return {
      content: `이차방정식 $f(x)=0$의 두 근 $\\alpha$, $\\beta$에 대하여 $${AB}=${S}$, $${AxB}=${P}$일 때, 이차방정식 $f(${inner})=0$의 두 근의 곱을 구하시오.`,
      answer: qAnswer(v),
      solution: [
        `$f(\\alpha)=0$, $f(\\beta)=0$이므로 $f(${inner})=0$이려면 $${inner}=\\alpha$ 또는 $${inner}=\\beta$`,
        `즉 $x=\\dfrac{\\alpha${plusConst(-b)}}{${a}}$ 또는 $x=\\dfrac{\\beta${plusConst(-b)}}{${a}}$`,
        `두 근의 곱은 $\\dfrac{(\\alpha${plusConst(-b)})(\\beta${plusConst(-b)})}{${a * a}}=\\dfrac{${AxB}${sgnTerm(-b, `(${AB})`)}${plusConst(b * b)}}{${a * a}}$`,
        `$=\\dfrac{${P}${b > 0 ? "-" : "+"}${Math.abs(b)}\\times ${paren(S)}+${b * b}}{${a * a}}=${qTex(v)}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, a, b, S, P },
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
export const H1_QUAD_EQ: HighTypeEntry[] = [
  entry("01", "이차방정식의 풀이", SEC.풀이, t01),
  entry("02", "한 근이 주어진 이차방정식", SEC.풀이, t02),
  entry("03", "절댓값 기호를 포함한 이차방정식", SEC.절댓값, t03),
  entry("04", "이차방정식의 활용", SEC.풀이, t04),
  entry("05", "이차방정식의 근의 판별", SEC.판별식, t05),
  entry("06", "계수가 문자인 이차방정식의 근의 판별", SEC.판별식, t06),
  entry("07", "이차식이 완전제곱식이 될 조건", SEC.판별식, t07),
  // 08·17 의 제목은 색인 추출의 흔적(`( 1 )` · 띄어쓰기)까지 바이트 그대로다 — 계약 1.
  entry(
    "08",
    "이차방정식의 근과 계수의 관계를 이용하여 식의 값 구하기 ( 1 )",
    SEC.근계수,
    t08,
  ),
  entry(
    "09",
    "이차방정식의 근과 계수의 관계를 이용하여 식의 값 구하기 (2)",
    SEC.근계수,
    t09,
  ),
  entry(
    "10",
    "이차방정식의 근과 계수의 관계를 이용하여 미정계수 구하기",
    SEC.근계수,
    t10,
  ),
  entry("11", "두 근 사이의 관계가 주어진 이차방정식", SEC.근계수, t11),
  entry("12", "두 이차방정식이 주어질 때 미정계수 구하기", SEC.근계수, t12),
  entry("13", "두 수를 근으로 하는 이차방정식", SEC.식구하기, t13),
  entry("14", "이차방정식의 켤레근의 성질", SEC.식구하기, t14),
  entry("15", "이차식을 두 일차식의 곱으로 인수분해하기", SEC.판별식, t15),
  entry("16", "잘못 푼 이차방정식", SEC.식구하기, t16),
  entry("17", "이차방정식 과 f(x)=0 f(ax+b)=0의 관계", SEC.근계수, t17),
];

export const H1_QUAD_EQ_HOLD: HighHold[] = [];
