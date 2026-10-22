"""Real local evidence ledger and synthetic HTTP outcomes, no network/real key."""
import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import cohort
from test_cohort import request, response


class ExecutionTests(unittest.TestCase):
    def fixture(self, p, count=1):
        private = p/'private'; private.mkdir(mode=0o700)
        cohort.save(private/'credential.json', {'apiKey': 'offline-canary-not-a-credential-1234567890'})
        evidence = private/'cohort'; evidence.mkdir(mode=0o700)
        cohort.git(evidence, 'init', '--quiet')
        calls = []
        for i in range(count):
            path = f'requests/q{i}.json'; body = cohort.encoded(request())
            cohort.private_write(evidence/path, body)
            calls.append({'id': f'q{i}', 'kind': 'textbook', 'requestPath': path,
                          'requestSha256': cohort.digest(body), 'packets': [f'q{i}']})
        cohort.save(evidence/'manifest.json', {'calls': calls})
        commit = cohort.seal(evidence, 'Synthetic freeze')
        cohort.save(p/'freeze-receipt.json', {'commit': commit})
        return evidence

    def invoke(self, p, send):
        with patch.object(cohort, 'api_send', send), patch.object(cohort.time, 'sleep'), contextlib.redirect_stdout(io.StringIO()):
            return cohort.run(p)

    def test_completed_calls_not_reissued_and_raw_reparse(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d); evidence = self.fixture(p)
            with patch.object(cohort, 'api_send', return_value=(200, {'request-id': 'req_fake'}, cohort.encoded(response()))) as send:
                with contextlib.redirect_stdout(io.StringIO()):
                    cohort.run(p); cohort.run(p)
                self.assertEqual(send.call_count, 1)
            attempt = evidence/'attempts/q0/attempt-01'
            parsed = cohort.decode_json((attempt/'parsed.json').read_bytes())
            self.assertEqual(parsed, cohort.audit_response((attempt/'response.json').read_bytes(), request(), 'req_fake', True))

    def test_429_only_retry_is_counted(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d); evidence = self.fixture(p)
            calls = []
            def send(*_):
                calls.append(1)
                return (429, {}, b'{}') if len(calls) == 1 else (200, {'request-id': 'req_fake'}, cohort.encoded(response()))
            self.invoke(p, send)
            self.assertEqual(len(calls), 2)
            self.assertEqual(len(list(evidence.glob('attempts/*/attempt-*/start.json'))), 2)
            self.assertEqual(cohort.decode_json((evidence/'attempts/q0/attempt-01/result.json').read_bytes())['httpStatus'], 429)

    def test_ambiguous_network_stops_without_reissue(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d); evidence = self.fixture(p)
            def send(*_): raise TimeoutError('must never serialize this detail')
            result = self.invoke(p, send)
            self.assertTrue(result['halted'])
            self.invoke(p, lambda *_: self.fail('ambiguous call repeated'))
            raw = (evidence/'attempts/q0/attempt-01/result.json').read_text()
            self.assertNotIn('must never serialize', raw)
            self.assertIn('network_unknown', raw)

    def test_credential_reflection_never_saved(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d); evidence = self.fixture(p)
            result = self.invoke(p, lambda body, key: (400, {}, key.encode()))
            self.assertTrue(result['halted'])
            self.assertFalse((evidence/'attempts/q0/attempt-01/response.json').exists())

    def test_expired_key_preserved_without_retry(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d); evidence = self.fixture(p)
            self.assertTrue(self.invoke(p, lambda *_: (401, {'request-id': 'req_fake'}, b'{}'))['halted'])
            self.assertEqual(len(list(evidence.glob('attempts/*/attempt-*/start.json'))), 1)

    def test_changed_request_never_sent(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d); evidence = self.fixture(p)
            (evidence/'requests/q0.json').write_text('{}')
            with self.assertRaises(cohort.EvidenceError):
                self.invoke(p, lambda *_: self.fail('tampered request sent'))

    def test_shared_cap_counts_attempts_before_dispatch(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d); evidence = self.fixture(p, count=3)
            calls = []
            def send(*_):
                calls.append(1)
                return 200, {'request-id':'req_fake'}, cohort.encoded(response())
            with patch.object(cohort, 'LIMIT', 1):
                self.assertTrue(self.invoke(p, send)['halted'])
            self.assertEqual(len(calls), 1)
            self.assertEqual(len(list(evidence.glob('attempts/*/attempt-*/start.json'))), 1)


if __name__ == '__main__': unittest.main()
