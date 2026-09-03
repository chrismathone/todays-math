/**
 * 중2 **확대 갈래 5차 물결 `m2Top5d`**(`심화중`·`심화상`) — D-116, 접미사 **`X`**.
 *
 * ## ⑴ 왜 새 파일인가
 *
 * 앞 물결(`m2Top.ts`~`m2Top4.ts`) 머리말과 같은 까닭이다 — 남의 모듈을 잠그는 개수
 * 검사를 무르지 않으려고, 그리고 오르카 다중 세션이 같은 파일에서 부딪히지 않으려고
 * **새 파일 하나 + `generate.ts` spread 한 줄**로 붙인다. 그 한 줄은 **리드가** 넣는다 —
 * 이 파일은 `generate.ts` 를 건드리지 않는다.
 *
 * ## ⑵ 🔴 리드가 준 소단원 이름 넷 가운데 **하나가 우리 `Unit.section` 에 없다**
 *
 * 브리프는 소단원을 「직각삼각형의 합동 · 경우의 수 · 연립방정식의 풀이 · **평행사변형**」
 * 으로 주면서 「우리 `Unit.section` 과 정확히 같아야 한다」고 했다. 그런데
 * `prisma/seed-data/units.ts` 를 실측하면 **중2에 `평행사변형` 이라는 소단원은 없다** —
 * 그것은 RPM **중단원**(`2-2` 의 `평행사변형`) 이름이고, 우리 소단원은
 * `평행사변형의 성질` 과 `평행사변형이 되는 조건` **둘**이다(둘 다 확대 갈래가 없다).
 * 그래서 **`평행사변형의 성질`** 을 골랐다 — RPM 중단원 `평행사변형` 13유형 가운데
 * 성질 쪽이 9유형으로 더 크고, 이 물결이 세우는 문항의 굳힘(「이웃하는 두 내각의
 * 크기의 합은 $180^\circ$」)이 바로 그 소단원의 개념이기 때문이다. **리드는 다른 갈래가
 * 같은 이름을 받았는지 확인해야 한다** — 받았다면 그쪽은 `평행사변형이 되는 조건` 으로
 * 가야 한다. 이 사실은 시험이 **단원 정본에 대조**해서 잠근다.
 *
 * ## ⑶ 🔴 `경우의 수` 는 **빈 소단원이 아니었다** — 그래서 갈래를 그쪽에 맞췄다
 *
 * 브리프는 「아직 확대 갈래가 없는 소단원」이라 했는데, `경우의 수` 에는 이미
 * `2-2|경우의 수|91`(**심화상**, `m2Top.ts` 1차 물결)이 있다. 실측으로 확인했다.
 * 없는 것은 **심화중**이다. 그래서 `114X` 를 심화중으로 세웠다 — 그러면 그 소단원이
 * 두 갈래를 다 갖는다. (심화상을 하나 더 얹으면 그 소단원은 심화중이 영영 빈다.)
 *
 * ## ⑷ 유형마다 — 안 굳는 마디 / 무엇이 굳히나 / 같은 소단원과 무엇이 다른가
 *
 * | 키 | 갈래 | 안 굳는 마디 | 무엇이 굳히나 | 같은 소단원의 아래 갈래와 다른 축 |
 * |---|---|---|---|---|
 * | `삼각형의 성질\|113X` | **심화중** | 삼각형 $ABD$ 의 **높이** — 발문이 세 변만 주고 점 $D$ 의 자리를 안 준다 | 이 소단원의 **각의 이등분선의 성질**(RHA 합동으로 증명된다) 하나. 점 $D$ 에서 두 변까지의 거리가 같다는 것이 두 조각의 높이를 **같은 문자 하나**로 묶고, 그 뒤 「두 조각의 넓이의 합 $=$ 전체」가 그 문자를 굳힌다 | 응용 `10` 은 $\overline{BD}$ 를 **발문이 준다**(높이가 안 느슨하다). 심화하 `54` 는 $\overline{AE}=\overline{AC}$ 로 **길이만** 뺀다 — 넓이 분할이 없다. 기본 `52`·`53` 은 거리가 같다는 것을 **한 번 쓰고 끝난다** |
 * | `경우의 수\|114X` | **심화중** | 「$p$ 의 배수 **또는** $q$ 의 배수」의 개수 — 두 번 센 것이 몇 개인지 발문에 없다 | 이 소단원의 **합의 법칙**과 그 전제(동시에 일어나지 않을 때). 두 번 센 것은 $p$ 와 $q$ 의 **공배수**이고, 공배수는 **최소공배수의 배수**이므로 개수가 나눗셈 한 번으로 굳는다 | 기본 `03` 은 「$4$ 의 배수 또는 $9$ 의 배수」인데 카드가 $19$ 장뿐이라 **겹치는 수가 아예 없다** — 합의 법칙을 그대로 쓴다. `114X` 는 겹침이 반드시 있고(최소공배수가 $N$ 이하), 게다가 **여사건**으로 한 번 더 뒤집는다. 심화상 `91` 은 주사위 순서쌍이라 모집단이 다르다 |
 * | `연립일차방정식\|115X` | **심화상** | 계수 $a$ — **굳지 않는다.** $a-b$ 가 $M$ 의 약수이기만 하면 되고, 살아남는 것이 **여럿**이라 전부 세어 견주어야 한다 | 굳지 않는다. 대입법으로 $(a-b)x=M$ 까지는 가지만 거기서 답이 하나로 정해지지 않는다 — $M$ 의 약수를 **다 세우고** 각각의 $x$ 를 구해 $1\le x\le d-1$ 로 **걸러야** 한다. 버리는 후보가 반드시 있다 | 심화하 `28` 은 해가 **하나로 정해지고** 그 해를 식에 넣는 정방향이다. 기본·응용 `21`~`27` 은 계수가 전부 수라 풀이가 한 갈래다. `115X` 는 계수 하나가 미지수이고 답이 **살아남은 값들의 합**이다 |
 * | `평행사변형\|116X` | **심화상** | $\angle B$ 의 크기 — **굳지 않는다.** $\angle A$ 가 $\angle B$ 의 몇 배인지가 안 주어져 후보가 여럿이고 그 전부가 답에 들어간다 | 굳지 않는다. 「이웃하는 두 내각의 크기의 합은 $180^\circ$」가 $(k+1)t=180$ 까지만 데려다 준다 — 거기서 $180$ 의 **약수를 다 세우고** $t\le90$ 과 발문의 창으로 **두 번 걸러야** 한다 | 기본 `03` 은 $\angle A$, $\angle C$ 를 식으로 주어 **일차방정식 하나**로 끝난다. 응용 `05` 는 $\angle B$ 를 **수로** 준다. 심화하 `12` 는 두 이등분선의 교점이라 길이 문제다. `116X` 는 각의 크기가 **자연수**라는 조건이 약수 열거를 낳는 유일한 유형이다 |
 *
 * ## ⑸ 🔴 앞 물결이 **실제로 새어 나간 자리** — 여기서 어떻게 막았나
 *
 * 전부 「값은 맞고 KaTeX 도 초록」이라 값 검산·냄새·조사 자가 구조적으로 못 보던 부류다.
 *
 * ㉮ **해설이 정답지 한 단을 넘었다**(3차 중1 `53V`, 1242px). → 넷 다 제품
 *    `estimateSolutionPx` 로 **800판**을 재어 700px 아래로 잠근다(시험 「해설 높이」).
 *    그렇다고 **걸음을 지우지 않는다**(D-116 ⑹) — `115X`·`116X` 의 나열 줄은
 *    후보를 **전부** 적고, 버리는 후보와 그 까닭도 적는다. 대신 매개변수 쪽에서
 *    나열 길이를 묶었다(약수 $10$ 개 이하 · 창 안 후보 $6$ 개 이하).
 * ㉯ **해설이 「자연수」 걸음을 건너뛰었다**(3차 중2 `38V`). → 이 물결에는 부등식으로
 *    정수 경계를 넘는 자리가 **없다**. `115X`·`116X` 의 거르기는 **약수 목록**에서
 *    이루어지므로 경계가 애초에 정수다. ⚠️ 그래서 공용 훑개
 *    (`probe-middle-extending-tiers.boundStepFaults`)에게 이 넷의 「정수 경계 걸음 $0$」은
 *    «깨끗»이 아니라 **«잴 것이 없다»** 다. 대신 시험이 **거르기 걸음 자체**를 잰다 —
 *    버린 후보가 지면에 있고, 그 까닭이 적혀 있고, 남은 것과 겹치지 않는지.
 * ㉰ **해설이 기약이 아닌 분수를 찍었다**(3차 중1 `52V`). → 지면의 모든
 *    `\dfrac{수}{수}` 가 기약이고 분모가 $1$ 이 아니다. `113X` 는 나눗셈을
 *    `$48\div16$` 꼴로 적어 **약분 전 분수를 아예 안 만든다**(만들면 $\frac{48}{16}$ 이
 *    지면에 난다 — 실측으로 그런 자리가 있었다).
 * ㉱ **발문이 스스로 못 박은 상한을 파생 오답이 넘었다**(4차 중2 `37W`, 51.7%).
 *    → 넷 다 `declaredUpperBound(content) === null` 이다(시험이 잠근다). 「전체를
 *    $1$ 로 놓고」류의 선언이 없으므로 그 결함이 설 자리가 없다.
 * ㉲ **정답이 «구간»이면 파생 오답이 뒤집힌다**(3차 중2 `35V`). → 넷 다 정답이
 *    **한 값**이다(`113X` 만 분수일 수 있다). 구간 답이 없으므로 그 대가를 안 치른다.
 * ㉳ **해설의 «말»을 지키는 시험이 없었다**(4차). → 시험이 굳힘을 진술하는 줄의
 *    **낱말**을 읽는다 — `113X` 의 「합동」·「대응하는 변」·「같으므로」,
 *    `114X` 의 「공배수」·「최소공배수」·「두 번」, `115X` 의 「약수」·「자연수」·「버린다」,
 *    `116X` 의 「이웃하는」·「약수」·「버린다」. 그리고 **낱말을 뒤집으면 빨개지는**
 *    눈금을 양성·음성 한 쌍으로 같이 둔다.
 * ㉴ **지면이 자기가 한 줄 앞에 세운 제약을 스스로 어긴다**(4차 중3 `55W`, 100%).
 *    → `115X` 는 「$1\le x\le d-1$」을 선언한 뒤 **그 뒤 모든 $x$ 값**이 그 안에
 *    있는지, 버린 것은 밖에 있는지를 시험이 전수로 잰다. `116X` 는 「$t\le90$」과
 *    「$m<t<M$」 둘 다 같은 방식으로 잰다.
 * ㉵ **자료를 정렬해 찍으면 «보이는 자리»가 순위를 암시한다**(4차 중1 `63W`).
 *    → 이 물결에는 «자료 나열»이 없다. `113X` 의 세 변은 $\overline{AC}$·$\overline{BC}$·
 *    $\overline{AB}$ 라 **이름이 자리를 정한다**(순서가 암시가 아니다).
 * ㉶ **D-20 손실 원장은 «재현 가능»해야 한다**(4차 중1 `62W`). → ⑹ 에 가드마다
 *    **「이 가드 하나만 껐을 때」**를 전수로 센 값을 적었고, 시험이 그 수를 다시 센다.
 * ㉷ **내보낸 순수 함수의 주석이 코드와 어긋나면 안 된다**(4차 중3). → 굳힘 함수 넷의
 *    단언(「이 인자를 끄면 답이 달라진다」)을 **시험이 물게** 했다.
 * ㉸ 우리말 — 「그중」은 붙여 쓴다. 조사는 지면에 **찍히는 글자**로 정한다
 *    (`m2Josa` 한 곳에서 계산한다 — 목록이 두 벌이 될 자리가 없다).
 *
 * ## ⑹ 🔴 손실 원장 (D-20 · ㉶) — 어림하지 않고 **전수로 센 값**
 *
 * 「이 가드 **하나만** 껐을 때」를 매개변수 전수로 센다. 판 수와 답 수의 측정점은
 * **같은 자리**(통과 조합 전수)다 — 한 행에 두 측정점을 섞지 않는다.
 *
 * | 유형 | 매개변수 전수 | 가드 전부 통과 | 잃은 비율 | 정답 가짓수 | 최빈 정답 |
 * |---|---|---|---|---|---|
 * | `113X` | 세쌍 $26$ × 배치 $2$ × 물음 $2$ = **104** | **100** | 3.8% | **100** | **1.00%** |
 * | `114X` | $N\,141$ × $(p,q)\,52$ = **7,332** | **4,202** | 42.7% | **147** | **1.17%** |
 * | `115X` | $d\,10$ × $b\,6$ × $M\,169$ = **10,140** | **3,622** | 64.3% | **302** | **1.05%** |
 * | `116X` | 창 토막 = **46**(창 자리 $1{,}208$ 쌍) | **46** | 0% | **46** | **2.17%** |
 *
 * **가드를 하나씩 껐을 때**(그 가드 «하나만» 없앤 전수 통과 수 — 괄호 안은 그 가드가
 * 혼자 무는 조합 수):
 *
 * - `113X` — 지름길 $104$ (**4**) · 굳힘차이 $100$ (**0**, 아래 참조)
 * - `114X` — 겹침 $\ge2$ : $5{,}116$ (**914**) · 지름길 $4{,}438$ (**236**) ·
 *   나머지 넷(「$q$ 가 $p$ 의 배수가 아니다」·「최소공배수 $\le N$」·「$c_p\ne c_q$」·
 *   「홀로 배수 $\ge1$」)은 전부 $4{,}202$ (**0**) — **서로를 덮는다.** 「$q$ 가 $p$ 의
 *   배수」면 홀로 배수가 $0$ 이 되고, 최소공배수가 $N$ 을 넘으면 겹침이 $0$ 이다.
 *   지우지 않고 남긴 까닭은 **거부 사유를 정확히 적기** 위해서다.
 * - `115X` — 남는 것 $3$~$6$ 개 : $6{,}330$ (**2,708**) · 약수 $4$~$10$ 개 : $4{,}132$
 *   (**510**) · 지름길 $3{,}894$ (**272**) · 버릴 것 $\ge1$ : $3{,}654$ (**32**)
 * - `116X` — 지름길은 창 자리 $1{,}208$ 쌍 가운데 **1** 을 문다(토막은 $46$ 그대로다)
 *
 * 🔴 **그물을 넓히면 다시 세야 한다.** `114X` 에서 $6\times10-6=54$ 가 답과 같은 판이
 * 나와 지름길 그물에 「곱한 뒤 한 번 더」를 더했더니, 그러자 «한 번도 안 문다»고 적어
 * 두었던 `116X` 의 지름길이 **하나를 물기 시작했다.** 위 수는 그 뒤에 다시 센 값이다.
 *
 * 🔴 **«굳힘차이» 두 줄은 늘 참이라 아무것도 안 문다.** `113X` 는 분모가 $b+c$ 대 $c$
 * 이고 $b>0$, `114X` 는 두 값의 차가 곧 겹침 개수인데 겹침이 이미 $2$ 이상이다.
 * 그러니 **가드로 읽지 말 것** — 그 축을 실제로 재는 것은 시험의 굳힘 함수 눈금이다.
 *
 * 🔴 **`116X` 의 최빈 $2.17\%$ 는 «토막을 균등하게 뽑는» 제품의 분포다.** 같은 것을
 * $(low, high)$ 쌍 전수 $1{,}208$ 로 세면 **$24.83\%$** 가 나온다 — 토막마다 창의
 * 자리가 몇 개인지가 크게 다르기 때문이다. **그래서 제품이 토막을 먼저 균등하게
 * 뽑는다**(`ANGLE_WINDOWS`). 어느 쪽으로 세는지를 안 적으면 같은 숫자가 다른 것을
 * 가리킨다.
 *
 * **씨앗 블록 넷($20260906$·$900000$·$123456$·$5550000$) × $800$ 판**으로 잰 값
 * (시험이 잠그는 것은 이쪽이다 — 전수와 표본은 다른 값이다):
 * `113X` 최빈 $2.13/2.13/2.13/2.63\%$ · `114X` $1.75/1.88/2.13/1.88\%$ ·
 * `115X` $1.38/1.63/1.75/1.63\%$ · `116X` $4.00/3.25/3.25/3.50\%$.
 * 서로 다른 정답은 차례로 $100$ · $136$~$139$ · $243$~$253$ · $46$ 가지다.
 * 해설 최대 높이는 차례로 $399$ · $315$ · $369$ · $387$ px 다(한 단은 $964.8$ px).
 *
 * ## ⑺ 이 파일이 **일부러 안 한 것**
 *
 * 1. `113X` 의 세 변을 「피타고라스 세쌍」으로 **미리 골라 두지 않는다** — 두 다리를
 *    전수로 훑어 빗변이 정수인 것만 남긴다(`rightTriples`). 손 목록이면 세는 쪽과
 *    고치는 쪽이 같이 눈이 먼다.
 * 2. `116X` 의 「$180$ 의 약수」를 **손으로 적지 않는다** — `divisors(180)` 이 낸다.
 *    지면에 찍히는 목록도 그 값이다.
 * 3. `115X` 의 $M$ 은 「약수가 많은 수」를 손으로 고른 것이 아니라, 뽑은 뒤
 *    **약수 개수를 세어** 거른다.
 * 4. 넷 다 **그림이 없다**(`figureSpec: null`). 도형 둘은 발문이 지면을 가리키지 않고
 *    **말로만** 도형을 세운다(`pointsAtFigure` 가 잠근다).
 * 5. 🔴 **안 무는 줄을 하나 넣었다가 뺐다.** `114X` 의 「답이 $20$ 보다 작으면 버린다」는
 *    전수에서 **한 번도 안 물었다**(겹침이 가장 큰 $p=2$, $q=3$ 에서도 답이 $N$ 의
 *    $\dfrac13$ 이라 $N\ge60$ 이면 늘 $20$ 이상이다). 남겨 두면 다음 사람이 그것을
 *    가드로 읽고, 그러면 그 축이 「$0$ 건」일 때 «깨끗»인지 «못 셈»인지 갈리지 않는다.
 * 6. 🔴 **지름길 그물은 «지면에 찍힌 수 그대로» 먹인다.** `114X` 는 발문에 $1$ 도
 *    찍히므로($1$부터 $N$까지) 매개변수 셋이 아니라 **넷**을 넘긴다. 매개변수만
 *    넘기면 지면과 그물이 갈라지고, 그 틈으로 판이 샌다 — 시험 쪽 그물이 찾아 줬다.
 *
 * ## ⑻ 계약 (이웃 모듈과 한 벌)
 *
 * 1. **정답을 먼저 뽑고 발문을 역산한다.**
 * 2. `facts` 로 정답 문자열을 **다시 지을 수 있다**(시험이 왕복으로 잠근다).
 *    `facts.x` 는 답의 **첫 수** — `113X` 는 넓이의 분자, `114X` 는 경우의 수,
 *    `115X` 는 $a$ 들의 합, `116X` 는 각의 합이다.
 * 3. 숫자는 전부 `$...$` 안에 (`elementary/rules` `bareNumbers`).
 * 4. `attempt` 가 다 떨어지면 **던진다** — 조용히 기본값을 내지 않는다.
 * 5. 그림이 없으므로 발문이 **지면을 가리키지 않는다**(`pointsAtFigure`).
 * 6. 🔴 **해설이 걸음을 건너뛰지 않는다.** 후보를 견주는 갈래(`115X`·`116X`)는
 *    **죽는 후보가 왜 죽는지**까지 적는다.
 * 7. 🔴 **조사를 손 목록으로 적지 않는다** — `m2Josa` 가 수 읽기에서 계산한다.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { attempt } from "./m1Shared";
import { eulReul, waGwa } from "./m2Josa";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";

/**
 * RPM 색인 정본(`scripts/rpm/rpm-type-catalog.json`)의 중단원 이름 — 글자 그대로.
 * 시험이 색인에 **대조**한다(손으로 옮겨 적은 것을 믿지 않는다).
 */
const MINOR_TRI = "삼각형의 성질";
const MINOR_COUNT = "경우의 수";
const MINOR_SYSTEM = "연립일차방정식";
const MINOR_PARA = "평행사변형";

/**
 * 우리 `Unit.section` 정확한 이름 (`prisma/seed-data/units.ts` 실측 2026-09-04).
 * 시험이 단원 정본과 **대조**한다 — ⑵ 에 적은 «평행사변형» 문제가 여기 산다.
 */
const SEC = {
  직각합동: "직각삼각형의 합동",
  경우의수: "경우의 수",
  연립풀이: "연립방정식의 풀이",
  평행성질: "평행사변형의 성질",
} as const;

type Body = Pick<
  MidProblem,
  "content" | "answer" | "solution" | "facts" | "figureSpec"
>;

function def(
  rpmBook: string,
  rpmMinor: string,
  rpmType: string,
  rpmTitle: string,
  unitSection: string,
  difficulty: MidProblem["difficulty"],
  gen: (rng: Rng) => Body,
): TypeEntry {
  return {
    key: `${rpmBook}|${rpmMinor}|${rpmType}`,
    grade: GRADE,
    unitSection,
    rpmBook,
    rpmMinor,
    rpmType,
    rpmTitle,
    handler: (rng) => ({
      grade: GRADE,
      unitSection,
      rpmBook,
      rpmMinor,
      rpmType,
      rpmTitle,
      difficulty,
      ...gen(rng),
    }),
  };
}

// ── 소품 (시험은 **다른 길로** 다시 잰다) ──────────────────

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

/** 기약분수로 줄인 $\dfrac{n}{d}$ — 분모는 늘 양수. */
export function reduceFraction(n: number, d: number): [number, number] {
  const s = d < 0 ? -1 : 1;
  const g = gcd(n, d) || 1;
  return [(s * n) / g, (s * d) / g];
}

/** $n$ 의 양의 약수를 작은 것부터. */
export function divisors(n: number): number[] {
  const out: number[] = [];
  for (let t = 1; t * t <= n; t += 1) {
    if (n % t !== 0) continue;
    out.push(t);
    if (t !== n / t) out.push(n / t);
  }
  return out.sort((a, b) => a - b);
}

/** 기약분수의 KaTeX 몸통 — 분모가 $1$ 이면 정수로 적는다(분모 $1$ 은 지면 결함이다). */
export function fracTex(n: number, d: number): string {
  return d === 1 ? `${n}` : `\\dfrac{${n}}{${d}}`;
}

/** 수 목록을 `$3$, $4$, $5$` 로. */
function listTex(values: readonly number[]): string {
  return values.map((v) => `$${v}$`).join(", ");
}

/**
 * 보조사(은/는) — 받침 판정은 `m2Josa.eulReul` **한 곳**에서 온다(규칙을 두 벌로
 * 안 둔다). `m2Top.ts`~`m2Top4.ts` 가 같은 이유로 같은 함수를 들고 있다.
 */
function eunNeun(n: number): "은" | "는" {
  return eulReul(n) === "을" ? "은" : "는";
}

/**
 * 🔴 **지름길 후보** — 발문에 찍힌 수를 한두 번 굴려 나오는 값 전부.
 *
 * 「우연히 답과 같아지는」 판을 버리려고 쓴다. 값은 유리수로 견주므로 분수 정답도
 * 같이 잰다. ⚠️ 이 목록은 **넉넉한 쪽**이라 멀쩡한 판도 버린다 — 그 대가를 ⑹ 에
 * 세어 적었다.
 */
export function shortcutValues(nums: readonly number[]): Set<string> {
  const out = new Set<string>();
  const add = (n: number, d: number): void => {
    if (d === 0) return;
    const [rn, rd] = reduceFraction(n, d);
    out.add(`${rn}/${rd}`);
  };
  let total = 0;
  for (const x of nums) total += x;
  add(total, 1);
  add(total, 2);
  for (const x of nums) {
    add(x, 1);
    add(2 * x, 1);
    add(x, 2);
    add(x * x, 1);
    for (const y of nums) {
      if (x === y) continue;
      add(x + y, 1);
      add(x - y, 1);
      add(x * y, 1);
      add(x * y, 2);
      add(x, y);
      add(total - x, 1);
      // 🔴 「곱한 뒤 한 번 더」 — 시험 쪽 그물이 이 꼴을 들고 있어서 여기도 넣는다.
      //    안 넣으면 `114X` 에서 $pq-p$ 가 답과 같은 판이 실제로 나온다($70$·$6$·$10$
      //    에서 $6\times10-6=54$). 두 그물은 **따로 짜였고**, 그래서 갈라진 것이 드러났다.
      add(x * y - x, 1);
      add(x * y + x, 1);
    }
  }
  return out;
}

/** 답이 지름길 값과 같은가 — 같으면 그 판을 버린다. */
export function looksLikeShortcut(
  nums: readonly number[],
  n: number,
  d: number,
): boolean {
  const [rn, rd] = reduceFraction(n, d);
  return shortcutValues(nums).has(`${rn}/${rd}`);
}

// ═══════════════════════════════════════════════════════════
// 113X  직각삼각형의 각의 이등분선이 가르는 두 조각의 넓이  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * 두 다리가 `maxLeg` 이하이고 빗변도 자연수인 직각삼각형의 세 변 — 작은 다리, 큰
 * 다리, 빗변. **손 목록을 쓰지 않는다**(⑺ 1).
 */
export function rightTriples(maxLeg: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let p = 3; p <= maxLeg; p += 1) {
    for (let q = p + 1; q <= maxLeg; q += 1) {
      const s = p * p + q * q;
      const h = Math.round(Math.sqrt(s));
      if (h * h === s) out.push([p, q, h]);
    }
  }
  return out;
}

/**
 * 🔴 **다리 상한 $48$ 은 «지면의 수를 교과서 크기로 묶는» 값이다** — 가드가 아니다.
 * $60$ 으로 열면 조합이 $104$ 에서 $136$ 으로 늘지만 $\overline{AB}=65\,\mathrm{cm}$ 같은
 * 변과 분모 $11$·$16$ 짜리 답이 나온다(실측). 잃는 것은 조합 $32$ 개뿐이고
 * 변형 폭·쏠림은 둘 다 넉넉하다(⑹).
 */
const TRIPLES = rightTriples(48);

/**
 * **굳힘 함수 ⑴** — $\angle C=90^\circ$ 인 직각삼각형 $ABC$($\overline{BC}=a$,
 * $\overline{AC}=b$, $\overline{AB}=c$)에서 $\angle A$ 의 이등분선이 $\overline{BC}$ 와
 * 만나는 점 $D$ 에서 **빗변까지의 거리**.
 *
 * 각의 이등분선 위의 점에서 두 변까지의 거리가 같으므로($\triangle ACD\equiv\triangle AED$,
 * RHA 합동) 그 거리를 $h$ 라 하면 두 조각의 넓이의 합이 전체와 같아
 * $\frac12 h(b+c)=\frac12 ab$, 곧 $h=\dfrac{ab}{b+c}$ 다.
 *
 * 🔴 **굳힘의 인자는 `includeAcd` 다.** 「삼각형 $ACD$ 도 높이가 $h$ 인 조각이다」를
 * 빠뜨리고 삼각형 $ABD$ 하나만 전체와 맞대면 분모가 $c$ 가 되어 답이 달라진다 —
 * 이 유형이 재려는 바로 그 마디다.
 *
 * ⚠️ `includeAcd=false` 는 제품이 안 쓰는 길이다(생성기는 늘 `true`). 그런데도 인자로
 *    두는 까닭은 시험이 이 마디를 **흔들어 잴 수 있게** 하기 위해서다 — 생성기 안에서
 *    두 판을 견주는 줄은 한 번도 거부하지 못하는 «도장»이 된다(2026-08-23).
 *
 * 세 변이 직각삼각형을 이루지 않으면 `null`.
 */
export function bisectorFootDistance(
  a: number,
  b: number,
  c: number,
  includeAcd = true,
): [number, number] | null {
  if (a <= 0 || b <= 0 || c <= 0) return null;
  if (a * a + b * b !== c * c) return null;
  return reduceFraction(a * b, includeAcd ? b + c : c);
}

/** 그 이등분선이 가르는 두 조각 가운데 하나의 넓이. */
export function bisectorPieceArea(
  a: number,
  b: number,
  c: number,
  piece: "ABD" | "ACD",
  includeAcd = true,
): [number, number] | null {
  const h = bisectorFootDistance(a, b, c, includeAcd);
  if (h === null) return null;
  return reduceFraction((piece === "ABD" ? c : b) * h[0], 2 * h[1]);
}

const RIGHT_BISECTOR_AREA: TypeEntry[] = [
  def(
    "2-2",
    MINOR_TRI,
    "113X",
    "직각삼각형에서 각의 이등분선이 가르는 조각의 넓이",
    SEC.직각합동,
    "심화중",
    (rng): Body =>
      attempt(4000, (): Body | null => {
        const [p, q, c] = pick(rng, TRIPLES);
        // 어느 다리를 $\overline{AC}$ 로 둘지 — 두 배치가 서로 다른 답을 준다.
        const swap = rng() < 0.5;
        const b = swap ? q : p; // AC (이등분선이 나오는 꼭짓점에 붙은 다리)
        const a = swap ? p : q; // BC (이등분선이 만나는 변)
        const piece: "ABD" | "ACD" = rng() < 0.5 ? "ABD" : "ACD";

        const h = bisectorFootDistance(a, b, c);
        if (h === null) return null;
        const ans = bisectorPieceArea(a, b, c, piece);
        const other = bisectorPieceArea(
          a,
          b,
          c,
          piece === "ABD" ? "ACD" : "ABD",
        );
        if (ans === null || other === null) return null;
        // ⚠️ 이 줄은 **늘 참**이다 — 분모가 $b+c$ 냐 $c$ 냐이고 $b>0$ 이므로 두 값이
        //    같아질 수 없다. 전수에서 이 줄만 꺼도 통과 조합이 **100 으로 그대로**다
        //    (⑹). 그러니 **가드로 읽지 말 것** — 굳힘을 바꾸면 답이 달라진다는 것을
        //    지면 옆에 적어 두는 자리이고, 실제로 «아니오»를 내는 것은 시험의
        //    굳힘 함수 눈금이다(2026-08-23 「도장은 초록을 못 낸다」).
        const naive = bisectorPieceArea(a, b, c, piece, false);
        if (naive === null) return null;
        if (naive[0] === ans[0] && naive[1] === ans[1]) return null;
        // 🔴 ㉵ 지름길 — 발문에 찍히는 세 수를 한두 번 굴린 값이 답이면 버린다.
        if (looksLikeShortcut([a, b, c], ans[0], ans[1])) return null;

        const whole = (a * b) / 2; // 삼각형 ABC 의 넓이
        const base = piece === "ABD" ? c : b;
        const otherBase = piece === "ABD" ? b : c;
        const pieceName = piece === "ABD" ? "ABD" : "ACD";
        const otherName = piece === "ABD" ? "ACD" : "ABD";
        const ansTex = fracTex(ans[0], ans[1]);
        const otherTex = fracTex(other[0], other[1]);
        const hTex = fracTex(h[0], h[1]);

        return {
          content:
            `$\\angle C=90^\\circ$인 직각삼각형 $ABC$에서 ` +
            `$\\overline{AC}=${b}\\,\\mathrm{cm}$, $\\overline{BC}=${a}\\,\\mathrm{cm}$, ` +
            `$\\overline{AB}=${c}\\,\\mathrm{cm}$이다. $\\angle A$의 이등분선이 변 $BC$와 ` +
            `만나는 점을 $D$라 할 때, 삼각형 $${pieceName}$의 넓이를 구하시오.`,
          answer: `$${ansTex}\\,\\mathrm{cm}^2$`,
          solution: [
            `점 $D$에서 빗변 $AB$에 내린 수선의 발을 $E$라 하자. 두 직각삼각형 $ACD$와 $AED$에서 빗변 $AD$는 공통이고 한 예각의 크기가 $\\angle CAD=\\angle EAD$로 같으므로 두 삼각형은 서로 합동이다(RHA 합동).`,
            `합동인 두 삼각형에서 대응하는 변의 길이는 같으므로 $\\overline{DE}=\\overline{DC}$이다. 즉 점 $D$에서 두 변 $AB$, $AC$까지의 거리가 같다.`,
            `$\\overline{DE}=\\overline{DC}=h\\,\\mathrm{cm}$라 하면 삼각형 $ABD$의 넓이는 $\\dfrac{1}{2}\\times${c}\\times h$이고, 삼각형 $ACD$의 넓이는 $\\dfrac{1}{2}\\times${b}\\times h$이다.`,
            `이 두 조각의 넓이의 합은 삼각형 $ABC$의 넓이와 같고 삼각형 $ABC$의 넓이는 $\\dfrac{1}{2}\\times${b}\\times${a}=${whole}\\,\\mathrm{cm}^2$이므로 $h\\times(${c}+${b})=${2 * whole}$이다.`,
            `$${c}+${b}=${b + c}$이므로 $h=${2 * whole}\\div${b + c}=${hTex}$이다.`,
            `따라서 삼각형 $${pieceName}$의 넓이는 $\\dfrac{1}{2}\\times${base}\\times${hTex}=${ansTex}\\,\\mathrm{cm}^2$이다.`,
            `삼각형 $${otherName}$의 넓이는 $\\dfrac{1}{2}\\times${otherBase}\\times${hTex}=${otherTex}\\,\\mathrm{cm}^2$이고, 두 조각의 넓이의 합 $${ansTex}+${otherTex}=${whole}$${eunNeun(whole)} 삼각형 $ABC$의 넓이와 같다.`,
          ].join("\n"),
          facts: {
            x: ans[0],
            den: ans[1],
            a,
            b,
            c,
            hn: h[0],
            hd: h[1],
            abd: piece === "ABD" ? 1 : 0,
            whole,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 114X  두 배수를 모두 피하는 카드의 경우의 수  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * **굳힘 함수 ⑵** — $1$ 부터 $N$ 까지에서 $p$ 의 배수도 $q$ 의 배수도 아닌 수의 개수.
 *
 * 「$p$ 의 배수 또는 $q$ 의 배수」는 합의 법칙을 그대로 못 쓴다 — 두 사건이 **동시에**
 * 일어나는 수(두 수의 공배수)가 있기 때문이다. 공배수는 **최소공배수의 배수**이므로
 * 그 개수가 나눗셈 한 번으로 굳는다.
 *
 * 🔴 **굳힘의 인자는 `subtractOverlap` 다.** 두 번 센 것을 되돌리는 걸음을 지우면
 * 답이 커진다 — 이 유형이 재려는 바로 그 마디다. (`false` 는 제품이 안 쓰는 길이고,
 * 시험이 흔들어 잰다.)
 */
export function notMultipleCount(
  N: number,
  p: number,
  q: number,
  subtractOverlap = true,
): number | null {
  if (N < 1 || p < 2 || q < 2 || p === q) return null;
  const both = Math.floor(N / lcm(p, q));
  const union =
    Math.floor(N / p) + Math.floor(N / q) - (subtractOverlap ? both : 0);
  return N - union;
}

const AVOID_TWO_MULTIPLES: TypeEntry[] = [
  def(
    "2-2",
    MINOR_COUNT,
    "114X",
    "두 배수를 모두 피하는 카드를 뽑는 경우의 수",
    SEC.경우의수,
    "심화중",
    (rng): Body =>
      attempt(6000, (): Body | null => {
        const N = intBetween(rng, 60, 200);
        const p = intBetween(rng, 2, 9);
        const q = intBetween(rng, p + 1, 12);
        // 한쪽이 다른 쪽의 배수면 겹침이 통째로 한쪽에 들어가 걸러 낼 것이 없다.
        if (q % p === 0) return null;
        const L = lcm(p, q);
        // 겹치는 수가 실제로 있어야 «두 번 센 것»을 되돌리는 걸음이 산다.
        if (L > N) return null;
        const cp = Math.floor(N / p);
        const cq = Math.floor(N / q);
        const both = Math.floor(N / L);
        if (both < 2) return null; // 하나뿐이면 «목록»이 아니라 우연으로 읽힌다
        if (cp === cq) return null; // 두 개수가 같으면 어느 쪽을 셌는지 안 갈린다
        // 마지막 확인 줄의 세 조각이 모두 실제로 있어야 그 줄이 «확인»이 된다.
        if (cp - both < 1 || cq - both < 1) return null;
        const union = cp + cq - both;
        const ans = notMultipleCount(N, p, q);
        if (ans === null || ans !== N - union) return null;
        // ⚠️ 이 줄도 **늘 참**이다 — 두 값의 차가 곧 겹침 개수라 위의 「겹침 $\ge2$」가
        //    이미 $0$ 을 막는다. 전수에서 이 줄만 꺼도 통과가 **4,244 로 그대로**다(⑹).
        const naive = notMultipleCount(N, p, q, false);
        if (naive === null || naive === ans) return null;
        // 🔴 「답이 $20$ 보다 작으면 세어서 맞힌다」는 줄을 **넣었다가 뺐다.** 겹침이
        //    가장 큰 $p=2$, $q=3$ 일 때도 답이 $N$ 의 $\dfrac13$ 이라 $N\ge60$ 에서
        //    답은 늘 $20$ 이상이다 — 전수에서 **한 번도 안 물었다**. 안 무는 줄을
        //    두면 다음 사람이 그것을 가드로 읽는다.
        // 🔴 ㉵ 지름길 — **지면에 찍히는 수 그대로** 넘긴다. 발문에는 $1$ 도 찍히므로
        //    ($1$부터 $N$까지) 그것까지 넣는다. 매개변수만 넘기면 지면과 그물이
        //    갈라지고, 그 틈에서 실제로 판이 샜다(실측).
        if (looksLikeShortcut([1, N, p, q], ans, 1)) return null;

        return {
          content:
            `$1$부터 $${N}$까지의 자연수가 각각 하나씩 적힌 $${N}$장의 카드가 있다. ` +
            `이 중에서 한 장을 뽑을 때, 카드에 적힌 수가 $${p}$의 배수도 아니고 ` +
            `$${q}$의 배수도 아닌 경우의 수를 구하시오.`,
          answer: `$${ans}$`,
          solution: [
            `카드가 $${N}$장이므로 한 장을 뽑는 모든 경우의 수는 $${N}$이다.`,
            `$${p}$의 배수는 $${p}\\times1$부터 $${p}\\times${cp}$까지이므로 $${N}\\div${p}$의 몫인 $${cp}$개이다.`,
            `같은 방법으로 $${q}$의 배수는 $${N}\\div${q}$의 몫인 $${cq}$개이다.`,
            `$${p}$의 배수이면서 $${q}$의 배수인 수는 $${p}$${waGwa(p)} $${q}$의 공배수이고, 공배수는 최소공배수 $${L}$의 배수이므로 $${N}\\div${L}$의 몫인 $${both}$개이다. 이 $${both}$개는 앞의 두 묶음에서 두 번 세었다.`,
            `그러므로 $${p}$의 배수 또는 $${q}$의 배수인 경우의 수는 $${cp}+${cq}-${both}=${union}$이다.`,
            `따라서 $${p}$의 배수도 $${q}$의 배수도 아닌 경우의 수는 $${N}-${union}=${ans}$이다.`,
            `$${p}$의 배수이기만 한 것이 $${cp}-${both}=${cp - both}$개, $${q}$의 배수이기만 한 것이 $${cq}-${both}=${cq - both}$개, 둘 다인 것이 $${both}$개이고, 이들을 더하면 $${cp - both}+${cq - both}+${both}=${union}$이다.`,
          ].join("\n"),
          facts: {
            x: ans,
            n: N,
            p,
            q,
            lcmpq: L,
            cp,
            cq,
            both,
            union,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 115X  해가 모두 자연수가 되게 하는 계수를 모두 찾기  (심화상)
// ═══════════════════════════════════════════════════════════

/**
 * **굳힘이 안 되는 자리** — $\begin{cases}x+y=d\\ax+by=c\end{cases}$ 의 해가 모두
 * 자연수가 되게 하는 자연수 $a$ **전부**.
 *
 * 대입법으로 $(a-b)x=c-bd=M$ 까지 간다. $x$ 가 자연수이고 $M>0$ 이므로 $a-b$ 는
 * $M$ 의 **양의 약수**이고, 약수 하나마다 $x=\dfrac{M}{a-b}$ 가 정해진다. 거기서
 * $y=d-x$ 도 자연수여야 하므로 $x\le d-1$ 인 것만 남는다 — **후보를 다 세워 견주는**
 * 자리이고, 이것이 심화상이다.
 *
 * 🔴 **굳힘의 인자는 `capX` 다.** $y$ 도 자연수라는 조건($x\le d-1$)을 빠뜨리면 후보가
 * 더 살아남아 답이 커진다 — 이 유형이 재려는 바로 그 마디다.
 */
export function naturalSolutionCoefficients(
  d: number,
  b: number,
  c: number,
  capX = true,
): number[] | null {
  if (d < 2 || b < 1) return null;
  const M = c - b * d;
  if (M <= 0) return null;
  const out: number[] = [];
  for (const t of divisors(M)) {
    const x = M / t;
    if (x < 1) continue;
    if (capX && x > d - 1) continue;
    out.push(b + t);
  }
  return out;
}

const NATURAL_SOLUTION_COEFFICIENT: TypeEntry[] = [
  def(
    "2-1",
    MINOR_SYSTEM,
    "115X",
    "해가 모두 자연수가 되게 하는 계수를 모두 구하기",
    SEC.연립풀이,
    "심화상",
    (rng): Body =>
      attempt(8000, (): Body | null => {
        const d = intBetween(rng, 7, 16);
        const b = intBetween(rng, 2, 7);
        const M = intBetween(rng, 12, 180);
        const divs = divisors(M);
        if (divs.length < 4 || divs.length > 10) return null;
        const kept = divs.filter((t) => M / t <= d - 1);
        const dropped = divs.filter((t) => M / t > d - 1);
        // 살아남는 것이 셋 이상이라야 «다 세워 견주는» 일이 되고,
        // 버리는 것이 하나 이상이라야 걸러 내는 걸음이 지면에 산다(D-116 ⑹).
        if (kept.length < 3 || kept.length > 6) return null;
        if (dropped.length < 1) return null;
        const c = b * d + M;
        const aList = naturalSolutionCoefficients(d, b, c);
        if (aList === null) return null;
        if (aList.length !== kept.length) return null;
        const loose = naturalSolutionCoefficients(d, b, c, false);
        if (loose === null || loose.length === aList.length) return null;
        const total = aList.reduce((s, v) => s + v, 0);
        // 🔴 ㉵ 지름길.
        if (looksLikeShortcut([d, b, c], total, 1)) return null;

        const keptX = kept.map((t) => M / t);
        const droppedX = dropped.map((t) => M / t);
        return {
          content:
            `연립방정식 $\\begin{cases}x+y=${d}\\\\ax+${b}y=${c}\\end{cases}$의 ` +
            `해 $x$, $y$가 모두 자연수가 되도록 하는 자연수 $a$의 값을 모두 구하고, ` +
            `그 값들의 합을 구하시오.`,
          answer: `$${total}$`,
          solution: [
            `$x+y=${d}$에서 $y=${d}-x$이다.`,
            `이것을 $ax+${b}y=${c}$에 대입하면 $ax+${b}(${d}-x)=${c}$이므로 $(a-${b})x=${c}-${b * d}=${M}$이다.`,
            `$x$와 $y=${d}-x$가 모두 자연수이므로 $x$는 $1$ 이상 $${d - 1}$ 이하의 자연수이다.`,
            `$${M}$${eunNeun(M)} 양수이고 $x$도 양수이므로 $a-${b}$도 양수이다. 그러므로 $a-${b}$${eunNeun(b)} $${M}$의 약수이고, 그때 $x=${M}\\div(a-${b})$이다.`,
            `$${M}$의 약수는 ${listTex(divs)}이고, 이에 대응하는 $x$의 값은 차례로 ${listTex(divs.map((t) => M / t))}이다.`,
            `이 가운데 $x$가 $${d - 1}$보다 큰 ${listTex(droppedX)}${eunNeun(droppedX[droppedX.length - 1]!)} $y=${d}-x$가 자연수가 되지 않으므로 버린다. 남는 $x$의 값은 ${listTex(keptX)}이고, 그때 $a-${b}$의 값은 차례로 ${listTex(kept)}이다.`,
            `$a-${b}$의 값에 $${b}$${eulReul(b)} 더하면 $a$이므로 $a$의 값은 ${listTex(aList)}이고, 따라서 그 합은 $${aList.join("+")}=${total}$이다.`,
          ].join("\n"),
          facts: {
            x: total,
            d,
            b,
            c,
            m: M,
            kept: kept.length,
            dropped: dropped.length,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 116X  평행사변형의 이웃한 두 내각에서 가능한 각을 모두 찾기  (심화상)
// ═══════════════════════════════════════════════════════════

/** $180$ 의 약수 가운데 $90$ 이하인 것 — 손으로 안 적는다(⑺ 2). */
const ANGLE_CANDIDATES = divisors(180).filter((t) => t <= 90);

/**
 * 창으로 쓸 수 있는 «이어진 토막» 전부 — 목록의 양끝 하나씩은 «버리는 후보»로 남긴다.
 *
 * 🔴 **토막을 균등하게 뽑는다.** 앞서 `i` 와 `j` 를 따로 뽑았더니 목록 끝쪽 토막이
 *    고를 여지가 적어 확률이 몰렸고, 최빈 정답이 $8.0\%$ 였다(실측). 토막을 먼저
 *    만들어 두고 균등하게 고르면 $2.4\%$ 로 내려간다 — 「최빈 정답이 몰리면
 *    분포를 고치기 전에 «어떻게 뽑는지»부터 보라」.
 */
const ANGLE_WINDOWS: [number, number][] = (() => {
  const out: [number, number][] = [];
  const n = ANGLE_CANDIDATES.length;
  for (let i = 1; i <= n - 4; i += 1) {
    for (let j = i + 2; j <= Math.min(i + 5, n - 2); j += 1) out.push([i, j]);
  }
  return out;
})();

/**
 * **굳힘이 안 되는 자리** — 평행사변형에서 $\angle A$ 가 $\angle B$ 의 자연수 배이고 두
 * 각의 크기가 자연수(도)일 때, $\angle B$ 의 크기가 창 안에 드는 $\angle A$ **전부**.
 *
 * 이웃하는 두 내각의 크기의 합이 $180^\circ$ 이므로 $\angle A=k\angle B$ 에서
 * $(k+1)t=180$ 이다. $k$ 가 자연수이므로 $t$ 는 $180$ 의 약수이면서 $90$ 이하다 —
 * 거기서 답이 하나로 굳지 않고 **후보를 다 세워 창으로 걸러야** 한다.
 *
 * 🔴 **굳힘의 인자는 `adjacentSum` 다.** 「이웃하는 두 내각의 합」을 사각형 네 내각의
 * 합 $360^\circ$ 로 잘못 쓰면 후보가 $360$ 의 약수가 되고 각의 크기도 $360-t$ 가 되어
 * 답이 통째로 달라진다 — 학생이 가장 흔히 하는 실수이고, 이 유형이 재려는 바로 그
 * 마디다. (`360` 은 제품이 안 쓰는 길이고, 시험이 흔들어 잰다.)
 *
 * ⚠️ 창의 위끝이 늘 $90$ 이하라 「$t\le\frac{\text{합}}{2}$」 쪽은 이 문항 꼴에서
 *    **한 번도 못 문다** — 그래서 그 조건을 인자로 두지 않았다. 안 무는 인자를
 *    두면 시험이 그것을 흔들어도 늘 초록이라 «가드»로 잘못 읽힌다.
 */
export function possibleOppositeAngles(
  low: number,
  high: number,
  adjacentSum = 180,
): number[] {
  return divisors(adjacentSum)
    .filter((t) => t <= adjacentSum / 2)
    .filter((t) => t > low && t < high)
    .map((t) => adjacentSum - t);
}

const PARALLELOGRAM_ANGLE_DIVISORS: TypeEntry[] = [
  def(
    "2-2",
    MINOR_PARA,
    "116X",
    "이웃한 두 내각의 관계에서 가능한 각의 크기를 모두 구하기",
    SEC.평행성질,
    "심화상",
    (rng): Body =>
      attempt(4000, (): Body | null => {
        // 창은 «후보 목록의 이어진 토막»으로 고른다 — 그래야 정답이 고르게 퍼진다.
        const [i, j] = pick(rng, ANGLE_WINDOWS);
        const low = intBetween(
          rng,
          ANGLE_CANDIDATES[i - 1]!,
          ANGLE_CANDIDATES[i]! - 1,
        );
        const high = intBetween(
          rng,
          ANGLE_CANDIDATES[j]! + 1,
          ANGLE_CANDIDATES[j + 1]!,
        );
        const inside = ANGLE_CANDIDATES.slice(i, j + 1);
        const angles = possibleOppositeAngles(low, high);
        if (angles.length !== inside.length) return null;
        // ⚠️ 이 줄은 **늘 참**이다($360-t\ne180-t$). 그래도 못 박아 둔다 — 굳힘을
        //    바꾸면 답이 달라진다는 것을 지면 옆에 적어 두는 자리다. 실제로 «아니오»를
        //    내는 것은 시험의 굳힘 함수 눈금이다(2026-08-23 「도장은 초록을 못 낸다」).
        const wrongSum = possibleOppositeAngles(low, high, 360);
        if (wrongSum.join(",") === angles.join(",")) return null;
        const total = angles.reduce((s, v) => s + v, 0);
        // 🔴 ㉵ 지름길 — 창의 두 끝 $(low, high)$ 를 한두 번 굴린 값이 답이면 버린다.
        //    ⚠️ 이 줄은 전수 $1{,}208$ 쌍에서 **딱 하나**를 문다(⑹). 처음에는 «한 번도
        //    안 문다»고 재어 빼 두었는데, `114X` 때문에 그물에 「곱한 뒤 한 번 더」를
        //    더하자 그 하나가 드러났다 — **그물을 넓히면 다시 세야 한다.**
        if (looksLikeShortcut([low, high], total, 1)) return null;

        const prev = ANGLE_CANDIDATES[i - 1]!;
        const next = ANGLE_CANDIDATES[j + 1]!;

        return {
          content:
            `평행사변형 $ABCD$에서 $\\angle B$의 크기를 $t^\\circ$라 하면 $t$는 자연수이고, ` +
            `$\\angle A$의 크기는 $\\angle B$의 크기의 자연수 배이다. ` +
            `$t$가 $${low}$보다 크고 $${high}$보다 작을 때, $\\angle A$의 크기로 가능한 ` +
            `모든 값의 합을 구하시오.`,
          answer: `$${total}^\\circ$`,
          solution: [
            `평행사변형에서 이웃하는 두 내각의 크기의 합은 $180^\\circ$이므로 $\\angle A+\\angle B=180^\\circ$이다.`,
            `$\\angle A$의 크기가 $\\angle B$의 크기의 $k$배($k$는 자연수)라 하면 $\\angle A=k\\times t^\\circ$이므로 $k\\times t+t=180$, 즉 $(k+1)\\times t=180$이다.`,
            `$k$가 자연수이므로 $k+1$은 $2$ 이상의 자연수이고, 따라서 $t$는 $180$의 약수이면서 $90$ 이하이다.`,
            `$180$의 약수 가운데 $90$ 이하인 것은 ${listTex(ANGLE_CANDIDATES)}이다.`,
            `이 가운데 $t$가 $${low}$보다 크고 $${high}$보다 작은 것은 ${listTex(inside)}이다.`,
            `목록은 작은 것부터 늘어놓은 것이므로 $${inside[0]!}$보다 앞에 있는 약수는 모두 $${prev}$ 이하이므로 $${low}$보다 크지 않고, $${inside[inside.length - 1]!}$보다 뒤에 있는 약수는 모두 $${next}$ 이상이므로 $${high}$보다 작지 않다. 그러므로 그것들은 모두 버린다.`,
            `각 $t$에 대하여 $\\angle A=180^\\circ-t^\\circ$이므로 $\\angle A$의 크기로 가능한 값은 차례로 ${listTex(angles)}이다.`,
            `따라서 그 합은 $${angles.join("+")}=${total}$이므로 $${total}^\\circ$이다.`,
          ].join("\n"),
          facts: {
            x: total,
            low,
            high,
            count: angles.length,
            smallest: angles[0]!,
            largest: angles[angles.length - 1]!,
          },
          figureSpec: null,
        };
      }),
  ),
];

/**
 * 중2 확대 갈래 5차 물결 `m2Top5d` 명부 — `generate.ts` 의 `ALL` 이 이것 하나만
 * spread 한다(그 한 줄은 **리드가** 넣는다).
 *
 * 갈래별 몫: **심화중 2 · 심화상 2**. 수를 목표로 잡지 않았다 — 세울 수 있는 자리에만
 * 세웠고, `경우의 수` 는 이미 심화상이 있어 **심화중** 쪽에 세웠다(⑶).
 */
export const M2_TOP_5D: TypeEntry[] = [
  ...RIGHT_BISECTOR_AREA,
  ...AVOID_TWO_MULTIPLES,
  ...NATURAL_SOLUTION_COEFFICIENT,
  ...PARALLELOGRAM_ANGLE_DIVISORS,
];
