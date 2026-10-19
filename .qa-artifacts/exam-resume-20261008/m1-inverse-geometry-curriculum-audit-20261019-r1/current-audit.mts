import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root='C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008';
const out='C:/Users/user/orca/workspaces/todays-math/exam-twin-source-identity-20261008/.qa-artifacts/exam-resume-20261008/m1-inverse-geometry-curriculum-audit-20261019-r1';
if(process.cwd().replaceAll('\\','/')!==root)throw Error('wrong cwd');
const paths=['tsconfig.json','src/lib/examStudy/families/middle/algebra.ts','src/lib/examStudy/families/middle/graphs.ts','src/lib/examStudy/families/middle/support.ts','src/lib/examStudy/generate.ts','src/lib/examStudy/registry.ts','src/lib/examStudy/evidence.ts','src/lib/examStudy/curriculumEligibility.ts','src/contracts/examStudy.contract.ts','src/__tests__/unit/examStudyMiddle.test.ts'];
const sha=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
const hashes=()=>Object.fromEntries(paths.map(p=>[p,sha(fs.readFileSync(root+'/'+p))]));
const write=(n:string,x:unknown)=>fs.writeFileSync(out+'/'+n,JSON.stringify(x,null,2)+'\n','utf8');
const before=hashes();write('code-before.json',before);
const imp=(p:string)=>import(pathToFileURL(root+'/'+p).href);
const {equalLegs}=await imp('src/lib/examStudy/families/middle/algebra.ts');
const {inverseArea,square}=await imp('src/lib/examStudy/families/middle/graphs.ts');
const {generateExamStudy}=await imp('src/lib/examStudy/generate.ts');
const families=[equalLegs,inverseArea,square];
const archive=root+'/.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/native-models-r1/middle-figures';
const records:any[]=[];const pictures:any[]=[];const independent:any[]=[];
function check(b:unknown,s:string){if(!b)throw Error(s);}
for(const family of families){
 const domain=family.paramDomain.enumerate();
 check(domain.length===family.paramDomain.size,'wrong size');
 for(let i=0;i<domain.length;i++){
  const p=family.generate(0,i);check(JSON.stringify(p.parameters)===JSON.stringify(domain[i]),'domain mismatch');
  check(JSON.stringify(p)===JSON.stringify(family.generate(0,i)),'not deterministic');
  let proof:any;
  if(family===equalLegs){
   const m=/\$A=\((\d+),u\)\$, \$B=\((\d+),v\)\$/.exec(p.content)!;
   const x1=+m[1],x2=+m[2],d=x2-x1;
   const v=x1*d/(x2-x1),u=v+d,k=x1*u;
   check(p.answer===`k=${k}, u=${u}, v=${v}`,'equalLeg answer');
   check(v>0&&u>v&&x1*u===x2*v&&u-v===d,'equalLeg conditions');
   proof={oneVariable:'Let lower ordinate be t. Upper ordinate is t+d; substitute into the inverse relation to get the one-variable equation p(t+d)=q t. All p,q,d are printed numerical constants.',numericEquation:`${x1}(t+${d})=${x2}t`,solution:{k,u,v},unique:'The coefficient q-p=d is positive, so the single linear equation has exactly one solution.',currentSolutionUsesElimination:p.solution.includes('곱해 빼면')};
  }else if(family===inverseArea){
   const al=p.figureSpec.labels.map((l:any)=>/^A\((\d+),(\d+)\)$/.exec(l.text)).find(Boolean);
   const a=+al[1],y=+al[2];const ratio=/넓이비가 (\d+):(\d+)일/.exec(p.content)!;
   const r=+ratio[1],s=+ratio[2],b=a+a*r/s,k=a*y,z=k/b;
   // All three triangles use vertical/horizontal bases and elementary perpendicular heights.
   const OAC=a*y/2,ABC=(b-a)*y/2,OBC=a*z/2,area=OAC+ABC-OBC;
   check(p.answer===`B=(${b},${z}), 넓이=${area}`,'inverseArea answer');
   check(b>a&&z>0&&z<y&&b*z===k&&ABC/OAC===r/s&&area>0,'inverseArea conditions');
   proof={a,y,r,s,b,z,triangles:{OAC:{base:'AC',baseLength:y,height:a,area:OAC},ABC:{base:'AC',baseLength:y,height:b-a,area:ABC},OBC:{base:'OC',baseLength:a,height:z,area:OBC}},decomposition:'Simple convex quadrilateral OABC is partitioned by AC into OAC+ABC and by OB into OAB+OBC. Thus OAB=OAC+ABC-OBC.',area,unique:'Shared positive AC gives unique positive horizontal offset a*r/s; b>a then unique z=k/b. Finite task does not require similarity, determinant or slope formula.',currentVagueTriangleStep:p.solution.includes('큰 삼각형에서 작은 삼각형')};
  }else{
   const slopes=p.figureSpec.labels.map((l:any)=>/^\$y=(\d+)x\$$/.exec(l.text)).filter(Boolean).map((m:any)=>+m[1]).sort((a:number,b:number)=>a-b);
   const rr=p.figureSpec.labels.map((l:any)=>/^R=(\d+)$/.exec(l.text)).find(Boolean);const R=+rr[1],a=slopes[0],b=slopes[1];
   const u=R/(1+b-a),side=R-u,cy=b*u;
   check(side>0&&side===(b-a)*u&&u>0,'square positivity');
   check(p.answer===`C=(${R},${cy})`,'square answer');
   proof={a,b,R,u,side,C:[R,cy],oneVariableEquation:`u+${b-a}u=${R}`,unique:'Positive numerical coefficient 1+b-a gives unique u>0. Square side equality uses elementary square properties and one-variable linear arithmetic; no distance formula or similarity.',noLiteralProductRequired:true};
  }
  independent.push({familyId:family.id,variant:i,parameters:p.parameters,proof});
  let existing:any=null;
  if(p.figureSpec){
   const stem=archive+'/'+family.id+'/'+i;
   const snap=JSON.parse(fs.readFileSync(stem+'.json','utf8'));
   check(JSON.stringify(snap.figureSpec)===JSON.stringify(p.figureSpec),'archived spec changed');
   for(const field of ['content','answer','solution'])check(snap[field]===p[field],'archived surface changed');
   const svg=fs.readFileSync(stem+'.svg','utf8');
   existing={snapshot:stem+'.json',snapshotSha256:sha(fs.readFileSync(stem+'.json')),svg:stem+'.svg',svgSha256:sha(svg),exactCurrentFigureSpec:true,exactCurrentContentAnswerSolution:true};
   pictures.push({familyId:family.id,variant:i,...existing});
  }
  records.push({familyId:family.id,version:family.version,variant:i,domain:domain[i],...p,actualVerifier:family.verify(p),archivedFigure:existing});
 }
}
write('actual-student-surfaces.json',records);write('independent-methods.json',independent);write('existing-figure-bindings.json',pictures);
const prepare=async(p:any)=>{
 if(!p.figureSpec)return {ok:true as const,figureSvg:null};
 const row=records.find(x=>JSON.stringify(x.figureSpec)===JSON.stringify(p.figureSpec)&&x.content===p.content);
 return row?{ok:true as const,figureSvg:fs.readFileSync(row.archivedFigure.svg,'utf8')}:{ok:false as const,reason:'no unchanged current archived figure'};
};
const routes=[];
for(const family of families)for(const format of ['단답형','혼합','객관식','서술형']){
 const request={course:'중1',familyIds:[family.id],count:1,format,seed:731,maxPerFamily:1};
 const a=await generateExamStudy(request,{families:[family],profiles:[],prepare});
 const b=await generateExamStudy(request,{families:[family],profiles:[],prepare});
 check(JSON.stringify(a)===JSON.stringify(b),'route nondeterministic');
 if(format==='단답형'||format==='혼합')check(a.questions.length===1&&a.questions[0].questionType==='단답형','native route failed');
 else check(a.questions.length===0&&a.status==='unavailable','incompatible route delivered');
 routes.push({familyId:family.id,format,status:a.status,delivered:a.questions.length,digest:a.digest,warnings:a.warnings,requirements:a.requirements,deterministic:true});
}
write('actual-format-routes.json',routes);
const after=hashes();write('code-after.json',after);check(JSON.stringify(before)===JSON.stringify(after),'source changed');
write('summary.json',{families:families.map(f=>({id:f.id,version:f.version,domainSize:f.paramDomain.size,formats:f.formats})),totalVariants:records.length,mathFailures:0,actualVerifierPasses:records.filter(r=>r.actualVerifier.valid).length,archivedFiguresExactlyBound:pictures.length,formatRouteChecks:routes.length,independentMethod:'Student printed text and labels, numerical linear equations and elementary triangle dissection; no author-only linear2/area oracle imported.',noNewRender:true,sourceUnchanged:true});
console.log(fs.readFileSync(out+'/summary.json','utf8'));
