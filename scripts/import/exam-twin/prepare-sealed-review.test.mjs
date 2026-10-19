import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { prepareSealedReview } from './prepare-sealed-review.mjs';
import { assertRawSolveReadable } from './candidatePack.mjs';

const cli = path.resolve('scripts/import/exam-twin/review-exam-twins.mjs');
function fixture(authorSelf = false) {
  const parent = fs.realpathSync('.qa-artifacts/exam-resume-20261008');
  const root = fs.mkdtempSync(path.join(parent, 'sealed-review-test-'));
  const write = (p, x) => fs.writeFileSync(path.join(root, p), JSON.stringify(x));
  const candidate = { schemaVersion: 1, questionNumber: 1, twinExternalId: 'exam-twin-synthetic-git-seal-q01', authorId: 'fixture-author', content: '합성 제곱근 조건을 확인하시오.', choices: ['1','2','3','4','5'], answer: '③', solution: '합성 통제이며 실제 문항 승인이 아니다.', questionType: '객관식', score: 3, figureArtifacts: [], variantDelta: { modes: ['inverse-target'], before: 'synthetic', after: 'synthetic', sharedConcept: 'synthetic', sharedProcedure: 'synthetic' }, curriculumReview: { grade: '중3', edition: '2015', status: 'author-proposed', standardCodes: ['9수01-07'] }, sourceReference: { externalId: 'synthetic-original', sourceContentSha256: 'a'.repeat(64) }, metadata: { grade: '중3', curriculum: { sourceExam: '2015', target: '2015' }, sourceExamYear: 2025, questionType: '객관식', score: 3, difficultyProposal: '기본', difficultyStatus: 'pending', problemTypeProposal: '계산', problemTypeStatus: 'pending', assignment: { status: 'pending', unitId: null, familyKey: null, evidence: 'synthetic hold' } } };
  write('candidate.json', candidate);
  const run = (...args) => execFileSync(process.execPath, [cli, ...args], { cwd: root, stdio: 'pipe' });
  run('freeze', 'package', 'candidate.json'); run('blind', 'package', 'blind');
  const students = JSON.parse(fs.readFileSync(path.join(root, 'blind/student-problems.json')));
  const solve = { studentDigest: students[0].studentDigest, solverId: authorSelf ? 'fixture-author' : 'fixture-independent', status: 'solved', answer: '③', solution: 'Synthetic independent control', evidence: 'Synthetic only; no actual grade/rights clearance' };
  fs.mkdirSync(path.join(root, 'raw')); write('raw/q01.json', solve); write('blind/solve/q01.json', solve);
  const git = (...args) => execFileSync('git', ['-c', 'core.hooksPath=NUL', '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', ...args], { cwd: root, stdio: 'pipe' });
  git('init', '--quiet'); git('add', '.'); git('commit', '--quiet', '-m', 'Synthetic raw seal');
  const commit = git('rev-parse', 'HEAD').toString('utf8').trim();
  const clean = () => { const target = fs.realpathSync(root); assert.equal(path.dirname(target), parent); assert(path.basename(target).startsWith('sealed-review-test-')); fs.rmSync(target, { recursive: true }); };
  return { root, commit, solve, write, clean, prepare: () => prepareSealedReview('package', 'blind', commit, 'raw', 'review', root) };
}

test('actual Git blob, working proof and blind proof bind before answer exposure', () => {
  const f = fixture(); try { const r = f.prepare(); assert.equal(r.proofs.length, 1); assert.equal(r.rawCommit, f.commit); assert.equal(r.personPriorExposureVerified, false); assert.equal(r.loadable, false); assert(fs.existsSync(path.join(f.root, 'review/verification-inputs.json'))); } finally { f.clean(); }
});
test('post-seal raw edits fail before creating answer-exposing outputs', () => {
  const f = fixture(); try { f.write('raw/q01.json', { ...f.solve, answer: '④' }); assert.throws(f.prepare, /sealed Git blob/); assert(!fs.existsSync(path.join(f.root, 'review'))); } finally { f.clean(); }
});
test('a mismatching blind copy cannot expose authored answers', () => {
  const f = fixture(); try { f.write('blind/solve/q01.json', { ...f.solve, answer: '④' }); assert.throws(f.prepare, /sealed Git blob/); assert(!fs.existsSync(path.join(f.root, 'review'))); } finally { f.clean(); }
});
test('an author-labelled raw proof cannot act as independent evidence', () => {
  const f = fixture(true); try { assert.throws(f.prepare, /Author cannot/); assert(!fs.existsSync(path.join(f.root, 'review'))); } finally { f.clean(); }
});
test('encoding-damaged answers or proofs cannot expose authored answers', () => {
  for (const answer of ['③', '③ 3', '③: 3', '③, QR=3 cm'])
    assert.doesNotThrow(() => assertRawSolveReadable({ answer, solution: 'Readable synthetic proof only' }, '객관식'));
  for (const broken of [{ answer: '?' }, { answer: '\uFFFD' }, { solution: 'a??=9; ??' }]) {
    const f = fixture(); try {
      const value = { ...f.solve, ...broken };
      f.write('raw/q01.json', value); f.write('blind/solve/q01.json', value);
      const git = (...args) => execFileSync('git', ['-c','core.hooksPath=NUL','-c','user.name=Fixture','-c','user.email=fixture@example.invalid',...args], { cwd:f.root, stdio:'pipe' });
      git('add','.'); git('commit','--quiet','-m','Synthetic damaged pre-exposure serialization');
      const commit = git('rev-parse','HEAD').toString('utf8').trim();
      assert.throws(() => prepareSealedReview('package','blind',commit,'raw','review',f.root), /damaged/);
      assert(!fs.existsSync(path.join(f.root,'review')));
    } finally { f.clean(); }
  }
});
