import pathlib,json,hashlib,datetime,collections,subprocess
out=pathlib.Path(__file__).parent; root=out.parent.parent
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
write=lambda p,d:p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
after=read(out/'after-actualrows-and-normalized.json');before=read(out/'before-actualrows-and-normalized.json')
assert sha(root/'audit.json')==before['auditSha256']
assert sha(root/'codex-final-editorial.json')==before['ledgerSha256']
ts=after['targets'];assert len(ts)==235
now=datetime.datetime.now(datetime.timezone.utc).isoformat(); notes=[]; replacements={};ledgers={}
for t in ts:
 d=t['decision'];i=d['index'];r=t['actualRow'];p=t['normalized'];phase='before' if d['verdict']=='retain' else 'after';batch=f'evidence/root-disputes-20261007/{phase}-batch-{i//25*25:03d}.json'
 reader='Codex direct reading of current before-normalized B/C and original blind/key; retained unchanged with individual reason' if d['verdict']=='retain' else 'Codex direct reading; normalized B/C reread in visible terminal output'
 note=dict(id=r['id'],sourceIndex=r['sourceIndex'],verdict=d['verdict'],reason=d['reason'],readAt=d['readAt'] if d['verdict']=='retain' else now,batch=i//25,maximumBatchSize=25,inputEvidence=batch,inputSha256=sha(root/batch),normalizedHashReviewed=p['hash'],proposalFingerprintReviewed=r['proposalFingerprint'],reader=reader,independentApproval=False,independentStatus='pending-root-Claude-current-hash-review')
 notes.append(note)
 l=dict(t['ledger']);l.update(bVerdict='adopt',cVerdict='adopt',reason=d['reason'],sourceIndex=r['sourceIndex'],proposalFingerprintReviewed=r['proposalFingerprint'],inputEvidence=batch,inputSha256=note['inputSha256'],learningRole=r['learningRole'],bSourceDecision=r['bDecision'],cSourceDecision=r['cDecision'],bSourceReason=r.get('bReason'),cSourceReason=r.get('cReason'),recordedAfterDirectReading=now,reader=reader,normalizedHashReviewed=p['hash'],independentApproval=False,disputeEvidence='evidence/root-disputes-20261007/manual-reread-ledger.json')
 r['codexFinalEditorial']=l;r['requiresIndependentReview']=True
 replacements[r['id']]=r;ledgers[r['id']]=l
write(out/'manual-reread-ledger.json',dict(recordedAt=now,provenance='Explicit worker confirmation after reading before batches 0..234, normalized after batches 0..234 and the 13 supplemental normalized rows in terminal output; loops below serialize those human decisions, not reading or independent approval.',rows=notes))
decoder=json.JSONDecoder()
def patch_rows(p,m):
 data=p.read_bytes();assert b'\r\n' in data and data.count(b'\n')==data.count(b'\r\n')
 s=data.decode('utf-8');start=s.index('"rows": [')+len('"rows": [');pos=start;spans=[]
 while True:
  while s[pos].isspace() or s[pos]==',':pos+=1
  if s[pos]==']':break
  v,end=decoder.raw_decode(s,pos)
  if v['id'] in m:
   indent=s[s.rfind('\n',0,pos)+1:pos];replacement=json.dumps(m[v['id']],ensure_ascii=False,indent=2).replace('\n','\r\n'+indent)
   spans.append((pos,end,replacement))
  pos=end
 for a,b,v in reversed(spans):s=s[:a]+v+s[b:]
 p.write_bytes(s.encode('utf-8'));return len(spans)
counts={n:patch_rows(root/n,replacements if n!='codex-final-editorial.json' else ledgers) for n in ['audit.json','partial-audit.json','codex-final-editorial.json']}
assert set(counts.values())=={235}
assert read(root/'audit.json')['rows']==read(root/'partial-audit.json')['rows']
inventory=[]
for t in ts:
 inventory.append(dict(id=t['id'],sourceIndex=t['sourceIndex'],disposition=t['decision']['verdict'],beforeNormalizedHash=next(x for x in before['targets'] if x['id']==t['id'])['normalized']['hash'],currentNormalizedHash=t['normalized']['hash'],currentProposalFingerprint=t['actualRow']['proposalFingerprint'],independentStatus='pending',reason=t['decision']['reason']))
write(out/'current-question-hashes.json',inventory)
write(out/'changed-vs-frozen-handoff.json',dict(frozenHandoffCommit='ad78cd2b75d03708ef8bfef704f101d7d4304c72',originalNegativeResponses=235,uniqueIds=235,currentHashMatchedIds=235,staleHashExcludedIds=0,revisedQuestionIds=[t['id'] for t in ts if t['decision']['verdict']=='revise'],retainedQuestionIds=[t['id'] for t in ts if t['decision']['verdict']=='retain'],currentAuditAndLedgerChangedIds=[t['id'] for t in ts],codexUnresolvedIds=[],independentPendingIds=[t['id'] for t in ts],notes='Current audit/partial/ledger differ from the frozen handoff; 153 normalized question hashes changed and 82 are retained with individual disagreement reasons. All 235 current editorial rows carry new Codex evidence; no Claude negative was changed or converted to pass.'))
packets=sorted({n['evidence'] for t in ts for n in t['negatives']});base=pathlib.Path('D:/tmp/concept-student-clear-20261006/independent-cohorts');pm=[]
for n in packets:
 pm.append(dict(packet=n,files=[dict(path=str(base/(n+'-'+suffix)),sha256=sha(base/(n+'-'+suffix))) for suffix in ['source.json','result.json','blind-input.md','blind-raw.md','blind-meta.json','key-input.md','key-raw.md','key-meta.json']]))
write(out/'original-independent-files-sha256.json',pm)
print(json.dumps(dict(patchedRows=counts,questionRevisions=sum(t['decision']['verdict']=='revise' for t in ts),retained=sum(t['decision']['verdict']=='retain' for t in ts),negativePackets=len(packets))))
