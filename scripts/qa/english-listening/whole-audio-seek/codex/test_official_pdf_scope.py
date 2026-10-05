"""The image-PDF and member-order tier has its own strict, additive contract."""
import base64
import copy
import hashlib
import struct
import tempfile
import unittest

import official_catalog_adapter as old
import official_pdf_scope_adapter as pdf
import verifier as v
from test_localized_adapter import LocalizedFixture
from test_verifier import segment


class OfficialPdfFixture(LocalizedFixture):
    def __init__(self, folder):
        super().__init__(folder)
        self.source.update(reconstructed=False, assignedAgent="claude")
        self.instruction = "다음을 듣고 가장 적절한 것을 고르시오."
        self.opening = "You cannot take pictures in the museum."
        self.script = "1번 " + self.instruction + " W: " + self.opening + "\n2번 " + self.instruction + " M: Welcome to this special cooking class."
        self.raw.update(requestedLanguage="ko")
        self.raw["segments"][0]["text"] = "1. " + self.instruction
        self.number = copy.deepcopy(self.raw)
        self.number.update(id="literal-number", frameCount=32000, durationSeconds=2, inputSampleCount=32000)
        self.number["segments"] = [{**segment(401, "1번", .4, 1), "localStartSeconds": .4, "localEndSeconds": 1, "words": []}]
        self.dialogue.update(purpose="first_dialogue", startFrame=48000, onsetFrame=54400, quietBeforeFrames=6400)
        self.dialogue["segments"][0].update(estimatedStartSeconds=.4, estimatedEndSeconds=2,
            localStartSeconds=.4, localEndSeconds=2)
        for i, word in enumerate(self.dialogue["segments"][0]["words"]):
            word.update(localStartSeconds=.4 + i * .1, localEndSeconds=.5 + i * .1)
        self.energy[150:170] = [0] * 20
        self.energy_path.write_bytes(b"".join(struct.pack("<d", e) for e in self.energy))
        self.actual["energySha256"] = v.sha(self.energy_path)
        cache = v.read(self.row["nativeEvidence"]["cachePath"])
        cache["energy"]["sha256"] = self.actual["energySha256"]
        self.write(self.row["nativeEvidence"]["cachePath"], cache)
        self.row["nativeEvidence"].update(energySha256=self.actual["energySha256"],
            cacheSha256=v.sha(self.row["nativeEvidence"]["cachePath"]))
        self.paper = self.folder / "original-question-paper.pdf"
        self.paper.write_bytes(b"immutable original question PDF fixture")
        self.original_path = self.folder / "official-original.json"
        self.snapshot_path = self.folder / "current-snapshot.json"
        # A real PNG's bytes are retained identically by the original editable
        # document, the native prepared artifact, and the live snapshot.
        png = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jCWQAAAAASUVORK5CYII=")
        image = {"dataUrl": "data:image/png;base64," + base64.b64encode(png).decode(), "width": 1, "height": 1}
        self.question.update(prompt="원본 문제지 1번 문항", choices=[{"id": "choice-1", "text": "①"}],
            answerChoiceId="choice-1", explanation="", image=copy.deepcopy(image))
        self.question["metadata"].update(origin="official_original", sourceNumber=1, sourceQuestionSha256=v.sha(self.paper))
        self.original_question = copy.deepcopy(self.question)
        self.question["image"]["role"] = "question"
        self.native_question = {"questionId": self.question["id"], "sourceNumber": 1, "prompt": self.question["prompt"],
            "choices": copy.deepcopy(self.question["choices"]), "answerChoiceId": self.question["answerChoiceId"],
            "image": copy.deepcopy(self.question["image"]), "conversion": {"method": "original_image_preserved",
                "nativePrompt": False, "nativeChoices": False, "sourcePage": 1, "bounds": [0, 0, 1, 1],
                "visualSha256": hashlib.sha256(png).hexdigest()}}
        self.row.update(evidenceAdapter=pdf.ADAPTER, cueForm="bare",
            officialIdentityEvidence={"method": "numbered_section_own_dialogue_v1"},
            scriptEvidence={"sectionStartCharacter": self.script.index(" "), "sectionEndCharacter": self.script.index("2번"),
                "instructionQuote": self.instruction, "instructionStartCharacter": self.script.index(self.instruction),
                "instructionProbeSegmentIds": [101], "firstDialogueQuote": self.opening,
                "firstDialogueStartCharacter": self.script.index(self.opening), "dialogueProbeSegmentIds": [301]})
        self.container["probes"] = [self.raw, self.number, self.next, self.dialogue]
        self.sync_identity()
        self.sync()
        self.source_replay.replay = lambda probe: {k: probe[k] for k in ("clipPcmSha256", "inputMonoFloat32Sha256", "inputSampleCount")}

    def sync_identity(self):
        original = {"sourceRecordId": self.source["sourceRecordId"], "sourceFiles": [{"kind": "questions", **v.reference(self.paper)}],
            "editableInput": {"groups": [{"id": self.source["groupId"], "transcript": {"text": self.script},
                "questions": [self.original_question]}]}}
        self.write(self.original_path, original)
        self.prepared = {"sourceRecordId": self.source["sourceRecordId"], "originalPreparedPath": str(self.original_path),
            "originalPreparedSha256": v.sha(self.original_path), "sourceQuestionPdfSha256": v.sha(self.paper),
            "questions": [self.native_question]}
        self.write(self.prepared_path, self.prepared)
        self.source["preparedSha256"] = v.sha(self.prepared_path)
        snapshot = {"id": self.source["setId"], "revision": self.source["revision"],
            "document": {"groups": [{"id": self.source["groupId"], "audio": self.source["audio"], "questions": self.source["questions"]}]}}
        self.write(self.snapshot_path, {"snapshots": [snapshot]})
        self.source_replay.current_snapshot_ref = v.reference(self.snapshot_path)
        self.source_replay.current_snapshot_document = snapshot

    def sync(self):
        super().sync()
        if hasattr(self, "number") and any(p["id"] == self.number["id"] for p in self.container["probes"]):
            self.row["numberClipEvidence"] = {**v.reference(self.probe_path), "probeId": self.number["id"],
                "segmentIds": [401], "text": self.number["segments"][0]["text"], "inputMonoFloat32Sha256": self.number["inputMonoFloat32Sha256"]}
        else:
            self.row.pop("numberClipEvidence", None)
        if hasattr(self, "number"):
            self.row["dialogueProbeEvidence"]["offsetFromStartFrames"] = self.dialogue["startFrame"] - self.raw["startFrame"]

    def validate(self):
        return pdf.validate(self.row, self.source, self.question, self.clock, self.source_replay, v.index_segments(self.asr, 100))

    def admission(self):
        proof, raw, grade, identity = self.validate()
        return {**copy.deepcopy(self.row), "status": "admitted", "evidenceGrade": grade, "proofKey": proof,
            "originalQuestionIdentity": identity, "reconstructed": False,
            "audioRange": {"startMs": self.row["seekStartMs"], "endMs": 100000}, "probeSegments": raw}


class OfficialPdfScopeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.f = OfficialPdfFixture(self.temp.name)

    def rejects(self, reason):
        with self.assertRaisesRegex(v.InvalidEvidence, reason):
            self.f.validate()

    def test_exact_pdf_original_crop_and_first_native_opening_admit_named_version(self):
        proof, _, grade, identity = self.f.validate()
        self.assertEqual(grade, pdf.GRADE)
        self.assertEqual(proof["adapter"], pdf.ADAPTER)
        self.assertEqual(identity["originalEditableQuestionSha256"], identity["currentQuestionSha256"])
        self.assertFalse(proof["providerTimingAuthority"])
        self.assertTrue(v.official_native_admission_origin(self.f.admission()))

    def test_old_official_adapter_keeps_placeholder_instruction_hold(self):
        self.f.row["evidenceAdapter"] = old.ADAPTER
        with self.assertRaisesRegex(v.InvalidEvidence, "instruction_not_current_question"):
            old.validate(self.f.row, self.f.source, self.f.question, self.f.clock, self.f.source_replay, v.index_segments(self.f.asr, 100))

    def test_wrong_actual_pdf_bytes_are_held(self):
        self.f.paper.write_bytes(b"other paper")
        self.rejects("official_original_question_file_corruption")

    def test_wrong_source_question_pdf_hash_is_held(self):
        self.f.question["metadata"]["sourceQuestionSha256"] = "other-paper"
        self.f.sync_identity()
        self.rejects("official_original_question_hash_mismatch")

    def test_wrong_original_ordinal_is_held(self):
        self.f.original_question["sourceNumber"] = 2
        self.f.sync_identity()
        self.rejects("original_question_or_ordinal_mismatch")

    def test_changed_choice_answer_and_metadata_cannot_use_placeholder_route(self):
        for key, value in (("choices", []), ("answerChoiceId", "other"), ("explanation", "changed"),
                           ("metadata", {**self.f.question["metadata"], "extra": True})):
            with self.subTest(key=key):
                original = copy.deepcopy(self.f.question)
                self.f.question[key] = value
                self.f.sync_identity()
                self.rejects("original_editable_question_changed")
                self.f.question.clear()
                self.f.question.update(original)

    def test_nonempty_instruction_and_substantive_prompt_cannot_use_exception(self):
        self.f.question["instruction"] = self.f.instruction
        self.f.sync_identity()
        self.rejects("not_exact_empty_instruction_placeholder")
        self.f.question.pop("instruction")
        self.f.question["prompt"] = "Listen and select the place."
        self.f.sync_identity()
        self.rejects("outside_demonstrated_representation_gaps")

    def test_native_crop_and_visual_hash_cannot_change(self):
        self.f.native_question["image"]["width"] = 2
        self.f.sync_identity()
        self.rejects("native_original_crop_binding_changed")
        self.f.native_question["image"]["width"] = 1
        self.f.native_question["conversion"]["visualSha256"] = "forged-crop"
        self.f.sync_identity()
        self.rejects("original_visual_hash_or_dimensions_changed")

    def test_conversion_and_crop_bounds_must_be_original_preservation(self):
        self.f.native_question["conversion"]["nativePrompt"] = True
        self.f.sync_identity()
        self.rejects("not_original_image_preservation")
        self.f.native_question["conversion"]["nativePrompt"] = False
        self.f.native_question["conversion"]["bounds"] = [0, 0, float("nan"), 1]
        self.f.sync_identity()
        self.rejects("invalid_original_crop_bounds")

    def test_current_snapshot_is_required_and_hashed(self):
        self.f.snapshot_path.write_text("{}", encoding="utf-8")
        self.rejects("missing_frozen_current_snapshot")

    def test_old_recognition_threshold_and_number_input_limit_are_unchanged(self):
        self.f.raw["segments"][0]["text"] = "1. 대화를 듣고 여자의 직업을 고르시오."
        self.f.sync()
        self.rejects("own_instruction_absent")
        self.f.raw["segments"][0]["text"] = "1. " + self.f.instruction
        self.f.number.update(frameCount=64000, durationSeconds=4, inputSampleCount=64000)
        self.f.sync()
        self.rejects("number_clip_unbounded_or_overflow")

    def test_late_literal_quote_cannot_skip_native_first_words(self):
        segment = self.f.dialogue["segments"][0]
        segment["text"] = "Welcome. " + self.f.opening
        segment["words"].insert(0, {"text": "Welcome.", "localStartSeconds": .4, "localEndSeconds": .5, "probability": .99})
        self.f.sync()
        self.rejects("opening_not_first_native_words")

    def test_native_opening_must_be_first_raw_segment_and_early(self):
        self.f.dialogue["segments"][0].update(estimatedStartSeconds=2.1, estimatedEndSeconds=4,
            localStartSeconds=2.1, localEndSeconds=4)
        self.f.dialogue["segments"][0]["words"] = []
        self.f.sync()
        self.rejects("opening_not_first_native_speech")

    def test_word_text_and_zero_confidence_artifacts_are_held(self):
        self.f.dialogue["segments"][0]["words"][0]["text"] = "other"
        self.f.sync()
        self.rejects("opening_word_text_artifact")
        self.f.dialogue["segments"][0]["words"][0]["text"] = "You"
        self.f.dialogue["segments"][0]["words"][0]["probability"] = 0
        self.f.sync()
        self.rejects("word_timing_or_confidence_artifact")

    def test_whole_native_dialogue_clip_cannot_cross_next_start(self):
        self.f.dialogue.update(frameCount=400000, durationSeconds=25, inputSampleCount=400000)
        self.f.sync()
        self.rejects("dialogue_clip_crosses_passage")

    def test_false_next_number_and_truncated_next_instruction_are_held(self):
        self.f.next["segments"][0]["text"] = "3번입니다. 다음을 듣고 고르시오."
        self.f.sync()
        self.rejects("official_catalog_wrong_neighbor")
        self.f.next["segments"][0]["text"] = "2번입니다. 다음을 듣고"
        self.f.sync()
        self.rejects("instruction_missing_or_incomplete")

    def test_wrong_heading_number_and_opening_languages_are_held(self):
        for probe, reason in ((self.f.raw, "wrong_heading_language:probeEvidence"),
                             (self.f.number, "wrong_heading_language:numberClipEvidence"),
                             (self.f.dialogue, "wrong_opening_language_or_purpose|requires_separate_english_dialogue")):
            with self.subTest(probe=probe["id"]):
                language = probe["requestedLanguage"]
                probe["requestedLanguage"] = "en" if language == "ko" else "ko"
                self.f.sync()
                self.rejects(reason)
                probe["requestedLanguage"] = language

    def test_reported_raw_opening_quote_cannot_be_edited(self):
        self.f.row["dialogueProbeEvidence"]["text"] = "invented raw text"
        self.rejects("opening_raw_quote_or_selection_changed")

    def test_unknown_version_and_terminal_shortcut_are_held(self):
        self.f.row["evidenceAdapter"] = "official-anything"
        self.rejects("wrong_source_or_version")
        self.f.row["evidenceAdapter"] = pdf.ADAPTER
        self.f.row["officialTerminalEvidence"] = {"method": "source_end"}
        self.rejects("requires_very_next_original_proof")

    def test_short_number_with_instruction_tail_still_fails_old_numeral_only_gate(self):
        self.f.number["segments"][0]["text"] = "1번 다음을 듣고"
        self.f.sync()
        self.rejects("not_literal_own_number_only")

    def test_named_order_requires_complete_physical_proof_even_without_next_admission(self):
        row = self.f.admission()
        v.settle_candidate_order([row], [self.f.source])
        self.assertEqual(row["status"], "admitted")
        row["proofKey"]["dialogueBinding"]["nextScopeQuestionNumbers"] = [3]
        v.settle_candidate_order([row], [self.f.source])
        self.assertEqual(row["status"], "held")
        self.assertIn("official_scope_native_order_proof_missing_or_changed", row["reasons"])

    def test_ancestry_rejects_missing_or_corrupt_nested_source_refs(self):
        row = self.f.admission()
        original = copy.deepcopy(row)
        row["proofKey"]["boundReferences"] = [r for r in row["proofKey"]["boundReferences"] if r != row["originalQuestionIdentity"]["questionFile"]]
        self.assertFalse(v.official_native_admission_origin(row))
        self.f.paper.write_bytes(b"changed frozen original")
        with self.assertRaisesRegex(v.InvalidEvidence, "nested_evidence_corruption"):
            v.official_native_admission_origin(original)

    def test_dispatcher_resolves_only_explicit_versions(self):
        self.assertIs(v.native_adapter_validator(pdf.ADAPTER), pdf.validate)
        with self.assertRaisesRegex(v.InvalidEvidence, "unknown_native_adapter"):
            v.native_adapter_validator("official-loose")

    def complete_replay(self):
        f = self.f
        f.inventory.update(root=str(f.folder), liveSnapshotPath=str(f.snapshot_path), liveSnapshotSha256=v.sha(f.snapshot_path))
        f.write(f.inventory_path, f.inventory)
        f.write(f.clock_path, {"completeSourceClockReplay": True, "inventorySha256": v.sha(f.inventory_path), "records": [f.clock]})
        f.frozen_path.unlink()
        v.freeze_inputs(f.inventory, f.frozen_path)
        marks = f.folder / "official-marks.json"
        f.write(marks, {"schemaVersion": 1, "evidenceContractVersion": 1, "provider": "claude",
            "inventorySha256": v.sha(f.inventory_path), "records": [f.row]})
        return v.run(f.inventory_path, [marks], f.clock_path, f.frozen_path, f.folder / "certificate",
            source_replay_factory=lambda *args: f.source_replay)

    def test_complete_current_population_keeps_full_original_playback(self):
        result = self.complete_replay()
        self.assertTrue(result["completeReplay"], result["errors"])
        self.assertEqual(result["records"][0]["status"], "admitted", result["records"][0]["reasons"])
        self.assertEqual(result["records"][0]["audioRange"], {"startMs": 100, "endMs": 100000})
        self.assertTrue(v.official_native_admission_origin(result["records"][0]))

    def test_named_pdf_proof_inherits_through_actual_complete_ancestor_contract(self):
        f = self.f
        old = self.complete_replay()
        self.assertEqual(old["records"][0]["status"], "admitted", old["records"][0]["reasons"])
        source, clock = copy.deepcopy(f.source), copy.deepcopy(f.clock)
        source.update(revision=4, documentSha256="current-document")
        clock.update(revision=4, documentSha256="current-document")
        source["questions"][0]["audioRange"] = copy.deepcopy(old["records"][0]["audioRange"])
        snapshot = f.folder / "rebased-snapshot.json"
        f.write(snapshot, {"snapshots": [{"id": source["setId"], "revision": 4,
            "document": {"revision": 4, "groups": [{"id": source["groupId"], "audio": source["audio"], "questions": source["questions"]}]}}]})
        inventory = {**f.inventory, "records": [source], "liveSnapshotPath": str(snapshot), "liveSnapshotSha256": v.sha(snapshot),
            "verifiedAncestor": {"certificate": v.reference(f.folder / "certificate" / "certificate.json"),
                "inventory": v.reference(f.inventory_path), "clock": v.reference(f.clock_path)}}
        inventory_path, clock_path, marks = [f.folder / name for name in ("rebased-inventory.json", "rebased-clock.json", "rebased-marks.json")]
        f.write(inventory_path, inventory)
        f.write(clock_path, {"completeSourceClockReplay": True, "inventorySha256": v.sha(inventory_path), "records": [clock]})
        row = {**f.row, "revision": 4, "documentSha256": "current-document", "status": "existing_verified"}
        f.write(marks, {"schemaVersion": 1, "evidenceContractVersion": 1, "provider": "claude",
            "inventorySha256": v.sha(inventory_path), "records": [row]})
        result = v.run(inventory_path, [marks], clock_path, f.frozen_path, f.folder / "rebased-certificate",
            source_replay_factory=lambda *args: f.source_replay)
        self.assertTrue(result["completeReplay"], result["errors"])
        self.assertEqual(result["records"][0]["status"], "preserved", result["records"][0]["reasons"])
        self.assertEqual(result["records"][0]["audioRange"], old["records"][0]["audioRange"])

    def test_missing_named_pdf_crop_or_malformed_proof_cannot_inherit(self):
        row = self.f.admission()
        row["originalQuestionIdentity"].pop("crop")
        self.assertFalse(v.official_native_admission_origin(row))
        for malformed in ({}, {"proofKey": None}, {"proofKey": {"officialSourceIdentity": None}},
                          {"proofKey": {"officialSourceIdentity": {}, "dialogueBinding": []}}):
            self.assertFalse(v.official_native_admission_origin(malformed))

    def member_fixture(self):
        f = self.f
        f.question.update(sourceNumber=19, prompt="Woman: ____", instruction=f.instruction)
        f.question["metadata"]["sourceNumber"] = 19
        next_question = copy.deepcopy(f.question)
        next_question.update(id="original-q20", sourceNumber=20)
        next_question["metadata"]["sourceNumber"] = 20
        f.source["questions"].append(next_question)
        f.original_question = copy.deepcopy(f.question)
        f.native_question.update(sourceNumber=19, prompt=f.question["prompt"], instruction=f.instruction)
        f.row.update(sourceNumber=19, cueNumber=19, kind="shared_instruction_member",
            scopeQuestionNumbers=[19], cueSpokenNumbers=[19])
        f.dialogue["purpose"] = "member_dialogue"
        f.row.pop("officialIdentityEvidence")
        f.row.pop("numberClipEvidence")
        f.raw["segments"][0]["text"] = "19번."
        f.next["segments"][0]["text"] = "20번입니다. 다음을 듣고 고르시오."
        f.asr["segments"][0]["text"] = "19번입니다."
        f.asr["segments"][2]["text"] = "20번입니다."
        f.script = "19번 W: " + f.opening + "\n20번 " + f.instruction + " M: Welcome to this special cooking class."
        f.row["scriptEvidence"].update(sectionStartCharacter=f.script.index(" "), sectionEndCharacter=f.script.index("20번"),
            firstDialogueStartCharacter=f.script.index(f.opening))
        f.container["probes"] = [f.raw, f.next, f.dialogue]
        f.sync_identity()
        f.sync()

    def test_original_q19_member_can_use_proved_native_q20_without_q20_admission(self):
        self.member_fixture()
        row = self.f.admission()
        self.assertEqual(row["originalQuestionIdentity"]["method"], "exact_original_pdf_native_member_v2")
        v.settle_candidate_order([row], [self.f.source])
        self.assertEqual(row["status"], "admitted")
        self.f.row["evidenceAdapter"] = old.ADAPTER
        proof, _, grade, identity = old.validate(self.f.row, self.f.source, self.f.question,
            self.f.clock, self.f.source_replay, v.index_segments(self.f.asr, 100))
        old_row = {**copy.deepcopy(self.f.row), "status": "admitted", "reconstructed": False,
            "proofKey": proof, "evidenceGrade": grade, "originalQuestionIdentity": identity,
            "audioRange": {"startMs": 100, "endMs": 100000}}
        v.settle_candidate_order([old_row], [self.f.source])
        self.assertEqual(old_row["status"], "held")
        self.assertIn("dialogue_offset_next_original_passage_boundary_missing", old_row["reasons"])

    def test_q19_first_shared_heading_confusion_and_other_member_scope_are_held(self):
        self.member_fixture()
        self.f.row["kind"] = "shared_instruction_head"
        self.rejects("outside_demonstrated_representation_gaps")
        self.f.row["kind"] = "shared_instruction_member"
        self.f.question["sourceNumber"] = 18
        self.rejects("outside_demonstrated_representation_gaps")

    def test_q19_wrong_original_question_and_next_native_overlap_are_held(self):
        self.member_fixture()
        self.f.native_question["questionId"] = "other-member"
        self.f.sync_identity()
        self.rejects("official_original_question_identity_mismatch")
        self.f.native_question["questionId"] = self.f.question["id"]
        self.f.sync_identity()
        self.f.dialogue.update(frameCount=400000, durationSeconds=25, inputSampleCount=400000, purpose="first_dialogue")
        self.f.sync()
        self.rejects("dialogue_clip_crosses_passage")

    def test_member_rejects_unrelated_first_dialogue_purpose(self):
        self.member_fixture()
        self.f.dialogue["purpose"] = "first_dialogue"
        self.f.sync()
        self.rejects("wrong_opening_language_or_purpose")

    def test_member_dialogue_input_cannot_use_sixty_second_first_dialogue_limit(self):
        self.member_fixture()
        self.f.dialogue.update(frameCount=240000, durationSeconds=15, inputSampleCount=240000)
        self.f.sync()
        self.rejects("invalid_bounded_probe_duration")


if __name__ == "__main__":
    unittest.main()
