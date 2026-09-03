/**
 * 중2 **확대 갈래 5차 물결**(`심화중`·`심화상`) — D-116, 접미사 **`X`**, 갈래 `m2Top5e`.
 *
 * ## ⑴ 왜 새 파일인가
 *
 * 4차(`m2Top4.ts`)·5차 앞선 갈래(`m2Top5c.ts`) 머리말과 같은 까닭이다 — 남의 모듈을
 * 잠그는 개수 검사를 무르지 않으려고, 그리고 오르카 다중 세션(이번 물결은 **21갈래가
 * 동시에** 돈다)이 같은 파일에서 부딪히지 않으려고 **새 파일 하나 + `generate.ts`
 * spread 한 줄**로 붙인다. 그 한 줄은 **리드가** 넣는다 — 이 파일은 `generate.ts` 를
 * 건드리지 않는다.
 *
 * ## ⑴-1 🔴 브리프의 소단원 이름 넷 가운데 **둘이 우리 `Unit.section` 에 없다**
 *
 * 이 갈래에 온 브리프는 소단원을 「삼각형의 내심 · **유한소수와 순환소수** ·
 * 일차함수와 일차방정식 · **평행선과 선분의 길이의 비**」로 적었다. 그런데
 * `prisma/seed-data/units.ts` 를 훑으면 굵게 적은 **둘은 어느 학년에도 없는 이름**이다
 * (중2 소단원 58개 전량 대조). `unitSection` 은 적재의 단원 매칭 키이므로 없는 이름을
 * 쓰면 그 유형은 **어느 단원에도 안 붙는다** — 브리프 자신이 「`Unit.section` 과 정확히
 * 같아야 한다」고 못 박은 조건을 브리프의 목록이 어긴다.
 *
 * 그래서 **리드 자신의 배분표**를 따랐다(`.tmp-lead/w5-args.json` 과
 * `.tmp-lead/w5-args-left.json` 이 **둘 다 같은 값**이고, 그 표의 전 갈래 소단원이
 * **하나도 빠짐없이 실재하는 `Unit.section`** 이다 — 대조 결과 무효 0건).
 * 그 표에서 이 갈래(`m2Top5e`)의 몫은 아래 넷이고, **모듈 경로·시험 경로·유형 번호
 * (`117X`~`120X`)·변형 폭(6·12·12·12) 이 브리프와 글자까지 같다.**
 *
 *   삼각형의 닮음 조건(6) · 일차부등식의 응용(12) · 일차함수의 식 구하기(12) ·
 *   평행사변형이 되는 조건(12)
 *
 * ⚠️ 브리프의 유효한 두 이름(「삼각형의 내심」·「일차함수와 일차방정식」)과 「평행선
 * 사이의 선분의 길이의 비」는 그 표에서 **갈래 `m2Top5i` 의 몫**이다. 이 갈래가 그것을
 * 집으면 동시에 도는 `m2Top5i` 와 **같은 소단원을 두 번 채우고** 이 갈래에 배정된 넷은
 * 통째로 빈 채 남는다 — 「이 물결로 중등 전 소단원이 확대 갈래를 갖는다」는 목표가
 * 그만큼 깨진다. **리드는 이 판단을 반드시 확인할 것.**
 *
 * ## ⑵ 유형마다 — 안 굳는 마디 / 무엇이 굳히나 / 같은 소단원과 무엇이 다른가
 *
 * | 키 | 갈래 | 안 굳는 마디 | 무엇이 굳히나 | 아래 갈래와 다른 축 |
 * |---|---|---|---|---|
 * | `도형의 닮음\|117X` | **심화중** | 「어느 두 삼각형이 닮음인가」 — 발문은 네 길이만 주고 각의 크기도 평행도 한 마디 안 준다. 닮은 짝을 **스스로 세워야** 한다 | 이 소단원의 개념 **SAS 닮음 조건** 하나. $\angle A$ 가 공통이고 $\overline{AB}^{2}=\overline{AD}\times\overline{AC}$ 이면 끼인 두 변의 비가 같아 $\triangle ABD\sim\triangle ACB$ 가 **하나로 굳는다.** 그러면 대응변이 정해져 길이가 나온다 | 응용 `10`·`11` 은 **닮음이 이미 성립한 두 삼각형**을 주고 비만 세운다. `12`·`13` 은 직각이 **발문에 적혀** 있어 닮음 짝이 거저 정해진다. 심화하 `15`(접은 도형)는 접는 선이 대응을 알려 준다. `117X` 는 **직각도 평행도 없이 곱셈 관계 하나로** 짝을 찾아야 하고, 그 짝의 **대응 순서**($B\to C$, $D\to B$)를 뒤집으면 답이 달라진다 |
 * | `일차부등식\|118X` | **심화상** | 계수 $a$ — **굳지 않는다.** 부호가 셋으로 갈리고, 자연수 쪽에서도 살아남는 값이 **여럿**이며 그 전부가 답에 들어간다 | 굳지 않는다. $a\le0$ 인 두 경우를 **각각 따져 버리고**, 남은 자연수에 대해 「$\dfrac{b}{a}$ 를 넘지 않는 가장 큰 자연수」를 **하나씩 세어 견주어야** 한다. 어느 $a$ 가 살아남는지는 나눗셈을 실제로 해 보기 전에는 안 정해진다 | 심화하 `14`·`74` 는 상수가 **덧셈 자리**에 있어 부등호 방향이 안 바뀌고 답이 **한쪽 끝 값**(최솟값)이다. 응용 `10` 은 「계수가 문자」이지만 **해의 꼴**을 묻고 끝난다. `118X` 는 상수가 **계수 자리**라 부호 갈래가 셋이고, 답이 «끝 값»이 아니라 **살아남은 후보들의 합**이다 |
 * | `일차함수와 그 그래프  ⑵\|119X` | **심화상** | 「어느 두 점으로 식을 세울 것인가」 — 발문이 **안 준다.** 네 점 가운데 셋이 한 직선 위에 있다는 것만 알 뿐 어느 셋인지는 모른다 | 굳지 않는다. 기준 점에서 나머지 세 점으로 가는 기울기를 **다 구해 견주어야** 하고, 기준 점이 하필 직선 밖이면 **그 사실을 확인한 뒤 다시** 남은 셋을 견주어야 한다. 성질 하나가 후보를 골라 주지 않는다 | 기본 `05`·응용 `06`·`07`·`08` 은 **어느 점·어느 기울기로 세울지가 발문에 다 적혀** 있다. 응용 `73`(평행하고 한 점)도 직선이 하나로 주어진다. 심화하 `74` 는 두 점이 지정된 정방향이다. `119X` 는 식을 세우기 **전에** 「어느 셋이 한 직선 위인가」를 가려내는 걸음이 통째로 하나 더 있고, 거기서 **버려지는 점**이 그 다음 걸음의 주인공이 된다 |
 * | `평행사변형\|120X` | **심화중** | 「$\square AECF$ 의 어느 변끼리 길이가 같은가」 — 발문은 네 선분의 길이를 문자로 줄 뿐 **같다는 말을 한 번도 하지 않는다.** 무엇과 무엇을 같다고 놓을지가 안 굳는다 | 이 소단원의 조건 **「두 대각선이 서로 다른 것을 이등분하면 평행사변형이다」** 하나. $\overline{OA}=\overline{OC}$ 와 $\overline{OE}=\overline{OF}$ 를 보이면 $\square AECF$ 가 평행사변형으로 **굳고**, 그제서야 「대변끼리 같다」가 서서 방정식이 선다 | 기본 `16A`·응용 `18A` 는 **평행사변형이라고 발문이 말해 준** 뒤 대각선 길이를 묻는다. 응용 `17A`·심화하 `19A` 는 **어느 한 쌍**을 지목해 준다. 심화하 `13` 도 조건이 주어진다. `120X` 는 **평행사변형임을 스스로 세워야** 하고, 세우는 근거가 «주어진 길이»가 아니라 **바깥 평행사변형의 성질에서 끌어온 두 등식**이다 |
 *
 * ## ⑶ 🔴 앞 물결들이 **실제로 새어 나간 자리** — 여기서 어떻게 막았나
 *
 * 전부 「값은 맞고 KaTeX 도 초록」이라 값 검산·냄새 자가 구조적으로 못 보던 부류다.
 *
 * ㉮ **해설이 정답지 한 단을 넘었다**(3차 중1 `53V`, 1242px · 판의 53%). → 넷 다 제품
 *    `estimateSolutionPx` 로 **800판**을 재어 **700px 아래**로 잠근다(시험 「해설 높이」).
 *    그렇다고 **걸음을 지우지 않는다**(D-116 ⑹) — `118X` 의 나열 줄은 살아남는 후보를
 *    **최대 넷**으로 묶고(`WINNER_MAX`) 위·아래 이웃을 **하나씩만** 붙여 길이를 잡았다.
 *    `119X` 의 기울기 나열은 기준 점이 직선 밖일 때만 다섯 개가 된다.
 * ㉯ **해설이 「자연수」 걸음을 건너뛰었다**(3차 중2 `38V`, 59.2%). → `118X` 는 정수
 *    경계로 **뛰지 않는다** — 「$\dfrac{b}{a}$ 를 넘지 않는 가장 큰 자연수」라는 말을
 *    적고, 그 값을 $a$ 마다 **실제로 세어** 늘어놓는다.
 *    ⚠️ 공용 훑개(`probe-middle-extending-tiers.boundStepFaults`)는 `$cx\le R$이다.`
 *    꼴을 찾는데 우리 부등식은 계수가 **문자**($ax\le b$)라 그 자에 **안 걸린다** —
 *    그 자에게 이 갈래의 「정수 경계 걸음 0」은 «깨끗»이 아니라 **«잴 것이 없다»** 다.
 *    그래서 **문자 계수 판을 이 물결의 시험이 따로 들고 있다**(`countStepFault`).
 *    남의 파일을 안 고치는 대신 여기 적어 둔다.
 * ㉰ **해설이 기약이 아닌 분수를 찍었다**(3차 중1 `52V`, 17.5%). → 지면의 모든
 *    `\dfrac{수}{수}` 가 기약이고 분모가 $1$ 이 아니다. `117X` 의 계산 줄은 분자를
 *    **`\dfrac{3\times14}{4}` 처럼 곱의 꼴**로 적어 「약분 전 값」이 애초에 기약 판정
 *    대상이 아니게 했고(그 닮음비는 이미 기약이며 $\overline{AB}<\overline{AC}$ 라
 *    분모가 반드시 $2$ 이상이다), 그 다음 칸에 **기약분수**를 적는다. `119X` 의
 *    기울기도 **`\dfrac{-1-7}{1-(-3)}` 처럼 뺄셈의 꼴**로 적고 결과만 기약으로 적는다.
 *    `118X` 의 분수는 분모가 문자($\dfrac{60}{a}$)라 그 자의 분모 밖이고, `120X` 는
 *    분수를 아예 안 쓴다 — 그 «0» 은 «못 셈»이 아니라 **«잴 것이 없다»** 다(시험이 찍는다).
 * ㉱ **발문이 스스로 못 박은 상한을 오답이 넘었다**(4차 중2 `37W`, 51.7%).
 *    → 넷 다 「전체를 $1$ 로 놓고」류 상한을 **선언하지 않는다.** 공용
 *    `declaredUpperBound` 가 읽는 표현이 네 발문 어디에도 없다(시험이 800판 전량에서
 *    `null` 임을 잠근다). 그러므로 그 결함의 자리 자체가 없다.
 * ㉲ **정답이 «구간»이면 파생 오답이 뒤집힌다**(3차 중2 `35V`, 13.1%). → 넷 다 정답이
 *    **한 값**이다(`117X` 만 분수가 될 수 있다). 구간 답이 없으므로 그 대가를 안 치른다.
 * ㉳ **해설의 «말»을 지키는 시험이 없었다**(4차, 중1 10줄·중2 3줄이 무방비).
 *    → 굳힘 개념과 마무리 논거를 진술하는 줄마다 시험이 **낱말을 읽고**, 그 낱말을
 *    뒤집으면 빨개지는 눈금을 같이 뒀다(`middleM2Top5e.test.ts` ⑹).
 *    `117X` 의 「공통」·「끼고 있는」·「대응」, `118X` 의 「음의 정수」·「방향이 바뀌어」·
 *    「넘지 않는 가장 큰 자연수」·「커질수록」, `119X` 의 「같은」·「모두 다르므로」·
 *    「평행」, `120X` 의 「이등분」·「대변」이 그 자리다.
 * ㉴ **지면이 자기가 한 줄 앞에 세운 제약을 스스로 어긴다**(4차 중3 `55W`, 100%).
 *    → `118X` 는 「$a$ 는 자연수이다」를 세운 **뒤**에만 후보를 늘어놓는다. 나열 줄의
 *    모든 $a$ 가 자연수인지, 그리고 $0$ 과 음수가 나열에 **안 섞였는지** 시험이
 *    800판 전량에서 확인한다.
 * ㉵ **자료를 정렬해 찍으면 «보이는 자리»가 순위를 암시한다**(4차 중1 `63W`, 100%).
 *    → `119X` 의 네 점은 **섞어서** 찍는다(직선 밖 점이 넷째 자리에 몰리지 않는다 —
 *    시험이 네 자리에 모두 나오는지 센다). `120X` 의 네 선분도 **섞어서** 찍는다
 *    (나란히 적힌 둘이 대변이라는 암시를 없앤다). 짝지음은 해설이 **스스로** 적는다.
 * ㉶ **D-20 손실 원장을 어림하지 않는다.** 가드를 **하나씩만 끈** 전수 값을 시험 파일
 *    ⑺ 에 적었다(판 수와 답 수의 측정점을 «전수를 훑어 통과한 조합» 한 자리로 맞췄다).
 * ㉷ **내보낸 순수 함수의 주석이 코드와 어긋나면 안 된다**(4차 중3 `solveBoxCases`).
 *    → 굳힘 함수 넷의 주석이 단언하는 것을 시험이 **직접 부르는 눈금**으로 물게 했다.
 * ㉸ **우리말** — 「그중」은 붙여 쓴다. 수 뒤 조사는 `m2Josa` 한 곳에서 계산한다.
 *
 * ## ⑷ 🔴 손실 원장 (D-20 · ㉶) — **가드를 하나씩만 꺼서 센 값**
 *
 * 「전부 켠 판」을 분모로 두고 가드를 **하나씩만** 껐다. 4차가 「$2^6$ 조합 어디에도
 * 없는 분모」로 물린 자리라, 판 수와 답 수를 **같은 자리**(매개변수를 훑어 통과한 조합)
 * 에서 잰다. `117X`·`118X`·`120X` 는 **매개변수 전수**이고, `119X` 만 전수 8,268,480 이
 * 커서 $k$ 를 세 칸씩 건너뛴 **체계적 훑기**다(무작위 표본이 아니다).
 *
 * | 유형 | 전부 켠 통과 | 정답 가짓수 | 전수 최빈 | 가드마다 「이것만 껐을 때」 |
 * |---|---|---|---|---|
 * | `117X` | **450** | 160 | 2.44% | 길이겹침 466 · **분모상한 450(안 문다)** · 지름길 465 |
 * | `118X` | **5,947** | 42 | 6.79% | 지면상한 6,427 · 후보2~4개 11,661 · 지름길 6,211 · **아래이웃·이어짐·반올림·찍힌수 넷은 5,947(안 문다)** |
 * | `119X` | **49,574** | 43 | 8.77% | $\lvert y\rvert\le24$ 199,178 · 좌표 0 없음 54,536 · **지름길 804,930** · 좌표집기 51,876 |
 * | `120X` | **46,584** | 91 | 1.84% | **계수 차 $\ge2$ 366,020** · $p_1\ne p_3$ 76,292 · $\lvert q\rvert\le40$ 47,206 · 길이 4~60 48,080 · 지름길 49,272 · **마름모·이웃짝·찍힌수 셋은 46,584(안 문다)** |
 *
 * 🔴 **`119X` 의 지름길 가드가 통과 조합의 93.8% 를 버린다** — 그리고 그 대가로 최빈이
 * $5.14\%\to8.77\%$ 로 **올랐다**(4차 `36W` 와 같은 자리다). 그래도 켜 두는 까닭은,
 * 끄면 「좌표 두 개를 더하거나 빼면 맞는」 문항이 통과의 대부분이기 때문이다.
 * 그리고 이 자는 **부호를 뒤집은 값도 본다** — 안 그러면 `pageShortcutValues` 가 두
 * 수의 차를 `Math.abs` 로만 담아 **음수 답만 살아남고**(상위 아홉이 전부 음수) 최빈이
 * $9.3\%$ 까지 올랐다(실측). 뺄셈 순서를 뒤집어 맞히는 것도 지름길이므로 막는 것이
 * 옳고, 그러면 분포도 같이 고르게 된다.
 *
 * 🔴 **`120X` 의 「계수 차 $\ge2$」는 지면 결함을 막는다** — 차가 $1$ 이면 정리 줄이
 * 「$x=4$, 즉 $x=4$이다」가 되어 **같은 등식이 되풀이된다**(2026-08-24 「$a=-4$이므로
 * $a=-4$이다」와 같은 자리). 실제로 첫 판이 그랬고 시험이 잡았다. 통과 조합이
 * $366{,}020\to46{,}584$ 로 87.3% 줄지만 정답 가짓수는 **91 로 그대로**이고 최빈은
 * $2.26\%\to1.84\%$ 로 **좋아진다** — 잃은 것이 다양성이 아니라 흉한 지면뿐이다.
 *
 * 🔴 **「안 문다」로 적은 여덟 줄은 지우지 않고 남기되 코드 옆에 그렇게 적어 두었다** —
 * 그것들이 무엇을 뜻하는지가 다음 사람에게 필요하고(해설의 마무리 문장이 그 불변식에
 * 기댄다), 매개변수 범위를 넓히면 그때부터 문다. **가드로 읽지 말 것.**
 *
 * ⚠️ **전수와 표본은 다른 값이다.** 시험이 잠그는 것은 **표본 쪽**(저술 씨앗 800판)이고
 * 문턱은 $12\%$ 다. 표본 최빈은 시험 파일이 씨앗 블록 **넷**으로 재어 적는다 —
 * 블록 하나짜리로 적으면 여유를 낙관적으로 적게 된다(4차가 그렇게 물렸다).
 *
 * ## ⑸ 번호 규약 — **`X` 접미사**
 *
 * `extensionNumberReason` 이 「숫자+영문 대문자 한 글자」를 통과시킨다. `A`(색인 밖
 * 보강)·`T`(1차)·`U`(2차)·`V`(3차)·`W`(4차)가 쓰였으므로 5차는 **`X`** 다.
 * 이 갈래의 몫은 리드가 나눠 준 구간 **`117X`~`120X`** 다.
 *
 * ## ⑹ 계약 (이웃 모듈과 한 벌)
 *
 * 1. **정답을 먼저 뽑고 발문을 역산한다.**
 * 2. `facts` 로 정답 문자열을 **다시 지을 수 있다**(시험이 왕복으로 잠근다).
 *    `facts.x` 는 답의 **첫 수** — `117X` 는 분자(정수면 그 값), `118X` 는 합,
 *    `119X` 는 $y$절편, `120X` 는 둘레다.
 * 3. 숫자는 전부 `$...$` 안에 (`elementary/rules` `bareNumbers`).
 * 4. `attempt` 가 다 떨어지면 **던진다** — 조용히 기본값을 내지 않는다.
 * 5. 그림이 없으므로 발문이 **지면을 가리키지 않는다**(`pointsAtFigure`).
 *    도형 둘(`117X`·`120X`)은 **말로만** 그린다 — 「그림과 같이」를 안 쓴다.
 * 6. 🔴 **해설이 걸음을 건너뛰지 않는다.** 후보를 견주는 갈래(`118X`·`119X`)는
 *    **죽는 후보가 왜 죽는지**까지 적는다.
 * 7. 🔴 **낱말 뒤 조사를 손 목록으로 적지 않는다** — 수 뒤 조사는 `m2Josa` 한 곳에서.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { attempt, shuffle, signed } from "./m1Shared";
import { pageShortcutValues } from "./m1Top4";
import { eulReul } from "./m2Josa";
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
const MINOR_SIM = "도형의 닮음";
const MINOR_INEQ = "일차부등식";
const MINOR_FUNC2 = "일차함수와 그 그래프\u2009 ⑵";
const MINOR_PARA = "평행사변형";

/**
 * 우리 `Unit.section` 정확한 이름 (`prisma/seed-data/units.ts` 실측).
 * 괄호 안의 쉼표·공백은 눈으로 못 가르므로 시험이 단원 정본과 **대조**한다.
 * 브리프의 목록과 왜 다른지는 머리말 ⑴-1 에 근거와 함께 적었다.
 */
const SEC = {
  닮음조건: "삼각형의 닮음 조건",
  부등식응용: "일차부등식의 응용",
  식구하기: "일차함수의 식 구하기",
  평행사변형조건: "평행사변형이 되는 조건",
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
 * 기약분수 지면 — 분모가 $1$ 이면 **정수로** 적는다(㉰).
 * 음수는 분수 **앞에** 부호를 뺀다(`-\dfrac{9}{5}`) — 분자 칸 안에 부호를 넣으면
 * 지면에서 읽기 어렵다.
 */
export function fracTex(n: number, d: number): string {
  const [a, b] = reduceFraction(n, d);
  if (b === 1) return String(a);
  return a < 0 ? `-\\dfrac{${-a}}{${b}}` : `\\dfrac{${a}}{${b}}`;
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
 * 계수 지면 — $1$ 은 안 적고 $-1$ 은 부호만 적는다.
 * (`pageSmells` 의 「계수 $1$ 을 적었다」가 `1x` 를 잡는다.)
 */
export function coefTex(c: number, sym = "x"): string {
  if (c === 1) return sym;
  if (c === -1) return `-${sym}`;
  return `${c}${sym}`;
}

/**
 * `px+q` 의 KaTeX 몸통. $q$ 는 $0$ 이 아니어야 한다
 * (「상수 $0$ 을 더했다」 냄새를 지면에 내지 않는다).
 */
export function linTex(p: number, q: number, sym = "x"): string {
  if (q === 0) throw new Error("linTex: 상수항이 0 이면 지면에 `+0` 이 난다");
  return `${coefTex(p, sym)}${signed(q)}`;
}

/** `px+q` 에 값을 넣어 계산하는 줄 — 계수가 $1$ 이면 곱셈표를 안 적는다. */
function evalTex(p: number, q: number, t: number): string {
  return p === 1 ? `${t}${signed(q)}` : `${p}\\times${t}${signed(q)}`;
}

/** 뺄셈 지면 — 빼는 수가 음수면 괄호를 친다(`1-(-3)`). */
function minusTex(a: number, b: number): string {
  return b < 0 ? `${a}-(${b})` : `${a}-${b}`;
}

/** 점 이름표 — 네 자리를 늘 같은 글자로 쓴다. */
const LABELS = ["A", "B", "C", "D"] as const;

// ═══════════════════════════════════════════════════════════
// 117X  공통각과 두 변의 비로 닮은 삼각형을 찾아 선분의 길이  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * **굳힘 함수** — SAS 닮음 조건으로 $\overline{BD}$ 를 되찾는다.
 *
 * $\triangle ABC$ 에서 변 $AC$ 위의 점 $D$ 에 대하여
 * $\overline{AB}^{2}=\overline{AD}\times\overline{AC}$ 이면 $\angle A$ 가 공통이고
 * 끼인 두 변의 비가 같으므로 $\triangle ABD\sim\triangle ACB$ 이고, 닮음비는
 * $\overline{AB}:\overline{AC}$ 다. $\overline{BD}$ 에 대응하는 변은 $\overline{CB}$
 * 이므로 $\overline{BD}=\overline{BC}\times\dfrac{\overline{AB}}{\overline{AC}}$.
 *
 * 🔴 **굳힘의 인자는 `useSas` 다.** 대응을 $\triangle ABD\sim\triangle ABC$ 로 잘못
 * 짚으면 닮음비가 $\overline{AD}:\overline{AC}$ 가 되어 답이 달라진다 — 학생이 가장
 * 흔히 하는 실수이고, 이 유형이 재려는 바로 그 마디다.
 * $\overline{AD}<\overline{AB}$ 이므로 두 값은 **늘 다르다**(생성기가 그것도 확인한다).
 *
 * ⚠️ `useSas=false` 는 제품이 안 쓰는 길이다(생성기는 늘 `true`). 그런데도 인자로
 *    두는 까닭은 시험이 그 마디를 **흔들어 잴 수 있게** 하기 위해서다 — 생성기 안에서
 *    두 판을 견주는 줄은 한 번도 거부하지 못하는 «도장»이 된다
 *    (2026-08-23 「도장은 초록을 못 낸다」).
 *
 * 자리가 성립하지 않으면 — 길이가 양수가 아니다 · $D$ 가 $A$ 와 $C$ 사이에 없다 ·
 * 곱셈 관계가 안 선다 · 삼각형이 안 된다 — `null` 을 낸다.
 */
export function splitSimilarLength(
  ab: number,
  ac: number,
  ad: number,
  bc: number,
  useSas = true,
): [number, number] | null {
  if (ab <= 0 || ac <= 0 || ad <= 0 || bc <= 0) return null;
  if (!(ad < ab && ab < ac)) return null;
  if (ab * ab !== ad * ac) return null;
  if (bc <= ac - ab || bc >= ac + ab) return null;
  return reduceFraction(bc * (useSas ? ab : ad), ac);
}

/**
 * $\overline{AB}^{2}=\overline{AD}\times\overline{AC}$ 를 만족하는
 * $(\overline{AB},\overline{AC},\overline{AD})$ 전부.
 *
 * $\overline{AC}\le45$ 로 묶는 까닭은 지면이다 — 안 묶으면 발문에
 * $\overline{AC}=144\,\mathrm{cm}$ 같은 길이가 나간다.
 * $\overline{AC}-\overline{AB}\ge2$ 는 닮음비가 $1$ 에 붙어 「거의 같은 두 삼각형」이
 * 되는 것을 막는다.
 */
export const SAS_SPLITS: readonly (readonly [number, number, number])[] =
  (() => {
    const out: [number, number, number][] = [];
    for (let ab = 6; ab <= 24; ab += 1) {
      const sq = ab * ab;
      for (let ad = 3; ad < ab; ad += 1) {
        if (sq % ad !== 0) continue;
        const ac = sq / ad;
        if (ac > 45) continue;
        if (ac - ab < 2) continue;
        out.push([ab, ac, ad]);
      }
    }
    return out;
  })();

const SIMILAR_SPLIT: TypeEntry[] = [
  def(
    BOOK2,
    MINOR_SIM,
    "117X",
    "공통각과 두 변의 비로 닮은 삼각형을 찾아 선분의 길이 구하기",
    SEC.닮음조건,
    "심화중",
    (rng): Body =>
      attempt(4000, (): Body | null => {
        const [ab, ac, ad] = pick(rng, SAS_SPLITS);
        const lo = ac - ab + 1;
        const hi = Math.min(45, ac + ab - 1);
        if (hi < lo) return null;
        const bc = intBetween(rng, lo, hi);
        // 네 길이 가운데 둘이 같으면 「어느 것이 어느 것인지」가 지면에서 흐려진다.
        if (bc === ab || bc === ac || bc === ad) return null;
        const truth = splitSimilarLength(ab, ac, ad, bc);
        if (truth === null) return null;
        const [bn, bd] = truth;
        const naive = splitSimilarLength(ab, ac, ad, bc, false);
        if (naive === null) return null;
        // ㉡ 대응을 잘못 짚으면 답이 달라져야 한다 (늘 참이지만 못 박는다).
        if (naive[0] === bn && naive[1] === bd) return null;
        // 지면이 흉하지 않게 — 분모가 크면 「$\dfrac{35}{16}$」 같은 답이 난다.
        // ⚠️ **이 줄은 가드가 아니다.** 매개변수 전수에서 실제 분모의 **최댓값이 $5$** 라
        //    꺼도 통과 조합이 450 으로 **그대로**다(D-20 원장 `G2`). 닮음비의 뒷항이
        //    $\overline{AC}/\gcd$ 인데 `SAS_SPLITS` 가 $\overline{AC}\le45$ 로 묶여 있어
        //    구조적으로 커질 수 없다. 뜻을 적어 둘 뿐이니 **가드로 읽지 말 것.**
        if (bd > 8) return null;

        // 🔴 ㉵ 지름길 — 발문에 찍히는 네 수의 한두 번 연산으로 답이 나오면 버린다.
        //    답이 분수이면 그 자는 정수만 세므로 «잴 것이 없다» — 그때는 이 가드가
        //    **아무것도 안 막는다**(시험이 그 사실을 따로 찍는다).
        if (bd === 1 && pageShortcutValues([ab, ac, ad, bc]).has(bn))
          return null;

        // 닮음비 $\overline{AB}:\overline{AC}$ — $\overline{AB}<\overline{AC}$ 이므로
        // 기약으로 줄여도 뒷항이 반드시 $2$ 이상이다(㉰: 분모 $1$ 인 분수가 안 난다).
        const [rn, rd] = reduceFraction(ab, ac);
        const answerBody = fracTex(bn, bd);
        return {
          content:
            `삼각형 $ABC$에서 $\\overline{AB}=${ab}\\,\\mathrm{cm}$, ` +
            `$\\overline{AC}=${ac}\\,\\mathrm{cm}$, $\\overline{BC}=${bc}\\,\\mathrm{cm}$이다. ` +
            `변 $AC$ 위의 점 $D$에 대하여 $\\overline{AD}=${ad}\\,\\mathrm{cm}$일 때, ` +
            `$\\overline{BD}$의 길이를 구하시오.`,
          answer: `$${answerBody}\\,\\mathrm{cm}$`,
          solution: [
            `삼각형 $ABD$와 삼각형 $ACB$에서 $\\angle A$는 공통이다.`,
            `$\\overline{AB}^{\\,2}=${ab}\\times${ab}=${ab * ab}$이고 $\\overline{AD}\\times\\overline{AC}=${ad}\\times${ac}=${ad * ac}$이므로 $\\overline{AD}:\\overline{AB}=\\overline{AB}:\\overline{AC}$이다.`,
            `즉 한 각의 크기가 같고 그 각을 끼고 있는 두 변의 길이의 비가 같으므로 두 삼각형은 $\\mathrm{SAS}$ 닮음이고, 닮음비는 $\\overline{AB}:\\overline{AC}=${ab}:${ac}=${rn}:${rd}$이다.`,
            `이 닮음에서 $\\overline{BD}$에 대응하는 변은 $\\overline{CB}$이므로 $\\overline{BD}:\\overline{CB}=${rn}:${rd}$이고, $\\overline{CB}=${bc}\\,\\mathrm{cm}$이다.`,
            `따라서 $\\overline{BD}=\\dfrac{${rn}\\times${bc}}{${rd}}=${answerBody}\\,(\\mathrm{cm})$이다.`,
          ].join("\n"),
          facts: {
            x: bn,
            den: bd,
            ab,
            ac,
            ad,
            bc,
            ratioNum: rn,
            ratioDen: rd,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 118X  자연수인 해가 N개가 되게 하는 정수 계수를 모두 찾기  (심화상)
// ═══════════════════════════════════════════════════════════

/** 살아남는 후보를 넷까지만 받는다 — 다섯이면 나열 줄이 정답지 한 단을 넘본다(㉮). */
const WINNER_MAX = 4;

/**
 * $ax\le b$ 의 **자연수인 해의 개수**.
 *
 * 🔴 **굳힘의 인자는 `useFloor` 다.** 「$\dfrac{b}{a}$ 를 **넘지 않는** 가장 큰
 * 자연수」를 「$\dfrac{b}{a}$ 를 **반올림한** 수」로 바꾸면 개수가 달라진다 — 학생이
 * 가장 흔히 하는 실수이고, 이 유형이 재려는 바로 그 마디다.
 *
 * $a\le0$ 이면 자연수인 해가 **무한히 많다**($a=0$ 이면 $0\le b$ 가 늘 참이고,
 * $a<0$ 이면 $x\ge\dfrac{b}{a}$ 인데 그 값이 음수다). 셀 수 없으므로 `null` 을 낸다 —
 * 「개수가 $N$ 이다」가 성립할 수 없다는 뜻이고, 해설이 그 두 경우를 따로 적는다.
 *
 * ⚠️ `useFloor=false` 는 제품이 안 쓰는 길이다. 시험이 흔들어 잰다.
 */
export function naturalSolutionCount(
  b: number,
  a: number,
  useFloor = true,
): number | null {
  if (b <= 0) return null;
  if (a <= 0) return null;
  return useFloor ? Math.floor(b / a) : Math.round(b / a);
}

/**
 * $ax\le b$ 의 자연수인 해가 정확히 $n$ 개가 되게 하는 **정수 $a$ 를 모두** —
 * 작은 것부터.
 *
 * $a$ 는 $1$ 부터 $b$ 까지만 보면 된다: $a>b$ 이면 개수가 $0$ 이고 $n\ge1$ 이므로
 * 살아남을 수 없다. $a\le0$ 은 `naturalSolutionCount` 가 `null` 을 내므로 자동으로
 * 빠진다 — **그 «빠짐»이 이 유형의 «죽는 후보»** 이고 해설이 까닭을 적는다.
 */
export function coefficientsWithCount(
  b: number,
  n: number,
  useFloor = true,
): number[] {
  const out: number[] = [];
  if (b <= 0 || n < 1) return out;
  for (let a = 1; a <= b; a += 1) {
    if (naturalSolutionCount(b, a, useFloor) === n) out.push(a);
  }
  return out;
}

const COUNT_TO_COEFFICIENTS: TypeEntry[] = [
  def(
    BOOK1,
    MINOR_INEQ,
    "118X",
    "자연수인 해의 개수가 주어질 때 계수가 될 수 있는 정수 모두 구하기",
    SEC.부등식응용,
    "심화상",
    (rng): Body =>
      attempt(6000, (): Body | null => {
        // $p\ge3$ 이라야 정리한 뒤 $ax$ 의 계수가 $2$ 이상이 되어 나누는 걸음이 산다
        // ($p=2$ 면 「$ax\le b$이므로 $ax\le b$」가 되어 되풀이 줄이 난다).
        const p = intBetween(rng, 3, 4);
        const q = intBetween(rng, 1, 9); // 괄호 안의 상수항
        const b = intBetween(rng, 20, 140); // 정리한 뒤의 오른쪽 — **지면에 안 나온다**
        const n = intBetween(rng, 2, 9);
        const r = (p - 1) * b + p * q; // 지면에 나오는 오른쪽 상수
        if (r > 400) return null; // 지면이 길어진다
        const winners = coefficientsWithCount(b, n);
        if (winners.length < 2 || winners.length > WINNER_MAX) return null;
        const lo = winners[0]!;
        const hi = winners[winners.length - 1]!;
        // 아래 이웃이 있어야 「$a$ 가 커질수록 개수가 작아진다」를 양쪽에서 보인다.
        // ⚠️ **이 줄은 가드가 아니다** — $a=1$ 이면 개수가 $b$ 인데 $b\ge20>9\ge n$ 이라
        //    구조적으로 살아남을 수 없다(실측: 후보 2~4개인 $(b,n)$ **372자리 중 0**).
        //    $n$ 의 위 끝을 $20$ 넘게 넓히면 그때부터 문다. **가드로 읽지 말 것.**
        if (lo < 2) return null;
        // 후보가 이어져 있어야 「$a$ 가 커질수록 …이므로 …뿐이다」라는 마무리가 참이다.
        // ⚠️ 이것은 가드가 아니라 **불변식 확인**이다 — $\lfloor b/a\rfloor$ 는 $a$ 에
        //    대해 넓은 뜻으로 감소하므로 그 집합은 늘 이어진 구간이다(실측 372자리 중
        //    안 이어진 것 **0**). 해설의 마무리 문장이 이 불변식에 기대므로 남겨 둔다.
        if (hi - lo + 1 !== winners.length) return null;
        const naive = coefficientsWithCount(b, n, false);
        // ㉡ 「넘지 않는 가장 큰 자연수」를 반올림으로 바꾸면 후보가 달라져야 한다.
        // ⚠️ 실측 372자리에서 **늘 달라진다**(같은 자리 0). 못 박아 둘 뿐이다.
        if (
          naive.length === winners.length &&
          naive.every((v, i) => v === winners[i])
        )
          return null;
        const sum = winners.reduce((s, v) => s + v, 0);
        // 🔴 ㉵ 지름길 — 발문에 찍히는 네 수의 한두 번 연산으로 답이 나오면 버린다.
        if (pageShortcutValues([p, q, r, n]).has(sum)) return null;
        // 지면에 이미 찍힌 수를 그대로 집으면 맞는 자리도 버린다.
        // ⚠️ **이 줄도 가드가 아니다** — 전수에서 꺼도 통과 5,947 로 그대로다(원장 `H7`).
        //    바로 위 지름길 자가 이미 그 값들을 담고 있어서다. 뜻을 적어 둘 뿐이다.
        if (sum === r || sum === b || sum === n || sum === q || sum === p)
          return null;

        const listed: string[] = [];
        for (let a = lo - 1; a <= hi + 1; a += 1) {
          listed.push(`$a=${a}$이면 $${naturalSolutionCount(b, a)!}$개`);
        }
        const winnerList = winners.map((v) => `$a=${v}$`).join(", ");
        const sumChain = winners.join("+");
        return {
          content:
            `$x$에 대한 일차부등식 $${p}(ax+${q})\\le ax+${r}$${eulReul(r)} 만족시키는 ` +
            `자연수 $x$가 $${n}$개가 되도록 하는 정수 $a$의 값을 모두 구하여 ` +
            `그 합을 구하시오.`,
          answer: `$${sum}$`,
          solution: [
            `괄호를 풀면 $${p}ax+${p * q}\\le ax+${r}$이므로 $${coefTex(p - 1, "ax")}\\le${r - p * q}$, 즉 $ax\\le${b}$이다.`,
            `$a=0$이면 부등식이 $0\\le${b}$${iGa(b)} 되어 모든 자연수 $x$가 해가 되므로 자연수인 해가 $${n}$개일 수 없다.`,
            `$a$가 음의 정수이면 양변을 $a$로 나눌 때 부등호의 방향이 바뀌어 $x\\ge\\dfrac{${b}}{a}$이고, 이때 $\\dfrac{${b}}{a}$${eunNeun(b)} 음수이므로 역시 모든 자연수 $x$가 해가 된다.`,
            `그러므로 $a$는 자연수이고, 이때 해는 $x\\le\\dfrac{${b}}{a}$이므로 자연수인 해의 개수는 $\\dfrac{${b}}{a}$${eulReul(b)} 넘지 않는 가장 큰 자연수와 같다.`,
            `$a$에 자연수를 작은 것부터 넣어 그 개수를 세면 ${listed.join(", ")}이다.`,
            `$a$가 커질수록 $\\dfrac{${b}}{a}$${eunNeun(b)} 작아지므로 개수가 $${n}$개인 것은 ${winnerList}뿐이다.`,
            `따라서 구하는 합은 $${sumChain}=${sum}$이다.`,
          ].join("\n"),
          facts: {
            x: sum,
            p,
            q,
            r,
            n,
            bound: b,
            lo,
            hi,
            howMany: winners.length,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 119X  네 점 중 한 직선 위의 세 점을 찾아 평행한 직선의 y절편  (심화상)
// ═══════════════════════════════════════════════════════════

export type Point = readonly [number, number];

/** 두 점을 지나는 직선의 기울기 — 기약분수 $[분자,\ 분모]$. 세로선이면 `null`. */
export function slopeOf(p: Point, q: Point): [number, number] | null {
  if (p[0] === q[0]) return null;
  return reduceFraction(q[1] - p[1], q[0] - p[0]);
}

/**
 * 네 점 가운데 **한 직선 위에 있는 세 점**의 자리를 작은 것부터.
 *
 * 네 점에서 셋을 고르는 네 가지를 **다 만들어** 각각 한 직선 위인지 본다. 그런 셋이
 * 하나도 없거나 둘 이상이면(넷이 모두 한 직선 위면 네 가지가 다 걸린다) `null` —
 * 발문의 「세 점은 한 직선 위에 있다」가 그때는 하나로 안 정해지기 때문이다.
 */
export function collinearTriple(pts: readonly Point[]): number[] | null {
  if (pts.length !== 4) return null;
  const on: number[][] = [];
  for (let i = 0; i < 4; i += 1)
    for (let j = i + 1; j < 4; j += 1)
      for (let k = j + 1; k < 4; k += 1) {
        const [ax, ay] = pts[i]!;
        const [bx, by] = pts[j]!;
        const [cx, cy] = pts[k]!;
        if ((bx - ax) * (cy - ay) === (cx - ax) * (by - ay)) on.push([i, j, k]);
      }
  return on.length === 1 ? on[0]! : null;
}

/**
 * **굳힘 함수** — 직선 밖의 점을 지나고 그 직선과 **평행한** 직선의 $y$절편.
 *
 * 🔴 **굳힘의 인자는 `useOddPoint` 다.** 「평행한 두 직선의 기울기는 같다」까지만 쓰고
 * **직선 밖의 점을 지난다**는 조건을 빠뜨리면 원래 직선의 $y$절편이 그대로 답이 된다 —
 * 학생이 가장 흔히 하는 실수이고, 이 유형이 재려는 바로 그 마디다. 직선 밖의 점은 그
 * 직선 위에 없으므로 두 값은 **늘 다르다**.
 *
 * ⚠️ `useOddPoint=false` 는 제품이 안 쓰는 길이다. 시험이 흔들어 잰다.
 *
 * 한 직선 위의 세 점이 하나로 안 정해지거나 그 직선이 세로선이면 `null`.
 */
export function parallelIntercept(
  pts: readonly Point[],
  useOddPoint = true,
): [number, number] | null {
  const tri = collinearTriple(pts);
  if (tri === null) return null;
  const odd = [0, 1, 2, 3].find((i) => !tri.includes(i));
  if (odd === undefined) return null;
  const m = slopeOf(pts[tri[0]!]!, pts[tri[1]!]!);
  if (m === null) return null;
  const [mn, md] = m;
  const base = useOddPoint ? pts[odd]! : pts[tri[0]!]!;
  // $b=y-\dfrac{mn}{md}\,x$
  return reduceFraction(base[1] * md - mn * base[0], md);
}

const LINE_FROM_FOUR: TypeEntry[] = [
  def(
    BOOK1,
    MINOR_FUNC2,
    "119X",
    "네 점 중 한 직선 위의 세 점을 찾아 평행한 직선의 y절편 구하기",
    SEC.식구하기,
    "심화상",
    (rng): Body =>
      attempt(8000, (): Body | null => {
        const m = pick(rng, [-5, -4, -3, -2, 2, 3, 4, 5] as const);
        const k = intBetween(rng, -14, 14);
        const xs: number[] = [];
        for (let i = 0; i < 3; i += 1) {
          // 🔴 좌표에 $0$ 이 있으면 지면에 「상수 $0$」 냄새가 난다 — 기울기 줄의
          //    뺄셈이 `-3-0` 이 되고, 대입 줄에는 `\times0` 이 나와 걸음이 사라진다.
          const v = intBetween(rng, -6, 6);
          if (v === 0 || xs.includes(v)) return null;
          xs.push(v);
        }
        const onLine: Point[] = xs.map((x) => [x, m * x + k] as Point);
        if (onLine.some(([, y]) => y === 0 || Math.abs(y) > 24)) return null;
        const x4 = intBetween(rng, -6, 6);
        if (x4 === 0 || xs.includes(x4)) return null;
        const delta = pick(rng, [
          -9, -8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9,
        ] as const);
        const y4 = m * x4 + k + delta;
        if (y4 === 0 || Math.abs(y4) > 24) return null;
        const odd: Point = [x4, y4];

        const shuffled = shuffle(rng, [...onLine, odd]) as Point[];
        const truth = parallelIntercept(shuffled);
        if (truth === null) return null;
        const [tn, td] = truth;
        if (td !== 1) return null; // 기울기가 정수라 절편도 정수다(늘 참이지만 못 박는다)
        const ans = tn;
        if (ans === 0) return null; // 지면에 `y=mx+0` 이 나가면 「상수 $0$」 냄새다
        const naive = parallelIntercept(shuffled, false);
        if (naive === null) return null;
        // ㉡ 「직선 밖의 점을 지난다」를 지우면 답이 달라져야 한다 (늘 참이지만 못 박는다).
        if (naive[0] === tn && naive[1] === td) return null;

        const coords = shuffled.flatMap(([x, y]) => [x, y]);
        // 🔴 ㉵ 지름길 — 지면에 찍히는 여덟 수의 한두 번 연산으로 답이 나오면 버린다.
        //    ⚠️ **부호를 뒤집은 값도 같이 본다.** `pageShortcutValues` 는 두 수의 차를
        //    `Math.abs` 로 담으므로 음수 쪽이 통째로 빠진다 — 그대로 두면 음수 답만
        //    살아남아 정답이 음수에 쏠린다(실측: 상위 아홉이 **전부 음수**, 최빈 9.3%).
        //    빼는 순서를 뒤집어 맞히는 것도 지름길이므로 막는 것이 옳고, 그러면 분포도
        //    같이 고르게 된다.
        const shortcuts = pageShortcutValues(coords);
        if (shortcuts.has(ans) || shortcuts.has(-ans)) return null;
        if (coords.includes(ans) || coords.includes(-ans)) return null;

        const oddAt = shuffled.findIndex((p) => p[0] === x4 && p[1] === y4);
        if (oddAt < 0) return null;
        const tri = collinearTriple(shuffled)!;

        const named = shuffled
          .map((p, i) => `$\\mathrm{${LABELS[i]}}(${p[0]}, ${p[1]})$`)
          .join(", ");

        /** 「$\mathrm{A}$, $\mathrm{B}$에서 $\dfrac{…}{…}=값$」 한 조각. */
        const slopePiece = (i: number, j: number): string => {
          const a = shuffled[i]!;
          const b = shuffled[j]!;
          const s = slopeOf(a, b)!;
          return (
            `$\\mathrm{${LABELS[i]}}$, $\\mathrm{${LABELS[j]}}$에서 ` +
            `$\\dfrac{${minusTex(b[1], a[1])}}{${minusTex(b[0], a[0])}}=${fracTex(s[0], s[1])}$`
          );
        };
        const nameOf = (i: number): string => `$\\mathrm{${LABELS[i]}}$`;

        const lines: string[] = [
          `점 ${nameOf(0)}와 나머지 세 점을 각각 지나는 직선의 기울기를 구하면 ${[
            1, 2, 3,
          ]
            .map((j) => slopePiece(0, j))
            .join(", ")}이다.`,
        ];
        if (oddAt === 0) {
          lines.push(
            `세 기울기가 모두 다르므로 점 ${nameOf(0)}는 나머지 세 점이 놓인 직선 위에 있지 않다.`,
          );
          lines.push(
            `${slopePiece(1, 2)}, ${slopePiece(1, 3)}이므로 두 기울기가 같고, 한 직선 위에 있는 세 점은 ${nameOf(1)}, ${nameOf(2)}, ${nameOf(3)}이며 그 직선 위에 있지 않은 점은 ${nameOf(0)}이다.`,
          );
        } else {
          const pair = tri.filter((i) => i !== 0);
          lines.push(
            `기울기가 같은 것은 ${nameOf(0)}, ${nameOf(pair[0]!)}와 ${nameOf(0)}, ${nameOf(pair[1]!)}이므로 한 직선 위에 있는 세 점은 ${nameOf(tri[0]!)}, ${nameOf(tri[1]!)}, ${nameOf(tri[2]!)}이고, 그 직선 위에 있지 않은 점은 ${nameOf(oddAt)}이다.`,
          );
        }
        lines.push(
          `평행한 두 직선의 기울기는 같으므로 구하는 직선의 기울기도 $${m}$이다.`,
        );
        lines.push(
          `구하는 직선의 식을 $y=${coefTex(m)}+b$라 하면 이 직선이 점 $\\mathrm{${LABELS[oddAt]}}(${x4}, ${y4})$를 지나므로 $${y4}=${m}\\times${x4 < 0 ? `(${x4})` : x4}+b$이다.`,
        );
        lines.push(
          `따라서 $b=${y4}${signed(-m * x4)}=${ans}$이고, 구하는 $y$절편은 $${ans}$이다.`,
        );

        return {
          content:
            `좌표평면 위의 네 점 ${named} 가운데 세 점은 한 직선 위에 있다. ` +
            `그 직선 위에 있지 않은 나머지 한 점을 지나고 그 직선과 평행한 직선의 ` +
            `$y$절편을 구하시오.`,
          answer: `$${ans}$`,
          solution: lines.join("\n"),
          facts: {
            x: ans,
            slope: m,
            oddAt,
            oddX: x4,
            oddY: y4,
            lineIntercept: k,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 120X  대각선 위의 두 점이 만드는 사각형의 둘레  (심화중)
// ═══════════════════════════════════════════════════════════

/** 「$px+q$」 한 변 — 계수와 상수항을 짝으로 든다. */
export type Side = readonly [number, number];

/** $px+q$ 의 값. */
function sideValue(s: Side, t: number): number {
  return s[0] * t + s[1];
}

/**
 * **굳힘 함수** — $\square AECF$ 의 둘레.
 *
 * 평행사변형 $ABCD$ 의 두 대각선의 교점 $O$ 는 $\overline{AC}$ 를 이등분하고,
 * $\overline{BE}=\overline{DF}$ 이면 $\overline{OE}=\overline{OF}$ 이므로
 * $\square AECF$ 의 두 대각선 $\overline{AC}$, $\overline{EF}$ 가 서로 다른 것을
 * 이등분한다 — 그래서 $\square AECF$ 는 **평행사변형**이고 **대변끼리** 길이가 같다.
 *
 * 🔴 **굳힘의 인자는 `pairOpposite` 다.** 대변($\overline{AE}$ 와 $\overline{CF}$)이
 * 아니라 **이웃한 변**($\overline{AE}$ 와 $\overline{EC}$)을 같다고 놓으면 $x$ 가
 * 달라져 둘레가 달라진다 — 학생이 가장 흔히 하는 실수이고, 이 유형이 재려는 바로
 * 그 마디다.
 *
 * ⚠️ `pairOpposite=false` 는 제품이 안 쓰는 길이다. 시험이 흔들어 잰다.
 *
 * 계수가 같아 $x$ 가 안 정해지거나 · 해가 정수가 아니거나 · 네 길이 가운데 하나라도
 * 양수가 아니거나 · (대변으로 풀 때) 나머지 한 쌍이 그 $x$ 에서 안 맞으면 `null`.
 * 그 마지막 검사가 $\overline{FA}$ 를 **실제로 쓰게** 만든다 — 안 쓰면 그 인자가
 * 지면에만 있고 굳힘에는 없는 장식이 된다.
 */
export function parallelogramPerimeter(
  ae: Side,
  cf: Side,
  ec: Side,
  fa: Side,
  pairOpposite = true,
): number | null {
  const solve = (u: Side, v: Side): number | null => {
    const d = u[0] - v[0];
    if (d === 0) return null;
    const t = (v[1] - u[1]) / d;
    return Number.isInteger(t) ? t : null;
  };
  const x = pairOpposite ? solve(ae, cf) : solve(ae, ec);
  if (x === null) return null;
  const lenAe = sideValue(ae, x);
  const lenCf = sideValue(cf, x);
  const lenEc = sideValue(ec, x);
  const lenFa = sideValue(fa, x);
  if (lenAe <= 0 || lenCf <= 0 || lenEc <= 0 || lenFa <= 0) return null;
  if (pairOpposite && (lenAe !== lenCf || lenEc !== lenFa)) return null;
  return 2 * (lenAe + lenEc);
}

const INNER_PARALLELOGRAM: TypeEntry[] = [
  def(
    BOOK2,
    MINOR_PARA,
    "120X",
    "대각선 위의 두 점이 만드는 사각형이 평행사변형임을 보이고 둘레 구하기",
    SEC.평행사변형조건,
    "심화중",
    (rng): Body =>
      attempt(8000, (): Body | null => {
        const x0 = intBetween(rng, 2, 9);
        // 🔴 계수 차를 **$2$ 이상**으로 묶는다. 차가 $1$ 이면 정리 줄이
        //    「$x=4$, 즉 $x=4$이다」가 되어 **같은 등식이 되풀이된다**
        //    (2026-08-24 「$a=-4$이므로 $a=-4$이다」와 같은 자리 — 실측으로 났다).
        //    앞쪽 계수를 $3$ 이상으로 두면 계산 줄에 `1\times` 도 안 난다.
        const p1 = intBetween(rng, 3, 5);
        const p2 = intBetween(rng, 1, p1 - 2);
        const p3 = intBetween(rng, 3, 5);
        const p4 = intBetween(rng, 1, p3 - 2);
        // 이웃한 변으로 잘못 짝지어도 **풀리기는 해야** 그 마디를 흔들 수 있다.
        if (p1 === p3) return null;
        const q1 = intBetween(rng, -9, 9);
        const q3 = intBetween(rng, -9, 9);
        if (q1 === 0 || q3 === 0) return null;
        const q2 = q1 + (p1 - p2) * x0;
        const q4 = q3 + (p3 - p4) * x0;
        if (q2 === 0 || q4 === 0) return null;
        if (Math.abs(q2) > 40 || Math.abs(q4) > 40) return null;

        const ae: Side = [p1, q1];
        const cf: Side = [p2, q2];
        const ec: Side = [p3, q3];
        const fa: Side = [p4, q4];
        const lenAe = sideValue(ae, x0);
        const lenEc = sideValue(ec, x0);
        if (lenAe < 4 || lenAe > 60 || lenEc < 4 || lenEc > 60) return null;
        // ⚠️ **이 줄은 가드가 아니다** — 전수에서 꺼도 통과 366,020 으로 그대로다
        //    (원장 `K4`). $\overline{AE}=\overline{EC}$ 이려면 위 `p1 !== p3` 아래에서
        //    $q_1-q_3=(p_3-p_1)x_0$ 이어야 하는데 그 자리는 아래 「이웃짝과 다름」이
        //    먼저 문다. 뜻을 적어 둘 뿐이니 **가드로 읽지 말 것.**
        if (lenAe === lenEc) return null; // 마름모면 「대변끼리」가 눈에 안 보인다
        const truth = parallelogramPerimeter(ae, cf, ec, fa);
        if (truth === null) return null;
        const naive = parallelogramPerimeter(ae, cf, ec, fa, false);
        // ㉡ 이웃한 변을 짝지으면 답이 달라져야 한다 — 못 풀리면(`null`) 그것도 다름이다.
        // ⚠️ 전수에서 꺼도 통과가 그대로다(원장 `K5`) — 위 `p1 !== p3` 가 이웃짝을
        //    **풀리게** 만들고, 풀리면 $x$ 가 달라지므로 둘레도 늘 달라진다.
        if (naive !== null && naive === truth) return null;

        const printed = [p1, q1, p2, q2, p3, q3, p4, q4];
        // 🔴 ㉵ 지름길 — 지면에 찍히는 여덟 수의 한두 번 연산으로 답이 나오면 버린다.
        if (pageShortcutValues(printed).has(truth)) return null;
        // ⚠️ 이 줄도 위 자에 덮여 전수에서 아무것도 안 막는다(원장 `K7`).
        if (printed.includes(truth)) return null;

        // ㉵ 네 선분을 **섞어** 적는다 — 나란히 적힌 둘이 대변이라는 암시를 없앤다.
        const pieces = shuffle(rng, [
          `$\\overline{AE}=(${linTex(p1, q1)})\\,\\mathrm{cm}$`,
          `$\\overline{CF}=(${linTex(p2, q2)})\\,\\mathrm{cm}$`,
          `$\\overline{EC}=(${linTex(p3, q3)})\\,\\mathrm{cm}$`,
          `$\\overline{FA}=(${linTex(p4, q4)})\\,\\mathrm{cm}$`,
        ]);

        return {
          content:
            `평행사변형 $ABCD$의 두 대각선의 교점을 $O$라 하자. ` +
            `대각선 $BD$ 위에 $\\overline{BE}=\\overline{DF}$가 되도록 두 점 $E$, $F$를 잡았다. ` +
            `${pieces.join(", ")}일 때, $\\square AECF$의 둘레의 길이를 구하시오.`,
          answer: `$${truth}\\,\\mathrm{cm}$`,
          solution: [
            `평행사변형의 두 대각선은 서로 다른 것을 이등분하므로 $\\overline{OA}=\\overline{OC}$이고 $\\overline{OB}=\\overline{OD}$이다.`,
            `$\\overline{BE}=\\overline{DF}$이므로 $\\overline{OE}=\\overline{OB}-\\overline{BE}=\\overline{OD}-\\overline{DF}=\\overline{OF}$이다.`,
            `즉 $\\square AECF$는 두 대각선 $\\overline{AC}$와 $\\overline{EF}$가 서로 다른 것을 이등분하므로 평행사변형이다.`,
            `평행사변형에서 두 쌍의 대변의 길이는 각각 같으므로 $\\overline{AE}=\\overline{CF}$, $\\overline{EC}=\\overline{FA}$이다.`,
            `$\\overline{AE}=\\overline{CF}$에서 $${linTex(p1, q1)}=${linTex(p2, q2)}$이므로 $${coefTex(p1 - p2)}=${q2 - q1}$, 즉 $x=${x0}$이다.`,
            `이때 $\\overline{EC}=${evalTex(p3, q3, x0)}=${lenEc}$, $\\overline{FA}=${evalTex(p4, q4, x0)}=${sideValue(fa, x0)}$이므로 $\\overline{EC}=\\overline{FA}$도 성립한다.`,
            `$\\overline{AE}=${evalTex(p1, q1, x0)}=${lenAe}\\,(\\mathrm{cm})$이므로 $\\square AECF$의 둘레의 길이는 $2\\times(${lenAe}+${lenEc})=2\\times${lenAe + lenEc}=${truth}\\,(\\mathrm{cm})$이다.`,
          ].join("\n"),
          facts: {
            x: truth,
            x0,
            p1,
            q1,
            p2,
            q2,
            p3,
            q3,
            p4,
            q4,
            lenAe,
            lenEc,
          },
          figureSpec: null,
        };
      }),
  ),
];

export const M2_TOP_5E: TypeEntry[] = [
  ...SIMILAR_SPLIT,
  ...COUNT_TO_COEFFICIENTS,
  ...LINE_FROM_FOUR,
  ...INNER_PARALLELOGRAM,
];
