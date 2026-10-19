import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const p=path.resolve('.qa-artifacts/exam-resume-20261008/nobyeon-sem2-group2-review-20261020-r2');
const scope=JSON.parse(fs.readFileSync('.qa-artifacts/exam-resume-20261008/angle-length-presentation-code-audit-20261020-r3/provided-scope.json','utf8').replace(/^\uFEFF/,''));
const mod=await import(pathToFileURL(scope.files.find(x=>path.basename(x.path)==='review-exam-twins.mjs').path));
const result=mod.auditCollectedPack(path.join(p,'package'),path.join(p,'blind'),path.join(p,'verification'));
fs.writeFileSync(path.join(p,'verification/own-nobyeon2-review-collector.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({math:result.mathematicalVerified,grade:result.gradeReviewed,overall:result.overallVerified,loadable:result.loadable}));
