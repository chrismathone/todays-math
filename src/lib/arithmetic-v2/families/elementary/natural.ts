import type {
  ArithmeticCurriculum,
  ArithmeticGrade,
  ArithmeticV2Definition,
  ArithmeticV2Prompt,
} from "../../types";
import {
  define,
  exactIntegers,
  grid,
  inRange,
  integerAnswer,
  remainderAnswer,
  rows,
  sameAnswer,
  triangle,
  triangleAt,
  type Domain,
} from "./common";

function natural(
  id: string,
  grade: ArithmeticGrade,
  title: string,
  operator: "+" | "-" | "×" | "÷",
  domain: Domain,
  description: string,
): ArithmeticV2Definition {
  const operation = { "+": "add", "-": "sub", "×": "mul", "÷": "div" }[
    operator
  ];
  return define({
    id: `elem-${id}`,
    grade,
    strand: "자연수",
    title,
    description,
    labels: ["직접 연산", operator === "÷" ? "몫과 나머지" : "세로셈"],
    rankGroup: `elementary-natural-${operation}`,
    domain,
    prompt: ([a, b]): ArithmeticV2Prompt =>
      operator === "÷"
        ? {
            layout: "math",
            text: `${a} ÷ ${b}`,
            latex: `${a} \\div ${b}`,
            instruction: "몫과 나머지를 구하세요.",
          }
        : { layout: "vertical", operator, left: a, right: b },
    calculate: ([a, b]) =>
      operator === "÷"
        ? remainderAnswer(Math.floor(a / b), a % b)
        : integerAnswer(
            operator === "+" ? a + b : operator === "-" ? a - b : a * b,
          ),
    check: ([a, b], answer) => {
      const exact = exactIntegers(answer, operator === "÷" ? 2 : 1);
      if (!exact) return false;
      if (operator === "÷") {
        const [q, r] = exact;
        return (
          r < b &&
          BigInt(b) * BigInt(q) + BigInt(r) === BigInt(a) &&
          sameAnswer(answer, remainderAnswer(q, r))
        );
      }
      const [n] = exact;
      const valid =
        operator === "+"
          ? BigInt(n) - BigInt(a) === BigInt(b)
          : operator === "-"
            ? BigInt(n) + BigInt(b) === BigInt(a)
            : BigInt(n) === BigInt(a) * BigInt(b);
      return valid && sameAnswer(answer, integerAnswer(n));
    },
  });
}

const mixedGrid = grid([
  [1, 100],
  [1, 12],
  [1, 12],
]);
const divisionGrid = grid([
  [1, 9],
  [2, 9],
  [1, 100],
]);
const subtractionSize = ((99 * 100) / 2) * 9;
const mixedDomain: Domain = {
  size: 2 * mixedGrid.size + divisionGrid.size + subtractionSize,
  at(index) {
    if (index < 2 * mixedGrid.size)
      return [
        Math.floor(index / mixedGrid.size),
        ...mixedGrid.at(index % mixedGrid.size),
      ];
    index -= 2 * mixedGrid.size;
    if (index < divisionGrid.size) {
      const [q, b, c] = divisionGrid.at(index);
      return [2, q * b, b, c];
    }
    index -= divisionGrid.size;
    const [a, b] = triangleAt(Math.floor(index / 9), 99);
    return [3, a + 2, b + 1, (index % 9) + 1];
  },
  has(p) {
    if (p.length !== 4) return false;
    const [mode, a, b, c] = p;
    if (mode === 0 || mode === 1) return mixedGrid.has([a, b, c]);
    if (mode === 2)
      return (
        inRange(b, 2, 9) &&
        a % b === 0 &&
        inRange(a / b, 1, 9) &&
        inRange(c, 1, 100)
      );
    return (
      mode === 3 &&
      inRange(a, 2, 100) &&
      inRange(b, 1, a - 1) &&
      inRange(c, 1, 9)
    );
  },
};

const mixed = define({
  id: "elem-g5-natural-mixed",
  grade: "초5",
  strand: "자연수",
  title: "자연수의 짧은 혼합 계산",
  description:
    "두 연산의 우선순위와 한 단계 소괄호. a+b×c, (a+b)×c, a÷b+c, (a−b)×c. 나눗셈은 나누어떨어지고 중간값은 음수가 아닙니다.",
  labels: ["직접 연산", "연산 순서", "소괄호"],
  rankGroup: "elementary-natural-mixed",
  domain: mixedDomain,
  prompt: ([mode, a, b, c]) => {
    const text = [
      `${a} + ${b} × ${c}`,
      `(${a} + ${b}) × ${c}`,
      `${a} ÷ ${b} + ${c}`,
      `(${a} - ${b}) × ${c}`,
    ][mode];
    return {
      layout: "math",
      text,
      latex: text.replaceAll("×", "\\times").replaceAll("÷", "\\div"),
    };
  },
  calculate: ([mode, a, b, c]) =>
    integerAnswer(
      mode === 0
        ? a + b * c
        : mode === 1
          ? (a + b) * c
          : mode === 2
            ? a / b + c
            : (a - b) * c,
    ),
  check: ([mode, a, b, c], answer) => {
    const exact = exactIntegers(answer, 1);
    if (!exact || !sameAnswer(answer, integerAnswer(exact[0]))) return false;
    const [n, x, y, z] = [exact[0], a, b, c].map(BigInt);
    // Reverse relations / distribution, not the generator's expression evaluator.
    return mode === 0
      ? n - x === y * z
      : mode === 1
        ? n === x * z + y * z
        : mode === 2
          ? (n - z) * y === x
          : n + y * z === x * z;
  },
});

/* ── 초3·초4 자연수 보강 (2026-10-16, Track B) ─────────────────────────────
 * Horizontal (몇십)·(몇백) drills and exact division. Parameters are always the
 * two displayed operands [a, b]; the shared elementary suite reads them back
 * from the prompt text. Trivial items are screened at the domain: no operand is
 * 0 or 1, a dividend never equals its divisor, and an exact quotient is at
 * least 2. 10 and 100 stay in — that is what 몇십·몇백 means.
 */

/** One operand axis: a contiguous range scaled by a factor (10 → 몇십, 100 → 몇백). */
type Axis = {
  size: number;
  at(index: number): number;
  has(v: number): boolean;
};

const scaledRange = (min: number, max: number, factor = 1): Axis => ({
  size: max - min + 1,
  at: (i) => (min + i) * factor,
  has: (v) =>
    Number.isSafeInteger(v) &&
    v % factor === 0 &&
    inRange(v / factor, min, max),
});

/** Numbers between consecutive multiples of `step`, for `blocks` blocks after the first:
 * step=10, blocks=9 → 11~99 without 20, 30, …, 90 (몇십몇). */
const betweenMultiples = (step: number, blocks: number): Axis => ({
  size: blocks * (step - 1),
  at(i) {
    const block = Math.floor(i / (step - 1));
    return step * (block + 1) + 1 + (i - (step - 1) * block);
  },
  has: (v) => inRange(v, step + 1, step * (blocks + 1) - 1) && v % step !== 0,
});

const pairs = (left: Axis, right: Axis): Domain => ({
  size: left.size * right.size,
  at: (i) => [left.at(Math.floor(i / right.size)), right.at(i % right.size)],
  has: (p) => p.length === 2 && left.has(p[0]) && right.has(p[1]),
});

const tens = (min: number, max: number) => scaledRange(min, max, 10);
const hundreds = (min: number, max: number) => scaledRange(min, max, 100);

/** [q×b, b] for 곱셈구구 2~9단 with quotient 2~9 (no ÷1, no a÷a). */
const timesTableQuotients: Domain = (() => {
  const base = grid([
    [2, 9],
    [2, 9],
  ]);
  return {
    size: base.size,
    at(i) {
      const [b, q] = base.at(i);
      return [q * b, b];
    },
    has: ([a, b, ...rest]) =>
      rest.length === 0 &&
      inRange(b, 2, 9) &&
      inRange(a, 4, 81) &&
      a % b === 0 &&
      inRange(a / b, 2, 9),
  };
})();

/** Exact two-digit ÷ one-digit with a two-digit quotient: (몇십)÷(몇) and (두 자리)÷(한 자리). */
const exactTwoDigitQuotients: Domain = (() => {
  const divisors = [2, 3, 4, 5, 6, 7, 8, 9];
  const table = rows(divisors, (b) => Math.floor(99 / b) - 9);
  return {
    size: table.size,
    at(i) {
      const [b, k] = table.locate(i);
      return [b * (10 + k), b];
    },
    has: ([a, b, ...rest]) =>
      rest.length === 0 &&
      inRange(b, 2, 9) &&
      inRange(a, 10, 99) &&
      a % b === 0 &&
      a / b >= 10,
  };
})();

/** [a, 10t] for t 2~9 and b < a ≤ 999 — ÷10 only reads off digits, so it stays out. */
const dividedByTens: Domain = (() => {
  const divisors = [20, 30, 40, 50, 60, 70, 80, 90];
  const table = rows(divisors, (b) => 999 - b);
  return {
    size: table.size,
    at(i) {
      const [b, k] = table.locate(i);
      return [b + 1 + k, b];
    },
    has: ([a, b, ...rest]) =>
      rest.length === 0 &&
      Number.isSafeInteger(b) &&
      b % 10 === 0 &&
      inRange(b / 10, 2, 9) &&
      inRange(a, b + 1, 999),
  };
})();

function horizontal(
  id: string,
  grade: ArithmeticGrade,
  title: string,
  curriculum: ArithmeticCurriculum,
  operator: "×" | "÷",
  kind: "integer" | "remainder",
  domain: Domain,
  description: string,
): ArithmeticV2Definition {
  const remainder = kind === "remainder";
  return define({
    id: `elem-${id}`,
    grade,
    strand: "자연수",
    title,
    description,
    labels: ["직접 연산", remainder ? "몫과 나머지" : "가로셈"],
    rankGroup: `elementary-natural-${operator === "×" ? "mul" : "div"}`,
    curriculum,
    domain,
    prompt: ([a, b]): ArithmeticV2Prompt => ({
      layout: "math",
      text: `${a} ${operator} ${b}`,
      latex: `${a} ${operator === "×" ? "\\times" : "\\div"} ${b}`,
      ...(remainder ? { instruction: "몫과 나머지를 구하세요." } : {}),
    }),
    calculate: ([a, b]) =>
      remainder
        ? remainderAnswer(Math.floor(a / b), a % b)
        : integerAnswer(operator === "×" ? a * b : a / b),
    check: ([a, b], answer) => {
      const exact = exactIntegers(answer, remainder ? 2 : 1);
      if (!exact) return false;
      if (remainder) {
        const [q, r] = exact;
        return (
          r < b &&
          BigInt(b) * BigInt(q) + BigInt(r) === BigInt(a) &&
          sameAnswer(answer, remainderAnswer(q, r))
        );
      }
      const [n] = exact;
      const valid =
        operator === "×"
          ? BigInt(n) === BigInt(a) * BigInt(b)
          : BigInt(n) * BigInt(b) === BigInt(a);
      return valid && sameAnswer(answer, integerAnswer(n));
    },
  });
}

export const NATURAL_DEFINITIONS: readonly ArithmeticV2Definition[] = [
  natural(
    "g3-add-3digit",
    "초3",
    "세 자리 수의 덧셈",
    "+",
    grid([
      [100, 999],
      [100, 999],
    ]),
    "100~999의 두 수. 네 자리 합을 포함합니다.",
  ),
  natural(
    "g3-sub-3digit",
    "초3",
    "세 자리 수의 뺄셈",
    "-",
    triangle(100, 999),
    "100~999의 두 수. 결과는 0 이상이며 연속 받아내림을 포함합니다.",
  ),
  natural(
    "g3-mul-3x1",
    "초3",
    "세 자리 수 × 한 자리 수",
    "×",
    grid([
      [100, 999],
      [1, 9],
    ]),
    "100~999 × 1~9.",
  ),
  natural(
    "g3-mul-2x2",
    "초3",
    "두 자리 수 × 두 자리 수",
    "×",
    grid([
      [10, 99],
      [10, 99],
    ]),
    "10~99 × 10~99.",
  ),
  natural(
    "g3-div-2x1-remainder",
    "초3",
    "두 자리 수 ÷ 한 자리 수",
    "÷",
    grid([
      [10, 99],
      [1, 9],
    ]),
    "10~99 ÷ 1~9. 나머지가 0인 경우와 0이 아닌 경우를 포함합니다.",
  ),
  natural(
    "g3-div-3x1-remainder",
    "초3",
    "세 자리 수 ÷ 한 자리 수",
    "÷",
    grid([
      [100, 999],
      [1, 9],
    ]),
    "100~999 ÷ 1~9. 몫에 0이 들어가는 경우를 포함합니다.",
  ),
  natural(
    "g4-mul-3x2",
    "초4",
    "세 자리 수 × 두 자리 수",
    "×",
    grid([
      [100, 999],
      [10, 99],
    ]),
    "100~999 × 10~99.",
  ),
  natural(
    "g4-div-2x2-remainder",
    "초4",
    "두 자리 수 ÷ 두 자리 수",
    "÷",
    triangle(10, 99),
    "10~99의 두 수. 나누어지는 수는 나누는 수 이상입니다.",
  ),
  natural(
    "g4-div-3x2-remainder",
    "초4",
    "세 자리 수 ÷ 두 자리 수",
    "÷",
    grid([
      [100, 999],
      [10, 99],
    ]),
    "100~999 ÷ 10~99. 몫과 나머지를 구합니다.",
  ),
  mixed,
  // 2026-10-16 Track B. Append only; IDs and domains above are frozen.
  horizontal(
    "g3-div-times-table",
    "초3",
    "곱셈구구 범위의 나눗셈",
    { semester: 1, unit: "나눗셈" },
    "÷",
    "integer",
    timesTableQuotients,
    "곱셈구구 2~9단으로 나누어떨어지는 나눗셈. 몫은 2~9이며 ÷1과 같은 수끼리의 나눗셈은 뺍니다.",
  ),
  horizontal(
    "g3-mul-tens-by-one",
    "초3",
    "(몇십) × (몇)",
    { semester: 1, unit: "곱셈" },
    "×",
    "integer",
    pairs(tens(1, 9), scaledRange(2, 9)),
    "10, 20, …, 90 × 2~9.",
  ),
  horizontal(
    "g3-mul-tens-by-tens",
    "초3",
    "(몇십) × (몇십)",
    { semester: 2, unit: "곱셈" },
    "×",
    "integer",
    pairs(tens(1, 9), tens(1, 9)),
    "10, 20, …, 90 × 10, 20, …, 90.",
  ),
  horizontal(
    "g3-mul-2digit-by-tens",
    "초3",
    "(몇십몇) × (몇십)",
    { semester: 2, unit: "곱셈" },
    "×",
    "integer",
    pairs(betweenMultiples(10, 9), tens(1, 9)),
    "11~99 가운데 몇십이 아닌 수 × 10, 20, …, 90.",
  ),
  horizontal(
    "g3-div-2x1-exact",
    "초3",
    "나누어떨어지는 (두 자리 수) ÷ (한 자리 수)",
    { semester: 2, unit: "나눗셈" },
    "÷",
    "integer",
    exactTwoDigitQuotients,
    "10~99 ÷ 2~9 가운데 나누어떨어지고 몫이 두 자리인 것. (몇십)÷(몇)을 포함하며 곱셈구구 범위는 뺍니다.",
  ),
  horizontal(
    "g4-mul-hundreds-by-tens",
    "초4",
    "(몇백) × (몇십)",
    { semester: 1, unit: "곱셈과 나눗셈" },
    "×",
    "integer",
    pairs(hundreds(1, 9), tens(1, 9)),
    "100, 200, …, 900 × 10, 20, …, 90.",
  ),
  horizontal(
    "g4-mul-3digit-by-tens",
    "초4",
    "(세 자리 수) × (몇십)",
    { semester: 1, unit: "곱셈과 나눗셈" },
    "×",
    "integer",
    pairs(betweenMultiples(100, 9), tens(1, 9)),
    "101~999 가운데 몇백이 아닌 수 × 10, 20, …, 90.",
  ),
  horizontal(
    "g4-div-by-tens-remainder",
    "초4",
    "몇십으로 나누는 나눗셈",
    { semester: 1, unit: "곱셈과 나눗셈" },
    "÷",
    "remainder",
    dividedByTens,
    "20, 30, …, 90으로 나누는 두 자리·세 자리 수(나누는 수보다 큰 수 ~999). 나머지가 0인 경우와 0이 아닌 경우를 포함합니다. ÷10은 뺍니다.",
  ),
];
