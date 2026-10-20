from pathlib import Path
import json,hashlib
P=Path('.qa-artifacts/exam-resume-20261008/unpaired-pdf-code-audit-20261020-r1');R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');rd=lambda p:json.loads(Path(p).read_text(encoding='utf-8-sig'));h=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();s=rd(P/'provided-scope.json');rows=[]
for x in s['code']+s['allowedMetadataOnly']:
 p=R/x['path'];assert h(p)==x['sha256'];rows.append({'path':str(p),'sha256':h(p)})
p=Path(s['historicalInventoryMetadataOnly']);rows.append({'path':str(p),'sha256':h(p)});assert rows[-1]['sha256']=='10e2096fbf0f33c9cfaca83b6a57c70398ce2eb27b6f72754c1f6118a55bff88';(P/'own-before.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8');probe='독립 PDF preflight 메타데이터·경로 검사 √\n';(P/'own-utf8-probe.txt').write_text(probe,encoding='utf-8');assert(P/'own-utf8-probe.txt').read_text(encoding='utf-8')==probe
