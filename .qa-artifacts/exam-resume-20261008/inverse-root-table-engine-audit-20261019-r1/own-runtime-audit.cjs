const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {stripTypeScriptTypes,createRequire}=require('node:module');
const folder=__dirname, scope=JSON.parse(fs.readFileSync(path.join(folder,'scope-input-r2.json'),'utf8').replace(/^\uFEFF/,'')), original=JSON.parse(fs.readFileSync(path.join(folder,'scope-input.json'),'utf8').replace(/^\uFEFF/,''));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const source={}, before={};for(const f of scope.files){const bytes=fs.readFileSync(f.path);assert.equal(sha(bytes),f.sha256);source[path.basename(f.path)]=bytes.toString('utf8');before[f.path]=sha(bytes);}
const currentRelease=source['releaseEligibility.ts'];
const reversed=currentRelease.replace('): typeof INVERSE_COEFFICIENT_REVIEW | typeof INVERSE_ROOT_TABLE_REVIEW | null {','): typeof INVERSE_COEFFICIENT_REVIEW | null {');
const oldReleaseHash=original.files.find(f=>path.basename(f.path)==='releaseEligibility.ts').sha256;
assert.equal(sha(Buffer.from(reversed)),oldReleaseHash,'only return annotation must differ');
const requirePackage=createRequire(path.join(scope.parentWorkspace,'__audit_virtual__.cjs'));
const req='number.inverse-root-table';let active=[],routeOptions={},runtimeFactoryCalls=0,renderCalls=0,releaseCalls=0;
const mocked={
 '@/lib/math/circledNumber':{circledValueRaw:()=>0},
 '@/lib/problem/parseProblemContent':{parseProblemContent:()=>({choices:[]})},
 './adapters':{legacyStudyFamilies:()=>[],deriveStudyMultipleChoice:()=>{throw Error('unexpected MC adapter')}},
 './families/advanced':{ADVANCED_STUDY_FAMILIES:[]},
 './families/middle':{get MIDDLE_STUDY_FAMILIES(){return active}},
 './profiles':{EXAM_STUDY_PROFILES:[],findStudyProfile:()=>undefined,profileMatchesSchool:()=>false},
 './planner':{allocateStudyQuotas:(selected,count)=>selected.map(r=>({id:r.id,requested:count})),planFullCandidates:(pool)=>{assert.equal(pool.length,0);return[]}},
 '@/lib/accountAccess':{authorizeAccount:async()=>({account:{role:'director'}})},
 '@/lib/accountRouteAccess':{accountRouteAllowed:()=>true},
 '@/lib/routeAccess':{routeAccessFor:()=> 'allow'},
 '@/lib/textbook/strictJson':{readStrictJson:async r=>r.json()},
 '@/lib/figure/renderFigureSpec':{renderFigureSpec:()=>{renderCalls++;throw Error('no rendering permitted')}},
 'server-only':{},
};
let cache={},policyOverride=null;
function load(name){
 if(cache[name])return cache[name];let text=source[name];assert.equal(typeof text,'string','not in scope '+name);
 let js=stripTypeScriptTypes(text,{mode:'transform'});const exports=[...js.matchAll(/export\s+(?:async\s+)?(?:function|class|const)\s+(\w+)/g)].map(m=>m[1]);
 js=js.replace(/import\s+(\{[\s\S]*?\}|[A-Za-z_]\w*)\s+from\s+"([^"]+)";/g,(_,bindings,dep)=>'const '+bindings.trim().replace(/\bas\s+/g,': ')+'=__req('+JSON.stringify(dep)+');').replace(/^import\s+"([^"]+)";/gm,(_,dep)=>'__req('+JSON.stringify(dep)+');').replace(/\bexport\s+/g,'');
 const deps=(dep)=>{
  if(dep==='node:crypto')return crypto;
  if(dep==='zod')return requirePackage('zod');
  if(dep==='@/lib/examStudy')return{generateExamStudy:(r)=>load('generate.ts').generateExamStudy(r,routeOptions),getExamStudyCatalog:load('registry.ts').getExamStudyCatalog};
  if(dep in mocked)return mocked[dep];
  const name=path.basename(dep)+'.ts';assert(name in source,'unmocked outside import '+dep);
  const m=load(name);
  if(name==='releaseEligibility.ts')return {...m,STUDY_RELEASE_POLICY_VERSION:policyOverride??m.STUDY_RELEASE_POLICY_VERSION,studyReleaseHold:(f)=>{releaseCalls++;return m.studyReleaseHold(f)}};
  return m;
 };
 let m;try{m=new Function('__req',js+'\nreturn {'+exports.join(',')+'};')(deps);}catch(e){e.message=name+': '+e.message;throw e;}cache[name]=m;return m;
}
(async()=>{
 const {inverseRootTable:f,inverseRootTableStudyMetadata:meta}=load('inverseRootTable.ts');
 const oracle=JSON.parse(fs.readFileSync(path.join(folder,'own-decimal-rational-oracle.json'),'utf8'));
 const full=JSON.parse(fs.readFileSync(path.join(folder,'own-generated-drafts.json'),'utf8'));
 let good=0,mutations=0;const mutationCounts={};
 for(const r of oracle.results){const q=full.drafts[r.ordinal].draft;assert.equal(sha(Buffer.from(q.content)),r.printedContentSha256);assert.equal(q.answer,r.independentlyRecoveredAnswer);assert.deepEqual(q.parameters,r.independentlyRecoveredParameters);assert.equal(f.verify(q).valid,true);good++;
  const bad=[];const add=(label,fn)=>{const z=structuredClone(q);fn(z);assert.notDeepEqual(z,q,label);bad.push([label,z])};
  const roots=q.content.split('\n').find(l=>l.startsWith('|$\\sqrt{x}$의 근삿값|'));const inputs=q.content.split('\n').find(l=>l.startsWith('|$x$|'));
  for(let j=0;j<5;j++){
   add('root-cell',z=>{const cells=roots.split('|');const v=Number(cells[j+2].slice(1,-1));cells[j+2]='$'+(v+.001).toFixed(3)+'$';z.content=z.content.replace(roots,cells.join('|'))});
   add('input-cell',z=>{const cells=inputs.split('|');const v=Number(cells[j+2].slice(1,-1));cells[j+2]='$'+(v+.01).toFixed(2)+'$';z.content=z.content.replace(inputs,cells.join('|'))});
  }
  add('rounding-text',z=>z.content=z.content.replace('소수 넷째 자리','소수 셋째 자리'));
  add('approximation-text',z=>z.content=z.content.replace('표의 소수값을 그대로 이용','실제 근호값을 정확히 이용'));
  add('positive-condition',z=>z.content=z.content.replace('양수 $a,b$','실수 $a,b$'));
  add('scale-100',z=>z.content=z.content.replace('\\dfrac{x}{100}','\\dfrac{x}{10}'));
  add('unmatched-result',z=>z.content=z.content.replace(/계산한 결과는 \$\d+\.\d{2}\$/,'계산한 결과는 $99.99$'));
  add('solution-assert-exact',z=>z.solution+=' 실제 제곱근과 인쇄 소수는 정확히 같다.');
  add('solution-drop-positive',z=>z.solution=z.solution.replace('$b$가 양수이고','$b$가 음수이고'));
  add('wrong-answer',z=>z.answer='9.99');
  add('params-index',z=>z.parameters.index=5);add('params-start',z=>z.parameters.start=999);add('params-broot',z=>z.parameters.bRoot=8);add('params-extra',z=>z.parameters.extra=1);add('params-missing',z=>delete z.parameters.index);add('params-nan',z=>z.parameters.index=NaN);
  add('MC-format',z=>z.questionType='객관식');add('written-format',z=>z.questionType='서술형');add('distractors',z=>z.distractors=[]);add('rubric',z=>z.rubric={});add('figure',z=>z.figureSpec={});add('difficulty',z=>z.difficulty='기본');add('difficulty-basis',z=>z.difficultyBasis=['approved']);
  for(const [label,z]of bad){assert.equal(f.verify(z).valid,false,label);mutations++;mutationCounts[label]=(mutationCounts[label]??0)+1;}
 }
 const d=f.paramDomain.enumerate();assert.equal(d.length,45);assert.equal(new Set(d.map(JSON.stringify)).size,45);d[0].start=999;assert.notEqual(f.paramDomain.enumerate()[0].start,999);
 const reproducibility=[];for(const seed of [Number.MIN_SAFE_INTEGER,-46,-1,0,1,44,45,Number.MAX_SAFE_INTEGER])for(const variant of [0,1,44,45,Number.MAX_SAFE_INTEGER]){const q=f.generate(seed,variant);assert.deepEqual(q,f.generate(seed,variant));assert.equal(f.verify(q).valid,true);reproducibility.push({seed,variant});}
 let invalidRejected=0;for(const [seed,v]of [[NaN,0],[Infinity,0],[-Infinity,0],[.5,0],[Number.MAX_SAFE_INTEGER+1,0],[0,-1],[0,.5],[0,NaN],[0,Infinity],[0,Number.MAX_SAFE_INTEGER+1]]){assert.throws(()=>f.generate(seed,v));invalidRejected++;}
 const variants=[{}, {version:'0'}, {version:'999'}, {id:'renamed-review'}, {source:'native'}, {fulfills:[{requirement:req,level:'component'}]}, {gradeApproved:true,rightsApproved:true,nativeProvenanceApproved:true,confidence:1}, {id:'renamed-native',version:'future',source:'native',fulfills:[{requirement:req,level:'component'}],gradeApproved:true,rightsApproved:true,confidence:1}];
 const releaseResults=[];
 for(const change of variants)for(const format of ['혼합','단답형','객관식','서술형']){
  const variant={...f,...change,generate:()=>{runtimeFactoryCalls++;throw Error('held factory called')}};
  const result=await load('generate.ts').generateExamStudy({course:'중3',familyIds:[variant.id],requirementIds:[req],count:1,seed:7,format},{families:[variant],profiles:[]});
  assert.equal(result.status,'unavailable');assert.equal(result.deliveredCount,0);assert.equal(result.requirements[0].status,'unavailable');assert.equal(load('evidence.ts').familyCoverage(variant,req),'unavailable');assert.equal(load('releaseEligibility.ts').studyReleaseHold(variant).status,'review-only-template');releaseResults.push({change,format,status:result.status,factoryCalls:runtimeFactoryCalls});
 }
 assert.equal(runtimeFactoryCalls,0);
 const m1={...f,course:'중1',fulfills:[...f.fulfills,{requirement:'number.coprime-symbolic-sum',level:'full'}],generate:()=>{runtimeFactoryCalls++;throw Error('M1 held factory')}};
 releaseCalls=0;const m1result=await load('generate.ts').generateExamStudy({course:'중1',familyIds:[m1.id],requirementIds:[req],count:1,seed:7,format:'혼합'},{families:[m1],profiles:[]});assert.equal(releaseCalls,0);assert(m1result.warnings.some(s=>s.includes('중1 범위를')));
 const m1ReleaseCalls=releaseCalls;active=[f];const catalog=load('registry.ts').getExamStudyCatalog('중3');assert.equal(catalog.families.length,0);assert(catalog.requirements.some(r=>r.id===req));
 const manifest=load('registry.ts').studyManifestVersion([f]);cache={};policyOverride='counterfactual-previous-release-policy';const oldManifest=load('registry.ts').studyManifestVersion([f]);assert.notEqual(oldManifest,manifest);cache={};policyOverride=null;
 const base={course:'중3',familyIds:[f.id],requirementIds:[req],count:1,seed:7,format:'単答型'};base.format='단답형';
 let injections=0;for(const extra of [{families:[f]},{gradeApproved:true},{source:'native'},{approval:true},{parameters:{start:110,bRoot:7,index:0}}]){assert.equal(load('examStudy.contract.ts').examStudyGenerateRequestSchema.safeParse({...base,...extra}).success,false);injections++;}
 routeOptions={families:[{...f,generate:()=>{runtimeFactoryCalls++;throw Error('route factory')}}],profiles:[]};
 const generated=await load('generate.ts').generateExamStudy(base,routeOptions);
 const routes=load('examStudyRoutes.ts');const statuses=[];for(const expectedDigest of [generated.digest,'0'.repeat(64)]){const response=await routes.resolveExamStudy(new Request('https://audit.invalid/api/exam-study/resolve',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({recipe:base,expectedDigest})}));assert.equal(response.status,409);statuses.push(response.status);}
 assert.equal(runtimeFactoryCalls,0);assert.equal(renderCalls,0);assert.equal(meta.liveFamilyKey,null);assert.equal(meta.rightsApproved,false);assert.equal(meta.nativeProvenanceApproved,false);assert.equal(meta.loadable,false);
 const after={};for(const f of scope.files){after[f.path]=sha(fs.readFileSync(f.path));assert.equal(after[f.path],before[f.path]);}
 const result={revision:{originalScopeSha256:sha(fs.readFileSync(path.join(folder,'scope-input.json'))),currentScopeSha256:sha(fs.readFileSync(path.join(folder,'scope-input-r2.json'))),reversedReturnAnnotationMatchesOriginalHash:true,originalReleaseHash:oldReleaseHash,currentReleaseHash:sha(Buffer.from(currentRelease)),firstParentTypeFailureRetained:true,independentTypeOrLintRun:false},mathComparison:{drafts:good,oracleRootCells:225,oracleColumnOutputs:225,allAnswersParametersMatched:true},mutations:{rejected:mutations,byCategory:mutationCounts},finiteDomain:{size:45,copyIsolation:true,reproducibilityCases:reproducibility.length,invalidSeedVariantRejected:invalidRejected},release:{testedVariants:variants.length,formats:4,cases:releaseResults,factoryCalls:runtimeFactoryCalls,coverageUnavailable:true,requirementLevelHold:true},M1Precedence:{status:m1result.status,releaseCallsBeforeM1Exclusion:m1ReleaseCalls,assertedNoReleaseCallAtM1Filter:true},catalog:{visibleFamilies:catalog.families.length,heldRequirementListed:true,onlyCustomBoundedFamilyRegistry:true},outputResolver:{actualResolver:true,pureMocks:true,statuses,factoryCalls:runtimeFactoryCalls,renderCalls},strictRequestInjectionRejected:injections,manifestPolicyCounterfactual:{current:manifest,counterfactualPrevious:oldManifest,different:true,limitation:'counterfactual policy label test, not an archived output replay'},mockBoundaries:['No default complete registry loaded; custom single-family only.','Planner empty-pool allocation/selection mocked; unrelated adapters/profiles/MC parser mocked.','Actual registry/evidence/generate/release/curriculum/contracts/identity/resolver source executed in memory.','Zod runtime resolved via parent module resolution; no explicit outside-file source reads.','Auth/access/strict body reader/renderer are in-memory mocks, no real DB/HTTP/AI/renderer.'],metadata:meta,sourceHashesBefore:before,sourceHashesAfter:after};
 fs.writeFileSync(path.join(folder,'own-runtime-controls.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});process.stdout.write(JSON.stringify({drafts:good,mutations,releaseCases:releaseResults.length,factoryCalls:runtimeFactoryCalls,resolverStatuses:statuses}));
})().catch(e=>{process.stderr.write(e.stack);process.exitCode=1});
