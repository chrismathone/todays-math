"""The standalone diagnostic executes the same named adapter as full replay."""
import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import claude_adapter as a
import verifier as v
from test_localized_adapter import LocalizedFixture


class ReplayQuestionTests(unittest.TestCase):
    def test_native_generation_diagnostic_actually_calls_adapter_and_writes_proof(self):
        with tempfile.TemporaryDirectory() as folder:
            f = LocalizedFixture(folder)
            snapshot = f.folder / "full-snapshot.json"
            f.write(snapshot, {"snapshots": [{"id": f.source["setId"], "revision": f.source["revision"],
                "document": {"groups": [{"id": f.source["groupId"], "audio": f.source["audio"], "questions": f.source["questions"]}]}}]})
            f.inventory.update(root=str(f.folder), liveSnapshotPath=str(snapshot), liveSnapshotSha256=v.sha(snapshot))
            f.write(f.inventory_path, f.inventory)
            f.write(f.clock_path, {"inventorySha256": v.sha(f.inventory_path), "records": [f.clock]})
            f.frozen_path.unlink()
            v.freeze_inputs(f.inventory, f.frozen_path)
            marks, output = f.folder / "marks.json", f.folder / "diagnostic.json"
            f.write(marks, {"schemaVersion": 1, "evidenceContractVersion": 1, "provider": "grok",
                "inventorySha256": v.sha(f.inventory_path), "records": [f.row]})
            script = Path(__file__).with_name("replay-question.py")
            spec = importlib.util.spec_from_file_location("replay_question_test_target", script)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            argv = [str(script)]
            for key, value in (("inventory", f.inventory_path), ("clock", f.clock_path), ("frozen", f.frozen_path),
                               ("marks", marks), ("source-record-id", f.source["sourceRecordId"]),
                               ("question-id", f.question["id"]), ("output", output)):
                argv.extend(("--" + key, str(value)))
            with patch("sys.argv", argv), patch.object(a, "SourceReplay", return_value=f.source_replay):
                module.main()
            result = v.read(output)
            self.assertEqual(result["startProofStatus"], "passed", result["reasons"])
            self.assertEqual(result["proofKey"]["adapter"], "native-localized-generation-v2")
            self.assertEqual(result["proofKey"]["localizedMapping"]["sourceSegmentIds"], [2])
            self.assertTrue(result["diagnosticOnly"])
            self.assertTrue(result["admissionRequiresCompleteQueueOrderAndPreservation"])
            self.assertFalse(result["writesDatabase"])


if __name__ == "__main__":
    unittest.main()
