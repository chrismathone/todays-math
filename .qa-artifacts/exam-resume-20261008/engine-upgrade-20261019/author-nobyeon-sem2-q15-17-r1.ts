import fs from 'node:fs';
import assert from 'node:assert/strict';
import {renderFigureSpec} from '../../../src/lib/figure/renderFigureSpec';
import {bindCandidate,readJson,sha256,SURFACES} from '../../../scripts/import/exam-twin/candidatePack.mjs';
type Pair=[number,number];
const first:Pair[]=[[30,60],[70,50],[50,80],[60,30],[80,70]];
const second:Pair[]=[[20,30],[30,50],[40,60],[50,40],[60,30],[70,60],[80,80]];
const third:Pair[]=[[90,80],[60,90],[70,70],[50,60],[30,40],[40,30],[20,30]];
function graph(points:Pair[]){
 const segments:object[]=[],labels:object[]=[{at:[0,0],text:'0',dx:-10,dy:18,anchor:'end'}];
 for(let v=10;v<=100;v+=10){segments.push({from:[v,0],to:[v,100],dashed:true},{from:[0,v],to:[100,v],dashed:true});if(v%20===0)labels.push({at:[v,0],text:String(v),dy:20},{at:[0,v],text:String(v),dx:-10,dy:4,anchor:'end'});}
 points.forEach((p,i)=>labels.push({at:p,text:String.fromCharCode(65+i),dx:8,dy:-10,anchor:'start'}));
 return{version:'graph-1',xRange:[-12,115],yRange:[-15,115],width:520,height:480,axes:true,segments,points:points.map(at=>({at,radius:4})),labels};
}
async function main(){
 const b='.qa-artifacts/exam-resume-20261008/',e=b+'engine-upgrade-20261019/',out=b+'nobyeon-sem2-authoring-group5-r1/',script=e+'author-nobyeon-sem2-q15-17-r1.ts',base=readJson(b+'nobyeon-sem2-authoring-group3-r1/q12.json'),snapshotPath=e+'live-family-snapshot-r2.json',snapshot=readJson(snapshotPath),ownerRoot=b+'nobyeon-shared-source-ownership-20261020-r2/',ownerReport=ownerRoot+'own-source-ownership-review-r2.json',cropReport=ownerRoot+'own-crop-ownership-addendum-r3.json';
 assert.equal(sha256(fs.readFileSync(ownerReport)),'cae09e49c01def9fafb574d56964a92bf57f697682b3563336b1ef35fda49061');assert.equal(sha256(fs.readFileSync(cropReport)),'5f7bec0026b9e13fab043ffcb813ccac02d64dc310fd096d41ab80d63a859271');assert.equal(readJson(ownerReport).pointChecks.allTwentyCompared,true);
 const qualifying=first.map(([x,y],i)=>({id:String.fromCharCode(65+i),yes:x>first[0][0]&&y<first[1][1]}));assert.deepEqual(qualifying.filter(r=>r.yes).map(r=>r.id),['D']);
 const knownHigher=second.filter(([x,y])=>y>x).length;assert.equal(knownHigher,3);const possibilities=[30,40,50,60,70].map(a=>({a,percentage:100*(knownHigher+Number(a>60))/8}));assert.deepEqual(possibilities.filter(r=>r.percentage===50).map(r=>r.a),[70]);
 const rankCases=[];for(let a=80;a<=100;a++){const all=[...third,[80,a]as Pair].map(([x,y],i)=>({id:String.fromCharCode(65+i),total:x+y,y})).sort((a,b)=>b.total-a.total);assert.equal(all[1].total>all[2].total,true);assert.deepEqual(all.slice(0,2).map(p=>p.id).sort(),['A','H']);rankCases.push({a,mean:all.slice(0,2).reduce((s,p)=>s+p.y,0)/2});}assert.deepEqual(rankCases.filter(r=>r.mean===90).map(r=>r.a),[100]);
 const tasks=[{
  n:15,score:4,points:first,newTables:0,
  content:String.raw`다섯 학생 A~E의 두 차례 연습 점수를 산점도로 나타냈다. 가로축 $x$는 1차 점수, 세로축 $y$는 2차 점수이다. 다음 두 조건을 모두 만족하는 학생은?

ㆍ1차 점수가 A보다 높다.

ㆍ2차 점수가 B보다 낮다.`,
  choices:['학생 A','학생 B','학생 C','학생 D','학생 E'],answer:'④',
  solution:String.raw`1차 점수는 가로 위치로 비교한다. A보다 오른쪽에 있는 B, C, D, E는 첫째 조건을 만족한다.

2차 점수는 세로 위치로 비교한다. B보다 아래에 있는 학생은 D뿐이다. B 자신은 B보다 낮은 것이 아니므로 둘째 조건을 만족하지 않는다. 따라서 두 조건을 모두 만족하는 학생은 D이고 정답은 ④이다.`,
  before:'소득·지출 산점도의 다섯 설명 중 옳은 문장을 고른다.',after:'새 연습 점수 산점도에서 가로/세로 비교 조건 두 개를 동시에 만족하는 기록의 주인을 찾는다.',concept:'산점도의 가로·세로 위치와 두 변량의 비교',method:'한 축의 큰/작은 위치로 첫 집합 확인→다른 축의 조건 확인→두 조건의 공통 기록 결정',proof:'새5쌍에서 x>30과 y<50을 함께 만족하는 점은 D(60,30)뿐이다. 같음은 엄격 비교에 포함하지 않으며 점의 좌표·라벨을 명시적으로 새로 그렸다. 회귀선/상관계수/지출비율 해석을 강요하지 않는다.',calc:{points:first,qualifying},prerequisites:['산점도의 두 축과 한 점의 의미','가로/세로 좌표 비교','보다 높다/낮다의 엄격 비교']
 },{
  n:16,score:4,points:second,newTables:1,
  content:String.raw`여덟 학생 A~H가 두 차례 연습을 했다. 산점도에는 A~G의 점수만 나타내었고, H의 점수는 표에 따로 적었다. 가로축 $x$는 1차 점수, 세로축 $y$는 2차 점수이다.

| 학생 | 1차 점수 | 2차 점수 |
| --- | --- | --- |
| H | $60$ | $a$ |

여덟 학생 중 2차 점수가 1차 점수보다 높은 학생은 전체의 $50\%$이다. H의 2차 점수 $a$로 가능한 것은?`,
  choices:[30,40,50,60,70].map(x=>`$${x}$점`),answer:'⑤',
  solution:String.raw`전체 $8$명의 $50\%$는 $4$명이다. 산점도의 A~G에서 2차 점수가 더 높은 학생은 A$(20,30)$, B$(30,50)$, C$(40,60)$의 $3$명이다. D, E, F는 2차 점수가 더 낮고 G는 두 점수가 같으므로 세지 않는다.

따라서 H도 2차 점수가 더 높아야 한다. H의 1차 점수는 $60$이므로 $a>60$이다. 보기 중 이 조건을 만족하는 값은 $70$뿐이며, 이때 조건을 만족하는 학생은 실제로 $4$명이다. 정답은 ⑤이다.`,
  before:'공통20점에서 한 점수가 다른 점수보다 높은 학생의 백분율을 구한다.',after:'새7점과 빠진 한 기록을 주고 전체 백분율 조건을 만족하는 누락 점수의 가능한 값을 역추론한다.',concept:'산점도의 두 변량 크기 비교와 전체에 대한 백분율',method:'전체 백분율로 필요한 인원수 복원→알려진 각 점의 두 점수 비교→남은 기록의 대소 조건→선택지 존재 검산',proof:'알려진7쌍에서 y>x는3명, y<x는3명, y=x는1명이다. 전체8명 중50%를 만족하려면 빠진 H의 y>60이어야 한다. 실수 전체의 a가 하나라고 주장하지 않고 주어진5보기 중70만 가능함을 검산했다. 빠진 점은 실제 산점도에 그리지 않는다.',calc:{points:second,total:8,knownHigher,possibilities,possibleChoiceOnly:70,unknownPointDeliberatelyNotDrawn:true},prerequisites:['산점도에서 두 변량 비교','백분율과 인원수','같음과 더 큼의 구별']
 },{
  n:17,score:5,points:third,newTables:1,
  content:String.raw`여덟 학생 A~H의 두 차례 평가 점수를 조사하였다. 산점도에는 A~G의 점수를 나타내었고, H의 점수는 표와 같다. 가로축 $x$는 1차 점수, 세로축 $y$는 2차 점수이다.

| 학생 | 1차 점수 | 2차 점수 |
| --- | --- | --- |
| H | $80$ | $a$ |

$a$는 $80$ 이상 $100$ 이하의 정수이다. 두 차례 점수의 합이 큰 두 학생을 골랐더니, 이 두 학생의 2차 점수의 평균은 $90$점이었다. H의 2차 점수 $a$는?`,
  choices:[80,85,90,95,100].map(x=>`$${x}$점`),answer:'⑤',
  solution:String.raw`산점도의 A~G에서 두 점수의 합은 차례로 $170$, $150$, $140$, $110$, $70$, $70$, $50$이다. H의 합은 $80+a$이고 $80\leq a\leq100$이므로 $160$ 이상 $180$ 이하이다.

따라서 합이 큰 두 학생은 반드시 A와 H이다. 두 학생이 동점이 되는 경우에도 세 번째인 B의 합 $150$보다 크므로 고르는 두 사람은 바뀌지 않는다.

A의 2차 점수는 $80$이므로 $\frac{80+a}{2}=90$에서 $a=100$이다. 실제로 H의 합은 $180$, A의 합은 $170$이고 두 2차 점수의 평균은 $90$이므로 조건을 만족한다. 정답은 ⑤이다.`,
  before:'20개의 두 점수 합으로 상위5명을 고르고 그들의 한 점수 평균을 구한다.',after:'새7점과 범위가 주어진 누락 기록에서 상위 두 명의 평균을 조건으로 주고 누락 점수를 복원한다.',concept:'산점도의 순서쌍 합의 순위와 선택된 집단의 평균',method:'실제 두 좌표의 합 비교→미지 점수의 범위로 선정 집단 확정→주어진 집단 평균에서 한 점수 역추론→경계 동점/전체 범위 재검산',proof:'a정수80..100의21경우 모두 상위2명은 A와H이고 두 번째와세 번째의 합 차이는양수다. 평균90이되는 것은a100하나다. 두 점수를 더하는 순위 정의를 그대로 쓰며 회귀/상관계수/벡터/상위 통계 개념을 쓰지 않는다.',calc:{points:third,unknownDomain:{min:80,max:100,integer:true},allRankCases:rankCases,uniqueSolution:100,unknownPointDeliberatelyNotDrawn:true},prerequisites:['산점도의 순서쌍','두 수의 합 비교','범위와 정수','평균에서 합 복원','순위 경계의 동점 확인']
 }];
 fs.mkdirSync(out);
 for(const t of tasks){
  const name=`q${t.n}`,stagedPath=b+`next-three-source-review-r1/question-only-staged/nobyeon/${name}.json`,reviewPath=b+`next-three-source-review-r1/items/nobyeon/${name}.json`,src=readJson(stagedPath),prior=readJson(reviewPath);assert.equal(prior.sourceIdentity.printedYear,2025);assert.equal(src.score.parentScore,t.score);assert.equal(prior.curriculumCoreMethodProposal.status,'source-hold');
  const overlay=out+name+'-source-hold-reevaluation-r1.json';fs.writeFileSync(overlay,JSON.stringify({utc:new Date().toISOString(),priorSourceReview:{path:reviewPath,sha256:sha256(fs.readFileSync(reviewPath))},currentStaged:{path:stagedPath,sha256:sha256(fs.readFileSync(stagedPath))},independentOwnership:{commit:'0b9f171429369fbae4f6a3b17540266b6cfad833',path:ownerReport,sha256:sha256(fs.readFileSync(ownerReport))},independentActualCrop:{commit:'8211adb6aa1cf28cd7a1f0e09f05e541bdeb658b',path:cropReport,sha256:sha256(fs.readFileSync(cropReport))},resolvedSpecificHistoricalHold:t.n===15?'Canonical q15 excludes shared16/17header/plot; actual own crop independently confirmed. Historical raw tail retained.':'Current explicit20pair/shared16-17header ownership and actual crops independently confirmed; old null-context reason obsolete only for these exact current stage hashes.',oldSourceReviewRewritten:false,wholeHwpPdfIdentityApproved:false,rightsApproved:false,gradeApproved:false,exactFamilyApproved:false,nativeOrReleaseApproved:false,loadable:0},null,2)+'\n',{flag:'wx'});
  const spec=graph(t.points);fs.writeFileSync(out+name+'.figure.spec.json',JSON.stringify(spec,null,2)+'\n',{flag:'wx'});const r=await renderFigureSpec(spec,{strict:true});assert(r.ok);if(!r.ok)throw Error('Strict graph rendering failed');fs.writeFileSync(out+name+'.figure.svg',r.svg,{flag:'wx'});
  const unit=snapshot.units.find((u:{id:string})=>u.id==='6209acdc-9fcf-498a-af2e-13f614d0f277');assert(unit);const prerequisites=t.n===17?[unit,snapshot.units.find((u:{id:string})=>u.id==='468b8d96-7097-4ef3-8ccf-42c53d90b45f')]:[unit];assert(prerequisites.every(Boolean));
  const q=structuredClone(base);Object.assign(q,{questionNumber:t.n,twinExternalId:`exam-twin-nobyeon-2025-2-mid-author-group5-r1-${name}`,score:t.score,questionType:'객관식',content:t.content,choices:t.choices,answer:t.answer,solution:t.solution,figureArtifacts:[{role:'stem',specPath:name+'.figure.spec.json',svgPath:name+'.figure.svg',intendedWidthMm:80}]});
  q.sourceReference={...base.sourceReference,externalId:`2025-nobyeon-3-2-mid-${t.n}`,newSourceReferenceId:`source-ref-nobyeon-2025-2-mid-group5-r1-${name}`,sourceContentSha256:sha256(fs.readFileSync(stagedPath)),questionOnlyStaged:{path:stagedPath,sha256:sha256(fs.readFileSync(stagedPath))},sourceReviewReport:{path:reviewPath,sha256:sha256(fs.readFileSync(reviewPath))},componentObservation:{path:overlay,sha256:sha256(fs.readFileSync(overlay))}};
  q.variantDelta={modes:t.n===15?['structure','context','new-data','new-vector']:['inverse-target','structure','new-data','new-vector','new-table'],before:t.before,after:t.after,sharedConcept:t.concept,sharedProcedure:t.method,actualStructuralChange:t.after+' 새 조건·자료 조직·질문 대상·해설·그림을 제작했다. 단순 숫자/이름 치환으로 완료하지 않는다.',domainProof:t.proof,difficultyBasis:'원문 배점·핵심 관계에 근거한 저자 제안, 실제 난도 동등성·학교 진도·정확한family는 별도 보류.'};
  q.curriculumReview={...base.curriculumReview,standardCodes:t.n===17?['9수05-06','9수05-08']:['9수05-08'],legitimateMethodDraft:t.method,officialPrimary:{...base.curriculumReview.officialPrimary,standard:t.n===17?'9수05-06, 9수05-08':'9수05-08',actualScope:'2015 M3 actual scatter-point coordinate comparisons, percentages and selected-group mean only. Whole method and all seven surfaces independently pending.'},sevenSurfaces:Object.fromEntries(SURFACES.map(k=>[k,'author-proposed-independent-review-pending'])),independentReviewPending:true};
  q.metadata={...base.metadata,score:t.score,questionType:'객관식',answerFormat:'single-choice-symbol',problemTypeProposal:t.after,difficultyProposal:prior.metadataProposal.sourceDifficultyLabel??'미정',sourceDifficultyLabelObserved:prior.metadataProposal.sourceDifficultyLabel??null,assignment:{status:'pending',unitId:unit.id,familyKey:null,currentUnit:unit,snapshot:{path:snapshotPath,sha256:sha256(fs.readFileSync(snapshotPath))},evidence:'실제 Unit UUID와 새 풀이 목적/선수단원 연결. 정확한 live family와 원문 전체 동일성은 별도 보류.'},prerequisiteUnits:prerequisites,placementConditions:{...base.metadata.placementConditions,requiresLearnedBeforeAssignment:t.prerequisites},figureAuthoring:{method:'existing-graph-1-vector-engine-strict',newFigures:1,newTables:t.newTables,originalCropEmbedded:false,pixelOracle:false,coordinateConstruction:t.proof,reproductionScript:script,renderingReviewPending:true}};
  fs.writeFileSync(out+name+'.json',JSON.stringify(q,null,2)+'\n',{flag:'wx'});const x=bindCandidate(out+name+'.json');assert.deepEqual(x.validation.studentMathNotationWarnings,[]);assert.equal(x.validation.metadataAnswerFormatMismatch,false);fs.writeFileSync(out+name+'-author-calculations-r1.json',JSON.stringify({...t.calc,utc:new Date().toISOString(),candidateFileSha256:x.candidateFileSha256,studentDigest:x.studentDigest,candidateDigest:x.candidateDigest,assetDigest:x.assetDigest,authorOnly:true,independentReview:false,loadable:0,dbWrites:0},null,2)+'\n',{flag:'wx'});
 }
 console.log(JSON.stringify({authored:3,newFigures:3,newTables:2,canonicalSelectedUnchanged:151,independentReviewPending:true,loadable:0}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
