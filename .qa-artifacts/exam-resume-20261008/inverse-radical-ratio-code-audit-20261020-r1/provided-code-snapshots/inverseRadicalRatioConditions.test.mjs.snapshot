import assert from 'node:assert/strict';
import test from 'node:test';
import {inverseRadicalRatio} from './inverseRadicalRatioConditions.mjs';

const input={rootCoefficient:3,reciprocalRadicand:5,reciprocalScale:2,ratioProduct:'8',domain:'a,b,k-positive'};
const q=(n,d=1)=>({numerator:String(n),denominator:String(d)});
const equals=(actual,n,d)=>assert.equal(BigInt(actual.numerator)*BigInt(d),BigInt(actual.denominator)*BigInt(n));
test('recovers the actual new printed inverse-target conditions without a root approximation',()=>{
 const r=inverseRadicalRatio(input);assert.equal(r.status,'unique');assert.deepEqual(r.solutions,[{a:q(4,5),b:q(10),k:q(16,25)}]);assert.deepEqual(r.witness.radicand,q(48,25));
 for(const k of ['curriculumApproved','studentMethodProved','rightsApproved','permitsLoad'])assert.equal(r[k],false);
});
test('independent rational witnesses across 1296 constructed positive condition sets',()=>{
 let cases=0;
 for(let m=1;m<=3;m++)for(let s=1;s<=6;s++)for(let c=1;c<=3;c++)for(let numerator=1;numerator<=6;numerator++)for(const denominator of [1,2,4,5]){
  // Choose a rational witness first and construct its printed product exactly
  // as integer millionths. Then cross-multiply the solver output against it.
  const b=c*s,productMicros=numerator*b*1000000/denominator;assert(Number.isSafeInteger(productMicros));
  const text=`${Math.floor(productMicros/1000000)}.${String(productMicros%1000000).padStart(6,'0')}`;
  const r=inverseRadicalRatio({...input,rootCoefficient:m,reciprocalRadicand:s,reciprocalScale:c,ratioProduct:text});assert.equal(r.status,'unique');assert.equal(r.solutions.length,1);const got=r.solutions[0];equals(got.a,numerator,denominator);equals(got.b,b,1);equals(got.k,numerator*numerator,denominator*denominator);equals(r.witness.radicand,m*numerator*numerator,denominator*denominator);cases++;
 }
 assert.equal(cases,1296);
});
test('zero and negative products contradict the explicit positive domain',()=>{
 for(const ratioProduct of [0,'0.000000','-0','-0.5',-3]){const r=inverseRadicalRatio({...input,ratioProduct});assert.equal(r.status,'no-solution');assert.deepEqual(r.solutions,[]);assert.equal(r.permitsLoad,false);}
});
test('rejects missing domains, degenerate radicals/denominators and unsupported metadata',()=>{
 const invalid=[null,[],{}, {...input,domain:'unconstrained'}, {...input,domain:undefined},{...input,rootCoefficient:0},{...input,rootCoefficient:-1},{...input,rootCoefficient:1.5},{...input,rootCoefficient:1000001},{...input,reciprocalRadicand:0},{...input,reciprocalRadicand:'5'},{...input,reciprocalRadicand:1000001},{...input,reciprocalScale:0},{...input,reciprocalScale:1001},{...input,reciprocalScale:2.5},{...input,approved:true}];
 for(const x of invalid)assert.throws(()=>inverseRadicalRatio(x));
 for(const ratioProduct of [null,true,{},[],NaN,Infinity,'1/2','8 cm','1e2',' 8','8 ','0.1234567','1000000000'])assert.throws(()=>inverseRadicalRatio({...input,ratioProduct}));
});
test('retains exact bounded extremes, deterministic output and caller bytes',()=>{
 const x={...input,rootCoefficient:1000000,reciprocalRadicand:1000000,reciprocalScale:1000,ratioProduct:'999999999.999999'},before=JSON.stringify(x),r=inverseRadicalRatio(x),s=r.solutions[0];assert.equal(r.status,'unique');equals(s.b,1000000000,1);equals(s.a,999999999999999n,1000000000000000n);equals(s.k,999999999999999n**2n,1000000000000000n**2n);assert.equal(JSON.stringify(x),before);assert.deepEqual(inverseRadicalRatio(x),r);
});
