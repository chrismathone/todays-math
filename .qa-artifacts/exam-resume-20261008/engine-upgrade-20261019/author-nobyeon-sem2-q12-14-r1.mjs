import fs from 'node:fs';
import assert from 'node:assert/strict';
import {bindCandidate,readJson,sha256,SURFACES} from '../../../scripts/import/exam-twin/candidatePack.mjs';
const b='.qa-artifacts/exam-resume-20261008/',out=b+'nobyeon-sem2-authoring-group3-r1/',base=readJson(b+'nobyeon-sem2-authoring-group2-r2/q11.json'),snapshotPath=b+'engine-upgrade-20261019/live-family-snapshot-r2.json',snapshot=readJson(snapshotPath);
const median=v=>{const a=[...v].sort((a,z)=>a-z);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;};
const possible=[];for(let a=1;a<=16;a++)for(let z=a+1;z<=16;z++)if(2*a+z===16&&median([a,z,1,9,12])===8)possible.push({a,b:z,secondMedian:median([2,a,z,6])});assert.deepEqual(possible,[{a:4,b:8,secondMedian:5}]);
const values=[3,7,8,4,8,9,10,7];assert.equal(values.reduce((s,x)=>s+x,0),56);const counts=new Map();for(const x of values)counts.set(x,(counts.get(x)??0)+1);const max=Math.max(...counts.values()),modes=[...counts].filter(([,c])=>c===max).map(([v])=>v).sort((a,z)=>a-z);assert.deepEqual(modes,[7,8]);
const records={A:[2,4,3,6,7],B:[3,5,6,5,8],C:[9,7,8,4,3],D:[1,2,4,3,6],E:[4,3,6,8,7]},signs=Object.fromEntries(Object.entries(records).map(([k,ys])=>[k,5*ys.reduce((s,y,i)=>s+(i+1)*y,0)-15*ys.reduce((s,y)=>s+y,0)]));assert.deepEqual(Object.keys(signs).filter(k=>signs[k]<0),['C']);assert(Object.values(signs).every(x=>x!==0));
const tasks=[{
 n:12,score:3,content:String.raw`두 자연수 $a,b$에 대하여 $a<b$, $2a+b=16$이다. 같은 두 수를 사용하여 만든 다음 기록표에서 빈칸에 들어갈 중앙값은?

| 기록 | 자료 | 중앙값 |
| --- | --- | --- |
| A | $a,b,1,9,12$ | $8$ |
| B | $2,a,b,6$ | $\square$ |`,
 choices:[3,4,5,6,7].map(x=>`$${x}$`),answer:'③',
 solution:String.raw`자료 A의 중앙값 $8$은 다섯 자료 중 하나여야 한다. 고정된 세 값은 $1$, $9$, $12$로 $8$이 아니므로 $a$, $b$ 중 하나가 $8$이다.

만약 $a=8$이면 $2a+b=16$에서 $b=0$이 되어 자연수 조건에 맞지 않는다. 따라서 $b=8$이고 $2a+8=16$에서 $a=4$이다. 실제 자료 A를 정렬하면 $1,4,8,9,12$이므로 주어진 중앙값 조건도 만족한다.

자료 B는 $2,4,8,6$이고 작은 수부터 정렬하면 $2,4,6,8$이다. 개수가 짝수이므로 중앙값은 가운데 두 값의 평균 $\frac{4+6}{2}=5$이다. 따라서 정답은 ③이다.`,
 before:'홀수·짝수 자료의 중앙값 두 개를 주고 미지수의 일차식을 구한다.',after:'홀수 자료의 중앙값과 미지수의 일차식을 주고 짝수 자료의 중앙값을 역으로 복원한다.',concept:'홀수·짝수 자료의 중앙값과 정렬 조건',method:'홀수 중앙값이 실제 자료값임을 이용→양의 자연수 조건과 일차식으로 두 수 결정→짝수 자료 가운데 두 값의 평균',proof:'2a+b16과 a,b양수로 모든 후보는 a<=7,b<=14 안에 있다. 유한 전수 계산에서(a4,b8)만 A중앙값8을 만족하고 B중앙값5로 유일하다. 학생 해설은 유한 탐색 대신 중앙값8인 미지수의 두 경우를 나누어 증명한다.',calc:{positiveNaturalDomainBound:16,allSolutions:possible},prerequisites:['홀수/짝수 개수의 중앙값','정렬과 자료의 개수','양의 자연수와 일차식']
},{
 n:13,score:4,content:String.raw`자연수 $a$를 포함한 다음 여덟 자료의 평균은 $7$이다. 이 자료의 최빈값을 빠짐없이 나열한 것은?

| 자료 | $3$ | $7$ | $8$ | $4$ | $a$ | $9$ | $10$ | $7$ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |`,
 choices:['$7$','$8$','$7$, $8$','$7$, $9$','$8$, $9$'],answer:'③',
 solution:String.raw`평균이 $7$이고 자료가 $8$개이므로 전체 합은 $7\times8=56$이다. 알려진 일곱 값의 합은 $3+7+8+4+9+10+7=48$이므로 $a=56-48=8$이다.

이때 $7$과 $8$은 각각 두 번씩 나타나고 다른 값들은 한 번씩 나타난다. 따라서 최빈값은 $7$, $8$ 두 개이며 빠짐없이 나열한 정답은 ③이다.`,
 before:'두 최빈값을 주어 미지 자료를 정한 뒤 평균과의 합을 구한다.',after:'평균을 주어 미지 자료를 정한 뒤 두 최빈값을 빠짐없이 찾는다.',concept:'평균으로 정해지는 자료의 합과 여러 최빈값',method:'평균×자료개수에서 누락 자료 복원→빈도 세기→모든 최대 빈도 값을 함께 선택',proof:'고정된 합48과 전체합56으로 a8하나가 정해진다. 빈도는7/8이2회, 나머지1회로 동일 최빈값 두 개가 유일하다. 원문의 입력이던 최빈값과 계산 대상이던 평균의 역할을 뒤집었다.',calc:{data:values,mean:7,total:56,fixedTotal:48,a:8,frequencies:Object.fromEntries(counts),modes},prerequisites:['평균과 자료의 합','자료 개수','최빈값은 여러 개일 수 있음']
},{
 n:14,score:3,content:String.raw`다섯 기록 A~E에서 변량 $x$와 $y$를 함께 측정하였다. 표의 각 열은 한 쌍의 측정값을 나타낸다. 이 자료로 산점도를 그렸을 때 음의 상관관계가 보이는 기록은?

| $x$ | $1$ | $2$ | $3$ | $4$ | $5$ |
| --- | --- | --- | --- | --- | --- |
| A의 $y$ | $2$ | $4$ | $3$ | $6$ | $7$ |
| B의 $y$ | $3$ | $5$ | $6$ | $5$ | $8$ |
| C의 $y$ | $9$ | $7$ | $8$ | $4$ | $3$ |
| D의 $y$ | $1$ | $2$ | $4$ | $3$ | $6$ |
| E의 $y$ | $4$ | $3$ | $6$ | $8$ | $7$ |`,
 choices:['기록 A','기록 B','기록 C','기록 D','기록 E'],answer:'③',
 solution:String.raw`음의 상관관계는 한 변량의 값이 커질수록 다른 변량의 값이 작아지는 경향이 있는 관계이다. 모든 인접한 측정에서 반드시 작아져야 한다는 뜻은 아니다.

기록 C는 $x$가 작은 쪽에서 $y$가 주로 $9$, $7$, $8$이고, 큰 쪽에서는 $4$, $3$으로 작아지는 전체적인 경향이 보인다. 나머지 A, B, D, E는 $x$가 큰 쪽에서 $y$도 대체로 커지는 경향이다. 따라서 음의 상관관계를 보이는 기록은 C이고 정답은 ③이다. 이 자료만으로 원인과 결과를 판단하지는 않는다.`,
 before:'생활 소재 다섯 쌍에서 상관관계 방향이 다른 하나를 고른다.',after:'새 관측값 다섯 묶음을 표로 조직하고 실제 점들의 전체 경향으로 음의 상관관계를 판단한다.',concept:'산점도에서 보이는 양/음의 상관관계 방향',method:'같은 x축의 작은값/큰값에서 y의 전체 경향 대조→중간 흔들림과 전체 방향 구별',proof:'x1..5의 각 기록에서 추세를 확인했다. 저자 전용 정수 공분산 부호 검산5Σxy-ΣxΣy는 A60/B50/C-75/D55/E55로 C만 음수다. 이 계산식·상관계수·회귀/인과 도구는 학생에게 요구하지 않는다. 실제 새 표의 개별값과 전반적 방향은 독립 검수 대상이다.',calc:{x:[1,2,3,4,5],records,authorOnlyCovarianceNumerators:signs,studentFormulaRequired:false},prerequisites:['산점도와 두 변량','양의/음의 상관관계의 뜻','경향과 항상 성립하는 관계의 구별']
}];
fs.mkdirSync(out);
for(const t of tasks){
 const name=`q${t.n}`,stagedPath=b+`next-three-source-review-r1/question-only-staged/nobyeon/${name}.json`,reviewPath=b+`next-three-source-review-r1/items/nobyeon/${name}.json`,src=readJson(stagedPath),review=readJson(reviewPath);assert.equal(review.sourceIdentity.printedYear,2025);assert(review.questionOnlyWhitelist.selected);assert.equal(review.curriculumCoreMethodProposal.status,'candidate');assert.deepEqual(review.questionOnlyWhitelist.blockers,[]);const unit=snapshot.units.find(u=>u.id===review.metadataProposal.unit.id);assert(unit);assert.equal(src.score.parentScore,t.score);
 const component=out+name+'-source-component-observation-r1.json';fs.writeFileSync(component,JSON.stringify({utc:new Date().toISOString(),stagedQuestionActuallyRead:{path:stagedPath,sha256:sha256(fs.readFileSync(stagedPath))},priorPrintedOriginalReport:{path:reviewPath,sha256:sha256(fs.readFileSync(reviewPath))},sourceHasFigure:false,newTables:1,noOriginalAnswerKeyUsed:true,wholePairIdentityApproved:false,rightsApproved:false,originalCropEmbedded:false},null,2)+'\n',{flag:'wx'});
 const q=structuredClone(base);Object.assign(q,{questionNumber:t.n,twinExternalId:`exam-twin-nobyeon-2025-2-mid-author-group3-r1-${name}`,score:t.score,content:t.content,choices:t.choices,answer:t.answer,solution:t.solution,figureArtifacts:[]});
 q.sourceReference={...base.sourceReference,externalId:`2025-nobyeon-3-2-mid-${t.n}`,newSourceReferenceId:`source-ref-nobyeon-2025-2-mid-group3-r1-${name}`,sourceContentSha256:sha256(fs.readFileSync(stagedPath)),questionOnlyStaged:{path:stagedPath,sha256:sha256(fs.readFileSync(stagedPath))},sourceReviewReport:{path:reviewPath,sha256:sha256(fs.readFileSync(reviewPath))},componentObservation:{path:component,sha256:sha256(fs.readFileSync(component))}};
 q.variantDelta={modes:t.n===14?['new-data','structure','new-table']:['inverse-target','structure','new-table'],before:t.before,after:t.after,sharedConcept:t.concept,sharedProcedure:t.method,actualStructuralChange:t.after+' 입력과 질문 또는 자료 조직을 실제로 바꾸고 새 문장·답·해설·표를 작성했다. 숫자/학교명 치환만으로 완료하지 않는다.',domainProof:t.proof,difficultyBasis:'원문 배점과 핵심 개념의 기본 난도 저자 제안이다. 실제 난도 동등성·진도·2022적용은 독립 검수 전 보류.'};
 q.curriculumReview={...base.curriculumReview,standardCodes:review.curriculumCoreMethodProposal.standardCodes,officialPrimary:{...base.curriculumReview.officialPrimary,standard:review.curriculumCoreMethodProposal.standardCodes.join(', '),actualScope:'2015 M3 representative values or correlation direction, no regression/Pearson/student-only advanced method. Whole new seven surfaces independently pending.'},legitimateMethodDraft:t.method,sevenSurfaces:Object.fromEntries(SURFACES.map(k=>[k,'author-proposed-independent-review-pending'])),independentReviewPending:true};
 q.metadata={...base.metadata,score:t.score,problemTypeProposal:t.after,sourceDifficultyLabelObserved:review.metadataProposal.sourceDifficultyLabel??null,assignment:{status:'pending',unitId:unit.id,familyKey:null,currentUnit:unit,snapshot:{path:snapshotPath,sha256:sha256(fs.readFileSync(snapshotPath))},evidence:'실제 Unit UUID 연결; 역추론/새 자료 조직의 정확한 live family는 별도 보류.'},prerequisiteUnits:[unit],placementConditions:{...base.metadata.placementConditions,requiresLearnedBeforeAssignment:t.prerequisites},figureAuthoring:{method:'new-native-Markdown-table',newFigures:0,newTables:1,originalCropEmbedded:false,pixelOracle:false,coordinateConstruction:t.proof,reproductionScript:'.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/author-nobyeon-sem2-q12-14-r1.mjs',renderingReviewPending:true}};
 fs.writeFileSync(out+name+'.json',JSON.stringify(q,null,2)+'\n',{flag:'wx'});const x=bindCandidate(out+name+'.json');assert.deepEqual(x.validation.studentMathNotationWarnings,[]);assert.equal(x.validation.metadataAnswerFormatMismatch,false);fs.writeFileSync(out+name+'-author-calculations-r1.json',JSON.stringify({...t.calc,utc:new Date().toISOString(),candidateFileSha256:x.candidateFileSha256,studentDigest:x.studentDigest,candidateDigest:x.candidateDigest,assetDigest:x.assetDigest,authorOnly:true,independentReview:false,loadable:0,dbWrites:0},null,2)+'\n',{flag:'wx'});
}
console.log(JSON.stringify({authored:3,newTables:3,newFigures:0,independentReviewPending:true,canonicalCountsUnchanged:true,loadable:0}));
