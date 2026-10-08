import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const root=path.dirname(fileURLToPath(import.meta.url));const repo=process.cwd();
const {bindCandidate,digest,sha256,SURFACES}=await import(pathToFileURL(path.join(repo,'scripts/import/exam-twin/candidatePack.mjs')));
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));const hash=p=>sha256(fs.readFileSync(p));
const freeze=read('author-freeze.json');const index=read('candidate-index.json');const packet=read('review-ready/student-problems.json');
assert.equal(freeze.candidateIndexSha256,hash(path.join(root,'candidate-index.json')));assert.equal(freeze.candidateIndexDigest,digest(index));assert.equal(freeze.studentPacketSha256,hash(path.join(root,'review-ready/student-problems.json')));assert.equal(freeze.studentPacketDigest,digest(packet));assert.equal(freeze.manifestDigest,digest(freeze.files));assert.equal(hash(path.join(repo,freeze.reportBinding.path)),freeze.reportBinding.sha256);
const walk=(dir,prefix='')=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name),prefix+e.name+'/'):[prefix+e.name]);
assert.deepEqual(walk(root).filter(x=>x!=='author-freeze.json').sort(),freeze.files.map(f=>f.path).sort(),'Unbound/missing new file');
for(const f of freeze.files){assert.equal(hash(path.join(root,f.path)),f.sha256,'Frozen bytes changed: '+f.path);assert.equal(fs.statSync(path.join(root,f.path)).size,f.bytes);}
const source=read('evidence/source-final/questions.json');const receipt=read('evidence/source-copy-receipt.json');const preserve=read('checks/preservation.json');const reviewed=read('checks/author-seven-surface-review.json');const expected=[...Array(19)].map((_,i)=>i+1).filter(x=>x!==15);
assert.deepEqual(index.candidates.map(x=>x.questionNumber),expected);assert.deepEqual(packet.questions.map(x=>x.questionNumber),expected);assert.equal(source.questions.length,19);assert.equal(source.originalCorrectChoiceAndSolutionWithheld,true);assert.equal(packet.questions.reduce((s,q)=>s+q.score,0),95);
for(const p of receipt.entries){assert.equal(hash(path.join(root,p.path)),p.sha256);assert.equal(hash(p.parentPath),p.sha256,'Parent source frozen bytes drift');}
for(const p of preserve.files)assert.equal(hash(path.join(repo,p.path)),p.sha256,'Prior file changed: '+p.path);
assert.equal(preserve.files.length,322);assert(!fs.existsSync(path.join(root,'candidates/q15')));
for(const row of index.candidates){
 const b=bindCandidate(path.join(root,row.candidatePath));const student=packet.questions.find(q=>q.questionNumber===row.questionNumber);
 const {studentDigest,...payload}=student;assert.deepEqual(payload,b.student);assert.equal(studentDigest,b.studentDigest);assert.equal(digest(payload),studentDigest);
 for(const key of ['candidateDigest','studentDigest','assetDigest','candidateFileSha256'])assert.equal(row[key],b[key],key+' drift');
 const c=b.candidate;assert.equal(row.sourceQuestionCanonicalDigest,digest(source.questions.find(x=>x.number===row.questionNumber)));
 const content={content:c.content,choices:c.choices,answer:c.answer,solution:c.solution,score:c.score,questionType:c.questionType,facts:c.facts};assert.equal(row.contentDigest,digest(content));
 assert.equal(row.mathDataSha256,hash(path.join(root,row.mathDataPath)));assert.equal(row.authorCheckSha256,hash(path.join(root,row.authorCheckPath)));
 assert.equal(c.metadata.assignment.familyKey,null);assert.equal(c.curriculumReview.status,'author-proposed');assert.equal(c.metadata.directUseAllowed,false);assert.equal(b.validation.surfaceKeywordViolations.length,0);
 const review=reviewed.results.find(r=>r.questionNumber===row.questionNumber);assert.deepEqual(Object.keys(review.curriculumSurfaces).sort(),[...SURFACES].sort());assert.equal(review.independentVerification,false);assert.equal(review.finalGradeApproval,false);
 assert.equal(hash(path.join(root,review.visualInspection.authorPreviewPath)),review.visualInspection.authorPreviewSha256);assert.equal(hash(path.join(root,review.visualInspection.studentPreviewPath)),review.visualInspection.studentPreviewSha256);
 for(const a of student.figures){assert.equal(hash(path.join(root,'review-ready',a.svgPath)),a.sha256);assert(a.intendedWidthMm<=70);}
 assert.equal(hash(path.join(root,`review-ready/previews/q${String(row.questionNumber).padStart(2,'0')}.png`)),row.studentPreviewSha256);
}
const forbiddenKeys=new Set(['answer','solution','metadata','sourceReference','facts','authorRubric','rubric']);
function clean(v){if(Array.isArray(v))v.forEach(clean);else if(v&&typeof v==='object')for(const [k,val]of Object.entries(v)){assert(!forbiddenKeys.has(k),'Author leak in student packet: '+k);clean(val);}}
clean(packet);
const readyFiles=walk(path.join(root,'review-ready'));assert(readyFiles.every(p=>p==='SOLVE-BRIEF.md'||p==='student-problems.json'||/^figures\/q\d{2}-[12]\.svg$/.test(p)||/^previews\/q\d{2}\.png$/.test(p)));
assert.equal(index.candidates.filter(x=>x.questionType==='객관식').length,14);assert.equal(index.candidates.filter(x=>x.questionType==='서술형').length,4);assert.equal(index.candidates.reduce((s,c)=>s+c.leafKeys.length,0),19);assert.equal(index.candidates.flatMap(x=>x.assetBindings).length,9);
const q17=index.candidates.find(x=>x.questionNumber===17);assert.equal(q17.score,10);assert.deepEqual(q17.subQuestions.map(x=>x.score),[5,5]);assert.deepEqual(freeze.heldBeforeAuthoring,[15]);assert.equal(freeze.independentReviewApprovals,0);assert.equal(freeze.finalGradeApprovals,0);assert.equal(freeze.directUseAllowed,false);
const gen=read('evidence/figure-generation.json');for(const p of gen.engineInputs)assert.equal(hash(path.join(repo,p.repositoryPath)),p.sha256,'Current render code differs');
console.log(JSON.stringify({status:'author-freeze-consistent',filesVerified:freeze.files.length,priorProtectedBytesUnchanged:322,safeRootPacketBytesUnchanged:21,authoredParents:18,authoredLeaves:19,score:95,strictFigures:9,heldBeforeAuthoring:[15],independentApprovals:0,loadable:false,readOnly:true,authorFreezeSha256:hash(path.join(root,'author-freeze.json'))}));
