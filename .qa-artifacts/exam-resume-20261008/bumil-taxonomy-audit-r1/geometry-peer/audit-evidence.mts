// Read-only repository/parent inputs; writes only this new audit evidence directory.
// No inference client, DB client, renderer, install or network request.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const repositoryRequire=createRequire('D:/todays-math/package.json');
const {registeredTypes,generateMiddleProblem}=repositoryRequire('./src/lib/middle/generate.ts');
const {CURRICULUM_UNITS}=repositoryRequire('./prisma/seed-data/units.ts');
const {buildUnitCodePrefixes}=repositoryRequire('./src/lib/problemCode.ts');
const {semesterOfUnit}=repositoryRequire('./src/lib/curriculum/unitSemester.ts');
const {resolveMiddleTier}=repositoryRequire('./src/lib/middle/tier.ts');

const parent='C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008';
const own='C:/Users/user/orca/workspaces/todays-math/exam-twin-author-geometry-20261008';
const production='D:/todays-math';
const base='.qa-artifacts/exam-resume-20261008';
assert.equal(fs.realpathSync(process.cwd()).toLowerCase(),fs.realpathSync(own).toLowerCase());
const out=path.join(own,base,'bumil-taxonomy-audit-r1/geometry-peer');
const {bindCandidate,digest,sha256,canonicalJson}=await import(pathToFileURL(`${parent}/scripts/import/exam-twin/candidatePack.mjs`).href);
const read=(f:string)=>JSON.parse(fs.readFileSync(f,'utf8'));
const seals=new Map<string,string>();
function seal(f:string){const hash=sha256(fs.readFileSync(f));seals.set(path.resolve(f),hash);return hash;}
function write(name:string,value:unknown){const f=path.join(out,name);assert(!fs.existsSync(f));fs.writeFileSync(f,JSON.stringify(value,null,2)+'\n');}
const indexPath=`${parent}/${base}/bumil-authoring-r2/candidate-index-r2.json`;
const index=read(indexPath);const indexHash=seal(indexPath);
const methodPath=`${parent}/${base}/bumil-authoring-r2/variant-method-links-r2.json`;
const methodLinks=read(methodPath).questions.filter((q:any)=>q.twinExternalId.endsWith('q10'));
assert.equal(methodLinks.length,1);const methodHash=seal(methodPath);
const bankPath=`${parent}/${base}/bank-read-20261008.json`;const bank=read(bankPath);seal(bankPath);
const registryPath=`${parent}/${base}/registry-read-20261008.json`;const snapshotRegistry=read(registryPath);seal(registryPath);
const sourcePath=`${parent}/${base}/bumil-twin-v2/prepared/source-reference/problems.json`;const answerFree=read(sourcePath);seal(sourcePath);
const sourceTaxonomyPath=`${parent}/${base}/bumil-twin-v2/metadata-review.json`;
const sourceTaxonomy=read(sourceTaxonomyPath);const sourceTaxonomyHash=seal(sourceTaxonomyPath);
const sourceTaxonomyRows=sourceTaxonomy.questions.filter((q:any)=>[5,10,18].includes(q.n)).map((q:any)=>({n:q.n,sourceExternalId:q.sourceExternalId,sourceContentSha256:q.sourceContentSha256,actualUnitProposal:q.actualUnitProposal,sourceMethodProposal:q.sourceMethodProposal,finalStatuses:q.finalStatuses}));
assert.equal(sourceTaxonomyRows.length,3);
const q07=index.holds.filter((q:any)=>q.n===7);assert.equal(q07.length,1);
const selected:any[]=[];
for(const [round,ids] of [[2,[5,18]],[5,[10]]] as const){
 const folder=`${parent}/${base}/bumil-review-r${round}`;
 const vf=`${folder}/verification/verification-inputs.json`;
 const manifestPath=`${folder}/verification/verification-manifest.json`;
 const manifest=read(manifestPath);seal(manifestPath);assert.equal(seal(vf),manifest.verificationInputsSha256);
 const entries=read(vf).filter((e:any)=>ids.includes(e.candidate.questionNumber));
 assert.equal(entries.length,ids.length);
 for(const entry of entries){
  const q=entry.candidate.questionNumber;const nn=String(q).padStart(2,'0');
  const indexed=index.questions.filter((x:any)=>x.n===q);assert.equal(indexed.length,1);
  const originalFile=path.join(parent,indexed[0].candidate);assert.equal(seal(originalFile),indexed[0].sha256);
  const author=read(originalFile);assert.equal(author.twinExternalId,indexed[0].id);
  const privateFile=`${folder}/package/private/q${nn}/candidate.json`;
  const binding=bindCandidate(privateFile);seal(privateFile);
  for(const k of ['candidateDigest','studentDigest','assetDigest'])assert.equal(binding[k],entry[k]);
  assert.equal(canonicalJson(binding.candidate),canonicalJson(entry.candidate));
  // Package-relative asset paths are a reviewed transport transformation, not a student change.
  const {figureArtifacts:authorArtifacts,...authorText}=author;
  const {figureArtifacts:packageArtifacts,...packageText}=binding.candidate;
  assert.equal(canonicalJson(authorText),canonicalJson(packageText));
  assert.equal(authorArtifacts.length,packageArtifacts.length);
  let authorBindings;
  process.chdir(parent);
  try { authorBindings=bindCandidate(originalFile); } finally { process.chdir(own); }
  assert.equal(authorBindings.assetDigest,binding.assetDigest);
  assert.equal(authorBindings.studentDigest,binding.studentDigest);
  assert.equal(digest(entry.independentSolve),entry.solveDigest);
  const reviewPath=`${folder}/verification/reports/q${nn}.json`;
  const review=read(reviewPath);const reviewHash=seal(reviewPath);
  for(const k of ['candidateDigest','studentDigest','assetDigest','solveDigest'])assert.equal(review[k],entry[k]);
  const peerPath=`${folder}/verification-results-${q===10?'algebra':'geometry'}/reports/q${nn}.json`;
  const peerHash=seal(peerPath);assert.equal(canonicalJson(read(peerPath)),canonicalJson(review));
  const solvePath=`${folder}/blind/solve/q${nn}.json`;const solveHash=seal(solvePath);
  assert.equal(digest(read(solvePath)),entry.solveDigest);
  assert.notEqual(binding.candidate.authorId,'orca-codex-exam-twin-author-geometry-20261008');
  if(q===10)assert(binding.candidate.twinExternalId.includes('author-r2'));
  const source=answerFree.filter((x:any)=>x.n===q);assert.equal(source.length,1);
  assert.equal(sha256(source[0].content),author.sourceReference.sourceContentSha256);
  const sourceTaxonomyRow=sourceTaxonomyRows.find((x:any)=>x.n===q)!;
  assert.equal(sourceTaxonomyRow.sourceContentSha256,author.sourceReference.sourceContentSha256);
  assert.equal(sourceTaxonomyRow.sourceExternalId,author.sourceReference.externalId);
  const sourceFigures=source[0].figures.map((f:string)=>{const full=path.join(path.dirname(sourcePath),f);return {path:full,sha256:seal(full),referenceOnly:true};});
  const assets=binding.assets.map((a:any)=>{
   assert.equal(seal(a.sourceSpecPath),a.specSha256);assert.equal(seal(a.sourceSvgPath),a.svgSha256);
   const studentPath=path.join(folder,'blind',a.studentPath);assert.equal(seal(studentPath),a.svgSha256);
   const resources=(a.resources??[]).map((r:any)=>{
    assert.equal(seal(r.sourceRasterPath),r.rasterSha256);assert.equal(seal(r.sourceGenerationPath),r.generationSha256);
    return r;
   });
   return {...a,resources};
  });
  // Also seal all author-side bound resources, without using them as an approval criterion.
  for(const a of authorBindings.assets){seal(a.sourceSpecPath);seal(a.sourceSvgPath);for(const r of a.resources??[]){seal(r.sourceRasterPath);seal(r.sourceGenerationPath);}}
  selected.push({questionNumber:q,round,twinExternalId:author.twinExternalId,authorId:author.authorId,indexRow:indexed[0],candidateFileSha256:indexed[0].sha256,packageCandidateFileSha256:binding.candidateFileSha256,providedAndRecomputed:{studentDigest:binding.studentDigest,candidateDigest:binding.candidateDigest,assetDigest:binding.assetDigest,solveDigest:entry.solveDigest},authorPackageOnlyPathsDiffer:canonicalJson(author)!==canonicalJson(binding.candidate),source:{externalId:author.sourceReference.externalId,contentSha256:author.sourceReference.sourceContentSha256,referenceFileSha256:seals.get(path.resolve(sourcePath)),figures:sourceFigures},review:{path:reviewPath,rawSha256:reviewHash,canonicalDigest:digest(review),peerPath,peerRawSha256:peerHash,status:review.status,checks:review.checks},solve:{path:solvePath,rawSha256:solveHash,canonicalDigest:entry.solveDigest,solverId:entry.independentSolve.solverId},assets});
 }
}

const relevantPaths=['src/lib/middle/generate.ts','src/lib/middle/m3Func.ts','src/lib/middle/m3Trig.ts','src/lib/middle/m3Top.ts','prisma/seed-data/units.ts','src/lib/middle/tier.ts','src/lib/middle/types.ts','src/lib/problemCode.ts','src/lib/curriculum/unitSemester.ts','src/contracts/problem.contract.ts','src/contracts/difficulty.ts'];
const files=relevantPaths.map(relativePath=>{
 const copies=[production,parent,own].map(root=>({path:path.join(root,relativePath),sha256:seal(path.join(root,relativePath))}));
 assert.equal(new Set(copies.map(c=>c.sha256)).size,1);
 return {relativePath,allThreeCheckoutsByteIdentical:true,copies};
});
const naturalKeys=new Set([479,480,481,482,483]);
const codes=buildUnitCodePrefixes(CURRICULUM_UNITS);
const units=bank.units.filter((u:any)=>naturalKeys.has(u.orderIndex)).map((u:any)=>{
 const seeds=CURRICULUM_UNITS.filter(s=>s.grade===u.grade&&s.chapter===u.chapter&&s.section===u.section&&s.orderIndex===u.orderIndex);assert.equal(seeds.length,1);
 assert.equal(semesterOfUnit(u.grade,u.chapter),u.semester);
 const prefix=codes.find(c=>c.orderIndex===u.orderIndex)!;assert.equal(prefix.prefix,u.problemCodePrefix);
 return {snapshotRow:u,seed:seeds[0],derivedSemester:u.semester,derivedPrefix:prefix.prefix,UUIDOrigin:'only snapshot Unit.id; seed has no UUID and no row was created'};
});
const currentRegistry=registeredTypes();
const sections=new Set(units.map((u:any)=>u.snapshotRow.section));
const registryEntries=currentRegistry.filter(e=>e.grade==='중3'&&sections.has(e.unitSection)).map(({handler,...entry})=>{
 const matched=snapshotRegistry.entries.filter((s:any)=>s.key===entry.key);assert.equal(matched.length,1);
 assert.equal(canonicalJson(entry),canonicalJson(matched[0]));
 const live=bank.liveFamilies.filter((s:any)=>s.family_key==='mid:'+entry.key);
 assert.equal(live.length,1);
 const unit=units.find((u:any)=>u.snapshotRow.id===live[0].unit_id);assert(unit);assert.equal(unit.snapshotRow.section,entry.unitSection);
 return {...entry,familyKey:'mid:'+entry.key,snapshotUnitId:live[0].unit_id,snapshotLiveCount:live[0].live_count};
});
const g2Minor='이차함수의 그래프 ⑵';
const probeKeys=[...['01','02','05','08','10','11','12','13','19','21','22T'].map(n=>`3-1|${g2Minor}|${n}`),'3-2|삼각비|17','3-2|삼각비의 활용|03','3-2|삼각비의 활용|13'];
const probes=probeKeys.map(key=>({key,role:'fresh deterministic rule probe; not an authored candidate or original exam solve',seeds:[101,202,303,404].map(seed=>{
 const p=generateMiddleProblem(key,seed);assert.equal(p.rpmBook+'|'+p.rpmMinor+'|'+p.rpmType,key);
 return {seed,difficulty:p.difficulty,unitSection:p.unitSection,content:p.content,answer:p.answer,solution:p.solution,facts:p.facts,figureSpecPresent:!!p.figureSpec};
})}));

// Use exact integer rationals, including decimal table input. No floating trig functions.
const gcd=(a:bigint,b:bigint):bigint=>b===0n?(a<0n?-a:a):gcd(b,a%b);
const rational=(n:bigint,d=1n)=>{assert(d!==0n);if(d<0n){n=-n;d=-d;}const g=gcd(n,d);return {n:n/g,d:d/g};};
const str=(r:{n:bigint,d:bigint})=>r.d===1n?String(r.n):`${r.n}/${r.d}`;
const tableDistance=rational(112000n,16003n);
const roundedTenths=(tableDistance.n*20n+tableDistance.d)/(2n*tableDistance.d);
assert.equal(roundedTenths,70n);
assert.equal(12n*10n+8n-16n,112n);
const math={
 q05:{method:'exact integer graph substitution and identity',roots:[-1,3],rootValues:[(-1)**2-2*(-1)-3,3**2-2*3-3],vertex:[1,1-2-3],base:3-(-1),height:4,area:4*4/2,live08CounterfactualHeight:3,live08CounterfactualArea:4*3/2,choiceMatches:[false,false,false,true,false]},
 q10:{method:'BigInt rational using printed table decimal, round-half-up to tenths',heightDifference:'12.8-1.6=11.2',tan:'16003/10000',distance:str(tableDistance),roundedDistance:'7.0 m',distancePositive:tableDistance.n>0n&&tableDistance.d>0n,choiceMatches:['6.5','6.8','7.0','7.2','11.2'].map(s=>s==='7.0'),roundingCode:'tenths=(2*n*10+d)/(2*d), integer division for positive n/d'},
 q18:{method:'exact integer linear equations followed by completed square and line substitution',equations:['3a+b=14','a+b=10'],a:2,b:8,vertex:[1,8-2],c:(8-2)+2,coefficientSum:2+8,pointY:3*2+8,nonzeroA:true,choiceMatches:[4,6,8,10,14].map(x=>x===8)}
};
assert.deepEqual(math.q05.rootValues,[0,0]);assert.deepEqual(math.q05.vertex,[1,-4]);assert.equal(math.q05.area,8);assert.equal(math.q05.live08CounterfactualArea,6);
assert.equal(math.q18.pointY,14);assert.equal(math.q18.coefficientSum,10);assert.equal(math.q18.c,8);
for(const q of selected){const calc=math[`q${String(q.questionNumber).padStart(2,'0')}` as keyof typeof math];assert.equal(calc.choiceMatches.filter(Boolean).length,1);}
const candidateTierChecks=selected.map(q=>{
 const c=read(path.join(parent,q.indexRow.candidate));
 return {questionNumber:q.questionNumber,authorDifficulty:c.metadata.difficultyProposal,tierFunctionResult:resolveMiddleTier(c.metadata.difficultyProposal,c.content,c.figureArtifacts.length>0),purpose:'current function only lowers qualifying 기본 to 연산; does not validate family or semantic workload',questionType:c.questionType,choiceCount:c.choices.length,score:c.score,problemTypeProposal:c.metadata.problemTypeProposal};
});
// q10 preview images were personally inspected; their role is a visual evidence reference.
const previews=['q10-1-70mm.png','q10-2-70mm.png'].map(name=>{const p=`${parent}/${base}/bumil-review-r5/blind-results-algebra/previews/${name}`;return {path:p,sha256:seal(p),widthMm:70,personallyViewed:true};});

const ownSeal='9ffb3f203e5b03bdf0953c8e724388edfaa822da';
const ownPaths=execFileSync('git',['ls-tree','-r','--name-only',ownSeal,'--',`${base}/bumil-authoring-r1/geometry`,`${base}/bumil-review-r2/blind-results-geometry`,`${base}/bumil-review-r3/blind-results-geometry`,`${base}/bumil-review-r2/verification-results-geometry`,`${base}/bumil-review-r3/verification-results-geometry`],{cwd:own,encoding:'utf8'}).trim().split('\n');
for(const f of ownPaths){assert(fs.readFileSync(path.join(own,f)).equals(execFileSync('git',['show',`${ownSeal}:${f}`],{cwd:own})));seal(path.join(own,f));}
for(const [f,hash] of seals)assert.equal(sha256(fs.readFileSync(f)),hash,`frozen input changed: ${f}`);

write('input-bindings.json',{schemaVersion:1,reviewerId:'orca-codex-exam-twin-author-geometry-20261008',scope:[5,10,18],kind:'classification-audit-sidecar-input-bindings',candidateIndex:{path:indexPath,sha256:indexHash},methodLinks:{path:methodPath,sha256:methodHash,q10:methodLinks[0]},selected,q07:{status:'unchanged hold; not audited/authored/released',indexRecord:q07[0]},snapshot:{bank:{path:bankPath,sha256:seals.get(path.resolve(bankPath)),capturedAtUTC:bank.capturedAt,capturedAtKst:'2026-10-08 00:57:15.290971 +09:00',originalSourceSnapshotAt:bank.sourceSnapshotAt,transactionReadOnly:bank.transactionReadOnly,livePredicate:bank.livePredicate,liveProblemRowIdsProvided:false},registry:{path:registryPath,sha256:seals.get(path.resolve(registryPath)),capturedAtUTC:snapshotRegistry.capturedAt,capturedAtKst:'2026-10-08 01:08:32.171 +09:00'},currentDatabaseQueried:false},contract:{path:`${parent}/scripts/import/exam-twin/candidatePack.mjs`,sha256:seal(`${parent}/scripts/import/exam-twin/candidatePack.mjs`),exactJSBindingApplied:true},q10Previews:previews});
write('repository-evidence.json',{schemaVersion:1,kind:'read-only-registry-source-unit-seed-comparison',checkoutHeads:[production,parent,own].map(cwd=>({path:cwd,head:execFileSync('git',['rev-parse','HEAD'],{cwd,encoding:'utf8'}).trim(),noCheckoutMutation:true})),files,units,registryEntries,probes,candidateTierChecks,sourceSeedsRan:false,seedWriteEntrypointNotImported:'prisma/seed.ts',generationAPICalls:false,generationDBCalls:false,interpretation:'deterministic outputs illustrate the current rules; static full branch inspection supplies exclusions; samples alone cannot prove variant support'});
write('source-taxonomy-links.json',{schemaVersion:1,path:sourceTaxonomyPath,sha256:sourceTaxonomyHash,selected:sourceTaxonomyRows,sourceContentAndExternalIdsMatch:true,role:'historical source-only taxonomy/method proposal; not current candidate or classification approval',confidenceFieldsUsedForAssignment:false});
write('exact-calculations.json',{schemaVersion:1,method:'deterministic-recalculation-after-prior-reviewed-answer-exposure',newIndependentBlindSolveClaimed:false,sourceInputs:'selected current new student givens only; no original answers/solutions',calculations:math});
write('preservation-manifest.json',{schemaVersion:1,entries:[...seals].map(([file,sha256])=>({file,sha256})),ownPriorCommit:ownSeal,ownPriorFilesChecked:ownPaths.length,inputChecksPassed:true,scope:'selected parent current frozen candidate/assets/solve/review, provided snapshots/reference, relevant repository files, and own prior authored/solve/review artifacts; not a claim about every file in another active session'});
console.log(JSON.stringify({selected:selected.map(q=>({q:q.questionNumber,id:q.twinExternalId,review:q.review.status,bindingsMatch:true})),registryRowsCompared:registryEntries.length,unitSeedsMatched:units.length,ruleFamiliesProbed:probes.length,priorOwnFilesUnchanged:ownPaths.length,preservationFiles:seals.size},null,2));
