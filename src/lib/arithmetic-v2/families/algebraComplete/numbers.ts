import type { ArithmeticV2Answer } from "../../types";
import {
  cartesian,
  define,
  filtered,
  fractionText,
  gcd,
  integer,
  math,
  nonzero,
  numericAnswer,
  range,
  rational,
  readNumeric,
  sameDisplay,
  small,
  tuples,
} from "./shared";

function factor(n: number): [number, number][] {
  const output: [number, number][] = [];
  for (let p = 2; p <= n; p++) {
    let exponent = 0;
    while (n % p === 0) {
      exponent++;
      n /= p;
    }
    if (exponent) output.push([p, exponent]);
  }
  return output;
}
const factorText = (pairs: readonly (readonly number[])[], latex = false) =>
  pairs
    .map(([p, e]) =>
      e === 1 ? String(p) : latex ? `${p}^{${e}}` : `${p}^${e}`,
    )
    .join(latex ? " \\times " : " × ") || "1";
function primeAnswer(n: number): ArithmeticV2Answer {
  const pairs = factor(n);
  return {
    kind: "polynomial",
    exact: pairs.flatMap((p) => p.map(String)),
    text: factorText(pairs),
    latex: factorText(pairs, true),
  };
}
const prime = define({
  id: "m1-prime-factorization",
  grade: "중1",
  strand: "자연수",
  title: "소인수분해",
  unit: "소인수분해",
  domain: cartesian(range(2, 300)),
  prompt: ([n]) => math(String(n), String(n), "소인수분해하시오."),
  solve: ([n]) => primeAnswer(n),
  check: ([n], a) => {
    if (a.kind !== "polynomial" || !a.exact.length || a.exact.length % 2)
      return false;
    const pairs: [number, number][] = [];
    let product = BigInt(1),
      previous = 1;
    for (let i = 0; i < a.exact.length; i += 2) {
      const p = small(a.exact[i], previous + 1, 300),
        e = small(a.exact[i + 1], 1, 8);
      if (p === null || e === null) return false;
      for (let divisor = 2; divisor * divisor <= p; divisor++)
        if (p % divisor === 0) return false;
      previous = p;
      pairs.push([p, e]);
      product *= BigInt(p) ** BigInt(e);
    }
    return (
      product === BigInt(n) &&
      sameDisplay(a, factorText(pairs), factorText(pairs, true))
    );
  },
});
const divisorCount = define({
  id: "m1-divisor-count-factors",
  grade: "중1",
  strand: "자연수",
  title: "소인수분해로 약수의 개수",
  unit: "소인수분해",
  domain: filtered(cartesian(range(0, 4), range(0, 3), range(0, 2)), (p) =>
    p.some(Boolean),
  ),
  prompt: ([a, b, c]) =>
    math(
      factorText(
        [
          [2, a],
          [3, b],
          [5, c],
        ].filter((p) => p[1]),
      ),
      factorText(
        [
          [2, a],
          [3, b],
          [5, c],
        ].filter((p) => p[1]),
        true,
      ),
      "약수의 개수를 구하시오.",
    ),
  solve: ([a, b, c]) => integer((a + 1) * (b + 1) * (c + 1)),
  check: ([a, b, c], answer) => {
    const q = readNumeric(answer, "integer");
    if (!q) return false;
    const n = 2 ** a * 3 ** b * 5 ** c;
    let count = 0;
    for (let divisor = 1; divisor <= n; divisor++)
      if (n % divisor === 0) count++;
    return q[0] === BigInt(count);
  },
});
function common(multiple: boolean) {
  return define({
    id: `m1-factor-${multiple ? "lcm" : "gcd"}`,
    grade: "중1",
    strand: "자연수",
    title: `소인수분해로 ${multiple ? "최소공배수" : "최대공약수"}`,
    unit: "소인수분해",
    domain: filtered(
      cartesian(...Array.from({ length: 6 }, () => range(0, 2))),
      (p) => p.slice(0, 3).some(Boolean) && p.slice(3).some(Boolean),
    ),
    prompt: (p) =>
      math(
        [p.slice(0, 3), p.slice(3)]
          .map((e) =>
            factorText(e.map((v, i) => [[2, 3, 5][i], v]).filter((x) => x[1])),
          )
          .join(", "),
        [p.slice(0, 3), p.slice(3)]
          .map((e) =>
            factorText(
              e.map((v, i) => [[2, 3, 5][i], v]).filter((x) => x[1]),
              true,
            ),
          )
          .join(",\\quad "),
        `${multiple ? "최소공배수" : "최대공약수"}를 구하시오.`,
      ),
    solve: (p) =>
      integer(
        [2, 3, 5].reduce(
          (v, base, i) =>
            v *
            base **
              (multiple ? Math.max(p[i], p[i + 3]) : Math.min(p[i], p[i + 3])),
          1,
        ),
      ),
    check: (p, a) => {
      const q = readNumeric(a, "integer");
      if (!q) return false;
      const left =
        BigInt(2) ** BigInt(p[0]) *
        BigInt(3) ** BigInt(p[1]) *
        BigInt(5) ** BigInt(p[2]);
      const right =
        BigInt(2) ** BigInt(p[3]) *
        BigInt(3) ** BigInt(p[4]) *
        BigInt(5) ** BigInt(p[5]);
      const g = gcd(left, right);
      return multiple ? q[0] * g === left * right : q[0] === g;
    },
  });
}
function signed(absolute: boolean) {
  return define({
    id: `m1-${absolute ? "absolute-value" : "additive-opposite"}`,
    grade: "중1",
    strand: "정수·유리수",
    title: absolute ? "절댓값" : "부호가 반대인 수",
    unit: "정수와 유리수",
    domain: tuples(
      nonzero(20).flatMap((n) =>
        range(1, 5)
          .filter((d) => gcd(BigInt(n), BigInt(d)) === BigInt(1))
          .map((d) => [n, d]),
      ),
    ),
    prompt: ([n, d]) =>
      math(
        absolute
          ? `|${fractionText(rational(n, d))}|`
          : fractionText(rational(n, d)),
        absolute
          ? `\\left|${fractionText(rational(n, d), true)}\\right|`
          : fractionText(rational(n, d), true),
        absolute
          ? "절댓값을 구하시오."
          : "절댓값이 같고 부호가 반대인 수를 구하시오.",
      ),
    solve: ([n, d]) =>
      numericAnswer(rational(absolute ? Math.abs(n) : -n, d), "rational"),
    check: ([n, d], a) => {
      const q = readNumeric(a, "rational");
      return Boolean(
        q &&
        (absolute
          ? q[0] >= BigInt(0) &&
            q[0] * q[0] * BigInt(d * d) === BigInt(n * n) * q[1] * q[1]
          : q[0] * BigInt(d) + BigInt(n) * q[1] === BigInt(0)),
      );
    },
  });
}
const pureDomain = tuples([
  ...range(1, 9).map((r) => [r, 1]),
  ...range(10, 98)
    .filter((r) => r % 11 !== 0)
    .map((r) => [r, 2]),
]);
function recurring(mixed: boolean) {
  return define({
    id: `m2-recurring-${mixed ? "mixed" : "pure"}-fraction`,
    grade: "중2",
    strand: "정수·유리수",
    title: mixed ? "혼순환소수를 분수로" : "순순환소수를 분수로",
    unit: "유리수와 순환소수",
    domain: mixed ? cartesian(range(0, 9), range(1, 9)) : pureDomain,
    prompt: ([a, b]) =>
      math(
        mixed ? `0.${a}(${b})` : `0.(${a})`,
        mixed
          ? `0.${a}\\dot{${b}}`
          : b === 1
            ? `0.\\dot{${a}}`
            : `0.\\dot{${Math.floor(a / 10)}}\\dot{${a % 10}}`,
        "순환마디가 표시된 소수를 기약분수로 나타내시오.",
      ),
    solve: ([a, b]) =>
      numericAnswer(
        mixed ? rational(9 * a + b, 90) : rational(a, 10 ** b - 1),
        "rational",
      ),
    check: ([a, b], answer) => {
      const q = readNumeric(answer, "rational");
      return Boolean(
        q &&
        (mixed
          ? BigInt(100) * q[0] - BigInt(10) * q[0] === BigInt(9 * a + b) * q[1]
          : BigInt(10 ** b) * q[0] - q[0] === BigInt(a) * q[1]),
      );
    },
  });
}
const fractions = tuples(
  range(2, 100).flatMap((d) =>
    range(1, d - 1)
      .filter((n) => gcd(BigInt(n), BigInt(d)) === BigInt(1))
      .map((n) => [n, d]),
  ),
);
const terminating = define({
  id: "m2-terminating-minimum-multiplier",
  grade: "중2",
  strand: "정수·유리수",
  title: "유한소수가 되는 최소 자연수",
  unit: "유리수와 순환소수",
  domain: fractions,
  prompt: ([n, d]) =>
    math(
      `${n}/${d} × k`,
      `\\frac{${n}}{${d}}\\times k`,
      "값이 유한소수로 나타내어지도록 하는 가장 작은 자연수 k를 구하시오.",
    ),
  solve: ([, d]) => {
    while (d % 2 === 0) d /= 2;
    while (d % 5 === 0) d /= 5;
    return integer(d);
  },
  check: ([n, d], a) => {
    const q = readNumeric(a, "integer");
    if (!q || q[0] < BigInt(1) || q[0] > BigInt(d)) return false;
    for (let k = 1; k <= Number(q[0]); k++) {
      let denominator = BigInt(d) / gcd(BigInt(n * k), BigInt(d));
      while (denominator % BigInt(10) === BigInt(0)) denominator /= BigInt(10);
      while (denominator % BigInt(2) === BigInt(0)) denominator /= BigInt(2);
      while (denominator % BigInt(5) === BigInt(0)) denominator /= BigInt(5);
      if (denominator === BigInt(1)) return BigInt(k) === q[0];
    }
    return false;
  },
});
const places = define({
  id: "m2-terminating-decimal-places",
  grade: "중2",
  strand: "정수·유리수",
  title: "유한소수의 소수 자릿수",
  unit: "유리수와 순환소수",
  domain: filtered(fractions, ([, d]) => {
    while (d % 2 === 0) d /= 2;
    while (d % 5 === 0) d /= 5;
    return d === 1;
  }),
  prompt: ([n, d]) =>
    math(
      `${n}/${d}`,
      `\\frac{${n}}{${d}}`,
      "기약분수를 유한소수로 나타낼 때 소수 몇째 자리에서 끝나는지 구하시오.",
    ),
  solve: ([, d]) => {
    let a = 0,
      b = 0;
    while (d % 2 === 0) {
      d /= 2;
      a++;
    }
    while (d % 5 === 0) {
      d /= 5;
      b++;
    }
    return integer(Math.max(a, b));
  },
  check: ([n, d], a) => {
    const k = small(a.exact[0], 1, 7);
    return Boolean(
      readNumeric(a, "integer") &&
      k !== null &&
      (BigInt(n) * BigInt(10) ** BigInt(k)) % BigInt(d) === BigInt(0) &&
      (BigInt(n) * BigInt(10) ** BigInt(k - 1)) % BigInt(d) !== BigInt(0),
    );
  },
});
const recurringOperations = define({
  id: "m2-recurring-rational-operations",
  grade: "중2",
  strand: "정수·유리수",
  title: "순환소수를 포함한 사칙계산",
  unit: "유리수와 순환소수",
  domain: tuples(
    range(1, 9).flatMap((r) =>
      nonzero(6).flatMap((n) =>
        range(2, 6)
          .filter((d) => gcd(BigInt(n), BigInt(d)) === BigInt(1))
          .flatMap((d) => range(0, 3).map((op) => [r, n, d, op])),
      ),
    ),
  ),
  prompt: ([r, n, d, op]) =>
    math(
      `0.(${r}) ${["+", "-", "×", "÷"][op]} (${n}/${d})`,
      `0.\\dot{${r}} ${["+", "-", "\\times", "\\div"][op]} \\left(${fractionText(rational(n, d), true)}\\right)`,
      "계산하여 기약분수로 나타내시오.",
    ),
  solve: ([r, n, d, op]) =>
    numericAnswer(
      op === 0
        ? rational(r * d + 9 * n, 9 * d)
        : op === 1
          ? rational(r * d - 9 * n, 9 * d)
          : op === 2
            ? rational(r * n, 9 * d)
            : rational(r * d, 9 * n),
      "rational",
    ),
  check: ([r, n, d, op], a) => {
    const q = readNumeric(a, "rational");
    if (!q) return false;
    const [u, v] = q;
    return op === 0
      ? (u * BigInt(d) - BigInt(n) * v) * BigInt(9) === BigInt(r * d) * v
      : op === 1
        ? (u * BigInt(d) + BigInt(n) * v) * BigInt(9) === BigInt(r * d) * v
        : op === 2
          ? u * BigInt(9 * d) === BigInt(r * n) * v
          : u * BigInt(9 * n) === BigInt(r * d) * v;
  },
});
export const NUMBER_DEFINITIONS = [
  prime,
  divisorCount,
  common(false),
  common(true),
  signed(true),
  signed(false),
  recurring(false),
  recurring(true),
  terminating,
  places,
  recurringOperations,
];
