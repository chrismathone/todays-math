import copy
import tempfile
import unittest

import localized_adapter as l
import localized_boundary_adapter as boundary
import verifier as v
from test_localized_adapter import LocalizedFixture
from test_verifier import segment


class NextEndBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.f = LocalizedFixture(self.temp.name)
        self.f.next["segments"][0].update(localStartSeconds=1.2, localEndSeconds=2)
        self.sync()

    def sync(self):
        f = self.f
        f.sync()
        f.row.update(evidenceAdapter=boundary.ADAPTER, nextBoundaryProbeEvidence=f.row.pop("nextProbeEvidence"),
                     nextBoundaryNativeEvidence={k: f.next[k] for k in ("startFrame", "onsetFrame", "quietBeforeFrames")})

    def validate(self):
        f = self.f
        return boundary.validate(f.row, f.source, f.question, f.clock, f.source_replay, v.index_segments(f.asr, 100))

    def rejects(self, reason):
        with self.assertRaisesRegex(v.InvalidEvidence, reason):
            self.validate()

    def test_named_end_tier_accepts_complete_next_instruction_after_precursor(self):
        proof, _, grade, _ = self.validate()
        self.assertEqual(grade, l.END_BOUNDARY_GRADE)
        self.assertEqual(proof["nextBoundaryKind"], "next_number_first_speech_boundary_v3")
        self.assertFalse(proof["nextEndIdentity"]["onsetNumberCorrespondence"])
        self.assertFalse(proof["nextEndIdentity"]["maySupplySeekStart"])
        self.assertEqual(proof["nextEndIdentity"]["identityMethod"], "literal_complete_korean_instruction")

    def test_old_route_still_requires_next_onset_correspondence(self):
        self.f.row["evidenceAdapter"] = l.ADAPTER
        self.f.row["nextProbeEvidence"] = self.f.row.pop("nextBoundaryProbeEvidence")
        with self.assertRaisesRegex(v.InvalidEvidence, "localized_onset_number_correspondence"):
            self.f.validate()

    def test_extra_end_fields_cannot_be_silently_used_by_old_version(self):
        self.f.row["evidenceAdapter"] = l.ADAPTER
        with self.assertRaisesRegex(v.InvalidEvidence, "localized_boundary_requires_explicit_v3"):
            self.f.validate()

    def test_end_waiver_cannot_be_applied_to_own_seek_start(self):
        self.f.raw["segments"][0].update(localStartSeconds=1.2, localEndSeconds=2)
        self.sync()
        self.rejects("localized_onset_number_correspondence")
        with self.assertRaisesRegex(v.InvalidEvidence, "localized_boundary_not_next_end_only"):
            l.numbered_probe(self.f.row, self.f.source, self.f.source_replay, "probeEvidence", end_boundary_only=True)

    def test_truncated_own_first_syllable_still_held(self):
        self.f.row["nativeEvidence"]["startFrame"] = self.f.raw["onsetFrame"]
        self.f.row["seekStartMs"] = 500
        self.rejects("localized_auxiliary_onset_bounds")

    def test_end_first_speech_after_two_seconds_is_held(self):
        self.f.next["segments"][0].update(localStartSeconds=2.01, localEndSeconds=3)
        self.sync()
        self.rejects("localized_probe_missing_first_syllable")

    def test_number_alone_partial_instruction_and_declarative_ending_held(self):
        for text in ("2번입니다.", "2번입니다. 다음을 듣고", "2번입니다. 다음을 듣고 고를 수 있습니다."):
            with self.subTest(text=text):
                self.f.next["segments"][0]["text"] = text
                self.sync()
                self.rejects("localized_instruction_missing_or_incomplete")

    def test_bare_answer_or_number_with_generic_command_is_not_original_instruction(self):
        for text, reason in (("2. Sorry, dogs are not allowed.", "localized_missing_original_number"),
                             ("2번입니다. 고르세요.", "localized_boundary_not_genuine_korean_instruction")):
            with self.subTest(text=text):
                self.f.next["segments"][0]["text"] = text
                self.sync()
                self.rejects(reason)

    def test_complete_next_context_must_be_contiguous_before_dialogue(self):
        self.f.next["segments"][0]["text"] = "2번입니다. 다음을 듣고"
        self.f.next["segments"].extend([
            {**segment(202, "Yes.", 2.1, 2.5), "localStartSeconds": 2.1, "localEndSeconds": 2.5, "words": []},
            {**segment(203, "가장 알맞은 것을 고르세요.", 2.6, 3), "localStartSeconds": 2.6, "localEndSeconds": 3, "words": []}])
        self.sync()
        self.f.row["nextBoundaryProbeEvidence"].update(segmentIds=[201], text=self.f.next["segments"][0]["text"])
        self.rejects("localized_instruction_crosses_dialogue")

    def test_next_wrong_neighbor_or_language_still_held(self):
        self.f.next["segments"][0]["text"] = "3번입니다. 다음을 듣고 고르시오."
        self.sync()
        self.rejects("localized_wrong_neighbor")
        self.f.next["requestedLanguage"] = "en"
        self.sync()
        self.rejects("localized_wrong_language")

    def test_actual_next_native_quiet_and_onset_are_not_waived(self):
        self.f.row["nextBoundaryNativeEvidence"]["quietBeforeFrames"] += 320
        self.rejects("localized_auxiliary_onset_bounds")
        self.f.row["nextBoundaryNativeEvidence"]["quietBeforeFrames"] -= 320
        self.f.energy[1260] = 1e8
        self.rejects("native_quiet_lead_mismatch|native_start_not_measured_quiet_lead")

    def test_selected_end_probe_cannot_escape_complete_catalog(self):
        self.f.row["nextBoundaryProbeEvidence"]["sha256"] = "uncatalogued"
        self.rejects("localized_selected_probe_missing_from_catalog")

    def test_all_actual_source_clip_request_hashes_remain_mandatory(self):
        self.f.next["clipPcmSha256"] = "wrong-physical-source"
        self.sync()
        self.rejects("localized_catalog_actual_probe_hash:clipPcmSha256")

    def test_competing_end_number_or_distant_repeat_still_held(self):
        other = copy.deepcopy(self.f.next)
        other["id"] = "contradictory-end"
        other["segments"][0]["text"] = "3번입니다. 다음을 듣고 고르시오."
        self.f.container["probes"].append(other)
        self.sync()
        self.rejects("localized_contradictory_same_onset_number")

    def test_entire_english_clip_must_end_before_physical_precursor(self):
        self.f.dialogue["startFrame"] = self.f.next["startFrame"] - 80000
        self.sync()
        self.rejects("localized_dialogue_wrong_passage")

    def test_generation_wrong_quote_is_held(self):
        self.f.row["localizedMappingEvidence"]["quotes"][0]["text"] = "This is a wrong neighbor quote."
        self.rejects("localized_missing_or_changed_supporting_quote")

    def test_english_word_zero_length_or_zero_confidence_remains_held(self):
        word = self.f.dialogue["segments"][0]["words"][0]
        word["probability"] = 0
        self.sync()
        self.rejects("localized_word_timing_or_confidence_artifact")
        word["probability"] = .99
        word["localEndSeconds"] = word["localStartSeconds"]
        self.sync()
        self.rejects("localized_word_outside_own_segment")

    def test_raw_source_identity_mismatch_is_held(self):
        self.f.container["sourceAudioSha256"] = "wrong-original-source"
        self.sync()
        self.rejects("localized_catalog_wrong_source")

    def test_raw_complete_next_context_is_derived_without_changing_selected_quote(self):
        self.f.next["segments"][0]["text"] = "2번입니다."
        self.f.next["segments"].append({**segment(202, "다음을 듣고 가장 알맞은 것을 고르세요.", 2.1, 3),
                                      "localStartSeconds": 2.1, "localEndSeconds": 3, "words": []})
        self.sync()
        self.f.row["nextBoundaryProbeEvidence"].update(segmentIds=[201], text="2번입니다.")
        proof = self.validate()[0]
        self.assertEqual([s["id"] for s in proof["nextRawSegments"]], [201, 202])
        self.assertEqual(self.f.row["nextBoundaryProbeEvidence"]["segmentIds"], [201])

    def test_explicit_shared_member_end_requires_actual_complete_original_shared_head(self):
        self.f.raw["segments"][0]["text"] = "1번과 2번입니다. 다음을 듣고 고르시오."
        self.f.next["segments"][0]["text"] = "2번입니다."
        self.f.row.update(kind="shared_instruction_head", cueSpokenNumbers=[1, 2])
        self.sync()
        proof = self.validate()[0]
        self.assertEqual(proof["nextEndIdentity"]["identityMethod"], "proved_original_shared_instruction_member")
        self.assertEqual(proof["nextEndIdentity"]["sharedCoverage"], [1, 2])
        self.f.raw["segments"][0]["text"] = "1번과 2번입니다. 다음을 듣고 두 물음에 답하시오."
        self.sync()
        self.rejects("localized_shared_member_confusion")

    def test_unproved_member_exception_cannot_be_declared_by_producer_flag(self):
        self.f.next["segments"][0]["text"] = "2번입니다."
        self.f.row["nativeRecovery"] = {"sharedHeadCovers": [1, 2], "verifierPreconditions": {"nextBoundaryIsProvable": True}}
        self.sync()
        self.rejects("localized_instruction_missing_or_incomplete")

    def test_multiple_end_routes_are_held(self):
        self.f.row["nextProbeEvidence"] = copy.deepcopy(self.f.row["nextBoundaryProbeEvidence"])
        self.rejects("localized_missing_or_multiple_next_boundaries")

    def test_named_ancestry_binds_end_identity_raw_scope_and_all_hashes(self):
        proof = self.validate()[0]
        row = {**self.f.row, "status": "admitted", "evidenceGrade": l.END_BOUNDARY_GRADE, "proofKey": proof}
        self.assertTrue(v.reconstructed_admission_origin(row))
        for field in ("nextBoundaryProbeEvidence", "nextBoundaryNativeEvidence"):
            bad = copy.deepcopy(row)
            bad.pop(field)
            self.assertFalse(v.reconstructed_admission_origin(bad))
        bad = copy.deepcopy(row)
        bad["proofKey"]["nextEndIdentity"]["maySupplySeekStart"] = True
        self.assertFalse(v.reconstructed_admission_origin(bad))
        self.f.request_path.write_text("{}", encoding="utf-8")
        with self.assertRaisesRegex(v.InvalidEvidence, "ancestor_localized_nested_evidence_corruption"):
            v.reconstructed_admission_origin(row)

    def test_complete_population_replay_retains_explicit_new_route(self):
        f = self.f
        snapshot = f.folder / "snapshot.json"
        f.write(snapshot, {"snapshots": [{"id": f.source["setId"], "revision": f.source["revision"],
            "document": {"groups": [{"id": f.source["groupId"], "audio": f.source["audio"], "questions": f.source["questions"]}]}}]})
        f.inventory.update(root=str(f.folder), liveSnapshotPath=str(snapshot), liveSnapshotSha256=v.sha(snapshot))
        f.write(f.inventory_path, f.inventory)
        f.write(f.clock_path, {"inventorySha256": v.sha(f.inventory_path), "records": [f.clock]})
        f.frozen_path.unlink()
        v.freeze_inputs(f.inventory, f.frozen_path)
        marks = f.folder / "complete.json"
        f.write(marks, {"schemaVersion": 1, "evidenceContractVersion": 1, "provider": "grok",
                       "inventorySha256": v.sha(f.inventory_path), "records": [f.row]})
        certificate = v.run(f.inventory_path, [marks], f.clock_path, f.frozen_path, f.folder / "result",
                            source_replay_factory=lambda *args: f.source_replay)
        self.assertTrue(certificate["completeReplay"], certificate["errors"])
        row = certificate["records"][0]
        self.assertEqual(row["status"], "admitted", row["reasons"])
        self.assertEqual(row["nextBoundaryProbeEvidence"], f.row["nextBoundaryProbeEvidence"])
        self.assertEqual(row["evidenceGrade"], l.END_BOUNDARY_GRADE)
        self.assertTrue(v.reconstructed_admission_origin(row))


if __name__ == "__main__":
    unittest.main()
