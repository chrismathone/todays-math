/** Explicit unitless named answer roles; no symbolic equation or grade proof. */
import assert from 'node:assert/strict';
import {compareConstantParts} from './constantAnswers.mjs';

function groupedParts(source){
 assert(typeof source==='string'&&source.length>0&&source.length<=4096,'Bounded numbered assignments required');
 const text=source.trim(),marks=[];let braces=0,parens=0,math=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='$'){assert(text[i-1]!=='$'&&text[i+1]!=='$','Single inline math delimiters only');math=!math;continue;}
  if(!math&&!braces&&!parens&&(i===0||/[\s;]/u.test(text[i-1]))){
   const mark=/^\((\d{1,2})\)(?=\s|[A-Za-z$])/u.exec(text.slice(i));
   if(mark){assert.equal(mark[1],String(marks.length+1),'Canonical ordered subparts required');marks.push({start:i,end:i+mark[0].length});i+=mark[0].length-1;continue;}
  }
  if(c==='{')braces++;if(c==='}')braces--;if(c==='(')parens++;if(c===')')parens--;
  assert(braces>=0&&parens>=0&&braces<=24&&parens<=24,'Balanced bounded grouping required');
 }
 assert(!math&&!braces&&!parens,'Unbalanced math or grouping');assert(marks.length>=1&&marks.length<=12&&marks[0].start===0,'Numbered subparts required');
 return marks.map((m,i)=>text.slice(m.end,marks[i+1]?.start??text.length).trim().replace(/;$/u,'').trim());
}
function assignments(body){
 const terms=[];let start=0,braces=0,parens=0,math=false;
 for(let i=0;i<body.length;i++){
  const c=body[i];if(c==='$')math=!math;
  if(c==='{')braces++;if(c==='}')braces--;if(c==='(')parens++;if(c===')')parens--;
  if(c===','&&!braces&&!parens&&!math&&body[i-1]!=='\\'){terms.push(body.slice(start,i));start=i+1;}
 }
 terms.push(body.slice(start));assert(terms.length>=1&&terms.length<=8,'Bounded assignment count required');const seen=new Set();
 return terms.map(term=>{
  let text=term.trim();if(text.startsWith('$')&&text.endsWith('$'))text=text.slice(1,-1).trim();assert(!text.includes('$'),'One complete assignment per math fragment');
  const match=/^([A-Za-z])\s*=\s*(.+)$/us.exec(text);assert(match&&!seen.has(match[1]),'Unique single ASCII letter assignment required');seen.add(match[1]);
  const value=match[2].trim();assert(!value.includes('='),'One assignment relation required');assert(!/\\(?:left|right)/u.test(value),'Explicit scalar grouping required');assert(!/\d(?:\s|\\[,!; ])+\d/u.test(value),'Separated numerals');
  const part={role:match[1],value,unit:'none'};assert.equal(compareConstantParts([part],[part]).status,'equivalent','One exact unitless constant required');return part;
 });
}
function parse(source){const parts=groupedParts(source).map(assignments);assert(parts.reduce((n,x)=>n+x.length,0)<=32,'Bounded total assignments required');return parts;}
export function compareNumberedConstantAssignments(author,independent){
 const limits={presentationComparisonOnly:true,relationTruthProved:false,permitsGradeOrQuestionApproval:false,generalSymbolicEquivalence:false};
 try{const a=parse(author),b=parse(independent);return{status:a.length===b.length&&a.every((part,i)=>compareConstantParts(part,b[i]).status==='equivalent')?'equivalent':'different',...limits};}
 catch(error){return{status:'unsupported',reason:error.message,...limits};}
}
