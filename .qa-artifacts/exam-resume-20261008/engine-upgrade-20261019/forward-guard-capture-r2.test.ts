import {vi,test,expect} from 'vitest';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {sha256 as stableHash} from '../../../src/lib/examStudy/identity';
import {performance} from 'node:perf_hooks';
import type {Rat} from '../../../src/lib/elementary/forwardReach';
const capture=vi.hoisted(()=>({calls:new Map<string,{nums:Rat[];answer:Rat;result:boolean;count:number}>(),total:0,truncated:0}));
vi.mock('@/lib/elementary/forwardReach',async(importOriginal)=>{
 const original=await importOriginal<typeof import('../../../src/lib/elementary/forwardReach')>();
 return{...original,forwardReachable:(nums:readonly Rat[],answer:Rat)=>{
  const values=nums.map(v=>({n:v.n,d:v.d})),target={n:answer.n,d:answer.d};
  const result=original.forwardReachable(nums,answer);capture.total++;
  const key=JSON.stringify([values,target]),previous=capture.calls.get(key);
  if(previous){if(previous.result!==result)throw Error('Same captured guard inputs produced different outcomes');previous.count++;}
  else if(capture.calls.size<500000)capture.calls.set(key,{nums:values,answer:target,result,count:1});
  else capture.truncated++;
  return result;
 }};
});
vi.mock('server-only',()=>({}));
vi.mock('@/lib/db',()=>({db:new Proxy({},{get(){throw Error('Catalog profiling must not use DB');}})}));
import{getExamStudyCatalog,examStudyFamilies}from'../../../src/lib/examStudy';
test('capture actual legacy registry guard decisions with unchanged production calculations',()=>{
 const output='.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/forward-guard-profile-20261020-r2/';
 const started=performance.now(),catalog=getExamStudyCatalog('중3'),elapsedMs=performance.now()-started;
 const sha=(x:Buffer|string)=>createHash('sha256').update(x).digest('hex'),rows=[...capture.calls.values()];
 const result={utc:new Date().toISOString(),phase:'before-any-optimization',instrumented:true,timingNotAnUninstrumentedProductionLatencyClaim:true,elapsedMs,registryFamilies:examStudyFamilies().length,catalogDigest:sha(JSON.stringify(catalog)),catalogCanonicalDigest:stableHash(catalog),totalGuardCalls:capture.total,uniqueGuardInputs:rows.length,truncated:capture.truncated,codeSha256:sha(fs.readFileSync('src/lib/elementary/forwardReach.ts')),modelsApiDbCalls:0,sourceOriginalOrStudentRecordReads:0,rows};
 const compressed=gzipSync(JSON.stringify(result));fs.writeFileSync(output+'own-before-capture.json.gz',compressed,{flag:'wx'});fs.writeFileSync(output+'own-before-summary.json',JSON.stringify({...result,rows:undefined,captureGzipSha256:sha(compressed)},null,2)+'\n',{flag:'wx'});
 expect(capture.truncated).toBe(0);expect(rows.length).toBeGreaterThan(0);expect(result.registryFamilies).toBe(4224);
 console.log(JSON.stringify({instrumented:true,elapsedMs,totalCalls:capture.total,uniqueInputs:rows.length,registryFamilies:4224,catalogDigest:result.catalogDigest,modelsApiDbCalls:0}));
},90000);
