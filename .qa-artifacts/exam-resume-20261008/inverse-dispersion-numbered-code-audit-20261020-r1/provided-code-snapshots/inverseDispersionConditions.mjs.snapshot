/** Bounded exact authoring/replay calculation; never curriculum or release approval. */
import assert from 'node:assert/strict';

const gcd=(a,b)=>{a=a<0n?-a:a;while(b)[a,b]=[b,a%b];return a;};
const q=(n,d=1n)=>{assert(d>0n);const g=gcd(n,d);return{n:n/g,d:d/g};};
const add=(a,b)=>q(a.n*b.d+b.n*a.d,a.d*b.d);
const sub=(a,b)=>q(a.n*b.d-b.n*a.d,a.d*b.d);
const mul=(a,b)=>q(a.n*b.n,a.d*b.d);
const out=a=>({numerator:a.n.toString(),denominator:a.d.toString()});
function decimal(value){
 assert(typeof value==='number'||typeof value==='string','A primitive bounded decimal is required');
 const s=String(value);assert(/^-?\d{1,9}(?:\.\d{1,6})?$/.test(s),'A bounded exact decimal is required');
 const [whole,tail='']=s.replace(/^-/,'').split('.');return q((s.startsWith('-')?-1n:1n)*BigInt(whole+tail),10n**BigInt(tail.length));
}
function integerRoot(n){
 assert(n>=0n);if(n<2n)return n;
 let x=1n<<BigInt(Math.ceil(n.toString(2).length/2));
 for(;;){const next=(x+n/x)/2n;if(next>=x)return x;x=next;}
}
const squareRoot=a=>{const n=integerRoot(a.n),d=integerRoot(a.d);return n*n===a.n&&d*d===a.d?q(n,d):null;};

/**
 * Recover two labeled observations from the population mean/variance. An explicit
 * order is mandatory: two swapped assignments are not a unique labeled answer.
 * Non-rational roots remain held; floating-point approximations never substitute.
 * This uses author-only algebra. It proves no grade placement or student method.
 */
export function twoUnknownObservations(input){
 assert(input&&typeof input==='object'&&!Array.isArray(input),'An explicit condition object is required');
 assert.deepEqual(Object.keys(input).sort(),['knownValues','mean','order','variance']);
 const {knownValues,order}=input;
 assert(Array.isArray(knownValues)&&knownValues.length>=1&&knownValues.length<=9998,'One to 9998 known observations required');
 assert(['strictly-increasing','strictly-decreasing','unconstrained'].includes(order),'Explicit observation order required');
 const known=Array.from(knownValues,decimal),mean=decimal(input.mean),variance=decimal(input.variance);assert(variance.n>=0n,'Variance must be nonnegative');
 const count=known.length+2,n=q(BigInt(count)),zero=q(0n),two=q(2n);
 const knownSum=known.reduce(add,zero),knownSquares=known.reduce((s,x)=>add(s,mul(x,x)),zero);
 const sum=sub(mul(n,mean),knownSum),squares=sub(mul(n,add(variance,mul(mean,mean))),knownSquares),disc=sub(mul(two,squares),mul(sum,sum));
 const base={count,order,unknownSum:out(sum),unknownSquareSum:out(squares),discriminant:out(disc),calculationOnly:true,curriculumApproved:false,studentMethodProved:false,rightsApproved:false,permitsLoad:false};
 if(disc.n<0n)return{...base,status:'no-solution',solutions:[],reason:'Inconsistent mean/variance and known observations'};
 if(disc.n===0n&&order!=='unconstrained')return{...base,status:'no-solution',solutions:[],reason:'Equal unknown observations violate the strict order'};
 const root=squareRoot(disc);
 if(root===null)return{...base,status:'non-rational-solutions-held',solutions:[],reason:'Real roots exist but exact rational output is outside this bounded contract'};
 const small=mul(sub(sum,root),q(1n,2n)),large=mul(add(sum,root),q(1n,2n));
 const pairs=order==='strictly-increasing'?[[small,large]]:order==='strictly-decreasing'?[[large,small]]:disc.n===0n?[[small,large]]:[[small,large],[large,small]];
 for(const pair of pairs){
  const values=[...known,...pair];
  assert.deepEqual(values.reduce(add,zero),mul(n,mean));
  assert.deepEqual(values.reduce((s,v)=>{const d=sub(v,mean);return add(s,mul(d,d));},zero),mul(n,variance));
 }
 return{...base,status:pairs.length===1?'unique':'multiple',solutions:pairs.map(([first,second])=>({first:out(first),second:out(second)}))};
}
