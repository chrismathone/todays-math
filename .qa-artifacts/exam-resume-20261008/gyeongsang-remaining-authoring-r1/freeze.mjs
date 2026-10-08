import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
const out=path.dirname(fileURLToPath(import.meta.url));const own=path.resolve(out,'../../..');
const root=path.resolve(own,'../exam-extraction-resume-20261008');
const {bindCandidate,digest}=await import(pathToFileURL(path.join(root,'scripts/import/exam-twin/candidatePack.mjs')).href);
assert(!fs.existsSync(path.join(out,'author-freeze.json')),'Author scope already frozen; create a new revision');
const read=p=>JSON.parse(fs.readFileSync(path.join(out,p),'utf8'));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const write=(p,v)=>{const dest=path.resolve(out,p);assert(dest.startsWith(out+path.sep));fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(v,null,2)+'\n');};
const numbers=[1,2,3,4,5,6,7,8,9,16,17,18,19,20,21];
const preflight=read('bindings-preflight.json');
const rows=[];const students=[];const assetIndex=[];
for(const n of numbers){
 const tag=`q${String(n).padStart(2,'0')}`;const rel=`candidates/${tag}/${tag}.json`;
 const b=bindCandidate(path.join(out,rel));assert.equal(b.validation.surfaceKeywordViolations.length,0);
 const previewBinding=(Array.isArray(preflight)?preflight:preflight.bindings??preflight.rows).find(r=>r.questionNumber===n);
 assert(previewBinding,'Missing existing author preview binding');
 assert.equal(b.studentDigest,previewBinding.studentDigest,'Metadata enrichment changed the viewed student problem');
 assert.equal(b.assetDigest,previewBinding.assetDigest,'Asset changed after actual author views');
 assert.equal(b.studentDigest,digest(b.student));
 assert.equal(b.candidate.metadata.independentMathApproval,false);assert.equal(b.candidate.metadata.independentGradeApproval,false);
 for(const a of b.assets){const dest=path.join(out,'student',a.studentPath);fs.mkdirSync(path.dirname(dest),{recursive:true});
   assert(!fs.existsSync(dest),'Refuse overwrite student asset');fs.copyFileSync(a.sourceSvgPath,dest);assert.equal(sha(dest),a.svgSha256);
   assetIndex.push({questionNumber:n,role:a.role,specPath:path.relative(out,a.sourceSpecPath).replaceAll('\\','/'),specSha256:a.specSha256,
    svgPath:path.relative(out,a.sourceSvgPath).replaceAll('\\','/'),svgSha256:a.svgSha256,studentPath:`student/${a.studentPath}`,intendedWidthMm:a.intendedWidthMm});}
 students.push({...b.student,studentDigest:b.studentDigest});
 const check=`author-checks/${tag}.json`;
 rows.push({questionNumber:n,twinExternalId:b.candidate.twinExternalId,sourceQuestionId:b.candidate.sourceReference.externalId,
  sourceContentDigest:b.candidate.sourceReference.sourceContentSha256,candidateFile:rel,candidateFileSha256:b.candidateFileSha256,
  candidateDigest:b.candidateDigest,studentDigest:b.studentDigest,assetDigest:b.assetDigest,authorCheckPath:check,authorCheckSha256:sha(path.join(out,check)),
  score:b.candidate.score,status:n===18?'held-material-curriculum':'authored-proposed-independent-review-pending',
  questionType:b.candidate.questionType,familyProposal:b.candidate.metadata.assignment.familyKey,
  independentMathApproved:false,independentGradeApproved:false,rightsApproved:false,nativeProvenanceApproved:false,loadable:false});
}
assert.equal(new Set(rows.map(r=>r.twinExternalId)).size,15);assert.equal(rows.reduce((s,r)=>s+r.score,0),71);
write('student/student-problems.json',students);
write('frozen-asset-index.json',{authorOnly:true,strictExistingEngine:true,assets:assetIndex,newVectorCount:12,originalCropAsStudentAssetCount:0,independentApproval:false});
write('candidate-index.json',{ownershipNumbers:numbers,outsideOwnershipNumbers:[10,11,12,13,14,15,22],scoreSum:71,candidates:rows,authorOnly:true});
const files=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.name==='__pycache__'||e.name==='no-hooks')continue;
 const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.isFile())files.push({path:path.relative(out,p).replaceAll('\\','/'),sha256:sha(p)});else assert.fail('Non-regular controlled asset');}}
walk(out);files.sort((a,b)=>a.path.localeCompare(b.path));
write('author-freeze.json',{schemaVersion:1,frozenAtUtc:new Date().toISOString(),method:'author-preparation-only',authorId:'orca-codex-exam-twin-source-identity-20261008',
 sourcePacket:read('source-input-receipt.json').packet,ownedNumbers:numbers,outsideOwnershipNumbers:[10,11,12,13,14,15,22],
 summary:{candidates:15,authoredProposed:14,materialCurriculumHeld:[18],MCParents:12,MCChoices:60,writtenParents:3,writtenSubparts:9,points:71,
  sevenSurfaceAuthorObservations:105,newVectorFigures:12,viewedStudentPanes:15,viewedExpandedSolutions:15,independentMathApprovals:0,independentGradeApprovals:0,
  familyProposals:2,familyNulls:13,problemTypeNulls:15,rightsApprovals:0,nativeProvenanceApprovals:0,loadable:0},
 studentProblems:{path:'student/student-problems.json',sha256:sha(path.join(out,'student/student-problems.json'))},candidates:rows,controlledFiles:files,
 frozenFilesMustNotBeEdited:true,postFreezeValidationReceiptsMayBeAdded:true,authorCannotIndependentlyBlindReviewOwnCandidates:true});
console.log(JSON.stringify({frozen:rows.length,studentFigures:assetIndex.length,points:71,controlledFiles:files.length,materialHeld:[18],independentApprovals:0}));
