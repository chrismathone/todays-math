import {
  answer,
  cm,
  cross,
  define,
  eq,
  fraction,
  fractions,
  name,
  positiveSquare,
  prompt,
  radical,
  range,
  rational,
  type Value,
} from "./trigonometryComplete/core";

const endpoints = define({
  id: "m3-trig-endpoint-values",
  title: "0°와 90°의 삼각비",
  domain: [
    [0, 0],
    [0, 1],
    [0, 2],
    [90, 0],
    [90, 1],
  ],
  prompt: ([angle, mode]) =>
    prompt(
      `$${name(mode)} ${angle}^{\\circ}$`,
      ` ${name(mode)} ${angle}^{\\circ}`,
      "삼각비의 값을 구하시오.",
    ),
  solve: ([angle, mode]) =>
    rational(angle === 0 ? (mode === 1 ? 1 : 0) : mode === 0 ? 1 : 0),
  check: ([angle, mode], v) => {
    const height = angle === 0 ? 0 : 1,
      base = angle === 0 ? 1 : 0;
    return mode === 0
      ? eq(v, height)
      : mode === 1
        ? eq(v, base)
        : base !== 0 && eq(v, height, base);
  },
});
// Generator lookup; independent checks below use 30/60 side squares and an
// isosceles right triangle, without a trigonometric floating-point calculation.
function special(angle: number, mode: number): Value {
  const table: Record<number, Value[]> = {
    30: [rational(1, 2), radical(1, 3, 2), radical(1, 3, 3)],
    45: [radical(1, 2, 2), radical(1, 2, 2), rational(1)],
    60: [radical(1, 3, 2), rational(1, 2), radical(1, 3)],
  };
  return table[angle][mode];
}
const inverse = define({
  id: "m3-trig-inverse-special-angle",
  title: "특수각의 삼각비에서 예각 구하기",
  unit: "°",
  domain: cross([30, 45, 60], [0, 1, 2]),
  prompt: ([angle, mode]) => {
    const value = answer(special(angle, mode));
    return prompt(
      `$A$가 예각이고 $${name(mode)} A=${value.latex}$이다.`,
      `0^{\\circ}\\lt A\\lt90^{\\circ},\\quad ${name(mode)} A=${value.latex}`,
      "각 A의 크기를 구하시오.",
      "°",
    );
  },
  solve: ([angle]) => rational(angle),
  check: ([given, mode], v) => {
    if (v.r !== 1 || v.d !== 1 || ![30, 45, 60].includes(v.n)) return false;
    const sides = (t: number) =>
      t === 30 ? [1, 3, 4] : t === 45 ? [1, 1, 2] : [3, 1, 4];
    const source = sides(given),
      candidate = sides(v.n),
      numerator = mode === 1 ? 1 : 0,
      denominator = mode === 2 ? 1 : 2;
    return (
      source[numerator] * candidate[denominator] ===
      candidate[numerator] * source[denominator]
    );
  },
});
const complement = define({
  id: "m3-trig-complementary-ratio",
  title: "서로 여각인 두 예각의 삼각비",
  domain: fractions().flatMap((p) => [0, 1].map((mode) => [...p, mode])),
  prompt: ([n, d, mode]) =>
    prompt(
      `직각삼각형 $ABC$에서 $\\angle C=90^{\\circ}$이고 $${name(mode)} A=${fraction(n, d)}$이다.`,
      `\\angle C=90^{\\circ},\\quad ${name(mode)} A=${fraction(n, d)},\\quad ${name(1 - mode)} B`,
      `$${name(1 - mode)} B$의 값을 구하시오.`,
    ),
  solve: ([n, d]) => rational(n, d),
  check: ([n, d], v) => eq(v, n, d),
});
const conversions = fractions(false).flatMap(([n, d]) =>
  [0, 1, 2]
    .filter((given) => given === 2 || n < d)
    .flatMap((given) =>
      [0, 1, 2]
        .filter((target) => target !== given)
        .map((target) => [n, d, given, target]),
    ),
);
const anotherRatio = define({
  id: "m3-trig-ratio-from-another",
  title: "한 삼각비에서 다른 삼각비 구하기",
  domain: conversions,
  prompt: ([n, d, given, target]) =>
    prompt(
      `직각삼각형 $ABC$에서 $\\angle C=90^{\\circ}$이고 $${name(given)} A=${fraction(n, d)}$이다.`,
      `\\angle C=90^{\\circ},\\quad ${name(given)} A=${fraction(n, d)},\\quad ${name(target)} A`,
      `$${name(target)} A$의 값을 구하시오. 근호는 간단히 하시오.`,
    ),
  solve: ([n, d, given, target]) => {
    const square = given === 2 ? n * n + d * d : d * d - n * n;
    if (given === 0)
      return target === 1 ? radical(1, square, d) : radical(n, square, square);
    if (given === 1)
      return target === 0 ? radical(1, square, d) : radical(1, square, n);
    return radical(target === 0 ? n : d, square, square);
  },
  check: ([n, d, given, target], v) => {
    const opposite = given === 1 ? d * d - n * n : n * n,
      adjacent = given === 0 ? d * d - n * n : given === 1 ? n * n : d * d,
      hypotenuse = given === 2 ? n * n + d * d : d * d;
    return positiveSquare(
      v,
      target === 1 ? adjacent : opposite,
      target === 2 ? adjacent : hypotenuse,
    );
  },
});
// AB is hypotenuse; BC is opposite A; AC is adjacent A. Each mode is one
// mathematically distinct forward/inverse side ratio, with no angle-value lookup.
const sideModes = [
  ["AB", "BC", 0],
  ["AB", "AC", 1],
  ["BC", "AB", 0],
  ["AC", "AB", 1],
  ["AC", "BC", 2],
  ["BC", "AC", 2],
] as const;
const lengths = define({
  id: "m3-trig-length-given-ratio",
  title: "주어진 삼각비로 변의 길이",
  unit: "cm",
  domain: fractions(false).flatMap(([n, d]) =>
    range(0, 5)
      .filter((mode) => mode >= 4 || n < d)
      .flatMap((mode) => range(2, 15).map((k) => [n, d, mode, k])),
  ),
  prompt: ([n, d, mode, k]) => {
    const [given, target, ratio] = sideModes[mode];
    return prompt(
      `직각삼각형 $ABC$에서 $\\angle C=90^{\\circ}$, $${name(ratio)} A=${fraction(n, d)}$, $\\mathrm{${given}}=${cm(k)}$이다.`,
      `\\angle C=90^{\\circ},\\quad ${name(ratio)} A=${fraction(n, d)},\\quad \\mathrm{${given}}=${cm(k)},\\quad \\mathrm{${target}}`,
      `변 $\\mathrm{${target}}$의 길이를 구하시오.`,
      "cm",
    );
  },
  solve: ([n, d, mode, k]) =>
    [2, 3, 5].includes(mode) ? rational(k * d, n) : rational(k * n, d),
  check: ([n, d, mode, k], v) => {
    if (v.n <= 0 || v.r !== 1) return false;
    const [given, target, ratio] = sideModes[mode];
    const sides: Record<string, [number, number]> = {
      [given]: [k, 1],
      [target]: [v.n, v.d],
    };
    const [num, nd] = sides[ratio === 1 ? "AC" : "BC"],
      [den, dd] = sides[ratio === 2 ? "AC" : "AB"];
    return (
      BigInt(n) * BigInt(den) * BigInt(nd) ===
      BigInt(d) * BigInt(num) * BigInt(dd)
    );
  },
});
const area = define({
  id: "m3-trig-area-given-sine",
  title: "주어진 사인값으로 삼각형 넓이",
  unit: "cm²",
  domain: fractions().flatMap(([n, d]) =>
    cross(range(2, 12), range(2, 12))
      .filter(([a, b]) => a <= b)
      .map(([a, b]) => [n, d, a, b]),
  ),
  prompt: ([n, d, a, b]) =>
    prompt(
      `삼각형 $ABC$에서 $\\mathrm{AB}=${cm(a)}$, $\\mathrm{AC}=${cm(b)}$이고 끼인각 $A$는 예각이며 $\\sin A=${fraction(n, d)}$이다.`,
      `\\mathrm{AB}=${cm(a)},\\quad \\mathrm{AC}=${cm(b)},\\quad0^{\\circ}\\lt A\\lt90^{\\circ},\\quad\\sin A=${fraction(n, d)}`,
      "삼각형 ABC의 넓이를 구하시오.",
      "cm²",
    ),
  solve: ([n, d, a, b]) => rational(a * b * n, 2 * d),
  check: ([n, d, a, b], v) =>
    v.n > 0 &&
    v.r === 1 &&
    BigInt(2 * d) * BigInt(v.n) === BigInt(a * b * n) * BigInt(v.d),
});
const sideFromArea = define({
  id: "m3-trig-side-from-area-sine",
  title: "넓이와 사인값에서 한 변 구하기",
  unit: "cm",
  domain: fractions().flatMap(([n, d]) =>
    cross(range(2, 12), range(1, 30)).map(([a, s]) => [n, d, a, s]),
  ),
  prompt: ([n, d, a, s]) =>
    prompt(
      `삼각형 $ABC$의 넓이는 $${s}\\,\\mathrm{cm}^{2}$이다. $\\mathrm{AB}=${cm(a)}$이고 끼인각 $A$는 예각이며 $\\sin A=${fraction(n, d)}$이다.`,
      `S=${s}\\,\\mathrm{cm}^{2},\\quad\\mathrm{AB}=${cm(a)},\\quad0^{\\circ}\\lt A\\lt90^{\\circ},\\quad\\sin A=${fraction(n, d)},\\quad\\mathrm{AC}`,
      "변 $\\mathrm{AC}$의 길이를 구하시오.",
      "cm",
    ),
  solve: ([n, d, a, s]) => rational(2 * s * d, a * n),
  check: ([n, d, a, s], v) =>
    v.n > 0 &&
    v.r === 1 &&
    BigInt(a * n) * BigInt(v.n) === BigInt(2 * s * d) * BigInt(v.d),
});
const sineFromArea = define({
  id: "m3-trig-sine-from-area",
  title: "두 변과 넓이에서 사인값 구하기",
  domain: cross(range(2, 12), range(2, 12))
    .filter(([a, b]) => a <= b)
    .flatMap(([a, b]) =>
      range(1, Math.floor((a * b - 1) / 2)).map((s) => [a, b, s]),
    ),
  prompt: ([a, b, s]) =>
    prompt(
      `삼각형 $ABC$에서 $\\mathrm{AB}=${cm(a)}$, $\\mathrm{AC}=${cm(b)}$이고 넓이는 $${s}\\,\\mathrm{cm}^{2}$이다. 끼인각 $A$는 예각이다.`,
      `\\mathrm{AB}=${cm(a)},\\quad\\mathrm{AC}=${cm(b)},\\quad S=${s}\\,\\mathrm{cm}^{2},\\quad0^{\\circ}\\lt A\\lt90^{\\circ},\\quad\\sin A`,
      "$\\sin A$의 값을 구하시오.",
    ),
  solve: ([a, b, s]) => rational(2 * s, a * b),
  check: ([a, b, s], v) =>
    v.n > 0 &&
    v.n < v.d &&
    v.r === 1 &&
    BigInt(a * b) * BigInt(v.n) === BigInt(2 * s) * BigInt(v.d),
});
const squares = define({
  id: "m3-trig-special-squared-arithmetic",
  title: "특수각 삼각비 제곱의 계산",
  domain: cross(
    [30, 45, 60],
    [0, 1, 2],
    [30, 45, 60],
    [0, 1, 2],
    [0, 1],
  ).filter(([a, m, b, k]) => a * 3 + m <= b * 3 + k),
  prompt: ([a, m, b, k, op]) => {
    const latex = `(${name(m)}${a}^{\\circ})^2${op === 0 ? "+" : "-"}(${name(k)}${b}^{\\circ})^2`;
    return prompt(`$${latex}$`, latex, "정확한 값을 계산하시오.");
  },
  solve: ([a, m, b, k, op]) => {
    const left = special(a, m),
      right = special(b, k);
    return rational(
      left.n ** 2 * left.r * right.d ** 2 +
        (op === 0 ? 1 : -1) * right.n ** 2 * right.r * left.d ** 2,
      left.d ** 2 * right.d ** 2,
    );
  },
  check: ([a, m, b, k, op], v) => {
    const sideSquares = (t: number) =>
      t === 30 ? [1, 3, 4] : t === 45 ? [1, 1, 2] : [3, 1, 4];
    const left = sideSquares(a),
      right = sideSquares(b),
      ln = left[m === 1 ? 1 : 0],
      ld = left[m === 2 ? 1 : 2],
      rn = right[k === 1 ? 1 : 0],
      rd = right[k === 2 ? 1 : 2];
    return eq(v, ln * rd + (op === 0 ? 1 : -1) * rn * ld, ld * rd);
  },
});
/** Text-only additions: all four original trig IDs and their SVG packs stay frozen. */
export const TRIGONOMETRY_COMPLETE_DEFINITIONS = [
  endpoints,
  inverse,
  complement,
  anotherRatio,
  lengths,
  area,
  sideFromArea,
  sineFromArea,
  squares,
];
