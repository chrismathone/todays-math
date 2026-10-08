/** Exact computed option values; the caller must supply a separately checked model.
 * Literal choice text, a renderer's pixels and sampled symbolic identities are not
 * calculation inputs or proof of all admissible configurations.
 */
import assert from "node:assert/strict";
import { compareConstantParts } from "./constantAnswers.mjs";

export function checkComputedChoices(options, targetParts) {
  const limit = {
    calculationOnly: true,
    modelAndDomainProofRequired: true,
    permitsGradeOrQuestionApproval: false,
  };
  try {
    assert(
      Array.isArray(options) && options.length === 5,
      "Five computed options required",
    );
    const target = compareConstantParts(targetParts, targetParts);
    assert.equal(target.status, "equivalent", "Unsupported target value");
    const shape = (parts) =>
      parts.map(({ role, dimension }) => ({ role, dimension }));
    const normalized = options.map((parts) => {
      const result = compareConstantParts(parts, parts);
      assert.equal(result.status, "equivalent", "Unsupported computed option");
      assert.deepEqual(
        shape(result.left),
        shape(target.left),
        "Target roles/dimensions differ",
      );
      return result.left;
    });
    const keys = normalized.map((parts) => JSON.stringify(parts));
    const targetKey = JSON.stringify(target.left);
    const correctOptionIndexes = keys.flatMap((key, index) =>
      key === targetKey ? [index + 1] : [],
    );
    const equivalentOptionPairs = [];
    for (let i = 0; i < keys.length; i++)
      for (let j = i + 1; j < keys.length; j++)
        if (keys[i] === keys[j]) equivalentOptionPairs.push([i + 1, j + 1]);
    return {
      status: "computed",
      correctOptionIndexes,
      equivalentOptionPairs,
      uniqueCorrectValue: correctOptionIndexes.length === 1,
      distinctComputedValues: equivalentOptionPairs.length === 0,
      choiceValueControlPassed:
        correctOptionIndexes.length === 1 && equivalentOptionPairs.length === 0,
      normalizedOptions: normalized,
      normalizedTarget: target.left,
      ...limit,
    };
  } catch (error) {
    return {
      status: "unsupported",
      reason: error.message,
      choiceValueControlPassed: false,
      ...limit,
    };
  }
}
