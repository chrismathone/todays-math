/** Meaningful tests on captured actual seven-grade data; all results remain preliminary. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { prepareSourceSync, jsonLocations, GRADES, sha256, FINAL_STATUS } from './prepare-source-sync.mjs';
import { loadRoot, BASELINE, BASELINE_HASH, expectedPins, contentHash, verifyCaptured } from './root-inputs.mjs';

const fixtureIndex = process.argv.indexOf('--fixture');
const fixture = path.resolve(fixtureIndex < 0 ? 'D:/tmp/source-sync-assist-ctx_de9caad71bd4-preliminary-3' : process.argv[fixtureIndex + 1]);
const loaded = await loadRoot();
const read = relative => JSON.parse(fs.readFileSync(path.join(fixture, relative), 'utf8'));
const manifest = read('output-manifest.json');
for (const row of manifest.outputFiles) assert.equal(sha256(fs.readFileSync(path.join(fixture, row.file))), row.sha256, 'Captured output bytes drifted: ' + row.file);
const baseline = JSON.parse(loaded.readBytes(BASELINE)).parts;
assert.equal(contentHash(baseline), BASELINE_HASH);
const manuscriptBytes = Object.fromEntries(Object.keys(GRADES).map(code => [code, fs.readFileSync(path.join(fixture, `before/src/lib/textbook/scripts/${code}.json`), 'utf8')]));
const ledgerBytes = fs.readFileSync(path.join(fixture, 'before/src/lib/textbook/scripts/static-corrections.json'), 'utf8');
assert.deepEqual(manuscriptBytes, loaded.manuscriptBytes, 'Root manuscripts changed after fixture');
assert.equal(ledgerBytes, loaded.ledgerBytes, 'Root ledger changed after fixture');
const input = { mode: 'preliminary', plan: read('application-plan.json'), candidateParts: read('candidate-parts.json'), baseline,
  manuscriptBytes, ledgerBytes, sources: loaded.sources };
input.expected = expectedPins(input);
const results = [];
function test(name, run) {
  const started = Date.now();
  try { run(); results.push({ name, status: 'passed', milliseconds: Date.now() - started }); }
  catch (error) { results.push({ name, status: 'failed', error: String(error.stack), milliseconds: Date.now() - started }); }
}
const prepare = (value = input, deps = loaded.deps) => prepareSourceSync(value, deps);
let result;
test('Actual seven-grade replay reproduces all prepared before/after bytes', () => {
  result = prepare();
  for (const output of result.outputs) {
    assert.equal(output.before, fs.readFileSync(path.join(fixture, 'before', output.file), 'utf8'));
    assert.equal(output.after, fs.readFileSync(path.join(fixture, 'after', output.file), 'utf8'));
  }
  assert.equal(result.summary.changedTurns, 136);
  assert.equal(result.summary.priorCorrections, 147);
});
test('Every unrelated dialogue token, all metadata and all seven openings/examples retain exact original bytes', () => {
  const changes = new Set(result.turnChanges.map(row => JSON.stringify([row.sectionKey, row.turnIndex])));
  for (const output of result.outputs.filter(row => row.file.endsWith('.json') && !row.file.includes('static-corrections'))) {
    const before = JSON.parse(output.before), after = JSON.parse(output.after);
    const oldLocations = jsonLocations(output.before), newLocations = jsonLocations(output.after);
    for (let s = 0; s < before.length; s++) {
      assert.deepEqual({ ...after[s], dialogue: [] }, { ...before[s], dialogue: [] });
      assert.equal(before[s].dialogue.length, after[s].dialogue.length);
      for (let t = 0; t < before[s].dialogue.length; t++) {
        const oldTurn = before[s].dialogue[t], newTurn = after[s].dialogue[t];
        assert.deepEqual({ ...newTurn, markdown: '' }, { ...oldTurn, markdown: '' });
        if (!changes.has(JSON.stringify([before[s].sectionKey, t]))) {
          const nodeKey = JSON.stringify([s, 'dialogue', t]);
          const a = oldLocations.get(nodeKey), b = newLocations.get(nodeKey);
          assert.equal(output.before.slice(a.start, a.end), output.after.slice(b.start, b.end));
        } else {
          assert.equal(oldTurn.source.kind, 'bank-concept'); assert.notEqual(oldTurn.purpose, 'opening');
        }
      }
    }
    let oldAt = 0, newAt = 0;
    for (const edit of output.edits) {
      const size = edit.start - oldAt;
      assert.equal(Buffer.compare(Buffer.from(output.before.slice(oldAt, edit.start)), Buffer.from(output.after.slice(newAt, newAt + size))), 0);
      oldAt = edit.end; newAt += size + edit.replacement.length;
    }
    assert.equal(output.before.slice(oldAt), output.after.slice(newAt));
  }
});
test('All expected changed base-bank source turns represented; plus-only changes explicitly reported', () => {
  assert.equal(new Set(result.turnChanges.map(row => JSON.stringify([row.sectionKey, row.turnIndex]))).size, 136);
  const represented = new Set(result.turnChanges.map(row => row.entryId));
  const expectedBase = input.plan.definitionChanges.filter(row => !row.part.endsWith('plus'));
  assert.equal(represented.size, 98);
  assert.deepEqual([...represented].sort(), expectedBase.map(row => row.id).sort());
  assert.equal(result.summary.definitionChangesWithoutManuscriptTurns.length, input.plan.definitionChanges.length - expectedBase.length);
  for (const row of result.summary.definitionChangesWithoutManuscriptTurns) assert.ok(row.part.endsWith('plus'));
});
test('All 147 earlier correction old/source/ID/position values and ledger metadata survive; original baseline reverts identically', () => {
  const before = JSON.parse(input.ledgerBytes), after = JSON.parse(result.outputs.at(-1).after);
  assert.deepEqual({ ...after, corrections: [] }, { ...before, corrections: [] });
  for (let i = 0; i < before.corrections.length; i++) {
    const old = before.corrections[i], next = after.corrections[i];
    assert.deepEqual({ ...next, new: old.new, reason: old.reason }, old);
  }
  assert.equal(after.corrections.length, 279);
});
test('Pure preparation does not mutate any caller inputs or Root STATIC_CORRECTIONS', () => {
  const value = JSON.stringify(input), corrections = JSON.stringify(loaded.deps.staticCorrections);
  prepare(); assert.equal(JSON.stringify(input), value); assert.equal(JSON.stringify(loaded.deps.staticCorrections), corrections);
});
test('Independent authored opening/example and section metadata edits survive selective synchronization', () => {
  const scripts = JSON.parse(input.manuscriptBytes.e4);
  const section = scripts.find(script => script.dialogue.some(turn => turn.source.kind === 'authored-example'));
  const authored = section.dialogue.find(turn => turn.source.kind === 'authored-example');
  authored.markdown += ' 다른 세션의 독립 도입 문장'; section.provenance.workerMetadata = { independent: 'preserve bytes' };
  const bad = { ...input, manuscriptBytes: { ...input.manuscriptBytes, e4: JSON.stringify(scripts, null, 4) + '\n' } }; bad.expected = expectedPins(bad);
  const prepared = prepare(bad).outputs.find(row => row.file.endsWith('/e4.json'));
  const after = JSON.parse(prepared.after).find(script => script.sectionKey === section.sectionKey);
  assert.deepEqual(after.provenance, section.provenance);
  assert.deepEqual(after.dialogue.find(turn => turn.source.kind === 'authored-example'), authored);
});
test('Stale candidate hash refused even when plan pin is refreshed', () => {
  const bad = structuredClone(input); bad.plan.candidateBankHash = '0'.repeat(64); bad.expected.planHash = contentHash(bad.plan);
  assert.throws(() => prepare(bad), /Candidate hash pin/);
});
test('Candidate content tampering is refused', () => {
  const bad = structuredClone(input); bad.candidateParts.e4.concepts[0].term += ' drift';
  assert.throws(() => prepare(bad), /candidate differs|Stale candidate/);
});
test('Stale original baseline hash refused', () => {
  const bad = structuredClone(input); bad.baseline.e4.concepts[0].definition += ' drift';
  assert.throws(() => prepare(bad), /Original baseline hash/);
});
test('Stale manuscript or correction byte pins refused', () => {
  const bad = { ...input, ledgerBytes: input.ledgerBytes + ' ' };
  assert.throws(() => prepare(bad), /ledger byte preimage/);
  assert.throws(() => prepare({ ...input, manuscriptBytes: { ...input.manuscriptBytes, e3: input.manuscriptBytes.e3 + ' ' } }), /Manuscript byte preimage/);
});
test('Stale correction new value rejected across entire ledger, including unrelated locations', () => {
  const ledger = JSON.parse(input.ledgerBytes); ledger.corrections[0].new += ' stale';
  const bad = { ...input, ledgerBytes: JSON.stringify(ledger) }; bad.expected = expectedPins(bad);
  assert.throws(() => prepare(bad, { ...loaded.deps, staticCorrections: ledger.corrections }), /Stale correction new/);
});
test('Duplicate correction position, missing location and moved provenance refused', () => {
  for (const fault of ['duplicate', 'missing', 'moved']) {
    const ledger = JSON.parse(input.ledgerBytes);
    if (fault === 'duplicate') ledger.corrections.push({ ...ledger.corrections[0], id: 'SC-999' });
    if (fault === 'missing') ledger.corrections[0].sectionKey = 'missing';
    if (fault === 'moved') ledger.corrections[0].source.entryId = 'moved';
    const bad = { ...input, ledgerBytes: JSON.stringify(ledger) }; bad.expected = expectedPins(bad);
    assert.throws(() => prepare(bad, { ...loaded.deps, staticCorrections: ledger.corrections }), /Duplicate correction|Missing ledger|Stale correction provenance/);
  }
});
test('Unchanged bank-concept source with independently edited text is refused, not overwritten', () => {
  const row = result.turnChanges.find(row => !JSON.parse(input.ledgerBytes).corrections.some(c => c.sectionKey === row.sectionKey && c.turnIndex === row.turnIndex));
  const code = row.entryId.slice(0, 2), scripts = JSON.parse(input.manuscriptBytes[code]);
  scripts.find(s => s.sectionKey === row.sectionKey).dialogue[row.turnIndex].markdown += ' independently authored';
  const bad = { ...input, manuscriptBytes: { ...input.manuscriptBytes, [code]: JSON.stringify(scripts) } }; bad.expected = expectedPins(bad);
  assert.throws(() => prepare(bad), /Independently changed bank text/);
});
test('Position/provenance drift on a changed bank turn is refused', () => {
  const row = result.turnChanges.find(row => !JSON.parse(input.ledgerBytes).corrections.some(c => c.sectionKey === row.sectionKey && c.turnIndex === row.turnIndex));
  const code = row.entryId.slice(0, 2), scripts = JSON.parse(input.manuscriptBytes[code]);
  scripts.find(s => s.sectionKey === row.sectionKey).dialogue[row.turnIndex].role = 'student2';
  const bad = { ...input, manuscriptBytes: { ...input.manuscriptBytes, [code]: JSON.stringify(scripts) } }; bad.expected = expectedPins(bad);
  assert.throws(() => prepare(bad), /provenance\/position/);
});
test('Definition before, duplicate IDs and reviewed content fingerprint mismatches refused', () => {
  for (const fault of ['before', 'duplicate', 'fingerprint']) {
    const bad = structuredClone(input);
    if (fault === 'before') bad.plan.definitionChanges[0].before += ' stale';
    if (fault === 'duplicate') bad.plan.definitionChanges.push(bad.plan.definitionChanges[0]);
    if (fault === 'fingerprint') bad.plan.definitionChanges[0].contentHash = '0'.repeat(64);
    bad.expected.planHash = contentHash(bad.plan);
    assert.throws(() => prepare(bad), /Definition before|Duplicate definition|review fingerprint/);
  }
});
test('Preliminary plans refused by final mode and by authoritative source-plan gate', () => {
  assert.throws(() => prepare({ ...input, mode: 'final' }), /Final compiler status/);
  assert.throws(() => loaded.deps.prepareBankSourceChanges({ plan: input.plan, baseline, sources: loaded.sources }));
});
test('Status relabeling without fresh compiler captures is refused', () => {
  const plan = { ...input.plan, status: FINAL_STATUS };
  const bad = { ...input, mode: 'final', plan }; bad.expected = expectedPins(bad);
  assert.throws(() => prepare(bad), /Fresh compiler capturedSources/);
});
test('Fresh compiler source byte mismatch and unresolved independent packet coverage refused', () => {
  const captures = [...loaded.captured.values()].slice(0, 7).map(({ file, sha256 }) => ({ file, sha256 }));
  const compilerSourceBytes = Object.fromEntries(captures.map(row => [row.file, fs.readFileSync(row.file, 'utf8')]));
  const plan = { ...input.plan, status: FINAL_STATUS, capturedSources: captures };
  const bad = { ...input, mode: 'final', plan, compilerSourceBytes }; bad.expected = expectedPins(bad);
  assert.throws(() => prepare({ ...bad, compilerSourceBytes: { ...compilerSourceBytes, [captures[0].file]: 'stale' } }), /Compiler input drift/);
  // This test deliberately has empty independentPackets. The actual source-plan must reject it.
  assert.throws(() => prepare(bad), /전 ID/);
});
test('CRLF and arbitrary harmless formatting survive token replacement', () => {
  const manuscriptBytes = Object.fromEntries(Object.entries(input.manuscriptBytes).map(([code, bytes]) => [code, bytes.replace(/\r?\n/g, '\r\n')]));
  const bad = { ...input, manuscriptBytes, ledgerBytes: input.ledgerBytes.replace(/\r?\n/g, '\r\n') }; bad.expected = expectedPins(bad);
  const crlf = prepare(bad);
  for (const output of crlf.outputs) assert.ok(!/(?<!\r)\n/.test(output.after), output.file);
});
test('Ambiguous duplicate JSON properties and stale question revision refused', () => {
  assert.throws(() => jsonLocations('{"markdown":"one","markdown":"two"}'), /Duplicate JSON property/);
  const plan = { ...input.plan, revision: 'stale-question-revision' };
  const bad = { ...input, plan }; bad.expected = expectedPins(bad);
  assert.throws(() => prepare(bad), /question revision mismatch/);
});
test('CLI rejects existing helper output and production output paths before any writes', () => {
  const replay = path.join(path.dirname(fileURLToPath(import.meta.url)), 'replay.mjs');
  for (const out of [fixture, path.join(loaded.root, 'src/lib/textbook/scripts/prepared')]) {
    const child = spawnSync(process.execPath, [replay, '--preliminary', '--out', out], { encoding: 'utf8' });
    assert.notEqual(child.status, 0); assert.match(child.stderr, /Output must be NEW/);
  }
  const adoption = path.join(path.dirname(fileURLToPath(import.meta.url)), 'verify-adoption.mjs');
  const child = spawnSync(process.execPath, [adoption, '--prepared', fixture], { encoding: 'utf8' });
  assert.notEqual(child.status, 0); assert.match(child.stderr, /Preliminary output cannot be checked/);
});
verifyCaptured(loaded);
const evidence = { status: 'Preliminary technical tests only; no final compile, independent semantic approval or activation', fixture, rootCommit: loaded.rootCommit,
  passed: results.filter(row => row.status === 'passed').length, failed: results.filter(row => row.status === 'failed').length, results };
const destination = path.join(fixture, 'tests-' + Date.now() + '.json');
fs.writeFileSync(destination, JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ ...evidence, results: results.map(({ name, status, error }) => ({ name, status, error })), report: destination }, null, 2));
if (evidence.failed) process.exitCode = 1;
