from pathlib import Path
import json,hashlib
P=Path('.qa-artifacts/exam-resume-20261008/unpaired-pdf-code-audit-20261020-r2').resolve();O=P.with_name('unpaired-pdf-code-audit-20261020-r1');R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');rd=lambda p:json.loads(p.read_text(encoding='utf-8-sig'));s=rd(P/'provided-scope.json');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
rows=[]
for x in s['code']+s['allowedMetadataOnly']:
 p=R/x['path'];h=sha(p);assert h==x['sha256'];rows.append({'path':str(p),'sha256':h})
p=Path(s['historicalInventoryMetadataOnly']);rows.append({'path':str(p),'sha256':sha(p)})
for p in sorted(O.glob('own-*')):
 if p.is_file():rows.append({'path':str(p),'sha256':sha(p)})
(P/'own-before.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8')
p=P/'own-utf8-probe.txt';v='UTF8 \ud55c\uae00 \uac80\uc0ac';p.write_text(v,encoding='utf-8');assert p.read_text(encoding='utf-8')==v
for name in ['own-controls.py','own-cli-probe.py','own-run-cli.py']:
 t=(O/name).read_text(encoding='utf-8-sig').replace('unpaired-pdf-code-audit-20261020-r1','unpaired-pdf-code-audit-20261020-r2')
 t=t.replace("S['allowedMetadataOnly'][0]['path']","next(x['path'] for x in S['allowedMetadataOnly'] if x['path'].endswith('/aggregate-receipt.json'))")
 t=t.replace("read_text(encoding='utf-8')","read_text(encoding='utf-8-sig')")
 (P/name).write_text(t,encoding='utf-8')
print({'hashed':len(rows),'probe':sha(p)})
