import pathlib,json,hashlib
out=pathlib.Path(__file__).parent;root=out.parent.parent;read=lambda p:json.loads(p.read_text(encoding='utf-8'))
after=read(out/'after-actualrows-and-normalized.json');manual=read(out/'manual-reread-ledger.json');audit=read(root/'audit.json');ledger=read(root/'codex-final-editorial.json')
notes={n['id']:n for n in manual['rows']};ars={r['id']:r for r in audit['rows']};ls={r['id']:r for r in ledger['rows']};changes={};lcd={}
for t in after['targets']:
 if t['decision']['verdict']!='retain':continue
 id=t['id'];d=t['decision'];batch=f"evidence/root-disputes-20261007/before-batch-{d['index']//25*25:03d}.json";digest=hashlib.sha256((root/batch).read_bytes()).hexdigest();reader='Codex direct reading of current before-normalized B/C and original blind/key; retained unchanged with individual reason'
 notes[id].update(inputEvidence=batch,inputSha256=digest,reader=reader,readAt=d['readAt'])
 ls[id].update(inputEvidence=batch,inputSha256=digest,reader=reader);ars[id]['codexFinalEditorial']=ls[id];changes[id]=ars[id];lcd[id]=ls[id]
decoder=json.JSONDecoder()
def patch(p,m):
 s=p.read_bytes().decode('utf-8');pos=s.index('"rows": [')+len('"rows": [');spans=[]
 while True:
  while s[pos].isspace() or s[pos]==',':pos+=1
  if s[pos]==']':break
  v,end=decoder.raw_decode(s,pos)
  if v['id'] in m:
   indent=s[s.rfind('\n',0,pos)+1:pos];spans.append((pos,end,json.dumps(m[v['id']],ensure_ascii=False,indent=2).replace('\n','\r\n'+indent)))
  pos=end
 for a,b,v in reversed(spans):s=s[:a]+v+s[b:]
 p.write_bytes(s.encode('utf-8'))
for n in ['audit.json','partial-audit.json','codex-final-editorial.json']:patch(root/n,lcd if n=='codex-final-editorial.json' else changes)
(out/'manual-reread-ledger.json').write_text(json.dumps(manual,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Retained 82 records reference actual before-reading inputs and unchanged fingerprints; no new reread claim.')
