/**
 * 중2 **확대 갈래 5차 물결**(`심화중`·`심화상`) — D-116, 접미사 **`X`**, 갈래 `m2Top5f`.
 *
 * ## ⑴ 왜 새 파일인가
 *
 * 4차(`m2Top4.ts`)·5차 형제들과 같은 까닭이다 — 남의 모듈을 잠그는 개수 검사를
 * 무르지 않으려고, 그리고 오르카 다중 세션(이번 물결은 **21갈래가 동시에** 돈다)이
 * 같은 파일에서 부딪히지 않으려고 **새 파일 하나 + `generate.ts` spread 한 줄**로
 * 붙인다. 그 한 줄은 **리드가** 넣는다 — 이 파일은 `generate.ts` 를 건드리지 않는다.
 *
 * ## ⑵ 유형마다 — 안 굳는 마디 / 무엇이 굳히나 / 같은 소단원과 무엇이 다른가
 *
 * | 키 | 갈래 | 안 굳는 마디 | 무엇이 굳히나 | 아래 갈래와 다른 축 |
 * |---|---|---|---|---|
 * | `삼각형의 무게중심\|121X` | **심화중** | 삼각형 $\mathrm{ABC}$ 의 **크기 자체** — 발문은 넓이를 하나도 안 준다. 준 것은 «조각 하나의 넓이»뿐이라 「나머지를 어떻게 아나」가 안 굳는 것처럼 보인다 | 이 소단원의 개념 **「무게중심은 삼각형을 넓이가 같은 세 삼각형으로 나눈다」** 하나. 전체 넓이를 $S$ 라 **놓기만** 하면 두 조각이 각각 $\dfrac16S$·$\dfrac{m}{3(m+n)}S$ 로 정해져 $S$ 가 한 번에 나온다 — 실제 변의 길이는 한 번도 안 쓴다 | 심화하 `13`·`14` 는 넓이를 **주고** 조각을 묻는 정방향이고, `15`(평행사변형)는 무게중심 둘을 쓰지만 역시 전체가 주어진다. `121X` 는 **역방향**이고, 게다가 주어진 조각이 삼각형이 아니라 **사각형**이라 「대각선으로 둘로 나누는」 걸음이 한 겹 더 있다 |
 * | `등변사다리꼴, 여러 가지 사각형\|122X` | **심화중** | 네 변의 **길이** — 발문은 두 밑변의 «비»와 둘레만 준다. 정삼각형 조건은 길이를 하나도 안 알려 준다 | 이 소단원의 개념 **「두 쌍의 대변이 각각 평행하면 평행사변형」** 하나. $\square\mathrm{ABED}$ 가 평행사변형임을 알면 $\overline{\mathrm{DE}}=\overline{\mathrm{AB}}=\overline{\mathrm{DC}}$ 라 $\triangle\mathrm{DEC}$ 는 **이미 이등변삼각형**이고, 정삼각형 조건이 곧 $\overline{\mathrm{EC}}=\overline{\mathrm{DC}}$ 하나로 줄어 $\overline{\mathrm{AB}}=\overline{\mathrm{BC}}-\overline{\mathrm{AD}}$ 가 나온다 | 심화하 `08`(등변사다리꼴의 성질의 응용)·`30`(두 대각선)은 **각이나 길이가 직접 주어지고** 성질을 한 번 쓰면 끝난다. `29`(넓이와 둘레)는 네 변을 다 준다. `122X` 는 길이가 하나도 없이 **비 + 둘레**뿐이라 「$k$ 로 놓기」가 반드시 필요하고, 정삼각형 조건을 **평행사변형을 거쳐** 길이 관계로 옮기는 걸음이 핵심이다 |
 * | `일차함수의 활용(온도, 길이)\|123X` | **심화상** | 「$t$ 가 얼마인가」 그 자체 — 두 양초가 $1$분에 짧아지는 길이가 **둘 다 미지수**라 $t$ 가 하나로 안 굳고, **여럿이 살아남아 전부 답에 들어간다** | 굳지 않는다. $(a-b)t=P-Q$ 에서 나오는 것은 「$t$ 는 $P-Q$ 의 약수」라는 **후보 목록**뿐이고, 그중 무엇이 사는지는 **약수를 다 세운 뒤 하나씩 견주어야** 안다. 게다가 버리는 근거(「그때 $\mathrm{B}$ 가 이미 다 탔다」)가 나눗셈이 아니라 **길이**에서 온다 | 심화하 `31`(두 양초의 길이)·`32`(두 시점에서 길이)는 짧아지는 속도를 **발문이 준다** — 일차함수를 세워 한 번 풀면 시각이 **하나**로 나온다. 응용 `26`~`30` 도 전부 계수가 주어진 정방향이다. `123X` 는 계수가 **미지수 둘**이고 답이 «시각 하나»가 아니라 **살아남은 시각들의 합**이며, 「버리는 후보가 왜 죽는지」를 적어야 한다 |
 * | `단항식의 곱셈과 나눗셈\|124X` | **심화상** | 「셋 중 무엇을 곱하고 무엇으로 나누는가」 — 계산 결과 셋 가운데 어느 것이 단항식인지는 **셋을 다 계산하기 전에는** 안 정해진다 | 굳지 않는다. 계수는 셋 다 자연수라 **계수만 보면 못 가른다.** $x$ 의 지수와 $y$ 의 지수를 **각각** 세 번씩 계산해 견주어야 하고, 죽는 둘이 **서로 다른 축**(하나는 $x$, 하나는 $y$)에서 죽는다 | 기본 `12`(혼합 계산)·`13`(□ 안에 알맞은 식)은 계산할 식이 **하나로 정해져** 있다. 심화하 `50`~`54` 도 「무엇을 계산할지」는 주어지고 문자로 놓는 요령만 다르다. `124X` 는 **계산 자체는 쉬운데 무엇을 계산할지가 안 정해져** 세 번 하고 둘을 버린다 |
 *
 * ## ⑶ 🔴 앞 물결들이 **실제로 새어 나간 자리** — 여기서 어떻게 막았나
 *
 * 전부 「값은 맞고 KaTeX 도 초록」이라 값 검산·냄새 자가 구조적으로 못 보던 부류다.
 *
 * ㉮ **해설이 정답지 한 단을 넘었다**(3차 중1 `53V`, 1242px). → 넷 다 제품
 *    `estimateSolutionPx` 로 **800판**을 재어 **700px 아래**로 잠근다(시험 「해설 높이」).
 *    그렇다고 **걸음을 지우지 않는다**(D-116 ⑹) — `123X` 의 약수 나열이 지면에서
 *    가장 긴 줄이라 「살아남는 약수 $3$~$7$개」로 **개수를 묶어** 줄 길이를 잡았고,
 *    `124X` 는 세 계산을 **한 줄에 하나씩** 적되 계수·$x$·$y$ 를 한 문장에 넣었다.
 * ㉯ **해설이 「자연수」 걸음을 건너뛰었다**(3차 중2 `38V`). → 이 넷에는 **부등식을
 *    풀어 정수 경계로 뛰는 자리가 없다.** `123X` 만 부등식 $bt<Q$ 를 쓰는데, 거기서
 *    정수로 뛰지 않고 **「$b$ 는 $1$ 이상이므로 $t<Q$」**라는 한 걸음만 밟는다
 *    (경계가 곧 $Q$ 라 나눗셈이 없다). 그래서 공용 훑개의 그 축에 대해 이 파일의
 *    「0」은 «깨끗»이 아니라 **«잴 것이 없다»** 다 — 시험이 그 사실을 못 박는다.
 * ㉰ **해설이 기약이 아닌 분수를 찍었다**(3차 중1 `52V`). → `121X` 는 지면의 모든
 *    `\dfrac{수}{수}` 가 기약이고 분모가 $1$ 이 아니게 $\gcd(m,n)=1$·$3\nmid m$·
 *    $\gcd(3m+n,\ 6(m+n))=1$ 을 **셋 다** 건다. 통분 줄은 분자를 **`\dfrac{3+2}{18}`
 *    처럼 합의 꼴**로 적어 「통분한 각 항」이 기약 판정 대상이 되지 않게 했다.
 *    `122X`·`123X` 는 분수를 아예 안 쓰고(그 «0» 은 «잴 것이 없다» 다), `124X` 의
 *    분수는 분자에 문자가 있어 그 자가 구조적으로 못 본다 — 대신 **중간값 검사**가
 *    그 줄을 글자 그대로 다시 짓는다.
 * ㉱ **발문이 스스로 못 박은 상한을 오답이 넘었다**(4차 중2 `37W`, 51.7%).
 *    → 넷 다 「전체를 $1$ 로 놓고」류 상한을 **선언하지 않는다.** 공용
 *    `declaredUpperBound` 가 읽는 표현이 네 발문 어디에도 없다(시험이 800판 전량에서
 *    `null` 임을 잠근다). 그러므로 그 결함의 자리 자체가 없다.
 * ㉲ **정답이 «구간»이면 파생 오답이 뒤집힌다**(3차 중2 `35V`). → 넷 다 정답이
 *    **한 값**이다(`124X` 만 단항식 하나). 구간 답이 없으므로 그 대가를 안 치른다.
 * ㉳ **해설의 «말»을 지키는 시험이 없었다**(4차, 중1 10줄·중2 3줄이 무방비).
 *    → 굳힘 개념과 마무리 논거를 진술하는 줄마다 시험이 **낱말을 읽고**, 그 낱말을
 *    뒤집으면 빨개지는 눈금을 같이 뒀다(`middleM2Top5f.test.ts` ⑹).
 *    `121X` 의 「넓이가 같은 세 삼각형」·「높이가 같으므로」, `122X` 의 「평행사변형」·
 *    「이등변삼각형」, `123X` 의 「약수」·「다 타 버린다」, `124X` 의 「분모에 남으므로」가
 *    그 자리다.
 * ㉴ **지면이 자기가 한 줄 앞에 세운 제약을 스스로 어긴다**(4차 중3 `55W`, 100%).
 *    → `123X` 는 「$b$ 는 $1$ 이상」을 선언한 **뒤** 그 제약으로 후보를 버린다. 버린
 *    약수가 모두 $Q$ 이상이고 남긴 약수가 모두 $Q$ 미만인지 시험이 전량 확인한다.
 *    `124X` 는 「계수는 셋 다 자연수」를 선언한 뒤 그 말을 어기지 않는다(전량 확인).
 * ㉵ **자료를 정렬해 찍으면 «보이는 자리»가 순위를 암시한다**(4차 중1 `63W`, 100%).
 *    → 이 넷에는 «자료의 나열»이 없다. `123X` 의 약수 목록은 **자료가 아니라 풀이가
 *    만든 것**이라 오름차순이 옳다(섞으면 「빠짐없이 다 보았다」가 안 읽힌다).
 * ㉶ **D-20 손실 원장은 «재현 가능»해야 한다**(4차 중1 `62W`). → ⑷ 에 **전수로 센**
 *    값을 적고, 시험이 「가드 **하나만** 껐을 때」를 전수로 다시 세어 그 표를 잠근다.
 * ㉷ **내보낸 순수 함수의 주석이 코드와 어긋나면 안 된다**(4차 중3 `solveBoxCases`).
 *    → 아래 굳힘 함수 넷의 단언은 전부 시험이 **눈금으로** 문다(양성·음성 둘 다).
 * ㉸ 우리말 — 「그중」은 **붙여 쓴다**. 수 뒤 조사는 지면에 **찍히는 글자**로 정하고
 *    (`m2Josa` 한 곳), 「(으)로」는 **ㄹ 받침**으로 갈린다(`euroRo`).
 *    🔴 **여기서 이 파일이 두 번 물렸다** — 검증 회차가 전수로 재어 찾았다.
 *    ⑴ `123X` 가 「$Q$**와** 같으면」을 **글자로 박아** 두어 $Q$ 의 읽기가 받침으로
 *       끝나는 판에서 전부 틀렸다(실측 $3{,}200$판 중 **1,971**). 이제 `waGwa(Q)` 다.
 *    ⑵ `124X` 발문이 「$C=12x^{5}y$**이** 있다」로 끝나 **문자 뒤** 조사가 틀렸다
 *       ($y$ 는 「와이」라 「가」다. 지수가 붙으면 「제곱」이라 「이」가 맞아 **판마다
 *       갈렸다** — 실측 $800$판 중 **220**). `josaMismatches` 는 「이」를 일부러 안
 *       보므로(서술격 「이다」와 겹친다) **구조적으로 못 잡는 자리**다. 손 목록을
 *       더하는 대신 문장을 「… $C=\cdots$ **중에서** 두 개를 곱한 …」으로 바꿔
 *       **조사가 필요 없게** 했다.
 *
 * ## ⑷ 🔴 손실 원장 (D-20 · ㉶) — 어림하지 않고 **전수로 센 값**
 *
 * 「가드 **하나만** 껐을 때」를 전수로 세었고, 시험(「D-20 손실 원장이 재현된다」)이
 * 이 표를 그대로 다시 세어 잠근다. **판 수와 답 수의 측정점을 같은 자리**로 맞췄다 —
 * 아래 「조합」은 전부 **매개변수 조합의 수**이고, 「정답 가짓수·최빈」은 그 조합
 * 전수에 대한 값이다(씨앗 표본이 아니다).
 *
 * 실측값은 `scripts` 가 아니라 **시험 파일**이 전수로 다시 센다 — 아래 표를 손으로
 * 고치면 그 시험이 빨개진다.
 *
 * 🔴 **처음 적었던 표는 틀려 있었다.** 이 파일을 검증한 회차가 전수로 다시 세어
 * 아홉 자리를 고쳤다(이를테면 `122X` 는 «271 → 117» 이 아니라 **288 → 127**,
 * `124X` 는 599,664 가 아니라 **536,238**). 그래서 아래 값은 전부 시험이 다시 센다.
 *
 * **제품(가드를 전부 켰을 때)**
 *
 * | 유형 | 조합 | 정답 가짓수 | 최빈 정답 |
 * |---|---|---|---|
 * | `121X` | $(m,n,k)$ **163** | **52** | **4.91%** |
 * | `122X` | $(m,n,t)$ **127** | **33** | **6.30%** |
 * | `123X` | $(D,Q)$ **1,703** | **61** | **4.23%** |
 * | `124X` | $(X,Y,p,q,r)$ **536,238** | **931** | **1.15%** |
 *
 * **가드를 하나씩 껐을 때** — 「제품 비율」은 «제품 조합 ÷ 그 가드만 껐을 때의 조합».
 *
 * | 유형 | 끈 가드 | 조합 | 제품 비율 | 정답 가짓수 | 최빈 정답 |
 * |---|---|---|---|---|---|
 * | `121X` | 지름길 | **201** | 81.1% | 61 | 4.98% |
 * | `121X` | $3\nmid m$ | **248** | 65.7% | 61 | 4.44% |
 * | `121X` | $\gcd(3m+n,6(m+n))=1$ | **227** | 71.8% | 63 | 3.52% |
 * | `121X` | $m\ne n$ | **163** | 100.0% | 52 | 4.91% |
 * | `122X` | 지름길 | **288** | 44.1% | 43 | 5.90% |
 * | `122X` | $n-m\ge2$ | **146** | 87.0% | 38 | 5.48% |
 * | `123X` | 지름길 | **2,060** | 82.7% | 62 | 4.85% |
 * | `123X` | 버리는 것 하나 이상 | **2,253** | 75.6% | 69 | 4.31% |
 * | `123X` | 살아남는 것 $3$~$7$ | **2,261** | 75.3% | 76 | 4.82% |
 * | `124X` | 계수 $2$ 이상 | **605,430** | 88.6% | 980 | 1.02% |
 * | `124X` | 나머지 셋(아래) | **536,238** | 100.0% | 931 | 1.15% |
 *
 * 🔴 **`122X` 의 손실이 가장 크다(제품이 44.1%).** 답
 * $\overline{\mathrm{AB}}=(n-m)t$ 가 지면 세 수 $m$·$n$·$P$ 의 한두 번 연산과 자주
 * 겹치기 때문이다 — $|n-m|$ 자체가 그 집합에 **늘 들어 있어** $t=1$ 인 판은
 * **하나도 못 산다**(전수 실측 $0$). 그래서 ⑺ 3 이 걱정하던
 * $\overline{\mathrm{AB}}=(n-m)\times1$ 이라는 아무 일도 안 하는 곱셈이 지면에 없다.
 * 잃은 정답 값 열은 $2,3,4,5,6,7,10,22,26,66$ 이고 그중 일곱이 $10$ 이하라 우연히
 * 맞을 자리가 많은 쪽이다. 최빈은 $5.90\%\to6.30\%$ 로 조금 나빠지지만 문턱
 * $12\%$ 에서 멀다.
 *
 * 🔴 **가드처럼 적혔지만 아무것도 안 자르는 줄이 다섯 있다.** 「이 가드만 껐을 때」가
 * 제품과 **같은 수**를 내는 자리다 — 세어 보기 전에는 알 수 없었고, 세었으니 적는다
 * (2026-08-18 「가드는 망가뜨려 봐야 가드인 줄 안다」).
 *
 *   1. `121X` 의 $m\ne n$ — $\gcd(m,n)=1$ 이라 $m=n$ 은 $m=n=1$ 뿐인데 그때
 *      $\gcd(3m+n,6(m+n))=\gcd(4,12)=4$ 라 **바로 뒤 가드가 이미 잘라 낸다.**
 *   2~4. `124X` 의 $X.\mathrm{who}\ne Y.\mathrm{who}$ · 「죽는 둘은 한 축만」 ·
 *      「축마다 자연수 둘」 — `MONO_EXP_TRIOS` 가 «셋 중 정확히 하나만 음수»를
 *      보장하므로 이 셋은 **정리(불변식)**이지 가드가 아니다. `uniqueMonomialIndex`
 *      가 «단항식이 정확히 하나»를 요구하는 순간 셋이 다 따라온다.
 *   5. `123X` 생성기 안의 `live.length < 3 || dead.length < 1` — **`CANDLE_PAIRS` 가
 *      이미 둘 다 보장한다**(풀이 살아남는 것을 $3$~$7$ 로 묶고 «버리는 것이 없는»
 *      짝을 뺀다). 변이 하네스가 이 줄을 지웠는데 **산출물이 한 글자도 안 바뀌어**
 *      판정을 거부해서 알았다. 🔴 헷갈리지 말 것 — **풀 쪽의 같은 이름 가드는
 *      진짜로 문다**(⑷ 표: 버리는 것 $2{,}253\to1{,}703$ · 살아남는 것 $2{,}261$).
 *      죽은 것은 **생성기 안의 두 번째 확인**뿐이다.
 *
 * 지우지 않고 둔다 — 뜻을 적어 두는 값이 있고, `MONO_EXP_TRIOS` 의 범위를 넓히면
 * 그때는 **진짜로** 물기 때문이다. 대신 시험이 「이 넷은 지금 아무것도 안 자른다」를
 * 전수로 못 박아, 넓혀서 물게 되는 날 그 사실이 드러나게 했다.
 *
 * 🔴 **`124X` 에는 지름길 가드가 없다 — 넣을 자리가 없기 때문이다.** 답이 수가 아니라
 * **단항식**이라 「지면 수의 한두 번 연산」이라는 축이 성립하지 않는다. 그 자리를
 * 대신하는 것이 **「한 축만 봐서는 못 고른다」**는 세 가지 불변식이고(계수는 셋 다
 * 자연수 · $x$ 지수가 자연수인 것이 둘 · $y$ 지수가 자연수인 것이 둘), 시험이 그것을
 * 전량으로 확인한다. 그 셋 가운데 하나라도 깨지면 학생이 **한 번 계산하고 찍을 수
 * 있다** — 그것이 이 유형의 진짜 지름길이다.
 *
 * ## ⑸ 🔴 실측 — 씨앗 블록 넷($20260906$·$900000$·$123456$·$5550000$) × 800판
 *
 * | 유형 | 최빈 정답 (블록 넷) | 해설 최대 px | 서로 다른 정답 | 변형 폭(하한) |
 * |---|---|---|---|---|
 * | `121X` | ⑸-1 참조 | ⑸-1 참조 | ⑸-1 | 6 |
 * | `122X` | ⑸-1 참조 | ⑸-1 참조 | ⑸-1 | 12 |
 * | `123X` | ⑸-1 참조 | ⑸-1 참조 | ⑸-1 | 12 |
 * | `124X` | ⑸-1 참조 | ⑸-1 참조 | ⑸-1 | 12 |
 *
 * ⑸-1 은 시험 파일 머리말에 **잰 값 그대로** 적혀 있다 — 두 곳에 적으면 한쪽만
 * 고쳐도 아무도 모른다. 여기서는 **문턱**만 못 박는다: 최빈 $12\%$ 미만 · 해설
 * $700\mathrm{px}$ 미만 · 변형 폭은 위 표의 하한 이상.
 *
 * ## ⑹ 계약 (이웃 모듈과 한 벌)
 *
 * 1. **정답을 먼저 뽑고 발문을 역산한다.**
 * 2. `facts` 로 정답 문자열을 **다시 지을 수 있다**(시험이 왕복으로 잠근다).
 *    `facts.x` 는 답의 **첫 수** — `121X` 는 넓이, `122X` 는 길이, `123X` 는 합,
 *    `124X` 는 단항식의 **계수**(그래서 계수를 $2$ 이상으로 잡는다).
 * 3. 숫자는 전부 `$...$` 안에 (`elementary/rules` `bareNumbers`).
 * 4. `attempt` 가 다 떨어지면 **던진다** — 조용히 기본값을 내지 않는다.
 * 5. 그림이 없으므로 발문이 **지면을 가리키지 않는다**(`pointsAtFigure`).
 * 6. 🔴 **해설이 걸음을 건너뛰지 않는다.** 후보를 견주는 갈래(`123X`·`124X`)는
 *    **죽는 후보가 왜 죽는지**까지 적는다.
 * 7. 🔴 **낱말 뒤 조사를 손 목록으로 적지 않는다.** 수 뒤 조사는 `m2Josa` 한 곳에서
 *    계산한다(목록이 두 벌이 될 자리가 없다).
 * 8. 🔴 **계수 $1$ 과 지수 $1$ 을 지면에 적지 않는다** — `1k`·`x^{1}` 은 값이 맞아도
 *    지면이 흉하다(`pageSmells`). 그래서 `coefTerm`·`powBody` 한 곳에서 짓는다.
 *
 * ## ⑺ 정찰과 달라진 것 — 근거를 남긴다
 *
 * 1. `121X` 는 처음에 「사각형 $\mathrm{AMGN}$ 의 넓이를 주고 **삼각형
 *    $\mathrm{ABC}$** 의 넓이를 묻는」 판이었다. **바꿨다** — 답이
 *    $\dfrac{6(m+n)}{3m+n}s$ 라 지면 세 수의 한두 번 연산에 걸리는 자리가 많고,
 *    무엇보다 무게중심의 성질을 **한 번만** 쓴다. $\triangle\mathrm{GBC}$ 를 물으면
 *    그 성질을 **끝에서 한 번 더** 써야 하고(전체 → 세 조각), 지름길도 준다.
 * 2. `121X` 의 $m=n=1$ 은 **막았다** — 그때는 $\mathrm{N}$ 도 중점이라 사각형의 넓이가
 *    정확히 $\dfrac13S$ 가 되고 답이 **주어진 값 $s$ 그대로**다(찍으면 맞는다).
 *    🔴 다만 **그 줄이 자르는 것은 아니다**: $\gcd(m,n)=1$ 이라 $m=n$ 은 $m=n=1$
 *    뿐이고, 그때 $\gcd(4,12)=4$ 라 **바로 뒤 가드가 이미 잘라 낸다**(⑷ 실측).
 * 3. `122X` 의 $n-m=1$ 은 **막았다** — 마무리가 $1\times t=t$ 라는 **아무 일도 안 하는
 *    곱셈**이 된다(5차c `110X` 가 눈으로 찾은 그 부류). 이 줄은 **진짜로 문다**
 *    (전수 $146\to127$). 짝인 $t=1$ 은 지름길 가드가 전부 걷어 낸다(⑷).
 * 4. `123X` 는 「$t$ 의 값을 모두 구하시오」가 아니라 **「그 합을 구하시오」**로 냈다.
 *    답이 «나열»이면 파생 오답이 뒤집힌다(㉲, 3차 `35V`). 나열은 해설이 한다.
 * 5. `123X` 는 「버리는 약수가 **적어도 하나**」를 걸었다. 안 걸면 「$t<Q$ 여야 한다」가
 *    아무것도 안 자르는 **장식 걸음**이 된다(4차 `38W` 의 「위끝이 안 닫힌다」와 같은 자리).
 * 6. `124X` 는 「계수가 자연수인 것은 하나뿐」으로 가르지 **않는다.** 그러면 계수만
 *    보고 답을 집을 수 있다 — 그래서 **셋 다 자연수**가 되는 조합만 낸다.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { attempt } from "./m1Shared";
// 지름길 자를 두 벌로 두지 않는다 — 4차 물결 것을 **읽어만** 온다.
import { pageShortcutValues, scaledValues } from "./m1Top4";
import { eulReul, euroRo, waGwa } from "./m2Josa";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";

/**
 * RPM 색인 정본(`scripts/rpm/rpm-type-catalog.json`)의 중단원 이름 — 글자 그대로.
 * 시험이 색인 정본에 **대조**한다(손으로 옮겨 적은 것을 믿지 않는다).
 */
const MINOR_CENTROID = "삼각형의 무게중심";
const MINOR_QUAD = "여러 가지 사각형";
/** 🔴 「그래프」 바로 뒤가 **가는 공백 U+2009**+보통 공백이다 — 눈으로는 안 갈린다. */
const MINOR_FUNC2 = "일차함수와 그 그래프  ⑵";
const MINOR_MONO = "단항식의 계산";

/** 우리 `Unit.section` 정확한 이름 (`prisma/seed-data/units.ts` 실측). */
const SEC = {
  무게중심: "삼각형의 무게중심",
  등변사다리꼴: "등변사다리꼴, 여러 가지 사각형",
  온도길이: "일차함수의 활용(온도, 길이)",
  단항곱나눗: "단항식의 곱셈과 나눗셈",
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

/** 기약분수로 줄인 $\dfrac{n}{d}$ — 분모는 늘 양수. */
export function reduceFraction(n: number, d: number): [number, number] {
  if (d === 0) throw new Error("reduceFraction: 분모가 0 입니다");
  const s = d < 0 ? -1 : 1;
  const g = gcd(n, d) || 1;
  return [(s * n) / g, (s * d) / g];
}

/**
 * 🔴 **이 답이 「지면의 수를 한두 번 더하거나 곱하거나 나눈 값」인가.**
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

/** 보조사 — 받침 판정은 `m2Josa.eulReul` **한 곳**에서 온다. */
function eunNeun(n: number): "은" | "는" {
  return eulReul(n) === "을" ? "은" : "는";
}

/**
 * 🔴 **계수 $1$ 을 지면에 안 적는다** (계약 ⑻). `1k` 는 값이 맞아도 지면이 흉하고
 * `pageSmells` 의 「계수 1 을 적었다」에 걸린다. 규칙을 한 곳에 둔다.
 */
export function coefTerm(c: number, sym: string): string {
  if (!Number.isInteger(c) || c < 1) {
    throw new Error(`coefTerm: 자연수 계수여야 합니다 — ${c}`);
  }
  return c === 1 ? sym : `${c}${sym}`;
}

/**
 * 🔴 **지수 $1$ 을 지면에 안 적는다** (계약 ⑻). `x^{1}` 은 `pageSmells` 의
 * 「지수 1 을 적었다」에 걸린다. 지수는 **자연수**여야 한다 — $0$ 이면 그 문자가
 * 통째로 사라지므로 지면에 쓸 수 없고, 그때는 부르는 쪽이 판단해야 한다.
 */
export function powBody(sym: string, e: number): string {
  if (!Number.isInteger(e) || e < 1) {
    throw new Error(`powBody: 지수가 자연수여야 합니다 — ${e}`);
  }
  return e === 1 ? sym : `${sym}^{${e}}`;
}

/** `$` 없는 단항식 몸통 — `6x^{2}y`. 계수·지수 모두 자연수여야 한다. */
export function monomialBody(c: number, ex: number, ey: number): string {
  return `${coefTerm(c, "")}${powBody("x", ex)}${powBody("y", ey)}`;
}

/** 목록을 `$1$, $2$, $4$` 꼴로. */
function listTex(xs: readonly number[]): string {
  return xs.map((v) => `$${v}$`).join(", ");
}

// ═══════════════════════════════════════════════════════════
// 121X  무게중심이 만든 사각형의 넓이에서 되짚기  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * **굳힘 함수** — 사각형 $\mathrm{AMGN}$ 의 넓이가 $\triangle\mathrm{ABC}$ 넓이의
 * 몇 배인가를 **기약분수**로 낸다.
 *
 * $\mathrm{M}$ 이 $\overline{\mathrm{AB}}$ 의 중점, $\mathrm{N}$ 이
 * $\overline{\mathrm{AN}}:\overline{\mathrm{NC}}=m:n$ 인 점, $\mathrm{G}$ 가
 * 무게중심일 때
 * $\dfrac{[\mathrm{AMGN}]}{[\mathrm{ABC}]}
 *  =\dfrac12\cdot\dfrac1{d}+\dfrac{m}{m+n}\cdot\dfrac1{d}
 *  =\dfrac{(m+n)+2m}{2(m+n)d}$ 이다.
 *
 * 🔴 **`shareDen` 은 «이 비»를 흔든다.** $d$ 를 바꾸면 이 함수의 값이 달라진다
 * (실측: `centroidQuadRatio(2,7)=[13,54]` · `centroidQuadRatio(2,7,4)=[13,72]`).
 *
 * ⚠️ **그런데 그것으로 `centroidPieceArea` 는 못 흔든다** — 검증 회차가 전수로 재어
 *    찾았다. 답은
 *    $\dfrac{[\mathrm{GBC}]}{[\mathrm{AMGN}]}s=\dfrac{1/d}{\frac1{2d}+\frac{m}{(m+n)d}}s
 *     =\dfrac{2(m+n)}{3m+n}s$ 라 **$d$ 가 통째로 약분된다.** 그러니 이 유형이 재는
 *    마디는 「조각이 **셋**이다」가 아니라 **「세 조각의 넓이가 **같다**」**이다 —
 *    학생은 $[\mathrm{ABG}]=[\mathrm{ACG}]=[\mathrm{GBC}]$ 를 써야 $\square$ 를
 *    $[\mathrm{GBC}]$ 로 옮길 수 있고, 그때 «몇 조각인가»는 안 쓰인다.
 *    시험은 그래서 $d$ 로 답을 흔들지 않고, **학생이 실제로 하는 두 실수**
 *    (⒜ $\mathrm{M}$ 이 중점임을 잊는다 ⒝ $\overline{\mathrm{AN}}:\overline{\mathrm{AC}}$
 *    를 $m:n$ 으로 읽는다)를 재현해 답이 달라지는지를 잰다.
 *    $d\ne3$ 은 제품이 안 쓰는 길이지만, **이 비**를 흔드는 자리로는 여전히 값이 있다.
 */
export function centroidQuadRatio(
  m: number,
  n: number,
  shareDen = 3,
): [number, number] {
  if (!Number.isInteger(m) || m < 1 || !Number.isInteger(n) || n < 1) {
    throw new Error(`centroidQuadRatio: 비는 자연수여야 합니다 — ${m}:${n}`);
  }
  if (!Number.isInteger(shareDen) || shareDen < 2) {
    throw new Error(`centroidQuadRatio: 조각 수가 이상합니다 — ${shareDen}`);
  }
  return reduceFraction(m + n + 2 * m, 2 * (m + n) * shareDen);
}

/**
 * 사각형 $\mathrm{AMGN}$ 의 넓이 $s$ 에서 $\triangle\mathrm{GBC}$ 의 넓이로.
 * 정수로 안 떨어지면 `null`(생성에서 애초에 막는다).
 *
 * 🔴 **`shareDen` 은 이 함수의 값을 바꾸지 못한다** — 위에 적은 대로 약분된다
 * (실측: `centroidPieceArea(39,2,7)` 도 `(39,2,7,4)` 도 $54$, 값도 `null` 여부도 같다).
 * 인자로 받아 넘기는 것은 `centroidQuadRatio` 와 **한 벌**임을 드러내기 위해서이고,
 * 「이 인자로 답을 흔들 수 있다」는 뜻이 **아니다**. 시험이 그 사실을 못 박는다.
 */
export function centroidPieceArea(
  s: number,
  m: number,
  n: number,
  shareDen = 3,
): number | null {
  if (!Number.isInteger(s) || s < 1) return null;
  const [rn, rd] = centroidQuadRatio(m, n, shareDen);
  // $S=s\cdot\dfrac{rd}{rn}$ 이고 $[\mathrm{GBC}]=\dfrac{S}{d}$ 다.
  const num = s * rd;
  const den = rn * shareDen;
  if (num % den !== 0) return null;
  return num / den;
}

/**
 * 지면이 깨끗한 $(m,n)$ — 세 가드를 **모두** 통과한 것만.
 *
 *   $\gcd(m,n)=1$              비가 기약이라야 지면이 옳다
 *   $m\ne n$                   $m=n=1$ 이면 답이 주어진 값 그대로다(⑺ 2).
 *                              🔴 **지금은 아무것도 안 자른다** — 아래 네째 줄이
 *                              $\gcd(4,12)=4$ 로 이미 잘라 낸다(⑷ 전수 실측).
 *                              뜻을 적어 두려고 남긴다.
 *   $3\nmid m$                 $\dfrac{m}{3(m+n)}$ 가 기약이라야 한다(㉰)
 *   $\gcd(3m+n,6(m+n))=1$      통분 결과가 기약이라야 한다(㉰)
 */
export const CENTROID_PAIRS: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  for (let m = 1; m <= 9; m += 1) {
    for (let n = 1; n <= 9; n += 1) {
      if (m === n) continue;
      if (gcd(m, n) !== 1) continue;
      if (m % 3 === 0) continue;
      if (gcd(3 * m + n, 6 * (m + n)) !== 1) continue;
      out.push([m, n]);
    }
  }
  return out;
})();

const CENTROID_QUAD: TypeEntry[] = [
  def(
    "2-2",
    MINOR_CENTROID,
    "121X",
    "무게중심이 만든 사각형의 넓이에서 삼각형의 넓이 되짚기",
    SEC.무게중심,
    "심화중",
    (rng): Body =>
      attempt(4000, (): Body | null => {
        const [m, n] = pick(rng, CENTROID_PAIRS);
        const k = intBetween(rng, 1, 12);
        const [rn, rd] = centroidQuadRatio(m, n); // (3m+n) / (6(m+n))
        const s = rn * k;
        if (s < 20 || s > 400) return null; // 지면에 적히는 넓이를 고르게
        const ans = centroidPieceArea(s, m, n);
        if (ans === null) return null;
        const total = ans * 3; // 삼각형 ABC 의 넓이
        // 🔴 ㉠ 지름길 — 지면 세 수 $m$, $n$, $s$ 의 한두 번 연산으로 답이 나오면 버린다.
        if (looksLikeShortcut(ans, [m, n, s])) return null;

        const half = reduceFraction(m, m + n); // AN : AC
        const piece = reduceFraction(m, 3 * (m + n)); // [AGN] / S
        return {
          content:
            `삼각형 $\\mathrm{ABC}$의 무게중심을 $\\mathrm{G}$, 변 $\\mathrm{AB}$의 중점을 ` +
            `$\\mathrm{M}$이라 하고, 변 $\\mathrm{AC}$ 위에 ` +
            `$\\overline{\\mathrm{AN}}:\\overline{\\mathrm{NC}}=${m}:${n}$인 점 $\\mathrm{N}$을 잡았다. ` +
            `사각형 $\\mathrm{AMGN}$의 넓이가 $${s}\\,\\mathrm{cm}^2$일 때, ` +
            `삼각형 $\\mathrm{GBC}$의 넓이를 구하시오.`,
          answer: `$${ans}\\,\\mathrm{cm}^2$`,
          solution: [
            `삼각형 $\\mathrm{ABC}$의 넓이를 $S\\,\\mathrm{cm}^2$라 하자.`,
            `점 $\\mathrm{G}$는 삼각형 $\\mathrm{ABC}$의 무게중심이므로 세 삼각형 $\\mathrm{GAB}$, $\\mathrm{GBC}$, $\\mathrm{GCA}$는 넓이가 같은 세 삼각형이고, 각각의 넓이는 $\\dfrac{1}{3}S$이다.`,
            `점 $\\mathrm{M}$은 변 $\\mathrm{AB}$의 중점이므로 두 삼각형 $\\mathrm{AMG}$와 $\\mathrm{MBG}$는 밑변의 길이가 같고 높이도 같다. 그러므로 삼각형 $\\mathrm{AMG}$의 넓이는 삼각형 $\\mathrm{ABG}$의 넓이의 절반인 $\\dfrac{1}{2}\\times\\dfrac{1}{3}S=\\dfrac{1}{6}S$이다.`,
            `$\\overline{\\mathrm{AN}}:\\overline{\\mathrm{NC}}=${m}:${n}$이므로 $\\overline{\\mathrm{AN}}:\\overline{\\mathrm{AC}}=${m}:${m + n}$이고, 두 삼각형 $\\mathrm{AGN}$과 $\\mathrm{AGC}$는 점 $\\mathrm{G}$에서 변 $\\mathrm{AC}$에 이르는 높이가 같으므로 넓이의 비도 $${m}:${m + n}$이다.`,
            `그러므로 삼각형 $\\mathrm{AGN}$의 넓이는 $\\dfrac{${half[0]}}{${half[1]}}\\times\\dfrac{1}{3}S=\\dfrac{${piece[0]}}{${piece[1]}}S$이다.`,
            `사각형 $\\mathrm{AMGN}$은 대각선 $\\overline{\\mathrm{AG}}$에 의해 두 삼각형 $\\mathrm{AMG}$와 $\\mathrm{AGN}$으로 나누어지므로 그 넓이는 $\\dfrac{1}{6}S+\\dfrac{${piece[0]}}{${piece[1]}}S=\\dfrac{${m + n}+${2 * m}}{${6 * (m + n)}}S$이고, 분자를 계산하면 $${m + n}+${2 * m}=${rn}$이므로 $\\dfrac{${rn}}{${rd}}S$이다.`,
            `이 넓이가 $${s}\\,\\mathrm{cm}^2$이므로 $\\dfrac{${rn}}{${rd}}S=${s}$에서 $S=${s}\\times\\dfrac{${rd}}{${rn}}=${total}$이다.`,
            `삼각형 $\\mathrm{GBC}$의 넓이는 $\\dfrac{1}{3}S$이므로 $${total}$${eulReul(total)} $3$${euroRo(3)} 나누면 된다.`,
            `따라서 삼각형 $\\mathrm{GBC}$의 넓이는 $${ans}\\,\\mathrm{cm}^2$이다. 실제로 $${ans}\\times3=${total}$이다.`,
          ].join("\n"),
          facts: {
            x: ans,
            m,
            n,
            quad: s,
            total,
            ratioNum: rn,
            ratioDen: rd,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 122X  정삼각형이 되는 등변사다리꼴의 다리의 길이  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * **굳힘 함수** — 두 밑변의 비 $m:n$ 과 둘레 $P$ 에서 다리
 * $\overline{\mathrm{AB}}$ 의 길이로.
 *
 * $\mathrm{D}$ 를 지나 $\overline{\mathrm{AB}}$ 에 평행하게 그은 직선이
 * $\overline{\mathrm{BC}}$ 와 만나는 점을 $\mathrm{E}$ 라 하면
 * $\square\mathrm{ABED}$ 는 **평행사변형**이므로
 * $\overline{\mathrm{BE}}=\overline{\mathrm{AD}}$, $\overline{\mathrm{DE}}=\overline{\mathrm{AB}}$ 다.
 * 등변사다리꼴이라 $\overline{\mathrm{AB}}=\overline{\mathrm{DC}}$ 이므로
 * $\triangle\mathrm{DEC}$ 는 이미 이등변삼각형이고, 정삼각형 조건은
 * $\overline{\mathrm{EC}}=\overline{\mathrm{DC}}$, 즉
 * $\overline{\mathrm{AB}}=\overline{\mathrm{BC}}-\overline{\mathrm{AD}}$ 하나로 줄어든다.
 *
 * 🔴 **굳힘의 인자는 `useParallelogram` 이다.** 그 걸음을 빠뜨리면
 * $\overline{\mathrm{EC}}$ 를 $\overline{\mathrm{BC}}$ 로 잘못 읽어 다리가 $n$ 칸이
 * 되고 답이 달라진다 — 학생이 가장 흔히 하는 실수이고, 이 유형이 재려는 마디다.
 * (`false` 는 제품이 안 쓰는 길이다. 시험이 흔들어 잰다.)
 *
 * 둘레가 칸 수로 나누어떨어지지 않으면 그런 사다리꼴이 없으므로 `null`.
 */
export function trapezoidLeg(
  m: number,
  n: number,
  perimeter: number,
  useParallelogram = true,
): number | null {
  if (!Number.isInteger(m) || !Number.isInteger(n) || m < 1 || n <= m) {
    throw new Error(`trapezoidLeg: 비가 이상합니다 — ${m}:${n}`);
  }
  if (!Number.isInteger(perimeter) || perimeter < 1) return null;
  const legUnits = useParallelogram ? n - m : n;
  const units = m + n + 2 * legUnits;
  if (perimeter % units !== 0) return null;
  return legUnits * (perimeter / units);
}

/**
 * 지면이 깨끗한 $(m,n)$ — $\gcd(m,n)=1$ 이고 $n-m\ge2$.
 * $n-m=1$ 이면 마무리가 $1\times t=t$ 라는 **아무 일도 안 하는 곱셈**이 된다(⑺ 3).
 */
export const TRAPEZOID_PAIRS: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  for (let m = 1; m <= 9; m += 1) {
    for (let n = m + 2; n <= 11; n += 1) {
      if (gcd(m, n) !== 1) continue;
      out.push([m, n]);
    }
  }
  return out;
})();

const TRAPEZOID_LEG: TypeEntry[] = [
  def(
    "2-2",
    MINOR_QUAD,
    "122X",
    "정삼각형이 생기는 등변사다리꼴에서 다리의 길이",
    SEC.등변사다리꼴,
    "심화중",
    (rng): Body =>
      attempt(4000, (): Body | null => {
        const [m, n] = pick(rng, TRAPEZOID_PAIRS);
        const t = intBetween(rng, 1, 14);
        const units = 3 * n - m;
        const P = units * t;
        if (P < 24 || P > 220) return null; // 지면에 적히는 둘레를 고르게
        const ans = trapezoidLeg(m, n, P);
        if (ans === null) return null;
        // 🔴 ㉠ 지름길 — 지면 세 수 $m$, $n$, $P$ 의 한두 번 연산으로 답이 나오면 버린다.
        if (looksLikeShortcut(ans, [m, n, P])) return null;

        const leg = n - m;
        return {
          content:
            `등변사다리꼴 $\\mathrm{ABCD}$에서 $\\overline{\\mathrm{AD}}\\parallel\\overline{\\mathrm{BC}}$이고 ` +
            `$\\overline{\\mathrm{AD}}:\\overline{\\mathrm{BC}}=${m}:${n}$이다. ` +
            `꼭짓점 $\\mathrm{D}$를 지나 $\\overline{\\mathrm{AB}}$에 평행하게 그은 직선이 변 $\\mathrm{BC}$와 ` +
            `만나는 점을 $\\mathrm{E}$라 할 때, 삼각형 $\\mathrm{DEC}$는 정삼각형이다. ` +
            `이 등변사다리꼴의 둘레의 길이가 $${P}\\,\\mathrm{cm}$일 때, $\\overline{\\mathrm{AB}}$의 길이를 구하시오.`,
          answer: `$${ans}\\,\\mathrm{cm}$`,
          solution: [
            `등변사다리꼴에서 평행하지 않은 두 변의 길이는 같으므로 $\\overline{\\mathrm{AB}}=\\overline{\\mathrm{DC}}$이다.`,
            `사각형 $\\mathrm{ABED}$는 $\\overline{\\mathrm{AD}}\\parallel\\overline{\\mathrm{BE}}$이고 $\\overline{\\mathrm{AB}}\\parallel\\overline{\\mathrm{DE}}$이므로 두 쌍의 대변이 각각 평행한 평행사변형이다.`,
            `평행사변형에서 두 쌍의 대변의 길이는 각각 같으므로 $\\overline{\\mathrm{DE}}=\\overline{\\mathrm{AB}}$, $\\overline{\\mathrm{BE}}=\\overline{\\mathrm{AD}}$이다.`,
            `그러면 $\\overline{\\mathrm{DE}}=\\overline{\\mathrm{AB}}=\\overline{\\mathrm{DC}}$이므로 삼각형 $\\mathrm{DEC}$는 이미 이등변삼각형이고, 정삼각형이 되려면 나머지 한 변이 같아야 하므로 $\\overline{\\mathrm{EC}}=\\overline{\\mathrm{DC}}$이어야 한다.`,
            `$\\overline{\\mathrm{EC}}=\\overline{\\mathrm{BC}}-\\overline{\\mathrm{BE}}=\\overline{\\mathrm{BC}}-\\overline{\\mathrm{AD}}$이므로 $\\overline{\\mathrm{AB}}=\\overline{\\mathrm{BC}}-\\overline{\\mathrm{AD}}$이다.`,
            `$\\overline{\\mathrm{AD}}:\\overline{\\mathrm{BC}}=${m}:${n}$이므로 $\\overline{\\mathrm{AD}}=${coefTerm(m, "k")}\\,\\mathrm{cm}$, $\\overline{\\mathrm{BC}}=${coefTerm(n, "k")}\\,\\mathrm{cm}$인 양수 $k$가 있고, 이때 $\\overline{\\mathrm{AB}}=\\overline{\\mathrm{DC}}=${coefTerm(leg, "k")}\\,\\mathrm{cm}$이다.`,
            `네 변의 길이의 합은 $${coefTerm(m, "k")}+${coefTerm(n, "k")}+${coefTerm(leg, "k")}+${coefTerm(leg, "k")}=${coefTerm(units, "k")}$이고 이 값이 $${P}$이므로, $${P}$${eulReul(P)} $${units}$${euroRo(units)} 나누면 $k=${t}$이다.`,
            `따라서 $\\overline{\\mathrm{AB}}$의 길이는 $${leg}\\times${t}=${ans}\\,(\\mathrm{cm})$이다.`,
          ].join("\n"),
          facts: {
            x: ans,
            m,
            n,
            perimeter: P,
            unit: t,
            legUnits: leg,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 123X  두 양초의 길이가 같아지는 시각의 후보를 모두 세기  (심화상)
// ═══════════════════════════════════════════════════════════

/** 작은 것부터 늘어놓은 약수 전부. */
export function divisorsOf(n: number): number[] {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`divisorsOf: 자연수여야 합니다 — ${n}`);
  }
  const out: number[] = [];
  for (let d = 1; d * d <= n; d += 1) {
    if (n % d !== 0) continue;
    out.push(d);
    if (d !== n / d) out.push(n / d);
  }
  return out.sort((a, b) => a - b);
}

/**
 * **굳힘 함수** — 두 양초의 길이가 같아질 수 있는 시각 $t$ 를 **모두**.
 *
 * $1$분에 짧아지는 길이를 $a$, $b$ ($a>b$, 둘 다 자연수)라 하면
 * $P-at=Q-bt$ 에서 $(a-b)t=P-Q$ 이므로 $t$ 는 $P-Q$ 의 **약수**다.
 * 여기에 「그때 짧은 양초가 아직 남아 있다」는 조건이 붙는다 — $bt<Q$ 인데
 * $b\ge1$ 이므로 $t<Q$ 여야 하고, $t\ge Q$ 인 약수는 **버린다**.
 *
 * 🔴 **굳힘의 인자는 `prune` 이다.** 버리는 걸음을 빠뜨리면 답이 커진다 —
 * 이 유형이 재려는 바로 그 마디다. (`false` 는 제품이 안 쓰는 길이다.
 * 시험이 흔들어 잰다.)
 */
export function survivingTimes(
  diff: number,
  shorter: number,
  prune = true,
): number[] {
  if (!Number.isInteger(diff) || diff < 1) {
    throw new Error(`survivingTimes: 길이 차가 자연수여야 합니다 — ${diff}`);
  }
  if (!Number.isInteger(shorter) || shorter < 1) {
    throw new Error(
      `survivingTimes: 짧은 양초의 길이가 자연수여야 합니다 — ${shorter}`,
    );
  }
  const divs = divisorsOf(diff);
  return prune ? divs.filter((d) => d < shorter) : divs;
}

/**
 * 지면이 깨끗한 $(\text{길이 차},\ \text{짧은 양초})$ 짝 — 다섯 가드를 모두 통과한 것.
 *
 *   약수가 $6$~$12$개          너무 적으면 「모두」가 무색하고 많으면 줄이 넘친다(㉮)
 *   살아남는 것이 $3$~$7$개    나열 줄의 길이를 잡는다(㉮)
 *   버리는 것이 하나 이상      안 걸면 「$t<Q$ 여야 한다」가 장식이 된다(⑺ 5)
 *   긴 양초가 $200$ 이하       지면의 수를 사람이 읽을 만한 크기로
 *
 * ⚠️ **매개변수를 고르게 뽑는 것과 산출물이 고른 것은 다른 말이다**(5차c 실측).
 *    그래서 $(D,Q)$ 를 각각 `intBetween` 으로 뽑지 않고 **짝을 전수로 만들어**
 *    `pick` 으로 고르게 뽑는다.
 */
export const CANDLE_PAIRS: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  for (let d = 12; d <= 120; d += 1) {
    const divs = divisorsOf(d);
    if (divs.length < 6 || divs.length > 12) continue;
    for (let q = 6; q <= 90; q += 1) {
      const live = divs.filter((v) => v < q);
      if (live.length < 3 || live.length > 7) continue;
      if (live.length === divs.length) continue; // 버리는 것이 없다
      if (q + d > 200) continue;
      out.push([d, q]);
    }
  }
  return out;
})();

const CANDLE_TIMES: TypeEntry[] = [
  def(
    "2-1",
    MINOR_FUNC2,
    "123X",
    "두 양초의 길이가 같아지는 시각을 모두 구하기",
    SEC.온도길이,
    "심화상",
    (rng): Body =>
      attempt(4000, (): Body | null => {
        const [D, Q] = pick(rng, CANDLE_PAIRS);
        const P = Q + D;
        const divs = divisorsOf(D);
        const live = survivingTimes(D, Q);
        const dead = divs.filter((v) => v >= Q);
        if (live.length < 3 || dead.length < 1) return null;
        const ans = live.reduce((a, b) => a + b, 0);
        // 🔴 ㉠ 지름길 — 지면 두 수 $P$, $Q$ 의 한두 번 연산으로 답이 나오면 버린다.
        if (looksLikeShortcut(ans, [P, Q])) return null;

        return {
          content:
            `길이가 $${P}\\,\\mathrm{cm}$인 양초 $\\mathrm{A}$와 길이가 $${Q}\\,\\mathrm{cm}$인 양초 $\\mathrm{B}$에 ` +
            `동시에 불을 붙였다. 두 양초는 각각 $1$분에 일정한 길이만큼 짧아지고, ` +
            `$1$분에 짧아지는 길이는 둘 다 자연수 $\\mathrm{cm}$이다. ` +
            `불을 붙인 지 $t$분 후에 두 양초의 길이가 처음으로 같아졌고, ` +
            `그때 두 양초는 모두 다 타지 않고 남아 있었다. ` +
            `자연수 $t$의 값을 모두 구하여 그 합을 구하시오.`,
          answer: `$${ans}$`,
          solution: [
            `양초 $\\mathrm{A}$와 $\\mathrm{B}$가 $1$분에 짧아지는 길이를 각각 $a\\,\\mathrm{cm}$, $b\\,\\mathrm{cm}$라 하자. 여기서 $a$와 $b$는 자연수이다.`,
            `불을 붙인 지 $x$분 후의 두 양초의 길이는 각각 $(${P}-ax)\\,\\mathrm{cm}$, $(${Q}-bx)\\,\\mathrm{cm}$이다.`,
            `$x=t$일 때 두 길이가 같으므로 $${P}-at=${Q}-bt$이고, 양변을 정리하면 $(a-b)t=${P}-${Q}=${D}$이다.`,
            `$a$와 $b$가 자연수이고 처음에 긴 양초가 더 빨리 짧아져야 하므로 $a-b$도 자연수이다. 그러므로 $t$는 $${D}$의 약수이고, 그 약수는 ${listTex(divs)}이다.`,
            `한편 $t$분 후에 양초 $\\mathrm{B}$가 남아 있어야 하므로 $bt<${Q}$이고, $b$는 $1$ 이상이므로 $t<${Q}$이어야 한다. 즉 $t$가 $${Q}$${eulReul(Q)} 넘거나 $${Q}$${waGwa(Q)} 같으면 양초 $\\mathrm{B}$는 이미 다 타 버린다.`,
            `그러므로 $${D}$의 약수 가운데 ${listTex(dead)}${eunNeun(dead[dead.length - 1]!)} 조건을 만족하지 않고, 남는 것은 ${listTex(live)}의 $${live.length}$개이다.`,
            `이 $${live.length}$개의 값은 모두 조건을 만족한다. 이를테면 $t=${live[live.length - 1]}$일 때 $a-b=${D / live[live.length - 1]!}$이고 $b=1$로 잡으면 두 양초의 길이가 모두 양수이다.`,
            `따라서 구하는 합은 $${live.join("+")}=${ans}$이다.`,
          ].join("\n"),
          facts: {
            x: ans,
            longer: P,
            shorter: Q,
            diff: D,
            count: live.length,
            dropped: dead.length,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 124X  세 단항식으로 만든 세 계산 중 단항식이 되는 것  (심화상)
// ═══════════════════════════════════════════════════════════

export type MonomialTriple = {
  /** 계수 셋 — $A$, $B$, $C$ 의 차례. */
  coefs: readonly [number, number, number];
  /** $x$ 의 지수 셋. */
  xs: readonly [number, number, number];
  /** $y$ 의 지수 셋. */
  ys: readonly [number, number, number];
};

/** 한 계산 결과 — $A\times B\div C$ 꼴 셋의 하나. */
export type MonomialResult = { coef: number; ex: number; ey: number };

/**
 * **굳힘 함수** — 「둘을 곱하고 남은 하나로 나누기」 세 가지의 결과.
 *
 * 차례는 $A\times B\div C$, $B\times C\div A$, $C\times A\div B$ 다.
 * $i$ 번째 결과의 지수는 «나머지 둘의 합에서 자기 것을 뺀 값»이 아니라
 * **«자기와 다음 것의 합에서 그 다음 것을 뺀 값»** 임에 주의한다.
 */
export function monomialResults(t: MonomialTriple): MonomialResult[] {
  const out: MonomialResult[] = [];
  for (let i = 0; i < 3; i += 1) {
    const j = (i + 1) % 3;
    const k = (i + 2) % 3;
    out.push({
      coef: (t.coefs[i]! * t.coefs[j]!) / t.coefs[k]!,
      ex: t.xs[i]! + t.xs[j]! - t.xs[k]!,
      ey: t.ys[i]! + t.ys[j]! - t.ys[k]!,
    });
  }
  return out;
}

/**
 * 세 결과 가운데 **단항식이 되는 것**의 자리. 하나가 아니면 `null`.
 *
 * 🔴 **굳힘의 인자는 `requireNaturalExponents` 다.** 「지수가 자연수라야 단항식」이
 * 이 유형이 재려는 마디이고, 그것을 빼면 셋이 다 통과해 답이 안 정해진다.
 * (`false` 는 제품이 안 쓰는 길이다. 시험이 흔들어 잰다.)
 */
export function uniqueMonomialIndex(
  t: MonomialTriple,
  requireNaturalExponents = true,
): number | null {
  const rs = monomialResults(t);
  const ok: number[] = [];
  for (let i = 0; i < 3; i += 1) {
    const r = rs[i]!;
    if (!Number.isInteger(r.coef) || r.coef < 1) continue;
    if (requireNaturalExponents && (r.ex < 1 || r.ey < 1)) continue;
    ok.push(i);
  }
  return ok.length === 1 ? ok[0]! : null;
}

/**
 * 계수 셋 — 세 몫 $\dfrac{pq}{r}$, $\dfrac{qr}{p}$, $\dfrac{rp}{q}$ 가 **모두**
 * 자연수인 것만. 셋 다 자연수라야 **계수만 보고는 못 가른다**(⑺ 6).
 *
 * $p,q,r\ge2$ 로 묶는 까닭은 $1\times q=q$ 라는 **아무 일도 안 하는 곱셈**이
 * 지면에 나가지 않게 하기 위해서다.
 */
export const MONO_COEF_TRIOS: readonly (readonly [number, number, number])[] =
  (() => {
    const out: [number, number, number][] = [];
    for (let p = 2; p <= 12; p += 1) {
      for (let q = 2; q <= 12; q += 1) {
        for (let r = 2; r <= 12; r += 1) {
          const c = [(p * q) / r, (q * r) / p, (r * p) / q];
          if (c.some((v) => !Number.isInteger(v) || v < 1)) continue;
          if (new Set(c).size < 2) continue; // 셋이 다 같으면 지면이 밋밋하다
          if (Math.max(...c) > 144) continue;
          out.push([p, q, r]);
        }
      }
    }
    return out;
  })();

/**
 * 지수 셋 — 세 결과의 지수 $(a+b-c,\ b+c-a,\ c+a-b)$ 가운데 **정확히 하나만**
 * 음수이고 나머지 둘은 $1$ 이상인 것.
 *
 * 🔴 셋 가운데 둘 이상이 $0$ 이하가 되는 일은 **구조적으로 없다** — 이웃한 두 값의
 * 합이 $2b$, $2c$, $2a$ 로 늘 양수이기 때문이다. 그래서 한 축은 후보를 **하나만**
 * 죽일 수 있고, $x$ 축과 $y$ 축이 **서로 다른 후보**를 죽여야 하나가 남는다.
 * `who` 는 그 축이 죽이는 자리다.
 */
export const MONO_EXP_TRIOS: readonly {
  base: readonly [number, number, number];
  results: readonly [number, number, number];
  who: number;
}[] = (() => {
  const out: {
    base: [number, number, number];
    results: [number, number, number];
    who: number;
  }[] = [];
  for (let a = 1; a <= 7; a += 1) {
    for (let b = 1; b <= 7; b += 1) {
      for (let c = 1; c <= 7; c += 1) {
        const results: [number, number, number] = [
          a + b - c,
          b + c - a,
          c + a - b,
        ];
        if (results.some((v) => v === 0)) continue;
        const neg = results.filter((v) => v < 0);
        if (neg.length !== 1) continue;
        if (Math.max(...results) > 9) continue;
        out.push({
          base: [a, b, c],
          results,
          who: results.findIndex((v) => v < 0),
        });
      }
    }
  }
  return out;
})();

/** 계산 결과를 `$` 없는 지면 글자로 — 단항식이면 그대로, 아니면 분수 꼴. */
export function resultBody(r: MonomialResult): string {
  if (r.ex >= 1 && r.ey >= 1) return monomialBody(r.coef, r.ex, r.ey);
  if (r.ex <= -1 && r.ey >= 1) {
    return `\\dfrac{${coefTerm(r.coef, "")}${powBody("y", r.ey)}}{${powBody("x", -r.ex)}}`;
  }
  if (r.ey <= -1 && r.ex >= 1) {
    return `\\dfrac{${coefTerm(r.coef, "")}${powBody("x", r.ex)}}{${powBody("y", -r.ey)}}`;
  }
  throw new Error(
    `resultBody: 지면에 쓸 수 없는 모양 — 계수 ${r.coef}, 지수 ${r.ex}, ${r.ey}`,
  );
}

const LABELS = [
  "A\\times B\\div C",
  "B\\times C\\div A",
  "C\\times A\\div B",
] as const;

const MONOMIAL_PICK: TypeEntry[] = [
  def(
    "2-1",
    MINOR_MONO,
    "124X",
    "세 단항식으로 만든 세 계산 중 단항식이 되는 것 찾기",
    SEC.단항곱나눗,
    "심화상",
    (rng): Body =>
      attempt(6000, (): Body | null => {
        const X = pick(rng, MONO_EXP_TRIOS);
        const Y = pick(rng, MONO_EXP_TRIOS);
        // 같은 자리를 두 번 죽이면 둘이 살아남는다.
        // 🔴 **지금은 아무것도 안 자른다** — 그때는 `uniqueMonomialIndex` 가 `null`
        //    을 내므로 아래 줄이 이미 막는다(⑷ 전수 실측). 뜻을 적어 두려고 남긴다.
        if (X.who === Y.who) return null;
        const [p, q, r] = pick(rng, MONO_COEF_TRIOS);
        const triple: MonomialTriple = {
          coefs: [p, q, r],
          xs: X.base,
          ys: Y.base,
        };
        const win = uniqueMonomialIndex(triple);
        if (win === null) return null;
        const rs = monomialResults(triple);
        const winner = rs[win]!;
        if (winner.coef < 2) return null; // 계약 ⑹.2 — 답의 첫 수가 계수여야 한다
        // 죽는 둘은 **한 축만** 음수라야 지면이 분수 하나로 깨끗하다.
        // 🔴 아래 둘은 **가드가 아니라 불변식**이다 — `MONO_EXP_TRIOS` 가 「셋 중
        //    정확히 하나만 음수」를 보장하므로 전수에서 **한 조합도 안 자른다**(⑷).
        //    범위를 넓히면 그때는 진짜로 물기 때문에 지우지 않고 둔다.
        for (let i = 0; i < 3; i += 1) {
          if (i === win) continue;
          const bad = rs[i]!;
          if (bad.ex <= -1 && bad.ey <= -1) return null;
          if (bad.ex >= 1 && bad.ey >= 1) return null;
        }
        // 🔴 ⑷ **한 축만 봐서는 못 고른다** — 계수는 셋 다 자연수(위 목록이 보장),
        //    $x$ 지수가 자연수인 것도 둘, $y$ 지수가 자연수인 것도 둘이라야 한다.
        if (rs.filter((v) => v.ex >= 1).length !== 2) return null;
        if (rs.filter((v) => v.ey >= 1).length !== 2) return null;

        const deadX = X.who;
        const deadY = Y.who;
        const lines = [
          `세 가지 계산 결과를 차례로 구한다. 세 계산의 계수는 모두 자연수이므로 계수만으로는 가릴 수 없고, $x$와 $y$의 지수를 각각 따져야 한다.`,
        ];
        for (let i = 0; i < 3; i += 1) {
          const j = (i + 1) % 3;
          const k = (i + 2) % 3;
          const prod = triple.coefs[i]! * triple.coefs[j]!;
          lines.push(
            `$${LABELS[i]}$에서 계수는 $${triple.coefs[i]}\\times${triple.coefs[j]}=${prod}$${eulReul(prod)} ` +
              `$${triple.coefs[k]}$${euroRo(triple.coefs[k]!)} 나눈 $${rs[i]!.coef}$이고, ` +
              `$x$의 지수는 $${triple.xs[i]}+${triple.xs[j]}-${triple.xs[k]}=${rs[i]!.ex}$, ` +
              `$y$의 지수는 $${triple.ys[i]}+${triple.ys[j]}-${triple.ys[k]}=${rs[i]!.ey}$이다. ` +
              `그러므로 $${LABELS[i]}=${resultBody(rs[i]!)}$이다.`,
          );
        }
        lines.push(
          `$${LABELS[deadX]}$는 $x$의 지수가 $${rs[deadX]!.ex}$${euroRo(rs[deadX]!.ex)} 음수이므로 $x$가 분모에 남는다. 그러므로 단항식이 아니다.`,
          `$${LABELS[deadY]}$는 $y$의 지수가 $${rs[deadY]!.ey}$${euroRo(rs[deadY]!.ey)} 음수이므로 $y$가 분모에 남는다. 그러므로 단항식이 아니다.`,
          `따라서 단항식이 되는 것은 $${LABELS[win]}$ 하나뿐이고, 그 단항식은 $${monomialBody(winner.coef, winner.ex, winner.ey)}$이다.`,
        );

        return {
          content:
            `세 단항식 $A=${monomialBody(p, X.base[0], Y.base[0])}$, ` +
            `$B=${monomialBody(q, X.base[1], Y.base[1])}$, ` +
            `$C=${monomialBody(r, X.base[2], Y.base[2])}$ 중에서 ` +
            `두 개를 곱한 다음 남은 하나로 나누는 계산을 하면 ` +
            `서로 다른 세 가지 결과를 얻는다. 그 세 가지 가운데 단항식이 되는 것은 ` +
            `오직 하나이고 나머지 둘은 분모에 문자가 남는다. 단항식이 되는 것을 구하시오.`,
          answer: `$${monomialBody(winner.coef, winner.ex, winner.ey)}$`,
          solution: lines.join("\n"),
          facts: {
            x: winner.coef,
            ex: winner.ex,
            ey: winner.ey,
            win,
            ca: p,
            cb: q,
            cc: r,
            xa: X.base[0],
            xb: X.base[1],
            xc: X.base[2],
            ya: Y.base[0],
            yb: Y.base[1],
            yc: Y.base[2],
          },
          figureSpec: null,
        };
      }),
  ),
];

/** 중2 5차 물결 갈래 `f` — 소단원 넷, 접미사 `X`. */
export const M2_TOP_5F: TypeEntry[] = [
  ...CENTROID_QUAD,
  ...TRAPEZOID_LEG,
  ...CANDLE_TIMES,
  ...MONOMIAL_PICK,
];
