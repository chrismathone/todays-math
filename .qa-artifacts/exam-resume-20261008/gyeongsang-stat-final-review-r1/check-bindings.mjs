import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const root=path.dirname(fileURLToPath(import.meta.url)),repo=process.cwd();
const parent='C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008';
const {bindCandidate,digest,sha256,REVIEW_CHECKS,SURFACES}=await import(pathToFileURL(path.join(parent,'scripts/import/exam-twin/candidatePack.mjs')));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),hash=p=>sha256(fs.readFileSync(p));
const inputs=read(path.join(root,'evidence/verification/verification-inputs.json')),manifest=read(path.join(root,'evidence/verification/verification-manifest.json'));
assert.equal(hash(path.join(root,'evidence/verification/verification-inputs.json')),manifest.verificationInputsSha256);
const source=read(path.join(root,'evidence/source/questions.json'));const rows=[];
for(const r of inputs){
 const n=r.candidate.questionNumber,q=`q${String(n).padStart(2,'0')}`,file=path.join(parent,`.qa-artifacts/exam-resume-20261008/gyeongsang-stat-review-r1/package/private/${q}/candidate.json`),b=bindCandidate(file);
 assert.deepEqual(r.candidate,b.candidate);assert.deepEqual(read(path.join(root,`evidence/package/private/${q}/candidate.json`)),b.candidate);
 for(const key of ['studentDigest','candidateDigest','assetDigest'])assert.equal(r[key],b[key],key+' changed');
 const own=path.join(repo,`.qa-artifacts/exam-resume-20261008/gyeongsang-stat-review-r1/blind/solve/${q}.json`),parentSolve=path.join(parent,`.qa-artifacts/exam-resume-20261008/gyeongsang-stat-review-r1/blind/solve/${q}.json`),m=manifest.originalSolveFileHashes.find(x=>x.n===n);
 assert.equal(hash(own),m.sha256);assert.equal(hash(parentSolve),m.sha256);assert.deepEqual(read(own),r.independentSolve);assert.equal(digest(r.independentSolve),r.solveDigest);
 assert.notEqual(r.independentSolve.solverId,r.candidate.authorId);assert.equal(r.independentSolve.status,'solved');
 const s=source.questions.find(x=>x.number===n);assert.equal(s.sourceQuestionId,r.candidate.sourceReference.externalId);assert.equal(s.sourceContentDigest,r.candidate.sourceReference.sourceContentSha256);assert.equal(s.stem,r.candidate.variantDelta.before);
 assert.equal(hash(path.join(root,'evidence/source/questions.json')),r.candidate.sourceReference.sourcePacketSha256);
 rows.push({questionNumber:n,twinExternalId:b.candidate.twinExternalId,studentDigest:b.studentDigest,candidateDigest:b.candidateDigest,assetDigest:b.assetDigest,candidateFileSha256:b.candidateFileSha256,solveDigest:r.solveDigest,rawSolveSha256:m.sha256,sourceQuestionCanonicalDigest:digest(s),sourceStemRawSha256:sha256(s.stem),sourcePacketSha256:r.candidate.sourceReference.sourcePacketSha256,sourceDigestProvided:s.sourceContentDigest,sourceHashContractNote:'candidate sourceContentSha256 binds the supplied sourceContentDigest; it is not a raw-stem digest. before exactly matches safe stem; separate raw stem/whole row digests retained.',sourceReferenceImages:s.images,candidatePrivatePath:file,validation:b.validation});
}
const out={method:'exact parent candidatePack.mjs bindCandidate and digest(independentSolve);never Python object digest',allBindingsMatch:true,parentHelperSha256:hash(path.join(parent,'scripts/import/exam-twin/candidatePack.mjs')),requiredChecks:REVIEW_CHECKS,requiredSurfaces:SURFACES,rows};
const file=path.join(root,'evidence/bindings.json');if(fs.existsSync(path.join(root,'review-freeze.json')))assert.equal(fs.readFileSync(file,'utf8'),JSON.stringify(out,null,2)+'\n');else fs.writeFileSync(file,JSON.stringify(out,null,2)+'\n');
console.log('7 candidate/student/asset/solve/source bindings exact;raw solves unchanged and author-independent.');
