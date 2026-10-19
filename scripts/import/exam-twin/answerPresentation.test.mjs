import assert from 'node:assert/strict';
import test from 'node:test';
import { compareWrittenAnswerPresentation as compare } from './answerPresentation.mjs';
import { independentAnswerMatches } from './candidatePack.mjs';

test('numbered length roles preserve x coefficients and every written subpart', () => {
  const author = '⑴ $QR=\\frac{3x}{5}\\,\\mathrm{cm}$, $PR=\\frac{4x}{5}\\,\\mathrm{cm}$ ⑵ $PQ=10\\,\\mathrm{cm}$ ⑶ $QR=6\\,\\mathrm{cm}$, $PR=8\\,\\mathrm{cm}$';
  const raw = '(1) QR=3x/5 cm, PR=4x/5 cm; (2) PQ=10 cm; (3) QR=6 cm, PR=8 cm';
  assert.equal(compare(author, raw).status, 'equivalent');
  const candidate = { questionType: '서술형', choices: [], answer: author };
  assert.equal(independentAnswerMatches(candidate, raw), true);
  for (const wrong of [raw.replace('QR=3x/5', 'QR=4x/5'), raw.replace('PR=8 cm', 'PR=8 m'), raw.replace('QR=6 cm', 'QR=6'), raw.replace('(3)', '(4)'), raw.replace('3x/5', '3y/5')]) {
    assert.notEqual(compare(author, wrong).status, 'equivalent', wrong);
    assert.equal(independentAnswerMatches(candidate, wrong), false, wrong);
  }
});

test('perpendicular notation and named angle/ratio outputs compare without deriving identities', () => {
  const a = '⑴ $PH\\perp QR$, $\\alpha=30^\\circ$ ⑵ $PH=5\\sqrt3\\,\\mathrm{cm}$ ⑶ $\\sin\\alpha=\\frac12$, $\\cos\\alpha=\\frac{\\sqrt3}{2}$, $\\tan\\alpha=\\frac{\\sqrt3}{3}$';
  const b = '(1) PH⊥QR, α=30°; (2) PH=5√3 cm; (3) sinα=1/2, cosα=√3/2, tanα=√3/3';
  const out = compare(a, b);
  assert.equal(out.status, 'equivalent');
  assert.equal(out.relationTruthProved, false);
  assert.equal(out.permitsGradeOrQuestionApproval, false);
  for (const wrong of [b.replace('30°', '30'), b.replace('sinα=1/2', 'sinα=√3/2'), b.replace('PH⊥QR', 'PH⊥PR')]) assert.notEqual(compare(a, wrong).status, 'equivalent');
});

test('explicit unit conversion is exact but dimensions and roles cannot disappear', () => {
  assert.equal(compare('⑴ $OH=9\\,\\mathrm{m}$, $PH=9\\sqrt3\\,\\mathrm{m}$', '(1) OH=900 cm, PH=900√3 cm').status, 'equivalent');
  assert.notEqual(compare('(1) OH=9 m', '(1) PH=9 m').status, 'equivalent');
  assert.notEqual(compare('(1) OH=9 m', '(1) OH=9 m²').status, 'equivalent');
});

test('unsupported prose, mixed syntax, extra/missing parts and contradictory duplicate roles stay unapproved', () => {
  const a = '(1) QR=3 cm; (2) PR=4 cm';
  for (const x of ['(1) QR=3 cm', '(1) QR=3 cm; (2) PR=4 cm; (3) PQ=5 cm', '(1) QR=3 cm 설명; (2) PR=4 cm', '(1) QR=3 cm, QR=4 cm; (2) PR=4 cm', '(1) QR=1 0 cm; (2) PR=4 cm', '(1) QR=(x+1)/2 cm; (2) PR=4 cm']) assert.notEqual(compare(a, x).status, 'equivalent', x);
});

test('q04 numbered scalar lengths compare presentation only without mutating sealed-style records', () => {
  // Representation fixture only: do not read/rewrite real QA evidence or collect it.
  const candidate = Object.freeze({ questionType: '서술형', choices: Object.freeze([]),
    answer: '(1) $18\\,\\mathrm{cm}$ (2) $10\\,\\mathrm{cm}$' });
  const raw = Object.freeze({ answer: '(1) 18 cm; (2) 10 cm', status: 'solved' });
  const before = JSON.stringify({ candidate, raw });
  for (const [a, b] of [[candidate.answer, raw.answer], [raw.answer, candidate.answer]]) {
    assert.deepEqual(compare(a, b), { status: 'equivalent', presentationComparisonOnly: true,
      relationTruthProved: false, permitsGradeOrQuestionApproval: false, generalSymbolicEquivalence: false });
  }
  assert.equal(compare(raw.answer, '(1) 18cm (2) 10cm').status, 'equivalent');
  assert.equal(independentAnswerMatches(candidate, raw.answer), true);
  assert.equal(JSON.stringify({ candidate, raw }), before);
});

test('unnamed decimal lengths use exact unit scaling and preserve each numbered value', () => {
  assert.equal(compare('⑴ $0.18\\,\\text{m}$ ⑵ $0.1\\,\\mathrm{m}$', '(1) 18cm; (2) 10.000000 cm;').status, 'equivalent');
  assert.equal(compare('(1) 999999999999.123456cm', '(1) 9999999999.991234m').status, 'different');
  assert.equal(compare('(1) 0.000001m', '(1) 0.000100cm').status, 'equivalent');
  assert.equal(compare('(1) 0cm', '(1) 0m').status, 'equivalent');
});

const scalarReference = '(1) 18cm; (2) 10cm';
for (const [name, answer] of [
  ['changed first value', '(1) 19cm; (2) 10cm'],
  ['changed second value', '(1) 18cm; (2) 11cm'],
  ['swapped values', '(1) 10cm; (2) 18cm'],
  ['wrong scale', '(1) 18m; (2) 10cm'],
  ['changed low decimal digit', '(1) 18.000001cm; (2) 10cm'],
  ['missing final part', '(1) 18cm'],
  ['extra part', '(1) 18cm; (2) 10cm; (3) 1cm'],
]) {
  test(`numbered scalar lengths reject ${name}`, () => {
    assert.equal(compare(scalarReference, answer).status, 'different');
    assert.equal(compare(answer, scalarReference).status, 'different');
    assert.equal(independentAnswerMatches({ questionType: '서술형', choices: [], answer: scalarReference }, answer), false);
  });
}

for (const [name, answer] of [
  ['reordered labels', '(2) 10cm; (1) 18cm'],
  ['duplicate index', '(1) 18cm; (1) 10cm'],
  ['missing first index', '(2) 18cm; (3) 10cm'],
  ['skipped index', '(1) 18cm; (3) 10cm'],
  ['zero index', '(0) 18cm; (1) 10cm'],
  ['noncanonical index', '(01) 18cm; (2) 10cm'],
  ['missing unit', '(1) 18; (2) 10cm'],
  ['wrong dimension', '(1) 18cm²; (2) 10cm'],
  ['wrong volume dimension', '(1) 18m^3; (2) 10cm'],
  ['unsupported unit', '(1) 180mm; (2) 10cm'],
  ['extra unit', '(1) 18cm m; (2) 10cm'],
  ['trailing prose', '(1) 18cm; (2) 10cm이다'],
  ['leading prose', '정답 (1) 18cm; (2) 10cm'],
  ['interpart prose', '(1) 18cm 설명; (2) 10cm'],
  ['extra scalar', '(1) 18cm, 18cm; (2) 10cm'],
  ['multiple separators', '(1) 18cm;; (2) 10cm'],
  ['unbalanced math delimiter', '(1) $18cm; (2) 10cm'],
  ['split digits', '(1) 1 8cm; (2) 10cm'],
  ['TeX spacing between digits', '(1) 1\\,8cm; (2) 10cm'],
  ['math fragments between digits', '(1) 1$8$cm; (2) 10cm'],
  ['split unit wrapper', '(1) 18c\\mathrm{m}; (2) 10cm'],
  ['superscript digits', '(1) ¹⁸cm; (2) 10cm'],
  ['negative length', '(1) -18cm; (2) 10cm'],
  ['explicit positive sign', '(1) +18cm; (2) 10cm'],
  ['decimal without whole part', '(1) .18m; (2) 10cm'],
  ['fraction', '(1) 36/2cm; (2) 10cm'],
  ['TeX fraction', '(1) \\frac{36}{2}cm; (2) 10cm'],
  ['radical', '(1) √324cm; (2) 10cm'],
  ['arithmetic expression', '(1) (9+9)cm; (2) 10cm'],
  ['variable expression', '(1) 18x cm; (2) 10cm'],
  ['exponent', '(1) 18^1cm; (2) 10cm'],
  ['scientific notation', '(1) 1.8e1cm; (2) 10cm'],
  ['oversized integer', '(1) 1000000000000cm; (2) 10cm'],
  ['oversized decimal', '(1) 18.0000000cm; (2) 10cm'],
  ['mixed named and unnamed', '(1) PR=18cm; (2) 10cm'],
]) {
  test(`numbered scalar grammar leaves ${name} unsupported`, () => {
    assert.equal(compare(scalarReference, answer).status, 'unsupported');
    assert.equal(compare(answer, scalarReference).status, 'unsupported');
  });
}

test('unnamed lengths never discard named answer roles', () => {
  assert.equal(compare('(1) PR=18cm; (2) QR=10cm', scalarReference).status, 'different');
  assert.equal(compare(scalarReference, '(1) PR=18cm; (2) QR=10cm').status, 'different');
});

test('numbered scalar grammar retains input and subpart bounds', () => {
  const twelve = Array.from({ length: 12 }, (_, i) => `(${i + 1}) ${i + 1}cm`).join('; ');
  assert.equal(compare(twelve, twelve).status, 'equivalent');
  assert.equal(compare(twelve + '; (13) 13cm', twelve).status, 'unsupported');
  assert.equal(compare(scalarReference + ' '.repeat(4096), scalarReference).status, 'unsupported');
  for (const bad of [null, undefined, 18, {}, []]) assert.equal(compare(bad, scalarReference).status, 'unsupported');
});
