import copy
import struct
import tempfile
import unittest

import localized_adapter as l
import verifier as v
from test_adapters import NativeProofFixture
from test_verifier import segment


class LocalizedFixture(NativeProofFixture):
    def __init__(self, folder):
        super().__init__(folder, reconstructed=True)
        raw_folder = self.folder / "raw-probes"
        raw_folder.mkdir()
        self.probe_path = raw_folder / "probe.json"
        self.raw["requestedLanguage"] = "ko"
        self.next = copy.deepcopy(self.raw)
        self.next.update(id="next", startFrame=401600, onsetFrame=408000, quietBeforeFrames=8000)
        self.next["segments"][0].update(id=201, text="2번입니다. 다음을 듣고 고르시오.")
        self.energy[1250:1275] = [0] * 25
        self.energy_path = self.folder / "energy.f64"
        self.energy_path.write_bytes(b"".join(struct.pack("<d", e) for e in self.energy))
        self.actual["energySha256"] = v.sha(self.energy_path)
        cache = v.read(self.row["nativeEvidence"]["cachePath"])
        cache["energy"]["sha256"] = self.actual["energySha256"]
        self.write(self.row["nativeEvidence"]["cachePath"], cache)
        self.row["nativeEvidence"].update(energySha256=self.actual["energySha256"],
                                        cacheSha256=v.sha(self.row["nativeEvidence"]["cachePath"]))
        self.dialogue = copy.deepcopy(self.raw)
        text = self.asr["segments"][1]["text"]
        words = text.split()
        self.dialogue.update(id="english", purpose="localized_generation", requestedLanguage="en")
        self.dialogue["segments"] = [{**segment(301, text, 2.5, 4), "localStartSeconds": 2.5, "localEndSeconds": 4,
                                      "words": [{"text": w, "localStartSeconds": 2.5 + i * .1,
                                                 "localEndSeconds": 2.6 + i * .1, "probability": .99}
                                                for i, w in enumerate(words)]}]
        self.prepared = {"verification": {"grounding": [{"generatedOrdinal": 1, "sourceSegmentIds": [2],
                                                        "included": True, "evidenceQuotes": [text]}]}}
        self.write(self.prepared_path, self.prepared)
        self.source["preparedSha256"] = v.sha(self.prepared_path)
        self.row.update(evidenceAdapter=l.ADAPTER, cueSegmentIds=[],
                        localizedMappingEvidence={"method": "exact_generation_anchor_native_v2", "questionId": self.question["id"],
                                                  "alignment": v.reference(self.alignment_path), "prepared": v.reference(self.prepared_path),
                                                  "generatedOrdinal": 1, "sourceSegmentIds": [2],
                                                  "quotes": [{"text": text, "sourceSegmentId": 2, "startCharacter": 0,
                                                              "endCharacter": len(text), "probeSegmentIds": [301]}]})
        self.container["probes"] = [self.raw, self.next, self.dialogue]
        self.sync()

    def sync(self):
        self.write(self.request_path, {"sources": [{"sourceRecordId": self.source["sourceRecordId"],
                                                    "sourceAudioSha256": self.source["sourceAudioSha256"],
                                                    "probes": self.container["probes"]}]})
        self.container["requestSha256"] = v.sha(self.request_path)
        self.refresh()
        catalog_path = self.folder / "catalog.json"
        self.write(catalog_path, {"rawArtifacts": [v.reference(self.probe_path)],
                                  "roots": [{"path": str(self.probe_path.parent), "pattern": "*.json"}]})
        self.row["probeCatalog"] = v.reference(catalog_path)
        for field, probe in (("nextProbeEvidence", self.next), ("dialogueProbeEvidence", self.dialogue)):
            self.row[field] = {**v.reference(self.probe_path), "probeId": probe["id"],
                               "segmentIds": [s["id"] for s in probe["segments"]],
                               "text": " ".join(s["text"] for s in probe["segments"]),
                               "inputMonoFloat32Sha256": probe["inputMonoFloat32Sha256"]}

    def validate(self):
        return l.validate(self.row, self.source, self.question, self.clock, self.source_replay,
                          v.index_segments(self.asr, 100))


class LocalizedAdmissionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.f = LocalizedFixture(self.temp.name)

    def rejects(self, reason):
        with self.assertRaisesRegex(v.InvalidEvidence, reason):
            self.f.validate()

    def test_localized_route_does_not_need_full_asr_number_timing(self):
        self.f.asr["segments"][0]["text"] = "Missing original heading in whole ASR"
        self.f.asr["segments"][2]["text"] = "No reliable neighbor in whole ASR"
        proof, _, grade, _ = self.f.validate()
        self.assertEqual(grade, "localized_generation_native")
        self.assertFalse(proof["providerTimingAuthority"])
        self.assertEqual(proof["localizedMapping"]["sourceSegmentIds"], [2])

    def test_generated_displayed_number_is_not_original_identity(self):
        self.f.question["sourceNumber"] = self.f.row["sourceNumber"] = 19
        self.assertEqual(self.f.validate()[2], "localized_generation_native")

    def test_wrong_neighbor_is_held(self):
        self.f.next["segments"][0]["text"] = "3번입니다. 다음을 듣고 고르시오."
        self.f.sync()
        self.rejects("localized_wrong_neighbor")

    def test_sibling_recognition_contradiction_is_not_hidden(self):
        sibling = copy.deepcopy(self.f.raw)
        sibling["id"] = "conflicting-sibling"
        sibling["segments"][0]["text"] = "3번입니다. 다음을 듣고 고르시오."
        self.f.container["probes"].append(sibling)
        self.f.sync()
        self.rejects("localized_contradictory_same_onset_number")

    def test_same_number_at_distant_native_occurrence_is_held(self):
        self.f.next["segments"][0]["text"] = self.f.raw["segments"][0]["text"]
        self.f.sync()
        self.rejects("localized_number_at_two_distant_onsets")

    def test_shared_member_cannot_replace_shared_heading(self):
        self.f.row["kind"] = "shared_instruction_member"
        self.rejects("missing_bounded_native_probe")

    def test_first_shared_member_starts_at_original_pair_heading(self):
        self.f.raw["segments"][0]["text"] = "1번과 2번입니다. 다음을 듣고 고르시오."
        self.f.row.update(kind="shared_instruction_head", cueSpokenNumbers=[1, 2])
        self.f.sync()
        self.assertEqual(self.f.validate()[2], "localized_generation_native")
        self.f.row["scopeQuestionNumbers"] = [2]
        self.rejects("localized_invalid_original_scope")

    def test_true_shared_passage_cannot_be_split_into_members(self):
        self.f.raw["segments"][0]["text"] = "1번과 2번입니다. 다음을 듣고 두 물음에 답하시오."
        self.f.row.update(kind="shared_instruction_head", cueSpokenNumbers=[1, 2])
        self.f.sync()
        self.rejects("localized_shared_member_confusion")

    def test_truncated_first_syllable_or_quiet_lead_is_held(self):
        self.f.row["nativeEvidence"]["startFrame"] = 8000
        self.f.row["seekStartMs"] = 500
        self.rejects("native_start_or_onset_overflow|localized_auxiliary_onset_bounds")

    def test_wrong_raw_source_hash_is_held(self):
        self.f.container["sourceAudioSha256"] = "bad"
        self.f.sync()
        self.rejects("localized_catalog_wrong_source")

    def test_wrong_nested_request_hash_is_held(self):
        self.f.request_path.write_text("{}", encoding="utf-8")
        self.rejects("hash_mismatch")

    def test_wrong_actual_clip_pcm_is_held(self):
        self.f.dialogue["clipPcmSha256"] = "bad"
        self.f.sync()
        self.rejects("localized_catalog_actual_probe_hash:clipPcmSha256")

    def test_wrong_actual_recognition_input_is_held(self):
        self.f.dialogue["inputMonoFloat32Sha256"] = "bad"
        self.f.sync()
        self.rejects("localized_catalog_actual_probe_hash:inputMonoFloat32Sha256")

    def test_zero_word_timestamp_with_high_confidence_is_held(self):
        self.f.dialogue["segments"][0]["words"][0].update(localStartSeconds=0, localEndSeconds=0, probability=1)
        self.f.sync()
        self.rejects("localized_word_timing_or_confidence_artifact|localized_word_outside_own_segment")

    def test_word_probability_cannot_conceal_uncertain_segment(self):
        self.f.dialogue["segments"][0]["uncertain"] = True
        self.f.sync()
        self.rejects("uncertain_raw_evidence")

    def test_recomputed_uncertainty_cannot_be_cleared_by_flag(self):
        self.f.dialogue["segments"][0]["avgLogProbability"] = -2
        self.f.sync()
        self.rejects("uncertain_raw_evidence")

    def test_wrong_frozen_quote_is_held(self):
        self.f.row["localizedMappingEvidence"]["quotes"][0]["text"] = "Wrong quote from another question."
        self.rejects("localized_missing_or_changed_supporting_quote")

    def test_missing_short_supporting_quote_is_held(self):
        self.f.prepared["verification"]["grounding"][0]["evidenceQuotes"].append("Yes.")
        self.f.write(self.f.prepared_path, self.f.prepared)
        self.f.source["preparedSha256"] = v.sha(self.f.prepared_path)
        self.f.row["localizedMappingEvidence"]["prepared"] = v.reference(self.f.prepared_path)
        self.rejects("localized_missing_or_changed_supporting_quote")

    def test_repeat_occurrence_in_other_original_scope_is_held(self):
        self.f.asr["segments"].append(segment(4, self.f.asr["segments"][1]["text"], 60, 62))
        self.rejects("localized_repeat_occurrence_ambiguous")

    def test_wrong_quote_language_is_held(self):
        self.f.dialogue["requestedLanguage"] = "ko"
        self.f.sync()
        self.rejects("localized_wrong_language")

    def test_entire_probe_crossing_next_heading_is_held_even_when_quote_is_inside(self):
        self.f.dialogue.update(frameCount=480000, durationSeconds=30)
        self.f.sync()
        self.rejects("localized_dialogue_wrong_passage")

    def test_unreferenced_raw_artifact_cannot_be_omitted_from_catalog(self):
        self.f.write(self.f.probe_path.parent / "omitted.json", self.f.container)
        self.rejects("localized_incomplete_probe_catalog")

    def test_localized_english_clip_needs_no_invented_native_speech_onset(self):
        self.f.dialogue.pop("onsetFrame")
        self.f.dialogue.pop("quietBeforeFrames")
        self.f.sync()
        self.assertEqual(self.f.validate()[2], "localized_generation_native")

    def test_literal_range_first_member_next_is_19_not_endpoint_20(self):
        self.f.raw["segments"][0]["text"] = "18번부터 20번입니다. 다음을 듣고 고르시오."
        self.f.next["segments"][0]["text"] = "19번입니다."
        self.f.row.update(kind="shared_instruction_head", cueNumber=18, cueSpokenNumbers=[18, 20], scopeQuestionNumbers=[18])
        self.f.sync()
        self.assertEqual(self.f.validate()[2], "localized_generation_native")
        self.f.next["segments"][0]["text"] = "20번입니다."
        self.f.sync()
        self.rejects("localized_wrong_neighbor")

    def test_ordinal_adjectives_and_spoken_answer_options_are_not_headings(self):
        self.assertIsNone(l.literal_cue("5번째, 다음 대화.")[0])
        option = copy.deepcopy(self.f.raw)
        option.update(id="answer-option", startFrame=50000, onsetFrame=56400)
        option["segments"][0]["text"] = "4. Sorry, but dogs are not allowed here."
        self.f.container["probes"].append(option)
        self.f.sync()
        self.assertEqual(self.f.validate()[2], "localized_generation_native")

    def test_bare_unresolved_instruction_inside_passage_is_barrier(self):
        unknown = copy.deepcopy(self.f.raw)
        unknown.update(id="unknown-heading", startFrame=50000, onsetFrame=56400)
        unknown["segments"][0]["text"] = "4. 다음을 듣고 적절한 것을 고르시오."
        self.f.container["probes"].append(unknown)
        self.f.sync()
        self.rejects("localized_unresolved_internal_number_reading")

    def test_additional_original_segment_must_be_heard_whole(self):
        extra_text = "The entrance is near the station."
        extra = segment(5, extra_text, 5, 6)
        self.f.asr["segments"].insert(2, extra)
        self.f.alignment["candidates"][0]["sourceSegmentIds"] = [2, 5]
        self.f.write(self.f.alignment_path, self.f.alignment)
        self.f.row["mappingEvidence"]["alignment"] = v.reference(self.f.alignment_path)
        self.f.row["anchorSegmentIds"] = [2, 5]
        self.f.prepared["verification"]["grounding"][0]["sourceSegmentIds"] = [2, 5]
        self.f.write(self.f.prepared_path, self.f.prepared)
        self.f.source["preparedSha256"] = v.sha(self.f.prepared_path)
        self.f.row["localizedMappingEvidence"].update(sourceSegmentIds=[2, 5], alignment=v.reference(self.f.alignment_path),
                                                     prepared=v.reference(self.f.prepared_path))
        self.rejects("localized_incomplete_generation_anchor_coverage")
        words = extra_text.split()
        self.f.dialogue["segments"].append({**segment(302, extra_text, 5, 6), "localStartSeconds": 5, "localEndSeconds": 6,
                                           "words": [{"text": w, "localStartSeconds": 5 + i * .1,
                                                      "localEndSeconds": 5.1 + i * .1, "probability": .99}
                                                     for i, w in enumerate(words)]})
        self.f.sync()
        self.f.row["localizedMappingEvidence"]["anchorSegments"] = [{"sourceSegmentId": 5, "text": extra_text, "probeSegmentIds": [302]}]
        self.assertEqual(self.f.validate()[2], "localized_generation_native")

    def test_terminal_closing_cannot_end_arbitrary_earlier_question(self):
        self.f.next["segments"][0]["text"] = "수고하셨습니다."
        self.f.sync()
        self.f.row["terminalProbeEvidence"] = self.f.row.pop("nextProbeEvidence")
        self.rejects("localized_terminal_original_population_unproved")

    def test_twentieth_original_question_can_use_literal_measured_closing(self):
        self.f.source["source"] = {"provider": "EBS 중학"}
        self.f.raw["segments"][0]["text"] = "20번입니다. 다음을 듣고 고르시오."
        self.f.next["segments"][0]["text"] = "수고하셨습니다."
        self.f.row.update(cueNumber=20, cueSpokenNumbers=[20], scopeQuestionNumbers=[20])
        self.f.sync()
        self.f.row["terminalProbeEvidence"] = self.f.row.pop("nextProbeEvidence")
        proof = self.f.validate()[0]
        self.assertEqual(proof["nextBoundaryKind"], "literal_original_closing_v1")
        self.assertEqual(proof["nextSpokenNumbers"], [])

    def test_original_generation_anchor_cannot_be_removed(self):
        self.f.row["anchorSegmentIds"] = []
        self.rejects("localized_changed_generation_anchors")

    def test_frozen_raw_uncertainty_stays_visible_under_explicit_new_native_route(self):
        self.f.asr["segments"][1]["uncertain"] = True
        proof = self.f.validate()[0]
        self.assertTrue(proof["localizedMapping"]["rawGenerationSegments"][0]["uncertain"])

    def origin(self):
        proof = self.f.validate()[0]
        return {**self.f.row, "status": "admitted", "evidenceGrade": "localized_generation_native", "proofKey": proof}

    def test_additive_ancestry_requires_actual_named_proof_origin(self):
        row = self.origin()
        self.assertTrue(v.reconstructed_admission_origin(row))
        for field in ("evidenceAdapter", "localizedMappingEvidence", "nextProbeEvidence", "proofKey"):
            altered = copy.deepcopy(row)
            altered.pop(field)
            self.assertFalse(v.reconstructed_admission_origin(altered))

    def test_additive_ancestry_rejects_changed_scope_onset_or_generation_identity(self):
        row = self.origin()
        for altered in ({**row, "nativeEvidence": {**row["nativeEvidence"], "onsetFrame": 8001}},
                        {**row, "scopeQuestionNumbers": [3]},
                        {**row, "questionId": "neighbor"}):
            self.assertFalse(v.reconstructed_admission_origin(altered))

    def test_additive_ancestry_replays_nested_immutable_hashes(self):
        row = self.origin()
        self.f.request_path.write_text("{}", encoding="utf-8")
        with self.assertRaisesRegex(v.InvalidEvidence, "ancestor_localized_nested_evidence_corruption"):
            v.reconstructed_admission_origin(row)

    def test_complete_certificate_retains_actual_additive_ancestry_shape(self):
        f = self.f
        snapshot_path = f.folder / "fresh-snapshot.json"
        f.write(snapshot_path, {"snapshots": [{"id": f.source["setId"], "revision": f.source["revision"],
                                               "document": {"groups": [{"id": f.source["groupId"], "audio": f.source["audio"],
                                                                         "questions": f.source["questions"]}]}}]})
        f.inventory.update(root=str(f.folder), liveSnapshotPath=str(snapshot_path), liveSnapshotSha256=v.sha(snapshot_path))
        f.write(f.inventory_path, f.inventory)
        f.write(f.clock_path, {"inventorySha256": v.sha(f.inventory_path), "records": [f.clock]})
        f.frozen_path.unlink()
        v.freeze_inputs(f.inventory, f.frozen_path)
        marks = f.folder / "complete-marks.json"
        f.write(marks, {"schemaVersion": 1, "evidenceContractVersion": 1, "provider": "grok",
                        "inventorySha256": v.sha(f.inventory_path), "records": [f.row]})
        certificate = v.run(f.inventory_path, [marks], f.clock_path, f.frozen_path, f.folder / "certificate",
                            source_replay_factory=lambda *args: f.source_replay)
        self.assertTrue(certificate["completeReplay"])
        row = certificate["records"][0]
        self.assertEqual(row["status"], "admitted", row["reasons"])
        self.assertEqual(row["kind"], "single")
        self.assertTrue(v.reconstructed_admission_origin(row))

    def test_same_native_scope_can_have_separate_current_question_grounding(self):
        first = self.origin()
        first.update(reconstructed=True, audioRange={"startMs": 100, "endMs": 100000})
        second = copy.deepcopy(first)
        second["questionId"] = "another-generated-question"
        second["proofKey"]["localizedMapping"]["questionId"] = second["questionId"]
        self.assertFalse(v.check_order([first, second]))
        second["proofKey"]["nextProbe"]["sha256"] = "different-next-head"
        self.assertIn("question-A", v.check_order([first, second]))


if __name__ == "__main__":
    unittest.main()
