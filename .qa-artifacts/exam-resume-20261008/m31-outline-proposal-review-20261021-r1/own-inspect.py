from pathlib import Path
import json,hashlib,difflib
R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');p=R/'.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m31-outline-candidate-20261021-r1/proposal.json';j=json.loads(p.read_text(encoding='utf-8-sig'));a=R/j['path'];c=R/j['candidate'];print(''.join(difflib.unified_diff(a.read_text(encoding='utf-8').splitlines(True),c.read_text(encoding='utf-8').splitlines(True),fromfile=j['path'],tofile=j['candidate'])))
