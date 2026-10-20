import test from 'node:test';
import assert from 'node:assert/strict';
import {twoUnknownObservations as solve} from './statisticsConditions.mjs';
const f=n=>({numerator:String(n),denominator:'1'});
const actual={knownValues:[42,36,39],mean:40,variance:6,order:'strictly-increasing'};
test('new inverse deviation table has one exact ordered completion and no approval',()=>{
 const before=JSON.stringify(actual),r=solve(actual);assert.equal(r.status,'unique');assert.deepEqual(r.solutions,[{first:f(40),second:f(43)}]);assert.equal(r.curriculumApproved,false);assert.equal(r.studentMethodProved,false);assert.equal(r.permitsLoad,false);assert.equal(r.rightsApproved,false);assert.equal(JSON.stringify(actual),before);
});
test('labeled ambiguity, reversed order and repeated unknowns remain distinct',()=>{
 const r=solve({...actual,order:'unconstrained'});assert.equal(r.status,'multiple');assert.deepEqual(r.solutions,[{first:f(40),second:f(43)},{first:f(43),second:f(40)}]);
 assert.deepEqual(solve({...actual,order:'strictly-decreasing'}).solutions,[{first:f(43),second:f(40)}]);
 const equal={knownValues:[5,5],mean:5,variance:0,order:'unconstrained'};assert.equal(solve(equal).status,'unique');assert.deepEqual(solve(equal).solutions,[{first:f(5),second:f(5)}]);assert.equal(solve({...equal,order:'strictly-increasing'}).status,'no-solution');
});
test('inconsistent moments and irrational real completions never acquire a rational answer',()=>{
 assert.equal(solve({knownValues:[-10,10],mean:0,variance:0,order:'unconstrained'}).status,'no-solution');
 const r=solve({knownValues:[0],mean:0,variance:1,order:'strictly-increasing'});assert.equal(r.status,'non-rational-solutions-held');assert.deepEqual(r.solutions,[]);assert.deepEqual(r.discriminant,f(6));
});
test('decimal input is exact without numeric rounding or silently zero-filled holes',()=>{
 const r=solve({knownValues:['0.5'],mean:'0.5',variance:'0.125',order:'strictly-increasing'});assert.equal(r.status,'non-rational-solutions-held');
 const exact=solve({knownValues:['0.5','0.5'],mean:'0.5',variance:'0.125',order:'strictly-increasing'});assert.equal(exact.status,'unique');assert.deepEqual(exact.solutions,[{first:f(0),second:f(1)}]);
 for(const knownValues of [[null],[undefined],[true],[{}],[[5]],new Array(2),[],Array(9999).fill(0)])assert.throws(()=>solve({...actual,knownValues}));
});
test('malformed conditions, hidden defaults, extra approval fields and unbounded numbers fail closed',()=>{
 for(const input of [null,[],{}, {...actual,order:undefined},{...actual,variance:-1},{...actual,mean:Infinity},{...actual,mean:'1e2'},{...actual,mean:'0.0000001'},{...actual,mean:1000000000},{...actual,approve:true},{...actual,variance:null}])assert.throws(()=>solve(input));
});
test('integer completions match independent exhaustive labeled assignments across small populations',()=>{
 let checked=0;
 for(let a=-3;a<=3;a++)for(let b=-3;b<=3;b++){
  const known=[-2,2],values=[...known,a,b],mean=values.reduce((s,x)=>s+x,0)/4,variance=values.reduce((s,x)=>s+(x-mean)**2,0)/4;
  // Quarter-integer moments have terminating decimal representations.
  for(const order of ['unconstrained','strictly-increasing','strictly-decreasing']){
   const expected=[];for(let u=-8;u<=8;u++)for(let v=-8;v<=8;v++){
    if(order==='strictly-increasing'&&u>=v||order==='strictly-decreasing'&&u<=v)continue;
    const xs=[...known,u,v];if(xs.reduce((s,x)=>s+x,0)===4*mean&&xs.reduce((s,x)=>s+(x-mean)**2,0)===4*variance)expected.push({first:f(u),second:f(v)});
   }
   const r=solve({knownValues:known,mean,variance,order});assert.deepEqual(r.solutions,expected);assert.equal(r.status,expected.length===0?'no-solution':expected.length===1?'unique':'multiple');checked++;
  }
 }
 assert.equal(checked,147);
});
