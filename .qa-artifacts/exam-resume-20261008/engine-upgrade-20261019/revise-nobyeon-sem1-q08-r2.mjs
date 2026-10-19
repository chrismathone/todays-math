import fs from 'node:fs';
import assert from 'node:assert/strict';
import {bindCandidate,readJson,sha256} from '../../../scripts/import/exam-twin/candidatePack.mjs';
const base='.qa-artifacts/exam-resume-20261008/',oldPath=base+'nobyeon-sem1-authoring-group2-r1/candidates/q08.json';
const old=readJson(oldPath),root=base+'nobyeon-sem1-authoring-group2-r2/';
const ref=path=>({path,sha256:sha256(fs.readFileSync(path))});
const evidence=base+'nobyeon-sem1-final-review-20261019-r1/official-locators.json';
assert(fs.readFileSync(evidence,'utf8').includes('9수02-05'));
const content=old.content.replace('A의 한 변의 길이가 B의 한 변의 길이보다 $2\\,\\mathrm{cm}$ 길다고 한다. 이를 만족시키는 모든 $x$의 값의 합은?',
 'A의 한 변은 B의 한 변보다 $2\\,\\mathrm{cm}$ 길다. 가능한 모든 $x$의 값의 합은?');
assert.notEqual(content,old.content);
const candidate={...old,twinExternalId:'exam-twin-nobyeon-2025-1-mid-author-group2-r2-q08',content,
 curriculumReview:{...old.curriculumReview,officialBasis:{...old.curriculumReview.officialBasis,primaryStandardCodes:['9수01-07','9수01-10']},prerequisiteBasis:{codes:['9수02-05'],locators:ref(evidence),note:'공식 원문 locator의 선수기준 근거만 재사용한다. 이전 다른 문항의 학년 검수나 답을 새 문항의 승인으로 재사용하지 않는다.'}},
 metadata:{...old.metadata,previousCandidate:ref(oldPath),visualRevision:'r1에서 문장 말미가 한 줄에 짧게 남아 같은 길이 조건을 더 간결하게 썼다. 조건·표·답·풀이 수학은 같으나 본문 변경이므로 새ID/digest로 첫 독립 검토를 받는다.'}};
fs.mkdirSync(root);fs.mkdirSync(root+'candidates');const p=root+'candidates/q08.json';fs.writeFileSync(p,JSON.stringify(candidate,null,2)+'\n',{flag:'wx'});const bound=bindCandidate(p),prior=readJson(base+'nobyeon-sem1-authoring-group2-r1/author-calculations-q08.json');
fs.writeFileSync(root+'author-calculations-q08-r2.json',JSON.stringify({...prior,utc:new Date().toISOString(),newCandidate:ref(p),studentDigest:bound.studentDigest,assetDigest:bound.assetDigest,candidateDigest:bound.candidateDigest,previousAuthorCalculation:ref(base+'nobyeon-sem1-authoring-group2-r1/author-calculations-q08.json'),sameAuthorArithmeticNotIndependentApproval:true},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({selected:p,oldPreserved:true,newAuthoredCountDelta:0,independentReview:0,loadable:0}));
