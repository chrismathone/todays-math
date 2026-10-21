"""Synthetic only. Never reads production dumps or invokes a model."""
import json
import tempfile
import unittest
from pathlib import Path

import review_core as c


class ReviewTests(unittest.TestCase):
    def test_join_rejects_duplicate_and_crossed_identity(self):
        target = [{"problemCode": "SYN-001", "externalId": "s1"}]
        db = [{**target[0], "sourceFile": "G:\\fake.hwp", "bookKey": "synthetic"}]
        orig = [{"id": "s1", "path": "G:\\fake.hwp"}]
        ledger = [dict(db[0])]
        self.assertEqual(c.join_targets(target, db, ledger, orig)[0]["issues"], [])
        self.assertIn("db:duplicate", c.join_targets(target, db * 2, ledger, orig)[0]["issues"])
        ledger[0]["problemCode"] = "SYN-002"
        self.assertIn("ledger:problemCode", c.join_targets(target, db, ledger, orig)[0]["issues"])
        self.assertIn("original:missing", c.join_targets(target, db, ledger, [])[0]["issues"])
        with self.assertRaises(ValueError):
            c.join_targets(target * 2, db, ledger, orig)

    def test_projection_preserves_question_not_metadata(self):
        text = "보기: ① $2$ ② $3$\n(1) 단위는 cm이다.\n(정답 2개)"
        packet = c.project({"content": text, "answer": "SECRET", "solution": "PRIVATE"})
        self.assertEqual(packet, {"content": text})
        self.assertEqual(c.content_holds(text, original=False), [])
        self.assertIn("answer_or_solution_marker", c.content_holds(text + "\n정답: SECRET", original=False))
        self.assertIn("external_link", c.content_holds("문제 https://invalid.example", original=False))

    def test_formula_conservatism(self):
        for text in ["$x^m+n$", "$x over 2$", "$rmcm$", "$LEFT(x RIGHT)$", "$2timesa$"]:
            self.assertIn("native_math_requires_structure_review", c.content_holds(text, original=True))
        self.assertEqual(c.content_holds("$x^{2}+y_{1}$", original=True), [])
        self.assertIn("unbalanced_math", c.content_holds("$x^{2$", original=False))

    def test_exact_numeric_full_input_boundary(self):
        self.assertEqual(c.compare_scalar(r"\frac{1}{2}", "0.5"), "same_value")
        for a, b in [(r"\frac{1}{2}3", "4"), (r"\frac{12}{3}4", "6/17"),
                     ("(2", "2"), ("1/0", "1/0"), ("x^2", "x_2"),
                     ("2 cm", "2 m"), ("1,2", "2,1")]:
            self.assertEqual(c.compare_scalar(a, b), "needs_review")
        self.assertEqual(c.compare_scalar("-3", "3"), "different_value")

    def test_manifest_rejects_extra_symlink_tamper_and_inside_repo(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); repo = root / "repo"; repo.mkdir()
            folder = root / "packet"; folder.mkdir()
            (folder / "student.json").write_text('{"content":"Synthetic question"}\n')
            manifest = c.packet_manifest(folder, repo)
            self.assertEqual(c.verify_packet(folder, manifest, repo), [])
            (folder / "extra").write_text("secret")
            self.assertIn("file_allowlist", c.verify_packet(folder, manifest, repo))
            (folder / "extra").unlink()
            (folder / "student.json").write_text('{"content":"Changed"}')
            self.assertIn("file_bytes", c.verify_packet(folder, manifest, repo))
            (folder / "student.json").unlink()
            (folder / "student.json").symlink_to(root / "missing")
            with self.assertRaises(ValueError): c.packet_manifest(folder, repo)
            with self.assertRaises(ValueError): c.require_external(repo / "out", repo)
            alias = root / "alias"; alias.symlink_to(repo, target_is_directory=True)
            with self.assertRaises(ValueError): c.require_external(alias / "out", repo)

    def test_schema_and_hardlink_are_not_allowed(self):
        import os
        with tempfile.TemporaryDirectory() as d:
            root = Path(d); folder = root / "p"; folder.mkdir()
            f = folder / "student.json"; f.write_text('{"content":"q", "answer":"SECRET"}')
            with self.assertRaises(ValueError): c.packet_manifest(folder, root / "repo")
            f.write_text('{"content":"q"}');os.link(f, root / "alias")
            with self.assertRaises(ValueError): c.packet_manifest(folder, root / "repo")

    def codex(self, extra=()):
        return [
            {"type": "thread.started", "thread_id": "synthetic-codex"},
            *extra,
            {"type": "item.completed", "item": {"id": "a", "type": "agent_message", "text": '{"status":"solved","answer":"5","reasoning":"2+3"}'}},
            {"type": "turn.completed", "usage": {}},
        ]

    def audit(self, events, parsed=None, provider="codex", code=0):
        return c.audit_events(provider, "\n".join(json.dumps(e) for e in events),
                              '{"status":"solved","answer":"5","reasoning":"2+3"}',
                              parsed or {"status": "solved", "answer": "5", "reasoning": "2+3"}, code)

    def test_raw_parsed_conflict_and_actual_model_unknown(self):
        result = self.audit(self.codex())
        self.assertEqual(result["actualModels"], [])
        self.assertFalse(result["executionVerified"])
        self.assertEqual(result["eventErrors"], [])
        result = self.audit(self.codex(), {"status": "solved", "answer": "999", "reasoning": "2+3"})
        self.assertIn("raw_parsed_mismatch", result["eventErrors"])

    def test_tool_start_and_failed_turn_are_not_success(self):
        events = self.codex([
            {"type": "item.started", "item": {"id": "t", "type": "command_execution", "command": "cat secret"}},
            {"type": "turn.failed", "error": {"message": "synthetic failure"}},
        ])
        result = self.audit(events)
        self.assertIn("failed_turn", result["eventErrors"])
        self.assertIn("unfinished_tool", result["eventErrors"])
        self.assertIn("tool_disallowed_text_only", result["eventErrors"])
        self.assertEqual(result["toolEvents"][0]["item"]["command"], "cat secret")
        self.assertIn("missing_completion", self.audit(self.codex()[:-1])["eventErrors"])
        self.assertIn("process_exit", self.audit(self.codex(), code=1)["eventErrors"])

    def test_unknown_events_and_bad_json_fail_closed(self):
        self.assertIn("unknown_event", self.audit(self.codex([{"type": "new.unknown"}]))["eventErrors"])
        result = c.audit_events("codex", "not json", "{}", {}, 0)
        self.assertIn("invalid_event_json", result["eventErrors"])
        self.assertIn("missing_session", result["eventErrors"])

    def test_claude_message_model_and_tool_paths_retained(self):
        events = [
            {"type": "system", "subtype": "init", "session_id": "synthetic-claude", "model": "REQUESTED-ONLY"},
            {"type": "assistant", "session_id": "synthetic-claude", "message": {
                "model": "actual-synthetic", "content": [{"type": "tool_use", "id": "t", "name": "Read", "input": {"file_path": "/private/secret"}}]}},
            {"type": "result", "subtype": "success", "session_id": "synthetic-claude", "is_error": False,
             "result": '{"status":"solved","answer":"5","reasoning":"2+3"}'},
        ]
        result = self.audit(events, provider="claude")
        self.assertEqual(result["actualModels"], ["actual-synthetic"])
        self.assertIn("unfinished_tool", result["eventErrors"])
        self.assertEqual(result["toolEvents"][0]["input"]["file_path"], "/private/secret")
        result = self.audit([events[-1]], provider="claude")
        self.assertIn("missing_init", result["eventErrors"])
        self.assertEqual(result["actualModels"], [])

    def test_freeze_detects_bytes_change(self):
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "a";f.write_text("synthetic")
            records = [c.file_record(f)]
            self.assertEqual(c.verify_records(records), [])
            f.write_text("modified")
            self.assertEqual(len(c.verify_records(records)), 1)

    def test_seal_requires_actual_git_ancestry_and_bytes(self):
        import subprocess
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            def git(*args):
                return subprocess.check_output(["git", "-C", d, *args], stderr=subprocess.DEVNULL).decode().strip()
            git("init", "-q");git("config", "user.name", "Synthetic");git("config", "user.email", "synthetic@example.invalid")
            f = root / "receipt.json";f.write_text('{"synthetic":1}\n')
            git("add", "receipt.json");git("commit", "-qm", "freeze");freeze=git("rev-parse", "HEAD")
            f.write_text('{"synthetic":2}\n');git("commit", "-qam", "seal");seal=git("rev-parse", "HEAD")
            self.assertTrue(c.verify_git_seal(root, freeze, seal, "receipt.json", f.read_bytes()))
            self.assertFalse(c.verify_git_seal(root, freeze, seal, "receipt.json", b"wrong"))
            self.assertFalse(c.verify_git_seal(root, seal, seal, "receipt.json", f.read_bytes()))
            git("checkout", "--orphan", "unrelated");git("commit", "-qm", "orphan")
            self.assertFalse(c.verify_git_seal(root, freeze, seal, "receipt.json", f.read_bytes()))

    def test_reviewer_is_required_and_no_self_declaration_can_approve(self):
        self.assertIn("reviewer_missing", c.review_gate({"toolPolicyVerified": True})["holds"])
        result = c.review_gate({"reviewer": "synthetic", "toolPolicyVerified": True, "sawOriginal": False})
        self.assertIn("execution_evidence_unverified", result["holds"])
        self.assertFalse(result["approved"])

    def test_duplicate_json_keys_and_nonfinite_values(self):
        for text in ['{"answer":1,"answer":2}', '{"x":NaN}']:
            with self.assertRaises(ValueError): c.strict_json(text)

    def test_prompt_inserts_exact_student_bytes_without_metadata(self):
        student=c.json_bytes(c.project({"content":"Synthetic: (1) $2+3$ cm?","answer":"SECRET"}))
        rendered=c.prompt_bytes("Solve:\n{{STUDENT_JSON}}",student)
        self.assertTrue(rendered.endswith(student))
        self.assertNotIn(b"SECRET",rendered)
        with self.assertRaises(ValueError): c.prompt_bytes("missing",student)
        with self.assertRaises(ValueError): c.prompt_bytes("{{STUDENT_JSON}}",b'{"content":"q","answer":"a"}')

    def test_unreadable_is_a_distinct_valid_result_not_a_guessed_answer(self):
        raw = '{"status":"unreadable","answer":null,"reasoning":"synthetic missing label"}'
        events = self.codex();events[-2]["item"]["text"] = raw
        result = c.audit_events("codex", "\n".join(map(json.dumps, events)), raw, json.loads(raw), 0)
        self.assertEqual(result["eventErrors"], [])
        self.assertFalse(result["executionVerified"])

    def test_actual_external_bundle_bytes_are_reparsed(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d);folder=root / "input";folder.mkdir()
            (folder / "student.json").write_bytes(c.json_bytes({"content": "Synthetic: 2+3?"}))
            manifest=c.packet_manifest(folder, root / "repo")
            raw='{"status":"solved","answer":"5","reasoning":"2+3"}'
            events=[{"type":"system","subtype":"init","session_id":"s"},
                    {"type":"assistant","session_id":"s","message":{"model":"actual-synthetic","content":[{"type":"text","text":raw}]}},
                    {"type":"result","subtype":"success","is_error":False,"session_id":"s","result":raw}]
            launch={"attemptId":"try1","pid":100,"argv":["synthetic-only"],"cwd":str(folder),"startedAt":"T0",
                    "cliBinarySha256":"synthetic", "requestedModel":"requested-synthetic","requestedEffort":"test",
                    "inputManifestSha256":c.digest(c.json_bytes(manifest))}
            files={"events":"\n".join(map(json.dumps,events)),"raw":raw,"parsed":raw,"stderr":"",
                   "launch":json.dumps(launch),"exit":json.dumps({"attemptId":"try1","pid":100,"exitCode":0,"endedAt":"T1"}),
                   "prompt":"Synthetic prompt", "isolation":"Synthetic observation only"}
            artifacts={}
            for key,text in files.items():
                f=root / (key+'.txt');f.write_text(text);artifacts[key]=c.file_record(f)
            bundle={"provider":"claude","sessionId":"s","inputFolder":str(folder),"inputManifest":manifest,"artifacts":artifacts}
            result=c.audit_bundle(bundle,root / "repo")
            self.assertEqual(result["bundleErrors"],[])
            self.assertEqual(result["events"]["actualModels"],["actual-synthetic"])
            self.assertFalse(result["executionVerified"])
            f=root/'parsed.txt';f.write_text(raw.replace('"5"','"999"'))
            self.assertIn("artifact_bytes:parsed",c.audit_bundle(bundle,root/'repo')["bundleErrors"])
            artifacts["parsed"]=c.file_record(f)
            self.assertIn("raw_parsed_mismatch",c.audit_bundle(bundle,root/'repo')["bundleErrors"])
            del artifacts["events"]
            self.assertIn("missing_artifact:events",c.audit_bundle(bundle,root/'repo')["bundleErrors"])

    def test_synthetic_hwpx_anchor_and_missing_binary_never_auto_approve(self):
        import zipfile
        import prepare
        ns='xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core"'
        def para(number, image):
            return f'<hp:p><hp:run><hp:t>{number:02d} 다음 그림의 값을 구하시오.</hp:t><hp:pic><hp:sz width="20000" height="15000"/><hc:img binaryItemIDRef="{image}"/></hp:pic></hp:run></hp:p>'
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);f=root/'synthetic.hwp';assets=root/'assets';assets.mkdir()
            with zipfile.ZipFile(f,'w') as archive:
                archive.writestr('Contents/section0.xml',f'<hp:sec {ns}>'+para(1,'image1')+para(2,'missing')+'</hp:sec>')
                archive.writestr('BinData/image1.png',b'synthetic-image-bytes')
            evidence=prepare.inspect_source(f,assets)
            first=evidence['problems'][(0,1)][0]['figures'][0]
            second=evidence['problems'][(0,2)][0]['figures'][0]
            self.assertEqual(first['decodedSha256'],c.digest(b'synthetic-image-bytes'))
            self.assertEqual(len(first['anchors']),1)
            self.assertNotEqual(first['anchors'],second['anchors'])
            self.assertTrue(second['streamMissing'])
            self.assertFalse(first['presentationVerified'])
            self.assertEqual(first['imageDisclosure'],'withheld')


if __name__ == "__main__":
    unittest.main()
