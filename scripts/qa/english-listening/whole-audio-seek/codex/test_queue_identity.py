import copy
import tempfile
import unittest

import recover_queue_identity as adapter
import verifier as v
from test_verifier import Fixture


class IdentityJoinTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.fixture = Fixture(self.temp.name, reconstructed=True)
        self.inventory = {"records": [self.fixture.source]}
        self.queue = {"schemaVersion": 1, "evidenceContractVersion": 1, "provider": "grok", "inventorySha256": "inventory-hash",
                      "compilerProvider": "antigravity", "compilerModel": "gemini-3.1-pro-high", "upstreamProducer": "grok", "upstreamArtifacts": [],
                      "records": [copy.deepcopy(self.fixture.row)]}
        for field in adapter.FIELDS:
            self.queue["records"][0][field] = ""

    def recover(self):
        return adapter.recover(self.queue, self.inventory, {"path": "inventory", "sha256": "inventory-hash"},
                               {"path": "proposal", "sha256": "proposal-hash"}, {"path": "script", "sha256": "script-hash"}, "dispatch-A")

    def test_only_blank_source_identity_metadata_changes(self):
        original = copy.deepcopy(self.queue)
        result, changes = self.recover()
        v.validate_identity(result["records"][0], self.fixture.source, self.fixture.question)
        self.assertEqual(self.queue, original)
        before, after = self.queue["records"][0], result["records"][0]
        self.assertEqual({k: val for k, val in before.items() if k not in adapter.FIELDS},
                         {k: val for k, val in after.items() if k not in adapter.FIELDS})
        self.assertEqual(changes[0]["filledFields"], list(adapter.FIELDS))
        self.assertEqual(result["compilerProvider"], "antigravity")
        self.assertEqual(result["metadataAdapters"][0]["executedBy"], "codex")
        self.assertFalse(result["productionApplicationAuthorized"])

    def test_populated_wrong_hash_cannot_be_repaired(self):
        self.queue["records"][0]["sourceAudioSha256"] = "wrong"
        with self.assertRaisesRegex(v.InvalidEvidence, "identity_mismatch:sourceAudioSha256"):
            self.recover()

    def test_stale_revision_and_wrong_question_or_source_reject(self):
        for field, value, reason in (("revision", 99, "identity_mismatch:revision"), ("questionId", "other", "extra_or_duplicate"),
                                     ("sourceRecordId", "other", "extra_or_duplicate"), ("sourceNumber", 99, "identity_mismatch:sourceNumber")):
            before = copy.deepcopy(self.queue)
            self.queue["records"][0][field] = value
            with self.subTest(field=field), self.assertRaisesRegex(v.InvalidEvidence, reason):
                self.recover()
            self.queue = before

    def test_omitted_extra_and_duplicate_questions_reject(self):
        row = copy.deepcopy(self.queue["records"][0])
        for records, reason in (([], "omitted_question"), ([row, row], "extra_or_duplicate"),
                                 ([row, {**row, "questionId": "extra"}], "extra_or_duplicate")):
            self.queue["records"] = records
            with self.subTest(reason=reason), self.assertRaisesRegex(v.InvalidEvidence, reason):
                self.recover()

    def test_existing_verification_and_boolean_contract_are_never_changed(self):
        self.fixture.question["audioRange"] = {"startMs": 9600, "endMs": 100000}
        with self.assertRaisesRegex(v.InvalidEvidence, "must_not_change_existing"):
            self.recover()
        self.fixture.question["audioRange"] = None
        self.queue["schemaVersion"] = True
        with self.assertRaisesRegex(v.InvalidEvidence, "wrong_contract"):
            self.recover()


if __name__ == "__main__":
    unittest.main()
