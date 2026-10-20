import json
from pathlib import Path
p=Path('.qa-artifacts/exam-resume-20261008/render-boundary-postchange-audit-20261020-r1/own-extra-results.json');r=json.loads(p.read_text(encoding="utf-8"));print(json.dumps([x for x in r['scenarios'] if x['name']=='actual-derived-MC-pure'],ensure_ascii=False,indent=2))

