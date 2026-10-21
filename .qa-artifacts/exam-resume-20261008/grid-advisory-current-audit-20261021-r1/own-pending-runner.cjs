// PREPARED ONLY. Parent GO + fresh >=1.5GiB memory receipt required before execution.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const P=__dirname,R='C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
if(!process.argv.includes('--go'))throw Error('No GO; do not execute during parent Node/browser');
const mem=JSON.parse(fs.readFileSync(path.join(P,'own-go-memory.json'),'utf8'));
assert.equal(mem.parentGO,true);assert(mem.availableBytes>=1.5*1024**3);assert(Date.now()-mem.measuredAtMs>=0&&Date.now()-mem.measuredAtMs<60000);
const before=JSON.parse(fs.readFileSync(path.join(P,'own-preparation-before.json'),'utf8'));
for(const [f,h]of Object.entries(before))assert.equal(hash(fs.readFileSync(f)),h,'source changed, new freeze needed');
const {createRequire}=require('node:module'),rootRequire=createRequire(path.join(R,'package.json'));
rootRequire('tsx/cjs');
const modulePath=path.join(R,'src/lib/figure/gridMeasure.ts');
const {measureGridFromGray:measure,gridIndexOverlay:overlay}=rootRequire(modulePath);
const inputs=JSON.parse(fs.readFileSync(path.join(P,'own-fixtures.json'),'utf8'));
const results=[];
function test(id,fn){try{results.push({id,status:'pass',value:fn()});}catch(e){results.push({id,status:'fail',error:String(e.stack||e)});}}
for(const f of inputs.gray)test('gray:'+f.id,()=>{const bytes=new Uint8Array(Buffer.from(f.grayBase64,'base64'));assert.equal(hash(bytes),f.graySHA256);const saved=hash(bytes),a=measure(bytes,f.width,f.height),b=measure(bytes,f.width,f.height);assert.deepEqual(a,b);assert.equal(hash(bytes),saved);if(f.expected==='null')assert.equal(a,null);else{assert(a);assert.equal(a.kind,'heuristic-only');assert.equal(a.requiresReview,true);assert(!('passed'in a));assert(!('approved'in a));}return a;});
for(const [id,w,h,data]of [['zero',0,1,[]],['negative',-1,1,[]],['fraction',1.5,1,[]],['NaN',NaN,1,[]],['Infinity',Infinity,1,[]],['overside',1401,1,[]],['wrong-length',2,2,[255]],['bad-gray',1,1,[-1]],['fraction-gray',1,1,[2.5]],['nan-gray',1,1,[NaN]],['huge-gray',1,1,[256]],['forged-length',2,2,{length:4,0:255}],['null',1,1,null],['sparse',2,2,Array(4)],['string-dimension','1',1,[255]]])test('invalid:'+id,()=>assert.equal(measure(data,w,h),null));
const base={kind:'heuristic-only',requiresReview:true,coordinateSpace:'analysis-pixels-x-right-y-down',width:100,height:100,x:{first:10,last:90,cell:10,count:8,found:9},y:{first:10,last:90,cell:10,count:8,found:9}};
for(const c of inputs.containCoordinates.filter(c=>c.analysis[0]>30&&c.analysis[1]>30))test('contain:'+c.natural.join('x'),()=>{
 const g=structuredClone(base);[g.width,g.height]=c.analysis;
 for(const [a,size]of [[g.x,g.width],[g.y,g.height]])Object.assign(a,{first:size/10,last:size*.9,cell:size*.1,count:8,found:9});
 const result=overlay(g,...c.natural);assert(result);const rational=s=>{const[n,d='1']=s.split('/');return Number(n)/Number(d)};
 const first=result.ticks[0];assert(Math.abs(first.x-(rational(c.left)+g.x.first*rational(c.sx)))<1e-9);assert(Math.abs(first.y-(rational(c.top)-14))<1e-9);
 assert.deepEqual(result,overlay(g,...c.natural));return result;
});
for(const [id,mutate]of [['count61',g=>g.x.count=61],['found-forgery',g=>g.x.found=99],['inconsistent-last',g=>g.x.last=89],['NaN-cell',g=>g.x.cell=NaN],['reviewfalse',g=>g.requiresReview=false],['kind-pass',g=>g.kind='passed']])test('overlay-reject:'+id,()=>{const g=structuredClone(base);mutate(g);assert.equal(overlay(g,200,100),null);});
// OBSERVATIONS, not a semantic security claim: overlay consumes trusted internal measured objects.
for(const [id,mutate]of [['coordinateSpace-forged',g=>g.coordinateSpace='source-math'],['synthetic-one-cell',g=>{for(const a of [g.x,g.y])Object.assign(a,{first:10,last:90,cell:80,count:1,found:2});}]])test('overlay-observation:'+id,()=>{const g=structuredClone(base);mutate(g);return {observed:overlay(g,200,100),untrustedPublicRoute:false};});
for(const [f,h]of Object.entries(before))assert.equal(hash(fs.readFileSync(f)),h);
const out={modulePath,actualRootImport:true,unique:results.length,passed:results.filter(r=>r.status==='pass').length,failed:results.filter(r=>r.status==='fail'),results,limits:'Pure helper only; no browser canvas, image decoder, page cancellation/timeout/model/final-review execution. CoordinateSpace/count observations do not certify graph semantics.'};
fs.writeFileSync(path.join(P,'own-runtime-results.json'),JSON.stringify(out,null,2));console.log(JSON.stringify({unique:out.unique,passed:out.passed,failed:out.failed.length}));if(out.failed.length)process.exitCode=1;
