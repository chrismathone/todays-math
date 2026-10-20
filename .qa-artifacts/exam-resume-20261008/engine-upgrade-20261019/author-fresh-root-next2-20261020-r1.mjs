import fs from 'node:fs';
import assert from 'node:assert/strict';
import {bindCandidate,readJson,sha256,SURFACES} from '../../../scripts/import/exam-twin/candidatePack.mjs';
const b='.qa-artifacts/exam-resume-20261008/',e=b+'engine-upgrade-20261019/',out=b+'fresh-root-next2-authoring-20261020-r1/',srcRoot=b+'fresh-three-source-component-review-20261020-r1/',script=e+'author-fresh-root-next2-20261020-r1.mjs',ref=p=>({path:p,sha256:sha256(fs.readFileSync(p))}),source=readJson(srcRoot+'own-source-component-review.json'),grade=readJson(srcRoot+'own-grade-method-proposals.json'),snapshotPath=e+'live-family-snapshot-r2.json',snapshot=readJson(snapshotPath),base=readJson(b+'fresh-root-twin-authoring-20261020-r2/daegudong/q01.json');
// Exact integer identities, not a floating-point square-root oracle.
assert.equal(4n*4n*100n,64n*25n);assert.equal(3n*64n*25n,3n*16n*100n);assert.equal(10n*4n,8n*5n);assert.equal(27n*11n,3n*99n);assert.equal(2n*2n*100n,16n*5n*5n);
const tasks=[{
 exam:'daegudong',job:'personal-87311a760e702909b5a0fe1cd63004ca',n:3,score:4,unit:'99ca37c0-1df4-40b1-bd25-c2b0bbd7fcf1',
 content:String.raw`양수 $a$, $b$, $k$가 다음 세 조건을 모두 만족한다. $k$의 값은?

| 조건 | 식 |
| --- | --- |
| 첫째 | $\sqrt{3k}=a\sqrt3$ |
| 둘째 | $\sqrt5=\dfrac{b}{2\sqrt5}$ |
| 셋째 | $ab=8$ |`,
 choices:[0.08,0.16,0.64,0.8,6.4].map(x=>`$${x}$`),answer:'③',
 solution:String.raw`둘째 식의 양변에 $2\sqrt5$를 곱하면 $b=2\sqrt5\times\sqrt5=10$이다. 따라서 셋째 식에서 $10a=8$이므로 $a=\dfrac45$이다.

첫째 식에서 $\sqrt{3k}=\dfrac45\sqrt3$이다. 양변을 제곱하면 $3k=\dfrac{16}{25}\times3$이므로 $k=\dfrac{16}{25}=0.64$이다.

이때 $a=\dfrac45$, $b=10$, $k=\dfrac{16}{25}$는 모두 양수이다. 또한 $\left(\dfrac45\sqrt3\right)^2=\dfrac{48}{25}=3k$이고 $\dfrac45\sqrt3>0$이므로 첫째 식도 만족한다. 따라서 정답은 ③이다.`,
 concept:'근호를 포함한 두 배율 관계에서 근호의 곱셈·나눗셈과 양의 제곱근을 해석한다.',
 before:'근호 표현 두 쌍의 배율을 각각 구한 뒤 두 배율의 곱을 직접 계산한다.',
 after:'두 배율의 곱을 조건으로 주고, 먼저 배율을 역으로 결정한 뒤 처음 근호 안의 양수 매개변수를 찾는다.',
 method:'두 번째 배율 b=10 → 주어진 곱8에서 a=4/5 → 양의 제곱근 정의를 이용하여 k=16/25 → 세 조건에 다시 대입',
 proof:'분모2√5는 양수여서 0이 아니며 b10과 a4/5가 유일하다. 첫째 식의 양변은 양수여서 제곱 후 k16/25를 얻고 원식에 다시 대입하여 존재를 확인한다. 임의의 무리방정식 해법이나 상위 함수·역함수를 요구하지 않는다. 원문의 두 배율 관계는 유지하며 결과값을 묻는 대신 근호 안 입력을 역추론한다. 새 역추론의 실제 목표 난도는 별도 검수 전 보류다.',
 prerequisites:['양의 제곱근의 정의','근호를 포함한 식의 곱셈과 나눗셈','일차 관계에서 미지수 구하기','분수의 제곱'],codes:['9수01-07','9수01-10'],
 calc:{exactFractions:{a:{n:4,d:5},b:{n:10,d:1},k:{n:16,d:25},product:{n:8,d:1},radicand:{n:48,d:25}},positiveDomain:true,denominatorNonzero:true,substitutionPassed:true,unique:true,allChoicesCorrect:[false,false,true,false,false]}
},{
 exam:'daeguil',job:'personal-1c6091af710ddaaa7e6671a2ef018a1c',n:2,score:3,unit:'28032bdd-3db3-4788-9e7a-2f1909233fdb',
 content:String.raw`세 수를 아래와 같이 분류했다. 잘못 분류한 항목을 모두 고른 것은? (순환소수는 순환하는 부분의 처음과 끝 숫자 위에 점을 찍어 나타냈다.)

| 항목 | 수 | 분류 |
| --- | --- | --- |
| ㄱ | $\sqrt{0.16}$ | 무리수 |
| ㄴ | $0.\dot2\dot7$ | 무리수 |
| ㄷ | $\sqrt5$ | 무리수 |`,
 choices:['ㄱ','ㄴ','ㄱ, ㄴ','ㄱ, ㄷ','ㄴ, ㄷ'],answer:'③',
 solution:String.raw`ㄱ. $\sqrt{0.16}=0.4=\dfrac25$이므로 유리수이다. 무리수로 분류한 것이 잘못되었다.

ㄴ. $0.\dot2\dot7=0.272727\cdots=\dfrac{27}{99}=\dfrac3{11}$이므로 유리수이다. 순환소수는 소수점 아래에 숫자가 끝없이 이어져도 유리수이므로 이 분류도 잘못되었다.

ㄷ. $5$는 자연수의 제곱이 아니므로 $\sqrt5$는 무리수이다. 이 분류는 옳다.

따라서 잘못 분류한 항목은 ㄱ, ㄴ이고 정답은 ③이다.`,
 concept:'유한소수·순환소수로 나타낼 수 있는 유리수와 무리수의 뜻, 근호 표현만으로 무리수라고 판단할 수 없다는 점을 구별한다.',
 before:'유리수·무리수에 관한 일반 진술 다섯 개 중 옳은 진술을 고른다.',
 after:'근호·순환소수로 적힌 세 수의 분류 기록을 주고 잘못된 분류 두 개를 모두 찾아 바로잡는다.',
 method:'양의 제곱근을 계산하여 유한소수 확인 → 순환소수를 분수로 표현 → 제곱수가 아닌 자연수의 제곱근을 무리수로 구별',
 proof:'ㄱ은2/5, ㄴ은3/11로 각각 분모가0이 아닌 정수 비이다. ㄷ은중3에서 다루는 제곱수가 아닌 자연수의 제곱근 성질로 판단한다. 순환소수 점 표기를 본문에서 명시하며 유한소수와 순환소수의 성질은 중2 선수 개념이다. 무리수의 엄밀한 모순 증명이나 일반 무한급수를 필수로 요구하지 않는다. 원문 보기의 모든 부수 개념을 복제한 것은 아니며 핵심 유리수/무리수 구별의 난도 동등성은 별도 검수 전 보류다.',
 prerequisites:['유리수의 뜻','유한소수와 순환소수','순환소수를 분수로 나타내기','무리수의 뜻','제곱근의 뜻'],codes:['9수01-03','9수01-07','9수01-08'],
 calc:{rootDecimalExact:{radicand:{n:16,d:100},root:{n:2,d:5}},repeatingExact:{n:27,d:99},reducedRepeating:{n:3,d:11},classification:['rational','rational','irrational'],incorrectLabels:['ㄱ','ㄴ'],allChoicesCorrect:[false,false,true,false,false],floatingInfiniteSeriesUsed:false}
}];
fs.mkdirSync(out);for(const t of tasks){const folder=out+t.exam+'/';fs.mkdirSync(folder);const name=`q${String(t.n).padStart(2,'0')}`,staged=srcRoot+`source-only-input/${t.job}/${name}.json`,s=readJson(staged),component=s.sourceIdentityAsProvided.school+'-'+name,sc=source.components.find(x=>x.component===component),gc=grade.components.find(x=>x.component===component),unit=snapshot.units.find(x=>x.id===t.unit);assert.equal(sc.inferred.safeForPlanning,'component-data-consistent-as-provided');assert.equal(sc.sourceRecordSha256,ref(staged).sha256);assert.equal(sc.observed.printedScore,t.score);assert.equal(gc.capturedPrimaryUnitProposal.id,unit.id);assert.equal(s.sourceIdentityAsProvided.year,2025);assert.equal(unit.semester,1);
 const q=structuredClone(base);Object.assign(q,{questionNumber:t.n,twinExternalId:`exam-twin-${t.exam}-2025-1-mid-author-group2-r1-${name}`,content:t.content,choices:t.choices,answer:t.answer,solution:t.solution,score:t.score,figureArtifacts:[]});
 q.sourceReference={...base.sourceReference,externalId:`2025-${t.exam}-3-1-mid-${t.n}`,inventoryExamId:t.job,sourceQuestionNumber:t.n,newSourceReferenceId:`source-ref-${t.exam}-2025-1-mid-group2-r1-${name}`,sourceContentSha256:s.sourceContentDigest,questionOnlyStaged:ref(staged),sourceSchoolInternal:s.sourceIdentityAsProvided.school,extractionManifest:s.sourceBindings.manifest,sourceFiles:s.sourceBindings.inputs,originalIdentityReference:s.sourceBindings.original,sourceComponentEvidence:null,sourceComponentReview:{...ref(srcRoot+'own-source-component-review.json'),component},gradeMethodProposal:{...ref(srcRoot+'own-grade-method-proposals.json'),component}};
 q.variantDelta={modes:t.n===3?['inverse-target','structure','new-table']:['classification-repair','structure','new-table'],before:t.before,after:t.after,sharedConcept:t.concept,sharedProcedure:t.method,actualStructuralChange:t.after,domainProof:t.proof,difficultyBasis:'새 조건과 목표 난도 동등성은 독립 검수 전 저자 제안이며 자동 승인하지 않는다.'};
 q.curriculumReview={...base.curriculumReview,standardCodes:t.codes,officialPrimary:{...base.curriculumReview.officialPrimary,standard:t.codes.join(', '),actualScope:'2015 중3 1학기의 근호 계산/실수 분류. 중2 이하 선수 지식만 사용하며 현재 일곱 면 독립 학년 검수 전이다.'},legitimateMethodDraft:t.method,sevenSurfaces:Object.fromEntries(SURFACES.map(k=>[k,'author-proposed-independent-review-pending'])),independentReviewPending:true};
 q.metadata={...base.metadata,score:t.score,sourceDifficultyLabelObserved:s.difficultyLabelFromSource??null,problemTypeProposal:t.after,assignment:{status:'pending',unitId:unit.id,familyKey:null,currentUnit:unit,snapshot:ref(snapshotPath),evidence:'현재 캡처된 실제 Unit UUID와 성취기준을 연결한다. 새 역추론/분류 기록의 정확한 live family는 보류.'},prerequisiteUnits:[unit],placementConditions:{...base.metadata.placementConditions,requiresLearnedBeforeAssignment:t.prerequisites},figureAuthoring:{method:'new-native-Markdown-table',newFigures:0,newTables:1,originalCropEmbedded:false,pixelOracle:false,reproductionScript:script,reproductionScriptSha256:ref(script).sha256,renderingReviewPending:true},authorOnly:true,independentMathApproval:false,independentGradeApproval:false,sourceIdentityApproved:false,rightsApproved:false,similarityApproved:false,nativeProvenanceApproved:false,loadable:false};
 fs.writeFileSync(folder+name+'.json',JSON.stringify(q,null,2)+'\n',{flag:'wx'});const x=bindCandidate(folder+name+'.json');assert.deepEqual(x.validation.studentMathNotationWarnings,[]);assert.equal(x.validation.metadataAnswerFormatMismatch,false);fs.writeFileSync(folder+name+'-author-calculations-r1.json',JSON.stringify({...t.calc,candidateFileSha256:x.candidateFileSha256,studentDigest:x.studentDigest,candidateDigest:x.candidateDigest,assetDigest:x.assetDigest,unitId:unit.id,authorOnly:true,independentReview:false,dbWrites:0,loadable:0},null,2)+'\n',{flag:'wx'});
}
console.log(JSON.stringify({newDrafts:2,newTables:2,newFigures:0,canonicalSelectedUnchanged:157,allAuthoredIncludingFiveDrafts:162,independentMathAndGradePending:true,loadable:0,dbWrites:0}));
