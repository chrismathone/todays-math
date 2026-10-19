import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { asMultipleChoice, declaredClassificationCount } from "../../../src/lib/engine/deriveFormats";
import { generateMiddleProblem } from "../../../src/lib/middle/generate";
import { createRng } from "../../../src/lib/elementary/rng";
import { parseProblemContent } from "../../../src/lib/problem/parseProblemContent";

const source = "src/lib/engine/deriveFormats.ts";
const hash = () => createHash("sha256").update(fs.readFileSync(source)).digest("hex");
const before = hash();
const observations = [];
for (let seed = 1; seed <= 64; seed++) {
  const input = generateMiddleProblem("1-1|일차방정식의 풀이|09", seed, 0);
  const output = asMultipleChoice({ ...input, familyKey: "runtime-control", problemType: "계산" }, createRng(seed));
  const choices = parseProblemContent(output.content).choices;
  assert.equal(choices.length, 5);
  assert.equal(new Set(choices).size, 5);
  choices.forEach((s) => assert.match(s, /^\$[0-5]\$개$/));
  const at = "①②③④⑤".indexOf(output.answer);
  assert(at >= 0);
  assert.equal(choices[at], input.answer);
  observations.push({ seed, bound: declaredClassificationCount(input.content), choices, selectedIndex: at + 1 });
}
assert.equal(hash(), before, "Source changed during runtime validation");
const receipt = { kind: "direct-runtime-count-validation/v2", utc: new Date().toISOString(), runtime: process.version,
  source, sourceSha256Before: before, sourceSha256After: hash(), actualGeneratorSamples: 64,
  passed: observations.length, observations, independentSemanticGradeApproval: false, loadable: 0, dbWrites: 0 };
fs.writeFileSync(".qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/count-runtime-matrix-r2.json", JSON.stringify(receipt, null, 2) + "\n", { flag: "wx", encoding: "utf8" });
console.log(JSON.stringify({ directRuntimePassed: observations.length, sourceHashStable: true, dbWrites: 0 }));
