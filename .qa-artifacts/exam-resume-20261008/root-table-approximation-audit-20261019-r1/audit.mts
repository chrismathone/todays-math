import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root='C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008';
const out='C:/Users/user/orca/workspaces/todays-math/exam-twin-source-identity-20261008/.qa-artifacts/exam-resume-20261008/root-table-approximation-audit-20261019-r1';
const files=['src/lib/middle/m3Root.ts','src/lib/elementary/rng.ts','src/lib/examStudy/adapters.ts','src/lib/examStudy/legacyVerification.ts','src/lib/examStudy/legacyReinforcement.ts','src/__tests__/unit/middleM3Root.test.ts'];
const hash=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(root+'/'+f)).digest('hex')]));
const save=(name:string,x:unknown)=>writeFileSync(out+'/'+name,JSON.stringify(x,null,2)+'\n','utf8');
const before=hash();save('code-before.json',before);
const {M3_ROOT}=await import(pathToFileURL(root+'/src/lib/middle/m3Root.ts').href);
const key='3-1|\uBB34\uB9AC\uC218\uC640 \uC2E4\uC218|09';
const entry=M3_ROOT.find((x:any)=>x.key===key);if(!entry)throw Error('missing target');
const rows=[];const samples=[];
for(let a2=100;a2<=999;a2++)for(const mult of [10,100]){
 const draws=[(a2-100+0.5)/900,mult===10?0.25:0.75];let calls=0;
 const p=entry.handler(()=>{if(calls>=2)throw Error('unexpected RNG draw');return draws[calls++];});
 if(p.facts.a2!==a2||p.facts.mult!==mult||calls!==2)throw Error('wrong tuple');
 // Parse actual printed decimal equality and target, not just facts.
 const match=/\\sqrt\{(\d+\.\d+)\}=(\d+\.\d+)/.exec(p.content);
 const target=/\\sqrt\{(\d+)\}/g;const targets=[...p.content.matchAll(target)];
 if(!match||targets.length!==1)throw Error('printed syntax changed');
 const cents=Number(match[1].replace('.',''));const milli=Number(match[2].replace('.',''));
 const b=Number(targets[0][1]);
 const answerText=p.answer.replace(/\$/g,'');
 const [whole,frac='']=answerText.split('.');const scale=10n**BigInt(frac.length);
 const answerInt=BigInt(whole+frac);
 const tableExact=BigInt(milli)**2n===BigInt(cents)*10000n;
 const scaledExact=answerInt**2n===BigInt(b)*scale**2n;
 const roundedCorrect=BigInt(2*milli-1)**2n<=BigInt(cents)*40000n&&BigInt(cents)*40000n<BigInt(2*milli+1)**2n;
 const prescribedValue=answerInt*1000n===BigInt(milli*mult)*scale;
 if(cents!==a2||b!==(mult===10?a2:a2*100))throw Error('printed tuple mismatch');
 const row={a2,mult,b,printedRoot:match[2],answer:answerText,tableSquaredDifference:String(BigInt(milli)**2n-BigInt(cents)*10000n),tableExact,scaledExact,roundedCorrect,prescribedValue};
 rows.push(row);
 if([100,101,121,200,512,961,999].includes(a2))samples.push({tuple:{a2,mult},...p});
}
save('bounded-results.json',rows);save('retained-samples.json',samples);
const after=hash();save('code-after.json',after);if(JSON.stringify(before)!==JSON.stringify(after))throw Error('source changed during audit');
save('summary.json',{key,total:rows.length,tableExact:rows.filter(r=>r.tableExact).length,tableFalseExact:rows.filter(r=>!r.tableExact).length,scaledExact:rows.filter(r=>r.scaledExact).length,scaledFalseExact:rows.filter(r=>!r.scaledExact).length,roundingFailures:rows.filter(r=>!r.roundedCorrect).length,prescribedValueFailures:rows.filter(r=>!r.prescribedValue).length,exactA2:[...new Set(rows.filter(r=>r.tableExact).map(r=>r.a2))],sourceUnchanged:true,oracle:'Integer squared comparisons of actual printed decimals; no Math.sqrt in audit oracle. RNG injection exercises actual handler for every tuple.'});
console.log(readFileSync(out+'/summary.json','utf8'));
