import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildEvidence, classify, inventory, isWithin, parseArgs, verifyFile, writeReports } from './inventory-local.mjs';

// Invented fixture only; no production source titles, identifiers, dialogue or hashes.
const ID = 'synthetic-private-source-identity';
const DIALOGUE = 'The observatory caretaker placed seventeen copper lanterns beside the eastern staircase while the volunteer carefully measured every handmade wooden container before the afternoon celebration began.';
const CONTROL = '.qa-artifacts/listening-retirement-20261006';

function fixture(t) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'listening-inventory-test-'));
  t.after(() => {
    assert.equal(path.dirname(temporary), os.tmpdir());
    assert.match(path.basename(temporary), /^listening-inventory-test-/);
    fs.rmSync(temporary, { recursive: true, force: true });
  });
  const main = path.join(temporary, 'main');
  fs.mkdirSync(main);
  const put = (relative, content = 'synthetic bytes', root = main) => {
    const target = path.join(root, relative);
    assert.equal(isWithin(temporary, target), true);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
    return target;
  };
  const corpus = { questionCount: 1, records: [{ sourceRecordId: ID, setId: 'synthetic-set-identity',
    questions: [{ prompt: DIALOGUE }], document: { groups: [] } }], transcripts: [] };
  const run = (extra = {}) => inventory({ main, corpus, validateGit: false,
    trackedByRoot: new Map([[main, new Set()]]), ...extra });
  return { temporary, main, put, corpus, run };
}

test('dry-run parser rejects deletion flags, duplicate/missing values, relative and filesystem roots', () => {
  const root = path.join(os.tmpdir(), 'explicit-project');
  assert.deepEqual(parseArgs(['--dry-run', '--main', root]), { dryRun: true, main: root, auditRoots: [] });
  for (const args of [['--main', root], ['--dry-run'], ['--dry-run', '--main', 'relative'],
    ['--dry-run', '--main', root, '--delete'], ['--dry-run', '--main', root, '--execute'],
    ['--dry-run', '--main', root, '--dry-run'], ['--dry-run', '--main', '--audit-root'],
    ['--dry-run', '--main', path.parse(root).root]]) assert.throws(() => parseArgs(args));
});

test('path containment rejects siblings, parent escape and alternate Windows drives', () => {
  assert.equal(isWithin('C:\\project', 'C:\\project-copy\\raw.json', path.win32), false);
  assert.equal(isWithin('C:\\project', 'C:\\project\\..\\outside\\raw.json', path.win32), false);
  assert.equal(isWithin('C:\\project', 'D:\\project\\raw.json', path.win32), false);
  assert.equal(isWithin('C:\\project', 'C:\\project\\output\\raw.json', path.win32), true);
});

test('inventory API also rejects filesystem roots in an audit-root argument', t => {
  const f = fixture(t);
  assert.throws(() => f.run({ auditRoots: [path.parse(f.main).root] }), /FILESYSTEM_ROOT_REJECTED/);
});

test('exact files are verified and sibling files are rejected', t => {
  const f = fixture(t);
  const file = f.put('output/listening-assessments/audio.mp3', '1234567');
  assert.equal(verifyFile(f.main, file).bytes, 7);
  const sibling = f.put('raw.json', '{}', path.join(f.temporary, 'main-copy'));
  assert.throws(() => verifyFile(f.main, sibling), /PATH_ESCAPE/);
});

test('junction traversal and a linked root cannot escape or import external files', t => {
  const f = fixture(t);
  const outside = path.join(f.temporary, 'outside');
  const secret = f.put('secret.json', DIALOGUE, outside);
  const output = path.join(f.main, 'output/listening-assessments');
  fs.mkdirSync(output, { recursive: true });
  const linked = path.join(output, 'linked');
  fs.symlinkSync(outside, linked, process.platform === 'win32' ? 'junction' : 'dir');
  const result = f.run();
  assert.equal(result.plan.deletionCandidates.length, 0);
  assert.equal(result.plan.protectedPaths.some(row => row.path === linked && row.reason === 'symlink-or-junction'), true);
  assert.equal(JSON.stringify(result.plan).includes(secret), false);
  assert.throws(() => verifyFile(f.main, path.join(linked, 'secret.json')), /LINK_PATH/);
  const linkedRoot = path.join(f.temporary, 'linked-root');
  fs.symlinkSync(f.main, linkedRoot, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => inventory({ main: linkedRoot, corpus: f.corpus, validateGit: false }), /LINK_PATH/);
});

test('discovers raw APIs, source media, paper crops, reconstructions and frozen path coverage', t => {
  const f = fixture(t);
  const audio = f.put('output/listening-assessments/source/audio.mp3');
  const asr = f.put('output/listening-assessments/source/asr.json', JSON.stringify({ text: DIALOGUE }));
  const prepared = f.put('output/listening-assessments/prepared/document.json', JSON.stringify({ prompt: DIALOGUE }));
  const alignment = f.put('output/listening-assessments/alignment/current.json', JSON.stringify({ id: ID }));
  const crop = f.put('output/listening-assessments/source/paper.png');
  const raw = f.put('.qa-artifacts/assemblyai-seek-synthetic/vendor-response.json', JSON.stringify({ text: DIALOGUE }));
  Object.assign(f.corpus.records[0], { sourceAudioPath: audio, asrPath: asr, preparedPath: prepared, alignmentPath: alignment });
  const result = f.run();
  assert.deepEqual(new Set(result.plan.deletionCandidates.map(row => row.path)), new Set([audio, asr, prepared, alignment, crop, raw]));
  for (const field of ['sourceAudioPath', 'asrPath', 'preparedPath', 'alignmentPath']) assert.deepEqual(result.summary.coverage[field], { expected: 1, verified: 1, missingOrExcluded: 0 });
  assert.equal(result.plan.deletionCandidates.every(row => Number.isInteger(row.bytes) && row.reason && path.isAbsolute(row.path)), true);
});

test('retains own samples, public runtime/models and project code while discovering clips elsewhere', t => {
  const f = fixture(t);
  const own = f.put('.qa-artifacts/listening-postgres/dialogue.wav');
  const sample = f.put('docs/listening-samples/20261003/samples.json', '{"dialogue":"our original synthetic dialogue"}');
  const visual = f.put('docs/listening-samples/visuals/ours.png');
  f.put('.qa-artifacts/whole-audio-seek-synthetic/ctc-venv/site-packages/model/raw.json', DIALOGUE);
  f.put('output/listening-assessments/native/models/weights.bin', 'public weights');
  const weight = f.put('output/listening-assessments/native/recognizer.safetensors', 'public weights');
  const script = f.put('output/listening-assessments/archive/worker.py', 'print("generic calculation")');
  const clip = f.put('.qa-artifacts/whole-audio-seek-synthetic/clips/native-mono.wav');
  const result = f.run();
  assert.deepEqual(result.plan.deletionCandidates.map(row => row.path), [clip]);
  for (const target of [own, sample, visual, weight, script]) assert.equal(result.plan.protectedPaths.some(row => row.path === target), true);
  assert.equal(result.summary.enumerated.excludedDirectories, 2);
});

test('protects pattern outputs, flags copied text inside them, and excludes live control inputs', t => {
  const f = fixture(t);
  const pattern = f.put('src/lib/english/listening/creation/assessment-patterns.json', '{"pattern":"two speakers compare three locations"}');
  const guide = f.put('docs/listening-production/PATTERN-GUIDE.md', 'Use role alternation and a delayed constraint.');
  const bad = f.put('scripts/qa/english-listening/pattern-learning/contaminated.json', JSON.stringify({ dialogue: DIALOGUE }));
  f.put('scripts/qa/english-listening/pattern-learning/node_modules/dependency/foreign.json', DIALOGUE);
  const input = f.put(`${CONTROL}/corpus-private.json`, JSON.stringify(f.corpus));
  const result = f.run();
  assert.equal(result.plan.deletionCandidates.length, 0);
  assert.equal(result.plan.ambiguities.some(row => row.path === bad && row.reason === 'protected-pattern-has-corpus-text'), true);
  for (const target of [pattern, guide, bad]) assert.equal(result.plan.protectedPaths.some(row => row.path === target), true);
  assert.equal(result.plan.protectedPaths.some(row => row.path === path.dirname(input) && row.reason === 'live-retirement-control'), true);
  assert.equal(result.plan.protectedPaths.some(row => row.reason === 'dependency-or-git'), true);
});

test('tracks copied fixtures separately and preserves active worktree material', t => {
  const f = fixture(t);
  const relative = 'scripts/qa/english-listening/old.test.mjs';
  const old = f.put(relative, `const original = ${JSON.stringify(DIALOGUE)};`);
  const worktree = path.join(f.temporary, 'worker');
  const copy = f.put('output/listening-assessments/source/audio.mp3', 'copy', worktree);
  const result = f.run({ auditRoots: [worktree], trackedByRoot: new Map([[f.main, new Set([relative])], [worktree, new Set()]]) });
  assert.equal(result.plan.deletionCandidates.length, 0);
  assert.equal(result.plan.trackedSourceReview[0].path, old);
  assert.equal(result.plan.worktreeMaterialReview[0].path, copy);
  assert.equal(result.plan.worktreeMaterialReview[0].disposition, 'preserve-active-worktree-root-review-only');
  assert.equal(fs.existsSync(copy), true);
});

test('unrelated scratch work survives and unproven task files remain ambiguous', t => {
  const f = fixture(t);
  const math = f.put('scratch/math/geometry.json', '{"shape":"tetrahedron"}');
  const pdf = f.put('tmp/pdfs/textbook.pdf');
  const unknown = f.put('.qa-artifacts/listening-storage-check/screenshot.png');
  const copied = f.put('scratch/listening-result.json', JSON.stringify({ text: DIALOGUE }));
  const result = f.run();
  assert.deepEqual(result.plan.deletionCandidates.map(row => row.path), [copied]);
  assert.equal(result.plan.ambiguities.some(row => row.path === unknown), true);
  for (const target of [math, pdf]) assert.equal(result.plan.protectedPaths.some(row => row.path === target), true);
});

test('own directories need exact copied text proof, and retained code identities are a separate review', t => {
  const f = fixture(t);
  const copied = f.put('.qa-artifacts/listening-postgres/accidental-copy.json', JSON.stringify({ text: DIALOGUE }));
  const code = f.put('scripts/qa/english-listening/operator.mjs', `const sampleId = '${ID}';`);
  const result = f.run({ trackedByRoot: new Map([[f.main, new Set(['scripts/qa/english-listening/operator.mjs'])]]) });
  assert.deepEqual(result.plan.deletionCandidates.map(row => row.path), [copied]);
  assert.equal(result.plan.sourceIdentityReview.some(row => row.path === code), true);
  assert.equal(result.plan.protectedPaths.some(row => row.path === code), true);
});

test('a corpus record does not prove ownership of media in another task subdirectory', t => {
  const f = fixture(t);
  f.put('.qa-artifacts/listening-playback-performance/source/result.json', JSON.stringify({ id: ID }));
  const unknown = f.put('.qa-artifacts/listening-playback-performance/synthetic/own-screenshot.png');
  const result = f.run();
  assert.equal(result.plan.deletionCandidates.some(row => row.path === unknown), false);
  assert.equal(result.plan.ambiguities.some(row => row.path === unknown), true);
});

test('frozen public runtime references remain explicitly excluded instead of falsely missing', t => {
  const f = fixture(t);
  const weight = f.put('output/listening-assessments/public/models/weights.bin');
  const reference = f.put('output/listening-assessments/public/recognizer.safetensors');
  const code = f.put('output/listening-assessments/private-venv/site-packages/asr.py');
  f.put('output/listening-assessments/inventory.json', JSON.stringify({ inputs: { modelPath: weight, weightPath: reference, runtimeFile: code } }));
  const result = f.run();
  assert.equal(result.plan.protectedReferences.some(row => row.path.toLowerCase() === weight.toLowerCase()), true);
  assert.equal(result.plan.protectedReferences.some(row => row.path.toLowerCase() === code.toLowerCase()), true);
  assert.equal(result.plan.limitations.length, 0);
  assert.equal(result.summary.references.protectedNotEnumerated, 2);
});

test('report writes reject a hardlink to an input rather than truncating it', t => {
  const f = fixture(t);
  const input = f.put(`${CONTROL}/corpus-private.json`, JSON.stringify(f.corpus));
  const report = path.join(f.main, CONTROL, 'local-deletion-plan-private.json');
  fs.linkSync(input, report);
  const before = fs.readFileSync(input, 'utf8');
  const result = f.run();
  assert.throws(() => writeReports(f.main, result.plan, result.summary), /HARDLINK_REPORT_REJECTED/);
  assert.equal(fs.readFileSync(input, 'utf8'), before);
});

test('reports contain only aggregates in retained summary and fail safely on a linked output', t => {
  const f = fixture(t);
  f.put('output/listening-assessments/source/private.json', JSON.stringify({ id: ID, text: DIALOGUE }));
  f.put(`${CONTROL}/keep.json`, '{}');
  const result = f.run();
  const summary = JSON.stringify(result.summary);
  for (const sensitive of [ID, DIALOGUE, f.main, 'private.json', 'sourceRecordId', 'sha256', 'http']) assert.equal(summary.includes(sensitive), false);
  writeReports(f.main, result.plan, result.summary);
  assert.equal(fs.existsSync(path.join(f.main, CONTROL, 'local-deletion-plan-private.json')), true);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.main, CONTROL, 'summary.json'))), result.summary);
  const protectedFile = f.put('outside.json', 'must survive', f.temporary);
  const report = path.join(f.main, CONTROL, 'local-deletion-plan-private.json');
  fs.unlinkSync(report);
  // Windows permits directory junctions without the file-symlink privilege.
  fs.symlinkSync(process.platform === 'win32' ? path.dirname(protectedFile) : protectedFile,
    report, process.platform === 'win32' ? 'junction' : 'file');
  assert.throws(() => writeReports(f.main, result.plan, result.summary));
  assert.equal(fs.readFileSync(protectedFile, 'utf8'), 'must survive');
});

test('evidence matching needs a long copied sequence and ignores short generic words', () => {
  const evidence = buildEvidence({ records: [{ sourceRecordId: ID, document: { text: DIALOGUE }, questions: [] }] });
  assert.equal(evidence.hasText(DIALOGUE.replaceAll(' ', '\n')), true);
  assert.equal(evidence.hasText('Thank you for listening.'), false);
  assert.equal(evidence.hasIdentity(`prefix ${ID} suffix`), true);
  assert.deepEqual(classify({ relative: 'src/lib/english/listening/generic.ts', scope: 'tracked-audit' }, { copiedText: false, sourceIdentity: false }), { action: 'protected', reason: 'project-code-without-confirmed-copied-text', privateIdentityReview: false });
});
