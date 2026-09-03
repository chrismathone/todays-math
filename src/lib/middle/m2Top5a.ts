/**
 * 중2 **확대 갈래 5차 물결**(`심화중`·`심화상`) — D-116, 접미사 **`X`**, 갈래 `m2Top5a`.
 *
 * ## ⑴ 왜 새 파일인가
 *
 * 4차(`m2Top4.ts`) 머리말과 같은 까닭이다 — 남의 모듈을 잠그는 개수 검사를 무르지
 * 않으려고, 그리고 오르카 다중 세션이 같은 파일에서 부딪히지 않으려고 **새 파일 하나
 * + `generate.ts` spread 한 줄**로 붙인다. 그 한 줄은 **리드가** 넣는다 —
 * 이 파일은 `generate.ts` 를 건드리지 않는다.
 *
 * 착수 전에 「이 넷을 더하면 남의 모듈 개수 검사가 빨개지는가」를 읽어서 확인했다:
 * `middleM2Prob`·`middleM2GeoSim`·`middleM2SystemApply` 는 전부 **자기 모듈 배열**
 * (`M2_PROB`·`M2_GEO_SIM`·`M2_SYSTEM_APPLY`)을 세지 `registeredTypes()` 를 중단원으로
 * 거르지 않는다. 등록 뒤 전량 관문이 그 사실의 참을 확인한다.
 *
 * ## ⑵ 유형마다 — 안 굳는 마디 / 무엇이 굳히나 / 같은 소단원과 무엇이 다른가
 *
 * | 키 | 갈래 | 안 굳는 마디 | 무엇이 굳히나 | 아래 갈래와 다른 축 |
 * |---|---|---|---|---|
 * | `확률\|101X` | **심화상** | **어느 두 사람이 성공하는가** — 셋 중 둘을 고르는 갈래가 셋이고, 계산 전에는 어느 갈래가 큰지도 알 수 없다 | 굳지 않는다. 세 갈래를 **모두 세워** 각각의 확률을 구한 뒤 더해야 하고, 어느 하나로 좁혀 주는 성질이 없다(4차 `39W` 와 같은 자리 — 후보가 여럿 살아남고 답이 그 결과들의 **합**이다) | 색인 `05`·`08`(적어도 하나)은 **여사건 하나**가 갈래를 통째로 접는다 — 곱 한 번이면 끝난다. `09`(덧셈과 곱셈)는 갈래가 **둘**이고 여사건도 안 쓴다. `101X` 는 갈래가 셋이고 각 갈래마다 **여사건을 한 번씩** 써야 하며, 갈래를 하나라도 빠뜨리면 답이 달라진다 |
 * | `평행선 사이의 선분의 길이의 비\|102X` | **심화중** | 세 변의 길이 — 발문은 **둘레 두 개**만 준다. 변 하나하나는 끝까지 모른다 | 그 소단원의 **평행선 비**(`01`·`02`) 하나. 대응하는 세 변의 비가 **모두 같으므로** 그것을 더한 둘레의 비도 같은 비다 — 그래서 변을 하나도 안 구하고 $\overline{\mathrm{AD}}:\overline{\mathrm{AB}}$ 가 바로 나온다 | `01`·`02`·`03`·`04` 는 **변의 길이를 직접 주고** 대응하는 변 하나를 묻는 정방향이다. `102X` 는 주어지는 것이 **둘레**여서, 「비가 셋 다 같다」를 «합»으로 옮기는 걸음이 하나 더 있다 |
 * | `연립일차방정식의 활용\|103X` | **심화중** | 바꾸어 넣은 뒤의 **농도** $y$ — 미지수가 둘($x$, $y$)이라 「연립을 풀어야 한다」로 보인다 | 이 소단원의 **가감법** 하나. 두 그릇의 식을 변끼리 더하면 $x$ 항이 서로 지워져 $y$ 가 **바로** 나오고, 그 뒤 한 식에 넣으면 $x$ 가 나온다 | `15`·`16`(농도)은 미지수 둘이 **둘 다 소금물의 양**이고 두 식이 「양의 합」·「소금의 합」이다. `103X` 는 한 미지수가 **농도**이고, 두 식이 **두 그릇 각각**에서 나오며 더하면 미지수 하나가 사라진다 |
 * | `평행선 사이의 선분의 길이의 비\|104X` | **심화상** | $\overline{\mathrm{BC}}$ 의 길이 — **굳지 않는다.** 살아남는 값이 하나가 아니라 **여럿**이고 그 전부가 답에 들어간다 | 굳지 않는다. 「$\overline{\mathrm{BD}}$ 가 자연수」는 «어느 값인가»를 고르지 않고 **배수 목록**을 만들어 줄 뿐이라, 삼각형이 되는 범위로 거른 뒤 남은 것을 다 더해야 한다 | `06`(내각의 이등분선)은 세 변을 다 주고 $\overline{\mathrm{BD}}$ **하나**를 묻는 정방향이다. `104X` 는 $\overline{\mathrm{BC}}$ 가 미지이고 **정수 조건 + 삼각형 조건**이 겹치며, 「$\overline{\mathrm{BC}}=\overline{\mathrm{AB}}+\overline{\mathrm{AC}}$ 는 배수인데도 버린다」는 **버리는 걸음**이 있다 |
 *
 * ## ⑶ 🔴 앞 물결들이 **실제로 새어 나간 자리** — 여기서 어떻게 막았나
 *
 * 전부 「값은 맞고 KaTeX 도 초록」이라 값 검산·냄새·조사 자가 구조적으로 못 보던 부류다.
 *
 * ㉮ **해설이 정답지 한 단을 넘었다**(3차 중1 `53V`, 1242px). → 넷 다 제품
 *    `estimateSolutionPx` 로 **800판**을 재어 잠근다(시험 「해설 높이」). 실측 최대는
 *    `101X` **408.9** · `102X` **269.9** · `103X` **422.3** · `104X` **319.4** px 다
 *    (한 단은 964.8px, 시험이 잠그는 문턱은 700px).
 *    그렇다고 **걸음을 지우지 않았다**(D-116 ⑹) — `104X` 의 나열 줄은 후보가 다섯일
 *    때도 그대로 다 적고, 버리는 걸음(`a=b+c`)도 지우지 않는다.
 * ㉯ **해설이 「자연수」 걸음을 건너뛰었다**(3차 중2 `38V`). → 정수 조건을 쓰는 것은
 *    `104X` 하나다. 그 줄은 **부등식을 정수로 바꾸지 않는다** — 범위 $|b-c|<a<b+c$ 를
 *    그대로 두고 「그 사이에 있는 $t$ 의 배수」를 **하나씩 나열**한다. 그래서 「$x\le10$」
 *    꼴의 거짓 함의가 **생길 자리가 없다**(시험이 「범위 줄에 부등호가 둘 다 엄격한가」와
 *    「나열된 값이 전부 그 범위 안인가」를 따로 잰다).
 * ㉰ **해설이 기약이 아닌 분수를 찍었다**(3차 중1 `52V`). → 지면의 모든
 *    `\dfrac{수}{수}` 가 기약이다. `101X` 는 그래서 **세 확률을 따로 약분해 적지 않는다** —
 *    분모를 세 분모의 곱 $D$ 로 통일해 **분자만** 적고, 합칠 때 한 번만
 *    `\dfrac{T_1+T_2+T_3}{D}` 로 적은 뒤 약분해 답을 낸다(4차 `37W` 의 「분자를 합의
 *    꼴로 적는다」와 같은 손질이다). 이 손질이 없으면 $\dfrac{a}{b}\times\dfrac{c}{d}$ 의
 *    결과가 거의 늘 기약이 아니다.
 * ㉱ **발문이 스스로 못 박은 상한을 오답이 넘었다**(4차 중2 `37W`, 51.7%).
 *    → 넷 다 「전체를 $1$ 로 놓고」류의 상한을 **선언하지 않는다**(공용
 *    `declaredUpperBound` 가 800판 전량에서 `null` — 시험이 잰다).
 *    🔴 **그런데 `101X` 는 그 자가 구조적으로 못 보는 자리다.** 답이 **확률**이라
 *    $1$ 을 넘는 값은 뜻이 없는데, 발문에 「전체를 $1$ 로 놓고」 같은 말이 없으므로
 *    `declaredUpperBound` 는 `null` 을 낸다. 그래서 **직접 셌다** —
 *    400판을 `asMultipleChoice` 에 태워 보기 2,000개를 훑으니 $1$ 을 넘는 것이
 *    **6개(0.30%)** 였다(4차 `37W` 는 51.7%였다). 고치는 것은 공용 `deriveFormats`
 *    라 이 갈래가 못 한다 — **리드에게 보고할 자리이고, 값이 작아 급하지 않다.**
 * ㉲ **정답이 «구간»이면 파생 오답이 뒤집힌다**(3차 중2 `35V`). → 넷 다 정답이 **한 값**
 *    이다(`101X` 만 분수 하나). 구간 답이 없으므로 그 대가를 치르지 않는다.
 * ㉳ **해설의 «말»을 지키는 시험이 없었다**(4차). → 시험이 논리 문장의 낱말을 읽는다 —
 *    `101X` 의 「동시에 일어날 수 없으므로」·「정확히 두 명」, `102X` 의 「모두 같은 비」·
 *    「둘레의 길이의 비도」, `103X` 의 「서로 지워져」·「다르므로」, `104X` 의 「배수」·
 *    「서로소」·「삼각형이 만들어지지 않으므로」. 낱말을 뒤집으면 **빨개지는** 눈금을
 *    양성·음성 둘 다 두었다.
 * ㉴ **지면이 자기가 한 줄 앞에 세운 제약을 스스로 어긴다**(4차 중3 `55W`, 100%).
 *    → `104X` 가 그 자리다. 「$${lo}$ 보다 크고 $${hi}$ 보다 작은」이라고 적은 뒤
 *    나열하는 값이 **전부 그 안**이어야 하고, 버리는 값 $b+c$ 는 **그 밖**이어야 한다.
 *    시험이 800판 전량에서 그 둘을 함께 잰다.
 * ㉵ **자료를 정렬해 찍으면 «보이는 자리»가 순위를 암시한다**(4차 중1 `63W`).
 *    → 넷 다 «자료 나열»이 없다. `104X` 의 나열은 **답의 후보**이지 자료가 아니고,
 *    작은 것부터 적는 것이 곧 풀이의 차례다.
 * ㉶ **D-20 손실 원장은 «재현 가능»해야 한다**(4차 중1 `62W`). → ⑷ 에 가드마다
 *    「이 가드 **하나만** 껐을 때」를 전수로 세어 적었다. 판 수와 답 수의 측정점을
 *    같은 자리(매개변수 전수)로 맞췄다.
 * ㉷ **내보낸 순수 함수의 주석이 코드와 어긋나면 안 된다**(4차 중3). → 네 함수의
 *    단언을 시험이 **물게** 했다(⑹ 참조).
 *
 * ## ⑷ 🔴 손실 원장 (D-20 · ㉶) — 어림하지 않고 **전수로 센 값**
 *
 * 「가드 하나만 껐을 때」를 매개변수 전수에서 다시 세었다. 분모는 유형마다 다음과 같다.
 *
 * - `101X` 세 확률을 $\dfrac{a}{b}$($b\le9$, 기약)에서 고르는 순서쌍 가운데 분모의
 *   곱이 $[24,300]$ 인 것 **11,878**
 * - `102X` $t\in[3,9]$, $s<t$ 서로소, $u\in[2,12]$, $v\in[2u+1,2u+14]$ **3,976**
 * - `103X` $m,n\le7$ 서로소, $j\le120$, $a,b\in[2,24]$, 바뀐 농도가 자연수 **17,024**
 * - `104X` $b\in[4,50]$, $c\in[3,50]$ 서로 다르고 $b+c\le80$ **2,009**
 *
 * | 유형 | 전량 | 가드 다 켠 뒤 | 정답 가짓수 | 최빈 정답(전수) | 최빈(표본 800판) |
 * |---|---|---|---|---|---|
 * | `101X` | 11,878 | **9,876** (83.1%) | 914 | **0.67%** | 1.50% |
 * | `102X` | 3,976 | **2,671** (67.2%) | 48 | **5.73%** | 6.38% |
 * | `103X` | 17,024 | **7,360** (43.2%) | 52 | **4.84%** | 6.25% |
 * | `104X` | 2,009 | **146** (7.3%) | 52 | **4.11%** | 4.00% |
 *
 * ⚠️ **전수와 표본은 다른 값이다** — 시험이 잠그는 것은 **표본 쪽**이고 문턱은 $12\%$ 다.
 *    표본은 씨앗 블록 넷($20260905$·$900000$·$123456$·$5550000$)에서 각각 잰다.
 *
 * 가드 하나만 껐을 때(전수, 다른 가드는 그대로):
 *
 * | 유형 | 가드 | 켰을 때 | 그것만 껐을 때 | 그때 가짓수·최빈 |
 * |---|---|---|---|---|
 * | `101X` | 세 확률이 서로 다르다 | 9,876 | **9,876** | 914 · 0.67% |
 * | `101X` | 세 갈래의 분자가 서로 다르다 | 9,876 | **9,876** | 914 · 0.67% |
 * | `101X` | 지름길(발문 분수·여사건·곱) | 9,876 | 10,764 | 916 · 1.62% |
 * | `102X` | 지름길(둘레 둘·$\overline{\mathrm{AB}}$) | 2,671 | 3,976 | 48 · 6.69% |
 * | `103X` | 계수 $\lvert a-b\rvert\ge2$ | 7,360 | **7,360** | 52 · 4.84% |
 * | `103X` | 지름길(농도 둘·양 둘) | 7,360 | 17,024 | 69 · 6.34% |
 * | `104X` | 후보가 $2$~$5$ 개 | 146 | 518 | 113 · 3.09% |
 * | `104X` | 지름길(두 변) | 146 | 256 | 69 · 3.91% |
 *
 * 🔴 **굵게 적은 셋은 «가드가 아니다» — 혼자 꺼도 판이 한 장도 안 늘어난다.**
 * 그 까닭을 세어서 적어 둔다(2026-08-23 「도장은 초록을 못 낸다」의 반대편 —
 * 「안 무는 줄을 가드로 읽지 마라」).
 *
 * 1. `101X` 의 두 「서로 다르다」는 **서로를 덮는 한 쌍**이다. 둘 다 끄면 10,853 이 되고
 *    (977판이 더 산다), 어느 하나만 켜도 9,876 이다. 실측으로 **「확률은 서로 다른데
 *    분자가 겹치는 판」이 0개**라 그렇다 — 분자 가드는 이 공간에서 홀로 아무것도 안 막는다.
 *    그래도 지우지 않는다: 「한 갈래만 세고 세 배 하면 된다」를 막는 뜻을 그 자리에
 *    적어 두는 줄이고, 매개변수 범위를 넓히면 갈라질 수 있다.
 * 2. `103X` 의 「계수 $\lvert a-b\rvert\ge2$」는 **막을 것이 애초에 없다.** 바뀐 농도
 *    $y=\dfrac{am+bn}{m+n}$ 이 자연수라는 조건이 $\lvert a-b\rvert=1$ 을 이미 막는다 —
 *    $b=a+1$ 이면 $am+bn\equiv n\pmod{m+n}$ 이고 $\gcd(m,n)=1$ 이라 $(m+n)\nmid n$ 이다.
 *    실측으로도 그런 판이 **0개**다. 지면에 `1x` 가 나가는 것을 막으려던 줄인데,
 *    실제로 지키는 것은 그 정수 조건이다.
 *
 * 🔴 **`103X` 의 지름길 가드가 가장 비싸다(57%를 버린다).** 그래도 켠 까닭은,
 * 남겨 두면 답 $\dfrac{PQ}{P+Q}$ 가 발문에 찍힌 네 수의 **한두 번 연산**과 우연히
 * 같아지는 판이 그만큼 많기 때문이다 — 그 판은 학생이 식을 한 줄도 안 세우고 맞힌다.
 * 대가는 **정답 가짓수 69 → 52**(작은 답이 걸려 나갔다)이고, 그 대신 최빈이
 * $6.34\%\to4.84\%$ 로 내려간다.
 *
 * `104X` 는 가드 둘이 2,009 을 146 으로 줄인다. 「후보 $2$~$5$」는 **문항이 성립하려면
 * 필요하다**(하나면 「모두 구하여」가 뜻이 없고, 여섯을 넘으면 나열 줄이 길어진다).
 * 지름길 가드는 여기서 **최빈을 $3.91\%\to4.11\%$ 로 오히려 조금 올리고** 가짓수도
 * $69\to52$ 로 줄인다 — 그래도 켠다. 남겨 두면 두 변의 한두 번 연산으로 답이 나오는
 * 판이 섞이는데, 그 우연 수준은 실측 **7.55%**(다른 판의 답을 대는 치환 대조)다.
 * 146 은 이 소단원에 필요한 변형 폭 12 를 넉넉히 넘는다.
 *
 * ## ⑷-2 지름길이 정말 막혔는가 — **치환 대조로 우연 수준을 같이 잰다**
 *
 * 「제 판의 발문 수로 답이 나오는가」만 세면 그 값이 낮은 것이 가드 덕인지 우연인지
 * 안 갈린다. 그래서 **같은 자루에 다른 판의 답**을 대 본다(400판 × 이웃 5판).
 *
 * | 유형 | 제 판 | 치환 대조(우연 수준) |
 * |---|---|---|
 * | `101X` | 20/400 (5.0%) | **4.55%** — 우연 수준과 같다 |
 * | `102X` | **0** / 400 | 29.95% |
 * | `103X` | **0** / 400 | 14.75% |
 * | `104X` | **0** / 400 | 7.55% |
 *
 * `101X` 만 우연 수준이다. 답이 **분수**라 「발문의 여섯 수로 만들 수 있는 분수」의
 * 자루가 아주 커서(세 수까지 곱하고 나누면 수천 가지) 그 안에 우연히 드는 것을
 * 더 좁히면 매개변수 공간이 무너진다. 제 판이 우연 수준을 **넘지 않으므로** 그
 * 자루에 든 것은 «지름길»이 아니라 «자루가 넓다»는 뜻이다.
 *
 * 나머지 셋은 **제 판 0** 인데 우연 수준은 $7\%$~$30\%$ 다 — 가드가 실제로 무언가를
 * 막고 있다는 뜻이다(0 이 «못 셈»이 아님을 그 대조가 증명한다).
 *
 * ## ⑷-3 변형 폭 — 씨앗 800판에서 **서로 다른 발문**
 *
 * `101X` 774 · `102X` 668 · `103X` 777 · `104X` 145. 리드가 준 최소치(5 · 9 · 12 · 12)를
 * 넷 다 넘는다. 시험은 그 최소치만큼을 **`variant` 를 돌려** 실제로 채워 본다.
 *
 * ## ⑷-4 🔴 변이 시험 — **망가뜨려 봐야 가드인 줄 안다**
 *
 * 하네스가 회차마다 ⑴ 파일이 바뀌었나 ⑵ **산출물 지문이 바뀌었나** ⑶ 그제서야 시험이
 * 빨개지나 를 차례로 묻고, 그 앞에 **음성 대조**(변이 없이 초록)를 먼저 본다. 빨간데
 * **실패한 시험 이름을 못 대면** 판정을 거부한다. 복원은 **시작할 때 읽어 둔 바이트**로
 * 한다(이 파일은 아직 미커밋이라 `git show HEAD:` 로 되돌리면 내용이 날아간다 —
 * 2026-08-23 에 값을 치른 자리다).
 *
 * **20개 가운데 16 이 빨강.** 나머지 넷은 **판정을 거부**했다(산출물이 한 글자도 안 바뀐다).
 * 넷 다 「가드가 아니다」이고, 그 까닭이 서로 다르다:
 *
 * 1. `101X` 의 「갈래를 하나 빼면 답이 달라진다」 못박기 — 분자가 모두 양수라 **늘 참**이다.
 * 2. `101X` 의 「분자가 서로 다르다」 — 「확률이 서로 다르다」가 덮는다(⑷ 1).
 * 3. `103X` 의 「계수 $\lvert a-b\rvert\ge2$」 — 정수 조건이 이미 막는다(⑷ 2).
 * 4. `104X` 의 「$\overline{\mathrm{AB}}\times a$ 가 나누어떨어지는가」에서 $\overline{\mathrm{AB}}$ 를
 *    $\overline{\mathrm{AC}}$ 로 바꾸기 — **대수적으로 같은 조건**이다.
 *    $\overline{\mathrm{BD}}+\overline{\mathrm{DC}}=a$ 이므로 $ca+ba=a(b+c)$ 이고,
 *    따라서 $(b+c)\mid ca \iff (b+c)\mid ba$ 다. 곧 「$\overline{\mathrm{BD}}$ 가 자연수」와
 *    「$\overline{\mathrm{DC}}$ 가 자연수」는 **같은 조건**이라 어느 쪽으로 적어도 된다.
 *
 * 굳힘·지름길·말·산술을 실제로 지키는 자리는 전부 빨갛다 — 특히 굳힘 함수 넷을 하나씩
 * 망가뜨린 변이(성공↔실패 뒤집기 · $\overline{\mathrm{DB}}\leftrightarrow\overline{\mathrm{AD}}$ ·
 * 가중치 뒤집기 · 삼각형 조건 지우기)가 넷 다 빨강이고, **어느 시험이 물었는지**까지
 * 하네스가 찍었다.
 *
 * ## ⑸ 번호 규약 — **`X` 접미사**
 *
 * `extensionNumberReason` 이 「숫자+영문 대문자 한 글자」를 통과시킨다.
 * `A`(색인 밖 보강)·`T`(1차)·`U`(2차)·`V`(3차)·`W`(4차)가 쓰였으므로 5차는 **`X`** 다.
 * 갈래마다 번호 구간을 나눠 받았고 이 갈래는 **`101X`~`104X`** 다.
 *
 * ## ⑹ 계약 (이웃 모듈과 한 벌)
 *
 * 1. **정답을 먼저 뽑고 발문을 역산한다.**
 * 2. `facts` 로 정답 문자열을 **다시 지을 수 있다**(시험이 왕복으로 잠근다).
 *    `facts.x` 는 답의 **첫 수** — `101X` 는 분자, `102X` 는 $\overline{\mathrm{DB}}$,
 *    `103X` 는 덜어 낸 양, `104X` 는 합이다.
 * 3. 숫자는 전부 `$...$` 안에 (`elementary/rules` `bareNumbers`).
 * 4. `attempt` 가 다 떨어지면 **던진다** — 조용히 기본값을 내지 않는다.
 * 5. 그림이 없으므로 발문이 **지면을 가리키지 않는다**(`pointsAtFigure`).
 * 6. 🔴 **해설이 걸음을 건너뛰지 않는다.** 후보를 세우는 갈래(`101X`·`104X`)는
 *    **죽는 후보가 왜 죽는지**까지 적는다.
 * 7. 🔴 **낱말 뒤 조사를 손 목록으로 적지 않는다.** 수 뒤 조사는 `m2Josa` 가
 *    **한글 음절 코드**에서 계산한다(목록이 두 벌이 될 자리가 없다).
 * 8. 🔴 **내보낸 함수의 «흔들 수 있는 인자»는 제품이 안 쓰는 길이다.** 생성기는 늘
 *    기본값으로 부른다. 그렇게 두는 까닭은, 생성기 안에서 두 판을 견주는 줄은
 *    한 번도 거부하지 못하는 «도장»이 되기 때문이다(2026-08-23).
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { attempt } from "./m1Shared";
import { eulReul, euroRo, waGwa } from "./m2Josa";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";
/** RPM 색인 정본(`scripts/rpm/rpm-type-catalog.json`)의 책·중단원 이름 — 글자 그대로. */
const BOOK_SYS = "2-1";
const BOOK_GEO = "2-2";
const MINOR_SYS_APPLY = "연립일차방정식의 활용";
const MINOR_PAR = "평행선 사이의 선분의 길이의 비";
const MINOR_PROB = "확률";

/**
 * 우리 `Unit.section` 정확한 이름 (`prisma/seed-data/units.ts` 실측).
 * 괄호 안의 쉼표·공백은 눈으로 못 가르므로 시험이 단원 정본과 **대조**한다.
 */
const SEC = {
  확률계산: "확률의 계산",
  삼평행비: "삼각형에서 평행선 사이의 선분의 길이의 비",
  농도비율: "연립방정식의 활용(농도, 비율, 합금)",
  각이등분: "삼각형의 각의 이등분선",
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

/** 보조사 — 받침 판정은 `m2Josa.eulReul` **한 곳**에서 온다(규칙을 두 벌로 안 둔다). */
function eunNeun(n: number): "은" | "는" {
  return eulReul(n) === "을" ? "은" : "는";
}

/** 주격 조사 — 같은 이유로 `m2Josa` 한 곳에서 온다. */
function iGa(n: number): "이" | "가" {
  return eulReul(n) === "을" ? "이" : "가";
}

/** 지면에 적히는 기약분수. */
function frac(n: number, d: number): string {
  return `\\dfrac{${n}}{${d}}`;
}

// ═══════════════════════════════════════════════════════════
// 101X  세 사람 중 «정확히 두 명»이 성공할 확률  (심화상)
// ═══════════════════════════════════════════════════════════

/**
 * 세 사람의 성공 확률 $\dfrac{a_i}{b_i}$ 에서 **정확히 두 명이 성공할** 확률(기약).
 *
 * 🔴 **굳힘이 없다 — 갈래를 다 세워야 한다**(심화상). 그래서 인자로 둔 것은 굳힘이
 * 아니라 **«몇 갈래를 세는가»** 다(`cases`). `cases` 의 원소 $f$ 는 「$f$ 번째 사람만
 * 실패하는 갈래」를 뜻한다 — 셋을 다 세지 않으면 확률이 작아진다.
 *
 * ⚠️ `cases` 를 주는 것은 제품이 안 쓰는 길이다(생성기는 늘 셋을 다 센다).
 *    시험이 그 걸음을 **흔들어 재려고** 남겨 둔 자리다(계약 ⑹.8).
 *
 * 확률이 아닌 값(분모가 $2$ 미만이거나 분자가 분모 이상)이면 `null`.
 */
export function exactlyTwoProbability(
  chances: ReadonlyArray<readonly [number, number]>,
  cases?: readonly number[],
): [number, number] | null {
  if (chances.length !== 3) return null;
  for (const pair of chances) {
    const [a, b] = pair;
    if (b < 2 || a < 1 || a >= b) return null;
  }
  const den = chances[0]![1] * chances[1]![1] * chances[2]![1];
  const which = cases ?? [0, 1, 2];
  let num = 0;
  for (const f of which) {
    if (f < 0 || f > 2) return null;
    let term = 1;
    for (let z = 0; z < 3; z += 1) {
      const [a, b] = chances[z]!;
      term *= z === f ? b - a : a;
    }
    num += term;
  }
  return reduceFraction(num, den);
}

/** 소재 — 「시도」의 말이 소재마다 다르므로 문장째 들고 있는다. */
const TRIALS: ReadonlyArray<{
  chance: string;
  round: string;
  done: string;
  doing: string;
  will: string;
  failing: string;
}> = [
  {
    chance: "어떤 문제를 맞힐",
    round: "세 사람이 이 문제를 각각 한 번씩 풀 때",
    done: "맞힌",
    doing: "맞히는",
    will: "맞힐",
    failing: "맞히지 못할",
  },
  {
    chance: "과녁을 맞힐",
    round: "세 사람이 화살을 각각 한 번씩 쏠 때",
    done: "맞힌",
    doing: "맞히는",
    will: "맞힐",
    failing: "맞히지 못할",
  },
  {
    chance: "자유투를 성공할",
    round: "세 사람이 자유투를 각각 한 번씩 던질 때",
    done: "성공한",
    doing: "성공하는",
    will: "성공할",
    failing: "성공하지 못할",
  },
  {
    chance: "어떤 실험에 성공할",
    round: "세 사람이 이 실험을 각각 한 번씩 할 때",
    done: "성공한",
    doing: "성공하는",
    will: "성공할",
    failing: "성공하지 못할",
  },
];

const PERSON = ["\\mathrm{A}", "\\mathrm{B}", "\\mathrm{C}"] as const;

/** 갈래 셋 — `[성공1, 성공2, 실패]`. 지면에 적는 차례가 이 차례다. */
const TWO_OF_THREE: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1, 2],
  [1, 2, 0],
  [2, 0, 1],
];

const EXACTLY_TWO: TypeEntry[] = [
  def(
    BOOK_GEO,
    MINOR_PROB,
    "101X",
    "세 사람 중 정확히 두 명이 성공할 확률",
    SEC.확률계산,
    "심화상",
    (rng): Body =>
      attempt(8000, (): Body | null => {
        const chances: [number, number][] = [];
        for (let z = 0; z < 3; z += 1) {
          const b = intBetween(rng, 2, 9);
          const a = intBetween(rng, 1, b - 1);
          if (gcd(a, b) !== 1) return null; // 발문에 적히는 분수가 기약이라야 한다
          chances.push([a, b]);
        }
        // 세 확률이 서로 달라야 갈래 셋이 서로 다른 이야기가 된다.
        // ⚠️ 이 줄과 아래 「분자가 서로 다르다」는 **서로를 덮는 한 쌍**이다 — 혼자
        //    꺼도 통과 조합이 9,876 그대로다(⑷). 둘 다 끄면 10,853 이 된다.
        const shown = new Set(chances.map(([a, b]) => `${a}/${b}`));
        if (shown.size !== 3) return null;
        const den = chances[0]![1] * chances[1]![1] * chances[2]![1];
        if (den < 24 || den > 300) return null; // 지면의 수가 너무 크면 흉하다

        const nums = TWO_OF_THREE.map(([, , f]) => {
          let term = 1;
          for (let z = 0; z < 3; z += 1) {
            const [a, b] = chances[z]!;
            term *= z === f ? b - a : a;
          }
          return term;
        });
        // 세 갈래의 분자가 서로 달라야 「하나만 세고 세 배 하면 된다」가 안 된다.
        // ⚠️ **가드로 읽지 말 것** — 실측으로 「확률은 서로 다른데 분자가 겹치는 판」이
        //    **0개**라 이 줄은 이 공간에서 홀로 아무것도 안 막는다(⑷ 1). 뜻을 그 자리에
        //    적어 두는 줄이고, 매개변수 범위를 넓히면 갈라질 수 있어 남겨 둔다.
        if (new Set(nums).size !== 3) return null;
        const total = nums[0]! + nums[1]! + nums[2]!;

        const truth = exactlyTwoProbability(chances);
        if (truth === null) return null;
        const [p, q] = truth;
        if (q === 1) return null; // 확률이 $1$ 이면 물을 것이 없다

        // 🔴 ㉵ 지름길 — 발문에 찍힌 세 분수와 그 여사건·곱으로 답이 나오면 버린다.
        const bad = new Set<string>(["1/2"]);
        const mark = (n: number, d: number): void => {
          const [x, y] = reduceFraction(n, d);
          bad.add(`${x}/${y}`);
        };
        for (const [a, b] of chances) {
          mark(a, b);
          mark(b - a, b);
        }
        const allHit = chances[0]![0] * chances[1]![0] * chances[2]![0];
        mark(allHit, den);
        mark(den - allHit, den);
        for (let z = 0; z < 3; z += 1)
          for (let y = 0; y < 3; y += 1) {
            if (z === y) continue;
            mark(
              chances[z]![0] * chances[y]![0],
              chances[z]![1] * chances[y]![1],
            );
          }
        if (bad.has(`${p}/${q}`)) return null;

        // ㉡ 갈래를 하나 빠뜨리면 답이 달라진다(늘 참이지만 못 박는다).
        const partial = exactlyTwoProbability(chances, [0, 1]);
        if (partial === null) return null;
        if (partial[0] === p && partial[1] === q) return null;

        const t = pick(rng, TRIALS);
        const g = gcd(total, den);
        const shownFracs = chances
          .map(([a, b]) => `$${frac(a, b)}$`)
          .join(", ");
        const failFracs = [1, 2]
          .map(
            (z) => `$${frac(chances[z]![1] - chances[z]![0], chances[z]![1])}$`,
          )
          .join(", ");
        const caseWords = TWO_OF_THREE.map(
          ([s1, s2]) => `$${PERSON[s1]}$와 $${PERSON[s2]}$만 ${t.doing} 경우`,
        ).join(", ");
        const line3 = ((): string => {
          const [s1, s2, f] = TWO_OF_THREE[0]!;
          return (
            `$${PERSON[s1]}$와 $${PERSON[s2]}$만 ${t.will} 확률은 ` +
            `$${frac(chances[s1]![0], chances[s1]![1])}\\times${frac(chances[s2]![0], chances[s2]![1])}\\times${frac(chances[f]![1] - chances[f]![0], chances[f]![1])}$이다. ` +
            `세 분모의 곱이 $${chances[0]![1]}\\times${chances[1]![1]}\\times${chances[2]![1]}=${den}$이므로, ` +
            `이 확률을 분모가 $${den}$인 분수로 나타내면 분자는 ` +
            `$${chances[s1]![0]}\\times${chances[s2]![0]}\\times${chances[f]![1] - chances[f]![0]}=${nums[0]}$이다.`
          );
        })();
        const restLine = ((): string => {
          const parts = [1, 2].map((idx) => {
            const [s1, s2, f] = TWO_OF_THREE[idx]!;
            return (
              `$${PERSON[s1]}$와 $${PERSON[s2]}$만 ${t.will} 확률의 분자는 ` +
              `$${chances[s1]![0]}\\times${chances[s2]![0]}\\times${chances[f]![1] - chances[f]![0]}=${nums[idx]}$`
            );
          });
          return `같은 방법으로 ${parts[0]}이고, ${parts[1]}이다.`;
        })();
        const reduceLine =
          g === 1
            ? `분자를 더하면 $${nums.join("+")}=${total}$이고, $${total}$${waGwa(total)} $${den}$의 최대공약수가 $1$이므로 더 약분되지 않아 구하는 확률은 $${frac(p, q)}$이다.`
            : `분자를 더하면 $${nums.join("+")}=${total}$이고, $${total}$${waGwa(total)} $${den}$의 최대공약수가 $${g}$이므로 약분하면 $${frac(p, q)}$이다.`;

        return {
          content:
            `세 사람 $${PERSON[0]}$, $${PERSON[1]}$, $${PERSON[2]}$가 ${t.chance} 확률이 ` +
            `각각 ${shownFracs}이다. ${t.round}, ${t.done} 사람이 정확히 두 명일 확률을 구하시오.`,
          answer: `$${frac(p, q)}$`,
          solution: [
            `${t.done} 사람이 정확히 두 명인 경우는 ${caseWords}의 세 가지이고, 이 세 경우는 동시에 일어날 수 없다.`,
            `$${PERSON[0]}$가 ${t.failing} 확률은 $1-${frac(chances[0]![0], chances[0]![1])}=${frac(chances[0]![1] - chances[0]![0], chances[0]![1])}$이고, 같은 방법으로 $${PERSON[1]}$, $${PERSON[2]}$가 ${t.failing} 확률은 각각 ${failFracs}이다.`,
            line3,
            restLine,
            `세 경우는 동시에 일어날 수 없으므로 구하는 확률은 세 확률을 모두 더한 $\\dfrac{${nums.join("+")}}{${den}}$이다.`,
            reduceLine,
            `따라서 ${t.done} 사람이 정확히 두 명일 확률은 $${frac(p, q)}$이다.`,
          ].join("\n"),
          facts: {
            x: p,
            den: q,
            a1: chances[0]![0],
            b1: chances[0]![1],
            a2: chances[1]![0],
            b2: chances[1]![1],
            a3: chances[2]![0],
            b3: chances[2]![1],
            product: den,
            t1: nums[0]!,
            t2: nums[1]!,
            t3: nums[2]!,
            total,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 102X  두 삼각형의 둘레만 주고 $\overline{DB}$ 를 되찾기  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * **굳힘 함수** — 둘레의 비가 곧 대응변의 비임을 써서 $\overline{\mathrm{DB}}$ 를 낸다.
 *
 * $\overline{\mathrm{AD}}:\overline{\mathrm{AB}}$ 가 두 둘레의 비와 같으므로
 * $\overline{\mathrm{AD}}=\overline{\mathrm{AB}}\times\dfrac{\ell}{L}$ 이고
 * $\overline{\mathrm{DB}}=\overline{\mathrm{AB}}-\overline{\mathrm{AD}}
 * =\overline{\mathrm{AB}}\times\dfrac{L-\ell}{L}$ 다.
 *
 * 🔴 **굳힘의 인자는 `usePerimeterRatio` 다.** 그 걸음을 지우고 「둘레의 **차**가 곧
 * $\overline{\mathrm{DB}}$ 」로 읽으면 $L-\ell$ 이 나온다 — 이 유형이 재려는 바로 그
 * 마디다. (`false` 는 제품이 안 쓰는 길이다. 시험이 흔들어 잰다 — 계약 ⑹.8.)
 *
 * 길이가 자연수로 떨어지지 않으면 `null`.
 */
export function segmentFromPerimeters(
  ab: number,
  whole: number,
  small: number,
  usePerimeterRatio = true,
): number | null {
  if (ab < 1 || whole < 1 || small < 1 || small >= whole) return null;
  if (!usePerimeterRatio) return whole - small;
  const v = (ab * (whole - small)) / whole;
  return Number.isInteger(v) && v > 0 ? v : null;
}

const PERIMETER_RATIO: TypeEntry[] = [
  def(
    BOOK_GEO,
    MINOR_PAR,
    "102X",
    "두 삼각형의 둘레의 길이만으로 나뉜 변의 길이 구하기",
    SEC.삼평행비,
    "심화중",
    (rng): Body =>
      attempt(6000, (): Body | null => {
        const t = intBetween(rng, 3, 9);
        const s = intBetween(rng, 1, t - 1);
        if (gcd(s, t) !== 1) return null; // 지면의 비 $s:t$ 가 기약이라야 한다
        const u = intBetween(rng, 2, 12);
        const ab = t * u;
        if (ab < 8) return null;
        // $\overline{\mathrm{AB}}$ 는 둘레의 절반보다 짧아야 삼각형이 만들어진다.
        const v = intBetween(rng, 2 * u + 1, 2 * u + 14);
        const whole = t * v;
        if (whole > 400) return null;
        const small = s * v;
        const ad = s * u;
        const db = (t - s) * u;

        // 굳힘 함수가 실제로 그 값을 내는지 — 여기서 재면 «도장»이므로 시험이 흔든다.
        if (segmentFromPerimeters(ab, whole, small) !== db) return null;
        // ㉡ 「둘레의 차」로 읽으면 답이 달라진다(늘 참이지만 못 박는다).
        if (segmentFromPerimeters(ab, whole, small, false) === db) return null;

        // 🔴 ㉵ 지름길 — 발문에 찍히는 세 수의 한두 번 연산으로 답이 나오면 버린다.
        const printed = [whole, small, ab];
        const guesses = new Set<number>();
        for (const a of printed) {
          guesses.add(a);
          guesses.add(2 * a);
          guesses.add(3 * a);
          for (const d of [2, 3, 4, 5, 6, 10]) guesses.add(a / d);
        }
        for (const a of printed)
          for (const b of printed) {
            if (a === b) continue;
            guesses.add(a - b);
            guesses.add(a + b);
            guesses.add(a * b);
            guesses.add(a / b);
            guesses.add(Math.round(a / b));
            guesses.add((a - b) / 2);
            guesses.add((a + b) / 2);
            guesses.add((a - b) / 3);
            guesses.add((a - b) / 10);
            guesses.add((a - b) / 100);
          }
        if (guesses.has(db)) return null;

        return {
          content:
            `$\\triangle ABC$에서 $\\overline{AB}$ 위의 점 $\\mathrm{D}$와 ` +
            `$\\overline{AC}$ 위의 점 $\\mathrm{E}$에 대하여 ` +
            `$\\overline{DE}\\parallel\\overline{BC}$이다. ` +
            `$\\triangle ABC$의 둘레의 길이가 $${whole}\\,\\mathrm{cm}$, ` +
            `$\\triangle ADE$의 둘레의 길이가 $${small}\\,\\mathrm{cm}$이고 ` +
            `$\\overline{AB}=${ab}\\,\\mathrm{cm}$일 때, $\\overline{DB}$의 길이를 구하시오.`,
          answer: `$${db}\\,\\mathrm{cm}$`,
          solution: [
            `$\\overline{DE}\\parallel\\overline{BC}$이므로 $\\overline{AD}:\\overline{AB}=\\overline{AE}:\\overline{AC}=\\overline{DE}:\\overline{BC}$이다.`,
            `대응하는 세 변의 비가 모두 같으면 세 변의 길이를 더한 둘레의 길이의 비도 그 비와 같다. 각 변의 길이가 같은 비로 줄어들면 그 합도 같은 비로 줄어들기 때문이다.`,
            `그러므로 $\\overline{AD}:\\overline{AB}$는 $\\triangle ADE$의 둘레의 길이와 $\\triangle ABC$의 둘레의 길이의 비와 같아 $${small}:${whole}$이다.`,
            `$${small}:${whole}=${s}:${t}$이고 $\\overline{AB}=${ab}\\,\\mathrm{cm}$이므로 $\\overline{AD}=${ab}\\times${frac(s, t)}=${ad}\\,\\mathrm{cm}$이다.`,
            `따라서 $\\overline{DB}=\\overline{AB}-\\overline{AD}=${ab}-${ad}=${db}\\,\\mathrm{cm}$이다.`,
            `실제로 $\\overline{AD}:\\overline{DB}=${ad}:${db}=${s}:${t - s}$이고, $\\triangle ADE$의 둘레의 길이는 $\\triangle ABC$의 둘레의 길이의 $${frac(s, t)}$이다.`,
          ].join("\n"),
          facts: {
            x: db,
            whole,
            small,
            ab,
            ad,
            ratioSmall: s,
            ratioWhole: t,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 103X  두 그릇에서 같은 양을 덜어 서로 바꾸어 넣기  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * **굳힘 함수** — 두 그릇의 식을 **변끼리 더해** $x$ 를 지우고 덜어 낸 양을 낸다.
 *
 * $a(P-x)+bx=Py$ 와 $b(Q-x)+ax=Qy$ 를 더하면 $x$ 항이 서로 지워져
 * $aP+bQ=(P+Q)y$ 가 되고, 여기서 얻은 $y$ 를 첫 식에 넣으면 $x$ 가 나온다.
 *
 * 🔴 **굳힘의 인자는 `weighted` 다.** 「두 그릇을 섞었으니 농도는 $a$ 와 $b$ 의
 * **단순평균**」이라고 읽으면 $y=\dfrac{a+b}{2}$ 가 되고, 그때 같은 대입은
 * $x=\dfrac{P}{2}$ 를 낸다 — 학생이 가장 흔히 하는 실수이고 이 유형이 재려는 바로
 * 그 마디다. (`false` 는 제품이 안 쓰는 길이다 — 계약 ⑹.8.)
 *
 * 덜어 낸 양이 **자연수가 아니거나 $0$ 이하**면 `null` — 그 밖의 조건은 여기서 안 본다
 * (「두 그릇의 양보다 작다」는 참인 판에서 늘 자동으로 성립하고, 흔든 판에서는 그렇지
 * 않아서 여기 넣으면 흔들기가 «계산 실패»로 뭉개진다).
 */
export function swapAmount(
  a: number,
  b: number,
  P: number,
  Q: number,
  weighted = true,
): number | null {
  if (a === b || a < 1 || b < 1 || P < 1 || Q < 1) return null;
  // $y=\dfrac{yn}{yd}$ — 더해서 얻은 가중평균이거나, 흔들었을 때의 단순평균이다.
  const yn = weighted ? a * P + b * Q : a + b;
  const yd = weighted ? P + Q : 2;
  const den = yd * (b - a);
  if (den === 0) return null;
  const v = (P * (yn - a * yd)) / den;
  if (!Number.isInteger(v)) return null;
  return v > 0 ? v : null;
}

/** 소재 — 액체와 그 안에 녹아 있는 것을 한 벌로 든다. */
const SOLUTIONS: ReadonlyArray<{ liquid: string; solute: string }> = [
  { liquid: "소금물", solute: "소금" },
  { liquid: "설탕물", solute: "설탕" },
];

const SWAP_EQUAL: TypeEntry[] = [
  def(
    BOOK_SYS,
    MINOR_SYS_APPLY,
    "103X",
    "두 그릇에서 같은 양을 덜어 서로 바꾸어 넣어 농도가 같아지는 경우",
    SEC.농도비율,
    "심화중",
    (rng): Body =>
      attempt(8000, (): Body | null => {
        const m = intBetween(rng, 1, 7);
        const n = intBetween(rng, 1, 7);
        if (m === n || gcd(m, n) !== 1) return null;
        const j = intBetween(rng, 1, 120);
        const P = (m + n) * j * m;
        const Q = (m + n) * j * n;
        if (P % 10 !== 0 || Q % 10 !== 0) return null; // 지면의 양을 둥글게
        if (P < 80 || Q < 80 || P > 1000 || Q > 1000) return null;
        const a = intBetween(rng, 2, 24);
        const b = intBetween(rng, 2, 24);
        if (a === b) return null; // 두 농도가 같으면 $x$ 가 하나로 정해지지 않는다
        // 계수 $|a-b|$ 가 $1$ 이면 지면에 `1x` 가 나간다(공용 냄새 훑개가 문다).
        // ⚠️ **가드로 읽지 말 것** — 실제로 막는 것은 바로 아래 「바뀐 농도가 자연수」다.
        //    $b=a+1$ 이면 $am+bn\equiv n\pmod{m+n}$ 이고 $\gcd(m,n)=1$ 이라
        //    $(m+n)\nmid n$ 이므로 그 조건을 통과할 수 없다(실측 0판, ⑷ 2).
        if (Math.abs(a - b) < 2) return null;
        if ((a * m + b * n) % (m + n) !== 0) return null; // 바뀐 농도가 자연수라야 한다
        const y = (a * m + b * n) / (m + n);

        const x = swapAmount(a, b, P, Q);
        if (x === null) return null;
        // 덜어 낸 양은 두 그릇의 양보다 작아야 한다 — 참인 판에서는 늘 성립한다.
        if (x >= Math.min(P, Q)) return null;
        // ㉡ 「단순평균」으로 읽으면 답이 달라진다(늘 참이지만 못 박는다).
        const naive = swapAmount(a, b, P, Q, false);
        if (naive === null || naive === x) return null;

        // 🔴 ㉵ 지름길 — 발문에 찍히는 네 수의 한두 번 연산으로 답이 나오면 버린다.
        const printed = [a, b, P, Q];
        const guesses = new Set<number>();
        for (const v of printed) {
          guesses.add(v);
          guesses.add(2 * v);
          guesses.add(3 * v);
          for (const d of [2, 3, 4, 5, 6, 10]) guesses.add(v / d);
        }
        for (const v of printed)
          for (const w of printed) {
            if (v === w) continue;
            guesses.add(v - w);
            guesses.add(v + w);
            guesses.add(v * w);
            guesses.add(v / w);
            guesses.add(Math.round(v / w));
            guesses.add((v - w) / 2);
            guesses.add((v + w) / 2);
            guesses.add((v - w) / 3);
            guesses.add((v - w) / 10);
            guesses.add((v - w) / 100);
            guesses.add(v * w - v);
          }
        if (guesses.has(x)) return null;

        const s = pick(rng, SOLUTIONS);
        const sum = a * P + b * Q;
        const total = P + Q;
        const gap = Math.abs(b - a);
        // $a<b$ 이면 $(b-a)x=Py-aP$, $a>b$ 이면 $(a-b)x=aP-Py$ — 어느 쪽이든 양수다
        // ($y$ 는 늘 $a$ 와 $b$ 사이에 있다). 그래서 지면에 음수 계수가 안 나온다.
        const rhs = b > a ? P * y - a * P : a * P - P * y;
        const check = b * (Q - x) + a * x;

        return {
          content:
            `$\\mathrm{A}$ 그릇에는 $${a}\\%$의 ${s.liquid} $${P}\\,\\mathrm{g}$이, ` +
            `$\\mathrm{B}$ 그릇에는 $${b}\\%$의 ${s.liquid} $${Q}\\,\\mathrm{g}$이 들어 있다. ` +
            `두 그릇에서 ${s.liquid}을 같은 양만큼 덜어 내어 서로 바꾸어 넣고 잘 섞었더니 ` +
            `두 그릇의 ${s.liquid}의 농도가 같아졌다. 이때 덜어 낸 ${s.liquid}의 양을 구하시오.`,
          answer: `$${x}\\,\\mathrm{g}$`,
          solution: [
            `덜어 낸 ${s.liquid}의 양을 $x\\,\\mathrm{g}$, 바꾸어 넣은 뒤 두 그릇의 농도를 $y\\%$라 하자.`,
            `$\\mathrm{A}$ 그릇에는 $${a}\\%$의 ${s.liquid} $(${P}-x)\\,\\mathrm{g}$과 $${b}\\%$의 ${s.liquid} $x\\,\\mathrm{g}$이 들어 있고 그 양은 모두 $${P}\\,\\mathrm{g}$이므로, ${s.solute}의 양에 대한 식의 각 항에 $100$${eulReul(100)} 곱하면 $${a}(${P}-x)+${b}x=${P}y$이다.`,
            `같은 방법으로 $\\mathrm{B}$ 그릇에서는 $${b}(${Q}-x)+${a}x=${Q}y$이다.`,
            `두 식을 변끼리 더하면 $x$의 계수가 $-${a}+${b}-${b}+${a}=0$이 되어 $x$가 서로 지워져 $${a}\\times${P}+${b}\\times${Q}=(${P}+${Q})y$가 된다.`,
            `좌변은 $${a}\\times${P}+${b}\\times${Q}=${sum}$이고 $${P}+${Q}=${total}$이므로, $${sum}$${eulReul(sum)} $${total}$${euroRo(total)} 나누면 $y=${sum}\\div${total}=${y}$이다.`,
            `$${a}$${waGwa(a)} $${b}$${iGa(b)} 다르므로 $x$의 계수 $${gap}$${eunNeun(gap)} $0$이 아니고, 따라서 $x$는 하나로 정해진다. $${a}\\times(${P}-x)+${b}x=${P}\\times${y}$에서 $${gap}x=${rhs}$이므로 $x=${rhs}\\div${gap}=${x}$이다.`,
            `따라서 덜어 낸 ${s.liquid}의 양은 $${x}\\,\\mathrm{g}$이다.`,
            `실제로 $\\mathrm{B}$ 그릇에서도 $${b}\\times(${Q}-${x})+${a}\\times${x}=${check}$이고 $${Q}\\times${y}=${check}$이므로 두 그릇의 농도가 모두 $${y}\\%$로 같아진다.`,
          ].join("\n"),
          facts: {
            x,
            a,
            b,
            amountA: P,
            amountB: Q,
            mixed: y,
            saltSum: sum,
            totalAmount: total,
            gap,
            naive,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 104X  각의 이등분선 — $\overline{BD}$ 가 자연수인 $\overline{BC}$ 를 모두  (심화상)
// ═══════════════════════════════════════════════════════════

/**
 * $\overline{\mathrm{AB}}=c$, $\overline{\mathrm{AC}}=b$ 인 $\triangle\mathrm{ABC}$ 에서
 * $\angle\mathrm{A}$ 의 이등분선이 $\overline{\mathrm{BC}}$ 와 만나는 점을
 * $\mathrm{D}$ 라 할 때, $\overline{\mathrm{BC}}$ 와 $\overline{\mathrm{BD}}$ 가
 * **둘 다 자연수**가 되는 $\overline{\mathrm{BC}}$ 를 작은 것부터 모두 낸다.
 *
 * $\overline{\mathrm{BD}}:\overline{\mathrm{DC}}=c:b$ 이므로
 * $\overline{\mathrm{BD}}=\dfrac{c}{b+c}\overline{\mathrm{BC}}$ 이고,
 * $c$ 와 $b+c$ 를 최대공약수로 나눈 $c'$ 과 $t=b'+c'$ 은 서로소이므로
 * $\overline{\mathrm{BC}}$ 가 **$t$ 의 배수**여야 한다.
 *
 * 🔴 **굳힘이 없다 — 후보를 다 세워 견주어야 한다**(심화상). 그래서 인자로 둔 것은
 * 굳힘이 아니라 **«삼각형이 되는 범위로 거르는가»** 다(`triangleRule`). `false` 면
 * $1$ 부터 $b+c$ 까지의 $t$ 의 배수를 **전부** 센다 — 두 변의 길이의 차 이하인 값과
 * $b+c$ 자신이 살아나 합이 커진다. (제품이 안 쓰는 길이다 — 계약 ⑹.8.)
 */
export function bisectorNaturalBases(
  b: number,
  c: number,
  triangleRule = true,
): number[] {
  if (b < 1 || c < 1) return [];
  const out: number[] = [];
  const lo = triangleRule ? Math.abs(b - c) : 0;
  const hi = triangleRule ? b + c - 1 : b + c;
  for (let a = lo + 1; a <= hi; a += 1) {
    if ((c * a) % (b + c) !== 0) continue;
    out.push(a);
  }
  return out;
}

const BISECTOR_NATURAL: TypeEntry[] = [
  def(
    BOOK_GEO,
    MINOR_PAR,
    "104X",
    "각의 이등분선으로 나뉜 길이가 자연수가 되는 밑변의 길이 모두 구하기",
    SEC.각이등분,
    "심화상",
    (rng): Body =>
      attempt(8000, (): Body | null => {
        const b = intBetween(rng, 4, 50);
        const c = intBetween(rng, 3, 50);
        if (b === c) return null; // 이등변이면 $\mathrm{D}$ 가 중점이라 조건이 시시하다
        if (b + c > 80) return null; // 지면의 수가 너무 크면 흉하다
        const g = gcd(b, c);
        const bp = b / g;
        const cp = c / g;
        const t = bp + cp;
        const list = bisectorNaturalBases(b, c);
        // 후보가 하나면 「모두 구하여」가 뜻이 없고, 여섯을 넘으면 나열 줄이 길어진다.
        if (list.length < 2 || list.length > 5) return null;
        const sum = list.reduce((s, v) => s + v, 0);
        // ㉡ 삼각형 조건을 안 쓰면 합이 달라진다(늘 참이지만 못 박는다).
        const loose = bisectorNaturalBases(b, c, false);
        if (loose.reduce((s, v) => s + v, 0) === sum) return null;

        // 🔴 ㉵ 지름길 — 발문에 찍히는 두 수의 한두 번 연산으로 답이 나오면 버린다.
        const guesses = new Set<number>();
        for (const v of [b, c]) {
          guesses.add(v);
          guesses.add(2 * v);
          guesses.add(3 * v);
          guesses.add(4 * v);
          guesses.add(v * v);
          guesses.add(v / 2);
        }
        guesses.add(b + c);
        guesses.add(Math.abs(b - c));
        guesses.add(b * c);
        guesses.add((b * c) / 2);
        guesses.add((b * c) / 3);
        guesses.add(2 * (b + c));
        guesses.add(3 * (b + c));
        guesses.add(4 * (b + c));
        guesses.add(b * c - b);
        guesses.add(b * c - c);
        if (guesses.has(sum)) return null;

        const lo = Math.abs(b - c);
        const hi = b + c;
        const listed = list.map((v) => `$${v}$`).join(", ");
        const bdList = list.map((v) => `$${(cp * v) / t}$`).join(", ");
        // 🔴 `g===1` 이면 후보가 아예 없으므로 여기까지 오지 않는다(그때 $t=b+c$ 라
        //    범위 안에 배수가 없다). 그래도 두 갈래를 다 적어 둔다 — 지면이 자기가
        //    적은 비를 다시 줄여 적는 «되풀이 줄」이 되지 않게 한다.
        const ratioTail = g === 1 ? `${c}:${b}` : `${c}:${b}=${cp}:${bp}`;

        return {
          content:
            `$\\triangle ABC$에서 $\\overline{AB}=${c}\\,\\mathrm{cm}$, ` +
            `$\\overline{AC}=${b}\\,\\mathrm{cm}$이고 $\\overline{BC}$의 길이는 자연수이다. ` +
            `$\\angle A$의 이등분선이 $\\overline{BC}$와 만나는 점을 $\\mathrm{D}$라 할 때, ` +
            `$\\overline{BD}$의 길이도 자연수가 되도록 하는 $\\overline{BC}$의 길이를 ` +
            `모두 구하여 그 합을 구하시오.`,
          answer: `$${sum}\\,\\mathrm{cm}$`,
          solution: [
            `$\\overline{AD}$가 $\\angle A$의 이등분선이므로 $\\overline{BD}:\\overline{DC}=\\overline{AB}:\\overline{AC}=${ratioTail}$이다.`,
            `$\\overline{BC}=a\\,\\mathrm{cm}$라 하면 $\\overline{BD}=${frac(cp, t)}\\times a$이고, $${cp}$${waGwa(cp)} $${t}$${eunNeun(t)} 서로소이므로 $\\overline{BD}$가 자연수가 되려면 $a$가 $${t}$의 배수여야 한다.`,
            `한편 세 변의 길이가 $a$, $${c}$, $${b}$인 삼각형이 만들어지려면 두 변의 길이의 합이 나머지 한 변의 길이보다 커야 하므로 $${lo}<a<${hi}$이어야 한다.`,
            `$${lo}$보다 크고 $${hi}$보다 작은 $${t}$의 배수는 ${listed}의 $${list.length}$개이고, 이때 $\\overline{BD}$는 차례로 ${bdList}${euroRo((cp * list[list.length - 1]!) / t)} 모두 자연수이다.`,
            `$a=${hi}$${eunNeun(hi)} $${t}$의 배수이지만 이때는 $\\overline{AB}+\\overline{AC}=\\overline{BC}$가 되어 삼각형이 만들어지지 않으므로 버린다.`,
            `따라서 구하는 합은 $${list.join("+")}=${sum}$이다.`,
          ].join("\n"),
          facts: {
            x: sum,
            sideAB: c,
            sideAC: b,
            step: t,
            count: list.length,
            lo,
            hi,
            first: list[0]!,
            last: list[list.length - 1]!,
          },
          figureSpec: null,
        };
      }),
  ),
];

/**
 * 중2 확대 갈래 5차 물결 `m2Top5a` 명부 — `generate.ts` 의 `ALL` 이 이것 하나만
 * spread 한다(그 한 줄은 **리드가** 넣는다).
 *
 * 갈래별 몫: **심화중 2**(`102X`·`103X`) · **심화상 2**(`101X`·`104X`).
 */
export const M2_TOP_5A: TypeEntry[] = [
  ...EXACTLY_TWO,
  ...PERIMETER_RATIO,
  ...SWAP_EQUAL,
  ...BISECTOR_NATURAL,
];
