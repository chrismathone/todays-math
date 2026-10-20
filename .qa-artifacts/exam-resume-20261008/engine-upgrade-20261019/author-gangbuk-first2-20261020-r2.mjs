import fs from 'node:fs';
import assert from 'node:assert/strict';
import{bindCandidate,readJson,sha256,SURFACES}from'../../../scripts/import/exam-twin/candidatePack.mjs';
const b='.qa-artifacts/exam-resume-20261008/',e=b+'engine-upgrade-20261019/',out=b+'gangbuk-first2-authoring-20261020-r2/gangbuk/',script=e+'author-gangbuk-first2-20261020-r2.mjs',job='personal-59bbe8ebff319ec20b823103fa6c5e8d',manifestPath=b+`unpaired-hwp-first2-extraction-20261020-r1/${job}/hwp-question-only-manifest.local.json`,src=readJson(manifestPath),pdf=readJson(b+'unpaired-pdf-preflight-20261020-r1/aggregate-receipt.json').entries.find(x=>x.examId===job),snapshotPath=e+'live-family-snapshot-r2.json',snapshot=readJson(snapshotPath),unit=snapshot.units.find(x=>x.id==='82399e51-340d-4165-b016-3e941e65f810'),base=readJson(b+'gachang-first2-authoring-20261020-r2/gachang/q02.json'),ref=p=>({path:p,sha256:sha256(fs.readFileSync(p))});
assert.equal(src.inventoryAsProvided.year,2025);assert.equal(src.inventoryAsProvided.grade,3);assert.equal(src.questions.length,21);assert.equal(unit.grade,'중3');assert.equal(unit.semester,1);
// Coefficients of x²,x,constant after left minus right, all exact integers.
const coefficients=a=>[a-3,(a-2)-(a-1),-2-4];assert.deepEqual(coefficients(3),[0,-1,-6]);for(let a=-10;a<=10;a++)assert.equal(coefficients(a)[0]===0,a===3);
const rowChecks=[{row:'A',root:{n:2,d:1},recorded:{n:1,d:3}},{row:'B',root:{n:-2,d:1},recorded:{n:-1,d:1}},{row:'C',root:{n:1,d:1},recorded:{n:3,d:1}}].map(x=>{const r=x.root,k=x.recorded,n=BigInt(r.n)**2n*BigInt(k.d)+BigInt(k.n*r.n*r.d)+BigInt(k.n*r.d*r.d)-5n*BigInt(r.d)**2n*BigInt(k.d);return{...x,leftNumerator:n.toString(),denominator:(BigInt(r.d)**2n*BigInt(k.d)).toString(),correct:n===0n};});assert.deepEqual(rowChecks.map(x=>x.correct),[true,true,false]);assert.equal(1+2+2-5,0);
const tasks=[{
 n:1,score:3,tables:0,codes:['9수02-12','9수02-13'],
 content:String.raw`다음 등식이 $x$에 대한 일차방정식이 되도록 하는 상수 $a$의 값은?

$$(ax-2)(x+1)=ax+3x^2-x+4$$`,
 choices:[-3,-1,1,2,3].map(x=>`$${x}$`),answer:'⑤',
 solution:String.raw`왼쪽을 전개하면 $ax^2+(a-2)x-2$이고, 오른쪽을 정리하면 $3x^2+(a-1)x+4$이다. 모든 항을 왼쪽으로 이항하면

$$(a-3)x^2-x-6=0$$

이다. 일차방정식이 되려면 $x^2$의 계수가 $0$이어야 하므로 $a-3=0$, 즉 $a=3$이다.

실제로 $a=3$을 대입하면 $-x-6=0$이고 $x$의 계수가 $-1$로 $0$이 아니므로 일차방정식이다. 따라서 조건을 만족하는 상수는 $3$으로 유일하고 정답은 ⑤이다.`,
 before:'다섯 등식을 정리해 이차방정식이 아닌 것을 고른다.',after:'양변 전개 후 차수를 결정하는 미지 계수를 두고 실제로 일차방정식이 되게 하는 입력을 역추론한다.',concept:'방정식을 정리한 뒤 최고차항 계수가0인지 확인하여 차수를 구별한다.',method:'양변 다항식 전개 → 이항하여(a−3)x²−x−6=0 → 이차항 계수0에서a3 → 남은 일차항 계수−1이0이 아님을 확인',proof:'a는 x에 대한 상수다. a3에서 이차항이 없어지지만 일차항−x는 남으므로 항등식이나 모순식이 아닌 일차방정식이 된다. 다른a는 이차항 계수가0이 아니어서 조건을 만족하지 않는다. 해의 공식을 사용하는 문제가 아니라 이미 배운 전개·항정리·차수 정의를 사용한다.',prerequisites:['다항식의 전개','이항과 동류항 정리','계수와 차수','일차방정식과 이차방정식의 뜻'],calc:{exactCoefficientsAt3:coefficients(3),uniqueParameter:3,linearCoefficientNonzero:true,correctChoices:[false,false,false,false,true]}
},{
 n:2,score:4,tables:1,codes:['9수02-13'],
 content:String.raw`이차방정식 $x^2+ax+a-5=0$에 대하여 한 근과 그때의 상수 $a$를 다음과 같이 기록했다. 잘못 기록한 행과 그 행의 올바른 $a$의 값을 바르게 짝지은 것은?

| 행 | 한 근 | 기록한 $a$ |
| --- | --- | --- |
| A | $x=2$ | $\dfrac13$ |
| B | $x=-2$ | $-1$ |
| C | $x=1$ | $3$ |`,
 choices:[String.raw`A, $\dfrac13$`,'A, $3$','B, $-1$','C, $2$','C, $3$'],answer:'④',
 solution:String.raw`방정식의 근을 대입하면 왼쪽의 값이 $0$이 되어야 한다.

A. $x=2$, $a=\dfrac13$을 대입하면 $4+\dfrac23+\dfrac13-5=0$이므로 옳게 기록했다.

B. $x=-2$, $a=-1$을 대입하면 $4+2-1-5=0$이므로 옳게 기록했다.

C. $x=1$, $a=3$을 대입하면 $1+3+3-5=2$로 $0$이 아니므로 잘못 기록했다. $x=1$이 근이 되려면 $1+a+a-5=0$이어야 하므로 $2a=4$, $a=2$이다.

$a=2$를 다시 대입하면 $1+2+2-5=0$이 된다. 따라서 잘못 기록한 행은 C이고 올바른 값은 $2$이다. 정답은 ④이다.`,
 before:'주어진 한 근을 방정식에 대입해 상수 하나를 직접 구한다.',after:'서로 다른 세 근과 계수 기록을 표로 조직하고 잘못된 기록을 찾아 올바른 입력으로 고친다.',concept:'이차방정식의 근은 대입했을 때 등식이 성립하는 수라는 정의',method:'각 행의 근·기록 계수를 대입하여0여부 확인 → C만불일치 → 해당 근1을 고정한 일차 관계2a4에서a2 → 원식 대입 확인',proof:'x²의 계수는 항상1이므로 모든 기록의 방정식은 이차방정식이다. A,B는 각각 정확한 대입값0이고 C만2로 다르다. C의 수정 조건은2a4여서a2가 유일하다. 근의 정의·대입과 일차방정식만 필요하며 이차방정식의 두 근을 모두 구할 필요가 없다.',prerequisites:['방정식의 근과 대입','분수와 음수의 계산','일차방정식'],calc:{rows:rowChecks,correctedRow:'C',correctedA:2,substitutionAfterRepair:0,correctChoices:[false,false,false,true,false]}
}];
fs.mkdirSync(out,{recursive:true});const localRoot=b+`unpaired-hwp-first2-extraction-20261020-r1/${job}/component-only-input/`;fs.mkdirSync(localRoot,{recursive:true});
for(const t of tasks){const name=`q0${t.n}`,source=src.questions.find(x=>x.number===t.n);assert(source.printedScoreOccurrences.some(x=>x.value===t.score));const local=localRoot+name+'.local.json';const expectedSource=Buffer.from(JSON.stringify(source,null,2)+'\n');if(fs.existsSync(local))assert.deepEqual(fs.readFileSync(local),expectedSource);else fs.writeFileSync(local,expectedSource,{flag:'wx'});const q=structuredClone(base);Object.assign(q,{questionNumber:t.n,twinExternalId:`exam-twin-gangbuk-2025-1-final-author-group1-r2-${name}`,score:t.score,content:t.content,choices:t.choices,answer:t.answer,solution:t.solution,figureArtifacts:[]});
 q.sourceReference={externalId:`2025-gangbuk-3-1-final-${t.n}`,inventoryExamId:job,sourceQuestionNumber:t.n,newSourceReferenceId:`source-ref-gangbuk-2025-1-final-group1-r2-${name}`,sourceContentSha256:source.sourceContentDigest,questionOnlyStaged:ref(local),sourceSchoolInternal:src.inventoryAsProvided.school,sourceExamYear:2025,sourceExamSemester:1,sourceExamRound:src.inventoryAsProvided.round,extractionManifest:ref(manifestPath),hwpOnlyExtractionAggregate:ref(b+'unpaired-hwp-first2-extraction-20261020-r1/aggregate-receipt.json'),sourceFiles:[src.source,...pdf.references.map(x=>x.input)],originalIdentityReference:pdf.references[1].input,parentSourcePageComparison:ref(e+'unpaired-gangbuk-pdf-alias-content-observations-r1.json'),sourceComponentReview:{status:'parent-first2-HWP-vs-viewed-original-component-correspondence-observed-independent-review-pending',hwpWholePairApproved:false},sourceIdentityApproved:false,rightsApproved:false,originalAnswerKeyUsed:false,parentIncidentalHandwrittenMarkExposure:true,marksUsedForAnswerApproval:false,sourceTextCopiedToCandidate:false,currentDbSourceDuplicateCheck:'pending-no-operational-write'};
 q.variantDelta={modes:t.n===1?['inverse-target','structure']:['structure','classification-repair','data-reorganization','question-target-change','new-table'],before:t.before,after:t.after,sharedConcept:t.concept,sharedProcedure:t.method,actualStructuralChange:t.after,domainProof:t.proof,difficultyBasis:'원문의 인쇄 배점3/4를 보존한 저자 제안이며 새 입력 역추론/다중 기록의 목표 난도는 독립 검수 전 보류.'};
 q.curriculumReview={...base.curriculumReview,standardCodes:t.codes,officialBasis:{...base.curriculumReview.officialBasis,primaryStandardCodes:['9수02-13']},officialPrimary:{...base.curriculumReview.officialPrimary,standard:t.codes.join(', '),actualScope:'2015중3 이차방정식의 뜻·한 근 대입 및 이미 배운 항정리·일차 관계. 고등학교의 별도 근 관계 도구가 필요하지 않으며 2027중3/2022 자동 전용 금지.'},legitimateMethodDraft:t.method,sevenSurfaces:Object.fromEntries(SURFACES.map(k=>[k,'author-proposed-independent-review-pending'])),independentReviewPending:true};
 q.metadata={...base.metadata,score:t.score,sourceExamRound:'기말',sourceDifficultyLabelObserved:source.difficultyLabelFromSource??null,problemTypeProposal:t.after,assignment:{status:'pending',unitId:unit.id,familyKey:null,currentUnit:unit,snapshot:ref(snapshotPath),evidence:'실제 캡처된 중3 기본 이차방정식 Unit UUID. 새 차수/기록 오류 수정의 정확한live family는 미확정.'},prerequisiteUnits:[unit],placementConditions:{...base.metadata.placementConditions,requiresLearnedBeforeAssignment:t.prerequisites},figureAuthoring:{method:t.tables?'new-native-Markdown-table':'no-figure-required',newFigures:0,newTables:t.tables,originalCropEmbedded:false,pixelOracle:false,reproductionScript:script,reproductionScriptSha256:ref(script).sha256,renderingReviewPending:true},authorOnly:true,independentMathApproval:false,independentGradeApproval:false,sourceIdentityApproved:false,rightsApproved:false,similarityApproved:false,nativeProvenanceApproved:false,loadable:false};delete q.metadata.metadataRevision;delete q.metadata.recordCorrectionAnswerSchema;
 fs.writeFileSync(out+name+'.json',JSON.stringify(q,null,2)+'\n',{flag:'wx'});const x=bindCandidate(out+name+'.json');assert.deepEqual(x.validation.curriculumMetadataComparison.conflicts,[]);assert.deepEqual(x.validation.studentMathNotationWarnings,[]);assert.deepEqual(x.validation.surfaceKeywordViolations,[]);fs.writeFileSync(out+name+'-author-calculations-r1.json',JSON.stringify({...t.calc,candidateFileSha256:x.candidateFileSha256,candidateDigest:x.candidateDigest,studentDigest:x.studentDigest,assetDigest:x.assetDigest,authorOnly:true,independentReview:false,dbWrites:0,loadable:0},null,2)+'\n',{flag:'wx'});
}
console.log(JSON.stringify({newDrafts:2,newFigures:0,newTables:1,actualAuthoredIncludingCurrentDrafts:170,canonicalSelected:166,canonicalMathGrade:165,newIndependentMathGrade:0,dbWrites:0,loadable:0}));
