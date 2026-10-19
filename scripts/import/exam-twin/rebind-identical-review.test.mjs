import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { rebindIdenticalReview } from './rebind-identical-review.mjs';
import { prepareSealedReview } from './prepare-sealed-review.mjs';
import { currentPackage } from './review-exam-twins.mjs';
import { bindCandidate, digest, readJson, sha256, REVIEW_CHECKS, SURFACES } from './candidatePack.mjs';

const cli = fileURLToPath(new URL('./review-exam-twins.mjs', import.meta.url));
const rebindCli = fileURLToPath(new URL('./rebind-identical-review.mjs', import.meta.url));
const write = (p, x) => fs.writeFileSync(p, JSON.stringify(x, null, 2) + '\n', 'utf8');
function hashes(root) {
  const out = {};
  const visit = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) visit(p); else out[path.relative(root, p)] = sha256(fs.readFileSync(p)); } };
  visit(root); return out;
}
function fixture(status = 'pending', count = 1) {
  const parent = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(parent, 'identical-review-test-'));
  const p = (...args) => path.join(root, ...args);
  const run = (...args) => execFileSync(process.execPath, [cli, ...args], { cwd: root, stdio: 'pipe' });
  const git = (...args) => execFileSync('git', ['-c', 'core.hooksPath=NUL', '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', ...args], { cwd: root, stdio: 'pipe' });
  fs.mkdirSync(p('author'));
  fs.mkdirSync(p('raw'));
  const candidate = { schemaVersion: 1, questionNumber: 1, twinExternalId: 'exam-twin-synthetic-rebind-q01', authorId: 'synthetic-author', content: '합성 조건에서 제곱근의 값을 고르시오.', choices: ['1','2','3','4','5'], answer: '③', solution: '합성 조건의 세 번째 보기를 선택한다. 실제 승인이 아니다.', questionType: '객관식', score: 3,
    figureArtifacts: [{ role: 'stem', specPath: 'figure.json', svgPath: 'figure.svg', intendedWidthMm: 50 }],
    variantDelta: { modes: ['inverse-target'], before: 'synthetic source', after: 'synthetic inverse', sharedConcept: 'synthetic roots', sharedProcedure: 'synthetic sign choice' },
    curriculumReview: { grade: '중3', edition: '2015', status: 'author-proposed', standardCodes: ['9수01-07'] }, sourceReference: { externalId: 'synthetic-source', sourceContentSha256: 'a'.repeat(64) },
    metadata: { grade: '중3', curriculum: { sourceExam: '2015', target: '2015' }, sourceExamYear: 2025, questionType: '객관식', score: 3, difficultyProposal: '기본', difficultyStatus: 'pending', problemTypeProposal: '계산', problemTypeStatus: 'pending', assignment: { status: 'pending', unitId: null, familyKey: null, evidence: 'synthetic unresolved family' } } };
  write(p('author/candidate.json'), candidate);
  write(p('author/figure.json'), {});
  fs.writeFileSync(p('author/figure.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0 L10 10"/></svg>', 'utf8');
  if (count === 2) write(p('author/second.json'), { ...candidate, questionNumber: 2, twinExternalId: 'exam-twin-synthetic-rebind-q02' });
  run('freeze', p('intermediate'), p('author/candidate.json'), ...(count === 2 ? [p('author/second.json')] : []));
  run('freeze', p('old/package'), p('intermediate/private/q01/candidate.json'), ...(count === 2 ? [p('intermediate/private/q02/candidate.json')] : []));
  run('blind', p('old/package'), p('old/blind'));
  const b = currentPackage(p('old/package')).bindings[0];
  const solve = { studentDigest: b.studentDigest, solverId: 'synthetic-independent', answer: '③', solution: 'Readable 합성 독립 풀이, no actual mathematical approval.', evidence: 'Synthetic fixture only', status: 'solved' };
  write(p('raw/q01.json'), solve); write(p('old/blind/solve/q01.json'), solve);
  if (count === 2) {
    const second = currentPackage(p('old/package')).bindings[1];
    const secondSolve = { ...solve, studentDigest: second.studentDigest };
    write(p('raw/q02.json'), secondSolve); write(p('old/blind/solve/q02.json'), secondSolve);
  }
  git('init', '--quiet'); git('add', '.'); git('commit', '--quiet', '-m', 'Synthetic sealed proof');
  const rawCommit = git('rev-parse', 'HEAD').toString('utf8').trim();
  prepareSealedReview(p('old/package'), p('old/blind'), rawCommit, p('raw'), p('old/verification'), root);
  const report = { status, studentDigest: b.studentDigest, candidateDigest: b.candidateDigest, assetDigest: b.assetDigest, method: 'independent-solve-then-review', verifierId: 'synthetic-verifier', solveDigest: digest(solve), checks: Object.fromEntries(REVIEW_CHECKS.map((k) => [k, k !== 'unitFamilyFit'])), evidence: { reason: 'Synthetic test only; not a real review', rights: 'held', native: 'held' }, curriculumSurfaces: Object.fromEntries(SURFACES.map((k) => [k, { status: 'passed', evidence: 'Synthetic fixture' }])) };
  if (status === 'rejected') report.checks.answerCorrect = false;
  write(p('old/verification/reports/q01.json'), report);
  if (count === 2) {
    const second = currentPackage(p('old/package')).bindings[1];
    write(p('old/verification/reports/q02.json'), { ...report, studentDigest: second.studentDigest, candidateDigest: second.candidateDigest, assetDigest: second.assetDigest, solveDigest: digest(readJson(p('raw/q02.json'))) });
  }
  const selection = { questions: [{ n: 1, id: candidate.twinExternalId, candidate: p('author/candidate.json'), sha256: sha256(fs.readFileSync(p('author/candidate.json'))) }] };
  if (count === 2) selection.questions.unshift({ n: 2, id: 'exam-twin-synthetic-rebind-q02', candidate: p('author/second.json'), sha256: sha256(fs.readFileSync(p('author/second.json'))) });
  write(p('selection.json'), selection);
  const options = { oldRoot: p('old'), selectionIndex: p('selection.json'), rawCommit, rawSolveDir: p('raw'), newRoot: p('new'), workspace: root };
  const snapshot = hashes(p('old'));
  const updateAuthor = (change) => { const c = readJson(p('author/candidate.json')); change(c); write(p('author/candidate.json'), c); selection.questions[0].sha256 = sha256(fs.readFileSync(p('author/candidate.json'))); write(p('selection.json'), selection); };
  const clean = () => { const target = fs.realpathSync(root); assert.equal(path.dirname(target), parent); assert(path.basename(target).startsWith('identical-review-test-')); fs.rmSync(target, { recursive: true }); };
  return { root, p, options, snapshot, updateAuthor, selection, clean };
}
function unchanged(f) { assert.deepEqual(hashes(f.p('old')), f.snapshot); }
function rejected(f, pattern = /NEW_REVIEW_REQUIRED/) {
  assert.throws(() => rebindIdenticalReview(f.options), (e) => e.code === 'NEW_REVIEW_REQUIRED' && pattern.test(e.message));
  assert(!fs.existsSync(f.p('new/verification/reports/q01.json')));
  unchanged(f);
}

test('nested freeze rebinds original author by ID, preserves raw/report bytes and all holds', () => {
  const f = fixture(); try {
    // Different author JSON serialization is allowed, but private bytes must match.
    fs.writeFileSync(f.p('author/candidate.json'), JSON.stringify(readJson(f.p('author/candidate.json'))), 'utf8');
    f.selection.questions[0].sha256 = sha256(fs.readFileSync(f.p('author/candidate.json'))); write(f.p('selection.json'), f.selection);
    const r = rebindIdenticalReview(f.options);
    assert.equal(r.rows.length, 1); assert.equal(r.rows[0].reportStatus, 'pending');
    assert.equal(r.rows[0].authoredInput.path, fs.realpathSync(f.p('author/candidate.json')));
    assert.equal(r.rows[0].authoredInput.sha256, f.selection.questions[0].sha256);
    assert.equal(r.currentPackageDigest, r.oldPackageDigest);
    assert.equal(r.newMathApprovals, 0); assert.equal(r.newGradeApprovals, 0); assert.equal(r.loadable, 0);
    assert.deepEqual(fs.readFileSync(f.p('new/verification/reports/q01.json')), fs.readFileSync(f.p('old/verification/reports/q01.json')));
    assert.deepEqual(r.beforeAudit.results[0].reasons, r.afterAudit.results[0].reasons);
    assert(r.afterAudit.results[0].reasons.includes('native-exam-twin-provenance-not-implemented'));
    unchanged(f);
    assert.throws(() => rebindIdenticalReview(f.options), /overwrite/);
  } finally { f.clean(); }
});
test('rejected report remains rejected without new math approval', () => {
  const f = fixture('rejected'); try { const r = rebindIdenticalReview(f.options); assert.equal(r.rows[0].reportStatus, 'rejected'); assert.equal(r.afterAudit.mathematicalVerified, 0); assert(r.afterAudit.results[0].reasons.includes('review-status-rejected')); unchanged(f); } finally { f.clean(); }
});
test('reordered multi-question selection binds by exact ID, never array position', () => {
  const f = fixture('pending', 2); try {
    const r = rebindIdenticalReview(f.options);
    assert.deepEqual(r.rows.map((x) => x.n), [2, 1]);
    for (const row of r.rows) {
      assert.equal(row.authoredInput.sha256, f.selection.questions.find((q) => q.id === row.id).sha256);
      assert.equal(row.reportSha256, sha256(fs.readFileSync(f.p('old/verification/reports', `q0${row.n}.json`))));
    }
    unchanged(f);
  } finally { f.clean(); }
});
for (const [label, change] of [
  ['source metadata with same student payload', (c) => { c.sourceReference.externalId = 'different-source'; }],
  ['answer', (c) => { c.answer = '④'; }],
  ['solution', (c) => { c.solution += ' Changed explanation.'; }],
  ['classification metadata', (c) => { c.metadata.difficultyProposal = '응용'; }],
  ['grade standard metadata', (c) => { c.curriculumReview.standardCodes = ['9수01-10']; }],
]) test(`changed ${label} requires NEW review even with current SHA`, () => {
  const f = fixture(); try { const before = bindCandidate(f.p('author/candidate.json')).studentDigest; f.updateAuthor(change); if (label.startsWith('source')) assert.equal(bindCandidate(f.p('author/candidate.json')).studentDigest, before); rejected(f, /Entire private candidate bytes changed/); } finally { f.clean(); }
});
test('changed asset bytes require NEW review', () => {
  const f = fixture(); try { fs.appendFileSync(f.p('author/figure.svg'), '\n'); rejected(f, /assetDigest|candidateDigest/); } finally { f.clean(); }
});
test('wrong exact ID cannot match by question number', () => {
  const f = fixture(); try { f.selection.questions[0].id = 'exam-twin-other-q01'; write(f.p('selection.json'), f.selection); rejected(f, /ID mismatch/); assert(!fs.existsSync(f.p('new'))); } finally { f.clean(); }
});
test('wrong raw author SHA fails before output', () => {
  const f = fixture(); try { f.selection.questions[0].sha256 = '0'.repeat(64); write(f.p('selection.json'), f.selection); rejected(f, /author raw SHA/); assert(!fs.existsSync(f.p('new'))); } finally { f.clean(); }
});
test('actual working raw must equal sealed Git blob', () => {
  const f = fixture(); try { fs.appendFileSync(f.p('raw/q01.json'), '\n'); rejected(f, /Working raw differs/); assert(!fs.existsSync(f.p('new'))); } finally { f.clean(); }
});
test('old blind raw must equal sealed Git blob', () => {
  const f = fixture(); try { fs.appendFileSync(f.p('old/blind/solve/q01.json'), '\n'); f.snapshot = hashes(f.p('old')); rejected(f, /Old blind raw differs|Independent solve was edited/); } finally { f.clean(); }
});
test('stale report candidate binding cannot be reused', () => {
  const f = fixture(); try { const r = readJson(f.p('old/verification/reports/q01.json')); r.candidateDigest = '0'.repeat(64); write(f.p('old/verification/reports/q01.json'), r); f.snapshot = hashes(f.p('old')); rejected(f, /Report candidateDigest/); } finally { f.clean(); }
});
test('output refuses input-tree, outside-workspace and dependency writes', () => {
  const f = fixture(); try { for (const newRoot of [f.p('old/extra'), path.join(f.root, '../escape'), f.p('node_modules/new'), f.p('raw/extra'), f.p('author/extra')]) { f.options.newRoot = newRoot; assert.throws(() => rebindIdenticalReview(f.options), /NEW_REVIEW_REQUIRED/); assert(!fs.existsSync(newRoot)); } unchanged(f); } finally { f.clean(); }
});
test('strict CLI rejects extra flags and exposes no writer mode', () => {
  const result = spawnSync(process.execPath, [rebindCli, '--apply'], { encoding: 'utf8' }); assert.equal(result.status, 1); assert.match(result.stderr, /NEW_REVIEW_REQUIRED/);
});
test('internal junction aliases cannot write into dependencies or old evidence', () => {
  const f = fixture(); try {
    fs.mkdirSync(f.p('node_modules'));
    for (const [alias, target] of [['deps-alias', f.p('node_modules')], ['old-alias', f.p('old')]]) {
      fs.symlinkSync(target, f.p(alias), process.platform === 'win32' ? 'junction' : 'dir');
      f.options.newRoot = f.p(alias, 'escape');
      assert.throws(() => rebindIdenticalReview(f.options), /junction aliases/);
      assert(!fs.existsSync(path.join(target, 'escape')));
    }
    unchanged(f);
  } finally { f.clean(); }
});
