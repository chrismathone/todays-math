import fs from 'node:fs';
import assert from 'node:assert/strict';
import {renderFigureSpec} from '../../../src/lib/figure/renderFigureSpec';
import {bindCandidate,readJson,sha256,SURFACES} from '../../../scripts/import/exam-twin/candidatePack.mjs';
async function main(){
const b='.qa-artifacts/exam-resume-20261008/',e=b+'engine-upgrade-20261019/',out=b+'gachang-first2-authoring-20261020-r1/',job='personal-273b85b46b6ea294fef26b4de34becfc',script=e+'author-gachang-first2-20261020-r1.ts',ref=(p:string)=>({path:p,sha256:sha256(fs.readFileSync(p))}),manifestPath=b+`unpaired-hwp-first2-extraction-20261020-r1/${job}/hwp-question-only-manifest.local.json`,source=readJson(manifestPath),sourceAggregate=b+'unpaired-hwp-first2-extraction-20261020-r1/aggregate-receipt.json',pdfAggregate=b+'unpaired-pdf-preflight-20261020-r1/aggregate-receipt.json',pdf=readJson(pdfAggregate).entries.find((x:any)=>x.examId===job),snapshotPath=e+'live-family-snapshot-r2.json',snapshot=readJson(snapshotPath),base=readJson(b+'fresh-root-next4-authoring-20261020-r1/daeguil/q01.json');
assert.equal(source.inventoryAsProvided.year,2025);assert.equal(source.inventoryAsProvided.grade,3);assert.equal(source.inventoryAsProvided.semester,1);assert.equal(source.inventoryAsProvided.selectedPairStillNone,true);assert.equal(source.originalAnswerNotesExported,false);assert.equal(source.questions.length,19);
const squareSpec={version:'graph-1',xRange:[-4,12],yRange:[-2,12],width:380,height:340,axes:false,polygons:[{points:[[0,0],[10,0],[10,10],[0,10]],fill:'#dddddd'},{points:[[0,0],[7,0],[7,7],[0,7]],fill:'#ffffff'}],labels:[{at:[-1.8,5],text:String.raw`$a\,\mathrm{cm}$`,size:20},{at:[3.5,8.5],text:String.raw`$3\,\mathrm{cm}$`,size:18},{at:[8.5,3.5],text:String.raw`$3\,\mathrm{cm}$`,size:18},{at:[3.5,3.5],text:'남은 부분',size:18}]};
const squareCases=[];for(let a=4;a<=20;a++){assert.equal((3-a)**2,a*a-6*a+9);assert.equal((a-3)**2,(3-a)**2);squareCases.push({a,positiveSide:a-3,area:(a-3)**2,coefficient:-6});}
// (u+v sqrt3)(x+y sqrt3), in exact integer coefficient pairs.
const mul=(a:number[],c:number[])=>[a[0]*c[0]+3*a[1]*c[1],a[0]*c[1]+a[1]*c[0]];assert.deepEqual(mul([2,1],[2,-1]),[1,0]);const rationalizationCases=[];for(let k=-10;k<=10;k++){const p=mul([k,1],[2,-1]),q=mul([k,-1],[2,1]);assert.equal(p[0],2*k-3);assert.equal(q[0],2*k-3);assert.equal(p[1]+q[1],0);rationalizationCases.push({k,p,q,mean:2*k-3});}assert.equal(2*5-3,7);
const tasks=[{
 n:1,score:3,unit:'e63d61c6-2b41-4c83-a74b-a605fd343c42',codes:['9수02-12'],spec:squareSpec,tables:0,
 content:String.raw`한 변의 길이가 $a\,\mathrm{cm}$인 정사각형에서 그림과 같이 위쪽과 오른쪽의 폭이 각각 $3\,\mathrm{cm}$인 띠 모양 부분을 잘라 냈다. 남은 정사각형의 넓이를 $(3-a)^2\,\mathrm{cm}^{2}=(a^2+ka+9)\,\mathrm{cm}^{2}$로 나타낼 때, 상수 $k$의 값은? (단, $a>3$이다.)`,
 choices:[-9,-6,-3,3,6].map(x=>`$${x}$`),answer:'②',
 solution:String.raw`남은 정사각형의 한 변의 길이는 $(a-3)\,\mathrm{cm}$이고 $a>3$이므로 양수이다. 넓이는 $(a-3)^2\,\mathrm{cm}^{2}$이다.

$3-a=-(a-3)$이므로 $(3-a)^2=(a-3)^2$이다. 괄호 안 전체의 부호가 반대여도 제곱한 값은 같다.

전개하면 $(3-a)^2=9-6a+a^2=a^2-6a+9$이다. 이것을 $a^2+ka+9$와 비교하면 $k=-6$이다. 정답은 ②이다.`,
 before:'차의 제곱과 부호/순서를 바꾼 여섯 표현의 전개식이 같은지 구별하여 개수를 센다.',after:'차의 제곱을 잘라 낸 뒤 남는 정사각형 넓이로 표현하고, 순서가 반대인 차의 제곱을 전개해 미지 계수를 역으로 결정한다.',concept:'차의 제곱 전개와 괄호 안 전체 부호 반전의 제곱값 불변',method:'a>3인 남은 길이a−3 → 반대 부호 차3−a의 제곱도 같은 넓이 → 곱셈공식 전개 → a의 계수−6 결정',proof:'a>3으로 실제 길이와 넓이가 양수이다. (3−a)²=(a−3)²=a²−6a+9이며 a≠0이므로 주어진 넓이 식의 k는−6으로 유일하다. 바깥에 음수를 붙인 넓이와 혼동하지 않는다. 도형 좌표10/7은 양수인 한 예를 그리기 위한 내부 작도값이고 a를10으로 정하는 문제 조건이 아니다. 학생은 픽셀·좌표가 아닌 발문 조건과 항등적 전개를 사용한다.',prerequisites:['다항식의 곱셈과 차의 제곱 공식','반대 부호인 두 수의 제곱','상수항과 계수','정사각형 넓이','양수 길이와 cm/cm²'],calc:{symbolicSquareCoefficients:[1,-6,9],witnessCases:squareCases,uniqueCoefficient:-6,coordinateWitnessNotStudentGiven:10,correctChoices:[false,true,false,false,false]}
},{
 n:2,score:4,unit:'99ca37c0-1df4-40b1-bd25-c2b0bbd7fcf1',codes:['9수01-10'],tables:1,
 content:String.raw`유리수 $k$에 대하여 두 수 P, Q를 다음 표와 같이 정했다. P와 Q의 평균이 $7$일 때, $k$의 값은?

| 수 | 값 |
| --- | --- |
| P | $\dfrac{k+\sqrt3}{2+\sqrt3}$ |
| Q | $\dfrac{k-\sqrt3}{2-\sqrt3}$ |`,
 choices:[-2,2,3,5,7].map(x=>`$${x}$`),answer:'④',
 solution:String.raw`$(2+\sqrt3)(2-\sqrt3)=4-3=1$이므로 두 분모는 모두 $0$이 아니다. 분모를 유리화하면

P의 값은 $(k+\sqrt3)(2-\sqrt3)=(2k-3)+(2-k)\sqrt3$이고,

Q의 값은 $(k-\sqrt3)(2+\sqrt3)=(2k-3)+(k-2)\sqrt3$이다.

두 수를 더하면 근호가 있는 항이 없어져 P와 Q의 합은 $4k-6$이다. 따라서 평균은 $(4k-6)\div2=2k-3$이다.

평균이 $7$이므로 $2k-3=7$에서 $k=5$이다. $k=5$를 대입하면 P와 Q는 각각 $7-3\sqrt3$, $7+3\sqrt3$이고 평균이 $7$이 된다. $k=5$는 유리수이며 이를 만족하는 값은 하나뿐이다. 정답은 ④이다.`,
 before:'근호가 있는 두 분수를 유리화하여 합의 유리수/근호 계수를 구하고 계수의 차를 직접 계산한다.',after:'두 분수의 분자에 같은 유리수 미지수를 넣은 표를 주고 두 값의 평균 조건에서 분자의 입력을 역추론한다.',concept:'서로 반대 부호 근호를 이용한 분모 유리화와 동류 근호항 정리',method:'두 분모의 곱1 확인 → 각각 유리화 → 두 근호항의 상쇄로 평균2k−3 구함 → 평균조건7에서k5 → 원래 두 값으로 대입 확인',proof:'두 분모의 곱1이어서 항상 정의된다. 모든 유리수k에 대해 합이4k−6이고 평균이2k−3이므로 k5가 유일하며 원식 대입으로 존재를 확인한다. 일반 무리방정식의 제곱 풀이·유리수와 무리수의 계수 비교 증명·고등 함수가 필요하지 않다. 평균은 초등 선수 개념이다. 원문 답은 승인 기준으로 사용하지 않는다.',prerequisites:['근호를 포함한 식의 곱셈과 나눗셈','합과 차의 곱 공식','분모 유리화','동류 근호항의 덧셈','평균의 뜻','일차방정식'],calc:{denominatorProduct:[1,0],exactIntegerCoefficientCases:rationalizationCases,uniqueInput:5,substitutedP:[7,-3],substitutedQ:[7,3],mean:7,correctChoices:[false,false,false,true,false]}
}];
fs.mkdirSync(out);const folder=out+'gachang/';fs.mkdirSync(folder);const componentRoot=b+`unpaired-hwp-first2-extraction-20261020-r1/${job}/component-only-input/`;fs.mkdirSync(componentRoot);
for(const t of tasks){const name=`q${String(t.n).padStart(2,'0')}`,s=source.questions.find((x:any)=>x.number===t.n),unit=snapshot.units.find((x:any)=>x.id===t.unit);assert(s&&unit);assert(s.printedScoreOccurrences.some((x:any)=>x.value===t.score));const local=componentRoot+name+'.local.json';fs.writeFileSync(local,JSON.stringify(s,null,2)+'\n',{flag:'wx'});
 if(t.spec){fs.writeFileSync(folder+name+'.figure.spec.json',JSON.stringify(t.spec,null,2)+'\n',{flag:'wx'});const r=await renderFigureSpec(t.spec,{strict:true});assert(r.ok);assert.equal(r.droppedDimensions?.length??0,0);fs.writeFileSync(folder+name+'.figure.svg',r.svg,{flag:'wx'});}
 const q=structuredClone(base);Object.assign(q,{questionNumber:t.n,twinExternalId:`exam-twin-gachang-2025-1-final-author-group1-r1-${name}`,score:t.score,content:t.content,choices:t.choices,answer:t.answer,solution:t.solution,figureArtifacts:t.spec?[{role:'stem',specPath:name+'.figure.spec.json',svgPath:name+'.figure.svg',intendedWidthMm:70}]:[]});
 q.sourceReference={externalId:`2025-gachang-3-1-final-${t.n}`,inventoryExamId:job,sourceQuestionNumber:t.n,newSourceReferenceId:`source-ref-gachang-2025-1-final-group1-r1-${name}`,sourceContentSha256:s.sourceContentDigest,questionOnlyStaged:ref(local),sourceSchoolInternal:source.inventoryAsProvided.school,sourceExamYear:2025,sourceExamSemester:1,sourceExamRound:source.inventoryAsProvided.round,extractionManifest:ref(manifestPath),hwpOnlyExtractionAggregate:ref(sourceAggregate),sourceFiles:[source.source,pdf.references[0].input],originalIdentityReference:pdf.references[0].input,parentOriginalFirstPageObservation:ref(e+'unpaired-first2-parent-page-observations-r1.json'),sourceComponentReview:{status:'parent-first-page-q01-q02-observed-against-HWP-only-normalization-independent-source-review-pending',whole19ParentHwpPdfPairApproved:false,partialPdfParserHeld:true},sourceIdentityApproved:false,rightsApproved:false,originalAnswerKeyUsed:false,parentIncidentalHandwrittenMarksExposure:true,marksUsedForAnswerApproval:false,sourceTextCopiedToCandidate:false,currentDbSourceDuplicateCheck:'pending-no-operational-write'};
 q.variantDelta={modes:t.spec?['algebra-to-geometry','inverse-target','structure','new-vector']:['inverse-target','data-reorganization','structure','new-table'],before:t.before,after:t.after,sharedConcept:t.concept,sharedProcedure:t.method,actualStructuralChange:t.after,domainProof:t.proof,difficultyBasis:'인쇄 배점3/4를 근거로 목표 난도를 제안하되 원문의 부수 절차 전부를 복제하지 않는다. 새 표현·역추론의 실제 난도와 정확한 family는 독립 검수 전 보류.'};
 q.curriculumReview={...base.curriculumReview,sourceExamYear:2025,targetAcademicYear:2026,curriculum:'2015',grade:'중3',standardCodes:t.codes,officialPrimary:{url:'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=60747&lev=0&m=040401&opType=N&page=1&s=moe',standard:t.codes.join(', '),providedMOEEvidence:ref(b+'curriculum-evidence.json'),actualScope:'2015중3 1학기 근호 계산/다항식 곱셈 및 이미 배운 평균·일차 관계·정사각형 넓이. 학년군 성취기준은 중3 실제 Unit/선수 조건과 함께 검토한다. 2027중3/2022 자동 전용 금지.'},legitimateMethodDraft:t.method,sevenSurfaces:Object.fromEntries(SURFACES.map(k=>[k,'author-proposed-independent-review-pending'])),independentReviewPending:true};
 q.metadata={...base.metadata,sourceExamYear:2025,sourceExamSemester:1,sourceExamRound:'기말',score:t.score,sourceDifficultyLabelObserved:s.difficultyLabelFromSource??null,problemTypeProposal:t.after,assignment:{status:'pending',unitId:unit.id,familyKey:null,currentUnit:unit,snapshot:ref(snapshotPath),evidence:'캡처된 실제 중3 Unit UUID와2015 성취기준을 연결한다. 새 도형/역추론의 정확한live family는 미확정.'},prerequisiteUnits:[unit],placementConditions:{...base.metadata.placementConditions,requiresLearnedBeforeAssignment:t.prerequisites},figureAuthoring:{method:t.spec?'existing-graph-1-vector-engine-strict':'new-native-Markdown-table',newFigures:t.spec?1:0,newTables:t.tables,originalCropEmbedded:false,pixelOracle:false,coordinateConstruction:t.proof,reproductionScript:script,reproductionScriptSha256:ref(script).sha256,renderingReviewPending:true},authorOnly:true,independentMathApproval:false,independentGradeApproval:false,sourceIdentityApproved:false,rightsApproved:false,similarityApproved:false,nativeProvenanceApproved:false,loadable:false};
 fs.writeFileSync(folder+name+'.json',JSON.stringify(q,null,2)+'\n',{flag:'wx'});const x=bindCandidate(folder+name+'.json');assert.deepEqual(x.validation.studentMathNotationWarnings,[]);assert.deepEqual(x.validation.surfaceKeywordViolations,[]);assert.equal(x.validation.metadataAnswerFormatMismatch,false);fs.writeFileSync(folder+name+'-author-calculations-r1.json',JSON.stringify({...t.calc,candidateFileSha256:x.candidateFileSha256,candidateDigest:x.candidateDigest,studentDigest:x.studentDigest,assetDigest:x.assetDigest,authorOnly:true,independentReview:false,sourceIdentityRightsPending:true,dbWrites:0,loadable:0},null,2)+'\n',{flag:'wx'});
}
console.log(JSON.stringify({newDrafts:2,newFigure:1,newTable:1,canonicalSelected:166,totalAuthoredIncludingDrafts:168,newMathGradeApproved:0,sourceObservationCredit:0,loadable:0,dbWrites:0}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
