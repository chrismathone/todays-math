/**
 * 중2 **확대 갈래 5차 물결**(`m2Top5i.ts`) — `심화중`·`심화상` 넷을 지킨다 (D-116).
 *
 * ## ⑴ 검산의 «참»이 어디서 오나 — **지면**이다
 *
 * `VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받는다.
 * 그래서 생성기의 산술을 옮겨 적을 수가 **구조적으로 없다**(2026-08-18 「지표의 «참»이
 * 제품에서 나오면 제품이 틀릴수록 좋은 점수가 난다」).
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `136X` | 「평행 둘 · 한 점에서 만남 하나」로 **경우를 나눠** 세 값을 짓는다 | 경우를 **한 번도 안 나눈다** — $a$ 를 $-300$ 부터 $300$ 까지 **전부 넣어 보고**, 세 직선의 세 교점을 **분수로** 구해 「서로 다른 점 셋인가」만 본다. 삼각형이 안 되는 $a$ 를 그렇게 모으므로, 「셋뿐이다」라는 주장이 **넓은 범위에서 반증되지 않는다**는 것까지 확인된다 |
 * | `137X` | $x+y=A$, $x-y=B$ 로 **치환**해 풀고 마지막에 되돌린다 | 치환을 **한 번도 안 한다** — 두 식을 곧바로 $x$, $y$ 에 대한 정수 계수 연립으로 펴서 풀고, 얻은 $(x,y)$ 를 **원래 분수식에 정수 곱셈으로 대입해** 참인지 확인한다. 그 다음에야 $xy$ 를 곱한다 |
 * | `138X` | 두 삼각형의 **평행선 비**로 두 밑변을 짓는다 | 비례식을 **한 줄도 안 쓴다** — 사다리꼴을 좌표로 놓고($B(0,0)$, $C(q,0)$, $A(0,1)$, $D(p,1)$) $E$, $F$, $P$ 의 좌표를 **직접 계산**해 두 조각의 길이를 얻은 뒤, $p$, $q$ 를 $1$ 부터 $300$ 까지 **전부 넣어 보고** 두 조각이 지면의 값과 맞는 것을 모은다. 그 짝이 하나뿐인지까지 이 훑기가 답한다 |
 * | `139X` | 「같은 두 각이 어느 쌍인가」로 **경우를 셋으로 나눈다** | 경우를 **안 나눈다** — 나머지 한 각을 $0.5^\circ$ 씩 **전부 넣어 보고**, 세 각이 모두 양수이며 그중 두 각이 같은 것만 남긴다. 그렇게 남은 삼각형들에서 물은 각을 계산해 **집합으로** 모은다 |
 *
 * ## ⑵ 눈금 — **이 자가 «아니오» 를 낼 수 있는가**
 *
 * 검산기를 **엔진을 거치지 않은 손으로 쓴 지면**에 먼저 대 본다 — 양성(답을 아는
 * 지면에서 그 답을 낸다)과 음성(불변식을 어긴 지면은 **던진다**). 양성만 대면
 * 재현율만 재고 지어냄은 구조적으로 0이 된다(2026-08-20).
 *
 * ## ⑶ 이 시험이 못 보는 것 — 정직하게
 *
 * 1. 🔴 **`139X` 는 $\alpha>90$ 일 때 답이 «살아남은 후보 그 자체»다.** 후보가 하나뿐이니
 *    피할 수 없다 — 「후보 목록의 어느 자리도 답이 아니다」를 그 판에서는 **못 건다**.
 *    아래 「찍기」 검사가 그 사실을 **스스로 찍고** $\alpha<90$ 판에서만 건다.
 * 2. 🔴 **「한두 번 연산 지름길 0%」는 세 번까지 넓히면 뜻이 사라진다.** 실측(600판):
 *    한두 번 넷 다 **0.00%**(치환 대조 — 같은 자루에 **다른 판의 답**을 넣었을 때는
 *    `136X` 55.33% · `137X` 14.17% · `138X` 8.17% · `139X` 0.00%)인데,
 *    **세 번까지** 넓히면 `136X` 92.50%(대조 95.67%) · `137X` 77.00%(대조 75.83%)로
 *    **대조와 구분되지 않는다.** 즉 그 폭에서는 «지름길이 있다»가 아니라 «무엇이든
 *    닿는다»는 뜻이다. `138X` 만 38.00%(대조 51.17%)로 대조보다 **낮다.**
 *    이 시험이 잠그는 것은 **한두 번 판**이고, 세 번 판의 수치는 기록으로만 둔다.
 *    🔴 `139X` 는 대조도 $0.00\%$ 다 — 발문에 수가 **하나뿐**이라 한두 번으로 닿을
 *    값이 애초에 둘밖에 없다. 그 유형에서 이 자의 «0» 은 «막았다»가 아니라
 *    **«막을 것이 거의 없다»** 는 뜻이다.
 * 3. 「해설이 학생에게 충분한가」는 여기서 못 잰다. 줄 수·중간값의 **참·거짓**은 재지만
 *    설명이 실제로 이해되는지는 사람이 읽어야 안다. 이 회차의 해설은 표본으로 눈으로
 *    읽었고, 그때 고친 자리를 아래 회귀 잠금에 남긴다.
 * 4. **`generate.ts` 등록은 리드의 몫**이라 이 파일이 쓰일 때 아직 등록 전일 수 있다.
 *    기본 경로는 `entry.handler` 를 직접 부르고, 등록되면 「등록되면 …」 검사가 살아난다
 *    (등록 전에는 **그 사실을 스스로 찍는다**).
 * 5. 🔴 **공용 훑개의 「정수 경계 걸음」 축은 이 갈래에서 «잴 것이 없다».**
 *    `probe-middle-extending-tiers.boundStepFaults` 는 `$cx\le R$이다.` 꼴을 찾는데
 *    우리 넷은 **부등식을 한 줄도 세우지 않는다.** 그 자의 「0」은 «깨끗»이 아니라
 *    «잴 것이 없다»이므로, 아래 검사가 **부등호가 지면에 하나도 없음**을 전량에서 찍는다.
 *
 * ## ⑷ 🔴 손실 원장 (D-20) — 어림하지 않고 **매개변수를 전수로 훑어 센 값**
 *
 * 「전부 켠 판」을 분모로 두고 가드를 **하나씩만** 껐다. 그리고 2026-08-25 의 교훈대로
 * **「걸린 수」와 「유일 원인이 된 수」를 따로** 셌다 — 두 가드가 같은 조합을 물면 서로
 * 가려 **둘 다 «안 문다»로 찍힌다.**
 *
 * | 유형 | 훑은 조합 | 전부 켠 통과 | 정답 가짓수 | 전수 최빈 |
 * |---|---|---|---|---|
 * | `136X` | $8\times19\times1320=200{,}640$ | **35,654** | 30 | 5.65% |
 * | `137X` | $20\times2\times4\times8\times11\times11=154{,}880$ (정수해만) | **9,387** | 46 | 7.13% |
 * | `138X` | $4\times4\times7\times7=784$ | **249** | 41 | 6.43% |
 * | `139X` | $44\times6=264$ | **252** | 42 | 2.38% |
 *
 * 가드마다 「이것만 껐을 때」(통과 수 · 걸린 수 · **유일 원인**):
 *
 * - `136X` — 절편0아님 41,556 / 19,800 / **5,902** · 절편29이하 37,366 / 5,280 / **1,712** ·
 *   **굳힘왕복 35,654 / 0 / 0 (안 문다 — 되짚기 자기검사다)** ·
 *   짝합0아님 40,738 / 54,720 / **5,084** · 지름길 118,248 / 144,424 / **82,594** ·
 *   합0아님 42,478 / 10,944 / **6,824**.
 *   🔴 **합0아님을 끄면 전수 최빈이 5.65% → 16.06% 로 문턱을 넘는다** — 「세 기울기의
 *   합이 $0$」이 한 값에 몰리기 때문이다. 그 가드는 **쏠림을 지키는 가드**다.
 *   🔴 **「짝합0아님」은 시험이 찾아 준 가드다.** 두 값의 합이 $0$ 이면 나머지 하나가
 *   곧 답이 되어 **한 경우만 풀고 적어도 맞는다**(실측 `$-6x-y-25=0$, $6x-y+23=0$,
 *   $ax-y-17=0$` 에서 답 $-4$ 가 $a_3$ 와 같았다). 지름길 가드는 이 부류를
 *   **구조적으로 못 본다** — $a_3$ 가 발문에 안 찍히기 때문이다. 손실은 5,084 조합이고
 *   가짓수는 30 그대로, 최빈은 6.18% → 5.65% 로 **좋아졌다.**
 *   🔴 **지름길 가드가 통과 조합의 69.9% 를 버린다.** 그런데 정답 가짓수는 30 → 30 으로
 *   **안 줄고** 최빈도 5.43% → 5.65% 로 거의 그대로다 — 잃는 것이 «값»이 아니라
 *   «찍어서 맞는 판»뿐이다(4차 `36W` 가 최빈이 올라 대가를 치른 것과 다르다).
 * - `137X` — L20이하 9,629 / 7,040 / **242** · |n|≠m 12,218 / 24,128 / **2,831** ·
 *   uv≠0 13,985 / 20,736 / **4,598** · xy크기2~12 17,425 / 51,456 / **8,038** ·
 *   c정수·≠0 10,596 / 9,472 / **1,209** · d≠0 9,678 / 2,992 / **291** ·
 *   c20·d60 13,852 / 34,912 / **4,465** ·
 *   **solvePair왕복 9,387 / 2,312 / 0 (안 문다 — 앞 가드들이 먼저 문다)** ·
 *   가감법크기 9,465 / 7,512 / **78** · 지름길 11,724 / 27,866 / **2,337**.
 *   🔴 xy크기를 끄면 정답 가짓수가 46 → 117 로 늘지만 **최빈이 7.13% → 10.29%** 가 된다.
 *   가짓수가 는다고 분포가 좋아지는 게 아니다.
 * - `138X` — **m≠n 249 / 196 / 0** · 기약비 297 / 294 / **48** · α<β 447 / 336 / **198** ·
 *   길이범위 262 / 28 / **13** · **조각2이상 249 / 0 / 0** ·
 *   **조각서로다름 249 / 42 / 0** · **뒤집으면다름 249 / 214 / 0** · 지름길 258 / 38 / **9**.
 *   🔴 **넷이 «유일 원인 0» 이고 까닭이 서로 다르다.** ㉠ 「조각2이상」은 $\alpha\ge2$,
 *   $\beta\ge3$ 이라 **구조적으로 참**이다(걸린 수도 0 — 뜻을 적어 둔 줄이지 가드가 아니다).
 *   ㉡ 「뒤집으면다름」은 대수적으로 $(m\ne n)\wedge(ep\ne pf)$ **와 같은 말**이라
 *   그 둘에 통째로 포함된다. ㉢ 거꾸로 「m≠n」·「조각서로다름」도 «뒤집으면다름」이 대신
 *   물어서 유일 원인이 0 이다 — **셋이 서로를 가리는 한 무리**다. 셋 중 무엇 하나를
 *   지워도 통과 수는 그대로이고, **셋을 다 지우면 8 조합이 새로 들어온다**
 *   (전수 784 에서 통과 249 → 257, 여덟 다 $ep=pf$). 🔴 여기 **214**, 모듈에는
 *   **271** 이라 적혀 있었다 — 서로 달랐고 둘 다 틀렸다(2026-09-04 적대 검문).
 * - `139X` — 다섯 **전부 «유일 원인 0»** 이다. 걸린 수는 α≠60 6 · α≠108 6 ·
 *   값서로다름 6 · **죽임이답을바꿈 0** · 지름길 6. 까닭: $\alpha=60$ 은 「값서로다름」이
 *   같이 물고, $\alpha=108$ 은 「지름길」이 같이 문다(그때 답이 $\alpha$ 와 같아진다).
 *   「죽임이답을바꿈」은 $\alpha>90$ 에서 느슨한 합 $405-\frac{3\alpha}{4}$ 와 참값
 *   $135-\frac{\alpha}{4}$ 가 **절대 같아질 수 없어** 구조적으로 참이다.
 *   즉 이 유형이 실제로 버리는 것은 **$\alpha$ 값 둘**뿐이고 $44\to42$ 다.
 *
 * ## ⑸ 씨앗 블록 넷으로 잰 값 (블록마다 600판)
 *
 * | 유형 | 최빈 정답 | 정답 가짓수 | 해설 최대 px | 변형 폭(바닥) |
 * |---|---|---|---|---|
 * | `136X` | 6.17~7.67% | 30 | **458.0** | 16 / 16 (8) |
 * | `137X` | 6.33~8.50% | 45~46 | **359.0** | 24 / 24 (12) |
 * | `138X` | 5.33~8.83% | 41 | **305.5** | 22~24 / 24 (12) |
 * | `139X` | 3.83~4.17% | 42 | **406.7** | 21~24 / 24 (12) |
 *
 * 한 단은 964.8px 이고 이 시험이 잠그는 문턱은 **700px** 이다 — 가장 큰 것이 458px 이라
 * 여유가 242px 다.
 *
 * ## ⑹ 🔴 변이 시험 — **망가뜨려 봐야 가드인 줄 안다**
 *
 * 회차마다 **음성 대조**(변이 없이 초록)를 루프 **밖에서** 먼저 확인하고, ⑴ 파일이
 * 바뀌었나 ⑵ **산출물이 바뀌었나** ⑶ 그제서야 시험이 빨개지나 를 차례로 물었다.
 * 빨간데 **실패한 시험 이름을 못 대면** 판정을 거부한다. 치환은 **바이트로** 하고
 * 앵커가 정확히 하나일 때만 적용한다. 복원은 **시작할 때 읽어 둔 바이트 그대로**다
 * (이 파일은 아직 커밋 전이라 `git show HEAD:` 로 되돌리면 남의 것으로 덮인다).
 *
 * **24 변이 가운데 19 가 빨강.** 나머지 다섯은 이렇게 갈렸다 — 다섯 다 **가드가 아니다**:
 *
 * 1. **`noTriangleSlopes` 의 「셋째가 첫째와 겹친다」**(M5) — 산출물이 한 글자도 안 바뀌어
 *    하네스가 **판정을 거부**했다. 대수적으로 $c=b_1\Rightarrow a_3=m_1$ 이라 바로 다음
 *    줄이 늘 먼저 문다. 그 줄이 실제로 무는 경로(`includeConcurrent=false`)로 눈금을
 *    **갈아 끼웠다** — 처음 쓴 눈금 `noTriangleSlopes(1, 9, 3, -1, 9)` 은 그 줄을 지워도
 *    통과하는 **도장**이었다.
 * 2. **`138X` 의 「두 조각이 서로 다름」**(M16) — 「뒤집으면 다름」이 같은 조합을 물어
 *    산출물이 그대로다. 둘은 대수적으로 한 무리다(모듈 주석에 식을 적었다).
 * 3·4. **`139X` 의 $\alpha\ne60$·$\alpha\ne108$**(M20·M21) — 각각 「값이 서로 다름」과
 *    「지름길」이 같이 문다. 셋 다 남긴 까닭은 **거부 사유를 정확히 적기** 위해서다.
 * 5. **`139X` 의 「$\alpha$ 는 $4$의 배수」**(M23) — 이것만 $2\times$ 로 바꾸면 **초록**이다.
 *    아래 `Number.isInteger` 가 반각을 걸러 내기 때문이다. 둘은 **한 가드의 두 겹**이라,
 *    **둘을 같이 지우는 변이**를 따로 돌려 **빨강**을 확인했다(지면에 $124.5^\circ$ 가
 *    나가고 「지면을 다시 풀면 같은 답」이 빨개진다). 한 겹만 흔들어 보고 「가드가
 *    아니다」로 적었으면 거짓이 됐을 자리다.
 *
 * 🔴 그리고 **변이가 진짜 결함을 하나 찾아 줬다** — 처음 판에는 「짝합0아님」 가드가
 * 없었고, 시험의 「찍기」 검사가 $m_1+m_2=0$ 인 판에서 **답이 후보 $a_3$ 와 같아지는**
 * 것을 잡았다. 지면 결함이지 시험 결함이 아니었다(⑷ 에 손실을 셌다).
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import { createRng } from "@/lib/elementary/rng";
import { bareNumbers } from "@/lib/elementary/rules";
import { declaredUpperBound } from "@/lib/engine/deriveFormats";
import { renderMathHtml } from "@/lib/math/renderMathHtml";
import { pointsAtFigure } from "@/lib/middle/figureReference";
import {
  generateMiddleProblem,
  generateMiddleSet,
  registeredTypes,
} from "@/lib/middle/generate";
import {
  coefTerm,
  incenterAngle,
  isoscelesTargetAngles,
  lineEquation,
  M2_TOP_5I,
  noTriangleSlopes,
  pageShortcutValues,
  recoverXY,
  signedTerm,
  slopeForm,
  solvePair,
  trapezoidBases,
} from "@/lib/middle/m2Top5i";
import { resolveMiddleTier } from "@/lib/middle/tier";
import type { MidProblem, TypeEntry } from "@/lib/middle/types";
import { estimateSolutionPx } from "@/lib/printOverflow";

import { josaMismatches, pageSmells } from "../helpers/midPage";
import {
  catalogTypesOfMinor,
  extensionNumberReason,
  isCatalogType,
} from "../helpers/rpmCatalog";

/** 브리프가 요구한 최소 표본 200 을 넘긴다. */
const SAMPLE = 240;
/** 해설 높이·정답 쏠림은 씨앗 블록 넷 × 이만큼으로 잰다. */
const WIDE = 600;
const BASE_SEED = 20260904;
/** 한 블록만 보면 여유를 낙관적으로 적게 된다(4차 `36W`·`38W` 가 그 자리다). */
const SEED_BLOCKS = [20260904, 900000, 123456, 5550000];
const SKEW_LIMIT = 12;
/** 등록 뒤 «진짜 파이프라인»으로 다시 재는 씨앗. */
const PRODUCT_SEEDS = [20260904, 13, 4242, 99991, 31337];
const PRODUCT_VARIANTS = [0, 1, 2];

/** 리드가 준 변형 폭 아래 끝. */
const VARIANT_FLOOR: Record<string, number> = {
  "136X": 8,
  "137X": 12,
  "138X": 12,
  "139X": 12,
};

/** 유형은 **번호로** 집는다 — 중단원 이름을 손으로 적으면 조용히 안 잡힌다. */
function entryOf(rpmType: string): TypeEntry {
  const hit = M2_TOP_5I.find((e) => e.rpmType === rpmType);
  if (!hit) throw new Error(`명부에 ${rpmType} 유형이 없다`);
  return hit;
}

const E136 = entryOf("136X");
const E137 = entryOf("137X");
const E138 = entryOf("138X");
const E139 = entryOf("139X");

/** 유형마다 사람이 못 박은 갈래 — 조용히 바뀌면 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  "136X": "심화상",
  "137X": "심화중",
  "138X": "심화중",
  "139X": "심화상",
};

/** 유형마다 붙는 소단원 — 손으로 못 박고, 아래에서 단원 정본에 대조한다. */
const EXPECTED_SECTION: Record<string, string> = {
  "136X": "일차함수와 일차방정식",
  "137X": "여러 가지 연립방정식의 풀이",
  "138X": "평행선 사이의 선분의 길이의 비",
  "139X": "삼각형의 내심",
};

// ── 소품 ────────────────────────────────────────────────────

function rows(entry: TypeEntry, n = SAMPLE, seed = BASE_SEED): MidProblem[] {
  const out: MidProblem[] = [];
  for (let i = 0; i < n; i += 1) {
    out.push(entry.handler(createRng(seed + i * 7919)));
  }
  return out;
}

const registeredKeys = new Set(registeredTypes().map((e) => e.key));

/** 등록되기 전에는 빈 배열 — 그 사실을 검사가 스스로 찍는다. */
function productRows(entry: TypeEntry): MidProblem[] {
  if (!registeredKeys.has(entry.key)) return [];
  const out: MidProblem[] = [];
  for (const s of PRODUCT_SEEDS) {
    for (const v of PRODUCT_VARIANTS)
      out.push(generateMiddleProblem(entry.key, s, v));
  }
  return out;
}

/** 파싱이 안 되면 **던진다** — 조용히 통과시키면 그 유형은 분모 밖이 된다. */
function grab(re: RegExp, text: string, who: string): string[] {
  const m = re.exec(text);
  if (m === null) throw new Error(`${who}: 지면 모양이 다르다 — ${text}`);
  return m.slice(1);
}

const num = (s: string | undefined): number => Number(s);

/** `x`·`-x` 처럼 계수가 생략된 자리를 되읽는다. */
function readCoef(s: string | undefined): number {
  if (s === "" || s === undefined) return 1;
  if (s === "-") return -1;
  return Number(s);
}

/** 답 문자열에서 `$` 만 걷어 낸 것 — 검산기가 이 꼴로 답을 다시 짓는다. */
function plainAnswer(answer: string): string {
  return answer.replace(/\$/g, "");
}

function gcd2(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

function lcm2(a: number, b: number): number {
  return (a / gcd2(a, b)) * b;
}

/** 기약분수 문자열 — 두 분수를 **정확히** 견주려고 쓴다(부동소수를 안 쓴다). */
function fracKey(n: number, d: number): string {
  if (d === 0) return "∞";
  const s = d < 0 ? -1 : 1;
  const g = gcd2(n, d) || 1;
  return `${(s * n) / g}/${(s * d) / g}`;
}

/**
 * 🔴 **「(으)로」가 맞는가** — `josaMismatches` 가 **구조적으로 못 보는 축**이다.
 *
 * 그 자는 을/를·은/는·와/과·가만 본다. 그런데 「(으)로」는 받침 **유무**가 아니라
 * **ㄹ 받침인가**로 갈린다 — 일·칠·팔은 받침이 있어도 「로」다.
 *
 * ⚠️ 규칙은 제품(`m2Josa.euroRo`)에서 **가져오지 않는다** — 그러면 동어반복이라
 *    아무것도 안 지킨다. 여기 다시 적는다.
 */
function euroRoMismatches(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\$[^$]*?(\d+)\$(으로|로)/g)) {
    const d = Number(m[1]) % 10;
    const want = d === 0 || d === 3 || d === 6 ? "으로" : "로";
    if (m[2] !== want) out.push(`$…${m[1]}$${m[2]} → ${want}`);
  }
  return out;
}

/**
 * **지면을 제품 렌더러로 실제로 그려 본다** — 붉거나 중립 폴백이면 참.
 * 판정을 명령 목록으로 하지 않고 **화면과 같은 방식으로 렌더해서** 한다(2026-08-18).
 */
function brokenRender(text: string): boolean {
  const html = renderMathHtml(text);
  return (
    html.includes("katex-error") ||
    html.includes("#cc0000") ||
    html.includes("math-raw")
  );
}

/**
 * 지면에 부등호가 있는가 — 공용 「정수 경계 걸음」 자가 이 갈래에서 **무엇을 못 보는지**
 * 스스로 찍기 위한 자다. 역슬래시는 **바이트로 조립**한다(도구 층이 한 겹 벗긴다).
 */
const BACKSLASH = String.fromCharCode(92);
function hasInequality(text: string): boolean {
  return (
    /[<>]/.test(text) ||
    text.includes(`${BACKSLASH}le`) ||
    text.includes(`${BACKSLASH}ge`) ||
    text.includes(`${BACKSLASH}lt`) ||
    text.includes(`${BACKSLASH}gt`)
  );
}

// ── ㄱ. 해설의 **모든 산술 등식**을 뽑아 좌·우를 각각 계산한다 ──

/** `5\times6+2` 처럼 정수·`+`·`-`·`\times` 만으로 된 식의 값. */
function evalChain(src: string): number {
  const s = src.replace(new RegExp(`${BACKSLASH}${BACKSLASH}times`, "g"), "*");
  const terms = s.match(/^-?\d+(?:\*\d+)*|[+-]\d+(?:\*\d+)*/g);
  if (terms === null) return NaN;
  let total = 0;
  for (const term of terms) {
    const factors = term.split("*");
    let v = Number(factors[0]);
    for (let k = 1; k < factors.length; k += 1) v *= Number(factors[k]);
    total += v;
  }
  return total;
}

const CHAIN_EQ = new RegExp(
  `(?<![${BACKSLASH}w}${BACKSLASH}${BACKSLASH}])(-?${BACKSLASH}d+(?:(?:${BACKSLASH}+|-|${BACKSLASH}${BACKSLASH}times)${BACKSLASH}d+)+)=(-?${BACKSLASH}d+)(?![${BACKSLASH}w${BACKSLASH}d])`,
  "g",
);

/** 해설에 적힌 산술 등식 가운데 **좌변과 우변이 다른** 것. */
function arithmeticFaults(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(CHAIN_EQ)) {
    const left = evalChain(m[1]!);
    const right = Number(m[2]);
    if (!Number.isFinite(left) || left !== right)
      out.push(`${m[1]}=${m[2]} (좌변은 ${left})`);
  }
  return out;
}

/** 이 자가 **몇 개를 실제로 봤는가** — 0 이면 «깨끗»이 아니라 «못 셈»이다. */
function arithmeticClaims(text: string): number {
  return [...text.matchAll(CHAIN_EQ)].length;
}

// ── ㄹ. 기약 ────────────────────────────────────────────────

const FRAC_RE = new RegExp(
  `${BACKSLASH}${BACKSLASH}d?frac${BACKSLASH}{(${BACKSLASH}d+)${BACKSLASH}}${BACKSLASH}{(${BACKSLASH}d+)${BACKSLASH}}`,
  "g",
);

/** 지면의 `\dfrac{수}{수}` 가운데 **기약이 아닌** 것(분모 $1$ 도 결함이다). */
function unreducedFractions(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(FRAC_RE)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (b === 1 || gcd2(a, b) !== 1) out.push(`${a}/${b}`);
  }
  return out;
}

function fractionCount(text: string): number {
  return [...text.matchAll(FRAC_RE)].length;
}

/**
 * 🔴 **분모가 $1$ 인 분수** — `unreducedFractions` 가 **구조적으로 못 보는 축**이다.
 *
 * 그 자는 분자가 «순수 숫자»일 때만 본다. 그런데 `138X` 의 계산 줄은 분자를
 * `\dfrac{7\times6}{1}` 처럼 **곱의 꼴**로 적으므로 그 자의 분모 밖이다 —
 * 값은 맞고 KaTeX 도 초록이라 어느 자도 못 봤고, **표본을 눈으로 읽다가** 찾았다.
 */
const DENOM_ONE_RE = new RegExp(
  `${BACKSLASH}${BACKSLASH}d?frac${BACKSLASH}{[^{}]*${BACKSLASH}}${BACKSLASH}{1${BACKSLASH}}`,
  "g",
);
function denominatorOne(text: string): string[] {
  return [...text.matchAll(DENOM_ONE_RE)].map((m) => m[0]);
}

/** 발문 `$...$` 안의 정수 전부 — 학생이 눈으로 읽는 수와 같은 자리. */
function stemInts(content: string): number[] {
  const out: number[] = [];
  for (const span of content.matchAll(/\$([^$]*)\$/g))
    for (const n of span[1]!.matchAll(/-?\d+/g)) out.push(Number(n[0]));
  return out;
}

/**
 * 한두 번 연산으로 닿는 값 — **제품 `pageShortcutValues` 를 안 부른다.**
 * 부르면 동어반복이라 아무것도 안 지킨다(규칙을 여기 다시 적는다).
 */
function reachedInTwo(nums: readonly number[]): Set<number> {
  const s = new Set<number>();
  for (const a of nums) {
    s.add(a);
    s.add(-a);
  }
  for (const a of nums)
    for (const b of nums) {
      if (a === b) continue;
      s.add(a + b);
      s.add(a - b);
      s.add(a * b);
      if (b !== 0 && a % b === 0) s.add(a / b);
    }
  return s;
}

/** 해설에서 그 조각이 든 줄. 없으면 던진다 — 조용히 건너뛰면 분모 밖이 된다. */
function lineWith(solution: string, needle: string, who: string): string {
  const hit = solution.split("\n").find((l) => l.includes(needle));
  if (hit === undefined)
    throw new Error(`${who}: 「${needle}」가 든 줄이 없다 — ${solution}`);
  return hit;
}

// ── 136X 소품 — 경우를 안 나누고 $a$ 를 **전부 넣어 본다** ────

type Line = { m: number; b: number };

/** 세 직선이 삼각형을 이루는가 — 교점을 **분수로** 구해 서로 다른 점 셋인지 본다. */
function formsTriangle(ls: readonly Line[]): boolean {
  for (let i = 0; i < 3; i += 1)
    for (let j = i + 1; j < 3; j += 1) if (ls[i]!.m === ls[j]!.m) return false; // 평행(일치 포함)이면 삼각형이 아니다
  const keys = new Set<string>();
  for (let i = 0; i < 3; i += 1)
    for (let j = i + 1; j < 3; j += 1)
      keys.add(fracKey(ls[j]!.b - ls[i]!.b, ls[i]!.m - ls[j]!.m));
  return keys.size > 1; // 한 점에서 만나면 교점이 하나뿐이다
}

/** 삼각형이 안 되는 정수 $a$ 를 **넓은 범위에서 전부** 모은다. */
function noTriangleByBruteForce(
  l1: Line,
  l2: Line,
  c: number,
  range = 300,
): number[] {
  const out: number[] = [];
  for (let a = -range; a <= range; a += 1)
    if (!formsTriangle([l1, l2, { m: a, b: c }])) out.push(a);
  return out;
}

// ── 137X 소품 — 치환을 안 하고 $x$, $y$ 로 곧장 편다 ─────────

/**
 * $\dfrac{x+y}{a}+s\dfrac{x-y}{b}=c$ 와 $m(x+y)+n(x-y)=d$ 를 **$x$, $y$ 에 대하여**
 * 풀고, 얻은 해를 **원래 분수식에 정수 곱셈으로 대입해** 참인지 확인한다.
 */
function solveByExpansion(
  a: number,
  b: number,
  s: number,
  c: number,
  m: number,
  n: number,
  d: number,
): [number, number] | null {
  const L = lcm2(a, b);
  const p1 = L / a + (s * L) / b;
  const q1 = L / a - (s * L) / b;
  const r1 = c * L;
  const p2 = m + n;
  const q2 = m - n;
  const det = p1 * q2 - p2 * q1;
  if (det === 0) return null;
  const xn = r1 * q2 - d * q1;
  const yn = p1 * d - p2 * r1;
  if (xn % det !== 0 || yn % det !== 0) return null;
  const x = xn / det;
  const y = yn / det;
  // 원래 식에 **정수 곱셈으로** 대입해 확인한다 (부동소수를 안 쓴다).
  if (b * (x + y) + s * a * (x - y) !== c * a * b) return null;
  if (m * (x + y) + n * (x - y) !== d) return null;
  return [x, y];
}

// ── 138X 소품 — 좌표로 두 조각을 직접 계산하고 $p$, $q$ 를 전부 넣어 본다 ──

/**
 * 사다리꼴을 $B(0,0)$, $C(q,0)$, $A(0,1)$, $D(p,1)$ 로 놓고
 * $E$(=$\overline{AB}$ 를 $m:n$), $F$(=$\overline{DC}$ 를 $m:n$),
 * $P$(=$\overline{AC}$ 와 $\overline{EF}$ 의 교점)의 **가로 좌표**를 직접 계산해
 * 두 조각의 길이를 낸다. 분수를 피하려고 **$s=m+n$ 배한 값**으로 낸다.
 */
function piecesScaled(
  p: number,
  q: number,
  m: number,
  n: number,
): [number, number] {
  const s = m + n;
  const ex = 0; // $E$ 는 $\overline{AB}$ 위 — $A(0,1)$, $B(0,0)$ 이라 가로가 $0$
  const fx = s * p + m * (q - p); // $s\times$($F$ 의 가로)
  const px = m * q; // $s\times$($P$ 의 가로)
  return [px - s * ex, fx - px];
}

/** 두 조각이 지면의 값과 맞는 $(p,q)$ 를 **전부** 모은다. */
function basesByBruteForce(
  m: number,
  n: number,
  ep: number,
  pf: number,
  range = 150,
): [number, number][] {
  const s = m + n;
  const out: [number, number][] = [];
  for (let p = 1; p <= range; p += 1)
    for (let q = 1; q <= range; q += 1) {
      const [a, b] = piecesScaled(p, q, m, n);
      if (a === ep * s && b === pf * s) out.push([p, q]);
    }
  return out;
}

// ── 139X 소품 — 나머지 한 각을 **전부 넣어 본다** ────────────

/**
 * $\angle G=\alpha^\circ$ 인 이등변삼각형에서 $\angle W$ 로 가능한 값을 모두 낸다.
 * 경우를 나누지 않고 $\angle V$ 를 $0.5^\circ$ 씩 훑는다(반각까지 본다).
 */
function targetAnglesByBruteForce(alpha: number): number[] {
  const out = new Set<number>();
  for (let v2 = 1; v2 < 2 * (180 - alpha); v2 += 1) {
    const v = v2 / 2;
    const w = 180 - alpha - v;
    if (w <= 0) continue;
    const eq =
      Math.abs(alpha - v) < 1e-9 ||
      Math.abs(alpha - w) < 1e-9 ||
      Math.abs(v - w) < 1e-9;
    if (eq) out.add(w);
  }
  return [...out].sort((p, q) => p - q);
}

// ── 검산기 — 인자는 `content` 하나뿐이다 ────────────────────

const VERIFY: Record<string, (content: string) => string> = {
  // 136X — $a$ 를 전부 넣어 보고 삼각형이 안 되는 것을 모은다.
  "136X": (content) => {
    const [m1t, b1t, m2t, b2t, ct] = grab(
      /^세 직선 \$(-?\d*)x-y([+-]\d+)=0\$, \$(-?\d*)x-y([+-]\d+)=0\$, \$ax-y([+-]\d+)=0\$이 삼각형을 이루지 않도록 하는 모든 상수 \$a\$의 값의 합을 구하시오\.$/,
      content,
      "136X",
    );
    const l1 = { m: readCoef(m1t), b: num(b1t) };
    const l2 = { m: readCoef(m2t), b: num(b2t) };
    const c = num(ct);
    if (l1.m === l2.m)
      throw new Error(
        "136X: 앞의 두 직선이 이미 평행해 어떤 $a$ 로도 삼각형이 안 된다",
      );
    if (l1.b === 0 || l2.b === 0 || c === 0)
      throw new Error("136X: $y$절편이 $0$ 이라 지면에 `+0` 이 난다");
    if (c === l1.b || c === l2.b)
      throw new Error(
        "136X: 셋째 직선이 다른 직선과 겹칠 수 있어 «평행»이 아니다",
      );
    const found = noTriangleByBruteForce(l1, l2, c);
    if (found.length !== 3)
      throw new Error(
        `136X: 삼각형이 안 되는 $a$ 가 ${found.length}개다 — 셋이어야 한다`,
      );
    if (new Set(found).size !== 3)
      throw new Error("136X: 세 값이 서로 다르지 않다");
    const sum = found.reduce((s, v) => s + v, 0);
    if (sum === 0)
      throw new Error("136X: 합이 $0$ 이라 정답이 한 자리에 몰린다");
    if (reachedInTwo(stemInts(content)).has(sum))
      throw new Error("136X: 발문의 수를 한두 번 굴리면 답이 나온다");
    return String(sum);
  },

  // 137X — 치환하지 않고 $x$, $y$ 로 곧장 펴서 풀고 원식에 대입해 확인한다.
  "137X": (content) => {
    const [at, sgnt, bt, ct, mt, nsgn, nt, dt] = grab(
      /^연립방정식 \$\\begin\{cases\}\\dfrac\{x\+y\}\{(\d+)\}([+-])\\dfrac\{x-y\}\{(\d+)\}=(-?\d+)\\\\(\d+)\(x\+y\)([+-])(\d+)\(x-y\)=(-?\d+)\\end\{cases\}\$의 해를 \$x=p\$, \$y=q\$라 할 때, \$pq\$의 값을 구하시오\.$/,
      content,
      "137X",
    );
    const a = num(at);
    const b = num(bt);
    const s = sgnt === "+" ? 1 : -1;
    const c = num(ct);
    const m = num(mt);
    const n = (nsgn === "+" ? 1 : -1) * num(nt);
    const d = num(dt);
    if (a === b) throw new Error("137X: 두 분모가 같아 통분할 자리가 없다");
    if (Math.abs(n) === m)
      throw new Error("137X: 둘째 식이 한 문자로 접혀 치환할 까닭이 사라진다");
    const sol = solveByExpansion(a, b, s, c, m, n, d);
    if (sol === null)
      throw new Error("137X: 정수 해가 아니거나 대입이 안 맞는다");
    const [x, y] = sol;
    if (x === 0 || y === 0)
      throw new Error("137X: 해에 $0$ 이 있어 곱이 $0$ 이 된다");
    if (Math.abs(x) < 2 || Math.abs(y) < 2)
      throw new Error("137X: 해에 $\\pm1$ 이 있어 지면에 `\\times1` 이 난다");
    if (x + y === 0 || x - y === 0)
      throw new Error("137X: 치환한 문자 하나가 $0$ 이라 걸음이 무너진다");
    const ans = x * y;
    if (reachedInTwo(stemInts(content)).has(ans))
      throw new Error("137X: 발문의 수를 한두 번 굴리면 답이 나온다");
    return String(ans);
  },

  // 138X — 좌표로 두 조각을 계산하고 $(p,q)$ 를 전부 넣어 본다.
  "138X": (content) => {
    const [mt, nt] = grab(
      /\\overline\{AE\}:\\overline\{EB\}=(\d+):(\d+)\$이고/,
      content,
      "138X 비",
    );
    const [ept] = grab(
      /\\overline\{EP\}=(\d+)\\,\\mathrm\{cm\}/,
      content,
      "138X EP",
    );
    const [pft] = grab(
      /\\overline\{PF\}=(\d+)\\,\\mathrm\{cm\}/,
      content,
      "138X PF",
    );
    const m = num(mt);
    const n = num(nt);
    const ep = num(ept);
    const pf = num(pft);
    if (m === n)
      throw new Error(
        "138X: 비가 $1:1$ 이라 두 조각이 어느 삼각형인지 안 갈린다",
      );
    if (gcd2(m, n) !== 1) throw new Error("138X: 비가 기약이 아니다");
    if (ep === pf)
      throw new Error("138X: 두 조각이 같아 어느 밑변인지 안 갈린다");
    const hits = basesByBruteForce(m, n, ep, pf);
    if (hits.length === 0) throw new Error("138X: 그런 사다리꼴이 없다");
    if (hits.length > 1)
      throw new Error(
        `138X: 그런 사다리꼴이 ${hits.length}가지라 답이 안 정해진다`,
      );
    const [p, q] = hits[0]!;
    if (p >= q) throw new Error("138X: 윗변이 아랫변보다 짧지 않다");
    if (p < 6 || q > 72) throw new Error("138X: 길이가 지면에 쓰기 나쁘다");
    const ans = p + q;
    if (reachedInTwo(stemInts(content)).has(ans))
      throw new Error("138X: 발문의 수를 한두 번 굴리면 답이 나온다");
    return `${ans}\\,\\mathrm{cm}`;
  },

  // 139X — 나머지 한 각을 전부 넣어 보고 이등변인 것만 모은다.
  "139X": (content) => {
    const [gt, at, yt, zt] = grab(
      /^\$\\triangle ABC\$는 이등변삼각형이고 \$\\angle ([ABC])=(\d+)\^\\circ\$이다\. 점 \$I\$가 \$\\triangle ABC\$의 내심일 때, \$\\angle ([ABC])I([ABC])\$의 크기로 가능한 값을 모두 구하여 그 합을 구하시오\.$/,
      content,
      "139X",
    );
    const G = gt!;
    const alpha = num(at);
    const W = ["A", "B", "C"].find((t) => t !== yt && t !== zt)!;
    if (yt === zt) throw new Error("139X: 물은 각의 두 꼭짓점이 같다");
    if (G === W)
      throw new Error(
        "139X: 주어진 각이 곧 물은 각을 정해 경우를 나눌 까닭이 없다",
      );
    if (alpha % 2 !== 0)
      throw new Error("139X: 주어진 각이 홀수라 반각이 정수가 아니다");
    if (alpha === 60)
      throw new Error("139X: 정삼각형이라 세 경우가 한 값으로 겹친다");
    const targets = targetAnglesByBruteForce(alpha);
    if (targets.length === 0) throw new Error("139X: 그런 이등변삼각형이 없다");
    const values = targets.map((t) => 90 + t / 2);
    if (values.some((v) => !Number.isInteger(v)))
      throw new Error("139X: 각의 크기가 정수가 아니라 지면에 소수가 난다");
    if (new Set(values).size !== values.length)
      throw new Error("139X: 값이 겹쳐 «모두»가 셋이 아니다");
    const sum = values.reduce((s, v) => s + v, 0);
    if (reachedInTwo(stemInts(content)).has(sum))
      throw new Error("139X: 발문의 수를 한두 번 굴리면 답이 나온다");
    return `${sum}^\\circ`;
  },
};

/** `facts` 만으로 정답 문자열을 다시 짓는다 — 계약 ⑵ 의 왕복 검사. */
function rebuildAnswer(rpmType: string, facts: Record<string, number>): string {
  if (rpmType === "136X") return `$${facts.x}$`;
  if (rpmType === "137X") return `$${facts.x}$`;
  if (rpmType === "138X") return `$${facts.x}\\,\\mathrm{cm}$`;
  if (rpmType === "139X") return `$${facts.x}^\\circ$`;
  throw new Error(`모르는 유형: ${rpmType}`);
}

// ═══════════════════════════════════════════════════════════
// ⑵ 눈금 — 이 자가 «아니오» 를 낼 수 있는가
// ═══════════════════════════════════════════════════════════

/** 양성 — 손으로 지은 지면과 손으로 푼 답. 엔진을 한 번도 안 부른다. */
const POSITIVE: { type: string; content: string; answer: string }[] = [
  {
    // $y=x-10$, $y=3x-14$ 는 $(2,-8)$ 에서 만나고, $y=ax-18$ 이 그 점을 지나면
    // $-8=2a-18$ 에서 $a=5$. 평행 둘은 $a=1$, $a=3$ — 합은 $1+3+5=9$.
    type: "136X",
    content:
      "세 직선 $x-y-10=0$, $3x-y-14=0$, $ax-y-18=0$이 삼각형을 이루지 않도록 하는 모든 상수 $a$의 값의 합을 구하시오.",
    answer: "9",
  },
  {
    // $A=x+y$, $B=x-y$ 로 놓으면 $\frac A2-\frac B3=7$, $2A+3B=2$ → $A=10$, $B=-6$
    // → $x=2$, $y=8$ → $xy=16$. (실제로 $\frac{10}{2}-\frac{-6}{3}=5+2=7$,
    //  $2\times10+3\times(-6)=20-18=2$ 다.)
    type: "137X",
    content:
      "연립방정식 $\\begin{cases}\\dfrac{x+y}{2}-\\dfrac{x-y}{3}=7\\\\2(x+y)+3(x-y)=2\\end{cases}$의 해를 $x=p$, $y=q$라 할 때, $pq$의 값을 구하시오.",
    answer: "16",
  },
  {
    // $m:n=2:3$, $s=5$. $\overline{BC}=15\times5/2$ 는 정수가 아니므로 $EP=12$ 로 잡으면
    // $\overline{BC}=30$, $\overline{PF}=9$ 로 $\overline{AD}=15$ → 합 $45$.
    type: "138X",
    content:
      "$\\overline{AD}\\parallel\\overline{BC}$인 사다리꼴 $ABCD$에서 변 $\\overline{AB}$ 위의 점 $E$와 변 $\\overline{DC}$ 위의 점 $F$를 $\\overline{AE}:\\overline{EB}=2:3$이고 $\\overline{EF}\\parallel\\overline{BC}$가 되도록 잡았다. 대각선 $\\overline{AC}$와 $\\overline{EF}$의 교점을 $P$라 할 때 $\\overline{EP}=12\\,\\mathrm{cm}$, $\\overline{PF}=9\\,\\mathrm{cm}$이다. 이때 $\\overline{AD}+\\overline{BC}$의 길이를 구하시오.",
    answer: "45\\,\\mathrm{cm}",
  },
  {
    // $\angle B=40^\circ$ → $\angle A\in\{40,100,70\}$ → $\angle BIC\in\{110,140,125\}$
    // → 합 $375^\circ$.
    type: "139X",
    content:
      "$\\triangle ABC$는 이등변삼각형이고 $\\angle B=40^\\circ$이다. 점 $I$가 $\\triangle ABC$의 내심일 때, $\\angle BIC$의 크기로 가능한 값을 모두 구하여 그 합을 구하시오.",
    answer: "375^\\circ",
  },
  {
    // $\angle A=100^\circ$ → ⑴⑵ 가 죽고 $\angle C=40^\circ$ 하나 → $\angle AIB=110^\circ$.
    type: "139X",
    content:
      "$\\triangle ABC$는 이등변삼각형이고 $\\angle A=100^\\circ$이다. 점 $I$가 $\\triangle ABC$의 내심일 때, $\\angle AIB$의 크기로 가능한 값을 모두 구하여 그 합을 구하시오.",
    answer: "110^\\circ",
  },
];

/**
 * 음성 — **그 축 하나만** 어긴 지면. 다른 불변식에도 걸리면 그 눈금은 자기 축을
 * 못 재는 것이다(2026-08-25 「음성 눈금은 자기 축을 홀로 갈라야 한다」).
 */
const NEGATIVE: { type: string; why: string; content: string }[] = [
  {
    type: "136X",
    why: "앞의 두 직선이 이미 평행하다",
    content:
      "세 직선 $2x-y+3=0$, $2x-y-1=0$, $ax-y+9=0$이 삼각형을 이루지 않도록 하는 모든 상수 $a$의 값의 합을 구하시오.",
  },
  {
    type: "136X",
    why: "셋째 직선이 첫째와 겹칠 수 있다 ($y$절편이 같다)",
    content:
      "세 직선 $x-y+9=0$, $3x-y-1=0$, $ax-y+9=0$이 삼각형을 이루지 않도록 하는 모든 상수 $a$의 값의 합을 구하시오.",
  },
  {
    type: "136X",
    why: "세 값의 합이 $0$ 이라 정답이 한 자리에 몰린다",
    // $y=x+7$, $y=-4x+2$ 는 $(-1,6)$ 에서 만나고 $y=ax+9$ 가 그 점을 지나면 $a=3$.
    // 합은 $1-4+3=0$.
    content:
      "세 직선 $x-y+7=0$, $-4x-y+2=0$, $ax-y+9=0$이 삼각형을 이루지 않도록 하는 모든 상수 $a$의 값의 합을 구하시오.",
  },
  {
    // 해는 $x=2$, $y=8$ 로 **정수**다 — 이 지면이 어긴 것은 오직 「$|n|=m$」 하나다
    // (음성 눈금은 자기 축을 **홀로** 갈라야 한다).
    type: "137X",
    why: "둘째 식이 $4x=d$ 로 접혀 한 문자가 거저 나온다",
    content:
      "연립방정식 $\\begin{cases}\\dfrac{x+y}{2}-\\dfrac{x-y}{3}=7\\\\2(x+y)+2(x-y)=8\\end{cases}$의 해를 $x=p$, $y=q$라 할 때, $pq$의 값을 구하시오.",
  },
  {
    type: "137X",
    why: "해가 정수가 아니다",
    content:
      "연립방정식 $\\begin{cases}\\dfrac{x+y}{2}-\\dfrac{x-y}{3}=5\\\\2(x+y)+3(x-y)=5\\end{cases}$의 해를 $x=p$, $y=q$라 할 때, $pq$의 값을 구하시오.",
  },
  {
    type: "138X",
    why: "그런 사다리꼴이 없다 (조각이 나누어떨어지지 않는다)",
    content:
      "$\\overline{AD}\\parallel\\overline{BC}$인 사다리꼴 $ABCD$에서 변 $\\overline{AB}$ 위의 점 $E$와 변 $\\overline{DC}$ 위의 점 $F$를 $\\overline{AE}:\\overline{EB}=2:3$이고 $\\overline{EF}\\parallel\\overline{BC}$가 되도록 잡았다. 대각선 $\\overline{AC}$와 $\\overline{EF}$의 교점을 $P$라 할 때 $\\overline{EP}=11\\,\\mathrm{cm}$, $\\overline{PF}=9\\,\\mathrm{cm}$이다. 이때 $\\overline{AD}+\\overline{BC}$의 길이를 구하시오.",
  },
  {
    type: "138X",
    why: "윗변이 아랫변보다 길다",
    // $m:n=2:3$, $EP=24$ → $BC=60$, $PF=42$ → $AD=70$ (윗변이 더 길다)
    content:
      "$\\overline{AD}\\parallel\\overline{BC}$인 사다리꼴 $ABCD$에서 변 $\\overline{AB}$ 위의 점 $E$와 변 $\\overline{DC}$ 위의 점 $F$를 $\\overline{AE}:\\overline{EB}=2:3$이고 $\\overline{EF}\\parallel\\overline{BC}$가 되도록 잡았다. 대각선 $\\overline{AC}$와 $\\overline{EF}$의 교점을 $P$라 할 때 $\\overline{EP}=24\\,\\mathrm{cm}$, $\\overline{PF}=42\\,\\mathrm{cm}$이다. 이때 $\\overline{AD}+\\overline{BC}$의 길이를 구하시오.",
  },
  {
    type: "138X",
    why: "두 조각이 같아 어느 밑변에 걸리는지 안 갈린다",
    // $m:n=2:3$, $EP=PF=6$ → 뒤집어도 합이 같다
    content:
      "$\\overline{AD}\\parallel\\overline{BC}$인 사다리꼴 $ABCD$에서 변 $\\overline{AB}$ 위의 점 $E$와 변 $\\overline{DC}$ 위의 점 $F$를 $\\overline{AE}:\\overline{EB}=2:3$이고 $\\overline{EF}\\parallel\\overline{BC}$가 되도록 잡았다. 대각선 $\\overline{AC}$와 $\\overline{EF}$의 교점을 $P$라 할 때 $\\overline{EP}=6\\,\\mathrm{cm}$, $\\overline{PF}=6\\,\\mathrm{cm}$이다. 이때 $\\overline{AD}+\\overline{BC}$의 길이를 구하시오.",
  },
  {
    type: "139X",
    why: "주어진 각이 물은 각을 곧바로 정해 경우를 나눌 까닭이 없다",
    content:
      "$\\triangle ABC$는 이등변삼각형이고 $\\angle A=40^\\circ$이다. 점 $I$가 $\\triangle ABC$의 내심일 때, $\\angle BIC$의 크기로 가능한 값을 모두 구하여 그 합을 구하시오.",
  },
  {
    type: "139X",
    why: "정삼각형이라 세 경우가 한 값으로 겹친다",
    content:
      "$\\triangle ABC$는 이등변삼각형이고 $\\angle B=60^\\circ$이다. 점 $I$가 $\\triangle ABC$의 내심일 때, $\\angle BIC$의 크기로 가능한 값을 모두 구하여 그 합을 구하시오.",
  },
  {
    type: "139X",
    why: "주어진 각이 홀수라 셋째 경우의 값이 정수가 아니다",
    content:
      "$\\triangle ABC$는 이등변삼각형이고 $\\angle B=41^\\circ$이다. 점 $I$가 $\\triangle ABC$의 내심일 때, $\\angle BIC$의 크기로 가능한 값을 모두 구하여 그 합을 구하시오.",
  },
];

describe("중2 확대 갈래 5차(m2Top5i) — 눈금 (이 자가 «아니오» 를 낼 수 있는가)", () => {
  it("양성 — 손으로 지은 지면에서 손으로 푼 답이 나온다", () => {
    for (const p of POSITIVE) {
      expect(VERIFY[p.type]!(p.content), `${p.type} 양성: ${p.content}`).toBe(
        p.answer,
      );
    }
  });

  it("음성 — 불변식을 어긴 지면은 **던진다**", () => {
    for (const p of NEGATIVE) {
      expect(
        () => VERIFY[p.type]!(p.content),
        `${p.type} 음성(${p.why})이 안 걸렸다`,
      ).toThrow();
    }
  });

  it("🔴 눈금이 네 유형을 **모두** 덮는다 — 안 덮인 유형의 «0» 은 못 셈이다", () => {
    for (const e of M2_TOP_5I) {
      expect(
        POSITIVE.filter((p) => p.type === e.rpmType).length,
        `${e.rpmType} 양성 눈금`,
      ).toBeGreaterThanOrEqual(1);
      expect(
        NEGATIVE.filter((p) => p.type === e.rpmType).length,
        `${e.rpmType} 음성 눈금`,
      ).toBeGreaterThanOrEqual(2);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 명부와 규약
// ═══════════════════════════════════════════════════════════

describe("중2 확대 갈래 5차(m2Top5i) — 명부와 규약", () => {
  it("🔴 유형은 정확히 넷이다 — 말없이 늘리지 못하게 얼린다", () => {
    expect(M2_TOP_5I.map((e) => e.rpmType)).toEqual([
      "136X",
      "137X",
      "138X",
      "139X",
    ]);
    expect(new Set(M2_TOP_5I.map((e) => e.key)).size).toBe(4);
  });

  it("색인 밖 확장 번호 규약을 지킨다 (번호는 색인과 안 겹치고 제목은 새것이다)", () => {
    for (const e of M2_TOP_5I) {
      expect(extensionNumberReason(e), `${e.rpmType} 번호`).toBeNull();
      expect(isCatalogType(e), `${e.rpmType} 는 색인 밖이어야 한다`).toBe(
        false,
      );
      const titles = catalogTypesOfMinor(e.rpmBook, e.rpmMinor).map(
        (t) => t.title,
      );
      expect(titles, `${e.rpmType} 제목이 색인과 겹친다`).not.toContain(
        e.rpmTitle,
      );
    }
  });

  it("🔴 소단원·중단원 이름을 **정본에 대조**한다 — 손으로 옮겨 적은 것을 믿지 않는다", () => {
    const sections = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중2").map((u) => u.section),
    );
    for (const e of M2_TOP_5I) {
      expect(e.grade).toBe("중2");
      expect(sections, `${e.rpmType} 소단원이 단원 정본에 없다`).toContain(
        e.unitSection,
      );
      expect(e.unitSection, `${e.rpmType} 소단원`).toBe(
        EXPECTED_SECTION[e.rpmType]!,
      );
      expect(
        catalogTypesOfMinor(e.rpmBook, e.rpmMinor).length,
        `${e.rpmType} 중단원이 색인에 없다: ${e.rpmBook}|${e.rpmMinor}`,
      ).toBeGreaterThan(0);
    }
  });

  it("책 번호가 소단원의 대단원과 맞는다 (2-1 은 대수, 2-2 는 도형)", () => {
    const chapterOf = new Map(
      CURRICULUM_UNITS.filter((u) => u.grade === "중2").map((u) => [
        u.section,
        u.chapter,
      ]),
    );
    for (const e of M2_TOP_5I) {
      const ch = chapterOf.get(e.unitSection)!;
      const want = /^[1-4]\./.test(ch) ? "2-1" : "2-2";
      expect(e.rpmBook, `${e.rpmType} 책 번호 (${ch})`).toBe(want);
    }
  });

  it("🔴 네 소단원에는 확대 갈래가 **우리 넷뿐**이다 (D-116 은 «빈 소단원»을 채운다)", () => {
    for (const e of M2_TOP_5I) {
      const others = registeredTypes().filter(
        (t) => t.unitSection === e.unitSection && t.rpmType !== e.rpmType,
      );
      for (const o of others) {
        const p = o.handler(createRng(20260904));
        expect(
          ["심화중", "심화상"],
          `${e.unitSection} 에 이미 확대 갈래가 있다: ${o.key}`,
        ).not.toContain(p.difficulty);
      }
    }
  });

  it("키가 다른 모듈의 등록 유형과 겹치지 않는다", () => {
    const mine = new Set(M2_TOP_5I.map((e) => e.key));
    const others = registeredTypes().filter((e) => !M2_TOP_5I.includes(e));
    for (const o of others) {
      expect(mine, `키가 겹친다: ${o.key}`).not.toContain(o.key);
    }
  });

  it("갈래가 못 박은 그대로이고 `resolveMiddleTier` 가 그것을 안 내린다", () => {
    for (const e of M2_TOP_5I) {
      for (const p of rows(e, 40)) {
        expect(p.difficulty, `${e.rpmType} 갈래`).toBe(
          EXPECTED_TIER[e.rpmType]!,
        );
        expect(
          resolveMiddleTier(p.difficulty, p.content, !!p.figureSpec),
          `${e.rpmType} 가 밑단으로 내려갔다`,
        ).toBe(EXPECTED_TIER[e.rpmType]!);
      }
    }
    // 갈래 넷 가운데 «심화중»과 «심화상»이 **둘 다** 있어야 한다 (브리프).
    const tiers = new Set(Object.values(EXPECTED_TIER));
    expect(tiers).toEqual(new Set(["심화중", "심화상"]));
  });
});

// ═══════════════════════════════════════════════════════════
// 지면과 값
// ═══════════════════════════════════════════════════════════

describe("중2 확대 갈래 5차(m2Top5i) — 지면과 값", () => {
  for (const e of M2_TOP_5I) {
    describe(e.rpmType, () => {
      const sample = (): MidProblem[] => rows(e);

      it(`지면을 다시 풀면 같은 답이 나온다 (표본 ${SAMPLE})`, () => {
        for (const p of sample()) {
          expect(VERIFY[e.rpmType]!(p.content), p.content).toBe(
            plainAnswer(p.answer),
          );
        }
      });

      it("`facts` 로 정답 문자열을 다시 지을 수 있다", () => {
        for (const p of sample()) {
          expect(rebuildAnswer(e.rpmType, p.facts), p.content).toBe(p.answer);
        }
      });

      it("지면이 깨끗하다 — 렌더·냄새·조사·(으)로·맨 숫자·그림 지시·상한 선언", () => {
        for (const p of sample()) {
          expect(brokenRender(p.content), `발문 렌더: ${p.content}`).toBe(
            false,
          );
          expect(brokenRender(p.solution), `해설 렌더: ${p.content}`).toBe(
            false,
          );
          expect(pageSmells(p.content), p.content).toEqual([]);
          expect(pageSmells(p.solution), p.content).toEqual([]);
          expect(josaMismatches(p.content), p.content).toEqual([]);
          expect(josaMismatches(p.solution), p.content).toEqual([]);
          expect(euroRoMismatches(p.content), p.content).toEqual([]);
          expect(euroRoMismatches(p.solution), p.content).toEqual([]);
          expect(bareNumbers(p.content), p.content).toEqual([]);
          expect(bareNumbers(p.solution), p.content).toEqual([]);
          expect(pointsAtFigure(p.content), p.content).toBeNull();
          expect(p.figureSpec, p.content).toBeNull();
          // ㉱ 발문이 스스로 상한을 못 박지 않는다 (파생 오답이 넘을 자리가 없다).
          expect(declaredUpperBound(p.content), p.content).toBeNull();
          // 우리말 — 「그중」은 붙여 쓴다.
          expect(p.solution, p.content).not.toContain("그 중");
          // 마크다운 굵게 표시는 지면에 그대로 나간다.
          expect(p.solution, p.content).not.toContain("**");
        }
      });

      it("🔴 ㉯ 부등식을 한 줄도 안 쓴다 — 공용 「정수 경계」 자에게 «잴 것이 없다»", () => {
        for (const p of sample()) {
          expect(hasInequality(p.content), p.content).toBe(false);
          expect(hasInequality(p.solution), p.content).toBe(false);
        }
        // 자가 살아 있는가 — 부등호가 있는 글은 참이라고 답한다.
        expect(hasInequality(`$2x${BACKSLASH}ge5$이다.`)).toBe(true);
      });

      it("🔴 해설의 산술 등식을 좌·우 따로 계산해 맞댄다 (그리고 몇 개를 봤는지 센다)", () => {
        let seen = 0;
        for (const p of sample()) {
          expect(arithmeticFaults(p.solution), p.content).toEqual([]);
          seen += arithmeticClaims(p.solution);
        }
        // 0 은 «깨끗»이 아니라 «못 셈»이다 — 판마다 **적어도 하나**는 봐야 한다.
        expect(seen, `${e.rpmType} 이 자가 본 등식 수`).toBeGreaterThanOrEqual(
          SAMPLE,
        );
        // 자가 살아 있는가 — 틀린 등식은 잡는다.
        expect(arithmeticFaults("$2+3=6$이다.")).toHaveLength(1);
      });

      it("🔴 지면의 모든 분수가 기약이다 (그리고 몇 개를 봤는지 센다)", () => {
        let seen = 0;
        for (const p of sample()) {
          expect(unreducedFractions(p.content), p.content).toEqual([]);
          expect(unreducedFractions(p.solution), p.content).toEqual([]);
          // 🔴 분모가 $1$ 인 분수 — 위 자가 **구조적으로 못 보는** 자리다.
          expect(denominatorOne(p.content), p.content).toEqual([]);
          expect(denominatorOne(p.solution), p.content).toEqual([]);
          seen += fractionCount(p.content) + fractionCount(p.solution);
        }
        if (e.rpmType === "139X") {
          // 이 유형만 «숫자/숫자» 분수를 쓴다 ($\dfrac12$). 나머지 셋의 0 은
          // «못 셈»이 아니라 **«잴 것이 없다»** 다 — 그 사실을 여기 찍는다.
          expect(seen, "139X 가 본 분수 수").toBeGreaterThan(SAMPLE);
        } else {
          expect(seen, `${e.rpmType} 는 숫자 분수를 안 쓴다`).toBe(0);
        }
        // 자가 살아 있는가.
        expect(unreducedFractions(`$${BACKSLASH}dfrac{4}{6}$`)).toEqual([
          "4/6",
        ]);
        expect(unreducedFractions(`$${BACKSLASH}dfrac{4}{1}$`)).toEqual([
          "4/1",
        ]);
        // 🔴 그리고 **곱의 꼴 분자**는 위 자가 못 본다 — 그 자리를 이 자가 잡는다.
        expect(
          unreducedFractions(`$${BACKSLASH}dfrac{7${BACKSLASH}times6}{1}$`),
        ).toEqual([]);
        expect(
          denominatorOne(`$${BACKSLASH}dfrac{7${BACKSLASH}times6}{1}$`),
        ).toHaveLength(1);
        expect(
          denominatorOne(`$${BACKSLASH}dfrac{7${BACKSLASH}times6}{5}$`),
        ).toEqual([]);
      });

      it("🔴 해설이 걸음을 건너뛰지 않는다 (D-116 ⑹)", () => {
        for (const p of sample()) {
          const lines = p.solution.split("\n").filter((l) => l.trim() !== "");
          expect(lines.length, `${e.rpmType} 해설 줄`).toBeGreaterThanOrEqual(
            6,
          );
          expect(
            p.solution.length,
            `${e.rpmType} 해설이 너무 짧다`,
          ).toBeGreaterThan(200);
          const conclusion = lines.findIndex((l) => l.startsWith("따라서"));
          expect(
            conclusion,
            `${e.rpmType} 「따라서」 결론 줄이 없다`,
          ).toBeGreaterThan(0);
          expect(
            lines.length - conclusion,
            `${e.rpmType} 결론이 너무 앞에 있다`,
          ).toBeLessThanOrEqual(2);
          const middle = lines.slice(1, conclusion);
          expect(middle.join("\n"), `${e.rpmType} 중간 결과가 없다`).toMatch(
            /\$/,
          );
          expect(
            middle.length,
            `${e.rpmType} 중간 걸음이 모자라다`,
          ).toBeGreaterThanOrEqual(4);
        }
      });

      it(`🔴 해설이 정답지 한 단을 안 넘는다 — 블록 넷 × ${WIDE}판에서 700px 미만`, () => {
        let worst = 0;
        let where = "";
        for (const block of SEED_BLOCKS) {
          for (const p of rows(e, WIDE, block)) {
            const px = estimateSolutionPx(p.solution);
            if (px > worst) {
              worst = px;
              where = p.content;
            }
          }
        }
        expect(worst, `${e.rpmType} 가장 큰 해설 — ${where}`).toBeLessThan(700);
        // 자가 살아 있는가 — 억지로 부풀린 해설은 넘는다고 답한다.
        const huge = Array.from({ length: 80 }, (_v, i) => `${i}단계.`).join(
          "\n",
        );
        expect(estimateSolutionPx(huge)).toBeGreaterThan(700);
      });

      it(`🔴 변형 폭과 정답 쏠림 (씨앗 블록 ${SEED_BLOCKS.length} × ${WIDE}판)`, () => {
        const floor = VARIANT_FLOOR[e.rpmType]!;
        for (const block of SEED_BLOCKS) {
          const seen = new Set<string>();
          for (let v = 0; v < floor * 2; v += 1)
            seen.add(e.handler(createRng(block + 12345 + v * 0x9e37)).content);
          expect(
            seen.size,
            `${e.rpmType} 변형 폭 (블록 ${block})`,
          ).toBeGreaterThanOrEqual(floor);
        }
        for (const block of SEED_BLOCKS) {
          const counts = new Map<string, number>();
          const contents = new Set<string>();
          const solutions = new Set<string>();
          for (const p of rows(e, WIDE, block)) {
            counts.set(p.answer, (counts.get(p.answer) ?? 0) + 1);
            contents.add(p.content);
            solutions.add(p.solution);
          }
          expect(
            contents.size,
            `${e.rpmType} 서로 다른 발문 (블록 ${block})`,
          ).toBeGreaterThan(60);
          expect(
            solutions.size,
            `${e.rpmType} 서로 다른 해설 (블록 ${block})`,
          ).toBeGreaterThan(60);
          expect(
            counts.size,
            `${e.rpmType} 서로 다른 정답 (블록 ${block})`,
          ).toBeGreaterThan(15);
          const top = (Math.max(...counts.values()) / WIDE) * 100;
          expect(top, `${e.rpmType} 최빈 정답 (블록 ${block})`).toBeLessThan(
            SKEW_LIMIT,
          );
        }
      });

      it("등록되면 진짜 파이프라인으로도 같은 계약을 지킨다", () => {
        const produced = productRows(e);
        if (produced.length === 0) {
          // 🟡 아직 리드가 `generate.ts` 에 안 넣었다. 「검사가 돌았다」와
          //    「검사가 볼 것이 없었다」를 가르려고 그 사실을 여기 적어 둔다.
          expect(registeredKeys.has(e.key)).toBe(false);
          return;
        }
        for (const p of produced) {
          expect(VERIFY[e.rpmType]!(p.content), p.content).toBe(
            plainAnswer(p.answer),
          );
          expect(p.difficulty).toBe(EXPECTED_TIER[e.rpmType]);
          expect(pageSmells(p.solution)).toEqual([]);
        }
        expect(
          new Set(
            generateMiddleSet(e.key, BASE_SEED, VARIANT_FLOOR[e.rpmType]!).map(
              (p) => p.content,
            ),
          ).size,
        ).toBe(VARIANT_FLOOR[e.rpmType]!);
      });
    });
  }
});

// ═══════════════════════════════════════════════════════════
// 🔴 해설의 **중간값**과 **말** — 앞 물결들의 치명 결함이 난 자리
// ═══════════════════════════════════════════════════════════

describe("중2 확대 갈래 5차(m2Top5i) — 해설의 중간값을 다른 길로 다시 잰다", () => {
  it("`136X` — 두 평행 갈래와 교점 갈래를 **지면 글자로** 다시 재고 합 줄과 맞댄다", () => {
    for (const p of rows(E136)) {
      const [m1t, b1t, m2t, b2t, ct] = grab(
        /^세 직선 \$(-?\d*)x-y([+-]\d+)=0\$, \$(-?\d*)x-y([+-]\d+)=0\$, \$ax-y([+-]\d+)=0\$이/,
        p.content,
        "136X 발문",
      );
      const m1 = readCoef(m1t);
      const b1 = num(b1t);
      const m2 = readCoef(m2t);
      const b2 = num(b2t);
      const c = num(ct);

      // 기울기 나열 줄 — 지면이 스스로 적은 기울기가 식과 맞는가.
      const slopeLine = lineWith(p.solution, "기울기는 차례로", p.content);
      const [s1, s2] = grab(
        /기울기는 차례로 \$(-?\d+)\$, \$(-?\d+)\$, \$a\$이다\./,
        slopeLine,
        "136X 기울기",
      );
      expect(num(s1), p.content).toBe(m1);
      expect(num(s2), p.content).toBe(m2);

      // 교점 줄 — 두 식을 **여기서 다시 풀어** 교점을 구한다.
      const interLine = lineWith(p.solution, "교점은", p.content);
      const [ix, iy, eq, a3t] = grab(
        /교점은 \$\((-?\d+),\\ (-?\d+)\)\$이고, 셋째 직선이 이 점을 지나면 \$(-?\d+=[^$]+)\$이므로 \$a=(-?\d+)\$이다\./,
        interLine,
        "136X 교점",
      );
      const xNum = b2 - b1;
      const xDen = m1 - m2;
      expect(fracKey(num(ix), 1), p.content).toBe(fracKey(xNum, xDen));
      expect(num(iy), p.content).toBe(m1 * num(ix) + b1);
      // 「이 점을 지나면」 등식이 실제로 그 $a$ 에서만 참인가.
      const a3 = num(a3t);
      expect(num(iy), `${p.content} — 교점 등식`).toBe(a3 * num(ix) + c);
      expect(eq, p.content).toContain(`${iy}=`);

      // 평행 두 줄 — $y$절편이 실제로 다른가(㉴ 스스로 세운 제약을 지키는가).
      for (const [aVal, other] of [
        [m1, b1],
        [m2, b2],
      ] as const) {
        const line = lineWith(p.solution, `$a=${aVal}$이면`, p.content);
        const [c1, c2] = grab(
          /\$y\$절편은 \$(-?\d+)\$[와과] \$(-?\d+)\$/,
          line,
          "136X 절편",
        );
        expect(num(c1), p.content).toBe(c);
        expect(num(c2), p.content).toBe(other);
        expect(num(c1), `${p.content} — 절편이 같으면 평행이 아니다`).not.toBe(
          num(c2),
        );
      }

      // 나열 줄 ↔ 합 줄 — 셋을 서로 맞댄다.
      const listLine = lineWith(p.solution, "구한 세 값", p.content);
      const [l1, l2, l3] = grab(
        /구한 세 값 \$(-?\d+)\$, \$(-?\d+)\$, \$(-?\d+)\$[은는]/,
        listLine,
        "136X 나열",
      );
      expect(
        [num(l1), num(l2), num(l3)].sort((x, y) => x - y),
        p.content,
      ).toEqual([m1, m2, a3].sort((x, y) => x - y));
      const sumLine = lineWith(p.solution, "따라서 구하는 합은", p.content);
      const [sumT] = grab(/=(-?\d+)\$이다\./, sumLine, "136X 합");
      expect(num(sumT), p.content).toBe(m1 + m2 + a3);
      expect(p.answer).toBe(`$${m1 + m2 + a3}$`);
    }
  });

  it("`137X` — 치환·통분·가감·되돌림 네 줄을 **펴서 푼 값**과 맞댄다", () => {
    for (const p of rows(E137)) {
      const [at, sgnt, bt, ct, mt, nsgn, nt, dt] = grab(
        /^연립방정식 \$\\begin\{cases\}\\dfrac\{x\+y\}\{(\d+)\}([+-])\\dfrac\{x-y\}\{(\d+)\}=(-?\d+)\\\\(\d+)\(x\+y\)([+-])(\d+)\(x-y\)=(-?\d+)\\end\{cases\}\$/,
        p.content,
        "137X 발문",
      );
      const a = num(at);
      const b = num(bt);
      const s = sgnt === "+" ? 1 : -1;
      const c = num(ct);
      const m = num(mt);
      const n = (nsgn === "+" ? 1 : -1) * num(nt);
      const d = num(dt);
      const sol = solveByExpansion(a, b, s, c, m, n, d)!;
      const [x, y] = sol;

      // 통분 줄 — 양변에 곱한 수가 실제 최소공배수인가.
      const clearLine = lineWith(p.solution, "분모를 없애면", p.content);
      const [lt] = grab(
        /양변에 \$(\d+)\$[을를] 곱하여/,
        clearLine,
        "137X 통분",
      );
      expect(num(lt), p.content).toBe(lcm2(a, b));

      // 치환 결과 줄 — $A$, $B$ 가 실제 해와 맞는가.
      const backLine = lineWith(p.solution, "즉 $x+y=", p.content);
      const [ut, vt] = grab(
        /즉 \$x\+y=(-?\d+)\$, \$x-y=(-?\d+)\$이다\./,
        backLine,
        "137X A,B",
      );
      expect(num(ut), p.content).toBe(x + y);
      expect(num(vt), p.content).toBe(x - y);

      // 되돌림 줄 — 「$2$로 나눈다」가 실제로 적혀 있고 값이 맞는가.
      const recoverLine = lineWith(p.solution, "변끼리 더하면 $2x=", p.content);
      const [twoX, xv, twoY, yv] = grab(
        /변끼리 더하면 \$2x=(-?\d+)\$이므로 \$x=(-?\d+)\$이고, 변끼리 빼면 \$2y=(-?\d+)\$이므로 \$y=(-?\d+)\$이다\./,
        recoverLine,
        "137X 되돌림",
      );
      expect(num(twoX), p.content).toBe(2 * x);
      expect(num(xv), p.content).toBe(x);
      expect(num(twoY), p.content).toBe(2 * y);
      expect(num(yv), p.content).toBe(y);

      // 결론 줄.
      const last = lineWith(p.solution, "따라서 $pq=xy=", p.content);
      const [prod] = grab(/=(-?\d+)\$이다\./, last, "137X 곱");
      expect(num(prod), p.content).toBe(x * y);
      expect(p.answer).toBe(`$${x * y}$`);
    }
  });

  it("`138X` — 두 비례식과 두 밑변을 **좌표로 다시 재고** 합 줄과 맞댄다", () => {
    for (const p of rows(E138)) {
      const [mt, nt] = grab(
        /\\overline\{AE\}:\\overline\{EB\}=(\d+):(\d+)\$이고/,
        p.content,
        "138X 비",
      );
      const [ept] = grab(/\\overline\{EP\}=(\d+)\\,/, p.content, "138X EP");
      const [pft] = grab(/\\overline\{PF\}=(\d+)\\,/, p.content, "138X PF");
      const m = num(mt);
      const n = num(nt);
      const s = m + n;
      const hits = basesByBruteForce(m, n, num(ept), num(pft));
      expect(hits.length, p.content).toBe(1);
      const [ad, bc] = hits[0]!;

      const bcLine = lineWith(
        p.solution,
        "$\\overline{BC}=\\dfrac{",
        p.content,
      );
      const [e1, s1, m1, bcT] = grab(
        /\\overline\{BC\}=\\dfrac\{(\d+)\\times(\d+)\}\{(\d+)\}=(\d+)\\,/,
        bcLine,
        "138X BC",
      );
      expect(num(e1), p.content).toBe(num(ept));
      expect(num(s1), p.content).toBe(s);
      expect(num(m1), p.content).toBe(m);
      expect(num(bcT), p.content).toBe(bc);

      const adLine = lineWith(
        p.solution,
        "$\\overline{AD}=\\dfrac{",
        p.content,
      );
      const [f1, s2, n1, adT] = grab(
        /\\overline\{AD\}=\\dfrac\{(\d+)\\times(\d+)\}\{(\d+)\}=(\d+)\\,/,
        adLine,
        "138X AD",
      );
      expect(num(f1), p.content).toBe(num(pft));
      expect(num(s2), p.content).toBe(s);
      expect(num(n1), p.content).toBe(n);
      expect(num(adT), p.content).toBe(ad);

      // 🔴 뒤 조각이 **$n$** 에, 앞 조각이 **$m$** 에 걸려야 한다 — 뒤집히면 여기서 잡힌다.
      expect(num(m1), `${p.content} — 앞뒤가 뒤집혔다`).not.toBe(num(n1));

      const sumLine = lineWith(
        p.solution,
        "따라서 $\\overline{AD}+",
        p.content,
      );
      const [x1, x2, tot] = grab(
        /=(\d+)\+(\d+)=(\d+)\\,\\mathrm\{cm\}\$이다\./,
        sumLine,
        "138X 합",
      );
      expect(num(x1), p.content).toBe(ad);
      expect(num(x2), p.content).toBe(bc);
      expect(num(tot), p.content).toBe(ad + bc);
      expect(p.answer).toBe(`$${ad + bc}\\,\\mathrm{cm}$`);
    }
  });

  it("`139X` — 세 경우와 죽는 까닭을 **훑어서 다시 재고** 나열·합을 맞댄다", () => {
    let deadSeen = 0;
    let aliveSeen = 0;
    for (const p of rows(E139)) {
      const [gt, at, yt, zt] = grab(
        /^\$\\triangle ABC\$는 이등변삼각형이고 \$\\angle ([ABC])=(\d+)\^\\circ\$이다\. 점 \$I\$가 \$\\triangle ABC\$의 내심일 때, \$\\angle ([ABC])I([ABC])\$의/,
        p.content,
        "139X 발문",
      );
      const alpha = num(at);
      const W = ["A", "B", "C"].find((t) => t !== yt && t !== zt)!;
      expect(gt, p.content).not.toBe(W);
      const targets = targetAnglesByBruteForce(alpha);
      const values = targets.map((t) => 90 + t / 2);

      // 내심 성질 줄 — 물은 각이 걸린 꼭짓점을 지면이 옳게 짚는가.
      const propLine = lineWith(p.solution, "내심이면", p.content);
      expect(propLine, p.content).toContain(`\\angle ${W}$`);
      expect(propLine, p.content).toContain("90^\\circ+\\dfrac{1}{2}");

      if (alpha < 90) {
        aliveSeen += 1;
        expect(values.length, p.content).toBe(3);
        const listLine = lineWith(p.solution, "구한 세 값", p.content);
        const [v1, v2, v3] = grab(
          /구한 세 값 \$(\d+)\^\\circ\$, \$(\d+)\^\\circ\$, \$(\d+)\^\\circ\$는/,
          listLine,
          "139X 나열",
        );
        expect(
          [num(v1), num(v2), num(v3)].sort((x, y) => x - y),
          p.content,
        ).toEqual([...values].sort((x, y) => x - y));
        const sumLine = lineWith(p.solution, "세 값의 합은", p.content);
        const [w1, w2, w3, tot] = grab(
          /세 값의 합은 \$(\d+)\+(\d+)\+(\d+)=(\d+)\$이다\./,
          sumLine,
          "139X 합",
        );
        // 나열 줄 ↔ 합 줄이 **같은 세 값**인가 (둘만 맞대면 목록이 빈 해설이 산다).
        expect([num(w1), num(w2), num(w3)], p.content).toEqual([
          num(v1),
          num(v2),
          num(v3),
        ]);
        expect(num(tot), p.content).toBe(values.reduce((s, v) => s + v, 0));
        // ㉴ 죽은 값이 나열에 섞이지 않았는가 — 여기서는 죽는 경우가 없다.
        expect(p.solution, p.content).toContain("이런 삼각형이 있다");
        expect(p.solution, p.content).not.toContain("이런 삼각형은 없다");
      } else {
        deadSeen += 1;
        expect(values.length, p.content).toBe(1);
        expect(p.solution, p.content).toContain("각의 크기가 될 수 없다");
        expect(p.solution, p.content).toContain("이런 삼각형은 없다");
        // ㉴ 죽은 값(90+rest/2)이 답에 섞이지 않았는가.
        const dead = 90 + (180 - 2 * alpha) / 2;
        expect(plainAnswer(p.answer), p.content).not.toBe(`${dead}^\\circ`);
        expect(Number(/\d+/.exec(p.answer)![0]), p.content).toBe(values[0]);
      }
      expect(plainAnswer(p.answer), p.content).toBe(
        `${values.reduce((s, v) => s + v, 0)}^\\circ`,
      );
    }
    // 두 갈래가 **둘 다** 표본에 있었는가 — 한쪽만 나오면 그 축을 못 잰 것이다.
    expect(aliveSeen, "α<90 판").toBeGreaterThan(20);
    expect(deadSeen, "α>90 판").toBeGreaterThan(20);
  });
});

// ═══════════════════════════════════════════════════════════
// ㉳ 해설의 «말» — 낱말을 뒤집으면 빨개진다
// ═══════════════════════════════════════════════════════════

/** 유형마다 「왜 그런가」를 진술하는 줄이 반드시 들고 있어야 하는 낱말. */
const LOGIC_WORDS: Record<string, string[]> = {
  "136X": [
    "평행한 경우와",
    "한 점에서 만나는 경우뿐이다",
    "평행해야 한다",
    "$y$절편은",
    "서로 다르므로 두 직선이 평행하다",
    "서로 다르므로 조건을 만족시키는",
  ],
  "137X": [
    "되풀이되므로",
    "로 놓으면",
    "분모를 없애면",
    "없애기 위해",
    "변끼리 더하면 $2x=",
    "변끼리 빼면 $2y=",
  ],
  "138X": [
    "두 조각을 따로 본다",
    "걸려 있으므로",
    "\\parallel\\overline{BC}$이고",
    "\\parallel\\overline{AD}$이므로",
    "\\overline{AP}:\\overline{PC}=\\overline{AE}:\\overline{EB}",
  ],
  "139X": ["크기가 같은 두 각이 있고", "세 가지 경우로 나뉜다", "내심이면"],
};

/** 그 낱말이 빠진 자리 — 없으면 빈 배열. */
function logicWordFaults(rpmType: string, solution: string): string[] {
  return LOGIC_WORDS[rpmType]!.filter((w) => !solution.includes(w));
}

describe("중2 확대 갈래 5차(m2Top5i) — ㉳ 해설의 «말»이 «왜 그런가»를 옳게 진술한다", () => {
  it("전량에 그 줄이 있다 (블록 넷 × 200판)", () => {
    for (const e of M2_TOP_5I) {
      for (const block of SEED_BLOCKS) {
        for (const p of rows(e, 200, block)) {
          expect(logicWordFaults(e.rpmType, p.solution), p.content).toEqual([]);
        }
      }
    }
  });

  it("눈금 — 낱말을 **뒤집으면** 전부 빨개진다 (양성 4 · 음성 다수)", () => {
    // 양성 — 손 안 댄 해설은 깨끗하다.
    for (const e of M2_TOP_5I) {
      const p = e.handler(createRng(BASE_SEED));
      expect(logicWordFaults(e.rpmType, p.solution), e.rpmType).toEqual([]);
    }
    // 음성 — 낱말 하나를 뒤집으면 잡힌다.
    const flips: [string, string, string][] = [
      ["136X", "평행", "수직"],
      ["136X", "서로 다르므로", "서로 같으므로"],
      ["136X", "$y$절편", "$x$절편"],
      ["137X", "되풀이되므로", "한 번씩 나오므로"],
      ["137X", "분모를 없애면", "분자를 없애면"],
      ["137X", "변끼리 더하면 $2x=", "변끼리 더하면 $x="],
      ["138X", "두 조각을 따로 본다", "두 조각을 같이 본다"],
      [
        "138X",
        "\\overline{AP}:\\overline{PC}",
        "\\overline{AP}:\\overline{PB}",
      ],
      ["139X", "크기가 같은 두 각이 있고", "크기가 다른 두 각이 있고"],
      ["139X", "세 가지", "두 가지"],
    ];
    for (const [type, from, to] of flips) {
      const e = entryOf(type);
      const p = e.handler(createRng(BASE_SEED));
      const broken = p.solution.split(from).join(to);
      expect(
        broken,
        `${type}: 「${from}」가 해설에 없다 — 눈금이 죽었다`,
      ).not.toBe(p.solution);
      expect(
        logicWordFaults(type, broken).length,
        `${type}: 「${from}」→「${to}」를 못 잡는다`,
      ).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// ㉠ 찍기로 맞을 수 있는가 · ㉡ 굳힘을 지우면 답이 바뀌는가
// ═══════════════════════════════════════════════════════════

describe("중2 확대 갈래 5차(m2Top5i) — ㉠ 찍기로 맞을 수 있는가", () => {
  it("`136X` — 세 후보 가운데 어느 하나를 집어도 답이 아니다", () => {
    for (const p of rows(E136)) {
      const sum = p.facts.x!;
      for (const k of ["m1", "m2", "a3"] as const) {
        expect(p.facts[k], p.content).not.toBe(sum);
      }
      // 발문에 찍힌 수를 한두 번 굴려도 답이 안 나온다 (제품 함수를 안 부른다).
      expect(reachedInTwo(stemInts(p.content)).has(sum), p.content).toBe(false);
    }
  });

  it("`137X` — 치환한 문자 $A$, $B$ 를 그대로 답으로 써도 틀린다", () => {
    for (const p of rows(E137)) {
      const ans = p.facts.x!;
      expect(p.facts.u, p.content).not.toBe(ans);
      expect(p.facts.v, p.content).not.toBe(ans);
      expect(p.facts.xv, p.content).not.toBe(ans);
      expect(p.facts.yv, p.content).not.toBe(ans);
      expect(reachedInTwo(stemInts(p.content)).has(ans), p.content).toBe(false);
    }
  });

  it("`138X` — 두 밑변 어느 하나도, 두 조각의 합도 답이 아니다", () => {
    for (const p of rows(E138)) {
      const ans = p.facts.x!;
      expect(p.facts.ad, p.content).not.toBe(ans);
      expect(p.facts.bc, p.content).not.toBe(ans);
      expect(p.facts.ef, p.content).not.toBe(ans);
      expect(reachedInTwo(stemInts(p.content)).has(ans), p.content).toBe(false);
    }
  });

  it("🔴 `139X` — $\\alpha<90$ 에서만 걸 수 있다 (α>90 은 후보가 하나뿐이다)", () => {
    let checked = 0;
    let inherent = 0;
    for (const p of rows(E139)) {
      const alpha = p.facts.alpha!;
      const values = targetAnglesByBruteForce(alpha).map((t) => 90 + t / 2);
      if (alpha < 90) {
        checked += 1;
        for (const v of values) expect(v, p.content).not.toBe(p.facts.x);
      } else {
        // 후보가 하나뿐이면 답이 곧 그 후보다 — 피할 수 없다. 그 사실을 **센다.**
        inherent += 1;
        expect(values.length, p.content).toBe(1);
        expect(values[0], p.content).toBe(p.facts.x);
      }
      expect(reachedInTwo(stemInts(p.content)).has(p.facts.x!), p.content).toBe(
        false,
      );
    }
    expect(checked, "α<90 판을 하나도 못 봤다").toBeGreaterThan(20);
    expect(inherent, "α>90 판을 하나도 못 봤다").toBeGreaterThan(20);
  });
});

describe("중2 확대 갈래 5차(m2Top5i) — ㉡ 굳힘을 지우면 답이 바뀌는가", () => {
  it("`136X` — 「한 점에서 만나는 경우」를 빼면 합이 달라진다", () => {
    let bit = 0;
    for (const p of rows(E136, 60)) {
      const full = noTriangleSlopes(
        p.facts.m1!,
        p.facts.b1!,
        p.facts.m2!,
        p.facts.b2!,
        p.facts.c!,
      )!;
      const lame = noTriangleSlopes(
        p.facts.m1!,
        p.facts.b1!,
        p.facts.m2!,
        p.facts.b2!,
        p.facts.c!,
        false,
      )!;
      expect(
        full.reduce((s, v) => s + v, 0),
        p.content,
      ).toBe(p.facts.x);
      if (lame.reduce((s, v) => s + v, 0) !== p.facts.x) bit += 1;
    }
    expect(bit, "굳힘을 지워도 답이 그대로인 판만 있었다").toBe(60);
  });

  it("`137X` — 「$2$로 나눈다」를 빼면 $xy$ 가 네 배가 된다", () => {
    for (const p of rows(E137, 60)) {
      const good = recoverXY(p.facts.u!, p.facts.v!)!;
      const lame = recoverXY(p.facts.u!, p.facts.v!, false)!;
      expect(good[0] * good[1], p.content).toBe(p.facts.x);
      expect(lame[0] * lame[1], p.content).toBe(4 * p.facts.x!);
    }
  });

  it("`138X` — 앞뒤 조각을 뒤집어 걸면 두 밑변의 합이 달라진다", () => {
    let bit = 0;
    for (const p of rows(E138, 60)) {
      const good = trapezoidBases(
        p.facts.m!,
        p.facts.n!,
        p.facts.ep!,
        p.facts.pf!,
      )!;
      expect(good.ad + good.bc, p.content).toBe(p.facts.x);
      const flip = trapezoidBases(
        p.facts.m!,
        p.facts.n!,
        p.facts.ep!,
        p.facts.pf!,
        false,
      );
      if (flip === null || flip.ad + flip.bc !== p.facts.x) bit += 1;
    }
    expect(bit, "뒤집어도 같은 답인 판만 있었다").toBe(60);
  });

  it("🔴 `139X` — 「양수가 아니면 없다」를 빼면 α>90 판에서만 답이 바뀐다", () => {
    let changed = 0;
    let same = 0;
    for (const p of rows(E139, 120)) {
      const alpha = p.facts.alpha!;
      const good = isoscelesTargetAngles(alpha)!
        .map(incenterAngle)
        .reduce((s, v) => s + v, 0);
      const loose = isoscelesTargetAngles(alpha, false)!
        .map(incenterAngle)
        .reduce((s, v) => s + v, 0);
      expect(good, p.content).toBe(p.facts.x);
      if (loose === good) {
        same += 1;
        expect(alpha, `${p.content} — α<90 이면 죽는 후보가 없다`).toBeLessThan(
          90,
        );
      } else {
        changed += 1;
        expect(
          alpha,
          `${p.content} — α>90 에서만 달라져야 한다`,
        ).toBeGreaterThan(90);
      }
    }
    // 두 갈래가 **둘 다** 있었는가 — 한쪽만 보면 그 축을 못 잰 것이다.
    expect(changed, "α>90 판이 없었다").toBeGreaterThan(10);
    expect(same, "α<90 판이 없었다").toBeGreaterThan(10);
  });
});

// ═══════════════════════════════════════════════════════════
// 굳힘 함수와 소품 — 주석이 단언하는 것을 **직접 부르는 눈금**이 문다 (㉷)
// ═══════════════════════════════════════════════════════════

describe("중2 확대 갈래 5차(m2Top5i) — 굳힘 함수", () => {
  it("`noTriangleSlopes` 는 세 갈래를 실제로 센다 (손 실측)", () => {
    // $y=x+3$, $y=3x-1$ 은 $(2,5)$ 에서 만난다. $y=ax+9$ 가 그 점을 지나면 $a=-2$.
    expect(noTriangleSlopes(1, 3, 3, -1, 9)).toEqual([1, 3, -2]);
    expect(noTriangleSlopes(1, 3, 3, -1, 9, false)).toEqual([1, 3]);
    // 앞의 둘이 평행하면 낼 수 없다.
    expect(noTriangleSlopes(2, 3, 2, -1, 9)).toBeNull();
    // 🔴 「셋째가 첫째와 겹칠 수 있다($c=b_1$)」는 **기본 경로에서 죽어 있다** —
    //    그때는 반드시 $a_3=m_1$ 이 되어 `a3 === m1` 이 먼저 문다(모듈 주석의 증명).
    //    그래서 이 눈금은 그 줄이 **실제로 무는 경로**로 잰다. 이 줄을 지우면
    //    아래가 `[1, 3]` 을 내며 빨개진다.
    expect(noTriangleSlopes(1, 9, 3, -1, 9, false)).toBeNull();
    // 겹치지 않는 자리에서는 그 경로가 두 평행 값을 낸다 — «늘 null» 이 아님을 보인다.
    expect(noTriangleSlopes(1, 3, 3, -1, 9, false)).toEqual([1, 3]);
    // 한 점에서 만나게 하는 기울기가 정수가 아니면 낼 수 없다.
    // $y=2x+1$, $y=x+4$ 는 $(3,7)$ 에서 만나고 $7=3a+5$ 는 정수 해가 없다.
    expect(noTriangleSlopes(2, 1, 1, 4, 5)).toBeNull();
  });

  it("`recoverXY` 는 «$2$로 나눈다»를 실제로 한다 (손 실측)", () => {
    expect(recoverXY(8, -4)).toEqual([2, 6]);
    expect(recoverXY(8, -4, false)).toEqual([4, 12]);
    // 홀짝이 다르면 정수 해가 아니다.
    expect(recoverXY(8, -3)).toBeNull();
  });

  it("`solvePair` 는 정수 해일 때만 낸다 (손 실측)", () => {
    // $3A-5B=30$, $2A+3B=4$ → $A=110/19$ … 정수가 아니다.
    expect(solvePair(3, -5, 30, 2, 3, 4)).toBeNull();
    // $A-2B=32$, $2A+5B=-8$ → $A=16$, $B=-8$
    expect(solvePair(1, -2, 32, 2, 5, -8)).toEqual([16, -8]);
    // 판별식이 $0$ 이면 낼 수 없다.
    expect(solvePair(2, 4, 6, 1, 2, 3)).toBeNull();
  });

  it("`trapezoidBases` 는 앞뒤 조각을 갈라 건다 (손 실측)", () => {
    // $m:n=2:3$, $s=5$. $EP=12$ → $BC=30$; $PF=9$ → $AD=15$.
    expect(trapezoidBases(2, 3, 12, 9)).toEqual({ ad: 15, bc: 30 });
    // 뒤집어 걸면 $BC=20$, $AD=22.5$ … 나누어떨어지지 않는다.
    expect(trapezoidBases(2, 3, 12, 9, false)).toBeNull();
    // 나누어떨어지지 않으면 그런 사다리꼴이 없다.
    expect(trapezoidBases(2, 3, 11, 9)).toBeNull();
  });

  it("`isoscelesTargetAngles` 와 `incenterAngle` 은 죽는 경우를 실제로 버린다 (손 실측)", () => {
    expect(isoscelesTargetAngles(40)).toEqual([40, 100, 70]);
    expect(isoscelesTargetAngles(100)).toEqual([40]);
    expect(isoscelesTargetAngles(100, false)).toEqual([100, -20, 40]);
    expect(incenterAngle(40)).toBe(110);
    expect(incenterAngle(100)).toBe(140);
    expect(isoscelesTargetAngles(0)).toBeNull();
    expect(isoscelesTargetAngles(180)).toBeNull();
    // 나오는 순서가 **논리 순서**다 — 크기 순으로 정렬하지 않는다 (㉵).
    expect(isoscelesTargetAngles(40)).not.toEqual([40, 70, 100]);
  });

  it("`coefTerm`·`signedTerm`·`lineEquation`·`slopeForm` 은 `1x`·`+0` 을 안 낸다", () => {
    expect(coefTerm(1, "x")).toBe("x");
    expect(coefTerm(-1, "x")).toBe("-x");
    expect(coefTerm(3, "x")).toBe("3x");
    expect(signedTerm(5)).toBe("+5");
    expect(signedTerm(-5)).toBe("-5");
    expect(lineEquation(1, -4)).toBe("x-y-4=0");
    expect(lineEquation(-1, 4)).toBe("-x-y+4=0");
    expect(slopeForm(2, -3)).toBe("2x-3");
    expect(pageSmells(`$${lineEquation(1, -4)}$`)).toEqual([]);
    expect(pageSmells(`$${lineEquation(-1, 4)}$`)).toEqual([]);
  });

  it("`pageShortcutValues` 는 한두 번 연산 값을 실제로 담는다 (손 실측)", () => {
    const s = pageShortcutValues([2, 6]);
    expect(s.has(2)).toBe(true);
    expect(s.has(-6)).toBe(true);
    expect(s.has(8)).toBe(true); // 2+6
    expect(s.has(-4)).toBe(true); // 2-6
    expect(s.has(12)).toBe(true); // 2*6
    expect(s.has(3)).toBe(true); // 6/2
    expect(s.has(7)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// 검사기 자신의 눈금 — 이 자들이 «아니오» 를 낼 수 있는가
// ═══════════════════════════════════════════════════════════

describe("중2 확대 갈래 5차(m2Top5i) — 검사기 자신의 눈금", () => {
  it("`formsTriangle` 은 평행·한 점·삼각형을 실제로 가른다", () => {
    expect(
      formsTriangle([
        { m: 1, b: 0 },
        { m: 2, b: 1 },
        { m: 3, b: 5 },
      ]),
    ).toBe(true);
    // 세 직선이 모두 $(0,0)$ 을 지난다.
    expect(
      formsTriangle([
        { m: 1, b: 0 },
        { m: 2, b: 0 },
        { m: 3, b: 0 },
      ]),
    ).toBe(false);
    // 둘이 평행하다.
    expect(
      formsTriangle([
        { m: 1, b: 0 },
        { m: 1, b: 4 },
        { m: 3, b: 5 },
      ]),
    ).toBe(false);
  });

  it("`noTriangleByBruteForce` 는 정확히 셋을 찾는다 (경우를 안 나누고)", () => {
    expect(noTriangleByBruteForce({ m: 1, b: 3 }, { m: 3, b: -1 }, 9)).toEqual([
      -2, 1, 3,
    ]);
  });

  it("`solveByExpansion` 은 대입으로 확인하고 안 맞으면 `null`", () => {
    // $\frac{x+y}{2}-\frac{x-y}{3}=7$, $2(x+y)+3(x-y)=2$ → $x=2$, $y=8$
    expect(solveByExpansion(2, 3, -1, 7, 2, 3, 2)).toEqual([2, 8]);
    expect(solveByExpansion(2, 3, -1, 7, 2, 3, 5)).toBeNull();
  });

  it("`piecesScaled`·`basesByBruteForce` 는 좌표로 두 조각을 낸다", () => {
    // $m:n=2:3$, $p=15$, $q=30$ → $s\times EP = 2\times30=60$, $s\times PF=3\times15=45$
    expect(piecesScaled(15, 30, 2, 3)).toEqual([60, 45]);
    expect(basesByBruteForce(2, 3, 12, 9)).toEqual([[15, 30]]);
    expect(basesByBruteForce(2, 3, 11, 9)).toEqual([]);
  });

  it("`targetAnglesByBruteForce` 는 반각까지 훑어 겹침도 잡는다", () => {
    expect(targetAnglesByBruteForce(40).sort((a, b) => a - b)).toEqual([
      40, 70, 100,
    ]);
    expect(targetAnglesByBruteForce(100)).toEqual([40]);
    expect(targetAnglesByBruteForce(60)).toEqual([60]);
    // 홀수 각이면 반각이 섞여 나온다 — 그래서 생성기가 $4$의 배수만 쓴다.
    expect(targetAnglesByBruteForce(41)).toContain(69.5);
  });

  it("`arithmeticFaults`·`unreducedFractions`·`euroRoMismatches` 가 산다", () => {
    expect(arithmeticFaults("$5\\times6+2=32$이다.")).toEqual([]);
    expect(arithmeticFaults("$5\\times6+2=33$이다.")).toHaveLength(1);
    expect(unreducedFractions(`$${BACKSLASH}dfrac{3}{4}$`)).toEqual([]);
    expect(euroRoMismatches("$3$로 나눈다")).toHaveLength(1);
    expect(euroRoMismatches("$3$으로 나눈다")).toEqual([]);
    expect(euroRoMismatches("$8$로 나눈다")).toEqual([]);
  });

  it("`hasInequality` 는 역슬래시 꼴도 본다 (도구 층이 한 겹 벗기는 자리)", () => {
    expect(hasInequality("$x>3$")).toBe(true);
    expect(hasInequality(`$x${BACKSLASH}le3$`)).toBe(true);
    expect(hasInequality(`$${BACKSLASH}triangle ABC$`)).toBe(false);
    expect(hasInequality(`$${BACKSLASH}parallel$`)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// 물린 결함의 회귀 잠금
// ═══════════════════════════════════════════════════════════

describe("중2 확대 갈래 5차(m2Top5i) — 물린 결함의 회귀 잠금", () => {
  it("⑴ 🔴 `137X` 의 둘째 식이 한 문자로 **접히지 않는다** ($|n|\\ne m$)", () => {
    for (const block of SEED_BLOCKS) {
      for (const p of rows(E137, 200, block)) {
        expect(Math.abs(p.facts.n!), p.content).not.toBe(p.facts.m);
      }
    }
  });

  it("⑵ 🔴 `137X` 의 해에 $\\pm1$ 이 없다 — 지면에 `\\times1` 이 나던 자리", () => {
    for (const p of rows(E137, 300)) {
      expect(Math.abs(p.facts.xv!), p.content).toBeGreaterThan(1);
      expect(Math.abs(p.facts.yv!), p.content).toBeGreaterThan(1);
      // ⚠️ `toContain("\\times1")` 로 쓰면 **`\times12` 도 걸린다** — 뒤에 숫자가
      //    없을 때만 「$\times1$」이다. (이 시험을 그렇게 썼다가 거짓 빨강이 났다.)
      expect(/\\times1(?!\d)/.test(p.solution), p.content).toBe(false);
    }
  });

  it("⑶ 🔴 `137X` 가 「양변에 $1$을 곱하여」라는 헛걸음을 안 적는다", () => {
    for (const block of SEED_BLOCKS) {
      for (const p of rows(E137, 200, block)) {
        expect(p.solution, p.content).not.toContain("양변에 $1$을");
        expect(p.solution, p.content).not.toContain("양변에 $1$를");
      }
    }
  });

  it("⑷ 🔴 `138X` 의 뒤 비례식이 접히지 않는다 ($\\overline{PF}\\ne n$)", () => {
    for (const block of SEED_BLOCKS) {
      for (const p of rows(E138, 200, block)) {
        expect(p.facts.pf, p.content).not.toBe(p.facts.n);
        expect(p.facts.ep, p.content).not.toBe(p.facts.m);
      }
    }
  });

  it("⑸ 🔴 `136X` 의 세 값이 **크기 순으로 놓이지 않는다** (㉵ 순위 암시)", () => {
    // 나열 순서는 「첫 직선 · 둘째 직선 · 교점」이라는 **논리 순서**다.
    // 그래서 가장 큰 값이 세 자리에 **모두** 나와야 한다.
    const where = new Set<number>();
    for (const p of rows(E136, 400)) {
      const three = [p.facts.m1!, p.facts.m2!, p.facts.a3!];
      where.add(three.indexOf(Math.max(...three)));
    }
    expect(where.size, "가장 큰 값이 늘 같은 자리에 온다").toBe(3);
  });

  it("⑹ 🔴 `139X` 의 물음이 **주어진 각과 다른 꼭짓점**에 걸린다", () => {
    for (const block of SEED_BLOCKS) {
      for (const p of rows(E139, 200, block)) {
        const [gt, , yt, zt] = grab(
          /\$\\angle ([ABC])=(\d+)\^\\circ\$이다\. 점 \$I\$가 \$\\triangle ABC\$의 내심일 때, \$\\angle ([ABC])I([ABC])\$/,
          p.content,
          "139X 꼭짓점",
        );
        const W = ["A", "B", "C"].find((t) => t !== yt && t !== zt)!;
        expect(gt, p.content).not.toBe(W);
      }
    }
  });

  it("⑺ 🔴 `139X` 가 두 갈래(α<90 · α>90)를 **둘 다** 낸다", () => {
    const alphas = rows(E139, 400).map((p) => p.facts.alpha!);
    expect(alphas.filter((a) => a < 90).length).toBeGreaterThan(50);
    expect(alphas.filter((a) => a > 90).length).toBeGreaterThan(50);
    expect(alphas).not.toContain(60);
    expect(alphas).not.toContain(108);
  });

  it("⑻ 🔴 `136X` 의 답이 $0$ 이 아니다 — 끄면 전수 최빈이 14.35% 로 문턱을 넘는다", () => {
    for (const block of SEED_BLOCKS) {
      for (const p of rows(E136, 200, block)) {
        expect(p.facts.x, p.content).not.toBe(0);
      }
    }
  });

  it("⑼ 정답에 단위 명사를 조사로 읽히게 붙이지 않는다 (공용 조사 자의 사각지대)", () => {
    for (const e of M2_TOP_5I) {
      for (const p of rows(e, 60)) {
        expect(josaMismatches(`${p.answer}입니다.`), p.content).toEqual([]);
      }
    }
  });
});
