const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {stripTypeScriptTypes}=require('node:module');
const out=__dirname;
const root='C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008/src/lib';
const files=['middle/m3Root.ts','middle/m3Poly.ts','elementary/rng.ts'];
const bytes=Object.fromEntries(files.map(f=>[f,fs.readFileSync(path.join(root,f))]));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const before=Object.fromEntries(files.map(f=>[f,sha(bytes[f])]));
if(before['middle/m3Root.ts']!=='047c2d34ac6347fcf99dc91ea76957f6ec0245ead0e8d1ad4c9fa2f2d8df76fc'||before['middle/m3Poly.ts']!=='fe177c3296c22d0ff550588c901ebe8c283fe1e20237a7777ee3391c39362c5c')throw Error('audited source changed');
function load(file,names,env={}){
 let js=stripTypeScriptTypes(bytes[file].toString('utf8'),{mode:'strip'});
 js=js.replace(/^import[^\n]*;\r?\n/gm,'').replace(/\bexport\s+/g,'');
 return new Function(...Object.keys(env),js+'\nreturn {'+names.join(',')+'};')(...Object.values(env));
}
const rng=load('elementary/rng.ts',['createRng','intBetween','pick']);
// Korean particles are grammar-only stubs, never used in mathematical checking.
const grammar={eulReul:()=> '을',waGwa:()=> '와',euroRo:()=> '으로'};
const rt=load('middle/m3Root.ts',['M3_ROOT'],{...rng,...grammar}).M3_ROOT;
const po=load('middle/m3Poly.ts',['M3_POLY'],{...rng,...grammar}).M3_POLY;
const selected=[...po.filter(t=>(t.rpmMinor==='다항식의 곱셈'&&['02','03','07','11','12','13','14'].includes(t.rpmType))||(t.rpmMinor==='다항식의 인수분해'&&['04','05','06','13','14','20'].includes(t.rpmType))),...rt.filter(t=>(t.rpmMinor==='제곱근의 뜻과 성질'&&['06','07'].includes(t.rpmType))||(t.rpmMinor==='근호를 포함한 식의 계산'&&['13','16'].includes(t.rpmType)))];
const samples=[];
for(const entry of selected)for(const seed of [1103,1907]){
 const r=entry.handler(rng.createRng(seed));
 samples.push({module:po.includes(entry)?'m3Poly.ts':'m3Root.ts',key:entry.key,rpmMinor:entry.rpmMinor,rpmType:entry.rpmType,unitSection:entry.unitSection,seed,difficulty:r.difficulty,content:r.content,answer:r.answer,solution:r.solution,figureSpec:r.figureSpec??null});
}
const inventory=[...po,...rt].map(t=>({module:po.includes(t)?'m3Poly.ts':'m3Root.ts',key:t.key,unitSection:t.unitSection,rpmMinor:t.rpmMinor,rpmType:t.rpmType,title:t.rpmTitle}));
const after=Object.fromEntries(files.map(f=>[f,sha(fs.readFileSync(path.join(root,f)))]));
if(JSON.stringify(before)!==JSON.stringify(after))throw Error('before/after module hashes differ');
fs.writeFileSync(path.join(out,'own-engine-samples.json'),JSON.stringify({scope:'bounded mathematical generation only; not registry/DB/grade approval',before,after,unchanged:true,grammarBoundary:'Only import-level Korean particle functions stubbed; actual RNG/module arithmetic unmodified and executed in memory. No original facts/parameters used for independent solution.',sampleDefinitions:selected.length,sampleCount:samples.length,inventory,samples},null,2)+'\n',{flag:'wx'});
process.stdout.write(JSON.stringify({selected:selected.length,samples:samples.length,before}));
