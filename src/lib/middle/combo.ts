/**
 * 중등 결합형(combo) 등록부 — **원장님이 문형까지 승인한 것만** 들어온다.
 *
 * 임의의 소단원 둘을 붙이는 조합기가 **아니다**. 재료가 모두 중등이어도 그 합성이
 * 고등의 정식 개념일 수 있다(D-100 ⑶ · 실제로 `3-2|상자그림과 산점도|09` 가 좌표평면
 * 두 점 사이의 거리를 물어 공통수학2 를 침범하고 있었다).
 *
 * ## 왜 `MidProblem` 을 안 쓰나
 * `MidProblem` 은 `rpmBook/Minor/Type/Title` 을 **필수**로 갖는다(types.ts) — 그건
 * 「이 문항이 RPM 유형 하나에서 나왔다」는 계약이다. 결합형은 유형이 둘 이상이라
 * 그 자리에 가짜 값을 채우면 계약이 거짓이 된다. 그래서 **별도 타입**을 둔다.
 *
 * ## 무엇이 결합형인가 (D-100)
 * 서로 다른 소단원 개념 둘 이상이 **각각 독립적으로 필수**이고, 어느 하나를 빼면
 * 풀 수 없다. `anchor` 는 가장 늦게 배우는 소단원, 나머지는 `prerequisite`.
 * ⚠️ **학년을 넘으면 낮은 쪽이 «도구»여야 한다**(D-100 ⑵) — 대등하게 걸치면 안 된다.
 *
 * ## 지금 등록된 것
 * **여섯**이다. **문형을 늘리려면 원장님 승인이 먼저다**(D-07) — 손으로 더하지 말 것.
 *
 * **새 문형을 쓴 것 셋**
 *   ⑴ 중3 원주각 × 이차방정식의 풀이 (2026-08-24 승인, 후보 B)
 *   ⑵ 중2 일차함수의 활용 × 일차부등식의 풀이 (2026-08-25 승인, 후보 ㄱ)
 *   ⑶ 중3 다항식의 곱셈 × 근호를 포함한 식의 계산 (2026-08-25 승인, D-110)
 *
 * **위임 — 이미 등록된 유형이 곧 그 결합형인 것 셋** (2026-08-25 승인, D-110)
 *   ⑷ 중2 연립방정식 × 순환소수의 분수 표현  ← `2-1|연립일차방정식|19`
 *   ⑸ 중2 연립방정식 × 지수법칙            ← `2-1|연립일차방정식|20`
 *   ⑹ 중3 이차방정식의 풀이 × 인수분해      ← `3-1|이차방정식의 풀이|06`
 *
 * ⚠️ ⑷⑸⑹ 는 **이미 일반 유형으로도 출제된다.** 등록의 값어치는 «생성»이 아니라
 * **«분류 기록»** 이다 — 교과 근거·상위 침범 검토와 함께 `--list-combos` 에 나타난다.
 *
 * ## ⑵ 를 왜 «대수» 에 만들었나
 * 분류된 결합형 30건이 **기하로 쏠려** 있다 — 피타고라스가 낀 것 20/30 · 3-2 에 16/30.
 * 기하에 또 만들면 그 20건과 겹친다(D-103).
 *
 * ⚠️ 그런데 **「중1·중2 대수 책에 0건」이라던 D-103 의 전제는 틀렸다**(2026-08-25 실측).
 * `2-1|연립일차방정식|19`(계수가 순환소수인 연립방정식)와 `|20`(지수법칙을 이용한
 * 연립방정식)이 **정의 그대로 결합형**인데 분류기가 각각 「미분류」·「아님」으로 보냈다.
 * 0건이 아니라 **못 본 것**이다. 그래서 ⑵ 를 고를 때 그 둘과 겹치지 않는지 먼저 봤다 —
 * 둘 다 앵커가 «연립방정식»이고 ⑵ 는 «일차함수»라 겹치지 않는다.
 */
import type { Difficulty } from "@/contracts/common.contract";

import { createRng, intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { generateMiddleProblem } from "./generate";
import { euroRo, eulReul } from "./m2Josa";

export type MidComboProblem = {
  kind: "combo";
  comboId: string;
  /** 가장 늦게 배우는 소단원 — 우리 `Unit.section` 이름 */
  anchorSection: string;
  anchorGrade: string;
  /** 원천 RPM 유형 키 (앵커가 먼저). 「어느 유형과 겹치나」를 여기서 본다. */
  conceptKeys: readonly [string, string, ...string[]];
  familyId: string;
  content: string;
  answer: string;
  solution: string;
  difficulty: Difficulty;
  facts: Record<string, number>;
};

export type ComboFamily = {
  id: string;
  generate: (
    rng: Rng,
  ) => Omit<
    MidComboProblem,
    | "kind"
    | "comboId"
    | "anchorSection"
    | "anchorGrade"
    | "conceptKeys"
    | "familyId"
  >;
};

type ComboBase = {
  id: string;
  anchorSection: string;
  anchorGrade: string;
  conceptKeys: readonly [string, string, ...string[]];
  /** 승인 근거 — 왜 이 결합이 중등 범위 안인가. orderIndex 만으로는 못 지킨다. */
  curriculumBasis: string;
  /** 이 결합이 «고등의 정식 개념» 이 되지 않는지 본 기록 (D-100 ⑶). */
  laterConceptReview: string;
  /** 학년을 넘는가. 넘으면 낮은 쪽이 도구인지 적는다 (D-100 ⑵). */
  gradeBoundary: string;
  salt: number;
};

/**
 * 등록에는 두 갈래가 있다.
 *
 * ⑴ `families` — **여기서 새로 쓴 문형**. 지금까지의 결합형이 전부 이쪽이다.
 * ⑵ `delegatesTo` — **이미 등록된 유형이 곧 그 결합형이다.** 새로 쓰지 않고 그
 *    유형을 **그대로 부른다**(D-110).
 *
 * ⚠️ ⑵ 를 «새로 써서» 등록하면 **같은 수학이 두 벌**이 되고, 한쪽만 고치는 날
 * 갈라진다. 그리고 그 갈라짐은 값이 둘 다 맞을 수 있어 **아무도 못 알아챈다.**
 * 그래서 위임은 `generateMiddleProblem` 을 지나가게 한다 — 지면 다듬기와
 * 밑단 판정(`resolveMiddleTier`)이 **한 곳**에서만 일어나야 하기 때문이다.
 */
type ComboDefinition = ComboBase &
  (
    | {
        families: readonly [ComboFamily, ...ComboFamily[]];
        delegatesTo?: undefined;
      }
    | { families?: undefined; delegatesTo: string }
  );

const QUADRATIC_CIRCLE_ID = "중3|원주각::중3|이차방정식의 풀이";

/** `ax^2+bx+c` 를 지면 표기로. 계수 1·0 과 부호를 사람이 쓰듯 쓴다. */
function quadratic(a: number, b: number, c: number): string {
  const head = a === 1 ? "x^2" : `${a}x^2`;
  let out = head;
  if (b !== 0) {
    const mag = Math.abs(b) === 1 ? "x" : `${Math.abs(b)}x`;
    out += `${b > 0 ? "+" : "-"}${mag}`;
  }
  if (c !== 0) out += `${c > 0 ? "+" : "-"}${Math.abs(c)}`;
  return out;
}

/**
 * 원주각 = $(ax^2+bx)^\circ$ · 중심각 = $((2a+1)x^2+ex+f)^\circ$.
 *
 * 「중심각 = 원주각 × 2」로 식을 세우면 $x^2+(q-p)x-pq=0$ 이 되고, 인수분해하면
 * $(x-p)(x+q)=0$ 이다. $x$ 가 양수이므로 $-q$ 는 버린다.
 *
 * 두 개념이 **각각 독립적으로 필수**다 — 원주각 성질을 모르면 식을 못 세우고,
 * 인수분해를 모르면 세운 식을 못 푼다.
 */
const quadraticCircle: ComboFamily = {
  id: "central-angle-quadratic",
  generate: (rng) => {
    const p = intBetween(rng, 3, 8); // 양수 해 = 정답
    const q = pick(
      rng,
      [2, 3, 4, 5, 6].filter((v) => v !== p),
    ); // 버릴 음수 해 $-q$
    const a = pick(rng, [1, 2]);
    const b = pick(rng, [0, 1, 2]);

    const inscribed = a * p * p + b * p; // 원주각의 크기
    const central = 2 * inscribed;
    const e = 2 * b + q - p;
    const f = -p * q;

    return {
      content:
        `원 $\\mathrm{O}$ 에서 호 $\\mathrm{AB}$ 에 대한 원주각의 크기가 ` +
        `$(${quadratic(a, b, 0)})^\\circ$ 이고, 중심각의 크기가 ` +
        `$(${quadratic(2 * a + 1, e, f)})^\\circ$ 이다. 이때 양수 $x$ 의 값을 구하시오.`,
      answer: `$${p}$`,
      solution:
        `한 호에 대한 중심각의 크기는 원주각의 크기의 $2$ 배이므로 ` +
        `$${quadratic(2 * a + 1, e, f)}=2(${quadratic(a, b, 0)})$ 이다.\n` +
        `정리하면 $x^2${q - p >= 0 ? "+" : "-"}${Math.abs(q - p) === 1 ? "" : Math.abs(q - p)}x-${p * q}=0$ 이고, ` +
        `인수분해하면 $(x-${p})(x+${q})=0$ 이므로 $x=${p}$ 또는 $x=-${q}$ 이다.\n` +
        `$x$ 는 양수이므로 $x=${p}$ 이다. ` +
        `(이때 원주각은 $${inscribed}^\\circ$, 중심각은 $${central}^\\circ$ 이다.)`,
      difficulty: "심화하",
      facts: { p, q, a, b, e, f, inscribed, central },
    };
  },
};

const LINEAR_INEQ_ID = "중2|일차함수의 활용::중2|일차부등식의 풀이";

/**
 * 문형 ①: 그래프가 지나는 두 점에서 일차함수의 식을 구하고, 함숫값 조건을
 * 일차부등식으로 푼다.
 *
 * 두 개념이 **각각 독립적으로 필수**다 —
 *  · 일차함수: 두 점에서 **기울기(변화율)** 를 구해 $y=ax+b$ 를 세우지 않으면
 *    부등식을 세울 식 자체가 없다.
 *  · 일차부등식: 기울기가 **음수**라 양변을 음수로 나누는 자리가 나온다.
 *    **부등호의 방향이 바뀌는** 그 처리가 일차부등식 고유의 개념이다.
 *
 * ⚠️ 왜 이 자리를 골랐나 — 실측(2026-08-25): 일차함수 생성기(`m2Func`·`m2Line`)의
 * 활용 유형에 「이상/이하/범위」를 묻는 발문이 **0건**이다. 값 하나 구하기만 있고
 * 범위를 묻는 자리가 통째로 비어 있었다.
 *
 * 답 $k$ 를 **먼저 정하고** 처음 물의 양을 거꾸로 만든다(D-66 ⒂) — 앞에서 뽑아
 * 거르면 답이 정수가 아닌 씨앗이 생긴다.
 */
const waterGraphRange: ComboFamily = {
  id: "water-graph-range",
  generate: (rng) => {
    const k = intBetween(rng, 3, 12); // 답 — 몇 분 후부터인가
    const drop = pick(rng, [2, 3, 4, 5]); // 매분 줄어드는 양 = |기울기|
    const t = intBetween(rng, 2, 20); // 기준이 되는 물의 양
    const b0 = t + drop * k; // 처음 물의 양 = $y$절편
    const p = intBetween(rng, 1, k - 1); // 두 번째 점의 $x$ (경계 전이라야 한다)
    const q = b0 - drop * p;

    const points = `$(0,\\ ${b0})$, $(${p},\\ ${q})$`;
    return {
      content:
        `어떤 물통에서 물이 일정한 빠르기로 빠져나간다. 물을 빼기 시작한 지 $x$분 후에 ` +
        `물통에 남아 있는 물의 양을 $y\\,\\mathrm{L}$라 하면 $y$는 $x$의 일차함수이고, ` +
        `그 그래프가 지나는 두 점은 ${points}이다. ` +
        `남아 있는 물의 양이 $${t}\\,\\mathrm{L}$ 이하가 되는 것은 ` +
        `물을 빼기 시작한 지 몇 분 후부터인지 구하시오.`,
      answer: `$${k}$분 후`,
      solution:
        `그래프가 두 점 ${points}${eulReul(q)} 지나므로 ` +
        `기울기는 $\\dfrac{${q}-${b0}}{${p}-0}=-${drop}$이고, $y$절편이 $${b0}$이므로 ` +
        `$y=-${drop}x+${b0}$이다.\n` +
        `남아 있는 물의 양이 $${t}\\,\\mathrm{L}$ 이하이려면 $-${drop}x+${b0}\\le ${t}$이다.\n` +
        `$-${drop}x\\le ${t - b0}$에서 양변을 **음수인** $-${drop}$${euroRo(drop)} 나누므로 ` +
        `부등호의 방향이 바뀌어 $x\\ge ${k}$이다.\n` +
        `따라서 물을 빼기 시작한 지 $${k}$분 후부터이다.`,
      difficulty: "심화하",
      facts: { k, drop, t, b0, p, q },
    };
  },
};

/**
 * 문형 ②: 직사각형 위를 움직이는 점이 만드는 삼각형의 넓이를 $x$ 의 일차함수로
 * 나타내고, 넓이 조건을 일차부등식으로 푼다.
 *
 * 세 개념이 필요하다 — 삼각형의 넓이(도형) · 일차함수의 식 세우기 · 일차부등식.
 * 문형 ① 과 **겹치지 않게** 일부러 다른 축을 골랐다: ① 은 그래프에서 식을 읽고
 * 기울기가 음수(부등호가 뒤집힌다), ② 는 도형에서 식을 만들고 기울기가 양수다.
 *
 * ⚠️ **좌표를 쓰지 않는다.** ② 는 도형 문제이므로 좌표평면에 올리면 D-100 ⑶ 위반이
 * 된다. 그래서 이 결합형의 불변식은 「좌표가 있는 문형에는 도형이 없고, 도형이 있는
 * 문형에는 좌표가 없다」이고, 시험이 그것을 잠근다.
 */
const movingPointAreaRange: ComboFamily = {
  id: "moving-point-area-range",
  generate: (rng) => {
    const k = intBetween(rng, 2, 8); // 답 — 몇 초 후부터인가
    const ab = pick(rng, [6, 8, 10, 12]); // $\overline{AB}$ — 짝수라야 넓이 계수가 정수다
    const v = pick(rng, [1, 2]); // 매초 움직이는 거리
    const secToC = k + intBetween(rng, 1, 6); // 점 P 가 C 에 닿는 시각 (경계보다 뒤)
    const bc = v * secToC;
    const c = (ab * v) / 2; // $y=cx$ 의 계수
    const s = c * k; // 기준이 되는 넓이
    // 계수 $1$ 은 지면에 쓰지 않는다 — `1x` 가 그대로 찍히면 값은 맞고 지면만 흉하다.
    const vx = v === 1 ? "x" : `${v}x`;

    return {
      content:
        `$\\overline{\\mathrm{AB}}=${ab}\\,\\mathrm{cm}$, $\\overline{\\mathrm{BC}}=${bc}\\,\\mathrm{cm}$인 ` +
        `직사각형 $\\mathrm{ABCD}$에서 점 $\\mathrm{P}$는 점 $\\mathrm{B}$를 출발하여 ` +
        `점 $\\mathrm{C}$까지 변 $\\mathrm{BC}$ 위를 매초 $${v}\\,\\mathrm{cm}$의 빠르기로 움직인다. ` +
        `점 $\\mathrm{P}$가 출발한 지 $x$초 후의 삼각형 $\\mathrm{ABP}$의 넓이를 ` +
        `$y\\,\\mathrm{cm}^2$라 할 때, 삼각형 $\\mathrm{ABP}$의 넓이가 ` +
        `$${s}\\,\\mathrm{cm}^2$ 이상이 되는 것은 출발한 지 몇 초 후부터인지 구하시오.`,
      answer: `$${k}$초 후`,
      solution:
        `출발한 지 $x$초 후에 $\\overline{\\mathrm{BP}}=${vx}\\,\\mathrm{cm}$이고 ` +
        `$\\overline{\\mathrm{AB}}=${ab}\\,\\mathrm{cm}$이므로 ` +
        `$y=\\dfrac{1}{2}\\times ${vx}\\times ${ab}=${c}x$이다.\n` +
        `점 $\\mathrm{P}$가 점 $\\mathrm{C}$에 닿는 것은 $${secToC}$초 후이므로 ` +
        `$0\\le x\\le ${secToC}$이다.\n` +
        `넓이가 $${s}\\,\\mathrm{cm}^2$ 이상이려면 $${c}x\\ge ${s}$이므로 $x\\ge ${k}$이다.\n` +
        `따라서 출발한 지 $${k}$초 후부터이다.`,
      difficulty: "심화하",
      facts: { k, ab, v, bc, secToC, c, s },
    };
  },
};

const SQRT_FORMULA_ID = "중3|다항식의 곱셈::중3|근호를 포함한 식의 계산";

/** 부호를 사람이 쓰듯 — `+3` · `-3`. 계수 0 은 이 문형에서 안 나온다. */
function signed(n: number): string {
  return n >= 0 ? `+${n}` : `-${Math.abs(n)}`;
}

/** 근호 앞 계수. `1\sqrt{5}` 가 지면에 나가면 값은 맞고 지면만 흉하다. */
function radicalTerm(coef: number, a: number): string {
  if (coef === 1) return `\\sqrt{${a}}`;
  if (coef === -1) return `-\\sqrt{${a}}`;
  return `${coef}\\sqrt{${a}}`;
}

/**
 * $p+q\sqrt{a}$ 를 지면 표기로. **$p=0$ 이면 $p$ 를 안 쓰고, $|q|=1$ 이면 계수를
 * 안 쓴다** — `0-\sqrt{6}` 이나 `-1\sqrt{6}` 은 값이 맞아도 지면이 흉하다.
 */
function rationalPlusRadical(p: number, q: number, a: number): string {
  const rad = radicalTerm(Math.abs(q), a);
  if (p === 0) return q > 0 ? rad : `-${rad}`;
  return `${p}${q > 0 ? "+" : "-"}${rad}`;
}

/** 제곱수가 아닌 수 — $\sqrt{a}$ 가 무리수라야 이 문형이 성립한다. */
const NON_SQUARES = [2, 3, 5, 6, 7, 10, 11, 13, 15] as const;

/**
 * 문형 ①: 곱셈 공식 $(x+b)(x+c)=x^2+(b+c)x+bc$ 에 $x=\sqrt{a}$ 를 넣는다.
 *
 * 두 개념이 **각각 독립적으로 필수**다 —
 *  · 다항식의 곱셈: 곱셈 공식을 모르면 전개를 못 한다.
 *  · 근호를 포함한 식의 계산: $(\sqrt{a})^2=a$ 를 모르면 유리수 부분을 못 모은다.
 *
 * ⚠️ $b+c=0$ 이면 무리수 부분이 사라져 **묻는 것이 없어진다.** 뽑는 범위에서
 * 가른다(거르지 않는다 — D-66 ⒂).
 */
const sqrtProductExpand: ComboFamily = {
  id: "sqrt-product-expand",
  generate: (rng) => {
    const a = pick(rng, NON_SQUARES);
    const b = pick(rng, [-5, -4, -3, -2, 2, 3, 4, 5] as const);
    // $b+c\ne0$ 이라야 $q\sqrt{a}$ 가 남고, $b\ne c$ 라야 완전제곱꼴이 아니다
    // (같으면 지면에 $(\sqrt{a}+b)^2$ 로 써야 하는데 그것은 다른 곱셈 공식이다).
    const c = pick(
      rng,
      [-5, -4, -3, -2, 2, 3, 4, 5].filter((v) => v + b !== 0 && v !== b),
    );
    const p = a + b * c;
    const q = b + c;
    const lhs = `(\\sqrt{${a}}${signed(b)})(\\sqrt{${a}}${signed(c)})`;

    return {
      content:
        `$${lhs}=p+q\\sqrt{${a}}$일 때, ` +
        `유리수 $p$, $q$에 대하여 $p+q$의 값을 구하시오.`,
      answer: `$${p + q}$`,
      solution:
        // 계수 1·0 은 `quadratic` 이 사람이 쓰듯 처리한다 — `-1x` 가 지면에 나가면
        // 값은 맞고 지면만 흉하다(CLAUDE.md 2026-08-24).
        `곱셈 공식 $(x${signed(b)})(x${signed(c)})=${quadratic(1, q, b * c)}$에 ` +
        `$x=\\sqrt{${a}}$${eulReul(a)} 대입한다.\n` +
        `$(\\sqrt{${a}})^2=${a}$이므로 ` +
        `$${lhs}=${rationalPlusRadical(p, q, a)}$이다.\n` +
        `따라서 $p=${p}$, $q=${q}$이므로 $p+q=${p + q}$이다.`,
      difficulty: "심화하",
      facts: { a, b, c, p, q },
    };
  },
};

/**
 * 문형 ②: 분모가 **이항**인 유리화. 합차 공식 $(x+y)(x-y)=x^2-y^2$ 이 필요하다.
 *
 * ⚠️ 중3 1단원이 가르치는 유리화는 분모가 $\sqrt{a}$ **하나**일 때다. 분모가
 * $\sqrt{a}+b$ 인 유리화는 **곱셈 공식을 배운 뒤에야** 할 수 있다 — 그래서 이것이
 * 결합이고, 앵커가 `다항식의 곱셈`(2단원)이다.
 *
 * 답이 정수 계수로 떨어지도록 $k$ 를 $a-b^2$ 의 배수로 **만들어** 둔다(답을 먼저).
 */
const binomialRationalize: ComboFamily = {
  id: "binomial-rationalize",
  generate: (rng) => {
    // $a>b^2$ 이라야 분모 $a-b^2$ 가 양수다 — 음수면 부호를 옮기는 군더더기가 붙는다.
    const b = pick(rng, [1, 2, 3] as const);
    const a = pick(
      rng,
      NON_SQUARES.filter((v) => v > b * b),
    );
    const d = a - b * b;
    const m = pick(rng, [1, 2, 3, 4, 5] as const);
    const k = m * d;

    const result = `${radicalTerm(m, a)}-${m * b}`;
    return {
      content: `$\\dfrac{${k}}{\\sqrt{${a}}+${b}}$의 분모를 유리화하여 간단히 하시오.`,
      answer: `$${result}$`,
      solution:
        `분모와 분자에 $\\sqrt{${a}}-${b}$${eulReul(b)} 곱한다. 분모는 곱셈 공식 ` +
        `$(x+y)(x-y)=x^2-y^2$에 의하여 ` +
        `$(\\sqrt{${a}}+${b})(\\sqrt{${a}}-${b})=${a}-${b * b}=${d}$이다.\n` +
        // 분모가 $1$ 이면 그 분수 단계를 안 쓴다 — `\dfrac{...}{1}` 은 지면이 흉하다.
        `$\\dfrac{${k}}{\\sqrt{${a}}+${b}}=${d === 1 ? "" : `\\dfrac{${k}(\\sqrt{${a}}-${b})}{${d}}=`}` +
        `${m === 1 ? "" : m}(\\sqrt{${a}}-${b})$이다.\n` +
        `따라서 $${result}$이다.`,
      difficulty: "심화하",
      facts: { a, b, d, m, k },
    };
  },
};

const DEFINITIONS: readonly ComboDefinition[] = [
  {
    id: QUADRATIC_CIRCLE_ID,
    anchorSection: "원주각",
    anchorGrade: "중3",
    conceptKeys: ["3-2|원주각|02", "3-1|이차방정식의 풀이|06"],
    curriculumBasis:
      "원주각과 중심각의 크기 ⑵(3-2|원주각|02)와 인수분해를 이용한 이차방정식의 풀이" +
      "(3-1|이차방정식의 풀이|06). 둘 다 중3 이고 앵커(원주각)가 더 뒤다.",
    laterConceptReview:
      "원의 성질과 이차방정식을 단순 연결할 뿐 고등의 정식 개념을 만들지 않는다 — " +
      "사인법칙(대수 2. 삼각함수)도, 이차방정식과 이차함수의 관계(공통수학1)도, " +
      "도형의 방정식(공통수학2)도 건드리지 않는다. 좌표평면을 쓰지 않으므로 D-100 ⑶ 도 안전.",
    gradeBoundary: "학년 안(중3+중3) — D-100 ⑵ 의 학년 경계 판단이 필요 없다.",
    salt: 0x5c1a,
    families: [quadraticCircle],
  },
  {
    id: LINEAR_INEQ_ID,
    anchorSection: "일차함수의 활용(속력, 도형, 기타)",
    anchorGrade: "중2",
    conceptKeys: [
      "2-1|일차함수와 그 그래프  ⑵|11",
      "2-1|일차부등식|07",
      "2-1|일차함수와 그 그래프  ⑵|13",
    ],
    curriculumBasis:
      "일차함수의 활용(2-1|일차함수와 그 그래프  ⑵|11 물의 양 · |13 도형에서의 문제)과 " +
      "일차부등식의 풀이(2-1|일차부등식|07). 셋 다 중2 이고, `units.ts` 순서에서 " +
      "일차부등식의 풀이보다 일차함수 쪽이 뒤라 앵커가 일차함수다. " +
      "두 문형의 세 번째 키(|13)는 문형 ②(도형) 의 앵커 쪽 출처다.",
    laterConceptReview:
      "일차함수의 함숫값 조건을 일차부등식으로 옮길 뿐 고등의 정식 개념을 만들지 않는다 — " +
      "「이차부등식과 이차함수의 관계」(공통수학1)의 일차판이 아니다(판별식도 그래프의 " +
      "위치 관계도 쓰지 않고, 식에 조건을 대입해 일차부등식을 풀 뿐이다). " +
      "연립일차부등식(고1 과정에 있던 것)도 만들지 않는다 — 부등식은 언제나 하나다. " +
      "⚠️ 문형 ① 은 좌표를 쓰지만 그것은 **일차함수의 그래프**이고(등록 유형 " +
      "`2-1|일차함수와 그 그래프  ⑵|07 두 점의 좌표가 주어질 때` 가 이미 그렇다), " +
      "D-100 ⑶ 이 막는 것은 **도형을 좌표평면에 올려 길이·넓이를 구하는 것**이다. " +
      "그래서 도형을 쓰는 문형 ② 에는 좌표가 하나도 없다 — 시험이 그 불변식을 잠근다.",
    gradeBoundary: "학년 안(중2+중2) — D-100 ⑵ 의 학년 경계 판단이 필요 없다.",
    salt: 0x2f13,
    families: [waterGraphRange, movingPointAreaRange],
  },
  {
    id: SQRT_FORMULA_ID,
    anchorSection: "다항식의 곱셈",
    anchorGrade: "중3",
    conceptKeys: ["3-1|다항식의 곱셈|12", "3-1|근호를 포함한 식의 계산|15"],
    curriculumBasis:
      "곱셈 공식(3-1|다항식의 곱셈|12 곱셈 공식을 이용한 근호를 포함한 식의 계산)과 " +
      "근호를 포함한 식의 계산·유리화(3-1|근호를 포함한 식의 계산|15). 둘 다 중3 이고 " +
      "앵커(다항식의 곱셈, 2단원)가 근호(1단원)보다 뒤다. " +
      "⚠️ 문형 ② 가 결합인 이유가 여기 있다 — 1단원이 가르치는 유리화는 분모가 " +
      "$\\sqrt{a}$ **하나**일 때이고, 분모가 이항인 유리화는 **곱셈 공식을 배운 뒤에야** 한다.",
    laterConceptReview:
      "무리수의 사칙과 곱셈 공식을 잇는 데서 그친다 — 고등의 정식 개념을 만들지 않는다. " +
      "켤레무리수의 성질(공통수학1 「복소수」의 켤레복소수와 짝을 이루는 개념)을 " +
      "**이름으로 도입하지 않고**, $a+b\\sqrt{m}$ 꼴의 유리수·무리수 부분을 비교하는 " +
      "「무리수가 서로 같을 조건」(공통수학1)도 쓰지 않는다 — 문형 ① 은 전개한 결과를 " +
      "그대로 읽을 뿐 «유리수 부분이 같다»는 정리를 쓰지 않는다. 좌표평면도 도형도 없다.",
    gradeBoundary: "학년 안(중3+중3) — D-100 ⑵ 의 학년 경계 판단이 필요 없다.",
    salt: 0x7a41,
    families: [sqrtProductExpand, binomialRationalize],
  },

  // ══ 아래 셋은 **이미 등록된 유형이 곧 결합형**이다 (D-110) ═══════════════
  // 새로 쓰지 않고 그 유형을 그대로 부른다 — 같은 수학을 두 벌 쓰면 갈라지고,
  // 그 갈라짐은 값이 둘 다 맞을 수 있어 아무도 못 알아챈다.
  // 등록의 값어치는 «생성»이 아니라 **«분류 기록»** 이다: `--list-combos` 에
  // 교과 근거·상위 침범 검토와 함께 나타난다.
  {
    id: "중2|여러 가지 연립방정식의 풀이::중2|순환소수의 분수 표현",
    anchorSection: "여러 가지 연립방정식의 풀이",
    anchorGrade: "중2",
    conceptKeys: ["2-1|연립일차방정식|19", "2-1|유리수와 순환소수|13"],
    curriculumBasis:
      "계수가 순환소수인 연립방정식(2-1|연립일차방정식|19)과 순환소수를 분수로 " +
      "나타내기(2-1|유리수와 순환소수|13). 둘 다 중2 2-1 이고 앵커(연립방정식, IV단원)가 " +
      "순환소수(I단원)보다 뒤다. 순환소수를 분수로 못 고치면 계수가 서지 않고, " +
      "연립을 못 풀면 해가 안 나온다.",
    laterConceptReview:
      "순환소수의 분수 표현과 연립방정식을 잇는 데서 그친다 — 무한등비급수(미적분)를 " +
      "쓰지 않고 중2 공식으로 고칠 뿐이다. 고등의 정식 개념을 만들지 않는다.",
    gradeBoundary: "학년 안(중2+중2).",
    salt: 0x1901,
    delegatesTo: "2-1|연립일차방정식|19",
  },
  {
    id: "중2|여러 가지 연립방정식의 풀이::중2|지수법칙",
    anchorSection: "여러 가지 연립방정식의 풀이",
    anchorGrade: "중2",
    conceptKeys: ["2-1|연립일차방정식|20", "2-1|단항식의 계산|01"],
    curriculumBasis:
      "지수법칙을 이용한 연립방정식(2-1|연립일차방정식|20)과 지수법칙 ⑴" +
      "(2-1|단항식의 계산|01). 둘 다 중2 2-1 이고 앵커(연립방정식, IV단원)가 " +
      "지수법칙(II단원)보다 뒤다. 지수법칙으로 지수를 뽑지 않으면 식이 서지 않고, " +
      "연립을 못 풀면 $x$, $y$ 가 안 나온다.",
    laterConceptReview:
      "밑이 같은 거듭제곱의 지수를 견주는 데서 그친다 — 로그(대수)도, 지수가 실수인 " +
      "지수법칙(대수)도 쓰지 않는다. 지수는 언제나 자연수다.",
    gradeBoundary: "학년 안(중2+중2).",
    salt: 0x2002,
    delegatesTo: "2-1|연립일차방정식|20",
  },
  {
    id: "중3|이차방정식의 풀이::중3|인수분해",
    anchorSection: "이차방정식의 풀이",
    anchorGrade: "중3",
    conceptKeys: ["3-1|이차방정식의 풀이|06", "3-1|다항식의 인수분해|03"],
    curriculumBasis:
      "인수분해를 이용한 이차방정식의 풀이(3-1|이차방정식의 풀이|06)와 " +
      "$x^2+(a+b)x+ab$ 꼴의 인수분해(3-1|다항식의 인수분해|03). 둘 다 중3 이고 " +
      "앵커(이차방정식, 3단원)가 인수분해(2단원)보다 뒤다. " +
      "⚠️ 이것은 **교과서가 정식으로 싣는 소단원 내용**이기도 하다 — 등록한 이유는 " +
      "「고난도 새 문형」이어서가 아니라 **분류에서 빠져 있었기 때문**이다" +
      "(우리 첫 결합형의 원천 키로 이미 쓰고 있으면서 분류표에는 없었다).",
    laterConceptReview:
      "인수분해와 이차방정식을 잇는 데서 그친다 — 근의 공식·판별식(3단원 뒤 / 공통수학1)도, " +
      "이차함수와의 관계(공통수학1)도 쓰지 않는다. 근은 언제나 유리수다.",
    gradeBoundary: "학년 안(중3+중3).",
    salt: 0x0603,
    delegatesTo: "3-1|이차방정식의 풀이|06",
  },
];

const BY_ID = new Map(DEFINITIONS.map((d) => [d.id, d]));

/** 등록된 결합형 목록 — CLI 가 `--list-combos` 로 보여 준다. */
export function middleComboDefinitions(): readonly {
  id: string;
  anchorSection: string;
  anchorGrade: string;
  conceptKeys: readonly string[];
  familyIds: readonly string[];
  /** 값이 있으면 **새로 쓴 문형이 아니라** 그 등록 유형을 그대로 부른다(D-110). */
  delegatesTo?: string;
  curriculumBasis: string;
  laterConceptReview: string;
  gradeBoundary: string;
}[] {
  return DEFINITIONS.map((d) => ({
    id: d.id,
    anchorSection: d.anchorSection,
    anchorGrade: d.anchorGrade,
    conceptKeys: d.conceptKeys,
    familyIds: d.families?.map((f) => f.id) ?? [d.delegatesTo!],
    delegatesTo: d.delegatesTo,
    curriculumBasis: d.curriculumBasis,
    laterConceptReview: d.laterConceptReview,
    gradeBoundary: d.gradeBoundary,
  }));
}

export function isMiddleComboId(key: string): boolean {
  return BY_ID.has(key);
}

/**
 * 승인된 결합형 하나를 낸다. 등록되지 않은 id 는 **던진다** — 조합기가 아니다.
 */
export function generateMiddleComboProblem(
  comboId: string,
  seed: number,
  variant = 0,
): MidComboProblem {
  const def = BY_ID.get(comboId);
  if (!def) {
    throw new Error(
      `승인되지 않은 결합형입니다: ${comboId} — middleComboDefinitions() 로 확인. ` +
        `새 문형은 원장님 승인(D-07) 뒤에만 등록한다.`,
    );
  }
  const head = {
    kind: "combo" as const,
    comboId: def.id,
    anchorSection: def.anchorSection,
    anchorGrade: def.anchorGrade,
    conceptKeys: def.conceptKeys,
  };

  // 위임 — 이미 등록된 유형이 곧 이 결합형이다. **그 유형을 그대로 부른다.**
  // `generateMiddleProblem` 을 지나가므로 지면 다듬기와 밑단 판정이 한 곳에서 돈다.
  if (def.delegatesTo !== undefined) {
    // ⚠️ **`salt` 를 더하지 않는다.** 위임의 뜻은 「이 결합형이 곧 그 유형이다」이므로
    //    같은 씨앗이면 **글자까지 같은 문항**이 나와야 한다. 그래야 시험이
    //    `generateMiddleProblem(원천, seed, variant)` 과 **직접 맞대어** 「같은 수학을
    //    두 벌 쓰지 않았다」를 잴 수 있다. 소금을 치면 그 대조가 불가능해지고,
    //    실제로 변이 시험에서 그 자리가 초록이었다(가드가 아니었다).
    const p = generateMiddleProblem(def.delegatesTo, seed, variant);
    return {
      ...head,
      familyId: def.delegatesTo,
      content: p.content,
      answer: p.answer,
      solution: p.solution,
      difficulty: p.difficulty,
      facts: Object.fromEntries(
        Object.entries(p.facts ?? {}).filter(
          (e): e is [string, number] => typeof e[1] === "number",
        ),
      ),
    };
  }

  const family = def.families[variant % def.families.length]!;
  const body = family.generate(createRng(seed + def.salt + variant * 0x9e37));
  return { ...head, familyId: family.id, ...body };
}

/** 한 결합형에서 n 문항 — 발문이 같은 것은 버리고 다시 뽑는다. */
export function generateMiddleComboSet(
  comboId: string,
  seed: number,
  count: number,
): MidComboProblem[] {
  const out: MidComboProblem[] = [];
  const seen = new Set<string>();
  for (let v = 0; out.length < count; v += 1) {
    if (v > count * 40) {
      throw new Error(
        `결합형 ${comboId} 에서 서로 다른 ${count}문항을 못 만들었습니다 — 변형 공간이 좁습니다.`,
      );
    }
    const p = generateMiddleComboProblem(comboId, seed, v);
    if (seen.has(p.content)) continue;
    seen.add(p.content);
    out.push(p);
  }
  return out;
}
