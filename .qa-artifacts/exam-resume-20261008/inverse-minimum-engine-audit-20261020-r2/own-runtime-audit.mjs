import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {family as minimum,tableKernel,identity,registry,evidence,release,curriculum,contracts,requirements,generator,evaluate,setRouteFamilies,sources,exact,stripTypeScriptTypes,vm,linker,middle} from './own-bounded-loader.mjs';
const p='.qa-artifacts/exam-resume-20261008/inverse-minimum-engine-audit-20261020-r2/';const read=x=>JSON.parse(fs.readFileSync(x,'utf8').replace(/^\uFEFF/,''));const hash=x=>createHash('sha256').update(x).digest('hex');
const packet=read(p+'actual-drafts.json');const scope=read(p+'scope-input.json');const receipt=read(p+'baseline-source-receipt.json');const table=tableKernel.inverseRootTable;
const helper=await evaluate('support.ts');
async function isolated(text,name){const m=new vm.SourceTextModule(stripTypeScriptTypes(text,{mode:'transform'}),{identifier:name});await m.link(async spec=>{assert.equal(spec,'./support');const actual=new vm.SyntheticModule(['insist','match'],function(){this.setExport('insist',helper.insist);this.setExport('match',helper.match);});return actual;});await m.evaluate();return m.namespace;}
const cases=[{name:'minimum',family:minimum,count:24,file:'inverseMinimum.ts',baseline:'baseline-inverse-minimum-v1.ts',exportName:'inverseMinimum',demand:'number.inverse-extreme-range'},{name:'table',family:table,count:45,file:'inverseRootTable.ts',baseline:'baseline-inverse-root-table-v1.ts',exportName:'inverseRootTable',demand:'number.inverse-root-table'}];
const fault=[],mutations=[],reproduction=[],actual={};
for(const c of cases){
 assert.equal(c.family.version,'2');const oldText=fs.readFileSync(p+c.baseline,'utf8').replace(/^\uFEFF/,'');assert.equal(hash(fs.readFileSync(p+c.baseline)),receipt.sources.find(x=>x.copy===c.baseline).sha256);const newText=sources.get(exact(c.file));
 const baseline=(await isolated(oldText,c.name+'-baseline'))[c.exportName];assert.equal(baseline.version,'1');
 const find=c.name==='minimum'?'const answer = `\\\\sqrt{${s}}-\\\\sqrt{${r}}`;':'answer: decimal(start + index, 2),';const replacement=c.name==='minimum'?'const answer = "0";':'answer: "0",';assert.equal(oldText.split(find).length,2);assert.equal(newText.split(find).length,2);
 const oldPoison=(await isolated(oldText.replace(find,replacement),c.name+'-r1-answer-poison'))[c.exportName];const newPoison=(await isolated(newText.replace(find,replacement),c.name+'-r2-answer-poison'))[c.exportName];
 actual[c.name]=[];
 for(let i=0;i<c.count;i++){
  const item=c.family.generate(0,i);assert.deepEqual(item,packet[c.name][i]);assert.deepEqual(baseline.generate(0,i),item);assert.equal(c.family.verify(item).valid,true);assert.equal(evidence.verifyDraft(c.family,item).valid,true);actual[c.name].push(item);
  const wrongOld=oldPoison.generate(0,i),wrongNew=newPoison.generate(0,i);assert.equal(wrongOld.content,item.content);assert.equal(wrongNew.content,item.content);assert.equal(wrongOld.answer,'0');assert.equal(wrongNew.answer,'0');assert.notEqual(item.answer,'0');assert.equal(oldPoison.verify(wrongOld).valid,true);const verdict=newPoison.verify(wrongNew);assert.equal(verdict.valid,false);fault.push({family:c.name,index:i,type:'make-answer-only-0',r1Accepted:true,r2Accepted:false,r2Errors:verdict.errors});
  const common=[['wrong answer',x=>x.answer='0'],['answer sign',x=>x.answer='-('+x.answer+')'],['extra parameter',x=>x.parameters.extra=1],['NaN parameter',x=>x.parameters[Object.keys(x.parameters)[0]]=NaN],['wrong solution',x=>x.solution+=' 미분으로 검산한다.'],['empty solution',x=>x.solution=''],['MC format',x=>x.questionType='객관식'],['written format',x=>x.questionType='서술형'],['wrong difficulty',x=>x.difficulty=x.difficulty==='기본'?'응용':'기본'],['difficulty basis',x=>x.difficultyBasis=['unreviewed']],['figure',x=>x.figureSpec={}],['distractors',x=>x.distractors=['0']],['rubric',x=>x.rubric={}]];
  const special=c.name==='minimum'?[
   ['minimum condition',x=>x.content=x.content.replace('가장 작은 수였다','가장 큰 수였다')],['range order',x=>x.content=x.content.replace('최댓값에서 최솟값','최솟값에서 최댓값')],['root sign',x=>x.content=x.content.replace('\\sqrt3-\\sqrt2','\\sqrt3+\\sqrt2')],['range coefficient',x=>x.content=x.content.replace('2\\sqrt{','3\\sqrt{')],['parameter radicand',x=>x.parameters.radicand=0]
  ]:[
   ['rounding text',x=>x.content=x.content.replace('반올림','버림')],['positive condition',x=>x.content=x.content.replace('양수','실수')],['100 scale',x=>x.content=x.content.replace('\\dfrac{x}{100}','\\dfrac{x}{10}')],['root cell',x=>x.content=x.content.replace(/\|\$\d\.\d{3}\$/u,'|$9.999$')],['input cell',x=>x.content=x.content.replace(/\|\$\d\.\d{2}\$/u,'|$9.99$')],['index parameter',x=>x.parameters.index=5],['exact radical misstatement',x=>x.solution=x.solution.replace('정확히 같다고 놓은 것이 아니다','정확히 같다')]
  ];
  for(const[name,fn]of [...common,...special]){const changed=structuredClone(item);fn(changed);assert.notDeepEqual(changed,item,name);const r=c.family.verify(changed);assert.equal(r.valid,false,c.name+i+name);mutations.push({family:c.name,index:i,name,errors:r.errors});}
 }
 assert.equal(c.family.paramDomain.size,c.count);const tuples=c.family.paramDomain.enumerate();assert.equal(new Set(tuples.map(identity.stableStringify)).size,c.count);registry.validateStudyFamilies([c.family]);
 const copy=c.family.paramDomain.enumerate();copy[0][Object.keys(copy[0])[0]]=-1;assert.deepEqual(c.family.paramDomain.enumerate(),tuples);
 const draft=c.family.generate(0,0);draft.parameters[Object.keys(draft.parameters)[0]]=-1;draft.difficultyBasis[0]='changed';assert.deepEqual(c.family.generate(0,0),actual[c.name][0]);
 for(const seed of [0,-1,Number.MAX_SAFE_INTEGER])for(const variant of [0,c.count-1,Number.MAX_SAFE_INTEGER]){const out=c.family.generate(seed,variant);const index=Number(((BigInt(seed)%BigInt(c.count))+(BigInt(variant)%BigInt(c.count))+BigInt(c.count))%BigInt(c.count));assert.deepEqual(out,actual[c.name][index]);assert.deepEqual(out,c.family.generate(seed,variant));reproduction.push({family:c.name,seed,variant,index});}
 for(const seed of [NaN,Infinity,0.5,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>c.family.generate(seed,0));for(const variant of [-1,NaN,0.5,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>c.family.generate(0,variant));
}
// Fault only the producer binary-search result; R1 shares that search while R2 has a separate certificate.
const roundFind='BigInt(4) * squared < (two * low + one) ** two ? low : low + one,';const roundReplace='(BigInt(4) * squared < (two * low + one) ** two ? low : low + one) + one,';
for(const [version,text]of [['r1',fs.readFileSync(p+'baseline-inverse-root-table-v1.ts','utf8')],['r2',sources.get(exact('inverseRootTable.ts'))]]){
 assert.equal(text.split(roundFind).length,2);const poisoned=(await isolated(text.replace(roundFind,roundReplace),version+'-root-search-plus1')).inverseRootTable;
 for(let i=0;i<45;i++){const bad=poisoned.generate(0,i);assert.notEqual(bad.content,packet.table[i].content);const verdict=poisoned.verify(bad);assert.equal(verdict.valid,version==='r1');fault.push({family:'table',index:i,type:'producer-root-search-plus1',version,accepted:verdict.valid,errors:verdict.errors});}
}
let factoryCalls=0;const held=[];const formats=['혼합','객관식','단답형','서술형'];
for(const c of cases){
 const changes=[{}, {id:'renamed'}, {version:'999'}, {source:'native'}, {gradeApproved:true,rightsApproved:true,confidence:1,nativeApproved:true}, {fulfills:[{requirement:c.demand,level:'component'}]}, {id:'all-flags',version:'999',source:'native',component:true,gradeApproved:true,rightsApproved:true,confidence:1,fulfills:[{requirement:c.demand,level:'component'}]}];
 for(let j=0;j<changes.length;j++){
  const f={...c.family,...changes[j],id:'r2-'+c.name+'-'+j,generate:(...args)=>{factoryCalls++;return c.family.generate(...args);}};middle.push(f);assert.equal(release.studyReleaseHold(f).status,'review-only-template');assert.equal(evidence.familyCoverage(f,c.demand),'unavailable');
  for(const format of formats){const request={course:'중3',familyIds:[f.id],requirementIds:[c.demand],count:1,seed:7,format};const out=await generator.generateExamStudy(request,{families:[f],profiles:[]});assert.equal(out.status,'unavailable');assert.equal(out.deliveredCount,0);assert.equal(out.requirements[0].status,'unavailable');held.push({family:c.name,variant:j,format,status:out.status});}
 }
 const m1={...c.family,id:'m1-'+c.name,course:'중1',fulfills:[{requirement:c.demand,level:'full'},{requirement:'number.coprime-symbolic-sum',level:'full'}],generate:()=>{factoryCalls++;throw Error('must hold');}};
 const result=await generator.generateExamStudy({course:'중1',familyIds:[m1.id],requirementIds:[c.demand],count:1,seed:0,format:'혼합'},{families:[m1],profiles:[]});assert.equal(result.status,'unavailable');assert(result.warnings.includes(curriculum.studyCurriculumHold(m1).message));assert(!result.warnings.includes(release.studyReleaseHold(m1).message));
}
assert.equal(registry.getExamStudyCatalog('중3').families.length,0);assert.equal(factoryCalls,0);assert.equal(release.STUDY_RELEASE_POLICY_VERSION,'20261020-source-informed-template-review-r3');
const routes=await evaluate('examStudyRoutes.ts');const stale=[];
for(const c of cases){
 const f={...c.family,generate:(...a)=>{factoryCalls++;return c.family.generate(...a);}};setRouteFamilies([f]);const recipe={course:'중3',familyIds:[f.id],requirementIds:[c.demand],count:1,seed:1,format:'단답형'};const current=await generator.generateExamStudy(recipe,{families:[f],profiles:[]});const oldManifest=registry.studyManifestVersion([{...f,version:'1'}]);assert.notEqual(current.manifestVersion,oldManifest);
 const material={engineVersion:current.engineVersion,manifestVersion:current.manifestVersion,recipe:current.recipe,profile:null,status:current.status,questions:[],requirements:current.requirements.map(({id,status,requested,delivered})=>({id,status,requested,delivered}))};assert.equal(identity.sha256(material),current.digest);const oldDigest=identity.sha256({...material,manifestVersion:oldManifest});assert.notEqual(oldDigest,current.digest);
 const req=body=>new Request('http://audit.local/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const response=await routes.resolveExamStudy(req({recipe,expectedDigest:oldDigest}));assert.equal(response.status,409);
 const injection=await routes.resolveExamStudy(req({recipe:{...recipe,gradeApproved:true},expectedDigest:current.digest}));assert.equal(injection.status,400);
 stale.push({family:c.name,currentManifest:current.manifestVersion,oldVersion1Manifest:oldManifest,currentDigest:current.digest,oldVersionMaterialDigest:oldDigest,resolverStatus:response.status,injectionStatus:injection.status,limit:'v1 digest material reconstructed with current policy and unchanged metadata; not historical full-runtime execution.'});
}
for(const key of ['families','family','gradeApproved','rightsApproved'])assert.equal(contracts.examStudyGenerateRequestSchema.safeParse({course:'중3',count:1,seed:1,requirementIds:['number.inverse-extreme-range'],[key]:true}).success,false);
assert.equal(factoryCalls,0);
const after=scope.files.map(f=>{const sha256=hash(fs.readFileSync(f.path));assert.equal(sha256,f.sha256);return{path:f.path,sha256};});
fs.writeFileSync(p+'own-source-hashes-after.json',JSON.stringify(after,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(p+'own-current69-drafts.json',JSON.stringify(actual,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(p+'own-runtime-results.json',JSON.stringify({bothFamilyVersions:'2',all69CurrentDraftsMatchPacketAndR1Baselines:true,positiveCases:69,faultControls:fault,faultCounts:{r1MakeAnswerPoisonAccepted:69,r2MakeAnswerPoisonRejected:69,r1RootSearchPlus1Accepted:45,r2RootSearchPlus1Rejected:45},kernelMutations:mutations,kernelMutationCount:mutations.length,seedReproductionCases:reproduction,seedReproductionCount:reproduction.length,invalidSeedsVariantsRejected:16,finiteDomainCopiesIsolated:true,releaseHeld:held,releaseHeldCount:held.length,factoryCalls,catalogHidden:true,coverageUnavailable:true,m1PriorityBothFamilies:true,staleVersionMockResolvers:stale,strictInjectionRejected:4,mocks:'same explicit bounded mocks as own-bounded-loader.mjs; no outside registered families, real auth/strictJson, DB/HTTP/native rendering',parentTestCountsClaimed:0},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({positive:69,r1AnswerPoisonAccepted:69,r2AnswerPoisonRejected:69,r1RootSearchPoisonAccepted:45,r2RootSearchPoisonRejected:45,mutations:mutations.length,releaseCases:held.length,factoryCalls,sourceHashes:after.length}));
