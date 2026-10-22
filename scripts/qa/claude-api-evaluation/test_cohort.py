"""Offline transport/evidence counterexamples. Never loads a credential."""
import copy
import json
import tempfile
import unittest
from pathlib import Path

from cohort import (EvidenceError, SOLVER_FORMAT, audit_response, check_request, decode_json,
                    private_write, verify_file, digest, api_send, freeze_packets)


def request():
    return {"model": "claude-sonnet-5-5", "max_tokens": 4096,
            "output_config": {"effort": "medium"},
            "messages": [{"role": "user", "content": "Solve 2+3."}]}


def response():
    return {"type": "message", "role": "assistant", "id": "msg_synthetic",
            "model": "claude-sonnet-5-5", "stop_reason": "end_turn",
            "usage": {"input_tokens": 10, "output_tokens": 20},
            "content": [{"type": "text", "text": json.dumps({
                "status": "solved", "answer": "5", "reasoning": "2+3=5"})}]}


class Tests(unittest.TestCase):
    def test_positive_raw_to_parsed(self):
        out = audit_response(json.dumps(response()).encode(), request(), "req_synthetic", True)
        self.assertEqual(out["parsed"]["answer"], "5")
        self.assertEqual(out["actualModel"], "claude-sonnet-5-5")

    def test_fail_closed_completion_model_usage_and_tools(self):
        for key, value in [("stop_reason", "max_tokens"), ("stop_reason", "tool_use"),
                           ("model", "unknown"), ("usage", {}), ("type", "error"),
                           ("role", "user"), ("id", "")]:
            x = response(); x[key] = value
            with self.subTest(key=key, value=value), self.assertRaises(EvidenceError):
                audit_response(json.dumps(x).encode(), request(), "req_synthetic", True)
        for kind in ["tool_use", "server_tool_use", "unknown"]:
            x = response(); x["content"].insert(0, {"type": kind})
            with self.subTest(kind=kind), self.assertRaises(EvidenceError):
                audit_response(json.dumps(x).encode(), request(), "req_synthetic", True)

    def test_thinking_allowed_but_never_parsed_as_answer(self):
        x = response(); x["content"].insert(0, {"type": "thinking", "thinking": "private reasoning"})
        self.assertEqual(audit_response(json.dumps(x).encode(), request(), "req_synthetic", True)["parsed"]["answer"], "5")

    def test_output_schema_and_duplicate_json_rejected(self):
        for text in ['{"status":"solved","answer":"5","answer":"6","reasoning":"ok"}',
                     '{"status":"insufficient","answer":"5","reasoning":"missing"}',
                     '```json\n{}\n```', '{"status":"solved","answer":5,"reasoning":"ok"}']:
            x = response(); x["content"][0]["text"] = text
            with self.subTest(text=text), self.assertRaises(EvidenceError):
                audit_response(json.dumps(x).encode(), request(), "req_synthetic", True)
        with self.assertRaises(EvidenceError): decode_json('{"v":NaN}')

    def test_request_boundary(self):
        for key, value in [("tools", []), ("tool_choice", {"type": "none"}),
                           ("model", "claude-fable-5-1"), ("max_tokens", 9000),
                           ("stream", True), ("metadata", {"user_id": "private"})]:
            x = request(); x[key] = value
            with self.subTest(key=key), self.assertRaises(EvidenceError): check_request(x)
        x = request(); del x["output_config"]
        with self.assertRaises(EvidenceError): check_request(x)

    def test_structured_format_keeps_effort_and_same_prompt(self):
        x = request(); x['output_config']['format'] = copy.deepcopy(SOLVER_FORMAT)
        check_request(x)
        self.assertEqual(x['messages'], request()['messages'])
        self.assertEqual(x['output_config']['effort'], 'medium')
        x['output_config']['format']['schema']['additionalProperties'] = True
        with self.assertRaises(EvidenceError): check_request(x)

    def test_private_immutable_bytes_and_tamper(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)/"file.json"; private_write(p, b'{}')
            self.assertEqual(p.stat().st_mode & 0o777, 0o600)
            verify_file(p, digest(b'{}'))
            with self.assertRaises(FileExistsError): private_write(p, b'changed')
            p.write_bytes(b'tampered')
            with self.assertRaises(EvidenceError): verify_file(p, digest(b'{}'))

    def test_no_redirect_handler(self):
        # Mocked exchange is the same boundary used by the live adapter.
        seen = []
        class Fake:
            def open(self, req, timeout):
                seen.append((req.full_url, req.get_header('X-api-key'), timeout))
                import urllib.error
                raise urllib.error.HTTPError(req.full_url, 302, 'redirect',
                                             {'location': 'https://example.com'}, None)
        code, headers, raw = api_send(b'{}', 'synthetic-not-a-key', opener=Fake())
        self.assertEqual(code, 302)
        self.assertEqual(len(seen), 1)
        self.assertEqual(seen[0][0], 'https://api.anthropic.com/v1/messages')


if __name__ == '__main__': unittest.main()
