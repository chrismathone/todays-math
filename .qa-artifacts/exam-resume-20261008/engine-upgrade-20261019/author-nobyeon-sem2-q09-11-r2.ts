import fs from 'node:fs';
import assert from 'node:assert/strict';
import {renderFigureSpec} from '../../../src/lib/figure/renderFigureSpec';
import {bindCandidate,readJson,sha256,SURFACES} from '../../../scripts/import/exam-twin/candidatePack.mjs';
type Point=[number,number];
async function main(){
 const b='.qa-artifacts/exam-resume-20261008/',out=b+'nobyeon-sem2-authoring-group2-r2/',base=readJson(b+'gyeongsin-authoring-group9-r1/q10.json'),snapshotPath=b+'engine-upgrade-20261019/live-family-snapshot-r2.json',snapshot=readJson(snapshotPath);fs.mkdirSync(out);
 const rt=Math.sqrt(3),at=(x:number,y:number)=>[35+9*x,145-9*y];
 const spec9={version:2,style:{show_points:true},points:{P:at(6,6*rt),Q:at(15,0),R:at(0,0),H:at(6,0)},segments:{PQ:['P','Q'],PR:['P','R'],RQ:['R','Q'],PH:['P','H']},angles:{given:{vertex:'R',points:['P','Q'],label:'60°',radius:18,label_distance:32},right:{vertex:'H',points:['P','Q'],right:true,label:''}},labels:{P:'P',Q:'Q',R:'R',H:'H'}};
 assert.equal((3*Math.sqrt(21))**2-(6*rt)**2,81);assert.equal(6+Math.sqrt(81),15);
 const h=9*rt,view=(x:number,y:number)=>[180+9*x,180-9*y],spec10={version:2,style:{show_points:true},points:{P:view(-h,0),Q:view(-9,0),R:view(0,0),T:view(0,h)},segments:{PR:['P','R'],RT:['R','T'],PT:['P','T'],QT:['Q','T']},angles:{far:{vertex:'P',points:['R','T'],label:'45°',radius:18,label_distance:32},near:{vertex:'Q',points:['R','T'],label:'60°',radius:17,label_distance:31},right:{vertex:'R',points:['P','T'],right:true,label:''}},labels:{P:'P',Q:'Q',R:'R',T:'T'}};
 assert(Math.abs(h/rt-9)<1e-12);const data=[1,5,5,7,7,11],mean=data.reduce((a,z)=>a+z,0)/data.length,median=(data[2]+data[3])/2,ss=data.reduce((a,z)=>a+(z-mean)**2,0),variance=ss/data.length;assert.equal(mean,6);assert.equal(median,6);assert.equal(ss,54);assert.equal(variance,9);assert.equal(data.reduce((a,z)=>a+z-mean,0),0);assert.deepEqual(data.filter(x=>Math.abs(x-mean)===5),[1,11]);
 const tasks=[{
  n:9,score:5,spec:spec9,standards:['9수04-16','9수04-17','9수04-18'],
  content:String.raw`삼각형 $PQR$에서 $\overline{PR}=12\,\mathrm{cm}$, $\overline{PQ}=3\sqrt{21}\,\mathrm{cm}$, $\angle PRQ=60^\circ$이다. 점 $P$에서 변 $QR$에 내린 수선의 발 $H$가 선분 $QR$의 내부에 있을 때, $QR$의 길이는?`,
  choices:[13,14,15,16,17].map(x=>`$${x}\\,\\mathrm{cm}$`),answer:'③',
  solution:String.raw`직각삼각형 $PRH$에서 $PH=PR\sin60^\circ=12\times\frac{\sqrt3}{2}=6\sqrt3$, $RH=PR\cos60^\circ=12\times\frac12=6$이다.

직각삼각형 $PQH$에서 피타고라스 정리를 쓰면 $QH^2=PQ^2-PH^2=(3\sqrt{21})^2-(6\sqrt3)^2=189-108=81$이다. 길이는 양수이므로 $QH=9$이다. 점 $H$가 변 $QR$의 내부에 있으므로 $QR=QH+HR=9+6=15\,\mathrm{cm}$이다. 따라서 정답은 ③이다.`,
  before:'연못의 두 점 거리를 다른 두 변과 끼인각에서 계산한다.',after:'삼각형의 한 거리와 끼인각, 다른 거리를 주고 수선의 발을 포함한 밑변 전체를 역으로 복원한다.',concept:'실제 직각삼각형 두 개의 삼각비와 피타고라스',method:'수선으로 높이와 투영 길이→다른 직각삼각형의 양의 밑변→전체 밑변',proof:'PR12,PH6√3,RH6,PQ3√21,QH9,QR15. H가 QR 내부라는 새 조건으로 두 가능한 부호 중 더하는 구성을 유일하게 정한다. 세 변의 삼각형부등식 및 양수 선분을 만족한다. 코사인법칙/벡터/임의 삼각비 항등식은 학생 방법에 쓰지 않는다.',calc:{PR:12,PHsquared:108,RH:6,PQsquared:189,QH:9,QR:15},prerequisites:['예각의 삼각비 정의와60°값','수선과 직각삼각형','피타고라스','양의 제곱근과 선분의 합']
 },{
  n:10,score:5,spec:spec10,standards:['9수04-17','9수04-18'],
  content:String.raw`수평한 바닥에 수직으로 세운 기둥 $RT$의 높이는 $9\sqrt3\,\mathrm{m}$이다. 같은 직선 위에 $P,Q,R$이 이 순서로 있고, 두 점 $P$, $Q$에서 기둥의 꼭대기 $T$를 올려본 각은 각각 $45^\circ$, $60^\circ$이다. 두 관측점 $P$, $Q$ 사이의 거리는?`,
  choices:[String.raw`$3(\sqrt3-1)\,\mathrm{m}$`,String.raw`$9\,\mathrm{m}$`,String.raw`$9(\sqrt3-1)\,\mathrm{m}$`,String.raw`$9\sqrt3\,\mathrm{m}$`,String.raw`$9(\sqrt3+1)\,\mathrm{m}$`],answer:'③',
  solution:String.raw`직각삼각형 $PRT$에서 $\tan45^\circ=\frac{RT}{PR}=1$이므로 $PR=RT=9\sqrt3$이다.

직각삼각형 $QRT$에서 $\tan60^\circ=\frac{RT}{QR}=\sqrt3$이므로 $QR=\frac{9\sqrt3}{\sqrt3}=9$이다. 세 점의 순서가 $P,Q,R$이므로 $PQ=PR-QR=9\sqrt3-9=9(\sqrt3-1)\,\mathrm{m}$이다. 이 길이는 양수이고 정답은 ③이다.`,
  before:'관측점 사이 간격과 두 올려본 각을 주고 나무의 높이를 구한다.',after:'수직 기둥의 높이와 두 관측각을 주고 관측점 사이 간격을 역으로 구한다.',concept:'같은 실제 높이를 공유하는 두 직각삼각형의 탄젠트 정의',method:'45° 관측에서 먼 밑변→60° 관측에서 가까운 밑변→같은 쪽 점 순서에 따른 차',proof:'RT9√3,PR9√3,QR9,PQ9(√3-1)>0. 세 점의 순서를 명시해 높이의 양쪽 관측에 따른 합/차의 모호성을 제거한다. 각 실제 직각삼각형의 tan정의만 사용하며 임의 삼각비 사이 항등식은 요구하지 않는다.',calc:{heightSqrt3Coefficient:9,farGroundSqrt3Coefficient:9,nearGround:9,answerSqrt3Coefficient:9,answerIntegerPart:-9},prerequisites:['예각의 탄젠트 정의와45°/60°값','같은 직선의 점 순서','근호 나눗셈과 양의 길이']
 },{
  n:11,score:4,spec:null,standards:['9수05-06','9수05-07'],
  content:String.raw`자료 $1,5,5,7,7,11$의 평균은 $6$이다. 이 자료를 정리한 다음 기록표에서 잘못된 내용 한 곳을 바르게 고친 것은?

| 기록 | 항목 | 기록한 값 |
| --- | --- | --- |
| ㄱ | 중앙값 | $6$ |
| ㄴ | 최빈값 | $5$, $7$ |
| ㄷ | 편차의 총합 | $0$ |
| ㄹ | 분산 | $3$ |
| ㅁ | 평균에서 가장 멀리 떨어진 변량 | $1$, $11$ |`,
  choices:[String.raw`ㄱ의 $6$을 $5$로 고친다.`,String.raw`ㄴ의 $5$, $7$을 $6$으로 고친다.`,String.raw`ㄷ의 $0$을 $36$으로 고친다.`,String.raw`ㄹ의 $3$을 $9$로 고친다.`,String.raw`ㅁ의 $1$, $11$을 $5$, $7$로 고친다.`],answer:'④',
  solution:String.raw`자료가 작은 수부터 정리되어 있고 개수가 $6$이므로 중앙값은 가운데 두 값 $5$, $7$의 평균인 $6$이다. $5$, $7$은 각각 두 번씩 나타나므로 두 값이 모두 최빈값이다.

각 편차는 $-5,-1,-1,1,1,5$이고 그 합은 $0$이다. 편차의 제곱의 합은 $25+1+1+1+1+25=54$이므로 분산은 $54\div6=9$이다. 기록한 $3$은 표준편차 $\sqrt9=3$과 혼동한 값이다.

편차의 절댓값이 가장 큰 변량은 $1$, $11$이므로 다른 기록은 옳다. 따라서 ㄹ의 분산을 $9$로 고치는 ④가 정답이다.`,
  before:'대표값·편차·산포도에 관한 추상적인 다섯 주장의 옳고 그름을 고른다.',after:'실제 자료의 요약 기록표를 주고 다섯 정의를 적용하여 잘못된 기록 하나를 고친다.',concept:'중앙값, 여러 최빈값, 편차 총합, 편차제곱 평균인 분산, 평균과의 거리',method:'같은 자료에서 각 정의를 적용→분산과 표준편차 기록의 혼동 확인→다른 네 기록도 대조',proof:'자료합36,평균6,중앙값6(원자료에없음),최빈값5/7,편차합0,제곱합54/개수6=분산9,표준편차3,최대절대편차5인변량1/11. 원문의 다섯 개념을 실제 새 데이터/새 표의 교정 과제로 조직했다. 보기 수정은4번만 참이다.',calc:{data,mean,median,deviationSum:0,sumOfSquaredDeviations:ss,variance,standardDeviation:3,modes:[5,7],farthest:[1,11],choiceCorrectionsTrue:[false,false,false,true,false]},prerequisites:['중앙값과 최빈값','평균과 편차','분산과 표준편차의 뜻','절댓값과 평균으로부터 거리']
 }];
 for(const t of tasks){
  const name=`q${String(t.n).padStart(2,'0')}`,stagedPath=b+`next-three-source-review-r1/question-only-staged/nobyeon/${name}.json`,reviewPath=b+`next-three-source-review-r1/items/nobyeon/${name}.json`,src=readJson(stagedPath),review=readJson(reviewPath);assert.equal(review.sourceIdentity.printedYear,2025);assert.equal(review.sourceIdentity.printedGrade,3);assert(review.questionOnlyWhitelist.selected);assert.equal(review.curriculumCoreMethodProposal.status,'candidate');assert.deepEqual(review.questionOnlyWhitelist.blockers,[]);const unit=snapshot.units.find((u:{id:string})=>u.id===review.metadataProposal.unit.id);assert(unit);
  const component=out+name+'-source-component-observation-r1.json';const crop=t.n<11?b+`next-three-extraction-r1-attempt2/nobyeon/quarantined-question-crops/${name}-part1.png`:null;fs.writeFileSync(component,JSON.stringify({utc:new Date().toISOString(),stagedQuestion:{path:stagedPath,sha256:sha256(fs.readFileSync(stagedPath))},actuallyViewedLocalSourceFigure:crop?{path:crop,sha256:sha256(fs.readFileSync(crop))}:null,sourceStatus:'Source figure crop/completed question viewed for q9/10; printed original correspondence is separate prior independent source report, not claimed freshly viewed by parent. q11 full staged text read.',printedOriginalReview:{path:reviewPath,sha256:sha256(fs.readFileSync(reviewPath))},noOriginalAnswerKeyUsed:true,wholePairIdentityApproved:false,rightsApproved:false,originalCropEmbedded:false},null,2)+'\n',{flag:'wx'});
  if(t.spec){fs.writeFileSync(out+name+'.figure.spec.json',JSON.stringify(t.spec,null,2)+'\n',{flag:'wx'});const rendered=await renderFigureSpec(t.spec,{strict:true});assert(rendered.ok);if(!rendered.ok)throw Error('Strict render failed');assert.equal(rendered.droppedDimensions?.length??0,0);fs.writeFileSync(out+name+'.figure.svg',rendered.svg,{flag:'wx'});}
  const q=structuredClone(base);Object.assign(q,{questionNumber:t.n,twinExternalId:`exam-twin-nobyeon-2025-2-mid-author-group2-r2-${name}`,score:t.score,content:t.content,choices:t.choices,answer:t.answer,solution:t.solution,figureArtifacts:t.spec?[{role:'stem',specPath:name+'.figure.spec.json',svgPath:name+'.figure.svg',intendedWidthMm:70}]:[]});
  q.sourceReference={externalId:`2025-nobyeon-3-2-mid-${t.n}`,newSourceReferenceId:`source-ref-nobyeon-2025-2-mid-group2-r2-${name}`,sourceContentSha256:sha256(fs.readFileSync(stagedPath)),sourceSchoolInternal:review.sourceIdentity.printedSchool,sourceExamYear:2025,questionOnlyStaged:{path:stagedPath,sha256:sha256(fs.readFileSync(stagedPath))},sourceReviewReport:{path:reviewPath,sha256:sha256(fs.readFileSync(reviewPath))},sourceManifest:{path:review.bindings.manifest.path,sha256:review.bindings.manifest.sha256},sourceFiles:review.bindings.sourceInputs,componentObservation:{path:component,sha256:sha256(fs.readFileSync(component))},sourceIdentityAsProvided:'printed-identity-observed-not-whole-pair-certified',currentNFilesReRead:false,originalAnswerKeyUsed:false,sourceTextCopiedToCandidate:false};
  q.variantDelta={modes:t.n===11?['structure','new-data','new-table']:['inverse-target','structure','new-vector'],before:t.before,after:t.after,sharedConcept:t.concept,sharedProcedure:t.method,actualStructuralChange:t.after+' 조건 제시와 묻는 대상을 새로 조직했다. 새 발문/답/전체 해설/그림·표를 제작하며 숫자·학교명·동의어만 바꿨다는 이유로 완료하지 않는다.',domainProof:t.proof,difficultyBasis:'원문 배점과 같은 개념·핵심 원리를 유지한 기본 저자 제안이다. 실제 난도 동등성/출제시점 선수학습/2022적용은 별도 보류.'};
  q.curriculumReview={...base.curriculumReview,standardCodes:t.standards,officialPrimary:{...base.curriculumReview.officialPrimary,standard:t.standards.join(', '),actualScope:'2015 M3 actual right-triangle ratio definitions/Pythagoras or representative values/dispersion as required; no arbitrary trig identities. Independent seven-surface and whole-method placement required.'},legitimateMethodDraft:t.method,sevenSurfaces:Object.fromEntries(SURFACES.map((k:string)=>[k,'author-proposed-independent-review-pending'])),independentReviewPending:true};
  q.metadata={...base.metadata,score:t.score,difficultyProposal:'기본',sourceDifficultyLabelObserved:review.metadataProposal.sourceDifficultyLabel??null,sourceDifficultyStatus:'prior-preparation-label-not-measured-target-calibration',problemTypeProposal:t.after,assignment:{status:'pending',unitId:unit.id,familyKey:null,currentUnit:unit,snapshot:{path:snapshotPath,sha256:sha256(fs.readFileSync(snapshotPath))},evidence:'실제 단원 UUID 재대응, 새 역추론/기록 교정의 정확한 live family는 별도 검수 전 null/보류.'},prerequisiteUnits:[unit],placementConditions:{...base.metadata.placementConditions,requiresLearnedBeforeAssignment:t.prerequisites},figureAuthoring:{method:t.spec?'existing-FigureSpec-v2-vector-engine-strict':'new-native-Markdown-table',newFigures:t.spec?1:0,newTables:t.spec?0:1,originalCropEmbedded:false,pixelOracle:false,coordinateConstruction:t.proof,reproductionScript:'.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/author-nobyeon-sem2-q09-11-r2.ts',renderingReviewPending:true}};
  fs.writeFileSync(out+name+'.json',JSON.stringify(q,null,2)+'\n',{flag:'wx'});const x=bindCandidate(out+name+'.json');assert.deepEqual(x.validation.studentMathNotationWarnings,[]);assert.equal(x.validation.metadataAnswerFormatMismatch,false);fs.writeFileSync(out+name+'-author-calculations-r1.json',JSON.stringify({...t.calc,utc:new Date().toISOString(),candidateFileSha256:x.candidateFileSha256,studentDigest:x.studentDigest,candidateDigest:x.candidateDigest,assetDigest:x.assetDigest,authorOnly:true,independentReview:false,loadable:0,dbWrites:0},null,2)+'\n',{flag:'wx'});
 }
 console.log(JSON.stringify({authored:3,newFigures:2,newTables:1,independentReviewPending:true,canonicalCountsUnchanged:true,loadable:0}));
}
main().catch(err=>{console.error(err);process.exitCode=1;});
