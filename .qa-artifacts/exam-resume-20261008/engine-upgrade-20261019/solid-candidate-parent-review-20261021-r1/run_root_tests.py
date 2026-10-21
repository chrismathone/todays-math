from pathlib import Path
import hashlib
import json
import os
import subprocess
import sys

OUT = Path(__file__).resolve().parent
label = sys.argv[1]
path = Path('vendor/figure-engine/core/figure_solid.py')
r = subprocess.run([sys.executable, '-B', 'scripts/figure/test_solid_verification.py'],
                   env={**os.environ, 'PYTHONIOENCODING': 'utf-8'}, capture_output=True,
                   text=True, encoding='utf-8', timeout=30)
(OUT / (label + '.log')).write_bytes((r.stdout + r.stderr).encode('utf-8'))
report = dict(label=label, returncode=r.returncode, sourceSHA256=hashlib.sha256(path.read_bytes()).hexdigest(),
              outputLog=label + '.log', dbWrites=0)
(OUT / (label + '.json')).write_bytes((json.dumps(report, indent=2) + '\n').encode('utf-8'))
print(json.dumps(report))
sys.exit(r.returncode)
