const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto'),assert=require('assert/strict');
const root='C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008';
const out=__dirname;
const req=require('module').createRequire(path.join(root,'package.json'));
const ts=req('typescript');
const hashes={};
function read(rel){const bytes=fs.readFileSync(path.join(root,rel));hashes[rel]=crypto.createHash('sha256').update(bytes).digest('hex');return bytes.toString('utf8');}
function stable(o){if(o===null||typeof o!=='object')return JSON.stringify(o);if(Array.isArray(o))return '['+o.map(stable).join(',')+']';return '{'+Object.keys(o).sort().map(k=>JSON.stringify(k)+':'+stable(o[k])).join(',')+'}';}
const hash=o=>crypto.createHash('sha256').update(stable(o)).digest('hex');
const identity={sha256:hash,stableStringify:stable,seedFrom:o=>parseInt(hash(o).slice(0,8),16)%2147483647,normalizeTaskText:s=>s.trim(),mathematicalFigure:x=>x,logicalKey:(f,p)=>hash({id:f.id,version:f.version,p}),contentDigest:d=>hash({content:d.content,answer:d.answer,solution:d.solution,figure:d.figureSpec})};
const ids=['coord.inverse-equal-legs','coord.inverse-area-ratio','number.coprime-symbolic-sum'];
const requirements=ids.map(id=>({id,title:id,representation:id==='coord.inverse-area-ratio'?'figure-required':'text',response:['단답형']}));
const reqs={STUDY_REQUIREMENTS:requirements,REQUIREMENT_BY_ID:new Map(requirements.map(r=>[r.id,r]))};
function evaluate(src,rel,imports){const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const module={exports:{}};const local=s=>{if(Object.hasOwn(imports,s))return imports[s];if(s==='zod')return req(s);throw Error('Unapproved import '+s+' from '+rel);};vm.runInThisContext('(function(require,module,exports){'+js+'\n})',{filename:rel})(local,module,module.exports);return module.exports;}
const difficulty=evaluate(read('src/contracts/difficulty.ts'),'difficulty',{});
const contract=evaluate(read('src/contracts/examStudy.contract.ts'),'contract',{'./difficulty':difficulty});
const support=evaluate(read('src/lib/examStudy/families/middle/support.ts'),'support',{});
// AST selection executes only the two requested definitions and their domain declarations.
function selected(rel,names,imports){const src=read(rel),ast=ts.createSourceFile(rel,src,ts.ScriptTarget.Latest,true);const chunks=[];for(const st of ast.statements){const txt=st.getText(ast);if(ts.isVariableStatement(st)&&st.declarationList.declarations.some(d=>names.includes(d.name.getText(ast))))chunks.push(txt);else if((ts.isForStatement(st)||ts.isForOfStatement(st))&&names.some(n=>txt.includes(n+'.push(')))chunks.push(txt);}return evaluate(chunks.join('\n'),rel,imports);}
// Imports disappear from selected source: supply helper names through a synthetic import.
function template(rel,names){const src=read(rel),ast=ts.createSourceFile(rel,src,ts.ScriptTarget.Latest,true);const selected=[];for(const st of ast.statements){const txt=st.getText(ast);if(ts.isImportDeclaration(st)&&st.moduleSpecifier.text==='./support')selected.push(txt);else if(ts.isVariableStatement(st)&&st.declarationList.declarations.some(d=>names.includes(d.name.getText(ast))))selected.push(txt);else if((ts.isForStatement(st)||ts.isForOfStatement(st))&&names.some(n=>txt.includes(n+'.push(')))selected.push(txt);}return evaluate(selected.join('\n'),rel,{'./support':support});}
const equal=template('src/lib/examStudy/families/middle/algebra.ts',['equalDomain','equalLegs']).equalLegs;
const area=template('src/lib/examStudy/families/middle/graphs.ts',['inverseAreaDomain','inverseArea','graphBasis']).inverseArea;
const policySource=read('src/lib/examStudy/curriculumEligibility.ts');
const policy=evaluate(policySource,'policy',{});
const evidence=evaluate(read('src/lib/examStudy/evidence.ts'),'evidence',{'@/contracts/difficulty':difficulty,'@/lib/math/circledNumber':{circledValueRaw:s=>'①②③④⑤'.indexOf(s)+1},'@/lib/problem/parseProblemContent':{parseProblemContent:()=>({choices:[]})},'./requirements':reqs,'./curriculumEligibility':policy});
const registrySource=read('src/lib/examStudy/registry.ts');
function registry(p){return evaluate(registrySource,'registry',{'@/contracts/examStudy.contract':contract,'./adapters':{legacyStudyFamilies:()=>[]},'./evidence':evidence,'./families/advanced':{ADVANCED_STUDY_FAMILIES:[]},'./families/middle':{MIDDLE_STUDY_FAMILIES:[equal,area]},'./identity':identity,'./profiles':{EXAM_STUDY_PROFILES:[]},'./requirements':reqs,'./curriculumEligibility':p});}
const reg=registry(policy);
const genSource=read('src/lib/examStudy/generate.ts');
// Small deterministic planner mock: this audit targets eligibility, not quota optimization.
const planner={allocateStudyQuotas:(rs,count)=>rs.map(r=>({...r,requested:count})),planFullCandidates:(pool,quotas,count)=>pool.filter(c=>quotas.some(q=>c.full.includes(q.id))).slice(0,count)};
function generator(r,p=policy){return evaluate(genSource,'generate',{'@/contracts/examStudy.contract':contract,'@/lib/math/circledNumber':{circledValueRaw:s=>'①②③④⑤'.indexOf(s)+1},'@/lib/problem/parseProblemContent':{parseProblemContent:()=>({choices:[]})},'./adapters':{deriveStudyMultipleChoice:()=>{throw Error('MC adapter must not be used for these native formats');}},'./evidence':evidence,'./identity':identity,'./planner':planner,'./profiles':{EXAM_STUDY_PROFILES:[],findStudyProfile:()=>undefined,profileMatchesSchool:()=>false},'./registry':r,'./requirements':reqs,'./curriculumEligibility':p});}
const gen=generator(reg);
const rows=[],calculations=[],formats=['혼합','단답형','객관식','서술형'];
const prepare=async()=>({ok:true,figureSvg:'<svg xmlns="http://www.w3.org/2000/svg"></svg>'});
function request(f,format){return {course:'중1',familyIds:[f.id],requirementIds:[f.fulfills[0].requirement],count:1,maxPerFamily:1,seed:19,format};}
async function exercise(f,format,expectHeld,label){let calls=0;const tracked={...f,generate(...args){calls++;return f.generate(...args);}};const result=await gen.generateExamStudy(request(f,format),{families:[tracked],profiles:[],prepare});const coverage=evidence.familyCoverage(f,f.fulfills[0].requirement);if(expectHeld){assert.equal(calls,0);assert.equal(result.status,'unavailable');assert.equal(result.questions.length,0);assert.equal(result.requirements[0].status,'unavailable');assert.equal(coverage,'unavailable');}else if(format==='混合')throw Error('bad format');else if(format==='혼합'||format==='단답형'){assert.ok(calls>0);assert.equal(result.deliveredCount,1);assert.equal(result.status,'complete');assert.equal(result.questions[0].questionType,'단답형');const q=result.questions[0];if(f.id===equal.id){const m=/A=\((\d+),u\).*B=\((\d+),v\)/u.exec(q.content);const p=+m[1],s=+m[2],d=s-p,t=p*d/(s-p);assert.equal(q.answer,`k=${p*(t+d)}, u=${t+d}, v=${t}`);calculations.push({label,p,s,d,t,positive:t>0,answer:q.answer});}else{const l=q.figureSpec.labels.map(x=>/^A\((\d+),(\d+)\)$/u.exec(x.text)).find(Boolean),a=+l[1],h=+l[2],ratio=/넓이비가 (\d+):(\d+)/u.exec(q.content),b=a+a*(+ratio[1])/(+ratio[2]),z=a*h/b,value=a*h/2+(b-a)*h/2-a*z/2;assert.equal(q.answer,`B=(${b},${z}), 넓이=${value}`);calculations.push({label,a,h,b,z,value,positive:b>a&&z>0});}}else{assert.equal(calls,0);assert.equal(result.status,'unavailable');}rows.push({label,format,calls,status:result.status,coverage,delivered:result.deliveredCount,manifest:result.manifestVersion,digest:result.digest});return result;}
(async()=>{
 const currentOutputs=[];
 for(const f of [equal,area]){
  assert.equal(policy.studyCurriculumHold(f),null);
  for(const format of formats){const result=await exercise(f,format,false,'current:'+f.id);if(format==='단답형')currentOutputs.push({f,result});}
  for(const [label,change] of [['old',{version:'1'}],['future',{version:'999'}],['renamed',{id:'audit-renamed-'+f.id}],['claimed-confidence',{version:'999',confidence:1,gradeApproved:true}],['renamed-reviewed-version',{id:'audit-renamed-'+f.id,confidence:1,gradeApproved:true}]]){
   const stale={...f,...change};assert.equal(policy.studyCurriculumHold(stale).status,'pending-reviewed-student-method-version');
   for(const format of formats)await exercise(stale,format,true,label+':'+f.id);
  }
  const component={...f,id:'audit-component-'+f.id,version:'999',fulfills:f.fulfills.map(i=>({...i,level:'component'}))};assert.equal(policy.studyCurriculumHold(component),null);assert.equal(evidence.familyCoverage(component,component.fulfills[0].requirement),'component');
 }
 const symbolic={...equal,id:'audit-symbolic-renamed',version:'999',gradeApproved:true,confidence:1,fulfills:[{requirement:'number.coprime-symbolic-sum',level:'full'}]};
 assert.equal(policy.studyCurriculumHold(symbolic).status,'excluded-required-out-of-grade-method');for(const format of formats)await exercise(symbolic,format,true,'symbolic-hard-exclusion');
 const injections=[];
 const base=request(equal,'단답형');
 for(const [key,value] of [['families',[equal]],['family',{id:equal.id}],['gradeApproved',true],['confidence',1],['curriculumPolicyVersion','allow-all']]){const payload={...base,[key]:value};assert.equal(contract.examStudyGenerateRequestSchema.safeParse(payload).success,false);assert.throws(()=>gen.parseExamStudyRequest(payload),e=>e.code==='invalid-request');assert.equal(contract.examStudyResolveRequestSchema.safeParse({recipe:payload,expectedDigest:'a'.repeat(64)}).success,false);injections.push({key,rejected:true});}
 assert.equal(contract.examStudyResolveRequestSchema.safeParse({recipe:base,expectedDigest:'a'.repeat(64),gradeApproved:true}).success,false);
 const changedPolicy={...policy,STUDY_CURRICULUM_POLICY_VERSION:'audit-old-policy'};
 const oldReg=registry(changedPolicy),oldGen=generator(oldReg,changedPolicy),invalidations=[];
 for(const {f,result} of currentOutputs){
  const policyManifest=oldReg.studyManifestVersion([f]);assert.notEqual(policyManifest,reg.studyManifestVersion([f]));
  const simulatedOld=await oldGen.generateExamStudy(request(f,'단답형'),{families:[f],profiles:[],prepare});assert.notEqual(simulatedOld.digest,result.digest);assert.notEqual(simulatedOld.questions[0].id,result.questions[0].id);
  const staleVersion={...f,version:'1'};assert.notEqual(reg.studyManifestVersion([staleVersion]),reg.studyManifestVersion([f]));
  const replay=await gen.generateExamStudy(result.recipe,{families:[staleVersion],profiles:[],prepare});assert.equal(replay.status,'unavailable');assert.notEqual(replay.digest,result.digest);
  invalidations.push({family:f.id,policyManifestChanged:true,policyOutputDigestChanged:true,itemIdChanged:true,versionManifestChanged:true,oldVersionReplayUnavailable:true,oldExpectedDigestMismatch:true});
 }
 assert.equal(reg.getExamStudyCatalog('중1').families.length,2);
 fs.writeFileSync(path.join(out,'calculations.json'),JSON.stringify({rows,calculations,injections,invalidations},null,2)+'\n');
 const report={status:'passed-bounded-policy-and-contract; output-implementation-unavailable',rootCommit:'defb4d9ae65e5115f7d546daac99d77623703e9d',policy:policy.STUDY_CURRICULUM_POLICY_VERSION,execution:{actual:['curriculumEligibility','generate','registry','evidence','examStudy.contract','two selected M1 definitions','middle/support'],mocks:['identity deterministic hashing boundary','small planner','3-demand requirement map','empty profiles','empty legacy/advanced registries','unreachable MC parser/adapter','SVG preparation stub'],cases:rows.length,heldCases:rows.filter(r=>!r.label.startsWith('current:')).length,heldFactoryCalls:rows.filter(r=>!r.label.startsWith('current:')).reduce((n,r)=>n+r.calls,0),dbCalls:0,rendering:'mocked only; no geometry/rendering certification'},findings:{exactReviewedPairsOnly:true,allFourFormatsHeldBeforeFactory:true,symbolicHardExclusionUnchanged:true,heldCoverageUnavailable:true,currentNativeFormatsOnly:true,strictClientInjectionRejected:true,policyAndVersionInvalidateManifestAndOutputDigest:true,componentNullNotGradeCertification:true},limitations:['src/lib/examStudy/output.ts is absent at audited root commit. No actual HTTP/output handler executed; strict generate/resolve schemas and parseExamStudyRequest were exercised. Digest mismatch was checked, not HTTP409 behavior.','identity/planner and transport boundaries mocked; no full-registry rendering or whole-engine certification.','Current native formats are mixed/short-answer only; MC/written unsupported and never fabricated.','Method/primary curriculum audit was not repeated. Exact policy r3 reference used only as recorded pointer.','Read of algebra.ts range incidentally displayed beginning of following shiftedSystem definition; it was neither evaluated nor used. AST execution selects only equalLegs/equalDomain and inverseArea/inverseAreaDomain/graphBasis.'],methodReference:{path:'.qa-artifacts/exam-resume-20261008/m1-inverse-geometry-curriculum-audit-20261019-r3/report.json',sha256:'626cce750576be3869d66bf150f2f241ad464b270b48d2de150ce37fe6af7db0',notOpened:true},parent330Passes:'reported evidence only; not claimed as independent run',gradeCertification:false,unreviewedComponentApproval:false,fullEngineApproval:false,loadable:false};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(out,'source-hashes.json'),JSON.stringify(hashes,null,2)+'\n');
 console.log(JSON.stringify({cases:rows.length,heldCases:report.execution.heldCases,heldFactoryCalls:report.execution.heldFactoryCalls,injections:injections.length,invalidations:invalidations.length,status:report.status}));
})().catch(e=>{console.error(e);process.exitCode=1;});
