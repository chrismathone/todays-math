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
  ...M1_EXPR_SUP_B,
  ...M2_RATIONAL_SUP_B,
  ...M2_GEO_SIM_SUP_B,
  ...MIDDLE_COMBO_TYPES,
];
