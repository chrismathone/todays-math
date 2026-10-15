import type { ArithmeticV2Answer } from "../../types";
import {
  cartesian,
  define,
  expression,
  filtered,
  fractionText,
  gcd,
  linear,
  math,
  nonzero,
  numericAnswer,
  range,
  rational,
  readNumeric,
  sameDisplay,
  small,
} from "./shared";

/** Full real root set: [count,...count*[p,q,r,s]], root=(p+q*sqrt(r))/s.
 * Rational roots use q=r=0, gcd(p,s)=1; irrational roots have squarefree r>1,
 * q!=0, gcd(p,q,s)=1; always s>0. Distinct roots ascend, double root appears once.
 * Irrational quadratic roots must be the ordered conjugate pair, never one root.
 */
type Root = readonly [number, number, number, number];
function canonical(p: number, q: number, r: number, s: number): Root {
  if (!q || r === 1) {
    p += q;
    q = 0;
    r = 0;
  }
  const g = Number(gcd(gcd(BigInt(p), BigInt(q)), BigInt(s)));
  return [p / g, q / g, r, s / g];
}
function rootText([p, q, r, s]: Root, latex = false): string {
  if (!q) return fractionText(rational(p, s), latex);
  const radical = `${Math.abs(q) === 1 ? "" : Math.abs(q)}${latex ? `\\sqrt{${r}}` : `√${r}`}`;
  const numerator = p
    ? `${p}${q < 0 ? " - " : " + "}${radical}`
    : `${q < 0 ? "-" : ""}${radical}`;
  return s === 1
    ? numerator
    : latex
      ? `\\frac{${numerator}}{${s}}`
      : `(${numerator})/${s}`;
}
function rootDisplay(roots: readonly Root[], latex = false) {
  return `x=${roots.map((r) => rootText(r, latex)).join(latex ? ",\\quad " : " 또는 ")}`;
}
function rootsAnswer(roots: Root[]): ArithmeticV2Answer {
  return {
    kind: "surd",
    exact: [String(roots.length), ...roots.flatMap((r) => r.map(String))],
    text: rootDisplay(roots),
    latex: rootDisplay(roots, true),
  };
}
function solve(a: number, b: number, c: number): Root[] {
  let radicand = b * b - 4 * a * c,
    outside = 1;
  if (!radicand) return [canonical(-b, 0, 0, 2 * a)];
  for (let factor = 2; factor * factor <= radicand; factor++)
    while (radicand % (factor * factor) === 0) {
      radicand /= factor * factor;
      outside *= factor;
    }
  return [
    canonical(-b, -outside, radicand, 2 * a),
    canonical(-b, outside, radicand, 2 * a),
  ];
}
function readRoots(answer: ArithmeticV2Answer): Root[] | null {
  if (answer.kind !== "surd") return null;
  const count = small(answer.exact[0], 1, 2);
  if (count === null || answer.exact.length !== 1 + 4 * count) return null;
  const roots: Root[] = [];
  for (let i = 1; i < answer.exact.length; i += 4) {
    const p = small(answer.exact[i], -100000, 100000),
      q = small(answer.exact[i + 1], -100000, 100000),
      r = small(answer.exact[i + 2], 0, 1000),
      s = small(answer.exact[i + 3], 1, 100000);
    if (
      p === null ||
      q === null ||
      r === null ||
      s === null ||
      gcd(gcd(BigInt(p), BigInt(q)), BigInt(s)) !== BigInt(1) ||
      (!q ? r !== 0 : r <= 1)
    )
      return null;
    for (let f = 2; f * f <= r; f++) if (r % (f * f) === 0) return null;
    roots.push([p, q, r, s]);
  }
  if (roots.length === 2) {
    const [[p, q, r, s], [u, v, w, t]] = roots;
    if (!q && !v) {
      if (BigInt(p) * BigInt(t) >= BigInt(u) * BigInt(s)) return null;
    } else if (
      q >= 0 ||
      v <= 0 ||
      r !== w ||
      BigInt(p) * BigInt(t) !== BigInt(u) * BigInt(s) ||
      BigInt(q) * BigInt(t) !== -BigInt(v) * BigInt(s)
    )
      return null;
  }
  return sameDisplay(answer, rootDisplay(roots), rootDisplay(roots, true))
    ? roots
    : null;
}
/** Inverse checks in Z[sqrt(r)] and the degree-two completeness identities.
 * Does not call solve, extract square factors, or generate expected answers. */
function checkRoots(
  a: number,
  b: number,
  c: number,
  answer: ArithmeticV2Answer,
): boolean {
  const roots = readRoots(answer);
  if (!roots) return false;
  const A = BigInt(a),
    B = BigInt(b),
    C = BigInt(c);
  for (const [pn, qn, rn, sn] of roots) {
    const p = BigInt(pn),
      q = BigInt(qn),
      r = BigInt(rn),
      s = BigInt(sn);
    if (
      A * (p * p + q * q * r) + B * p * s + C * s * s !== BigInt(0) ||
      q * (BigInt(2) * A * p + B * s) !== BigInt(0)
    )
      return false;
  }
  if (roots.length === 1) {
    const [p, q, , s] = roots[0];
    return q === 0 && BigInt(2) * A * BigInt(p) + B * BigInt(s) === BigInt(0);
  }
  const [p, q, r, s] = roots[0].map(BigInt),
    [u, v, , t] = roots[1].map(BigInt);
  return (
    A * (p * t + u * s) + B * s * t === BigInt(0) &&
    q * t + v * s === BigInt(0) &&
    A * (p * u + q * v * r) === C * s * t &&
    p * v + u * q === BigInt(0)
  );
}
const poly = (a: number, b: number, c: number, latex = false) =>
  expression(
    [
      [2, 0, a],
      [1, 0, b],
      [0, 0, c],
    ],
    latex,
  );
const factoring = define({
  id: "m3-quadratic-equation-factoring",
  grade: "중3",
  strand: "방정식·부등식",
  title: "인수분해로 이차방정식 풀기",
  unit: "이차방정식",
  domain: filtered(cartesian(range(-8, 8), range(-8, 8)), ([r, s]) => r <= s),
  prompt: ([r, s]) =>
    math(
      `${poly(1, -r - s, r * s)}=0`,
      `${poly(1, -r - s, r * s, true)}=0`,
      "이차방정식의 모든 실근을 구하시오.",
    ),
  solve: ([r, s]) =>
    rootsAnswer(
      r === s
        ? [[r, 0, 0, 1]]
        : [
            [r, 0, 0, 1],
            [s, 0, 0, 1],
          ],
    ),
  check: ([r, s], a) => checkRoots(1, -r - s, r * s, a),
});
const nonmonicFactoring = define({
  id: "m3-quadratic-equation-nonmonic-factoring",
  grade: "중3",
  strand: "방정식·부등식",
  title: "분수인 근을 갖는 이차방정식 인수분해",
  unit: "이차방정식",
  domain: filtered(
    cartesian(range(1, 4), nonzero(5), range(1, 4), nonzero(5)),
    ([a, b, c, d]) =>
      a * c > 1 &&
      gcd(BigInt(a), BigInt(b)) === BigInt(1) &&
      gcd(BigInt(c), BigInt(d)) === BigInt(1) &&
      (a < c || (a === c && b <= d)),
  ),
  prompt: ([a, b, c, d]) =>
    math(
      `${poly(a * c, a * d + b * c, b * d)}=0`,
      `${poly(a * c, a * d + b * c, b * d, true)}=0`,
      "인수분해하여 이차방정식의 모든 실근을 구하시오.",
    ),
  solve: ([a, b, c, d]) => {
    const first = canonical(-b, 0, 0, a),
      second = canonical(-d, 0, 0, c);
    const comparison =
      BigInt(first[0]) * BigInt(second[3]) -
      BigInt(second[0]) * BigInt(first[3]);
    return rootsAnswer(
      comparison === BigInt(0)
        ? [first]
        : comparison < BigInt(0)
          ? [first, second]
          : [second, first],
    );
  },
  check: ([a, b, c, d], answer) =>
    checkRoots(a * c, a * d + b * c, b * d, answer),
});
const squareRoot = define({
  id: "m3-quadratic-equation-square-root",
  grade: "중3",
  strand: "방정식·부등식",
  title: "제곱근을 이용한 이차방정식",
  unit: "이차방정식",
  domain: cartesian(range(1, 5), range(0, 60)),
  prompt: ([a, n]) =>
    math(
      `${a === 1 ? "" : a}x²=${n}`,
      `${a === 1 ? "" : a}x^2=${n}`,
      "이차방정식의 모든 실근을 구하시오.",
    ),
  solve: ([a, n]) => rootsAnswer(solve(a, 0, -n)),
  check: ([a, n], answer) => checkRoots(a, 0, -n, answer),
});
const perfectSquare = define({
  id: "m3-quadratic-equation-perfect-square",
  grade: "중3",
  strand: "방정식·부등식",
  title: "완전제곱 꼴 이차방정식",
  unit: "이차방정식",
  domain: cartesian(range(1, 3), nonzero(5), range(0, 30)),
  prompt: ([a, b, n]) =>
    math(
      `(${linear(a, b)})²=${n}`,
      `(${linear(a, b, true)})^2=${n}`,
      "이차방정식의 모든 실근을 구하시오.",
    ),
  solve: ([a, b, n]) => rootsAnswer(solve(a * a, 2 * a * b, b * b - n)),
  check: ([a, b, n], answer) => checkRoots(a * a, 2 * a * b, b * b - n, answer),
});
const formula = define({
  id: "m3-quadratic-equation-formula",
  grade: "중3",
  strand: "방정식·부등식",
  title: "근의 공식으로 이차방정식 풀기",
  unit: "이차방정식",
  // Nonzero linear/constant terms. Exclude square discriminants: rational-root
  // factoring is already covered, while this family owns exact irrational roots.
  domain: filtered(
    cartesian(range(1, 5), nonzero(10), nonzero(10)),
    ([a, b, c]) => {
      const d = b * b - 4 * a * c;
      if (d <= 0) return false;
      for (let k = 1; k * k <= d; k++) if (k * k === d) return false;
      return true;
    },
  ),
  prompt: ([a, b, c]) =>
    math(
      `${poly(a, b, c)}=0`,
      `${poly(a, b, c, true)}=0`,
      "근의 공식을 이용하여 모든 실근을 구하시오.",
    ),
  solve: ([a, b, c]) => rootsAnswer(solve(a, b, c)),
  check: ([a, b, c], answer) => checkRoots(a, b, c, answer),
});
const missing = define({
  id: "m3-quadratic-missing-coefficient",
  grade: "중3",
  strand: "방정식·부등식",
  title: "주어진 근으로 이차방정식 계수 구하기",
  unit: "이차방정식",
  domain: cartesian(range(1, 5), nonzero(6), nonzero(6)),
  prompt: ([a, k, r]) =>
    math(
      `${a === 1 ? "" : a}x²+kx${-a * r * r - k * r < 0 ? "-" : "+"}${Math.abs(-a * r * r - k * r)}=0, x=${r}`,
      `${a === 1 ? "" : a}x^2+kx${-a * r * r - k * r < 0 ? "-" : "+"}${Math.abs(-a * r * r - k * r)}=0,\\quad x=${r}`,
      "주어진 x가 이차방정식의 근일 때 k를 구하시오.",
    ),
  solve: ([, k]) => numericAnswer(rational(k), "rational"),
  check: ([a, k, r], answer) => {
    const q = readNumeric(answer, "rational");
    return Boolean(
      q &&
      BigInt(a * r * r) * q[1] +
        q[0] * BigInt(r) +
        BigInt(-a * r * r - k * r) * q[1] ===
        BigInt(0),
    );
  },
});
export const QUADRATIC_DEFINITIONS = [
  factoring,
  nonmonicFactoring,
  squareRoot,
  perfectSquare,
  formula,
  missing,
];
