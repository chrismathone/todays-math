import fs from 'node:fs';
import { it,expect } from 'vitest';
import { generateMiddleProblem } from '@/lib/middle/generate';
import { M2_GEO_SIM } from '@/lib/middle/m2GeoSim';
it('capture actual handler20 and shared non-diagonal09 API32 before M14 change',()=>{
const handler=M2_GEO_SIM.find(e=>e.key==='2-2|평행선 사이의 선분의 길이의 비|10')!.handler;
const modes10=[];
for(let mode=0;mode<2;mode++)for(let index=0;index<10;index++){
const values=[(mode+.5)/2,(index+.5)/10];let used=0;
const output=handler(()=>{if(used>=2)throw Error('unexpected RNG');return values[used++]!;});expect(used).toBe(2);
modes10.push({mode,index,output});}
const old09=Array.from({length:32},(_,i)=>{const seed=20261021+i*7919;return{seed,output:generateMiddleProblem('2-2|평행선 사이의 선분의 길이의 비|09',seed,0)};});
fs.writeFileSync('src/__tests__/fixtures/m2Parallel-before-intersection-20261021.json',JSON.stringify({beforeCommit:'90cb60fcd',technicalOnly:true,newQuestionCredits:0,modes10,old09},null,2)+'\n',{flag:'wx'});
});
