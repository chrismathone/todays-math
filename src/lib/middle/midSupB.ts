/**
 * 갈래 B 보강 유형 합본 — **RPM 색인 밖에서 지은 유형**을 한 곳에 모은다.
 *
 * ## 왜 모듈 명부(`M1_EXPR`·`M2_RATIONAL`·`M2_GEO_SIM`) 안이 아닌가
 *
 * 그 배열들은 **「RPM 색인 그대로」를 잠그는 시험**을 하나씩 달고 있다
 * (`middleM1Expr.test.ts` 의 「33유형 명부와 unitSection 이 실측 그대로다」 ·
 * `middleM2Geo.test.ts` 의 「네 중단원의 계획된 번호가 전부 등록돼 있다」 ·
 * `middleM2NumProb.test.ts` 의 유형별 검산표). `middleTypeCoverage.test.ts`
 * 머리말이 그 검사들을 두고 **「그래서 그 검사를 지우면 안 된다」**고 적어 두었다 —
 * 「유형만 더하고 시험을 안 쓴 경우」를 막는 유일한 자리이기 때문이다.
 *
 * 130소단원을 10유형으로 올리려면 RPM 이 안 만든 유형을 **지어야** 하므로
 * (2026-08-27 네 갈래 브리프), 지은 것을 그 명부에 섞으면 가드가 통째로 빨개지고
 * 그것을 초록으로 만드는 유일한 길은 **가드를 무르는 것**이다. 그래서 지은 것은
 * 명부 **밖**에 두고 여기서 합친다. 그러면
 *   - 모듈 명부는 여전히 「색인 그대로」다 (가드가 산다),
 *   - 지은 유형은 `src/__tests__/unit/midTypesB.test.ts` 가 따로 지킨다,
 *   - `generate.ts` 는 한 줄만 늘어난다 (병렬 세션 충돌 최소).
 *
 * ## 번호 규약 (2026-08-27, 갈래 C `1dd28385` 가 세운 것)
 *
 * 확장 번호는 **정본 최대 번호를 넘어야** 하고, 갈래끼리 겹치면 안 된다
 * (`generate.ts` 가 키 충돌을 던지지만, 나기 전에 안 겹치게 나눈다).
 *   갈래 A ~43 · **갈래 B** · 갈래 C 70번대 · 갈래 D ~38
 * 이미 착지한 B 몫은 `21~35` 다. **앞으로 B 가 새로 여는 중단원은 `50` 부터** 쓴다
 * — 20~40 번대는 A·D 와 부딪힐 수 있고, 70번대는 C 몫이다.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { eulReul, euroRo, waGwa } from "./m2Josa";

/** 주격 조사 — 받침 판정은 `m2Josa.eulReul` 한 곳에서 온다(규칙을 두 벌로 두지 않는다). */
function iGa(n: number): "이" | "가" {
  return eulReul(n) === "을" ? "이" : "가";
}

// ⚠️ **`./combo` 에서 «값»을 끌어오지 마라 — 고리가 생긴다.**
//    `combo.ts` 는 위임 결합형 때문에 `./generate` 를 부르고, `generate.ts` 는 이
//    파일을 부른다. 값을 끌어오면 `combo.ts` 가 **진입점**일 때 이 파일이 아직
//    반쯤 만들어진 `combo` 를 펴게 되어 `... is not iterable` 로 죽는다
//    (2026-08-27 실제로 `middleCombo.test.ts` 가 「0 test」로 통째로 안 돌았다).
//    타입만 끌어오는 것은 런타임에 지워지므로 안전하다.
import type { ComboFamily } from "./combo";
import { M1_EXPR_SUP_B } from "./m1Expr";
import { signed } from "./m1Shared";
import { M2_GEO_SIM_SUP_B } from "./m2GeoSim";
import { M2_PYTHA_SUP_B } from "./m2Pytha";
import { M2_RATIONAL_SUP_B } from "./m2Rational";
import type { MidProblem, TypeEntry } from "./types";

/**
 * 계수 $1$ 을 지면에 안 쓴다 — `1x` 는 값이 맞고 **지면만 흉하다**
 * (값 검산으로는 절대 안 잡힌다, CLAUDE.md 2026-08-24). $-1$ 은 `-x`.
 */
function coefTerm(k: number, v: string): string {
  if (k === 1) return v;
  if (k === -1) return `-${v}`;
  return `${k}${v}`;
}

/**
 * 식이 **문자로 끝날 때**의 조사. `-4x-3y` 는 「…와이」, `2x` 는 「…엑스」로 읽어
 * 둘 다 받침이 없다 — 그래서 늘 「를·가·는·와」다.
 *
 * ⚠️ 계수의 수(`eulReul(-3)`)로 정하면 **틀린다.** 소리의 끝은 계수가 아니라
 *    **마지막 문자**다. 2026-08-27 에 「$-4x-3y$**을** 더했더니」가 그렇게 나갔고,
 *    수식이 숫자로 안 끝나서 조사 가드도 「안 잼」으로 넘겼다.
 *    (`x` 엑스 · `y` 와이 · `a` 에이 · `b` 비 · `k` 케이 — 전부 받침 없음.
 *     `l`·`m`·`n` 은 엘·엠·엔이라 받침이 있으니 쓰게 되면 여기를 고칠 것.)
 */
const VAR_EUL = "를";
const VAR_IGA = "가";

/** 연립방정식의 기본 풀이를 서로 다른 소거 자리로 연습하는 여덟 문형. */
function linearSystemFamily(id: string, mode: number): ComboFamily {
  return {
    id,
    generate: (rng) => {
      const y = intBetween(rng, 2, 9);
      const p = intBetween(rng, 2, 5);
      // 🔴 **`q` 는 `p` 와 달라야 한다.** 같으면 mode 1 의 두 식이 **글자까지 같아지고**
      //    풀이가 「두 식을 빼서 $0x=0$」이 된다 — 해가 하나로 안 정해지는데 정답은
      //    하나로 찍힌다. 실측으로 씨앗 20260827 의 첫 변형이 바로 그 자리였다.
      //    값 검산이 「정답을 대입하면 두 식이 성립한다」만 물으면 **통과한다**
      //    (성립하기는 한다). 「해가 하나인가」를 따로 물어야 갈린다.
      const q = (() => {
        const other = intBetween(rng, 2, 4);
        return other >= p ? other + 1 : other;
      })();
      // mode 5 는 첫 식이 $\dfrac{x}{p}$ 라 **`x` 가 `p` 의 배수여야** 우변이 정수다
      // (아니면 지면에 `4.8` 이 찍힌다). 다른 갈래에는 아무 영향이 없다.
      const x = mode === 5 ? p * intBetween(rng, 1, 3) : intBetween(rng, 2, 9);
      let content: string;
      let solution: string;
      let answer = `$x=${x},\\ y=${y}$`;
      if (mode === 0) {
        const a = x + y;
        const b = x - y;
        content = `연립방정식 $\\begin{cases}x+y=${a}\\\\x-y=${b}\\end{cases}$를 푸시오.`;
        solution = `두 식을 더하면 $2x=${2 * x}$이므로 $x=${x}$이다. 이를 첫째 식에 대입하면 $y=${a}-${x}=${y}$이다.`;
      } else if (mode === 1) {
        const a = p * x + y;
        const b = q * x + y;
        content = `연립방정식 $\\begin{cases}${p}x+y=${a}\\\\${q}x+y=${b}\\end{cases}$를 푸시오.`;
        solution = `두 식을 빼면 $${coefTerm(p - q, "x")}=${a - b}$이므로 $x=${x}$이다. 이를 첫째 식에 대입하면 $y=${a}-${p}\\times${x}=${y}$이다.`;
      } else if (mode === 2) {
        const d = y - p * x;
        const s = x + q * y;
        content = `연립방정식 $\\begin{cases}y=${p}x${signed(d)}\\\\x+${q}y=${s}\\end{cases}$를 대입법으로 푸시오.`;
        solution = `둘째 식의 $y$에 $${p}x${signed(d)}$${eulReul(d)} 대입하면 $x+${q}(${p}x${signed(d)})=${s}$이므로 $x=${x}$이다. 따라서 $y=${y}$이다.`;
      } else if (mode === 3) {
        const a = p * (x + y);
        const b = q * x - y;
        content = `연립방정식 $\\begin{cases}${p}(x+y)=${a}\\\\${q}x-y=${b}\\end{cases}$를 푸시오.`;
        solution = `첫째 식의 양변을 $${p}$${euroRo(p)} 나누면 $x+y=${x + y}$이다. 이 식과 둘째 식을 더하면 $${coefTerm(q + 1, "x")}=${(q + 1) * x}$이므로 $x=${x}$, $y=${y}$이다.`;
      } else if (mode === 4) {
        const a = p * x + q * y;
        const b = q * x - p * y;
        content = `연립방정식 $\\begin{cases}${p}x+${q}y=${a}\\\\${q}x-${p}y=${b}\\end{cases}$를 가감법으로 푸시오.`;
        solution = `첫째 식에 $${p}$, 둘째 식에 $${q}$${eulReul(q)} 곱해 더하면 $${p * p + q * q}x=${(p * p + q * q) * x}$이므로 $x=${x}$이다. 대입하여 $y=${y}$${eulReul(y)} 얻는다.`;
      } else if (mode === 5) {
        const a = x + p * y;
        const b = q * x - y;
        content = `연립방정식 $\\begin{cases}\\dfrac{x}{${p}}+y=${a / p}\\\\${q}x-y=${b}\\end{cases}$를 푸시오.`;
        solution = `첫째 식의 양변에 $${p}$${eulReul(p)} 곱하면 $x+${p}y=${a}$이다. 정리한 두 식을 가감법으로 풀면 $x=${x}$, $y=${y}$이다.`;
      } else if (mode === 6) {
        const a = p * x + p * y;
        const b = q * x - q * y;
        content = `연립방정식 $\\begin{cases}${p}x+${p}y=${a}\\\\${q}x-${q}y=${b}\\end{cases}$를 가장 간단한 식으로 고쳐 푸시오.`;
        solution = `첫째 식을 $${p}$${euroRo(p)}, 둘째 식을 $${q}$${euroRo(q)} 나누면 $x+y=${x + y}$, $x-y=${x - y}$이다. 두 식을 더하고 대입하면 $x=${x}$, $y=${y}$이다.`;
      } else {
        const a = x + y;
        const b = p * x - y;
        const value = q * x + p * y;
        content = `연립방정식 $\\begin{cases}x+y=${a}\\\\${p}x-y=${b}\\end{cases}$의 해가 $(x, y)$일 때, $${q}x+${p}y$의 값을 구하시오.`;
        answer = `$${value}$`;
        solution = `두 식을 더하면 $${coefTerm(p + 1, "x")}=${(p + 1) * x}$이므로 $x=${x}$이고, $y=${y}$이다. 따라서 $${q}x+${p}y=${q}\\times${x}+${p}\\times${y}=${value}$이다.`;
      }
      return {
        content,
        answer,
        solution,
        difficulty: mode < 2 ? "기본" : mode < 7 ? "응용" : "심화",
        facts: { mode, x, y, p, q },
      };
    },
  };
}

export const SYSTEM_FAMILIES = [
  linearSystemFamily("system-add-opposites", 0),
  linearSystemFamily("system-subtract-equal-coefficients", 1),
  linearSystemFamily("system-substitution", 2),
  linearSystemFamily("system-remove-parentheses", 3),
  linearSystemFamily("system-cross-multiplication", 4),
  linearSystemFamily("system-clear-denominator", 5),
  linearSystemFamily("system-common-factor", 6),
  linearSystemFamily("system-expression-value", 7),
] as const;

function repeatingDecimalEntry(index: number, title: string): TypeEntry {
  const rpmType = String(29 + index).padStart(2, "0");
  return {
    key: `2-1|유리수와 순환소수|${rpmType}`,
    grade: "중2",
    unitSection: "순환소수",
    rpmBook: "2-1",
    rpmMinor: "유리수와 순환소수",
    rpmType,
    rpmTitle: title,
    handler: (rng) => {
      const a = intBetween(rng, 1, 8);
      let b = intBetween(rng, 1, 8);
      if (b === a) b = (b % 8) + 1;
      const block = `${a}${b}`;
      const n = intBetween(rng, 4, 15);
      const digit = n % 2 === 1 ? a : b;
      const bodies = [
        {
          content: `순환소수 $0.${block}${block}\\cdots$의 순환마디를 쓰시오.`,
          answer: `$${block}$`,
          solution: `소수점 아래에서 $${block}$${iGa(Number(block))} 한없이 되풀이되므로 순환마디는 $${block}$이다.`,
        },
        {
          content: `순환마디가 $${block}$인 순환소수 $0.${block}${block}\\cdots$를 순환소수의 기호를 사용하여 나타내시오.`,
          answer: `$0.\\overline{${block}}$`,
          solution: `되풀이되는 첫 숫자부터 마지막 숫자까지 윗줄을 그으면 $0.\\overline{${block}}$이다.`,
        },
        {
          content: `순환소수 $0.\\overline{${block}}$의 순환마디를 이루는 숫자의 개수를 구하시오.`,
          answer: `$2$개`,
          solution: `순환마디는 두 자리 수 $${block}$이므로 숫자의 개수는 $2$개이다.`,
        },
        {
          // ⚠️ 숫자는 `$…$` 안에만 — 예전에는 `${n}번째` 가 수식 밖이었다
          //    (`bareNumbers` 로 16자리). 그리고 해설이 「나머지에 따라」라고만
          //    적고 **나머지를 안 보여 줬다** — 학생이 따라갈 수 없다.
          content: `순환소수 $0.\\overline{${block}}$의 소수점 아래 $${n}$번째 자리의 숫자를 구하시오.`,
          answer: `$${digit}$`,
          solution: `순환마디는 $${block}$이고 그 길이는 $2$이다. $${n}$${eulReul(n)} $2$로 나눈 나머지가 $${n % 2}$이므로 소수점 아래 $${n}$번째 숫자는 순환마디의 ${n % 2 === 1 ? "첫째" : "둘째"} 숫자인 $${digit}$이다.`,
        },
        {
          content: `두 순환소수 $0.\\overline{${a}${b}}$, $0.\\overline{${b}${a}}$ 중 큰 수를 쓰시오.`,
          answer:
            a > b ? `$0.\\overline{${a}${b}}$` : `$0.\\overline{${b}${a}}$`,
          solution: `소수점 아래 첫째 자리의 숫자를 비교하면 $${Math.max(a, b)}>${Math.min(a, b)}$이므로 첫째 자리가 더 큰 순환소수가 크다.`,
        },
        {
          content: `순환소수 $2.${block}${block}\\cdots$의 정수 부분과 순환마디를 차례로 쓰시오.`,
          answer: `$2,\\ ${block}$`,
          solution: `소수점 왼쪽의 정수 부분은 $2$이고, 소수점 아래에서 되풀이되는 순환마디는 $${block}$이다.`,
        },
      ][index - 1]!;
      return {
        grade: "중2",
        unitSection: "순환소수",
        rpmBook: "2-1",
        rpmMinor: "유리수와 순환소수",
        rpmType,
        rpmTitle: title,
        difficulty: index < 4 ? "기본" : "응용",
        ...bodies,
        facts: { index, a, b, n, digit },
      };
    },
  };
}

const REPEATING_DECIMAL_TYPES = [
  repeatingDecimalEntry(1, "순환마디 찾기"),
  repeatingDecimalEntry(2, "순환소수의 기호로 나타내기"),
  repeatingDecimalEntry(3, "순환마디의 길이"),
  repeatingDecimalEntry(4, "순환소수의 특정 자리 숫자"),
  repeatingDecimalEntry(5, "순환소수의 대소 비교"),
  repeatingDecimalEntry(6, "순환소수의 정수 부분과 순환마디"),
] as const;

/**
 * 결합형 파일이 맡은 일반 중등 유형. `M2_GEO_SIM`이 이 배열을 제품 레지스트리에
 * 합친다. 결합형 CLI 등록과 달리 시험지의 10갈래로 직접 선택되는 유형들이다.
 */
const SYSTEM_TYPE_ENTRIES: TypeEntry[] = SYSTEM_FAMILIES.map(
  (family, index) => {
    const rpmType = String(21 + index).padStart(2, "0");
    const rpmTitle = [
      "가감법으로 연립방정식 풀기 덧셈",
      "가감법으로 연립방정식 풀기 뺄셈",
      "대입법으로 연립방정식 풀기",
      "괄호가 있는 연립방정식",
      "두 식에 수를 곱하여 푸는 연립방정식",
      "분모를 없애어 푸는 연립방정식",
      "공통인수로 나누어 푸는 연립방정식",
      "연립방정식의 해를 이용한 식의 값",
    ][index]!;
    return {
      key: `2-1|연립일차방정식|${rpmType}`,
      grade: "중2",
      unitSection: "연립방정식의 풀이",
      rpmBook: "2-1",
      rpmMinor: "연립일차방정식",
      rpmType,
      rpmTitle,
      handler: (rng) => ({
        grade: "중2",
        unitSection: "연립방정식의 풀이",
        rpmBook: "2-1",
        rpmMinor: "연립일차방정식",
        rpmType,
        rpmTitle,
        ...family.generate(rng),
      }),
    };
  },
);

export const MIDDLE_COMBO_TYPES: TypeEntry[] = [
  ...SYSTEM_TYPE_ENTRIES,
  ...REPEATING_DECIMAL_TYPES,
];

// ══════════════════════════════════════════════════════════════
//  남의 모듈 소단원 몫 — 그 파일은 이 갈래 것이 아니라 여기서 짓는다
// ══════════════════════════════════════════════════════════════

type Body = Pick<
  MidProblem,
  "content" | "answer" | "solution" | "facts" | "figureSpec"
>;

/** 유형 하나. 머리(grade·book·minor·type·title)를 두 번 안 적게 묶는다. */
function mkType(
  grade: string,
  rpmBook: string,
  rpmMinor: string,
  rpmType: string,
  rpmTitle: string,
  unitSection: string,
  difficulty: MidProblem["difficulty"],
  gen: (rng: Rng) => Body,
): TypeEntry {
  const head = { grade, unitSection, rpmBook, rpmMinor, rpmType, rpmTitle };
  return {
    key: `${rpmBook}|${rpmMinor}|${rpmType}`,
    ...head,
    handler: (rng) => ({ ...head, difficulty, ...gen(rng) }),
  };
}

/**
 * 중1 「각」 보강 둘 — pool 갈래가 기본2·응용6 이라 **기본 넷**이 필요하다.
 * 둘을 더하면 기본4·응용6 이 되어 「연산 1」은 인접 대체가 기본에서 가져간다.
 *
 * 그림을 안 붙인다 — 두 문형 다 수치가 발문에 다 있어 그림 없이 풀린다.
 * (장식으로 붙이면 「그림이 필요한데 없다」와 반대쪽 결함이 된다.)
 */
const ANGLE_SUPPLEMENTS: TypeEntry[] = [
  mkType(
    "중1",
    "1-2",
    "기본 도형",
    "50",
    "각을 등분한 한 각의 크기",
    "각",
    "기본",
    (rng) => {
      const n = intBetween(rng, 3, 6);
      const unit = intBetween(rng, 8, 25);
      const total = n * unit;
      return {
        content: `크기가 $${total}^\\circ$인 각을 크기가 같은 $${n}$개의 각으로 나누었다. 나누어진 한 각의 크기를 구하시오.`,
        answer: `$${unit}^\\circ$`,
        solution: `크기가 같은 $${n}$개의 각으로 나누었으므로 한 각의 크기는 $${total}^\\circ\\div${n}=${unit}^\\circ$이다.`,
        facts: { n, total, x: unit },
      };
    },
  ),

  mkType(
    "중1",
    "1-2",
    "기본 도형",
    "51",
    "둔각인 것의 개수 세기",
    "각",
    "기본",
    (rng) => {
      // 예각·직각·둔각·평각이 **모두 나올 수 있게** 뽑는다 — 한 갈래만 나오면
      // 「둔각의 개수」가 늘 같은 수가 되어 변형이 뜻을 잃는다.
      const angles = Array.from({ length: 5 }, () =>
        pickAngle(intBetween(rng, 0, 3), rng),
      );
      const obtuse = angles.filter((a) => a > 90 && a < 180).length;
      return {
        content: `다음 각 중에서 둔각은 모두 몇 개인지 구하시오.\n$${angles.map((a) => `${a}^\\circ`).join("$, $")}$`,
        answer: `$${obtuse}$개`,
        solution: `둔각은 $90^\\circ$보다 크고 $180^\\circ$보다 작은 각이다.\n주어진 각 가운데 그 조건을 만족하는 것은 $${obtuse}$개이다.`,
        facts: {
          a0: angles[0]!,
          a1: angles[1]!,
          a2: angles[2]!,
          a3: angles[3]!,
          a4: angles[4]!,
          x: obtuse,
        },
      };
    },
  ),
];

/** 예각(0) · 직각(1) · 둔각(2) · 평각(3) 중 하나를 그 갈래 안에서 뽑는다. */
function pickAngle(kind: number, rng: Rng): number {
  if (kind === 1) return 90;
  if (kind === 3) return 180;
  if (kind === 2) return intBetween(rng, 91, 179);
  return intBetween(rng, 10, 89);
}

/**
 * 중3 「인수분해」 보강 하나 — pool 갈래가 연산4·기본1·응용3·심화1 이라
 * 「심화 1」이 응용의 인접 대체로 먹혀 시험지가 한 자리 모자랐다.
 * 그래서 **심화 하나**다.
 */
const FACTOR_SUPPLEMENTS: TypeEntry[] = [
  mkType(
    "중3",
    "3-1",
    "다항식의 인수분해",
    "50",
    "인수분해한 두 일차식의 상수항의 합",
    "인수분해",
    "심화",
    (rng) => {
      // 🔴 인수분해가 **하나로 정해져야** 답이 하나다.
      //    최고차항의 계수를 $1$ 또는 소수로만 잡으면 두 일차식으로 가르는 방법이
      //    (순서를 빼고) 하나뿐이다. $4$ 처럼 합성수면 갈래가 둘이 될 수 있다.
      const c = pick(rng, [1, 2, 3, 5] as const);
      const b = intBetween(rng, 1, 6);
      const d = attempt(60, () => {
        const v = intBetween(rng, 1, 6);
        return gcdOf(c, v) === 1 ? v : null;
      });
      const mid = d + b * c;
      const tail = b * d;
      const lead = c === 1 ? "x^2" : `${c}x^2`;
      return {
        content: `이차식 $${lead}+${mid}x+${tail}$${eulReul(tail)} 계수가 자연수인 두 일차식의 곱으로 인수분해할 때, 두 일차식의 상수항의 합을 구하시오.`,
        answer: `$${b + d}$`,
        solution: `$${lead}+${mid}x+${tail}=(x+${b})(${c === 1 ? "" : c}x+${d})$이다.\n두 일차식의 상수항은 $${b}$${waGwa(b)} $${d}$이므로 그 합은 $${b}+${d}=${b + d}$이다.`,
        facts: { c, b, d, mid, tail, x: b + d },
      };
    },
  ),
];

/**
 * 중2 「다항식의 덧셈과 뺄셈」 보강 셋 · 「다항식의 곱셈과 나눗셈」 보강 넷.
 *
 * 둘 다 **기본이 모자란다** — 덧셈·뺄셈은 연산2·기본1·응용4, 곱셈·나눗셈은
 * 연산1·응용3·심화2 다. 그래서 전부 기본으로 짓는다.
 *
 * ⚠️ 「$(2x+3y)+(x-y)$를 계산하시오」처럼 지시가 하나뿐인 발문은
 *    `resolveMiddleTier` 가 **밑단(연산)으로 내린다.** 그러면 기본이 안 채워진다.
 *    그래서 «$A$, $B$ 로 놓고» 묻는다 — 실제로 한 단계(치환)가 더 있다.
 */
function polyTerm(cx: number, cy: number): string {
  const head = coefTerm(cx, "x");
  if (cy === 0) return head;
  return `${head}${cy > 0 ? "+" : "-"}${coefTerm(Math.abs(cy), "y")}`;
}

const POLY_SUPPLEMENTS: TypeEntry[] = [
  ...([0, 1, 2] as const).map((mode) =>
    mkType(
      "중2",
      "2-1",
      "다항식의 계산",
      String(50 + mode),
      [
        "두 다항식을 문자로 놓고 더하기",
        "두 다항식을 문자로 놓고 빼기",
        "어떤 식 구하기 다항식의 덧셈",
      ][mode]!,
      "다항식의 덧셈과 뺄셈",
      "기본",
      (rng) => {
        const a = intNonzeroIn(rng, 2, 6);
        const b = intNonzeroIn(rng, 2, 6);
        const c = intNonzeroIn(rng, 2, 6);
        const d = intNonzeroIn(rng, 2, 6);
        if (mode === 0) {
          return {
            content: `$A=${polyTerm(a, b)}$, $B=${polyTerm(c, d)}$일 때, $A+B$를 계산하시오.`,
            answer: `$${polyTerm(a + c, b + d)}$`,
            solution: `$A+B=(${polyTerm(a, b)})+(${polyTerm(c, d)})$이다.\n동류항끼리 모으면 $${polyTerm(a + c, b + d)}$이다.`,
            facts: { mode, a, b, c, d },
          };
        }
        if (mode === 1) {
          return {
            content: `$A=${polyTerm(a, b)}$, $B=${polyTerm(c, d)}$일 때, $A-B$를 계산하시오.`,
            answer: `$${polyTerm(a - c, b - d)}$`,
            solution: `$A-B=(${polyTerm(a, b)})-(${polyTerm(c, d)})$이다.\n괄호를 풀 때 뒤 식의 부호가 모두 바뀌므로 $${polyTerm(a - c, b - d)}$이다.`,
            facts: { mode, a, b, c, d },
          };
        }
        return {
          content: `어떤 식에 $${polyTerm(a, b)}$${VAR_EUL} 더했더니 $${polyTerm(a + c, b + d)}$${VAR_IGA} 되었다. 어떤 식을 구하시오.`,
          answer: `$${polyTerm(c, d)}$`,
          solution: `(어떤 식)$=(${polyTerm(a + c, b + d)})-(${polyTerm(a, b)})$이다.\n동류항끼리 계산하면 $${polyTerm(c, d)}$이다.`,
          facts: { mode, a, b, c, d },
        };
      },
    ),
  ),

  ...([0, 1, 2, 3] as const).map((mode) =>
    mkType(
      "중2",
      "2-1",
      "다항식의 계산",
      String(53 + mode),
      [
        "단항식과 다항식의 곱을 문자로 놓고 전개하기",
        "다항식을 단항식으로 나누기 문자로 놓기",
        "어떤 식 구하기 단항식의 곱셈",
        "어떤 식 구하기 단항식의 나눗셈",
      ][mode]!,
      "다항식의 곱셈과 나눗셈",
      "기본",
      (rng) => {
        const k = intBetween(rng, 2, 5);
        const a = intNonzeroIn(rng, 2, 6);
        const b = intNonzeroIn(rng, 2, 6);
        if (mode === 0) {
          return {
            content: `$A=${polyTerm(a, b)}$일 때, $${k}x\\times A$를 전개하시오.`,
            answer: `$${coefTerm(k * a, "x^2")}${k * b > 0 ? "+" : "-"}${coefTerm(Math.abs(k * b), "xy")}$`,
            solution: `$${k}x\\times(${polyTerm(a, b)})$의 각 항에 $${k}x$${VAR_EUL} 곱한다.\n따라서 $${coefTerm(k * a, "x^2")}${k * b > 0 ? "+" : "-"}${coefTerm(Math.abs(k * b), "xy")}$이다.`,
            facts: { mode, k, a, b },
          };
        }
        if (mode === 1) {
          return {
            content: `$A=${coefTerm(k * a, "x^2")}${k * b > 0 ? "+" : "-"}${coefTerm(Math.abs(k * b), "xy")}$일 때, $A\\div${k}x$를 계산하시오.`,
            answer: `$${polyTerm(a, b)}$`,
            solution: `$A\\div${k}x$는 $A$의 각 항을 $${k}x$로 나눈 것과 같다.\n따라서 $${polyTerm(a, b)}$이다.`,
            facts: { mode, k, a, b },
          };
        }
        if (mode === 2) {
          return {
            content: `어떤 식에 $${k}x$${VAR_EUL} 곱했더니 $${coefTerm(k * a, "x^2")}${k * b > 0 ? "+" : "-"}${coefTerm(Math.abs(k * b), "xy")}$${VAR_IGA} 되었다. 어떤 식을 구하시오.`,
            answer: `$${polyTerm(a, b)}$`,
            solution: `(어떤 식)$=(${coefTerm(k * a, "x^2")}${k * b > 0 ? "+" : "-"}${coefTerm(Math.abs(k * b), "xy")})\\div${k}x$이다.\n각 항을 나누면 $${polyTerm(a, b)}$이다.`,
            facts: { mode, k, a, b },
          };
        }
        return {
          content: `어떤 식을 $${k}x$로 나누었더니 $${polyTerm(a, b)}$${VAR_IGA} 되었다. 어떤 식을 구하시오.`,
          answer: `$${coefTerm(k * a, "x^2")}${k * b > 0 ? "+" : "-"}${coefTerm(Math.abs(k * b), "xy")}$`,
          solution: `(어떤 식)$=(${polyTerm(a, b)})\\times${k}x$이다.\n각 항에 $${k}x$${VAR_EUL} 곱하면 $${coefTerm(k * a, "x^2")}${k * b > 0 ? "+" : "-"}${coefTerm(Math.abs(k * b), "xy")}$이다.`,
          facts: { mode, k, a, b },
        };
      },
    ),
  ),
];

/**
 * 중2 「여러 가지 연립방정식의 풀이」 보강 넷 — pool 갈래가 **응용4·심화2** 라
 * 기본이 하나도 없다. 넷 다 기본이다.
 *
 * 이미 있는 08·09·10·11(괄호·소수·비례식·$A=B=C$)은 전부 **응용**이라, 여기서는
 * 그 앞 단계 — 「고쳐 쓴 식을 답하기」와 「분수 계수 풀기」 — 를 맡는다.
 */
const SYSTEM_VARIANT_SUPPLEMENTS: TypeEntry[] = ([0, 1, 2, 3] as const).map(
  (mode) =>
    mkType(
      "중2",
      "2-1",
      "연립일차방정식",
      String(50 + mode),
      [
        "계수가 분수인 연립방정식 풀기",
        "소수 계수를 정수로 고친 식 쓰기",
        "괄호를 풀어 정리한 식 쓰기",
        "분모를 없애어 정수 계수로 고친 식 쓰기",
      ][mode]!,
      "여러 가지 연립방정식의 풀이",
      "기본",
      (rng): Body => {
        if (mode === 0) {
          const p = intBetween(rng, 2, 4);
          const q = attempt(40, () => {
            const v = intBetween(rng, 2, 5);
            return v === p ? null : v;
          });
          const u = intBetween(rng, 1, 4);
          const v = intBetween(rng, 1, 4);
          const x = p * u;
          const y = q * v;
          return {
            content: `연립방정식 $\\begin{cases}\\dfrac{x}{${p}}+\\dfrac{y}{${q}}=${u + v}\\\\x-y=${x - y}\\end{cases}$를 푸시오.`,
            answer: `$x=${x},\\ y=${y}$`,
            solution: `첫째 식의 양변에 $${p * q}$${eulReul(p * q)} 곱하면 $${q}x+${p}y=${p * q * (u + v)}$이다.\n둘째 식과 연립하여 풀면 $x=${x}$, $y=${y}$이다.`,
            facts: { mode, p, q, x, y },
          };
        }
        if (mode === 1) {
          const a = intBetween(rng, 1, 9);
          const b = intBetween(rng, 1, 9);
          const c = intBetween(rng, 1, 9);
          return {
            content: `일차방정식 $0.${a}x+0.${b}y=0.${c}$의 양변에 $10$을 곱하여 계수와 상수항을 모두 정수로 고친 식을 쓰시오.`,
            answer: `$${coefTerm(a, "x")}+${coefTerm(b, "y")}=${c}$`,
            solution: `소수의 계수를 정수로 고치려면 양변에 $10$${eulReul(10)} 곱한다.\n$0.${a}x\\times10=${coefTerm(a, "x")}$, $0.${b}y\\times10=${coefTerm(b, "y")}$, $0.${c}\\times10=${c}$이므로 $${coefTerm(a, "x")}+${coefTerm(b, "y")}=${c}$이다.`,
            facts: { mode, a, b, c },
          };
        }
        if (mode === 2) {
          const p = intBetween(rng, 2, 5);
          const q = intBetween(rng, 2, 5);
          const r = intBetween(rng, 1, 9);
          // 빼는 항의 계수를 `p*q+1` 로 두면 $y$ 의 계수가 **늘 $-1$** 이라
          // 변형이 뜻을 잃는다. `t` 만큼 넘겨 갈래가 생기게 한다.
          const t = intBetween(rng, 1, 3);
          const yCoef = -t;
          return {
            content: `일차방정식 $${p}(x+${q}y)-${p * q + t}y=${r}$의 괄호를 풀어 $x$, $y$에 대하여 정리한 식을 쓰시오.`,
            answer: `$${coefTerm(p, "x")}${yCoef > 0 ? "+" : "-"}${coefTerm(Math.abs(yCoef), "y")}=${r}$`,
            solution: `괄호를 풀면 $${coefTerm(p, "x")}+${coefTerm(p * q, "y")}-${coefTerm(p * q + t, "y")}=${r}$이다.\n동류항끼리 모으면 $${coefTerm(p, "x")}${yCoef > 0 ? "+" : "-"}${coefTerm(Math.abs(yCoef), "y")}=${r}$이다.`,
            facts: { mode, p, q, r, t, yCoef },
          };
        }
        const p = intBetween(rng, 2, 4);
        const q = attempt(40, () => {
          const v = intBetween(rng, 2, 5);
          return v === p ? null : v;
        });
        const lcm = (p * q) / gcdOf(p, q);
        const r = intBetween(rng, 1, 6);
        return {
          content: `일차방정식 $\\dfrac{x}{${p}}-\\dfrac{y}{${q}}=${r}$의 양변에 $${lcm}$${eulReul(lcm)} 곱하여 계수와 상수항을 모두 정수로 고친 식을 쓰시오.`,
          answer: `$${coefTerm(lcm / p, "x")}-${coefTerm(lcm / q, "y")}=${lcm * r}$`,
          solution: `두 분모 $${p}$${waGwa(p)} $${q}$의 최소공배수는 $${lcm}$이다.\n양변에 $${lcm}$${eulReul(lcm)} 곱하면 $${coefTerm(lcm / p, "x")}-${coefTerm(lcm / q, "y")}=${lcm * r}$이다.`,
          facts: { mode, p, q, lcm, r },
        };
      },
    ),
);

/**
 * 중2 「부등식」 보강 일곱 · 「일차부등식의 풀이」 보강 일곱.
 *
 * 두 소단원 다 **pool 갈래가 셋뿐**이었다(부등식 기본2·응용1 · 풀이 기본1·응용2) —
 * 등록 유형은 5·4 인데 01·04·06 이 **이미 객관식**이라 단답행을 안 낸다.
 * 그래서 「10개로 올린다」가 아니라 **일곱씩** 필요했다.
 */
const IN = { le: "\\le", ge: "\\ge", lt: "<", gt: ">" } as const;

const INEQUALITY_SUPPLEMENTS: TypeEntry[] = [
  ...([0, 1, 2, 3, 4, 5, 6] as const).map((mode) =>
    mkType(
      "중2",
      "2-1",
      "일차부등식",
      String(50 + mode),
      [
        "이상 이하 초과 미만을 부등식으로 나타내기",
        "부등식의 성질 양변에 같은 수를 곱하거나 나누기",
        "문장을 부등식으로 나타내기",
        "일차식의 값의 범위 계수가 양수",
        "일차식의 값의 범위 계수가 음수",
        "주어진 범위 안의 정수의 개수",
        "두 문자의 차의 값의 범위",
      ][mode]!,
      "부등식",
      mode < 3 ? "기본" : mode < 6 ? "응용" : "심화",
      (rng): Body => {
        if (mode === 0) {
          const a = intBetween(rng, 2, 9);
          const b = a + intBetween(rng, 2, 9);
          const lowClosed = intBetween(rng, 0, 1) === 0;
          const highClosed = intBetween(rng, 0, 1) === 0;
          const lowWord = lowClosed ? "이상" : "초과";
          const highWord = highClosed ? "이하" : "미만";
          const lo = lowClosed ? IN.le : IN.lt;
          const hi = highClosed ? IN.le : IN.lt;
          return {
            content: `$x$는 $${a}$ ${lowWord}이고 $${b}$ ${highWord}이다. $x$의 값의 범위를 부등식으로 나타내시오.`,
            answer: `$${a}${lo} x${hi}${b}$`,
            solution: `「${lowWord}」${eunNeunWord(lowWord)} 그 수를 ${lowClosed ? "포함하고" : "포함하지 않고"}, 「${highWord}」${eunNeunWord(highWord)} 그 수를 ${highClosed ? "포함한다" : "포함하지 않는다"}.\n따라서 $${a}${lo} x${hi}${b}$이다.`,
            facts: {
              mode,
              a,
              b,
              lowClosed: lowClosed ? 1 : 0,
              highClosed: highClosed ? 1 : 0,
            },
          };
        }
        if (mode === 1) {
          const c = intBetween(rng, 2, 6);
          const neg = intBetween(rng, 0, 1) === 0;
          const divide = intBetween(rng, 0, 1) === 0;
          const left = divide
            ? `\\dfrac{a}{${neg ? -c : c}}`
            : `${neg ? -c : c}a`;
          const right = divide
            ? `\\dfrac{b}{${neg ? -c : c}}`
            : `${neg ? -c : c}b`;
          const op = neg ? ">" : "<";
          return {
            // 분수·단항식은 끝이 문자(`a`·`b` — 에이·비)라 접속 조사가 늘 「와」다.
            content: `$a<b$일 때, $${left}$와 $${right}$의 대소를 부등호를 사용하여 나타내시오.`,
            answer: `$${left}${op}${right}$`,
            solution: `부등식의 양변${divide ? "을" : "에"} ${neg ? "음수" : "양수"}인 $${neg ? -c : c}$${divide ? euroRo(c) : eulReul(c)} ${divide ? "나누면" : "곱하면"} 부등호의 방향이 ${neg ? "바뀐다" : "그대로다"}.\n따라서 $${left}${op}${right}$이다.`,
            facts: { mode, c, neg: neg ? 1 : 0, divide: divide ? 1 : 0 },
          };
        }
        if (mode === 2) {
          const a = intBetween(rng, 2, 9);
          const b = intBetween(rng, 2, 9);
          const c = intBetween(rng, 2, 20);
          const kind = intBetween(rng, 0, 3);
          const word = [
            "보다 크다",
            "보다 작다",
            "보다 작지 않다",
            "보다 크지 않다",
          ][kind]!;
          const op = [IN.gt, IN.lt, IN.ge, IN.le][kind]!;
          return {
            content: `어떤 수 $x$의 $${a}$배에서 $${b}$${eulReul(b)} 뺀 수는 $${c}$${word}. 이를 부등식으로 나타내시오.`,
            answer: `$${a}x-${b}${op}${c}$`,
            solution: `「$x$의 $${a}$배에서 $${b}$${eulReul(b)} 뺀 수」는 $${a}x-${b}$이다.\n「$${c}$${word}」는 $${op}${c}$${euroRo(c)} 나타내므로 $${a}x-${b}${op}${c}$이다.`,
            facts: { mode, a, b, c, kind },
          };
        }
        if (mode === 3) {
          const p = intBetween(rng, -5, 2);
          const q = p + intBetween(rng, 2, 6);
          const a = intBetween(rng, 2, 5);
          const b = intBetween(rng, 1, 9);
          return {
            content: `$${p}\\le x\\le${q}$일 때, $${a}x+${b}$의 값의 범위를 구하시오.`,
            answer: `$${a * p + b}\\le ${a}x+${b}\\le${a * q + b}$`,
            solution: `각 변에 $${a}$${eulReul(a)} 곱하면 $${a * p}\\le ${a}x\\le${a * q}$이다.\n각 변에 $${b}$${eulReul(b)} 더하면 $${a * p + b}\\le ${a}x+${b}\\le${a * q + b}$이다.`,
            facts: { mode, p, q, a, b },
          };
        }
        if (mode === 4) {
          const p = intBetween(rng, -4, 2);
          const q = p + intBetween(rng, 2, 6);
          const a = intBetween(rng, 2, 5);
          const b = intBetween(rng, 1, 9);
          return {
            content: `$${p}<x\\le${q}$일 때, $-${a}x+${b}$의 값의 범위를 구하시오.`,
            answer: `$${-a * q + b}\\le -${a}x+${b}<${-a * p + b}$`,
            solution: `각 변에 음수인 $-${a}$${eulReul(a)} 곱하면 부등호의 방향이 바뀌어 $${-a * q}\\le -${a}x<${-a * p}$이다.\n각 변에 $${b}$${eulReul(b)} 더하면 $${-a * q + b}\\le -${a}x+${b}<${-a * p + b}$이다.`,
            facts: { mode, p, q, a, b },
          };
        }
        if (mode === 5) {
          const p = intBetween(rng, 1, 6);
          const q = intBetween(rng, 2, 8);
          return {
            content: `$-${p}\\le x<${q}$${eulReul(q)} 만족시키는 정수 $x$의 개수를 구하시오.`,
            answer: `$${q + p}$개`,
            solution: `$x$는 $-${p}$부터 $${q - 1}$까지의 정수이다($${q}$${eunNeunOf(q)} 포함하지 않는다).\n따라서 그 개수는 $${q - 1}-(-${p})+1=${q + p}$이다.`,
            facts: { mode, p, q, x: q + p },
          };
        }
        const a = intBetween(rng, -4, 2);
        const b = a + intBetween(rng, 2, 6);
        const c = intBetween(rng, 1, 5);
        const d = c + intBetween(rng, 2, 6);
        return {
          content: `$${a}\\le x\\le${b}$이고 $${c}\\le y\\le${d}$일 때, $x-y$의 값의 범위를 구하시오.`,
          answer: `$${a - d}\\le x-y\\le${b - c}$`,
          solution: `$-y$의 범위는 각 변에 $-1$을 곱해 $${-d}\\le -y\\le${-c}$이다.\n$x$의 범위와 변끼리 더하면 $${a}+(${-d})\\le x-y\\le${b}+(${-c})$, 즉 $${a - d}\\le x-y\\le${b - c}$이다.`,
          facts: { mode, a, b, c, d },
        };
      },
    ),
  ),

  ...([0, 1, 2, 3, 4, 5, 6] as const).map((mode) =>
    mkType(
      "중2",
      "2-1",
      "일차부등식",
      String(57 + mode),
      [
        "일차부등식 풀기 계수가 양수",
        "일차부등식의 해 구하기 상수항 이항",
        "괄호가 있는 일차부등식의 해",
        "계수가 음수인 일차부등식의 해",
        "분수 계수인 일차부등식의 해",
        "일차부등식을 만족시키는 자연수의 개수",
        "해가 주어진 일차부등식에서 계수 구하기",
      ][mode]!,
      "일차부등식의 풀이",
      mode === 0 ? "기본" : mode < 4 ? "기본" : mode < 6 ? "응용" : "심화",
      (rng): Body => {
        const a = intBetween(rng, 2, 6);
        const r = intBetween(rng, 1, 9);
        if (mode === 0) {
          const b = intBetween(rng, 1, 9);
          return {
            content: `다음 일차부등식을 푸시오.\n$${a}x+${b}>${a * r + b}$`,
            answer: `$x>${r}$`,
            solution: `$${b}$${eulReul(b)} 이항하면 $${a}x>${a * r}$이다.\n양변을 양수인 $${a}$${euroRo(a)} 나누면 $x>${r}$이다.`,
            facts: { mode, a, b, r },
          };
        }
        if (mode === 1) {
          const b = intBetween(rng, 1, 9);
          return {
            content: `일차부등식 $${a}x-${b}\\le${a * r - b}$의 해를 구하시오.`,
            answer: `$x\\le${r}$`,
            solution: `$-${b}$${eulReul(b)} 이항하면 $${a}x\\le${a * r}$이다.\n양변을 $${a}$${euroRo(a)} 나누면 $x\\le${r}$이다.`,
            facts: { mode, a, b, r },
          };
        }
        if (mode === 2) {
          const b = intBetween(rng, 1, 5);
          return {
            content: `일차부등식 $${a}(x-${b})\\ge${a * (r - b)}$의 해를 구하시오.`,
            answer: `$x\\ge${r}$`,
            solution: `괄호를 풀면 $${a}x-${a * b}\\ge${a * (r - b)}$이다.\n$-${a * b}$${eulReul(a * b)} 이항하면 $${a}x\\ge${a * r}$이고, 양변을 $${a}$${euroRo(a)} 나누면 $x\\ge${r}$이다.`,
            facts: { mode, a, b, r },
          };
        }
        if (mode === 3) {
          const b = intBetween(rng, 1, 9);
          return {
            content: `일차부등식 $-${a}x+${b}\\ge${-a * r + b}$의 해를 구하시오.`,
            answer: `$x\\le${r}$`,
            solution: `$${b}$${eulReul(b)} 이항하면 $-${a}x\\ge${-a * r}$이다.\n양변을 **음수**인 $-${a}$${euroRo(a)} 나누므로 부등호의 방향이 바뀌어 $x\\le${r}$이다.`,
            facts: { mode, a, b, r },
          };
        }
        if (mode === 4) {
          const p = intBetween(rng, 2, 4);
          const q = attempt(40, () => {
            const v = intBetween(rng, 2, 6);
            return v === p ? null : v;
          });
          const lcm = (p * q) / gcdOf(p, q);
          // `p<q` 면 계수가 양수, `p>q` 면 음수라 **부등호가 뒤집힌다.**
          const coef = lcm / p - lcm / q;
          // 🔴 **우변을 계수의 배수로 잡는다.** 안 그러면 해가
          //    `x\le23.333333333333332` 로 나간다(실측 — 씨앗 99991·$p=2$·$q=5$).
          const rr = Math.abs(coef) * intBetween(rng, 1, 4);
          const bound = (lcm * rr) / coef;
          const flip = coef < 0;
          return {
            content: `일차부등식 $\\dfrac{x}{${p}}-\\dfrac{x}{${q}}\\le${rr}$의 해를 구하시오.`,
            answer: `$x${flip ? IN.ge : IN.le}${bound}$`,
            solution: `양변에 두 분모의 최소공배수 $${lcm}$${eulReul(lcm)} 곱하면 $${coefTerm(lcm / p, "x")}-${coefTerm(lcm / q, "x")}\\le${lcm * rr}$, 즉 $${coefTerm(coef, "x")}\\le${lcm * rr}$이다.\n양변을 $${coef}$${euroRo(Math.abs(coef))} 나누면 ${flip ? "부등호의 방향이 바뀌어 " : ""}$x${flip ? IN.ge : IN.le}${bound}$이다.`,
            facts: { mode, p, q, lcm, r: rr, coef },
          };
        }
        if (mode === 5) {
          const b = intBetween(rng, 1, 9);
          const n = intBetween(rng, 2, 7);
          return {
            content: `일차부등식 $${a}x+${b}\\le${a * n + b}$${eulReul(a * n + b)} 만족시키는 자연수 $x$의 개수를 구하시오.`,
            answer: `$${n}$개`,
            solution: `$${b}$${eulReul(b)} 이항하고 양변을 $${a}$${euroRo(a)} 나누면 $x\\le${n}$이다.\n자연수 $x$는 $1$부터 $${n}$까지이므로 그 개수는 $${n}$이다.`,
            facts: { mode, a, b, n, x: n },
          };
        }
        const k = intBetween(rng, 2, 6);
        return {
          content: `일차부등식 $ax>${-a * k}$의 해가 $x<${k}$일 때, 상수 $a$의 값을 구하시오.`,
          answer: `$${-a}$`,
          // 「$x<6$과」 — 소리의 끝이 수(육)라 접속 조사는 `waGwa` 가 정한다.
          solution: `양변을 $a$로 나눌 때 부등호의 방향이 바뀌었으므로 $a<0$이다.\n$x<\\dfrac{${-a * k}}{a}$이고 이것이 $x<${k}$${waGwa(k)} 같으므로 $\\dfrac{${-a * k}}{a}=${k}$에서 $a=${-a}$이다.`,
          facts: { mode, a: -a, k },
        };
      },
    ),
  ),
];

/**
 * 단항식 하나 — 계수·$x$ 지수·$y$ 지수. 계수 $1$ 과 지수 $1$ 은 지면에 안 쓴다
 * (`1x^{1}` 은 값이 맞고 지면만 흉하다).
 */
function mono(c: number, ex: number, ey: number): string {
  const pow = (v: string, e: number): string =>
    e === 0 ? "" : e === 1 ? v : `${v}^{${e}}`;
  const body = `${pow("x", ex)}${pow("y", ey)}`;
  if (body === "") return String(c);
  if (c === 1) return body;
  if (c === -1) return `-${body}`;
  return `${c}${body}`;
}

/**
 * 중2 「단항식의 곱셈과 나눗셈」 보강 다섯 — pool 갈래가 연산1·응용2·심화2 라
 * **기본 넷**이 모자란다(하나는 응용).
 *
 * ⚠️ 「$2x\times3x^2$을 계산하시오」는 지시가 하나뿐이라 밑단으로 내려간다.
 *    그래서 «$A$ 로 놓고» 묻는다 — 치환이라는 한 단계가 실제로 더 있다.
 */
const MONO_SUPPLEMENTS: TypeEntry[] = ([0, 1, 2, 3, 4] as const).map((mode) =>
  mkType(
    "중2",
    "2-1",
    "단항식의 계산",
    String(50 + mode),
    [
      "단항식의 곱을 문자로 놓고 계산하기",
      "단항식의 나눗셈을 문자로 놓고 계산하기",
      "어떤 단항식 구하기 곱셈",
      "단항식의 거듭제곱을 문자로 놓고 계산하기",
      "단항식의 곱셈과 나눗셈에서 문자의 지수",
    ][mode]!,
    "단항식의 곱셈과 나눗셈",
    mode < 4 ? "기본" : "응용",
    (rng): Body => {
      const c = intNonzeroIn(rng, 2, 5);
      const d = intBetween(rng, 2, 5);
      const ex = intBetween(rng, 1, 3);
      const ey = intBetween(rng, 1, 3);
      const ep = intBetween(rng, 1, 2);
      if (mode === 0) {
        return {
          content: `$A=${mono(c, ex, ey)}$일 때, $A\\times${mono(d, ep, 0)}$를 계산하시오.`,
          answer: `$${mono(c * d, ex + ep, ey)}$`,
          solution: `계수는 계수끼리, 문자는 문자끼리 곱한다.\n$${c}\\times${d}=${c * d}$이고 $x^{${ex}}\\times x^{${ep}}=x^{${ex + ep}}$이므로 $${mono(c * d, ex + ep, ey)}$이다.`,
          facts: { mode, c, d, ex, ey, ep },
        };
      }
      if (mode === 1) {
        return {
          content: `$A=${mono(c * d, ex + ep, ey)}$일 때, $A\\div${mono(d, ep, 0)}$를 계산하시오.`,
          answer: `$${mono(c, ex, ey)}$`,
          solution: `계수는 계수끼리 나누고, 같은 문자는 지수끼리 뺀다.\n$${c * d}\\div${d}=${c}$이고 $x^{${ex + ep}}\\div x^{${ep}}=x^{${ex}}$이므로 $${mono(c, ex, ey)}$이다.`,
          facts: { mode, c, d, ex, ey, ep },
        };
      }
      if (mode === 2) {
        return {
          content: `어떤 단항식에 $${mono(d, ep, 0)}$${VAR_EUL} 곱했더니 $${mono(c * d, ex + ep, ey)}$${VAR_IGA} 되었다. 어떤 단항식을 구하시오.`,
          answer: `$${mono(c, ex, ey)}$`,
          solution: `(어떤 단항식)$=${mono(c * d, ex + ep, ey)}\\div${mono(d, ep, 0)}$이다.\n계수끼리 나누고 지수끼리 빼면 $${mono(c, ex, ey)}$이다.`,
          facts: { mode, c, d, ex, ey, ep },
        };
      }
      if (mode === 3) {
        return {
          content: `$A=${mono(c, ex, 0)}$일 때, $A^{2}$${eulReul(2)} 계산하시오.`,
          answer: `$${mono(c * c, 2 * ex, 0)}$`,
          solution: `괄호 안의 각 인수를 제곱한다.\n$(${c})^{2}=${c * c}$이고 $(x^{${ex}})^{2}=x^{${2 * ex}}$이므로 $${mono(c * c, 2 * ex, 0)}$이다.`,
          facts: { mode, c, ex },
        };
      }
      const e2 = intBetween(rng, 1, 2);
      const total = ex + ep - e2;
      // 🔴 `\div` 바로 뒤에 문자가 오면 **`\divx` 라는 없는 명령**이 된다
      //    (`mono(1, e2, 0)` 은 계수 $1$ 을 안 쓰므로 `x` 로 시작한다).
      //    나누는 단항식에 계수를 붙여 그 자리를 없앴다.
      const dv = intBetween(rng, 2, 4);
      return {
        // 식이 문자로 끝나므로 조사는 늘 「를」다(`VAR_EUL`).
        content: `$${mono(c, ex, ey)}\\times${mono(d, ep, 0)}\\div${mono(dv, e2, 0)}$${VAR_EUL} 계산하였을 때, $x$의 지수를 구하시오.`,
        answer: `$${total}$`,
        solution: `곱할 때는 지수를 더하고 나눌 때는 뺀다.\n$x$의 지수는 $${ex}+${ep}-${e2}=${total}$이다.`,
        facts: { mode, ex, ep, e2, dv, x: total },
      };
    },
  ),
);

/** 자료 일곱 개의 사분위수 — 중앙값은 넷째, $Q_1$ 은 둘째, $Q_3$ 은 여섯째. */
function quartilesOfSeven(sorted: readonly number[]): {
  q1: number;
  med: number;
  q3: number;
} {
  return { q1: sorted[1]!, med: sorted[3]!, q3: sorted[5]! };
}

/**
 * 중3 「상자그림」 보강 다섯 — pool 갈래가 응용3·심화2 라 **기본 넷**이 모자란다.
 *
 * 자료는 **일곱 개**로 고정한다 — 홀수라 중앙값이 넷째 값이고 아래·위 절반이
 * 각각 셋이라 $Q_1$·$Q_3$ 이 **정수로 딱 떨어진다**(짝수면 평균이라 소수가 난다).
 */
const BOXPLOT_SUPPLEMENTS: TypeEntry[] = ([0, 1, 2, 3, 4] as const).map(
  (mode) =>
    mkType(
      "중3",
      "3-2",
      "상자그림과 산점도",
      String(50 + mode),
      [
        "자료에서 제1사분위수 구하기",
        "자료에서 제3사분위수 구하기",
        "최솟값과 최댓값으로 범위 구하기",
        "두 사분위수로 사분범위 구하기",
        "자료에서 사분범위 구하기",
      ][mode]!,
      "상자그림",
      mode < 4 ? "기본" : "응용",
      (rng): Body => {
        if (mode === 2) {
          const lo = intBetween(rng, 3, 20);
          const hi = lo + intBetween(rng, 5, 30);
          return {
            content: `어떤 자료의 최솟값이 $${lo}$이고 최댓값이 $${hi}$이다. 이 자료의 범위를 구하시오.`,
            answer: `$${hi - lo}$`,
            solution: `(범위)$=$(최댓값)$-$(최솟값)이므로 $${hi}-${lo}=${hi - lo}$이다.`,
            facts: { mode, lo, hi, x: hi - lo },
          };
        }
        if (mode === 3) {
          const q1 = intBetween(rng, 3, 20);
          const q3 = q1 + intBetween(rng, 4, 25);
          return {
            content: `어떤 자료의 제$1$사분위수가 $${q1}$이고 제$3$사분위수가 $${q3}$이다. 이 자료의 사분범위를 구하시오.`,
            answer: `$${q3 - q1}$`,
            solution: `(사분범위)$=$(제$3$사분위수)$-$(제$1$사분위수)이므로 $${q3}-${q1}=${q3 - q1}$이다.`,
            facts: { mode, q1, q3, x: q3 - q1 },
          };
        }
        // 서로 다른 일곱 값을 뽑아 **섞어서** 낸다 — 정렬을 학생이 직접 해야 한다.
        const sorted: number[] = [];
        let v = intBetween(rng, 2, 9);
        for (let i = 0; i < 7; i += 1) {
          sorted.push(v);
          v += intBetween(rng, 1, 5);
        }
        const shown = shuffleArr(rng, sorted);
        const { q1, q3 } = quartilesOfSeven(sorted);
        const list = shown.map((n) => `$${n}$`).join(", ");
        if (mode === 0) {
          return {
            content: `다음은 어떤 자료를 조사한 것이다. 이 자료의 제$1$사분위수를 구하시오.\n${list}`,
            answer: `$${q1}$`,
            solution: `자료를 작은 값부터 크기순으로 늘어놓으면 $${sorted.join("$, $")}$이다.\n자료가 $7$개이므로 중앙값은 넷째 값이고, 제$1$사분위수는 중앙값보다 작은 세 값의 중앙값인 둘째 값 $${q1}$이다.`,
            facts: { mode, q1, q3 },
          };
        }
        if (mode === 1) {
          return {
            content: `다음은 어떤 자료를 조사한 것이다. 이 자료의 제$3$사분위수를 구하시오.\n${list}`,
            answer: `$${q3}$`,
            solution: `자료를 작은 값부터 크기순으로 늘어놓으면 $${sorted.join("$, $")}$이다.\n제$3$사분위수는 중앙값보다 큰 세 값의 중앙값인 여섯째 값 $${q3}$이다.`,
            facts: { mode, q1, q3 },
          };
        }
        return {
          content: `다음은 어떤 자료를 조사한 것이다. 이 자료의 사분범위를 구하시오.\n${list}`,
          answer: `$${q3 - q1}$`,
          solution: `자료를 작은 값부터 크기순으로 늘어놓으면 $${sorted.join("$, $")}$이다.\n제$1$사분위수는 둘째 값 $${q1}$, 제$3$사분위수는 여섯째 값 $${q3}$이므로 사분범위는 $${q3}-${q1}=${q3 - q1}$이다.`,
          facts: { mode, q1, q3, x: q3 - q1 },
        };
      },
    ),
);

/** 배열 섞기 — 씨앗이 같으면 결과가 같다. */
function shuffleArr<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const t = out[i]!;
    out[i] = out[j]!;
    out[j] = t;
  }
  return out;
}

/** 보조사 — 받침 판정은 `m2Josa.eulReul` 한 곳에서 온다. */
function eunNeunOf(n: number): "은" | "는" {
  return eulReul(n) === "을" ? "은" : "는";
}

/**
 * 한글 **낱말** 뒤의 보조사 — 「이상**은**」·「이하**는**」.
 * 마지막 음절의 종성으로 가른다(한글 음절 = 0xAC00 + (초성·중성·종성) 합성).
 * 수 뒤 조사(`m2Josa`)와는 **가르는 대상이 다르다** — 그쪽은 수의 «읽는 소리»다.
 */
function eunNeunWord(word: string): "은" | "는" {
  const last = word.charCodeAt(word.length - 1) - 0xac00;
  return last >= 0 && last % 28 !== 0 ? "은" : "는";
}

/** 정다면체 다섯 — [이름, 면의 모양, 한 꼭짓점에 모인 면, 면 F, 꼭짓점 V, 모서리 E]. */
const PLATONIC = [
  ["정사면체", "정삼각형", 3, 4, 4, 6],
  ["정육면체", "정사각형", 3, 6, 8, 12],
  ["정팔면체", "정삼각형", 4, 8, 6, 12],
  ["정십이면체", "정오각형", 3, 12, 20, 30],
  ["정이십면체", "정삼각형", 5, 20, 12, 30],
] as const;

/**
 * 중1 「정다면체」 보강 넷 — pool 갈래가 기본2·응용3·심화1 이라 넷이 모자란다.
 * 기본 둘 · 응용 하나 · 심화 하나로 나눠 넣는다.
 *
 * 정다면체의 수치는 **표 하나**에서 온다(`PLATONIC`) — 유형마다 손으로 적으면
 * 한 자리만 고쳐도 나머지가 조용히 어긋난다. 시험은 그 표를 안 쓰고 **오일러
 * 공식**($V-E+F=2$)과 「면의 모양 × 면의 수 $=$ 모서리의 수 $\times2$」로 따로 잰다.
 */
const PLATONIC_SUPPLEMENTS: TypeEntry[] = ([0, 1, 2, 3] as const).map((mode) =>
  mkType(
    "중1",
    "1-2",
    "다면체와 회전체",
    String(50 + mode),
    [
      "정다면체의 꼭짓점과 모서리의 개수의 합",
      "면의 모양과 꼭짓점에 모인 면의 개수로 정다면체 찾기",
      "오일러 공식으로 꼭짓점의 개수 구하기",
      "정다면체의 각 면의 중심을 이어 만든 정다면체",
    ][mode]!,
    "정다면체",
    mode < 2 ? "기본" : mode === 2 ? "응용" : "심화",
    (rng): Body => {
      const i = intBetween(rng, 0, PLATONIC.length - 1);
      const [name, shape, atVertex, F, V, E] = PLATONIC[i]!;
      if (mode === 0) {
        return {
          content: `${name}의 꼭짓점의 개수와 모서리의 개수의 합을 구하시오.`,
          answer: `$${V + E}$`,
          solution: `${name}의 꼭짓점은 $${V}$개, 모서리는 $${E}$개이다.\n따라서 그 합은 $${V}+${E}=${V + E}$이다.`,
          facts: { mode, F, V, E, x: V + E },
        };
      }
      if (mode === 1) {
        return {
          content: `면의 모양이 ${shape}이고 한 꼭짓점에 모인 면의 개수가 $${atVertex}$인 정다면체가 있다. 이 정다면체의 면의 개수를 구하시오.`,
          answer: `$${F}$`,
          solution: `면의 모양이 ${shape}이고 한 꼭짓점에 면이 $${atVertex}$개 모이는 정다면체는 ${name}이다.\n${name}의 면은 $${F}$개이다.`,
          facts: { mode, atVertex, F, V, E, x: F },
        };
      }
      if (mode === 2) {
        return {
          content: `어떤 정다면체의 면의 개수가 $${F}$이고 모서리의 개수가 $${E}$일 때, 꼭짓점의 개수를 구하시오.`,
          answer: `$${V}$`,
          solution: `다면체에서 (꼭짓점의 개수)$-$(모서리의 개수)$+$(면의 개수)$=2$가 성립한다.\n따라서 꼭짓점의 개수는 $2+${E}-${F}=${V}$이다.`,
          facts: { mode, F, E, x: V },
        };
      }
      // 쌍대 — 면의 중심을 이으면 «면의 수»가 새 다면체의 «꼭짓점의 수»가 된다.
      return {
        content: `${name}의 각 면의 한가운데 점을 이웃한 면끼리 이어서 새로운 정다면체를 만들었다. 이 새로운 정다면체의 꼭짓점의 개수를 구하시오.`,
        answer: `$${F}$`,
        solution: `면의 한가운데 점이 새 정다면체의 꼭짓점이 되므로, 새 정다면체의 꼭짓점의 개수는 ${name}의 면의 개수와 같다.\n${name}의 면은 $${F}$개이므로 꼭짓점은 $${F}$개이다.`,
        facts: { mode, F, V, E, x: F },
      };
    },
  ),
);

/** $[lo, hi]$ 에서 부호를 섞어 뽑되 $0$ 과 $\pm1$ 은 안 나온다(지면이 흉해진다). */
function intNonzeroIn(rng: Rng, lo: number, hi: number): number {
  const v = intBetween(rng, lo, hi);
  return intBetween(rng, 0, 1) === 0 ? v : -v;
}

/** 최대공약수 — `m1Shared` 에 없어 여기 하나 둔다. */
function gcdOf(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

/** 조건을 만족할 때까지 다시 뽑는다 — 못 찾으면 던진다. */
function attempt<T>(tries: number, f: () => T | null): T {
  for (let i = 0; i < tries; i += 1) {
    const v = f();
    if (v !== null) return v;
  }
  throw new Error("유형 생성 재시도 초과 — 매개변수 범위를 확인하십시오");
}

/**
 * 이 갈래가 등록하는 보강 유형 전량 — `generate.ts` 가 이 하나만 편다.
 * 위의 세 모듈 몫 + 아래에서 지은 연립방정식 8 · 순환소수 6 · 각 2 · 인수분해 1.
 */
export const MID_SUP_B: TypeEntry[] = [
  ...ANGLE_SUPPLEMENTS,
  ...FACTOR_SUPPLEMENTS,
  ...POLY_SUPPLEMENTS,
  ...SYSTEM_VARIANT_SUPPLEMENTS,
  ...PLATONIC_SUPPLEMENTS,
  ...INEQUALITY_SUPPLEMENTS,
  ...MONO_SUPPLEMENTS,
  ...BOXPLOT_SUPPLEMENTS,
  ...M1_EXPR_SUP_B,
  ...M2_RATIONAL_SUP_B,
  ...M2_GEO_SIM_SUP_B,
  ...M2_PYTHA_SUP_B,
  ...MIDDLE_COMBO_TYPES,
];
