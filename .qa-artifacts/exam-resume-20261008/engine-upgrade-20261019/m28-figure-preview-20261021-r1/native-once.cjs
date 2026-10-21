/* One bounded native API process; production module remains unchanged. */
const fs=require('node:fs'), path=require('node:path'), Module=require('node:module');
const crypto=require('node:crypto'), assert=require('node:assert/strict'), v8=require('node:v8');
const root=process.cwd(), out=__dirname;
process.env.STUDIO_ENGINE_URL='';process.env.VERCEL='';
process.env.FIGURE_ENGINE_PATH=path.join(root,'vendor/figure-engine');
let blockedNetworkCalls=0;
global.fetch=async()=>{blockedNetworkCalls++;throw Error('Network disabled in native QA');};
require('tsx/cjs');
const esbuild=Module.createRequire(require.resolve('tsx/package.json'))('esbuild');
const candidate=path.join(root,'.qa-artifacts/exam-resume-20261008/m28-parameter-figure-candidate-20261021-r1/own-m2Quad.ts');
const bytes=fs.readFileSync(candidate),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
assert.equal(sha(bytes),'3ed5332cf5ff2e535c3aa3f641a3965b2db704d981a917fabd6dc26f0579b6b6');
const virtual=path.join(root,'src/lib/middle/__m28_candidate_evaluation__.cjs');
const mod=new Module(virtual);mod.filename=virtual;mod.paths=Module._nodeModulePaths(path.dirname(virtual));
mod._compile(esbuild.transformSync(bytes.toString('utf8'),{loader:'ts',format:'cjs',target:'es2020'}).code,virtual);
const entry=mod.exports.M2_QUAD.find(e=>e.key==='2-2|평행사변형|15A');
const {renderFigureSpec}=require(path.join(root,'src/lib/figure/renderFigureSpec.ts'));
const {svgLabels}=require(path.join(root,'src/lib/figure/svgLabels.ts'));
const destination=path.join(out,'native-once');fs.mkdirSync(destination,{recursive:true});
(async()=>{
 const results=[];
 for(const [x,p,q] of [[4,2,1],[7,2,2],[15,4,12]]){
  const rng=[(x-4+.5)/12,(p-2+.5)/3,(q-1+.5)/12];let used=0;
  const task=entry.handler(()=>{assert(used<3);return rng[used++];});
  const beta=p*x+q,result=await renderFigureSpec(task.figureSpec,{strict:true,typeset:true});
  const row={x,p,q,beta,task,ok:result.ok,error:result.ok?null:result.error,
   labels:result.ok?svgLabels(result.svg):null};
  if(result.ok){
   row.svgSha256=sha(result.svg);row.allPointLabelsPreserved=JSON.stringify(row.labels.map(l=>l.text).sort())===JSON.stringify(['A','B','C','D']);
   fs.writeFileSync(path.join(destination,`beta-${beta}.svg`),result.svg);
  }
  fs.writeFileSync(path.join(destination,`beta-${beta}.json`),JSON.stringify(row,null,2)+'\n');results.push(row);
 }
 const report={utc:new Date().toISOString(),candidate,candidateSha256:sha(bytes),
  productionModuleReplaced:false,heapLimitBytes:v8.getHeapStatistics().heap_size_limit,
  localPythonForced:true,blockedNetworkCalls,dbWrites:0,results};
 fs.writeFileSync(path.join(out,'native-once-results.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({cases:results.length,passed:results.filter(r=>r.ok&&r.allPointLabelsPreserved).length,
  failed:results.filter(r=>!r.ok||!r.allPointLabelsPreserved).length,heapLimitBytes:report.heapLimitBytes}));
 process.exitCode=results.every(r=>r.ok&&r.allPointLabelsPreserved)?0:1;
})().catch(e=>{fs.writeFileSync(path.join(out,'native-once-failure.txt'),String(e.stack||e));process.exitCode=1;})
 .finally(()=>esbuild.stop());
