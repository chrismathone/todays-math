/**
 * 중2 **확대 갈래 5차 물결**(`심화중`·`심화상`) — D-116, 접미사 **`X`**, 갈래 `m2Top5c`.
 *
 * ## ⑴ 왜 새 파일인가
 *
 * 4차(`m2Top4.ts`) 머리말과 같은 까닭이다 — 남의 모듈을 잠그는 개수 검사를 무르지
 * 않으려고, 그리고 오르카 다중 세션(이번 물결은 **21갈래가 동시에** 돈다)이 같은
 * 파일에서 부딪히지 않으려고 **새 파일 하나 + `generate.ts` spread 한 줄**로 붙인다.
 * 그 한 줄은 **리드가** 넣는다 — 이 파일은 `generate.ts` 를 건드리지 않는다.
 *
 * ## ⑵ 유형마다 — 안 굳는 마디 / 무엇이 굳히나 / 같은 소단원과 무엇이 다른가
 *
 * | 키 | 갈래 | 안 굳는 마디 | 무엇이 굳히나 | 아래 갈래와 다른 축 |
 * |---|---|---|---|---|
 * | `피타고라스 정리\|109X` | **심화상** | 「어느 세 막대가 직각삼각형을 이루는가」 그 자체 — 다섯 막대에서 셋을 고르는 방법이 **열 가지**이고 어느 것이 살아남는지는 계산 전에 안 정해진다 | 굳지 않는다. 열 짝의 제곱의 합을 **전부** 만들어 남은 막대의 제곱과 맞대야 하고, **둘 이상이 살아남아 전부 답에 들어간다**. 게다가 「가장 긴 변을 빗변으로」를 안 지키면 짝이 통째로 어긋난다 | 이 소단원의 천장은 **심화하**다. 심화하 `11`·`12` 는 성질을 **발문이 알려 주고** 값을 한 번 대입하면 끝나며, `14`·`15`·`16` 도 쓸 규칙이 하나로 정해져 있다. `109X` 는 쓸 규칙(피타고라스 정리의 역)은 뻔한데 **어디에 쓸지가 안 정해져** 열 번을 견준다 |
 * | `도형의 닮음\|110X` | **심화중** | 처음 뿔의 **크기**(높이·밑넓이·부피) — 발문이 하나도 안 준다. 그래서 「각 조각의 부피를 어떻게 구하나」가 안 굳는 것처럼 보인다 | 이 소단원의 개념 **「닮은 두 입체도형의 부피의 비는 닮음비의 세제곱의 비」** 하나. 처음 뿔의 부피를 $n^3$ 이라 **놓기만 하면** 조각의 부피가 $k^3-(k-1)^3$ 으로 전부 정해진다 — 실제 부피는 한 번도 안 구한다 | 심화하 `08` 은 겉넓이·부피의 비를 **한 번** 쓰고 값을 대입한다. `110X` 는 비를 쓴 뒤 **조각으로 쪼개는 뺄셈**이 한 겹 더 있고, 무엇보다 **주어진 것이 조각 하나뿐**이라 전체를 거치지 않고 조각끼리 견주는 걸음이 필요하다. 기본 `05`·`07`(평면 넓이비)과는 차원이 다르다 |
 * | `일차부등식의 활용\|111X` | **심화상** | 「어느 수가 조건에 맞는가」 — 자리를 바꾼 수의 조건이 후보를 **여섯 개**로 좁혀 줄 뿐, 그중 무엇이 살아남는지는 부등식 둘을 **다 풀어 후보마다 견주기 전에는** 안 정해진다 | 굳지 않는다. 창의 아래끝과 위끝이 **서로 다른 부등식**에서 나오고, 살아남는 수가 **여럿**이며 **전부 답에 들어간다**(합) | 심화하 `09`·`35`(원가·정가)는 미지수가 하나이고 부등식 하나를 풀면 **한쪽 끝 값**이 답이다. 응용 `31`·`32`(평균)도 마찬가지다. `111X` 는 답이 «끝 값»이 아니라 **살아남은 후보들의 합**이고, 「버리는 후보가 왜 죽는지」가 두 방향으로 나뉜다 |
 * | `일차함수와 그 그래프  ⑵\|112X` | **심화중** | 상수 $a$, $b$ 의 **값** — 발문은 절댓값만 주므로 후보가 넷($\pm p$, $\pm q$)이고 그래프도 무수히 많다 | 이 소단원의 개념 **「$a$ 는 기울기, $b$ 는 $y$절편이고 그 부호가 그래프가 지나는 사분면을 정한다」** 하나. 지나는 세 사분면이 부호 한 쌍을 **유일하게** 정하므로 값이 굳고 절편이 정해진다 | 심화하 `80`(평행이동 일치)은 식끼리 계수를 맞추는 대수 문제이고, `m2Line` 의 심화하 `02` 는 **그림이 주어져** 부호를 읽는다. `112X` 는 그림도 값도 없이 **사분면 이름만으로** 부호를 세우고, 거기서 다시 두 절편을 계산해 더한다 |
 *
 * ## ⑶ 🔴 앞 물결들이 **실제로 새어 나간 자리** — 여기서 어떻게 막았나
 *
 * 전부 「값은 맞고 KaTeX 도 초록」이라 값 검산·냄새 자가 구조적으로 못 보던 부류다.
 *
 * ㉮ **해설이 정답지 한 단을 넘었다**(3차 중1 `53V`, 1242px). → 넷 다 제품
 *    `estimateSolutionPx` 로 **800판**을 재어 **700px 아래**로 잠근다(시험 「해설 높이」).
 *    그렇다고 **걸음을 지우지 않는다**(D-116 ⑹) — `109X` 의 열 짝 나열은 지면에서
 *    가장 긴 줄이라 막대 길이의 상한을 **$60$** 으로 묶어 네 자리 수가 넘치지 않게 했다.
 *    ⚠️ 상한을 $45$ 로 내리면 조합이 $25$ 로 줄고 **최빈 정답이 $12.0\%$** 가 되어
 *    쏠림 문턱에 닿는다(실측). 지면 길이와 쏠림이 **서로 반대로 당기는** 자리다.
 * ㉯ **해설이 「자연수」 걸음을 건너뛰었다**(3차 중2 `38V`). → `111X` 의 두 경계 줄은
 *    **참 경계 분수**(`\dfrac{118}{3}`)와 「$x$는 자연수이므로」를 **반드시** 적는다.
 *    ⚠️ 우리 부등식은 **엄격 부등호**($>$·$<$)라 공용 훑개
 *    (`probe-middle-extending-tiers.boundStepFaults`)의 `\le`·`\ge` 꼴에 **안 걸린다** —
 *    그 자에게 `111X` 의 「정수 경계 걸음 0」은 «깨끗»이 아니라 **«잴 것이 없다»** 다.
 *    그래서 **엄격 부등호 판을 이 물결의 시험이 따로 들고 있다**(`strictBoundFault`).
 *    남의 파일을 안 고치는 대신 여기 적어 둔다.
 *    그리고 두 경계 분수가 **기약**이 되도록 $\gcd(C,m)=1$ 을 걸었다 — 안 걸면 ㉰ 가 깨진다.
 * ㉰ **해설이 기약이 아닌 분수를 찍었다**(3차 중1 `52V`). → 지면의 모든
 *    `\dfrac{수}{수}` 가 기약이고 분모가 $1$ 이 아니다. `112X` 의 통분 줄은 분자를
 *    **`\dfrac{-5+15}{3}` 처럼 합의 꼴**로 적는다 — 그렇게 하지 않으면 통분 결과
 *    $\dfrac{15}{3}$ 이 지면에 나가는데 그것은 기약이 아니다(실제로 첫 판이 그랬다).
 *    `110X` 는 분수를 아예 안 쓴다(그 «0» 은 «못 셈»이 아니라 «잴 것이 없다» 다).
 * ㉱ **발문이 스스로 못 박은 상한을 오답이 넘었다**(4차 중2 `37W`, 51.7%).
 *    → 넷 다 「전체를 $1$로 놓고」류 상한을 **선언하지 않는다.** 공용
 *    `declaredUpperBound` 가 읽는 표현이 네 발문 어디에도 없다(시험이 800판 전량에서
 *    `null` 임을 잠근다). 그러므로 그 결함의 자리 자체가 없다.
 * ㉲ **정답이 «구간»이면 파생 오답이 뒤집힌다**(3차 중2 `35V`). → 넷 다 정답이
 *    **한 값**이다(`112X` 만 분수 하나). 구간 답이 없으므로 그 대가를 치르지 않는다.
 * ㉳ **해설의 «말»을 지키는 시험이 없었다**(4차, 중1 10줄·중2 3줄이 무방비).
 *    → 굳힘 개념과 마무리 논거를 진술하는 줄마다 시험이 **낱말을 읽고**, 그 낱말을
 *    뒤집으면 빨개지는 눈금을 같이 뒀다(`middleM2Top5c.test.ts` ⑹).
 *    `109X` 의 「가장 긴 변을 빗변으로」, `110X` 의 「세제곱의 비」, `111X` 의
 *    「자연수이므로」, `112X` 의 「기울기」·「$y$절편」이 그 자리다.
 * ㉴ **지면이 자기가 한 줄 앞에 세운 제약을 스스로 어긴다**(4차 중3 `55W`, 100%).
 *    → `111X` 는 「$a$와 $b$는 모두 $1$ 이상 $9$ 이하의 자연수」를 선언한 **뒤**
 *    후보 목록을 만든다. 그 목록의 모든 수가 그 제약 안에 있는지 시험이 전량 확인한다.
 *    `112X` 는 부호를 선언한 뒤 그 부호를 어기는 값을 한 번도 안 쓴다(시험이 확인).
 * ㉵ **자료를 정렬해 찍으면 «보이는 자리»가 순위를 암시한다**(4차 중1 `63W`, 100%).
 *    → `109X` 의 다섯 막대는 **발문에서 섞어** 찍는다. 셈은 정렬된 값으로 하되,
 *    해설이 「작은 것부터 늘어놓으면」이라는 걸음을 **스스로 적는다.**
 *    ⚠️ 섞기는 발문의 **길이 다섯**에만 건다 — 해설의 열 짝 나열까지 섞으면
 *    「빠짐없이 다 보았다」가 지면에서 안 읽힌다.
 * ㉶ **D-20 손실 원장은 «재현 가능»해야 한다**(4차 중1 `62W`). → ⑷ 에 **전수로 센**
 *    값을 적고, 시험이 「가드 **하나만** 껐을 때」를 전수로 다시 세어 그 표를 잠근다.
 * ㉷ **내보낸 순수 함수의 주석이 코드와 어긋나면 안 된다**(4차 중3 `solveBoxCases`).
 *    → 아래 굳힘 함수 넷의 단언은 전부 시험이 **눈금으로** 문다(양성·음성 둘 다).
 * ㉸ 우리말 — 「그중」은 **붙여 쓴다**. 수 뒤 조사는 지면에 **찍히는 글자**로 정하고
 *    (`m2Josa` 한 곳), 「(으)로」는 **ㄹ 받침**으로 갈린다(`euroRo`).
 *
 * ## ⑷ 🔴 손실 원장 (D-20 · ㉶) — 어림하지 않고 **전수로 센 값**
 *
 * ⚠️ 「가드 **하나만** 껐을 때」를 전수로 세었고, 시험(「D-20 손실 원장이 재현된다」)이 이 표를
 * 그대로 다시 세어 잠근다. **판 수와 답 수의 측정점을 같은 자리**로 맞췄다 —
 * 아래 「조합」은 전부 **매개변수 조합의 수**이고, 「정답 가짓수·최빈」은 그 조합
 * 전수에 대한 값이다(씨앗 표본이 아니다).
 *
 * | 유형 | 지름길 가드를 껐을 때 | 제품(가드를 켰을 때) | 정답 가짓수 | 최빈 정답 |
 * |---|---|---|---|---|
 * | `109X` | 두 세쌍이 값 하나를 공유하는 다섯쌍 **56** | **46** (82.1%) | 46 → **36** | 5.36% → **6.52%** |
 * | `110X`* | $(n,i,j,t)$ **566** | **344** (60.8%) | 81 → **69** | 2.65% → **3.20%** |
 * | `111X` | $(\text{창},m,C_1,C_2)$ **1,006,322** | **421,735** (41.9%) | 57 → **56** | 3.23% → **3.54%** |
 * | `112X` | $(\text{부호},p,q)$ **280** | **266** (95.0%) | 242 → **232** | 0.71% → **0.75%** |
 *
 * `111X` 는 가드가 둘이라 한 겹 더 적는다 — **기약 가드**($\gcd(C,m)=1$, ㉯·㉰)만
 * 켜면 $1{,}006{,}322\to487{,}630$ 이고 정답 가짓수는 **57 그대로**다(경계 분수가
 * 약분되는 판은 답이 같고 지면만 나쁘다). 거기에 지름길 가드를 더해 **421,735** 다.
 *
 * 🔴 **`109X` 는 잃은 열 조합이 전부 「지면 다섯 수의 한두 번 연산으로 넓이의 합이
 * 그대로 나오는」 자리**다(이를테면 $\{3,4,5,12,13\}$ 은 넓이의 합이 $36=3\times12$).
 * 남겨 두면 「막대 둘을 곱해 찍으면 맞는」 문항이 된다. 정답 가짓수가 $46\to36$ 으로
 * 줄고 **최빈이 $5.36\%\to6.52\%$ 로 나빠졌다** — 그 대가를 치르는 까닭은, 남겨 두면
 * 전수의 $17.9\%$ 가 「찍어서 맞는」 문항이기 때문이다. 그래도 $6.52\%$ 는 문턱
 * $12\%$ 에서 멀다.
 *
 * `112X` 가 잃은 14는 $\dfrac{q(p\pm1)}{p}$ 가 우연히 $\dfrac{q}{p}$·$q$·$p$ 따위와
 * 같아지는 자리다.
 *
 * 🔴 * **`110X` 의 잃음은 지름길이 아니라 «지면 품질» 때문이다.** 그 줄은
 * 「**첫째 조각을 쓰지 않는다**」이고, **눈으로 표본을 읽어서** 찾았다 —
 * 첫째 조각의 몫은 $1$ 이라 주어진 것이 첫째면 해설에 「$14$를 $1$로 나누면 $14$」라는
 * **아무 일도 안 하는 나눗셈**이, 묻는 것이 첫째면 마무리에 「$1\times18=18$」이라는
 * **장식 곱셈**이 남는다. 값도 KaTeX 도 멀쩡하고 어느 자도 안 울었다
 * (2026-08-24 「값이 맞으면 시험이 다 초록이다」의 그 자리).
 *
 * 그리고 그것을 빼자 **지름길 가드가 통째로 죽었다** — 첫째 조각을 쓸 때는 35조합이
 * 걸렸는데(답이 주어진 부피의 «$A_j$ 배»로 한 번에 나온다), 빼고 나면 **전수 344 중
 * 0건**이다. 답과 주어진 값의 비 $\frac{A_j}{A_i}$ 의 분자·분모가 늘 $\{7,19,37,61\}$
 * 이라 「$2,3,4,5,10$배」 어디에도 안 걸리기 때문이다. 그래서 그 줄을 **지웠다** —
 * 한 번도 못 무는 줄은 「축이 하나 더 있다」는 오해만 남긴다. 그 사실 자체(35 → 0)를
 * 시험이 센다.
 *
 * 🔴 그리고 **매개변수를 고르게 뽑는 것과 산출물이 고른 것은 다른 말이다.** `111X` 는
 * $t$ 와 두 자리를 각각 `intBetween` 으로 뽑았더니 후보가 넷뿐인 $t=5$ 의 창 하나가
 * 표본의 $10\%$ 를 먹어 **최빈이 $11.25\%$** 였다(문턱 코앞). 창 **62개**를 전수로
 * 만들어 고르게 뽑으니 씨앗 블록 넷에서 $2.75/4.38/3.75/3.38\%$ 다.
 *
 * ## ⑸ 🔴 실측 — 씨앗 블록 넷($20260905$·$900000$·$123456$·$5550000$) × 800판
 *
 * | 유형 | 최빈 정답 (블록 넷) | 해설 최대 px | 서로 다른 정답 | 변형 폭(하한) |
 * |---|---|---|---|---|
 * | `109X` | $6.88/5.88/7.25/7.50\%$ | **501.6** | 36 | 20 이상 (**5**) |
 * | `110X` | $4.88/4.50/3.25/3.25\%$ | **440.1** | 68~69 | 20 이상 (**11**) |
 * | `111X` | $2.75/4.38/3.75/3.38\%$ | **412.5** | 56 | 20 이상 (**12**) |
 * | `112X` | $1.25/1.38/1.63/1.38\%$ | **402.7** | 220~226 | 20 이상 (**12**) |
 *
 * ⚠️ `109X` 의 **서로 다른 해설은 46**이다(발문은 섞기 때문에 750쯤 된다). 조합이
 * 46가지뿐이라 그것이 이 유형의 진짜 변형 폭이다 — 적재가 요구하는 12벌은 넉넉히
 * 넘지만, 한 시험지에 이 유형을 여러 개 실으면 같은 다섯쌍이 되풀이될 수 있다.
 *
 * ## ⑹ 🔴 변이 시험 — **망가뜨려 봐야 가드인 줄 안다**
 *
 * 회차마다 **음성 대조**(변이 없이 초록)를 먼저 확인하고, ⑴ 파일이 바뀌었나
 * ⑵ **산출물 지문이 바뀌었나** ⑶ 그제서야 시험이 빨개지나 를 차례로 물었다.
 * 빨간데 **실패한 시험 이름을 못 대면** 판정을 거부한다.
 *
 * **변이 20개 전부 빨강(20/20).** 흔든 자리는 유형마다 다섯쯤이다 — 지름길 가드 ·
 * ㉵ 섞기 · 굳힘 축(빗변·세제곱의 비·두 부등식·$y$절편) · 경계의 기약 · 자연수 걸음 ·
 * 조사(받침·(으)로) · 통분 줄의 부호 · 창 전수 · 첫째 조각 제외 · 열 짝 나열.
 *
 * 그 과정에서 하네스가 두 번 판정을 **거부**했고, 두 번 다 **내 변이가 틀린 것**이었다:
 *
 * 1. 「`STICK_SETS` 안의 `rightTriangleTriples(L)` 를 `(L, false)` 로」 — 거기 `L` 은
 *    **이미 정렬**돼 있어 두 갈래가 같은 값을 낸다. 산출물이 한 글자도 안 바뀌어
 *    하네스가 멈췄다(그게 옳다). 흔드는 축 자체를 망가뜨리는 자리로 옮기니 빨강.
 * 2. 🔴 그리고 그때 **하네스의 지문이 좁다는 것**이 드러났다. 처음 지문은
 *    `handler` 산출물뿐이었는데, 굳힘 축(`hypotenuseIsLongest`·`cube`·`bounds`·
 *    `useIntercept`)은 **제품이 `true` 로만 쓰므로** 그 지문이 구조적으로 못 본다.
 *    지문에 **흔든 값**을 넣고서야 ⑵ 가 그 축을 잴 수 있게 됐다
 *    (2026-08-25 「⑶ 의 지문이 좁으면 «가드가 아니다»가 거짓이 된다」와 같은 자리).
 *
 * ## ⑺ 번호 규약 — **`X` 접미사**
 *
 * `extensionNumberReason` 이 「숫자+영문 대문자 한 글자」를 통과시킨다. `A`(색인 밖
 * 보강)·`T`(1차)·`U`(2차)·`V`(3차)·`W`(4차)가 쓰였으므로 5차는 **`X`** 다.
 * 번호대(`109`~`112`)는 리드가 21갈래에 나눠 준 구간 그대로다.
 *
 * ## ⑻ 계약 (이웃 모듈과 한 벌)
 *
 * 1. **정답을 먼저 뽑고 발문을 역산한다.**
 * 2. `facts` 로 정답 문자열을 **다시 지을 수 있다**(시험이 왕복으로 잠근다).
 *    `facts.x` 는 답의 **첫 수** — `109X` 는 넓이의 합, `110X` 는 부피,
 *    `111X` 는 수들의 합, `112X` 는 분자(음수면 음수).
 * 3. 숫자는 전부 `$...$` 안에 (`elementary/rules` `bareNumbers`).
 * 4. `attempt` 가 다 떨어지면 **던진다** — 조용히 기본값을 내지 않는다.
 * 5. 그림이 없으므로 발문이 **지면을 가리키지 않는다**(`pointsAtFigure`).
 * 6. 🔴 **해설이 걸음을 건너뛰지 않는다.** 후보를 견주는 갈래(`109X`·`111X`)는
 *    **죽는 후보가 왜 죽는지**까지 적는다.
 * 7. 🔴 **낱말 뒤 조사를 손 목록으로 적지 않는다.** 수 뒤 조사는 `m2Josa` 가
 *    한자 수사의 받침으로 계산한다(목록이 두 벌이 될 자리가 없다).
 *
 * ## ⑼ 지름길 자를 **두 벌로 두지 않는다**
 *
 * `pageShortcutValues`·`scaledValues` 는 4차 물결(`m1Top4.ts`)에서 **읽어만 온다**
 * (`m1Top5a.ts` 가 같은 이유로 같은 함수를 읽는다). 학년이 달라도 「지면의 수만으로
 * 만들 수 있는 뻔한 한 수」의 뜻은 같고, 규칙을 여기 옮겨 적으면 목록이 두 벌이 된다.
 *
 * ## ⑽ 🔴 정찰과 달라진 것 — 근거를 남긴다
 *
 * 1. `111X` 를 처음에는 「각 자리의 숫자의 합이 $s$인 두 자리 수」로 열었다.
 *    **정답이 네 가지뿐이었다**(최빈 25.1%). 합이 고정되면 모든 조건이 십의 자리
 *    숫자에 대해 **단조**라 살아남는 것이 늘 목록의 앞토막이고, 그 토막의 합이
 *    몇 가지 안 된다. 「자리를 바꾼 수와의 **차**」로 바꾸고 창을 **양쪽에서** 닫으니
 *    56가지가 됐다.
 * 2. `112X` 를 처음에는 「$y=bx+a$ 의 그래프가 지나지 않는 사분면」으로 열었다.
 *    **정답이 넷뿐**(제1~제4사분면)이라 최빈이 $25\%$ 를 밑돌 수 없다. 사분면으로
 *    부호를 세우는 굳힘은 그대로 두고 **묻는 것을 두 절편의 합**으로 바꿨다.
 * 3. `110X` 의 「$k$번째 조각」 차례는 우리말(`첫째`…`다섯째`)로 적는다. 아라비아
 *    숫자로 쓰면 지면에서 부피 값과 섞여 읽힌다(`elementary/rules` `arabicPolygons`
 *    가 도형 이름에 대해 못 박은 것과 같은 자리다).
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { attempt } from "./m1Shared";
// 지름길 자를 두 벌로 두지 않는다 — 4차 물결 것을 **읽어만** 온다(⑼).
import { pageShortcutValues, scaledValues } from "./m1Top4";
import { eulReul, euroRo, waGwa } from "./m2Josa";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";
const BOOK1 = "2-1";
const BOOK2 = "2-2";

/**
 * RPM 색인 정본(`scripts/rpm/rpm-type-catalog.json`)의 중단원 이름 — 글자 그대로.
 *
 * 🔴 `MINOR_FUNC2` 에는 **가는 공백 U+2009** 가 들어 있다(「그래프」 바로 뒤).
 *    보통 공백 두 개를 치면 눈으로는 같아 보이는데 **조용히 안 맞는다** — 그래서
 *    escape 로 적고, 시험이 색인 정본에 **대조**한다.
 */
const MINOR_PYTHA = "피타고라스 정리";
const MINOR_SIM = "도형의 닮음";
const MINOR_INEQ_APPLY = "일차부등식의 활용";
const MINOR_FUNC2 = "일차함수와 그 그래프\u2009 ⑵";

/**
 * 우리 `Unit.section` 정확한 이름 (`prisma/seed-data/units.ts` 실측).
 * 괄호 안의 쉼표·공백은 눈으로 못 가르므로 시험이 단원 정본과 **대조**한다.
 */
const SEC = {
  피타고라스활용: "피타고라스 정리의 활용",
  넓이부피비: "닮은 도형의 넓이의 비와 부피의 비",
  수평균정가: "일차부등식의 활용(수, 평균, 정가)",
  함수성질: "일차함수의 그래프의 성질",
} as const;

type Body = Pick<
  MidProblem,
  "content" | "answer" | "solution" | "facts" | "figureSpec"
>;

function def(
  book: string,
  rpmMinor: string,
  rpmType: string,
  rpmTitle: string,
  unitSection: string,
  difficulty: MidProblem["difficulty"],
  gen: (rng: Rng) => Body,
): TypeEntry {
  return {
    key: `${book}|${rpmMinor}|${rpmType}`,
    grade: GRADE,
    unitSection,
    rpmBook: book,
    rpmMinor,
    rpmType,
    rpmTitle,
    handler: (rng) => ({
      grade: GRADE,
      unitSection,
      rpmBook: book,
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

/** 주격 조사 — 받침 판정은 `m2Josa.eulReul` **한 곳**에서 온다(규칙을 두 벌로 안 둔다). */
function iGa(n: number): "이" | "가" {
  return eulReul(n) === "을" ? "이" : "가";
}

/** 보조사 — 받침 판정은 `m2Josa.eulReul` **한 곳**에서 온다(`iGa` 와 같은 까닭). */
function eunNeun(n: number): "은" | "는" {
  return eulReul(n) === "을" ? "은" : "는";
}

/** 목록을 `$1$, $2$, $3$` 꼴로. */
function listTex(xs: readonly number[]): string {
  return xs.map((v) => `$${v}$`).join(", ");
}

/**
 * 차례를 나타내는 우리말 — `110X` 의 조각은 최대 다섯째다.
 *
 * ⚠️ **`$3$번째` 라고 쓰면 안 된다.** 원장님 확정 「$8$각형이 아니라 팔각형」과 같은
 *    자리다 — 아라비아 숫자로 차례를 쓰면 지면에서 부피 값과 섞여 읽힌다(⑽ 3).
 */
const ORDINAL = ["첫째", "둘째", "셋째", "넷째", "다섯째"] as const;

/** 우리말 수관형사 — `110X` 의 「세 평면」·「네 개」, `111X` 의 「여섯 개」. */
const COUNT_WORD = [
  "",
  "한",
  "두",
  "세",
  "네",
  "다섯",
  "여섯",
  "일곱",
  "여덟",
] as const;

/** 우리말 수관형사 — 다루지 않는 수면 **던진다**(조용히 숫자를 지면에 내지 않는다). */
function countWord(n: number): string {
  const w = COUNT_WORD[n];
  if (w === undefined || w === "") {
    throw new Error(`countWord: 다루지 않는 수 ${n}`);
  }
  return w;
}

/**
 * 🔴 **한글 낱말의 받침을 «음절 코드»에서 계산한다** — 계약 ⑻.7.
 *
 * 소재 낱말마다 조사를 손으로 적어 두면 목록이 곧 두 벌이 되고, 그 목록은 값 검산이
 * 구조적으로 못 본다. 한글 음절은 `0xAC00` 부터 28개씩 묶여 있고, 그 안에서 자리가
 * $0$ 이면 받침이 없다.
 */
export function hasFinalConsonant(word: string): boolean {
  const c = word.charCodeAt(word.length - 1) - 0xac00;
  return c >= 0 && c < 11172 && c % 28 !== 0;
}

/** 낱말 뒤 목적격 조사 — 「원뿔을」·「사다리를」. */
export function objectParticle(word: string): "을" | "를" {
  return hasFinalConsonant(word) ? "을" : "를";
}

/** 낱말 뒤 접속 조사 — 「원뿔과」·「사다리와」. */
export function withParticle(word: string): "과" | "와" {
  return hasFinalConsonant(word) ? "과" : "와";
}

/** 결정적 셔플(Fisher–Yates) — 씨앗이 같으면 순서도 같다(㉵). */
function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const t = out[i]!;
    out[i] = out[j]!;
    out[j] = t;
  }
  return out;
}

/**
 * 🔴 **이 답이 「지면의 수를 한두 번 더하거나 곱하거나 나눈 값」인가.**
 *
 * `pageShortcutValues` 는 **수가 둘 이상**일 때만 일을 한다(짝을 만들어 사칙연산을
 * 돌린다). 지면에 수가 하나뿐인 판에서는 그 자가 **구조적으로 0**이므로, 수 하나마다
 * `scaledValues` 로 「작은 수를 곱하거나 나눈 값」을 따로 세어 함께 막는다.
 * 두 자 다 4차 물결(`m1Top4.ts`)에서 **읽어만** 온다 — 규칙을 두 벌로 두지 않는다(⑼).
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
// 109X  막대 다섯 개에서 셋을 골라 만드는 직각삼각형들의 넓이의 합  (심화상)
// ═══════════════════════════════════════════════════════════

/**
 * **굳힘이 없다 — 후보를 다 세워 견주어야 한다**(심화상). 그래서 인자로 둔 것은
 * 굳힘이 아니라 **«무엇을 빗변으로 잡는가»** 다(`hypotenuseIsLongest`).
 *
 * 다섯 길이에서 세 개를 고르는 **열 가지**를 전부 만들어, 두 짧은 변의 제곱의 합이
 * 가장 긴 변의 제곱과 같은 것만 남긴다.
 *
 * 🔴 `hypotenuseIsLongest=false` 는 **제품이 안 쓰는 길**이다(생성기는 늘 `true`).
 * 그런데도 인자로 두는 까닭은 시험이 그 마디를 **흔들어 잴 수 있게** 하기 위해서다 —
 * 생성기 안에서 두 판을 견주는 줄은 한 번도 거부하지 못하는 «도장»이 된다
 * (2026-08-23 「도장은 초록을 못 낸다」). `false` 면 **고른 순서의 마지막 것**을
 * 빗변으로 삼는데, 그것이 학생이 가장 흔히 저지르는 실수이고 답이 달라진다.
 *
 * 낸 값은 언제나 **작은 것부터 정렬된** 세 길이다.
 */
export function rightTriangleTriples(
  lengths: readonly number[],
  hypotenuseIsLongest = true,
): number[][] {
  const out: number[][] = [];
  const n = lengths.length;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      for (let k = j + 1; k < n; k += 1) {
        const chosen = [lengths[i]!, lengths[j]!, lengths[k]!];
        const [p, q, r] = hypotenuseIsLongest
          ? ([...chosen].sort((x, y) => x - y) as [number, number, number])
          : (chosen as [number, number, number]);
        if (p * p + q * q === r * r) {
          out.push([...chosen].sort((x, y) => x - y));
        }
      }
    }
  }
  return out;
}

/** 정렬된 세 변의 넓이 — 두 직각변의 곱의 절반. */
export function rightTriangleArea(triple: readonly number[]): number {
  const [p, q] = [triple[0]!, triple[1]!];
  return (p * q) / 2;
}

/**
 * 길이의 상한. **$45$ 로 내리면 조합이 $25$ 로 줄고 최빈 정답이 $12.0\%$** 가 되어
 * 쏠림 문턱에 닿는다(⑷ 실측). $60$ 이면 조합 $46$ · 최빈 $6.5\%$ 다.
 * 더 올리면 해설의 열 짝 나열이 다섯 자리 수로 길어진다.
 */
const STICK_MAX = 60;

/** 두 피타고라스 세쌍이 값 하나만 공유해 만들어지는 다섯쌍 — 전수로 미리 만든다. */
const STICK_SETS: ReadonlyArray<readonly number[]> = (() => {
  const trips: [number, number, number][] = [];
  for (let a = 3; a <= STICK_MAX; a += 1) {
    for (let b = a + 1; b <= STICK_MAX; b += 1) {
      const cc = a * a + b * b;
      const c = Math.round(Math.sqrt(cc));
      if (c * c === cc && c <= STICK_MAX) trips.push([a, b, c]);
    }
  }
  const out: number[][] = [];
  const seen = new Set<string>();
  for (let i = 0; i < trips.length; i += 1) {
    for (let j = i + 1; j < trips.length; j += 1) {
      const u = new Set([...trips[i]!, ...trips[j]!]);
      if (u.size !== 5) continue;
      const L = [...u].sort((x, y) => x - y);
      const key = L.join(",");
      if (seen.has(key)) continue;
      // 🔴 직각삼각형이 **정확히 둘**이라야 「여러 가지」가 참이면서 나열이 안 길다.
      //    셋 이상이면 넓이 줄이 세 개가 되어 지면이 넘친다(㉮).
      const rights = rightTriangleTriples(L);
      if (rights.length !== 2) continue;
      const area = rights.reduce((s, t) => s + rightTriangleArea(t), 0);
      if (!Number.isInteger(area)) continue;
      // 🔴 ㉵ 지름길 — 다섯 길이의 한두 번 연산으로 넓이의 합이 나오면 버린다(⑷).
      if (looksLikeShortcut(area, L)) continue;
      seen.add(key);
      out.push(L);
    }
  }
  return out;
})();

const STICK_RIGHT_TRIANGLES: TypeEntry[] = [
  def(
    BOOK2,
    MINOR_PYTHA,
    "109X",
    "막대 다섯 개에서 고른 직각삼각형들의 넓이의 합",
    SEC.피타고라스활용,
    "심화상",
    (rng): Body =>
      attempt(200, (): Body | null => {
        const sorted = pick(rng, STICK_SETS);
        // ㉵ 발문의 다섯 길이는 **섞어** 찍는다 — 정렬해 두면 이웃한 셋이 답을 암시한다.
        const shown = shuffled(rng, sorted);
        if (shown.join(",") === sorted.join(",")) return null; // 섞이지 않았다
        const rights = rightTriangleTriples(sorted);
        if (rights.length !== 2) return null;
        const [t1, t2] = rights as [number[], number[]];
        const a1 = rightTriangleArea(t1);
        const a2 = rightTriangleArea(t2);
        const total = a1 + a2;

        const squares = sorted.map((v) => v * v);
        const pairs: string[] = [];
        const pairSums: number[] = [];
        for (let i = 0; i < 5; i += 1) {
          for (let j = i + 1; j < 5; j += 1) {
            const si = squares[i]!;
            const sj = squares[j]!;
            pairs.push(`$${si}+${sj}=${si + sj}$`);
            pairSums.push(si + sj);
          }
        }
        const hitCount = pairSums.filter((v) => squares.includes(v)).length;
        if (hitCount !== 2) return null; // 나열 줄과 판정이 어긋나면 안 된다

        const hitSq = rights.map(
          (t) => `$${t[0]! * t[0]!}+${t[1]! * t[1]!}=${t[2]! * t[2]!}$`,
        );
        const firstHyp2 = t1[2]! * t1[2]!;
        const hitTex = `${hitSq[0]}${waGwa(firstHyp2)} ${hitSq[1]}`;
        const hypTex = `$${t1[2]}$${waGwa(t1[2]!)} $${t2[2]}$`;
        const tripleTex = (t: readonly number[]): string =>
          `${listTex(t)}인 것`;

        return {
          content:
            `길이가 각각 ${shown.map((v) => `$${v}\\,\\mathrm{cm}$`).join(", ")}인 막대가 ` +
            `한 개씩 있다. 이 다섯 개의 막대 가운데 세 개를 골라 삼각형을 만들 때 ` +
            `직각삼각형이 되는 경우가 여러 가지 있다. 이때 만들 수 있는 직각삼각형들의 ` +
            `넓이의 합을 구하시오.`,
          answer: `$${total}\\,\\mathrm{cm}^2$`,
          solution: [
            `세 변의 길이가 $p$, $q$, $r$이고 $r$가 가장 길 때, $p^2+q^2=r^2$이면 그 삼각형은 빗변의 길이가 $r$인 직각삼각형이다. 그러므로 고른 세 막대 가운데 가장 긴 것을 빗변으로 놓고 견주어야 한다.`,
            `다섯 막대의 길이를 작은 것부터 늘어놓으면 ${listTex(sorted)}이고, 각각을 제곱하면 ${listTex(squares)}이다.`,
            `다섯 개에서 두 개를 고르는 방법은 열 가지이므로, 그 두 길이의 제곱의 합을 모두 구하면 ${pairs.join(", ")}이다.`,
            `이 열 가지 가운데 남은 한 막대의 길이의 제곱과 같은 것은 ${hitTex}의 두 가지뿐이고, 그때 남은 막대의 길이는 각각 ${hypTex}이다.`,
            `나머지 여덟 가지는 그 합이 ${listTex(squares)} 가운데 어느 것과도 같지 않으므로 직각삼각형이 되지 않는다.`,
            `따라서 직각삼각형이 되는 것은 세 변의 길이가 ${tripleTex(t1)}과 ${tripleTex(t2)}이고, 그 넓이는 각각 $\\dfrac{${t1[0]}\\times${t1[1]}}{2}=${a1}\\,(\\mathrm{cm}^2)$, $\\dfrac{${t2[0]}\\times${t2[1]}}{2}=${a2}\\,(\\mathrm{cm}^2)$이다.`,
            `따라서 두 직각삼각형의 넓이의 합은 $${a1}+${a2}=${total}\\,(\\mathrm{cm}^2)$이다.`,
          ].join("\n"),
          facts: {
            x: total,
            area1: a1,
            area2: a2,
            l1: sorted[0]!,
            l2: sorted[1]!,
            l3: sorted[2]!,
            l4: sorted[3]!,
            l5: sorted[4]!,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 110X  뿔을 밑면에 평행한 평면으로 n등분했을 때 조각의 부피  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * **굳힘 함수** — 뿔의 높이를 $n$ 등분했을 때 꼭짓점 쪽에서 $k$ 번째 **조각**의
 * 부피가 전체의 몇 분의 몇인가. 전체를 $n^3$ 으로 놓았을 때의 값을 낸다.
 *
 * 꼭짓점 쪽에서 $k$ 번째 자른 면까지의 작은 뿔은 처음 뿔과 닮음이고 닮음비가 $k:n$
 * 이므로, 부피의 비는 **닮음비의 세제곱의 비** $k^3:n^3$ 이다. 그러므로 $k$ 번째
 * 조각은 $k^3-(k-1)^3$ 이다.
 *
 * 🔴 **굳힘의 인자는 `cube` 다.** 「부피의 비는 닮음비의 **세제곱**의 비」를
 * 「닮음비의 제곱의 비」(그것은 겉넓이의 비다)로 바꾸면 답이 달라진다 — 학생이 가장
 * 흔히 저지르는 실수이고, 이 유형이 재려는 바로 그 마디다.
 * (`cube=false` 는 제품이 안 쓰는 길이다. 시험이 흔들어 잰다.)
 *
 * $k$ 가 $1$ 이상 $n$ 이하가 아니면 그런 조각이 없으므로 **던진다**.
 */
export function pieceShare(k: number, n: number, cube = true): number {
  if (!Number.isInteger(k) || !Number.isInteger(n) || n < 2) {
    throw new Error(`pieceShare: 등분 수가 이상하다 — n=${n}`);
  }
  if (k < 1 || k > n) {
    throw new Error(`pieceShare: ${n}등분에 ${k}번째 조각이 없다`);
  }
  const p = cube ? 3 : 2;
  return k ** p - (k - 1) ** p;
}

/** 소재 — 밑면에 평행한 평면으로 자르면 작은 뿔이 처음 뿔과 닮음이 되는 입체. */
const CONE_SHAPES = ["원뿔", "사각뿔", "삼각뿔"] as const;

const CONE_SLICE_VOLUME: TypeEntry[] = [
  def(
    BOOK2,
    MINOR_SIM,
    "110X",
    "뿔을 밑면에 평행한 평면으로 등분한 조각의 부피",
    SEC.넓이부피비,
    "심화중",
    (rng): Body =>
      attempt(4000, (): Body | null => {
        const shape = pick(rng, CONE_SHAPES);
        const n = pick(rng, [3, 4, 5] as const);
        // 🔴 **첫째 조각은 안 쓴다.** 그 몫이 $1$ 이라 지면이 흉해진다 — 눈으로 보고
        //    찾았다(값 검산·냄새 훑개 어느 자도 못 본다).
        //    · 주어진 것이 첫째이면 「$14$를 $1$로 나누면 $14$」라는 **아무 일도 안 하는
        //      나눗셈**이 해설에 남는다.
        //    · 묻는 것이 첫째이면 마무리가 「$1\times18=18$」이 되어 곱셈이 장식이 된다.
        //    그리고 그때 답이 주어진 부피의 «$A_j$ 배»로 한 번에 나와 지름길이 열린다.
        const i = intBetween(rng, 2, n);
        const j = intBetween(rng, 2, n);
        if (i === j) return null;
        // $t=1$ 이면 지면에 `\times1` 이 나고 「비의 값 하나에 해당하는 부피」 걸음이
        // 아무 일도 안 한다.
        const t = intBetween(rng, 2, 20);
        const ai = pieceShare(i, n);
        const aj = pieceShare(j, n);
        const given = ai * t;
        const want = aj * t;
        if (given < 8 || given > 900 || want < 8 || want > 900) return null;
        // 🔴 **지름길 가드를 여기 두지 않는다 — 두면 «도장»이다.**
        //    지면의 수는 등분 수 $n$ 과 주어진 부피뿐인데(차례는 우리말), 답은
        //    주어진 부피의 $\frac{A_j}{A_i}$ 배이고 그 비의 분자·분모는 늘
        //    $\{7,19,37,61\}$ 에서 온다. 그 비는 `scaledValues` 가 보는 «$2,3,4,5,10$배»
        //    어디에도 없다. 실제로 첫째 조각을 뺀 뒤 **전수 344 중 0건**이 걸린다 —
        //    한 번도 못 무는 줄을 남기면 「축이 하나 더 있다」고 오해하게 된다
        //    (2026-08-21 「가드가 0을 내면 «없다»가 아니라 «못 센다»일 수 있다」).
        //    ⚠️ 그렇다고 **불변식까지 없앤 것은 아니다** — 「답이 지면의 수를 한두 번
        //    굴린 값이 아니다」는 시험의 검산기가 800판 전량에 대고 잰다.

        const shares = Array.from({ length: n }, (_v, k) =>
          pieceShare(k + 1, n),
        );
        const cubes = Array.from({ length: n }, (_v, k) => (k + 1) ** 3);
        const shareTex = shares
          .map((s, k) =>
            k === 0 ? `$${s}$` : `$${cubes[k]}-${cubes[k - 1]}=${s}$`,
          )
          .join(", ");
        const volumes = shares.map((s) => s * t);
        const totalVolume = n ** 3 * t;

        return {
          content:
            `어떤 ${shape}의 높이를 $${n}$등분하는 ${countWord(n - 1)} 점을 지나고 ` +
            `밑면에 평행한 ${countWord(n - 1)} 평면으로 이 ${shape}${objectParticle(shape)} 잘라 ` +
            `${countWord(n)} 개의 입체로 나누었다. 꼭짓점에 가까운 쪽부터 차례로 ` +
            `${ORDINAL.slice(0, n).join(", ")} 입체라 할 때, ${ORDINAL[i - 1]} 입체의 ` +
            `부피가 $${given}\\,\\mathrm{cm}^3$이다. ${ORDINAL[j - 1]} 입체의 부피를 구하시오.`,
          answer: `$${want}\\,\\mathrm{cm}^3$`,
          solution: [
            `꼭짓점 쪽에서 $k$번째 자른 면까지의 작은 뿔은 처음 ${shape}${withParticle(shape)} 닮은 도형이고, 높이의 비가 $k:${n}$이므로 닮음비도 $k:${n}$이다.`,
            `닮은 두 입체도형의 부피의 비는 닮음비의 세제곱의 비와 같으므로, 그 작은 뿔과 처음 ${shape}의 부피의 비는 $k^3:${n}^3$이다.`,
            `그러므로 처음 ${shape}의 부피를 $${n ** 3}$${eulReul(n ** 3) === "을" ? "이라" : "라"} 하면 $k$번째 자른 면까지의 작은 뿔의 부피는 $k^3$이고, $k$가 ${listTex(Array.from({ length: n }, (_v, k) => k + 1))}일 때 $k^3$은 차례로 ${listTex(cubes)}이다.`,
            `이웃한 두 작은 뿔의 부피의 차가 그 사이의 조각이므로, ${ORDINAL.slice(0, n).join(", ")} 입체의 부피는 차례로 ${shareTex}이다.`,
            `그러므로 ${ORDINAL[i - 1]} 입체의 부피 $${ai}$${waGwa(ai)} ${ORDINAL[j - 1]} 입체의 부피 $${aj}$의 비는 $${ai}:${aj}$이다.`,
            `${ORDINAL[i - 1]} 입체의 부피가 $${given}\\,\\mathrm{cm}^3$이고 $${given}$${eulReul(given)} $${ai}$${euroRo(ai)} 나누면 $${t}$이므로, 이 비의 값 $1$에 해당하는 부피는 $${t}\\,\\mathrm{cm}^3$이다.`,
            `따라서 ${ORDINAL[j - 1]} 입체의 부피는 $${aj}\\times${t}=${want}\\,(\\mathrm{cm}^3)$이다.`,
            `실제로 ${countWord(n)} 조각의 부피를 모두 더하면 $${volumes.join("+")}=${totalVolume}\\,(\\mathrm{cm}^3)$이고, 처음 ${shape}의 부피도 $${n ** 3}\\times${t}=${totalVolume}\\,(\\mathrm{cm}^3)$이므로 서로 같다.`,
          ].join("\n"),
          facts: {
            x: want,
            n,
            i,
            j,
            t,
            given,
            shareI: ai,
            shareJ: aj,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 111X  자리를 바꾼 수와의 차 · 부등식 두 개로 걸러 낸 수들의 합  (심화상)
// ═══════════════════════════════════════════════════════════

/**
 * 자리를 바꾼 수가 처음 수보다 $9t$ 만큼 **큰**(`swapIsLarger`) 두 자리 자연수 전부.
 *
 * $10a+b$ 에서 자리를 바꾸면 $10b+a$ 이고 그 차는 $9(b-a)$ 이므로, 차가 $9t$ 라는 것은
 * $b-a=t$ 라는 뜻이다. 자리를 바꾼 수도 **두 자리 자연수**여야 하므로 $a$, $b$ 는
 * 모두 $1$ 이상 $9$ 이하다 — 그래서 $a$ 는 $1$ 부터 $9-t$ 까지다.
 *
 * 낸 값은 작은 것부터 정렬돼 있다.
 */
export function swapDiffNumbers(t: number, swapIsLarger: boolean): number[] {
  if (!Number.isInteger(t) || t < 1 || t > 8) {
    throw new Error(`swapDiffNumbers: 자리 숫자의 차가 이상하다 — ${t}`);
  }
  const out: number[] = [];
  for (let small = 1; small <= 9 - t; small += 1) {
    // 큰 쪽 자리 숫자는 small + t. 자리를 바꾼 수가 크면 일의 자리가 큰 쪽이다.
    out.push(swapIsLarger ? 11 * small + t : 11 * small + 10 * t);
  }
  return out;
}

/**
 * **굳힘이 없다 — 후보를 다 세워 견주어야 한다**(심화상). 인자로 둔 것은 굳힘이 아니라
 * **«몇 개의 부등식을 견주는가»** 다(`bounds`).
 *
 * 🔴 `bounds="upper"` 는 제품이 안 쓰는 길이다(생성기는 늘 `"both"`). 아래끝을 안 보면
 * 창이 한쪽으로 열려 살아남는 수가 늘고 합이 달라진다 — 시험이 그것을 흔들어 잰다.
 */
export function survivingNumbers(
  candidates: readonly number[],
  m: number,
  lowBound: number,
  highBound: number,
  bounds: "both" | "upper" | "lower" = "both",
): number[] {
  if (m < 2) throw new Error(`survivingNumbers: 배수가 이상하다 — ${m}`);
  return candidates.filter((v) => {
    const over = m * v > lowBound;
    const under = m * v < highBound;
    if (bounds === "upper") return under;
    if (bounds === "lower") return over;
    return over && under;
  });
}

/** $x>\dfrac{R}{c}$ 를 만족하는 가장 작은 자연수 — $R/c$ 가 정수가 아닐 때만 부른다. */
export function smallestNaturalAbove(r: number, c: number): number {
  if (r % c === 0) {
    throw new Error(`smallestNaturalAbove: ${r}/${c} 가 정수라 동점이 난다`);
  }
  return Math.floor(r / c) + 1;
}

/** $x<\dfrac{R}{c}$ 를 만족하는 가장 큰 자연수 — $R/c$ 가 정수가 아닐 때만 부른다. */
export function largestNaturalBelow(r: number, c: number): number {
  if (r % c === 0) {
    throw new Error(`largestNaturalBelow: ${r}/${c} 가 정수라 동점이 난다`);
  }
  return Math.ceil(r / c) - 1;
}

/**
 * 창 $(\text{방향},t,\text{아래끝 자리},\text{위끝 자리})$ 전수 — **미리 만들어 고르게 뽑는다.**
 *
 * 🔴 처음에는 $t$ 와 두 자리를 각각 `intBetween` 으로 뽑았다. 그러면 $t=5$ 인 판은
 * 후보가 **넷뿐**이라 창이 하나로 굳어, 그 하나가 표본의 $10\%$ 를 차지했다 —
 * 실측 최빈 정답 **$11.25\%$** 로 쏠림 문턱($12\%$)에 닿았다. 창을 전수로 만들어
 * 고르게 뽑으면 **$3.5\%$** 다. 「매개변수를 고르게 뽑는 것」과 「산출물이 고른 것」은
 * 다른 말이고, 가르는 것은 **매개변수마다 창이 몇 개인가**다.
 */
const SWAP_WINDOWS: ReadonlyArray<{
  swapIsLarger: boolean;
  t: number;
  lo: number;
  hi: number;
}> = (() => {
  const out: { swapIsLarger: boolean; t: number; lo: number; hi: number }[] =
    [];
  for (const swapIsLarger of [true, false]) {
    for (let t = 1; t <= 5; t += 1) {
      const len = swapDiffNumbers(t, swapIsLarger).length;
      if (len < 4) continue;
      for (let lo = 2; lo <= len - 2; lo += 1) {
        for (let hi = lo + 1; hi <= len - 1; hi += 1) {
          if (hi - lo + 1 > 4) continue; // 나열이 길면 지면이 넘친다(㉮)
          out.push({ swapIsLarger, t, lo, hi });
        }
      }
    }
  }
  return out;
})();

const SWAP_DIFF_WINDOW: TypeEntry[] = [
  def(
    BOOK1,
    MINOR_INEQ_APPLY,
    "111X",
    "자리를 바꾼 수의 조건과 부등식을 모두 만족하는 두 자리 자연수의 합",
    SEC.수평균정가,
    "심화상",
    (rng): Body =>
      attempt(8000, (): Body | null => {
        // 창의 두 끝은 **서로 다른 부등식**에서 온다. 둘 다 실제로 후보를 잘라야 하므로
        // 아래끝은 첫 후보보다 뒤에서, 위끝은 마지막 후보보다 앞에서 잡는다.
        const win = pick(rng, SWAP_WINDOWS);
        const { swapIsLarger, t, lo, hi } = win;
        const cands = swapDiffNumbers(t, swapIsLarger);
        const m = intBetween(rng, 2, 7);
        const below = cands[lo - 2]!;
        const first = cands[lo - 1]!;
        const last = cands[hi - 1]!;
        const above = cands[hi]!;
        // ㉯ 경계가 정수면 「보다 크다/작다」에서 동점이 나고 자연수 걸음이 없어진다.
        //    ㉰ 그리고 $\gcd(C,m)=1$ 이라야 지면의 경계 분수가 기약이다.
        const lowBound = intBetween(rng, m * below + 1, m * first - 1);
        const highBound = intBetween(rng, m * last + 1, m * above - 1);
        if (gcd(lowBound, m) !== 1 || gcd(highBound, m) !== 1) return null;

        const survivors = survivingNumbers(cands, m, lowBound, highBound);
        if (survivors.length < 2) return null;
        if (
          survivors[0] !== first ||
          survivors[survivors.length - 1] !== last
        ) {
          return null;
        }
        const loNat = smallestNaturalAbove(lowBound, m);
        const hiNat = largestNaturalBelow(highBound, m);
        const total = survivors.reduce((s, v) => s + v, 0);
        const d = 9 * t;
        if (looksLikeShortcut(total, [d, m, lowBound, highBound])) return null;

        const tooSmall = cands.filter((v) => v < loNat);
        const tooBig = cands.filter((v) => v > hiNat);
        if (tooSmall.length === 0 || tooBig.length === 0) return null;

        const bigger = swapIsLarger ? "일의" : "십의";
        const smaller = swapIsLarger ? "십의" : "일의";
        const dropLine =
          `${listTex(tooSmall)}${eunNeun(tooSmall[tooSmall.length - 1]!)} $${loNat}$보다 작고, ` +
          `${listTex(tooBig)}${eunNeun(tooBig[tooBig.length - 1]!)} $${hiNat}$보다 크므로 두 조건을 모두 만족하지 않는다.`;

        return {
          content:
            `어떤 두 자리 자연수가 있다. 이 수의 십의 자리의 숫자와 일의 자리의 숫자를 ` +
            `바꾼 수는 처음 수보다 $${d}$만큼 ${swapIsLarger ? "크다" : "작다"}. ` +
            `또 처음 수의 $${m}$배는 $${lowBound}$보다 크고 $${highBound}$보다 작다. ` +
            `이러한 두 자리 자연수를 모두 구하고, 그 수들의 합을 구하시오.`,
          answer: `$${total}$`,
          solution: [
            `처음 수의 십의 자리의 숫자를 $a$, 일의 자리의 숫자를 $b$라 하면 처음 수는 $10a+b$이고 자리를 바꾼 수는 $10b+a$이다. 자리를 바꾼 수도 두 자리 자연수이므로 $a$와 $b$는 모두 $1$ 이상 $9$ 이하의 자연수이다.`,
            `자리를 바꾼 수가 처음 수보다 $${d}$만큼 ${swapIsLarger ? "크므로" : "작으므로"} 두 수의 차는 $${swapIsLarger ? "9b-9a" : "9a-9b"}=${d}$이고, 양변을 $9$${euroRo(9)} 나누면 $${swapIsLarger ? "b-a" : "a-b"}=${t}$이다.`,
            `${bigger} 자리의 숫자가 ${smaller} 자리의 숫자보다 $${t}$만큼 크고 두 숫자가 모두 $1$ 이상 $9$ 이하이므로, 처음 수가 될 수 있는 것은 ${listTex(cands)}의 ${countWord(cands.length)} 개이다.`,
            `처음 수를 $x$라 하면 $${m}$배가 $${lowBound}$보다 크므로 $${m}x>${lowBound}$, 곧 $x>\\dfrac{${lowBound}}{${m}}$이다. $x$는 자연수이므로 $x\\ge${loNat}$이다.`,
            `또 $${m}$배가 $${highBound}$보다 작으므로 $${m}x<${highBound}$, 곧 $x<\\dfrac{${highBound}}{${m}}$이다. $x$는 자연수이므로 $x\\le${hiNat}$이다.`,
            `그러므로 $${loNat}\\le x\\le${hiNat}$이고, 위의 후보 가운데 이 범위에 있는 것은 ${listTex(survivors)}이다.`,
            dropLine,
            `따라서 구하는 합은 $${survivors.join("+")}=${total}$이다.`,
          ].join("\n"),
          facts: {
            x: total,
            d,
            m,
            low: lowBound,
            high: highBound,
            loNat,
            hiNat,
            count: survivors.length,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 112X  지나는 사분면으로 부호를 세우고 두 절편을 더하기  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * **굳힘 함수** — 일차함수 $y=ax+b$ ($a\ne0$, $b\ne0$)의 그래프가 **지나지 않는**
 * 사분면. 기울기 $a$ 의 부호와 $y$절편 $b$ 의 부호만으로 정해진다.
 *
 * 🔴 **굳힘의 인자는 `useIntercept` 다.** 「$b$ 는 $y$절편이고 그 부호가 그래프와
 * $y$축이 만나는 자리를 정한다」는 걸음을 빼고 기울기만 보면 지나지 않는 사분면이
 * 정해지지 않는다 — 이 유형이 재려는 바로 그 마디다. `useIntercept=false` 는
 * $b>0$ 인 것처럼 보고 판정하는 길이고, **제품은 안 쓴다**(시험이 흔들어 잰다).
 */
export function missingQuadrant(
  a: number,
  b: number,
  useIntercept = true,
): number {
  if (a === 0)
    throw new Error("missingQuadrant: 기울기가 $0$ 이면 일차함수가 아니다");
  if (b === 0)
    throw new Error("missingQuadrant: $y$절편이 $0$ 이면 원점을 지난다");
  const up = a > 0;
  const high = useIntercept ? b > 0 : true;
  if (up && high) return 4;
  if (up && !high) return 2;
  if (!up && high) return 3;
  return 1;
}

/** 지나지 않는 사분면에서 되짚은 부호 한 쌍 — `missingQuadrant` 와 왕복한다. */
export function signsFromMissingQuadrant(missing: number): [boolean, boolean] {
  if (missing === 4) return [true, true];
  if (missing === 2) return [true, false];
  if (missing === 3) return [false, true];
  if (missing === 1) return [false, false];
  throw new Error(`signsFromMissingQuadrant: 사분면이 아니다 — ${missing}`);
}

/** 기약분수로 줄인 $\dfrac{n}{d}$ — 분모는 늘 양수. */
export function reduceFraction(n: number, d: number): [number, number] {
  const s = d < 0 ? -1 : 1;
  const g = gcd(n, d) || 1;
  return [(s * n) / g, (s * d) / g];
}

/** $\pm\dfrac{n}{d}$ 를 지면 글자로 — 분모가 $1$ 이면 던진다(㉰). */
function fracTex(n: number, d: number): string {
  if (d === 1) throw new Error(`fracTex: 분모가 $1$ 이다 — ${n}/${d}`);
  return n < 0 ? `-\\dfrac{${-n}}{${d}}` : `\\dfrac{${n}}{${d}}`;
}

const QUADRANT_INTERCEPT_SUM: TypeEntry[] = [
  def(
    BOOK1,
    MINOR_FUNC2,
    "112X",
    "지나는 사분면으로 정한 부호에서 두 절편의 합",
    SEC.함수성질,
    "심화중",
    (rng): Body =>
      attempt(4000, (): Body | null => {
        const missing = pick(rng, [1, 2, 3, 4] as const);
        const [aPos, bPos] = signsFromMissingQuadrant(missing);
        const p = intBetween(rng, 2, 9);
        const q = intBetween(rng, 1, 14);
        if (gcd(p, q) !== 1) return null; // ㉰ 안 걸면 답의 분수가 기약이 아니다
        const a = aPos ? p : -p;
        const b = bPos ? q : -q;
        if (missingQuadrant(a, b) !== missing) return null;

        // $x$절편은 $ax+b=0$ 의 해 — 규칙을 옮겨 적지 않고 그 자리에서 푼다.
        const [xn, xd] = reduceFraction(-b, a);
        if (xd === 1) return null; // 지면에 분수가 안 나오면 이 갈래가 아니다
        const yInt = b;
        // 합 = $\dfrac{xn}{xd}+yInt$ — 분모가 $xd$ 이고 분자는 $xn+yInt\times xd$.
        const sumNum = xn + yInt * xd;
        const [sn, sd] = reduceFraction(sumNum, xd);
        if (sd === 1) return null;
        const value = sn / sd;
        // 🔴 ㉵ 지름길 — 지면의 수는 $p$, $q$ 와 사분면 번호뿐이다. 「두 수를 나눈 값」
        //    따위로 답이 그대로 나오면 버린다(⑷).
        const obvious = new Set<number>([
          q / p,
          -q / p,
          p / q,
          -p / q,
          q,
          -q,
          p,
          -p,
          p * q,
          -p * q,
          p + q,
          -(p + q),
          p - q,
          q - p,
        ]);
        if (obvious.has(value)) return null;

        const passed = [1, 2, 3, 4].filter((k) => k !== missing);
        const passedTex = passed.map((k) => `제$${k}$사분면`).join(", ");
        const slopeLine = aPos
          ? `$a>0$이면 $x$의 값이 커질 때 $y$의 값도 커지므로 그래프는 오른쪽 위로 향한다.`
          : `$a<0$이면 $x$의 값이 커질 때 $y$의 값은 작아지므로 그래프는 오른쪽 아래로 향한다.`;
        const interceptLine = bPos
          ? `$b$는 $y$절편이므로 $b>0$이면 그래프는 $y$축의 양의 부분과 만난다.`
          : `$b$는 $y$절편이므로 $b<0$이면 그래프는 $y$축의 음의 부분과 만난다.`;
        // 「버리는 걸음」 — 반대 부호였다면 왜 이 사분면 배치가 안 되는가(D-116 ⑹).
        const DROP: Record<number, string> = {
          4: `만약 $a<0$이었다면 그래프가 오른쪽 아래로 향하여 제$1$사분면과 제$3$사분면을 동시에 지날 수 없다.`,
          2: `만약 $b>0$이었다면 그래프가 $y$축의 양의 부분과 만나 제$2$사분면을 지나게 된다.`,
          3: `만약 $a>0$이었다면 그래프가 오른쪽 위로 향하여 제$3$사분면을 반드시 지난다.`,
          1: `만약 $b>0$이었다면 그래프가 $y$축의 양의 부분과 만나 제$1$사분면을 지나게 된다.`,
        };
        const aTex = aPos ? `${p}` : `-${p}`;
        const bTex = bPos ? `${q}` : `-${q}`;
        const lineTex = `${aTex}x${bPos ? "+" : "-"}${q}`;
        // 통분 줄의 분자는 **합의 꼴**로 적는다 — $\dfrac{15}{3}$ 같은 기약 아닌
        // 분수를 지면에 안 내려고(㉰, 4차 물결이 적어 둔 자리).
        const combineTex = `\\dfrac{${xn}${yInt * xd < 0 ? "-" : "+"}${Math.abs(yInt * xd)}}{${xd}}`;

        return {
          content:
            `일차함수 $y=ax+b$의 그래프가 ${passedTex}을 지난다. 두 상수 $a$, $b$에 ` +
            `대하여 $|a|=${p}$, $|b|=${q}$일 때, 이 그래프의 $x$절편과 $y$절편의 합을 ` +
            `구하시오.`,
          answer: `$${fracTex(sn, sd)}$`,
          solution: [
            `일차함수 $y=ax+b$의 그래프에서 $a$는 기울기이고 $b$는 $y$절편이다.`,
            slopeLine,
            interceptLine,
            `그래프가 ${passedTex}을 지나므로 제$${missing}$사분면은 지나지 않는다. 위의 두 가지를 함께 만족하는 그래프가 바로 그런 그래프이므로 $a${aPos ? ">" : "<"}0$, $b${bPos ? ">" : "<"}0$이다.`,
            DROP[missing]!,
            `$|a|=${p}$, $|b|=${q}$이고 $a${aPos ? ">" : "<"}0$, $b${bPos ? ">" : "<"}0$이므로 $a=${aTex}$, $b=${bTex}$이다. 곧 이 그래프의 기울기는 $${aTex}$이고 $y$절편은 $${bTex}$${iGa(q)} 된다.`,
            `$x$절편은 $y=0$일 때의 $x$의 값이므로 $${lineTex}=0$에서 $x=${fracTex(xn, xd)}$이다.`,
            `따라서 $x$절편과 $y$절편의 합은 $${fracTex(xn, xd)}${yInt < 0 ? "-" : "+"}${Math.abs(yInt)}=${combineTex}=${fracTex(sn, sd)}$이다.`,
          ].join("\n"),
          facts: {
            x: sn,
            den: sd,
            p,
            q,
            missing,
            xNum: xn,
            xDen: xd,
            yInt,
          },
          figureSpec: null,
        };
      }),
  ),
];

/**
 * 중2 확대 갈래 5차 물결 `m2Top5c` 명부 — `generate.ts` 의 `ALL` 이 이것 하나만
 * spread 한다(그 한 줄은 **리드가** 넣는다).
 *
 * 갈래별 몫: **심화중 2 · 심화상 2**. 수를 목표로 잡지 않았다 — 세울 수 있는
 * 자리에만 세웠다(D-115 ⑹ 「비우는 단위는 학년이 아니라 소단원」).
 */
export const M2_TOP_5C: TypeEntry[] = [
  ...STICK_RIGHT_TRIANGLES,
  ...CONE_SLICE_VOLUME,
  ...SWAP_DIFF_WINDOW,
  ...QUADRANT_INTERCEPT_SUM,
];
