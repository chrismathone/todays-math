const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {sha,digest,assert,approx,write,project,authorId}=require('./author-common.cjs');
const {renderFigureSpec}=require(path.join(project,'src/lib/figure/renderFigureSpec.ts'));
const S2=Math.sqrt(2),S3=Math.sqrt(3),S6=Math.sqrt(6),marks=['①','②','③','④','⑤'];
const newlyAuthored=[19,20,21,22,23,24,25];
const round4=x=>Math.round(x*10000)/10000;
const d=(P,Q)=>Math.hypot(P[0]-Q[0],P[1]-Q[1]);
(async()=>{
 const {bindCandidate}=await import(pathToFileURL(path.join(project,'scripts/import/exam-twin/candidatePack.mjs')).href);
 const rows=[];
 for(const n of newlyAuthored){
  const folder=path.join(__dirname,'candidates','q'+n),b=bindCandidate(path.join(folder,'candidate.json')),c=b.candidate;
  assert(!b.validation.surfaceKeywordViolations.length,'Student method keywords');
  assert(c.independentVerification===null&&c.directUseAllowed===false,'All gates pending');
  let optionChecks;
  if(n===19)optionChecks=[5,5*S2,10,10*S3,15].map((t,i)=>({index:i+1,BC:t,predictedCD:t*(S6+S2)/2,requiredCD:5*(S6+S2),correct:approx(t*(S6+S2)/2,5*(S6+S2))}));
  if(n===20)optionChecks=[2,3,4,4*S3,6].map((r,i)=>({index:i+1,radius:r,predictedIntercept:3*r,requiredIntercept:12,correct:approx(3*r,12)}));
  if(n===21){const sinRecord=Math.round(Math.sin(40*Math.PI/180)*10000),tanRecord=Math.round(Math.tan(40*Math.PI/180)*10000);optionChecks=[6428,7660,8391,12856,14819].map((v,i)=>({index:i+1,UTRecord:v/10000,predictedSumRecord:(sinRecord+v)/10000,requiredSumRecord:(sinRecord+tanRecord)/10000,correct:v===tanRecord}));}
  if(n===22){
   const samples=[];
   for(let deg=.1;deg<45;deg+=.1){const a=deg*Math.PI/180,SQ=2*Math.sin(a),OS=2*Math.cos(a),UT=2*Math.tan(a),beta=90-deg,target=Math.cos(beta*Math.PI/180);samples.push({deg,beta,SQ,OS,UT,target,values:[OS/2,UT/2,SQ/OS,SQ/2,OS/SQ]});}
   optionChecks=[0,1,2,3,4].map(i=>({index:i+1,numericLegalAngleChecks:samples.length,allChecksPassed:samples.every(s=>approx(s.values[i],s.target)),correct:samples.every(s=>approx(s.values[i],s.target))}));
  }
  if(n===23)optionChecks=[45,90,90*S3,45*(1+S3),180+90*S3].map((gap,i)=>({index:i+1,gap,height1:gap,height2:gap*(1+S3),predictedHeightSum:gap*(2+S3),requiredHeightSum:180+90*S3,correct:approx(gap*(2+S3),180+90*S3)}));
  if(n===24)optionChecks=[5,10,15,20,25].map((CD,i)=>({index:i+1,CD,BC:CD*S3,height:CD*S3/(S3+1),predictedArea:3*CD*CD*(S3-1)/4,requiredArea:75*(S3-1),correct:approx(3*CD*CD*(S3-1)/4,75*(S3-1))}));
  if(n===25){const width=8,BF=16*S3/2,CF=width/S3,BC=BF-CF,area=BC*width/2;optionChecks=[[8*S3/3,64*S3/3],[16*S3/3,32*S3/3],[16*S3/3,64*S3/3],[8*S3,64*S3],[16*S3/3,128*S3/3]].map((r,i)=>({index:i+1,record:r,requiredRecord:[BC,area],baseCorrect:approx(r[0],BC),areaCorrect:approx(r[1],area),correct:approx(r[0],BC)&&approx(r[1],area)}));}
  assert(optionChecks.length===5&&optionChecks.filter(x=>x.correct).length===1,'Five options/one answer q'+n);
  assert(c.answer===marks[optionChecks.findIndex(x=>x.correct)],'Fresh code and displayed answer q'+n);
  const renderReproduction=[];
  for(const a of c.figureArtifacts){
   // Only the seven new, not-yet-frozen Group3 assets are rendered to memory.
   const specBytes=fs.readFileSync(path.join(folder,a.specPath)),spec=JSON.parse(specBytes);
   const result=await renderFigureSpec(spec,{strict:true});assert(result.ok,'Strict local reproduction q'+n);
   const actual=sha(fs.readFileSync(path.join(folder,a.svgPath))),repeated=sha(Buffer.from(result.svg));assert(actual===repeated,'Deterministic SVG bytes q'+n);
   assert(!result.droppedDimensions?.length&&a.intendedWidthMm===70,'No silent marks removal / bank cap');
   renderReproduction.push({role:a.role,specPath:a.specPath,specSha256:sha(specBytes),svgPath:a.svgPath,svgSha256:actual,reproducedSvgSha256:repeated,strict:true,localVendor:true,byteIdentical:true,widthMm:70});
  }
  const readSpec=name=>JSON.parse(fs.readFileSync(path.join(folder,name+'.spec.json'),'utf8'));
  let scale;
  if(n===19){const p=readSpec('stem').points;scale={scalePxPerCm:15,actualBCPixels:d(p.B,p.C),expectedBCPixels:150,passed:approx(d(p.B,p.C),150)};}
  if(n===20){const s=readSpec('stem'),p=s.points;scale={scalePxPerUnit:20,actualRadiusPixels:s.circles.circle.radius,expectedRadiusPixels:80,twoRadiiPixels:[d(p.S,p.A),d(p.S,p.B)],passed:s.circles.circle.radius===80&&approx(d(p.S,p.A),80)&&approx(d(p.S,p.B),80)};}
  if(n===21||n===22){const s=readSpec('stem'),R=n===21?1:2;scale={actualRadius:R,scalePxPerUnit:180/R,normalizedRadiusPixels:s.circles.quarter.radius,passed:approx(d(s.points.O,s.points.Q),180)&&approx(d(s.points.O,s.points.U),180)};}
  if(n===23){const p=readSpec('stem').points;scale={scalePxPerMetre:2,gapMetres:90,actualGapPixels:d(p.G,p.E),expectedGapPixels:180,actualHeightPixels:[d(p.G,p.P),d(p.E,p.Q)],passed:approx(d(p.G,p.E),180)&&approx(d(p.G,p.P),180)&&approx(d(p.E,p.Q),180*(1+S3))};}
  if(n===24){const p=readSpec('stem').points;scale={scalePxPerCm:20,actualCDPixels:d(p.C,p.D),expectedCDPixels:200,passed:approx(d(p.C,p.D),200)};}
  if(n===25){const p=readSpec('before').points,q=readSpec('after').points;scale={scalePxPerCm:12,actualCreasePixels:[d(p.A,p.B),d(q.A,q.B)],expectedCreasePixels:192,actualWidthPixels:d(p.R,p.T),expectedWidthPixels:96,passed:approx(d(p.A,p.B),192)&&approx(d(q.A,q.B),192)&&approx(d(p.R,p.T),96)};}
  assert(scale.passed,'Numeric raw spec scale q'+n);
  const preview=JSON.parse(fs.readFileSync(path.join(__dirname,'preview-group3/render-evidence.json'),'utf8')).observations.find(x=>x.questionNumber===n);
  assert(preview.studentDigest===b.studentDigest&&preview.assetDigest===b.assetDigest&&preview.candidateDigest===b.candidateDigest,'Exact viewed final preview binding');
  const proof='preview-group3/q'+n+'.png',solutionProof='preview-group3/q'+n+'.solution.png';
  const audit={schemaVersion:1,authorId,questionNumber:n,method:'author-code-and-local-visual-self-check',status:'author-proposed-independent-review-pending',studentDigest:b.studentDigest,candidateDigest:b.candidateDigest,assetDigest:b.assetDigest,sourceDigest:c.sourceReference.sourceContentSha256,variantDigest:digest(c.variantDelta),calculationDigest:digest(JSON.parse(fs.readFileSync(path.join(folder,'author-calculations.json'),'utf8'))),scriptSha256:sha(fs.readFileSync(__filename)),optionChecks,renderReproduction,rawSpecNumericScale:scale,visualProof:{questionPath:proof,questionSha256:sha(fs.readFileSync(path.join(__dirname,proof))),solutionPath:solutionProof,solutionSha256:sha(fs.readFileSync(path.join(__dirname,solutionProof))),questionAndSolutionViewed:true,allRaw70mmAssetsViewed:true,allChoiceMarksAndFigureRolesChecked:true,bankCapMm:70,productionParity:false,physicalPaperApproval:false,nativePrintApproval:false},sevenSurfaces:c.curriculumReview.surfaces,sourceScore:c.score,authorScore:c.score,grade:'중3',curriculum:'2015',familyStatus:c.metadata.assignment.status,independentVerification:null,directUseAllowed:false};
  const out=path.join(folder,'supplemental-author-check.json');assert(!fs.existsSync(out),'New author evidence only');write(out,audit);
  rows.push({questionNumber:n,studentDigest:b.studentDigest,candidateDigest:b.candidateDigest,assetDigest:b.assetDigest,checkPath:path.relative(__dirname,out).replace(/\\/g,'/'),checkDigest:digest(audit),checkFileSha256:sha(fs.readFileSync(out))});
 }
 const out=path.join(__dirname,'group3-extra-check-bindings.json');assert(!fs.existsSync(out),'No evidence overwrite');write(out,{schemaVersion:1,authorId,scope:newlyAuthored,questions:rows,independentApproval:false,directUseAllowed:false});
 console.log(JSON.stringify({group3Checked:rows.length,allFiveOptions:true,strictSvgReproduction:8,rawScale:true,viewed:true,independentApproval:false}));
})().catch(e=>{console.error(e);process.exit(1)});
