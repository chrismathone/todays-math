import type {
  ArithmeticGrade,
  ArithmeticV2Definition,
  ArithmeticV2Prompt,
} from "../../types";
import {
  checkDecimal,
  checkRational,
  decimalAnswer,
  define,
  exactIntegers,
  fractionDisplay,
  gcd,
  grid,
  inRange,
  integerAnswer,
  rationalAnswer,
  remainderAnswer,
  rows,
  sameAnswer,
  type Domain,
} from "./common";

// Append-only families: no original domain, index, or displayed task changes.
// Commutative additions/products use one operand orientation. Zero belongs to
// the explicitly described domains; it is never a divisor or a fake decimal.
const range = (min: number, max: number) =>
  Array.from({ length: max - min + 1 }, (_, i) => min + i);

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
      const [n, r] = exact;
      if (operator === "÷")
        return (
          r < b &&
          BigInt(b) * BigInt(n) + BigInt(r) === BigInt(a) &&
          sameAnswer(answer, remainderAnswer(n, r))
        );
      const valid =
        operator === "+"
          ? BigInt(n) - BigInt(a) === BigInt(b)
          : operator === "-"
            ? BigInt(n) + BigInt(b) === BigInt(a)
            : n === 0; // This family has one zero factor, including 0 × 0.
      return valid && sameAnswer(answer, integerAnswer(n));
    },
  });
}

const shortTwoDigit = grid([
  [10, 99],
  [0, 9],
]);
const shortThreeDigit = grid([
  [100, 999],
  [0, 99],
]);
const nonwhole = (n: number, max: number) =>
  inRange(n, 1, max) && n % 100 !== 0;
const coefficientAt = (index: number) => index + 1 + Math.floor(index / 99);

// Decimal parameters are hundredth coefficients except the natural operand.
const decimalTimesNatural: Domain = {
  size: 990 * 9,
  at: (i) => [coefficientAt(Math.floor(i / 9)), (i % 9) + 1],
  has: (p) => p.length === 2 && nonwhole(p[0], 999) && inRange(p[1], 1, 9),
};
const subtractionRows = rows(range(1, 99), (a) => 99 * a);
const naturalMinusDecimal: Domain = {
  size: subtractionRows.size,
  at(i) {
    const [a, offset] = subtractionRows.locate(i);
    return [a, coefficientAt(offset)];
  },
  has: (p) =>
    p.length === 2 && inRange(p[0], 1, 99) && nonwhole(p[1], 100 * p[0] - 1),
};
// a / (b/100) has at most three decimal places iff b divides 100000a.
// Store only one count per divisor, then unrank its natural-number multiples.
const divisionRows = rows(
  range(1, 999)
    .filter((b) => b % 100 !== 0)
    .map((b) => ({
      b,
      step: b / gcd(b, 100000),
    })),
  ({ step }) => Math.floor(99 / step),
);
const naturalDividedByDecimal: Domain = {
  size: divisionRows.size,
  at(i) {
    const [{ b, step }, offset] = divisionRows.locate(i);
    return [(offset + 1) * step, b];
  },
  has: (p) =>
    p.length === 2 &&
    inRange(p[0], 1, 99) &&
    nonwhole(p[1], 999) &&
    (100000 * p[0]) % p[1] === 0,
};

const naturalPlusDecimal: Domain = {
  size: 99 * 9900,
  at: (i) => [Math.floor(i / 9900) + 1, coefficientAt(i % 9900)],
  has: (p) => p.length === 2 && inRange(p[0], 1, 99) && nonwhole(p[1], 9999),
};
const reverseSubtractionRows = rows(range(1, 99), (b) => 99 * (100 - b));
const decimalMinusNatural: Domain = {
  size: reverseSubtractionRows.size,
  at(i) {
    const [b, offset] = reverseSubtractionRows.locate(i);
    return [100 * b + coefficientAt(offset), b];
  },
  has: (p) =>
    p.length === 2 &&
    nonwhole(p[0], 9999) &&
    inRange(p[1], 1, 99) &&
    p[0] > 100 * p[1],
};

function decimal(
  mode: "mul" | "sub" | "div" | "add" | "reverse-sub",
): ArithmeticV2Definition {
  const multiply = mode === "mul";
  const subtract = mode === "sub" || mode === "reverse-sub";
  const reverse = mode === "reverse-sub";
  const add = mode === "add";
  const decimalLeft = multiply || reverse;
  const operator = multiply ? "×" : subtract ? "-" : add ? "+" : "÷";
  return define({
    id: `elem-g${multiply ? 5 : subtract || add ? 4 : 6}-${multiply ? "decimal-mul-natural" : reverse ? "decimal-sub-natural" : `natural-${mode}-decimal`}`,
    grade: multiply ? "초5" : subtract || add ? "초4" : "초6",
    strand: "소수",
    title: multiply
      ? "소수 × 자연수"
      : reverse
        ? "소수 - 자연수"
        : add
          ? "자연수 + 소수"
          : subtract
            ? "자연수 - 소수"
            : "자연수 ÷ 소수",
    description: multiply
      ? "0.01~9.99 중 정수가 아닌 소수 × 자연수 1~9. 소수 둘째 자리까지의 정확한 곱."
      : reverse
        ? "1.01~99.99 중 정수가 아닌 소수에서 그보다 작은 자연수 1~99를 뺍니다. 소수 둘째 자리까지의 정확한 차."
        : add
          ? "자연수 1~99 + 0.01~99.99 중 정수가 아닌 소수. 소수 둘째 자리까지의 정확한 합."
          : subtract
            ? "자연수 1~99에서 그보다 작은 양의 소수를 뺍니다. 소수 둘째 자리까지, 정수가 아닌 소수만 포함합니다."
            : "자연수 1~99 ÷ 0.01~9.99 중 정수가 아닌 소수. 정확한 몫이 소수 셋째 자리 이내인 경우만 포함합니다.",
    labels: ["직접 연산", "정확한 유한소수", "반올림 없음"],
    rankGroup: `elementary-decimal-${reverse ? "sub" : mode}`,
    domain: multiply
      ? decimalTimesNatural
      : reverse
        ? decimalMinusNatural
        : add
          ? naturalPlusDecimal
          : subtract
            ? naturalMinusDecimal
            : naturalDividedByDecimal,
    prompt: ([a, b]) => {
      const left = decimalLeft ? decimalAnswer(a, 2).text : String(a);
      const right = decimalLeft ? String(b) : decimalAnswer(b, 2).text;
      return {
        layout: "math",
        text: `${left} ${operator} ${right}`,
        latex: `${left} ${multiply ? "\\times" : subtract ? "-" : add ? "+" : "\\div"} ${right}`,
      };
    },
    calculate: ([a, b]) => {
      if (multiply) return decimalAnswer(a * b, 2);
      if (reverse) return decimalAnswer(a - 100 * b, 2);
      if (add) return decimalAnswer(100 * a + b, 2);
      if (subtract) return decimalAnswer(100 * a - b, 2);
      for (let scale = 0; scale <= 3; scale++) {
        const numerator = a * 100 * 10 ** scale;
        if (numerator % b === 0) return decimalAnswer(numerator / b, scale);
      }
      throw new RangeError("Decimal quotient outside exact domain");
    },
    check: ([a, b], answer) => {
      const x = BigInt(a),
        y = BigInt(b);
      if (multiply) return checkDecimal(answer, x * y, BigInt(100));
      if (reverse)
        return checkDecimal(answer, x - y * BigInt(100), BigInt(100));
      if (add) return checkDecimal(answer, x * BigInt(100) + y, BigInt(100));
      if (subtract)
        return checkDecimal(answer, x * BigInt(100) - y, BigInt(100));
      return checkDecimal(answer, x * BigInt(100), y);
    },
  });
}

type Fraction = readonly [number, number];
const proper: Fraction[] = [];
for (let d = 2; d <= 12; d++)
  for (let n = 1; n < d; n++) if (gcd(n, d) === 1) proper.push([n, d]);
const mixed: Fraction[] = range(1, 3).flatMap((whole) =>
  proper.map(([n, d]): Fraction => [whole * d + n, d]),
);
const naturals = range(1, 9).map((n): Fraction => [n, 1]);

// Only reduced inputs; mixed+proper is oriented with the mixed number first.
// Unequal operand kinds make these disjoint from the original fraction pairs.
type FractionMode = "div" | "sub" | "add" | "natural-add" | "mixed-sub";
function fractionDomain(mode: FractionMode): Domain {
  const mixedLeft = mode === "add" || mode === "mixed-sub";
  const left = mixedLeft ? mixed : naturals;
  const right = mixedLeft ? proper : [...proper, ...mixed];
  const allowed = ([n, d]: Fraction, [m, e]: Fraction) =>
    (mode !== "sub" && mode !== "mixed-sub") || n * e > m * d;
  const table = rows(left, (a) => right.filter((b) => allowed(a, b)).length);
  const leftKeys = new Set(left.map((p) => p.join(",")));
  const rightKeys = new Set(right.map((p) => p.join(",")));
  return {
    size: table.size,
    at(i) {
      const [a, offset] = table.locate(i);
      let remaining = offset;
      for (const b of right)
        if (allowed(a, b) && remaining-- === 0) return [...a, ...b];
      throw new RangeError("Fraction row exhausted");
    },
    has: (p) =>
      p.length === 4 &&
      leftKeys.has(p.slice(0, 2).join(",")) &&
      rightKeys.has(p.slice(2).join(",")) &&
      allowed([p[0], p[1]], [p[2], p[3]]),
  };
}

function fraction(mode: FractionMode): ArithmeticV2Definition {
  const subtract = mode === "sub" || mode === "mixed-sub";
  const mixedLeft = mode === "add" || mode === "mixed-sub";
  const operation = mode === "div" ? "div" : subtract ? "sub" : "add";
  const operator = mode === "div" ? "÷" : subtract ? "-" : "+";
  return define({
    id: `elem-g${mode === "div" ? 6 : 5}-${mixedLeft ? `mixed-${operation}-proper` : `natural-${operation}-fraction`}`,
    grade: mode === "div" ? "초6" : "초5",
    strand: "분수",
    title: mixedLeft ? `대분수 ${operator} 진분수` : `자연수 ${operator} 분수`,
    description: mixedLeft
      ? `정수 부분 1~3의 대분수 ${operator} 진분수. 분모 2~12의 기약분수, 같은 분모와 다른 분모를 모두 포함합니다.${subtract ? " 받아내림을 포함합니다." : ""}`
      : `자연수 1~9 ${operator} 분모 2~12, 정수 부분 0~3의 양의 기약분수.${mode === "sub" ? " 자연수보다 작은 분수만 포함합니다." : ""} 정답은 약분하고 대분수로 표시합니다.`,
    labels: ["직접 연산", "분모 2~12", "기약분수·대분수 정답"],
    rankGroup: `elementary-fraction-${operation}`,
    domain: fractionDomain(mode),
    prompt: ([n, d, m, e]) => {
      const a = fractionDisplay(n, d),
        b = fractionDisplay(m, e);
      return {
        layout: "math",
        text: `${a.text} ${operator} ${b.text}`,
        latex: `${a.latex} ${mode === "div" ? "\\div" : operator} ${b.latex}`,
        instruction: "계산하고 약분하세요. 가분수는 대분수로 나타내세요.",
      };
    },
    calculate: ([n, d, m, e]) =>
      mode === "div"
        ? rationalAnswer(n * e, d * m)
        : rationalAnswer(n * e + (subtract ? -m * d : m * d), d * e),
    check: (p, answer) => {
      const [n, d, m, e] = p.map(BigInt);
      if (mode === "div") return checkRational(answer, n * e, d * m);
      return checkRational(
        answer,
        subtract ? n * e - m * d : n * e + m * d,
        d * e,
      );
    },
  });
}

const fractionQuotientRows = rows(range(2, 12), (b) => 99 - Math.floor(99 / b));
const fractionQuotient = define({
  id: "elem-g6-natural-div-fraction-quotient",
  grade: "초6",
  strand: "분수",
  title: "자연수 나눗셈의 몫을 분수로 나타내기",
  description:
    "1~99 ÷ 2~12 중 나누어떨어지지 않는 경우. 나머지 대신 정확한 몫을 기약분수나 대분수로 나타냅니다.",
  labels: ["직접 연산", "분수인 몫", "기약분수·대분수 정답"],
  rankGroup: "elementary-fraction-div",
  domain: {
    size: fractionQuotientRows.size,
    at(i) {
      const [b, offset] = fractionQuotientRows.locate(i);
      return [offset + 1 + Math.floor(offset / (b - 1)), b];
    },
    has: (p) =>
      p.length === 2 &&
      inRange(p[0], 1, 99) &&
      inRange(p[1], 2, 12) &&
      p[0] % p[1] !== 0,
  },
  prompt: ([a, b]) => ({
    layout: "math",
    text: `${a} ÷ ${b}`,
    latex: `${a} \\div ${b}`,
    instruction: "몫을 기약분수로 나타내세요. 가분수는 대분수로 나타내세요.",
  }),
  calculate: ([a, b]) => rationalAnswer(a, b),
  check: ([a, b], answer) => checkRational(answer, BigInt(a), BigInt(b)),
});

const productRows = rows(
  range(1, 12).flatMap((b) => range(b, 12).map((c) => ({ b, c }))),
  ({ b, c }) => Math.max(0, 101 - b * c),
);
const differenceRows = rows(range(1, 100), (a) => a * 20);
const quotientGrid = grid([
  [1, 12],
  [2, 9],
  [2, 12],
]);
// For (a+b)/c, enumerate the sum cq and choose ceil(cq/2) <= a <= min(100,cq-1).
// Thus 1 <= b <= a <= 100; swapping the summands does not add a task.
const sumRows = rows(
  range(2, 12).flatMap((c) =>
    range(1, Math.floor(200 / c)).map((q) => ({ c, sum: c * q })),
  ),
  ({ sum }) => Math.min(100, sum - 1) - Math.ceil(sum / 2) + 1,
);
const mixedBlocks: Domain[] = [
  {
    size: productRows.size,
    at(i) {
      const [{ b, c }, offset] = productRows.locate(i);
      return [b * c + offset, b, c];
    },
    has: (p) =>
      p.length === 3 &&
      inRange(p[0], 1, 100) &&
      inRange(p[1], 1, 12) &&
      inRange(p[2], p[1], 12) &&
      p[0] >= p[1] * p[2],
  },
  {
    size: quotientGrid.size,
    at(i) {
      const [q, b, c] = quotientGrid.at(i);
      return [q * b, b, c];
    },
    has: (p) =>
      p.length === 3 &&
      inRange(p[1], 2, 9) &&
      inRange(p[0] / p[1], 1, 12) &&
      inRange(p[2], 2, 12),
  },
  {
    size: differenceRows.size,
    at(i) {
      const [a, offset] = differenceRows.locate(i);
      return [a, Math.floor(offset / 20) + 1, (offset % 20) + 1];
    },
    has: (p) =>
      p.length === 3 &&
      inRange(p[0], 1, 100) &&
      inRange(p[1], 1, p[0]) &&
      inRange(p[2], 1, 20),
  },
  {
    size: sumRows.size,
    at(i) {
      const [{ c, sum }, offset] = sumRows.locate(i);
      const a = Math.ceil(sum / 2) + offset;
      return [a, sum - a, c];
    },
    has: (p) =>
      p.length === 3 &&
      inRange(p[0], 1, 100) &&
      inRange(p[1], 1, p[0]) &&
      inRange(p[2], 2, 12) &&
      (p[0] + p[1]) % p[2] === 0,
  },
];
const mixedRows = rows(
  mixedBlocks.map((domain, mode) => ({ domain, mode })),
  ({ domain }) => domain.size,
);
const mixedDomain: Domain = {
  size: mixedRows.size,
  at(i) {
    const [{ domain, mode }, offset] = mixedRows.locate(i);
    return [mode, ...domain.at(offset)];
  },
  has: (p) =>
    p.length === 4 && inRange(p[0], 0, 3) && mixedBlocks[p[0]].has(p.slice(1)),
};
const mixedSupplement = define({
  id: "elem-g5-natural-mixed-order",
  grade: "초5",
  strand: "자연수",
  title: "자연수 혼합 계산: 뺄셈·나눗셈의 순서",
  description:
    "a−b×c, a÷b×c, a−b+c, (a+b)÷c. 곱셈·나눗셈 우선과 같은 순위의 왼쪽부터 계산을 연습합니다. 나눗셈은 나누어떨어지고 중간값은 0 이상입니다.",
  labels: ["직접 연산", "연산 순서", "소괄호"],
  rankGroup: "elementary-natural-mixed",
  domain: mixedDomain,
  prompt: ([mode, a, b, c]) => {
    const text = [
      `${a} - ${b} × ${c}`,
      `${a} ÷ ${b} × ${c}`,
      `${a} - ${b} + ${c}`,
      `(${a} + ${b}) ÷ ${c}`,
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
        ? a - b * c
        : mode === 1
          ? (a / b) * c
          : mode === 2
            ? a - b + c
            : (a + b) / c,
    ),
  check: ([mode, a, b, c], answer) => {
    const exact = exactIntegers(answer, 1);
    if (!exact) return false;
    const [n] = exact.map(BigInt),
      x = BigInt(a),
      y = BigInt(b),
      z = BigInt(c);
    // Inverse equations, separate from the generator and its Number operations.
    const valid =
      mode === 0
        ? n + y * z === x
        : mode === 1
          ? n * y === x * z
          : mode === 2
            ? n + y === x + z
            : n * z === x + y;
    return valid && sameAnswer(answer, integerAnswer(exact[0]));
  },
});

export const ELEMENTARY_SUPPLEMENT_DEFINITIONS: readonly ArithmeticV2Definition[] =
  [
    natural(
      "g2-add-2x1",
      "초2",
      "두 자리 수 + 한 자리 수",
      "+",
      shortTwoDigit,
      "10~99 + 0~9. 받아올림과 0을 더하는 경우를 포함합니다.",
    ),
    natural(
      "g2-sub-2x1",
      "초2",
      "두 자리 수 - 한 자리 수",
      "-",
      shortTwoDigit,
      "10~99 - 0~9. 13−7과 같은 받아내림을 포함합니다.",
    ),
    natural(
      "g3-add-3x-short",
      "초3",
      "세 자리 수 + 한두 자리 수",
      "+",
      shortThreeDigit,
      "100~999 + 0~99. 서로 다른 자릿수의 자리 맞추기와 받아올림을 연습합니다.",
    ),
    natural(
      "g3-sub-3x-short",
      "초3",
      "세 자리 수 - 한두 자리 수",
      "-",
      shortThreeDigit,
      "100~999 - 0~99. 305−27과 같은 연속 받아내림을 포함합니다.",
    ),
    natural(
      "g2-mul-zero",
      "초2",
      "0을 곱하는 계산",
      "×",
      grid([
        [0, 99],
        [0, 0],
      ]),
      "0~99 × 0. 0×0을 포함하며 순서를 바꾼 같은 곱셈은 중복하지 않습니다.",
    ),
    natural(
      "g3-div-small-remainder",
      "초3",
      "한 자리 수와 0의 나눗셈",
      "÷",
      grid([
        [0, 9],
        [1, 9],
      ]),
      "0~9 ÷ 1~9. 나누어떨어지는 경우, 나머지와 몫이 0인 경우를 포함합니다. 0으로 나누지 않습니다.",
    ),
    decimal("mul"),
    decimal("sub"),
    decimal("div"),
    decimal("add"),
    decimal("reverse-sub"),
    fraction("div"),
    fraction("sub"),
    fraction("add"),
    fraction("natural-add"),
    fraction("mixed-sub"),
    fractionQuotient,
    mixedSupplement,
  ];
