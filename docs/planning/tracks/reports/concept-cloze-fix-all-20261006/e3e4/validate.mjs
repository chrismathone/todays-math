import { readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { createHash } from 'node:crypto';
import katex from 'katex';
import { createRequire } from 'node:module';
import { records } from './prepare.mjs';
const require = createRequire(import.meta.url);
const { splitBlankSentence, blankSentenceSchema } = require('../../../../../../src/contracts/conceptBlank.contract.ts');
const { bank: e3 } = require('../../../../../../src/lib/concept-blank/bank/e3.ts');
const { bank: e3plus } = require('../../../../../../src/lib/concept-blank/bank/e3-plus.ts');
const { bank: e4 } = require('../../../../../../src/lib/concept-blank/bank/e4.ts');
const { bank: e4plus } = require('../../../../../../src/lib/concept-blank/bank/e4-plus.ts');
const baseline = JSON.parse(readFileSync('D:/tmp/concept-cloze-fix-all-20261006/baseline.json', 'utf8'));
const banks = { e3, e3plus, e4, e4plus };
const changes = [];
const byId = new Map(records.map(r => [r.id, r]));
const broadStems = new Map();
let untouchedConcepts = 0;
let otherFormRows = 0;
for (const [part, bank] of Object.entries(banks)) {
  const old = baseline.parts[part];
  for (const form of ['ox', 'apply', 'figures']) {
    if (!isDeepStrictEqual(old[form], bank[form])) throw Error(`Unexpected ${part} ${form} change`);
    otherFormRows += bank[form].length;
  }
  if (!isDeepStrictEqual(old.concepts.map(x => x.id), bank.concepts.map(x => x.id))) throw Error(`ID/order ${part}`);
  for (let i = 0; i < bank.concepts.length; i++) {
    const current = bank.concepts[i], original = old.concepts[i];
    const { definition: before, ...oldRest } = original;
    const { definition: after, ...newRest } = current;
    const pieces = splitBlankSentence(after);
    const chapter = current.section.split('::').slice(0, 2).join('::');
    const student = pieces.map(p => p.kind === 'key' ? '□' : p.text).join('').replace(/\s+/g, '');
    const keys = pieces.filter(p => p.kind === 'key').map(p => p.text.replace(/\s+/g, '')).join('|');
    const stemKey = `${chapter}|${student}`;
    broadStems.set(stemKey, [...(broadStems.get(stemKey) ?? []), { id: current.id, keys }]);
    if (!isDeepStrictEqual(oldRest, newRest)) throw Error(`Non-definition field ${current.id}`);
    const r = byId.get(current.id);
    if (r) {
      if (before !== r.before || after !== r.after) throw Error(`Ledger does not match loaded bank ${r.id}`);
      const split = splitBlankSentence(after);
      if (!blankSentenceSchema.safeParse(after).success) throw Error(`Sentence schema ${r.id}`);
      for (const p of split) {
        if (p.kind === 'text' && /[{}]/.test(p.text.replace(/\$[^$]*\$/g, ''))) throw Error(`Stray braces ${r.id}`);
        if ((p.text.match(/\$/g) ?? []).length % 2) throw Error(`Unpaired math ${r.id}`);
        for (const m of p.text.matchAll(/\$([^$]*)\$/g)) katex.renderToString(m[1], { throwOnError: true, strict: 'error' });
      }
    } else {
      if (before !== after) throw Error(`Unledgered modification ${current.id}`);
      untouchedConcepts++;
    }
    if (before !== after) changes.push({ id: current.id, before, after, reason: r.reason });
  }
}
const broadClashes = [...broadStems.values()].filter(group => new Set(group.map(c => c.keys)).size > 1);
if (broadClashes.length) throw Error(`Broad-chapter clashes: ${JSON.stringify(broadClashes)}`);
const resolutions = records.map(r => ({ id: r.id, disposition: r.before === r.after ? 'kept' : 'rewritten', reason: r.reason }));
const acceptance = {
  sourceCommit: baseline.sourceCommit,
  inputIds: 146,
  additionalIds: records.length - 146,
  resolvedIds: records.length,
  changedDefinitions: changes.length,
  retainedDefinitions: resolutions.filter(r => r.disposition === 'kept').length,
  untouchedConcepts,
  otherFormRows,
  invariantResult: 'pass: exact before/after; IDs, order, all non-definition fields and other forms unchanged',
  sentenceResult: 'pass: actual splitBlankSentence, blankSentenceSchema and strict KaTeX',
  broadChapterClashResult: 'pass: no identical student sentences with different literal answer keys across either grade',
  checkedSentences: records.map(r => ({ id: r.id, afterHash: createHash('sha256').update(r.after).digest('hex'), student: splitBlankSentence(r.after).map(p => p.kind === 'key' ? '□' : p.text).join(''), expected: splitBlankSentence(r.after).filter(p => p.kind === 'key').map(p => p.text) })),
};
writeFileSync(new URL('./acceptance.json', import.meta.url), JSON.stringify(acceptance, null, 2) + '\n');
const path = new URL('./changes.json', import.meta.url);
let previous = {};
try { previous = JSON.parse(readFileSync(path, 'utf8')); } catch {}
writeFileSync(path, JSON.stringify({ sourceCommit: baseline.sourceCommit, grades: ['e3', 'e4'], changes, resolutions, reviews: previous.reviews ?? [] }, null, 2) + '\n');
console.log(JSON.stringify({ inputIds: 146, additionalIds: records.length - 146, changedDefinitions: changes.length, kept: acceptance.retainedDefinitions, untouchedConcepts, otherFormRows, result: 'pass' }));
