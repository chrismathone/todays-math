import fs from 'node:fs';
import assert from 'node:assert/strict';
import {bindCandidate,readJson,sha256} from '../../../scripts/import/exam-twin/candidatePack.mjs';
const base='.qa-artifacts/exam-resume-20261008/',priorRoot=base+'nobyeon-sem1-authoring-group2-r2/',root=base+'nobyeon-sem1-authoring-group2-r3/';
const oldPath=priorRoot+'candidates/q08.json',old=readJson(oldPath),ref=path=>({path,sha256:sha256(fs.readFileSync(path))});
const snapshot=readJson(old.metadata.assignment.snapshot.path),factorUnit=snapshot.units.find(u=>u.id==='068bcc39-0927-4f43-a919-24b61ca425f9');assert(factorUnit);
const content=old.content.replace('|넓이($\\mathrm{cm}^{2}$)|$(x+2)^{2}$|$(2x-3)^{2}$|',()=> '|넓이($\\mathrm{cm}^{2}$)|$x^{2}+4x+4$|$4x^{2}-12x+9$|');assert.notEqual(content,old.content);
const factorization='넓이를 나타내는 식을 인수분해하면 $x^{2}+4x+4=(x+2)^{2}$, $4x^{2}-12x+9=(2x-3)^{2}$이다.\n\n';
const candidate={...old,twinExternalId:'exam-twin-nobyeon-2025-1-mid-author-group2-r3-q08',content,solution:factorization+old.solution,
 variantDelta:{...old.variantDelta,sharedConcept:'완전제곱식으로의 인수분해, 양의 제곱근과 절댓값, 문자의 범위에 따른 부호 판단',sharedProcedure:'근호 안/넓이의 이차식을 완전제곱으로 인수분해 →양의 제곱근을 절댓값으로 표현 →두 경계의 세 구간에서 부호 판정 →조건을 대조하고 원범위 확인',difficultyBasis:'원문의 완전제곱식 인수분해와 세 구간의 부호 판정을 모두 유지한다. 새 질문은 결과를 만드는 입력들을 역으로 찾으며, 일차방정식과 정사각형의 양의 변 길이만 추가로 연결한다. 목표 난이도/5점 적절성은 독립 검토 대기.'},
 curriculumReview:{...old.curriculumReview,standardCodes:['9수01-07','9수01-10','9수02-12','9수02-05'],officialBasis:{...old.curriculumReview.officialBasis,primaryStandardCodes:['9수01-07','9수01-10','9수02-12'],records1based:[3776,3788,3956]},legitimateMethodDraft:'완전제곱식 인수분해 후 정사각형의 양의 변 길이와 절댓값을 구한다. 세 구간의 부호로 일차방정식을 세우고 원범위·양수조건을 검사한다. 원문의 인수분해 단계를 미리 제시해 생략시키지 않는다.'},
 metadata:{...old.metadata,previousCandidate:ref(oldPath),prerequisiteUnits:[factorUnit],visualRevision:'r2의 간결한 발문은 유지하되 넓이를 전개된 이차식으로 제시한다. 원문처럼 완전제곱 인수분해를 수행해야 하므로 핵심 단계를 미리 주어 생략시키지 않는다. 새ID/본문/풀이로 첫 독립 검토를 받는다.'}};
const identities=[{linear:[1,2],expanded:[1,4,4]},{linear:[2,-3],expanded:[4,-12,9]}];
for(const row of identities){const[a,b]=row.linear;assert.deepEqual([a*a,2*a*b,b*b],row.expanded);}
fs.mkdirSync(root);fs.mkdirSync(root+'candidates');const p=root+'candidates/q08.json';fs.writeFileSync(p,JSON.stringify(candidate,null,2)+'\n',{flag:'wx'});const bound=bindCandidate(p),prior=readJson(priorRoot+'author-calculations-q08-r2.json');
fs.writeFileSync(root+'author-calculations-q08-r3.json',JSON.stringify({...prior,utc:new Date().toISOString(),newCandidate:ref(p),studentDigest:bound.studentDigest,assetDigest:bound.assetDigest,candidateDigest:bound.candidateDigest,previousAuthorCalculation:ref(priorRoot+'author-calculations-q08-r2.json'),factorizationCoefficientIdentities:identities,oldStudentPayloadOrOldReviewReused:false,authorArithmeticOnly:true},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({selected:p,priorDraftsPreserved:true,firstBlindMustUseR3:true,newAuthoredCountDelta:0,loadable:0}));
