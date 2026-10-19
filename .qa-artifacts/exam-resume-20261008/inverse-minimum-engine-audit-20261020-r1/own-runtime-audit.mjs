import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';import {stripTypeScriptTypes,createRequire} from 'node:module';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
const base='.qa-artifacts/exam-resume-20261008/inverse-minimum-engine-audit-20261020-r1/';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));const scope=read(base+'scope-input.json');
const hash=b=>createHash('sha256').update(b).digest('hex');
const sources=new Map(scope.files.map(f=>{const b=fs.readFileSync(f.path);assert.equal(hash(b),f.sha256);return[f.path,b.toString('utf8')];}));
const exact=name=>{const a=scope.files.filter(f=>f.path.endsWith('\\'+name));assert.equal(a.length,1,name);return a[0].path;};
const cache=new Map(),mockedImports=new Set();const middle=[];let routeFamilies=[],renderCalls=0,plannerCalls=0,adapterCalls=0;
const mock=(name,values)=>{mockedImports.add(name);if(!cache.has('mock:'+name))cache.set('mock:'+name,new vm.SyntheticModule(Object.keys(values),function(){for(const[k,v]of Object.entries(values))this.setExport(k,v);},{identifier:'mock:'+name}));return cache.get('mock:'+name);};
const demand='number.inverse-extreme-range';
async function linker(spec,ref){
 if(spec==='zod'){
  const require=createRequire(pathToFileURL(exact('examStudy.contract.ts')));const resolved=require.resolve('zod');return mock('runtime-zod',await import(pathToFileURL(resolved).href));
 }
 if(spec==='node:crypto')return mock('node:crypto',await import('node:crypto'));
 if(spec==='server-only')return mock(spec,{});
 if(spec==='@/lib/math/circledNumber')return mock(spec,{circledValueRaw:x=>'①②③④⑤'.indexOf(x)+1});
 if(spec==='@/lib/problem/parseProblemContent')return mock(spec,{parseProblemContent:content=>({question:content,choices:[]})});
 if(spec==='./adapters')return mock(spec,{legacyStudyFamilies:()=>[],deriveStudyMultipleChoice:()=>{adapterCalls++;throw Error('outside scope MC adapter must not run');}});
 if(spec==='./families/advanced')return mock(spec,{ADVANCED_STUDY_FAMILIES:[]});
 if(spec==='./families/middle')return mock(spec,{MIDDLE_STUDY_FAMILIES:middle});
 if(spec==='./profiles')return mock(spec,{EXAM_STUDY_PROFILES:[],findStudyProfile:()=>undefined,profileMatchesSchool:()=>false});
 if(spec==='./planner')return mock(spec,{allocateStudyQuotas:(rs,count)=>{assert.equal(rs.length,1);return[{...rs[0],requested:count}];},planFullCandidates:(pool)=>{plannerCalls++;assert.equal(pool.length,0);return[];}});
 if(spec==='@/lib/accountAccess')return mock(spec,{authorizeAccount:async()=>({account:{role:'director'}})});
 if(spec==='@/lib/accountRouteAccess')return mock(spec,{accountRouteAllowed:()=>true});
 if(spec==='@/lib/routeAccess')return mock(spec,{routeAccessFor:()=> 'allow'});
 if(spec==='@/lib/textbook/strictJson')return mock(spec,{readStrictJson:request=>request.json()});
 if(spec==='@/lib/figure/renderFigureSpec')return mock(spec,{renderFigureSpec:()=>{renderCalls++;throw Error('held output must not render');}});
 if(spec==='@/lib/examStudy')return mock(spec,{generateExamStudy:(recipe,options)=>generator.generateExamStudy(recipe,{...options,families:routeFamilies,profiles:[]}),getExamStudyCatalog:course=>registry.getExamStudyCatalog(course)});
 let resolved;
 if(spec.startsWith('@/')){
  const suffix='\\src\\'+spec.slice(2).replaceAll('/','\\')+'.ts';const hits=scope.files.filter(f=>f.path.endsWith(suffix));assert.equal(hits.length,1,'unallowed alias '+spec);resolved=hits[0].path;
 }else if(spec.startsWith('.')){resolved=path.win32.normalize(path.win32.join(path.win32.dirname(ref.identifier),spec+'.ts'));assert(sources.has(resolved),'unallowed relative '+resolved);}
 else throw Error('unallowed import '+spec);
 return load(resolved);
}
function load(file){if(cache.has(file))return cache.get(file);assert(sources.has(file));const m=new vm.SourceTextModule(stripTypeScriptTypes(sources.get(file),{mode:'transform',sourceUrl:file}),{identifier:file});cache.set(file,m);return m;}
async function evaluate(name){const m=load(exact(name));if(m.status==='unlinked')await m.link(linker);if(m.status==='linked')await m.evaluate();return m.namespace;}
const kernel=await evaluate('inverseMinimum.ts'),family=kernel.inverseMinimum;
const identity=await evaluate('identity.ts');const registry=await evaluate('registry.ts');const evidence=await evaluate('evidence.ts');const release=await evaluate('releaseEligibility.ts');const curriculum=await evaluate('curriculumEligibility.ts');const contracts=await evaluate('examStudy.contract.ts');const requirements=await evaluate('requirements.ts');
const generator=await evaluate('generate.ts');
const packet=read(base+'actual-drafts.json');const proposal=read('.qa-artifacts/exam-resume-20261008/inverse-minimum-proposal-20261020-r1/student-only24.json');
const actual=Array.from({length:24},(_,i)=>family.generate(0,i));assert.deepEqual(actual,packet.drafts);
for(let i=0;i<24;i++){assert.equal(actual[i].content,proposal.students[i].content);assert.equal(actual[i].questionType,proposal.students[i].questionType);assert.equal(family.verify(actual[i]).valid,true);assert.equal(evidence.verifyDraft(family,actual[i]).valid,true);}
assert.equal(new Set(actual.map(x=>x.content)).size,24);assert.equal(new Set(actual.map(x=>x.answer)).size,6);
const tuples=family.paramDomain.enumerate();assert.equal(tuples.length,24);assert.equal(family.paramDomain.size,24);assert.equal(new Set(tuples.map(identity.stableStringify)).size,24);registry.validateStudyFamilies([family]);
for(const t of tuples){registry.assertCanonicalParams(t);assert.deepEqual(Object.keys(t).sort(),['offset','radicand','small','visibleOffset']);}
const mutations=[];
for(let i=0;i<24;i++){
 const a=actual[i];const n=a.parameters.radicand;
 const cases=[
 ['minimum condition',x=>x.content=x.content.replace('가장 작은 수였다','가장 큰 수였다')],
 ['range order',x=>x.content=x.content.replace('최댓값에서 최솟값','최솟값에서 최댓값')],
 ['visible pair sign',x=>x.content=x.content.replace('\\sqrt3-\\sqrt2','\\sqrt3+\\sqrt2')],
 ['first root',x=>x.content=x.content.replace('\\sqrt{'+n+'}','\\sqrt{'+(n+1)+'}')],
 ['range sign',x=>x.content=x.content.replace('2\\sqrt{'+n+'}-','2\\sqrt{'+n+'}+')],
 ['answer zero',x=>x.answer='0'],['answer opposite',x=>x.answer='-('+x.answer+')'],
 ['params radicand',x=>x.parameters.radicand=0],['params small',x=>x.parameters.small=4],['params offset',x=>x.parameters.offset=2],['params fourth',x=>x.parameters.visibleOffset=1],['params extra seed',x=>x.parameters.seed=1],['params NaN',x=>x.parameters.small=NaN],
 ['solution theorem',x=>x.solution+=' 미분한다.'],['solution sign',x=>x.solution=x.solution.replace('>2','<2')],['solution empty',x=>x.solution=''],
 ['format MC',x=>x.questionType='객관식'],['format written',x=>x.questionType='서술형'],['difficulty',x=>x.difficulty='응용'],['difficulty basis',x=>x.difficultyBasis=['other']],['figure',x=>x.figureSpec={}],['distractors',x=>x.distractors=['0']],['rubric',x=>x.rubric={}]
 ];
 for(const[name,mutate]of cases){const x=structuredClone(a);mutate(x);assert.notDeepEqual(x,a,name);const r=family.verify(x);assert.equal(r.valid,false,i+' '+name);mutations.push({variant:i,name,errors:r.errors});}
}
let seedCases=0;
const seeds=[0,1,-1,24,-24,Number.MAX_SAFE_INTEGER,Number.MIN_SAFE_INTEGER];const variants=[0,1,23,24,Number.MAX_SAFE_INTEGER];
for(const s of seeds)for(const v of variants){const a=family.generate(s,v),b=family.generate(s,v);assert.deepEqual(a,b);assert.equal(family.verify(a).valid,true);const index=((BigInt(s)%24n)+(BigInt(v)%24n)+24n)%24n;assert.deepEqual(a,actual[Number(index)]);seedCases++;}
const invalidSeeds=[NaN,Infinity,-Infinity,0.5,Number.MAX_SAFE_INTEGER+1];const invalidVariants=[-1,0.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1];
for(const s of invalidSeeds)assert.throws(()=>family.generate(s,0));for(const v of invalidVariants)assert.throws(()=>family.generate(0,v));
const changed=family.paramDomain.enumerate();changed[0].radicand=-99;assert.equal(family.paramDomain.enumerate()[0].radicand,7);
const isolated=family.generate(0,0);isolated.parameters.radicand=-1;isolated.difficultyBasis[0]='mutated';assert.deepEqual(family.generate(0,0),actual[0]);
const cp=family.canonicalParams(actual[0]);cp.radicand=-1;assert.equal(actual[0].parameters.radicand,7);
let factoryCalls=0;const wrapped=(change)=>({...family,...change,generate:(...args)=>{factoryCalls++;return family.generate(...args);}});
const changes=[{}, {id:'renamed-held'}, {version:'999-future'}, {source:'native'}, {component:true,gradeApproved:true,rightsApproved:true,nativeApproved:true,confidence:1}, {fulfills:[{requirement:demand,level:'component'}]}, {id:'future-native',version:'999',source:'native',gradeApproved:true,rightsApproved:true,confidence:1,fulfills:[{requirement:demand,level:'component'}]}];
const held=[];const formats=['혼합','객관식','단답형','서술형'];
for(let j=0;j<changes.length;j++){
 const f=wrapped({...changes[j],id:'audit-'+j+'-'+(changes[j].id??family.id)});middle.push(f);
 assert.equal(release.studyReleaseHold(f).status,'review-only-template');assert.equal(evidence.familyCoverage(f,demand),'unavailable');
 for(const format of formats){const request={course:'중3',familyIds:[f.id],requirementIds:[demand],count:1,maxPerFamily:1,seed:7,format};const out=await generator.generateExamStudy(request,{families:[f],profiles:[]});assert.equal(out.status,'unavailable');assert.equal(out.deliveredCount,0);assert.equal(out.requirements[0].status,'unavailable');held.push({change:j,format,status:out.status,digest:out.digest,warning:out.warnings,manifestVersion:out.manifestVersion});}
}
assert.equal(factoryCalls,0);assert.equal(registry.getExamStudyCatalog('중3').families.length,0);assert.equal(registry.examStudyFamilies().length,middle.length);
const m1=wrapped({id:'m1-hard-priority',course:'중1',fulfills:[{requirement:demand,level:'full'},{requirement:'number.coprime-symbolic-sum',level:'full'}]});
const priority=await generator.generateExamStudy({course:'중1',familyIds:[m1.id],requirementIds:[demand],count:1,seed:1,format:'혼합'},{families:[m1],profiles:[]});assert.equal(priority.status,'unavailable');assert(priority.warnings.includes(curriculum.studyCurriculumHold(m1).message));assert(!priority.warnings.includes(release.studyReleaseHold(m1).message));assert.equal(factoryCalls,0);
assert.equal(release.STUDY_RELEASE_POLICY_VERSION,'20261020-source-informed-template-review-r3');
const manifest=registry.studyManifestVersion([family]);
const familyRecord=f=>({id:f.id,version:f.version,course:f.course,source:f.source,fulfills:f.fulfills,formats:f.formats,difficulties:f.difficulties,representation:f.representation,figureKinds:f.figureKinds,evidence:f.evidence,domain:{kind:'finite',size:f.paramDomain.size,parameters:f.paramDomain.enumerate()}});
const material={engine:registry.EXAM_STUDY_ENGINE_VERSION,curriculumPolicy:curriculum.STUDY_CURRICULUM_POLICY_VERSION,releasePolicy:release.STUDY_RELEASE_POLICY_VERSION,requirements:requirements.STUDY_REQUIREMENTS,families:[familyRecord(family)]};assert.equal(manifest,'exam-study-manifest-'+identity.sha256(material).slice(0,24));
const oldPolicyManifest='exam-study-manifest-'+identity.sha256({...material,releasePolicy:'20261019-source-informed-template-review-r2'}).slice(0,24);assert.notEqual(manifest,oldPolicyManifest);
const alteredVersion=registry.studyManifestVersion([{...family,version:'2'}]);assert.notEqual(manifest,alteredVersion);
for(const key of ['family','families','gradeApproved','rightsApproved','confidence','component','native'])assert.equal(contracts.examStudyGenerateRequestSchema.safeParse({course:'중3',requirementIds:[demand],count:1,seed:0,[key]:true}).success,false);
routeFamilies=[middle[0]];const routes=await evaluate('examStudyRoutes.ts');const recipe={course:'중3',familyIds:[middle[0].id],requirementIds:[demand],count:1,seed:1,format:'단답형'};
const unavailable=await generator.generateExamStudy(recipe,{families:routeFamilies,profiles:[]});
const request=(body)=>new Request('http://audit.local/api/exam-study/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const routeResults=[];
for(const expectedDigest of [unavailable.digest,'0'.repeat(64)]){const response=await routes.resolveExamStudy(request({recipe,expectedDigest}));assert.equal(response.status,409);routeResults.push({expectedDigest,status:response.status,body:await response.json()});}
for(const extra of [{gradeApproved:true},{family:family.id}]){const response=await routes.resolveExamStudy(request({recipe:{...recipe,...extra},expectedDigest:unavailable.digest}));assert.equal(response.status,400);routeResults.push({injection:extra,status:response.status});}
const catalogResponse=await routes.examStudyCatalog(new Request('http://audit.local/api/exam-study?course='+encodeURIComponent('중3')));assert.equal(catalogResponse.status,200);assert.equal((await catalogResponse.json()).data.families.length,0);
assert.equal(factoryCalls,0);assert.equal(renderCalls,0);assert.equal(adapterCalls,0);
const after=scope.files.map(f=>{const sha256=hash(fs.readFileSync(f.path));assert.equal(sha256,f.sha256);return{path:f.path,sha256};});
fs.writeFileSync(base+'own-runtime-drafts24.json',JSON.stringify({drafts:actual,metadata:kernel.inverseMinimumStudyMetadata},null,2)+'\n',{flag:'wx'});
fs.writeFileSync(base+'own-runtime-results.json',JSON.stringify({actual24MatchesPacketAndProposal:true,finiteTuples:24,distinctStatements:24,distinctAnswers:6,kernelMutations:mutations,kernelMutationCount:mutations.length,safeSeedCases:seedCases,invalidSeedCases:invalidSeeds.length,invalidVariantCases:invalidVariants.length,enumerationAndDraftAndCanonicalCopiesIsolated:true,releaseHeldCases:held,releaseCaseCount:held.length,factoryCalls,renderCalls,adapterCalls,plannerCalls,catalogHidden:true,catalogRouteMockStatus:catalogResponse.status,m1Priority:{warnings:priority.warnings,status:priority.status},manifest:{policy:release.STUDY_RELEASE_POLICY_VERSION,current:manifest,oldPolicyMaterialOnly:oldPolicyManifest,changedFamilyVersion:alteredVersion},strictSchemaInjectionRejections:7,resolverMockResults:routeResults,mockedImports:[...mockedImports],actualModulesExecuted:[...cache.keys()].filter(x=>!x.startsWith('mock:')),limits:['No full registry or real DB/HTTP/auth/strictJson/native renderer. Explicit custom family list and mocks for outside-scope imports.','Planner mock only handles empty eligible pool; no positive delivered generation/MC derivation or full planning certification.','Node built-in TypeScript transformation in memory; no root writes. Zod runtime resolved read-only.','Old policy test changes digest material only, not a historical runtime execution.']},null,2)+'\n',{flag:'wx'});
fs.writeFileSync(base+'own-source-hashes-after.json',JSON.stringify(after,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({actual24:true,mutations:mutations.length,safeSeeds:seedCases,releaseCases:held.length,factoryCalls,resolver:routeResults.map(x=>x.status),sourceHashes:after.length}));
