/**
 * 중1 **5차 확대 갈래 (갈래 i)** — `심화중`·`심화상` 넷을 더한다 (D-116, 2026-09-04).
 *
 * ## 왜 또 새 파일인가
 *
 * `m1Top.ts`~`m1Top5h.ts` 는 각각 자기 유형을 **개수로 얼린** 시험을 달고 있다
 * (`expect(M1_TOP_5A).toHaveLength(4)` 따위). 거기에 유형을 더하면 그 가드가 빨개지고,
 * 초록으로 되돌리는 유일한 길이 **가드를 무르는 것**이 된다. 그리고 이번 물결은
 * 21갈래가 **동시에** 돈다 — 남의 파일을 만지면 말없이 덮어쓴다(2026-08-23
 * 「미커밋 새 파일이 가장 약한 고리」). 새 파일 하나 + `generate.ts` **spread 한 줄**
 * (리드 몫)이면 그 둘을 다 피한다.
 *
 * 규칙을 두 벌로 두지 않으려고 `m1Top.ts` 의 `gcd` 와 4차 물결의 `pageShortcutValues`
 * 를 **읽어만 온다**(고치지 않는다).
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
 * | `구의 겉넓이와 부피\|97X` | **심화중** | 두 구의 **반지름** — 발문이 하나도 안 준다. 그리고 중1의 셈으로는 끝내 구할 수 없다(세제곱근이 필요하다) | 이 소단원의 두 공식 $S=4\pi r^{2}$·$V=\dfrac{4}{3}\pi r^{3}$ 이 굳힌다. 겉넓이의 비 $\Rightarrow$ 반지름의 비 $\Rightarrow$ 부피의 비가 **반지름을 한 번도 구하지 않고** 이어져, 남은 것은 비의 몫을 나누는 한 걸음뿐이다(D-115 ⑾) | `21`·`22`·`27`·`90` 은 반지름이나 부피를 **하나 주고** 공식을 한 번 쓴다. `28` 은 한 구의 겉넓이와 부피의 비다. `91`(응용)은 **두 반지름을 다 주고** 세제곱의 비만 쓴다 — `97X` 만 반지름이 **양쪽 다 없고** 겉넓이↔부피를 **건너뛴다** |
 * | `유리수의 곱셈\|98X` | **심화중** | $a$, $b$, $c$ 의 값 — 세 식 각각만으로는 어느 것도 한 수로 안 정해진다(식 하나에 미지수 둘) | 이 소단원의 개념 **곱셈의 교환·결합법칙**이 세 식을 한 덩어리로 접어 $(a\times b\times c)$ 를 두 번 곱한 값을 내고, **부호 규칙(음수의 개수)** 이 남은 두 후보 중 하나를 «끝까지 계산하지 않고» 거른다 | `12`·`70`·`71`(연산)은 수를 그대로 곱한다. `13`·`15`·`17` 은 법칙을 한 번 쓴다. `14`·`16`(심화하)은 뽑거나 묶어 세는 것이다. `98X` 만 **세 수를 하나도 구하지 않고** 세 수의 곱을 낸다 |
 * | `합동\|99X` | **심화상** | 세 변의 길이 — 둘레 하나로는 안 정해진다(미지수 셋에 식 하나) | 굳지 **않는다**. 가장 긴 변 $c$ 를 범위 안에서 하나씩 놓고 그때마다 $(a, b)$ 를 **실제로 다 만들어** $a\le b\le c$ 를 확인해야 한다. 합동(SSS)은 «무엇을 같은 것으로 셀지»를 정할 뿐, 후보를 줄여 주지 않는다 | `08`·`73`·`74`·`75`·`76` 은 두 도형이 합동임을 **주고** 대응변·대응각을 옮겨 적는다. `09`·`10`·`11`·`12`·`13` 은 합동 조건 판정이고 `14` 는 활용이다. `99X` 만 **도형이 하나도 주어지지 않고** 후보를 다 만들어야 한다 |
 * | `뿔의 겉넓이와 부피\|100X` | **심화중** | **모선의 길이** — 발문이 안 준다(밑면의 반지름만 준다) | 이 소단원의 개념 「원뿔의 옆면은 **모선을 반지름으로 하는 부채꼴**」이 굳힌다. 굴러간 자취의 원이 곧 그 부채꼴을 한 바퀴 펼친 원이므로, 굴린 횟수 하나로 모선이 한 줄에 나온다 — 후보를 하나도 만들지 않는다 | `10`·`11`·`13`·`14` 는 반지름·높이·모선을 **다 주고** 공식을 한 번 쓴다. `12`·`15` 는 뿔대, `16` 은 잘라 낸 각뿔, `18` 은 그릇의 물, `19` 는 전개도가 **주어진** 원뿔, `20` 은 회전체다. `100X` 만 **모선이 발문에 없다** |
 *
 * ## 🔴 앞 물결들이 실제로 낸 결함 — 여기서 어떻게 막았나
 *
 * ㉮ **해설이 정답지 한 단(964.8px)을 넘었다**(3차 중1 `53V`, 최대 1242px). 넘치면 그 쪽
 *    **다른 문항의 해설이 통째로 사라진다**(`column-count:2` + `overflow:hidden`).
 *    → 훑는 자리가 있는 것은 `99X` **하나뿐**이고, 그 훑는 자리에 상한을 두었다
 *      (둘레 $L$ 을 최대 $38$ 로 막아 가장 긴 변의 후보가 여섯 줄을 넘지 않는다).
 *      나머지 셋은 걸음 수가 판마다 **똑같다**(여덟·여덟·일곱 줄). 실측 660판 최대는
 *      `97X` $301.5$px · `98X` $367.0$px · `99X` $564.9$px · `100X` $279.7$px 이고,
 *      시험이 제품 `estimateSolutionPx` 로 660판을 다시 재어 **700px 미만**을 잠근다.
 *      ⚠️ 줄이는 길이 「걸음 지우기」이면 안 된다(D-116 ⑹) — 후보마다 «왜 살고 죽는지»는
 *      그대로 두고 **훑는 범위**만 줄였다.
 * ㉯ **해설이 「자연수」 걸음을 건너뛰었다**(3차 중2 `38V`). → 넷 다 부등식에서 정수로
 *    **뛰는 걸음이 없다.** `99X` 만 부등호를 쓰는데, 그것은 $2c<L$ 에서 $c$ 의 **범위**를
 *    읽는 것이고 그 자리에 「$c$ 는 자연수이므로」라는 근거를 **그 줄에** 적는다.
 * ㉰ **해설이 기약이 아닌 분수를 찍었다**(3차 중1 `52V`, 17.5%).
 *    → 지면의 `\dfrac` 은 두 종류뿐이다: `97X`·`100X` 의 부피 공식 $\dfrac{4}{3}$(정의상 기약)과
 *      `98X` 의 유리수(생성기가 **기약으로 정규화한 뒤에만** 지면에 쓴다. `ratTex` 는
 *      분모가 $1$ 이면 분수를 아예 안 만든다). 시험이 지면의 모든 분수를 훑어 다시 잰다.
 * ㉱ **발문이 스스로 못 박은 상한을 오답이 넘었다**(4차 중2 `37W`, 51.7%). → 넷 다
 *    「전체를 $1$로 놓고」류 상한을 **선언하지 않는다**(`declaredUpperBound` 가 `null`).
 *    시험이 660판 전부에서 그것을 찍고, 그 함수가 «있다»도 낼 수 있음을 양성으로 보인다.
 * ㉲ **정답이 «구간»이면 파생 오답이 뒤집힌다**(3차 중2 `35V`). → 넷 다 정답이 **한 수**다.
 * ㉳ **해설의 «말»을 지키는 시험이 없었다**(4차, 중1 10줄이 무방비). → 시험이
 *    「정비례↔반비례」·「음수↔양수」·「짝수↔홀수」·「합동↔합동이 아니다」·「작아야↔커야」·
 *    「모선↔밑면」을 **낱말과 수를 함께** 판정하고, 낱말을 뒤집으면 빨개지는 눈금을
 *    양성·음성 양쪽으로 둔다. `toContain` 한 줄로 끝내지 않는다.
 * ㉴ **지면이 자기가 한 줄 앞에 세운 제약을 스스로 어긴다**(4차 중3 `55W`, 100%).
 *    → `97X` 는 마지막 줄에서 「반지름의 길이를 구하지 않아도」라고 적고, 실제로
 *      **해설 어디에도 반지름의 «값»이 없다**(비만 쓴다). `99X` 는 「$c\le C$」·「$c\ge c_0$」
 *      를 적고 **그 뒤 모든 훑는 줄이 그 범위 안**이며, 늘어놓는 $(a, b)$ 가 전부
 *      $a\le b\le c$ 를 지킨다. 시험이 셋 다 판정한다.
 * ㉵ **자료를 정렬해 찍으면 «보이는 자리»가 순위를 암시한다**(4차 중1 `63W`, 100%).
 *    → 발문에 **자료를 늘어놓는 유형이 하나도 없다**(발문에 든 수가 최대 넷이다).
 *      `99X` 의 해설은 후보를 늘어놓지만 그것은 **답을 세는 과정**이지 발문의 자료가 아니다.
 * ㉶ **D-20 손실 원장은 «재현 가능»해야 한다**(4차 중1 `62W`). → 가드마다 「이 가드
 *    **하나만** 껐을 때」를 창 전수로 세어 아래 표에 적었다. 측정점은 **판**과
 *    **서로 다른 답** 둘이고 한 행에 섞지 않았다. 어림한 자리는 하나도 없다.
 * ㉹ **정답 쏠림** — 씨앗 $220$ × 변형 $3$ = $660$판 실측 최빈 비중:
 *    `97X` **2.42%**(서로 다른 답 $153$) · `98X` **5.76%**($58$) · `99X` **4.70%**($43$) ·
 *    `100X` **2.73%**($101$). 넷 다 문턱 $12$% 아래다.
 *    ⚠️ `99X` 는 처음에 **13.33%** 였다 — 까닭이 둘이고 **둘 다 세어서** 고쳤다.
 *    ⑴ 「몇 개인가」만 물으면 서로 다른 답이 $14$가지뿐이다(Alcuin 수열이 되풀이된다).
 *    ⑵ `createRng` 의 **첫 출력**이 등차수열 씨앗에서 고르지 않다($22$칸에 대면 가장
 *       무거운 칸이 $47$, 기댓값 $30$). 창을 한 덩어리로 만들어 `pick` 한 번으로 뽑으면
 *       그 쏠림이 답의 쏠림으로 그대로 나온다. 그래서 `99X`·`100X` 는 **축마다 따로**
 *       뽑는다. 「분모를 안 보고 문턱만 옮기면 안 된다」의 또 한 얼굴이다.
 * ㉷ **내보낸 순수 함수의 주석이 코드와 어긋나면 안 된다**(4차 중3 `solveBoxCases`).
 *    → 아래 순수 함수의 단언은 전부 시험이 문다. **늘 참인 죽은 조건도 하나 지웠다** —
 *      `tripleProduct` 에 「$b$, $c$ 의 부호가 $b\times c$ 와 어긋나는가」를 따로 두었는데,
 *      $\mathrm{sgn}(ab)\,\mathrm{sgn}(bc)\,\mathrm{sgn}(ca)$ 가 언제나 $+$ 라 그 자리에
 *      오면 **반드시 통과**하는 조건이었다(그 함수의 주석에 까닭을 적어 두었다).
 *
 * ## 🔴 변이 시험 — 14개 전부 빨강 (2026-09-04)
 *
 * 하네스의 순서는 셋이다: ⑴ 파일이 바뀌었나 ⑵ **산출물이 바뀌었나** ⑶ 그제서야 시험이
 * 빨개지나. ⑵ 를 건너뛰면 «가드가 아니다»가 거짓말이 된다. 변이 **전에** 음성 대조
 * (손 안 댄 판이 초록인가)를 회차마다 구성으로 증명하고, 복원은 **시작할 때 읽어 둔
 * 바이트 그대로** 한 뒤 바이트 일치를 확인한다.
 *
 * 굳힘 함수 넷(비·세 곱·삼각형 후보·모선), 지면을 짓는 자리 넷(계수 $1$·주격 조사·
 * 분모 $1$ 분수·마무리의 몫), 근거를 적는 자리 셋(자연수 근거·음수의 개수·밑넓이의 지수),
 * 자 둘(지면 수 목록·지름길 가드 자체)을 하나씩 망가뜨렸다. **열넷이 전부 빨강**이고,
 * 그중 「계수 $1$」은 냄새 자만, 「주격 조사」는 «이/가» 자만 잡았다 — 축이 겹치지 않는다.
 * ㉸ 우리말 — 「그중」은 붙여 쓰고, 조사는 **지면에 찍히는 글자**로 정한다
 *    (`waGwa`·`eunNeun` 을 `m2Josa` **한 곳**에서 가져온다).
 *
 * ## 🔴 잰 값 (창 전수 · 재현 가능)
 *
 * 「이 가드 하나만 껐을 때」를 창 전수로 세었다. 널 모형은 「답을 판끼리 돌려 끼웠을 때
 * 그 답이 지름길 자에 걸리는 비율」(우연 수준)이다. **표의 값은 시험이 다시 잰다** —
 * 어긋나면 빨개진다.
 *
 * | 유형 | 가드 끔(판·답) | 가드 켬(판·답) | 잃은 판 | 잃은 답 | 우연 수준(널 모형) |
 * |---|---|---|---|---|---|
 * | `97X` | $382$ · $139$ | $345$ · $133$ | $37$ (**9.69%**) | $6$ | **4.71%** |
 * | `98X` | $13{,}068$ · $66$ | $6{,}348$ · $60$ | $6{,}720$ (**51.42%**) | $6$ | **31.11%** |
 * | `99X` | $168$ · $40$ | $168$ · $40$ | $0$ (**0.00%**) | $0$ | **1.79%** |
 * | `100X` | $220$ · $101$ | $220$ · $101$ | $0$ (**0.00%**) | $0$ | **0.45%** |
 *
 * 🔴 **정직하게 적어 둘 것 둘**:
 * ⑴ `99X`·`100X` 의 지름길 가드는 **한 판도 안 자른다.** 「일하는 가드」로 읽지 마라.
 *    `99X` 의 지면에는 수가 $L$ **하나뿐**이라 이 자가 만들 수 있는 것이 $\{L\}$ 뿐이고
 *    (최댓값·최솟값·합·최대공약수가 전부 $L$ 이다), 답은 이 창에서 $L$ 과 한 번도
 *    같지 않다. `100X` 의 지면에는 $r$ 과 $n$ 둘뿐이고 답 $r^{2}(n+1)$ 은 그 둘의
 *    합·차·곱·몫·최대공약수·최소공배수 어느 것과도 안 겹친다.
 *    ⚠️ 그렇다고 「이 가드는 «아니오»를 못 낸다」가 아니다 — 널 모형이 $1.79$%·$0.45$%
 *    로 **$0$ 이 아니다**(답을 돌려 끼우면 실제로 걸린다). 시험이 그 둘을 갈라 찍는다
 *    (2026-08-21 「0은 «깨끗»과 «못 셈»을 안 가른다」).
 * ⑵ `98X` 는 창의 **절반**을 버린다(51.42%). 그 유형의 지면에는 수가 **넷 또는 다섯**
 *    (정수 곱은 한 자리, 분수 곱은 분자·분모 두 자리)이고 답이 두 자리 정수라,
 *    조합이 답을 맞힐 자리가 우연 수준으로도 31.11% 나 된다.
 *    실제 비율이 우연보다 **높으므로**(51.42% vs 31.11%) 이 가드는 장식이 아니다.
 *    `97X` 도 우연보다 높다(9.69% vs 4.71%).
 * 어느 쪽이든 **내보내는 판의 지름길 비율은 $0$%** 이고, 시험이 창 전수와 660판
 * 산출물 양쪽에서 판정기의 자로 다시 잰다.
 *
 * ## 🔴 변형 폭 — 「$0$..$\text{floor}-1$ 만으로 늘 되지는 않는다」를 숨기지 않는다
 *
 * 리드가 준 폭은 `97X` $6$ · `98X` $12$ · `99X` $12$ · `100X` $12$ 다. 씨앗은 변형마다
 * `seed + variant\times0x9e37` 로만 갈리므로 **어느 두 변형이 창의 같은 자리를 뽑을 수
 * 있다** — 생일 문제다. 창이 $W$ 이고 $k$개를 뽑으면 겹칠 기댓값이 $\dfrac{k(k-1)}{2W}$
 * 라, $W$ 를 아무리 키워도 $0$ 이 되지 않는다. `99X` 는 창이 $44$ 로 가장 좁아
 * 이 자리가 가장 뚜렷하다.
 *
 * 실측(씨앗 $220$개 · **등록 전** 대역 경로):
 *
 * | 유형 | 창 | 폭 | $0$..$\text{floor}-1$ 이 전부 다른 씨앗 | 그때의 최소 | 예산 안 최대 변형 |
 * |---|---|---|---|---|---|
 * | `97X` | $345$ | $6$ | $208/220$ (**94.5%**) | $4$ | $8$ |
 * | `98X` | $6{,}348$ | $12$ | $215/220$ (**97.7%**) | $11$ | $13$ |
 * | `99X` | $168$ | $12$ | $153/220$ (**69.5%**) | $9$ | $15$ |
 * | `100X` | $220$ | $12$ | $156/220$ (**70.9%**) | $10$ | $15$ |
 *
 * 제품은 이 겹침을 이미 다룬다 — `generateMiddleSet` 이 발문이 같으면 버리고 **변형
 * 번호를 올려 다시 뽑는다**(예산 $n\times30=360$). 위 표의 「예산 안 최대 변형」이
 * $15$ 이하이므로 넉넉하다. 그래서 시험이 잠그는 것은
 * ⑴ 제품의 그 예산 안에서 폭만큼 **서로 다른 발문이 반드시 나온다**(씨앗 220개 전부)와
 * ⑵ 「$0$..$\text{floor}-1$ 만으로 되는 씨앗의 비율」이 **아래 하한 위**라는 것이다.
 *
 * ⚠️ ⑵ 를 **딱 그 값으로** 못 박지 않고 하한으로 둔 까닭: 5차a 가 그렇게 했다가
 *    등록되는 날 넷 다 빨개졌다 — `generate.ts` 의 씨앗 소금(`Math.imul`)과 갈래의
 *    대역(`Math.abs(h) % 100000`)이 **다른 rng 흐름**이라 등록 전후로 값이 달라진다.
 *    그건 결함이 아니라 **재는 자리가 바뀐 것**이다. 하한은 양쪽에서 다 참이다.
 *
 * ## 번호 규약 — **`X` 접미사**
 *
 * `extensionNumberReason`(`src/__tests__/helpers/rpmCatalog.ts`)은 `숫자+영문 대문자
 * 한 글자` 를 「색인 번호와 절대 안 겹친다」로 통과시킨다. 중1에는 이미 `A`(색인 밖
 * 보강)·`T`(1차)·`U`(2차)·`V`(3차)·`W`(4차)가 쓰였으므로 5차 물결은 **`X`** 로 대를
 * 가른다. 번호대는 리드가 갈래마다 나눠 배정했다 — 이 갈래는 **97~100** 이다.
 *
 * ## 🔴 초등이 네 물결에 걸쳐 물린 함정 셋 — 여기서 어떻게 피했나
 *
 * ㉠ **창을 한쪽 끝만 주면 굳힘이 장식이 된다.** 「살아남는 후보가 언제나 목록의 같은
 *    자리」면 굳힘 조건은 «어느 후보인가»를 한 번도 안 고른다.
 *    → `99X` 는 답이 **살아남은 것 전부의 개수**이고, 가장 긴 변 $c$ 의 후보 중 몇 개가
 *      사는지가 씨앗을 가로질러 갈린다(시험이 그 사실을 따로 잰다).
 *    → `97X`·`98X`·`100X` 는 후보 목록이 **아예 없다**(값이 하나로 굳는다). 「축이 없다」와
 *      「축이 초록이다」는 다른 말이므로 시험이 그 셋의 ㉠ 을 **«해당 없음»으로 따로 찍고**,
 *      대신 「굳힘 인자를 흔들면 답이 갈리는가」를 창 전수로 잰다.
 * ㉡ **「굳힘이 항등식」** — 굳힘 인자를 흔들어도 답이 그대로면 장식이다. 넷 다 굳힘을
 *    **인자로 받는 순수 함수**로 뽑아 두었다: `sphereRatios` · `tripleProduct` ·
 *    `trianglesByLongestSide` · `coneFromRolls`.
 *    ⚠️ 그 자가 «아니오»를 낼 수 있음을 **음성 대조**로 보인다 —
 *      `sphereRatios` 는 비가 기약이 아니면 던지고,
 *      `tripleProduct` 는 세 곱의 곱이 제곱수가 아니면 `null` 을 내며(그런 세 값이 실재한다),
 *      `trianglesByLongestSide` 는 $L\le2$ 에서 **빈 배열**을 내고($L=4$ 도 그렇다),
 *      `coneFromRolls` 는 $n\le1$ 에서 던진다(굴러서 제자리로 오지 못한다).
 *      음성 대조가 없으면 그 가드의 «0» 이 «깨끗»인지 «못 셈»인지 안 갈린다(2026-08-21).
 * ㉢ **갈래끼리 겹침** — 위 표의 마지막 칸이 쌍마다 «푸는 절차가 어디서 갈리는가»를 적은
 *    것이다. 🔴 **정직하게 적어 둘 것 셋**:
 *    ⑴ `97X` 와 형제 `91`(응용)은 둘 다 「부피는 반지름의 세제곱에 정비례한다」를 쓴다.
 *       `91` 은 **두 반지름을 다 주므로** 그 한 줄이 곧 답이고, `97X` 는 반지름이 양쪽 다
 *       없어 «겉넓이의 비 → 반지름의 비» 를 먼저 건너야 한다. 그래도 **한 문장이 닮았다**는
 *       사실은 적어 둔다(시험이 형제와의 닮음을 기준선으로 잰다).
 *    ⑵ `98X` 와 형제 `17`(분배법칙)은 첫 문장의 **뼈대가 닮았다** — 「$a\times b=\dots$,
 *       $\dots$일 때 …의 값을 구하시오」. `17` 은 두 값을 **더할 뿐**이고 `98X` 는 세 값을
 *       곱해 제곱을 접는다. 지면 낱말이 갈리도록 발문을 다시 썼다.
 *
 *    형제와의 한글 Jaccard 실측(씨앗 $20260827$) — 「가장 닮은 형제」와 그 소단원 형제끼리의
 *    기준선을 나란히 적는다. 기준선 **최댓값**을 면제부로 쓰지 않고(그 값은 「이 열쇠로는
 *    안 갈린다」는 뜻일 수 있다) **중앙값의 세 배**를 문턱으로 삼는다.
 *
 *    | 유형 | 형제 수 | 기준선 중앙값 | 기준선 최댓값 | 내 최댓값(상대) | 그다음 |
 *    |---|---|---|---|---|---|
 *    | `97X` | $10$ | $0.143$ | $0.500$ | **$0.273$** (`27`) | $0.154$ |
 *    | `98X` | $10$ | $0.000$ | $1.000$ | **$0.250$** (`14`) | $0.182$ |
 *    | `99X` | $11$ | $0.167$ | $0.875$ | **$0.222$** (`09`) | $0.103$ |
 *    | `100X` | $10$ | $0.167$ | $0.700$ | **$0.227$** (`11`) | $0.174$ |
 *
 *    넷끼리는 $0.034$~$0.115$ 로 훨씬 낮다 — 같은 시험지에 넷이 함께 실려도 된다.
 *    ⑶ `99X` 의 「후보를 차례로 놓고 조건을 확인한다」는 4차 `64W`(밑면의 두 치수)·
 *       5차a `66X`(호가 자연수인 $n$)와 **축이 같다**. 다만 확인하는 것이 「나누어떨어지나」가
 *       아니라 **「삼각형이 되나」**(부등식)이고, 소단원·책·소재가 다르다. 「같은 꼴을
 *       또 냈다」는 판단은 **리드 몫**으로 넘긴다.
 *
 * ## 계약 (이웃 모듈과 한 벌 — `m1Top.ts`~`m1Top5h.ts` 머리말과 같다)
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
// 최대공약수 규칙을 두 벌로 두지 않는다 — `m1Top.ts` 것을 **읽어만** 온다.
import { gcd } from "./m1Top";
// 지름길 자도 두 벌로 두지 않는다 — 4차 물결 것을 **읽어만** 온다.
import { pageShortcutValues } from "./m1Top4";
import { eulReul, euroRo, waGwa } from "./m2Josa";
import type { TypeEntry } from "./types";

const BOOK1 = "1-1";
const BOOK2 = "1-2";
const MINOR_CALC = "정수와 유리수의 계산";
const MINOR_CONSTR = "작도와 합동";
const MINOR_SOLID = "입체도형의 겉넓이와 부피";

/**
 * 우리 `Unit.section` 정확한 이름.
 *
 * ⚠️ 손으로 적되 **시험이 `prisma/seed-data/units.ts` 정본과 글자 그대로 대조한다**.
 * 다른 소단원에는 괄호·쉼표가 섞인 것도, **가는 공백 U+2009** 가 든 것도 있어서
 * 눈으로는 안 갈린다.
 */
const SEC = {
  구: "구의 겉넓이와 부피",
  곱셈: "유리수의 곱셈",
  합동: "합동",
  뿔: "뿔의 겉넓이와 부피",
} as const;

// ── 소품 ────────────────────────────────────────────────────

/**
 * 주격 조사 — `$41$이` · `$9$가`. 받침 판정은 `m2Josa` **한 곳**에서 온다.
 *
 * ⚠️ 공용 조사 자(`josaMismatches`)는 「이」를 **안 본다** — 서술격 「$5$이다·$5$이므로」와
 *    안 갈리기 때문이다. 그래서 「가를 써야 할 자리에 이를 쓴」 결함은 그 자가 구조적으로
 *    못 본다(실제로 이 파일의 첫 판이 「$9$이 되는 수는」이었다). 시험이 이 자리를 따로 잰다.
 */
function iGa(n: number): "이" | "가" {
  return eulReul(n) === "을" ? "이" : "가";
}

/**
 * 「(으)로」 — `$15$로` · `$36$으로`.
 *
 * ⚠️ 이것은 `eulReul`·`waGwa` 와 **가르는 축이 다르다**(ㄹ 받침도 「로」다). `m2Josa`
 *    가 그 규칙을 한 곳에 갖고 있으므로 여기서 다시 적지 않고 읽어만 온다.
 */
function ratReadTail(x: { n: number; d: number }): number {
  // 분수는 「$b$**분의** $a$」로 읽으므로 마지막에 오는 수가 **분자**다.
  return Math.abs(x.n);
}

/**
 * 개수를 세는 우리말 수관형사 — `세 가지`·`여덟 가지`.
 *
 * ⚠️ **`$3$가지` 라고 쓰면 안 된다.** 조사 자(`josaMismatches`)는 수 뒤의 `가` 를
 * 주격 조사로 읽어 「$3$가 → $3$이」를 신고한다. 여기서 `가` 는 의존명사 「가지」의
 * 첫 글자라 그 신고는 **거짓 경보**인데, **거짓 경보는 가드를 끈다**(2026-08-20).
 * 자를 무르는 대신 지면에서 우리말 수관형사를 쓴다 — 셈말과 조사가 아예 안 만난다.
 */
export function koreanCount(n: number): string {
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
  };
  const w = words[n];
  if (w === undefined) throw new Error(`koreanCount: 다루지 않는 수 ${n}`);
  return w;
}

/**
 * 🔴 **지면에 실제로 찍힌 수 전부** — 지름길 자에 넣는 것이 바로 이 목록이다.
 *
 * ⚠️ 첫 판은 「내가 넣은 값」(비의 두 항과 주어진 수)만 세었다. 그런데 판정기
 *    (`probe-middle-top-m1.pageNumbers`)는 **발문 글자를 그대로 훑으므로**
 *    단위의 지수까지 센다 — `\mathrm{cm}^2` 의 $2$ 가 그렇다. 그 $2$ 하나 때문에
 *    「부피의 비 $1:27$ · 겉넓이의 차 $48\pi$」 판의 답 $54=27\times2$ 가 지름길이
 *    되는데, 내 목록에는 $2$ 가 없어 **가드가 그것을 못 봤다**(실측 660판 중 43판).
 *    세는 쪽과 막는 쪽이 다른 것을 보면 한쪽만 고쳐도 아무도 모른다 — 그래서
 *    **지면 글자에서 직접 뽑고**, 시험이 이 함수와 판정기의 것이 660판 내내
 *    글자 그대로 같은 값을 내는지 잰다.
 */
export function contentNumbers(content: string): number[] {
  const out: number[] = [];
  for (const m of content.matchAll(/-?\d+(?:\.\d+)?/g)) out.push(Number(m[0]));
  return out;
}

/**
 * 계수를 붙인 항 — `$8V$` · `$V$`(계수가 $1$ 이면 숫자를 안 쓴다).
 *
 * ⚠️ `1V` 를 지면에 쓰면 냄새 자(`pageSmells` 「계수 1 을 적었다」)가 문다.
 *    값은 맞고 KaTeX 도 초록이라 값 검산으로는 구조적으로 못 보는 부류다.
 */
export function coefTerm(c: number, sym: string): string {
  if (!Number.isInteger(c) || c < 1) {
    throw new Error(`coefTerm: 자연수 계수여야 합니다 — ${c}`);
  }
  return c === 1 ? sym : `${c}${sym}`;
}

// ═══════════════════════════════════════════════════════════
// 97X  겉넓이의 비에서 부피의 비를 접는 두 구  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 **굳힘은 이 소단원의 두 공식뿐이다 — 반지름을 한 번도 구하지 않는다.**
 *
 * 반지름의 길이의 비가 $p:q$ 이면 $S=4\pi r^{2}$ 에서 겉넓이의 비는 $p^{2}:q^{2}$,
 * $V=\dfrac{4}{3}\pi r^{3}$ 에서 부피의 비는 $p^{3}:q^{3}$ 이다. 그러므로 겉넓이의 비를
 * 주면 부피의 비가, 부피의 비를 주면 겉넓이의 비가 **곧바로** 나온다(D-115 ⑾ 의 «중»).
 *
 * ⚠️ 굳힘을 **인자로 받는다** — $p$, $q$ 를 흔들면 두 비가 달라져야 한다(㉡).
 *    그 자가 «아니오»를 낼 수 있음은 「비가 기약이 아니면 던진다」로 보인다:
 *    $2:4$ 는 $1:2$ 와 **같은 비**라 두 판이 같은 지면을 내게 되고, 그러면 창이
 *    부풀기만 하고 서로 다른 문항은 안 늘어난다.
 */
export function sphereRatios(
  p: number,
  q: number,
): { area: [number, number]; volume: [number, number] } {
  if (!Number.isInteger(p) || !Number.isInteger(q) || p < 1 || q <= p) {
    throw new Error(
      `sphereRatios: $1\\le p<q$ 인 자연수여야 합니다 — ${p}, ${q}`,
    );
  }
  if (gcd(p, q) !== 1) {
    throw new Error(`sphereRatios: 기약인 비여야 합니다 — ${p}:${q}`);
  }
  return {
    area: [p * p, q * q],
    volume: [p ** 3, q ** 3],
  };
}

export type SphereCase = {
  /** `"부피"` — 겉넓이의 비와 부피의 합을 주고 큰 구의 부피를 묻는다. */
  mode: "부피" | "겉넓이";
  p: number;
  q: number;
  /** 비의 한 몫 — 답은 `q^3*m`(부피) 또는 `q^2*m`(겉넓이). */
  m: number;
  /** 발문에 찍히는 수(합 또는 차). */
  given: number;
  answer: number;
};

/** $p<q$ 이고 서로소인 쌍 — 두 구의 반지름의 길이의 비다. */
const SPHERE_PAIRS: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  for (let p = 1; p <= 4; p += 1) {
    for (let q = p + 1; q <= 5; q += 1) {
      if (gcd(p, q) !== 1) continue;
      out.push([p, q]);
    }
  }
  return out;
})();

/**
 * 창 — 지면의 수가 너무 크지 않은 것만 남긴다.
 *
 * 「지름길」 가드는 여기서 걸러 낸다(잃은 것은 머리말 표에 전수로 적었다).
 */
export const SPHERE_WINDOW: readonly SphereCase[] = (() => {
  const out: SphereCase[] = [];
  for (const [p, q] of SPHERE_PAIRS) {
    const { area, volume } = sphereRatios(p, q);
    for (let m = 2; m <= 24; m += 1) {
      // ── 겉넓이의 비를 주고 부피의 합에서 큰 구의 부피를 묻는다.
      const sumParts = volume[0] + volume[1];
      const givenA = sumParts * m;
      const ansA = volume[1] * m;
      if (givenA <= 2400 && ansA <= 2400) {
        out.push({ mode: "부피", p, q, m, given: givenA, answer: ansA });
      }
      // ── 부피의 비를 주고 겉넓이의 차에서 큰 구의 겉넓이를 묻는다.
      const diffParts = area[1] - area[0];
      const givenB = diffParts * m;
      const ansB = area[1] * m;
      if (givenB <= 2400 && ansB <= 2400) {
        out.push({ mode: "겉넓이", p, q, m, given: givenB, answer: ansB });
      }
    }
  }
  return out;
})();

/**
 * 🔴 조사를 **손으로 못 박는 자리**.
 *
 * 「부피」·「겉넓이」는 둘 다 모음 ㅣ 로 끝나므로 뒤에 오는 조사가 늘 「를」·「는」·「가」다.
 * 「합」은 받침이 있어 「은」, 「차」는 모음이라 「는」이다. 이 넷은 **수가 아니라 우리말
 * 낱말**이라 `m2Josa` 의 수 읽기 자로는 정할 수 없다 — 첫 판이 `eunNeun(given)` 을 써서
 * 「부피의 합**는**」·「구 $B$의 부피**을**」을 지면에 냈다. 값 검산·KaTeX 는 이 부류를
 * 구조적으로 못 본다(2026-08-24 「값이 맞으면 시험이 다 초록이다」).
 */
const SPHERE_WORDS = {
  부피: { name: "부피", join: "합", joinJosa: "은", op: "+" },
  겉넓이: { name: "겉넓이", join: "차", joinJosa: "는", op: "-" },
} as const;

export function sphereBody(c: SphereCase): Body {
  const { area, volume } = sphereRatios(c.p, c.q);
  const shown = c.mode === "부피" ? area : volume;
  const derived = c.mode === "부피" ? volume : area;
  const shownPow = c.mode === "부피" ? "2" : "3";
  const derivedPow = c.mode === "부피" ? "3" : "2";
  const shownName = c.mode === "부피" ? "겉넓이" : "부피";
  const w = SPHERE_WORDS[c.mode];
  const derivedName = w.name;
  const unit = c.mode === "부피" ? "\\mathrm{cm}^3" : "\\mathrm{cm}^2";
  const sym = c.mode === "부피" ? "V" : "S";
  const combined =
    c.mode === "부피" ? derived[0] + derived[1] : derived[1] - derived[0];
  const combineTex =
    c.mode === "부피"
      ? `${coefTerm(derived[0], sym)}+${coefTerm(derived[1], sym)}=${coefTerm(combined, sym)}`
      : `${coefTerm(derived[1], sym)}-${coefTerm(derived[0], sym)}=${coefTerm(combined, sym)}`;

  return {
    content:
      `두 구 $A$, $B$가 있다. 두 구의 ${shownName}의 비는 $${shown[0]}:${shown[1]}$이고, ` +
      `두 구의 ${derivedName}의 ${w.join}${w.joinJosa} $${c.given}\\pi\\,${unit}$이다. ` +
      `구 $B$의 ${derivedName}를 구하시오.`,
    answer: `$${c.answer}\\pi\\,${unit}$`,
    solution: [
      c.mode === "부피"
        ? `구의 겉넓이는 $4\\pi r^2$이므로 두 구의 겉넓이의 비는 반지름의 길이의 제곱의 비에 정비례한다.`
        : `구의 부피는 $\\dfrac{4}{3}\\pi r^3$이므로 두 구의 부피의 비는 반지름의 길이의 세제곱의 비에 정비례한다.`,
      `${shownName}의 비가 $${shown[0]}:${shown[1]}$이고 $${c.p}^${shownPow}=${shown[0]}$, $${c.q}^${shownPow}=${shown[1]}$이므로 두 구의 반지름의 길이의 비는 $${c.p}:${c.q}$이다.`,
      c.mode === "부피"
        ? `구의 부피는 $\\dfrac{4}{3}\\pi r^3$이므로 두 구의 부피의 비는 반지름의 길이의 세제곱의 비에 정비례한다.`
        : `구의 겉넓이는 $4\\pi r^2$이므로 두 구의 겉넓이의 비는 반지름의 길이의 제곱의 비에 정비례한다.`,
      `그러므로 두 구의 ${derivedName}의 비는 $${c.p}^${derivedPow}:${c.q}^${derivedPow}=${derived[0]}:${derived[1]}$이다.`,
      `구 $A$의 ${derivedName}를 $${coefTerm(derived[0], sym)}\\pi\\,${unit}$, 구 $B$의 ${derivedName}를 $${coefTerm(derived[1], sym)}\\pi\\,${unit}$라 하면 두 ${derivedName}의 ${w.join}${w.joinJosa} $${combineTex}$이다.`,
      `$${coefTerm(combined, sym)}=${c.given}$에서 $${sym}=${c.m}$이다.`,
      `따라서 구 $B$의 ${derivedName}는 $${derived[1]}\\times${c.m}=${c.answer}$이므로 $${c.answer}\\pi\\,${unit}$이다.`,
      `두 구의 반지름의 길이를 구하지 않아도 ${shownName}의 비만으로 ${derivedName}의 비가 정해진다.`,
    ].join("\n"),
    facts: {
      x: c.answer,
      p: c.p,
      q: c.q,
      m: c.m,
      given: c.given,
      shownLo: shown[0],
      shownHi: shown[1],
    },
  };
}

const SPHERE_RATIO: TypeEntry[] = [
  defType(
    BOOK2,
    MINOR_SOLID,
    "97X",
    "겉넓이의 비에서 부피의 비를 접는 두 구",
    SEC.구,
    "심화중",
    (rng): Body =>
      attempt(3000, (): Body | null => {
        const c = pick(rng, SPHERE_WINDOW);
        const body = sphereBody(c);
        // 🔴 ㉵ 지면에 찍힌 수를 한두 번 더하거나 곱해 답이 나오면 심화가 아니다.
        //    잃은 것(창 전수, D-20)은 머리말 표에 있고 시험이 다시 센다.
        if (pageShortcutValues(contentNumbers(body.content)).has(c.answer)) {
          return null;
        }
        return body;
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 98X  두 수씩 곱한 값에서 세 수의 곱 접기  (심화중)
// ═══════════════════════════════════════════════════════════

/** 기약 유리수 — 분모는 늘 양수다. */
export type Rat = { n: number; d: number };

export function rat(n: number, d: number): Rat {
  if (d === 0) throw new Error("rat: 분모가 $0$ 일 수 없습니다");
  const s = d < 0 ? -1 : 1;
  const g = gcd(Math.abs(n), Math.abs(d)) || 1;
  return { n: (s * n) / g, d: (s * d) / g };
}

export function ratMul(a: Rat, b: Rat): Rat {
  return rat(a.n * b.n, a.d * b.d);
}

/** 지면 글자 — 분모가 $1$ 이면 분수를 **아예 만들지 않는다**(㉰). */
export function ratTex(x: Rat): string {
  if (x.d === 1) return String(x.n);
  return x.n < 0 ? `-\\dfrac{${-x.n}}{${x.d}}` : `\\dfrac{${x.n}}{${x.d}}`;
}

/** 음수면 괄호로 감싼다 — `$\left(-2\right)\times\left(-6\right)$`. */
function ratParen(x: Rat): string {
  const body = ratTex(x);
  return x.n < 0 ? `\\left(${body}\\right)` : body;
}

/**
 * 🔴 **굳힘은 곱셈의 교환·결합법칙과 부호 규칙, 둘뿐이다.**
 *
 * $(a\times b)\times(b\times c)\times(c\times a)$ 는 곱하는 순서를 바꾸면
 * $(a\times b\times c)$ 를 두 번 곱한 것과 같다. 그러므로 세 값을 곱하면
 * $(a\times b\times c)^{2}$ 이 나오고, 남은 후보는 두 개($\pm t$)뿐이다.
 * 그중 하나는 **부호 규칙**이 거른다 — $a$ 의 부호를 알면 $b$, $c$ 의 부호가
 * 차례로 정해지고 음수의 개수가 짝수인지 홀수인지로 곱의 부호가 갈린다.
 * **세 수를 하나도 구하지 않는다**(D-115 ⑾ 의 «중»).
 *
 * **`null`** 을 내는 자리가 셋이고 셋 다 실재한다(시험이 하나씩 보인다):
 * ⑴ 세 곱의 곱이 **정수가 아니다** ⑵ 세 곱의 곱이 **음수다** — 그러면 세 부호가 서로
 * 어긋난 것이라 그런 $a$, $b$, $c$ 가 아예 없다 ⑶ 정수인데 **제곱수가 아니다** —
 * 그러면 중1이 답을 못 쓴다.
 *
 * ⚠️ ⑵ 를 「$b$, $c$ 의 부호를 정하고 $b\times c$ 와 어긋나는지 본다」로 따로 쓰면
 *    **늘 참인 죽은 조건**이 된다(㉷). $\mathrm{sgn}(ab)\,\mathrm{sgn}(bc)\,\mathrm{sgn}(ca)$
 *    는 언제나 $+$ 이므로, 곱이 양수인 자리까지 오면 그 검사는 반드시 통과한다.
 *    그러므로 ⑵ 는 **곱의 부호 하나로** 잡는다.
 */
export function tripleProduct(
  ab: Rat,
  bc: Rat,
  ca: Rat,
  aNegative: boolean,
): number | null {
  const sq = ratMul(ratMul(ab, bc), ca);
  if (sq.d !== 1) return null; // ⑴ 정수가 아니다
  if (sq.n <= 0) return null; // ⑵ 세 부호가 서로 어긋난다
  let t = -1;
  for (let k = 1; k * k <= sq.n; k += 1) {
    if (k * k === sq.n) {
      t = k;
      break;
    }
  }
  if (t < 0) return null; // ⑶ 제곱수가 아니다
  // 부호 규칙 — $a$ 의 부호에서 $b$, $c$ 의 부호가 차례로 정해진다.
  const sa = aNegative ? -1 : 1;
  const sb = (ab.n < 0 ? -1 : 1) * sa;
  const sc = (ca.n < 0 ? -1 : 1) * sa;
  return sa * sb * sc > 0 ? t : -t;
}

export type ProductCase = {
  ab: Rat;
  bc: Rat;
  ca: Rat;
  aNegative: boolean;
  square: number;
  answer: number;
  /** 음수인 것의 이름 — 해설이 그대로 쓴다. */
  negatives: string[];
};

/** 크기로 쓸 유리수 — 분모 $4$ 이하, 값이 $1$ 이 아닌 기약 양수. */
const MAGNITUDES: readonly Rat[] = (() => {
  const out: Rat[] = [];
  for (let d = 1; d <= 4; d += 1) {
    for (let n = 1; n <= 9; n += 1) {
      if (gcd(n, d) !== 1) continue;
      if (n === d) continue; // 값이 $1$ 이면 곱이 굳지 않는다
      out.push({ n, d });
    }
  }
  return out;
})();

function ratAbsOk(x: Rat, maxNum: number, maxDen: number): boolean {
  return Math.abs(x.n) <= maxNum && x.d <= maxDen && Math.abs(x.n) !== x.d;
}

/**
 * 창 — 「세 곱」이 지면에 그럴듯하게 찍히고 답이 한 정수로 굳는 것만 남긴다.
 *
 * 같은 지면을 내는 $(a, b, c)$ 는 **하나로 접는다**(세 곱과 $a$ 의 부호가 같으면
 * 발문이 글자까지 같다). 접지 않으면 창은 부푸는데 서로 다른 문항은 안 늘어난다.
 */
export const PRODUCT_WINDOW: readonly ProductCase[] = (() => {
  const seen = new Map<string, ProductCase>();
  const signs: readonly (readonly [number, number, number])[] = [
    [1, 1, 1],
    [1, 1, -1],
    [1, -1, 1],
    [1, -1, -1],
    [-1, 1, 1],
    [-1, 1, -1],
    [-1, -1, 1],
    [-1, -1, -1],
  ];
  for (const A of MAGNITUDES) {
    for (const B of MAGNITUDES) {
      for (const C of MAGNITUDES) {
        const abs = ratMul(A, B);
        const bcs = ratMul(B, C);
        const cas = ratMul(C, A);
        const prod = ratMul(ratMul(A, B), C);
        if (prod.d !== 1 || prod.n < 2 || prod.n > 60) continue;
        if (!ratAbsOk(abs, 60, 12)) continue;
        if (!ratAbsOk(bcs, 60, 12)) continue;
        if (!ratAbsOk(cas, 60, 12)) continue;
        // 세 값이 서로 달라야 지면이 세 조각으로 읽힌다.
        if (abs.n === bcs.n && abs.d === bcs.d) continue;
        if (abs.n === cas.n && abs.d === cas.d) continue;
        if (bcs.n === cas.n && bcs.d === cas.d) continue;
        // 분수가 하나도 없으면 «유리수의 곱셈»이 아니라 정수 곱셈이 된다.
        const fracs = [abs, bcs, cas].filter((x) => x.d !== 1).length;
        if (fracs < 1 || fracs > 2) continue;
        for (const [sa, sb, sc] of signs) {
          const ab = { n: abs.n * sa * sb, d: abs.d };
          const bc = { n: bcs.n * sb * sc, d: bcs.d };
          const ca = { n: cas.n * sc * sa, d: cas.d };
          // 세 값이 전부 양수면 부호 이야기가 지면에서 사라진다.
          if (ab.n > 0 && bc.n > 0 && ca.n > 0) continue;
          const aNegative = sa < 0;
          const answer = tripleProduct(ab, bc, ca, aNegative);
          if (answer === null) continue;
          const names = ["a", "b", "c"].filter((_, i) => [sa, sb, sc][i]! < 0);
          // 🔴 **불변식**: 음수는 반드시 하나 또는 둘이다. 셋이면 세 곱이 전부
          //    양수가 되어 바로 위에서 걸러졌고, 없어도 마찬가지다. 해설의
          //    「음수는 …의 두 개」 줄이 그래서 **분기 없는 한 줄**로 선다
          //    (죽은 분기를 두지 않는다 — ㉷). 시험이 창 전수로 이 불변식을 문다.
          if (names.length < 1 || names.length > 2) continue;
          const key = `${ratTex(ab)}|${ratTex(bc)}|${ratTex(ca)}|${aNegative}`;
          if (seen.has(key)) continue;
          seen.set(key, {
            ab,
            bc,
            ca,
            aNegative,
            square: answer * answer,
            answer,
            negatives: names,
          });
        }
      }
    }
  }
  return [...seen.values()];
})();

/** 「$a$와 $c$」처럼 음수인 것을 잇는다. */
function nameList(names: readonly string[]): string {
  if (names.length === 1) return `$${names[0]}$`;
  return names
    .map((s, i) => (i === names.length - 1 ? `$${s}$` : `$${s}$와 `))
    .join("");
}

export function productBody(c: ProductCase): Body {
  const sign = c.aNegative ? "음수" : "양수";
  const bSign = c.ab.n < 0 === !c.aNegative ? "음수" : "양수";
  const cSign = c.ca.n < 0 === !c.aNegative ? "음수" : "양수";
  const parity = c.negatives.length % 2 === 0 ? "짝수" : "홀수";
  // 🔴 곱의 부호는 **음수의 개수**에서 온다 — 답의 부호를 되읽지 않는다.
  //    되읽으면 이 줄은 「답과 같은 말」이 되어 아무것도 안 지킨다(동어반복).
  const prodSign = parity === "짝수" ? "양수" : "음수";
  const root = Math.abs(c.answer);
  // ⚠️ 「음수는 $c$의 한 개로」는 **한 개일 때 어색하게 읽힌다.** 분기를 두지 않고
  //    「음수인 것은 $c$이므로 음수의 개수는 한 개이고」로 적으면 하나든 둘이든 같은
  //    문형이 자연스럽다(그리고 분기가 없으니 죽은 가지도 안 생긴다 — ㉷).
  const negLine = `$a$, $b$, $c$ 중 음수인 것은 ${nameList(c.negatives)}이므로 음수의 개수는 ${koreanCount(c.negatives.length)} 개이고, 개수가 ${parity}이므로 $a\\times b\\times c$는 ${prodSign}이다.`;

  return {
    content:
      `세 유리수 $a$, $b$, $c$에서 두 수씩 곱한 값은 ` +
      `$a\\times b=${ratTex(c.ab)}$, $b\\times c=${ratTex(c.bc)}$, $c\\times a=${ratTex(c.ca)}$이다. ` +
      `$a$가 ${sign}일 때, 세 수의 곱 $a\\times b\\times c$의 값을 구하시오.`,
    answer: `$${c.answer}$`,
    solution: [
      `곱셈에서는 곱하는 순서를 바꾸어도 값이 같으므로 $(a\\times b)\\times(b\\times c)\\times(c\\times a)$는 $a\\times b\\times c$를 두 번 곱한 값과 같다.`,
      `주어진 세 값을 모두 곱하면 $${ratParen(c.ab)}\\times${ratParen(c.bc)}\\times${ratParen(c.ca)}=${c.square}$이다.`,
      `그러므로 $a\\times b\\times c$를 두 번 곱한 값이 $${c.square}$이고, 같은 수를 두 번 곱하여 $${c.square}$${iGa(c.square)} 되는 수는 $${root}$${waGwa(root)} $-${root}$의 둘뿐이다.`,
      `$a$가 ${sign}이고 $a\\times b=${ratTex(c.ab)}$${euroRo(ratReadTail(c.ab))} ${c.ab.n < 0 ? "음수" : "양수"}이므로 $b$는 ${bSign}이다.`,
      `또 $c\\times a=${ratTex(c.ca)}$${euroRo(ratReadTail(c.ca))} ${c.ca.n < 0 ? "음수" : "양수"}이고 $a$가 ${sign}이므로 $c$는 ${cSign}이다.`,
      negLine,
      `따라서 $a\\times b\\times c=${c.answer}$이다.`,
      `세 식 각각만으로는 $a$, $b$, $c$의 값을 알 수 없지만, 세 식을 모두 곱하면 세 수의 곱이 정해진다.`,
    ].join("\n"),
    facts: {
      x: c.answer,
      square: c.square,
      abNum: c.ab.n,
      abDen: c.ab.d,
      bcNum: c.bc.n,
      bcDen: c.bc.d,
      caNum: c.ca.n,
      caDen: c.ca.d,
    },
  };
}

/**
 * 답의 부호로 가른 두 풀 — **반반으로 뽑기 위한** 것이다(아래 `98X` 주석 참조).
 *
 * ⚠️ 여기서 지면 지름길 가드까지 미리 걸러 두지 **않는다.** 그러려면 창 13,068건의
 *    지면을 모듈이 실릴 때 전부 지어야 해서(실측 수 초) 이 모듈을 읽는 모든 시험이
 *    그만큼 느려진다. 가드는 지금처럼 `attempt` 안에서 돌린다 — 양수 쪽도 20.48%가
 *    살아남아(1,338건) 3,000번 안에 반드시 잡힌다.
 */
export const PRODUCT_POSITIVE: readonly ProductCase[] = PRODUCT_WINDOW.filter(
  (c) => c.answer > 0,
);
export const PRODUCT_NEGATIVE: readonly ProductCase[] = PRODUCT_WINDOW.filter(
  (c) => c.answer < 0,
);

const TRIPLE_PRODUCT: TypeEntry[] = [
  defType(
    BOOK1,
    MINOR_CALC,
    "98X",
    "두 수씩 곱한 값에서 세 수의 곱 구하기",
    SEC.곱셈,
    "심화중",
    (rng): Body => {
      // 🔴 **답의 부호를 먼저 뽑는다.** 안 그러면 바로 아래 지면 지름길 가드가
      //    부호를 한쪽으로 몰아 **더 큰 지름길**을 만든다 — 실측(2026-09-04):
      //    창은 양수 6,534 · 음수 6,534 로 **정확히 반반**인데, 그 가드를 지나면
      //    양수는 6,534 → 1,338(**20.48%만 산다**) 음수는 6,534 → 5,010(76.68%)
      //    이라 살아남은 풀의 **79%가 음수**가 된다. 제품 경로 1,200판 실측으로도
      //    음수 답이 **77.08%** 였다. 곧 「부호는 안 따지고 **음의 근**을 그대로
      //    적는다」가 **77% 맞는다** — 우연(둘 중 하나)이 50% 이므로 **우연의
      //    1.54배**다. 이 유형의 굳힘이 바로 그 부호이므로 그것을 건너뛸 수 있으면
      //    유형이 통째로 무너진다.
      //    ⚠️ 이것은 **가드가 나빠서가 아니다** — 가드는 제 일을 한다. 걸러 낸 뒤의
      //    **분포**를 아무도 안 본 것이 결함이다. 그래서 가드를 끄지 않고(끄면 원래
      //    막던 지름길이 돌아온다) **부호를 먼저 정한 뒤 그 쪽 풀에서만** 뽑는다.
      //    ⚠️ 「음수만 낸다」로 고치면 안 된다 — 그때는 **음의 근이 100%** 가 된다.
      //    두 갈래 지름길이 있는 축에서는 **반반**이 최선이다(가장 잘 뚫는 길을
      //    우연 수준까지 낮춘다).
      const pool = pick(rng, [PRODUCT_POSITIVE, PRODUCT_NEGATIVE]);
      return attempt(3000, (): Body | null => {
        const c = pick(rng, pool);
        const body = productBody(c);
        if (pageShortcutValues(contentNumbers(body.content)).has(c.answer)) {
          return null;
        }
        return body;
      });
    },
  ),
];

// ═══════════════════════════════════════════════════════════
// 99X  둘레가 주어진 자연수 변 삼각형 중 서로 합동이 아닌 것  (심화상)
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 **굳지 않는다 — 가장 긴 변을 하나씩 놓고 나머지를 다 만들어 봐야 한다.**
 *
 * 세 변의 길이를 $a\le b\le c$ 라 하면 $a+b+c=L$ 이고, 삼각형이 되려면 $c<a+b=L-c$
 * 이므로 $2c<L$ 이다. 또 $c$ 가 가장 길므로 $3c\ge L$ 이다. 그 범위의 $c$ 마다
 * $a+b=L-c$ 를 만족하는 $(a, b)$ 를 **실제로 다 만들어** $a\le b\le c$ 를 확인해야 한다.
 * 합동(SSS)은 «세 변의 길이가 같으면 같은 것으로 센다»는 뜻을 줄 뿐, 후보를 줄여
 * 주지 않는다(D-115 ⑾ 의 «상»).
 *
 * ⚠️ 굳힘을 **인자로 받는다** — $L$ 을 흔들면 살아남는 후보가 달라져야 한다(㉡).
 *    그 자가 «아니오»를 낼 수 있음은 **빈 배열**로 보인다: $L\le2$ 는 물론이고
 *    $L=4$ 도 삼각형이 하나도 없다($(1,1,2)$ 는 삼각형이 아니다).
 */
export function trianglesByLongestSide(
  L: number,
): { c: number; pairs: [number, number][] }[] {
  if (!Number.isInteger(L) || L < 1) {
    throw new Error(`trianglesByLongestSide: 자연수여야 합니다 — ${L}`);
  }
  const out: { c: number; pairs: [number, number][] }[] = [];
  const cMin = Math.ceil(L / 3);
  const cMax = Math.ceil(L / 2) - 1;
  for (let c = cMin; c <= cMax; c += 1) {
    const rest = L - c;
    const pairs: [number, number][] = [];
    for (let a = 1; a * 2 <= rest; a += 1) {
      const b = rest - a;
      if (b > c) continue;
      pairs.push([a, b]);
    }
    if (pairs.length > 0) out.push({ c, pairs });
  }
  return out;
}

/** 서로 합동이 아닌 삼각형의 개수 — 위 표의 후보를 전부 센 것. */
export function incongruentTriangleCount(L: number): number {
  return trianglesByLongestSide(L).reduce((s, g) => s + g.pairs.length, 0);
}

/** 그 삼각형들의 «가장 긴 변의 길이»를 모두 더한 값. */
export function longestSideSum(L: number): number {
  return trianglesByLongestSide(L).reduce(
    (s, g) => s + g.c * g.pairs.length,
    0,
  );
}

export type WireCase = {
  L: number;
  phrasing: 0 | 1 | 2;
  mode: "개수" | "합";
  answer: number;
};

export const WIRE_L_VALUES: readonly number[] = (() => {
  const out: number[] = [];
  for (let L = 11; L <= 38; L += 1) out.push(L);
  return out;
})();

export const WIRE_MODES = ["개수", "합"] as const;
export const WIRE_PHRASINGS = [0, 1, 2] as const;

/**
 * 창 — 둘레 $L$ × 묻는 것 × 발문 두 벌.
 *
 * 아래를 $11$ 로 잡은 까닭: 그보다 작으면 후보가 서너 개뿐이라 「다 만들어 견준다」가
 * 무색하다. 위를 $38$ 로 **막은** 까닭은 ㉮ 다 — $L$ 이 커지면 가장 긴 변의 후보 줄이
 * 늘어 해설이 정답지 한 단을 향해 자란다. 걸음을 지우는 대신 **훑는 범위**를 막았다.
 * 실측(제품 `estimateSolutionPx`): $L=38$ 에서 $565$px, $L=44$ 까지 가면 $636$px 이다.
 * $700$px 문턱까지 $135$px 을 남겨 두려고 $38$ 에서 끊었다.
 *
 * 🔴 **묻는 것을 둘로 나눈 까닭은 정답 쏠림이다.** 「몇 개인가」만 물으면 서로 다른 답이
 * $22$개의 $L$ 에서 **$14$가지**뿐이다(Alcuin 수열은 $L$ 이 $2$ 늘 때마다 값이 되풀이된다
 * — $L=13$ 과 $L=16$ 이 둘 다 $5$다). 실측으로 660판에서 최빈이 **13.33%** 였다.
 * 「가장 긴 변의 길이의 합」은 $22$개가 전부 다른 값이라, 둘을 합치면 서로 다른 답이
 * $32$가지가 되고 한 답이 차지하는 칸이 $3/44$ 로 내려간다.
 * ⚠️ 셈의 뼈대는 **똑같다** — 후보를 다 만들어야 둘 다 나온다. 쏠림을 낮추려고 문제를
 *    쉽게 만든 것이 아니다.
 */
export const WIRE_WINDOW: readonly WireCase[] = (() => {
  const out: WireCase[] = [];
  for (const L of WIRE_L_VALUES) {
    for (const mode of WIRE_MODES) {
      for (const phrasing of WIRE_PHRASINGS) {
        out.push({
          L,
          phrasing,
          mode,
          answer:
            mode === "개수" ? incongruentTriangleCount(L) : longestSideSum(L),
        });
      }
    }
  }
  return out;
})();

/** `$(7, 8)$, $(6, 9)$` 꼴. */
function pairListTex(pairs: readonly (readonly [number, number])[]): string {
  return pairs.map(([a, b]) => `$(${a}, ${b})$`).join(", ");
}

const WIRE_STEMS: Record<
  "개수" | "합",
  readonly [(L: number) => string, (L: number) => string, (L: number) => string]
> = {
  개수: [
    (L) =>
      `길이가 $${L}\\,\\mathrm{cm}$인 철사를 남김없이 사용하여 세 변의 길이가 모두 자연수인 삼각형을 만들려고 한다. 만들 수 있는 삼각형 중에서 서로 합동이 아닌 것은 몇 개인지 구하시오.`,
    (L) =>
      `둘레의 길이가 $${L}\\,\\mathrm{cm}$이고 세 변의 길이가 모두 자연수인 삼각형이 있다. 이러한 삼각형 중에서 서로 합동이 아닌 것은 몇 개인지 구하시오.`,
    (L) =>
      `길이가 $${L}\\,\\mathrm{cm}$인 끈을 겹치거나 남기지 않고 사용하여 세 변의 길이가 모두 자연수인 삼각형을 만들려고 한다. 만들 수 있는 삼각형 중에서 서로 합동이 아닌 것은 몇 개인지 구하시오.`,
  ],
  합: [
    (L) =>
      `길이가 $${L}\\,\\mathrm{cm}$인 철사를 남김없이 사용하여 세 변의 길이가 모두 자연수인 삼각형을 만들려고 한다. 서로 합동이 아닌 삼각형을 모두 만들었을 때, 이 삼각형들의 가장 긴 변의 길이의 합을 구하시오.`,
    (L) =>
      `둘레의 길이가 $${L}\\,\\mathrm{cm}$이고 세 변의 길이가 모두 자연수인 삼각형이 있다. 서로 합동이 아닌 삼각형을 모두 모았을 때, 이 삼각형들의 가장 긴 변의 길이의 합을 구하시오.`,
    (L) =>
      `길이가 $${L}\\,\\mathrm{cm}$인 끈을 겹치거나 남기지 않고 사용하여 세 변의 길이가 모두 자연수인 삼각형을 만들려고 한다. 서로 합동이 아닌 삼각형을 모두 만들었을 때, 이 삼각형들의 가장 긴 변의 길이의 합을 구하시오.`,
  ],
};

export function wireBody(c: WireCase): Body {
  const groups = trianglesByLongestSide(c.L);
  const cMin = groups[0]!.c;
  const cMax = groups[groups.length - 1]!.c;
  const caseLines = groups.map(
    (g) =>
      `$c=${g.c}$일 때 $a+b=${c.L - g.c}$이고 $a\\le b\\le ${g.c}$이므로 $(a, b)$는 ${pairListTex(g.pairs)}의 ${koreanCount(g.pairs.length)} 가지이다.`,
  );
  const counts = groups.map((g) => g.pairs.length);
  const lastLine =
    c.mode === "개수"
      ? `따라서 서로 합동이 아닌 삼각형은 $${counts.join("+")}=${c.answer}$(개)이다.`
      : `따라서 가장 긴 변의 길이의 합은 $${groups.map((g) => `${g.c}\\times${g.pairs.length}`).join("+")}=${c.answer}\\,(\\mathrm{cm})$이다.`;
  return {
    content: WIRE_STEMS[c.mode][c.phrasing](c.L),
    answer:
      c.mode === "개수" ? `$${c.answer}$개` : `$${c.answer}\\,\\mathrm{cm}$`,
    solution: [
      `세 변의 길이가 각각 같은 두 삼각형은 서로 합동이므로($\\mathrm{SSS}$ 합동), 세 변의 길이를 크기순으로 늘어놓은 세 수가 같으면 서로 합동인 삼각형이다.`,
      `세 변의 길이를 $a$, $b$, $c$ $(a\\le b\\le c)$라 하면 $a+b+c=${c.L}$이다.`,
      `삼각형이 되려면 가장 긴 변의 길이가 나머지 두 변의 길이의 합보다 작아야 하므로 $c<${c.L}-c$, 즉 $2c<${c.L}$이고 $c$는 자연수이므로 $c\\le ${cMax}$이다.`,
      `또 $c$가 가장 긴 변이므로 $3c\\ge a+b+c=${c.L}$이고 $c$는 자연수이므로 $c\\ge ${cMin}$이다.`,
      ...caseLines,
      lastLine,
    ].join("\n"),
    facts: { x: c.answer, L: c.L, cMin, cMax, groups: groups.length },
  };
}

const WIRE_TRIANGLE: TypeEntry[] = [
  defType(
    BOOK2,
    MINOR_CONSTR,
    "99X",
    "둘레가 주어진 자연수 변 삼각형 중 서로 합동이 아닌 것",
    SEC.합동,
    "심화상",
    (rng): Body =>
      attempt(3000, (): Body | null => {
        /**
         * 🔴 **한 번에 뽑지 않고 세 번 나누어 뽑는다.**
         *
         * `createRng` 의 **첫 출력**은 씨앗이 등차수열이면 고르지 않다 — 실측으로
         * 씨앗 220 × 변형 3 에서 $22$칸에 대고 세면 가장 무거운 칸이 $47$(기댓값 $30$)
         * 이다. 창을 한 덩어리로 만들어 `pick` 한 번으로 뽑으면 그 쏠림이 **답의
         * 쏠림으로 그대로 나온다.** 축마다 따로 뽑으면 둘째·셋째 출력이 섞어 준다.
         * (제품의 씨앗 소금은 또 다르지만, 어느 쪽이든 축을 나누는 편이 안전하다.)
         */
        const L = pick(rng, WIRE_L_VALUES);
        const mode = pick(rng, WIRE_MODES);
        const phrasing = pick(rng, WIRE_PHRASINGS);
        const answer =
          mode === "개수" ? incongruentTriangleCount(L) : longestSideSum(L);
        // ⚠️ 이 가드는 **한 판도 안 자른다** — 이 유형의 지면에 찍힌 수는 $L$
        //    하나뿐이라(단위에 지수가 없다) 이 자가 만들 수 있는 것이 $\{L\}$ 뿐이다.
        //    「일하는 가드」로 읽지 마라. 시험이 그 사실을 «구조적으로 0» 으로 따로 찍고,
        //    지면의 수가 정말 하나뿐인지도 창 전수로 잰다.
        const body = wireBody({ L, mode, phrasing, answer });
        if (pageShortcutValues(contentNumbers(body.content)).has(answer)) {
          return null;
        }
        return body;
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 100X  굴린 횟수로 모선을 되찾아 원뿔의 겉넓이 구하기  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 **굳힘은 「원뿔의 옆면은 모선을 반지름으로 하는 부채꼴」 하나다.**
 *
 * 꼭짓점을 중심으로 굴러간 자리는 **모선을 반지름으로 하는 원**이고, 한 바퀴 구르는
 * 동안 밑면의 둘레만큼 나아간다. $n$바퀴 만에 제자리로 왔다면
 * $2\pi l=n\times2\pi r$ 이므로 $l=nr$ 이다 — 후보를 하나도 만들지 않는다.
 * 그러면 겉넓이는 $\pi rl+\pi r^{2}=\pi r^{2}(n+1)$ 이다(D-115 ⑾ 의 «중»).
 *
 * ⚠️ 굳힘을 **인자로 받는다** — $n$ 을 흔들면 모선도 겉넓이도 달라져야 한다(㉡).
 *    그 자가 «아니오»를 낼 수 있음은 「$n\le1$ 이면 던진다」로 보인다: 한 바퀴 만에
 *    제자리로 오는 «원뿔»은 모선과 밑면의 반지름이 같아 원뿔이 아니다.
 */
export function coneFromRolls(
  r: number,
  n: number,
): { slant: number; lateral: number; base: number; surface: number } {
  if (!Number.isInteger(r) || r < 1) {
    throw new Error(`coneFromRolls: 반지름이 자연수여야 합니다 — ${r}`);
  }
  if (!Number.isInteger(n) || n < 2) {
    throw new Error(`coneFromRolls: 굴린 횟수가 $2$ 이상이어야 합니다 — ${n}`);
  }
  const slant = n * r;
  const lateral = r * slant;
  const base = r * r;
  return { slant, lateral, base, surface: lateral + base };
}

export type ConeCase = {
  r: number;
  n: number;
  phrasing: 0 | 1;
  answer: number;
};

export const CONE_RADII: readonly number[] = [
  2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
];
export const CONE_ROLLS: readonly number[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
export const CONE_PHRASINGS = [0, 1] as const;

/**
 * 창 — 밑면의 반지름 × 굴린 횟수 × 발문 두 벌.
 *
 * 🔴 창을 $8\times8$ 에서 이만큼 넓힌 까닭은 **변형 폭**이다. 폭 $12$ 를 뽑을 때
 * 겹칠 기댓값이 $\dfrac{12\times11}{2W}$ 라, $W=64$ 이면 $1.03$ 이어서 「$0$..$11$
 * 만으로 열두 발문」이 되는 씨앗이 실측 **29.5%** 밖에 안 됐다. $W=220$ 이면 그 값이
 * $0.30$ 으로 내려간다. 제품은 겹치면 변형 번호를 올려 다시 뽑으므로 어느 쪽이든
 * 열둘을 만들지만, 숨기지 않고 창을 넓혔다.
 */
export const CONE_WINDOW: readonly ConeCase[] = (() => {
  const out: ConeCase[] = [];
  for (const r of CONE_RADII) {
    for (const n of CONE_ROLLS) {
      for (const phrasing of CONE_PHRASINGS) {
        out.push({ r, n, phrasing, answer: coneFromRolls(r, n).surface });
      }
    }
  }
  return out;
})();

export function coneBody(c: ConeCase): Body {
  const k = coneFromRolls(c.r, c.n);
  return {
    content:
      c.phrasing === 0
        ? `밑면의 반지름의 길이가 $${c.r}\\,\\mathrm{cm}$인 원뿔이 있다. ` +
          `이 원뿔을 꼭짓점을 중심으로 미끄러지지 않게 굴렸더니 $${c.n}$바퀴 만에 처음 자리로 돌아왔다. ` +
          `이 원뿔의 겉넓이를 구하시오.`
        : `밑면의 반지름의 길이가 $${c.r}\\,\\mathrm{cm}$인 원뿔을 꼭짓점을 중심으로 미끄러지지 않게 굴렸더니, ` +
          `$${c.n}$바퀴를 돈 뒤에 처음 자리로 돌아왔다. 이 원뿔의 겉넓이를 구하시오.`,
    answer: `$${c.answer}\\pi\\,\\mathrm{cm}^2$`,
    solution: [
      `원뿔이 굴러간 자리는 모선의 길이를 반지름으로 하는 원이고, 원뿔이 한 바퀴 구르는 동안 밑면의 둘레의 길이만큼 나아간다.`,
      `밑면의 둘레의 길이는 $2\\times\\pi\\times${c.r}=${2 * c.r}\\pi\\,(\\mathrm{cm})$이다.`,
      `모선의 길이를 $l\\,\\mathrm{cm}$라 하면 굴러간 자리인 원의 둘레의 길이는 $2\\times\\pi\\times l\\,\\mathrm{cm}$이다.`,
      `$${c.n}$바퀴 만에 처음 자리로 돌아왔으므로 $2\\times\\pi\\times l=${c.n}\\times${2 * c.r}\\pi$이고, 양변을 $2\\pi$로 나누면 $l=${k.slant}$이다.`,
      `원뿔의 옆넓이는 (밑면의 반지름의 길이)와 (모선의 길이)와 $\\pi$의 곱이므로 $\\pi\\times${c.r}\\times${k.slant}=${k.lateral}\\pi\\,(\\mathrm{cm}^2)$이다.`,
      `원뿔의 밑넓이는 $\\pi\\times${c.r}^2=${k.base}\\pi\\,(\\mathrm{cm}^2)$이다.`,
      `따라서 원뿔의 겉넓이는 $${k.lateral}\\pi+${k.base}\\pi=${c.answer}\\pi$이므로 $${c.answer}\\pi\\,\\mathrm{cm}^2$이다.`,
    ].join("\n"),
    facts: {
      x: c.answer,
      r: c.r,
      n: c.n,
      slant: k.slant,
      lateral: k.lateral,
      base: k.base,
    },
  };
}

const ROLLING_CONE: TypeEntry[] = [
  defType(
    BOOK2,
    MINOR_SOLID,
    "100X",
    "굴린 횟수로 모선을 되찾아 원뿔의 겉넓이 구하기",
    SEC.뿔,
    "심화중",
    (rng): Body =>
      attempt(3000, (): Body | null => {
        // 🔴 99X 와 같은 까닭으로 축마다 따로 뽑는다(첫 출력의 쏠림을 섞는다).
        const c: ConeCase = {
          r: pick(rng, CONE_RADII),
          n: pick(rng, CONE_ROLLS),
          phrasing: pick(rng, CONE_PHRASINGS),
          answer: 0,
        };
        c.answer = coneFromRolls(c.r, c.n).surface;
        const body = coneBody(c);
        if (pageShortcutValues(contentNumbers(body.content)).has(c.answer)) {
          return null;
        }
        return body;
      }),
  ),
];

/** 5차 물결 갈래 i — 리드가 `generate.ts` 에 spread 한 줄로 등록한다. */
export const M1_TOP_5I: TypeEntry[] = [
  ...SPHERE_RATIO,
  ...TRIPLE_PRODUCT,
  ...WIRE_TRIANGLE,
  ...ROLLING_CONE,
];
