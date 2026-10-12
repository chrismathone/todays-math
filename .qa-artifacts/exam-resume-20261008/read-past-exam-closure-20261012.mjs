/** User-directed closure inventory. Read-only transaction; no DB write mode. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {PrismaClient} from '@prisma/client';
import {sha256,readJson} from '../../scripts/import/exam-twin/candidatePack.mjs';
for(const file of ['.env','.env.local'])if(fs.existsSync(file))process.loadEnvFile(file);
const base='.qa-artifacts/exam-resume-20261008/';
const previous=readJson(base+'bank-read-20261008.json');
const ledgerChecks=previous.ledgerChecks.map(row=>({path:row.path,sha256:sha256(fs.readFileSync(row.path)),ledger:readJson(row.path)}));
const protectedIds=[...new Set(ledgerChecks.flatMap(row=>row.ledger.rows.map(r=>r.problemId)))];
const client=new PrismaClient({log:[]});
try {
 const inventory=await client.$transaction(async tx=>{
  await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
  const [settings]=await tx.$queryRawUnsafe("SELECT current_timestamp::text AS captured_at, current_setting('transaction_read_only') AS read_only");
  assert.equal(settings.read_only,'on');
  const groups=await tx.$queryRawUnsafe("SELECT source::text AS source, direct_use_allowed, review_status::text AS review_status, count(*)::integer AS count FROM problem GROUP BY source,direct_use_allowed,review_status ORDER BY source,direct_use_allowed,review_status");
  const rows=await tx.$queryRawUnsafe("SELECT id, external_id, exam_id, source::text AS source, pool::text AS pool, review_status::text AS review_status, direct_use_allowed, updated_at::text AS updated_at, md5(to_jsonb(p)::text) AS whole_row_md5 FROM problem p WHERE source='past_exam' ORDER BY id");
  const protectedRows=await tx.problem.findMany({where:{id:{in:protectedIds}},select:{id:true,externalId:true,directUseAllowed:true,reviewStatus:true,content:true,solution:true}});
  assert.equal(protectedRows.length,82);assert.equal(protectedRows.filter(r=>r.directUseAllowed).length,0);
  const byId=new Map(protectedRows.map(r=>[r.id,r]));
  for(const {ledger} of ledgerChecks)for(const old of ledger.rows){const current=byId.get(old.problemId);assert.equal(current?.externalId,old.externalId);if(old.after)for(const field of Object.keys(old.after))assert.equal(current[field],old.after[field]);}
  const exams=await tx.$queryRawUnsafe("SELECT e.id,e.external_exam_id,e.school,e.year,e.semester,e.round,e.subject,count(p.id)::integer AS questions,count(p.id) FILTER(WHERE p.direct_use_allowed=true)::integer AS currently_direct FROM exam e JOIN problem p ON p.exam_id=e.external_exam_id WHERE p.source='past_exam' GROUP BY e.id,e.external_exam_id,e.school,e.year,e.semester,e.round,e.subject ORDER BY e.school,e.year,e.semester,e.round");
  return {kind:'latest-raw-past-exam-closure-inventory/v1',createdAt:new Date().toISOString(),capturedAt:settings.captured_at,readOnly:true,groups,rows,exams,protected82:{count:82,allClosed:true,correctionFieldsUnchanged:true,ledgers:ledgerChecks.map(({path,sha256})=>({path,sha256}))},targetPredicate:"source='past_exam' AND direct_use_allowed=true",targetCount:rows.filter(r=>r.direct_use_allowed).length,alreadyClosedCount:rows.filter(r=>!r.direct_use_allowed).length,rawPastExamCount:rows.length,delete:false,reload:false,unlock:false,dbWrites:0};
 },{isolationLevel:'RepeatableRead',maxWait:10000,timeout:60000});
 fs.writeFileSync(base+'past-exam-closure-inventory-20261012.json',JSON.stringify(inventory,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({capturedAt:inventory.capturedAt,rawPastExamCount:inventory.rawPastExamCount,toClose:inventory.targetCount,alreadyClosed:inventory.alreadyClosedCount,protected82:inventory.protected82,dbWrites:0}));
}catch(error){const detail=String(error.meta?.message??'').replace(/https?:\/\/\S+/g,'[url omitted]');console.error(JSON.stringify({operation:'read-only closure inventory',code:error.code??error.name,sqlState:error.meta?.code,detail,credentialsNotPrinted:true,dbWrites:0}));process.exitCode=1;}
finally{await client.$disconnect();}
