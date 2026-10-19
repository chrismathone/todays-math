/** Existing inputs are read-only; all outputs are NEW scoped review evidence. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { currentPackage, auditCollectedPack } from '../../../scripts/import/exam-twin/review-exam-twins.mjs';
import { bindCandidate, digest, readJson, sha256, REVIEW_CHECKS, SURFACES } from '../../../scripts/import/exam-twin/candidatePack.mjs';

const base = '.qa-artifacts/exam-resume-20261008/';
const root = base + 'gyeongsin-group2-final-review-20261019-r1/';
const review = base + 'gyeongsin-group2-review-20261019-r1/';
const authorPath = base + 'gyeongsin-authoring-group2-r1/q02.json';
const reportPath = review + 'verification/reports/q02.json';
const hash = (p) => sha256(fs.readFileSync(p));
const write = (p, x) => { fs.writeFileSync(p, JSON.stringify(x, null, 2) + '\n', { flag: 'wx', encoding: 'utf8' }); assert.deepEqual(readJson(p), x); };
const before = readJson(root + 'input-hashes-before.json');
for (const p of before) assert.equal(hash(p.path), p.sha256, `Existing input changed: ${p.path}`);
const { manifest, bindings } = currentPackage(review + 'package');
assert.equal(bindings.length, 1);
const b = bindings[0], c = readJson(authorPath), author = bindCandidate(authorPath);
assert.equal(c.questionNumber, 2);
assert.equal(hash(authorPath), manifest.bindings[0].authoredInput.sha256);
assert.equal(author.studentDigest, b.studentDigest);
assert.equal(author.assetDigest, b.assetDigest);
const normalized = structuredClone(c);
normalized.figureArtifacts[0].specPath = 'figure-1.spec.json';
normalized.figureArtifacts[0].svgPath = 'figure-1.svg';
assert.deepEqual(normalized, b.candidate);
const inputs = readJson(review + 'verification/verification-inputs.json');
assert.equal(inputs.length, 1);
const report = readJson(reportPath);
for (const k of ['studentDigest', 'candidateDigest', 'assetDigest']) {
  assert.equal(inputs[0][k], b[k]);
  assert.equal(report[k], b[k]);
}
const rawPath = base + 'gyeongsin-group2-clean-blind-20261019-r1/q02.json';
const rawCommit = '4c21bf9e5a7b965367a3102513b1d5dec761fedd';
const blob = execFileSync('git', ['show', `${rawCommit}:${rawPath}`]);
assert.deepEqual(blob, fs.readFileSync(rawPath));
assert.deepEqual(blob, fs.readFileSync(review + 'blind/solve/q02.json'));
const seal = readJson(review + 'verification/sealed-raw-commit.json');
assert.equal(seal.rawCommit, rawCommit);
assert.equal(seal.proofs[0].sha256, sha256(blob));
assert.equal(report.evidence.preExposureBinding.rawSha256, sha256(blob));
const solve = readJson(rawPath);
assert.deepEqual(solve, inputs[0].independentSolve);
assert.equal(report.solveDigest, digest(solve));
assert.equal(report.solveDigest, inputs[0].solveDigest);
assert.equal(report.verifierId, solve.solverId);
assert.notEqual(report.verifierId, c.authorId);
assert.equal(solve.answer, c.answer);
assert.equal(solve.answer.codePointAt(0), 0x2462);
assert.equal(report.evidence.preExposureBinding.answerCodePoint, 'U+2462');
const lengths = c.content.match(/\d+/gu).map(Number);
assert.deepEqual(lengths, [8, 8]);
const [radius, tk] = lengths, ot = radius + tk;
assert.equal(ot, 16);
assert.equal(ot / 2, radius);
assert.equal(radius / ot, 1 / 2);
const equilateralAngle = 180 / 3;
const requestedAngle = 180 - 90 - equilateralAngle;
assert.equal(requestedAngle, 30);
const optionChecks = c.choices.map((choice, i) => {
  const angle = Number(choice.match(/\d+/u)[0]), other = 180 - 90 - angle;
  return { choice: String.fromCodePoint(0x2460 + i), angleUTO: angle, rightAngleOUT: 90, forcedAngleUOT: other,
    requiredAngleUOT: equilateralAngle, anglesPositive: angle > 0 && other > 0, angleSum: angle + 90 + other, valid: other === equilateralAngle };
});
assert.deepEqual(optionChecks, report.evidence.choicesCorrect);
assert.equal(optionChecks.filter((x) => x.valid).length, 1);
assert.equal(optionChecks.find((x) => x.valid).choice, c.answer);
assert(c.solution.includes('\\sin\\angle UTO'));
assert(c.solution.includes('\\sin30^\\circ'));
assert(!/arcsin|asin\(|sin\^\{-1\}|사인법칙|코사인법칙/u.test(c.solution));
assert.equal(Object.keys(report.checks).length, REVIEW_CHECKS.length);
assert.equal(Object.keys(report.curriculumSurfaces).length, SURFACES.length);
assert.equal(report.checks.unitFamilyFit, false);
assert.equal(c.metadata.assignment.familyKey, null);
for (const surface of SURFACES) assert.equal(report.curriculumSurfaces[surface].status, 'passed');
const officialRef = c.curriculumReview.officialProvisions;
assert.equal(hash(officialRef.path), officialRef.sha256);
const official = readJson(officialRef.path);
assert.equal(hash(official.paragraphSource.path), official.paragraphSource.sha256);
const primary = JSON.stringify(readJson(official.paragraphSource.path));
for (const provision of report.evidence.curriculumAppropriate.provisions) {
  assert.equal(official.provisions.find((x) => x.id === provision.id).text, provision.text);
  assert(primary.includes(provision.text));
  console.log('Actual official ID/text:', provision.id, provision.text);
}
assert(primary.includes('삼각비 사이의 관계는 다루지 않는다.'));
assert(primary.includes('삼각비의 값은 0°에서 90°까지의 각도에 대한 것만 다룬다.'));
const family = report.evidence.unitFamilyFit;
assert.equal(hash(family.snapshot), family.snapshotSha256);
const snapshot = readJson(family.snapshot);
assert.deepEqual(snapshot.liveFamilies.find((x) => x.family_key === family.recommendedFamilyKey), family.liveSnapshotRow);
assert(snapshot.units.some((x) => x.id === family.unitId && x.grade === '중3' && x.semester === 2 && x.section === '원의 접선'));
const gen = fs.readFileSync('src/lib/middle/m3Tangent.ts', 'utf8');
const branch = gen.slice(gen.indexOf('def("07",'), gen.indexOf('const [pa, r, po]', gen.indexOf('def("07",')));
assert(branch.includes('const po = 2 * r;'));
assert(branch.includes('const r = intBetween(rng, 3, 10);'));
assert(branch.includes('sin 30'));
assert(radius >= 3 && radius <= 10 && ot === 2 * radius);
// Bound figure fidelity only, after sealing the independent geometric proof.
const spec = readJson(review + 'package/private/q02/figure-1.spec.json');
const O = spec.points.O, R = spec.circles.c.radius;
const points = Object.fromEntries(Object.entries(spec.points).map(([name, p]) => [name, Array.isArray(p) ? p :
  [O[0] + R * Math.cos(p.angle * Math.PI / 180), O[1] - R * Math.sin(p.angle * Math.PI / 180)]]));
const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const norm = (p) => Math.hypot(...p);
const geometry = { radius: R, OU: norm(sub(points.U, O)), OK: norm(sub(points.K, O)), KT: norm(sub(points.T, points.K)),
  OT: norm(sub(points.T, O)), KU: norm(sub(points.U, points.K)), tangentDot: dot(sub(O, points.U), sub(points.T, points.U)) };
for (const value of [geometry.OU, geometry.OK, geometry.KT, geometry.KU]) assert(Math.abs(value - R) < 1e-9);
assert(Math.abs(geometry.OT - 2 * R) < 1e-9);
assert(Math.abs(geometry.tangentDot) < 1e-8);
assert.deepEqual(points.K, O.map((v, i) => (v + points.T[i]) / 2));
assert(spec.angles.tangentRight.right);
assert.equal(spec.angles.tangentRight.vertex, 'U');
assert.equal(spec.angles.askedT.vertex, 'T');
assert.equal(spec.angles.askedT.label, 'x');
const svg = fs.readFileSync(review + 'package/private/q02/figure-1.svg', 'utf8');
assert(!/<image\b|data:image|경신|학교/u.test(svg));
const component = c.sourceReference.componentObservation;
assert.equal(hash(component.path), component.sha256);
const observation = readJson(component.path);
assert.equal(observation.question.number, 2);
assert.equal(observation.oldWholePairStatus, 'hold_year_header_conflict');
assert.equal(observation.wholePairCertified, false);
assert.equal(observation.sourceIdentityApproved, false);
const audit = auditCollectedPack(review + 'package', review + 'blind', review + 'verification');
assert.equal(audit.mathematicalVerified, 1);
assert.equal(audit.gradeReviewed, 1);
assert.equal(audit.overallVerified, 0);
assert.equal(audit.loadable, 0);
for (const reason of ['review-status-pending', 'review-unitFamilyFit-not-passed', 'source-identity-held', 'taxonomy-held', 'rights-review-pending', 'similarity-review-pending', 'native-exam-twin-provenance-not-implemented']) assert(audit.results[0].reasons.includes(reason));
write(root + 'collected-result.json', audit);
for (const p of [reportPath, root + 'collected-result.json']) {
  const t = new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(p));
  assert(!t.includes('\uFFFD'));
}
assert(!fs.readFileSync(reportPath, 'utf8').includes('?'));
for (const p of before) assert.equal(hash(p.path), p.sha256);
write(root + 'validation.json', { kind: 'gyeongsin-group2-q02-stage2-validation/v1', reportSha256: hash(reportPath), rawProofSha256: sha256(blob), rawCommit,
  answer: solve.answer, answerCodePoint: 'U+2462', strictUtf8Reopened: true, optionChecks,
  authorSineCheck: { radius, tk, ot, ratioNumerator: radius, ratioDenominator: ot, specialAngle: 30, inverseFunctionOrOutsideGradeIdentityRequired: false },
  figureGeometryValidationOnly: geometry, generatorEvidence: { path: 'src/lib/middle/m3Tangent.ts', sha256: hash('src/lib/middle/m3Tangent.ts'), branch: '07 mode 3', recommendation: family.recommendedFamilyKey, assignment: null },
  immutableInputs: before.map((p) => ({ ...p, afterSha256: hash(p.path) })), rawProofUnchanged: true, authoredCandidatePackageInputsUnchanged: true,
  officialIdsReopened: ['9수04-19', '9수04-17', '9수04-18'], mathCount: 1, gradeCount: 1, authoredContentReviewCount: 1, fullCount: 0, loadable: 0, dbWrites: 0,
  sourceHeaderYearCustodyRightsSimilarityNativeHoldsPreserved: true });
console.log(JSON.stringify({ math: audit.mathematicalVerified, grade: audit.gradeReviewed, content: 1, full: 0, loadable: 0, reasons: audit.results[0].reasons }, null, 2));
