/**
 * 중3 **확대 갈래 5차 물결 (갈래 a)** — `심화중`·`심화상`, D-116, 번호 접미사 **`X`**.
 *
 * 병렬 세션 소유 모듈. 이 파일과 `generate.ts` 의 `...M3_TOP_5A` **한 줄**만 이 갈래가
 * 건드린다(등록 한 줄은 리드가 넣는다). 21갈래가 동시에 도는 물결이라 새 파일 하나 +
 * spread 한 줄이면 병합 충돌도, 「유형이 정확히 N개」 가드도 둘 다 피한다.
 *
 * ## ⑴ 🔴 리드가 준 소단원 이름 넷 중 **하나가 정본에 없다**
 *
 * 브리프는 네 번째 소단원을 「**원주각의 성질**」이라 적었는데, `prisma/seed-data/units.ts`
 * 의 중3 6단원 소단원은 「원과 현」·「원의 접선」·**「원주각」**·「원주각의 활용」 넷뿐이다.
 * 「원주각의 성질」은 **RPM 유형 `3-2|원주각|04` 의 제목**이지 소단원 이름이 아니다
 * (`src/lib/middle/m3.ts:315` 가 그 제목으로 등록해 두었다).
 *
 * 없는 소단원 이름을 쓰면 적재가 단원을 못 찾아 그 유형이 **조용히 사라진다** — 그래서
 * 이 모듈은 정본 이름 **「원주각」**을 쓴다. 시험이 `CURRICULUM_UNITS` 와 글자 그대로
 * 대조하고, 「브리프 문자열은 정본에 없다」는 사실 자체도 못 박는다. 리드는 다른 갈래가
 * 「원주각」을 같이 맡지 않았는지 확인해야 한다(겹쳐도 번호는 안 부딪히지만 한 소단원에
 * 확대 갈래가 둘 서게 된다).
 *
 * ⚠️ 그리고 **「제곱근의 뜻과 성질」에는 이미 확대 갈래가 있다** — 2차 물결 `41U`
 *    (`m3Top2.ts`, 심화상). 브리프의 「아직 확대 갈래가 없는 소단원」과 어긋나므로
 *    ㉢ 겹침 검사에서 그 형제를 **특히** 본다(같은 시험지에 실린다).
 *
 * ## ⑵ 무엇이 «중»이고 무엇이 «상»인가 (D-116 · `m3Top4.ts` 머리말과 한 벌)
 *
 * ```
 * 심화중   마디 하나가 안 굳고, **그 소단원의 개념**이 그것을 굳힌다.
 * 심화상   성질로 못 굳혀 후보를 **다 만들어 견줘야** 한다.
 * ```
 *
 * | 키 | 갈래 | 안 굳는 마디 | 무엇이 굳히나 | 같은 소단원 형제와 무엇이 다른가 |
 * |---|---|---|---|---|
 * | `이차방정식의 활용\|129X` | **심화상** | 더하는 개수 $k$ **와** 첫 수 $a$ — 미지수가 둘인데 식이 하나다 | 굳지 **않는다.** $k(k+2a-1)=2N$ 은 「$k$ 가 $2N$ 의 약수」까지만 주고, 어느 약수가 사는지는 **약수마다 $2a$ 를 실제로 구해** 짝수인지 봐야 갈린다 | `09`(수에 대한 문제)는 개수가 «세 개»로 **발문에 박혀** 미지수가 하나뿐이라 이차방정식 한 번이면 끝난다 |
 * | `제곱근의 뜻과 성질\|130X` | **심화상** | $n$ — 조건이 둘인데 어느 것도 $n$ 을 혼자 정하지 못한다 | 굳지 **않는다.** 앞 조건이 후보를 $a-1$, $a-4$, $a-9$, … 로 **만들어 줄 뿐**이고, 뒤 조건은 그 후보를 하나씩 **대 봐야** 산 것과 죽은 것이 갈린다 | `11`~`14`(가 자연수가 되도록 하는 $x$)는 조건이 **하나**라 소인수분해 한 번으로 답이 바로 나오고 후보가 아예 없다. `41U`(2차)는 근호 **안의 부호**가 갈리는 방정식이라 경우 나누기의 축이 다르다 |
 * | `삼각비의 값\|131X` | **심화중** | 두 근 중 **어느 것이 $\sin A$(또는 $\cos A$)인가** | 이 소단원의 개념 둘. ⓐ 「$0^\circ\le A\le90^\circ$ 에서 $0\le\sin A\le1$」이 범위 밖 근을 **계산 없이** 지우고 ⓑ 「$\tan 90^\circ$ 의 값은 정할 수 없다」가 $A=90^\circ$ 를 지운다. 남은 하나로 특수각이 정해진다 | `08`·`13`(특수각의 삼각비의 값)은 각이 **발문에 적혀** 있어 값을 대입하면 끝이고 고를 것이 없다 |
 * | `원주각\|132X` | **심화중** | 호 $DE$·호 $EA$ 의 길이 — 발문이 **아무것도 안 준다**(두 각 각각도 안 정해진다) | 이 소단원의 개념 「원주각은 중심각의 반」과 「다섯 호를 이으면 원 전체」. 두 호의 중심각의 **합**이 $360^{\circ}$ 에서 나오므로 각 호를 **한 번도 구하지 않고** 답이 나온다 | `01`·`02`(원주각과 중심각)는 각이 하나씩 대응해 접을 마디가 없고, `07`·`08`(호의 길이)은 **모든** 호의 비를 준다 |
 *
 * ## ⑶ 🔴 앞 물결들이 **실제로 낸 결함** — 이 넷은 이렇게 막았다
 *
 * 전부 **값은 맞고 KaTeX 도 초록**이라 어느 자도 구조적으로 못 보던 부류다.
 *
 * ㉮ **해설이 정답지 한 단(964.8px)을 넘었다**(3차 중1 `53V`, 1242px). 넘치면 잘리는 게
 *    아니라 **같은 쪽 다른 문항의 해설이 통째로 사라진다.** 제품 `estimateSolutionPx`
 *    로 **660판**을 재어 **700px 미만**을 시험이 못 박는다. 그렇다고 걸음을 지우지
 *    않는다(D-116 ⑹) — 줄이는 길은 **훑는 후보 수를 줄이는 것**이라, `129X` 는 후보를
 *    $3$~$5$ 개로, `130X` 는 $3$~$5$ 개로 창에서 미리 자른다.
 * ㉯ **해설이 걸음을 건너뛰었다**(3차 중2 `38V` — 「$22-2x\ge1$에서 $x\le10$」인데 참
 *    해는 $x\le10.5$). 정수·자연수로 뛰는 자리마다 **그 자리에서** 근거를 적는다.
 *    `129X` 는 「$2a$ 가 홀수라 $a$ 가 자연수가 아니다」를 후보마다, `130X` 는 「$46$ 은
 *    $6^2$ 과 $7^2$ 사이라 자연수의 제곱이 아니다」를 **끼인 두 제곱수**로 적는다.
 * ㉰ **해설이 기약이 아닌 분수를 찍었다**(3차 중1 `52V`, `$\dfrac{50}{4}$`).
 *    `129X`·`130X`·`132X` 는 나눗셈을 `\div` 로 적어 **분수를 아예 안 쓴다.**
 *    `131X` 는 특수각의 삼각비라 분수를 피할 수 없으므로, 나오는 분수를 $\dfrac12$·
 *    $\dfrac13$·$\dfrac14$·$\dfrac34$·$\dfrac32$ 처럼 **이미 기약인 것**으로 못 박고
 *    시험이 지면의 모든 `dfrac{정수}{정수}` 를 훑는다(찾은 자리 수도 같이 찍는다).
 * ㉱ **발문이 스스로 못 박은 상한을 오답이 넘었다**(4차 중2 `37W`). 넷 다 상한을 선언
 *    하지 않는다 — 공용 `declaredUpperBound` 가 `null` 임을 660판에서 찍고, 그 함수가
 *    «있다»도 낼 수 있음을 양성으로 같이 보인다.
 * ㉲ **정답이 «구간»이면 파생 오답이 뒤집힌다**(3차 중2 `35V`). 넷 다 정답이 **한 수**다.
 * ㉳ 🔴 **해설의 «말»을 지키는 시험이 없었다**(4차에서 중1 10줄·중2 3줄이 무방비).
 *    「홀수」를 「짝수」로, 「자연수의 제곱이 아니다」를 「이다」로, 「$\tan 90^\circ$ 의
 *    값은 정할 수 없다」를 「있다」로, 「중심각의 반」을 「두 배」로 바꿔도 값 검산은
 *    전부 초록이다. `claimFaults`(시험 쪽)가 **낱말이 가리키는 사실을 지면의 수로 다시
 *    계산해** 맞대고, 낱말을 뒤집으면 빨개지는 눈금을 같이 둔다.
 * ㉴ 🔴 **지면이 자기가 한 줄 앞에 세운 제약을 스스로 어긴다**(4차 중3 `55W`, 100%).
 *    `129X` 는 「$k\times k<M$ 인 약수만 본다」고 적고 **그 뒤로 그 조건을 어기는 $k$ 를
 *    한 번도 안 적는다**(열거 자체를 그 조건으로 만든다). `130X` 는 「$a-n$ 은 $a-1$
 *    이하」를 적고 그것을 어기는 후보를 안 만든다. 시험이 둘 다 지면에서 확인한다.
 * ㉵ 🔴 **자료를 정렬해 찍으면 «보이는 자리»가 순위를 암시한다**(4차 중1 `63W`, 100%).
 *    이 넷은 **자료를 늘어놓지 않는다** — 발문에 오는 수는 조건뿐이다.
 * ㉶ 🔴 **D-20 손실 원장은 «재현 가능»해야 한다**(4차 중1 `62W` — 판 수를 절반으로
 *    적었다). 창마다 가드를 **하나만 껐을 때**를 전수로 세고, **판 수와 답 수의 측정점을
 *    같은 자리**로 맞춘다. 시험이 그 표를 글자 그대로 다시 센다.
 * ㉷ **내보낸 순수 함수의 주석이 코드와 어긋나면 안 된다**(4차 중3 `solveBoxCases` —
 *    「끄면 일곱 자리를 다 훑는다」가 거짓이었다). 굳힘 인자를 끈 판이 **실제로 무엇을
 *    더 훑는지**를 시험이 창 전수로 센다.
 * ㉸ 우리말 — 「그중」은 붙여 쓴다. 조사는 지면에 **찍히는 글자**로 정한다.
 *
 * ## ⑷ 함정 ㉠㉡㉢
 *
 * ㉠ **창을 한쪽 끝만 주면 굳힘이 장식이 된다.**
 *    · `129X` — 답이 **살아남은 것 전부의 합**이라 목록의 어느 자리도 답이 아니다.
 *      그리고 **가장 작은 후보($k=2$)가 늘 죽지도, 늘 살지도 않는다** — 실측으로
 *      갈린다(시험이 양쪽이 다 있는 것을 확인한다).
 *    · `130X` — 답이 **살아남은 것 전부의 합**이라 한 자리만 봐서는 안 나온다.
 *      첫 후보($n=a-1$)가 사는 씨앗과 죽는 씨앗이 둘 다 있다.
 *      ⚠️ 처음엔 「가장 큰 것과 가장 작은 것의 차」를 물었는데, 그 차는 $a$ 가 지워져
 *      **제곱수의 차 열 가지**밖에 못 낸다(실측 최빈 $15.6\%$). `squareGapPool()` 머리말에
 *      적어 두었다 — 쏠림은 창이 아니라 **묻는 것**이 정하는 자리가 있다.
 *    · `131X` — 후보가 **둘**이고, 죽는 것이 **큰 근일 때도 작은 근일 때도** 있다
 *      (죽는 까닭도 셋으로 갈린다). 「늘 큰 쪽이 죽는다」가 아니다.
 *    · `132X` — **후보 목록이 아예 없다**(값이 하나로 굳는다). 「축이 없다」와 「축이
 *      초록이다」는 다른 말이므로 시험은 이 갈래에 ㉠ 을 **«잴 축 없음»으로 따로 찍고**,
 *      대신 「안 정해지는 두 호를 어떻게 잡아도 답이 같다」를 **호를 실제로 나눠 가며**
 *      전수로 잰다.
 *
 * ㉡ **「굳힘이 항등식」** — 굳힘을 지우고 같은 씨앗으로 돌려 답이 그대로면 장식이다.
 *    넷 다 굳힘을 **인자로 받는 순수 함수**로 뽑아 두었다:
 *    `consecutiveCounts(total, useSmall, useParity)` ·
 *    `squareGapHits(a, b, useSecond)` ·
 *    `liveTrigRoots(fn, deadNum, deadDen, useRange, useTan)` ·
 *    `crossChordAngle(m, n, useHalf)`.
 *    시험이 그 인자를 흔들어 답이 **실제로** 달라지는지 창 전수로 잰다.
 *
 * ㉢ **갈래끼리 겹침** — 새 갈래가 그 소단원의 형제와 한 시험지에 실린다. 「수+정답」
 *    열쇠에는 천장이 있으므로 한글 낱말 열쇠를 같이 쓰고, 기준선(형제끼리의 겹침)을
 *    먼저 찍는다. 천장이 낮으면 «겹침 없음»이 아니라 **«판정 불가»** 로 읽어야 한다.
 *
 * ## ⑸ 번호 규약 — **`X` 접미사**
 *
 * `extensionNumberReason`(`src/__tests__/helpers/rpmCatalog.ts`)은 `숫자+영문 대문자 한
 * 글자` 를 「색인 번호와 절대 안 겹친다」로 통과시킨다. 5차 물결은 **`X`** 다.
 *
 * ⚠️ **소단원 이름과 RPM 중단원 이름이 다른 것이 둘이다.** 우리 소단원 「삼각비의 값」의
 *    RPM 중단원은 「삼각비」이고, 「원주각」은 이름이 같다. 손으로 적으면 어긋난다.
 *
 * ## 계약 (이웃 모듈과 한 벌)
 *
 * 1. **정답을 먼저 뽑고 발문을 역산한다** — 답 쏠림을 축으로 두지 않으면 3차 `52V`
 *    처럼 최빈 정답이 $51.2\%$ 가 된다.
 * 2. `facts.x` 가 **답의 첫 수**다.
 * 3. 숫자는 전부 `$...$` 안에 (`elementary/rules` `bareNumbers` 가드).
 * 4. `pick` 이 낼 것이 없으면 **던진다** — 조용히 기본값을 내지 않는다.
 * 5. 그림이 없으므로 발문이 **지면을 가리키지 않는다**(`figureSpec: null`).
 *    ⚠️ `132X` 는 원의 문항인데 그림이 없다. 형제 `01`~`10` 은 그림을 싣지만, 우리
 *    발문은 네 점의 **차례**와 호의 길이 비만으로 배치가 완결되고 낱말 「그림」을 한
 *    번도 안 쓴다(`pointsAtFigure` 가 `null` 을 내는 것을 시험이 660판에서 확인한다).
 * 6. 🔴 **해설이 걸음을 건너뛰지 않는다**(D-116 ⑸, 원장님 완료 조건).
 * 7. 🔴 **해설의 분수는 전부 기약이고 분모가 $1$ 이 아니다**(위 ㉰).
 *
 * ## 왜 «설계»를 `plan…()` 으로 따로 내보내나 — 없는 축은 변이시킬 수 없다
 *
 * ㉠·㉡ 을 **밖에서 재려면** 「후보 집합」과 「굳힘이 남긴 것」이 문항 밖에 있어야 한다.
 * 발문·해설 문자열만 내보내면 그 축이 아예 없어서 변이시킬 수도 없다. 그래서 유형마다
 * 순수 설계 함수를 export 하고, 발문·해설은 그 설계를 **읽기만** 한다. `Sift` 는 1차
 * 물결의 것을 그대로 쓴다 — 판정기 `scripts/qa/probe-middle-top-m3.ts` 가 그 모양을 본다.
 */
import { pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { eulReul, euroRo, waGwa } from "./m2Josa";
import type { Sift } from "./m3Top";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중3";
const BOOK1 = "3-1";
const BOOK2 = "3-2";

/**
 * 우리 `Unit.section` 정확한 이름 (`prisma/seed-data/units.ts` 실측 — 477·469·482·486행).
 *
 * 🔴 `원주각` 은 브리프가 「원주각의 성질」이라 적은 자리다(머리말 ⑴). 정본에 그 이름은
 *    없다 — 시험이 «브리프 문자열은 정본에 없고 이 이름은 있다»를 둘 다 못 박는다.
 */
const SEC = {
  이차활용: "이차방정식의 활용",
  제곱근: "제곱근의 뜻과 성질",
  삼각비값: "삼각비의 값",
  원주각: "원주각",
} as const;

/**
 * RPM 중단원 이름 — 이웃 모듈(`m3Quad`·`m3Root`·`m3Trig`·`m3`)이 쓰는 글자 그대로.
 *
 * ⚠️ 「삼각비의 값」의 중단원 이름은 **「삼각비」**다. 소단원과 중단원은 다른 정본에서
 *    온다(`units.ts` / `scripts/rpm/rpm-type-catalog.json`).
 */
const MINOR = {
  이차활용: "이차방정식의 활용",
  제곱근: "제곱근의 뜻과 성질",
  삼각비: "삼각비",
  원주각: "원주각",
} as const;

type Body = Pick<
  MidProblem,
  "content" | "answer" | "solution" | "facts" | "figureSpec"
>;

/** 후보를 하나씩 짚는 표지. 창이 후보를 다섯으로 자르므로 여덟까지 둔다. */
const MARKS = ["㉠", "㉡", "㉢", "㉣", "㉤", "㉥", "㉦", "㉧"] as const;

/**
 * 🔴 **풀을 «적재할 때»가 아니라 «처음 쓸 때» 만든다.**
 *
 * `generate.ts` 가 이 모듈을 import 하므로, 풀을 최상위 `const` 로 두면 **중등 엔진을
 * 건드리는 모든 시험 파일**이 그 값을 치른다. 게으르게 만들면 실제로 이 유형을 뽑는
 * 파일만 한 번 치른다. 함수는 순수(입력 없음·같은 결과)라 캐시가 뜻을 안 바꾸고,
 * 변이 하네스는 프로세스를 새로 띄우므로 캐시가 변이를 가리지 않는다.
 */
const CONSEC_CACHE: { pool?: ConsecSeed[]; answers?: number[] } = {};
const SQGAP_CACHE: { pool?: SquareGapSeed[]; answers?: number[] } = {};
const TRIG_CACHE: { pool?: TrigSeed[]; answers?: number[] } = {};
const CIRCLE_CACHE: { pool?: CircleSeed[]; answers?: number[] } = {};

// ── 지면 소품 — 「값은 맞는데 글자가 나쁜」 부류를 **여기 한 곳**에서 막는다 ──────

/**
 * 주격 조사 — `$41$이` · `$5$가`.
 *
 * ⚠️ 받침 판정은 새로 쓰지 않고 `m2Josa` **한 곳**에서 온다. 규칙이 두 벌이 되면 한쪽만
 *    고쳐도 아무도 모른다(2026-08-18). 그리고 이 부류는 값 검산이 구조적으로 못 본다 —
 *    산술은 맞고 글자만 틀리다.
 *
 * ⚠️ 공용 조사 자(`josaMismatches`)는 「이」를 **일부러 안 본다**(서술격 「$5$이다」와
 *    구분이 안 돼 거짓 경보가 난다). 그래서 이 함수는 «가를 써야 할 자리에 이를 썼다»를
 *    그 자에게 안 들킨다 — 그 반쪽은 여기서 옳게 짓는 수밖에 없고, 시험이 따로 잰다.
 */
function iGa(n: number): "이" | "가" {
  return eulReul(n) === "을" ? "이" : "가";
}

/** 정수 제곱근 — 제곱수가 아니면 `null`. 부동소수 반올림을 **정수 곱으로** 되짚는다. */
export function intSqrt(n: number): number | null {
  if (n < 0) return null;
  const r = Math.round(Math.sqrt(n));
  return r * r === n ? r : null;
}

/** 오름차순 약수 전부. */
export function divisorsOf(n: number): number[] {
  const out: number[] = [];
  for (let d = 1; d * d <= n; d += 1) {
    if (n % d !== 0) continue;
    out.push(d);
    if (d !== n / d) out.push(n / d);
  }
  return out.sort((a, b) => a - b);
}

/** 최대공약수 — `132X` 가 답의 꼴을 확인할 때만 쓴다. */
function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

/**
 * 🔴 **㉵ — 발문에 적힌 수에서 «한 걸음»에 닿는 값 전부**(부호 양쪽).
 *
 * 3차 `51V` 는 「적힌 수 하나 집기」를 막아 놓고 「적힌 두 수를 **한 번 나눈** 값」을
 * $57.1\%$ 놓쳤다. 그래서 여기서는 네 셈(＋−×÷)을 **전부** 센다. 나눗셈은 나누어
 * 떨어지는 것만 — 지면에서 학생이 암산으로 얻는 값만 세려는 것이다.
 *
 * ⚠️ 이 함수 **하나**를 넷이 같이 쓴다. 유형마다 다시 적으면 한쪽만 고쳐도 아무도
 *    모른다(2026-08-18 「목록을 손으로 쓰면 세는 쪽과 고치는 쪽이 같이 눈이 먼다」).
 */
export function oneStepReach(nums: readonly number[]): Set<number> {
  const out = new Set<number>();
  const add = (v: number): void => {
    if (!Number.isFinite(v)) return;
    out.add(v);
    out.add(-v);
  };
  for (const v of nums) add(v);
  for (const a of nums) {
    for (const b of nums) {
      add(a + b);
      add(a - b);
      add(a * b);
      if (b !== 0 && a % b === 0) add(a / b);
    }
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
// A. 129X  연속하는 자연수의 합으로 나타낼 때 더하는 개수를 모두 구하기   (심화상)
//    3-1 «이차방정식의 활용» → 우리 소단원 「이차방정식의 활용」
// ════════════════════════════════════════════════════════════════════════════

/**
 * 후보 전부 — $2N$ 의 약수 가운데 $2$ 이상인 것.
 *
 * 되짚기: 더하는 개수를 $k$, 가장 작은 수를 $a$ 라 하면
 * $ka+\dfrac{k(k-1)}{2}=N$, 곧 $k(k+2a-1)=2N$ 이다. 굳힘을 하나도 안 읽으면
 * 학생이 아는 것은 「$k$ 는 $2N$ 의 약수」까지다.
 */
export function consecutiveCandidates(total: number): number[] {
  return divisorsOf(2 * total).filter((k) => k >= 2);
}

/**
 * 🔴 **굳힘을 «인자로» 받는 순수 함수** — ㉡ 을 밖에서 재는 통로다.
 *
 * 굳힘이 **둘**이다.
 *   · `useSmall`  — $a\ge1$ 이면 $k+2a-1\ge k+1>k$ 이므로 $k\times k<2N$
 *   · `useParity` — $2a=2N\div k-k+1$ 이 **짝수**라야 $a$ 가 자연수다
 *
 * 돌려주는 것은 **살아남은 $k$ 의 목록**(오름차순)이다.
 *
 * ⚠️ `useSmall` 을 끄면 훑는 약수가 실제로 늘어난다 — 「끄면 더 훑는다」는 단언을
 *    시험이 창 전수로 확인한다(4차 `solveBoxCases` 의 주석이 거짓이던 자리, ㉷).
 *    반대로 `useParity` 만 켠 판은 $a\le0$ 인 $k$ 까지 남으므로 답이 커진다.
 */
export function consecutiveCounts(
  total: number,
  useSmall: boolean,
  useParity: boolean,
): number[] {
  const m = 2 * total;
  const out: number[] = [];
  for (const k of consecutiveCandidates(total)) {
    if (useSmall && k * k >= m) continue;
    if (useParity && (m / k - k + 1) % 2 !== 0) continue;
    out.push(k);
  }
  return out;
}

/** 개수 $k$ 일 때 가장 작은 수 $a$ — 자연수가 아니면 `null`. */
export function firstTermFor(total: number, k: number): number | null {
  const twice = (2 * total) / k - k + 1;
  if (!Number.isInteger(twice) || twice <= 0 || twice % 2 !== 0) return null;
  return twice / 2;
}

export type ConsecSeed = { total: number; kept: number[]; answer: number };

export type ConsecPlan = {
  /** 발문이 주는 합 $N$ */
  total: number;
  /** $2N$ */
  twice: number;
  /** 해설이 실제로 훑는 후보 — $2N$ 의 약수 중 $2$ 이상이고 제곱이 $2N$ 보다 작은 것 */
  candidates: number[];
  /** 살아남은 $k$ */
  kept: number[];
  sift: Sift;
  answer: number;
};

/**
 * 쓸 수 있는 $N$ 을 **프로그램으로 뽑는다** — 손 목록은 세는 쪽과 고치는 쪽을 같이
 * 눈멀게 한다(2026-08-18). 조건마다 까닭이 있다.
 *
 * ```
 * 9 ≤ N ≤ 800          수를 키우는 것은 난이도가 아니다 (D-115 ⑽③)
 * 후보 3~5개            ㉮ 해설이 정답지 한 단을 넘지 않게 (열거가 곧 해설 길이다)
 * 사는 것 2~4개          하나뿐이면 「모두 구하고 합」이 말이 안 된다
 * 죽는 것 ≥1            굳힘이 «일할 자리»가 있어야 한다 (㉡)
 * 답이 한 걸음에 안 닿는다   ㉵ — 지면에 적히는 수는 $N$ 뿐이다
 * ```
 *
 * 🔴 **D-20 손실 원장은 시험이 창 전수로 다시 센다**(㉶). 여기 주석에 수치를 적지
 *    않는 까닭이 그것이다 — 적으면 코드와 어긋나는 날 아무도 모른다. 시험
 *    `middleM3Top5a.test.ts` 의 「D-20 손실 원장」이 「가드 하나만 껐을 때」를
 *    전수로 세고 **판 수와 답 수를 같은 측정점에서** 찍는다.
 */
export function consecutiveSumPool(): ConsecSeed[] {
  if (CONSEC_CACHE.pool) return CONSEC_CACHE.pool;
  const out: ConsecSeed[] = [];
  for (let total = 9; total <= 800; total += 1) {
    const cand = consecutiveCounts(total, true, false);
    if (cand.length < 3 || cand.length > 5) continue;
    const kept = consecutiveCounts(total, true, true);
    if (kept.length < 2 || kept.length > 4) continue;
    if (cand.length - kept.length < 1) continue;
    const answer = kept.reduce((t, v) => t + v, 0);
    if (oneStepReach([0, 1, 2, total]).has(answer)) continue;
    out.push({ total, kept, answer });
  }
  CONSEC_CACHE.pool = out;
  return out;
}

/**
 * 🔴 **풀이 낼 수 있는 답 전부**(오름차순) — 답을 «고르게» 뽑기 위한 축이다.
 *
 * 3차 `52V` 는 풀에서 그냥 하나를 뽑아 **최빈 정답이 $51.2\%$** 였다. 여기서는 답을
 * 먼저 고르고 그 답을 내는 씨앗만 다시 뽑는다.
 */
export function consecutiveAnswers(): number[] {
  if (!CONSEC_CACHE.answers) {
    CONSEC_CACHE.answers = [
      ...new Set(consecutiveSumPool().map((r) => r.answer)),
    ].sort((x, y) => x - y);
  }
  return CONSEC_CACHE.answers;
}

/** **129X «심화상»** — 「연속하는 자연수의 합으로 나타낼 때 개수를 모두」. */
export function planConsecutiveSum(rng: Rng): ConsecPlan {
  const want = pick(rng, consecutiveAnswers());
  const sub = consecutiveSumPool().filter((r) => r.answer === want);
  if (sub.length === 0) {
    throw new Error(`m3Top5a 129X: 답 ${want} 에 맞는 씨앗이 없습니다`);
  }
  const { total } = pick(rng, sub);
  const candidates = consecutiveCounts(total, true, false);
  const kept = consecutiveCounts(total, true, true);
  if (kept.length < 2 || candidates.length <= kept.length) {
    throw new Error(`m3Top5a 129X: 후보가 모자랍니다 (N=${total})`);
  }
  return {
    total,
    twice: 2 * total,
    candidates,
    kept,
    sift: { candidates, kept },
    answer: kept.reduce((t, v) => t + v, 0),
  };
}

function renderConsecutiveSum(rng: Rng): Body {
  const plan = planConsecutiveSum(rng);
  const { total, twice, candidates, kept, answer } = plan;

  const content =
    `연속하는 두 개 이상의 자연수를 모두 더하여 $${total}$${eulReul(total)} ` +
    `만들려고 한다. 이때 더하는 자연수의 개수가 될 수 있는 값을 모두 구하고, ` +
    `그 합을 구하시오.`;

  const lines: string[] = [
    `더하는 자연수의 개수를 $k$, 그중 가장 작은 수를 $a$라 하면 $k$는 $2$ 이상인 ` +
      `자연수이고 $a$는 자연수이다.`,
    `더한 값은 $a+(a+1)+\\cdots+(a+k-1)=ka+\\{1+2+\\cdots+(k-1)\\}=` +
      `ka+\\dfrac{k(k-1)}{2}$이다.`,
    `따라서 $ka+\\dfrac{k(k-1)}{2}=${total}$이고, 양변에 $2$를 곱하여 정리하면 ` +
      `$k^{2}+(2a-1)k-${twice}=0$, 곧 $k(k+2a-1)=${twice}$이다.`,
    // ㉴ — 여기서 세운 제약을 아래 열거가 **그대로** 지킨다(어기는 $k$ 를 안 적는다).
    `$k$와 $k+2a-1$이 모두 자연수이므로 $k$는 $${twice}$의 약수이고, ` +
      `$a$가 자연수이므로 $k+2a-1\\ge k+1$, 곧 $k\\times k<${twice}$이다.`,
    `$${twice}$의 약수 중 $2$ 이상이고 제곱이 $${twice}$보다 작은 것은 ` +
      `$${candidates.join("$, $")}$이다.`,
    `이제 $k$마다 $2a=${twice}\\div k-k+1$을 구한다.`,
  ];
  candidates.forEach((k, i) => {
    const mark = MARKS[i]!;
    const twiceA = twice / k - k + 1;
    const head = `${mark} $k=${k}$이면 $2a=${twice}\\div ${k}-${k}+1=${twiceA}$이다.`;
    if (twiceA % 2 !== 0) {
      // ㉯ — 「자연수가 아니다」로 뛰는 자리의 근거를 그 자리에서 적는다.
      //
      // 🔴 **여기가 「짝수이므로」라고 적고 있었다.** $2a$ 가 **홀수**여서 $a$ 가
      //    자연수가 아닌 자리인데 낱말이 뒤집혀 있었다 — 지면에 「$653$이 짝수이므로」
      //    가 나갔다(653 은 홀수다). 값·KaTeX·검산은 전부 초록이라 이 부류는 **말을
      //    보는 자만** 잡는다. 이 갈래의 `claimFaults` 가 660판에서 잡았고, 검증
      //    에이전트가 주간 한도로 못 돌아 리드가 마무리하며 드러났다(2026-09-04).
      lines.push(
        `${head} $${twiceA}$${iGa(twiceA)} 홀수이므로 $a$는 자연수가 아니고, ` +
          `조건에 맞지 않는다.`,
      );
    } else {
      const a = twiceA / 2;
      lines.push(
        `${head} $${twiceA}$${iGa(twiceA)} 짝수이므로 $a=${a}$${euroRo(a)} ` +
          `자연수이고, 조건에 맞는다.`,
      );
    }
  });
  lines.push(
    `따라서 더하는 자연수의 개수가 될 수 있는 값은 $${kept.join("$, $")}$이고, ` +
      `그 합은 $${kept.join("+")}=${answer}$이다.`,
  );

  return {
    content,
    answer: `$${answer}$`,
    solution: lines.join("\n"),
    facts: {
      total,
      twice,
      candidateCount: candidates.length,
      keptCount: kept.length,
      x: answer,
    },
    figureSpec: null,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// B. 130X  두 근호가 동시에 자연수가 되는 수를 모두 찾기                  (심화상)
//    3-1 «제곱근의 뜻과 성질» → 우리 소단원 「제곱근의 뜻과 성질」
// ════════════════════════════════════════════════════════════════════════════

/**
 * 후보 전부 — $\sqrt{a-n}$ 이 자연수라는 조건 **하나만** 읽었을 때의 $n$.
 *
 * $a-n=s^{2}$ ($s$ 는 자연수)이고 $n\ge1$ 이므로 $s^{2}\le a-1$ 이다.
 * 큰 $n$ 부터, 곧 $s=1,2,3,\ldots$ 차례로 돌려준다 — 해설이 적는 차례와 같다.
 */
export function squareGapCandidates(a: number): number[] {
  const out: number[] = [];
  for (let s = 1; s * s <= a - 1; s += 1) out.push(a - s * s);
  return out;
}

/**
 * 🔴 **굳힘을 «인자로» 받는 순수 함수** — ㉡ 을 밖에서 재는 통로다.
 *
 * `useSecond` 가 곧 굳힘이다 — 「$\sqrt{n+b}$ 도 자연수」라는 **둘째** 조건이 후보를
 * 거른다. 끄면 첫 조건이 만든 후보가 통째로 남아 답(살아남은 것의 합)이 달라진다.
 * 창 전수로 그것을 시험이 확인한다.
 */
export function squareGapHits(
  a: number,
  b: number,
  useSecond: boolean,
): number[] {
  return squareGapCandidates(a).filter(
    (n) => !useSecond || intSqrt(n + b) !== null,
  );
}

export type SquareGapSeed = { a: number; b: number; answer: number };

export type SquareGapPlan = {
  /** 발문의 앞 근호 안 상수 */
  a: number;
  /** 발문의 뒤 근호 안 상수 */
  b: number;
  candidates: number[];
  hits: number[];
  sift: Sift;
  answer: number;
};

/**
 * 쓸 수 있는 $(a,b)$ 를 프로그램으로 뽑는다.
 *
 * ```
 * 10 ≤ a ≤ 50           후보 수가 곧 해설 길이다 (㉮) — $a$ 가 크면 $s$ 가 늘어난다
 * 1 ≤ b ≤ 300           수를 키우는 것은 난이도가 아니다
 * 후보 3~6개             ㉮
 * 사는 것 2~4개          하나뿐이면 「모두 구하고 합」이 말이 안 된다
 * 죽는 것 ≥1             굳힘이 «일할 자리»가 있어야 한다 (㉡)
 * 답이 한 걸음에 안 닿는다   ㉵ — 지면에 적히는 수는 $a$, $b$ 다
 * ```
 *
 * 🔴 **처음에는 답을 «가장 큰 것과 가장 작은 것의 차»로 두었다가 바꿨다.** 그 차는
 * $(a-s_1^{2})-(a-s_2^{2})=s_2^{2}-s_1^{2}$ 이라 **$a$ 가 통째로 지워진다** — 창을 아무리
 * 넓혀도 답이 될 수 있는 값이 $s\le5$ 에서 나오는 제곱수의 차 열 가지뿐이고, 실측으로
 * 서로 다른 답이 **여덟**, 최빈이 **15.6%** 였다(브리프 상한 12% 초과). 「합」은 $a$ 가
 * 남아 답이 씨앗을 따라 움직인다. **쏠림은 창을 넓혀서가 아니라 «묻는 것»을 바꿔서
 * 고쳐야 하는 부류가 있다.**
 */
export function squareGapPool(): SquareGapSeed[] {
  if (SQGAP_CACHE.pool) return SQGAP_CACHE.pool;
  const out: SquareGapSeed[] = [];
  for (let a = 10; a <= 50; a += 1) {
    const cand = squareGapCandidates(a);
    if (cand.length < 3 || cand.length > 6) continue;
    for (let b = 1; b <= 300; b += 1) {
      const hits = squareGapHits(a, b, true);
      if (hits.length < 2 || hits.length > 4) continue;
      if (hits.length >= cand.length) continue;
      const answer = hits.reduce((t, v) => t + v, 0);
      if (oneStepReach([0, 1, 2, a, b]).has(answer)) continue;
      out.push({ a, b, answer });
    }
  }
  SQGAP_CACHE.pool = out;
  return out;
}

/** 🔴 풀이 낼 수 있는 답 전부(오름차순) — 답을 «고르게» 뽑기 위한 축이다. */
export function squareGapAnswers(): number[] {
  if (!SQGAP_CACHE.answers) {
    SQGAP_CACHE.answers = [
      ...new Set(squareGapPool().map((r) => r.answer)),
    ].sort((x, y) => x - y);
  }
  return SQGAP_CACHE.answers;
}

/** **130X «심화상»** — 「두 근호가 동시에 자연수가 되는 $n$」. */
export function planSquareGap(rng: Rng): SquareGapPlan {
  const want = pick(rng, squareGapAnswers());
  const sub = squareGapPool().filter((r) => r.answer === want);
  if (sub.length === 0) {
    throw new Error(`m3Top5a 130X: 답 ${want} 에 맞는 씨앗이 없습니다`);
  }
  const { a, b } = pick(rng, sub);
  const candidates = squareGapCandidates(a);
  const hits = squareGapHits(a, b, true);
  if (hits.length < 2 || candidates.length <= hits.length) {
    throw new Error(`m3Top5a 130X: 후보가 모자랍니다 (a=${a}, b=${b})`);
  }
  return {
    a,
    b,
    candidates,
    hits,
    sift: { candidates, kept: hits },
    answer: hits.reduce((t, v) => t + v, 0),
  };
}

function renderSquareGap(rng: Rng): Body {
  const plan = planSquareGap(rng);
  const { a, b, candidates, hits, answer } = plan;
  const rising = [...hits].sort((x, y) => x - y);

  // ⚠️ 조사를 「가」로 붙이면 안 된다 — 「$\sqrt{n+93}$」은 「…구십삼」으로 읽혀 받침이
  //    있다. 근호가 `}` 로 끝나 공용 조사 자가 이 자리를 **구조적으로 못 본다**(읽는 수를
  //    못 찾아 건너뛴다). 그래서 아예 「의 값이」로 적어 판정이 필요 없게 만든다.
  const content =
    `자연수 $n$에 대하여 두 수 $\\sqrt{${a}-n}$, $\\sqrt{n+${b}}$의 값이 모두 ` +
    `자연수이다. 이러한 $n$의 값의 합을 구하시오.`;

  const squares = candidates.map((_, i) => (i + 1) * (i + 1));
  const lines: string[] = [
    `$\\sqrt{${a}-n}$이 자연수이므로 $${a}-n$은 어떤 자연수의 제곱이다.`,
    // ㉴ — 여기서 세운 제약을 아래 열거가 그대로 지킨다.
    `$n$이 자연수이므로 $${a}-n\\le ${a - 1}$이고, 따라서 $${a}-n$이 될 수 있는 ` +
      `값은 $${squares.join("$, $")}$이다.`,
    `이때 $n$의 값은 차례로 ` +
      `$${squares.map((s) => `${a}-${s}=${a - s}`).join("$, $")}$이다.`,
    `이제 각 $n$에 대하여 $n+${b}$의 값이 어떤 자연수의 제곱인지 확인한다.`,
  ];
  candidates.forEach((n, i) => {
    const mark = MARKS[i]!;
    const v = n + b;
    const root = intSqrt(v);
    const head = `${mark} $n=${n}$이면 $n+${b}=${n}+${b}=${v}$이다.`;
    if (root !== null) {
      lines.push(
        `${head} $${v}=${root}^{2}$이므로 $\\sqrt{n+${b}}=${root}$${euroRo(root)} ` +
          `자연수이고, 조건에 맞는다.`,
      );
    } else {
      // ㉯ — 「제곱수가 아니다」로 뛰는 자리의 근거를 **끼인 두 제곱수**로 적는다.
      const lo = Math.floor(Math.sqrt(v));
      lines.push(
        `${head} $${lo}^{2}=${lo * lo}$, $${lo + 1}^{2}=${(lo + 1) * (lo + 1)}$이고 ` +
          `$${lo * lo}<${v}<${(lo + 1) * (lo + 1)}$이므로 $${v}$${iGa(v)} 어떤 ` +
          `자연수의 제곱도 아니고, 조건에 맞지 않는다.`,
      );
    }
  });
  lines.push(
    `따라서 조건을 만족하는 $n$의 값은 $${rising.join("$, $")}$이고, ` +
      `그 합은 $${rising.join("+")}=${answer}$이다.`,
  );

  return {
    content,
    answer: `$${answer}$`,
    solution: lines.join("\n"),
    facts: {
      a,
      b,
      candidateCount: candidates.length,
      hitCount: hits.length,
      x: answer,
    },
    figureSpec: null,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// C. 131X  삼각비의 값의 범위로 두 근 중 하나를 가려내기                  (심화중)
//    3-2 «삼각비» → 우리 소단원 「삼각비의 값」
// ════════════════════════════════════════════════════════════════════════════

export type TrigFn = "sin" | "cos";

/** 후보 하나의 운명 — 살거나, 세 까닭 중 하나로 죽는다. */
export type RootFate = "산다" | "일보다크다" | "음수" | "탄젠트없음";

/**
 * $0^\circ\le A\le 90^\circ$ 에서 $\sin A$(또는 $\cos A$)의 값이 $\dfrac{p}{q}$ 인 각.
 *
 * 유리수인 특수각의 값만 다룬다 — $\sin$ 은 $0$($0^\circ$)·$\dfrac12$($30^\circ$)·
 * $1$($90^\circ$), $\cos$ 은 $0$($90^\circ$)·$\dfrac12$($60^\circ$)·$1$($0^\circ$).
 * 그 밖이면 `null` 이다.
 */
export function specialAngleOf(
  fn: TrigFn,
  p: number,
  q: number,
): number | null {
  if (q <= 0) return null;
  if (p === 0) return fn === "sin" ? 0 : 90;
  if (p === q) return fn === "sin" ? 90 : 0;
  if (2 * p === q) return fn === "sin" ? 30 : 60;
  return null;
}

/**
 * 🔴 **굳힘을 «인자로» 받는 순수 함수** — ㉡ 을 밖에서 재는 통로다.
 *
 * 굳힘이 **둘**이다.
 *   · `useRange` — $0^\circ\le A\le90^\circ$ 이면 $0\le\sin A\le1$ (음수·$1$ 초과가 죽는다)
 *   · `useTan`   — $\tan 90^\circ$ 의 값은 정할 수 없다 ($A=90^\circ$ 가 죽는다)
 *
 * 후보는 늘 둘이다 — $\dfrac12$(사는 쪽)과 `deadNum/deadDen`. 돌려주는 것은
 * **살아남은 근**(기약분수 `[분자, 분모]`)의 목록이다.
 *
 * 🔴 **왜 «각»이 아니라 «근»을 돌려주나** — 첫 판은 각을 돌려줬는데, 그러면
 * `specialAngleOf` 가 $\dfrac43$ 같은 근에 `null` 을 내므로 **굳힘을 꺼도 그 근이
 * 목록에 안 들어와** 「끄면 둘이 산다」가 거짓이 됐다(실측: 죽는 근 42종 가운데
 * 굳힘을 다 꺼도 둘이 사는 것이 **둘**뿐이었다). 그러면 ㉡ 축이 통째로 장식이 된다.
 * 근을 돌려주면 「굳힘이 무엇을 지웠나」가 그대로 드러난다 — 다 끄면 늘 둘이 산다.
 */
export function liveTrigRoots(
  fn: TrigFn,
  deadNum: number,
  deadDen: number,
  useRange: boolean,
  useTan: boolean,
): [number, number][] {
  const out: [number, number][] = [];
  const roots: [number, number][] = [
    [1, 2],
    [deadNum, deadDen],
  ];
  for (const [p, q] of roots) {
    if (useRange && (p < 0 || p > q)) continue;
    if (useTan && specialAngleOf(fn, p, q) === 90) continue;
    out.push([p, q]);
  }
  return out;
}

/** 죽는 까닭 — 「무엇이 이 후보를 지웠나」. */
export function rootFate(fn: TrigFn, p: number, q: number): RootFate {
  if (p < 0) return "음수";
  if (p > q) return "일보다크다";
  if (specialAngleOf(fn, p, q) === 90) return "탄젠트없음";
  return "산다";
}

/**
 * 살아 있는 각에서 $u\,\square^{2}A+v\tan^{2}A$ 의 값.
 *
 * $30^\circ$: $\cos^{2}=\dfrac34$, $\tan^{2}=\dfrac13$ · $60^\circ$: $\sin^{2}=\dfrac34$,
 * $\tan^{2}=3$. 두 자리 다 $4\mid u$, $3\mid v$ 면 값이 자연수다.
 */
export function trigExprValue(angle: number, u: number, v: number): number {
  if (angle === 30) return (3 * u) / 4 + v / 3;
  if (angle === 60) return (3 * u) / 4 + 3 * v;
  throw new Error(`m3Top5a 131X: 다룰 수 없는 각 ${angle}`);
}

/**
 * 죽는 근 — 세 까닭이 **다 나오도록** 손이 아니라 규칙으로 만든다.
 *
 * ⚠️ 「그중 하나」를 손 목록으로 적으면 세는 쪽과 고치는 쪽이 같이 눈이 먼다. 여기서는
 *    분자·분모를 훑어 **기약이고 $\dfrac12$ 이 아닌** 유리수를 전부 만들고, 그 가운데
 *    「범위 밖」이거나 「$90^\circ$ 가 되는 값」만 남긴다.
 */
export function deadRootCandidates(fn: TrigFn): [number, number][] {
  const out: [number, number][] = [];
  for (let den = 1; den <= 3; den += 1) {
    for (let num = -3 * den; num <= 3 * den; num += 1) {
      if (num === 0 && den !== 1) continue;
      if (gcd(num, den) !== 1 && !(num === 0 && den === 1)) continue;
      if (num * 2 === den) continue; // 사는 쪽과 같다
      const fate = rootFate(fn, num, den);
      if (fate === "산다") continue;
      out.push([num, den]);
    }
  }
  return out;
}

export type TrigSeed = {
  fn: TrigFn;
  deadNum: number;
  deadDen: number;
  u: number;
  v: number;
  angle: number;
  answer: number;
};

export type TrigPlan = TrigSeed & {
  /** 이차방정식의 계수 $P t^{2}+Qt+R=0$ */
  coefP: number;
  coefQ: number;
  coefR: number;
  fate: RootFate;
  sift: Sift;
};

/**
 * 쓸 수 있는 씨앗을 프로그램으로 뽑는다.
 *
 * ```
 * u = 4U (U=1..15) · v = 3V (V=1..12)   값이 자연수가 되게 (위 `trigExprValue`)
 * 죽는 근은 위 규칙이 만든 것만          손 목록을 두지 않는다
 * 답이 한 걸음에 안 닿는다               ㉵ — 지면에 적히는 수는 계수·$u$·$v$·$0$·$90$·$2$ 다
 * ```
 *
 * ⚠️ `deadDen` 이 $2$·$3$ 이면 계수가 커지지만 특수각의 값과 헷갈리지는 않는다 —
 *    $\dfrac32$·$-\dfrac13$ 은 $0^\circ$~$90^\circ$ 에서 $\sin$·$\cos$ 이 될 수 없다.
 */
export function trigRootPool(): TrigSeed[] {
  if (TRIG_CACHE.pool) return TRIG_CACHE.pool;
  const out: TrigSeed[] = [];
  for (const fn of ["sin", "cos"] as TrigFn[]) {
    const angle = fn === "sin" ? 30 : 60;
    for (const [deadNum, deadDen] of deadRootCandidates(fn)) {
      const coefP = 2 * deadDen;
      const coefQ = -(2 * deadNum + deadDen);
      const coefR = deadNum;
      for (let bigU = 1; bigU <= 15; bigU += 1) {
        for (let bigV = 1; bigV <= 12; bigV += 1) {
          const u = 4 * bigU;
          const v = 3 * bigV;
          const answer = trigExprValue(angle, u, v);
          const page = [
            0,
            1,
            2,
            90,
            u,
            v,
            Math.abs(coefP),
            Math.abs(coefQ),
            Math.abs(coefR),
            Math.abs(deadNum),
            deadDen,
          ];
          if (oneStepReach(page).has(answer)) continue;
          out.push({ fn, deadNum, deadDen, u, v, angle, answer });
        }
      }
    }
  }
  TRIG_CACHE.pool = out;
  return out;
}

/** 🔴 풀이 낼 수 있는 답 전부(오름차순) — 답을 «고르게» 뽑기 위한 축이다. */
export function trigRootAnswers(): number[] {
  if (!TRIG_CACHE.answers) {
    TRIG_CACHE.answers = [...new Set(trigRootPool().map((r) => r.answer))].sort(
      (x, y) => x - y,
    );
  }
  return TRIG_CACHE.answers;
}

/** **131X «심화중»** — 「삼각비의 값의 범위로 두 근 중 하나를 가려내기」. */
export function planTrigRoot(rng: Rng): TrigPlan {
  const want = pick(rng, trigRootAnswers());
  const sub = trigRootPool().filter((r) => r.answer === want);
  if (sub.length === 0) {
    throw new Error(`m3Top5a 131X: 답 ${want} 에 맞는 씨앗이 없습니다`);
  }
  const seed = pick(rng, sub);
  const live = liveTrigRoots(seed.fn, seed.deadNum, seed.deadDen, true, true);
  if (live.length !== 1 || live[0]![0] !== 1 || live[0]![1] !== 2) {
    throw new Error(
      `m3Top5a 131X: 살아남는 근이 $\\dfrac12$ 하나가 아닙니다 (${live.length}개)`,
    );
  }
  if (specialAngleOf(seed.fn, 1, 2) !== seed.angle) {
    throw new Error(`m3Top5a 131X: 특수각이 어긋납니다 (${seed.angle})`);
  }
  return {
    ...seed,
    coefP: 2 * seed.deadDen,
    coefQ: -(2 * seed.deadNum + seed.deadDen),
    coefR: seed.deadNum,
    fate: rootFate(seed.fn, seed.deadNum, seed.deadDen),
    sift: { candidates: [1, 2], kept: [seed.fn === "sin" ? 1 : 2] },
  };
}

/** 계수 `c` 인 항 — `+3x`·`-x`·`+5`. **앞에 항이 있는 자리**에 쓴다. */
function term(c: number, v: string): string {
  if (c === 0) return "";
  const sign = c > 0 ? "+" : "-";
  const m = Math.abs(c);
  return `${sign}${m === 1 && v !== "" ? "" : m}${v}`;
}

/** 유리수 $\dfrac{p}{q}$ 의 지면 표기 — 분모가 $1$ 이면 분수를 안 쓴다(㉰). */
function ratioTex(p: number, q: number): string {
  if (q === 1) return `${p}`;
  const sign = p < 0 ? "-" : "";
  return `${sign}\\dfrac{${Math.abs(p)}}{${q}}`;
}

function renderTrigRoot(rng: Rng): Body {
  const plan = planTrigRoot(rng);
  const { fn, deadNum, deadDen, u, v, angle, answer, coefP, coefQ, coefR } =
    plan;
  const F = fn === "sin" ? "\\sin" : "\\cos";
  // 묻는 식은 **주어진 것과 다른** 삼각비를 쓴다 — 값을 그대로 옮겨 적는 자리를 안 만든다.
  const G = fn === "sin" ? "\\cos" : "\\sin";

  // 발문의 이차방정식 — $P\square^{2}A+Q\square A+R=0$
  const equation = `${coefP}${F}^{2}A${term(coefQ, `${F} A`)}${term(coefR, "")}=0`;
  // ⚠️ 발문을 「$…$일 때, $…$의 값을 구하시오.」 한 줄로 두면 한글 낱말이 **셋**뿐이라
  //    형제 `08`·`13`(「$\tan 60^\circ\times\tan 45^\circ$의 값을 구하시오.」 — 낱말 둘)과의
  //    겹침이 **0.667** 로 뛴다(실측). 겹침 문턱을 넘긴 것은 내용이 닮아서가 아니라
  //    **양쪽 다 낱말이 거의 없어서**다 — 분모가 작으면 자카드가 부풀어 오른다.
  //    그래서 발문을 두 문장으로 적어 낱말을 여덟으로 늘렸다(실측 최대 겹침 0.25).
  const content =
    `$0^{\\circ}\\le A\\le 90^{\\circ}$인 각 $A$가 이차방정식 $${equation}$을 ` +
    `만족시킨다고 한다. 이러한 각 $A$의 크기를 구한 뒤, ` +
    `$${u}${G}^{2}A+${v}\\tan^{2}A$의 값을 구하시오.`;

  // 인수분해된 꼴 — 상수항이 $0$ 이면 공통인수를 앞으로 뺀다.
  const factored =
    deadNum === 0
      ? `${F} A(${coefP / deadDen}${F} A-1)=0`
      : `(2${F} A-1)(${deadDen === 1 ? "" : deadDen}${F} A` +
        `${deadNum > 0 ? `-${deadNum}` : `+${-deadNum}`})=0`;

  const deadTex = ratioTex(deadNum, deadDen);
  const fnName = fn === "sin" ? "\\sin A" : "\\cos A";

  const deadLine =
    plan.fate === "탄젠트없음"
      ? `${MARKS[0]} $${fnName}=${deadTex}$인 경우: $0^{\\circ}\\le A\\le 90^{\\circ}$` +
        `에서 $A=90^{\\circ}$인데, $\\tan 90^{\\circ}$의 값은 정할 수 없으므로 ` +
        `조건에 맞지 않는다.`
      : plan.fate === "음수"
        ? `${MARKS[0]} $${fnName}=${deadTex}$인 경우: $0^{\\circ}\\le A\\le 90^{\\circ}$` +
          `에서 $${fnName}$의 값은 $0$ 이상 $1$ 이하이므로 그 값이 음수가 될 수는 ` +
          `없다. 따라서 조건에 맞지 않는다.`
        : `${MARKS[0]} $${fnName}=${deadTex}$인 경우: $0^{\\circ}\\le A\\le 90^{\\circ}$` +
          `에서 $${fnName}$의 값은 $0$ 이상 $1$ 이하이므로 그 값이 $1$보다 클 수는 ` +
          `없다. 따라서 조건에 맞지 않는다.`;

  // $30^{\circ}$ 의 $\cos$ 도 $60^{\circ}$ 의 $\sin$ 도 $\dfrac{\sqrt3}{2}$ 라 한 줄이면 된다.
  const gTex = `$${G} ${angle}^{\\circ}=\\dfrac{\\sqrt{3}}{2}$이므로 $${G}^{2}A=\\dfrac{3}{4}$`;
  const tanTex =
    angle === 30
      ? `$\\tan ${angle}^{\\circ}=\\dfrac{\\sqrt{3}}{3}$이므로 $\\tan^{2}A=\\dfrac{1}{3}$`
      : `$\\tan ${angle}^{\\circ}=\\sqrt{3}$이므로 $\\tan^{2}A=3$`;
  const gPart = (3 * u) / 4;
  const tanPart = angle === 30 ? v / 3 : 3 * v;
  const gShow = `${u}\\times\\dfrac{3}{4}`;
  const tanShow = angle === 30 ? `${v}\\times\\dfrac{1}{3}` : `${v}\\times 3`;

  const lines = [
    `주어진 식의 좌변을 인수분해하면 $${factored}$이다.`,
    `따라서 $${fnName}=\\dfrac{1}{2}$ 또는 $${fnName}=${deadTex}$이다.`,
    deadLine,
    `${MARKS[1]} $${fnName}=\\dfrac{1}{2}$인 경우: $0^{\\circ}\\le A\\le 90^{\\circ}$` +
      `이므로 $A=${angle}^{\\circ}$이다.`,
    `${gTex}이고, ${tanTex}이다.`,
    `따라서 $${u}${G}^{2}A+${v}\\tan^{2}A=${gShow}+${tanShow}=` +
      `${gPart}+${tanPart}=${answer}$이다.`,
  ];

  return {
    content,
    answer: `$${answer}$`,
    solution: lines.join("\n"),
    facts: { u, v, angle, deadNum, deadDen, x: answer },
    figureSpec: null,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// D. 132X  안 정해지는 두 호를 구하지 않고 두 원주각의 합 구하기           (심화중)
//    3-2 «원주각» → 우리 소단원 「원주각」
// ════════════════════════════════════════════════════════════════════════════

/**
 * 🔴 **처음 설계는 형제와 «같은 문항»이었다** — 반드시 남겨 둘 기록이다.
 *
 * 첫 판은 「네 점 $A$, $B$, $C$, $D$ 가 이 순서로 있고 두 현 $AC$, $BD$ 의 교점이 $P$.
 * 호 $AB$ 가 둘레의 $\dfrac1m$, 호 $CD$ 가 $\dfrac1n$ 일 때 $\angle APB$」였다.
 * 그런데 이미 등록된 형제 **`3-2|원주각|09`(심화하)** 가 **글자 그대로 그 문항**이다
 * (호 $AB$ 가 원주의 $\dfrac19$, 호 $CD$ 가 $\dfrac1{10}$ → $\angle APB$).
 *
 * ⚠️ **한글 낱말 겹침은 이것을 못 잡았다** — 실측 $0.190$ 으로 문턱($0.35$) 한참
 *    아래였다. 내가 「원주의」를 「둘레의 길이의」로, 「순서대로」를 「순서로」로 적어서다.
 *    **열쇠가 낱말이면 같은 문항을 다르게 적기만 해도 «안 닮았다»가 나온다.**
 *    잡아 준 것은 판정기가 아니라 **형제 지면을 전부 찍어 눈으로 읽은 것**이다.
 *    그래서 이 갈래의 시험은 겹침 수치와 **함께** 형제 발문을 뽑아 놓는다.
 */

/**
 * 🔴 **굳힘을 «인자로» 받는 순수 함수** — ㉡ 을 밖에서 재는 통로다.
 *
 * 원 위의 다섯 점 $A$, $B$, $C$, $D$, $E$ 가 이 순서로 있을 때 다섯 원주각
 * $\angle ACB$, $\angle BDC$, $\angle CED$, $\angle DAE$, $\angle EBA$ 는 각각
 * 호 $AB$, $BC$, $CD$, $DE$, $EA$ 에 대한 원주각이고, 그 다섯 호를 모두 합하면
 * **원 전체**라 중심각의 합이 $360^{\circ}$ 다. 따라서 다섯 원주각의 합은 늘
 * $180^{\circ}$ 이고, 앞 셋이 주어지면 **나머지 둘의 합**이 정해진다 — 각각은
 * 정해지지 않는데도.
 *
 * `useHalf` 를 끄면 「원주각은 중심각의 반」을 안 쓴 셈이 되어 답이 두 배가 된다.
 */
export function remainingInscribedSum(
  p: number,
  q: number,
  r: number,
  useHalf: boolean,
): number {
  const rest = 360 - 2 * (p + q + r);
  return useHalf ? rest / 2 : rest;
}

export type CircleSeed = { p: number; q: number; r: number; answer: number };

export type CirclePlan = CircleSeed & {
  /** 주어진 세 원주각에 대응하는 중심각 */
  arcs: [number, number, number];
  /** 남은 두 호에 대한 중심각의 합 */
  restCentral: number;
};

/**
 * 쓸 수 있는 $(p,q,r)$ 을 프로그램으로 뽑는다.
 *
 * ```
 * 10 ≤ p, q, r ≤ 60          교과서에서 보는 크기. 수를 키우는 것은 난이도가 아니다
 * p ≤ q ≤ r                  같은 세 값의 순서만 다른 판을 겹쳐 세지 않는다
 * 20 ≤ 답 ≤ 140              남은 두 호가 **각각** 있어야 하므로 답 $>0$ 이고,
 *                            너무 크면 앞 세 각이 뭉개진다
 * 답이 한 걸음에 안 닿는다      ㉵ — 지면에 적히는 수는 $p$, $q$, $r$ 이다
 * ```
 *
 * ⚠️ **$180$ 은 발문에 안 적힌다.** 그래서 「$180$ 에서 세 수를 뺀다」는 것 자체가
 *    이 문항이 요구하는 굳힘이고, 지름길 자는 그 수를 모른다.
 */
export function circleCrossPool(): CircleSeed[] {
  if (CIRCLE_CACHE.pool) return CIRCLE_CACHE.pool;
  const out: CircleSeed[] = [];
  for (let p = 10; p <= 60; p += 1) {
    for (let q = p; q <= 60; q += 1) {
      for (let r = q; r <= 60; r += 1) {
        const answer = remainingInscribedSum(p, q, r, true);
        if (answer < 20 || answer > 140) continue;
        if (oneStepReach([0, 1, 2, p, q, r]).has(answer)) continue;
        out.push({ p, q, r, answer });
      }
    }
  }
  CIRCLE_CACHE.pool = out;
  return out;
}

/** 🔴 풀이 낼 수 있는 답 전부(오름차순) — 답을 «고르게» 뽑기 위한 축이다. */
export function circleCrossAnswers(): number[] {
  if (!CIRCLE_CACHE.answers) {
    CIRCLE_CACHE.answers = [
      ...new Set(circleCrossPool().map((r) => r.answer)),
    ].sort((x, y) => x - y);
  }
  return CIRCLE_CACHE.answers;
}

/** **132X «심화중»** — 「안 정해지는 두 호를 구하지 않고 두 원주각의 합」. */
export function planCircleCross(rng: Rng): CirclePlan {
  const want = pick(rng, circleCrossAnswers());
  const sub = circleCrossPool().filter((r) => r.answer === want);
  if (sub.length === 0) {
    throw new Error(`m3Top5a 132X: 답 ${want} 에 맞는 씨앗이 없습니다`);
  }
  const { p, q, r, answer } = pick(rng, sub);
  return {
    p,
    q,
    r,
    arcs: [2 * p, 2 * q, 2 * r],
    restCentral: 360 - 2 * (p + q + r),
    answer,
  };
}

function renderCircleCross(rng: Rng): Body {
  const plan = planCircleCross(rng);
  const { p, q, r, arcs, restCentral, answer } = plan;
  const sum = p + q + r;

  const content =
    `원 $O$의 둘레 위에 다섯 점 $A$, $B$, $C$, $D$, $E$가 이 차례로 놓여 있다. ` +
    `$\\angle ACB=${p}^{\\circ}$, $\\angle BDC=${q}^{\\circ}$, ` +
    `$\\angle CED=${r}^{\\circ}$일 때, $\\angle DAE$와 $\\angle EBA$의 크기의 합을 ` +
    `구하시오.`;

  const lines = [
    `$\\angle ACB$는 호 $AB$에 대한 원주각이고, $\\angle BDC$는 호 $BC$에 대한 ` +
      `원주각이며, $\\angle CED$는 호 $CD$에 대한 원주각이다.`,
    `또 $\\angle DAE$는 호 $DE$에 대한 원주각이고, $\\angle EBA$는 호 $EA$에 대한 ` +
      `원주각이다.`,
    `한 호에 대한 중심각의 크기는 그 호에 대한 원주각의 크기의 두 배이므로, ` +
      `세 호 $AB$, $BC$, $CD$에 대한 중심각의 크기는 차례로 ` +
      `$2\\times ${p}^{\\circ}=${arcs[0]}^{\\circ}$, $2\\times ${q}^{\\circ}=` +
      `${arcs[1]}^{\\circ}$, $2\\times ${r}^{\\circ}=${arcs[2]}^{\\circ}$이다.`,
    `호 $DE$와 호 $EA$의 길이는 각각 하나로 정해지지 않는다. 그러나 다섯 점이 이 ` +
      `차례로 놓여 있으므로 다섯 호 $AB$, $BC$, $CD$, $DE$, $EA$를 모두 이으면 원 ` +
      `전체가 되고, 그 중심각의 합은 $360^{\\circ}$이다.`,
    `따라서 호 $DE$와 호 $EA$에 대한 중심각의 크기의 합은 ` +
      `$360^{\\circ}-(${arcs[0]}^{\\circ}+${arcs[1]}^{\\circ}+${arcs[2]}^{\\circ})=` +
      `360^{\\circ}-${2 * sum}^{\\circ}=${restCentral}^{\\circ}$이다.`,
    `$\\angle DAE$와 $\\angle EBA$는 각각 그 두 호에 대한 원주각이므로 두 각의 크기의 ` +
      `합은 두 중심각의 크기의 합의 반이다.`,
    `그러므로 $\\angle DAE+\\angle EBA=${restCentral}^{\\circ}\\div 2=${answer}^{\\circ}$이다.`,
  ];

  return {
    content,
    answer: `$${answer}^{\\circ}$`,
    solution: lines.join("\n"),
    facts: { p, q, r, restCentral, x: answer },
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

export const M3_TOP_5A: TypeEntry[] = [
  def(
    BOOK1,
    MINOR.이차활용,
    "129X",
    "연속하는 자연수의 합으로 나타낼 때 더하는 개수를 모두 구하기",
    SEC.이차활용,
    "심화상",
    renderConsecutiveSum,
  ),
  def(
    BOOK1,
    MINOR.제곱근,
    "130X",
    "두 근호가 동시에 자연수가 되는 수를 모두 찾기",
    SEC.제곱근,
    "심화상",
    renderSquareGap,
  ),
  def(
    BOOK2,
    MINOR.삼각비,
    "131X",
    "삼각비의 값의 범위로 두 근 중 하나를 가려내기",
    SEC.삼각비값,
    "심화중",
    renderTrigRoot,
  ),
  def(
    BOOK2,
    MINOR.원주각,
    "132X",
    "안 정해지는 두 호를 구하지 않고 두 원주각의 크기의 합 구하기",
    SEC.원주각,
    "심화중",
    renderCircleCross,
  ),
];

/** 🔴 리드가 브리프에 적은 소단원 이름 — **정본에 없다**(머리말 ⑴). 시험이 못 박는다. */
export const BRIEF_SECTION_NAMES = [
  "이차방정식의 활용",
  "제곱근의 뜻과 성질",
  "삼각비의 값",
  "원주각의 성질",
] as const;
