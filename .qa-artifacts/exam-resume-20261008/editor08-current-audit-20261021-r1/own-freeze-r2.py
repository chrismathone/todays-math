from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent;E=P/'own-execution-r2'
sha=lambda b:hashlib.sha256(b).hexdigest()
old=json.loads((E/'own-prepared-before.json').read_text(encoding='utf8'));now={p:sha(Path(p).read_bytes())for p in old}
(E/'own-before.json').write_text(json.dumps(now,indent=2),encoding='utf8')
(E/'own-execution-delta.json').write_text(json.dumps({p:{'prepared':old[p],'now':h}for p,h in now.items()if old[p]!=h},indent=2),encoding='utf8')
(E/'own-execution-probe.txt').write_text('UTF8 · R2 current freeze/실제 실행\n',encoding='utf8')
print(json.dumps({'freshFreeze':len(now),'changedSincePreparation':sum(old[p]!=h for p,h in now.items())}))
