import type { ArithmeticV2Answer, ArithmeticV2Definition } from "../../types";
import {
  abs,
  cartesian,
  family,
  fractionText,
  math,
  nonzero,
  range,
  rational,
  readInteger,
  readRational,
  type Domain,
  type Rational,
} from "./exact";

// Generator: repeatedly remove square divisors.
function extractSquare(n: number): [number, number] {
  if (n === 0) return [0, 1];
  let outside = 1,
    inside = n;
  for (let divisor = 2; divisor * divisor <= inside; divisor++) {
    while (inside % (divisor * divisor) === 0) {
      outside *= divisor;
      inside /= divisor * divisor;
    }
  }
  return [outside, inside];
}
// Verifier: prime valuations, independent of extractSquare().
function primeParts(n: number): [bigint, number] {
  if (n === 0) return [BigInt(0), 1];
  let outside = BigInt(1),
    inside = 1,
    remainder = n;
  for (let prime = 2; prime <= remainder; prime++) {
    let count = 0;
    while (remainder % prime === 0) {
      remainder /= prime;
      count++;
    }
    for (let pair = 0; pair < Math.floor(count / 2); pair++)
      outside *= BigInt(prime);
    if (count % 2) inside *= prime;
  }
  return [outside, inside];
}
function radicalText(value: Rational, radicand: number, latex = false): string {
  if (value[0] === BigInt(0)) return "0";
  if (radicand === 1) return fractionText(value, latex);
  const [n, d] = value,
    sign = n < BigInt(0) ? "-" : "";
  const c = abs(n) === BigInt(1) ? "" : String(abs(n));
  const numerator = `${c}${latex ? `\\sqrt{${radicand}}` : `√${radicand}`}`;
  if (d === BigInt(1)) return `${sign}${numerator}`;
  return latex
    ? `${sign}\\frac{${numerator}}{${d}}`
    : `${sign}${numerator}/${d}`;
}
function surdAnswer(value: Rational, radicand: number): ArithmeticV2Answer {
  return {
    kind: "surd",
    exact:
      value[0] === BigInt(0) ? [] : [String(radicand), ...value.map(String)],
    text: radicalText(value, radicand),
    latex: radicalText(value, radicand, true),
  };
}
function readSurd(
  answer: ArithmeticV2Answer,
): { value: Rational; radicand: number } | null {
  if (
    answer.kind !== "surd" ||
    (answer.exact.length !== 0 && answer.exact.length !== 3)
  )
    return null;
  if (!answer.exact.length)
    return answer.text === "0" && answer.latex === "0"
      ? { value: rational(0), radicand: 1 }
      : null;
  const d = readInteger(answer.exact[0]),
    value = readRational(answer.exact[1], answer.exact[2]);
  if (
    d === null ||
    d < BigInt(1) ||
    d > BigInt(900) ||
    !value ||
    value[0] === BigInt(0) ||
    primeParts(Number(d))[0] !== BigInt(1)
  )
    return null;
  const radicand = Number(d);
  return answer.text === radicalText(value, radicand) &&
    answer.latex === radicalText(value, radicand, true)
    ? { value, radicand }
    : null;
}
const rawRadical = (a: number, n: number, latex = false): string =>
  `${a === 1 ? "" : a === -1 ? "-" : a}${latex ? `\\sqrt{${n}}` : `√${n}`}`;
const bases = [2, 3, 5, 6, 7, 10, 11];
const likeBase = cartesian(
  nonzero(3),
  range(1, 4),
  nonzero(3),
  range(1, 4),
  bases,
);
const likeDomain: Domain = {
  size: likeBase.size,
  at(index) {
    const [a, s, b, t, d] = likeBase.at(index);
    return [a, s * s * d, b, t * t * d];
  },
  contains: (p) => {
    if (
      p.length !== 4 ||
      !nonzero(3).includes(p[0]) ||
      !nonzero(3).includes(p[2]) ||
      p[1] < 2 ||
      p[1] > 176 ||
      p[3] < 2 ||
      p[3] > 176
    )
      return false;
    const [a, n] = primeParts(p[1]),
      [b, m] = primeParts(p[3]);
    return (
      n === m &&
      bases.includes(n) &&
      a >= BigInt(1) &&
      a <= BigInt(4) &&
      b >= BigInt(1) &&
      b <= BigInt(4)
    );
  },
};
const binaryDomain = cartesian(
  nonzero(4),
  range(2, 30),
  nonzero(4),
  range(2, 30),
);

export const RADICAL_DEFINITIONS: readonly ArithmeticV2Definition[] = [
  family({
    id: "m3-radical-simplify",
    grade: "중3",
    strand: "근호",
    title: "근호 안의 제곱인수 꺼내기",
    description:
      "피제곱수 0~200의 제곱근을 간단히 합니다. 제곱근 기호는 음이 아닌 값을 뜻합니다.",
    labels: ["근호", "간단히 하기"],
    rankGroup: "m3-radical",
    domain: cartesian(range(0, 200)),
    prompt: ([n]) => math(`√${n}`, `\\sqrt{${n}}`, "근호를 간단히 하시오."),
    solve: ([n]) => {
      const [outside, inside] = extractSquare(n);
      return surdAnswer(rational(outside), inside);
    },
    check: ([n], answer) => {
      const result = readSurd(answer);
      if (!result) return false;
      const [a, b] = result.value;
      return (
        a >= BigInt(0) && a * a * BigInt(result.radicand) === BigInt(n) * b * b
      );
    },
  }),
  ...(["add", "subtract"] as const).map((operation) =>
    family({
      id: `m3-radical-${operation}`,
      grade: "중3",
      strand: "근호",
      title: `동류 근호의 ${operation === "add" ? "덧셈" : "뺄셈"}`,
      description:
        "근호 안의 제곱인수를 꺼낸 뒤 같은 근호끼리 계산합니다. 결과가 0인 경우도 포함합니다.",
      labels: ["근호", "동류 근호"],
      rankGroup: "m3-radical",
      domain: likeDomain,
      prompt: ([a, n, b, m]) =>
        math(
          `(${rawRadical(a, n)}) ${operation === "add" ? "+" : "-"} (${rawRadical(b, m)})`,
          `\\left(${rawRadical(a, n, true)}\\right) ${operation === "add" ? "+" : "-"} \\left(${rawRadical(b, m, true)}\\right)`,
        ),
      solve: ([a, n, b, m]) => {
        const [s, d] = extractSquare(n),
          [t] = extractSquare(m);
        return surdAnswer(
          rational(
            BigInt(a) * BigInt(s) +
              BigInt(operation === "add" ? b : -b) * BigInt(t),
          ),
          d,
        );
      },
      check: ([a, n, b, m], answer) => {
        const result = readSurd(answer);
        if (!result) return false;
        const [s, d] = primeParts(n),
          [t] = primeParts(m),
          [num, den] = result.value;
        const expected =
          BigInt(a) * s + (operation === "add" ? BigInt(b) : -BigInt(b)) * t;
        return (
          num === expected * den && (num === BigInt(0) || result.radicand === d)
        );
      },
    }),
  ),
  ...(["multiply", "divide"] as const).map((operation) =>
    family({
      id: `m3-radical-${operation}`,
      grade: "중3",
      strand: "근호",
      title: `근호의 ${operation === "multiply" ? "곱셈" : "나눗셈"}`,
      description:
        "정수 계수와 피제곱수 2~30의 근호를 계산합니다. 답의 근호와 분수를 간단히 합니다.",
      labels: ["근호", operation === "multiply" ? "곱셈" : "나눗셈"],
      rankGroup: "m3-radical",
      domain: binaryDomain,
      prompt: ([a, n, b, m]) =>
        math(
          `(${rawRadical(a, n)}) ${operation === "multiply" ? "×" : "÷"} (${rawRadical(b, m)})`,
          `\\left(${rawRadical(a, n, true)}\\right) ${operation === "multiply" ? "\\times" : "\\div"} \\left(${rawRadical(b, m, true)}\\right)`,
        ),
      solve: ([a, n, b, m]) => {
        const [s, d] = extractSquare(n * m);
        return surdAnswer(
          operation === "multiply"
            ? rational(BigInt(a) * BigInt(b) * BigInt(s))
            : rational(BigInt(a) * BigInt(s), BigInt(b) * BigInt(m)),
          d,
        );
      },
      check: ([a, n, b, m], answer) => {
        const result = readSurd(answer);
        if (!result) return false;
        const [num, den] = result.value,
          A = BigInt(a),
          B = BigInt(b),
          N = BigInt(n),
          M = BigInt(m),
          D = BigInt(result.radicand);
        // Equality of squares plus sign gives exact equality of real single-radical terms.
        if (num > BigInt(0) !== a * b > 0 || num === BigInt(0)) return false;
        return operation === "multiply"
          ? num * num * D === A * A * B * B * N * M * den * den
          : num * num * D * B * B * M === A * A * N * den * den;
      },
    }),
  ),
  family({
    id: "m3-radical-rationalize",
    grade: "중3",
    strand: "근호",
    title: "단일 근호 분모의 유리화",
    description:
      "분모가 양의 정수와 하나의 근호의 곱인 분수를 유리화합니다. 이항 분모는 포함하지 않습니다.",
    labels: ["근호", "분모의 유리화"],
    rankGroup: "m3-radical",
    domain: cartesian(nonzero(6), range(1, 6), [2, 3, 5, 6, 7, 10, 11, 13]),
    prompt: ([a, b, n]) =>
      math(
        `${a}/(${rawRadical(b, n)})`,
        `\\frac{${a}}{${rawRadical(b, n, true)}}`,
        "분모를 유리화하시오.",
      ),
    solve: ([a, b, n]) =>
      surdAnswer(rational(BigInt(a), BigInt(b) * BigInt(n)), n),
    check: ([a, b, n], answer) => {
      const result = readSurd(answer);
      if (!result) return false;
      const [num, den] = result.value;
      return (
        result.radicand === n && num * BigInt(b) * BigInt(n) === BigInt(a) * den
      );
    },
  }),
];
