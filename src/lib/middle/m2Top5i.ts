/**
 * 중2 **확대 갈래 5차 물결**(`심화중`·`심화상`) — D-116, 접미사 **`X`**, 갈래 `m2Top5i`.
 *
 * ## ⑴ 왜 새 파일인가
 *
 * 4차(`m2Top4.ts`)·5차 앞선 갈래들 머리말과 같은 까닭이다 — 남의 모듈을 잠그는 개수
 * 검사를 무르지 않으려고, 그리고 오르카 다중 세션(이번 물결은 **21갈래가 동시에** 돈다)이
 * 같은 파일에서 부딪히지 않으려고 **새 파일 하나 + `generate.ts` spread 한 줄**로 붙인다.
 * 그 한 줄은 **리드가** 넣는다 — 이 파일은 `generate.ts` 를 건드리지 않는다.
 *
 * ## ⑵ 유형마다 — 안 굳는 마디 / 무엇이 굳히나 / 같은 소단원과 무엇이 다른가
 *
 * | 키 | 갈래 | 안 굳는 마디 | 무엇이 굳히나 | 아래 갈래와 다른 축 |
 * |---|---|---|---|---|
 * | `일차함수와 일차방정식의 관계\|136X` | **심화상** | 상수 $a$ — **굳지 않는다.** 살아남는 값이 하나가 아니라 **셋**이고 그 전부가 답에 들어간다 | 굳지 않는다. 「삼각형을 이루지 않는다」는 «어느 경우인가»를 **고르지 않는다** — 평행 두 갈래와 한 점에서 만나는 갈래를 **다 세운 뒤** 세 값이 서로 다른지까지 견주어야 한다. 게다가 세 값 가운데 둘은 지면에 **찍힌 기울기**이고 하나는 **교점을 실제로 구해야** 나오므로, 나오는 길이 서로 다르다 | 심화하 `14`(직선과 선분이 만날 조건)·`15`(넓이를 이등분)는 답이 **한 값**이고 조건이 부등식 하나 또는 점 하나로 **굳는다**. 응용 `04`(두 점을 지나는 직선)·`06`(네 직선이 둘러싼 넓이)은 미지 상수가 없다. `136X` 는 상수가 **여럿 살아남고** 답이 그 값들의 **합**이며, 「두 직선이 겹치면 평행이 아니다」라는 **버리는 걸음**이 하나 더 있다 |
 * | `연립일차방정식\|137X` | **심화중** | $x$, $y$ **각각** — 두 식 모두 $x$ 와 $y$ 가 섞여 있고 분모와 괄호까지 붙어 있어 「분모를 없애고 괄호를 풀어 정면으로 풀어야」 하는 것처럼 보인다 | 이 소단원의 **공통부분 치환** 하나. $x+y$ 와 $x-y$ 를 각각 한 문자로 놓으면 두 식이 그 둘에 대한 **간단한 연립**이 되고, 분모는 그 문자에만 붙어 있어 한 번에 사라진다. 그러면 $A$, $B$ 가 굳고 「변끼리 더하고 빼서 $2$로 나눈다」로 $x$, $y$ 가 나온다 | 응용 `08`(괄호)·`09`(분수·소수)·`10`(비례식)·`11`($A=B=C$)은 **정리하면 그대로 $x$, $y$ 에 대한 연립**이라 치환할 자리가 없다. 심화하 `19`(순환소수 계수)·`20`(지수법칙)은 «계수를 고쳐 쓰는» 걸음이 하나 더 붙을 뿐 푸는 대상이 여전히 $x$, $y$ 다. `137X` 는 **푸는 대상 자체가 바뀌고**, 마지막에 되돌리는 걸음이 하나 더 있다<br>🔴 **정직하게** — 이 문항은 $x$, $y$ 로 곧장 펴도 **풀린다**(선형 연립이라 늘 그렇다). 재는 것은 「풀 수 있는가」가 아니라 **「되풀이되는 덩어리를 알아보는가」**이고, 알아보지 못하면 걸음이 길어질 뿐 막히지는 않는다. 생성기가 $|n|=m$ 을 막아 둔 것도 그 때문이다 — 그러면 둘째 식이 $2mx=d$ 로 **접혀** 한 문자가 거저 나오고 알아볼 덩어리 자체가 사라진다 |
 * | `평행선 사이의 선분의 길이의 비\|138X` | **심화중** | $\overline{AD}$ 와 $\overline{BC}$ **각각** — 발문은 $\overline{EF}$ 의 길이조차 안 주고 **대각선이 잘라 낸 두 조각**만 준다 | 이 소단원의 **평행선 사이의 선분의 길이의 비** 하나. 대각선 $\overline{AC}$ 가 $\overline{EF}$ 를 두 조각으로 가르는데, 앞 조각은 $\triangle ABC$ 의, 뒤 조각은 $\triangle CAD$ 의 평행선 비에 **각각 따로** 걸린다. 그래서 두 밑변이 **서로를 안 기다리고** 하나씩 굳는다 | 기본 `08`·`50`~`53` 은 세 평행선에서 **대응하는 조각 하나**를 묻는 정방향이다. 응용 `09` 는 $\overline{AD}$, $\overline{BC}$ 를 주고 $\overline{EF}$ 를 묻는 **정방향**이고, 응용 `10` 은 $\overline{EF}$ 가 **대각선의 교점을 지나** 두 조각이 서로 같아진다(그래서 조각 하나만 봐도 된다). `138X` 는 **역방향**이고 두 조각이 **서로 다른 삼각형**에 걸려 있어, 어느 조각이 어느 밑변에 걸리는지를 **가려내는 걸음**이 통째로 하나 더 있다 |
 * | `삼각형의 외심과 내심\|139X` | **심화상** | 「어느 두 변의 길이가 같은가」 — 발문은 「이등변삼각형」이라고만 하고 **어느 두 변인지 말하지 않는다.** 그래서 물은 각의 크기가 하나로 굳지 않는다 | 굳지 않는다. 크기가 같은 두 각이 어느 쌍인가로 **경우가 셋**이고, 셋을 **다 세워** 세 각의 크기가 실제로 될 수 있는지 하나씩 확인한 뒤, 살아남은 것들의 값을 견주어야 한다. 주어진 각이 $90^\circ$ 보다 크면 **두 경우가 죽는다** | 기본 `06`·응용 `07`·`08` 은 각이 **한 벌로 주어져** 계산이 한 줄이다. 기본 `74` 는 이등변이면서 「$\overline{AB}=\overline{AC}$」를 **발문이 못 박아** 경우가 하나다. 심화하 `12`(외심과 내심)는 두 각이 다 주어진다. `139X` 는 **경우를 스스로 나누는 걸음**이 앞에 있고, 답이 «한 값»이 아니라 **살아남은 값들의 합**이며, 죽는 경우가 «왜 죽는지»를 수로 보여야 한다 |
 *
 * ## ⑶ 🔴 앞 물결들이 **실제로 새어 나간 자리** — 여기서 어떻게 막았나
 *
 * 전부 「값은 맞고 KaTeX 도 초록」이라 값 검산·냄새 자가 구조적으로 못 보던 부류다.
 *
 * ㉮ **해설이 정답지 한 단을 넘었다**(3차 중1 `53V`, 1242px · 판의 53%). → 넷 다 제품
 *    `estimateSolutionPx` 로 **씨앗 블록 넷 × 600판**을 재어 **700px 아래**로 잠근다.
 *    그렇다고 **걸음을 지우지 않는다**(D-116 ⑹) — `136X` 의 평행 두 갈래는 각각 한 줄로
 *    두되 「$y$절편이 다르므로 겹치지 않는다」를 **반드시** 적고, `139X` 의 죽는 두 경우는
 *    **죽는 까닭을 수로** 적는다.
 * ㉯ **해설이 「자연수」 걸음을 건너뛰었다**(3차 중2 `38V`, 59.2%). → 넷 다 **부등식을
 *    한 줄도 세우지 않는다.** 그래서 「정수 경계로 뛰는」 자리 자체가 없다.
 *    ⚠️ 공용 훑개(`probe-middle-extending-tiers.boundStepFaults`)에게 이 갈래의
 *    「정수 경계 걸음 0」은 «깨끗»이 아니라 **«잴 것이 없다»** 다 — 시험이 그 사실을
 *    스스로 찍는다(부등호가 지면에 하나도 없음을 전량에서 확인한다).
 * ㉰ **해설이 기약이 아닌 분수를 찍었다**(3차 중1 `52V`, 17.5%). → 지면에 나오는
 *    «숫자/숫자» 분수는 `139X` 의 $\dfrac{1}{2}$ 뿐이고 그것은 기약이다. `138X` 의
 *    계산 줄은 분자를 **`\dfrac{12\times5}{3}` 처럼 곱의 꼴**로 적어 「약분 전 값」이
 *    애초에 기약 판정 대상이 아니게 했고, `137X`·`136X` 는 숫자 분수를 아예 안 쓴다.
 *    그러므로 그 자의 «0» 은 «못 셈»이 아니라 **«잴 것이 없다»** 다(시험이 찍는다).
 * ㉱ **발문이 스스로 못 박은 상한을 오답이 넘었다**(4차 중2 `37W`, 51.7%).
 *    → 넷 다 「전체를 $1$ 로 놓고」류 상한을 **선언하지 않는다.** 공용
 *    `declaredUpperBound` 가 읽는 표현이 네 발문 어디에도 없다(시험이 전량에서 `null`
 *    임을 잠근다). 그러므로 그 결함의 자리 자체가 없다.
 * ㉲ **정답이 «구간»이면 파생 오답이 뒤집힌다**(3차 중2 `35V`, 13.1%). → 넷 다 정답이
 *    **한 값**이다(분수도 구간도 없다). 구간 답이 없으므로 그 대가를 안 치른다.
 * ㉳ **해설의 «말»을 지키는 시험이 없었다**(4차, 중1 10줄·중2 3줄이 무방비).
 *    → 굳힘 개념과 마무리 논거를 진술하는 줄마다 시험이 **낱말을 읽고**, 그 낱말을
 *    뒤집으면 빨개지는 눈금을 같이 뒀다(`middleM2Top5i.test.ts` ⑹).
 *    `136X` 의 「평행」·「$y$절편」·「한 점에서」·「서로 다르므로」, `137X` 의 「치환」
 *    대신 쓰는 「놓으면」·「더하면」·「빼면」, `138X` 의 「평행」·「대각선」·「나누는」,
 *    `139X` 의 「같은 두 각」·「될 수 없다」·「세 가지」가 그 자리다.
 * ㉴ **지면이 자기가 한 줄 앞에 세운 제약을 스스로 어긴다**(4차 중3 `55W`, 100%).
 *    → `139X` 는 「$180^\circ-2\times\alpha^\circ$ 가 양수가 아니면 그런 삼각형은 없다」를
 *    세운 **뒤** 살아남은 경우만 값으로 옮긴다. 죽은 경우의 값이 답의 나열이나 합에
 *    **섞여 있지 않은지** 시험이 전량에서 확인한다. `136X` 도 같다 — 「$y$절편이 달라야
 *    평행」을 세운 뒤 실제로 그 두 절편이 다른지 지면이 수로 보인다.
 * ㉵ **자료를 정렬해 찍으면 «보이는 자리»가 순위를 암시한다**(4차 중1 `63W`, 100%).
 *    → `136X` 의 세 기울기 $m_1$, $m_2$, $a_3$ 는 **크기 순으로 안 놓는다**(어느 자리가
 *    가장 큰지 시험이 세 자리 모두에 나오는지 센다). `139X` 의 세 경우도 값의 크기와
 *    무관한 **고정된 논리 순서**(같은 두 각이 무엇인가)로 적는다.
 * ㉶ **D-20 손실 원장을 어림하지 않는다.** 가드를 **하나씩만 끈** 전수 값을 시험 파일
 *    ⑺ 에 적었다(판 수와 답 수의 측정점을 «매개변수를 훑어 통과한 조합» 한 자리로 맞췄다).
 * ㉷ **내보낸 순수 함수의 주석이 코드와 어긋나면 안 된다**(4차 중3 `solveBoxCases`).
 *    → 굳힘 함수 넷의 주석이 단언하는 것을 시험이 **직접 부르는 눈금**으로 물게 했다.
 * ㉸ **우리말** — 「그중」은 붙여 쓴다. 수 뒤 조사는 `m2Josa` **한 곳**에서 계산한다.
 *
 * ## ⑷ 계약 (이웃 모듈과 한 벌)
 *
 * 1. **정답을 먼저 뽑고 발문을 역산한다.**
 * 2. `facts` 로 정답 문자열을 **다시 지을 수 있다**(시험이 왕복으로 잠근다).
 *    `facts.x` 는 답의 **첫 수** — `136X` 는 기울기의 합, `137X` 는 $xy$,
 *    `138X` 는 두 밑변의 합, `139X` 는 각의 크기의 합이다.
 * 3. 숫자는 전부 `$...$` 안에 (`elementary/rules` `bareNumbers`).
 * 4. `attempt` 가 다 떨어지면 **던진다** — 조용히 기본값을 내지 않는다.
 * 5. 그림이 없으므로 발문이 **지면을 가리키지 않는다**(`pointsAtFigure`).
 * 6. 🔴 **해설이 걸음을 건너뛰지 않는다.** 후보를 견주는 갈래(`136X`·`139X`)는
 *    **죽는 후보가 왜 죽는지**까지 적는다.
 * 7. 🔴 **낱말 뒤 조사를 손 목록으로 적지 않는다.** 수 뒤 조사는 `m2Josa` 가 계산한다.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { attempt, pickDistinct } from "./m1Shared";
import { eulReul, euroRo, waGwa } from "./m2Josa";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";
const BOOK_ALG = "2-1";
const BOOK_GEO = "2-2";

/** RPM 색인 정본(`scripts/rpm/rpm-type-catalog.json`)의 중단원 이름 — 글자 그대로. */
const MINOR_LINEQ = "일차함수와 일차방정식의 관계";
const MINOR_SYSTEM = "연립일차방정식";
const MINOR_PARALLEL = "평행선 사이의 선분의 길이의 비";
const MINOR_INCENTER = "삼각형의 외심과 내심";

/**
 * 우리 `Unit.section` 정확한 이름 (`prisma/seed-data/units.ts` 실측).
 * 눈으로 못 가르는 공백·조사가 있으므로 시험이 단원 정본에 **대조**한다.
 */
const SEC = {
  일차방정식그래프: "일차함수와 일차방정식",
  여러연립: "여러 가지 연립방정식의 풀이",
  평행선비: "평행선 사이의 선분의 길이의 비",
  내심: "삼각형의 내심",
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

function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}

/**
 * 계수 붙은 항 — `$1x$`·`$-1x$` 를 지면에 **안 낸다**(`pageSmells` 「계수 1 을 적었다」).
 * 계수 $0$ 은 부르는 쪽이 막는다(여기서 `0x` 를 내면 그 자체가 결함이다).
 */
export function coefTerm(c: number, sym: string): string {
  if (c === 1) return sym;
  if (c === -1) return `-${sym}`;
  return `${c}${sym}`;
}

/** 이어 붙일 상수항 — `+5` / `-5`. `+-` 가 나올 자리가 없다. */
export function signedTerm(n: number): string {
  return n < 0 ? `-${-n}` : `+${n}`;
}

/** 직선 $mx-y+b=0$ 의 지면 몸통. `$` 는 밖에서 감싼다. */
export function lineEquation(m: number, b: number): string {
  return `${coefTerm(m, "x")}-y${signedTerm(b)}=0`;
}

/** 직선 $y=mx+b$ 의 지면 몸통. */
export function slopeForm(m: number, b: number): string {
  return `${coefTerm(m, "x")}${signedTerm(b)}`;
}

/** 주격 조사 — 받침 판정은 `m2Josa.eulReul` **한 곳**에서 온다. */
function iGa(n: number): "이" | "가" {
  return eulReul(n) === "을" ? "이" : "가";
}

/** 보조사 — `iGa` 와 같은 까닭으로 `m2Josa` 한 곳에서 온다. */
function eunNeun(n: number): "은" | "는" {
  return eulReul(n) === "을" ? "은" : "는";
}

/**
 * 발문에 **찍힌 수**로 한두 번 연산해 얻을 수 있는 값 — 지름길 가드가 쓴다.
 *
 * 「한두 번」의 뜻: 낱값 그 자체와 그 부호 반대, 그리고 두 값의 합·차·곱·나누어
 * 떨어지는 몫. 여기에 답이 들어 있으면 학생이 **풀지 않고 집을 수 있다.**
 *
 * ⚠️ 이 목록은 **손으로 적은 것**이라 새는 자리가 있다(세 번 연산하면 못 본다).
 *    그래서 시험이 이 함수를 부르지 않고 **자기 목록으로 다시 세고**, 우연 수준을
 *    «같은 자루에 다른 판의 답»으로 함께 잰다(치환 대조).
 */
export function pageShortcutValues(nums: readonly number[]): Set<number> {
  const out = new Set<number>();
  for (const a of nums) {
    out.add(a);
    out.add(-a);
  }
  for (const a of nums) {
    for (const b of nums) {
      if (a === b) continue;
      out.add(a + b);
      out.add(a - b);
      out.add(a * b);
      if (b !== 0 && a % b === 0) out.add(a / b);
    }
  }
  return out;
}

// ═══════════════════════════════════════════════════════════
// 136X  세 직선이 삼각형을 이루지 않게 하는 상수를 모두 찾아 더하기  (심화상)
// ═══════════════════════════════════════════════════════════

/**
 * **굳힘 함수** — 세 직선이 삼각형을 이루지 **않도록** 하는 $a$ 를 **모두** 낸다.
 *
 * 두 직선 $y=m_1x+b_1$, $y=m_2x+b_2$ 와 $y=ax+c$ 를 받는다. 삼각형이 안 되는 경우는
 * ⑴ 셋째가 첫째와 평행 ⑵ 셋째가 둘째와 평행 ⑶ 세 직선이 한 점에서 만남, 이 셋뿐이다.
 *
 * 🔴 **굳힘의 인자는 `includeConcurrent` 다.** 「한 점에서 만나는 경우」를 통째로
 * 빠뜨리면 답이 $m_1+m_2$ 로 줄어든다 — 학생이 가장 흔히 빠뜨리는 갈래이고, 이 유형이
 * 재려는 바로 그 마디다. (`false` 는 제품이 안 쓰는 길이다. 시험이 흔들어 잰다.)
 *
 * 낼 수 없는 자리에서는 **`null`** 을 낸다 — 앞의 두 직선이 이미 평행하거나(그러면
 * 어떤 $a$ 라도 삼각형이 안 된다), 셋째 직선이 앞의 것과 **겹칠 수 있거나**(평행이
 * 아니다), 교점이 $y$축 위에 있거나(셋째 직선의 기울기로 그 점을 못 겨눈다),
 * 한 점에서 만나게 하는 기울기가 정수가 아닐 때다.
 */
export function noTriangleSlopes(
  m1: number,
  b1: number,
  m2: number,
  b2: number,
  c: number,
  includeConcurrent = true,
): number[] | null {
  if (m1 === m2) return null;
  // 셋째 직선이 첫째(또는 둘째)와 **겹치면** 평행이 아니다 — 그 값은 후보가 못 된다.
  //
  // ⚠️ **기본 경로(`includeConcurrent=true`)에서 이 줄은 죽어 있다** — 변이 시험이
  //    「산출물이 그대로」라고 판정을 **거부**해서 드러났다. 까닭은 대수적이다:
  //    $c=b_1$ 이면 교점 $P=(x_0,\ m_1x_0+b_1)$ 에 대해
  //    $a_3=\dfrac{y_0-c}{x_0}=\dfrac{m_1x_0+b_1-b_1}{x_0}=m_1$ 이므로,
  //    아래 `a3 === m1` 줄이 **늘 먼저** 문다(둘째 직선도 같다).
  //    이 줄이 실제로 무는 자리는 `includeConcurrent=false` 뿐이고, 시험의 굳힘 함수
  //    눈금이 **그 경로로** 잰다. **가드로 읽지 말 것.**
  if (c === b1 || c === b2) return null;
  const out = [m1, m2];
  if (includeConcurrent) {
    const xDen = m1 - m2;
    const xNum = b2 - b1; // 교점의 $x$좌표는 $\dfrac{b_2-b_1}{m_1-m_2}$
    if (xNum === 0) return null; // 교점이 $y$축 위 — 기울기로 겨눌 수 없다
    const num = (b1 - c) * xDen;
    if (num % xNum !== 0) return null;
    const a3 = m1 + num / xNum;
    if (a3 === m1 || a3 === m2) return null;
    out.push(a3);
  }
  return out;
}

const NO_TRIANGLE: TypeEntry[] = [
  def(
    BOOK_ALG,
    MINOR_LINEQ,
    "136X",
    "세 직선이 삼각형을 이루지 않게 하는 상수의 합",
    SEC.일차방정식그래프,
    "심화상",
    (rng): Body =>
      attempt(6000, (): Body | null => {
        const x0 = pick(rng, [-4, -3, -2, -1, 1, 2, 3, 4] as const);
        const y0 = intBetween(rng, -9, 9);
        const slopePool = [-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6] as const;
        const [m1, m2, a3] = pickDistinct(rng, slopePool, 3) as [
          number,
          number,
          number,
        ];
        const b1 = y0 - m1 * x0;
        const b2 = y0 - m2 * x0;
        const c = y0 - a3 * x0;
        // $y$절편이 $0$ 이면 지면에 `+0` 이 난다(`pageSmells` 「상수 0 을 더했다」).
        if (b1 === 0 || b2 === 0 || c === 0) return null;
        if (Math.abs(b1) > 29 || Math.abs(b2) > 29 || Math.abs(c) > 29)
          return null;
        // 굳힘 함수가 실제로 그 셋을 내는지 — 여기서 재면 «도장»이므로 시험이 흔든다.
        const found = noTriangleSlopes(m1, b1, m2, b2, c);
        if (found === null || found.length !== 3) return null;
        if (
          [...found].sort((p, q) => p - q).join(",") !==
          [m1, m2, a3].sort((p, q) => p - q).join(",")
        )
          return null;
        const sum = m1 + m2 + a3;
        // 🔴 **찍기** — 세 값 가운데 둘의 합이 $0$ 이면 나머지 하나가 곧 답이 된다.
        //    그러면 학생이 «한 경우만 풀고 그 값을 적어» 맞는다. 이 줄은 시험이
        //    찾아 준 자리다(실측 `$-6x-y-25=0$, $6x-y+23=0$, $ax-y-17=0$` — $m_1+m_2=0$
        //    이라 답 $-4$ 가 $a_3$ 와 같았다). 지름길 가드는 이것을 **구조적으로 못 본다** —
        //    $a_3$ 는 발문에 안 찍히기 때문이다.
        if (m1 + m2 === 0 || m2 + a3 === 0 || m1 + a3 === 0) return null;
        // 🔴 ㉵ 지름길 — 발문에 찍힌 다섯 수의 한두 번 연산으로 답이 나오면 버린다.
        if (pageShortcutValues([m1, b1, m2, b2, c]).has(sum)) return null;
        // 답이 $0$ 이면 「합이 $0$」이 한 자리에 몰린다(전수로 재어 넣은 줄이다).
        if (sum === 0) return null;

        const inter = `(${x0},\\ ${y0})`;
        return {
          content:
            `세 직선 $${lineEquation(m1, b1)}$, $${lineEquation(m2, b2)}$, ` +
            `$ax-y${signedTerm(c)}=0$이 삼각형을 이루지 않도록 하는 모든 상수 $a$의 값의 합을 구하시오.`,
          answer: `$${sum}$`,
          solution: [
            `세 직선이 삼각형을 이루지 않는 경우는 두 직선이 서로 평행한 경우와 세 직선이 한 점에서 만나는 경우뿐이다.`,
            `세 직선을 $y$에 대하여 풀면 $y=${slopeForm(m1, b1)}$, $y=${slopeForm(m2, b2)}$, $y=ax${signedTerm(c)}$이므로 기울기는 차례로 $${m1}$, $${m2}$, $a$이다.`,
            `앞의 두 직선은 기울기가 $${m1}$${waGwa(m1)} $${m2}$${euroRo(m2)} 서로 달라 한 점에서 만나므로, 평행이 생기려면 셋째 직선이 앞의 두 직선 가운데 하나와 평행해야 한다.`,
            `$a=${m1}$이면 셋째 직선은 기울기가 첫째 직선과 같고 $y$절편은 $${c}$${waGwa(c)} $${b1}$${euroRo(b1)} 서로 다르므로 두 직선이 평행하다.`,
            `$a=${m2}$이면 셋째 직선은 기울기가 둘째 직선과 같고 $y$절편은 $${c}$${waGwa(c)} $${b2}$${euroRo(b2)} 서로 다르므로 두 직선이 평행하다.`,
            `앞의 두 직선의 식을 연립하여 풀면 교점은 $${inter}$이고, 셋째 직선이 이 점을 지나면 $${y0}=${coefTerm(x0, "a")}${signedTerm(c)}$이므로 $a=${a3}$이다.`,
            `구한 세 값 $${m1}$, $${m2}$, $${a3}$${eunNeun(a3)} 서로 다르므로 조건을 만족시키는 $a$의 값은 이 셋뿐이다.`,
            `따라서 구하는 합은 $${m1}${signedTerm(m2)}${signedTerm(a3)}=${sum}$이다.`,
            `실제로 $a=${a3}$일 때 셋째 직선은 $y=${slopeForm(a3, c)}$이고, 이 직선은 앞의 두 직선의 교점을 지난다.`,
          ].join("\n"),
          facts: {
            x: sum,
            m1,
            b1,
            m2,
            b2,
            c,
            a3,
            px: x0,
            py: y0,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 137X  공통부분을 한 문자로 놓고 푸는 연립방정식  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * **굳힘 함수** — 치환해서 얻은 $A=x+y$, $B=x-y$ 에서 $x$, $y$ 를 되돌린다.
 *
 * 두 식을 변끼리 더하면 $2x=A+B$, 빼면 $2y=A-B$ 다.
 *
 * 🔴 **굳힘의 인자는 `halve` 다.** 「$2$로 나눈다」를 빠뜨리면 $x$, $y$ 가 **두 배**가
 * 되고 $xy$ 는 **네 배**가 된다 — 치환한 문제에서 학생이 가장 흔히 하는 실수이고,
 * 이 유형이 재려는 바로 그 마디다. (`halve=false` 는 제품이 안 쓰는 길이다.)
 *
 * $A$ 와 $B$ 의 홀짝이 다르면 $x$, $y$ 가 정수가 아니므로 **`null`** 을 낸다.
 */
export function recoverXY(
  u: number,
  v: number,
  halve = true,
): [number, number] | null {
  if ((u + v) % 2 !== 0) return null;
  if (!halve) return [u + v, u - v];
  return [(u + v) / 2, (u - v) / 2];
}

/**
 * 정수 계수 연립 $p_1A+q_1B=r_1$, $p_2A+q_2B=r_2$ 의 해 — **정수 해일 때만** 낸다.
 * (판별식이 $0$ 이면 해가 없거나 무수히 많다 — 그때도 `null`.)
 */
export function solvePair(
  p1: number,
  q1: number,
  r1: number,
  p2: number,
  q2: number,
  r2: number,
): [number, number] | null {
  const det = p1 * q2 - p2 * q1;
  if (det === 0) return null;
  const an = r1 * q2 - r2 * q1;
  const bn = p1 * r2 - p2 * r1;
  if (an % det !== 0 || bn % det !== 0) return null;
  return [an / det, bn / det];
}

const SUBSTITUTED_SYSTEM: TypeEntry[] = [
  def(
    BOOK_ALG,
    MINOR_SYSTEM,
    "137X",
    "공통부분을 한 문자로 놓고 푸는 연립방정식",
    SEC.여러연립,
    "심화중",
    (rng): Body =>
      attempt(8000, (): Body | null => {
        const a = pick(rng, [2, 3, 4, 5, 6] as const);
        const b = pick(rng, [2, 3, 4, 5, 6] as const);
        if (a === b) return null;
        const L = lcm(a, b);
        if (L > 20) return null;
        const sgn = pick(rng, [1, -1] as const); // 둘째 분수의 부호
        const m = pick(rng, [2, 3, 4, 5] as const);
        const n = pick(rng, [-5, -4, -3, -2, 2, 3, 4, 5] as const);
        // 🔴 $|n|=m$ 이면 둘째 식이 $2m x=d$ 또는 $2m y=d$ 로 **접혀** 한 문자가
        //    거저 나온다 — 치환할 까닭이 사라지므로 이 유형이 아니다.
        if (Math.abs(n) === m) return null;

        // 해를 먼저 뽑고 발문을 역산한다 (계약 ⑷.1).
        const u = a * intBetween(rng, -5, 5); // $A=x+y$ 는 $a$ 의 배수
        const v = b * intBetween(rng, -5, 5); // $B=x-y$ 는 $b$ 의 배수
        if (u === 0 || v === 0) return null;
        const xy = recoverXY(u, v);
        if (xy === null) return null;
        const [x, y] = xy;
        // $|x|$ 나 $|y|$ 가 $1$ 이면 마지막 줄이 `\times1` 이 되어 지면이 흉하다.
        if (Math.abs(x) < 2 || Math.abs(y) < 2) return null;
        if (Math.abs(x) > 12 || Math.abs(y) > 12) return null;

        const c = u / a + (sgn * v) / b; // 첫째 식의 우변 — 정수여야 한다
        if (!Number.isInteger(c) || c === 0) return null;
        const d = m * u + n * v; // 둘째 식의 우변
        if (d === 0) return null;
        if (Math.abs(c) > 20 || Math.abs(d) > 60) return null;

        // 분모를 없앤 첫째 식 $P A + Q B = R$
        const P = L / a;
        const Q = (sgn * L) / b;
        const R = c * L;
        const solved = solvePair(P, Q, R, m, n, d);
        if (solved === null) return null;
        if (solved[0] !== u || solved[1] !== v) return null;

        // $B$ 를 없애는 가감법 — **곱하는 수는 둘 다 양수**로 적는다(음수를 곱하라고
        // 시키면 지면이 흉하고 학생이 부호를 잃는다). $B$ 의 계수 부호가 같으면 빼고,
        // 다르면 더한다.
        const g2 = gcd(Q, n);
        const f1 = Math.abs(n) / g2;
        const f2 = Math.abs(Q) / g2;
        const sameSign = Q * n > 0;
        const leftA = sameSign ? f1 * P - f2 * m : f1 * P + f2 * m;
        const rightA = sameSign ? f1 * R - f2 * d : f1 * R + f2 * d;
        if (leftA === 0) return null;
        if (rightA % leftA !== 0 || rightA / leftA !== u) return null;
        if (Math.abs(leftA) > 60 || Math.abs(rightA) > 400) return null;

        const answer = x * y;
        // 🔴 ㉵ 지름길 — 발문에 찍힌 수의 한두 번 연산으로 답이 나오면 버린다.
        if (pageShortcutValues([a, b, c, m, n, d]).has(answer)) return null;

        const frac1 = `\\dfrac{x+y}{${a}}${sgn > 0 ? "+" : "-"}\\dfrac{x-y}{${b}}=${c}`;
        const paren = `${coefTerm(m, "(x+y)")}${n > 0 ? "+" : "-"}${coefTerm(Math.abs(n), "(x-y)")}=${d}`;
        const subst1 = `${coefTerm(P, "A")}${Q > 0 ? "+" : "-"}${coefTerm(Math.abs(Q), "B")}=${R}`;
        const subst2 = `${coefTerm(m, "A")}${n > 0 ? "+" : "-"}${coefTerm(Math.abs(n), "B")}=${d}`;
        const prod = y < 0 ? `${x}\\times(${y})` : `${x}\\times${y}`;
        // 곱하는 수가 $1$ 이면 「양변에 $1$을 곱하여」라는 헛걸음이 지면에 난다 —
        // 그 자리는 곱하지 말고 말로 건너뛴다.
        const joinWord = sameSign ? "빼면" : "더하면";
        const mulPhrase =
          f1 === 1 && f2 === 1
            ? `$B$를 없애기 위해 두 식을 변끼리 ${joinWord}`
            : f1 === 1
              ? `$B$를 없애기 위해 둘째 식의 양변에 $${f2}$${eulReul(f2)} 곱한 뒤 변끼리 ${joinWord}`
              : f2 === 1
                ? `$B$를 없애기 위해 이 식의 양변에 $${f1}$${eulReul(f1)} 곱한 뒤 변끼리 ${joinWord}`
                : `$B$를 없애기 위해 이 식의 양변에 $${f1}$${eulReul(f1)}, 둘째 식의 양변에 $${f2}$${eulReul(f2)} 곱하여 변끼리 ${joinWord}`;

        return {
          content:
            `연립방정식 $\\begin{cases}${frac1}\\\\${paren}\\end{cases}$의 해를 ` +
            `$x=p$, $y=q$라 할 때, $pq$의 값을 구하시오.`,
          answer: `$${answer}$`,
          solution: [
            `두 식에 $x+y$와 $x-y$가 되풀이되므로 $x+y=A$, $x-y=B$로 놓으면 주어진 연립방정식은 $\\dfrac{A}{${a}}${sgn > 0 ? "+" : "-"}\\dfrac{B}{${b}}=${c}$, $${subst2}$${iGa(d)} 된다.`,
            `첫째 식의 양변에 $${L}$${eulReul(L)} 곱하여 분모를 없애면 $${subst1}$이다.`,
            `${mulPhrase} $${coefTerm(leftA, "A")}=${rightA}$이므로 $A=${u}$이다.`,
            `이 값을 $${subst2}$에 넣으면 $${coefTerm(n, "B")}=${d - m * u}$이므로 $B=${v}$이다.`,
            `즉 $x+y=${u}$, $x-y=${v}$이다.`,
            `두 식을 변끼리 더하면 $2x=${u + v}$이므로 $x=${x}$이고, 변끼리 빼면 $2y=${u - v}$이므로 $y=${y}$이다.`,
            `따라서 $pq=xy=${prod}=${answer}$이다.`,
            `실제로 $x=${x}$, $y=${y}$${eulReul(y)} 넣으면 $x+y=${u}$, $x-y=${v}$이고, 둘째 식의 좌변은 $${m * u}${signedTerm(n * v)}=${d}$${iGa(d)} 되어 주어진 식과 맞는다.`,
          ].join("\n"),
          facts: {
            x: answer,
            a,
            b,
            c,
            m,
            n,
            d,
            u,
            v,
            xv: x,
            yv: y,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 138X  대각선이 자른 두 조각에서 사다리꼴의 두 밑변 되찾기  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * **굳힘 함수** — $\overline{EP}$, $\overline{PF}$ 에서 $\overline{BC}$, $\overline{AD}$ 를 되찾는다.
 *
 * $\overline{AE}:\overline{EB}=m:n$ 이고 $\overline{EF}\parallel\overline{BC}$ 이면
 * $\triangle ABC$ 에서 $\overline{EP}:\overline{BC}=m:(m+n)$ 이고,
 * $\triangle CAD$ 에서 $\overline{PF}:\overline{AD}=n:(m+n)$ 이다.
 *
 * 🔴 **굳힘의 인자는 `crossed` 다.** 앞 조각이 $m$ 에, 뒤 조각이 $n$ 에 걸린다는 것을
 * 뒤집어 걸면(=`false`) 두 밑변이 서로 바뀐 값으로 나온다 — 두 조각이 **서로 다른
 * 삼각형**에 걸려 있다는 것이 이 유형이 재려는 바로 그 마디다.
 * (`false` 는 제품이 안 쓰는 길이다. 시험이 흔들어 잰다.)
 *
 * 나누어떨어지지 않으면 **`null`** 을 낸다 — 그런 사다리꼴은 길이가 정수가 아니다.
 */
export function trapezoidBases(
  m: number,
  n: number,
  ep: number,
  pf: number,
  crossed = true,
): { ad: number; bc: number } | null {
  if (m < 1 || n < 1 || ep < 1 || pf < 1) return null;
  const s = m + n;
  const forBc = crossed ? m : n;
  const forAd = crossed ? n : m;
  if ((ep * s) % forBc !== 0 || (pf * s) % forAd !== 0) return null;
  return { ad: (pf * s) / forAd, bc: (ep * s) / forBc };
}

const TRAPEZOID_BASES: TypeEntry[] = [
  def(
    BOOK_GEO,
    MINOR_PARALLEL,
    "138X",
    "대각선이 자른 두 조각에서 사다리꼴의 두 밑변 구하기",
    SEC.평행선비,
    "심화중",
    (rng): Body =>
      attempt(6000, (): Body | null => {
        // 🔴 $2$ 부터 뽑는다 — $m=1$ 이나 $n=1$ 이면 지면에 **`\dfrac{7\times6}{1}`**
        //    처럼 분모가 $1$ 인 분수가 난다(눈으로 표본을 읽다가 찾았다. 값은 맞고
        //    `unreducedFractions` 는 분자가 순수 숫자가 아니라 구조적으로 못 본다).
        const m = intBetween(rng, 2, 5);
        const n = intBetween(rng, 2, 5);
        if (m === n) return null; // 비가 $1:1$ 이면 두 조각이 어느 삼각형인지 안 갈린다
        if (gcd(m, n) !== 1) return null; // 비는 기약으로 적는다
        const s = m + n;
        // $\alpha=1$ 이면 $\overline{PF}=n$ 이 되어 뒤 비례식이 $n:\overline{AD}=n:s$ 로
        // **접히고** 뒷걸음이 눈에 거저 보인다 — 그래서 $2$ 부터 뽑는다.
        const alpha = intBetween(rng, 2, 8); // $\overline{AD}=s\alpha$
        const beta = intBetween(rng, 3, 9); // $\overline{BC}=s\beta$
        if (alpha >= beta) return null; // 윗변이 아랫변보다 짧은 사다리꼴
        const ad = s * alpha;
        const bc = s * beta;
        if (ad < 6 || bc > 72) return null;
        const ep = m * beta;
        const pf = n * alpha;
        // ⚠️ **이 줄은 한 번도 못 문다**(전수에서 걸린 수 **0**) — $\beta\ge3$, $\alpha\ge2$
        //    이므로 $ep=m\beta\ge3$, $pf=n\alpha\ge2$ 다. 뜻을 적어 두는 줄이지
        //    **가드가 아니다.** 위 $\alpha$·$\beta$ 범위를 넓히면 그때 살아난다.
        if (ep < 2 || pf < 2) return null;
        // ⚠️ 이 줄과 아래 「뒤집으면 다름」은 **서로를 가린다**(둘 다 유일 원인 0).
        //    $ep=pf$ 이거나 $m=n$ 이면 뒤집어도 두 밑변의 합이 같아지기 때문이다:
        //    $\dfrac{s\,pf}{m}+\dfrac{s\,ep}{n}-\left(\dfrac{s\,pf}{n}+\dfrac{s\,ep}{m}\right)
        //     =s(pf-ep)\left(\dfrac1m-\dfrac1n\right)$.
        //    셋 가운데 하나만 지워도 통과 수가 안 바뀌고, **셋을 다 지우면**
        //    **8** 조합이 새로 들어온다(전수 $4\times4\times7\times7=784$ 에서
        //    통과 **249 → 257**, 여덟 다 $ep=pf$ 인 자리다). 뜻이 서로 다르므로
        //    셋 다 남긴다(거부 사유를 정확히 적으려고).
        // 🔴 2026-09-04: 여기 **271** 이라고 적혀 있었고 시험에는 **214** 라고
        //    적혀 있었다 — 서로 달랐고 **둘 다 틀렸다**. 적대 검문이 잡았고
        //    리드가 전수로 다시 세어 확인했다. 까닭은 대수적이다: 「비는 기약」
        //    ($\gcd(m,n)=1$)이 $m,n\in[2,5]$ 에서 $m=n$ 을 **이미 전부** 막으므로,
        //    그 셋이 새로 여는 자리는 $ep=pf$ 뿐이다.
        if (ep === pf) return null; // 두 조각이 같으면 어느 쪽이 어느 밑변인지 안 갈린다

        const back = trapezoidBases(m, n, ep, pf);
        if (back === null || back.ad !== ad || back.bc !== bc) return null;
        // 「어느 조각이 어느 밑변인지」를 뒤집어도 같은 답이면 재려는 마디가 없다.
        const flipped = trapezoidBases(m, n, ep, pf, false);
        if (flipped !== null && flipped.ad + flipped.bc === ad + bc)
          return null;

        const total = ad + bc;
        // 🔴 ㉵ 지름길 — 발문에 찍힌 네 수의 한두 번 연산으로 답이 나오면 버린다.
        if (pageShortcutValues([m, n, ep, pf]).has(total)) return null;

        const ef = ep + pf;
        return {
          content:
            `$\\overline{AD}\\parallel\\overline{BC}$인 사다리꼴 $ABCD$에서 변 $\\overline{AB}$ 위의 점 $E$와 변 $\\overline{DC}$ 위의 점 $F$를 ` +
            `$\\overline{AE}:\\overline{EB}=${m}:${n}$이고 $\\overline{EF}\\parallel\\overline{BC}$가 되도록 잡았다. ` +
            `대각선 $\\overline{AC}$와 $\\overline{EF}$의 교점을 $P$라 할 때 $\\overline{EP}=${ep}\\,\\mathrm{cm}$, $\\overline{PF}=${pf}\\,\\mathrm{cm}$이다. ` +
            `이때 $\\overline{AD}+\\overline{BC}$의 길이를 구하시오.`,
          answer: `$${total}\\,\\mathrm{cm}$`,
          solution: [
            `대각선 $\\overline{AC}$는 $\\overline{EF}$를 두 조각 $\\overline{EP}$와 $\\overline{PF}$로 나누는데, 앞 조각은 $\\triangle ABC$에, 뒤 조각은 $\\triangle CAD$에 걸려 있으므로 두 조각을 따로 본다.`,
            `$\\overline{EF}\\parallel\\overline{BC}$이므로 $\\triangle ABC$에서 $\\overline{EP}\\parallel\\overline{BC}$이고, $\\overline{AE}:\\overline{AB}=${m}:${s}$이므로 $\\overline{EP}:\\overline{BC}=${m}:${s}$이다.`,
            `즉 $${ep}:\\overline{BC}=${m}:${s}$이므로 $\\overline{BC}=\\dfrac{${ep}\\times${s}}{${m}}=${bc}\\,\\mathrm{cm}$이다.`,
            `또 $\\triangle ABC$에서 $\\overline{AP}:\\overline{PC}=\\overline{AE}:\\overline{EB}=${m}:${n}$이므로 $\\overline{CP}:\\overline{CA}=${n}:${s}$이다.`,
            `$\\overline{EF}\\parallel\\overline{AD}$이므로 $\\triangle CAD$에서 $\\overline{PF}:\\overline{AD}=\\overline{CP}:\\overline{CA}=${n}:${s}$이고, $${pf}:\\overline{AD}=${n}:${s}$이므로 $\\overline{AD}=\\dfrac{${pf}\\times${s}}{${n}}=${ad}\\,\\mathrm{cm}$이다.`,
            `따라서 $\\overline{AD}+\\overline{BC}=${ad}+${bc}=${total}\\,\\mathrm{cm}$이다.`,
            `실제로 $\\overline{EF}=${ep}+${pf}=${ef}\\,\\mathrm{cm}$이고 이 값은 $${ad}$${waGwa(ad)} $${bc}$ 사이에 있으므로 사다리꼴의 두 밑변 사이의 길이로 알맞다.`,
          ].join("\n"),
          facts: {
            x: total,
            m,
            n,
            ep,
            pf,
            ad,
            bc,
            ef,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 139X  이등변삼각형의 내심 — 가능한 각의 크기를 모두 찾아 더하기  (심화상)
// ═══════════════════════════════════════════════════════════

/**
 * **굳힘 함수** — 「$\triangle ABC$ 는 이등변삼각형이고 한 각이 $\alpha^\circ$」에서
 * **물은 각이 걸린 꼭짓점**의 크기로 가능한 값을 **모두** 낸다.
 *
 * 주어진 각의 꼭짓점을 $G$, 물은 각($\angle YIZ$)이 걸린 꼭짓점을 $W$, 나머지를 $V$ 라
 * 하면($G\ne W$), 크기가 같은 두 각이 어느 쌍인가로 경우가 셋이다.
 *
 *   ⑴ $\angle G=\angle W$ — 그러면 $\angle W=\alpha$, $\angle V=180-2\alpha$
 *   ⑵ $\angle G=\angle V$ — 그러면 $\angle W=180-2\alpha$
 *   ⑶ $\angle W=\angle V$ — 그러면 $\angle W=\dfrac{180-\alpha}{2}$
 *
 * 세 각의 크기는 모두 양수여야 하므로 $\alpha\ge90$ 이면 ⑴ 과 ⑵ 가 **죽는다.**
 *
 * 🔴 **굳힘의 인자는 `dropImpossible` 다.** 「양수가 아니면 그런 삼각형은 없다」를
 * 빠뜨리면 $\alpha\ge90$ 인 자리에서 **삼각형이 될 수 없는 값**이 답에 섞인다 —
 * 이 유형이 재려는 바로 그 마디다. (`false` 는 제품이 안 쓰는 길이다.)
 *
 * 나오는 순서는 값의 크기가 아니라 **위 ⑴⑵⑶ 의 논리 순서**다 — 정렬해서 내면
 * 지면의 나열이 순위를 암시한다(㉵).
 */
export function isoscelesTargetAngles(
  alpha: number,
  dropImpossible = true,
): number[] | null {
  if (alpha <= 0 || alpha >= 180) return null;
  const rest = 180 - 2 * alpha;
  const out: number[] = [];
  if (!dropImpossible || rest > 0) out.push(alpha); // ⑴
  if (!dropImpossible || rest > 0) out.push(rest); // ⑵
  out.push((180 - alpha) / 2); // ⑶
  return out;
}

/** 내심 성질 — 물은 각은 $90^\circ+\dfrac{1}{2}\times(\text{맞은편 꼭짓점의 각})$ 이다. */
export function incenterAngle(vertex: number): number {
  return 90 + vertex / 2;
}

/** 꼭짓점 셋 가운데 물은 각이 걸린 것을 뺀 두 글자 — `∠AIC` 는 $B$ 에 걸린다. */
const VERTEX_PAIR: Record<string, string> = {
  A: "BIC",
  B: "AIC",
  C: "AIB",
};

const ISOSCELES_INCENTER: TypeEntry[] = [
  def(
    BOOK_GEO,
    MINOR_INCENTER,
    "139X",
    "이등변삼각형의 내심에서 가능한 각의 크기의 합",
    SEC.내심,
    "심화상",
    (rng): Body =>
      attempt(6000, (): Body | null => {
        // 물은 각이 걸린 꼭짓점 $W$ 와 주어진 각의 꼭짓점 $G$ — 둘은 달라야 한다
        // ($G=W$ 이면 물은 각이 곧바로 굳어 경우를 나눌 까닭이 없다).
        const W = pick(rng, ["A", "B", "C"] as const);
        const others = (["A", "B", "C"] as const).filter((t) => t !== W);
        const G = pick(rng, others);
        const V = others.find((t) => t !== G)!;
        // $4$의 배수라야 세 값이 모두 정수다. ⚠️ **이 줄만 바꿔서는 결함이 안 난다** —
        // 아래 `Number.isInteger` 가 반각을 걸러 내기 때문이다(변이 시험에서 이 줄만
        // $2\times$ 로 바꾸면 **초록**이다). 둘은 **한 가드의 두 겹**이고, 둘을 **같이**
        // 지우면 지면에 $124.5^\circ$ 가 나가 시험이 빨개진다(실측).
        const alpha = 4 * intBetween(rng, 1, 44);
        // ⚠️ 아래 둘도 **유일 원인 0** 이다 — $\alpha=60$ 은 「값이 서로 다름」이,
        //    $\alpha=108$ 은 「지름길」이 같이 문다($135-\frac{108}{4}=108$ 이라 답이
        //    주어진 각과 같아진다). 거부 사유를 정확히 적으려고 셋 다 남긴다.
        if (alpha === 60) return null; // 정삼각형 — 세 값이 하나로 겹친다
        if (alpha === 108) return null; // 답이 주어진 각과 같아진다(지름길)
        if (alpha >= 180) return null;

        const targets = isoscelesTargetAngles(alpha);
        if (targets === null) return null;
        const values = targets.map((t) => incenterAngle(t));
        if (values.some((v) => !Number.isInteger(v) || v <= 90 || v >= 180))
          return null;
        if (new Set(values).size !== values.length) return null;
        const sum = values.reduce((s, v) => s + v, 0);
        // 「양수가 아니면 없다」를 지우면 답이 달라져야 한다 — 안 달라지면 그 마디가 없다.
        // ⚠️ **이 줄도 한 번도 못 문다**(전수에서 걸린 수 **0**) — $\alpha>90$ 이면
        //    느슨한 합 $405-\frac{3\alpha}{4}$ 와 참값 $135-\frac{\alpha}{4}$ 가
        //    $\alpha=540$ 에서만 같아지는데 그런 각은 없다. 뜻을 적어 두는 줄이고,
        //    그 마디를 실제로 지키는 것은 **`isoscelesTargetAngles` 의 `rest > 0`** 이다
        //    (변이 M19 가 빨강).
        const loose = isoscelesTargetAngles(alpha, false)!;
        const looseSum = loose
          .map((t) => incenterAngle(t))
          .reduce((s, v) => s + v, 0);
        if (alpha > 90 && looseSum === sum) return null;
        // 🔴 ㉵ 지름길 — 발문에 찍힌 수는 $\alpha$ 하나뿐이다.
        if (pageShortcutValues([alpha]).has(sum)) return null;

        const rest = 180 - 2 * alpha;
        const half = (180 - alpha) / 2;
        const alive = rest > 0;
        const asked = `\\angle ${VERTEX_PAIR[W]!}`;
        const lines: string[] = [
          `점 $I$가 $\\triangle ABC$의 내심이면 $${asked}=90^\\circ+\\dfrac{1}{2}\\angle ${W}$이므로, $${asked}$의 크기는 $\\angle ${W}$의 크기로 정해진다.`,
          `이등변삼각형은 두 변의 길이가 같은 삼각형이므로 크기가 같은 두 각이 있고, 그 두 각이 어느 쌍인가에 따라 다음 세 가지 경우로 나뉜다.`,
        ];
        if (alive) {
          lines.push(
            `⑴ $\\angle ${G}=\\angle ${W}$인 경우: 두 각이 모두 $${alpha}^\\circ$이므로 $\\angle ${V}=180^\\circ-2\\times${alpha}^\\circ=${rest}^\\circ$이고, 세 각의 크기가 모두 양수이므로 이런 삼각형이 있다. 이때 $${asked}=90^\\circ+\\dfrac{1}{2}\\times${alpha}^\\circ=${incenterAngle(alpha)}^\\circ$이다.`,
            `⑵ $\\angle ${G}=\\angle ${V}$인 경우: 두 각이 모두 $${alpha}^\\circ$이므로 $\\angle ${W}=180^\\circ-2\\times${alpha}^\\circ=${rest}^\\circ$이고, 이 값도 양수이므로 이런 삼각형이 있다. 이때 $${asked}=90^\\circ+\\dfrac{1}{2}\\times${rest}^\\circ=${incenterAngle(rest)}^\\circ$이다.`,
          );
        } else {
          lines.push(
            `⑴ $\\angle ${G}=\\angle ${W}$인 경우: 두 각이 모두 $${alpha}^\\circ$이면 나머지 각은 $180-2\\times${alpha}=${rest}$이므로 각의 크기가 될 수 없다. 그러므로 이런 삼각형은 없다.`,
            `⑵ $\\angle ${G}=\\angle ${V}$인 경우: 같은 셈으로 $\\angle ${W}=180-2\\times${alpha}=${rest}$${iGa(rest)} 되어 각의 크기가 될 수 없으므로 이런 삼각형도 없다.`,
          );
        }
        lines.push(
          `⑶ $\\angle ${W}=\\angle ${V}$인 경우: $\\angle ${W}=\\angle ${V}=\\dfrac{180^\\circ-${alpha}^\\circ}{2}=${half}^\\circ$이므로 $${asked}=90^\\circ+\\dfrac{1}{2}\\times${half}^\\circ=${incenterAngle(half)}^\\circ$이다.`,
        );
        if (alive) {
          lines.push(
            `구한 세 값 $${values[0]}^\\circ$, $${values[1]}^\\circ$, $${values[2]}^\\circ$는 서로 다르므로 가능한 $${asked}$의 크기는 이 셋뿐이다.`,
            `세 값의 합은 $${values[0]}+${values[1]}+${values[2]}=${sum}$이다.`,
          );
        } else {
          lines.push(
            `⑴과 ⑵가 모두 생기지 않으므로 살아남는 경우는 ⑶ 하나뿐이고, 가능한 $${asked}$의 크기도 $${values[0]}^\\circ$ 하나이므로 그 합은 같은 값이다.`,
          );
        }
        lines.push(
          `따라서 $${asked}$의 크기로 가능한 값의 합은 $${sum}^\\circ$이다.`,
        );

        return {
          content:
            `$\\triangle ABC$는 이등변삼각형이고 $\\angle ${G}=${alpha}^\\circ$이다. ` +
            `점 $I$가 $\\triangle ABC$의 내심일 때, $${asked}$의 크기로 가능한 값을 모두 구하여 그 합을 구하시오.`,
          answer: `$${sum}^\\circ$`,
          solution: lines.join("\n"),
          facts: {
            x: sum,
            alpha,
            rest,
            half,
            count: values.length,
          },
          figureSpec: null,
        };
      }),
  ),
];

/** 이 갈래가 소유한 유형 넷 — `generate.ts` 에는 **리드가** 넣는다. */
export const M2_TOP_5I: TypeEntry[] = [
  ...NO_TRIANGLE,
  ...SUBSTITUTED_SYSTEM,
  ...TRAPEZOID_BASES,
  ...ISOSCELES_INCENTER,
];
