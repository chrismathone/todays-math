/**
 * 중2 **확대 갈래 5차 물결**(`심화중`·`심화상`) — D-116, 접미사 **`X`**, 갈래 `m2Top5b`.
 *
 * ## ⑴ 왜 새 파일인가
 *
 * 4차(`m2Top4.ts`) 머리말과 같은 까닭이다 — 남의 모듈을 잠그는 개수 검사를 무르지
 * 않으려고, 그리고 오르카 다중 세션 스물하나가 **동시에** 도는 동안 같은 파일에서
 * 부딪히지 않으려고 **새 파일 하나 + `generate.ts` spread 한 줄**로 붙인다.
 * 그 한 줄은 **리드가** 넣는다 — 이 파일은 `generate.ts` 를 건드리지 않는다.
 *
 * 착수 전에 「이 넷을 더하면 남의 모듈 개수 검사가 빨개지는가」를 **읽어서** 확인했다:
 * `middleM2Center`·`middleM2GeoQuad`·`middleM2Func`·`middleM2IneqApply` 는 전부
 * 자기 모듈 배열(`M2_CENTER`·`M2_GEO_QUAD`·`M2_FUNC`·`M2_INEQ_APPLY`)을 세지
 * `registeredTypes()` 를 소단원으로 거르지 않는다. 등록 뒤 전량 관문이 그 사실의
 * 참을 가린다 — 여기서 「없다」고 단정하지 않고 **리드가 병합 때 다시 본다**.
 *
 * ## ⑵ 유형마다 — 안 굳는 마디 / 무엇이 굳히나 / 같은 소단원과 무엇이 다른가
 *
 * | 키 | 갈래 | 안 굳는 마디 | 무엇이 굳히나 | 같은 소단원의 아래 갈래와 다른 축 |
 * |---|---|---|---|---|
 * | `삼각형의 외심과 내심\|105X` | **심화중** | 세 각 $\angle OAB$, $\angle OBC$, $\angle OCA$ — **한 각도 주어지지 않는다.** 비만 있으니 크기가 안 정해진 것처럼 보인다 | 이 소단원의 개념 **하나**가 정리해 준다 — 외심이면 $\overline{OA}=\overline{OB}=\overline{OC}$ 라 세 삼각형이 이등변삼각형이고, 삼각형의 세 내각이 그 여섯 각으로 **두 개씩** 나뉘므로 $2(\angle OAB+\angle OBC+\angle OCA)=180^\circ$, 즉 **세 각의 합이 $90^\circ$** 다. 합이 굳으면 비가 셋을 다 굳힌다 | 색인 `01`·`70` 은 세 각 가운데 **둘을 주고** 나머지 하나를 묻는다(합 $90^\circ$ 한 줄로 끝난다). `04`·`05` 는 각을 **도 단위로** 준다. 심화하 `13`·`73` 은 **직각삼각형**에 갇혀 있고 각이 아니라 길이를 묻는다. `105X` 는 주어진 것이 **비뿐**이라 「합이 $90^\circ$」를 **먼저 세우지 않으면 한 각도 못 구하고**, 그 뒤에 이등변삼각형으로 중심각까지 한 걸음 더 간다 |
 * | `일차부등식의 활용\|106X` | **심화중** | 길이가 같은 두 변의 길이 $x$ — 끈 하나로 만들 수 있는 삼각형이 여럿이라 안 정해진다 | 이 소단원의 개념 **하나**(일차부등식)가 $x$ 를 **닫힌 범위**로 정리해 준다. 위끝은 「밑변이 $m$ 이상」, 아래끝은 「두 변의 합이 나머지 한 변보다 크다」에서 나오고, 둘 다 **일차부등식**이라 그 범위 안 자연수를 세면 끝난다 | 색인 `08`·`22`·`23` 은 부등식 **하나**로 「최대 몇 $\mathrm{cm}$」를 묻는다(답이 경계 그 자체다). 심화하 `10`·`11`·`28` 도 부등식 하나짜리 속력 문제다. `106X` 는 부등식이 **둘**이고 서로 **다른 뿌리**에서 나오며(하나는 조건, 하나는 삼각형이 되기 위한 성질), 답이 경계가 아니라 **두 경계 사이 자연수의 개수**다 |
 * | `일차함수와 그 그래프  ⑴\|107X` | **심화상** | 상수 $a$ — **끝까지 안 굳는다.** $f(m)=k$ 하나로는 $(a,b)$ 가 여러 쌍 살아남고 **그 전부가 답에 들어간다** | 굳히는 것이 **없다.** 「$b$ 가 자연수」는 $a$ 를 **고르지 않는다** — 목록을 만들어 줄 뿐이라, 후보를 다 세우고 각각의 $f(n)$ 을 계산해 더해야 한다. 이것이 심화중(값이 하나로 굳는다)과 심화상(끝까지 여럿이 남는다)을 가르는 자리다 | 색인 `70`·`71`·`72`·`74` 와 심화하 `75` 는 전부 **정방향**이고 미지 상수가 **하나로 굳는다**(식이 미지수 수만큼 있다). `107X` 는 식이 **하나 모자라고**, 모자란 자리를 「자연수」라는 **정수 조건**이 메우는데 그것은 값을 하나로 좁히지 못한다 |
 * | `여러 가지 사각형\|108X` | **심화상** | 두 대각선의 길이 $p$, $q$ — **둘 다 미지인데 식이 하나**($pq=2S$)뿐이다 | 굳히는 것이 **없다.** 「자연수」와 「차가 $D$ 이상」은 후보를 **거를** 뿐 고르지 않는다 — 약수 짝을 다 적고, 조건에 걸리는 것을 **왜 걸리는지 적어 가며** 버린 뒤, 남은 것들의 합을 **견주어야** 가장 작은 값이 나온다. 게다가 버려지는 짝 가운데 합이 **더 작은 것**이 반드시 있어서, 「가장 가까운 두 수」로 찍으면 틀린다 | 색인 `25`(기본)는 대각선 **하나와 넓이**를 주고 나머지 하나를 묻는다 — 나눗셈 한 번이다. `24`·`26` 도 한 걸음이고, 심화하 `27` 은 각을 묻는다. `108X` 는 대각선이 **둘 다 미지**라 넓이식이 «약수 짝 열거»로 바뀌고, 거기서 조건으로 거른 뒤 **합을 견주는** 걸음이 하나 더 붙는다 |
 *
 * ## ⑶ 🔴 앞 물결들이 **실제로 새어 나간 자리** — 여기서 어떻게 막았나
 *
 * 전부 「값은 맞고 KaTeX 도 초록」이라 값 검산·냄새·조사 자가 구조적으로 못 보던 부류다.
 *
 * ㉮ **해설이 정답지 한 단을 넘었다**(3차 중1 `53V`, 1242px). → 넷 다 제품
 *    `estimateSolutionPx` 로 **800판**을 재어 잠근다. 실측 최대는 ⑸ 에 적었다.
 *    그렇다고 **걸음을 지우지 않는다**(D-116 ⑹) — `108X` 의 짝 나열은 **네~여섯 짝**
 *    으로 묶고(`all.length` 상한), `107X` 의 후보는 **셋~여섯**으로 묶었다.
 * ㉯ **해설이 「자연수」 걸음을 건너뛰었다**(3차 중2 `38V`). → `106X`·`107X` 는 경계가
 *    **분수**로 나오는 조합만 낸다(`106X` 는 위·아래 **둘 다**). 참 경계 분수를
 *    **기약으로 적고** 「$x$는 자연수이므로」를 그 자리에서 말한다. 시험이 그 두 줄을
 *    `boundStepFault` 로 따로 잰다 — 우리 부등식은 `\le`·`\ge` 꼴이라 공용 훑개
 *    (`probe-middle-extending-tiers.boundStepFaults`)와 겹치지만, **남의 파일에
 *    기대지 않고** 이 물결의 시험이 자기 판을 들고 있다.
 * ㉰ **해설이 기약이 아닌 분수를 찍었다**(3차 중1 `52V`). → 지면에 나오는 분수는
 *    `106X` 의 두 경계와 `107X` 의 한 경계, `108X` 의 $\dfrac{1}{2}$ 뿐이고 전부
 *    `reduceFraction` 을 거친다. `107X` 는 $\gcd(k-1,\ m)=1$ 인 조합만 내므로
 *    $\dfrac{k-1}{m}$ 이 **약분될 자리가 없다**(안 걸면 $\dfrac{8}{6}$ 이 나온다).
 * ㉱ **발문이 스스로 못 박은 상한을 오답이 넘었다**(4차 중2 `37W`, 51.7%). → 넷 다
 *    「전체를 $1$로 놓고」류의 **상한을 선언하지 않는다** — 공용 `declaredUpperBound`
 *    가 넷 전량에서 `null` 이라는 것을 시험이 800판으로 확인한다. 그러므로 그
 *    파생 오답 결함은 이 넷에서 **구조적으로 못 난다**(못 나는 것이 확인된 것이지,
 *    「안 봤다」가 아니다).
 * ㉲ **정답이 «구간»이면 파생 오답이 뒤집힌다**(3차 중2 `35V`). → 넷 다 정답이
 *    **한 값**이다(각·개수·합·길이). 구간 답이 없으므로 그 대가를 안 치른다.
 * ㉳ 🔴 **해설의 «말»을 지키는 시험이 없었다**(4차, 중1 10줄·중2 3줄 무방비).
 *    → 굳힘과 마무리 논거를 진술하는 줄마다 시험이 **낱말을 읽고**, 그 낱말을
 *    뒤집으면 빨개지는 **양성·음성 눈금**을 같이 둔다(`WORDS`/`FLIPS`).
 *    이 물결이 지키는 말: `105X` 「이등변삼각형」·「$180^\circ$」·「$90^\circ$」,
 *    `106X` 「보다 커야」·「자연수이므로」, `107X` 「자연수이므로」·「서로 다르므로」,
 *    `108X` 「약수」·「차가」·「가장 작은」.
 * ㉴ 🔴 **지면이 자기가 한 줄 앞에 세운 제약을 스스로 어긴다**(4차 중3 `55W`, 100%).
 *    → `108X` 는 $p<q$ 를 선언하고 **그 뒤 모든 짝이 그 제약 안**이다. 그리고
 *    「모두 적으면」이라고 선언하므로 $2S$ 가 제곱수인 조합을 안 낸다 — 그때는
 *    짝 $(\sqrt{2S},\ \sqrt{2S})$ 가 $p<q$ 목록에서 빠져 「모두」가 거짓이 된다.
 *    `105X` 는 「세 각의 합이 $90^\circ$」를 선언하고 그 뒤 세 값의 합을 **실제로
 *    적어 확인**한다. `106X` 는 「밑변이 $m$ 이상」을 선언하고 두 끝에서 그것을
 *    **값으로 확인**한다. 시험이 그 불변식들을 지면 글자에서 다시 잰다.
 * ㉵ 🔴 **자료를 정렬해 찍으면 «보이는 자리»가 순위를 암시한다**(4차 중1 `63W`, 100%).
 *    → `105X` 의 비 $p:q:r$ 은 **정렬하지 않는다**(세 값을 따로 뽑는다. 정렬하면
 *    「가운데 항이 가운데 각」이라는 참인 암시가 생겨 학생이 계산을 건너뛴다).
 *    `108X` 의 짝 나열은 **자료가 아니라 해설의 열거**라 이 결함의 부류가 아니다 —
 *    그래도 「$p$ 가 작은 것부터」라고 **차례를 말로 밝히고** 적는다.
 * ㉶ 🔴 **D-20 손실 원장은 «재현 가능»해야 한다**(4차 중1 `62W`). → ⑷ 의 표는
 *    가드를 **하나씩만** 끈 전수 조사다. 판 수와 정답 가짓수를 **같은 자리**에서
 *    세고, 「전수」와 「표본」을 섞지 않는다.
 * ㉷ **내보낸 순수 함수의 주석이 코드와 어긋나면 안 된다**(4차 중3 `solveBoxCases`).
 *    → 내보낸 굳힘 함수 넷(`circumAngles`·`isoscelesRange`·`naturalSlopes`·
 *    `diagonalPairs`)의 인자 뜻을 시험이 **흔들어서** 잰다(늘 참인 죽은 조건 없음).
 * ㉸ 우리말 — 「그중」은 붙여 쓴다. 수 뒤 조사는 지면에 **찍히는 글자**로 정한다
 *    (`m2Josa` 의 `eulReul`·`euroRo`, 그리고 그 둘에서 파생한 `iGa`·`eunNeun`).
 *    문자 뒤 조사(「$p$와 $q$가」)는 수 읽기가 아니라 **알파벳 읽기**라 그 함수들이
 *    쓸 수 없다 — 그 자리는 글자 그대로 적는다(`waGwa(0)` 을 부르면 「과」가 나온다).
 *
 * ## ⑷ 🔴 손실 원장 (D-20 · ㉶) — 어림하지 않고 **전수로 센 값**
 *
 * 🔴 **이 표의 수는 «흉내»가 아니라 제품 생성기가 낸 것이다.** 가드를 손으로 옮겨
 * 적은 사본을 세면 그 사본이 낡는 순간 원장이 거짓이 된다(2026-08-18 「«현행»이라는
 * 분모가 정말 현행인지 검산하라」). 그래서 `intBetween(rng,lo,hi)` 의 정의를 거꾸로
 * 풀어 **각본 rng**(원하는 값을 내는 난수)를 만들고, 그것을 **이 파일의 `handler` 에
 * 그대로 먹여** 조합마다 «받았나/버렸나»를 물었다. `attempt` 가 다시 뽑으려 하면
 * 각본이 떨어져 던지므로, 그 순간이 곧 «버렸다» 다. 가드를 하나만 끄는 판은
 * 이 파일의 **사본**(import 경로만 고친 것)에 그 한 줄을 지우고 같은 훑기를 돌렸다.
 *
 * 「판」은 통과 조합 수, 「답」은 서로 다른 정답 값의 수, 「최빈」은 그 판들 안에서다 —
 * **세 값의 측정점이 같은 자리**다(4차 `62W` 가 여기서 손실을 절반으로 적었다).
 *
 * | 유형 | 전수 격자(조합) | 가드 전부 켬 | 답 | 최빈 |
 * |---|---|---|---|---|
 * | `105X` | $p,q,r\in[1,16]^3\times$ 물음 $3$ = 12,288 | **723** | **29** | **7.1%** |
 * | `106X` | $L\in[30,140]\times m\in[3,40]$ = 4,218 | **725** | **28** | **5.1%** |
 * | `107X` | $m\in[2,6]\times k\in[8,45]\times n\in[-6,10]$ = 3,230 | **498** | **180** | **2.2%** |
 * | `108X` | $S\in[6,600]\times D\in[2,60]$ = 35,105 | **1,902** | **75** | **5.3%** |
 *
 * 가드를 **하나씩만** 껐을 때(나머지는 그대로):
 *
 * | 유형 | 가드 | 판 (켬→끔) | 답 | 최빈 | 왜 그래도 켜는가 |
 * |---|---|---|---|---|---|
 * | `105X` | 지름길 | 723 → **936** | 29 → 33 | 7.1 → 7.1 | 남기면 $p:q:r$ 세 수의 한두 번 연산으로 답이 나온다 |
 * | `105X` | 세 각이 모두 $6^\circ$ 이상 | 723 → **759** | 29 → 30 | 7.1 → 6.7 | $2^\circ$ 짜리 각이 지면에 나오면 비의 항이 커져 발문이 흉하다 |
 * | `105X` | 비가 기약($\gcd=1$) | 723 → **921** | 29 → 29 | 7.1 → **9.4** | $2:4:6$ 은 $1:2:3$ 과 **같은 문항**이다 — 안 막으면 «서로 다른 변형»이 부풀려지고 쏠림도 나빠진다 |
 * | `105X` | 정삼각형 제외 | 723 → **726** | 29 → 29 | 7.1 → 7.0 | 세 각이 같으면 비를 줄 까닭이 없다(세 조합뿐이지만 지면이 우습다) |
 * | `106X` | 지름길 | 725 → **800** | 28 → 28 | 5.1 → 4.9 | 남기면 $L$, $m$ 의 한두 번 연산으로 개수가 나온다 |
 * | `106X` | $L$ 이 $4$ 의 배수가 아니다 | 725 → **983** | 28 → 28 | 5.1 → 4.9 | 아래 경계가 정수면 「$x$는 자연수이므로」 걸음이 **잴 것이 없어진다**(㉯) |
 * | `106X` | $L-m$ 이 홀수 | 725 → **1,467** | 28 → 28 | 5.1 → 4.9 | 위 경계도 같은 까닭 — 둘 다 분수라야 두 걸음을 **둘 다** 잴 수 있다 |
 * | `106X` | $L$ 이 $3$ 의 배수가 아니다 | 725 → **1,097** | 28 → 28 | 5.1 → 4.8 | $L=3x$ 이면 정삼각형이 후보에 들어와 「밑변」이 어느 변인지 흐려진다 |
 * | `107X` | 지름길 | 498 → **594** | 180 → 187 | 2.2 → 2.7 | 남기면 $m$, $k$, $n$ 의 한두 번 연산으로 합이 나온다 |
 * | `107X` | $\gcd(k-1,\ m)=1$ | 498 → **689** | 180 → 192 | 2.2 → 2.0 | 안 막으면 $a\le\dfrac{8}{6}$ 처럼 **약분 안 한 분수**가 지면에 난다(㉰) |
 * | `107X` | 후보 하나가 답이 아니다 | 498 → **506** | 180 → 180 | 2.2 → 2.2 | 값 하나를 집어도 맞으면 「다 세워 더한다」가 장식이 된다 |
 * | `108X` | 지름길 | 1,902 → **3,446** | 75 → 121 | 5.3 → **3.9** | 자른 1,544 중 **1,499**(97%)가 「답 $=S+2$」다 — 남기면 대각선을 $2$ 로 놓아 보기만 해도 맞는다 |
 *
 * 🔴 **한 번도 못 무는 줄이 셋 있고, 세 자리 모두 코드 옆에 그렇게 적어 두었다** —
 * `106X` 의 `lo < 2`(725→725) · `107X` 의 `(k-1)%m===0`(498→498, 위 $\gcd$ 에 포함) ·
 * `108X` 의 「$2S$ 가 제곱수」(1,902→1,902)와 「버린 짝에 더 작은 합」(1,902→1,902).
 * **가드로 읽지 말 것.** 지우지 않는 까닭은 자리마다 주석에 적었다(뜻을 못 박거나,
 * 범위를 넓히는 날 실제로 물기 시작한다).
 *
 * ## ⑸ 실측 — 표본(씨앗 `20260905`+ · 800판)
 *
 * ⚠️ **전수와 표본은 다른 값이다.** ⑷ 는 매개변수 전수이고, 아래는 시험이 실제로
 * 쓰는 씨앗의 800판이다. 시험이 잠그는 것은 **표본 쪽**이다.
 *
 * | 유형 | 해설 최대 px | 최빈 정답 | 서로 다른 발문 | 서로 다른 해설 | 서로 다른 정답 |
 * |---|---|---|---|---|---|
 * | `105X` | **422.3** | **8.00%** | 489 | 489 | 29 |
 * | `106X` | **402.7** | **6.88%** | 488 | 488 | 28 |
 * | `107X` | **394.7** | **2.88%** | 396 | 396 | 163 |
 * | `108X` | **466.0** | **5.63%** | 657 | 657 | 75 |
 *
 * 넷 다 정답지 한 단(964.8px)은 물론 시험이 잠그는 **700px** 에도 한참 못 미치고,
 * 최빈 정답은 문턱 $12\%$ 에서 가장 가까운 `105X` 도 여유가 $4\%$ 다.
 *
 * **변형 폭** — 리드가 준 바닥은 `105X` 5 · `106X` 10 · `107X` 12 · `108X` 12 다.
 * 800판에서 서로 다른 발문이 위 표대로 나오므로 넷 다 바닥을 크게 넘는다.
 * 전수에서도 서로 다른 조합이 723 / 725 / 498 / 1,902 이라 **씨앗을 바꿔도** 바닥이
 * 무너질 자리가 없다.
 *
 * ## ⑹ 번호 규약 — **`X` 접미사**
 *
 * `extensionNumberReason` 이 「숫자+영문 대문자 한 글자」를 통과시킨다.
 * `A`(색인 밖 보강)·`T`(1차)·`U`(2차)·`V`(3차)·`W`(4차)가 쓰였으므로 5차는 **`X`** 다.
 * 갈래마다 번호대를 나눠 받았고 이 갈래는 `105X`~`108X` 다.
 *
 * ## ⑺ 계약 (이웃 모듈과 한 벌)
 *
 * 1. **정답을 먼저 뽑고 발문을 역산한다.**
 * 2. `facts` 로 정답 문자열을 **다시 지을 수 있다**(시험이 왕복으로 잠근다).
 *    `facts.x` 는 답의 **첫 수** — `105X` 는 각의 크기, `106X` 는 개수,
 *    `107X` 는 합, `108X` 는 길이의 합.
 * 3. 숫자는 전부 `$...$` 안에 (`elementary/rules` `bareNumbers`).
 * 4. `attempt` 가 다 떨어지면 **던진다** — 조용히 기본값을 내지 않는다.
 * 5. 그림이 없으므로 발문이 **지면을 가리키지 않는다**(`pointsAtFigure`).
 *    도형 둘(`105X`·`108X`)은 **글자만으로 풀리게** 적는다 — 꼭짓점 이름과 관계식이
 *    본문에 다 있고, 그림이 있어야만 알 수 있는 배치를 쓰지 않는다.
 * 6. 🔴 **해설이 걸음을 건너뛰지 않는다.** 후보를 견주는 갈래(`107X`·`108X`)는
 *    **죽는 후보가 왜 죽는지**까지 적는다.
 * 7. 🔴 **낱말 뒤 조사를 손 목록으로 적지 않는다** — 수 뒤 조사는 `m2Josa` 한 곳에서 온다.
 *
 * ## ⑻ 🔴 변이 시험 — **망가뜨려 봐야 가드인 줄 안다**
 *
 * 회차마다 **음성 대조**(변이 없이 118개 초록)를 먼저 확인하고, ⑴ 파일이 바뀌었나
 * ⑵ **산출물 지문이 바뀌었나**(800판 × 네 유형의 발문·정답·해설을 md5 로 압축) ⑶ 그제서야
 * 시험이 빨개지나 를 차례로 물었다. ⑵ 가 그대로면 **판정을 거부한다** — 「가드가
 * 아니다」가 거짓말이 되는 자리다(2026-08-21). 빨간데 실패한 시험 이름을 못 대도 거부한다.
 *
 * **변이 25개 전부 빨강.** 생성기 가드 17 + 지면 글자 8 이다. 지면 글자 변이는
 * 「값은 맞고 글자만 틀린」 부류 — 합 확인 줄의 $90\to91$ · 계수 $1$ 을 `1k` 로 적기 ·
 * 물음의 «팔» 순서 뒤집기 · 「보다 크므로」→「보다 작으므로」 · 「$x$는 자연수이므로」
 * 걸음 삭제 · 「모두 다르고」→「모두 같고」 · 「그중」 띄어쓰기 · 「약수」→「배수」.
 *
 * 🔴 **한 번은 초록이 났고, 그때 의심한 것은 가드가 아니라 «표본»이었다.**
 * 「정삼각형 제외」를 꺼도 초록이었는데 그 가드가 장식이어서가 아니라, 검산 표본이
 * **240판**이라 그 자리를 안 건드려서였다 — 전수 12,288 조합에서 정삼각형은
 * $1:1:1$ **하나**(물음 셋을 세면 3)뿐이다. 검산 표본을 **800판**으로 넓히자
 * 빨개졌다. 산출물 지문은 이미 «바뀌었다»고 답하고 있었으니, ⑵ 와 ⑶ 이 갈릴 때는
 * **시험의 표본부터** 보라는 뜻이다.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { attempt } from "./m1Shared";
import { eulReul, euroRo } from "./m2Josa";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";

/**
 * RPM 색인 정본(`scripts/rpm/rpm-type-catalog.json`)의 중단원 이름 — 글자 그대로.
 *
 * 🔴 `MINOR_FUNC1` 에는 **가는 공백 U+2009** 가 들어 있다(「그래프」 바로 뒤).
 *    보통 공백 두 개를 치면 눈으로는 같아 보이는데 **조용히 안 맞는다** — 그래서
 *    escape 로 적고, 시험이 색인 정본에 **대조**한다.
 */
const MINOR_CIRC = "삼각형의 외심과 내심";
const MINOR_INEQ_APPLY = "일차부등식의 활용";
const MINOR_FUNC1 = "일차함수와 그 그래프  ⑴";
const MINOR_QUAD = "여러 가지 사각형";

/** 그 중단원이 실린 RPM 책 — 도형 둘은 `2-2`, 나머지 둘은 `2-1` 이다. */
const BOOK_1 = "2-1";
const BOOK_2 = "2-2";

/**
 * 우리 `Unit.section` 정확한 이름 (`prisma/seed-data/units.ts` 실측).
 * 괄호 안의 쉼표·공백은 눈으로 못 가르므로 시험이 단원 정본과 **대조**한다.
 */
const SEC = {
  외심: "삼각형의 외심",
  속력도형: "일차부등식의 활용(속력, 도형, 기타)",
  함숫값: "함수와 함숫값",
  직사각형류: "직사각형, 마름모, 정사각형",
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

/** 기약분수로 줄인 $\dfrac{n}{d}$ — 분모는 늘 양수. */
export function reduceFraction(n: number, d: number): [number, number] {
  const s = d < 0 ? -1 : 1;
  const g = gcd(n, d) || 1;
  return [(s * n) / g, (s * d) / g];
}

/** 주격 조사 — 받침 판정은 `m2Josa.eulReul` **한 곳**에서 온다(규칙을 두 벌로 안 둔다). */
function iGa(n: number): "이" | "가" {
  return eulReul(n) === "을" ? "이" : "가";
}

/** 보조사 — 받침 판정은 `m2Josa.eulReul` **한 곳**에서 온다(`iGa` 와 같은 까닭). */
function eunNeun(n: number): "은" | "는" {
  return eulReul(n) === "을" ? "은" : "는";
}

/**
 * 계수를 붙인 한 항 — 계수가 $1$ 이면 **숫자를 적지 않는다**.
 *
 * 안 그러면 지면에 `1k` 가 나가고 공용 냄새 자(`midPage.pageSmells` 의
 * 「계수 $1$ 을 적었다」)가 문다. 값은 맞고 보기만 흉한 부류다.
 */
function mono(c: number, sym: string): string {
  return c === 1 ? sym : `${c}${sym}`;
}

/** `$15$, $10$, $5$` 처럼 수를 낱개로 감싸 나열한다. */
function listNums(vs: readonly number[]): string {
  return vs.map((v) => `$${v}$`).join(", ");
}

/** `15+10+5-5-10` — 부호를 앞에 붙여 이어 쓴다(`+-` 가 나올 자리가 없다). */
function signedSum(vs: readonly number[]): string {
  return vs
    .map((v, i) => (i === 0 ? String(v) : v < 0 ? `-${-v}` : `+${v}`))
    .join("");
}

// ═══════════════════════════════════════════════════════════
// 105X  외심에서 생기는 세 각의 «비»에서 중심각 구하기  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * **굳힘 함수** — 세 각의 «비»만으로 $\angle OAB$, $\angle OBC$, $\angle OCA$ 를 굳힌다.
 *
 * 굳히는 것은 이 소단원의 개념 하나다: 외심이면 $\overline{OA}=\overline{OB}=\overline{OC}$
 * 라 $\triangle OAB$, $\triangle OBC$, $\triangle OCA$ 가 모두 이등변삼각형이고,
 * $\triangle ABC$ 의 세 내각이 그 여섯 각으로 **두 개씩** 나뉘므로
 * $2(\angle OAB+\angle OBC+\angle OCA)=180^\circ$ — 즉 **세 각의 합이 $90^\circ$** 다.
 *
 * 🔴 **굳힘의 인자는 `halfSum` 이다.** 「세 내각이 두 개씩 나뉘므로 합의 두 배가
 * $180^\circ$」라는 걸음을 빠뜨리고 세 각의 합을 그냥 $180^\circ$ 로 두면 세 각이
 * **두 배**가 되고 답도 달라진다 — 학생이 가장 흔히 하는 실수이고, 이 유형이
 * 재려는 바로 그 마디다. (`halfSum=false` 는 제품이 안 쓰는 길이다. 생성기는 늘
 * `true` 로 부르고, **시험이 흔들어 잰다** — 생성기 안에서 두 판을 견주는 줄은
 * 한 번도 거부하지 못하는 «도장»이 된다, 2026-08-23.)
 *
 * 비가 세 각을 정수 도수로 못 가르면 `null`.
 */
export function circumAngles(
  p: number,
  q: number,
  r: number,
  halfSum = true,
): [number, number, number] | null {
  if (p < 1 || q < 1 || r < 1) return null;
  const total = halfSum ? 90 : 180;
  const s = p + q + r;
  if (total % s !== 0) return null;
  const k = total / s;
  return [k * p, k * q, k * r];
}

/** 세 각의 이름 — `circumAngles` 가 내는 차례와 **같은 순서**다. */
const ANGLE_NAMES = ["OAB", "OBC", "OCA"] as const;

/**
 * 물음의 세 갈래 — 어느 중심각을 묻는가.
 *
 * 한 줄에 네 가지가 같이 산다. 갈라 두면 「이름 목록」과 「값 목록」이 두 벌이 되고,
 * 한쪽만 고쳐도 아무도 모른다 — 실제로 첫 판이 그 자리에서 $\triangle OOC$ 와
 * 「$\angle B=\angle OBC+\angle OBA$ 인데 값은 $\angle OAB$ 부터」를 냈다.
 *
 *   `tri`     — 이등변삼각형의 이름 ($\overline{Ov1}=\overline{Ov2}$)
 *   `baseIdx` — 그 삼각형의 **두 밑각**이 가리키는 `ANGLE_NAMES` 자리
 *   `vertex`  — 중심각의 두 배가 되는 꼭짓점 ($\angle BOC=2\angle A$)
 *   `armNames`/`armIdx` — 그 꼭짓점의 내각을 이루는 두 각의 **이름과 값**(짝이 맞다)
 */
const CENTER_TARGETS = [
  {
    name: "BOC",
    v1: "B",
    v2: "C",
    tri: "OBC",
    baseIdx: 1,
    vertex: "A",
    armNames: ["OAB", "OAC"],
    armIdx: [0, 2],
  },
  {
    name: "COA",
    v1: "C",
    v2: "A",
    tri: "OCA",
    baseIdx: 2,
    vertex: "B",
    armNames: ["OBA", "OBC"],
    armIdx: [0, 1],
  },
  {
    name: "AOB",
    v1: "A",
    v2: "B",
    tri: "OAB",
    baseIdx: 0,
    vertex: "C",
    armNames: ["OCB", "OCA"],
    armIdx: [1, 2],
  },
] as const;

const CIRCUM_RATIO: TypeEntry[] = [
  def(
    BOOK_2,
    MINOR_CIRC,
    "105X",
    "외심에서 생기는 세 각의 비로 중심각 구하기",
    SEC.외심,
    "심화중",
    (rng): Body =>
      attempt(6000, (): Body | null => {
        // ⚠️ ㉵ **세 값을 따로 뽑고 정렬하지 않는다.** 정렬하면 「가운데 항이 가운데
        //    각」이라는 참인 암시가 지면에 생겨 학생이 계산을 건너뛴다.
        const p = intBetween(rng, 1, 16);
        const q = intBetween(rng, 1, 16);
        const r = intBetween(rng, 1, 16);
        // 비는 **기약**이라야 한다 — $2:4:6$ 은 $1:2:3$ 과 같은 문항이다.
        if (gcd(gcd(p, q), r) !== 1) return null;
        const angles = circumAngles(p, q, r);
        if (angles === null) return null; // $90$ 이 비로 안 갈린다
        const [oab, obc, oca] = angles;
        // 셋이 다 같으면 정삼각형이라 비를 줄 까닭이 없다.
        if (p === q && q === r) return null;
        // 지면에 $2^\circ$ 짜리 각이 나오면 흉하고 비의 항이 커진다.
        if (Math.min(oab, obc, oca) < 6) return null;

        const target = pick(rng, CENTER_TARGETS);
        const base = angles[target.baseIdx]!;
        const ans = 180 - 2 * base;
        if (ans <= 0 || ans >= 180) return null;

        // 🔴 ㉵ 지름길 — 발문에 찍히는 수는 $p$, $q$, $r$ 셋뿐이다. 그 셋의 한두 번
        //    연산으로 답이 나오면 버린다(전수의 15.7% 가 그렇다).
        const printed = [p, q, r];
        const guesses = new Set<number>();
        for (const a of printed) {
          guesses.add(a);
          guesses.add(10 * a);
          guesses.add(a * a);
        }
        for (const a of printed)
          for (const b of printed) {
            guesses.add(a + b);
            guesses.add(Math.abs(a - b));
            guesses.add(a * b);
            guesses.add(10 * (a + b));
          }
        guesses.add(p + q + r);
        guesses.add(p * q * r);
        guesses.add(10 * (p + q + r));
        if (guesses.has(ans)) return null;

        const s = p + q + r;
        const k = 90 / s;
        // $\angle OAC=\angle OCA$ 이므로 꼭짓점 각은 «두 이름»이 가리키는 두 값의 합이다.
        const arm0 = angles[target.armIdx[0]]!;
        const arm1 = angles[target.armIdx[1]]!;
        const armVal = arm0 + arm1;
        const ratio = `${p} : ${q} : ${r}`;
        const sumLine = `${oab}+${obc}+${oca}`;

        return {
          content:
            `점 $O$가 $\\triangle ABC$의 외심이고 ` +
            `$\\angle ${ANGLE_NAMES[0]} : \\angle ${ANGLE_NAMES[1]} : \\angle ${ANGLE_NAMES[2]} = ${ratio}$일 때, ` +
            `$\\angle ${target.name}$의 크기를 구하시오.`,
          answer: `$${ans}^\\circ$`,
          solution: [
            `점 $O$가 $\\triangle ABC$의 외심이므로 $\\overline{OA}=\\overline{OB}=\\overline{OC}$이고, $\\triangle OAB$, $\\triangle OBC$, $\\triangle OCA$는 모두 이등변삼각형이다.`,
            `이등변삼각형의 두 밑각의 크기는 같으므로 $\\angle OBA=\\angle OAB$, $\\angle OCB=\\angle OBC$, $\\angle OAC=\\angle OCA$이다.`,
            `$\\triangle ABC$의 세 내각의 크기의 합은 $180^\\circ$이고 세 내각이 이 여섯 각으로 두 개씩 나뉘므로 $2(\\angle OAB+\\angle OBC+\\angle OCA)=180^\\circ$, 즉 $\\angle OAB+\\angle OBC+\\angle OCA=90^\\circ$이다.`,
            `세 각의 크기의 비가 $${ratio}$이므로 $\\angle OAB=${mono(p, "k")}^\\circ$, $\\angle OBC=${mono(q, "k")}^\\circ$, $\\angle OCA=${mono(r, "k")}^\\circ$인 양수 $k$가 있다.`,
            `세 각의 크기의 합이 $90^\\circ$이므로 $${mono(p, "k")}+${mono(q, "k")}+${mono(r, "k")}=90$, 즉 $${mono(s, "k")}=90$이다. $90$${eulReul(90)} $${s}$${euroRo(s)} 나누면 $k=${k}$이다.`,
            `그러므로 $\\angle OAB=${oab}^\\circ$, $\\angle OBC=${obc}^\\circ$, $\\angle OCA=${oca}^\\circ$이고, 이 세 각의 크기의 합은 $${sumLine}=90$이므로 앞의 조건과 맞는다.`,
            `$\\triangle ${target.tri}$는 $\\overline{O${target.v1}}=\\overline{O${target.v2}}$인 이등변삼각형이고 두 밑각의 크기가 $\\angle ${ANGLE_NAMES[target.baseIdx]}=${base}^\\circ$로 같으므로, $\\angle ${target.name}=180^\\circ-2\\times${base}^\\circ=${ans}^\\circ$이다.`,
            `따라서 $\\angle ${target.name}=${ans}^\\circ$이다.`,
            `이때 $\\angle ${target.vertex}=\\angle ${target.armNames[0]}+\\angle ${target.armNames[1]}=${arm0}^\\circ+${arm1}^\\circ=${armVal}^\\circ$이고 $2\\times${armVal}=${ans}$${eunNeun(ans)} 위에서 구한 값과 같으므로, $\\angle ${target.name}=2\\angle ${target.vertex}$가 성립한다.`,
          ].join("\n"),
          facts: {
            x: ans,
            p,
            q,
            r,
            sum: s,
            k,
            base,
            oab,
            obc,
            oca,
            vertexAngle: armVal,
            ask: CENTER_TARGETS.findIndex((t) => t.name === target.name),
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 106X  끈 하나로 만드는 이등변삼각형의 가짓수  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * **굳힘 함수** — 길이가 같은 두 변의 길이 $x$ 가 들어갈 **닫힌 범위**.
 *
 * 굳히는 것은 이 소단원의 개념 하나(일차부등식)다. 위끝은 「밑변이 $m$ 이상」
 * ($L-2x\ge m$), 아래끝은 「두 변의 길이의 합이 나머지 한 변보다 크다」
 * ($x+x>L-2x$)에서 나온다.
 *
 * 🔴 **굳힘의 인자는 `triangleRule` 이다.** 삼각형이 되기 위한 조건을 빼면 아래끝이
 * $x\ge1$ 로 풀려 개수가 **크게 늘어난다** — 「끈을 다 쓰기만 하면 삼각형이 된다」는
 * 것이 이 유형이 재려는 바로 그 마디다. (`false` 는 제품이 안 쓰는 길이고 시험이
 * 흔들어 잰다.)
 *
 * 범위가 비면 `null`.
 */
export function isoscelesRange(
  L: number,
  m: number,
  triangleRule = true,
): [number, number] | null {
  if (L < 3 || m < 1) return null;
  const hi = Math.floor((L - m) / 2);
  const lo = triangleRule ? Math.floor(L / 4) + 1 : 1;
  if (hi < lo) return null;
  return [lo, hi];
}

const ISOSCELES_COUNT: TypeEntry[] = [
  def(
    BOOK_1,
    MINOR_INEQ_APPLY,
    "106X",
    "끈 하나로 만드는 이등변삼각형의 가짓수",
    SEC.속력도형,
    "심화중",
    (rng): Body =>
      attempt(6000, (): Body | null => {
        const L = intBetween(rng, 30, 140);
        const m = intBetween(rng, 3, 40);
        // ㉯ 두 경계가 **둘 다 분수**라야 「$x$는 자연수이므로」 걸음을 둘 다 잴 수 있다.
        if (L % 4 === 0) return null;
        if ((L - m) % 2 === 0) return null;
        // $L=3x$ 이면 정삼각형이 후보에 들어와 「밑변」이 어느 변인지 흐려진다.
        if (L % 3 === 0) return null;

        const span = isoscelesRange(L, m);
        if (span === null) return null;
        const [lo, hi] = span;
        // 아래끝이 $1$ 이면 삼각형 조건이 아무것도 안 자른다 — 창이 한쪽만 닫힌 셈이다.
        //
        // ⚠️ **이 줄은 한 번도 못 문다 — 가드로 읽지 말 것.** $L\ge30$ 이므로
        //    $lo=\lfloor L/4\rfloor+1\ge8$ 이다. 전수로 껐다 켜 봐도 통과 조합이
        //    **725 로 그대로**다(D-20 원장 ⑷). 뜻을 지면 옆에 적어 둘 뿐이다.
        if (lo < 2) return null;
        const n = hi - lo + 1;
        if (n < 3 || n > 30) return null;

        // 🔴 ㉵ 지름길 — 발문에 찍히는 수는 $L$, $m$ 둘뿐이다.
        const guesses = new Set<number>();
        for (const a of [L, m]) {
          guesses.add(a);
          guesses.add(a / 2);
          guesses.add(a / 3);
          guesses.add(a / 4);
          guesses.add(2 * a);
        }
        guesses.add(L + m);
        guesses.add(L - m);
        guesses.add((L - m) / 2);
        guesses.add((L - m) / 4);
        guesses.add((L + m) / 2);
        guesses.add(L / 2 - m);
        guesses.add(L / 4 + m);
        guesses.add(L * m);
        if (guesses.has(n)) return null;

        const [un, ud] = reduceFraction(L - m, 2);
        const [dn, dd] = reduceFraction(L, 4);
        const baseLo = L - 2 * lo;
        const baseHi = L - 2 * hi;
        const deadX = lo - 1;
        const deadBase = L - 2 * deadX;
        const deadTwo = 2 * deadX;

        return {
          content:
            `길이가 $${L}\\,\\mathrm{cm}$인 끈을 남김없이 사용하여 이등변삼각형을 만들려고 한다. ` +
            `세 변의 길이가 모두 자연수 $\\mathrm{cm}$이고 밑변의 길이가 $${m}\\,\\mathrm{cm}$ 이상일 때, ` +
            `만들 수 있는 서로 다른 이등변삼각형은 모두 몇 개인지 구하시오.`,
          answer: `$${n}$개`,
          solution: [
            `길이가 같은 두 변의 길이를 $x\\,\\mathrm{cm}$라 하면 끈을 남김없이 쓰므로 밑변의 길이는 $(${L}-2x)\\,\\mathrm{cm}$이다.`,
            `밑변의 길이가 $${m}\\,\\mathrm{cm}$ 이상이어야 하므로 $${L}-2x\\ge${m}$, 즉 $2x\\le${L - m}$이다. $${L - m}$${eulReul(L - m)} $2$${euroRo(2)} 나누면 $\\dfrac{${un}}{${ud}}$이므로 $x\\le\\dfrac{${un}}{${ud}}$이고, $x$는 자연수이므로 $x\\le${hi}$이다.`,
            `삼각형이 되려면 두 변의 길이의 합이 나머지 한 변의 길이보다 커야 하므로 $x+x>${L}-2x$, 즉 $4x>${L}$이다. $${L}$${eulReul(L)} $4$${euroRo(4)} 나누면 $\\dfrac{${dn}}{${dd}}$이므로 $x>\\dfrac{${dn}}{${dd}}$이고, $x$는 자연수이므로 $x\\ge${lo}$이다.`,
            `그러므로 $x$는 $${lo}$부터 $${hi}$까지의 자연수이고, 그 개수는 $${hi}-${lo}+1=${n}$이다.`,
            `$x=${lo}$일 때 밑변의 길이는 $${L}-2\\times${lo}=${baseLo}$에서 $${baseLo}\\,\\mathrm{cm}$이고, $x=${hi}$일 때 밑변의 길이는 $${L}-2\\times${hi}=${baseHi}$에서 $${baseHi}\\,\\mathrm{cm}$이므로 둘 다 $${m}\\,\\mathrm{cm}$ 이상이다.`,
            `$x=${deadX}$${iGa(deadX)} 되면 밑변의 길이가 $${L}-2\\times${deadX}=${deadBase}$에서 $${deadBase}\\,\\mathrm{cm}$가 되어 나머지 두 변의 길이의 합 $${deadTwo}\\,\\mathrm{cm}$보다 크므로 삼각형이 만들어지지 않는다.`,
            `따라서 만들 수 있는 서로 다른 이등변삼각형은 $${n}$개이다.`,
          ].join("\n"),
          facts: {
            x: n,
            len: L,
            base: m,
            lo,
            hi,
            baseLo,
            baseHi,
            deadX,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 107X  자연수 계수 조건에서 살아남는 함숫값을 모두 더하기  (심화상)
// ═══════════════════════════════════════════════════════════

/**
 * $f(x)=ax+b$ 에서 $a$, $b$ 가 **자연수**이고 $f(m)=k$ 일 때 살아남는 $a$ 전부.
 *
 * 🔴 **굳힘이 없다 — 후보를 다 세워야 한다**(심화상). 그래서 인자로 둔 것은 굳힘이
 * 아니라 **「$b$ 도 자연수인가」** 다(`bNatural`). 그 조건을 「정수」로 늦추면 $a$ 가
 * 위로 열려 후보가 무한히 많아지고 「모든 값의 합」이 뜻을 잃는다 — 시험이 그것을
 * 흔들어 잰다. (`false` 는 제품이 안 쓰는 길이다.)
 *
 * `bNatural=false` 일 때는 위끝이 없으므로 `limit` 까지만 훑는다 — 그 자체가
 * 「닫히지 않는다」는 증거다.
 */
export function naturalSlopes(
  m: number,
  k: number,
  bNatural = true,
  limit = 200,
): number[] {
  const out: number[] = [];
  for (let a = 1; a <= limit; a += 1) {
    const b = k - m * a;
    if (bNatural && b < 1) break;
    out.push(a);
  }
  return out;
}

const FUNC_CANDIDATE_SUM: TypeEntry[] = [
  def(
    BOOK_1,
    MINOR_FUNC1,
    "107X",
    "계수가 자연수일 때 함숫값이 될 수 있는 모든 값의 합",
    SEC.함숫값,
    "심화상",
    (rng): Body =>
      attempt(6000, (): Body | null => {
        const m = intBetween(rng, 2, 6);
        const k = intBetween(rng, 8, 45);
        const n = intBetween(rng, -6, 10);
        if (n === m) return null;
        // $n=0$ 이면 지면에 `0a` 가 나가고 공용 냄새 자가 문다(값은 맞고 보기만 흉하다).
        if (n === 0) return null;
        // 위끝이 정수면 「$a$도 자연수이므로」 걸음이 잴 것이 없어진다(㉯).
        //
        // ⚠️ **이 줄은 아래 줄에 포함되어 한 번도 혼자 못 문다 — 가드로 읽지 말 것.**
        //    $m\mid(k-1)$ 이면 $\gcd(k-1,\ m)=m\ge2$ 라 아래 줄이 **늘 먼저** 문다.
        //    전수로 껐다 켜 봐도 통과 조합이 **498 로 그대로**다(D-20 원장 ⑷).
        //    「위끝이 분수라야 한다」는 뜻을 그 자리에 적어 두는 것이고, 아래 줄을
        //    언젠가 느슨하게 고치면 그때부터 이 줄이 실제로 문다.
        if ((k - 1) % m === 0) return null;
        // ㉰ $\dfrac{k-1}{m}$ 이 **약분될 자리가 없어야** 지면의 분수가 기약이다.
        if (gcd(k - 1, m) !== 1) return null;

        const slopes = naturalSlopes(m, k);
        const cnt = slopes.length;
        if (cnt < 3 || cnt > 6) return null;

        const bs = slopes.map((a) => k - m * a);
        const values = slopes.map((a) => k + (n - m) * a);
        // 지면에 `+0` 이 나가면 안 되고, 값이 $0$ 이면 「서로 다르다」가 흐려진다.
        if (values.some((v) => v === 0 || Math.abs(v) > 200)) return null;
        if (new Set(values).size !== cnt) return null;
        const total = values.reduce((s, v) => s + v, 0);
        if (total === 0) return null;
        // 후보 하나를 집어도 답이 되면 「다 세워 더한다」가 장식이 된다.
        if (values.includes(total)) return null;

        // 🔴 ㉵ 지름길 — 발문에 찍히는 수는 $m$, $k$, $n$ 셋뿐이다.
        const printed = [m, k, n];
        const guesses = new Set<number>([cnt, cnt * k]);
        for (const a of printed) {
          guesses.add(a);
          guesses.add(-a);
          guesses.add(a * a);
          guesses.add(10 * a);
        }
        for (const a of printed)
          for (const b of printed) {
            guesses.add(a + b);
            guesses.add(a - b);
            guesses.add(a * b);
          }
        guesses.add(m + k + n);
        guesses.add(m * k * n);
        if (guesses.has(total)) return null;

        const [bn, bd] = reduceFraction(k - 1, m);
        const slopeOfN = n - m;
        // $f(n)=k+(n-m)a$ 를 지면에 적을 때 부호를 앞에 붙인다(`+-` 가 날 자리가 없다).
        const nfTerm =
          slopeOfN < 0 ? `-${mono(-slopeOfN, "a")}` : `+${mono(slopeOfN, "a")}`;
        const naTerm = mono(Math.abs(n), "a");
        const naSigned = n < 0 ? `-${naTerm}` : naTerm;
        const pairs = slopes.map((a, i) => `$(${a},\\,${bs[i]})$`).join(", ");
        const last = slopes[cnt - 1]!;
        const over = last + 1;
        const overB = k - m * over;

        return {
          content:
            `일차함수 $f(x)=ax+b$에서 $a$, $b$가 모두 자연수이고 $f(${m})=${k}$이다. ` +
            `이때 $f(${n})$의 값이 될 수 있는 모든 값의 합을 구하시오.`,
          answer: `$${total}$`,
          solution: [
            `$f(x)=ax+b$이므로 $f(${m})=${mono(m, "a")}+b$이고, $f(${m})=${k}$에서 $${mono(m, "a")}+b=${k}$, 즉 $b=${k}-${mono(m, "a")}$이다.`,
            `$b$가 자연수이므로 $${k}-${mono(m, "a")}\\ge1$, 즉 $${mono(m, "a")}\\le${k - 1}$이다. $${k - 1}$${eulReul(k - 1)} $${m}$${euroRo(m)} 나누면 $\\dfrac{${bn}}{${bd}}$이므로 $a\\le\\dfrac{${bn}}{${bd}}$이고, $a$도 자연수이므로 $a$가 될 수 있는 값은 ${listNums(slopes)}의 $${cnt}$개이다.`,
            `$a=${over}$${iGa(over)} 되면 $b=${k}-${m}\\times${over}=${overB}$${iGa(overB)} 되어 자연수가 아니므로 $a$는 $${last}$보다 클 수 없다.`,
            `$b=${k}-${mono(m, "a")}$이므로 $(a,\\,b)$는 차례로 ${pairs}이다.`,
            `$f(${n})=${naSigned}+b=${naSigned}+(${k}-${mono(m, "a")})=${k}${nfTerm}$이므로, $a$가 ${listNums(slopes)}일 때 $f(${n})$의 값은 차례로 ${listNums(values)}이다.`,
            `$a$의 값이 서로 다르면 $f(${n})$의 값도 서로 다르므로 이 $${cnt}$개의 값은 모두 다르고, 그 합은 $${signedSum(values)}=${total}$이다.`,
            `따라서 $f(${n})$의 값이 될 수 있는 모든 값의 합은 $${total}$이다.`,
            `실제로 $a=${last}$일 때 $b=${bs[cnt - 1]}$이고 $${m}\\times${last}+${bs[cnt - 1]}=${k}$${eunNeun(k)} 처음에 주어진 $f(${m})$의 값과 같다.`,
          ].join("\n"),
          facts: {
            x: total,
            at: m,
            value: k,
            ask: n,
            cnt,
            first: values[0]!,
            last: values[cnt - 1]!,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 108X  마름모의 두 대각선이 자연수일 때 길이의 합의 최솟값  (심화상)
// ═══════════════════════════════════════════════════════════

/**
 * 곱이 `product` 인 자연수 짝 $(p,\ q)$ 를 $p<q$ 로 **전부** 모은다 ($p$ 가 작은 것부터).
 *
 * 🔴 **굳힘이 없다 — 후보를 다 세워야 한다**(심화상). 그래서 인자로 둔 것은 굳힘이
 * 아니라 **「차 조건」** 이다(`minGap`). 그 조건을 지우면 살아남는 짝이 달라져
 * 답이 바뀐다 — 버려지는 짝 가운데 **합이 더 작은 것**이 반드시 있기 때문이다.
 * 시험이 그것을 흔들어 잰다.
 */
export function diagonalPairs(
  product: number,
  minGap = 0,
): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let p = 1; p * p < product; p += 1) {
    if (product % p !== 0) continue;
    const q = product / p;
    if (q - p < minGap) continue;
    out.push([p, q]);
  }
  return out;
}

const RHOMBUS_MIN_SUM: TypeEntry[] = [
  def(
    BOOK_2,
    MINOR_QUAD,
    "108X",
    "마름모의 두 대각선이 자연수일 때 길이의 합의 최솟값",
    SEC.직사각형류,
    "심화상",
    (rng): Body =>
      attempt(6000, (): Body | null => {
        const S = intBetween(rng, 6, 600);
        const D = intBetween(rng, 2, 60);
        const P = 2 * S;
        // ㉴ $2S$ 가 제곱수면 짝 $(\sqrt{P},\ \sqrt{P})$ 가 생기는데 $p<q$ 로 적은
        //    목록에는 그것이 **빠진다** — 그러면 해설의 「모두 적으면」이 거짓이 된다.
        //
        // ⚠️ **이 줄은 지금 범위에서 한 번도 못 문다 — 가드로 읽지 말 것.** 전수로
        //    껐다 켜 봐도 통과 조합이 **1,902 로 그대로**다(D-20 원장 ⑷): $2S$ 가
        //    제곱수인 $S$($2$, $8$, $18$, $\dots$, $578$)는 짝 개수·차 조건에서
        //    이미 다 걸린다. 그래도 남긴다 — 범위를 넓히는 날 지면이 거짓말을 한다.
        const root = Math.round(Math.sqrt(P));
        if (root * root === P) return null;

        const all = diagonalPairs(P);
        // 나열이 지면을 넘지 않게, 그리고 견줄 것이 있게.
        if (all.length < 4 || all.length > 6) return null;
        const alive = all.filter(([p, q]) => q - p >= D);
        const dead = all.filter(([p, q]) => q - p < D);
        if (alive.length < 2 || dead.length < 2) return null;

        const sums = alive.map(([p, q]) => p + q);
        const minSum = Math.min(...sums);
        const best = alive[sums.indexOf(minSum)]!;
        // 버려진 짝에 **더 작은 합**이 없으면 차 조건이 아무것도 안 자르고,
        // 「가장 가까운 두 수」로 찍으면 맞는다 — 그러면 견주기가 장식이다.
        //
        // ⚠️ **이 줄은 «막는 것»이 아니라 «참임을 적어 두는 것»이다 — 가드로 읽지 말 것.**
        //    $p+q=p+P/p$ 는 $p<\sqrt{P}$ 에서 **$p$ 가 커질수록 작아진다.** 그런데
        //    $q-p=P/p-p$ 도 $p$ 가 커질수록 작아지므로 살아남는 짝은 늘 **작은 $p$
        //    쪽 앞머리**이고 버려지는 짝은 **큰 $p$ 쪽 꼬리**다. 그래서 버려진 쪽의
        //    최소 합이 살아남은 쪽의 최소 합보다 **반드시 작다.** 전수로 껐다 켜 봐도
        //    통과 조합이 **1,902 로 그대로**다(D-20 원장 ⑷). 위 `dead.length < 2` 가
        //    실제로 지키는 곳이고, 이 줄은 거부 사유를 정확히 적기 위해 남긴다.
        const deadMin = Math.min(...dead.map(([p, q]) => p + q));
        if (deadMin >= minSum) return null;

        // 🔴 ㉵ 지름길 — 발문에 찍히는 수는 $S$, $D$ 둘뿐이다.
        //
        // 이 줄이 실제로 무엇을 자르는지 **세어 봤다**(전수 3,446 중 1,544 를 자른다).
        // 그중 **1,499(97%)** 가 「$p=2$ 가 마지막 생존 짝이라 답이 $S+2$」인 한 부류다 —
        // 그런 판에서는 학생이 대각선을 $2$ 로 놓아 보기만 해도 답이 나온다.
        // 나머지는 $2D$ 38 · $S-D$ 25 · $\dfrac{S}{2}+D$ 20 · $4D$ 1 이고,
        // 아래 목록의 다른 항은 **한 번도 안 물었다**(넓혀 두는 쪽이 싸다).
        //
        // ⚠️ 대가가 있다 — 이 줄을 켜면 최빈 정답이 $3.9\%\to5.3\%$ 로 **올라간다**
        //    (4차 `36W` 와 같은 맞바꿈). 그래도 켜는 까닭은 남겨 두면 전수의 **45%** 가
        //    「넓이에 $2$ 를 더하면 맞는」 문항이 되기 때문이다. 정답 가짓수는
        //    $121\to75$ 로 줄지만 $12\%$ 문턱에는 한참 못 미친다.
        const guesses = new Set<number>([
          S,
          2 * S,
          4 * S,
          S + 1,
          S - 1,
          S + 2,
          S - 2,
          S / 2,
          S / 3,
          S / 4,
          D,
          2 * D,
          4 * D,
          S + D,
          S - D,
          S * D,
          S / D,
          S / 2 + D,
        ]);
        if (guesses.has(minSum)) return null;

        const pairText = all.map(([p, q]) => `$(${p},\\,${q})$`).join(", ");
        const gapText = all.map(([p, q]) => `$${q}-${p}=${q - p}$`).join(", ");
        const aliveText = alive.map(([p, q]) => `$(${p},\\,${q})$`).join(", ");
        const aliveSumText = alive
          .map(([p, q]) => `$${p}+${q}=${p + q}$`)
          .join(", ");
        const deadText = dead.map(([p, q]) => `$(${p},\\,${q})$`).join(", ");

        return {
          content:
            `두 대각선의 길이가 모두 자연수 $\\mathrm{cm}$이고 두 대각선의 길이의 차가 ` +
            `$${D}\\,\\mathrm{cm}$ 이상인 마름모 $ABCD$가 있다. 이 마름모의 넓이가 ` +
            `$${S}\\,\\mathrm{cm}^2$일 때, 두 대각선의 길이의 합이 될 수 있는 값 중 ` +
            `가장 작은 것을 구하시오.`,
          answer: `$${minSum}\\,\\mathrm{cm}$`,
          solution: [
            `마름모의 넓이는 두 대각선의 길이의 곱의 반이므로, 두 대각선의 길이를 $p\\,\\mathrm{cm}$, $q\\,\\mathrm{cm}$ ($p<q$)라 하면 $\\dfrac{1}{2}\\times p\\times q=${S}$이다.`,
            `양변에 $2$${eulReul(2)} 곱하면 $p\\times q=2\\times${S}=${P}$이고, $p$와 $q$가 모두 자연수이므로 $p$는 $${P}$의 약수이다.`,
            `$${P}$${eulReul(P)} 두 자연수의 곱으로 나타내는 방법을 $p$가 작은 것부터 모두 적으면 $(p,\\,q)$는 ${pairText}이고, 모두 $${all.length}$개이다.`,
            `각 짝에서 두 대각선의 길이의 차는 차례로 ${gapText}이다.`,
            `차가 $${D}\\,\\mathrm{cm}$ 이상이어야 하므로 ${deadText}${eunNeun(dead[dead.length - 1]![1])} 조건에 맞지 않아 버리고, 남는 것은 ${aliveText}이다.`,
            `남은 짝에서 두 대각선의 길이의 합은 차례로 ${aliveSumText}이고, 그중 가장 작은 것은 $${minSum}$이다.`,
            `따라서 두 대각선의 길이의 합이 될 수 있는 값 중 가장 작은 것은 $${minSum}\\,\\mathrm{cm}$이다.`,
            `이때 두 대각선의 길이는 $${best[0]}\\,\\mathrm{cm}$, $${best[1]}\\,\\mathrm{cm}$이고 $${best[1]}-${best[0]}=${best[1] - best[0]}$${eunNeun(best[1] - best[0])} $${D}$ 이상이며, 넓이는 $\\dfrac{1}{2}\\times${best[0]}\\times${best[1]}=${S}$에서 $${S}\\,\\mathrm{cm}^2$이므로 두 조건을 모두 만족한다.`,
          ].join("\n"),
          facts: {
            x: minSum,
            area: S,
            gap: D,
            product: P,
            pairs: all.length,
            alive: alive.length,
            bestP: best[0],
            bestQ: best[1],
            deadMin,
          },
          figureSpec: null,
        };
      }),
  ),
];

/** 이 갈래가 낸 넷 — 등록은 **리드**가 `generate.ts` 에 spread 한 줄로 붙인다. */
export const M2_TOP_5B: TypeEntry[] = [
  ...CIRCUM_RATIO,
  ...ISOSCELES_COUNT,
  ...FUNC_CANDIDATE_SUM,
  ...RHOMBUS_MIN_SUM,
];
