/** Exact, bounded printed-expression arithmetic. No eval, generator facts or fitting at sample points. */
export interface Fraction {
  n: number;
  d: number;
}
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
export function fraction(n: number, d = 1): Fraction {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || !d)
    throw new Error("Unsupported exact arithmetic");
  const g = gcd(Math.abs(n), Math.abs(d));
  return { n: (n / g) * Math.sign(d), d: Math.abs(d) / g };
}
export const add = (a: Fraction, b: Fraction) =>
  fraction(a.n * b.d + b.n * a.d, a.d * b.d);
export const neg = (a: Fraction) => fraction(-a.n, a.d);
export const sub = (a: Fraction, b: Fraction) => add(a, neg(b));
export const mul = (a: Fraction, b: Fraction) => fraction(a.n * b.n, a.d * b.d);
export const div = (a: Fraction, b: Fraction) => fraction(a.n * b.d, a.d * b.n);
export const same = (a: Fraction, b: Fraction) => a.n === b.n && a.d === b.d;
export const positive = (a: Fraction) => a.n > 0;
export const tex = (a: Fraction) =>
  a.d === 1
    ? `${a.n}`
    : `${a.n < 0 ? "-" : ""}\\frac{${Math.abs(a.n)}}{${a.d}}`;
export type Polynomial = Fraction[];
const zero = () => fraction(0);
const trim = (p: Polynomial): Polynomial => {
  while (p.length > 1 && p.at(-1)!.n === 0) p.pop();
  return p;
};
export const coefficient = (p: Polynomial, degree: number) =>
  p[degree] ?? zero();
export const degree = (p: Polynomial) => trim([...p]).length - 1;
export const polynomialAdd = (p: Polynomial, q: Polynomial): Polynomial =>
  trim(
    Array.from({ length: Math.max(p.length, q.length) }, (_, i) =>
      add(coefficient(p, i), coefficient(q, i)),
    ),
  );
export const polynomialNeg = (p: Polynomial) => p.map(neg);
export const polynomialSub = (p: Polynomial, q: Polynomial) =>
  polynomialAdd(p, polynomialNeg(q));
export function polynomialMul(p: Polynomial, q: Polynomial): Polynomial {
  if (p.length + q.length > 10)
    throw new Error("Printed polynomial degree exceeds bound");
  const out = Array.from({ length: p.length + q.length - 1 }, zero);
  p.forEach((a, i) =>
    q.forEach((b, j) => {
      out[i + j] = add(out[i + j]!, mul(a, b));
    }),
  );
  return trim(out);
}
export const polynomialSame = (p: Polynomial, q: Polynomial) =>
  polynomialSub(p, q).every((c) => c.n === 0);
export const valueAt = (p: Polynomial, x: Fraction): Fraction =>
  p.reduceRight((v, c) => add(mul(v, x), c), zero());
export function polynomialTex(p: Polynomial, variable = "x"): string {
  return (
    [...p]
      .map((a, i) => ({ a, i }))
      .reverse()
      .filter(({ a }) => a.n)
      .map(({ a, i }, j) => {
        const abs = fraction(Math.abs(a.n), a.d);
        return `${a.n < 0 ? "-" : j ? "+" : ""}${i && same(abs, fraction(1)) ? "" : tex(abs)}${i ? variable : ""}${i > 1 ? `^{${i}}` : ""}`;
      })
      .join("") || "0"
  );
}
interface RationalExpression {
  numerator: Polynomial;
  denominator: Polynomial;
  exclusions: Polynomial[];
}
const constant = (v: Fraction): RationalExpression => ({
  numerator: [v],
  denominator: [fraction(1)],
  exclusions: [],
});
export const variable = (): RationalExpression => ({
  numerator: [zero(), fraction(1)],
  denominator: [fraction(1)],
  exclusions: [],
});
const combine = (
  a: RationalExpression,
  b: RationalExpression,
  op: string,
): RationalExpression => {
  if (op === "+" || op === "-")
    return {
      numerator: polynomialAdd(
        polynomialMul(a.numerator, b.denominator),
        (op === "-" ? polynomialNeg : (p: Polynomial) => p)(
          polynomialMul(b.numerator, a.denominator),
        ),
      ),
      denominator: polynomialMul(a.denominator, b.denominator),
      exclusions: [...a.exclusions, ...b.exclusions],
    };
  return {
    numerator: polynomialMul(
      a.numerator,
      op === "/" ? b.denominator : b.numerator,
    ),
    denominator: polynomialMul(
      a.denominator,
      op === "/" ? b.numerator : b.denominator,
    ),
    exclusions: [
      ...a.exclusions,
      ...b.exclusions,
      ...(op === "/" ? [b.numerator] : []),
    ],
  };
};
/** Translate nested TeX fractions into a small grammar, preserving every denominator restriction. */
function plain(text: string): string {
  let s = text
    .replace(/\$|\s|\\left|\\right/g, "")
    .replace(/\\(?:times|cdot)/g, "*");
  function group(at: number): [string, number] {
    if (s[at] !== "{") throw new Error("Malformed fraction group");
    let depth = 1,
      end = at + 1;
    for (; end < s.length && depth; end++) {
      if (s[end] === "{") depth++;
      if (s[end] === "}") depth--;
    }
    if (depth) throw new Error("Unclosed fraction");
    return [s.slice(at + 1, end - 1), end];
  }
  for (let rounds = 0; /\\(?:dfrac|frac)/.test(s); rounds++) {
    if (rounds > 30) throw new Error("Expression too large");
    const m = /\\(?:dfrac|frac)/.exec(s)!;
    const [top, next] = group(m.index + m[0].length),
      [bottom, end] = group(next);
    s = s.slice(0, m.index) + `((${top})/(${bottom}))` + s.slice(end);
  }
  return s
    .replace(/\^\{([0-4])\}/g, "^$1")
    .replace(/([0-9a-z)])(?=[a-z(])/g, "$1*");
}
export function expression(
  text: string,
  vars: Readonly<Record<string, RationalExpression>> = { x: variable() },
): RationalExpression {
  const s = plain(text);
  if (s.length > 600) throw new Error("Expression too large");
  let at = 0;
  function atom(): RationalExpression {
    if (s[at] === "+") {
      at++;
      return atom();
    }
    if (s[at] === "-") {
      at++;
      return combine(constant(fraction(-1)), atom(), "*");
    }
    let out: RationalExpression;
    if (s[at] === "(") {
      at++;
      out = sum();
      if (s[at++] !== ")") throw new Error("Unclosed expression");
    } else {
      const n = /^\d+(?:\.\d+)?/.exec(s.slice(at));
      if (n) {
        at += n[0].length;
        const d = 10 ** (n[0].split(".")[1]?.length ?? 0);
        out = constant(fraction(Number(n[0]) * d, d));
      } else {
        const v = s[at++];
        if (!v || !Object.hasOwn(vars, v))
          throw new Error("Unsupported printed variable");
        out = vars[v]!;
      }
    }
    if (s[at] === "^") {
      at++;
      const p = Number(s[at++]);
      if (!Number.isInteger(p) || p < 0 || p > 4)
        throw new Error("Unsupported power");
      const base = out;
      out = constant(fraction(1));
      for (let j = 0; j < p; j++) out = combine(out, base, "*");
    }
    return out;
  }
  function product(): RationalExpression {
    let p = atom();
    while (s[at] === "*" || s[at] === "/") {
      const op = s[at++]!;
      p = combine(p, atom(), op);
    }
    return p;
  }
  function sum(): RationalExpression {
    let p = product();
    while (s[at] === "+" || s[at] === "-") {
      const op = s[at++]!;
      p = combine(p, product(), op);
    }
    return p;
  }
  const out = sum();
  if (at !== s.length) throw new Error("Unsupported printed expression");
  return out;
}
export function polynomial(text: string, varName = "x"): Polynomial {
  const r = expression(text, { [varName]: variable() });
  if (
    degree(r.denominator) !== 0 ||
    r.denominator[0]!.n === 0 ||
    r.exclusions.some((p) => degree(p) > 0 || p[0]!.n === 0)
  )
    throw new Error("Not a polynomial");
  return trim(r.numerator.map((c) => div(c, r.denominator[0]!)));
}
export function scalar(text: string): Fraction {
  const p = polynomial(text);
  if (degree(p) !== 0) throw new Error("Expected a constant");
  return p[0]!;
}
export function equation(text: string, varName = "x"): Polynomial {
  const sides = text.split("=");
  if (sides.length !== 2) throw new Error("Expected one equality");
  return polynomialSub(
    polynomial(sides[0]!, varName),
    polynomial(sides[1]!, varName),
  );
}
export function rationalSame(
  a: RationalExpression,
  b: RationalExpression,
): boolean {
  return polynomialSame(
    polynomialMul(a.numerator, b.denominator),
    polynomialMul(b.numerator, a.denominator),
  );
}
const hasRealZero = (p: Polynomial): boolean => {
  const d = degree(p);
  if (d === 0) return p[0]!.n === 0;
  if (d === 1) return true;
  if (d === 2)
    return (
      sub(
        mul(coefficient(p, 1), coefficient(p, 1)),
        mul(fraction(4), mul(coefficient(p, 0), coefficient(p, 2))),
      ).n >= 0
    );
  throw new Error("Unreviewed denominator degree");
};
export const everywhereDefined = (r: RationalExpression) =>
  ![r.denominator, ...r.exclusions].some(hasRealZero);
export function rationalAt(
  r: RationalExpression,
  x: Fraction,
): Fraction | undefined {
  if ([r.denominator, ...r.exclusions].some((p) => valueAt(p, x).n === 0))
    return undefined;
  return div(valueAt(r.numerator, x), valueAt(r.denominator, x));
}
export const substitute = (n: number): RationalExpression =>
  combine(constant(fraction(n)), variable(), "*");
