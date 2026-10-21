import fs from 'node:fs';
import { it,expect } from 'vitest';
import { M2_GEO_QUAD } from '@/lib/middle/m2GeoQuad';
import { generateMiddleProblem } from '@/lib/middle/generate';
it('captures all103 accepted trapezoid08 parameter combinations and shared callers',()=>{
 const key='2-2|여러 가지 사각형|08';const handler=M2_GEO_QUAD.find(e=>e.key===key)!.handler;
 const mode0=[],mode1=[];
 for(let p=4;p<=16;p+=2)for(let q=6;q<=24;q+=2)if(q>p){
  const values=[.25,(p/2-2+.5)/7,(q/2-3+.5)/10];let used=0;
  const output=handler(()=>{if(used>=3)throw Error('unexpected RNG');return values[used++]!;});expect(used).toBe(3);mode0.push({p,q,values,output});
 }
 for(let p=4;p<=12;p++)for(let c=4;c<=14;c+=2){
  const values=[.75,(p-4+.5)/9,(c/2-2+.5)/6];let used=0;
  const output=handler(()=>{if(used>=3)throw Error('unexpected RNG');return values[used++]!;});expect(used).toBe(3);mode1.push({p,c,values,output});
 }
 expect(mode0).toHaveLength(49);expect(mode1).toHaveLength(54);
 const actualAPI=Array.from({length:32},(_,i)=>{const seed=20261021+i*7919;return{seed,output:generateMiddleProblem(key,seed,0)};});
 const shared=M2_GEO_QUAD.filter(e=>e.key!==key).map(e=>({key:e.key,seed:20261021,output:generateMiddleProblem(e.key,20261021,0)}));
 fs.writeFileSync('src/__tests__/fixtures/m2Trapezoid-before-given-angle-20261021.json',JSON.stringify({beforeCommit:'46dd1ecee9834a4023b61a74bfe87b9c931e1c30',technicalOnly:true,newQuestionCredits:0,mode0,mode1,actualAPI,shared},null,2)+'\n',{flag:'wx'});
});
