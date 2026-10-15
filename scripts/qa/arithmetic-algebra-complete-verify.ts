import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { ALGEBRA_COMPLETE_DEFINITIONS } from "../../src/lib/arithmetic-v2/families/algebraComplete";
import { MIDDLE_ARITHMETIC_DEFINITIONS } from "../../src/lib/arithmetic-v2/families/middle";
import { NUMERIC_SUPPLEMENT_DEFINITIONS } from "../../src/lib/arithmetic-v2/families/middle/numericSupplement";
import { ALGEBRA_RADICAL_SUPPLEMENT_DEFINITIONS } from "../../src/lib/arithmetic-v2/families/middle/algebraRadicalSupplement";
import { typesetLabel } from "../../src/lib/figure/mathjaxLabel";

let total = 0;
const identities = new Map<string, string>();
for (const definition of ALGEBRA_COMPLETE_DEFINITIONS) {
  assert.deepEqual(definition.curriculum?.semester, 1);
  for (let index = 0; index < definition.domainSize; index++) {
    const candidate = definition.problemAt(index);
    assert(
      definition.verify(candidate),
      `${definition.id} [${index}] ${JSON.stringify(candidate)}`,
    );
    assert(candidate.prompt.layout === "math");
    const identity = JSON.stringify([
      candidate.prompt.latex.replace(/\s+/g, ""),
      candidate.prompt.instruction,
    ]);
    assert(
      !identities.has(identity),
      `${definition.id} [${index}] duplicates ${identities.get(identity)}`,
    );
    identities.set(identity, `${definition.id} [${index}]`);
    assert(candidate.parameters.length <= 6);
    for (const s of [
      candidate.prompt.text,
      candidate.prompt.latex,
      candidate.prompt.instruction!,
      candidate.answer.text,
      candidate.answer.latex,
    ])
      assert(s.length <= 2048 && !/[<>\x00-\x1f]/.test(s));
    assert(
      candidate.answer.exact.length <= 30 &&
        candidate.answer.exact.every(
          (s) => s.length <= 40 && /^(0|-?[1-9][0-9]*)$/.test(s),
        ),
    );
    total++;
  }
  console.log(`${definition.id}: ${definition.domainSize}`);
}
console.log(
  JSON.stringify({
    families: ALGEBRA_COMPLETE_DEFINITIONS.length,
    total,
    unique: identities.size,
  }),
);
let legacyTasks = 0;
for (const definition of [
  ...MIDDLE_ARITHMETIC_DEFINITIONS,
  ...NUMERIC_SUPPLEMENT_DEFINITIONS,
  ...ALGEBRA_RADICAL_SUPPLEMENT_DEFINITIONS,
]) {
  assert(!ALGEBRA_COMPLETE_DEFINITIONS.some((d) => d.id === definition.id));
  for (let i = 0; i < definition.domainSize; i++) {
    const { prompt } = definition.problemAt(i);
    assert(prompt.layout === "math");
    const identity = JSON.stringify([
      prompt.latex.replace(/\s+/g, ""),
      prompt.instruction,
    ]);
    assert(
      !identities.has(identity),
      `${definition.id} duplicates ${identities.get(identity)}`,
    );
    legacyTasks++;
  }
}
console.log(
  JSON.stringify({ legacyTasksCheckedForDuplicateIdentity: legacyTasks }),
);
let representativeTypesets = 0;
for (const definition of ALGEBRA_COMPLETE_DEFINITIONS) {
  for (const index of [
    0,
    Math.floor(definition.domainSize / 2),
    definition.domainSize - 1,
  ]) {
    const { prompt, answer } = definition.problemAt(index);
    assert(prompt.layout === "math");
    for (const latex of [prompt.latex, answer.latex]) {
      const rendered = typesetLabel(`$${latex}$`);
      assert(
        rendered && !/data-mml-node="merror"/.test(rendered.inner),
        `${definition.id}: MathJax ${index}`,
      );
      representativeTypesets++;
    }
  }
}
console.log(JSON.stringify({ representativeTypesets }));
if (process.argv.includes("--write-evidence"))
  writeFileSync(
    new URL("./arithmetic-algebra-complete-evidence.json", import.meta.url),
    JSON.stringify(
      {
        families: ALGEBRA_COMPLETE_DEFINITIONS.length,
        total,
        unique: identities.size,
        legacyTasksCheckedForDuplicateIdentity: legacyTasks,
        representativeTypesets,
        definitions: ALGEBRA_COMPLETE_DEFINITIONS.map(
          ({ id, title, grade, curriculum, domainSize }) => ({
            id,
            title,
            grade,
            curriculum,
            domainSize,
          }),
        ),
      },
      null,
      2,
    ) + "\n",
  );
