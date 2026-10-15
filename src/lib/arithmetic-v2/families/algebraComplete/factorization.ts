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
  power,
  range,
  sameCoefficients,
  sameDisplay,
  small,
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
];
