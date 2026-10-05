/** Mechanical metadata adapter for a second, independently replayed seek wave. */
import {isDeepStrictEqual} from 'node:util';
import {resolve} from 'node:path';
import {contentSha256,planSource,requireEvidence,validateCertificate,valueSha256} from './admission-plan.mjs';

export function rebaseVerifiedBaseline({inventory,snapshot,certificate,baseline,clock,queues,candidates}) {
  const previous=validateCertificate(inventory,snapshot,certificate);
  requireEvidence(Array.isArray(baseline.records)&&baseline.records.length===inventory.records.length&&
    baseline.writesDatabase===false&&baseline.writesStorage===false,'Invalid current read-only baseline');
  const current=new Map(baseline.records.map(s=>[s.setId,s]));
  const snapshots=new Map(snapshot.snapshots.map(s=>[s.id,s]));
  requireEvidence(current.size===inventory.records.length,'Duplicate current source');
  const expectedQuestions=inventory.records.reduce((n,s)=>n+s.questions.length,0);
  requireEvidence(baseline.questions===expectedQuestions,'Current population differs');
  const nextInventory=structuredClone(inventory),nextSnapshot=structuredClone(snapshot),nextClock=structuredClone(clock);
  const sources=new Map(nextInventory.records.map(s=>[s.sourceRecordId,s]));
  const clockRows=new Map(clock.records.map(s=>[s.sourceRecordId,s]));
  requireEvidence(clock.completeSourceClockReplay===true&&clockRows.size===inventory.records.length&&
    clock.records.length===inventory.records.length,'Incomplete previous actual clocks');
  let preservedCount=0;
  for(const oldSource of inventory.records){
    const plan=planSource(oldSource,snapshots.get(oldSource.setId),previous);
    const now=current.get(oldSource.setId);
    requireEvidence(now&&now.sourceRecordId===oldSource.sourceRecordId&&
      now.revision===oldSource.revision+(plan.markers.length?1:0)&&
      isDeepStrictEqual(now.document,plan.next)&&valueSha256(now.document)===now.documentSha256&&
      isDeepStrictEqual(now.audio,oldSource.audio),'Current source is not exact previous adoption');
    const source=sources.get(oldSource.sourceRecordId);
    source.revision=now.revision;source.documentSha256=now.documentSha256;
    const questions=new Map(now.document.groups[0].questions.map(q=>[q.id,q]));
    for(const question of source.questions){
      const live=questions.get(question.id);question.audioRange=structuredClone(live.audioRange??null);
      if(question.audioRange)preservedCount++;
    }
    const row=nextSnapshot.snapshots.find(s=>s.id===source.setId);
    row.revision=now.revision;row.document=structuredClone(now.document);
    const oldClock=clockRows.get(source.sourceRecordId);
    requireEvidence(oldClock&&oldClock.status==='passed'&&oldClock.revision===oldSource.revision&&
      oldClock.documentSha256===oldSource.documentSha256&&oldClock.sourceAudioSha256===source.sourceAudioSha256&&
      oldClock.playbackSha256===source.audio.sha256&&oldClock.durationMs===source.audio.durationMs,
      'Cannot rebind changed or unverified physical media clock');
    const rebound=nextClock.records.find(c=>c.sourceRecordId===source.sourceRecordId);
    rebound.revision=now.revision;rebound.documentSha256=now.documentSha256;
    const stripped=structuredClone(rebound);stripped.revision=oldClock.revision;stripped.documentSha256=oldClock.documentSha256;
    requireEvidence(isDeepStrictEqual(stripped,oldClock),'Physical clock changed during metadata rebase');
  }
  requireEvidence(baseline.existingStarts===preservedCount,'Current existing-range total differs');
  const proposed=new Map();
  for(const row of candidates){
    const key=`${row.sourceRecordId}:${row.questionId}`,old=previous.get(key),source=sources.get(row.sourceRecordId);
    requireEvidence(old&&old.status==='held'&&source&&row.status==='candidate',
      'Supplement must target a previously held current question');
    requireEvidence(!proposed.has(key),'Duplicate supplemental candidate');
    const oldSource=inventory.records.find(s=>s.sourceRecordId===row.sourceRecordId);
    const question=oldSource.questions.find(q=>q.id===row.questionId);
    for(const [field,value] of Object.entries({setId:oldSource.setId,revision:oldSource.revision,
      documentSha256:oldSource.documentSha256,sourceNumber:question.sourceNumber,
      sourceAudioSha256:oldSource.sourceAudioSha256,playbackSha256:oldSource.audio.sha256,
      asrSha256:oldSource.asrSha256}))requireEvidence(row[field]===value,'Supplement original identity differs: '+field);
    requireEvidence(typeof row.asrPath==='string'&&resolve(row.asrPath)===resolve(oldSource.asrPath),
      'Supplement original ASR path differs');
    proposed.set(key,structuredClone(row));
  }
  const nextQueues=queues.map(queue=>{
    const next=structuredClone(queue);
    next.records=queue.records.map(row=>{
      const key=`${row.sourceRecordId}:${row.questionId}`,old=previous.get(key),source=sources.get(row.sourceRecordId);
      requireEvidence(old&&source&&source.assignedAgent===queue.provider,'Wrong prior queue identity');
      const question=source.questions.find(q=>q.id===row.questionId);
      let result;
      if(question.audioRange)result={...structuredClone(row),status:'existing_verified',
        seekStartMs:question.audioRange.startMs,seekEndMs:question.audioRange.endMs,reasons:[]};
      else if(proposed.has(key))result=proposed.get(key);
      else result={...structuredClone(row),status:'held',seekStartMs:null,reasons:old.reasons.slice()};
      result.revision=source.revision;result.documentSha256=source.documentSha256;
      return result;
    });
    return next;
  });
  requireEvidence(nextQueues.reduce((n,q)=>n+q.records.length,0)===expectedQuestions,'Incomplete rebound queues');
  const keys=nextQueues.flatMap(q=>q.records.map(r=>`${r.sourceRecordId}:${r.questionId}`));
  requireEvidence(new Set(keys).size===expectedQuestions,'Duplicate rebound question');
  return {inventory:nextInventory,snapshot:nextSnapshot,clock:nextClock,queues:nextQueues,
    report:{method:'exact_previous_adoption_metadata_rebase_v1',questions:expectedQuestions,
      preservedStarts:preservedCount,supplementalCandidates:proposed.size,writesDatabase:false,writesStorage:false,
      originalContentSha256:contentSha256(snapshot),physicalClockValuesChanged:false,originalContentChanged:false}};
}
