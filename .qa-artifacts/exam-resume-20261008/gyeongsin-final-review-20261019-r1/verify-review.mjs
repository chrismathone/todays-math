/** Read-only audits of existing inputs; only NEW scoped evidence outputs. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { currentPackage, auditCollectedPack } from '../../../scripts/import/exam-twin/review-exam-twins.mjs';
import { bindCandidate, digest, readJson, sha256, REVIEW_CHECKS, SURFACES } from '../../../scripts/import/exam-twin/candidatePack.mjs';

const base = '.qa-artifacts/exam-resume-20261008/';
const evidence = base + 'gyeongsin-final-review-20261019-r1/';
const review = base + 'gyeongsin-review-20261019-r2/';
const hash = (p) => sha256(fs.readFileSync(p));
const write = (p, x) => { fs.writeFileSync(p, JSON.stringify(x, null, 2) + '\n', { flag: 'wx', encoding: 'utf8' }); assert.deepEqual(readJson(p), x); };
const before = readJson(evidence + 'input-hashes-before.json');
for (const ref of before) assert.equal(hash(ref.path), ref.sha256, `Changed existing input: ${ref.path}`);
const { manifest, bindings } = currentPackage(review + 'package');
assert.equal(bindings.length, 1);
const b = bindings[0];
const c = readJson(base + 'gyeongsin-authoring-r2/q01.json');
const author = bindCandidate(base + 'gyeongsin-authoring-r2/q01.json');
assert.equal(hash(base + 'gyeongsin-authoring-r2/q01.json'), manifest.bindings[0].authoredInput.sha256);
assert.equal(author.studentDigest, b.studentDigest);
assert.equal(author.assetDigest, b.assetDigest);
const normalizedAuthor = structuredClone(c);
normalizedAuthor.figureArtifacts[0].specPath = 'figure-1.spec.json';
normalizedAuthor.figureArtifacts[0].svgPath = 'figure-1.svg';
assert.deepEqual(normalizedAuthor, b.candidate);
const inputs = readJson(review + 'verification/verification-inputs.json');
assert.equal(inputs.length, 1);
const reportPath = review + 'verification/reports/q01.json';
const report = readJson(reportPath);
for (const k of ['studentDigest', 'candidateDigest', 'assetDigest']) {
  assert.equal(b[k], inputs[0][k]);
  assert.equal(report[k], b[k]);
}
const rawPath = base + 'gyeongsin-clean-blind-20261019-r1/q01.json';
const blob = execFileSync('git', ['show', `d45f5e9732d2edd24a7e7931ff059936b53e0b1a:${rawPath}`]);
assert.deepEqual(blob, fs.readFileSync(rawPath));
assert.deepEqual(blob, fs.readFileSync(review + 'blind/solve/q01.json'));
const solve = readJson(rawPath);
assert.deepEqual(inputs[0].independentSolve, solve);
assert.equal(digest(solve), inputs[0].solveDigest);
assert.equal(report.solveDigest, digest(solve));
assert.equal(report.evidence.preExposureBinding.rawSha256, sha256(blob));
assert.equal(report.verifierId, solve.solverId);
assert.notEqual(report.verifierId, c.authorId);
assert.equal(solve.answer, c.answer);
assert.equal(solve.answer.codePointAt(0), 0x2462);
assert.equal(report.evidence.preExposureBinding.codePoint, 'U+2462');
const options = c.choices.map((s) => Number(s.match(/\d+/u)[0]));
const optionChecks = options.map((angle, i) => ({ choice: String.fromCodePoint(0x2460 + i), angleQPR: angle, givenAnglePQR: 67,
  forcedAnglePRQ: 180 - 67 - angle, isoscelesBaseAngle: (180 - angle) / 2, anglesPositive: angle > 0 && 180 - 67 - angle > 0,
  valid: 180 - 67 - angle === 67 }));
assert.deepEqual(optionChecks, report.evidence.choicesCorrect);
assert.equal(optionChecks.filter((x) => x.valid).length, 1);
assert.equal(optionChecks.find((x) => x.valid).choice, c.answer);
assert.equal(REVIEW_CHECKS.length, Object.keys(report.checks).length);
assert.equal(SURFACES.length, Object.keys(report.curriculumSurfaces).length);
assert.equal(report.checks.unitFamilyFit, false);
assert.equal(c.metadata.assignment.familyKey, null);
assert.equal(report.evidence.unitFamilyFit.recommendedFamilyKey, 'mid:3-2|원과 직선|06');
const officialRef = c.curriculumReview.officialProvisions;
assert.equal(hash(officialRef.path), officialRef.sha256);
const official = readJson(officialRef.path);
assert.equal(hash(official.paragraphSource.path), official.paragraphSource.sha256);
const primary = JSON.stringify(readJson(official.paragraphSource.path));
for (const provision of report.evidence.curriculumAppropriate.provisions) {
  const actual = official.provisions.find((x) => x.id === provision.id);
  assert(actual);
  assert.equal(actual.text, provision.text);
  assert(primary.includes(provision.text));
  console.log('Actual official ID/text:', provision.id, provision.text);
}
const family = report.evidence.unitFamilyFit;
assert.equal(hash(family.snapshot), family.snapshotSha256);
const snapshot = readJson(family.snapshot);
assert.deepEqual(snapshot.liveFamilies.find((x) => x.family_key === family.recommendedFamilyKey), family.liveSnapshotRow);
assert(snapshot.units.some((x) => x.id === family.unitId && x.grade === '중3' && x.semester === 2 && x.section === '원과 현'));
// Exact current branch text is recorded by file hash; do not execute a generator.
const generator = fs.readFileSync('src/lib/middle/m3.ts', 'utf8');
assert(generator.includes('const a = 2 * intBetween(rng, 20, 40);'));
assert(generator.includes('const x = (180 - a) / 2;'));
assert(46 >= 40 && 46 <= 80 && 46 % 2 === 0 && (180 - 46) / 2 === 67);
// Figure fidelity only, after the independent proof has been sealed. These
// coordinates never form a required student method or answer oracle.
const spec = readJson(review + 'package/private/q01/figure-1.spec.json');
const O = spec.points.O, radius = spec.circles.c.radius;
const points = Object.fromEntries(Object.entries(spec.points).map(([name, p]) => [name, Array.isArray(p) ? p :
  [O[0] + radius * Math.cos(p.angle * Math.PI / 180), O[1] - radius * Math.sin(p.angle * Math.PI / 180)]]));
const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const norm = (v) => Math.hypot(...v);
const geometry = ['M', 'N'].map((name, i) => {
  const end = points[i === 0 ? 'Q' : 'R'], foot = points[name], v = sub(end, points.P);
  const midpoint = points.P.map((x, k) => (x + end[k]) / 2);
  const row = { name, midpointRoundingError: norm(sub(foot, midpoint)), normalizedPerpendicularDot: Math.abs(dot(sub(foot, O), v)) / (norm(sub(foot, O)) * norm(v)), centerDistance: norm(sub(foot, O)) };
  assert(row.midpointRoundingError < 0.01);
  assert(row.normalizedPerpendicularDot < 0.0003);
  return row;
});
assert(Math.abs(geometry[0].centerDistance - geometry[1].centerDistance) < 1e-9);
assert.equal(spec.angles.givenQ.label, '67°');
assert.equal(spec.angles.askedP.label, 'x');
assert(spec.angles.rightM.right && spec.angles.rightN.right);
const svg = fs.readFileSync(review + 'package/private/q01/figure-1.svg', 'utf8');
assert(!/<image\b|data:image|경신|학교/u.test(svg));
const audit = auditCollectedPack(review + 'package', review + 'blind', review + 'verification');
assert.equal(audit.mathematicalVerified, 1);
assert.equal(audit.gradeReviewed, 1);
assert.equal(audit.overallVerified, 0);
assert.equal(audit.loadable, 0);
assert(audit.results[0].reasons.includes('review-unitFamilyFit-not-passed'));
for (const reason of ['source-identity-held', 'taxonomy-held', 'rights-review-pending', 'similarity-review-pending', 'native-exam-twin-provenance-not-implemented']) assert(audit.results[0].reasons.includes(reason));
write(evidence + 'collected-result.json', audit);
for (const p of [reportPath, evidence + 'collected-result.json']) {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(p));
  assert(!text.includes('\uFFFD'));
}
const reportText = fs.readFileSync(reportPath, 'utf8');
assert(!reportText.includes('?'));
for (const ref of before) assert.equal(hash(ref.path), ref.sha256);
write(evidence + 'validation.json', { kind: 'gyeongsin-r2-independent-stage2-validation/v1', reportSha256: hash(reportPath), rawProofSha256: sha256(blob), rawCommit: 'd45f5e9732d2edd24a7e7931ff059936b53e0b1a',
  answer: solve.answer, answerCodePoint: 'U+2462', strictUtf8Reopened: true, optionChecks, figureGeometryValidationOnly: geometry,
  generatorEvidence: { path: 'src/lib/middle/m3.ts', sha256: hash('src/lib/middle/m3.ts'), lines: '225-246', exactConditionAndTargetReversalVerified: true },
  figureHelperEvidence: { path: 'src/lib/middle/m3Figures.ts', sha256: hash('src/lib/middle/m3Figures.ts'), lines: '135-172' },
  immutableInputs: before.map((r) => ({ ...r, afterSha256: hash(r.path) })),
  stage1ProofUnchanged: true, inputBindingsUnchanged: true, officialIdsReopened: ['9수04-19', '9수04-10'],
  mathCount: 1, gradeCount: 1, authoredContentReviewCount: 1, overallVerified: 0, loadable: 0, dbWrites: 0,
  sourceIdentityRightsSimilarityNativeApproved: false, familyAssigned: false });
console.log(JSON.stringify({ math: audit.mathematicalVerified, grade: audit.gradeReviewed, content: 1, overall: audit.overallVerified, loadable: 0, reasons: audit.results[0].reasons }, null, 2));
