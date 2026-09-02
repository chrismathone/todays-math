/**
 * 중3 **확대 갈래 3차 물결**(`심화중`·`심화상`) — D-116, 번호 접미사 **`V`**.
 *
 * 병렬 세션 소유 모듈. 이 파일과 `generate.ts` 의 `...M3_TOP_3` **한 줄**만 이 갈래가
 * 건드린다(등록 한 줄은 리드가 넣는다).
 *
 * ## ⑴ 왜 또 새 파일인가
 *
 * `m3Top.ts`(1차, `T`)·`m3Top2.ts`(2차, `U`)는 자기 시험이 「등록한 유형이 정확히 N개」를
 * **개수로 얼려** 두었다. 거기에 유형을 더하면 그 가드가 빨개지고, 초록으로 되돌리는
 * 유일한 길이 **가드를 무르는 것**이 된다. 그리고 오르카 다중 세션이 같은 파일을 동시에
 * 만지면 병합에서 부딪힌다 — 새 파일 하나 + spread 한 줄이면 그 둘을 다 피한다.
 *
 * ## ⑵ 무엇이 «중»이고 무엇이 «상»인가 (D-115 ⑾ · `m1Top.ts`·`m3Top2.ts` 머리말과 한 벌)
 *
 * ```
 * 심화중   마디 하나가 안 굳고, **그 소단원의 개념**이 그것을 굳힌다.
 *          성질 하나가 후보를 «끝까지 계산하지 않고» 거른다.
 * 심화상   성질로 못 굳혀 후보를 **다 만들어 견줘야** 한다.
 * ```
 *
 * | 키 | 갈래 | 안 굳는 마디 | 무엇이 굳히나 | 같은 소단원 `심화하`와 무엇이 다른가 |
 * |---|---|---|---|---|
 * | `이차방정식의 풀이\|51V` | **심화중** | 상수 $k$ — $x=1$ 을 대입하면 $k$ 의 이차방정식이 되어 후보가 **둘**이고, 발문이 어느 쪽인지 안 정한다. 게다가 **둘 다** $x=1$ 을 해로 만든다 | **이차방정식의 뜻**(이 소단원 `01` 번: $ax^2+bx+c=0$ 에서 $a\ne0$). 한 후보는 $x^2$ 의 계수를 $0$ 으로 만들어 그 식이 일차방정식이 된다 — 방정식을 **풀지 않고** 계수만 보고 죽는다 | `16`(해에 대한 조건)은 **식이 이미 이차방정식으로 확정**돼 있고 조건이 «해의 꼴»(자연수·정수)에 걸린다. `51V` 는 조건이 걸리는 곳이 **식 자체**다 |
 * | `다항식의 곱셈\|52V` | **심화중** | $x$ — 「값에 관계없이」라 끝까지 안 굳고, 각 괄호의 곱도 하나로 안 굳는다 | **곱셈 공식** $(A+B)(A-B)=A^2-B^2$. 세 곱을 펴면 $x^2$ 이 셋 나와 발문이 빼 둔 $3x^2$ 과 **소거되어** 식이 상수가 된다 — $x$ 를 **하나도 구하지 않고** 답이 굳는다 | 심화하 다섯(`09`·`13`·`14`·`17`·`18`)은 **$x$(또는 $x$ 가 만족하는 식)가 발문에서 주어져 굳는다.** `52V` 는 $x$ 가 끝까지 안 굳고 **답에도 안 나오며**, 묻는 것이 계수 $a$ 다 |
 * | `이차방정식의 활용\|53V` | **심화상** | 상수 $k$ — 「두 근이 유리수」는 $B^2-4Ak$ 가 **제곱수인가**에 달렸고 그 판정은 $k$ 마다 다르다 | 굳지 **않는다.** 근이 있는 창을 만든 뒤 그 안의 $k$ 를 **하나씩** 근의 공식에 넣어 근호 안이 제곱수인지 견주어야 산 것과 죽은 것이 갈린다 | `18`(두 근의 차)은 같은 근호를 **«차»로 한 번 읽으면 끝**이고 값이 **하나로 굳는다** — 후보가 없다 |
 * | `근호를 포함한 식의 계산\|54V` | **심화상** | 자연수 $n$ — 창(「$N$ 이하」)만 주고 값을 안 준다. 근호가 두 자리에 있어 정리하기 전에는 유리수인지조차 못 본다 | 굳지 **않는다.** 유리화 → 「$n$ 이 제곱수」 → 「$k$ 가 $D$ 의 약수」 → 창, **세 번** 걸러야 하고 $D$ 의 약수를 **모두 만들어** 하나씩 대 봐야 한다 | 심화하 다섯 중 넷(`06`·`15`·`16`·`20`)은 미지수가 **아예 없고**, 가장 가까운 `17` 조차 「무리수의 계수 $=0$」 **한 줄로** $a$ 가 굳는다 |
 *
 * ## ⑶ 🔴 2차 물결에서 **실제로 새어 나간 것** — 3차는 이렇게 막았다
 *
 * 적대적 검증이 12유형에서 찾은 것은 전부 **「값은 맞는데 지면이 틀린」** 부류다.
 * 값 검산·KaTeX·조사 자가 **구조적으로 못 본다.**
 *
 * ㉮ **해설이 틀린 수를 적었다** — 「해설에 이 문자열이 있나」(`toContain`)는 가드가
 *    아니다(마지막 줄 하나로 충족된다). 그래서 이 물결의 시험은 **해설 글에서 등식을
 *    전부 뽑아** 좌·우변을 각각 파싱하고 여러 정수를 넣어 값이 같은지 본다. 그리고
 *    **「등식을 몇 개 봤나」를 찍고 $0$ 이면 판정을 거부**한다 — $0$ 은 「깨끗」과
 *    「못 셈」을 안 가른다(2026-08-21).
 * ㉯ **`+0`·`(x)^{2}`** — 아래 `signedNum`·`paren`·`coefTex`·`lin` 이 한 곳에서 막고,
 *    공용 계량기 `pageSmells` 가 전 씨앗을 다시 훑는다.
 * ㉰ **한국어 활용 오류** — 이 넷은 「길-」류 ㄹ 불규칙 낱말을 아예 안 쓴다.
 * ㉱ **발문의 글자와 해설의 글자가 부딪혔다** — `52V` 는 발문이 $a$ 를 미지수로 쓰므로
 *    해설이 곱셈 공식을 **대문자 $A$·$B$** 로 적는다. `54V` 는 발문이 $n$ 만 쓰고 해설이
 *    새로 들이는 글자는 $k$ 다(발문에 없다).
 * ㉲ 🔴 **손 목록을 쓰면 눈이 먼다** — 2차 물결의 중3 시험만 공용 계량기를 안 쓰고
 *    BAD 목록을 다시 적었고 거기에 `+0` 이 없어 **두 유형**이 같이 샜다. 이 물결의
 *    시험은 `src/__tests__/helpers/midPage.ts` 의 `pageSmells`·`josaMismatches` 를
 *    **반드시** 쓴다(손 목록을 더 두는 것은 좋으나 공용 자를 빼지 않는다).
 * ㉳ **소단원 이름에 가는 공백(U+2009)** — 넷 다 `prisma/seed-data/units.ts` 에서
 *    글자 그대로 가져왔고(orderIndex 471·472·475·476) 가는 공백 $0$ 개를 확인했다.
 *
 * ## ⑷ 함정 ㉠㉡㉢ — 초등이 네 물결에 걸쳐 물린 자리
 *
 * ㉠ **창을 한쪽 끝만 주면 굳힘이 장식이 된다.** 「살아남는 후보가 언제나 목록의 같은
 *    자리」면 굳힘은 «어느 후보인가»를 한 번도 안 고른다.
 *
 *    · `51V` — 후보가 **둘**이라 우연 수준이 $50\%$ 다(2차 `44U` 가 머리말에 적어 둔
 *      자리). 그래서 **죽는 자리를 먼저 고르고**(`wantDeadIsMin`) 거기에 맞는 $(a,p)$ 만
 *      뽑는다. 자연 분포로 뽑으면 «작은 쪽이 죽는» 자리가 $16$ 대 $8$ 로 쏠린다 —
 *      실측했다. 반반으로 고르면 $50\%$ 로 붙는다. 시험이 그 균형을 잠근다.
 *      그 위에 더해, **답은 살아남은 $k$ 가 아니라 그 방정식의 «나머지 해»** 다 —
 *      후보를 옳게 골라도 한 걸음이 더 남는다.
 *
 *      🔴 **그런데 그 «한 걸음»이 나눗셈 한 번으로 건너뛰어졌다** (2026-09-02 적대적 검증).
 *      답은 $r=\dfrac{C}{A}=\dfrac{2pa}{pt}=\dfrac{2a}{t}$ 인데 $|t|=1$ 인 씨앗에서는
 *      $|r|=2a=\dfrac{\text{상수항}}{p}$ 가 된다 — 곧 **발문에 적힌 두 계수를 한 번
 *      나누면 답이 나온다.** 실측 **57.1%**(부호까지 29.6%)였다. 「적힌 수 하나 집기」는
 *      막아 놓고 「적힌 수 **둘을 한 번 나눈** 값」은 아무도 안 보고 있었다.
 *      그래서 ㉠ 가드를 **몫까지** 넓혔다(`stemReachable`) — $|t|=1$ 이 통째로 빠지고
 *      $a^2\div p$ 꼴(예: $36\div9=4$)도 같이 빠진다. 풀이 얇아지므로 $a$ 와 상수항
 *      상한을 함께 넓혔다(아래 `quadAlivePool` 주석).
 *    · `52V` — **후보 목록이 아예 없다**(값이 하나로 굳는다). 중1 `94T`·2차 `42U` 와
 *      같은 자리다. ⚠️ 「축이 없다」와 「축이 초록이다」는 **다른 말**이므로 시험은 이
 *      갈래에 ㉠ 을 **«잴 축 없음»으로 따로 찍는다**. 대신 「답이 발문에 적힌 수 가운데
 *      하나인가」를 재고, 그것이 **구조적으로 $0$** 임을 생성기 불변식
 *      ($a\notin\{c_1,c_2,c_3\}$, $a\ne3$, $a\ne|S|$)이 보장하며 시험이 그것을 잠근다.
 *
 *      🔴 **그런데 «축이 없다»가 «답이 고르다»는 뜻은 아니었다** (2026-09-02 적대적
 *      검증). 후보 목록이 없으니 ㉠ 을 못 재는 것은 맞지만, 그 사이에 **답 자체가 한
 *      값으로 쏠려** 있었다 — 최빈 정답 $a=4$ 가 **51.2%** 이고 12벌 한 벌에 서로 다른
 *      정답이 **3~4종**뿐이었다. `cancelPool()` 이 $a$ 마다 낼 수 있는 계수 조합의 수가
 *      다른데(`4:16 5:6 6:5 7:2 8:1 9:1`) 풀에서 그냥 하나를 뽑았기 때문이다.
 *      51V 는 `wantDeadIsMin` 으로 **먼저 자리를 고르고** 거기 맞는 씨앗을 뽑는데
 *      52V 에는 그 자를 안 댔다. 이제 **답을 먼저 고르고**(`CANCEL_ANSWERS`) 그에 맞는
 *      계수를 뽑는다. 시험이 분포를 잠그고 판정기가 그것을 찍는다.
 *    · `53V`·`54V` — 답이 **살아남은 것 전부의 합**이라 목록의 어느 자리도 답이 아니다
 *      (중1 `32T`·`95T`, 2차 `41U`·`43U` 의 처방). 그 위에 `53V` 는 「살아남은 자리가
 *      **연속이 아닐 것**」을 불변식으로 요구한다.
 *
 *      ⚠️ **정직하게 적는다 — 「연속이 아니니 «뒤에서 몇 개»로도 못 찍는다」는 틀린
 *      말이었다**(2026-09-02 적대적 검증). 창끝 $k=\left\lfloor b^2/4a\right\rfloor$ 는
 *      **언제나 살아남는다**(실측 $18/18$, 넓혀도 반례 $0$) — 창끝의 판별식
 *      $b^2\bmod 4a$ 가 이 격자에서 늘 제곱수이기 때문이다. 「연속이 아니다」는 «몇 개가
 *      사는가»를 못 찍게 할 뿐 «맨 끝이 사는가»는 못 막는다. 게다가 사는 것이 둘뿐인
 *      씨앗이 $61\%$ 였고 그 씨앗에서는 **답의 절반 이상이 창끝 하나**였다.
 *      그래서 깨는 대신 **몫에 상한을 걸었다** — 창끝 하나로는 답의 절반도 못 얻는다
 *      (`rationalRootPool` 의 `2*window < sum`). 근거는 `54V` 와 같은 꼴이다:
 *      ⓐ 답이 «합»이고 ⓑ 나머지가 **띄엄띄엄** 놓이며 ⓒ 몇 개가 사는지는 창 안의 $k$ 를
 *      **하나씩 대 봐야** 안다. 시험이 「창끝이 산다」와 「그 몫이 절반 미만」을 **둘 다**
 *      못 박는다 — 구조적 사실은 숨기지 말고 적어 두고 잠근다.
 *
 *      ⚠️ **정직하게 적는다** — `54V` 는 창이 약수 목록의 **큰 쪽**을 자르므로 살아남는
 *      $k$ 가 늘 약수 목록의 **앞부분**이고, $k=1$ 은 어떤 $D$ 의 약수이기도 하므로
 *      **$n=1$ 이 언제나 살아남는다.** 이는 이 설계의 구조적 사실이지 ㉠ 을 넘긴 근거가
 *      **아니다.** 근거는 ⓐ 답이 «합»이고 ⓑ 창 안에서 살아남는 $n$ 이 $1,4,9,16,36$ 처럼
 *      **띄엄띄엄** 놓이며 ⓒ **몇 개가 사는지**는 약수를 다 만들어 봐야 안다는 것이다.
 *
 * ㉡ **「굳힘이 항등식」** — 굳힘을 지우고 같은 씨앗으로 돌려 답이 그대로면 그것은 굳힘이
 *    아니라 장식이다. 넷 다 굳힘을 **인자로 받는 순수 함수**로 뽑아 두었다:
 *    `solveQuadraticAlive(a, p, useQuadraticCheck)` ·
 *    `solveCancelCoef(cs, s, useCancel)` ·
 *    `solveRationalRoots(a, b, useSquareCheck)` ·
 *    `solveRootSumNatural(d, n, useSquareCheck, useDivisorCheck)`.
 *    시험이 그 인자를 흔들어 답이 실제로 달라지는지 잰다.
 *
 * ㉢ **갈래끼리 겹침** — 새 갈래가 그 소단원의 `심화하`·`응용` 과 한 시험지에 같이 실린다.
 *    「수+정답」 열쇠에는 **천장**이 있으므로 쌍마다 천장을 먼저 찍고, 천장이 낮으면
 *    «겹침 없음»이 아니라 **«판정 불가»** 로 읽어야 한다.
 *    ⚠️ `51V` 의 첫 초안 「…의 한 근이 $x=1$일 때 상수 $k$의 값을 구하시오」는 기본 `03`
 *    번과 낱말 $0.833$ 이었다. 묻는 것을 «해»로 바꾸고 「이차방정식이 되고」를 앞세워
 *    $0.167$ 로 내렸다 — **문구를 그대로 쓰면 안 된다.**
 *
 * ## ⑸ 번호 규약 — **`V` 접미사**
 *
 * `extensionNumberReason`(`src/__tests__/helpers/rpmCatalog.ts`)은 `숫자+영문 대문자 한
 * 글자` 를 「색인 번호와 절대 안 겹친다」로 통과시킨다. 이미 `A`(색인 밖)·`T`(1차)·
 * `U`(2차)가 쓰였으므로 **3차 물결은 `V`** 다.
 *
 * ⚠️ **`53V` 는 소단원 이름과 RPM 중단원 이름이 다르다.** 우리 소단원은
 * 「이차방정식의 근의 공식과 응용」(`units.ts` orderIndex 476)인데 RPM 중단원은
 * 「이차방정식의 활용」이다(`scripts/rpm/rpm-type-catalog.json`). 손으로 적으면 어긋난다.
 *
 * ## 계약 (이웃 모듈과 한 벌)
 *
 * 1. **정답을 먼저 뽑고 발문을 역산한다.**
 * 2. `facts.x` 가 **답의 첫 수**다.
 * 3. 숫자는 전부 `$...$` 안에 (`elementary/rules` `bareNumbers` 가드).
 * 4. `attempt`·`pick` 이 낼 것이 없으면 **던진다** — 조용히 기본값을 내지 않는다.
 * 5. 그림이 없으므로 발문이 **지면을 가리키지 않는다**(`figureSpec: null`).
 * 6. 🔴 **해설이 걸음을 건너뛰지 않는다** (D-116 ⑸, 원장님 완료 조건). 후보를 견주는
 *    갈래는 **후보를 하나씩 적고 각각 왜 살고 죽는지**까지 적는다.
 *
 * ## 왜 «설계»를 `plan…()` 으로 따로 내보내나 — 없는 축은 변이시킬 수 없다
 *
 * ㉠·㉡ 을 **밖에서 재려면** 「후보 집합」과 「굳힘이 남긴 것」이 문항 밖에 있어야 한다.
 * 발문·해설 문자열만 내보내면 그 축이 **아예 없어서** 변이시킬 수도 없다. 그래서 유형마다
 * 순수 설계 함수를 export 하고, 발문·해설은 그 설계를 **읽기만** 한다(규칙이 두 벌이 되지
 * 않는다). `Sift` 는 1차 물결의 것을 **그대로 쓴다** — 판정기
 * `scripts/qa/probe-middle-top-m3.ts` 의 `edgeScore`·`siftScore` 가 그 모양을 본다.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { eulReul, euroRo } from "./m2Josa";
import type { Sift } from "./m3Top";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중3";
const BOOK1 = "3-1";

/** 우리 `Unit.section` 정확한 이름 (`prisma/seed-data/units.ts` 471~476 실측). */
const SEC = {
  이차방정식풀이: "이차방정식의 풀이",
  다항식곱셈: "다항식의 곱셈",
  근의공식: "이차방정식의 근의 공식과 응용",
  근호계산: "근호를 포함한 식의 계산",
} as const;

/**
 * RPM 중단원 이름 — 이웃 모듈(`m3Quad`·`m3Poly`·`m3Root`)이 쓰는 글자 그대로.
 *
 * ⚠️ `근의공식` 의 소단원 이름은 「이차방정식의 근의 공식과 응용」인데 **중단원 이름은
 *    「이차방정식의 활용」**이다. 둘은 다른 정본에서 온다(`units.ts` / `rpm-type-catalog.json`).
 */
const MINOR = {
  이차방정식풀이: "이차방정식의 풀이",
  다항식곱셈: "다항식의 곱셈",
  이차방정식활용: "이차방정식의 활용",
  근호계산: "근호를 포함한 식의 계산",
} as const;

type Body = Pick<
  MidProblem,
  "content" | "answer" | "solution" | "facts" | "figureSpec"
>;

/** 후보를 하나씩 짚는 표지. 창이 최대 열하나라 열둘까지 둔다. */
const MARKS = [
  "㉠",
  "㉡",
  "㉢",
  "㉣",
  "㉤",
  "㉥",
  "㉦",
  "㉧",
  "㉨",
  "㉩",
  "㉪",
  "㉫",
] as const;

// ── 지면 소품 — 「값은 맞는데 글자가 나쁜」 부류를 **여기 한 곳**에서 막는다 ──────

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

/** 이어 붙이는 수 — `+5` · `-5`. */
function signedNum(n: number): string {
  return n < 0 ? `-${-n}` : `+${n}`;
}

/** 음수만 괄호로 — `$(-3)^{2}$` 는 필요하고 `$(3)^{2}$` 는 군더더기다(2차 물결 실측 6.3%). */
function paren(n: number): string {
  return n < 0 ? `(${n})` : `${n}`;
}

/** 계수를 앞에 붙일 때 — $1$ 은 안 쓰고 $-1$ 은 `-` 만 쓴다(`1a` 는 지면 냄새다). */
function coefTex(c: number): string {
  if (c === 1) return "";
  if (c === -1) return "-";
  return `${c}`;
}

/** 이어 붙이는 항 — `+3x` · `-x` · `+x`. 계수 $0$ 은 호출 쪽이 막는다. */
function signedTerm(c: number, v: string): string {
  if (c === 1) return `+${v}`;
  if (c === -1) return `-${v}`;
  return c > 0 ? `+${c}${v}` : `-${-c}${v}`;
}

/**
 * 보조사 — `$41$은` · `$5$는`.
 *
 * ⚠️ 받침 판정은 새로 쓰지 않고 `m2Josa` **한 곳**에서 온다. 규칙이 두 벌이 되면 한쪽만
 *    고쳐도 아무도 모른다(2026-08-18). 그리고 이 부류는 **값 검산이 구조적으로 못 본다** —
 *    산술은 맞고 글자만 틀리기 때문이다.
 */
function eunNeun(n: number): "은" | "는" {
  return eulReul(n) === "을" ? "은" : "는";
}

/** 정수 제곱근 — 제곱수가 아니면 `null`. 부동소수 반올림을 되짚어 **정수 곱으로** 확인한다. */
export function intSqrt(n: number): number | null {
  if (n < 0) return null;
  const r = Math.round(Math.sqrt(n));
  return r * r === n ? r : null;
}

/** 오름차순 약수 전부. */
export function divisors(n: number): number[] {
  const out: number[] = [];
  for (let d = 1; d * d <= n; d += 1) {
    if (n % d !== 0) continue;
    out.push(d);
    if (d !== n / d) out.push(n / d);
  }
  return out.sort((a, b) => a - b);
}

/**
 * 기약분수의 KaTeX 몸통 — 분모가 $1$ 이면 정수로 적는다.
 *
 * ⚠️ 2차 물결의 `fracTex` 는 **가분수면 던졌다.** 그 근거였던 「지면 전처리가 대분수로
 *    고쳐 쓴다」는 **2026-08-24 에 제품에서 빠졌다**(원장님 확정 「중등은 대분수 변환하지
 *    말 것」, `textPreprocess.ts` §대분수). 전제가 뒤집혔는데 가드만 남으면 멀쩡한 씨앗을
 *    버린다 — 그래서 여기서는 던지지 않고, **시험이 제품 전처리를 실제로 돌려** 가분수가
 *    그대로 남는지 확인한다(믿음이 아니라 측정).
 */
export function fracTex(n: number, d: number): string {
  if (d === 0) throw new Error("분모가 0입니다");
  const g = gcd(n, d) || 1;
  const p = n / g;
  const q = d / g;
  if (q === 1) return `${p}`;
  return `\\dfrac{${p}}{${q}}`;
}

// ════════════════════════════════════════════════════════════════════════════
// A. 51V  이차방정식이 되는지가 갈리는 방정식에서 나머지 해 구하기        (심화중)
//    3-1 «이차방정식의 풀이» → 우리 소단원 「이차방정식의 풀이」
// ════════════════════════════════════════════════════════════════════════════

/**
 * 🔴 **굳힘을 «인자로» 받는 순수 함수** — ㉡ 을 밖에서 재는 통로다.
 *
 * 방정식 $(k^2-a^2)x^2+p(k-a)x+2pa=0$ 에 $x=1$ 을 넣으면
 * $k^2+pk+a(p-a)=(k+a)\{k+(p-a)\}=0$ 이므로 후보는 $\{-a,\;a-p\}$ 다.
 *
 * `useQuadraticCheck` 가 곧 **굳힘**이다 — 「이 식이 이차방정식인가」, 곧 $x^2$ 의 계수
 * $k^2-a^2$ 이 $0$ 이 아닌가. $k=-a$ 는 그 계수를 $0$ 으로 만들어 죽는다.
 *
 * ⚠️ **죽는 후보도 $x=1$ 을 해로 갖는다.** $k=-a$ 이면 식이 $-2pa\,x+2pa=0$ 이 되어
 *    해가 $x=1$ 이다. 곧 「대입해서 맞는가」로는 **갈리지 않는다** — 가르는 것은 오직
 *    이 소단원 `01` 번의 «이차방정식의 뜻»이다. 이것이 이 문항의 함정 그 자체이고,
 *    시험이 그 사실을 값으로 확인한다.
 */
export function solveQuadraticAlive(
  a: number,
  p: number,
  useQuadraticCheck: boolean,
): number[] {
  const cands = [-a, a - p].sort((x, y) => x - y);
  if (!useQuadraticCheck) return cands;
  return cands.filter((k) => k * k - a * a !== 0);
}

/**
 * $k$ 를 넣은 뒤 $x=1$ 이 아닌 **나머지 해** — 이차방정식이 아니면 `null`.
 *
 * 근을 새로 풀지 않는다: 두 근의 곱이 $\dfrac{C}{A}$ 이고 한 근이 $1$ 이므로 나머지가
 * 곧 $\dfrac{C}{A}$ 다.
 */
export function otherRootAtOne(a: number, p: number, k: number): number | null {
  const lead = k * k - a * a;
  if (lead === 0) return null;
  return (2 * p * a) / lead;
}

/**
 * 🔴 **㉠ — 발문에서 «한 걸음»으로 닿는 수 전부** (부호 양쪽).
 *
 * 처음 판은 「발문에 **적힌** 수」만 막았다. 그런데 이 문항의 답은
 * $r=\dfrac{2pa}{pt}$ 라, $|t|=1$ 이면 $|r|$ 이 **상수항 $\div p$** 와 딱 같아진다 —
 * 지면의 `$…+7(k-3)x+42=0$` 에서 $42\div7=6$ 이 그대로 답이었다(실측 57.1%).
 * 「집어 찍기」를 막는 가드가 「한 번 나눠 찍기」를 못 본 것이다.
 *
 * ⚠️ **나눗셈의 피제수·제수는 «계수 넷»으로 한정한다.** 지수 $2$ 와 해 $x=1$ 은
 *    «적힌 수»로는 세지만(위 집합) **나눗셈의 상대로는 안 센다** — $a\div2$ 같은 것까지
 *    막으면 풀이 아홉으로 줄어 12벌을 못 채운다. 그 대신 그 둘은 여전히 «적힌 수» 라
 *    답이 $\pm1$·$\pm2$ 인 씨앗은 그대로 막힌다.
 */
export function stemReachable(
  a: number,
  p: number,
  konst: number,
): Set<number> {
  const out = new Set<number>();
  const add = (v: number): void => {
    out.add(v);
    out.add(-v);
  };
  // ⑴ 지면에 글자로 적히는 수 — 지수 $2$ · 해 $x=1$ · 계수 넷 · $0$.
  //
  // ⚠️ **부호를 뺀 값만 세면 샌다.** 지면의 `$6(k-4)x$` 는 수를 읽는 자
  //    (`/-?\d+/`)에게 **`-4`** 로 보인다. 답이 $-4$ 인 씨앗이 그렇게 빠져나가
  //    「발문에서 하나 집기」가 열려 있었다 — 시험이 그것을 잡았다.
  for (const v of [0, 1, 2, a, a * a, p, konst]) add(v);
  // ⑵ 그 **계수 둘을 한 번 나눈** 값 — 나누어떨어지는 것만.
  const coefs = [a, a * a, p, konst];
  for (const x of coefs) {
    for (const y of coefs) {
      if (y === 0 || x % y !== 0) continue;
      add(x / y);
    }
  }
  return out;
}

export type QuadAliveSeed = {
  a: number;
  p: number;
  /** 죽는 후보($-a$)가 후보 목록의 **최솟값**인가 — 씨앗마다 갈려야 한다(㉠) */
  deadIsMin: boolean;
};

export type QuadAlivePlan = {
  a: number;
  p: number;
  /** 상수항 $2pa$ */
  konst: number;
  deadK: number;
  aliveK: number;
  deadIsMin: boolean;
  /** 살아난 이차방정식 $Ax^2+Bx+C=0$ */
  lead: number;
  linCoef: number;
  constCoef: number;
  /** 양변을 $A$ 로 나눈 뒤의 일차항 계수 — $-(1+r)$ */
  monicLin: number;
  sift: Sift;
  /** 나머지 해 = 답 */
  answer: number;
};

/**
 * 쓸 수 있는 $(a,p)$ 를 **프로그램으로 뽑는다** — 손 목록은 세는 쪽과 고치는 쪽을 같이
 * 눈멀게 한다(2026-08-18). 조건마다 까닭이 있다.
 *
 * ```
 * t = p-2a ≠ 0            t=0 이면 두 후보가 겹치고 산 쪽의 x^2 계수도 0 이 된다
 * t | 2a                  나머지 해 r = 2a/t 가 정수라야 한다
 *                         (이때 t | p 도 저절로 성립한다 — p = t+2a)
 * r ∉ {0, 1, -1}          r=1 이면 중근이라 «나머지 해»가 없고, r=-1 은 p=0 이라야 한다
 * p ≠ a                   살아난 k = a-p 가 0 이면 발문이 흉하다
 * |A| = |pt| ≥ 2          「양변을 A 로 나누면」이 걸음 하나가 되게
 * 답이 발문에서 «한 걸음»에 안 닿는다  ㉠ — 적힌 수 집기 **와** 「계수 둘을 한 번 나누기」
 *                         (`stemReachable`) 를 **둘 다** 막는다. 뒤엣것을 안 막으면
 *                         $|t|=1$ 인 씨앗에서 상수항 ÷ p 가 곧 답이다 (실측 57.1%)
 * ```
 *
 * ⚠️ **상한을 왜 넓혔나** — 몫까지 막으면 $|t|=1$ 이 통째로 빠져 옛 상한($a\le10$ ·
 *    상수항 $\le400$)에서는 풀이 **열하나**가 된다. 시험의 바닥이 「서로 다른 해설 열셋」
 *    (=12벌 적재를 채운다)이므로 그대로 두면 12벌을 못 만든다. 그래서 $a\le12$ ·
 *    상수항 $\le550$ 으로 넓혀 **열여섯**으로 되돌렸다. 상수항은 $2a(t+2a)$ 라
 *    $4a^2$ 항이 지배하므로 $a$ 만 넓히는 것으로는 안 늘어난다 — 둘을 같이 넓혀야 한다.
 *
 * ⚠️ 이 조건들에서 **$p>a$ 가 저절로 따라온다.** $p<a$ 이면 $t=p-2a<-a$ 인데 $t\mid 2a$ 라
 *    $|t|=2a$, 곧 $p=0$ 이어야 한다(제외). 그래서 두 후보가 **둘 다 음수**이고 인수분해가
 *    늘 $(k+\alpha)(k+\beta)$ 꼴이 된다 — 해설이 이것을 그대로 읽는다.
 */
export function quadAlivePool(): QuadAliveSeed[] {
  const out: QuadAliveSeed[] = [];
  for (let a = 2; a <= 12; a += 1) {
    for (let p = 2; p <= 80; p += 1) {
      const t = p - 2 * a;
      if (t === 0) continue;
      if ((2 * a) % t !== 0) continue;
      const r = (2 * a) / t;
      if (r === 0 || r === 1 || r === -1) continue;
      if (p === a) continue;
      const konst = 2 * p * a;
      if (konst > 550) continue;
      if (Math.abs(r) > 50) continue;
      if (Math.abs(p * t) < 2) continue;
      // ㉠ — 답이 발문에서 **한 걸음**에 닿으면 안 된다(적힌 수 · 계수 둘의 몫).
      if (stemReachable(a, p, konst).has(r)) continue;
      out.push({ a, p, deadIsMin: -a < a - p });
    }
  }
  return out;
}

const QUAD_ALIVE_POOL = quadAlivePool();

/** 그 씨앗이 낼 답의 크기 $\left|\dfrac{2a}{p-2a}\right|$ — 규칙을 옮겨 적지 않는다. */
function quadAnswerAbs(s: QuadAliveSeed): number {
  return Math.abs(otherRootAtOne(s.a, s.p, s.a - s.p)!);
}

/**
 * **51V «심화중»** — 「이차방정식이 되고 그 해 중 하나가 $x=1$일 때 나머지 해」.
 *
 * 🔴 자연 분포로 뽑으면 «작은 쪽이 죽는» 자리가 $16$ 대 $8$ 로 쏠린다(`quadAlivePool()`
 * 실측). 그러면 학생이 「늘 작은 쪽을 버린다」로 찍을 수 있다 — 초6 이 병합을 두 번
 * 막힌 그 자리다. 그래서 **죽는 자리를 먼저 고르고**(`wantDeadIsMin`) 그에 맞는 씨앗만
 * 뽑는다.
 *
 * ⚠️ 이것은 «지표에 맞춰 데이터를 고른 것»이 아니다 — 두 자리 다 이 설계가 원래 낼 수
 *    있는 문항이고, 한쪽으로 치우쳐 뽑고 있던 것을 고르게 바꿨을 뿐이다.
 */
export function planQuadraticAlive(rng: Rng): QuadAlivePlan {
  const wantDeadIsMin = intBetween(rng, 0, 1) === 0;
  const sub = QUAD_ALIVE_POOL.filter((s) => s.deadIsMin === wantDeadIsMin);
  if (sub.length === 0) {
    throw new Error("m3Top3 51V: 죽는 자리에 맞는 씨앗이 없습니다");
  }
  // 🔴 **답의 크기도 고르게 뽑는다** — ㉠ 몫 가드를 넣으며 풀이 $26\to16$ 으로 줄었고,
  //    그대로 두면 한 무리 안에서 $|r|$ 별 씨앗 수가 달라(예: $-3$ 이 셋, $-8$ 이 하나)
  //    12벌 한 벌의 서로 다른 정답이 $10.7\to7.9$ 로 내려간다(실측). 52V 와 같은 처방이다.
  //    ⚠️ `wantDeadIsMin` 을 **먼저** 뽑는 순서를 지킨다 — `deadIsMin` 은 $t<0$ 과 같은
  //       말이라 답의 **부호**를 정하고, 그 균형이 ㉠ 의 「극단 집기」를 잡아 준다.
  const mags = [...new Set(sub.map(quadAnswerAbs))].sort((x, y) => x - y);
  const wantMag = pick(rng, mags);
  const sub2 = sub.filter((s) => quadAnswerAbs(s) === wantMag);
  const { a, p, deadIsMin } = pick(rng, sub2);
  const cands = solveQuadraticAlive(a, p, false);
  const kept = solveQuadraticAlive(a, p, true);
  if (kept.length !== 1) {
    throw new Error(`m3Top3 51V: 굳힘이 후보를 하나로 못 줄였습니다 (a=${a})`);
  }
  const aliveK = kept[0]!;
  const deadK = cands.find((k) => k !== aliveK)!;
  const answer = otherRootAtOne(a, p, aliveK);
  if (answer === null) {
    throw new Error("m3Top3 51V: 살아난 쪽이 이차방정식이 아닙니다");
  }
  const lead = aliveK * aliveK - a * a;
  return {
    a,
    p,
    konst: 2 * p * a,
    deadK,
    aliveK,
    deadIsMin,
    lead,
    linCoef: p * (aliveK - a),
    constCoef: 2 * p * a,
    monicLin: -(1 + answer),
    sift: { candidates: cands, kept },
    answer,
  };
}

function renderQuadraticAlive(rng: Rng): Body {
  const plan = planQuadraticAlive(rng);
  const { a, p, konst, deadK, aliveK, lead, linCoef, constCoef, monicLin } =
    plan;
  const a2 = a * a;
  const r = plan.answer;
  const stemEq = `(k^{2}-${a2})x^{2}+${p}(k-${a})x+${konst}=0`;

  const content =
    `상수 $k$에 대하여 $x$에 대한 방정식 $${stemEq}$이 이차방정식이 되고, ` +
    `그 해 중 하나가 $x=1$이다. 이때 나머지 해를 구하시오.`;

  // 후보를 **작은 것부터** 짚는다 — 죽는 자리가 ㉠ 인 씨앗과 ㉡ 인 씨앗이 반반이라
  // 「늘 앞에 있는 것을 버린다」로 못 찍는다.
  const ordered = [...plan.sift.candidates];
  const lines: string[] = [
    `$x=1$이 주어진 방정식의 해이므로 $x=1$을 대입하면 ` +
      `$(k^{2}-${a2})+${p}(k-${a})+${konst}=0$이다.`,
    `좌변을 $k$에 대하여 정리하면 $k^{2}+${p}k+${a * (p - a)}=0$이다.`,
    `좌변을 인수분해하면 $(k+${-ordered[0]!})(k+${-ordered[1]!})=0$이므로 ` +
      `$k=${ordered[0]}$ 또는 $k=${ordered[1]}$이다.`,
  ];
  ordered.forEach((k, i) => {
    const mark = MARKS[i]!;
    if (k === deadK) {
      lines.push(
        `${mark} $k=${k}$일 때 $x^{2}$의 계수는 $${paren(k)}^{2}-${a2}=0$이므로 ` +
          `주어진 방정식은 $-${konst}x+${konst}=0$이 되어 일차방정식이다.`,
      );
      lines.push(
        `이 일차방정식의 해도 $x=1$이지만 주어진 방정식은 이차방정식이어야 하므로 ` +
          `$k=${k}$${eunNeun(k)} 조건에 맞지 않는다.`,
      );
    } else {
      lines.push(
        `${mark} $k=${k}$일 때 $x^{2}$의 계수는 $${paren(k)}^{2}-${a2}=${lead}$이고 ` +
          `$${lead}\\ne 0$이므로 주어진 방정식은 이차방정식이다.`,
      );
    }
  });
  lines.push(
    `따라서 $k=${aliveK}$이고, 주어진 방정식은 ` +
      `$${lead}x^{2}${signedTerm(linCoef, "x")}${signedNum(constCoef)}=0$이다.`,
  );
  lines.push(
    `양변을 $${lead}$${euroRo(lead)} 나누면 ` +
      `$x^{2}${signedTerm(monicLin, "x")}${signedNum(r)}=0$이고, ` +
      `좌변을 인수분해하면 $(x-1)(x${signedNum(-r)})=0$이다.`,
  );
  lines.push(
    `그러므로 $x=1$ 또는 $x=${r}$이고, 구하는 나머지 해는 $x=${r}$이다.`,
  );

  return {
    content,
    answer: `$x=${r}$`,
    solution: lines.join("\n"),
    facts: { a, p, konst, deadK, aliveK, lead, x: r },
    figureSpec: null,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// B. 52V  곱셈 공식으로 이차항이 지워지는 식에서 계수 구하기              (심화중)
//    3-1 «다항식의 곱셈» → 우리 소단원 「다항식의 곱셈」
// ════════════════════════════════════════════════════════════════════════════

/**
 * 세 곱의 합에서 $mx^2$ 을 뺀 값 — **규칙을 안 쓰고 그냥 계산한다.**
 * 해설이 쓰는 곱셈 공식을 여기서 옮겨 적지 않으려고 곱을 그대로 편다.
 */
export function cancelExprValue(
  cs: readonly number[],
  a: number,
  x: number,
  subtractSquares: boolean,
): number {
  let v = 0;
  for (const c of cs) v += (x + c * a) * (x - c * a);
  return subtractSquares ? v - cs.length * x * x : v;
}

/**
 * 🔴 **굳힘을 «인자로» 받는 순수 함수** — ㉡ 을 밖에서 재는 통로다.
 *
 * `useCancel` 이 곧 **굳힘**이다 — 발문이 빼 둔 $3x^2$ 이 세 곱에서 나온 $x^2$ 셋과
 * 소거되어 식이 **상수**가 된다. 빼지 않으면 식이 $3x^2-(\Sigma)a^2$ 이라 $x$ 에 따라
 * 값이 달라지고, 「$x$ 의 값에 관계없이 $S$」를 만족하는 자연수 $a$ 가 **하나도 없다.**
 *
 * 「관계없이」를 값으로 판정한다 — 여러 $x$ 를 넣어 전부 $s$ 인 $a$ 만 남긴다.
 */
export function solveCancelCoef(
  cs: readonly number[],
  s: number,
  useCancel: boolean,
): number[] {
  const probes = [-7, -2, 0, 1, 3, 11];
  const out: number[] = [];
  for (let a = 1; a <= 200; a += 1) {
    if (probes.every((x) => cancelExprValue(cs, a, x, useCancel) === s)) {
      out.push(a);
    }
  }
  return out;
}

export type CancelSeed = { cs: [number, number, number]; a: number; s: number };

export type CancelPlan = {
  cs: [number, number, number];
  a: number;
  /** $\Sigma=c_1^2+c_2^2+c_3^2$ */
  sigma: number;
  /** 발문이 주는 일정값 $-(\Sigma)a^2$ */
  s: number;
  answer: number;
};

/**
 * 쓸 수 있는 $(c_1,c_2,c_3,a)$ 를 프로그램으로 뽑는다.
 *
 * ```
 * c1<c2<c3           같은 계수가 둘이면 「세 곱」이 아니라 되풀이다
 * a ∉ {c1,c2,c3}     ㉠ — 답이 발문의 계수 가운데 하나면 「집어 찍기」가 열린다
 * a ≠ 3              발문의 $3x^{2}$ 에 적힌 수다
 * a ≥ 4              발문의 지수 $2$ 와도 겹치지 않게 (수 열쇠는 지수도 «적힌 수»로 센다)
 * |S| ≤ 1200         수를 키우는 것은 난이도가 아니다 (D-115 ⑽③)
 * ```
 */
export function cancelPool(): CancelSeed[] {
  const out: CancelSeed[] = [];
  for (let c1 = 1; c1 <= 4; c1 += 1) {
    for (let c2 = c1 + 1; c2 <= 7; c2 += 1) {
      for (let c3 = c2 + 1; c3 <= 9; c3 += 1) {
        const sigma = c1 * c1 + c2 * c2 + c3 * c3;
        for (let a = 4; a <= 12; a += 1) {
          const s = -sigma * a * a;
          if (Math.abs(s) > 1200) continue;
          // ㉠ — 답이 발문에 적힌 수 가운데 하나면 「집어 찍기」가 열린다.
          //
          // ⚠️ 처음엔 「$a\notin\{c_1,c_2,c_3\}$」를 **한 줄 더** 두었는데, 아래 한 줄이
          //    그것을 이미 삼킨다. 변이 하네스가 그 줄을 지워도 산출물이 그대로여서
          //    「죽은 규칙」으로 드러났다 — 규칙이 두 벌이면 한쪽만 고쳐도 아무도 모른다.
          //    그래서 **여기 한 줄**만 남기고, 발문에 적히는 수를 빠짐없이 적는다:
          //    계수 셋 · 곱의 개수($3x^{2}$ 의 $3$) · 지수 $2$ · 일정값 $S$ · $0$.
          if (new Set([0, 2, 3, c1, c2, c3, s, -s]).has(a)) continue;
          out.push({ cs: [c1, c2, c3], a, s });
        }
      }
    }
  }
  return out;
}

const CANCEL_POOL = cancelPool();

/**
 * 🔴 **풀에 있는 답 전부**(오름차순) — 답을 «고르게» 뽑기 위한 축이다.
 *
 * `cancelPool()` 은 $a$ 마다 쓸 수 있는 계수 조합의 수가 다르다(실측 `4:16 5:6 6:5
 * 7:2 8:1 9:1`). 풀에서 그냥 하나를 뽑으면 **$a=4$ 가 혼자 절반**이다.
 */
export const CANCEL_ANSWERS: number[] = [
  ...new Set(CANCEL_POOL.map((s) => s.a)),
].sort((x, y) => x - y);

/**
 * **52V «심화중»** — 「$x$의 값에 관계없이 일정한 식에서 계수 구하기」.
 *
 * 안 굳는 마디는 **$x$** 다. 발문이 「관계없이」라고만 하므로 $x$ 는 어떤 수여도 되고,
 * 각 괄호의 곱 $(x+ca)(x-ca)$ 도 하나로 안 굳는다. 그런데 곱셈 공식으로 셋을 펴면
 * $x^2$ 이 셋 나오고 발문이 빼 둔 $3x^2$ 과 **소거되어** 식이 $-(\Sigma)a^2$ 이 된다 —
 * $x$ 를 **하나도 구하지 않고** 답이 굳는다(D-115 ⑾ 의 «중»).
 *
 * ⚠️ **정직하게 적는다 — 굳힘은 $x=0$ 한 줄 대입으로 우회된다**(실측 1,200표본 100%).
 *    발문이 「$x$의 값에 **관계없이** 항상 $S$」라고 **먼저 말해 주므로** $x=0$ 대입이
 *    정당하고, 그 순간 $-3x^2$ 이 사라져 $-\Sigma c^2a^2=S$ 가 바로 나온다 — 학생이
 *    위에 적은 «소거»를 한 번도 안 만난다. 설계로는 못 막는다(「관계없이」를 빼면
 *    문항이 성립하지 않는다). `54V` 가 「$n=1$ 은 언제나 산다」를 적어 둔 것과 같은
 *    자리이므로 숨기지 않고 여기 적는다 — 2026-09-02 적대적 검증.
 *
 * 🔴 **답을 먼저 고르고 그에 맞는 계수를 뽑는다** (2026-09-02 적대적 검증).
 * 풀에서 그냥 하나를 뽑으면 $a$ 별 씨앗 수가 `4:16 5:6 6:5 7:2 8:1 9:1` 이라
 * **$a=4$ 가 51.2%** 였고, 12벌 한 벌에 서로 다른 정답이 **3~4종**뿐이었다 —
 * 한 시험지에 같은 답이 되풀이된다. 51V 가 `wantDeadIsMin` 으로 죽는 자리를 먼저
 * 고르는 것과 **같은 처방**인데 여기에는 그 자를 안 대고 있었다.
 *
 * ⚠️ 이것은 «지표에 맞춰 데이터를 고른 것»이 아니다 — 여섯 값 다 이 설계가 원래 낼 수
 *    있는 답이고, 한쪽으로 치우쳐 뽑고 있던 것을 고르게 바꿨을 뿐이다(51V 와 같은 말).
 */
export function planCancel(rng: Rng): CancelPlan {
  const wantA = pick(rng, CANCEL_ANSWERS);
  const sub = CANCEL_POOL.filter((x) => x.a === wantA);
  if (sub.length === 0) {
    throw new Error(`m3Top3 52V: 답 ${wantA} 에 맞는 씨앗이 없습니다`);
  }
  const { cs, a, s } = pick(rng, sub);
  const kept = solveCancelCoef(cs, s, true);
  if (kept.length !== 1 || kept[0] !== a) {
    throw new Error(`m3Top3 52V: 자연수 $a$ 가 하나로 안 굳습니다 (${kept})`);
  }
  return {
    cs,
    a,
    sigma: cs[0] * cs[0] + cs[1] * cs[1] + cs[2] * cs[2],
    s,
    answer: a,
  };
}

function renderCancel(rng: Rng): Body {
  const plan = planCancel(rng);
  const { cs, a, sigma, s } = plan;
  const m = cs.length;
  const factor = (c: number): string => `(x+${coefTex(c)}a)(x-${coefTex(c)}a)`;
  const expanded = (c: number): string => `x^{2}-${coefTex(c * c)}a^{2}`;

  const content =
    `$x$의 값에 관계없이 $${cs.map(factor).join("+")}-${m}x^{2}$의 값이 ` +
    `항상 $${s}$일 때, 자연수 $a$의 값을 구하시오.`;

  const lines = [
    // ㉱ 발문이 $a$ 를 미지수로 쓰므로 공식은 **대문자**로 적는다(2차 물결이 $a$ 를 두
    //    뜻으로 써서 400/400 이 샌 자리).
    `곱셈 공식 $(A+B)(A-B)=A^{2}-B^{2}$을 이용하여 세 곱을 각각 전개한다.`,
    `${cs.map((c) => `$${factor(c)}=${expanded(c)}$`).join(", ")}이다.`,
    `세 식을 변끼리 더하면 ` +
      `$${cs.map((c) => `(${expanded(c)})`).join("+")}=${m}x^{2}-${sigma}a^{2}$이다.`,
    `여기에서 $${m}x^{2}$을 빼면 ` +
      `$${m}x^{2}-${sigma}a^{2}-${m}x^{2}=-${sigma}a^{2}$이므로 ` +
      `주어진 식의 값은 $-${sigma}a^{2}$이다.`,
    `곧 $x^{2}$의 항이 서로 지워지므로 주어진 식의 값은 $x$의 값에 관계없이 일정하다.`,
    `그 값이 $${s}$이므로 $-${sigma}a^{2}=${s}$에서 $a^{2}=${a * a}$이다.`,
    `$a^{2}=${a * a}$에서 $a=${a}$ 또는 $a=-${a}$인데, ` +
      `$a$는 자연수이므로 $a=${a}$이다.`,
  ];

  return {
    content,
    answer: `$${a}$`,
    solution: lines.join("\n"),
    facts: {
      c1: cs[0],
      c2: cs[1],
      c3: cs[2],
      sigma,
      s,
      x: a,
    },
    figureSpec: null,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// C. 53V  두 근이 모두 유리수가 되도록 하는 상수를 모두 구하기            (심화상)
//    3-1 «이차방정식의 활용» → 우리 소단원 「이차방정식의 근의 공식과 응용」
// ════════════════════════════════════════════════════════════════════════════

/**
 * 🔴 **굳힘을 «인자로» 받는 순수 함수** — ㉡ 을 밖에서 재는 통로다.
 *
 * $ax^2-bx+k=0$ 의 두 근은 $\dfrac{b\pm\sqrt{b^2-4ak}}{2a}$ 다. 근이 있으려면
 * $b^2-4ak\ge0$ 이어야 하므로 자연수 $k$ 는 $1$ 부터 $\left\lfloor\dfrac{b^2}{4a}
 * \right\rfloor$ 까지 — 그것이 **창**이고, 창은 굳힘이 아니라 발문이 주는 것이다.
 *
 * `useSquareCheck` 가 곧 **굳힘**이다 — 그 창 안에서 근호 안이 **제곱수**인 $k$ 만
 * 남긴다. 끄면 창 전체가 남아 합이 달라진다.
 *
 * ⚠️ 제곱수 판정을 「공식으로 역산」하지 않고 **정수 제곱근을 실제로 계산**한다.
 */
export function solveRationalRoots(
  a: number,
  b: number,
  useSquareCheck: boolean,
): number[] {
  const out: number[] = [];
  const window = Math.floor((b * b) / (4 * a));
  for (let k = 1; k <= window; k += 1) {
    if (useSquareCheck && intSqrt(b * b - 4 * a * k) === null) continue;
    out.push(k);
  }
  return out;
}

export type RationalRootSeed = { a: number; b: number };

export type RationalRow = {
  k: number;
  /** 판별식 $b^2-4ak$ */
  disc: number;
  /** 제곱수이면 그 제곱근, 아니면 `null` */
  root: number | null;
};

export type RationalRootPlan = {
  a: number;
  b: number;
  /** 창의 끝 — 자연수 $k$ 는 $1$ 부터 여기까지 */
  window: number;
  rows: RationalRow[];
  kept: number[];
  sift: Sift;
  answer: number;
};

/**
 * 쓸 수 있는 $(a,b)$ 를 프로그램으로 뽑는다.
 *
 * ```
 * b^2 가 4a 로 안 나누어짐   판별식 0 이 창 안에 못 들어온다 — 곧 중근이 안 생겨
 *                          「두 근」이라는 발문이 늘 참이다 (불변식)
 * 창 4..12                 해설이 지면에서 안 넘치게 (표지도 열둘까지만 있다)
 * 사는 것 2..5, 창 전체 아님   굳힘이 실제로 일하고, 답도 한 자리가 아니게
 * 사는 자리가 연속이 아님      연속이면 「앞/뒤에서 몇 개」로 찍힌다 (㉠)
 * 창끝의 몫 < 절반           창끝은 **늘 산다**(아래 ⚠️). 그 하나가 답의 절반을 넘으면
 *                          판별식을 한 번도 안 세고 답의 절반이 나온다 (㉠)
 * 답이 발문에 적힌 수가 아님    ㉠ — 「지면에서 하나 집기」를 막는다
 * ```
 *
 * ⚠️ **정직하게 적는다 — 창끝 $k=\left\lfloor b^2/4a\right\rfloor$ 는 언제나 살아남는다.**
 *    창끝의 판별식은 $b^2 \bmod 4a$ 인데, 다른 조건들을 통과하는 격자점에서는 그 값이
 *    **늘 제곱수**다(예: $b$ 가 홀수이면 $a\in\{2,3,4,6\}$ 에서 $b^2\bmod 4a\in\{1,9\}$ 로
 *    정리된다). $b$ 의 홀짝을 풀고 $a\le16$·$b\le60$ 까지 넓혀 훑어도 **창끝이 죽는 짝은
 *    하나도 없다** — 이것은 이 설계의 **구조적 사실**이지 ㉠ 을 넘긴 근거가 아니다.
 *    (머리말 §⑷㉠ 이 「연속이 아니라 «뒤에서 몇 개»로도 못 찍는다」고 단언하던 것은
 *     **틀린 말**이었다. «뒤에서 하나»는 늘 맞는다 — 2026-09-02 적대적 검증.)
 *
 *    그래서 «못 깨는 것»을 숨기지 않고 **몫에 상한을 건다**: 창끝 하나로는 답의 절반도
 *    못 얻는다($2\cdot\text{창} < \text{합}$). 이 조건은 「사는 것이 셋 이상」을 저절로
 *    머금는다 — 사는 것이 둘이면 하나가 창끝이라 합이 창의 두 배 미만이기 때문이다.
 *    실측: 창끝의 몫 평균 $58.3\%$·최대 $83.3\%$ → 평균 $40.5\%$·최대 $46.2\%$.
 *
 * ⚠️ **불변식을 «$b$ 는 홀수»에서 «$b^2$ 가 $4a$ 로 안 나누어짐»으로 바꿨다.** 지키려던
 *    것은 처음부터 «창 안에 중근이 없다»였고, 판별식 $b^2-4ak$ 가 $0$ 이 되는 자연수 $k$ 는
 *    $b^2/(4a)$ **하나뿐**이므로 그것이 정수가 아니면 된다. 「$b$ 가 홀수」는 그 조건의
 *    **좁은 대용품**이었고, 그 대용품 때문에 위 몫 상한을 걸면 풀이 일곱으로 줄었다.
 *    바꾼 뒤 풀은 $18 \to 22$ 로 늘었다. 시험이 «창 안 어느 $k$ 에서도 판별식이 $0$ 이
 *    아니다»를 **값으로** 확인한다(대용품이 아니라 원래 지키려던 것을 잰다).
 */
export function rationalRootPool(): RationalRootSeed[] {
  const out: RationalRootSeed[] = [];
  for (let a = 2; a <= 16; a += 1) {
    for (let b = 5; b <= 60; b += 1) {
      if ((b * b) % (4 * a) === 0) continue;
      const window = Math.floor((b * b) / (4 * a));
      if (window < 4 || window > 12) continue;
      const kept = solveRationalRoots(a, b, true);
      if (kept.length < 2 || kept.length > 5) continue;
      if (kept.length >= window) continue;
      const contiguous = kept.every(
        (v, i) => i === 0 || v === kept[i - 1]! + 1,
      );
      if (contiguous) continue;
      const sum = kept.reduce((t, v) => t + v, 0);
      // ㉠ — 창끝은 늘 산다. 그 하나가 답의 절반을 못 넘게 한다.
      if (2 * window >= sum) continue;
      if (new Set([0, 2, a, b]).has(sum)) continue;
      out.push({ a, b });
    }
  }
  return out;
}

const RATIONAL_ROOT_POOL = rationalRootPool();

/** 그 씨앗이 낼 답(살아남은 $k$ 의 합) — 규칙을 옮겨 적지 않고 굳힘 함수를 그대로 부른다. */
function rationalRootAnswer(s: RationalRootSeed): number {
  return solveRationalRoots(s.a, s.b, true).reduce((t, v) => t + v, 0);
}

/** 풀이 낼 수 있는 답 전부(오름차순) — 답을 «고르게» 뽑기 위한 축이다. */
const RATIONAL_ROOT_ANSWERS: number[] = [
  ...new Set(RATIONAL_ROOT_POOL.map(rationalRootAnswer)),
].sort((x, y) => x - y);

/**
 * **53V «심화상»** — 「두 근이 모두 유리수가 되도록 하는 자연수 $k$ 를 모두 구하고 그 합」.
 *
 * 굳지 **않는다.** 「유리수인가」는 $b^2-4ak$ 가 제곱수인가에 달렸고, 그 판정은 $k$ 마다
 * 다르다. 부등식으로 창을 좁혀도 그 안에서 살아남는 $k$ 는 **듬성듬성** 흩어져 있어
 * 하나씩 대 봐야 갈린다 — D-115 ⑾ 의 «상».
 */
export function planRationalRoots(rng: Rng): RationalRootPlan {
  // 🔴 **답을 먼저 고르고 그에 맞는 $(a,b)$ 를 뽑는다** — 51V·52V 와 같은 처방.
  //    창끝 몫 상한을 넣으며 풀의 답 분포가 고르지 않게 됐다(합 $18$·$22$·$26$ 이 각각
  //    넷, $14$·$45$ 가 하나). 그대로 두면 한 시험지에 같은 답이 더 자주 겹친다.
  const wantSum = pick(rng, RATIONAL_ROOT_ANSWERS);
  const sub = RATIONAL_ROOT_POOL.filter(
    (s) => rationalRootAnswer(s) === wantSum,
  );
  if (sub.length === 0) {
    throw new Error(`m3Top3 53V: 답 ${wantSum} 에 맞는 씨앗이 없습니다`);
  }
  const { a, b } = pick(rng, sub);
  const window = Math.floor((b * b) / (4 * a));
  const cands = solveRationalRoots(a, b, false);
  const kept = solveRationalRoots(a, b, true);
  const rows: RationalRow[] = cands.map((k) => {
    const disc = b * b - 4 * a * k;
    return { k, disc, root: intSqrt(disc) };
  });
  return {
    a,
    b,
    window,
    rows,
    kept,
    sift: { candidates: cands, kept },
    answer: kept.reduce((t, v) => t + v, 0),
  };
}

function renderRationalRoots(rng: Rng): Body {
  const plan = planRationalRoots(rng);
  const { a, b, window, rows, kept, answer } = plan;
  const b2 = b * b;
  const fourA = 4 * a;
  const twoA = 2 * a;

  const content =
    `이차방정식 $${a}x^{2}-${b}x+k=0$의 두 근이 모두 유리수가 되도록 하는 ` +
    `자연수 $k$의 값을 모두 구하고, 그 합을 구하시오.`;

  const squares = rows.filter((r) => r.root !== null);
  const others = rows.filter((r) => r.root === null);
  const lines: string[] = [
    `근의 공식에 의하여 주어진 이차방정식의 두 근은 ` +
      `$x=\\dfrac{${b}\\pm\\sqrt{${b2}-${fourA}k}}{${twoA}}$이다.`,
    // 🔴 **계수를 부호째 적고, 근거를 «정수»에 건다** (2026-09-02 적대적 검증).
    //    첫 판은 `$${a}$, $${b}$, $k$가 모두 **유리수**이므로` 였다. 둘 다 틀렸다 —
    //    일차항 계수는 $-b$ 이고, 「근호 안이 제곱수」라는 판정은 근호 안이 **정수**일
    //    때만 성립한다(유리수 계수만으로는 근호 안이 정수가 아닐 수 있다).
    //    값·정답은 옳아서 값 검산·KaTeX·조사 자가 구조적으로 못 보던 자리다.
    `$${a}$, $${-b}$, $k$가 모두 정수이므로 두 근이 모두 유리수이려면 ` +
      `근호 안의 수 $${b2}-${fourA}k$가 제곱수이어야 한다.`,
    `또 두 근이 있으려면 $${b2}-${fourA}k\\ge 0$이어야 하므로 ` +
      `$${fourA}k\\le ${b2}$에서 자연수 $k$는 $1$부터 $${window}$까지이다.`,
    `$k$가 $1$부터 $${window}$까지일 때 $${b2}-${fourA}k$의 값은 차례로 ` +
      `$${rows.map((r) => r.disc).join("$, $")}$이다.`,
    `이 가운데 제곱수인 것은 ` +
      `$${squares.map((r) => `${r.disc}=${r.root}^{2}`).join("$, $")}$이고, ` +
      `나머지 $${others.map((r) => r.disc).join("$, $")}$${eunNeun(
        others[others.length - 1]!.disc,
      )} 제곱수가 아니다.`,
  ];
  kept.forEach((k, i) => {
    const row = rows.find((x) => x.k === k)!;
    const s = row.root!;
    lines.push(
      `${MARKS[i]!} $k=${k}$일 때 두 근은 ` +
        `$x=\\dfrac{${b}+${s}}{${twoA}}=${fracTex(b + s, twoA)}$, ` +
        `$x=\\dfrac{${b}-${s}}{${twoA}}=${fracTex(b - s, twoA)}$이므로 ` +
        `두 근이 모두 유리수이다.`,
    );
  });
  lines.push(
    `그러므로 조건을 만족시키는 자연수 $k$는 $${kept.join("$, $")}$이고, ` +
      `그 합은 $${kept.join("+")}=${answer}$이다.`,
  );

  return {
    content,
    answer: `$${answer}$`,
    solution: lines.join("\n"),
    facts: {
      a,
      b,
      window,
      keptCount: kept.length,
      x: answer,
    },
    figureSpec: null,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// D. 54V  분모를 유리화한 식이 자연수가 되도록 하는 수를 모두 구하기      (심화상)
//    3-1 «근호를 포함한 식의 계산» → 우리 소단원 「근호를 포함한 식의 계산」
// ════════════════════════════════════════════════════════════════════════════

/**
 * 🔴 **굳힘 «둘»을 각각 인자로 받는 순수 함수** — ㉡ 을 밖에서 재는 통로다.
 *
 * $\sqrt n+\dfrac{d}{\sqrt n}$ 의 분모를 유리화하면 $\dfrac{(n+d)\sqrt n}{n}$ 이다.
 *
 * ```
 * useSquareCheck   유리수이려면 √n 이 유리수, 곧 n 이 **제곱수**여야 한다 (07번 «분모의 유리화»)
 * useDivisorCheck  n=k^2 이면 식이 k+d/k 이므로 k 가 **d 의 약수**여야 자연수다
 * ```
 *
 * ⚠️ 제곱수 조건을 끄면 $k$ 를 정할 수 없으므로 약수 조건이 **물 것이 없다** — 그래서
 *    창 전체가 남는다. 이것은 «약수 조건이 장식»이라는 뜻이 아니라, 두 굳힘이 이 순서로만
 *    맞물린다는 사실이다. 시험은 (참,참)·(참,거짓)·(거짓,·) 세 답이 **모두 다름**을 잰다.
 */
export function solveRootSumNatural(
  d: number,
  n: number,
  useSquareCheck: boolean,
  useDivisorCheck: boolean,
): number[] {
  const out: number[] = [];
  for (let v = 1; v <= n; v += 1) {
    if (useSquareCheck) {
      const k = intSqrt(v);
      if (k === null) continue;
      if (useDivisorCheck && d % k !== 0) continue;
    }
    out.push(v);
  }
  return out;
}

export type RootSumSeed = { d: number; n: number };

export type RootSumPlan = {
  d: number;
  n: number;
  /** $d$ 의 약수 전부 */
  divs: number[];
  /** 그 약수의 제곱 전부 — 창을 대기 **전**의 후보 */
  divSquares: number[];
  /** 창 밖으로 버린 제곱 */
  cutSquares: number[];
  kept: number[];
  sift: Sift;
  answer: number;
};

/**
 * 쓸 수 있는 $(d,N)$ 을 프로그램으로 뽑는다.
 *
 * ```
 * 약수 ≤ 9 개              해설의 나열이 지면에서 안 넘치게
 * 사는 것 3..6 개          답이 한두 자리로 굳지 않게
 * 버린 것 ≥ 1 개           창이 **실제로 자르지 않으면** 「N 이하」가 꾸밈이 된다
 * maxSurv ≤ N < minCut     창은 살아남는 것을 다 담고 버릴 것만 자른다
 * N ≤ 2·maxSurv            창이 헐렁하면 「N 이하」가 있으나 마나가 된다
 * 합 ≤ 300 · maxSurv ≤ 200 수를 키우는 것은 난이도가 아니다 (D-115 ⑽③)
 * 합 ∉ {d, N}              ㉠ — 「지면에서 하나 집기」를 막는다
 * ```
 */
export function rootSumPool(): RootSumSeed[] {
  const out: RootSumSeed[] = [];
  const windows = [
    40, 45, 50, 60, 70, 80, 90, 100, 120, 140, 150, 180, 200, 250, 300,
  ];
  const bases = [
    12, 16, 18, 20, 24, 28, 30, 32, 36, 40, 42, 45, 48, 50, 54, 60,
  ];
  for (const d of bases) {
    const ds = divisors(d);
    if (ds.length > 9) continue;
    for (const n of windows) {
      const keptK = ds.filter((k) => k * k <= n);
      const cutK = ds.filter((k) => k * k > n);
      if (keptK.length < 3 || keptK.length > 6) continue;
      if (cutK.length < 1) continue;
      const maxSurv = Math.max(...keptK.map((k) => k * k));
      const minCut = Math.min(...cutK.map((k) => k * k));
      if (n < maxSurv || n >= minCut) continue;
      if (n > 2 * maxSurv) continue;
      if (maxSurv > 200) continue;
      const sum = keptK.reduce((t, k) => t + k * k, 0);
      if (sum > 300) continue;
      if (new Set([0, d, n]).has(sum)) continue;
      out.push({ d, n });
    }
  }
  return out;
}

const ROOT_SUM_POOL = rootSumPool();

/**
 * **54V «심화상»** — 「$\sqrt n+\dfrac{d}{\sqrt n}$ 이 자연수인 $n$ 을 모두 구하고 그 합」.
 *
 * 굳지 **않는다.** 유리화하기 전에는 유리수인지조차 못 보고, 유리화한 뒤에야 「$n$ 이
 * 제곱수」라는 둘째 조건이 보이며, 거기서 다시 $d$ 의 약수를 **모두 만들어** 창에 하나씩
 * 대 봐야 한다 — 중1 `95T`(「$M$ 의 약수를 모두 만들어 둘째 조건에 하나씩 대 본다」)와
 * 같은 꼴의 «상».
 */
export function planRootSum(rng: Rng): RootSumPlan {
  const { d, n } = pick(rng, ROOT_SUM_POOL);
  const divs = divisors(d);
  const divSquares = divs.map((k) => k * k);
  const kept = solveRootSumNatural(d, n, true, true);
  const cutSquares = divSquares.filter((v) => v > n);
  return {
    d,
    n,
    divs,
    divSquares,
    cutSquares,
    kept,
    // 후보는 발문이 주는 창 전체다 — 「굳힘을 안 읽으면 학생이 아는 전부」가 그것이다.
    sift: { candidates: solveRootSumNatural(d, n, false, false), kept },
    answer: kept.reduce((t, v) => t + v, 0),
  };
}

function renderRootSum(rng: Rng): Body {
  const plan = planRootSum(rng);
  const { d, n, divs, divSquares, cutSquares, kept, answer } = plan;
  const big = kept[kept.length - 1]!;
  const bigK = intSqrt(big)!;

  const content =
    `$${n}$ 이하의 자연수 $n$에 대하여 $\\sqrt{n}+\\dfrac{${d}}{\\sqrt{n}}$의 값이 ` +
    `자연수가 되도록 하는 $n$의 값을 모두 구하고, 그 합을 구하시오.`;

  const lines = [
    `$\\dfrac{${d}}{\\sqrt{n}}$의 분모를 유리화하면 ` +
      `$\\dfrac{${d}}{\\sqrt{n}}=\\dfrac{${d}\\sqrt{n}}{n}$이다.`,
    `따라서 주어진 식은 ` +
      `$\\sqrt{n}+\\dfrac{${d}\\sqrt{n}}{n}=\\dfrac{n\\sqrt{n}+${d}\\sqrt{n}}{n}` +
      `=\\dfrac{(n+${d})\\sqrt{n}}{n}$이다.`,
    `$n$과 $n+${d}$${eunNeun(d)} 자연수이므로 이 값이 유리수가 되려면 ` +
      `$\\sqrt{n}$이 유리수, 곧 $n$이 제곱수이어야 한다.`,
    // ㉱ 발문은 $n$ 하나만 쓴다 — 해설이 새로 들이는 글자 $k$ 는 발문에 없다.
    `자연수 $k$에 대하여 $n=k^{2}$으로 놓으면 주어진 식은 ` +
      `$\\sqrt{k^{2}}+\\dfrac{${d}}{\\sqrt{k^{2}}}=k+\\dfrac{${d}}{k}$이다.`,
    `이 값이 자연수가 되려면 $\\dfrac{${d}}{k}$가 자연수이어야 하므로 ` +
      `$k$는 $${d}$의 약수이다.`,
    `$${d}$의 약수는 $${divs.join("$, $")}$이므로 $n=k^{2}$의 값은 차례로 ` +
      `$${divSquares.join("$, $")}$이다.`,
    `이 가운데 $${cutSquares.join("$, $")}$${eunNeun(
      cutSquares[cutSquares.length - 1]!,
    )} $${n}$보다 크므로 조건에 맞지 않는다.`,
    `실제로 $n=${big}$일 때 주어진 식의 값은 ` +
      `$\\sqrt{${big}}+\\dfrac{${d}}{\\sqrt{${big}}}=${bigK}+${d / bigK}=${bigK + d / bigK}$이다.`,
    `따라서 조건을 만족시키는 $n$의 값은 $${kept.join("$, $")}$이고, ` +
      `그 합은 $${kept.join("+")}=${answer}$이다.`,
  ];

  return {
    content,
    answer: `$${answer}$`,
    solution: lines.join("\n"),
    facts: { d, n, keptCount: kept.length, x: answer },
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

export const M3_TOP_3: TypeEntry[] = [
  def(
    BOOK1,
    MINOR.이차방정식풀이,
    "51V",
    "이차방정식이 되는지가 갈리는 방정식에서 해 구하기",
    SEC.이차방정식풀이,
    "심화중",
    renderQuadraticAlive,
  ),
  def(
    BOOK1,
    MINOR.다항식곱셈,
    "52V",
    "곱셈 공식으로 이차항이 지워지는 식에서 계수 구하기",
    SEC.다항식곱셈,
    "심화중",
    renderCancel,
  ),
  def(
    BOOK1,
    MINOR.이차방정식활용,
    "53V",
    "두 근이 모두 유리수가 되도록 하는 상수를 모두 구하기",
    SEC.근의공식,
    "심화상",
    renderRationalRoots,
  ),
  def(
    BOOK1,
    MINOR.근호계산,
    "54V",
    "분모를 유리화한 식이 자연수가 되도록 하는 수를 모두 구하기",
    SEC.근호계산,
    "심화상",
    renderRootSum,
  ),
];
