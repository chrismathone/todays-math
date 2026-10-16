import type { ArithmeticGrade, ArithmeticV2Definition } from "../../types";
import {
  checkDecimal,
  decimalAnswer,
  define,
  gcd,
  inRange,
  rows,
  triangleAt,
  type Domain,
} from "./common";

// Every operand has a nonzero fractional part; integers are not disguised as
// decimal practice. The unique displayed representative drops trailing zeroes.
const coefficientAt = (index: number) => index + 1 + Math.floor(index / 99);
const isCoefficient = (n: number, max: number) =>
  inRange(n, 1, max) && n % 100 !== 0;

function decimalPair(max: number, subtract: boolean): Domain {
  const width = max - Math.floor(max / 100);
  return {
    size: subtract ? (width * (width + 1)) / 2 : width * width,
    at(index) {
      const [a, b] = subtract
        ? triangleAt(index, width)
        : [Math.floor(index / width), index % width];
      return [coefficientAt(a), coefficientAt(b)];
    },
    has: (p) =>
      p.length === 2 &&
      p.every((n) => isCoefficient(n, max)) &&
      (!subtract || p[0] >= p[1]),
  };
}

/** A/B has <=3 decimal places iff B divides 1000A. For (A/100)/B,
 * B must divide 10A. Each divisor row is therefore an arithmetic progression.
 * Excluding whole-number dividends removes every period-th multiplier.
 */
function divisionDomain(byNatural: boolean): Domain {
  const divisors = Array.from(
    { length: byNatural ? 9 : 999 },
    (_, i) => i + 1,
  ).filter((b) => byNatural || b % 100 !== 0);
  const divisorRows = divisors.map((b) => {
    const step = b / gcd(b, byNatural ? 10 : 1000);
    const period = 100 / gcd(step, 100);
    const limit = Math.floor(999 / step);
    return { b, step, period, count: limit - Math.floor(limit / period) };
  });
  const table = rows(divisorRows, (row) => row.count);
  return {
    size: table.size,
    at(index) {
      const [{ b, step, period }, offset] = table.locate(index);
      const multiple = offset + 1 + Math.floor(offset / (period - 1));
      return [multiple * step, b];
    },
    has: (p) =>
      p.length === 2 &&
      isCoefficient(p[0], 999) &&
      (byNatural ? inRange(p[1], 1, 9) : isCoefficient(p[1], 999)) &&
      (p[0] * (byNatural ? 10 : 1000)) % p[1] === 0,
  };
}

function decimalDefinition(
  id: string,
  grade: ArithmeticGrade,
  title: string,
  operator: "+" | "-" | "×" | "÷",
  domain: Domain,
  byNatural = false,
): ArithmeticV2Definition {
  const group = { "+": "add", "-": "sub", "×": "mul", "÷": "div" }[operator];
  return define({
    id: `elem-${id}`,
    grade,
    strand: "소수",
    title,
    description:
      operator === "+" || operator === "-"
        ? "0.01~99.99 중 정수가 아닌 두 수. 소수 둘째 자리까지의 입력, 음수가 아닌 정확한 결과."
        : operator === "×"
          ? "0.01~9.99 중 정수가 아닌 두 수. 반올림 없는 정확한 곱."
          : `0.01~9.99 중 정수가 아닌 수 ÷ ${byNatural ? "자연수 1~9" : "0.01~9.99 중 정수가 아닌 수"}. 정확한 몫이 소수 셋째 자리 이내인 경우만 포함합니다.`,
    labels: ["직접 연산", "정확한 유한소수", "반올림 없음"],
    rankGroup: `elementary-decimal-${group}`,
    domain,
    prompt: ([a, b]) => {
      const left = decimalAnswer(a, 2).text;
      const right = byNatural ? String(b) : decimalAnswer(b, 2).text;
      const latexOperator =
        operator === "×" ? "\\times" : operator === "÷" ? "\\div" : operator;
      return {
        layout: "math",
        text: `${left} ${operator} ${right}`,
        latex: `${left} ${latexOperator} ${right}`,
      };
    },
    calculate: ([a, b]) => {
      if (operator === "+") return decimalAnswer(a + b, 2);
      if (operator === "-") return decimalAnswer(a - b, 2);
      if (operator === "×") return decimalAnswer(a * b, 4);
      const denominator = byNatural ? 100 * b : b;
      for (let scale = 0; scale <= 3; scale++) {
        const scaled = a * 10 ** scale;
        if (scaled % denominator === 0)
          return decimalAnswer(scaled / denominator, scale);
      }
      throw new RangeError(
        "Non-finite or over-precision decimal quotient outside domain",
      );
    },
    check: ([a, b], answer) => {
      const x = BigInt(a);
      const y = BigInt(b);
      if (operator === "+") return checkDecimal(answer, x + y, BigInt(100));
      if (operator === "-") return checkDecimal(answer, x - y, BigInt(100));
      if (operator === "×") return checkDecimal(answer, x * y, BigInt(10000));
      return checkDecimal(answer, x, y * BigInt(byNatural ? 100 : 1));
    },
  });
}

// ---- 2026-10-16 expansion (track C): 초5 multiplication by a natural, decimal
// point shift, and the 초6 natural ÷ natural quotient written as a decimal.
// Every parameter of these three types is in hundredths, whole numbers included
// (7 → 700, ×100 → 10000), matching the rest of this family. IDs are frozen.

const DECIMAL_LABELS = ["직접 연산", "정확한 유한소수", "반올림 없음"];
const decimalPrompt = (a: number, b: number, operator: "×" | "÷") => ({
  text: `${decimalAnswer(a, 2).text} ${operator} ${decimalAnswer(b, 2).text}`,
  latex: `${decimalAnswer(a, 2).text} ${operator === "×" ? "\\times" : "\\div"} ${decimalAnswer(b, 2).text}`,
});
const isHundredthsNatural = (value: number, min: number, max: number) =>
  Number.isSafeInteger(value) &&
  value % 100 === 0 &&
  inRange(value / 100, min, max);

/** 2~9 × (0.01~9.99, not whole). ×1 is screened. */
const NON_WHOLE_COUNT = 990;
const naturalTimesDecimalDomain: Domain = {
  size: 8 * NON_WHOLE_COUNT,
  at: (i) => [
    100 * (Math.floor(i / NON_WHOLE_COUNT) + 2),
    coefficientAt(i % NON_WHOLE_COUNT),
  ],
  has: (p) =>
    p.length === 2 &&
    isHundredthsNatural(p[0], 2, 9) &&
    isCoefficient(p[1], 999),
};

/** Decimal point shift: (0.01~9.99, not whole) × 0.1 · 0.01 · 10 · 100 · 1000, and
 * (2~999) × 0.1 · 0.01. ×1, a whole number × 10ⁿ, and identical operands
 * (0.1 × 0.1, 0.01 × 0.01) are screened. Rows are indexed by the left operand.
 */
const DECIMAL_SHIFTS = [10, 1, 1000, 10000, 100000] as const;
const NATURAL_SHIFTS = [10, 1] as const;
const SHIFT_NATURAL_COUNT = 998;
const shiftLefts = [
  ...Array.from({ length: NON_WHOLE_COUNT }, (_, i) => coefficientAt(i)),
  ...Array.from({ length: SHIFT_NATURAL_COUNT }, (_, i) => 100 * (i + 2)),
];
const shiftFactors = (left: number): readonly number[] =>
  left % 100 === 0
    ? NATURAL_SHIFTS
    : DECIMAL_SHIFTS.filter((factor) => factor !== left);
const shiftRows = rows(shiftLefts, (left) => shiftFactors(left).length);
const pointShiftDomain: Domain = {
  size: shiftRows.size,
  at(i) {
    const [left, offset] = shiftRows.locate(i);
    return [left, shiftFactors(left)[offset]];
  },
  has: (p) =>
    p.length === 2 &&
    (isCoefficient(p[0], 999) || isHundredthsNatural(p[0], 2, 999)) &&
    shiftFactors(p[0]).includes(p[1]),
};

/** a ÷ b for naturals a 1~99, b 2~99 whose exact quotient is not whole and has
 * at most three decimal places (b divides 1000a). Rows are indexed by divisor.
 */
const quotientDivisors = Array.from({ length: 98 }, (_, i) => i + 2);
const quotientAllowed = (a: number, b: number) =>
  inRange(a, 1, 99) && inRange(b, 2, 99) && a % b !== 0 && (1000 * a) % b === 0;
const quotientRows = rows(quotientDivisors, (b) => {
  let count = 0;
  for (let a = 1; a <= 99; a++) if (quotientAllowed(a, b)) count++;
  return count;
});
const naturalQuotientDomain: Domain = {
  size: quotientRows.size,
  at(index) {
    const [b, offset] = quotientRows.locate(index);
    let remaining = offset;
    for (let a = 1; a <= 99; a++)
      if (quotientAllowed(a, b) && remaining-- === 0) return [100 * a, 100 * b];
    throw new RangeError("Decimal quotient row exhausted");
  },
  has: (p) =>
    p.length === 2 &&
    isHundredthsNatural(p[0], 1, 99) &&
    isHundredthsNatural(p[1], 2, 99) &&
    quotientAllowed(p[0] / 100, p[1] / 100),
};

const naturalTimesDecimal = define({
  id: "elem-g5-natural-mul-decimal",
  grade: "초5",
  strand: "소수",
  title: "자연수 × 소수",
  description:
    "자연수 2~9 × 0.01~9.99 중 정수가 아닌 소수. 자연수가 앞에 오며, 소수 둘째 자리까지의 정확한 곱.",
  labels: DECIMAL_LABELS,
  curriculum: { semester: 2, unit: "소수의 곱셈" },
  rankGroup: "elementary-decimal-mul",
  domain: naturalTimesDecimalDomain,
  prompt: ([a, b]) => ({ layout: "math", ...decimalPrompt(a, b, "×") }),
  calculate: ([a, b]) => decimalAnswer(a * b, 4),
  check: ([a, b], answer) =>
    checkDecimal(answer, BigInt(a) * BigInt(b), BigInt(10000)),
});

const pointShift = define({
  id: "elem-g5-decimal-point-shift",
  grade: "초5",
  strand: "소수",
  title: "곱의 소수점 위치",
  description:
    "0.01~9.99 중 정수가 아닌 소수에 0.1·0.01·10·100·1000 을, 자연수 2~999 에 0.1·0.01 을 곱합니다. 소수점의 위치만 옮기는 정확한 곱.",
  labels: ["직접 연산", "소수점 위치", "반올림 없음"],
  curriculum: { semester: 2, unit: "소수의 곱셈" },
  rankGroup: "elementary-decimal-mul",
  domain: pointShiftDomain,
  prompt: ([a, b]) => ({
    layout: "math",
    ...decimalPrompt(a, b, "×"),
    instruction: "소수 또는 자연수로 계산하세요.",
  }),
  calculate: ([a, b]) => decimalAnswer(a * b, 4),
  check: ([a, b], answer) =>
    checkDecimal(answer, BigInt(a) * BigInt(b), BigInt(10000)),
});

const naturalQuotient = define({
  id: "elem-g6-natural-div-natural-decimal",
  grade: "초6",
  strand: "소수",
  title: "자연수 ÷ 자연수의 몫을 소수로 나타내기",
  description:
    "1~99 ÷ 2~99 중 나누어떨어지지 않고 몫이 소수 셋째 자리 이내로 끝나는 경우. 나머지 대신 정확한 몫을 소수로 나타냅니다.",
  labels: ["직접 연산", "소수인 몫", "소수 셋째 자리 이내"],
  curriculum: { semester: 1, unit: "소수의 나눗셈" },
  rankGroup: "elementary-decimal-div",
  domain: naturalQuotientDomain,
  prompt: ([a, b]) => ({
    layout: "math",
    ...decimalPrompt(a, b, "÷"),
    instruction: "몫을 소수로 나타내세요.",
  }),
  calculate: ([a, b]) => {
    for (let scale = 1; scale <= 3; scale++) {
      const scaled = a * 10 ** scale;
      if (scaled % b === 0) return decimalAnswer(scaled / b, scale);
    }
    throw new RangeError("Non-terminating decimal quotient outside domain");
  },
  check: ([a, b], answer) => checkDecimal(answer, BigInt(a), BigInt(b)),
});

export const DECIMAL_DEFINITIONS: readonly ArithmeticV2Definition[] = [
  decimalDefinition(
    "g4-decimal-add",
    "초4",
    "소수의 덧셈",
    "+",
    decimalPair(9999, false),
  ),
  decimalDefinition(
    "g4-decimal-sub",
    "초4",
    "소수의 뺄셈",
    "-",
    decimalPair(9999, true),
  ),
  decimalDefinition(
    "g5-decimal-mul",
    "초5",
    "소수의 곱셈",
    "×",
    decimalPair(999, false),
  ),
  decimalDefinition(
    "g6-decimal-div",
    "초6",
    "소수 ÷ 소수",
    "÷",
    divisionDomain(false),
  ),
  decimalDefinition(
    "g6-decimal-div-natural",
    "초6",
    "소수 ÷ 자연수",
    "÷",
    divisionDomain(true),
    true,
  ),
  // 2026-10-16 expansion (track C) — append only.
  naturalTimesDecimal,
  pointShift,
  naturalQuotient,
];
