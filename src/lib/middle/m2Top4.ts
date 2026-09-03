/**
 * 중2 **확대 갈래 4차 물결**(`심화중`·`심화상`) — D-116, 접미사 **`W`**.
 *
 * ## ⑴ 왜 새 파일인가
 *
 * 3차(`m2Top3.ts`) 머리말과 같은 까닭이다 — 남의 모듈을 잠그는 개수 검사를 무르지
 * 않으려고, 그리고 오르카 다중 세션이 같은 파일에서 부딪히지 않으려고 **새 파일 하나
 * + `generate.ts` spread 한 줄**로 붙인다. 그 한 줄은 **리드가** 넣는다 —
 * 이 파일은 `generate.ts` 를 건드리지 않는다.
 *
 * 착수 전에 「이 넷을 더하면 남의 모듈 개수 검사가 빨개지는가」를 실측했다:
 * `middleM2Func`·`middleM2Line`·`middleM2NumProb`·`middleM2`·`middleLinearApply` 는
 * 전부 **자기 모듈 배열**(`M2_FUNC`·`M2_LINE`·`M2_RATIONAL`…)을 세지
 * `registeredTypes()` 를 중단원으로 거르지 않는다. 그래서 걸리는 자리가 없다
 * (3차가 `middleLinearApply` 에서 물린 자리는 그 파일이 그 뒤에 «모집단은 이 모듈»
 * 로 고쳐졌다). 이 사실은 **읽어서 확인한 것**이므로, 등록 뒤 전량 관문이 참이다.
 *
 * ## ⑵ 유형마다 — 안 굳는 마디 / 무엇이 굳히나 / 같은 소단원과 무엇이 다른가
 *
 * | 키 | 갈래 | 안 굳는 마디 | 무엇이 굳히나 | 아래 갈래와 다른 축 |
 * |---|---|---|---|---|
 * | `유리수와 순환소수\|36W` | **심화중** | 자릿수 $n$ — 자리는 무한히 많고 발문은 «합» 하나만 준다 | 그 소단원의 **순환마디**(주기) 하나. 한 마디를 지날 때마다 누적합이 정확히 마디의 합 $C$ 만큼 늘고, 마디 **안**의 부분합은 (숫자가 모두 $1$ 이상이므로) **단조증가**한다. 그래서 $n$ 개를 하나씩 더하지 않고 **나눗셈 한 번 + 부분합 한 줄**로 끝난다 | 이 소단원에는 **심화하가 없다**(천장이 응용). 비교 상대는 응용 `04`·`33`(소수점 아래 $N$번째 자리의 **숫자**)·`11`(순환소수가 되는 최소 $x$)이다. 그 둘은 **정방향**이고 나눗셈의 대상이 «자릿수»이며 나머지가 곧 답의 위치다. `36W` 는 **역방향**이고 나눗셈의 대상이 «합»이며, 나머지를 **부분합 목록에서 되찾는 걸음**이 하나 더 붙는다 |
 * | `연립일차방정식의 활용\|37W` | **심화중** | $a$, $b$, $c$ **각각**(혼자 하면 며칠인가) — 셋이 다 미지수라 「연립을 풀어야 한다」로 보인다 | 이 소단원의 **가감법**(변끼리 더하기) 하나. 세 식을 변끼리 더하면 왼쪽이 정확히 $2(a+b+c)$ 가 되어 **묻는 값이 바로 나온다** — 각자의 몫은 한 번도 안 구한다 | 심화하 `09` 는 미지수 둘·식 둘이라 해설이 「두 식을 풀면 $x=\dots$, $y=\dots$」로 **각각을 실제로 구하고** 끝난다. `37W` 는 그 줄이 **구조적으로 없다**. 기본 `33A`(둘이 함께 하면 며칠)·연산 `32A`(한 사람의 하루 일의 양)와도 «둘씩 짝짓기»라는 축이 다르다 |
 * | `일차부등식의 활용\|38W` | **심화상** | «어느 가게가 가장 싼가» 그 자체 — 개수 $x$ 에 따라 답이 바뀌고 **굳지 않는다** | 굳지 않는다. 후보 셋의 금액식을 **다 세운 뒤 쌍마다 견주어야** 하고, 창의 아래끝과 위끝이 **서로 다른 쌍의 비교**에서 나온다. 게다가 단가 순서·배송료 순서가 씨앗마다 섞이므로 «어느 쌍이 어느 끝을 주는가»가 계산 전에는 안 정해진다 | 응용 `06`(문구점 vs 인터넷)·심화하 `07`(단체 할인)은 **후보가 둘**이라 부등식 **하나**로 끝나고 답이 「$12$권 이상」이라는 **한쪽 끝**이다. `38W` 는 후보 **셋**, 경계 **둘**, 답이 **닫힌 창 안의 개수**다. 심화하 `74`(예산 안에서 비싼 쪽 최대 몇 개)는 총액 상한 하나로 **위끝만** 나온다 |
 * | `일차함수와 그 그래프  ⑴\|39W` | **심화상** | 상수 $a$ — **굳지 않는다.** 살아남는 후보가 하나가 아니라 **여럿**이고 그 전부가 답에 들어간다 | 굳지 않는다. 「$-a$ 가 $b$ 의 약수」는 «어느 후보인가»를 **고르지 않는다** — 목록을 만들어 줄 뿐이라, 다 세운 뒤 각각의 $x$절편을 계산해 더해야 한다. 이것이 심화중(값이 하나로 굳는다)과 심화상(끝까지 여럿이 남는다)을 가르는 자리다 | 심화하 `85`·`86` 은 미지 상수가 **하나로 굳는 정방향**이다(답이 상수 하나). `39W` 는 상수가 **여럿 살아남고** 답이 그 결과들의 **합**이며, 「$a$ 의 부호가 반대면 왜 죽는가」라는 **버리는 걸음**이 하나 더 있다 |
 *
 * ## ⑶ 🔴 3차 물결이 **실제로 새어 나간 자리** — 여기서 어떻게 막았나
 *
 * 전부 「값은 맞고 KaTeX 도 초록」이라 값 검산·냄새·조사 자가 구조적으로 못 보던 부류다.
 *
 * ㉮ **해설이 정답지 한 단을 넘었다**(중1 `53V`, 1242px). → 넷 다 제품
 *    `estimateSolutionPx` 로 **800판**을 재어 잠근다(시험 「해설 높이」). 그렇다고
 *    **걸음을 지우지 않는다**(D-116 ⑹) — `38W` 의 나열 줄만 창이 길 때 「$a$부터
 *    $b$까지」로 **압축**하고, 압축했든 아니든 **개수 산술**(`hi-lo+1`)은 늘 적는다.
 * ㉯ **해설이 「자연수」 걸음을 건너뛰었다**(중2 `38V`). → `38W` 의 두 경계 줄은
 *    **참 경계 분수**(`\dfrac{5}{3}`)와 「$x$는 자연수이므로」를 **반드시** 적는다.
 *    ⚠️ 우리 부등식은 **엄격 부등호**($>$·$<$)라 공용 훑개
 *    (`probe-middle-extending-tiers.boundStepFaults`)의 `\le`·`\ge` 꼴에 **안 걸린다** —
 *    그 자에게 `38W` 의 「정수 경계 걸음 0」은 «깨끗»이 아니라 **«잴 것이 없다»** 다.
 *    그래서 **엄격 부등호 판을 이 물결의 시험이 따로 들고 있다**(남의 파일을 안 고친다).
 * ㉰ **해설이 기약이 아닌 분수를 찍었다**(중1 `52V`). → 지면의 모든 `\dfrac{수}{수}` 가
 *    기약이 되게 짓는다. 통분 줄은 분자를 **`\dfrac{6+4+3}{36}` 처럼 합의 꼴**로 적어
 *    「통분한 각 항」이 애초에 기약 판정 대상이 아니게 했다(그 값 $\frac{6}{36}$ 을
 *    따로 찍지 않는다). 그리고 `37W` 는 $\gcd(\text{분자합},\ \text{최소공배수})=1$ 인
 *    조합만 낸다 — 안 걸면 통분 결과가 기약이 아니다(실측으로 그런 자리가 있다).
 * ㉱ **발문이 스스로 전제한 상한을 해설이 어겼다**(중2 `36V`).
 *    → 🔴 여기 처음 적힌 말은 「이 넷은 상한을 전제하는 소재가 없다」였는데
 *      **거짓이다.** `37W` 의 발문이 「전체 일의 양을 $1$로 놓고」라고 **스스로**
 *      상한을 못 박는다. 해설은 안 어긴다 — 어긴 것은 **파생 객관식 오답**이었다:
 *      리드 실측 400판 1,600오답 중 **827개(51.69%)가 $1$ 을 넘고**, 넷 다 넘는 판이
 *      **3판(0.75%)** 이라 그 판은 학생이 **계산 없이 답을 집는다.**
 *      뿌리는 이 파일이 아니라 공용 `deriveFormats` 이고(같은 소단원의 묵은 유형
 *      `32A` 도 45.8%), 그래서 **거기에 축을 세웠다** — 「발문이 스스로 못 박은
 *      상한을 넘는 오답은 뒤로 민다」(3차 `35V`→`reversesOrder` 와 같은 자리).
 *      `38W` 의 금액은 발문이 상한을 말하지 않는다 — 그 대목은 참이다.
 * ㉲ **정답이 «구간»이면 파생 오답이 뒤집힌다**(중2 `35V`). → 넷 다 정답이 **한 값**이다
 *    (`37W` 만 분수 하나). 구간 답이 없으므로 그 대가를 치르지 않는다.
 * ㉳ **해설의 «말»을 지키는 시험이 없었다**(중1 `51V`). → 시험이 논리 문장의 낱말을
 *    읽는다 — `36W` 의 「몫」·「나머지」·「커진다」·「하나뿐」, `39W` 의 「약수」·
 *    「음의 정수」·「$N$개」, `38W` 의 「가장 싸지 않고」. 나열 줄 ↔ 수관형사 ↔ 합 줄을
 *    **셋 다** 맞댄다.
 * ㉴ **정답이 한 값에 쏠렸다**(중3 `52V` 51.2%). → 매개변수 **전수**로 재어 적었다 —
 *    `36W` 최빈 **8.2%**(27가지) · `37W` **2.6%**(73가지) · `38W` **9.3%**(21가지) ·
 *    `39W` **3.0%**(130가지). ⚠️ **전수와 표본은 다른 값이다** — 시험이 쓰는 씨앗
 *    (`20260904`+)의 800판에서는 `36W` **10.5%**(27가지) · `37W` **2.8%**(73가지) ·
 *    `38W` **9.0%**(21가지) · `39W` **3.6%**(129가지)다. 시험이 잠그는 것은 **표본 쪽**
 *    이고 문턱은 $12\%$ 다 — `36W` 의 여유가 $1.5\%$ 뿐이니 한 시험지에 둘 이상 싣지 말 것.
 *    ⚠️ **위 표본 값은 씨앗 블록 «하나»짜리라 여유를 낙관적으로 적은 것이다.**
 *    2026-09-03 검문에서 블록 넷($20260904$·$900000$·$123456$·$5550000$) × 1,000판으로
 *    다시 재니 `36W` $8.4/9.0/9.3/10.0\%$ · **`38W` $8.7/9.4/9.5/10.5\%$** 로
 *    **둘이 같은 자리**였다. 시험이 잠그는 것은 저술 씨앗의 값 하나이므로,
 *    **리드가 씨앗을 바꾸면 두 유형이 함께 문턱에 닿는다.** 지면 결함은 아니고
 *    여유에 대한 기록이 반쪽이었다.
 *    처음에 `37W` 표본 최빈이 **14.5%** 였는데, $q$ 를 $[p+1,19]$ 에서 뽑아 작은 $p$
 *    쪽으로 크게 치우쳤기 때문이다 — 세 값을 따로 뽑아 정렬하게 고쳐 2.6%/3.1% 가 됐다.
 * ㉵ **지름길**(중3 `51V` 58%). → `36W` 는 비례 어림 세 값(내림·반올림·올림)과
 *    $\mathrm{round}(S/L)$ 을 **전부 빗나가는 조합만** 낸다. `38W` 는 발문에 적히는
 *    다섯 수의 한두 번 연산(차·몫·$\div100$)이 답과 같으면 **버린다**.
 * ㉶ **손실 원장(D-20)을 어림하지 않는다.** ⑷ 에 **센 값**을 적었다.
 *
 * ## ⑷ 🔴 손실 원장 (D-20 · ㉶) — 어림하지 않고 **전수로 센 값**
 *
 * | 유형 | 지름길 가드 넣기 전 | 넣은 뒤 | 정답 가짓수 | 최빈 정답 |
 * |---|---|---|---|---|
 * | `36W` | 매개변수 전수 **1,254,390** | **78,705** (6.3%) | 27 → **27**(안 줄었다) | 5.2% → **8.2%** |
 * | `37W` | $p<q<r\le20$ **969** | **76** | **73** | **2.6%** |
 * | `38W` | 창이 닫히는 조합 **2,826** | **860** (30.4%) | 23 → **21**(잃은 값 $2$·$3$) | 12.4% → **9.3%** |
 * | `39W` | $b\in[12,400]$ 중 약수 $4$~$8$개 **237** | **236** | **130** | 3.0% → **3.0%** |
 *
 * 🔴 **`36W` 는 잃은 쪽이 정답 «가짓수»가 아니라 «고름»이다** — 지름길을 막으니 최빈이
 * $5.2\%\to8.2\%$ 로 **올랐다**(800씨앗 표본에서는 $9.6\%$). 가짓수는 27로 그대로다.
 * 그 대가를 치르는 까닭은, 남겨 두면 「합을 마디 길이로 대충 나눠 찍으면 맞는」 문항이
 * 전수의 **93.7%** 이기 때문이다. 그래도 한 시험지에 이 유형을 둘 이상 싣지 말 것.
 *
 * `38W` 가 잃은 정답 값 $2$·$3$ 은 **작은 수라 발문 다섯 수의 차·몫에 우연히 맞는**
 * 자리다 — 그것을 남기면 「찍어서 맞는」 문항이 된다. `37W`·`39W` 는 분포가 안 나빠졌다.
 *
 * ## ⑻ 🔴 변이 시험 — **망가뜨려 봐야 가드인 줄 안다**
 *
 * 회차마다 **음성 대조**(변이 없이 초록)를 먼저 확인하고, ⑴ 파일이 바뀌었나 ⑵ **산출물
 * 지문이 바뀌었나** ⑶ 그제서야 시험이 빨개지나 를 차례로 물었다. 빨간데 **실패한 시험
 * 이름을 못 대면** 판정을 거부한다.
 *
 * **생성기 가드 16 중 13 이 빨강.** 나머지 셋은 이렇게 갈렸다 — 셋 다 **가드가 아니다**:
 *
 * 1. `isPrimitiveCycle(digits)` — **한 번도 못 문다.** 매개변수 전수에서 이 줄을 꺼도
 *    통과 조합이 **78,705 로 그대로**다. 모든 숫자가 같은 마디는 $S/L=n$ 이라 「나누기
 *    지름길」이, $d_1d_2=d_3d_4$ 꼴은 비례 어림이 **늘 먼저** 문다.
 * 2. `intBetween(rng, 1, 9)` 의 아래 끝 — **못 문다.** `0` 으로 바꿔도 800씨앗에서
 *    «$0$ 이 든 마디»가 **0건**이다. `digitsUsed` 가 스스로 `digits.some(d < 1)` 을
 *    막고 있고 왕복 검사가 그것을 통과시키지 않는다.
 * 3. `cn <= 0` ↔ `combinedDaily` 의 `tn * minPair <= td` — **서로를 덮는 한 쌍**이라
 *    혼자 꺼도 **산출물이 한 글자도 안 바뀐다**(하네스가 판정을 거부했다).
 *
 * 셋 다 「진짜 지키는 곳」을 따로 망가뜨려 **빨강**을 확인했다 — `digitsUsed` 의 $0$
 * 가드(M17)와 `combinedDaily` 의 양수 가드(M18)는 굳힘 함수 눈금이 문다. 원시 마디는
 * **검산기**가 지키고, 그 눈금은 아래 ⑼ 에서 갈아 끼웠다.
 *
 * ## ⑼ 🔴 그리고 **검산기의 음성 눈금 여덟이 자기 축을 홀로 못 가르고 있었다**
 *
 * 검산기의 검사 16개를 하나씩 꺼 봤더니 처음에는 **7 만 빨강**이었다. 나머지 아홉 중
 * 여덟은 「이 눈금이 그 축을 재고 있다」가 **거짓**이었다 — 이를테면 「원시가 아니다」를
 * 재려던 마디 $1212$ 는 **비례 어림에도** 걸려서, 원시 검사를 지워도 다른 가드가 대신
 * 물었다. 여덟을 전부 **그 축 하나만 걸리는 지면**으로 갈아 끼우거나 새로 만들어
 * **14/16 이 빨강**이 됐다(시험 파일 `middleM2Top4.test.ts` ⑸ 에 자리마다 적었다).
 * 남은 둘은 **초록인 것이 옳다**:
 *
 * - `38W` 「창이 위로 안 닫혔다」 — 이 문항 꼴에서 「창이 너무 길다」와 **같은 사건**이다
 *   (안 닫히면 단가가 가장 싼 가게가 큰 $x$ 에서 늘 이겨 창이 반드시 길어진다).
 *   둘을 다 두는 까닭은 **거부 사유를 정확히 적기** 위해서다.
 * - `39W` 「$|a|>b$ 인 절편이 없다 · 부호가 한쪽이다」 — 가드가 아니라 **「모두」의
 *   반증 시도가 아무것도 못 찾았다**는 기록이다. 못 무는 것이 곧 「모두」가 참이라는 뜻이다.
 *
 * 그러면서 검사 하나를 **지웠다** — 「마디 끝에서 끊겼다($n\bmod L=0$)」는 나머지가
 * $0$ 일 때 비례 어림이 답과 **정확히** 같아지므로 홀로 설 수 없다(대수적으로 같은 말).
 *
 * ## ⑸ 번호 규약 — **`W` 접미사**
 *
 * `extensionNumberReason` 이 「숫자+영문 대문자 한 글자」를 통과시킨다. `A`(색인 밖
 * 보강)·`T`(1차)·`U`(2차)·`V`(3차)가 쓰였으므로 4차는 **`W`** 다 — `36W`~`39W`.
 *
 * ## ⑹ 계약 (이웃 모듈과 한 벌)
 *
 * 1. **정답을 먼저 뽑고 발문을 역산한다.**
 * 2. `facts` 로 정답 문자열을 **다시 지을 수 있다**(시험이 왕복으로 잠근다).
 *    `facts.x` 는 답의 **첫 수** — `36W` 는 $n$, `37W` 는 분자, `38W` 는 개수,
 *    `39W` 는 절편의 합.
 * 3. 숫자는 전부 `$...$` 안에 (`elementary/rules` `bareNumbers`).
 * 4. `attempt` 가 다 떨어지면 **던진다** — 조용히 기본값을 내지 않는다.
 * 5. 그림이 없으므로 발문이 **지면을 가리키지 않는다**(`pointsAtFigure`).
 * 6. 🔴 **해설이 걸음을 건너뛰지 않는다.** 후보를 견주는 갈래(`38W`·`39W`)는
 *    **죽는 후보가 왜 죽는지**까지 적는다.
 * 7. 🔴 **낱말 뒤 조사를 손 목록으로 적지 않는다.** 소재 낱말의 받침은
 *    `objectParticle` 이 **한글 음절 코드**에서 계산한다(목록이 두 벌이 될 자리가 없다).
 *
 * ## ⑺ 정찰과 달라진 것 — 근거를 남긴다
 *
 * 1. 🔴 **정찰의 `38W` 예시 수치가 틀렸다.** 「$\mathrm{A}$ $1800$원·배송료 없음 /
 *    $\mathrm{B}$ $1000$원·$2500$원 / $\mathrm{C}$ $1200$원·$1000$원, $\mathrm{B}$ 가
 *    가장 싼 개수 $6$개」인데, 그 배치에서 $\mathrm{B}$ 는 **단가가 가장 싸서** 큰 $x$
 *    에서 늘 이긴다 — 창이 **위로 안 닫힌다**(실측 $x\ge8$ 전부). 창이 양쪽에서
 *    닫히려면 묻는 가게가 **단가도 배송료도 «가운데»**여야 하고, 단가 차례와 배송료
 *    차례가 **서로 반대**여야 한다. 그렇게 고치면 정찰이 적은 답 $6$개가 실제로 나온다
 *    ($1800$/없음, $1200$/$1000$, $1000$/$2500$ 에서 $\mathrm{B}$ 는 $2\le x\le7$).
 * 2. 정찰은 `36W` 의 가드를 「부분합이 $0<P_i<C$」로 적었다. 그것으로는 **모자란다** —
 *    마디 **가운데**에 $0$ 이 있으면 부분합이 평평해져 같은 합을 주는 자리가 둘이 되고
 *    $n$ 이 **안 정해진다**. 그래서 「마디의 숫자가 **모두 $1$ 이상**」으로 바꿨다.
 *    그러면 부분합이 **단조증가**이므로 유일성이 증명된다(해설도 그 문장을 적는다).
 * 3. 정찰은 `37W` 를 $2\le p\le q\le r\le20$ 으로 열었다. **$p<q<r$ 로 좁혔다** —
 *    $p=q$ 면 두 짝의 날수가 같아 「$\mathrm{A}$와 $\mathrm{B}$가 $6$일, $\mathrm{B}$와
 *    $\mathrm{C}$가 $6$일」이 되어 발문이 어색하고, 그 자리는 $a=c$ 라 사실상 두 사람
 *    문제다. 그리고 **최소공배수를 $180$ 이하로** 묶었다(안 묶으면 정답 분모가
 *    최대 **12,920** 까지 간다 — 실측).
 * 4. 정찰은 `39W` 의 「$y=ax-b$ 판」을 «권함»으로 적었다. **열었다** — 발문이 두
 *    갈래가 되어 형제(`85`·`86`)와의 낱말 겹침을 낮추고, 「죽는 후보」의 부호가
 *    뒤집혀 해설의 걸음이 살아 있는지 시험이 **두 방향으로** 잴 수 있다.
 *    부호는 `facts.plus` 에 담아 왕복이 두 갈래로 갈라지지 않게 했다.
 * 5. 정찰이 「열지 말 것」으로 적은 것은 그대로 안 열었다 — `38W` 의 「$1$개부터
 *    $N$개까지」 상한, `39W` 의 「$-M\le a\le M$」 범위.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { attempt } from "./m1Shared";
import { eulReul, euroRo } from "./m2Josa";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";
const BOOK = "2-1";

/**
 * RPM 색인 정본(`scripts/rpm/rpm-type-catalog.json`)의 중단원 이름 — 글자 그대로.
 *
 * 🔴 `MINOR_FUNC1` 에는 **가는 공백 U+2009** 가 들어 있다(「그래프」 바로 뒤).
 *    보통 공백 두 개를 치면 눈으로는 같아 보이는데 **조용히 안 맞는다** — 그래서
 *    escape 로 적고, 시험이 색인 정본에 **대조**한다.
 */
const MINOR_REPEAT = "유리수와 순환소수";
const MINOR_SYS_APPLY = "연립일차방정식의 활용";
const MINOR_INEQ_APPLY = "일차부등식의 활용";
const MINOR_FUNC1 = "일차함수와 그 그래프  ⑴";

/**
 * 우리 `Unit.section` 정확한 이름 (`prisma/seed-data/units.ts` 실측).
 * 괄호 안의 쉼표·공백은 눈으로 못 가르므로 시험이 단원 정본과 **대조**한다.
 */
const SEC = {
  순환소수: "순환소수",
  일속력: "연립방정식의 활용(일, 속력)",
  개수예금: "일차부등식의 활용(개수, 예금액, 유리한 방법)",
  절편: "일차함수의 그래프와 절편",
} as const;

type Body = Pick<
  MidProblem,
  "content" | "answer" | "solution" | "facts" | "figureSpec"
>;

function def(
  rpmMinor: string,
  rpmType: string,
  rpmTitle: string,
  unitSection: string,
  difficulty: MidProblem["difficulty"],
  gen: (rng: Rng) => Body,
): TypeEntry {
  return {
    key: `${BOOK}|${rpmMinor}|${rpmType}`,
    grade: GRADE,
    unitSection,
    rpmBook: BOOK,
    rpmMinor,
    rpmType,
    rpmTitle,
    handler: (rng) => ({
      grade: GRADE,
      unitSection,
      rpmBook: BOOK,
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

/**
 * 🔴 **한글 낱말의 받침을 «음절 코드»에서 계산한다** — 계약 ⑹.7.
 *
 * 소재 낱말마다 조사를 손으로 적어 두면 목록이 곧 두 벌이 되고, 그 목록은 값 검산이
 * 구조적으로 못 본다(3차 `38V` 가 그래서 「낱말 뒤에 조사를 안 붙인다」로 피해 갔다).
 * 여기서는 피하지 않고 **규칙으로 계산**한다 — 한글 음절은 `0xAC00` 부터 28개씩
 * 묶여 있고, 그 안에서 자리가 $0$ 이면 받침이 없다.
 */
export function hasFinalConsonant(word: string): boolean {
  const c = word.charCodeAt(word.length - 1) - 0xac00;
  return c >= 0 && c < 11172 && c % 28 !== 0;
}

/** 낱말 뒤 목적격 조사 — 「공책을」·「자루를」. */
export function objectParticle(word: string): "을" | "를" {
  return hasFinalConsonant(word) ? "을" : "를";
}

/**
 * 주격 조사 — 받침 판정은 `m2Josa.eulReul` **한 곳**에서 온다(규칙을 두 벌로 안 둔다).
 * `m2Top.ts`·`m2Top2.ts`·`m2Top3.ts` 가 같은 이유로 같은 함수를 들고 있다.
 */
function iGa(n: number): "이" | "가" {
  return eulReul(n) === "을" ? "이" : "가";
}

/** 보조사 — 받침 판정은 `m2Josa.eulReul` **한 곳**에서 온다(`iGa` 와 같은 까닭). */
function eunNeun(n: number): "은" | "는" {
  return eulReul(n) === "을" ? "은" : "는";
}

/** 차례를 나타내는 우리말 — `36W` 의 자리는 최대 넷째다($i<L\le5$). */
const ORDINAL = ["첫째", "둘째", "셋째", "넷째"] as const;

// ═══════════════════════════════════════════════════════════
// 36W  소수점 아래 첫 n자리 숫자의 합을 주고 자릿수 n 을 되찾기  (심화중)
// ═══════════════════════════════════════════════════════════

/** 순환마디 앞에서부터 더한 합 $P_1,\dots,P_L$. */
export function partialSums(digits: readonly number[]): number[] {
  const out: number[] = [];
  let acc = 0;
  for (const d of digits) {
    acc += d;
    out.push(acc);
  }
  return out;
}

/**
 * **굳힘 함수** — 순환마디의 «합»으로 자릿수 $n$ 을 되찾는다.
 *
 * 🔴 **굳힘의 인자는 `useRemainder` 다.** 마디를 몇 번 지났는지(몫)만 세고 **나머지를
 * 부분합 목록에서 되찾는 걸음**을 지우면 답이 $qL$ 로 짧아진다 — 이 유형이 재려는
 * 바로 그 마디다.
 *
 * ⚠️ `useRemainder=false` 는 제품이 안 쓰는 길이다(생성기는 늘 `true`). 그런데도
 *    인자로 두는 까닭은 시험이 ㉡ 을 **흔들어 잴 수 있게** 하기 위해서다 —
 *    생성기 안에서 두 판을 견주는 줄은 한 번도 거부하지 못하는 «도장»이 된다
 *    (2026-08-23 「도장은 초록을 못 낸다」).
 *
 * 마디에 $0$ 이 하나라도 있으면 부분합이 **평평해져** 같은 합을 주는 자리가 둘이 되고
 * $n$ 이 정해지지 않는다 — 그때는 `null` 을 낸다(생성에서 애초에 막는다).
 */
export function digitsUsed(
  digits: readonly number[],
  sum: number,
  useRemainder = true,
): number | null {
  const L = digits.length;
  if (L === 0 || digits.some((d) => d < 1)) return null;
  const P = partialSums(digits);
  const C = P[L - 1]!;
  if (sum < 1 || C < 1) return null;
  const q = Math.floor(sum / C);
  if (!useRemainder) return q * L;
  const rest = sum - q * C;
  if (rest === 0) return q * L;
  const i = P.indexOf(rest);
  if (i < 0) return null;
  return q * L + i + 1;
}

/** 마디가 **원시**인가 — $\overline{1212}$ 의 진짜 마디는 $12$ 다. */
export function isPrimitiveCycle(digits: readonly number[]): boolean {
  const L = digits.length;
  for (let k = 1; k < L; k += 1) {
    if (L % k !== 0) continue;
    let same = true;
    for (let i = 0; i < L; i += 1)
      if (digits[i] !== digits[i % k]) {
        same = false;
        break;
      }
    if (same) return false;
  }
  return true;
}

const CYCLE_SUM_TO_INDEX: TypeEntry[] = [
  def(
    MINOR_REPEAT,
    "36W",
    "소수점 아래 첫 n자리 숫자의 합에서 자릿수 구하기",
    SEC.순환소수,
    "심화중",
    (rng): Body =>
      attempt(4000, (): Body | null => {
        const L = pick(rng, [3, 4, 5] as const);
        const digits: number[] = [];
        for (let k = 0; k < L; k += 1) digits.push(intBetween(rng, 1, 9));
        // 🔴 마디의 숫자가 **모두 $1$ 이상**이라야 부분합이 단조증가한다 — 그래야
        //    「합이 $r$ 이 되는 자리」가 하나뿐이고 $n$ 이 정해진다(⑺ 2).
        //
        // ⚠️ **그런데 이 범위 자체는 한 번도 못 문다.** 변이 M2 가 `1` 을 `0` 으로
        //    바꿔도 800씨앗에서 «$0$ 이 든 마디»가 **0건**이었다 — `digitsUsed` 가
        //    스스로 `digits.some((d) => d < 1)` 를 막고 있고, 아래 왕복 검사가 그것을
        //    통과시키지 않기 때문이다. 규칙이 **한 곳**(굳힘 함수)에 사는 것이고,
        //    그 한 곳은 시험의 `digitsUsed([1,0,3],4) === null` 눈금과 변이 M17 이
        //    **빨갛게** 잰다. 이 줄은 뜻을 적어 둘 뿐이니 **가드로 읽지 말 것.**
        //
        // ⚠️ 아래 원시 마디 줄도 마찬가지로 **못 문다** — 매개변수 전수에서 이 줄을
        //    꺼도 통과 조합이 78,705 로 **그대로**다(변이 M1 실측). 모든 숫자가 같은
        //    마디는 $S/L=n$ 이라 「나누기 지름길」이, $d_1d_2=d_3d_4$ 꼴은 비례 어림이
        //    늘 먼저 문다. 「원시가 아닌 마디로 적으면 안 된다」를 실제로 지키는 것은
        //    **검산기 쪽**이고, 그것은 음성 눈금 `911911`(그 축 **하나만** 걸리는
        //    지면)이 잰다 — 첫 판의 `1212` 는 비례 어림에도 걸려 이 축을 못 쟀다.
        if (!isPrimitiveCycle(digits)) return null;
        const P = partialSums(digits);
        const C = P[L - 1]!;
        // 지면에 적히는 합이 너무 작으면 나눗셈이 뜻이 없고, 너무 크면 마디가 흉하다.
        // ⚠️ **이 줄도 «가드»로 읽지 말 것** — 사본 변이로 꺼도 시험 104개가
        //    104/104 초록이다(2026-09-03 검문). 지면을 고르게 하려고 남긴다.
        if (C < 10 || C > 36) return null;
        // ⚠️ 이 줄도 마찬가지다 — `intBetween(rng, 1, L)` 로 넓혀 마디 끝에서도
        //    끊게 해 보면 시험이 **하나도 안 빨개진다**. 부분합 걸음을 살리려는
        //    뜻을 지면 옆에 적어 두는 것이지, 무언가를 막고 있지는 않다.
        const i = intBetween(rng, 1, L - 1); // 마디 끝에서 끊으면 부분합 걸음이 없다
        const q = intBetween(rng, 2, 6); // $q=1$ 이면 지면에 `\times1` 이 난다
        const rest = P[i - 1]!;
        const n = q * L + i;
        const S = q * C + rest;

        // 🔴 ㉵ 지름길 — 비례 어림 세 값과 「합을 마디 길이로 나누기」를 **전부** 빗나가야
        //    한다. $S\cdot L/C$ 는 마디의 평균 숫자로 어림하는 길이고, 전수에서 **58%**
        //    가까이 맞는다(정찰 실측). 여기서 세 값을 다 막으므로 남는 것은 7.0% 다.
        const prop = (S * L) / C;
        if (
          Math.floor(prop) === n ||
          Math.round(prop) === n ||
          Math.ceil(prop) === n
        )
          return null;
        const perDigit = S / L;
        if (
          Math.floor(perDigit) === n ||
          Math.round(perDigit) === n ||
          Math.ceil(perDigit) === n
        )
          return null;

        // 굳힘 함수가 실제로 그 값을 내는지 — 여기서 재면 «도장»이므로 시험이 흔든다.
        if (digitsUsed(digits, S) !== n) return null;

        const block = digits.join("");
        const listed = P.slice(0, L - 1)
          .map((v) => `$${v}$`)
          .join(", ");
        return {
          content:
            `순환소수 $0.\\overline{${block}}$에 대하여 소수점 아래 첫째 자리부터 ` +
            `$n$번째 자리까지의 숫자의 합이 $${S}$일 때, 자연수 $n$의 값을 구하시오.`,
          answer: `$${n}$`,
          solution: [
            `순환소수 $0.\\overline{${block}}$의 순환마디는 $${block}$이고, 순환마디를 이루는 숫자의 합은 $${digits.join("+")}=${C}$이다.`,
            `소수점 아래 첫째 자리부터 차례로 더해 갈 때 순환마디를 한 번 지날 때마다 합은 $${C}$씩 커지므로, 합이 $${S}$${iGa(S)} 되는 자리는 순환마디를 몇 번 지났는지와 그 다음 마디에서 몇 자리를 더 갔는지로 정해진다.`,
            `$${S}$${eulReul(S)} $${C}$${euroRo(C)} 나누면 몫이 $${q}$이고 나머지가 $${rest}$이므로, 순환마디를 $${q}$번 지난 뒤 그 다음 마디의 앞에서부터 더한 합이 $${rest}$${iGa(rest)} 되는 자리까지 더한 것이다.`,
            `순환마디 $${block}$의 앞에서부터 더한 합은 차례로 ${listed}이고, 각 자리의 숫자가 모두 $1$ 이상이므로 이 합은 자리가 뒤로 갈수록 커진다. 그러므로 합이 $${rest}$${iGa(rest)} 되는 자리는 ${ORDINAL[i - 1]} 자리 하나뿐이다.`,
            `순환마디를 $${q}$번 지나면 소수점 아래 $${q * L}$번째 자리까지이고, 거기에서 $${i}$자리를 더 가야 한다.`,
            `따라서 $n=${L}\\times${q}+${i}=${n}$이다.`,
            `실제로 첫째 자리부터 $${n}$번째 자리까지의 숫자의 합은 $${C}\\times${q}+${rest}=${S}$이다.`,
          ].join("\n"),
          facts: {
            x: n,
            sum: S,
            cycle: C,
            len: L,
            times: q,
            pos: i,
            rest,
            block: Number(block),
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 37W  둘씩 짝지어 일한 날수 셋으로 세 사람의 하루 일의 양  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * **굳힘 함수** — 세 식을 **변끼리 더해** $a+b+c$ 를 얻는다.
 *
 * $a+b=\dfrac1p$, $b+c=\dfrac1q$, $c+a=\dfrac1r$ 를 더하면 $2(a+b+c)$ 이므로
 * 답은 세 단위분수의 합의 **절반**이다.
 *
 * 🔴 **굳힘의 인자는 `halve` 다.** 「변끼리 더하면 좌변이 $2(a+b+c)$ 가 된다」는
 * 걸음을 빠뜨리고 그냥 세 분수를 더하면 답이 **두 배**가 된다 — 학생이 가장 흔히
 * 하는 실수이고, 이 유형이 재려는 바로 그 마디다. (`halve=false` 는 제품이 안 쓰는
 * 길이다. 시험이 흔들어 잰다.)
 *
 * 세 사람의 몫이 모두 양수가 아니면 그런 상황이 없으므로 `null`.
 */
export function combinedDaily(
  p: number,
  q: number,
  r: number,
  halve = true,
): [number, number] | null {
  if (p < 1 || q < 1 || r < 1) return null;
  const M = lcm(lcm(p, q), r);
  const sumNum = M / p + M / q + M / r;
  const [tn, td] = reduceFraction(sumNum, halve ? 2 * M : M);
  // 각자의 몫 가운데 **가장 작은 것**은 날수가 가장 짧은 짝의 나머지다
  // ($c=T-\frac1p$ 에서 $\frac1p$ 가 가장 크다). 그것이 양수면 셋 다 양수다.
  const minPair = Math.min(p, q, r);
  // 🔴 **이 줄이 «각자 몫이 양수»를 실제로 지키는 곳이다** — 변이로 끄면 시험의
  //    `combinedDaily(2, 3, 6) === null` 눈금이 빨개진다(M18). 생성기 쪽 `cn <= 0` 은
  //    이 줄과 같은 집합을 물어 산출물을 하나도 안 바꾼다.
  if (tn * minPair <= td) return null; // $T\le\frac1{\min}$ 이면 한 사람이 음수다
  return [tn, td];
}

const PAIRWISE_WORK: TypeEntry[] = [
  def(
    MINOR_SYS_APPLY,
    "37W",
    "둘씩 짝지어 일한 날수에서 세 사람의 하루 일의 양",
    SEC.일속력,
    "심화중",
    (rng): Body =>
      attempt(6000, (): Body | null => {
        // ⚠️ **세 값을 따로 뽑아 정렬한다.** `q` 를 `[p+1,19]` 에서 뽑는 판은 작은 $p$
        //    쪽으로 크게 치우쳐, 전수 최빈이 2.6% 인데 **표본 최빈이 14.5%** 가 됐다
        //    (실측). 「전수로 잰 쏠림」과 「지면에 실제로 나오는 쏠림」은 다른 값이다.
        const a1 = intBetween(rng, 2, 20);
        const a2 = intBetween(rng, 2, 20);
        const a3 = intBetween(rng, 2, 20);
        if (a1 === a2 || a2 === a3 || a1 === a3) return null;
        const [p, q, r] = [a1, a2, a3].sort((x, y) => x - y) as [
          number,
          number,
          number,
        ];
        const M = lcm(lcm(p, q), r);
        if (M > 180) return null; // 안 묶으면 정답 분모가 12,920 까지 간다(⑺ 3)
        const sumNum = M / p + M / q + M / r;
        // ㉰ 통분 결과가 **기약**이라야 지면의 모든 분수가 기약이다.
        if (gcd(sumNum, M) !== 1) return null;
        const truth = combinedDaily(p, q, r);
        if (truth === null) return null; // 한 사람의 몫이 $0$ 이하다
        const [tn, td] = truth;
        const naive = combinedDaily(p, q, r, false);
        if (naive === null) return null;
        // ㉡ 반으로 나누는 걸음을 지우면 답이 달라져야 한다 (늘 참이지만 못 박는다).
        if (naive[0] === tn && naive[1] === td) return null;
        // 가장 짧은 짝($p$)의 나머지가 $\mathrm{C}$ 의 몫이다 — 셋 가운데 가장 작다.
        const [cn, cd] = reduceFraction(tn * p - td, td * p);
        // ⚠️ **이 줄과 `combinedDaily` 의 `tn * minPair <= td` 는 서로를 덮는 한 쌍이다** —
        //    혼자 지우면 산출물이 **한 글자도 안 바뀐다**(변이 M7·M18 이 둘 다
        //    「산출물 그대로」로 나왔다). 실제로 지키는 것은 굳힘 함수 쪽이고, 그것은
        //    시험의 `combinedDaily(2, 3, 6) === null` 눈금이 **빨갛게** 잰다(M18).
        //    이 줄은 「지면에 적히는 $c$ 가 양수여야 한다」를 그 자리에 못 박아 둘 뿐이다.
        if (cn <= 0) return null;

        return {
          content:
            `어떤 일을 $\\mathrm{A}$와 $\\mathrm{B}$가 함께 하면 $${p}$일, ` +
            `$\\mathrm{B}$와 $\\mathrm{C}$가 함께 하면 $${q}$일, ` +
            `$\\mathrm{C}$와 $\\mathrm{A}$가 함께 하면 $${r}$일 만에 끝낼 수 있다. ` +
            `세 사람이 함께 할 때 하루에 하는 일의 양을 구하시오. ` +
            `(단, 전체 일의 양을 $1$${euroRo(1)} 놓고, 세 사람이 각각 혼자 하면 ` +
            `며칠이 걸리는지는 구하지 않는다.)`,
          answer: `$\\dfrac{${tn}}{${td}}$`,
          solution: [
            `$\\mathrm{A}$, $\\mathrm{B}$, $\\mathrm{C}$가 하루에 하는 일의 양을 각각 $a$, $b$, $c$라 하자.`,
            `$\\mathrm{A}$와 $\\mathrm{B}$가 함께 하면 $${p}$일이 걸리므로 $a+b=\\dfrac{1}{${p}}$이고, 마찬가지로 $b+c=\\dfrac{1}{${q}}$, $c+a=\\dfrac{1}{${r}}$이다.`,
            `구하는 것은 $a+b+c$이다. 세 식을 변끼리 더하면 좌변은 $(a+b)+(b+c)+(c+a)=2(a+b+c)$가 되므로, $a$, $b$, $c$를 각각 구하지 않아도 된다.`,
            `우변은 $\\dfrac{1}{${p}}+\\dfrac{1}{${q}}+\\dfrac{1}{${r}}$이고 $${p}$, $${q}$, $${r}$의 최소공배수가 $${M}$이므로, 통분하면 $\\dfrac{${M / p}+${M / q}+${M / r}}{${M}}=\\dfrac{${sumNum}}{${M}}$이다.`,
            `그러므로 $2(a+b+c)=\\dfrac{${sumNum}}{${M}}$이고, $\\dfrac{${sumNum}}{${M}}$${eulReul(sumNum)} $2$${euroRo(2)} 나누면 $a+b+c=\\dfrac{${tn}}{${td}}$이다.`,
            `따라서 세 사람이 함께 할 때 하루에 하는 일의 양은 $\\dfrac{${tn}}{${td}}$이다.`,
            `이때 $a+b+c=\\dfrac{${tn}}{${td}}$에서 $a+b=\\dfrac{1}{${p}}$${eulReul(1)} 빼면 $c=\\dfrac{${cn}}{${cd}}$이고, 이 값이 양수이므로 $\\mathrm{C}$도 하루에 일을 한다.`,
          ].join("\n"),
          facts: {
            x: tn,
            den: td,
            p,
            q,
            r,
            lcm: M,
            sumNum,
            naiveNum: naive[0],
            naiveDen: naive[1],
            cNum: cn,
            cDen: cd,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 38W  배송료가 다른 세 가게 가운데 «가운데 가게»가 이기는 개수  (심화상)
// ═══════════════════════════════════════════════════════════

/**
 * 세 가게에서 $x$ 개를 살 때 `who` 번째 가게가 **혼자 가장 싼** 자연수 $x$ 전부.
 *
 * 🔴 **굳힘이 없다 — 후보를 다 세워 견주어야 한다**(심화상). 그래서 인자로 둔 것은
 * 굳힘이 아니라 **«몇 쌍을 견주는가»** 다(`rivals`). 한 쌍만 견주면 창이 한쪽으로
 * 열려 개수가 달라진다 — 시험이 그것을 흔들어 잰다.
 */
export function winningCounts(
  shops: ReadonlyArray<readonly [number, number]>,
  who: number,
  limit: number,
  rivals?: readonly number[],
): number[] {
  const foes =
    rivals ?? shops.map((_s, i) => i).filter((i): i is number => i !== who);
  const out: number[] = [];
  const cost = (i: number, x: number): number =>
    shops[i]![0] * x + shops[i]![1];
  for (let x = 1; x <= limit; x += 1) {
    if (foes.every((f) => cost(who, x) < cost(f, x))) out.push(x);
  }
  return out;
}

/**
 * 소재 — 낱말 뒤 조사는 **붙여 적지 않고** `objectParticle` 이 계산한다(계약 ⑹.7).
 */
const GOODS: ReadonlyArray<{ name: string; unit: string }> = [
  { name: "공책", unit: "권" },
  { name: "볼펜", unit: "자루" },
  { name: "손수건", unit: "장" },
  { name: "머그컵", unit: "개" },
];

const LABELS = ["A", "B", "C"] as const;

/** 세 자리에 역할(가장 비싸고 배송료 없음 / 가운데 / 가장 싸고 배송료 비쌈)을 섞어 넣는다. */
const ROLE_ORDERS: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

const THREE_SHOP_WINDOW: TypeEntry[] = [
  def(
    MINOR_INEQ_APPLY,
    "38W",
    "배송료가 다른 세 가게 가운데 어디가 가장 싼가",
    SEC.개수예금,
    "심화상",
    (rng): Body =>
      attempt(6000, (): Body | null => {
        // 역할: L = 단가가 가장 비싸고 배송료가 없다 · W = 가운데 · H = 단가가 가장 싸다
        // ⚠️ 세 값을 따로 뽑아 정렬한다 — 자리마다 다른 범위에서 뽑으면 쏠린다(`37W` 참조).
        const q1 = intBetween(rng, 6, 20);
        const q2 = intBetween(rng, 6, 20);
        const q3 = intBetween(rng, 6, 20);
        if (q1 === q2 || q2 === q3 || q1 === q3) return null;
        const [pH, pW, pL] = [q1, q2, q3]
          .sort((x, y) => x - y)
          .map((v) => v * 100) as [number, number, number];
        const t1 = intBetween(rng, 2, 16) * 500;
        const t2 = intBetween(rng, 2, 16) * 500;
        if (t1 === t2) return null;
        const sW = Math.min(t1, t2);
        const sH = Math.max(t1, t2);

        const dLW = pL - pW;
        const dWH = pW - pH;
        const dLH = pL - pH;
        // ⓐ 어느 개수에서도 **동점이 없다** — 경계가 정수면 「가장 싼 곳」이 둘이 된다.
        if (sW % dLW === 0) return null;
        if ((sH - sW) % dWH === 0) return null;
        if (sH % dLH === 0) return null;

        const lo = Math.floor(sW / dLW) + 1;
        const hi = Math.ceil((sH - sW) / dWH) - 1;
        // 아래끝이 $1$ 이면 아래 조건이 아무것도 안 자른다 — 창이 한쪽만 닫힌 셈이다.
        if (lo < 2) return null;
        const size = hi - lo + 1;
        if (size < 2 || size > 25) return null;

        const roles: [number, number][] = [
          [pL, 0],
          [pW, sW],
          [pH, sH],
        ];
        const order = pick(rng, ROLE_ORDERS);
        // `shops[label]` — 자리 `k` 에 역할 `order[k]` 를 놓는다.
        const shops: [number, number][] = [
          roles[order[0]]!,
          roles[order[1]]!,
          roles[order[2]]!,
        ];
        const idxOfRole = [0, 1, 2].map((role) => order.indexOf(role));
        const iL = idxOfRole[0]!;
        const iW = idxOfRole[1]!;
        const iH = idxOfRole[2]!;

        // ⓑ 창이 **양쪽에서 닫히는지** 실제로 세어 확인한다(계산으로만 믿지 않는다).
        const won = winningCounts(shops, iW, hi + 6);
        if (won.length !== size) return null;
        if (won[0] !== lo || won[size - 1] !== hi) return null;

        // 🔴 ㉵ 지름길 — 발문에 적히는 다섯 수의 한두 번 연산이 답과 같으면 버린다.
        //    답이 $2$~$25$ 인 작은 수라 우연히 맞는 일이 잦다(전수 52.3%, 정찰 실측).
        const printed = [pL, pW, pH, sW, sH];
        const guesses = new Set<number>();
        for (const a of printed) {
          guesses.add(a / 100);
          guesses.add(a / 1000);
        }
        for (const a of printed)
          for (const b of printed) {
            if (a === b) continue;
            guesses.add(Math.abs(a - b));
            guesses.add(Math.abs(a - b) / 100);
            guesses.add(Math.abs(a - b) / 1000);
            guesses.add(Math.round(a / b));
            guesses.add(Math.floor(a / b));
            guesses.add(Math.ceil(a / b));
            guesses.add(Math.round(a / b / 100));
          }
        if (guesses.has(size)) return null;

        const g = pick(rng, GOODS);
        const objName = objectParticle(g.name);
        const objUnit = objectParticle(g.unit);
        const nameOf = (i: number): string => `$\\mathrm{${LABELS[i]}}$`;
        const priceLine = [0, 1, 2]
          .map((i) => `${nameOf(i)}가 $${shops[i]![0]}$원`)
          .join(", ");
        const shipLine = [0, 1, 2]
          .map((i, k) => {
            const body =
              shops[i]![1] === 0
                ? "배송료가 없"
                : `배송료가 $${shops[i]![1]}$원이`;
            return `${nameOf(i)}는 ${body}${k === 2 ? "다" : "고"}`;
          })
          .join(", ");
        const money = (i: number): string =>
          shops[i]![1] === 0
            ? `$${shops[i]![0]}x$원`
            : `$(${shops[i]![0]}x+${shops[i]![1]})$원`;
        const [ln, ld] = reduceFraction(sW, dLW);
        const [un, ud] = reduceFraction(sH - sW, dWH);
        const listed =
          size <= 8
            ? `$${Array.from({ length: size }, (_v, k) => lo + k).join("$, $")}$`
            : `$${lo}$부터 $${hi}$까지의 자연수`;
        const below = lo - 1;
        const above = hi + 1;
        const cost = (i: number, x: number): number =>
          shops[i]![0] * x + shops[i]![1];

        return {
          content:
            `세 인터넷 가게 $\\mathrm{A}$, $\\mathrm{B}$, $\\mathrm{C}$에서 파는 ${g.name} ` +
            `한 ${g.unit}의 값은 ${priceLine}이다. ${shipLine}. ` +
            `배송료는 몇 ${g.unit}${objUnit} 사든 한 번만 낸다. ` +
            `이 ${g.name}${objName} $x$${g.unit} 살 때 ${nameOf(iW)}에서 사는 것이 ` +
            `가장 싸게 되는 자연수 $x$는 모두 몇 개인지 구하시오.`,
          answer: `$${size}$개`,
          solution: [
            `${g.name}${objName} $x$${g.unit} 살 때 드는 돈은 ${nameOf(0)}가 ${money(0)}, ${nameOf(1)}가 ${money(1)}, ${nameOf(2)}가 ${money(2)}이다.`,
            `${nameOf(iW)}에서 사는 것이 가장 싸려면 ${nameOf(iL)}에서 살 때보다도 싸고 ${nameOf(iH)}에서 살 때보다도 싸야 한다. 어느 가게가 싼지는 $x$에 따라 달라지므로 두 조건을 각각 부등식으로 세워 함께 만족시키는 $x$를 찾아야 한다.`,
            `${nameOf(iW)}가 ${nameOf(iL)}보다 싸려면 $${pW}x+${sW}<${pL}x$이므로 $${dLW}x>${sW}$이다. $${sW}$${eulReul(sW)} $${dLW}$${euroRo(dLW)} 나누면 $\\dfrac{${ln}}{${ld}}$이므로 $x>\\dfrac{${ln}}{${ld}}$이고, $x$는 자연수이므로 $x\\ge${lo}$이다.`,
            `${nameOf(iW)}가 ${nameOf(iH)}보다 싸려면 $${pW}x+${sW}<${pH}x+${sH}$이므로 $${dWH}x<${sH - sW}$이다. $${sH - sW}$${eulReul(sH - sW)} $${dWH}$${euroRo(dWH)} 나누면 $\\dfrac{${un}}{${ud}}$이므로 $x<\\dfrac{${un}}{${ud}}$이고, $x$는 자연수이므로 $x\\le${hi}$이다.`,
            `두 조건을 함께 만족시키는 자연수 $x$는 ${listed}이므로 그 개수는 $${hi}-${lo}+1=${size}$이다.`,
            `$x=${below}$일 때는 ${nameOf(iW)}에서 드는 돈이 $${cost(iW, below)}$원, ${nameOf(iL)}에서 드는 돈이 $${cost(iL, below)}$원이므로 ${nameOf(iW)}가 가장 싸지 않고, $x=${above}$일 때는 ${nameOf(iW)}에서 드는 돈이 $${cost(iW, above)}$원, ${nameOf(iH)}에서 드는 돈이 $${cost(iH, above)}$원이므로 역시 가장 싸지 않다.`,
            `따라서 ${nameOf(iW)}에서 사는 것이 가장 싸게 되는 자연수 $x$는 모두 $${size}$개이다.`,
          ].join("\n"),
          facts: {
            x: size,
            lo,
            hi,
            ask: iW,
            cheapIdx: iH,
            freeIdx: iL,
            p0: shops[0]![0],
            p1: shops[1]![0],
            p2: shops[2]![0],
            s0: shops[0]![1],
            s1: shops[1]![1],
            s2: shops[2]![1],
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 39W  x절편이 자연수가 되는 정수 a 를 모두 찾아 절편의 합 구하기  (심화상)
// ═══════════════════════════════════════════════════════════

/** $b$ 의 약수 — 작은 것부터. */
export function divisorsOf(b: number): number[] {
  const out: number[] = [];
  for (let d = 1; d * d <= b; d += 1) {
    if (b % d !== 0) continue;
    out.push(d);
    if (d !== b / d) out.push(b / d);
  }
  return out.sort((x, y) => x - y);
}

/**
 * $y=ax+b$(또는 $y=ax-b$)의 $x$절편이 **자연수**가 되게 하는 정수 $a$ 마다의 $x$절편을
 * 지면에 적는 차례(큰 것부터)로 낸다.
 *
 * 🔴 **굳지 않는다 — 후보가 여럿 살아남는다**(심화상). 그래서 인자로 둔 것은
 * 굳힘이 아니라 **«자연수 조건을 정수로 늦추면»** 이다(`natural=false`). 그러면
 * 부호가 반대인 $a$ 까지 살아나 절편이 $\pm$ 로 짝을 이루고 **합이 $0$** 이 된다 —
 * 「$a$ 의 부호를 왜 가리는가」가 장식이 아님을 시험이 흔들어 잰다.
 */
export function naturalIntercepts(b: number, natural = true): number[] {
  const divs = divisorsOf(b);
  const pos = divs.map((d) => b / d).sort((x, y) => y - x);
  if (natural) return pos;
  return [...pos, ...pos.map((v) => -v)];
}

const INTERCEPT_DIVISOR_SUM: TypeEntry[] = [
  def(
    MINOR_FUNC1,
    "39W",
    "x절편이 자연수가 되는 정수 a 를 모두 찾아 절편의 합 구하기",
    SEC.절편,
    "심화상",
    (rng): Body =>
      attempt(4000, (): Body | null => {
        const b = intBetween(rng, 12, 400);
        const divs = divisorsOf(b);
        // 약수가 셋 이하면 「다 세워 견준다」가 성립하지 않고, 아홉 이상이면 나열이 길다.
        if (divs.length < 4 || divs.length > 8) return null;
        const values = naturalIntercepts(b);
        const total = values.reduce((s, v) => s + v, 0);

        // ㉵ 지름길 — 발문에 적히는 수는 $b$ 하나뿐이다. 한두 번 연산으로 답이 나오면 버린다.
        const guesses = new Set<number>([
          b,
          2 * b,
          3 * b,
          b / 2,
          1.5 * b,
          b + 1,
          b - 1,
          b * b,
          divs.length * b,
          total - b,
        ]);
        for (const d of divs) {
          guesses.add(b / d);
          guesses.add(b * d);
          guesses.add(b + d);
          guesses.add(b - d);
        }
        if (guesses.has(total)) return null;

        // ㉡ 자연수 조건을 늦추면 합이 $0$ 이 되어 답이 달라진다(늘 참이지만 못 박는다).
        const loose = naturalIntercepts(b, false).reduce((s, v) => s + v, 0);
        if (loose === total) return null;

        // 「약수가 아니면 왜 죽는가」를 보일 증인 — 분수가 **기약**이라야 ㉰ 를 지킨다.
        let witness = 0;
        for (let d = 2; d <= b; d += 1) {
          if (b % d === 0) continue;
          if (gcd(b, d) !== 1) continue;
          witness = d;
          break;
        }
        if (witness === 0) return null;

        const plus = intBetween(rng, 0, 1) === 1;
        const sym = plus ? "-a" : "a";
        const graph = plus ? `y=ax+${b}` : `y=ax-${b}`;
        const zeroLine = plus
          ? `$${graph}$에 $y=0$${eulReul(0)} 대입하면 $ax+${b}=0$이므로 $x$절편은 $x=-\\dfrac{${b}}{a}$이다.`
          : `$${graph}$에 $y=0$${eulReul(0)} 대입하면 $ax-${b}=0$이므로 $x$절편은 $x=\\dfrac{${b}}{a}$이다.`;
        const signLine = plus
          ? `$a>0$이면 $-\\dfrac{${b}}{a}<0$이므로 $x$절편이 자연수가 될 수 없다. 그러므로 $a$는 음의 정수이고, 이때 $-a$는 자연수이다.`
          : `$a<0$이면 $\\dfrac{${b}}{a}<0$이므로 $x$절편이 자연수가 될 수 없다. 그러므로 $a$는 양의 정수이다.`;
        const fracLine = plus
          ? `$x$절편은 $-\\dfrac{${b}}{a}=\\dfrac{${b}}{-a}$이므로, 이것이 자연수가 되려면 $-a$가 $${b}$의 약수여야 한다.`
          : `$x$절편은 $\\dfrac{${b}}{a}$이므로, 이것이 자연수가 되려면 $a$가 $${b}$의 약수여야 한다.`;
        const witnessLine = plus
          ? `$-a$가 $${b}$의 약수가 아니면 $x$절편이 자연수가 되지 않는다. 이를테면 $-a=${witness}$, 곧 $a=-${witness}$일 때 $${b}$${eulReul(b)} $${witness}$${euroRo(witness)} 나누면 나누어떨어지지 않으므로 $x$절편 $\\dfrac{${b}}{${witness}}$${eunNeun(b)} 자연수가 아니다.`
          : `$a$가 $${b}$의 약수가 아니면 $x$절편이 자연수가 되지 않는다. 이를테면 $a=${witness}$일 때 $${b}$${eulReul(b)} $${witness}$${euroRo(witness)} 나누면 나누어떨어지지 않으므로 $x$절편 $\\dfrac{${b}}{${witness}}$${eunNeun(b)} 자연수가 아니다.`;
        const divList = divs.map((d) => `$${d}$`).join(", ");
        const valList = values.map((v) => `$${v}$`).join(", ");

        return {
          content:
            `일차함수 $${graph}$의 그래프의 $x$절편이 자연수가 되도록 하는 정수 $a$가 ` +
            `여러 개 있다. 이때 $x$절편이 될 수 있는 모든 값의 합을 구하시오.`,
          answer: `$${total}$`,
          solution: [
            zeroLine,
            signLine,
            fracLine,
            `$${b}$의 약수는 ${divList}의 $${divs.length}$개이므로 $${sym}$가 될 수 있는 값도 이 $${divs.length}$개이다.`,
            `$${sym}$가 차례로 ${divList}일 때 $x$절편은 차례로 ${valList}이다.`,
            `따라서 $x$절편이 될 수 있는 모든 값의 합은 $${values.join("+")}=${total}$이다.`,
            witnessLine,
          ].join("\n"),
          facts: {
            x: total,
            b,
            plus: plus ? 1 : 0,
            count: divs.length,
            witness,
            loose,
          },
          figureSpec: null,
        };
      }),
  ),
];

/**
 * 중2 확대 갈래 4차 물결 명부 — `generate.ts` 의 `ALL` 이 이것 하나만 spread 한다
 * (그 한 줄은 **리드가** 넣는다).
 *
 * 갈래별 몫: **심화중 2 · 심화상 2**. 수를 목표로 잡지 않았다 — 세울 수 있는
 * 자리에만 세웠다(D-115 ⑹ 「비우는 단위는 학년이 아니라 소단원」).
 */
export const M2_TOP_4: TypeEntry[] = [
  ...CYCLE_SUM_TO_INDEX,
  ...PAIRWISE_WORK,
  ...THREE_SHOP_WINDOW,
  ...INTERCEPT_DIVISOR_SUM,
];
