"""Actual counterexample on the sealed QA candidate, not production."""
from pathlib import Path
import hashlib
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
OUT = Path(__file__).resolve().parent
WORKER = Path('C:/Users/user/orca/workspaces/todays-math/exam-twin-source-identity-20261008')
candidate_root = WORKER / '.qa-artifacts/exam-resume-20261008/solid-verification-candidate-20261021-r1/own-shadow'
sys.path.insert(0, str(candidate_root))
from core import figure_solid as solid, figure_svg as svg

plane = solid.Plane((0, 0, 0), (0, 0, 1))
bad_lengths = [(1, (0, 0, 0), (1, 0, 0)), (1, (0, 0, 0), (2, 0, 0))]
rows = []
for mode in ['list', 'generator']:
    key = 'bad-lengths-' + mode
    values = list(bad_lengths) if mode == 'list' else (item for item in bad_lengths)
    try:
        solid.verify_solid(key, lengths=values, on_plane=[((0, 0, 0), plane)])
        accepted, error = True, None
    except Exception as exc:
        accepted, error = False, type(exc).__name__ + ': ' + str(exc)
    rows.append(dict(mode=mode, accepted=accepted, expectedAccepted=False, error=error,
                     successfulChecks=svg._VERIFIED.get((__file__, key), 0)))
report = dict(candidate=str(solid.__file__),
              candidateSHA256=hashlib.sha256(Path(solid.__file__).read_bytes()).hexdigest(),
              controls=rows, productionChanged=False, dbWrites=0)
(OUT / 'generator-counterexample.json').write_bytes((json.dumps(report, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
print(json.dumps(report, ensure_ascii=False))
