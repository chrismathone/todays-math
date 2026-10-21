"""Execute unchanged copied solid regressions against actual current Root modules."""
from pathlib import Path
import contextlib
import hashlib
import importlib.util
import io
import json
import sys
import unittest

ROOT = Path.cwd()
OUT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / 'vendor/figure-engine'))
from core import figure_solid, figure_svg
source_test = OUT.parent / 'hangul-engine-import-20261021-r1/source-tests/test_figure_solid.py'
assert hashlib.sha256(source_test.read_bytes()).hexdigest() == 'b8461f3dca6dc3034974156aec2680ec8b5013e99c2a7d7c737d827539e46fe6'
assert hashlib.sha256(Path(figure_solid.__file__).read_bytes()).hexdigest() == 'cf20e6c8af66a3de7405e4a25e4ac1c8ab9979a3719603e958b735c1b8126a09'
spec = importlib.util.spec_from_file_location('solid_source_regressions', source_test)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
stream = io.StringIO()
with contextlib.redirect_stdout(stream), contextlib.redirect_stderr(stream):
    result = unittest.TextTestRunner(stream=stream, verbosity=2).run(unittest.defaultTestLoader.loadTestsFromModule(mod))
(OUT / 'source-tests.log').write_bytes(stream.getvalue().encode('utf-8'))
report = dict(run=result.testsRun, failures=len(result.failures), errors=len(result.errors), skipped=len(result.skipped),
    actualSolidPath=str(figure_solid.__file__), actualSvgPath=str(figure_svg.__file__),
    coreSHA256={n: hashlib.sha256((ROOT / 'vendor/figure-engine/core' / n).read_bytes()).hexdigest()
                for n in ['figure_solid.py', 'figure_svg.py']}, inputTestSHA256=hashlib.sha256(source_test.read_bytes()).hexdigest(),
    sourceCopyUnchanged=True, productionBankOrDBWrites=0)
(OUT / 'source-checks.json').write_bytes((json.dumps(report, indent=2) + '\n').encode('utf-8'))
print(json.dumps(report))
sys.exit(not result.wasSuccessful())
