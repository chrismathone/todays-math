/**
 * 중2 **확대 갈래 3차 물결**(`심화중`·`심화상`) — D-116.
 *
 * ## ⑴ 왜 새 파일인가
 *
 * `m2Top.ts` 를 잠그는 시험이 `expect(M2_TOP.length).toBe(5)` 로, `m2Top2.ts` 를
 * 잠그는 시험이 `expect(M2_TOP_2.length).toBe(4)` 로 **개수를 얼려** 두었다.
 * 거기에 유형을 더하면 그 줄이 빨개지고 초록으로 되돌리는 **유일한 길이 남의
 * 가드를 무르는 것**이 된다(`m1Top.ts`·`midSupB.ts` 머리말이 같은 자리에 선 까닭).
 * 그리고 오르카 다중 세션이 같은 파일을 동시에 만지면 병합에서 부딪힌다 —
 * 새 파일 하나 + `generate.ts` **spread 한 줄**이면 그 둘을 다 피한다.
 * (그 한 줄은 **리드가** 넣는다. 이 파일은 `generate.ts` 를 건드리지 않는다.)
 *
 * ## ⑵ 유형마다 — 안 굳는 마디 / 무엇이 굳히나 / 같은 소단원 심화하와 무엇이 다른가
 *
 * | 키 | 갈래 | 안 굳는 마디 | 무엇이 굳히나 | 심화하와 다른 축 |
 * |---|---|---|---|---|
 * | `일차부등식\|35V` | **심화중** | $x$·$y$ **각각의** 범위 | 발문은 $x+y$ 와 $x-y$ 라는 두 «조합»만 준다. 그 소단원의 부등식의 성질 셋(음수를 곱하면 방향이 바뀐다 · 변끼리 더한다 · 양수로 나누면 방향이 그대로다)이 후보를 **하나도 안 만들고** 구간 하나로 굳힌다 | 심화하 `56` 은 **낱개 문자**의 범위를 주고 **조합**($x-y$)을 묻는 정방향이고, 뒤집을 대상($y$)을 발문이 **이미 지목**한다. `35V` 는 화살표가 반대다 — 조합을 주고 낱개를 묻고, 나누는 걸음이 하나 더 붙으며, 답의 두 끝이 두 조합의 끝과 **엇갈려** 짝지어진다 |
 * | `연립일차방정식의 활용\|36V` | **심화중** | 남·여 **인원 자체** | 평균의 뜻으로 세운 식이 정리되면 **비만** 굳는다. 그 비를 다음 시험의 평균 식에 넣으면 문자가 **약분되어 사라져** 인원을 한 번도 구하지 않고 값이 나온다 | 심화하 `07A`(나이)도 응용 `05A`(전체 평균으로 인원 구하기)도 **합을 주므로** 두 값이 각각 굳고 해설이 「두 식을 연립하여 풀면 $x=\dots$, $y=\dots$」로 끝난다. `36V` 는 그 합을 **빼는 것**이 축이라 그 줄이 **구조적으로 없다** |
 * | `연립일차방정식\|37V` | **심화상** | 상수 $a$ | 굳지 **않는다** — 같은 $a$ 가 $x$·$y$ 두 계수 자리에 있어 계수비 조건이 $a^{2}=mq$ 가 되고 후보가 $a=r$·$a=-r$ **둘** 태어난다. **상수항까지 하나씩 대 봐야** 한쪽이 「무수히 많다」로 죽는다 | 심화하 `24A`·`26A` 는 미지 계수가 **한 자리**뿐이라 계수비 한 줄로 즉시 굳고 **후보가 아예 없다**. 거기서 상수항은 판정에 아무 일도 안 한다(설명으로만 붙는다) — `37V` 에서는 상수항이 **후보 하나를 죽이는 판정자로 승격**한다 |
 * | `연립일차방정식의 활용\|38V` | **심화상** | 세 종류의 개수 | 굳지 **않는다** — 식이 둘뿐이라 소거해도 미지수가 하나 남는다. 그다음은 「각 종류를 적어도 한 개씩」이라는 **자연수 조건**이 $x$ 의 창을 **양쪽에서** 자르고, 그 창의 후보를 하나씩 다 만들어야 가짓수가 정해진다 | 심화하 `07`(증감)도 응용 `31A`·`06` 도 **미지수가 둘**이라 해가 하나로 굳는다. `38V` 는 미지수를 셋으로 늘리되 식을 둘로 두어 **굳지 않게** 만든 것이 축이고, 묻는 것도 「몇 개인가」가 아니라 **「몇 가지인가」** 다 |
 *
 * ## ⑶ 🔴 2차 물결에서 **실제로 새어 나간 것** — 여기서 어떻게 막았나
 *
 * 전부 「값은 맞는데 지면이 틀린」 부류라 값 검산·KaTeX·조사 자가 **구조적으로 못 본다.**
 *
 * ㉮ **해설이 틀린 수를 적었다**(치명, 42.5% 문항). `31U` 의 「무한소수가 되는 까닭」이
 *    분자와의 약분을 빼먹어 바로 **윗줄과 모순**인 수를 적었다.
 *    → 넷 다 해설의 **모든 중간값**을 시험이 **다른 길로 다시 계산**해 맞댄다.
 *      그리고 해설이 같은 사실을 두 번 말하는 자리(나열 줄 ↔ 까닭 줄)는 **둘을 맞댄다.**
 *      `toContain` 류의 「해설에 이 문자열이 있나」는 **쓰지 않는다** — 마지막 줄 하나로
 *      충족되어 ㉮ 를 그대로 통과시킨다.
 * ㉯ **`+0`·`(x)^{2}`** 가 지면에 나갔다. → 생성에서 $0$ 이 되는 자리를 **막는다**
 *    (`35V` 는 $d_1\ne0$·$d_2\ne0$, `37V` 는 $n\ne0$·$k\ne0$). 계수 $1$ 은 `coefTerm` 이
 *    지면에서 지운다.
 * ㉰ **한국어 활용 오류**(「더 기므로」). → 「곱하면」·「더하면」·「나누면」·「올랐다면」·
 *    「샀다고 하면」만 쓴다. ㄹ 어간 활용을 **만들지 않는다.**
 * ㉱ **발문의 글자와 해설의 글자가 부딪혔다**(400/400). → `35V`·`37V` 는 발문이 쓰는
 *    문자($x$·$y$·$a$)만 해설도 쓴다. `36V`·`38V` 는 **발문에 문자가 하나도 없다.**
 *    설명하려고 $A$·$k$ 같은 새 문자를 **안 들인다.**
 * ㉲ **손 목록을 쓰면 눈이 먼다.** → 시험이 `src/__tests__/helpers/midPage.ts` 의
 *    **공용 계량기**(`pageSmells`·`josaMismatches`)를 그대로 부른다. 손 목록을 더
 *    두더라도 공용 자를 **빼지 않는다.**
 *    ⚠️ 그 자는 `$3$가지` 를 **조사 「가」로 잘못 읽는다**(단위 명사인데). 그래서
 *    `38V` 의 답은 「가짓수」를 묻고 `$3$` 으로만 적는다 — **거짓 경보는 가드를
 *    끈다**(2026-08-20). 남의 파일이라 고치지 않고 **피한다.**
 * ㉳ **소단원 이름에 가는 공백(U+2009)이 있는 것이 있다.** → 이 넷의 이름은 손으로
 *    안 적고, 시험이 `prisma/seed-data/units.ts`(단원 정본)와 RPM 색인에 **대조**한다.
 *
 * ## ⑷ 🔴 초등이 네 물결에 걸쳐 물린 함정 셋 — 여기서 어떻게 피했나
 *
 * ㉠ **창을 한쪽 끝만 주면 굳힘이 장식이 된다.** 「살아남는 후보가 언제나 목록의 같은
 *    자리」면 굳힘 조건은 «어느 후보인가»를 한 번도 안 고른다(정보는 있고 **선택력이 0**).
 *    - `35V`·`36V` — 후보 목록이 **아예 없다**(값이 하나로 굳는다). 이 축은 여기
 *      **없다** — 「없다」와 「초록이다」를 가르려고 그 사실을 시험에 **적어 둔다.**
 *      대신 「굳힘을 안 읽은 학생의 답」(뒤집기를 빠뜨린 값 · 인원이 같다고 본 값)을
 *      따로 재서 참과 **다름**을 불변식으로 잠근다.
 *    - `37V` — 후보 목록이 **실재한다**($\{r,-r\}$). 그래서 불변식 셋으로 막는다:
 *      ⓐ 사는 후보가 씨앗에 따라 «양수 쪽»과 «음수 쪽»이 **둘 다 나온다**,
 *      ⓑ 「첫 자리를 집으면 맞다」도 「끝 자리를 집으면 맞다」도 **늘 참이 아니다**,
 *      ⓒ 상수항을 안 보고 두 후보를 다 적은 답($\pm r$)은 참과 **다르다**.
 *    - `38V` — 답이 **가짓수**라 목록의 어느 자리도 답이 될 수 없다. 그래도 「첫
 *      후보의 $x$ 만 읽고 낸 값」·「끝 후보의 $x$ 만 읽고 낸 값」을 따로 재고, 가짓수가
 *      씨앗에 따라 실제로 **흔들리는지**(늘 셋이면 세지 않고도 맞힌다)를 잠근다.
 *
 * ㉡ **「굳힘이 항등식」** — 굳힘 조건을 지우고 같은 값으로 다시 풀어 답이 그대로면
 *    그것은 굳힘이 아니라 장식이다. 넷 다 굳힘을 **인자로 받는 순수 함수**로 뽑아
 *    두었다 — `rangeOfLetter` · `newAverage` · `survivingRoot` · `waysToBuy`.
 *    시험이 그 인자를 흔들어 답이 실제로 달라지는지 잰다.
 *
 * ㉢ **갈래끼리 겹침** — 넷 다 위 표의 「심화하와 다른 축」을 먼저 읽고 정했다.
 *    판정은 `scripts/qa/probe-middle-extending-tiers.ts --overlap` 의 자로 하고,
 *    쌍마다 **천장(자기 자신과의 닮음)을 먼저 찍는다** — 천장이 낮으면 «겹침 없음»이
 *    아니라 **«판정 불가»** 로 적는다.
 *
 *    🔴 **첫 판이 실제로 걸렸다.** `35V` 가 심화하 `56` 과 낱말 Jaccard **0.80**
 *    (그 자의 «🔴겹침» 문턱)이었다. 두 발문이 다 짧고 상투구(「값의」·「범위를」·
 *    「구하시오」)만으로 이루어져서였다 — **발문 첫머리를 바꾸는 것만으로는 안 된다.**
 *    「무엇의 범위가 주어졌는가」를 말로 적어 갈랐다(0.80 → **0.33**).
 *    `37V` 도 응용 `17` 과 **0.60**(🟡살펴볼것)이라, 이 갈래를 «상»으로 만드는 성질
 *    (같은 $a$ 가 두 계수 자리에 있다)을 한 문장으로 적어 갈랐다(0.60 → **0.35**).
 *    ⚠️ 「수+정답」 열쇠는 `35V`·`36V` 에서 **천장이 0.5 아래**라 **«판정 불가»** 다 —
 *    그 두 갈래는 낱말 쪽 판정만 뜻이 있다.
 *
 * ## ⑸ 번호 규약 — **`V` 접미사**
 *
 * `extensionNumberReason`(`src/__tests__/helpers/rpmCatalog.ts`)이 「숫자+영문 대문자
 * 한 글자」를 「색인 번호와 절대 안 겹친다」로 통과시킨다. 이미 `A`(색인 밖 보강)·
 * `T`(1차 물결)·`U`(2차 물결)가 쓰였으므로 3차 물결은 **`V`** 다 — `35V`~`38V`.
 *
 * ## ⑹ 계약 (이웃 모듈과 한 벌)
 *
 * 1. **정답을 먼저 뽑고 발문을 역산한다.**
 * 2. `facts` 로 정답 문자열을 **다시 지을 수 있다**(시험이 왕복으로 잠근다).
 *    `facts.x` 는 답의 **첫 수**다 — `35V` 는 구간의 왼쪽 끝, `36V` 는 점수,
 *    `37V` 는 살아남은 $a$, `38V` 는 가짓수.
 * 3. 숫자는 전부 `$...$` 안에 (`elementary/rules` `bareNumbers` 가드).
 * 4. `attempt` 가 다 떨어지면 **던진다** — 조용히 기본값을 내지 않는다.
 * 5. 그림이 없으므로 발문이 **지면을 가리키지 않는다**(`pointsAtFigure`).
 * 6. 🔴 **해설이 걸음을 건너뛰지 않는다** (D-116 ⑸). 「풀면」·「구하면」 뒤에 중간
 *    결과 없이 답만 오면 안 된다. 후보를 견주는 갈래(`37V`·`38V`)는 **후보를 하나씩
 *    적고 각각 왜 살고 죽는지**까지 적는다.
 *
 * ## ⑺ 정찰과 달라진 것 — 근거를 남긴다
 *
 * 1. 정찰은 `37V` 의 $(m,q)$ 후보에 $(4,9)$ 를 넣었다. 그러면 $r=6$ 이고 둘째 식이
 *    첫째 식의 $\dfrac{9}{6}=1.5$ 배라 **해설에 소수 배수**가 나온다. 그래서 $(m,t)$
 *    로 다시 매개변수화했다 — $r=mt$, $q=mt^{2}$ 이면 배수가 반드시 정수 $t$ 다.
 *    $(4,9)$ 는 그 꼴이 아니라 빠졌고, $(3,12)$·$(2,8)$·$(2,18)$·$(3,27)$ 은 남았다.
 * 2. 정찰은 `38V` 의 변형 축으로 「$500$·$400$·$200$ 이면 소거식이 $3x+2y=K$ 가 되어
 *    홀짝 조건이 한 번 더 거른다」를 들었다. 그 판은 **안 냈다** — $y$ 의 계수가 $1$ 이
 *    아니면 해설에 나누어떨어짐 판정 줄이 하나 더 붙고, 그 줄의 중간값을 시험이
 *    다시 재려면 소거 규칙을 옮겨 적어야 한다. 대신 $\alpha$ 를 $2$·$3$ 으로 열어
 *    창의 두 끝이 서로 다른 식에서 나오게 했다.
 * 3. 정찰은 `35V` 의 변형 축으로 「등호 유무 섞기」와 「조합 계수를 여는 판」을 들었다.
 *    둘 다 **안 열었다** — 등호를 섞으면 답의 등호가 한쪽만 열려 `facts` 왕복이
 *    두 갈래가 되고, 계수를 열면 「$2$로 나눈다」걸음이 씨앗마다 달라져 해설의
 *    중간값 검산이 규칙을 옮겨 적는 쪽으로 기운다. 대신 $d_1$·$d_2$·$y$ 의 두 끝을
 *    넓게 열었다(음수 포함).
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { attempt } from "./m1Shared";
import { eulReul, euroRo, waGwa } from "./m2Josa";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";
const BOOK = "2-1";

/** RPM 색인 정본(`scripts/rpm/rpm-type-catalog.json`)의 중단원 이름 — 글자 그대로. */
const MINOR_INEQ = "일차부등식";
const MINOR_SYS = "연립일차방정식";
const MINOR_SYS_APPLY = "연립일차방정식의 활용";

/**
 * 우리 `Unit.section` 정확한 이름 (`prisma/seed-data/units.ts` 실측).
 *
 * ⚠️ 괄호 안의 쉼표와 공백은 **눈으로 못 가른다.** 그래서 시험이 이 값들을
 *    단원 정본과 **대조**한다(손으로 옮겨 적은 것이 맞는지 사람이 확인하지 않는다).
 */
const SEC = {
  부등식: "부등식",
  수평균나이: "연립방정식의 활용(수, 평균, 나이)",
  특수: "해가 특수한 연립방정식",
  가격도형: "연립방정식의 활용(가격, 개수, 증감, 도형)",
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

/**
 * 주격 조사 — 받침 판정은 `m2Josa.eulReul` **한 곳**에서 온다(규칙을 두 벌로 안 둔다).
 * `m2Top.ts`·`m2Top2.ts`·`midSupB.ts` 가 같은 이유로 같은 함수를 들고 있다.
 */
function iGa(n: number): "이" | "가" {
  return eulReul(n) === "을" ? "이" : "가";
}

/**
 * 부호 붙은 덧셈 항 — `+3` · `+(-3)`.
 *
 * 🔴 `+-` 는 `pageSmells` 가 무는 모양이다(2차 물결 ㉯). 음수는 **괄호로 싸서**
 * 적는다. $0$ 은 들어올 수 없다 — 생성에서 막는다(`+0` 도 냄새다).
 */
function plusTerm(n: number): string {
  if (n === 0)
    throw new Error("plusTerm 에 0 이 들어왔다 — 생성에서 막아야 한다");
  return n < 0 ? `+(${n})` : `+${n}`;
}

/** 계수 $1$ 은 지면에 안 적는다 — `x` · `3x`. 값은 맞고 **지면만 흉한** 부류다. */
function coefTerm(c: number, sym: string): string {
  if (c === 1) return sym;
  if (c === -1) return `-${sym}`;
  return `${c}${sym}`;
}

// ═══════════════════════════════════════════════════════════
// 35V  두 조합의 값의 범위가 주어질 때 한 문자의 값의 범위  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * $s_1\le x+y\le s_2$ 이고 $d_1\le x-y\le d_2$ 일 때 $y$ 의 값의 범위.
 *
 * 🔴 **굳힘의 인자는 `flip` 이다.** $y=\dfrac{(x+y)-(x-y)}{2}$ 를 쓰려면 $x-y$ 의
 * 각 변에 **음수 $-1$ 을 곱해** 부등호의 방향을 바꾼 뒤 더해야 한다. 그 걸음을
 * 빠뜨리면(`flip=false`) 두 범위를 그대로 빼게 되어 **다른 구간**이 나온다 —
 * 학생이 가장 흔히 하는 실수이고, 이 유형이 재려는 바로 그 마디다.
 *
 * ⚠️ `flip=false` 는 제품이 안 쓰는 길이다(생성기는 늘 `true`). 그런데도 인자로
 *    두는 까닭은 ㉡ 을 **시험이 흔들어 잴 수 있게** 하기 위해서다 —
 *    생성기 안에서 두 판을 견주는 줄은 한 번도 거부하지 못하는 «도장»이 된다
 *    (2026-08-23 「도장은 초록을 못 낸다」). `m2Top2.constantRangeForCount` 가
 *    같은 자리에 같은 모양으로 서 있다.
 */
export function rangeOfLetter(
  s1: number,
  s2: number,
  d1: number,
  d2: number,
  flip = true,
): { lo: number; hi: number } {
  if (flip) return { lo: (s1 - d2) / 2, hi: (s2 - d1) / 2 };
  return { lo: (s1 - d1) / 2, hi: (s2 - d2) / 2 };
}

const RANGE_OF_LETTER: TypeEntry[] = [
  def(
    MINOR_INEQ,
    "35V",
    "두 조합의 값의 범위가 주어질 때 한 문자의 값의 범위",
    SEC.부등식,
    "심화중",
    (rng): Body =>
      attempt(3000, (): Body | null => {
        // 정답이 될 구간을 **먼저** 뽑고 발문을 역산한다.
        const y1 = intBetween(rng, -4, 6);
        const gap = intBetween(rng, 4, 9);
        const y2 = y1 + gap;
        // $d_2-d_1$ 이 짝수라야 「뒤집기를 빠뜨린 값」도 정수로 적힌다.
        const w = pick(rng, [2, 4, 6] as const);
        if (w >= gap) return null; // 그 값이 구간 꼴로 안 나오면 주의 줄을 못 쓴다
        const d1 = intBetween(rng, -8, 4);
        const d2 = d1 + w;
        // ㉯ `+0` 을 지면에 안 만든다. $-1$ 을 곱한 값이 $0$ 이면 덧셈 항이 `+0` 이다.
        if (d1 === 0 || d2 === 0) return null;
        // ㉠ 🔴 **대칭 구간이면 뒤집기가 항등식**이다($[-d_2,-d_1]=[d_1,d_2]$).
        //    그러면 이 유형의 마디가 통째로 장식이 된다 — 생성에서 막는다.
        if (d1 + d2 === 0) return null;
        const s1 = 2 * y1 + d2;
        const s2 = 2 * y2 + d1;
        if (s1 >= s2) return null;

        const truth = rangeOfLetter(s1, s2, d1, d2);
        if (truth.lo !== y1 || truth.hi !== y2) return null;
        const naive = rangeOfLetter(s1, s2, d1, d2, false);
        // ㉡ 굳힘을 지운 판과 답이 달라야 한다 (`w>=2` 라 늘 참이지만 못 박는다).
        if (naive.lo === truth.lo && naive.hi === truth.hi) return null;
        if (naive.lo >= naive.hi) return null;

        return {
          // 🔴 **판정기가 이 발문의 첫 판을 「🔴겹침」으로 물었다** — 심화하 `56`
          //    (「$a\le x\le b$이고 $c\le y\le d$일 때, $x-y$의 값의 범위를…」)과
          //    낱말 Jaccard 가 **0.80** 이었다. 두 발문이 다 짧고 상투구
          //    (「값의」·「범위를」·「구하시오」)만으로 이루어져서다. 「무엇의 범위가
          //    주어졌는가」를 말로 적어 갈랐다(0.80 → 0.33 실측).
          content: `두 수 $x$, $y$에 대하여 $x+y$와 $x-y$의 값의 범위가 각각 $${s1}\\le x+y\\le${s2}$, $${d1}\\le x-y\\le${d2}$이다. 이때 $y$의 값의 범위를 구하시오.`,
          answer: `$${y1}\\le y\\le${y2}$`,
          solution: [
            `$x$와 $y$ 각각의 값의 범위는 주어지지 않았지만, $y=\\dfrac{(x+y)-(x-y)}{2}$이므로 두 범위를 알맞게 섞으면 $y$의 값의 범위를 구할 수 있다.`,
            `$${d1}\\le x-y\\le${d2}$의 각 변에 음수인 $-1$을 곱하면 부등호의 방향이 바뀌어 $${-d2}\\le -(x-y)\\le${-d1}$이다.`,
            `$${s1}\\le x+y\\le${s2}$${waGwa(s2)} 변끼리 더하면 $${s1}${plusTerm(-d2)}\\le (x+y)-(x-y)\\le${s2}${plusTerm(-d1)}$, 즉 $${2 * y1}\\le 2y\\le${2 * y2}$이다.`,
            `각 변을 양수인 $2$${euroRo(2)} 나누면 부등호의 방향이 그대로이므로 $${y1}\\le y\\le${y2}$이다.`,
            `이때 $-1$을 곱하는 걸음을 빠뜨리고 두 범위를 그대로 빼면 $${naive.lo}\\le y\\le${naive.hi}$${iGa(naive.hi)} 되어 답이 달라진다.`,
            `따라서 $y$의 값의 범위는 $${y1}\\le y\\le${y2}$이다.`,
            `실제로 $x+y=${s1}$, $x-y=${d2}$일 때 $y=${y1}$이고, $x+y=${s2}$, $x-y=${d1}$일 때 $y=${y2}$이므로 두 끝값을 모두 얻을 수 있다.`,
          ].join("\n"),
          facts: {
            x: y1,
            hi: y2,
            s1,
            s2,
            d1,
            d2,
            w,
            naiveLo: naive.lo,
            naiveHi: naive.hi,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 36V  인원은 정해지지 않고 비만 정해지는 평균 문제  (심화중)
// ═══════════════════════════════════════════════════════════

/**
 * 남학생 평균 `a`, 여학생 평균 `b`, 전체 평균 `t` 일 때, 각각 `u`·`v` 만큼 오른
 * 다음 시험의 **전체 평균**. 인원은 끝까지 구하지 않는다.
 *
 * 🔴 **굳힘의 인자는 `t` 다.** 전체 평균이 없으면 두 인원의 비를 모르므로 값이
 * 하나로 정해지지 않는다. `t` 를 흔들면 비가 바뀌고 답도 바뀐다 — 시험이 그것을 잰다.
 *
 * 되돌리는 길: $\dfrac{ax+by}{x+y}=t$ 에서 $(a-t)x=(t-b)y$, 곧 $x:y=(t-b):(a-t)$.
 * 그 비를 다음 시험의 식에 넣으면 문자가 약분되어 사라진다.
 */
export function newAverage(
  a: number,
  b: number,
  t: number,
  u: number,
  v: number,
): number | null {
  const cx = a - t;
  const cy = t - b;
  if (cx <= 0 || cy <= 0) return null; // $t$ 가 두 평균 사이에 없으면 그런 반이 없다
  const g = gcd(cx, cy);
  const px = cy / g;
  const py = cx / g;
  return ((a + u) * px + (b + v) * py) / (px + py);
}

const RATIO_ONLY_AVERAGE: TypeEntry[] = [
  def(
    MINOR_SYS_APPLY,
    "36V",
    "인원은 정해지지 않고 비만 정해지는 평균 문제",
    SEC.수평균나이,
    "심화중",
    (rng): Body =>
      attempt(6000, (): Body | null => {
        const t = intBetween(rng, 64, 84);
        const m = intBetween(rng, 2, 5); // 많은 쪽이 적은 쪽의 몇 배인가
        const s = intBetween(rng, 2, 5);
        const dir = intBetween(rng, 0, 1); // 0 이면 남학생이, 1 이면 여학생이 많다
        const cx = dir === 0 ? s : m * s; // $a-t$
        const cy = dir === 0 ? m * s : s; // $t-b$
        const a = t + cx;
        const b = t - cy;
        if (a > 97 || b < 42) return null;
        // 인원비 $x:y$ — `dir=0` 이면 $m:1$, `dir=1` 이면 $1:m$.
        const px = dir === 0 ? m : 1;
        const py = dir === 0 ? 1 : m;
        if (cx * px !== cy * py) return null; // 되돌린 비가 실제로 그 비인가

        const u = intBetween(rng, 2, 12);
        const v = intBetween(rng, 1, 11);
        if (u === v) return null; // 오름폭이 같으면 함정(가중이 필요 없다)이 사라진다
        if ((u + v) % 2 !== 0) return null; // 「똑같이 나눈」 함정 값도 정수로 적는다
        if ((u * px + v * py) % (px + py) !== 0) return null;
        const rise = (u * px + v * py) / (px + py);
        const x = t + rise;
        const naiveRise = (u + v) / 2;
        // ㉠ 「인원이 같다고 본 값」이 참과 같으면 전체 평균을 안 읽어도 맞는다.
        if (naiveRise === rise) return null;
        // 🔴 **다음 시험의 두 평균이 같으면 비가 통째로 장식이 된다.**
        //    $A+u=B+v$ 이면 가중평균이 인원비와 무관하게 그 값이라, 전체 평균을
        //    한 번도 안 읽고 답이 나온다. 실측으로 $89$·$81$·$83$ · $+3$·$+11$ 이
        //    그 자리였다(두 새 평균이 둘 다 $92$) — 시험이 찾아 준 결함이다.
        if (a + u === b + v) return null;
        if (newAverage(a, b, t, u, v) !== x) return null;

        const sub = dir === 0 ? `x=${m}y` : `y=${m}x`;
        const substituted =
          dir === 0
            ? `\\dfrac{${a + u}\\times${m}y+${b + v}y}{${m}y+y}=\\dfrac{${(a + u) * m + (b + v)}y}{${m + 1}y}`
            : `\\dfrac{${a + u}x+${b + v}\\times${m}x}{x+${m}x}=\\dfrac{${a + u + (b + v) * m}x}{${m + 1}x}`;
        const ratioLine =
          dir === 0
            ? `곧 $x=${m}y$이므로 남학생 수는 여학생 수의 $${m}$배이다. 두 인원의 비는 $x:y=${m}:1$${euroRo(1)} 정해지지만 인원 자체는 정해지지 않는다.`
            : `곧 $y=${m}x$이므로 여학생 수는 남학생 수의 $${m}$배이다. 두 인원의 비는 $x:y=1:${m}$${euroRo(m)} 정해지지만 인원 자체는 정해지지 않는다.`;
        const cancelled = dir === 0 ? "$y$" : "$x$";
        return {
          content: `어느 반의 시험에서 남학생의 평균 점수는 $${a}$점, 여학생의 평균 점수는 $${b}$점이고 반 전체의 평균 점수는 $${t}$점이었다. 다음 시험에서 남학생의 평균 점수가 $${u}$점 오르고 여학생의 평균 점수가 $${v}$점 올랐다면 반 전체의 평균 점수는 몇 점인지 구하시오.`,
          answer: `$${x}$점`,
          solution: [
            `남학생 수를 $x$명, 여학생 수를 $y$명이라 하면 남학생의 점수의 총합은 $${a}x$점, 여학생의 점수의 총합은 $${b}y$점이고 전체 학생 수는 $x+y$명이다.`,
            `반 전체의 평균 점수가 $${t}$점이므로 $\\dfrac{${a}x+${b}y}{x+y}=${t}$이다.`,
            `양변에 $x+y$를 곱하면 $${a}x+${b}y=${t}x+${t}y$이고, 이항하여 정리하면 $${cx}x=${cy}y$이다.`,
            ratioLine,
            `다음 시험에서 남학생의 평균은 $${a + u}$점, 여학생의 평균은 $${b + v}$점이므로 반 전체의 평균 점수는 $\\dfrac{${a + u}x+${b + v}y}{x+y}$점이다.`,
            `여기에 $${sub}$를 대입하면 $${substituted}=${x}$이다.`,
            `분자와 분모에서 ${cancelled}가 약분되어 사라지므로 인원을 구하지 않아도 값이 정해진다.`,
            `남학생과 여학생의 평균이 각각 $${u}$점, $${v}$점 올랐으므로 전체 평균도 $${naiveRise}$점 오른다고 보면 $${t + naiveRise}$점이지만, 두 인원이 다르므로 이것은 옳지 않다.`,
            `따라서 다음 시험에서 반 전체의 평균 점수는 $${x}$점이다.`,
          ].join("\n"),
          facts: {
            x,
            avgA: a,
            avgB: b,
            total: t,
            riseA: u,
            riseB: v,
            ratio: m,
            dir,
            rise,
            naiveRise,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 37V  같은 문자가 두 계수 자리에 있어 후보가 둘인 특수한 연립방정식  (심화상)
// ═══════════════════════════════════════════════════════════

/**
 * 계수비 조건 $a^{2}=mq$ 가 낳는 **후보 둘** — 상수항을 **안 보는** 판이다.
 * $mq$ 가 완전제곱이 아니면 빈 배열(그런 정수 $a$ 가 없다).
 */
export function candidateRoots(m: number, q: number): number[] {
  const r = Math.round(Math.sqrt(m * q));
  if (r <= 0 || r * r !== m * q) return [];
  return [r, -r];
}

/**
 * 후보 둘 가운데 **살아남는 것**.
 *
 * 🔴 **굳힘의 인자는 `compare` 다.** 계수비만으로는 두 후보가 **둘 다** 산다 —
 * 상수항을 하나씩 대 봐야 한쪽이 죽는다(`compare=false` 면 후보 둘이 그대로 남는다).
 * 그것이 이 갈래를 «상»으로 만드는 마디이고, 시험이 그 인자를 흔들어 잰다.
 *
 * 둘째 식은 첫째 식의 $\dfrac{q}{a}$ 배다($a^{2}=mq$ 이므로 $\dfrac{q}{a}=\dfrac{a}{m}$).
 * 상수항까지 그 배수면 **같은 방정식**이라 해가 무수히 많고, 아니면 해가 없다.
 */
export function survivingRoot(
  m: number,
  q: number,
  n: number,
  k: number,
  wantNone: boolean,
  compare = true,
): number[] {
  const roots = candidateRoots(m, q);
  if (!compare) return roots;
  return roots.filter((a) => {
    const infinite = k * a === q * n; // $k=\dfrac{q}{a}n$ 를 정수 곱으로 옮긴 것
    return wantNone ? !infinite : infinite;
  });
}

const SPECIAL_TWO_ROOTS: TypeEntry[] = [
  def(
    MINOR_SYS,
    "37V",
    "같은 문자가 두 계수 자리에 있어 후보가 둘인 특수한 연립방정식",
    SEC.특수,
    "심화상",
    (rng): Body =>
      attempt(3000, (): Body | null => {
        // $r=mt$, $q=mt^{2}$ 로 잡으면 $a^{2}=mq=(mt)^{2}$ 이고 배수 $\dfrac{q}{r}=t$
        // 가 **반드시 정수**다. 정찰의 $(4,9)$ 는 이 꼴이 아니라 배수가 $1.5$ 였다.
        const m = intBetween(rng, 2, 5);
        const t = pick(rng, [2, 3] as const);
        const r = m * t;
        const q = m * t * t;
        if (q > 30) return null; // 지면에 두 자리를 넘는 계수를 안 쓴다
        if (m < 2 || q < 2) return null; // ㉯ `1x`·`1y` 를 안 만든다
        const n = intBetween(rng, 2, 12); // ㉯ 상수항이 $0$ 이면 `+0` 이 난다
        const eps = pick(rng, [1, -1] as const);
        const k = eps * t * n; // $a=\varepsilon r$ 쪽이 「무수히 많다」로 죽는다
        if (k === 0) return null;
        const wantNone = intBetween(rng, 0, 1) === 1;
        const live = survivingRoot(m, q, n, k, wantNone);
        if (live.length !== 1) return null;
        const x = live[0]!;
        const dead = -x;
        // 답의 부호가 씨앗마다 갈리는지는 시험이 전수로 센다(여기서 재면 «도장»이다).
        const both = survivingRoot(m, q, n, k, wantNone, false);
        if (both.length !== 2) return null;

        const goal = wantNone ? "없" : "무수히 많";
        // 후보를 지면에 적는 차례는 늘 $r$ → $-r$ 이다. 답은 그 둘 중 하나다.
        // ㉰ 「…이므로 …이므로」가 겹치지 않게 뒷마디는 **어미를 바꾼다.**
        //    ㄹ 어간 활용(「기므로」 부류)은 애초에 만들지 않는다.
        const verdict = (a: number): string =>
          k * a === q * n
            ? "두 식이 완전히 같아 해가 무수히 많다"
            : "두 식을 동시에 만족시키는 $x$, $y$가 없어 해가 없다";
        return {
          // 🔴 이 소단원은 발문 뼈대가 형제와 거의 같다(응용 `17`·`18`, 심화하
          //    `24A`·`26A` 가 다 「연립방정식 … 의 해가 … 때, 상수 $a$의 값을 구하시오」).
          //    판정기가 `17` 과 낱말 Jaccard **0.60**(🟡살펴볼것)을 냈다. 그래서
          //    **이 갈래를 «상»으로 만드는 성질 자체**를 한 문장으로 적어 갈랐다 —
          //    학생에게도 「어디를 봐야 하는가」를 알려 주는 문장이다(0.60 → 0.35 실측).
          content: `연립방정식 $\\begin{cases}ax+${m}y=${n}\\\\${q}x+ay=${k}\\end{cases}$에서 상수 $a$는 첫째 식의 $x$의 계수이고 둘째 식의 $y$의 계수이다. 이 연립방정식의 해가 ${goal}도록 하는 $a$의 값을 모두 구하시오.`,
          answer: `$a=${x}$`,
          solution: [
            `해가 무수히 많거나 없으려면 두 식에서 $x$의 계수의 비와 $y$의 계수의 비가 같아야 한다.`,
            `$a:${q}=${m}:a$이므로 $a\\times a=${m}\\times${q}$, 곧 $a^{2}=${m * q}$이다.`,
            // ⚠️ 이 줄을 「따라서」로 열면 **결론 줄이 둘**이 되어, 「따라서 …」를
            //    결론으로 찾는 검사가 **후보 줄**을 결론으로 읽는다(첫 판이 그랬다).
            `이때 $a$는 $${r}$ 또는 $${-r}$이다. 계수비만으로는 둘 중 어느 것인지 정해지지 않으므로 두 경우를 각각 확인해야 한다.`,
            `$a=${r}$일 때 두 식은 $${r}x+${m}y=${n}$${waGwa(n)} $${q}x+${r}y=${k}$이다. 첫째 식의 양변에 $${t}$${eulReul(t)} 곱하면 $${q}x+${r}y=${t * n}$이고, 둘째 식의 상수항은 $${k}$이므로 ${verdict(r)}.`,
            `$a=${-r}$일 때 두 식은 $-${r}x+${m}y=${n}$${waGwa(n)} $${q}x-${r}y=${k}$이다. 첫째 식의 양변에 $-${t}$${eulReul(t)} 곱하면 $${q}x-${r}y=${-t * n}$이고, 둘째 식의 상수항은 $${k}$이므로 ${verdict(-r)}.`,
            `따라서 해가 ${goal}도록 하는 상수 $a$의 값은 $${x}$ 하나뿐이다.`,
            `상수항을 견주지 않으면 두 후보가 모두 남는다. 그러나 $a=${dead}$일 때는 해가 ${wantNone ? "무수히 많아" : "없어"} 조건에 맞지 않으므로 답에 넣으면 안 된다.`,
          ].join("\n"),
          facts: {
            x,
            dead,
            m,
            q,
            r,
            n,
            k,
            t,
            eps,
            wantNone: wantNone ? 1 : 0,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 38V  세 종류를 사는데 식이 둘뿐인 가격·개수 문제  (심화상)
// ═══════════════════════════════════════════════════════════

/**
 * 세 값의 물건을 모두 `n` 개, 금액 `total` 로 사는 방법 — **전수**로 만든다.
 *
 * 🔴 **굳힘의 인자는 `minEach` 다.** 「각 종류를 적어도 한 개씩」이 없으면 $x$ 의 창이
 * 양쪽으로 넓어져 가짓수가 달라진다. 소거식만으로는 미지수가 하나 남으므로, 그
 * 자연수 조건이 창을 자르고 그 안의 후보를 **다 만들어** 봐야 답이 정해진다.
 */
export function waysToBuy(
  prices: readonly [number, number, number],
  n: number,
  total: number,
  minEach: number,
): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let x = minEach; x <= n; x += 1) {
    for (let y = minEach; y + x <= n; y += 1) {
      const z = n - x - y;
      if (z < minEach) continue;
      if (prices[0] * x + prices[1] * y + prices[2] * z === total) {
        out.push([x, y, z]);
      }
    }
  }
  return out;
}

/**
 * 소재 — 값이 비싼 것부터 차례로 셋. **낱말 뒤에 조사를 안 붙인다**(「… 세 종류를」
 * 로 받아 조사가 늘 고정이다). 한국어 조사를 낱말마다 손으로 적으면 목록이 곧
 * 두 벌이 되고, 그 목록은 값 검산이 구조적으로 못 본다.
 */
const GOODS: ReadonlyArray<{
  place: string;
  names: readonly [string, string, string];
  unit: string;
}> = [
  { place: "문구점", names: ["공책", "볼펜", "지우개"], unit: "개" },
  { place: "편의점", names: ["빵", "우유", "사탕"], unit: "개" },
  { place: "꽃집", names: ["장미", "튤립", "안개꽃"], unit: "송이" },
];

const THREE_KINDS_TWO_EQUATIONS: TypeEntry[] = [
  def(
    MINOR_SYS_APPLY,
    "38V",
    "세 종류를 사는데 식이 둘뿐인 가격 개수 문제",
    SEC.가격도형,
    "심화상",
    (rng): Body =>
      attempt(4000, (): Body | null => {
        // 백원 단위로 잡는다 — 소거식의 $y$ 계수가 $1$ 이라야 해설에
        // 나누어떨어짐 판정 줄이 안 붙는다(⑺ 2 참조).
        const hr = intBetween(rng, 2, 4);
        const d = pick(rng, [2, 3] as const);
        const alpha = pick(rng, [2, 3] as const);
        const hq = hr + d;
        const hp = hr + alpha * d;
        const n = intBetween(rng, 8, 16);
        // 🔴 $K>N$ 이라야 아래 경계가 $x\ge1$ 보다 **위**로 올라간다 — 안 그러면
        //    「적어도 한 개씩」의 절반(가장 싼 것 쪽)이 장식이 된다.
        const kk = intBetween(rng, n + 1, n + 12);
        const mh = hr * n + d * kk;
        const prices: [number, number, number] = [hp * 100, hq * 100, hr * 100];
        const total = mh * 100;

        const list = waysToBuy(prices, n, total, 1);
        const size = list.length;
        if (size < 2 || size > 5) return null;
        const loose = waysToBuy(prices, n, total, 0);
        // ㉡ 굳힘(자연수 조건)을 지우면 가짓수가 달라져야 한다.
        //
        // 🟡 **변이 하네스가 이 줄을 「무효한 변이(산출물 동일)」로 찍었다 — 그 판정이
        //    옳다.** 아래 `extra === undefined` 가 「창 밖에 사는 조합이 있는가」를
        //    묻는데, 그것은 이 줄과 **대수적으로 같은 말**이다(창 밖의 조합이 곧
        //    늘어나는 가짓수다). 곧 지금 이 줄은 **중복**이다. 그래도 남기는 까닭은
        //    ㉡ 을 «가짓수»의 말로 한 번 적어 두어야 다음 사람이 아래 줄의 뜻을
        //    오해하지 않기 때문이다. 축이 살아 있는 것은 `extra` 를 창 안에서
        //    고르게 바꾼 변이가 **빨개져서** 증명된다(하네스 M10b).
        if (loose.length <= size) return null;

        const xMax = Math.floor((kk - 1) / alpha);
        const xMin = Math.ceil((kk - n + 1) / (alpha - 1));
        // 해설이 적을 창이 실제 후보와 같은지 — 다르면 해설이 거짓말을 한다.
        if (xMax - xMin + 1 !== size) return null;
        if (list[0]![0] !== xMin) return null;
        if (list[size - 1]![0] !== xMax) return null;
        if (xMin < 2) return null; // 아래 경계가 $x\ge1$ 과 같으면 물지 않는 것이다
        const extra = loose.find((s) => s[0] < xMin || s[0] > xMax);
        if (extra === undefined) return null;
        if (extra[0] !== 0 && extra[1] !== 0 && extra[2] !== 0) return null;

        const g = pick(rng, GOODS);
        const [n1, n2, n3] = g.names;
        const tuples = list
          .map(([a, b, c]) => `$\\left(${a},\\ ${b},\\ ${c}\\right)$`)
          .join(", ");
        const checks = list
          .map(
            ([a, b, c]) =>
              `$${prices[0]}\\times${a}+${prices[1]}\\times${b}+${prices[2]}\\times${c}=${total}$`,
          )
          .join(", ");
        return {
          content: `어느 ${g.place}에서 한 ${g.unit}에 $${prices[0]}$원인 ${n1}, $${prices[1]}$원인 ${n2}, $${prices[2]}$원인 ${n3} 세 종류를 합하여 모두 $${n}$${g.unit} 사고 $${total}$원을 냈다. 세 종류를 각각 적어도 한 ${g.unit}씩 샀을 때, 살 수 있는 방법의 가짓수를 구하시오.`,
          answer: `$${size}$`,
          solution: [
            `$${prices[0]}$원짜리를 $x$${g.unit}, $${prices[1]}$원짜리를 $y$${g.unit}, $${prices[2]}$원짜리를 $z$${g.unit} 샀다고 하면 $x+y+z=${n}$이고 $${prices[0]}x+${prices[1]}y+${prices[2]}z=${total}$이다.`,
            `둘째 식의 양변을 $100$${euroRo(100)} 나누면 $${hp}x+${hq}y+${hr}z=${mh}$이다.`,
            `첫째 식의 양변에 $${hr}$${eulReul(hr)} 곱하면 $${hr}x+${hr}y+${hr}z=${hr * n}$이고, 이것을 위 식에서 빼면 $${coefTerm(alpha * d, "x")}+${coefTerm(d, "y")}=${d * kk}$이다.`,
            // 🔴 「나누다」는 «(으)로»를 받는다 — `eulReul` 로 지으면 「$2$를 나누면」이
            //    되어 값·냄새·렌더가 **전부 초록인 채로** 지면에 나간다(첫 판이 그랬다).
            `양변을 $${d}$${euroRo(d)} 나누면 $${coefTerm(alpha, "x")}+y=${kk}$이다. 미지수는 셋인데 식은 둘이므로 세 개수가 하나로 정해지지 않는다.`,
            `$y=${kk}-${coefTerm(alpha, "x")}$이고 $y\\ge1$이므로 $${kk}-${coefTerm(alpha, "x")}\\ge1$에서 $x\\le${xMax}$이다.`,
            `또 $z=${n}-x-y=${n}-x-\\left(${kk}-${coefTerm(alpha, "x")}\\right)=${coefTerm(alpha - 1, "x")}-${kk - n}$이고 $z\\ge1$이므로 $x\\ge${xMin}$이다.`,
            `그러므로 $x$는 $${xMin}$부터 $${xMax}$까지의 자연수이고, 이때 $\\left(x,\\ y,\\ z\\right)$는 ${tuples}이다.`,
            `금액을 확인하면 ${checks}이므로 어느 경우나 모두 $${total}$원이다.`,
            `따라서 살 수 있는 방법의 가짓수는 $${size}$이다.`,
            `만약 사지 않는 종류가 있어도 된다면 $\\left(${extra[0]},\\ ${extra[1]},\\ ${extra[2]}\\right)$도 두 식을 만족시키므로 가짓수가 달라진다.`,
          ].join("\n"),
          facts: {
            x: size,
            n,
            total,
            p1: prices[0],
            p2: prices[1],
            p3: prices[2],
            kk,
            alpha,
            d,
            hr,
            xMin,
            xMax,
            loose: loose.length,
          },
          figureSpec: null,
        };
      }),
  ),
];

/**
 * 중2 확대 갈래 3차 물결 명부 — `generate.ts` 의 `ALL` 이 이것 하나만 spread 한다
 * (그 한 줄은 **리드가** 넣는다).
 *
 * 갈래별 몫: **심화중 2 · 심화상 2**. 수를 목표로 잡지 않았다 — 세울 수 있는
 * 자리에만 세웠다(D-115 ⑹ 「비우는 단위는 학년이 아니라 소단원」).
 */
export const M2_TOP_3: TypeEntry[] = [
  ...RANGE_OF_LETTER,
  ...RATIO_ONLY_AVERAGE,
  ...SPECIAL_TWO_ROOTS,
  ...THREE_KINDS_TWO_EQUATIONS,
];
