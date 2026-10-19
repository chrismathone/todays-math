/** Scoped GF14 original-author lineage demo; outputs must all be NEW. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rebindIdenticalReview } from '../../../scripts/import/exam-twin/rebind-identical-review.mjs';
import { currentPackage, auditCollectedPack } from '../../../scripts/import/exam-twin/review-exam-twins.mjs';
import { readJson, sha256 } from '../../../scripts/import/exam-twin/candidatePack.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const base = '.qa-artifacts/exam-resume-20261008/';
const indexPath = base + 'current-authored-batches-v14.json';
const indexHash = sha256(fs.readFileSync(indexPath));
const index = readJson(indexPath);
const selected = index.groups.find((g) => g.exam === 'Gyeongsang-remaining').candidates.filter((c) => c.questionNumber !== 18);
assert.equal(selected.length, 14);
const selectionPath = path.join(dir, 'current-selection.json');
const selection = { questions: selected.map((c) => ({ n: c.questionNumber, id: c.twinExternalId, candidate: c.candidate.path, sha256: c.candidate.sha256 })) };
fs.writeFileSync(selectionPath, JSON.stringify(selection, null, 2) + '\n', { flag: 'wx', encoding: 'utf8' });
const currentRoot = base + 'gyeongsang-final-review-20261019-r3';
const currentManifestHash = sha256(fs.readFileSync(path.join(currentRoot, 'package/manifest.json')));
const current = currentPackage(path.join(currentRoot, 'package'));
const currentAudit = auditCollectedPack(path.join(currentRoot, 'package'), path.join(currentRoot, 'blind'), path.join(currentRoot, 'verification'));
const receipt = rebindIdenticalReview({ oldRoot: base + 'gyeongsang-final-review-20261019-r2', selectionIndex: selectionPath,
  rawCommit: '9870f836a8221a23d4cea3c08b43af1e9c3f7891', rawSolveDir: base + 'gyeongsang-independent-20261019-r2/solve', newRoot: path.join(dir, 'gf14-original-author') });
assert.equal(receipt.currentPackageDigest, current.manifest.packageDigest);
for (const row of receipt.rows) {
  const binding = current.bindings.find((b) => b.candidate.twinExternalId === row.id);
  for (const k of ['candidateDigest', 'studentDigest', 'assetDigest', 'candidateFileSha256']) assert.equal(row[k], binding[k]);
  const expected = currentAudit.results.find((r) => r.twinExternalId === row.id);
  const actual = receipt.afterAudit.results.find((r) => r.twinExternalId === row.id);
  for (const k of ['mathematicalVerified', 'gradeReviewed', 'reportSha256', 'solveDigest', 'loadable', 'overallVerified', 'reasons']) assert.deepEqual(actual[k], expected[k]);
}
assert.equal(sha256(fs.readFileSync(indexPath)), indexHash);
assert.equal(sha256(fs.readFileSync(path.join(currentRoot, 'package/manifest.json'))), currentManifestHash);
const result = { kind: 'gf14-identical-review-rebind-demo/v1', selected: 14, excludedQuestionNumbers: [18],
  currentIndex: { path: indexPath, sha256: indexHash }, comparedCurrentRoot: currentRoot, currentManifestSha256: currentManifestHash,
  packageDigest: receipt.currentPackageDigest, currentDigestsMatch: true, currentHeldOutcomesMatch: true,
  existingMathCountPreserved: receipt.afterAudit.mathematicalVerified, existingGradeCountPreserved: receipt.afterAudit.gradeReviewed,
  statuses: receipt.rows.map((r) => ({ id: r.id, n: r.n, status: r.reportStatus })),
  newMathApprovals: 0, newGradeApprovals: 0, newRightsApprovals: 0, loadable: 0,
  unchangedOldRawAndReportHashes: 'gf14-original-author/rebind-receipt.json',
  typesafe: { skill: '.agents/skills/typesafe-ai/SKILL.md', liveDocsRead: ['https://docs.typesafe.ai/llms.txt', 'https://docs.typesafe.ai/concepts/how-to-build-with-system-one.md'], implementation: 'Deterministic byte/digest/ID/Git comparisons only; no model calls' } };
const target = path.join(dir, 'demo-report.json');
fs.writeFileSync(target, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', encoding: 'utf8' });
assert.deepEqual(readJson(target), result);
console.log(JSON.stringify(result, null, 2));
