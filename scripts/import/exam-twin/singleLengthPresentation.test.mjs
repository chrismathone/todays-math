import assert from 'node:assert/strict';
import test from 'node:test';
import {singleLengthPart as parse} from './singleLengthPresentation.mjs';
import {compareConstantParts} from './constantAnswers.mjs';
const compare=(a,b)=>compareConstantParts([parse(a)],[parse(b)]).status;

test('fresh raw radical length presentations retain the entire exact value and explicit unit',()=>{
  const a=Object.freeze({answer:'$(18+18\\sqrt3)\\,\\mathrm{cm}$'}),b=Object.freeze({answer:'18+18√3 cm'});
  const bytes=JSON.stringify({a,b});
  assert.equal(compare(a.answer,b.answer),'equivalent');
  assert.equal(compare('$4\\sqrt3\\,\\mathrm{cm}$','4√3 cm'),'equivalent');
  assert.equal(compare('4√3 cm','√48 cm'),'equivalent');
  assert.equal(compare('4√3 cm','0.04√3 m'),'equivalent');
  assert.equal(compare('$4\\sqrt3$ cm','\\(4\\sqrt{3}\\,\\text{cm}\\)'),'equivalent');
  assert.equal(compare('\\frac{1}{2}m','50cm'),'equivalent');
  assert.equal(compare('18+18√3 cm','18+17√3 cm'),'different');
  assert.equal(compare('4√3 cm','4√3 m'),'different');
  assert.equal(JSON.stringify({a,b}),bytes);
});

test('single lengths fully consume units and scalar syntax without losing named roles or subparts',()=>{
  for(const bad of ['4√3','4√3mm','4√3cm²','4√3cm^2','4√3°','4√3cm m','4cm+4cm','4√3 cm이다',
    '정답4√3cm','AC=4√3cm','(1) 4√3cm','4√3cm, 5cm','4√3cm;5cm','4√3cmcm',
    '4√3\\mathrm{cm}tail','4c\\mathrm{m}','4\\leftcm','4\\rightcm','4\\left(\\sqrt3cm',
    '1 8cm','1\\,8cm','1\\!8cm','1$8$cm','¹⁸cm','１８cm','4e1cm','4√1000001cm',
    '1000000000000cm','4/0cm','4/(1-1)cm','4xcm','$4cm','4cm$','$$4cm$$','(4+4cm',
    '4√3cm /*comment*/', '4√3cm\n5m'])assert.throws(()=>parse(bad),bad);
  for(const bad of [null,undefined,4,{},[]])assert.throws(()=>parse(bad));
  assert.throws(()=>parse('4cm'+' '.repeat(640)));
});

test('equality of a nonpositive scalar does not certify positive lengths or approve problems',()=>{
  // Positivity/existence is independently proved by the math reviewer; this
  // formatter only checks exact values with units and retains the signed value.
  assert.equal(compare('-1cm','-0.01m'),'equivalent');
  assert.equal(compare('0cm','0m'),'equivalent');
  assert.equal(compare('-1cm','1cm'),'different');
  assert.deepEqual(Object.keys(parse('4√3cm')).sort(),['role','unit','value']);
});
