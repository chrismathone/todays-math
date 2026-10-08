/** Read-only checks of the frozen author packet; adds one scoped receipt. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import cp from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
const out=path.dirname(fileURLToPath(import.meta.url));const own=path.resolve(out,'../../..');const root=path.resolve(own,'../exam-extraction-resume-20261008');
const {bindCandidate,digest}=await import(pathToFileURL(path.join(root,'scripts/import/exam-twin/candidatePack.mjs')).href);
const read=p=>JSON.parse(fs.readFileSync(path.join(out,p),'utf8'));const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const freeze=read('author-freeze.json');const changes=[];
for(const f of freeze.controlledFiles)if(sha(path.join(out,f.path))!==f.sha256)changes.push(f.path);
assert.deepEqual(changes,[],'Frozen content modified');
const preserved=read('preservation-baseline.json');let preservedCount=0;
for(const r of preserved.ownPriorFiles){assert.equal(sha(r.path),r.sha256,'Prior own evidence changed: '+r.path);preservedCount++;}
for(const commit of preserved.raw123AndGg52Commits){const files=cp.execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',commit],{cwd:own,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
 for(const file of files){const blob=cp.execFileSync('git',['show',`${commit}:${file}`],{cwd:own,maxBuffer:50*1024*1024});assert(fs.readFileSync(path.join(own,file)).equals(blob),`Prior frozen Git blob changed ${commit}:${file}`);}}
assert.equal(sha(freeze.sourcePacket.path),freeze.sourcePacket.sha256);
for(const r of read('source-input-receipt.json').questionOnlyCopies){assert.equal(sha(r.copy.path),r.copy.sha256);assert.equal(sha(r.original.path),r.original.sha256);}
const students=read('student/student-problems.json');assert.equal(students.length,15);
assert.equal(sha(path.join(out,freeze.studentProblems.path)),freeze.studentProblems.sha256);
const source=read('source-question-only/selected15.json');const bySource=new Map(source.questions.map(q=>[q.number,q]));
const proofs=read('author-calculations.json');assert.equal(proofs.rows.length,15);assert.equal(proofs.rows.reduce((s,r)=>s+r.actualAllChoices.length,0),60);
const authorCheckKeys=['stem','choices','figuresAndTables','notation','answer','studentSolution','prerequisites'];let writtenSubparts=0;let points=0;
for(const r of freeze.candidates){const b=bindCandidate(path.join(out,r.candidateFile));
 for(const field of ['candidateDigest','studentDigest','assetDigest'])assert.equal(b[field],r[field],`${field} q${r.questionNumber}`);
 assert.equal(b.candidateFileSha256,r.candidateFileSha256);assert.equal(b.validation.surfaceKeywordViolations.length,0);
 assert.equal(b.candidate.sourceReference.sourceContentSha256,bySource.get(r.questionNumber).sourceContentDigest);
 assert.equal(b.candidate.score,bySource.get(r.questionNumber).scoreEvidence.originalPrintedParentScore);points+=b.candidate.score;
 assert.equal(b.candidate.metadata.problemTypeProposal,null);assert.equal(b.candidate.metadata.problemTypeStatus,'pending');
 assert.equal(b.candidate.metadata.independentMathApproval,false);assert.equal(b.candidate.metadata.independentGradeApproval,false);
 const s=students.find(q=>q.questionNumber===r.questionNumber);const {studentDigest,...payload}=s;assert.equal(digest(payload),studentDigest);assert.deepEqual(payload,b.student);
 const studentText=JSON.stringify(payload);for(const leak of ['"answer"','"solution"','"metadata"','"sourceReference"','경상','"authorChecks"'])assert(!studentText.includes(leak),`Student leak ${leak}`);
 for(const f of s.figures)assert.equal(sha(path.join(out,'student',f.svgPath)),f.sha256);
 const check=read(r.authorCheckPath);assert.equal(sha(path.join(out,r.authorCheckPath)),r.authorCheckSha256);assert.deepEqual(Object.keys(check.sevenStudentSurfaces),authorCheckKeys);
 if(b.candidate.questionType==='서술형'){const rubric=b.candidate.metadata.newSubpartRubric;assert.equal(rubric.length,3);assert.equal(rubric.reduce((s,p)=>s+p.points,0),8);writtenSubparts+=rubric.length;}
 const proof=proofs.rows.find(p=>p.questionNumber===r.questionNumber);assert(proof.requestedUniquenessAuthorCheck);
 if(proof.actualAllChoices.length){assert.equal(proof.actualAllChoices.filter(c=>c.correctAsAuthorCalculation).length,1);assert.equal(b.candidate.answer,proof.choiceAnswerMark);}
 if(r.questionNumber===18){assert.equal(r.status,'held-material-curriculum');assert.equal(check.materialHold.status,'pending');}
 for(const k of ['independentMath','independentWholeGrade','sourceCore','unitFamily','rights','nativeProvenance','loadable'])assert.equal(check.allFinalApprovals[k],false);
}
assert.equal(points,71);assert.equal(writtenSubparts,9);
const fig=read('strict-render-receipt.json');assert.equal(fig.newVectorCount,12);assert.equal(fig.independentFigureApproval,false);
assert.equal(read('figure-author-checks.json').rows.length,12);
const layout=read('preview-layout.json');assert.deepEqual(layout.networkRequests,[]);assert.equal(layout.authorImageInspectionPending,false);
for(const row of layout.results){assert.deepEqual(row.mathOrTableOverflow,[]);assert.equal(row.actualColumnWidthMm,70);}
assert.equal(read('visual-inspection.json').rows.length,15);
const current=cp.execFileSync('git',['status','--porcelain'],{cwd:own,encoding:'utf8'});assert.equal(current.trim(),'','Tracked worktree must remain clean before exact scoped staging');
const receipt={checkedAtUtc:new Date().toISOString(),authorFreezeSha256:sha(path.join(out,'author-freeze.json')),
 controlledFilesChecked:freeze.controlledFiles.length,priorOwnFilesUnchanged:preservedCount,priorGitBlobCommitsUnchanged:preserved.raw123AndGg52Commits,
 old2111EvidenceLastConfirmedReferenceOnly:preserved.oldExternal2111LastConfirmed,noNewOriginalOrOldArtifactReads:true,
 parentPacketAndCopiedQuestionOnlyBytesUnchanged:true,frozenBindingsChecked:15,sourceScoresChecked:15,points:71,
 MCChoicesChecked:60,writtenParents:3,writtenSubparts:9,authorSevenSurfaces:105,newStrictVectorFigures:12,
 authorViewedFullSolutions:15,authorViewedStudentPanes:15,studentExportHasNoAnswersOrSourceSchool:true,
 materialHeld:[18],familyProposals:2,familyNulls:13,problemTypeNulls:15,independentApprovals:0,rightsApprovals:0,nativeApprovals:0,loadable:0,
 noRootMainSourceSharedDependencyOrDatabaseWrites:true,inferenceApiCalls:0,paidApiCalls:0};
assert(!fs.existsSync(path.join(out,'validation-receipt.json')),'Existing validation receipt preserved; use a new receipt revision');
fs.writeFileSync(path.join(out,'validation-receipt.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
