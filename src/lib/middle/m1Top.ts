/**
 * 중1 **상위 갈래** — `심화중`·`심화상` 을 처음 세운다 (D-116, 2026-09-01).
 *
 * ## 이것은 «채우기»가 아니라 «새로 짓기»다
 *
 * 착수 시점에 `src/lib/middle/` 전량에 `심화중`·`심화상` 문자열이 **0건**이었고,
 * `resolveMiddleTier(declared, content, hasFigure)` 는 등록값을 **내리기만** 한다
 * (`기본`→`연산`, D-106). 그러므로 위 두 칸은 유형이 `difficulty` 로 **스스로
 * 선언**해야만 생긴다. 아래 넷이 중1에서 그 선언을 하는 첫 유형이다.
 *
 * ## 무엇이 «중»이고 무엇이 «상»인가 — 저쪽 실물에서 왔다
 *
 * `tracks/reports/matholic-mid-scan.md` §4 가 중1·중3 실물을 눈으로 보고 적은 꼴이다.
 *
 * ```
 * 심화중  마디 하나가 안 굳고, **그 소단원의 개념**이 그것을 굳힌다.
 *         성질 하나가 후보를 «끝까지 계산하지 않고» 거른다.        (D-115 ⑾)
 * 심화상  성질로 못 굳혀 후보를 **다 만들어 견줘야** 한다.
 * ```
 *
 * | 키 | 갈래 | 안 굳는 마디 | 무엇이 굳히나 |
 * |---|---|---|---|
 * | `최대공약수와 최소공배수\|31T` | **심화중** | **나머지** — 발문이 안 준다 | 「나머지가 같으면 차가 그 수의 배수」(공약수 개념)가 나머지를 **구하지 않고** 지운다 |
 * | `최대공약수와 최소공배수\|32T` | **심화상** | 두 수 $A$, $B$ 자체 | 굳지 **않는다** — 서로소인 쌍을 **넷 다 만들어** 합을 각각 계산해야 한다 |
 * | `일차방정식의 풀이\|94T` | **심화중** | $a$, $b$, $c$ 각각 (무수히 많다) | 비례식을 한 문자로 접으면 그 문자가 **약분되어** 물어본 식의 값만 굳는다 |
 * | `일차방정식의 풀이\|95T` | **심화상** | 자연수 $a$ | 굳지 **않는다** — $M$의 약수를 **모두 만들어** 둘째 조건에 하나씩 대 봐야 한다 |
 *
 * ## 🔴 초등이 네 물결에 걸쳐 물린 함정 셋 — 여기서 어떻게 피했나
 *
 * ㉠ **창을 한쪽 끝만 주면 굳힘이 장식이 된다.** 「살아남는 후보가 언제나 목록의
 *    같은 자리(끝)」면 굳힘 조건은 «어느 후보인가»를 한 번도 안 고른다. 초6 에서
 *    두 갈래가 이것으로 병합이 막혔다(각각 23/23 · 672/672 **전수**).
 *    → `32T`·`95T` 는 답이 **후보 하나가 아니라 후보 전부의 합**이다. 목록의 어느
 *      자리도 답이 될 수 없으므로 이 병이 **구조적으로** 생기지 않는다.
 *    → `31T` 는 후보 목록이 발문이 아니라 **굳힘 조건 자체**에서 태어난다(조건을
 *      지우면 후보가 없다). 그 대신 「셋 중 둘만 보면 답이 나오나」를 **불변식으로
 *      막는다** — `assertThirdNumberMatters` 가 그것이다.
 *    → `94T` 는 후보 목록이 아예 없다(값이 하나로 굳는다). 대신 ㉡ 로 잰다.
 *    ⚠️ 「축이 없다」와 「축이 초록이다」는 다른 말이다. 어느 쪽인지
 *      `scripts/qa/probe-mid-top-m1.ts` 가 **갈래마다 따로 찍는다.**
 *
 * ㉡ **「굳힘이 항등식」** — 굳힘 조건을 지우고 같은 씨앗으로 돌려 답이 그대로면
 *    그것은 굳힘이 아니라 장식이다. 초등에서 이 검사로만 갈래 넷이 걸렸다.
 *    → 넷 다 굳힘 조건을 **인자로 받는 순수 함수**로 뽑아 두었다(`solveXxx`).
 *      판정기가 그 인자를 흔들어 답이 실제로 달라지는지 잰다.
 *
 * ㉢ **갈래끼리 겹침** — 새 갈래가 그 소단원의 `심화하`·`응용` 과 한 시험지에
 *    같이 실린다. 「수+정답」 열쇠에는 **천장**이 있으므로(심화상에서 자기 자신과도
 *    19.2%) 쌍마다 천장을 먼저 찍고, 천장이 낮으면 «겹침 없음»이 아니라
 *    **«판정 불가»** 로 적는다. 판정기가 그 두 열쇠를 같이 낸다.
 *
 * ## 왜 남의 모듈이 아니라 새 파일인가
 *
 * `m1Num.ts` 는 「61유형 명부」와 「최대공약수와 최소공배수 30」을 **개수로 얼린**
 * 가드를 달고 있고, `m1Extra`·`m1Expr` 도 같다. 거기에 유형을 더하면 그 가드가
 * 빨개지고 초록으로 되돌리는 유일한 길이 **가드를 무르는 것**이 된다
 * (`midSupB.ts`·`m1Types10.ts` 가 같은 이유로 선 자리). 그리고 오르카 다중 세션이
 * 같은 파일을 동시에 만지면 병합에서 부딪힌다 — 새 파일 하나 + `generate.ts`
 * **spread 한 줄**이면 그 둘을 다 피한다.
 *
 * ## 번호 규약 — **`T` 접미사**
 *
 * `extensionNumberReason`(`src/__tests__/helpers/rpmCatalog.ts:87`)은 `숫자+영문
 * 대문자 한 글자` 를 「색인 번호와 절대 안 겹친다」로 통과시킨다. 병렬 세션이 같은
 * 90번대를 동시에 쓰면 부딪히므로(이미 `90`~`93` 이 `m1Types10` 몫이다) 이 트랙은
 * **`T`(Top)** 를 붙여 대를 통째로 가른다.
 *
 * ## 계약 (이웃 모듈과 한 벌)
 *
 * 1. **정답을 먼저 뽑고 발문을 역산한다.**
 * 2. `facts.x` 가 정답이다 (`middleM1Top.test.ts` 의 제네릭 가드가 본다).
 * 3. 숫자는 전부 `$...$` 안에 (`elementary/rules` `bareNumbers` 가드).
 * 4. `attempt` 가 다 떨어지면 **던진다** — 조용히 기본값을 내지 않는다.
 * 5. 그림이 없으므로 발문이 **지면을 가리키지 않는다**(`pointsAtFigure`).
 * 6. 🔴 **해설이 걸음을 건너뛰지 않는다** (D-116 ⑸, 원장님 새 완료 조건).
 *    「풀면」·「구하면」 뒤에 중간 결과 없이 답만 오면 안 된다. 후보를 견주는
 *    갈래는 **후보를 하나씩 적고 각각 왜 살고 죽는지**까지 적는다.
 */
import { intBetween, pick } from "../elementary/rng";

import { attempt, defType, type Body } from "./m1Shared";
import { eulReul, euroRo } from "./m2Josa";
import type { TypeEntry } from "./types";

const BOOK1 = "1-1";
const MINOR_GCD = "최대공약수와 최소공배수";
const MINOR_EQ = "일차방정식의 풀이";

/** 우리 `Unit.section` 정확한 이름 (`prisma/seed-data/units.ts` 실측). */
const SEC = {
  공약수: "공약수와 최대공약수",
  활용: "최대공약수와 최소공배수의 활용",
  일차방정식: "일차방정식의 풀이",
  해의응용: "일차방정식의 활용(해의 응용)",
} as const;

// ── 소품 ────────────────────────────────────────────────────

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

/** 오름차순 약수 전부. */
export function divisors(n: number): number[] {
  const out: number[] = [];
  for (let d = 1; d * d <= n; d += 1) {
    if (n % d !== 0) continue;
    out.push(d);
    if (d !== n / d) out.push(n / d);
  }
  return out.sort((a, b) => a - b);
}

/** 소인수분해를 지면 글자로 — `2^{2}\times3\times7`. */
export function factorTex(n: number): string {
  const parts: string[] = [];
  let m = n;
  for (let p = 2; p * p <= m; p += 1) {
    if (m % p !== 0) continue;
    let e = 0;
    while (m % p === 0) {
      m /= p;
      e += 1;
    }
    parts.push(e === 1 ? `${p}` : `${p}^{${e}}`);
  }
  if (m > 1) parts.push(`${m}`);
  return parts.join("\\times");
}

/** 주격 조사 — `$41$이` · `$5$가`. 받침 판정은 `m2Josa` **한 곳**에서 온다. */
function iGa(n: number): "이" | "가" {
  return eulReul(n) === "을" ? "이" : "가";
}

/**
 * 보조사 — `$41$은` · `$5$는`.
 *
 * ⚠️ 「$243$**을** $27$의 배수이므로」처럼 **목적격을 쓰면 문장이 안 된다.**
 * `나누어떨어지다`·`배수이다` 는 목적어를 안 받는다. 값 검산은 이 부류를
 * 구조적으로 못 본다(산술은 맞고 글자만 틀렸다) — 첫 판이 실제로 그랬다.
 * 받침 판정은 여기서도 `m2Josa` 를 거친다(규칙을 두 벌로 두지 않는다).
 */
function eunNeun(n: number): "은" | "는" {
  return eulReul(n) === "을" ? "은" : "는";
}

/** 양수는 괄호를 안 씌운다 — `\left(-3\right)` · `7`. */
function parenNeg(n: number): string {
  return n < 0 ? `\\left(${n}\\right)` : `${n}`;
}

/** 부호를 앞세운 항 — `+3x` · `-4x`. 계수 $\pm1$ 은 쓰지 않는다(호출 쪽이 막는다). */
function sterm(k: number, sym: string): string {
  return `${k < 0 ? "-" : "+"}${Math.abs(k)}${sym}`;
}

/** 목록을 `$1$, $2$, $3$` 꼴로. */
function listTex(xs: readonly number[]): string {
  return xs.map((v) => `$${v}$`).join(", ");
}

// ═══════════════════════════════════════════════════════════
// 31T  세 수를 나누어 **나머지가 모두 같은** 가장 큰 수  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 **굳힘 조건은 「나머지가 모두 같다」 하나다.** 나머지 값은 발문이 **안 준다** —
 * 그것이 이 유형의 «안 굳는 마디»이고, 그 마디를 굳히는 것은 값이 아니라 **성질**이다:
 * 두 수를 빼면 나머지가 지워지므로 구하는 수는 **차들의 공약수**다. 나머지를 끝까지
 * 계산하지 않고 걸러 낸다 — D-115 ⑾ 이 «중»이라 못 박은 바로 그 길이다.
 *
 * 이 소단원의 심화하 `21`·`22` 는 나머지를 **값으로 준다**(「나머지가 모두 $11$」).
 * 그러면 마디가 없다 — 한 번 빼고 최대공약수를 잡으면 끝이다. 그것이 이 유형과
 * 그 둘을 가르는 축이고, `middleM1Top.test.ts` 가 그 축을 잠근다.
 */
export function solveSameRemainder(nums: readonly number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  let g = 0;
  for (let i = 1; i < sorted.length; i += 1) {
    g = gcd(g, sorted[i]! - sorted[0]!);
  }
  return g;
}

/**
 * 🔴 **셋째 수가 정말 일을 하는가** — 하나를 빼도 답이 같으면 그 수는 장식이다.
 *
 * 초6 이 물린 ㉠ 과 같은 부류다(「정보는 있고 선택력이 0」). 여기서는 후보 목록이
 * 아니라 **발문의 수** 쪽에 그 병이 생긴다: 두 수의 차가 곧 답이면 셋째 수를
 * 안 읽어도 맞는다. 그래서 생성기가 **셋 중 어느 하나를 빼면 답이 달라지는 것**을
 * 불변식으로 요구한다(못 만들면 `attempt` 가 던진다).
 */
export function thirdNumberMatters(nums: readonly number[]): boolean {
  const full = solveSameRemainder(nums);
  for (let i = 0; i < nums.length; i += 1) {
    const rest = nums.filter((_, j) => j !== i);
    if (solveSameRemainder(rest) === full) return false;
  }
  return true;
}

const SAME_REMAINDER: TypeEntry[] = [
  defType(
    BOOK1,
    MINOR_GCD,
    "31T",
    "나머지가 모두 같은 수로 나누는 경우",
    SEC.공약수,
    "심화중",
    (rng): Body =>
      attempt(600, (): Body | null => {
        // 답이 될 수(= 차들의 최대공약수)를 **먼저** 뽑고 발문을 역산한다.
        const g = intBetween(rng, 12, 48);
        // 나머지는 발문에 안 나온다. 실재해야 하므로 $0<R<g$.
        const r = intBetween(rng, 1, g - 1);
        // 배수 자리. 이웃 간격이 $2$ 이상이라야 「두 수만 봐도 답」이 안 된다.
        const u1 = intBetween(rng, 1, 4);
        const u2 = u1 + intBetween(rng, 2, 5);
        const u3 = u2 + intBetween(rng, 2, 5);
        // 간격끼리 서로소여야 최대공약수가 정확히 $g$ 다.
        if (gcd(u2 - u1, u3 - u2) !== 1) return null;
        const nums = [g * u1 + r, g * u2 + r, g * u3 + r];
        if (nums[0]! < 40) return null; // 너무 작으면 나머지가 눈에 띈다
        if (nums[2]! > 900) return null; // 지면에 네 자리 수를 안 쓴다
        if (solveSameRemainder(nums) !== g) return null;
        if (!thirdNumberMatters(nums)) return null;
        const [a, b, c] = nums as [number, number, number];
        const d1 = b - a;
        const d2 = c - b;
        const d3 = c - a;
        return {
          content: `세 자연수 $${a}$, $${b}$, $${c}$${eulReul(c)} 어떤 자연수로 나누면 나머지가 모두 같다. 이러한 자연수 중 가장 큰 수를 구하시오.`,
          answer: `$${g}$`,
          solution: [
            `구하는 자연수를 $n$, 그때의 나머지를 $R$라 하면 세 수는 모두 $n$의 배수보다 $R$만큼 큰 수이다.`,
            `두 수를 빼면 $R$가 지워지므로 $n$은 세 수의 차 $${b}-${a}=${d1}$, $${c}-${b}=${d2}$, $${c}-${a}=${d3}$의 공약수이다.`,
            `$${d1}=${factorTex(d1)}$, $${d2}=${factorTex(d2)}$이므로 두 수의 최대공약수는 $${g}$이고, $${d3}$${eunNeun(d3)} $${g}$의 배수이므로 세 차의 최대공약수도 $${g}$이다.`,
            `따라서 $n$은 $${g}$의 약수이고, 그중 가장 큰 수는 $${g}$이다.`,
            `이때 $${a}$${eulReul(a)} $${g}$${euroRo(g)} 나눈 나머지는 $${r}$이고 나머지 두 수도 나머지가 $${r}$${euroRo(r)} 같으므로 조건에 맞는다.`,
          ].join("\n"),
          facts: { x: g, r, a, b, c, d1, d2, d3 },
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 32T  최대공약수·최소공배수만 주고 **$A+B$ 가 될 수 있는 값 전부**  (심화상)
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 **여기서는 후보가 굳지 않는다.** $A=Ga$, $B=Gb$ 로 접어도 $(a,b)$ 는 곱이
 * $n$ 인 **서로소인 쌍 전부**이고, 발문이 그중 하나를 고르는 조건을 **안 준다.**
 * 그래서 넷을 다 만들어 $G(a+b)$ 를 **각각 계산해** 견주어야 한다 — D-115 ⑾ 의 «상».
 *
 * 이 소단원의 심화하 `16` 은 「합이 $77$」을 **함께** 주므로 성질 하나가 쌍 하나를
 * 골라 낸다(그래서 그것은 «중» 쪽 길이다). 조건 하나를 **빼는** 것이 이 유형을
 * 그 위로 올린다 — 더 어려운 계산을 얹은 것이 아니라 **굳힘을 없앤** 것이다.
 *
 * 그리고 답은 후보 하나가 아니라 **후보 전부의 합**이다. 그래서 「굳힘 조건을
 * 안 읽고 목록의 최댓값(또는 최솟값)을 집는」 초6 의 ㉠ 이 여기서는 **구조적으로**
 * 성립하지 않는다 — 목록의 어느 자리도 답이 아니다.
 */
export function coprimePairSums(g: number, n: number): number[] {
  const out: number[] = [];
  for (const a of divisors(n)) {
    const b = n / a;
    if (a > b) continue;
    if (gcd(a, b) !== 1) continue;
    out.push(g * (a + b));
  }
  return out.sort((p, q) => p - q);
}

/** 서로소인 쌍을 지면 글자로 — `\left(1,\ 60\right)`. */
function pairTex(a: number, b: number): string {
  return `\\left(${a},\\ ${b}\\right)`;
}

const PRIME_POWERS: readonly (readonly number[])[] = [
  [2, 4, 8],
  [3, 9],
  [5, 25],
  [7],
  [11],
  [13],
];

const GCD_LCM_SUMS: TypeEntry[] = [
  defType(
    BOOK1,
    MINOR_GCD,
    "32T",
    "최대공약수와 최소공배수만 주어질 때 두 수의 합이 될 수 있는 값",
    SEC.활용,
    "심화상",
    (rng): Body =>
      attempt(600, (): Body | null => {
        const g = intBetween(rng, 2, 9);
        // 서로 다른 소인수 **셋** — 그래야 서로소인 쌍이 정확히 넷이다.
        const idx: number[] = [];
        while (idx.length < 3) {
          const i = intBetween(rng, 0, PRIME_POWERS.length - 1);
          if (!idx.includes(i)) idx.push(i);
        }
        const powers = idx.map((i) => pick(rng, PRIME_POWERS[i]!));
        // 🔴 **$n$ 이 무제곱이면 「서로소」 조건이 장식이 된다.** 지수가 전부 $1$ 이면
        //    곱이 $n$ 인 **모든** 쌍이 저절로 서로소라, 그 조건을 안 읽어도 답이 같다.
        //    첫 판이 그랬다 — 판정기가 「굳힘 조건을 지운 답」이 **54.2%** 로 맞는다고
        //    찍어서야 드러났다(초6 이 물린 ㉠ 과 같은 부류: 정보는 있고 선택력이 0).
        //    소인수 하나는 반드시 제곱 이상이어야 서로소가 실제로 거른다.
        if (powers.every((p, i) => p === PRIME_POWERS[idx[i]!]![0]))
          return null;
        const n = powers.reduce((p, q) => p * q, 1);
        const l = g * n;
        if (l > 2400) return null; // 지면에 다섯 자리 수를 안 쓴다
        if (n < 30) return null; // 너무 작으면 쌍이 눈에 다 보인다
        const sums = coprimePairSums(g, n);
        if (sums.length !== 4) return null;
        if (new Set(sums).size !== 4) return null; // 값이 겹치면 「모든 수」가 아니다
        const x = sums.reduce((p, q) => p + q, 0);
        // 쌍을 지면 차례대로 — 작은 쪽을 앞에 둔다.
        const pairs = divisors(n)
          .filter((a) => a <= n / a && gcd(a, n / a) === 1)
          .map((a) => [a, n / a] as const);
        const lines = pairs.map(
          ([a, b]) =>
            `$${pairTex(a, b)}$일 때 $A+B=${g}\\times\\left(${a}+${b}\\right)=${g * (a + b)}$`,
        );
        return {
          content: `두 자연수 $A$, $B$의 최대공약수가 $${g}$이고 최소공배수가 $${l}$이다. $A+B$의 값이 될 수 있는 모든 수의 합을 구하시오.`,
          answer: `$${x}$`,
          solution: [
            `최대공약수가 $${g}$이므로 $A=${g}\\times a$, $B=${g}\\times b$ ($a$, $b$는 서로소)로 놓을 수 있다.`,
            `최소공배수는 $${g}\\times a\\times b$이므로 $${g}\\times a\\times b=${l}$에서 $a\\times b=${n}$이다.`,
            `$${n}=${factorTex(n)}$이고 $a$, $b$는 서로소이므로 같은 소인수를 나누어 가질 수 없다. 곧 $${factorTex(n)}$의 각 소인수의 거듭제곱을 통째로 한쪽에 몰아주어야 하므로 $\\left(a,\\ b\\right)$는 ${pairs
              .map(([a, b]) => `$${pairTex(a, b)}$`)
              .join(", ")}의 $4$가지이다.`,
            `각 경우마다 $A+B$를 구하면 ${lines.join(", ")}이다.`,
            `따라서 $A+B$의 값이 될 수 있는 모든 수의 합은 $${sums.join("+")}=${x}$이다.`,
          ].join("\n"),
          facts: {
            x,
            g,
            l,
            n,
            s1: sums[0]!,
            s2: sums[1]!,
            s3: sums[2]!,
            s4: sums[3]!,
          },
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 94T  비로 접어 굳힌 값을 **해로 놓고 상수를 역산**  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 **저쪽 `심화(중)` 실물의 꼴을 그대로 옮긴 것이다**
 * (`matholic-mid-scan.md` §4.1 — 중1 `일차방정식의 풀이` 여섯이 **한 가지 꼴**이었다):
 *
 * ```
 * 문자가 둘~셋인데 값이 안 굳는다
 *   → 비(比)가 그 문자들을 한 매개변수로 접는다
 *   → 접히면 물어본 식의 값이 하나로 굳는다
 *   → 그 값을 다시 «x 에 대한 일차방정식의 해»로 놓고 상수를 역산한다
 * ```
 *
 * $a$, $b$, $c$ 는 **끝까지 안 굳는다**(무수히 많다). 굳는 것은 물어본 **식의 값**
 * 뿐이고, 그것을 굳히는 것은 「비를 한 문자로 놓으면 그 문자가 약분된다」는
 * 이 소단원의 성질이다(같은 소단원 응용 `14` 가 비례식을 쓰는 자리다).
 *
 * **반증 ⑥(순방향으로만 적용해 답이 나오면 중·상이 아니다)**: 여기서는 안 나온다.
 * 해가 주어지고 **상수**를 되찾아야 하므로 사슬을 거꾸로 밟는다.
 */
export function ratioValue(
  r: readonly [number, number, number],
  co: readonly [number, number, number],
): number | null {
  const num = co[0] * r[0] + co[1] * r[1] + co[2] * r[2];
  if (num % r[1] !== 0) return null;
  return num / r[1];
}

/** 해가 $k$ 인 $px+A=qx+s$ 의 상수 $A$. */
export function constantForRoot(
  p: number,
  q: number,
  s: number,
  k: number,
): number {
  return s + (q - p) * k;
}

const RATIO_ROOT: TypeEntry[] = [
  defType(
    BOOK1,
    MINOR_EQ,
    "94T",
    "비례식으로 정해지는 식의 값이 해일 때 상수 구하기",
    SEC.일차방정식,
    "심화중",
    (rng): Body =>
      attempt(800, (): Body | null => {
        const r: [number, number, number] = [
          intBetween(rng, 2, 7),
          intBetween(rng, 2, 7),
          intBetween(rng, 2, 7),
        ];
        // 비가 더 줄어들면 지면이 「가장 간단한 자연수의 비」가 아니다.
        if (gcd(gcd(r[0], r[1]), r[2]) !== 1) return null;
        if (r[0] === r[1] && r[1] === r[2]) return null;
        const co: [number, number, number] = [
          intBetween(rng, 2, 5),
          intBetween(rng, -4, 4),
          -intBetween(rng, 2, 5),
        ];
        if (co[1] === 0) return null; // 계수 0은 지면에서 항이 사라진다
        if (Math.abs(co[1]) === 1) return null; // `1b` 를 안 쓴다
        const k = ratioValue(r, co);
        if (k === null || k === 0) return null;
        if (Math.abs(k) > 9) return null;
        // 방정식 — 양변에 $x$항이 있고 계수 $\pm1$ 을 안 쓴다.
        const p = intBetween(rng, 2, 8);
        const q = -intBetween(rng, 2, 8);
        const s = intBetween(rng, -12, 12);
        if (s === 0) return null;
        const A = constantForRoot(p, q, s, k);
        if (A === 0) return null;
        if (Math.abs(A) > 99) return null;
        const numerator = `${co[0]}a${sterm(co[1], "b")}${sterm(co[2], "c")}`;
        const numValue = co[0] * r[0] + co[1] * r[1] + co[2] * r[2];
        // 🔴 방정식은 **글자 $A$ 로** 찍는다. 값을 찍으면 상수가 이미 정해져
        //    「상수 $A$」가 발문 어디에도 없는 문항이 되어 **풀 수가 없다**
        //    — 값 검산은 답이 맞으니 통과한다(첫 판이 실제로 그랬다.
        //    `m1Types10.ts` 의 `91` 이 같은 자리에 주석을 남겨 두었는데도 밟았다).
        const eqTex = `${p}x+A=${q}x${sterm(s, "")}`;
        return {
          content: `$0$이 아닌 세 수 $a$, $b$, $c$에 대하여 $a:b:c=${r[0]}:${r[1]}:${r[2]}$이다. $\\dfrac{${numerator}}{b}$의 값이 $x$에 대한 일차방정식 $${eqTex}$의 해일 때, 상수 $A$의 값을 구하시오.`,
          answer: `$${A}$`,
          solution: [
            `$a:b:c=${r[0]}:${r[1]}:${r[2]}$이므로 $0$이 아닌 수 $t$에 대하여 $a=${r[0]}t$, $b=${r[1]}t$, $c=${r[2]}t$로 놓을 수 있다.`,
            `이것을 대입하면 분자는 $${co[0]}\\times${r[0]}t${sterm(co[1], "")}\\times${r[1]}t${sterm(co[2], "")}\\times${r[2]}t=${numValue}t$이고 분모는 $${r[1]}t$이다.`,
            `$t$가 약분되므로 $\\dfrac{${numerator}}{b}=\\dfrac{${numValue}t}{${r[1]}t}=\\dfrac{${numValue}}{${r[1]}}=${k}$이다. 곧 $a$, $b$, $c$의 값이 하나로 정해지지 않아도 이 식의 값은 $${k}$${euroRo(k)} 정해진다.`,
            `$x=${k}$${iGa(k)} 방정식 $${eqTex}$의 해이므로 대입하면 $${p}\\times${parenNeg(k)}+A=${q}\\times${parenNeg(k)}${sterm(s, "")}$이다.`,
            `즉 $${p * k}+A=${q * k + s}$이다.`,
            `따라서 $A=${q * k + s}-${parenNeg(p * k)}=${A}$이다.`,
          ].join("\n"),
          facts: {
            x: A,
            k,
            r1: r[0],
            r2: r[1],
            r3: r[2],
            c1: co[0],
            c2: co[1],
            c3: co[2],
            p,
            q,
            s,
          },
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 95T  두 방정식의 해가 **모두 자연수**가 되는 $a$ 를 전부  (심화상)
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 **저쪽 `고난도` 실물의 첫째 꼴이다** (`matholic-mid-scan.md` §4.2 —
 * 「조건이 **두 번** 걸려 매개변수로 접은 뒤에도 자연수 조건이 다시 걸러야 한다」).
 *
 * 첫째 조건이 후보를 «$M$의 약수»로 좁히는데, 둘째 조건은 그 후보들을 **성질로
 * 걸러 주지 않는다** — $a+t$ 가 $N$의 약수인지는 후보마다 **직접 나누어 봐야**
 * 안다. 그래서 후보를 다 만들어 하나씩 견주는 길밖에 없다(D-115 ⑾ 의 «상»).
 *
 * 이 소단원의 심화하 `17` 은 「해가 음의 정수가 되도록 하는 자연수 $a$의 **개수**」인데
 * 해설이 「$12-a$가 $3$의 배수이면서 $3$ 이상」이라는 **성질 한 줄로** 후보를
 * 걸러 낸다 — 끝까지 계산하지 않는다. 그것이 «중»의 길이고 이쪽이 «상»의 길이다.
 *
 * ## 살아남는 자리가 **띄엄띄엄**이어야 한다
 *
 * 살아남는 후보가 약수 목록의 **연속한 꼬리**면(예: 큰 쪽 셋), 학생이 둘째 조건을
 * 안 읽고 「큰 것부터 몇 개」로 찍을 수 있다 — 초6 이 물린 ㉠ 과 같은 병이다.
 * 그래서 **살아남은 것 사이에 죽은 것이 하나 이상 끼도록** 불변식을 건다.
 */
export function naturalRootCandidates(
  m: number,
  t: number,
  n: number,
): { all: number[]; kept: number[] } {
  const all = divisors(m);
  const kept = all.filter((a) => n % (a + t) === 0);
  return { all, kept };
}

/** 살아남은 자리가 목록에서 **연속**인가 — 연속이면 찍기가 통한다. */
export function survivorsAreContiguous(all: number[], kept: number[]): boolean {
  if (kept.length < 2) return true;
  const idx = kept.map((v) => all.indexOf(v));
  return idx[idx.length - 1]! - idx[0]! === idx.length - 1;
}

const TWO_CONDITION_NATURAL: TypeEntry[] = [
  defType(
    BOOK1,
    MINOR_EQ,
    "95T",
    "두 일차방정식의 해가 모두 자연수가 되는 계수 구하기",
    SEC.해의응용,
    "심화상",
    (rng): Body =>
      attempt(2000, (): Body | null => {
        const m = pick(rng, [24, 36, 40, 48, 60, 72] as const);
        const t = intBetween(rng, 1, 6);
        const n = intBetween(rng, 30, 260);
        const { all, kept } = naturalRootCandidates(m, t, n);
        if (all.length > 10) return null; // 해설이 지면에서 너무 길어진다
        if (kept.length < 2 || kept.length > 4) return null;
        if (all.length - kept.length < 3) return null; // 둘째 조건이 실제로 걸러야 한다
        if (survivorsAreContiguous(all, kept)) return null;
        const nDiv = divisors(n);
        if (nDiv.length > 8) return null; // 같은 이유
        const p = intBetween(rng, 2, 30);
        const rhs = m - p;
        if (rhs <= 0) return null;
        const eq1 = `ax-${p}=${rhs}`; // 상수항을 옮기면 $ax=m$
        const x = kept.reduce((s, v) => s + v, 0);
        const plus = all.map((a) => a + t);
        const keptPlus = kept.map((a) => a + t);
        // 살아남은 것만 «왜 사는가»를 적으면 죽은 것은 근거가 없어진다. 그래서
        // **후보마다 $a+t$ 를 전부 찍고**, 그 값들이 $n$의 약수 목록과 어디서
        // 만나는지를 보인다 — 중간 결과가 하나도 안 빠진다(D-116 ⑸).
        const detail = kept
          .map((a) => `$a=${a}$일 때 $x=${n}\\div${a + t}=${n / (a + t)}$`)
          .join(", ");
        return {
          content: `자연수 $a$에 대하여 $x$에 대한 두 일차방정식 $${eq1}$, $\\left(a+${t}\\right)x=${n}$의 해가 모두 자연수가 되도록 하는 $a$의 값을 모두 구하여 그 합을 구하시오.`,
          answer: `$${x}$`,
          solution: [
            `첫째 방정식에서 $-${p}$${eulReul(p)} 우변으로 이항하면 $ax=${rhs}+${p}=${m}$이므로 해는 $x=\\dfrac{${m}}{a}$이다.`,
            `이 해가 자연수이려면 $a$는 $${m}$의 약수이어야 한다. $${m}=${factorTex(m)}$이므로 그 약수는 ${listTex(all)}의 $${all.length}$개이다.`,
            `둘째 방정식의 해는 $x=\\dfrac{${n}}{a+${t}}$이므로 이것도 자연수이려면 $a+${t}$${iGa(t)} $${n}$의 약수이어야 한다.`,
            `후보마다 $a+${t}$의 값을 차례로 구하면 ${listTex(plus)}이다.`,
            `한편 $${n}=${factorTex(n)}$의 약수는 ${listTex(nDiv)}이므로, 위의 값 중 약수인 것은 ${listTex(keptPlus)}뿐이다.`,
            `곧 ${detail}${eulReul(n / (keptPlus[keptPlus.length - 1] ?? 1))} 얻어 둘째 방정식의 해도 자연수가 된다.`,
            `따라서 조건을 모두 만족시키는 $a$는 ${listTex(kept)}의 $${kept.length}$개이고, 그 합은 $${kept.join("+")}=${x}$이다.`,
          ].join("\n"),
          facts: { x, m, t, n, p, kept: kept.length, all: all.length },
        };
      }),
  ),
];

/**
 * 중1 상위 갈래 명부 — `generate.ts` 의 `ALL` 이 이것 하나만 spread 한다.
 *
 * 갈래별 몫: **심화중 2 · 심화상 2**. 수를 목표로 잡지 않았다 — 세울 수 있는
 * 자리에만 세우고, 못 세운 자리는 `tracks/reports/mid-top-m1.md` 에 **왜 못 세우는지**
 * 근거와 함께 비워 두었다(D-115 ⑹ 「비우는 단위는 학년이 아니라 소단원」).
 */
export const M1_TOP: TypeEntry[] = [
  ...SAME_REMAINDER,
  ...GCD_LCM_SUMS,
  ...RATIO_ROOT,
  ...TWO_CONDITION_NATURAL,
];
