import test from "node:test";
import assert from "node:assert/strict";
import { checkComputedChoices } from "./computedChoiceChecks.mjs";
const scalar = (value) => [{ role: "cosBeta", value, unit: "none" }];

test("Gyeongsan22 has one correct answer but two globally equivalent distractors also coincide exactly at a legal witness", () => {
  // OQ=OU=2, SQ=1, OS=sqrt(3), UT=2/sqrt(3). This witness
  // comes from lengths/parallel lines; no image measurement or approximation.
  const before = ["sqrt(3)/2", "1/sqrt(3)", "sqrt(3)/3", "1/2", "sqrt(3)"].map(
    scalar,
  );
  const checked = checkComputedChoices(before, scalar("1/2"));
  assert.equal(checked.uniqueCorrectValue, true);
  assert.deepEqual(checked.correctOptionIndexes, [4]);
  assert.deepEqual(checked.equivalentOptionPairs, [[2, 3]]);
  assert.equal(checked.choiceValueControlPassed, false);
  assert.equal(checked.permitsGradeOrQuestionApproval, false);
  const after = checkComputedChoices(
    ["sqrt(3)/2", "1/sqrt(3)", "2", "1/2", "sqrt(3)"].map(scalar),
    scalar("1/2"),
  );
  assert.equal(after.choiceValueControlPassed, true);
  assert.equal(after.modelAndDomainProofRequired, true);
});

test("unit aliases and multipart answer roles cannot hide duplicate computed values", () => {
  const length = (value, unit = "cm") => [{ role: "length", value, unit }];
  const checked = checkComputedChoices(
    [length("100"), length("1", "m"), length("2"), length("3"), length("4")],
    length("1", "m"),
  );
  assert.deepEqual(checked.correctOptionIndexes, [1, 2]);
  assert.deepEqual(checked.equivalentOptionPairs, [[1, 2]]);
  assert.equal(checked.choiceValueControlPassed, false);
  const ordered = [
    { role: "height", value: "1", unit: "cm" },
    { role: "area", value: "2", unit: "cm^2" },
  ];
  assert.equal(
    checkComputedChoices(
      [ordered, [...ordered].reverse(), ordered, ordered, ordered],
      ordered,
    ).status,
    "unsupported",
  );
});

test("unknown units, functions and missing option calculations remain unsupported", () => {
  for (const value of ["sin(30)", "x", "1/0"])
    assert.equal(
      checkComputedChoices([value, "2", "3", "4", "5"].map(scalar), scalar("2"))
        .status,
      "unsupported",
    );
  assert.equal(
    checkComputedChoices(["1", "2", "3", "4"].map(scalar), scalar("2")).status,
    "unsupported",
  );
  const bad = [{ role: "cosBeta", value: "1", unit: "unknown" }];
  assert.equal(
    checkComputedChoices(
      [bad, ...["2", "3", "4", "5"].map(scalar)],
      scalar("2"),
    ).status,
    "unsupported",
  );
});
