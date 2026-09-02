/**
 * 중1 **2차 확대 갈래** — `심화중`·`심화상` 넷을 더한다 (D-116, 2026-09-02).
 *
 * ## 왜 또 새 파일인가
 *
 * `m1Top.ts` 는 1차 물결(`31T`·`32T`·`94T`·`95T`) 넷을 **개수로 얼린** 시험을 달고 있다
 * (`middleM1Top.test.ts` 의 `expect(M1_TOP.length).toBe(4)`). 거기에 유형을 더하면 그
 * 가드가 빨개지고, 초록으로 되돌리는 유일한 길이 **가드를 무르는 것**이 된다 —
 * `m1Types10.ts`·`midSupB.ts`·`m1Top.ts` 가 차례로 선 자리다. 그리고 오르카 다중
 * 세션이 같은 파일을 동시에 만지면 병합에서 부딪힌다(2026-08-23 「미커밋 새 파일이
 * 가장 약한 고리」). 새 파일 하나 + `generate.ts` **spread 한 줄**이면 그 둘을 다 피한다.
 *
 * 이 파일은 `m1Top.ts` 에서 `gcd` 하나만 **읽어 온다**. 최대공약수 규칙을 두 벌로
 * 두지 않기 위해서다(고치지 않는다 — 읽기만 한다).
 *
 * ## 무엇이 «중»이고 무엇이 «상»인가 — `m1Top.ts` 머리말의 그 자
 *
 * ```
 * 심화중  마디 하나가 안 굳고, **그 소단원의 개념**이 그것을 굳힌다.
 *         성질 하나가 후보를 «끝까지 계산하지 않고» 거른다.        (D-115 ⑾)
 * 심화상  성질로 못 굳혀 후보를 **다 만들어 견줘야** 한다.
 * ```
 *
 * | 키 | 갈래 | 안 굳는 마디 | 무엇이 굳히나 | 같은 소단원 `심화하` 와 무엇이 다른가 |
 * |---|---|---|---|---|
 * | `소인수분해\|41U` | **심화중** | $3^{100}$·$7^{50}$ 의 **값** — 수십 자리라 발문도 안 주고 끝까지 계산할 수 없다 | 「거듭제곱의 일의 자리는 네 개마다 되풀이된다」는 이 소단원의 성질. 지수를 $4$ 로 나눈 **나머지**만 보면 주기표의 한 자리가 정해진다 — 값을 한 번도 계산하지 않는다 | `17`(거듭제곱의 대소)은 $a=3^{4}$, $b=5^{2}$, $c=2^{2}$ 를 **끝까지 계산해**($81$·$25$·$4$ 를 해설이 다 적는다) 차를 구한다. `41U` 는 **계산이 불가능한 크기**라 되풀이 성질 말고는 길이 없다 |
 * | `소인수분해\|42U` | **심화상** | 그 자연수 자체 — 밑도 지수도 개수도 안 준다 | 굳지 **않는다**. $10$ 을 (지수$+1$)들의 곱으로 쪼개면 꼴이 $p^{9}$·$p^{4}q$ 둘로 좁혀지지만, **어느 소수를 넣을지는 어떤 성질도 못 고른다** — $p$ 를 바꿔 가며 후보를 다 만들어 상한 안인지 하나씩 견줘야 한다 | `10`(약수의 개수가 주어질 때 □ 안의 자연수)은 **밑이 이미 주어져** □ 에 $1$ 부터 차례로 넣기만 하면 되고 답도 하나다. `42U` 는 **훑을 목록 자체를 $10$ 의 곱셈 분해에서 만들어 내야** 하고 답이 여럿이다 |
 * | `문자의 사용과 식의 계산\|43U` | **심화중** | $a$·$b$ 각각 (무수히 많다 — $a=\frac13,b=\frac12$ 도 $a=1,b=\frac14$ 도 $\frac1a+\frac1b=5$ 를 만족한다) | 「분자와 분모를 $ab$ 로 나누면 $\frac1a+\frac1b$ 덩어리만 남는다」는 이 소단원의 **대입** 성질. $(a,b)$ 후보를 하나도 만들지 않고 **물어본 식의 값만** 굳는다 | `51`(식의 값을 이용하여 다른 식의 값)은 $2x-5y=9$ 일 때 $4x-10y+3$ — 덩어리가 **이미 눈에 보이고** $2$ 배만 하면 된다. `43U` 는 덩어리가 안 보이고 분자·분모를 $ab$ 로 나누어 **만들어 내야** 한다 |
 * | `정수와 유리수의 계산\|44U` | **심화상** | 어느 세 수를 뽑을 것인가 — 발문이 안 준다 | 굳지 **않는다**. 분모가 서로 달라 「이 셋이면 정수」를 미리 알려 주는 성질이 없다 — 열 가지를 **다 만들어** 통분해 하나씩 견줘야 한다 | `11`(덧셈과 뺄셈의 활용 ⑵)은 세 상자의 합이 같다는 **한 식에서 곧장 역산**해 $a$, $b$ 를 차례로 얻는다 — 견줄 후보가 하나도 없다. 이웃 소단원 `14`(네 수 중 세 수를 뽑아 곱하기)는 형식이 닮았지만 **«음수의 개수와 절댓값»이라는 성질이 후보를 안 만들고도 극값을 고른다** — `44U` 에는 그 성질이 없다 |
 *
 * ## 🔴 초등이 네 물결에 걸쳐 물린 함정 셋 — 여기서 어떻게 피했나
 *
 * ㉠ **창을 한쪽 끝만 주면 굳힘이 장식이 된다.** 「살아남는 후보가 언제나 목록의
 *    같은 자리」면 굳힘 조건은 «어느 후보인가»를 한 번도 안 고른다.
 *    → `41U` 의 후보 목록은 «주기의 네 자리»다. 지수가 늘 $4$ 의 배수면 답이 언제나
 *      넷째 자리라 굳힘이 «어느 자리인가»를 한 번도 안 고른다. 그래서 두 나머지를
 *      **서로 다르게 강제**하고, 씨앗을 가로질러 **네 자리가 다 나오는지**를 시험이
 *      따로 센다(`41U — 주기의 네 자리가 씨앗을 가로질러 다 나온다`).
 *    → `42U` 는 답이 **후보 전부의 합**이다. 후보는 넷~일곱인데 저마다 $48$ 이상이라
 *      합이 상한을 넘는다 — 목록의 어느 자리도 답이 **될 수 없다**(시험이 그것을 센다).
 *      그래서 「가장 큰 수」·「가장 작은 수」로는 **절대 묻지 않는다**(묻는 순간 ㉠ 이 태어난다).
 *    → `44U` 도 답이 살아남은 경우들의 합이다. 더해서, 살아남는 조합이 어느 한 수를
 *      **늘 배제**하면 그 수가 장식이 되고 **늘 포함**하면 열 가지를 다 보는 뜻이 옅어지므로,
 *      둘 다 불변식으로 막는다(`allNumbersUsed`·`noCommonNumber`). 그리고 살아남는
 *      **자리**가 씨앗을 가로질러 갈리는지를 시험이 센다.
 *    → `43U` 는 후보 목록이 **아예 없다**(값이 하나로 굳는다). 「축이 없다」와
 *      「축이 초록이다」는 다른 말이므로 시험이 이 갈래의 ㉠ 을 **«해당 없음»으로
 *      따로 찍는다** — 「$(a,b)$ 를 두 벌 잡아도 값이 같다」를 실제로 재서 보인다.
 *
 * ㉡ **「굳힘이 항등식」** — 굳힘 조건을 흔들어도 답이 그대로면 그것은 굳힘이 아니라
 *    장식이다. 넷 다 굳힘을 **인자로 받는 순수 함수**로 뽑아 두었다:
 *    `lastDigitOfPower` · `tenDivisorNumbers` · `valueFromReciprocalSum` · `integerTriples`.
 *    ⚠️ 그 자가 «아니오»를 낼 수 있는지 보이려고 **음성 대조**를 같이 둔다 —
 *      밑 $5$·$6$(주기 $1$)과 $4$·$9$(주기 $2$)는 지수를 흔들어도 답이 그대로이고,
 *      $p=2,q=-1,r=2,u=1$ 이면 $pu+qr=0$ 이라 $s$ 와 무관하게 값이 $1$ 이며,
 *      상한이 $162$ 아래면 「밑을 $2$ 로만 본 합」이 참 답과 **같아진다**. 음성 대조가
 *      없으면 그 가드의 «0» 이 «깨끗»인지 «못 셈»인지 안 갈린다(2026-08-21).
 *
 * ㉢ **갈래끼리 겹침** — 새 갈래가 그 소단원의 `심화하`·`응용` 과 한 시험지에 같이
 *    실린다. 위 표의 마지막 칸이 쌍마다 «푸는 절차가 어디서 갈리는가»를 적은 것이다.
 *    🔴 **정직하게 적어 둘 것 하나**: `43U`(역수의 합으로 접기)는 `m1Top.ts` 의
 *    `94T`(비례식으로 접기)와 «문자가 안 굳고 식의 값만 굳는다»는 **얼개를 공유**하고
 *    둘 다 3단원이라 한 시험지에 실릴 수 있다. 접는 기계가 다르지만(비례식 ↔ 역수의 합)
 *    이 사실을 숨기지 않는다. 소단원이 다르므로(`문자의 사용과 식의 값` ↔
 *    `일차방정식의 풀이`) 진도 기반 범위에서는 대개 갈린다.
 *
 * ## 번호 규약 — **`U` 접미사**
 *
 * `extensionNumberReason`(`src/__tests__/helpers/rpmCatalog.ts`)은 `숫자+영문 대문자
 * 한 글자` 를 「색인 번호와 절대 안 겹친다」로 통과시킨다. 중1에는 이미 `A`(색인 밖
 * 보강)와 `T`(1차 물결)가 쓰였으므로 2차 물결은 **`U`** 로 대를 통째로 가른다.
 *
 * ## 계약 (이웃 모듈과 한 벌 — `m1Top.ts` 머리말과 같다)
 *
 * 1. **정답을 먼저 뽑고 발문을 역산한다.**
 * 2. `facts.x` 가 정답이다.
 * 3. 숫자는 전부 `$...$` 안에 (`elementary/rules` `bareNumbers` 가드).
 * 4. `attempt` 가 다 떨어지면 **던진다** — 조용히 기본값을 내지 않는다.
 * 5. 그림이 없으므로 발문이 **지면을 가리키지 않는다**(`pointsAtFigure`).
 * 6. 🔴 **해설이 걸음을 건너뛰지 않는다** (D-116 ⑸). 후보를 견주는 갈래는
 *    **후보를 하나씩 적고 각각 왜 살고 죽는지**까지 적는다 — `42U` 는 $p$ 를 바꿔 가는
 *    갈래마다, `44U` 는 열 가지 조합마다 한 줄씩 적는다.
 */
import { intBetween, pick } from "../elementary/rng";

import { attempt, defType, pickDistinct, signed, type Body } from "./m1Shared";
// 최대공약수 규칙을 두 벌로 두지 않는다 — `m1Top.ts` 것을 **읽어만** 온다.
import { gcd } from "./m1Top";
import { eulReul, euroRo } from "./m2Josa";
import type { TypeEntry } from "./types";

const BOOK1 = "1-1";
const MINOR_FACTOR = "소인수분해";
const MINOR_CALC = "정수와 유리수의 계산";
const MINOR_EXPR = "문자의 사용과 식의 계산";

/** 우리 `Unit.section` 정확한 이름 (`prisma/seed-data/units.ts` 실측). */
const SEC = {
  거듭제곱: "소수와 거듭제곱",
  소인수분해: "소인수분해",
  식의값: "문자의 사용과 식의 값",
  덧뺄: "유리수의 덧셈과 뺄셈",
} as const;

// ── 소품 ────────────────────────────────────────────────────

/** 주격 조사 — `$41$이` · `$5$가`. 받침 판정은 `m2Josa` **한 곳**에서 온다. */
function iGa(n: number): "이" | "가" {
  return eulReul(n) === "을" ? "이" : "가";
}

/** 계수 $1$ 은 안 적는다 — `3a` · `ab`. (지면 냄새 자가 `1a` 를 잡는다.) */
function coefTerm(k: number, sym: string): string {
  return k === 1 ? sym : `${k}${sym}`;
}

/** 음수만 괄호를 씌운다 — `\left(-1\right)` · `3`. */
function parenNeg(n: number): string {
  return n < 0 ? `\\left(${n}\\right)` : `${n}`;
}

/** 목록을 `$1$, $2$, $3$` 꼴로. */
function listTex(xs: readonly number[]): string {
  return xs.map((v) => `$${v}$`).join(", ");
}

/**
 * 개수를 세는 우리말 수관형사 — `세 가지`·`네 가지`.
 *
 * ⚠️ **`$3$가지` 라고 쓰면 안 된다.** 조사 자(`josaMismatches`)는 수 뒤의 `가` 를
 * 주격 조사로 읽어 「$3$가 → $3$이」를 신고한다. 여기서 `가` 는 의존명사 「가지」의
 * 첫 글자라 그 신고는 **거짓 경보**인데, **거짓 경보는 가드를 끈다**(2026-08-20).
 * 자를 무르는 대신 지면에서 우리말 수관형사를 쓴다 — 셈말과 조사가 아예 안 만난다.
 */
function koreanCount(n: number): string {
  const words: Record<number, string> = { 3: "세", 4: "네", 5: "다섯" };
  const w = words[n];
  if (w === undefined) throw new Error(`koreanCount: 다루지 않는 수 ${n}`);
  return w;
}

// ═══════════════════════════════════════════════════════════
// 41U  지수가 큰 두 거듭제곱의 곱의 **일의 자리의 숫자**  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 **굳힘은 「거듭제곱의 일의 자리는 네 개마다 되풀이된다」 하나다.**
 *
 * $3^{100}$ 의 값은 수십 자리라 발문도 안 주고 끝까지 계산할 수도 없다 — 그것이 이
 * 유형의 «안 굳는 마디»다. 그 마디를 굳히는 것은 값이 아니라 **성질**이다: 지수를
 * $4$ 로 나눈 나머지만 보면 주기표의 한 자리가 정해진다. D-115 ⑾ 이 «중»이라 못 박은 길.
 *
 * ⚠️ 이 함수는 **표를 손으로 적지 않는다.** 어떤 한 자리 수를 거듭제곱해도 일의 자리의
 * 주기는 $4$ 의 약수이므로(직접 곱해 확인할 수 있다) `exp` 를 $1$~$4$ 로 접어 그대로
 * 곱한다. 손 표를 두면 밑이 늘 때 조용히 눈이 먼다.
 */
export function lastDigitOfPower(base: number, exp: number): number {
  if (!Number.isInteger(exp) || exp < 1) {
    throw new Error(
      `lastDigitOfPower: 지수는 1 이상의 정수여야 합니다 — ${exp}`,
    );
  }
  const folded = ((exp - 1) % 4) + 1;
  let d = 1;
  for (let i = 0; i < folded; i += 1) d = (d * base) % 10;
  return d;
}

/** 그 밑의 일의 자리 주기표 — 지수 $1$~$4$ 의 일의 자리 넷. */
export function unitDigitCycle(base: number): number[] {
  return [1, 2, 3, 4].map((e) => lastDigitOfPower(base, e));
}

/** 두 거듭제곱의 곱의 일의 자리. */
export function unitDigitOfProduct(
  b1: number,
  e1: number,
  b2: number,
  e2: number,
): number {
  return (lastDigitOfPower(b1, e1) * lastDigitOfPower(b2, e2)) % 10;
}

/**
 * 쓸 수 있는 밑의 쌍 — 주기가 **정확히 $4$** 인 $\{2,3,7,8\}$ 에서 고른다.
 *
 * 🔴 $2$–$8$ 은 **일부러 뺐다.** $8=2^{3}$ 이라 $2^{m}\times8^{n}=2^{m+3n}$ 으로
 * 합쳐지므로 되풀이 성질을 안 쓰고도 풀리는 샛길이 열린다. 주기가 $1$ 인 $5$·$6$ 과
 * $2$ 인 $4$·$9$ 도 같은 이유로 없다 — 그 밑에서는 지수를 흔들어도 답이 안 바뀐다
 * (그 사실 자체를 시험이 **음성 대조**로 쓴다).
 */
const UNIT_DIGIT_PAIRS = [
  [2, 3],
  [2, 7],
  [3, 7],
  [3, 8],
  [7, 8],
] as const;

const ORDINAL = ["첫째", "둘째", "셋째", "넷째"] as const;

/** 지수를 $4k+r$ 로 쓴 지면 글자 — $r=0$ 이면 `+0` 을 안 적는다. */
function fourSplitTex(exp: number): string {
  const r = exp % 4;
  const k = (exp - r) / 4;
  return r === 0 ? `4\\times${k}` : `4\\times${k}+${r}`;
}

const UNIT_DIGIT: TypeEntry[] = [
  defType(
    BOOK1,
    MINOR_FACTOR,
    "41U",
    "지수가 큰 두 거듭제곱의 곱의 일의 자리의 숫자",
    SEC.거듭제곱,
    "심화중",
    (rng): Body =>
      attempt(600, (): Body | null => {
        const pair = pick(rng, UNIT_DIGIT_PAIRS);
        const swap = rng() < 0.5;
        const b1 = swap ? pair[1] : pair[0];
        const b2 = swap ? pair[0] : pair[1];
        // 🔴 나머지를 **서로 다르게** 강제한다 — 같으면 주기표의 같은 자리만 쓰게 되어
        //    「어느 자리인가」를 고르는 일이 반쪽이 된다(㉠).
        const r1 = intBetween(rng, 0, 3);
        const r2 = intBetween(rng, 0, 3);
        if (r1 === r2) return null;
        const e1 = 4 * intBetween(rng, 12, 600) + r1;
        const e2 = 4 * intBetween(rng, 12, 600) + r2;
        if (e1 === e2) return null;
        const d1 = lastDigitOfPower(b1, e1);
        const d2 = lastDigitOfPower(b2, e2);
        const x = (d1 * d2) % 10;
        // ㉡ 굳힘이 항등식이면 안 된다 — 지수를 하나만 $1$ 늘려도 답이 달라져야 한다.
        //
        // 🔴 **변이 시험이 알려 준 것**: 지금 밑 넷에서는 이 두 줄이 **한 번도 안 걸린다.**
        //    수학적으로 그렇다 — 주기의 네 값은 서로 $5$ 로 나눈 나머지가 다르고
        //    ($\{2,4,8,6\}\to\{2,4,3,1\}$, $\{3,9,7,1\}\to\{3,4,2,1\}$) 상대 밑의 일의
        //    자리는 $5$ 의 배수가 아니므로 $(d_1-d_1')d_2$ 가 $10$ 의 배수가 될 수 없다.
        //    그래서 이 줄만 껐을 때는 시험이 **초록**이다(산출물이 안 바뀐다 — 「가드가
        //    아니다」가 아니라 「변이가 뜻을 안 바꾼다」이므로 판정하면 안 되는 자리다).
        //    반대로 밑 목록에 $5$·$6$ 을 넣으면 **이 줄이 그것을 막는다** — 둘을 **같이**
        //    껐을 때에야 시험이 빨개졌다. 두 가드가 서로 가리고 있었다(2026-08-25
        //    「조각이 죽었는지는 «하나씩 빼서» 못 잰다」). 그러므로 지우지 말 것.
        if (unitDigitOfProduct(b1, e1 + 1, b2, e2) === x) return null;
        if (unitDigitOfProduct(b1, e1, b2, e2 + 1) === x) return null;
        const cyc1 = unitDigitCycle(b1);
        const cyc2 = unitDigitCycle(b2);
        const pos1 = r1 === 0 ? 4 : r1;
        const pos2 = r2 === 0 ? 4 : r2;
        return {
          content: `$${b1}^{${e1}}\\times${b2}^{${e2}}$의 일의 자리의 숫자를 구하시오.`,
          answer: `$${x}$`,
          solution: [
            `$${b1}$의 거듭제곱의 일의 자리의 숫자는 ${listTex(cyc1)}의 네 개가 이 순서로 되풀이되고, $${b2}$의 거듭제곱의 일의 자리의 숫자는 ${listTex(cyc2)}의 네 개가 이 순서로 되풀이된다.`,
            `$${e1}=${fourSplitTex(e1)}$이므로 $${b1}^{${e1}}$의 일의 자리의 숫자는 되풀이되는 네 개 중 ${ORDINAL[pos1 - 1]}인 $${d1}$이다.`,
            `$${e2}=${fourSplitTex(e2)}$이므로 $${b2}^{${e2}}$의 일의 자리의 숫자는 되풀이되는 네 개 중 ${ORDINAL[pos2 - 1]}인 $${d2}$이다.`,
            `두 수의 곱의 일의 자리의 숫자는 각 수의 일의 자리의 숫자만 곱해서 구할 수 있다.`,
            `따라서 $${d1}\\times${d2}=${d1 * d2}$이므로 구하는 일의 자리의 숫자는 $${x}$이다.`,
          ].join("\n"),
          facts: { x, b1, e1, b2, e2, d1, d2, r1, r2 },
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 42U  약수의 개수가 $10$ 개인 범위 안의 자연수를 **모두**  (심화상)
// ═══════════════════════════════════════════════════════════

function primesUpTo(n: number): number[] {
  const top = Math.max(n, 2);
  const sieve = new Array<boolean>(top + 1).fill(true);
  sieve[0] = false;
  sieve[1] = false;
  for (let p = 2; p * p <= top; p += 1) {
    if (!sieve[p]) continue;
    for (let q = p * p; q <= top; q += p) sieve[q] = false;
  }
  const out: number[] = [];
  for (let i = 2; i <= top; i += 1) if (sieve[i]) out.push(i);
  return out;
}

/** $p^{4}\times q$ 갈래 하나 — 밑 $p$ 와 그때 쓸 수 있는 소수 $q$ 들. */
export type TenDivisorBranch = { p: number; p4: number; qs: number[] };

/**
 * $p^{4}\times q\le$ `limit` 인 갈래를 밑이 작은 것부터.
 *
 * `qs` 가 빈 갈래도 남긴다 — 해설이 「이 밑에서는 없다」를 적으려면 그 사실이 필요하다.
 */
export function tenDivisorBranches(limit: number): TenDivisorBranch[] {
  const primes = primesUpTo(limit);
  const out: TenDivisorBranch[] = [];
  for (const p of primes) {
    const p4 = p ** 4;
    if (p4 > limit) break;
    out.push({
      p,
      p4,
      qs: primes.filter((q) => q !== p && p4 * q <= limit),
    });
  }
  return out;
}

/** $p^{9}\le$ `limit` 인 수 — 우리 범위에서는 늘 비어 있고, 해설이 그렇게 적는다. */
export function ninthPowers(limit: number): number[] {
  const out: number[] = [];
  for (const p of primesUpTo(limit)) {
    const v = p ** 9;
    if (v > limit) break;
    out.push(v);
  }
  return out;
}

/**
 * 🔴 **여기서는 후보가 굳지 않는다.** 약수의 개수 $10$ 을 (지수$+1$)들의 곱으로 쪼개면
 * 꼴이 $p^{9}$ 와 $p^{4}q$ 둘로 좁혀지지만, **어느 소수를 넣을지는 어떤 성질도 못
 * 고른다** — $p=2$ 로 두고 $q=3,5,7,\dots$ 을, 다시 $p=3$ 으로 바꿔 가며 후보를 다
 * 만들어 상한 안인지 하나씩 견줘야 한다(D-115 ⑾ 의 «상»).
 *
 * ⚠️ **꼴로 만든다** — 「$1$부터 상한까지 약수를 세어 본다」로 짜면 시험의 검산과
 * 같은 길이 되어 동어반복이 된다. 시험은 그 무식한 길로 간다.
 */
export function tenDivisorNumbers(limit: number): number[] {
  const out = [...ninthPowers(limit)];
  for (const b of tenDivisorBranches(limit)) {
    for (const q of b.qs) out.push(b.p4 * q);
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

const TEN_DIVISORS: TypeEntry[] = [
  defType(
    BOOK1,
    MINOR_FACTOR,
    "42U",
    "약수의 개수가 주어질 때 범위 안의 자연수를 모두 구하기",
    SEC.소인수분해,
    "심화상",
    (rng): Body =>
      attempt(400, (): Body | null => {
        // 🔴 약수의 개수는 $10$ 으로 못 박는다. $10=10=2\times5$ 라 꼴이 **정확히 둘**이라
        //    열거가 지면에 담긴다 — $8$ 이나 $12$ 는 꼴이 셋~넷이라 후보가 폭발한다.
        const limit = intBetween(rng, 170, 280);
        const kept = tenDivisorNumbers(limit);
        if (kept.length < 4 || kept.length > 7) return null;
        const branches = tenDivisorBranches(limit);
        if (branches.length !== 2) return null; // $p=2$·$p=3$ 두 갈래
        const b2 = branches[0]!;
        const b3 = branches[1]!;
        if (b2.p !== 2 || b3.p !== 3) return null;
        if (b2.qs.length < 3) return null;
        // 해설이 「$p=3$이면 … 이때의 수는 …이다」를 적으므로 그 갈래가 비면 문장이 깨진다.
        if (b3.qs.length < 1) return null;
        // 해설이 「$p^{9}$ 꼴은 없다」고 명시하므로 그 말이 참인 범위만 쓴다 (D-116 ⑹).
        if (ninthPowers(limit).length !== 0) return null;
        const looseSum = b2.qs.reduce((s, q) => s + b2.p4 * q, 0);
        const x = kept.reduce((s, v) => s + v, 0);
        // 🔴 ㉡ 밑을 $2$ 로만 보아도 답이 같으면 「밑을 바꿔 가며 다 본다」가 장식이 된다.
        //    지금 상한 창(`170`~`280`)에서는 $162=2\times3^{4}$ 가 늘 들어와 이 줄이
        //    한 번도 안 걸린다. **그렇다고 장식은 아니다** — 변이 시험에서 창을
        //    `120`~`280` 으로 넓히자 이 줄이 상한 $120$~$161$ 판을 **혼자** 막았고,
        //    이 줄까지 껐을 때에야 검산기가 「후보가 전부 $16$ 의 배수」로 빨개졌다.
        //    창을 넓힐 사람은 그 사실을 알고 넓힐 것. 이 줄이 «아니오» 를 낼 수 있음은
        //    시험이 상한 $150$ 을 대 보아 따로 보인다(음성 대조).
        if (looseSum === x) return null;
        // ㉠ 답이 **후보 전부의 합**이라 목록의 어느 자리도 답이 될 수 없다.
        if (kept.includes(x)) return null;
        const nextP = primesUpTo(limit).find((p) => p ** 4 > limit);
        if (nextP === undefined) return null;
        const branchLine = (b: TenDivisorBranch): string => {
          const values = b.qs.map((q) => b.p4 * q);
          const tail = b.qs.length === 1 ? "뿐이고" : "이고";
          return `$p=${b.p}$이면 $${b.p}^{4}=${b.p4}$이므로 $${b.p4}\\times q\\le${limit}$${eulReul(limit)} 만족시키는 소수 $q$는 ${listTex(b.qs)}${tail}, 이때의 수는 ${listTex(values)}이다.`;
        };
        return {
          content: `약수의 개수가 $10$개인 $${limit}$ 이하의 자연수를 모두 찾아 그 합을 구하시오.`,
          answer: `$${x}$`,
          solution: [
            `자연수를 소인수분해했을 때 약수의 개수는 각 소인수의 지수에 $1$을 더하여 모두 곱한 것과 같다.`,
            `$10$을 자연수의 곱으로 나타내면 $10$과 $2\\times5$뿐이므로 구하는 수는 $p^{9}$ 꼴이거나 $p^{4}\\times q$ 꼴이다. (단, $p$, $q$는 서로 다른 소수)`,
            `$p^{9}$ 꼴에서 가장 작은 수는 $2^{9}=512$인데 이미 $${limit}$보다 크므로 이런 수는 없다.`,
            `$p^{4}\\times q$ 꼴은 밑 $p$를 작은 소수부터 차례로 바꾸어 가며 모두 찾는다.`,
            branchLine(b2),
            branchLine(b3),
            `$p=${nextP}$이면 $${nextP}^{4}=${nextP ** 4}$${iGa(nextP ** 4)} 이미 $${limit}$보다 크므로 더 이상 없다.`,
            `따라서 조건을 만족시키는 수는 ${listTex(kept)}의 $${kept.length}$개이고, 그 합은 $${kept.join("+")}=${x}$이다.`,
          ].join("\n"),
          facts: {
            x,
            limit,
            count: kept.length,
            loose: looseSum,
            q2: b2.qs.length,
            q3: b3.qs.length,
          },
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 43U  역수의 합이 주어질 때 분수식의 값  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 **굳는 것은 $a$·$b$ 가 아니라 물어본 «식의 값»이다.**
 *
 * $\dfrac{pa-q\,ab+pb}{ra+u\,ab+rb}$ 의 분자와 분모를 $ab$ 로 나누면
 * $\dfrac{p\left(\frac1a+\frac1b\right)-q}{r\left(\frac1a+\frac1b\right)+u}$ 가 되어
 * $s=\frac1a+\frac1b$ 덩어리만 남는다. $(a,b)$ 는 끝까지 안 굳는다(무수히 많다).
 *
 * ⚠️ **$s$ 를 흔들었을 때 값이 달라지는가**가 이 유형의 ㉡ 이다. 기울기가
 * $\dfrac{pu+qr}{(rs+u)^{2}}$ 이라 계수를 다 양수로 두면 **늘 초록**인데,
 * 늘 초록인 가드는 아무것도 못 잰다 — 그래서 시험이 $pu+qr=0$ 인 계수
 * ($p=2$, $q=-1$, $r=2$, $u=1$)를 **음성 대조**로 넣어 그때 값이 $s$ 와 무관해지는 것을
 * 확인한다. 그 대조가 없으면 이 함수의 «초록»이 «깨끗»인지 «못 셈»인지 안 갈린다.
 *
 * 나누어떨어지지 않으면 `null` — 조용히 소수를 내지 않는다.
 */
export function valueFromReciprocalSum(
  s: number,
  p: number,
  q: number,
  r: number,
  u: number,
): number | null {
  const den = r * s + u;
  if (den === 0) return null;
  const numerator = p * s - q;
  if (numerator % den !== 0) return null;
  return numerator / den;
}

const RECIPROCAL_SUM: TypeEntry[] = [
  defType(
    BOOK1,
    MINOR_EXPR,
    "43U",
    "역수의 합이 주어질 때 분수식의 값 구하기",
    SEC.식의값,
    "심화중",
    (rng): Body =>
      attempt(3000, (): Body | null => {
        // 정답을 **먼저** 뽑고 계수를 역산한다 (계약 ⑴).
        const x = intBetween(rng, 2, 7);
        const s = intBetween(rng, 2, 9);
        const p = intBetween(rng, 2, 9);
        const r = intBetween(rng, 1, 9);
        const u = intBetween(rng, 1, 9);
        const q = p * s - x * (r * s + u);
        if (q < 1 || q > 9) return null;
        if (valueFromReciprocalSum(s, p, q, r, u) !== x) return null;
        // ㉡ 굳힘이 항등식이면 안 된다 — 주어진 값 $s$ 를 흔들면 답이 달라져야 한다.
        if (p * u + q * r === 0) return null;
        if (valueFromReciprocalSum(s + 1, p, q, r, u) === x) return null;
        const numTex = `${coefTerm(p, "a")}-${coefTerm(q, "ab")}+${coefTerm(p, "b")}`;
        const denTex = `${coefTerm(r, "a")}+${coefTerm(u, "ab")}+${coefTerm(r, "b")}`;
        const numValue = p * s - q;
        const denValue = r * s + u;
        // $r=1$ 이면 `1\left(...\right)` 을 안 적는다 — 지면이 지저분해진다.
        const rFold = r === 1 ? "" : `${r}`;
        const rMul = r === 1 ? `${s}` : `${r}\\times${s}`;
        return {
          content: `$0$이 아닌 두 수 $a$, $b$에 대하여 $\\dfrac{1}{a}+\\dfrac{1}{b}=${s}$일 때, $\\dfrac{${numTex}}{${denTex}}$의 값을 구하시오.`,
          answer: `$${x}$`,
          solution: [
            `$a$, $b$가 $0$이 아니므로 $ab\\ne0$이고, 분자와 분모를 각각 $ab$로 나누어도 그 값은 변하지 않는다.`,
            `분자를 $ab$로 나누면 $\\dfrac{${coefTerm(p, "a")}}{ab}-\\dfrac{${coefTerm(q, "ab")}}{ab}+\\dfrac{${coefTerm(p, "b")}}{ab}=\\dfrac{${p}}{b}-${q}+\\dfrac{${p}}{a}=${p}\\left(\\dfrac{1}{a}+\\dfrac{1}{b}\\right)-${q}$이다.`,
            `$\\dfrac{1}{a}+\\dfrac{1}{b}=${s}$이므로 분자의 값은 $${p}\\times${s}-${q}=${numValue}$이다.`,
            `같은 방법으로 분모를 $ab$로 나누면 $\\dfrac{${coefTerm(r, "a")}}{ab}+\\dfrac{${coefTerm(u, "ab")}}{ab}+\\dfrac{${coefTerm(r, "b")}}{ab}=\\dfrac{${r}}{b}+${u}+\\dfrac{${r}}{a}=${rFold}\\left(\\dfrac{1}{a}+\\dfrac{1}{b}\\right)+${u}$이므로 분모의 값은 $${rMul}+${u}=${denValue}$이다.`,
            `$a$, $b$의 값은 하나로 정해지지 않지만 두 수의 역수의 합이 주어졌으므로 구하는 식의 값은 하나로 정해진다.`,
            `따라서 구하는 값은 $\\dfrac{${numValue}}{${denValue}}=${x}$이다.`,
          ].join("\n"),
          facts: { x, s, p, q, r, u, num: numValue, den: denValue },
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 44U  다섯 유리수 중 세 수의 합이 **정수**가 되는 경우  (심화상)
// ═══════════════════════════════════════════════════════════

/** 다섯 자리에서 세 자리를 뽑는 열 가지 — 자리 번호는 이 순서로 고정이다. */
export const TRIPLES: readonly (readonly [number, number, number])[] = (() => {
  const out: (readonly [number, number, number])[] = [];
  for (let i = 0; i < 5; i += 1) {
    for (let j = i + 1; j < 5; j += 1) {
      for (let k = j + 1; k < 5; k += 1) out.push([i, j, k]);
    }
  }
  return out;
})();

/**
 * 🔴 **여기서는 후보가 굳지 않는다.** 분모가 서로 달라 「이 셋이면 정수」를 미리
 * 알려 주는 성질이 없다 — 열 가지를 **다 만들어** 통분해 하나씩 견줘야 한다.
 *
 * 공통분모 `L` 로 통분한 분자 다섯을 받아, 분자 세 개의 합이 $L$ 의 배수인 자리와
 * 그때의 정수를 낸다. 굳힘 조건(「합이 정수」)을 **인자가 아니라 이 함수 자체**가
 * 들고 있으므로, 시험은 이 함수를 안 쓰는 길(약분된 분수를 유리수로 직접 더하기)로
 * 검산한다.
 */
export function integerTriples(
  numerators: readonly number[],
  L: number,
): { at: number; sum: number }[] {
  const out: { at: number; sum: number }[] = [];
  TRIPLES.forEach((t, at) => {
    const s = numerators[t[0]]! + numerators[t[1]]! + numerators[t[2]]!;
    if (s % L !== 0) return;
    out.push({ at, sum: s / L });
  });
  return out;
}

/**
 * 굳힘 조건을 **지운** 답 — 열 가지가 다 살았다면 얼마인가(㉡ 대조용).
 *
 * ⚠️ **분자를 먼저 다 더하고 마지막에 한 번만 나눈다.** 처음엔 조합마다 나눠 더했는데,
 * 참값이 정수인 판에서 부동소수 오차가 쌓여 `5.000000000000001` 이 나왔다. 그러면
 * 생성기의 `=== x` 가 **거짓**이 되어 「조건을 지워도 답이 같은」 판이 그대로 통과한다 —
 * 검산기는 허용오차로 보므로 거기서만 빨개졌다. 가드가 못 세는 자리였고, 220판
 * 값 검산이 그것을 잡았다.
 */
export function allTriplesSum(
  numerators: readonly number[],
  L: number,
): number {
  let total = 0;
  for (const t of TRIPLES) {
    total += numerators[t[0]]! + numerators[t[1]]! + numerators[t[2]]!;
  }
  return total / L;
}

/** 다섯 수가 **모두** 어느 살아남은 조합엔가 쓰이는가 — 안 쓰이면 그 수는 장식이다. */
export function allNumbersUsed(kept: readonly { at: number }[]): boolean {
  const used = new Set<number>();
  for (const k of kept) for (const i of TRIPLES[k.at]!) used.add(i);
  return used.size === 5;
}

/** 살아남은 조합이 어느 한 수를 **늘 포함**하지는 않는가. */
export function noCommonNumber(kept: readonly { at: number }[]): boolean {
  if (kept.length === 0) return false;
  for (let i = 0; i < 5; i += 1) {
    if (kept.every((k) => TRIPLES[k.at]!.includes(i))) return false;
  }
  return true;
}

/** 공통분모별 분자 풀 — 정수가 되는 분자($L$ 의 배수)는 미리 뺀다. */
const NUMERATOR_POOLS: Record<number, number[]> = (() => {
  const out: Record<number, number[]> = {};
  for (const L of [4, 6, 12]) {
    const pool: number[] = [];
    for (let v = -(2 * L - 1); v <= 2 * L - 1; v += 1) {
      if (v === 0 || v % L === 0) continue;
      pool.push(v);
    }
    out[L] = pool;
  }
  return out;
})();

const NAMES = ["a", "b", "c", "d", "e"] as const;

/** 약분한 지면 글자 — `-\dfrac{1}{2}`. 분모가 $1$ 이 되는 분자는 풀에서 이미 뺐다. */
function reducedFracTex(n: number, L: number): string {
  const g = gcd(Math.abs(n), L);
  return `${n < 0 ? "-" : ""}\\dfrac{${Math.abs(n) / g}}{${L / g}}`;
}

/** 통분한 채로 보이는 글자 — `-\dfrac{3}{6}`. */
function commonFracTex(n: number, L: number): string {
  return `${n < 0 ? "-" : ""}\\dfrac{${Math.abs(n)}}{${L}}`;
}

const INTEGER_TRIPLES: TypeEntry[] = [
  defType(
    BOOK1,
    MINOR_CALC,
    "44U",
    "다섯 유리수 중 세 수의 합이 정수가 되는 경우",
    SEC.덧뺄,
    "심화상",
    (rng): Body =>
      attempt(4000, (): Body | null => {
        const L = pick(rng, [4, 6, 12] as const);
        const ns = pickDistinct(rng, NUMERATOR_POOLS[L]!, 5);
        const kept = integerTriples(ns, L);
        // 살아남는 것이 $0$·$1$ 이면 열거가 뜻이 없고, 너무 많으면 「정수」 조건이
        // 거의 안 거른다. 실측 분포(무작위 4000판)는 $0$:1064 · $1$:774 · $2$:1517 ·
        // $3$:436 · $4$:111 · $6$:98 이라 이 창이 실제로 좁힌다.
        if (kept.length < 3 || kept.length > 5) return null;
        // ㉠ 어느 한 수가 어느 조합에도 안 쓰이면 그 수는 장식이고, 늘 쓰이면
        //    열 가지를 다 보는 뜻이 옅어진다.
        if (!allNumbersUsed(kept)) return null;
        if (!noCommonNumber(kept)) return null;
        // 정수 값이 $0$ 이면 마지막 줄이 `+0` 이 되어 지면 냄새가 난다.
        if (kept.some((k) => k.sum === 0)) return null;
        const x = kept.reduce((s, k) => s + k.sum, 0);
        // ㉡ 굳힘 조건(「합이 정수」)을 지우면 답이 달라져야 한다.
        if (allTriplesSum(ns, L) === x) return null;
        const keptSet = new Set(kept.map((k) => k.at));
        const tripleName = (at: number): string =>
          TRIPLES[at]!.map((i) => NAMES[i]!).join("+");
        const numeratorSumTex = (at: number): string => {
          const t = TRIPLES[at]!;
          return `${ns[t[0]]!}${signed(ns[t[1]]!)}${signed(ns[t[2]]!)}`;
        };
        const caseLines = TRIPLES.map((_, at) => {
          const t = TRIPLES[at]!;
          const s = ns[t[0]]! + ns[t[1]]! + ns[t[2]]!;
          const verdict = keptSet.has(at)
            ? `$${L}$의 배수이다`
            : `$${L}$의 배수가 아니다`;
          return `$${tripleName(at)}$: $${numeratorSumTex(at)}=${s}$ (${verdict})`;
        });
        const keptDetail = kept
          .map(
            (k) =>
              `$${tripleName(k.at)}$일 때 $${ns[TRIPLES[k.at]![0]]! + ns[TRIPLES[k.at]![1]]! + ns[TRIPLES[k.at]![2]]!}\\div${L}=${k.sum}$`,
          )
          .join(", ");
        const finalTex = kept
          .map((k, i) => (i === 0 ? `${k.sum}` : `+${parenNeg(k.sum)}`))
          .join("");
        return {
          content: `다섯 개의 유리수 ${ns.map((v) => `$${reducedFracTex(v, L)}$`).join(", ")} 중에서 서로 다른 세 수를 뽑아 더하려고 한다. 그 합이 정수가 되는 모든 경우에 대하여 그때의 합을 모두 더한 값을 구하시오.`,
          answer: `$${x}$`,
          solution: [
            `주어진 다섯 수를 차례로 $a$, $b$, $c$, $d$, $e$라 하자.`,
            `다섯 수 중에서 서로 다른 세 수를 뽑는 것은 뽑지 않는 두 수를 고르는 것과 같으므로 뽑는 방법은 모두 열 가지이다.`,
            `분모를 $${L}$${euroRo(L)} 통분하면 다섯 수는 차례로 ${ns.map((v) => `$${commonFracTex(v, L)}$`).join(", ")}이므로, 세 수의 합이 정수가 되려면 분자 세 개의 합이 $${L}$의 배수이어야 한다.`,
            `열 가지 각각에 대하여 분자 세 개의 합을 차례로 구하면 다음과 같다.`,
            ...caseLines,
            `합이 정수가 되는 경우는 ${koreanCount(kept.length)} 가지이고, 그때의 합은 ${keptDetail}이다.`,
            `따라서 구하는 값은 $${finalTex}=${x}$이다.`,
          ].join("\n"),
          facts: {
            x,
            L,
            kept: kept.length,
            n1: ns[0]!,
            n2: ns[1]!,
            n3: ns[2]!,
            n4: ns[3]!,
            n5: ns[4]!,
          },
        };
      }),
  ),
];

/**
 * 중1 2차 확대 갈래 명부 — `generate.ts` 의 `ALL` 이 이것 하나만 spread 한다.
 *
 * 갈래별 몫: **심화중 2 · 심화상 2**. 수를 목표로 잡지 않았다 — 세울 수 있는
 * 자리에만 세웠다.
 */
export const M1_TOP_2: TypeEntry[] = [
  ...UNIT_DIGIT,
  ...TEN_DIVISORS,
  ...RECIPROCAL_SUM,
  ...INTEGER_TRIPLES,
];
