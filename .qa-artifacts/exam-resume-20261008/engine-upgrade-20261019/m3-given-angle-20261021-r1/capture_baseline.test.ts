import fs from 'node:fs';
import { expect,it } from 'vitest';
import { M2_GEO_TRI } from '@/lib/middle/m2GeoTri';
import { generateMiddleProblem } from '@/lib/middle/generate';
it('captures actual finite168 handler cases and32 API specimens before M3 changes',()=>{
  const key='2-2|삼각형의 성질|09';
  const handler=M2_GEO_TRI.find(e=>e.key===key)!.handler;
  const mode0=[],mode1=[];
  for(let index=0;index<21;index++){
    const values1=[.75,(index+.5)/21];let used1=0;
    const output=handler(()=>{if(used1>=2)throw Error('unexpected RNG');return values1[used1++]!;});
    expect(used1).toBe(2);mode1.push({w:40+2*index,values:values1,output});
    for(let d=3;d<=9;d++){
      const values0=[.25,(index+.5)/21,(d-3+.5)/7];let used0=0;
      const output0=handler(()=>{if(used0>=3)throw Error('unexpected RNG');return values0[used0++]!;});
      expect(used0).toBe(3);mode0.push({w:40+2*index,d,values:values0,output:output0});
    }
  }
  const actualAPI=Array.from({length:32},(_,i)=>{const seed=20261021+i*7919;return{seed,output:generateMiddleProblem(key,seed,0)};});
  fs.writeFileSync('src/__tests__/fixtures/m2Bisector-before-given-angle-20261021.json',JSON.stringify({beforeCommit:'886e7664cd157374f4b4138594d346f152720d9d',technicalOnly:true,newQuestionCredits:0,mode0,mode1,actualAPI},null,2)+'\n',{flag:'wx'});
});
