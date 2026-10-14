import type { ArithmeticV2Answer, ArithmeticV2Definition } from "../../types";
import {
  abs,
  add,
  cartesian,
  decode,
  family,
  fractionText,
  gcd,
  math,
  nonzero,
  range,
  rational,
  readInteger,
  readRational,
  type Domain,
  type Rational,
} from "./exact";

const ZERO = BigInt(0);
const ONE = BigInt(1);
type Kind = "polynomial" | "surd";
type Term = readonly [number, Rational];

// Polynomial triples descend by degree; surd triples ascend by squarefree
// radicand (1 denotes a rational term). Omit zero coefficients; [] denotes zero.
// These local readers support degree 12 and multiple radicals without changing
// the old families, their readers, domain order, prompts or saved answers.
function expression(terms: readonly Term[], kind: Kind, latex = false): string {
  let result = "";
  for (const [key, [n, d]] of terms) {
    const magnitude = abs(n);
    let body: string;
    if (kind === "polynomial") {
      const coefficient =
        key && magnitude === d
          ? ""
          : key && d !== ONE && !latex
            ? `(${magnitude}/${d})`
            : fractionText([magnitude, d], latex);
      body =
        coefficient +
        (key === 0 ? "" : key === 1 ? "x" : latex ? `x^{${key}}` : `x^${key}`);
    } else if (key === 1) {
      body = fractionText([magnitude, d], latex);
    } else {
      const numerator = `${magnitude === ONE ? "" : magnitude}${latex ? `\\sqrt{${key}}` : `√${key}`}`;
      body =
        d === ONE
          ? numerator
          : latex
            ? `\\frac{${numerator}}{${d}}`
            : `${numerator}/${d}`;
    }
    result += `${result ? (n < ZERO ? " - " : " + ") : n < ZERO ? "-" : ""}${body}`;
  }
  return result || "0";
}

function answerOf(kind: Kind, input: readonly Term[]): ArithmeticV2Answer {
  const terms = input
    .filter(([, [n]]) => n !== ZERO)
    .sort(([a], [b]) => (kind === "polynomial" ? b - a : a - b));
  return {
    kind,
    exact: terms.flatMap(([key, q]) => [String(key), ...q.map(String)]),
    text: expression(terms, kind),
    latex: expression(terms, kind, true),
  };
}

// Independent of the generator's repeated square-divisor extraction.
function primeDecomposition(n: bigint): readonly [bigint, number] {
  let outside = ONE,
    inside = ONE;
  for (let prime = BigInt(2); prime * prime <= n; prime++) {
    let exponent = 0;
    while (n % prime === ZERO) {
      exponent++;
      n /= prime;
    }
    for (let pair = 0; pair < Math.floor(exponent / 2); pair++)
      outside *= prime;
    if (exponent % 2) inside *= prime;
  }
  return [outside, Number(inside * n)];
}

function readTerms(answer: ArithmeticV2Answer, kind: Kind): Term[] | null {
  if (answer.kind !== kind || answer.exact.length % 3 !== 0) return null;
  const terms: Term[] = [];
  let previous = kind === "polynomial" ? 13 : 0;
  for (let i = 0; i < answer.exact.length; i += 3) {
    const key = readInteger(answer.exact[i]);
    const q = readRational(answer.exact[i + 1], answer.exact[i + 2]);
    if (key === null || !q || q[0] === ZERO) return null;
    if (kind === "polynomial") {
      if (key < ZERO || key >= BigInt(previous)) return null;
    } else if (
      key <= BigInt(previous) ||
      key > BigInt(144) ||
      primeDecomposition(key)[0] !== ONE
    ) {
      return null;
    }
    previous = Number(key);
    terms.push([previous, q]);
  }
  return expression(terms, kind) === answer.text &&
    expression(terms, kind, true) === answer.latex
    ? terms
    : null;
}

const valueAt = (terms: readonly Term[], key: number): Rational =>
  terms.find(([k]) => k === key)?.[1] ?? [ZERO, ONE];
const integerTerm = (key: number, n: number): Term => [key, rational(n)];
const linear = (a: number, b: number, latex = false) =>
  expression([integerTerm(1, a), integerTerm(0, b)], "polynomial", latex);
const scalarAxis = [-5, -4, -3, -2, 2, 3, 4, 5];

// Rightmost Cartesian axis changes fastest. Nonzero constants keep each
// scalar task a genuine two-term linear expression; ±1 scalars are excluded.
// [scalar, x coefficient, constant], 8 × 12 × 18 = 1,728 per operation.
const scalarDomain = cartesian(scalarAxis, nonzero(6), nonzero(9));
function scalarFamily(
  operation: "multiply" | "divide",
): ArithmeticV2Definition {
  return family({
    id: `m1-linear-scalar-${operation}`,
    grade: "중1",
    strand: "문자식",
    title: `일차식과 수의 ${operation === "multiply" ? "곱셈" : "나눗셈"}`,
    description:
      "일차식의 각 항에 0이 아닌 정수를 곱하거나 나누고, 계수를 기약분수로 정리합니다.",
    labels: ["문자식", "분배법칙"],
    rankGroup: "m1-linear-expression",
    domain: scalarDomain,
    prompt: ([s, a, b]) =>
      math(
        operation === "multiply"
          ? `${s}(${linear(a, b)})`
          : `(${linear(a, b)})/(${s})`,
        operation === "multiply"
          ? `${s}\\left(${linear(a, b, true)}\\right)`
          : `\\frac{${linear(a, b, true)}}{${s}}`,
        "식을 간단히 하시오.",
      ),
    solve: ([s, a, b]) =>
      answerOf("polynomial", [
        [
          1,
          operation === "multiply"
            ? rational(BigInt(a) * BigInt(s))
            : rational(a, s),
        ],
        [
          0,
          operation === "multiply"
            ? rational(BigInt(b) * BigInt(s))
            : rational(b, s),
        ],
      ]),
    check: ([s, a, b], answer) => {
      const terms = readTerms(answer, "polynomial");
      if (!terms || terms.some(([degree]) => degree > 1)) return false;
      // Coefficient inverse identities, with denominators cleared.
      return [b, a].every((input, degree) => {
        const [n, d] = valueAt(terms, degree);
        return operation === "multiply"
          ? n % BigInt(s) === ZERO && n / BigInt(s) === BigInt(input) * d
          : n * BigInt(s) === BigInt(input) * d;
      });
    },
  });
}

// Reduced, noninteger coefficients: numerator -6..6 except 0, denominator 2..6.
// Ordered by numerator then denominator: 34 coefficients, 34² = 1,156 tasks.
const fractions = nonzero(6).flatMap((n) =>
  range(2, 6)
    .filter((d) => gcd(BigInt(n), BigInt(d)) === ONE)
    .map((d) => [n, d]),
);
const fractionDomain: Domain = {
  size: fractions.length ** 2,
  at: (index) =>
    decode(index, [fractions.length, fractions.length]).flatMap(
      (i) => fractions[i],
    ),
  contains: (p) =>
    p.length === 4 &&
    [0, 2].every((i) =>
      fractions.some(([n, d]) => p[i] === n && p[i + 1] === d),
    ),
};

const rawRadical = (a: number, n: number, latex = false) =>
  `${a === 1 ? "" : a === -1 ? "-" : a}${latex ? `\\sqrt{${n}}` : `√${n}`}`;
function signedTail(a: number, body: string): string {
  return `${a < 0 ? " - " : " + "}${body}`;
}

// Generator removes square factors and then combines exact rational coefficients.
function radicalAnswer(
  raw: readonly (readonly [bigint, bigint])[],
): ArithmeticV2Answer {
  const terms = new Map<number, Rational>();
  for (const [coefficient, radicand] of raw) {
    let n = radicand,
      outside = ONE;
    for (let divisor = BigInt(2); divisor * divisor <= n; divisor++) {
      const square = divisor * divisor;
      while (n % square === ZERO) {
        outside *= divisor;
        n /= square;
      }
    }
    const key = Number(n);
    terms.set(
      key,
      add(terms.get(key) ?? rational(0), rational(coefficient * outside)),
    );
  }
  return answerOf("surd", [...terms]);
}

// Check every independent squarefree basis coefficient, including missing and
// extra terms and exact cancellation. Prime valuations are independent of the
// generating square extraction; no squaring of whole sums or float comparison.
function checkRadicals(
  raw: readonly (readonly [bigint, bigint])[],
  answer: ArithmeticV2Answer,
): boolean {
  const terms = readTerms(answer, "surd");
  if (!terms) return false;
  const contributions = raw.map(([coefficient, radicand]) => {
    const [outside, basis] = primeDecomposition(radicand);
    return { basis, coefficient: coefficient * outside };
  });
  const bases = new Set([
    ...terms.map(([basis]) => basis),
    ...contributions.map(({ basis }) => basis),
  ]);
  for (const basis of bases) {
    const [n, d] = valueAt(terms, basis);
    let residual = n;
    for (const contribution of contributions)
      if (contribution.basis === basis)
        residual -= contribution.coefficient * d;
    if (residual !== ZERO) return false;
  }
  return true;
}

const sumRadicands = [2, 3, 4, 5, 8, 12, 18, 20];
const distributionRadicands = [2, 3, 5, 6, 8, 12];

export const ALGEBRA_RADICAL_SUPPLEMENT_DEFINITIONS: readonly ArithmeticV2Definition[] =
  [
    scalarFamily("multiply"),
    scalarFamily("divide"),
    family({
      id: "m1-rational-like-terms",
      grade: "중1",
      strand: "문자식",
      title: "분수 계수 동류항의 덧셈",
      description:
        "기약분수 계수를 가진 두 x항을 더합니다. 음수 계수와 항이 소거되는 경우를 포함합니다.",
      labels: ["문자식", "분수 계수", "동류항"],
      rankGroup: "m1-linear-expression",
      domain: fractionDomain,
      prompt: ([a, b, c, d]) =>
        math(
          `(${a}/${b})x + (${c}/${d})x`,
          `\\left(${fractionText(rational(a, b), true)}\\right)x + \\left(${fractionText(rational(c, d), true)}\\right)x`,
          "식을 간단히 하시오.",
        ),
      solve: ([a, b, c, d]) =>
        answerOf("polynomial", [[1, add(rational(a, b), rational(c, d))]]),
      check: ([a, b, c, d], answer) => {
        const terms = readTerms(answer, "polynomial");
        if (!terms || terms.some(([degree]) => degree !== 1)) return false;
        const [n, denominator] = valueAt(terms, 1);
        // Remove the first addend, then compare the second by cross multiplication.
        return (
          (n * BigInt(b) - BigInt(a) * denominator) * BigInt(d) ===
          BigInt(c) * denominator * BigInt(b)
        );
      },
    }),
    family({
      id: "m2-monomial-power",
      grade: "중2",
      strand: "문자식",
      title: "단항식의 거듭제곱",
      description:
        "정수 계수인 단항식 전체를 2~4제곱합니다. 음수의 부호와 x의 지수를 함께 계산합니다.",
      labels: ["문자식", "거듭제곱"],
      rankGroup: "m2-monomial",
      // [coefficient, inner degree, outer power], 8 × 3 × 3 = 72.
      domain: cartesian(scalarAxis, range(1, 3), range(2, 4)),
      prompt: ([a, e, k]) =>
        math(
          `(${expression([integerTerm(e, a)], "polynomial")})^${k}`,
          `\\left(${expression([integerTerm(e, a)], "polynomial", true)}\\right)^{${k}}`,
          "식을 간단히 하시오.",
        ),
      solve: ([a, e, k]) =>
        answerOf("polynomial", [[e * k, rational(BigInt(a) ** BigInt(k))]]),
      check: ([a, e, k], answer) => {
        const terms = readTerms(answer, "polynomial");
        if (!terms || terms.length !== 1 || terms[0][0] !== e * k) return false;
        let n = terms[0][1][0];
        const d = terms[0][1][1];
        // Divide the proposed coefficient repeatedly; independent of exponentiation.
        if (d !== ONE) return false;
        for (let step = 0; step < k; step++) {
          if (n % BigInt(a) !== ZERO) return false;
          n /= BigInt(a);
        }
        return n === ONE;
      },
    }),
    family({
      id: "m3-radical-three-terms",
      grade: "중3",
      strand: "근호",
      title: "세 근호 항의 덧셈과 뺄셈",
      description:
        "세 항의 근호를 간단히 하고 같은 근호끼리 모읍니다. 서로 다른 근호와 유리수 항도 포함합니다.",
      labels: ["근호", "동류 근호", "세 항"],
      rankGroup: "m3-radical",
      // [a,n,b,m,c,r], each coefficient in {-2,-1,1,2}; (4 × 8)³ = 32,768.
      domain: cartesian(
        nonzero(2),
        sumRadicands,
        nonzero(2),
        sumRadicands,
        nonzero(2),
        sumRadicands,
      ),
      prompt: ([a, n, b, m, c, r]) => {
        const render = (latex: boolean) =>
          rawRadical(a, n, latex) +
          signedTail(b, rawRadical(Math.abs(b), m, latex)) +
          signedTail(c, rawRadical(Math.abs(c), r, latex));
        return math(
          render(false),
          render(true),
          "근호를 간단히 하고 동류항끼리 계산하시오.",
        );
      },
      solve: ([a, n, b, m, c, r]) =>
        radicalAnswer([
          [BigInt(a), BigInt(n)],
          [BigInt(b), BigInt(m)],
          [BigInt(c), BigInt(r)],
        ]),
      check: ([a, n, b, m, c, r], answer) =>
        checkRadicals(
          [
            [BigInt(a), BigInt(n)],
            [BigInt(b), BigInt(m)],
            [BigInt(c), BigInt(r)],
          ],
          answer,
        ),
    }),
    family({
      id: "m3-radical-distribute",
      grade: "중3",
      strand: "근호",
      title: "근호가 있는 식의 분배법칙",
      description:
        "근호 항을 괄호 안의 근호 항과 정수 항에 각각 곱한 뒤 간단히 합니다.",
      labels: ["근호", "분배법칙"],
      rankGroup: "m3-radical",
      // a√n(b√m+c): [a,n,b,m,c], 4 × 6 × 4 × 6 × 6 = 3,456.
      domain: cartesian(
        nonzero(2),
        distributionRadicands,
        nonzero(2),
        distributionRadicands,
        nonzero(3),
      ),
      prompt: ([a, n, b, m, c]) =>
        math(
          `${rawRadical(a, n)}(${rawRadical(b, m)}${signedTail(c, String(Math.abs(c)))})`,
          `${rawRadical(a, n, true)}\\left(${rawRadical(b, m, true)}${signedTail(c, String(Math.abs(c)))}\\right)`,
          "식을 전개하고 근호를 간단히 하시오.",
        ),
      solve: ([a, n, b, m, c]) =>
        radicalAnswer([
          [BigInt(a) * BigInt(b), BigInt(n) * BigInt(m)],
          [BigInt(a) * BigInt(c), BigInt(n)],
        ]),
      check: ([a, n, b, m, c], answer) =>
        checkRadicals(
          [
            [BigInt(a) * BigInt(b), BigInt(n) * BigInt(m)],
            [BigInt(a) * BigInt(c), BigInt(n)],
          ],
          answer,
        ),
    }),
  ];
