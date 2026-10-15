import type { ArithmeticV2Answer } from "../../types";
import {
  cartesian,
  define,
  expression,
  filtered,
  fractionText,
  linear,
  math,
  nonzero,
  numericAnswer,
  range,
  rational,
  readNumeric,
  readRational,
  sameDisplay,
  small,
  type Rational,
} from "./shared";

type LinearKind =
  "integer" | "both-sides" | "parentheses" | "fraction" | "decimal";
const decimal = (n: number) =>
  `${n < 0 ? "-" : ""}${Math.floor(Math.abs(n) / 10)}.${Math.abs(n) % 10}`;
const linearDomains = {
  integer: cartesian(nonzero(5), nonzero(6), range(-8, 8)),
  "both-sides": filtered(
    cartesian(nonzero(3), nonzero(4), nonzero(3), nonzero(4)),
    ([a, , c]) => a !== c,
  ),
  parentheses: cartesian(
    [-4, -3, -2, 2, 3, 4],
    nonzero(3),
    range(-3, 3),
    range(-6, 6),
  ),
  fraction: cartesian(nonzero(4), nonzero(4), range(-5, 5), range(2, 5)),
  decimal: cartesian(nonzero(9), nonzero(9), range(-9, 9)),
};
const linearTitles = {
  integer: "정수 계수 일차방정식",
  "both-sides": "양변에 문자가 있는 일차방정식",
  parentheses: "괄호가 있는 일차방정식",
  fraction: "분수 계수 일차방정식",
  decimal: "소수 계수 일차방정식",
};
function equationText(
  kind: LinearKind,
  [a, b, c, d]: number[],
  latex = false,
): string {
  if (kind === "both-sides")
    return `${linear(a, b, latex)}=${linear(c, d, latex)}`;
  if (kind === "parentheses")
    return `${a}(${linear(1, b, latex)})${c < 0 ? "-" : "+"}${Math.abs(c)}=${d}`;
  if (kind === "fraction")
    return latex
      ? `\\frac{${linear(a, b, true)}}{${d}}=${c}`
      : `(${linear(a, b)})/${d}=${c}`;
  if (kind === "decimal")
    return `${decimal(a)}x${b < 0 ? "-" : "+"}${decimal(Math.abs(b))}=${decimal(c)}`;
  return `${linear(a, b, latex)}=${c}`;
}
function equation(kind: LinearKind) {
  return define({
    id: `m1-linear-equation-${kind}`,
    grade: "중1",
    strand: "방정식·부등식",
    title: linearTitles[kind],
    unit: "일차방정식",
    domain: linearDomains[kind],
    prompt: (p) =>
      math(
        equationText(kind, p),
        equationText(kind, p, true),
        "방정식을 풀어 x의 값을 구하시오.",
      ),
    solve: ([a, b, c, d]) =>
      numericAnswer(
        kind === "both-sides"
          ? rational(d - b, a - c)
          : kind === "parentheses"
            ? rational(d - c - a * b, a)
            : kind === "fraction"
              ? rational(c * d - b, a)
              : rational(c - b, a),
        "rational",
      ),
    check: ([a, b, c, d], answer) => {
      const q = readNumeric(answer, "rational");
      if (!q) return false;
      const [n, v] = q;
      const left = BigInt(a) * n + BigInt(b) * v;
      return kind === "both-sides"
        ? left === BigInt(c) * n + BigInt(d) * v
        : kind === "parentheses"
          ? BigInt(a) * (n + BigInt(b) * v) + BigInt(c) * v === BigInt(d) * v
          : kind === "fraction"
            ? left === BigInt(c) * BigInt(d) * v
            : left === BigInt(c) * v;
    },
  });
}
const coefficient = define({
  id: "m1-linear-equation-missing-coefficient",
  grade: "중1",
  strand: "방정식·부등식",
  title: "주어진 해로 일차방정식 계수 구하기",
  unit: "일차방정식",
  domain: cartesian(nonzero(6), nonzero(5), nonzero(6)),
  prompt: ([r, k, b]) =>
    math(
      `kx ${b < 0 ? "-" : "+"} ${Math.abs(b)} = ${k * r + b}, x = ${r}`,
      `kx${b < 0 ? "-" : "+"}${Math.abs(b)}=${k * r + b},\\quad x=${r}`,
      "주어진 x가 방정식의 해일 때 k를 구하시오.",
    ),
  solve: ([, k]) => numericAnswer(rational(k), "rational"),
  check: ([r, k, b], a) => {
    const q = readNumeric(a, "rational");
    return Boolean(
      q && q[0] * BigInt(r) + BigInt(b) * q[1] === BigInt(k * r + b) * q[1],
    );
  },
});
/** Inequality exact=[relation,n,d]. Codes 0:＜,1:≤,2:＞,3:≥. */
const relationText = ["＜", "≤", "＞", "≥"],
  relationLatex = ["\\lt", "\\le", "\\gt", "\\ge"];
function inequalityDisplay(code: number, q: Rational, latex = false) {
  return `x ${latex ? relationLatex[code] : relationText[code]} ${fractionText(q, latex)}`;
}
function inequalityAnswer(code: number, q: Rational): ArithmeticV2Answer {
  return {
    kind: "polynomial",
    exact: [String(code), ...q.map(String)],
    text: inequalityDisplay(code, q),
    latex: inequalityDisplay(code, q, true),
  };
}
type InequalityKind = "integer" | "both-sides" | "parentheses" | "fraction";
function inequality(kind: InequalityKind) {
  const domain =
    kind === "integer"
      ? cartesian(nonzero(4), nonzero(5), range(-5, 5), range(0, 3))
      : kind === "both-sides"
        ? filtered(
            cartesian(
              nonzero(3),
              nonzero(3),
              nonzero(3),
              nonzero(3),
              range(0, 3),
            ),
            ([a, , c]) => a !== c,
          )
        : kind === "parentheses"
          ? cartesian([-3, -2, 2, 3], nonzero(3), range(-4, 4), range(0, 3))
          : cartesian(
              nonzero(3),
              nonzero(3),
              range(-3, 3),
              range(2, 4),
              range(0, 3),
            );
  // Shared authored equation coefficients; the checker evaluates the original
  // inequality at the candidate endpoint and at both adjacent rational points.
  function sides(p: number[]): [number, number, number, number, number] {
    const [a, b, c, d, e] = p;
    return kind === "both-sides"
      ? [a, b, c, d, e]
      : kind === "parentheses"
        ? [a, a * b, 0, c, d]
        : kind === "fraction"
          ? [a, b, 0, c * d, e]
          : [a, b, 0, c, d];
  }
  function promptText(p: number[], latex = false) {
    const [a, b, c, d, e] = p,
      code = kind === "both-sides" || kind === "fraction" ? e : d,
      sign = (latex ? relationLatex : relationText)[code];
    return kind === "both-sides"
      ? `${linear(a, b, latex)} ${sign} ${linear(c, d, latex)}`
      : kind === "parentheses"
        ? `${a}(${linear(1, b, latex)}) ${sign} ${c}`
        : kind === "fraction"
          ? `${latex ? `\\frac{${linear(a, b, true)}}{${d}}` : `(${linear(a, b)})/${d}`} ${sign} ${c}`
          : `${linear(a, b, latex)} ${sign} ${c}`;
  }
  return define({
    id: `m2-linear-inequality-${kind}`,
    grade: "중2",
    strand: "방정식·부등식",
    title:
      kind === "integer"
        ? "정수 계수 일차부등식"
        : kind === "both-sides"
          ? "양변에 문자가 있는 일차부등식"
          : kind === "parentheses"
            ? "괄호가 있는 일차부등식"
            : "분수 계수 일차부등식",
    unit: "일차부등식",
    domain,
    prompt: (p) =>
      math(
        promptText(p),
        promptText(p, true),
        "부등식을 풀어 x의 범위를 구하시오.",
      ),
    solve: (p) => {
      const [a, b, c, d, code] = sides(p);
      return inequalityAnswer(
        a - c < 0 ? code ^ 2 : code,
        rational(d - b, a - c),
      );
    },
    check: (p, answer) => {
      if (answer.kind !== "polynomial" || answer.exact.length !== 3)
        return false;
      const code = small(answer.exact[0], 0, 3),
        q = readRational(answer.exact[1], answer.exact[2]);
      if (
        code === null ||
        !q ||
        !sameDisplay(
          answer,
          inequalityDisplay(code, q),
          inequalityDisplay(code, q, true),
        )
      )
        return false;
      const [a, b, c, d, given] = sides(p);
      if (BigInt(a - c) * q[0] + BigInt(b - d) * q[1] !== BigInt(0))
        return false;
      const holds = (v: bigint, relation: number) =>
        relation === 0
          ? v < BigInt(0)
          : relation === 1
            ? v <= BigInt(0)
            : relation === 2
              ? v > BigInt(0)
              : v >= BigInt(0);
      return [-1, 0, 1].every(
        (offset) =>
          holds(
            BigInt(a - c) * (q[0] + BigInt(offset) * q[1]) +
              BigInt(b - d) * q[1],
            given,
          ) === holds(BigInt(offset), code),
      );
    },
  });
}
/** Ordered system solution [x numerator,x denominator,y numerator,y denominator]. */
function systemDisplay(x: Rational, y: Rational, latex = false) {
  return `x=${fractionText(x, latex)},${latex ? "\\quad " : " "}y=${fractionText(y, latex)}`;
}
function systemAnswer(x: Rational, y: Rational): ArithmeticV2Answer {
  return {
    kind: "polynomial",
    exact: [...x.map(String), ...y.map(String)],
    text: systemDisplay(x, y),
    latex: systemDisplay(x, y, true),
  };
}
function readSystem(a: ArithmeticV2Answer): [Rational, Rational] | null {
  if (a.kind !== "polynomial" || a.exact.length !== 4) return null;
  const x = readRational(a.exact[0], a.exact[1]),
    y = readRational(a.exact[2], a.exact[3]);
  return x &&
    y &&
    sameDisplay(a, systemDisplay(x, y), systemDisplay(x, y, true))
    ? [x, y]
    : null;
}
const equationXY = (a: number, b: number, c: number) =>
  `${expression([
    [1, 0, a],
    [0, 1, b],
  ])}=${c}`;
function eliminationFamily(style: "elimination" | "fraction" | "decimal") {
  const leftScale = style === "fraction" ? 2 : style === "decimal" ? 10 : 1,
    rightScale = style === "fraction" ? 3 : style === "decimal" ? 10 : 1;
  const row = (
    a: number,
    b: number,
    c: number,
    scale: number,
    latex = false,
  ) =>
    style === "fraction"
      ? `${
          latex
            ? `\\frac{${expression(
                [
                  [1, 0, a],
                  [0, 1, b],
                ],
                true,
              )}}{${scale}}`
            : `(${expression([
                [1, 0, a],
                [0, 1, b],
              ])})/${scale}`
        }=${c}`
      : style === "decimal"
        ? `${decimal(a)}x${b < 0 ? "-" : "+"}${decimal(Math.abs(b))}y=${c}`
        : equationXY(a, b, c);
  return define({
    id: `m2-simultaneous-equations-${style}`,
    grade: "중2",
    strand: "방정식·부등식",
    title:
      style === "fraction"
        ? "분수 계수 연립일차방정식"
        : style === "decimal"
          ? "소수 계수 연립일차방정식"
          : "연립일차방정식 가감법",
    unit: "연립일차방정식",
    domain: filtered(
      cartesian(
        nonzero(2),
        nonzero(2),
        nonzero(2),
        nonzero(2),
        range(-3, 3),
        range(-3, 3),
      ),
      ([a, b, c, d]) => a * d !== b * c,
    ),
    prompt: ([a, b, c, d, e, f]) =>
      math(
        `${row(a, b, e, leftScale)}, ${row(c, d, f, rightScale)}`,
        `\\begin{cases}${row(a, b, e, leftScale, true)}\\\\${row(c, d, f, rightScale, true)}\\end{cases}`,
        "연립방정식을 풀어 x, y의 값을 구하시오.",
      ),
    solve: ([a, b, c, d, e, f]) =>
      systemAnswer(
        rational(leftScale * e * d - b * rightScale * f, a * d - b * c),
        rational(a * rightScale * f - leftScale * e * c, a * d - b * c),
      ),
    check: ([a, b, c, d, e, f], answer) => {
      const q = readSystem(answer);
      if (!q) return false;
      const [[xn, xd], [yn, yd]] = q;
      return [
        [a, b, e, leftScale],
        [c, d, f, rightScale],
      ].every(
        ([u, v, w, s]) =>
          BigInt(u) * xn * yd + BigInt(v) * yn * xd ===
          BigInt(w) * BigInt(s) * xd * yd,
      );
    },
  });
}
const integerBound = define({
  id: "m2-inequality-integer-bound",
  grade: "중2",
  strand: "방정식·부등식",
  title: "일차부등식의 정수 해 경계",
  unit: "일차부등식",
  domain: cartesian(nonzero(4), nonzero(5), range(-6, 6), range(0, 3)),
  prompt: ([a, b, c, code]) =>
    math(
      `${linear(a, b)} ${relationText[code]} ${c}`,
      `${linear(a, b, true)} ${relationLatex[code]} ${c}`,
      `정수인 해 중에서 가장 ${(a < 0 ? code ^ 2 : code) < 2 ? "큰" : "작은"} 값을 구하시오.`,
    ),
  solve: ([a, b, c, code]) => {
    const [n, d] = rational(c - b, a),
      floor = n / d - (n < 0 && n % d !== BigInt(0) ? BigInt(1) : BigInt(0)),
      ceil = floor + (n % d !== BigInt(0) ? BigInt(1) : BigInt(0)),
      direction = a < 0 ? code ^ 2 : code;
    return numericAnswer(
      rational(
        direction === 0
          ? ceil - BigInt(1)
          : direction === 1
            ? floor
            : direction === 2
              ? floor + BigInt(1)
              : ceil,
      ),
      "integer",
    );
  },
  check: ([a, b, c, code], answer) => {
    const q = readNumeric(answer, "integer");
    if (!q) return false;
    const holds = (x: bigint) => {
      const difference = BigInt(a) * x + BigInt(b - c);
      return code === 0
        ? difference < BigInt(0)
        : code === 1
          ? difference <= BigInt(0)
          : code === 2
            ? difference > BigInt(0)
            : difference >= BigInt(0);
    };
    const upward = (a < 0 ? code ^ 2 : code) < 2;
    return holds(q[0]) && !holds(q[0] + (upward ? BigInt(1) : BigInt(-1)));
  },
});
const substitutionSystem = define({
  id: "m2-simultaneous-equations-substitution",
  grade: "중2",
  strand: "방정식·부등식",
  title: "연립일차방정식 대입법",
  unit: "연립일차방정식",
  domain: filtered(
    cartesian(nonzero(4), nonzero(4), nonzero(4), range(-8, 8)),
    ([a, , c]) => a + c !== 0,
  ),
  prompt: ([a, b, c, d]) =>
    math(
      `y=${linear(a, b)}, ${equationXY(c, 1, d)}`,
      `\\begin{cases}y=${linear(a, b, true)}\\\\${equationXY(c, 1, d)}\\end{cases}`,
      "연립방정식을 풀어 x, y의 값을 구하시오.",
    ),
  solve: ([a, b, c, d]) =>
    systemAnswer(rational(d - b, a + c), rational(a * d + b * c, a + c)),
  check: ([a, b, c, d], answer) => {
    const q = readSystem(answer);
    if (!q) return false;
    const [[xn, xd], [yn, yd]] = q;
    return (
      yn * xd === BigInt(a) * xn * yd + BigInt(b) * xd * yd &&
      BigInt(c) * xn * yd + yn * xd === BigInt(d) * xd * yd
    );
  },
});
const systemCoefficient = define({
  id: "m2-system-missing-coefficient",
  grade: "중2",
  strand: "방정식·부등식",
  title: "연립방정식의 해로 계수 구하기",
  unit: "연립일차방정식",
  domain: filtered(
    cartesian(nonzero(4), nonzero(3), nonzero(3), range(-3, 3)),
    ([k, b]) => k !== b,
  ),
  prompt: ([k, b, x, y]) =>
    math(
      `kx ${b < 0 ? "-" : "+"} ${Math.abs(b)}y=${k * x + b * y}, x+y=${x + y}; x=${x}, y=${y}`,
      `\\begin{cases}kx${b < 0 ? "-" : "+"}${Math.abs(b)}y=${k * x + b * y}\\\\x+y=${x + y}\\end{cases}\\quad x=${x},\\ y=${y}`,
      "주어진 x, y가 연립방정식의 해일 때 k를 구하시오.",
    ),
  solve: ([k]) => numericAnswer(rational(k), "rational"),
  check: ([k, b, x, y], answer) => {
    const q = readNumeric(answer, "rational");
    return Boolean(
      q &&
      q[0] * BigInt(x) + BigInt(b * y) * q[1] === BigInt(k * x + b * y) * q[1],
    );
  },
});
export const LINEAR_DEFINITIONS = [
  ...(
    ["integer", "both-sides", "parentheses", "fraction", "decimal"] as const
  ).map(equation),
  coefficient,
  ...(["integer", "both-sides", "parentheses", "fraction"] as const).map(
    inequality,
  ),
  integerBound,
  ...(["elimination", "fraction", "decimal"] as const).map(eliminationFamily),
  substitutionSystem,
  systemCoefficient,
];
