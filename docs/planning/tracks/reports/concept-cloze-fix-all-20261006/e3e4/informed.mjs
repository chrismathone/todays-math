import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { records } from './prepare.mjs';
const require = createRequire(import.meta.url);
const { splitBlankSentence } = require('../../../../../../src/contracts/conceptBlank.contract.ts');
const external = 'D:/tmp/concept-cloze-fix-all-20261006';
const report = new URL('./', import.meta.url);
export function readReply(name) {
  const raw = readFileSync(`${external}/${name}-raw.md`, 'utf8');
  const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
  const prompt = readFileSync(`${external}/${name}-input.md`, 'utf8');
  const input = JSON.parse(prompt.slice(prompt.indexOf('{\n  "cases"'), prompt.lastIndexOf('}') + 1));
  if (new Set(parsed.cases.map(c => c.id)).size !== input.cases.length || input.cases.some(c => !parsed.cases.some(p => p.id === c.id))) throw Error(`Review coverage ${name}`);
  return parsed.cases;
}
const names = ['e3e4-blind-1', 'e3e4-blind-2', 'e3e4-blind-3', 'e3e4-blind-4', 'e3e4-blind-corrected-1', 'e3e4-blind-corrected-2', 'e3e4-blind-final-1', 'e3e4-blind-acceptance-1', 'e3e4-blind-extra-1', 'e3e4-blind-acceptance-final-1', 'e3e4-blind-unit-final-1', 'e3e4-blind-angle-final-1', 'e3e4-blind-lastfix-1', 'e3e4-blind-sequence-final-1'];
const replies = new Map();
for (const name of names) for (const c of readReply(name)) replies.set(c.id, [...(replies.get(c.id) ?? []), { name, ...c }]);
let selected = records;
const prefix = process.argv[2] ?? 'e3e4-informed';
if (process.argv[3]) {
  const ids = new Set(process.argv[3].split(','));
  selected = records.filter(r => ids.has(r.id));
}
for (let start = 0; start < selected.length; start += 40) {
  const name = `${prefix}-${start / 40 + 1}`;
  const cases = selected.slice(start, start + 40).map(r => {
    const pieces = splitBlankSentence(r.after);
    return {
      id: r.id,
      grade: r.id.startsWith('e3') ? '초3' : '초4',
      chapter: r.original.section.split('::')[1].replace(/^\d+-\d+\s*/, ''),
      termForEditorialIdentityOnly: r.original.term,
      originalDefinition: r.before,
      originalFinding: { status: r.finding.status, student: r.finding.student, expected: r.finding.expected, reason: r.finding.reason, proposal: r.finding.proposal },
      afterRawDefinition: r.after,
      completedDefinition: pieces.map(p => p.text).join(''),
      student: pieces.map(p => p.kind === 'key' ? '□' : p.text).join(''),
      expected: pieces.filter(p => p.kind === 'key').map(p => p.text),
      blindReplies: replies.get(r.id),
      authorReason: r.reason,
    };
  });
  const prompt = `초등 수학 C형 공유 definition의 현재 최종 원고를 독립 검토하라. 모든 ID를 읽고 JSON {cases:[{id,verdict:"pass"|"revise",reason,proposal}]}만 반환하라. 학생에게는 학년·대단원·student만 보이고 용어 제목과 소단원은 보이지 않는다. originalDefinition·originalFinding은 과거 문장의 지적이며 current afterRawDefinition을 판정해야 한다. 기대 답은 expected이다. 첫 가림 답과 비교하되 맞춤법·기호·같은 뜻의 동의 표현·동치 수식·같은 답들의 순서 교환은 의미상 일치로 인정한다. 다른 속성·조건·연산·서로 다른 도형 이름을 요구하는 참 완성은 허용하지 않는다. 단순히 특정 특수조건을 새로 가정해야만 참인 답은 일반 명제의 반례가 아니다. 하나의 선분을 다각형의 변이라고 부르는 같은 지시 대상 같은 뜻의 표현과, 분모/분수의 크기처럼 다른 속성을 구별하라. 수학적으로 참인지 0·1·부호·나머지·정의역·도형 포함 관계·표기·응답 범위·빈칸의 짧은 핵심·학생 말을 확인하라. 한 문장에 용어·정답이 반복되는 단순 베끼기와, 구체적 수나 조건에서 값을 계산·동일성·분류를 추론하는 개념 문장을 구별하라. 완성 정의는 A/B/D형과 SRS에서도 설명으로 참이어야 하며 termForEditorialIdentityOnly는 기존 개념 보존 확인용이다. 새 학년 밖 용어 또는 개념 변경을 제안하지 말라. 유효한 반례나 학생이 무엇을 답할지 모르는 문제가 있으면 revise와 구체적 짧은 완성 정의 proposal을 적고, 문제가 해소되었으면 pass와 이유를 적어라. 원 지적이 not_issue였어도 실제 문제가 남으면 revise이다. 모든 기대 답을 보인 상태에서 동의만 하지 말고 독립 판단하라.\n\n${JSON.stringify({ cases }, null, 2)}\n`;
  writeFileSync(`${external}/${name}-input.md`, prompt);
  writeFileSync(new URL(`${name}-input.md`, report), prompt);
}
console.log(`Prepared ${Math.ceil(selected.length / 40)} informed batches (${selected.length} items).`);
