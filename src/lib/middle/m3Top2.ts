/**
 * 중3 **확대 갈래 2차 물결**(`심화중`·`심화상`) — D-116, 번호 접미사 **`U`**.
 *
 * 병렬 세션 소유 모듈. 이 파일과 `generate.ts` 의 `...M3_TOP_2` **한 줄**만 이 갈래가
 * 건드린다(등록 한 줄은 리드가 넣는다).
 *
 * ## ⑴ 왜 새 파일인가
 *
 * `m3Root.ts`·`m3Poly.ts`·`m3Func.ts`·`m3Trig.ts` 는 「N유형이 전부 등록돼 있다」를
 * **개수로 얼린** 가드를 달고 있다. 거기에 유형을 더하면 그 가드가 빨개지고, 초록으로
 * 되돌리는 유일한 길이 **가드를 무르는 것**이 된다(`m1Types10.ts`·`midSupB.ts`·
 * `m1Top.ts`·`m3Top.ts` 가 같은 이유로 선 자리). 그리고 오르카 다중 세션이 같은 파일을
 * 동시에 만지면 병합에서 부딪힌다 — 새 파일 하나 + spread 한 줄이면 그 둘을 다 피한다.
 *
 * 1차 물결(`m3Top.ts`)에 이어 붙이지 않는 것도 같은 까닭이다. 그 파일은 자기 시험
 * (`middleM3Top.test.ts`)이 「등록한 두 유형」을 글자로 얼려 두었다.
 *
 * ## ⑵ 무엇이 «중»이고 무엇이 «상»인가 (D-115 ⑾ · `m1Top.ts` 머리말과 한 벌)
 *
 * ```
 * 심화중   마디 하나가 안 굳고, **그 소단원의 개념**이 그것을 굳힌다.
 *          성질 하나가 후보를 «끝까지 계산하지 않고» 거른다.
 * 심화상   성질로 못 굳혀 후보를 **다 만들어 견줘야** 한다.
 * ```
 *
 * | 키 | 갈래 | 안 굳는 마디 | 무엇이 굳히나 | 같은 소단원 `심화하`와 무엇이 다른가 |
 * |---|---|---|---|---|
 * | `제곱근의 뜻과 성질\|41U` | **심화상** | $x-p$, $x-q$ 의 **부호** — 미지수 자신에 달려 있어 판정을 시작할 수조차 없다 | 굳지 **않는다.** 세 갈래를 다 세워 일차방정식을 풀고 뿌리를 **되돌아가** 구간에 대 봐야 산 것과 죽은 것이 갈린다 | `10`(「$a>0$, $b<0$일 때」)은 부호를 **발문이 글자로 주고**, `16`($\sqrt{(a-\sqrt b)^2}$)은 대소를 **한 번만** 판정하면 끝이다 |
 * | `이차함수와 그래프\|42U` | **심화중** | $a$ 와 $q$ (따라서 식 자체) — 조건이 둘뿐이라 자유도가 하나 남는다 | **포물선은 축에 대하여 대칭이다.** $y$좌표가 같은 두 점의 중점이 축이므로 $a$·$q$ 를 **하나도 구하지 않고** 답이 정해진다 | `20`·`21` 은 **그림이 문항의 전부**이고, 응용 `07`·`08`·`18` 은 점을 대입하는 순간 $a$ 가 굳는다 |
 * | `인수분해의 응용\|43U` | **심화상** | 두 인수 $x-y$, $x+y$ 가 **각각 무엇인가** — 곱이 $N$ 인 것까지만 굳는다 | 굳지 **않는다.** 약수 짝을 **하나씩 만들어** 홀짝을 대 봐야 참·거짓이 갈린다 | `12`·`18`·`21`·`22` 는 **인수분해하는 일 자체가 답**이고, `19`·`20` 은 인수분해로 **수를 계산**한다. 여기서는 인수분해가 답이 아니라 **정수 조건의 체**다 |
 * | `삼각비의 뜻\|44U` | **심화중** | 두 직각변 중 **어느 것이 $\overline{BC}$ 인가** — 길이 «집합»은 굳지만 배정이 안 굳는다 | **큰 각의 대변이 더 길다.** 발문의 $\angle A<\angle B$ 가 길이를 **다시 계산하지 않고** 한 배정을 죽인다 | `05`·`07` 과 응용 `03` 은 **세 변이 계산으로 하나씩 굳고 나서** 비를 읽는다 |
 *
 * ## ⑶ 🔴 초등이 네 물결에 걸쳐 물린 함정 셋 — 여기서 어떻게 피했나
 *
 * ㉠ **창을 한쪽 끝만 주면 굳힘이 장식이 된다.** 「살아남는 후보가 언제나 목록의 같은
 *    자리(끝)」면 굳힘은 «어느 후보인가»를 한 번도 안 고른다. 초6 에서 두 갈래가 이것으로
 *    병합이 막혔다(각각 23/23 · 672/672 **전수**).
 *
 *    · `41U` — 답이 **살아남은 뿌리 전부의 합**이라 목록의 어느 자리도 답이 아니다
 *      (`32T`·`95T` 의 처방). 그 위에 더해, 「죽는 갈래가 늘 가운데」면 학생이 구간 검사를
 *      안 하고 «바깥 둘»로 찍을 수 있으므로 — **이것이 이 설계의 진짜 ㉠ 자리다** —
 *      계수를 붙이는 항과 $R$ 의 범위를 돌려 **왼·가운데·오른 셋이 다 죽을 수 있게** 했다
 *      (`planAbsSum` 이 `wantDead` 를 먼저 고르는 까닭). 씨앗마다 갈리는 것을 시험이 센다.
 *    · `43U` — 답이 **살아남은 $x$ 전부의 합**이고, 죽는 짝이 늘 둘 이상이라
 *      「가장 큰 것 하나만 버리기」도 안 통한다. 살아남은 자리가 목록에서 **연속이 아닐 것**
 *      을 불변식으로 요구해 「앞/뒤에서 몇 개」로도 못 찍게 했다.
 *      ⚠️ **정직하게 적는다** — 짝 $(1,\,N)$ 은 $N$ 이 짝수이므로 **언제나 죽는다.**
 *      곧 「최댓값 집기」가 0% 인 것은 이 설계의 구조적 사실이지 ㉠ 을 넘긴 근거가 아니다.
 *      근거는 위의 «합»과 «연속 아님»이다.
 *    · `44U` — 굳힘의 **방향을 씨앗마다 뒤집는다**($\angle A<\angle B$ / $>$). 묻는 비도
 *      $\sin$·$\cos$ 를 반반 낸다. 그래서 살아남는 후보가 큰 값인 씨앗과 작은 값인 씨앗이
 *      **반반**이라 극단 집기가 우연 수준(후보 둘이므로 $50\%$)에 머문다.
 *    · `42U` — **후보 목록이 아예 없다**(값이 하나로 굳는다). 중1 `94T` 와 같은 자리다.
 *      ⚠️ 「축이 없다」와 「축이 초록이다」는 **다른 말**이다. 시험은 이 갈래에 대해 ㉠ 을
 *      **«잴 축 없음»으로 따로 찍는다** — 0 으로 찍으면 「깨끗」과 「못 셈」이 안 갈린다.
 *      대신 「답이 발문에 적힌 수 가운데 하나인가」를 재는데, 그것은 **구조적으로 0**임을
 *      생성기 불변식($w\ne x_1,\;w\ne x_2,\;w\ne p$)이 보장하고 시험이 그 불변식을 잠근다.
 *
 * ㉡ **「굳힘이 항등식」** — 굳힘을 지우고 같은 씨앗으로 돌려 답이 그대로면 그것은 굳힘이
 *    아니라 장식이다. 초등에서 이 검사로만 갈래 넷이 걸렸다.
 *    → 넷 다 굳힘을 **인자로 받는 순수 함수**로 뽑아 두었다:
 *      `solveAbsSumEquation(..., useIntervalCheck)` · `solveDiffOfSquares(n, useParity)` ·
 *      `solveHypotenuseArea(..., aIsSmaller, ...)` · `solveAxisReflection(x1, x2, w)`.
 *      시험이 그 인자를 흔들어 답이 실제로 달라지는지 잰다.
 *    → 그리고 굳힘이 **일할 자리가 있게** 못 박았다: `41U` 는 죽는 뿌리가 $0$ 이면 버린다
 *      (합이 그대로가 된다), `43U` 는 $N\equiv0\pmod 4$ 여야 한다($N$ 이 홀수면 모든 짝이
 *      홀·홀이라 굳힘이 **아무도 안 거르고**, $N\equiv2\pmod 4$ 면 해가 **하나도 없다**).
 *
 * ㉢ **갈래끼리 겹침** — 새 갈래가 그 소단원의 `심화하`·`응용` 과 한 시험지에 같이 실린다.
 *    「수+정답」 열쇠에는 **천장**이 있으므로 쌍마다 천장을 먼저 찍고, 천장이 낮으면
 *    «겹침 없음»이 아니라 **«판정 불가»** 로 적어야 한다.
 *    이 물결이 반드시 짝으로 재야 하는 이웃(정찰이 지목한 것):
 *
 *    ```
 *    41U ↔ 3-1|다항식의 인수분해|05   (√((x-lo)^2)±√((x-hi)^2) — 다만 거기서는 lo<x<hi 를
 *                                     발문이 주어 부호가 이미 굳어 있고 묻는 것이 「간단히」다)
 *    42U ↔ 3-1|이차함수의 그래프 ⑵|22T (같은 4단원. 22T 는 «후보 둘 + 사분면 부호»,
 *                                     42U 는 «후보 없음 + 축 대칭»이라 기제가 다르다)
 *    43U ↔ 3-1|다항식의 인수분해|19   (같은 곱셈 공식 $a^2-b^2=(a+b)(a-b)$ 를 쓴다)
 *    44U ↔ 3-2|삼각비|05, |07, |03    (셋 다 세 변이 계산으로 굳는다 — 삼각비는 책이 3-2 다)
 *    ```
 *
 * ## ⑷ 번호 규약 — **`U` 접미사**
 *
 * `extensionNumberReason`(`src/__tests__/helpers/rpmCatalog.ts`)은 `숫자+영문 대문자 한
 * 글자` 를 「색인 번호와 절대 안 겹친다」로 통과시킨다. 이미 `A`(색인 밖 보강)와 `T`(확대
 * 갈래 1차 물결)가 쓰였으므로 **2차 물결은 `U`** 다 — 대를 통째로 갈라 병렬 세션끼리
 * 번호가 부딪히지 않게 한다.
 *
 * ## 계약 (이웃 모듈과 한 벌)
 *
 * 1. **정답을 먼저 뽑고 발문을 역산한다.**
 * 2. `facts.x` 가 **답의 첫 수**다. `44U` 는 답이 기약분수라 `x` 가 **분자**이고 분모는
 *    `den` 에 둔다 — 시험이 둘을 지면 분수와 함께 견준다(숨기지 않고 여기에 적어 둔다).
 * 3. 숫자는 전부 `$...$` 안에 (`elementary/rules` `bareNumbers` 가드).
 * 4. `attempt` 가 다 떨어지면 **던진다** — 조용히 기본값을 내지 않는다.
 * 5. 그림이 없으므로 발문이 **지면을 가리키지 않는다**(`figureSpec: null`).
 * 6. 🔴 **해설이 걸음을 건너뛰지 않는다** (D-116 ⑸, 원장님 완료 조건). 「풀면」·「구하면」
 *    뒤에 중간 결과 없이 답만 오면 안 된다. 후보를 견주는 갈래는 **후보를 하나씩 적고
 *    각각 왜 살고 죽는지**까지 적는다.
 *
 * ## 왜 «설계»를 `plan…()` 으로 따로 내보내나 — 없는 축은 변이시킬 수 없다
 *
 * ㉠·㉡ 을 **밖에서 재려면** 「후보 집합」과 「굳힘이 남긴 것」이 문항 밖에 있어야 한다.
 * 발문·해설 문자열만 내보내면 그 축이 **아예 없어서** 변이시킬 수도 없다. 그래서 유형마다
 * 순수 설계 함수를 export 하고, 발문·해설은 그 설계를 **읽기만** 한다(규칙이 두 벌이
 * 되지 않는다). `Sift` 는 1차 물결의 것을 **그대로 쓴다** — 판정기
 * `scripts/qa/probe-middle-top-m3.ts` 의 `edgeScore`·`siftScore` 가 그 모양을 본다.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { eulReul, waGwa } from "./m2Josa";
import type { Sift } from "./m3Top";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중3";

/**
 * ⚠️ **책이 둘이다.** 「삼각비」는 RPM 색인에서 **`3-2`** 다(`m3Trig.ts` 도 그렇다).
 * `3-1` 로 적으면 `extensionNumberReason` 이 「색인에 없는 중단원이다」를 내고
 * `middleTypeCoverage.test.ts` 가 빨개진다 — 색인을 실제로 훑어 확인했다
 * (`scripts/rpm/rpm-type-catalog.json`: `3-1` 에 「삼각비」가 **없다**).
 */
const BOOK1 = "3-1";
const BOOK2 = "3-2";

/** 우리 `Unit.section` 정확한 이름 (`prisma/seed-data/units.ts` 469~481 실측). */
const SEC = {
  제곱근: "제곱근의 뜻과 성질",
  인수응용: "인수분해의 응용",
  이차함수: "이차함수와 그래프",
  삼각비: "삼각비의 뜻",
} as const;

/** RPM 중단원 이름 — 이웃 모듈(`m3Root`·`m3Poly`·`m3Func`·`m3Trig`)이 쓰는 글자 그대로. */
const MINOR = {
  제곱근: "제곱근의 뜻과 성질",
  인수분해: "다항식의 인수분해",
  이차함수1: "이차함수의 그래프 ⑴",
  삼각비: "삼각비",
} as const;

type Body = Pick<
  MidProblem,
  "content" | "answer" | "solution" | "facts" | "figureSpec"
>;

/** 조건을 만족할 때까지 다시 뽑는다 — 못 찾으면 던진다(조용히 기본값 금지). */
function attempt<T>(tries: number, f: () => T | null): T {
  for (let i = 0; i < tries; i += 1) {
    const v = f();
    if (v !== null) return v;
  }
  throw new Error(
    "m3Top2: 유형 생성 재시도 초과 — 매개변수 범위를 확인하십시오",
  );
}

/** 후보를 하나씩 짚는 표지. 짝이 최대 여덟이라 여덟까지 둔다. */
const MARKS = ["㉠", "㉡", "㉢", "㉣", "㉤", "㉥", "㉦", "㉧"] as const;

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

/** 기약분수의 분자·분모. */
export function reduceFraction(n: number, d: number): [number, number] {
  if (d === 0) throw new Error("분모가 0입니다");
  const g = gcd(n, d) || 1;
  return [n / g, d / g];
}

/**
 * 기약분수의 KaTeX 몸통. **가분수면 던진다** — 지면 전처리가 대분수로 고쳐 쓰기 때문이다
 * (2026-08-24 「전처리 대분수 함정」). `m3Trig.ts` 의 `frac` 과 같은 가드다.
 */
function fracTex(n: number, d: number): string {
  const [p, q] = reduceFraction(n, d);
  if (q === 1) return `${p}`;
  if (Math.abs(p) >= q) {
    throw new Error(`가분수 ${p}/${q} — 지면 전처리가 대분수로 고쳐 쓴다`);
  }
  return `\\dfrac{${p}}{${q}}`;
}

/** 음수만 괄호로 — `$(-9)^2$` 는 필요하고 `$(9)^2$` 는 군더더기다. */
function paren(n: number): string {
  return n < 0 ? `(${n})` : `${n}`;
}

/** `x-3` · `x+3`. $p=0$ 은 생성기가 막는다(`\sqrt{(x)^2}` 가 되어 지면이 흉하다). */
function xMinus(p: number): string {
  if (p === 0) return "x";
  return p > 0 ? `x-${p}` : `x+${-p}`;
}

/** `3-x` · `-x-3` — 근호를 벗길 때 부호가 뒤집힌 쪽. */
function minusX(p: number): string {
  if (p === 0) return "-x";
  return p > 0 ? `${p}-x` : `-x-${-p}`;
}

/** 계수를 앞에 붙일 때 — $1$ 은 안 쓴다(`1x` 는 지면 냄새다). */
function coefTex(c: number): string {
  return c === 1 ? "" : `${c}`;
}

/** `ax+b` — 계수 $\pm1$ 과 $b=0$ 을 다듬는다. */
function lin(a: number, b: number): string {
  const head = a === 1 ? "x" : a === -1 ? "-x" : `${a}x`;
  if (b === 0) return head;
  return `${head}${b > 0 ? `+${b}` : `-${-b}`}`;
}

/** 이어 붙이는 수 — `+5` · `-5`. */
function signedNum(n: number): string {
  return n < 0 ? `-${-n}` : `+${n}`;
}

/**
 * 주격 조사 — `$41$이` · `$5$가`.
 *
 * ⚠️ 받침 판정은 새로 쓰지 않고 `m2Josa` **한 곳**에서 온다. 규칙이 두 벌이 되면 한쪽만
 *    고쳐도 아무도 모른다(2026-08-18). 그리고 이 부류는 **값 검산이 구조적으로 못 본다** —
 *    산술은 맞고 글자만 틀리기 때문이다.
 */
function iGa(n: number): "이" | "가" {
  return eulReul(n) === "을" ? "이" : "가";
}

// ════════════════════════════════════════════════════════════════════════════
// A. 41U  근호 안의 부호가 나뉘는 방정식의 해를 모두 구하기            (심화상)
//    3-1 «제곱근의 뜻과 성질» → 우리 소단원 「제곱근의 뜻과 성질」
// ════════════════════════════════════════════════════════════════════════════

/**
 * 🔴 **굳힘을 «인자로» 받는 순수 함수** — ㉡ 을 밖에서 재는 통로다.
 *
 * $c_1\sqrt{(x-p)^2}+c_2\sqrt{(x-q)^2}=R$ 을 $x<p$ / $p\le x<q$ / $x\ge q$ 세 갈래로
 * 나누어 각각 일차방정식을 풀면 후보가 셋 나온다. `useIntervalCheck` 가 곧 **굳힘**이다 —
 * 끄면 후보 셋을 그대로 돌려주고, 켜면 **원 방정식에 실제로 넣어 보아** 성립하는 것만
 * 남긴다.
 *
 * ⚠️ 살아남음을 「구간 조건」이 아니라 **대입**으로 판정한다. 구간 조건은 후보를 만들 때
 *    쓴 **가설**이고, 그것으로 다시 검산하면 동어반복이 된다(2026-08-18 「지표의 «참»이
 *    제품 상수에서 나오면 성적이 오른다」). 둘이 어긋나면 해설이 거짓말을 하게 되므로
 *    `planAbsSum` 이 씨앗마다 일치를 확인하고 어긋나면 그 씨앗을 버린다.
 */
export function solveAbsSumEquation(
  p: number,
  q: number,
  c1: number,
  c2: number,
  r: number,
  useIntervalCheck: boolean,
): number[] {
  const m = c1 + c2;
  const e = c1 - c2;
  if (e === 0) throw new Error("두 계수가 같으면 가운데 갈래가 무너집니다");
  const roots = [
    (c1 * p + c2 * q - r) / m,
    (r + c1 * p - c2 * q) / e,
    (r + c1 * p + c2 * q) / m,
  ];
  if (!useIntervalCheck) return roots;
  return roots.filter((x) => c1 * Math.abs(x - p) + c2 * Math.abs(x - q) === r);
}

export type AbsBranch = {
  /** 0 왼쪽 · 1 가운데 · 2 오른쪽 */
  slot: 0 | 1 | 2;
  /** 그 갈래의 일차방정식이 낸 후보 */
  root: number;
  /** 정리한 일차식의 계수와 상수 — 해설이 그대로 읽는다 */
  a: number;
  b: number;
  /** 근호를 벗긴 두 조각 */
  unfolded: [string, string];
  /** 그 갈래가 성립하려면 $x$ 가 만족해야 하는 조건 — 해설이 그대로 읽는다 */
  needText: string;
  /** 위 조건의 경계 수 — 조사(을/를)를 가르는 데 쓴다 */
  needBound: number;
  /** 그 후보를 **원 방정식에 실제로 넣어** 성립하는가 */
  alive: boolean;
};

export type AbsSumPlan = {
  p: number;
  q: number;
  c1: number;
  c2: number;
  r: number;
  branches: AbsBranch[];
  /** 죽는 갈래의 자리 — 씨앗마다 갈려야 한다(㉠) */
  deadSlot: 0 | 1 | 2;
  sift: Sift;
  /** 살아남은 뿌리 전부의 합 */
  answer: number;
};

/**
 * **41U «심화상»** — 「방정식의 해를 모두 구하고 그 합을 구하시오」.
 *
 * 안 굳는 마디는 **$x-p$, $x-q$ 의 부호**다. $\sqrt{A^2}=|A|$ 를 벗기려면 부호를 알아야
 * 하는데 발문은 그것을 주지 않고, 부호가 미지수 $x$ 자신에 달려 있어 **판정을 시작할
 * 수조차 없다.** 성질 한 줄로는 어느 갈래가 사는지 미리 알 수 없으므로 후보 셋을 다
 * 만들어 견주어야 한다 — D-115 ⑾ 의 «상».
 *
 * ## 어느 갈래가 죽는가는 «계수를 어느 항에 붙였나»와 «$R$ 의 크기»가 정한다
 *
 * $d=q-p$, $m=c_1+c_2$ 라 하자. 대입해 보면
 *
 * ```
 * 왼쪽이 산다  ⟺ R > c₂d          가운데가 산다 ⟺ (앞에 계수) d ≤ R < cd
 * 오른쪽이 산다 ⟺ R ≥ c₁d                        (뒤에 계수) d < R ≤ cd
 * ```
 *
 * 이므로
 *
 * ```
 * 계수가 뒤 항(c₁=1, c₂=c) · d < R < cd   → **왼쪽이 죽는다**
 * 계수가 앞 항(c₁=c, c₂=1) · d < R < cd   → **오른쪽이 죽는다**
 * 어느 쪽이든           · R > cd          → **가운데가 죽는다**
 * ```
 *
 * 🔴 자연 분포로 뽑으면 «가운데가 죽는» 자리가 압도적이다($R$ 의 창이 훨씬 넓다 —
 * 실측으로 $3085$ 대 $95$·$98$). 그러면 학생이 구간 검사를 안 하고 «바깥 둘»로 찍어도
 * 거의 맞는다 — 초6 이 병합을 두 번 막힌 그 자리다. 그래서 **죽는 자리를 먼저 고르고**
 * (`wantDead`) 그에 맞추어 계수 자리와 $R$ 의 창을 정한다.
 *
 * ⚠️ 이것은 «지표에 맞춰 데이터를 고른 것»이 아니다 — 세 갈래 다 이 설계가 원래 낼 수
 *    있는 문항이고, 한쪽으로 치우쳐 뽑고 있던 것을 고르게 바꿨을 뿐이다.
 *
 * ⚠️ $c=1$ 은 쓰지 않는다. 가운데 갈래의 $x$ 계수가 $0$ 이 되어 항등식·모순으로 무너진다.
 */
export function planAbsSum(rng: Rng): AbsSumPlan {
  // ㉠ — 죽는 자리를 고르게. 0 왼쪽 · 1 가운데 · 2 오른쪽.
  const wantDead = intBetween(rng, 0, 2) as 0 | 1 | 2;
  return attempt(8000, () => {
    const c = pick(rng, [2, 3] as const);
    // 왼쪽을 죽이려면 계수가 뒤 항, 오른쪽을 죽이려면 앞 항이어야 한다(위 표).
    const front = wantDead === 2 ? true : wantDead === 0 ? false : rng() < 0.5;
    const c1 = front ? c : 1;
    const c2 = front ? 1 : c;
    const p = intBetween(rng, -9, 9);
    if (p === 0) return null;
    const d = intBetween(rng, 2, 12);
    const q = p + d;
    if (q === 0) return null;
    const r =
      wantDead === 1
        ? intBetween(rng, c * d + 1, c * d + 30)
        : intBetween(rng, d + 1, c * d - 1);
    if (r > 99) return null;

    const roots = solveAbsSumEquation(p, q, c1, c2, r, false);
    if (!roots.every(Number.isInteger)) return null;
    // 후보가 겹치면 「후보 셋」이 거짓말이 된다.
    if (new Set(roots).size !== 3) return null;
    // 지면이 읽기 좋은 범위로 — 수를 키우는 것은 난이도가 아니다(D-115 ⑽③).
    if (roots.some((v) => Math.abs(v) > 60)) return null;

    const needTexts = [`x<${p}`, `${p}\\le x<${q}`, `x\\ge ${q}`];
    const needBounds = [p, q, q];
    const needHolds = [
      roots[0]! < p,
      roots[1]! >= p && roots[1]! < q,
      roots[2]! >= q,
    ];
    const unfolded: [string, string][] = [
      [minusX(p), minusX(q)],
      [xMinus(p), minusX(q)],
      [xMinus(p), xMinus(q)],
    ];
    const m = c1 + c2;
    const bigA = c1 * p + c2 * q;
    const coefs: [number, number][] = [
      [-m, bigA],
      [c1 - c2, c2 * q - c1 * p],
      [m, -bigA],
    ];

    const branches: AbsBranch[] = roots.map((root, i) => ({
      slot: i as 0 | 1 | 2,
      root,
      a: coefs[i]![0],
      b: coefs[i]![1],
      unfolded: unfolded[i]!,
      needText: needTexts[i]!,
      needBound: needBounds[i]!,
      alive: c1 * Math.abs(root - p) + c2 * Math.abs(root - q) === r,
    }));

    // 🔴 해설이 말하는 구간 조건과 **대입해 본 결과**가 어긋나면 해설이 거짓말을 한다.
    for (let i = 0; i < 3; i += 1) {
      if (branches[i]!.alive !== needHolds[i]) return null;
    }

    // 정리한 일차식이 통째로 `x` 가 되면(계수 $\pm1$·상수 $0$) 해설의 「좌변을 정리하면」
    // 뒤에 걸음이 하나도 안 남는다 — 계약 ⑹ 이 막는 그 모양이다. 그 씨앗은 버린다.
    if (branches.some((b) => Math.abs(b.a) === 1 && b.b === 0)) return null;

    const dead = branches.filter((b) => !b.alive);
    if (dead.length !== 1) return null;
    const deadSlot = dead[0]!.slot;
    if (deadSlot !== wantDead) return null;
    // ㉡ — 죽는 뿌리가 $0$ 이면 굳힘을 지워도 «합»이 그대로다. 굳힘이 장식이 된다.
    if (dead[0]!.root === 0) return null;

    const kept = branches.filter((b) => b.alive).map((b) => b.root);
    return {
      p,
      q,
      c1,
      c2,
      r,
      branches,
      deadSlot,
      sift: { candidates: roots, kept },
      answer: kept.reduce((s, v) => s + v, 0),
    };
  });
}

/** 일차방정식을 푸는 걸음 — 계수 $\pm1$·상수 $0$ 이면 군더더기 줄을 안 만든다. */
function linearSolveText(
  a: number,
  b: number,
  r: number,
  root: number,
): string {
  if (a === 1 && b === 0) return `$x=${root}$이다.`;
  if (a === 1 || b === 0) {
    return `$${lin(a, b)}=${r}$이므로 $x=${root}$이다.`;
  }
  return `$${lin(a, b)}=${r}$에서 $${lin(a, 0)}=${r - b}$이므로 $x=${root}$이다.`;
}

function renderAbsSum(rng: Rng): Body {
  const plan = planAbsSum(rng);
  const { p, q, c1, c2, r } = plan;
  const eq =
    `${coefTex(c1)}\\sqrt{(${xMinus(p)})^{2}}` +
    `+${coefTex(c2)}\\sqrt{(${xMinus(q)})^{2}}=${r}`;
  const content = `방정식 $${eq}$의 해를 모두 구하고, 그 해의 합을 구하시오.`;

  const lines: string[] = [
    `$\\sqrt{A^{2}}=|A|$이므로 근호를 벗기려면 $${xMinus(p)}$${waGwa(p)} $${xMinus(q)}$의 부호를 알아야 한다.`,
    `그 부호는 $x$의 값에 따라 달라지므로 $x=${p}$, $x=${q}$${eulReul(q)} 경계로 하여 세 경우로 나눈다.`,
  ];
  for (const br of plan.branches) {
    const [u0, u1] = br.unfolded;
    lines.push(
      `${MARKS[br.slot]} $${br.needText}$일 때 $\\sqrt{(${xMinus(p)})^{2}}=${u0}$, ` +
        `$\\sqrt{(${xMinus(q)})^{2}}=${u1}$이므로 주어진 방정식은 ` +
        `$${coefTex(c1)}(${u0})+${coefTex(c2)}(${u1})=${r}$이다.`,
    );
    lines.push(`좌변을 정리하면 ${linearSolveText(br.a, br.b, r, br.root)}`);
    lines.push(
      br.alive
        ? `이 값은 조건 $${br.needText}$${eulReul(br.needBound)} 만족시키므로 주어진 방정식의 해이다.`
        : `그런데 이 값은 조건 $${br.needText}$${eulReul(br.needBound)} 만족시키지 않으므로 해가 아니다.`,
    );
  }
  const kept = [...plan.sift.kept].sort((a, b) => a - b);
  lines.push(
    `따라서 주어진 방정식의 해는 $x=${kept.join("$, $x=")}$이고, ` +
      `그 합은 $${kept[0]}${kept
        .slice(1)
        .map((v) => signedNum(v))
        .join("")}=${plan.answer}$이다.`,
  );

  return {
    content,
    answer: `$${plan.answer}$`,
    solution: lines.join("\n"),
    facts: {
      p,
      q,
      c1,
      c2,
      r,
      deadSlot: plan.deadSlot,
      cand0: plan.sift.candidates[0]!,
      cand1: plan.sift.candidates[1]!,
      cand2: plan.sift.candidates[2]!,
      x: plan.answer,
    },
    figureSpec: null,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// B. 42U  식이 하나로 정해지지 않는 포물선에서 대칭으로 나머지 절편       (심화중)
//    3-1 «이차함수의 그래프 ⑴» → 우리 소단원 「이차함수와 그래프」
// ════════════════════════════════════════════════════════════════════════════

/**
 * 🔴 **굳힘 그 자체를 순수 함수로.** 「$y$좌표가 같은 두 점의 $x$좌표의 중점이 축」이고,
 * 「$x$축과 만나는 두 점도 축에 대하여 대칭」이다. 그래서 $a$·$q$ 를 **하나도 구하지
 * 않고** 답이 나온다 — 값을 끝까지 계산하지 않고 마디를 지우는 D-115 ⑾ 의 «중».
 *
 * $x_1$ 이나 $x_2$ 를 흔들면 발문이 지시하는 축이 옮겨 가 답이 **실제로 달라진다** —
 * 시험이 그것으로 ㉡ 을 잰다.
 */
export function solveAxisReflection(x1: number, x2: number, w: number): number {
  return x1 + x2 - w;
}

export type AxisReflectPlan = {
  /** 축 */
  p: number;
  /** 대칭인 두 점이 축에서 떨어진 거리 */
  d: number;
  /** 발문이 주는 $x$절편 */
  w: number;
  x1: number;
  x2: number;
  /** $(w-p)^2$ — 해설이 $q=-(w-p)^2a$ 로 읽는다 */
  wp2: number;
  /** $k=\{d^2-(w-p)^2\}a$ 의 계수 */
  kCoef: number;
  answer: number;
};

/**
 * **42U «심화중»** — 「식이 하나로 정해지지 않는 포물선에서 나머지 $x$절편」.
 *
 * 조건이 둘뿐이라 자유도가 하나 남는다 — $a$ 는 $0$ 이 아닌 아무 수나 될 수 있고 그때마다
 * $q=-a(w-p)^2$, $k=a\{d^2-(w-p)^2\}$ 로 따라 움직인다. 발문이 준 $k$ 도 미지수라 대입해도
 * 식이 닫히지 않는다. 그런데도 **축**은 굳고, 축이 굳으면 대칭점도 굳는다.
 *
 * ## 불변식 셋 — 없으면 문항이 무너지거나 ㉠ 이 열린다
 *
 * ```
 * w ≠ p          두 절편이 겹치면 「다른 한 점」이 없다
 * |w-p| ≠ d      그러면 k=0 이 되어 발문의 「k≠0」과 부딪힌다
 * d ≥ 1          두 대칭점이 같은 점이면 축을 못 정한다
 * ```
 *
 * 🔴 이 셋이 서면 답 $2p-w$ 는 $x_1$·$x_2$·$w$ **어느 것과도 다르다**(각각 $w=x_2$,
 * $w=x_1$, $w=p$ 일 때만 같아지는데 셋 다 막혀 있다). 곧 「발문에 적힌 수 하나 찍기」가
 * **구조적으로 0%** 다 — ㉠ 에 해당하는 것을 여기서는 후보 목록이 아니라 이 불변식으로
 * 막는다(후보 목록이 아예 없는 갈래이므로). 시험이 이 불변식을 잠근다.
 */
export function planAxisReflect(rng: Rng): AxisReflectPlan {
  return attempt(2000, () => {
    const p = intBetween(rng, -6, 6);
    const d = intBetween(rng, 1, 7);
    const w = intBetween(rng, -9, 9);
    if (w === p) return null;
    if (Math.abs(w - p) === d) return null;
    const answer = solveAxisReflection(p - d, p + d, w);
    if (Math.abs(answer) > 20) return null;
    return {
      p,
      d,
      w,
      x1: p - d,
      x2: p + d,
      wp2: (w - p) * (w - p),
      kCoef: d * d - (w - p) * (w - p),
      answer,
    };
  });
}

/** `3a` · `a` · `-a` — 계수 $\pm1$ 이 `1a` 로 나가지 않게. */
function aTerm(n: number): string {
  if (n === 1) return "a";
  if (n === -1) return "-a";
  return `${n}a`;
}

/** 이어 붙이는 `a` 항 — `+3a` · `-a`. */
function aTermSigned(n: number): string {
  if (n === 1) return "+a";
  if (n === -1) return "-a";
  return n > 0 ? `+${n}a` : `-${-n}a`;
}

function renderAxisReflect(rng: Rng): Body {
  const plan = planAxisReflect(rng);
  const { p, d, w, x1, x2, wp2, kCoef, answer } = plan;
  const dist = Math.abs(w - p);
  const wLeft = w < p;

  const content =
    `이차함수 $y=a(x-p)^{2}+q$의 그래프가 두 점 $(${x1},\\ k)$, $(${x2},\\ k)$를 지나고, ` +
    `점 $(${w},\\ 0)$도 지난다. 이 그래프가 $x$축과 만나는 다른 한 점의 $x$좌표를 구하시오. ` +
    `(단, $a$, $p$, $q$, $k$는 상수이고 $a\\ne 0$, $k\\ne 0$이다.)`;

  const lines = [
    `두 점 $(${x1},\\ k)$와 $(${x2},\\ k)$는 $y$좌표가 $k$로 서로 같으므로 이 그래프의 축에 대하여 서로 대칭이다.`,
    // ⚠️ `${x1}+${x2}` 로 쓰면 두 점이 다 음수일 때 지면에 `\dfrac{-11+-1}{2}` 가 나간다.
    //    값은 맞고 KaTeX 도 초록이라 값 검산이 구조적으로 못 본다 — 냄새 훑개가 잡았다.
    `따라서 축은 두 점의 $x$좌표의 중점을 지나는 직선이므로 축의 방정식은 $x=\\dfrac{${x1}${signedNum(x2)}}{2}=${p}$이다.`,
    `곧 이 이차함수의 식은 $y=a(${xMinus(p)})^{2}+q$ 꼴이다.`,
    `그래프가 점 $(${w},\\ 0)$을 지나므로 $a\\times${paren(w - p)}^{2}+q=0$, 즉 $q=${aTerm(-wp2)}$이다.`,
    `또 $x=${x1}$일 때 $y=a\\times${paren(x1 - p)}^{2}+q=${aTerm(d * d)}${aTermSigned(-wp2)}=${aTerm(kCoef)}$이므로 $k=${aTerm(kCoef)}$이다.`,
    `이와 같이 $a$가 $0$이 아닌 어떤 값이어도 $q$와 $k$가 그에 맞추어 정해지므로 $a$, $q$, $k$의 값은 하나로 정해지지 않는다.`,
    `그러나 포물선은 축에 대하여 대칭이므로 $x$축과 만나는 두 점도 축 $x=${p}$에 대하여 서로 대칭이다.`,
    `점 $(${w},\\ 0)$은 축에서 ${wLeft ? "왼" : "오른"}쪽으로 $${dist}$만큼 떨어져 있으므로, 다른 한 점은 축에서 ${wLeft ? "오른" : "왼"}쪽으로 $${dist}$만큼 떨어져 있다.`,
    `따라서 구하는 점의 $x$좌표는 $2\\times${paren(p)}-${paren(w)}=${answer}$이다.`,
    `실제로 $a=1$이면 $y=(${xMinus(p)})^{2}${signedNum(-wp2)}$이고, 이 식에 $x=${w}$${waGwa(w)} $x=${answer}$${eulReul(answer)} 넣으면 $y$의 값이 모두 $0$이다.`,
  ];

  return {
    content,
    answer: `$${answer}$`,
    solution: lines.join("\n"),
    facts: { p, d, w, x1, x2, wp2, kCoef, x: answer },
    figureSpec: null,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// C. 43U  인수분해를 이용하여 자연수 순서쌍 모두 구하기                 (심화상)
//    3-1 «다항식의 인수분해» → 우리 소단원 「인수분해의 응용」
// ════════════════════════════════════════════════════════════════════════════

/**
 * 🔴 **굳힘을 «인자로» 받는 순수 함수** — ㉡ 을 밖에서 재는 통로다.
 *
 * $x^2-y^2=N$ 을 $(x+y)(x-y)=N$ 으로 접으면 곱이 $N$ 인 두 자연수 짝 $(u,v)$, $u<v$ 가
 * 후보다. 굳힘은 「$u$ 와 $v$ 의 홀짝이 같아야 $x=\dfrac{u+v}{2}$, $y=\dfrac{v-u}{2}$ 가
 * 자연수」이고, `useParity` 가 곧 그 굳힘이다.
 *
 * 짝을 **$u$ 오름차순**으로 훑으므로 돌려주는 $x$ 는 내림차순이다 — 해설의 표지 순서와
 * 같다(해설이 이 순서를 그대로 읽는다).
 */
export function solveDiffOfSquares(n: number, useParity: boolean): number[] {
  const out: number[] = [];
  for (let u = 1; u * u < n; u += 1) {
    if (n % u !== 0) continue;
    const v = n / u;
    if (useParity && u % 2 !== v % 2) continue;
    out.push((u + v) / 2);
  }
  return out;
}

export type DiffSquaresRow = {
  u: number;
  v: number;
  /** 두 수의 홀짝이 같은가 — 곧 굳힘 */
  sameParity: boolean;
  /** $x=\dfrac{u+v}{2}$ (죽는 짝에서는 정수가 아니다) */
  x: number;
  /** $y=\dfrac{v-u}{2}$ */
  y: number;
};

export type DiffSquaresPlan = {
  n: number;
  rows: DiffSquaresRow[];
  sift: Sift;
  answer: number;
};

/**
 * 쓸 수 있는 $N$ 을 **프로그램으로 뽑는다** — 손 목록은 세는 쪽과 고치는 쪽을 같이 눈멀게
 * 한다(2026-08-18). 조건은 아래 넷이고 각각 까닭이 있다.
 *
 * ```
 * N ≡ 0 (mod 4)          홀수면 모든 짝이 홀·홀이라 굳힘이 아무도 안 거르고(㉡ 함정),
 *                        N ≡ 2 (mod 4) 면 해가 하나도 없다
 * 짝의 수 ≤ 8            해설이 지면에서 안 넘치게 (표지도 여덟까지만 있다)
 * 사는 짝 2~4 · 죽는 짝 ≥ 2   굳힘이 실제로 일하고, 답도 한 자리가 아니게
 * 사는 자리가 연속이 아닐 것   연속이면 「앞/뒤에서 몇 개」로 찍힌다 (㉠)
 * ```
 */
function diffSquaresPool(): number[] {
  const out: number[] = [];
  for (let n = 4; n <= 800; n += 4) {
    const pairs: [number, number][] = [];
    for (let u = 1; u * u < n; u += 1) {
      if (n % u === 0) pairs.push([u, n / u]);
    }
    if (pairs.length > 8) continue;
    const alive = pairs.map(([u, v]) => u % 2 === v % 2);
    const nAlive = alive.filter(Boolean).length;
    if (nAlive < 2 || nAlive > 4) continue;
    // ⚠️ **이 줄은 지금 아무것도 안 거른다** — 변이 시험이 그렇게 말했다(빼도 산출물이
    //    글자 하나 안 바뀐다). 「사는 것 ≤ 4」와 「사는 자리가 연속이 아닐 것」이 이미
    //    함의하기 때문이다(짝 $(1,N)$ 이 늘 죽으므로 죽는 것이 하나면 사는 자리가
    //    $1..k$ 로 연속이 된다). 지우지 않고 남기는 까닭은 **뜻을 적어 두기 위해서**다 —
    //    아래 연속 규칙을 누가 무르면 그 순간 이 줄이 일을 시작한다. 「가드다」라고
    //    읽지 말 것(2026-08-18 「LOOP 가 있나」와 같은 함정을 미리 막는다).
    if (alive.length - nAlive < 2) continue;
    const idx = alive.map((a, i) => (a ? i : -1)).filter((i) => i >= 0);
    const contiguous = idx.every((v, i) => i === 0 || v === idx[i - 1]! + 1);
    if (contiguous) continue;
    const sum = solveDiffOfSquares(n, true).reduce((a, b) => a + b, 0);
    // 지면이 읽기 좋은 범위로 — 수를 키우는 것은 난이도가 아니다(D-115 ⑽③).
    if (sum > 400) continue;
    out.push(n);
  }
  if (out.length < 20) {
    throw new Error(`43U: 쓸 수 있는 N 이 ${out.length}개뿐입니다`);
  }
  return out;
}

let poolCache: number[] | null = null;

/** **43U «심화상»** — 「$x^2-y^2=N$ 인 자연수 순서쌍을 모두 구해 $x$ 의 합」. */
export function planDiffSquares(rng: Rng): DiffSquaresPlan {
  poolCache ??= diffSquaresPool();
  const n = pick(rng, poolCache);
  const rows: DiffSquaresRow[] = [];
  for (let u = 1; u * u < n; u += 1) {
    if (n % u !== 0) continue;
    const v = n / u;
    rows.push({
      u,
      v,
      sameParity: u % 2 === v % 2,
      x: (u + v) / 2,
      y: (v - u) / 2,
    });
  }
  const kept = solveDiffOfSquares(n, true);
  return {
    n,
    rows,
    sift: { candidates: rows.map((r) => r.x), kept },
    answer: kept.reduce((a, b) => a + b, 0),
  };
}

function renderDiffSquares(rng: Rng): Body {
  const plan = planDiffSquares(rng);
  const { n, rows } = plan;
  const content =
    `$x^{2}-y^{2}=${n}$${eulReul(n)} 만족시키는 자연수 $x$, $y$의 순서쌍 $(x,\\ y)$를 ` +
    `모두 구할 때, $x$의 값의 합을 구하시오.`;

  const pairList = rows.map((r) => `(${r.u},\\ ${r.v})`).join(",\\ ");
  const alive = rows.filter((r) => r.sameParity);

  const lines: string[] = [
    `$x^{2}-y^{2}=(x+y)(x-y)$이므로 주어진 식은 $(x+y)(x-y)=${n}$이다.`,
    `$x$, $y$가 자연수이므로 $x+y$는 자연수이고, $y\\ge 1$이므로 $x-y<x+y$이다. 또 $(x+y)(x-y)=${n}>0$이고 $x+y>0$이므로 $x-y>0$이다.`,
    `따라서 $x-y$와 $x+y$는 곱이 $${n}$인 두 자연수이고 $x-y<x+y$이다. 그 짝을 모두 나열하면 $(x-y,\\ x+y)=${pairList}$이다.`,
    `한편 $x=\\dfrac{(x+y)+(x-y)}{2}$, $y=\\dfrac{(x+y)-(x-y)}{2}$이므로 $x-y$와 $x+y$의 홀짝이 같아야 $x$, $y$가 자연수가 된다.`,
  ];
  rows.forEach((r, i) => {
    if (r.sameParity) {
      lines.push(
        `${MARKS[i]} $(x-y,\\ x+y)=(${r.u},\\ ${r.v})$이면 두 수가 모두 ${r.u % 2 === 0 ? "짝수" : "홀수"}이므로 ` +
          `$x=\\dfrac{${r.v}+${r.u}}{2}=${r.x}$, $y=\\dfrac{${r.v}-${r.u}}{2}=${r.y}$이다.`,
      );
    } else {
      lines.push(
        `${MARKS[i]} $(x-y,\\ x+y)=(${r.u},\\ ${r.v})$이면 한 수는 홀수, 다른 한 수는 짝수이므로 ` +
          `두 수의 합 $${r.u}+${r.v}=${r.u + r.v}$${iGa(r.u + r.v)} 홀수이고, $2x=${r.u + r.v}$에서 $x$가 자연수가 아니다. 따라서 조건에 맞지 않는다.`,
      );
    }
  });
  lines.push(
    `따라서 순서쌍 $(x,\\ y)$는 ${alive.map((r) => `$(${r.x},\\ ${r.y})$`).join(", ")}이고, ` +
      `구하는 합은 $${alive.map((r) => r.x).join("+")}=${plan.answer}$이다.`,
  );

  return {
    content,
    answer: `$${plan.answer}$`,
    solution: lines.join("\n"),
    facts: {
      n,
      pairCount: rows.length,
      keptCount: alive.length,
      x: plan.answer,
    },
    figureSpec: null,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// D. 44U  빗변의 길이와 넓이만 주어진 직각삼각형의 삼각비               (심화중)
//    3-1 «삼각비» → 우리 소단원 「삼각비의 뜻」
// ════════════════════════════════════════════════════════════════════════════

/**
 * 🔴 **굳힘을 «인자로» 받는 순수 함수** — ㉡ 을 밖에서 재는 통로다.
 *
 * 두 직각변의 길이 «집합» $\{s,t\}$ ($s<t$) 는 굳지만 **어느 쪽이 $\overline{BC}$ 인지**는
 * 빗변과 넓이만으로 안 정해진다. `aIsSmaller` 가 곧 굳힘이다 — 「큰 각의 대변이 더 길다」가
 * 발문의 $\angle A<\angle B$ 를 $\overline{BC}<\overline{CA}$ 로 옮겨 배정을 고른다.
 * 길이를 **다시 계산하지 않고** 후보 하나를 죽이므로 D-115 ⑾ 의 «중».
 *
 * `ratio` — $0$ 이면 $\sin\mathrm A=\dfrac{\overline{BC}}{\overline{AB}}$,
 * $1$ 이면 $\cos\mathrm A=\dfrac{\overline{CA}}{\overline{AB}}$. 둘 다 진분수라 지면에서
 * 대분수로 바뀌지 않는다($\tan$ 은 가분수가 될 수 있어 쓰지 않는다 — `m3Trig.ts` 가 같은
 * 이유로 걸어 둔 가드다).
 */
export function solveHypotenuseArea(
  s: number,
  t: number,
  hyp: number,
  aIsSmaller: boolean,
  ratio: 0 | 1,
): [number, number] {
  const bc = aIsSmaller ? s : t;
  const ca = aIsSmaller ? t : s;
  return reduceFraction(ratio === 0 ? bc : ca, hyp);
}

export type HypAreaPlan = {
  /** 두 직각변, $s<t$ */
  s: number;
  t: number;
  hyp: number;
  area: number;
  /** $\angle\mathrm A<\angle\mathrm B$ 인가 — 곧 굳힘의 방향 */
  aIsSmaller: boolean;
  /** 0 = $\sin$, 1 = $\cos$ */
  ratio: 0 | 1;
  answer: [number, number];
  sift: Sift;
};

/**
 * 피타고라스 세 쌍을 **계산해서** 만든다 — 손으로 옮긴 표는 샌다(2026-08-18).
 * $s<t$ 로만 담으므로 두 직각변이 같은 세 쌍은 애초에 없다(있으면 두 배정이 같아져
 * 마디가 사라진다).
 */
function pythagoreanTriples(): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let c = 5; c <= 65; c += 1) {
    for (let a = 1; a < c; a += 1) {
      const b2 = c * c - a * a;
      const b = Math.round(Math.sqrt(b2));
      if (b * b !== b2 || a >= b) continue;
      // 지면이 읽기 좋은 범위로 — 수를 키우는 것은 난이도가 아니다(D-115 ⑽③).
      if ((a * b) / 2 > 900) continue;
      out.push([a, b, c]);
    }
  }
  if (out.length < 20) {
    throw new Error(`44U: 쓸 수 있는 세 쌍이 ${out.length}개뿐입니다`);
  }
  return out;
}

let tripleCache: [number, number, number][] | null = null;

/** **44U «심화중»** — 「빗변과 넓이만 주어진 직각삼각형의 삼각비」. */
export function planHypArea(rng: Rng): HypAreaPlan {
  tripleCache ??= pythagoreanTriples();
  return attempt(200, () => {
    const [s, t, hyp] = pick(rng, tripleCache!);
    const area = (s * t) / 2;
    // 🔴 $(c,\,S)$ 가 두 변을 «집합»으로 하나만 정하는지 **직접 훑어** 확인한다.
    //    (수학적으로는 $a+b$·$|a-b|$ 가 굳으므로 유일한데, 말로 믿지 않고 센다.)
    const found: [number, number][] = [];
    for (let a = 1; a < hyp; a += 1) {
      const b = (2 * area) / a;
      if (!Number.isInteger(b) || a >= b) continue;
      if (a * a + b * b === hyp * hyp) found.push([a, b]);
    }
    // ⚠️ 이 둘도 **지금은 한 번도 안 걸린다**(변이 시험이 확인했다 — 빼도 산출물이 같다).
    //    $a+b$ 와 $|a-b|$ 가 굳으므로 수학적으로 유일한 것이 맞다. 그래도 남기는 까닭은
    //    **말로 믿지 않기 위해서**다 — 세 쌍 목록이나 넓이 규칙이 바뀌면 여기서 멈춘다.
    if (found.length !== 1) return null;
    if (found[0]![0] !== s || found[0]![1] !== t) return null;

    // ㉠ — 굳힘의 «방향»과 묻는 비를 씨앗마다 뒤집는다. 그래야 살아남는 후보가
    //      큰 값인 씨앗과 작은 값인 씨앗이 반반이 된다.
    const aIsSmaller = rng() < 0.5;
    const ratio = (rng() < 0.5 ? 0 : 1) as 0 | 1;
    const answer = solveHypotenuseArea(s, t, hyp, aIsSmaller, ratio);
    // 후보는 「묻는 비가 가질 수 있는 두 값」이다. 둘 다 진분수이고 서로 다르다.
    const candidates = [s / hyp, t / hyp];
    const keptValue = answer[0] / answer[1];
    return {
      s,
      t,
      hyp,
      area,
      aIsSmaller,
      ratio,
      answer,
      sift: { candidates, kept: [candidates.find((v) => v === keptValue)!] },
    };
  });
}

const FN_TEX = ["\\sin", "\\cos"] as const;

function renderHypArea(rng: Rng): Body {
  const plan = planHypArea(rng);
  const { s, t, hyp, area, aIsSmaller, ratio } = plan;
  const cmp = aIsSmaller ? "<" : ">";
  const fn = FN_TEX[ratio];
  const bc = aIsSmaller ? s : t;
  const ca = aIsSmaller ? t : s;
  const target = ratio === 0 ? bc : ca;
  const targetName = ratio === 0 ? "\\overline{BC}" : "\\overline{CA}";
  const [num, den] = plan.answer;
  const reduced = num !== target || den !== hyp;

  const content =
    `$\\angle C=90^{\\circ}$인 직각삼각형 $ABC$에서 $\\overline{AB}=${hyp}$이고 그 넓이가 $${area}$이다. ` +
    `$\\angle A${cmp}\\angle B$일 때, $${fn} A$의 값을 구하시오.`;

  const sum = s + t;
  const diff = t - s;
  const lines = [
    `$\\overline{BC}=a$, $\\overline{CA}=b$라 하면 $\\angle C=90^{\\circ}$이므로 피타고라스 정리에서 $a^{2}+b^{2}=${hyp}^{2}=${hyp * hyp}$이다.`,
    `또 삼각형 $ABC$의 넓이가 $${area}$이므로 $\\dfrac{1}{2}ab=${area}$에서 $ab=${2 * area}$이다.`,
    `곱셈 공식에서 $(a+b)^{2}=a^{2}+b^{2}+2ab=${hyp * hyp}+${4 * area}=${sum * sum}$이고, $a+b>0$이므로 $a+b=${sum}$이다.`,
    `또 $(a-b)^{2}=a^{2}+b^{2}-2ab=${hyp * hyp}-${4 * area}=${diff * diff}$이므로 $|a-b|=${diff}$이다.`,
    `$a+b=${sum}$, $|a-b|=${diff}$이므로 두 변의 길이는 $${t}$${waGwa(t)} $${s}$이다. 그런데 여기까지로는 어느 쪽이 $\\overline{BC}$인지 정해지지 않는다.`,
    `삼각형에서 큰 각의 대변이 더 길다는 것을 쓰면 두 경우를 가를 수 있다.`,
    `${MARKS[0]} $\\overline{BC}=${t}$, $\\overline{CA}=${s}$이면 $\\angle A$의 대변이 $\\angle B$의 대변보다 더 기므로 $\\angle A>\\angle B$이다.`,
    `${MARKS[1]} $\\overline{BC}=${s}$, $\\overline{CA}=${t}$이면 $\\angle A$의 대변이 $\\angle B$의 대변보다 더 짧으므로 $\\angle A<\\angle B$이다.`,
    `주어진 조건은 $\\angle A${cmp}\\angle B$이므로 조건에 맞는 경우는 ${aIsSmaller ? MARKS[1] : MARKS[0]}뿐이다.`,
    `따라서 $\\overline{BC}=${bc}$, $\\overline{CA}=${ca}$이므로 $${fn} A=\\dfrac{${targetName}}{\\overline{AB}}=\\dfrac{${target}}{${hyp}}${reduced ? `=${fracTex(num, den)}` : ""}$이다.`,
  ];

  return {
    content,
    answer: `$${fracTex(num, den)}$`,
    solution: lines.join("\n"),
    facts: {
      hyp,
      area,
      small: s,
      large: t,
      aIsSmaller: aIsSmaller ? 1 : 0,
      ratio,
      // 계약 ⑵ — 답이 기약분수라 `x` 는 **분자**, 분모는 `den` 이다.
      x: num,
      den,
    },
    figureSpec: null,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 등록
// ════════════════════════════════════════════════════════════════════════════

function def(
  book: string,
  minor: string,
  rpmType: string,
  rpmTitle: string,
  unitSection: string,
  difficulty: MidProblem["difficulty"],
  gen: (rng: Rng) => Body,
): TypeEntry {
  return {
    key: `${book}|${minor}|${rpmType}`,
    grade: GRADE,
    unitSection,
    rpmBook: book,
    rpmMinor: minor,
    rpmType,
    rpmTitle,
    handler: (rng) => ({
      grade: GRADE,
      unitSection,
      rpmBook: book,
      rpmMinor: minor,
      rpmType,
      rpmTitle,
      difficulty,
      ...gen(rng),
    }),
  };
}

export const M3_TOP_2: TypeEntry[] = [
  def(
    BOOK1,
    MINOR.제곱근,
    "41U",
    "근호 안의 부호가 나뉘는 방정식의 해를 모두 구하기",
    SEC.제곱근,
    "심화상",
    renderAbsSum,
  ),
  def(
    BOOK1,
    MINOR.이차함수1,
    "42U",
    "식이 하나로 정해지지 않는 포물선에서 대칭으로 나머지 절편 구하기",
    SEC.이차함수,
    "심화중",
    renderAxisReflect,
  ),
  def(
    BOOK1,
    MINOR.인수분해,
    "43U",
    "인수분해를 이용하여 자연수 순서쌍 모두 구하기",
    SEC.인수응용,
    "심화상",
    renderDiffSquares,
  ),
  def(
    BOOK2,
    MINOR.삼각비,
    "44U",
    "빗변의 길이와 넓이만 주어진 직각삼각형의 삼각비",
    SEC.삼각비,
    "심화중",
    renderHypArea,
  ),
];
