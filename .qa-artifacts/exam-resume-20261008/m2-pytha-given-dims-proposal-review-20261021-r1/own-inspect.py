from pathlib import Path
import json,difflib
R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');pp=R/'.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m2-pytha-given-dims-candidate-20261021-r1/proposal.json';j=json.loads(pp.read_text(encoding='utf-8-sig'));o=R/j['path'];c=R/j['candidate'];print(''.join(difflib.unified_diff(o.read_text(encoding='utf-8').splitlines(True),c.read_text(encoding='utf-8').splitlines(True),fromfile=j['path'],tofile=j['candidate'])))
