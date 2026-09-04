/**
 * 중2 **확대 갈래 5차 물결**(`심화중`·`심화상`) — D-116, 접미사 **`X`**, 갈래 `m2Top5h`.
 *
 * ## ⑴ 왜 새 파일인가
 *
 * 4차(`m2Top4.ts`)·5차 이웃(`m2Top5a.ts`) 머리말과 같은 까닭이다 — 남의 모듈을 잠그는
 * 개수 검사를 무르지 않으려고, 그리고 오르카 다중 세션이 같은 파일에서 부딪히지
 * 않으려고 **새 파일 하나 + `generate.ts` spread 한 줄**로 붙인다. 그 한 줄은
 * **리드가** 넣는다 — 이 파일은 `generate.ts` 를 건드리지 않는다.
 *
 * 착수 전에 「이 셋을 더하면 남의 모듈 개수 검사가 빨개지는가」를 읽어서 확인했다:
 * `middleM2Rational`(`M2_RATIONAL`)·`middleM2Geo`(`M2_GEO_TRI`·`M2_GEO_QUAD`)·
 * `middleM2Mono`(`M2_MONO`)는 전부 **자기 모듈 배열**을 세지 `registeredTypes()` 를
 * 중단원으로 거르지 않는다. 등록 뒤 전량 관문이 그 사실의 참을 확인한다.
 *
 * ## ⑵ 유형마다 — 안 굳는 마디 / 무엇이 굳히나 / 같은 소단원과 무엇이 다른가
 *
 * | 키 | 갈래 | 안 굳는 마디 | 무엇이 굳히나 | 아래 갈래와 다른 축 |
 * |---|---|---|---|---|
 * | `유리수와 순환소수\|133X` | **심화상** | **어느 $c$ 인가** — $c$ 는 $18$ 이하의 자연수라는 것밖에 모르고, 계산 전에는 몇 개가 살아남는지도 모른다 | 굳지 않는다. 후보 $18$ 개를 **모두 세워** 각각 나누어떨어지는지 견주어야 하고, 살아남는 것이 하나가 아니라 **여럿**이며 그 전부가 답에 들어간다(4차 `39W`·5차 `104X` 와 같은 자리) | 색인 `16`·`20`(순환소수가 포함된 식의 계산)은 **주어진 두 순환소수를 분수로 바꿔 한 번 더하는** 정방향이고 답이 한 값이다. `25`(순환소수가 있는 방정식)는 방정식이 **하나**뿐이라 해도 하나다. `133X` 는 방정식이 $c$ 마다 **열여덟 개**이고, 「해가 자연수」라는 조건이 어느 것도 **고르지 않는다** |
 * | `여러 가지 사각형\|134X` | **심화중** | 삼각형 $ABC$ 의 넓이 — 발문은 **가장 작은 조각** 하나의 넓이만 준다 | 그 소단원의 **「높이가 같은 두 삼각형의 넓이의 비는 밑변의 길이의 비와 같다」** 하나. 그것을 **두 번** 쓰면 값이 곧바로 굳는다 — 두 번째는 밑변을 변 $BC$ 가 아니라 **선분 $AD$** 로 보는 자리다(높이는 점 $B$ 에서 직선 $AD$ 에 내린 수선) | 색인 `14`·`19` 는 비를 **한 번** 쓰는 정방향(전체를 주고 조각을 묻는다)이다. `21` 은 역방향이지만 역시 **한 번**이고 묻는 것이 길이다. 심화하 `16` 은 등적변형 + 비 한 번이며 두 번째 비가 **같은 변 위**에 있다. `134X` 는 **밑변이 놓이는 직선이 바뀌고**(변 → 대각선꼴 선분), 방향이 **작은 조각 → 전체**다 |
 * | `다항식의 계산\|135X` | **심화중** | 어떤 식 $A$ — 발문은 $A$ 를 **한 번도 보여 주지 않는다** | 그 소단원의 **다항식 ÷ 단항식** 하나. 잘못 계산한 식에서 $A$ 를 되찾고 다시 한 번 같은 나눗셈을 하면 굳는다. 굳힘의 알맹이는 「곱셈과 나눗셈을 서로 바꿔 했으므로 바르게 계산한 식은 잘못 계산한 식을 그 단항식으로 **두 번** 나눈 것(또는 두 번 곱한 것)」이다 | 색인 `55`·`56`(어떤 식 구하기)은 연산이 **한 번**이고 묻는 것이 **$A$ 자신**이다 — 되돌리면 끝난다. `04`·`05`(바르게 계산한 식)는 **덧셈·뺄셈** 판이라 되돌림이 부호 바꾸기다. `135X` 는 되돌린 뒤 **한 번 더** 같은 연산을 해야 하고, 그래서 답이 $A$ 도 발문의 식도 아니다(가장 흔한 오답이 바로 그 둘이다) |
 *
 * ## ⑶ 🔴 앞 물결들이 **실제로 새어 나간 자리** — 여기서 어떻게 막았나
 *
 * 전부 「값은 맞고 KaTeX 도 초록」이라 값 검산·냄새·조사 자가 구조적으로 못 보던 부류다.
 *
 * ㉮ **해설이 정답지 한 단을 넘었다**(3차 중1 `53V`, 1242px). → 셋 다 제품
 *    `estimateSolutionPx` 로 **800판**을 재어 잠근다(시험 「해설 높이」). 실측 최대는
 *    `133X` **300.6** · `134X` **231.5** · `135X` **164.5** px 다(한 단은 964.8px,
 *    시험이 잠그는 문턱은 700px). 그렇다고 **걸음을 지우지 않았다**(D-116 ⑹) —
 *    `133X` 는 살아남는 $c$ 마다 대입 줄을 **하나씩 다** 적고, **버리는 근거**
 *    (「나머지 $c$ 에서는 … 배수가 아니다」)도 지우지 않는다.
 * ㉯ **해설이 「자연수」 걸음을 건너뛰었다**(3차 중2 `38V`). → 정수 조건을 쓰는 것은
 *    `133X` 하나다. 그 줄은 부등식을 **한 번도 안 쓴다** — 「$90c-10r$ 이 $D$ 의
 *    배수여야 한다」는 **나누어떨어짐**이고, 그 뒤 $c$ 를 하나씩 넣어 확인한다.
 *    그래서 「$22-2x\ge1$ 에서 $x\le10$」 꼴의 **거짓 함의가 생길 자리가 없다**
 *    (시험이 「배수」라는 낱말과 「나열된 $c$ 가 전부 $1$ 이상 $18$ 이하인가」를 함께 잰다).
 * ㉰ **해설이 기약이 아닌 분수를 찍었다**(3차 중1 `52V`). → 지면의 모든
 *    `\dfrac{수}{수}` 가 기약이고 분모가 $1$ 이 아니다.
 *    - `133X` 는 $0.a\overline{b}=\dfrac{(10a+b)-a}{90}$ 를 **분자를 식의 꼴로** 적어
 *      (4차 `37W` 의 손질) 애초에 기약 판정 대상이 아니게 하고, **줄이지 않은 채로**
 *      바로 양변에 $90$ 을 곱한다. $0.\overline{r}$ 만 기약분수로 적는다.
 *    - `134X` 의 두 비례상수는 $\dfrac{s+t}{t}$ · $\dfrac{m+n}{m}$ 인데
 *      $\gcd(s+t,t)=\gcd(s,t)=1$, $\gcd(m+n,m)=\gcd(m,n)=1$ 이라 **늘 기약**이다.
 *      분모가 $1$ 이 되는 자리($t=1$·$m=1$)는 `ratioFactorTex` 가 **정수로** 적는다.
 *    - `135X` 는 분수를 한 번도 안 쓴다.
 * ㉱ **발문이 스스로 못 박은 상한을 오답이 넘었다**(4차 중2 `37W`, 51.7%).
 *    → 셋 다 「전체를 $1$ 로 놓고」류의 상한을 **선언하지 않는다**(공용
 *    `declaredUpperBound` 가 800판 전량에서 `null` — 시험이 잰다).
 *    🔴 그런데 `133X` 는 발문이 **다른 종류의 상한**을 못 박는다 — 「$c$ 는 $18$ 이하」.
 *    그 상한은 **$c$ 에 걸린 것이지 답(해의 합)에 걸린 것이 아니므로** 파생 오답이
 *    그것을 넘어도 문항이 쉬워지지 않는다. 그래도 「지면이 자기 제약을 어기지 않는가」는
 *    ㉴ 에서 따로 잰다.
 * ㉲ **정답이 «구간»이면 파생 오답이 뒤집힌다**(3차 중2 `35V`). → `133X`·`134X` 는
 *    정답이 **한 값**이다. `135X` 는 정답이 **다항식**이라 수치 파생이 안 붙고 단답형으로
 *    남는다 — 구간 답이 없으므로 그 대가를 치르지 않는다.
 * ㉳ **해설의 «말»을 지키는 시험이 없었다**(4차). → 시험이 논리 문장의 낱말을 읽는다 —
 *    `133X` 의 「배수」·「자연수」·「나머지」, `134X` 의 「높이가 같」·「밑변의 길이의 비」·
 *    「점 $B$ 에서 직선 $AD$ 에 내린 수선」, `135X` 의 「서로 바꾸어」·「두 번」.
 *    낱말을 뒤집으면 **빨개지는** 눈금을 양성·음성 둘 다 두었다.
 * ㉴ **지면이 자기가 한 줄 앞에 세운 제약을 스스로 어긴다**(4차 중3 `55W`, 100%).
 *    → `133X` 가 그 자리다. 발문이 「$c$ 는 $18$ 이하의 자연수」라고 적었으므로
 *    해설이 나열하는 $c$ 는 **전부 $1$ 이상 $18$ 이하**여야 하고, 대입 줄에 쓰인 $c$ 가
 *    나열한 것과 **글자 그대로 같아야** 한다. 시험이 800판 전량에서 그 둘을 함께 잰다.
 * ㉵ **자료를 정렬해 찍으면 «보이는 자리»가 순위를 암시한다**(4차 중1 `63W`).
 *    → 셋 다 «자료 나열»이 없다. `133X` 의 나열은 **답의 후보**이지 자료가 아니고,
 *    작은 $c$ 부터 적는 것이 곧 풀이의 차례다.
 * ㉶ **D-20 손실 원장은 «재현 가능»해야 한다**(4차 중1 `62W`). → ⑷ 에 가드마다
 *    「이 가드 **하나만** 껐을 때」를 **매개변수 전수**로 세어 적었다. 판 수와 답 수의
 *    측정점을 같은 자리(전수)로 맞췄고, 표본(씨앗) 값은 **따로** 적었다.
 * ㉷ **내보낸 순수 함수의 주석이 코드와 어긋나면 안 된다**(4차 중3 `solveBoxCases`).
 *    → 세 굳힘 함수의 단언을 시험이 **물게** 했다(⑹ 8 참조).
 * ㉸ 우리말 — 「그중」은 붙여 쓰고, 조사는 **지면에 찍히는 글자**로 정한다.
 *    수 뒤 조사는 `m2Josa.eulReul` 한 곳에서 오고, 단항식 뒤 조사는
 *    **끝 글자가 맨 문자($x$·$y$)일 때만** 쓰도록 매개변수를 좁혔다(⑺ 4).
 *
 * ## ⑷ 🔴 손실 원장 (D-20 · ㉶) — 어림하지 않고 **전수로 센 값**
 *
 * 분모(매개변수 전수)는 유형마다 다음과 같다.
 *
 * - `133X` $a\in[1,9]$, $b\in[1,9]$($a\ne b$), $r\in[1,8]$, 부호 $2$ 갈래 → **1,152**
 * - `134X` $m,n\in[1,5]$ 서로소, $s,t\in[1,5]$ 서로소, $i\ge1$ 로 만든 $S\le300$ 중
 *   중간값과 $k$ 가 자연수이고 $4\le k\le150$ 인 것 → **5,807**
 * - `135X` 는 전수가 아니라 **씨앗 표본**으로 잰다(항의 조합이 순열이라 전수의 뜻이
 *   흐리다) — 값은 아래 ⑽ 에 있다.
 *
 * ⚠️ **이 표는 물려받은 값을 그대로 옮긴 것이 아니라 다시 전수로 세어 적은 것이다.**
 * 앞 회차가 적어 둔 표는 여덟 자리가 실제와 달랐다(`134X` 전량 5,245 → **5,807** ·
 * 통과 4,759 → **4,763** · 가짓수 189 → **191**, `133X` 의 가드 껐을 때 741 → **378** ·
 * 176 → **150**, $(m,n)$ 가드 7,131 → **5,307**, 그리고 후보 수 분포가 통째로).
 * ㉶ 가 말하는 자리라 **가드 조합을 하나씩 꺼 가며 다시 셌다.**
 *
 * | 유형 | 전량 | 가드 다 켠 뒤 | 정답 가짓수 | 최빈 정답(전수) | 최빈(표본 800판) |
 * |---|---|---|---|---|---|
 * | `133X` | 1,152 | **144** (12.5%) | 48 | **6.25%** | (아래 ⑽) |
 * | `134X` | 5,807 | **4,763** (82.0%) | 191 | **2.46%** | (아래 ⑽) |
 * | `135X` | — | — | (표본에서 잰다) | — | (아래 ⑽) |
 *
 * 가드 하나만 껐을 때(전수, 다른 가드는 그대로):
 *
 * | 유형 | 가드 | 켰을 때 | 그것만 껐을 때 | 그때 가짓수·최빈 |
 * |---|---|---|---|---|
 * | `133X` | 살아남는 $c$ 가 $2$~$4$ 개 | 144 | **378** | 66 · 11.38% |
 * | `133X` | 해가 $2$ 이상 $120$ 이하 | 144 | **150** | 50 · 6.00% |
 * | `133X` | 지름길(한 번 연산) | 144 | **150** | 48 · 6.00% |
 * | `134X` | $(m,n)\ne(1,1)$ | 4,763 | **5,307** | 191 · 2.41% |
 * | `134X` | 지름길(한 번 연산) | 4,763 | **5,258** | 194 · 2.36% |
 *
 * 🔴 **`133X` 의 지름길 가드는 «우연 수준»이다 — 가드로 읽지 말 것.**
 * 치환 대조(같은 자루의 **다른 판**의 답을 그 판의 찍힌 수에 대 보기)로 재면
 * `133X` 는 제 답 **4.0%** · 우연 **4.7%** 로 **우연보다 낮고**, `134X` 는 제 답
 * **9.4%** · 우연 **4.7%** 로 **우연의 두 배**다. 그러니 `134X` 의 것만 실제로 무는
 * 가드이고, `133X` 의 것은 6판을 깎을 뿐 「지름길을 막았다」고 읽으면 안 된다.
 * 그래도 남겨 둔다 — 깎는 값이 4%뿐이고, 그 6판은 실제로 「찍힌 수 두 개를 한 번
 * 연산하면 답이 나오는」 판이기 때문이다.
 *
 * 🔴 **`133X` 의 「$2$~$4$ 개」 가드가 가장 비싸다**(378 → 144, **61.9%** 를 버린다).
 * 그 값을 치르는 까닭은 둘이다. ⑴ 살아남는 $c$ 가 **하나뿐**이면 이 유형이 재려는
 * 마디(「후보를 다 세워 견주기」)가 통째로 사라진다 — 전수 1,152 의 **후보 수 분포**는
 * $0$:587 · $1$:398 · $2$:104 · $3$:37 · $4$:15 · $5$:3 · $9$:4 · $18$:4 이고,
 * 그래서 껐을 때 남는 378 은 대부분 **후보가 하나뿐인 판**이다(최빈이 6.25% 에서
 * **11.38%** 로 뛰는 것이 그 자국이다 — 후보가 하나면 답이 그 해 하나라 겹친다).
 * ⑵ $5$ 개 이상이면 해설이 대입 줄만 다섯 줄이 되어 ㉮ 의 여유를 먹는다.
 * 잃은 것은 «정답 가짓수»가 아니라 **«후보가 하나뿐이거나 너무 많은 판»** 이다.
 *
 * ## ⑸ 번호 규약 — **`X` 접미사**
 *
 * `extensionNumberReason` 이 「숫자+영문 대문자 한 글자」를 통과시킨다. `A`(색인 밖
 * 보강)·`T`(1차)·`U`(2차)·`V`(3차)·`W`(4차)가 쓰였으므로 5차는 **`X`** 다.
 * 리드가 갈래마다 번호 구간을 나눠 주었고 이 갈래는 `133X`·`134X`·`135X` 다.
 *
 * ## ⑹ 계약 (이웃 모듈과 한 벌)
 *
 * 1. **정답을 먼저 뽑고 발문을 역산한다.**
 * 2. `facts` 로 정답 문자열을 **다시 지을 수 있다**(시험이 왕복으로 잠근다).
 *    `facts.x` 는 답의 **첫 수**(부호까지) — `133X` 는 해의 합, `134X` 는 넓이,
 *    `135X` 는 답 다항식 **첫 항의 계수**다.
 *    🔴 `135X` 의 답은 다항식이라 첫 수 하나로는 못 짓는다. 그래서 항마다
 *    `c{i}`·`x{i}`·`y{i}` 를 같이 남긴다 — 시험이 **그 값들만으로** 답 문자열을
 *    다시 지어 맞대므로 한 항이라도 빠지면 빨개진다.
 *    ⚠️ 종전에는 `facts.x` 가 **절댓값**이라 「답의 첫 수」라는 이 줄이 계수가
 *    음수인 판에서 **거짓**이었고(실측 800판 중 406판), 항 정보가 없어
 *    「다시 지을 수 있다」도 거짓이었다 — ㉷ 가 말하는 바로 그 자리라 고쳤다.
 * 3. 숫자는 전부 `$...$` 안에 (`elementary/rules` `bareNumbers`).
 * 4. `attempt` 가 다 떨어지면 **던진다** — 조용히 기본값을 내지 않는다.
 * 5. 그림이 없으므로 발문이 **지면을 가리키지 않는다**(`pointsAtFigure`).
 *    `134X` 는 기하 문항이지만 「$\overline{BC}$ 위의 점 $D$」처럼 **글자로 다 적어**
 *    그림 없이 풀린다(5차 이웃 `102X`·`104X` 와 같은 손질).
 * 6. 🔴 **해설이 걸음을 건너뛰지 않는다.** 후보를 견주는 갈래(`133X`)는
 *    **죽는 후보가 왜 죽는지**까지 적는다.
 * 7. 🔴 **낱말 뒤 조사를 손 목록으로 적지 않는다.** 손 목록을 쓰지 않는 가장 확실한
 *    길은 **그 자리를 안 만드는 것**이라, 셋 다 「수 바로 뒤에 을/를·은/는·와/과·이/가」가
 *    붙는 자리를 지면에 두지 않았다(시험이 `josaMismatches` 로 전량을 훑어 그 사실을
 *    확인한다). 단항식 뒤에는 조사가 붙지만 **끝 글자를 맨 문자($x$·$y$)로 못 박아**
 *    「로」·「를」 한 갈래뿐이게 했다(⑺ 4).
 * 8. 🔴 **굳힘 함수는 «흔들 수 있는 인자»를 하나 든다.** 생성기는 늘 참값으로 부르고,
 *    시험이 그 인자를 뒤집어 **답이 달라지는 것**을 확인한다 — 생성기 안에서 두 판을
 *    견주는 줄은 한 번도 거부하지 못하는 «도장»이 된다(2026-08-23).
 *
 * ## ⑺ 정찰과 달라진 것 — 근거를 남긴다
 *
 * 1. 🔴 **$c$ 의 창을 $18$ 로 넓힌 것은 취향이 아니라 셈이 시킨 것이다.** 같은 매개변수
 *    전수(1,152)에서 창만 $c\le9$ 로 좁혀 다시 세면 후보가 $2$ 개 이상인 판이
 *    **42** 뿐이고 가드를 다 켠 통과가 **34**, 정답 가짓수가 **18**, 최빈이 **11.76%** 다.
 *    창을 $18$ 로 넓히면 각각 **167 · 144 · 48 · 6.25%** 가 된다. 까닭은 셈에 있다 —
 *    $x=\dfrac{90c\mp10r}{D}$ 에서 $D=9a+b$ 가 $90$ 과 크게 어긋난 판이 많아, $c$ 가
 *    $9$ 개 도는 동안 분자가 $D$ 의 배수가 되는 자리가 **많아야 한 번**이다.
 *    그래서 발문이 그 창을 **글자로 못 박는다**.
 * 2. 🔴 **`133X` 를 「$0.\overline{ab}$」(두 자리 순환) 판으로도 재 봤다.**
 *    양변에 $99$ 를 곱해 $(10a+b)x\pm11r=99c$ 로 두고 같은 창·같은 가드로 세면
 *    통과가 **21** 뿐이고 정답 가짓수가 **6**, 최빈이 **33.33%** 다($0.a\overline{b}$
 *    판은 144 · 48 · 6.25%). 그래서 **안 열었다** — 모드를 둘 두면 한쪽이 표본에
 *    거의 안 잡혀 시험이 그 자리를 못 본다.
 * 3. `134X` 의 두 비를 처음에는 $m,n,s,t\in[1,5]$ 로 다 열었는데, $(m,n)=(1,1)$ 이면
 *    점 $D$ 가 $\overline{BC}$ 의 **중점**이 되어 색인 `19`(삼각형의 중선과 넓이)와
 *    발문이 겹친다. **닫았다**(다른 가드는 그대로 두고 전수 5,307 → 4,763).
 * 4. 🔴 **`135X` 의 단항식 지수를 $x^{i}y^{j}$, $(i,j)\in\{(1,0),(0,1),(1,1)\}$ 로 좁혔다.**
 *    발문이 「어떤 식을 $-2xy^{2}$ **로** 나누어야」처럼 단항식 바로 뒤에 조사를 붙이는데,
 *    지수로 끝나면 읽기가 「…와이 **제곱**」이라 받침이 생겨 「**으**로」가 옳아진다.
 *    그 판정을 손으로 적으면 목록이 두 벌이 되므로(㉸), **끝 글자가 늘 맨 문자가
 *    되도록 매개변수를 좁혀** 판정할 것 자체를 없앴다. 시험이 그 사실을 잠근다.
 * 5. `135X` 의 계수는 **절댓값 $2$ 이상**만 쓴다. $\pm1$ 이면 지면에 계수가 안 찍혀
 *    `facts.x`(답의 첫 수) 왕복이 **지수**를 물게 된다 — 값은 맞고 왕복만 어긋나는,
 *    이 저장소가 여러 번 데인 부류다.
 * 6. 🔴 **`133X` 의 발문이 묻는 것을 하나로 좁혔다.** 종전에는 「$c$를 **모두 구하고**,
 *    그때의 해를 모두 더한 값을 구하시오」였는데 정답 칸에는 **합 하나**만 있다.
 *    우리말에서 「A를 구하고 B를 구하시오」는 답이 **둘**이라는 뜻이라, 학생이
 *    답란에 $c$ 값들을 적으면 채점이 갈린다(실측 800판 **전량**이 그랬다).
 *    「…되도록 하는 **모든 $c$에 대하여**, 그때의 해를 모두 더한 값을 구하시오」로
 *    고쳐 묻는 것을 하나로 만들었다 — 후보를 다 세워 견주어야 하는 마디는 그대로다.
 *    (값 검산·냄새·조사·렌더 어느 자도 이 부류를 구조적으로 못 본다. 800판을 눈으로
 *    읽어서 나왔다.)
 *
 * ## ⑻ 🔴 변이 시험 — 자세한 것은 `middleM2Top5h.test.ts` ⑸ 에 있다
 *
 * 회차마다 **음성 대조**(변이 없이 초록)를 먼저 보고, ⑴ 파일이 바뀌었나
 * ⑵ **산출물이 바뀌었나** ⑶ 그제서야 시험이 빨개지나 를 차례로 물었다.
 *
 * ## ⑼ 이 파일이 **안 무는 줄**을 스스로 밝힌다
 *
 * - `133X` 의 지름길 가드 — ⑷ 에 적은 대로 **우연 수준**이다.
 * - `repeatingEquationSolutions` 의 `top <= 0` 은 $c\ge1$, $r\le8$ 이므로
 *   $90c-10r\ge90-80=10>0$ 이라 **한 번도 못 문다.** $\sigma=-1$ 이면 더 크다.
 *   지우지 않는 까닭은 이 함수가 **시험에서 흔들려 불리기** 때문이다 — `subtractLead`
 *   를 뒤집으면 $D$ 가 커져 후보가 사라지고, 창을 손으로 넓히면 음수가 들어온다.
 *
 * ## ⑽ 표본(씨앗) 값은 시험 파일이 잠근다
 *
 * 전수와 표본은 다른 값이다. 시험이 잠그는 것은 **표본 쪽**이고 문턱은 $12\%$ 이며,
 * 씨앗 블록 넷($20260905$·$900000$·$123456$·$5550000$)에서 각각 잰다.
 * 실측값은 시험 파일 머리말에 적었다.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { attempt } from "./m1Shared";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";

/** RPM 색인 정본(`scripts/rpm/rpm-type-catalog.json`)의 중단원 이름 — 글자 그대로. */
const MINOR_REPEAT = "유리수와 순환소수";
const MINOR_QUAD = "여러 가지 사각형";
const MINOR_POLY = "다항식의 계산";

/**
 * 우리 `Unit.section` 정확한 이름 (`prisma/seed-data/units.ts` 실측).
 * 눈으로 못 가르는 공백·괄호가 있을 수 있으므로 시험이 단원 정본과 **대조**한다.
 */
const SEC = {
  순환식: "순환소수를 포함한 식의 계산",
  평삼넓이: "평행선과 삼각형의 넓이",
  다항곱나눗: "다항식의 곱셈과 나눗셈",
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

/**
 * 기약분수의 KaTeX — 분모가 $1$ 이면 **정수로** 적는다(㉰).
 *
 * `\dfrac{4}{1}` 은 값은 맞고 지면만 흉한 자리라 값 검산이 구조적으로 못 본다.
 */
export function ratioFactorTex(num: number, den: number): string {
  const g = gcd(num, den) || 1;
  const n = num / g;
  const d = den / g;
  return d === 1 ? `${n}` : `\\dfrac{${n}}{${d}}`;
}

/**
 * 찍힌 수 두 개로 **한 번** 연산해 나오는 값 전부 — 지름길 자.
 *
 * ⚠️ **두 번까지 넓히면 이 자는 뜻을 잃는다.** 실측(`133X` 매개변수 전수)으로
 *    두 번 판은 제 답 46.2% · 치환 대조 48.8% 로 **우연과 구별되지 않는다**.
 *    한 번 판은 `134X` 에서 제 답 9.3% · 우연 5.3% 로 갈리고, `133X` 에서는
 *    4.0% · 4.7% 로 안 갈린다 — 그 사실을 머리말 ⑷ 에 적어 두었다.
 */
export function oneOpValues(printed: readonly number[]): Set<number> {
  const out = new Set<number>();
  for (const a of printed)
    for (const b of printed) {
      out.add(a + b);
      out.add(a - b);
      out.add(a * b);
      if (b !== 0) out.add(a / b);
    }
  return out;
}

// ═══════════════════════════════════════════════════════════
// 133X  순환소수가 든 방정식의 해가 자연수가 되는 c 를 모두 찾기  (심화상)
// ═══════════════════════════════════════════════════════════

/** 발문이 못 박는 $c$ 의 창 — 지면에도 이 값이 그대로 찍힌다. */
export const REPEAT_C_MAX = 18;

/**
 * **굳힘 함수** — 방정식 $0.a\overline{b}\,x+\sigma\,0.\overline{r}=c$ 의 해가
 * 자연수가 되는 $c$ 를 **$1$ 부터 `cmax` 까지 전부** 훑어 모은다.
 *
 * 양변에 $90$ 을 곱하면 $Dx+\sigma\cdot10r=90c$ 이므로 $x=\dfrac{90c-\sigma\cdot10r}{D}$
 * 이고, 여기서 $D=(10a+b)-a$ 는 혼합순환소수를 분수로 고칠 때의 **분자**다.
 *
 * 🔴 **굳힘의 인자는 `subtractLead` 다.** 혼합순환소수 $0.a\overline{b}$ 를 분수로
 * 고칠 때 앞자리 $a$ 를 **빼지 않으면**($D=10a+b$) 그것은 두 자리 순환소수
 * $0.\overline{ab}$ 를 $90$ 으로 나눈 꼴이 되어 값이 통째로 달라진다 — 이 유형이
 * 재려는 바로 그 마디이고, 학생이 가장 흔히 틀리는 자리다.
 *
 * ⚠️ `subtractLead=false` 는 제품이 안 쓰는 길이다(생성기는 늘 `true`). 그런데도
 *    인자로 두는 까닭은 시험이 그 마디를 **흔들어 잴 수 있게** 하기 위해서다.
 *
 * 범위를 벗어난 자릿수($a$·$b$ 가 한 자리 자연수가 아니거나 $a=b$ 라 혼합이 아닌 것,
 * $r$ 이 $1$~$8$ 밖인 것)는 `null` 을 낸다. $r=9$ 는 $0.\overline{9}=1$ 이라 순환소수가
 * 아니므로 여기서 막는다.
 */
export function repeatingEquationSolutions(
  a: number,
  b: number,
  r: number,
  sign: 1 | -1,
  cmax: number,
  subtractLead = true,
): { cs: number[]; xs: number[] } | null {
  if (!Number.isInteger(a) || a < 1 || a > 9) return null;
  if (!Number.isInteger(b) || b < 1 || b > 9) return null;
  if (a === b) return null; // $0.a\overline{a}$ 는 그냥 $0.\overline{a}$ 다
  if (!Number.isInteger(r) || r < 1 || r > 8) return null;
  if (!Number.isInteger(cmax) || cmax < 1) return null;
  const D = subtractLead ? 10 * a + b - a : 10 * a + b;
  if (D <= 0) return null;
  const cs: number[] = [];
  const xs: number[] = [];
  for (let c = 1; c <= cmax; c += 1) {
    const top = 90 * c - sign * 10 * r;
    // ⚠️ 이 줄은 제품이 쓰는 범위에서 **한 번도 못 문다**(머리말 ⑼).
    if (top <= 0) continue;
    if (top % D !== 0) continue;
    cs.push(c);
    xs.push(top / D);
  }
  return { cs, xs };
}

const REPEATING_EQUATION: TypeEntry[] = [
  def(
    "2-1",
    MINOR_REPEAT,
    "133X",
    "순환소수가 든 방정식의 해가 자연수가 되는 상수 모두 구하기",
    SEC.순환식,
    "심화상",
    (rng): Body =>
      attempt(6000, (): Body | null => {
        const a = intBetween(rng, 1, 9);
        const b = intBetween(rng, 1, 9);
        if (a === b) return null;
        const r = intBetween(rng, 1, 8);
        const sign = pick(rng, [1, -1] as const);
        const found = repeatingEquationSolutions(a, b, r, sign, REPEAT_C_MAX);
        if (found === null) return null;
        const { cs, xs } = found;
        // 🔴 가장 비싼 가드(⑷) — 후보가 하나뿐이면 「다 세워 견주기」가 사라지고,
        //    다섯 이상이면 해설의 대입 줄이 다섯 줄이 되어 ㉮ 의 여유를 먹는다.
        if (cs.length < 2 || cs.length > 4) return null;
        const lo = Math.min(...xs);
        const hi = Math.max(...xs);
        if (lo < 2 || hi > 120) return null;
        const sum = xs.reduce((p, q) => p + q, 0);
        // ㉵ 지름길 — **우연 수준이다**(⑷). 그래도 「찍힌 수 두 개를 한 번 연산해
        //    답이 나오는」 판은 뺀다.
        if (oneOpValues([a, b, r, REPEAT_C_MAX]).has(sum)) return null;

        const D = 10 * a + b - a;
        const rn = r / (gcd(r, 9) || 1);
        const rd = 9 / (gcd(r, 9) || 1);
        const constTerm = 10 * r;
        // 방정식은 `+` 면 $\sigma=1$ — 양변에 $90$ 을 곱하면 상수항이 왼쪽에 `+` 로 온다.
        const eqSign = sign === 1 ? "+" : "-";
        // 그러면 $x$ 의 분자에서는 부호가 뒤집힌다.
        const numSign = sign === 1 ? "-" : "+";
        const coefTex = `0.${a}\\overline{${b}}`;
        const constTex = `0.\\overline{${r}}`;

        const perC = cs.map(
          (c, i) =>
            `$c=${c}$일 때 $x=\\dfrac{90\\times${c}${numSign}${constTerm}}{${D}}=${xs[i]}$이다.`,
        );

        return {
          content:
            `$c$는 $${REPEAT_C_MAX}$ 이하의 자연수이다. ` +
            `$x$에 대한 방정식 $${coefTex}x${eqSign}${constTex}=c$의 해가 ` +
            `자연수가 되도록 하는 모든 $c$에 대하여, ` +
            `그때의 해를 모두 더한 값을 구하시오.`,
          answer: `$${sum}$`,
          solution: [
            `$${coefTex}=\\dfrac{${10 * a + b}-${a}}{90}$이고 ` +
              `$${constTex}=\\dfrac{${rn}}{${rd}}$이므로, ` +
              `방정식의 양변에 $90$을 곱하면 $${D}x${eqSign}${constTerm}=90c$이다.`,
            `그러므로 $x=\\dfrac{90c${numSign}${constTerm}}{${D}}$이고, ` +
              `$x$가 자연수이려면 $90c${numSign}${constTerm}$이 $${D}$의 배수여야 한다.`,
            `$c$에 $1$부터 $${REPEAT_C_MAX}$까지 차례로 넣어 보면 ` +
              `그런 $c$는 $${cs.join("$, $")}$뿐이고, ` +
              `나머지 $c$에서는 $90c${numSign}${constTerm}$이 $${D}$의 배수가 아니어서 ` +
              `해가 자연수가 아니다.`,
            ...perC,
            `따라서 구하는 합은 $${xs.join("+")}=${sum}$이다.`,
          ].join("\n"),
          facts: {
            x: sum,
            a,
            b,
            r,
            plus: sign === 1 ? 1 : 0,
            cmax: REPEAT_C_MAX,
            den: D,
            count: cs.length,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 134X  중선 위의 점이 만든 작은 삼각형에서 전체 넓이 되찾기  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * **굳힘 함수** — 「높이가 같은 두 삼각형의 넓이의 비는 밑변의 길이의 비와 같다」를
 * **두 번** 써서 $\triangle EBD$ 의 넓이 $k$ 에서 $\triangle ABC$ 의 넓이를 낸다.
 *
 * 첫 번째는 밑변이 $\overline{BC}$ 위에 있다 —
 * $\triangle ABD:\triangle ABC=\overline{BD}:\overline{BC}=m:(m+n)$.
 * 두 번째는 밑변이 **선분 $\overline{AD}$ 위**에 있다 — 점 $B$ 에서 직선 $AD$ 에
 * 내린 수선이 두 삼각형의 공통 높이이므로
 * $\triangle EBD:\triangle ABD=\overline{ED}:\overline{AD}=t:(s+t)$.
 *
 * 🔴 **굳힘의 인자는 `wholeCevian` 이다.** 두 번째 비의 분모를 $\overline{AD}$ 가
 * 아니라 $\overline{AE}$ 로 읽으면($t:s$) 값이 달라진다 — 「$\overline{AE}:\overline{ED}$
 * 가 주어졌으니 넓이의 비도 그것」이라고 읽는, 학생이 가장 흔히 하는 실수이고
 * 이 유형이 재려는 바로 그 마디다.
 *
 * ⚠️ `wholeCevian=false` 는 제품이 안 쓰는 길이다(생성기는 늘 `true`).
 *
 * 중간값 $\triangle ABD$ 나 답이 자연수가 아니면 `null` — 그 밖의 조건은 여기서 안 본다.
 */
export function triangleWholeArea(
  m: number,
  n: number,
  s: number,
  t: number,
  k: number,
  wholeCevian = true,
): number | null {
  for (const v of [m, n, s, t, k]) {
    if (!Number.isInteger(v) || v < 1) return null;
  }
  const cevianDen = wholeCevian ? s + t : s;
  const abd = (k * cevianDen) / t;
  if (!Number.isInteger(abd)) return null;
  const whole = (abd * (m + n)) / m;
  if (!Number.isInteger(whole)) return null;
  return whole;
}

const CEVIAN_AREA: TypeEntry[] = [
  def(
    "2-2",
    MINOR_QUAD,
    "134X",
    "밑변과 중선 위의 점이 만든 삼각형에서 전체 넓이 구하기",
    SEC.평삼넓이,
    "심화중",
    (rng): Body =>
      attempt(6000, (): Body | null => {
        const m = intBetween(rng, 1, 5);
        const n = intBetween(rng, 1, 5);
        if (gcd(m, n) !== 1) return null;
        // 🔴 $(1,1)$ 이면 점 $D$ 가 중점이라 색인 `19` 와 발문이 겹친다(⑺ 3).
        if (m === 1 && n === 1) return null;
        const s = intBetween(rng, 1, 5);
        const t = intBetween(rng, 1, 5);
        if (gcd(s, t) !== 1) return null;

        // $S=(m+n)(s+t)i/g$ 꼴만 중간값·답이 모두 자연수다 ($g=\gcd(m,s+t)$).
        const g = gcd(m, s + t) || 1;
        const unit = ((m + n) * (s + t)) / g;
        const iMax = Math.floor(300 / unit);
        if (iMax < 1) return null;
        const i = intBetween(rng, 1, iMax);
        const whole = unit * i;
        const abd = (whole * m) / (m + n);
        const k = (abd * t) / (s + t);
        if (!Number.isInteger(abd) || !Number.isInteger(k)) return null;
        if (k < 4 || k > 150) return null;

        // 굳힘 함수가 같은 값을 내는지 여기서 한 번 더 묻지 않는다 — 그것은 «도장»이다.
        // 시험이 **다른 길로** 다시 재고, 흔든 판과 갈리는지도 시험이 본다(⑹ 8).

        // ㉵ 지름길 — 이 유형에서는 **우연보다 높다**(제 답 9.3% · 우연 5.3%, ⑷).
        if (oneOpValues([m, n, s, t, k]).has(whole)) return null;

        const abdFactor = ratioFactorTex(s + t, t);
        const wholeFactor = ratioFactorTex(m + n, m);

        return {
          content:
            `삼각형 $ABC$에서 $\\overline{BC}$ 위의 점 $D$에 대하여 ` +
            `$\\overline{BD}:\\overline{DC}=${m}:${n}$이고, ` +
            `$\\overline{AD}$ 위의 점 $E$에 대하여 ` +
            `$\\overline{AE}:\\overline{ED}=${s}:${t}$이다. ` +
            `삼각형 $EBD$의 넓이가 $${k}\\,\\mathrm{cm}^2$일 때, ` +
            `삼각형 $ABC$의 넓이를 구하시오.`,
          answer: `$${whole}\\,\\mathrm{cm}^2$`,
          solution: [
            `삼각형 $EBD$와 삼각형 $ABD$는 밑변을 각각 $\\overline{ED}$, $\\overline{AD}$로 ` +
              `보면 점 $B$에서 직선 $AD$에 내린 수선을 공통으로 하여 높이가 같다.`,
            `높이가 같은 두 삼각형의 넓이의 비는 밑변의 길이의 비와 같으므로 ` +
              `$\\overline{ED}:\\overline{AD}=${t}:${s + t}$에서 ` +
              `삼각형 $ABD$의 넓이는 $${k}\\times${abdFactor}=${abd}\\,(\\mathrm{cm}^2)$이다.`,
            `삼각형 $ABD$와 삼각형 $ABC$도 밑변을 각각 $\\overline{BD}$, $\\overline{BC}$로 ` +
              `보면 점 $A$에서 직선 $BC$에 내린 수선을 공통으로 하여 높이가 같고, ` +
              `$\\overline{BD}:\\overline{BC}=${m}:${m + n}$이다.`,
            `따라서 삼각형 $ABC$의 넓이는 ` +
              `$${abd}\\times${wholeFactor}=${whole}\\,(\\mathrm{cm}^2)$이다.`,
          ].join("\n"),
          facts: {
            x: whole,
            m,
            n,
            s,
            t,
            k,
            abd,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 135X  곱셈과 나눗셈을 서로 바꿔 계산한 뒤 바르게 계산한 식  (심화중)
// ═══════════════════════════════════════════════════════════

/** 단항식 한 항 — 계수와 $x$·$y$ 의 지수. */
export type Mono = { c: number; x: number; y: number };

/**
 * 한 항의 KaTeX 몸통. `leading` 이면 양수 앞의 `+` 를 생략한다.
 *
 * 계수 $\pm1$ 은 문자가 있을 때 숫자를 안 적고, 지수 $1$ 은 `^{1}` 을 안 적는다 —
 * 둘 다 「값은 맞고 지면만 흉한」 부류라 값 검산이 구조적으로 못 본다.
 */
export function monoTex(t: Mono, leading: boolean): string {
  const sign = t.c < 0 ? "-" : leading ? "" : "+";
  const abs = Math.abs(t.c);
  const xs = t.x === 0 ? "" : t.x === 1 ? "x" : `x^{${t.x}}`;
  const ys = t.y === 0 ? "" : t.y === 1 ? "y" : `y^{${t.y}}`;
  const vars = `${xs}${ys}`;
  const num = abs === 1 && vars !== "" ? "" : `${abs}`;
  return `${sign}${num}${vars}`;
}

/** 다항식의 KaTeX 몸통 — `$` 는 밖에서 감싼다. */
export function polyTex(terms: readonly Mono[]): string {
  if (terms.length === 0) return "0";
  return terms.map((t, i) => monoTex(t, i === 0)).join("");
}

/** 다항식 $\times$ 단항식. */
export function mulByMono(terms: readonly Mono[], mono: Mono): Mono[] {
  return terms.map((t) => ({
    c: t.c * mono.c,
    x: t.x + mono.x,
    y: t.y + mono.y,
  }));
}

/** 다항식 $\div$ 단항식 — 다항식이 안 되면 `null`. */
export function divByMono(terms: readonly Mono[], mono: Mono): Mono[] | null {
  if (mono.c === 0) return null;
  const out: Mono[] = [];
  for (const t of terms) {
    if (t.c % mono.c !== 0) return null;
    if (t.x < mono.x || t.y < mono.y) return null;
    out.push({ c: t.c / mono.c, x: t.x - mono.x, y: t.y - mono.y });
  }
  return out;
}

/**
 * **굳힘 함수** — 곱셈과 나눗셈을 서로 바꿔 계산했을 때 **바르게 계산한 식**.
 *
 * `mode` 가 `0` 이면 「나누어야 할 것을 곱했다」이므로 잘못 계산한 식을 그 단항식으로
 * **두 번 나눈다**. `1` 이면 「곱해야 할 것을 나누었다」이므로 **두 번 곱한다**.
 *
 * 🔴 **굳힘의 인자는 `twice` 다.** 한 번만 되돌리면 그것은 «어떤 식 $A$» 이지
 * «바르게 계산한 식» 이 아니다 — 학생이 가장 흔히 멈추는 자리이고 이 유형이 재려는
 * 바로 그 마디다. (`twice=false` 는 제품이 안 쓰는 길이다.)
 *
 * 나눗셈이 다항식을 안 내면 `null`.
 */
export function correctedExpression(
  wrong: readonly Mono[],
  mono: Mono,
  mode: 0 | 1,
  twice = true,
): Mono[] | null {
  let out: Mono[] = [...wrong];
  const rounds = twice ? 2 : 1;
  for (let i = 0; i < rounds; i += 1) {
    const next = mode === 0 ? divByMono(out, mono) : mulByMono(out, mono);
    if (next === null) return null;
    out = next;
  }
  return out;
}

/** 항의 자리 — 차수가 높은 것부터, 같으면 $x$ 의 지수가 큰 것부터. */
function sortTerms(terms: readonly Mono[]): Mono[] {
  return [...terms].sort(
    (p, q) => q.x + q.y - (p.x + p.y) || q.x - p.x || q.y - p.y,
  );
}

/**
 * 🔴 단항식의 지수는 **끝 글자가 늘 맨 문자**가 되게 좁혔다(⑺ 4) —
 * 지수로 끝나면 「…와이 제곱**으**로」가 옳아져 조사 목록이 두 벌이 된다.
 */
const MONO_POWERS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
];

/** 밑 다항식의 항이 놓일 수 있는 자리. */
const TERM_POWERS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 2, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 2 },
  { x: 2, y: 1 },
  { x: 1, y: 2 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: 0 },
];

const MISTAKEN_ORDER: TypeEntry[] = [
  def(
    "2-1",
    MINOR_POLY,
    "135X",
    "곱셈과 나눗셈을 바꿔 계산했을 때 바르게 계산한 식 구하기",
    SEC.다항곱나눗,
    "심화중",
    (rng): Body =>
      attempt(6000, (): Body | null => {
        const mode = pick(rng, [0, 1] as const);
        const power = pick(rng, MONO_POWERS);
        const monoAbs = intBetween(rng, 2, 3);
        const monoSign = pick(rng, [1, -1] as const);
        const mono: Mono = {
          c: monoAbs * monoSign,
          x: power.x,
          y: power.y,
        };

        const termCount = intBetween(rng, 2, 3);
        const slots: { x: number; y: number }[] = [];
        for (let i = 0; i < termCount; i += 1) {
          const cand = pick(rng, TERM_POWERS);
          if (slots.some((z) => z.x === cand.x && z.y === cand.y)) return null;
          slots.push(cand);
        }
        // 🔴 계수는 절댓값 $2$ 이상만 — $\pm1$ 이면 지면에 계수가 안 찍혀
        //    `facts.x`(답의 첫 수) 왕복이 **지수**를 물게 된다(⑺ 5).
        const base = sortTerms(
          slots.map((z) => ({
            c: intBetween(rng, 2, 9) * pick(rng, [1, -1] as const),
            x: z.x,
            y: z.y,
          })),
        );

        // 잘못 계산한 식(발문에 찍히는 것)과 바르게 계산한 식(답).
        //  mode 0 — 나눠야 하는데 곱했다: 발문 $=B\times M^2$, 답 $=B$
        //  mode 1 — 곱해야 하는데 나눴다: 발문 $=B$,           답 $=B\times M^2$
        const wrong =
          mode === 0 ? mulByMono(mulByMono(base, mono), mono) : base;
        const right = correctedExpression(wrong, mono, mode);
        if (right === null) return null;
        // 어떤 식 $A$ — 두 모드에서 모두 $B\times M$ 이다.
        const middle =
          mode === 0 ? divByMono(wrong, mono) : mulByMono(wrong, mono);
        if (middle === null) return null;

        const sortedWrong = sortTerms(wrong);
        const sortedRight = sortTerms(right);
        const sortedMiddle = sortTerms(middle);
        // 발문·답·중간값이 서로 달라야 한다 — 같으면 되돌림이 뜻을 잃는다.
        const wrongTex = polyTex(sortedWrong);
        const rightTex = polyTex(sortedRight);
        const middleTex = polyTex(sortedMiddle);
        if (rightTex === wrongTex || rightTex === middleTex) return null;
        // 지면이 너무 길어지지 않게 — 항이 셋이고 지수가 크면 한 줄을 넘는다.
        if (wrongTex.length > 46 || rightTex.length > 46) return null;

        const monoTexBody = monoTex(mono, true);
        const lead = sortedRight[0]!;
        // 🔴 `facts` 로 정답 문자열을 **다시 지을 수 있어야** 한다(⑹ 2). 답이 다항식인
        //    이 유형은 첫 항의 계수 하나로는 못 짓는다 — 항마다 계수와 두 지수를 남긴다.
        //    시험이 이 값들만으로 답을 다시 지어 맞대므로, 한 항이라도 빠지면 빨개진다.
        const facts: Record<string, number> = {
          // 답의 **첫 수**(부호까지). 계수 절댓값을 $2$ 이상으로 좁힌 까닭이 이것이다
          // (⑺ 5) — $\pm1$ 이면 지면에 계수가 안 찍혀 첫 수가 **지수**가 된다.
          x: lead.c,
          mode,
          monoC: mono.c,
          monoX: mono.x,
          monoY: mono.y,
          terms: sortedRight.length,
        };
        sortedRight.forEach((t, i) => {
          facts[`c${i}`] = t.c;
          facts[`x${i}`] = t.x;
          facts[`y${i}`] = t.y;
        });
        const verb =
          mode === 0
            ? `어떤 식을 $${monoTexBody}$로 나누어야 할 것을 잘못하여 곱하였더니`
            : `어떤 식에 $${monoTexBody}$를 곱해야 할 것을 잘못하여 나누었더니`;
        const backOp = mode === 0 ? "\\div" : "\\times";
        const rightOp = mode === 0 ? "\\div" : "\\times";
        const backWord = mode === 0 ? "나눈" : "곱한";

        return {
          content:
            `${verb} 다음과 같은 식이 되었다. 바르게 계산한 식을 구하시오.\n` +
            `$${wrongTex}$`,
          answer: `$${rightTex}$`,
          solution: [
            `어떤 식을 $A$라 하면 잘못 계산한 식이 ` +
              `$A${mode === 0 ? "\\times" : "\\div"}\\left(${monoTexBody}\\right)$이므로, ` +
              `$A=\\left(${wrongTex}\\right)${backOp}\\left(${monoTexBody}\\right)=${middleTex}$이다.`,
            `바르게 계산한 식은 $A${rightOp}\\left(${monoTexBody}\\right)$이므로 ` +
              `$\\left(${middleTex}\\right)${rightOp}\\left(${monoTexBody}\\right)=${rightTex}$이다.`,
            `곱셈과 나눗셈을 서로 바꾸어 계산했으므로, 바르게 계산한 식은 ` +
              `잘못 계산한 식을 $${monoTexBody}$로 두 번 ${backWord} 것과 같다.`,
          ].join("\n"),
          facts,
          figureSpec: null,
        };
      }),
  ),
];

export const M2_TOP_5H: TypeEntry[] = [
  ...REPEATING_EQUATION,
  ...CEVIAN_AREA,
  ...MISTAKEN_ORDER,
];
