/** Exact authoring calculations. No curriculum, taxonomy, rights or review approval. */
import assert from "node:assert/strict";
export { twoUnknownObservations } from "./inverseDispersionConditions.mjs";

const gcd = (a, b) => {
  a = a < 0n ? -a : a;
  while (b) [a, b] = [b, a % b];
  return a;
};
const fraction = (n, d = 1n) => {
  assert(d > 0n, "Positive denominator required");
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
};
const exact = (value) => {
  const text = String(value);
  assert(
    /^-?\d{1,9}(?:\.\d{1,6})?$/.test(text),
    "Exact bounded decimal required",
  );
  const [whole, tail = ""] = text.replace(/^-/, "").split(".");
  return fraction(
    (text.startsWith("-") ? -1n : 1n) * BigInt(whole + tail),
    10n ** BigInt(tail.length),
  );
};
const add = (a, b) => fraction(a.n * b.d + b.n * a.d, a.d * b.d);
const subtract = (a, b) => fraction(a.n * b.d - b.n * a.d, a.d * b.d);
const multiply = (a, b) => fraction(a.n * b.n, a.d * b.d);
const output = (a) => ({
  numerator: a.n.toString(),
  denominator: a.d.toString(),
});

export function analyzeFrequency(rows) {
  assert(
    Array.isArray(rows) && rows.length > 0 && rows.length <= 1000,
    "Bounded nonempty frequency table required",
  );
  const ordered = rows
    .map(({ value, frequency }) => {
      assert(
        Number.isSafeInteger(value) && Math.abs(value) <= 1e6,
        "Integer data value required",
      );
      assert(
        Number.isSafeInteger(frequency) && frequency >= 0 && frequency <= 10000,
        "Nonnegative integer frequency required",
      );
      return { value, frequency };
    })
    .sort((a, b) => a.value - b.value);
  assert(
    new Set(ordered.map((r) => r.value)).size === ordered.length,
    "Duplicate data-value classes",
  );
  const count = ordered.reduce((s, r) => s + r.frequency, 0);
  assert(
    count > 0 && count <= 10000,
    "Positive bounded observation count required",
  );
  const total = ordered.reduce(
    (s, r) => s + BigInt(r.value) * BigInt(r.frequency),
    0n,
  );
  const squareTotal = ordered.reduce(
    (s, r) => s + BigInt(r.value) ** 2n * BigInt(r.frequency),
    0n,
  );
  const mean = fraction(total, BigInt(count));
  const variance = subtract(
    fraction(squareTotal, BigInt(count)),
    multiply(mean, mean),
  );
  assert(variance.n >= 0n);
  const locate = (position) => {
    let seen = 0;
    for (const r of ordered) {
      seen += r.frequency;
      if (seen >= position) return r.value;
    }
    throw new Error("Observation position unavailable");
  };
  const middlePositions = [
    Math.floor((count + 1) / 2),
    Math.floor((count + 2) / 2),
  ];
  const median = fraction(
    BigInt(locate(middlePositions[0])) + BigInt(locate(middlePositions[1])),
    2n,
  );
  const maxFrequency = Math.max(...ordered.map((r) => r.frequency));
  const maximalFrequencyValues = ordered
    .filter((r) => r.frequency === maxFrequency)
    .map((r) => r.value);
  return {
    count,
    total: total.toString(),
    squareTotal: squareTotal.toString(),
    mean: output(mean),
    median: output(median),
    variance: output(variance),
    standardDeviationSquared: output(variance),
    middlePositions,
    maxFrequency,
    maximalFrequencyValues,
    uniqueModalValue:
      maximalFrequencyValues.length === 1 ? maximalFrequencyValues[0] : null,
    modeConvention:
      "maximal frequencies exposed; a tied set is never a unique mode",
    approval: "calculation-only",
  };
}

export function rowsFromValues(values) {
  assert(Array.isArray(values) && values.length > 0 && values.length <= 10000);
  const frequencies = new Map();
  for (const value of values) {
    assert(Number.isSafeInteger(value));
    frequencies.set(value, (frequencies.get(value) ?? 0) + 1);
  }
  return [...frequencies].map(([value, frequency]) => ({ value, frequency }));
}

export function missingValueForMean(values, targetMean) {
  assert(Array.isArray(values) && values.length > 0 && values.length <= 10000);
  assert.equal(
    values.filter((v) => v === null).length,
    1,
    "Exactly one explicitly unknown observation required",
  );
  const knownTotal = values
    .filter((v) => v !== null)
    .reduce((s, v) => add(s, exact(v)), fraction(0n));
  return output(
    subtract(
      multiply(exact(targetMean), fraction(BigInt(values.length))),
      knownTotal,
    ),
  );
}

export function missingZeroSumDeviation(deviations) {
  assert(
    Array.isArray(deviations) &&
      deviations.length > 0 &&
      deviations.length <= 10000,
  );
  assert.equal(
    deviations.filter((v) => v === null).length,
    1,
    "Exactly one missing deviation required; blank is not zero",
  );
  const sum = deviations
    .filter((v) => v !== null)
    .reduce((s, v) => add(s, exact(v)), fraction(0n));
  return output(fraction(-sum.n, sum.d));
}

export function uniqueStrictMinimumOptions(options, otherValues) {
  assert(
    Array.isArray(options) &&
      options.length === 5 &&
      Array.isArray(otherValues) &&
      otherValues.length > 0,
  );
  const parsed = options.map(exact),
    others = otherValues.map(exact);
  assert.equal(
    new Set(parsed.map((x) => `${x.n}/${x.d}`)).size,
    5,
    "Equivalent duplicate options",
  );
  const matchingOptionIndexes = parsed.flatMap((value, i) =>
    others.every((other) => value.n * other.d < other.n * value.d) ? [i] : [],
  );
  return {
    matchingOptionIndexes,
    unique: matchingOptionIndexes.length === 1,
    calculationOnly: true,
  };
}
