/**
 * 중3 「실수와 그 연산」 — RPM 3-1 앞 세 중단원 48유형 (물결 4B).
 *
 * 병렬 세션 소유 모듈 — 이 파일과 `middleM3Root.test.ts` 는 4B 세션만 만진다.
 * 합본 `m3.ts` 에는 import 1 + spread 1, 두 줄만 더한다.
 *
 * | 중단원 | 유형 |
 * |---|---|
 * | 제곱근의 뜻과 성질 | 01~18 |
 * | 무리수와 실수 | 01~10 |
 * | 근호를 포함한 식의 계산 | 01~20 |
 *
 * 유형 번호·제목·중단원명은 `scripts/rpm/rpm-type-catalog.json`(색인 정본)에서
 * **바이트 그대로** 떠왔다. 제목 일부가 잘려 보이는 것(「의 성질」·「가 자연수가
 * 되도록 하는 자연수 의 값 구하기」)은 정본이 그렇게 담고 있어서다 — 손으로
 * 고쳐 적으면 `middleTypeCoverage.test.ts` 가 막는다.
 *
 * 우리 `Unit.section` 이름은 이 세 중단원과 **글자가 같다**
 * (`prisma/seed-data/units.ts` orderIndex 469·470·471 실측 2026-08-24).
 * 같다고 해서 한 상수를 돌려 쓰지 않는다 — 뜻이 다른 두 축이라
 * 한쪽이 바뀌는 날 조용히 따라가면 안 된다.
 *
 * ## 생성 규칙 (물결 4 공통 계약)
 *
 * 1. **답을 먼저 정하고 발문을 만든다.** 근호 유형은 «정리된 답» 이 먼저다 —
 *    $m$·$s$ 를 뽑아 $A=m^2s$ 를 만들지, $A$ 를 뽑아 답을 역산하지 않는다.
 * 2. `facts` 에는 발문의 **원 수치**를 남긴다. 시험은 그것으로 **다른 관계식**
 *    (대개 부동소수 재계산·전수 세기)을 세워 답을 다시 유도한다.
 * 3. 수는 전부 `$...$` 안. 단위는 `\,\mathrm{cm}` 처럼 수식 안에 쓴다(m3.ts 관행).
 * 4. `attempt` 가 다 떨어지면 던진다 — 조용히 기본값을 돌려주지 않는다.
 *
 * ## 이 단원의 계약 셋 (시험이 48유형 전량에 댄다)
 *
 * - **정답의 근호 안에 제곱인수가 없다.** $\sqrt{8}$ 이 아니라 $2\sqrt{2}$ 다.
 *   단 하나의 예외는 「근호 안으로 넣기」(근호를 포함한 식의 계산 04)이고,
 *   시험이 그 예외 목록을 **한 개**로 못 박는다.
 *   ⚠️ **발문**에는 정리되지 않은 근호가 일부러 들어간다(03·11 등이 그 유형이다).
 *   그래서 이 가드는 정답에만 댄다 — 한계를 알고 좁힌 것이다.
 * - **정답의 분모에 근호가 남지 않는다.** $\dfrac{1}{\sqrt3}$ 이 아니라 $\dfrac{\sqrt3}{3}$.
 *   분수는 기약으로 쓴다.
 * - **$\sqrt{a^2}=|a|$ 자리는 부호 조건을 `facts` 에 싣는다.** 시험이 그 부호의
 *   표본값을 넣어 절댓값으로 다시 계산한다 — 절댓값을 빠뜨리면 빨개진다.
 *
 * ## 그림 — 이 모듈은 한 장도 안 싣는다 (보류 사유를 적어 둔다)
 *
 * 「무리수를 수직선 위에 나타내기」(무리수와 실수 04)·「수직선에서 대응하는 점
 * 찾기」(06)는 원본 지면이 **모눈 위 정사각형 + 원호**와 **글자로 이름 붙은 점**을
 * 쓴다. 지금 엔진의 `numberLine`(`scripts/figure/elementary.py` `_number_line`)은
 * `min`/`step`/`tick`/`blanks` 로 **수 눈금과 빈 칸**만 그린다 — 점에 A·B·C 라벨을
 * 못 붙이고 호도 못 그린다(실측). 그래서 **그림 없이 성립하는 발문**으로 냈다:
 * 04 는 직사각형의 대각선 길이를 말로 주고, 06 은 네 점에 대응하는 수를 발문에 적는다.
 * 새 kind 는 만들지 않았다(브리프 지시 — 4A 엔진 세션이 곡선을 만들고 있다).
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { eulReul, waGwa } from "./m2Josa";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중3";
const BOOK = "3-1";

/** RPM 색인 정본의 중단원명 (`scripts/rpm/rpm-type-catalog.json` 3-1). */
const MINOR_SQRT = "제곱근의 뜻과 성질";
const MINOR_IRR = "무리수와 실수";
const MINOR_CALC = "근호를 포함한 식의 계산";

/**
 * 우리 `Unit.section` 이름 (`prisma/seed-data/units.ts` 실측 2026-08-24).
 * 위 중단원명과 글자가 같지만 **다른 축의 값**이라 따로 적는다.
 */
const SEC = {
  제곱근: "제곱근의 뜻과 성질",
  무리수: "무리수와 실수",
  근호계산: "근호를 포함한 식의 계산",
} as const;

/** 조건을 만족할 때까지 다시 뽑는다 — 못 찾으면 던진다(조용히 기본값 금지). */
function attempt<T>(tries: number, f: () => T | null): T {
  for (let i = 0; i < tries; i += 1) {
    const v = f();
    if (v !== null) return v;
  }
  throw new Error("유형 생성 재시도 초과 — 매개변수 범위를 확인하십시오");
}

type Body = Pick<
  MidProblem,
  "content" | "answer" | "solution" | "facts" | "figureSpec"
>;

function def(
  rpmMinor: string,
  rpmType: string,
  rpmTitle: string,
  unitSection: string,
  difficulty: MidProblem["difficulty"],
  gen: (rng: Rng) => Body,
): TypeEntry {
  return {
    key: `${BOOK}|${rpmMinor}|${rpmType}`,
    grade: GRADE,
    unitSection,
    rpmBook: BOOK,
    rpmMinor,
    rpmType,
    rpmTitle,
    handler: (rng) => ({
      grade: GRADE,
      unitSection,
      rpmBook: BOOK,
      rpmMinor,
      rpmType,
      rpmTitle,
      difficulty,
      ...gen(rng),
    }),
  };
}

// ── 근호 셈 도구 ────────────────────────────────────────────────────

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === 0 ? 1 : x;
}

/** $\sqrt{n}=\text{out}\sqrt{\text{inner}}$ — `inner` 에는 제곱인수가 없다. */
export function simplifySqrt(n: number): { out: number; inner: number } {
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`근호 안은 자연수여야 합니다: ${n}`);
  }
  let out = 1;
  let inner = n;
  for (let d = 2; d * d <= inner; d += 1) {
    while (inner % (d * d) === 0) {
      inner /= d * d;
      out *= d;
    }
  }
  return { out, inner };
}

/** 제곱인수가 없는 수인가 — 「근호 안이 정리됐는가」의 정의. */
export function isSquareFree(n: number): boolean {
  return simplifySqrt(n).out === 1;
}

function isPerfectSquare(n: number): boolean {
  if (n < 0) return false;
  const r = Math.round(Math.sqrt(n));
  return r * r === n;
}

/** $\text{coef}\sqrt{\text{inner}}$ — `inner===1` 이면 근호를 안 쓴다. */
export function sqrtTerm(coef: number, inner: number): string {
  if (coef === 0) return "0";
  if (inner === 1) return `${coef}`;
  const body = `\\sqrt{${inner}}`;
  if (coef === 1) return body;
  if (coef === -1) return `-${body}`;
  return `${coef}${body}`;
}

/** $\dfrac{\text{num}\sqrt{\text{inner}}}{\text{den}}$ — 기약으로 줄여서 쓴다. */
export function fracSqrt(num: number, inner: number, den: number): string {
  if (den === 0) throw new Error("분모가 0입니다");
  let n = num;
  let d = den;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  n /= g;
  d /= g;
  if (d === 1) return sqrtTerm(n, inner);
  const body = `\\dfrac{${sqrtTerm(Math.abs(n), inner)}}{${d}}`;
  return n < 0 ? `-${body}` : body;
}

/** 근호 항들의 합 — 계수가 큰 항을 앞에 두어 답이 음수로 시작하지 않게 한다. */
function sumSurds(terms: { coef: number; inner: number }[]): string {
  const parts = terms.filter((t) => t.coef !== 0);
  if (parts.length === 0) return "0";
  const ordered = [...parts].sort((a, b) => b.coef - a.coef);
  let s = sqrtTerm(ordered[0]!.coef, ordered[0]!.inner);
  for (let i = 1; i < ordered.length; i += 1) {
    const t = ordered[i]!;
    s +=
      t.coef > 0
        ? `+${sqrtTerm(t.coef, t.inner)}`
        : `-${sqrtTerm(-t.coef, t.inner)}`;
  }
  return s;
}

/** 문자에 붙는 계수 — $1a$ 가 아니라 $a$ 다. */
function coefLetter(c: number, letter: string): string {
  if (c === 1) return letter;
  if (c === -1) return `-${letter}`;
  return `${c}${letter}`;
}

/** $c_a a + c_b b$ 꼴 — 계수 0인 항은 빠진다. */
function linearAB(ca: number, cb: number): string {
  if (ca === 0 && cb === 0) return "0";
  if (ca === 0) return coefLetter(cb, "b");
  if (cb === 0) return coefLetter(ca, "a");
  return cb > 0
    ? `${coefLetter(ca, "a")}+${coefLetter(cb, "b")}`
    : `${coefLetter(ca, "a")}-${coefLetter(-cb, "b")}`;
}

/** 해설에서 항을 늘어놓을 때 음수만 괄호로 — $(b)$ 가 아니라 $b$ 다. */
function paren(term: string): string {
  return term.startsWith("-") ? `(${term})` : term;
}

/** 상수 + 근호 항 — 상수가 0이면 근호만 쓴다. */
function constPlusSurd(c: number, coef: number, inner: number): string {
  if (coef === 0) return `${c}`;
  if (c === 0) return sqrtTerm(coef, inner);
  return coef > 0
    ? `${c}+${sqrtTerm(coef, inner)}`
    : `${c}-${sqrtTerm(-coef, inner)}`;
}

/**
 * 「$A=B$」 사슬에서 **이미 같은 자리**는 안 적는다.
 *
 * 해설에 `$\sqrt{6}=\sqrt{6}$` 처럼 같은 값이 두 번 나오면 학생이 무엇이 바뀐
 * 것인지 못 읽는다 — 정리할 것이 없으면 그 칸을 비운다.
 */
function chain(...steps: string[]): string {
  const out: string[] = [];
  for (const s of steps) {
    if (out.length === 0 || out[out.length - 1] !== s) out.push(s);
  }
  return out.join("=");
}

/** 소수를 꼬리 0 없이 — `15.30` 은 `15.3` 으로. 소수 넷 이상은 안 나온다. */
function trimNum(x: number): string {
  return String(Number(x.toFixed(3)));
}

// ── 수 풀 ──────────────────────────────────────────────────────────

/** 제곱인수가 없는 작은 수 — 답의 근호 안에 들어갈 수 있는 것들. */
const SQUAREFREE = [
  2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19, 21, 22, 23,
] as const;
/** 근호 안을 곱해도 커지지 않는 좁은 풀 — 곱셈·나눗셈 유형에 쓴다. */
const SMALL_SF = [2, 3, 5, 6, 7, 10, 11, 13, 15] as const;
/** 곱이 두 자리에 머무는 더 좁은 풀 — 넓이·분배법칙처럼 두 수를 곱하는 자리. */
const MULT_SF = [2, 3, 5, 6, 7, 10, 15] as const;

// ══════════════════════════════════════════════════════════════════
// 제곱근의 뜻과 성질 (18유형)
// ══════════════════════════════════════════════════════════════════

const SQRT_TYPES: TypeEntry[] = [
  def(MINOR_SQRT, "01", "제곱근의 뜻", SEC.제곱근, "기본", (rng) =>
    attempt(60, () => {
      const branch = intBetween(rng, 0, 1);
      if (branch === 0) {
        const k = intBetween(rng, 2, 15);
        const n = k * k;
        return {
          content: `$x^2=${n}$ ${eulReul(n)} 만족하는 $x$ 의 값을 모두 구하시오.`,
          answer: `$x=\\pm ${k}$`,
          solution: `$x$ 는 $${n}$ 의 제곱근이므로 $x=\\pm\\sqrt{${n}}=\\pm ${k}$ 이다.`,
          facts: { n, k, branch },
          figureSpec: null,
        };
      }
      const n = pick(rng, SQUAREFREE);
      return {
        content: `$x^2=${n}$ ${eulReul(n)} 만족하는 $x$ 의 값을 모두 구하시오.`,
        answer: `$x=\\pm\\sqrt{${n}}$`,
        solution: `$x$ 는 $${n}$ 의 제곱근이고, 근호를 없앨 수 없으므로 $x=\\pm\\sqrt{${n}}$ 이다.`,
        facts: { n, k: 0, branch },
        figureSpec: null,
      };
    }),
  ),

  def(MINOR_SQRT, "02", "제곱근의 표현", SEC.제곱근, "기본", (rng) =>
    attempt(60, () => {
      const n = pick(rng, SQUAREFREE);
      const branch = intBetween(rng, 0, 2);
      const ask =
        branch === 0
          ? `$${n}$ 의 양의 제곱근`
          : branch === 1
            ? `$${n}$ 의 음의 제곱근`
            : `제곱근 $${n}$`;
      const body = branch === 1 ? `-\\sqrt{${n}}` : `\\sqrt{${n}}`;
      const why =
        branch === 2
          ? `「제곱근 $${n}$」 은 $${n}$ 의 양의 제곱근을 뜻하므로 $\\sqrt{${n}}$ 이다.`
          : `$${n}$ 의 제곱근은 $\\pm\\sqrt{${n}}$ 이므로 ${branch === 0 ? "양" : "음"}의 제곱근은 $${body}$ 이다.`;
      return {
        content: `다음을 근호를 사용하여 나타내시오.\n${ask}`,
        answer: `$${body}$`,
        solution: why,
        facts: { n, branch },
        figureSpec: null,
      };
    }),
  ),

  def(
    MINOR_SQRT,
    "03",
    "근호를 사용하지 않고 나타내기",
    SEC.제곱근,
    "기본",
    (rng) =>
      attempt(60, () => {
        const branch = intBetween(rng, 0, 3);
        if (branch === 3) {
          const p = intBetween(rng, 2, 9);
          const q = intBetween(rng, 2, 9);
          if (gcd(p, q) !== 1 || p === q) return null;
          return {
            content: `다음을 근호를 사용하지 않고 나타내시오.\n$\\sqrt{\\dfrac{${p * p}}{${q * q}}}$`,
            answer: `$\\dfrac{${p}}{${q}}$`,
            solution: `$\\dfrac{${p * p}}{${q * q}}=\\left(\\dfrac{${p}}{${q}}\\right)^2$ 이고 $\\dfrac{${p}}{${q}}>0$ 이다.\n따라서 $\\sqrt{\\dfrac{${p * p}}{${q * q}}}=\\dfrac{${p}}{${q}}$ 이다.`,
            facts: { branch, p, q, k: 0, value: 0 },
            figureSpec: null,
          };
        }
        const k = intBetween(rng, 2, 15);
        const expr =
          branch === 0
            ? `\\sqrt{${k * k}}`
            : branch === 1
              ? `-\\sqrt{${k * k}}`
              : `\\sqrt{(-${k})^2}`;
        const value = branch === 1 ? -k : k;
        const why =
          branch === 2
            ? `$(-${k})^2=${k * k}$ 이고 $${k}>0$ 이므로 $\\sqrt{(-${k})^2}=${k}$ 이다.`
            : `$${k}^2=${k * k}$ 이고 $${k}>0$ 이므로 $${expr}=${value}$ 이다.`;
        return {
          content: `다음을 근호를 사용하지 않고 나타내시오.\n$${expr}$`,
          answer: `$${value}$`,
          solution: why,
          facts: { branch, k, value, p: 0, q: 0 },
          figureSpec: null,
        };
      }),
  ),

  def(MINOR_SQRT, "04", "제곱근 구하기", SEC.제곱근, "응용", (rng) =>
    attempt(60, () => {
      const k = intBetween(rng, 2, 7);
      const a = k * k * k * k;
      const branch = intBetween(rng, 0, 1);
      if (branch === 0) {
        return {
          content: `$\\sqrt{${a}}$ 의 제곱근을 구하시오.`,
          answer: `$\\pm ${k}$`,
          solution: `$\\sqrt{${a}}=${k * k}$ 이고 $${k * k}$ 의 제곱근은 $\\pm ${k}$ 이다.`,
          facts: { a, k, branch },
          figureSpec: null,
        };
      }
      return {
        content: `$\\sqrt{${a}}$ 의 양의 제곱근을 구하시오.`,
        answer: `$${k}$`,
        solution: `$\\sqrt{${a}}=${k * k}$ 이고 $${k * k}$ 의 양의 제곱근은 $${k}$ 이다.`,
        facts: { a, k, branch },
        figureSpec: null,
      };
    }),
  ),

  def(MINOR_SQRT, "05", "제곱근과 도형", SEC.제곱근, "응용", (rng) =>
    attempt(80, () => {
      const branch = intBetween(rng, 0, 1);
      if (branch === 0) {
        const m = intBetween(rng, 2, 6);
        const s = pick(rng, SMALL_SF);
        const area = m * m * s;
        return {
          content: `넓이가 $${area}\\,\\mathrm{cm}^2$ 인 정사각형의 한 변의 길이를 구하시오.`,
          answer: `$${sqrtTerm(m, s)}\\,\\mathrm{cm}$`,
          solution: `한 변의 길이를 $x\\,\\mathrm{cm}$ 라 하면 $x>0$ 이고 $x^2=${area}$ 이다.\n따라서 $x=\\sqrt{${area}}=${sqrtTerm(m, s)}$ 이다.`,
          facts: { branch, area, out: m, inner: s, p: 0, q: 0 },
          figureSpec: null,
        };
      }
      const p = intBetween(rng, 2, 9);
      const q = intBetween(rng, 2, 9);
      if (p === q) return null;
      const d = p * p + q * q;
      const s = simplifySqrt(d);
      if (s.inner === 1) return null;
      return {
        content: `가로의 길이가 $${p}\\,\\mathrm{cm}$, 세로의 길이가 $${q}\\,\\mathrm{cm}$ 인 직사각형의 대각선의 길이를 구하시오.`,
        answer: `$${sqrtTerm(s.out, s.inner)}\\,\\mathrm{cm}$`,
        solution: `대각선의 길이를 $x\\,\\mathrm{cm}$ 라 하면 피타고라스 정리에 의하여 $x^2=${p}^2+${q}^2=${d}$ 이다.\n$x>0$ 이므로 $x=${chain(`\\sqrt{${d}}`, sqrtTerm(s.out, s.inner))}$ 이다.`,
        facts: { branch, area: 0, out: s.out, inner: s.inner, p, q },
        figureSpec: null,
      };
    }),
  ),

  def(MINOR_SQRT, "06", "제곱근의 성질", SEC.제곱근, "기본", (rng) =>
    attempt(80, () => {
      const a = intBetween(rng, 2, 12);
      const b = intBetween(rng, 2, 12);
      const c = pick(rng, SQUAREFREE);
      const value = a + b - c;
      if (value === 0) return null;
      return {
        content: `다음 식을 계산하시오.\n$\\sqrt{${a}^2}+\\sqrt{(-${b})^2}-(-\\sqrt{${c}})^2$`,
        answer: `$${value}$`,
        solution: `$\\sqrt{${a}^2}=${a}$, $\\sqrt{(-${b})^2}=${b}$, $(-\\sqrt{${c}})^2=${c}$ 이다.\n따라서 주어진 식은 $${a}+${b}-${c}=${value}$ 이다.`,
        facts: { a, b, c, value },
        figureSpec: null,
      };
    }),
  ),

  def(
    MINOR_SQRT,
    "07",
    "제곱근의 성질을 이용한 식의 계산",
    SEC.제곱근,
    "응용",
    (rng) =>
      attempt(120, () => {
        const a = intBetween(rng, 2, 12);
        const b = intBetween(rng, 2, 12);
        const c = pick(rng, SQUAREFREE);
        if ((a * b) % c !== 0) return null;
        const value = (a * b) / c;
        if (value === 1) return null;
        return {
          content: `다음 식을 계산하시오.\n$\\sqrt{${a}^2}\\times\\sqrt{(-${b})^2}\\div(\\sqrt{${c}})^2$`,
          answer: `$${value}$`,
          solution: `$\\sqrt{${a}^2}=${a}$, $\\sqrt{(-${b})^2}=${b}$, $(\\sqrt{${c}})^2=${c}$ 이다.\n따라서 주어진 식은 $${a}\\times${b}\\div${c}=${value}$ 이다.`,
          facts: { a, b, c, value },
          figureSpec: null,
        };
      }),
  ),

  def(MINOR_SQRT, "08", "의 성질", SEC.제곱근, "응용", (rng) =>
    attempt(80, () => {
      const p = intBetween(rng, 1, 5);
      const q = intBetween(rng, 1, 5);
      if (p === q) return null;
      const sign = pick(rng, [1, -1] as const);
      const coef = sign > 0 ? p - q : q - p;
      const pa = coefLetter(p, "a");
      const qa = coefLetter(q, "a");
      const t1 = p === 1 ? "\\sqrt{a^2}" : `\\sqrt{(${pa})^2}`;
      const t2 = `\\sqrt{(-${qa})^2}`;
      const cond = sign > 0 ? "a>0" : "a<0";
      const v1 = sign > 0 ? pa : `-${pa}`;
      const v2 = sign > 0 ? qa : `-${qa}`;
      return {
        content: `$${cond}$ 일 때, 다음 식을 간단히 하시오.\n$${t1}-${t2}$`,
        answer: `$${coefLetter(coef, "a")}$`,
        solution: `$${cond}$ 이므로 $${t1}=|${pa}|=${v1}$, $${t2}=|-${qa}|=${v2}$ 이다.\n따라서 주어진 식은 $${paren(v1)}-${paren(v2)}=${coefLetter(coef, "a")}$ 이다.`,
        facts: { p, q, sign, coef },
        figureSpec: null,
      };
    }),
  ),

  def(
    MINOR_SQRT,
    "09",
    "의 꼴을 포함한 식을 간단히 하기",
    SEC.제곱근,
    "응용",
    (rng) =>
      attempt(80, () => {
        const a = intBetween(rng, 1, 7);
        const b = a + intBetween(rng, 2, 8);
        const branch = intBetween(rng, 0, 1);
        const t1 = `\\sqrt{(x-${a})^2}`;
        const t2 = `\\sqrt{(x-${b})^2}`;
        const head = `$${a}<x<${b}$ 이므로 $x-${a}>0$, $x-${b}<0$ 이다.\n따라서 $${t1}=x-${a}$, $${t2}=${b}-x$ 이므로 주어진 식은`;
        if (branch === 0) {
          return {
            content: `$${a}<x<${b}$ 일 때, 다음 식을 간단히 하시오.\n$${t1}+${t2}$`,
            answer: `$${b - a}$`,
            solution: `${head} $(x-${a})+(${b}-x)=${b - a}$ 이다.`,
            facts: { a, b, branch },
            figureSpec: null,
          };
        }
        return {
          content: `$${a}<x<${b}$ 일 때, 다음 식을 간단히 하시오.\n$${t1}-${t2}$`,
          answer: `$2x-${a + b}$`,
          solution: `${head} $(x-${a})-(${b}-x)=2x-${a + b}$ 이다.`,
          facts: { a, b, branch },
          figureSpec: null,
        };
      }),
  ),

  def(
    MINOR_SQRT,
    "10",
    "의 꼴을 포함한 식을 간단히 하기",
    SEC.제곱근,
    "심화하",
    (rng) =>
      attempt(120, () => {
        const p = intBetween(rng, 1, 5);
        const q = intBetween(rng, 1, 5);
        const r = intBetween(rng, 1, 5);
        if (p === r) return null;
        const sa = pick(rng, [1, -1] as const);
        const sb = pick(rng, [1, -1] as const);
        const ca = sa * (p - r);
        const cb = sb * q;
        if (ca === 0 || cb === 0) return null;
        const pa = coefLetter(p, "a");
        const qb = coefLetter(q, "b");
        const ra = coefLetter(r, "a");
        const t1 = p === 1 ? "\\sqrt{a^2}" : `\\sqrt{(${pa})^2}`;
        const t2 = q === 1 ? "\\sqrt{b^2}" : `\\sqrt{(${qb})^2}`;
        const t3 = `\\sqrt{(-${ra})^2}`;
        const v1 = sa > 0 ? pa : `-${pa}`;
        const v2 = sb > 0 ? qb : `-${qb}`;
        const v3 = sa > 0 ? ra : `-${ra}`;
        const cond = `$a${sa > 0 ? ">" : "<"}0$, $b${sb > 0 ? ">" : "<"}0$`;
        return {
          content: `${cond} 일 때, 다음 식을 간단히 하시오.\n$${t1}+${t2}-${t3}$`,
          answer: `$${linearAB(ca, cb)}$`,
          solution: `${cond} 이므로 $${t1}=${v1}$, $${t2}=${v2}$, $${t3}=${v3}$ 이다.\n따라서 주어진 식은 $${paren(v1)}+${paren(v2)}-${paren(v3)}=${linearAB(ca, cb)}$ 이다.`,
          facts: { p, q, r, sa, sb, ca, cb },
          figureSpec: null,
        };
      }),
  ),

  def(
    MINOR_SQRT,
    "11",
    "가 자연수가 되도록 하는 자연수 의 값 구하기",
    SEC.제곱근,
    "응용",
    (rng) =>
      attempt(60, () => {
        const m = intBetween(rng, 2, 7);
        const s = pick(rng, SMALL_SF);
        const a = m * m * s;
        return {
          content: `$\\sqrt{${a}x}$ 가 자연수가 되도록 하는 가장 작은 자연수 $x$ 의 값을 구하시오.`,
          answer: `$${s}$`,
          solution: `$${a}=${m}^2\\times${s}$ 이므로 $\\sqrt{${a}x}=${m}\\sqrt{${s}x}$ 이다.\n이 값이 자연수가 되려면 $${s}x$ 가 어떤 자연수의 제곱이어야 하므로 가장 작은 자연수 $x$ 는 $${s}$ 이다.`,
          facts: { a, m, s, x: s },
          figureSpec: null,
        };
      }),
  ),

  def(
    MINOR_SQRT,
    "12",
    "가 자연수가 되도록 하는 자연수 의",
    SEC.제곱근,
    "응용",
    (rng) =>
      attempt(60, () => {
        const m = intBetween(rng, 3, 8);
        const s = pick(rng, SMALL_SF);
        if (m * m === s) return null;
        const a = m * m * s;
        return {
          content: `$\\sqrt{\\dfrac{${a}}{x}}$ 가 자연수가 되도록 하는 가장 작은 자연수 $x$ 의 값을 구하시오.`,
          answer: `$${s}$`,
          solution: `$${a}=${m}^2\\times${s}$ 이므로 $\\dfrac{${a}}{x}$ 가 어떤 자연수의 제곱이 되려면 $x$ 는 $${a}$ 의 약수이면서 $${s}$ 의 배수이어야 한다.\n따라서 가장 작은 자연수 $x$ 는 $${s}$ 이고, 이때 $\\sqrt{\\dfrac{${a}}{${s}}}=${m}$ 이다.`,
          facts: { a, m, s, x: s },
          figureSpec: null,
        };
      }),
  ),

  def(
    MINOR_SQRT,
    "13",
    "가 자연수가 되도록 하는 자연수 의 값 구하기",
    SEC.제곱근,
    "응용",
    (rng) =>
      attempt(80, () => {
        const a = intBetween(rng, 20, 200);
        if (isPerfectSquare(a)) return null;
        const k = Math.ceil(Math.sqrt(a));
        const x = k * k - a;
        return {
          content: `$\\sqrt{${a}+x}$ 가 자연수가 되도록 하는 가장 작은 자연수 $x$ 의 값을 구하시오.`,
          answer: `$${x}$`,
          solution: `$${a}$ 보다 큰 자연수의 제곱 중 가장 작은 것은 $${k}^2=${k * k}$ 이다.\n따라서 $${a}+x=${k * k}$ 에서 $x=${x}$ 이다.`,
          facts: { a, k, x },
          figureSpec: null,
        };
      }),
  ),

  def(
    MINOR_SQRT,
    "14",
    "가 정수 또는 자연수가 되도록 하는 자연수 의 값 구하기",
    SEC.제곱근,
    "심화하",
    (rng) =>
      attempt(60, () => {
        const a = intBetween(rng, 20, 200);
        const k = Math.floor(Math.sqrt(a - 1));
        const count = k + 1;
        return {
          content: `$\\sqrt{${a}-x}$ 가 정수가 되도록 하는 자연수 $x$ 의 개수를 구하시오.`,
          answer: `$${count}$`,
          solution: `$x$ 가 자연수이므로 $${a}-x$ 는 $0$ 이상 $${a - 1}$ 이하의 정수이다.\n이 중 정수의 제곱인 것은 $0^2,\\ 1^2,\\ \\ldots,\\ ${k}^2$ 의 $${count}$ 개이므로 $x$ 의 개수도 $${count}$ 이다.`,
          facts: { a, k, count },
          figureSpec: null,
        };
      }),
  ),

  def(MINOR_SQRT, "15", "제곱근의 대소 관계", SEC.제곱근, "응용", (rng) =>
    attempt(120, () => {
      const p = pick(rng, SQUAREFREE);
      const r = pick(rng, SQUAREFREE);
      const q = intBetween(rng, 2, 5);
      if (p === r) return null;
      const items = [
        { latex: `\\sqrt{${p}}`, value: Math.sqrt(p) },
        { latex: `${q}`, value: q },
        { latex: `\\sqrt{${r}}`, value: Math.sqrt(r) },
      ];
      for (let i = 0; i < items.length; i += 1) {
        for (let j = i + 1; j < items.length; j += 1) {
          if (Math.abs(items[i]!.value - items[j]!.value) < 0.08) return null;
        }
      }
      const asc = [...items].sort((x, y) => x.value - y.value);
      return {
        content: `다음 세 수를 작은 것부터 차례로 나열하시오.\n$\\sqrt{${p}}$, $${q}$, $\\sqrt{${r}}$`,
        answer: `$${asc.map((t) => t.latex).join("<")}$`,
        solution: `$${q}=\\sqrt{${q * q}}$ 이므로 세 수를 모두 근호로 나타내면 $\\sqrt{${p}}$, $\\sqrt{${q * q}}$, $\\sqrt{${r}}$ 이다.\n근호 안의 수가 작을수록 작으므로 $${asc.map((t) => t.latex).join("<")}$ 이다.`,
        facts: { p, q, r },
        figureSpec: null,
      };
    }),
  ),

  def(
    MINOR_SQRT,
    "16",
    "제곱근의 성질과 대소 관계",
    SEC.제곱근,
    "심화하",
    (rng) =>
      attempt(120, () => {
        const a = intBetween(rng, 2, 8);
        const b = pick(rng, SQUAREFREE);
        if (Math.abs(a * a - b) < 2) return null;
        const gt = a * a > b ? 1 : 0;
        const body = gt === 1 ? `${a}-\\sqrt{${b}}` : `\\sqrt{${b}}-${a}`;
        const cmp = gt === 1 ? ">" : "<";
        return {
          content: `다음 식을 간단히 하시오.\n$\\sqrt{(${a}-\\sqrt{${b}})^2}$`,
          answer: `$${body}$`,
          solution: `$${a}=\\sqrt{${a * a}}$ 이고 $${a * a}${cmp}${b}$ 이므로 $${a}${cmp}\\sqrt{${b}}$ 이다.\n따라서 $\\sqrt{(${a}-\\sqrt{${b}})^2}=|${a}-\\sqrt{${b}}|=${body}$ 이다.`,
          facts: { a, b, gt },
          figureSpec: null,
        };
      }),
  ),

  def(MINOR_SQRT, "17", "제곱근을 포함한 부등식", SEC.제곱근, "응용", (rng) =>
    attempt(60, () => {
      const a = intBetween(rng, 1, 6);
      const b = a + intBetween(rng, 1, 3);
      const branch = intBetween(rng, 0, 1);
      const count = branch === 0 ? b * b - a * a - 1 : b * b - a * a;
      const rel = branch === 0 ? "<" : "\\le";
      const relText = branch === 0 ? "미만" : "이하";
      return {
        content: `$${a}<\\sqrt{x}${rel}${b}$ ${eulReul(b)} 만족하는 자연수 $x$ 의 개수를 구하시오.`,
        answer: `$${count}$`,
        solution: `각 변을 제곱하면 $${a * a}<x${rel}${b * b}$ 이다.\n따라서 $x$ 는 $${a * a}$ 초과 $${b * b}$ ${relText}의 자연수이므로 그 개수는 $${count}$ 이다.`,
        facts: { a, b, branch, count },
        figureSpec: null,
      };
    }),
  ),

  def(MINOR_SQRT, "18", "이하의 자연수 구하기", SEC.제곱근, "심화하", (rng) =>
    attempt(60, () => {
      const n = intBetween(rng, 10, 30);
      let total = 0;
      for (let x = 1; x <= n; x += 1) total += Math.floor(Math.sqrt(x));
      const top = Math.floor(Math.sqrt(n));
      return {
        content: `자연수 $x$ 에 대하여 $\\sqrt{x}$ 이하의 자연수의 개수를 $f(x)$ 라 할 때, $f(1)+f(2)+f(3)+\\cdots+f(${n})$ 의 값을 구하시오.`,
        answer: `$${total}$`,
        solution: `$f(x)$ 는 $k^2\\le x$ 를 만족하는 가장 큰 자연수 $k$ 이므로, $f(x)=k$ 인 $x$ 는 $k^2$ 부터 $(k+1)^2-1$ 까지이다.\n$${n}$ 이하에서 이를 모두 더하면 $f(1)+f(2)+\\cdots+f(${n})=${total}$ 이다. (여기서 $f(${n})=${top}$ 이다.)`,
        facts: { n, total, top },
        figureSpec: null,
      };
    }),
  ),
];

// ══════════════════════════════════════════════════════════════════
// 무리수와 실수 (10유형)
// ══════════════════════════════════════════════════════════════════

/**
 * 「다음 수 중 …」 목록 한 줄을 만든다.
 *
 * 시험은 이 목록을 **발문에서 다시 읽어** 유리수·무리수를 스스로 가른다
 * (`facts` 로 기대값을 만들면 동어반복이다). 그래서 항목 모양을 아래 여섯으로
 * 좁혀 둔다 — 시험의 분류기가 그 여섯만 알면 된다.
 */
function numberListItems(
  rng: Rng,
  howMany: number,
): { latex: string; irrational: boolean }[] {
  const out: { latex: string; irrational: boolean }[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (out.length < howMany) {
    guard += 1;
    if (guard > 400) throw new Error("수 목록 생성 재시도 초과");
    const kind = intBetween(rng, 0, 5);
    let item: { latex: string; irrational: boolean };
    if (kind === 0) {
      const k = intBetween(rng, 2, 12);
      item = { latex: `\\sqrt{${k * k}}`, irrational: false };
    } else if (kind === 1) {
      const s = pick(rng, SQUAREFREE);
      item = { latex: `\\sqrt{${s}}`, irrational: true };
    } else if (kind === 2) {
      const s = pick(rng, SQUAREFREE);
      item = { latex: `-\\sqrt{${s}}`, irrational: true };
    } else if (kind === 3) {
      const q = intBetween(rng, 2, 9);
      const p = intBetween(rng, 1, q - 1);
      if (gcd(p, q) !== 1) continue;
      item = { latex: `\\dfrac{${p}}{${q}}`, irrational: false };
    } else if (kind === 4) {
      item = { latex: "\\pi", irrational: true };
    } else {
      const d = pick(rng, [0.04, 0.09, 0.16, 0.25, 0.36, 0.49] as const);
      item = { latex: `\\sqrt{${d}}`, irrational: false };
    }
    if (seen.has(item.latex)) continue;
    seen.add(item.latex);
    out.push(item);
  }
  return out;
}

const IRR_TYPES: TypeEntry[] = [
  def(MINOR_IRR, "01", "유리수와 무리수의 구별", SEC.무리수, "기본", (rng) =>
    attempt(60, () => {
      const items = numberListItems(rng, 5);
      const count = items.filter((t) => t.irrational).length;
      if (count === 0 || count === items.length) return null;
      return {
        content: `다음 수 중 무리수의 개수를 구하시오.\n${items.map((t) => `$${t.latex}$`).join(", ")}`,
        answer: `$${count}$`,
        solution: `근호 안의 수가 어떤 유리수의 제곱이면 그 수는 유리수이고, 그렇지 않으면 무리수이다. $\\pi$ 는 무리수이다.\n따라서 무리수는 $${count}$ 개이다.`,
        facts: { count, total: items.length },
        figureSpec: null,
      };
    }),
  ),

  def(MINOR_IRR, "02", "무리수의 이해", SEC.무리수, "응용", (rng) =>
    attempt(60, () => {
      const n = intBetween(rng, 20, 60);
      const squares = Math.floor(Math.sqrt(n));
      const count = n - squares;
      return {
        content: `$1$ 부터 $${n}$ 까지의 자연수 $k$ 중에서 $\\sqrt{k}$ 가 무리수인 것은 모두 몇 개인지 구하시오.`,
        answer: `$${count}$`,
        solution: `$\\sqrt{k}$ 가 유리수이려면 $k$ 가 어떤 자연수의 제곱이어야 한다.\n$1$ 부터 $${n}$ 까지 그런 $k$ 는 $1^2,\\ 2^2,\\ \\ldots,\\ ${squares}^2$ 의 $${squares}$ 개이므로 무리수인 것은 $${n}-${squares}=${count}$ 개이다.`,
        facts: { n, squares, count },
        figureSpec: null,
      };
    }),
  ),

  def(MINOR_IRR, "03", "실수의 이해", SEC.무리수, "응용", (rng) =>
    attempt(60, () => {
      const items = numberListItems(rng, 5);
      const irr = items.filter((t) => t.irrational).length;
      const rat = items.length - irr;
      if (irr === 0 || rat === 0) return null;
      const value = rat - irr;
      return {
        content: `다음 수 중 유리수의 개수를 $a$, 무리수의 개수를 $b$ 라 할 때, $a-b$ 의 값을 구하시오.\n${items.map((t) => `$${t.latex}$`).join(", ")}`,
        answer: `$${value}$`,
        solution: `유리수와 무리수를 통틀어 실수라 한다. 주어진 수는 유리수 $${rat}$ 개, 무리수 $${irr}$ 개이다.\n따라서 $a-b=${rat}-${irr}=${value}$ 이다.`,
        facts: { rat, irr, value },
        figureSpec: null,
      };
    }),
  ),

  def(
    MINOR_IRR,
    "04",
    "무리수를 수직선 위에 나타내기",
    SEC.무리수,
    "응용",
    (rng) =>
      attempt(120, () => {
        const c = intBetween(rng, -5, 5);
        const p = intBetween(rng, 1, 6);
        const q = intBetween(rng, 1, 6);
        if (p === q) return null;
        const d = p * p + q * q;
        const s = simplifySqrt(d);
        if (s.inner === 1) return null;
        const branch = intBetween(rng, 0, 1);
        const dir = branch === 0 ? "오른쪽" : "왼쪽";
        const coef = branch === 0 ? s.out : -s.out;
        return {
          content: `수직선 위에서 좌표가 $${c}$ 인 점 A를 한 꼭짓점으로 하고 가로의 길이가 $${p}$, 세로의 길이가 $${q}$ 인 직사각형이 있다. 점 A를 중심으로 하고 이 직사각형의 대각선의 길이를 반지름으로 하는 원을 그릴 때, 이 원이 수직선과 만나는 두 점 중 ${dir}에 있는 점 P에 대응하는 수를 구하시오.`,
          answer: `$${constPlusSurd(c, coef, s.inner)}$`,
          solution: `직사각형의 대각선의 길이는 $${chain(`\\sqrt{${p}^2+${q}^2}`, `\\sqrt{${d}}`, sqrtTerm(s.out, s.inner))}$ 이다.\n점 P는 점 A에서 ${dir}으로 이 길이만큼 떨어진 점이므로 대응하는 수는 $${constPlusSurd(c, coef, s.inner)}$ 이다.`,
          facts: { c, p, q, out: s.out, inner: s.inner, branch },
          figureSpec: null,
        };
      }),
  ),

  def(MINOR_IRR, "05", "실수와 수직선", SEC.무리수, "기본", (rng) =>
    attempt(80, () => {
      const n = pick(rng, SQUAREFREE);
      if (n < 5) return null;
      const k = Math.floor(Math.sqrt(n));
      return {
        content: `$\\sqrt{${n}}$ 에 대응하는 점은 수직선 위에서 연속하는 두 정수 사이에 있다. 그 두 정수를 구하시오.`,
        answer: `$${k}$ ${waGwa(k)} $${k + 1}$`,
        solution: `$${k}^2=${k * k}$, $(${k + 1})^2=${(k + 1) * (k + 1)}$ 이고 $${k * k}<${n}<${(k + 1) * (k + 1)}$ 이므로 $${k}<\\sqrt{${n}}<${k + 1}$ 이다.\n따라서 두 정수는 $${k}$ ${waGwa(k)} $${k + 1}$ 이다.`,
        facts: { n, k },
        figureSpec: null,
      };
    }),
  ),

  def(
    MINOR_IRR,
    "06",
    "수직선에서 대응하는 점 찾기",
    SEC.무리수,
    "응용",
    (rng) =>
      attempt(120, () => {
        const m = intBetween(rng, -3, 4);
        const n = pick(rng, SQUAREFREE);
        const v = m + Math.sqrt(n);
        if (Math.abs(v - Math.round(v)) < 0.06) return null;
        const shift = intBetween(rng, 0, 2);
        const base = Math.floor(v) - shift;
        const coords = [base, base + 1, base + 2, base + 3];
        const names = ["A", "B", "C", "D"];
        const expr = m === 0 ? `\\sqrt{${n}}` : `${m}+\\sqrt{${n}}`;
        const k = Math.floor(Math.sqrt(n));
        return {
          content: `수직선 위의 네 점 A, B, C, D에 대응하는 수가 각각 $${coords[0]}$, $${coords[1]}$, $${coords[2]}$, $${coords[3]}$ 이다. $${expr}$ 에 대응하는 점이 어느 두 점 사이에 있는지 구하시오.`,
          answer: `점 ${names[shift]}와 점 ${names[shift + 1]}`,
          solution: `$${k}<\\sqrt{${n}}<${k + 1}$ 이므로 $${base + shift}<${expr}<${base + shift + 1}$ 이다.\n따라서 점 ${names[shift]}와 점 ${names[shift + 1]} 사이에 있다.`,
          facts: { m, n, shift, base },
          figureSpec: null,
        };
      }),
  ),

  def(MINOR_IRR, "07", "두 실수의 대소 관계", SEC.무리수, "응용", (rng) =>
    attempt(120, () => {
      const k = intBetween(rng, 2, 6);
      const m = pick(rng, SQUAREFREE);
      const n = pick(rng, SQUAREFREE);
      if (m === n) return null;
      if (Math.abs(k * k - n) < 2) return null;
      const gt = k * k > n ? 1 : 0;
      const rel = gt === 1 ? ">" : "<";
      return {
        content: `두 수 $A=${k}+\\sqrt{${m}}$, $B=\\sqrt{${m}}+\\sqrt{${n}}$ 의 대소를 비교하시오.`,
        answer: `$A${rel}B$`,
        solution: `$A-B=${k}-\\sqrt{${n}}$ 이고 $${k}=\\sqrt{${k * k}}$ 이다.\n$${k * k}${rel}${n}$ 이므로 $A-B${rel}0$, 즉 $A${rel}B$ 이다.`,
        facts: { k, m, n, gt },
        figureSpec: null,
      };
    }),
  ),

  def(MINOR_IRR, "08", "세 실수의 대소 관계", SEC.무리수, "심화하", (rng) =>
    attempt(200, () => {
      const parts = [0, 1, 2].map(() => {
        const useRad = intBetween(rng, 0, 3) > 0;
        const k = intBetween(rng, 0, 4);
        const r = useRad ? pick(rng, SQUAREFREE) : 0;
        return { k, r };
      });
      // 근호가 하나뿐이면 「세 실수의 대소」가 아니라 정수 비교가 된다.
      if (parts.filter((t) => t.r !== 0).length < 2) return null;
      const items = parts.map(({ k, r }) => ({
        latex:
          r === 0 ? `${k}` : k === 0 ? `\\sqrt{${r}}` : `${k}+\\sqrt{${r}}`,
        value: k + (r === 0 ? 0 : Math.sqrt(r)),
      }));
      if (items.some((t) => t.value === 0)) return null;
      if (new Set(items.map((t) => t.latex)).size !== 3) return null;
      for (let i = 0; i < 3; i += 1) {
        for (let j = i + 1; j < 3; j += 1) {
          if (Math.abs(items[i]!.value - items[j]!.value) < 0.1) return null;
        }
      }
      const desc = [...items].sort((x, y) => y.value - x.value);
      return {
        content: `다음 세 수를 큰 것부터 차례로 나열하시오.\n$${items[0]!.latex}$, $${items[1]!.latex}$, $${items[2]!.latex}$`,
        answer: `$${desc.map((t) => t.latex).join(">")}$`,
        solution: `두 수의 차를 구하여 그 부호를 살피면 대소를 알 수 있다.\n큰 것부터 나열하면 $${desc.map((t) => t.latex).join(">")}$ 이다.`,
        facts: {
          k0: parts[0]!.k,
          r0: parts[0]!.r,
          k1: parts[1]!.k,
          r1: parts[1]!.r,
          k2: parts[2]!.k,
          r2: parts[2]!.r,
        },
        figureSpec: null,
      };
    }),
  ),

  def(
    MINOR_IRR,
    "09",
    "제곱근표를 이용하여 제곱근의 값 구하기",
    SEC.무리수,
    "응용",
    (rng) =>
      attempt(60, () => {
        const a2 = intBetween(rng, 100, 999);
        const v3 = Math.round(Math.sqrt(a2 / 100) * 1000);
        const mult = pick(rng, [10, 100] as const);
        const b = mult === 10 ? a2 : a2 * 100;
        const aStr = (a2 / 100).toFixed(2);
        const vStr = (v3 / 1000).toFixed(3);
        return {
          content: `제곱근표에 $\\sqrt{${aStr}}\\approx${vStr}$으로 나와 있다. 표의 근삿값을 그대로 이용하여 $\\sqrt{${b}}$의 근삿값을 구하시오.`,
          answer: `$${trimNum((v3 / 1000) * mult)}$`,
          solution: `$${b}=${aStr}\\times${mult * mult}$ 이므로 $\\sqrt{${b}}=${mult}\\sqrt{${aStr}}$ 이다.\n표의 근삿값을 그대로 이용하면 $\\sqrt{${b}}\\approx${mult}\\times${vStr}=${trimNum((v3 / 1000) * mult)}$ 이다.`,
          facts: { a2, v3, mult },
          figureSpec: null,
        };
      }),
  ),

  def(MINOR_IRR, "10", "두 실수 사이의 수", SEC.무리수, "응용", (rng) =>
    attempt(120, () => {
      const a = pick(rng, SQUAREFREE);
      const b = pick(rng, SQUAREFREE);
      if (b <= a) return null;
      const ka = Math.floor(Math.sqrt(a));
      const kb = Math.floor(Math.sqrt(b));
      const count = kb - ka;
      if (count === 0) return null;
      return {
        content: `$\\sqrt{${a}}$ ${waGwa(a)} $\\sqrt{${b}}$ 사이에 있는 자연수의 개수를 구하시오.`,
        answer: `$${count}$`,
        solution: `$${ka}<\\sqrt{${a}}<${ka + 1}$, $${kb}<\\sqrt{${b}}<${kb + 1}$ 이다.\n따라서 두 수 사이의 자연수는 $${ka + 1}$ 부터 $${kb}$ 까지의 $${count}$ 개이다.`,
        facts: { a, b, count },
        figureSpec: null,
      };
    }),
  ),
];

// ══════════════════════════════════════════════════════════════════
// 근호를 포함한 식의 계산 (20유형)
// ══════════════════════════════════════════════════════════════════

const CALC_TYPES: TypeEntry[] = [
  def(MINOR_CALC, "01", "제곱근의 곱셈", SEC.근호계산, "기본", (rng) =>
    attempt(120, () => {
      const p = intBetween(rng, 1, 5);
      const q = intBetween(rng, 1, 5);
      const m = pick(rng, MULT_SF);
      const n = pick(rng, MULT_SF);
      if (m === n) return null;
      const s = simplifySqrt(m * n);
      const out = p * q * s.out;
      const left = `${sqrtTerm(p, m)}\\times${sqrtTerm(q, n)}`;
      return {
        content: `다음 식을 계산하시오.\n$${left}$`,
        answer: `$${sqrtTerm(out, s.inner)}$`,
        solution: `계수끼리, 근호 안끼리 곱하면 $${chain(left, sqrtTerm(p * q, m * n), sqrtTerm(out, s.inner))}$ 이다.`,
        facts: { p, q, m, n, out, inner: s.inner },
        figureSpec: null,
      };
    }),
  ),

  def(MINOR_CALC, "02", "제곱근의 나눗셈", SEC.근호계산, "기본", (rng) =>
    attempt(200, () => {
      // 답(정리된 꼴)을 먼저 정하고 나눠지는 수를 만든다 — 역산하지 않는다.
      const inner = pick(rng, SMALL_SF);
      const n = pick(rng, SMALL_SF);
      if (inner === n) return null;
      const m = inner * n;
      if (!isSquareFree(m)) return null;
      const out = intBetween(rng, 1, 5);
      const q = intBetween(rng, 1, 4);
      const p = out * q;
      if (p === 1 && q === 1 && out === 1) return null;
      return {
        content: `다음 식을 계산하시오.\n$${sqrtTerm(p, m)}\\div${sqrtTerm(q, n)}$`,
        answer: `$${sqrtTerm(out, inner)}$`,
        solution: `근호 안끼리 나누면 $\\sqrt{\\dfrac{${m}}{${n}}}=\\sqrt{${inner}}$ 이다.\n계수끼리 나누면 $${p}\\div${q}=${out}$ 이므로 주어진 식은 $${sqrtTerm(out, inner)}$ 이다.`,
        facts: { p, m, q, n, out, inner },
        figureSpec: null,
      };
    }),
  ),

  def(MINOR_CALC, "03", "를 이용한 식의 변형", SEC.근호계산, "기본", (rng) =>
    attempt(60, () => {
      const m = intBetween(rng, 2, 7);
      const s = pick(rng, SMALL_SF);
      const n = m * m * s;
      return {
        content: `$\\sqrt{${n}}$ ${eulReul(n)} $a\\sqrt{b}$ 꼴로 나타내시오. (단, $a$, $b$ 는 자연수이고 $b$ 는 가장 작은 수)`,
        answer: `$${sqrtTerm(m, s)}$`,
        solution: `$${n}=${m}^2\\times${s}$ 이므로 $\\sqrt{${n}}=\\sqrt{${m}^2\\times${s}}=${sqrtTerm(m, s)}$ 이다.`,
        facts: { n, out: m, inner: s },
        figureSpec: null,
      };
    }),
  ),

  def(MINOR_CALC, "04", "를 이용한 식의 변형", SEC.근호계산, "기본", (rng) =>
    attempt(60, () => {
      const k = intBetween(rng, 2, 6);
      const m = pick(rng, SMALL_SF);
      const n = k * k * m;
      return {
        content: `$${sqrtTerm(k, m)}$ ${eulReul(m)} $\\sqrt{a}$ 꼴로 나타내시오. (단, $a$ 는 자연수)`,
        answer: `$\\sqrt{${n}}$`,
        solution: `$${k}=\\sqrt{${k * k}}$ 이므로 $${sqrtTerm(k, m)}=\\sqrt{${k * k}}\\times\\sqrt{${m}}=\\sqrt{${n}}$ 이다.`,
        facts: { k, m, n },
        figureSpec: null,
      };
    }),
  ),

  def(
    MINOR_CALC,
    "05",
    "제곱근표에 없는 수의 제곱근의 값 구하기",
    SEC.근호계산,
    "응용",
    (rng) =>
      attempt(60, () => {
        const a = pick(rng, [2, 3, 5, 6, 7, 10] as const);
        const v3 = Math.round(Math.sqrt(a) * 1000);
        const branch = intBetween(rng, 0, 1);
        const mult = branch === 0 ? intBetween(rng, 2, 5) : 10;
        const b = mult * mult * a;
        const vStr = (v3 / 1000).toFixed(3);
        return {
          content: `$\\sqrt{${a}}=${vStr}$ 일 때, $\\sqrt{${b}}$ 의 값을 구하시오.`,
          answer: `$${trimNum((v3 / 1000) * mult)}$`,
          solution: `$${b}=${mult}^2\\times${a}$ 이므로 $\\sqrt{${b}}=${mult}\\sqrt{${a}}$ 이다.\n따라서 $\\sqrt{${b}}=${mult}\\times${vStr}=${trimNum((v3 / 1000) * mult)}$ 이다.`,
          facts: { a, v3, mult, b },
          figureSpec: null,
        };
      }),
  ),

  def(
    MINOR_CALC,
    "06",
    "제곱근을 문자를 사용하여 나타내기",
    SEC.근호계산,
    "심화하",
    (rng) =>
      attempt(80, () => {
        const x = intBetween(rng, 1, 4);
        const y = intBetween(rng, 0, 2);
        const e1 = x % 2;
        const e2 = y % 2;
        if (e1 + e2 === 0) return null;
        const n = 2 ** x * 3 ** y;
        const coef = 2 ** Math.floor(x / 2) * 3 ** Math.floor(y / 2);
        const rad = 2 ** e1 * 3 ** e2;
        const letters = `${e1 ? "a" : ""}${e2 ? "b" : ""}`;
        const body = coef === 1 ? letters : `${coef}${letters}`;
        // 계수가 $1$ 이면 꺼낼 제곱 인수가 없다 — `$\sqrt{6}=\sqrt{6}$` 을 적지 않고 바로 간다.
        const step1 =
          coef === 1
            ? ""
            : `$${n}=${coef}^2\\times${rad}$ 이므로 $\\sqrt{${n}}=${coef}\\sqrt{${rad}}$ 이다.\n`;
        return {
          content: `$\\sqrt{2}=a$, $\\sqrt{3}=b$ 라 할 때, $\\sqrt{${n}}$ ${eulReul(n)} $a$, $b$ 를 사용하여 나타내시오.`,
          answer: `$${body}$`,
          solution: `${step1}$\\sqrt{${rad}}=${letters}$ 이므로 $\\sqrt{${n}}=${body}$ 이다.`,
          facts: { n, coef, e1, e2 },
          figureSpec: null,
        };
      }),
  ),

  def(MINOR_CALC, "07", "분모의 유리화", SEC.근호계산, "응용", (rng) =>
    attempt(120, () => {
      const p = intBetween(rng, 2, 12);
      const m = pick(rng, SMALL_SF);
      const branch = intBetween(rng, 0, 1);
      const q = branch === 0 ? 1 : intBetween(rng, 2, 4);
      if (gcd(p, q) !== 1) return null;
      const shown =
        branch === 0
          ? `\\dfrac{${p}}{\\sqrt{${m}}}`
          : `\\dfrac{${p}}{${q}\\sqrt{${m}}}`;
      const ans = fracSqrt(p, m, q * m);
      return {
        content: `다음 수의 분모를 유리화하시오.\n$${shown}$`,
        answer: `$${ans}$`,
        solution: `분모와 분자에 $\\sqrt{${m}}$ ${eulReul(m)} 곱하면 $${chain(shown, `\\dfrac{${p}\\sqrt{${m}}}{${q * m}}`, ans)}$ 이다.`,
        facts: { p, q, m, branch },
        figureSpec: null,
      };
    }),
  ),

  def(
    MINOR_CALC,
    "08",
    "제곱근의 곱셈과 나눗셈의 혼합 계산",
    SEC.근호계산,
    "응용",
    (rng) =>
      attempt(300, () => {
        const a = pick(rng, SMALL_SF);
        const divisors = SMALL_SF.filter((d) => d > 1 && a % d === 0);
        if (divisors.length === 0) return null;
        const c = pick(rng, divisors);
        const w = a / c;
        const b = pick(rng, SMALL_SF);
        const r = intBetween(rng, 1, 3);
        const p = intBetween(rng, 1, 6);
        const q = intBetween(rng, 1, 6);
        if ((p * q) % r !== 0) return null;
        const s = simplifySqrt(w * b);
        if (s.inner === 1) return null;
        const coef = (p * q) / r;
        const out = coef * s.out;
        return {
          content: `다음 식을 계산하시오.\n$${sqrtTerm(p, a)}\\times${sqrtTerm(q, b)}\\div${sqrtTerm(r, c)}$`,
          answer: `$${sqrtTerm(out, s.inner)}$`,
          solution: `근호 안끼리 계산하면 $${chain(`\\sqrt{\\dfrac{${a}\\times${b}}{${c}}}`, `\\sqrt{${w * b}}`, sqrtTerm(s.out, s.inner))}$ 이다.\n계수끼리 계산하면 $${p}\\times${q}\\div${r}=${coef}$ 이므로 주어진 식은 $${sqrtTerm(out, s.inner)}$ 이다.`,
          facts: { p, a, q, b, r, c, out, inner: s.inner },
          figureSpec: null,
        };
      }),
  ),

  def(
    MINOR_CALC,
    "09",
    "제곱근의 곱셈과 나눗셈의 도형에의 활용",
    SEC.근호계산,
    "응용",
    (rng) =>
      attempt(120, () => {
        const p = intBetween(rng, 1, 5);
        const q = intBetween(rng, 1, 5);
        const a = pick(rng, MULT_SF);
        const b = pick(rng, MULT_SF);
        if (a === b) return null;
        const branch = intBetween(rng, 0, 1);
        if (branch === 1 && (p * q) % 2 !== 0) return null;
        const s = simplifySqrt(a * b);
        const coef = branch === 0 ? p * q : (p * q) / 2;
        const out = coef * s.out;
        const w = sqrtTerm(p, a);
        const h = sqrtTerm(q, b);
        const fin = `${sqrtTerm(out, s.inner)}\\,\\mathrm{cm}^2`;
        if (branch === 0) {
          return {
            content: `가로의 길이가 $${w}\\,\\mathrm{cm}$, 세로의 길이가 $${h}\\,\\mathrm{cm}$ 인 직사각형의 넓이를 구하시오.`,
            answer: `$${fin}$`,
            solution: `(직사각형의 넓이)$=${chain(`${w}\\times${h}`, sqrtTerm(coef, a * b), sqrtTerm(out, s.inner))}$ 이므로 넓이는 $${fin}$ 이다.`,
            facts: { p, a, q, b, out, inner: s.inner, branch },
            figureSpec: null,
          };
        }
        return {
          content: `밑변의 길이가 $${w}\\,\\mathrm{cm}$, 높이가 $${h}\\,\\mathrm{cm}$ 인 삼각형의 넓이를 구하시오.`,
          answer: `$${fin}$`,
          solution: `(삼각형의 넓이)$=${chain(`\\dfrac{1}{2}\\times${w}\\times${h}`, sqrtTerm(coef, a * b), sqrtTerm(out, s.inner))}$ 이므로 넓이는 $${fin}$ 이다.`,
          facts: { p, a, q, b, out, inner: s.inner, branch },
          figureSpec: null,
        };
      }),
  ),

  def(MINOR_CALC, "10", "제곱근의 덧셈과 뺄셈", SEC.근호계산, "기본", (rng) =>
    attempt(120, () => {
      const m = pick(rng, SQUAREFREE);
      const n = pick(rng, SQUAREFREE);
      if (m === n) return null;
      const p = intBetween(rng, 1, 7);
      const q = intBetween(rng, 1, 7);
      const r = intBetween(rng, 1, 7);
      if (p === r) return null;
      const c1 = p - r;
      const ans = sumSurds([
        { coef: c1, inner: m },
        { coef: q, inner: n },
      ]);
      return {
        content: `다음 식을 계산하시오.\n$${sqrtTerm(p, m)}+${sqrtTerm(q, n)}-${sqrtTerm(r, m)}$`,
        answer: `$${ans}$`,
        solution: `$\\sqrt{${m}}$ 끼리 모으면 $(${p}-${r})\\sqrt{${m}}=${sqrtTerm(c1, m)}$ 이다.\n따라서 주어진 식은 $${ans}$ 이다.`,
        facts: { p, q, r, m, n, c1, c2: q },
        figureSpec: null,
      };
    }),
  ),

  def(
    MINOR_CALC,
    "11",
    "를 이용한 제곱근의 덧셈과 뺄셈",
    SEC.근호계산,
    "응용",
    (rng) =>
      attempt(120, () => {
        const s = pick(rng, SMALL_SF);
        const a = intBetween(rng, 2, 6);
        const b = intBetween(rng, 2, 6);
        const c = intBetween(rng, 2, 6);
        const coef = a + b - c;
        if (coef === 0) return null;
        const A = a * a * s;
        const B = b * b * s;
        const C = c * c * s;
        if (A === B || B === C || A === C) return null;
        if (Math.max(A, B, C) > 400) return null;
        return {
          content: `다음 식을 계산하시오.\n$\\sqrt{${A}}+\\sqrt{${B}}-\\sqrt{${C}}$`,
          answer: `$${sqrtTerm(coef, s)}$`,
          solution: `$\\sqrt{${A}}=${sqrtTerm(a, s)}$, $\\sqrt{${B}}=${sqrtTerm(b, s)}$, $\\sqrt{${C}}=${sqrtTerm(c, s)}$ 이다.\n따라서 주어진 식은 $(${a}+${b}-${c})\\sqrt{${s}}=${sqrtTerm(coef, s)}$ 이다.`,
          facts: { A, B, C, s, coef },
          figureSpec: null,
        };
      }),
  ),

  def(
    MINOR_CALC,
    "12",
    "분모의 유리화를 이용한 제곱근의 덧셈과 뺄셈",
    SEC.근호계산,
    "응용",
    (rng) =>
      attempt(120, () => {
        const p = intBetween(rng, 2, 12);
        const q = intBetween(rng, 1, 5);
        const m = pick(rng, SMALL_SF);
        const branch = intBetween(rng, 0, 1);
        const num = branch === 0 ? p + q * m : p - q * m;
        if (num === 0) return null;
        const op = branch === 0 ? "+" : "-";
        const ans = fracSqrt(num, m, m);
        return {
          content: `다음 식을 계산하시오.\n$\\dfrac{${p}}{\\sqrt{${m}}}${op}${sqrtTerm(q, m)}$`,
          answer: `$${ans}$`,
          solution: `$\\dfrac{${p}}{\\sqrt{${m}}}=\\dfrac{${p}\\sqrt{${m}}}{${m}}$ 이고 $${sqrtTerm(q, m)}=\\dfrac{${q * m}\\sqrt{${m}}}{${m}}$ 이다.\n따라서 주어진 식은 $${chain(`\\dfrac{(${p}${op}${q * m})\\sqrt{${m}}}{${m}}`, ans)}$ 이다.`,
          facts: { p, q, m, branch, num },
          figureSpec: null,
        };
      }),
  ),

  def(
    MINOR_CALC,
    "13",
    "제곱근의 덧셈과 뺄셈의 수직선에의 활용",
    SEC.근호계산,
    "응용",
    (rng) =>
      attempt(120, () => {
        const c = intBetween(rng, -4, 6);
        const s = pick(rng, [2, 3, 5, 6, 7] as const);
        const a = intBetween(rng, 1, 5);
        const b = intBetween(rng, 1, 5);
        if (a === b) return null;
        const A = a * a * s;
        const B = b * b * s;
        if (Math.max(A, B) > 200) return null;
        const k = a - b;
        return {
          content: `수직선 위에서 좌표가 $${c}$ 인 점에서 오른쪽으로 $\\sqrt{${A}}$ 만큼 이동한 후, 다시 왼쪽으로 $\\sqrt{${B}}$ 만큼 이동한 점에 대응하는 수를 구하시오.`,
          answer: `$${constPlusSurd(c, k, s)}$`,
          solution: `$${chain(`\\sqrt{${A}}`, sqrtTerm(a, s))}$, $${chain(`\\sqrt{${B}}`, sqrtTerm(b, s))}$ 이다.\n따라서 대응하는 수는 $${c}+${sqrtTerm(a, s)}-${sqrtTerm(b, s)}=${constPlusSurd(c, k, s)}$ 이다.`,
          facts: { c, A, B, s, k },
          figureSpec: null,
        };
      }),
  ),

  def(
    MINOR_CALC,
    "14",
    "분배법칙을 이용한 근호를 포함한 식의 계산",
    SEC.근호계산,
    "응용",
    (rng) =>
      attempt(200, () => {
        const a = pick(rng, MULT_SF);
        const b = pick(rng, MULT_SF);
        const c = pick(rng, MULT_SF);
        const p = intBetween(rng, 1, 5);
        if (b === c) return null;
        const s1 = simplifySqrt(a * b);
        const s2 = simplifySqrt(a * c);
        if (s1.inner === s2.inner) return null;
        if (s1.inner === 1 || s2.inner === 1) return null;
        const t1 = { coef: s1.out, inner: s1.inner };
        const t2 = { coef: p * s2.out, inner: s2.inner };
        const raw = `\\sqrt{${a * b}}+${sqrtTerm(p, a * c)}`;
        const ans = sumSurds([t1, t2]);
        return {
          content: `다음 식을 계산하시오.\n$\\sqrt{${a}}(\\sqrt{${b}}+${sqrtTerm(p, c)})$`,
          answer: `$${ans}$`,
          solution: `분배법칙에 의하여 $\\sqrt{${a}}\\times\\sqrt{${b}}+\\sqrt{${a}}\\times${sqrtTerm(p, c)}=${raw}$ 이다.\n근호 안을 정리하면 $${ans}$ 이다.`,
          facts: {
            a,
            b,
            c,
            p,
            o1: t1.coef,
            i1: t1.inner,
            o2: t2.coef,
            i2: t2.inner,
          },
          figureSpec: null,
        };
      }),
  ),

  def(
    MINOR_CALC,
    "15",
    "분배법칙을 이용한 분모의 유리화",
    SEC.근호계산,
    "심화하",
    (rng) =>
      attempt(200, () => {
        const a = pick(rng, MULT_SF);
        const b = pick(rng, MULT_SF);
        const c = pick(rng, MULT_SF);
        if (a === b) return null;
        const s1 = simplifySqrt(a * c);
        const s2 = simplifySqrt(b * c);
        if (s1.inner === s2.inner) return null;
        if (s1.inner === 1 || s2.inner === 1) return null;
        const g = gcd(gcd(s1.out, s2.out), c);
        const o1 = s1.out / g;
        const o2 = s2.out / g;
        const den = c / g;
        const numLatex = sumSurds([
          { coef: o1, inner: s1.inner },
          { coef: o2, inner: s2.inner },
        ]);
        const ans = den === 1 ? numLatex : `\\dfrac{${numLatex}}{${den}}`;
        const raw = `\\dfrac{\\sqrt{${a * c}}+\\sqrt{${b * c}}}{${c}}`;
        return {
          content: `다음 수의 분모를 유리화하시오.\n$\\dfrac{\\sqrt{${a}}+\\sqrt{${b}}}{\\sqrt{${c}}}$`,
          answer: `$${ans}$`,
          solution: `분모와 분자에 $\\sqrt{${c}}$ ${eulReul(c)} 곱하면 $${chain(raw, ans)}$ 이다.`,
          facts: {
            a,
            b,
            c,
            o1,
            i1: s1.inner,
            o2,
            i2: s2.inner,
            den,
          },
          figureSpec: null,
        };
      }),
  ),

  def(
    MINOR_CALC,
    "16",
    "근호를 포함한 식의 혼합 계산",
    SEC.근호계산,
    "심화하",
    (rng) =>
      attempt(200, () => {
        const p = intBetween(rng, 1, 4);
        const a = pick(rng, MULT_SF);
        const b = pick(rng, MULT_SF);
        const s = simplifySqrt(a * b);
        if (s.inner === 1 || s.inner > 30) return null;
        const o1 = p * s.out;
        if (o1 < 2) return null;
        const k = intBetween(rng, 1, o1 - 1);
        const c = s.inner;
        const q = c * k;
        const left = `${sqrtTerm(p, a)}\\times\\sqrt{${b}}`;
        return {
          content: `다음 식을 계산하시오.\n$${left}-\\dfrac{${q}}{\\sqrt{${c}}}$`,
          answer: `$${sqrtTerm(o1 - k, c)}$`,
          solution: `$${chain(left, sqrtTerm(p, a * b), sqrtTerm(o1, c))}$ 이다.\n$${chain(`\\dfrac{${q}}{\\sqrt{${c}}}`, `\\dfrac{${q}\\sqrt{${c}}}{${c}}`, sqrtTerm(k, c))}$ 이므로 주어진 식은 $${sqrtTerm(o1, c)}-${sqrtTerm(k, c)}=${sqrtTerm(o1 - k, c)}$ 이다.`,
          facts: { p, a, b, q, c, o1, k },
          figureSpec: null,
        };
      }),
  ),

  def(
    MINOR_CALC,
    "17",
    "제곱근의 계산 결과가 유리수가 될 조건",
    SEC.근호계산,
    "심화하",
    (rng) =>
      attempt(80, () => {
        const k = intBetween(rng, 1, 4);
        const p = pick(rng, SMALL_SF);
        const q = intBetween(rng, 1, 6);
        const r = intBetween(rng, 1, 6);
        const a = -k * q;
        return {
          content: `다음 식이 유리수가 되도록 하는 유리수 $a$ 의 값을 구하시오.\n$${sqrtTerm(k, p)}(${q}-\\sqrt{${p}})+a(\\sqrt{${p}}+${r})$`,
          answer: `$${a}$`,
          // 계수 $1$ 은 안 쓴다 — 「$1\sqrt{15}$」·「$+1a$」가 나갔다(2026-09-27, `pageSmells`).
          solution: `전개하면 $${sqrtTerm(k * q, p)}-${k * p}+a\\sqrt{${p}}+${coefLetter(r, "a")}=(${k * q}+a)\\sqrt{${p}}+(${coefLetter(r, "a")}-${k * p})$ 이다.\n무리수 $\\sqrt{${p}}$ 의 계수가 $0$ 이어야 하므로 $${k * q}+a=0$, 즉 $a=${a}$ 이다.`,
          facts: { k, p, q, r, a },
          figureSpec: null,
        };
      }),
  ),

  def(
    MINOR_CALC,
    "18",
    "제곱근의 덧셈과 뺄셈의 도형에의 활용",
    SEC.근호계산,
    "응용",
    (rng) =>
      attempt(120, () => {
        const s = pick(rng, [2, 3, 5, 6, 7] as const);
        const a = intBetween(rng, 1, 5);
        const b = intBetween(rng, 1, 5);
        if (a === b) return null;
        const A = a * a * s;
        const B = b * b * s;
        if (Math.max(A, B) > 200) return null;
        const coef = 2 * (a + b);
        return {
          content: `가로의 길이가 $\\sqrt{${A}}\\,\\mathrm{cm}$, 세로의 길이가 $\\sqrt{${B}}\\,\\mathrm{cm}$ 인 직사각형의 둘레의 길이를 구하시오.`,
          answer: `$${sqrtTerm(coef, s)}\\,\\mathrm{cm}$`,
          solution: `$${chain(`\\sqrt{${A}}`, sqrtTerm(a, s))}$, $${chain(`\\sqrt{${B}}`, sqrtTerm(b, s))}$ 이다.\n(둘레의 길이)$=2(${sqrtTerm(a, s)}+${sqrtTerm(b, s)})=${sqrtTerm(coef, s)}\\,\\mathrm{cm}$ 이다.`,
          facts: { A, B, s, coef },
          figureSpec: null,
        };
      }),
  ),

  def(MINOR_CALC, "19", "실수의 대소 관계", SEC.근호계산, "응용", (rng) =>
    attempt(120, () => {
      const p = intBetween(rng, 1, 5);
      const q = intBetween(rng, 1, 5);
      const m = pick(rng, SMALL_SF);
      const n = pick(rng, SMALL_SF);
      const left = p * p * m;
      const right = q * q * n;
      if (left === right) return null;
      if (sqrtTerm(p, m) === sqrtTerm(q, n)) return null;
      const lt = left < right ? 1 : 0;
      const rel = lt === 1 ? "<" : ">";
      const moved = (
        [
          [p, m, left],
          [q, n, right],
        ] as const
      )
        .filter(([c]) => c !== 1)
        .map(([c, r, v]) => `$${sqrtTerm(c, r)}=\\sqrt{${v}}$`);
      return {
        content: `두 수 $${sqrtTerm(p, m)}$ ${waGwa(m)} $${sqrtTerm(q, n)}$ 의 대소를 비교하시오.`,
        answer: `$${sqrtTerm(p, m)}${rel}${sqrtTerm(q, n)}$`,
        // 계수가 $1$ 인 쪽은 넣을 것이 없다 — `$\sqrt{13}=\sqrt{13}$` 을 적지 않는다.
        solution: `${moved.length ? `근호 안으로 넣으면 ${moved.join(", ")} 이다.\n` : ""}$${left}${rel}${right}$ 이므로 $${sqrtTerm(p, m)}${rel}${sqrtTerm(q, n)}$ 이다.`,
        facts: { p, m, q, n, lt },
        figureSpec: null,
      };
    }),
  ),

  def(
    MINOR_CALC,
    "20",
    "무리수의 정수 부분과 소수 부분",
    SEC.근호계산,
    "심화하",
    (rng) =>
      attempt(120, () => {
        const n = pick(rng, SQUAREFREE);
        if (n < 5) return null;
        const k = Math.floor(Math.sqrt(n));
        const branch = intBetween(rng, 0, 1);
        const m = intBetween(rng, 1, 5);
        if (branch === 0) {
          return {
            content: `$\\sqrt{${n}}$ 의 소수 부분을 근호를 사용하여 나타내시오.`,
            answer: `$\\sqrt{${n}}-${k}$`,
            solution: `$${k}<\\sqrt{${n}}<${k + 1}$ 이므로 $\\sqrt{${n}}$ 의 정수 부분은 $${k}$ 이다.\n따라서 소수 부분은 $\\sqrt{${n}}-${k}$ 이다.`,
            facts: { n, k, m, branch },
            figureSpec: null,
          };
        }
        return {
          content: `$${m}+\\sqrt{${n}}$ 의 정수 부분을 구하시오.`,
          answer: `$${m + k}$`,
          solution: `$${k}<\\sqrt{${n}}<${k + 1}$ 이므로 $${m + k}<${m}+\\sqrt{${n}}<${m + k + 1}$ 이다.\n따라서 정수 부분은 $${m + k}$ 이다.`,
          facts: { n, k, m, branch },
          figureSpec: null,
        };
      }),
  ),
];

/** RPM 3-1 앞 세 중단원 48유형. */
export const M3_ROOT: TypeEntry[] = [
  ...SQRT_TYPES,
  ...IRR_TYPES,
  ...CALC_TYPES,
];
