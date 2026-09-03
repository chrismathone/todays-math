/**
 * 중1 **5차 확대 갈래 `h`** — `심화중`·`심화상` 넷을 더한다 (D-116, 2026-09-03).
 *
 * ## 왜 또 새 파일인가
 *
 * 기존 모듈(`m1Geo2.ts`·`m1Num.ts`·`m1Expr.ts`)은 저마다 자기 유형을 **개수로 얼린**
 * 시험을 달고 있다. 거기에 유형을 더하면 그 가드가 빨개지고, 초록으로 되돌리는
 * 유일한 길이 **가드를 무르는 것**이 된다. 그리고 5차 물결은 21갈래가 **동시에** 도는
 * 오르카 다중 세션이라, 같은 파일을 두 세션이 만지면 말없이 덮어쓴다
 * (2026-08-23 「미커밋 새 파일이 가장 약한 고리」). 새 파일 하나 + `generate.ts`
 * **spread 한 줄**(리드 몫)이면 그 둘을 다 피한다.
 *
 * 규칙을 두 벌로 두지 않으려고 `m1Top.ts` 의 `gcd` 는 **읽어만 온다**(고치지 않는다).
 *
 * ## 무엇이 «중»이고 무엇이 «상»인가 — D-116 ⑵ 의 그 자
 *
 * ```
 * 심화중  느슨한 마디가 **하나**이고, **그 소단원의 개념**이 그것을 굳힌다.
 *         성질 하나가 후보를 «끝까지 계산하지 않고» 거른다.        (D-115 ⑾)
 * 심화상  성질로 못 굳혀 후보를 **다 만들어 견줘야** 한다.
 * ```
 *
 * | 키 | 갈래 | 안 굳는 마디 | 무엇이 굳히나 (또는 못 굳히나) | 같은 소단원 형제와 무엇이 다른가 |
 * |---|---|---|---|---|
 * | `다각형의 내각과 외각\|93X` | **심화상** | 두 정다각형의 변의 개수 $m$, $n$ — 미지수 **둘**에 식이 **하나**뿐이다 | 굳지 **않는다.** 중1은 $\dfrac{360}{m}+\dfrac{360}{n}=d$ 를 인수분해로 접는 법을 모르므로, 훑을 범위를 부등호로 **양쪽에서** 조여 놓고 $m=3,4,5,\dots$ 을 하나씩 넣어 그때마다 $n$ 이 자연수인지 **실제로 나눠 봐야** 한다. 끝나는 근거조차 계산이 아니라 **견줌**이다 | `02`·`08`~`13` 은 변의 개수나 각의 크기를 **다 주고** 공식을 한 번 쓴다. `93X` 만 **두 다각형의 변의 개수가 발문에 없다** |
 * | `작도\|94X` | **심화상** | 「어느 세 개를 고르는가」 — 다섯 중 셋이라 **열 가지**이고 발문이 하나도 지목하지 않는다 | 굳지 **않는다.** 삼각형의 성립 조건은 고른 **뒤에야** 대 볼 수 있으므로 열 가지를 **다 만들어** 각각 가장 긴 변과 나머지 두 변의 합을 견줘야 한다. 살아남은 것의 둘레를 또 더해야 하므로 «하나만 골라 끝내는» 길이 없다 | `05` 는 두 변을 **주고** $x$ 의 범위를 한 줄로 낸다. `06` 은 세 변짜리 **보기 넷**을 주고 개수만 센다. `94X` 만 **고르는 일 자체가 문제**다 |
 * | `수의 대소관계\|95X` | **심화중** | 자연수 $n$ — 「정수가 $k$개」가 $n$ 을 하나로 정해 주지 않는다(무수히 많은 후보) | 이 소단원의 개념 「수직선 위에서 어느 두 정수 사이에 있는가」 **하나**가 굳힌다. $-\dfrac{p}{q}$ 보다 큰 정수 중 가장 작은 것이 정해지면 $k$번째가 곧 위끝의 자리이므로, $n$ 을 **하나도 넣어 보지 않고** 범위가 통째로 나온다 | `17`·`21` 은 위끝·아래끝을 **다 주고** 개수를 센다. `18` 은 한 수의 이웃 정수를 묻는다. `95X` 만 **위끝이 미지수**다 |
 * | `등식의 성질\|96X` | **심화중** | 상수항 $b$ — 등식 하나에 미지수가 $x$ 와 $b$ 둘이다 | 이 소단원의 성질 「양변을 $0$ 이 아닌 같은 수로 나누어도 등식은 성립한다」가 굳힌다. 양변에서 $b$ 를 빼고 $a$ 로 나누면 $x=(c-b)\div a$ 이고, **$x$ 가 자연수 ⟺ $c-b$ 가 $a$ 의 양의 배수**다 — 배수는 범위 안에서 **한 번에** 나열되므로 $b$ 를 하나씩 넣어 보는 걸음이 없다 | `19`~`22` 는 더할·뺄·곱할·나눌 수를 **주고** 결과만 쓴다. `23`~`25` 는 그 수를 되묻지만 답이 **하나**다. `96X` 만 **살아남는 $b$ 가 여럿**이고 그것을 다 모아야 한다 |
 *
 * ## 🔴 앞 물결들이 실제로 낸 결함 — 여기서 어떻게 막았나
 *
 * ㉮ **해설이 정답지 한 단(964.8px)을 넘었다**(3차 중1 `53V`, 최대 1242px). 넘치면 그 쪽
 *    **다른 문항의 해설이 통째로 사라진다**(`column-count:2` + `overflow:hidden`).
 *    → 넷 다 **훑는 자리에 상한**을 두었다(`93X` 는 후보 $m$ 을 최대 여섯 · `94X` 는 늘
 *      열 · `95X` 는 늘 여섯 줄 · `96X` 는 살아남는 $b$ 를 최대 다섯). 시험이 제품
 *      `estimateSolutionPx` 로 660판에서 **700px 미만**을 잠근다. 실측 최대는 차례로
 *      **638.4 · 600.6 · 299.7 · 475.8px** 다.
 *      ⚠️ 줄이는 길이 「걸음 지우기」이면 안 된다(D-116 ⑹) — 후보마다 «왜 살고 죽는지»는
 *      그대로 두고 **훑는 범위**만 줄였다.
 * ㉯ **해설이 「자연수」 걸음을 건너뛰었다**(3차 중2 `38V`). 부등식에서 정수로 뛰며 근거를
 *    안 적었다. → `95X` 는 「$\dfrac{n}{r}$ 가 $U$ 보다 크고 $U+1$ 이하」에서 $n$ 으로
 *    갈 때 **분모 $r$ 을 곱한 두 값을 그 자리에서** 적고, `93X` 는 훑는 범위의 양 끝을
 *    **곱셈 두 줄로** 증명한다(「$d\times m$ 이 $720$ 이하」). 뛰는 걸음이 없다.
 * ㉰ **해설이 기약이 아닌 분수를 찍었다**(3차 중1 `52V`, 17.5%).
 *    → 지면의 **수** 분수는 `95X` 의 $-\dfrac{p}{q}$ 한 자리뿐이고 생성기가 `gcd(p,q)=1`
 *      과 $q\ge2$ 를 강제한다. `93X` 의 $\dfrac{360}{m}$ 은 분모가 **문자**라 수 분수가
 *      아니고, `94X`·`96X` 는 나눗셈을 `\div` 로만 적는다. 시험이 지면의 모든 수 분수를
 *      훑어 기약인지·분모가 $1$ 이 아닌지 다시 재고, **찾은 자리 수까지 못 박는다.**
 * ㉱ **발문이 스스로 못 박은 상한을 오답이 넘었다**(4차 중2 `37W`). → 넷 다 「전체를
 *    $1$ 로 놓고」류 상한을 **선언하지 않는다**(공용 `declaredUpperBound` 가 `null`).
 *    `96X` 의 「$b$ 는 $B_1$ 이상 $B_2$ 이하」는 **답이 아니라 $b$ 의 범위**이고 그 함수가
 *    읽는 표현이 아니다 — 시험이 660판 전량에서 `null` 임을 확인한다.
 * ㉲ **정답이 «구간»이면 파생 오답이 뒤집힌다**(3차 중2 `35V`). → 넷 다 정답이 **한 수**다.
 * ㉳ **해설의 «말»을 지키는 시험이 없었다**(4차). → 시험이 「약수↔배수」·「크다↔작다」·
 *    「가장 작은↔가장 큰」·「자연수↔유리수」·「$0$ 이 아니다」를 **낱말과 수를 함께**
 *    판정하고, 낱말을 뒤집으면 빨개지는 눈금을 양성·음성 둘 다 둔다.
 * ㉴ **지면이 자기가 한 줄 앞에 세운 제약을 어긴다**(4차 중3 `55W`, 100%).
 *    → `93X` 는 「$m$ 은 $L$ 이상 $H$ 이하」를 선언한 뒤 **정확히 그 범위만** 훑고,
 *      시험이 훑은 $m$ 의 집합이 선언한 범위와 **글자 그대로 같은지** 잰다.
 * ㉵ **자료를 정렬해 찍으면 «보이는 자리»가 순위를 암시한다**(4차 중1 `63W`, 100%).
 *    → `94X` 의 다섯 선분은 **정렬해 찍는다** — 이 문항에서 순서는 암시가 아니라
 *      **주어진 사실**이고(길이가 곧 그 수다), 셈도 정렬된 값으로 한다. 감출 순위가 없다.
 * ㉶ **D-20 손실 원장이 재현 불가였다**(4차 중1 `62W`). → 가드마다 「이 가드 **하나만**
 *    껐을 때」를 창 전수로 세어 각 유형 옆에 적었다. 판 수와 답 수의 **측정점을 같은
 *    자리**로 맞췄다(창 전수 = 만들 수 있는 발문 전부, 답 = 그때의 서로 다른 정답).
 *    어림한 자리는 하나도 없고, 아래 시험이 **같은 창을 다시 훑어** 그 수를 다시 센다.
 *
 *    ```
 *    93X  판    56 →    48 (14.29%)   답 24 → 24
 *    94X  판 2,066 → 1,899 ( 8.08%)   답 217 → 213
 *    95X  판 5,508 → 4,851 (11.93%)   답 55 → 55
 *    96X  판 76,442 → 71,974 ( 5.85%) 답 289 → 286
 *    ```
 *
 *    🔴 **구조적으로 0 인 가드가 셋 있다** — `93X` 의 `pageShortcutValues`(지면 수가
 *    하나뿐이라 `scaled` 가 이미 잡은 1판 말고는 아무것도 못 잡는다) · `94X` 의
 *    「답이 후보 목록 안에 있나」(양의 정수 셋 이상의 합은 그중 어느 것보다 크다) ·
 *    `95X` 의 흔들기(합이 정확히 $r^{2}$ 만큼 커진다). **「일하는 가드」로 읽지 말 것.**
 *    셋 다 그 자리에 두는 까닭을 코드 옆에 적었고, 시험이 「0인 것이 맞다」를 따로 잰다.
 * ㉷ **내보낸 순수 함수의 주석이 코드와 어긋났다**(4차 중3). → 아래 네 순수 함수
 *    (`polygonPairs`·`triangleTriples`·`integerWindowValues`·`equalityConstants`)의
 *    단언은 **전부 시험이 문다**(양성·음성 대조 둘 다).
 * ㉸ 우리말 — 「그중」은 붙여 쓴다. 조사는 **지면에 찍히는 글자**로 정한다.
 *
 * ## ㉢ 형제와의 겹침 — 🔴 **정직하게 적어 둘 것 하나**
 *
 * 실측(씨앗 `20260827`, `koreanJaccard`, 소단원 형제 각 10):
 *
 * ```
 * 93X  가장 닮은 형제 0.273 (1-2|다각형|20)          기준선 중앙값 0.273 · 문턱 0.818
 * 94X  가장 닮은 형제 0.233 (1-2|작도와 합동|71)      기준선 중앙값 0.100 · 문턱 0.350
 * 95X  가장 닮은 형제 0.111 (1-1|정수와 유리수|12)    기준선 중앙값 0.077 · 문턱 0.350
 * 96X  가장 닮은 형제 0.143 (1-1|일차방정식의 풀이|07) 기준선 중앙값 0.091 · 문턱 0.350
 * ```
 *
 * 🔴 **`94X` 는 `1-2|작도와 합동|71`(응용)과 «축»이 같다** — 「여러 선분 중 셋을 골라
 * 삼각형이 되는가」다. 올린 것은 셋이다: 재료가 **넷 → 다섯**(경우가 $4$ → $10$),
 * 묻는 것이 **개수 → 살아남은 것들의 둘레의 합**(고르고 나서 한 걸음이 더 있다),
 * 갈래가 **응용 → 심화상**. 그래도 「같은 꼴을 또 냈다」는 판단은 **리드 몫**으로 넘긴다.
 * ⚠️ 처음 판은 `71` 과 같은 낱말(「선분」·「골라」·「작도할 수 있는」)을 써서 겹침이
 * **0.346** 이었다 — 문턱 `0.350` 을 **0.004** 차이로 통과한다. 그 여백으로는 형제가
 * 한 낱말만 바뀌어도 시험이 뒤집히므로, 축은 그대로 두고 **지면 낱말을 갈랐다**
 * (「막대」·「뽑아」·「삼각형이 되는」). 0.346 → **0.233**.
 * 겹침을 낮추려고 축을 숨긴 것이 아니라, **축이 겹친다는 사실을 여기 적어 두고**
 * 시험이 그 낱말 차이에 기대지 않게 한 것이다.
 *
 * 5차 `h` 넷끼리도 안 닮았다 — 한글 최대 **0.148**(`95X`↔`96X`) · 수·답 최대 0.100.
 *
 * ## 번호 규약 — **`X` 접미사**
 *
 * `extensionNumberReason`(`src/__tests__/helpers/rpmCatalog.ts`)은 `숫자+영문 대문자
 * 한 글자` 를 「색인 번호와 절대 안 겹친다」로 통과시킨다. 5차 물결은 **`X`** 이고,
 * 번호대는 리드가 갈래마다 나눠 준 구간(`93`~`96`)을 그대로 쓴다.
 *
 * ## 계약 (이웃 모듈과 한 벌 — `m1Top4.ts`·`m1Top5f.ts` 머리말과 같다)
 *
 * 1. **정답을 먼저 뽑고 발문을 역산한다.**
 * 2. `facts.x` 가 정답이다.
 * 3. 숫자는 전부 `$...$` 안에 (`elementary/rules` `bareNumbers` 가드).
 * 4. `attempt` 가 다 떨어지면 **던진다** — 조용히 기본값을 내지 않는다.
 * 5. 그림이 없으므로 발문이 **지면을 가리키지 않는다**(`pointsAtFigure`).
 * 6. 🔴 **해설이 걸음을 건너뛰지 않는다**(D-116 ⑸). 후보를 견주는 갈래는 후보를
 *    하나씩 적고 **각각 왜 살고 죽는지**까지 적는다.
 */
import { intBetween, pick } from "../elementary/rng";

import { attempt, defType, type Body } from "./m1Shared";
// 최대공약수·최소공배수 규칙을 두 벌로 두지 않는다 — 1차·3차 물결 것을 **읽어만** 온다.
import { gcd } from "./m1Top";
import { lcm } from "./m1Top3";
import { eulReul } from "./m2Josa";
import type { TypeEntry } from "./types";

const BOOK1 = "1-1";
const BOOK2 = "1-2";
const MINOR_POLY = "다각형";
const MINOR_CONSTR = "작도와 합동";
const MINOR_INT = "정수와 유리수";
const MINOR_EQ = "일차방정식의 풀이";

/**
 * 우리 `Unit.section` 정확한 이름.
 *
 * ⚠️ 손으로 적되 **시험이 `prisma/seed-data/units.ts` 정본과 글자 그대로 대조한다**
 * (다른 소단원에는 **가는 공백 U+2009** 가 든 것도 있어 눈으로는 안 갈린다).
 */
const SEC = {
  다각형내외각: "다각형의 내각과 외각",
  작도: "작도",
  대소: "수의 대소관계",
  등식성질: "등식의 성질",
} as const;

// ── 소품 ────────────────────────────────────────────────────

/** 주격 조사 — `$41$이` · `$5$가`. 받침 판정은 `m2Josa` **한 곳**에서 온다. */
function iGa(n: number): "이" | "가" {
  return eulReul(n) === "을" ? "이" : "가";
}

/** 보조사 — `$48$은` · `$45$는`. 역시 `m2Josa` 를 되쓴다. */
function eunNeun(n: number): "은" | "는" {
  return eulReul(n) === "을" ? "은" : "는";
}

/**
 * 개수를 세는 우리말 수관형사 — `세 가지`·`여덟 개`.
 *
 * ⚠️ **`$3$가지` 라고 쓰면 안 된다.** 조사 자(`josaMismatches`)는 수 뒤의 `가` 를
 * 주격 조사로 읽어 「$3$가 → $3$이」를 신고한다. 여기서 `가` 는 의존명사 「가지」의
 * 첫 글자라 그 신고는 **거짓 경보**인데, **거짓 경보는 가드를 끈다**(2026-08-20).
 * 자를 무르는 대신 지면에서 우리말 수관형사를 쓴다 — 셈말과 조사가 아예 안 만난다.
 */
function koreanCount(n: number): string {
  const words: Record<number, string> = {
    1: "한",
    2: "두",
    3: "세",
    4: "네",
    5: "다섯",
    6: "여섯",
    7: "일곱",
    8: "여덟",
    9: "아홉",
    10: "열",
    11: "열한",
    12: "열두",
  };
  const w = words[n];
  if (w === undefined) throw new Error(`koreanCount: 다루지 않는 수 ${n}`);
  return w;
}

/** 목록을 `$1$, $2$, $3$` 꼴로. */
function listTex(xs: readonly number[]): string {
  return xs.map((v) => `$${v}$`).join(", ");
}

/**
 * 음수를 괄호로 감싼 지면 글자 — `7` · `(-7)`.
 *
 * 🔴 이것이 없으면 `${a}-${b}` 가 `37--8` 이 되고, 지면 냄새 자(`pageSmells`)의
 * 「`+-` 나 `--` 가 붙었다」에 걸린다. 값은 맞고 KaTeX 도 초록이라 다른 자는 못 본다.
 */
function paren(n: number): string {
  return n < 0 ? `(${n})` : `${n}`;
}

/** 여러 수의 합을 지면 글자로 — 음수는 괄호로 감싼다(`11+2+(-7)`). */
function sumTex(xs: readonly number[]): string {
  if (xs.length === 0) throw new Error("sumTex: 더할 것이 없다");
  return xs.map((v, i) => (i === 0 ? String(v) : `+${paren(v)}`)).join("");
}

/**
 * 🔴 **지면의 수만으로 만들 수 있는 «뻔한 한 수».**
 *
 * 판정기(`scripts/qa/probe-middle-top-m1.ts`)의 `obviousCandidates` 와 **같은 것을
 * 노린다.** 제품이 `scripts/qa` 를 import 할 수는 없으므로 여기 한 벌을 두되,
 * **시험이 그 판정기의 자로 다시 재어 「한 판도 안 걸린다」를 잠근다** — 이쪽이 좁으면
 * 그때 빨개진다(둘이 갈라져도 아무도 모르는 일이 없게).
 *
 * ⚠️ 손 목록이라 **샌다.** 그래서 유형마다 「그 유형의 지름길」을 따로 이름 붙여 막고,
 *    시험이 **널 모형(답을 판끼리 돌려 끼운 우연 수준)**과 견준다.
 */
export function pageShortcutValues(nums: readonly number[]): Set<number> {
  const out = new Set<number>();
  const xs = nums.filter((v) => Number.isInteger(v));
  if (xs.length === 0) return out;
  out.add(Math.max(...xs));
  out.add(Math.min(...xs));
  out.add(xs.reduce((a, b) => a + b, 0));
  const pos = xs.filter((v) => v > 0);
  if (pos.length > 0) {
    out.add(pos.reduce((a, b) => a + b, 0));
    out.add(Math.max(...pos));
    out.add(Math.min(...pos));
    out.add(pos.reduce((a, b) => gcd(a, b)));
  }
  for (let i = 0; i < xs.length; i += 1) {
    for (let j = i + 1; j < xs.length; j += 1) {
      const a = xs[i]!;
      const b = xs[j]!;
      out.add(Math.abs(a - b));
      out.add(a + b);
      out.add(a * b);
      if (a !== 0 && b !== 0) {
        out.add(gcd(a, b));
        // 🔴 판정기(`obviousCandidates`)에는 **최소공배수**가 있다. 여기 빼 두었더니
        //    `96X` 에서 그 자만 잡는 판이 실측 2건 나왔다 — 두 벌이 갈라지면
        //    한쪽만 고쳐도 아무도 모른다(그래서 시험이 판정기의 자로 다시 잰다).
        if (Math.abs(a * b) < 1e7) out.add(lcm(a, b));
        if (a % b === 0) out.add(a / b);
        if (b % a === 0) out.add(b / a);
      }
    }
  }
  return out;
}

/**
 * 「지면의 한 수에 작은 수를 한두 번 곱하거나 나눈 값」 — 발문의 수가 적은 유형에서
 * `pageShortcutValues` 가 구조적으로 약해지는 자리를 따로 막는다.
 */
export function scaledValues(a: number): Set<number> {
  const step = (v: number, out: Set<number>): void => {
    for (const k of [2, 3, 4, 5, 10, 100]) {
      out.add(v * k);
      if (v % k === 0) out.add(v / k);
    }
  };
  const first = new Set<number>([a]);
  step(a, first);
  const out = new Set<number>(first);
  for (const v of first) step(v, out);
  return out;
}

// ═══════════════════════════════════════════════════════════
// 93X  한 외각(내각)의 크기의 합·차가 주어진 두 정다각형  (심화상)
// ═══════════════════════════════════════════════════════════

export type PolygonRelation = "합" | "차";

export type PolygonScan = {
  /** 훑어야 하는 $m$ 의 아래끝 — 「변의 개수는 $3$ 이상」이 이겼으면 `3`. */
  lo: number;
  /** 훑어야 하는 $m$ 의 위끝. */
  hi: number;
  /** 아래끝이 부등호에서 나왔나(`false` 면 「$3$ 이상」에서 나왔다). */
  loFromBound: boolean;
  /** 살아남은 $(m, n)$ — 언제나 $m<n$ 이다. */
  pairs: readonly (readonly [number, number])[];
};

/**
 * 🔴 **굳지 않는다 — 그래서 훑는다.**
 *
 * 정$m$각형의 한 외각의 크기는 $\dfrac{360^{\circ}}{m}$ 이다. 두 정다각형에 대하여
 *
 * ```
 * 합:  360/m + 360/n = deg   (m < n 이므로 360/m > deg/2  ⟹  deg*m < 720 + deg)
 * 차:  360/m - 360/n = deg   (360/n > 0    이므로 360/m > deg  ⟹  deg*m < 360)
 * ```
 *
 * 이고, 두 식 다 $n=\dfrac{360m}{\,\pm(deg\cdot m)\mp360\,}$ 로 풀린다. 중1은 이것을
 * 인수분해로 접는 법을 모르므로 **$m$ 을 하나씩 넣어 $n$ 이 자연수인지 나눠 봐야** 한다.
 *
 * ⚠️ 이 함수는 **굳힘을 인자로 받는다** — `deg` 를 흔들면 답이 달라져야 한다.
 *    그 자가 «아니오»를 낼 수 있음은 시험이 **살아남는 짝이 하나도 없는 `deg`**
 *    (예: 합 $37^{\circ}$)로 보인다.
 */
export function polygonPairs(
  kind: PolygonRelation,
  deg: number,
): PolygonScan | null {
  if (!Number.isInteger(deg) || deg < 1) return null;
  const bound = kind === "합" ? Math.floor(360 / deg) + 1 : 3;
  const lo = Math.max(3, bound);
  const hi = kind === "합" ? Math.floor(720 / deg) : Math.ceil(360 / deg) - 1;
  if (hi < lo) return null;
  const pairs: [number, number][] = [];
  for (let m = lo; m <= hi; m += 1) {
    const den = kind === "합" ? deg * m - 360 : 360 - deg * m;
    if (den <= 0) return null; // 훑는 범위를 잘못 잡았다는 뜻이다 — 조용히 넘기지 않는다
    const num = 360 * m;
    if (num % den !== 0) continue;
    const n = num / den;
    if (n < m) return null;
    if (n === m) continue; // 「변의 개수가 서로 다른」 조건에서 죽는다
    pairs.push([m, n]);
  }
  return { lo, hi, loFromBound: bound > 3, pairs };
}

/** 창에 넣을 한 판 — 발문에 찍히는 것은 `kind` 와 `deg` 뿐이다. */
export type PolygonCase = {
  kind: PolygonRelation;
  deg: number;
  scan: PolygonScan;
};

/**
 * 창 전수 — 실측 **28판**(합 20 · 차 8). 발문은 여기에 «내각·외각» 두 표현을 곱해
 * **56가지**, 다시 «변·꼭짓점» 두 물음을 곱해 **112가지**다.
 *
 * 거르는 조건과 그 까닭:
 *  - 훑을 후보 $m$ 이 **셋~여섯**  … 셋보다 적으면 「견줌」이 무색하고, 여섯을 넘으면
 *    해설이 정답지 한 단에 안 들어간다(㉮ — 실측 최대: 후보 여덟 **735.5px** ·
 *    일곱 **713.7px** · 여섯 **655.0px**. 셋 다 같은 자로 660판을 재어 얻은 값이다).
 *  - 살아남는 짝이 **둘~넷**       … 하나면 「모두 구하여 그 합」이 무색하다.
 *  - **죽는 후보가 하나 이상**      … 전부 살아남으면 나눗셈 판정이 장식이 된다.
 *  - $n\le120$ 이고 $m=n$ 인 해가 **없다** … 정$630$각형은 지면에서 우습고, $m=n$ 은
 *    「변의 개수가 서로 다른」 조건과 부딪혀 발문을 애매하게 만든다.
 */
const POLYGON_CASES: readonly PolygonCase[] = (() => {
  const out: PolygonCase[] = [];
  for (const kind of ["합", "차"] as const) {
    for (let deg = 20; deg <= 300; deg += 1) {
      const scan = polygonPairs(kind, deg);
      if (scan === null) continue;
      const cand = scan.hi - scan.lo + 1;
      if (cand < 3 || cand > 6) continue;
      if (scan.pairs.length < 2 || scan.pairs.length > 4) continue;
      if (scan.pairs.length >= cand) continue;
      if (scan.pairs.some(([, n]) => n > 120)) continue;
      // $m=n$ 인 해가 있으면 그 판은 쓰지 않는다 — `polygonPairs` 가 조용히 버리므로
      // 여기서 다시 물어야 한다.
      let hasEqual = false;
      for (let m = scan.lo; m <= scan.hi; m += 1) {
        const den = kind === "합" ? deg * m - 360 : 360 - deg * m;
        if (den > 0 && (360 * m) % den === 0 && (360 * m) / den === m) {
          hasEqual = true;
        }
      }
      if (hasEqual) continue;
      out.push({ kind, deg, scan });
    }
  }
  return out;
})();

/**
 * 🔴 **답을 먼저 고른다** — 2026-09-04 리드 검문에서 최빈 정답이 **12.12%**
 *    (갈래 자기 시험 660판) · **11.6%**(리드 블록 넷 × 250판)로 문턱 12% 를
 *    걸치고 있었다. 창 28판이 서로 다른 답 24개를 내므로 어떤 답은 두 판에서
 *    나오고, `pick` 이 «판»을 고르니 그 답이 두 배로 잦다.
 *
 *    3차 `55W` 가 쓴 방식을 그대로 쓴다 — 답으로 묶어 두고 **답을 먼저 뽑는다.**
 *    그러면 쏠림이 구조적으로 $1/|\text{답}|$ 이 된다.
 *
 * ⚠️ 발문을 «내각/외각»·«변/꼭짓점»으로 가르는 두 갈래는 **답을 안 바꾼다** —
 *    그래서 그것은 답을 뽑은 뒤에 따로 뽑는다(지면은 갈리고 쏠림은 안 는다).
 */
const POLYGON_ANSWER_CACHE: {
  byAnswer?: Map<number, PolygonCase[]>;
  answers?: number[];
} = {};

function polygonAnswerOf(c: PolygonCase): number {
  let s = 0;
  for (const [m, n] of c.scan.pairs) s += m + n;
  return s;
}

export function polygonByAnswer(): Map<number, PolygonCase[]> {
  if (!POLYGON_ANSWER_CACHE.byAnswer) {
    const map = new Map<number, PolygonCase[]>();
    for (const c of POLYGON_CASES) {
      const x = polygonAnswerOf(c);
      const cur = map.get(x);
      if (cur) cur.push(c);
      else map.set(x, [c]);
    }
    POLYGON_ANSWER_CACHE.byAnswer = map;
  }
  return POLYGON_ANSWER_CACHE.byAnswer;
}

export function polygonAnswers(): number[] {
  if (!POLYGON_ANSWER_CACHE.answers) {
    POLYGON_ANSWER_CACHE.answers = [...polygonByAnswer().keys()].sort(
      (a, b) => a - b,
    );
  }
  return POLYGON_ANSWER_CACHE.answers;
}

const POLYGON_TYPE: TypeEntry[] = [
  defType(
    BOOK2,
    MINOR_POLY,
    "93X",
    "한 외각의 크기의 합이 주어진 두 정다각형",
    SEC.다각형내외각,
    "심화상",
    (rng): Body =>
      attempt(2000, (): Body | null => {
        // 🔴 답을 먼저 뽑는다(위 `polygonByAnswer` 머리말) — 쏠림 12.12% → 답 개수의 역수.
        const wantAnswer = pick(rng, polygonAnswers());
        const c = pick(rng, polygonByAnswer().get(wantAnswer)!);
        // 발문을 «외각»으로 낼지 «내각»으로 낼지 — 내각으로 내면 한 줄이 더 든다.
        const inner = intBetween(rng, 0, 1) === 1;
        // 「변의 개수」로 물을지 「꼭짓점의 개수」로 물을지 — 정다각형에서 둘은 같다.
        const vertex = intBetween(rng, 0, 1) === 1;
        const { lo, hi, loFromBound, pairs } = c.scan;
        const sides: number[] = [];
        for (const [m, n] of pairs) sides.push(m, n);
        const x = sides.reduce((a, b) => a + b, 0);
        // 🔴 ㉵ 발문에 찍히는 수는 각의 크기 **하나**뿐이라 `pageShortcutValues` 는
        //    `{deg}` 밖에 못 만든다(그 자는 여기서 구조적으로 약하다). 그래서
        //    「그 각을 작은 수로 몇 번 곱하거나 나눈 값」을 따로 세어 막는다.
        //    🔴 D-20 손실(창 **전수** 56판 = 28판 × 내각·외각 2, 어림 없음) —
        //    판 **56 → 48**(14.29%) · 서로 다른 답 **24 → 24**(하나도 안 잃는다).
        //    가드 하나만 껐을 때: `scaled` 를 켜면 판 55 → 48(답 24 → 24) ·
        //    `page` 를 켜면 판 48 → 48. **`page` 가 여기서 잡는 것은 `scaled` 가
        //    이미 잡은 1판뿐이다** — 「일하는 가드」로 읽지 말 것. 그래도 두는 까닭은
        //    판정기(`obviousCandidates`)와 **같은 자리를 같은 자로 보기** 위해서다.
        //    아래 시험이 창 전수로 이 수치를 다시 센다.
        const shown = inner ? (c.kind === "합" ? 360 - c.deg : c.deg) : c.deg;
        if (scaledValues(shown).has(x)) return null;
        if (pageShortcutValues([shown]).has(x)) return null;
        // 🔴 ㉡ 각의 크기를 흔들면 살아남는 짝이 달라져야 한다.
        const shaken = polygonPairs(c.kind, c.deg + 1);
        if (
          shaken !== null &&
          shaken.pairs.reduce((a, [m, n]) => a + m + n, 0) === x
        ) {
          return null;
        }
        const angleWord = inner ? "내각" : "외각";
        const relPhrase = c.kind === "합" ? "합이" : "차가";
        const askWord = vertex ? "꼭짓점" : "변";
        const lines: string[] = [];
        if (inner && c.kind === "합") {
          lines.push(
            `한 내각과 한 외각의 크기의 합은 $180^{\\circ}$이므로 ` +
              `두 정다각형의 한 외각의 크기의 합은 $360-${shown}=${c.deg}$에서 $${c.deg}^{\\circ}$이다.`,
          );
        } else if (inner) {
          lines.push(
            `한 내각의 크기는 $180^{\\circ}$에서 한 외각의 크기를 뺀 것이므로 ` +
              `두 정다각형의 한 외각의 크기의 차도 $${c.deg}^{\\circ}$이다.`,
          );
        }
        const denTex =
          c.kind === "합" ? `${c.deg}\\times m-360` : `360-${c.deg}\\times m`;
        lines.push(
          `변의 개수가 $m$인 정다각형의 한 외각의 크기는 $\\dfrac{360^{\\circ}}{m}$이므로, ` +
            `두 정다각형의 변의 개수를 각각 $m$, $n$ $(m<n)$이라 하면 ` +
            `$\\dfrac{360}{m}${c.kind === "합" ? "+" : "-"}\\dfrac{360}{n}=${c.deg}$, 즉 ` +
            `$n=(360\\times m)\\div(${denTex})$이다.`,
        );
        if (c.kind === "합") {
          lines.push(
            `$m<n$이고 $\\dfrac{360}{n}$이 $0$보다 크므로 $\\dfrac{360}{m}$은 $${c.deg}$의 절반보다 크고 $${c.deg}$보다 작다. ` +
              `즉 $${c.deg}\\times m$은 $360$보다 크고 $720$보다 작다.`,
          );
          const tail = `$${c.deg}\\times${hi}=${c.deg * hi}$${eunNeun(c.deg * hi)} $720$보다 작고 $${c.deg}\\times${hi + 1}=${c.deg * (hi + 1)}$${eunNeun(c.deg * (hi + 1))} $720$보다 크다.`;
          if (loFromBound) {
            lines.push(
              `$${c.deg}\\times${lo - 1}=${c.deg * (lo - 1)}$${eunNeun(c.deg * (lo - 1))} $360$보다 작고 ` +
                `$${c.deg}\\times${lo}=${c.deg * lo}$${eunNeun(c.deg * lo)} $360$보다 크며, ${tail} ` +
                `따라서 $m$은 $${lo}$ 이상 $${hi}$ 이하이다.`,
            );
          } else {
            lines.push(
              `${tail} 또 다각형의 변의 개수는 $3$ 이상이므로 $m$은 $${lo}$ 이상 $${hi}$ 이하이다.`,
            );
          }
        } else {
          lines.push(
            `$\\dfrac{360}{n}$이 $0$보다 크므로 $\\dfrac{360}{m}$은 $${c.deg}$보다 크다. ` +
              `즉 $${c.deg}\\times m$은 $360$보다 작다.`,
          );
          lines.push(
            `$${c.deg}\\times${hi}=${c.deg * hi}$${eunNeun(c.deg * hi)} $360$보다 작고 ` +
              `$${c.deg}\\times${hi + 1}=${c.deg * (hi + 1)}$${eunNeun(c.deg * (hi + 1))} $360$보다 크지 않으며, ` +
              `다각형의 변의 개수는 $3$ 이상이므로 $m$은 $${lo}$ 이상 $${hi}$ 이하이다.`,
          );
        }
        for (let m = lo; m <= hi; m += 1) {
          const den = c.kind === "합" ? c.deg * m - 360 : 360 - c.deg * m;
          const num = 360 * m;
          const head =
            c.kind === "합"
              ? `$m=${m}$이면 $n=(360\\times${m})\\div(${c.deg}\\times${m}-360)=${num}\\div${den}`
              : `$m=${m}$이면 $n=(360\\times${m})\\div(360-${c.deg}\\times${m})=${num}\\div${den}`;
          if (num % den === 0) {
            lines.push(`${head}=${num / den}$이다.`);
          } else {
            lines.push(
              `${head}$인데 $${num}$${eunNeun(num)} $${den}$의 배수가 아니므로 $n$이 자연수가 아니다.`,
            );
          }
        }
        const pairText = pairs
          .map(([m, n]) => `정$${m}$각형과 정$${n}$각형`)
          .join(", ");
        lines.push(
          `따라서 조건을 만족시키는 두 정다각형은 ${pairText}의 ${koreanCount(pairs.length)} 쌍이다.`,
        );
        if (vertex) {
          lines.push(
            `정다각형의 꼭짓점의 개수는 변의 개수와 같으므로, 구하는 값은 $${sides.join("+")}=${x}$이다.`,
          );
        } else {
          lines.push(`구하는 값은 $${sides.join("+")}=${x}$이다.`);
        }
        return {
          content:
            `변의 개수가 서로 다른 두 정다각형의 한 ${angleWord}의 크기의 ${relPhrase} ` +
            `$${shown}^{\\circ}$이다. 조건을 만족시키는 두 정다각형의 쌍을 모두 찾아, ` +
            `그 정다각형들의 ${askWord}의 개수를 모두 더한 값을 구하시오.`,
          answer: `$${x}$`,
          solution: lines.join("\n"),
          facts: {
            x,
            deg: c.deg,
            shown,
            inner: inner ? 1 : 0,
            vertex: vertex ? 1 : 0,
            sum: c.kind === "합" ? 1 : 0,
            lo,
            hi,
            cnt: pairs.length,
          },
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 94X  다섯 막대에서 세 개를 뽑아 만드는 삼각형  (심화상)
// ═══════════════════════════════════════════════════════════

export type TriangleTrial = {
  /** 오름차순으로 고른 세 길이. */
  triple: readonly [number, number, number];
  /** 짧은 두 변의 길이의 합. */
  shortSum: number;
  /** 작도할 수 있나 — 가장 긴 변이 나머지 두 변의 합보다 짧은가. */
  ok: boolean;
  /** 작도할 수 있을 때의 둘레. 못 하면 `0`. */
  perimeter: number;
};

/**
 * 🔴 **굳지 않는다 — 열 가지를 다 만들어 견준다.**
 *
 * 다섯 개에서 세 개를 고르는 경우는 $\dbinom{5}{3}=10$ 가지이고, 삼각형의 성립 조건
 * (가장 긴 변의 길이 $<$ 나머지 두 변의 길이의 합)은 **고른 뒤에야** 대 볼 수 있다.
 *
 * ⚠️ 인자로 받은 길이가 다섯이 아니거나 서로 다르지 않으면 **던진다** — 조용히
 *    적당한 값을 내면 그 판은 검사 밖으로 나간다.
 */
export function triangleTriples(lengths: readonly number[]): TriangleTrial[] {
  if (lengths.length !== 5) {
    throw new Error(
      `triangleTriples: 선분이 다섯이어야 한다 — ${lengths.length}`,
    );
  }
  if (new Set(lengths).size !== 5) {
    throw new Error("triangleTriples: 다섯 길이가 서로 달라야 한다");
  }
  const s = [...lengths].sort((a, b) => a - b);
  const out: TriangleTrial[] = [];
  for (let i = 0; i < 5; i += 1) {
    for (let j = i + 1; j < 5; j += 1) {
      for (let k = j + 1; k < 5; k += 1) {
        const x = s[i]!;
        const y = s[j]!;
        const z = s[k]!;
        const shortSum = x + y;
        const ok = shortSum > z;
        out.push({
          triple: [x, y, z],
          shortSum,
          ok,
          perimeter: ok ? x + y + z : 0,
        });
      }
    }
  }
  return out;
}

const TRIANGLE_TYPE: TypeEntry[] = [
  defType(
    BOOK2,
    MINOR_CONSTR,
    "94X",
    "다섯 막대에서 세 개를 뽑아 만드는 삼각형",
    SEC.작도,
    "심화상",
    (rng): Body =>
      attempt(4000, (): Body | null => {
        const lens: number[] = [];
        while (lens.length < 5) {
          const v = intBetween(rng, 2, 20);
          if (!lens.includes(v)) lens.push(v);
        }
        lens.sort((a, b) => a - b);
        const trials = triangleTriples(lens);
        // 「합이 세 번째 변과 **같은**」 경우는 지면에서 세 번째 판정 문구가 필요한데,
        // 그 문구는 한 판에 한 번 나올까 말까라 시험이 그 자리를 못 지킨다.
        // 지어내지 말고 **버린다**(못 가르는 것은 버리는 쪽으로).
        if (trials.some((t) => t.shortSum === t.triple[2])) return null;
        const alive = trials.filter((t) => t.ok);
        const dead = trials.filter((t) => !t.ok);
        if (alive.length < 3 || alive.length > 6) return null;
        if (dead.length < 2) return null;
        const x = alive.reduce((a, t) => a + t.perimeter, 0);
        // 🔴 ㉠ 답이 **살아남은 것 전부의 합**이라 목록의 어느 자리도 답이 될 수 없다.
        //    「둘레가 가장 긴 것」으로 물으면 살아남는 것이 늘 마지막 자리라
        //    초6 두 갈래를 막았던 함정이 그대로 태어난다 — 그래서 **묻지 않는다.**
        //    ⚠️ 이 가드는 **구조적으로 0**이다(양의 정수 셋 이상의 합은 그중 어느 것보다
        //    크다). 창 전수 2,066판에서 걸림 0 — 「일하는 가드」로 읽지 말 것.
        if (alive.some((t) => t.perimeter === x)) return null;
        // 🔴 ㉵ 지면에 찍히는 수는 다섯 길이뿐이다.
        //    🔴 D-20 손실(창 **전수** 2,066판 = 길이 다섯을 $2$~$20$ 에서 고르는 모든
        //    경우 중 위 조건을 통과한 것, 어림 없음) — 판 **2,066 → 1,899**(8.08%) ·
        //    서로 다른 답 **217 → 213**. 가드 하나만 껐을 때: `page` 를 켜면
        //    판 1,950 → 1,899(답 214 → 213) · `shake` 를 켜면 판 2,002 → 1,899
        //    (답 216 → 213) · 위 `자기자리` 는 판 1,899 → 1,899(0건).
        if (pageShortcutValues(lens).has(x)) return null;
        // 🔴 ㉡ 가장 긴 선분을 하나 늘리면 살아남는 짝이 달라져야 한다.
        const shakenLens = [...lens.slice(0, 4), lens[4]! + 1];
        const shaken = triangleTriples(shakenLens)
          .filter((t) => t.ok)
          .reduce((a, t) => a + t.perimeter, 0);
        if (shaken === x) return null;
        const lines: string[] = [
          `삼각형은 가장 긴 변의 길이가 나머지 두 변의 길이의 합보다 짧을 때에만 작도할 수 있다.`,
          `다섯 개에서 세 개를 뽑는 방법은 ${koreanCount(10)} 가지이므로 차례로 살펴본다.`,
        ];
        for (const t of trials) {
          const [p, q, r] = t.triple;
          const head = `$${p}$, $${q}$, $${r}$${eulReul(r)} 뽑으면 $${p}+${q}=${t.shortSum}$${eunNeun(t.shortSum)} $${r}$보다`;
          if (t.ok) {
            lines.push(
              `${head} 크므로 삼각형이 되고, 둘레의 길이는 $${p}+${q}+${r}=${t.perimeter}$이다.`,
            );
          } else {
            lines.push(`${head} 작으므로 삼각형이 되지 않는다.`);
          }
        }
        lines.push(
          `따라서 삼각형이 되는 것은 ${koreanCount(alive.length)} 가지이고, ` +
            `둘레의 길이를 모두 더하면 $${alive.map((t) => t.perimeter).join("+")}=${x}$이므로 $${x}\\,\\mathrm{cm}$이다.`,
        );
        return {
          content:
            `길이가 각각 ${lens.map((v) => `$${v}\\,\\mathrm{cm}$`).join(", ")}인 ` +
            `막대 다섯 개가 있다. 이 막대 중 어느 세 개를 세 변으로 하여 삼각형을 만들 때, ` +
            `삼각형이 되는 모든 경우에 대하여 둘레의 길이를 모두 더한 값을 구하시오.`,
          answer: `$${x}\\,\\mathrm{cm}$`,
          solution: lines.join("\n"),
          facts: {
            x,
            a1: lens[0]!,
            a2: lens[1]!,
            a3: lens[2]!,
            a4: lens[3]!,
            a5: lens[4]!,
            cnt: alive.length,
            first: alive[0]!.perimeter,
          },
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 95X  두 수 사이의 정수의 개수로 위끝 되찾기  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 **굳힘은 이 소단원의 개념 「수직선 위에서 어느 두 정수 사이에 있는가」 하나다.**
 *
 * $-\dfrac{p}{q}$ 가 정수가 아니면 그보다 큰 정수 중 가장 작은 것은 하나로 정해진다.
 * 거기서부터 $k$번째가 곧 「$\dfrac{n}{r}$ 보다 작은 정수 중 가장 큰 것」이므로,
 * $\dfrac{n}{r}$ 이 놓일 자리가 **길이 $1$ 짜리 구간 하나**로 굳는다. $n$ 을 하나도
 * 넣어 보지 않는다(D-115 ⑾ 의 «중»).
 *
 * 낸다: 조건을 만족시키는 자연수 $n$ 전부 — 언제나 **정확히 $r$개**이고 연속이다.
 *
 * ⚠️ 그 자가 «아니오»를 낼 수 있음은 시험이 **위끝이 $0$ 이하로 내려가는 판**으로
 *    보인다(그때는 자연수 $n$ 이 하나도 없어 빈 배열이 나온다).
 */
export function integerWindowValues(
  p: number,
  q: number,
  r: number,
  k: number,
): number[] {
  if (q < 2 || r < 2 || k < 1) return [];
  if (p % q === 0) return []; // $-p/q$ 가 정수면 「보다 크고」의 아래끝이 애매해진다
  const first = -Math.floor(p / q); // $-p/q$ 보다 큰 정수 중 가장 작은 것
  const last = first + k - 1; // 그 정수부터 $k$번째
  const ceil = last + 1; // $n/r$ 은 `last` 보다 크고 `ceil` 이하
  const out: number[] = [];
  for (let n = r * last + 1; n <= r * ceil; n += 1) {
    if (n >= 1) out.push(n);
  }
  return out;
}

const WINDOW_TYPE: TypeEntry[] = [
  defType(
    BOOK1,
    MINOR_INT,
    "95X",
    "두 수 사이의 정수의 개수로 위끝 되찾기",
    SEC.대소,
    "심화중",
    (rng): Body =>
      attempt(4000, (): Body | null => {
        const q = intBetween(rng, 2, 7);
        const r = intBetween(rng, 2, 7);
        const k = intBetween(rng, 4, 12);
        const p = intBetween(rng, q + 1, 12 * q);
        if (gcd(p, q) !== 1) return null;
        const f = Math.floor(p / q);
        if (f < 1) return null; // $-p/q$ 가 $-1$ 보다 작아야 아래끝이 음수로 잡힌다
        const first = -f;
        const last = first + k - 1;
        if (last < 1) return null; // 자연수 $n$ 이 생기려면 위끝이 $1$ 이상이어야 한다
        const ceil = last + 1;
        const ns = integerWindowValues(p, q, r, k);
        if (ns.length !== r) return null;
        const x = ns.reduce((a, b) => a + b, 0);
        // 🔴 ㉵ 지면에 찍히는 수는 $p$, $q$, $k$, $r$ 넷이다.
        //    🔴 D-20 손실(창 **전수** 5,508판, 어림 없음) — 판 **5,508 → 4,851**
        //    (11.93%) · 서로 다른 답 **55 → 55**(하나도 안 잃는다). 가드 하나만
        //    껐을 때: `page` 를 켜면 판 5,508 → 4,851 · `shake` 를 켜면 4,851 → 4,851.
        if (pageShortcutValues([p, q, k, r]).has(x)) return null;
        // 🔴 ㉡ 개수 $k$ 를 흔들면 답이 달라져야 한다.
        //    ⚠️ 이 가드는 **구조적으로 0**이다 — $k$ 를 $1$ 늘리면 위끝이 $1$ 올라가고
        //    $n$ 전부가 $r$ 씩 커지므로 합은 정확히 $r^{2}$ 만큼 커진다(창 전수 걸림 0).
        //    「일하는 가드」로 읽지 말 것. 그 대수는 시험이 따로 확인한다.
        const shaken = integerWindowValues(p, q, r, k + 1).reduce(
          (a, b) => a + b,
          0,
        );
        if (shaken === x) return null;
        const frac = `\\dfrac{${p}}{${q}}`;
        const lines = [
          `$${q}\\times${f}=${q * f}$${eunNeun(q * f)} $${p}$보다 작고 $${q}\\times${f + 1}=${q * (f + 1)}$${eunNeun(q * (f + 1))} $${p}$보다 크므로, ` +
            `$${frac}$${eunNeun(p)} $${f}$보다 크고 $${f + 1}$보다 작다.`,
          `그러므로 $-${frac}$${eunNeun(p)} $${-(f + 1)}$보다 크고 $${-f}$보다 작으므로, ` +
            `$-${frac}$보다 큰 정수 중 가장 작은 것은 $${first}$이다.`,
          `조건을 만족시키는 정수는 $${first}$부터 차례로 $${k}$개이므로 그중 가장 큰 것은 $${first}+${k}-1=${last}$이다.`,
          // ⚠️ `$\dfrac{n}{r}$` 는 「$r$분의 $n$」으로 읽으므로 마지막에 오는 소리가
          //    늘 「엔」이다 — 조사는 $r$ 이 아니라 **문자 $n$** 을 따라 언제나 「은」이다.
          `$\\dfrac{n}{${r}}$보다 작은 정수 중 가장 큰 것이 $${last}$${iGa(last)} 되려면 ` +
            `$\\dfrac{n}{${r}}$은 $${last}$보다 크고 $${ceil}$ 이하이어야 한다.`,
          `분모가 $${r}$이므로 $n$은 $${r}\\times${last}=${r * last}$보다 크고 $${r}\\times${ceil}=${r * ceil}$ 이하인 자연수이다.`,
          `따라서 $n$의 값은 ${listTex(ns)}의 ${koreanCount(r)} 개이고, 구하는 값은 $${ns.join("+")}=${x}$이다.`,
        ];
        return {
          content:
            `$-\\dfrac{${p}}{${q}}$보다 크고 $\\dfrac{n}{${r}}$보다 작은 정수가 모두 $${k}$개가 되도록 하는 ` +
            `자연수 $n$의 값을 모두 구하여 그 합을 구하시오.`,
          answer: `$${x}$`,
          solution: lines.join("\n"),
          facts: { x, p, q, r, k, first, last },
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 96X  등식의 성질로 지운 상수항 되찾기  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 **굳힘은 이 소단원의 성질 「양변을 $0$ 이 아닌 같은 수로 나누어도 등식은
 * 성립한다」 하나다.**
 *
 * $ax+b=c$ 의 양변에서 $b$ 를 빼면 $ax=c-b$ 이고, $a\ne0$ 이므로 양변을 $a$ 로 나누면
 * $x=(c-b)\div a$ 다. 그러면 「$x$ 가 자연수」는 **「$c-b$ 가 $a$ 의 양의 배수」**와
 * 같은 말이고, 배수는 범위 안에서 **한 번에** 나열된다 — $b$ 를 하나씩 넣어 보는
 * 걸음이 없다(D-115 ⑾ 의 «중»).
 *
 * 낸다: `[c-b 의 후보(범위 안 a 의 배수 전부), 살아남는 b]` 두 벌.
 * 앞엣것에는 $0$ 이하인 배수가 **들어 있다** — 그것이 「$0$ 보다 커야 한다」가
 * 실제로 무는 자리다.
 *
 * ⚠️ 그 자가 «아니오»를 낼 수 있음은 시험이 **범위 안에 양의 배수가 없는 판**으로
 *    보인다(그때는 살아남는 $b$ 가 빈 배열이다).
 */
export function equalityConstants(
  a: number,
  c: number,
  b1: number,
  b2: number,
): { multiples: number[]; alive: number[] } {
  const multiples: number[] = [];
  const alive: number[] = [];
  if (a < 2 || b1 > b2) return { multiples, alive };
  const lo = c - b2;
  const hi = c - b1;
  const start = Math.ceil(lo / a) * a;
  for (let m = start; m <= hi; m += a) {
    multiples.push(m);
    if (m > 0) alive.push(c - m);
  }
  return { multiples, alive };
}

const EQUALITY_TYPE: TypeEntry[] = [
  defType(
    BOOK1,
    MINOR_EQ,
    "96X",
    "등식의 성질에서 해가 자연수가 되는 상수항",
    SEC.등식성질,
    "심화중",
    (rng): Body =>
      attempt(4000, (): Body | null => {
        const a = intBetween(rng, 2, 9);
        const t = intBetween(rng, 3, 5);
        const c = intBetween(rng, 20, 99);
        // $b$ 의 위끝을 $c$ 이상으로 잡아 「$0$ 보다 커야 한다」가 **반드시** 문다.
        const e = intBetween(rng, 0, a);
        const b2 = c + e;
        // 아래끝은 $a\times t$ 까지는 담고 $a\times(t+1)$ 은 안 담는 자리에서 고른다.
        const b1 = intBetween(rng, c - a * (t + 1) + 1, c - a * t);
        // 🔴 $b_1=0$ 이면 지면에 `$29-0=29$` 가 나가고 냄새 자의 「상수 $0$ 을 더했다」에
        //    걸린다(실측 660판 중 1건). 값은 맞고 KaTeX 도 초록이라 다른 자는 못 본다.
        if (b1 === 0) return null;
        const { multiples, alive } = equalityConstants(a, c, b1, b2);
        if (alive.length !== t) return null;
        if (multiples.length <= t) return null; // $0$ 이하인 배수가 하나도 없으면 그 걸음이 장식이다
        if (alive.includes(0)) return null; // 지면 냄새 — `+0` 이 나간다
        if (new Set(alive).size !== alive.length) return null;
        const x = alive.reduce((s, v) => s + v, 0);
        // 🔴 ㉠ 답이 **살아남은 것 전부의 합**인데, $b$ 는 음수일 수 있으므로 그 합이
        //    후보 하나와 **같아질 수 있다**(실측: $b=-14,-6,2,10,18$ 의 합이 $10$).
        //    그러면 「하나만 골라도 답이 나오는」 판이 되므로 버린다.
        //    ⚠️ 94X 의 같은 가드와 달리 이쪽은 **구조적으로 0 이 아니다** — 창 전수에서
        //    실제로 걸린다(아래 시험이 그 수를 센다).
        if (alive.includes(x)) return null;
        // 🔴 ㉵ 지면에 찍히는 수는 $a$, $c$, $b_1$, $b_2$ 넷이다.
        //    🔴 D-20 손실(창 **전수** 76,442판, 어림 없음) — 판 **76,442 → 71,974**
        //    (5.85%) · 서로 다른 답 **289 → 286**. 가드 하나만 껐을 때(나머지 둘은 켠 채):
        //    `page` 75,759 → 71,974(답 288 → 286) · 위 `자기자리` 72,308 → 71,974
        //    (답 287 → 286) · `shake` 72,053 → 71,974(답 286 → 286).
        if (pageShortcutValues([a, c, b1, b2]).has(x)) return null;
        // 🔴 ㉡ 우변을 흔들면 살아남는 $b$ 가 달라져야 한다.
        const shaken = equalityConstants(a, c + 1, b1, b2).alive.reduce(
          (s, v) => s + v,
          0,
        );
        if (shaken === x) return null;
        const dead = multiples.filter((m) => m <= 0);
        const pos = multiples.filter((m) => m > 0);
        const lines = [
          `등식의 양변에서 $b$를 빼도 등식은 성립하므로 $${a}x=${c}-b$이다.`,
          `$${a}$${eunNeun(a)} $0$이 아니므로 양변을 $${a}$로 나누어도 등식은 성립한다. 따라서 $x=(${c}-b)\\div${a}$이다.`,
          `$x$가 자연수이려면 $${c}-b$가 $${a}$의 배수이면서 $0$보다 커야 한다.`,
          `$b$가 $${b1}$ 이상 $${b2}$ 이하의 정수이므로 $${c}-b$는 $${c}-${paren(b2)}=${c - b2}$ 이상 $${c}-${paren(b1)}=${c - b1}$ 이하의 정수이다.`,
          `이 범위에서 $${a}$의 배수는 ${listTex(multiples)}이고, ${listTex(dead)}${eunNeun(dead[dead.length - 1]!)} $0$보다 크지 않으므로 남는 것은 ${listTex(pos)}이다.`,
        ];
        for (const m of pos) {
          lines.push(
            `$${c}-b=${m}$이면 $b=${c}-${m}=${c - m}$이고, 이때 $x=${m}\\div${a}=${m / a}$이다.`,
          );
        }
        lines.push(
          `따라서 $b$의 값은 ${listTex(alive)}의 ${koreanCount(alive.length)} 개이고, 구하는 값은 $${sumTex(alive)}=${x}$이다.`,
        );
        return {
          content:
            `$x$에 대한 등식 $${a}x+b=${c}$에서 $b$는 $${b1}$ 이상 $${b2}$ 이하의 정수이다. ` +
            `등식의 성질을 이용하여 구한 $x$의 값이 자연수가 되도록 하는 ` +
            `모든 $b$의 값의 합을 구하시오.`,
          answer: `$${x}$`,
          solution: lines.join("\n"),
          facts: { x, a, c, b1, b2, cnt: alive.length, first: alive[0]! },
        };
      }),
  ),
];

export const M1_TOP_5H: TypeEntry[] = [
  ...POLYGON_TYPE,
  ...TRIANGLE_TYPE,
  ...WINDOW_TYPE,
  ...EQUALITY_TYPE,
];

/** 창 전수 — 시험이 D-20 손실을 **어림하지 않고** 다시 세는 데 쓴다. */
export const POLYGON_WINDOW: readonly PolygonCase[] = POLYGON_CASES;
