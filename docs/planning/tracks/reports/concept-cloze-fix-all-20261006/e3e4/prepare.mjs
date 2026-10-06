import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import ts from 'typescript';
import { isDeepStrictEqual } from 'node:util';
import { createRequire } from 'node:module';
import { proposals, blindCorrections, extraProposals } from './proposals.mjs';
const require = createRequire(import.meta.url);

const external = 'D:/tmp/concept-cloze-fix-all-20261006';
const report = new URL('./', import.meta.url);
const input = JSON.parse(readFileSync(`${external}/e3e4-input.json`, 'utf8'));
const baseline = JSON.parse(readFileSync(`${external}/baseline.json`, 'utf8'));
const partFile = { e3: 'e3.ts', e3plus: 'e3-plus.ts', e4: 'e4.ts', e4plus: 'e4-plus.ts' };
if (proposals.length !== input.items.length || new Set(proposals.map(p => p[0])).size !== proposals.length) throw Error('Missing or duplicate disposition');
export const records = proposals.map(([i, after, reason]) => {
  const { original, finding } = input.items[i];
  const { part, ...entry } = original;
  if (!isDeepStrictEqual(baseline.parts[part].concepts.find(x => x.id === original.id), entry)) throw Error(`Baseline mismatch: ${original.id}`);
  return { id: original.id, part: original.part, before: original.definition, after: after ?? original.definition, reason, finding, original };
});
for (const [id, after, reason] of extraProposals) {
  const part = 'e4plus';
  const original = { part, ...baseline.parts[part].concepts.find(c => c.id === id) };
  if (!original.definition) throw Error(`Extra ID missing: ${id}`);
  const finding = { status: 'additional-confirmed', student: '분모가 같은 두 대분수를 모두 가분수로 고쳐 쓴 뒤 □ 계산할 수도 있다.', expected: [id === 'e4-2-1-3-xc5' ? '분자끼리 더해' : '분자끼리 빼서'], reason: '대단원만 보이는 학생지에서 두 문항의 학생 문장이 같지만 연산이 다른 답을 요구한다.', proposal: '덧셈·뺄셈 목표를 문장에 남겨 함께 교정하라.' };
  records.push({ id, part, before: original.definition, after, reason, finding, original });
}

if (process.argv[2] === 'apply') {
  for (const [part, filename] of Object.entries(partFile)) {
    const file = `src/lib/concept-blank/bank/${filename}`;
    let source = readFileSync(file, 'utf8');
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const current = new Map(require(`../../../../../../${file}`).bank.concepts.map(c => [c.id, c.definition]));
    const nodes = [];
    function visit(n) {
      if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) nodes.push(n);
      ts.forEachChild(n, visit);
    }
    visit(ast);
    const edits = records.filter(r => r.part === part && r.before !== r.after).map(r => {
      const value = n => ts.isTaggedTemplateExpression(n.parent) ? n.getText(ast).slice(1, -1) : n.text;
      const matches = nodes.filter(n => value(n) === current.get(r.id));
      if (matches.length !== 1) throw Error(`Expected unique literal for ${r.id}: ${matches.length}`);
      const n = matches[0];
      const target = ts.isTaggedTemplateExpression(n.parent) ? n.parent : n;
      return { start: target.getStart(ast), end: target.end, text: JSON.stringify(r.after) };
    }).sort((a, b) => b.start - a.start);
    for (const e of edits) source = source.slice(0, e.start) + e.text + source.slice(e.end);
    writeFileSync(file, source, 'utf8');
  }
  console.log(`Applied ${records.filter(r => r.before !== r.after).length} definitions; retained ${records.filter(r => r.before === r.after).length}.`);
}

if (process.argv[2] === 'blind') {
  const { splitBlankSentence } = require('../../../../../../src/contracts/conceptBlank.contract.ts');
  const prefix = process.argv[3] ?? 'e3e4-blind';
  const selected = process.argv[4] ? records.filter(r => process.argv[4].split(',').includes(r.id)) : process.argv[3] ? records.filter(r => blindCorrections.some(c => input.items[c[0]].original.id === r.id)) : records;
  for (let start = 0; start < selected.length; start += 40) {
    const batch = selected.slice(start, start + 40);
    const name = `${prefix}-${start / 40 + 1}`;
    const cases = batch.map(r => ({ id: r.id, grade: r.id.startsWith('e3') ? '초3' : '초4', chapter: r.original.section.split('::')[1].replace(/^\d+-\d+\s*/, ''), student: splitBlankSentence(r.after).map(p => p.kind === 'key' ? '□' : p.text).join('') }));
    const prompt = `초등 수학 C형 학생 문장 독립 가림 풀이 검토이다. 용어 제목·소단원·기대 답·완성 정의는 제공하지 않는다. 아래에 적힌 학년과 대단원만 학생이 안다. 각 □를 왼쪽부터 복원하고, 뜻이 같은 동의 표현이나 동치 수식 외에 서로 다른 수학적 참 완성이 있다면 alternativeAnswers에 적어라. 전체 조건·일반 명제를 만족해야 하며 주어지지 않은 특수조건을 임의로 가정하지 말라. 각도·삼각형·사각형·분수의 포함 관계, 0·1, 나머지, 부호, 수량/단위·도형 이름의 응답 범위, 답 노출과 어색한 학생 말을 확인하라. 기존 개념을 회상하는 문장이며 단순히 같은 뜻의 표현 여러 개라는 이유만으로 오류라 하지 말라. 풀이를 길게 쓰지 말고 모든 ID에 JSON {cases:[{id,answers:[...],alternativeAnswers:[...],reason}]}만 반환하라. answers는 각 빈칸 순서의 문자열 배열이다.\n\n${JSON.stringify({ cases }, null, 2)}\n`;
    writeFileSync(`${external}/${name}-input.md`, prompt);
    writeFileSync(new URL(`${name}-input.md`, report), prompt);
  }
  console.log(`Prepared ${Math.ceil(selected.length / 40)} blind batches (${selected.length} items).`);
}

if (process.argv[2] === 'collect') {
  for (const name of process.argv.slice(3)) {
    for (const suffix of ['input.md', 'raw.md', 'meta.json']) copyFileSync(`${external}/${name}-${suffix}`, new URL(`${name}-${suffix}`, report));
  }
}
