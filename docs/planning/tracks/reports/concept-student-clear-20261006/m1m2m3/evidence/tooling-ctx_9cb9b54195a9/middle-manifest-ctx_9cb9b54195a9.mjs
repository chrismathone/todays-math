import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root='C:/Users/user/orca/workspaces/todays-math/student-clear-m1m2m3-20261006/docs/planning/tracks/reports/concept-student-clear-20261006/m1m2m3';
const temp='D:/tmp/concept-student-clear-20261006';
const target=path.join(root,'evidence/tooling-ctx_9cb9b54195a9');
fs.mkdirSync(target,{recursive:true});
const names=['middle-resume-validate-ctx_9cb9b54195a9.mjs','middle-student-canonical.mjs','middle-notation-check-ctx_9cb9b54195a9.ts','middle-editorial-check-ctx_9cb9b54195a9.ts','middle-package-ctx_9cb9b54195a9.mjs','middle-readme-ctx_9cb9b54195a9.mjs','middle-manifest-ctx_9cb9b54195a9.mjs','middle-resume-batch-ctx_9cb9b54195a9.mjs','middle-resolution-evidence-ctx_9cb9b54195a9.mjs','middle-negative-resolution-ctx_9cb9b54195a9.ts','middle-negative-capture-ctx_9cb9b54195a9.ts','middle-prepare-rootnegative-ctx_9cb9b54195a9.ts','middle-new-example-flags-ctx_9cb9b54195a9.mjs'];
names.push('middle-prepare-tailnegative-ctx_9cb9b54195a9.ts','middle-capture-new-negatives-1121-ctx_9cb9b54195a9.ts','middle-capture-new-negatives-1138-ctx_9cb9b54195a9.ts','middle-additional-resolution-ctx_9cb9b54195a9.ts','middle-fraction-josa-final-ctx_9cb9b54195a9.mjs');
// Tooling snapshots use LF; the original question/reader evidence stays byte-exact.
for(const name of names)fs.writeFileSync(path.join(target,name),fs.readFileSync(path.join(temp,name),'utf8').replaceAll('\r\n','\n'));
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);
const files=walk(root).map(p=>path.relative(root,p).replaceAll('\\','/')).filter(n=>n!=='report-manifest.json').sort();
const entries=Object.fromEntries(files.map(n=>{const b=fs.readFileSync(path.join(root,n));return[n,{sha256:createHash('sha256').update(b).digest('hex'),bytes:b.length}];}));
const result={generatedAt:new Date().toISOString(),sourceCommit:'13bf05dce',scope:'Owned middle-school planning report only. Hashes describe file bytes, not semantic approval. No production edits or deployment.',fileCount:files.length,totalBytes:Object.values(entries).reduce((s,r)=>s+r.bytes,0),files:entries};
fs.writeFileSync(path.join(root,'report-manifest.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({fileCount:result.fileCount,totalBytes:result.totalBytes}));
