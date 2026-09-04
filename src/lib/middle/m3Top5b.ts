/**
 * 중3 **확대 갈래 5차 물결 (갈래 b)** — `심화중`·`심화상`, D-116, 번호 접미사 **`X`**.
 *
 * 병렬 세션 소유 모듈. 이 파일과 `generate.ts` 의 `...M3_TOP_5B` **한 줄**만 이 갈래가
 * 건드린다(등록 한 줄은 리드가 넣는다). 21갈래가 동시에 도는 물결이라 새 파일 하나 +
 * spread 한 줄이면 병합 충돌도, 「유형이 정확히 N개」 가드도 둘 다 피한다.
 *
 * ## ⑴ 맡은 소단원 셋 — 이름은 **정본에서 확인했다**
 *
 * `prisma/seed-data/units.ts` 2970·2983·2990 행에 「삼각비의 활용」·「원의 접선」·
 * 「원주각의 활용」이 그대로 있다. RPM 중단원 이름은 **둘이 다르다** —
 * 「원의 접선」의 RPM 중단원은 **「원과 직선」**이고(`m3Tangent.ts:33`), 나머지 둘은
 * 소단원 이름과 같다. 손으로 적으면 어긋나므로 시험이 정본과 글자 그대로 대조한다.
 *
 * ## ⑵ 무엇이 «중»이고 무엇이 «상»인가 (D-116 ⑵ · `m3Top4.ts` 머리말과 한 벌)
 *
 * ```
 * 심화중   마디 하나가 안 굳고, **그 소단원의 개념**이 그것을 굳힌다.
 *          성질 하나가 후보를 «끝까지 계산하지 않고» 거른다.
 * 심화상   성질로 못 굳혀 후보를 **다 만들어 견줘야** 한다.
 * ```
 *
 * | 키 | 갈래 | 안 굳는 마디 | 무엇이 굳히나 | 같은 소단원 형제와 무엇이 다른가 |
 * |---|---|---|---|---|
 * | `삼각비의 활용\|144X` | **심화상** | $\overline{AD}$ 와 $\overline{AE}$ — 곱만 정해지고 각각은 안 정해진다 | 굳지 **않는다.** 「곱이 $N$」은 후보(=$N$ 의 약수)를 **만들어 줄 뿐**이고, 어느 약수가 사는지는 짝 $y=N\div x$ 를 **실제로 구해** 「점 $E$ 가 변 $AC$ 위에 있나」를 하나씩 대 봐야 갈린다 | `08`·`09`(삼각형의 넓이)는 두 변과 끼인각이 **다 주어져** 공식에 넣으면 끝이고 후보가 없다. `11`·`12`(평행사변형·사각형의 넓이)도 마찬가지다 |
 * | `원의 접선\|145X` | **심화중** | 내접원의 반지름 $r$ — 발문이 값도 범위도 안 준다 | 이 소단원의 개념 둘. ⓐ 「원 밖의 한 점에서 그은 두 접선의 길이는 같다」가 세 변을 $r$ 하나로 적게 하고 ⓑ 「접점에서 반지름은 접선과 수직」이 사각형 $OECF$ 를 정사각형으로 굳혀 $\overline{CE}=\overline{CF}=r$ 를 준다. 그러면 이차방정식이 서고, 「반지름은 양수」가 두 근 중 하나를 **계산 없이** 지운다 | `13`(직각삼각형의 내접원)은 **세 변의 길이가 다 주어져** $r=\dfrac{a+b-c}{2}$ 한 줄이면 끝이다. 여기서는 세 변이 하나도 안 주어진다 |
 * | `원주각의 활용\|146X` | **심화상** | $\angle P$ 와 $\angle Q$ — 곱만 주어진다 | 굳지 **않는다.** 약수쌍이 후보를 만들어 줄 뿐이고, 「네 내각이 자연수」(→ $x+y$ 가 짝수)와 「$\angle BAD\ge1^{\circ}$」(→ $x+y\le178$)를 쌍마다 **대 봐야** 산 것과 죽은 것이 갈린다 | `02`·`03`(원에 내접하는 사각형의 성질)은 각이 하나씩 주어져 대각의 합만 쓰면 끝이고, `05`·`06`(성질의 응용)도 경우가 하나뿐이다 |
 *
 * 🔴 **`144X` 와 `146X` 는 뼈대가 닮았다** — 둘 다 「곱이 주어진 두 수 → 약수(쌍)
 * 전수 → 조건으로 거르기 → 살아남은 것의 합」이다. 정직하게 적어 둔다. 가르는 것은
 * ⓐ 거르는 **성질이 다르고**(구간 $N\div b\le x\le c$ / 홀짝과 $x+y\le178$),
 * ⓑ 후보의 **모양이 다르고**(약수 하나 / 약수쌍), ⓒ 굳힘이 죽이는 **자리가 다르다**
 * 는 것이다 — `146X` 의 홀짝은 목록의 앞·중간·뒤에 **흩어져** 죽지만(㉠ 이 실제로
 * 일한다), `144X` 의 구간은 목록의 **양 끝**에서 죽는다. 시험이 둘 다 센다.
 *
 * ## ⑶ 🔴 앞 물결들이 **실제로 낸 결함** — 이 셋은 이렇게 막았다
 *
 * 전부 **값은 맞고 KaTeX 도 초록**이라 어느 자도 구조적으로 못 보던 부류다.
 *
 * ㉮ **해설이 정답지 한 단(964.8px)을 넘었다**(3차 중1 `53V`, 1242px). 넘치면 잘리는 게
 *    아니라 **같은 쪽 다른 문항의 해설이 통째로 사라진다.** 제품 `estimateSolutionPx`
 *    로 **씨앗 600판 이상**을 재어 **700px 미만**을 시험이 못 박는다. 그렇다고 걸음을
 *    지우지 않는다(D-116 ⑹) — 줄이는 길은 **훑는 후보 수를 줄이는 것**이라
 *    `144X` 는 약수를 $4$~$6$ 개, `146X` 는 약수쌍을 $3$~$5$ 개로 창에서 미리 자른다.
 * ㉯ **해설이 걸음을 건너뛰었다**(3차 중2 `38V` — 「$22-2x\ge1$에서 $x\le10$」인데 참
 *    해는 $x\le10.5$). 자연수로 뛰는 자리마다 **그 자리에서** 근거를 적는다.
 *    `146X` 는 「$a$ 가 자연수이므로 $x+y$ 는 짝수」와 「$a\ge1$ 에서 $x+y\le178$」을
 *    한 줄씩 세우고, 죽는 쌍마다 **어느 조건에 걸렸는지**를 적는다.
 * ㉰ **해설이 기약이 아닌 분수를 찍었다**(3차 중1 `52V`, `$\dfrac{50}{4}$`).
 *    이 셋의 지면에 나오는 정수 분수는 $\dfrac{1}{2}$ 와 발문의 $\dfrac{1}{k}$ 뿐이고
 *    **둘 다 이미 기약**이다(분모 $\ne1$). 시험이 지면의 모든 `dfrac{정수}{정수}` 를
 *    훑어 기약인지 보고 **찾은 자리 수도 같이 찍는다**($0$ 은 「깨끗」과 「못 셈」을
 *    안 가른다).
 * ㉱ **발문이 스스로 못 박은 상한을 오답이 넘었다**(4차 중2 `37W`). 셋 다 「전체를
 *    $1$ 로 놓고」류의 상한을 **선언하지 않는다** — 공용 `declaredUpperBound(content)`
 *    가 전 표본에서 `null` 임을 시험이 찍고, 그 함수가 «있다»도 낼 수 있음을 양성
 *    대조로 같이 보인다(0 이 「못 셈」이 아님을 증명한다).
 * ㉲ **정답이 «구간»이면 파생 오답이 뒤집힌다**(3차 중2 `35V`). 셋 다 정답이 **한 수**다.
 * ㉳ **해설의 «말»을 지키는 시험이 없었다**(4차 중1 10줄·중2 3줄이 무방비). 시험이
 *    논리 낱말(자연수/유리수 · 같다/다르다 · 크다/작다 · 양수/음수 · 짝수/홀수 ·
 *    내대각/맞각)을 맞바꿔 보고, **양성·음성 눈금**을 같이 둔다.
 * ㉴ **지면이 자기가 한 줄 앞에 세운 제약을 스스로 어긴다**(4차 중3 `55W`, 100%).
 *    이 셋은 제약을 세운 뒤 **그 제약 안에서만** 훑는다 — `145X` 는 「$r>0$」을
 *    말한 뒤 음수 근을 다시 쓰지 않고, `146X` 는 「$x\le y$ 만 따지면 된다」의 근거를
 *    **그 자리에서** 말한 뒤 그 범위만 훑는다.
 * ㉵ **자료를 정렬해 찍으면 «보이는 자리»가 순위를 암시한다**(4차 중1 `63W`, 100%).
 *    셋 다 지면에 «자료 목록»을 안 늘어놓는다. 나열하는 것은 **약수·약수쌍**이고
 *    그것은 오름차순이 정본이다(순위 암시가 아니라 빠짐을 막는 순서다).
 * ㉶ **D-20 손실 원장이 재현 불가였다**(4차 중1 `62W`). 아래 풀 함수마다 가드를
 *    **하나만** 껐을 때의 전수를 적고, 시험이 그 수를 **다시 세어** 대조한다.
 * ㉷ **내보낸 순수 함수의 주석이 코드와 어긋났다**(4차 중3 `solveBoxCases`).
 *    단언을 적은 자리는 시험이 그 단언을 **물게** 했다.
 * ㉸ 우리말 — 「그중」은 붙여 쓴다. 조사는 지면에 **찍히는 글자**로 정한다.
 *
 * ## ⑷ 함정 ㉠㉡㉢
 *
 * ㉠ **창을 한쪽 끝만 주면 굳힘이 장식이 된다.**
 *    · `144X` — 답이 **살아남은 것 전부의 합**이라 목록의 어느 자리도 답이 아니다.
 *      정직하게 적는다: 구간 굳힘이라 **죽는 것은 목록의 양 끝**에 몰린다. 그러나
 *      ⓐ 어느 끝에서 몇 개가 죽는지는 $N\div b$ 와 $c$ 를 **실제로 견줘야** 알고
 *      ⓑ 답이 합이라 한 자리만 봐서는 못 얻는다.
 *    · `145X` — **후보 목록이 아예 없다**(값이 하나로 굳는다). 이차방정식의 두 근을
 *      «후보»로 내보이면 **양수 근이 언제나 큰 쪽**이라 `edgeScore.maxHit` 가 $1$ 이
 *      되어 「극단만 집으면 맞는다」로 찍힌다 — 그건 이 설계의 사실이지 결함이 아니다.
 *      그래서 이 갈래는 `Sift` 를 **안 내보낸다.** 대신 굳힘을 **인자로 받는 순수
 *      함수**(`solveIncircleRadius`)로 재고, 시험이 이 갈래에 대해 ㉠ 을
 *      **«잴 축 없음»으로 따로 찍는다**(4차 `56W` 와 같은 처방).
 *    · `146X` — 홀짝 굳힘은 목록의 **앞·중간·뒤에 흩어져** 죽는다. 시험이
 *      「죽는 자리가 늘 같은 색인이 아니다」를 전 씨앗에서 센다.
 *
 * ㉡ **「굳힘이 항등식」** — 굳힘을 지우고 같은 씨앗으로 돌려 답이 그대로면 장식이다.
 *    셋 다 굳힘을 **인자로 받는 순수 함수**로 뽑아 두었다:
 *    `solveSegmentDivisors(n, b, c, useSegD, useSegE)` ·
 *    `solveIncircleRadius(p, q, usePositive)` ·
 *    `solveAnglePairs(m, useParity, useRange)`.
 *    시험이 그 인자를 흔들어 답이 실제로 달라지는지 잰다.
 *
 * ㉢ **갈래끼리 겹침** — 새 갈래가 그 소단원의 `심화하`·`응용` 과 한 시험지에 실린다.
 *    「수+정답」 열쇠에는 천장이 있으므로 쌍마다 천장을 먼저 찍고, 천장이 낮으면
 *    «겹침 없음»이 아니라 **«판정 불가»** 로 읽는다.
 *
 * ## ⑸ 번호 규약 — **`X` 접미사**
 *
 * `extensionNumberReason`(`src/__tests__/helpers/rpmCatalog.ts`)은 `숫자+영문 대문자
 * 한 글자` 를 「색인 번호와 절대 안 겹친다」로 통과시킨다. 5차 물결은 **`X`** 다.
 * 리드가 갈래마다 번호대를 나눠 주었고(`144`·`145`·`146`), 그 수는 세 중단원의 색인
 * 최댓값($14$·$16$·$14$)보다 크므로 글자를 떼도 안 겹친다.
 *
 * ## 계약 (이웃 모듈과 한 벌)
 *
 * 1. **정답을 먼저 뽑고 발문을 역산한다**(㉴ 정답 쏠림).
 * 2. `facts.x` 가 **답의 첫 수**다.
 * 3. 숫자는 전부 `$...$` 안에 (`elementary/rules` `bareNumbers` 가드).
 * 4. `attempt`·`pick` 이 낼 것이 없으면 **던진다** — 조용히 기본값을 내지 않는다.
 * 5. 그림이 없으므로 발문이 **지면을 가리키지 않는다**(`figureSpec: null`,
 *    `pointsAtFigure` 가 `null`). 셋 다 점의 이름과 위치를 **글로 다 적어** 그림
 *    없이 완결된다.
 * 6. 🔴 **해설이 걸음을 건너뛰지 않는다**(D-116 ⑸). 후보를 견주는 둘은 후보를
 *    하나씩 적고 각각 왜 살고 죽는지까지 적는다.
 *
 * ## 왜 «설계»를 `plan…()` 으로 따로 내보내나 — 없는 축은 변이시킬 수 없다
 *
 * ㉠·㉡ 을 **밖에서 재려면** 「후보 집합」과 「굳힘이 남긴 것」이 문항 밖에 있어야
 * 한다. 발문·해설 문자열만 내보내면 그 축이 아예 없어서 변이시킬 수도 없다. 그래서
 * 유형마다 순수 설계 함수를 export 하고, 발문·해설은 그 설계를 **읽기만** 한다.
 */
import { pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { eulReul, euroRo, waGwa } from "./m2Josa";
import type { Sift } from "./m3Top";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중3";
const BOOK = "3-2";

/** 우리 `Unit.section` 정확한 이름 (`prisma/seed-data/units.ts` 2970·2983·2990 실측). */
const SEC = {
  삼각비활용: "삼각비의 활용",
  원의접선: "원의 접선",
  원주각활용: "원주각의 활용",
} as const;

/**
 * RPM 중단원 이름 — 이웃 모듈(`m3Trig`·`m3Tangent`·`m3AngleApply`)이 쓰는 글자 그대로.
 *
 * ⚠️ 「원의 접선」의 RPM 중단원은 **「원과 직선」**이다(`m3Tangent.ts:33`).
 *    소단원 이름을 그대로 적으면 색인 조회가 «없는 중단원» 으로 떨어진다.
 */
const MINOR = {
  삼각비활용: "삼각비의 활용",
  원과직선: "원과 직선",
  원주각활용: "원주각의 활용",
} as const;

type Body = Pick<
  MidProblem,
  "content" | "answer" | "solution" | "facts" | "figureSpec"
>;

/** 후보를 하나씩 짚는 표지. 훑는 후보가 최대 여섯이라 여덟까지 둔다. */
const MARKS = ["㉠", "㉡", "㉢", "㉣", "㉤", "㉥", "㉦", "㉧"] as const;

/**
 * 🔴 **풀을 «적재할 때»가 아니라 «처음 쓸 때» 만든다.**
 *
 * `generate.ts` 가 이 모듈을 import 하므로, 풀을 최상위 `const` 로 두면 **중등 엔진을
 * 건드리는 모든 시험 파일**이 그 값을 치른다. 게으르게 만들면 실제로 이 갈래를 뽑는
 * 파일만 한 번 치른다. 함수는 순수(입력 없음·같은 결과)라 캐시가 뜻을 안 바꾸고,
 * 변이 하네스는 프로세스를 새로 띄우므로 캐시가 변이를 가리지 않는다.
 */
const SEG_CACHE: { pool?: SegSeed[]; answers?: number[] } = {};
const INC_CACHE: { pool?: IncSeed[]; answers?: number[] } = {};
const ANG_CACHE: { pool?: AngSeed[]; answers?: number[] } = {};

// ── 공용 셈 연장 ────────────────────────────────────────────────────────────

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

/** 약수쌍 $(d,\,n/d)$ ($d\le n/d$) 오름차순. */
export function divisorPairsOf(n: number): [number, number][] {
  return divisorsOf(n)
    .filter((d) => d * d <= n)
    .map((d) => [d, n / d] as [number, number]);
}

/**
 * 🔴 **㉵ — 발문에 적힌 수에서 «한 걸음»에 닿는 값 전부**(부호 양쪽).
 *
 * 3차 `51V` 는 「적힌 수 하나 집기」를 막아 놓고 「적힌 두 수를 **한 번 나눈** 값」을
 * 57.1% 놓쳤다. 그래서 네 셈(＋−×÷)을 **전부** 센다. 나눗셈은 나누어떨어지는
 * 것만 — 지면에서 학생이 암산으로 얻는 값만 세려는 것이다.
 *
 * ⚠️ 이 함수 **하나**를 셋이 같이 쓴다. 유형마다 다시 적으면 한쪽만 고쳐도 아무도
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
// A. 144X  넓이의 비가 주어질 때 두 변 위의 점까지의 길이 모두 구하기     (심화상)
//    3-2 «삼각비의 활용» → 우리 소단원 「삼각비의 활용」
// ════════════════════════════════════════════════════════════════════════════

/**
 * 발문이 쓰는 $\angle A$ — 값은 **답에 영향을 주지 않는다.**
 *
 * $\triangle ADE$ 와 $\triangle ABC$ 가 $\angle A$ 를 공유하므로 넓이의 비에서
 * $\sin$ 값이 약분된다. 그것이 이 유형의 «접기»다. 둔각(**$120$·$135$·$150$**)을
 * 섞어 두는 이유는 그 자리에서 $\sin(180^{\circ}-A)$ 로 바꾸는 걸음(RPM `09`)이
 * 실제로 나오게 하려는 것이다.
 */
const SEG_ANGLES = [30, 45, 60, 120, 135, 150] as const;

/**
 * 🔴 **굳힘을 «인자로» 받는 순수 함수** — ㉡ 을 밖에서 재는 통로다.
 *
 * $\overline{AD}=x$, $\overline{AE}=y$ 라 하면 $\triangle ADE:\triangle ABC=xy:bc$
 * 이므로 $xy=n$ ($n=bc\div k$) 이다. 후보는 $n$ 의 약수 **전부**다.
 *
 * 굳힘이 **둘**이다.
 *   · `useSegD` — 점 $D$ 가 변 $AB$ 위에 있어야 하므로 $x\le c$
 *   · `useSegE` — 점 $E$ 가 변 $AC$ 위에 있어야 하므로 $y=n\div x\le b$
 *
 * 돌려주는 것은 **살아남은 $x$ 의 목록**(오름차순)이다.
 *
 * 🔴 **둘이 동시에 죽는 약수는 없다** — $x>c$ 이고 $y>b$ 이면 $n=xy>bc$ 인데
 *    $n=bc\div k$ 이고 $k\ge2$ 라 $n<bc$ 이기 때문이다. 이 단언은 아래 `renderSegmentRatio`
 *    가 **실제로 던져서** 지키고, 시험이 그 던짐을 확인한다(단언을 적었으면 시험이
 *    물게 한다 — 4차 ㉷).
 */
export function solveSegmentDivisors(
  n: number,
  b: number,
  c: number,
  useSegD: boolean,
  useSegE: boolean,
): number[] {
  const out: number[] = [];
  for (const x of divisorsOf(n)) {
    if (useSegD && x > c) continue;
    if (useSegE && n / x > b) continue;
    out.push(x);
  }
  return out;
}

export type SegSeed = {
  /** $\overline{AC}$ */
  b: number;
  /** $\overline{AB}$ */
  c: number;
  /** 넓이의 비 $\dfrac{1}{k}$ */
  k: number;
  /** $xy$ 의 값 = $bc\div k$ */
  n: number;
  kept: number[];
  answer: number;
};

export type SegPlan = SegSeed & {
  /** 발문에 적히는 $\angle A$ — 답과 무관하다 */
  angle: number;
  /** $n$ 의 약수 전부(후보) */
  candidates: number[];
  sift: Sift;
};

/**
 * 쓸 수 있는 $(b,\,c,\,k)$ 를 **프로그램으로 뽑는다** — 손 목록은 세는 쪽과 고치는
 * 쪽을 같이 눈멀게 한다(2026-08-18). 조건마다 까닭이 있다.
 *
 * ```
 * 5 ≤ b, c ≤ 30 · 2 ≤ k ≤ 9   수를 키우는 것은 난이도가 아니다 (D-115 ⑽③)
 * 약수 4~6개                   ㉮ 해설이 정답지 한 단을 넘지 않게 (나열이 곧 해설 길이다)
 * 사는 것 2~4개                하나뿐이면 「모두 구하고 합」이 말이 안 된다
 * 죽는 것 ≥2                   굳힘이 «일할 자리»가 있어야 한다 (㉡)
 * 답이 한 걸음에 안 닿는다       ㉵ — 적힌 수는 $\angle A$·$b$·$c$·$k$ 와 $1$, $2$, $180$
 * ```
 *
 * 🔴 **D-20 손실 원장**(실측 2026-09-04, `scripts` 없이 이 파일의 함수만으로 다시 센다).
 * $(b,c,k)$ 격자 $26\times26\times8=5{,}408$ 벌 가운데 $k$ 가 $bc$ 를 나누는 것이
 * **$2{,}367$** 벌이고, 그것이 분모다. 각 줄은 **그 가드 «하나만»** 켠 값이다.
 *
 * ```
 * 분모 (k | bc)                       2,367
 * 약수 4~6개만                        2,367 → 1,048
 * 사는 것 2~4개만                     2,367 → 1,535
 * 죽는 것 ≥2개만                      2,367 → 2,161
 * ㉵ 지름길만                         2,367 →   710
 * 넷 다 걸면                          2,367 →   160   (남는 답 27 종)
 * ```
 *
 * ⚠️ **㉵ 가 혼자서 $70\%$ 를 버린다** — 각 여섯을 **전부** 열쇠에 넣기 때문이다.
 *    지면에는 그중 하나만 찍히지만, 풀을 각과 **무관하게** 만들려면 여섯 다 막아야
 *    한다(각은 답에 영향이 없으므로 씨앗을 고른 뒤에 뽑는다). 필요보다 센 가드이고,
 *    센 쪽으로 틀리는 것을 골랐다.
 *
 * 시험이 이 다섯 수를 **다시 세어** 대조한다 — 4차 중1 `62W` 는 원장의 수가 가드
 * 조합 어디에도 없었고 손실을 절반으로 줄여 적고 있었다(㉶).
 */
export function segmentRatioPool(): SegSeed[] {
  if (SEG_CACHE.pool) return SEG_CACHE.pool;
  const out: SegSeed[] = [];
  for (let b = 5; b <= 30; b += 1) {
    for (let c = 5; c <= 30; c += 1) {
      for (let k = 2; k <= 9; k += 1) {
        if ((b * c) % k !== 0) continue;
        const n = (b * c) / k;
        const cand = divisorsOf(n);
        if (cand.length < 4 || cand.length > 6) continue;
        const kept = solveSegmentDivisors(n, b, c, true, true);
        if (kept.length < 2 || kept.length > 4) continue;
        if (cand.length - kept.length < 2) continue;
        const answer = kept.reduce((t, v) => t + v, 0);
        if (oneStepReach([1, 2, 180, k, b, c, ...SEG_ANGLES]).has(answer))
          continue;
        out.push({ b, c, k, n, kept, answer });
      }
    }
  }
  SEG_CACHE.pool = out;
  return out;
}

/**
 * 🔴 **풀이 낼 수 있는 답 전부**(오름차순) — 답을 «고르게» 뽑기 위한 축이다(㉴).
 *
 * 3차 `52V` 는 풀에서 그냥 하나를 뽑아 **최빈 정답이 51.2%** 였다. 여기서는 답을
 * 먼저 고르고 그 답을 내는 씨앗만 다시 뽑는다.
 */
export function segmentAnswers(): number[] {
  if (!SEG_CACHE.answers) {
    SEG_CACHE.answers = [
      ...new Set(segmentRatioPool().map((r) => r.answer)),
    ].sort((x, y) => x - y);
  }
  return SEG_CACHE.answers;
}

/** **144X «심화상»** — 「넓이의 비가 $\dfrac1k$ 일 때 $\overline{AD}$ 를 모두」. */
export function planSegmentRatio(rng: Rng): SegPlan {
  const want = pick(rng, segmentAnswers());
  const sub = segmentRatioPool().filter((r) => r.answer === want);
  if (sub.length === 0) {
    throw new Error(`m3Top5b 144X: 답 ${want} 에 맞는 씨앗이 없습니다`);
  }
  const seed = pick(rng, sub);
  const angle = pick(rng, [...SEG_ANGLES]);
  const candidates = divisorsOf(seed.n);
  if (seed.kept.length < 2) {
    throw new Error(`m3Top5b 144X: 살아남은 후보가 모자랍니다 (n=${seed.n})`);
  }
  return {
    ...seed,
    angle,
    candidates,
    sift: { candidates, kept: seed.kept },
  };
}

/** $\sin$ 을 지면에 적는 꼴 — 둔각이면 $\sin(180^{\circ}-A)$ 로 바꾼다(RPM `09`). */
function sinPiece(angle: number): string {
  return angle > 90
    ? `\\sin(180^{\\circ}-${angle}^{\\circ})`
    : `\\sin ${angle}^{\\circ}`;
}

function renderSegmentRatio(rng: Rng): Body {
  const plan = planSegmentRatio(rng);
  const { b, c, k, n, kept, answer, angle, candidates } = plan;
  const s = sinPiece(angle);

  const content =
    `삼각형 $ABC$에서 $\\angle A=${angle}^{\\circ}$, $\\overline{AB}=${c}$, ` +
    `$\\overline{AC}=${b}$이다. 변 $AB$ 위의 점 $D$와 변 $AC$ 위의 점 $E$에 대하여 ` +
    `$\\overline{AD}$, $\\overline{AE}$의 길이가 모두 자연수이고 삼각형 $ADE$의 넓이가 ` +
    `삼각형 $ABC$의 넓이의 $\\dfrac{1}{${k}}$일 때, $\\overline{AD}$의 길이가 될 수 ` +
    `있는 값을 모두 구하고 그 합을 구하시오.`;

  const lines: string[] = [
    `$\\overline{AD}=x$, $\\overline{AE}=y$라 하면 $x$, $y$는 자연수이다.`,
    `두 삼각형 $ADE$와 $ABC$는 $\\angle A$가 공통이므로 ` +
      `$\\triangle ADE=\\dfrac{1}{2}\\times x\\times y\\times ${s}$, ` +
      `$\\triangle ABC=\\dfrac{1}{2}\\times ${c}\\times ${b}\\times ${s}$이다.`,
    `두 식에 같은 삼각비의 값이 들어 있어 넓이의 비에서 약분되므로 ` +
      `$\\triangle ADE:\\triangle ABC=xy:${b * c}$이고, $\\angle A$의 크기는 쓰지 않아도 된다.`,
    `$\\triangle ADE$가 $\\triangle ABC$의 $\\dfrac{1}{${k}}$이므로 ` +
      `$xy\\times ${k}=${b * c}$이고, $${b * c}$${eulReul(b * c)} $${k}$${euroRo(k)} ` +
      `나눈 값이 $xy$이므로 $xy=${b * c}\\div ${k}=${n}$이다.`,
    `따라서 $x$는 $${n}$의 약수이고, 그 약수는 $${candidates.join("$, $")}$이다.`,
    `점 $D$는 변 $AB$ 위의 점이므로 $x\\le ${c}$이고, ` +
      `점 $E$는 변 $AC$ 위의 점이므로 $y\\le ${b}$이다.`,
  ];

  candidates.forEach((x, i) => {
    const y = n / x;
    const mark = MARKS[i]!;
    const deadD = x > c;
    const deadE = y > b;
    if (deadD && deadE) {
      // 🔴 이 자리는 산술로 올 수 없다 — 오면 창이 깨진 것이므로 **던진다**.
      throw new Error(
        `m3Top5b 144X: 두 굳힘이 함께 죽었습니다 (x=${x}, y=${y}, b=${b}, c=${c})`,
      );
    }
    if (deadD) {
      // ⚠️ 조사를 **문자 뒤에** 붙이지 않는다 — 「$x$이」는 값이 아니라 「엑스」로
      //    읽히므로 수 조사 자(`josaMismatches`)가 판정을 건너뛰고, 그 사이 틀린
      //    글자가 지면에 나간다. 부등식을 통째로 수식에 넣으면 그 자리가 안 생긴다.
      lines.push(
        `${mark} $x=${x}$이면 $y=${n}\\div ${x}=${y}$이지만 $x>${c}$이므로 ` +
          `점 $D$가 변 $AB$ 위에 있을 수 없다.`,
      );
    } else if (deadE) {
      lines.push(
        `${mark} $x=${x}$이면 $y=${n}\\div ${x}=${y}$인데 $y>${b}$이므로 ` +
          `점 $E$가 변 $AC$ 위에 있을 수 없다.`,
      );
    } else {
      lines.push(
        `${mark} $x=${x}$이면 $y=${n}\\div ${x}=${y}$이고 ` +
          `$x\\le ${c}$, $y\\le ${b}$이므로 조건에 맞는다.`,
      );
    }
  });

  lines.push(
    `그러므로 $\\overline{AD}$의 길이는 $${kept.join("$, $")}$이고, ` +
      `그 합은 $${kept.join("+")}=${answer}$이다.`,
  );

  return {
    content,
    answer: `$${answer}$`,
    solution: lines.join("\n"),
    facts: { b, c, k, n, angle, keptCount: kept.length, x: answer },
    figureSpec: null,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// B. 145X  내접원의 접선의 길이가 주어진 직각삼각형의 둘레                (심화중)
//    3-2 «원과 직선» → 우리 소단원 「원의 접선」
// ════════════════════════════════════════════════════════════════════════════

/**
 * 🔴 **굳힘을 «인자로» 받는 순수 함수** — ㉡ 을 밖에서 재는 통로다.
 *
 * $\overline{AD}=p$, $\overline{BD}=q$ 이고 내접원의 반지름을 $r$ 라 하면
 * 접선의 길이가 같으므로 $\overline{CA}=p+r$, $\overline{CB}=q+r$,
 * $\overline{AB}=p+q$ 이고, 피타고라스 정리에서
 *
 * $$(p+r)^2+(q+r)^2=(p+q)^2 \iff r^2+(p+q)r-pq=0$$
 *
 * 이다. 두 근은 $r_0$ 와 $-\,pq\div r_0$ 이고 **곱이 $-pq<0$ 이라 부호가 서로 다르다.**
 * `usePositive` 가 「반지름은 양수」 굳힘이다 — 끄면 **두 근을 다 돌려준다.**
 *
 * ⚠️ 근은 **정수 산술로** 구한다(판별식이 제곱수가 아니면 던진다). 부동소수로 재면
 *    큰 씨앗에서 반올림이 답을 흔든다.
 */
export function solveIncircleRadius(
  p: number,
  q: number,
  usePositive: boolean,
): number[] {
  const s = p + q;
  const disc = s * s + 4 * p * q;
  const root = intSqrt(disc);
  if (root === null) {
    throw new Error(`m3Top5b 145X: 판별식 ${disc} 이 제곱수가 아닙니다`);
  }
  if ((root - s) % 2 !== 0) {
    throw new Error(`m3Top5b 145X: 근이 정수가 아닙니다 (p=${p}, q=${q})`);
  }
  const hi = (-s + root) / 2;
  const lo = (-s - root) / 2;
  return usePositive ? [hi] : [lo, hi];
}

export type IncSeed = {
  /** $\overline{AD}$ */
  p: number;
  /** $\overline{BD}$ */
  q: number;
  /** 내접원의 반지름 */
  r: number;
  /** 둘레 */
  answer: number;
};

export type IncPlan = IncSeed & {
  /** 이차방정식 $r^2+sr-t=0$ 의 $s$ */
  s: number;
  /** 그 $t$ ($=pq$) */
  t: number;
  /** 버려지는 음수 근 */
  negative: number;
  /** 세 변 — $\overline{CA}$, $\overline{CB}$, $\overline{AB}$ */
  sides: [number, number, number];
};

/**
 * 쓸 수 있는 $(r,\,p,\,q)$ 를 프로그램으로 뽑는다.
 *
 * $r^2+(p+q)r-pq=0$ 에서 $u=p-r$, $v=q-r$ 로 놓으면 $uv=2r^2$ 이다 — 그래서
 * $r$ 를 먼저 고르고 $2r^2$ 의 약수쌍으로 $(p,q)$ 를 만든다(모든 정수 해를 빠짐없이
 * 훑는다). 조건마다 까닭이 있다.
 *
 * ```
 * 3 ≤ r ≤ 15 · q ≤ 80 · 둘레 ≤ 300   수를 키우는 것은 난이도가 아니다
 * 답이 한 걸음에 안 닿는다             ㉵ — 적힌 수는 $p$, $q$ 와 $2$, $90$
 * ```
 *
 * 🔴 **㉵ 가 실제로 무엇을 버리나 — 「$r=2$ 인 씨앗 전부」다.** 둘레는
 * $2(p+q+r)$ 이고 $r(p+q+r)=pq$ 이므로 둘레 $=2pq\div r$ 인데, $r=2$ 이면 그것이
 * **$pq$ 와 같아져** 적힌 두 수를 한 번 곱하면 답이 나온다. 값 검산도 KaTeX 도
 * 이 자리를 구조적으로 못 본다.
 *
 * 🔴 **D-20 손실 원장**(실측 2026-09-04). $3\le r\le15$ 의 약수쌍은 모두 **$63$** 벌이다.
 * 각 줄은 **그 가드 «하나만»** 켠 값이다.
 *
 * ```
 * 분모 (r = 3..15 의 약수쌍)         63
 * 크기 창(q ≤ 80, 둘레 ≤ 300)만      63 → 41
 * ㉵ 지름길만                        63 → 53
 * 둘 다 걸면                         63 → 31   (남는 답 24 종)
 * ```
 *
 * ⚠️ **$r=2$ 를 범위에 넣어 보면 ㉵ 가 사는 자리가 드러난다** — 분모가 $65$ 로
 *    늘고 크기 창은 $43$ 을 남기는데(늘어난 두 벌이 다 통과한다) ㉵ 는 그대로 $53$
 *    이고 둘 다 걸면 여전히 $31$ 이다. 곧 **$r=2$ 의 두 벌을 ㉵ 가 전부 버린다.**
 *    시험이 이 여섯 수를 다시 세어 대조한다 — 「$0$ 을 버렸다」와 「가드가 죽었다」는
 *    다른 말이고, 그 둘을 가르는 것은 **범위를 넓혀 본 이 한 줄**이다.
 */
export function incirclePool(): IncSeed[] {
  if (INC_CACHE.pool) return INC_CACHE.pool;
  const out: IncSeed[] = [];
  for (let r = 3; r <= 15; r += 1) {
    for (const [u, v] of divisorPairsOf(2 * r * r)) {
      const p = r + u;
      const q = r + v;
      const answer = 2 * (p + q + r);
      if (q > 80 || answer > 300) continue;
      if (oneStepReach([2, 90, p, q]).has(answer)) continue;
      out.push({ p, q, r, answer });
    }
  }
  INC_CACHE.pool = out;
  return out;
}

/** 🔴 풀이 낼 수 있는 답 전부(오름차순) — 답을 «고르게» 뽑기 위한 축(㉴). */
export function incircleAnswers(): number[] {
  if (!INC_CACHE.answers) {
    INC_CACHE.answers = [...new Set(incirclePool().map((x) => x.answer))].sort(
      (a, b) => a - b,
    );
  }
  return INC_CACHE.answers;
}

/** **145X «심화중»** — 「접선의 길이 둘이 주어진 직각삼각형의 둘레」. */
export function planIncircle(rng: Rng): IncPlan {
  const want = pick(rng, incircleAnswers());
  const sub = incirclePool().filter((x) => x.answer === want);
  if (sub.length === 0) {
    throw new Error(`m3Top5b 145X: 답 ${want} 에 맞는 씨앗이 없습니다`);
  }
  const seed = pick(rng, sub);
  const { p, q } = seed;
  /**
   * 🔴 **굳힘을 «켠 채로» 부른 값이 지면으로 간다.**
   *
   * 처음에는 `solveIncircleRadius(p, q, false)` 로 두 근을 받고 그중 큰 것을 썼는데,
   * 그러면 `usePositive` 갈래가 **시험에서만 도는 죽은 길**이 된다 — 변이 하네스가
   * 「`[hi]` → `[lo]`」를 넣었더니 **산출물이 글자까지 그대로**여서 판정을 거부했다.
   * 굳힘을 인자로 뽑아 놓고 제품이 안 부르면 그 축은 재는 시늉만 하는 것이다.
   */
  const kept = solveIncircleRadius(p, q, true);
  const roots = solveIncircleRadius(p, q, false);
  if (kept.length !== 1) {
    throw new Error(
      `m3Top5b 145X: 굳힘이 하나를 안 남겼습니다 (${kept.length})`,
    );
  }
  const r = kept[0]!;
  if (r !== seed.r) {
    throw new Error(`m3Top5b 145X: 굳힘이 남긴 값이 ${r} 로 씨앗과 다릅니다`);
  }
  const negative = roots.find((v) => v !== r);
  if (negative === undefined || negative >= 0) {
    throw new Error(`m3Top5b 145X: 버리는 근이 음수가 아닙니다 (${negative})`);
  }
  const sides: [number, number, number] = [p + r, q + r, p + q];
  if (sides[0] ** 2 + sides[1] ** 2 !== sides[2] ** 2) {
    throw new Error(`m3Top5b 145X: 피타고라스가 안 맞습니다 (p=${p}, q=${q})`);
  }
  return { ...seed, r, s: p + q, t: p * q, negative, sides };
}

function renderIncircle(rng: Rng): Body {
  const plan = planIncircle(rng);
  const { p, q, r, s, t, negative, sides, answer } = plan;
  const [ca, cb, ab] = sides;

  const content =
    `$\\angle C=90^{\\circ}$인 직각삼각형 $ABC$의 내접원이 세 변 $AB$, $BC$, $CA$와 ` +
    `접하는 점을 각각 $D$, $E$, $F$라 하자. $\\overline{AD}=${p}$, ` +
    `$\\overline{BD}=${q}$일 때, 삼각형 $ABC$의 둘레의 길이를 구하시오.`;

  const lines: string[] = [
    `내접원의 중심을 $O$, 반지름의 길이를 $r$라 하자.`,
    `원 밖의 한 점에서 그 원에 그은 두 접선의 길이는 서로 같으므로 ` +
      `$\\overline{AF}=\\overline{AD}=${p}$, $\\overline{BE}=\\overline{BD}=${q}$이다.`,
    `접점을 지나는 반지름은 접선과 수직이므로 $\\angle OEC=\\angle OFC=90^{\\circ}$이고, ` +
      `$\\angle C=90^{\\circ}$이므로 사각형 $OECF$는 직사각형이다. ` +
      `여기에 $\\overline{OE}=\\overline{OF}=r$이므로 사각형 $OECF$는 정사각형이다.`,
    `따라서 $\\overline{CE}=\\overline{CF}=r$이므로 $\\overline{CA}=${p}+r$, ` +
      `$\\overline{CB}=${q}+r$, $\\overline{AB}=${p}+${q}=${ab}$이다.`,
    `직각삼각형 $ABC$에서 피타고라스 정리에 의하여 ` +
      `$(${p}+r)^{2}+(${q}+r)^{2}=${ab}^{2}$이다.`,
    `좌변을 전개하면 $2r^{2}+${2 * s}r+${p * p + q * q}$이고 우변은 $${ab * ab}$이므로, ` +
      `양변을 정리하고 $2$로 나누면 $r^{2}+${s}r-${t}=0$이다.`,
    // ⚠️ 버리는 근을 `$r=${negative}$` 로 적지 않는다 — 그 등식은 이 문항에서
    //    **거짓**이라, 해설을 다시 계산하는 자가 그것을 결함으로 잡는다(옳게 잡는
    //    것이다). 「$r$의 값은 $A$ 또는 $B$」로 적으면 뜻은 같고 거짓 등식이 없다.
    `좌변을 인수분해하면 $(r-${r})(r+${-negative})=0$이므로 ` +
      `$r$의 값은 $${r}$ 또는 $${negative}$이다.`,
    `두 값 $${r}$${waGwa(r)} $${negative}$ 가운데 $r$는 내접원의 반지름의 길이이므로 ` +
      `$r>0$이어야 한다. 따라서 $r=${r}$이다.`,
    `그러므로 삼각형 $ABC$의 둘레의 길이는 ` +
      `$\\overline{AB}+\\overline{BC}+\\overline{CA}=${ab}+${cb}+${ca}=${answer}$이다.`,
  ];

  return {
    content,
    answer: `$${answer}$`,
    solution: lines.join("\n"),
    facts: { p, q, r, ca, cb, ab, x: answer },
    figureSpec: null,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// C. 146X  두 교점의 각의 곱이 주어진 내접사각형의 한 내각 모두 구하기    (심화상)
//    3-2 «원주각의 활용» → 우리 소단원 「원주각의 활용」
// ════════════════════════════════════════════════════════════════════════════

/**
 * 🔴 **굳힘을 «인자로» 받는 순수 함수** — ㉡ 을 밖에서 재는 통로다.
 *
 * $\angle BAD=a^{\circ}$, $\angle ABC=b^{\circ}$ 라 하면 두 삼각형에서
 * $x=b-a$, $y=180-a-b$ 이므로 $x+y=180-2a$, 곧
 * $a=\dfrac{180-(x+y)}{2}$ 이고 $\angle BCD=(180-a)^{\circ}$ 이다.
 *
 * 후보는 $xy=m$ 인 약수쌍 **전부**($x\le y$)다. 굳힘이 **둘**이다.
 *   · `useParity` — 네 내각이 자연수라야 하므로 $a$ 가 자연수, 곧 $x+y$ 가 짝수
 *   · `useRange`  — $\angle BAD\ge1^{\circ}$ 라야 하므로 $x+y\le178$
 *
 * 돌려주는 것은 **살아남은 약수쌍**(오름차순)이다.
 *
 * 🔴 **홀짝 굳힘이 죽이는 자리는 목록의 «색인»과 무관하다** — 앞·중간·뒤 어디서나
 *    죽는다. 이것이 `144X` 의 구간 굳힘(양 끝에서 죽는다)과 다른 점이고, 시험이
 *    전 씨앗에서 **죽은 색인의 가짓수**를 세어 이 단언을 문다(㉷).
 */
export function solveAnglePairs(
  m: number,
  useParity: boolean,
  useRange: boolean,
): [number, number][] {
  const out: [number, number][] = [];
  for (const [x, y] of divisorPairsOf(m)) {
    if (useParity && (x + y) % 2 !== 0) continue;
    if (useRange && x + y > 178) continue;
    out.push([x, y]);
  }
  return out;
}

/** 살아남은 쌍이 낳는 $\angle BCD$ 의 크기(오름차순, 중복 없음). */
export function angleValuesOf(pairs: readonly [number, number][]): number[] {
  return [...new Set(pairs.map(([x, y]) => 90 + (x + y) / 2))].sort(
    (a, b) => a - b,
  );
}

export type AngSeed = {
  /** $\angle P$ 와 $\angle Q$ 의 크기의 곱 */
  m: number;
  kept: [number, number][];
  values: number[];
  answer: number;
};

export type AngPlan = AngSeed & {
  /** $m$ 의 약수쌍 전부(후보) */
  pairs: [number, number][];
  sift: Sift;
};

/**
 * 쓸 수 있는 $m$ 을 프로그램으로 뽑는다.
 *
 * ```
 * 20 ≤ m ≤ 1199        수를 키우는 것은 난이도가 아니다
 * 약수쌍 3~5개          ㉮ 해설이 정답지 한 단을 넘지 않게
 * 사는 것 2~3개         하나뿐이면 「모두 구하고 합」이 말이 안 된다
 * 죽는 것 ≥1개          굳힘이 «일할 자리»가 있어야 한다 (㉡)
 * 값이 서로 다르다       같은 값이 두 번 나오면 「모두」가 흐려진다
 * 답이 한 걸음에 안 닿는다  ㉵ — 적힌 수는 $m$ 과 $2$, $90$, $180$
 * ```
 *
 * 🔴 **D-20 손실 원장**(실측 2026-09-04). $20\le m\le1199$ 의 **$1{,}180$** 벌이
 * 분모다. 각 줄은 **그 가드 «하나만»** 켠 값이다.
 *
 * ```
 * 분모 (m = 20..1199)     1,180
 * 약수쌍 3~5개만          1,180 →   391
 * 사는 것 2~3개만         1,180 →   250
 * 죽는 것 ≥1개만          1,180 → 1,101
 * 값이 서로 다르다만       1,180 → 1,180   ← 이 범위에서는 아무것도 안 버린다
 * ㉵ 지름길만             1,180 →   615
 * 다섯 다 걸면            1,180 →   123   (남는 답 72 종)
 * ```
 *
 * ⚠️ 「값 겹침 가드가 $0$ 을 버린다」는 **가드가 죽었다는 뜻이 아니다** — 값이
 *    $x+y$ 로만 정해지므로, 서로 다른 두 약수쌍의 합이 같아야 겹치는데 그런 $m$ 은
 *    이 범위에 없다. 시험이 그 사실을 **전수로** 확인하고, 겹치는 짝을 손으로 지어
 *    이 가드가 «아니오»를 낼 수 있음을 같이 보인다(0 은 「깨끗」과 「못 셈」을 안 가른다).
 */
export function anglePool(): AngSeed[] {
  if (ANG_CACHE.pool) return ANG_CACHE.pool;
  const out: AngSeed[] = [];
  for (let m = 20; m <= 1199; m += 1) {
    const pairs = divisorPairsOf(m);
    if (pairs.length < 3 || pairs.length > 5) continue;
    const kept = solveAnglePairs(m, true, true);
    if (kept.length < 2 || kept.length > 3) continue;
    if (pairs.length - kept.length < 1) continue;
    const values = angleValuesOf(kept);
    if (values.length !== kept.length) continue;
    const answer = values.reduce((t, v) => t + v, 0);
    if (oneStepReach([2, 90, 180, m]).has(answer)) continue;
    out.push({ m, kept, values, answer });
  }
  ANG_CACHE.pool = out;
  return out;
}

/** 🔴 풀이 낼 수 있는 답 전부(오름차순) — 답을 «고르게» 뽑기 위한 축(㉴). */
export function angleAnswers(): number[] {
  if (!ANG_CACHE.answers) {
    ANG_CACHE.answers = [...new Set(anglePool().map((x) => x.answer))].sort(
      (a, b) => a - b,
    );
  }
  return ANG_CACHE.answers;
}

/** **146X «심화상»** — 「$\angle P$ 와 $\angle Q$ 의 곱이 $m$ 일 때 $\angle BCD$ 를 모두」. */
export function planCyclicAngle(rng: Rng): AngPlan {
  const want = pick(rng, angleAnswers());
  const sub = anglePool().filter((x) => x.answer === want);
  if (sub.length === 0) {
    throw new Error(`m3Top5b 146X: 답 ${want} 에 맞는 씨앗이 없습니다`);
  }
  const seed = pick(rng, sub);
  const pairs = divisorPairsOf(seed.m);
  if (seed.kept.length < 2) {
    throw new Error(`m3Top5b 146X: 살아남은 후보가 모자랍니다 (m=${seed.m})`);
  }
  return {
    ...seed,
    pairs,
    sift: {
      candidates: pairs.map(([x, y]) => x + y),
      kept: seed.kept.map(([x, y]) => x + y),
    },
  };
}

function renderCyclicAngle(rng: Rng): Body {
  const plan = planCyclicAngle(rng);
  const { m, pairs, kept, values, answer } = plan;

  const content =
    `원에 내접하는 사각형 $ABCD$에서 변 $AB$의 연장선과 변 $DC$의 연장선의 교점을 $P$, ` +
    `변 $AD$의 연장선과 변 $BC$의 연장선의 교점을 $Q$라 하자. 사각형 $ABCD$의 네 내각의 ` +
    `크기는 모두 자연수이고, $\\angle P=x^{\\circ}$, $\\angle Q=y^{\\circ}$인 두 자연수 ` +
    `$x$, $y$에 대하여 $xy=${m}$이다. 이때 $\\angle BCD$의 크기가 될 수 있는 값을 모두 ` +
    `구하고 그 합을 구하시오.`;

  const lines: string[] = [
    `$\\angle BAD=a^{\\circ}$, $\\angle ABC=b^{\\circ}$라 하자.`,
    `원에 내접하는 사각형에서 한 외각의 크기는 그 내대각의 크기와 같으므로, ` +
      `삼각형 $PBC$에서 $\\angle PBC=\\angle ADC=(180-b)^{\\circ}$, ` +
      `$\\angle PCB=\\angle BAD=a^{\\circ}$이다.`,
    `삼각형 $PBC$의 세 내각의 크기의 합은 $180^{\\circ}$이므로 ` +
      `$x+(180-b)+a=180$, 곧 $x=b-a$이다.`,
    `같은 성질에 의하여 삼각형 $QDC$에서 $\\angle QDC=\\angle ABC=b^{\\circ}$, ` +
      `$\\angle QCD=\\angle BAD=a^{\\circ}$이므로 $y+b+a=180$, 곧 $y=180-a-b$이다.`,
    `두 식을 변끼리 더하면 $x+y=180-2a$이므로 $a=\\dfrac{180-(x+y)}{2}$이고, ` +
      `$\\angle BCD$의 크기는 $(180-a)^{\\circ}$이다.`,
    `$a$가 자연수이어야 하므로 $x+y$는 짝수이고, $a\\ge 1$이어야 하므로 ` +
      `$x+y\\le 178$이다.`,
    `$\\angle P$와 $\\angle Q$를 서로 바꾸어도 $x+y$는 그대로이므로 $x\\le y$인 ` +
      `경우만 따지면 된다. $xy=${m}$이고 $x\\le y$인 두 자연수 $x$, $y$의 순서쌍은 ` +
      `${pairs.map(([x, y]) => `$(${x},\\ ${y})$`).join(", ")}이다.`,
  ];

  pairs.forEach(([x, y], i) => {
    const mark = MARKS[i]!;
    const sum = x + y;
    const head = `${mark} $x=${x}$, $y=${y}$이면 $x+y=${sum}$인데 `;
    if (sum % 2 !== 0) {
      lines.push(`${head}이 수가 홀수이므로 $a$가 자연수가 아니다.`);
    } else if (sum > 178) {
      lines.push(
        `${head}이 수가 $178$보다 크므로 $a\\ge 1$${eulReul(1)} 만족시키지 못한다.`,
      );
    } else {
      const a = (180 - sum) / 2;
      lines.push(
        `${head}이 수가 짝수이고 $178$ 이하이므로 ` +
          `$a=(180-${sum})\\div 2=${a}$이고 ` +
          `$\\angle BCD$의 크기는 $180-${a}=${180 - a}$에서 $${180 - a}^{\\circ}$이다.`,
      );
    }
  });

  lines.push(
    `그러므로 $\\angle BCD$의 크기는 ` +
      `$${values.map((v) => `${v}^{\\circ}`).join("$, $")}$이고, ` +
      `그 합은 $${values.join("+")}=${answer}$이므로 $${answer}^{\\circ}$이다.`,
  );

  const facts: Record<string, number> = {
    m,
    keptCount: kept.length,
    x: answer,
  };
  kept.forEach(([x, y], i) => {
    facts[`p${i}`] = x;
    facts[`q${i}`] = y;
  });

  return {
    content,
    answer: `$${answer}^{\\circ}$`,
    solution: lines.join("\n"),
    facts,
    figureSpec: null,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 등록
// ════════════════════════════════════════════════════════════════════════════

function def(
  minor: string,
  rpmType: string,
  rpmTitle: string,
  unitSection: string,
  difficulty: MidProblem["difficulty"],
  gen: (rng: Rng) => Body,
): TypeEntry {
  return {
    key: `${BOOK}|${minor}|${rpmType}`,
    grade: GRADE,
    unitSection,
    rpmBook: BOOK,
    rpmMinor: minor,
    rpmType,
    rpmTitle,
    handler: (rng) => ({
      grade: GRADE,
      unitSection,
      rpmBook: BOOK,
      rpmMinor: minor,
      rpmType,
      rpmTitle,
      difficulty,
      ...gen(rng),
    }),
  };
}

export const M3_TOP_5B: TypeEntry[] = [
  def(
    MINOR.삼각비활용,
    "144X",
    "넓이의 비가 주어질 때 두 변 위의 점까지의 길이 모두 구하기",
    SEC.삼각비활용,
    "심화상",
    renderSegmentRatio,
  ),
  def(
    MINOR.원과직선,
    "145X",
    "내접원의 접선의 길이가 주어진 직각삼각형의 둘레 구하기",
    SEC.원의접선,
    "심화중",
    renderIncircle,
  ),
  def(
    MINOR.원주각활용,
    "146X",
    "두 교점의 각의 크기의 곱이 주어진 내접사각형의 한 내각 모두 구하기",
    SEC.원주각활용,
    "심화상",
    renderCyclicAngle,
  ),
];

/**
 * 리드가 준 소단원 이름 셋 — **정본과 글자 그대로 같은지** 시험이 대조한다.
 *
 * 브리프의 문자열을 여기 옮겨 두는 까닭은, 「내가 쓴 이름」이 아니라 「받은 이름」이
 * 정본과 같은지를 물어야 하기 때문이다. 위 `SEC` 를 그대로 쓰면 동어반복이 된다.
 */
export const BRIEF_SECTION_NAMES = [
  "삼각비의 활용",
  "원의 접선",
  "원주각의 활용",
] as const;

/** 리드가 준 변형 폭 바닥 — 시험이 이 수만큼 **서로 다른** 변형이 나오는지 센다. */
export const VARIANT_FLOORS: Record<string, number> = {
  "3-2|삼각비의 활용|144X": 6,
  "3-2|원과 직선|145X": 12,
  "3-2|원주각의 활용|146X": 12,
};
