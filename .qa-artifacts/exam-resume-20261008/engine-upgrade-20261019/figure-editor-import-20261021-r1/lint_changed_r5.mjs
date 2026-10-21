import fs from 'node:fs';
import crypto from 'node:crypto';
import v8 from 'node:v8';
import {ESLint} from 'eslint';
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const previous=JSON.parse(fs.readFileSync(new URL('./eslint-execution.json',import.meta.url),'utf8'));
const files=Object.keys(previous.sourceSHA256).filter(p=>sha(p)!==previous.sourceSHA256[p]);
if(files.length!==5)throw Error('Unexpected changed lint scope');
const before=Object.fromEntries(files.map(p=>[p,sha(p)]));
const result=await new ESLint({cwd:process.cwd()}).lintFiles(files);
if(files.some(p=>sha(p)!==before[p]))throw Error('Source changed while linting');
const unchanged=Object.keys(previous.sourceSHA256).filter(p=>!files.includes(p));
const report={utc:new Date().toISOString(),files,sourceSHA256:before,results:result,
 unchangedOtherInputs:unchanged,unchangedOther15Inputs:unchanged.every(p=>sha(p)===previous.sourceSHA256[p]),
 heapLimitBytes:v8.getHeapStatistics().heap_size_limit,dbWrites:0};
fs.writeFileSync(new URL('./eslint-r5-bounded.json',import.meta.url),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
const errors=result.reduce((n,r)=>n+r.errorCount,0),warnings=result.reduce((n,r)=>n+r.warningCount,0);
console.log(JSON.stringify({files:files.length,errors,warnings,unchanged15:report.unchangedOther15Inputs}));
process.exitCode=errors||warnings||!report.unchangedOther15Inputs?1:0;
