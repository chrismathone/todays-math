import test from "node:test";
import assert from "node:assert/strict";
import {
  constantValue,
  compareConstantParts,
  singleChoiceConclusion,
} from "./constantAnswers.mjs";

test("Gyeonggu exact written area uses algebraic constants, never literal string equality", () => {
  assert.deepEqual(constantValue("9(sqrt(3)-1)"), constantValue("-9+9sqrt(3)"));
  assert.deepEqual(
    constantValue("$\\frac{6}{\\sqrt{3}}$"),
    constantValue("2sqrt(3)"),
  );
  assert.deepEqual(constantValue("sqrt(12)"), constantValue("2sqrt(3)"));
  assert.notDeepEqual(constantValue("sqrt(3)-1"), constantValue("sqrt(2)-1"));
});
test("role, order, angle/length/area dimension and unit scale remain part of an answer", () => {
  const author = [
    { role: "part1-angle", value: "75", unit: "deg" },
    { role: "part2-height", value: "2sqrt(3)", unit: "cm" },
    { role: "part4-area", value: "9(sqrt(3)-1)", unit: "cm^2" },
  ];
  assert.equal(compareConstantParts(author, author).status, "equivalent");
  assert.equal(
    compareConstantParts(
      [{ role: "length", value: "90", unit: "m" }],
      [{ role: "length", value: "9000", unit: "cm" }],
    ).status,
    "equivalent",
  );
  assert.equal(
    compareConstantParts(author, [author[1], author[0], author[2]]).status,
    "different",
  );
  assert.equal(
    compareConstantParts(
      author,
      author.map((p, i) => (i === 2 ? { ...p, unit: "cm" } : p)),
    ).status,
    "different",
  );
  assert.equal(
    compareConstantParts(
      author,
      author.map((p, i) => (i === 0 ? { ...p, value: "105" } : p)),
    ).status,
    "different",
  );
});
test("unknown expressions, zero denominators and ambiguous role data hold instead of matching", () => {
  for (const value of [
    "1/0",
    "sqrt(-1)",
    "sqrt(1000001)",
    "sqrt(x)",
    "sin(30)",
    "__import__('os')",
    "1e3",
    "(()=>1)()",
    "1/(sqrt(2)+sqrt(3))",
    "1 2",
    "2 \\frac{1}{2}",
    "1$2",
    "$1$+$2$",
  ])
    assert.equal(
      compareConstantParts(
        [{ role: "x", value, unit: "none" }],
        [{ role: "x", value, unit: "none" }],
      ).status,
      "unsupported",
      value,
    );
  assert.equal(
    compareConstantParts(
      [{ role: "x", value: "1", unit: "cm" }],
      [{ role: "x", value: "1", unit: "unknown" }],
    ).status,
    "unsupported",
  );
  assert.equal(
    compareConstantParts(
      [
        { role: "x", value: "1", unit: "none" },
        { role: "x", value: "2", unit: "none" },
      ],
      [],
    ).status,
    "unsupported",
  );
});
test("a single selected mark can carry annotations without treating them as checked math", () => {
  assert.equal(singleChoiceConclusion("③: ㉠ 5/13, ㉡ 5/12").mark, "③");
  assert.equal(
    singleChoiceConclusion("③: explanatory values").calculationOrApproval,
    false,
  );
  assert.equal(singleChoiceConclusion("③ 또는 ④"), null);
  assert.equal(singleChoiceConclusion("③: ④도 가능"), null);
  assert.equal(singleChoiceConclusion("3"), null);
});
test("a hundred distributed and rationalized constants retain exact equivalence", () => {
  for (let n = 1; n <= 100; n++) {
    assert.deepEqual(
      constantValue(`${n}(sqrt(3)-1)`),
      constantValue(`${n}sqrt(3)-${n}`),
    );
    assert.deepEqual(
      constantValue(`${n}/sqrt(3)`),
      constantValue(`${n}sqrt(3)/3`),
    );
  }
});
