from pathlib import Path
import json,hashlib
p=Path('.qa-artifacts/exam-resume-20261008/inverse-minimum-engine-audit-20261020-r1')
s=json.loads((p/'scope-input.json').read_text(encoding='utf-8-sig'))
r=[]
for f in s['files']:
 b=Path(f['path']).read_bytes();h=hashlib.sha256(b).hexdigest();assert h==f['sha256'],f['path'];r.append({'path':f['path'],'sha256':h,'bytes':len(b)})
 print(f['path'],len(b))
with (p/'own-source-hashes-before.json').open('x',encoding='utf-8') as o:json.dump(r,o,indent=2)
b=(p/'actual-drafts.json').read_bytes();assert hashlib.sha256(b).hexdigest()==s['packet']['sha256']
d=json.loads(b.decode('utf-8-sig'));print('packet type',type(d).__name__);print('packet keys',list(d) if isinstance(d,dict) else 'list '+str(len(d)))
print(json.dumps(d,ensure_ascii=True)[:11000])
probe='실제 코드 감사 UTF-8: 누락 최솟값·제곱근 비교'
with (p/'own-utf8-probe.txt').open('x',encoding='utf-8') as o:o.write(probe+'\n')
assert (p/'own-utf8-probe.txt').read_text(encoding='utf-8')==probe+'\n'
