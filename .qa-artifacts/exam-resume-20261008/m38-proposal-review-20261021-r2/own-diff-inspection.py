from pathlib import Path
import json,difflib,hashlib
R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');p=R/'.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m38-candidate-code-20261021-r2/proposal.json';j=json.loads(p.read_text(encoding='utf-8-sig'))
for b in j['bindings']:
 a=R/b['path'];c=R/b['candidate'];assert hashlib.sha256(a.read_bytes()).hexdigest()==b['originalSha256'];assert hashlib.sha256(c.read_bytes()).hexdigest()==b['candidateSha256'];print(''.join(difflib.unified_diff(a.read_text(encoding='utf-8').splitlines(True),c.read_text(encoding='utf-8').splitlines(True),fromfile=b['path'],tofile='candidate/'+b['path'])))
