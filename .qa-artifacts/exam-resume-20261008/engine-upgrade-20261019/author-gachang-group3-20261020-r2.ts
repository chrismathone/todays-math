import fs from 'node:fs';
import assert from 'node:assert/strict';
import {renderFigureSpec} from '../../../src/lib/figure/renderFigureSpec';
import {bindCandidate,readJson,sha256,SURFACES} from '../../../scripts/import/exam-twin/candidatePack.mjs';
async function main(){
const b='.qa-artifacts/exam-resume-20261008/',e=b+'engine-upgrade-20261019/',script=e+'author-gachang-group3-20261020-r2.ts',out=b+'gachang-group3-authoring-20261020-r2/gachang/',job='personal-273b85b46b6ea294fef26b4de34becfc',manifest=b+`unpaired-hwp-first2-extraction-20261020-r1/${job}/hwp-question-only-manifest.local.json`,src=readJson(manifest),base=readJson(b+'gachang-first2-authoring-20261020-r2/gachang/q01.json'),snapshot=e+'live-family-snapshot-r2.json',units=readJson(snapshot).units,ref=(p:string)=>({path:p,sha256:sha256(fs.readFileSync(p))});
assert.equal(src.inventoryAsProvided.year,2025);assert.equal(src.inventoryAsProvided.grade,3);assert.equal(src.originalAnswerNotesExported,false);
const spec={version:'graph-1',xRange:[-1,18],yRange:[-2,14],width:450,height:360,axes:false,polygons:[{points:[[0,0],[13,0],[13,11],[0,11]],fill:'#dddddd'},{points:[[0,4],[9,4],[9,11],[0,11]],fill:'#ffffff'}],labels:[{at:[6.5,12.5],text:String.raw`$(4a+1)\,\mathrm{cm}$`,size:18},{at:[15.5,5.5],text:String.raw`$(3a+2)\,\mathrm{cm}$`,size:18},{at:[11,7.5],text:String.raw`$b\,\mathrm{cm}$`,size:18},{at:[4.5,2],text:String.raw`$b\,\mathrm{cm}$`,size:18},{at:[4.5,7.5],text:'남은 부분',size:18}]};
const tasks=[{
 n:3,score:4,unit:'e63d61c6-2b41-4c83-a74b-a605fd343c42',codes:['9수02-12'],tables:0,figure:true,
 content:String.raw`가로의 길이가 $(4a+1)\,\mathrm{cm}$, 세로의 길이가 $(3a+2)\,\mathrm{cm}$인 직사각형 종이에서 오른쪽과 아래쪽의 폭이 각각 $b\,\mathrm{cm}$인 띠 모양 부분을 그림과 같이 잘라 냈다. 남은 직사각형의 넓이를 $a$에 대한 식으로 나타내면 $(12a^2-17a+6)\,\mathrm{cm}^2$이다. 상수 $b$의 값은? (단, $a>2$이고 $0<b<3a+2$이다.)`,
 choices:[2,3,4,5,6].map(v=>`$${v}$`),answer:'③',
 solution:String.raw`오른쪽에서 $b\,\mathrm{cm}$, 아래쪽에서 $b\,\mathrm{cm}$를 잘라 냈으므로 남은 직사각형의 가로와 세로의 길이는 각각 $(4a+1-b)\,\mathrm{cm}$, $(3a+2-b)\,\mathrm{cm}$이다.

두 길이를 곱해 넓이를 전개하면

$$(4a+1-b)(3a+2-b)=12a^2+(11-7b)a+(1-b)(2-b)$$

이다. 이것을 $12a^2-17a+6$과 비교하면 $a$의 계수에서 $11-7b=-17$이므로 $b=4$이다.

이때 상수항도 $(1-4)(2-4)=6$으로 일치한다. 또 $a>2$이므로 남은 두 길이 $4a-3$, $3a-2$는 모두 양수이고 $0<4<3a+2$이다. 따라서 실제로 만들 수 있으며 조건을 만족하는 상수는 $4$로 유일하다. 정답은 ③이다.`,
 before:'직사각형 잔디밭의 길을 제외한 넓이를 곱셈식으로 정리하여 직접 고른다.',after:'잘라낸 띠가 남기는 직사각형을 새로 조직하고 넓이의 다항식 계수에서 빠진 띠 폭을 역추론한다.',concept:'직사각형의 넓이와 두 일차식의 곱 전개',method:'남은두길이4a+1−b,3a+2−b 구성 → 곱셈 전개 → a의계수11−7b와−17연결 → b4 → 상수항6/길이양수/폭범위재확인',prerequisites:['직사각형의 넓이','다항식의 곱셈','동류항과 계수 비교','일차방정식','양수 길이와 cm/cm²'],domain:'a>2,0<b<3a+2와가로−세로=a−1>0이므로남은두변이양수이다.b4가계수조건의유일값이고상수항도6으로맞는다.그림좌표a3/b4는작도증인일뿐학생에게a3이나정답b4를수치조건으로제공하지않는다.',calc:{coefficientForB4:11-7*4,constantForB4:(1-4)*(2-4),choices:[2,3,4,5,6].map(b=>({b,linearCoefficient:11-7*b,constant:(1-b)*(2-b),valid:11-7*b===-17&&(1-b)*(2-b)===6})),coordinateWitnessOnly:{a:3,b:4,outer:[13,11],remaining:[9,7]}}
},{
 n:6,score:4,unit:'1682f01b-5293-4672-91cd-07fc02e305ac',codes:['9수01-07'],tables:1,figure:false,
 content:String.raw`두 정사각형 A, B의 넓이를 다음 표와 같이 나타냈다. A의 한 변이 B의 한 변보다 $3\,\mathrm{cm}$ 길 때, 실수 $t$의 값은? (단, $-2<t<3$이다.)

| 정사각형 | 넓이 |
| --- | --- |
| A | $(t^2-6t+9)\,\mathrm{cm}^2$ |
| B | $(t^2+4t+4)\,\mathrm{cm}^2$ |`,
 choices:[-2,-1,0,1,2].map(v=>`$${v}$`),answer:'②',
 solution:String.raw`A의 넓이는 $(t-3)^2\,\mathrm{cm}^2$, B의 넓이는 $(t+2)^2\,\mathrm{cm}^2$이다. 한 변의 길이는 넓이의 양의 제곱근이다.

$-2<t<3$에서 $3-t>0$, $t+2>0$이므로 A, B의 한 변의 길이는 각각 $(3-t)\,\mathrm{cm}$, $(t+2)\,\mathrm{cm}$이다.

A의 한 변이 $3\,\mathrm{cm}$ 더 길다는 조건에서 $(3-t)-(t+2)=3$이다. 정리하면 $1-2t=3$이므로 $t=-1$이다.

이 값은 주어진 범위에 있고, 두 넓이는 각각 $16\,\mathrm{cm}^2$, $1\,\mathrm{cm}^2$이다. 한 변의 길이는 $4\,\mathrm{cm}$, $1\,\mathrm{cm}$로 차가 $3\,\mathrm{cm}$이다. 일차 관계에서 얻은 값이 하나뿐이므로 정답은 ②이다.`,
 before:'보조문자를 대입한 두 근호식을 완전제곱식으로 정리하고 범위에 따른 제곱근 부호를 판단해 차를 단순화한다.',after:'두 완전제곱 넓이를 표로 조직하고 양수인 변의 길이로 표현한 뒤 길이 차 조건에서 입력을 복원한다.',concept:'완전제곱식의 양의 제곱근을 주어진 문자 범위에 맞게 선택한다.',method:'넓이완전제곱식정리 → 범위−2<t<3에서양수인길이3−t,t+2 선택 → 길이차3으로일차관계 → t−1대입으로범위/넓이/양수길이확인',prerequisites:['완전제곱식의 곱셈공식','제곱근의 뜻과 성질','문자 범위와 부호','정사각형 넓이와 양수 길이','일차방정식'],domain:'−2<t<3이므로두넓이의양수제곱근은3−t와t+2이다.형식적인절댓값함수기호/고등도구를학생해설에요구하지않는다.해t−1에서넓이16/1,변길이4/1로실제존재하며차3과범위조건을모두만족한다.',calc:{input:-1,areas:[16,1],positiveSides:[4,1],difference:3,correctChoice:2}}
];
// Exact author checks only: these are not independent solves or grade approval.
assert.equal(11-7*4,-17);assert.equal((1-4)*(2-4),6);for(let a=3n;a<=12n;a++)assert.equal((4n*a-3n)*(3n*a-2n),12n*a*a-17n*a+6n);assert.equal(1-2*(-1),3);assert.equal((-1)**2-6*(-1)+9,16);assert.equal((-1)**2+4*(-1)+4,1);
fs.mkdirSync(out,{recursive:true});const component=b+`unpaired-hwp-first2-extraction-20261020-r1/${job}/component-only-input/`;
for(const task of tasks){const name=`q${String(task.n).padStart(2,'0')}`,s=src.questions.find((q:any)=>q.number===task.n),unit=units.find((u:any)=>u.id===task.unit);assert(s&&unit);assert.equal(unit.grade,'중3');assert(s.printedScoreOccurrences.some((p:any)=>p.value===task.score));const local=component+name+'.local.json';fs.writeFileSync(local,JSON.stringify(s,null,2)+'\n',{flag:'wx'});
 if(task.figure){fs.writeFileSync(out+name+'.figure.spec.json',JSON.stringify(spec,null,2)+'\n',{flag:'wx'});const figure=await renderFigureSpec(spec,{strict:true});assert(figure.ok);assert.equal(figure.droppedDimensions?.length??0,0);fs.writeFileSync(out+name+'.figure.svg',figure.svg,{flag:'wx'});}
 const q=structuredClone(base);delete q.metadata.metadataRevision;Object.assign(q,{questionNumber:task.n,twinExternalId:`exam-twin-gachang-2025-1-final-author-group3-r2-${name}`,content:task.content,choices:task.choices,answer:task.answer,solution:task.solution,score:task.score,figureArtifacts:task.figure?[{role:'stem',specPath:name+'.figure.spec.json',svgPath:name+'.figure.svg',intendedWidthMm:78}]:[]});
 q.sourceReference={...base.sourceReference,externalId:`2025-gachang-3-1-final-${task.n}`,sourceQuestionNumber:task.n,newSourceReferenceId:`source-ref-gachang-2025-1-final-group3-r2-${name}`,sourceContentSha256:s.sourceContentDigest,questionOnlyStaged:ref(local),sourceComponentReview:{status:'parent-original-first-page-q03-q06-observed-independent-source-core-review-pending',whole19ParentHwpPdfPairApproved:false},sourceIdentityApproved:false};
 q.variantDelta={modes:['structure','inverse-target',task.figure?'new-vector':'algebra-to-geometry',task.figure?'data-reorganization':'new-table'],before:task.before,after:task.after,sharedConcept:task.concept,sharedProcedure:task.method,actualStructuralChange:task.after,domainProof:task.domain,difficultyBasis:'원문4점과핵심곱셈/제곱근부호절차를기준으로한저자제안;질문역전과새자료조직의목표난도·exact family는독립검토전보류.'};
 q.curriculumReview={...base.curriculumReview,standardCodes:task.codes,officialBasis:{...base.curriculumReview.officialBasis,primaryStandardCodes:task.codes},officialPrimary:{...base.curriculumReview.officialPrimary,standard:task.codes.join(', '),actualScope:'2015중3다항식곱셈/제곱근성질과이미배운길이·넓이·일차관계;실제Unit/각학생면검토필수;2027중3/2022별도보류'},legitimateMethodDraft:task.method,sevenSurfaces:Object.fromEntries(SURFACES.map(k=>[k,'author-proposed-independent-review-pending'])),independentReviewPending:true};
 q.metadata={...q.metadata,score:task.score,problemTypeProposal:task.after,sourceDifficultyLabelObserved:s.difficultyLabelFromSource,assignment:{status:'pending',unitId:unit.id,familyKey:null,currentUnit:unit,snapshot:ref(snapshot),evidence:'실제캡처Unit과2015성취기준을연결;새표현/질문역전의정확한live family는보류'},prerequisiteUnits:[unit],placementConditions:{...base.metadata.placementConditions,requiresLearnedBeforeAssignment:task.prerequisites},figureAuthoring:{method:task.figure?'existing-graph-1-vector-engine-strict':'new-native-Markdown-table',newFigures:task.figure?1:0,newTables:task.tables,originalCropEmbedded:false,pixelOracle:false,coordinateConstruction:task.domain,reproductionScript:script,reproductionScriptSha256:ref(script).sha256,renderingReviewPending:true},authorOnly:true,independentMathApproval:false,independentGradeApproval:false,sourceIdentityApproved:false,rightsApproved:false,similarityApproved:false,nativeProvenanceApproved:false,loadable:false};
 const path=out+name+'.json';fs.writeFileSync(path,JSON.stringify(q,null,2)+'\n',{flag:'wx'});const bound=bindCandidate(path);assert.deepEqual(bound.validation.studentMathNotationWarnings,[]);assert.deepEqual(bound.validation.surfaceKeywordViolations,[]);assert.equal(bound.validation.metadataAnswerFormatMismatch,false);fs.writeFileSync(out+name+'-author-calculations-r1.json',JSON.stringify({...task.calc,candidateDigest:bound.candidateDigest,studentDigest:bound.studentDigest,assetDigest:bound.assetDigest,authorOnly:true,independentReview:false,dbWrites:0,loadable:0},null,2)+'\n',{flag:'wx'});
}
console.log(JSON.stringify({newDrafts:2,newFigure:1,newTable:1,actualAuthored:174,newIndependentApproval:0,loadable:0,dbWrites:0}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
