import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';import {stripTypeScriptTypes,createRequire} from 'node:module';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
const base='.qa-artifacts/exam-resume-20261008/inverse-minimum-engine-audit-20261020-r2/';
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

export {family,identity,registry,evidence,release,curriculum,contracts,requirements,generator,evaluate};
export function setRouteFamilies(value){routeFamilies=value;}

export const tableKernel=await evaluate('inverseRootTable.ts');
export {sources,exact,stripTypeScriptTypes,vm,linker,middle};
