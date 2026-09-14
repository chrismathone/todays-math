/** Synthetic intake probe; no database, files containing rows, or model calls. */
import assert from "node:assert/strict";
import { normalizeMathgenText } from "../../src/lib/math/normalizeMathgenText";
import { tokenizeMath } from "../../src/lib/math/segments";

const cases = [
  String.raw`따라서 $\frac{N}{M}$$\angle CAM=15°$ 이다.`,
  String.raw`따라서 $\frac{N}{M}$$\angle CAM=15$ 이다.`,
  String.raw`$a=1$$b=2$$c=3$ 이다.`,
  String.raw`값은 $$\angle CAM=15° 이다.`,
  String.raw`따라서 $\frac{N}{M}$ $\angle CAM=15°$ 이다.`,
  String.raw`$$\frac{N}{M}$$ 이다.`,
];
const results = cases.map((input) => {
  const once = normalizeMathgenText(input);
  const twice = normalizeMathgenText(once);
  const segments = tokenizeMath(input);
  return {
    input,
    once,
    twice,
    preserved: once === input,
    idempotent: twice === once,
    scopeWouldFlag:
      input.includes("$$") &&
      segments.every((segment) => segment.type !== "display"),
  };
});
console.log(JSON.stringify(results, null, 2));
if (!process.argv.includes("--observe")) {
  for (const result of results) {
    assert.equal(result.once, result.input);
    assert.equal(result.twice, result.once);
  }
}
