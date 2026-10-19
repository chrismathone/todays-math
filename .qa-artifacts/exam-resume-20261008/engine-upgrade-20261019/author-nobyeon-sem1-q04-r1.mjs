import fs from 'node:fs';
import assert from 'node:assert/strict';
import {bindCandidate,readJson} from '../../../scripts/import/exam-twin/candidatePack.mjs';
const b='.qa-artifacts/exam-resume-20261008/',r=b+'nobyeon-sem1-authoring-group14-r1/',old=readJson(b+'nobyeon-sem1-authoring-r1/candidates/q06.json'),source=readJson(old.sourceReference.sourceManifest.path),q=source.questions.find(x=>x.number===4),snapshot=readJson(old.metadata.assignment.snapshot.path),unit=snapshot.units.find(x=>x.id==='99ca37c0-1df4-40b1-bd25-c2b0bbd7fcf1'),rootUnit=snapshot.units.find(x=>x.id==='1682f01b-5293-4672-91cd-07fc02e305ac');assert(unit&&rootUnit);assert.equal(source.year,2025);assert.equal(source.originalAnswersExported,false);
const a=4-1,total=16,bValue=total-a*a,answers=[{coefficient:1,radicand:7},{coefficient:2,radicand:3},{coefficient:1,radicand:13},{coefficient:5,radicand:1},{coefficient:1,radicand:3}],squares=answers.map(x=>x.coefficient**2*x.radicand);assert.equal(a,3);assert.equal(bValue,7);assert.equal(new Set(squares).size,5);assert.deepEqual(squares.map((x,i)=>x===bValue?i+1:null).filter(Boolean),[1]);assert(answers.every(x=>x.coefficient>0&&x.radicand>0));
const c={...old,questionNumber:4,twinExternalId:'exam-twin-nobyeon-2025-1-mid-author-group14-r1-q04',questionType:'객관식',score:4,
content:String.raw`유리수 $a,b$가 $\sqrt{48}-\sqrt3=a\sqrt3$, $a^2+b=16$을 만족하고 $b>0$이다. 다음 중 $\sqrt b$와 같은 수는?`,
choices:[String.raw`$\sqrt{28}-\sqrt7$`,String.raw`$\sqrt{48}-\sqrt{12}$`,String.raw`$\sqrt{52}-\sqrt{13}$`,String.raw`$\sqrt{100}-\sqrt{25}$`,String.raw`$\sqrt{12}-\sqrt3$`],answer:'①',figureArtifacts:[],
solution:String.raw`$\sqrt{48}=4\sqrt3$이므로 $\sqrt{48}-\sqrt3=3\sqrt3$이다. $\sqrt3$은 $0$이 아니므로 $a=3$이다. 따라서 $a^2=9$이고 $9+b=16$에서 $b=7>0$이다. 그러므로 구하는 수는 $\sqrt7$이다.

① $\sqrt{28}-\sqrt7=2\sqrt7-\sqrt7=\sqrt7$

② $\sqrt{48}-\sqrt{12}=4\sqrt3-2\sqrt3=2\sqrt3$

③ $\sqrt{52}-\sqrt{13}=2\sqrt{13}-\sqrt{13}=\sqrt{13}$

④ $\sqrt{100}-\sqrt{25}=10-5=5$

⑤ $\sqrt{12}-\sqrt3=2\sqrt3-\sqrt3=\sqrt3$

다섯 값은 모두 양수이며 제곱하면 차례로 $7,12,13,25,3$으로 서로 다르다. 따라서 $\sqrt7$과 같은 값은 ① 하나뿐이다. 두 조건에서 $a=3$, $b=7$이 유일하게 정해지고 모두 유리수이므로 주어진 조건에도 맞는다.`,
sourceReference:{...old.sourceReference,sourceReferenceId:'source-ref-nobyeon-2025-1-mid-fresh-r6-q04',sourceContentSha256:q.sourceContentDigest,hwpAnchor:q.hwpAnchor},
variantDelta:{modes:['inverse-target','structure'],before:'두근호식에서a,b를구한뒤a²+b의값을계산한다.',after:'한근호식과a²+b의결과를조건으로주고b를역으로복원한뒤√b와동치인새근호식을선택한다.',sharedConcept:'근호의성질과동류근호항의계산,유리수계수의식별,제곱과덧셈의관계',sharedProcedure:'근호를간단히정리→계수a식별→a²계산→b와합의관계확인→다른근호식을같은형태로정리',actualStructuralChange:'원문의최종계산값a²+b를새조건으로옮겨b복원의입력으로쓰고,원문의b관계식은고르는질문대상으로바꾼다. 단순숫자교체나문장순서치환만을완료근거로삼지않는다.',domainProof:'모든선택지의피제곱수는양수이고a=3,b=7이유일하다. b>0과a,b유리수조건을만족한다. 선택지값도모두양수이고그제곱7,12,13,25,3이서로달라동치중복이없으며정답은하나이다.',difficultyBasis:'원문 하/4점의근호간단화·계수식별·제곱·합관계를유지한다. 합의결과를조건으로옮겨덧셈의역연산을쓰고다섯근호식중동치값을고르게했다. 기본/4점은독립난도검토전제안이다.'},
curriculumReview:{...old.curriculumReview,status:'author-proposed',standardCodes:['9수01-07','9수01-10'],officialBasis:{document:'MOE2020-236 Book8,2015 revised curriculum',documentSha256:'1cb1623f270b37ed88475237ce92989519fd1568cb20103d4850331a31419fcb',stream:'BodyText/Section0',primaryStandardCodes:['9수01-07','9수01-10']},legitimateMethodDraft:'근호의양수성·제곱근성질로간단히정리하고같은근호의계수를비교한다. 정수제곱과덧셈의역연산으로b를구한다. 근호항의덧셈·뺄셈과양수제곱을이용해보기정오를판정하며고등항등식·무리방정식이나함수도구는필요하지않다.',sevenSurfaces:{stem:'author-proposed',choices:'author-proposed',figureTable:'no-figure-or-table-required',notation:'author-proposed',answer:'author-exact-calculated-only',studentSolution:'author-proposed',prerequisites:'author-proposed'}},
metadata:{...old.metadata,questionType:'객관식',answerFormat:'single-choice',score:4,difficultyProposal:'기본',difficultyStatus:'author-proposed-independent-calibration-pending',sourceDifficultyLabelObserved:q.difficultyLabelFromSource,problemTypeProposal:'근호 계수와 주어진 합에서 미지 관계식 복원',assignment:{status:'pending',unitId:unit.id,familyKey:null,currentUnit:unit,snapshot:old.metadata.assignment.snapshot,evidence:'실제근호계산UnitUUID와제곱근뜻·성질선수UUID를연결한다. 알려진합에서b를복원하고동치근호식을고르는전체목표와일치하는livefamily는확인전null.'},prerequisiteUnits:[rootUnit],placementConditions:{practiceAcademicYear:2026,curriculumEdition:'2015',grade:'중3',requiresLearnedBeforeAssignment:['제곱근의성질과양수성','근호의사칙계산과동류근호항','정수제곱과덧셈의역연산'],schoolMidtermPacingCertified:false,m3From2027:'pending-separate-2022-grade-placement-review'},figureAuthoring:{method:'pure-algebra-no-figure-required',newTables:0,newFigures:0,originalCropEmbedded:false,pixelOracle:false,renderingReviewPending:true}}};
fs.mkdirSync(r);fs.mkdirSync(r+'candidates');const p=r+'candidates/q04.json';fs.writeFileSync(p,JSON.stringify(c,null,2)+'\n',{flag:'wx'});const x=bindCandidate(p);assert.deepEqual(x.validation.studentMathNotationWarnings,[]);
fs.writeFileSync(r+'author-calculations-q04.json',JSON.stringify({utc:new Date().toISOString(),candidate:{path:p,sha256:x.candidateFileSha256},studentDigest:x.studentDigest,candidateDigest:x.candidateDigest,assetDigest:x.assetDigest,a,b:bValue,total,positiveOptionRadicals:answers,exactOptionSquares:squares,correctChoice:1,semanticDuplicateOptions:0,authorOnly:true,independentReview:false,newFigures:0,newTables:0,loadable:0,dbWrites:0},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({authored:1,candidate:p,independentReview:0,loadable:0}));
