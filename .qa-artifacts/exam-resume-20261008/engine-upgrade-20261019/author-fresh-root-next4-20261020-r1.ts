import fs from 'node:fs';
import assert from 'node:assert/strict';
import {renderFigureSpec} from '../../../src/lib/figure/renderFigureSpec';
import {bindCandidate,readJson,sha256,SURFACES} from '../../../scripts/import/exam-twin/candidatePack.mjs';

async function main(){
const b='.qa-artifacts/exam-resume-20261008/',e=b+'engine-upgrade-20261019/',out=b+'fresh-root-next4-authoring-20261020-r1/',script=e+'author-fresh-root-next4-20261020-r1.ts',ref=(p:string)=>({path:p,sha256:sha256(fs.readFileSync(p))}),sourceRoot=b+'fresh-three-source-component-review-20261020-r1/',normalizationPath=e+'fresh-nine-local-normalization-observations-r3.json',normalization=readJson(normalizationPath),gradePath=sourceRoot+'own-grade-method-proposals.json',grade=readJson(gradePath),snapshotPath=e+'live-family-snapshot-r2.json',snapshot=readJson(snapshotPath),base=readJson(b+'fresh-root-twin-authoring-20261020-r2/daegudong/q01.json');
const buk='personal-dc9efb798219b732ebd608105298f220',il='personal-1c6091af710ddaaa7e6671a2ef018a1c';
const lineSpec={version:'graph-1',xRange:[-7,7],yRange:[-2,2],width:480,height:180,axes:false,segments:[{from:[-6,0],to:[6,0],arrow:true},{from:[6,0],to:[-6,0],arrow:true}],points:[{at:[-4,0],radius:4},{at:[0,0],radius:4},{at:[4,0],radius:4}],labels:[{at:[-4,0],text:'A',dy:-13},{at:[0,0],text:'O',dy:-13},{at:[0,0],text:'0',dy:23},{at:[4,0],text:'B',dy:-13}]};
const squareSpec={version:'graph-1',xRange:[-.2,1.1],yRange:[-.2,1.1],width:300,height:300,axes:false,polygons:[{points:[[0,0],[.9,0],[.9,.9],[0,.9]],fill:'#eeeeee'}],labels:[{at:[.45,.45],text:String.raw`$0.81\,\mathrm{cm}^{2}$`,size:20}]};
// Exact witnesses and square bounds; drawn pixels are never an arithmetic oracle.
assert.equal(4**2,16);assert.equal(4-(-4),8);assert.equal(9n*9n,81n);assert.equal(3n*3n*100n,9n*100n);assert.equal(7n*7n*9n,49n*3n*3n);
const bounds=[[9,11,16],[1,3,4],[9,10,16],[1,2,4],[9,15,16]];for(const [lo,n,hi]of bounds)assert(lo<n&&n<hi);
const tasks=[{
 exam:'daegubuk',job:buk,n:1,unit:'1682f01b-5293-4672-91cd-07fc02e305ac',codes:['9수01-07'],spec:lineSpec,tables:0,
 content:String.raw`양수 $k$의 두 제곱근을 작은 것부터 $a$, $b$라 하자. 수직선 위에서 좌표가 $a$, $b$인 점을 각각 A, B라 할 때, 선분 AB의 길이가 $8$이다. $k$의 값은?`,
 choices:[4,8,16,32,64].map(v=>`$${v}$`),answer:'③',
 solution:String.raw`양수의 두 제곱근은 부호가 서로 다르고 절댓값은 같다. 따라서 A와 B는 원점의 양쪽에 있고 원점에서 같은 거리만큼 떨어져 있다.

선분 AB의 길이가 $8$이므로 원점에서 각 점까지의 거리는 $8\div2=4$이다. 따라서 $a=-4$, $b=4$이다. 이 두 수를 제곱한 값이 $k$이므로 $k=4^2=16$이다. 실제로 $16$의 두 제곱근 $-4$, $4$에 대응하는 두 점 사이의 거리는 $8$이다. 정답은 ③이다.`,
 before:'제곱근의 뜻·부호와 근호의 값을 여러 일반 진술에서 구별한다.',after:'같은 수의 두 제곱근을 두 좌표로 제시하고 그 사이 거리에서 원래 양수를 역추론한다.',concept:'양수의 두 제곱근이 서로 반대 부호이고 제곱값은 같다는 정의',method:'두 근은 원점에 대칭 → 주어진 거리8의 절반4 → 좌표−4와4 → 제곱값16 확인',proof:'k>0이고 a<b이므로 a<0<b이다. 두 근의 크기가 같아 거리8에서 크기4가 유일하고 k16>0이 존재한다. 수직선 거리와 제곱근 정의만 사용한다. 원문의 모든 부수 근호 계산을 복제하지 않아 목표 난도 동등성과 정확한 family는 독립 보류한다.',prerequisites:['양수의 두 제곱근','양수·음수와 수직선','두 점 사이 거리','정수의 제곱'],calc:{roots:[-4,4],distance:8,radicand:16,unique:true,correctChoices:[false,false,true,false,false]}
},{
 exam:'daegubuk',job:buk,n:3,unit:'28032bdd-3db3-4788-9e7a-2f1909233fdb',codes:['9수01-07','9수01-08','9수01-10'],tables:1,
 content:String.raw`다음 표에서 유리수가 적힌 칸을 모두 지운다. 남아 있는 칸은 몇 개인가? (순환소수는 순환하는 부분의 처음과 끝 숫자 위에 점을 찍어 나타냈다.)

| A | B | C | D | E |
| --- | --- | --- | --- | --- |
| $\sqrt{0.09}$ | $\sqrt7$ | $-0.\dot2\dot7$ | $\sqrt{\dfrac{49}{9}}$ | $\sqrt5-2$ |`,
 choices:[0,1,2,3,4].map(v=>`$${v}$개`),answer:'③',
 solution:String.raw`A의 수는 $\sqrt{0.09}=0.3=\dfrac3{10}$이고, C의 수는 순환소수로 $-0.\dot2\dot7=-\dfrac{27}{99}=-\dfrac3{11}$이다. D의 수는 $\sqrt{\dfrac{49}{9}}=\dfrac73$이다. 이 세 수는 모두 유리수이므로 지운다.

B의 $\sqrt7$은 제곱수가 아닌 자연수 $7$의 제곱근이므로 무리수이다. E의 $\sqrt5-2$도 무리수이다. 만약 이 수가 유리수라면 여기에 유리수 $2$를 더한 $\sqrt5$도 유리수가 되어야 하지만 $\sqrt5$는 무리수이다.

따라서 남는 칸은 B와 E, 모두 $2$개이다. 정답은 ③이다.`,
 before:'근호·순환소수·유리수와 무리수의 합을 포함한 수 쌍 중 무리수만 있는 쌍을 고른다.',after:'다섯 수를 단일 표로 재조직하고 유리수를 제거한 뒤 남는 칸 수를 구한다.',concept:'근호가 있어도 유리수인 수와 순환소수, 무리수에 유리수를 더하거나 빼는 경우의 분류',method:'유한소수 근호·순환소수·분수 근호를 유리수로 확인 → 제곱수가 아닌 자연수의 근호와 유리수 이동을 무리수로 판단 → 남는 칸2개',proof:'A3/10,C−3/11,D7/3은 분모가0이 아닌 정수비이고 B√7은 무리수이다. E는 유리수의 덧셈에 닫힘과 √5의 무리수 성질로 판단한다. 학생용 해설은 형식적 고등 증명 용어나 무한급수를 사용하지 않는다. 이 설명의 실제 중3 적합성은 별도 일곱 면 검수 전 보류한다.',prerequisites:['제곱근의 뜻','유리수·무리수의 뜻','순환소수의 분수 표현','유리수끼리의 덧셈'],calc:{rationalExact:[{label:'A',n:3,d:10},{label:'C',n:-3,d:11},{label:'D',n:7,d:3}],irrational:['B','E'],remaining:2,correctChoices:[false,false,true,false,false]}
},{
 exam:'daeguil',job:il,n:1,unit:'1682f01b-5293-4672-91cd-07fc02e305ac',codes:['9수01-07'],spec:squareSpec,tables:1,
 content:String.raw`넓이가 $0.81\,\mathrm{cm}^{2}$인 정사각형에 대하여 아래 기록의 ㄱ, ㄴ에 들어갈 것을 바르게 짝지은 것은?

| 기록 | 값 |
| --- | --- |
| 제곱하여 $0.81$이 되는 수를 모두 쓰기 | ㄱ |
| 이 정사각형의 한 변의 길이 쓰기 | ㄴ |`,
 choices:[String.raw`ㄱ: $0.9$, ㄴ: $0.9\,\mathrm{cm}$`,String.raw`ㄱ: $\pm0.9$, ㄴ: $-0.9\,\mathrm{cm}$`,String.raw`ㄱ: $\pm0.9$, ㄴ: $0.9\,\mathrm{cm}$`,String.raw`ㄱ: $\pm0.81$, ㄴ: $0.81\,\mathrm{cm}$`,String.raw`ㄱ: $\pm0.9$, ㄴ: $\pm0.9\,\mathrm{cm}$`],answer:'③',
 solution:String.raw`$0.9^2=0.81$이고 $(-0.9)^2=0.81$이므로 제곱하여 $0.81$이 되는 수는 $0.9$, $-0.9$ 두 개이다. 따라서 ㄱ에는 $\pm0.9$가 들어간다.

정사각형의 한 변의 길이는 양수이고 그 제곱이 넓이의 수치인 $0.81$이다. 따라서 ㄴ에는 두 제곱근 중 양수인 $0.9\,\mathrm{cm}$가 들어간다. 길이에 음수를 쓰거나 두 부호를 함께 쓰지 않는다. 정답은 ③이다.`,
 before:'제곱근의 뜻과 양수의 두 제곱근을 일반 진술의 정오로 구별한다.',after:'동일한 양수의 두 제곱근을 모두 묻는 기록과 정사각형의 양수 길이를 묻는 기록을 나란히 완성한다.',concept:'두 제곱근 전체와 근호의 양의 값, 길이의 양수 조건 구별',method:'제곱하여81/100이 되는 두 수±9/10 확인 → 길이는 양수이므로9/10cm 선택',proof:'정사각형 넓이81/100cm²이고 실제 길이9/10cm>0이다. 수학적 두 근과 물리적 길이의 답 형식을 분리한다. 소수 제곱과 초등 정사각형 넓이 외 새 선수 개념은 요구하지 않는다.',prerequisites:['양수의 두 제곱근','소수의 제곱','정사각형의 넓이','양수인 길이와 cm/cm²'],calc:{area:{n:81,d:100},roots:[{n:-9,d:10},{n:9,d:10}],positiveSide:{n:9,d:10},correctChoices:[false,false,true,false,false]}
},{
 exam:'daeguil',job:il,n:3,unit:'28032bdd-3db3-4788-9e7a-2f1909233fdb',codes:['9수01-07','9수01-09'],tables:1,
 content:String.raw`다음 표의 다섯 수 중 $0$보다 크고 $1$보다 작은 수는 모두 몇 개인가?

| A | B | C | D | E |
| --- | --- | --- | --- | --- |
| $\sqrt{11}-3$ | $\sqrt3-2$ | $\sqrt{10}-2$ | $2-\sqrt2$ | $4-\sqrt{15}$ |`,
 choices:[0,1,2,3,4].map(v=>`$${v}$개`),answer:'④',
 solution:String.raw`A. $9<11<16$이므로 $3<\sqrt{11}<4$이다. 따라서 $0<\sqrt{11}-3<1$이다.

B. $1<3<4$이므로 $1<\sqrt3<2$이다. 따라서 $\sqrt3-2<0$이어서 조건에 맞지 않는다.

C. $9<10<16$이므로 $3<\sqrt{10}<4$이다. 따라서 $\sqrt{10}-2>1$이어서 조건에 맞지 않는다.

D. $1<2<4$이므로 $1<\sqrt2<2$이다. 따라서 $0<2-\sqrt2<1$이다.

E. $9<15<16$이므로 $3<\sqrt{15}<4$이다. 따라서 $0<4-\sqrt{15}<1$이다.

조건에 맞는 것은 A, D, E의 $3$개이다. 정답은 ④이다.`,
 before:'근호를 포함한 두 실수의 대소 관계 진술 중 옳은 것을 고른다.',after:'주어진 다섯 근호식 각각을 두 경계0과1에 비교하여 조건을 만족하는 항목 수를 구한다.',concept:'제곱수와 비교하여 근호의 크기를 정하고 같은 수의 덧셈·뺄셈으로 실수를 비교한다.',method:'각 근호를 양쪽 정수 제곱으로 끼워 크기 확인 → 더하거나 빼는 수를 반영 → 두 엄격 경계 모두 만족하는A,D,E 집계',proof:'모든 근호 안 수는 양수이고 정수가 아닌 근이므로0과1의 경계 일치는 없다. 근삿값·그림 픽셀·함수·구간 기호 없이 중3 실수 비교와 이미 배운 부등식 성질로 판단한다. 여러 항목의 비교로 바뀐 실제 난도는 독립 보류한다.',prerequisites:['양수의 제곱근 크기 비교','정수의 제곱','부등식의 덧셈과 뺄셈'],calc:{squaredBounds:bounds,betweenZeroAndOne:[true,false,false,true,true],count:3,correctChoices:[false,false,false,true,false]}
}];
fs.mkdirSync(out);for(const t of tasks){
 const folder=out+t.exam+'/';fs.mkdirSync(folder,{recursive:true});const name=`q${String(t.n).padStart(2,'0')}`,staged=b+`fresh-nine-source-local-normalization-20261020-r3/${t.job}/${name}.local.json`,s=readJson(staged),component=s.sourceIdentityAsProvided.school+'-'+name,row=normalization.rows.find((r:any)=>r.component===component),gc=grade.components.find((r:any)=>r.component===component),unit=snapshot.units.find((r:any)=>r.id===t.unit);assert(row&&gc&&unit);assert.equal(row.newLocalOnly.sha256,ref(staged).sha256);assert.equal(row.parentActuallyViewedOriginalFirstpage,true);assert.equal(s.sourceIdentityAsProvided.year,2025);assert.equal(s.sourceIdentityAsProvided.grade,3);assert(s.printedScoreOccurrences.some((r:any)=>r.value===3));assert.equal(unit.id,gc.capturedPrimaryUnitProposal.id);
 if(t.spec){fs.writeFileSync(folder+name+'.figure.spec.json',JSON.stringify(t.spec,null,2)+'\n',{flag:'wx'});const r=await renderFigureSpec(t.spec,{strict:true});assert(r.ok);assert.equal(r.droppedDimensions?.length??0,0);fs.writeFileSync(folder+name+'.figure.svg',r.svg,{flag:'wx'});}
 const q=structuredClone(base);Object.assign(q,{questionNumber:t.n,twinExternalId:`exam-twin-${t.exam}-2025-1-mid-author-group3-r1-${name}`,content:t.content,choices:t.choices,answer:t.answer,solution:t.solution,score:3,figureArtifacts:t.spec?[{role:'stem',specPath:name+'.figure.spec.json',svgPath:name+'.figure.svg',intendedWidthMm:t.exam==='daegubuk'?80:55}]:[]});
 q.sourceReference={...base.sourceReference,externalId:`2025-${t.exam}-3-1-mid-${t.n}`,inventoryExamId:t.job,sourceQuestionNumber:t.n,newSourceReferenceId:`source-ref-${t.exam}-2025-1-mid-group3-r1-${name}`,sourceContentSha256:s.sourceContentDigest,questionOnlyStaged:ref(staged),originalUnchangedStaged:row.oldStaged,localNormalizationObservation:ref(normalizationPath),sourceSchoolInternal:s.sourceIdentityAsProvided.school,extractionManifest:s.sourceBindings.manifest,sourceFiles:s.sourceBindings.inputs,originalIdentityReference:s.sourceBindings.original,sourceComponentEvidence:null,sourceComponentReview:{...ref(sourceRoot+'own-source-component-review.json'),component,originalR1ProposalResolvedBySeparateLocalR3Observation:true},gradeMethodProposal:{...ref(gradePath),component}};
 q.variantDelta={modes:t.spec?['algebra-to-geometry','inverse-target','structure','new-vector']:['data-reorganization','question-target-change','structure','new-table'],before:t.before,after:t.after,sharedConcept:t.concept,sharedProcedure:t.method,actualStructuralChange:t.after,domainProof:t.proof,difficultyBasis:'원문과 동일한 핵심 개념·풀이 관계를 사용한 저자 제안이다. 단순 숫자/학교명 치환으로 통과하지 않는다. 실제 목표 난도·정확한 family·모든 학년 면은 별도 검수 전 보류.'};
 q.curriculumReview={...base.curriculumReview,standardCodes:t.codes,officialPrimary:{...base.curriculumReview.officialPrimary,standard:t.codes.join(', '),actualScope:'2015 중3 실수·제곱근과 이미 배운 수직선/정사각형/유리수 성질. 2027년 중3의2022 적용으로 자동 전용하지 않는다.'},legitimateMethodDraft:t.method,sevenSurfaces:Object.fromEntries(SURFACES.map(k=>[k,'author-proposed-independent-review-pending'])),independentReviewPending:true};
 q.metadata={...base.metadata,score:3,sourceDifficultyLabelObserved:s.difficultyLabelFromSource??null,problemTypeProposal:t.after,assignment:{status:'pending',unitId:unit.id,familyKey:null,currentUnit:unit,snapshot:ref(snapshotPath),evidence:'캡처된 실제2015중3 Unit UUID. 새 구조에 정확히 맞는 live family는 불명이며 자동 배정하지 않는다.'},prerequisiteUnits:[unit],placementConditions:{...base.metadata.placementConditions,requiresLearnedBeforeAssignment:t.prerequisites},figureAuthoring:{method:t.spec?'existing-graph-1-vector-engine-strict':'new-native-Markdown-table',newFigures:t.spec?1:0,newTables:t.tables,originalCropEmbedded:false,pixelOracle:false,coordinateConstruction:t.proof,reproductionScript:script,reproductionScriptSha256:ref(script).sha256,renderingReviewPending:true},authorOnly:true,independentMathApproval:false,independentGradeApproval:false,sourceIdentityApproved:false,rightsApproved:false,similarityApproved:false,nativeProvenanceApproved:false,loadable:false};
 fs.writeFileSync(folder+name+'.json',JSON.stringify(q,null,2)+'\n',{flag:'wx'});const x=bindCandidate(folder+name+'.json');assert.deepEqual(x.validation.studentMathNotationWarnings,[]);assert.deepEqual(x.validation.surfaceKeywordViolations,[]);assert.equal(x.validation.metadataAnswerFormatMismatch,false);fs.writeFileSync(folder+name+'-author-calculations-r1.json',JSON.stringify({...t.calc,candidateFileSha256:x.candidateFileSha256,candidateDigest:x.candidateDigest,studentDigest:x.studentDigest,assetDigest:x.assetDigest,unitId:unit.id,authorOnly:true,independentReview:false,loadable:0,dbWrites:0},null,2)+'\n',{flag:'wx'});
}
console.log(JSON.stringify({newDrafts:4,newFigures:2,newTables:3,canonicalSelected:162,totalAuthoredIncludingUnselectedDrafts:166,newIndependentReviewPending:4,loadable:0,dbWrites:0}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
