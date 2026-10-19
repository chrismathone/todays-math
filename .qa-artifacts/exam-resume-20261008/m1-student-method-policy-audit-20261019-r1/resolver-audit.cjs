const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto'),assert=require('assert/strict');
const root='C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008',out=__dirname;
const requireRoot=require('module').createRequire(path.join(root,'package.json')),ts=requireRoot('typescript');
const sourceHashes=JSON.parse(fs.readFileSync(path.join(out,'source-hashes.json'),'utf8'));
for(const [file,sha] of Object.entries(sourceHashes.files))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),sha,'audited file bytes changed: '+file);
const additions={};
function load(rel,imports){const bytes=fs.readFileSync(path.join(root,rel));additions[rel]=crypto.createHash('sha256').update(bytes).digest('hex');const js=ts.transpileModule(bytes.toString('utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const m={exports:{}};const imp=s=>{if(Object.hasOwn(imports,s))return imports[s];throw Error('Unapproved import: '+s);};vm.runInThisContext('(function(require,module,exports){'+js+'\n})',{filename:rel})(imp,m,m.exports);return m.exports;}
const difficulty=load('src/contracts/difficulty.ts',{});
const contract=load('src/contracts/examStudy.contract.ts',{'zod':requireRoot('zod'),'./difficulty':difficulty});
let calls=0,renderCalls=0,mode='ok',received;
const result={digest:'b'.repeat(64),deliveredCount:1,status:'complete'};
const routes=load('src/lib/examStudyRoutes.ts',{
 'server-only':{},'@/contracts/examStudy.contract':contract,
 '@/lib/accountAccess':{authorizeAccount:async()=>({account:{role:'director'}})},
 '@/lib/accountRouteAccess':{accountRouteAllowed:()=>true},'@/lib/routeAccess':{routeAccessFor:()=> 'allow'},
 '@/lib/textbook/strictJson':{readStrictJson:async request=>request.json()},
 '@/lib/figure/renderFigureSpec':{renderFigureSpec:async()=>{renderCalls++;throw Error('No rendering permitted');}},
 '@/lib/examStudy':{getExamStudyCatalog:()=>{throw Error('No catalog run');},generateExamStudy:async recipe=>{calls++;received=recipe;if(mode==='throw')throw Error('mock generation failure');if(mode==='empty')return {...result,deliveredCount:0};if(mode==='unavailable')return {...result,status:'unavailable'};if(mode==='changed')return {...result,digest:'c'.repeat(64)};return {...result};}}
});
const recipe={course:'중1',familyIds:['study-middle-inverse-equal-legs'],requirementIds:['coord.inverse-equal-legs'],count:1,maxPerFamily:1,seed:19,format:'단답형'};
const rows=[];
async function test(label,body,expected,handler=routes.resolveExamStudy){const before=calls;const request=new Request('https://audit.invalid/api/exam/practice/resolve',{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'application/json'}});const response=await handler(request);const data=await response.json();assert.equal(response.status,expected,label);assert.equal(response.headers.get('Cache-Control'),'private, no-store');if(expected===409)assert.equal(data.error.code,'CONFLICT');if(expected===400)assert.equal(calls,before,'strict schema rejection must precede generation');rows.push({label,status:response.status,generationCalls:calls-before,code:data.error?.code??null});return data;}
(async()=>{
 const valid={recipe,expectedDigest:result.digest};
 await test('matching digest and nonempty available generation',valid,200);assert.deepEqual(received,recipe);
 await test('stale client expected digest',{...valid,expectedDigest:'a'.repeat(64)},409);
 for(const m of ['changed','empty','unavailable','throw']){mode=m;await test('generation '+m,valid,409);}mode='ok';
 for(const [key,value] of [['families',[{id:'injected',gradeApproved:true}]],['family',{id:'injected'}],['gradeApproved',true],['confidence',1]]){
  await test('nested recipe rejects '+key,{...valid,recipe:{...recipe,[key]:value}},400);
  await test('create rejects '+key,{...recipe,[key]:value},400,routes.createExamStudy);
 }
 await test('resolve envelope rejects gradeApproved',{...valid,gradeApproved:true},400);
 await test('resolve envelope rejects families',{...valid,families:[]},400);
 assert.equal(renderCalls,0);
 fs.writeFileSync(path.join(out,'resolver-calculations.json'),JSON.stringify({actualHandler:'src/lib/examStudyRoutes.ts::resolveExamStudy',cases:rows.length,rows,generationCalls:calls,renderCalls,dbCalls:0,mocked:['authorization allowed director','readStrictJson transport delegates to Request.json; no size/depth parser certification','generation output/exception','renderer must remain unused'],actual:['createExamStudy/resolveExamStudy code','strict generate/resolve Zod schemas','native Request/Response'],sourceHashes:additions,previousAuditedFileHashesUnchanged:true},null,2)+'\n');
 const reportPath=path.join(out,'report.json');const old=fs.readFileSync(reportPath);const snapshot=path.join(out,'report-before-resolver.json');if(!fs.existsSync(snapshot))fs.writeFileSync(snapshot,old);
 const report=JSON.parse(old.toString('utf8'));report.priorMissingFileRecord={preserved:'report-before-resolver.json',sha256:crypto.createHash('sha256').update(fs.readFileSync(snapshot)).digest('hex'),reason:'User corrected output.ts filename; original failure/limitations retained byte-for-byte.'};
 report.status='passed-bounded-policy-contract-and-mocked-actual-resolver';
 report.resolverAddendum={actualSource:'src/lib/examStudyRoutes.ts',evidence:'resolver-calculations.json',cases:rows.length,matchingDigest200:true,staleDigest409:true,changedRegeneration409:true,zeroDelivered409:true,unavailable409:true,generationException409:true,strictNestedAndEnvelopeInjection400BeforeGeneration:true,renderCalls:0,dbCalls:0,sourceHashes:additions};
 report.limitations=report.limitations.filter(s=>!s.startsWith('src/lib/examStudy/output.ts'));
 report.limitations.push('Corrected actual resolver executed with generation/authorization/JSON transport mocked. No live HTTP server, auth/database integration, strict JSON parser size/depth verification, or figure rendering was run. Earlier policy/version→digest changes and actual resolver digest→409 checks are composed evidence, not an end-to-end real-engine resolver run.');
 report.findings.actualResolverRejectsStaleOrUnavailableOutput=true;
 fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync(path.join(out,'resolver-source-hashes.json'),JSON.stringify({algorithm:'SHA256',files:additions,priorAuditedFileHashesUnchanged:true,comparison:'exact filesystem bytes, independent of advancing root HEAD'},null,2)+'\n');
 console.log(JSON.stringify({cases:rows.length,generationCalls:calls,renderCalls,dbCalls:0,priorAuditedFileHashesUnchanged:true}));
})().catch(e=>{console.error(e);process.exitCode=1;});
