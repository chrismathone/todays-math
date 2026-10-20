/** Typed, bounded presentation comparison. Does not prove any displayed equation. */
import assert from 'node:assert/strict';
import {compareConstantParts} from './constantAnswers.mjs';

function normalize(source) {
  assert(typeof source === 'string' && source.length <= 4096);
  assert(!/\d\s+\d/u.test(source), 'Separated numerals');
  assert.equal((source.match(/\$/gu) ?? []).length % 2, 0, 'Unbalanced math delimiters');
  return source.replace(/\$/gu, '').replace(/−/gu, '-')
    .replace(/\\(?:left|right)/gu, '').replace(/\\(?:dfrac|tfrac)/gu, '\\frac')
    .replace(/\\[,!; ]|[~\s]/gu, '')
    .replace(/\\frac([0-9])([0-9])/gu, '\\frac{$1}{$2}')
    .replace(/\\frac(?:\{([A-Za-z])\}|([A-Za-z]))(?:\{([A-Za-z])\}|([A-Za-z]))/gu,
      (_, a, b, c, d) => `\\frac{${a ?? b}}{${c ?? d}}`)
    .replace(/\^\{([0-9])\}/gu, '^$1');
}
function lhs(source) {
  const value=normalize(source);
  assert(value.length > 0 && value.length <= 256);
  const simple=value.replace(/\\frac\{([A-Za-z])\}\{([A-Za-z])\}/gu, '$1/$2');
  assert(/^[A-Za-z0-9+*/^().-]+$/u.test(simple) && /[A-Za-z]/u.test(simple), 'Unsupported left-hand notation');
  return value;
}
function schemaOf(schema) {
  assert(schema && typeof schema === 'object' && !Array.isArray(schema));
  assert.deepEqual(Object.keys(schema).sort(),['correctedExpression','kind','recordLabels','totalExpression','version'].sort());
  assert.equal(schema.version,1);assert.equal(schema.kind,'record-correction-and-total');
  assert(Array.isArray(schema.recordLabels) && schema.recordLabels.length >= 2 && schema.recordLabels.length <= 14);
  assert(schema.recordLabels.every(x=>typeof x==='string' && /^[ㄱ-ㅎ]$/u.test(x)));
  assert.equal(new Set(schema.recordLabels).size,schema.recordLabels.length);
  const corrected=lhs(schema.correctedExpression),total=lhs(schema.totalExpression);assert.notEqual(corrected,total);
  return{labels:schema.recordLabels,corrected,total};
}
function splitParts(text) {
  const parts=[];let start=0,braces=0,parens=0;
  for(let i=0;i<text.length;i++){
    if(text[i]==='{')braces++;if(text[i]==='}')braces--;
    if(text[i]==='(')parens++;if(text[i]===')')parens--;
    assert(braces>=0&&parens>=0&&braces<=24&&parens<=24,'Unbalanced or excessive grouping');
    if(!braces&&!parens&&/[,;]/u.test(text[i])){parts.push(text.slice(start,i));start=i+1;}
  }
  assert.equal(braces,0);assert.equal(parens,0);parts.push(text.slice(start));assert.equal(parts.length,3,'Exactly three ordered answer parts required');assert(parts.every(Boolean));return parts;
}
function parse(source,schema) {
  const parts=splitParts(normalize(source));assert(schema.labels.includes(parts[0]),'Unknown record label');
  const corrected=parts[1].split('=');assert.equal(corrected.length,2);assert.equal(lhs(corrected[0]),schema.corrected,'Changed correction role');
  const total=parts[2].split('=');assert(total.length===1||total.length===2);
  if(total.length===2)assert.equal(lhs(total[0]),schema.total,'Changed total role');
  const values=[corrected[1],total.at(-1)].map((value,i)=>({role:i?'total':'corrected',value,unit:'none'}));
  assert.equal(compareConstantParts(values,values).status,'equivalent','Unsupported exact scalar');
  return{label:parts[0],values};
}
export function compareRecordCorrectionAnswer(author,independent,schema) {
  const limits={presentationComparisonOnly:true,relationTruthProved:false,permitsGradeOrQuestionApproval:false,generalSymbolicEquivalence:false};
  try{
    const typed=schemaOf(schema),a=parse(author,typed),b=parse(independent,typed);
    return{status:a.label===b.label&&compareConstantParts(a.values,b.values).status==='equivalent'?'equivalent':'different',...limits};
  }catch(error){return{status:'unsupported',reason:error.message,...limits};}
}
