from pathlib import Path
import json
P=Path(__file__).resolve().parent
f=P/'own-finalize.py';s=f.read_text(encoding='utf-8-sig').replace("s.endswith('/package.json')","Path(s).name=='package.json'")
f.write_text(s,encoding='utf-8')
(P/'own-harness-diagnostic.json').write_text(json.dumps({'firstFinalize':'StopIteration locating package.json with forward-slash suffix on Windows Path strings','classification':'own reporting harness failure, not candidate or production execution','correction':'Path(s).name comparison; source bytes and fixtures unchanged','candidateRuntimeExecuted':False},indent=2),encoding='utf-8')
