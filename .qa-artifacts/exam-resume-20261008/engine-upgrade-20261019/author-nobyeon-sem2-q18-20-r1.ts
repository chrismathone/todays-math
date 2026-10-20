import fs from 'node:fs';
import assert from 'node:assert/strict';
import {renderFigureSpec} from '../../../src/lib/figure/renderFigureSpec';
import {bindCandidate,readJson,sha256,SURFACES} from '../../../scripts/import/exam-twin/candidatePack.mjs';
import {constantValue} from '../../../scripts/import/exam-twin/constantAnswers.mjs';
async function main(){
 const b='.qa-artifacts/exam-resume-20261008/',out=b+'nobyeon-sem2-authoring-group4-r1/',script=b+'engine-upgrade-20261019/author-nobyeon-sem2-q18-20-r1.ts',base=readJson(b+'gyeongsin-authoring-group11-r1/q16.json'),snapshotPath=b+'engine-upgrade-20261019/live-family-snapshot-r2.json',snapshot=readJson(snapshotPath);
 const h=68.4,rad=20*Math.PI/180,run=h/Math.tan(rad),scale=1.15,at=(x:number,y:number)=>[30+scale*x,130-scale*y];
 const spec={version:2,style:{show_points:true},points:{P:at(0,0),Q:at(run,h),R:at(run,0)},segments:{PQ:['P','Q'],PR:['P','R'],RQ:['R','Q']},angles:{slope:{vertex:'P',points:['R','Q'],label:'20°',radius:24,label_distance:38},right:{vertex:'R',points:['P','Q'],right:true,label:''}},labels:{P:'P',Q:'Q',R:'R'}};
 assert.equal(684000/3420,200);assert.equal(Math.round(h/Math.sin(rad)*10)/10,200);
 // Four-decimal supplied sine, including its rounding interval, keeps the
 // requested one-decimal length unchanged. Integer comparisons, not pixels.
 assert(1368000n*100n>19995n*6841n);assert(1368000n*100n<20005n*6839n);
 assert.deepEqual(constantValue(String.raw`(\sqrt2-1)*(\sqrt2+1)/2`),constantValue('1/2'));
 const data=[42,36,39,40,43],mean=data.reduce((s,x)=>s+x,0)/5,dev=data.map(x=>x-mean);assert.equal(mean,40);assert.deepEqual(dev,[2,-4,-1,0,3]);assert.equal(dev.reduce((s,x)=>s+x*x,0),30);
 const tasks=[{
  n:18,score:4,spec,format:'scalar-with-working',
  content:String.raw`그림과 같이 수평면과 $20^\circ$를 이루는 곧은 경사로 $PQ$가 있다. 점 $Q$에서 수평면에 내린 수선의 발을 $R$이라 할 때, 높이 $QR$는 $68.4\,\mathrm{m}$이다. 표에 주어진 삼각비의 근삿값을 사용하여 경사로 $PQ$의 길이를 소수 첫째 자리까지 구하고, 그 과정을 서술하시오.

| 삼각비 | $\sin20^\circ$ | $\cos20^\circ$ | $\tan20^\circ$ |
| --- | --- | --- | --- |
| 근삿값 | $0.3420$ | $0.9397$ | $0.3640$ |`,
  answer:String.raw`$200.0\,\mathrm{m}$`,
  solution:String.raw`직각삼각형 $PQR$에서 $20^\circ$의 맞은편 변은 $QR$, 빗변은 $PQ$이다. 따라서 $\sin20^\circ=\frac{QR}{PQ}$이다.

주어진 근삿값을 사용하면 $0.3420\simeq\frac{68.4}{PQ}$이므로 $PQ\simeq68.4\div0.3420=200$이다. 길이를 소수 첫째 자리까지 나타내면 약 $200.0\,\mathrm{m}$이다. 다른 두 삼각비의 값이나 $20^\circ$의 삼각비를 유도하는 공식은 필요하지 않다.`,
  before:'비탈길의 길이와 제공된 삼각비에서 수직 높이를 계산한다.',after:'수직 높이를 주고 경사로의 빗변 길이를 역으로 구한다. 제공 근삿값과 요구 자릿수를 명시한다.',concept:'직각삼각형에서 사인의 정의와 길이',method:'실제 맞은편 변/빗변 확인→사인 비례식→양수로 나누어 빗변 복원→주어진 자릿수 반올림',proof:'h68.4>0,sin20근삿값.3420>0이므로 빗변은 유일하다. 정확한 소수 나눗셈은200이다. 사인 소수넷째자리의 반올림 구간[.34195,.34205]에서도 실제 길이는199.95초과200.05미만이어서 소수첫째자리200.0이 유지된다. 그림 좌표는 실제20도와 높이로만 만들고 정답 계산 oracle로 쓰지 않았다.',calc:{height:68.4,suppliedSine:'0.3420',approximateLength:'200.0',sineRoundingInterval:['0.34195','0.34205'],oneDecimalAnswerStableAcrossInterval:true,drawingAngleDegrees:20,drawingHeight:68.4},prerequisites:['직각삼각형의 사인 정의','비례식과 소수의 나눗셈','근삿값과 반올림']
 },{
  n:19,score:5,format:'record-label-and-scalar-with-working',recordSchema:{version:1,kind:'record-correction-and-total',recordLabels:['ㄱ','ㄴ','ㄷ'],correctedExpression:'B',totalExpression:'E'},
  content:String.raw`$A=2\sin30^\circ\cos60^\circ$, $B=\cos45^\circ+\tan30^\circ\cos30^\circ$, $E=\frac{A}{B}$이다. 다음 계산 기록에서 값이 잘못 적힌 것은 한 개이다.

| 기록 | 계산한 값 |
| --- | --- |
| ㄱ | $A=\frac12$ |
| ㄴ | $B=\sqrt2+1$ |
| ㄷ | $\tan45^\circ=1$ |

잘못된 기록의 기호와 그 기록의 바른 값을 쓰고, $E$의 값을 분모가 유리수인 꼴로 구하시오. 답은 기호, 바른 $B$의 값, $E$의 값 순서로 쓰고 그 과정을 서술하시오.`,
  answer:String.raw`ㄴ; $B=\frac{\sqrt2+1}{2}$; $E=\sqrt2-1$`,
  solution:String.raw`$\sin30^\circ=\frac12$, $\cos60^\circ=\frac12$이므로 $A=2\times\frac12\times\frac12=\frac12$이다. 따라서 ㄱ은 옳다. $\tan45^\circ=1$이므로 ㄷ도 옳다.

$\cos45^\circ=\frac{\sqrt2}{2}$, $\tan30^\circ=\frac{\sqrt3}{3}$, $\cos30^\circ=\frac{\sqrt3}{2}$이므로 $B=\frac{\sqrt2}{2}+\frac{\sqrt3}{3}\times\frac{\sqrt3}{2}=\frac{\sqrt2+1}{2}$이다. 잘못된 기록은 ㄴ이다.

$B>0$이므로 $E=\frac{1/2}{(\sqrt2+1)/2}=\frac1{\sqrt2+1}$이다. 분모와 분자에 $\sqrt2-1$을 곱하면 $E=\frac{\sqrt2-1}{2-1}=\sqrt2-1$이다. 따라서 기호는 ㄴ, 바른 값은 $B=\frac{\sqrt2+1}{2}$, $E=\sqrt2-1$이다.`,
  before:'특수각의 삼각비를 대입하여 하나의 근호 분수를 직접 계산한다.',after:'분자/분모의 계산 기록을 비교하여 오류를 교정한 뒤 바른 두 값에서 전체 분수를 구한다.',concept:'특수각 삼각비의 개별 값과 근호의 계산·분모 유리화',method:'30/45/60도 값을 개별 대입→분모의 합과1/2인수 유지→오류 기록 결정→양수 분모를 확인하고 켤레식으로 유리화',proof:'A1/2,B(√2+1)/2>0,tan45=1이므로 틀린 기록은ㄴ하나다. E√2−1에 실제B를 곱하면 정확히1/2로 검산된다. 임의각 항등식/덧셈정리/상위학년 공식을 쓰지 않는다.',calc:{numerator:'1/2',denominator:'(sqrt2+1)/2',wrongRecord:'ㄴ',total:'sqrt2-1',exactCrossMultiplicationVerified:true},prerequisites:['30/45/60도의 삼각비','근호의 사칙계산','곱셈 공식과 분모의 유리화']
 },{
  n:20,score:5,format:'numbered-named-scalars-with-working',
  content:String.raw`다음은 다섯 자료와 각각의 편차를 나타낸 표이다. 이 자료의 평균을 $M$이라 하고 $a<b$이다. 표준편차가 $\sqrt6$일 때, 다음을 구하고 그 과정을 서술하시오.

| 자료 | $42$ | $36$ | $39$ | $a$ | $b$ |
| --- | --- | --- | --- | --- | --- |
| 편차 | $2$ | $-4$ | $-1$ | $a-M$ | $b-M$ |

(1) 평균 $M$

(2) 두 자료 $a$, $b$`,
  answer:String.raw`(1) $M=40$ (2) $a=40$, $b=43$`,
  solution:String.raw`(1) 편차는 자료에서 평균을 뺀 값이므로 $42-M=2$에서 $M=40$이다. $36-40=-4$, $39-40=-1$도 표와 맞는다.

(2) $a-40=x$, $b-40=y$라 하면 $a<b$이므로 $x<y$이다. 편차의 합은 $0$이므로 $2-4-1+x+y=0$, 즉 $x+y=3$이다.

표준편차가 $\sqrt6$이므로 분산은 $6$이다. 따라서 $\frac{2^2+(-4)^2+(-1)^2+x^2+y^2}{5}=6$에서 $x^2+y^2=9$이다. 한편 $(x+y)^2=x^2+2xy+y^2$이므로 $9=9+2xy$, 즉 $xy=0$이다.

곱이 $0$이므로 $x$, $y$ 중 하나는 $0$이고, 합이 $3$이며 $x<y$이므로 $x=0$, $y=3$이다. 따라서 $a=40$, $b=43$이다. 실제 자료의 합은 $200$, 편차 제곱의 합은 $30$이므로 평균 $40$과 표준편차 $\sqrt6$을 모두 만족한다.`,
  before:'맥박수·편차 표의 빈칸을 채운 다음 표준편차를 구한다.',after:'새 자료·편차 표에 표준편차를 조건으로 주고 순서 조건과 함께 두 미지 자료를 역추론한다.',concept:'평균·편차의 합·편차 제곱의 평균과 표준편차',method:'편차 정의로 평균 복원→편차합으로 두 편차의 합→표준편차로 제곱합→곱셈공식과 곱이0인 조건→순서에 맞는 두 자료 결정',proof:'M40에서 미지 편차 x+y3,제곱합9이므로 xy0, x<y에 의해(0,3)유일하다. 표준편차 조건을 제거하면 두 미지 자료는 유일하지 않으므로 실제 필수 입력이다. 방정식의 고차 해법/상위 통계 도구는 필요하지 않다. 전개·인수와 곱이0인 성질은 학년내 선수학습 후 조건이며 전체 난도 동등성은 별도 검수한다.',calc:{data,mean,deviations:dev,variance:6,standardDeviation:'sqrt6',sumUnknownDeviations:3,sumUnknownSquares:9,unknownProduct:0,orderedUnknowns:[40,43],uniqueOrderedSolution:true},prerequisites:['평균과 편차의 정의','편차의 합은0','분산과 표준편차','곱셈 공식과 곱이0인 성질']
 }];
 fs.mkdirSync(out);
 for(const t of tasks){
  const name=`q${t.n}`,stagedPath=b+`next-three-source-review-r1/question-only-staged/nobyeon/${name}.json`,reviewPath=b+`next-three-source-review-r1/items/nobyeon/${name}.json`,src=readJson(stagedPath),review=readJson(reviewPath);assert.equal(review.sourceIdentity.printedYear,2025);assert.equal(review.sourceIdentity.printedGrade,3);assert.equal(review.curriculumCoreMethodProposal.status,'candidate');assert.deepEqual(review.questionOnlyWhitelist.blockers,[]);assert.equal(src.score.parentScore,t.score);const unit=snapshot.units.find((u:{id:string})=>u.id===review.metadataProposal.unit.id);assert(unit);
  const component=out+name+'-source-component-observation-r1.json',crop=t.n===18?b+'next-three-extraction-r1-attempt2/nobyeon/quarantined-question-crops/q18-part1.png':null;fs.writeFileSync(component,JSON.stringify({utc:new Date().toISOString(),stagedQuestionActuallyRead:{path:stagedPath,sha256:sha256(fs.readFileSync(stagedPath))},printedOriginalReview:{path:reviewPath,sha256:sha256(fs.readFileSync(reviewPath))},actuallyViewedLocalSourceFigure:crop?{path:crop,sha256:sha256(fs.readFileSync(crop))}:null,sourceBitmapNotReused:true,originalAnswerKeyUsed:false,wholePairIdentityApproved:false,rightsApproved:false},null,2)+'\n',{flag:'wx'});
  if(t.spec){fs.writeFileSync(out+name+'.figure.spec.json',JSON.stringify(t.spec,null,2)+'\n',{flag:'wx'});const r=await renderFigureSpec(t.spec,{strict:true});assert(r.ok);if(!r.ok)throw Error('Strict rendering failed');assert.equal(r.droppedDimensions?.length??0,0);fs.writeFileSync(out+name+'.figure.svg',r.svg,{flag:'wx'});}
  const q=structuredClone(base);Object.assign(q,{questionNumber:t.n,twinExternalId:`exam-twin-nobyeon-2025-2-mid-author-group4-r1-${name}`,score:t.score,questionType:'서술형',content:t.content,choices:[],answer:t.answer,solution:t.solution,figureArtifacts:t.spec?[{role:'stem',specPath:name+'.figure.spec.json',svgPath:name+'.figure.svg',intendedWidthMm:72}]:[]});
  q.sourceReference={externalId:`2025-nobyeon-3-2-mid-${t.n}`,newSourceReferenceId:`source-ref-nobyeon-2025-2-mid-group4-r1-${name}`,sourceContentSha256:sha256(fs.readFileSync(stagedPath)),sourceSchoolInternal:review.sourceIdentity.printedSchool,sourceExamYear:2025,questionOnlyStaged:{path:stagedPath,sha256:sha256(fs.readFileSync(stagedPath))},sourceReviewReport:{path:reviewPath,sha256:sha256(fs.readFileSync(reviewPath))},sourceManifest:review.bindings.manifest,sourceFiles:review.bindings.sourceInputs,componentObservation:{path:component,sha256:sha256(fs.readFileSync(component))},sourceIdentityAsProvided:'printed-identity-observed-not-whole-pair-certified',currentNFilesReRead:false,originalAnswerKeyUsed:false,sourceTextCopiedToCandidate:false};
  q.variantDelta={modes:['inverse-target','structure','new-table',...(t.spec?['new-vector']:['new-data'])],before:t.before,after:t.after,sharedConcept:t.concept,sharedProcedure:t.method,actualStructuralChange:t.after+' 발문·조건·자료를 실제로 재구성했다. 단순 숫자·이름 치환만으로 완료하지 않는다.',domainProof:t.proof,difficultyBasis:'같은 개념/핵심 관계와 원문 배점의 저자 제안이다. 실제 난도 동등성/학교 진도/2022 적용/정확한 family는 별도 보류.'};
  q.curriculumReview={...base.curriculumReview,standardCodes:review.curriculumCoreMethodProposal.standardCodes,officialPrimary:{...base.curriculumReview.officialPrimary,standard:review.curriculumCoreMethodProposal.standardCodes.join(', '),actualScope:'2015 M3 supplied right-triangle ratios/special angle values, or mean/deviation/standard-deviation definitions with previously learned elementary polynomial multiplication. No arbitrary-angle identities/higher statistics. All seven surfaces independently pending.'},legitimateMethodDraft:t.method,sevenSurfaces:Object.fromEntries(SURFACES.map(k=>[k,'author-proposed-independent-review-pending'])),independentReviewPending:true};
  q.metadata={...base.metadata,questionType:'서술형',answerFormat:t.format,score:t.score,difficultyProposal:'기본~응용 제안',difficultyStatus:'author-proposed-independent-calibration-pending',sourceDifficultyLabelObserved:review.metadataProposal.sourceDifficultyLabel??null,problemTypeProposal:t.after,assignment:{status:'pending',unitId:unit.id,familyKey:null,currentUnit:unit,snapshot:{path:snapshotPath,sha256:sha256(fs.readFileSync(snapshotPath))},evidence:'실제 Unit UUID 연결, 새 필수 풀이 목적의 정확한 live family는 null/보류.'},prerequisiteUnits:[unit],placementConditions:{...base.metadata.placementConditions,requiresLearnedBeforeAssignment:t.prerequisites},figureAuthoring:{method:t.spec?'existing-FigureSpec-v2-vector-engine-strict-and-new-table':'new-native-Markdown-table',newFigures:t.spec?1:0,newTables:1,originalCropEmbedded:false,pixelOracle:false,coordinateConstruction:t.proof,reproductionScript:script,renderingReviewPending:true}};
  delete q.metadata.recordCorrectionAnswerSchema;if(t.recordSchema)q.metadata.recordCorrectionAnswerSchema=t.recordSchema;
  fs.writeFileSync(out+name+'.json',JSON.stringify(q,null,2)+'\n',{flag:'wx'});const x=bindCandidate(out+name+'.json');assert.deepEqual(x.validation.studentMathNotationWarnings,[]);assert.equal(x.validation.metadataAnswerFormatMismatch,false);fs.writeFileSync(out+name+'-author-calculations-r1.json',JSON.stringify({...t.calc,utc:new Date().toISOString(),candidateFileSha256:x.candidateFileSha256,candidateDigest:x.candidateDigest,studentDigest:x.studentDigest,assetDigest:x.assetDigest,authorOnly:true,independentReview:false,loadable:0,dbWrites:0},null,2)+'\n',{flag:'wx'});
 }
 console.log(JSON.stringify({authored:3,newFigures:1,newTables:3,canonicalSelectedUnchanged:151,independentReviewPending:true,loadable:0}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
