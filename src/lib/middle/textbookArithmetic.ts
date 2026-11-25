/**
 * T1 arithmetic expressions: exact safe-integer fractions and precedence-aware
 * notation. Existing generators keep their own arithmetic and seeded output.
 * This module never parses textbook text or decides replacement eligibility.
 */
export type Rational = Readonly<{ n: number; d: number }>;
export type Expr =
  | {
      kind: "value";
      value: Rational;
      notation?: "fraction" | "decimal" | "mixed";
      signed?: boolean;
    }
  | { kind: "add" | "sub" | "mul" | "div"; left: Expr; right: Expr }
  | { kind: "pow"; base: Expr; exponent: number }
  | { kind: "neg"; child: Expr };

// Products are BigInt before reduction: checking only the reduced Number result
// would miss an unsafe intermediate that rounded back to a small integer.
function exact(n: bigint, d: bigint): Rational {
  const zero = BigInt(0);
  if (d === zero) throw new Error("0으로 나눌 수 없습니다");
  if (n === zero) return { n: 0, d: 1 };
  let a = n < zero ? -n : n,
    b = d < zero ? -d : d;
  while (b !== zero) [a, b] = [b, a % b];
  const nn = Number((d < zero ? -n : n) / a);
  const dd = Number((d < zero ? -d : d) / a);
  if (!Number.isSafeInteger(nn) || !Number.isSafeInteger(dd))
    throw new Error("약분한 유리수가 안전한 정수 범위를 벗어났습니다");
  return { n: nn, d: dd };
}

export function q(n: number, d = 1): Rational {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || d === 0)
    throw new Error(
      "유리수는 안전한 정수 분자와 0이 아닌 정수 분모가 필요합니다",
    );
  return exact(BigInt(n), BigInt(d));
}
export function evaluate(e: Expr): Rational {
  if (e.kind === "value") return q(e.value.n, e.value.d);
  if (e.kind === "neg") {
    const v = evaluate(e.child);
    return q(-v.n, v.d);
  }
  if (e.kind === "pow") {
    if (!Number.isInteger(e.exponent) || e.exponent < 1 || e.exponent > 120)
      throw new Error("거듭제곱 지수 범위는 1~120입니다");
    const v = evaluate(e.base);
    return exact(
      BigInt(v.n) ** BigInt(e.exponent),
      BigInt(v.d) ** BigInt(e.exponent),
    );
  }
  const a = evaluate(e.left),
    b = evaluate(e.right);
  const an = BigInt(a.n),
    ad = BigInt(a.d),
    bn = BigInt(b.n),
    bd = BigInt(b.d);
  switch (e.kind) {
    case "add":
      return exact(an * bd + bn * ad, ad * bd);
    case "sub":
      return exact(an * bd - bn * ad, ad * bd);
    case "mul":
      return exact(an * bn, ad * bd);
    case "div":
      return exact(an * bd, ad * bn);
  }
}
export function texQ(value: Rational): string {
  const { n, d } = q(value.n, value.d);
  return d === 1
    ? String(n)
    : `${n < 0 ? "-" : ""}\\dfrac{${Math.abs(n)}}{${d}}`;
}
function valueTex(e: Extract<Expr, { kind: "value" }>): string {
  const v = q(e.value.n, e.value.d);
  let out = texQ(v);
  if (e.notation === "decimal" && v.d !== 1) {
    let scale = 10,
      places = 1;
    while (scale % v.d && places < 3) {
      scale *= 10;
      places++;
    }
    if (scale % v.d) throw new Error("세 자리 유한소수로 쓸 수 없습니다");
    const digits = String(BigInt(Math.abs(v.n)) * BigInt(scale / v.d)).padStart(
      places + 1,
      "0",
    );
    out = `${v.n < 0 ? "-" : ""}${digits.slice(0, -places)}.${digits.slice(-places)}`;
  } else if (e.notation === "mixed" && v.d > 1 && Math.abs(v.n) > v.d) {
    const n = BigInt(Math.abs(v.n)),
      d = BigInt(v.d);
    out = `${v.n < 0 ? "-" : ""}${n / d}\\dfrac{${n % d}}{${d}}`;
  }
  return e.signed ? `\\left(${v.n >= 0 ? "+" : ""}${out}\\right)` : out;
}
const parens = (s: string) => `\\left(${s}\\right)`;
function precedence(e: Expr): number {
  if (e.kind === "add" || e.kind === "sub") return 1;
  if (e.kind === "mul" || e.kind === "div") return 2;
  if (e.kind === "neg") return 3;
  if (e.kind === "pow") return 4;
  return 5;
}
/** Parentheses preserve subtraction/division order and the scope of a minus. */
export function render(e: Expr): string {
  if (e.kind === "value") return valueTex(e);
  if (e.kind === "neg") {
    const s = render(e.child);
    return `-${precedence(e.child) < 4 || s.startsWith("-") ? parens(s) : s}`;
  }
  if (e.kind === "pow") {
    const s = render(e.base);
    const needs =
      e.base.kind !== "value" || e.base.value.n < 0 || e.base.value.d !== 1;
    const alreadyGroupedValue = e.base.kind === "value" && e.base.signed;
    return `${needs && !alreadyGroupedValue ? parens(s) : s}^{${e.exponent}}`;
  }
  const child = (v: Expr, right: boolean) => {
    const s = render(v);
    const bracket =
      precedence(v) < precedence(e) ||
      (right &&
        (e.kind === "sub" || e.kind === "div") &&
        precedence(v) === precedence(e)) ||
      (right && s.startsWith("-")) ||
      (e.kind === "mul" && v.kind === "div" && right);
    return bracket ? parens(s) : s;
  };
  const op = { add: "+", sub: "-", mul: "\\times", div: "\\div" }[e.kind];
  return `${child(e.left, false)}${op}${child(e.right, true)}`;
}
