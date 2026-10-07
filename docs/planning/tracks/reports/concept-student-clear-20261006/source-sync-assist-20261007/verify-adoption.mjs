/** Read-only selective materialization verification after Root commits the adopted final preparation. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { GRADES, sha256, FINAL_STATUS } from './prepare-source-sync.mjs';
import { loadRoot, contentHash, verifyCaptured } from './root-inputs.mjs';

assert.equal(process.argv[2], '--prepared', 'Usage: verify-adoption.mjs --prepared <final helper-output>');
assert.ok(process.argv[3] && process.argv.length === 4, 'Exactly one prepared directory required');
const prepared = path.resolve(process.argv[3]);
const manifest = JSON.parse(fs.readFileSync(path.join(prepared, 'output-manifest.json'), 'utf8'));
assert.equal(manifest.mode, 'final', 'Preliminary output cannot be checked as adopted production');
for (const row of manifest.outputFiles)
  assert.equal(sha256(fs.readFileSync(path.join(prepared, row.file))), row.sha256, 'Prepared output drift: ' + row.file);
const plan = JSON.parse(fs.readFileSync(path.join(prepared, 'application-plan.json'), 'utf8'));
assert.equal(plan.status, FINAL_STATUS);
const loaded = await loadRoot();
assert.equal(contentHash(loaded.BANK_PARTS), plan.candidateBankHash, 'Adopted bank differs from final candidate');
for (const row of manifest.manuscriptOutputs)
  assert.equal(sha256(loaded.readBytes(path.join(loaded.root, row.file))), row.afterSha256, 'Adopted manuscript/ledger differs: ' + row.file);
const current = Object.values(loaded.manuscriptBytes).flatMap(bytes => JSON.parse(bytes));
const bySection = new Map(current.map(script => [script.sectionKey, script]));
const generated = new Map(Object.entries(GRADES).flatMap(([code, grade]) => loaded.deps.materializeGrade(grade, loaded.BANK_PARTS[code])).map(script => [script.sectionKey, script]));
const definitions = new Set(plan.definitionChanges.map(row => row.id));
let matchedSourceTurns = 0;
for (const script of current) for (const [index, turn] of script.dialogue.entries()) {
  if (turn.source.kind !== 'bank-concept' || !definitions.has(turn.source.entryId)) continue;
  assert.deepEqual(turn, generated.get(script.sectionKey)?.dialogue[index], 'Adopted definition materialization mismatch');
  matchedSourceTurns++;
}
const positions = new Set();
for (const row of loaded.deps.staticCorrections) {
  const position = JSON.stringify([row.sectionKey, row.turnIndex]);
  assert.ok(!positions.has(position), 'Duplicate correction position'); positions.add(position);
  const turn = bySection.get(row.sectionKey)?.dialogue[row.turnIndex];
  assert.ok(turn); assert.equal(turn.markdown, row.new); assert.deepEqual(turn.source, row.source);
}
verifyCaptured(loaded);
console.log(JSON.stringify({ status: 'Committed adoption bytes and selective materializeGrade correspondence verified', matchedSourceTurns,
  corrections: loaded.deps.staticCorrections.length, rootCommit: loaded.rootCommit, productionFilesWritten: false, semanticApproval: 'Root/Claude responsibility' }, null, 2));
