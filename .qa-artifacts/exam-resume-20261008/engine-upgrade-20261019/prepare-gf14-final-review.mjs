import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { sha256 } from '../../../scripts/import/exam-twin/candidatePack.mjs';
const base = '.qa-artifacts/exam-resume-20261008/';
const source = base + 'gyeongsang-remaining-final14-r1/';
const raw = base + 'gyeongsang-independent-20261019-r2/';
const dest = base + 'gyeongsang-final-review-20261019-r2/';
assert(!fs.existsSync(dest));
const rawCommit = execFileSync('git', ['rev-parse', '9870f836a'], { encoding: 'utf8' }).trim();
execFileSync('git', ['merge-base', '--is-ancestor', rawCommit, 'HEAD']);
const summary = JSON.parse(fs.readFileSync(raw + 'proof-summary.json'));
assert.equal(summary.solved, 14); assert.equal(summary.pending, 0);
const copies = [];
function copy(a, b) {
  if (fs.statSync(a).isDirectory()) {
    fs.mkdirSync(b, { recursive: true });
    for (const f of fs.readdirSync(a)) copy(path.join(a, f), path.join(b, f));
  } else {
    const bytes = fs.readFileSync(a); fs.writeFileSync(b, bytes, { flag: 'wx' });
    assert.equal(sha256(fs.readFileSync(b)), sha256(bytes));
    copies.push({ original: a, copy: b, sha256: sha256(bytes) });
  }
}
copy(source + 'package', dest + 'package');
copy(raw + 'blind', dest + 'blind');
copy(source + 'blind/blind-manifest.json', dest + 'blind/blind-manifest.json');
copy(raw + 'solve', dest + 'blind/solve');
for (const p of summary.proofs) assert.equal(sha256(fs.readFileSync(path.join(raw, p.path))), p.sha256);
execFileSync(process.execPath, ['scripts/import/exam-twin/review-exam-twins.mjs', 'verify-pack', dest + 'package', dest + 'blind', dest + 'verification'], { stdio: 'inherit' });
fs.writeFileSync(dest + 'pre-exposure-seal-receipt-r1.json', JSON.stringify({
  kind: 'pre-exposure-seal-receipt/v1', createdAt: new Date().toISOString(), rawCommit,
  rawCommitVerifiedAgainstGit: true, rawProofSummarySha256: sha256(fs.readFileSync(raw + 'proof-summary.json')),
  copiedRawBytesUnchanged: true, authorExposureAllowedOnlyAfterRawCommit: true,
  actualExposureDisclosure: summary.actualExposureDisclosure, copies,
  mathematicalApproval: false, gradeApproval: false, loadable: false,
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ rawCommit, rawCount: summary.proofs.length, copies: copies.length, loadable: 0 }));
