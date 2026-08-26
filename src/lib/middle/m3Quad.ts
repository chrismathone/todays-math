/**
 * 중3 「이차방정식」 — RPM 3-1 «이차방정식의 풀이» 01~16 + «이차방정식의 활용» 01~15.
 *
 * 물결 4D 세션 소유 모듈 (docs/planning/tracks/middle-engine-wave3-plan.md §11.2).
 * 합본 `m3.ts` 에는 한 줄(spread)만 더한다.
 *
 * ## 생성 규칙 — **답을 먼저 정하고 발문을 만든다**
 *
 * 근 두 개를 먼저 고르고 **그 근을 갖는 방정식**을 만든다. 그래서 시험은 근의 공식을
 * 옮겨 적지 않고 **대입**(또는 판별식)으로 독립 검산한다 — 생성기가 쓴 식과 다른 관계식이다.
 *
 * - 인수분해 갈래는 근이 유리수가 되게 정수·기약분수 근에서 역산한다.
 * - 근호가 남는 갈래는 **정리된 꼴**만 낸다(`\sqrt{8}` 금지) — 근호 안 수가 제곱인수를
 *   갖지 않는 것을 생성기가 강제하고 시험이 다시 잰다.
 * - 활용 갈래는 **버리는 근**이 있다. 해설이 그 근과 버리는 이유를 적고, 시험은
 *   답이 발문의 조건을 실제로 만족하는지(넓이·부피 식에 대입) 확인한다.
 *
 * ## `facts` 규약
 *
 * `facts.x` 는 **답에 처음 나오는 수**다 — 분수 답이면 (기약) 분자, 근호 답이면 계수.
 * (2A-중3접선 `m3Tangent.ts` 와 같은 규약.) 수학적 검산에 필요한 값은 따로 싣는다.
 *
 * ## 우리 단원 (prisma/seed-data/units.ts 「3. 이차방정식」 orderIndex 475~477)
 *
 * - 풀이 01~16 → 「이차방정식의 풀이」
 * - 활용 01~07 → 「이차방정식의 근의 공식과 응용」 (근의 공식·근의 개수·두 근으로 식 세우기)
 * - 활용 08~15 → 「이차방정식의 활용」 (실생활·도형·상자·닮음)
 *
 * ## 그림 — 「없어도 된다」가 **저절로 참인 것이 아니다**
 *
 * 이 31유형은 그림을 안 쓴다. 그러려면 **발문이 배치를 말해야** 한다.
 *
 * ⚠️ 이 주석은 오래 「도형 갈래도 치수를 발문이 전부 말한다」고 **단언**하고 있었고,
 *    그 단언이 **틀렸다.** 2026-08-25 원장님이 `J30303-A08-002`(유형 15)를 짚으셨다 —
 *    「$\square AEFD$는 정사각형이다」만 있고 **점 $E$·$F$ 가 어디 있는지**를 안 적어서
 *    해설의 $\overline{BE}=t-k$ 가 어디서 나오는지 알 수 없었다. 유형 13도 같았다:
 *    해설은 가로·세로 **양쪽**에서 길을 뺐는데 발문은 길이 몇 개인지 안 적었다.
 *    **네 mode 가 그랬다**(13 mode 1·2 · 15 mode 0·1). 주석이 근거처럼 읽혀서
 *    아무도 다시 묻지 않았다(CLAUDE.md 2026-08-24 «이식해 온 전제»와 같은 자리).
 *
 * 그래서 단언을 **가드로 바꿨다.** 이 파일을 고칠 때 발문에서 배치를 빼면
 * `probe-quad-arrangement.ts` 가 그 mode 를 «배치미정» 으로 집어내고
 * `middleM3Quad.test.ts` 의 「배치를 적는다」가 빨개진다. 새 유형을 더할 때도
 * **부분이 얽히면 발문이 자리를 적어라** — 「십자 모양의」·「(단, 점 $E$는 변 $AB$
 * 위에 …)」 처럼.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중3";
const BOOK = "3-1";
const MINOR_SOLVE = "이차방정식의 풀이";
const MINOR_APPLY = "이차방정식의 활용";

/** 우리 Unit.section 정확한 이름 (prisma/seed-data/units.ts 실측) */
const SEC = {
  풀이: "이차방정식의 풀이",
  공식: "이차방정식의 근의 공식과 응용",
  활용: "이차방정식의 활용",
} as const;

/** 조건을 만족할 때까지 다시 뽑는다 — 못 찾으면 던진다(조용히 기본값 금지). */
function attempt<T>(tries: number, f: () => T | null): T {
  for (let i = 0; i < tries; i += 1) {
    const v = f();
    if (v !== null) return v;
  }
  throw new Error("유형 생성 재시도 초과 — 매개변수 범위를 확인하십시오");
}

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, Math.abs(a) % Math.abs(b));
}

/** 0 이 아닌 정수를 [-hi, -lo] ∪ [lo, hi] 에서 뽑는다. */
function nonZero(rng: Rng, lo: number, hi: number): number {
  const v = intBetween(rng, lo, hi);
  return pick(rng, [1, -1] as const) * v;
}

/** 계수 c 인 항을 «부호가 붙은» LaTeX 조각으로. lead 면 `+` 를 생략한다. */
function term(c: number, v: string, lead = false): string {
  if (c === 0) return "";
  const sign = c < 0 ? "-" : lead ? "" : "+";
  const a = Math.abs(c);
  const body = v === "" ? String(a) : a === 1 ? v : `${a}${v}`;
  return `${sign}${body}`;
}

/** `ax^2+bx+c=0` (a≠0). 0 인 항은 빼고 계수 1 은 안 적는다. */
function quadEq(a: number, b: number, c: number): string {
  return `${term(a, "x^2", true)}${term(b, "x")}${term(c, "")}=0`;
}

/** 계수가 1 일 때 안 적는 접두 계수 — `2x^2` vs `x^2`. */
function lead(a: number): string {
  return a === 1 ? "" : String(a);
}

/** n/d 를 기약으로 줄인다. 부호는 분자로 모은다. */
function reduce(n: number, d: number): [number, number] {
  if (d === 0) throw new Error("분모가 0 입니다");
  let nn = n;
  let dd = d;
  if (dd < 0) {
    nn = -nn;
    dd = -dd;
  }
  const g = gcd(nn, dd) || 1;
  return [nn / g, dd / g];
}

/** 기약분수 LaTeX. 분모가 1 이면 정수, 음수면 앞에 `-`. */
function frac(n: number, d: number): string {
  const [nn, dd] = reduce(n, d);
  if (dd === 1) return String(nn);
  return nn < 0 ? `-\\dfrac{${-nn}}{${dd}}` : `\\dfrac{${nn}}{${dd}}`;
}

/** 분수 계수 항 — `-\dfrac{3}{2}x` 처럼. 계수가 1/−1 이면 수를 안 적는다. */
function fracTerm(n: number, d: number, v: string, isLead = false): string {
  const [nn, dd] = reduce(n, d);
  if (nn === 0) return "";
  const sign = nn < 0 ? "-" : isLead ? "" : "+";
  const a = Math.abs(nn);
  if (dd === 1) {
    const body = v === "" ? String(a) : a === 1 ? v : `${a}${v}`;
    return `${sign}${body}`;
  }
  return `${sign}\\dfrac{${a}}{${dd}}${v}`;
}

/** 정수 t 를 10 으로 나눈 값 — 소수 한 자리까지. */
function tenth(t: number): string {
  return t % 10 === 0 ? String(t / 10) : (t / 10).toFixed(1);
}

/** 소수 계수 항 — 계수는 `t/10` 이다. */
function decTerm(t: number, v: string, isLead = false): string {
  if (t === 0) return "";
  const sign = t < 0 ? "-" : isLead ? "" : "+";
  const s = tenth(Math.abs(t));
  const body = v === "" ? s : s === "1" ? v : `${s}${v}`;
  return `${sign}${body}`;
}

/** n = k²m 으로 쪼갠다 (m 에는 제곱인수가 없다). */
function splitSurd(n: number): [number, number] {
  let k = 1;
  let m = n;
  for (let i = 2; i * i <= m; i += 1) {
    while (m % (i * i) === 0) {
      m /= i * i;
      k *= i;
    }
  }
  return [k, m];
}

/** 제곱인수가 없는 수만 근호 안에 남긴다 — `\sqrt{8}` 이 지면에 나가지 않게. */
const SURD_POOL = [
  2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19, 21, 22, 23,
] as const;

type Body = Pick<
  MidProblem,
  "content" | "answer" | "solution" | "facts" | "figureSpec"
>;

function def(
  minor: string,
  rpmType: string,
  rpmTitle: string,
  unitSection: string,
  difficulty: MidProblem["difficulty"],
  gen: (rng: Rng) => Body,
): TypeEntry {
  return {
    key: `${BOOK}|${minor}|${rpmType}`,
    grade: GRADE,
    unitSection,
    rpmBook: BOOK,
    rpmMinor: minor,
    rpmType,
    rpmTitle,
    handler: (rng) => ({
      grade: GRADE,
      unitSection,
      rpmBook: BOOK,
      rpmMinor: minor,
      rpmType,
      rpmTitle,
      difficulty,
      ...gen(rng),
    }),
  };
}

/**
 * 그림 없는 유형의 공통 마무리 — 스펙 자리를 명시적으로 비운다.
 *
 * ⚠️ `facts` 의 `-0` 을 `0` 으로 눕힌다. `-(p+q)` 가 `-0` 이 되면 지면에는 `0` 으로
 * 찍히는데 `Object.is(-0, 0)` 은 거짓이라 「답의 첫 수 == facts.x」 가 **거짓 빨강**이
 * 된다(실측 2026-08-24: 풀이 07·활용 07 에서 났다).
 */
function body(
  content: string,
  answer: string,
  solution: string,
  facts: Record<string, number>,
): Body {
  const flat: Record<string, number> = {};
  for (const [k, v] of Object.entries(facts)) flat[k] = v === 0 ? 0 : v;
  return { content, answer, solution, facts: flat, figureSpec: null };
}

// ══════════════════════════════════════════════════════════════════════
//  이차방정식의 풀이 01~16
// ══════════════════════════════════════════════════════════════════════

const SOLVE: TypeEntry[] = [
  def(MINOR_SOLVE, "01", "이차방정식의 뜻", SEC.풀이, "기본", (rng) =>
    attempt(60, () => {
      const mode = pick(rng, [0, 1] as const);
      if (mode === 0) {
        const a = intBetween(rng, 2, 9);
        const b = nonZero(rng, 1, 9);
        const c = nonZero(rng, 1, 9);
        return body(
          `등식 $(k-${a})x^2${term(b, "x")}${term(c, "")}=0$이 $x$에 대한 이차방정식이 되도록 하는 상수 $k$의 조건을 구하시오.`,
          `$k\\neq ${a}$`,
          `$x$에 대한 이차방정식은 $x^2$의 계수가 $0$이 아니어야 한다.
$x^2$의 계수는 $k-${a}$이므로 $k-${a}\\neq 0$이다.
따라서 $k\\neq ${a}$이다.`,
          { a, b, c, mode, x: a },
        );
      }
      const p = intBetween(rng, 1, 6);
      const q = intBetween(rng, 1, 5);
      const r = intBetween(rng, 1, 5);
      const s = intBetween(rng, 1, 4);
      const bigA = 1 + s;
      const aa = -(2 * p + q + r);
      const bb = p * p;
      return body(
        `등식 $(x-${p})^2-${q}x=${r}x-${s}x^2$을 $${bigA}x^2+ax+b=0$의 꼴로 나타낼 때, 상수 $a$, $b$에 대하여 $a+b$의 값을 구하시오.`,
        `$${aa + bb}$`,
        `좌변을 전개하면 $(x-${p})^2-${q}x=x^2${term(-(2 * p + q), "x")}+${bb}$이다.
우변을 이항하여 정리하면 $${bigA}x^2${term(aa, "x")}+${bb}=0$이다.
따라서 $a=${aa}$, $b=${bb}$이므로 $a+b=${aa + bb}$이다.`,
        { p, q, r, s, A: bigA, a: aa, b: bb, mode, x: aa + bb },
      );
    }),
  ),

  def(MINOR_SOLVE, "02", "이차방정식의 해", SEC.풀이, "기본", (rng) =>
    attempt(60, () => {
      const r1 = intBetween(rng, 1, 4);
      const r2 = intBetween(rng, r1 + 2, 9);
      const s = r1 + r2;
      const p = r1 * r2;
      const mode = pick(rng, [0, 1] as const);
      if (mode === 0) {
        const d = intBetween(rng, r1 + 1, r2);
        return body(
          `부등식 $2x-${d}<x$를 만족시키는 자연수 $x$ 중에서 이차방정식 $${quadEq(1, -s, p)}$의 해를 구하시오.`,
          `$x=${r1}$`,
          `부등식 $2x-${d}<x$를 풀면 $x<${d}$이다.
$${quadEq(1, -s, p)}$에서 $(x-${r1})(x-${r2})=0$이므로 $x=${r1}$ 또는 $x=${r2}$이다.
이 중 $x<${d}$를 만족시키는 자연수는 $x=${r1}$뿐이다.`,
          { r1, r2, d, s, p, mode, x: r1 },
        );
      }
      const d = intBetween(rng, r1, r2 - 1);
      return body(
        `부등식 $2x-${d}>x$를 만족시키는 자연수 $x$ 중에서 이차방정식 $${quadEq(1, -s, p)}$의 해를 구하시오.`,
        `$x=${r2}$`,
        `부등식 $2x-${d}>x$를 풀면 $x>${d}$이다.
$${quadEq(1, -s, p)}$에서 $(x-${r1})(x-${r2})=0$이므로 $x=${r1}$ 또는 $x=${r2}$이다.
이 중 $x>${d}$를 만족시키는 자연수는 $x=${r2}$뿐이다.`,
        { r1, r2, d, s, p, mode, x: r2 },
      );
    }),
  ),

  def(
    MINOR_SOLVE,
    "03",
    "이차방정식의 한 근이 주어졌을 때 미지수의 값 구하기",
    SEC.풀이,
    "기본",
    (rng) =>
      attempt(80, () => {
        const bigA = intBetween(rng, 1, 3);
        const t = nonZero(rng, 1, 4);
        const mode = pick(rng, [0, 1] as const);
        if (mode === 0) {
          const k = nonZero(rng, 1, 5);
          const a = t * k;
          const b = -(bigA * t + k);
          if (b === 0) return null;
          return body(
            `이차방정식 $${lead(bigA)}x^2${term(b, "x")}+a=0$의 한 근이 $x=${t}$일 때, 상수 $a$의 값을 구하시오.`,
            `$${a}$`,
            `한 근이 $x=${t}$이므로 $x=${t}$을 대입하면 등식이 성립한다.
$${bigA}\\times(${t})^2${term(b, "")}\\times(${t})+a=0$에서 $${bigA * t * t + b * t}+a=0$이다.
따라서 $a=${a}$이다.`,
            { A: bigA, b, a, t, mode, x: a },
          );
        }
        const c0 = nonZero(rng, 1, 5);
        const bigC = t * c0;
        const b0 = intBetween(rng, 1, 9);
        const a = bigA * t + c0 - b0;
        return body(
          `이차방정식 $${lead(bigA)}x^2-(${b0}+a)x${term(bigC, "")}=0$의 한 근이 $x=${t}$일 때, 상수 $a$의 값을 구하시오.`,
          `$${a}$`,
          `한 근이 $x=${t}$이므로 $x=${t}$을 대입하면 등식이 성립한다.
$${bigA}\\times(${t})^2-(${b0}+a)\\times(${t})${term(bigC, "")}=0$에서 $${b0}+a=${bigA * t + c0}$이다.
따라서 $a=${a}$이다.`,
          { A: bigA, b0, C: bigC, a, t, mode, x: a },
        );
      }),
  ),

  def(
    MINOR_SOLVE,
    "04",
    "이차방정식의 한 근이 문자로 주어졌을 때 식의 값 구하기",
    SEC.풀이,
    "응용",
    (rng) =>
      attempt(120, () => {
        const b = nonZero(rng, 1, 9);
        const mode = pick(rng, [0, 1, 2] as const);
        const c = mode === 2 ? intBetween(rng, 1, 9) : nonZero(rng, 1, 9);
        if (b * b - 4 * c <= 0) return null;
        const eq = quadEq(1, b, c);
        if (mode === 0) {
          return body(
            `이차방정식 $${eq}$의 한 근을 $x=\\alpha$라 할 때, $\\alpha^2${term(b, "\\alpha")}$의 값을 구하시오.`,
            `$${-c}$`,
            `$x=\\alpha$를 대입하면 $\\alpha^2${term(b, "\\alpha")}${term(c, "")}=0$이다.
상수항을 이항하면 $\\alpha^2${term(b, "\\alpha")}=${-c}$이다.`,
            { b, c, k: 0, mode, x: -c },
          );
        }
        if (mode === 1) {
          const k = intBetween(rng, 1, 9);
          return body(
            `이차방정식 $${eq}$의 한 근을 $x=\\alpha$라 할 때, $\\alpha^2${term(b, "\\alpha")}+${k}$의 값을 구하시오.`,
            `$${k - c}$`,
            `$x=\\alpha$를 대입하면 $\\alpha^2${term(b, "\\alpha")}${term(c, "")}=0$이므로 $\\alpha^2${term(b, "\\alpha")}=${-c}$이다.
따라서 $\\alpha^2${term(b, "\\alpha")}+${k}=${-c}+${k}=${k - c}$이다.`,
            { b, c, k, mode, x: k - c },
          );
        }
        return body(
          `이차방정식 $${eq}$의 한 근을 $x=\\alpha$라 할 때, $\\alpha+\\dfrac{${c}}{\\alpha}$의 값을 구하시오.`,
          `$${-b}$`,
          `$x=\\alpha$를 대입하면 $\\alpha^2${term(b, "\\alpha")}+${c}=0$이다.
$\\alpha\\neq 0$이므로 양변을 $\\alpha$로 나누면 $\\alpha${term(b, "")}+\\dfrac{${c}}{\\alpha}=0$이다.
따라서 $\\alpha+\\dfrac{${c}}{\\alpha}=${-b}$이다.`,
          { b, c, k: 0, mode, x: -b },
        );
      }),
  ),

  def(
    MINOR_SOLVE,
    "05",
    "의 성질을 이용한 이차방정식의 풀이",
    SEC.풀이,
    "기본",
    (rng) =>
      attempt(120, () => {
        const a = intBetween(rng, 1, 3);
        const c = intBetween(rng, 1, 3);
        const b = nonZero(rng, 1, 6);
        const d = nonZero(rng, 1, 6);
        if (b * c === d * a) return null;
        const [n1, q1] = reduce(b, a);
        const [n2, q2] = reduce(d, c);
        const first = n1 / q1 < n2 / q2 ? [n1, q1] : [n2, q2];
        const second = n1 / q1 < n2 / q2 ? [n2, q2] : [n1, q1];
        const eq = `(${term(a, "x", true)}${term(-b, "")})(${term(c, "x", true)}${term(-d, "")})=0`;
        const mode = pick(rng, [0, 1] as const);
        if (mode === 0) {
          return body(
            `이차방정식 $${eq}$을 푸시오.`,
            `$x=${frac(first[0]!, first[1]!)}$ 또는 $x=${frac(second[0]!, second[1]!)}$`,
            `$AB=0$이면 $A=0$ 또는 $B=0$이다.
$${term(a, "x", true)}${term(-b, "")}=0$ 또는 $${term(c, "x", true)}${term(-d, "")}=0$이다.
따라서 $x=${frac(b, a)}$ 또는 $x=${frac(d, c)}$이다.`,
            {
              a,
              b,
              c,
              d,
              n1: first[0]!,
              d1: first[1]!,
              n2: second[0]!,
              d2: second[1]!,
              mode,
              x: first[0]!,
            },
          );
        }
        return body(
          `이차방정식 $${eq}$의 두 근 중 큰 근을 구하시오.`,
          `$x=${frac(second[0]!, second[1]!)}$`,
          `$AB=0$이면 $A=0$ 또는 $B=0$이므로 $x=${frac(b, a)}$ 또는 $x=${frac(d, c)}$이다.
두 근을 견주면 큰 근은 $x=${frac(second[0]!, second[1]!)}$이다.`,
          {
            a,
            b,
            c,
            d,
            n1: first[0]!,
            d1: first[1]!,
            n2: second[0]!,
            d2: second[1]!,
            mode,
            x: second[0]!,
          },
        );
      }),
  ),

  def(
    MINOR_SOLVE,
    "06",
    "인수분해를 이용한 이차방정식의 풀이",
    SEC.풀이,
    "기본",
    (rng) =>
      attempt(120, () => {
        const p = intBetween(rng, -6, 3);
        const q = intBetween(rng, p + 1, 6);
        if (q <= p) return null;
        const bigA = intBetween(rng, 1, 3);
        const ca = bigA;
        const cb = -bigA * (p + q);
        const cc = bigA * p * q;
        const eq = quadEq(ca, cb, cc);
        const mode = pick(rng, [0, 1, 2] as const);
        const factored = `${lead(bigA)}(x${term(-p, "")})(x${term(-q, "")})=0`;
        if (mode === 0) {
          return body(
            `이차방정식 $${eq}$을 푸시오.`,
            `$x=${p}$ 또는 $x=${q}$`,
            `좌변을 인수분해하면 $${factored}$이다.
$AB=0$의 성질에 의하여 $x${term(-p, "")}=0$ 또는 $x${term(-q, "")}=0$이다.
따라서 $x=${p}$ 또는 $x=${q}$이다.`,
            { ca, cb, cc, p, q, mode, x: p },
          );
        }
        if (mode === 1) {
          return body(
            `이차방정식 $${eq}$의 두 근을 $\\alpha$, $\\beta$라 할 때, $\\alpha-\\beta$의 값을 구하시오. (단, $\\alpha>\\beta$)`,
            `$${q - p}$`,
            `좌변을 인수분해하면 $${factored}$이므로 $x=${p}$ 또는 $x=${q}$이다.
$\\alpha>\\beta$이므로 $\\alpha=${q}$, $\\beta=${p}$이다.
따라서 $\\alpha-\\beta=${q}-(${p})=${q - p}$이다.`,
            { ca, cb, cc, p, q, mode, x: q - p },
          );
        }
        return body(
          `이차방정식 $${eq}$의 두 근을 $\\alpha$, $\\beta$라 할 때, $\\alpha^2-\\beta^2$의 값을 구하시오. (단, $\\alpha>\\beta$)`,
          `$${q * q - p * p}$`,
          `좌변을 인수분해하면 $${factored}$이므로 $x=${p}$ 또는 $x=${q}$이다.
$\\alpha>\\beta$이므로 $\\alpha=${q}$, $\\beta=${p}$이다.
따라서 $\\alpha^2-\\beta^2=${q * q}-${p * p}=${q * q - p * p}$이다.`,
          { ca, cb, cc, p, q, mode, x: q * q - p * p },
        );
      }),
  ),

  def(
    MINOR_SOLVE,
    "07",
    "한 근이 주어졌을 때 다른 한 근 구하기",
    SEC.풀이,
    "응용",
    (rng) =>
      attempt(120, () => {
        const p = nonZero(rng, 1, 6);
        const q = nonZero(rng, 1, 6);
        if (p === q) return null;
        const a = -(p + q);
        const cc = p * q;
        const mode = pick(rng, [0, 1, 2] as const);
        if (mode === 2) {
          const bcoef = -(p + q);
          return body(
            `이차방정식 $x^2${term(bcoef, "x")}+a=0$의 해가 $x=${p}$ 또는 $x=b$일 때, $b-a$의 값을 구하시오. (단, $a$는 상수이다.)`,
            `$${q - cc}$`,
            `$x=${p}$을 대입하면 $(${p})^2${term(bcoef, "")}\\times(${p})+a=0$이므로 $a=${cc}$이다.
$x^2${term(bcoef, "x")}${term(cc, "")}=0$에서 $(x${term(-p, "")})(x${term(-q, "")})=0$이므로 $b=${q}$이다.
따라서 $b-a=${q}-(${cc})=${q - cc}$이다.`,
            { p, q, a, cc, B: bcoef, mode, x: q - cc },
          );
        }
        const eq = `x^2+ax${term(cc, "")}=0`;
        if (mode === 0) {
          return body(
            `이차방정식 $${eq}$의 한 근이 $x=${p}$일 때, 상수 $a$의 값과 다른 한 근을 구하시오.`,
            `$a=${a}$, $x=${q}$`,
            `$x=${p}$을 대입하면 $(${p})^2+a\\times(${p})${term(cc, "")}=0$이므로 $a=${a}$이다.
$x^2${term(a, "x")}${term(cc, "")}=0$에서 $(x${term(-p, "")})(x${term(-q, "")})=0$이다.
따라서 다른 한 근은 $x=${q}$이다.`,
            { p, q, a, cc, B: a, mode, x: a },
          );
        }
        return body(
          `이차방정식 $${eq}$의 한 근이 $x=${p}$일 때, 다른 한 근을 구하시오. (단, $a$는 상수이다.)`,
          `$x=${q}$`,
          `$x=${p}$을 대입하면 $(${p})^2+a\\times(${p})${term(cc, "")}=0$이므로 $a=${a}$이다.
$x^2${term(a, "x")}${term(cc, "")}=0$에서 $(x${term(-p, "")})(x${term(-q, "")})=0$이다.
따라서 다른 한 근은 $x=${q}$이다.`,
          { p, q, a, cc, B: a, mode, x: q },
        );
      }),
  ),

  def(
    MINOR_SOLVE,
    "08",
    "한 근이 다른 이차방정식의 한 근일 때",
    SEC.풀이,
    "응용",
    (rng) =>
      attempt(120, () => {
        const p = nonZero(rng, 1, 6);
        const q = nonZero(rng, 1, 6);
        if (p === q) return null;
        const lo = Math.min(p, q);
        const hi = Math.max(p, q);
        const b1 = -(p + q);
        const c1 = p * q;
        const mode = pick(rng, [0, 1] as const);
        const t = mode === 0 ? lo : hi;
        const bigA = intBetween(rng, 1, 4);
        const c0 = nonZero(rng, 1, 5);
        const bigC = t * c0;
        const m = nonZero(rng, 1, 5);
        const a = -(bigA * t + c0) - m;
        return body(
          `이차방정식 $${quadEq(1, b1, c1)}$의 두 근 중 ${mode === 0 ? "작은" : "큰"} 근이 이차방정식 $${lead(bigA)}x^2+(a${term(m, "")})x${term(bigC, "")}=0$의 한 근일 때, 상수 $a$의 값을 구하시오.`,
          `$${a}$`,
          `$${quadEq(1, b1, c1)}$에서 $(x${term(-p, "")})(x${term(-q, "")})=0$이므로 $x=${lo}$ 또는 $x=${hi}$이다.
${mode === 0 ? "작은" : "큰"} 근은 $x=${t}$이므로 이것을 두 번째 이차방정식에 대입하면
$${bigA}\\times(${t})^2+(a${term(m, "")})\\times(${t})${term(bigC, "")}=0$이다. 따라서 $a=${a}$이다.`,
          { p, q, b1, c1, t, A: bigA, m, C: bigC, a, mode, x: a },
        );
      }),
  ),

  def(MINOR_SOLVE, "09", "두 이차방정식의 공통인 근", SEC.풀이, "응용", (rng) =>
    attempt(120, () => {
      const t = nonZero(rng, 1, 5);
      const u = nonZero(rng, 1, 6);
      const v = nonZero(rng, 1, 6);
      if (u === t || v === t || u === v) return null;
      const b1 = -(t + u);
      const c1 = t * u;
      const bigA = intBetween(rng, 1, 3);
      const a2 = bigA;
      const b2 = -bigA * (t + v);
      const c2 = bigA * t * v;
      const mode = pick(rng, [0, 1] as const);
      if (mode === 0) {
        return body(
          `두 이차방정식 $${quadEq(1, b1, c1)}$, $${quadEq(a2, b2, c2)}$의 공통인 근을 구하시오.`,
          `$x=${t}$`,
          `$${quadEq(1, b1, c1)}$에서 $(x${term(-t, "")})(x${term(-u, "")})=0$이므로 $x=${t}$ 또는 $x=${u}$이다.
$${quadEq(a2, b2, c2)}$에서 $${lead(bigA)}(x${term(-t, "")})(x${term(-v, "")})=0$이므로 $x=${t}$ 또는 $x=${v}$이다.
따라서 공통인 근은 $x=${t}$이다.`,
          { t, u, v, b1, c1, a2, b2, c2, mode, x: t },
        );
      }
      return body(
        `두 이차방정식 $${quadEq(1, b1, c1)}$, $${quadEq(a2, b2, c2)}$에서 공통이 아닌 두 근의 곱을 구하시오.`,
        `$${u * v}$`,
        `$${quadEq(1, b1, c1)}$의 해는 $x=${t}$ 또는 $x=${u}$이고, $${quadEq(a2, b2, c2)}$의 해는 $x=${t}$ 또는 $x=${v}$이다.
공통인 근은 $x=${t}$이므로 공통이 아닌 두 근은 $${u}$, $${v}$이다.
따라서 두 근의 곱은 $(${u})\\times(${v})=${u * v}$이다.`,
        { t, u, v, b1, c1, a2, b2, c2, mode, x: u * v },
      );
    }),
  ),

  def(MINOR_SOLVE, "10", "중근을 갖는 이차방정식", SEC.풀이, "응용", (rng) =>
    attempt(120, () => {
      const mode = pick(rng, [0, 1, 2] as const);
      if (mode === 2) {
        const m = nonZero(rng, 1, 7);
        const n = pick(rng, [2, 3] as const);
        const k = intBetween(rng, 1, 5);
        if (gcd(n, k) !== 1) return null;
        const ca1 = 1;
        const cb1 = 2 * m;
        const cc1 = m * m;
        const ca2 = n * n;
        const cb2 = -2 * n * k;
        const cc2 = k * k;
        const [pn, pd] = reduce(-m * k, n);
        return body(
          `이차방정식 $${quadEq(ca1, cb1, cc1)}$이 중근 $x=a$를 갖고, 이차방정식 $${quadEq(ca2, cb2, cc2)}$이 중근 $x=b$를 가질 때, $ab$의 값을 구하시오.`,
          `$${frac(pn, pd)}$`,
          `$${quadEq(ca1, cb1, cc1)}$은 $(x${term(m, "")})^2=0$이므로 $a=${-m}$이다.
$${quadEq(ca2, cb2, cc2)}$은 $(${n}x-${k})^2=0$이므로 $b=${frac(k, n)}$이다.
따라서 $ab=(${-m})\\times${frac(k, n)}=${frac(pn, pd)}$이다.`,
          {
            ca1,
            cb1,
            cc1,
            ca2,
            cb2,
            cc2,
            rn1: -m,
            rd1: 1,
            rn2: k,
            rd2: n,
            mode,
            x: pn,
          },
        );
      }
      const m = nonZero(rng, 1, 8);
      const bigA = mode === 0 ? 1 : intBetween(rng, 2, 4);
      const ca = bigA;
      const cb = 2 * bigA * m;
      const cc = bigA * m * m;
      return body(
        `이차방정식 $${quadEq(ca, cb, cc)}$의 중근을 구하시오.`,
        `$x=${-m}$`,
        `좌변을 인수분해하면 $${lead(bigA)}(x${term(m, "")})^2=0$이다.
$(x${term(m, "")})^2=0$이므로 $x${term(m, "")}=0$이다.
따라서 중근은 $x=${-m}$이다.`,
        {
          ca1: ca,
          cb1: cb,
          cc1: cc,
          ca2: ca,
          cb2: cb,
          cc2: cc,
          rn1: -m,
          rd1: 1,
          rn2: -m,
          rd2: 1,
          mode,
          x: -m,
        },
      );
    }),
  ),

  def(
    MINOR_SOLVE,
    "11",
    "이차방정식이 중근을 가질 조건",
    SEC.풀이,
    "응용",
    (rng) =>
      attempt(120, () => {
        const mode = pick(rng, [0, 1, 2] as const);
        if (mode === 2) {
          const bigA = pick(rng, [2, 3] as const);
          const k = intBetween(rng, 1, 5);
          const bigB = 2 * bigA * k;
          const bigC = nonZero(rng, 1, 6);
          const p = bigA * k * k - bigC;
          return body(
            `이차방정식 $${bigA}x^2+${bigB}x+p${term(bigC, "")}=0$이 중근을 가질 때, 상수 $p$의 값을 구하시오.`,
            `$${p}$`,
            `이차방정식 $ax^2+bx+c=0$이 중근을 가질 조건은 $b^2-4ac=0$이다.
$${bigB}^2-4\\times${bigA}\\times(p${term(bigC, "")})=0$에서 $p${term(bigC, "")}=${bigA * k * k}$이다.
따라서 $p=${p}$이다.`,
            {
              m: 0,
              A: bigA,
              B: bigB,
              C: bigC,
              alpha: 0,
              beta: 0,
              p,
              mode,
              x: p,
            },
          );
        }
        const m = intBetween(rng, 1, 7);
        const alpha = intBetween(rng, 1, 3);
        const p = nonZero(rng, 1, 6);
        const beta = m * m - alpha * p;
        const constText = `${alpha === 1 ? "" : alpha}p${term(beta, "")}`;
        if (mode === 0) {
          return body(
            `이차방정식 $x^2+${2 * m}x+${constText}=0$이 중근을 가질 때, 상수 $p$의 값을 구하시오.`,
            `$${p}$`,
            `중근을 가지려면 좌변이 완전제곱식이어야 하므로 상수항이 $\\left(\\dfrac{${2 * m}}{2}\\right)^2=${m * m}$이어야 한다.
$${constText}=${m * m}$에서 $${alpha === 1 ? "" : alpha}p=${m * m - beta}$이다.
따라서 $p=${p}$이다.`,
            { m, alpha, beta, p, A: 1, B: 2 * m, C: 0, mode, x: p },
          );
        }
        return body(
          `이차방정식 $x^2+${2 * m}x+${constText}=0$이 중근 $x=a$를 가질 때, $p+a$의 값을 구하시오.`,
          `$${p - m}$`,
          `중근을 가지려면 상수항이 $\\left(\\dfrac{${2 * m}}{2}\\right)^2=${m * m}$이어야 하므로 $p=${p}$이다.
이때 이차방정식은 $(x+${m})^2=0$이므로 중근은 $a=${-m}$이다.
따라서 $p+a=${p}+(${-m})=${p - m}$이다.`,
          { m, alpha, beta, p, A: 1, B: 2 * m, C: 0, mode, x: p - m },
        );
      }),
  ),

  def(
    MINOR_SOLVE,
    "12",
    "제곱근을 이용한 이차방정식의 풀이",
    SEC.풀이,
    "기본",
    (rng) =>
      attempt(120, () => {
        // 계수 1 은 쓰지 않는다 — 해설이 「양변을 $1$로 나누면」이 되어 버린다.
        const a = pick(rng, [2, 3] as const);
        const p = nonZero(rng, 1, 6);
        const mode = pick(rng, [0, 1, 2] as const);
        if (mode === 2) {
          const e = intBetween(rng, 1, 5);
          const d = 2 * e;
          const b = a * e * e;
          return body(
            `이차방정식 $${lead(a)}(x${term(p, "")})^2=b$의 두 근의 차가 $${d}$일 때, 상수 $b$의 값을 구하시오.`,
            `$${b}$`,
            `$(x${term(p, "")})^2=\\dfrac{b}{${a}}$이므로 $x=${-p}\\pm\\sqrt{\\dfrac{b}{${a}}}$이다.
두 근의 차는 $2\\sqrt{\\dfrac{b}{${a}}}=${d}$이므로 $\\sqrt{\\dfrac{b}{${a}}}=${e}$이다.
따라서 $b=${a}\\times${e * e}=${b}$이다.`,
            { a, p, q: 0, c: 0, d, b, mode, x: b },
          );
        }
        const q = pick(rng, SURD_POOL);
        const c = a * q;
        const eq = `${lead(a)}(x${term(p, "")})^2=${c}`;
        if (mode === 0) {
          return body(
            `이차방정식 $${eq}$을 푸시오.`,
            `$x=${-p}\\pm\\sqrt{${q}}$`,
            `양변을 $${a}$로 나누면 $(x${term(p, "")})^2=${q}$이다.
$x${term(p, "")}=\\pm\\sqrt{${q}}$이므로 $x=${-p}\\pm\\sqrt{${q}}$이다.`,
            { a, p, q, c, d: 0, b: 0, mode, x: -p },
          );
        }
        return body(
          `이차방정식 $${eq}$의 해가 $x=m\\pm\\sqrt{n}$일 때, 유리수 $m$, $n$에 대하여 $m+n$의 값을 구하시오.`,
          `$${-p + q}$`,
          `양변을 $${a}$로 나누면 $(x${term(p, "")})^2=${q}$이므로 $x=${-p}\\pm\\sqrt{${q}}$이다.
따라서 $m=${-p}$, $n=${q}$이므로 $m+n=${-p}+${q}=${-p + q}$이다.`,
          { a, p, q, c, d: 0, b: 0, mode, x: -p + q },
        );
      }),
  ),

  def(
    MINOR_SOLVE,
    "13",
    "이차방정식 가 근을 가질 조건",
    SEC.풀이,
    "응용",
    (rng) =>
      attempt(120, () => {
        const p = nonZero(rng, 1, 6);
        const d = nonZero(rng, 1, 8);
        const eq = `(x${term(-p, "")})^2=k${term(d, "")}`;
        const mode = pick(rng, [0, 1, 2, 3] as const);
        if (mode === 3) {
          return body(
            `이차방정식 $${eq}$이 중근 $x=a$를 가질 때, $k+a$의 값을 구하시오.`,
            `$${p - d}$`,
            `중근을 가지려면 우변이 $0$이어야 하므로 $k${term(d, "")}=0$에서 $k=${-d}$이다.
이때 $(x${term(-p, "")})^2=0$이므로 $a=${p}$이다.
따라서 $k+a=${-d}+(${p})=${p - d}$이다.`,
            { p, d, mode, x: p - d },
          );
        }
        const label = ["근을 가질", "서로 다른 두 근을 가질", "근을 갖지 않을"][
          mode
        ]!;
        const sym = ["\\geq", ">", "<"][mode]!;
        const reason = [
          `$(x${term(-p, "")})^2\\geq 0$이므로 근을 가지려면 $k${term(d, "")}\\geq 0$이어야 한다.`,
          `서로 다른 두 근을 가지려면 $k${term(d, "")}>0$이어야 한다.`,
          `근을 갖지 않으려면 $k${term(d, "")}<0$이어야 한다.`,
        ][mode]!;
        return body(
          `이차방정식 $${eq}$이 ${label} 때, 상수 $k$의 값의 범위를 구하시오.`,
          `$k${sym} ${-d}$`,
          `${reason}
따라서 $k${sym} ${-d}$이다.`,
          { p, d, mode, x: -d },
        );
      }),
  ),

  def(
    MINOR_SOLVE,
    "14",
    "완전제곱식의 꼴로 나타내기",
    SEC.풀이,
    "응용",
    (rng) =>
      attempt(120, () => {
        const bigA = intBetween(rng, 1, 3);
        const aa = nonZero(rng, 1, 6);
        const bb = intBetween(rng, 1, 12);
        const bigB = 2 * bigA * aa;
        const bigC = bigA * (aa * aa - bb);
        const mode = pick(rng, [0, 1, 2] as const);
        const askText = ["a+b", "ab", "b-a"][mode]!;
        const value = [aa + bb, aa * bb, bb - aa][mode]!;
        const divided = `x^2${term(2 * aa, "x")}${term(aa * aa - bb, "")}=0`;
        const firstLine =
          bigA === 1
            ? `$x^2$의 계수가 $1$이므로 그대로 정리하면 $${divided}$이다.`
            : `양변을 $${bigA}$로 나누면 $${divided}$이다.`;
        return body(
          `이차방정식 $${quadEq(bigA, bigB, bigC)}$을 $(x+a)^2=b$의 꼴로 나타낼 때, 상수 $a$, $b$에 대하여 $${askText}$의 값을 구하시오.`,
          `$${value}$`,
          `${firstLine}
상수항을 이항하고 양변에 $\\left(\\dfrac{${2 * aa}}{2}\\right)^2=${aa * aa}$을 더하면 $(x${term(aa, "")})^2=${bb}$이다.
따라서 $a=${aa}$, $b=${bb}$이므로 $${askText}=${value}$이다.`,
          { A: bigA, B: bigB, C: bigC, a: aa, b: bb, mode, x: value },
        );
      }),
  ),

  def(
    MINOR_SOLVE,
    "15",
    "완전제곱식을 이용한 이차방정식의 풀이",
    SEC.풀이,
    "응용",
    (rng) =>
      attempt(120, () => {
        const m = nonZero(rng, 1, 6);
        const n = pick(rng, SURD_POOL);
        const bigB = -2 * m;
        const bigP = n - m * m;
        const eq = `x^2${term(bigB, "x")}=${bigP}`;
        const mode = pick(rng, [0, 1, 2] as const);
        if (mode === 2) {
          return body(
            `이차방정식 $${eq}$를 완전제곱식을 이용하여 푸시오.`,
            `$x=${m}\\pm\\sqrt{${n}}$`,
            `양변에 $\\left(\\dfrac{${bigB}}{2}\\right)^2=${m * m}$을 더하면 $(x${term(-m, "")})^2=${n}$이다.
$x${term(-m, "")}=\\pm\\sqrt{${n}}$이므로 $x=${m}\\pm\\sqrt{${n}}$이다.`,
            { B: bigB, P: bigP, m, n, mode, x: m },
          );
        }
        const askText = mode === 0 ? "m+n" : "mn";
        const value = mode === 0 ? m + n : m * n;
        return body(
          `이차방정식 $${eq}$를 완전제곱식을 이용하여 풀었더니 해가 $x=m\\pm\\sqrt{n}$이었다. 유리수 $m$, $n$에 대하여 $${askText}$의 값을 구하시오.`,
          `$${value}$`,
          `양변에 $\\left(\\dfrac{${bigB}}{2}\\right)^2=${m * m}$을 더하면 $(x${term(-m, "")})^2=${n}$이다.
$x=${m}\\pm\\sqrt{${n}}$이므로 $m=${m}$, $n=${n}$이다.
따라서 $${askText}=${value}$이다.`,
          { B: bigB, P: bigP, m, n, mode, x: value },
        );
      }),
  ),

  def(
    MINOR_SOLVE,
    "16",
    "해에 대한 조건이 주어진 경우",
    SEC.풀이,
    "심화",
    (rng) =>
      attempt(120, () => {
        const mode = pick(rng, [0, 1, 2] as const);
        if (mode === 0) {
          const a = pick(rng, [
            2, 3, 5, 6, 7, 8, 12, 18, 20, 24, 27, 32, 45, 48, 50,
          ] as const);
          const p = nonZero(rng, 1, 6);
          const [, k] = splitSurd(a);
          return body(
            `이차방정식 $(x${term(p, "")})^2=${a}k$의 두 근이 모두 정수가 되도록 하는 가장 작은 자연수 $k$의 값을 구하시오.`,
            `$${k}$`,
            `$x=${-p}\\pm\\sqrt{${a}k}$이므로 두 근이 정수이려면 $${a}k$가 어떤 자연수의 제곱이어야 한다.
$${a}=${splitSurd(a)[0]}^2\\times${k}$이므로 $${a}k$가 제곱수가 되는 가장 작은 자연수 $k$는 $${k}$이다.
따라서 $k=${k}$이다.`,
            { a, p, m: 0, mode, x: k },
          );
        }
        if (mode === 1) {
          const p = intBetween(rng, 4, 12);
          const t = (p - 1) % 2 === 0 ? p - 1 : p - 2;
          if (t < 2) return null;
          const k = (t * t) / 2;
          return body(
            `이차방정식 $(x-${p})^2=2k$의 서로 다른 두 근이 모두 자연수가 되도록 하는 자연수 $k$의 값 중 가장 큰 값을 구하시오.`,
            `$${k}$`,
            `$x=${p}\\pm\\sqrt{2k}$이므로 $\\sqrt{2k}$가 자연수 $t$이어야 하고, 작은 근 $${p}-t$가 자연수이려면 $t\\leq ${p - 1}$이어야 한다.
$2k=t^2$에서 $t$는 짝수이므로 가장 큰 $t$는 $${t}$이고, 이때 $k=\\dfrac{${t * t}}{2}=${k}$이다.
따라서 구하는 값은 $${k}$이다.`,
            { a: 0, p, m: 0, t, mode, x: k },
          );
        }
        const m = intBetween(rng, 3, 8);
        let sum = 0;
        for (let t = 0; t < m; t += 1) sum += m * m - t * t;
        return body(
          `완전제곱식을 이용하여 이차방정식 $x^2-${2 * m}x+a=0$의 해가 모두 정수가 되도록 하는 모든 자연수 $a$의 값의 합을 구하시오.`,
          `$${sum}$`,
          `$(x-${m})^2=${m * m}-a$이므로 해가 정수이려면 $${m * m}-a$가 $0$ 또는 제곱수이어야 한다.
$a$가 자연수이므로 $${m * m}-a=t^2$ $(t=0,\\,1,\\,\\cdots,\\,${m - 1})$에서 $a=${m * m}-t^2$이다.
이 값들을 모두 더하면 $${sum}$이다.`,
          { a: 0, p: 0, m, mode, x: sum },
        );
      }),
  ),
];

// ══════════════════════════════════════════════════════════════════════
//  이차방정식의 활용 01~15
// ══════════════════════════════════════════════════════════════════════

const APPLY: TypeEntry[] = [
  def(MINOR_APPLY, "01", "이차방정식의 근의 공식", SEC.공식, "기본", (rng) =>
    attempt(200, () => {
      const a = intBetween(rng, 1, 3);
      const b = nonZero(rng, 1, 9);
      const c = nonZero(rng, 1, 9);
      const bigD = b * b - 4 * a * c;
      if (bigD <= 0) return null;
      if (splitSurd(bigD)[0] !== 1) return null;
      if (gcd(Math.abs(b), 2 * a) !== 1) return null;
      const bigA = -b;
      const eq = quadEq(a, b, c);
      const mode = pick(rng, [0, 1, 2] as const);
      if (mode === 2) {
        return body(
          `이차방정식 $${eq}$을 근의 공식을 이용하여 푸시오.`,
          `$x=\\dfrac{${bigA}\\pm\\sqrt{${bigD}}}{${2 * a}}$`,
          `근의 공식 $x=\\dfrac{-b\\pm\\sqrt{b^2-4ac}}{2a}$에 $a=${a}$, $b=${b}$, $c=${c}$를 대입한다.
$b^2-4ac=(${b})^2-4\\times${a}\\times(${c})=${bigD}$이다.
따라서 $x=\\dfrac{${bigA}\\pm\\sqrt{${bigD}}}{${2 * a}}$이다.`,
          { a, b, c, D: bigD, A: bigA, mode, x: bigA },
        );
      }
      const askText = mode === 0 ? "A+B" : "AB";
      const value = mode === 0 ? bigA + bigD : bigA * bigD;
      return body(
        `이차방정식 $${eq}$의 근이 $x=\\dfrac{A\\pm\\sqrt{B}}{${2 * a}}$일 때, 유리수 $A$, $B$에 대하여 $${askText}$의 값을 구하시오.`,
        `$${value}$`,
        `근의 공식에 $a=${a}$, $b=${b}$, $c=${c}$를 대입하면 $b^2-4ac=${bigD}$이다.
$x=\\dfrac{${bigA}\\pm\\sqrt{${bigD}}}{${2 * a}}$이므로 $A=${bigA}$, $B=${bigD}$이다.
따라서 $${askText}=${value}$이다.`,
        { a, b, c, D: bigD, A: bigA, mode, x: value },
      );
    }),
  ),

  def(MINOR_APPLY, "02", "복잡한 이차방정식의 풀이", SEC.공식, "응용", (rng) =>
    attempt(200, () => {
      const mode = pick(rng, [0, 1, 2] as const);
      if (mode === 0) {
        const k = pick(rng, [1, 2] as const);
        const n1 = pick(rng, [-5, -3, -1, 1, 3, 5] as const);
        const n2 = nonZero(rng, 1, 4);
        if (n2 % 5 === 0) return null;
        const bigP = 10 * k;
        const bigQ = -k * (2 * n2 + 5 * n1);
        const bigR = k * n1 * n2;
        if (bigQ === 0) return null;
        const [ra, rb] = reduce(n1, 2);
        const [rc, rd] = reduce(n2, 5);
        const firstIsA = ra / rb < rc / rd;
        const f1 = firstIsA ? [ra, rb] : [rc, rd];
        const f2 = firstIsA ? [rc, rd] : [ra, rb];
        return body(
          `이차방정식 $${decTerm(bigP, "x^2", true)}${decTerm(bigQ, "x")}${decTerm(bigR, "")}=0$을 푸시오.`,
          `$x=${frac(f1[0]!, f1[1]!)}$ 또는 $x=${frac(f2[0]!, f2[1]!)}$`,
          `계수가 소수이므로 양변에 $10$을 곱하면 $${quadEq(bigP, bigQ, bigR)}$이다.
좌변을 인수분해하면 $${k === 1 ? "" : k}(2x${term(-n1, "")})(5x${term(-n2, "")})=0$이다.
따라서 $x=${frac(n1, 2)}$ 또는 $x=${frac(n2, 5)}$이다.`,
          {
            ea: bigP,
            eb: bigQ,
            ec: bigR,
            n1: f1[0]!,
            d1: f1[1]!,
            n2: f2[0]!,
            d2: f2[1]!,
            mode,
            x: f1[0]!,
          },
        );
      }
      if (mode === 1) {
        const d1 = pick(rng, [1, 2, 3] as const);
        const d2 = pick(rng, [1, 2, 3] as const);
        const n1 = nonZero(rng, 1, 5);
        const n2 = nonZero(rng, 1, 5);
        if (gcd(n1, d1) !== 1 || gcd(n2, d2) !== 1) return null;
        if (n1 * d2 === n2 * d1) return null;
        const bigL = pick(rng, [2, 3] as const);
        const bigP = d1 * d2;
        const bigQ = -(d1 * n2 + d2 * n1);
        const bigR = n1 * n2;
        const big = n1 / d1 > n2 / d2 ? [n1, d1] : [n2, d2];
        const small = n1 / d1 > n2 / d2 ? [n2, d2] : [n1, d1];
        return body(
          `이차방정식 $${fracTerm(bigP, bigL, "x^2", true)}${fracTerm(bigQ, bigL, "x")}${fracTerm(bigR, bigL, "")}=0$의 두 근 중 큰 근을 구하시오.`,
          `$x=${frac(big[0]!, big[1]!)}$`,
          `계수가 분수이므로 양변에 $${bigL}$을 곱하면 $${quadEq(bigP, bigQ, bigR)}$이다.
좌변을 인수분해하면 $(${lead(d1)}x${term(-n1, "")})(${lead(d2)}x${term(-n2, "")})=0$이다.
따라서 두 근은 $x=${frac(small[0]!, small[1]!)}$, $x=${frac(big[0]!, big[1]!)}$이고 큰 근은 $x=${frac(big[0]!, big[1]!)}$이다.`,
          {
            ea: bigP,
            eb: bigQ,
            ec: bigR,
            n1: small[0]!,
            d1: small[1]!,
            n2: big[0]!,
            d2: big[1]!,
            mode,
            x: big[0]!,
          },
        );
      }
      const p = intBetween(rng, -5, 2);
      const q = intBetween(rng, p + 1, 5);
      const s = nonZero(rng, 1, 5);
      const t = nonZero(rng, 1, 5);
      const u = s + t + p + q;
      const v = s * t - p * q;
      if (u === 0) return null;
      return body(
        `이차방정식 $(x${term(s, "")})(x${term(t, "")})=${term(u, "x", true)}${term(v, "")}$을 푸시오.`,
        `$x=${p}$ 또는 $x=${q}$`,
        `좌변을 전개하면 $x^2${term(s + t, "x")}${term(s * t, "")}=${term(u, "x", true)}${term(v, "")}$이다.
우변을 이항하여 정리하면 $${quadEq(1, s + t - u, s * t - v)}$이고, 인수분해하면 $(x${term(-p, "")})(x${term(-q, "")})=0$이다.
따라서 $x=${p}$ 또는 $x=${q}$이다.`,
        {
          ea: 1,
          eb: s + t - u,
          ec: s * t - v,
          n1: p,
          d1: 1,
          n2: q,
          d2: 1,
          mode,
          x: p,
        },
      );
    }),
  ),

  def(
    MINOR_APPLY,
    "03",
    "공통부분이 있는 이차방정식의 풀이",
    SEC.공식,
    "응용",
    (rng) =>
      attempt(200, () => {
        const mode = pick(rng, [0, 1, 2] as const);
        if (mode === 2) {
          const u2 = intBetween(rng, 1, 6);
          const u1 = -intBetween(rng, 1, 6);
          const k = u1 + u2;
          const n = -u1 * u2;
          if (k === 0) return null;
          return body(
            `$(x-y)(x-y${term(-k, "")})=${n}$일 때, $x-y$의 값을 구하시오. (단, $x>y$)`,
            `$${u2}$`,
            `$x-y=A$로 놓으면 $A(A${term(-k, "")})=${n}$, 즉 $${quadEq(1, -k, -n)}$이다.
좌변을 인수분해하면 $(A${term(-u1, "")})(A${term(-u2, "")})=0$이므로 $A=${u1}$ 또는 $A=${u2}$이다.
$x>y$이므로 $A=x-y>0$이다. 따라서 $x-y=${u2}$이다.`,
            { A: 1, B: -k, C: -n, p: 0, u1, u2, k, n, mode, x: u2 },
          );
        }
        const u1 = intBetween(rng, -5, 2);
        const u2 = intBetween(rng, u1 + 1, 5);
        const bigA = intBetween(rng, 1, 3);
        const p = nonZero(rng, 1, 5);
        const bigB = -bigA * (u1 + u2);
        const bigC = bigA * u1 * u2;
        if (bigB === 0) return null;
        const inner = `(x${term(p, "")})`;
        const eq = `${lead(bigA)}${inner}^2${term(bigB, inner)}${term(bigC, "")}=0`;
        const r1 = u1 - p;
        const r2 = u2 - p;
        if (mode === 1) {
          return body(
            `이차방정식 $${eq}$을 푸시오.`,
            `$x=${r1}$ 또는 $x=${r2}$`,
            `$x${term(p, "")}=A$로 놓으면 $${quadEq(bigA, bigB, bigC)}$이다.
인수분해하면 $${lead(bigA)}(A${term(-u1, "")})(A${term(-u2, "")})=0$이므로 $A=${u1}$ 또는 $A=${u2}$이다.
$A=x${term(p, "")}$이므로 $x=${r1}$ 또는 $x=${r2}$이다.`,
            { A: bigA, B: bigB, C: bigC, p, u1, u2, k: 0, n: 0, mode, x: r1 },
          );
        }
        return body(
          `이차방정식 $${eq}$의 두 근을 $\\alpha$, $\\beta$라 할 때, $2\\alpha+\\beta$의 값을 구하시오. (단, $\\alpha<\\beta$)`,
          `$${2 * r1 + r2}$`,
          `$x${term(p, "")}=A$로 놓으면 $${quadEq(bigA, bigB, bigC)}$이고, $A=${u1}$ 또는 $A=${u2}$이다.
$A=x${term(p, "")}$이므로 $x=${r1}$ 또는 $x=${r2}$이고, $\\alpha<\\beta$이므로 $\\alpha=${Math.min(r1, r2)}$, $\\beta=${Math.max(r1, r2)}$이다.
따라서 $2\\alpha+\\beta=${2 * Math.min(r1, r2) + Math.max(r1, r2)}$이다.`,
          {
            A: bigA,
            B: bigB,
            C: bigC,
            p,
            u1,
            u2,
            k: 0,
            n: 0,
            mode,
            x: 2 * Math.min(r1, r2) + Math.max(r1, r2),
          },
        );
      }),
  ),

  def(MINOR_APPLY, "04", "이차방정식의 근의 개수", SEC.공식, "기본", (rng) =>
    attempt(200, () => {
      const mode = pick(rng, [0, 1, 2] as const);
      const ca = intBetween(rng, 1, 3);
      if (mode === 1) {
        const k = intBetween(rng, 1, 6);
        const cb = 2 * ca * k;
        const cc = ca * k * k;
        return body(
          `이차방정식 $${quadEq(ca, cb, cc)}$의 근의 개수를 구하시오.`,
          `$1$`,
          `$b^2-4ac=${cb}^2-4\\times${ca}\\times${cc}=0$이다.
$b^2-4ac=0$이면 중근을 가지므로 근의 개수는 $1$이다.`,
          { ca, cb, cc, D: 0, mode, x: 1 },
        );
      }
      const cb = nonZero(rng, 1, 9);
      const cc = nonZero(rng, 1, 9);
      const bigD = cb * cb - 4 * ca * cc;
      if (mode === 0 && bigD <= 0) return null;
      if (mode === 2 && bigD >= 0) return null;
      const count = mode === 0 ? 2 : 0;
      return body(
        `이차방정식 $${quadEq(ca, cb, cc)}$의 근의 개수를 구하시오.`,
        `$${count}$`,
        `$b^2-4ac=(${cb})^2-4\\times${ca}\\times(${cc})=${bigD}$이다.
$b^2-4ac${bigD > 0 ? ">" : "<"}0$이므로 근의 개수는 $${count}$이다.`,
        { ca, cb, cc, D: bigD, mode, x: count },
      );
    }),
  ),

  def(
    MINOR_APPLY,
    "05",
    "이차방정식이 중근을 가질 조건",
    SEC.공식,
    "응용",
    (rng) =>
      attempt(200, () => {
        const mode = pick(rng, [0, 1, 2] as const);
        if (mode === 1) {
          const bigB = intBetween(rng, 1, 8);
          const alpha = intBetween(rng, 1, 3);
          const k = nonZero(rng, 1, 6);
          const beta = bigB * bigB - alpha * k;
          const constText = `${alpha === 1 ? "" : alpha}k${term(beta, "")}`;
          return body(
            `이차방정식 $x^2+${2 * bigB}x+${constText}=0$이 중근 $x=a$를 가질 때, $k+a$의 값을 구하시오.`,
            `$${k - bigB}$`,
            `중근을 가질 조건은 $b^2-4ac=0$이므로 $${2 * bigB}^2-4\\times(${constText})=0$이다.
$${constText}=${bigB * bigB}$에서 $k=${k}$이고, 이때 $(x+${bigB})^2=0$이므로 $a=${-bigB}$이다.
따라서 $k+a=${k}+(${-bigB})=${k - bigB}$이다.`,
            {
              A: 1,
              C: 0,
              p: 0,
              s: 0,
              B: bigB,
              alpha,
              beta,
              k,
              mode,
              x: k - bigB,
            },
          );
        }
        const bigA = intBetween(rng, 1, 3);
        const s = intBetween(rng, 2, 9);
        if ((s * s) % bigA !== 0) return null;
        const bigC = (s * s) / bigA;
        if (mode === 2) {
          return body(
            `이차방정식 $${lead(bigA)}x^2+ax+${bigC}=0$이 음수인 중근을 가질 때, 상수 $a$의 값을 구하시오.`,
            `$${2 * s}$`,
            `중근을 가질 조건은 $a^2-4\\times${bigA}\\times${bigC}=0$이므로 $a^2=${4 * s * s}$, 즉 $a=${2 * s}$ 또는 $a=${-2 * s}$이다.
중근은 $x=-\\dfrac{a}{${2 * bigA}}$이고 이 값이 음수이려면 $a>0$이어야 한다.
따라서 $a=${2 * s}$이다.`,
            {
              A: bigA,
              C: bigC,
              p: 0,
              s,
              B: 0,
              alpha: 0,
              beta: 0,
              k: 0,
              mode,
              x: 2 * s,
            },
          );
        }
        const p = intBetween(rng, 1, 9);
        return body(
          `이차방정식 $${lead(bigA)}x^2-(a${term(p, "")})x+${bigC}=0$이 중근을 갖도록 하는 모든 상수 $a$의 값의 합을 구하시오.`,
          `$${-2 * p}$`,
          `중근을 가질 조건은 $(a${term(p, "")})^2-4\\times${bigA}\\times${bigC}=0$이다.
$(a${term(p, "")})^2=${4 * s * s}$이므로 $a${term(p, "")}=${2 * s}$ 또는 $a${term(p, "")}=${-2 * s}$, 즉 $a=${2 * s - p}$ 또는 $a=${-2 * s - p}$이다.
따라서 모든 $a$의 값의 합은 $${2 * s - p}+(${-2 * s - p})=${-2 * p}$이다.`,
          {
            A: bigA,
            C: bigC,
            p,
            s,
            B: 0,
            alpha: 0,
            beta: 0,
            k: 0,
            mode,
            x: -2 * p,
          },
        );
      }),
  ),

  def(
    MINOR_APPLY,
    "06",
    "근을 가질 조건에 따른 미지수의 값의 범위 구하기",
    SEC.공식,
    "응용",
    (rng) =>
      attempt(200, () => {
        const mode = pick(rng, [0, 1, 2, 3] as const);
        const m = intBetween(rng, 1, 7);
        if (mode === 3) {
          return body(
            `이차방정식 $x^2+${2 * m}x+p=0$이 근을 갖지 않도록 하는 가장 작은 정수 $p$의 값을 구하시오.`,
            `$${m * m + 1}$`,
            `근을 갖지 않을 조건은 $b^2-4ac<0$이므로 $${2 * m}^2-4p<0$이다.
$p>${m * m}$이므로 이를 만족시키는 가장 작은 정수는 $${m * m + 1}$이다.`,
            {
              m,
              alpha: 1,
              beta: 0,
              bound: m * m + 1,
              less: 0,
              strict: 1,
              rel: 2,
              mode,
              x: m * m + 1,
            },
          );
        }
        const alpha = pick(rng, [1, -1] as const);
        const beta = nonZero(rng, 1, 8);
        const base = m * m - beta;
        const bound = alpha === 1 ? base : -base;
        // α=1 이면 p < base 쪽, α=−1 이면 p > −base 쪽이 «판별식이 양수» 쪽이다.
        const posIsLess = alpha === 1;
        const rel = mode;
        const wantPositive = mode !== 2;
        const less = wantPositive === posIsLess;
        const strict = mode !== 1;
        const sym = strict ? (less ? "<" : ">") : less ? "\\leq" : "\\geq";
        const label = ["서로 다른 두 근을 가질", "근을 가질", "근을 갖지 않을"][
          mode
        ]!;
        const dText = ["$b^2-4ac>0$", "$b^2-4ac\\geq 0$", "$b^2-4ac<0$"][mode]!;
        // ⚠️ alpha=-1 이면 이 상수항은 `-p…` 로 시작한다. 앞에 `+` 를 붙여 쓰면
        //    지면에 **`+-p`** 가 그대로 나간다(실측 2026-08-24). 그래서 두 꼴로 나눈다 —
        //    **이어 붙일 때**는 부호를 지닌 `constText`, **홑으로 설 때**는 `constBody`.
        const constBody = `${alpha === 1 ? "" : "-"}p${term(beta, "")}`;
        const constText = `${alpha === 1 ? "+" : ""}${constBody}`;
        return body(
          `이차방정식 $x^2-${2 * m}x${constText}=0$이 ${label} 때, 상수 $p$의 값의 범위를 구하시오.`,
          `$p${sym} ${bound}$`,
          `${label} 조건은 ${dText}이다.
$(-${2 * m})^2-4(${constBody})${strict ? (wantPositive ? ">" : "<") : "\\geq"} 0$에서 $${constBody}${wantPositive ? (strict ? "<" : "\\leq") : ">"} ${m * m}$이다.
따라서 $p${sym} ${bound}$이다.`,
          {
            m,
            alpha,
            beta,
            bound,
            less: less ? 1 : 0,
            strict: strict ? 1 : 0,
            rel,
            mode,
            x: bound,
          },
        );
      }),
  ),

  def(
    MINOR_APPLY,
    "07",
    "두 근이 주어질 때 이차방정식 구하기",
    SEC.공식,
    "응용",
    (rng) =>
      attempt(200, () => {
        const mode = pick(rng, [0, 1, 2] as const);
        if (mode === 1) {
          const r = nonZero(rng, 1, 7);
          const a = -2 * r;
          const b = r * r;
          return body(
            `이차방정식 $x^2+ax+b=0$이 중근 $x=${r}$을 가질 때, 상수 $a$, $b$에 대하여 $a+b$의 값을 구하시오.`,
            `$${a + b}$`,
            `중근이 $x=${r}$이고 $x^2$의 계수가 $1$이므로 $(x${term(-r, "")})^2=0$이다.
전개하면 $${quadEq(1, a, b)}$이므로 $a=${a}$, $b=${b}$이다.
따라서 $a+b=${a + b}$이다.`,
            { A: 1, n1: r, d1: 1, n2: r, d2: 1, a, b, mode, x: a + b },
          );
        }
        if (mode === 2) {
          const p = intBetween(rng, -6, 2);
          const q = intBetween(rng, p + 1, 6);
          const a = -(p + q);
          const b = p * q;
          return body(
            `두 근이 $${p}$, $${q}$이고 $x^2$의 계수가 $1$인 이차방정식이 $x^2+ax+b=0$일 때, 상수 $a$, $b$에 대하여 $ab$의 값을 구하시오.`,
            `$${a * b}$`,
            `두 근이 $${p}$, $${q}$이고 $x^2$의 계수가 $1$이므로 $(x${term(-p, "")})(x${term(-q, "")})=0$이다.
전개하면 $${quadEq(1, a, b)}$이므로 $a=${a}$, $b=${b}$이다.
따라서 $ab=${a}\\times${b}=${a * b}$이다.`,
            { A: 1, n1: p, d1: 1, n2: q, d2: 1, a, b, mode, x: a * b },
          );
        }
        const d1 = pick(rng, [1, 2, 3] as const);
        const d2 = pick(rng, [1, 2, 3] as const);
        const n1 = nonZero(rng, 1, 5);
        const n2 = nonZero(rng, 1, 5);
        if (gcd(n1, d1) !== 1 || gcd(n2, d2) !== 1) return null;
        if (n1 * d2 === n2 * d1) return null;
        const k = pick(rng, [1, 2] as const);
        const bigA = d1 * d2 * k;
        const a = -k * (d2 * n1 + d1 * n2);
        const b = k * n1 * n2;
        return body(
          `이차방정식 $${lead(bigA)}x^2+ax+b=0$의 두 근이 $${frac(n1, d1)}$, $${frac(n2, d2)}$일 때, 상수 $a$, $b$에 대하여 $a-b$의 값을 구하시오.`,
          `$${a - b}$`,
          `두 근이 $${frac(n1, d1)}$, $${frac(n2, d2)}$이고 $x^2$의 계수가 $${bigA}$이므로
$${k === 1 ? "" : k}(${lead(d1)}x${term(-n1, "")})(${lead(d2)}x${term(-n2, "")})=0$, 즉 $${quadEq(bigA, a, b)}$이다.
따라서 $a=${a}$, $b=${b}$이므로 $a-b=${a - b}$이다.`,
          { A: bigA, n1, d1, n2, d2, a, b, mode, x: a - b },
        );
      }),
  ),

  def(
    MINOR_APPLY,
    "08",
    "이차방정식의 활용 식이 주어진 문제",
    SEC.활용,
    "응용",
    (rng) =>
      attempt(200, () => {
        const mode = pick(rng, [0, 1, 2] as const);
        if (mode === 0) {
          const n = intBetween(rng, 5, 20);
          const val = (n * (n - 3)) / 2;
          return body(
            `$n$각형의 대각선의 개수는 $\\dfrac{n(n-3)}{2}$이다. 대각선의 개수가 $${val}$인 다각형에 대하여 $n$의 값을 구하시오.`,
            `$${n}$`,
            `$\\dfrac{n(n-3)}{2}=${val}$에서 $n^2-3n-${2 * val}=0$이다.
인수분해하면 $(n-${n})(n+${n - 3})=0$이므로 $n=${n}$ 또는 $n=${3 - n}$이다.
$n$은 $3$ 이상의 자연수이므로 $n=${3 - n}$은 버린다. 따라서 $n=${n}$이다.`,
            { n, val, mode, x: n },
          );
        }
        if (mode === 1) {
          const n = intBetween(rng, 8, 30);
          const val = (n * (n + 1)) / 2;
          return body(
            `$1$부터 자연수 $n$까지의 합은 $\\dfrac{n(n+1)}{2}$이다. 그 합이 $${val}$이 되도록 하는 $n$의 값을 구하시오.`,
            `$${n}$`,
            `$\\dfrac{n(n+1)}{2}=${val}$에서 $n^2+n-${2 * val}=0$이다.
인수분해하면 $(n-${n})(n+${n + 1})=0$이므로 $n=${n}$ 또는 $n=${-n - 1}$이다.
$n$은 자연수이므로 $n=${-n - 1}$은 버린다. 따라서 $n=${n}$이다.`,
            { n, val, mode, x: n },
          );
        }
        const n = intBetween(rng, 6, 20);
        const val = (n * (n - 1)) / 2;
        return body(
          `$n$명 중에서 대표 $2$명을 뽑는 경우의 수는 $\\dfrac{n(n-1)}{2}$이다. 어느 동아리에서 대표 $2$명을 뽑는 경우의 수가 $${val}$일 때, 이 동아리의 회원 수를 구하시오.`,
          `$${n}$`,
          `회원 수를 $n$이라 하면 $\\dfrac{n(n-1)}{2}=${val}$에서 $n^2-n-${2 * val}=0$이다.
인수분해하면 $(n-${n})(n+${n - 1})=0$이므로 $n=${n}$ 또는 $n=${1 - n}$이다.
$n$은 자연수이므로 $n=${1 - n}$은 버린다. 따라서 회원 수는 $${n}$이다.`,
          { n, val, mode, x: n },
        );
      }),
  ),

  def(
    MINOR_APPLY,
    "09",
    "이차방정식의 활용 수에 대한 문제",
    SEC.활용,
    "응용",
    (rng) =>
      attempt(200, () => {
        const mode = pick(rng, [0, 1, 2, 3] as const);
        if (mode === 0) {
          const n = intBetween(rng, 2, 9);
          const bigS = 8 * n * n + 2;
          return body(
            `연속하는 두 홀수인 자연수의 제곱의 합이 $${bigS}$일 때, 두 수 중 큰 수를 구하시오.`,
            `$${2 * n + 1}$`,
            `연속하는 두 홀수를 $2k-1$, $2k+1$이라 하면 $(2k-1)^2+(2k+1)^2=${bigS}$이다.
정리하면 $8k^2+2=${bigS}$, 즉 $k^2=${n * n}$이므로 $k=${n}$ 또는 $k=${-n}$이다.
두 수가 자연수이므로 $k=${-n}$은 버린다. 따라서 큰 수는 $2\\times${n}+1=${2 * n + 1}$이다.`,
            { n, S: bigS, K: 0, s: 0, d: 0, N: 0, mode, x: 2 * n + 1 },
          );
        }
        if (mode === 1) {
          const n = intBetween(rng, 4, 12);
          const bigK = 3 * n * (n - 1) - (n + 1) * (n + 1);
          if (bigK <= 0) return null;
          return body(
            `연속하는 세 자연수가 있다. 가장 큰 수의 제곱이 다른 두 수의 곱의 $3$배보다 $${bigK}$만큼 작을 때, 이 세 자연수의 합을 구하시오.`,
            `$${3 * n}$`,
            `세 자연수를 $k-1$, $k$, $k+1$이라 하면 $(k+1)^2=3(k-1)k-${bigK}$이다.
정리하면 $2k^2-5k-${bigK + 1}=0$이고, 이 방정식의 해는 $k=${n}$ 또는 $k=${frac(-(bigK + 1), 2 * n)}$이다.
$k$는 $2$ 이상의 자연수이므로 $k=${frac(-(bigK + 1), 2 * n)}$은 버린다. 따라서 세 수의 합은 $3k=${3 * n}$이다.`,
            { n, S: 0, K: bigK, s: 0, d: 0, N: 0, mode, x: 3 * n },
          );
        }
        if (mode === 2) {
          const t = intBetween(rng, 2, 9);
          const u = intBetween(rng, 1, 9);
          const bigN = 10 * t + u;
          const s = t + u;
          const d = bigN - t * u;
          if (d <= 0) return null;
          let hits = 0;
          for (let v = 10; v <= 99; v += 1) {
            const t2 = Math.floor(v / 10);
            const u2 = v % 10;
            if (t2 + u2 === s && v - t2 * u2 === d) hits += 1;
          }
          if (hits !== 1) return null;
          return body(
            `두 자리 자연수가 있다. 이 수의 십의 자리의 숫자와 일의 자리의 숫자의 합은 $${s}$이고, 두 숫자의 곱은 이 수보다 $${d}$만큼 작다고 한다. 이 수를 구하시오.`,
            `$${bigN}$`,
            `일의 자리의 숫자를 $k$라 하면 십의 자리의 숫자는 $${s}-k$이고, 이 수는 $10(${s}-k)+k=${10 * s}-9k$이다.
두 숫자의 곱이 이 수보다 $${d}$만큼 작으므로 $(${s}-k)k=${10 * s}-9k-${d}$, 즉 $k^2-${s + 9}k+${10 * s - d}=0$이다.
인수분해하면 $(k-${u})(k-${s + 9 - u})=0$이고, $k$는 한 자리 자연수이므로 $k=${s + 9 - u}$은 버린다. 따라서 구하는 수는 $${bigN}$이다.`,
            { n: 0, S: 0, K: 0, s, d, N: bigN, mode, x: bigN },
          );
        }
        const n = intBetween(rng, 5, 15);
        const bigK = 2 * n * n - (n + 2) * (n + 2);
        if (bigK <= 0) return null;
        return body(
          `어떤 자연수를 제곱하여 $2$배를 해야 할 것을 잘못하여 그 수에 $2$를 더한 후 제곱하였더니 원래 구하려던 값보다 $${bigK}$만큼 작아졌다. 어떤 자연수를 구하시오.`,
          `$${n}$`,
          `어떤 자연수를 $k$라 하면 $(k+2)^2=2k^2-${bigK}$이다.
정리하면 $k^2-4k-${bigK + 4}=0$이고, 인수분해하면 $(k-${n})(k+${n - 4})=0$이므로 $k=${n}$ 또는 $k=${4 - n}$이다.
$k$는 자연수이므로 $k=${4 - n}$은 버린다. 따라서 구하는 자연수는 $${n}$이다.`,
          { n, S: 0, K: bigK, s: 0, d: 0, N: 0, mode, x: n },
        );
      }),
  ),

  def(
    MINOR_APPLY,
    "10",
    "이차방정식의 활용 실생활에 대한 문제",
    SEC.활용,
    "응용",
    (rng) =>
      attempt(200, () => {
        const mode = pick(rng, [0, 1, 2] as const);
        if (mode === 0) {
          const n = intBetween(rng, 10, 25);
          const d = intBetween(rng, 1, 5);
          const bigT = n * (n - d);
          return body(
            `볼펜 $${bigT}$개를 몇 명의 학생에게 남김없이 똑같이 나누어 주었다. 학생 한 명이 받은 볼펜의 개수가 학생 수보다 $${d}$만큼 작다고 할 때, 학생은 모두 몇 명인지 구하시오.`,
            `$${n}$`,
            `학생 수를 $k$라 하면 한 명이 받은 볼펜의 개수는 $k-${d}$이므로 $k(k-${d})=${bigT}$이다.
정리하면 $k^2-${d}k-${bigT}=0$이고, 인수분해하면 $(k-${n})(k+${n - d})=0$이므로 $k=${n}$ 또는 $k=${d - n}$이다.
학생 수는 자연수이므로 $k=${d - n}$은 버린다. 따라서 학생은 $${n}$명이다.`,
            { n, d, T: bigT, D: 0, P: 0, b: 0, g: 0, K: 0, mode, x: n },
          );
        }
        if (mode === 1) {
          const d1 = intBetween(rng, 1, 24);
          const bigP = d1 * (d1 + 7);
          return body(
            `어느 달의 달력에서 위아래로 이웃한 두 날짜의 수의 곱이 $${bigP}$이었다. 두 날짜 중 빠른 날짜를 구하시오.`,
            `$${d1}$`,
            `빠른 날짜를 $k$라 하면 아래쪽 날짜는 $k+7$이므로 $k(k+7)=${bigP}$이다.
정리하면 $k^2+7k-${bigP}=0$이고, 인수분해하면 $(k-${d1})(k+${d1 + 7})=0$이므로 $k=${d1}$ 또는 $k=${-d1 - 7}$이다.
날짜는 자연수이므로 $k=${-d1 - 7}$은 버린다. 따라서 빠른 날짜는 $${d1}$일이다.`,
            { n: 0, d: 0, T: 0, D: d1, P: bigP, b: 0, g: 0, K: 0, mode, x: d1 },
          );
        }
        const b = intBetween(rng, 6, 15);
        const g = intBetween(rng, 3, Math.max(3, Math.floor(0.7 * b)));
        const bigK = 3 * b * b - (b + g) * (b + g);
        if (bigK <= 0 || b <= g) return null;
        return body(
          `형과 동생의 나이의 차는 $${g}$살이고, 동생의 나이의 제곱의 $3$배는 형의 나이의 제곱보다 $${bigK}$만큼 많다고 한다. 동생의 나이를 구하시오.`,
          `$${b}$`,
          `동생의 나이를 $k$라 하면 형의 나이는 $k+${g}$이므로 $3k^2=(k+${g})^2+${bigK}$이다.
정리하면 $2k^2-${2 * g}k-${g * g + bigK}=0$이고, 이 방정식의 해는 $k=${b}$ 또는 $k=${g - b}$이다.
나이는 자연수이므로 $k=${g - b}$은 버린다. 따라서 동생의 나이는 $${b}$살이다.`,
          { n: 0, d: 0, T: 0, D: 0, P: 0, b, g, K: bigK, mode, x: b },
        );
      }),
  ),

  def(
    MINOR_APPLY,
    "11",
    "이차방정식의 활용 쏘아 올린 물체에 대한 문제",
    SEC.활용,
    "응용",
    (rng) =>
      attempt(200, () => {
        const mode = pick(rng, [0, 1, 2] as const);
        if (mode === 1) {
          const bigT = intBetween(rng, 4, 12);
          const v = 5 * bigT;
          return body(
            `지면에서 초속 $${v}\\,\\mathrm{m}$로 똑바로 위로 쏘아 올린 물체의 $x$초 후의 지면으로부터의 높이는 $(-5x^2+${v}x)\\,\\mathrm{m}$라 한다. 이 물체가 지면에 떨어지는 것은 쏘아 올린 지 몇 초 후인지 구하시오.`,
            `$${bigT}$`,
            `지면에 떨어질 때의 높이는 $0\\,\\mathrm{m}$이므로 $-5x^2+${v}x=0$이다.
인수분해하면 $-5x(x-${bigT})=0$이므로 $x=0$ 또는 $x=${bigT}$이다.
$x=0$은 쏘아 올린 순간이므로 버린다. 따라서 $${bigT}$초 후이다.`,
            { v, h0: 0, H: 0, t1: 0, t2: bigT, mode, x: bigT },
          );
        }
        const t1 = intBetween(rng, 1, 4);
        const t2 = intBetween(rng, t1 + 1, 8);
        const v = 5 * (t1 + t2);
        const h0 = 10 * intBetween(rng, 2, 20);
        const bigH = h0 + 5 * t1 * t2;
        const expr = `(-5x^2+${v}x+${h0})`;
        if (mode === 0) {
          return body(
            `지면으로부터 $${h0}\\,\\mathrm{m}$ 높이의 건물 옥상에서 초속 $${v}\\,\\mathrm{m}$로 똑바로 위로 쏘아 올린 물체의 $x$초 후의 지면으로부터의 높이는 $${expr}\\,\\mathrm{m}$라 한다. 이 물체의 높이가 처음으로 $${bigH}\\,\\mathrm{m}$가 되는 것은 쏘아 올린 지 몇 초 후인지 구하시오.`,
            `$${t1}$`,
            `$-5x^2+${v}x+${h0}=${bigH}$에서 $5x^2-${v}x+${5 * t1 * t2}=0$, 즉 $x^2-${t1 + t2}x+${t1 * t2}=0$이다.
인수분해하면 $(x-${t1})(x-${t2})=0$이므로 $x=${t1}$ 또는 $x=${t2}$이다.
$x=${t2}$는 내려오면서 다시 그 높이가 되는 때이므로 버린다. 따라서 처음으로 그 높이가 되는 것은 $${t1}$초 후이다.`,
            { v, h0, H: bigH, t1, t2, mode, x: t1 },
          );
        }
        return body(
          `지면으로부터 $${h0}\\,\\mathrm{m}$ 높이의 건물 옥상에서 초속 $${v}\\,\\mathrm{m}$로 똑바로 위로 쏘아 올린 물체의 $x$초 후의 지면으로부터의 높이는 $${expr}\\,\\mathrm{m}$라 한다. 이 물체가 높이 $${bigH}\\,\\mathrm{m}$ 이상인 지점을 지나는 것은 몇 초 동안인지 구하시오.`,
          `$${t2 - t1}$`,
          `$-5x^2+${v}x+${h0}=${bigH}$에서 $x^2-${t1 + t2}x+${t1 * t2}=0$이므로 $x=${t1}$ 또는 $x=${t2}$이다.
두 근 모두 조건을 만족시키므로 높이가 $${bigH}\\,\\mathrm{m}$ 이상인 것은 $${t1}$초 후부터 $${t2}$초 후까지이다.
따라서 구하는 시간은 $${t2}-${t1}=${t2 - t1}$(초) 동안이다.`,
          { v, h0, H: bigH, t1, t2, mode, x: t2 - t1 },
        );
      }),
  ),

  def(
    MINOR_APPLY,
    "12",
    "이차방정식의 활용 도형에 대한 문제",
    SEC.활용,
    "응용",
    (rng) =>
      attempt(200, () => {
        const mode = pick(rng, [0, 1, 2] as const);
        if (mode === 0) {
          const a = intBetween(rng, 5, 15);
          const b = intBetween(rng, 5, 15);
          const inc = intBetween(rng, 1, 6);
          const bigS = inc * inc + (a + b) * inc;
          return body(
            `가로, 세로의 길이가 각각 $${a}\\,\\mathrm{m}$, $${b}\\,\\mathrm{m}$인 직사각형 모양의 화단이 있다. 가로의 길이와 세로의 길이를 각각 똑같은 길이만큼 늘였더니 넓이가 처음보다 $${bigS}\\,\\mathrm{m^2}$만큼 늘어났다. 몇 $\\mathrm{m}$만큼 늘인 것인지 구하시오.`,
            `$${inc}$`,
            `늘인 길이를 $k\\,\\mathrm{m}$라 하면 $(${a}+k)(${b}+k)=${a * b}+${bigS}$이다.
정리하면 $k^2+${a + b}k-${bigS}=0$이고, 인수분해하면 $(k-${inc})(k+${a + b + inc})=0$이므로 $k=${inc}$ 또는 $k=${-(a + b + inc)}$이다.
길이는 양수이므로 $k=${-(a + b + inc)}$은 버린다. 따라서 $${inc}\\,\\mathrm{m}$만큼 늘였다.`,
            {
              a,
              b,
              inc,
              S: bigS,
              L: 0,
              big: 0,
              small: 0,
              AB: 0,
              BC: 0,
              t1: 0,
              t2: 0,
              mode,
              x: inc,
            },
          );
        }
        if (mode === 1) {
          const bigL = intBetween(rng, 8, 20);
          const big = intBetween(rng, Math.floor(bigL / 2) + 1, bigL - 1);
          const small = bigL - big;
          if (small <= 0 || big === small) return null;
          const bigS = big * big + small * small;
          return body(
            `두 정사각형의 한 변의 길이의 합이 $${bigL}\\,\\mathrm{cm}$이고 넓이의 합이 $${bigS}\\,\\mathrm{cm^2}$일 때, 큰 정사각형의 한 변의 길이를 구하시오.`,
            `$${big}$`,
            `큰 정사각형의 한 변의 길이를 $k\\,\\mathrm{cm}$라 하면 작은 정사각형의 한 변의 길이는 $${bigL}-k$이므로 $k^2+(${bigL}-k)^2=${bigS}$이다.
정리하면 $k^2-${bigL}k+${(bigL * bigL - bigS) / 2}=0$이고, 인수분해하면 $(k-${big})(k-${small})=0$이므로 $k=${big}$ 또는 $k=${small}$이다.
큰 정사각형의 한 변이므로 $k=${small}$은 버린다. 따라서 $${big}\\,\\mathrm{cm}$이다.`,
            {
              a: 0,
              b: 0,
              inc: 0,
              S: bigS,
              L: bigL,
              big,
              small,
              AB: 0,
              BC: 0,
              t1: 0,
              t2: 0,
              mode,
              x: big,
            },
          );
        }
        const bigAB = intBetween(rng, 6, 16);
        const t1 = intBetween(rng, 1, Math.floor((bigAB - 1) / 2));
        const t2 = bigAB - t1;
        if (t1 >= t2) return null;
        const bigS = t1 * (bigAB - t1);
        const bigBC = 2 * t2 + 2;
        return body(
          `직사각형 $ABCD$에서 $\\overline{AB}=${bigAB}\\,\\mathrm{cm}$, $\\overline{BC}=${bigBC}\\,\\mathrm{cm}$이다. 점 $P$는 점 $A$를 출발하여 점 $B$까지 매초 $1\\,\\mathrm{cm}$의 속력으로 $\\overline{AB}$ 위를 움직이고, 점 $Q$는 점 $B$를 출발하여 점 $C$까지 매초 $2\\,\\mathrm{cm}$의 속력으로 $\\overline{BC}$ 위를 움직인다. 두 점 $P$, $Q$가 동시에 출발할 때, 삼각형 $PBQ$의 넓이가 $${bigS}\\,\\mathrm{cm^2}$가 되는 것은 출발한 지 몇 초 후인지 모두 구하시오.`,
          `$${t1}$초 후 또는 $${t2}$초 후`,
          `출발한 지 $k$초 후라 하면 $\\overline{PB}=${bigAB}-k$, $\\overline{BQ}=2k$이므로 넓이는 $\\dfrac{1}{2}(${bigAB}-k)\\times 2k=k(${bigAB}-k)$이다.
$k(${bigAB}-k)=${bigS}$에서 $k^2-${bigAB}k+${bigS}=0$이고, 인수분해하면 $(k-${t1})(k-${t2})=0$이다.
$0<k<${bigAB}$이고 $2k\\leq ${bigBC}$이므로 두 값 모두 조건을 만족시킨다. 따라서 $${t1}$초 후와 $${t2}$초 후이다.`,
          {
            a: 0,
            b: 0,
            inc: 0,
            S: bigS,
            L: 0,
            big: 0,
            small: 0,
            AB: bigAB,
            BC: bigBC,
            t1,
            t2,
            mode,
            x: t1,
          },
        );
      }),
  ),

  def(
    MINOR_APPLY,
    "13",
    "이차방정식의 활용 길의 폭에 대한 문제",
    SEC.활용,
    "응용",
    (rng) =>
      attempt(200, () => {
        const mode = pick(rng, [0, 1, 2] as const);
        if (mode === 0) {
          const side = intBetween(rng, 12, 30);
          const w = intBetween(rng, 1, 5);
          const bigS = (side - w) * (side - w);
          return body(
            `한 변의 길이가 $${side}\\,\\mathrm{m}$인 정사각형 모양의 땅에 폭이 일정한 십자 모양의 길을 내었더니 길을 제외한 땅의 넓이가 $${bigS}\\,\\mathrm{m^2}$가 되었다. 길의 폭을 구하시오.`,
            `$${w}$`,
            `길의 폭을 $k\\,\\mathrm{m}$라 하면 남은 땅은 한 변의 길이가 $${side}-k$인 정사각형이므로 $(${side}-k)^2=${bigS}$이다.
$${side}-k=\\pm${side - w}$이므로 $k=${w}$ 또는 $k=${side + (side - w)}$이다.
$0<k<${side}$이어야 하므로 $k=${side + (side - w)}$은 버린다. 따라서 길의 폭은 $${w}\\,\\mathrm{m}$이다.`,
            {
              side,
              w,
              S: bigS,
              a: 0,
              b: 0,
              y: 0,
              k: 0,
              mode,
              x: w,
            },
          );
        }
        if (mode === 1) {
          const a = intBetween(rng, 10, 25);
          const b = intBetween(rng, 10, 25);
          if (a === b) return null;
          const w = intBetween(rng, 1, 5);
          const bigS = (a - w) * (b - w);
          return body(
            `가로의 길이가 $${a}\\,\\mathrm{m}$, 세로의 길이가 $${b}\\,\\mathrm{m}$인 직사각형 모양의 땅에 폭이 일정한 십자 모양의 길을 만들려고 한다. 길을 제외한 땅의 넓이가 $${bigS}\\,\\mathrm{m^2}$가 되도록 하려면 길의 폭을 몇 $\\mathrm{m}$로 해야 하는지 구하시오.`,
            `$${w}$`,
            `길의 폭을 $k\\,\\mathrm{m}$라 하면 길을 제외한 땅은 가로 $${a}-k$, 세로 $${b}-k$인 직사각형이므로 $(${a}-k)(${b}-k)=${bigS}$이다.
정리하면 $k^2-${a + b}k+${a * b - bigS}=0$이고, 인수분해하면 $(k-${w})(k-${a + b - w})=0$이므로 $k=${w}$ 또는 $k=${a + b - w}$이다.
$0<k<${Math.min(a, b)}$이어야 하므로 $k=${a + b - w}$은 버린다. 따라서 길의 폭은 $${w}\\,\\mathrm{m}$이다.`,
            {
              side: 0,
              w,
              S: bigS,
              a,
              b,
              y: 0,
              k: 0,
              mode,
              x: w,
            },
          );
        }
        const y = intBetween(rng, 8, 20);
        const k = intBetween(rng, 2, 8);
        const w = intBetween(rng, 1, 4);
        // 길의 폭이 «가로−세로 차» 보다 넓으면 남는 땅의 가로가 세로보다 짧아진다.
        if (y <= w || k <= w) return null;
        const bigS = (y + k - w) * (y - w);
        return body(
          `가로의 길이가 세로의 길이보다 $${k}\\,\\mathrm{m}$ 더 긴 직사각형 모양의 땅에 폭이 $${w}\\,\\mathrm{m}$인 십자 모양의 길을 내었더니 길을 제외한 땅의 넓이가 $${bigS}\\,\\mathrm{m^2}$가 되었다. 이 땅의 가로의 길이를 구하시오.`,
          `$${y + k}$`,
          `세로의 길이를 $m\\,\\mathrm{m}$라 하면 가로의 길이는 $m+${k}$이고, 길을 제외한 땅은 가로 $m+${k - w}$, 세로 $m-${w}$인 직사각형이므로 $(m+${k - w})(m-${w})=${bigS}$이다.
정리하면 $m^2${term(k - 2 * w, "m")}-${bigS + w * (k - w)}=0$이고, 이 방정식의 해는 $m=${y}$ 또는 $m=${-(y + k - 2 * w)}$이다.
길이는 양수이므로 $m=${-(y + k - 2 * w)}$은 버린다. 따라서 가로의 길이는 $${y + k}\\,\\mathrm{m}$이다.`,
          {
            side: 0,
            w,
            S: bigS,
            a: 0,
            b: 0,
            y,
            k,
            mode,
            x: y + k,
          },
        );
      }),
  ),

  def(
    MINOR_APPLY,
    "14",
    "이차방정식의 활용 상자를 만드는 문제",
    SEC.활용,
    "심화",
    (rng) =>
      attempt(200, () => {
        const mode = pick(rng, [0, 1, 2] as const);
        if (mode === 0) {
          const h = intBetween(rng, 2, 5);
          const a = intBetween(rng, 4 * h + 1, 4 * h + 12);
          const bigV = h * (a - 2 * h) * (a - 2 * h);
          return body(
            `한 변의 길이가 $x\\,\\mathrm{cm}$인 정사각형 모양의 종이의 네 귀퉁이에서 한 변의 길이가 $${h}\\,\\mathrm{cm}$인 정사각형을 각각 잘라 내고 남은 부분으로 뚜껑이 없는 직육면체 모양의 상자를 만들었더니 부피가 $${bigV}\\,\\mathrm{cm^3}$가 되었다. 처음 정사각형의 한 변의 길이를 구하시오.`,
            `$${a}$`,
            `상자의 밑면은 한 변의 길이가 $x-${2 * h}$인 정사각형이고 높이는 $${h}\\,\\mathrm{cm}$이므로 $${h}(x-${2 * h})^2=${bigV}$이다.
$(x-${2 * h})^2=${(a - 2 * h) * (a - 2 * h)}$에서 $x-${2 * h}=\\pm${a - 2 * h}$이므로 $x=${a}$ 또는 $x=${4 * h - a}$이다.
길이는 양수이므로 $x=${4 * h - a}$은 버린다. 따라서 처음 정사각형의 한 변의 길이는 $${a}\\,\\mathrm{cm}$이다.`,
            {
              h,
              a,
              V: bigV,
              w: 0,
              l: 0,
              c: 0,
              A: 0,
              P: 0,
              h1: 0,
              h2: 0,
              mode,
              x: a,
            },
          );
        }
        if (mode === 1) {
          const c = intBetween(rng, 1, 4);
          const w = intBetween(rng, 2 * c + 3, 24);
          const l = intBetween(rng, w + 1, w + 10);
          // 버리는 근 $(l+w)/2-c$ 가 정수로 떨어져야 해설에 분수가 안 샌다.
          if ((l + w) % 2 !== 0) return null;
          const bigA = (l - 2 * c) * (w - 2 * c);
          return body(
            `가로, 세로의 길이가 각각 $${l}\\,\\mathrm{cm}$, $${w}\\,\\mathrm{cm}$인 직사각형 모양의 종이의 네 귀퉁이에서 크기가 같은 정사각형을 잘라 내고 남은 종이로 뚜껑이 없는 직육면체 모양의 상자를 만들었다. 이 상자의 밑면의 넓이가 $${bigA}\\,\\mathrm{cm^2}$일 때, 상자의 높이를 구하시오.`,
            `$${c}$`,
            `잘라 낸 정사각형의 한 변의 길이를 $k\\,\\mathrm{cm}$라 하면 밑면은 가로 $${l}-2k$, 세로 $${w}-2k$인 직사각형이므로 $(${l}-2k)(${w}-2k)=${bigA}$이다.
정리하면 $4k^2-${2 * (l + w)}k+${l * w - bigA}=0$이고, 이 방정식의 해는 $k=${c}$ 또는 $k=${(l + w) / 2 - c}$이다.
$0<2k<${w}$이어야 하므로 $k=${(l + w) / 2 - c}$은 버린다. 따라서 상자의 높이는 $${c}\\,\\mathrm{cm}$이다.`,
            {
              h: 0,
              a: 0,
              V: 0,
              w,
              l,
              c,
              A: bigA,
              P: 0,
              h1: 0,
              h2: 0,
              mode,
              x: c,
            },
          );
        }
        const half = intBetween(rng, 6, 30);
        const bigP = 2 * half;
        const h1 = intBetween(rng, 1, half - 1);
        const h2 = half - h1;
        if (h1 >= h2) return null;
        const bigA = h1 * (bigP - 2 * h1);
        return body(
          `폭이 $${bigP}\\,\\mathrm{cm}$인 양철판의 양쪽을 같은 높이만큼 직각으로 접어 올려 물받이를 만들려고 한다. 물받이의 단면의 넓이가 $${bigA}\\,\\mathrm{cm^2}$일 때, 물받이의 높이가 될 수 있는 값을 모두 구하시오.`,
          `$${h1}\\,\\mathrm{cm}$ 또는 $${h2}\\,\\mathrm{cm}$`,
          `접어 올린 높이를 $k\\,\\mathrm{cm}$라 하면 단면은 가로 $${bigP}-2k$, 세로 $k$인 직사각형이므로 $k(${bigP}-2k)=${bigA}$이다.
정리하면 $2k^2-${bigP}k+${bigA}=0$이고, 인수분해하면 $2(k-${h1})(k-${h2})=0$이다.
$0<k<${half}$인 두 값 모두 조건을 만족시키므로 높이는 $${h1}\\,\\mathrm{cm}$ 또는 $${h2}\\,\\mathrm{cm}$이다.`,
          {
            h: 0,
            a: 0,
            V: 0,
            w: 0,
            l: 0,
            c: 0,
            A: bigA,
            P: bigP,
            h1,
            h2,
            mode,
            x: h1,
          },
        );
      }),
  ),

  def(
    MINOR_APPLY,
    "15",
    "이차방정식의 활용 닮음을 이용한 문제",
    SEC.활용,
    "심화",
    (rng) =>
      attempt(200, () => {
        const mode = pick(rng, [0, 1, 2] as const);
        if (mode === 2) {
          const p = intBetween(rng, 1, 4);
          const q = intBetween(rng, p + 1, 6);
          if (gcd(p, q) !== 1) return null;
          const t = intBetween(rng, 2, 8);
          const bigS = (p * p + q * q) * t * t;
          return body(
            `닮음비가 $${p} : ${q}$인 두 정사각형이 있다. 두 정사각형의 넓이의 합이 $${bigS}\\,\\mathrm{cm^2}$일 때, 큰 정사각형의 한 변의 길이를 구하시오.`,
            `$${q * t}$`,
            `두 정사각형의 한 변의 길이를 각각 $${p}k\\,\\mathrm{cm}$, $${q}k\\,\\mathrm{cm}$라 하면 $(${p}k)^2+(${q}k)^2=${bigS}$이다.
정리하면 $${p * p + q * q}k^2=${bigS}$, 즉 $k^2=${t * t}$이므로 $k=${t}$ 또는 $k=${-t}$이다.
길이는 양수이므로 $k=${-t}$는 버린다. 따라서 큰 정사각형의 한 변의 길이는 $${q}\\times${t}=${q * t}\\,\\mathrm{cm}$이다.`,
            { m: 0, k: 0, p, q, t, S: bigS, mode, x: q * t },
          );
        }
        const m = mode === 1 ? intBetween(rng, 2, 5) : intBetween(rng, 1, 5);
        const k = 2 * m;
        if (mode === 0) {
          return body(
            `두 직사각형 $ABCD$와 $BCFE$는 닮은 도형이고 $\\square AEFD$는 정사각형이다. $\\overline{AD}=${k}$일 때, $\\overline{AB}$의 길이를 구하시오. (단, 점 $E$는 변 $AB$ 위에, 점 $F$는 변 $DC$ 위에 있다.)`,
            `$${m}+${m === 1 ? "" : m}\\sqrt{5}$`,
            `$\\overline{AB}=t$라 하면 $\\square AEFD$가 정사각형이므로 $\\overline{AE}=\\overline{AD}=${k}$, $\\overline{BE}=t-${k}$이다.
$\\square ABCD\\sim\\square BCFE$이므로 $\\overline{AB}:\\overline{AD}=\\overline{BC}:\\overline{BE}$, 즉 $t:${k}=${k}:(t-${k})$에서 $t^2-${k}t-${k * k}=0$이다.
$t>0$이므로 음수인 근은 버린다. 따라서 $t=\\dfrac{${k}+${k}\\sqrt{5}}{2}=${m}+${m === 1 ? "" : m}\\sqrt{5}$이다.`,
            { m, k, p: 0, q: 0, t: 0, S: 0, mode, x: m },
          );
        }
        return body(
          `두 직사각형 $ABCD$와 $BCFE$는 닮은 도형이고 $\\square AEFD$는 정사각형이다. $\\overline{AB}=${k}$일 때, $\\overline{AD}$의 길이를 구하시오. (단, 점 $E$는 변 $AB$ 위에, 점 $F$는 변 $DC$ 위에 있다.)`,
          `$${m}\\sqrt{5}-${m}$`,
          `$\\overline{AD}=t$라 하면 $\\overline{AE}=t$, $\\overline{BE}=${k}-t$이다.
$\\square ABCD\\sim\\square BCFE$이므로 $\\overline{AB}:\\overline{AD}=\\overline{BC}:\\overline{BE}$, 즉 $${k}:t=t:(${k}-t)$에서 $t^2+${k}t-${k * k}=0$이다.
$t>0$이므로 음수인 근은 버린다. 따라서 $t=\\dfrac{-${k}+${k}\\sqrt{5}}{2}=${m}\\sqrt{5}-${m}$이다.`,
          { m, k, p: 0, q: 0, t: 0, S: 0, mode, x: m },
        );
      }),
  ),
];

/** 3-1 «이차방정식의 풀이» 16 + «이차방정식의 활용» 15 = 31유형. */
export const M3_QUAD: TypeEntry[] = [...SOLVE, ...APPLY];
