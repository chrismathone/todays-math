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
];
