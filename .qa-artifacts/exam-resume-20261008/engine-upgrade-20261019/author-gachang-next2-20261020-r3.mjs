import fs from 'node:fs';
import assert from 'node:assert/strict';
import {bindCandidate,readJson,sha256,SURFACES} from '../../../scripts/import/exam-twin/candidatePack.mjs';
const b='.qa-artifacts/exam-resume-20261008/',e=b+'engine-upgrade-20261019/',script=e+'author-gachang-next2-20261020-r3.mjs',out=b+'gachang-next2-authoring-20261020-r3/gachang/',job='personal-273b85b46b6ea294fef26b4de34becfc',manifest=b+`unpaired-hwp-first2-extraction-20261020-r1/${job}/hwp-question-only-manifest.local.json`,src=readJson(manifest),base=readJson(b+'gachang-first2-authoring-20261020-r2/gachang/q01.json'),snapshot=e+'live-family-snapshot-r2.json',ref=p=>({path:p,sha256:sha256(fs.readFileSync(p))});
const units=readJson(snapshot).units.filter(u=>u.grade==='중3'&&u.semester===1&&u.section==='인수분해');assert.equal(units.length,1);const unit=units[0];
assert.equal(src.inventoryAsProvided.year,2025);assert.equal(src.inventoryAsProvided.grade,3);assert.equal(src.originalAnswerNotesExported,false);
const tasks=[{
 n:4,score:3,
 content:String.raw`다항식을 변형하는 두 과정을 다음과 같이 정리했다. 빈칸 ㉠에 들어갈 식과 과정 (가), (나)의 이름을 바르게 짝지은 것은?

| 과정 | 변형 전 | 변형 후 |
| --- | --- | --- |
| (가) | $12u^2v-18uv^2$ | $6uv\times$ ㉠ |
| (나) | $6uv\times$ ㉠ | $12u^2v-18uv^2$ |`,
 choices:[String.raw`$2u-3v$, 전개, 인수분해`,String.raw`$2u-3v$, 인수분해, 전개`,String.raw`$2u+3v$, 인수분해, 전개`,String.raw`$2u-3v$, 인수분해, 인수분해`,String.raw`$2u-3$, 인수분해, 전개`],answer:'②',
 solution:String.raw`두 항 $12u^2v$, $-18uv^2$에 공통으로 들어 있는 인수 $6uv$를 묶어내면

$$12u^2v-18uv^2=6uv(2u-3v)$$

이다. 따라서 ㉠은 $2u-3v$이다. 다항식을 두 인수의 곱으로 나타내는 (가)는 인수분해이다.

반대로 $6uv(2u-3v)$에 분배법칙을 적용하면 $12u^2v-18uv^2$이 된다. 곱의 꼴을 풀어 나타내는 (나)는 전개이다. 그러므로 정답은 ②이다. 문자에 수를 대입해 나누는 풀이가 아니므로 $u$, $v$가 $0$일 때를 따로 제외할 필요도 없다.`,
 before:'전개식과 곱의 꼴을 모두 제시하고 인수·공통인수·전개·인수분해 설명 중 틀린 것을 고른다.',after:'두 방향의 변형을 표로 조직하고 빠진 실제 인수와 각 방향의 연산 이름을 함께 완성한다.',concept:'공통인수를 이용한 인수분해와 분배법칙에 따른 전개의 역관계',method:'6uv를 공통인수로 묶어2u−3v 구성 → 분배법칙으로 원식 확인 → 합에서곱/곱에서합 방향을 인수분해/전개와 연결',prerequisites:['다항식의 항과 인수','분배법칙','공통인수를 이용한 인수분해','다항식의 전개'],domain:'문자u,v의 값으로 나누지 않고 다항식 전개를 확인한다.0을 포함한 실수값에서 등식이 성립한다. 새 선수 개념을 요구하지 않는다.',calc:{outer:[6,1,1],inner:[[2,1,0],[-3,0,1]],expanded:[[12,2,1],[-18,1,2]],correctChoice:2}
},{
 n:5,score:4,
 content:String.raw`다음 표는 각 다항식이 완전제곱식이 되도록 상수 $k$의 값을 기록한 것이다. 잘못 기록한 행 하나를 찾아 그 행의 $k$를 올바르게 고친 것은?

| 행 | 다항식 | 기록한 $k$ |
| --- | --- | --- |
| A | $4x^2+kxy+9y^2$ | $12$ |
| B | $\dfrac19x^2+kxy+\dfrac{25}{4}y^2$ | $-\dfrac53$ |
| C | $9x^2-12xy+ky^2$ | $2$ |`,
 choices:[String.raw`A, $6$`,String.raw`A, $-6$`,String.raw`B, $-\dfrac56$`,String.raw`C, $4$`,String.raw`C, $16$`],answer:'④',
 solution:String.raw`완전제곱식의 곱셈공식 $(a+b)^2=a^2+2ab+b^2$, $(a-b)^2=a^2-2ab+b^2$를 이용한다.

A에서는 $(2x+3y)^2=4x^2+12xy+9y^2$이므로 기록한 $k=12$가 옳다.

B에서는 $\left(\dfrac13x-\dfrac52y\right)^2=\dfrac19x^2-\dfrac53xy+\dfrac{25}{4}y^2$이므로 기록한 $k=-\dfrac53$이 옳다.

C에서는 $9x^2=(3x)^2$이고 가운데 항이 $-12xy=-2\times3x\times2y$이므로 마지막 항은 $(2y)^2=4y^2$이어야 한다. 따라서 $k=4$이고, 실제로 $9x^2-12xy+4y^2=(3x-2y)^2$이다.

C만 잘못 기록했으며 $k$를 $4$로 고쳐야 하므로 정답은 ④이다. C에서 가운데 항의 계수가 고정되어 있어 마지막 항의 계수도 $4$로 정해진다.`,
 before:'여러 다항식 중 완전제곱식으로 인수분해할 수 있는 것을 판별해 개수를 센다.',after:'완전제곱식 조건을 만족한다는 계수 기록 세 행을 검토하고 오류 행의 입력 계수를 역으로 복원한다.',concept:'완전제곱식의 양 끝 제곱항과 가운데 두 배 곱 항의 관계',method:'A,B를 두 항의 합/차의 제곱 공식으로 검토 → C의3x와가운데−12xy에서2y결정 → 마지막제곱항4y²로수정 후재전개',prerequisites:['두 항의 합과 차의 제곱 공식','완전제곱식의 인수분해','분수와 부호 계산','다항식의 계수 비교'],domain:'다항식 전체의 완전제곱식 여부를 묻는다.특정x,y를대입한수치의제곱가능성을묻지않는다.학생은판별식/근과계수/미분을사용하지않고두항의곱셈공식으로푼다.',calc:{A:{squareTerms:[2,3],coefficients:[4,12,9]},B:{squareTerms:[[1,3],[-5,2]],coefficients:[[1,9],[-5,3],[25,4]]},C:{recorded:[9,-12,2],corrected:[9,-12,4],squareTerms:[3,-2]},correctChoice:4}
}];
// Exact coefficient arithmetic and independent numeric identities are AUTHOR checks.
assert.deepEqual([6*2,6*(-3)],[12,-18]);assert.equal((2n*1n*(-5n))*3n,(-5n)*(3n*2n)); // exact 2*(1/3)*(-5/2)=-5/3 by integer cross-productsassert.equal(2*3*(-2),-12);assert.equal((-2)**2,4);
const witnesses=[];for(let u=-4;u<=4;u++)for(let v=-4;v<=4;v++){const U=BigInt(u),V=BigInt(v);assert.equal(6n*U*V*(2n*U-3n*V),12n*U*U*V-18n*U*V*V);assert.equal((3n*U-2n*V)**2n,9n*U*U-12n*U*V+4n*V*V);witnesses.push({u,v,checked:true});}
fs.mkdirSync(out,{recursive:true});const component=b+`unpaired-hwp-first2-extraction-20261020-r1/${job}/component-only-input/`;
for(const t of tasks){const n=`q${String(t.n).padStart(2,'0')}`,s=src.questions.find(s=>s.number===t.n);assert(s.printedScoreOccurrences.some(p=>p.value===t.score));const local=component+n+'.local.json';assert(!fs.existsSync(local));fs.writeFileSync(local,JSON.stringify(s,null,2)+'\n',{flag:'wx'});
 const q=structuredClone(base);Object.assign(q,{questionNumber:t.n,twinExternalId:`exam-twin-gachang-2025-1-final-author-group2-r3-${n}`,content:t.content,choices:t.choices,answer:t.answer,solution:t.solution,score:t.score,figureArtifacts:[]});delete q.metadata.metadataRevision;
 q.sourceReference={...base.sourceReference,externalId:`2025-gachang-3-1-final-${t.n}`,sourceQuestionNumber:t.n,newSourceReferenceId:`source-ref-gachang-2025-1-final-group2-r3-${n}`,sourceContentSha256:s.sourceContentDigest,questionOnlyStaged:ref(local),sourceComponentReview:{status:'HWP-only-component-observed-parent-PDF-and-independent-source-core-review-pending',whole19ParentHwpPdfPairApproved:false},sourceIdentityApproved:false};
 q.variantDelta={modes:['structure','data-reorganization','inverse-target','new-table'],before:t.before,after:t.after,sharedConcept:t.concept,sharedProcedure:t.method,actualStructuralChange:t.after,domainProof:t.domain,difficultyBasis:'원문 배점3/4와 인수분해 정의/공식 판단 목적을 유지한 저자 제안.표 조직과 질문 대상 변화의 실제 난도 및 exact family는 독립검수 전 보류.'};
 q.curriculumReview={...base.curriculumReview,standardCodes:['9수02-12'],officialBasis:{...base.curriculumReview.officialBasis,primaryStandardCodes:['9수02-12']},officialPrimary:{...base.curriculumReview.officialPrimary,standard:'9수02-12',actualScope:'2015중3 인수분해와곱셈공식;중3실제Unit과학년내선수개념으로검토;2027/2022별도보류'},legitimateMethodDraft:t.method,sevenSurfaces:Object.fromEntries(SURFACES.map(s=>[s,'author-proposed-independent-review-pending'])),independentReviewPending:true};
 q.metadata={...q.metadata,score:t.score,sourceDifficultyLabelObserved:s.difficultyLabelFromSource,problemTypeProposal:t.after,assignment:{status:'pending',unitId:unit.id,familyKey:null,currentUnit:unit,snapshot:ref(snapshot),evidence:'실제캡처UnitUUID와2015성취기준연결;새표/오류수정/인수완성목적의exact live family는보류'},prerequisiteUnits:[unit],placementConditions:{...base.metadata.placementConditions,requiresLearnedBeforeAssignment:t.prerequisites},figureAuthoring:{method:'new-native-Markdown-table',newFigures:0,newTables:1,originalCropEmbedded:false,pixelOracle:false,reproductionScript:script,reproductionScriptSha256:ref(script).sha256,renderingReviewPending:true},authorOnly:true,independentMathApproval:false,independentGradeApproval:false,sourceIdentityApproved:false,rightsApproved:false,similarityApproved:false,nativeProvenanceApproved:false,loadable:false};
 const p=out+n+'.json';fs.writeFileSync(p,JSON.stringify(q,null,2)+'\n',{flag:'wx'});const x=bindCandidate(p);assert.deepEqual(x.validation.studentMathNotationWarnings,[]);assert.deepEqual(x.validation.surfaceKeywordViolations,[]);assert.equal(x.validation.metadataAnswerFormatMismatch,false);assert.equal(x.validation.curriculumMetadataComparison.status,'consistent-as-declared');fs.writeFileSync(out+n+'-author-calculations-r1.json',JSON.stringify({model:t.calc,witnesses,candidateDigest:x.candidateDigest,studentDigest:x.studentDigest,authorOnly:true,independentReview:false,dbWrites:0,loadable:0},null,2)+'\n',{flag:'wx'});
}
console.log(JSON.stringify({newDrafts:2,newTables:2,newFigures:0,actualAuthored:172,independentNewApproval:0,dbWrites:0,loadable:0}));
