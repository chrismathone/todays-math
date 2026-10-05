import copy
import tempfile
import unittest

import official_catalog_adapter as official
import verifier as v
from test_localized_adapter import LocalizedFixture


class CertifiedNeighborTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.f = LocalizedFixture(self.temp.name)
        f = self.f
        question = copy.deepcopy(f.question)
        question.update(id="known-next", sourceNumber=19, audioRange={"startMs": 25100, "endMs": 100000})
        f.source["questions"].append(question)
        native = copy.deepcopy(f.row["nativeEvidence"])
        native.update(startFrame=f.next["startFrame"], onsetFrame=f.next["onsetFrame"],
                      quietBeforeFrames=f.next["quietBeforeFrames"])
        self.origin = {"sourceRecordId": f.source["sourceRecordId"], "setId": f.source["setId"],
                       "questionId": question["id"], "sourceNumber": 19, "status": "admitted",
                       "sourceAudioSha256": f.source["sourceAudioSha256"], "playbackSha256": f.source["audio"]["sha256"],
                       "audioRange": question["audioRange"], "scopeQuestionNumbers": [2], "cueSpokenNumbers": [2],
                       "evidenceGrade": "reconstructed_numbered_probe", "nativeEvidence": native,
                       "probeEvidence": copy.deepcopy(f.row["nextProbeEvidence"])}
        self.certificate = {"completeReplay": True, "errors": [], "humanReviewed": False,
                            "writesDatabase": False, "writesStorage": False, "records": [self.origin]}
        self.path = f.folder / "original-admission.json"
        f.row.pop("nextProbeEvidence")
        self.sync()

    def sync(self):
        self.f.write(self.path, self.certificate)
        self.f.row["nextCertificateEvidence"] = {"certificate": v.reference(self.path), "questionId": "known-next",
                                                  "scopeQuestionNumbers": [2], "nativeOnsetFrame": 408000, "startMs": 25100}
        # Unit fixtures model the authority supplied only after v.run validates
        # the baseline's ancestry. The integration below obtains it for real.
        self.f.source_replay.trusted_boundaries = {"known-next": {"certificate": v.reference(self.path),
            "scopeQuestionNumbers": [2], "onsetFrame": 408000, "startMs": 25100}}

    def rejects(self, reason):
        with self.assertRaisesRegex(v.InvalidEvidence, reason):
            self.f.validate()

    def test_known_original_scope_is_independent_of_displayed_number(self):
        proof, _, grade, _ = self.f.validate()
        self.assertEqual(grade, "localized_generation_native")
        self.assertEqual(proof["nextScopeQuestionNumbers"], [2])
        self.assertEqual(proof["nextBoundaryKind"], "exact_preserved_original_scope_v1")
        self.assertIn(v.reference(self.path), proof["boundReferences"])

    def test_preserved_echo_is_not_an_original_admission(self):
        self.origin["status"] = "preserved"
        self.sync()
        self.rejects("next_certificate_not_exact_preserved_admission")

    def test_wrong_question_source_or_current_preserved_range_is_held(self):
        self.origin["sourceAudioSha256"] = "wrong-source"
        self.sync()
        self.rejects("next_certificate_not_exact_preserved_admission")

    def test_unproved_original_number_cannot_be_borrowed_from_displayed_number(self):
        self.origin["scopeQuestionNumbers"] = [19]
        self.sync()
        self.rejects("next_certificate_original_raw_scope_mismatch")

    def test_changed_native_pcm_is_held(self):
        self.origin["nativeEvidence"]["pcmSha256"] = "other-native"
        self.sync()
        self.rejects("next_certificate_actual_pcm_mismatch")

    def test_native_probe_raw_hash_and_request_are_replayed(self):
        self.f.next["clipPcmSha256"] = "wrong-native-clip"
        self.f.sync()
        self.f.row.pop("nextProbeEvidence")
        self.origin["probeEvidence"] = {**v.reference(self.f.probe_path),
                                        **{k: val for k, val in self.origin["probeEvidence"].items() if k not in ("path", "sha256")}}
        self.sync()
        self.rejects("localized_catalog_actual_probe_hash:clipPcmSha256")

    def test_certificate_mutation_without_hash_update_is_held(self):
        self.path.write_text("{}", encoding="utf-8")
        self.rejects("artifact_hash_mismatch")

    def test_claim_cannot_shift_preserved_start_or_onset(self):
        self.f.row["nextCertificateEvidence"]["startMs"] += 20
        self.rejects("next_certificate_not_validated_ancestor_boundary")

    def test_complete_certificate_lookalike_outside_validated_ancestry_is_held(self):
        forged = self.f.folder / "producer-lookalike.json"
        self.f.write(forged, self.certificate)
        self.f.row["nextCertificateEvidence"]["certificate"] = v.reference(forged)
        self.rejects("next_certificate_not_validated_ancestor_boundary")

    def test_complete_replay_obtains_genuine_boundary_authority_and_flat_refs(self):
        f = self.f
        old_source = copy.deepcopy(f.source)
        old_source["questions"][1]["audioRange"] = None
        old_snapshot = f.folder / "old-full-snapshot.json"
        old_doc = {"revision": 3, "groups": [{"id": f.source["groupId"], "audio": f.source["audio"],
                                             "questions": old_source["questions"]}]}
        f.write(old_snapshot, {"snapshots": [{"id": f.source["setId"], "revision": 3, "document": old_doc}]})
        old_inventory = f.folder / "old-full-inventory.json"
        f.write(old_inventory, {"root": str(f.folder), "liveSnapshotPath": str(old_snapshot),
                               "liveSnapshotSha256": v.sha(old_snapshot), "records": [old_source]})
        old_clock = f.folder / "old-full-clock.json"
        f.write(old_clock, {"completeSourceClockReplay": True, "inventorySha256": v.sha(old_inventory), "records": [f.clock]})
        identity = {k: f.row[k] for k in ("sourceRecordId", "setId", "revision", "documentSha256", "questionId",
                                         "sourceNumber", "sourceAudioSha256", "playbackSha256")}
        self.origin.update(revision=3, documentSha256=f.source["documentSha256"])
        self.certificate.update(inputs={"inventory": v.reference(old_inventory), "clock": v.reference(old_clock)},
                                records=[{**identity, "status": "held", "audioRange": None}, self.origin])
        self.sync()
        f.source.update(revision=4, documentSha256="current-document")
        f.clock.update(revision=4, documentSha256="current-document")
        f.row.update(revision=4, documentSha256="current-document")
        existing = {**identity, "revision": 4, "documentSha256": "current-document", "questionId": "known-next",
                    "sourceNumber": self.origin["sourceNumber"], "status": "existing_verified", "seekStartMs": 25100,
                    "asrSha256": f.source["asrSha256"], "asrPath": f.source["asrPath"]}
        snapshot = f.folder / "current-full-snapshot.json"
        current_doc = {"revision": 4, "groups": [{"id": f.source["groupId"], "audio": f.source["audio"],
                                                  "questions": f.source["questions"]}]}
        f.write(snapshot, {"snapshots": [{"id": f.source["setId"], "revision": 4, "document": current_doc}]})
        f.inventory.update(root=str(f.folder), liveSnapshotPath=str(snapshot), liveSnapshotSha256=v.sha(snapshot),
                           verifiedAncestor={"certificate": v.reference(self.path), "inventory": v.reference(old_inventory),
                                             "clock": v.reference(old_clock)})
        f.write(f.inventory_path, f.inventory)
        f.write(f.clock_path, {"completeSourceClockReplay": True, "inventorySha256": v.sha(f.inventory_path), "records": [f.clock]})
        f.frozen_path.unlink()
        v.freeze_inputs(f.inventory, f.frozen_path)
        marks = f.folder / "full-marks.json"
        f.write(marks, {"schemaVersion": 1, "evidenceContractVersion": 1, "provider": "grok",
                       "inventorySha256": v.sha(f.inventory_path), "records": [f.row, existing]})
        f.source_replay.trusted_boundaries = {}
        certificate = v.run(f.inventory_path, [marks], f.clock_path, f.frozen_path, f.folder / "certificate",
                            source_replay_factory=lambda *args: f.source_replay)
        self.assertTrue(certificate["completeReplay"], certificate["errors"])
        row = next(r for r in certificate["records"] if r["questionId"] == f.question["id"])
        self.assertEqual(row["status"], "admitted", row["reasons"])
        self.assertTrue(all(isinstance(ref, dict) for ref in row["proofKey"]["boundReferences"]))
        if f.source["reconstructed"]:
            self.assertTrue(v.reconstructed_admission_origin(row))
        else:
            self.assertEqual(row["evidenceGrade"], "numbered_instruction")
            self.assertEqual(row["proofKey"]["adapter"], official.ADAPTER)

    def test_complete_official_replay_uses_genuine_known_neighbor_and_flat_refs(self):
        self.f.source["reconstructed"] = False
        self.f.source["questions"][1]["sourceNumber"] = self.origin["sourceNumber"] = 2
        self.origin["evidenceGrade"] = "numbered_instruction"
        self.f.row["evidenceAdapter"] = official.ADAPTER
        self.test_complete_replay_obtains_genuine_boundary_authority_and_flat_refs()

    def test_historical_raw_must_be_in_complete_catalog(self):
        copied = self.f.folder / "uncatalogued-old-probe.json"
        self.f.write(copied, self.f.container)
        self.origin["probeEvidence"].update(v.reference(copied))
        self.sync()
        self.rejects("next_certificate_raw_missing_from_catalog")


class OfficialCatalogTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.f = LocalizedFixture(self.temp.name)
        self.f.source.update(reconstructed=False, assignedAgent="claude")
        self.f.row["evidenceAdapter"] = official.ADAPTER

    def validate(self):
        f = self.f
        return official.validate(f.row, f.source, f.question, f.clock, f.source_replay, v.index_segments(f.asr, 100))

    def rejects(self, reason):
        with self.assertRaisesRegex(v.InvalidEvidence, reason):
            self.validate()

    def test_existing_numbered_instruction_passes_with_additive_actual_catalog(self):
        proof, _, grade, _ = self.validate()
        self.assertEqual(grade, "numbered_instruction")
        self.assertEqual(proof["adapter"], official.ADAPTER)
        self.assertFalse(proof["providerTimingAuthority"])

    def test_wrong_native_neighbor_is_held(self):
        self.f.next["segments"][0]["text"] = "3번입니다. 다음을 듣고 고르시오."
        self.f.sync()
        self.rejects("official_catalog_wrong_neighbor")

    def test_wrong_own_instruction_still_requires_old_actual_first_dialogue_gate(self):
        self.f.raw["segments"][0]["text"] = "1번입니다. 표를 보고 고르시오."
        self.f.sync()
        self.rejects("ambiguous_cue_missing_official_alignment")

    def test_later_unique_quote_cannot_replace_old_first_dialogue_contract(self):
        self.f.raw["segments"][0]["text"] = "1번입니다. 표를 보고 고르시오."
        script = "1번 다음을 듣고 가장 적절한 것을 고르시오. W: Hello and welcome to our museum. M: You cannot take pictures in the museum."
        original_path = self.f.folder / "original.json"
        self.f.write(original_path, {"editableInput": {"groups": [{"transcript": {"text": script}}]}})
        self.f.prepared.update(originalPreparedPath=str(original_path), originalPreparedSha256=v.sha(original_path))
        self.f.write(self.f.prepared_path, self.f.prepared)
        self.f.row["scriptEvidence"] = {"method": "script_unique_own_sentence_inside_native_passage_v1",
                                        "sectionStartCharacter": 3, "sectionEndCharacter": len(script),
                                        "firstDialogueQuote": "You cannot take pictures in the museum."}
        self.f.sync()
        self.rejects("official_alignment_is_not_first_dialogue")

    def test_wrong_raw_source_hash_is_held(self):
        self.f.container["sourceAudioSha256"] = "other-source"
        self.f.sync()
        self.rejects("localized_catalog_wrong_source")

    def test_entire_optional_english_clip_must_fit_before_next_native_start(self):
        self.f.dialogue["startFrame"] = 320000
        self.f.sync()
        self.rejects("official_catalog_dialogue_clip_crosses_passage")

    def test_reconstructed_sources_cannot_enter_official_wrapper(self):
        self.f.source["reconstructed"] = True
        self.rejects("official_catalog_adapter_wrong_source_or_version")

    def terminal_fixture(self):
        f = self.f
        paper = f.folder / "original-questions.pdf"
        paper.write_bytes(b"immutable original complete question paper fixture")
        original = f.folder / "official-original.json"
        f.write(original, {"sourceRecordId": f.source["sourceRecordId"],
                           "sourceFiles": [{"kind": "questions", **v.reference(paper)}],
                           "editableInput": {"groups": [{"questions": [{"id": f.question["id"], "sourceNumber": 1}]}]}})
        f.question["metadata"].update(origin="official_original", sourceNumber=1, sourceQuestionSha256=v.sha(paper))
        f.prepared = {"sourceRecordId": f.source["sourceRecordId"], "originalPreparedPath": str(original),
                      "originalPreparedSha256": v.sha(original), "sourceQuestionPdfSha256": v.sha(paper),
                      "questions": [{"questionId": f.question["id"], "sourceNumber": 1}]}
        f.write(f.prepared_path, f.prepared)
        f.source["preparedSha256"] = v.sha(f.prepared_path)
        f.container["probes"] = [f.raw, f.dialogue]
        f.sync()
        f.row.pop("nextProbeEvidence")
        f.row["officialTerminalEvidence"] = {"method": "exact_official_original_population_end_v1",
                                            "prepared": v.reference(f.prepared_path), "originalPrepared": v.reference(original),
                                            "questionFile": v.reference(paper), "lastOriginalNumber": 1,
                                            "sourceFrameCount": f.actual["frameCount"]}

    def test_exact_last_original_population_can_use_actual_full_pcm_end(self):
        self.terminal_fixture()
        proof, _, grade, _ = self.validate()
        self.assertEqual(grade, "numbered_instruction")
        self.assertEqual(proof["nextBoundaryKind"], "exact_official_original_population_end_v1")
        self.assertEqual(proof["nextOnsetFrame"], self.f.actual["frameCount"])

    def test_observed_maximum_without_original_population_cannot_supply_source_end(self):
        self.f.row.pop("nextProbeEvidence")
        self.f.row["officialTerminalEvidence"] = {"method": "source_end_after_observed_max_number"}
        self.rejects("official_terminal_unknown_method")

    def test_incomplete_original_population_cannot_be_declared_last(self):
        self.terminal_fixture()
        ref = self.f.row["officialTerminalEvidence"]["originalPrepared"]
        original = v.checked_ref(ref)
        original["editableInput"]["groups"][0]["questions"].append({"sourceNumber": 2})
        self.f.write(ref["path"], original)
        self.f.prepared["originalPreparedSha256"] = v.sha(ref["path"])
        self.f.write(self.f.prepared_path, self.f.prepared)
        self.f.source["preparedSha256"] = v.sha(self.f.prepared_path)
        self.f.row["officialTerminalEvidence"].update(prepared=v.reference(self.f.prepared_path),
                                                     originalPrepared=v.reference(ref["path"]))
        self.rejects("official_terminal_incomplete_original_population")

    def test_changed_original_question_paper_is_held(self):
        self.terminal_fixture()
        path = self.f.row["officialTerminalEvidence"]["questionFile"]["path"]
        self.f.folder.joinpath("original-questions.pdf").write_bytes(b"different question paper")
        self.rejects("official_original_question_file_corruption")

    def test_official_terminal_cannot_shorten_actual_source_clock(self):
        self.terminal_fixture()
        self.f.row["officialTerminalEvidence"]["sourceFrameCount"] -= 320
        self.rejects("official_terminal_not_exact_last_original")


if __name__ == "__main__":
    unittest.main()
