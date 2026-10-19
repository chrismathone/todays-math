import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root='C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008';
const out='C:/Users/user/orca/workspaces/todays-math/exam-twin-source-identity-20261008/.qa-artifacts/exam-resume-20261008/root-table-approximation-audit-20261019-r2';
const files=['src/lib/middle/m3Root.ts','src/lib/middle/generate.ts','src/lib/elementary/rng.ts','src/lib/examStudy/adapters.ts','src/lib/examStudy/identity.ts','src/lib/examStudy/legacyVerification.ts','src/lib/examStudy/legacyReinforcement.ts','src/lib/engine/deriveFormats.ts','src/lib/problem/parseProblemContent.ts','src/__tests__/unit/middleM3Root.test.ts','src/__tests__/unit/middleRootTableApproximation.test.ts','src/__tests__/unit/examStudyCoreLegacy.test.ts'];
const hash=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(root+'/'+f)).digest('hex')]));
const save=(n:string,x:unknown)=>writeFileSync(out+'/'+n,JSON.stringify(x,null,2)+'\n','utf8');
const before=hash();save('code-before.json',before);
const imp=async(f:string)=>import(pathToFileURL(root+'/'+f).href);
const {M3_ROOT}=await imp('src/lib/middle/m3Root.ts');
const {asMultipleChoice}=await imp('src/lib/engine/deriveFormats.ts');
const {createRng}=await imp('src/lib/elementary/rng.ts');
const {parseProblemContent}=await imp('src/lib/problem/parseProblemContent.ts');
const {generateMiddleProblem}=await imp('src/lib/middle/generate.ts');
const {legacyStudyFamilies}=await imp('src/lib/examStudy/adapters.ts');
const katex=(await import(pathToFileURL(root+'/node_modules/katex/dist/katex.mjs').href)).default;
const key='3-1|무리수와 실수|09';const entry=M3_ROOT.find((x:any)=>x.key===key);
function require(b:unknown,msg:string){if(!b)throw Error(msg);}
function parse(text:string){
 const given=/\\sqrt\{(\d+\.\d{2})\}\\approx(\d+\.\d{3})/.exec(text);
 const asked=/\\sqrt\{(\d+)\}\$의 근삿값/.exec(text);
 require(given&&asked,'missing approximate printed fields');
 return {c:Number(given![1].replace('.','')),v:Number(given![2].replace('.','')),a:given![1],s:given![2],b:Number(asked![1])};
}
function decimal(text:string){const s=text.replace(/\$/g,'');require(/^\d+(\.\d+)?$/.test(s),'non decimal answer');const [a,b='']=s.split('.');return {n:BigInt(a+b),d:BigInt(10)**BigInt(b.length)};}
const sq=(x:bigint)=>x*x;
const rows:any[]=[];const samples:any[]=[];let renderCount=0;
for(let n=100;n<=999;n++)for(const m of [10,100]){
 const draws=[(n-100+0.5)/900,m===10?0.25:0.75];let calls=0;
 const p=entry.handler(()=>{require(calls<2,'extra draw');return draws[calls++];});
 const q=parse(p.content);require(q.c===n&&calls===2,'tuple mismatch');
 require(q.b*100===q.c*m*m,'scale identity mismatch');
 const v=BigInt(q.v),c=BigInt(q.c),M=BigInt(m),B=BigInt(q.b);
 const tableBound=sq(BigInt(2)*v-BigInt(1))<c*BigInt(40000)&&c*BigInt(40000)<sq(BigInt(2)*v+BigInt(1));
 const scaledBound=sq(BigInt(2)*v*M-M)<B*BigInt(4000000)&&B*BigInt(4000000)<sq(BigInt(2)*v*M+M);
 const a=decimal(p.answer);const valueMatches=a.n*BigInt(1000)===v*M*a.d;
 require(tableBound&&scaledBound&&valueMatches,'integer correctness check failed');
 require(p.content.includes('표의 근삿값을 그대로 이용하여'),'missing prescribed value instruction');
 require(!/\\sqrt\{[\d.]+\}=\d/.test(p.content),'false exact premise');
 require(p.solution.includes(`\\sqrt{${q.b}}=${m}\\sqrt{${q.a}}`),'lost exact scaling');
 require(p.solution.includes(`\\sqrt{${q.b}}\\approx${m}\\times${q.s}=`),'approx substitution missing');
 require(!new RegExp('\\\\sqrt\\{'+q.b+'\\}=\\d+(?:\\.\\d+)?\\$').test(p.solution),'exact numeric output claim');
 const sa=parseProblemContent(p.content);require(sa.choices.length===0,'SA choices');
 const mc=asMultipleChoice({...p,familyKey:key,problemType:'계산'},createRng(n*100+m));
 const parsed=parseProblemContent(mc.content);const chosen='①②③④⑤'.indexOf(mc.answer);
 require(parsed.choices.length===5&&new Set(parsed.choices).size===5,'MC choices invalid');
 require(chosen>=0&&parsed.choices[chosen]===p.answer,'MC chosen answer incorrect');
 require(JSON.stringify(parse(mc.content))===JSON.stringify(q),'MC changed premise');
 require(JSON.stringify(mc)===JSON.stringify(asMultipleChoice({...p,familyKey:key,problemType:'계산'},createRng(n*100+m))),'MC nondeterministic');
 for(const text of [p.content,p.answer,p.solution,mc.content])for(const match of text.matchAll(/\$([^$]+)\$/g)){katex.renderToString(match[1],{throwOnError:true,strict:'ignore'});renderCount++;}
 rows.push({a2:n,mult:m,b:q.b,tableExact:sq(v)===c*BigInt(10000),tableRoundingBound:tableBound,scaledErrorBound:scaledBound,errorBoundExclusive:m/2000,answer:p.answer,tablePrescribedValue:valueMatches,SA:true,MC:true,MCDeterministic:true});
 if([100,101,200,225,512,998,999].includes(n))samples.push({tuple:{a2:n,mult:m},native:p,mc});
}
save('bounded-results.json',rows);save('retained-packagings.json',samples);
const families=legacyStudyFamilies();const f=families.find((x:any)=>x.id==='legacy:mid:'+key);
require(f&&f.version==='20261019-root-table-approx-r1','wrong family version');require(f.evidence===undefined,'unearned evidence');
require(families.find((x:any)=>x.id==='legacy:mid:3-1|무리수와 실수|08')?.version==='9cfbb8683-r1','neighbor version changed');
const routes=[];
for(let seed=1;seed<=64;seed++){
 const native=generateMiddleProblem(key,seed,3);require(JSON.stringify(native)===JSON.stringify(generateMiddleProblem(key,seed,3)),'generator nondeterministic');parse(native.content);
 const draft=f.generate(seed,3);parse(draft.content);require(JSON.stringify(draft)===JSON.stringify(f.generate(seed,3)),'adapter nondeterministic');require(draft.content===native.content&&draft.answer===native.answer&&draft.solution===native.solution,'adapter changed native');
 routes.push({seed,variant:3,questionType:draft.questionType,parameters:draft.parameters,verification:f.verify(draft)});
}
save('adapter-results.json',{id:f.id,version:f.version,formats:f.formats,evidence:f.evidence??null,fulfills:f.fulfills,routes});
const after=hash();save('code-after.json',after);require(JSON.stringify(before)===JSON.stringify(after),'code changed');
save('summary.json',{tuples:rows.length,tableNonexact:rows.filter(r=>!r.tableExact).length,tableExact:rows.filter(r=>r.tableExact).length,failures:0,scaledAbsoluteErrorExclusive:{mult10:0.005,mult100:0.05},nativeSA:1800,MC:1800,MCDeterminism:1800,renderedMathSpans:renderCount,adapterAndSeededGenerationCases:64,rootImports:true,tsconfig:root+'/tsconfig.json',sourceUnchanged:true});
console.log(readFileSync(out+'/summary.json','utf8'));
