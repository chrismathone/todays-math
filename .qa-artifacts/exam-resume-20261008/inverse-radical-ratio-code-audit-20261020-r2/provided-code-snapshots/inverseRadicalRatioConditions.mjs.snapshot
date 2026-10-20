/** Exact, bounded authoring calculation. Never a student-method or release gate. */
import assert from 'node:assert/strict';
import {types} from 'node:util';

const gcd=(a,b)=>{a=a<0n?-a:a;while(b)[a,b]=[b,a%b];return a;};
const fraction=(n,d=1n)=>{assert(d>0n);const g=gcd(n,d);return{n:n/g,d:d/g};};
const multiply=(a,b)=>fraction(a.n*b.n,a.d*b.d);
const output=a=>({numerator:a.n.toString(),denominator:a.d.toString()});
function decimal(value){
 assert(typeof value==='number'||typeof value==='string','A primitive bounded decimal is required');
 const text=String(value);assert(/^-?\d{1,9}(?:\.\d{1,6})?$/u.test(text),'An exact bounded decimal is required');
 const [whole,tail='']=text.replace(/^-/u,'').split('.');
 return fraction((text.startsWith('-')?-1n:1n)*BigInt(whole+tail),10n**BigInt(tail.length));
}
const positiveInteger=(value,max,label)=>{assert(Number.isSafeInteger(value)&&value>=1&&value<=max,`Positive bounded integer ${label} required`);return BigInt(value);};

/**
 * Printed model: sqrt(m*k)=a*sqrt(m), sqrt(s)=b/(c*sqrt(s)), a*b=R.
 * a,b,k must explicitly be positive; m,s,c are positive bounded integers.
 * Squared equality alone is insufficient without this positive-root domain.
 */
export function inverseRadicalRatio(input){
 assert(input&&typeof input==='object'&&!Array.isArray(input),'An explicit condition object is required');
 assert(!types.isProxy(input),'A plain data condition record is required');
 const prototype=Object.getPrototypeOf(input);assert(prototype===Object.prototype||prototype===null,'A plain data condition record is required');
 const descriptors=Object.getOwnPropertyDescriptors(input),keys=Reflect.ownKeys(descriptors);
 assert(keys.every(key=>typeof key==='string'),'Only named condition fields are supported');
 assert.deepEqual(keys.sort(),['domain','ratioProduct','reciprocalRadicand','reciprocalScale','rootCoefficient']);
 for(const descriptor of Object.values(descriptors))assert(Object.hasOwn(descriptor,'value')&&descriptor.enumerable,'Own enumerable data fields are required; accessors are unsupported');
 // Snapshot validated primitive data once. Never invoke caller accessors or
 // re-read a coefficient while constructing its returned model/certificate.
 const {domain,rootCoefficient,reciprocalRadicand,reciprocalScale,ratioProduct}=Object.fromEntries(keys.map(key=>[key,descriptors[key].value]));
 assert.equal(domain,'a,b,k-positive','The positive domain must be explicit');
 const m=positiveInteger(rootCoefficient,1000000,'m'),s=positiveInteger(reciprocalRadicand,1000000,'s'),c=positiveInteger(reciprocalScale,1000,'c'),product=decimal(ratioProduct);
 const base={domain,printedModel:{rootCoefficient,reciprocalRadicand,reciprocalScale,ratioProduct:output(product)},calculationOnly:true,curriculumApproved:false,studentMethodProved:false,rightsApproved:false,permitsLoad:false};
 if(product.n<=0n)return{...base,status:'no-solution',solutions:[],reason:'The product of the two positive ratios must be positive'};
 const b=fraction(c*s),a=fraction(product.n,product.d*b.n),k=multiply(a,a),radicand=multiply(fraction(m),k);
 assert(a.n>0n&&b.n>0n&&k.n>0n);
 assert.deepEqual(multiply(a,b),product);
 assert.deepEqual(radicand,multiply(fraction(m),multiply(a,a)));
 assert.equal(b.n,c*s*b.d);
 return{...base,status:'unique',solutions:[{a:output(a),b:output(b),k:output(k)}],witness:{radicand:output(radicand),positiveRootBranchRequired:true,denominatorNonzero:true,allPrintedRelationsRechecked:true,uniqueness:'The reciprocal relation fixes b, the positive product fixes a, and the positive-root relation fixes k; the positive substitution also proves existence'}};
}
