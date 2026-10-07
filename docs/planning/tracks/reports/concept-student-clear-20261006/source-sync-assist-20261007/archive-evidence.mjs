/** Archive the prepared evidence, never production files. Run from this owned artifact folder. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from './prepare-source-sync.mjs';

const artifact = path.dirname(fileURLToPath(import.meta.url));
const fixture = 'D:/tmp/source-sync-assist-ctx_de9caad71bd4-preliminary-3';
const gapFixture = 'D:/tmp/source-sync-assist-ctx_de9caad71bd4-preliminary-2';
const firstFixture = 'D:/tmp/source-sync-assist-ctx_de9caad71bd4-preliminary-1';
function copy(source, destination) {
  const bytes = fs.readFileSync(source), target = path.join(artifact, destination);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
  return { file: destination, bytes: bytes.length, sha256: sha256(bytes) };
}
const files = [];
for (const relative of ['output-manifest.json', 'input-byte-sha.json', 'changed-turns-reread.json', 'unchanged-segments.json'])
  files.push(copy(path.join(fixture, relative), 'evidence/' + relative));
const results = fs.readdirSync(fixture).filter(file => /^tests-\d+\.json$/.test(file)).sort();
const latest = results.at(-1);
const testResult = JSON.parse(fs.readFileSync(path.join(fixture, latest), 'utf8'));
assert.equal(testResult.failed, 0);
files.push(copy(path.join(fixture, latest), 'evidence/tests-final.json'));
const firstResults = fs.readdirSync(firstFixture).filter(file => /^tests-\d+\.json$/.test(file)).sort();
for (const file of firstResults) files.push(copy(path.join(firstFixture, file), 'evidence/initial-' + file));
const manifest = JSON.parse(fs.readFileSync(path.join(fixture, 'output-manifest.json'), 'utf8'));
const gapManifest = JSON.parse(fs.readFileSync(path.join(gapFixture, 'output-manifest.json'), 'utf8'));
fs.writeFileSync(path.join(artifact, 'evidence/reason-gaps.json'), JSON.stringify({ gaps: manifest.definitionReasonGaps,
  earlierGaps: gapManifest.definitionReasonGaps,
  resolution: 'Root supplied explicit coreReason and aligned its old goal; latest complete preliminary replay has no reason gaps; independent final recheck remains Root-owned' }, null, 2) + '\n');
const changed = JSON.parse(fs.readFileSync(path.join(fixture, 'changed-turns-reread.json'), 'utf8'));
const notes = { status: 'AI direct reread for source synchronization only; not all-ID mathematical approval',
  reader: 'Codex dispatched source-sync worker ctx_de9caad71bd4', actualTurnsRead: changed.length, actualSourceDefinitionsRead: new Set(changed.map(row => row.entryId)).size,
  batches: [[0, 34], [34, 68], [68, 102], [102, 136]].map(([start, end]) => ({ startInclusive: start, endExclusive: end, entries: changed.slice(start, end).map(row => ({ id: row.entryId, sectionKey: row.sectionKey, turnIndex: row.turnIndex })) })),
  findings: [
    'Every displayed before/after pair was reread against the actual source definition. The teacher explanation, plain check-answer and definition recitation turns keep their established framing.',
    'The e6 fraction definition, m2 repeating decimal and geometry explanations, and m3 real-root/trigonometric definitions carry the proposed source conditions into the actual manuscript text.',
    'No manuscript/source correspondence mismatch was found. This is not a per-ID mathematical adoption verdict; final current-question review and all 9119 independent approvals remain Root/Claude.',
    'All bank-example and authored-example turns, v15 dialogue, openings and source/presentation metadata retain their captured bytes.',
    'One unreasoned plus-part definition proposal was initially excluded and escalated. Root supplied its actual reason; the latest complete preliminary replay includes it. Five hundred six plus-part changes have no base-manuscript turns and are reported rather than inserted.'
  ] };
fs.writeFileSync(path.join(artifact, 'evidence/direct-reread-notes.json'), JSON.stringify(notes, null, 2) + '\n');
const provenance = { taskId: 'task_605f97309fc8', dispatchId: 'ctx_de9caad71bd4', rootCommit: manifest.rootCommit, fixture,
  preparedBefore: path.join(fixture, 'before/src/lib/textbook/scripts'), preparedAfter: path.join(fixture, 'after/src/lib/textbook/scripts'),
  finalCompilePerformed: false, productionFilesWritten: false, files };
fs.writeFileSync(path.join(artifact, 'evidence/delivery.json'), JSON.stringify(provenance, null, 2) + '\n');
console.log(JSON.stringify({ archived: files.length, passed: testResult.passed, failed: testResult.failed, fixture }, null, 2));
