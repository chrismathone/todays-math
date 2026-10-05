import copy
import tempfile
import unittest
from pathlib import Path

import mapping_audit as m
import verifier as v
from test_verifier import segment


class FrozenMappingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.source = {"sourceRecordId": "original-A", "reconstructed": True,
                       "sourceAudioSha256": "a" * 64, "asrSha256": "b" * 64,
                       "sourceAudioPath": str(Path(self.temp.name) / "original.mp3"),
                       "alignmentPath": str(Path(self.temp.name) / "alignment.json")}
        self.question = {"id": "generated-A", "sourceNumber": 17}
        self.alignment = {"sourceRecordId": "original-A", "sourceAudioSha256": "a" * 64,
                          "asrSha256": "b" * 64,
                          "candidates": [{"questionId": "generated-A", "method": "verified_generation_evidence_segments", "sourceSegmentIds": [30]}]}
        v.immutable_write(self.source["alignmentPath"], self.alignment)
        self.index = v.index_segments({"segments": [segment(10, "2번 다음을 듣고", 10, 12),
                                                   segment(30, "Welcome to the museum.", 14, 16),
                                                   segment(70, "3번 다음을 듣고", 25, 28)]}, 100)

    def mapping(self):
        return m.passage_mapping(self.source, self.question, self.alignment, self.index)

    def test_generated_ordinal_contributes_no_original_identity(self):
        proof = self.mapping()
        self.assertEqual(proof["scopeQuestionNumbers"], [2])
        self.assertEqual(proof["cueSegmentIds"], [10])
        self.assertEqual(proof["anchorArrayPositions"], [1])

    def test_wrong_source_or_asr_is_rejected(self):
        for key in ("sourceRecordId", "sourceAudioSha256", "asrSha256"):
            with self.subTest(key=key):
                bad = {**self.alignment, key: "wrong"}
                with self.assertRaisesRegex(v.InvalidEvidence, "mapping_wrong_source"):
                    m.passage_mapping(self.source, self.question, bad, self.index)

    def test_unknown_duplicate_and_cross_passage_anchors_are_rejected(self):
        for ids, reason in (([99], "unknown"), ([30, 30], "duplicate"), ([30, 70], "anchors_outside")):
            self.alignment["candidates"][0]["sourceSegmentIds"] = ids
            with self.subTest(ids=ids), self.assertRaisesRegex(v.InvalidEvidence, reason):
                self.mapping()

    def test_missing_or_duplicate_current_question_grounding_is_rejected(self):
        for candidates in ([], self.alignment["candidates"] * 2):
            with self.assertRaisesRegex(v.InvalidEvidence, "missing_current_question_source_grounding"):
                m.passage_mapping(self.source, self.question, {**self.alignment, "candidates": candidates}, self.index)

    def test_uncertain_cue_is_not_skipped_to_previous_passage(self):
        self.index[10]["uncertain"] = True
        with self.assertRaisesRegex(v.InvalidEvidence, "original_raw_cue_uncertain"):
            self.mapping()

    def test_unresolved_bare_cue_blocks_prior_number_mapping(self):
        self.index[10]["text"] = "2. 다음을 듣고"
        with self.assertRaisesRegex(v.InvalidEvidence, "original_cue_number_unresolved"):
            self.mapping()

    def test_true_joint_scope_requires_literal_shared_instruction(self):
        self.index[10]["text"] = "2번과 3번 다음을 듣고 물음에 답하시오."
        proof = self.mapping()
        self.assertEqual(proof["scopeQuestionNumbers"], [2, 3])
        self.assertEqual(proof["kind"], "shared_passage")
        self.index[10]["text"] = "2번과 3번 다음을 듣고 적절한 것을 고르시오."
        self.assertEqual(self.mapping()["scopeQuestionNumbers"], [2])
        self.assertEqual(self.mapping()["kind"], "shared_instruction_head")
        self.index[70]["text"] = "4번 다음을 듣고"
        with self.assertRaisesRegex(v.InvalidEvidence, "missing_separate_member"):
            self.mapping()

    def test_many_current_questions_can_share_original_single_scope_same_proof(self):
        rows = [{"sourceRecordId": "A", "questionId": str(i), "status": "admitted", "reconstructed": True,
                 "scopeQuestionNumbers": [2], "audioRange": {"startMs": 9600}, "proofKey": {"source": "A", "onsetFrame": 10000}}
                for i in range(3)]
        self.assertEqual(dict(v.check_order(rows)), {})
        rows[1]["proofKey"]["onsetFrame"] += 1
        self.assertTrue(all("shared_passage_evidence_mismatch" in reasons for reasons in v.check_order(rows).values()))
        rows[1]["proofKey"]["onsetFrame"] -= 1
        rows[1]["reconstructed"] = False
        self.assertTrue(all("duplicate_single_question_passage" in reasons for reasons in v.check_order(rows).values()))


class NativeStructuralSupportTests(FrozenMappingTests):
    def native(self):
        clock = {"sampleRate": 1000, "channels": 1, "frameCount": 100000, "decodedInterleavedInt16Sha256": "c" * 64}
        probe = {"id": 1, "asrSegmentId": 10, "sampleRate": 1000, "channels": 1,
                 "startFrame": 9600, "frameCount": 14000, "onsetFrame": 10000,
                 "quietBeforeFrames": 1000, "durationSeconds": 14, "overflow": False,
                 "inputSampleRate": 16000, "inputSampleCount": 224000,
                 "clipPcmSha256": "d" * 64, "inputMonoFloat32Sha256": "e" * 64,
                 "segments": [{**segment(1, "2번 다음을 듣고", 0, 2), "localStartSeconds": 0, "localEndSeconds": 2, "words": []}]}
        request = {"sourceRecordId": self.source["sourceRecordId"], "sourceAudioSha256": self.source["sourceAudioSha256"], "probes": [copy.deepcopy(probe)]}
        container = {**self.source, "nativePcm": {"sampleRate": 1000, "channels": 1, "frameCount": 100000, "sha256": "c" * 64}}
        return container, probe, request, clock

    def support(self, data):
        container, probe, request, clock = data
        return m.native_support(container, probe, request, self.source, clock, self.index)

    def test_native_support_is_only_diagnostic(self):
        result = self.support(self.native())
        self.assertTrue(result["independentSourceDecodeRequired"])
        self.assertEqual(result["cueSegmentId"], 10)

    def test_wrong_requested_original_cue_is_rejected(self):
        data = self.native(); data[1]["asrSegmentId"] = 70
        with self.assertRaisesRegex(v.InvalidEvidence, "native_probe_request_cue_identity_mismatch"):
            self.support(data)

    def test_local_sample_rate_or_channels_cannot_change_native_clock(self):
        for key, value in (("sampleRate", 16000), ("channels", True)):
            data = self.native(); data[1][key] = value
            with self.subTest(key=key), self.assertRaisesRegex(v.InvalidEvidence, "native_probe_local_clock_mismatch"):
                self.support(data)

    def test_uncertain_native_or_overflow_are_rejected(self):
        data = self.native(); data[1]["segments"][0]["uncertain"] = True
        with self.assertRaisesRegex(v.InvalidEvidence, "native_cue_uncertain"):
            self.support(data)
        data = self.native(); data[1]["segments"][0]["words"] = [{"text": "cue", "localStartSeconds": 0, "localEndSeconds": 15, "probability": .9}]
        with self.assertRaisesRegex(v.InvalidEvidence, "word_overflow"):
            self.support(data)

    def test_duplicate_original_ordinal_requires_unique_native_containment(self):
        self.index[70]["text"] = "2번 다음을 듣고"
        self.assertEqual(self.support(self.native())["cueSegmentId"], 10)
        self.index[70]["estimatedStartSeconds"] = 9
        self.index[70]["estimatedEndSeconds"] = 13
        with self.assertRaisesRegex(v.InvalidEvidence, "duplicate_original_cue_not_uniquely"):
            self.support(self.native())


class CompilerProvenanceTests(unittest.TestCase):
    def test_lane_and_actual_compiler_are_preserved_separately(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "upstream.json"
            v.immutable_write(path, {"immutable": True})
            queue = {"provider": "grok", "compilerProvider": "antigravity", "compilerModel": "gemini-3.1-pro-high",
                     "upstreamProducer": "grok", "upstreamArtifacts": [v.reference(path)]}
            result = v.queue_provenance(queue, {"path": "ledger", "sha256": "hash"})
            self.assertEqual(result["laneProvider"], "grok")
            self.assertEqual(result["compilerProvider"], "antigravity")
            self.assertTrue(result["compilerDeclared"])
            path.write_text("changed", encoding="utf-8")
            with self.assertRaisesRegex(v.InvalidEvidence, "upstream_artifact_corruption"):
                v.queue_provenance(queue, {})

    def test_partial_provenance_cannot_claim_actual_assembler(self):
        with self.assertRaisesRegex(v.InvalidEvidence, "incomplete_compiler_provenance"):
            v.queue_provenance({"provider": "grok", "compilerProvider": "antigravity"}, {})

    def test_undeclared_compiler_is_not_invented(self):
        result = v.queue_provenance({"provider": "grok"}, {})
        self.assertFalse(result["compilerDeclared"])
        self.assertNotIn("compilerModel", result)


if __name__ == "__main__":
    unittest.main()
