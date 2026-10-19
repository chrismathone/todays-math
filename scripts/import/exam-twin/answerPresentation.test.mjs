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
