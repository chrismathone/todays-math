import fs from 'node:fs';
import assert from 'node:assert/strict';
import {bindCandidate,readJson} from '../../../scripts/import/exam-twin/candidatePack.mjs';
const b='.qa-artifacts/exam-resume-20261008/',r=b+'nobyeon-sem1-authoring-group13-r1/',old=readJson(b+'nobyeon-sem1-authoring-r1/candidates/q06.json'),source=readJson(old.sourceReference.sourceManifest.path),q=source.questions.find(x=>x.number===3),snapshot=readJson(old.metadata.assignment.snapshot.path),unit=snapshot.units.find(x=>x.id==='28032bdd-3db3-4788-9e7a-2f1909233fdb'),rootUnit=snapshot.units.find(x=>x.id==='1682f01b-5293-4672-91cd-07fc02e305ac');assert(unit&&rootUnit);assert.equal(source.year,2025);assert.equal(source.originalAnswersExported,false);
// Exact intervals: all numbers are coefficient vectors of 1,sqrt2,sqrt3,sqrt7.
const rootBounds=[[2,14142,14143],[3,17320,17321],[7,26457,26458]];for(const[n,l,u]of rootBounds)assert(l*l<n*10000**2&&n*10000**2<u*u);
const bound=v=>{let lo=v[0]*10000,hi=lo;for(let i=1;i<4;i++){const[,l,u]=rootBounds[i-1];lo+=v[i]>=0?v[i]*l:v[i]*u;hi+=v[i]>=0?v[i]*u:v[i]*l;}return[lo,hi];};
const visible=[[-1,0,0,1],[0,-1,1,0],[1,0,0,0],[2,0,0,-1]],range=[-1,-1,0,2],expected=visible[0].map((v,i)=>v-range[i]),options=[[0,-1,0,1],[0,1,0,-1],[-1,1,0,0],[1,1,0,-1],[2,0,0,-1]];
assert.deepEqual(expected,[0,1,0,-1]);const intervals=options.map(bound);for(let i=0;i<5;i++)for(let j=i+1;j<5;j++)assert(intervals[i][1]<intervals[j][0]||intervals[j][1]<intervals[i][0]);
for(const v of visible.slice(1))assert(bound(visible[0])[0]>bound(v)[1]);for(const v of visible)assert(bound(expected)[1]<bound(v)[0]);assert(bound(range)[0]>0);assert.equal(options.findIndex(v=>JSON.stringify(v)===JSON.stringify(expected)),1);
const c={...old,questionNumber:3,twinExternalId:'exam-twin-nobyeon-2025-1-mid-author-group13-r1-q03',questionType:'객관식',score:4,
content:String.raw`다섯 실수를 적어 놓았는데, 그중 가장 작은 수 하나가 지워졌다. 남아 있는 네 수는 다음과 같다.

$$\sqrt7-1,\quad \sqrt3-\sqrt2,\quad 1,\quad 2-\sqrt7$$

원래 다섯 수 중 가장 큰 수에서 가장 작은 수를 뺀 값이 $2\sqrt7-\sqrt2-1$일 때, 지워진 수는?`,
choices:[String.raw`$\sqrt7-\sqrt2$`,String.raw`$\sqrt2-\sqrt7$`,String.raw`$\sqrt2-1$`,String.raw`$1+\sqrt2-\sqrt7$`,String.raw`$2-\sqrt7$`],answer:'②',figureArtifacts:[],
solution:String.raw`$\sqrt7>2$이므로 $\sqrt7-1>1$이고 $2-\sqrt7<0$이다. 또 $\sqrt3<2$, $\sqrt2>1$이므로 $\sqrt3-\sqrt2<1$이다. 따라서 남은 네 수 중 가장 큰 수는 $\sqrt7-1$이다. 지워진 수는 가장 작은 수였으므로 원래 다섯 수 중 가장 큰 수도 $\sqrt7-1$이다.

가장 큰 수에서 주어진 차이를 빼면 지워진 수이므로

$$ (\sqrt7-1)-(2\sqrt7-\sqrt2-1)=\sqrt2-\sqrt7 $$

이다. $\sqrt2<2$이므로 $\sqrt2-\sqrt7<2-\sqrt7<0$이다. 남은 다른 세 수는 모두 양수이므로 이 값은 실제로 남은 네 수보다 작다. 따라서 조건을 만족하는 지워진 수는 하나이며 정답은 ②이다.`,
sourceReference:{...old.sourceReference,sourceReferenceId:'source-ref-nobyeon-2025-1-mid-fresh-r6-q03',sourceContentSha256:q.sourceContentDigest,hwpAnchor:q.hwpAnchor},
variantDelta:{modes:['inverse-target','structure'],before:'다섯근호수중최댓값과최솟값을찾아둘의합을직접구한다.',after:'가장작은수가누락된네수의목록과최대·최소차이를주고누락값을복원한다.',sharedConcept:'근호를포함한실수의대소관계,최댓값·최솟값의의미,동류근호항의계산',sharedProcedure:'제곱근의대소와유리수경계로수들을비교→최댓값과최솟값의역할확인→주어진관계에대입해근호항계산',actualStructuralChange:'완성된자료에서극값합을출력하는문제에서,일부자료와극값관계를조건으로누락된최솟값을복원하는문제로바꾼다. 누락값이최솟값이라는조건을명시해임의중간값으로인한비유일성을막고복원뒤실제최솟값여부도검산한다.',domainProof:'모든근호의피제곱수는양수이다. 보이는네수의최댓값sqrt7-1은유일하고누락값이최솟값이라원래최댓값도동일하다. 주어진차이에서얻는sqrt2-sqrt7은2-sqrt7보다엄격히작고나머지는양수라존재·유일하다. 다섯선택지의정확유리수구간이모두서로겹치지않는다.',difficultyBasis:'원문 하/4점의근호대소·극값역할·근호항정리를유지한다. 역추론관계를추가하는대신보이는네수와작은정수경계만비교하게했다. 기본/4점은저자제안이며독립난도심사전승인하지않는다.'},
curriculumReview:{...old.curriculumReview,status:'author-proposed',standardCodes:['9수01-07','9수01-09','9수01-10'],officialBasis:{document:'MOE2020-236 Book8,2015 revised curriculum',documentSha256:'1cb1623f270b37ed88475237ce92989519fd1568cb20103d4850331a31419fcb',stream:'BodyText/Section0',primaryStandardCodes:['9수01-07','9수01-09','9수01-10']},legitimateMethodDraft:'양수제곱근과1·2의대소로수들을비교하고최댓값에서주어진차이를빼최솟값을복원한다. 함수극값·미분·절댓값방정식·고등무리식부등식정리는필수방법이아니다.',sevenSurfaces:{stem:'author-proposed',choices:'author-proposed',figureTable:'pure-algebra-list-no-figure-required',notation:'author-proposed',answer:'author-interval-and-exact-calculated-only',studentSolution:'author-proposed',prerequisites:'author-proposed'}},
metadata:{...old.metadata,questionType:'객관식',answerFormat:'single-choice',score:4,difficultyProposal:'기본',difficultyStatus:'author-proposed-independent-calibration-pending',sourceDifficultyLabelObserved:q.difficultyLabelFromSource,problemTypeProposal:'극값의 차이에서 누락 최솟값 복원',assignment:{status:'pending',unitId:unit.id,familyKey:null,currentUnit:unit,snapshot:old.metadata.assignment.snapshot,evidence:'실제무리수·실수UnitUUID및제곱근선수UUID를연결한다. 직접극값계산과누락최솟값복원전체목표가일치하는livefamily는실제정의확인전null.'},prerequisiteUnits:[rootUnit],placementConditions:{practiceAcademicYear:2026,curriculumEdition:'2015',grade:'중3',requiresLearnedBeforeAssignment:['양수제곱근의대소','실수의대소와근호항의사칙계산','최댓값·최솟값의일상적의미'],schoolMidtermPacingCertified:false,m3From2027:'pending-separate-2022-grade-placement-review'},figureAuthoring:{method:'pure-math-finite-list-no-figure-required',newTables:0,newFigures:0,originalCropEmbedded:false,pixelOracle:false,renderingReviewPending:true}}};
fs.mkdirSync(r);fs.mkdirSync(r+'candidates');const p=r+'candidates/q03.json';fs.writeFileSync(p,JSON.stringify(c,null,2)+'\n',{flag:'wx'});const x=bindCandidate(p);assert.deepEqual(x.validation.studentMathNotationWarnings,[]);
fs.writeFileSync(r+'author-calculations-q03.json',JSON.stringify({utc:new Date().toISOString(),candidate:{path:p,sha256:x.candidateFileSha256},studentDigest:x.studentDigest,candidateDigest:x.candidateDigest,assetDigest:x.assetDigest,coefficientBasis:['1','sqrt2','sqrt3','sqrt7'],rootBoundsDenominator:10000,rootBounds,visible,range,expected,optionCoefficientVectors:options,optionDisjointRationalBounds:intervals,correctChoice:2,authorOnly:true,independentReview:false,newFigures:0,newTables:0,loadable:0,dbWrites:0},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({authored:1,candidate:p,independentReview:0,loadable:0}));
