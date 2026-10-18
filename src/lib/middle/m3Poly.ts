/**
 * 중3 「다항식의 곱셈과 인수분해」 — RPM 3-1 «다항식의 곱셈» 18유형 +
 * «다항식의 인수분해» 22유형 = **40유형**.
 *
 * 물결 4C 세션 소유 모듈 — 이 파일과 짝 시험(`middleM3Poly.test.ts`)·변이 하네스
 * (`scripts/qa/mutate-m3-poly.py`)만 이 세션이 만진다(middle-engine-wave3-plan.md §9
 * 소유권 규칙). 합본 `m3.ts` 에는 import 한 줄과 spread 한 줄만 더한다.
 *
 * 우리 단원(prisma/seed-data/units.ts 472~474): 「다항식의 곱셈」·「인수분해」·
 * 「인수분해의 응용」. 유형 번호·제목은 `scripts/rpm/rpm-type-catalog.json` 3-1 색인의
 * **바이트 그대로**다 — 곱셈 03~06·14·17·18 과 인수분해 03·06~08·21 의 제목이
 * 「의 …」로 시작하는 것은 색인이 앞의 **수식 그림**(`(a+b)Û`, `acxÛ`+…` 등)을 잃은
 * 흔적이고, 손으로 되살리면 `middleTypeCoverage.test.ts` 의 전량 대조가 빨개진다.
 * 인수분해 17·18 의 제목이 **글자 그대로 같은 것**도 색인이 「4개」·「2개/3개」의
 * 숫자를 잃었기 때문이다 — 번호가 둘을 가른다.
 *
 * ## 생성 규칙 — 답을 먼저 정하고 발문을 만든다
 *
 * **인수(또는 곱할 두 식)를 먼저 뽑고, 발문은 그것을 전개해서 만든다.** 그래서
 * 「인수분해가 안 되는 식」이 나올 수 없다 — 판별식을 사후에 확인하는 것이 아니라
 * 애초에 곱으로 지었다. 반대 방향(발문에서 답을 역산)은 쓰지 않는다.
 *
 * `facts` 에는 **그 인수의 계수**를 싣는다. 시험은 그 계수를 옮겨 적지 않고,
 * **지면에 나가는 글자**(발문의 식 · 정답의 식)를 각각 파싱해 **여러 정수 점에
 * 대입해** 두 함수가 같은지 본다. 계수 산술을 다시 하지 않으므로 동어반복이 아니다
 * (전개와 인수분해는 서로가 검산이다 — 4C 브리프).
 *
 * ## 완전 인수분해 (브리프 계약)
 *
 * 정답의 각 괄호 인수는 **더 이상 공통인수가 남아 있지 않아야** 한다:
 * `2x^2+4x` 의 답은 `2x(x+2)` 이지 `x(2x+4)` 가 아니다. 시험이 정답 문자열을
 * 인수로 갈라 ㉠ 정수 계수의 최대공약수가 $1$ 인가 ㉡ 모든 항이 같은 문자를
 * 갖지 않는가 ㉢ 일변수 이차 인수의 판별식이 제곱수가 아닌가 를 **전량** 잰다.
 *
 * ## 분수 (D-73)
 *
 * 2026-08-24 원장님 확정으로 제품이 가분수를 대분수로 바꾸지 않는다. 이 모듈은
 * 애초에 **정수 계수만** 쓰고, 분수는 유리화 결과(곱셈 13)와 수의 계산(인수 19)
 * 에서만 나온다. 시험이 제품 `preprocessMathText` 를 **실제로 돌려** 수식 안의
 * 수가 그대로인지 본다.
 *
 * ## 그림
 *
 * **40유형 전부 그림이 없다**(`figureSpec: null`). 도형 활용 넷(곱셈 08·09,
 * 인수분해 13·14)은 RPM 이 그림으로 주는 조건을 **발문 문장이 전부 말하도록**
 * 다시 썼다 — 예: 인수분해 13 은 「넓이가 $x^2$ 인 정사각형 1개, 넓이가 $x$ 인
 * 직사각형 7개 …」로 조각의 개수를 글로 준다. 없는 kind 를 지어내지 않는다(09 §4).
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { eulReul, euroRo, waGwa } from "./m2Josa";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중3";
const BOOK = "3-1";
const MINOR_MUL = "다항식의 곱셈";
const MINOR_FAC = "다항식의 인수분해";

/** 우리 Unit.section 정확한 이름 (prisma/seed-data/units.ts 472~474). */
const SEC = {
  곱셈: "다항식의 곱셈",
  인수: "인수분해",
  응용: "인수분해의 응용",
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
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

function isSquare(n: number): boolean {
  if (n < 0) return false;
  const r = Math.round(Math.sqrt(n));
  return r * r === n;
}

/** $0$ 이 아닌 정수 하나 — 부호까지 뽑는다. */
function nonZero(rng: Rng, lo: number, hi: number): number {
  const v = intBetween(rng, lo, hi);
  return v === 0 ? hi : v;
}

/** 제곱수가 아닌 근호 안의 수 — 근호 계열 유형이 공유한다. */
const RADICANDS = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19, 21, 22] as const;

/* ────────────────────────────────────────────────────────────────────────
 * 다항식 글자 만들기 — 계수와 몸통을 받아 LaTeX 한 줄로
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * `[계수, 몸통]` 한 항. 계수가 $0$ 이면 빈 문자열, `lead` 면 `+` 를 생략한다.
 * 몸통이 있고 계수가 $\pm1$ 이면 숫자를 적지 않는다(`-x^2`).
 */
function termTex(coef: number, body: string, lead: boolean): string {
  if (coef === 0) return "";
  const sign = coef < 0 ? "-" : lead ? "" : "+";
  const a = Math.abs(coef);
  const num = a === 1 && body !== "" ? "" : String(a);
  return `${sign}${num}${body}`;
}

/** 항들을 이어 붙인다. 전부 $0$ 이면 `0`. */
function polyTex(parts: readonly (readonly [number, string])[]): string {
  let out = "";
  for (const [c, b] of parts) out += termTex(c, b, out === "");
  return out === "" ? "0" : out;
}

/** `ax+b` 꼴 — 계수 $1$·$-1$ 과 상수 $0$ 을 정리한다. */
function lin(a: number, v: string, b: number): string {
  return polyTex([
    [a, v],
    [b, ""],
  ]);
}

/** `ax+by` 꼴. */
function lin2(a: number, v: string, b: number, w: string): string {
  return polyTex([
    [a, v],
    [b, w],
  ]);
}

function par(s: string): string {
  return `(${s})`;
}

/** 음수는 괄호로 감싼다 — `5	imes(-4)` 처럼 곱셈 기호 뒤에서 부호가 붙지 않게. */
function wp(coef: number, body: string): string {
  const t = termTex(coef, body, true);
  return coef < 0 ? `(${t})` : t;
}

/**
 * 주격·보조사 — 받침 판정은 `m2Josa` 의 규칙 하나에 맡긴다(옮겨 적지 않는다).
 * `waGwa` 가 「와」면 그 수는 모음으로 끝난다.
 */
function iGa(n: number): "이" | "가" {
  return waGwa(n) === "와" ? "가" : "이";
}

function eunNeun(n: number): "은" | "는" {
  return waGwa(n) === "와" ? "는" : "은";
}

/** 한 문자짜리 인수는 괄호를 씌우지 않는다 — `x(x+1)(x+2)(x+3)`. */
function parUnlessBare(s: string): string {
  return /^[a-z]$/.test(s) ? s : par(s);
}

/** `$…$` — 수는 반드시 KaTeX 안에 있어야 한다(bareNumbers 가드). */
function M(s: string): string {
  return `$${s}$`;
}

/** `n\sqrt{r}` 을 포함한 `정수 + 계수√r` 꼴. */
function surdSum(intPart: number, coef: number, r: number): string {
  return polyTex([
    [intPart, ""],
    [coef, `\\sqrt{${r}}`],
  ]);
}

/**
 * 생성기가 돌려주는 몫 — `figureSpec` 은 `def` 가 `null` 로 고정한다.
 *
 * `facts` 의 값이 `number | undefined` 인 이유: 모드별로 갈라지는 생성기는
 * 여러 객체 리터럴의 **합집합**을 돌려주고, TypeScript 는 어느 갈래에만 있는
 * 키에 `?: undefined` 를 붙인다. `def` 가 `undefined` 인 키를 **떨어내고** 나서
 * `MidProblem.facts`(`Record<string, number>`)로 넘긴다 — 억지 캐스트로
 * 덮지 않는다.
 */
type Gen = {
  content: string;
  answer: string;
  solution: string;
  facts: Record<string, number | undefined>;
};

function def(
  minor: string,
  rpmType: string,
  rpmTitle: string,
  unitSection: string,
  difficulty: MidProblem["difficulty"],
  gen: (rng: Rng) => Gen,
): TypeEntry {
  return {
    key: `${BOOK}|${minor}|${rpmType}`,
    grade: GRADE,
    unitSection,
    rpmBook: BOOK,
    rpmMinor: minor,
    rpmType,
    rpmTitle,
    handler: (rng) => {
      const g = gen(rng);
      const facts: Record<string, number> = {};
      for (const [k, v] of Object.entries(g.facts)) {
        if (v !== undefined) facts[k] = v;
      }
      return {
        grade: GRADE,
        unitSection,
        rpmBook: BOOK,
        rpmMinor: minor,
        rpmType,
        rpmTitle,
        difficulty,
        figureSpec: null,
        content: g.content,
        answer: g.answer,
        solution: g.solution,
        facts,
      };
    },
  };
}

const EXPAND = "다음 식을 전개하시오.";
const CALC = "다음 식을 계산하시오.";
const FACTOR = "다음 식을 인수분해하시오.";

/* ────────────────────────────────────────────────────────────────────────
 * 다항식의 곱셈 18유형
 * ──────────────────────────────────────────────────────────────────────── */

const MUL: TypeEntry[] = [
  def(MINOR_MUL, "01", "다항식다항식의 전개", SEC.곱셈, "기본", (rng) =>
    // (ax+by)(cx+dy+e) — 분배법칙만으로 다섯 항이 나온다.
    attempt<Gen>(80, () => {
      const a = intBetween(rng, 2, 4);
      const b = nonZero(rng, -4, 4);
      const c = intBetween(rng, 1, 3);
      const d = nonZero(rng, -4, 4);
      const e = nonZero(rng, -5, 5);
      if (gcd(a, Math.abs(b)) !== 1 || gcd(c, Math.abs(d)) !== 1) return null;
      if (a * d + b * c === 0) return null;
      const src = `${par(lin2(a, "x", b, "y"))}${par(
        polyTex([
          [c, "x"],
          [d, "y"],
          [e, ""],
        ]),
      )}`;
      const out = polyTex([
        [a * c, "x^2"],
        [a * d + b * c, "xy"],
        [b * d, "y^2"],
        [a * e, "x"],
        [b * e, "y"],
      ]);
      return {
        content: `${EXPAND}\n${M(src)}`,
        answer: M(out),
        solution: `분배법칙으로 앞 다항식의 각 항을 뒤 다항식의 각 항에 곱한다.\n${M(
          `${src}=${out}`,
        )}`,
        facts: { a, b, c, d, e },
      };
    }),
  ),

  def(
    MINOR_MUL,
    "02",
    "전개식에서 특정한 항의 계수 구하기",
    SEC.곱셈,
    "응용",
    (rng) =>
      // (ax+b)(cx^2+dx+e) 의 x^2 또는 x 의 계수. 전개식을 다 쓰지 않고 필요한 항만 센다.
      attempt<Gen>(80, () => {
        const a = intBetween(rng, 2, 5);
        const b = nonZero(rng, -6, 6);
        const c = intBetween(rng, 1, 4);
        const d = nonZero(rng, -6, 6);
        const e = nonZero(rng, -7, 7);
        const which = pick(rng, [2, 1] as const);
        const coef = which === 2 ? a * d + b * c : a * e + b * d;
        if (coef === 0) return null;
        const src = `${par(lin(a, "x", b))}${par(
          polyTex([
            [c, "x^2"],
            [d, "x"],
            [e, ""],
          ]),
        )}`;
        const body = which === 2 ? "x^2" : "x";
        const left =
          which === 2
            ? `${wp(a, "x")}\\times ${wp(d, "x")}`
            : `${wp(a, "x")}\\times ${wp(e, "")}`;
        const right =
          which === 2
            ? `${wp(b, "")}\\times ${wp(c, "x^2")}`
            : `${wp(b, "")}\\times ${wp(d, "x")}`;
        return {
          content: `${M(src)} 의 전개식에서 ${M(body)} 의 계수를 구하시오.`,
          answer: M(String(coef)),
          solution: `${M(body)} 항은 ${M(left)}, ${M(
            right,
          )} 두 곳에서만 나온다.\n두 항의 계수를 더하면 ${M(
            `${
              which === 2
                ? `${wp(a, "")}\\times${wp(d, "")}`
                : `${wp(a, "")}\\times${wp(e, "")}`
            }+${
              which === 2
                ? `${wp(b, "")}\\times${wp(c, "")}`
                : `${wp(b, "")}\\times${wp(d, "")}`
            }=${coef}`,
          )} 이다.`,
          facts: { a, b, c, d, e, which, coef },
        };
      }),
  ),

  def(MINOR_MUL, "03", "의 전개", SEC.곱셈, "기본", (rng) =>
    // (a±b)^2 = a^2 ± 2ab + b^2
    attempt<Gen>(80, () => {
      const mode = pick(rng, [0, 1] as const);
      if (mode === 0) {
        const a = intBetween(rng, 2, 6);
        const b = nonZero(rng, -6, 6);
        if (gcd(a, Math.abs(b)) !== 1) return null;
        const src = `${par(lin2(a, "x", b, "y"))}^2`;
        const out = polyTex([
          [a * a, "x^2"],
          [2 * a * b, "xy"],
          [b * b, "y^2"],
        ]);
        return {
          content: `${EXPAND}\n${M(src)}`,
          answer: M(out),
          solution: `${M("(A+B)^2=A^2+2AB+B^2")} 임을 이용한다.\n${M(
            `${src}=${out}`,
          )}`,
          facts: { mode, a, b },
        };
      }
      const a = intBetween(rng, 1, 5);
      const b = nonZero(rng, -9, 9);
      if (gcd(a, Math.abs(b)) !== 1) return null;
      const src = `${par(lin(a, "x", b))}^2`;
      const out = polyTex([
        [a * a, "x^2"],
        [2 * a * b, "x"],
        [b * b, ""],
      ]);
      return {
        content: `${EXPAND}\n${M(src)}`,
        answer: M(out),
        solution: `${M("(A+B)^2=A^2+2AB+B^2")} 임을 이용한다.\n${M(`${src}=${out}`)}`,
        facts: { mode, a, b },
      };
    }),
  ),

  def(MINOR_MUL, "04", "의 전개", SEC.곱셈, "기본", (rng) =>
    // (a+b)(a-b) = a^2-b^2. 세 번째 모드는 순서를 뒤집어 부호를 헷갈리게 한다.
    attempt<Gen>(80, () => {
      const mode = pick(rng, [0, 1, 2] as const);
      const a = intBetween(rng, 1, 7);
      const b = intBetween(rng, 1, 9);
      if (gcd(a, b) !== 1) return null;
      if (mode === 0) {
        const src = `${par(lin2(a, "x", b, "y"))}${par(lin2(a, "x", -b, "y"))}`;
        const out = polyTex([
          [a * a, "x^2"],
          [-b * b, "y^2"],
        ]);
        return {
          content: `${EXPAND}\n${M(src)}`,
          answer: M(out),
          solution: `${M("(A+B)(A-B)=A^2-B^2")} 임을 이용한다.\n${M(`${src}=${out}`)}`,
          facts: { mode, a, b },
        };
      }
      if (mode === 1) {
        const src = `${par(lin(a, "x", b))}${par(lin(a, "x", -b))}`;
        const out = polyTex([
          [a * a, "x^2"],
          [-b * b, ""],
        ]);
        return {
          content: `${EXPAND}\n${M(src)}`,
          answer: M(out),
          solution: `${M("(A+B)(A-B)=A^2-B^2")} 임을 이용한다.\n${M(`${src}=${out}`)}`,
          facts: { mode, a, b },
        };
      }
      const src = `${par(lin2(-a, "x", b, "y"))}${par(lin2(a, "x", b, "y"))}`;
      const out = polyTex([
        [b * b, "y^2"],
        [-a * a, "x^2"],
      ]);
      return {
        content: `${EXPAND}\n${M(src)}`,
        answer: M(out),
        solution: `앞의 식을 ${M(
          `${lin2(b, "y", -a, "x")}`,
        )} 로 보면 두 식은 합과 차의 꼴이다.\n${M(`${src}=${out}`)}`,
        facts: { mode, a, b },
      };
    }),
  ),

  def(MINOR_MUL, "05", "의 전개", SEC.곱셈, "기본", (rng) =>
    // (x+a)(x+b) = x^2+(a+b)x+ab
    attempt<Gen>(80, () => {
      const mode = pick(rng, [0, 1] as const);
      const a = nonZero(rng, -9, 9);
      const b = nonZero(rng, -9, 9);
      if (a === b) return null;
      if (mode === 0) {
        const src = `${par(lin(1, "x", a))}${par(lin(1, "x", b))}`;
        const out = polyTex([
          [1, "x^2"],
          [a + b, "x"],
          [a * b, ""],
        ]);
        return {
          content: `${EXPAND}\n${M(src)}`,
          answer: M(out),
          solution: `${M(
            "(x+a)(x+b)=x^2+(a+b)x+ab",
          )} 임을 이용한다.\n두 수의 합은 ${M(String(a + b))}, 곱은 ${M(
            String(a * b),
          )} 이므로 ${M(`${src}=${out}`)} 이다.`,
          facts: { mode, a, b },
        };
      }
      const src = `${par(lin2(1, "x", a, "y"))}${par(lin2(1, "x", b, "y"))}`;
      const out = polyTex([
        [1, "x^2"],
        [a + b, "xy"],
        [a * b, "y^2"],
      ]);
      return {
        content: `${EXPAND}\n${M(src)}`,
        answer: M(out),
        solution: `${M("y")} 를 상수처럼 보고 ${M(
          "(x+a)(x+b)=x^2+(a+b)x+ab",
        )} 임을 이용한다.\n${M(`${src}=${out}`)}`,
        facts: { mode, a, b },
      };
    }),
  ),

  def(MINOR_MUL, "06", "의 전개", SEC.곱셈, "응용", (rng) =>
    // (ax+b)(cx+d) = acx^2+(ad+bc)x+bd
    attempt<Gen>(80, () => {
      const mode = pick(rng, [0, 1] as const);
      const a = intBetween(rng, 2, 5);
      const b = nonZero(rng, -7, 7);
      const c = intBetween(rng, 1, 5);
      const d = nonZero(rng, -7, 7);
      if (gcd(a, Math.abs(b)) !== 1 || gcd(c, Math.abs(d)) !== 1) return null;
      if (a * d + b * c === 0) return null;
      if (mode === 0) {
        const src = `${par(lin(a, "x", b))}${par(lin(c, "x", d))}`;
        const out = polyTex([
          [a * c, "x^2"],
          [a * d + b * c, "x"],
          [b * d, ""],
        ]);
        return {
          content: `${EXPAND}\n${M(src)}`,
          answer: M(out),
          solution: `${M(
            "(ax+b)(cx+d)=acx^2+(ad+bc)x+bd",
          )} 임을 이용한다.\n${M(`${src}=${out}`)}`,
          facts: { mode, a, b, c, d },
        };
      }
      const src = `${par(lin2(a, "x", b, "y"))}${par(lin2(c, "x", d, "y"))}`;
      const out = polyTex([
        [a * c, "x^2"],
        [a * d + b * c, "xy"],
        [b * d, "y^2"],
      ]);
      return {
        content: `${EXPAND}\n${M(src)}`,
        answer: M(out),
        solution: `${M(
          "(ax+b)(cx+d)=acx^2+(ad+bc)x+bd",
        )} 를 ${M("y")} 에 대해서도 그대로 쓴다.\n${M(`${src}=${out}`)}`,
        facts: { mode, a, b, c, d },
      };
    }),
  ),

  def(MINOR_MUL, "07", "곱셈 공식 종합", SEC.곱셈, "응용", (rng) =>
    // 완전제곱식 - 합차공식 — 공식 둘을 한 식에서 함께 쓴다.
    attempt<Gen>(80, () => {
      const a = intBetween(rng, 2, 5);
      const b = nonZero(rng, -6, 6);
      const c = intBetween(rng, 1, 4);
      const d = intBetween(rng, 2, 8);
      if (a * a - c * c === 0) return null;
      const first = `${par(lin(a, "x", b))}^2`;
      const second = `${par(lin(c, "x", d))}${par(lin(c, "x", -d))}`;
      const src = `${first}-${second}`;
      const out = polyTex([
        [a * a - c * c, "x^2"],
        [2 * a * b, "x"],
        [b * b + d * d, ""],
      ]);
      return {
        content: `${CALC}\n${M(src)}`,
        answer: M(out),
        solution: `${M(
          `${first}=${polyTex([
            [a * a, "x^2"],
            [2 * a * b, "x"],
            [b * b, ""],
          ])}`,
        )} 이고 ${M(
          `${second}=${polyTex([
            [c * c, "x^2"],
            [-d * d, ""],
          ])}`,
        )} 이다.\n두 식을 빼면 ${M(out)} 이다.`,
        facts: { a, b, c, d },
      };
    }),
  ),

  def(MINOR_MUL, "08", "곱셈 공식의 도형에의 활용 ⑴", SEC.곱셈, "응용", (rng) =>
    // 직사각형의 가로를 늘이고 세로를 줄인다 — 그림 없이 발문이 조건을 다 말한다.
    attempt<Gen>(80, () => {
      const a = intBetween(rng, 2, 6);
      const b = intBetween(rng, 2, 6);
      // 가로와 세로가 같은 식이면 「가로 $3x$, 세로 $3x$인 직사각형」 — 정사각형을 직사각형이라
      // 부르는 꼴이다(씨앗 1,000 중 18.3%, 2026-09-27). 09 가 이미 막는 것과 같다.
      // 통과율 92.9% → 76.2%(전수) — 80번이면 던질 확률 $10^{-50}$.
      if (a === b) return null;
      const p = intBetween(rng, 1, 6);
      const q = intBetween(rng, 1, 6);
      if (b * p - a * q === 0) return null;
      const out = polyTex([
        [a * b, "x^2"],
        [b * p - a * q, "x"],
        [-p * q, ""],
      ]);
      const prod = `${par(lin(a, "x", p))}${par(lin(b, "x", -q))}`;
      return {
        content: `가로의 길이가 ${M(`${a}x`)}, 세로의 길이가 ${M(
          `${b}x`,
        )} 인 직사각형이 있다. 가로의 길이는 ${M(
          String(p),
        )} 만큼 늘이고 세로의 길이는 ${M(
          String(q),
        )} 만큼 줄여서 새 직사각형을 만들었을 때, 새 직사각형의 넓이를 구하시오.`,
        answer: M(out),
        solution: `새 직사각형의 가로의 길이는 ${M(
          lin(a, "x", p),
        )}, 세로의 길이는 ${M(lin(b, "x", -q))} 이다.\n${M(`${prod}=${out}`)}`,
        facts: { a, b, p, q },
      };
    }),
  ),

  def(
    MINOR_MUL,
    "09",
    "곱셈 공식의 도형에의 활용 ⑵",
    SEC.곱셈,
    "심화하",
    (rng) => {
      // 폭이 일정한 길을 가장자리로 몰면 (ax-w)(bx-w) 짜리 직사각형이 남는다.
      const a = intBetween(rng, 2, 6);
      const b = attempt<number>(40, () => {
        const v = intBetween(rng, 2, 6);
        return v === a ? null : v;
      });
      const w = intBetween(rng, 1, 4);
      const out = polyTex([
        [a * b, "x^2"],
        [-(a + b) * w, "x"],
        [w * w, ""],
      ]);
      const prod = `${par(lin(a, "x", -w))}${par(lin(b, "x", -w))}`;
      return {
        content: `가로의 길이가 ${M(`${a}x`)}, 세로의 길이가 ${M(
          `${b}x`,
        )} 인 직사각형 모양의 땅에 폭이 일정하게 ${M(
          String(w),
        )} 인 길을 가로 방향과 세로 방향으로 하나씩 만들었다. 길을 제외한 땅의 넓이를 구하시오.`,
        answer: M(out),
        solution: `두 길을 각각 땅의 가장자리로 옮기면 남는 땅은 가로의 길이가 ${M(
          lin(a, "x", -w),
        )}, 세로의 길이가 ${M(lin(b, "x", -w))} 인 직사각형이다.\n${M(
          `${prod}=${out}`,
        )}`,
        facts: { a, b, w },
      };
    },
  ),

  def(MINOR_MUL, "10", "공통부분이 있는 식의 전개", SEC.곱셈, "응용", (rng) =>
    // x+y 를 한 문자로 묶는다.
    attempt<Gen>(80, () => {
      const mode = pick(rng, [0, 1] as const);
      if (mode === 0) {
        const a = intBetween(rng, 1, 8);
        const src = `${par(
          polyTex([
            [1, "x"],
            [1, "y"],
            [-a, ""],
          ]),
        )}${par(
          polyTex([
            [1, "x"],
            [1, "y"],
            [a, ""],
          ]),
        )}`;
        const out = polyTex([
          [1, "x^2"],
          [2, "xy"],
          [1, "y^2"],
          [-a * a, ""],
        ]);
        return {
          content: `${EXPAND}\n${M(src)}`,
          answer: M(out),
          solution: `${M("x+y=A")} 로 놓으면 ${M(
            `(A-${a})(A+${a})=A^2-${a * a}`,
          )} 이다.\n${M("A")} 에 ${M("x+y")} 를 대입하면 ${M(out)} 이다.`,
          facts: { mode, a },
        };
      }
      const a = nonZero(rng, -6, 6);
      const b = nonZero(rng, -6, 6);
      if (a === b) return null;
      const src = `${par(
        polyTex([
          [1, "x"],
          [1, "y"],
          [a, ""],
        ]),
      )}${par(
        polyTex([
          [1, "x"],
          [1, "y"],
          [b, ""],
        ]),
      )}`;
      const out = polyTex([
        [1, "x^2"],
        [2, "xy"],
        [1, "y^2"],
        [a + b, "x"],
        [a + b, "y"],
        [a * b, ""],
      ]);
      return {
        content: `${EXPAND}\n${M(src)}`,
        answer: M(out),
        solution: `${M("x+y=A")} 로 놓으면 ${M(
          `${par(lin(1, "A", a))}${par(lin(1, "A", b))}=${polyTex([
            [1, "A^2"],
            [a + b, "A"],
            [a * b, ""],
          ])}`,
        )} 이다.\n${M("A")} 에 ${M("x+y")} 를 대입해 정리하면 ${M(out)} 이다.`,
        facts: { mode, a, b },
      };
    }),
  ),

  def(
    MINOR_MUL,
    "11",
    "곱셈 공식을 이용한 수의 계산",
    SEC.곱셈,
    "응용",
    (rng) => {
      const base = pick(rng, [100, 1000] as const);
      const mode = pick(rng, [0, 1, 2] as const);
      if (mode === 0) {
        const p = intBetween(rng, 1, 9);
        const s = pick(rng, [1, -1] as const);
        const n = base + s * p;
        return {
          content: `곱셈 공식을 이용하여 다음을 계산하시오.\n${M(`${n}^2`)}`,
          answer: M(String(n * n)),
          solution: `${M(`${n}=${lin(1, String(base), s * p)}`)} 이므로 ${M(
            "(a+b)^2=a^2+2ab+b^2",
          )} 임을 이용한다.\n${M(
            `${n}^2=${base}^2${termTex(2 * base * s * p, "", false)}+${p * p}=${n * n}`,
          )}`,
          facts: { mode, base, p, s, value: n * n },
        };
      }
      if (mode === 1) {
        const p = intBetween(rng, 1, 9);
        const value = base * base - p * p;
        return {
          content: `곱셈 공식을 이용하여 다음을 계산하시오.\n${M(
            `${base + p}\\times${base - p}`,
          )}`,
          answer: M(String(value)),
          solution: `곱을 ${M(
            `(${base}+${p})(${base}-${p})`,
          )} ${euroRo(p)} 보면 ${M("(a+b)(a-b)=a^2-b^2")} 을 그대로 쓸 수 있다.\n${M(
            `${base}^2-${p}^2=${value}`,
          )}`,
          facts: { mode, base, p, value },
        };
      }
      const p = intBetween(rng, 1, 7);
      const q = intBetween(rng, 1, 7);
      const value = (base + p) * (base + q);
      return {
        content: `곱셈 공식을 이용하여 다음을 계산하시오.\n${M(
          `${base + p}\\times${base + q}`,
        )}`,
        answer: M(String(value)),
        solution: `곱을 ${M(
          `(${base}+${p})(${base}+${q})`,
        )} ${euroRo(q)} 보면 ${M("(x+a)(x+b)=x^2+(a+b)x+ab")} 를 그대로 쓸 수 있다.\n${M(
          `${base}^2+${p + q}\\times${base}+${p * q}=${value}`,
        )}`,
        facts: { mode, base, p, q, value },
      };
    },
  ),

  def(
    MINOR_MUL,
    "12",
    "곱셈 공식을 이용한 근호를 포함한 식의 계산",
    SEC.곱셈,
    "응용",
    (rng) =>
      attempt<Gen>(80, () => {
        const mode = pick(rng, [0, 1, 2] as const);
        if (mode === 0) {
          const a = pick(rng, RADICANDS);
          const b = pick(rng, RADICANDS);
          if (a <= b) return null;
          const src = `(\\sqrt{${a}}+\\sqrt{${b}})(\\sqrt{${a}}-\\sqrt{${b}})`;
          return {
            content: `${CALC}\n${M(src)}`,
            answer: M(String(a - b)),
            solution: `${M("(a+b)(a-b)=a^2-b^2")} 임을 이용한다.\n${M(
              `${src}=${a}-${b}=${a - b}`,
            )}`,
            facts: { mode, a, b },
          };
        }
        if (mode === 1) {
          const a = pick(rng, RADICANDS);
          const m = intBetween(rng, 1, 4);
          const n = nonZero(rng, -6, 6);
          const src = `(${polyTex([
            [m, `\\sqrt{${a}}`],
            [n, ""],
          ])})^2`;
          const out = surdSum(m * m * a + n * n, 2 * m * n, a);
          return {
            content: `${CALC}\n${M(src)}`,
            answer: M(out),
            solution: `${M("(A+B)^2=A^2+2AB+B^2")} 임을 이용한다.\n${M(
              `${src}=${out}`,
            )}`,
            facts: { mode, a, m, n },
          };
        }
        const a = pick(rng, RADICANDS);
        const n = nonZero(rng, -6, 6);
        const k = nonZero(rng, -6, 6);
        if (n === k) return null;
        const src = `(\\sqrt{${a}}${termTex(n, "", false)})(\\sqrt{${a}}${termTex(
          k,
          "",
          false,
        )})`;
        const out = surdSum(a + n * k, n + k, a);
        return {
          content: `${CALC}\n${M(src)}`,
          answer: M(out),
          solution: `근호를 한 문자처럼 보면 ${M(
            "(x+a)(x+b)=x^2+(a+b)x+ab",
          )} 를 그대로 쓸 수 있다.\n${M(`${src}=${out}`)}`,
          facts: { mode, a, n, k },
        };
      }),
  ),

  def(
    MINOR_MUL,
    "13",
    "곱셈 공식을 이용한 분모의 유리화",
    SEC.곱셈,
    "심화하",
    (rng) =>
      attempt<Gen>(120, () => {
        const mode = pick(rng, [0, 1] as const);
        if (mode === 0) {
          const a = pick(rng, RADICANDS);
          const b = pick(rng, RADICANDS);
          if (a <= b) return null;
          const k = intBetween(rng, 1, 6);
          const den0 = a - b;
          const g = gcd(k, den0);
          const c = k / g;
          const den = den0 / g;
          const num = polyTex([
            [c, `\\sqrt{${a}}`],
            [c, `\\sqrt{${b}}`],
          ]);
          const out = den === 1 ? num : `\\dfrac{${num}}{${den}}`;
          const src = `\\dfrac{${k}}{\\sqrt{${a}}-\\sqrt{${b}}}`;
          const raw = `\\dfrac{${k}(\\sqrt{${a}}+\\sqrt{${b}})}{${den0}}`;
          return {
            content: `다음 수의 분모를 유리화하시오.\n${M(src)}`,
            answer: M(out),
            solution: `분모의 켤레는 ${M(
              `\\sqrt{${a}}+\\sqrt{${b}}`,
            )} 이다. 분모와 분자에 이것을 곱한다.\n분모가 ${M(
              `(\\sqrt{${a}}-\\sqrt{${b}})(\\sqrt{${a}}+\\sqrt{${b}})=${a}-${b}=${den0}`,
            )} 이므로 ${M(`${src}=${raw}=${out}`)} 이다.`,
            facts: { mode, a, b, k, den },
          };
        }
        const a = pick(rng, RADICANDS);
        const n = intBetween(rng, 1, 6);
        const k = intBetween(rng, 1, 6);
        let den0 = n * n - a;
        if (den0 === 0) return null;
        let p = k * n;
        let q = -k;
        if (den0 < 0) {
          den0 = -den0;
          p = -p;
          q = -q;
        }
        const g = gcd(gcd(Math.abs(p), Math.abs(q)), den0);
        // 유리수 항이 음수면 근호 항을 앞에 쓴다 — 「-3+루트21」 은 읽기 나쁘다.
        const num =
          p < 0
            ? polyTex([
                [q / g, `\\sqrt{${a}}`],
                [p / g, ""],
              ])
            : polyTex([
                [p / g, ""],
                [q / g, `\\sqrt{${a}}`],
              ]);
        const den = den0 / g;
        const out = den === 1 ? num : `\\dfrac{${num}}{${den}}`;
        const src = `\\dfrac{${k}}{${n}+\\sqrt{${a}}}`;
        const raw = `\\dfrac{${k}(${n}-\\sqrt{${a}})}{${n * n - a}}`;
        return {
          content: `다음 수의 분모를 유리화하시오.\n${M(src)}`,
          answer: M(out),
          solution: `분모의 켤레는 ${M(
            `${n}-\\sqrt{${a}}`,
          )} 이다. 분모와 분자에 이것을 곱한다.\n분모가 ${M(
            `(${n}+\\sqrt{${a}})(${n}-\\sqrt{${a}})=${n * n}-${a}=${n * n - a}`,
          )} 이므로 ${M(`${src}=${raw}=${out}`)} 이다.`,
          facts: { mode, a, n, k, den },
        };
      }),
  ),

  def(
    MINOR_MUL,
    "14",
    "의 꼴이 주어질 때 식의 값 구하기",
    SEC.곱셈,
    "심화하",
    (rng) => {
      // x=a±√b 이면 (x-a)^2=b — 발문의 식을 (x-a)^2 꼴로 몰아서 값을 낸다.
      const a = intBetween(rng, 1, 6);
      const b = pick(rng, RADICANDS);
      const s = pick(rng, [1, -1] as const);
      const c = nonZero(rng, -9, 9);
      const value = b - a * a + c;
      const expr = polyTex([
        [1, "x^2"],
        [-2 * a, "x"],
        [c, ""],
      ]);
      const xTex = polyTex([
        [a, ""],
        [s, `\\sqrt{${b}}`],
      ]);
      return {
        content: `${M(`x=${xTex}`)} 일 때, ${M(expr)} 의 값을 구하시오.`,
        answer: M(String(value)),
        solution: `${M(`x-${a}=${termTex(s, `\\sqrt{${b}}`, true)}`)} 이므로 양변을 제곱하면 ${M(
          `(x-${a})^2=${b}`,
        )} 이다.\n즉 ${M(
          `x^2-${2 * a}x=${b - a * a}`,
        )} 이므로 구하는 값은 ${M(`${b - a * a}${termTex(c, "", false)}=${value}`)} 이다.`,
        facts: { a, b, s, c, value },
      };
    },
  ),

  def(MINOR_MUL, "15", "곱셈 공식의 변형 ⑴", SEC.곱셈, "응용", (rng) =>
    attempt<Gen>(120, () => {
      const mode = pick(rng, [0, 1, 2, 3] as const);
      const p = nonZero(rng, -12, 12);
      if (mode === 0 || mode === 2) {
        const s = nonZero(rng, -10, 10);
        if (s * s - 4 * p <= 0) return null;
        const ask = mode === 0 ? "x^2+y^2" : "(x-y)^2";
        const value = mode === 0 ? s * s - 2 * p : s * s - 4 * p;
        const law = mode === 0 ? "x^2+y^2=(x+y)^2-2xy" : "(x-y)^2=(x+y)^2-4xy";
        return {
          content: `${M(`x+y=${s}`)}, ${M(`xy=${p}`)} 일 때, ${M(
            ask,
          )} 의 값을 구하시오.`,
          answer: M(String(value)),
          solution: `${M(law)} 이다.\n값을 대입하면 ${M(
            `${wp(s, "")}^2-${mode === 0 ? 2 : 4}\\times${wp(p, "")}=${value}`,
          )} 이다.`,
          facts: { mode, s, p, value },
        };
      }
      const d = nonZero(rng, -10, 10);
      if (d * d + 4 * p <= 0) return null;
      const ask = mode === 1 ? "(x+y)^2" : "x^2+y^2";
      const value = mode === 1 ? d * d + 4 * p : d * d + 2 * p;
      const law = mode === 1 ? "(x+y)^2=(x-y)^2+4xy" : "x^2+y^2=(x-y)^2+2xy";
      return {
        content: `${M(`x-y=${d}`)}, ${M(`xy=${p}`)} 일 때, ${M(
          ask,
        )} 의 값을 구하시오.`,
        answer: M(String(value)),
        solution: `${M(law)} 이다.\n값을 대입하면 ${M(
          `${wp(d, "")}^2+${mode === 1 ? 4 : 2}\\times${wp(p, "")}=${value}`,
        )} 이다.`,
        facts: { mode, d, p, value },
      };
    }),
  ),

  def(MINOR_MUL, "16", "곱셈 공식의 변형 ⑵", SEC.곱셈, "응용", (rng) =>
    attempt<Gen>(120, () => {
      const mode = pick(rng, [0, 1, 2, 3] as const);
      const t = nonZero(rng, -9, 9);
      if ((mode === 0 || mode === 3) && Math.abs(t) < 3) return null;
      const givenTex =
        mode === 0 || mode === 3
          ? `x+\\dfrac{1}{x}=${t}`
          : `x-\\dfrac{1}{x}=${t}`;
      const askTex =
        mode === 0 || mode === 1
          ? "x^2+\\dfrac{1}{x^2}"
          : mode === 2
            ? "\\left(x+\\dfrac{1}{x}\\right)^2"
            : "\\left(x-\\dfrac{1}{x}\\right)^2";
      const value =
        mode === 0
          ? t * t - 2
          : mode === 1
            ? t * t + 2
            : mode === 2
              ? t * t + 4
              : t * t - 4;
      const law =
        mode === 0
          ? "x^2+\\dfrac{1}{x^2}=\\left(x+\\dfrac{1}{x}\\right)^2-2"
          : mode === 1
            ? "x^2+\\dfrac{1}{x^2}=\\left(x-\\dfrac{1}{x}\\right)^2+2"
            : mode === 2
              ? "\\left(x+\\dfrac{1}{x}\\right)^2=\\left(x-\\dfrac{1}{x}\\right)^2+4"
              : "\\left(x-\\dfrac{1}{x}\\right)^2=\\left(x+\\dfrac{1}{x}\\right)^2-4";
      const delta = mode === 0 ? -2 : mode === 1 ? 2 : mode === 2 ? 4 : -4;
      return {
        content: `${M(givenTex)} 일 때, ${M(askTex)} 의 값을 구하시오.`,
        answer: M(String(value)),
        solution: `${M(law)} 이다.\n값을 대입하면 ${M(
          `${wp(t, "")}^2${termTex(delta, "", false)}=${value}`,
        )} 이다.`,
        facts: { mode, t, value },
      };
    }),
  ),

  def(MINOR_MUL, "17", "의 꼴의 전개", SEC.곱셈, "심화하", (rng) =>
    // 상수항의 합이 같아지도록 둘씩 짝지으면 x^2+sx 가 공통부분이 된다.
    attempt<Gen>(120, () => {
      const d = nonZero(rng, -4, 4);
      const e = intBetween(rng, 1, 4);
      const f = intBetween(rng, 1, 5);
      if (e === f) return null;
      const cs = [d, d + Math.min(e, f), d + Math.max(e, f), d + e + f];
      if (new Set(cs).size !== 4) return null;
      const s = 2 * d + e + f;
      const p1 = d * (d + e + f);
      const p2 = (d + e) * (d + f);
      const src = cs.map((c) => parUnlessBare(lin(1, "x", c))).join("");
      /** `x^2+sx+c` — 공통부분에 상수를 붙인 이차식. */
      const quad = (c: number): string =>
        polyTex([
          [1, "x^2"],
          [s, "x"],
          [c, ""],
        ]);
      const out = polyTex([
        [1, "x^4"],
        [2 * s, "x^3"],
        [s * s + p1 + p2, "x^2"],
        [s * (p1 + p2), "x"],
        [p1 * p2, ""],
      ]);
      return {
        content: `${EXPAND}\n${M(src)}`,
        answer: M(out),
        solution: `상수항의 합이 같아지도록 ${M(
          `${parUnlessBare(lin(1, "x", cs[0]!))}${parUnlessBare(
            lin(1, "x", cs[3]!),
          )}`,
        )}, ${M(
          `${parUnlessBare(lin(1, "x", cs[1]!))}${parUnlessBare(
            lin(1, "x", cs[2]!),
          )}`,
        )} 처럼 둘씩 짝을 지어 전개하면 ${M(
          `${par(quad(p1))}${par(quad(p2))}`,
        )} 이다.\n${M(
          `${polyTex([
            [1, "x^2"],
            [s, "x"],
          ])}=A`,
        )} 로 놓고 전개한 뒤 되돌리면 ${M(out)} 이다.`,
        facts: { d, e, f, s },
      };
    }),
  ),

  def(
    MINOR_MUL,
    "18",
    "의 꼴이 주어질 때 식의 값 구하기",
    SEC.곱셈,
    "심화하",
    (rng) =>
      // x^2+ax±1=0 의 양변을 x 로 나누면 x±1/x 의 값이 나온다.
      attempt<Gen>(120, () => {
        const s = pick(rng, [1, -1] as const);
        const a = nonZero(rng, -9, 9);
        if (s === 1 && Math.abs(a) < 3) return null;
        const eq = polyTex([
          [1, "x^2"],
          [a, "x"],
          [s, ""],
        ]);
        const value = s === 1 ? a * a - 2 : a * a + 2;
        const midTex =
          s === 1 ? `x+\\dfrac{1}{x}=${-a}` : `x-\\dfrac{1}{x}=${-a}`;
        const law =
          s === 1
            ? "x^2+\\dfrac{1}{x^2}=\\left(x+\\dfrac{1}{x}\\right)^2-2"
            : "x^2+\\dfrac{1}{x^2}=\\left(x-\\dfrac{1}{x}\\right)^2+2";
        return {
          content: `${M(`${eq}=0`)} 일 때, ${M(
            "x^2+\\dfrac{1}{x^2}",
          )} 의 값을 구하시오.`,
          answer: M(String(value)),
          solution: `${M("x\\neq 0")} 이므로 양변을 ${M(
            "x",
          )} 로 나누면 ${M(midTex)} 이다.\n${M(law)} 이므로 구하는 값은 ${M(
            `${wp(-a, "")}^2${termTex(s === 1 ? -2 : 2, "", false)}=${value}`,
          )} 이다.`,
          facts: { s, a, value },
        };
      }),
  ),
];

/* ────────────────────────────────────────────────────────────────────────
 * 다항식의 인수분해 22유형
 * ──────────────────────────────────────────────────────────────────────── */

const FAC: TypeEntry[] = [
  def(MINOR_FAC, "01", "인수", SEC.인수, "기본", (rng) =>
    attempt<Gen>(80, () => {
      const a = nonZero(rng, -9, 9);
      const b = nonZero(rng, -9, 9);
      if (a === b) return null;
      const quad = polyTex([
        [1, "x^2"],
        [a + b, "x"],
        [a * b, ""],
      ]);
      const given = lin(1, "x", a);
      const other = lin(1, "x", b);
      return {
        content: `다항식 ${M(quad)} 의 인수 중 하나가 ${M(
          given,
        )} 일 때, 다른 한 일차식 인수를 구하시오.`,
        answer: M(other),
        solution: `합이 ${M(String(a + b))}, 곱이 ${M(
          String(a * b),
        )} 인 두 수는 ${M(String(a))}${waGwa(a)} ${M(String(b))} 이다.\n${M(
          `${quad}=${par(given)}${par(other)}`,
        )} 이므로 다른 한 인수는 ${M(other)} 이다.`,
        facts: { a, b },
      };
    }),
  ),

  def(
    MINOR_FAC,
    "02",
    "공통인 인수로 묶어 인수분해하기",
    SEC.인수,
    "기본",
    (rng) =>
      attempt<Gen>(120, () => {
        const mode = pick(rng, [0, 1] as const);
        const k = intBetween(rng, 2, 6);
        if (mode === 0) {
          const p = intBetween(rng, 1, 2);
          const q = intBetween(rng, 0, 1);
          const a = intBetween(rng, 1, 5);
          const b = nonZero(rng, -5, 5);
          if (gcd(a, Math.abs(b)) !== 1) return null;
          const xs = p === 1 ? "x" : `x^${p}`;
          const ys = q === 1 ? "y" : "";
          const common = `${k}${xs}${ys}`;
          const inner = lin2(a, "x", b, "y");
          const t1 = k * a;
          const t2 = k * b;
          const src = polyTex([
            [t1, p + 1 === 1 ? `x${ys}` : `x^${p + 1}${ys}`],
            [t2, q + 1 === 1 ? `${xs}y` : `${xs}y^${q + 1}`],
          ]);
          return {
            content: `${FACTOR}\n${M(src)}`,
            answer: M(`${common}${par(inner)}`),
            solution: `두 항의 공통인 인수는 ${M(common)} 이다.\n${M(
              `${src}=${common}${par(inner)}`,
            )}`,
            facts: { mode, k, p, q, a, b },
          };
        }
        const a = intBetween(rng, 1, 5);
        const b = nonZero(rng, -5, 5);
        const c = nonZero(rng, -6, 6);
        if (gcd(gcd(a, Math.abs(b)), Math.abs(c)) !== 1) return null;
        const common = `${k}x`;
        const inner = polyTex([
          [a, "x"],
          [b, "y"],
          [c, ""],
        ]);
        const src = polyTex([
          [k * a, "x^2"],
          [k * b, "xy"],
          [k * c, "x"],
        ]);
        return {
          content: `${FACTOR}\n${M(src)}`,
          answer: M(`${common}${par(inner)}`),
          solution: `세 항의 공통인 인수는 ${M(common)} 이다.\n${M(
            `${src}=${common}${par(inner)}`,
          )}`,
          facts: { mode, k, a, b, c },
        };
      }),
  ),

  def(MINOR_FAC, "03", "의 인수분해", SEC.인수, "기본", (rng) =>
    attempt<Gen>(80, () => {
      const mode = pick(rng, [0, 1] as const);
      if (mode === 0) {
        const a = intBetween(rng, 2, 6);
        const b = nonZero(rng, -6, 6);
        if (gcd(a, Math.abs(b)) !== 1) return null;
        const src = polyTex([
          [a * a, "x^2"],
          [2 * a * b, "xy"],
          [b * b, "y^2"],
        ]);
        const out = `${par(lin2(a, "x", b, "y"))}^2`;
        return {
          content: `${FACTOR}\n${M(src)}`,
          answer: M(out),
          solution: `${M(`A=${termTex(a, "x", true)}`)}, ${M(
            `B=${termTex(Math.abs(b), "y", true)}`,
          )} 로 두면 ${M(`A^2=${termTex(a * a, "x^2", true)}`)}, ${M(
            `B^2=${termTex(b * b, "y^2", true)}`,
          )}, ${M(
            `2AB=${termTex(2 * a * Math.abs(b), "xy", true)}`,
          )} 이므로 완전제곱식이다.\n${M(`${src}=${out}`)}`,
          facts: { mode, a, b },
        };
      }
      const k = intBetween(rng, 1, 4);
      const m = nonZero(rng, -8, 8);
      const src = polyTex([
        [k, "x^2"],
        [2 * k * m, "x"],
        [k * m * m, ""],
      ]);
      const monic = polyTex([
        [1, "x^2"],
        [2 * m, "x"],
        [m * m, ""],
      ]);
      const inner = `${par(lin(1, "x", m))}^2`;
      const out = k === 1 ? inner : `${k}${inner}`;
      return {
        content: `${FACTOR}\n${M(src)}`,
        answer: M(out),
        solution: `${
          k === 1
            ? ""
            : `공통인 인수 ${M(String(k))}${eulReul(
                k,
              )} 먼저 묶어 내면 ${M(`${k}${par(monic)}`)} 이다.\n`
        }상수항이 ${M(`${wp(m, "")}^2=${m * m}`)} 이고 ${M(
          "x",
        )} 의 계수가 ${M(`2\\times${wp(m, "")}=${2 * m}`)} 이므로 완전제곱식이다.\n${M(
          `${src}=${out}`,
        )}`,
        facts: { mode, k, m },
      };
    }),
  ),

  def(
    MINOR_FAC,
    "04",
    "완전제곱식이 되도록 하는 미지수의 값 구하기",
    SEC.인수,
    "응용",
    (rng) =>
      attempt<Gen>(80, () => {
        const mode = pick(rng, [0, 1, 2] as const);
        if (mode === 0) {
          const m = nonZero(rng, -9, 9);
          const src = polyTex([
            [1, "x^2"],
            [2 * m, "x"],
          ]);
          return {
            content: `${M(`${src}+k`)} 가 완전제곱식이 되도록 하는 상수 ${M(
              "k",
            )} 의 값을 구하시오.`,
            answer: M(String(m * m)),
            solution: `${M("x")} 의 계수의 절반의 제곱이 상수항이어야 한다.\n${M(
              `k=\\left(\\dfrac{${2 * m}}{2}\\right)^2=${m * m}`,
            )} 이다.`,
            facts: { mode, m, value: m * m },
          };
        }
        if (mode === 1) {
          const m = intBetween(rng, 2, 9);
          return {
            content: `${M(`x^2+ax+${m * m}`)}${iGa(
              m * m,
            )} 완전제곱식이 되도록 하는 상수 ${M(
              "a",
            )} 의 값을 구하시오. (단, ${M("a>0")})`,
            answer: M(String(2 * m)),
            solution: `상수항이 ${M(`${m * m}=${m}^2`)} 이므로 ${M(
              `(x+${m})^2`,
            )} 의 꼴이어야 한다.\n따라서 ${M(`a=2\\times${m}=${2 * m}`)} 이다.`,
            facts: { mode, m, value: 2 * m },
          };
        }
        const p = nonZero(rng, -9, 9);
        const q = nonZero(rng, -9, 9);
        if ((p + q) % 2 !== 0) return null;
        if (p === q) return null;
        const value = ((p - q) / 2) ** 2;
        return {
          content: `${M(
            `${par(lin(1, "x", p))}${par(lin(1, "x", q))}+k`,
          )} 가 완전제곱식이 되도록 하는 상수 ${M("k")} 의 값을 구하시오.`,
          answer: M(String(value)),
          solution: `${M(
            `${par(lin(1, "x", p))}${par(lin(1, "x", q))}=${polyTex([
              [1, "x^2"],
              [p + q, "x"],
              [p * q, ""],
            ])}`,
          )} 이다.\n${M("x")} 의 계수의 절반의 제곱에서 상수항을 빼면 ${M(
            `k=\\left(\\dfrac{${p + q}}{2}\\right)^2-${wp(p * q, "")}=${value}`,
          )} 이다.`,
          facts: { mode, p, q, value },
        };
      }),
  ),

  def(
    MINOR_FAC,
    "05",
    "근호 안이 완전제곱식으로 인수분해되는 식",
    SEC.인수,
    "심화하",
    (rng) =>
      attempt<Gen>(80, () => {
        const mode = pick(rng, [0, 1] as const);
        const lo = intBetween(rng, -4, 4);
        const gap = intBetween(rng, 2, 7);
        const hi = lo + gap;
        const sq = (m: number): string =>
          `\\sqrt{${polyTex([
            [1, "x^2"],
            [-2 * m, "x"],
            [m * m, ""],
          ])}}`;
        // lo<x<hi 이므로 √((x-lo)^2)=x-lo, √((x-hi)^2)=hi-x 다.
        const src = mode === 0 ? `${sq(lo)}+${sq(hi)}` : `${sq(lo)}-${sq(hi)}`;
        const out =
          mode === 0
            ? String(hi - lo)
            : polyTex([
                [2, "x"],
                [-(lo + hi), ""],
              ]);
        return {
          content: `${M(`${lo}<x<${hi}`)} 일 때, 다음 식을 간단히 하시오.\n${M(
            src,
          )}`,
          answer: M(out),
          solution: `${M(`${lin(1, "x", -lo)}>0`)} 이므로 ${M(
            `${sq(lo)}=${lin(1, "x", -lo)}`,
          )} 이고, ${M(`${lin(1, "x", -hi)}<0`)} 이므로 ${M(
            `${sq(hi)}=${lin(-1, "x", hi)}`,
          )} 이다.\n두 식을 ${mode === 0 ? "더하면" : "빼면"} ${M(out)} 이다.`,
          facts: { mode, lo, hi },
        };
      }),
  ),

  def(MINOR_FAC, "06", "의 인수분해", SEC.인수, "기본", (rng) =>
    attempt<Gen>(80, () => {
      const mode = pick(rng, [0, 1] as const);
      if (mode === 0) {
        const a = intBetween(rng, 1, 7);
        const b = intBetween(rng, 1, 9);
        if (gcd(a, b) !== 1) return null;
        const src = polyTex([
          [a * a, "x^2"],
          [-b * b, "y^2"],
        ]);
        const out = `${par(lin2(a, "x", b, "y"))}${par(lin2(a, "x", -b, "y"))}`;
        return {
          content: `${FACTOR}\n${M(src)}`,
          answer: M(out),
          solution: `${M(`A=${termTex(a, "x", true)}`)}, ${M(
            `B=${termTex(b, "y", true)}`,
          )} 로 두면 ${M(`A^2=${termTex(a * a, "x^2", true)}`)}, ${M(
            `B^2=${termTex(b * b, "y^2", true)}`,
          )} 이다.\n${M(`a^2-b^2=(a+b)(a-b)`)} 를 쓰면 ${M(
            `${src}=${out}`,
          )} 이다.`,
          facts: { mode, a, b },
        };
      }
      const k = intBetween(rng, 1, 5);
      const m = intBetween(rng, 2, 9);
      const src = polyTex([
        [k, "x^2"],
        [-k * m * m, ""],
      ]);
      const inner = `${par(lin(1, "x", m))}${par(lin(1, "x", -m))}`;
      const out = k === 1 ? inner : `${k}${inner}`;
      return {
        content: `${FACTOR}\n${M(src)}`,
        answer: M(out),
        solution: `${
          k === 1
            ? `상수항 ${M(String(m * m))}${eunNeun(m * m)} ${M(
                String(m),
              )} 의 제곱이다.\n`
            : `공통인 인수 ${M(String(k))}${eulReul(k)} 먼저 묶어 낸다.\n`
        }${M(`a^2-b^2=(a+b)(a-b)`)} 를 쓰면 ${M(`${src}=${out}`)} 이다.`,
        facts: { mode, k, m },
      };
    }),
  ),

  def(MINOR_FAC, "07", "의 인수분해", SEC.인수, "기본", (rng) =>
    attempt<Gen>(80, () => {
      const mode = pick(rng, [0, 1] as const);
      const a = nonZero(rng, -9, 9);
      const b = nonZero(rng, -9, 9);
      if (a === b) return null;
      const [lo, hi] = a < b ? [a, b] : [b, a];
      if (mode === 0) {
        const src = polyTex([
          [1, "x^2"],
          [a + b, "x"],
          [a * b, ""],
        ]);
        const out = `${par(lin(1, "x", lo))}${par(lin(1, "x", hi))}`;
        return {
          content: `${FACTOR}\n${M(src)}`,
          answer: M(out),
          solution: `곱이 ${M(String(a * b))}, 합이 ${M(
            String(a + b),
          )} 인 두 정수는 ${M(String(lo))}${waGwa(lo)} ${M(
            String(hi),
          )} 이다.\n${M(`${src}=${out}`)}`,
          facts: { mode, a, b },
        };
      }
      const src = polyTex([
        [1, "x^2"],
        [a + b, "xy"],
        [a * b, "y^2"],
      ]);
      const out = `${par(lin2(1, "x", lo, "y"))}${par(lin2(1, "x", hi, "y"))}`;
      return {
        content: `${FACTOR}\n${M(src)}`,
        answer: M(out),
        solution: `${M("y")} 를 상수처럼 보면 곱이 ${M(
          String(a * b),
        )}, 합이 ${M(String(a + b))} 인 두 정수는 ${M(String(lo))}${waGwa(
          lo,
        )} ${M(String(hi))} 이다.\n${M(`${src}=${out}`)}`,
        facts: { mode, a, b },
      };
    }),
  ),

  def(MINOR_FAC, "08", "의 인수분해", SEC.인수, "응용", (rng) =>
    attempt<Gen>(120, () => {
      const a = intBetween(rng, 1, 5);
      const b = nonZero(rng, -7, 7);
      const c = intBetween(rng, 1, 5);
      const d = nonZero(rng, -7, 7);
      if (a * c < 2) return null;
      if (gcd(a, Math.abs(b)) !== 1 || gcd(c, Math.abs(d)) !== 1) return null;
      if (a === c && b === d) return null;
      const [f1, f2] =
        a < c || (a === c && b < d)
          ? [lin(a, "x", b), lin(c, "x", d)]
          : [lin(c, "x", d), lin(a, "x", b)];
      const src = polyTex([
        [a * c, "x^2"],
        [a * d + b * c, "x"],
        [b * d, ""],
      ]);
      const out = `${par(f1)}${par(f2)}`;
      return {
        content: `${FACTOR}\n${M(src)}`,
        answer: M(out),
        solution: `${M(
          "acx^2+(ad+bc)x+bd=(ax+b)(cx+d)",
        )} 에서 ${M(`ac=${a * c}`)}, ${M(`bd=${b * d}`)} 를 만족하는 짝을 찾는다.\n${M(
          `${src}=${out}`,
        )}`,
        facts: { a, b, c, d },
      };
    }),
  ),

  def(MINOR_FAC, "09", "인수분해 공식 종합", SEC.인수, "응용", (rng) =>
    // 공통인수를 먼저 묶고 그 안을 다시 인수분해한다 — 두 단계를 한 문항에서 쓴다.
    attempt<Gen>(120, () => {
      const k = intBetween(rng, 2, 5);
      const a = intBetween(rng, 1, 4);
      const b = nonZero(rng, -6, 6);
      const c = intBetween(rng, 1, 4);
      const d = nonZero(rng, -6, 6);
      if (gcd(a, Math.abs(b)) !== 1 || gcd(c, Math.abs(d)) !== 1) return null;
      if (a === c && b === d) return null;
      const [f1, f2] =
        a < c || (a === c && b < d)
          ? [lin(a, "x", b), lin(c, "x", d)]
          : [lin(c, "x", d), lin(a, "x", b)];
      const inner = polyTex([
        [a * c, "x^2"],
        [a * d + b * c, "x"],
        [b * d, ""],
      ]);
      const src = polyTex([
        [k * a * c, "x^2"],
        [k * (a * d + b * c), "x"],
        [k * b * d, ""],
      ]);
      const out = `${k}${par(f1)}${par(f2)}`;
      return {
        content: `${FACTOR}\n${M(src)}`,
        answer: M(out),
        solution: `세 항의 공통인 인수 ${M(String(k))}${eulReul(
          k,
        )} 먼저 묶어 내면 ${M(
          `${k}${par(inner)}`,
        )} 이다.\n괄호 안을 다시 인수분해하면 ${M(`${src}=${out}`)} 이다.`,
        facts: { k, a, b, c, d },
      };
    }),
  ),

  def(
    MINOR_FAC,
    "10",
    "두 다항식의 공통인 인수 구하기",
    SEC.응용,
    "응용",
    (rng) =>
      attempt<Gen>(120, () => {
        // 공통인수 (x+n) 을 먼저 정하고 두 이차식을 그 배수로 짓는다.
        const n = nonZero(rng, -6, 6);
        const m = nonZero(rng, -8, 8);
        const a = intBetween(rng, 1, 4);
        const b = nonZero(rng, -8, 8);
        if (m === n) return null;
        if (gcd(a, Math.abs(b)) !== 1) return null;
        if (a === 1 && b === m) return null;
        if (a === 1 && b === n) return null;
        // 공통인수가 **하나로 정해져야** 한다: `b === a*n` 이면 둘째 식이
        // `a(x+n)^2`, `b === a*m` 이면 `a(x+m)(x+n)` 이라 인수가 둘이 겹친다.
        if (b === a * n || b === a * m) return null;
        const p1 = polyTex([
          [1, "x^2"],
          [m + n, "x"],
          [m * n, ""],
        ]);
        const p2 = polyTex([
          [a, "x^2"],
          [a * n + b, "x"],
          [b * n, ""],
        ]);
        const common = lin(1, "x", n);
        return {
          content: `다음 두 다항식의 공통인 인수를 구하시오.\n${M(p1)}, ${M(
            p2,
          )}`,
          answer: M(common),
          solution: `${M(`${p1}=${par(lin(1, "x", m))}${par(common)}`)} 이다.\n${M(
            `${p2}=${par(lin(a, "x", b))}${par(common)}`,
          )} 이므로 공통인 인수는 ${M(common)} 이다.`,
          facts: { n, m, a, b },
        };
      }),
  ),

  def(
    MINOR_FAC,
    "11",
    "인수가 주어진 이차식의 미지수의 값 구하기",
    SEC.응용,
    "응용",
    (rng) =>
      attempt<Gen>(80, () => {
        const A = intBetween(rng, 1, 4);
        const r = nonZero(rng, -5, 5);
        const a = nonZero(rng, -9, 9);
        const C = -A * r * r - a * r;
        if (C === 0) return null;
        const shown = `${termTex(A, "x^2", true)}+ax${termTex(C, "", false)}`;
        const factor = lin(1, "x", -r);
        return {
          content: `다항식 ${M(shown)} 의 인수 중 하나가 ${M(
            factor,
          )} 일 때, 상수 ${M("a")} 의 값을 구하시오.`,
          answer: M(String(a)),
          solution: `${M(factor)}${iGa(-r)} 인수이므로 ${M(
            `x=${r}`,
          )}${eulReul(r)} 대입하면 식의 값이 ${M("0")} 이 된다.\n${M(
            `${A}\\times${wp(r, "")}^2+a\\times${wp(r, "")}${termTex(C, "", false)}=0`,
          )} 에서 ${M(`a=${a}`)} 이다.`,
          facts: { A, r, a, C },
        };
      }),
  ),

  def(
    MINOR_FAC,
    "12",
    "계수 또는 상수항을 잘못 보고 인수분해한 경우",
    SEC.응용,
    "심화하",
    (rng) =>
      attempt<Gen>(200, () => {
        // 바른 이차식 (x+m)(x+n) 을 먼저 정한다 — 잘못 본 두 답은 그것에서 만든다.
        const m = nonZero(rng, -8, 8);
        const n = nonZero(rng, -8, 8);
        if (m === n) return null;
        const S = m + n;
        const P = m * n;
        // 상수항은 맞게 본 답: 곱이 P 인 다른 짝
        const p = nonZero(rng, -8, 8);
        if (P % p !== 0) return null;
        const q = P / p;
        if (p + q === S) return null;
        // x 의 계수는 맞게 본 답: 합이 S 인 다른 짝
        const u = nonZero(rng, -8, 8);
        const v = S - u;
        if (v === 0) return null;
        if (u * v === P) return null;
        const answer = `${par(lin(1, "x", Math.min(m, n)))}${par(
          lin(1, "x", Math.max(m, n)),
        )}`;
        const wrongA = `${par(lin(1, "x", p))}${par(lin(1, "x", q))}`;
        const wrongB = `${par(lin(1, "x", u))}${par(lin(1, "x", v))}`;
        return {
          content: `${M(
            "x^2",
          )} 의 계수가 ${M("1")} 인 어떤 이차식을 인수분해하는데, 지호는 ${M(
            "x",
          )} 의 계수를 잘못 보아 인수분해한 결과가 ${M(
            wrongA,
          )} 이고, 은수는 상수항을 잘못 보아 인수분해한 결과가 ${M(
            wrongB,
          )} 이다. 처음 이차식을 바르게 인수분해하시오.`,
          answer: M(answer),
          solution: `지호는 ${M("x")} 의 계수만 잘못 보았으므로 상수항 ${M(
            String(P),
          )}${eunNeun(P)} 맞다.\n은수는 상수항만 잘못 보았으므로 ${M(
            "x",
          )} 의 계수 ${M(String(S))}${eunNeun(S)} 맞다. 따라서 처음 이차식은 ${M(
            polyTex([
              [1, "x^2"],
              [S, "x"],
              [P, ""],
            ]),
          )} 이고, 인수분해하면 ${M(answer)} 이다.`,
          facts: { m, n, p, q, u, v },
        };
      }),
  ),

  def(MINOR_FAC, "13", "인수분해의 도형에의 활용 ⑴", SEC.응용, "응용", (rng) =>
    attempt<Gen>(80, () => {
      // 넓이가 x^2·x·1 인 조각을 붙여 만든 직사각형 — 그림 대신 개수를 글로 준다.
      const p = intBetween(rng, 1, 6);
      const q = intBetween(rng, 1, 6);
      const b = p + q;
      const c = p * q;
      const peri = polyTex([
        [4, "x"],
        [2 * b, ""],
      ]);
      return {
        content: `넓이가 ${M("x^2")} 인 정사각형 ${M(
          "1",
        )} 개, 넓이가 ${M("x")} 인 직사각형 ${M(
          String(b),
        )} 개, 넓이가 ${M("1")} 인 정사각형 ${M(
          String(c),
        )} 개를 빈틈없이 겹치지 않게 모두 붙여 하나의 큰 직사각형을 만들었다. 이 직사각형의 둘레의 길이를 구하시오.`,
        answer: M(peri),
        solution: `조각의 넓이의 합은 ${M(
          polyTex([
            [1, "x^2"],
            [b, "x"],
            [c, ""],
          ]),
        )} 이고, 인수분해하면 ${M(
          `${par(lin(1, "x", p))}${par(lin(1, "x", q))}`,
        )} 이다.\n큰 직사각형의 가로·세로의 길이가 ${M(
          lin(1, "x", p),
        )}, ${M(lin(1, "x", q))} 이므로 둘레의 길이는 ${M(
          `2\\times(${lin(1, "x", p)}+${lin(1, "x", q)})=${peri}`,
        )} 이다.`,
        facts: { p, q, b, c },
      };
    }),
  ),

  def(MINOR_FAC, "14", "인수분해의 도형에의 활용 ⑵", SEC.응용, "응용", (rng) =>
    attempt<Gen>(120, () => {
      const a = intBetween(rng, 1, 4);
      // 두 변이 모두 «길이» 이므로 상수항을 양수로 둔다 — `2x-5` 를 가로라고
      // 하면 작은 `x` 에서 음수가 된다.
      const b = intBetween(rng, 1, 6);
      const c = intBetween(rng, 1, 4);
      const d = intBetween(rng, 1, 6);
      if (gcd(a, b) !== 1 || gcd(c, d) !== 1) return null;
      if (a * c < 2) return null;
      const area = polyTex([
        [a * c, "x^2"],
        [a * d + b * c, "x"],
        [b * d, ""],
      ]);
      const given = lin(c, "x", d);
      const other = lin(a, "x", b);
      return {
        content: `세로의 길이가 ${M(given)} 인 직사각형의 넓이가 ${M(
          area,
        )} 일 때, 이 직사각형의 가로의 길이를 구하시오.`,
        answer: M(other),
        solution: `넓이를 인수분해하면 ${M(
          `${area}=${par(other)}${par(given)}`,
        )} 이다.\n세로의 길이가 ${M(given)} 이므로 가로의 길이는 ${M(
          other,
        )} 이다.`,
        facts: { a, b, c, d },
      };
    }),
  ),

  def(
    MINOR_FAC,
    "15",
    "공통부분이 있는 식의 인수분해 ⑴",
    SEC.응용,
    "응용",
    (rng) =>
      attempt<Gen>(120, () => {
        const t = nonZero(rng, -5, 5);
        const u = nonZero(rng, -7, 7);
        const v = nonZero(rng, -7, 7);
        if (u === v) return null;
        const common = lin(1, "x", t);
        const src = `${par(common)}^2${termTex(u + v, par(common), false)}${termTex(
          u * v,
          "",
          false,
        )}`;
        const c1 = t + u;
        const c2 = t + v;
        if (c1 === 0 || c2 === 0) return null;
        const [lo, hi] = c1 < c2 ? [c1, c2] : [c2, c1];
        const out = `${par(lin(1, "x", lo))}${par(lin(1, "x", hi))}`;
        return {
          content: `${FACTOR}\n${M(src)}`,
          answer: M(out),
          solution: `${M(`${common}=A`)} 로 놓으면 ${M(
            `${polyTex([
              [1, "A^2"],
              [u + v, "A"],
              [u * v, ""],
            ])}=${par(lin(1, "A", Math.min(u, v)))}${par(
              lin(1, "A", Math.max(u, v)),
            )}`,
          )} 이다.\n${M("A")} 에 ${M(common)}${eulReul(
            t,
          )} 대입해 정리하면 ${M(out)} 이다.`,
          facts: { t, u, v },
        };
      }),
  ),

  def(
    MINOR_FAC,
    "16",
    "공통부분이 있는 식의 인수분해 ⑵",
    SEC.응용,
    "응용",
    (rng) =>
      attempt<Gen>(120, () => {
        const p = nonZero(rng, -5, 5);
        const q = nonZero(rng, -5, 5);
        const src = `${par(lin(1, "a", p))}^2-${par(lin(1, "b", q))}^2`;
        const f1 = polyTex([
          [1, "a"],
          [1, "b"],
          [p + q, ""],
        ]);
        const f2 = polyTex([
          [1, "a"],
          [-1, "b"],
          [p - q, ""],
        ]);
        return {
          content: `${FACTOR}\n${M(src)}`,
          answer: M(`${par(f1)}${par(f2)}`),
          solution: `${M(`${lin(1, "a", p)}=A`)}, ${M(
            `${lin(1, "b", q)}=B`,
          )} 로 놓으면 ${M("A^2-B^2=(A+B)(A-B)")} 이다.\n${M(
            "A",
          )}, ${M("B")} 를 되돌려 정리하면 ${M(`${par(f1)}${par(f2)}`)} 이다.`,
          facts: { p, q },
        };
      }),
  ),

  def(
    MINOR_FAC,
    "17",
    "항이 개인 식의 인수분해 개의 항씩 묶기",
    SEC.응용,
    "응용",
    (rng) =>
      attempt<Gen>(120, () => {
        const mode = pick(rng, [0, 1] as const);
        if (mode === 0) {
          const c = nonZero(rng, -7, 7);
          const d = nonZero(rng, -7, 7);
          const src = polyTex([
            [1, "xy"],
            [d, "x"],
            [c, "y"],
            [c * d, ""],
          ]);
          const out = `${par(lin(1, "x", c))}${par(lin(1, "y", d))}`;
          return {
            content: `${FACTOR}\n${M(src)}`,
            answer: M(out),
            solution: `앞의 두 항과 뒤의 두 항을 각각 묶으면 ${M(
              `x${par(lin(1, "y", d))}${termTex(c, par(lin(1, "y", d)), false)}`,
            )} 이다.\n공통인 인수로 묶으면 ${M(out)} 이다.`,
            facts: { mode, c, d },
          };
        }
        const c = nonZero(rng, -6, 6);
        const d = intBetween(rng, 1, 9);
        const src = polyTex([
          [1, "x^3"],
          [c, "x^2"],
          [d, "x"],
          [c * d, ""],
        ]);
        const out = `${par(lin(1, "x", c))}${par(
          polyTex([
            [1, "x^2"],
            [d, ""],
          ]),
        )}`;
        return {
          content: `${FACTOR}\n${M(src)}`,
          answer: M(out),
          solution: `앞의 두 항과 뒤의 두 항을 각각 묶으면 ${M(
            `x^2${par(lin(1, "x", c))}${termTex(d, par(lin(1, "x", c)), false)}`,
          )} 이다.\n공통인 인수로 묶으면 ${M(out)} 이다.`,
          facts: { mode, c, d },
        };
      }),
  ),

  def(
    MINOR_FAC,
    "18",
    "항이 개인 식의 인수분해 개의 항씩 묶기",
    SEC.응용,
    "심화하",
    (rng) =>
      attempt<Gen>(120, () => {
        const mode = pick(rng, [0, 1] as const);
        const a = intBetween(rng, 1, 5);
        const b = intBetween(rng, 1, 5);
        const c = intBetween(rng, 1, 9);
        if (gcd(a, b) !== 1) return null;
        if (mode === 0) {
          // (ax-by)^2 - c^2
          const src = polyTex([
            [a * a, "x^2"],
            [-2 * a * b, "xy"],
            [b * b, "y^2"],
            [-c * c, ""],
          ]);
          const f1 = polyTex([
            [a, "x"],
            [-b, "y"],
            [c, ""],
          ]);
          const f2 = polyTex([
            [a, "x"],
            [-b, "y"],
            [-c, ""],
          ]);
          return {
            content: `${FACTOR}\n${M(src)}`,
            answer: M(`${par(f1)}${par(f2)}`),
            solution: `앞의 세 항이 완전제곱식이므로 주어진 식은 ${M(
              `${par(lin2(a, "x", -b, "y"))}^2-${c}^2`,
            )} 의 꼴이다.\n${M("A^2-B^2=(A+B)(A-B)")} 를 쓰면 ${M(
              `${par(f1)}${par(f2)}`,
            )} 이다.`,
            facts: { mode, a, b, c },
          };
        }
        // c^2 - (ax-by)^2
        const src = polyTex([
          [c * c, ""],
          [-a * a, "x^2"],
          [2 * a * b, "xy"],
          [-b * b, "y^2"],
        ]);
        const f1 = polyTex([
          [c, ""],
          [a, "x"],
          [-b, "y"],
        ]);
        const f2 = polyTex([
          [c, ""],
          [-a, "x"],
          [b, "y"],
        ]);
        return {
          content: `${FACTOR}\n${M(src)}`,
          answer: M(`${par(f1)}${par(f2)}`),
          solution: `뒤의 세 항을 묶으면 ${M(
            `${c}^2-${par(lin2(a, "x", -b, "y"))}^2`,
          )} 이다.\n${M("A^2-B^2=(A+B)(A-B)")} 를 쓰면 ${M(
            `${par(f1)}${par(f2)}`,
          )} 이다.`,
          facts: { mode, a, b, c },
        };
      }),
  ),

  def(
    MINOR_FAC,
    "19",
    "인수분해 공식을 이용한 수의 계산",
    SEC.응용,
    "응용",
    (rng) => {
      const mode = pick(rng, [0, 1, 2] as const);
      if (mode === 0) {
        const s = intBetween(rng, 3, 9) * 10;
        // ⚠️ `t < s` 여야 한다 — 아니면 `b` 가 음수가 되어 지면에 `85^2--5^2` 가
        //    나가고, 그것은 `85^2+5^2` 로 읽힌다(2026-08-24 시험이 잡았다).
        const t = attempt<number>(60, () => {
          const v = intBetween(rng, 1, 9) * 5;
          return v < s ? v : null;
        });
        const a = s + t;
        const b = s - t;
        const value = a * a - b * b;
        return {
          content: `인수분해 공식을 이용하여 다음을 계산하시오.\n${M(
            `${a}^2-${b}^2`,
          )}`,
          answer: M(String(value)),
          solution: `${M("a^2-b^2=(a+b)(a-b)")} 임을 이용한다.\n${M(
            `(${a}+${b})(${a}-${b})=${a + b}\\times${a - b}=${value}`,
          )}`,
          facts: { mode, a, b, value },
        };
      }
      if (mode === 1) {
        const base = pick(rng, [100, 1000] as const);
        const t = intBetween(rng, 1, 9);
        const a = base - t;
        const value = (a + t) * (a + t);
        return {
          content: `인수분해 공식을 이용하여 다음을 계산하시오.\n${M(
            `${a}^2+2\\times${a}\\times${t}+${t}^2`,
          )}`,
          answer: M(String(value)),
          solution: `${M("a^2+2ab+b^2=(a+b)^2")} 임을 이용한다.\n${M(
            `(${a}+${t})^2=${base}^2=${value}`,
          )}`,
          facts: { mode, a, t, value },
        };
      }
      const s = intBetween(rng, 3, 9) * 10;
      const t = intBetween(rng, 1, 8);
      const a = s + t;
      const b = s - t;
      const value = a + b;
      return {
        content: `인수분해 공식을 이용하여 다음을 계산하시오.\n${M(
          `\\dfrac{${a}^2-${b}^2}{${a - b}}`,
        )}`,
        answer: M(String(value)),
        solution: `분자를 인수분해하면 ${M(
          `${a}^2-${b}^2=(${a}+${b})(${a}-${b})`,
        )} 이다.\n${M(
          `\\dfrac{(${a}+${b})\\times${a - b}}{${a - b}}=${value}`,
        )}`,
        facts: { mode, a, b, value },
      };
    },
  ),

  def(
    MINOR_FAC,
    "20",
    "인수분해 공식을 이용하여 식의 값 구하기",
    SEC.응용,
    "응용",
    (rng) => {
      const mode = pick(rng, [0, 1, 2] as const);
      if (mode === 0) {
        const s = intBetween(rng, 3, 9) * 10;
        const t = intBetween(rng, 1, 9);
        const x = s + t;
        const y = s - t;
        const value = (x + y) * (x - y);
        return {
          content: `${M(`x=${x}`)}, ${M(`y=${y}`)} 일 때, ${M(
            "x^2-y^2",
          )} 의 값을 구하시오.`,
          answer: M(String(value)),
          solution: `${M("x^2-y^2=(x+y)(x-y)")} 로 인수분해한 뒤 대입한다.\n${M(
            `(${x}+${y})(${x}-${y})=${x + y}\\times${x - y}=${value}`,
          )}`,
          facts: { mode, x, y, value },
        };
      }
      if (mode === 1) {
        const r = pick(rng, RADICANDS);
        const n = intBetween(rng, 1, 6);
        const value = 2 * n * (2 * n);
        return {
          content: `${M(`x=\\sqrt{${r}}+${n}`)}, ${M(
            `y=\\sqrt{${r}}-${n}`,
          )} 일 때, ${M("x^2-2xy+y^2")} 의 값을 구하시오.`,
          answer: M(String(value)),
          solution: `${M("x^2-2xy+y^2=(x-y)^2")} 으로 인수분해한 뒤 대입한다.\n${M(
            `x-y=${2 * n}`,
          )} 이므로 구하는 값은 ${M(`${2 * n}^2=${value}`)} 이다.`,
          facts: { mode, r, n, value },
        };
      }
      const base = pick(rng, [100, 1000] as const);
      const t = intBetween(rng, 1, 9);
      const x = base - t;
      const value = base * base;
      return {
        content: `${M(`x=${x}`)} 일 때, ${M(
          polyTex([
            [1, "x^2"],
            [2 * t, "x"],
            [t * t, ""],
          ]),
        )} 의 값을 구하시오.`,
        answer: M(String(value)),
        solution: `${M(
          `${polyTex([
            [1, "x^2"],
            [2 * t, "x"],
            [t * t, ""],
          ])}=(x+${t})^2`,
        )} 으로 인수분해한 뒤 대입한다.\n${M(
          `(${x}+${t})^2=${base}^2=${value}`,
        )}`,
        facts: { mode, x, t, value },
      };
    },
  ),

  def(MINOR_FAC, "21", "의 꼴의 인수분해", SEC.응용, "심화하", (rng) =>
    // 상수항의 합이 같도록 둘씩 묶으면 x^2+sx 가 공통부분이 된다.
    attempt<Gen>(200, () => {
      const d = nonZero(rng, -3, 3);
      const e = intBetween(rng, 1, 4);
      const f = intBetween(rng, 1, 5);
      if (e === f) return null;
      const cs = [d, d + Math.min(e, f), d + Math.max(e, f), d + e + f];
      if (new Set(cs).size !== 4) return null;
      const s = 2 * d + e + f;
      const p1 = d * (d + e + f);
      const ef = e * f;
      const u = nonZero(rng, -6, 6);
      const v = ef - u;
      if (v === 0 || u === v) return null;
      const k = u * v;
      if (k === 0) return null;
      const c1 = p1 + u;
      const c2 = p1 + v;
      // 두 이차인수가 더 갈라지면 «완전 인수분해»가 아니다.
      if (isSquare(s * s - 4 * c1) || isSquare(s * s - 4 * c2)) return null;
      const prod = cs.map((c) => parUnlessBare(lin(1, "x", c))).join("");
      const src = `${prod}${termTex(k, "", false)}`;
      const q1 = polyTex([
        [1, "x^2"],
        [s, "x"],
        [Math.min(c1, c2), ""],
      ]);
      const q2 = polyTex([
        [1, "x^2"],
        [s, "x"],
        [Math.max(c1, c2), ""],
      ]);
      return {
        content: `${FACTOR}\n${M(src)}`,
        answer: M(`${par(q1)}${par(q2)}`),
        solution: `상수항의 합이 같아지도록 짝을 지어 전개하면 ${M(
          `${par(
            polyTex([
              [1, "x^2"],
              [s, "x"],
              [p1, ""],
            ]),
          )}${par(
            polyTex([
              [1, "x^2"],
              [s, "x"],
              [p1 + ef, ""],
            ]),
          )}${termTex(k, "", false)}`,
        )} 이다.\n${M(
          `${polyTex([
            [1, "x^2"],
            [s, "x"],
            [p1, ""],
          ])}=A`,
        )} 로 놓고 인수분해한 뒤 되돌리면 ${M(`${par(q1)}${par(q2)}`)} 이다.`,
        facts: { d, e, f, u, v, k },
      };
    }),
  ),

  def(
    MINOR_FAC,
    "22",
    "항이 개 이상인 식의 인수분해",
    SEC.응용,
    "심화하",
    (rng) =>
      attempt<Gen>(120, () => {
        // 차수가 낮은 문자 y 에 대해 내림차순으로 정리하면 (x+a) 가 공통으로 묶인다.
        const a = nonZero(rng, -6, 6);
        const b = nonZero(rng, -4, 4);
        const c = nonZero(rng, -6, 6);
        if (a === c) return null;
        const src = polyTex([
          [1, "x^2"],
          [b, "xy"],
          [a + c, "x"],
          [a * b, "y"],
          [a * c, ""],
        ]);
        const f1 = lin(1, "x", a);
        const f2 = polyTex([
          [1, "x"],
          [b, "y"],
          [c, ""],
        ]);
        return {
          content: `${FACTOR}\n${M(src)}`,
          answer: M(`${par(f1)}${par(f2)}`),
          solution: `차수가 낮은 ${M("y")} 에 대하여 내림차순으로 정리하면 ${M(
            `${termTex(b, "y", true)}${par(f1)}+${polyTex([
              [1, "x^2"],
              [a + c, "x"],
              [a * c, ""],
            ])}`,
          )} 이다.\n뒤의 이차식을 인수분해하면 ${M(
            `${par(f1)}${par(lin(1, "x", c))}`,
          )} 이고, 공통인 인수 ${M(f1)}${iGa(a)} 나오므로 ${M(
            `${par(f1)}${par(f2)}`,
          )} 이다.`,
          facts: { a, b, c },
        };
      }),
  ),
];

export const M3_POLY: TypeEntry[] = [...MUL, ...FAC];

/** 이 모듈이 등록한 중단원 — 시험이 리터럴로 잠근다. */
export const M3_POLY_MINORS = [MINOR_MUL, MINOR_FAC] as const;
