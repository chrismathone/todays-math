/**
 * 중1 **3차 확대 갈래** — `심화중`·`심화상` 넷을 더한다 (D-116, 2026-09-02).
 *
 * ## 왜 또 새 파일인가
 *
 * `m1Top.ts` 와 `m1Top2.ts` 는 각각 자기 유형을 **개수로 얼린** 시험을 달고 있다
 * (`expect(M1_TOP.length).toBe(4)` · `expect(M1_TOP_2.length).toBe(4)`). 거기에 유형을
 * 더하면 그 가드가 빨개지고, 초록으로 되돌리는 유일한 길이 **가드를 무르는 것**이 된다.
 * 그리고 오르카 다중 세션이 같은 파일을 동시에 만지면 병합에서 부딪힌다
 * (2026-08-23 「미커밋 새 파일이 가장 약한 고리」). 새 파일 하나 + `generate.ts`
 * **spread 한 줄**이면 그 둘을 다 피한다.
 *
 * 이 파일은 `m1Top.ts` 에서 `gcd` 하나만 **읽어 온다**(고치지 않는다). 최대공약수
 * 규칙을 두 벌로 두지 않기 위해서다 — `m1Top2.ts` 가 선 자리와 같다.
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
 * | `최대공약수와 최소공배수\|51V` | **심화중** | 곱할 분수 $\dfrac{q}{p}$ 의 분자와 분모가 **각각** — 발문은 「곱하면 자연수」만 주므로 그 조건을 만족하는 분수가 무수히 많다 | 이 소단원의 개념 둘이 **후보를 하나도 만들지 않고** 굳힌다: $q$ 는 두 분모의 공배수, $p$ 는 두 분자의 공약수이고, 「가장 작은」이 공배수에서는 **최소**를, 공약수에서는 **최대**를 고른다 | `09`·`10`·`11` 은 셋 다 대상이 **자연수**이고 최대공약수·최소공배수가 **발문에 주어져** 지수를 맞추거나 한 번 역산하면 곧장 굳는다. `51V` 는 대상이 **분수**이고 그 둘을 **스스로 만들어야** 하며, **분자에 최소공배수·분모에 최대공약수**가 들어가는 뒤집힘을 알아야 한다 |
 * | `정비례와 반비례\|52V` | **심화중** | 상수 $a$ — 「선분과 만난다」는 $a$ 를 하나로 정해 주지 않는다(그 사이의 어떤 값도 다 만난다) | 「$y=ax$ 의 그래프 위에서 $x=x_0$ 일 때 $y=ax_0$ 이고, $a$ 가 커지면 그 값도 커진다」는 이 소단원의 성질. **양 끝점 둘만** 대입하면 $a$ 가 살 수 있는 창이 정해진다 — 「이 $a$ 는 만나나?」를 후보마다 확인하는 걸음이 없다 | `10` 은 $a$ 가 **이미 주어져** 있고 답이 넓이다. `22` 는 $a$ 를 구하지만 「이등분 ⟹ 두 대각선의 교점을 지난다」 한 걸음으로 **곧장 하나**로 굳는다. `52V` 는 $a$ 가 **구간**으로만 굳고 그 안의 정수를 세어 더한다 |
 * | `일차방정식의 활용\|53V` | **심화상** | 상자의 개수 $n$ — 첫 조건은 과자 수를 $an+b$ 로 적어 줄 뿐이고 둘째 조건은 **등식이 아니다** | 굳지 **않는다**. 중1에 부등식이 없으므로 $n=1,2,3,\dots$ 을 차례로 놓고 그때마다 마지막 상자에 담기는 개수를 **실제로 계산해** 하나씩 견뎌야 한다 | `20`(긴 의자)은 조건 **둘이 다 등식**이라 $4x+2=5(x-2)$ 한 줄로 곧장 굳고 견줄 후보가 하나도 없다. 같은 소단원 `08`·`42` 도 마찬가지다 |
 * | `일차방정식의 활용\|54V` | **심화상** | 맞힌 개수 **둘 다** — 총점 하나만 주어지고 「합하여 몇 문제」가 없어 미지수 둘에 식이 하나뿐이다 | 굳지 **않는다**. $b$ 를 $1$ 부터 차례로 넣어 그때마다 $T-qb$ 가 $p$ 의 배수인지 견뎌야 한다(합동식은 중1이 모른다) | `50`(자릿수)은 조건 둘이 다 등식이라 한 문자로 접히고 답이 **하나**다. 가장 닮은 `06`(볼펜·연필)은 **개수의 합이 주어져** 미지수가 하나로 접힌다 — `54V` 는 바로 그 「합하여 몇 개」를 **빼서** 안 굳게 만든 것이다 |
 *
 * ## 🔴 2차 물결이 실제로 흘린 것 — 여기서 어떻게 막았나
 *
 * ㉮ **해설이 틀린 수를 적었다**(2차의 치명 결함, 42.5% 문항). 「해설에 이 문자열이
 *    있나」(`toContain`)는 마지막 줄 하나로 충족되므로 가드가 아니다.
 *    → 시험이 **해설의 모든 산술 등식을 파싱해 좌·우를 유리수로 각각 계산**하고,
 *      **해설에 나온 모든 수가 재계산으로 설명되는지**까지 센다(미설명 수 0).
 *      그리고 후보를 견주는 갈래(`53V`·`54V`)는 «나열 줄»의 세 수와 «판정»을 각각
 *      다시 셈해 맞댄다 — 2차의 결함은 두 줄이 서로 어긋난 것이었다.
 * ㉯ **`+0`·`(x)^{2}` 가 지면에 나갔다.** → 공용 계량기 `pageSmells` 를 쓰고,
 *    `51V` 는 $p\ge2$ 를 강제해 $\dfrac{q}{1}$ 이 안 나오게 하며, `52V` 는 창을
 *    **모두 양수**로 두어 「$0$을 더한다」가 안 생기게 한다.
 * ㉰ **「더 기므로」**(ㄹ불규칙). → 해설에 ㄹ탈락 어간(길다·멀다)을 **아예 안 쓴다**.
 *    「작으므로·크므로·많으므로·적지 않으므로」만 쓴다.
 * ㉱ **발문의 글자와 해설의 글자가 부딪혔다.** → `51V` 는 발문이 $p$, $q$ 를 「곱할
 *    분수의 분모·분자」로 묶었으므로 해설이 그 글자를 **소수(prime)로 다시 쓰지 않는다**
 *    (소인수분해는 수로만 적는다). `52V` 는 $a$ 를 정비례 상수로만 쓴다.
 * ㉲ **손 목록을 쓰면 눈이 먼다.** → 시험이 `src/__tests__/helpers/midPage.ts` 의
 *    `pageSmells`·`josaMismatches` 를 **그대로** 쓴다. 내 손 목록을 더하더라도
 *    공용 자를 빼지 않는다.
 * ㉳ **소단원 이름에 가는 공백(U+2009)이 있다.** → 이름을 손으로 안 적고 아래 `SEC`
 *    에 모아 두되, 시험이 `prisma/seed-data/units.ts` 정본과 **글자 그대로** 대조한다.
 *
 * ## 🔴 초등이 네 물결에 걸쳐 물린 함정 셋 — 여기서 어떻게 피했나
 *
 * ㉠ **창을 한쪽 끝만 주면 굳힘이 장식이 된다.** 「살아남는 후보가 언제나 목록의 같은
 *    자리」면 굳힘 조건은 «어느 후보인가»를 한 번도 안 고른다.
 *    → `52V`·`53V`·`54V` 는 답이 **후보 전부의 합**이다. 목록의 어느 자리도 답이 될 수
 *      없다(생성기가 그것을 불변식으로 막고 시험이 다시 센다). 「가장 큰 $a$」·「가장 많이
 *      맞힌 개수」로 물으면 살아남는 후보가 늘 목록의 **끝**(또는 첫 자리)이라 초6 두
 *      갈래를 막았던 그 함정이 그대로 태어난다 — 그래서 **묻지 않는다.**
 *    → `51V` 는 후보 목록이 **아예 없다**(값이 하나로 굳는다). 「축이 없다」와 「축이
 *      초록이다」는 다른 말이므로 시험이 이 갈래의 ㉠ 을 **«해당 없음»으로 따로 찍고**,
 *      대신 이 유형 고유의 지름길인 **뒤집은 오답**($\dfrac{\mathrm{lcm}(n_1,n_2)}{\gcd(d_1,d_2)}$)
 *      이 참 답과 같아지는 판을 막는다. 정찰이 처음 고른 $\dfrac{28}{15}$, $\dfrac{42}{25}$
 *      에서 옳은 답 $14+75$ 와 뒤집은 답 $5+84$ 가 **둘 다 $89$** 였다(우연이다).
 *      판정기(`probe-middle-top-m1.ts`)의 `withoutBinding` 도 **그 뒤집은 값**이다.
 * ㉡ **「굳힘이 항등식」** — 굳힘 조건을 흔들어도 답이 그대로면 그것은 굳힘이 아니라
 *    장식이다. 넷 다 굳힘을 **인자로 받는 순수 함수**로 뽑아 두었다:
 *    `smallestMultiplierFraction` · `integersMeetingSegment` · `boxCountsLeavingLast` ·
 *    `scorePairs`.
 *    ⚠️ 그 자가 «아니오»를 낼 수 있는지 보이려고 **음성 대조**를 같이 둔다 —
 *      $d_2$ 가 $d_1$ 의 약수이면 최소공배수가 $d_1$ 그대로라 $d_2$ 를 흔들어도 답이 안
 *      바뀌고, $y_\mathrm{B}$ 를 $Mx_0$ 과 $(M{+}1)x_0$ 사이에서 흔들면 정수 집합이 안
 *      바뀌며, $c\le a$ 이면 살아남는 $n$ 이 **하나도 없어** 무엇을 흔들어도 답이 $0$ 이고,
 *      $p\mid q$ 이면 「$p$ 의 배수인가」가 **한 번도 «아니오»를 안 낸다.**
 *      음성 대조가 없으면 그 가드의 «0» 이 «깨끗»인지 «못 셈»인지 안 갈린다(2026-08-21).
 * ㉢ **갈래끼리 겹침** — 위 표의 마지막 칸이 쌍마다 «푸는 절차가 어디서 갈리는가»를
 *    적은 것이다. 🔴 **정직하게 적어 둘 것 둘**:
 *    ⑴ `53V` 와 `54V` 는 **같은 중단원**(`1-1|일차방정식의 활용`)이고 둘 다 「모두 …
 *       합/더한 값을 구하시오」로 끝난다. 소단원이 달라 판정기의 형제 비교에는 안 걸리지만
 *       3단원 범위 시험지에는 **같이 실릴 수 있다.** 소재를 「상자에 담기」와 「배점」으로
 *       멀리 떼어 한글 Jaccard 를 낮췄다(시험이 그 값을 실제로 재서 잠근다).
 *    ⑵ `52V` 의 발문은 형제 `07`(정비례 관계의 그래프가 지나는 점)과 소단원 공통어
 *       (정비례·관계·그래프·값을·구하시오)를 나눠 갖는다. 「수+정답」 열쇠는 형제
 *       전부와 $0.000$ 이지만, 기준선 최댓값을 **면제부로 쓰지 않고** 시험이 중앙값과
 *       견주어 잠근다.
 *
 * ## 번호 규약 — **`V` 접미사**
 *
 * `extensionNumberReason`(`src/__tests__/helpers/rpmCatalog.ts`)은 `숫자+영문 대문자
 * 한 글자` 를 「색인 번호와 절대 안 겹친다」로 통과시킨다. 중1에는 이미 `A`(색인 밖
 * 보강)·`T`(1차 물결)·`U`(2차 물결)가 쓰였으므로 3차 물결은 **`V`** 로 대를 가른다.
 *
 * 🔴 **`53V`·`54V` 는 리드에게 물을 것이 하나 남아 있다.** 이 중단원에는 이미 우리가
 * 지은 plain `53`(마주 보고 가서 만나는 경우)·`54`(같은 방향으로 둘레를 도는 경우)가
 * 있다. 키는 접미사 때문에 안 부딪히고 `extensionNumberReason` 도 통과하지만,
 * 「색인 $53$번 곁에 지은 것」이라는 **뜻으로 잘못 읽힐 수 있다**(색인 최댓값은 $22$ 라
 * 실제로 색인 $53$번은 없다). 정찰 브리프가 「저술 단계에서 `61V`·`62V` 로 올릴지 리드에게
 * 물을 것」이라 적어 두었는데, 이 세션에서는 물을 길이 없어 **브리프가 지정한 번호를 그대로
 * 두었다.** 옮기려면 이 파일의 `"53V"`·`"54V"` 두 글자와 시험의 `K53`·`K54` 만 고치면 된다.
 *
 * ## 계약 (이웃 모듈과 한 벌 — `m1Top.ts`·`m1Top2.ts` 머리말과 같다)
 *
 * 1. **정답을 먼저 뽑고 발문을 역산한다.**
 * 2. `facts.x` 가 정답이다.
 * 3. 숫자는 전부 `$...$` 안에 (`elementary/rules` `bareNumbers` 가드).
 * 4. `attempt` 가 다 떨어지면 **던진다** — 조용히 기본값을 내지 않는다.
 * 5. 그림이 없으므로 발문이 **지면을 가리키지 않는다**(`pointsAtFigure`).
 * 6. 🔴 **해설이 걸음을 건너뛰지 않는다** (D-116 ⑸). 후보를 견주는 갈래는 **후보를
 *    하나씩 적고 각각 왜 살고 죽는지**까지 적는다 — `53V` 는 상자 개수마다,
 *    `54V` 는 $b$ 의 값마다 한 줄씩이다.
 */
import { intBetween, pick } from "../elementary/rng";

import { attempt, defType, type Body } from "./m1Shared";
// 최대공약수 규칙을 두 벌로 두지 않는다 — `m1Top.ts` 것을 **읽어만** 온다.
import { gcd } from "./m1Top";
import { eulReul, euroRo, waGwa } from "./m2Josa";
import type { TypeEntry } from "./types";

const BOOK1 = "1-1";
const MINOR_GCD = "최대공약수와 최소공배수";
const MINOR_PROP = "정비례와 반비례";
const MINOR_APPLY = "일차방정식의 활용";

/**
 * 우리 `Unit.section` 정확한 이름.
 *
 * ⚠️ 손으로 적되 **시험이 `prisma/seed-data/units.ts` 정본과 글자 그대로 대조한다**
 * (㉳ — 「일차방정식의 활용(나이, 과부족, 예금)」처럼 괄호·쉼표가 든 긴 이름과
 * 「정비례 관계 y=ax의 그래프」처럼 로마자·등호가 든 이름이 손으로 적기 쉬운 자리다).
 */
const SEC = {
  공배수: "공배수와 최소공배수",
  정비례그래프: "정비례 관계 y=ax의 그래프",
  과부족: "일차방정식의 활용(나이, 과부족, 예금)",
  수: "일차방정식의 활용(수)",
} as const;

// ── 소품 ────────────────────────────────────────────────────

export function lcm(a: number, b: number): number {
  return Math.abs((a / gcd(a, b)) * b);
}

/** 주격 조사 — `$41$이` · `$5$가`. 받침 판정은 `m2Josa` **한 곳**에서 온다. */
function iGa(n: number): "이" | "가" {
  return eulReul(n) === "을" ? "이" : "가";
}

/** 보조사 — `$48$은` · `$45$는`. 역시 `m2Josa` 를 되쓴다. */
function eunNeun(n: number): "은" | "는" {
  return eulReul(n) === "을" ? "은" : "는";
}

/**
 * 개수를 세는 우리말 수관형사 — `세 가지`·`네 개`.
 *
 * ⚠️ **`$3$가지` 라고 쓰면 안 된다.** 조사 자(`josaMismatches`)는 수 뒤의 `가` 를
 * 주격 조사로 읽어 「$3$가 → $3$이」를 신고한다. 여기서 `가` 는 의존명사 「가지」의
 * 첫 글자라 그 신고는 **거짓 경보**인데, **거짓 경보는 가드를 끈다**(2026-08-20).
 * 자를 무르는 대신 지면에서 우리말 수관형사를 쓴다 — 셈말과 조사가 아예 안 만난다.
 * (`m1Top2.ts` 가 같은 까닭으로 같은 소품을 두었다. 쓰는 범위가 달라 여기서는 $3$~$8$ 이다.)
 */
function koreanCount(n: number): string {
  const words: Record<number, string> = {
    3: "세",
    4: "네",
    5: "다섯",
    6: "여섯",
    7: "일곱",
    8: "여덟",
  };
  const w = words[n];
  if (w === undefined) throw new Error(`koreanCount: 다루지 않는 수 ${n}`);
  return w;
}

/** 목록을 `$1$, $2$, $3$` 꼴로. */
function listTex(xs: readonly number[]): string {
  return xs.map((v) => `$${v}$`).join(", ");
}

/** 소인수분해 — `[[2,1],[3,2]]`. */
export function primeFactors(n: number): [number, number][] {
  if (!Number.isInteger(n) || n < 2) {
    throw new Error(`primeFactors: $2$ 이상의 정수여야 합니다 — ${n}`);
  }
  const out: [number, number][] = [];
  let m = n;
  for (let p = 2; p * p <= m; p += 1) {
    let e = 0;
    while (m % p === 0) {
      m /= p;
      e += 1;
    }
    if (e > 0) out.push([p, e]);
  }
  if (m > 1) out.push([m, 1]);
  return out;
}

/** 소인수분해의 지면 글자 — `2\times3^{2}`. 지수 $1$ 은 안 적는다(`pageSmells`). */
export function factorTex(n: number): string {
  return primeFactors(n)
    .map(([p, e]) => (e === 1 ? `${p}` : `${p}^{${e}}`))
    .join("\\times");
}

/** 소인수가 둘 이상이거나 지수가 $1$ 보다 커야 «분해해 보인다»는 말이 참이 된다. */
function isComposite(n: number): boolean {
  return factorTex(n) !== String(n);
}

// ═══════════════════════════════════════════════════════════
// 51V  두 분수 어느 것에 곱하여도 자연수가 되는 가장 작은 분수  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 **굳힘은 이 소단원의 개념 둘이다 — 후보를 하나도 만들지 않는다.**
 *
 * $\dfrac{n_i}{d_i}\times\dfrac{q}{p}=\dfrac{n_iq}{d_ip}$ 이고 $\gcd(n_i,d_i)=1$,
 * $\gcd(q,p)=1$ 이므로 이 값이 자연수이려면 $d_i\mid q$ 이고 $p\mid n_i$ 여야 한다.
 * 그러므로 $q$ 는 두 분모의 **공배수**, $p$ 는 두 분자의 **공약수**이고,
 * $\dfrac{q}{p}$ 가 가장 작으려면 $q$ 는 **최소**공배수, $p$ 는 **최대**공약수다.
 * 값을 하나씩 넣어 보는 걸음이 한 번도 없다(D-115 ⑾ 의 «중»).
 *
 * ⚠️ 이 함수는 **굳힘을 인자로 받는다** — 네 수를 흔들면 답이 달라져야 한다(㉡).
 *    그리고 그 자가 «아니오»를 낼 수 있음은 시험이 $d_2\mid d_1$ 인 판으로 보인다.
 */
export function smallestMultiplierFraction(
  n1: number,
  d1: number,
  n2: number,
  d2: number,
): { p: number; q: number } {
  return { p: gcd(n1, n2), q: lcm(d1, d2) };
}

/**
 * 「분자에 최대공약수, 분모에 최소공배수」로 **뒤집어** 쓴 흔한 오답.
 *
 * 이 값이 참 답과 같아지면 뒤집어 푼 학생과 옳게 푼 학생을 못 가른다 — 생성기가
 * 그 판을 버리고, 판정기(`probe-middle-top-m1.ts`)는 이 값을 `withoutBinding` 축으로 쓴다.
 */
export function swappedMultiplierAnswer(
  n1: number,
  d1: number,
  n2: number,
  d2: number,
): number {
  return gcd(d1, d2) + lcm(n1, n2);
}

/**
 * 분모 쌍 — 최소공배수가 세 자리쯤이고 **어느 것도 다른 것의 약수가 아니며** 둘 다
 * 합성수인 쌍. 합성수를 요구하는 까닭은 해설이 「소인수분해하면 $35=5\times7$」을
 * 적기 때문이다 — 소수이면 그 줄이 `$11=11$` 이 되어 아무 말도 안 한다.
 */
const DEN_PAIRS: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  for (let a = 9; a <= 45; a += 1) {
    if (!isComposite(a)) continue;
    for (let b = a + 1; b <= 60; b += 1) {
      if (b % a === 0) continue;
      if (!isComposite(b)) continue;
      const L = lcm(a, b);
      if (L < 90 || L > 400) continue;
      out.push([a, b]);
    }
  }
  return out;
})();

const SMALLEST_FRACTION: TypeEntry[] = [
  defType(
    BOOK1,
    MINOR_GCD,
    "51V",
    "두 분수 어느 것에 곱하여도 자연수가 되게 하는 가장 작은 분수",
    SEC.공배수,
    "심화중",
    (rng): Body =>
      attempt(3000, (): Body | null => {
        const pair = pick(rng, DEN_PAIRS);
        const swap = rng() < 0.5;
        const d1 = swap ? pair[1] : pair[0];
        const d2 = swap ? pair[0] : pair[1];
        const q = lcm(d1, d2);
        // ㉯ $p=1$ 이면 지면에 $\dfrac{q}{1}$ 이 나온다. $p\ge2$ 를 강제한다.
        const p = intBetween(rng, 2, 9);
        // $\dfrac{q}{p}$ 가 기약이 아니면 발문의 「$p$, $q$ 는 서로소」가 거짓이 된다.
        //
        // 🔴 **정찰 브리프를 한 자리 바로잡는다.** 브리프는 이 가드가 「실재하는
        //    필요」라며 $\dfrac{20}{21}$, $\dfrac{36}{14}$ 판에서 $\dfrac{42}{4}$ 가
        //    나온다고 적었다. 그런데 $\dfrac{36}{14}$ 는 **기약분수가 아니다** —
        //    지면의 두 분수가 기약이면 $\gcd(q,p)=1$ 은 **저절로 참이다**
        //    ($p\mid n_i$ 이고 $\gcd(n_i,d_i)=1$ 이므로 $\gcd(p,d_i)=1$, 따라서
        //    $\gcd(p,\mathrm{lcm}(d_1,d_2))=1$). 여기서는 $p$ 를 아래 기약 검사보다
        //    **먼저** 뽑으므로 이 줄이 그 자리에서 실제로 거른다. 뜻은 그대로 두되
        //    「기약 입력에서는 저절로 참」임을 적어 둔다 — 시험이 그 사실을
        //    음성 대조로 보인다(기약이 아닌 지면을 던진다).
        if (gcd(q, p) !== 1) return null;
        const u = intBetween(rng, 2, 12);
        const w = intBetween(rng, 2, 12);
        if (u === w || gcd(u, w) !== 1) return null;
        const n1 = p * u;
        const n2 = p * w;
        // 지면의 두 분수는 기약 진분수다.
        if (n1 >= d1 || n2 >= d2) return null;
        if (gcd(n1, d1) !== 1 || gcd(n2, d2) !== 1) return null;
        // $\gcd(u,w)=1$ 이라 아래는 늘 참이지만, 답이 $p$ 라는 것을 **여기서 못 박는다.**
        if (gcd(n1, n2) !== p) return null;
        const got = smallestMultiplierFraction(n1, d1, n2, d2);
        if (got.p !== p || got.q !== q) return null;
        const x = p + q;
        // 🔴 ㉠ 뒤집어 푼 답과 같아지면 두 학생을 못 가른다.
        if (swappedMultiplierAnswer(n1, d1, n2, d2) === x) return null;
        // 한 분수만 읽고 멈춘 답과도 같으면 안 된다.
        if (n1 + d1 === x || n2 + d2 === x) return null;
        // 🔴 ㉡ 분모를 흔들면 답이 달라져야 한다(판정기가 재는 그 축).
        if (p + lcm(d1, d2 + 1) === x) return null;
        const k1 = (n1 * q) / (d1 * p);
        const k2 = (n2 * q) / (d2 * p);
        if (!Number.isInteger(k1) || !Number.isInteger(k2)) return null;
        // ⚠️ 처음에는 「검산 두 값이 같으면 버린다」를 한 줄 더 두었는데, 변이 시험이
        //    「산출물이 그대로」를 냈다. 세어 보니 **4,495판 중 0건**이다 —
        //    $k_1=k_2$ 는 $u\,d_2=w\,d_1$ 일 때인데 그런 판은 $\gcd(n_i,d_i)=1$ 이
        //    먼저 막는다. 걸릴 수 없는 줄은 가드가 아니라 장식이므로 지웠다.
        //    (같은 값이 두 번 나와도 지면은 멀쩡하다 — 잃는 것이 없다.)
        const lcmLine = isComposite(q)
          ? `두 분모의 최소공배수는 $${factorTex(q)}=${q}$이다.`
          : `두 분모의 최소공배수는 $${q}$이다.`;
        const gcdLine = isComposite(p)
          ? `두 분자의 최대공약수는 $${factorTex(p)}=${p}$이다.`
          : `두 분자의 최대공약수는 $${p}$이다.`;
        return {
          content:
            `두 분수 $\\dfrac{${n1}}{${d1}}$, $\\dfrac{${n2}}{${d2}}$ 중 어느 것에 곱하여도 ` +
            `그 결과가 자연수가 되는 분수 가운데 가장 작은 것을 $\\dfrac{q}{p}$라 할 때, ` +
            `$p+q$의 값을 구하시오. (단, $p$, $q$는 서로소인 자연수이다.)`,
          answer: `$${x}$`,
          solution: [
            `$\\dfrac{${n1}}{${d1}}\\times\\dfrac{q}{p}=\\dfrac{${n1}\\times q}{${d1}\\times p}$이고 $${n1}$${waGwa(n1)} $${d1}$${iGa(d1)} 서로소이며 $q$와 $p$도 서로소이므로, 이 값이 자연수가 되려면 $q$가 $${d1}$의 배수이고 $p$가 $${n1}$의 약수이어야 한다.`,
            `같은 까닭으로 $\\dfrac{${n2}}{${d2}}\\times\\dfrac{q}{p}$가 자연수가 되려면 $q$가 $${d2}$의 배수이고 $p$가 $${n2}$의 약수이어야 한다.`,
            `즉 $q$는 두 분모 $${d1}$, $${d2}$의 공배수이고, $p$는 두 분자 $${n1}$, $${n2}$의 공약수이다.`,
            `$\\dfrac{q}{p}$가 가장 작으려면 분자 $q$는 가장 작아야 하고 분모 $p$는 가장 커야 하므로, $q$는 두 분모의 최소공배수이고 $p$는 두 분자의 최대공약수이다.`,
            `두 분모를 소인수분해하면 $${d1}=${factorTex(d1)}$, $${d2}=${factorTex(d2)}$이므로 ${lcmLine}`,
            `두 분자를 소인수분해하면 $${n1}=${factorTex(n1)}$, $${n2}=${factorTex(n2)}$이므로 ${gcdLine}`,
            `실제로 $\\dfrac{${n1}}{${d1}}\\times\\dfrac{${q}}{${p}}=${k1}$, $\\dfrac{${n2}}{${d2}}\\times\\dfrac{${q}}{${p}}=${k2}$${euroRo(k2)} 둘 다 자연수이다.`,
            `따라서 $p=${p}$, $q=${q}$이므로 구하는 값은 $${p}+${q}=${x}$이다.`,
          ].join("\n"),
          facts: { x, n1, d1, n2, d2, p, q, k1, k2 },
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 52V  정비례 그래프가 선분과 만나게 하는 정수 $a$ 를 모두 더하기  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 **굳힘은 「$y=ax$ 위에서 $x=x_0$ 일 때 $y=ax_0$ 이다」와 「$a$ 가 커지면 그 값도
 * 커진다」 둘이다.** 그래서 **양 끝점 둘만** 대입하면 $a$ 가 살 수 있는 창이 정해지고,
 * 그 창 안의 정수를 세면 된다 — 「이 $a$ 는 만나나?」를 후보마다 확인하는 걸음이 없다.
 *
 * 선분 $\mathrm{AB}$ 는 $x$좌표가 $x_0$ 이고 $y$좌표가 $y_A$ 부터 $y_B$ 까지다.
 * 그래프가 그 선분과 만나려면 $ax_0$ 이 $y_A$ 부터 $y_B$ 까지의 수여야 한다.
 *
 * ⚠️ 이 함수도 **굳힘을 인자로 받는다**. 그 자가 «아니오»를 낼 수 있음은 시험이
 *    $y_\mathrm{B}$ 를 $Mx_0$ 과 $(M{+}1)x_0$ 사이에서 흔들어 보인다(집합이 안 바뀐다).
 */
export function integersMeetingSegment(
  x0: number,
  yA: number,
  yB: number,
): number[] {
  if (x0 <= 0)
    throw new Error(`integersMeetingSegment: $x_0$ 은 양수여야 합니다 — ${x0}`);
  if (yB < yA)
    throw new Error("integersMeetingSegment: $y_A$ 가 $y_B$ 보다 큽니다");
  const out: number[] = [];
  const lo = Math.ceil(yA / x0);
  const hi = Math.floor(yB / x0);
  for (let a = lo; a <= hi; a += 1) out.push(a);
  return out;
}

/** 아래 끝을 안 읽고 「$ax_0$ 이 $y_B$ 이하」만 본 답 — 가장 뻔한 지름길이다. */
export function upperOnlySum(x0: number, yB: number): number {
  let s = 0;
  for (let a = 1; a * x0 <= yB; a += 1) s += a;
  return s;
}

const SEGMENT_SLOPES: TypeEntry[] = [
  defType(
    BOOK1,
    MINOR_PROP,
    "52V",
    "정비례 관계의 그래프가 선분과 만나도록 하는 정수 a를 모두 더하기",
    SEC.정비례그래프,
    "심화중",
    (rng): Body =>
      attempt(1500, (): Body | null => {
        const x0 = intBetween(rng, 2, 5);
        const yA = intBetween(rng, x0 + 1, 50);
        const yB = intBetween(rng, yA + 1, 140);
        // 🔴 창의 양 끝이 정수가 **아니어야** 「경계가 포함되나」라는 군더더기 시비가 없다.
        if (yA % x0 === 0 || yB % x0 === 0) return null;
        const ints = integersMeetingSegment(x0, yA, yB);
        // ㉯ 창이 $0$ 이나 음수를 품으면 지면에 「$0$을 더한다」가 나오고 답에 아무 뜻도
        //    안 보탠다. 시작이 $2$ 이상이면 창이 모두 양수이고, **아래 끝을 안 읽은
        //    답**(`upperOnlySum`)과도 갈린다.
        //
        // 🔴 **변이 시험이 알려 준 것 둘** (2026-09-02).
        //  ⑴ 이 줄은 지금 창에서 **한 번도 안 걸린다.** 위 `yA` 를 $x_0+1$ 부터
        //     뽑으므로 $y_A/x_0>1$ 이고 따라서 시작이 늘 $2$ 이상이다(실측: 지금 창
        //     1,348판 중 **0건**). 그렇다고 지워도 되는 줄이 아니다 — `yA` 를 $1$ 부터
        //     뽑게 넓히면 **120판**이 여기 걸린다. 창을 넓힐 사람은 그 사실을 알고 넓힐 것.
        //  ⑵ 처음에는 「`upperOnlySum(x0, yB) === x` 이면 버린다」를 **한 줄 더** 두었다.
        //     그런데 그 둘은 **대수적으로 같은 말**이다: `upperOnlySum` 은 $1$ 부터
        //     $M$ 까지의 합이고 답은 $lo$ 부터 $M$ 까지의 합이므로, 둘이 같은 것은
        //     $lo=1$ 일 때뿐이다. 실측도 **120 대 120 으로 같은 판**을 걸었다.
        //     아무것도 더 안 가르는 검사는 가드가 아니라 장식이므로 지웠다
        //     (2026-08-18 「대수적으로 같은 말인 검사를 지웠다」와 같은 자리).
        //     그 자리는 시험이 **음성 대조**로 지킨다(`A(3,2)`·`B(3,20)` 판을 던진다).
        if (ints.length === 0 || ints[0]! < 2) return null;
        if (ints.length < 4 || ints.length > 7) return null;
        const x = ints.reduce((a, b) => a + b, 0);
        // 🔴 ㉠ 답이 **후보 전부의 합**이라 목록의 어느 자리도 답이 될 수 없다.
        if (ints.includes(x)) return null;
        // 🔴 ㉡ 점 $\mathrm{B}$ 를 $x_0$ 만큼 올리면 창에 정수가 하나 더 들어와야 한다.
        const shaken = integersMeetingSegment(x0, yA, yB + x0);
        if (shaken.reduce((a, b) => a + b, 0) === x) return null;
        const lo = ints[0]!;
        const hi = ints[ints.length - 1]!;
        return {
          content:
            `좌표평면 위에 두 점 $\\mathrm{A}(${x0}, ${yA})$, $\\mathrm{B}(${x0}, ${yB})$${iGa(yB)} 있다. ` +
            `정비례 관계 $y=ax$의 그래프가 두 점을 이은 선분 $\\mathrm{AB}$와 만나도록 하는 ` +
            `정수 $a$의 값을 모두 더한 값을 구하시오.`,
          answer: `$${x}$`,
          solution: [
            `정비례 관계 $y=ax$의 그래프는 원점을 지나는 직선이고, 이 직선 위에서 $x$좌표가 $${x0}$인 점의 $y$좌표는 $a$의 $${x0}$배이다.`,
            `선분 $\\mathrm{AB}$는 두 점 $\\mathrm{A}(${x0}, ${yA})$, $\\mathrm{B}(${x0}, ${yB})$${eulReul(yB)} 이은 선분이므로 $x$좌표가 $${x0}$이고 $y$좌표가 $${yA}$부터 $${yB}$까지인 점으로 이루어져 있다.`,
            `그러므로 그래프가 선분 $\\mathrm{AB}$와 만나려면 $a$의 $${x0}$배가 $${yA}$부터 $${yB}$까지의 수이어야 한다.`,
            `$a$의 값이 $\\dfrac{${yA}}{${x0}}$이면 $${x0}\\times\\dfrac{${yA}}{${x0}}=${yA}$이므로 그래프는 점 $\\mathrm{A}$를 지나고, 이보다 작으면 그래프는 선분 $\\mathrm{AB}$보다 아래쪽을 지나므로 만나지 않는다.`,
            `$a$의 값이 $\\dfrac{${yB}}{${x0}}$이면 $${x0}\\times\\dfrac{${yB}}{${x0}}=${yB}$이므로 그래프는 점 $\\mathrm{B}$를 지나고, 이보다 크면 그래프는 선분 $\\mathrm{AB}$보다 위쪽을 지나므로 만나지 않는다.`,
            `그러므로 $a$의 값은 $\\dfrac{${yA}}{${x0}}$부터 $\\dfrac{${yB}}{${x0}}$까지의 수이고, 이 가운데 정수는 ${listTex(ints)}의 ${koreanCount(ints.length)} 개이다.`,
            `따라서 구하는 값은 $${ints.join("+")}=${x}$이다.`,
          ].join("\n"),
          facts: { x, x0, ya: yA, yb: yB, lo, hi, cnt: ints.length },
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 53V  과부족에서 마지막 하나만 덜 채워질 때 상자의 개수를 모두  (심화상)
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 **여기서는 굳지 않는다.** 첫 조건은 과자 수를 $an+b$ 로 적어 줄 뿐 $n$ 을 정하지
 * 않고, 둘째 조건은 **등식이 아니다** — 방정식을 하나도 안 준다. 중1에는 부등식이
 * 없으므로 $n=1,2,3,\dots$ 을 차례로 놓고 그때마다 마지막 상자에 담기는 개수
 * $(an+b)-c(n-1)$ 을 **실제로 계산해** 하나씩 견줘야 한다(D-115 ⑾ 의 «상»).
 *
 * ⚠️ 그 자가 «아니오»를 낼 수 있음은 시험이 $c\le a$ 인 판으로 보인다 — 그때는
 *    $(a-c)n+b+c$ 가 줄지 않아 $c-1$ 이하가 되는 $n$ 이 **하나도 없다**(빈 집합).
 *    (정찰 브리프는 그 자리를 「무한」이라 적었는데, 실측하면 **아래 `looseBoxCounts`
 *    쪽이 무한**이고 이쪽은 빈 집합이다. 시험이 둘 다 잰다.)
 */
export function boxCountsLeavingLast(
  a: number,
  b: number,
  c: number,
  maxN = 400,
): number[] {
  const out: number[] = [];
  for (let n = 1; n <= maxN; n += 1) {
    const last = a * n + b - c * (n - 1);
    if (last >= 1 && last <= c - 1) out.push(n);
  }
  return out;
}

/** 「빈 상자가 없다」만 읽고 「마지막 한 상자에만 적게」를 안 읽은 답. */
export function looseBoxCounts(
  a: number,
  b: number,
  c: number,
  maxN = 400,
): number[] {
  const out: number[] = [];
  for (let n = 1; n <= maxN; n += 1) {
    if (a * n + b - c * (n - 1) >= 1) out.push(n);
  }
  return out;
}

const BOX_SHORTAGE: TypeEntry[] = [
  defType(
    BOOK1,
    MINOR_APPLY,
    "53V",
    "과부족에서 마지막 하나만 덜 채워질 때 개수를 모두 구하기",
    SEC.과부족,
    "심화상",
    (rng): Body =>
      attempt(2000, (): Body | null => {
        const c = intBetween(rng, 4, 10);
        const a = intBetween(rng, 2, c - 1);
        const b = intBetween(rng, 1, 26);
        const alive = boxCountsLeavingLast(a, b, c);
        if (alive.length < 3 || alive.length > 5) return null;
        // 상자가 하나뿐인 경우가 살아남으면 「마지막 한 상자에만」이 뜻을 잃는다.
        //
        // 🔴 **이 줄은 실제로 일을 한다** — 실측으로 개수 조건을 통과한 254판 중
        //    **11판**이 여기서 죽는다. 그리고 「굳힘의 절반(빈 상자만 안 생기면 된다)을
        //    안 읽은 답과 갈린다」(`looseBoxCounts`)는 **이것과 대수적으로 같은 말**이다:
        //    느슨한 쪽은 늘 $1$ 부터 이어지므로 두 합이 같은 것은 살아남는 첫 상자 수가
        //    $1$ 일 때뿐이다. 그래서 그 한 줄은 두지 않는다(아무것도 더 안 가른다 —
        //    2026-08-18 「대수적으로 같은 말인 검사를 지웠다」와 같은 자리).
        //    시험이 두 성질을 **둘 다** 220판에서 잠근다.
        if (alive[0]! < 2) return null;
        // 해설이 $n=1$ 부터 한 줄씩 적으므로 너무 길어지면 안 된다.
        const top = alive[alive.length - 1]! + 1;
        if (top > 12) return null;
        const x = alive.reduce((s, v) => s + v, 0);
        // 🔴 ㉠ 답이 **후보 전부의 합**이라 목록의 어느 자리도 답이 될 수 없다.
        //
        // ⚠️ 변이 시험(2026-09-02): 이 줄은 **살아남는 것이 셋 이상**인 한 걸릴 수 없다
        //    (서로 다른 양의 정수 셋의 합은 그 중 어느 것보다 크다). 실측으로 지금 창
        //    254판 중 **0건**. 그런데 위 개수 조건을 $1$ 부터로 넓히면 **249판**이 여기
        //    걸린다 — 그때는 「가장 큰 상자 수」를 물은 것과 다름없어져 초6 두 갈래를
        //    막았던 함정이 그대로 태어난다. 창을 넓힐 사람은 그 사실을 알고 넓힐 것.
        if (alive.includes(x)) return null;
        // 🔴 ㉡ 둘째 조건의 $c$ 를 흔들면 살아남는 집합이 달라져야 한다.
        if (
          boxCountsLeavingLast(a, b, c + 1).reduce((s, v) => s + v, 0) === x
        ) {
          return null;
        }
        const lines: string[] = [];
        for (let n = 1; n <= top; n += 1) {
          const total = a * n + b;
          const need = c * (n - 1);
          const last = total - need;
          const head =
            n === 1
              ? `상자가 $1$개이면 과자는 $${a}+${b}=${total}$(개)이고, 이 상자 하나에 모두 담아야 하므로 마지막 상자에 담기는 과자는 $${total}$(개)이다.`
              : `상자가 $${n}$개이면 과자는 $${a}\\times${n}+${b}=${total}$(개)이고, 앞의 $${n - 1}$개 상자에 $${c}\\times${n - 1}=${need}$(개)가 담기므로 마지막 상자에 담기는 과자는 $${total}-${need}=${last}$(개)이다.`;
          if (last <= 0) {
            lines.push(
              `상자가 $${n}$개이면 과자는 $${a}\\times${n}+${b}=${total}$(개)인데, 앞의 $${n - 1}$개 상자를 $${c}$개씩 채우는 데에만 과자가 $${c}\\times${n - 1}=${need}$(개) 필요하다. 그러므로 마지막 상자에 담을 과자가 남지 않아 빈 상자가 생기므로 조건에 맞지 않는다.`,
            );
          } else if (last <= c - 1) {
            lines.push(
              `${head} 마지막 한 상자에만 $${c}$개보다 적게 담기고 빈 상자도 없으므로 조건에 맞는다.`,
            );
          } else {
            lines.push(
              `${head} 이것은 $${c}$개보다 적지 않으므로 조건에 맞지 않는다.`,
            );
          }
        }
        return {
          content:
            `과자를 여러 개의 상자에 나누어 담으려고 한다. 한 상자에 $${a}$개씩 담으면 $${b}$개가 남고, ` +
            `한 상자에 $${c}$개씩 담으면 마지막 한 상자에만 $${c}$개보다 적게 담기고 빈 상자는 생기지 않는다. ` +
            `조건에 맞는 상자의 개수를 모두 찾아 그 합을 구하시오.`,
          answer: `$${x}$`,
          solution: [
            `상자의 개수를 $n$이라 하면 한 상자에 $${a}$개씩 담고 $${b}$개가 남으므로 과자는 모두 $${a}\\times n+${b}$(개)이다.`,
            `이 과자를 $${c}$개씩 담으면 앞의 $n-1$개 상자에 $${c}\\times(n-1)$(개)가 들어가고, 마지막 상자에는 나머지가 담긴다.`,
            `마지막 한 상자에만 $${c}$개보다 적게 담기고 빈 상자가 생기지 않으려면 마지막 상자에 담기는 과자가 $1$개부터 $${c - 1}$개까지이어야 한다.`,
            `$n$의 값을 $1$부터 차례로 넣어 본다.`,
            ...lines,
            `상자가 $${top}$개보다 많으면 마지막 상자에 담기는 과자가 더 줄어들어 빈 상자가 생기므로 조건에 맞지 않는다.`,
            `따라서 조건에 맞는 상자의 개수는 ${listTex(alive)}의 ${koreanCount(alive.length)} 가지이고, 구하는 값은 $${alive.join("+")}=${x}$이다.`,
          ].join("\n"),
          facts: { x, a, b, c, cnt: alive.length, top },
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 54V  두 종류의 배점으로 총점이 주어질 때 개수를 모두 구하기  (심화상)
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 **여기서도 굳지 않는다.** 총점 하나만 주어지고 「합하여 몇 문제」가 없으므로
 * 미지수 둘에 식이 하나뿐이다. 중1의 도구로는 $b$ 를 $1,2,3,\dots$ 로 차례로 정한 뒤
 * 그때마다 $T-qb$ 가 $p$ 의 배수인지 **실제로 견줘야** 한다(합동식은 중1이 모른다).
 *
 * ⚠️ 그 자가 «아니오»를 낼 수 있음은 시험이 $p\mid q$ 인 판으로 보인다 — 그때는
 *    $p\mid T-qb$ 가 $p\mid T$ 와 같은 말이라 **모든 $b$ 가 다 살아남거나 다 죽는다**
 *    (「배수인가」를 견주는 걸음이 한 번도 «아니오»를 안 낸다).
 */
export function scorePairs(
  p: number,
  q: number,
  t: number,
): { a: number; b: number }[] {
  const out: { a: number; b: number }[] = [];
  for (let b = 1; t - q * b >= p; b += 1) {
    const rest = t - q * b;
    if (rest % p === 0) out.push({ a: rest / p, b });
  }
  return out;
}

/** 해설이 $b$ 를 어디까지 훑어야 하나 — $a\ge1$ 이 될 수 있는 마지막 $b$. */
export function lastBToCheck(p: number, q: number, t: number): number {
  return Math.floor((t - p) / q);
}

/** 배점 쌍 — 서로소이고 시험 배점으로 그럴듯한 것만. */
const SCORE_PAIRS = [
  [2, 5],
  [2, 7],
  [3, 4],
  [3, 5],
  [3, 7],
  [3, 8],
  [4, 5],
  [4, 7],
  [5, 6],
  [5, 7],
  [5, 8],
] as const;

const SCORE_COUNTS: TypeEntry[] = [
  defType(
    BOOK1,
    MINOR_APPLY,
    "54V",
    "두 종류의 배점으로 총점이 주어질 때 개수를 모두 구하기",
    SEC.수,
    "심화상",
    (rng): Body =>
      attempt(1500, (): Body | null => {
        const [p, q] = pick(rng, SCORE_PAIRS);
        const t = intBetween(rng, 30, 130);
        const found = scorePairs(p, q, t);
        if (found.length < 3 || found.length > 5) return null;
        const bStop = lastBToCheck(p, q, t) + 1;
        // 해설이 $b$ 를 한 줄씩 적으므로 너무 길어지면 안 된다.
        if (bStop - 1 < found.length || bStop > 13) return null;
        const x = found.reduce((s, k) => s + k.a, 0);
        // 🔴 ㉠ 답이 **살아남은 것 전부의 합**이라 목록의 어느 자리도 답이 될 수 없다.
        if (found.some((k) => k.a === x)) return null;
        // 첫 해를 찾고 멈춘 값과 갈려야 한다 — 그것이 이 유형의 가장 뻔한 지름길이다.
        //
        // ⚠️ 변이 시험(2026-09-02): 위 두 줄은 **해가 셋 이상**인 한 걸릴 수 없다
        //    (양의 정수 셋의 합은 그 중 어느 것보다 크다). 실측으로 지금 창 243판 중
        //    **0건**. 해를 $1$ 부터로 넓히면 **243판**이 여기 걸린다 — 그때는 「첫 해를
        //    찾고 멈춘 학생」과 끝까지 훑은 학생을 못 가른다. 창을 넓힐 사람은 그 사실을
        //    알고 넓힐 것.
        if (found[0]!.a === x) return null;
        // 🔴 ㉡ 총점을 흔들면 해집합이 달라져야 한다.
        if (scorePairs(p, q, t + 1).reduce((s, k) => s + k.a, 0) === x) {
          return null;
        }
        const lines: string[] = [];
        for (let b = 1; b <= bStop - 1; b += 1) {
          const rest = t - q * b;
          if (rest % p === 0) {
            lines.push(
              `$b=${b}$이면 $${t}-${q}\\times${b}=${rest}$이고, $${rest}$${eunNeun(rest)} $${p}$의 배수이므로 $a$의 값은 $${rest}\\div${p}=${rest / p}$이다.`,
            );
          } else {
            lines.push(
              `$b=${b}$이면 $${t}-${q}\\times${b}=${rest}$이고, $${rest}$${eunNeun(rest)} $${p}$의 배수가 아니므로 조건에 맞지 않는다.`,
            );
          }
        }
        const aList = found.map((k) => k.a);
        return {
          content:
            `$${p}$점짜리 문제와 $${q}$점짜리 문제로만 이루어진 시험이 있다. ` +
            `어떤 학생이 두 가지 문제를 각각 적어도 한 문제씩 맞혀 $${t}$점을 받았을 때, ` +
            `이 학생이 맞힌 $${p}$점짜리 문제의 개수가 될 수 있는 값을 모두 더한 값을 구하시오.`,
          answer: `$${x}$`,
          solution: [
            `맞힌 $${p}$점짜리 문제의 개수를 $a$, 맞힌 $${q}$점짜리 문제의 개수를 $b$라 하면 $${p}\\times a+${q}\\times b=${t}$이고, $a$와 $b$는 모두 자연수이다.`,
            `$b$의 값을 $1$부터 차례로 넣어 $${t}-${q}\\times b$가 $${p}$의 배수가 되는지 확인한다.`,
            ...lines,
            `$b$의 값이 $${bStop}$ 이상이면 $${q}$점짜리 문제만으로 얻는 점수가 $${q}\\times${bStop}=${q * bStop}$(점) 이상이 되어 남는 점수가 $${p}$점보다 작아지므로 $${p}$점짜리 문제를 한 문제도 맞힐 수 없다.`,
            `따라서 $a$의 값은 ${listTex(aList)}의 ${koreanCount(aList.length)} 가지이고, 구하는 값은 $${aList.join("+")}=${x}$이다.`,
          ].join("\n"),
          facts: {
            x,
            p,
            q,
            t,
            cnt: found.length,
            bstop: bStop,
            first: found[0]!.a,
          },
        };
      }),
  ),
];

export const M1_TOP_3: TypeEntry[] = [
  ...SMALLEST_FRACTION,
  ...SEGMENT_SLOPES,
  ...BOX_SHORTAGE,
  ...SCORE_COUNTS,
];
