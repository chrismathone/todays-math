import json, sys, subprocess, datetime, hashlib
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path('C:/Users/user/orca/workspaces/todays-math/student-clear-e5e6-20261006/docs/planning/tracks/reports/concept-student-clear-20261006/e5e6')
TMP=Path('D:/tmp/concept-student-clear-20261006')
def load(p): return json.loads(p.read_text(encoding='utf-8'))
def dump(p,d): p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def assemble(): subprocess.run([sys.executable,str(TMP/'e5e6-assemble-ctx-a236a872.py')],check=True)
def show(rows):
 for r in rows:
  print('\n',r['sourceIndex'],r['id'],r['learningRole'],r['source']['term'],r['bDecision']+'/'+r['cDecision'])
  b=r.get('bQuestion');c=r.get('clozeQuestion')
  if b:
   print('B',b['prompt']);print('A',b['answer']);print('R',json.dumps(b['requiredIdeas'],ensure_ascii=False,separators=(',',':')))
  else: print('B EXCLUDE',r['bReason'])
  if c:
   print('C',r['cStudentSentence']);print('K',json.dumps(c['acceptedAnswers'],ensure_ascii=False,separators=(',',':')))
  else: print('C EXCLUDE',r['cReason'])
  if r.get('coreAfter'): print('CORE',r['coreAfter'])
  if r.get('requiredDiagramPaths'):print('DIAGRAM',r['requiredDiagramPaths'])
mode=sys.argv[1]
if mode=='capture':
 a,b=map(int,sys.argv[2:4]);audit=load(ROOT/'audit.json');rows=audit['rows'][a:b]
 name=f'evidence/resume-ctx-7fc6b4391c84-input-{a:04d}-{b:04d}.json';p=ROOT/name
 assert not p.exists()
 dump(p,{'sourceCommit':audit['sourceCommit'],'sourceSha256':audit['sourceSha256'],'capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'rows':rows})
 print('INPUT',name);show(rows)
elif mode=='patch':
 batch=load(Path(sys.argv[2]));audit=load(ROOT/'audit.json');ab={r['sourceIndex']:r for r in audit['rows']};ov=load(ROOT/'codex-overrides.json');ob={r['id']:r for r in ov['rows']}
 for index,fields in batch['patches'].items():
  r=ab[int(index)];x=ob.get(r['id'])
  if x is None: x={'id':r['id'],'editorialOwner':'Codex'};ov['rows'].append(x);ob[r['id']]=x
  x.update(fields);x['codexFinalAmendmentEvidence']=str(Path(sys.argv[2]).relative_to(ROOT)).replace('\\','/');x['codexFinalAmendedFromFingerprint']=r['proposalFingerprint']
 dump(ROOT/'codex-overrides.json',ov);assemble();current=load(ROOT/'audit.json');rows=[current['rows'][int(i)] for i in batch['patches']]
 name=str(Path(sys.argv[2]).relative_to(ROOT)).replace('\\','/').replace('.json','-corrected-input.json');assert not (ROOT/name).exists();dump(ROOT/name,{'sourceCommit':audit['sourceCommit'],'sourceSha256':audit['sourceSha256'],'rows':rows});print('CORRECTED',name);show(rows)
elif mode=='record':
 batch=load(Path(sys.argv[2]));audit=load(ROOT/'audit.json');ab={r['sourceIndex']:r for r in audit['rows']};ledger=load(ROOT/'codex-final-editorial.json');lb={r['id']:r for r in ledger['rows']};inp=load(ROOT/batch['inputEvidence']);ib={r['sourceIndex']:r for r in inp['rows']}
 for index,reason in batch['notes'].items():
  assert len(reason)>=15
  r=ab[int(index)];captured=ib[int(index)];assert r['proposalFingerprint']==captured['proposalFingerprint'],index
  if r['id'] in lb:
   assert batch.get('revisionAfterAmendment') is True,'Duplicate settled reading needs explicit revision mode'
   ledger.setdefault('history',[]).append(lb[r['id']]);ledger['rows']=[v for v in ledger['rows'] if v['id']!=r['id']]
  v={'id':r['id'],'bVerdict':'adopt','cVerdict':'adopt','reason':reason,'reader':'Codex worker final direct reading','sourceIndex':r['sourceIndex'],'proposalFingerprintReviewed':r['proposalFingerprint'],'inputEvidence':batch['inputEvidence'],'learningRole':r['learningRole'],'bSourceDecision':r['bDecision'],'cSourceDecision':r['cDecision'],'bSourceReason':r['bReason'],'cSourceReason':r['cReason'],'recordedAfterDirectReading':datetime.datetime.now(datetime.timezone.utc).isoformat()}
  ledger['rows'].append(v);lb[r['id']]=v
 ledger['rows'].sort(key=lambda x:x['sourceIndex']);dump(ROOT/'codex-final-editorial.json',ledger);assemble();print('Recorded',len(batch['notes']),'total',len(ledger['rows']))
else: raise SystemExit('unknown mode')
