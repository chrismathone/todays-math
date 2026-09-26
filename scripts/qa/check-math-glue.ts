/** Synthetic intake probe; no database, files containing rows, or model calls. */
import assert from "node:assert/strict";
import { normalizeMathgenText } from "../../src/lib/math/normalizeMathgenText";
import { tokenizeMath } from "../../src/lib/math/segments";

// `expected` 가 없으면 «그대로». 닫히지 않은 `$$` 는 2026-09-26 후보정 지시로
// «뒤가 수식이면 닫는다»가 됐다 — 한 번 닫고 그 뒤로는 같아야 한다(멱등).
const cases: { input: string; expected?: string }[] = [
  { input: String.raw`따라서 $\frac{N}{M}$$\angle CAM=15°$ 이다.` },
  { input: String.raw`따라서 $\frac{N}{M}$$\angle CAM=15$ 이다.` },
  { input: String.raw`$a=1$$b=2$$c=3$ 이다.` },
  {
    input: String.raw`값은 $$\angle CAM=15° 이다.`,
    expected: String.raw`값은 $$\angle CAM=15°$$ 이다.`,
  },
  { input: String.raw`따라서 $\frac{N}{M}$ $\angle CAM=15°$ 이다.` },
  { input: String.raw`$$\frac{N}{M}$$ 이다.` },
];
const results = cases.map(({ input, expected = input }) => {
  const once = normalizeMathgenText(input);
  const twice = normalizeMathgenText(once);
  const segments = tokenizeMath(input);
  return {
    input,
    once,
    twice,
    asExpected: once === expected,
    idempotent: twice === once,
    scopeWouldFlag:
      input.includes("$$") &&
      segments.every((segment) => segment.type !== "display"),
  };
});
console.log(JSON.stringify(results, null, 2));
if (!process.argv.includes("--observe")) {
  for (const result of results) {
    assert.ok(result.asExpected, result.input);
    assert.equal(result.twice, result.once);
  }
}
