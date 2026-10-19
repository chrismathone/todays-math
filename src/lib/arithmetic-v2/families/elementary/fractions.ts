import type {
  ArithmeticCurriculum,
  ArithmeticGrade,
  ArithmeticV2Definition,
} from "../../types";
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
  curriculum?: ArithmeticCurriculum,
): ArithmeticV2Definition {
  return define({
    id: `elem-${id}`,
    grade,
    strand: "분수",
    title,
    description,
    labels: ["직접 연산", "분모 2~12", "기약분수·대분수 정답"],
    ...(curriculum ? { curriculum } : {}),
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

// ---- 2026-10-16 expansion (track C): 초5 multiplication and three-term drills.
// IDs and parameter layouts below are frozen; append only.

const REDUCE_INSTRUCTION = "계산하고 약분하세요. 가분수는 대분수로 나타내세요.";
const properPool = atoms(false, true);
const properKeys = new Set(properPool.map(([n, d]) => `${n}/${d}`));
const isProper = (n: number, d: number) => properKeys.has(`${n}/${d}`);
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;
const fractionLatex = (op: "+" | "-" | "×") => (op === "×" ? "\\times" : op);

/** Ordered pairs of two different reduced proper fractions (a × a is screened). */
const properProductDomain = pairDomain(
  properPool,
  ([n, d], [m, e]) => n !== m || d !== e,
);

/** 2~9 × (reduced proper or mixed fraction); the natural comes first and ×1 is screened. */
const naturalTimesFractionDomain: Domain = {
  size: multiplicativePool.length * 8,
  at: (i) => [
    Math.floor(i / multiplicativePool.length) + 2,
    1,
    ...multiplicativePool[i % multiplicativePool.length],
  ],
  has: (p) =>
    p.length === 4 &&
    p[1] === 1 &&
    inRange(p[0], 2, 9) &&
    multiplicativePool.some(([n, d]) => n === p[2] && d === p[3]),
};

/** Ordered triples of pairwise different reduced proper fractions. */
const tripleProductDomain: Domain = (() => {
  const n = properPool.length;
  return {
    size: n * (n - 1) * (n - 2),
    at(index) {
      const first = Math.floor(index / ((n - 1) * (n - 2)));
      const rest = index % ((n - 1) * (n - 2));
      let second = Math.floor(rest / (n - 2));
      let third = rest % (n - 2);
      if (second >= first) second++;
      const [lo, hi] = first < second ? [first, second] : [second, first];
      if (third >= lo) third++;
      if (third >= hi) third++;
      return [
        ...properPool[first],
        ...properPool[second],
        ...properPool[third],
      ];
    },
    has: (p) =>
      p.length === 6 &&
      isProper(p[0], p[1]) &&
      isProper(p[2], p[3]) &&
      isProper(p[4], p[5]) &&
      new Set([`${p[0]}/${p[1]}`, `${p[2]}/${p[3]}`, `${p[4]}/${p[5]}`])
        .size === 3,
  };
})();

/** a ± b ± c over reduced proper fractions with three different denominators
 * whose least common multiple is at most 60. Mode 0: a+b+c, 1: a+b−c, 2: a−b+c,
 * 3: a−b−c. Every intermediate (left-to-right) result and the final result is ≥ 0.
 */
const THREE_TERM_OPERATORS: readonly (readonly ["+" | "-", "+" | "-"])[] = [
  ["+", "+"],
  ["+", "-"],
  ["-", "+"],
  ["-", "-"],
];
const THREE_TERM_LCM_LIMIT = 60;
function threeTermAllowed(p: readonly number[]): boolean {
  const [mode, n, d, m, e, o, f] = p;
  if (
    !inRange(mode, 0, 3) ||
    !isProper(n, d) ||
    !isProper(m, e) ||
    !isProper(o, f)
  )
    return false;
  if (d === e || e === f || d === f) return false;
  const common = lcm(lcm(d, e), f);
  if (common > THREE_TERM_LCM_LIMIT) return false;
  const [x, y, z] = [(n * common) / d, (m * common) / e, (o * common) / f];
  const [first, second] = THREE_TERM_OPERATORS[mode];
  const partial = first === "+" ? x + y : x - y;
  const total = second === "+" ? partial + z : partial - z;
  return partial >= 0 && total >= 0;
}
const threeTermDomain: Domain = (() => {
  const heads: { mode: number; a: Fraction; b: Fraction }[] = [];
  for (let mode = 0; mode <= 3; mode++)
    for (const a of properPool)
      for (const b of properPool) if (a[1] !== b[1]) heads.push({ mode, a, b });
  const table = rows(heads, ({ mode, a, b }) =>
    properPool.reduce(
      (total, c) => total + Number(threeTermAllowed([mode, ...a, ...b, ...c])),
      0,
    ),
  );
  return {
    size: table.size,
    at(index) {
      const [{ mode, a, b }, offset] = table.locate(index);
      let remaining = offset;
      for (const c of properPool) {
        const p = [mode, ...a, ...b, ...c];
        if (threeTermAllowed(p) && remaining-- === 0) return p;
      }
      throw new RangeError("Three-term fraction row exhausted");
    },
    has: (p) => p.length === 7 && threeTermAllowed(p),
  };
})();

const tripleProduct = define({
  id: "elem-g5-fraction-mul-three",
  grade: "초5",
  strand: "분수",
  title: "세 진분수의 곱셈",
  description:
    "분모 2~12의 서로 다른 기약 진분수 셋의 곱. 정답은 약분하여 기약분수로 표시합니다.",
  labels: ["직접 연산", "분모 2~12", "세 분수의 곱", "기약분수·대분수 정답"],
  curriculum: { semester: 2, unit: "분수의 곱셈" },
  rankGroup: "elementary-fraction-mul",
  domain: tripleProductDomain,
  prompt: ([n, d, m, e, o, f]) => {
    const [a, b, c] = [
      fractionDisplay(n, d),
      fractionDisplay(m, e),
      fractionDisplay(o, f),
    ];
    return {
      layout: "math",
      text: `${a.text} × ${b.text} × ${c.text}`,
      latex: `${a.latex} \\times ${b.latex} \\times ${c.latex}`,
      instruction: REDUCE_INSTRUCTION,
    };
  },
  calculate: ([n, d, m, e, o, f]) => rationalAnswer(n * m * o, d * e * f),
  check: (p, answer) => {
    const [n, d, m, e, o, f] = p.map(BigInt);
    return checkRational(answer, n * m * o, d * e * f);
  },
});

const threeTerms = define({
  id: "elem-g5-fraction-three-terms",
  grade: "초5",
  strand: "분수",
  title: "세 분수의 덧셈과 뺄셈",
  description:
    "분모가 서로 다른 기약 진분수 셋(분모 2~12, 세 분모의 최소공배수 60 이하)을 앞에서부터 차례로 더하고 뺍니다. 중간 결과와 정답은 0 이상이며, 정답은 약분하고 가분수는 대분수로 표시합니다.",
  labels: ["직접 연산", "분모 2~12", "세 분수 통분", "기약분수·대분수 정답"],
  curriculum: { semester: 1, unit: "분수의 덧셈과 뺄셈" },
  rankGroup: "elementary-fraction-three-terms",
  domain: threeTermDomain,
  prompt: ([mode, n, d, m, e, o, f]) => {
    const [first, second] = THREE_TERM_OPERATORS[mode];
    const [a, b, c] = [
      fractionDisplay(n, d),
      fractionDisplay(m, e),
      fractionDisplay(o, f),
    ];
    return {
      layout: "math",
      text: `${a.text} ${first} ${b.text} ${second} ${c.text}`,
      latex: `${a.latex} ${fractionLatex(first)} ${b.latex} ${fractionLatex(second)} ${c.latex}`,
      instruction: REDUCE_INSTRUCTION,
    };
  },
  calculate: ([mode, n, d, m, e, o, f]) => {
    const [first, second] = THREE_TERM_OPERATORS[mode];
    const numerator =
      n * e * f +
      (first === "+" ? 1 : -1) * m * d * f +
      (second === "+" ? 1 : -1) * o * d * e;
    return rationalAnswer(numerator, d * e * f);
  },
  check: (p, answer) => {
    const [first, second] = THREE_TERM_OPERATORS[p[0]];
    const [n, d, m, e, o, f] = p.slice(1).map(BigInt);
    const numerator =
      n * e * f +
      (first === "+" ? m * d * f : -(m * d * f)) +
      (second === "+" ? o * d * e : -(o * d * e));
    return checkRational(answer, numerator, d * e * f);
  },
});

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
  // 2026-10-16 expansion (track C) — append only.
  fractionDefinition(
    "g5-fraction-mul-proper",
    "초5",
    "진분수 × 진분수",
    "×",
    properProductDomain,
    "elementary-fraction-mul",
    "분모 2~12의 서로 다른 기약 진분수 둘의 곱. 정답은 약분하여 기약분수로 표시합니다.",
    { semester: 2, unit: "분수의 곱셈" },
  ),
  fractionDefinition(
    "g5-natural-mul-fraction",
    "초5",
    "자연수 × 분수",
    "×",
    naturalTimesFractionDomain,
    "elementary-fraction-mul",
    "자연수 2~9 × 분모 2~12, 정수 부분 0~3의 기약분수. 자연수가 앞에 옵니다.",
    { semester: 2, unit: "분수의 곱셈" },
  ),
  tripleProduct,
  threeTerms,
];
