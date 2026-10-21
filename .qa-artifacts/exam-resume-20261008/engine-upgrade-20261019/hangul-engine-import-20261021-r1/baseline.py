"""Read-only source/target binding and actual pre-import failure."""
from pathlib import Path
import datetime
import hashlib
import importlib.metadata
import json
import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path.cwd()
OUT = Path(__file__).resolve().parent
SOURCE = Path('D:/시험지 한글화/docs/export/todays-math')

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def git(*args):
    return subprocess.check_output(['git', *args], text=True, encoding='utf-8').strip()

assert not (OUT / 'baseline.json').exists()
source = [{'path': str(p.relative_to(SOURCE)), 'sha256': digest(p), 'bytes': p.stat().st_size}
          for p in sorted(SOURCE.rglob('*')) if p.is_file()]
target = ['vendor/figure-engine/core/' + n for n in
          ['figure_svg.py', 'figure_quality.py', 'figure_scene.py', 'figure_solid.py', 'label_markup.py']]
target += ['vendor/hwpx/latex_to_hwpeq.py', 'scripts/figure/render_spec.py']
checks = []
for name in ['01-figure-engine.patch', '02-latex-to-hwpeq.patch']:
    run = subprocess.run(['git', 'apply', '--check', str(SOURCE / 'patches' / name)],
                         capture_output=True, text=True, encoding='utf-8')
    checks.append({'patch': name, 'returncode': run.returncode, 'stdout': run.stdout, 'stderr': run.stderr})
script = '''import sys, json
sys.path.insert(0, 'vendor/figure-engine')
from core.figure_svg import lint_svg
svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><line x1="10" y1="30" x2="110" y2="30" stroke="black" stroke-width="1.9"/></svg>'
try:
    print(json.dumps({'issues': lint_svg(svg)}))
except Exception as exc:
    print(json.dumps({'errorType': type(exc).__name__, 'error': str(exc)}))
'''
probe = subprocess.run([sys.executable, '-B', '-c', script], capture_output=True, text=True, encoding='utf-8')
deps = {}
for package in ['resvg-py', 'numpy', 'Pillow', 'pytest', 'psutil']:
    try:
        deps[package] = importlib.metadata.version(package)
    except importlib.metadata.PackageNotFoundError:
        deps[package] = None
report = dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(), head=git('rev-parse', 'HEAD'),
              main=git('rev-parse', 'origin/main'), sourceRoot=str(SOURCE), sourceFiles=source,
              targetBefore=[{'path': p, 'sha256': digest(ROOT / p)} for p in target],
              patchChecks=checks, actualLintProbe=dict(returncode=probe.returncode,
              stdout=probe.stdout, stderr=probe.stderr), dependencies=deps,
              sourceReadOnly=True, sourceTestsExecutedInPlace=False, dbWrites=0)
(OUT / 'baseline.json').write_bytes((json.dumps(report, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
print(json.dumps({k: report[k] for k in ['head', 'main', 'patchChecks', 'actualLintProbe', 'dependencies']},
                 ensure_ascii=False, indent=2))
