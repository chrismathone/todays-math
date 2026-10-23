"""Small real subprocesses and deterministic timeout coverage; no HTTP or builds."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import resource
import signal
import subprocess
import sys
import unittest
from unittest.mock import Mock, patch

spec = importlib.util.spec_from_file_location(
    "ontology_engine_resources", Path(__file__).resolve().parents[3] / "api/ontology-engine.py"
)
engine = importlib.util.module_from_spec(spec)
spec.loader.exec_module(engine)
REAL_POPEN = subprocess.Popen


class EngineResourceBoundaries(unittest.TestCase):
    def run_child(self, program, *, fails=False, limit=None):
        def spawn(_args, **kwargs):
            return REAL_POPEN([sys.executable, "-B", "-c", program], **kwargs)

        logs = io.StringIO()
        with contextlib.redirect_stderr(logs), patch.object(engine.subprocess, "Popen", side_effect=spawn), patch.object(engine, "MAX_OUTPUT", limit or engine.MAX_OUTPUT):
            if fails:
                with self.assertRaises(ValueError):
                    engine.compile_child({"private": "DO_NOT_LOG_REQUEST"})
                result = None
            else:
                result = engine.compile_child({"private": "DO_NOT_LOG_REQUEST"})
        self.assertNotIn("DO_NOT_LOG_REQUEST", logs.getvalue())
        self.assertNotIn("DO_NOT_LOG_STDERR", logs.getvalue())
        log = json.loads(logs.getvalue())
        self.assertEqual(log["event"], "ontology_compiler_child")
        self.assertEqual(log["cpuSoftSeconds"], 400)
        self.assertEqual(log["cpuHardSeconds"], 401)
        self.assertEqual(log["wallSeconds"], 480)
        self.assertGreaterEqual(log["cpuSeconds"], 0)
        self.assertGreaterEqual(log["elapsedMs"], 0)
        return result, log

    def test_bounded_cpu_trial_preserves_linux_address_space_limit(self):
        with patch.object(resource, "setrlimit") as set_limit, patch.object(engine.sys, "platform", "linux"):
            engine.limits()
        self.assertEqual(set_limit.call_args_list[0].args, (resource.RLIMIT_CPU, (400, 401)))
        self.assertEqual(set_limit.call_args_list[1].args, (resource.RLIMIT_AS, (1536 * 1024 * 1024,) * 2))

    def test_success_preserves_result_bytes_and_logs_only_resource_metadata(self):
        result, log = self.run_child('import sys; sys.stdin.buffer.read(); sys.stdout.write("{\\"ok\\":true}"); sys.stderr.write("DO_NOT_LOG_STDERR")')
        self.assertEqual(result, b'{"ok":true}')
        self.assertEqual(log["returnCode"], 0)
        self.assertIsNone(log["signal"])
        self.assertFalse(log["wallTimeout"])
        self.assertFalse(log["stdoutOverflow"])

    def test_actual_child_signal_is_distinguished_from_wall_timeout(self):
        _, log = self.run_child("import os,signal,sys; sys.stdin.buffer.read(); os.kill(os.getpid(), signal.SIGTERM)", fails=True)
        self.assertEqual(log["returnCode"], -signal.SIGTERM)
        self.assertEqual(log["signal"], "SIGTERM")
        self.assertFalse(log["wallTimeout"])

    def test_stdout_overflow_remains_a_failure(self):
        _, log = self.run_child('import sys; sys.stdin.buffer.read(); sys.stdout.write("x" * 64)', fails=True, limit=16)
        self.assertTrue(log["stdoutOverflow"])

    def test_wall_timeout_kills_and_reaps_without_long_sleep(self):
        child = Mock(stdin=io.BytesIO(), stdout=io.BytesIO())
        child.wait.side_effect = [subprocess.TimeoutExpired("synthetic-child", 480), -signal.SIGKILL]
        child.poll.return_value = None
        logs = io.StringIO()
        with contextlib.redirect_stderr(logs), patch.object(engine.subprocess, "Popen", return_value=child):
            with self.assertRaises(subprocess.TimeoutExpired):
                engine.compile_child({})
        child.kill.assert_called_once()
        self.assertEqual(child.wait.call_args_list[0].kwargs, {"timeout": 480})
        self.assertEqual(child.wait.call_count, 2)
        log = json.loads(logs.getvalue())
        self.assertTrue(log["wallTimeout"])
        self.assertEqual(log["signal"], "SIGKILL")

    def test_platform_memory_metadata_accepts_only_bounded_positive_decimal(self):
        for value, expected in [("2048", 2048), ("4096", 4096), ("0", None), ("-1", None), ("2048\nDO_NOT_LOG_ENV", None), ("999999999999999", None)]:
            with self.subTest(value=value):
                logs = io.StringIO()
                with patch.dict(os.environ, {"AWS_LAMBDA_FUNCTION_MEMORY_SIZE": value, "UNRELATED_SECRET": "DO_NOT_LOG_ENV"}), contextlib.redirect_stderr(logs):
                    engine.child_diagnostic(0, engine.time.monotonic(), 0, False, False)
                self.assertNotIn("DO_NOT_LOG_ENV", logs.getvalue())
                self.assertEqual(json.loads(logs.getvalue())["platformMemoryMiB"], expected)


if __name__ == "__main__":
    unittest.main()
