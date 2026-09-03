/**
 * 중1 **5차 확대 갈래 (갈래 a)** — `심화중`·`심화상` 넷을 더한다 (D-116, 2026-09-03).
 *
 * ## 왜 또 새 파일인가
 *
 * `m1Top.ts`~`m1Top4.ts` 는 각각 자기 유형을 **개수로 얼린** 시험을 달고 있다
 * (`expect(M1_TOP_4).toHaveLength(4)` 따위). 거기에 유형을 더하면 그 가드가 빨개지고,
 * 초록으로 되돌리는 유일한 길이 **가드를 무르는 것**이 된다. 그리고 이번 물결은
 * 21갈래가 **동시에** 돈다 — 남의 파일을 만지면 말없이 덮어쓴다(2026-08-23
 * 「미커밋 새 파일이 가장 약한 고리」). 새 파일 하나 + `generate.ts` **spread 한 줄**
 * (리드 몫)이면 그 둘을 다 피한다.
 *
 * 규칙을 두 벌로 두지 않으려고 4차 물결의 `pageShortcutValues`·`scaledValues` 를
 * **읽어만 온다**(고치지 않는다).
 *
 * ## 무엇이 «중»이고 무엇이 «상»인가 — `m1Top.ts` 머리말의 그 자
 *
 * ```
 * 심화중  마디 하나가 안 굳고, **그 소단원의 개념**이 그것을 굳힌다.
 *         성질 하나가 후보를 «끝까지 계산하지 않고» 거른다.        (D-115 ⑾)
 * 심화상  성질로 못 굳혀 후보를 **다 만들어 견줘야** 한다.
 * ```
 *
 * | 키 | 갈래 | 안 굳는 마디 | 무엇이 굳히나 | 같은 소단원 형제와 무엇이 다른가 |
 * |---|---|---|---|---|
 * | `각\|65X` | **심화중** | $\angle AOB$ 와 $\angle COD$ — 발문이 **둘 다 안 준다**. 각각은 끝내 하나로 안 정해진다 | 이 소단원의 개념 **평각 $180^\circ$** 하나가 굳힌다. 두 각의 «합»만 정해지고, 이등분선이 이루는 각은 그 **합의 절반**만 쓰므로 **두 각을 하나도 구하지 않고** 답이 나온다(D-115 ⑾) | `07`·`08`·`09`·`11` 은 각의 크기나 비를 **전부 주고** 방정식을 한 번 푼다. `50` 은 등분, `51` 은 분류다. `65X` 만 「끝내 안 정해지는 각」이 남는다 |
 * | `원과 부채꼴\|66X` | **심화상** | $n$ — 「호의 길이가 자연수」가 $n$ 을 하나로 정해 주지 않는다 | 굳지 **않는다**. $n=3$ 부터 $9$ 까지를 **하나씩 넣어** 둘레를 실제로 나눠 봐야 하고, 살아남는 개수가 판마다 다르다(둘~넷) | `02`·`03`·`05`·`06` 은 비례식을 한 번 세워 끝난다. `19A`·`20A` 는 한 걸음이다. `04`·`08` 은 보조선·성질을 쓰지만 후보를 **하나도 견주지 않는다**. `66X` 만 견줄 후보가 일곱이다 |
 * | `일차방정식의 활용(비율, 시계, 규칙)\|67X` | **심화상** | 「몇째 줄인가」 — 규칙이 줄 번호를 직접 주지 않는다 | 굳지 **않는다**. 줄이 끝나는 자리의 수 $1$, $3$, $6$, $10$, $\dots$ 를 **차례로 만들어** $N$ 을 넘는 자리를 찾아야 한다. 공식으로 한 번에 못 뛴다 | `21`·`27`·`28`·`29` 는 규칙이 **한 줄**이라 등차식 하나로 끝난다. `10`·`23`·`24`·`25` 는 비율식 하나다. `67X` 만 규칙이 **줄마다 길이가 달라** 자리를 견줘 찾아야 한다 |
 * | `공간에서 평면의 위치 관계\|68X` | **심화중** | 「몇 각기둥인가」·「몇 각뿔인가」 — 발문이 **입체도형을 지목하지 않는다** | 이 소단원의 개념 **「평행·만남·꼬인 위치가 모서리 전체를 남김없이 나눈다」** 가 굳힌다. 전체에서 자기 자신·평행·만나는 것을 빼면 꼬인 것이 $2n-4$ · $m-2$ 로 **한 줄에 나오고**, 그것을 되짚으면 $n$ 이 하나로 정해진다 | `06`·`08`·`22A`·`23A` 는 **직육면체·삼각기둥을 지목해** 세기만 한다. `07`·`24A`·`25A` 는 길이다. `09`·`10`·`19` 는 판정(보기)이다. `68X` 만 **입체도형 자체가 미지**다 |
 *
 * ## 🔴 앞 물결들이 실제로 낸 결함 — 여기서 어떻게 막았나
 *
 * ㉮ **해설이 정답지 한 단(964.8px)을 넘었다**(3차 중1 `53V`, 최대 1242px). 넘치면 그 쪽
 *    **다른 문항의 해설이 통째로 사라진다**(`column-count:2` + `overflow:hidden`).
 *    → 넷 다 **훑는 자리에 상한**을 두었다: `66X` 는 $n$ 이 일곱뿐이고 살아남는 것이 넷
 *      이하, `67X` 는 줄이 열여섯까지, `68X` 는 두 입체도형뿐이다. 시험이 제품
 *      `estimateSolutionPx` 로 660판 이상에서 **700px 미만**을 잠근다.
 *      ⚠️ 줄이는 길이 「걸음 지우기」이면 안 된다(D-116 ⑹) — 후보마다 «왜 살고 죽는지»는
 *      그대로 두고 **훑는 범위**만 줄였다.
 * ㉯ **해설이 「자연수」 걸음을 건너뛰었다**(3차 중2 `38V`). → 넷 다 부등식에서 정수로
 *    뛰는 걸음이 **없다**. `67X` 만 부등호를 쓰는데 그것은 「$78<85\le91$ 이므로 열셋째
 *    줄」이라는 **범위 판정**이고, 그 두 수는 바로 윗줄에 실제로 만들어 적어 둔 것이다.
 * ㉰ **해설이 기약이 아닌 분수를 찍었다**(3차 중1 `52V`, 17.5%).
 *    → 지면의 `\dfrac` 은 `65X` 의 $\dfrac{1}{2}$ **한 종류뿐**이고 정의상 기약이다.
 *      나머지 셋은 나눗셈을 `\div` 로만 적는다. 시험이 지면의 모든 분수를 훑어 다시 잰다.
 * ㉱ **발문이 스스로 못 박은 상한을 오답이 넘었다**(4차 중2 `37W`, 51.7%). → 넷 다
 *    「전체를 $1$로 놓고」류 상한을 **선언하지 않는다**(`declaredUpperBound` 가 `null`).
 *    `66X` 의 「$n$은 $3$ 이상 $9$ 이하」는 **$n$ 의 범위**이지 답의 상한이 아니고,
 *    그 함수는 그것을 상한으로 읽지 않는다 — 시험이 넷 다 `null` 임을 찍는다.
 * ㉲ **정답이 «구간»이면 파생 오답이 뒤집힌다**(3차 중2 `35V`). → 넷 다 정답이 **한 수**다.
 * ㉳ **해설의 «말»을 지키는 시험이 없었다**(4차, 중1 10줄이 무방비). → 시험이
 *    「평행↔꼬인 위치」·「배수가 아니다↔배수이다」·「하나로 정해지지 않는다↔정해진다」·
 *    「바로 아래 줄↔바로 위 줄」을 **낱말과 수를 함께** 판정하고, 뒤집으면 빨개진다.
 * ㉴ **지면이 자기가 한 줄 앞에 세운 제약을 스스로 어긴다**(4차 중3 `55W`, 100%).
 *    → `65X` 는 「각각은 하나로 정해지지 않는다」고 적고 **그 뒤로 두 각의 값을 한 번도
 *      쓰지 않는다**(합만 쓴다). `67X` 는 「$c$는 $r$ 이하」를 적고 그것이 실제로 참이다.
 *      시험이 두 가지를 다 판정한다.
 * ㉵ **자료를 정렬해 찍으면 «보이는 자리»가 순위를 암시한다**(4차 중1 `63W`, 100%).
 *    → 넷 다 지면에 **자료를 늘어놓지 않는다**(발문에 든 수가 최대 넷이다).
 * ㉶ **D-20 손실 원장은 «재현 가능»해야 한다**(4차 중1 `62W`). → 가드마다 「이 가드
 *    **하나만** 껐을 때」를 창 전수로 세어 아래 표에 적었다. 어림한 자리는 하나도 없다.
 *
 * ## 🔴 잰 값 (창 전수 · 재현 가능) — 가드는 「지름길」 **하나뿐**이다
 *
 * 「이 가드 하나만 껐을 때」를 창 전수로 세었다. 측정점은 **판**과 **서로 다른 답**
 * 둘이고 한 행에 섞지 않았다(4차 `62W` 가 물린 자리).
 *
 * | 유형 | 가드 끔(판·답) | 가드 켬(판·답) | 잃은 판 | 잃은 답 | 우연 수준(널 모형) |
 * |---|---|---|---|---|---|
 * | `65X` | $1{,}521$ · $116$ | $1{,}427$ · $112$ | $94$ (**6.18%**) | $4$ | **7.82%** |
 * | `66X` | $1{,}568$ · $284$ | $935$ · $185$ | $633$ (**40.37%**) | $99$ | **12.37%** |
 * | `67X` | $308$ · $182$ | $261$ · $156$ | $47$ (**15.26%**) | $26$ | **12.34%** |
 * | `68X` | $1{,}452$ · $111$ | $1{,}138$ · $107$ | $314$ (**21.63%**) | $4$ | **26.24%** |
 *
 * 널 모형은 「답을 판끼리 돌려 끼웠을 때 그 답이 지름길 자에 걸리는 비율」이다
 * (우연 수준). 🔴 **정직하게 적어 둘 것**: `66X`(40.37% vs 12.37%)와
 * `67X`(15.26% vs 12.34%)는 실제 지름길 비율이 우연 수준보다 **높다** — 지면에 수가
 * 넷이라 답이 그 조합에 걸릴 자리가 우연보다 잦다는 뜻이고, 그래서 이 가드는
 * **장식이 아니라 일한다.** `65X`·`68X` 는 우연보다 낮다(축이 원래 뻔하지 않다).
 * 어느 쪽이든 **내보내는 판의 지름길 비율은 $0$%** 이고, 시험이 그것을 창 전수와
 * 660판 산출물 양쪽에서 다시 잰다.
 *
 * 🔴 **`67X` 의 «아래» 방향에서 여섯째 줄이 통째로 사라진다**(그 방향의 줄 번호는
 * $5$, $7$, $8$, $\dots$, $18$). 까닭은 우연이 아니다 — 발문에 $1$, $2$, $3$ 과 $N$ 이
 * 찍히므로 그 넷의 합이 $N+6$ 이고, 줄 번호가 여섯이면 **답이 바로 그 합**이다.
 * 지면의 수를 다 더하면 답이 나오는 판이라 버리는 것이 옳다. 「위» 방향의 답은
 * $N-(r-1)=N-5$ 라 그 자리에 안 걸리므로 여섯째 줄이 **살아 있다** — 시험이 두 방향의
 * 줄 번호 목록을 각각 못 박아 다음 사람이 이 구멍을 결함으로 오해하지 않게 한다.
 *
 * ## 🔴 변형 폭 — 「$0$..$\text{floor}-1$ 만으로 늘 되지는 않는다」를 숨기지 않는다
 *
 * 리드가 준 폭은 `65X` $4$ · `66X` $7$ · `67X` $12$ · `68X` $12$ 다. 씨앗은 변형마다
 * `seed + variant\times0x9e37` 로만 갈리므로 **어느 두 변형이 창의 같은 자리를 뽑을
 * 수 있다** — 생일 문제다. 창이 $W$ 이고 $k$개를 뽑으면 겹칠 기댓값이
 * $\dfrac{k(k-1)}{2W}$ 라, $W$ 를 아무리 키워도 $0$ 이 되지 않는다.
 *
 * 실측(씨앗 $220$개):
 *
 * | 유형 | 창 | 폭 | $0$..$\text{floor}-1$ 이 전부 다른 씨앗 | 그때의 최소 | $0$..$2\,\text{floor}-1$ 의 최소 |
 * |---|---|---|---|---|---|
 * | `65X` | $1{,}427$ | $4$ | $212/220$ (**96.4%**) | $3$ | $6$ |
 * | `66X` | $935$ | $7$ | $213/220$ (**96.8%**) | $5$ | $12$ |
 * | `67X` | $261$ | $12$ | $166/220$ (**75.5%**) | $10$ | $20$ |
 * | `68X` | $1{,}138$ | $12$ | $203/220$ (**92.3%**) | $11$ | $22$ |
 *
 * 제품은 이 겹침을 이미 다룬다 — `generateMiddleSet` 이 발문이 같으면 버리고
 * **변형 번호를 올려 다시 뽑는다**(예산 $n\times30$). 그래서 시험이 잠그는 것은
 * ⑴ 제품의 그 예산 안에서 폭만큼 **서로 다른 발문이 반드시 나온다**(씨앗 $220$개
 * 전부)와 ⑵ 위 표의 비율 **그 값 그대로**다. ⑵ 를 못 박아 두면 창이 좁아졌을 때
 * 조용히 넘어가지 않고 빨개진다.
 * ㉷ **내보낸 순수 함수의 주석이 코드와 어긋나면 안 된다**(4차 중3 `solveBoxCases`).
 *    → 아래 순수 함수의 단언은 전부 시험이 문다(늘 참인 죽은 조건을 두지 않았다).
 * ㉸ 우리말 — 「그중」은 붙여 쓰고, 조사는 **지면에 찍히는 글자**로 정한다
 *    (`eunNeun`·`waGwa` 를 `m2Josa` **한 곳**에서 가져온다).
 *
 * ## 🔴 초등이 네 물결에 걸쳐 물린 함정 셋 — 여기서 어떻게 피했나
 *
 * ㉠ **창을 한쪽 끝만 주면 굳힘이 장식이 된다.** 「살아남는 후보가 언제나 목록의 같은
 *    자리」면 굳힘 조건은 «어느 후보인가»를 한 번도 안 고른다.
 *    → `66X` 는 답이 **살아남은 것 전부의 합**이고 살아남는 자리가 씨앗을 가로질러
 *      갈린다(시험이 그 사실을 따로 잰다). `67X` 는 「몇째 줄인가」가 $N$ 을 따라 옮겨
 *      간다. `65X`·`68X` 는 후보 목록이 **아예 없다**(값이 하나로 굳는다) — 「축이 없다」와
 *      「축이 초록이다」는 다른 말이므로 시험이 그 둘의 ㉠ 을 **«해당 없음»으로 따로 찍는다.**
 * ㉡ **「굳힘이 항등식」** — 굳힘 인자를 흔들어도 답이 그대로면 장식이다. 넷 다 굳힘을
 *    **인자로 받는 순수 함수**로 뽑아 두었다: `bisectorAngleFromMiddle` ·
 *    `equalPartArcs` · `triangularRow` · `prismSideSkew`/`pyramidSideSkew`.
 *    ⚠️ 그 자가 «아니오»를 낼 수 있음을 **음성 대조**로 보인다 —
 *      `equalPartArcs` 는 둘레가 $7$ 처럼 작으면 **살아남는 $n$ 이 하나도 없고**(빈 배열),
 *      `triangularRow` 는 삼각수 자리에서 앞뒤 값이 **같은 줄을 내며**,
 *      `prismSideSkew` 는 $n=2$ 에서 $0$ 을 낸다(각기둥이 아니다).
 *      음성 대조가 없으면 그 가드의 «0» 이 «깨끗»인지 «못 셈»인지 안 갈린다(2026-08-21).
 * ㉢ **갈래끼리 겹침** — 위 표의 마지막 칸이 쌍마다 «푸는 절차가 어디서 갈리는가»를 적은
 *    것이다. 🔴 **정직하게 적어 둘 것 둘**:
 *    ⑴ `66X` 의 「나누어떨어지는 것을 하나씩 넣어 본다」는 4차 `64W`(밑면의 두 치수를
 *       하나씩 넣어 견주기)·3차 `54V`(배점) 와 **축이 같다** — 「후보를 차례로 넣어 자연수인지
 *       본다」. 소재(원의 둘레 ↔ 겉넓이 ↔ 배점)·책(1-2 ↔ 1-2 ↔ 1-1)·소단원이 다르고,
 *       `66X` 는 미지수가 **하나**(그 둘은 둘)이지만, 「같은 꼴을 또 냈다」는 판단은
 *       **리드 몫**으로 넘긴다.
 *    ⑵ `65X` 와 형제 `08`(각의 크기 사이의 조건)은 둘 다 「한 점에서 그은 반직선」이다.
 *       `08` 은 $\angle AOD=90^\circ$ 와 비를 **둘 다 주어** 각이 전부 정해지고, `65X` 는
 *       끝내 정해지지 않는 각이 둘 남는다. 그래도 지면의 **첫 문장이 닮았다**는 사실은
 *       적어 둔다(시험이 형제와의 닮음을 기준선으로 잰다).
 *
 * ## 번호 규약 — **`X` 접미사**
 *
 * `extensionNumberReason`(`src/__tests__/helpers/rpmCatalog.ts`)은 `숫자+영문 대문자
 * 한 글자` 를 「색인 번호와 절대 안 겹친다」로 통과시킨다. 중1에는 이미 `A`(색인 밖
 * 보강)·`T`(1차)·`U`(2차)·`V`(3차)·`W`(4차)가 쓰였으므로 5차 물결은 **`X`** 로 대를 가른다.
 * 번호대는 물결마다 열을 올려 왔으므로(4x → 5x → 6x) **65~68** 을 쓴다(리드 배정).
 *
 * ## 계약 (이웃 모듈과 한 벌 — `m1Top.ts`~`m1Top4.ts` 머리말과 같다)
 *
 * 1. **정답을 먼저 뽑고 발문을 역산한다** — 창을 미리 만들어 두고 거기서만 뽑는다.
 * 2. `facts.x` 가 정답이다.
 * 3. 숫자는 전부 `$...$` 안에 (`elementary/rules` `bareNumbers` 가드).
 * 4. `attempt` 가 다 떨어지면 **던진다** — 조용히 기본값을 내지 않는다.
 * 5. 그림이 없으므로 발문이 **지면을 가리키지 않는다**(`pointsAtFigure`).
 * 6. 🔴 **해설이 걸음을 건너뛰지 않는다**(D-116 ⑸). 후보를 견주는 갈래는 후보를
 *    하나씩 적고 **각각 왜 살고 죽는지**까지 적는다.
 */
import { pick } from "../elementary/rng";

import { attempt, defType, type Body } from "./m1Shared";
// 지름길 자를 두 벌로 두지 않는다 — 4차 물결 것을 **읽어만** 온다.
import { pageShortcutValues, scaledValues } from "./m1Top4";
import { eulReul, waGwa } from "./m2Josa";
import type { TypeEntry } from "./types";

const BOOK1 = "1-1";
const BOOK2 = "1-2";
const MINOR_BASIC = "기본 도형";
const MINOR_CIRCLE = "원과 부채꼴";
const MINOR_LINEAR = "일차방정식의 활용";
const MINOR_POSITION = "위치 관계";

/**
 * 우리 `Unit.section` 정확한 이름.
 *
 * ⚠️ 손으로 적되 **시험이 `prisma/seed-data/units.ts` 정본과 글자 그대로 대조한다**
 * (「일차방정식의 활용(비율, 시계, 규칙)」처럼 괄호·쉼표·공백이 섞인 이름이 손으로
 * 적기 쉬운 자리다. 다른 소단원에는 **가는 공백 U+2009** 가 든 것도 있어 눈으로는 안 갈린다).
 */
const SEC = {
  각: "각",
  원과부채꼴: "원과 부채꼴",
  일차활용: "일차방정식의 활용(비율, 시계, 규칙)",
  공간: "공간에서 평면의 위치 관계",
} as const;

// ── 소품 ────────────────────────────────────────────────────

/** 보조사 — `$48$은` · `$45$는`. 받침 판정은 `m2Josa` **한 곳**에서 온다. */
function eunNeun(n: number): "은" | "는" {
  return eulReul(n) === "을" ? "은" : "는";
}

/**
 * 주격 조사 — `$41$이` · `$65$가.
 *
 * ⚠️ 공용 조사 자(`josaMismatches`)는 「이」를 **안 본다** — 서술격 「$5$이다·$5$이므로」의
 * 첫 글자와 구분되지 않아 거짓 경보가 무더기로 나기 때문이다. 그래서 그 자는
 * 「이를 써야 할 자리에 가를 썼다」만 잡고 **그 반대는 못 본다.**
 * 지면에서 이 함수로 짓는 것이 그 사각을 메우는 짝이다 — 실제로 첫 판이
 * 「$65$이 있는 줄」을 찍고 있었고 그 자는 그것을 구조적으로 못 봤다.
 */
function iGa(n: number): "이" | "가" {
  return eulReul(n) === "을" ? "이" : "가";
}

/** 목록을 `$1$, $2$, $3$` 꼴로. */
function listTex(xs: readonly number[]): string {
  return xs.map((v) => `$${v}$`).join(", ");
}

/**
 * 각기둥·각뿔 이름의 우리말 수관형사 — `육각기둥`·`십이각뿔`.
 *
 * ⚠️ **`$6$각기둥` 이라고 쓰면 안 된다.** 원장님 확정 「$8$각형이 아니라 팔각형」
 * (`elementary/rules` `arabicPolygons`)의 같은 자리다. 아라비아 숫자로 도형 이름을
 * 쓰면 지면에서 수식과 이름이 섞여 읽힌다.
 */
export function solidPrefix(n: number): string {
  const ONES = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
  if (!Number.isInteger(n) || n < 3 || n > 29) {
    throw new Error(`solidPrefix: 다루지 않는 수 ${n}`);
  }
  if (n < 10) return ONES[n]!;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  const head = tens === 1 ? "십" : `${ONES[tens]!}십`;
  return ones === 0 ? head : `${head}${ONES[ones]!}`;
}

/**
 * 🔴 **이 창의 답이 「지면의 수를 한두 번 곱하거나 나눈 값」인가.**
 *
 * `pageShortcutValues` 는 **수가 둘 이상**일 때만 일을 한다(짝을 만들어 사칙연산을
 * 돌린다). 지면에 수가 하나뿐인 판에서는 그 자가 **구조적으로 0**이므로, 수 하나마다
 * `scaledValues` 로 「작은 수를 곱하거나 나눈 값」을 따로 세어 함께 막는다.
 * 두 자 다 4차 물결(`m1Top4.ts`)에서 **읽어만** 온다 — 규칙을 두 벌로 두지 않는다.
 */
export function looksLikeShortcut(
  answer: number,
  pageNums: readonly number[],
): boolean {
  if (pageShortcutValues(pageNums).has(answer)) return true;
  for (const v of pageNums) {
    if (v > 0 && scaledValues(v).has(answer)) return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════
// 65X  평각을 이루는 반직선들과 두 이등분선이 이루는 각  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 **굳힘은 이 소단원의 개념 「평각은 $180^\circ$」 하나다 — 두 각을 하나도 안 구한다.**
 *
 * 한 점에서 차례로 그은 반직선의 양 끝이 평각을 이루면 사이의 각들의 합이
 * $180^\circ$ 다. 양 끝 두 각을 각각 이등분해서 얻은 두 반직선이 이루는 각은
 * **그 두 각의 합의 절반**과 가운데 각들의 합을 더한 것이므로,
 * $\dfrac{180^\circ-(\text{가운데 합})}{2}+(\text{가운데 합})=90^\circ+
 * \dfrac{\text{가운데 합}}{2}$ 이다 — 양 끝 두 각은 **각각 하나로 정해지지 않는데도**
 * 답은 정해진다(D-115 ⑾ 의 «중»).
 *
 * ⚠️ 이 함수는 **굳힘을 인자로 받는다** — 가운데 각들의 합을 흔들면 답이 달라져야
 *    한다(㉡). 되짚기(`middleSumFromBisector`)와 왕복이 되는 것도 시험이 잠근다.
 */
export function bisectorAngleFromMiddle(middleSum: number): number {
  if (!Number.isInteger(middleSum) || middleSum <= 0 || middleSum >= 180) {
    throw new Error(
      `bisectorAngleFromMiddle: 가운데 각의 합이 이상하다 — ${middleSum}`,
    );
  }
  if (middleSum % 2 !== 0) {
    throw new Error(
      `bisectorAngleFromMiddle: 절반이 정수가 아니다 — ${middleSum}`,
    );
  }
  return 90 + middleSum / 2;
}

/** 위의 되짚기 — 이등분선이 이루는 각에서 가운데 각들의 합으로. */
export function middleSumFromBisector(bisectorAngle: number): number {
  if (
    !Number.isInteger(bisectorAngle) ||
    bisectorAngle <= 90 ||
    bisectorAngle >= 180
  ) {
    throw new Error(
      `middleSumFromBisector: 이등분선의 각이 이상하다 — ${bisectorAngle}`,
    );
  }
  return 2 * (bisectorAngle - 90);
}

export type AngleCase =
  | { mode: "A"; mid: number; ans: number }
  | { mode: "B"; poq: number; ans: number }
  | { mode: "C"; c1: number; c2: number; ans: number };

/**
 * 그 판의 **지면에 찍히는 수** — 지름길 자에 넣는 것이 이것이다.
 *
 * 🔴 창을 만드는 쪽과 시험이 **같은 목록**을 봐야 한다. 두 벌로 두면 한쪽만 고쳐도
 * 아무도 모른다(이 저장소가 여러 번 값을 치른 자리).
 */
export function anglePageNums(k: AngleCase): number[] {
  if (k.mode === "A") return [k.mid];
  if (k.mode === "B") return [k.poq];
  return [k.c1, k.c2];
}

/**
 * 창 — 세 모드. `A` 는 가운데 각을 주고 이등분선의 각을 묻고, `B` 는 거꾸로 묻고,
 * `C` 는 반직선을 다섯으로 늘려 가운데 각이 **둘**이다(지면에 수가 둘이라
 * `pageShortcutValues` 가 비로소 일을 한다).
 *
 * 🔴 **잃은 것(창 전수, D-20)** — 가드는 「지름길」 하나뿐이고, 가드마다 「이 가드
 * **하나만** 껐을 때」를 시험이 전수로 세어 못 박는다(㉶). 측정점은 **판**과
 * **서로 다른 답** 둘이고, 한 행에 섞지 않는다.
 */
/**
 * 🔴 **굳힘을 읽고 «덜 간» 답** — 평각으로 가운데 각들의 합까지만 가고 멈춘 것.
 *
 * 되묻는 판(mode B)에서는 대응하는 «덜 감»이 「$2$배를 잊음」이다.
 *
 * ⚠️ 이 함수가 있는 까닭은 `looksLikeShortcut`(지면 수 조합)이 이 부류를 **구조적으로
 *    못 보기** 때문이다. 그 자는 지면에 찍힌 수들을 더하고 곱해 볼 뿐인데, 여기서 새는
 *    답은 «지면에 없는 값(가운데 각들의 합)»을 거쳐 나온다. 실측으로 창 $1{,}427$ 자리
 *    가운데 **14자리(0.98%)** 가 그렇게 샜고, 널 모형은 **0.00%** 라 우연이 아니었다
 *    (2026-09-04, 판정기 축을 지으며 드러났다).
 *
 * 아래 창이 이 함수로 그 자리를 걸러 내고, 판정기(`probe-middle-top-m1.ts`)의 ㉠ 축도
 * **같은 함수를 부른다** — 규칙이 두 벌이 되면 한쪽만 고쳐도 아무도 모른다.
 */
export function bisectorStopShort(k: AngleCase): number {
  if (k.mode === "B") return k.poq - 90;
  return 180 - (k.mode === "A" ? k.mid : k.c1 + k.c2);
}

export const ANGLE_BISECTOR_WINDOW: readonly AngleCase[] = (() => {
  const all: AngleCase[] = [];
  for (let mid = 20; mid <= 170; mid += 2) {
    all.push({ mode: "A", mid, ans: bisectorAngleFromMiddle(mid) });
  }
  for (let poq = 100; poq <= 175; poq += 1) {
    const ans = middleSumFromBisector(poq);
    if (ans < 20 || ans > 170) continue;
    all.push({ mode: "B", poq, ans });
  }
  for (let c1 = 12; c1 <= 86; c1 += 1) {
    for (let c2 = c1 + 1; c2 <= 86; c2 += 1) {
      if ((c1 + c2) % 2 !== 0) continue;
      if (c1 + c2 > 170) continue;
      all.push({ mode: "C", c1, c2, ans: bisectorAngleFromMiddle(c1 + c2) });
    }
  }
  return all.filter(
    (k) =>
      !looksLikeShortcut(k.ans, anglePageNums(k)) &&
      bisectorStopShort(k) !== k.ans,
  );
})();

/** 모드별 창 — 모드를 먼저 고르고 그 안에서 뽑아야 세 모드가 고르게 나온다. */
const ANGLE_BY_MODE: Record<string, AngleCase[]> = {
  A: ANGLE_BISECTOR_WINDOW.filter((k) => k.mode === "A"),
  B: ANGLE_BISECTOR_WINDOW.filter((k) => k.mode === "B"),
  C: ANGLE_BISECTOR_WINDOW.filter((k) => k.mode === "C"),
};

/** 창의 한 자리에서 지면을 짓는다 — 시험이 창 전수를 이 함수로 직접 그린다. */
export function angleBisectorBody(k: AngleCase): Body {
  if (k.mode === "A") {
    const rest = 180 - k.mid;
    return {
      content:
        `한 점 $O$에서 네 반직선 $OA$, $OB$, $OC$, $OD$를 이 차례로 그었더니 ` +
        `$\\angle AOD$가 평각이 되었다. $\\angle BOC=${k.mid}^\\circ$일 때, ` +
        `$\\angle AOB$의 이등분선 $OP$와 $\\angle COD$의 이등분선 $OQ$가 이루는 각의 크기를 구하시오.`,
      answer: `$${k.ans}^\\circ$`,
      solution: [
        `네 반직선이 이 차례로 놓여 있고 $\\angle AOD$가 평각이므로 $\\angle AOB+\\angle BOC+\\angle COD=180^\\circ$이다.`,
        `$\\angle BOC=${k.mid}^\\circ$이므로 $\\angle AOB+\\angle COD=180^\\circ-${k.mid}^\\circ=${rest}^\\circ$이다.`,
        `$\\angle AOB$와 $\\angle COD$의 크기는 각각 하나로 정해지지 않지만, 두 각의 크기의 합은 이와 같이 하나로 정해진다.`,
        `$OP$가 $\\angle AOB$의 이등분선이므로 $\\angle POB=\\dfrac{1}{2}\\angle AOB$이고, $OQ$가 $\\angle COD$의 이등분선이므로 $\\angle COQ=\\dfrac{1}{2}\\angle COD$이다.`,
        `$\\angle POQ=\\angle POB+\\angle BOC+\\angle COQ=\\dfrac{1}{2}(\\angle AOB+\\angle COD)+\\angle BOC$이다.`,
        `따라서 $\\angle POQ=\\dfrac{1}{2}\\times${rest}^\\circ+${k.mid}^\\circ=${rest / 2}^\\circ+${k.mid}^\\circ=${k.ans}^\\circ$이다.`,
      ].join("\n"),
      facts: { x: k.ans, mid: k.mid, rest },
    };
  }
  if (k.mode === "B") {
    const half = k.poq - 90;
    return {
      content:
        `한 점 $O$에서 네 반직선 $OA$, $OB$, $OC$, $OD$를 이 차례로 그었더니 ` +
        `$\\angle AOD$가 평각이 되었다. $\\angle AOB$의 이등분선을 $OP$, $\\angle COD$의 이등분선을 $OQ$라 하자. ` +
        `$\\angle POQ=${k.poq}^\\circ$일 때, $\\angle BOC$의 크기를 구하시오.`,
      answer: `$${k.ans}^\\circ$`,
      solution: [
        `네 반직선이 이 차례로 놓여 있고 $\\angle AOD$가 평각이므로 $\\angle AOB+\\angle BOC+\\angle COD=180^\\circ$이다.`,
        `$OP$가 $\\angle AOB$의 이등분선이고 $OQ$가 $\\angle COD$의 이등분선이므로 $\\angle POQ=\\dfrac{1}{2}\\angle AOB+\\angle BOC+\\dfrac{1}{2}\\angle COD$이다.`,
        `$\\angle AOB$와 $\\angle COD$의 크기는 각각 하나로 정해지지 않지만, 두 각의 크기의 합은 $\\angle AOB+\\angle COD=180^\\circ-\\angle BOC$로 정해진다.`,
        `그러므로 $\\angle POQ=\\dfrac{1}{2}(180^\\circ-\\angle BOC)+\\angle BOC=90^\\circ+\\dfrac{1}{2}\\angle BOC$이다.`,
        `$\\angle POQ=${k.poq}^\\circ$이므로 $\\dfrac{1}{2}\\angle BOC=${k.poq}^\\circ-90^\\circ=${half}^\\circ$이다.`,
        `따라서 $\\angle BOC=2\\times${half}^\\circ=${k.ans}^\\circ$이다.`,
      ].join("\n"),
      facts: { x: k.ans, poq: k.poq, half },
    };
  }
  const mid = k.c1 + k.c2;
  const rest = 180 - mid;
  return {
    content:
      `한 점 $O$에서 다섯 반직선 $OA$, $OB$, $OC$, $OD$, $OE$를 이 차례로 그었더니 ` +
      `$\\angle AOE$가 평각이 되었다. $\\angle BOC=${k.c1}^\\circ$, $\\angle COD=${k.c2}^\\circ$일 때, ` +
      `$\\angle AOB$의 이등분선 $OP$와 $\\angle DOE$의 이등분선 $OQ$가 이루는 각의 크기를 구하시오.`,
    answer: `$${k.ans}^\\circ$`,
    solution: [
      `다섯 반직선이 이 차례로 놓여 있고 $\\angle AOE$가 평각이므로 $\\angle AOB+\\angle BOC+\\angle COD+\\angle DOE=180^\\circ$이다.`,
      `$\\angle BOC=${k.c1}^\\circ$, $\\angle COD=${k.c2}^\\circ$이므로 $\\angle BOC+\\angle COD=${k.c1}^\\circ+${k.c2}^\\circ=${mid}^\\circ$이다.`,
      `그러므로 $\\angle AOB+\\angle DOE=180^\\circ-${mid}^\\circ=${rest}^\\circ$이고, $\\angle AOB$와 $\\angle DOE$의 크기는 각각 하나로 정해지지 않지만 두 각의 크기의 합은 이와 같이 하나로 정해진다.`,
      `$OP$가 $\\angle AOB$의 이등분선이고 $OQ$가 $\\angle DOE$의 이등분선이므로 $\\angle POQ=\\dfrac{1}{2}(\\angle AOB+\\angle DOE)+\\angle BOC+\\angle COD$이다.`,
      `따라서 $\\angle POQ=\\dfrac{1}{2}\\times${rest}^\\circ+${mid}^\\circ=${rest / 2}^\\circ+${mid}^\\circ=${k.ans}^\\circ$이다.`,
    ].join("\n"),
    facts: { x: k.ans, c1: k.c1, c2: k.c2, mid, rest },
  };
}

const ANGLE_BISECTOR: TypeEntry[] = [
  defType(
    BOOK2,
    MINOR_BASIC,
    "65X",
    "평각을 이루는 반직선과 두 이등분선이 이루는 각",
    SEC.각,
    "심화중",
    (rng): Body =>
      attempt(200, (): Body | null => {
        const mode = pick(rng, ["A", "B", "C"]);
        const pool = ANGLE_BY_MODE[mode]!;
        if (pool.length === 0) return null;
        return angleBisectorBody(pick(rng, pool));
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 66X  원을 등분한 부채꼴의 호의 길이가 자연수가 되는 경우  (심화상)
// ═══════════════════════════════════════════════════════════

/** 훑는 자리 — 여기 상한이 해설의 길이를 정한다(㉮). */
export const PART_MIN = 3;
export const PART_MAX = 9;

/**
 * 중심각 $a^\circ$ 인 부채꼴의 호가 $L$ 일 때 이 원의 둘레.
 *
 * 한 원에서 호의 길이는 중심각의 크기에 정비례하므로 $a:360=L:C$ 다.
 * 나누어떨어지지 않으면 **던진다** — 조용히 소수를 내면 그 뒤 판정이 전부 흔들린다.
 */
export function circumferenceFromSector(a: number, L: number): number {
  if (!Number.isInteger(a) || !Number.isInteger(L) || a <= 0 || L <= 0) {
    throw new Error(`circumferenceFromSector: 자연수여야 한다 — ${a}, ${L}`);
  }
  if ((360 * L) % a !== 0) {
    throw new Error(
      `circumferenceFromSector: 둘레가 자연수가 아니다 — ${a}, ${L}`,
    );
  }
  return (360 * L) / a;
}

/**
 * 🔴 **굳지 않는다 — $n$ 을 하나씩 넣어 봐야 한다(D-115 «상»).**
 *
 * 원을 중심각이 같은 $n$ 개의 부채꼴로 나누면 한 부채꼴의 호는 $C\div n$ 이다.
 * 「자연수인가」는 $n$ 마다 **따로** 물어야 하고, 살아남는 개수도 미리 알 수 없다.
 *
 * ⚠️ 그 자가 «아니오»를 낼 수 있음은 시험이 **빈 배열이 나오는 둘레**로 보인다
 *    ($C=11$ 이면 $3$~$9$ 어디로도 안 나누어진다).
 *    🔴 처음에 이 자리를 «$C=7$» 이라고 적었는데 **$7$ 은 $7$ 로 나누어진다** —
 *    계량기가 그것을 잡았다. 「주석이 코드와 어긋나면 안 된다」는 그 자리다.
 */
export function equalPartArcs(
  C: number,
  lo: number = PART_MIN,
  hi: number = PART_MAX,
): { n: number; arc: number }[] {
  const out: { n: number; arc: number }[] = [];
  for (let n = lo; n <= hi; n += 1) {
    if (C % n === 0) out.push({ n, arc: C / n });
  }
  return out;
}

type PartCase = { a: number; L: number; C: number; ans: number };

/** 발문에 쓸 중심각 — 원 전체($360^\circ$)보다 작고 둘레가 자연수가 되는 값만 남는다. */
const SECTOR_ANGLES: readonly number[] = [
  40, 45, 60, 72, 80, 90, 100, 120, 135, 144, 150, 160, 180, 200, 216, 225, 240,
  270, 288, 300,
];

/**
 * 창 — 살아남는 $n$ 이 **둘 이상 넷 이하**인 것만 쓴다.
 *
 * 하나뿐이면 「견줄 후보」가 없어 심화상이 아니고, 다섯 이상이면 해설의 나열 줄이
 * 길어져 정답지 한 단을 위협한다(㉮). 상한이 곧 지면 길이의 상한이다.
 */
export const EQUAL_PART_WINDOW: readonly PartCase[] = (() => {
  const out: PartCase[] = [];
  for (let C = 24; C <= 1200; C += 1) {
    const kept = equalPartArcs(C);
    if (kept.length < 2 || kept.length > 4) continue;
    const ans = kept.reduce((s, e) => s + e.arc, 0);
    for (const a of SECTOR_ANGLES) {
      if ((C * a) % 360 !== 0) continue;
      const L = (C * a) / 360;
      if (L < 4 || L > 240) continue;
      if (L === C) continue; // 중심각이 $360^\circ$ 인 것과 같아 보인다
      if (looksLikeShortcut(ans, [a, L, PART_MIN, PART_MAX])) continue;
      out.push({ a, L, C, ans });
    }
  }
  return out;
})();

/** 창의 한 자리에서 지면을 짓는다. */
export function equalPartBody(k: PartCase): Body {
  const kept = equalPartArcs(k.C);
  const dropped: number[] = [];
  for (let n = PART_MIN; n <= PART_MAX; n += 1) {
    if (k.C % n !== 0) dropped.push(n);
  }
  const keptNs = kept.map((e) => e.n);
  const keptArcs = kept.map((e) => e.arc);
  const lastArc = keptArcs[keptArcs.length - 1]!;
  const goodText = kept.map((e) => `$${k.C}\\div${e.n}=${e.arc}$`).join(", ");
  return {
    content:
      `한 원에서 중심각의 크기가 $${k.a}^\\circ$인 부채꼴의 호의 길이는 $${k.L}\\,\\mathrm{cm}$이다. ` +
      `이 원을 중심각의 크기가 같은 $n$개의 부채꼴로 나눌 때, 나누어진 한 부채꼴의 호의 길이가 자연수 $\\mathrm{cm}$가 되도록 하는 $n$이 여럿 있다. ` +
      `그러한 $n$ 각각에 대하여 나누어진 한 부채꼴의 호의 길이를 모두 더한 값을 구하시오. ` +
      `단, $n$은 $${PART_MIN}$ 이상 $${PART_MAX}$ 이하의 자연수이다.`,
    answer: `$${k.ans}\\,\\mathrm{cm}$`,
    solution: [
      `한 원에서 부채꼴의 호의 길이는 중심각의 크기에 정비례한다.`,
      `원 전체의 중심각의 크기는 $360^\\circ$이므로, 이 원의 둘레의 길이를 $x\\,\\mathrm{cm}$라 하면 $${k.a}:360=${k.L}:x$이다.`,
      `그러므로 $${k.a}\\times x=360\\times${k.L}$에서 $x=360\\times${k.L}\\div${k.a}=${k.C}$이므로 이 원의 둘레의 길이는 $${k.C}\\,\\mathrm{cm}$이다.`,
      `이 원을 중심각의 크기가 같은 $n$개의 부채꼴로 나누면 나누어진 한 부채꼴의 호의 길이는 $(${k.C}\\div n)\\,\\mathrm{cm}$이다.`,
      `${goodText}${eunNeun(lastArc)} 모두 자연수이지만, $${k.C}$${eunNeun(k.C)} ${listTex(dropped)}의 배수가 아니므로 $n$이 ${listTex(dropped)}일 때에는 자연수가 아니다.`,
      `그러므로 호의 길이가 자연수가 되는 것은 $n$이 ${listTex(keptNs)}일 때이고, 그때의 호의 길이는 차례로 ${listTex(keptArcs)}이다.`,
      `따라서 구하는 값은 $${keptArcs.join("+")}=${k.ans}$이다.`,
    ].join("\n"),
    facts: { x: k.ans, a: k.a, L: k.L, C: k.C, kept: kept.length },
  };
}

const EQUAL_PART_SECTOR: TypeEntry[] = [
  defType(
    BOOK2,
    MINOR_CIRCLE,
    "66X",
    "원을 등분한 부채꼴의 호의 길이가 자연수가 되는 경우를 모두 찾기",
    SEC.원과부채꼴,
    "심화상",
    (rng): Body =>
      attempt(200, (): Body | null => {
        if (EQUAL_PART_WINDOW.length === 0) return null;
        return equalPartBody(pick(rng, EQUAL_PART_WINDOW));
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 67X  줄마다 길이가 늘어나는 배열에서 바로 아래 줄의 같은 자리  (심화상)
// ═══════════════════════════════════════════════════════════

/** $k$째 줄의 마지막 수 — $1+2+\cdots+k$. */
export function rowEnd(k: number): number {
  if (!Number.isInteger(k) || k < 1) {
    throw new Error(`rowEnd: 자연수여야 한다 — ${k}`);
  }
  return (k * (k + 1)) / 2;
}

/**
 * 🔴 **굳지 않는다 — 줄이 끝나는 자리를 차례로 만들어 견줘야 한다(D-115 «상»).**
 *
 * $k$째 줄에는 $k$개가 있으므로 줄이 끝나는 자리는 $1$, $3$, $6$, $10$, $\dots$ 로
 * **간격이 계속 달라진다.** 그래서 「$N$이 몇째 줄인가」는 한 번의 나눗셈으로 못 뛰고,
 * 그 수들을 $N$ 을 넘을 때까지 실제로 만들어 봐야 한다.
 *
 * ⚠️ 그 자가 «아니오»를 낼 수 있음은 시험이 **삼각수 자리**로 보인다 —
 *    $N=10$ 과 $N=11$ 은 줄이 갈리지만 $N=10$ 과 $N=9$ 는 **같은 줄**이다.
 */
export function triangularRow(N: number): number {
  if (!Number.isInteger(N) || N < 1) {
    throw new Error(`triangularRow: 자연수여야 한다 — ${N}`);
  }
  let k = 1;
  while (rowEnd(k) < N) k += 1;
  return k;
}

/** $N$ 이 그 줄에서 왼쪽으로부터 몇 번째인가. */
export function triangleColumn(N: number): number {
  return N - rowEnd(triangularRow(N) - 1);
}

/** $N$ 의 바로 아래 줄에서 왼쪽으로부터 같은 번째에 있는 수. 아래 줄은 늘 더 길다. */
export function belowInTriangle(N: number): number {
  return N + triangularRow(N);
}

/**
 * $N$ 의 바로 **위** 줄에서 왼쪽으로부터 같은 번째에 있는 수 — 없으면 `null`.
 *
 * ⚠️ 위 줄은 **한 칸 짧다.** $N$ 이 자기 줄의 마지막 수이면 위 줄에는 그 자리가
 * 없다 — 그때 `null` 을 내는 것이 이 함수가 «아니오»를 내는 자리다.
 */
export function aboveInTriangle(N: number): number | null {
  const r = triangularRow(N);
  if (r < 2) return null;
  if (triangleColumn(N) > r - 1) return null;
  return N - (r - 1);
}

type RowCase = { N: number; r: number; dir: "아래" | "위"; ans: number };

/**
 * 창 — 줄 번호가 **다섯째부터 열여덟째까지**, 방향이 «아래»와 «위» 둘.
 *
 * 아래쪽을 자른 까닭: 발문에 $1$, $2$, $3$ 과 $N$ 이 찍히므로 $N+1$·$N+2$·$N+3$ 은
 * 지면의 수로 한 번에 만들어진다(지름길). 줄 번호가 다섯 이상이면 그 자리를 벗어난다.
 * 위쪽을 자른 까닭: 해설이 줄 끝 수를 **전부 적으므로**(D-116 ⑹) 열여덟이 지면
 * 길이의 상한이다(㉮).
 */
/**
 * 🔴 **굳힘을 읽고 «덜 간» 답** — 목표 줄까지는 갔지만 「왼쪽으로부터 몇 번째」를
 * 안 세고 **그 줄의 첫 번째 수**를 답한 것.
 *
 * ⚠️ $N$ 이 자기 줄의 첫 수이면($col=1$) 이 값이 **참 답과 같아진다.** 그러면 열을
 *    한 번도 안 세고 맞는다 — 이 유형이 심화상인 까닭(줄마다 길이가 다르다)의
 *    마지막 마디가 통째로 빠지는 자리다. 실측으로 창 $261$ 자리 가운데
 *    **25자리(9.58%)** 가 그랬고 **전부 $col=1$** 이었다. 널 모형은 **0.00%** 이므로
 *    우연이 아니라 구조다(2026-09-04, 판정기 축을 지으며 드러났다).
 *
 * `looksLikeShortcut`(지면 수 조합)은 이 부류를 **구조적으로 못 본다** — 새는 답이
 * 지면에 없는 값(줄 번호)을 거쳐 나오기 때문이다. 아래 창이 이 함수로 그 자리를
 * 걸러 내고, 판정기의 ㉠ 축도 **같은 함수를 부른다**.
 */
export function triangleStopShort(r: number, dir: "아래" | "위"): number {
  const target = dir === "아래" ? r + 1 : r - 1;
  return rowEnd(target - 1) + 1;
}

export const TRIANGLE_ROW_WINDOW: readonly RowCase[] = (() => {
  const out: RowCase[] = [];
  for (let N = rowEnd(4) + 1; N <= rowEnd(18); N += 1) {
    const r = triangularRow(N);
    const below = belowInTriangle(N);
    if (
      !looksLikeShortcut(below, [1, 2, 3, N]) &&
      triangleStopShort(r, "아래") !== below
    ) {
      out.push({ N, r, dir: "아래", ans: below });
    }
    const above = aboveInTriangle(N);
    if (
      above !== null &&
      !looksLikeShortcut(above, [1, 2, 3, N]) &&
      triangleStopShort(r, "위") !== above
    ) {
      out.push({ N, r, dir: "위", ans: above });
    }
  }
  return out;
})();

/** 창의 한 자리에서 지면을 짓는다. */
export function triangleRowBody(k: RowCase): Body {
  const ends: number[] = [];
  for (let i = 1; i <= k.r; i += 1) ends.push(rowEnd(i));
  const prev = rowEnd(k.r - 1);
  const first = prev + 1;
  const col = k.N - first + 1;
  const target = k.dir === "아래" ? k.r + 1 : k.r - 1;
  const targetFirst = rowEnd(target - 1) + 1;
  return {
    content:
      `자연수를 $1$부터 차례로 다음과 같은 규칙으로 늘어놓는다. ` +
      `첫째 줄에는 $1$개, 둘째 줄에는 $2$개, 셋째 줄에는 $3$개와 같이 $k$째 줄에는 $k$개의 수를 왼쪽부터 차례로 쓴다. ` +
      `이때 $${k.N}$${iGa(k.N)} 있는 줄의 바로 ${k.dir} 줄에서 왼쪽으로부터 $${k.N}$${waGwa(k.N)} 같은 번째에 있는 수를 구하시오.`,
    answer: `$${k.ans}$`,
    solution: [
      `$k$째 줄에는 $k$개의 수가 있으므로 첫째 줄부터 $k$째 줄까지 쓴 수는 모두 $1+2+\\cdots+k$개이고, $k$째 줄의 마지막 수는 $1+2+\\cdots+k$와 같다.`,
      `각 줄의 마지막 수를 첫째 줄부터 차례로 쓰면 ${listTex(ends)}이다.`,
      `$${prev}<${k.N}\\le${rowEnd(k.r)}$이므로 $${k.N}$${eunNeun(k.N)} $${k.r}$째 줄에 있다.`,
      `$${k.r}$째 줄의 첫 번째 수는 $${prev}+1=${first}$이므로 $${k.N}$${eunNeun(k.N)} 이 줄에서 왼쪽으로부터 $${k.N}-${first}+1=${col}$번째 수이다.`,
      `바로 ${k.dir} 줄인 $${target}$째 줄에는 $${target}$개의 수가 있고 $${col}$${eunNeun(col)} $${target}$ 이하이므로, 그 줄에도 왼쪽으로부터 $${col}$번째 수가 있다.`,
      `$${target}$째 줄의 첫 번째 수는 $${rowEnd(target - 1)}+1=${targetFirst}$이므로 그 줄의 왼쪽으로부터 $${col}$번째 수는 $${targetFirst}+${col}-1=${k.ans}$이다.`,
      `따라서 구하는 수는 $${k.ans}$이다.`,
    ].join("\n"),
    facts: { x: k.ans, N: k.N, r: k.r, col, first, target },
  };
}

const TRIANGLE_ROW: TypeEntry[] = [
  defType(
    BOOK1,
    MINOR_LINEAR,
    "67X",
    "줄마다 개수가 늘어나는 배열에서 바로 아래 줄의 같은 자리 수",
    SEC.일차활용,
    "심화상",
    (rng): Body =>
      attempt(200, (): Body | null => {
        if (TRIANGLE_ROW_WINDOW.length === 0) return null;
        return triangleRowBody(pick(rng, TRIANGLE_ROW_WINDOW));
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 68X  꼬인 위치의 개수로 각기둥·각뿔을 되짚기  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 **굳힘은 「평행·만남·꼬인 위치가 모서리 전체를 남김없이 나눈다」 하나다.**
 *
 * $n$각기둥의 모서리는 $3n$개다. 한 옆모서리를 잡으면 나머지 옆모서리 $(n-1)$개와는
 * **평행**하고, 그 옆모서리의 두 끝점에서 만나는 밑면·윗면의 모서리 $4$개와는
 * **한 점에서 만난다.** 남는 것이 꼬인 위치이므로 $3n-1-(n-1)-4=2n-4$ 다 —
 * 모서리를 하나씩 세어 보는 걸음이 없다(D-115 ⑾ 의 «중»).
 *
 * ⚠️ 그 자가 «아니오»를 낼 수 있음은 시험이 $n=2$ 로 보인다 — 값이 $0$ 이 되고
 *    각기둥이 아니다. 창이 $n\ge3$ 인 것은 그래서다.
 */
export function prismSideSkew(n: number): number {
  if (!Number.isInteger(n) || n < 2) {
    throw new Error(`prismSideSkew: 다루지 않는 수 ${n}`);
  }
  return 2 * n - 4;
}

/**
 * $m$각뿔의 모서리는 $2m$개다. 한 옆모서리는 나머지 옆모서리 $(m-1)$개와 꼭대기의
 * 꼭짓점에서 만나고, 그 옆모서리가 지나는 밑면의 꼭짓점에서 밑면의 모서리 $2$개와
 * 만난다. 남는 것이 꼬인 위치이므로 $2m-1-(m-1)-2=m-2$ 다.
 */
export function pyramidSideSkew(m: number): number {
  if (!Number.isInteger(m) || m < 2) {
    throw new Error(`pyramidSideSkew: 다루지 않는 수 ${m}`);
  }
  return m - 2;
}

/** 위 둘의 되짚기 — 꼬인 위치의 개수에서 밑면의 변의 수로. 안 맞으면 `null`. */
export function prismFromSkew(p: number): number | null {
  if (!Number.isInteger(p) || p < 2 || p % 2 !== 0) return null;
  return (p + 4) / 2;
}
export function pyramidFromSkew(q: number): number | null {
  if (!Number.isInteger(q) || q < 1) return null;
  return q + 2;
}

type SolidAsk = "모서리" | "꼭짓점" | "면";
type SolidCase = {
  ask: SolidAsk;
  n1: number;
  n2: number;
  p: number;
  q: number;
  ans: number;
};

/** 물음마다 두 입체도형에서 세는 것 — 「무엇을 세나」를 한 곳에 둔다. */
export function solidCounts(
  ask: SolidAsk,
  n1: number,
  n2: number,
): [number, number] {
  if (ask === "모서리") return [3 * n1, 2 * n2];
  if (ask === "꼭짓점") return [2 * n1, n2 + 1];
  return [n1 + 2, n2 + 1];
}

export const SKEW_EDGE_WINDOW: readonly SolidCase[] = (() => {
  const out: SolidCase[] = [];
  for (const ask of ["모서리", "꼭짓점", "면"] as const) {
    for (let n1 = 3; n1 <= 24; n1 += 1) {
      for (let n2 = 3; n2 <= 24; n2 += 1) {
        const p = prismSideSkew(n1);
        const q = pyramidSideSkew(n2);
        const [e1, e2] = solidCounts(ask, n1, n2);
        const ans = e1 + e2;
        if (looksLikeShortcut(ans, [p, q])) continue;
        out.push({ ask, n1, n2, p, q, ans });
      }
    }
  }
  return out;
})();

/** 창의 한 자리에서 지면을 짓는다. */
export function skewEdgeBody(k: SolidCase): Body {
  const [e1, e2] = solidCounts(k.ask, k.n1, k.n2);
  const prismHead = `$2n-4=${k.p}$에서 $n=${k.n1}$이므로 이 각기둥은 ${solidPrefix(k.n1)}각기둥이고, `;
  const pyramidHead = `$m-2=${k.q}$에서 $m=${k.n2}$이므로 이 각뿔은 ${solidPrefix(k.n2)}각뿔이고, `;
  const prismTail =
    k.ask === "모서리"
      ? `모서리는 $3\\times${k.n1}=${e1}$(개)이다.`
      : k.ask === "꼭짓점"
        ? `꼭짓점은 두 밑면에 각각 $${k.n1}$개씩 있으므로 $2\\times${k.n1}=${e1}$(개)이다.`
        : `면은 두 밑면과 옆면 $${k.n1}$개이므로 $${k.n1}+2=${e1}$(개)이다.`;
  const pyramidTail =
    k.ask === "모서리"
      ? `모서리는 $2\\times${k.n2}=${e2}$(개)이다.`
      : k.ask === "꼭짓점"
        ? `꼭짓점은 밑면에 $${k.n2}$개, 꼭대기에 $1$개 있으므로 $${k.n2}+1=${e2}$(개)이다.`
        : `면은 밑면과 옆면 $${k.n2}$개이므로 $${k.n2}+1=${e2}$(개)이다.`;
  const prismLine = prismHead + prismTail;
  const pyramidLine = pyramidHead + pyramidTail;
  return {
    content:
      `어떤 각기둥에서 한 옆모서리와 꼬인 위치에 있는 모서리는 $${k.p}$개이고, ` +
      `어떤 각뿔에서 한 옆모서리와 꼬인 위치에 있는 모서리는 $${k.q}$개이다. ` +
      `이 각기둥의 ${k.ask}의 개수와 이 각뿔의 ${k.ask}의 개수의 합을 구하시오.`,
    answer: `$${k.ans}$`,
    solution: [
      `$n$각기둥의 모서리는 두 밑면의 모서리가 각각 $n$개, 옆모서리가 $n$개이므로 모두 $3n$개이다.`,
      `$n$각기둥에서 한 옆모서리는 나머지 옆모서리 $(n-1)$개와 각각 평행하고, 그 옆모서리의 두 끝점에서 만나는 밑면과 윗면의 모서리 $4$개와는 한 점에서 만난다.`,
      `그러므로 한 옆모서리와 꼬인 위치에 있는 모서리는 $3n-1-(n-1)-4=2n-4$(개)이다.`,
      prismLine,
      `$m$각뿔의 모서리는 밑면의 모서리 $m$개와 옆모서리 $m$개이므로 모두 $2m$개이다.`,
      `$m$각뿔에서 한 옆모서리는 나머지 옆모서리 $(m-1)$개와 꼭대기의 꼭짓점에서 만나고, 그 옆모서리가 지나는 밑면의 꼭짓점에서 만나는 밑면의 모서리 $2$개와도 한 점에서 만난다.`,
      `그러므로 한 옆모서리와 꼬인 위치에 있는 모서리는 $2m-1-(m-1)-2=m-2$(개)이다.`,
      pyramidLine,
      `따라서 구하는 값은 $${e1}+${e2}=${k.ans}$이다.`,
    ].join("\n"),
    facts: { x: k.ans, p: k.p, q: k.q, n1: k.n1, n2: k.n2, e1, e2 },
  };
}

const SKEW_EDGE: TypeEntry[] = [
  defType(
    BOOK2,
    MINOR_POSITION,
    "68X",
    "꼬인 위치에 있는 모서리의 개수로 각기둥과 각뿔을 되짚기",
    SEC.공간,
    "심화중",
    (rng): Body =>
      attempt(200, (): Body | null => {
        if (SKEW_EDGE_WINDOW.length === 0) return null;
        return skewEdgeBody(pick(rng, SKEW_EDGE_WINDOW));
      }),
  ),
];

/** 5차 물결 갈래 a — 리드가 `generate.ts` 에 spread 한 줄로 등록한다. */
export const M1_TOP_5A: TypeEntry[] = [
  ...ANGLE_BISECTOR,
  ...EQUAL_PART_SECTOR,
  ...TRIANGLE_ROW,
  ...SKEW_EDGE,
];
