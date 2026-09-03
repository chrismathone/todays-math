/**
 * 중1 **5차 확대 갈래 — 갈래 `e`** — `심화중`·`심화상` 넷을 더한다 (D-116, 2026-09-03).
 *
 * ## 왜 또 새 파일인가
 *
 * `m1Top.ts`~`m1Top4.ts` 는 각각 자기 유형을 **개수로 얼린** 시험을 달고 있다
 * (`expect(M1_TOP_4).toHaveLength(4)` 따위). 거기에 유형을 더하면 그 가드가 빨개지고,
 * 초록으로 되돌리는 유일한 길이 **가드를 무르는 것**이 된다. 그리고 5차 물결은
 * **21갈래가 동시에** 도므로 남의 파일을 만지면 말없이 덮어쓴다(2026-08-23
 * 「미커밋 새 파일이 가장 약한 고리」). 새 파일 하나 + `generate.ts` **spread 한 줄**이면
 * 그 둘을 다 피한다. 등록은 리드 몫이다.
 *
 * 규칙을 두 벌로 두지 않으려고 `m1Top3.ts` 의 `factorTex` 와 `m1Top4.ts` 의
 * `divisorsOf`·`pageShortcutValues` 를 **읽어만 온다**(고치지 않는다).
 *
 * ## 무엇이 «중»이고 무엇이 «상»인가 — `m1Top.ts` 머리말의 그 자
 *
 * ```
 * 심화중  마디 하나가 안 굳고, **그 소단원의 개념**이 그것을 굳힌다.
 *         성질 하나가 후보를 «끝까지 계산하지 않고» 거른다.        (D-115 ⑾)
 * 심화상  성질로 못 굳혀 후보를 **다 만들어 견줘야** 한다.
 * ```
 *
 * | 키 | 갈래 | 안 굳는 마디 | 무엇이 굳히나 | 같은 소단원 아래 갈래와 무엇이 다른가 |
 * |---|---|---|---|---|
 * | `평행선\|81X` | **심화상** | 두 밑각 $b^\circ$, $d^\circ$ — 합만 알 뿐 각각은 안 정해진다 | 굳지 **않는다**. 「$d$ 가 $b$ 를 몇 번 채우고 $r^\circ$ 가 남는다」는 $d$ 를 하나로 정해 주지 않는다 — $180-c-r$ 의 **약수를 다 만들어** $d>r$ 인지, $d$ 자신이 아닌지를 하나씩 견줘야 한다 | 형제 `11`~`20` 은 전부 **각의 크기 하나**를 묻고 값이 한 줄로 나온다(`16`·`20` 은 `심화하`인데도 보조선 한 번이면 끝난다). `81X` 만 「가능한 것을 모두」를 묻는다 |
 * | `부채꼴의 호의 길이와 넓이\|82X` | **심화중** | 중심각 $x^\circ$ — 넓이도 호의 길이도 그것을 품고 있어 따로는 안 정해진다 | 이 소단원의 개념 「(부채꼴의 넓이)$=\dfrac12\times$(반지름)$\times$(호의 길이)」 **하나**가 굳힌다. 중심각을 **한 번도 계산하지 않고** 반지름이 먼저 나온다(D-115 ⑾) | 형제 `09`~`18` 은 반지름과 중심각을 **둘 다 주고** 공식을 한두 번 쓴다. `82X` 만 **둘 다 안 준다** |
 * | `방정식과 그 해\|83X` | **심화중** | 상수 $a$, $b$ — 미지수 둘에 조건 둘이지만 학생은 연립을 모른다 | 이 소단원의 개념 「해는 좌변의 값을 $0$ 으로 만드는 $x$」와 「일차식은 $x$ 가 $1$ 커질 때마다 같은 양만큼 변한다」가 굳힌다. **$b$ 를 끝까지 구하지 않는다** | 형제 `01`~`05`·`32`~`34`·`90`·`91` 은 등식·항등식·해를 **판정**하거나 계수를 직접 읽는다. `83X` 만 계수가 **둘 다 감춰져** 있다 |
 * | `그래프의 이해\|84X` | **심화상** | 「높이가 $d\,\mathrm{m}$ 가 되는 때」 — 그래프가 오르내려 몇 번인지조차 모른다 | 굳지 **않는다**. 네 선분을 **하나씩** 짚어 $d$ 가 그 구간의 두 끝 사이에 드는지 보고, 드는 구간마다 시각을 따로 구해 견줘야 한다 | 형제 `20`~`25`·`07`~`11` 은 좌표를 읽거나 변화량을 한 번 세거나 두 그래프를 견준다. `84X` 만 **같은 높이가 여러 번** 나온다 |
 *
 * ## 🔴 앞 물결이 실제로 낸 결함 — 여기서 어떻게 막았나
 *
 * ㉮ **해설이 정답지 한 단(964.8px)을 넘었다**(3차 중1 `53V`, 최대 1242px). 넘치면 그 쪽
 *    **다른 문항의 해설이 통째로 사라진다**(`column-count:2` + `overflow:hidden`).
 *    → 넷 다 **훑는 자리에 상한**을 두었다 — `81X` 는 약수가 **14개 이하**인 수만 쓰고
 *      살아남는 것이 **3~6개**, `84X` 는 선분이 늘 **넷**이다. 시험이 제품
 *      `estimateSolutionPx` 로 660판에서 **700px 미만**을 잠근다.
 *      ⚠️ 줄이는 길이 「걸음 지우기」이면 안 된다(D-116 ⑹) — 후보마다 «왜 살고 죽는지»는
 *      그대로 두고 **훑는 범위**만 줄였다.
 * ㉯ **해설이 「자연수」 걸음을 건너뛰었다**(3차 중2 `38V`). → `81X` 는 부등식을 풀지 않고
 *    「$q+1$ 이 $2$ 이상이므로 $d$ 는 $N$ 자신이 될 수 없다」로 **약수 하나만** 떨궈 낸다.
 *    나머지 셋에는 정수로 뛰는 걸음이 아예 없다.
 * ㉰ **해설이 기약이 아닌 분수를 찍었다**(3차 중1 `52V`, 17.5%).
 *    → 지면의 수 분수는 `82X` 의 $\dfrac{1}{2}$ **판마다 두 자리**뿐이고 그것은 정의상
 *      기약이다(넓이 관계 줄과 그 다음 줄). 나머지 나눗셈은 전부 `\div` 로 적는다 —
 *      `\dfrac{180}{360}` 처럼 안 줄인 분수가 지면에 나올 자리를 아예 안 만든다.
 *      시험이 지면의 모든 분수를 훑어 다시 재고, **찾은 자리 수까지**(`82X` 220판에서
 *      440, 나머지 셋은 0) 못 박는다 — 「0건」이 «깨끗»인지 «못 셈»인지 가르려고.
 * ㉱ **발문이 스스로 못 박은 상한을 오답이 넘었다**(4차 중2 `37W`, 51.7%).
 *    → 넷 다 「전체를 $1$ 로 놓고」류의 상한을 **선언하지 않는다**(`declaredUpperBound`
 *      가 넷 전량에서 `null` 인 것을 시험이 확인한다). 새 상한 표현을 안 썼다.
 * ㉲ **정답이 «구간»이면 파생 오답이 뒤집힌다**(3차 중2 `35V`, 13.1%). → 넷 다 정답이
 *    **한 수**이고, 시험이 660판에서 5지선다가 실제로 만들어지는 것을 확인한다.
 * ㉳ **해설의 «말»을 지키는 시험이 없었다**(4차, 중1 10줄·중2 3줄이 무방비).
 *    → 시험이 「약수↔배수」·「엇각↔동위각」·「절반↔두 배」·「작으므로↔크므로」를
 *      맞바꾸면 빨개지도록 **낱말 자체를 판정**한다(양성 12 · 음성 4).
 * ㉴ **지면이 자기가 한 줄 앞에 세운 제약을 스스로 어긴다**(4차 중3 `55W`, 100%).
 *    → `81X` 는 「$d>r$」·「$d\ne N$」을 선언한 **뒤** 그 둘을 실제로 적용한 목록만 적고,
 *      시험이 「적힌 목록의 모든 원소가 그 둘을 만족하는가」를 따로 잰다.
 * ㉵ **자료를 정렬해 찍으면 «보이는 자리»가 순위를 암시한다**(4차 중1 `63W`, 100%).
 *    → 넷 중 자료를 늘어놓는 것은 `84X` 뿐인데 그것은 **그래프의 꼭짓점**이라 시간순이
 *      곧 뜻이다(섞으면 그래프가 아니다). 그리고 순위를 암시할 «빈자리»가 없다.
 * ㉶ **D-20 손실 원장은 «재현 가능»해야 한다**(4차 중1 `62W`). → 가드마다 「이 가드
 *    **하나만** 켰을 때」의 판 수와 답 수를 아래에 적었다. 어림한 자리는 하나도 없다.
 *    분모는 유형마다 다르고 그것을 함께 적었다 — `81X`(창 전수 **530**)·`82X`(창 전수
 *    **2,175**)는 창을 다 셌고, `83X`·`84X` 는 창이 수만~수백만이라 **표본 20,000판**을
 *    썼다. 「판 수와 답 수의 측정점」은 같은 자리로 맞췄다(한 행에 두 측정점을 안 섞는다).
 *    재는 판은 `scripts` 밖 임시 자에 있었고, 같은 셈을 시험이
 *    「지름길이 우연 수준과 얼마나 다른가」로 다시 돌린다.
 * ㉷ **내보낸 순수 함수의 주석이 코드와 어긋나면 안 된다**(4차 중3 `solveBoxCases`).
 *    → 아래 넷(`splitAngleDivisors`·`sectorFromAreaAndArc`·`solveFromTwoValues`·
 *      `heightCrossings`)의 단언은 전부 시험이 다시 잰다.
 * ㉸ 우리말 — 「그중」은 붙여 쓴다. 조사는 지면에 **찍히는 글자**로 정한다.
 *
 * ## 실측 요약 (씨앗 220 × 변형 3 = **660판**, 제품 후처리를 그대로 태운 지면)
 *
 * | 유형 | 갈래 | 해설 최대 | 최빈 정답 | 서로 다른 정답 | 지름길 | 우연 수준 | 변형 폭 |
 * |---|---|---|---|---|---|---|---|
 * | `81X` | 심화상 | **440px** | 4.70% | 82 | 2.26% | 1.07% | 5/5 (씨앗 400 중 98.8%) |
 * | `82X` | 심화중 | **385px** | 1.36% | 195 | 8.18% | 7.56% | 8/8 (99.3%) |
 * | `83X` | 심화중 | **369px** | 5.61% | 28 | 19.65% | 24.32% | 12/12 (100%) |
 * | `84X` | 심화상 | **565px** | 4.55% | 70 | 53.50% | 46.74% | 12/12 (100%) |
 *
 * 한 단은 964.8px 이고 브리프의 상한은 700px 이다 — 가장 큰 것이 **565px** 이다.
 * 「지름길」은 「지면 수 조합이 답과 부딪히는 판의 비율」이고 「우연 수준」은 그 답을
 * **판끼리 돌려 끼웠을 때**의 같은 비율이다(널 모형 세 자리의 평균). 넷 다 그 둘이
 * 같은 자리에 있거나(82X·84X) 실측이 우연보다 낮으며(83X), `81X` 만 우연의 2.1배라
 * 그 가드가 실제로 일한다. **네 유형 다 그 판을 버리므로 산출물의 지름길은 0** 이다.
 *
 * ## ㉠ 창이 한쪽 끝만인가 — 굳힘이 «어느 후보인가»를 고르나
 *
 * `81X`·`84X` 는 후보 목록이 있다. 둘 다 답이 **살아남은 것 전부의 합**이다
 * (「가장 큰 것」으로 물으면 살아남는 것이 늘 목록의 끝이라 초6 두 갈래를 막았던
 * 함정이 그대로 태어난다). 그리고 살아남는 **자리**가 씨앗을 가로질러 갈린다 —
 * `84X` 는 $d$ 가 $C$ 보다 작으냐, $C$ 와 $A$ 사이냐, $A$ 보다 크냐에 따라
 * 살아남는 선분이 $\{1,4\}$ · $\{1,2,3,4\}$ · $\{3,4\}$ 로 **셋으로 갈린다.**
 * `82X`·`83X` 는 후보 목록이 **아예 없다**(값이 하나로 굳는다). 「축이 없다」와
 * 「축이 초록이다」는 다른 말이므로 시험이 그 둘을 **«해당 없음»으로 따로 찍는다.**
 *
 * ## ㉡ 굳힘이 항등식인가 — 흔들면 답이 달라지나
 *
 * 넷 다 굳힘을 **인자로 받는 순수 함수**로 뽑아 두었다. ⚠️ 그 자가 «아니오»를 낼 수
 * 있음을 **음성 대조**로 보인다 — `splitAngleDivisors` 는 $r$ 을 흔들어도 답이 그대로인
 * 짝이 실재하고($c$ 와 $r$ 을 함께 옮기면 $N$ 이 같다), `sectorFromAreaAndArc` 는
 * 넓이와 호를 같은 배로 키우면 반지름이 그대로이며, `heightCrossings` 는 $d$ 가
 * $B$ 보다 크면 **살아남는 선분이 하나도 없다**(빈 집합). 음성 대조가 없으면 그 가드의
 * «0» 이 «깨끗»인지 «못 셈»인지 안 갈린다(2026-08-21).
 *
 * ## ㉢ 겹침 — 정직하게 적어 둘 것
 *
 * `81X` 는 4차 `61W`(약수의 합)와 **약수를 쓰는 뼈대가 닮았다.** 소단원·책·소재가 다르고
 * (`61W` 는 반비례 그래프의 격자점, 이쪽은 평행선과 각), `61W` 는 약수를 **하나도 걸러
 * 내지 않고 전부** 더하는 데 견주어 `81X` 는 **두 조건으로 걸러 낸 뒤** 더한다. 그래도
 * 「약수를 또 냈다」는 판단은 **리드 몫**으로 넘긴다.
 *
 * ## 번호 규약 — **`X` 접미사**
 *
 * `extensionNumberReason`(`src/__tests__/helpers/rpmCatalog.ts`)은 `숫자+영문 대문자
 * 한 글자` 를 「색인 번호와 절대 안 겹친다」로 통과시킨다. 중1에는 이미 `A`(색인 밖
 * 보강)·`T`(1차)·`U`(2차)·`V`(3차)·`W`(4차)가 쓰였으므로 5차 물결은 **`X`** 로 대를
 * 가른다(실측: 등록 중1 유형의 접미사는 `A T U V W` 다). 번호대는 물결마다 열을 올려
 * 왔으므로(4x → 6x) **8x** 를 쓴다 — 갈래마다 구간을 나눠 이 갈래는 `81X`~`84X` 다.
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
// 소인수분해 지면 글자를 두 벌로 두지 않는다 — 3차 물결 것을 **읽어만** 온다.
import { factorTex } from "./m1Top3";
// 약수 목록과 「지면 수로 만드는 뻔한 한 수」도 4차 물결 것을 그대로 쓴다.
import { divisorsOf, pageShortcutValues } from "./m1Top4";
import { eulReul } from "./m2Josa";
import type { TypeEntry } from "./types";

const BOOK1 = "1-1";
const BOOK2 = "1-2";
const MINOR_POS = "위치 관계";
const MINOR_CIRCLE = "원과 부채꼴";
const MINOR_LINEAR = "일차방정식의 풀이";
const MINOR_COORD = "좌표와 그래프";

/**
 * 우리 `Unit.section` 정확한 이름.
 *
 * ⚠️ 손으로 적되 **시험이 `prisma/seed-data/units.ts` 정본과 글자 그대로 대조한다.**
 * 눈으로는 안 갈리는 자리가 있다(가는 공백 U+2009 가 든 소단원이 실재한다).
 */
const SEC = {
  평행선: "평행선",
  부채꼴: "부채꼴의 호의 길이와 넓이",
  방정식해: "방정식과 그 해",
  그래프이해: "그래프의 이해",
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

/** 접속 조사 — `$60$과`·`$12$와`. 역시 `m2Josa` 를 되쓴다. */
function waGwaFor(n: number): "와" | "과" {
  return eulReul(n) === "을" ? "과" : "와";
}

/**
 * 개수를 세는 우리말 수관형사 — `세 개`·`여덟 개`.
 *
 * ⚠️ **`$3$개` 라고 써도 되지만 `$3$가지` 는 안 된다** — 조사 자(`josaMismatches`)가
 * 수 뒤의 `가` 를 주격 조사로 읽어 「$3$가 → $3$이」를 신고하고, **거짓 경보는 가드를
 * 끈다**(2026-08-20). 여기서는 아예 셈말과 조사가 안 만나게 우리말 수관형사를 쓴다.
 *
 * (`m1Top2`~`m1Top4` 가 같은 까닭으로 같은 소품을 두었다. 그것들은 쓰는 범위가 서로
 * 달라 `export` 하지 않았고, 여기서 필요한 범위도 또 다르다 — $1$~$16$.)
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
    13: "열세",
    14: "열네",
    15: "열다섯",
    16: "열여섯",
  };
  const w = words[n];
  if (w === undefined) throw new Error(`koreanCount: 다루지 않는 수 ${n}`);
  return w;
}

/** 목록을 `$1$, $2$, $3$` 꼴로. */
function listTex(xs: readonly number[]): string {
  return xs.map((v) => `$${v}$`).join(", ");
}

/** 식 안에 놓을 수 — 음수면 괄호로 싼다(`9-(-6)` 은 되고 `9--6` 은 안 된다). */
function parenNum(v: number): string {
  return v < 0 ? `(${v})` : `${v}`;
}

/** 더하기 꼬리 — `+3` / `-3`. `+0` 은 나오지 않게 부르는 쪽이 막는다. */
function addTail(v: number): string {
  return v < 0 ? `-${-v}` : `+${v}`;
}

// ═══════════════════════════════════════════════════════════
// 81X  평행선으로 두 밑각의 합을 굳히고 조건에 맞는 각을 모두 찾기  (심화상)
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 **굳지 않는 마디를 «후보를 다 만들어» 견주는 자리.**
 *
 * 두 밑각을 $b^\circ$, $d^\circ$ 라 하면 평행선의 성질로 $b+d=180-c$ 뿐이다. 여기에
 * 「크기가 $d^\circ$ 인 각을 여러 개 이어 붙여 $b^\circ$ 를 채웠더니 $r^\circ$ 가 남았다」를
 * 얹으면 $b=d\times q+r$ 이고, $b=(180-c)-d$ 를 넣어 정리하면
 *
 * ```
 * (180 - c - r) = d \times (q + 1)
 * ```
 *
 * 이므로 $d$ 는 $N=180-c-r$ 의 **약수**다. 그런데 어느 약수인지는 정해지지 않는다 —
 * 나머지의 뜻으로 $d>r$ 이어야 하고, $q$ 가 자연수이므로 $q+1\ge2$, 곧 $d$ 는 $N$
 * 자신이 될 수 없다. **약수를 다 만들어 그 둘을 하나씩 견주는 것 말고 길이 없다.**
 *
 * ⚠️ 이 함수는 **굳힘을 인자로 받는다** — $N$ 이나 $r$ 을 흔들면 답이 달라져야 한다(㉡).
 *    그 자가 «아니오»를 낼 수 있음은 시험이 「$c$ 와 $r$ 을 함께 옮겨 $N$ 이 같은 짝」으로
 *    보인다(그때는 답이 그대로다 — 굳힘은 $c$ 와 $r$ 이 아니라 그 **차**에 걸린다).
 *
 * 돌려주는 것은 **작은 것부터 늘어놓은 $d$ 의 값 전부**다.
 */
export function splitAngleDivisors(n: number, r: number): number[] {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`splitAngleDivisors: $N$ 은 자연수여야 합니다 — ${n}`);
  }
  if (!Number.isInteger(r) || r < 0) {
    throw new Error(`splitAngleDivisors: $r$ 는 $0$ 이상이어야 합니다 — ${r}`);
  }
  return divisorsOf(n).filter((d) => d > r && d !== n);
}

/**
 * 🔴 **이 유형의 진짜 지름길** — 지면에 수가 $c$ 와 $r$ **둘**뿐이라
 * `pageShortcutValues([c, r])` 가 만드는 후보가 적다. 그래서 「$180$ 과 그 둘로
 * 한두 번 셈한 값」을 따로 세어 막는다. $180$ 은 지면에 없지만 학생이 아는 수다.
 */
export function angleShortcutValues(c: number, r: number): Set<number> {
  const out = new Set<number>();
  const base = [c, r, 180, 180 - c, 180 - c - r];
  for (const v of base) out.add(v);
  for (let i = 0; i < base.length; i += 1) {
    for (let j = 0; j < base.length; j += 1) {
      if (i === j) continue;
      const a = base[i]!;
      const b = base[j]!;
      out.add(a + b);
      out.add(a - b);
      out.add(a * b);
      if (b !== 0 && a % b === 0) out.add(a / b);
    }
  }
  return out;
}

/**
 * 쓸 수 있는 $(c, r)$ 짝 — **창을 여기서 못 박는다**(㉮ 해설 길이).
 *
 * 약수가 **14개 이하**여야 나열 줄이 한 줄에 들어가고, 살아남는 것이 **3~6개**여야
 * 「모두 구하여 그 합」이 무색하지 않으면서 해설이 안 넘친다.
 * 실측: $c\in[20,150]$ · $r\in[1,40]$ 에서 **530짝**(서로 다른 답 106).
 */
const SPLIT_ANGLE_CASES: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  for (let c = 20; c <= 150; c += 1) {
    for (let r = 1; r <= 40; r += 1) {
      const n = 180 - c - r;
      if (n < 10) continue;
      const divs = divisorsOf(n);
      if (divs.length > 14) continue;
      const alive = splitAngleDivisors(n, r);
      if (alive.length < 3 || alive.length > 6) continue;
      out.push([c, r]);
    }
  }
  return out;
})();

const SPLIT_ANGLE: TypeEntry[] = [
  defType(
    BOOK2,
    MINOR_POS,
    "81X",
    "평행선의 성질로 두 각의 크기의 합을 굳히고 조건에 맞는 각을 모두 찾기",
    SEC.평행선,
    "심화상",
    (rng): Body =>
      attempt(2000, (): Body | null => {
        const [c, r] = pick(rng, SPLIT_ANGLE_CASES);
        const s = 180 - c;
        const n = s - r;
        const divs = divisorsOf(n);
        const alive = splitAngleDivisors(n, r);
        const x = alive.reduce((a, b) => a + b, 0);
        // 🔴 ㉵ 「$180$ 과 지면의 두 수로 한두 번 셈한 값」이 답이면 심화가 아니다.
        //    잃은 것(창 전수 530, D-20 — 이 가드 **하나만** 켰을 때):
        //    판 **530 → 434**(18.11%) · 서로 다른 답 **106 → 103**.
        if (angleShortcutValues(c, r).has(x)) return null;
        // 판정기의 자로도 다시 막는다. 잃은 것(이 가드 **하나만** 켰을 때):
        //    판 **530 → 518**(2.26%) · 서로 다른 답 **106 → 106**(안 줄었다).
        //    ⚠️ 이 2.26% 는 **우연 수준 1.07%**(답을 판끼리 세 자리로 돌려 끼운 널
        //    모형 1.13 · 1.32 · 0.75 의 평균)의 **2.1배**다 — 이 가드는 실제로 일한다.
        if (pageShortcutValues([c, r]).has(x)) return null;
        // 🔴 ㉠ 「$d>r$」가 **$1$ 말고도** 약수를 떨궈야 그 조건이 지면에서 일을 한다.
        //    $1$ 은 어떤 $r\ge1$ 에서도 떨어지므로 그것만으로는 굳힘이 «어느 후보인가»를
        //    한 번도 고르지 않는다. 둘 이상을 떨구게 하면 살아남는 창의 **시작 자리**가
        //    $r$ 을 따라 실제로 옮겨 간다.
        //    잃은 것(이 가드 **하나만** 켰을 때):
        //    판 **530 → 479**(9.62%) · 서로 다른 답 **106 → 96**.
        //    ⚠️ 종전 판은 「$alive.length === divs.length$ 이면 버린다」였는데 그것은
        //    **구조적으로 한 판도 안 걸린다**($1$ 이 늘 떨어지므로). 걸릴 수 없는 가드는
        //    장식이므로 걸리는 것으로 바꿨다(2026-08-18 「망가뜨려 봐야 가드인 줄 안다」).
        if (divs.filter((v) => v <= r).length < 2) return null;
        // 🔴 **가장 흔한 오답이 정답과 같으면 이 문항은 굳힘을 한 번도 안 묻는다.**
        //    꼭지각 $c$ 를 빼는 것을 잊고 $b+d=180$ 으로 보면 $N'=180-r$ 이 된다.
        //    그 답이 참 답과 같은 판은 버린다 — 평행선의 성질이 장식이 되기 때문이다.
        //    잃은 것(D-20 — 두 자리로 잰다):
        //    이 가드 **하나만** 켰을 때 판 **530 → 529**(0.19%) · 답 **106 → 106**,
        //    위 셋을 켠 뒤에는 판 **386 → 385**(0.26%) · 답 **91 → 90**.
        //    ⚠️ 값어치는 건수가 아니라 **자리**에 있다 — 이 하나가 아래
        //    「굳힘을 지운 답이 참 답과 같은 판」을 220판에서 1 → 0 으로 만든다.
        if (splitAngleDivisors(180 - r, r).reduce((a, b) => a + b, 0) === x) {
          return null;
        }
        const dropped = divs.filter((d) => !alive.includes(d));
        return {
          content:
            `평행한 두 직선 $l$, $m$이 있다. 직선 $l$ 위의 점 $\\mathrm{A}$와 ` +
            `직선 $m$ 위의 서로 다른 두 점 $\\mathrm{B}$, $\\mathrm{C}$를 이어 ` +
            `삼각형 $\\mathrm{ABC}$를 만들었더니 $\\angle\\mathrm{BAC}=${c}^{\\circ}$였다. ` +
            `$\\angle\\mathrm{ABC}=b^{\\circ}$, $\\angle\\mathrm{ACB}=d^{\\circ}$라 할 때 ` +
            `$b$와 $d$는 모두 자연수이고, 크기가 $d^{\\circ}$인 각을 서로 겹치지 않게 ` +
            `여러 개 이어 붙여 크기가 $b^{\\circ}$인 각을 채웠더니 $${r}^{\\circ}$만큼 ` +
            `남았다. 이때 $d$의 값이 될 수 있는 것을 모두 구하여 그 합을 구하시오.`,
          answer: `$${x}$`,
          solution: [
            `두 직선 $l$, $m$이 평행하므로 엇각의 크기는 서로 같다. 점 $\\mathrm{A}$를 지나는 직선 $l$ 위에는 $\\angle\\mathrm{ABC}$의 엇각, $\\angle\\mathrm{BAC}$, $\\angle\\mathrm{ACB}$의 엇각이 차례로 놓이고 이 세 각이 평각을 이루므로 $\\angle\\mathrm{ABC}+\\angle\\mathrm{BAC}+\\angle\\mathrm{ACB}=180^{\\circ}$이다.`,
            `그러므로 $b+d$의 값은 $180-${c}=${s}$이다.`,
            `크기가 $d^{\\circ}$인 각을 $q$개 이어 붙이고 $${r}^{\\circ}$가 남았으므로 $b=d\\times q+${r}$이고, 여기에서 $q$는 자연수이다. 또 남은 각의 크기는 이어 붙인 각의 크기보다 작아야 하므로 $d>${r}$이다.`,
            `$b=${s}-d$이므로 $${s}-d=d\\times q+${r}$, 즉 $${s}-${r}=d\\times(q+1)$이다. 그러므로 $d$는 $${s}-${r}=${n}$의 약수이다.`,
            `$${n}$${eulReul(n)} 소인수분해하면 $${n}=${factorTex(n)}$이므로 $${n}$의 약수는 ${listTex(divs)}의 ${koreanCount(divs.length)} 개이다.`,
            `$q$는 자연수이므로 $q+1$은 $2$ 이상이고, 따라서 $d$는 $${n}$ 자신이 될 수 없다.`,
            `이 약수 중에서 $${r}$${eulReul(r)} 넘고 $${n}$${iGa(n)} 아닌 것은 ${listTex(alive)}의 ${koreanCount(alive.length)} 개이고, ${listTex(dropped)}${eunNeun(dropped[dropped.length - 1]!)} 이 두 조건 중 하나를 어겨 버려진다.`,
            `따라서 구하는 합은 $${alive.join("+")}=${x}$이다.`,
          ].join("\n"),
          facts: { x, c, r, n, cnt: alive.length, first: alive[0]! },
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 82X  넓이와 호의 길이로 굳힌 부채꼴의 중심각을 키운 넓이  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 **굳힘은 이 소단원의 개념 하나다 — 중심각을 한 번도 계산하지 않는다.**
 *
 * 부채꼴의 넓이 $S$ 와 호의 길이 $L$ 사이에는 $S=\dfrac12\times r\times L$ 이 성립하므로
 * 반지름은 $r=2S\div L$ 로 **중심각을 거치지 않고** 정해진다(D-115 ⑾ 의 «중»).
 * 이 함수는 지면에 $\pi$ 를 뺀 값(넓이 $S\pi$, 호 $L\pi$)을 받는다.
 *
 * ⚠️ 굳힘을 인자로 받는다 — $S$ 나 $L$ 을 흔들면 반지름이 달라져야 한다(㉡).
 *    그 자가 «아니오»를 낼 수 있음은 시험이 **둘을 같은 배로 키운 짝**으로 보인다
 *    (그때는 반지름이 그대로다 — 굳힘은 두 값 각각이 아니라 그 **비**에 걸린다).
 */
export function sectorFromAreaAndArc(area: number, arc: number): number {
  if (arc <= 0)
    throw new Error(`sectorFromAreaAndArc: 호의 길이가 ${arc} 이다`);
  return (2 * area) / arc;
}

/** 반지름과 호의 길이로 중심각 — $L\pi=2\pi r\times\dfrac{x}{360}$ 에서 $x=180L\div r$. */
export function sectorCentralAngle(radius: number, arc: number): number {
  if (radius <= 0) {
    throw new Error(`sectorCentralAngle: 반지름이 ${radius} 이다`);
  }
  return (180 * arc) / radius;
}

/**
 * 쓸 수 있는 $(r, x, d)$ — 넓이·호의 길이·구하는 넓이가 **모두 자연수**여야 한다.
 * 실측 **2,175짝**(서로 다른 답 242 · 최빈 답 비중 1.47%).
 */
const SECTOR_CASES: readonly (readonly [number, number, number])[] = (() => {
  const out: [number, number, number][] = [];
  for (let radius = 6; radius <= 40; radius += 1) {
    for (let angle = 15; angle <= 330; angle += 5) {
      if ((radius * angle) % 180 !== 0) continue;
      const arc = (radius * angle) / 180;
      if (arc < 2 || arc > 60) continue;
      if ((radius * arc) % 2 !== 0) continue;
      const area = (radius * arc) / 2;
      if (area > 600) continue;
      for (let grow = 10; grow <= 120; grow += 5) {
        if (angle + grow > 355) continue;
        if ((radius * radius * (angle + grow)) % 360 !== 0) continue;
        if ((radius * radius * (angle + grow)) / 360 > 900) continue;
        out.push([radius, angle, grow]);
      }
    }
  }
  return out;
})();

const SECTOR_AREA: TypeEntry[] = [
  defType(
    BOOK2,
    MINOR_CIRCLE,
    "82X",
    "넓이와 호의 길이가 주어진 부채꼴에서 중심각을 키운 부채꼴의 넓이",
    SEC.부채꼴,
    "심화중",
    (rng): Body =>
      attempt(2000, (): Body | null => {
        const [radius, angle, grow] = pick(rng, SECTOR_CASES);
        const arc = (radius * angle) / 180;
        const area = (radius * arc) / 2;
        const grown = angle + grow;
        const x = (radius * radius * grown) / 360;
        // 🔴 ㉵ 지면의 수(넓이·호의 길이·늘어난 중심각, 그리고 `cm^{2}` 의 $2$)로
        //    한두 번 셈해 답이 나오면 심화가 아니다.
        //    잃은 것(창 전수 2,175, D-20 — 이 가드 **하나만** 켰을 때):
        //    판 **2175 → 1997**(8.18%) · 서로 다른 답 **242 → 235**.
        //    ⚠️ 이 8.18% 는 **우연 수준 7.56%**(널 모형 8.23 · 6.90 · 7.54 의 평균)와
        //    거의 같다 — 이 자로는 이 유형이 «우연보다 뻔하지 않다».
        if (pageShortcutValues([area, arc, grow, 2]).has(x)) return null;
        // 🔴 「넓이를 그대로 옮겨 적으면 맞는」 판은 버린다.
        //    잃은 것(이 가드 **하나만** 켰을 때):
        //    판 **2175 → 2175**(0.00%) — 실측으로 **한 판도 안 걸린다.**
        //    「일하는 가드」로 읽지 말 것: 늘어난 중심각이 $0$ 보다 크므로 넓이가
        //    반드시 커져 구조적으로 걸릴 수 없다. 그래도 남겨 두는 까닭은 창을
        //    넓히는 날(중심각을 **줄이는** 갈래를 더하는 날) 곧바로 물기 때문이다.
        //    시험이 그 «구조적으로 0» 을 따로 찍는다.
        if (x === area) return null;
        return {
          content:
            `넓이가 $${area}\\pi\\,\\mathrm{cm}^{2}$이고 호의 길이가 ` +
            `$${arc}\\pi\\,\\mathrm{cm}$인 부채꼴이 있다. 이 부채꼴과 반지름의 길이는 ` +
            `같고 중심각의 크기는 $${grow}^{\\circ}$만큼 큰 부채꼴의 넓이를 구하시오.`,
          answer: `$${x}\\pi\\,\\mathrm{cm}^{2}$`,
          solution: [
            `부채꼴의 넓이는 반지름의 길이와 호의 길이의 곱의 절반과 같으므로, 반지름의 길이를 $r\\,\\mathrm{cm}$라 하면 $${area}\\pi=\\dfrac{1}{2}\\times r\\times${arc}\\pi$이다.`,
            `양변을 $\\pi$로 나누면 $${area}=\\dfrac{1}{2}\\times r\\times${arc}$이고, 여기에서 $r$의 값은 $2\\times${area}\\div${arc}=${radius}$이다. 넓이 $${area}$${waGwaFor(area)} 호의 길이 $${arc}$만으로 반지름의 길이가 정해지므로 중심각의 크기를 먼저 구하지 않아도 된다.`,
            `중심각의 크기를 $x^{\\circ}$라 하면 호의 길이는 반지름의 길이가 $${radius}\\,\\mathrm{cm}$인 원의 둘레의 길이에 중심각의 크기가 $360^{\\circ}$에서 차지하는 비율을 곱한 것이므로 $${arc}\\pi=2\\times\\pi\\times${radius}\\times\\dfrac{x}{360}$이다.`,
            `양변을 $\\pi$로 나누면 $${arc}=2\\times${radius}\\times\\dfrac{x}{360}$이고, 여기에서 $x$의 값은 $180\\times${arc}\\div${radius}=${angle}$이다.`,
            `중심각의 크기는 $${angle}^{\\circ}$에서 $${grow}^{\\circ}$만큼 커지므로, $${angle}$${waGwaFor(angle)} $${grow}$${eulReul(grow)} 더하여 $${angle}+${grow}=${grown}$, 즉 $${grown}^{\\circ}$이다.`,
            `반지름의 길이가 $${radius}\\,\\mathrm{cm}$인 원의 넓이는 $\\pi\\times${radius}^{2}$이므로 구하는 넓이는 $\\pi\\times${radius}^{2}\\times${grown}\\div360$이고, $${radius}^{2}\\times${grown}\\div360=${x}$이므로 $${x}\\pi\\,\\mathrm{cm}^{2}$이다.`,
          ].join("\n"),
          facts: { x, area, arc, grow, radius, angle, grown },
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 83X  좌변의 값 두 개만으로 방정식의 해 구하기  (심화중)
// ═══════════════════════════════════════════════════════════

/** 해가 될 수 있는 값 — $0$ 과 $\pm1$ 은 뺀다(파생 오답이 넷을 못 채운다). */
const ROOT_CHOICES: readonly number[] = (() => {
  const out: number[] = [];
  for (let v = 2; v <= 15; v += 1) {
    out.push(v);
    out.push(-v);
  }
  return out;
})();

/**
 * 🔴 **굳힘은 이 소단원의 개념 둘이다 — 상수 $b$ 를 끝까지 구하지 않는다.**
 *
 * ⑴ 방정식 $ax+b=0$ 의 해는 **좌변의 값을 $0$ 으로 만드는 $x$** 다(해의 뜻).
 * ⑵ 좌변은 $x$ 에 대한 일차식이므로 $x$ 가 $1$ 만큼 커질 때마다 그 값은 언제나 $a$
 *    만큼 커진다($a(x+1)+b$ 는 $ax+b$ 보다 $a$ 만큼 크다).
 *
 * 그러면 $x=p$ 일 때의 값 $m$ 과 $x=q$ 일 때의 값 $n$ 만으로
 * $a=(n-m)\div(q-p)$ 가 나오고, 해는 $p$ 에서 $(0-m)\div a$ 만큼 옮긴 자리다.
 * **$b$ 가 얼마인지는 한 번도 묻지 않는다** — 그것이 이 유형의 «중»이다.
 *
 * ⚠️ 굳힘을 인자로 받는다 — 네 값 중 하나를 흔들면 해가 달라져야 한다(㉡).
 *    그 자가 «아니오»를 낼 수 있음은 시험이 **$m$ 과 $n$ 을 같은 양만큼 옮긴 짝**으로
 *    보인다(그때는 기울기가 그대로라 해가 옮겨 가지만, $p$ 와 $q$ 를 함께 옮기면
 *    해도 그만큼 옮겨 가 «달라진 것처럼» 보인다 — 그래서 흔드는 축을 하나만 쓴다).
 *
 * 나누어떨어지지 않으면 **던진다** — 조용히 반올림하면 지면에 거짓이 나간다.
 */
export function solveFromTwoValues(
  p: number,
  m: number,
  q: number,
  n: number,
): number {
  if (p === q) throw new Error("solveFromTwoValues: 두 대입점이 같다");
  if ((n - m) % (q - p) !== 0) {
    throw new Error(
      `solveFromTwoValues: $a$ 가 정수가 아니다 — ${n - m}/${q - p}`,
    );
  }
  const a = (n - m) / (q - p);
  if (a === 0) throw new Error("solveFromTwoValues: $a$ 가 $0$ 이다");
  if (m % a !== 0) {
    throw new Error(`solveFromTwoValues: 해가 정수가 아니다 — ${-m}/${a}`);
  }
  return p - m / a;
}

const TWO_VALUE_SOLVE: TypeEntry[] = [
  defType(
    BOOK1,
    MINOR_LINEAR,
    "83X",
    "좌변에 두 수를 대입한 값만으로 방정식의 해 구하기",
    SEC.방정식해,
    "심화중",
    (rng): Body =>
      attempt(3000, (): Body | null => {
        const a = intBetween(rng, 2, 9);
        const x0 = pick(rng, ROOT_CHOICES);
        const p = intBetween(rng, -9, 9);
        const q = p + intBetween(rng, 2, 9);
        if (p === x0 || q === x0) return null;
        // 🔴 $p=0$ 이면 해설에 «$q-0$» 이 찍히고 냄새 자가 그것을 「상수 $0$ 을 더했다」로
        //    문다. 값은 맞지만 **거짓 경보는 가드를 끈다**(2026-08-20) — 자를 무르는
        //    대신 그 모양이 아예 안 나오게 한다. 잃은 것: $p$ 의 열아홉 자리 중 하나.
        if (p === 0) return null;
        const m = a * (p - x0);
        const n = a * (q - x0);
        if (Math.abs(m) > 200 || Math.abs(n) > 200) return null;
        const x = solveFromTwoValues(p, m, q, n);
        if (x !== x0) return null;
        // 🔴 ㉵ 지면의 수(대입점 둘·값 둘·$0$)로 한두 번 셈해 답이 나오면 심화가 아니다.
        //    잃은 것(표본 20,000판, D-20 — 이 가드 **하나만** 켰을 때):
        //    판 **20000 → 16070**(19.65%) · 서로 다른 답 **28 → 28**(안 줄었다).
        //    ⚠️ 손실이 큰 것은 이 유형의 지면에 수가 다섯이나 있어 조합이 많아서다.
        //    답 자체는 하나도 안 사라지므로 창이 한쪽으로 쏠리지 않는다.
        //    그리고 이 19.65% 는 **우연 수준 24.32%**(답을 판끼리 세 자리로 돌려 끼운
        //    널 모형 24.25 · 24.65 · 24.07 의 평균)보다 **낮다** — 이 자로는 이 유형이
        //    «우연보다 뻔하지 않다».
        //    ⚠️ 지면에는 $0$ 이 **두 번** 찍힌다(`ax+b=0` 과 「$a$ 는 $0$ 이 아니다」).
        //    자에 넘기는 다중집합이 지면과 다르면 지면이 실제로 만드는 조합을 못 본다
        //    (4차 `62W` 가 「가운데 경계는 두 번 찍힌다」로 겪은 자리다).
        if (pageShortcutValues([0, 0, p, m, q, n]).has(x)) return null;
        const delta = x0 - p;
        return {
          content:
            `$x$에 대한 방정식 $ax+b=0$이 있다. 여기에서 $a$, $b$는 상수이고 ` +
            `$a\\neq0$이다. 이 방정식의 좌변에 $x=${p}$${eulReul(p)} 대입하면 그 값이 ` +
            `$${m}$이고, $x=${q}$${eulReul(q)} 대입하면 그 값이 $${n}$이다. ` +
            `이 방정식의 해를 구하시오.`,
          answer: `$x=${x0}$`,
          solution: [
            `방정식의 해는 그 방정식을 참이 되게 하는 $x$의 값이므로, 좌변 $ax+b$의 값이 $0$이 되게 하는 $x$의 값을 찾으면 된다.`,
            `$x$ 대신 $x+1$을 넣으면 좌변의 값은 $a\\times(x+1)+b$이고 이것은 처음 값 $a\\times x+b$보다 $a$만큼 크다. 즉 $x$의 값이 $1$만큼 커질 때마다 좌변의 값은 언제나 $a$만큼 커진다.`,
            `$x$의 값이 $${p}$에서 $${q}$까지 $${q}-${parenNum(p)}=${q - p}$만큼 커질 때 좌변의 값은 $${m}$에서 $${n}$까지 $${parenNum(n)}-${parenNum(m)}=${n - m}$만큼 커지므로 $a\\times${q - p}=${n - m}$이고, $a$의 값은 $${parenNum(n - m)}\\div${q - p}=${a}$이다.`,
            `$x=${p}$일 때 좌변의 값이 $${m}$이므로, 좌변의 값이 $0$이 되려면 $0-${parenNum(m)}=${-m}$만큼 변해야 한다.`,
            `좌변의 값이 $${a}$만큼 변할 때 $x$의 값은 $1$만큼 변하므로, 좌변의 값이 $${-m}$만큼 변하려면 $x$의 값은 $${parenNum(-m)}\\div${a}=${delta}$만큼 변해야 한다.`,
            `따라서 구하는 $x$의 값은 $${p}${addTail(delta)}=${x0}$이고, 이 방정식의 해는 $x=${x0}$이다. 상수 $b$의 값은 끝까지 구하지 않아도 된다.`,
          ].join("\n"),
          facts: { x, a, p, q, m, n, delta },
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 84X  오르내리는 그래프에서 같은 높이가 되는 때를 모두 찾기  (심화상)
// ═══════════════════════════════════════════════════════════

export type Segment = {
  /** 구간의 시작 시각(분)과 끝 시각(분). */
  from: number;
  to: number;
  /** 구간의 시작 높이와 끝 높이. */
  low: number;
  high: number;
  /** $1$분에 변하는 높이(늘 양수). */
  rate: number;
  /** 올라가는 구간인가. */
  rising: boolean;
};

/**
 * 🔴 **굳지 않는 마디를 «구간을 하나씩 다 짚어» 견주는 자리.**
 *
 * 높이 $d$ 가 되는 때는 몇 번인지조차 발문이 말해 주지 않는다. 그래프가 올랐다
 * 내렸다 다시 오른 뒤 내려오므로, 네 선분마다 **$d$ 가 그 구간의 두 끝 사이에 드는지**
 * 를 따로 보고, 드는 구간마다 시각을 따로 구해야 한다. 성질 하나로 걸러지지 않는다.
 *
 * ⚠️ 굳힘을 인자로 받는다 — $d$ 를 흔들면 살아남는 구간과 시각이 달라져야 한다(㉡).
 *    그 자가 «아니오»를 낼 수 있음은 시험이 **$d$ 가 가장 높은 곳보다 큰 판**으로
 *    보인다(그때는 살아남는 구간이 **하나도 없다** — 빈 배열).
 *
 * 돌려주는 것은 「살아남은 구간의 색인과 그때의 시각」이고, 시각이 정수가 아니면
 * **던진다**(조용히 반올림하면 지면에 거짓이 나간다).
 */
export function heightCrossings(
  segments: readonly Segment[],
  d: number,
): { index: number; at: number }[] {
  const out: { index: number; at: number }[] = [];
  segments.forEach((seg, index) => {
    const lo = Math.min(seg.low, seg.high);
    const hi = Math.max(seg.low, seg.high);
    if (d <= lo || d >= hi) return;
    const gap = seg.rising ? d - seg.low : seg.low - d;
    if (gap % seg.rate !== 0) {
      throw new Error(
        `heightCrossings: ${index + 1}째 구간에서 시각이 정수가 아니다 — ${gap}/${seg.rate}`,
      );
    }
    out.push({ index, at: seg.from + gap / seg.rate });
  });
  return out;
}

const ORDINAL = ["첫째", "둘째", "셋째", "넷째"] as const;

const HEIGHT_GRAPH: TypeEntry[] = [
  defType(
    BOOK1,
    MINOR_COORD,
    "84X",
    "오르내리는 그래프에서 주어진 높이가 되는 때를 모두 찾기",
    SEC.그래프이해,
    "심화상",
    (rng): Body =>
      attempt(4000, (): Body | null => {
        const u1 = intBetween(rng, 2, 9);
        const n1 = intBetween(rng, 4, 14);
        const peak = u1 * n1;
        if (peak < 20 || peak > 140) return null;
        const u2 = intBetween(rng, 2, 9);
        const n2 = intBetween(rng, 2, 10);
        const drop = u2 * n2;
        if (drop < 10) return null;
        const dip = peak - drop;
        if (dip < 8) return null;
        const u3 = intBetween(rng, 2, 9);
        const n3 = intBetween(rng, 3, 14);
        const top = dip + u3 * n3;
        if (top <= peak || top > 200) return null;
        const u4pool: number[] = [];
        for (let u = 2; u <= 9; u += 1) {
          if (top % u !== 0) continue;
          const len = top / u;
          if (len < 3 || len > 25) continue;
          u4pool.push(u);
        }
        if (u4pool.length === 0) return null;
        const u4 = pick(rng, u4pool);
        const n4 = top / u4;
        const t1 = n1;
        const t2 = t1 + n2;
        const t3 = t2 + n3;
        const t4 = t3 + n4;
        if (t4 > 70) return null;
        const segments: Segment[] = [
          { from: 0, to: t1, low: 0, high: peak, rate: u1, rising: true },
          { from: t1, to: t2, low: peak, high: dip, rate: u2, rising: false },
          { from: t2, to: t3, low: dip, high: top, rate: u3, rising: true },
          { from: t3, to: t4, low: top, high: 0, rate: u4, rising: false },
        ];
        // 살아남는 구간이 둘 이상이고 시각이 모두 정수인 높이만 모은다.
        const goods: number[] = [];
        for (let d = 1; d < top; d += 1) {
          if (d === peak || d === dip) continue;
          let hits: { index: number; at: number }[];
          try {
            hits = heightCrossings(segments, d);
          } catch {
            continue;
          }
          if (hits.length < 2) continue;
          goods.push(d);
        }
        if (goods.length === 0) return null;
        // 🔴 ㉵ 지면의 수(꼭짓점 좌표 여덟과 높이 $d$)로 한두 번 셈해 답이 나오면
        //    심화가 아니다. 잃은 것(표본 20,000판, D-20 — 이 가드 **하나만** 켰을 때):
        //    판 **20000 → 9301**(53.50%) · 서로 다른 답 **90 → 86**.
        //    ⚠️ 손실이 크다. 그런데 **우연 수준(널 모형)도 46.74%** 라 이 53.50% 는
        //    「이 유형이 뻔하다」가 아니라 「지면에 수가 아홉이나 있어 무엇이든 걸린다」는
        //    뜻이다 — 그래도 **버리는 쪽**으로 둔다(잘린 창은 지면에서 티가 안 난다).
        //    ⚠️ 자에 넘기는 것은 **지면에 찍힌 그대로의 다중집합**이다 — $0$ 이 네 번,
        //    $t_4$ 가 두 번 나온다. 한 벌로 줄여 넘기면 $2t_4$·$t_4^{2}$ 같은 조합을
        //    구조적으로 못 보고, 실측으로 660판 중 **4판**이 그 구멍으로 샜다.
        //    ⚠️ 그래프를 통째로 버리지 않고 **$d$ 를 고를 때 거른다** — 같은 (그래프,
        //    높이) 모집단이지만 그래프를 다시 짓는 비용이 없어 생성이 두 배 빠르다
        //    (실측 1,200판 $5.1$초 → $2.4$초). 걸러 낸 뒤 남은 것이 없으면 그때
        //    그래프를 버린다.
        const pageNums = [0, t4, 0, 0, t1, peak, t2, dip, t3, top, t4, 0];
        const survivors = goods.filter((cand) => {
          const sum = heightCrossings(segments, cand).reduce(
            (s, h) => s + h.at,
            0,
          );
          return !pageShortcutValues([...pageNums, cand]).has(sum);
        });
        if (survivors.length === 0) return null;
        const d = pick(rng, survivors);
        const hits = heightCrossings(segments, d);
        const x = hits.reduce((s, h) => s + h.at, 0);
        const lines: string[] = [
          `그래프는 네 개의 선분으로 이루어져 있고, 각 선분에서 높이는 일정한 빠르기로 늘어나거나 줄어든다. 높이가 $${d}\\,\\mathrm{m}$가 되는 때를 네 선분에서 차례로 짚어 본다.`,
        ];
        segments.forEach((seg, i) => {
          const span = seg.to - seg.from;
          const lo = Math.min(seg.low, seg.high);
          const hi = Math.max(seg.low, seg.high);
          const head =
            `${ORDINAL[i]!} 선분에서는 $${span}$분 동안 높이가 $${seg.low}\\,\\mathrm{m}$에서 ` +
            `$${seg.high}\\,\\mathrm{m}$까지 ${seg.rising ? "늘어난다" : "줄어든다"}.`;
          if (d <= lo || d >= hi) {
            const why =
              d <= lo
                ? `$${d}$${iGa(d)} $${lo}$보다 크지 않으므로`
                : `$${d}$${iGa(d)} $${hi}$보다 작지 않으므로`;
            lines.push(
              `${head} ${why} 이 선분에서는 높이가 $${d}\\,\\mathrm{m}$가 되지 않는다.`,
            );
            return;
          }
          const gap = seg.rising ? d - seg.low : seg.low - d;
          const step = gap / seg.rate;
          const at = seg.from + step;
          const diff = Math.abs(seg.high - seg.low);
          const move = seg.rising ? "늘어나야" : "줄어들어야";
          // 첫째 선분은 시작 시각이 $0$ 이라 «$0+8=8$» 이 된다 — 뜻 없는 덧셈은 안 적는다.
          const tail =
            seg.from === 0
              ? `출발한 지 $${at}$분 후이다.`
              : `$${seg.from}+${step}=${at}$에서 출발한 지 $${at}$분 후이다.`;
          lines.push(
            `${head} $${diff}\\div${span}=${seg.rate}$이므로 $1$분에 $${seg.rate}\\,\\mathrm{m}$씩 ${seg.rising ? "늘어난다" : "줄어든다"}. ` +
              `$${d}$${eunNeun(d)} $${lo}$보다 크고 $${hi}$보다 작으므로 이 선분에서 높이가 $${d}\\,\\mathrm{m}$가 되고, ` +
              `높이 $${seg.low}\\,\\mathrm{m}$에서 $${gap}\\,\\mathrm{m}$만큼 ${move} 하므로 $${gap}\\div${seg.rate}=${step}$, 즉 ${tail}`,
          );
        });
        lines.push(
          `따라서 높이가 $${d}\\,\\mathrm{m}$가 되는 것은 출발한 지 ${hits.map((h) => `$${h.at}$분 후`).join("와 ")}의 ${koreanCount(hits.length)} 번이고, 구하는 합은 $${hits.map((h) => h.at).join("+")}=${x}$이다.`,
        );
        return {
          content:
            `어떤 열기구가 지면에서 출발하여 위로 올라갔다가 잠시 아래로 내려온 뒤 ` +
            `다시 위로 올라갔고, 마지막에는 지면으로 내려왔다. 출발한 지 $x$분 후의 ` +
            `열기구의 높이를 $y\\,\\mathrm{m}$라 할 때, $x$의 값이 $0$부터 $${t4}$까지 ` +
            `변하는 동안 $x$와 $y$ 사이의 관계를 나타내는 그래프는 다섯 점 ` +
            `$(0, 0)$, $(${t1}, ${peak})$, $(${t2}, ${dip})$, $(${t3}, ${top})$, ` +
            `$(${t4}, 0)$${eulReul(0)} 차례로 선분으로 이은 것이다. 열기구의 높이가 ` +
            `$${d}\\,\\mathrm{m}$가 되는 것은 출발한 지 몇 분 후인지 모두 구하여 ` +
            `그 합을 구하시오.`,
          answer: `$${x}$분`,
          solution: lines.join("\n"),
          facts: {
            x,
            t1,
            t2,
            t3,
            t4,
            peak,
            dip,
            top,
            d,
            cnt: hits.length,
            first: hits[0]!.index,
          },
        };
      }),
  ),
];

export const M1_TOP_5E: TypeEntry[] = [
  ...SPLIT_ANGLE,
  ...SECTOR_AREA,
  ...TWO_VALUE_SOLVE,
  ...HEIGHT_GRAPH,
];
