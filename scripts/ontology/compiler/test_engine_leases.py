"""Actual signed handler boundaries, in process: no server, model or compiler run."""
from email.message import Message
import importlib.util
import io
import os
from pathlib import Path
import unittest
from unittest.mock import Mock, patch

spec = importlib.util.spec_from_file_location("ontology_engine_leases", Path(__file__).resolve().parents[3] / "api/ontology-engine.py")
engine = importlib.util.module_from_spec(spec)
spec.loader.exec_module(engine)


class EngineLeaseBoundaries(unittest.TestCase):
    def invoke(self, *, lease=540, finish=479, start_window=55):
        stamp = 1792800000
        clock = [float(stamp)]
        value = {"protocol": engine.PROTOCOL, "operation": "compile", "audience": "synthetic-deployment", "jobId": "synthetic-job", "inputHash": engine.digest(engine.canonical({})), "leaseGeneration": 2, "expiresAt": stamp + start_window, "leaseExpiresAt": stamp + lease, "nonce": "a" * 32, "input": {}}
        body = engine.canonical(value).encode()
        target = object.__new__(engine.handler)
        target.path = "/api/ontology-engine"
        target.headers = Message()
        for key, val in {"Content-Length": str(len(body)), "x-ontology-timestamp": str(stamp), "x-ontology-signature": engine.signature("synthetic-only", str(stamp), body)}.items():
            target.headers[key] = val
        target.rfile = io.BytesIO(body)
        target.reply = Mock()
        def compile_value(_):
            clock[0] = stamp + finish
            return b'{}'
        engine._nonces.clear()
        with patch.dict(os.environ, {"ONTOLOGY_ENGINE_SECRET": "synthetic-only", "ONTOLOGY_ENGINE_AUDIENCE": "synthetic-deployment"}, clear=True), patch.object(engine.time, "time", side_effect=lambda: clock[0]), patch.object(engine, "compile_child", side_effect=compile_value) as compile_mock:
            target.do_POST()
        return target.reply.call_args.args, compile_mock.call_count

    def test_540_second_lease_survives_old_230_and_300_second_limits(self):
        (status, result), calls = self.invoke(finish=479)
        self.assertEqual((status, calls), (200, 1))
        self.assertEqual(result["leaseGeneration"], 2)

    def test_post_compile_lease_check_is_strict_at_new_deadline(self):
        for finish, expected in [(539.999, 200), (540, 409), (541, 409)]:
            with self.subTest(finish=finish):
                (status, result), calls = self.invoke(finish=finish)
                self.assertEqual((status, calls), (expected, 1))
                if expected == 409:
                    self.assertEqual(result, {"error": "EXPIRED_LEASE"})

    def test_long_lease_does_not_extend_start_authorization_or_600_second_cap(self):
        for arguments, error in [({"lease": 601}, "STALE_LEASE"), ({"lease": 0}, "STALE_LEASE"), ({"start_window": 61}, "STALE_JOB")]:
            with self.subTest(arguments=arguments):
                (status, result), calls = self.invoke(**arguments)
                self.assertEqual((status, calls), (401, 0))
                self.assertEqual(result, {"error": error})


if __name__ == "__main__":
    unittest.main()
