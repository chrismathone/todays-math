"""Adversarial tests for a new explicit repeated-instruction identity proof."""
import copy
import re
import struct
import tempfile
import unittest
from pathlib import Path

import claude_adapter as a
import verifier as v
from test_adapters import NativeProofFixture
from test_verifier import segment


class NumberedSectionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.f = NativeProofFixture(self.temp.name)
        f = self.f
        self.instruction = "대화를 듣고, Island Medical Program에 관해 언급되지 않은 것을 고르시오."
        self.raw_instruction = "대화를 듣고 아일랜드 메디컬 프로그램에 관해 언급되지 않은 것을 고르시오."
        self.dialogue = "Mom, please park your car underground."
        self.text = "1번 " + self.instruction + " W: " + self.dialogue + "\n2번 " + self.instruction + " M: Hello, your haircut looks really great."
        f.question["prompt"] = self.instruction
        f.raw["segments"] = [{**segment(101, "1. " + self.raw_instruction, .4, 2),
                              "localStartSeconds": .4, "localEndSeconds": 2, "words": []}]
        self.number = {**copy.deepcopy(f.raw), "id": "number", "frameCount": 32000, "durationSeconds": 2,
                       "segments": [{**segment(201, "1번", .4, 1), "localStartSeconds": .4, "localEndSeconds": 1, "words": []}]}
        self.dialogue_probe = {**copy.deepcopy(f.raw), "id": "dialogue", "startFrame": 48000,
                               "onsetFrame": 54400, "quietBeforeFrames": 6400, "requestedLanguage": "en",
                               "segments": [{**segment(301, self.dialogue, .4, 2), "localStartSeconds": .4, "localEndSeconds": 2, "words": []}]}
        f.energy[150:170] = [0] * 20
        energy_path = Path(f.row["nativeEvidence"]["energyPath"])
        energy_path.write_bytes(b"".join(struct.pack("<d", x) for x in f.energy))
        digest = v.sha(energy_path)
        f.actual["energySha256"] = f.row["nativeEvidence"]["energySha256"] = digest
        cache_path = Path(f.row["nativeEvidence"]["cachePath"])
        cache = v.read(cache_path)
        cache["energy"]["sha256"] = digest
        f.write(cache_path, cache)
        f.row["nativeEvidence"]["cacheSha256"] = v.sha(cache_path)
        original = Path(self.temp.name) / "original.json"
        f.write(original, {"editableInput": {"groups": [{"transcript": {"text": self.text}}]}})
        f.write(f.prepared_path, {"originalPreparedPath": str(original), "originalPreparedSha256": v.sha(original)})
        start, end = self.text.index(" "), self.text.index("2번")
        f.row.update(officialIdentityEvidence={"method": "numbered_section_own_dialogue_v1"}, cueForm="bare",
                     scriptEvidence={"sectionStartCharacter": start, "sectionEndCharacter": end,
                                     "instructionQuote": self.instruction, "instructionStartCharacter": self.text.index(self.instruction),
                                     "instructionProbeSegmentIds": [101], "firstDialogueQuote": self.dialogue,
                                     "firstDialogueStartCharacter": self.text.index(self.dialogue), "dialogueProbeSegmentIds": [301]})
        self.refresh()

    def tearDown(self):
        self.temp.cleanup()

    def refresh(self):
        f = self.f
        f.container["probes"] = [f.raw, self.number, self.dialogue_probe]
        f.write(f.request_path, {"sources": [{"sourceRecordId": "source-A", "sourceAudioSha256": f.source["sourceAudioSha256"],
                                            "probes": f.container["probes"]}]})
        f.container["requestSha256"] = v.sha(f.request_path)
        f.refresh()
        def evidence(probe):
            return {**v.reference(f.probe_path), "probeId": probe["id"], "segmentIds": [s["id"] for s in probe["segments"]],
                    "text": " ".join(s["text"] for s in probe["segments"]), "inputMonoFloat32Sha256": probe["inputMonoFloat32Sha256"]}
        f.row["numberClipEvidence"] = evidence(self.number)
        f.row["dialogueProbeEvidence"] = {**evidence(self.dialogue_probe), "offsetFromStartFrames": self.dialogue_probe["startFrame"] - f.raw["startFrame"]}

    def rejects(self, reason):
        with self.assertRaisesRegex(v.InvalidEvidence, reason):
            self.f.validate()

    def test_repeated_mixed_script_instruction_requires_literal_clip_and_unique_own_dialogue(self):
        key, raw, grade, identity = self.f.validate()
        self.assertEqual(grade, "numbered_section_own_dialogue")
        self.assertEqual(key["dialogueBinding"]["officialIdentityEvidence"]["spokenNumbers"], [1])
        self.assertEqual(key["dialogueBinding"]["officialIdentityEvidence"]["numberClipEvidence"]["text"], "1번")
        self.assertEqual(self.f.row["seekStartMs"], 100)

    def test_default_route_still_rejects_repeated_instruction(self):
        del self.f.row["officialIdentityEvidence"]
        self.rejects("official_instruction_not_unique")

    def test_wrong_literal_number_cannot_be_repaired_by_dialogue(self):
        self.number["segments"][0]["text"] = "2번"
        self.refresh()
        self.rejects("not_literal_own_number_only")

    def test_bare_number_clip_does_not_confirm_bare_long_probe(self):
        self.number["segments"][0]["text"] = "1."
        self.refresh()
        self.rejects("not_literal_own_number_only")

    def test_number_from_another_onset_and_unbounded_number_input_are_rejected(self):
        self.number["startFrame"] += 320
        self.refresh()
        self.rejects("number_clip_wrong_native_start")
        self.temp.cleanup()
        self.setUp()
        self.number["frameCount"] = 64000
        self.number["durationSeconds"] = 4
        self.refresh()
        self.rejects("number_clip_unbounded_or_overflow")

    def test_uncertain_long_instruction_and_uncertain_literal_clip_stay_held(self):
        self.f.raw["segments"][0]["uncertain"] = True
        self.refresh()
        self.rejects("uncertain_raw_evidence")
        self.temp.cleanup()
        self.setUp()
        self.number["segments"][0]["avgLogProbability"] = -1.1
        self.refresh()
        self.rejects("uncertain_raw_evidence")

    def test_missing_clip_and_corrupt_actual_number_decode_cannot_admit(self):
        del self.f.row["numberClipEvidence"]
        self.rejects("missing_bounded_native_probe")
        self.refresh()
        self.number["inputMonoFloat32Sha256"] = "forged"
        self.refresh()
        self.rejects("number_clip_decode_hash")

    def test_current_instruction_and_source_header_offsets_are_exact(self):
        self.f.question["prompt"] = "대화를 듣고 여자가 방문할 장소를 고르시오."
        self.rejects("instruction_not_current_question")
        self.temp.cleanup()
        self.setUp()
        self.f.row["scriptEvidence"]["instructionStartCharacter"] = self.text.rindex(self.instruction)
        self.rejects("instruction_offset_mismatch|not_at_own_header")

    def test_unrelated_instruction_is_not_licensed_by_matching_topic_dialogue(self):
        self.f.raw["segments"][0]["text"] = "1. 대화를 듣고 여자의 직업을 고르시오."
        self.refresh()
        self.rejects("own_instruction_absent")

    def test_borrowed_first_dialogue_is_rejected(self):
        self.f.row["scriptEvidence"]["firstDialogueQuote"] = "Hello, your haircut looks really great."
        self.rejects("not_first_dialogue")

    def test_unknown_identity_method_and_missing_separate_dialogue_stay_held(self):
        self.f.row["officialIdentityEvidence"]["method"] = "skip_uniqueness"
        self.rejects("unknown_official_identity_method")
        self.f.row["officialIdentityEvidence"]["method"] = "numbered_section_own_dialogue_v1"
        del self.f.row["dialogueProbeEvidence"]
        self.rejects("requires_own_dialogue_probe")


class SettledNeighborTests(unittest.TestCase):
    def test_number_completion_strips_only_literal_suffix_and_preserves_next_instruction(self):
        for raw, expected in (("1번입니다. 다음을 듣고", "다음을 듣고"),
                              ("19번에서 20번, 다음을 듣고", "다음을 듣고"),
                              ("2번. 지금부터 들으시오", "지금부터 들으시오")):
            self.assertEqual(a.leading_cue(raw)[1], expected)

    def test_missing_neighbor_hold_propagates_through_candidate_dependencies(self):
        source = {"sourceRecordId": "S", "audio": {"durationMs": 10000},
                  "questions": [{"sourceNumber": n} for n in (1, 2, 3)]}
        rows = [{"sourceRecordId": "S", "questionId": "q" + str(n), "sourceNumber": n,
                 "status": "admitted", "reasons": [], "reconstructed": False, "scopeQuestionNumbers": [n],
                 "audioRange": {"startMs": n * 1000, "endMs": 10000},
                 "proofKey": {"dialogueBinding": {"method": "measured_original_passage_offset_v1", "sampleRate": 1000,
                                                   "dialogueOnsetFrame": n * 1000 + 100, "selectedEstimatedEndFrame": n * 1000 + 200}}}
                for n in (1, 2)]
        rows.append({"sourceRecordId": "S", "questionId": "q3", "sourceNumber": 3, "status": "held", "reasons": ["missing proof"]})
        v.settle_candidate_order(rows, [source])
        self.assertEqual([r["status"] for r in rows], ["held", "held", "held"])
        self.assertIn("dialogue_offset_next_original_passage_boundary_missing", rows[0]["reasons"])
        self.assertNotIn("audioRange", rows[0])


if __name__ == "__main__":
    unittest.main()
