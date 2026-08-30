/**
 * 중1 확장 유형 — **소단원 넷을 8유형에서 10유형으로 올린 몫** (2026-08-29).
 *
 * 일일테스트는 범위가 소단원 하나이고 한 시험지에 같은 문항류는 하나뿐이다
 * (원장님 확정 2026-08-26). 그래서 10문항을 내려면 그 소단원에 **서로 다른 유형이
 * 10개** 있어야 한다. 아래 넷은 정확히 8이라 8문항이 상한이었다.
 *
 * | 소단원 | 있던 것 | 여기서 더한 것 | 채운 갈래 |
 * |---|---|---|---|
 * | 방정식과 그 해 | 01~05·32~34 | `90`·`91` | **연산**·**심화** |
 * | 일차방정식의 풀이 | 09~14·35·36 | `92`·`93` | **기본** ×2 |
 * | 순서쌍과 좌표평면(응용) | 03~06·10·26~28 | `90`·`91` | **연산**·기본 |
 * | 구의 겉넓이와 부피 | 21~28 | `90`·`91` | 기본·응용 |
 *
 * ## 왜 남의 모듈이 아니라 여기인가
 *
 * 이 넷의 기존 유형은 `m1Expr`·`m1Extra`·`m1Stat` 세 파일에 흩어져 있다. 그 셋은
 * 각각 「명부가 RPM 색인 그대로인가」·「우리 유형 27·28 을 더해 여덟인가」 같은
 * **개수를 얼린 가드**를 달고 있어서, 거기에 유형을 더하면 그 가드가 빨개지고
 * 초록으로 되돌리는 유일한 길이 **가드를 무르는 것**이 된다(`midSupB.ts` 머리말이
 * 같은 이유로 선 자리). 그리고 오르카 다중 세션이 같은 파일을 동시에 만지면
 * 병합에서 부딪힌다 — 새 파일 하나 + `generate.ts` 한 줄이면 그 둘을 다 피한다.
 *
 * ## 번호 규약 — **90번대**
 *
 * 확장 번호는 색인 최댓값을 넘어야 하고(`extensionNumberReason`), 갈래끼리 겹치면
 * 안 된다. 지금 쓰이는 대는 `~63` 과 `70~86` 이다(실측). 그래서 이 회차는
 * **`90` 부터** 쓴다 — 어느 대와도 안 부딪힌다.
 * ⚠️ 「방정식과 그 해」와 「일차방정식의 풀이」는 **같은 중단원**(`1-1|일차방정식의 풀이`)
 *    이라 번호가 한 벌이다. 그래서 `90·91` 과 `92·93` 으로 갈라 쓴다.
 *
 * ## 계약 (이웃 모듈과 한 벌)
 *
 * 1. **정답을 먼저 뽑고 발문을 역산한다** — 해·반지름이 늘 정수다.
 * 2. `facts` 에 발문의 원 수치를 남기고, **`facts.x` 가 정답**이다
 *    (`midTypes10.test.ts` 의 제네릭 가드가 「답의 첫 수 == `facts.x`」를 본다).
 * 3. 숫자는 전부 `$...$` 안에 (`elementary/rules` `bareNumbers` 가드).
 * 4. `attempt` 가 다 떨어지면 **던진다** — 조용히 기본값을 내지 않는다.
 * 5. 그림이 없으므로 발문이 **지면을 가리키지 않는다**(`pointsAtFigure`).
 *    「다음 그림에서」류가 하나도 없어야 종이에서 풀린다.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { attempt, defType, intNonzero, signed, type Body } from "./m1Shared";
import { eulReul, euroRo, waGwa } from "./m2Josa";
import type { TypeEntry } from "./types";

const BOOK1 = "1-1";
const BOOK2 = "1-2";
const MINOR_EQ = "일차방정식의 풀이";
const MINOR_COORD = "좌표와 그래프";
const MINOR_SOLID = "입체도형의 겉넓이와 부피";

/** 우리 `Unit.section` 정확한 이름 (`prisma/seed-data/units.ts` 실측). */
const SEC = {
  방정식해: "방정식과 그 해",
  일차방정식: "일차방정식의 풀이",
  좌표응용: "순서쌍과 좌표평면(응용)",
  구: "구의 겉넓이와 부피",
} as const;

// ── 소품 ────────────────────────────────────────────────────

/** 계수가 ±1 이 아닌 정수 — 지면에 `1x`·`0x` 를 안 쓰기 위해. */
const COEF: readonly number[] = [
  -9, -8, -7, -6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9,
];

/**
 * 앞에 서는 항 — `-2a` · `3b`. 부호가 있으면 그대로 붙인다.
 *
 * ⚠️ 뒤에 이어 붙일 때는 `sterm` 을 쓸 것. `+${k}` 로 이으면 `k<0` 일 때
 *    지면에 `+-2a` 가 나간다 — **값은 맞고 보기만 흉한** 부류라 값 검산이
 *    구조적으로 못 본다(2026-08-24).
 */
function term(k: number, sym: string): string {
  return `${k}${sym}`;
}

/**
 * 주격 조사 — `$41$이` · `$5$가`.
 *
 * ⚠️ 받침 판정은 `m2Josa.eulReul` **한 곳**에서 온다(규칙을 두 벌로 두지 않는다).
 *    05 는 등식이 문자 `b` 로 끝나 늘 「가」인데, 여기는 **수로 끝나서** 수마다 갈린다.
 */
function iGa(n: number): "이" | "가" {
  return eulReul(n) === "을" ? "이" : "가";
}

/** 뒤에 이어 붙이는 항 — 늘 부호를 앞세운다. `+3b` · `-4b`. */
function sterm(k: number, sym: string): string {
  return `${k < 0 ? "-" : "+"}${Math.abs(k)}${sym}`;
}

/** 뺄셈을 지면 글자로 — 빼는 수가 음수면 괄호를 씌운다(`5-\left(-4\right)`). */
function minusTex(hi: number, lo: number): string {
  return lo < 0 ? `${hi}-\\left(${lo}\\right)` : `${hi}-${lo}`;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}

/** 점의 좌표를 지면 글자로 — `\mathrm{A}(-3, 4)`. */
function pointTex(name: string, x: number, y: number): string {
  return `\\mathrm{${name}}(${x}, ${y})`;
}

// ── 방정식과 그 해 ───────────────────────────────────────────

/**
 * `90` **등식의 좌변과 우변** (연산).
 *
 * 이 소단원의 여덟은 「등식인가·방정식인가·항등식인가·해인가」를 묻는다. **좌변·우변**
 * 이라는 용어 자체를 묻는 자리는 하나도 없었다 — 그리고 그것은 아무 조건 없이
 * 읽어서 답하는 **밑단**이라 하위반 시험지가 쓸 수 있다.
 *
 * ⚠️ 난이도를 **직접 `연산` 으로 적는다.** `resolveMiddleTier` 는 「한글 문장이 하나뿐이고
 *    그 안에 수식이 없을 때」만 `기본` 을 내리는데, 이 발문은 문장 안에 등식이 있어
 *    그 규칙으로는 절대 안 내려간다(`m1Extra` 의 「계급값」이 같은 이유로 직접 적는다).
 */
const EQUATION_MEANING: TypeEntry[] = [
  defType(
    BOOK1,
    MINOR_EQ,
    "90",
    "등식의 좌변과 우변",
    SEC.방정식해,
    "연산",
    (rng): Body =>
      attempt(200, (): Body | null => {
        const p = pick(rng, COEF);
        const q = intNonzero(rng, -12, 12);
        const m = pick(rng, COEF);
        const n = intNonzero(rng, -12, 12);
        // 좌변과 우변이 글자까지 같으면 「좌변·우변」을 가르는 뜻이 사라진다.
        if (p === m && q === n) return null;
        const left = `${p}x${signed(q)}`;
        const right = `${m}x${signed(n)}`;
        const x = p + n;
        return {
          content: `등식 $${left}=${right}$에서 좌변의 $x$의 계수를 $a$, 우변의 상수항을 $b$라 할 때, $a+b$의 값을 구하시오.`,
          answer: `$${x}$`,
          solution: `등호의 왼쪽이 좌변, 오른쪽이 우변이다.\n좌변 $${left}$에서 $x$의 계수는 $${p}$이므로 $a=${p}$이고, 우변 $${right}$에서 상수항은 $${n}$이므로 $b=${n}$이다.\n따라서 $a+b=${p}${signed(n)}=${x}$이다.`,
          facts: { p, q, m, n, x },
        };
      }),
  ),

  /**
   * `91` **항등식이 되는 두 상수** (심화).
   *
   * 05(항등식이 되는 조건)는 $ax-16=-4x+4b$ 처럼 **계수를 눈으로 맞대면** 끝난다.
   * 여기는 두 미지수가 양쪽 항에 다 걸려 있어 **연립해서** 풀어야 한다 — 묻는 것이
   * 「계수 비교」가 아니라 「계수 비교로 세운 두 식을 푸는 것」이다.
   */
  defType(
    BOOK1,
    MINOR_EQ,
    "91",
    "항등식이 되는 두 상수의 곱",
    SEC.방정식해,
    "심화하",
    (rng): Body =>
      attempt(400, (): Body | null => {
        const a = pick(rng, [2, 3, 4, 5, -2, -3, -4, -5] as const);
        const b = pick(rng, [2, 3, 4, 5, -2, -3, -4, -5] as const);
        // 두 상수가 같으면 연립이 한 식으로 접혀 「심화」가 아니게 된다.
        if (a === b) return null;
        const u = pick(rng, [2, 3, 4, 5, 6, -2, -3, -4, -5, -6] as const);
        const v = pick(rng, [2, 3, 4, 5, 6, -2, -3, -4, -5, -6] as const);
        // 두 괄호가 같으면 $a$, $b$ 가 따로 안 정해진다 (해가 무수히 많다).
        if (u === v) return null;
        const S = a + b;
        const T = a * u + b * v;
        if (Math.abs(S) < 2) return null; // `1x`·`0x` 를 지면에 안 쓴다
        if (T === 0) return null;
        // 🔴 좌변은 **글자 $a$, $b$ 로** 찍는다. 값을 찍으면 등식이 이미 정해져
        //    「상수 $a$, $b$」가 발문 어디에도 없는 문항이 되어 **풀 수가 없다**
        //    — 값 검산은 답이 맞으니 통과한다(첫 판이 실제로 그랬다).
        const lhs = `a\\left(x${signed(u)}\\right)+b\\left(x${signed(v)}\\right)`;
        const rhs = `${S}x${signed(T)}`;
        const x = a * b;
        const bTex = b < 0 ? `\\left(${b}\\right)` : `${b}`;
        return {
          content: `등식 $${lhs}=${rhs}$${iGa(T)} $x$에 대한 항등식일 때, 상수 $a$, $b$에 대하여 $ab$의 값을 구하시오.`,
          answer: `$${x}$`,
          solution: `좌변을 전개하여 정리하면 $\\left(a+b\\right)x${sterm(u, "a")}${sterm(v, "b")}$이다.\n항등식이므로 양변의 $x$의 계수와 상수항이 각각 같다.\n$a+b=${S}$, $${term(u, "a")}${sterm(v, "b")}=${T}$이므로 이를 연립하여 풀면 $a=${a}$, $b=${b}$이다.\n따라서 $ab=${a}\\times${bTex}=${x}$이다.`,
          facts: { a, b, u, v, S, T, x },
        };
      }),
  ),
];

// ── 일차방정식의 풀이 ────────────────────────────────────────

type LinearEq = {
  text: string;
  r: number;
  p: number;
  q: number;
  m: number;
  n: number;
};

/**
 * 해가 `r` 인 일차방정식 `px+q = mx+n` 을 한 벌 짓는다 — 못 지으면 `null`.
 *
 * 지면 규칙: 양변 모두 $x$항이 있고(`m \ne 0`), 계수 ±1 을 안 쓰며(`|p-m| \ge 2`),
 * 상수항이 0 이 아니다. 그래야 `1x`·`0x`·`+0` 이 지면에 안 나간다.
 */
function makeLinearEq(rng: Rng, r: number): LinearEq | null {
  const p = intBetween(rng, 2, 7);
  const m = pick(rng, [-5, -4, -3, -2, 2, 3, 4, 5] as const);
  if (Math.abs(p - m) < 2) return null;
  const q = intNonzero(rng, -12, 12);
  const n = (p - m) * r + q;
  if (n === 0) return null;
  return { text: `${p}x${signed(q)}=${m}x${signed(n)}`, r, p, q, m, n };
}

const LINEAR_SOLVE: TypeEntry[] = [
  /**
   * `92` **두 일차방정식의 해의 합** (기본).
   *
   * 09~14·35·36 은 전부 「이 방정식 **하나**를 풀어라」다. 여기는 둘을 풀고 그 해를
   * **묶어서** 답한다 — 16(두 일차방정식의 해가 서로 같은 경우, 「해의 응용」 몫)과도
   * 다르다. 그쪽은 상수를 구하고 이쪽은 두 해를 구한다.
   */
  defType(
    BOOK1,
    MINOR_EQ,
    "92",
    "두 일차방정식의 해의 합",
    SEC.일차방정식,
    "기본",
    (rng): Body =>
      attempt(600, (): Body | null => {
        const r1 = intNonzero(rng, -8, 8);
        const r2 = intNonzero(rng, -8, 8);
        if (r1 === r2) return null; // 같은 해면 「각각」이라 부를 것이 없다
        const e1 = makeLinearEq(rng, r1);
        const e2 = makeLinearEq(rng, r2);
        if (e1 === null || e2 === null) return null;
        if (e1.text === e2.text) return null;
        const x = r1 + r2;
        return {
          content: `두 일차방정식 $${e1.text}$, $${e2.text}$의 해를 각각 $a$, $b$라 할 때, $a+b$의 값을 구하시오.`,
          answer: `$${x}$`,
          solution: `$${e1.text}$에서 $x$항은 좌변으로, 상수항은 우변으로 이항하면 $${e1.p - e1.m}x=${e1.n - e1.q}$이므로 $a=${r1}$이다.\n같은 방법으로 $${e2.text}$에서 $${e2.p - e2.m}x=${e2.n - e2.q}$이므로 $b=${r2}$이다.\n따라서 $a+b=${r1}${signed(r2)}=${x}$이다.`,
          facts: {
            r1,
            r2,
            p1: e1.p,
            q1: e1.q,
            m1: e1.m,
            n1: e1.n,
            p2: e2.p,
            q2: e2.q,
            m2: e2.m,
            n2: e2.n,
            x,
          },
        };
      }),
  ),

  /**
   * `93` **계수를 정수로 고치기 위해 곱하는 수** (기본).
   *
   * 11~13·36 은 「계수를 정수로 고쳐서 **풀어라**」다. 여기는 그 첫 단계 하나만
   * 떼어 **무엇을 곱해야 하는가**를 묻는다 — 풀이가 아니라 분모의 최소공배수를
   * 묻는 것이라 답이 해와 무관하다.
   *
   * 🔴 **「가장 작은」이 참이어야 한다.** 분자의 계수가 분모와 약분되면 더 작은 수로도
   *    정수가 된다($\dfrac{2x+4}{4}$ 는 $2$ 만 곱해도 정수다). 그래서 둘째 분수는
   *    `gcd(a, n) = gcd(v, n) = 1` 을 요구한다 — 그러면 $n \mid k$ 가 강제되고,
   *    첫째 분수는 $x$의 계수가 $1$ 이라 늘 $m \mid k$ 다. 곧 최솟값이 `lcm(m, n)` 이다.
   */
  defType(
    BOOK1,
    MINOR_EQ,
    "93",
    "계수를 정수로 고치기 위해 곱하는 수",
    SEC.일차방정식,
    "기본",
    (rng): Body =>
      attempt(600, (): Body | null => {
        // 두 분모는 서로를 나누지 않아야 한다 — 나누면 한쪽 몫이 $1$ 이 되어
        // 해설에 `1\left(...\right)` 이 나간다.
        const [m, n] = pick(rng, [
          [4, 6],
          [6, 4],
          [4, 10],
          [10, 4],
          [6, 8],
          [8, 6],
          [6, 9],
          [9, 6],
          [6, 10],
          [10, 6],
          [8, 12],
          [12, 8],
          [9, 12],
          [12, 9],
          [10, 15],
          [15, 10],
        ] as const);
        const K = lcm(m, n);
        const a = intBetween(rng, 2, 7);
        const v = intNonzero(rng, -9, 9);
        if (gcd(a, n) !== 1 || gcd(v, n) !== 1) return null;
        const u = intNonzero(rng, -9, 9);
        const s = pick(rng, [1, -1] as const);
        const c = intNonzero(rng, -6, 6);
        // 정수로 고친 뒤 $x$가 사라지면 일차방정식이 아니다.
        if (K / m + s * a * (K / n) === 0) return null;
        const expr = `\\dfrac{x${signed(u)}}{${m}}${s > 0 ? "+" : "-"}\\dfrac{${a}x${signed(v)}}{${n}}`;
        const cleared = `${K / m}\\left(x${signed(u)}\\right)${s > 0 ? "+" : "-"}${K / n}\\left(${a}x${signed(v)}\\right)=${K * c}`;
        return {
          content: `일차방정식 $${expr}=${c}$의 계수를 모두 정수로 고치기 위하여 양변에 곱해야 하는 가장 작은 자연수를 구하시오.`,
          answer: `$${K}$`,
          solution: `계수를 정수로 고치려면 두 분모 $${m}$${waGwa(m)} $${n}$의 공배수를 양변에 곱해야 한다.\n$${m}$${waGwa(m)} $${n}$의 최소공배수는 $${K}$이므로 양변에 $${K}$${eulReul(K)} 곱하면 $${cleared}$이다.\n이때 모든 계수가 정수이고, $${K}$보다 작은 자연수 중에는 $${m}$${waGwa(m)} $${n}$의 공배수가 없다.\n따라서 구하는 가장 작은 자연수는 $${K}$이다.`,
          facts: { m, n, a, u, v, c, s, x: K },
        };
      }),
  ),
];

// ── 순서쌍과 좌표평면(응용) ──────────────────────────────────

const COORD_TYPES: TypeEntry[] = [
  /**
   * `90` **좌표축에 평행한 선분의 길이** (연산).
   *
   * 03(삼각형의 넓이)·28(직사각형의 넓이)이 이 길이를 **속에서** 쓰는데, 그것만
   * 따로 묻는 자리가 없었다. 좌표를 읽어 차를 구하는 것뿐이라 밑단이다.
   *
   * ⚠️ `resolveMiddleTier` 가 못 내리는 모양(문장 안에 수식이 있다)이라 **직접 적는다.**
   */
  defType(
    BOOK1,
    MINOR_COORD,
    "90",
    "좌표축에 평행한 선분의 길이",
    SEC.좌표응용,
    "연산",
    (rng): Body =>
      attempt(200, (): Body | null => {
        const horizontal = pick(rng, [true, false] as const);
        const ax = intBetween(rng, -9, 9);
        const ay = intBetween(rng, -9, 9);
        const step = pick(rng, [-1, 1] as const) * intBetween(rng, 2, 12);
        const bx = horizontal ? ax + step : ax;
        const by = horizontal ? ay : ay + step;
        if (Math.abs(bx) > 12 || Math.abs(by) > 12) return null;
        const x = Math.abs(step);
        const A = pointTex("A", ax, ay);
        const B = pointTex("B", bx, by);
        const hi = horizontal ? Math.max(ax, bx) : Math.max(ay, by);
        const lo = horizontal ? Math.min(ax, bx) : Math.min(ay, by);
        // 🔴 빼는 수가 $0$ 이면 해설에 `4-0=4` 가 나간다 — **값은 맞고 지면만 흉한**
        //    부류라 값 검산이 구조적으로 못 본다. 지면 냄새 자가 실제로 잡았다.
        if (lo === 0) return null;
        const shared = horizontal ? ay : ax;
        const sameAxis = horizontal ? "y" : "x";
        const diffAxis = horizontal ? "x" : "y";
        const parallelTo = horizontal ? "x" : "y";
        return {
          content: `두 점 $${A}$, $${B}$에 대하여 선분 $\\mathrm{AB}$의 길이를 구하시오.`,
          answer: `$${x}$`,
          solution: `두 점의 $${sameAxis}$좌표가 $${shared}$${euroRo(shared)} 같으므로 선분 $\\mathrm{AB}$는 $${parallelTo}$축에 평행하다.\n따라서 그 길이는 두 점의 $${diffAxis}$좌표의 차와 같으므로 $${minusTex(hi, lo)}=${x}$이다.`,
          facts: { horizontal: horizontal ? 1 : 0, ax, ay, bx, by, x },
        };
      }),
  ),

  /**
   * `91` **직사각형의 네 번째 꼭짓점** (기본).
   *
   * 28 은 대각선 두 끝점에서 **넓이**를 묻는다. 여기는 세 꼭짓점에서 **남은 한 점의
   * 좌표**를 묻는다 — 묻는 것이 넓이가 아니라 좌표이고, 「마주 보는 변이 평행하다」를
   * 좌표로 읽어야 한다.
   *
   * `facts.x`·`facts.y` 는 답인 점 $\mathrm{D}$의 두 좌표다. 제네릭 가드가 보는 것은
   * 「답의 첫 수」라 `facts.x` 가 $x$좌표여야 한다.
   */
  defType(
    BOOK1,
    MINOR_COORD,
    "91",
    "직사각형의 네 번째 꼭짓점의 좌표",
    SEC.좌표응용,
    "기본",
    (rng): Body =>
      attempt(200, (): Body | null => {
        const x1 = intBetween(rng, -8, 2);
        const x2 = x1 + intBetween(rng, 3, 9);
        const y1 = intBetween(rng, -8, 2);
        const y2 = y1 + intBetween(rng, 3, 9);
        // 네 꼭짓점을 **둘레 순서**로 돌려 어느 좌표가 발문에 나오는지 바꾼다.
        const cycle: readonly (readonly [number, number])[] = [
          [x1, y2],
          [x1, y1],
          [x2, y1],
          [x2, y2],
        ];
        const rot = intBetween(rng, 0, 3);
        const at = (i: number): readonly [number, number] =>
          cycle[(i + rot) % 4]!;
        const [ax, ay] = at(0);
        const [bx, by] = at(1);
        const [cx, cy] = at(2);
        const [dx, dy] = at(3);
        // 변 AB 가 세로면 D 의 x좌표는 C 와, y좌표는 A 와 같다. 가로면 그 반대다.
        const abVertical = ax === bx;
        const why = abVertical
          ? `변 $\\mathrm{CD}$가 변 $\\mathrm{AB}$와 평행하므로 점 $\\mathrm{D}$의 $x$좌표는 점 $\\mathrm{C}$의 $x$좌표와 같은 $${dx}$이고, 변 $\\mathrm{DA}$가 변 $\\mathrm{BC}$와 평행하므로 $y$좌표는 점 $\\mathrm{A}$의 $y$좌표와 같은 $${dy}$이다.`
          : `변 $\\mathrm{CD}$가 변 $\\mathrm{AB}$와 평행하므로 점 $\\mathrm{D}$의 $y$좌표는 점 $\\mathrm{C}$의 $y$좌표와 같은 $${dy}$이고, 변 $\\mathrm{DA}$가 변 $\\mathrm{BC}$와 평행하므로 $x$좌표는 점 $\\mathrm{A}$의 $x$좌표와 같은 $${dx}$이다.`;
        return {
          content: `세 점 $${pointTex("A", ax, ay)}$, $${pointTex("B", bx, by)}$, $${pointTex("C", cx, cy)}$와 점 $\\mathrm{D}$를 꼭짓점으로 하는 사각형 $\\mathrm{ABCD}$가 각 변이 좌표축에 평행한 직사각형일 때, 점 $\\mathrm{D}$의 좌표를 구하시오.`,
          answer: `$(${dx}, ${dy})$`,
          solution: `${why}\n따라서 점 $\\mathrm{D}$의 좌표는 $(${dx}, ${dy})$이다.`,
          facts: { ax, ay, bx, by, cx, cy, x: dx, y: dy },
        };
      }),
  ),
];

// ── 구의 겉넓이와 부피 ───────────────────────────────────────

const SPHERE_TYPES: TypeEntry[] = [
  /**
   * `90` **겉넓이·부피가 주어진 구의 지름** (기본).
   *
   * 21 은 지름 → 겉넓이, 22 는 겉넓이 → 부피다. 여기는 **거꾸로** 겉넓이(또는 부피)에서
   * 지름을 되돌린다 — 27(부피 → 반구의 겉넓이)과 달리 답이 길이라 단위가 다르다.
   */
  defType(
    BOOK2,
    MINOR_SOLID,
    "90",
    "겉넓이와 부피에서 구의 지름 구하기",
    SEC.구,
    "기본",
    (rng): Body =>
      attempt(200, (): Body | null => {
        const fromArea = pick(rng, [true, false] as const);
        // 부피 갈래는 $\dfrac{4}{3}r^3$ 이 정수여야 하므로 반지름이 3의 배수다.
        const r = fromArea
          ? intBetween(rng, 2, 15)
          : pick(rng, [3, 6, 9, 12] as const);
        const given = fromArea ? 4 * r * r : (4 * r * r * r) / 3;
        const x = 2 * r;
        const head = fromArea
          ? `겉넓이가 $${given}\\pi\\,\\mathrm{cm}^2$인 구`
          : `부피가 $${given}\\pi\\,\\mathrm{cm}^3$인 구`;
        const step = fromArea
          ? `$4\\pi r^{2}=${given}\\pi$에서 $r^{2}=${r * r}$이므로 $r=${r}$이다.`
          : `$\\dfrac{4\\pi}{3}r^{3}=${given}\\pi$에서 $r^{3}=${r * r * r}$이므로 $r=${r}$이다.`;
        return {
          content: `${head}의 지름의 길이를 구하시오.`,
          answer: `$${x}\\,\\mathrm{cm}$`,
          solution: `반지름의 길이를 $r\\,\\mathrm{cm}$라 하면 ${step}\n지름의 길이는 반지름의 길이의 두 배이므로 $2\\times${r}=${x}\\,(\\mathrm{cm})$이다.`,
          facts: { fromArea: fromArea ? 1 : 0, r, given, x },
        };
      }),
  ),

  /**
   * `91` **구슬을 녹여 작은 구슬 만들기** (응용).
   *
   * 25(원뿔·구·원기둥의 부피의 비)와 28(한 구의 겉넓이와 부피의 비)은 **한 입체 안**의
   * 비다. 여기는 **두 구 사이**의 부피 비이고, 그 비가 반지름 비의 세제곱이라는 것을
   * 써야 풀린다 — 부피를 각각 계산해도 되지만 비로 보면 한 줄이다.
   */
  defType(
    BOOK2,
    MINOR_SOLID,
    "91",
    "구를 녹여 만드는 작은 구의 개수",
    SEC.구,
    "응용",
    (rng): Body =>
      attempt(200, (): Body | null => {
        const r = intBetween(rng, 2, 6);
        const k = pick(rng, [2, 3] as const);
        const R = r * k;
        if (R > 18) return null;
        const x = k * k * k;
        return {
          content: `반지름의 길이가 $${R}\\,\\mathrm{cm}$인 쇠구슬을 녹여 반지름의 길이가 $${r}\\,\\mathrm{cm}$인 쇠구슬을 만들려고 한다. 만들 수 있는 쇠구슬은 최대 몇 개인지 구하시오.`,
          answer: `$${x}$개`,
          solution: `구의 부피는 반지름의 길이의 세제곱에 정비례하므로 두 구의 부피의 비는 반지름의 길이의 세제곱의 비와 같다.\n$${R}^{3}:${r}^{3}=${R * R * R}:${r * r * r}=${x}:1$이므로 큰 쇠구슬 하나로 작은 쇠구슬을 $${x}$개까지 만들 수 있다.\n따라서 구하는 개수는 $${x}$개이다.`,
          facts: { R, r, k, x },
        };
      }),
  ),
];

/** 이 회차가 지은 확장 유형 전부 — `generate.ts` 가 이 하나만 편다. */
export const M1_TYPES_10: TypeEntry[] = [
  ...EQUATION_MEANING,
  ...LINEAR_SOLVE,
  ...COORD_TYPES,
  ...SPHERE_TYPES,
];
