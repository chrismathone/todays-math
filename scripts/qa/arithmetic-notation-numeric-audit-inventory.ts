/** Exhaustive, streaming census. No generation, shared-data mutation or sampling.
 * Run with the existing dependency loader and tsx; see the accompanying report.
 * A pattern replaces ONLY ASCII digit runs. Decimal points, signs, delimiters,
 * Korean, units, variables, TeX commands and all punctuation remain distinct.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { arithmeticV2Definitions } from "../../src/lib/arithmetic-v2/registry";
import type { ArithmeticV2Candidate } from "../../src/lib/arithmetic-v2/types";

export const inventoryPath =
  "scripts/qa/arithmetic-notation-numeric-audit-inventory.json.gz";
type Witness = { index: number; candidate: ArithmeticV2Candidate };
type Pattern = { key: string; count: number; first: Witness; last: Witness };
const digits = /\d+/g;
const shape = (text: string | undefined) => (text ?? "").replace(digits, "#");
const definitions = arithmeticV2Definitions();
const selected = definitions.filter((d) => d.strand !== "도형");
const families: object[] = [];
const started = new Date().toISOString();
const source = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const census = {
  started,
  source,
  registrySha256: createHash("sha256")
    .update(readFileSync("src/lib/arithmetic-v2/registry.ts"))
    .digest("hex"),
  registryFamilies: definitions.length,
  excludedGeometryFamilies: definitions.length - selected.length,
  selectedFamilies: selected.length,
  expectedCandidates: selected.reduce((sum, d) => sum + d.domainSize, 0),
  visitedCandidates: 0,
  complete: false,
  families,
};
// Small families first expose all authored prose early; largest domains still run in full.
for (const definition of [...selected].sort(
  (a, b) => a.domainSize - b.domainSize,
)) {
  const prompts = new Map<string, Pattern>();
  const answers = new Map<string, Pattern>();
  const instructions = new Map<string, Pattern>();
  const record = (map: Map<string, Pattern>, key: string, witness: Witness) => {
    const previous = map.get(key);
    if (previous) {
      previous.count++;
      previous.last = witness;
    } else map.set(key, { key, count: 1, first: witness, last: witness });
  };
  const start = performance.now();
  for (let index = 0; index < definition.domainSize; index++) {
    const candidate = definition.problemAt(index);
    const { prompt, answer } = candidate;
    if (prompt.layout === "math" && prompt.figureId)
      throw new Error(`Non-geometry family has a figure: ${definition.id}`);
    const witness = { index, candidate };
    const key =
      prompt.layout === "math"
        ? `math|${shape(prompt.text)}|${shape(prompt.latex)}|${prompt.answerUnit ?? ""}`
        : `vertical|${prompt.operator}`;
    record(prompts, key, witness);
    record(
      answers,
      `${answer.kind}|${shape(answer.text)}|${shape(answer.latex)}`,
      witness,
    );
    if (prompt.instruction)
      record(instructions, shape(prompt.instruction), witness);
    if (index > 0 && index % 5_000_000 === 0)
      console.log(`${definition.id}: ${index}/${definition.domainSize}`);
  }
  assert.equal(
    [...prompts.values()].reduce((n, p) => n + p.count, 0),
    definition.domainSize,
  );
  assert.equal(
    [...answers.values()].reduce((n, p) => n + p.count, 0),
    definition.domainSize,
  );
  families.push({
    id: definition.id,
    grade: definition.grade,
    strand: definition.strand,
    title: definition.title,
    domainSize: definition.domainSize,
    promptPresentation: definition.promptPresentation ?? null,
    elapsedSeconds: Math.round((performance.now() - start) / 1000),
    prompts: [...prompts.values()],
    answers: [...answers.values()],
    instructions: [...instructions.values()],
  });
  census.visitedCandidates += definition.domainSize;
  writeFileSync(inventoryPath, gzipSync(JSON.stringify(census)));
  console.log(
    `${definition.id}: ${definition.domainSize}; patterns ${prompts.size}/${instructions.size}/${answers.size}; total ${census.visitedCandidates}`,
  );
}
census.complete = true;
assert.equal(census.visitedCandidates, census.expectedCandidates);
writeFileSync(
  inventoryPath,
  gzipSync(JSON.stringify({ ...census, finished: new Date().toISOString() })),
);
console.log(
  `COMPLETE: ${selected.length} families, ${census.visitedCandidates} candidates.`,
);
