import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
const root=path.dirname(fileURLToPath(import.meta.url)),repo=process.cwd();
const {bindCandidate,digest,sha256}=await import(pathToFileURL(path.join(repo,'scripts/import/exam-twin/candidatePack.mjs')));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),raw=p=>sha256(fs.readFileSync(p));
const write=(p,d)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n');};
assert(!fs.existsSync(path.join(root,'author-freeze.json')),'Already frozen: create a new revision rather than alter it.');
const receipt=read(path.join(root,'evidence/source-copy-receipt.json'));
const source=read(path.join(root,'evidence/source-provisional/questions.json'));
assert.equal(source.questions.length,23);
for(const e of receipt.entries){const p=path.resolve(repo,e.copied);assert(!path.relative(root,p).startsWith('..'));assert.equal(raw(p),e.sha256,'Frozen source copy drift: '+e.copied);}
const snapshot=read(path.join(root,'evidence/reference-snapshots/snapshot-bindings.json'));
// Snapshot-bindings uses its existing receipt shape; inspect every owned copied file.
const snapshotRows=Array.isArray(snapshot)?snapshot:(snapshot.files??snapshot.entries??snapshot.bindings);
assert(Array.isArray(snapshotRows),'Unknown snapshot receipt shape');
for(const e of snapshotRows){const p=e.copied??e.copy??e.copyPath??e.path;assert(p);const file=path.isAbsolute(p)?p:path.resolve(repo,p);assert.equal(raw(file),e.sha256??e.rawSha256);}
const rules=read(path.join(root,'evidence/repository-rules/receipt.json'));
for(const e of rules.files){assert.equal(raw(path.join(root,e.copyPath)),e.sha256);assert.equal(raw(path.join(repo,e.repositoryPath)),e.sha256,'Own integrated rule drift');}
const strict=read(path.join(root,'checks/strict-render.json'));
assert.equal(strict.results.length,20);
for(const e of strict.results){assert(e.ok&&e.strict&&e.local&&e.typeset);assert.deepEqual(e.droppedDimensions,[]);assert.equal(raw(path.join(root,e.spec)),e.specSha256);assert.equal(raw(path.join(root,e.svg)),e.svgSha256);}
const inspected=read(path.join(root,'evidence/visually-inspected-png-bindings.json'));
assert.equal(Object.keys(inspected.personallyInspected).length,22);
for(const [png,hash] of Object.entries(inspected.personallyInspected))assert.equal(raw(path.join(root,'qa',png)),hash,'Pixels changed after actual author inspection');
const layout=read(path.join(root,'checks/preview-layout.json'));assert.deepEqual(layout.networkRequests,[]);assert.equal(layout.results.length,22);assert(layout.results.every(r=>!r.mathOverflow.length));
const preflight=read(path.join(root,'checks/bindings-preflight.json'));
const index=[],students=[],previewBindings=[];
for(const q of fs.readdirSync(path.join(root,'candidates')).sort()){
  const file=path.join(root,'candidates',q,q+'.json');const b=bindCandidate(file),n=b.candidate.questionNumber;
  assert(n!==20&&n>=1&&n<=23);assert.equal(b.candidate.twinExternalId,`exam-twin-gyeonggu-2025-2-mid-author-r1-q${String(n).padStart(2,'0')}`);
  assert.equal(b.candidate.metadata.directUseAllowed,false);assert.equal(b.candidate.curriculumReview.status,'author-proposed');
  assert.deepEqual(b.validation.surfaceKeywordViolations,[]);assert(b.validation.semanticGradeReviewStillRequired);
  const before=preflight.bindings.find(r=>r.questionNumber===n);
  for(const k of ['candidateDigest','assetDigest','studentDigest'])assert.equal(b[k],before[k]);
  const check=read(path.join(root,'checks',q+'.json'));assert.equal(check.candidateFileSha256,b.candidateFileSha256);assert.equal(check.status,'author-check-passed');assert.equal(check.independentVerification,false);
  const src=source.questions.find(q=>q.number===n);assert.equal(src.sourceDigest,b.candidate.sourceReference.sourceDigest);assert.equal(sha256(src.stem),b.candidate.sourceReference.sourceContentSha256);
  for(const asset of b.assets){const dest=path.join(root,'review-ready',asset.studentPath);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(asset.sourceSvgPath,dest);assert.equal(raw(dest),asset.svgSha256);}
  students.push({...b.student,studentDigest:b.studentDigest});
  previewBindings.push({questionNumber:n,candidateDigest:b.candidateDigest,studentDigest:b.studentDigest,assetDigest:b.assetDigest,authorPng:`qa/${q}-author.png`,authorPngSha256:raw(path.join(root,'qa',q+'-author.png')),studentPng:`qa/${q}-student.png`,studentPngSha256:raw(path.join(root,'qa',q+'-student.png')),actualColumnWidthMm:70,figureWidthsMm:b.assets.map(a=>a.intendedWidthMm),inspection:'personally inspected by author; not independent approval'});
  index.push({questionNumber:n,twinExternalId:b.candidate.twinExternalId,candidatePath:`candidates/${q}/${q}.json`,candidateFileSha256:b.candidateFileSha256,candidateDigest:b.candidateDigest,studentDigest:b.studentDigest,assetDigest:b.assetDigest,assetBindings:b.assets.map(({role,specSha256,svgSha256,intendedWidthMm})=>({role,specSha256,svgSha256,intendedWidthMm})),sourceDigestProvidedByPacket:src.sourceDigest,sourceQuestionCanonicalDigest:digest(src),sourceStemSha256:b.candidate.sourceReference.sourceContentSha256,sourcePacketSha256:raw(path.join(root,'evidence/source-provisional/questions.json')),authorCheckSha256:raw(path.join(root,'checks',q+'.json')),status:'author-proposed-awaiting-other-worker-blind-solve-and-review',unitProposal:b.candidate.metadata.assignment.unitId,familyProposal:b.candidate.metadata.assignment.familyKey,directUseAllowed:false});
}
assert.equal(index.length,22);assert.equal(new Set(index.map(i=>i.twinExternalId)).size,22);
assert.deepEqual(index.map(i=>i.questionNumber),Array.from({length:23},(_,i)=>i+1).filter(n=>n!==20));
const protectedRows=receipt.protectedPriorPaths.map(rel=>{
  const committed=execFileSync('git',['show',`${receipt.priorOwnCommit}:${rel}`],{cwd:repo,maxBuffer:8*1024*1024});const now=fs.readFileSync(path.join(repo,rel));assert.equal(sha256(now),sha256(committed),'Prior owned evidence altered: '+rel);return {path:rel,sha256:sha256(now),unchanged:true};
});
assert.equal(protectedRows.length,75);
write(path.join(root,'checks/preservation.json'),{priorOwnCommit:receipt.priorOwnCommit,ownIntegrationCommit:receipt.integrationLocalCommit,protectedFiles:protectedRows.length,unchanged:true,scope:'prior owned authored candidates/assets/notes, solves, reviews, taxonomy; coordinator index may legitimately update through authorized merge',files:protectedRows});
write(path.join(root,'checks/visual-author-review.json'),{authorId:'orca-codex-exam-twin-author-geometry-20261008',independentVerification:false,actualWidthsChecked:true,sevenSurfaces:'candidate studentSurfaceReview is an author proposal; source/native/rights/grade gates remain pending',refinements:['q14 M label moved inside near actual foot after rendered inspection','q16 B label moved below actual circle intersection','q05 comparison organized as extrema removal then difference of remaining exact values','q11 two planar diagrams replace perspective view; first/second wording follows actual sequence'],bindings:previewBindings});
write(path.join(root,'review-ready/student-problems.json'),{schemaVersion:1,packetId:'gyeonggu-author-r1-student-22',grade:'중3',curriculum:'2015',sourceNumbersConsidered:23,excludedBeforeAuthoring:[20],instructions:'Student surfaces only. Other worker must independently solve before any author answer exposure.',questions:students});
write(path.join(root,'candidate-index.json'),{schemaVersion:1,authorId:'orca-codex-exam-twin-author-geometry-20261008',bindingContract:'candidatePack.mjs bindCandidate: candidateDigest=digest({candidate,assetBindings}); assetDigest=digest(assetBindings); studentDigest=digest(studentPayload)',considered:23,authored:22,excludedBeforeAuthoring:[20],provisionalSource:true,independentApprovals:0,finalGradeApprovals:0,directUseAllowed:false,candidates:index});
write(path.join(root,'author-freeze.json'),{schemaVersion:1,freezeRole:'author completion for 22 candidates and explicit q20 exclusion; no independent approval',candidateIndexSha256:raw(path.join(root,'candidate-index.json')),candidateIndexDigest:digest(read(path.join(root,'candidate-index.json'))),studentPacketSha256:raw(path.join(root,'review-ready/student-problems.json')),studentPacketDigest:digest(read(path.join(root,'review-ready/student-problems.json'))),sourceQuestionsSha256:raw(path.join(root,'evidence/source-provisional/questions.json')),sourceManifestSha256:raw(path.join(root,'evidence/source-provisional/source-manifest.json')),sourceFinalCommitPending:true,schoolYearPageEquivalencePending:true,allNativeRightsSimilarityGatesPending:true,priorOwned75Unchanged:true,bankEvidenceScope:'2026-10-08 04:53:45.769124+00 parent RepeatableRead, not current DB assertion',frozen:index.map(({questionNumber,candidateDigest,studentDigest,assetDigest})=>({questionNumber,candidateDigest,studentDigest,assetDigest}))});
console.log('Frozen 22 complete author proposals; q20 excluded; 20 strict assets, 22 inspected PNGs, 75 prior owned files unchanged. No independent/final/rights approval.');
