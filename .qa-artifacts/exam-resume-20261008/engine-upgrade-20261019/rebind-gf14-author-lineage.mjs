import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { currentPackage } from '../../../scripts/import/exam-twin/review-exam-twins.mjs';
import { prepareSealedReview } from '../../../scripts/import/exam-twin/prepare-sealed-review.mjs';
import { readJson, sha256 } from '../../../scripts/import/exam-twin/candidatePack.mjs';
const base = '.qa-artifacts/exam-resume-20261008/';
const oldRoot = base + 'gyeongsang-final-review-20261019-r2/';
const root = base + 'gyeongsang-final-review-20261019-r3/';
const index = readJson(base + 'current-authored-batches-v14.json');
const selected = index.groups.find((g) => g.exam === 'Gyeongsang-remaining').candidates.filter((c) => c.questionNumber !== 18);
assert(!fs.existsSync(root));
const run = (...args) => execFileSync(process.execPath, ['scripts/import/exam-twin/review-exam-twins.mjs', ...args], { stdio:'pipe' });
run('freeze', root + 'package', ...selected.map((c) => c.candidate.path));
const before = currentPackage(oldRoot + 'package'), after = currentPackage(root + 'package');
assert.equal(before.bindings.length, 14); assert.equal(after.bindings.length, 14);
const rows = after.bindings.map((b, i) => {
  const old = before.bindings[i], current = selected.find((c) => c.twinExternalId === b.candidate.twinExternalId);
  assert(current);
  // Full frozen candidate digest includes answer, solution, metadata and assets.
  // No values or approval fields may change while redirecting the author lineage.
  for (const k of ['candidateDigest','studentDigest','assetDigest','candidateFileSha256']) assert.equal(b[k], old[k], 'Changed reviewed payload: ' + k);
  assert.equal(after.manifest.bindings[i].authoredInput.sha256, current.candidate.sha256);
  return { id: b.candidate.twinExternalId, questionNumber: b.candidate.questionNumber,
    oldIntermediateAuthorInput: before.manifest.bindings[i].authoredInput,
    actualOriginalAuthorInput: after.manifest.bindings[i].authoredInput,
    fullFrozenCandidateSha256: b.candidateFileSha256, candidateDigest: b.candidateDigest,
    studentDigest: b.studentDigest, assetDigest: b.assetDigest, allFrozenPayloadBytesUnchanged: true };
});
run('blind', root + 'package', root + 'blind');
assert.equal(sha256(fs.readFileSync(root+'blind/student-problems.json')), sha256(fs.readFileSync(oldRoot+'blind/student-problems.json')));
for (const c of selected) {
  const name = `q${String(c.questionNumber).padStart(2,'0')}.json`;
  fs.copyFileSync(base+'gyeongsang-independent-20261019-r2/solve/'+name, root+'blind/solve/'+name, fs.constants.COPYFILE_EXCL);
}
prepareSealedReview(root+'package', root+'blind', '9870f836a8221a23d4cea3c08b43af1e9c3f7891', base+'gyeongsang-independent-20261019-r2/solve', root+'verification');
const carriedReports = [];
for (const c of selected) {
  const name=`q${String(c.questionNumber).padStart(2,'0')}.json`;
  const source=oldRoot+'verification/reports/'+name, target=root+'verification/reports/'+name;
  fs.copyFileSync(source,target,fs.constants.COPYFILE_EXCL);
  assert.equal(sha256(fs.readFileSync(source)),sha256(fs.readFileSync(target)));
  carriedReports.push({original:source,current:target,sha256:sha256(fs.readFileSync(target)),newMathematicalReviewClaimed:false});
}
const receipt={kind:'identical-reviewed-payload-author-lineage-rebinding/v1',createdAt:new Date().toISOString(),
  reason:'Previous selected14 package was frozen from an intermediate private packet; strict original-author SHA selection correctly refused it. Direct freeze of actual original authors yields byte-identical reviewed private candidates and identical student/asset/raw digests.',
  oldPackageManifestSha256:sha256(fs.readFileSync(oldRoot+'package/manifest.json')),
  newPackageManifestSha256:sha256(fs.readFileSync(root+'package/manifest.json')),
  rows,carriedReports,oldFilesModified:false,newSolveOrContentChanges:false,newApprovalsInferred:false,loadable:0};
fs.writeFileSync(root+'author-lineage-rebinding.json',JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({directOriginalAuthorsBound:rows.length,fullFrozenPayloadsByteIdentical:true,originalReportsPreserved:true,newMathApprovals:0,loadable:0}));
