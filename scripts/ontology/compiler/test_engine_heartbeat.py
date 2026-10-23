"""Signed streaming handler and bounded child lifecycle; no sockets or services."""
import contextlib
from email.message import Message
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import unittest
from unittest.mock import Mock, patch

spec = importlib.util.spec_from_file_location("ontology_engine_heartbeat", Path(__file__).resolve().parents[3] / "api/ontology-engine.py")
engine = importlib.util.module_from_spec(spec)
spec.loader.exec_module(engine)


class HeartbeatHandler(unittest.TestCase):
    def invoke(self, *, capable=True, standalone=False, finish=20, failure=None, clear=True, signed=True, mode=True, output_limit=None):
        stamp = 1792800000
        clock = [float(stamp)]
        value = {"protocol": engine.PROTOCOL, "operation": "compile", "audience": "synthetic-deployment", "jobId": "synthetic-job", "inputHash": engine.digest(engine.canonical({})), "leaseGeneration": 3, "expiresAt": stamp + 55, "leaseExpiresAt": stamp + 540, "nonce": "b" * 32, "input": {}}
        if mode: value["responseMode"] = "heartbeat-v1"
        body = engine.canonical(value).encode()
        target = object.__new__(engine.handler)
        target.path = "/api/ontology-engine"; target.headers = Message()
        for key, val in {"Content-Length": str(len(body)), "x-ontology-timestamp": str(stamp), "x-ontology-signature": engine.signature("synthetic-only", str(stamp), body) if signed else "0" * 64}.items(): target.headers[key] = val
        target.rfile = io.BytesIO(body); target.wfile = io.BytesIO()
        target.send_response = Mock(); target.send_header = Mock(); target.end_headers = Mock()
        snapshots = []
        def compile_value(_value, heartbeat=None):
            snapshots.append(target.wfile.getvalue())
            if heartbeat:
                heartbeat(); snapshots.append(target.wfile.getvalue())
            clock[0] = stamp + finish
            if failure: raise failure
            return b'{}'
        if clear: engine._nonces.clear()
        environment = {"ONTOLOGY_ENGINE_SECRET": "synthetic-only", "ONTOLOGY_ENGINE_AUDIENCE": "synthetic-deployment"}
        if capable: environment["VERCEL_IPC_PATH"] = "/DO_NOT_LOG_IPC_PATH"
        logs = io.StringIO()
        with patch.dict(os.environ, environment, clear=True), patch.object(engine, "STANDALONE_HTTP", standalone), patch.object(engine.time, "time", side_effect=lambda: clock[0]), patch.object(engine, "compile_child", side_effect=compile_value) as compiler, patch.object(engine, "MAX_RESPONSE", output_limit or engine.MAX_RESPONSE), contextlib.redirect_stderr(logs):
            target.do_POST()
        self.assertNotIn("DO_NOT_LOG_IPC_PATH", logs.getvalue())
        return target, compiler.call_count, snapshots, logs.getvalue()

    def test_first_whitespace_precedes_compile_and_terminal_is_bound(self):
        target, calls, snapshots, logs = self.invoke()
        self.assertEqual(calls, 1); self.assertEqual(snapshots, [b'\n', b'\n\n'])
        self.assertEqual(target.send_response.call_args.args, (200,))
        self.assertFalse(any(call.args[0] == "Content-Length" for call in target.send_header.call_args_list))
        self.assertTrue(target.close_connection)
        terminal = json.loads(target.wfile.getvalue())
        self.assertEqual(set(terminal), {"protocol", "responseMode", "kind", "jobId", "inputHash", "leaseGeneration", "resultGzip", "resultHash"})
        self.assertEqual((terminal["kind"], terminal["responseMode"], terminal["leaseGeneration"]), ("success", "heartbeat-v1", 3))
        self.assertEqual(json.loads(logs), {"event": "ontology_engine_stream_capability", "ipcCapable": True})

    def test_unsupported_legacy_adapter_rejects_before_compile_or_stream(self):
        target, calls, snapshots, _ = self.invoke(capable=False)
        self.assertEqual((target.send_response.call_args.args, calls, snapshots), ((503,), 0, []))
        self.assertEqual(json.loads(target.wfile.getvalue()), {"error": "STREAM_UNAVAILABLE"})
        self.assertFalse(hasattr(target, "_stream_request"))

    def test_standalone_main_support_and_buffered_compatibility(self):
        for mode in [True, False]:
            target, calls, _, _ = self.invoke(capable=False, standalone=True, mode=mode)
            self.assertEqual(calls, 1)
            self.assertEqual(target.send_response.call_args.args, (200,))
            self.assertEqual("kind" in json.loads(target.wfile.getvalue()), mode)

    def test_signed_gate_and_replay_remain_before_first_byte(self):
        target, calls, _, _ = self.invoke(signed=False)
        self.assertEqual((target.send_response.call_args.args, calls), ((401,), 0))
        self.invoke()
        target, calls, _, _ = self.invoke(clear=False)
        self.assertEqual((target.send_response.call_args.args, calls), ((409,), 0))
        self.assertFalse(hasattr(target, "_stream_request"))

    def test_closed_terminal_errors_and_expiry(self):
        for kwargs, code, status in [({"failure": ValueError("DO_NOT_LOG_COMPILER_DETAILS")}, "COMPILER_FAILED", 422), ({"failure": subprocess.TimeoutExpired("synthetic", 480)}, "COMPILER_TIMEOUT", 504), ({"finish": 540}, "EXPIRED_LEASE", 409)]:
            with self.subTest(code=code):
                target, calls, _, _ = self.invoke(**kwargs)
                terminal = json.loads(target.wfile.getvalue())
                self.assertEqual((target.send_response.call_args.args, calls), ((200,), 1))
                self.assertEqual(set(terminal), {"protocol", "responseMode", "kind", "jobId", "inputHash", "leaseGeneration", "status", "error"})
                self.assertEqual((terminal["kind"], terminal["error"], terminal["status"]), ("error", code, status))
                self.assertNotIn(b"DO_NOT_LOG_COMPILER_DETAILS", target.wfile.getvalue())

    def test_total_body_budget_counts_heartbeat_and_terminal(self):
        with patch.object(engine.gzip, "compress", return_value=b"x" * 2000):
            target, _, _, _ = self.invoke(output_limit=2048)
        raw = target.wfile.getvalue()
        self.assertLessEqual(len(raw), 2048)
        self.assertTrue(raw.startswith(b'\n\n'))
        self.assertEqual(json.loads(raw)["error"], "RESPONSE_BUDGET")


class HeartbeatChildLifecycle(unittest.TestCase):
    def test_monotonic_deadline_never_restarts_after_heartbeat(self):
        clock = [0.0]
        child = Mock(stdin=io.BytesIO(), stdout=io.BytesIO())
        def wait(timeout=None):
            if timeout is None: return -9
            clock[0] += timeout
            raise subprocess.TimeoutExpired("synthetic", timeout)
        child.wait.side_effect = wait; child.poll.return_value = None
        heartbeat = Mock()
        with patch.object(engine.subprocess, "Popen", return_value=child), patch.object(engine.time, "monotonic", side_effect=lambda: clock[0]), contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(subprocess.TimeoutExpired): engine.compile_child({}, heartbeat)
        self.assertEqual(clock[0], 480)
        self.assertEqual(heartbeat.call_count, 47)
        child.kill.assert_called_once()
        self.assertEqual(child.wait.call_count, 49)

    def test_disconnect_during_heartbeat_kills_and_reaps(self):
        child = Mock(stdin=io.BytesIO(), stdout=io.BytesIO())
        child.wait.side_effect = [subprocess.TimeoutExpired("synthetic", 10), -9]; child.poll.return_value = None
        heartbeat = Mock(side_effect=BrokenPipeError("synthetic-disconnect"))
        with patch.object(engine.subprocess, "Popen", return_value=child), contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(BrokenPipeError): engine.compile_child({}, heartbeat)
        child.kill.assert_called_once(); self.assertEqual(child.wait.call_count, 2)


if __name__ == "__main__": unittest.main()
