import fs from 'node:fs';
import path from 'node:path';
const root='C:/Users/user/orca/workspaces/todays-math/student-clear-m1m2m3-20261006/docs/planning/tracks/reports/concept-student-clear-20261006/m1m2m3';
const a=JSON.parse(fs.readFileSync(root+'/audit.json')),l=JSON.parse(fs.readFileSync(root+'/final-editorial.json')),am=new Map(a.rows.map(r=>[r.id,r])),lm=new Map(l.rows.map(r=>[r.id,r]));
const rel='evidence/resume-editorial-ctx_9cb9b54195a9',dir=root+'/'+rel;
const batches=fs.readdirSync(dir).filter(n=>n.startsWith('verdicts-')&&n.endsWith('.json')).map(n=>{
 const verdict=JSON.parse(fs.readFileSync(dir+'/'+n)),input=JSON.parse(fs.readFileSync(verdict.input)),afterFile=dir+'/amended-'+verdict.label+'.json';
 if(!fs.existsSync(afterFile)&&verdict.changes?.length)throw Error('Missing amended evidence '+verdict.label);
 const after=fs.existsSync(afterFile)?JSON.parse(fs.readFileSync(afterFile)):{rows:input.rows.map(x=>x.proposal)};
 return{verdict,input,after,verdictPath:rel+'/'+n,inputPath:rel+'/'+path.basename(verdict.input),afterPath:rel+'/amended-'+verdict.label+'.json'};
});
const chain=(id,start,end)=>{
 if(start===end)return [];
 const edges=batches.flatMap(b=>{const before=b.input.rows.find(x=>x.proposal.id===id)?.proposal,after=b.after.rows.find(x=>x.id===id);return before&&after&&before.proposalFingerprint!==after.proposalFingerprint?[{from:before.proposalFingerprint,to:after.proposalFingerprint,inputEvidence:b.inputPath,amendedEvidence:b.afterPath,verdictEvidence:b.verdictPath}]:[];});
 const notationRel='evidence/notation-reread-ctx_9cb9b54195a9',nb=JSON.parse(fs.readFileSync(root+'/'+notationRel+'/before.json')).rows.find(x=>x.proposal.id===id)?.proposal,na=JSON.parse(fs.readFileSync(root+'/'+notationRel+'/after.json')).rows.find(x=>x.id===id);
 if(nb&&na)edges.push({from:nb.proposalFingerprint,to:na.proposalFingerprint,inputEvidence:notationRel+'/before.json',amendedEvidence:notationRel+'/after.json',verdictEvidence:notationRel+'/changes.json'});
 const q=[{at:start,steps:[]}],seen=new Set([start]);
 while(q.length){const s=q.shift();for(const e of edges.filter(e=>e.from===s.at)){const steps=[...s.steps,e];if(e.to===end)return steps;if(!seen.has(e.to)){seen.add(e.to);q.push({at:e.to,steps});}}}
 throw Error('No recorded correction chain '+id+' '+start+' -> '+end);
};
for(const [folder,prefix] of [['assist-2400-2899-20261007','assist500-'],['assist-remaining-380-20261007','assist380-']]){
 const imp=JSON.parse(fs.readFileSync(root+'/evidence/'+folder+'/import-record.json'));
 const rows=imp.pending.map(p=>{
  const r=am.get(p.id),e=lm.get(p.id),initial=batches.filter(b=>b.verdict.label.startsWith(prefix)&&b.verdict.notes.some(n=>n.id===p.id));
  if(!initial.length||r?.sourceIndex!==p.sourceIndex||e?.proposalFingerprint!==r?.proposalFingerprint||e.learningRole!==r.learningRole)throw Error('Unresolved supplemental correction '+p.id);
  return{id:p.id,sourceIndex:p.sourceIndex,originalReviewFingerprint:p.proposalFingerprint,resolvedFingerprint:r.proposalFingerprint,originalPrimaryResolutionEvidence:initial.map(b=>b.verdictPath),correctionChain:chain(p.id,p.proposalFingerprint,r.proposalFingerprint),currentReader:e.reader,currentReadAt:e.readAt,currentInputEvidence:e.inputEvidence,bReason:e.bReason,cReason:e.cReason,...(e.coreReason?{coreReason:e.coreReason}:{})};
 });
 fs.writeFileSync(root+'/evidence/'+folder+'/correction-resolution.json',JSON.stringify({resolvedAt:new Date().toISOString(),sourceCommit:a.sourceCommit,importRecord:'import-record.json',supplementalCommit:imp.supplementalCommit,adoptedUnchangedCount:imp.importedIds.length,primaryResolvedCount:rows.length,unresolvedIds:[],disclosure:'Original corrections and later negative-finding amendments remain a traceable chain of actual recorded readings; current attribution is not substituted for the earlier reader.',rows},null,2)+'\n');
 console.log(JSON.stringify({folder,primaryResolved:rows.length}));
}
