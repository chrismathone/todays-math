import type { ArithmeticGrade, ArithmeticV2Definition } from "../../types";
import {
  checkRational,
  define,
  fractionDisplay,
  gcd,
  inRange,
  rationalAnswer,
  rows,
  type Domain,
} from "./common";

type Fraction = readonly [number, number];

function atoms(mixed: boolean, reduced: boolean): Fraction[] {
  const result: Fraction[] = [];
  for (let d = 2; d <= 12; d++) {
    for (let whole = mixed ? 1 : 0; whole <= (mixed ? 3 : 0); whole++) {
      for (let part = 1; part < d; part++) {
        if (!reduced || gcd(part, d) === 1) result.push([whole * d + part, d]);
      }
    }
  }
  return result;
}

/** Denominator-preserving representations are intentional for same-denominator practice.
 * Unlike-denominator and multiplication/division operands are reduced, so aliases
 * such as 1/2 and 2/4 cannot inflate those domains. Operand order is significant.
 */
function pairDomain(
  pool: readonly Fraction[],
  allowed: (a: Fraction, b: Fraction) => boolean,
): Domain {
  const keys = new Set(pool.map(([n, d]) => `${n}/${d}`));
  const table = rows(pool, (a) =>
    pool.reduce((total, b) => total + Number(allowed(a, b)), 0),
  );
  return {
    size: table.size,
    at(index) {
      const [a, offset] = table.locate(index);
      let remaining = offset;
      for (const b of pool) {
        if (allowed(a, b) && remaining-- === 0) return [...a, ...b];
      }
      throw new RangeError("Fraction row exhausted");
    },
    has: (p) =>
      p.length === 4 &&
      keys.has(`${p[0]}/${p[1]}`) &&
      keys.has(`${p[2]}/${p[3]}`) &&
      allowed([p[0], p[1]], [p[2], p[3]]),
  };
}

function fractionDefinition(
  id: string,
  grade: ArithmeticGrade,
  title: string,
  operator: "+" | "-" | "×" | "÷",
  domain: Domain,
  rankGroup: string,
  description: string,
): ArithmeticV2Definition {
  return define({
    id: `elem-${id}`,
    grade,
    strand: "분수",
    title,
    description,
    labels: ["직접 연산", "분모 2~12", "기약분수·대분수 정답"],
    rankGroup,
    domain,
    prompt: ([n, d, m, e]) => {
      const a = fractionDisplay(n, d);
      const b = fractionDisplay(m, e);
      const latexOp =
        operator === "×" ? "\\times" : operator === "÷" ? "\\div" : operator;
      return {
        layout: "math",
        text: `${a.text} ${operator} ${b.text}`,
        latex: `${a.latex} ${latexOp} ${b.latex}`,
        instruction: "계산하고 약분하세요. 가분수는 대분수로 나타내세요.",
      };
    },
    calculate: ([n, d, m, e]) =>
      operator === "+"
        ? rationalAnswer(n * e + m * d, d * e)
        : operator === "-"
          ? rationalAnswer(n * e - m * d, d * e)
          : operator === "×"
            ? rationalAnswer(n * m, d * e)
            : rationalAnswer(n * e, d * m),
    check: (p, answer) => {
      const [n, d, m, e] = p.map(BigInt);
      // Rational equations in BigInt are independent of the Number-based generator.
      if (operator === "+") return checkRational(answer, n * e + m * d, d * e);
      if (operator === "-") return checkRational(answer, n * e - m * d, d * e);
      if (operator === "×") return checkRational(answer, n * m, d * e);
      return checkRational(answer, n * e, d * m);
    },
  });
}

function additive(
  same: boolean,
  mixed: boolean,
  subtract: boolean,
): ArithmeticV2Definition {
  const pool = atoms(mixed, !same);
  const domain = pairDomain(
    pool,
    ([n, d], [m, e]) =>
      (same ? d === e : d !== e) && (!subtract || n * e >= m * d),
  );
  const grade = same ? "초4" : "초5";
  const group = `${same ? "same" : "unlike"}-${subtract ? "sub" : "add"}`;
  return fractionDefinition(
    `g${same ? 4 : 5}-${mixed ? "mixed" : "fraction"}-${group}`,
    grade,
    `${same ? "같은" : "다른"} 분모 ${mixed ? "대분수" : "진분수"}의 ${subtract ? "뺄셈" : "덧셈"}`,
    subtract ? "-" : "+",
    domain,
    `elementary-fraction-${group}`,
    `분모 2~12${mixed ? ", 정수 부분 1~3" : "의 진분수"}. ${same ? "주어진 분모를 유지한 피연산자" : "기약분수 피연산자"}. ${subtract ? "결과는 0 이상이며 " : ""}정답은 약분하고 가분수는 대분수로 표시합니다.`,
  );
}

const multiplicativePool = [...atoms(false, true), ...atoms(true, true)];
const productDomain = pairDomain(multiplicativePool, () => true);
const byNaturalDomain: Domain = {
  size: multiplicativePool.length * 9,
  at: (i) => [...multiplicativePool[Math.floor(i / 9)], (i % 9) + 1, 1],
  has: (p) =>
    p.length === 4 &&
    p[3] === 1 &&
    inRange(p[2], 1, 9) &&
    multiplicativePool.some(([n, d]) => n === p[0] && d === p[1]),
};

export const FRACTION_DEFINITIONS: readonly ArithmeticV2Definition[] = [
  additive(true, false, false),
  additive(true, false, true),
  additive(true, true, false),
  additive(true, true, true),
  additive(false, false, false),
  additive(false, false, true),
  additive(false, true, false),
  additive(false, true, true),
  fractionDefinition(
    "g5-fraction-mul",
    "초5",
    "분수의 곱셈 (대분수 포함)",
    "×",
    productDomain,
    "elementary-fraction-mul",
    "분모 2~12의 양의 기약분수. 정수 부분 0~3. 정답은 약분하고 대분수로 표시합니다.",
  ),
  fractionDefinition(
    "g5-fraction-mul-natural",
    "초5",
    "분수 × 자연수",
    "×",
    byNaturalDomain,
    "elementary-fraction-mul",
    "분모 2~12, 정수 부분 0~3의 분수 × 1~9.",
  ),
  fractionDefinition(
    "g6-fraction-div",
    "초6",
    "분수의 나눗셈 (대분수 포함)",
    "÷",
    productDomain,
    "elementary-fraction-div",
    "분모 2~12의 양의 기약분수. 정수 부분 0~3. 0으로 나누지 않습니다.",
  ),
  fractionDefinition(
    "g6-fraction-div-natural",
    "초6",
    "분수 ÷ 자연수",
    "÷",
    byNaturalDomain,
    "elementary-fraction-div",
    "분모 2~12, 정수 부분 0~3의 분수 ÷ 1~9.",
  ),
];
