"""Focused lifecycle checks for the production Python subprocess boundary."""
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import time
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location("mathgen_engine", ROOT / "api/mathgen-engine.py")
engine = importlib.util.module_from_spec(spec)
spec.loader.exec_module(engine)


class EngineProcessTests(unittest.TestCase):
    def run_script(self, source, timeout=3, limit=1024):
        with tempfile.TemporaryDirectory() as directory:
            script = Path(directory) / "fixture.py"
            script.write_text(source, encoding="utf-8")
            with patch.dict(engine.ENGINES, {"figure": (script, timeout, limit)}):
                return engine.run_engine("figure", {})

    def test_kills_process_on_output_overflow(self):
        started = time.monotonic()
        with self.assertRaises(engine.EngineLimit):
            self.run_script("import sys\nwhile True: sys.stdout.write('x' * 65536); sys.stdout.flush()")
        self.assertLess(time.monotonic() - started, 5)

    def test_kills_process_on_timeout(self):
        started = time.monotonic()
        with self.assertRaises(subprocess.TimeoutExpired):
            self.run_script("import time\ntime.sleep(60)", timeout=0.1)
        self.assertLess(time.monotonic() - started, 5)

    def test_nonzero_exit_is_failure(self):
        with self.assertRaises(ValueError):
            self.run_script("import sys\nsys.exit(1)")

    def test_figure_spec_limit_precedes_process_start(self):
        with patch.object(engine.subprocess, "Popen") as spawn:
            with self.assertRaises(engine.EngineLimit):
                engine.run_engine("figure", {"label": "x" * 65536})
            spawn.assert_not_called()


if __name__ == "__main__":
    unittest.main()
