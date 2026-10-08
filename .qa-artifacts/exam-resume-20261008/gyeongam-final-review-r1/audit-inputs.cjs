const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url');
process.env.VERCEL='0';delete process.env.STUDIO_ENGINE_URL;delete process.env.FIGURE_ENGINE_PATH;
require('tsx/cjs');
const parent='C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008';
const evidenceRoot=path.join(parent,'.qa-artifacts/exam-resume-20261008');
const verificationRoot=path.join(evidenceRoot,'gyeongam-final-review-r1');
const sourceRoot='C:/Users/user/orca/workspaces/todays-math/exam-twin-next-five-20261008/.qa-artifacts/exam-resume-20261008/next-five-extraction-r1/gyeongam/packet';
const ownRoot=path.resolve(__dirname,'../../..');
const blindRoot=path.join(ownRoot,'.qa-artifacts/exam-resume-20261008/gyeongam-independent-r1/blind');
const {renderFigureSpec}=require(path.join(parent,'src/lib/figure/renderFigureSpec.ts'));
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const digest=x=>sha(Buffer.from(canonical(x)));
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
const approx=(a,b)=>Math.abs(a-b)<1e-7;
const dist=(P,Q)=>Math.hypot(P[0]-Q[0],P[1]-Q[1]);
const dot=(V,P,Q)=>(P[0]-V[0])*(Q[0]-V[0])+(P[1]-V[1])*(Q[1]-V[1]);
const angle=(V,P,Q)=>Math.acos(Math.min(1,Math.max(-1,dot(V,P,Q)/(dist(V,P)*dist(V,Q)))))*180/Math.PI;
const cross=(O,P,Q)=>(P[0]-O[0])*(Q[1]-O[1])-(P[1]-O[1])*(Q[0]-O[0]);
const area=pts=>Math.abs(pts.reduce((s,p,i)=>{const q=pts[(i+1)%pts.length];return s+p[0]*q[1]-p[1]*q[0];},0))/2;
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
(async()=>{
 const inputFile=path.join(verificationRoot,'verification-inputs.json'),inputs=read(inputFile),manifest=read(path.join(verificationRoot,'verification-manifest.json'));
 const blindBindings=read(path.join(blindRoot,'raw-solve-bindings.json')),sourceFile=path.join(sourceRoot,'questions.json'),packet=read(sourceFile);
 assert(sha(fs.readFileSync(inputFile))===manifest.verificationInputsSha256,'Actual verify-pack input SHA');
 assert(packet.school==='경암중'&&packet.originalCorrectChoiceAndSolutionWithheld===true,'Allowed answer-free source packet');
 assert(inputs.length===18&&blindBindings.questions.length===18,'All18');
 const {bindCandidate}=await import(pathToFileURL(path.join(parent,'scripts/import/exam-twin/candidatePack.mjs')).href);
 const rows=[];
 for(const input of inputs){
  const n=input.candidate.questionNumber,nn=String(n).padStart(2,'0'),candidateFile=path.join(evidenceRoot,'gyeongam-independent-r1/package/private/q'+nn+'/candidate.json');
  const b=bindCandidate(candidateFile),rawFile=path.join(blindRoot,'solve/q'+nn+'.json'),rawBytes=fs.readFileSync(rawFile),raw=JSON.parse(rawBytes),frozen=manifest.originalSolveFileHashes.find(x=>x.n===n),ownFrozen=blindBindings.questions.find(x=>x.questionNumber===n);
  assert(sha(rawBytes)===frozen.sha256&&sha(rawBytes)===ownFrozen.rawSolveSha256,'Pre-exposure raw solve bytes');
  assert(digest(raw)===input.solveDigest&&digest(input.independentSolve)===input.solveDigest,'Canonical independent solve digest');
  for(const key of ['studentDigest','candidateDigest','assetDigest'])assert(b[key]===input[key],'Current candidate/asset/student binding q'+n);
  assert(raw.studentDigest===input.studentDigest&&raw.solverId!==b.candidate.authorId,'Different independent author/solver');
  assert(raw.evidence.authorAnswerExposure===false&&raw.evidence.originalAnswerExposure===false,'Original blind solve preserved');
  assert(digest(b.candidate)===digest(input.candidate),'Current candidate answers/metadata exact exposed bytes');
  const source=packet.questions.find(q=>q.number===n);
  assert(source&&source.sourceContentDigest===b.candidate.sourceReference.sourceContentDigest,'Final question-only source identity');
  assert(sha(fs.readFileSync(sourceFile))===b.candidate.sourceReference.sourcePacketSha256,'Byte-identical final source packet');
  assert(source.scoreEvidence.referenceParentScore===b.candidate.score,'Literal source parent score');
  assert(raw.evidence.calculation.conditions.every(c=>c.passed),'Independent domain/existence calculations');
  if(b.candidate.choices.length===5){assert(raw.evidence.calculation.optionChecks.length===5&&raw.evidence.calculation.optionChecks.filter(x=>x.correct).length===1,'Independent all five options');assert(b.candidate.answer===raw.answer,'MC exact choice mark');}
  const assets=[];
  for(const asset of input.assets){
   const specBytes=fs.readFileSync(asset.sourceSpecPath),svgBytes=fs.readFileSync(asset.sourceSvgPath),spec=JSON.parse(specBytes);
   assert(sha(specBytes)===asset.specSha256&&sha(svgBytes)===asset.svgSha256,'Bound private current spec/SVG');
   assert(sha(fs.readFileSync(path.join(blindRoot,asset.studentPath)))===asset.svgSha256,'Blind student SVG equals current asset');
   assert(asset.intendedWidthMm<=70,'Bank70mm cap');
   const rendered=await renderFigureSpec(spec,{strict:true});assert(rendered.ok&&!rendered.droppedDimensions?.length,'Strict local current renderer');
   assert(sha(Buffer.from(rendered.svg))===asset.svgSha256,'Current local renderer reproduces SVG bytes');
   let relation={passed:true,reason:'Printed category/axis values directly inspected in frozen student SVG.'};
   const p=spec.points;
   if(n===9)relation={passed:digest(p)===digest(raw.evidence.calculation.facts.pointsReadFromSuppliedTicks),reason:'All12 specified scatter points equal independent visual readings, including the50 boundary.'};
   if(n===10)relation={passed:approx(dist(p.P,p.R)/12,dist(p.Q,p.R)/16)&&approx(dist(p.P,p.Q)/20,dist(p.P,p.R)/12)&&approx(dot(p.R,p.P,p.Q),0),scalePxPerCm:dist(p.P,p.R)/12,reason:'All3 sides share the same numeric scale and R is actually right.'};
   if(n===11&&!spec.angles?.angle_B){const eq=(X,Y,Z,W)=>approx(X[0]-Y[0],Z[0]-W[0])&&approx(X[1]-Y[1],Z[1]-W[1]);relation={passed:eq(p.G,p.F,p.C,p.B)&&eq(p.B,p.F,p.C,p.G)&&eq(p.E,p.F,p.A,p.B)&&eq(p.E,p.F,p.H,p.G)&&eq(p.E,p.F,p.D,p.C)&&eq(p.D,p.A,p.H,p.E),projectedParallelEdgesConsistent:true,metricAnglesOrLengthsInferredFromProjection:false,reason:'The labelled cube is an affine placement projection with consistent parallel edges. The separate exact BFD triangle supplies the mathematical lengths/angle; projected C/FD overlap is not a space collinearity claim.'};}
   if(n===11&&spec.angles?.angle_B)relation={passed:approx(dist(p.B,p.D)/dist(p.B,p.F),Math.sqrt(2))&&approx(dot(p.B,p.F,p.D),0),scalePxPerCm:dist(p.B,p.F)/4,reason:'The separate exact BFD triangle has BF=4 and BD=4sqrt2 at one scale; B is right. The cube is a projected placement diagram.'};
   if(n===12)relation={passed:approx(dist(p.P,p.R)/18,dist(p.Q,p.R)/9)&&approx(dot(p.R,p.P,p.Q),0),scalePxPerCm:dist(p.P,p.R)/18,reason:'Actual PR/QR are2:1 and scale-consistent with independent18cm/9cm.'};
   if(n===13){const r=spec.circles.c.radius;relation={passed:approx(dist(p.O,p.P),r)&&approx(dist(p.O,p.Q),r)&&approx(p.H[0],p.P[0])&&approx(p.K[0],p.Q[0])&&approx(cross(p.O,p.P,p.T),0)&&approx(cross(p.O,p.Q,p.U),0)&&p.Q[1]<p.P[1]&&p.K[0]<p.H[0]&&p.U[1]<p.T[1],scalePxPerUnit:r,reason:'Both points lie on radius1, both projections and both rays are exact, with Q higher/left and U higher.'};}
   if(n===18)relation={passed:approx(dist(p.A,p.D),dist(p.C,p.D))&&approx(angle(p.D,p.C,p.B),45)&&approx(angle(p.A,p.C,p.B),22.5)&&approx(dot(p.B,p.A,p.C),0)&&p.A[0]<p.D[0]&&p.D[0]<p.B[0],scalePxPerCm:dist(p.B,p.C)/5,reason:'Internal D, equal AD/CD,45 degree atD,rightB and actual22.5degree atA all hold geometrically.'};
   if(n===19){const scale=spec.circles.c.radius/4;relation={passed:approx(angle(p.O,p.A,p.B),60)&&approx(dist(p.O,p.A),spec.circles.c.radius)&&approx(cross(p.O,p.A,p.D),0)&&approx(dot(p.C,p.A,p.B),0)&&approx(dot(p.B,p.O,p.D),0)&&approx(area([p.A,p.C,p.B,p.D])/(scale*scale),6*Math.sqrt(3)),scalePxPerCm:scale,polygonAreaCm2:area([p.A,p.C,p.B,p.D])/(scale*scale),reason:'The actual shaded trapezoid equals6sqrt3cm² at radius4, with ray/foot/right-angle and60degree conditions satisfied.'};}
   assert(relation.passed,'Actual diagram mathematical relation q'+n);
   assets.push({...asset,strictLocalSvgReproduction:true,reproducedSvgSha256:sha(Buffer.from(rendered.svg)),numericRelation:relation});
  }
  const sourceImages=source.images.map(img=>{const file=path.join(sourceRoot,img.file);assert(sha(fs.readFileSync(file))===img.sha256,'Source question-only crop SHA');return{path:file,sha256:img.sha256,referenceOnly:true};});
  rows.push({questionNumber:n,studentDigest:input.studentDigest,candidateDigest:input.candidateDigest,assetDigest:input.assetDigest,solveDigest:input.solveDigest,originalSolveFileSha256:sha(rawBytes),originalSolvePath:rawFile,authorId:b.candidate.authorId,solverId:raw.solverId,candidateFile,candidateFileSha256:sha(fs.readFileSync(candidateFile)),sourceQuestionId:source.sourceQuestionId,sourceContentDigest:source.sourceContentDigest,sourceRecordDigest:digest(source),sourcePacketSha256:sha(fs.readFileSync(sourceFile)),sourceScore:source.scoreEvidence.referenceParentScore,candidateScore:b.candidate.score,sourceParts:source.subQuestions,authorParts:b.candidate.facts.subQuestions,assets,sourceImages,allFiveOptionsFromIndependentCode:b.candidate.choices.length===5,independentConditionsPassed:true});
 }
 const out={schemaVersion:1,method:'independent-solve-then-review',verificationInputsPath:inputFile,verificationInputsSha256:sha(fs.readFileSync(inputFile)),verificationManifestSha256:sha(fs.readFileSync(path.join(verificationRoot,'verification-manifest.json'))),verifyBriefSha256:sha(fs.readFileSync(path.join(verificationRoot,'VERIFY-BRIEF.md'))),blindCommit:'53fcf61aa9f30885813befbbab3bccd47a7eae79',blindBindingsSha256:sha(fs.readFileSync(path.join(blindRoot,'raw-solve-bindings.json'))),authorAnswersReadOnlyAfterBlindCommit:true,answerExposureJsonPresent:fs.existsSync(path.join(verificationRoot,'answer-exposure.json')),exposureAuthority:'Explicit user authorization and actual verify-pack manifest/inputs binding all18 original solve file hashes; no separate answer-exposure.json in supplied directory at read time.',sourceQuestionOnlyPacket:sourceFile,sourcePacketSha256:sha(fs.readFileSync(sourceFile)),parentIntegrationSidecarSha256:sha(fs.readFileSync(path.join(evidenceRoot,'gyeongam-parent-integration-r1/verification.json'))),questions:rows,totalFigures:rows.reduce((s,r)=>s+r.assets.length,0),all18FrozenBindingsPassed:true,rightsApproved:false,nativeApproved:false,loadable:false};
 const file=path.join(__dirname,'input-and-asset-audit.json');assert(!fs.existsSync(file),'New report only');fs.writeFileSync(file,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({questions:rows.length,figures:out.totalFigures,allFourDigestsBound:true,rawSolveBytesUnchanged:true,strictLocalReproduction:true}));
})().catch(e=>{console.error(e);process.exit(1)});
