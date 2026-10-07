import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire('D:/todays-math/package.json');
const katex=require('katex');
const root='C:/Users/user/orca/workspaces/todays-math/student-clear-e5e6-20261006/docs/planning/tracks/reports/concept-student-clear-20261006/e5e6';
const file=fs.existsSync(`${root}/audit.json`)?'audit.json':'partial-audit.json';
const audit=JSON.parse(fs.readFileSync(`${root}/${file}`,'utf8'));
const sourcePath='D:/tmp/concept-student-clear-20261006/e5e6.json';
const source=JSON.parse(fs.readFileSync(sourcePath,'utf8'));
const failures=[];
if(crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex')!==audit.sourceSha256)failures.push({issue:'source_changed'});
if(JSON.stringify(audit.reviewedIds)!==JSON.stringify(source.entries.map(e=>e.id)))failures.push({issue:'source_coverage_or_order'});
if(new Set(audit.rows.map(r=>r.id)).size!==audit.rows.length)failures.push({issue:'duplicate_proposed_id'});
let previous=-1;
let mathExpressions=0;
for(const row of audit.rows){
 if(row.sourceIndex<=previous)failures.push({id:row.id,issue:'proposal_order'});
 previous=row.sourceIndex;
 if(JSON.stringify(row.source)!==JSON.stringify(source.entries[row.sourceIndex]))failures.push({id:row.id,issue:'source_trace_mismatch'});
 if(row.cDecision==='keep'&&(row.cAfter!==row.source.definition||row.cStudentAfter!==row.source.studentC||JSON.stringify(row.cProposedAnswers)!==JSON.stringify(row.source.answers)))failures.push({id:row.id,issue:'kept_C_not_frozen'});
 if(row.bDecision!=='exclude'&&(!row.bPrompt||!row.bAnswer||!row.bGoal))failures.push({id:row.id,issue:'included_B_missing_question_answer_goal'});
 for(const field of ['bPrompt','bAnswer','cAfter','coreAfter']){
  const s=row[field];if(typeof s!=='string')continue;
  if((s.match(/\$/g)||[]).length%2)failures.push({id:row.id,field,issue:'unpaired_math_dollar'});
  for(const m of s.matchAll(/\$([^$]*)\$/g)){
   mathExpressions++;
   try{katex.renderToString(m[1],{throwOnError:true,strict:'ignore'});}catch(e){failures.push({id:row.id,field,issue:'invalid_katex',expression:m[1],message:String(e.message).slice(0,180)});}
  }
 }
}
const report={sourceCommit:audit.sourceCommit,planningOnly:true,inputCount:source.entries.length,sourceReadCoverage:audit.reviewedIds.length,proposedCount:audit.rows.length,pendingCount:audit.pendingIds.length,mathExpressions,structuralFailures:failures,contractDraftIssues:audit.validationIssues,limitations:['These checks prove provenance, coverage, freezing and mathematical notation, not student comprehension or mathematical truth of every prose statement.','Independent grade/question and source/rubric release review is owned by the coordinator.']};
fs.writeFileSync(`${root}/validation.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({proposed:report.proposedCount,pending:report.pendingCount,mathExpressions,structuralFailures:failures.length,contractDraftIssues:report.contractDraftIssues.length}));
if(failures.length)console.log(JSON.stringify(failures));
