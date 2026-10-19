import fs from 'node:fs';
import assert from 'node:assert/strict';
import {bindCandidate,readJson} from '../../../scripts/import/exam-twin/candidatePack.mjs';
const b='.qa-artifacts/exam-resume-20261008/',r=b+'nobyeon-sem1-authoring-group16-r1/',old=readJson(b+'nobyeon-sem1-authoring-group14-r1/candidates/q04.json'),source=readJson(old.sourceReference.sourceManifest.path),q=source.questions.find(x=>x.number===7),snapshot=readJson(old.metadata.assignment.snapshot.path),unit=snapshot.units.find(x=>x.id==='28032bdd-3db3-4788-9e7a-2f1909233fdb'),rootUnit=snapshot.units.find(x=>x.id==='1682f01b-5293-4672-91cd-07fc02e305ac');
assert(unit&&rootUnit);assert.equal(source.year,2025);assert.equal(source.originalAnswersExported,false);
const baseFacts=[{id:'sqrt2',irr:true,negative:false,nonIntegerRational:false},{id:'negative-sqrt3',irr:true,negative:true,nonIntegerRational:false},{id:'sqrt8-minus2',irr:true,negative:false,nonIntegerRational:false},{id:'negative3',irr:false,negative:true,nonIntegerRational:false},{id:'zero',irr:false,negative:false,nonIntegerRational:false},{id:'sqrt16',irr:false,negative:false,nonIntegerRational:false},{id:'periodic6',irr:false,negative:false,nonIntegerRational:true},{id:'negative125-over100',irr:false,negative:true,nonIntegerRational:true},{id:'sqrt9-over16',irr:false,negative:false,nonIntegerRational:true}];
const options=[{id:'sqrt25-minus5',irr:false,negative:false,nonIntegerRational:false},{id:'sqrt081',irr:false,negative:false,nonIntegerRational:true},{id:'negative-sqrt49',irr:false,negative:true,nonIntegerRational:false},{id:'sqrt5-minus1',irr:true,negative:false,nonIntegerRational:false},{id:'2-minus-sqrt7',irr:true,negative:true,nonIntegerRational:false}],keys=['irr','negative','nonIntegerRational'],count=xs=>keys.map(k=>xs.filter(x=>x[k]).length),target=[4,4,3],optionCounts=options.map(o=>count([...baseFacts,o]));
assert.deepEqual(count(baseFacts),[3,3,3]);assert.deepEqual(optionCounts,[[3,3,3],[3,3,4],[3,4,3],[4,3,3],[4,4,3]]);assert.deepEqual(optionCounts.flatMap((c,i)=>c.every((v,j)=>v===target[j])?[i+1]:[]),[5]);assert(8>2**2&&7>2**2&&5>1**2);assert.equal(3*3,9);assert.equal(4*4,16);
const c={...old,questionNumber:7,twinExternalId:'exam-twin-nobyeon-2025-1-mid-author-group16-r1-q07',questionType:'객관식',score:5,
content:String.raw`다음 아홉 수에 수 $x$ 하나를 더하여 열 개의 수를 만들려고 한다.

$\sqrt2,\ -\sqrt3,\ \sqrt8-2,\ -3,\ 0,\ \sqrt{16},\ 0.\dot6,\ -1.25,\ \sqrt{\frac9{16}}$

열 개의 수 중 무리수는 $4$개, 음수는 $4$개, 정수가 아닌 유리수는 $3$개가 되도록 하는 $x$는? (단, $0.\dot6=0.666\ldots$이다.)`,
choices:[String.raw`$\sqrt{25}-5$`,String.raw`$\sqrt{0.81}$`,String.raw`$-\sqrt{49}$`,String.raw`$\sqrt5-1$`,String.raw`$2-\sqrt7$`],answer:'⑤',figureArtifacts:[],
solution:String.raw`주어진 아홉 수를 먼저 분류한다.

무리수는 $\sqrt2$, $-\sqrt3$, $\sqrt8-2$의 $3$개이다. $\sqrt8>2$이므로 $\sqrt8-2$는 양수이다. 음수는 $-\sqrt3$, $-3$, $-1.25$의 $3$개이다.

$\sqrt{16}=4$, $0.\dot6=\frac23$, $\sqrt{\frac9{16}}=\frac34$이다. 따라서 정수가 아닌 유리수는 $0.\dot6$, $-1.25$, $\sqrt{\frac9{16}}$의 $3$개이다. $0$은 정수이며 음수가 아니다.

수를 하나 추가한 뒤에는 무리수와 음수가 각각 하나씩 늘어야 하고, 정수가 아닌 유리수의 개수는 그대로여야 한다. 따라서 추가할 수는 음수인 무리수여야 한다.

① $\sqrt{25}-5=0$은 정수이다.

② $\sqrt{0.81}=0.9$는 양수인 유리수이며 정수가 아니다.

③ $-\sqrt{49}=-7$은 음수인 정수이다.

④ $\sqrt5-1$은 양수인 무리수이다.

⑤ $2-\sqrt7$은 음수인 무리수이다. $7>4$이므로 $\sqrt7>2$이다. 또 $2-\sqrt7$이 유리수라면 $2$에서 그 수를 뺀 $\sqrt7$도 유리수가 되어 모순이므로 무리수이다.

따라서 정답은 ⑤이다. 이 수를 추가하면 무리수 $4$개, 음수 $4$개, 정수가 아닌 유리수 $3$개가 되어 세 조건을 모두 만족한다.`,
sourceReference:{...old.sourceReference,sourceReferenceId:'source-ref-nobyeon-2025-1-mid-fresh-r6-q07',sourceContentSha256:q.sourceContentDigest,hwpAnchor:q.hwpAnchor},
variantDelta:{modes:['inverse-target','structure','data-reorganization'],before:'완성된열수의분류개수a,b,c를세고a²+b-c를출력한다.',after:'불완전한아홉수목록과최종분류개수를주고빠진자료x를선택한다.',sharedConcept:'근호·유한/순환소수의유리수/무리수분류,정수포함관계,실수부호와중첩개수',sharedProcedure:'근호와소수표현간단화→무리수·음수·정수아닌유리수각각분류→겹침을허용하여개수계산→분류개수조건검산',actualStructuralChange:'원문의출력분류개수를새조건으로옮기고열번째수자체를질문대상으로바꿨다. 기존완성목록에서파생식하나를계산하는대신개수의부족분으로추가자료의유형을역추론한다. 단순숫자교체를완료근거로삼지않는다.',domainProof:'모든피제곱수는비음수이며분모16은양수이다. 9개기본분류개수는[3,3,3],목표는[4,4,3]이므로추가자료는음의무리수이어야한다. 다섯선택지추가후개수벡터는[3,3,3],[3,3,4],[3,4,3],[4,3,3],[4,4,3]으로목표는⑤만만족한다. 서로겹치는범주를분리합계로오해하지않는다.',difficultyBasis:'원문중/5점의다중표현간단화·세분류·중첩개수를유지하면서입력복원을추가했다. 순환소수표기를명시하고학생수준의부호·유리수정의만쓴다. 표준/5점은독립난도검토전제안이다.'},
curriculumReview:{...old.curriculumReview,status:'author-proposed',standardCodes:['9수01-07','9수01-08','9수01-09','9수01-10'],officialBasis:{...old.curriculumReview.officialBasis,primaryStandardCodes:['9수01-07','9수01-08','9수01-09','9수01-10']},legitimateMethodDraft:'순환소수·제곱근을배운뒤양수제곱비교와유리수·무리수정의로각수를분류한다. 개수의증감을세어추가수의범주를찾는다. 무리수표현검산에기존유리수의덧셈/뺄셈성질만쓰며집합기호·확률·고등무리방정식·미적분은필요없다.',sevenSurfaces:{stem:'author-proposed',choices:'author-proposed',figureTable:'no-figure-or-table-required',notation:'author-proposed',answer:'author-exact-classification-only',studentSolution:'author-proposed',prerequisites:'author-proposed'}},
metadata:{...old.metadata,questionType:'객관식',answerFormat:'single-choice',score:5,difficultyProposal:'표준',difficultyStatus:'author-proposed-independent-calibration-pending',sourceDifficultyLabelObserved:q.difficultyLabelFromSource,problemTypeProposal:'분류별 개수에서 누락 실수 복원',assignment:{status:'pending',unitId:unit.id,familyKey:null,currentUnit:unit,snapshot:old.metadata.assignment.snapshot,evidence:'실제무리수·실수UnitUUID와제곱근선수UUID를연결한다. 중첩분류개수로누락자료를복원하는전체목표의livefamily는확인전null.'},prerequisiteUnits:[rootUnit],namedPrerequisitesWithoutCapturedUuid:['중1정수·유리수와부호','중2유한소수·순환소수'],placementConditions:{practiceAcademicYear:2026,curriculumEdition:'2015',grade:'중3',requiresLearnedBeforeAssignment:['정수·유리수포함관계','유한/순환소수와유리수','제곱근의성질과무리수','실수의대소·근호계산'],schoolMidtermPacingCertified:false,m3From2027:'pending-separate-2022-grade-placement-review'},figureAuthoring:{method:'pure-number-list-no-figure-required',newTables:0,newFigures:0,originalCropEmbedded:false,pixelOracle:false,renderingReviewPending:true}}};
fs.mkdirSync(r);fs.mkdirSync(r+'candidates');const p=r+'candidates/q07.json';fs.writeFileSync(p,JSON.stringify(c,null,2)+'\n',{flag:'wx'});const x=bindCandidate(p);assert.deepEqual(x.validation.studentMathNotationWarnings,[]);assert.equal(x.validation.metadataAnswerFormatMismatch,false);
fs.writeFileSync(r+'author-calculations-q07.json',JSON.stringify({utc:new Date().toISOString(),candidate:{path:p,sha256:x.candidateFileSha256},studentDigest:x.studentDigest,candidateDigest:x.candidateDigest,assetDigest:x.assetDigest,baseFacts,baseCounts:count(baseFacts),options,target,optionCounts,correctChoice:5,classificationCountersOverlap:true,authorOnly:true,independentReview:false,newFigures:0,newTables:0,loadable:0,dbWrites:0},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({authored:1,candidate:p,independentReview:0,loadable:0}));
