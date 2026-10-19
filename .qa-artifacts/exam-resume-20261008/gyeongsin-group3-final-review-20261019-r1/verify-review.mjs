/** Read existing q04 inputs; write only NEW scoped verification evidence. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { currentPackage, auditCollectedPack } from '../../../scripts/import/exam-twin/review-exam-twins.mjs';
import { bindCandidate, digest, readJson, sha256, REVIEW_CHECKS, SURFACES } from '../../../scripts/import/exam-twin/candidatePack.mjs';
import { compareWrittenAnswerPresentation } from '../../../scripts/import/exam-twin/answerPresentation.mjs';

const base = '.qa-artifacts/exam-resume-20261008/';
const root = base + 'gyeongsin-group3-final-review-20261019-r1/';
const review = base + 'gyeongsin-group3-review-20261019-r2/';
const authorPath = base + 'gyeongsin-authoring-group3-r2/q04.json';
const reportPath = review + 'verification/reports/q04.json';
const hash = (p) => sha256(fs.readFileSync(p));
const write = (p, x) => { fs.writeFileSync(p, JSON.stringify(x, null, 2) + '\n', { flag: 'wx', encoding: 'utf8' }); assert.deepEqual(readJson(p), x); };
const before = readJson(root + 'input-hashes-before.json');
for (const p of before) assert.equal(hash(p.path), p.sha256, `Changed pre-existing input: ${p.path}`);
const { manifest, bindings } = currentPackage(review + 'package');
assert.equal(bindings.length, 1);
const b = bindings[0], c = readJson(authorPath), author = bindCandidate(authorPath);
assert.equal(c.questionNumber, 4);
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
const rawCommit = 'd63cc2c5747e66ab61057646fb9182c40e2541a4';
const rawPath = base + 'gyeongsin-group3-clean-blind-20261019-r1/q04.json';
const blob = execFileSync('git', ['show', `${rawCommit}:${rawPath}`]);
assert.deepEqual(blob, fs.readFileSync(rawPath));
assert.deepEqual(blob, fs.readFileSync(review + 'blind/solve/q04.json'));
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
assert.equal(solve.answer, '(1) 18 cm; (2) 10 cm');
assert.deepEqual(c.choices, []);
assert.equal(c.questionType, '서술형');
assert.equal(c.score, 5);
assert(c.content.includes('[2점]') && c.content.includes('[3점]'));
const givens = c.content.match(/\d+/gu).map(Number);
assert.deepEqual(givens, [90, 6, 6, 1, 2, 2, 3]);
// Integer/rational arithmetic: no figure coordinates or special circle formula
// are used for the student solution or coordinate-free existence proof.
const pq = 6, radius = 6, qs = radius, qe = radius, pt = pq + qs, sum = pt + qe;
const numerator = pq ** 2 + sum ** 2, coefficient = 2 * sum;
assert.equal(numerator % coefficient, 0);
const pr = numerator / coefficient, qr = sum - pr, re = qr - qe, rt = pt - pr;
assert.deepEqual([sum, pr, qr, re, rt], [18, 10, 8, 2, 2]);
assert.equal(pr ** 2, pq ** 2 + qr ** 2);
assert.equal(re, rt);
assert(qs > 0 && re > 0 && rt > 0 && pr > 0 && radius > 0);
assert(0 < qe && qe < qr && 0 < pq && pq < pt && 0 < pr && pr < pt);
assert.deepEqual(report.evidence.exactConditionChecks.numberedAnswers,
  [{ part: 1, value: sum, unit: 'cm' }, { part: 2, value: pr, unit: 'cm' }]);
const qf = radius * pq / pt, rf = qr - qf, area = rf * (pq + radius) / 2;
const distance = 2 * area / pr, op2 = pt ** 2 + radius ** 2, ph2 = op2 - distance ** 2;
const ph = 12, ro2 = re ** 2 + radius ** 2, wrongSide = (pr + ph) ** 2 + distance ** 2;
assert.deepEqual([qf, rf, area, distance, op2, ph2, ro2, wrongSide], [3, 5, 30, 6, 180, 144, 40, 520]);
assert.equal(ph ** 2, ph2);
assert(ph > pr && ro2 !== wrongSide);
assert.deepEqual(report.evidence.exactConditionChecks.existenceWitness,
  { QFcm: qf, RFcm: rf, areaPORcm2: area, distanceToPRcm: distance, OPsquaredCm2: op2, PHcm: ph, ROsquaredCm2: ro2, wrongSideROsquaredCm2: wrongSide });
assert.equal(Object.keys(report.checks).length, REVIEW_CHECKS.length);
assert.equal(Object.keys(report.curriculumSurfaces).length, SURFACES.length);
assert.equal(report.checks.unitFamilyFit, false);
assert.equal(c.metadata.assignment.familyKey, null);
assert.equal(report.evidence.visualReadability.passed, false);
assert.equal(report.evidence.states.authoredContent, 'pending-visual-correction');
assert.equal(report.evidence.counts.authoredContentPassed, 0);
assert.equal(report.evidence.visualReadability.intendedWidthMm, 70);
assert(report.evidence.visualReadability.requiredCorrection.length > 0);
assert.equal(report.evidence.rubricReview.parts.reduce((total, p) => total + p.points, 0), 5);
for (const p of report.evidence.rubricReview.parts) assert.equal(p.proposedCriteria.reduce((total, x) => total + x.points, 0), p.points);
const officialRef = c.curriculumReview.officialProvisions;
assert.equal(hash(officialRef.path), officialRef.sha256);
const official = readJson(officialRef.path);
assert.equal(hash(official.paragraphSource.path), official.paragraphSource.sha256);
const primary = JSON.stringify(readJson(official.paragraphSource.path));
for (const p of report.evidence.curriculumAppropriate.provisions) {
  assert.equal(official.provisions.find((x) => x.id === p.id).text, p.text);
  assert(primary.includes(p.text));
  console.log('Actual official ID/text:', p.id, p.text);
}
const family = report.evidence.unitFamilyFit;
assert.equal(hash(family.snapshot), family.snapshotSha256);
const snapshot = readJson(family.snapshot);
assert.deepEqual(snapshot.liveFamilies.find((x) => x.family_key === family.closestExistingFamilyKey), family.closestLiveRow);
assert(snapshot.units.some((x) => x.id === family.unitId && x.grade === '중3' && x.semester === 2 && x.section === '원의 접선'));
assert.equal(family.recommendedFamilyKey, null);
const generator = fs.readFileSync('src/lib/middle/m3Tangent.ts', 'utf8');
const body = generator.slice(generator.indexOf('function m10Body('));
assert(body.includes('const ab = ad - b1;') && body.includes('const bc = b1 + c1;'));
assert(body.includes('2' + '\\'.repeat(2) + 'overline{AD}'));
assert(generator.includes('def("13", "직각삼각형의 내접원"'));
assert(fs.readFileSync('src/lib/middle/m3Top5b.ts', 'utf8').includes('function renderIncircle('));
// Figure fidelity is checked separately after the student answer was sealed.
// These exact spec coordinates never serve as the answer oracle.
const spec = readJson(review + 'package/private/q04/figure-1.spec.json');
const pts = spec.points, O = pts.O, R = spec.circles.c.radius;
const sub = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const norm = (v) => Math.hypot(...v);
const geometry = {};
for (const [name, tangent] of [['S', 'P'], ['E', 'Q'], ['T', 'P']]) {
  const radiusVector = sub(pts[name], O), tangentVector = sub(pts[tangent], pts[name]);
  geometry[name] = { radius: norm(radiusVector), perpendicularDot: dot(radiusVector, tangentVector) };
  assert.equal(geometry[name].radius, R);
  assert.equal(geometry[name].perpendicularDot, 0);
}
const rayParameter = (point, origin, direction) => dot(sub(point, origin), direction) / dot(direction, direction);
const pqVector = sub(pts.Q, pts.P), prVector = sub(pts.R, pts.P), qrVector = sub(pts.R, pts.Q);
const params = { SOnPQ: rayParameter(pts.S, pts.P, pqVector), TOnPR: rayParameter(pts.T, pts.P, prVector), EOnQR: rayParameter(pts.E, pts.Q, qrVector) };
assert.deepEqual(params, { SOnPQ: 2, TOnPR: 1.2, EOnQR: 0.75 });
assert.deepEqual(sub(pts.S, pts.P), pqVector.map((x) => 2 * x));
assert.deepEqual(sub(pts.T, pts.P), prVector.map((x) => 1.2 * x));
assert.deepEqual(sub(pts.E, pts.Q), qrVector.map((x) => 0.75 * x));
assert.equal(norm(sub(pts.Q, pts.P)), R);
assert.equal(norm(sub(pts.R, pts.P)) / R, pr / radius);
assert.equal(spec.labels.R.position, 'W');
assert.equal(spec.labels.T.position, 'N');
const svg = fs.readFileSync(review + 'package/private/q04/figure-1.svg', 'utf8');
assert(!/<image\b|data:image|경신|학교/u.test(svg));
const componentRef = c.sourceReference.componentObservation;
assert.equal(hash(componentRef.path), componentRef.sha256);
const component = readJson(componentRef.path);
assert.equal(component.question.number, 4);
assert.equal(component.oldWholePairStatus, 'hold_year_header_conflict');
assert.equal(component.wholePairCertified, false);
assert.equal(component.sourceIdentityApproved, false);
const audit = auditCollectedPack(review + 'package', review + 'blind', review + 'verification');
const presentation = compareWrittenAnswerPresentation(c.answer, solve.answer);
assert.equal(presentation.status, 'unsupported');
assert.equal(presentation.reason, 'Unique named assignment required');
// This evidence-only bounded parse does not override the production collector.
const parseLengths = (answer) => {
  const plain = answer.replace(/\$/g, '').replace(/\\,/g, '').replace(/\\mathrm\{cm\}/g, 'cm');
  const matches = [...plain.matchAll(/\(([12])\)\s*(\d+)\s*cm/gu)];
  assert.equal(matches.length, 2);
  assert.equal(plain.replace(/\(([12])\)\s*(\d+)\s*cm/gu, '').replace(/[;\s]/g, ''), '');
  return matches.map((m) => ({ part: Number(m[1]), value: Number(m[2]), unit: 'cm' }));
};
assert.deepEqual(parseLengths(c.answer), report.evidence.exactConditionChecks.numberedAnswers);
assert.deepEqual(parseLengths(solve.answer), parseLengths(c.answer));
assert.equal(audit.mathematicalVerified, 0);
assert.equal(audit.gradeReviewed, 0);
assert.equal(audit.overallVerified, 0);
assert.equal(audit.loadable, 0);
for (const reason of ['review-status-pending', 'independent-answer-mismatch', 'review-unitFamilyFit-not-passed', 'source-identity-held', 'taxonomy-held', 'rights-review-pending', 'similarity-review-pending', 'native-exam-twin-provenance-not-implemented']) assert(audit.results[0].reasons.includes(reason));
write(root + 'collected-result.json', audit);
for (const p of [reportPath, root + 'collected-result.json']) {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(p));
  assert(!text.includes('\uFFFD'));
}
assert(!fs.readFileSync(reportPath, 'utf8').includes('?'));
for (const p of before) assert.equal(hash(p.path), p.sha256);
write(root + 'validation.json', { kind: 'gyeongsin-group3-q04-stage2-validation/v1', reportSha256: hash(reportPath), rawProofSha256: sha256(blob), rawCommit,
  actualNumberedAnswer: solve.answer, strictUtf8Reopened: true, answers: [{ part: 1, value: sum, unit: 'cm' }, { part: 2, value: pr, unit: 'cm' }],
  exactArithmetic: { coefficient, numerator, pr, qr, re, rt, qf, rf, area, distance, op2, ph2, ro2, wrongSide },
  figureGeometryValidationOnly: { tangentContacts: geometry, orderParameters: params },
  contentGate: { passed: false, reason: 'R label needs clear separation from PR at 70mm; no correction or waiver applied', newAssetReviewRequired: true },
  familyGate: { assigned: false, recommendedFamilyKey: null, closestExistingFamilyKey: family.closestExistingFamilyKey, exactVariantFit: 'held' },
  generatorEvidence: [{ path: 'src/lib/middle/m3Tangent.ts', sha256: hash('src/lib/middle/m3Tangent.ts') }, { path: 'src/lib/middle/m3Top5b.ts', sha256: hash('src/lib/middle/m3Top5b.ts') }],
  immutableInputs: before.map((p) => ({ ...p, afterSha256: hash(p.path) })),
  rawProofCandidatePackageInputsUnchanged: true, officialIdsReopened: ['9수04-19', '9수04-16', '9수04-12', '9수02-12'],
  substantiveMathCount: 1, substantiveGradeCount: 1, formalCollectedMathCount: audit.mathematicalVerified, formalCollectedGradeCount: audit.gradeReviewed,
  presentationBinding: { authorAnswer: c.answer, rawAnswer: solve.answer, productionComparison: presentation, numberedValuesMatch: true, collectorOverride: false },
  authoredContentPassedCount: 0, fullCount: 0, loadable: 0, dbWrites: 0,
  sourceYearCustodyRightsSimilarityNativeHoldsPreserved: true, originalCropsCommitted: false });
console.log(JSON.stringify({ math: audit.mathematicalVerified, grade: audit.gradeReviewed, contentPassed: 0, full: 0, loadable: 0, contentHold: 'R-label correction', reasons: audit.results[0].reasons }, null, 2));
