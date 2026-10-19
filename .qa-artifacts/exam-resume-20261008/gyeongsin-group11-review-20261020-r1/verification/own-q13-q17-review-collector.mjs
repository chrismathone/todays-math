import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const p=path.resolve('.qa-artifacts/exam-resume-20261008/gyeongsin-group11-review-20261020-r1');
const scope=JSON.parse(fs.readFileSync('.qa-artifacts/exam-resume-20261008/angle-presentation-code-audit-20261020-r1/provided-scope.json','utf8').replace(/^\uFEFF/,''));
const mod=await import(pathToFileURL(scope.files.find(x=>path.basename(x.path)==='review-exam-twins.mjs').path));
const out=mod.auditCollectedPack(path.join(p,'package'),path.join(p,'blind'),path.join(p,'verification'));
fs.writeFileSync(path.join(p,'verification/own-q13-q17-review-collector.json'),JSON.stringify(out,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({math:out.mathematicalVerified,grade:out.gradeReviewed,items:out.results.map(x=>({q:x.n,math:x.mathematicalVerified,grade:x.gradeReviewed,reasons:x.reasons}))}));
