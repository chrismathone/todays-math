import fs from 'node:fs';
import assert from 'node:assert/strict';
import { sha256 } from '../../scripts/import/exam-twin/candidatePack.mjs';
const root='.qa-artifacts/exam-resume-20261008/';
assert(!fs.existsSync(root+'continuation-index-v7.json'),'v6 is historical; do not replace later continuation pointers');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const save=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const index=read(root+'continuation-index-v6.json');
const report=index.progressReport;
index.progressReportSha256=sha256(fs.readFileSync(report));
index.q07Exclusion.parentMerge='7851b1316';
index.snapshotScope='Bumil current20/source21 and next5 source106 snapshot; Gyeonggu final author freeze received subsequently and will be indexed in v7.';
const ledger=read(root+'status-ledger-v6.json');
ledger.report=report;
ledger.reportSha256=index.progressReportSha256;
ledger.bumilQ07.parentMerge='7851b1316';
save(root+'status-ledger-v6.json',ledger);
save(root+'status-ledger.json',ledger);
index.statusLedger.sha256=sha256(fs.readFileSync(index.statusLedger.path));
save(root+'continuation-index-v6.json',index);
const owner=read(root+'continuation-index.json');
owner.currentExecution={path:root+'continuation-index-v6.json',sha256:sha256(fs.readFileSync(root+'continuation-index-v6.json')),version:6};
save(root+'continuation-index.json',owner);
const checked=[];
function walk(x,where){
  if(!x||typeof x!=='object')return;
  if(typeof x.path==='string'&&typeof x.sha256==='string'){
    assert(fs.existsSync(x.path),where+': missing '+x.path);
    assert.equal(sha256(fs.readFileSync(x.path)),x.sha256,where+': stale '+x.path);
    checked.push(x.path);
  }
  for(const [k,v] of Object.entries(x))walk(v,where+'.'+k);
}
walk(index,'index');
assert.equal(index.progressReportSha256,sha256(fs.readFileSync(report)));
assert.equal(index.counts.authoredTwins,20);
assert.equal(index.counts.verifiedTwins,0);
assert.equal(index.counts.loadableTwins,0);
save(root+'continuation-v6-binding-check.json',{kind:'captured-continuation-reference-check/v1',version:6,checkedFileReferences:checked,progressReportSha256:index.progressReportSha256,scopedAuthored:20,fullVerified:0,loadable:0,notNewMathOrGradeApproval:true,productionWrites:false});
console.log(JSON.stringify({version:6,checkedFileReferences:checked.length,progressReportBound:true,fullVerified:0,loadable:0}));
