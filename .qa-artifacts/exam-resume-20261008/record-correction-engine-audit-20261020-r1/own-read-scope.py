from pathlib import Path
import json,hashlib
p=Path('.qa-artifacts/exam-resume-20261008/record-correction-engine-audit-20261020-r1')
s=json.loads((p/'scope-input.json').read_text(encoding='utf-8-sig'))
r=[]
for f in s['files']:
 path=Path(f['path']); b=path.read_bytes(); h=hashlib.sha256(b).hexdigest(); assert h==f['sha256'],str(path)
 r.append({'path':str(path),'sha256':h,'bytes':len(b)})
 print(str(path)+' '+str(len(b)))
with (p/'own-source-hashes-before.json').open('x',encoding='utf-8') as out: json.dump(r,out,indent=2)
