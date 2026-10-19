from pathlib import Path
import json,hashlib
p=Path('.qa-artifacts/exam-resume-20261008/inverse-minimum-engine-audit-20261020-r2')
s=json.loads((p/'scope-input.json').read_text(encoding='utf-8-sig'))
r=[]
for f in s['files']:
 b=Path(f['path']).read_bytes();h=hashlib.sha256(b).hexdigest();assert h==f['sha256'],f['path'];r.append({'path':f['path'],'sha256':h})
receipt=json.loads((p/'baseline-source-receipt.json').read_text(encoding='utf-8-sig'))
for f in receipt['sources']:assert hashlib.sha256((p/f['copy']).read_bytes()).hexdigest()==f['sha256']
b=(p/'actual-drafts.json').read_bytes();assert hashlib.sha256(b).hexdigest()==s['packet']['sha256'];d=json.loads(b.decode('utf-8-sig'))
print('packet keys',list(d));print([(k,len(v)) for k,v in d.items() if isinstance(v,list)])
with (p/'own-source-hashes-before.json').open('x',encoding='utf-8') as o:json.dump(r,o,indent=2)
probe='R2 독립 감사 UTF-8: 인쇄 계수 차·제곱 경계 인증'
with (p/'own-utf8-probe.txt').open('x',encoding='utf-8') as o:o.write(probe+'\n')
assert (p/'own-utf8-probe.txt').read_text(encoding='utf-8')==probe+'\n'
for name in ['own-audit-seal-hashes.json','own-decimal-rational-oracle.json','own-generated-drafts.json','own-solution-and-revision-checks.json','own-primary-grade-evidence.json']:
 q=Path('.qa-artifacts/exam-resume-20261008/inverse-root-table-engine-audit-20261019-r1')/name
 a=json.loads(q.read_text(encoding='utf-8-sig'));print(name,type(a).__name__,list(a) if isinstance(a,dict) else len(a));print(json.dumps(a,ensure_ascii=True)[:2200])
