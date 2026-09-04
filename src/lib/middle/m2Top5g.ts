/**
 * 중2 **확대 갈래 5차 물결**(`심화중`·`심화상`) — D-116, 접미사 **`X`**, 갈래 `g`.
 *
 * ## ⑴ 왜 새 파일인가
 *
 * 4차(`m2Top4.ts`) 머리말과 같은 까닭이다 — 남의 모듈을 잠그는 개수 검사를 무르지
 * 않으려고, 그리고 오르카 다중 세션이 같은 파일에서 부딪히지 않으려고 **새 파일 하나
 * + `generate.ts` spread 한 줄**로 붙인다. 그 한 줄은 **리드가** 넣는다 —
 * 이 파일은 `generate.ts` 를 건드리지 않는다.
 *
 * 착수 전에 네 소단원의 등록 유형을 **실제로 돌려** 갈래를 찍어 보았다(각 10유형,
 * 천장이 `심화하`). 그래서 이 넷은 D-116 이 말하는 **빈 소단원**이 맞다 —
 * 「읽어서 그렇게 보인다」가 아니라 `generateMiddleProblem(...).difficulty` 로
 * 40유형을 다 돌려서 확인했고, 시험이 그 사실을 다시 잰다.
 *
 * ## ⑵ 유형마다 — 안 굳는 마디 / 무엇이 굳히나 / 같은 소단원과 무엇이 다른가
 *
 * | 키 | 갈래 | 안 굳는 마디 | 무엇이 굳히나 | 아래 갈래와 다른 축 |
 * |---|---|---|---|---|
 * | `유리수와 순환소수\|125X` | **심화중** | 곱한 수 $N$ — 발문은 «두 결과의 차» 하나만 준다. $N$ 은 지면 어디에도 없고 그 차만 있다 | 그 소단원의 **분수 표현** 하나. $0.\overline{ab}=\dfrac{ab}{99}$, $0.ab=\dfrac{ab}{100}$ 로 바꾸면 «한 번 곱할 때의 차»가 $\dfrac{ab}{9900}$ **하나의 수**로 굳고, 나눗셈 한 번이면 $N$ 이 나온다 | 심화하 `15`(분모·분자를 잘못 봄)는 **원래 분수를 되찾는** 정방향이고 잘못 본 대상이 분수 자신이다. `42`(10의 거듭제곱을 곱해 뺀 값)는 변환 **절차**를 묻는다. `125X` 는 잘못 본 대상이 **순환 여부**이고, 매개가 «두 표현의 차»이며, 답은 소수와 무관한 **바깥 미지수**다 |
 * | `일차부등식의 활용\|126X` | **심화상** | 섞는 양 $x$ — 굳지 않는다. 게다가 **어느 조건이 위끝이고 어느 조건이 아래끝인지가 계산 전에는 안 정해진다** | 굳지 않는다. 두 조건의 부등식을 **다 세운 뒤 견주어야** 한다. 나중에 섞는 소금물이 처음보다 진하냐 묽으냐에 따라 «$r\%$ 이상» 이 아래끝을 주기도 하고 **위끝을 주기도** 한다 — 씨앗마다 뒤집힌다 | 응용 `12`·`16`·`20`, 심화하 `13`·`21` 은 조건이 **하나**라 답이 한쪽 끝이다. `126X` 는 조건 **둘**, 경계 **둘**, 답이 **닫힌 창의 두 끝의 합**이고 부등호 방향이 한 번 뒤집힌다 |
 * | `일차함수와 일차방정식의 관계\|127X` | **심화상** | 상수 $a$ — **굳지 않는다.** 살아남는 값이 하나가 아니라 **셋**이고 그 전부가 답에 들어간다 | 굳지 않는다. 「삼각형을 이루지 않는다」는 «어느 경우인가»를 **고르지 않는다** — 평행 둘과 한 점에서 만나기 하나, **후보 셋을 다 세운 뒤** 서로 다른지까지 보고 더해야 한다 | 심화하 `10`(세 직선이 한 점에서 만날 때)은 그 **한 경우만** 묻는 정방향이라 답이 상수 하나다. `127X` 는 그 경우가 **셋 중 하나**일 뿐이고, 평행 둘을 빠뜨리면 답이 통째로 달라진다. 심화하 `12`(둘러싸인 도형의 넓이)는 교점을 다 구해 넓이를 재는 계산이다 |
 * | `다항식의 계산\|128X` | **심화중** | 다항식 $C$ — 발문이 $A$·$C$ 를 하나도 안 준다. 준 것은 «두 계산 결과의 차» 하나다 | 그 소단원의 **괄호를 푸는 규칙** 하나. $A-(B-C)=A-B+C$ 이므로 바른 식과 잘못된 식의 차가 정확히 $2C$ 가 되어 $C$ 가 굳고, 그다음 $A=(A-B-C)+B+C$ 로 한 걸음 더 간다 | 기본 `04`(어떤 식 구하기)·응용 `05`(바르게 계산한 식)는 **잘못된 결과가 주어지고** 거기서 되돌아오는 한 걸음이다. `128X` 는 **두 결과의 차**가 주어지고, 그 차가 왜 $2C$ 인지를 모르면 아무 데도 못 간다. 응용 `03`(괄호가 여러 개)은 주어진 식을 전개하는 계산이다 |
 *
 * ## ⑶ 🔴 앞 물결들이 **실제로 새어 나간 자리** — 여기서 어떻게 막았나
 *
 * 전부 「값은 맞고 KaTeX 도 초록」이라 값 검산·냄새·조사 자가 구조적으로 못 보던 부류다.
 *
 * ㉮ **해설이 정답지 한 단을 넘었다**(3차 중1 `53V`, 1242px). → 넷 다 제품
 *    `estimateSolutionPx` 로 **800판**을 재어 잠근다. 그렇다고 **걸음을 지우지 않는다**
 *    (D-116 ⑹) — `126X` 의 두 경계 줄, `127X` 의 «죽는 후보» 줄은 그대로 둔다.
 * ㉯ **해설이 「자연수」 걸음을 건너뛰었다**(3차 중2 `38V`). → `126X` 는 두 경계 가운데
 *    **적어도 하나가 나누어떨어지지 않는 조합만** 낸다(그러면 그 줄이 반드시 선다).
 *    그리고 그 줄을 **공용 훑개가 읽는 꼴 그대로** 적는다 —
 *    `$cx\ge R$이다.` · `$x\ge\dfrac{R}{c}$` · 「$x$는 자연수이므로」 · `$x\ge B$이다.`
 *    (`probe-middle-extending-tiers.boundStepFaults`). ⚠️ 그 자는 **약분 전** 계수를
 *    분수로 다시 적을 것을 요구하므로, 주장 줄을 **미리 약분한 꼴**로 적어야
 *    ㉰(기약)와 충돌하지 않는다. 그래서 약분은 «주장 앞»에서 끝낸다.
 * ㉰ **해설이 기약이 아닌 분수를 찍었다**(3차 중1 `52V`). → 지면의 모든
 *    `\dfrac{수}{수}` 가 기약이 되게 **짓는다**:
 *    `125X` 는 순환마디를 $9900$ 과 서로소인 두 자리 수로만 뽑고(그래야
 *    $\dfrac{ab}{99}$·$\dfrac{ab}{100}$·$\dfrac{ab}{9900}$ 이 전부 기약),
 *    `126X` 는 농도를 $100$ 과 서로소인 수로만 뽑는다(그래야 $\dfrac{p}{100}$ 이 기약),
 *    `128X` 는 분수가 $\dfrac{1}{2}$ 하나뿐이다.
 * ㉱ **발문이 스스로 못 박은 상한을 오답이 넘었다**(4차 중2 `37W`). → 넷 다
 *    「전체를 $1$로 놓고」류의 상한을 **선언하지 않는다** — 공용 `declaredUpperBound`
 *    가 네 발문 전량에서 `null` 임을 시험이 800판으로 잰다.
 * ㉲ **정답이 «구간»이면 파생 오답이 뒤집힌다**(3차 중2 `35V`). → 넷 다 정답이
 *    **한 값**이다(`128X` 만 다항식 하나). 구간 답이 없으므로 그 대가를 안 치른다.
 * ㉳ **해설의 «말»을 지키는 시험이 없었다**(4차). → 네 유형 모두 「왜 그런가」를
 *    진술하는 줄의 낱말을 시험이 읽는다 — `125X` 「유한소수」·「최소공배수」·「통분」,
 *    `126X` 「높으므로/낮으므로」·「최솟값/최댓값」·「자연수이므로」,
 *    `127X` 「평행」·「기울기」·「한 점에서」·「서로 다르므로」,
 *    `128X` 「괄호를 풀면」·「부호가 바뀌」·「두 배」. 낱말을 뒤집으면 빨개진다
 *    (양성·음성 눈금을 같이 둔다).
 * ㉴ **지면이 자기가 한 줄 앞에 세운 제약을 스스로 어긴다**(4차 중3 `55W`). →
 *    `127X` 가 그 자리다. 해설이 「$y$절편이 서로 다르므로 두 직선은 만나지 않는다」고
 *    적으므로 **$n_3\ne n_1$·$n_3\ne n_2$ 를 생성이 못 박고**, 시험이 800판 전량에서
 *    그 부등식을 다시 잰다. 「세 값이 서로 다르다」도 마찬가지로 못 박고 잰다.
 * ㉵ **자료를 정렬해 찍으면 «보이는 자리»가 순위를 암시한다**(4차 중1 `63W`). →
 *    넷 다 자료 나열이 **없다**. 이 축은 여기서 «잴 것이 없다»이지 «깨끗»이 아니다.
 * ㉶ **D-20 손실 원장이 재현 불가였다**(4차 중1 `62W`). → ⑷ 에 가드마다
 *    **「이 가드 하나만 껐을 때」를 전수로 센 값**을 적었다. 판 수와 답 수의
 *    측정점을 같은 자리(같은 모집단)로 맞췄다.
 * ㉷ **내보낸 순수 함수의 주석이 코드와 어긋났다**(4차 중3). → 굳힘 함수 넷의
 *    주석이 적은 단언(「이 인자를 끄면 답이 달라진다」)을 시험이 **직접 물게** 했다.
 * ㉸ 우리말 — 「그중」은 붙여 쓴다. 조사는 지면에 **찍히는 글자**로 정한다
 *    (`m2Josa` 한 곳에서 계산한다 — 목록을 두 벌로 안 둔다).
 *    🔴 **2026-09-04 실측으로 다섯 자리가 손으로 박혀 있었다** — `125X` 의
 *    「$0.\overline{ab}$**을**」(400/400)·「$0.\overline{ab}$**이라** 하면」(400/400),
 *    `127X` 의 「$y=ax+n_3$**가**」(250/400 어긋남)·「$y$절편이 … $n$**로**」(204/400)·
 *    「교점 $(p_x,\ p_y)$**를** 지나야」(400/400 손 박음). 앞의 셋 가운데 하나만
 *    `josaMismatches` 가 물었고(「가」→「이」), 「(으)로」·`\overline{}`·좌표쌍 뒤는
 *    그 자가 **구조적으로 못 본다**(끝이 숫자가 아니거나 축이 다르다). 그래서 시험이
 *    「(으)로」 자와 이 세 자리의 **회귀 잠금**을 따로 들고 있다.
 *
 * ## ⑷ 🔴 손실 원장 (D-20 · ㉶) — 어림하지 않고 **전수로 다시 센 값** (2026-09-04 재측정)
 *
 * 🔴 **앞서 이 자리에 적혀 있던 표는 재현되지 않았다.** 「`126X` 모집단 19,380 · 통과
 * 1,884」라 적혀 있었는데, 그 모집단은 **「나중에 섞는 쪽이 진한가」(`up`) 축을 빼놓은**
 * 수(3,876×5)였고 통과 수도 어느 가드 조합으로도 안 나온다. `125X` 도 748 이라 적혀
 * 있으나 전수로는 **848** 이다. ㉶ 가 말하는 그 자리라 **표를 통째로 다시 쟀다.**
 *
 * 재는 자리를 하나로 맞췄다: **매개변수 전수(`128X` 만 씨앗 4,000판)에서 «통과 조합 수»·
 * «서로 다른 정답 수»·«최빈 정답 비율»** 을 같은 모집단에서 함께 센다. 가드는
 * **하나씩만** 끈다. 값은 이 파일의 순수 함수(`shortcutHits`·`mixWindow`·
 * `noTriangleValues`·`multiplierFromGap`)를 그대로 부르는 계량기로 쟀고, 그 절차는
 * 시험 파일 머리말 ⑹ 에 적었다.
 *
 * | 유형 | 모집단(전수) | 가드를 하나만 껐을 때 | 잃은 것 |
 * |---|---|---|---|
 * | `125X` | $ab$ 22 × $N\in[6,150]$ = **3,190** → 통과 **848** · 답 **42종** · 최빈 **2.59%** | 지름길 917(42종·2.40%) · 분모 상한($\le900$) 1,491(**109종**·1.48%) · 분자 상한 855(42종) · 분모 $99$ 862(43종) · 굳힘 확인 **848**(그대로) | 지름길이 **69조합**(7.5%)을 깎고 답 가짓수는 **안 줄인다** — 최빈만 2.40%→2.59% 로 오른다. 값을 가장 크게 치르는 것은 **분모 상한**이다(848↔1,491 · 답 42↔109). 그래도 둔다 — $\dfrac{91}{9900}$ 은 지면에서 안 읽힌다 |
 * | `126X` | 농도 4개 조합 3,876 × $M$ 5 × `up` 2 = **38,760** → 통과 **21,553** · 답 **1,617종** · 최빈 **0.52%** | 지름길 22,718(1,646종) · 위끝 상한($\le2000$) 25,110(**2,295종**) · 「자연수」 걸음 31,615(1,799종) · 아래끝·창 길이·굳힘 확인 **21,553**(그대로) | 가장 크게 깎는 것은 ㉯ 의 **「자연수」 걸음 가드**(9,650조합·30.5%)다. 지름길은 753조합(3.3%)뿐. 🔴 **아래끝($\ge2$)·창 길이($\ge4$)·굳힘 확인은 홀로 깎는 것이 0** — $amount\ge100$ 이라 구조적으로 안 걸린다. 그 «0» 은 «잃은 것 없음»이 아니라 **«막을 것이 없음»** 이다 |
 * | `127X` | $p_x$ 8 × $p_y$ 17 × $m_1$ 10 × $m_2$ 10 × $a_3$ 16 = **217,600** → 통과 **32,822** · 답 **37종** · 최빈 **7.98%** | 지름길 119,640(39종·5.54%) · 절편 상한($\le36$) 49,284(37종) · 굳힘 확인 **32,822**(그대로) | 지름길이 **78,696조합**(65.8%)을 깎는다 — 이 유형은 발문에 다섯 수가 있어 한두 번 연산의 그물이 넓다. 답 가짓수는 39→**37**, 최빈은 5.54%→**6.70%** 로 오른다. 그 값을 치르는 까닭은 남겨 두면 세 판에 두 판이 「발문의 수를 더하거나 빼면 답」이기 때문이다 |
 * | 🔴 **2026-09-04 갱신** — 확대 갈래 판정기 ㉡ 축이 잡은 결함 둘을 고치며 가드를 하나씩 더했다. `126X` 는 두 경계가 서로 반대로 반올림돼 상쇄되는 판을 버린다(21,965 → **21,553**, 412조합). `127X` 는 $m_1+m_2=0$ 인 판을 버린다(40,944 → **32,822**, 8,122조합 · 최빈 6.70% → **7.98%**, 판 기준 실측 7.88~9.13% 로 문턱 12% 아래). ⚠️ 두 줄의 **가드별 「걸린 수」 칸은 이 가드들을 넣기 전에 잰 값**이라 지금은 상한이다 — 다시 잴 때는 `mixWindowCase`·`noTriangleCase` 를 부를 것(옮겨 적지 말 것).
 * | `128X` | 씨앗 **4,000판** → 통과 **4,000판 전량** · 답 **1,768종** · 최빈 **0.20%** | — | 계수 범위가 넓어 가드가 판을 못 깎는다. 이 유형의 D-20 은 «잃은 것 없음»이다 |
 *
 * 🔴 **굳힘 확인 줄(세 유형)은 판을 하나도 안 깎는다 — 생성기 안에서는 «도장»이다.**
 * 그래서 그 마디는 생성기가 아니라 **시험이 인자를 흔들어** 잰다(㉷ · 2026-08-23).
 *
 * ## ⑸ 번호 규약 — **`X` 접미사**
 *
 * `extensionNumberReason` 이 「숫자+영문 대문자 한 글자」를 통과시킨다.
 * `A`·`T`(1차)·`U`(2차)·`V`(3차)·`W`(4차)가 쓰였으므로 5차는 **`X`** 이고,
 * 리드가 갈래마다 번호 구간을 나눴다 — 이 갈래는 `125X`~`128X` 다.
 *
 * ## ⑹ 계약 (이웃 모듈과 한 벌)
 *
 * 1. **정답을 먼저 뽑고 발문을 역산한다.**
 * 2. `facts` 로 정답 문자열을 **다시 지을 수 있다**(시험이 왕복으로 잠근다).
 *    `facts.x` 는 답의 **첫 수** — `125X` 는 $N$, `126X` 는 두 끝의 합,
 *    `127X` 는 상수들의 합, `128X` 는 $x^2$의 계수(그래서 그 계수를 **$2$ 이상**으로 묶는다).
 * 3. 숫자는 전부 `$...$` 안에 (`elementary/rules` `bareNumbers`).
 * 4. `attempt` 가 다 떨어지면 **던진다** — 조용히 기본값을 내지 않는다.
 * 5. 그림이 없으므로 발문이 **지면을 가리키지 않는다**(`pointsAtFigure`).
 * 6. 🔴 **해설이 걸음을 건너뛰지 않는다.** 후보를 견주는 갈래(`126X`·`127X`)는
 *    **죽는 후보가 왜 죽는지**까지 적는다.
 * 7. 🔴 **낱말·수 뒤 조사를 손 목록으로 적지 않는다.** 받침 판정은 `m2Josa` 한 곳이다.
 *
 * ## ⑺ 정찰과 달라진 것 — 근거를 남긴다
 *
 * 1. `125X` 의 순환마디를 처음엔 두 자리 전부($10$~$99$)로 열었다. **닫았다** —
 *    $\dfrac{27}{99}$ 처럼 **기약이 아닌 분수가 지면에 난다**(㉰). $9900$ 과 서로소인
 *    22개만 남긴다. 이 축은 「분수를 약분해 적자」로는 못 피한다 — 약분하면
 *    $\dfrac{3}{11}$ 이 되어 $0.\overline{27}=\dfrac{27}{99}$ 라는 **변환 걸음 자체가
 *    지면에서 사라지기** 때문이다.
 * 2. `126X` 의 농도를 처음엔 아무 정수로나 열었다. **닫았다** — $\dfrac{8}{100}$ 이
 *    기약이 아니다. $100$ 과 서로소인 홀수만 쓴다.
 * 3. `126X` 의 물음을 「자연수 $x$의 개수」로 잡았다가 **바꿨다** — 개수는 아래끝·위끝
 *    가운데 하나를 잘못 잡아도 값이 그럴듯해 보인다. **두 끝의 합**으로 물으면
 *    두 조건이 **둘 다** 답에 들어가므로, 「어느 조건이 어느 끝인가」를 틀리면
 *    답이 반드시 달라진다 — 이 유형이 재려는 바로 그 마디다.
 * 4. `127X` 를 「삼각형을 이루지 않도록 하는 $a$」로 열되 **정수로 굳는 조합만** 낸다.
 *    한 점에서 만나는 경우의 $a$ 가 분수가 되면 답이 분수 합이 되어 지면이 흉하다.
 * 5. `128X` 의 계수를 **절댓값 $2$ 이상**으로 묶었다. $\pm1$ 을 허용하면 지면에
 *    항이 사라져($x^2$·$-x$) 「동류항끼리 모으면 …」 줄의 수와 지면의 계수가
 *    눈으로 안 맞는다(값은 맞다 — 그래서 값 검산이 구조적으로 못 본다).
 * 6. 🔴 **`127X` 에서 $\pm1$ 이 서는 자리 셋을 닫았다** (2026-09-04 실측).
 *    $p_x=\pm1$ 이면 ㉢ 줄이 `$1a=-2$` 를, $|m|=1$ 이면 대입 줄이 `$-1\times(1)$` 을,
 *    $|m_1-m_2|=1$ 이면 정리 줄이 `$1x=6$` 을 찍는다. 앞의 둘은 **`pageSmells` 가
 *    「계수 $1$ 을 적었다」로 실제로 물었고**(400판 중 **95판**), 셋을 그냥 «계수를
 *    안 적는» 꼴로 고치면 이번엔 「$x=6$에서 … 즉 $x=6$이다」라는 **되풀이 줄**이 난다.
 *    그래서 문구가 아니라 **매개변수를 닫았다.**
 * 7. 🔴 **`127X` 의 범위를 넓혔다 — 정답 쏠림이 문턱을 넘었다** (2026-09-04 실측).
 *    옛 범위($p_x\in[-5,5]$·$p_y\in[-6,6]$·$m\in[-4,4]$·$a_3\in[-5,5]$)에서는 답이
 *    **22종**뿐이라 전수 최빈이 **10.51%**, 씨앗 40블록×800판의 최악이 **13.25%** 로
 *    브리프의 12% 를 **넘었다.** $p_y\in[-8,8]$·$|m|\in[2,6]$·$|a_3|\in[2,9]$·
 *    절편 $\le36$ 으로 넓혀 답 **37종** · 전수 최빈 **6.70%** · 40블록 최악 **9.00%** 가
 *    됐다. ⚠️ 씨앗 표본의 최빈은 전수보다 **늘 크게 나온다**(42~37종 위의 최댓값이라
 *    순서통계량이 위로 치우친다) — 문턱을 잴 때는 **두 값을 같이** 보라.
 * 8. `126X` 해설에 「$x$는 자연수이므로 $M+x>0$」 한 줄을 **더했다.** 분수 부등식의
 *    양변에 $(M+x)$ 를 곱하는 걸음이 근거 없이 「즉」으로 건너뛰고 있었다(D-116 ⑹).
 *    해설 높이는 800판 최대 525.6px → **579.1px**(한 단 964.8px · 문턱 700px).
 * 9. 분수를 감싸는 괄호를 `\left(`·`\right)` 로 바꿨다(`125X` 의 두 분수의 차,
 *    `126X` 의 소금의 양). 보통 괄호는 $\dfrac{}{}$ 옆에서 키가 안 맞아 종이에서 흉하다.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { attempt, poly } from "./m1Shared";
import { eulReul, euroRo, waGwa } from "./m2Josa";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";
const BOOK = "2-1";

/** RPM 색인 정본(`scripts/rpm/rpm-type-catalog.json`)의 중단원 이름 — 글자 그대로. */
const MINOR_REPEAT = "유리수와 순환소수";
const MINOR_INEQ_APPLY = "일차부등식의 활용";
const MINOR_LINE_EQ = "일차함수와 일차방정식의 관계";
const MINOR_POLY = "다항식의 계산";

/**
 * 우리 `Unit.section` 정확한 이름 (`prisma/seed-data/units.ts` 실측).
 * 괄호 안의 쉼표·공백은 눈으로 못 가르므로 시험이 단원 정본과 **대조**한다.
 */
const SEC = {
  분수표현: "순환소수의 분수 표현",
  농도: "일차부등식의 활용(농도)",
  연립해: "일차함수의 그래프와 연립방정식의 해",
  다항덧뺄: "다항식의 덧셈과 뺄셈",
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

export function gcd(a: number, b: number): number {
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

/** 주격 조사 — 받침 판정은 `m2Josa.eulReul` **한 곳**에서 온다. */
function iGa(n: number): "이" | "가" {
  return eulReul(n) === "을" ? "이" : "가";
}

/** 보조사 — 같은 까닭으로 `m2Josa` 를 따른다. */
function eunNeun(n: number): "은" | "는" {
  return eulReul(n) === "을" ? "은" : "는";
}

/**
 * 서술격 조사 `이다` + 어미 `-라` — **받침 뒤에서만 「이」가 산다.**
 *
 * 「$13$이라 하면」 · 「$79$라 하면」. 모음 뒤에 「이라」를 붙이면 틀린 말인데
 * **값 검산·KaTeX·냄새 자가 전부 초록**이라 아무도 못 본다(㉳ 와 같은 자리).
 * 받침 판정은 여기서 새로 적지 않고 `m2Josa` 한 곳에서 온다.
 */
function iRa(n: number): "이라" | "라" {
  return eulReul(n) === "을" ? "이라" : "라";
}

/**
 * 🔴 **지름길 자** — 발문에 찍히는 수들로 «한두 번 연산»해서 답이 나오는가.
 *
 * 낱값과, 순서 있는 두 값의 `+ - × ÷`(나누어떨어질 때만) 를 전부 모아 본다.
 * 이것이 **막지 못하는 것**도 적어 둔다: 세 번 이상 이어진 연산과, 발문에 안 찍힌
 * 중간값(교점 좌표 따위)을 거친 길은 못 본다. 그래서 이 자의 «0» 은 「지름길이
 * 하나도 없다」가 아니라 **「한두 번짜리는 없다」**다.
 */
export function shortcutHits(
  printed: readonly number[],
  target: number,
): boolean {
  const set = new Set<number>();
  for (const v of printed) set.add(v);
  for (const a of printed) {
    for (const b of printed) {
      set.add(a + b);
      set.add(a - b);
      set.add(a * b);
      if (b !== 0 && a % b === 0) set.add(a / b);
    }
  }
  return set.has(target);
}

// ═══════════════════════════════════════════════════════════
// 125X  순환소수를 유한소수로 잘못 보고 곱한 «차»에서 곱한 수 되찾기 (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * 순환마디 후보 — **$9900$ 과 서로소인 두 자리 수**(⑺ 1).
 *
 * 그래야 $\dfrac{ab}{99}$·$\dfrac{ab}{100}$·$\dfrac{ab}{9900}$ 이 **전부 기약**이고,
 * 덤으로 두 자리가 같은 수($11$·$22$…)가 자동으로 빠져 **순환마디가 원시**가 된다
 * (두 자리가 같으면 $11$ 의 배수라 이 목록에 못 들어온다).
 */
export const REPEAT_BLOCKS: readonly number[] = [
  13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 49, 53, 59, 61, 67, 71, 73, 79, 83,
  89, 91, 97,
];

/**
 * **굳힘 함수** — 두 결과의 차 $\dfrac{gapNum}{gapDen}$ 에서 곱한 자연수를 되찾는다.
 *
 * $0.\overline{ab}=\dfrac{ab}{99}$, $0.ab=\dfrac{ab}{100}$ 이므로 한 번 곱할 때의
 * 차는 $\dfrac{ab}{99}-\dfrac{ab}{100}=\dfrac{ab}{9900}$ 이다.
 *
 * 🔴 **굳힘의 인자는 `subtractFinite` 다.** 「유한소수를 곱한 값을 **빼는**」 걸음을
 * 빠뜨리고 $\dfrac{ab}{99}\times N=\dfrac{gapNum}{gapDen}$ 로 놓으면 답이 $\frac1{100}$
 * 배가 되어 **자연수가 아니게 된다** — 이 유형이 재려는 바로 그 마디다.
 *
 * ⚠️ `subtractFinite=false` 는 제품이 안 쓰는 길이다(생성기는 늘 `true`). 그런데도
 *    인자로 두는 까닭은 시험이 그 마디를 **흔들어 잴 수 있게** 하기 위해서다 —
 *    생성기 안에서 두 판을 견주는 줄은 한 번도 거부하지 못하는 «도장»이 된다
 *    (2026-08-23 「도장은 초록을 못 낸다」).
 */
export function multiplierFromGap(
  block: number,
  gapNum: number,
  gapDen: number,
  subtractFinite = true,
): number | null {
  if (block <= 0 || gapNum <= 0 || gapDen <= 0) return null;
  const unitDen = subtractFinite ? 9900 : 99;
  const num = gapNum * unitDen;
  const den = gapDen * block;
  if (den === 0) return null;
  if (num % den !== 0) return null;
  const n = num / den;
  return n >= 2 ? n : null;
}

const REPEAT_TO_FRACTION: TypeEntry[] = [
  def(
    MINOR_REPEAT,
    "125X",
    "순환소수를 유한소수로 잘못 보고 곱한 차에서 곱한 수 구하기",
    SEC.분수표현,
    "심화중",
    (rng): Body =>
      attempt(6000, (): Body | null => {
        const block = pick(rng, REPEAT_BLOCKS);
        const mul = intBetween(rng, 6, 150);
        // 차를 **기약분수로 지어** 지면의 모든 분수가 기약이 되게 한다(㉰).
        const [gapNum, gapDen] = reduceFraction(mul * block, 9900);
        // 분모가 $900$ 을 넘으면 지면이 흉하다 — $\dfrac{91}{9900}$ 은 읽히지 않는다.
        if (gapDen > 900) return null;
        if (gapNum > 999) return null;
        // 차의 분모가 $99$ 이면 그 차가 곧 $0.\overline{ab}$ 자신이라 발문이 어색하다.
        if (gapDen === 99) return null;

        // 🔴 ㉵ 지름길 — 발문에 찍히는 수(순환마디와 그 두 자리, 차의 분자·분모)로
        //    한두 번 연산해서 $N$ 이 나오면 버린다. 전수 1,067 → 748 (⑷).
        const printed = [
          block,
          Math.floor(block / 10),
          block % 10,
          gapNum,
          gapDen,
        ];
        if (shortcutHits(printed, mul)) return null;

        // 굳힘 함수가 실제로 그 값을 내는지 — 여기서 재면 «도장»이므로 시험이 흔든다.
        if (multiplierFromGap(block, gapNum, gapDen) !== mul) return null;

        return {
          content:
            `어떤 자연수에 순환소수 $0.\\overline{${block}}$${eulReul(block)} 곱해야 할 것을, ` +
            `잘못하여 유한소수 $0.${block}$${eulReul(block)} 곱했더니 그 결과가 ` +
            `바르게 계산한 값보다 $\\dfrac{${gapNum}}{${gapDen}}$만큼 작아졌다. ` +
            `이때 처음의 자연수를 구하시오.`,
          answer: `$${mul}$`,
          solution: [
            `구하는 자연수를 $N$이라 하자.`,
            `$x=0.\\overline{${block}}$${iRa(block)} 하면 $100x=${block}.\\overline{${block}}$이므로 $100x-x=${block}$, 즉 $99x=${block}$에서 순환소수 $0.\\overline{${block}}=\\dfrac{${block}}{99}$이다.`,
            `한편 $0.${block}$${eunNeun(block)} 유한소수이므로 $0.${block}=\\dfrac{${block}}{100}$이다.`,
            `바르게 계산한 값은 $\\dfrac{${block}}{99}\\times N$이고 잘못 계산한 값은 $\\dfrac{${block}}{100}\\times N$이므로, 두 값의 차는 $\\left(\\dfrac{${block}}{99}-\\dfrac{${block}}{100}\\right)\\times N$이다.`,
            `$\\dfrac{${block}}{99}-\\dfrac{${block}}{100}$${eulReul(block)} $99$${waGwa(99)} $100$의 최소공배수인 $9900$${euroRo(9900)} 통분하면 분자가 $${block}\\times100-${block}\\times99=${block}$이므로, 한 번 곱할 때의 차는 $\\dfrac{${block}}{9900}$이다.`,
            `그러므로 $\\dfrac{${block}}{9900}\\times N=\\dfrac{${gapNum}}{${gapDen}}$이다.`,
            `따라서 $N=\\dfrac{${gapNum}}{${gapDen}}\\div\\dfrac{${block}}{9900}=\\dfrac{${gapNum}}{${gapDen}}\\times\\dfrac{9900}{${block}}=${mul}$이다.`,
            `실제로 $\\dfrac{${block}}{9900}\\times${mul}=\\dfrac{${gapNum}}{${gapDen}}$이므로 발문의 차와 같다.`,
          ].join("\n"),
          facts: {
            x: mul,
            block,
            gapNum,
            gapDen,
            unitDen: 9900,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 126X  두 소금물을 섞어 농도가 구간에 들도록 — 두 끝의 합 (심화상)
// ═══════════════════════════════════════════════════════════

/**
 * 농도 후보 — **$100$ 과 서로소인 홀수**(⑺ 2). 그래야 $\dfrac{p}{100}$ 이 기약이다.
 */
export const CONCENTRATIONS: readonly number[] = [
  3, 7, 9, 11, 13, 17, 19, 21, 23, 27, 29, 31, 33, 37, 39, 41, 43, 47, 49,
];

/** 소금물의 양 — $100$ 의 배수라야 소금의 양이 정수다. */
export const AMOUNTS: readonly number[] = [100, 200, 300, 400, 500];

export type MixBound = {
  /** 약분한 뒤 $x$ 의 계수 (늘 양수) */
  coef: number;
  /** 약분한 뒤의 상수 (늘 양수) */
  konst: number;
  /** 정리한 뒤의 부등호 방향 */
  dir: "ge" | "le";
  /** 자연수 $x$ 에 대한 경계 */
  bound: number;
  /** 약분 전 계수 */
  rawCoef: number;
  /** 약분 전 상수 */
  rawKonst: number;
};

/**
 * **굳힘 함수** — $p\%$ 소금물 `amount` g 에 $q\%$ 소금물 $x$ g 을 섞을 때
 * 「농도가 `target`% `dir`」인 조건을 정리한다.
 *
 * 소금의 양은 $\dfrac{p\cdot amount+qx}{100}$, 소금물의 양은 $amount+x$ 이므로
 * 농도는 $\dfrac{p\cdot amount+qx}{amount+x}\%$ 다.
 *
 * 🔴 **굳힘의 인자는 `dilutes` 다.** 섞은 뒤 **소금물의 양이 $amount+x$ 로 늘어난다**는
 * 걸음을 빠뜨리고 분모를 $amount$ 로 두면 계수가 $q-target$ 이 아니라 $q$ 가 되어
 * 경계가 달라진다 — 학생이 가장 흔히 하는 실수이고, 이 유형이 재려는 마디다.
 * (`dilutes=false` 는 제품이 안 쓰는 길이다. 시험이 흔들어 잰다.)
 *
 * 🔴 그리고 **부등호가 뒤집히는 자리가 여기다** — $q<target$ 이면 계수가 음수라
 * 양변을 음수로 나누며 방향이 바뀐다. 그래서 「$r\%$ 이상」이 아래끝을 줄지
 * **위끝을 줄지**가 $p$ 와 $q$ 의 대소에 따라 갈린다(심화상의 견주기).
 */
export function mixBound(
  p: number,
  amount: number,
  q: number,
  target: number,
  dir: "ge" | "le",
  dilutes = true,
): MixBound | null {
  let coef = dilutes ? q - target : q;
  let konst = (target - p) * amount;
  let d: "ge" | "le" = dir;
  if (coef < 0) {
    coef = -coef;
    konst = -konst;
    d = d === "ge" ? "le" : "ge";
  }
  if (coef <= 0) return null;
  // 상수가 $0$ 이하이면 자연수 $x$ 에 대해 조건이 자명해져 아무것도 안 자른다.
  if (konst <= 0) return null;
  const rawCoef = coef;
  const rawKonst = konst;
  const g = gcd(coef, konst);
  coef /= g;
  konst /= g;
  const bound = d === "ge" ? Math.ceil(konst / coef) : Math.floor(konst / coef);
  return { coef, konst, dir: d, bound, rawCoef, rawKonst };
}

export type MixWindow = {
  lo: number;
  hi: number;
  /** 아래끝을 준 조건의 농도 (`r` 인가 `s` 인가) */
  loFrom: "r" | "s";
  hiFrom: "r" | "s";
  loBound: MixBound;
  hiBound: MixBound;
};

/** 두 조건을 다 세워 **견준 뒤** 창의 두 끝을 낸다. */
export function mixWindow(
  p: number,
  amount: number,
  q: number,
  r: number,
  s: number,
  dilutes = true,
): MixWindow | null {
  const bR = mixBound(p, amount, q, r, "ge", dilutes);
  const bS = mixBound(p, amount, q, s, "le", dilutes);
  if (bR === null || bS === null) return null;
  if (bR.dir === bS.dir) return null; // 창이 한쪽으로만 열려 닫히지 않는다
  const low = bR.dir === "ge" ? bR : bS;
  const high = bR.dir === "le" ? bR : bS;
  return {
    lo: low.bound,
    hi: high.bound,
    loFrom: bR.dir === "ge" ? "r" : "s",
    hiFrom: bR.dir === "le" ? "r" : "s",
    loBound: low,
    hiBound: high,
  };
}

/**
 * 경계 한 줄 — **공용 훑개가 읽는 꼴 그대로** 적는다(㉯).
 *
 * 약분을 «주장 앞»에서 끝내므로 주장 줄의 계수·상수는 늘 서로소다. 그러면
 * 「$x\ge\dfrac{R}{c}$」가 기약이라 ㉰ 와 충돌하지 않는다. 약분한 계수가 $1$ 이면
 * 분수 걸음이 아예 없으므로 그 자리는 「$x\ge B$이다.」로 끝난다 —
 * 그때 이 축은 «깨끗»이 아니라 **«잴 것이 없다»** 다.
 */
export function boundLine(b: MixBound): string {
  const sign = b.dir === "ge" ? "\\ge" : "\\le";
  const g = b.rawCoef / b.coef;
  const claim =
    b.coef === 1
      ? `$x${sign}${b.konst}$이다.`
      : `$${b.coef}x${sign}${b.konst}$이다.`;
  const head =
    g === 1
      ? claim
      : `$${b.rawCoef}x${sign}${b.rawKonst}$이고, 양변을 $${g}$${euroRo(g)} 나누면 ${claim}`;
  if (b.coef === 1) return head;
  return (
    `${head} 즉 $x${sign}\\dfrac{${b.konst}}{${b.coef}}$이고 ` +
    `$x$는 자연수이므로 $x${sign}${b.bound}$이다.`
  );
}

/**
 * `126X` 의 **받아들임 규칙 한 벌**. 생성기와 D-20 손실 원장 계산이 이 함수 하나를 쓴다
 * (`noTriangleCase` 와 같은 까닭 — 옮겨 적으면 한쪽만 고쳐도 아무도 모른다).
 *
 * 뽑기는 밖에 둔다 — 안으로 들이면 rng 소비가 달라져 **지면이 통째로 흔들린다.**
 */
export function mixWindowCase(
  p: number,
  amount: number,
  q: number,
  r: number,
  s: number,
): MixWindow | null {
  const win = mixWindow(p, amount, q, r, s);
  if (win === null) return null;
  const { lo, hi } = win;
  // 아래끝이 $1$ 이면 아래 조건이 아무것도 안 자른다 — 창이 한쪽만 닫힌 셈이다.
  if (lo < 2) return null;
  if (hi > 2000) return null;
  if (hi - lo < 4) return null;
  // ㉯ 두 경계 가운데 **적어도 하나**는 나누어떨어지지 않아야 「자연수」 걸음이 선다.
  if (win.loBound.coef === 1 && win.hiBound.coef === 1) return null;
  // 🔴 그런데 그것만으로는 모자랐다. 답이 **두 끝의 합**이라, 두 경계가 서로
  //    **반대로 반올림돼 상쇄되면**(예: $4.4$ → $5$ · $9.6$ → $9$, 합은 둘 다 $14$)
  //    「$x$는 자연수」 걸음을 통째로 건너뛰고 분수 경계를 그대로 더해도 답이 맞는다.
  //    확대 갈래 판정기 ㉡ 축이 **590판 중 17판(2.9%)** 으로 잡았다(2026-09-04).
  //    유리수 그대로 견준다 — 부동소수로 재면 경계에서 어긋난다.
  const lb = win.loBound;
  const hb = win.hiBound;
  if (lb.konst * hb.coef + hb.konst * lb.coef === (lo + hi) * lb.coef * hb.coef)
    return null;
  // 굳힘을 지우면 답이 달라지는가 — 늘 참이지만 못 박는다(시험이 흔든다).
  const naive = mixWindow(p, amount, q, r, s, false);
  if (naive !== null && naive.lo === lo && naive.hi === hi) return null;
  // 🔴 ㉵ 지름길 — 발문 다섯 수의 한두 번 연산이 답과 같으면 버린다.
  if (shortcutHits([p, q, r, s, amount], lo + hi)) return null;
  return win;
}

const MIX_WINDOW_SUM: TypeEntry[] = [
  def(
    MINOR_INEQ_APPLY,
    "126X",
    "두 소금물을 섞어 농도가 주어진 범위에 들 때 섞는 양의 두 끝",
    SEC.농도,
    "심화상",
    (rng): Body =>
      attempt(8000, (): Body | null => {
        // 네 농도를 **따로 뽑아 정렬**한다 — 자리마다 다른 범위에서 뽑으면 쏠린다.
        const c1 = pick(rng, CONCENTRATIONS);
        const c2 = pick(rng, CONCENTRATIONS);
        const c3 = pick(rng, CONCENTRATIONS);
        const c4 = pick(rng, CONCENTRATIONS);
        const sorted = [c1, c2, c3, c4].sort((a, b) => a - b);
        if (new Set(sorted).size !== 4) return null;
        const [v1, v2, v3, v4] = sorted as [number, number, number, number];
        const amount = pick(rng, AMOUNTS);
        // 나중에 섞는 쪽이 진한가(`up`) 묽은가 — **씨앗마다 뒤집힌다**(견주기의 뿌리).
        const up = rng() < 0.5;
        const p = up ? v1 : v4;
        const q = up ? v4 : v1;
        const r = v2;
        const s = v3;

        const win = mixWindowCase(p, amount, q, r, s);
        if (win === null) return null;
        const { lo, hi } = win;
        const sum = lo + hi;

        const salt = (amount / 100) * p;
        const compare = up
          ? `나중에 섞는 소금물의 농도 $${q}\\%$가 처음 소금물의 농도 $${p}\\%$보다 높으므로 $x$가 커질수록 섞은 소금물의 농도도 높아진다. 그러므로 농도가 $${r}\\%$ 이상이라는 조건에서 $x$의 최솟값이, $${s}\\%$ 이하라는 조건에서 $x$의 최댓값이 나온다.`
          : `나중에 섞는 소금물의 농도 $${q}\\%$가 처음 소금물의 농도 $${p}\\%$보다 낮으므로 $x$가 커질수록 섞은 소금물의 농도는 낮아진다. 그러므로 농도가 $${r}\\%$ 이상이라는 조건에서 $x$의 최댓값이, $${s}\\%$ 이하라는 조건에서 $x$의 최솟값이 나온다.`;
        const edge = up
          ? `$x=${lo - 1}$이면 농도가 $${r}\\%$보다 낮아지고 $x=${hi + 1}$이면 농도가 $${s}\\%$보다 높아지므로, 이 범위는 더 넓힐 수 없다.`
          : `$x=${lo - 1}$이면 농도가 $${s}\\%$보다 높아지고 $x=${hi + 1}$이면 농도가 $${r}\\%$보다 낮아지므로, 이 범위는 더 넓힐 수 없다.`;

        return {
          content:
            `농도가 $${p}\\%$인 소금물 $${amount}$ g에 농도가 $${q}\\%$인 소금물 $x$ g을 ` +
            `섞으려고 한다. 섞은 소금물의 농도가 $${r}\\%$ 이상 $${s}\\%$ 이하가 되도록 할 때, ` +
            `$x$의 값 중 가장 작은 값과 가장 큰 값의 합을 구하시오. (단, $x$는 자연수이다.)`,
          answer: `$${sum}$`,
          solution: [
            `농도가 $${p}\\%$인 소금물 $${amount}$ g에 들어 있는 소금의 양은 $${amount}\\times\\dfrac{${p}}{100}=${salt}$ (g)이고, 농도가 $${q}\\%$인 소금물 $x$ g에 들어 있는 소금의 양은 $\\dfrac{${q}x}{100}$ (g)이다.`,
            `섞은 소금물의 양은 $(${amount}+x)$ g이고 그 속의 소금의 양은 $\\left(${salt}+\\dfrac{${q}x}{100}\\right)$ g이므로, 섞은 소금물의 농도는 $\\dfrac{${p * amount}+${q}x}{${amount}+x}\\%$이다.`,
            `$x$는 자연수이므로 $${amount}+x>0$이고, 따라서 아래 두 부등식의 양변에 $(${amount}+x)$를 곱해도 부등호의 방향은 바뀌지 않는다.`,
            compare,
            `농도가 $${r}\\%$ 이상이려면 $\\dfrac{${p * amount}+${q}x}{${amount}+x}\\ge${r}$, 즉 $${p * amount}+${q}x\\ge${r * amount}+${r}x$이므로 ${boundLine(
              mixBound(p, amount, q, r, "ge")!,
            )}`,
            `농도가 $${s}\\%$ 이하이려면 $\\dfrac{${p * amount}+${q}x}{${amount}+x}\\le${s}$, 즉 $${p * amount}+${q}x\\le${s * amount}+${s}x$이므로 ${boundLine(
              mixBound(p, amount, q, s, "le")!,
            )}`,
            `따라서 가능한 $x$는 $${lo}$ 이상 $${hi}$ 이하의 자연수이므로, 가장 작은 값은 $${lo}$, 가장 큰 값은 $${hi}$이고 그 합은 $${lo}+${hi}=${sum}$이다.`,
            edge,
          ].join("\n"),
          facts: {
            x: sum,
            lo,
            hi,
            p,
            q,
            r,
            s,
            amount,
            up: up ? 1 : 0,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 127X  세 직선이 삼각형을 이루지 않도록 하는 모든 상수의 합 (심화상)
// ═══════════════════════════════════════════════════════════

/** `y=mx+n` 의 KaTeX 몸통 — `$` 는 밖에서 감싼다. $m\ne0$, $n\ne0$ 만 쓴다. */
export function lineText(m: number, n: number): string {
  return `y=${poly(0, m, n)}`;
}

/**
 * 곱해지는 수 — **양수는 괄호로 싸지 않는다.**
 *
 * $2\times(8)$ 처럼 양수를 괄호에 넣는 것은 값이 맞고 KaTeX 도 초록이라 어느 자도
 * 못 보는 지면 흠이다(2026-08-24 중3 다항식에서 여섯 유형이 그랬다).
 * 음수는 괄호가 **있어야** `\times-3` 이 안 된다.
 */
export function timesArg(v: number): string {
  return v < 0 ? `(${v})` : `${v}`;
}

/**
 * **굳힘이 없는 함수** — 세 직선이 삼각형을 이루지 **않는** $a$ 를 **다 세운다**.
 *
 * 그래서 인자로 둔 것은 굳힘이 아니라 **«후보를 몇 갈래나 세우는가»**(`includeConcurrent`)다.
 * 평행 두 경우만 세고 「세 직선이 한 점에서 만나는 경우」를 빠뜨리면 합이 달라진다 —
 * 이 유형이 재려는 바로 그 마디다.
 *
 * 두 직선 $y=m_1x+n_1$, $y=m_2x+n_2$ 의 교점의 $x$좌표가 정수가 아니거나, 그 교점을
 * 지나는 $a$ 가 정수가 아니면 `null` — 생성에서 애초에 그런 조합을 안 낸다.
 */
export function noTriangleValues(
  m1: number,
  n1: number,
  m2: number,
  n2: number,
  n3: number,
  includeConcurrent = true,
): number[] | null {
  if (m1 === m2) return null;
  const dx = m1 - m2;
  const dn = n2 - n1;
  if (dn % dx !== 0) return null;
  const px = dn / dx;
  const py = m1 * px + n1;
  const out: number[] = [];
  // $y$절편이 같으면 두 직선이 **겹쳐서** 「평행」이 아니다 — 그 자리는 안 센다.
  if (n3 !== n1) out.push(m1);
  if (n3 !== n2) out.push(m2);
  if (includeConcurrent) {
    if (px === 0) return null;
    if ((py - n3) % px !== 0) return null;
    out.push((py - n3) / px);
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

/** `127X` 의 매개변수 다섯이 살아남는가 — 살면 지면에 쓸 값을 함께 낸다. */
export type NoTriangleCase = {
  n1: number;
  n2: number;
  n3: number;
  values: number[];
  sum: number;
};

/**
 * `127X` 의 **받아들임 규칙 한 벌**. 생성기와 D-20 손실 원장 계산이 **이 함수 하나**를
 * 쓴다.
 *
 * 🔴 왜 함수로 뺐나. 2026-09-04 에 생성기에 가드 한 줄($m_1+m_2\ne0$)을 더했는데,
 *    손실 원장을 세는 시험이 같은 조건들을 **손으로 옮겨 적은 모형**이라 그 줄이
 *    거기 없었다 — 제품은 바뀌었는데 시험은 **초록인 채로** 옛 수(`40944`)를
 *    그대로 잠그고 있었다. 「재는 쪽이 제품이 아니면 그 수는 제품의 수가 아니다.」
 *    이제 한쪽만 고치는 일이 구조적으로 불가능하다.
 *
 * `skipShortcut` 은 ㉵ 지름길 가드만 끈다(D-20 원장이 「이 가드 하나만 껐을 때」를
 * 세려고 쓴다).
 */
export function noTriangleCase(
  px: number,
  py: number,
  m1: number,
  m2: number,
  a3: number,
  skipShortcut = false,
): NoTriangleCase | null {
  // 교점을 **먼저** 정하면 두 직선의 절편이 정수로 굳는다.
  // 🔴 $|p_x|\ge2$ — $p_x=\pm1$ 이면 해설이 $\pm1a$ 를 찍는다(⑺ 6).
  if (Math.abs(px) < 2) return null;
  // 🔴 $|m|\ge2$ — $m=\pm1$ 이면 대입 줄이 $\pm1\times p_x$ 를 찍는다(⑺ 6).
  if (Math.abs(m1) < 2 || Math.abs(m2) < 2) return null;
  // 🔴 $|m_1-m_2|\ge2$ — 차가 $\pm1$ 이면 정리 줄이 $\pm1x$ 를 찍는다(⑺ 6).
  if (Math.abs(m1 - m2) < 2) return null;
  const n1 = py - m1 * px;
  const n2 = py - m2 * px;
  if (n1 === 0 || n2 === 0) return null;
  if (Math.abs(n1) > 36 || Math.abs(n2) > 36) return null;
  // $a_3=0$ 이면 답이 $m_1+m_2$ 라 발문의 두 수를 더하기만 하면 맞는다.
  // $|a_3|=1$ 은 굳힘과 무관하지만 셋을 같은 범위로 두어야 답이 고르다(⑺ 7).
  if (Math.abs(a3) < 2 || a3 === m1 || a3 === m2) return null;
  // 🔴 그 **거울**이 안 막혀 있었다 — $m_1+m_2=0$ 이면 답이 $a_3$ 하나가 되어,
  //    「평행 두 경우」를 **아예 안 세고** 한 점에서 만나는 경우만 풀어도 답이
  //    맞는다. 이 유형이 심화상인 근거가 「경우 셋을 스스로 세운다」인데 그 판에서는
  //    셋 중 둘이 공짜다. 확대 갈래 판정기 ㉡ 축이 **598판 중 124판(20.7%)**
  //    으로 잡았다(2026-09-04). 위 `a3 === 0` 줄과 **한 쌍**이다 —
  //    대칭인 두 자리에 가드가 한쪽만 걸려 있었다.
  if (m1 + m2 === 0) return null;
  const n3 = py - a3 * px;
  if (n3 === 0 || n3 === n1 || n3 === n2) return null;
  if (Math.abs(n3) > 36) return null;

  const values = noTriangleValues(m1, n1, m2, n2, n3);
  if (values === null || values.length !== 3) return null;
  const sum = values[0]! + values[1]! + values[2]!;

  // 굳힘을 지우면(한 점에서 만나는 경우를 빠뜨리면) 답이 달라지는가.
  const partial = noTriangleValues(m1, n1, m2, n2, n3, false);
  if (partial === null) return null;
  if (partial.reduce((t, v) => t + v, 0) === sum) return null;

  // 🔴 ㉵ 지름길 — 발문 다섯 수의 한두 번 연산이 답과 같으면 버린다.
  if (!skipShortcut && shortcutHits([m1, n1, m2, n2, n3], sum)) return null;
  return { n1, n2, n3, values, sum };
}

const NO_TRIANGLE: TypeEntry[] = [
  def(
    MINOR_LINE_EQ,
    "127X",
    "세 직선이 삼각형을 이루지 않도록 하는 상수를 모두 구하기",
    SEC.연립해,
    "심화상",
    (rng): Body =>
      attempt(8000, (): Body | null => {
        const px = intBetween(rng, -5, 5);
        const py = intBetween(rng, -8, 8);
        const m1 = intBetween(rng, -6, 6);
        const m2 = intBetween(rng, -6, 6);
        const a3 = intBetween(rng, -9, 9);
        const ok = noTriangleCase(px, py, m1, m2, a3);
        if (ok === null) return null;
        const { n1, n2, n3, values, sum } = ok;

        const listed = values.map((v) => `$${v}$`).join(", ");
        const chain = values
          .map((v, i) => (i === 0 ? `${v}` : v < 0 ? `${v}` : `+${v}`))
          .join("");
        return {
          content:
            `세 직선 $${lineText(m1, n1)}$, $${lineText(m2, n2)}$, $y=ax${
              n3 < 0 ? `-${-n3}` : `+${n3}`
            }$${iGa(n3)} 삼각형을 이루지 않도록 하는 ` +
            `모든 상수 $a$의 값의 합을 구하시오.`,
          answer: `$${sum}$`,
          solution: [
            `두 직선 $${lineText(m1, n1)}$${waGwa(Math.abs(n1))} $${lineText(m2, n2)}$${eunNeun(Math.abs(n2))} 기울기가 서로 다르므로 한 점에서 만난다.`,
            `그 교점은 두 일차방정식을 연립한 해이므로 $${poly(0, m1, n1)}=${poly(0, m2, n2)}$에서 $${m1 - m2}x=${n2 - n1}$, 즉 $x=${px}$이고 $y=${m1}\\times${timesArg(px)}${n1 < 0 ? `-${-n1}` : `+${n1}`}=${py}$이므로 교점은 $(${px},\\ ${py})$이다.`,
            `세 직선이 삼각형을 이루지 않는 경우는 ㉠ 셋째 직선이 첫째 직선과 평행한 경우, ㉡ 셋째 직선이 둘째 직선과 평행한 경우, ㉢ 세 직선이 한 점에서 만나는 경우, 이렇게 셋뿐이다.`,
            `㉠ 평행하려면 기울기가 같아야 하므로 $a=${m1}$이다. 이때 $y$절편이 $${n3}$${waGwa(Math.abs(n3))} $${n1}$${euroRo(n1)} 서로 다르므로 두 직선은 만나지 않는다.`,
            `㉡ 같은 방법으로 $a=${m2}$이다. 이때 $y$절편이 $${n3}$${waGwa(Math.abs(n3))} $${n2}$${euroRo(n2)} 서로 다르므로 두 직선은 만나지 않는다.`,
            `㉢ 셋째 직선이 교점 $(${px},\\ ${py})$${eulReul(py)} 지나야 하므로 $${py}=a\\times${timesArg(px)}${n3 < 0 ? `-${-n3}` : `+${n3}`}$에서 $${px}a=${py - n3}$, 즉 $a=${a3}$이다.`,
            `따라서 구하는 $a$의 값은 ${listed}의 셋이고, 그 합은 $${chain}=${sum}$이다.`,
            `세 값이 서로 다르므로 세 경우가 겹치지 않고, 이 밖의 $a$에 대해서는 세 직선이 삼각형을 이룬다.`,
          ].join("\n"),
          facts: {
            x: sum,
            m1,
            n1,
            m2,
            n2,
            n3,
            px,
            py,
            a3,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 128X  괄호를 빠뜨린 계산과 바른 계산의 «차»에서 원래 다항식 되찾기 (심화중)
// ═══════════════════════════════════════════════════════════

/** 이차식 하나 — `[x^2의 계수, x의 계수, 상수항]`. */
export type Quad = [number, number, number];

export function addQuad(a: Quad, b: Quad): Quad {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function subQuad(a: Quad, b: Quad): Quad {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function sameQuad(a: Quad, b: Quad): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

/**
 * **굳힘 함수** — 「바른 식 $-$ 잘못된 식」이 정확히 $2C$ 임을 써서 $A$ 를 되찾는다.
 *
 * $A-(B-C)=A-B+C$ 이고 잘못 계산한 식은 $A-B-C$ 이므로 그 차는 $2C$ 다.
 * 그러므로 $C=\dfrac12\times(\text{차})$ 이고, $A=(A-B-C)+B+C$ 다.
 *
 * 🔴 **굳힘의 인자는 `halveGap` 이다.** 괄호를 풀면 $-C$ 가 $+C$ 로 바뀌어 차가
 * $C$ 가 아니라 **$2C$** 라는 걸음을 빠뜨리면 $A$ 가 통째로 달라진다 — 학생이
 * 가장 흔히 하는 실수이고, 이 유형이 재려는 바로 그 마디다.
 * (`halveGap=false` 는 제품이 안 쓰는 길이다. 시험이 흔들어 잰다.)
 */
export function recoverA(
  wrong: Quad,
  b: Quad,
  gap: Quad,
  halveGap = true,
): Quad | null {
  const c: Quad = halveGap
    ? [gap[0] / 2, gap[1] / 2, gap[2] / 2]
    : [gap[0], gap[1], gap[2]];
  if (!c.every((v) => Number.isInteger(v))) return null;
  return addQuad(addQuad(wrong, b), c);
}

const BRACKET_GAP: TypeEntry[] = [
  def(
    MINOR_POLY,
    "128X",
    "괄호를 빠뜨린 계산과 바른 계산의 차에서 원래 다항식 구하기",
    SEC.다항덧뺄,
    "심화중",
    (rng): Body =>
      attempt(8000, (): Body | null => {
        // 계수는 절댓값 $2$ 이상 — $\pm1$ 이면 지면에서 항이 사라져 「모으면 …」 줄과
        // 눈으로 안 맞는다(⑺ 5). $x^2$의 계수는 답의 **첫 수**라 양수로 묶는다(계약 ⑹.2).
        const nz = (): number => {
          const v = intBetween(rng, 2, 9);
          return rng() < 0.5 ? v : -v;
        };
        const a: Quad = [intBetween(rng, 2, 9), nz(), nz()];
        const b: Quad = [nz(), nz(), nz()];
        const c: Quad = [nz(), nz(), nz()];
        const wrong = subQuad(subQuad(a, b), c);
        if (wrong.some((v) => Math.abs(v) < 2)) return null;
        const gap: Quad = [2 * c[0], 2 * c[1], 2 * c[2]];

        // 지름길 — 세 다항식의 뻔한 조합이 답과 같으면 버린다.
        // 실제로 무는 것은 아래 둘뿐이고(나머지는 대수적으로 못 걸린다),
        // 그래도 다 적어 두는 까닭은 조합을 바꿀 때 빠뜨리지 않기 위해서다.
        const combos: Quad[] = [
          addQuad(wrong, b), // $C=0$ 일 때만 같다 — 구조적으로 안 걸린다
          addQuad(wrong, gap), // $B=C$ 이면 같다 ← **문다**
          addQuad(b, gap), // $A-B-C=C$ 이면 같다 ← **문다**
          addQuad(addQuad(wrong, b), gap), // $C=-C$ 일 때만 — 안 걸린다
          subQuad(wrong, b),
          subQuad(b, wrong),
          subQuad(gap, wrong),
          subQuad(gap, b),
          c,
          gap,
          wrong,
          b,
        ];
        if (combos.some((v) => sameQuad(v, a))) return null;

        // 굳힘 함수가 실제로 그 값을 내는지 — 여기서 재면 «도장»이므로 시험이 흔든다.
        const back = recoverA(wrong, b, gap);
        if (back === null || !sameQuad(back, a)) return null;

        const wrapped = (q: Quad): string => `(${poly(q[0], q[1], q[2])})`;
        const chain = (x: number, y: number, z: number): string =>
          `${x}${y < 0 ? `${y}` : `+${y}`}${z < 0 ? `${z}` : `+${z}`}`;
        return {
          content:
            `세 다항식 $A$, $B$, $C$에 대하여 $B=${poly(b[0], b[1], b[2])}$이다. ` +
            `$A-(B-C)$를 계산해야 하는데 괄호를 빠뜨리고 $A-B-C$로 계산하였더니 ` +
            `$${poly(wrong[0], wrong[1], wrong[2])}$${iGa(wrong[2])} 되었다. ` +
            `바르게 계산한 식에서 잘못 계산한 식을 뺀 결과가 $${poly(gap[0], gap[1], gap[2])}$일 때, ` +
            `다항식 $A$를 구하시오.`,
          answer: `$${poly(a[0], a[1], a[2])}$`,
          solution: [
            `바르게 계산한 식은 괄호를 풀면 $A-(B-C)=A-B+C$이고, 잘못 계산한 식은 $A-B-C$이다.`,
            `괄호를 풀 때 $-C$의 부호가 바뀌어 $+C$가 되므로, 두 식의 차는 $(A-B+C)-(A-B-C)=2C$로 $C$의 두 배이다.`,
            `그러므로 $2C=${poly(gap[0], gap[1], gap[2])}$이고, $C=\\dfrac{1}{2}\\times${wrapped(gap)}=${poly(c[0], c[1], c[2])}$이다.`,
            `잘못 계산한 식이 $A-B-C=${poly(wrong[0], wrong[1], wrong[2])}$이므로 $A=${poly(wrong[0], wrong[1], wrong[2])}+B+C$이다.`,
            `즉 $A=${wrapped(wrong)}+${wrapped(b)}+${wrapped(c)}$이다.`,
            `동류항끼리 모으면 $x^{2}$의 계수는 $${chain(wrong[0], b[0], c[0])}=${a[0]}$, $x$의 계수는 $${chain(wrong[1], b[1], c[1])}=${a[1]}$, 상수항은 $${chain(wrong[2], b[2], c[2])}=${a[2]}$이다.`,
            `따라서 $A=${poly(a[0], a[1], a[2])}$이다.`,
            `실제로 $A-B-C$를 계산하면 $${poly(wrong[0], wrong[1], wrong[2])}$${iGa(wrong[2])} 되어 잘못 계산한 식과 같다.`,
          ].join("\n"),
          facts: {
            x: a[0],
            a1: a[1],
            a0: a[2],
            b2: b[0],
            b1: b[1],
            b0: b[2],
            c2: c[0],
            c1: c[1],
            c0: c[2],
            w2: wrong[0],
            w1: wrong[1],
            w0: wrong[2],
          },
          figureSpec: null,
        };
      }),
  ),
];

/** 이 갈래가 등록하는 유형 넷 — 리드가 `generate.ts` 에 한 줄로 붙인다. */
export const M2_TOP_5G: TypeEntry[] = [
  ...REPEAT_TO_FRACTION,
  ...MIX_WINDOW_SUM,
  ...NO_TRIANGLE,
  ...BRACKET_GAP,
];
