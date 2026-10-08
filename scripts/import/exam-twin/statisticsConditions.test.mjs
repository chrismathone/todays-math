import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeFrequency,
  rowsFromValues,
  missingValueForMean,
  missingZeroSumDeviation,
  uniqueStrictMinimumOptions,
} from "./statisticsConditions.mjs";

test("weighted table preserves count, even median and exact population variance", () => {
  const r = analyzeFrequency([
    { value: 1, frequency: 1 },
    { value: 4, frequency: 1 },
    { value: 5, frequency: 1 },
    { value: 6, frequency: 4 },
    { value: 7, frequency: 1 },
    { value: 8, frequency: 1 },
    { value: 11, frequency: 1 },
  ]);
  assert.equal(r.count, 10);
  assert.equal(r.total, "60");
  assert.deepEqual(r.mean, { numerator: "6", denominator: "1" });
  assert.deepEqual(r.median, { numerator: "6", denominator: "1" });
  assert.deepEqual(r.variance, { numerator: "6", denominator: "1" });
  assert.equal(r.uniqueModalValue, 6);
});
test("missing observations and deviations are explicit, exact and not grade approvals", () => {
  assert.deepEqual(missingValueForMean([4, 7, 3, null, 6, 5, 3], 5), {
    numerator: "7",
    denominator: "1",
  });
  assert.deepEqual(missingZeroSumDeviation([6, -5, null, 7]), {
    numerator: "-8",
    denominator: "1",
  });
  assert.deepEqual(missingValueForMean(["1.1", null, "1.3"], "1.2"), {
    numerator: "6",
    denominator: "5",
  });
  assert.throws(() => missingValueForMean([4, null, null], 5));
  assert.throws(() => missingZeroSumDeviation([6, -5, 0, 7]));
});
test("ties, equal-value option aliases and nonexistent observations cannot become unique answers", () => {
  assert.equal(
    analyzeFrequency(rowsFromValues([20, 20, 25, 25])).uniqueModalValue,
    null,
  );
  const r = uniqueStrictMinimumOptions(
    ["0.7", "0.8", "0.9", "1.0", "1.1"],
    ["0.8", "0.9", "1.1", "1.3"],
  );
  assert.deepEqual(r.matchingOptionIndexes, [0]);
  assert.equal(r.unique, true);
  assert.equal(
    uniqueStrictMinimumOptions(["0.6", "0.7", "0.8", "0.9", "1.0"], ["0.8"])
      .unique,
    false,
  );
  assert.throws(() =>
    uniqueStrictMinimumOptions(["0.7", "0.70", "0.8", "0.9", "1.0"], ["0.8"]),
  );
  assert.throws(() => analyzeFrequency([{ value: 1, frequency: 0 }]));
  assert.throws(() => analyzeFrequency([{ value: 1, frequency: -1 }]));
  assert.throws(() =>
    analyzeFrequency([
      { value: 1, frequency: 1 },
      { value: 1, frequency: 2 },
    ]),
  );
});
test("one hundred deterministic distributions match an independent expanded-data calculation", () => {
  for (let seed = 1; seed <= 100; seed++) {
    const values = Array.from(
      { length: 5 + (seed % 16) },
      (_, i) => ((seed * 17 + i * i * 3) % 23) - 11,
    );
    const r = analyzeFrequency(rowsFromValues(values)),
      n = BigInt(values.length),
      sum = BigInt(values.reduce((s, v) => s + v, 0));
    const squaredDeviations = values.reduce(
      (s, v) => s + (BigInt(v) * n - sum) ** 2n,
      0n,
    );
    assert.equal(
      BigInt(r.variance.numerator) * n ** 3n,
      squaredDeviations * BigInt(r.variance.denominator),
    );
    const sorted = [...values].sort((a, b) => a - b);
    const twiceMedian = BigInt(
      sorted[Math.floor((values.length - 1) / 2)] +
        sorted[Math.floor(values.length / 2)],
    );
    assert.equal(
      BigInt(r.median.numerator) * 2n,
      twiceMedian * BigInt(r.median.denominator),
    );
  }
});
