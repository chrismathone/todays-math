"""Run vendored-only checks from local copies, never execute the source checkout."""
from pathlib import Path
import datetime
import hashlib
import json
import os
import re
import subprocess
import sys

ROOT = Path.cwd()
OUT = Path(__file__).resolve().parent
SOURCE = Path('D:/시험지 한글화')
sys.stdout.reconfigure(encoding='utf-8')

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

baseline = json.loads((OUT / 'baseline.json').read_text(encoding='utf-8'))
export = SOURCE / 'docs/export/todays-math'
for row in baseline['sourceFiles']:
    assert digest(export / row['path']) == row['sha256'], row['path']
for row in baseline['targetBefore']:
    if Path(row['path']).name in ['figure_scene.py', 'figure_solid.py', 'label_markup.py', 'render_spec.py']:
        assert digest(ROOT / row['path']) == row['sha256'], row['path']

test_names = ['test_figure_solid.py', 'test_figure_svg_gate.py', 'test_figure_svg_tangency.py',
              'test_figure_svg_dimension.py', 'test_figure_gate_warnings.py']
copies = OUT / 'source-tests'
copies.mkdir(exist_ok=True)
copy_rows = []
for name in test_names:
    src, dst = SOURCE / 'tests' / name, copies / name
    if not dst.exists():
        dst.write_bytes(src.read_bytes())
    assert src.read_bytes() == dst.read_bytes()
    copy_rows.append(dict(name=name, sha256=digest(src), rawCopyUnchanged=True))

# The omitted case runs a private exam corpus script; no corpus/figure is imported.
omitted = 'test_wangseon_q1_renders_italic_x_run_instead_of_literal_markup'
code = '''import importlib.util, pathlib, sys, unittest
sys.path.insert(0, str(pathlib.Path.cwd() / 'vendor/figure-engine'))
prefix = pathlib.Path(sys.argv[1])
suite = unittest.TestSuite()
def leaves(s):
    for t in s:
        if isinstance(t, unittest.TestSuite): yield from leaves(t)
        else: yield t
for path in sorted(prefix.glob('test_*.py')):
    if path.name == 'test_figure_gate_warnings.py': continue
    spec = importlib.util.spec_from_file_location(path.stem, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    for test in leaves(unittest.defaultTestLoader.loadTestsFromModule(module)):
        if not test.id().endswith(sys.argv[2]): suite.addTest(test)
result = unittest.TextTestRunner(verbosity=2).run(suite)
sys.exit(not result.wasSuccessful())
'''
runs = []
commands = [
    ('local-regressions', [sys.executable, '-B', 'scripts/figure/test_vendor_tools.py']),
    ('source-compatible-regressions', [sys.executable, '-B', '-c', code, str(copies), omitted]),
    ('source-background-controls', [sys.executable, '-B', '-c',
      "import runpy,sys; sys.path.insert(0,'vendor/figure-engine'); runpy.run_path(sys.argv[1],run_name='__main__')",
      str(copies / 'test_figure_gate_warnings.py')]),
]
for name, cmd in commands:
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8',
                       env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1', 'PYTHONIOENCODING': 'utf-8'}, timeout=180)
    log_name = name + '-r2.log'
    (OUT / log_name).write_bytes((r.stdout + r.stderr).encode('utf-8'))
    counts = re.findall(r'Ran (\d+) tests?', r.stderr)
    runs.append(dict(name=name, returncode=r.returncode, tests=int(counts[-1]) if counts else None,
                     outputLog=log_name, outputSha256=digest(OUT / log_name)))

result = dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(), runs=runs,
              sourceTestCopies=copy_rows, omittedPrivateCorpusTest=omitted,
              sourceExportUnchanged=True, preservedTargetModules=['figure_scene.py', 'figure_solid.py', 'label_markup.py', 'render_spec.py'],
              liveRepairRouting=False, defaultGeometrySnap=False, dbWrites=0)
result['priorHarnessFailure'] = 'First copied-source run could not decode cp949 child stderr as UTF-8; no source-compatible pass was recorded. R2 sets PYTHONIOENCODING=utf-8; no source tests changed.'
(OUT / 'python-checks.json').write_bytes((json.dumps(result, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
print(json.dumps(result, ensure_ascii=False, indent=2))
sys.exit(any(r['returncode'] for r in runs))
