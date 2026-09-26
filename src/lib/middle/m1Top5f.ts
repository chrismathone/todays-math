/**
 * 중1 **5차 확대 갈래 `f`** — `심화중`·`심화상` 넷을 더한다 (D-116, 2026-09-03).
 *
 * ## 왜 또 새 파일인가
 *
 * `m1Top.ts`~`m1Top4.ts` 는 각각 자기 유형을 **개수로 얼린** 시험을 달고 있다
 * (`expect(M1_TOP_4).toHaveLength(4)` 따위). 거기에 유형을 더하면 그 가드가 빨개지고,
 * 초록으로 되돌리는 유일한 길이 **가드를 무르는 것**이 된다. 그리고 5차 물결은 21갈래가
 * **동시에** 도므로 남의 파일을 만지면 말없이 덮어쓴다(2026-08-23 「미커밋 새 파일이 가장
 * 약한 고리」). 새 파일 하나 + `generate.ts` **spread 한 줄**(리드 몫)이면 그 둘을 다 피한다.
 *
 * 규칙을 두 벌로 두지 않으려고 `m1Top.ts` 의 `gcd` 를 **읽어만 온다**(고치지 않는다).
 *
 * ## 무엇이 «중»이고 무엇이 «상»인가 — `m1Top.ts` 머리말의 그 자
 *
 * ```
 * 심화중  마디 하나가 안 굳고, **그 소단원의 개념**이 그것을 굳힌다.       (D-115 ⑾)
 * 심화상  성질로 못 굳혀 후보를 **다 만들어 견줘야** 한다.
 * ```
 *
 * | 키 | 갈래 | 안 굳는 마디 | 무엇이 굳히나 | 같은 소단원 아래 갈래와 무엇이 다른가 |
 * |---|---|---|---|---|
 * | `정다면체\|85X` | **심화중** | 「어느 정다면체인가」 — 발문이 이름을 한 번도 안 댄다. 면·모서리·꼭짓점의 개수가 하나도 안 주어진다 | 이 소단원의 개념 **둘**이 굳힌다: ㉠ 오일러 공식이 (모서리)$-$(꼭짓점)$=d$ 를 **(면의 개수)$=d+2$** 로 바꾸고, ㉡ 「정다면체는 다섯 가지뿐」이 그 면의 개수를 **이름 하나**로 굳힌다. 모서리의 개수는 그 뒤 «면의 변을 다 세고 $2$ 로 나눈다»로 나온다 — 후보를 하나씩 넣어 보는 걸음이 없다 | `09`·`50`(기본)은 **이름을 대 놓고** 개수를 묻는다. `51`(기본)은 면의 모양과 모인 면의 개수로 **이름만** 찾는다. `52`(응용)는 면과 모서리를 **둘 다 주고** 꼭짓점 하나를 되돌린다. `85X` 만 이름도 개수도 안 주어지고, 그것을 **두 번** 해야 한다 |
 * | `유리수의 나눗셈\|86X` | **심화상** | 「여섯 몫 중 어느 것이 정수인가」 | 굳지 **않는다**. 세 수를 두 개씩 뽑아 앞뒤를 바꾼 몫 여섯을 **하나하나 역수의 곱셈으로 고쳐** 계산해야 정수인지 알 수 있다. 「절댓값이 큰 것을 작은 것으로 나누면 정수」라는 어림짐작은 실측 660판 중 **100판(15.15%)** 에서만 맞고 나머지 560판에서는 한 짝을 틀리게 센다 — 그리고 어느 쪽인지는 **계산해 봐야** 안다. 부호도 값과 따로 논다 — 견줌 없이 고를 성질이 없다 | `18`(기본)은 역수를 **한 번** 쓴다. `19`(연산)·`20`(응용)은 식이 **주어져** 계산만 한다. `22`(응용)는 미지수 자리를 되돌리고, `23`(응용)은 잘못 계산한 것을 바로잡는다. 셋 다 **셈이 하나**다. `86X` 만 후보가 여섯이고 그중 살아남는 것을 골라야 한다 |
 * | `삼각형의 내각과 외각\|87X` | **심화중** | 세 내각 — 발문이 한 각의 크기도 대 주지 않는다 | 이 소단원의 개념 「한 외각의 크기는 이웃하지 않는 **두 내각의 합**」이 굳힌다. 그 성질을 두 번 쓰면 $\angle Z$·$\angle X$ 가 $\angle Y$ 로 적히고, 「세 내각의 합은 $180^\circ$」가 마지막 마디를 닫는다 — 각을 하나씩 넣어 보는 걸음이 없다 | `07`(기본)은 **비**를 주고, `08`(기본)은 외각 하나와 내각 하나를 **수로** 준다. `24`(응용)는 두 내각을 **수로** 주고 외각을 한 번 쓴다. `09`~`14`·`23` 은 **그림이 있고** 이등분선·별 모양처럼 자리가 정해져 있다. `87X` 만 수로 주어진 각이 **하나도 없다** |
 * | `회전체\|88X` | **심화상** | 「셋 중 어느 단면이 가장 넓은가」 | 굳지 **않는다**. 회전체가 셋 다 달라(원기둥·원뿔·원뿔대) 넓이를 내는 식이 각각 $2rh$·$rh$·$(a+b)h$ 다. 세 식은 서로 비교할 수 있는 꼴이 아니므로 **셋을 다 계산해서 견주는** 수밖에 없다 | `16`(응용)은 **직사각형 하나**, `23A`(응용)는 **원뿔 하나**, `24A`(심화하)는 **원뿔대 하나** 의 단면을 각각 한 번씩 구한다. `14`(응용)는 이름과 밑넓이를 묻는다. `88X` 만 회전체 **셋을 한 지면에** 놓고 서로 견준다 |
 *
 * ## 🔴 앞 물결들이 실제로 낸 결함 — 여기서 어떻게 막았나
 *
 * ㉮ **해설이 정답지 한 단(964.8px)을 넘었다**(3차 중1 `53V`, 최대 1242px). 넘치면 그 쪽
 *    **다른 문항의 해설이 통째로 사라진다**(`column-count:2` + `overflow:hidden`).
 *    → 넷 다 훑는 자리가 **개수로 닫혀 있다**(`85X` 정다면체 둘 · `86X` 몫 여섯 ·
 *      `87X` 걸음 여덟 · `88X` 회전체 셋). 시험이 제품 `estimateSolutionPx` 로
 *      **660판**에서 **700px 미만**을 잠근다. ⚠️ 줄이는 길이 「걸음 지우기」이면 안 된다
 *      (D-116 ⑹) — 후보마다 «왜 살고 죽는지»는 그대로 두었다.
 * ㉯ **해설이 「자연수」 걸음을 건너뛰었다**(3차 중2 `38V`). → 이 넷에는 부등식에서
 *    정수로 뛰는 자리가 **하나도 없다.** `86X` 는 「정수인가」를 몫을 실제로 구해서
 *    판정하고, 나머지 셋은 등식만 쓴다.
 * ㉰ **해설이 기약이 아닌 분수를 찍었다**(3차 중1 `52V`, 17.5%). → 지면의 분수는
 *    `86X` 에만 있고, `ratTex` 가 **약분한 뒤** 분모가 $1$ 이면 정수로 찍는다.
 *    시험이 지면의 모든 `\dfrac` 를 훑어 기약인지 다시 재고, **찾은 자리 수도 못 박는다.**
 * ㉱ **발문이 스스로 못 박은 상한을 오답이 넘었다**(4차 중2 `37W`). → 넷 다 상한을
 *    선언하지 않는다(「$1$회전」은 상한이 아니라 회전수다).
 * ㉲ **정답이 «구간»이면 파생 오답이 뒤집힌다**(3차 중2 `35V`). → 넷 다 정답이 **한 수**다.
 * ㉳ **해설의 «말»을 지키는 시험이 없었다**(4차). → 시험이 「많다↔적다」·「정수이다↔
 *    아니다」·「크다↔작다」·「두 면이 만난다」·「이웃하지 않는 두 내각」을 **낱말째** 판정하고,
 *    낱말을 뒤집으면 빨개지는 눈금을 양성·음성으로 같이 둔다.
 * ㉴ **지면이 자기가 세운 제약을 어겼다**(4차 중3 `55W`). → `86X` 는 「정수가 아니다」라고
 *    적은 몫을 마지막 합에서 **한 번도 안 쓴다**(시험이 그것을 센다).
 * ㉵ **자료를 정렬해 찍으면 «보이는 자리»가 순위를 암시한다**(4차 중1 `63W`). →
 *    `86X` 는 세 유리수의 **자리를 섞고**(안 섞으면 늘 $|A|<|B|<|C|$ 로 나간다),
 *    `88X` 는 세 평면도형의 **차례를 섞는다**(안 섞으면 가장 넓은 단면이 늘 같은 자리다).
 *    `87X` 는 $\angle A\to\angle B\to\angle C$ 사슬을 **여섯 가지로 돌린다.**
 * ㉶ **D-20 손실 원장은 «재현 가능»해야 한다**(4차 중1 `62W`). → 가드마다 「이 가드
 *    **하나만** 껐을 때」를 창 전수 또는 같은 씨앗 열로 세고, **판 수와 답 수의 측정점을
 *    같은 자리**에 맞춰 적었다. 어림한 자리는 하나도 없다.
 * ㉷ **내보낸 순수 함수의 주석이 코드와 어긋나면 안 된다**(4차 중3). → 이 파일이
 *    내보내는 여섯(`platonicByGap`·`distinctEdgeAlternatives`·`integerQuotients`·
 *    `solveByExteriorChain`·`axialSectionAreas`·`pageShortcutValues`)의 단언은
 *    전부 시험이 문다.
 * ㉸ 우리말 — 「그중」은 붙여 쓴다. 조사는 **지면에 찍히는 글자**로 정한다.
 *
 * ## 실측 요약 (씨앗 220 × 변형 3 = **660판**, 제품 후처리를 거친 지면 기준)
 *
 * | 유형 | 갈래 | 해설 최대 | 서로 다른 발문 | 서로 다른 정답 | 최빈 정답 | 변형 폭 바닥 |
 * |---|---|---|---|---|---|---|
 * | `85X` | 심화중 | **475.8px** | 645/660 | 135 | **2.12%** | 5 (같은 씨앗 5변형 전부 다름) |
 * | `86X` | 심화상 | **498.7px** | 657/660 | 61 | **6.52%** | 8 (같은 씨앗 8변형 전부 다름) |
 * | `87X` | 심화중 | **422.3px** | 653/660 | 94 | **3.79%** | 12 (같은 씨앗 12변형 전부 다름) |
 * | `88X` | 심화상 | **475.8px** | 660/660 | 134 | **2.42%** | 12 (같은 씨앗 12변형 전부 다름) |
 *
 * 한 단은 964.8px 이고 브리프가 못 박은 상한은 **700px** 이다 — 넷 다 그 아래다.
 * 최빈 정답 상한 **12%** 도 넷 다 아래다. 지면 냄새·조사 어긋남·맨 숫자·그림 지시·
 * 얇은 해설·렌더 깨짐은 660판 전량 **0** 이다.
 *
 * ⚠️ **`85X` 의 변형 폭은 리드가 준 바닥(5)을 크게 넘는다**(645/660). 리드는
 *    「소단원 «정다면체» 는 등록 전량 실측 5가 **상한**」이라 했는데, 그것은 기존
 *    유형이 **정다면체 다섯 중 하나를 고르는** 물음만 내기 때문이다. 여기서는
 *    한 모서리의 길이라는 **수 하나가 답에 들어가므로** 그 상한이 걸리지 않는다.
 *    상한 5 에 맞추면 서로 다른 정답이 넷뿐이라 최빈 정답이 25%를 넘어
 *    브리프의 12% 규칙과 **정면으로 부딪힌다** — 그래서 넘겼고, 그 사실을 적어 둔다.
 *
 * ## 🔴 초등이 물린 함정 셋 — 여기서 어떻게 피했나
 *
 * ㉠ **창을 한쪽 끝만 주면 굳힘이 장식이 된다.** 「살아남는 후보가 언제나 목록의 같은
 *    자리」면 굳힘 조건은 «어느 후보인가»를 한 번도 안 고른다.
 *    → `86X` 는 정수인 몫의 **자리와 개수**가 씨앗을 가로질러 갈리고, `88X` 는
 *      **가장 넓은 것과 가장 좁은 것의 자리**가 갈린다(시험이 따로 잰다).
 *    → `85X`·`87X` 는 후보 목록이 **아예 없다**(값이 하나로 굳는다). 「축이 없다」와
 *      「축이 초록이다」는 다른 말이므로 시험이 그 둘의 ㉠ 을 **«해당 없음»으로 따로 찍는다.**
 * ㉡ **「굳힘이 항등식」** — 굳힘 인자를 흔들어도 답이 그대로면 장식이다. 넷 다 굳힘을
 *    **인자로 받는 순수 함수**로 뽑아 두었다. ⚠️ 그 자가 «아니오»를 낼 수 있음을
 *    **음성 대조**로 보인다(그것이 없으면 그 가드의 «0» 이 «깨끗»인지 «못 셈»인지 안 갈린다,
 *    2026-08-21).
 * ㉢ **갈래끼리 겹침** — 위 표의 마지막 칸이 쌍마다 «푸는 절차가 어디서 갈리는가»를 적은
 *    것이다. 🔴 **정직하게 적어 둘 것 하나**: `86X` 의 「후보를 여섯 만들어 정수인 것만
 *    골라 더한다」는 4차 `63W`·`64W` 의 **「다 만들어 견주고 살아남은 것의 합」과 뼈대가
 *    같다.** 소재(유리수 나눗셈 ↔ 대푯값·기둥)·책(1-1 ↔ 1-2)·판정(역수의 곱이 정수인가 ↔
 *    가정 안에 드는가)이 다르지만, 「같은 꼴을 또 냈다」는 판단은 **리드 몫**으로 넘긴다.
 *
 * ## 번호 규약 — **`X` 접미사**
 *
 * `extensionNumberReason`(`src/__tests__/helpers/rpmCatalog.ts`)은 `숫자+영문 대문자
 * 한 글자` 를 「색인 번호와 절대 안 겹친다」로 통과시킨다. 중1에는 이미 `A`(색인 밖
 * 보강)·`T`(1차)·`U`(2차)·`V`(3차)·`W`(4차)가 쓰였으므로 5차 물결은 **`X`** 로 대를 가른다.
 * 번호대는 리드가 갈래마다 나눠 준 구간(`85`~`88`)을 그대로 쓴다.
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

import { attempt, defType, shuffle, type Body } from "./m1Shared";
// 최대공약수 규칙을 두 벌로 두지 않는다 — `m1Top.ts` 것을 **읽어만** 온다.
import { gcd } from "./m1Top";
import { eulReul, waGwa } from "./m2Josa";
import type { TypeEntry } from "./types";

const BOOK1 = "1-1";
const BOOK2 = "1-2";
const MINOR_CALC = "정수와 유리수의 계산";
const MINOR_POLY = "다각형";
const MINOR_SOLID = "다면체와 회전체";

/**
 * 우리 `Unit.section` 정확한 이름.
 *
 * ⚠️ 손으로 적되 **시험이 `prisma/seed-data/units.ts` 정본과 글자 그대로 대조한다.**
 * 눈으로는 안 갈리는 자리가 있다(다른 소단원에는 **가는 공백 U+2009** 가 든 것도 있다).
 */
const SEC = {
  정다면체: "정다면체",
  나눗셈: "유리수의 나눗셈",
  내외각: "삼각형의 내각과 외각",
  회전체: "회전체",
} as const;

// ── 소품 ────────────────────────────────────────────────────

/**
 * 주격 조사 — `$41$이` · `$5$가`. 받침 판정은 `m2Josa` **한 곳**에서 온다.
 *
 * 🔴 이 조사가 붙는 자리를 **일부러 만든다.** 공용 조사 자(`josaMismatches`)는
 * 수식 뒤에 `을|를|은|는|와|과|가` 가 와야 판정하는데, 우리 지면이 전부 「…이다」로
 * 끝나면 그 자는 이 유형에서 **구조적으로 0**이 된다 — 0 은 「깨끗」과 「못 셈」을
 * 안 가른다(2026-08-21). 그래서 뜻이 자연스러운 자리에 조사를 실어 자가 읽게 한다.
 */
function iGa(n: number): "이" | "가" {
  return eulReul(n) === "을" ? "이" : "가";
}

/** 보조사 — `$48$은` · `$45$는`. 역시 `m2Josa` 를 되쓴다. */
function eunNeun(n: number): "은" | "는" {
  return eulReul(n) === "을" ? "은" : "는";
}

/**
 * 개수를 세는 우리말 수관형사 — `세 가지`·`여섯 가지`.
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
 * 부호가 붙은 항을 이어 붙인다 — `-3+6-18`.
 *
 * ⚠️ `join("+")` 로 붙이면 음수 앞에서 `+-` 가 나가고 냄새 자(`pageSmells`)가 문다.
 */
function signedSum(xs: readonly number[]): string {
  return xs
    .map((v, i) => (i === 0 ? String(v) : v < 0 ? `-${-v}` : `+${v}`))
    .join("");
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
        const l = Math.abs((a / gcd(a, b)) * b);
        if (l < 1e7) out.add(l);
        if (a % b === 0) out.add(a / b);
        if (b % a === 0) out.add(b / a);
      }
    }
  }
  return out;
}

/**
 * 🔴 「$v$ 에 작은 수를 한두 번 곱하거나 나눈 값」.
 *
 * 지면에 수가 **두어 개뿐**인 유형에서는 `pageShortcutValues` 가 만들 수 있는 것이
 * 몇 개 안 되어 **구조적으로 약하다.** 그 자리를 이것으로 메운다.
 */
export function scaledValues(v: number): Set<number> {
  const step = (u: number, out: Set<number>): void => {
    for (const k of [2, 3, 4, 5, 6, 10, 100]) {
      out.add(u * k);
      if (u % k === 0) out.add(u / k);
    }
  };
  const first = new Set<number>([v]);
  step(v, first);
  const out = new Set<number>(first);
  for (const u of first) step(u, out);
  return out;
}

// ═══════════════════════════════════════════════════════════
// 85X  오일러 공식으로 두 정다면체를 찾아 모서리 길이의 합 견주기  (심화중)
// ═══════════════════════════════════════════════════════════

export type Platonic = {
  /** (모서리의 개수) $-$ (꼭짓점의 개수). 다섯이 **서로 다르다** — 그래서 열쇠가 된다. */
  gap: number;
  name: string;
  /** 면의 모양 이름 — 아라비아 숫자로 쓰면 `arabicPolygons` 가 문다. */
  faceName: string;
  /** 한 면의 변의 수. */
  sides: number;
  faces: number;
  edges: number;
  vertices: number;
};

/**
 * 정다면체 다섯. **오일러 공식이 이 표를 검산한다** — 시험이
 * $V-E+F=2$ 와 $E=(\text{한 면의 변의 수})\times F\div2$ 와
 * $V=(\text{한 면의 변의 수})\times F\div(\text{한 꼭짓점에 모인 면의 수})$ 로
 * 다섯 줄을 **따로 지어** 여기와 맞댄다(표를 가져다 쓰면 동어반복이다).
 */
const PLATONIC: readonly Platonic[] = [
  {
    gap: 2,
    name: "정사면체",
    faceName: "정삼각형",
    sides: 3,
    faces: 4,
    edges: 6,
    vertices: 4,
  },
  {
    gap: 4,
    name: "정육면체",
    faceName: "정사각형",
    sides: 4,
    faces: 6,
    edges: 12,
    vertices: 8,
  },
  {
    gap: 6,
    name: "정팔면체",
    faceName: "정삼각형",
    sides: 3,
    faces: 8,
    edges: 12,
    vertices: 6,
  },
  {
    gap: 10,
    name: "정십이면체",
    faceName: "정오각형",
    sides: 5,
    faces: 12,
    edges: 30,
    vertices: 20,
  },
  {
    gap: 18,
    name: "정이십면체",
    faceName: "정삼각형",
    sides: 3,
    faces: 20,
    edges: 30,
    vertices: 12,
  },
];

/** 지면이 다섯 이름과 면의 개수를 늘어놓는 줄 — 「다섯 가지뿐」이 굳힘의 절반이다. */
const PLATONIC_ROLL = PLATONIC.map((s) => s.name).join(", ");
const PLATONIC_FACE_ROLL = listTex(PLATONIC.map((s) => s.faces));

/**
 * 🔴 **굳힘 ㉠ — 오일러 공식이 «모서리와 꼭짓점의 차»를 «면의 개수»로 바꾼다.**
 *
 * $V-E+F=2$ 이므로 $F=E-V+2$ 다. 곧 「모서리가 꼭짓점보다 $d$ 만큼 많다」는
 * **면이 $d+2$ 개**라는 말과 같다. 그리고 정다면체는 다섯뿐이므로 면의 개수 하나가
 * 이름을 굳힌다 — 후보를 하나씩 넣어 보는 걸음이 없다(D-115 ⑾ 의 «중»).
 *
 * ⚠️ 이 함수는 **굳힘을 인자로 받는다** — $d$ 를 흔들면 답이 달라져야 한다(㉡).
 *    그 자가 «아니오»를 낼 수 있음은 시험이 $d=3$(면이 다섯인 정다면체는 **없다**)로
 *    보인다. 없는 $d$ 에는 `null` 을 낸다.
 */
export function platonicByGap(gap: number): Platonic | null {
  return PLATONIC.find((s) => s.gap === gap) ?? null;
}

/**
 * ㉡ 흔들기용 — **모서리의 개수가 다른** 정다면체 **전부**.
 *
 * 🔴 처음엔 「표를 한 칸 뒤로 민 **하나**」만 냈다. 그러면 굳힘을 **한 방향으로만**
 * 흔들어 보는 셈인데, 시험이 다섯을 다 대 보자 곧바로 반례가 나왔다
 * (모서리 $6$ → $30$ 으로 흔들었더니 $|360|$ 이 그대로였다 — 차의 **절댓값**이라
 * 부호가 뒤집혀도 같아진다). 그래서 **다른 모서리 개수를 가진 것을 전부** 낸다.
 *
 * 모서리 개수가 같은 짝이 둘 있다(정육면체·정팔면체가 $12$, 정십이면체·정이십면체가
 * $30$). 그 짝으로 흔들면 「흔들었는데 안 흔들린다」가 되어, 「굳힘이 장식이라서
 * 답이 그대로」와 구분이 안 된다 — 둘은 다른 말이므로 아예 뺀다.
 */
export function distinctEdgeAlternatives(solid: Platonic): Platonic[] {
  if (!PLATONIC.some((s) => s.gap === solid.gap)) {
    throw new Error(`정다면체 표에 없다 — ${solid.gap}`);
  }
  const out = PLATONIC.filter((s) => s.edges !== solid.edges);
  if (out.length === 0) throw new Error("모서리의 개수가 다른 정다면체가 없다");
  return out;
}

/** 「모서리가 꼭짓점보다 $d$ 만큼 많다」로 지목된 정다면체의 모서리 길이의 합. */
export function edgeLengthSum(gap: number, edgeLength: number): number {
  const solid = platonicByGap(gap);
  if (solid === null) throw new Error(`정다면체에 없는 차이다 — ${gap}`);
  return solid.edges * edgeLength;
}

const EULER_PAIR: TypeEntry[] = [
  defType(
    BOOK2,
    MINOR_SOLID,
    "85X",
    "오일러 공식으로 두 정다면체를 찾아 모든 모서리의 길이의 합 견주기",
    SEC.정다면체,
    "심화중",
    (rng): Body =>
      attempt(4000, (): Body | null => {
        const first = pick(rng, PLATONIC);
        const second = pick(rng, PLATONIC);
        // 같은 정다면체면 해설의 두 굳힘이 **글자까지 같은 되풀이**가 된다.
        //
        // 🔴 아래 D-20 손실은 전부 **창 전수 실측**이다(창 $5\times5\times29\times29
        // =21{,}025$판, `scripts` 밖 일회성 측정). 「이 가드 **하나만** 껐을 때」를
        // 가드마다 따로 세었고 어림한 자리는 없다. 전부 켰을 때 **판 14,278 ·
        // 서로 다른 답 148 · 최빈 정답 $120$ 이 296/14,278 = 2.07%** 다.
        // 잃은 것: 판 **17,817 → 14,278**(19.86%) · 답 **148 → 148**(안 줄었다).
        if (first.gap === second.gap) return null;
        const lenA = intBetween(rng, 2, 30);
        const lenB = intBetween(rng, 2, 30);
        const sumA = edgeLengthSum(first.gap, lenA);
        const sumB = edgeLengthSum(second.gap, lenB);
        // 「차」가 $0$ 이면 물을 것이 없다.
        // 잃은 것(창 전수): 판 **14,374 → 14,278**(0.67%) · 답 **149 → 148**
        // (사라진 답은 $0$ 하나다).
        if (sumA === sumB) return null;
        const x = Math.abs(sumA - sumB);
        const nums = [first.gap, lenA, second.gap, lenB];
        // 🔴 ㉵ 지면에 수가 넷 찍히므로 그 조합이 답과 부딪히면 안 된다.
        //    실측(앞 두 가드만 켠 16,580판 기준): 지름길 **13.14%** ·
        //    널 모형(답을 판끼리 돌려 끼운 우연 수준, 씨앗 3회) **10.71%** —
        //    우연의 **1.23배**라 이 가드는 실제로 일한다.
        //    잃은 것(창 전수, D-20): 판 **16,354 → 14,278**(12.69%) ·
        //    답 **148 → 148**(안 줄었다).
        if (pageShortcutValues(nums).has(x)) return null;
        // 🔴 ㉡ 굳힘(어느 정다면체인가)을 흔들면 답이 달라져야 한다.
        //    ⚠️ **모서리의 개수가 다른 것을 전부** 대 본다 — 하나만 대면 그 방향만
        //    막힌다(위 `distinctEdgeAlternatives` 주석의 실제 반례 참조).
        //    잃은 것(창 전수, D-20): 판 **14,402 → 14,278**(0.86%) · 답 **148 → 148**.
        if (
          distinctEdgeAlternatives(first).some(
            (s) => Math.abs(s.edges * lenA - sumB) === x,
          )
        ) {
          return null;
        }
        const labelA = "(가)";
        const labelB = "(나)";
        return {
          content:
            `두 정다면체 ${labelA}, ${labelB}가 있다. ` +
            `${labelA}는 모서리의 개수가 꼭짓점의 개수보다 $${first.gap}$만큼 많고 한 모서리의 길이가 $${lenA}\\,\\mathrm{cm}$이며, ` +
            `${labelB}는 모서리의 개수가 꼭짓점의 개수보다 $${second.gap}$만큼 많고 한 모서리의 길이가 $${lenB}\\,\\mathrm{cm}$이다. ` +
            `${labelA}의 모든 모서리의 길이의 합과 ${labelB}의 모든 모서리의 길이의 합의 차를 구하시오.`,
          answer: `$${x}\\,\\mathrm{cm}$`,
          solution: [
            `이하 길이의 단위는 $\\mathrm{cm}$이다.`,
            `다면체에서는 오일러 공식에 의하여 (꼭짓점의 개수)$-$(모서리의 개수)$+$(면의 개수)$=2$이므로, (면의 개수)$=$(모서리의 개수)$-$(꼭짓점의 개수)$+2$이다.`,
            `또 정다면체는 ${PLATONIC_ROLL}의 다섯 가지뿐이고 그 면의 개수는 차례로 ${PLATONIC_FACE_ROLL}이므로, 면의 개수를 알면 어느 정다면체인지 하나로 정해진다.`,
            solidLine(labelA, first, lenA),
            solidLine(labelB, second, lenB),
            // 🔴 조사를 **수식 바로 뒤**에 붙인다 — 그래야 공용 조사 자가 이 지면을
            //    실제로 읽는다(위 `iGa` 주석 참조).
            `따라서 $${Math.max(sumA, sumB)}$${waGwa(Math.max(sumA, sumB))} $${Math.min(sumA, sumB)}$의 차는 $${Math.max(sumA, sumB)}-${Math.min(sumA, sumB)}=${x}$이므로 두 합의 차는 $${x}\\,\\mathrm{cm}$이다.`,
          ].join("\n"),
          facts: {
            x,
            gapA: first.gap,
            lenA,
            gapB: second.gap,
            lenB,
            edgesA: first.edges,
            edgesB: second.edges,
            sumA,
            sumB,
          },
        };
      }),
  ),
];

/**
 * 정다면체 하나를 굳히고 그 모서리 길이의 합까지 가는 **한 줄**.
 *
 * 🔴 모서리의 개수를 **표에서 꺼내 오지 않고** 지면에서 다시 센다 —
 * 「면의 변을 다 세면 $($한 면의 변의 수$)\times($면의 개수$)$ 인데 한 모서리마다
 * 두 면이 만나므로 $2$ 로 나눈다」. 그래야 걸음이 안 빈다(D-116 ⑹).
 */
function solidLine(label: string, solid: Platonic, edgeLength: number): string {
  const sideTotal = solid.sides * solid.faces;
  return (
    `${label}는 모서리의 개수가 꼭짓점의 개수보다 $${solid.gap}$만큼 많으므로 면의 개수는 $${solid.gap}+2=${solid.faces}$${iGa(solid.faces)} 되고, 따라서 ${label}는 ${solid.name}이다. ` +
    `${solid.name}의 각 면은 ${solid.faceName}이고 면이 $${solid.faces}$개이므로 면의 변은 모두 $${solid.sides}\\times${solid.faces}=${sideTotal}$개인데, 한 모서리마다 두 면이 만나므로 모서리의 개수는 $${sideTotal}\\div2=${solid.edges}$이다. ` +
    `그러므로 ${label}의 모든 모서리의 길이의 합은 $${edgeLength}\\times${solid.edges}=${edgeLength * solid.edges}$이다.`
  );
}

// ═══════════════════════════════════════════════════════════
// 86X  세 유리수에서 나올 수 있는 여섯 몫 중 정수인 것 모으기  (심화상)
// ═══════════════════════════════════════════════════════════

/** 기약분수 — 분모는 늘 양수다. */
export type Rat = { n: number; d: number };

export function rat(n: number, d: number): Rat {
  if (d === 0) throw new Error("분모가 $0$ 이다");
  const s = d < 0 ? -1 : 1;
  const g = gcd(Math.abs(n), Math.abs(d)) || 1;
  return { n: (s * n) / g, d: (s * d) / g };
}

/** 역수 — 분자와 분모를 바꾼다. $0$ 에는 역수가 없다. */
export function ratRecip(r: Rat): Rat {
  if (r.n === 0) throw new Error("$0$ 에는 역수가 없다");
  return rat(r.d, r.n);
}

export function ratDiv(a: Rat, b: Rat): Rat {
  return rat(a.n * b.d, a.d * b.n);
}

export function ratIsInt(r: Rat): boolean {
  return r.d === 1;
}

/** 지면 글자 — 분모가 $1$ 이면 **정수로** 찍는다(㉰ 「분모가 $1$ 인 분수」 금지). */
export function ratTex(r: Rat): string {
  if (r.d === 1) return String(r.n);
  return r.n < 0 ? `-\\dfrac{${-r.n}}{${r.d}}` : `\\dfrac{${r.n}}{${r.d}}`;
}

/** 음수면 괄호로 싼다 — `\div-\dfrac{3}{4}` 가 지면에 나가지 않게. */
function ratParen(r: Rat): string {
  return r.n < 0 ? `\\left(${ratTex(r)}\\right)` : ratTex(r);
}

/**
 * 🔴 **여기서는 굳지 않는다.**
 *
 * 세 수에서 앞뒤를 가려 두 수를 뽑는 경우는 여섯이고, 그 몫이 정수인지는
 * **역수를 곱해 실제로 계산해야만** 안다. 부호는 정수인지 아닌지와 아무 상관이 없다 —
 * 견줌 없이 고를 성질이 없다(D-115 ⑾ 의 «상»).
 *
 * ⚠️ **정직하게 적어 둘 것** — 「절댓값이 큰 것을 작은 것으로 나누면 정수」라는
 *    어림짐작이 **아주 틀리지는 않는다.** 세 수가 $t$, $kt$, $mt$ 라 그 짝 셋 중
 *    둘은 **언제나** 정수이고, 셋째( $kt$ 와 $mt$ 사이)는 $k\mid m$ 이거나
 *    $m\mid k$ 일 때만 정수다. 실측(660판): 정수인 몫이 **셋인 판 100(15.15%)** ·
 *    **둘인 판 560(84.85%)**. 곧 그 어림짐작은 **100판에서만 옳은 답**을 주고
 *    나머지에서는 한 짝을 더 세어 틀린다 — 그리고 **어느 쪽인지는 계산해 봐야**
 *    안다. 시험이 이 비율을 재어 「어림짐작으로 통하는 판」이 사분의 일을 넘지
 *    않는 것을 잠근다.
 *
 * 낸 것: 「$i$ 번째를 $j$ 번째로 나눈 몫」 여섯을 **지면에 찍힌 차례 그대로**.
 */
export function allQuotients(
  rs: readonly Rat[],
): { i: number; j: number; q: Rat }[] {
  const out: { i: number; j: number; q: Rat }[] = [];
  for (let i = 0; i < rs.length; i += 1) {
    for (let j = 0; j < rs.length; j += 1) {
      if (i === j) continue;
      out.push({ i, j, q: ratDiv(rs[i]!, rs[j]!) });
    }
  }
  return out;
}

/**
 * 그중 **정수인 것만**. 이 유형의 정답은 여기 실린 값들의 합이다.
 *
 * ⚠️ 그 자가 «아니오»를 낼 수 있음은 시험이 **정수인 몫이 하나도 없는** 세 쌍으로
 *    보인다(예: $\dfrac12$, $\dfrac13$, $\dfrac15$ — 서로 나누어떨어지지 않는다).
 */
export function integerQuotients(rs: readonly Rat[]): number[] {
  return allQuotients(rs)
    .filter((e) => ratIsInt(e.q))
    .map((e) => e.q.n);
}

/** 분모 후보 — 셋이 모두 «진짜 분수»가 되게 한다(정수가 섞이면 지면이 밋밋하다). */
const RATIO_DENOMS: readonly number[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const QUOTIENT_HUNT: TypeEntry[] = [
  defType(
    BOOK1,
    MINOR_CALC,
    "86X",
    "세 유리수에서 나올 수 있는 여섯 몫 중 정수인 것을 모두 찾아 더하기",
    SEC.나눗셈,
    "심화상",
    (rng): Body =>
      attempt(6000, (): Body | null => {
        const den = pick(rng, RATIO_DENOMS);
        const num = intBetween(rng, 1, 20);
        if (gcd(num, den) !== 1) return null;
        const k = intBetween(rng, 2, 24);
        const m = intBetween(rng, 2, 24);
        // 두 배수가 같으면 두 유리수가 같아져 「서로 다른 두 수」가 성립하지 않는다.
        if (k === m) return null;
        const signs = [
          pick(rng, [1, -1]),
          pick(rng, [1, -1]),
          pick(rng, [1, -1]),
        ];
        // 부호가 셋 다 같으면 여섯 몫이 **모두 양수**라 부호를 가르는 걸음이 죽는다.
        //
        // 🔴 아래 D-20 손실은 전부 **창 전수 실측**이다(창 538,384판 — 분모 11 ·
        // 분자 20 · 배수 $k$,$m$ 각 23 · 부호 8). 「이 가드 **하나만** 껐을 때」를
        // 가드마다 따로 세었다. 전부 켰을 때 **판 36,100 · 서로 다른 답 67 ·
        // 최빈 정답 $-1$ 이 2,156/36,100 = 5.97%** 다.
        // 잃은 것: 판 **46,984 → 36,100**(23.17%) · 답 **93 → 67**(27.96%.
        // 음수 답이 통째로 사라진다).
        if (signs[0] === signs[1] && signs[1] === signs[2]) return null;
        const base: Rat[] = [
          rat(signs[0]! * num, den),
          rat(signs[1]! * k * num, den),
          rat(signs[2]! * m * num, den),
        ];
        // 세 수가 모두 «진짜 분수»여야 「역수를 곱한다」가 매 줄에서 일한다.
        // 잃은 것(창 전수): 판 **70,380 → 36,100**(48.71%) · 답 **67 → 67**.
        if (base.some((r) => ratIsInt(r))) return null;
        // 값이 너무 크면 지면의 분자가 세 자리로 커져 셈이 산만해진다.
        // 잃은 것(창 전수): 판 **68,784 → 36,100**(47.52%) · 답 **67 → 67**.
        if (base.some((r) => Math.abs(r.n / r.d) > 20)) return null;
        // 🔴 ㉵ **분모가 셋 다 같으면 지면이 답을 흘린다.** 그때는 세 수가
        //    $\dfrac{49}{4}$, $\dfrac{7}{4}$, $-\dfrac{35}{4}$ 처럼 나와서 학생이
        //    분모를 통째로 지우고 **분자만 나눠도** 같은 답이 나온다 — 여섯 몫을
        //    견주는 일이 통째로 사라진다. 배수 $k$·$m$ 이 분모와 약분되도록 골라
        //    분모를 서로 다르게 만든다.
        //    잃은 것(창 전수, D-20): 판 **105,564 → 36,100**(65.80%) ·
        //    답 **67 → 67**(안 줄었다).
        //    🔴 이 가드가 이 유형에서 가장 많이 깎는다 — 그 대가로 지면이 답을 안 흘린다.
        if (new Set(base.map((r) => r.d)).size < 2) return null;
        // 🔴 ㉵ 안 섞으면 지면이 늘 $|A|<|B|<|C|$ 라 「큰 것을 작은 것으로」가
        //    통한다는 잘못된 암시를 준다. 셈은 섞은 **뒤의** 차례로 한다.
        const shown = shuffle(rng, base);
        const ints = integerQuotients(shown);
        // 「모두 찾아 더한다」가 뜻을 가지려면 정수인 몫이 둘 이상이어야 한다.
        // ⚠️ **실측 걸림 0건**(창 전수에서 이 가드만 껐을 때 36,100 → 36,100).
        //    세 수가 $t$, $kt$, $mt$ 라 «큰 것 $\div$ $t$» 둘이 **언제나** 정수이기
        //    때문이다 — 개수는 구조상 $2$ 또는 $3$ 이다($k\mid m$ 이거나 $m\mid k$ 이면
        //    셋). 「일하는 가드」로 읽지 말 것. 뜻(둘 이상이어야 «모두»가 성립한다)을
        //    지면 옆에 적어 두려고 남긴다. 시험이 그 «0» 을 **구조적으로 0** 이라고
        //    따로 찍고, 개수가 $2$·$3$ 둘 다 실제로 나오는 것도 함께 잰다.
        if (ints.length < 2) return null;
        const x = ints.reduce((a, b) => a + b, 0);
        // 합이 $0$ 이면 「모두 더한 값」이 부호만 상쇄한 허깨비가 된다.
        // ⚠️ **실측 걸림 0건**(36,100 → 36,100). 정수 몫이 둘이면 $\pm k\pm m$ 이고
        //    $k \ne m$ 이라 $0$ 이 될 수 없으며, 셋이면 $\pm k\pm m\pm(m\div k)$ 인데
        //    부호 규약상 곱이 $+$ 라 역시 $0$ 이 안 된다. 역시 뜻을 남기는 줄이다.
        if (x === 0) return null;
        const nums = shown.flatMap((r) => [Math.abs(r.n), r.d]);
        // 🔴 ㉵ 지면에 분자·분모가 여섯 찍히므로 그 조합이 답과 부딪히면 안 된다.
        //    실측(앞 가드를 켠 48,340판 기준): 지름길 **24.91%** · 널 모형
        //    **26.20%** — 🔴 **우연의 0.95배로, 우연보다 오히려 낮다.** 곧 이 자는
        //    여기서 **아무 판별력이 없다**(지면에 수가 여섯이라 도달 가능한 값이
        //    원래 많다). 「24.91% 가 걸렸으니 뻔하다」로도, 「걸렀으니 깨끗하다」로도
        //    읽지 말 것 — 이 유형의 판별력은 ㉠ 축(어느 몫이 살아남는가)이 든다.
        //    그래도 **끄지는 않는다**: 우연 수준이어도 답이 지면 수 조합과 **같아지는
        //    바로 그 판**은 학생 눈에 뻔해 보이기 때문이다.
        //    잃은 것(창 전수, D-20): 판 **47,988 → 36,100**(24.77%) · 답 **68 → 67**.
        if (pageShortcutValues(nums).has(x)) return null;
        // 🔴 ㉡ 굳힘(어느 몫이 정수인가)을 흔든다 — 한 수의 분자를 $1$ 늘리면
        //    정수인 몫의 자리가 달라져 답도 달라져야 한다.
        //    잃은 것(창 전수, D-20): 판 **36,300 → 36,100**(0.55%) · 답 **67 → 67**.
        const shaken = [...shown];
        shaken[0] = rat(shown[0]!.n + (shown[0]!.n > 0 ? 1 : -1), shown[0]!.d);
        const shakenSum = integerQuotients(shaken).reduce((a, b) => a + b, 0);
        if (shakenSum === x) return null;
        const lines = allQuotients(shown).map((e) => {
          const a = shown[e.i]!;
          const b = shown[e.j]!;
          // 🔴 조사를 **수식 바로 뒤**에 붙인다 — 그래야 공용 조사 자가 이 지면을
          //    실제로 읽는다(위 `iGa` 주석 참조). 분수는 「$b$분의 $a$」로 읽으므로
          //    마지막에 오는 수가 **분자**이고, `eunNeun` 이 그것을 받는다.
          const head = `$${ratParen(a)}\\div${ratParen(b)}=${ratParen(a)}\\times${ratParen(ratRecip(b))}=${ratTex(e.q)}$`;
          return ratIsInt(e.q)
            ? `${head}${eunNeun(e.q.n)} 정수이다.`
            : `${head}${eunNeun(e.q.n)} 정수가 아니다.`;
        });
        return {
          content:
            `세 유리수 $${ratTex(shown[0]!)}$, $${ratTex(shown[1]!)}$, $${ratTex(shown[2]!)}$ 중에서 ` +
            `서로 다른 두 수를 뽑아 (앞의 수)$\\div$(뒤의 수)를 계산한다. ` +
            `이때 나올 수 있는 여섯 개의 몫 중에서 정수인 것을 모두 더한 값을 구하시오.`,
          answer: `$${x}$`,
          solution: [
            `두 유리수의 나눗셈은 나누는 수의 역수를 곱하는 것과 같다.`,
            `세 수 중에서 앞의 수와 뒤의 수를 가려 뽑는 경우는 여섯 가지이므로, 여섯 가지를 모두 계산하여 몫이 정수인지 하나씩 따진다.`,
            ...lines,
            `몫이 정수인 것은 ${listTex(ints)}의 ${koreanCount(ints.length)} 가지이다.`,
            `따라서 구하는 값은 $${signedSum(ints)}=${x}$이다.`,
          ].join("\n"),
          facts: {
            x,
            den,
            num,
            k,
            m,
            cnt: ints.length,
            first: ints[0]!,
          },
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 87X  외각의 성질을 두 번 써서 세 내각을 굳히기  (심화중)
// ═══════════════════════════════════════════════════════════

export type TriangleAngles = { angX: number; angY: number; angZ: number };

/**
 * 🔴 **굳힘은 이 소단원의 개념 하나다 — 「한 외각의 크기는 이웃하지 않는 두 내각의 합」.**
 *
 * $\angle X$ 의 외각이 $\angle Y+\angle Z$ 이므로
 * $\angle Y+\angle Z=a\angle Y+s_1c$ 에서 $\angle Z=(a-1)\angle Y+s_1c$ 다.
 * 같은 성질을 한 번 더 쓰면 $\angle X=(b-1)\angle Z+s_2e$ 이고, 세 내각의 합이
 * $180^\circ$ 이므로 $\angle Y+b\angle Z+s_2e=180$ 이다. 둘을 합치면
 * $\bigl(1+b(a-1)\bigr)\angle Y=180-bs_1c-s_2e$ — 각을 하나씩 넣어 보는 걸음이 없다
 * (D-115 ⑾ 의 «중»).
 *
 * 세 각이 모두 자연수이고 $10^\circ$ 이상 $160^\circ$ 이하일 때만 낸다. 아니면 `null`.
 *
 * ⚠️ 그 자가 «아니오»를 낼 수 있음은 시험이 **해가 정수가 아닌 판**과 **각이 음수가
 *    되는 판**으로 보인다(둘 다 `null`).
 */
export function solveByExteriorChain(
  a: number,
  c: number,
  s1: number,
  b: number,
  e: number,
  s2: number,
): TriangleAngles | null {
  const den = 1 + b * (a - 1);
  if (den <= 0) return null;
  const rhs = 180 - b * s1 * c - s2 * e;
  if (rhs <= 0 || rhs % den !== 0) return null;
  const angY = rhs / den;
  const angZ = (a - 1) * angY + s1 * c;
  const angX = 180 - angY - angZ;
  if (angX !== (b - 1) * angZ + s2 * e) return null;
  for (const v of [angX, angY, angZ]) {
    if (!Number.isInteger(v) || v < 10 || v > 160) return null;
  }
  return { angX, angY, angZ };
}

/** 계수 $1$ 은 안 적는다 — `1\angle Y` 는 지면 냄새다. */
function angleTerm(coef: number, label: string): string {
  return coef === 1 ? `\\angle ${label}` : `${coef}\\angle ${label}`;
}

/** `+10^\circ` / `-6^\circ` — 부호를 붙여 이어 쓴다(`+-` 가 안 나오게). */
function degTail(sign: number, v: number): string {
  return sign > 0 ? `+${v}^\\circ` : `-${v}^\\circ`;
}

/**
 * `2\times32` — 계수가 $1$ 이면 곱셈을 안 적는다(지면 냄새).
 *
 * 🔴 **도 단위를 안 붙인다.** 붙이면 그 수식 도막이 「문자가 든 식」이 되어 시험의
 * 산술 등식 계산기가 **아예 안 본다** — 그러면 이 유형의 셈은 검사 밖이 된다.
 * 셈은 맨 수로 적고, 그 결과를 바로 뒤에서 도 단위로 다시 말한다.
 */
function plainProduct(coef: number, v: number): string {
  return coef === 1 ? `${v}` : `${coef}\\times${v}`;
}

/** `+10` / `-6` — 도 단위 없이 부호만 붙여 이어 쓴다. */
function plainTail(sign: number, v: number): string {
  return sign > 0 ? `+${v}` : `-${v}`;
}

const EXTERIOR_CHAIN: TypeEntry[] = [
  defType(
    BOOK2,
    MINOR_POLY,
    "87X",
    "외각의 성질을 두 번 이용하여 나머지 한 외각의 크기 구하기",
    SEC.내외각,
    "심화중",
    (rng): Body =>
      attempt(6000, (): Body | null => {
        const a = intBetween(rng, 2, 6);
        const b = intBetween(rng, 2, 6);
        const c = intBetween(rng, 1, 60);
        const e = intBetween(rng, 1, 60);
        const s1 = pick(rng, [1, -1]);
        const s2 = pick(rng, [1, -1]);
        const ang = solveByExteriorChain(a, c, s1, b, e, s2);
        if (ang === null) return null;
        const x = 180 - ang.angZ;
        // 🔴 ㉵ 지면에 수가 넷 찍히므로 그 조합이 답과 부딪히면 안 된다.
        //
        // 🔴 아래 D-20 손실은 전부 **창 전수 실측**이다. 격자
        // $2\le a,b\le6$ · $1\le c,e\le60$ · 부호 넷 $=360{,}000$ 자리 중 세 각이
        // 실제로 성립하는 것이 **29,973판**이고, 그것이 아래 분모다. 전부 켰을 때
        // **판 5,511 · 서로 다른 답 104 · 최빈 정답 $145$ 가 153/5,511 = 2.78%** 다.
        // 잃은 것: 판 **5,543 → 5,511**(0.58%) · 답 **104 → 104**(안 줄었다).
        // ⚠️ 이 자는 여기서 **거의 아무것도 못 잡는다** — 지면에 수가 $a$·$c$·$b$·$e$
        //    넷뿐이고 답은 $180$ 에서 빼서 나오는 값이라 그 조합에 잘 안 걸린다.
        if (pageShortcutValues([a, c, b, e]).has(x)) return null;
        // 🔴 그래서 「$c$ 또는 $e$ 에 작은 수를 한두 번 곱하거나 나눈 값」을 따로 막는다.
        //    잃은 것(창 전수, D-20): 판 **6,040 → 5,511**(8.76%) · 답 **104 → 104**.
        //    두 자를 합쳐 잰 지름길 비율은 **8.40%** 이고 널 모형(답을 판끼리 돌려
        //    끼운 우연 수준, 씨앗 3회)은 **7.69%** 다 — 우연의 **1.09배**.
        //    「걸렀으니 깨끗하다」로 읽지 말 것.
        if (scaledValues(c).has(x) || scaledValues(e).has(x)) return null;
        // 🔴 ㉡ 굳힘(외각의 성질로 세운 두 관계)을 흔들면 답이 달라져야 한다.
        //    네 인자를 하나씩 올려 본다. ⚠️ 흔든 값이 각을 못 이루면(`null`) 그것은
        //    「흔들어도 같다」가 **아니다** — 그런 자리는 답이 확실히 달라진다.
        //    그래서 **넷이 모두 `null`** 일 때만 「흔들 수가 없다」로 보고 버린다.
        const shakes = [
          solveByExteriorChain(a + 1, c, s1, b, e, s2),
          solveByExteriorChain(a, c, s1, b + 1, e, s2),
          solveByExteriorChain(a, c + 1, s1, b, e, s2),
          solveByExteriorChain(a, c, s1, b, e + 1, s2),
        ];
        //    잃은 것(창 전수, D-20): 판 **27,455 → 5,511**(79.93%) · 답 **105 → 104**.
        //    🔴 이 가드가 이 유형에서 가장 많이 깎는다 —
        //    $(a,b,c,e)$ 를 하나씩 올린 넷이 **모두** 각을 못 이루는 자리가 그만큼 많다.
        if (shakes.every((t) => t === null)) return null;
        //    ⚠️ **실측 걸림 0건**(창 전수에서 이 가드만 껐을 때 5,511 → 5,511).
        //    흔든 값이 각을 이루기만 하면 $\angle Z$ 가 반드시 달라지기 때문이다.
        //    「일하는 가드」로 읽지 말 것 — 시험이 그 «0» 을 **구조적으로 0** 이라고
        //    따로 찍는다. 그래도 남긴다: 위 창을 넓히는 날 이 자리가 살아난다.
        if (shakes.some((t) => t !== null && 180 - t.angZ === x)) return null;
        // 🔴 ㉵ 사슬 $X\to Y\to Z$ 를 여섯 가지로 돌린다 — 안 돌리면 묻는 각이 늘 $\angle C$ 다.
        const [lx, ly, lz] = shuffle(rng, ["A", "B", "C"]);
        const bigX = s1 > 0 ? "크고" : "작고";
        const bigY = s2 > 0 ? "크다" : "작다";
        const den = 1 + b * (a - 1);
        const rhs = 180 - b * s1 * c - s2 * e;
        return {
          content:
            `삼각형 $ABC$에서 $\\angle ${lx}$의 외각의 크기는 $\\angle ${ly}$의 크기의 $${a}$배보다 $${c}^\\circ$만큼 ${bigX}, ` +
            `$\\angle ${ly}$의 외각의 크기는 $\\angle ${lz}$의 크기의 $${b}$배보다 $${e}^\\circ$만큼 ${bigY}. ` +
            `이때 $\\angle ${lz}$의 외각의 크기를 구하시오.`,
          answer: `$${x}^\\circ$`,
          solution: [
            `삼각형의 한 외각의 크기는 그와 이웃하지 않는 두 내각의 크기의 합과 같다.`,
            `$\\angle ${lx}$의 외각의 크기는 $\\angle ${ly}+\\angle ${lz}$이므로 $\\angle ${ly}+\\angle ${lz}=${angleTerm(a, ly)}${degTail(s1, c)}$이고, 양변에서 $\\angle ${ly}$를 빼면 $\\angle ${lz}=${angleTerm(a - 1, ly)}${degTail(s1, c)}$이다.`,
            `같은 성질로 $\\angle ${ly}$의 외각의 크기는 $\\angle ${lz}+\\angle ${lx}$이므로 $\\angle ${lz}+\\angle ${lx}=${angleTerm(b, lz)}${degTail(s2, e)}$이고, 양변에서 $\\angle ${lz}$를 빼면 $\\angle ${lx}=${angleTerm(b - 1, lz)}${degTail(s2, e)}$이다.`,
            `삼각형의 세 내각의 크기의 합은 $180^\\circ$이므로 $\\angle ${lx}+\\angle ${ly}+\\angle ${lz}=180^\\circ$이다.`,
            `여기에 $\\angle ${lx}=${angleTerm(b - 1, lz)}${degTail(s2, e)}$를 대입하면 $\\angle ${ly}+${angleTerm(b, lz)}${degTail(s2, e)}=180^\\circ$이다.`,
            `다시 $\\angle ${lz}=${angleTerm(a - 1, ly)}${degTail(s1, c)}$를 대입하면 $\\angle ${ly}+${b}\\times\\left(${angleTerm(a - 1, ly)}${degTail(s1, c)}\\right)${degTail(s2, e)}=180^\\circ$이므로 $${angleTerm(den, ly)}=${rhs}^\\circ$이다.`,
            `그러므로 $\\angle ${ly}$의 크기는 $${rhs}\\div${den}=${ang.angY}$에서 $${ang.angY}^\\circ$이고, $\\angle ${lz}$의 크기는 $${plainProduct(a - 1, ang.angY)}${plainTail(s1, c)}=${ang.angZ}$에서 $${ang.angZ}^\\circ$, $\\angle ${lx}$의 크기는 $${plainProduct(b - 1, ang.angZ)}${plainTail(s2, e)}=${ang.angX}$에서 $${ang.angX}^\\circ$이다.`,
            `세 내각의 크기를 더하면 $${ang.angX}+${ang.angY}+${ang.angZ}=180$${iGa(180)} 되어 조건에 맞는다.`,
            // 🔴 조사를 **수식 바로 뒤**에 붙인다 — 그래야 공용 조사 자가 읽는다.
            `따라서 $\\angle ${lz}$의 외각의 크기는 $180$${waGwa(180)} $${ang.angZ}$의 차인 $180-${ang.angZ}=${x}$에서 $${x}^\\circ$이다.`,
          ].join("\n"),
          facts: {
            x,
            a,
            c,
            s1,
            b,
            e,
            s2,
            angX: ang.angX,
            angY: ang.angY,
            angZ: ang.angZ,
          },
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 88X  세 회전체의 회전축을 포함하는 단면의 넓이 견주기  (심화상)
// ═══════════════════════════════════════════════════════════

export type SectionCase = {
  kind: "원기둥" | "원뿔" | "원뿔대";
  /** 회전축에 수직인 방향의 치수들 — 반지름이 되는 값. */
  radii: readonly number[];
  /** 회전축 방향의 치수 — 높이가 되는 값. */
  height: number;
  area: number;
};

/**
 * 🔴 **여기서는 굳지 않는다.**
 *
 * 세 평면도형이 서로 다른 회전체를 만들고, 회전축을 포함하는 단면도 서로 다른
 * 도형이 된다 — 직사각형·이등변삼각형·사다리꼴이다. 넓이를 내는 식이
 * $2rh$·$rh$·$(a+b)h$ 로 **꼴이 다르므로** 계산하지 않고 견줄 방법이 없다
 * (D-115 ⑾ 의 «상»).
 *
 * ⚠️ 그 자가 «아니오»를 낼 수 있음은 시험이 **셋이 같은 넓이인 판**으로 보인다 —
 *    그때는 「가장 큰 것과 가장 작은 것」이 갈리지 않고 답이 $0$ 이 된다.
 */
export function axialSectionAreas(
  cylinder: { r: number; h: number },
  cone: { r: number; h: number },
  frustum: { top: number; bottom: number; h: number },
): SectionCase[] {
  return [
    {
      kind: "원기둥",
      radii: [cylinder.r],
      height: cylinder.h,
      area: 2 * cylinder.r * cylinder.h,
    },
    {
      kind: "원뿔",
      radii: [cone.r],
      height: cone.h,
      area: cone.r * cone.h,
    },
    {
      kind: "원뿔대",
      radii: [frustum.top, frustum.bottom],
      height: frustum.h,
      area: (frustum.top + frustum.bottom) * frustum.h,
    },
  ];
}

const LABELS = ["(가)", "(나)", "(다)"] as const;

const SECTION_COMPARE: TypeEntry[] = [
  defType(
    BOOK2,
    MINOR_SOLID,
    "88X",
    "세 평면도형을 회전시켜 생기는 단면의 넓이를 모두 구하여 견주기",
    SEC.회전체,
    "심화상",
    (rng): Body =>
      attempt(6000, (): Body | null => {
        const cylR = intBetween(rng, 2, 12);
        const cylH = intBetween(rng, 3, 16);
        // 원기둥을 만드는 직사각형의 가로와 세로가 같으면 목록에 「가로 $11$cm, 세로 $11$cm인
        // 직사각형」이 선다 — 정사각형을 직사각형이라 부르는 꼴이다(씨앗 1,000 중 5.5%,
        // 2026-09-27). 직각삼각형의 두 변이 같은 것(직각이등변)은 옳은 도형이라 둔다.
        // 잃은 것(표본 400,000판, 아래 가드를 다 켠 뒤): 판 **66,591 → 62,361**(6.35%) ·
        // 답 **171 → 171**. 통과율 16.65% → 15.59% — 6,000번이면 던질 확률은 0 으로 읽힌다.
        if (cylR === cylH) return null;
        const conR = intBetween(rng, 3, 18);
        const conH = intBetween(rng, 3, 18);
        const top = intBetween(rng, 2, 10);
        const bottom = intBetween(rng, top + 1, 14);
        const frsH = intBetween(rng, 2, 12);
        const cases = axialSectionAreas(
          { r: cylR, h: cylH },
          { r: conR, h: conH },
          { top, bottom, h: frsH },
        );
        const areas = cases.map((cs) => cs.area);
        // 세 넓이가 서로 달라야 「가장 큰 것」과 「가장 작은 것」이 갈린다.
        //
        // 🔴 아래 D-20 손실은 **표본 400,000판 실측**이다(치수가 일곱이라 창 전수는
        // 2천만 자리를 넘는다 — 그래서 여기만 전수가 아니라 **표본**이고, 그 사실을
        // 적어 둔다). 「이 가드 **하나만** 껐을 때」를 가드마다 따로 세었다. 전부
        // 켰을 때 **판 65,240 · 서로 다른 답 147 · 최빈 정답 $52$ 가
        // 1,681/65,240 = 2.58%** 다.
        // 잃은 것: 판 **67,353 → 65,240**(3.14%) · 답 **149 → 147**.
        if (new Set(areas).size !== 3) return null;
        const big = Math.max(...areas);
        const small = Math.min(...areas);
        // 세 넓이가 너무 벌어지면 눈으로도 갈려 「다 계산해서 견준다」가 무색하다.
        // 잃은 것(표본): 판 **177,185 → 65,240**(63.18%) · 답 **247 → 147**.
        // 🔴 이 가드가 이 유형에서 가장 많이 깎는다 — 그 대가로 「견주는 일」이
        // 실제 일이 된다.
        if (big > small * 2.5) return null;
        // 지면에 실릴 만한 크기로 묶는다.
        // 잃은 것(표본): 판 **68,532 → 65,240**(4.80%) · 답 **165 → 147**.
        if (small < 30 || big > 300) return null;
        const x = big - small;
        // 🔴 ㉡ 굳힘(어느 회전체가 가장 넓은가)을 흔들면 답이 달라져야 한다.
        //    잃은 것(표본, D-20): 판 **86,752 → 65,240**(24.80%) · 답 **150 → 147**.
        //    ⚠️ 반지름을 $1$ 늘려도 「가장 큰 것 $-$ 가장 작은 것」이 그대로인 자리가
        //    이만큼 많다 — 원기둥이 최댓값도 최솟값도 아닐 때가 그렇다.
        const shakenAreas = axialSectionAreas(
          { r: cylR + 1, h: cylH },
          { r: conR, h: conH },
          { top, bottom, h: frsH },
        ).map((cs) => cs.area);
        if (Math.max(...shakenAreas) - Math.min(...shakenAreas) === x) {
          return null;
        }
        // 🔴 ㉵ 세 도형의 차례를 섞는다 — 안 섞으면 가장 넓은 단면이 늘 같은 자리다.
        const order = shuffle(rng, [0, 1, 2]);
        const shownStems: string[] = [];
        const shownWork: string[] = [];
        order.forEach((idx, slot) => {
          const label = LABELS[slot]!;
          const cs = cases[idx]!;
          shownStems.push(`${label} ${stemOf(cs)}`);
          shownWork.push(`${label} ${workOf(label, cs)}`);
        });
        const bigLabel = LABELS[order.indexOf(areas.indexOf(big))]!;
        const smallLabel = LABELS[order.indexOf(areas.indexOf(small))]!;
        const content =
          `다음 세 평면도형을 각각 주어진 변을 회전축으로 하여 $1$회전 시켜 회전체를 만들었다. ` +
          `세 회전체를 각각 회전축을 포함하는 평면으로 자를 때 생기는 단면의 넓이 중에서 ` +
          `가장 큰 것과 가장 작은 것의 차를 구하시오.\n${shownStems.join("\n")}`;
        // 🔴 ㉵ 지면에 찍힌 수의 조합이 답과 부딪히면 안 된다.
        //
        // ⚠️ **지면을 먼저 짓고 거기서 수를 뽑는다.** 처음엔 치수 여덟을 손으로 넘겼는데,
        //    회전축이 되는 변의 길이는 **두 번 찍힌다**(「세로의 길이가 $9$」이자
        //    「길이가 $9$인 변」). 그래서 지면의 수는 여덟이 아니라 **열**이고,
        //    손 목록으로는 그 합(「모든 수를 더한 값」)을 못 만들어 실측 660판 중
        //    한 판이 새어 나갔다(답 $102$ 가 지면 열 수의 합이었다).
        //    m1Top4 `62W` 가 「가운데 계급 경계는 두 번 찍힌다」로 겪은 그 자리다.
        //    잃은 것(표본, D-20): 판 **99,397 → 65,240**(34.36%) · 답 **160 → 147**.
        //    실측(앞 가드를 켠 96,818판 기준): 지름길 **32.78%** · 널 모형 **26.46%**
        //    — 우연의 **1.24배**라 이 가드는 실제로 일한다.
        //    (두 수치 모두 지면에서 뽑은 **열** 개로 다시 잰 값이다.)
        const nums = [...content.matchAll(/\d+/g)].map((m) => Number(m[0]));
        if (pageShortcutValues(nums).has(x)) return null;
        return {
          content,
          answer: `$${x}\\,\\mathrm{cm}^{2}$`,
          solution: [
            `이하 길이의 단위는 $\\mathrm{cm}$, 넓이의 단위는 $\\mathrm{cm}^{2}$이다.`,
            ...shownWork,
            `세 단면의 넓이를 견주면 가장 큰 것은 ${bigLabel}의 $${big}$이고 가장 작은 것은 ${smallLabel}의 $${small}$이다.`,
            `따라서 구하는 차는 $${big}-${small}=${x}$이므로 두 넓이의 차는 $${x}\\,\\mathrm{cm}^{2}$이다.`,
          ].join("\n"),
          facts: {
            x,
            cylR,
            cylH,
            conR,
            conH,
            top,
            bottom,
            frsH,
            big,
            small,
          },
        };
      }),
  ),
];

/** 발문 한 줄 — 평면도형과 회전축을 **말로만** 적는다(그림을 가리키지 않는다). */
function stemOf(cs: SectionCase): string {
  if (cs.kind === "원기둥") {
    const r = cs.radii[0]!;
    return `가로의 길이가 $${r}\\,\\mathrm{cm}$, 세로의 길이가 $${cs.height}\\,\\mathrm{cm}$인 직사각형을 길이가 $${cs.height}\\,\\mathrm{cm}$인 변을 회전축으로 한 것`;
  }
  if (cs.kind === "원뿔") {
    const r = cs.radii[0]!;
    return `직각을 낀 두 변의 길이가 각각 $${r}\\,\\mathrm{cm}$, $${cs.height}\\,\\mathrm{cm}$인 직각삼각형을 길이가 $${cs.height}\\,\\mathrm{cm}$인 변을 회전축으로 한 것`;
  }
  const [top, bottom] = cs.radii;
  return `윗변의 길이가 $${top}\\,\\mathrm{cm}$, 아랫변의 길이가 $${bottom}\\,\\mathrm{cm}$, 높이가 $${cs.height}\\,\\mathrm{cm}$이고 두 밑변에 수직인 변이 있는 사다리꼴을 그 수직인 변을 회전축으로 한 것`;
}

/**
 * 해설 한 줄 — **어떤 회전체가 생기는지**, **단면이 어떤 도형인지**, 그 넓이가 얼마인지를
 * 차례로 적는다. 회전축에 수직인 치수는 회전하면 **지름**이 되므로 $2$ 를 곱한다.
 */
function workOf(label: string, cs: SectionCase): string {
  if (cs.kind === "원기둥") {
    const r = cs.radii[0]!;
    return `직사각형을 길이가 $${cs.height}$인 변을 회전축으로 하여 $1$회전 시키면 밑면인 원의 반지름의 길이가 $${r}$이고 높이가 $${cs.height}$인 원기둥이 생긴다. 이 원기둥을 회전축을 포함하는 평면으로 자른 단면은 가로의 길이가 밑면인 원의 지름과 같은 $2\\times${r}=${2 * r}$이고 세로의 길이가 $${cs.height}$인 직사각형이므로, 그 넓이는 $${2 * r}\\times${cs.height}=${cs.area}$${iGa(cs.area)} 된다.`;
  }
  if (cs.kind === "원뿔") {
    const r = cs.radii[0]!;
    return `직각삼각형을 길이가 $${cs.height}$인 변을 회전축으로 하여 $1$회전 시키면 밑면인 원의 반지름의 길이가 $${r}$이고 높이가 $${cs.height}$인 원뿔이 생긴다. 이 원뿔을 회전축을 포함하는 평면으로 자른 단면은 밑변의 길이가 밑면인 원의 지름과 같은 $2\\times${r}=${2 * r}$이고 높이가 $${cs.height}$인 이등변삼각형이므로, 그 넓이는 $${2 * r}\\times${cs.height}\\div2=${cs.area}$${iGa(cs.area)} 된다.`;
  }
  const top = cs.radii[0]!;
  const bottom = cs.radii[1]!;
  return `사다리꼴을 두 밑변에 수직인 변을 회전축으로 하여 $1$회전 시키면 윗면인 원의 반지름의 길이가 $${top}$, 아랫면인 원의 반지름의 길이가 $${bottom}$이고 높이가 $${cs.height}$인 원뿔대가 생긴다. 이 원뿔대를 회전축을 포함하는 평면으로 자른 단면은 윗변의 길이가 $2\\times${top}=${2 * top}$, 아랫변의 길이가 $2\\times${bottom}=${2 * bottom}$이고 높이가 $${cs.height}$인 사다리꼴이므로, 그 넓이는 $\\left(${2 * top}+${2 * bottom}\\right)\\times${cs.height}\\div2=${cs.area}$${iGa(cs.area)} 된다.`;
}

export const M1_TOP_5F: TypeEntry[] = [
  ...EULER_PAIR,
  ...QUOTIENT_HUNT,
  ...EXTERIOR_CHAIN,
  ...SECTION_COMPARE,
];
