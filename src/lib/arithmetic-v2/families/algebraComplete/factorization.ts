import type { ArithmeticV2Answer } from "../../types";
import {
  cartesian,
  coefficients,
  convolution,
  define,
  expression,
  filtered,
  gcd,
  linear,
  math,
  nonzero,
  numericAnswer,
  power,
  range,
  rational,
  readNumeric,
  sameCoefficients,
  sameDisplay,
  small,
  tuples,
  type Term,
} from "./shared";

/** Factored polynomial normal form:
 * [content,xPower,yPower,count, ...count*[a,b,c,multiplicity]].
 * It means content*x^xPower*y^yPower*product((ax+by+c)^multiplicity).
 * Primitive linear factors have positive leading coefficient (x before y),
 * strict lexicographic (a,b,c) order; repeated factors combine multiplicities.
 * x and y factors live only in xPower/yPower. The empty product is 1.
 */
type Factor = readonly [number, number, number, number];
type Factored = { content: number; x: number; y: number; factors: Factor[] };
const order = (a: readonly number[], b: readonly number[]) =>
  a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
function normalize(
  content: number,
  x: number,
  y: number,
  raw: readonly (readonly [number, number, number])[],
): Factored {
  const factors: Factor[] = [];
  for (let [a, b, c] of raw) {
    const sign = (a || b) < 0 ? -1 : 1;
    // Pull each factor's integer content and sign into the scalar.
    const g = Number(gcd(gcd(BigInt(a), BigInt(b)), BigInt(c))) * sign;
    content *= g;
    a /= g;
    b /= g;
    c /= g;
    if (a === 1 && b === 0 && c === 0) {
      x++;
      continue;
    }
    if (a === 0 && b === 1 && c === 0) {
      y++;
      continue;
    }
    const i = factors.findIndex((f) => f[0] === a && f[1] === b && f[2] === c);
    if (i < 0) factors.push([a, b, c, 1]);
    else factors[i] = [a, b, c, factors[i][3] + 1];
  }
  factors.sort(order);
  return { content, x, y, factors };
}
function display(f: Factored, latex = false): string {
  const variables = power("x", f.x, latex) + power("y", f.y, latex);
  const suffix =
    variables +
    f.factors
      .map(
        ([a, b, c, m]) =>
          `(${expression(
            [
              [1, 0, a],
              [0, 1, b],
              [0, 0, c],
            ],
            latex,
          )})${m === 1 ? "" : latex ? `^{${m}}` : `^${m}`}`,
      )
      .join("");
  return `${suffix && f.content === 1 ? "" : suffix && f.content === -1 ? "-" : f.content}${suffix}`;
}
function answer(f: Factored): ArithmeticV2Answer {
  return {
    kind: "polynomial",
    exact: [f.content, f.x, f.y, f.factors.length, ...f.factors.flat()].map(
      String,
    ),
    text: display(f),
    latex: display(f, true),
  };
}
function readFactored(a: ArithmeticV2Answer): Factored | null {
  if (a.kind !== "polynomial" || a.exact.length < 4) return null;
  const content = small(a.exact[0], -10000, 10000),
    x = small(a.exact[1], 0, 4),
    y = small(a.exact[2], 0, 4),
    count = small(a.exact[3], 0, 2);
  if (
    content === null ||
    content === 0 ||
    x === null ||
    y === null ||
    count === null ||
    a.exact.length !== 4 + 4 * count
  )
    return null;
  const factors: Factor[] = [];
  for (let i = 4; i < a.exact.length; i += 4) {
    const u = small(a.exact[i], 0, 100),
      v = small(a.exact[i + 1], -100, 100),
      w = small(a.exact[i + 2], -100, 100),
      m = small(a.exact[i + 3], 1, 2);
    if (
      u === null ||
      v === null ||
      w === null ||
      m === null ||
      (!u && v <= 0) ||
      gcd(gcd(BigInt(u), BigInt(v)), BigInt(w)) !== BigInt(1) ||
      (!w && ((u === 1 && !v) || (!u && v === 1)))
    )
      return null;
    const factor: Factor = [u, v, w, m];
    if (factors.length && order(factors[factors.length - 1], factor) >= 0)
      return null;
    factors.push(factor);
  }
  const f = { content, x, y, factors };
  return sameDisplay(a, display(f), display(f, true)) ? f : null;
}
function checkExpansion(
  a: ArithmeticV2Answer,
  terms: readonly Term[],
): boolean {
  const f = readFactored(a);
  if (!f) return false;
  let product = coefficients([[f.x, f.y, f.content]]);
  for (const [u, v, w, m] of f.factors)
    for (let i = 0; i < m; i++)
      product = convolution(
        product,
        coefficients([
          [1, 0, u],
          [0, 1, v],
          [0, 0, w],
        ]),
      );
  return sameCoefficients(product, coefficients(terms));
}
function task(
  id: string,
  title: string,
  domain: ReturnType<typeof cartesian>,
  expanded: (p: number[]) => Term[],
  solve: (p: number[]) => Factored,
  prompt?: (p: number[], latex: boolean) => string,
) {
  return define({
    id: `m3-factor-${id}`,
    grade: "중3",
    strand: "문자식",
    title,
    unit: "다항식의 곱셈과 인수분해",
    domain,
    prompt: (p) =>
      math(
        prompt ? prompt(p, false) : expression(expanded(p)),
        prompt ? prompt(p, true) : expression(expanded(p), true),
        "인수분해하시오.",
      ),
    solve: (p) => answer(solve(p)),
    check: (p, a) => checkExpansion(a, expanded(p)),
  });
}
const primitive = (a: number, b: number) =>
  gcd(BigInt(a), BigInt(b)) === BigInt(1);
const common = task(
  "common",
  "공통인수로 인수분해",
  filtered(
    cartesian(
      [-5, -4, -3, -2, 2, 3, 4, 5],
      range(1, 2),
      range(1, 4),
      nonzero(5),
    ),
    ([, , a, b]) => primitive(a, b),
  ),
  ([g, h, a, b]) => [
    [h + 1, 0, g * a],
    [h, 0, g * b],
  ],
  ([g, h, a, b]) => normalize(g, h, 0, [[a, 0, b]]),
);
const commonXY = task(
  "common-two-variable",
  "두 문자 공통인수로 인수분해",
  filtered(
    cartesian(
      [-3, -2, 2, 3],
      range(1, 2),
      range(1, 2),
      range(1, 3),
      nonzero(3),
    ),
    ([, , , a, b]) => primitive(a, b),
  ),
  ([g, p, q, a, b]) => [
    [p + 1, q, g * a],
    [p, q + 1, g * b],
  ],
  ([g, p, q, a, b]) => normalize(g, p, q, [[a, b, 0]]),
);
function difference(bivariate: boolean) {
  return task(
    bivariate ? "bivariate-difference-squares" : "difference-squares",
    bivariate ? "두 문자 제곱의 차 인수분해" : "제곱의 차 인수분해",
    filtered(cartesian(range(1, 6), range(1, 9)), ([a, b]) => primitive(a, b)),
    ([a, b]) => [[2, 0, a * a], bivariate ? [0, 2, -b * b] : [0, 0, -b * b]],
    ([a, b]) =>
      normalize(
        1,
        0,
        0,
        bivariate
          ? [
              [a, -b, 0],
              [a, b, 0],
            ]
          : [
              [a, 0, -b],
              [a, 0, b],
            ],
      ),
  );
}
function perfect(bivariate: boolean) {
  return task(
    bivariate ? "bivariate-perfect-square" : "perfect-square",
    bivariate ? "두 문자 완전제곱식 인수분해" : "완전제곱식 인수분해",
    filtered(cartesian(range(1, 6), nonzero(8)), ([a, b]) => primitive(a, b)),
    ([a, b]) =>
      bivariate
        ? [
            [2, 0, a * a],
            [1, 1, 2 * a * b],
            [0, 2, b * b],
          ]
        : [
            [2, 0, a * a],
            [1, 0, 2 * a * b],
            [0, 0, b * b],
          ],
    ([a, b]) =>
      normalize(
        1,
        0,
        0,
        bivariate
          ? [
              [a, b, 0],
              [a, b, 0],
            ]
          : [
              [a, 0, b],
              [a, 0, b],
            ],
      ),
  );
}
const monic = task(
  "monic-quadratic",
  "x²의 계수가 1인 이차식 인수분해",
  filtered(cartesian(nonzero(8), nonzero(8)), ([b, d]) => b < d && b + d !== 0),
  ([b, d]) => [
    [2, 0, 1],
    [1, 0, b + d],
    [0, 0, b * d],
  ],
  ([b, d]) =>
    normalize(1, 0, 0, [
      [1, 0, b],
      [1, 0, d],
    ]),
);
const nonmonic = task(
  "nonmonic-quadratic",
  "x²의 계수가 1이 아닌 이차식 인수분해",
  filtered(
    cartesian(range(1, 4), nonzero(6), range(1, 4), nonzero(6)),
    ([a, b, c, d]) =>
      a * c > 1 &&
      primitive(a, b) &&
      primitive(c, d) &&
      order([a, 0, b], [c, 0, d]) < 0 &&
      a * d + b * c !== 0 &&
      a * d !== b * c,
  ),
  ([a, b, c, d]) => [
    [2, 0, a * c],
    [1, 0, a * d + b * c],
    [0, 0, b * d],
  ],
  ([a, b, c, d]) =>
    normalize(1, 0, 0, [
      [a, 0, b],
      [c, 0, d],
    ]),
);
const substitution = task(
  "common-binomial",
  "공통인 식을 이용한 인수분해",
  filtered(
    cartesian(nonzero(4), nonzero(5), nonzero(5)),
    ([, b, d]) => b < d && b + d !== 0,
  ),
  ([h, b, d]) => [
    [2, 0, 1],
    [1, 0, 2 * h + b + d],
    [0, 0, (h + b) * (h + d)],
  ],
  ([h, b, d]) =>
    normalize(1, 0, 0, [
      [1, 0, h + b],
      [1, 0, h + d],
    ]),
  ([h, b, d], latex) =>
    `(${linear(1, h, latex)})${latex ? "^2" : "²"}${b + d < 0 ? "-" : "+"}${Math.abs(b + d) === 1 ? "" : Math.abs(b + d)}(${linear(1, h, latex)})${b * d < 0 ? "-" : "+"}${Math.abs(b * d)}`,
);

// --- numeric uses of the formulas and completing the square (2026-10-16) ---
const ZERO = BigInt(0);
const roundBases = [20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 500, 1000];
// [mode, base, k, m]: 0 = (base+k)², 1 = (base+k)(base−k) with k > 0,
// 2 = (base+k)(base+m) with k < m and k + m ≠ 0 (that case is mode 1).
// A square such as 25² is shown once: as 30−5, not also as 20+5.
const formulaRows: number[][] = [];
for (const base of roundBases)
  for (const k of nonzero(5))
    if (k !== 5 || !roundBases.includes(base + 10))
      formulaRows.push([0, base, k, 0]);
for (const base of roundBases)
  for (const k of range(1, 5)) formulaRows.push([1, base, k, 0]);
for (const base of roundBases)
  for (const k of nonzero(5))
    for (const m of nonzero(5))
      if (k < m && k + m !== 0) formulaRows.push([2, base, k, m]);
const secondOffset = ([mode, , k, m]: number[]) =>
  mode === 0 ? k : mode === 1 ? -k : m;
const formulaNumeric = define({
  id: "m3-formula-numeric",
  grade: "중3",
  strand: "문자식",
  title: "곱셈 공식을 이용한 수의 계산",
  unit: "다항식의 곱셈과 인수분해",
  description:
    "102², 103×97, 98×103과 같이 어림수에 가까운 수의 곱을 곱셈 공식으로 계산합니다.",
  domain: tuples(formulaRows),
  prompt: (p) => {
    const [mode, base, k] = p;
    const left = base + k,
      right = base + secondOffset(p);
    return math(
      mode === 0 ? `${left}²` : `${left} × ${right}`,
      mode === 0 ? `${left}^2` : `${left}\\times${right}`,
      "곱셈 공식을 이용하여 계산하시오.",
    );
  },
  solve: ([mode, base, k, m]) =>
    numericAnswer(
      rational(
        mode === 0
          ? base * base + 2 * base * k + k * k
          : mode === 1
            ? base * base - k * k
            : base * base + (k + m) * base + k * m,
      ),
      "integer",
    ),
  // Direct product of the two displayed factors, not the expanded formula.
  check: (p, a) => {
    const q = readNumeric(a, "integer");
    const [, base, k] = p;
    return Boolean(
      q && q[0] === BigInt(base + k) * BigInt(base + secondOffset(p)),
    );
  },
});
const roundSums = [20, 30, 40, 50, 60, 70, 80, 90, 100];
// [mode, s, k]: 0 = a² − b² with a + b = s and a − b = 2k;
// 1 = a² + 2ab + b² with a + b = s, b = k; 2 = a² − 2ab + b² with a − b = s, b = k.
const factorRows: number[][] = [];
for (const mode of [0, 1, 2])
  for (const s of roundSums)
    for (const k of range(1, 9)) factorRows.push([mode, s, k]);
const factorSides = ([mode, s, k]: number[]): [number, number] =>
  mode === 0 ? [s / 2 + k, s / 2 - k] : mode === 1 ? [s - k, k] : [s + k, k];
const factorNumeric = define({
  id: "m3-factor-numeric",
  grade: "중3",
  strand: "문자식",
  title: "인수분해를 이용한 수의 계산",
  unit: "다항식의 곱셈과 인수분해",
  description:
    "57² − 43², 97² + 2×97×3 + 3²과 같은 식을 인수분해 공식으로 계산합니다. 합이나 차가 어림수가 되도록 두 수를 고릅니다.",
  domain: tuples(factorRows),
  prompt: (p) => {
    const [mode] = p,
      [a, b] = factorSides(p);
    if (mode === 0)
      return math(
        `${a}² - ${b}²`,
        `${a}^2-${b}^2`,
        "인수분해를 이용하여 계산하시오.",
      );
    const sign = mode === 1 ? "+" : "-";
    return math(
      `${a}² ${sign} 2 × ${a} × ${b} + ${b}²`,
      `${a}^2${sign}2\\times${a}\\times${b}+${b}^2`,
      "인수분해를 이용하여 계산하시오.",
    );
  },
  solve: ([mode, s, k]) =>
    numericAnswer(rational(mode === 0 ? s * 2 * k : s * s), "integer"),
  // Evaluate the displayed expression term by term.
  check: (p, answer) => {
    const q = readNumeric(answer, "integer");
    if (!q) return false;
    const [mode] = p,
      [a, b] = factorSides(p).map(BigInt);
    const value =
      mode === 0
        ? a * a - b * b
        : a * a + BigInt(mode === 1 ? 2 : -2) * a * b + b * b;
    return q[0] === value;
  },
});
const squareLeads = [1, 4, 9, 16];
const squareRoot = (a: number) => Math.round(Math.sqrt(a));
const quadraticHead = (a: number, b: number, latex = false) =>
  expression(
    [
      [2, 0, a],
      [1, 0, b],
    ],
    latex,
  );
const perfectSquareConstant = define({
  id: "m3-perfect-square-constant",
  grade: "중3",
  strand: "문자식",
  title: "완전제곱식이 되게 하는 상수항",
  unit: "다항식의 곱셈과 인수분해",
  description:
    "ax² + bx + □가 완전제곱식이 되도록 하는 □를 구합니다. a는 1, 4, 9, 16이고 b가 홀수이면 □는 분수입니다.",
  // [a, b], 4 × 24 = 96.
  domain: cartesian(squareLeads, nonzero(12)),
  prompt: ([a, b]) =>
    math(
      `${quadraticHead(a, b)} + □`,
      `${quadraticHead(a, b, true)} + \\square`,
      "완전제곱식이 되도록 하는 □의 값을 구하시오.",
    ),
  solve: ([a, b]) => numericAnswer(rational(b * b, 4 * a), "rational"),
  // Zero discriminant: b² − 4a□ = 0, cross multiplied.
  check: ([a, b], answer) => {
    const q = readNumeric(answer, "rational");
    return Boolean(q && BigInt(4 * a) * q[0] === BigInt(b * b) * q[1]);
  },
});
const perfectSquareLinear = define({
  id: "m3-perfect-square-linear-coefficient",
  grade: "중3",
  strand: "문자식",
  title: "완전제곱식이 되게 하는 일차항의 계수",
  unit: "다항식의 곱셈과 인수분해",
  description:
    "ax² + □x + c가 완전제곱식이 되도록 하는 양수 □를 구합니다. a와 c는 모두 제곱수입니다.",
  // [a, m] with c = m², 4 × 10 = 40.
  domain: cartesian(squareLeads, range(1, 10)),
  prompt: ([a, m]) =>
    math(
      `${a === 1 ? "" : a}x^2 + □x + ${m * m}`,
      `${a === 1 ? "" : a}x^{2} + \\square x + ${m * m}`,
      "완전제곱식이 되도록 하는 양수 □의 값을 구하시오.",
    ),
  solve: ([a, m]) => numericAnswer(rational(2 * squareRoot(a) * m), "integer"),
  // □² = 4ac with □ > 0.
  check: ([a, m], answer) => {
    const q = readNumeric(answer, "integer");
    return Boolean(q && q[0] > ZERO && q[0] * q[0] === BigInt(4 * a * m * m));
  },
});
export const FACTORIZATION_DEFINITIONS = [
  common,
  commonXY,
  difference(false),
  difference(true),
  perfect(false),
  perfect(true),
  monic,
  nonmonic,
  substitution,
  formulaNumeric,
  factorNumeric,
  perfectSquareConstant,
  perfectSquareLinear,
];
