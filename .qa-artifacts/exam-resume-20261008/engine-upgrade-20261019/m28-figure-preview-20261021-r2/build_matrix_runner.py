from pathlib import Path

OUT = Path(__file__).resolve().parent
header = (OUT / 'native-once.cjs').read_text(encoding='utf-8').split('(async()=>{')[0]
body = r'''
const originalEntry=require(path.join(root,'src/lib/middle/m2Quad.ts')).M2_QUAD.find(e=>e.key==='2-2|평행사변형|15A');
const old08=require(path.join(root,'src/lib/middle/m2Quad.ts')).M2_QUAD.find(e=>e.key==='2-2|평행사변형|08');
const new08=mod.exports.M2_QUAD.find(e=>e.key==='2-2|평행사변형|08');
const pointAngle=(v,a,b)=>{
 const u=[a[0]-v[0],a[1]-v[1]],w=[b[0]-v[0],b[1]-v[1]];
 return Math.atan2(Math.abs(u[0]*w[1]-u[1]*w[0]),u[0]*w[0]+u[1]*w[1])*180/Math.PI;
};
const distanceToLine=(v,a,b)=>Math.abs((b[0]-a[0])*(a[1]-v[1])-(a[0]-v[0])*(b[1]-a[1]))/Math.hypot(b[0]-a[0],b[1]-a[1]);
const run=(e,x,p,q)=>{const numbers=[(x-4+.5)/12,(p-2+.5)/3,(q-1+.5)/12];let used=0;
 const task=e.handler(()=>{assert(used<3);return numbers[used++];});assert.equal(used,3);return task;};
(async()=>{
 const checks=[], unique=new Map();
 for(let x=4;x<=15;x++)for(let p=2;p<=4;p++)for(let q=1;q<=12;q++){
  const task=run(entry,x,p,q), previous=run(originalEntry,x,p,q);
  assert.deepEqual({...task,figureSpec:null},{...previous,figureSpec:null});
  const b=task.content.match(/\\angle B=\((\d+)x\+(\d+)\)/);
  const d=task.content.match(/\\angle D=\(x\+(\d+)\)/);
  assert(b&&d);const pp=Number(b[1]),qq=Number(b[2]),ss=Number(d[1]);
  const solved=(ss-qq)/(pp-1),beta=pp*solved+qq;
  assert.equal(task.answer,`$${solved}$`);assert(Number.isInteger(solved)&&solved>0&&beta>0&&beta<180);
  const f=task.figureSpec,{A,B,C,D}=f.points;
  assert(Math.abs(pointAngle(B,A,C)-beta)<.01&&Math.abs(pointAngle(D,A,C)-beta)<.01);
  assert(Math.abs(pointAngle(A,B,D)-(180-beta))<.01&&Math.abs(pointAngle(C,B,D)-(180-beta))<.01);
  assert.deepEqual(f.segments,previous.figureSpec.segments);assert.deepEqual(f.labels,previous.figureSpec.labels);
  assert.deepEqual(Object.keys(f.angles).sort(),['angA','angC']);
  const clearA=Math.min(distanceToLine(A,B,C),distanceToLine(A,C,D));
  const clearC=Math.min(distanceToLine(C,A,B),distanceToLine(C,D,A));
  for(const name of ['angA','angC']){
   const {radius,...mark}=f.angles[name];assert.deepEqual(mark,previous.figureSpec.angles[name]);
   assert(Number.isFinite(radius)&&radius>0&&radius<=18&&radius+1<Math.min(clearA,clearC));
  }
  checks.push({x:solved,p:pp,q:qq,s:ss,beta,actualB:pointAngle(B,A,C),actualD:pointAngle(D,A,C),radius:f.angles.angA.radius,
   clearanceA:clearA,clearanceC:clearC,contentSha256:sha(task.content),answerSha256:sha(task.answer)});
  if(!unique.has(beta))unique.set(beta,task);
 }
 assert.equal(checks.length,432);assert.equal(unique.size,64);
 for(let i=0;i<32;i++){
  const values=[((i*17)%97+.5)/97,((i*31+7)%97+.5)/97,((i*43+11)%97+.5)/97];
  let a=0,b=0;assert.deepEqual(old08.handler(()=>values[a++]),new08.handler(()=>values[b++]));assert.equal(a,b);
 }
 const destination=path.join(out,'matrix-native');fs.mkdirSync(destination,{recursive:true});const native=[];
 for(const [beta,task] of [...unique].sort((a,b)=>a[0]-b[0])){
  const result=await renderFigureSpec(task.figureSpec,{strict:true,typeset:true});
  const row={beta,ok:result.ok,error:result.ok?null:result.error,task};
  if(result.ok){row.labels=svgLabels(result.svg);assert.deepEqual(row.labels.map(l=>l.text).sort(),['A','B','C','D']);
   row.svgSha256=sha(result.svg);fs.writeFileSync(path.join(destination,`beta-${beta}.svg`),result.svg);}
  fs.writeFileSync(path.join(destination,`beta-${beta}.json`),JSON.stringify(row,null,2)+'\n');native.push(row);
 }
 const report={utc:new Date().toISOString(),candidateSha256:sha(bytes),originalRootSha256:sha(fs.readFileSync(path.join(root,'src/lib/middle/m2Quad.ts'))),
  productionModuleReplaced:false,heapLimitBytes:v8.getHeapStatistics().heap_size_limit,blockedNetworkCalls,dbWrites:0,
  fullParameterCases:432,unchanged08Cases:32,distinctBetaValues:64,mathChecks:checks,native};
 fs.writeFileSync(path.join(out,'matrix-native-results.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({mathCases:432,unchanged08:32,nativeCases:64,passed:native.filter(r=>r.ok).length,
  failed:native.filter(r=>!r.ok).length,heapLimitBytes:report.heapLimitBytes}));
 process.exitCode=native.every(r=>r.ok)?0:1;
})().catch(e=>{fs.writeFileSync(path.join(out,'matrix-failure.txt'),String(e.stack||e));process.exitCode=1;})
 .finally(()=>esbuild.stop());
'''
(OUT / 'matrix-native.cjs').write_bytes((header + body).encode('utf-8'))
launcher = (OUT / 'run_native_once.py').read_text(encoding='utf-8')
launcher = launcher.replace("OUT/'native-once.cjs'", "OUT/'matrix-native.cjs'")
launcher = launcher.replace('timeout=100', 'timeout=180').replace('bounded-native.log', 'matrix-native.log')
(OUT / 'run_matrix_once.py').write_bytes(launcher.encode('utf-8'))
