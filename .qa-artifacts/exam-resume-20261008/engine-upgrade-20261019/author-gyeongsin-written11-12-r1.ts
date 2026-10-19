import fs from 'node:fs';
import assert from 'node:assert/strict';
import {renderFigureSpec} from '../../../src/lib/figure/renderFigureSpec';
import {bindCandidate,readJson,sha256,SURFACES} from '../../../scripts/import/exam-twin/candidatePack.mjs';
type Point=[number,number];
async function main(){
 const b='.qa-artifacts/exam-resume-20261008/',out=b+'gyeongsin-authoring-group10-r1/',old=readJson(b+'gyeongsin-authoring-group9-r1/q10.json'),source=readJson(old.sourceReference.sourceManifest.path),snapshotPath=b+'engine-upgrade-20261019/live-family-snapshot-r2.json',snapshot=readJson(snapshotPath);
 assert.equal(source.nominalYear,2025);fs.mkdirSync(out);
 const at=(angle:number):Point=>[120+65*Math.cos(angle*Math.PI/180),110-65*Math.sin(angle*Math.PI/180)];
 const angleSpec={version:2,style:{show_points:true},points:{O:[120,110],K:at(-30),L:at(-84),M:at(-138),T:at(80)},circles:{c:{center:'O',radius:65}},segments:{OK:['O','K'],OM:['O','M'],KT:['K','T'],LT:['L','T']},angles:{given:{vertex:'O',points:['K','M'],label:'108°',radius:17,label_distance:30},target:{vertex:'T',points:['K','L'],label:'x',radius:18,label_distance:30}},labels:{O:'O',K:'K',L:'L',M:'M',T:'T'}};
 const rt=Math.sqrt(35),height=3*rt/2,radius=3*rt/5;
 const model:Record<string,Point>={P:[6.5,height],Q:[0,0],R:[16,0],O:[7,radius],U:[91/22,21*rt/22],V:[7,0],W:[245/26,27*rt/26]};
 const distance=(a:Point,z:Point)=>Math.hypot(a[0]-z[0],a[1]-z[1]);const eq=(a:number,z:number)=>assert(Math.abs(a-z)<1e-10);
 for(const[a,z,v]of [['P','Q',11],['Q','R',16],['R','P',13],['P','U',4],['P','W',4],['Q','U',7],['Q','V',7],['R','V',9],['R','W',9]] as const)eq(distance(model[a],model[z]),v);
 for(const name of ['U','V','W'])eq(distance(model.O,model[name]),radius);
 for(const[a,z,t]of [['P','Q','U'],['Q','R','V'],['R','P','W']]){const A=model[a],Z=model[z],T=model[t],O=model.O;eq((Z[0]-A[0])*(O[0]-T[0])+(Z[1]-A[1])*(O[1]-T[1]),0);}
 assert(11+13>16&&11+16>13&&13+16>11);
 const triangleSpec={version:2,style:{show_points:true},points:Object.fromEntries(Object.entries(model).map(([k,[x,y]])=>[k,[35+10*x,135-10*y]])),circles:{c:{center:'O',radius:10*radius}},segments:{PQ:['P','Q'],QR:['Q','R'],RP:['R','P']},labels:{P:'P',Q:'Q',R:'R',O:'O',U:'U',V:'V',W:'W'}};
 const tasks=[{
  n:11,score:6,printed:'서술형1',unitId:'bd2f6e4b-2822-421c-a67d-855ab4a60103',standard:'9수04-20',spec:angleSpec,difficulty:'기본',
  content:String.raw`원 $O$ 위의 서로 다른 네 점 $K,L,M,T$가 있다. 점 $L$은 작은 호 $KM$ 위에 있고 두 작은 호 $KL$, $LM$의 길이는 같다. 점 $T$는 $L$을 포함하지 않는 호 $KM$ 위에 있다. 중심각 $KOM$의 크기가 $108^\circ$일 때, $\angle KTL$의 크기를 구하고 그 과정을 쓰시오.`,
  answer:String.raw`$27^\circ$`,solution:String.raw`길이가 같은 두 호에 대한 중심각의 크기는 같으므로 $\angle KOL=\angle LOM$이다. 점 $L$이 작은 호 $KM$ 위에 있으므로 $\angle KOL+\angle LOM=108^\circ$이고, 따라서 $\angle KOL=54^\circ$이다.

점 $T$는 작은 호 $KL$ 위에 있지 않으므로 $\angle KTL$은 이 호에 대한 원주각이다. 같은 호에 대한 원주각의 크기는 중심각의 크기의 절반이므로 $\angle KTL=54^\circ\div2=27^\circ$이다.`,
  before:'같은 두 작은 호와 원주각을 주고 두 호 전체의 중심각을 구한다.',after:'두 호 전체의 중심각을 주고 한 호를 보는 원주각을 역으로 복원한다.',concept:'같은 호의 중심각과 원주각, 길이가 같은 호의 중심각',procedure:'같은 두 호의 각을 한 문자로 묶음→중심각 전체와 부분의 관계→원주각의 절반 관계',proof:'양의 두 중심각54°가 합108°를 이루고 나머지호252°에 T를 잡을 수 있다. 주어진 작은호와 T의 위치가 원주각이 보는 호를 유일하게 정한다. 실제 좌표는 각-30,-84,-138,80°의 서로 다른 점을 배치할 뿐 답의 입력이 아니다.',sourceObservation:'OriginalH page3 written1: equal small arcsAB/BC each2 and ADB21; ask AOC;6points.',authorCalculation:{centralWhole:108,centralHalves:[54,54],remainingArc:252,answer:27,authorOnly:true},
  prerequisites:['중심각과 원주각의 관계','길이가 같은 호의 중심각','일차적인 각의 분할'],
 },{
  n:12,score:7,printed:'서술형2',unitId:'635abab8-4a87-452b-ad6c-d59065822f29',standard:'9수04-19',spec:triangleSpec,difficulty:'기본',
  content:String.raw`삼각형 $PQR$의 내접원이 세 변 $PQ$, $QR$, $RP$와 만나는 접점을 각각 $U$, $V$, $W$라 하자. $\overline{PU}=4\,\mathrm{cm}$, $\overline{PQ}=11\,\mathrm{cm}$, $\overline{QR}=16\,\mathrm{cm}$이다. 변 $PR$의 길이를 구하고 그 과정을 쓰시오.`,
  answer:String.raw`$13\,\mathrm{cm}$`,solution:String.raw`같은 점에서 원에 그은 두 접선의 길이는 같으므로 $PU=PW=4$이다. 또 $QU=QV$이므로 $QV=PQ-PU=11-4=7$이다.

$RV=RW$이므로 $RW=QR-QV=16-7=9$이다. 따라서 $PR=PW+WR=4+9=13\,\mathrm{cm}$이다. 각 분할 선분의 길이는 $4$, $7$, $9$로 모두 양수이며, 세 변 $11$, $16$, $13$도 삼각형의 성립 조건을 만족한다.`,
  before:'삼각형의 세 변을 주고 한 꼭짓점에서의 접선 부분 길이를 구한다.',after:'접선 부분 길이와 두 변을 주고 빠진 전체 변을 복원한다.',concept:'같은 점에서 그은 두 접선 길이와 변의 분할',procedure:'접선 길이를 세 꼭짓점에서 대응→부분 길이 덧셈·뺄셈의 연결',proof:'부분 접선4,7,9가 양수이고 세 변11,16,13이 삼각형부등식을 만족한다. 독립 저자 좌표 P(13/2,3√35/2),Q(0,0),R(16,0),O(7,3√35/5)와 정확한 접점의 거리·수직을 코드로 확인했다. 제곱근/좌표 계산은 작도 검사용이며 학생은 접선 길이 대응과 정수 덧셈·뺄셈만 쓴다.',sourceObservation:'OriginalH page3 written2: incircleABC touchesD/E/F, sidesAB9/BC14/CA11; askAD;7points.',authorCalculation:{tangentParts:[4,7,9],sides:[11,16,13],answer:13,coordinateChecks:12,authorOnly:true},
  prerequisites:['같은 점에서 원에 그은 접선의 길이','선분의 부분과 전체','양의 길이와 삼각형의 성립 조건'],
 }];
 for(const t of tasks){
  const name=`q${t.n}`,sourceQ=source.questions.find((x:{number:number})=>x.number===t.n),unit=snapshot.units.find((x:{id:string})=>x.id===t.unitId);assert(sourceQ&&unit);
  fs.writeFileSync(out+name+'.figure.spec.json',JSON.stringify(t.spec,null,2)+'\n',{flag:'wx'});const rendered=await renderFigureSpec(t.spec,{strict:true});assert(rendered.ok);if(!rendered.ok)throw Error('strict render failed');assert.equal(rendered.droppedDimensions?.length??0,0);fs.writeFileSync(out+name+'.figure.svg',rendered.svg,{flag:'wx'});
  const original=b+'next-five-extraction-r1/gyeongsin/evidence/additional-original-H-page-03.webp',component=out+name+'-source-component-observation-r1.json';fs.writeFileSync(component,JSON.stringify({utc:new Date().toISOString(),actuallyViewed:{path:original,sha256:sha256(fs.readFileSync(original))},physicalPdfPage:3,sourceSerial:t.n,printed:t.printed,observed:t.sourceObservation,wholePairIdentityApproved:false,rightsRestrictionObserved:true,rightsApproved:false,originalAnswerKeyUsed:false,originalCropEmbedded:false},null,2)+'\n',{flag:'wx'});
  const c=structuredClone(old);Object.assign(c,{questionNumber:t.n,twinExternalId:`exam-twin-gyeongsin-2025-2-mid-author-group10-r1-${name}`,questionType:'서술형',score:t.score,content:t.content,choices:[],answer:t.answer,solution:t.solution,figureArtifacts:[{role:'stem',specPath:name+'.figure.spec.json',svgPath:name+'.figure.svg',intendedWidthMm:70}]});
  c.sourceReference={...old.sourceReference,externalId:`2025-gyeongsin-3-2-mid-${t.n}`,newSourceReferenceId:`source-ref-gyeongsin-2025-2-mid-group10-r1-${name}`,sourceContentSha256:sourceQ.sourceContentDigest,componentObservation:{path:component,sha256:sha256(fs.readFileSync(component))},originalQuestionRender:{path:original,sha256:sha256(fs.readFileSync(original)),physicalPdfPage:3,printedQuestion:t.printed},actualReference:t.sourceObservation+' Component only; no wholepaper/pair/year/rights certification.'};
  c.variantDelta={modes:['inverse-target','structure','new-vector'],before:t.before,after:t.after,sharedConcept:t.concept,sharedProcedure:t.procedure,actualStructuralChange:t.after+' 입력과 질문 대상을 역전하고 점 위치·배치·표시를 새로 제작했다. 단순 숫자/학교명/동의어 교체로 완료하지 않는다.',domainProof:t.proof,difficultyBasis:'원문 배점과 같은 개념·핵심 관계를 유지한다. 직접 결과→누락 입력 복원의 역방향이며 새 선수 개념을 요구하지 않는다. 기본은 저자 제안으로 실제 난도 동등성은 별도 보류.'};
  c.curriculumReview={...old.curriculumReview,standardCodes:[t.standard],officialPrimary:{...old.curriculumReview.officialPrimary,standard:t.standard,actualScope:t.standard==='9수04-19'?'2015 chord and tangent properties; general circle proportionality excluded.':'2015 central-angle and inscribed-angle properties; general circle proportionality excluded.'},sevenSurfaces:Object.fromEntries(SURFACES.map((k:string)=>[k,'author-proposed-independent-review-pending'])),legitimateMethodDraft:t.procedure,independentReviewPending:true};
  c.metadata={...old.metadata,questionType:'서술형',answerFormat:'scalar-with-working',score:t.score,difficultyProposal:t.difficulty,problemTypeProposal:t.after,sourceDifficultyLabelObserved:sourceQ.difficultyLabelFromSource||null,assignment:{status:'pending',unitId:unit.id,familyKey:null,currentUnit:unit,snapshot:{path:snapshotPath,sha256:sha256(fs.readFileSync(snapshotPath))},evidence:'실제 단원 UUID를 연결했다. 질문 역전의 전체 평가 목적에 대응하는 정확한 live family는 별도 검수 전 null/보류다.'},prerequisiteUnits:[unit],placementConditions:{...old.metadata.placementConditions,requiresLearnedBeforeAssignment:t.prerequisites},figureAuthoring:{method:'existing-FigureSpec-v2-vector-engine-strict',newFigures:1,newTables:0,originalCropEmbedded:false,pixelOracle:false,coordinateConstruction:t.proof,reproductionScript:'.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/author-gyeongsin-written11-12-r1.ts',renderingReviewPending:true}};
  fs.writeFileSync(out+name+'.json',JSON.stringify(c,null,2)+'\n',{flag:'wx'});const bound=bindCandidate(out+name+'.json');assert.deepEqual(bound.validation.studentMathNotationWarnings,[]);assert.equal(bound.validation.metadataAnswerFormatMismatch,false);fs.writeFileSync(out+name+'-author-calculations-r1.json',JSON.stringify({...t.authorCalculation,utc:new Date().toISOString(),candidateFileSha256:bound.candidateFileSha256,studentDigest:bound.studentDigest,candidateDigest:bound.candidateDigest,assetDigest:bound.assetDigest,independentReview:false,newFigures:1,loadable:0,dbWrites:0},null,2)+'\n',{flag:'wx'});
 }
 console.log(JSON.stringify({authored:2,newFigures:2,independentReviewPending:true,currentCanonicalCountsUnchanged:true,loadable:0}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
