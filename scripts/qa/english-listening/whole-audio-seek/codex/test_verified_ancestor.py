"""Existing reconstructed starts retain actual original ordinals, not display indices."""
import copy
import tempfile
import unittest
from pathlib import Path

import verifier as v


class AncestorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        folder = Path(self.temp.name)
        question = {"id": "q", "sourceNumber": 1, "audioRange": None, "prompt": "Generated display first", "metadata": {}, "evidence": []}
        audio = {"assetId": "asset", "sha256": "playback", "durationMs": 5000}
        source = {"sourceRecordId": "S", "setId": "set", "revision": 3, "documentSha256": "old-document",
                  "reconstructed": True, "questions": [question], "audio": audio, "sourceAudioSha256": "original"}
        old_document = {"revision": 3, "title": "Original", "groups": [{"audio": audio, "questions": [question]}]}
        snapshot_path = folder / "old-snapshot.json"
        v.immutable_write(snapshot_path, {"snapshots": [{"id": "set", "revision": 3, "document": old_document}]})
        old_inventory = {"liveSnapshotPath": str(snapshot_path), "liveSnapshotSha256": v.sha(snapshot_path), "records": [source]}
        inventory_path = folder / "old-inventory.json"
        v.immutable_write(inventory_path, old_inventory)
        old_clock = {"completeSourceClockReplay": True, "inventorySha256": v.sha(inventory_path),
                     "records": [{"sourceRecordId": "S", "revision": 3, "documentSha256": "old-document", "frameCount": 80000}]}
        clock_path = folder / "old-clock.json"
        v.immutable_write(clock_path, old_clock)
        previous = {"completeReplay": True, "errors": [], "humanReviewed": False, "writesDatabase": False, "writesStorage": False,
                    "inputs": {"inventory": v.reference(inventory_path), "clock": v.reference(clock_path)},
                    "records": [{"sourceRecordId": "S", "setId": "set", "questionId": "q", "sourceNumber": 1,
                                 "revision": 3, "documentSha256": "old-document", "sourceAudioSha256": "original", "playbackSha256": "playback",
                                 "status": "admitted", "audioRange": {"startMs": 1000, "endMs": 5000},
                                 "evidenceGrade": "reconstructed_numbered_probe", "scopeQuestionNumbers": [2], "nativeEvidence": {"onsetFrame": 22400}}]}
        certificate_path = folder / "previous-certificate.json"
        v.immutable_write(certificate_path, previous)
        self.inventory = copy.deepcopy(old_inventory)
        self.inventory["verifiedAncestor"] = {"certificate": v.reference(certificate_path), "inventory": v.reference(inventory_path), "clock": v.reference(clock_path)}
        self.inventory["records"][0].update(revision=4, documentSha256="current-document")
        self.inventory["records"][0]["questions"][0]["audioRange"] = {"startMs": 1000, "endMs": 5000}
        document = copy.deepcopy(old_document)
        document["revision"] = 4
        document["groups"][0]["questions"][0]["audioRange"] = {"startMs": 1000, "endMs": 5000}
        self.snapshots = [{"id": "set", "revision": 4, "document": document}]
        self.clock = copy.deepcopy(old_clock)
        self.clock["records"][0].update(revision=4, documentSha256="current-document")

    def tearDown(self):
        self.temp.cleanup()

    def test_exact_previous_adoption_inherits_actual_original_scope(self):
        scopes, ref = v.verified_ancestor_rows(self.inventory, self.clock, self.snapshots)
        self.assertEqual(scopes[("S", "q")]["scopeQuestionNumbers"], [2])
        self.assertEqual(scopes[("S", "q")]["onsetFrame"], 22400)

    def test_changed_original_question_and_changed_existing_range_are_rejected(self):
        for corrupt in (lambda doc: doc.update(title="Edited"),
                        lambda doc: doc["groups"][0]["questions"][0]["audioRange"].update(startMs=1100)):
            snapshots = copy.deepcopy(self.snapshots)
            corrupt(snapshots[0]["document"])
            with self.assertRaisesRegex(v.InvalidEvidence, "not_exact_ancestor_adoption"):
                v.verified_ancestor_rows(self.inventory, self.clock, snapshots)

    def test_physical_clock_changes_and_inventory_source_changes_are_rejected(self):
        changed = copy.deepcopy(self.clock)
        changed["records"][0]["frameCount"] += 1
        with self.assertRaisesRegex(v.InvalidEvidence, "physical_clock_changed"):
            v.verified_ancestor_rows(self.inventory, changed, self.snapshots)
        self.inventory["records"][0]["audio"]["sha256"] = "wrong"
        with self.assertRaisesRegex(v.InvalidEvidence, "source_content_or_media_changed"):
            v.verified_ancestor_rows(self.inventory, self.clock, self.snapshots)

    def test_missing_or_corrupt_ancestor_hash_does_not_establish_existing_scope(self):
        self.inventory["verifiedAncestor"]["certificate"]["sha256"] = "forged"
        with self.assertRaisesRegex(v.InvalidEvidence, "artifact_hash_mismatch"):
            v.verified_ancestor_rows(self.inventory, self.clock, self.snapshots)


class PreservedOriginalOrderTests(unittest.TestCase):
    def rows(self, *, scope, start, onset=46400):
        return [{"sourceRecordId": "S", "questionId": "old", "sourceNumber": 7, "status": "preserved",
                 "audioRange": {"startMs": 1000, "endMs": 5000}, "originalScopeEvidence": {"scopeQuestionNumbers": [2], "onsetFrame": 22400}},
                {"sourceRecordId": "S", "questionId": "new", "sourceNumber": 1, "status": "admitted", "reconstructed": True,
                 "audioRange": {"startMs": start, "endMs": 5000}, "scopeQuestionNumbers": scope,
                 "nativeEvidence": {"onsetFrame": onset}, "proofKey": {"source": "actual"}}]

    def test_generated_display_order_cannot_override_existing_original_cue(self):
        self.assertFalse(v.check_order(self.rows(scope=[3], start=2000)))
        self.assertIn("new", v.check_order(self.rows(scope=[1], start=2000)))

    def test_same_original_peer_requires_same_start_and_native_onset(self):
        self.assertFalse(v.check_order(self.rows(scope=[2], start=1000, onset=22400)))
        self.assertIn("new", v.check_order(self.rows(scope=[2], start=1000)))
        self.assertIn("new", v.check_order(self.rows(scope=[2], start=1100, onset=22400)))


if __name__ == "__main__":
    unittest.main()
