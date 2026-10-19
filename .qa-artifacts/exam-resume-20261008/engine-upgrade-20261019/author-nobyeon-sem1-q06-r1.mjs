import fs from 'node:fs';
import assert from 'node:assert/strict';
import {bindCandidate,readJson,sha256} from '../../../scripts/import/exam-twin/candidatePack.mjs';
const base='.qa-artifacts/exam-resume-20261008/';
const manifestPath=base+'fresh-source-extraction-20261019-r6/personal-651da9aa806ce1c9d1c3ae5539e6038f/source-manifest.local.json';
const source=readJson(manifestPath), question=source.questions.find(q=>q.number===6);
assert.equal(source.year,2025); assert.equal(source.semester,1); assert.equal(source.originalAnswersExported,false);
const snapshotPath=base+'engine-upgrade-20261019/live-family-snapshot-r1.json',snapshot=readJson(snapshotPath);
const unit=snapshot.units.find(u=>u.id==='28032bdd-3db3-4788-9e7a-2f1909233fdb');
const family=snapshot.liveFamilies.find(f=>f.family_key==='mid:3-1|무리수와 실수|09');
assert(unit&&family&&family.unit_id===unit.id);
const ref=path=>({path,sha256:sha256(fs.readFileSync(path))});
const root=base+'nobyeon-sem1-authoring-r1/';fs.mkdirSync(root);fs.mkdirSync(root+'candidates');
const ns=[510,511,512,513,514];
// Independent exact rounding of each freshly authored table cell: compare squared half steps.
const roundedRoots=ns.map(n=>{
  const N=BigInt(n)*1000000n,D=100n;
  let k=0n;while((k+1n)*(k+1n)*D<=N)k++;
  return Number(k+(4n*N>=D*(2n*k+1n)**2n?1n:0n));
});
assert.deepEqual(roundedRoots,[2258,2261,2263,2265,2267]);
const resultHundredths=roundedRoots.map(k=>k+2300);
assert.equal(resultHundredths.filter(n=>n===4563).length,1);
const table='|$x$|$5.10$|$5.11$|$5.12$|$5.13$|$5.14$|\n|:---:|:---:|:---:|:---:|:---:|:---:|\n|$\\sqrt{x}$의 근삿값|$2.258$|$2.261$|$2.263$|$2.265$|$2.267$|';
const candidate={schemaVersion:1,questionNumber:6,twinExternalId:'exam-twin-nobyeon-2025-1-mid-author-r1-q06',authorId:'codex-parent-engine-upgrade-20261019',questionType:'객관식',score:4,
 content:'다음은 제곱근표의 일부이다.\n\n'+table+'\n\n표에 있는 다섯 수 중 하나를 $x$라 하자. 두 양수 $a,b$가 $a^{2}=\\dfrac{x}{100}$, $b^{2}=529$를 만족한다. 표에 실린 소수값을 그대로 이용해 $a$의 근삿값을 구한 뒤, 그 값으로 $100a+b$를 계산하였더니 $45.63$을 얻었다. 선택한 $x$의 값은?',
 choices:['$5.10$','$5.11$','$5.12$','$5.13$','$5.14$'],answer:'③',
 solution:'$b$는 양수이고 $b^{2}=529$이므로 $b=23$이다.\n\n표에 실린 $\\sqrt{x}$의 근삿값을 $s$라 하면, $a>0$이고 $a^{2}=x/100$이므로 $a=\\sqrt{x}/10$이다. 따라서 표를 이용해 구한 $a$의 근삿값은 $s/10$이다.\n\n이 값으로 계산한 결과가 $45.63$이므로 $100\\times(s/10)+23=45.63$, 즉 $10s=22.63$에서 $s=2.263$이다.\n\n표에서 $2.263$에 대응하는 수는 $5.12$ 하나뿐이다. 따라서 선택한 $x$의 값은 $5.12$이다. 여기서 $2.263$은 표의 근삿값이며 실제 제곱근과 정확히 같다고 놓은 것이 아니다.',
 figureArtifacts:[],
 sourceReference:{sourceReferenceId:'source-ref-nobyeon-2025-1-mid-fresh-r6-q06',inventoryExamId:source.inventoryExamId,sourceSchoolInternal:'노변중학교',sourceExamYear:2025,sourceExamSemester:1,sourceContentSha256:question.sourceContentDigest,
  sourceManifest:ref(manifestPath),sourceFiles:source.inputs,originalIdentitySource:source.originalIdentitySource,hwpAnchor:question.hwpAnchor,
  originalHeaderObservation:ref(base+'fresh-source-extraction-20261019-r6/reviewer-observations-r1.json'),
  actualReference:'Original header date2025-04-29 observed earlier;2026 preparation footer is separate. This component has not received original/body/whole-pair identity certification.',
  originalAnswerKeyUsed:false,sourceTextCopiedToCandidate:false,sourceCropViewed:false,sourceBodyVisualCorrespondence:'pending-N-original-access'},
 variantDelta:{modes:['inverse-target','structure','data-reorganization'],before:'표를 읽고 자릿수를 이동하여 두 제곱근을 구한 뒤 결합식의 값을 직접 묻는다.',
  after:'결합식의 계산 결과와 양수의 제곱 관계를 제시하고, 새로 계산한 다섯 열의 표에서 선택했던 입력 수를 역으로 찾는다.',
  sharedConcept:'양의 제곱근, 제곱근표 읽기, 근호 안의100배 변화와 밖의10배 변화, 소수 근삿값 계산',
  sharedProcedure:'완전제곱수의 양의 제곱근 →100분의1인 피제곱수의 제곱근은10분의1 →결합식 계산과 제곱근표 대응',
  actualStructuralChange:'출력값 직접 계산에서 주어진 출력으로 표의 입력 열을 되찾는 문제로 질문 대상을 역전했다. 원문의 다단 표를 새 단일 행5열로 재조직했다. 숫자 교체만으로 완료한 것이 아니다.',
  domainProof:'x는 표의 다섯 양수 중 하나로 제한한다. 각 x에서 a,b는 양수 조건으로 하나씩 정해진다. 표의 소수값으로 계산한 결과는45.58,45.61,45.63,45.65,45.67로 서로 달라 선택이 유일하다. 실제 근호값과 반올림된 표 값을 혼동하지 않는다.',
  difficultyBasis:'원문의 표 읽기·자릿수 변화·양의 제곱근·결합식 계산을 유지한다. 결합식을 거꾸로 계산하는 중1 일차식 수준의 한 단계를 추가하며 목표 난이도 동등성은 독립 검토 대기.'},
 curriculumReview:{grade:'중3',edition:'2015',status:'author-proposed',standardCodes:['9수01-07','9수01-10'],
  officialBasis:{document:'MOE2020-236 Book8,2015 revised curriculum',documentSha256:'1cb1623f270b37ed88475237ce92989519fd1568cb20103d4850331a31419fcb',stream:'BodyText/Section0',records1based:[3776,3788]},
  legitimateMethodDraft:'양수의 제곱근과100배 자릿수 관계, 완전제곱수와 일차식 역산만 사용한다. 근삿값 표는 정확한 근호 등식으로 쓰지 않는다.',
  sevenSurfaces:{stem:'author-proposed',choices:'author-proposed',figureTable:'fresh exact-cell rounding checked;native table rendering pending',notation:'author-proposed',answer:'author-calculated-only',studentSolution:'author-proposed',prerequisites:'author-proposed'},
  independentReviewPending:true,authorCannotApprove:true,sourceEraBasis:'2025/2026 M3 uses2015;2027+M3/2022 requires separate review'},
 metadata:{grade:'중3',subject:'수학',curriculum:{sourceExam:'2015',target:'2015',grade:'중3',sourceExamSemester:1,republicationTo2022:'requires-separate-review'},sourceExamYear:2025,sourceExamSemester:1,sourceExamRound:'중간',questionType:'객관식',answerFormat:'single-choice',score:4,
  source:'transformed',originProblemId:null,difficultyProposal:'응용',difficultyStatus:'author-proposed-independent-calibration-pending',problemTypeProposal:'계산',problemTypeStatus:'author-proposed',
  assignment:{status:'pending',unitId:unit.id,familyKey:null,currentUnit:unit,familyCandidate:family,snapshot:ref(snapshotPath),evidence:'실제 Unit UUID와 live 표 읽기09를 연결했다. 입력 열을 되찾는 목적과 전체 풀이의 family 적합성은 독립 검토 전 확정하지 않는다.'},
  schoolSubstitution:{visibleSchoolNames:[],replacementRequired:false,reason:'본문·보기·표·해설에 학교명이 없다. 실제 출처 학교는 내부 메타데이터에만 보존한다.'},
  figureAuthoring:{method:'fresh-native-markdown-table',newTables:1,newFigures:0,originalCropEmbedded:false,pixelOracle:false,renderingReviewPending:true},
  authorOnly:true,independentMathApproval:false,independentGradeApproval:false,sourceIdentityApproved:false,rightsApproved:false,similarityApproved:false,nativeProvenanceApproved:false,loadable:false}
};
const p=root+'candidates/q06.json';fs.writeFileSync(p,JSON.stringify(candidate,null,2)+'\n',{flag:'wx'});
const bound=bindCandidate(p);
fs.writeFileSync(root+'author-calculations-q06.json',JSON.stringify({kind:'author-only-nobyeon-sem1-q06-calculation/v1',utc:new Date().toISOString(),source:ref(manifestPath),tableRadicandHundredths:ns,roundedRootThousandths:roundedRoots,resultHundredths,uniqueResult4563:true,newCandidate:ref(p),studentDigest:bound.studentDigest,assetDigest:bound.assetDigest,candidateDigest:bound.candidateDigest,independentReview:false,newTables:1,loadable:0,dbWrites:0},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({candidate:p,id:candidate.twinExternalId,newAuthored:1,newTables:1,independentReview:0,loadable:0}));
