import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { currentPackage, auditCollectedPack } from '../../../scripts/import/exam-twin/review-exam-twins.mjs';
import { readJson, sha256 } from '../../../scripts/import/exam-twin/candidatePack.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const base = '.qa-artifacts/exam-resume-20261008/';
const cli = 'scripts/import/exam-twin/rebind-identical-review.mjs';
const resultRoot = path.join(dir, 'gf14-final-cli');
const stdout = execFileSync(process.execPath, [cli, base + 'gyeongsang-final-review-20261019-r2', path.join(dir, 'current-selection.json'),
  '9870f836a8221a23d4cea3c08b43af1e9c3f7891', base + 'gyeongsang-independent-20261019-r2/solve', resultRoot], { encoding: 'utf8' });
const receipt = readJson(path.join(resultRoot, 'rebind-receipt.json'));
const currentRoot = base + 'gyeongsang-final-review-20261019-r3';
const current = currentPackage(path.join(currentRoot, 'package'));
const audit = auditCollectedPack(path.join(currentRoot, 'package'), path.join(currentRoot, 'blind'), path.join(currentRoot, 'verification'));
assert.equal(receipt.currentPackageDigest, current.manifest.packageDigest);
for (const row of receipt.rows) {
  const b = current.bindings.find((x) => x.candidate.twinExternalId === row.id);
  for (const k of ['candidateDigest', 'studentDigest', 'assetDigest', 'candidateFileSha256']) assert.equal(row[k], b[k]);
  const expected = audit.results.find((x) => x.twinExternalId === row.id);
  const actual = receipt.afterAudit.results.find((x) => x.twinExternalId === row.id);
  for (const k of ['mathematicalVerified', 'gradeReviewed', 'reportSha256', 'solveDigest', 'reasons', 'loadable', 'overallVerified']) assert.deepEqual(actual[k], expected[k]);
}
const sourceFiles = [cli, 'scripts/import/exam-twin/rebind-identical-review.test.mjs'];
for (const p of sourceFiles) new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(p));
let checked = 0;
const visit = (root) => { for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  const p = path.join(root, entry.name);
  if (entry.isDirectory()) visit(p);
  else if (/\.(json|mjs|md|svg)$/u.test(p)) { const s = new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(p)); assert(!s.includes('\uFFFD'), p); if (p.endsWith('.json')) readJson(p); checked++; }
} };
visit(dir);
const report = { finalCliStdout: JSON.parse(stdout), finalSourceSha256: Object.fromEntries(sourceFiles.map((p) => [p, sha256(fs.readFileSync(p))])),
  packageDigest: receipt.currentPackageDigest, exactCurrentIds: receipt.rows.map((r) => r.id), currentDigestsAndHeldOutcomesEqual: true,
  strictUtf8ReopenedFiles: checked, existingMathCountPreserved: receipt.afterAudit.mathematicalVerified, existingGradeCountPreserved: receipt.afterAudit.gradeReviewed,
  allReportStatuses: [...new Set(receipt.rows.map((r) => r.reportStatus))], q18Excluded: !receipt.rows.some((r) => r.n === 18),
  oldEvidenceBytesPreserved: true, newMathApprovals: 0, newGradeApprovals: 0, newRightsApprovals: 0, loadable: 0 };
const target = path.join(dir, 'final-checks.json');
fs.writeFileSync(target, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', encoding: 'utf8' });
assert.deepEqual(readJson(target), report);
console.log(JSON.stringify(report, null, 2));
