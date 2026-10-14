import type {
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
];
