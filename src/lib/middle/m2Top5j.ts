/**
 * 중2 **확대 갈래 5차 물결**(`심화중`·`심화상`) — D-116, 접미사 **`X`**, 갈래 `m2Top5j`.
 *
 * ## ⑴ 왜 새 파일인가
 *
 * 4차(`m2Top4.ts`) 머리말과 같은 까닭이다 — 남의 모듈을 잠그는 개수 검사를 무르지
 * 않으려고, 그리고 21갈래가 **동시에** 도는 이 물결에서 같은 파일이 부딪히지 않으려고
 * **새 파일 하나 + `generate.ts` spread 한 줄**로 붙인다. 그 한 줄은 **리드가** 넣는다 —
 * 이 파일은 `generate.ts` 를 건드리지 않는다.
 *
 * ## ⑵ 유형마다 — 안 굳는 마디 / 무엇이 굳히나 / 같은 소단원과 무엇이 다른가
 *
 * | 키 | 갈래 | 안 굳는 마디 | 무엇이 굳히나 | 같은 소단원의 아래 갈래와 다른 축 |
 * |---|---|---|---|---|
 * | `확률의 뜻과 성질\|140X` | **심화중** | 더 넣은 개수 $x$ — 발문이 주는 확률은 **묻는 색이 아닌 쪽**의 것이라 「$\dfrac{a}{a+b+x}$ 를 그 값과 같다고 놓는」 길이 막혀 있다 | 그 소단원의 **여사건 성질** 하나. $1-\dfrac{p}{q}=\dfrac{q-p}{q}$ 로 방향을 뒤집는 순간 미지수가 하나인 식이 서고 $x$ 가 **한 값으로 굳는다** | 같은 소단원의 `01`·`02A`·`03A` 는 개수를 다 주고 확률을 묻는 **정방향**이고, `03`(확률의 성질)·`05`(적어도 하나)는 여사건을 쓰되 **개수가 이미 다 주어져** 있다. `140X` 는 여사건을 쓴 **뒤에** 개수를 되찾는 **역방향**이고, 확률의 정의(경우의 수의 비)를 한 번 더 써야 끝난다 |
 * | `연립방정식의 풀이의 응용\|141X` | **심화상** | 계수 $a$ — **굳지 않는다.** 살아남는 값이 하나가 아니라 **여럿**이고 그 전부가 답에 들어간다 | 굳지 않는다. 「$a+1$ 이 $N$ 의 약수」는 **후보 목록을 만들어 줄 뿐** 어느 것인지 고르지 않는다. 약수를 다 세운 뒤 **$y$ 도 자연수인가**를 하나씩 견주어 걸러야 하고, 버려지는 후보가 실제로 생긴다 | 색인 `14`(해에 대한 조건)·`15`(두 연립방정식의 해가 같을 때)·`16`(잘못 보고 구한 해)는 전부 **상수가 하나로 굳는 정방향**이라 해설이 「풀면 $a=\dots$」로 끝난다. `141X` 는 상수가 **여럿 살아남고** 답이 그 값들의 **합**이며, 「이 후보는 왜 죽는가」라는 걸음이 하나 더 있다 |
 * | `닮은 도형\|142X` | **심화상** | 어느 변이 대응하는가 — **정해져 있지 않다.** 발문이 닮음 기호($\backsim$)를 안 쓰므로 대응 순서를 읽어 낼 자리가 없다 | 굳지 않는다. 대응 후보 **셋을 다 세워** 각각의 닮음비로 나머지 두 변을 계산하고, 「나머지 두 변도 자연수」인지를 **셋 다** 따져야 한다. 살아남는 후보가 둘이라 답이 그 둘의 합이다 | 색인 `01`~`04`·확장 `70`~`74` 는 **전부 닮음 기호나 「대응하는」이라는 말로 대응이 이미 못 박혀** 있어 닮음비가 한 줄에 나온다. `142X` 는 그 한 줄이 **구조적으로 없다** — 「닮음비가 얼마인가」 자체가 세 갈래다 |
 * | `삼각형의 두 변의 중점을 연결한 선분\|143X` | **심화중** | $\overline{AB}$ 와 $\overline{AC}$ **각각** — 발문이 둘레와 $\overline{BC}$ 만 주므로 두 변의 길이는 **끝까지 안 정해진다** | 그 소단원의 **중점연결정리** 하나. 그것을 두 층에 적으면 $\overline{PM}+\overline{QN}=\dfrac{1}{4}(\overline{AB}+\overline{AC})$ 가 되어 **합만 알면 충분해진다**. 그래서 정해지지 않은 마디가 답에서 사라진다 | 색인 `01`~`05`·확장 `70`~`72` 는 **필요한 변을 발문이 전부 준다**(그 값을 반으로 나누면 끝). `143X` 는 ㉠ 정리를 **두 층**에 적용하고 ㉡ 「각각은 몰라도 합이면 된다」를 한 번 써야 한다 — 어느 쪽이 빠져도 답이 안 나온다 |
 *
 * ## ⑶ 🔴 앞 물결들이 **실제로 새어 나간 자리** — 여기서 어떻게 막았나
 *
 * 전부 「값은 맞고 KaTeX 도 초록」이라 값 검산·냄새 자가 구조적으로 못 보던 부류다.
 *
 * ㉮ **해설이 정답지 한 단을 넘었다**(3차 중1 `53V`, 1242px). → 넷 다 제품
 *    `estimateSolutionPx` 로 **800판**을 재어 잠근다. 실측 최댓값은 ⑸ 에 적었다.
 *    그렇다고 **걸음을 지우지 않는다**(D-116 ⑹) — `141X`·`142X` 의 «버리는 후보»
 *    줄은 길어도 남긴다. 대신 후보 개수의 **상한**을 매개변수에서 못 박았다
 *    (`141X` 살아남는 값 $\le4$·버리는 값 $\le3$, `142X` 는 늘 $2+1$).
 * ㉯ **해설이 「자연수」 걸음을 건너뛰었다**(3차 중2 `38V`). → `141X` 는 정수 경계로
 *    뛰는 유일한 자리에 **그 근거를 그 자리에서** 적는다 — 「$y=S-x$ 이고 $y$ 가
 *    자연수이므로 $y\ge1$, 즉 $x\le S-1$ 이어야 한다」. $x$ 도 $y$ 도 정수이므로
 *    이 두 문장은 **동치**다(어림이 아니다). `142X` 의 「자연수가 아니므로 버린다」도
 *    나누어떨어지는지를 **곱셈 한 줄로 보여 준 뒤에** 말한다.
 * ㉰ **해설이 기약이 아닌 분수를 찍었다**(3차 중1 `52V`). → 지면에 나가는 분수는
 *    `140X` 의 $\dfrac{p}{q}$·$\dfrac{q-p}{q}$ 와 `143X` 의 $\dfrac{1}{2}$·$\dfrac{1}{4}$
 *    뿐이다. 앞엣것은 $\gcd(p,q)=1$ 이면 $\gcd(q-p,q)=1$ 이 **따라 나오므로**
 *    한쪽만 걸면 된다(생성기가 $\gcd(r,q)=1$ 인 $(r,q)$ 에서 시작한다).
 *    `141X`·`142X` 는 분수를 아예 안 쓴다 — 나눗셈은 `\div` 로 적는다.
 * ㉱ **발문이 스스로 못 박은 상한을 오답이 넘었다**(4차 중2 `37W`). → 넷 다 발문이
 *    상한을 **선언하지 않는다**(공용 `declaredUpperBound` 가 넷 전량에서 `null`).
 *    시험이 800판에서 그것을 못 박고, 그 자가 살아 있는지도 함께 잰다.
 *    ⚠️ `140X` 의 발문에는 확률 $\dfrac{p}{q}$ 가 있지만 **답은 개수**라 그 값이
 *    상한이 아니다 — 「확률이니 $1$ 이하」라는 규약이 여기서는 답에 안 걸린다.
 * ㉲ **정답이 «구간»이면 파생 오답이 뒤집힌다**(3차 중2 `35V`). → 넷 다 정답이
 *    **한 값**이다(`141X`·`142X` 는 여러 후보의 **합**이라 값이 하나다).
 * ㉳ **해설의 «말»을 지키는 시험이 없었다**(4차). → 시험이 논리 문장의 낱말을 읽는다 —
 *    `140X` 의 「$1$에서 … 뺀 것과 같다」·「그대로」·「처음에 있던」, `141X` 의
 *    「변끼리 더하면」·「약수여야 한다」·「버린다」, `142X` 의 「대응변의 길이의 비는
 *    모두 같고」·「나누어떨어지지 않으므로」, `143X` 의 「중점연결정리」·「각각의 길이는
 *    정해지지 않지만 그 합은 정해진다」. 낱말을 뒤집으면 빨개지는 눈금을 같이 뒀다.
 *    🔴 그래서 **소재마다 달라지는 낱말은 말 목록에 안 넣었다** — 넣으면 소재가
 *    바뀌는 순간 그 시험이 «깨끗»이 아니라 «못 셈»이 된다.
 * ㉴ **지면이 자기가 한 줄 앞에 세운 제약을 스스로 어긴다**(4차 중3 `55W`). →
 *    `141X` 가 「$a+1$ 은 $2$ 이상」과 「$x\le S-1$」 을 선언한다. 나열하는 값은
 *    **전부** 그 안이고 버리는 값은 **밖**이다 — 시험이 지면 글자에서 그 경계를
 *    읽어 전량 대조한다. 버리는 줄은 $y$ 의 값을 실제로 계산해 $0$ 이하임을 보인다.
 * ㉵ **자료를 정렬해 찍으면 «보이는 자리»가 순위를 암시한다**(4차 중1 `63W`). →
 *    `142X` 의 세 변은 **섞어서** 찍는다(셈은 정렬과 무관하다). 그래서 「가운데 적힌
 *    변이 대응하는 변이다」 같은 암시가 안 생긴다 — 실측으로 버려지는 자리가
 *    첫째·둘째·셋째에 **골고루** 온다(⑸).
 * ㉶ **D-20 손실 원장은 «재현 가능»해야 한다**(4차 중1 `62W`). → ⑹ 에 가드마다
 *    「이 가드 **하나만** 껐을 때」를 전수로 세어 적었다. 판 수와 답 수의 측정점을
 *    **같은 자리**(매개변수 전수)로 맞췄다.
 * ㉷ **내보낸 순수 함수의 주석이 코드와 어긋나면 안 된다**(4차 중3). → 아래 네
 *    함수의 단언은 전부 시험이 손 실측 눈금으로 **문다**.
 * ㉸ 우리말 — 「그중」은 붙여 쓴다. 조사는 지면에 **찍히는 글자**로 정한다
 *    (`iGa`·`eunNeun` 은 `m2Josa.eulReul` 한 곳에서 받침을 받아 온다).
 *
 * ## ⑷ 계약 (이웃 모듈과 한 벌)
 *
 * 1. **정답을 먼저 뽑고 발문을 역산한다.**
 * 2. `facts` 로 정답 문자열을 **다시 지을 수 있다**(시험이 왕복으로 잠근다).
 *    `facts.x` 는 답의 **첫 수** — `140X` 는 더 넣은 개수, `141X` 는 $a$ 의 합,
 *    `142X` 는 둘레의 합, `143X` 는 둘레.
 * 3. 숫자는 전부 `$...$` 안에 (`elementary/rules` `bareNumbers`).
 * 4. `attempt` 가 다 떨어지면 **던진다** — 조용히 기본값을 내지 않는다.
 * 5. 그림이 없으므로 발문이 **지면을 가리키지 않는다**(`pointsAtFigure`).
 * 6. 🔴 **해설이 걸음을 건너뛰지 않는다.** 후보를 견주는 갈래(`141X`·`142X`)는
 *    **죽는 후보가 왜 죽는지**까지 적는다.
 * 7. 🔴 **낱말 뒤 조사를 손 목록으로 적지 않는다** — 한글 음절 코드에서 계산한다.
 * 8. 굳힘 함수는 **끄는 인자**를 들고 있다. 생성기는 늘 켜고, 시험이 그것을 흔들어
 *    「이 걸음을 지우면 답이 바뀌는가」를 잰다(생성기 안에서 두 판을 견주는 줄은
 *    한 번도 거부하지 못하는 «도장»이 된다 — 2026-08-23).
 *
 * ## ⑸ 실측 — 어림하지 않은 값
 *
 * 「매개변수 전수」는 생성기의 뽑기 범위를 **그대로 편** 것이고(`.tmp-` 아래에서
 * 돌렸다), 「표본」은 씨앗 블록 넷($20260906$·$900000$·$123456$·$5550000$) × $1{,}000$판이다.
 * **둘은 다른 값이다** — 시험이 잠그는 것은 표본 쪽이다.
 *
 * | 유형 | 전수 판 | 전수 정답수 | 전수 최빈 | 표본 최빈(넷) | 표본 정답수 | 해설 최대 px |
 * |---|---|---|---|---|---|---|
 * | `140X` | $2{,}016$ | $54$ | $4.86\%$ | $6.60/6.30/6.40/6.30\%$ | $46$~$49$ | $397$ |
 * | `141X` | $451$ | $53$ | $6.65\%$ | $6.40/6.80/6.60/7.00\%$ | $52$~$53$ | $462$ |
 * | `142X` | $200$ | $71$ | $6.50\%$ | $5.40/6.20/4.80/5.90\%$ | $69$~$70$ | $405$ |
 * | `143X` | $152$ | $56$ | $3.29\%$ | $4.00/3.10/3.30/3.70\%$ | $56$ | $351$ |
 *
 * 문턱은 $12\%$ 이므로 가장 빠듯한 `141X` 도 여유가 $5\%$ 다. 해설은 넷 다 한 단
 * ($964.8$px)의 절반 아래이고 시험이 $700$px 로 잠근다.
 *
 * 곁가지 분포(표본 $2{,}000$판) — `140X` 소재 **넷 다** 나온다 ·
 * `141X` 살아남는 값이 $2$개 $1{,}041$ · $3$개 $375$ · $4$개 $584$, 버리는 값이
 * $1$개 $1{,}556$ · $2$개 $323$ · $3$개 $121$ · `142X` 의 **버리는 자리**가
 * 첫째 $636$ · 둘째 $663$ · 셋째 $701$ 로 **골고루**다(㉵ 가 지키려던 것).
 *
 * ## ⑹ 🔴 손실 원장 (D-20 · ㉶) — 가드를 **하나씩만** 껐을 때
 *
 * 아래 값은 전부 **매개변수 전수**에서 센 것이다(표본이 아니다). 「판 수」와
 * 「정답 가짓수」의 측정점이 같은 자리다.
 *
 * | 유형 | 가드 | 켠 판 | 끈 판 | 켠 정답수 | 끈 정답수 | 켠 최빈 | 끈 최빈 |
 * |---|---|---|---|---|---|---|---|
 * | `140X` | 지름길(발문 네 수의 한두 번 연산) | $2{,}016$ | $5{,}915$ | $54$ | $54$ | $4.86\%$ | $6.44\%$ |
 * | `140X` | 전체 개수 $\le60$ | $2{,}016$ | $14{,}948$ | $54$ | $166$ | $4.86\%$ | $2.24\%$ |
 * | `140X` | $a\ge2$ | $2{,}016$ | $2{,}016$ | $54$ | $54$ | — | **못 문다** |
 * | `141X` | 지름길 | $451$ | $460$ | $53$ | $53$ | $6.65\%$ | $6.52\%$ |
 * | `141X` | 살아남는 값 $2$~$4$ | $451$ | $653$ | $53$ | $78$ | $6.65\%$ | $4.75\%$ |
 * | `141X` | 버리는 값 $1$~$3$ | $451$ | $664$ | $53$ | $70$ | $6.65\%$ | $4.52\%$ |
 * | `141X` | $x$ 최댓값 $\ge2$ | $451$ | $451$ | $53$ | $53$ | — | **못 문다** |
 * | `142X` | 지름길 | $200$ | $207$ | $71$ | $71$ | $6.50\%$ | $6.28\%$ |
 * | `142X` | 살아남는 후보가 정확히 둘 | $200$ | $212$ | $71$ | $72$ | $6.50\%$ | $6.13\%$ |
 * | `142X` | 둘레 $\le120$ | $200$ | $363$ | $71$ | $130$ | $6.50\%$ | $3.58\%$ |
 * | `143X` | 지름길 | $152$ | $161$ | $56$ | $57$ | $3.29\%$ | $3.11\%$ |
 * | `143X` | 삼각형 부등식(뽑기 범위) | $152$ | $152$ | $56$ | $56$ | — | **못 문다** |
 *
 * 🔴 **지름길 가드는 넷 다 값이 싸다** — 잃는 판이 $3\%$~$66\%$ 인데 정답 가짓수는
 * 거의 그대로다. 가장 비싼 것은 `140X` 의 지름길($5{,}915\to2{,}016$)인데, 남겨 두면
 * 「발문의 두 수를 빼면 답」인 문항이 그만큼 섞인다.
 *
 * 🔴 **그리고 «못 무는» 줄이 셋이다.** 전수로 하나씩 꺼 봐서 알았다 — 셋 다 다른
 * 가드나 굳힘 함수가 **먼저** 문다. 지우지 않고 남기되 코드 옆에 ⚠️ 로 적어 두었다.
 * **가드로 읽으면 안 된다**(2026-08-18 「`LOOP` 가 있나」와 같은 자리).
 *
 * ## ⑺ 표본 값의 문턱은 시험 파일이 **돌려서** 잠근다
 *
 * 위 표는 이 회차에 잰 값이고, 「이 값을 넘으면 빨개진다」는 문턱은
 * `src/__tests__/unit/middleM2Top5j.test.ts` 가 실제로 생성해서 잰다. 그래서 씨앗이
 * 바뀌면 표가 낡아도 **시험은 안 낡는다.**
 *
 * ## ⑻ 🔴 변이 시험 — **망가뜨려 봐야 가드인 줄 안다**
 *
 * 회차마다 **음성 대조**(변이 없이 초록)를 먼저 확인하고, ⑴ 파일이 바뀌었나
 * ⑵ **산출물 지문이 바뀌었나** ⑶ 그제서야 시험이 빨개지나 를 차례로 물었다.
 * 빨간데 **실패한 시험 이름을 못 대면** 판정을 거부한다.
 * 되돌리기는 **시작할 때 읽어 둔 바이트**로 한다 — 이 파일은 아직 커밋 전이라
 * `git show HEAD:` 로 짜면 통째로 날아간다(2026-08-23).
 *
 * **변이 24 중 23 이 빨강 · 초록 0 · 건너뜀 1.**
 *
 * 🔴 그런데 **1차에는 초록 1 · 건너뜀 6 이었다.** 그 일곱이 이 항목의 값어치다.
 *
 * 1. **건너뜀 다섯은 «지문이 좁아서»였다**(2026-08-25 와 같은 자리). 처음 지문은
 *    생성기 산출물만 담았는데, `addedCount` 의 나누어떨어짐 가드처럼 **생성기가
 *    한 번도 안 밟는 계약 가드**는 그러면 «산출물 그대로»로 판정 자체를 못 받는다.
 *    지문에 **시험이 쓰는 손 실측 인자**까지 넣자 다섯이 전부 빨강이 됐다.
 *    ⚠️ 그러면서 시험에 눈금 한 줄이 모자란 것도 드러났다 — `addedCount(10,1,4,7)`
 *    처럼 **자연수가 아닌 개수가 나오는** 자리가 없어서, 그 가드를 지워도 아무
 *    눈금이 안 물었다.
 * 2. **초록 하나는 진짜였다** — 「둘레 $\le120$」을 지워도 아무것도 안 빨개졌다.
 *    모듈이 「지면의 수가 너무 크면 흉하다」고 **적어 놓고 지키는 자가 없었다**(㉷).
 *    시험에 그 상한을 못 박아 빨강이 됐다.
 * 3. **건너뜀 하나(`142X` 의 둘레 서로 다름)는 옳다** — 「살아남는 후보가 정확히
 *    둘」이 살아 있는 한 그 줄은 **혼자서는 못 문다.** 지우지 않는 까닭은 그 위
 *    줄을 망가뜨렸을 때 **대신 무는 backstop**이기 때문이고, 그래서 조건을
 *    `!== 2` 가 아니라 `!== kept.length` 로 적었다(그렇게 안 적으면 위 줄의 변이가
 *    여기서 막혀 「가드가 아니다」로 잘못 읽힌다 — 실측으로 그렇게 났다).
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { attempt, shuffle } from "./m1Shared";
import { eulReul, euroRo } from "./m2Josa";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";

/** RPM 색인 정본(`scripts/rpm/rpm-type-catalog.json`)의 책·중단원 이름 — 글자 그대로. */
const BOOK_ALG = "2-1";
const BOOK_GEO = "2-2";
const MINOR_SYS = "연립일차방정식";
const MINOR_SIM = "도형의 닮음";
const MINOR_CENTROID = "삼각형의 무게중심";
const MINOR_PROB = "확률";

/**
 * 우리 `Unit.section` 정확한 이름 (`prisma/seed-data/units.ts` 실측).
 * 시험이 단원 정본에 **대조**한다 — 손으로 옮겨 적은 것을 믿지 않는다.
 */
const SEC = {
  확률뜻: "확률의 뜻과 성질",
  연립응용: "연립방정식의 풀이의 응용",
  닮은도형: "닮은 도형",
  중점연결: "삼각형의 두 변의 중점을 연결한 선분",
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

/**
 * 🔴 **한글 낱말의 받침을 «음절 코드»에서 계산한다** — 계약 ⑷.7.
 *
 * 소재 낱말마다 조사를 손으로 적어 두면 목록이 곧 두 벌이 되고, 그 목록은 값 검산이
 * 구조적으로 못 본다. 한글 음절은 `0xAC00` 부터 28개씩 묶여 있고, 그 안에서 자리가
 * $0$ 이면 받침이 없다.
 */
export function hasFinalConsonant(word: string): boolean {
  const c = word.charCodeAt(word.length - 1) - 0xac00;
  return c >= 0 && c < 11172 && c % 28 !== 0;
}

/** 낱말 뒤 보조사 — 「구슬은」·「공은」·「사탕은」. */
function wordEun(word: string): "은" | "는" {
  return hasFinalConsonant(word) ? "은" : "는";
}

/**
 * 낱말 뒤 목적격 조사 — 「구슬을 꺼낼」·「사탕을 꺼낼」.
 *
 * 🔴 처음에 이 자리에 `wordEun` 을 썼다가 지면에 **「빨간 구슬은 꺼낼 확률」**이
 *    나갔다. 값도 KaTeX 도 멀쩡해서 어느 자도 못 보고, 표본을 눈으로 읽어서만
 *    드러났다 — 「보조사」와 「목적격 조사」는 받침 판정이 같아도 **다른 자리**다.
 */
function wordEul(word: string): "을" | "를" {
  return hasFinalConsonant(word) ? "을" : "를";
}

/** 낱말 뒤 주격 조사 — 「구슬이」·「사탕이」. */
function wordIGa(word: string): "이" | "가" {
  return hasFinalConsonant(word) ? "이" : "가";
}

/**
 * 수 뒤 주격 조사 — 받침 판정은 `m2Josa.eulReul` **한 곳**에서 온다
 * (규칙을 두 벌로 안 둔다. `m2Top.ts`~`m2Top4.ts` 가 같은 까닭으로 같은 함수를 쓴다).
 */
function iGa(n: number): "이" | "가" {
  return eulReul(n) === "을" ? "이" : "가";
}

/** 지면에 적히는 기약분수. */
function frac(n: number, d: number): string {
  return `\\dfrac{${n}}{${d}}`;
}

/** $n$ 의 약수 전부 — 오름차순. */
export function divisorsOf(n: number): number[] {
  const out: number[] = [];
  for (let d = 1; d * d <= n; d += 1) {
    if (n % d !== 0) continue;
    out.push(d);
    if (d !== n / d) out.push(n / d);
  }
  return out.sort((a, b) => a - b);
}

/**
 * 발문에 찍힌 수를 한두 번 연산해서 답이 나오는가 (㉵ 지름길).
 * 시험 쪽의 지름길 자와 **같은 꼴**로 짓는다 — 한쪽만 넓히면 그 자가 무뎌진다.
 */
function shortcutHits(printed: readonly number[], answer: number): boolean {
  const g = new Set<number>();
  for (const a of printed) {
    g.add(a);
    g.add(2 * a);
    g.add(3 * a);
    for (const d of [2, 3, 4, 5, 6, 10]) g.add(a / d);
  }
  for (const a of printed)
    for (const b of printed) {
      if (a === b) continue;
      g.add(a - b);
      g.add(a + b);
      g.add(a * b);
      g.add(a / b);
      g.add(Math.round(a / b));
      g.add((a - b) / 2);
      g.add((a + b) / 2);
      g.add((a - b) / 3);
    }
  return g.has(answer);
}

// ═══════════════════════════════════════════════════════════
// 140X  여사건으로 «더 넣은 개수» 되찾기  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * **굳힘 함수** — 「$X$ 가 아닐 확률이 $\dfrac{p}{q}$」에서 더 넣은 개수를 되찾는다.
 *
 * 🔴 **굳힘의 인자는 `useComplement` 다.** 켜면 먼저 여사건으로 방향을 뒤집어
 * $X$ 일 확률 $\dfrac{q-p}{q}$ 를 얻고, 그 값과 $\dfrac{a}{a+b+x}$ 를 같다고 놓는다.
 * 끄면 발문의 값을 그대로 $X$ 일 확률로 읽는다 — 이 유형이 재려는 바로 그 마디다.
 *
 * ⚠️ `useComplement=false` 는 제품이 안 쓰는 길이다(생성기는 늘 `true`). 시험이
 *    ㉡ 을 **흔들어 잴 수 있게** 남겨 둔 자리다(계약 ⑷.8).
 *
 * 전체 개수가 자연수로 안 떨어지거나 처음 개수보다 크지 않으면 `null`.
 */
export function addedCount(
  a: number,
  b: number,
  p: number,
  q: number,
  useComplement = true,
): number | null {
  if (a < 1 || b < 1 || p < 1 || q < 2 || p >= q) return null;
  const share = useComplement ? q - p : p;
  if (share < 1) return null;
  if ((a * q) % share !== 0) return null;
  const whole = (a * q) / share;
  const added = whole - a - b;
  return added >= 1 ? added : null;
}

/**
 * 소재 — 두 가지를 지킨다.
 *
 * ⑴ 묻는 쪽(`target`)은 **받침으로 끝나는 낱말**만 쓴다(지면이 「…이 아닐」로 굳는다).
 * ⑵ 세는 단위가 **넷 다 「개」**다. 단위가 소재마다 다르면 정답 문자열이 갈라져
 *    `facts` 왕복(계약 ⑷.2)이 소재를 알아야 하고, 그러면 그 왕복이 지키는 것이
 *    「값이 맞나」에서 「소재 표를 옮겨 적었나」로 바뀐다.
 */
const BAGS: ReadonlyArray<{
  where: string;
  thing: string;
  target: string;
  other: string;
}> = [
  {
    where: "주머니",
    thing: "구슬",
    target: "빨간 구슬",
    other: "파란 구슬",
  },
  { where: "상자", thing: "공", target: "흰 공", other: "검은 공" },
  {
    where: "바구니",
    thing: "바둑돌",
    target: "흰 바둑돌",
    other: "검은 바둑돌",
  },
  {
    where: "봉지",
    thing: "사탕",
    target: "딸기 맛 사탕",
    other: "포도 맛 사탕",
  },
];

const COMPLEMENT_COUNT: TypeEntry[] = [
  def(
    BOOK_GEO,
    MINOR_PROB,
    "140X",
    "여사건의 확률에서 더 넣은 개수 구하기",
    SEC.확률뜻,
    "심화중",
    (rng): Body =>
      attempt(6000, (): Body | null => {
        // 정답 쪽에서 짓는다 — 「$X$ 일 확률」을 기약 $\dfrac{r}{q}$ 로 먼저 잡는다.
        const q = intBetween(rng, 3, 15);
        const r = intBetween(rng, 1, q - 1);
        if (gcd(r, q) !== 1) return null;
        const p = q - r;
        // 🔴 $p=r$ 이면 여사건을 안 써도 답이 같아진다 — ㉡ 이 잴 것이 없어진다.
        //    $\gcd(r,q)=1$ 아래에서 $p=r$ 은 $q=2$ 뿐이므로 위 범위가 **이미** 막는다.
        //    ⚠️ 여기에 「끈 판과 답이 같으면 버린다」를 두면 **한 번도 거부 못 하는
        //    도장**이 된다(2026-08-23). 그래서 그 흔들기는 시험 쪽에 있다.
        const m = intBetween(rng, 1, 12);
        const a = m * r;
        const whole = m * q;
        // ⚠️ `a < 2` 는 이 범위에서 **못 문다** — $a=1$ 이면 $m=r=1$ 이라 $p=q-1$ 이
        //    되고, 그때 답 $x=q-1-b$ 가 발문의 $p-b$ 와 같아져 **지름길 가드가 먼저**
        //    문다(전수 실측: 이 줄만 꺼도 판이 2,016 그대로다). 뜻을 적어 두는 줄이니
        //    **가드로 읽지 말 것.**
        if (a < 2 || whole > 60) return null;
        // $b\ge1$ 과 $x\ge2$ 를 둘 다 채우려면 남는 자리가 셋은 있어야 한다 —
        // 이 줄이 없으면 `intBetween` 이 범위가 뒤집혔다며 던진다(실측).
        if (whole - a < 3) return null;
        const b = intBetween(rng, 1, whole - a - 2);
        // 🔴 답은 **내보낸 굳힘 함수가** 낸다 — 여기서 따로 계산해 견주면 그 비교가
        //    도장이 된다. 이렇게 두면 함수가 망가지는 순간 지면이 통째로 바뀐다.
        const added = addedCount(a, b, p, q);
        if (added === null || added < 2) return null;

        // 🔴 ㉵ 지름길 — 발문에 찍히는 네 수의 한두 번 연산으로 답이 나오면 버린다.
        if (shortcutHits([a, b, p, q], added)) return null;

        const bag = pick(rng, BAGS);
        const first = a + b;
        const notTarget = whole - a;
        const cross = notTarget * q;

        return {
          content:
            `${bag.where} 속에 ${bag.target} $${a}$개와 ${bag.other} $${b}$개가 들어 있다. ` +
            `이 ${bag.where}에 ${bag.other}만 몇 개 더 넣었더니 ${bag.where}에서 ${bag.thing} 한 개${wordEul("개")} 꺼낼 때 ` +
            `그것이 ${bag.target}${wordIGa(bag.target)} 아닐 확률이 $${frac(p, q)}$${iGa(p)} 되었다. ` +
            `더 넣은 ${bag.other}의 개수를 구하시오.`,
          answer: `$${added}$개`,
          solution: [
            `어떤 사건이 일어나지 않을 확률은 $1$에서 그 사건이 일어날 확률을 뺀 것과 같다.`,
            `${bag.target}${wordIGa(bag.target)} 아닐 확률이 $${frac(p, q)}$이므로 ${bag.target}${wordEul(bag.target)} 꺼낼 확률은 $1-${frac(p, q)}=${frac(r, q)}$이다.`,
            `더 넣은 ${bag.other}의 개수를 $x$라 하면 ${bag.target}${wordEun(bag.target)} 그대로 $${a}$개이고 ${bag.where} 속의 ${bag.thing}${wordEun(bag.thing)} 모두 $(${a}+${b}+x)$개이므로, ${bag.target}${wordEul(bag.target)} 꺼낼 확률은 $\\dfrac{${a}}{${a}+${b}+x}$이다.`,
            `즉 $\\dfrac{${a}}{${a}+${b}+x}=${frac(r, q)}$이므로 $${a}\\times${q}=${r}\\times(${a}+${b}+x)$이다.`,
            `$${a}\\times${q}=${a * q}$이고 $${a * q}\\div${r}=${whole}$이므로 ${bag.where} 속의 ${bag.thing}${wordEun(bag.thing)} 모두 $${whole}$개이다.`,
            `처음에 있던 ${bag.thing}${wordIGa(bag.thing)} $${a}+${b}=${first}$개이므로 $x=${whole}-${first}=${added}$이다.`,
            `따라서 더 넣은 ${bag.other}의 개수는 $${added}$개이다.`,
            `${bag.thing}${wordIGa(bag.thing)} 모두 $${whole}$개일 때 ${bag.target}${wordIGa(bag.target)} 아닌 것은 $${whole}-${a}=${notTarget}$개이고, $${notTarget}\\times${q}=${cross}$, $${whole}\\times${p}=${whole * p}$${euroRo(whole * p)} 두 값이 같으므로 ${bag.target}${wordIGa(bag.target)} 아닐 확률은 $${frac(p, q)}$이다.`,
          ].join("\n"),
          facts: {
            x: added,
            target: a,
            other: b,
            p,
            q,
            r,
            whole,
            first,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 141X  해가 모두 자연수가 되는 계수를 **모두**  (심화상)
// ═══════════════════════════════════════════════════════════

/**
 * **후보 목록** — $\begin{cases}x+y=S\\ax-y=T\end{cases}$ 의 해가 둘 다 자연수가 되게
 * 하는 자연수 $a$ 전부(오름차순).
 *
 * 두 식을 변끼리 더하면 $(a+1)x=S+T=N$ 이므로 $a+1$ 은 $N$ 의 약수 가운데 $2$ 이상인
 * 것이다. 여기까지는 **후보 목록을 만들 뿐** 어느 것인지 고르지 않는다 — 심화상이
 * 심화중과 갈리는 자리다.
 *
 * 🔴 **굳힘의 인자는 `requireY` 다.** 켜면 $y=S-x$ 도 자연수여야 한다는 조건으로
 * 후보를 **걸러낸다**(작은 약수가 죽는다). 끄면 약수를 전부 받아들인다 — 그러면
 * $y\le0$ 인 판이 섞여 답이 커진다.
 */
export function naturalCoefficients(
  S: number,
  T: number,
  requireY = true,
): number[] {
  if (S < 2 || T < 1) return [];
  const N = S + T;
  const out: number[] = [];
  for (const d of divisorsOf(N)) {
    if (d < 2) continue;
    const x = N / d;
    if (requireY && x > S - 1) continue;
    out.push(d - 1);
  }
  return out;
}

const NATURAL_SOLUTION_COEFF: TypeEntry[] = [
  def(
    BOOK_ALG,
    MINOR_SYS,
    "141X",
    "해가 모두 자연수가 되는 계수를 모두 구하기",
    SEC.연립응용,
    "심화상",
    (rng): Body =>
      attempt(6000, (): Body | null => {
        const S = intBetween(rng, 6, 24);
        const T = intBetween(rng, 2, 70);
        const N = S + T;
        const all = divisorsOf(N).filter((d) => d >= 2);
        // 🔴 살아남는 목록은 **내보낸 함수가** 낸다 — 여기서 따로 만들어 견주면
        //    그 비교가 도장이 된다(2026-08-23). 버리는 쪽은 그 여집합이다.
        const as = naturalCoefficients(S, T);
        const keep = as.map((v) => v + 1);
        const kept = new Set(keep);
        const drop = all.filter((d) => !kept.has(d));
        // 🔴 ㉮ 후보가 많으면 나열 줄이 정답지 한 단을 넘는다 — ⑹ 에 대가를 적었다.
        if (keep.length < 2 || keep.length > 4) return null;
        // 「버리는 후보」가 하나도 없으면 D-116 ⑹ 의 걸음이 지면에서 사라진다.
        if (drop.length < 1 || drop.length > 3) return null;
        // ⚠️ 「$x$ 가 전부 $1$ 이면 제약이 아무것도 안 가른다」는 이 범위에서 **못 문다** —
        //    그런 판은 살아남는 약수가 $N$ 하나뿐이라 바로 위 줄이 **먼저** 문다
        //    (전수 실측: 이 줄만 꺼도 판이 451 그대로다). **가드로 읽지 말 것.**
        if (Math.max(...keep.map((d) => N / d)) < 2) return null;

        const total = as.reduce((s, v) => s + v, 0);

        // 🔴 ㉵ 지름길 — 발문에 찍히는 두 수의 한두 번 연산으로 답이 나오면 버린다.
        if (shortcutHits([S, T], total)) return null;

        const divisorList = all.map((d) => `$${d}$`).join(", ");
        const keepLine = keep
          .map((d) => {
            const x = N / d;
            return `$a+1=${d}$이면 $x=${N}\\div${d}=${x}$, $y=${S}-${x}=${S - x}$이다`;
          })
          .join(". ");
        const dropLine = drop
          .map((d) => {
            const x = N / d;
            return `$a+1=${d}$이면 $x=${N}\\div${d}=${x}$인데 $y=${S}-${x}=${S - x}$이므로 자연수가 아니다`;
          })
          .join(". ");
        const check = keep[0]!;
        const cx = N / check;
        const cy = S - cx;

        return {
          content:
            `$a$가 자연수일 때, 연립방정식 $\\begin{cases}x+y=${S}\\\\ax-y=${T}\\end{cases}$의 해 $x$, $y$가 ` +
            `모두 자연수가 되도록 하는 $a$의 값을 모두 구하여 그 합을 구하시오.`,
          answer: `$${total}$`,
          solution: [
            `두 식을 변끼리 더하면 $y$가 없어져 $(a+1)x=${S}+${T}=${N}$이다.`,
            `$a$가 자연수이므로 $a+1$은 $2$ 이상의 자연수이고, $x=\\dfrac{${N}}{a+1}$이 자연수이려면 $a+1$은 $${N}$의 약수여야 한다. $${N}$의 약수 중 $2$ 이상인 것은 ${divisorList}이다.`,
            `또 $y=${S}-x$이고 $y$도 자연수이므로 $y\\ge1$, 즉 $x\\le${S - 1}$이어야 한다.`,
            `${keepLine}. 이 경우들은 $x$, $y$가 둘 다 자연수이다.`,
            `${dropLine}. 이 경우는 버린다.`,
            `따라서 조건을 만족시키는 $a$의 값은 ${as.map((v) => `$${v}$`).join(", ")}의 $${as.length}$개이고, 그 합은 $${as.join("+")}=${total}$이다.`,
            `$a=${as[0]}$일 때 $x=${cx}$, $y=${cy}$이고 $${check - 1}\\times${cx}-${cy}=${(check - 1) * cx - cy}$${euroRo((check - 1) * cx - cy)} 둘째 식을 만족시킨다.`,
          ].join("\n"),
          facts: {
            x: total,
            sum: S,
            diff: T,
            total: N,
            count: as.length,
            dropped: drop.length,
            first: as[0]!,
            last: as[as.length - 1]!,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 142X  대응이 정해지지 않은 닮은 삼각형의 둘레  (심화상)
// ═══════════════════════════════════════════════════════════

/**
 * **후보 목록** — $\triangle ABC$ 의 세 변 가운데 어느 것이 길이 $t$ 인 변에
 * 대응하는지에 따라 생기는 $\triangle DEF$ 의 둘레들.
 *
 * 후보를 **고르지 않는다** — `sides` 와 같은 차례로 값을 내고, 조건을 못 채운
 * 자리는 `null` 로 남긴다. 「어느 것이 살아남는가」는 부르는 쪽이 세어야 한다.
 *
 * 🔴 **굳힘의 인자는 `requireNatural` 이다.** 켜면 「나머지 두 변도 자연수」를
 * 따져 후보를 걸러낸다(못 채운 자리는 `null`). 끄면 **셋이 다 살아나고**, 그때
 * 값은 자연수가 아닐 수 있다 — 그것이 곧 「이 후보는 왜 죽는가」의 답이다.
 *
 * ⚠️ 처음에는 끈 판도 「나누어떨어질 때만」 값을 냈다. 그러면 죽는 후보의 둘레가
 *    우연히 정수인 판만 남아 **생성이 8,000번을 다 쓰고 던졌다**(실측) — 굳힘을
 *    끈 길에 굳힘과 같은 성질을 요구한 셈이라, 흔들어 재려던 축이 스스로 막혔다.
 */
export function similarPerimeters(
  sides: readonly number[],
  t: number,
  requireNatural = true,
): Array<number | null> {
  if (sides.length !== 3 || t < 1) return [null, null, null];
  const perimeter = sides[0]! + sides[1]! + sides[2]!;
  return sides.map((s) => {
    if (s < 1) return null;
    if (requireNatural && sides.some((v) => (v * t) % s !== 0)) return null;
    return (perimeter * t) / s;
  });
}

const UNKNOWN_CORRESPONDENCE: TypeEntry[] = [
  def(
    BOOK_GEO,
    MINOR_SIM,
    "142X",
    "대응이 정해지지 않은 닮은 삼각형의 둘레",
    SEC.닮은도형,
    "심화상",
    (rng): Body =>
      attempt(8000, (): Body | null => {
        const a = intBetween(rng, 3, 20);
        const b = intBetween(rng, a + 1, 22);
        const c = intBetween(rng, b + 1, 24);
        if (a + b <= c) return null;
        const t = intBetween(rng, 2, 30);
        if (t === a || t === b || t === c) return null;

        // 🔴 ㉵ 세 변을 **섞어서** 찍는다 — 늘 오름차순이면 「가운데 것이 대응한다」
        //    같은 암시가 생긴다(4차 중1 `63W` 가 물린 자리와 같은 성질).
        const shown = shuffle(rng, [a, b, c]);
        const perims = similarPerimeters(shown, t);
        const kept = perims.filter((v): v is number => v !== null);
        // 🔴 살아남는 후보가 정확히 둘 — 셋이면 «버리는 걸음»이 없고, 하나면 「모두」가
        //    뜻이 없다. 대가는 ⑹ 에 적었다.
        if (kept.length !== 2) return null;
        // 🔴 두 둘레가 서로 달라야 「모두 구하여 그 합」이 뜻을 갖는다.
        //    ⚠️ 바로 위 줄과 **뜻이 다르다** — 위는 «몇 개가 살아남나», 여기는
        //    «살아남은 것이 서로 다른가»다. 그래서 `!== 2` 가 아니라
        //    `!== kept.length` 로 적는다. `2` 로 적으면 위 줄을 되풀이하는 셈이라
        //    위 줄을 망가뜨렸을 때 **여기가 대신 물어** 변이 시험이 「가드가 아니다」로
        //    잘못 읽힌다(실측으로 그렇게 났다).
        if (new Set(kept).size !== kept.length) return null;
        // 지면의 수가 너무 크면 흉하다 — 대가는 ⑹ 에 적었다.
        if (Math.max(...kept) > 120) return null;

        const total = kept[0]! + kept[1]!;
        // ⚠️ 여기에 「자연수 조건을 끄면 셋이 된다」를 두지 않는다 — 바로 위에서
        //    살아남는 후보를 둘로 못 박았으므로 그 비교는 **한 번도 거부 못 하는
        //    도장**이다(2026-08-23). 그 흔들기는 시험 쪽에 있다.
        // 🔴 ㉵ 지름길.
        if (shortcutHits([...shown, t], total)) return null;

        const perimeter = shown[0]! + shown[1]! + shown[2]!;
        const lines: string[] = [];
        for (let i = 0; i < 3; i += 1) {
          const s = shown[i]!;
          const others = shown.filter((_v, j) => j !== i);
          if (perims[i] !== null) {
            const u = (others[0]! * t) / s;
            const v = (others[1]! * t) / s;
            lines.push(
              `길이가 $${s}\\,\\mathrm{cm}$인 변에 대응한다고 하면 나머지 두 변의 길이는 $${others[0]}\\times${t}\\div${s}=${u}$, $${others[1]}\\times${t}\\div${s}=${v}$${euroRo(v)} 둘 다 자연수이고, 이때 둘레의 길이는 $${t}+${u}+${v}=${perims[i]}\\,(\\mathrm{cm})$이다.`,
            );
          } else {
            const badIndex = shown.findIndex((v) => (v * t) % s !== 0);
            const bad = shown[badIndex]!;
            lines.push(
              `길이가 $${s}\\,\\mathrm{cm}$인 변에 대응한다고 하면 $${bad}\\times${t}=${bad * t}$인데 $${bad * t}$${iGa(bad * t)} $${s}$${euroRo(s)} 나누어떨어지지 않으므로 대응하는 변의 길이가 자연수가 아니다. 이 경우는 버린다.`,
            );
          }
        }
        const keptSides = shown.filter((_v, i) => perims[i] !== null);

        return {
          content:
            `두 삼각형 $ABC$와 $DEF$는 서로 닮은 도형이다. $\\triangle ABC$의 세 변의 길이는 각각 ` +
            `$${shown[0]}\\,\\mathrm{cm}$, $${shown[1]}\\,\\mathrm{cm}$, $${shown[2]}\\,\\mathrm{cm}$이고, ` +
            `$\\triangle DEF$의 한 변의 길이는 $${t}\\,\\mathrm{cm}$이며 나머지 두 변의 길이도 모두 자연수이다. ` +
            `$\\triangle DEF$의 둘레의 길이가 될 수 있는 값을 모두 구하여 그 합을 구하시오.`,
          answer: `$${total}\\,\\mathrm{cm}$`,
          solution: [
            `닮은 두 도형에서 대응변의 길이의 비는 모두 같고 그 비가 닮음비이다. 길이가 $${t}\\,\\mathrm{cm}$인 변에 대응하는 $\\triangle ABC$의 변이 어느 것인지 정해져 있지 않으므로 세 경우를 모두 따진다.`,
            ...lines,
            `따라서 $\\triangle DEF$의 둘레의 길이가 될 수 있는 값은 $${kept[0]}\\,\\mathrm{cm}$, $${kept[1]}\\,\\mathrm{cm}$이고, 그 합은 $${kept[0]}+${kept[1]}=${total}\\,(\\mathrm{cm})$이다.`,
            `$\\triangle ABC$의 둘레의 길이가 $${shown[0]}+${shown[1]}+${shown[2]}=${perimeter}\\,(\\mathrm{cm})$이므로 $${perimeter}\\times${t}\\div${keptSides[0]}=${kept[0]}$, $${perimeter}\\times${t}\\div${keptSides[1]}=${kept[1]}$${euroRo(kept[1]!)} 두 값이 다시 확인된다.`,
          ].join("\n"),
          facts: {
            x: total,
            s1: shown[0]!,
            s2: shown[1]!,
            s3: shown[2]!,
            given: t,
            perimeter,
            p1: kept[0]!,
            p2: kept[1]!,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 143X  중점연결정리를 두 층에 — 사각형 PMNQ 의 둘레  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * **굳힘 함수** — $\triangle ABC$ 의 둘레 `total` 과 $\overline{BC}=$ `base` 만으로
 * 사각형 $PMNQ$ 의 둘레를 구한다.
 *
 * $\overline{AB}$ 와 $\overline{AC}$ 는 **각각 정해지지 않는다.** 그런데
 * $\overline{PM}+\overline{QN}=\dfrac{1}{4}(\overline{AB}+\overline{AC})$ 이므로
 * **합만 알면 충분하다** — 정해지지 않은 마디가 답에서 사라진다.
 *
 * 🔴 **굳힘의 인자는 `secondLayer` 다.** 켜면 $\overline{PQ}=\dfrac12\overline{MN}$
 * 으로 정리를 **두 층**에 적용한다. 끄면 $\overline{PQ}=\overline{MN}$ 으로 읽는다
 * (둘째 층을 잊는 대표적인 실수) — 답이 $\dfrac{1}{4}\overline{BC}$ 만큼 커진다.
 *
 * 삼각형이 안 되거나($\overline{AB}+\overline{AC}\le\overline{BC}$) 네 변의 길이가
 * 자연수로 안 떨어지면 `null`.
 */
export function midQuadPerimeter(
  total: number,
  base: number,
  secondLayer = true,
): number | null {
  const sum = total - base;
  if (base < 1 || sum <= base) return null;
  if (base % 4 !== 0 || sum % 4 !== 0) return null;
  const pq = secondLayer ? base / 4 : base / 2;
  return pq + base / 2 + sum / 4;
}

const MIDSEGMENT_TWO_LAYERS: TypeEntry[] = [
  def(
    BOOK_GEO,
    MINOR_CENTROID,
    "143X",
    "중점을 두 번 잡아 만든 사각형의 둘레",
    SEC.중점연결,
    "심화중",
    (rng): Body =>
      attempt(4000, (): Body | null => {
        const quarter = intBetween(rng, 2, 15); // $\overline{BC}\div4$
        const rest = intBetween(rng, quarter + 1, 20); // $(\overline{AB}+\overline{AC})\div4$
        const base = 4 * quarter;
        const sum = 4 * rest;
        const total = base + sum;

        // 🔴 답은 **내보낸 굳힘 함수가** 낸다. 삼각형 부등식
        //    ($\overline{AB}+\overline{AC}>\overline{BC}$)과 「네 변이 자연수」도
        //    그 함수 **한 곳**에서 본다 — 위 `rest` 범위는 그 조건을 되풀이해 적은
        //    것이라 **못 문다**(전수 실측: 범위를 열어도 판이 152 그대로다).
        //    ⚠️ 여기에 「둘째 층을 지우면 답이 달라진다」를 두면 늘 참이라 **도장**이
        //    된다 — 그 흔들기는 시험 쪽에 있다.
        const answer = midQuadPerimeter(total, base);
        if (answer === null) return null;
        // 🔴 ㉵ 지름길 — 발문에 찍히는 두 수의 한두 번 연산으로 답이 나오면 버린다.
        if (shortcutHits([total, base], answer)) return null;

        return {
          content:
            `$\\triangle ABC$에서 $\\overline{AB}$, $\\overline{AC}$의 중점을 각각 $M$, $N$이라 하고, ` +
            `$\\overline{AM}$, $\\overline{AN}$의 중점을 각각 $P$, $Q$라 하자. ` +
            `$\\triangle ABC$의 둘레의 길이가 $${total}\\,\\mathrm{cm}$이고 $\\overline{BC}=${base}\\,\\mathrm{cm}$일 때, ` +
            `사각형 $PMNQ$의 둘레의 길이를 구하시오.`,
          answer: `$${answer}\\,\\mathrm{cm}$`,
          solution: [
            `$\\overline{AB}+\\overline{AC}=${total}-${base}=${sum}\\,(\\mathrm{cm})$이다. 각각의 길이는 정해지지 않지만 그 합은 정해진다.`,
            `$M$, $N$이 각각 $\\overline{AB}$, $\\overline{AC}$의 중점이므로 중점연결정리에 의해 $\\overline{MN}$은 나머지 한 변과 평행하고 $\\overline{MN}=\\dfrac{1}{2}\\overline{BC}=\\dfrac{1}{2}\\times${base}=${base / 2}\\,(\\mathrm{cm})$이다.`,
            `$\\triangle AMN$에서 $P$, $Q$가 각각 $\\overline{AM}$, $\\overline{AN}$의 중점이므로 같은 정리를 한 번 더 적용하면 $\\overline{PQ}=\\dfrac{1}{2}\\overline{MN}=\\dfrac{1}{2}\\times${base / 2}=${base / 4}\\,(\\mathrm{cm})$이다.`,
            `$\\overline{PM}=\\dfrac{1}{2}\\overline{AM}=\\dfrac{1}{4}\\overline{AB}$이고 같은 방법으로 $\\overline{QN}=\\dfrac{1}{4}\\overline{AC}$이므로, 두 길이의 합은 $\\dfrac{1}{4}(\\overline{AB}+\\overline{AC})=\\dfrac{1}{4}\\times${sum}=${sum / 4}\\,(\\mathrm{cm})$이다.`,
            `따라서 사각형 $PMNQ$의 둘레의 길이는 $${base / 4}+${sum / 4}+${base / 2}=${answer}\\,(\\mathrm{cm})$이다.`,
            `$\\overline{PQ}$, $\\overline{MN}$, $\\overline{BC}$의 길이가 각각 $${base / 4}\\,\\mathrm{cm}$, $${base / 2}\\,\\mathrm{cm}$, $${base}\\,\\mathrm{cm}$로 $1:2:4$이므로 정리를 두 층에 적용한 결과가 맞다.`,
          ].join("\n"),
          facts: {
            x: answer,
            total,
            base,
            sum,
            mid: base / 2,
            top: base / 4,
            arms: sum / 4,
          },
          figureSpec: null,
        };
      }),
  ),
];

export const M2_TOP_5J: TypeEntry[] = [
  ...COMPLEMENT_COUNT,
  ...NATURAL_SOLUTION_COEFF,
  ...UNKNOWN_CORRESPONDENCE,
  ...MIDSEGMENT_TWO_LAYERS,
];
