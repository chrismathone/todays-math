/**
 * 중1 **5차 확대 갈래 (갈래 d)** — `심화중`·`심화상` 넷을 더한다 (D-116, 2026-09-03).
 *
 * ## 왜 또 새 파일인가
 *
 * `m1Top.ts`~`m1Top4.ts` 는 각각 자기 유형을 **개수로 얼린** 시험을 달고 있다
 * (`expect(M1_TOP_4).toHaveLength(4)` 따위). 거기에 유형을 더하면 그 가드가 빨개지고,
 * 초록으로 되돌리는 유일한 길이 **가드를 무르는 것**이 된다. 그리고 5차 물결은
 * 21갈래가 **동시에** 도는 오르카 다중 세션이라, 남의 파일을 열면 말없이 덮어쓴다
 * (2026-08-23 「미커밋 새 파일이 가장 약한 고리」). 새 파일 하나 + `generate.ts`
 * **spread 한 줄**(리드 몫)이면 그 둘을 다 피한다.
 *
 * 규칙을 두 벌로 두지 않으려고 `m1Top4.ts` 의 `pageShortcutValues` 를 **읽어만 온다**
 * (고치지 않는다). 그 함수는 판정기(`scripts/qa/probe-middle-top-m1.ts`)의
 * `obviousCandidates` 와 같은 것을 노리는 손 목록인데, 제품이 `scripts/qa` 를
 * import 할 수 없어 4차 물결이 제품 쪽에 한 벌 세워 둔 것이다. 여기서 또 베끼면
 * 세 벌이 된다.
 *
 * ## 무엇이 «중»이고 무엇이 «상»인가 — `m1Top.ts` 머리말의 그 자
 *
 * ```
 * 심화중  마디 하나가 안 굳고, **그 소단원의 개념**이 그것을 굳힌다.
 *         성질 하나가 후보를 «끝까지 계산하지 않고» 거른다.        (D-115 ⑾)
 * 심화상  성질로 못 굳혀 후보를 **다 만들어 견줘야** 한다.
 * ```
 *
 * | 키 | 갈래 | 안 굳는 마디 | 무엇이 굳히나 / 왜 안 굳나 | 같은 소단원 형제와 무엇이 다른가 |
 * |---|---|---|---|---|
 * | `도수분포다각형\|77X` | **심화상** | 「어느 계급이 조건에 맞는가」 — 다섯 계급 중 어느 것도 미리 지목되지 않는다 | 굳지 **않는다**. 기준값 $K=N\times p$ 는 **도수의 총합을 먼저 구해야** 나오고, 그 뒤에도 어느 계급이 사는지는 **다섯을 하나씩 견주어야만** 안다. 큰 도수부터 본다는 따위의 성질도 답을 줄여 주지 않는다 — 답이 **살아남은 것 전부의 합**이라 끝까지 다 봐야 한다 | `44`(연산)·`45`·`46`(기본)은 점을 읽어 한 번 더하거나 고르면 끝난다. `47`(응용)은 두 도수의 차, `48`(응용)은 누적, `49`(`심화하`)는 두 다각형을 계급마다 **크기만** 견준다 — 전부 **전체와의 비**가 없다. `77X` 만 「전체의 몇 %」라 **총합이 먼저** 필요하다 |
 * | `일차방정식의 활용(도형, 농도, 일)\|78X` | **심화중** | 덜어낸 뒤 남은 소금의 양 — 덜어낸 양 $x$ 를 모르므로 정해지지 않는다 | 이 소단원의 개념 「(소금의 양)$=$(소금물의 양)$\times$(농도)」 **하나**가 굳힌다. 소금물을 덜어내도 **농도는 그대로**이므로 남은 소금은 $(M-x)\times a\div100$ 으로 **한 번에** 적히고, 그 뒤는 일차방정식 하나다 — 후보를 하나도 만들지 않는다 | `15`(응용)는 물만, `16`(`심화하`)은 소금만, `58`(기본)은 증발만, `17`(`심화하`)은 두 소금물을 섞기만 한다. 넷 다 **덜어내는 걸음이 없다** — 덜어내기는 「전체가 줄면 소금도 같은 비로 준다」를 써야 하는 자리라 셋의 합성이 아니다 |
 * | `순서쌍과 좌표평면(응용)\|79X` | **심화상** | 「어느 세 점을 고르는가」 — 네 가지가 모두 삼각형이 된다 | 굳지 **않는다**. 밑변이 긴 삼각형이 넓다는 따위의 성질이 없다(밑변이 `AB` 인 둘과 `CD` 인 둘은 **밑변도 높이도 다르다**). 가장 큰 것과 가장 작은 것을 알려면 **넷을 다 계산해 견주는** 수밖에 없고, 답이 그 **차**라 한쪽만 알아서는 못 낸다 | `03`(응용)·`28`(응용)은 도형이 **하나**로 주어져 넓이를 한 번 구한다. `91`(기본)은 네 번째 꼭짓점, `27`(응용)은 대칭점의 미지수다. `79X` 만 **후보가 넷**이다 |
 * | `순서쌍과 좌표평면(기본)\|80X` | **심화중** | 조건을 만족하는 점 — 좌표평면 위의 점은 **무수히 많다** | 이 소단원의 개념 둘이 굳힌다. 「($x$축까지의 거리)$=$($y$좌표의 절댓값)」이 두 좌표를 각각 **유한한 정수 구간**으로 접고(발문이 「미만」이면 「절댓값이 $k-1$ 이하」로 한 걸음 더 든다), 「사분면 위의 점은 두 좌표가 모두 $0$이 아니다」가 축 위의 점을 **한 개도 세지 않고** 걷어낸다. 그래서 점을 **하나도 나열하지 않고** 곱 하나로 끝난다(D-115 ⑾ 의 «중») | `12`·`13`·`17`·`18`(기본)은 **한 점**의 좌표나 거리를 읽는다. `14`(기본)·`15`·`16`(연산)은 사분면·축 판정 한 번이다. `80X` 만 「점이 무수히 많다」에서 출발한다 |
 *
 * ## 🔴 앞 물결들이 실제로 낸 결함 — 여기서 어떻게 막았나
 *
 * ㉮ **해설이 정답지 한 단(964.8px)을 넘었다**(3차 중1 `53V`, 1242px). 넘치면 그 쪽
 *    **다른 문항의 해설이 통째로 사라진다**(`column-count:2` + `overflow:hidden`).
 *    → 넷 다 **훑는 자리를 다섯 이하로** 못 박았다(`77X` 계급 다섯 · `79X` 삼각형 넷 ·
 *      `78X`·`80X` 는 후보가 아예 없다). 시험이 제품 `estimateSolutionPx` 로 **660판**을
 *      재어 **700px 미만**을 잠근다. ⚠️ 줄이는 길이 「걸음 지우기」이면 안 된다
 *      (D-116 ⑹) — 후보마다 «왜 살고 죽는지»는 그대로 두고 **개수만** 묶었다.
 * ㉯ **해설이 「자연수」 걸음을 건너뛰었다**(3차 중2 `38V`). → 넷 다 부등식을 풀지
 *    않는다. `77X` 는 정수끼리 **크기만** 견주므로(양변에 $100$ 을 곱해 분수를 아예
 *    안 만든다) 「실수 해에서 정수로 뛰는」 자리가 **구조적으로 없다.**
 * ㉰ **해설이 기약이 아닌 분수를 찍었다**(3차 중1 `52V`). → 이 파일의 지면에는
 *    `\dfrac`·`\frac` 이 **한 자리도 없다.** 나눗셈은 전부 `\div` 로 적는다
 *    (농도 $a\%$ 를 $\frac{a}{100}$ 로 적으면 $\frac{20}{100}$ 처럼 기약이 아닌 것이
 *    바로 나온다 — 그 자리를 만들지 않았다). 시험이 「분수가 정말 0자리인가」를 찍는다.
 * ㉱ **발문이 스스로 못 박은 상한을 오답이 넘었다**(4차 중2 `37W`). → 넷 다 상한을
 *    선언하지 않는다. 시험이 공용 `declaredUpperBound(content)` 가 **660판 전량에서
 *    `null`** 임을 잠근다(「일에 대한 문제」를 안 고른 까닭이기도 하다 — 그 소재는
 *    「전체 일의 양을 $1$로 놓고」를 발문에 적게 된다).
 * ㉲ **정답이 «구간»이면 파생 오답이 뒤집힌다**(3차 중2 `35V`). → 넷 다 정답이
 *    **한 수**다. 시험이 `deriveThreeFormats` 로 보기 다섯이 실제로 만들어지는지 잰다.
 * ㉳ 🔴 **해설의 «말»을 지키는 시험이 없었다**(4차에서 중1 10줄이 무방비였다).
 *    → 「이상↔미만」·「크므로↔작으므로」·「맞는다↔맞지 않는다」·「가장 큰↔가장 작은」·
 *      「양수↔음수」·「변하지 않으므로↔변하므로」를 **낱말과 수를 함께** 판정하고,
 *      낱말을 뒤집으면 빨개지는 **양성 눈금**을 같이 둔다.
 * ㉴ **지면이 자기가 세운 제약을 스스로 어긴다**(4차 중3 `55W`). → `80X` 는
 *    「사분면 위의 점은 두 좌표가 모두 $0$이 아니다」를 선언하고, 그 뒤 두 줄이
 *    $1$ 부터 · $-1$ 까지로 **실제로 $0$ 을 뺀다.** 시험이 구간의 끝을 수로 확인하고,
 *    그 구간의 부호가 **그 사분면의 부호와 맞는지**까지 다시 잰다.
 * ㉹ **우리말** — 「$\mathrm{A}$」·「$a$」 뒤의 조사는 **글자를 읽어서** 정한다
 *    (「에이」·「에이」). 수 조사 함수를 쓰면 「$\mathrm{A}$과」·「$a$은」이 나가는데,
 *    공용 조사 자(`josaMismatches`)는 수로 안 끝나는 이 자리를 **구조적으로 못 본다.**
 *    「$\mathrm{g}$」 뒤도 마찬가지다 — 「그램」이라 늘 「을/은/과」다.
 * ㉵ **자료를 정렬해 찍으면 «보이는 자리»가 순위를 암시한다**(4차 중1 `63W`).
 *    → `77X` 의 도수 다섯은 **정렬하지 않는다**(계급값 순서로 찍는다). 시험이
 *      「도수가 오름차순인 판」과 「내림차순인 판」이 둘 다 나오는지 잰다 —
 *      한쪽만 나오면 그 자체가 암시다.
 * ㉶ **D-20 손실 원장은 «재현 가능»해야 한다**(4차 중1 `62W`). → 가드마다
 *    「이 가드 **하나만** 껐을 때」를 전수로 세어 아래에 적었다. 어림한 자리는 없다.
 * ㉷ **내보낸 순수 함수의 주석이 코드와 어긋나면 안 된다**(4차 중3 `solveBoxCases`).
 *    → 굳힘 함수 넷의 단언을 시험이 **손 계산**과 음성 대조로 문다.
 *
 * ## 실측 (씨앗 $220$ × 변형 $3$ = **$660$ 판**, 유형마다)
 *
 * | 키 | 해설 최대 px | 서로 다른 답 | **최빈 정답** | 서로 다른 발문 | 지름길 | 변형 폭(요구 → 실측 최저) |
 * |---|---|---|---|---|---|---|
 * | `77X` | **369** | 68 | $155$ — **6.06%** | 660 | $0/660$ | $5$ → **$5$** |
 * | `78X` | **369** | 157 | $150$ — **5.76%** | 651 | $0/660$ | $8$ → **$8$** |
 * | `79X` | **387** | 104 | $60$ — **3.33%** | 660 | $0/660$ | $12$ → **$12$** |
 * | `80X` | **333** | 136 | $192$ — **2.12%** | 648 | $0/660$ | $12$ → **$12$** |
 *
 * 한 단은 $964.8$px 이고 브리프의 상한은 $700$px 이다 — 가장 큰 것이 $387$px 이라
 * 절반이 남는다. 변형 폭은 **씨앗 $408$개**에서 「같은 씨앗의 변형 $0..n-1$」을 세어
 * **못 채운 씨앗이 넷 다 $0$** 이다. 처음엔 `78X` 가 $16$개, `80X` 가 $5$개 모자랐고
 * 소재(소금물/설탕물)와 사분면 차례를 축으로 더해 $0$ 을 만들었는데, 그 뒤 **농도를
 * $30\%$ 로 좁히자 `78X` 가 다시 $2$ 개** 가 되어 그릇 이름과 양의 범위를 더 넓혔다.
 * ⚠️ 「그릇 이름」은 셈에도 뜻에도 관여하지 않는 **지면 축**이다 — 난이도나 소재의
 * 축으로 읽지 말 것(`VESSELS` 주석 참조).
 *
 * ## 🔴 초등이 네 물결에 걸쳐 물린 함정 셋 — 여기서 어떻게 피했나
 *
 * ㉠ **창을 한쪽 끝만 주면 굳힘이 장식이 된다.** 「살아남는 후보가 언제나 목록의
 *    같은 자리」면 굳힘 조건은 «어느 후보인가»를 한 번도 안 고른다.
 *    → `77X` 는 답이 **살아남은 계급값 전부의 합**이고, 시험이 「어느 자리가 사는가」의
 *      모양이 씨앗을 가로질러 **여러 가지**인지 잰다. `79X` 는 **가장 큰 것과 가장 작은
 *      것의 차**라 양쪽 끝이 다 필요하고, 시험이 `argmax`·`argmin` 이 **넷 다** 나오는지
 *      잰다(실측 네 자리가 모두 나온다).
 *    → `78X`·`80X` 는 후보 목록이 **아예 없다**(값이 하나로 굳는다). 「축이 없다」와
 *      「축이 초록이다」는 다른 말이므로 시험이 그 둘의 ㉠ 을 **«해당 없음»으로 따로
 *      찍고**, 대신 그 유형의 진짜 지름길을 널 모형과 견준다.
 * ㉡ **「굳힘이 항등식」** — 굳힘 인자를 흔들어도 답이 그대로면 장식이다. 넷 다 굳힘을
 *    **인자로 받는 순수 함수**로 뽑아 두었다: `classesAtLeastPercent` ·
 *    `drawnSaltAmount` · `fourTriangleAreas` · `quadrantLatticeCount`.
 *    ⚠️ 그 자가 «아니오»를 낼 수 있음을 **음성 대조**로 보인다 —
 *      백분율 기준을 낮추면 다섯 계급이 **전부** 살아 「전체의 합」과 안 갈리고,
 *      $b$ 를 $a$ 와 같게 두면 덜어낸 양이 소금 $s$ 하나로만 정해지며,
 *      세 점을 한 직선 위에 두면 그 삼각형의 넓이가 **$0$** 이 되며,
 *      $m$ 과 $n$ 을 맞바꾸면 `80X` 의 답이 **그대로**다(곱이라 대칭이다 —
 *      그래서 `80X` 의 흔들기는 맞바꿈이 아니라 **더하기**로 해야 갈린다).
 *      음성 대조가 없으면 그 가드의 «0» 이 «깨끗»인지 «못 셈»인지 안 갈린다(2026-08-21).
 * ㉢ **갈래끼리 겹침** — 위 표의 마지막 칸이 쌍마다 «푸는 절차가 어디서 갈리는가»를
 *    적은 것이다. 🔴 **정직하게 적어 둘 것 둘**:
 *    ⑴ `80X` 는 4차 물결 `61W`(반비례 그래프 위의 자연수 점)와 **출발이 같다** —
 *       「점이 무수히 많다」에서 시작해 성질 하나로 유한하게 접는다. 접는 성질이
 *       다르고($xy=a$ ↔ 축까지의 거리·사분면) 소단원·중단원이 다르지만, 「같은 꼴을
 *       또 냈다」는 판단은 **리드 몫**으로 넘긴다.
 *    ⑵ `77X` 의 「전체의 몇 % 이상인가」는 소단원 «상대도수» 의 개념과 이웃해 있다.
 *       상대도수라는 낱말을 한 번도 쓰지 않고 **백분율로만** 적었지만, 이 사실도
 *       적어 둔다.
 *
 * ## 번호 규약 — **`X` 접미사**
 *
 * `extensionNumberReason`(`src/__tests__/helpers/rpmCatalog.ts`)은 `숫자+영문 대문자
 * 한 글자` 를 「색인 번호와 절대 안 겹친다」로 통과시킨다. 중1에는 이미 `A`(색인 밖
 * 보강)·`T`(1차)·`U`(2차)·`V`(3차)·`W`(4차)가 쓰였으므로 5차 물결은 **`X`** 로
 * 대를 가른다. 번호대는 리드가 갈래마다 구간을 나눠 준 **77~80** 을 그대로 쓴다.
 *
 * ## 계약 (이웃 모듈과 한 벌 — `m1Top.ts`~`m1Top4.ts` 머리말과 같다)
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
// 지면 수 조합 목록을 두 벌로 두지 않는다 — 4차 물결 것을 **읽어만** 온다.
import { pageShortcutValues } from "./m1Top4";
import { euroRo, eulReul, waGwa, iGa } from "./m2Josa";
import type { TypeEntry } from "./types";

const BOOK1 = "1-1";
const BOOK2 = "1-2";
const MINOR_DATA = "도수분포표와 상대도수";
const MINOR_LINEAR = "일차방정식의 활용";
const MINOR_COORD = "좌표와 그래프";

/**
 * 우리 `Unit.section` 정확한 이름.
 *
 * ⚠️ 손으로 적되 **시험이 `prisma/seed-data/units.ts` 정본과 글자 그대로 대조한다**
 * (괄호 안에 쉼표와 빈칸이 섞인 이름이 손으로 적기 쉬운 자리다. 다른 소단원에는
 * **가는 공백 U+2009** 가 든 것도 있어서 눈으로는 안 갈린다).
 */
const SEC = {
  다각형: "도수분포다각형",
  활용도형: "일차방정식의 활용(도형, 농도, 일)",
  좌표응용: "순서쌍과 좌표평면(응용)",
  좌표기본: "순서쌍과 좌표평면(기본)",
} as const;

// ── 소품 ────────────────────────────────────────────────────

/** 보조사 — `$48$은` · `$45$는`. 받침 판정은 `m2Josa` **한 곳**에서 온다. */
function eunNeun(n: number): "은" | "는" {
  return eulReul(n) === "을" ? "은" : "는";
}

/**
 * 개수를 세는 우리말 수관형사 — `세 가지`·`네 가지`.
 *
 * ⚠️ **`$3$가지` 라고 쓰면 안 된다.** 조사 자(`josaMismatches`)는 수 뒤의 `가` 를
 * 주격 조사로 읽어 「$3$가 → $3$이」를 신고한다. 여기서 `가` 는 의존명사 「가지」의
 * 첫 글자라 그 신고는 **거짓 경보**인데, **거짓 경보는 가드를 끈다**(2026-08-20).
 * 자를 무르는 대신 지면에서 우리말 수관형사를 쓴다 — 셈말과 조사가 아예 안 만난다.
 *
 * (`m1Top2.ts`~`m1Top4.ts` 가 같은 까닭으로 같은 소품을 두었다. 쓰는 범위가 달라
 * 저마다 자기 표를 갖는다 — 여기서는 $1$~$5$ 만 필요하다.)
 */
function koreanCount(n: number): string {
  const words: Record<number, string> = {
    1: "한",
    2: "두",
    3: "세",
    4: "네",
    5: "다섯",
  };
  const w = words[n];
  if (w === undefined) throw new Error(`koreanCount: 다루지 않는 수 ${n}`);
  return w;
}

/**
 * 뺄셈 한 도막 — 빼는 수가 음수면 괄호를 친다.
 *
 * ⚠️ 괄호가 없으면 지면에 `$5--3$` 이 나가고 `pageSmells` 의 「`+-` 나 `--` 가
 * 붙었다」가 그것을 잡는다. 값은 맞고 KaTeX 도 초록이라 값 검산으로는 못 본다.
 */
function subTex(a: number, b: number): string {
  return b < 0 ? `${a}-(${b})` : `${a}-${b}`;
}

/** 목록을 `$1$, $2$, $3$` 꼴로. */
function listTex(xs: readonly number[]): string {
  return xs.map((v) => `$${v}$`).join(", ");
}

// ═══════════════════════════════════════════════════════════
// 77X  도수분포다각형에서 도수가 전체의 일정 비율 이상인 계급  (심화상)
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 **굳힘이 없는 자리** — 다섯 계급을 **하나씩 견주어야** 살아남는 것이 나온다.
 *
 * 「도수가 전체의 $p\%$ 이상」은 $f\times100\ge N\times p$ 와 같은 말이다(양변에
 * $100$ 을 곱해 분수를 만들지 않는다 — ㉰). 어느 계급이 사는지는 $N$ 을 먼저 구한
 * 뒤에도 **계급마다 실제로 곱해 견주어야** 안다. 답이 살아남은 것 **전부의 합**이라
 * 하나만 알아서는 못 낸다(D-115 ⑾ 의 «상»).
 *
 * ⚠️ 이 함수는 **굳힘을 인자로 받는다** — `percent` 를 흔들면 살아남는 것이 달라져야
 *    한다(㉡). 그 자가 «아니오»를 낼 수 있음은 시험이 「기준을 낮추면 다섯이 전부
 *    산다」로 보인다(그때는 답이 «계급값의 총합»과 안 갈린다).
 */
export function classesAtLeastPercent(
  classValues: readonly number[],
  frequencies: readonly number[],
  percent: number,
): number[] {
  if (classValues.length !== frequencies.length) {
    throw new Error("classesAtLeastPercent: 계급값과 도수의 개수가 다르다");
  }
  const total = frequencies.reduce((a, b) => a + b, 0);
  const out: number[] = [];
  for (let i = 0; i < classValues.length; i += 1) {
    if (frequencies[i]! * 100 >= total * percent) out.push(classValues[i]!);
  }
  return out;
}

/**
 * 소재와 계급 — 계급값이 **정수**가 되도록 계급의 크기와 첫 계급값을 짝지어 둔다.
 *
 * (계급값)$=$(계급의 양 끝값의 합)$\div2$ 이므로 아무 크기나 쓰면 계급값이 소수가
 * 된다(크기 $5$, 경계 $0,5,10,\dots$ 이면 계급값이 $2.5$ 다). 그래서 크기가 짝수인
 * 것과, 크기가 $10$ 이면서 첫 계급값이 $\dots5$ 인 것만 골랐다.
 */
const POLYGON_TOPICS: readonly {
  readonly stem: string;
  readonly base: number;
  readonly width: number;
}[] = [
  { stem: "통학 시간을", base: 5, width: 10 },
  { stem: "하루 동안 잠을 잔 시간을", base: 3, width: 2 },
  { stem: "국어 점수를", base: 55, width: 10 },
  { stem: "몸무게를", base: 35, width: 10 },
  { stem: "제자리멀리뛰기 기록을", base: 145, width: 10 },
  { stem: "일주일 동안 운동한 시간을", base: 2, width: 4 },
  { stem: "한 달 동안 읽은 책의 수를", base: 3, width: 6 },
  { stem: "공 던지기 기록을", base: 15, width: 10 },
  { stem: "하루 동안 휴대전화를 사용한 시간을", base: 10, width: 20 },
  { stem: "일 년 동안 봉사 활동을 한 시간을", base: 25, width: 10 },
];

/** 기준 백분율 — 살아남는 계급이 셋~넷이 되도록 창을 잡아 두었다. */
const PERCENT_CHOICES: readonly number[] = [15, 18, 20, 22, 25];

const FREQUENCY_POLYGON: TypeEntry[] = [
  defType(
    BOOK2,
    MINOR_DATA,
    "77X",
    "도수분포다각형에서 도수가 전체의 일정 비율 이상인 계급",
    SEC.다각형,
    "심화상",
    (rng): Body =>
      attempt(4000, (): Body | null => {
        const topic = pick(rng, POLYGON_TOPICS);
        const cs = [0, 1, 2, 3, 4].map(
          (i) => topic.base + topic.width * i,
        ) as number[];
        const fs = [0, 1, 2, 3, 4].map(() => intBetween(rng, 2, 20));
        // 도수가 겹치면 「어느 계급이 사는가」가 지면에서 흐려진다.
        if (new Set(fs).size !== 5) return null;
        const total = fs.reduce((a, b) => a + b, 0);
        if (total < 25 || total > 70) return null;
        const percent = pick(rng, PERCENT_CHOICES);
        const alive = classesAtLeastPercent(cs, fs, percent);
        // 🔴 셋 미만이면 답이 **두 지면 수의 합**이라 `pageShortcutValues` 가 곧바로
        //    잡는다(그리고 그건 진짜 지름길이다). 다섯이면 「전부 산다」라 견줌이
        //    장식이 된다. 넷까지만 받는다.
        if (alive.length < 3 || alive.length > 4) return null;
        const x = alive.reduce((a, b) => a + b, 0);
        // 🔴 ㉵ 지면 수 조합이 답을 맞히면 굳힘을 안 읽고도 답이 나온다.
        //    잃은 것(D-20) — 창에서 **40만 번** 뽑아(씨앗 20260903, 아래 셋도 같다)
        //    이 가드 **하나만** 껐을 때 판 **100,677 → 49,531**(50.8%를 버린다) ·
        //    서로 다른 답 **86 → 76**.
        //    ⚠️ 걸림이 절반을 넘는 것은 지면에 수가 **열한 개**(계급값 다섯 · 도수
        //    다섯 · 백분율)라 그 자가 후보를 300개 넘게 만들기 때문이다. 그래서
        //    이 값을 「이 유형이 뻔하다」로 읽으면 안 된다 — 시험이 **널 모형**
        //    (답을 판끼리 돌려 끼운 우연 수준 **28.49%**)을 같이 찍는다.
        if (pageShortcutValues([...cs, ...fs, percent]).has(x)) return null;
        const K = total * percent;
        const lines = [
          `도수의 총합은 $${fs.join("+")}=${total}$(명)이다.`,
          `도수가 전체의 $${percent}\\%$ 이상인 계급은 (그 계급의 도수)$\\times100$이 $${total}\\times${percent}=${K}$ 이상인 계급이므로, 다섯 계급의 (도수)$\\times100$${eulReul(100)} $${K}$${waGwa(K)} 차례로 견준다.`,
        ];
        for (let i = 0; i < 5; i += 1) {
          const f100 = fs[i]! * 100;
          const verdict =
            f100 > K
              ? `이 값은 $${K}$보다 크므로 조건에 맞는다`
              : f100 === K
                ? `이 값은 $${K}$${waGwa(K)} 같으므로 조건에 맞는다`
                : `이 값은 $${K}$보다 작으므로 조건에 맞지 않는다`;
          lines.push(
            `계급값이 $${cs[i]}$인 계급은 도수가 $${fs[i]}$이고 $${fs[i]}\\times100=${f100}$인데, ${verdict}.`,
          );
        }
        lines.push(
          `따라서 조건에 맞는 계급의 계급값은 ${listTex(alive)}의 ${koreanCount(alive.length)} 가지이고, 구하는 값은 $${alive.join("+")}=${x}$이다.`,
        );
        return {
          content:
            `어느 반 학생들의 ${topic.stem} 조사하여 도수분포다각형으로 나타내었다. ` +
            `계급값이 ${listTex(cs)}인 다섯 계급의 도수는 차례로 ${listTex(fs)}이다. ` +
            `도수가 전체의 $${percent}\\%$ 이상인 계급의 계급값을 모두 구하여 그 합을 구하시오.`,
          answer: `$${x}$`,
          solution: lines.join("\n"),
          facts: {
            x,
            total,
            percent,
            k: K,
            alive: alive.length,
            f1: fs[0]!,
            f2: fs[1]!,
            f3: fs[2]!,
            f4: fs[3]!,
            f5: fs[4]!,
            c1: cs[0]!,
            width: topic.width,
          },
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 78X  소금물을 덜어내고 물을 채운 뒤 소금을 더 넣는 문제  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 **굳힘은 이 소단원의 개념 「(소금의 양)$=$(소금물의 양)$\times$(농도)」 하나다.**
 *
 * $a\%$ 의 소금물 $M$ g 에서 $x$ g 을 덜어내면 **농도는 변하지 않으므로** 남은
 * 소금은 $(M-x)\times a\div100$ 이다. 덜어낸 만큼 물을 채우면 소금은 그대로이고
 * 전체가 다시 $M$ 이 되며, 소금 $s$ 를 넣으면 전체는 $M+s$ 다. 그래서
 *
 * ```
 * (M - x) * a / 100 + s = (M + s) * b / 100
 * ⟺ a * x = (a - b) * M + (100 - b) * s
 * ```
 *
 * 가 되어 $x$ 가 **한 번에** 정해진다 — 후보를 하나도 만들지 않는다(D-115 ⑾ 의 «중»).
 *
 * 나누어떨어지지 않으면 `null` 을 낸다(조용히 반올림하지 않는다 — 반올림한 값은
 * 「그럴듯한 오답」이 되어 아무 자도 못 잡는다).
 *
 * ⚠️ 그 자가 «아니오»를 낼 수 있음은 시험이 $b=a$ 인 짝으로 보인다 — 그때 답은
 *    $M$ 과 무관하게 $(100-a)\times s\div a$ 라 **소금물의 양을 안 읽어도** 나온다.
 */
export function drawnSaltAmount(
  a: number,
  mass: number,
  salt: number,
  b: number,
): number | null {
  const numerator = (a - b) * mass + (100 - b) * salt;
  if (numerator % a !== 0) return null;
  const x = numerator / a;
  if (x <= 0 || x >= mass) return null;
  return x;
}

/**
 * 처음·나중 농도 — **$30\%$ 를 넘기지 않는다.**
 *
 * 값이 커도 셈은 되지만 지면이 이상해진다(소금물 $36\%$ 는 실제로 만들 수 없고,
 * 이 저장소의 형제 유형도 $3$~$20\%$ 만 쓴다). 처음에 $45\%$ 까지 열어 두었다가
 * 표본을 눈으로 보고 좁혔다 — 값 검산·냄새 자·KaTeX 는 이 부류를 못 본다.
 */
const SALT_A: readonly number[] = [
  8, 10, 12, 14, 15, 16, 18, 20, 22, 24, 25, 26, 28, 30,
];
const SALT_B: readonly number[] = [
  4, 5, 6, 8, 10, 12, 14, 15, 16, 18, 20, 22, 24, 25, 26, 28, 30,
];

/**
 * 소재 — 농도 문제의 표준 두 가지. 셈은 같지만 지면이 갈린다.
 *
 * 원장님 「도형·소재·유형은 다양할수록 좋다」(문항 다양성 원칙). 여기서는 변형 폭을
 * 넓히는 몫도 겸한다 — 같은 씨앗에서 변형을 여덟 개 뽑을 때 매개변수만으로는
 * 이따금 겹쳤다(실측: 씨앗 408개 중 16개가 여덟을 못 채웠다).
 */
const SOLUTION_TOPICS: readonly {
  readonly solute: string;
  readonly liquid: string;
}[] = [
  { solute: "소금", liquid: "소금물" },
  { solute: "설탕", liquid: "설탕물" },
];

/**
 * 담는 그릇 — 셈에도 뜻에도 관여하지 않는 **지면 축**이다.
 *
 * ⚠️ 이 축은 «문항을 다르게» 만들지 않는다. 오직 **변형 폭**을 넓히려고 둔 것이고,
 * 그렇게 적어 두지 않으면 다음 사람이 이것을 난이도나 소재의 축으로 읽는다.
 * 농도 상한을 $30\%$ 로 좁히면서 잃은 자리를 여기서 메웠다(좁히기 전 실측
 * 「못 채운 씨앗 $0$」이 좁힌 뒤 $2$ 로 늘었다).
 */
const VESSELS: readonly string[] = ["그릇", "비커", "컵"];

const SALT_DRAW: TypeEntry[] = [
  defType(
    BOOK1,
    MINOR_LINEAR,
    "78X",
    "소금물을 덜어내고 물을 채운 뒤 소금을 더 넣는 문제",
    SEC.활용도형,
    "심화중",
    (rng): Body =>
      attempt(4000, (): Body | null => {
        const topic = pick(rng, SOLUTION_TOPICS);
        const vessel = pick(rng, VESSELS);
        const a = pick(rng, SALT_A);
        const b = pick(rng, SALT_B);
        // 🔴 $b=a$ 이면 답이 소금물의 양과 무관해진다(위 주석의 음성 대조 그 자리).
        if (a === b) return null;
        const mass = intBetween(rng, 2, 28) * 25;
        const salt = intBetween(rng, 1, 30) * 5;
        const x = drawnSaltAmount(a, mass, salt, b);
        if (x === null) return null;
        // 지면에 찍히는 소금의 양이 전부 자연수여야 해설이 소수로 새지 않는다.
        if ((a * mass) % 100 !== 0) return null;
        if ((a * (mass - x)) % 100 !== 0) return null;
        if ((b * (mass + salt)) % 100 !== 0) return null;
        // 🔴 ㉵ 지면 수 조합이 답을 맞히면 이 유형은 심화가 아니다.
        //    잃은 것(D-20, 40만 뽑기) — 이 가드 **하나만** 껐을 때
        //    판 **7,131 → 6,219**(12.8%를 버린다) · 서로 다른 답 **252 → 249**.
        //    널 모형(우연) **12.46%** — 걸린 비율이 우연과 거의 같다. 그러니 이 자
        //    하나로 「이 유형이 뻔하지 않다」를 주장하면 안 된다(㉵ 의 한계).
        if (pageShortcutValues([a, mass, salt, b]).has(x)) return null;
        const startSalt = (mass * a) / 100;
        const restSalt = ((mass - x) * a) / 100;
        const totalMass = mass + salt;
        const endSalt = (totalMass * b) / 100;
        const aM = a * mass;
        const hundredSalt = 100 * salt;
        const bT = b * totalMass;
        const ax = a * x;
        return {
          content:
            `$${a}\\%$의 ${topic.liquid} $${mass}\\,\\mathrm{g}$이 담긴 ${vessel}에서 ${topic.liquid}을 얼마쯤 덜어내고, ` +
            `덜어낸 양만큼 물을 넣었다. 여기에 ${topic.solute} $${salt}\\,\\mathrm{g}$을 더 넣고 잘 섞었더니 ` +
            `$${b}\\%$의 ${topic.liquid}이 되었다. 덜어낸 ${topic.liquid}의 양을 구하시오.`,
          answer: `$${x}\\,\\mathrm{g}$`,
          solution: [
            `덜어낸 ${topic.liquid}의 양을 $x\\,\\mathrm{g}$이라 하자.`,
            `처음 ${topic.liquid}에 들어 있는 ${topic.solute}의 양은 $${mass}\\times${a}\\div100=${startSalt}$(g)이다.`,
            `${topic.liquid}을 덜어내어도 농도는 변하지 않으므로, 남은 ${topic.liquid} $(${mass}-x)\\,\\mathrm{g}$에 들어 있는 ${topic.solute}의 양은 $(${mass}-x)\\times${a}\\div100$(g)이다.`,
            `덜어낸 양만큼 물을 넣으면 ${topic.solute}의 양은 그대로이고 ${topic.liquid}의 양만 다시 $${mass}\\,\\mathrm{g}$이 된다.`,
            `여기에 ${topic.solute} $${salt}\\,\\mathrm{g}$을 넣으면 ${topic.liquid}의 양은 $${mass}+${salt}=${totalMass}$(g)이고, 그 $${b}\\%$는 $${totalMass}\\times${b}\\div100=${endSalt}$(g)이다.`,
            `${topic.solute}의 양에 대한 식을 세우면 $(${mass}-x)\\times${a}\\div100+${salt}=${endSalt}$이고, 양변에 $100$${eulReul(100)} 곱하면 $(${mass}-x)\\times${a}+${hundredSalt}=${bT}$이다.`,
            // 🔴 나눗셈을 `$x=\dots$` 안에 두면 **글자가 섞여** 산술 등식 검사가 이
            //    도막을 통째로 건너뛴다. 등식을 갈라 두어야 계산기가 좌우를 셈해 맞댄다.
            `$${mass}\\times${a}=${aM}$이므로 $${a}\\times x$의 값은 $${aM}+${hundredSalt}-${bT}=${ax}$이고, $x$의 값은 $${ax}\\div${a}=${x}$이다.`,
            `따라서 덜어낸 ${topic.liquid}의 양은 $${x}\\,\\mathrm{g}$이다. (남은 ${topic.solute}은 $${restSalt}\\,\\mathrm{g}$이고 $${restSalt}+${salt}=${endSalt}$이므로 맞다.)`,
          ].join("\n"),
          facts: {
            x,
            a,
            b,
            mass,
            salt,
            startSalt,
            restSalt,
            endSalt,
            totalMass,
          },
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 79X  네 점에서 만든 네 삼각형의 넓이의 최대와 최소  (심화상)
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 **굳힘이 없는 자리** — 네 삼각형의 넓이를 **다 계산해 견주어야** 한다.
 *
 * 네 점 $\mathrm{A}(p,t)$, $\mathrm{B}(q,t)$, $\mathrm{C}(r,u)$, $\mathrm{D}(r,v)$
 * 에서 $\mathrm{AB}$ 는 $x$ 축에, $\mathrm{CD}$ 는 $y$ 축에 평행하다. 그래서 네
 * 삼각형이 모두 「좌표축에 평행한 밑변」을 갖고 넓이가 곱셈 한 번으로 나온다 —
 * 그러나 밑변이 둘로 갈리고 높이도 저마다 달라, **어느 것이 크다는 성질이 없다.**
 * 답이 최대와 최소의 **차**라 양쪽 끝을 다 알아야 한다(D-115 ⑾ 의 «상»).
 *
 * 돌려주는 순서는 $\mathrm{ABC}$, $\mathrm{ABD}$, $\mathrm{ACD}$, $\mathrm{BCD}$ 다.
 *
 * ⚠️ 그 자가 «아니오»를 낼 수 있음은 시험이 $u=t$ 인 짝(세 점이 한 직선 위)으로
 *    보인다 — 그때 넓이가 $0$ 이라 「삼각형이 넷」이라는 전제가 깨진다.
 */
export function fourTriangleAreas(
  p: number,
  q: number,
  t: number,
  r: number,
  u: number,
  v: number,
): number[] {
  const ab = Math.abs(q - p);
  const cd = Math.abs(u - v);
  return [
    (ab * Math.abs(u - t)) / 2,
    (ab * Math.abs(v - t)) / 2,
    (cd * Math.abs(r - p)) / 2,
    (cd * Math.abs(r - q)) / 2,
  ];
}

const TRIANGLE_MAXMIN: TypeEntry[] = [
  defType(
    BOOK1,
    MINOR_COORD,
    "79X",
    "네 점에서 만든 삼각형의 넓이의 최대와 최소",
    SEC.좌표응용,
    "심화상",
    (rng): Body =>
      attempt(4000, (): Body | null => {
        const p = intBetween(rng, -9, 9);
        const q = intBetween(rng, -9, 9);
        const t = intBetween(rng, -9, 9);
        const r = intBetween(rng, -9, 9);
        const u = intBetween(rng, -9, 9);
        const v = intBetween(rng, -9, 9);
        // 밑변이 짝수여야 넓이가 정수다(밑변$\times$높이$\div2$).
        if (p === q || Math.abs(q - p) % 2 !== 0) return null;
        if (u === v || Math.abs(u - v) % 2 !== 0) return null;
        // 어느 세 점도 한 직선 위에 있으면 안 된다.
        if (t === u || t === v) return null;
        if (r === p || r === q) return null;
        // 🔴 좌표에 $0$ 이 있으면 지면에 `$8-0=8$` 이 나가고 공용 냄새 자
        //    (`pageSmells` 의 「상수 $0$ 을 더했다」)가 그것을 잡는다. 값은 맞고
        //    KaTeX 도 초록이라 값 검산으로는 못 보는 자리다. 빼는 수는 늘 좌표
        //    가운데 하나이므로 여섯이 모두 $0$ 이 아니면 그 자리가 안 생긴다.
        //    잃은 것(D-20, 40만 뽑기) — 이 가드 **하나만** 껐을 때
        //    판 **31,422 → 23,553**(25.0%를 버린다) · 서로 다른 답 **144 → 144**
        //    (답은 **하나도** 안 잃는다 — 버린 판의 답이 전부 남은 판에도 있다).
        if ([p, q, t, r, u, v].some((c) => c === 0)) return null;
        const areas = fourTriangleAreas(p, q, t, r, u, v);
        // 넓이가 같은 짝이 있으면 「가장 큰 것」·「가장 작은 것」이 흐려진다.
        if (new Set(areas).size !== 4) return null;
        const mx = Math.max(...areas);
        const mn = Math.min(...areas);
        if (mn < 3) return null;
        const x = mx - mn;
        if (x < 5) return null;
        // 🔴 ㉵ 지면 수 조합이 답을 맞히면 굳힘을 안 읽고도 답이 나온다.
        //    잃은 것(D-20, 40만 뽑기) — 이 가드 **하나만** 껐을 때
        //    판 **29,923 → 23,553**(21.3%를 버린다) · 서로 다른 답 **144 → 144**.
        //    널 모형(우연) **12.51%** — 지면에 좌표가 여덟이라 후보가 많다.
        if (pageShortcutValues([p, t, q, t, r, u, r, v]).has(x)) return null;
        const ab = Math.abs(q - p);
        const cd = Math.abs(u - v);
        const hi = (m: number, n: number): number => Math.max(m, n);
        const lo = (m: number, n: number): number => Math.min(m, n);
        const rows: { name: string; line: string }[] = [
          {
            name: "ABC",
            line:
              `삼각형 $\\mathrm{ABC}$의 밑변을 $\\mathrm{AB}$로 보면 높이는 점 $\\mathrm{C}$와 직선 $\\mathrm{AB}$ 사이의 거리인 $${subTex(hi(u, t), lo(u, t))}=${Math.abs(u - t)}$이므로, ` +
              `넓이는 $${ab}\\times${Math.abs(u - t)}\\div2=${areas[0]}$이다.`,
          },
          {
            name: "ABD",
            line:
              `삼각형 $\\mathrm{ABD}$의 밑변을 $\\mathrm{AB}$로 보면 높이는 점 $\\mathrm{D}$와 직선 $\\mathrm{AB}$ 사이의 거리인 $${subTex(hi(v, t), lo(v, t))}=${Math.abs(v - t)}$이므로, ` +
              `넓이는 $${ab}\\times${Math.abs(v - t)}\\div2=${areas[1]}$이다.`,
          },
          {
            name: "ACD",
            line:
              `삼각형 $\\mathrm{ACD}$의 밑변을 $\\mathrm{CD}$로 보면 높이는 점 $\\mathrm{A}$와 직선 $\\mathrm{CD}$ 사이의 거리인 $${subTex(hi(r, p), lo(r, p))}=${Math.abs(r - p)}$이므로, ` +
              `넓이는 $${cd}\\times${Math.abs(r - p)}\\div2=${areas[2]}$이다.`,
          },
          {
            name: "BCD",
            line:
              `삼각형 $\\mathrm{BCD}$의 밑변을 $\\mathrm{CD}$로 보면 높이는 점 $\\mathrm{B}$와 직선 $\\mathrm{CD}$ 사이의 거리인 $${subTex(hi(r, q), lo(r, q))}=${Math.abs(r - q)}$이므로, ` +
              `넓이는 $${cd}\\times${Math.abs(r - q)}\\div2=${areas[3]}$이다.`,
          },
        ];
        return {
          content:
            `좌표평면 위에 네 점 $\\mathrm{A}(${p},\\ ${t})$, $\\mathrm{B}(${q},\\ ${t})$, ` +
            `$\\mathrm{C}(${r},\\ ${u})$, $\\mathrm{D}(${r},\\ ${v})$${iGa(v)} 있다. ` +
            `이 중에서 세 점을 골라 만든 삼각형의 넓이 가운데 가장 큰 값과 가장 작은 값의 차를 구하시오. ` +
            `(단, 어느 세 점도 한 직선 위에 있지 않다.)`,
          answer: `$${x}$`,
          solution: [
            // 🔴 「$\mathrm{A}$」 뒤의 조사는 **글자**를 읽는다(「에이」) — 수 조사
            //    함수(`waGwa`)를 쓰면 좌표의 받침으로 정해져 「$\mathrm{A}$과」가
            //    나간다. 공용 조사 자는 이 자리를 못 본다(수로 안 끝난다).
            `두 점 $\\mathrm{A}$와 $\\mathrm{B}$는 $y$좌표가 $${t}$${euroRo(t)} 같으므로 선분 $\\mathrm{AB}$는 $x$축에 평행하고, 그 길이는 $${subTex(hi(p, q), lo(p, q))}=${ab}$이다.`,
            `두 점 $\\mathrm{C}$와 $\\mathrm{D}$는 $x$좌표가 $${r}$${euroRo(r)} 같으므로 선분 $\\mathrm{CD}$는 $y$축에 평행하고, 그 길이는 $${subTex(hi(u, v), lo(u, v))}=${cd}$이다.`,
            ...rows.map((row) => row.line),
            `네 삼각형의 넓이는 차례로 ${listTex(areas)}이므로 이 가운데 $${mx}$${eunNeun(mx)} 가장 크고 $${mn}$${eunNeun(mn)} 가장 작다.`,
            `따라서 구하는 차는 $${mx}-${mn}=${x}$이다.`,
          ].join("\n"),
          facts: {
            x,
            p,
            q,
            t,
            r,
            u,
            v,
            ab,
            cd,
            mx,
            mn,
            argmax: areas.indexOf(mx),
            argmin: areas.indexOf(mn),
          },
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 80X  축까지의 거리가 제한된 격자점 중 두 사분면 위의 점  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * 사분면마다 두 좌표의 부호 — `true` 면 양수다. 차례로 $x$좌표, $y$좌표.
 *
 * 이 표가 곧 이 소단원의 개념이고, 아래 `quadrantLatticeCount` 는 이것**만** 본다.
 */
const QUADRANT_SIGNS: Record<number, readonly [boolean, boolean]> = {
  1: [true, true],
  2: [false, true],
  3: [false, false],
  4: [true, false],
};

/** 두 사분면을 고르는 여섯 가지 — 어느 짝이든 각 사분면의 점 수는 같다. */
const QUADRANT_PAIRS: readonly (readonly [number, number])[] = [
  [1, 2],
  [1, 3],
  [1, 4],
  [2, 3],
  [2, 4],
  [3, 4],
];

/**
 * 🔴 **굳힘은 이 소단원의 개념 둘이다 — 점을 하나도 나열하지 않는다.**
 *
 * ⑴ ($x$축까지의 거리)$=$($y$좌표의 절댓값)이고 ($y$축까지의 거리)$=$($x$좌표의
 *    절댓값)이므로, 「$x$축까지 $m$ 이하 · $y$축까지 $n$ 이하」는 곧
 *    「$y$좌표가 $-m$ 부터 $m$ 까지 · $x$좌표가 $-n$ 부터 $n$ 까지」다.
 *    무수히 많던 점이 **유한한 두 정수 구간**으로 접힌다.
 * ⑵ 사분면 위의 점은 **두 좌표가 모두 $0$이 아니다.** 그래서 어느 사분면에서든
 *    $x$좌표가 $n$ 가지($1\dots n$ 또는 $-n\dots-1$) · $y$좌표가 $m$ 가지이고,
 *    점은 $m\times n$ 개다 — **$0$ 인 좌표를 애초에 세지 않으므로** 축 위의 점을
 *    나중에 뺄 일이 없다.
 *
 * 그러므로 서로 다른 두 사분면이면 **어느 짝이든** 답이 $2mn$ 이다 — 곱 하나로
 * 끝난다(D-115 ⑾ 의 «중»). 여기 넘기는 $m$·$n$ 은 **이미 «이하»로 바꾼** 값이다
 * (발문이 「미만」이면 부르는 쪽이 $1$ 을 빼서 넘긴다 — 그 걸음은 지면의 몫이다).
 *
 * ⚠️ 그 자가 «아니오»를 낼 수 있음은 시험이 두 가지로 보인다 —
 *    ㉠ $m$ 과 $n$ 을 **맞바꾸면 답이 그대로**다(곱이라 대칭이다). 그래서 흔들기는
 *      맞바꿈이 아니라 **더하기**로 해야 갈린다.
 *    ㉡ 두 사분면이 **같으면** 답이 절반이다(겹치지 않는다는 근거가 그때 거짓이 된다).
 */
export function quadrantLatticeCount(
  m: number,
  n: number,
  quadrants: readonly number[],
): number {
  if (!Number.isInteger(m) || !Number.isInteger(n) || m < 1 || n < 1) {
    throw new Error(`quadrantLatticeCount: 자연수여야 합니다 — ${m}, ${n}`);
  }
  const distinct = new Set(quadrants);
  for (const q of distinct) {
    if (QUADRANT_SIGNS[q] === undefined) {
      throw new Error(`quadrantLatticeCount: 사분면이 아니다 — ${q}`);
    }
  }
  return distinct.size * m * n;
}

/** 「$1$부터 $k$까지」 또는 「$-k$부터 $-1$까지」 — 부호가 정하는 지면 글자. */
function signedRangeTex(k: number, positive: boolean): string {
  return positive ? `$1$부터 $${k}$까지` : `$-${k}$부터 $-1$까지`;
}

const LATTICE_QUADRANT: TypeEntry[] = [
  defType(
    BOOK1,
    MINOR_COORD,
    "80X",
    "축까지의 거리가 제한된 격자점 중 두 사분면 위의 점의 개수",
    SEC.좌표기본,
    "심화중",
    (rng): Body =>
      attempt(4000, (): Body | null => {
        const mSaid = intBetween(rng, 3, 26);
        const nSaid = intBetween(rng, 3, 26);
        // 「이하」와 「미만」을 둘 다 쓴다 — 「거리가 $k$ 미만인 정수 좌표」는
        // 「절댓값이 $k-1$ 이하」라는 걸음이 하나 더 든다(그 자체가 이 소단원의 함정).
        const mStrict = rng() < 0.5;
        const nStrict = rng() < 0.5;
        const m = mStrict ? mSaid - 1 : mSaid;
        const n = nStrict ? nSaid - 1 : nSaid;
        if (m < 2 || n < 2) return null;
        // 답이 $2mn$ 이므로 곱을 묶어 두면 답이 지나치게 커지지 않는다(최대 $520$).
        if (m * n > 260) return null;
        const [qa, qb] = pick(rng, QUADRANT_PAIRS);
        // 두 사분면을 적는 차례도 뒤집는다 — 「제$3$사분면 또는 제$1$사분면」도
        // 자연스러운 우리말이고, 변형 폭이 그만큼 넓어진다(같은 씨앗에서 열둘을
        // 뽑을 때 매개변수만으로는 이따금 겹쳤다).
        const flipped = rng() < 0.5;
        const q1 = flipped ? qb : qa;
        const q2 = flipped ? qa : qb;
        const x = quadrantLatticeCount(m, n, [q1, q2]);
        // 🔴 ㉵ 지면 수 조합이 답을 맞히면 이 유형은 심화가 아니다.
        //    잃은 것(D-20, 40만 뽑기) — 이 가드 **하나만** 껐을 때
        //    판 **284,907 → 280,357**(1.6%를 버린다) · 서로 다른 답 **141 → 141**.
        //    ⚠️ **1.6% 밖에 안 버린다.** 「일하는 가드」로 읽지 말 것 — 지면의 수가
        //    넷($m$·$n$·두 사분면 번호)뿐이라 그 자가 만드는 후보가 스무 개 남짓이고,
        //    널 모형(우연)도 **2.42%** 밖에 안 된다. 시험이 그 사실을 찍는다.
        if (pageShortcutValues([mSaid, nSaid, q1, q2]).has(x)) return null;
        const [xPos1, yPos1] = QUADRANT_SIGNS[q1]!;
        const [xPos2, yPos2] = QUADRANT_SIGNS[q2]!;
        const quarter = m * n;
        const boundLine = (
          axis: "x" | "y",
          coord: "a" | "b",
          said: number,
          strict: boolean,
          eff: number,
        ): string =>
          strict
            ? `$${axis}$축까지의 거리가 $${said}$ 미만이므로 $${coord}$의 절댓값은 $${said}$보다 작은 정수, 즉 $${eff}$ 이하이다`
            : `$${axis}$축까지의 거리가 $${said}$ 이하이므로 $${coord}$의 절댓값은 $${eff}$ 이하이다`;
        const quadrantLine = (
          q: number,
          xPos: boolean,
          yPos: boolean,
        ): string =>
          `제$${q}$사분면 위의 점은 $x$좌표가 ${xPos ? "양수" : "음수"}이고 $y$좌표가 ${yPos ? "양수" : "음수"}이므로, ` +
          `$a$는 ${signedRangeTex(n, xPos)}의 $${n}$개이고 $b$는 ${signedRangeTex(m, yPos)}의 $${m}$개이다. ` +
          `그러한 점은 $${n}\\times${m}=${quarter}$(개)이다.`;
        return {
          content:
            `$x$좌표와 $y$좌표가 모두 정수인 점 중에서 $x$축까지의 거리가 $${mSaid}$ ${mStrict ? "미만" : "이하"}이고 ` +
            `$y$축까지의 거리가 $${nSaid}$ ${nStrict ? "미만" : "이하"}이며, ` +
            `제$${q1}$사분면 또는 제$${q2}$사분면 위에 있는 점의 개수를 구하시오.`,
          answer: `$${x}$개`,
          solution: [
            `점 $\\mathrm{P}(a,\\ b)$에서 $x$축까지의 거리는 $y$좌표의 절댓값과 같고, $y$축까지의 거리는 $x$좌표의 절댓값과 같다.`,
            `${boundLine("x", "b", mSaid, mStrict, m)}. 또 ${boundLine("y", "a", nSaid, nStrict, n)}.`,
            `사분면 위의 점은 두 좌표가 모두 $0$이 아니므로 $a$는 $0$일 수 없고 $b$도 $0$일 수 없다.`,
            quadrantLine(q1, xPos1, yPos1),
            quadrantLine(q2, xPos2, yPos2),
            `두 사분면 위의 점은 겹치지 않으므로 구하는 점의 개수는 $${quarter}$${waGwa(quarter)} $${quarter}$의 합인 $${quarter}+${quarter}=${x}$(개)이다.`,
          ].join("\n"),
          facts: {
            x,
            m,
            n,
            mSaid,
            nSaid,
            quarter,
            q1,
            q2,
            mStrict: mStrict ? 1 : 0,
            nStrict: nStrict ? 1 : 0,
          },
        };
      }),
  ),
];

/** 5차 물결 갈래 d — 중1 소단원 넷. 등록(`generate.ts`)은 리드 몫이다. */
export const M1_TOP_5D: TypeEntry[] = [
  ...FREQUENCY_POLYGON,
  ...SALT_DRAW,
  ...TRIANGLE_MAXMIN,
  ...LATTICE_QUADRANT,
];
