import fs from 'node:fs';
import assert from 'node:assert/strict';
import {bindCandidate,readJson,sha256} from '../../../scripts/import/exam-twin/candidatePack.mjs';
const base='.qa-artifacts/exam-resume-20261008/',root=base+'nobyeon-sem1-authoring-group2-r1/';
const old=readJson(base+'nobyeon-sem1-authoring-r1/candidates/q06.json');
const source=readJson(old.sourceReference.sourceManifest.path),q=source.questions.find(q=>q.number===8);
assert.equal(source.year,2025);assert.equal(source.semester,1);assert.equal(source.originalAnswersExported,false);
const snapshot=readJson(old.metadata.assignment.snapshot.path),unit=snapshot.units.find(u=>u.id==='1682f01b-5293-4672-91cd-07fc02e305ac');
const families=snapshot.liveFamilies.filter(f=>f.unit_id===unit.id&&['mid:3-1|제곱근의 뜻과 성질|08','mid:3-1|제곱근의 뜻과 성질|09'].includes(f.family_key));assert.equal(families.length,2);
const candidate={...old,questionNumber:8,twinExternalId:'exam-twin-nobyeon-2025-1-mid-author-group2-r1-q08',score:5,
 content:'실수 $x$에 대하여, 한 변의 길이가 양수인 두 정사각형 A, B의 넓이는 다음 표와 같다.\n\n|정사각형|A|B|\n|:---:|:---:|:---:|\n|넓이($\\mathrm{cm}^{2}$)|$(x+2)^{2}$|$(2x-3)^{2}$|\n\nA의 한 변의 길이가 B의 한 변의 길이보다 $2\\,\\mathrm{cm}$ 길다고 한다. 이를 만족시키는 모든 $x$의 값의 합은?',
 choices:['$1$','$2$','$3$','$4$','$6$'],answer:'④',figureArtifacts:[],
 solution:'정사각형의 한 변의 길이는 넓이의 양의 제곱근이다. 따라서 A, B의 한 변의 길이는 각각 $\\sqrt{(x+2)^{2}}=|x+2|$, $\\sqrt{(2x-3)^{2}}=|2x-3|$ (단위: $\\mathrm{cm}$)이다. 두 길이가 양수이므로 $x\\ne-2$, $x\\ne\\dfrac32$이다.\n\n$x<-2$일 때, 두 길이의 차는 $(-x-2)-(3-2x)=x-5$이다. $x-5=2$에서 $x=7$이지만 주어진 범위에 맞지 않으므로 해가 아니다.\n\n$-2<x<\\dfrac32$일 때, 두 길이의 차는 $(x+2)-(3-2x)=3x-1$이다. $3x-1=2$에서 $x=1$이고, 이 값은 해당 범위에 속한다.\n\n$x>\\dfrac32$일 때, 두 길이의 차는 $(x+2)-(2x-3)=5-x$이다. $5-x=2$에서 $x=3$이고, 이 값은 해당 범위에 속한다.\n\n$x=1$이면 두 길이는 $3$, $1$이고, $x=3$이면 $5$, $3$이므로 두 경우 모두 A가 B보다 $2$ 길다. 따라서 가능한 값은 $1,3$뿐이고 그 합은 $4$이다.',
 sourceReference:{...old.sourceReference,sourceReferenceId:'source-ref-nobyeon-2025-1-mid-fresh-r6-q08',sourceContentSha256:q.sourceContentDigest,hwpAnchor:q.hwpAnchor},
 variantDelta:{modes:['representation','inverse-target','structure'],before:'두 완전제곱식의 제곱근 차를 주고 세 구간에서 간단히 한 식에 대한 옳은 진술들을 고른다.',after:'두 제곱식을 정사각형의 넓이로 표현하고, 한 변 길이의 차를 조건으로 주어 가능한 입력값들을 구한다.',
  sharedConcept:'완전제곱식의 양의 제곱근은 절댓값이며, 문자의 범위에 따라 부호를 나누어 해석한다.',sharedProcedure:'부호가 바뀌는 두 경계 구분 →각 범위의 양의 제곱근을 일차식으로 표현 →조건을 대조하고 원범위 확인',
  actualStructuralChange:'구간별 결과 식의 정오 판정에서, 주어진 길이 차를 만드는 모든 입력을 역으로 구하는 문제로 바꿨다. 대수의 근호 차는 두 정사각형의 변 길이 차로 표현했다. 숫자·명칭 교체만으로 차이를 주장하지 않는다.',
  domainProof:'넓이의 양수 조건으로x=-2,3/2를 제외한다. 나머지 세 열린 구간은 정의역 전체를 빠짐없이 나눈다. 각 구간에서 얻는 선형 방정식의 후보7,1,3 중 원범위에 맞는 것은1,3뿐이며 양의 실제 길이를 다시 대입 확인했다.',
  difficultyBasis:'세 구간의 부호 판정과 제곱근의 성질을 유지하며 구간별 일차식 계산을 역으로 수행한다. 새 요구는 중1 일차방정식과 정사각형 넓이의 양의 제곱근이며 상위 학년 개념은 쓰지 않는다. 목표 난이도/5점 적절성은 독립 검토 대기.'},
 curriculumReview:{...old.curriculumReview,standardCodes:['9수01-07','9수01-10','9수02-05'],status:'author-proposed',
  legitimateMethodDraft:'정사각형의 넓이에서 양의 변 길이와절댓값을 구하고, 세 구간을 나누어 일차방정식을 푼 뒤 원범위와양수조건을 검사한다. 삼각비·근의 공식·도형비례 정리는 필요 없다.',
  sevenSurfaces:{stem:'author-proposed',choices:'author-proposed',figureTable:'fresh native area table; no scale-dependent drawing required',notation:'author-proposed',answer:'author-calculated-only',studentSolution:'author-proposed',prerequisites:'author-proposed'}},
 metadata:{...old.metadata,score:5,problemTypeProposal:'개념',difficultyProposal:'응용',difficultyStatus:'author-proposed-independent-calibration-pending',
  assignment:{status:'pending',unitId:unit.id,familyKey:null,currentUnit:unit,familyCandidates:families,snapshot:old.metadata.assignment.snapshot,evidence:'실제 제곱근 성질 Unit UUID와live08/09를 연결한다. 여러 구간 전체를 거치는 입력 역추론과 기하 표현에 어느family가 맞는지 독립 판단 전 배정하지 않는다.'},
  figureAuthoring:{method:'fresh-native-markdown-area-table',newTables:1,newFigures:0,originalCropEmbedded:false,pixelOracle:false,renderingReviewPending:true}}};
// Only author-side arithmetic. Independent no-exposure solve and all7surface review are still required.
const cases=[{range:'x<-2',m:1,b:-5,candidate:7,accepted:false},{range:'-2<x<3/2',m:3,b:-1,candidate:1,accepted:true},{range:'x>3/2',m:-1,b:5,candidate:3,accepted:true}];
for(const row of cases){assert.equal(row.m*row.candidate+row.b,2);const x=row.candidate;assert.equal(row.accepted,row.range==='x<-2'?x<-2:row.range==='x>3/2'?x>1.5:x>-2&&x<1.5);}
const accepted=cases.filter(c=>c.accepted).map(c=>c.candidate);assert.deepEqual(accepted,[1,3]);
for(const x of accepted){assert((x+2)**2>0&&(2*x-3)**2>0);assert.equal(Math.abs(x+2)-Math.abs(2*x-3),2);}
fs.mkdirSync(root);fs.mkdirSync(root+'candidates');const p=root+'candidates/q08.json';fs.writeFileSync(p,JSON.stringify(candidate,null,2)+'\n',{flag:'wx'});const binding=bindCandidate(p);
fs.writeFileSync(root+'author-calculations-q08.json',JSON.stringify({utc:new Date().toISOString(),cases,accepted,sum:accepted.reduce((s,n)=>s+n,0),newCandidate:{path:p,sha256:sha256(fs.readFileSync(p))},studentDigest:binding.studentDigest,assetDigest:binding.assetDigest,candidateDigest:binding.candidateDigest,newTables:1,newFigures:0,independentReview:false,exposedPreviousReviewerMustNotSupplyFreshBlind:true,loadable:0,dbWrites:0},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({authored:1,newTables:1,newFigures:0,independentReview:0,loadable:0,candidate:p}));
