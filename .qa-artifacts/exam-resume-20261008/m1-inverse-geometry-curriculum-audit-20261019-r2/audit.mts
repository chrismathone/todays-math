import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
const root='C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008';
const out=path.dirname(fileURLToPath(import.meta.url));
const files=['src/lib/examStudy/families/middle/algebra.ts','src/lib/examStudy/families/middle/graphs.ts','src/lib/examStudy/families/middle/support.ts','src/__tests__/unit/examStudyM1StudentMethods.test.ts'];
const sha=(x:any)=>createHash('sha256').update(x).digest('hex');
const hashes=()=>Object.fromEntries(files.map(p=>[p,sha(fs.readFileSync(root+'/'+p))]));
const write=(n:string,x:any)=>fs.writeFileSync(out+'/'+n,JSON.stringify(x,null,2)+'\n','utf8');
const before=hashes();write('source-before.json',before);
const imp=(p:string)=>import(pathToFileURL(root+'/'+p).href);
const {equalLegs}=await imp(files[0]);
const {inverseArea,square}=await imp(files[1]);
const katex=(await imp('node_modules/katex/dist/katex.mjs')).default;
const assert=(b:any,s:string)=>{if(!b)throw Error(s)};
const eq=(a:any,b:any)=>JSON.stringify(a)===JSON.stringify(b);
const clone=(x:any)=>JSON.parse(JSON.stringify(x));
// Independent number formatting and arithmetic; never import support.area/linear2/solve.
function number(n:number){for(let d=1;d<101;d++)if(Math.abs(n*d-Math.round(n*d))<1e-10)return d===1?''+Math.round(n):`${Math.round(n*d)}/${d}`;throw Error('unexpected rational')}
const point=(a:number[],b:number[])=>a.length===b.length&&a.every((v,i)=>Math.abs(v-b[i])<1e-10);
const rows:any[]=[],bindings:any[]=[],mutations:any[]=[];
const prior=root+'/.qa-artifacts/exam-resume-20261008/m1-inverse-geometry-curriculum-audit-20261019-r1';
const old=JSON.parse(fs.readFileSync(prior+'/actual-student-surfaces.json','utf8'));
let mathBlocks=0;
function negative(f:any,q:any,i:number,name:string,change:(z:any)=>void){const z=clone(q);change(z);const result=f.verify(z);mutations.push({familyId:f.id,variant:i,name,answerUnchanged:z.answer===q.answer,valid:result.valid,errors:result.errors});assert(!result.valid,`mutation accepted: ${f.id}/${i}/${name}`)}
for(const f of [equalLegs,inverseArea,square]){
 const n=f.paramDomain.size; assert(n===({[equalLegs.id]:4,[inverseArea.id]:12,[square.id]:8}[f.id]),'bounded size');
 for(let i=0;i<n;i++){
  const q=f.generate(0,i),g=q.figureSpec;assert(eq(q,f.generate(0,i)),'nondeterministic');
  assert(q.questionType==='단답형'&&!q.rubric,'unexpected student format');assert(!('choices'in q)||!q.choices?.length,'unexpected choices');
  for(const text of [q.content,q.solution,...(g?.labels.map((l:any)=>l.text)??[])]){
   assert(!text.includes('\ufffd'),'replacement text');
   for(const m of text.matchAll(/\$([^$]+)\$/gu)){katex.renderToString(m[1],{throwOnError:true,strict:'error'});mathBlocks++}
  }
  let proof:any,answer:string;
  if(f===equalLegs){
   const m=/A=\((\d+),u\).*B=\((\d+),v\)/u.exec(q.content);assert(m,'printed coords');
   const p=+m![1],qv=+m![2],d=qv-p,coefficient=qv-p,t=p*d/coefficient,u=t+d,k=p*u;
   assert(p>0&&d>0&&t>0&&u>t&&p*u===qv*t&&u-t===d,'domain equalLegs');
   answer=`k=${k}, u=${u}, v=${t}`;
   const equations=[`${p}(t+${d})=${qv}t`,`${p}t+${p*d}=${qv}t`,`${d}t=${p*d}`,`t=${t}`];
   for(const x of equations)assert(q.solution.includes('$'+x+'$'),'actual numeric single-variable equation missing');
   assert(!/연립|가감|소거|첫 식에|곱해 빼면/u.test(q.solution),'late-grade route');
   proof={printed:{p,q:qv,d},equations,oneVariable:t,computed:{u,v:t,k},coefficient,unique:'Nonzero positive numerical coefficient q-p. One linear equation in t; recover other named values by arithmetic.',primitives:['subtract printed positive x-coordinates','name v=t and u=t+d','inverse coordinate products equal','distribute numeric p over t+d','add/subtract numeric-coefficient linear terms','divide by positive numeric coefficient','numeric product for k','substitute into both printed incidences']};
   negative(f,q,i,'old-elimination',z=>z.solution='두 미지수의 연립방정식에서 첫 식에 상수를 곱해 빼면 가감법으로 소거하여 정답을 얻는다.');
   negative(f,q,i,'correct-one-variable-plus-old-elimination',z=>z.solution+=' 연립방정식의 가감법으로 소거한다.');
   negative(f,q,i,'false-t-with-correct-final-answer',z=>z.solution=z.solution.replace(`$t=${t}$`,'$t=99$'));
   negative(f,q,i,'missing-distribution-with-correct-final-answer',z=>z.solution=z.solution.replace('$'+equations[1]+'$','계산 생략'));
  }else if(f===inverseArea){
   const am=g.labels.map((l:any)=>/^A\((\d+),(\d+)\)$/.exec(l.text)).find(Boolean),rm=/넓이비가 (\d+):(\d+)/u.exec(q.content);assert(am&&rm,'printed area values');
   const a=+am[1],h=+am[2],r=+rm![1],s=+rm![2],offset=a*r/s,b=a+offset,k=a*h,z=k/b;
   const areas={OAC:a*h/2,ABC:offset*h/2,OBC:a*z/2};const result=areas.OAC+areas.ABC-areas.OBC;
   assert(a>0&&h>0&&r>0&&s>0&&b>a&&z>0&&z<h&&b*z===k&&areas.ABC/areas.OAC===r/s&&result>0,'area domain');
   answer=`B=(${number(b)},${number(z)}), 넓이=${number(result)}`;
   // Check actual figure data only after deriving B and area from printed labels.
   const pts=[[0,0],[a,h],[b,z]];
   assert(g.polygons.length===1&&g.polygons[0].points.every((p:any,j:number)=>point(p,pts[j])),'area polygon');
   assert(g.labels.some((l:any)=>l.text==='C'&&point(l.at,[a,0])),'foot C');
   assert(g.segments.length===2&&g.segments.some((v:any)=>v.dashed&&point(v.from,[a,h])&&point(v.to,[a,0]))&&g.segments.some((v:any)=>v.dashed&&point(v.from,[a,0])&&point(v.to,[b,z])),'two auxiliary edges');
   assert(g.curves.length===1&&g.curves[0].type==='inverse'&&g.curves[0].k===k&&g.curves[0].domain[0]>0&&g.curves[0].domain[0]<a&&g.curves[0].domain[1]>b,'positive branch');
   for(const [region,v] of Object.entries(areas)){
    const re=new RegExp('\\$\\['+region+'\\]=[^$]+\\$','u'); const term=q.solution.match(re)?.[0];assert(term,'actual elementary area missing');
    assert(term!.endsWith('='+number(v)+'$'),'actual intermediate area incorrect');
    negative(f,q,i,'missing-'+region,z=>z.solution=z.solution.replace(term,''));
    negative(f,q,i,'false-'+region+'-correct-final-answer',z=>z.solution=z.solution.replace(term,term!.replace(/=[^=]+\$$/u,'=999$')));
   }
   const final=`$[OAB]=[OAC]+[ABC]-[OBC]=${number(areas.OAC)}+${number(areas.ABC)}-${number(areas.OBC)}=${number(result)}$`;
   assert(q.solution.includes(final),'elementary final chain');
   assert(q.solution.includes('삼각형 $OAC,ABC$로도, 삼각형 $OAB,OBC$로도 나뉜다'),'two partitions');
   negative(f,q,i,'missing-two-partitions',zz=>zz.solution=zz.solution.replace('삼각형 $OAC,ABC$로도, 삼각형 $OAB,OBC$로도 나뉜다','분할은 생략한다'));
   negative(f,q,i,'old-unnamed-large-small-method',zz=>zz.solution='큰 삼각형에서 작은 삼각형을 빼면 정답이 된다. 최종 답은 기존 값과 같으며 구체적 중간 넓이는 생략한다.');
   proof={printed:{a,h,r,s},computed:{offset,b,z,k},elementaryTriangles:[{name:'OAC',base:'AC',length:h,perpendicularHeight:a,value:areas.OAC},{name:'ABC',base:'AC',length:h,perpendicularHeight:offset,value:areas.ABC},{name:'OBC',base:'OC',length:a,perpendicularHeight:z,value:areas.OBC,exteriorHeight:true}],partitions:'Convex OABC has diagonals AC and OB: OAC+ABC=OAB+OBC. Move OBC by area additivity.',area:result,unique:'Positive common base AC cancels in printed ratio; horizontal offset uniquely a*r/s>0, b>a uniquely fixed, then inverse relation gives one z>0. No other branch in first quadrant.',primitives:['read numeric A and printed ratio','triangle base times perpendicular height divided by2','cancel same positive base/2 in ratio','simple numeric proportion','inverse relation as numeric product/division','add two elementary triangle areas and subtract third']};
  }else{
   const slopes=g.labels.map((l:any)=>/^\$y=(\d+)x\$$/u.exec(l.text)).filter(Boolean).map((m:any)=>+m[1]).sort((a:number,b:number)=>a-b);const rr=g.labels.map((l:any)=>/^R=(\d+)$/u.exec(l.text)).find(Boolean);assert(slopes.length===2&&rr,'square printed constants');
   const [a,b]=slopes,R=+rr[1],coefficient=1+b-a,u=R/coefficient,side=R-u,cy=b*u;
   assert(a>0&&b>a&&R>0&&u>0&&side>0&&side===(b-a)*u,'square domain');
   answer=`C=(${R},${number(cy)})`;
   const pts=[[u,a*u],[R,a*u],[R,b*u],[u,b*u]];assert(g.polygons.length===1&&g.polygons[0].points.every((p:any,j:number)=>point(p,pts[j])),'square corners');
   assert(g.curves.length===2&&g.curves.every((c:any,j:number)=>c.coefficients[0]===slopes[j]&&c.coefficients[1]===0&&c.domain[0]===0&&c.domain[1]>=u),'direct lines');
   for(let j=0;j<4;j++)assert(g.labels.some((l:any)=>l.text==='ABCD'[j]&&point(l.at,pts[j])),'square label');
   assert(g.labels.some((l:any)=>l.text===`R=${R}`&&point(l.at,[R,0]))&&g.segments.some((v:any)=>v.dashed&&point(v.from,[R,a*u])&&point(v.to,[R,0])),'R guide');
   assert(q.solution.includes(`$u+${b-a}u=${R}$`),'square numeric linear equation');
   proof={printed:{a,b,R},coefficient,u,side,C:[R,cy],unique:'One numerical linear equation with coefficient1+(b-a)>0. Axis-parallel side equality fixes unique positive u and all four first-quadrant vertices.',primitives:['evaluate direct-proportion expressions at shared x-coordinate u','subtract numeric-coefficient linear expressions','equal horizontal and vertical square sides','solve one-variable numeric linear equation','evaluate b*u to obtain C ordinate']};
  }
  assert(q.answer===answer,'independent answer differs');
  const oldRow=old.find((x:any)=>x.familyId===f.id&&x.variant===i);assert(oldRow,'prior row missing');
  if(f!==square)negative(f,q,i,'actual-prior-v1-student-solution',z=>z.solution=oldRow.solution);
  const comparison={content:eq(q.content,oldRow.content),answer:eq(q.answer,oldRow.answer),solution:eq(q.solution,oldRow.solution),figureSpec:eq(q.figureSpec,oldRow.figureSpec)};
  assert(comparison.content&&comparison.answer&&comparison.figureSpec,'unintended student data/figure change');assert(comparison.solution===(f===square),'expected method-only change');
  if(g){const bind=oldRow.archivedFigure;const snap=JSON.parse(fs.readFileSync(bind.snapshot,'utf8'));assert(eq(g,snap.figureSpec),'existing spec differs');assert(sha(fs.readFileSync(bind.svg))===bind.svgSha256,'existing svg changed');bindings.push({familyId:f.id,variant:i,snapshot:bind.snapshot,snapshotSha256:sha(fs.readFileSync(bind.snapshot)),svg:bind.svg,svgSha256:bind.svgSha256,currentFigureSpecExact:true,currentContentAndAnswerExact:q.content===snap.content&&q.answer===snap.answer,currentSolutionEqualsArchived:q.solution===snap.solution});}
  const valid=f.verify(q);assert(valid.valid,'factory rejected actual current output');
  rows.push({familyId:f.id,version:f.version,variant:i,printedContent:q.content,printedAnswer:q.answer,printedStudentSolution:q.solution,figureSpec:g,independent:proof,computedAnswer:answer,priorComparison:comparison,actualVerifier:valid,format:q.questionType});
 }
}
assert(equalLegs.version==='2-m1-single-variable'&&inverseArea.version==='2-m1-elementary-area'&&square.version==='1','versions');
// Two bounded adversarial probes distinguish substring requirements from semantic validation.
const semanticLimitProbes=[
 {family:equalLegs,extra:' 추가로 $t=99$이다.',name:'contradictory-appended-t'},
 {family:inverseArea,extra:' 추가로 $[ABC]=999$이다.',name:'contradictory-appended-ABC'},
].map(({family,extra,name})=>{const q=family.generate(0,0);return {familyId:family.id,name,answerUnchanged:true,extra,result:family.verify({...q,solution:q.solution+extra})}});
write('verifier-semantic-limits.json',semanticLimitProbes);
const after=hashes();assert(eq(before,after),'root code changed');write('source-after.json',after);
write('actual24-and-independent-findings.json',rows);write('existing20-bindings.json',bindings);write('verifier-negative-cases.json',mutations);
const summary={actualVariants:rows.length,counts:{equalLegs:4,inverseArea:12,unchangedSquare:8},actualVerifierPass:rows.length,negativeCases:mutations.length,negativeCasesRejected:mutations.filter(x=>!x.valid).length,allNegativeAnswersUnchanged:mutations.every(x=>x.answerUnchanged),mathBlocksRendered:mathBlocks,exactExistingFigureSpecs:bindings.length,sourceBeforeAfterEqual:eq(before,after),noRootAnswerHelperOracle:true,fullRegistryImported:false,rootEdits:0,dbWrites:0,deploys:0};write('summary.json',summary);console.log(JSON.stringify(summary,null,2));
