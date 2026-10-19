import assert from 'node:assert/strict';
import test from 'node:test';
import {compareRecordCorrectionAnswer as compare} from './recordCorrectionAnswer.mjs';
const schema={version:1,kind:'record-correction-and-total',recordLabels:['ㄱ','ㄴ','ㄷ'],correctedExpression:String.raw`\frac{a}{b}`,totalExpression:String.raw`\frac{a}{b}+(b+3)^2`};
const author=String.raw`ㄴ; $\dfrac ab=8+6\sqrt2$; $27$`,raw=String.raw`ㄴ, \dfrac{a}{b}=6\sqrt{2}+8, \dfrac{a}{b}+(b+3)^2=27`;
test('matches the actual distinct sealed presentation without rewriting either answer',()=>{
  const before=[author,raw,JSON.stringify(schema)],result=compare(author,raw,schema);assert.equal(result.status,'equivalent');assert.equal(result.relationTruthProved,false);assert.equal(result.permitsGradeOrQuestionApproval,false);assert.deepEqual([author,raw,JSON.stringify(schema)],before);
});
test('retains label, corrected value, total and expression roles under adverse inputs',()=>{
  for(const value of [raw.replace('ㄴ','ㄱ'),raw.replace('+8','-8'),raw.replace('=27','=28'),raw.replace('=27','=27cm'),raw.replace('6\\sqrt{2}','6\\sqrt{3}'),raw.replace('=27','=27+1/1000000')])assert.notEqual(compare(author,value,schema).status,'equivalent',value);
  for(const value of [raw.replace(String.raw`\dfrac{a}{b}=`,String.raw`\dfrac{b}{a}=`),raw.replace('+(b+3)^2=','+(b+2)^2='),raw.replace('+(b+3)^2=','+(b-3)^2='),raw.replace('=27','=27=28'),raw+',27',raw.replace('ㄴ,',''),raw.replace('=27','=x'),raw.replace('ㄴ,','틀린 것은 ㄴ,')])assert.equal(compare(author,value,schema).status,'unsupported',value);
});
test('does not discard extra parts, swap values, accept bad schema or infer symbolic identities',()=>{
  for(const value of [author+';27',String.raw`ㄴ;27;\frac ab=8+6\sqrt2`,String.raw`ㄴ;\frac ab=(b+3)^2;27`,author.replace('$27$','$2 7$'),author+'$'])assert.notEqual(compare(author,value,schema).status,'equivalent');
  for(const shape of [undefined,{...schema,version:2},{...schema,recordLabels:['ㄴ','ㄴ']},{...schema,totalExpression:'x=27'},{...schema,approve:true}])assert.equal(compare(author,raw,shape).status,'unsupported');
});
test('compares other explicitly typed constant corrections without making their equations true',()=>{
  const shape={...schema,recordLabels:['ㄱ','ㄹ'],correctedExpression:'c',totalExpression:'c+d'};
  assert.equal(compare(String.raw`ㄹ;c=\frac12;\sqrt8`,String.raw`ㄹ,c=0.5,c+d=2\sqrt2`,shape).status,'equivalent');
  assert.notEqual(compare(String.raw`ㄹ;c=\frac12;\sqrt8`,String.raw`ㄹ,c=0.6,c+d=2\sqrt2`,shape).status,'equivalent');
});
