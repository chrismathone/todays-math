import {readFileSync,writeFileSync} from 'node:fs';
import {normalizeProposal,proposedEntry} from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/scripts/qa/concept-blank/student-clear/proposals';
import {bankNotationFaults} from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/src/lib/concept-blank/notation';
import {blankClashes} from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/src/lib/concept-blank/audit';
import {verifyEditorialRow} from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/scripts/qa/concept-blank/student-clear/editorial';
const root='C:/Users/user/orca/workspaces/todays-math/student-clear-e5e6-20261006/docs/planning/tracks/reports/concept-student-clear-20261006/e5e6';
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const baseline=read('D:/tmp/concept-student-clear-20261006/baseline.json');
const original=new Map(Object.values(baseline.parts).flatMap((bank:any)=>bank.concepts.map((e:any)=>[e.id,e])));
const audit=read(root+'/audit.json');const ledger=new Map(read(root+'/codex-final-editorial.json').rows.map((r:any)=>[r.id,r]));
const entries:any[]=[];const failures:any[]=[];const editorialFailures:any[]=[];let current=0;
for(const r of audit.rows){try{const p=normalizeProposal(r,original.get(r.id) as any);if(!p)throw new Error('Incomplete row');entries.push(proposedEntry(p));if(ledger.has(r.id)){const v=verifyEditorialRow('e5e6',r,p,ledger.get(r.id) as any);if(v.length)editorialFailures.push({id:r.id,issues:v});else current++;}}catch(e){failures.push({id:r.id,error:String(e)});}}
const bank={concepts:entries,ox:[],apply:[],figures:[]};const notation=bankNotationFaults(bank);const clashes=blankClashes(bank).map(g=>g.map(r=>r.id));
const result={sourceCommit:audit.sourceCommit,sourceSha256:audit.sourceSha256,capturedAt:new Date().toISOString(),rowCount:audit.rows.length,ledgerRows:ledger.size,currentDirectReadingCount:current,failures,editorialFailures,notation,clashes,releaseReady:false};
writeFileSync(root+'/evidence/current-validation-ctx-7fc6b4391c84.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,sourceSha256:undefined,notation:notation.length,clashes:clashes.length}));if(notation.length)console.log(JSON.stringify(notation,null,2));
