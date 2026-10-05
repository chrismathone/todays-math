import test from 'node:test';
import assert from 'node:assert/strict';
import {planSource,validateCertificate,valueSha256} from './admission-plan.mjs';
import {rebaseVerifiedBaseline} from './rebase-verified-baseline.mjs';

function fixture(){
 const audio={assetId:'asset',sha256:'playback',durationMs:5000};
 const questions=[1,2].map(n=>({id:'q'+n,sourceNumber:n,prompt:'원본 질문 '+n,evidence:[],
  metadata:{sourceRecordId:'source',sourceAudioSha256:'original'},choices:[{id:'a',text:'원본 보기'}]}));
 const document={revision:3,title:'원본',groups:[{id:'group',audio,transcript:{text:'원문'},questions}]};
 const source={sourceRecordId:'source',setId:'set',revision:3,documentSha256:valueSha256(document),groupId:'group',
  assignedAgent:'claude',reconstructed:false,audio,sourceAudioSha256:'original',asrPath:'asr.json',asrSha256:'asr',questions};
 const records=questions.map(q=>({sourceRecordId:'source',setId:'set',revision:3,documentSha256:source.documentSha256,
  questionId:q.id,sourceNumber:q.sourceNumber,provider:'claude',reconstructed:false,sourceAudioSha256:'original',
  playbackSha256:'playback',asrPath:'asr.json',asrSha256:'asr',status:q.sourceNumber===1?'admitted':'held',
  reasons:q.sourceNumber===1?[]:['official_instruction_not_unique'],...(q.sourceNumber!==1?{}:
   {audioRange:{startMs:100,endMs:5000},evidenceGrade:'numbered_instruction',nativeEvidence:{real:'proof'},proofKey:{real:'proof'},scopeQuestionNumbers:[1]})}));
 const inventory={records:[source]},snapshot={snapshots:[{id:'set',revision:3,document}]};
 const certificate={schemaVersion:1,evidenceContractVersion:1,completeReplay:true,productionApplicationAuthorized:false,
  writesDatabase:false,writesStorage:false,writesMedia:false,humanReviewed:false,errors:[],records,preservedExisting:[],
  sourceChecks:[{sourceRecordId:'source',status:'passed',reason:null}],counts:{sources:1,questions:2,providers:{claude:2},
   outcomes:{admitted:1,held:1},evidenceGrades:{numbered_instruction:1}}};
 const plan=planSource(source,snapshot.snapshots[0],validateCertificate(inventory,snapshot,certificate));
 const baseline={writesDatabase:false,writesStorage:false,questions:2,existingStarts:1,records:[{sourceRecordId:'source',
  setId:'set',revision:4,document:plan.next,documentSha256:valueSha256(plan.next),audio}]};
 const clock={completeSourceClockReplay:true,records:[{sourceRecordId:'source',status:'passed',revision:3,
  documentSha256:source.documentSha256,sourceAudioSha256:'original',playbackSha256:'playback',durationMs:5000,
  sampleRate:16000,frameCount:80000,decodedInterleavedInt16Sha256:'physical-pcm'}]};
 const queues=[{provider:'claude',records:records.map(r=>({...structuredClone(r),status:'candidate'}))}];
 const candidates=[{...structuredClone(records[1]),status:'candidate',seekStartMs:2000,seekEndMs:5000}];
 return {inventory,snapshot,certificate,baseline,clock,queues,candidates};
}

test('rebinds revisions only after exact prior adoption and preserves actual clocks and newly existing ranges',()=>{
 const f=fixture(),result=rebaseVerifiedBaseline(f);
 assert.equal(result.report.preservedStarts,1);
 assert.equal(result.queues[0].records[0].status,'existing_verified');
 assert.equal(result.queues[0].records[0].seekStartMs,100);
 assert.equal(result.queues[0].records[1].seekStartMs,2000);
 assert.equal(result.clock.records[0].revision,4);
 assert.equal(result.clock.records[0].decodedInterleavedInt16Sha256,'physical-pcm');
 assert.deepEqual(result.inventory.records[0].questions[0].audioRange,{startMs:100,endMs:5000});
 assert.equal(f.inventory.records[0].revision,3);
 assert.equal(f.clock.records[0].revision,3);
 assert.equal(f.queues[0].records[0].status,'candidate');
});
for(const [name,corrupt] of [
 ['source content edit',f=>{f.baseline.records[0].document.title='edited';}],
 ['existing range change',f=>{f.baseline.records[0].document.groups[0].questions[0].audioRange.startMs=110;}],
 ['different current revision',f=>{f.baseline.records[0].revision=5;}],
 ['missing preservation',f=>{f.baseline.existingStarts=0;}],
 ['clock source swap',f=>{f.clock.records[0].sourceAudioSha256='wrong';}],
 ['incomplete clock',f=>{f.clock.completeSourceClockReplay=false;}],
 ['candidate overwrites accepted start',f=>{f.candidates[0]={...f.candidates[0],questionId:'q1',sourceNumber:1};}],
 ['stale candidate document',f=>{f.candidates[0].documentSha256='current-or-wrong';}],
 ['wrong candidate source',f=>{f.candidates[0].sourceAudioSha256='wrong';}],
 ['duplicate candidate',f=>{f.candidates.push(structuredClone(f.candidates[0]));}],
 ['incomplete queue',f=>{f.queues[0].records.pop();}],
 ['duplicate queue question',f=>{f.queues[0].records[1]=structuredClone(f.queues[0].records[0]);}],
])test('rejects '+name,()=>{const f=fixture();corrupt(f);assert.throws(()=>rebaseVerifiedBaseline(f));});
