import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const base='.qa-artifacts/exam-resume-20261008/';
for(const [scope,index,key] of [
 ['gyeongam','gyeongam-authoring-r1/candidate-index.json','candidates'],
 ['gyeongsan','gyeongsan-authoring-r1/author-index-all25.json','questions'],
]) {
 const p=base+index;
 const rows=JSON.parse(fs.readFileSync(p,'utf8'))[key].filter(r=>r.candidatePath);
 assert.equal(rows.length,scope==='gyeongam'?18:24);
 const files=rows.map(r=>path.join(path.dirname(p),r.candidatePath));
 const output=base+scope+'-independent-r1/';
 for(const args of [['freeze',output+'package',...files],['blind',output+'package',output+'blind']]) {
  const result=spawnSync(process.execPath,['scripts/import/exam-twin/review-exam-twins.mjs',...args],{encoding:'utf8'});
  process.stdout.write(result.stdout??'');process.stderr.write(result.stderr??'');
  assert.equal(result.status,0);
 }
}
