"""Paired END evidence never changes the strict physical own START contract."""
import copy
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import official_catalog_adapter as old
import official_next_pair_adapter as pair
import official_pdf_scope_adapter as pdf
import verifier as v
from test_official_pdf_scope import OfficialPdfFixture
from test_verifier import segment


class NextPairFixture(OfficialPdfFixture):
    def __init__(self, folder):
        super().__init__(folder)
        self.next_number = copy.deepcopy(self.next)
        self.next_number.update(id="next-numeral", frameCount=32000, durationSeconds=2, inputSampleCount=32000)
        self.next_number["segments"] = [{**segment(501, "2번", .4, 1), "localStartSeconds": .4, "localEndSeconds": 1, "words": []}]
        self.next["segments"][0]["text"] = "2. " + self.instruction
        self.container["probes"].append(self.next_number)
        self.row.update(evidenceAdapter=pair.ADAPTER, originalStartAdapter=pdf.ADAPTER)
        self.next_question = copy.deepcopy(self.question)
        self.next_question.update(id="question-two", sourceNumber=2, prompt="원본 문제지 2번 문항")
        self.next_question["metadata"]["sourceNumber"] = 2
        self.source["questions"].append(self.next_question)
        self.sync_identity()
        self.sync()

    def sync_identity(self):
        super().sync_identity()
        if not hasattr(self, "next_question"):
            return
        original = v.read(self.original_path)
        original["editableInput"]["groups"][0]["questions"].append(pdf.canonical_question(self.next_question))
        self.write(self.original_path, original)
        self.prepared["originalPreparedSha256"] = v.sha(self.original_path)
        self.prepared["questions"].append({**copy.deepcopy(self.native_question), "questionId": self.next_question["id"],
                                           "sourceNumber": 2, "prompt": self.next_question["prompt"]})
        self.write(self.prepared_path, self.prepared)
        self.source["preparedSha256"] = v.sha(self.prepared_path)

    def sync(self):
        super().sync()
        if hasattr(self, "next_number"):
            self.row["nextNumberClipEvidence"] = {**v.reference(self.probe_path), "probeId": self.next_number["id"],
                "segmentIds": [s["id"] for s in self.next_number["segments"]],
                "text": " ".join(s["text"] for s in self.next_number["segments"]),
                "inputMonoFloat32Sha256": self.next_number["inputMonoFloat32Sha256"]}

    def validate(self):
        return pair.validate(self.row, self.source, self.question, self.clock, self.source_replay, v.index_segments(self.asr, 100))

    def ordinary(self):
        self.row["originalStartAdapter"] = old.ADAPTER
        self.question.update(prompt=self.instruction)
        self.original_question.update(prompt=self.instruction)
        self.native_question.update(prompt=self.instruction)
        self.sync_identity()


class OfficialNextPairTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.f = NextPairFixture(self.temp.name)

    def rejects(self, reason):
        with self.assertRaisesRegex(v.InvalidEvidence, reason):
            self.f.validate()

    def test_explicit_paired_end_and_unchanged_placeholder_start_pass(self):
        proof, _, grade, _ = self.f.validate()
        self.assertEqual(grade, pair.GRADE)
        self.assertEqual(proof["adapter"], pair.ADAPTER)
        self.assertFalse(proof["pairedNextBoundary"]["maySupplySeekStart"])
        self.assertEqual(proof["pairedNextBoundary"]["originalNextIdentity"]["sourceNumber"], 2)
        self.assertTrue(v.official_native_admission_origin(self.f.admission()))

    def test_ordinary_own_instruction_start_has_separate_identity_and_same_pair(self):
        self.f.ordinary()
        row = self.f.admission()
        self.assertEqual(row["originalQuestionIdentity"]["method"], "exact_original_pdf_native_single_v3")
        self.assertTrue(v.official_native_admission_origin(row))
        v.settle_candidate_order([row], [self.f.source])
        self.assertEqual(row["status"], "admitted")

    def test_old_pdf_route_still_holds_bare_next_number(self):
        row = {**self.f.row, "evidenceAdapter": pdf.ADAPTER}
        with self.assertRaisesRegex(v.InvalidEvidence, "missing_original_number"):
            pdf.validate(row, self.f.source, self.f.question, self.f.clock, self.f.source_replay, v.index_segments(self.f.asr, 100))

    def test_missing_numeral_or_context_never_admits(self):
        for field in ("nextNumberClipEvidence", "nextProbeEvidence"):
            with self.subTest(field=field):
                saved = self.f.row.pop(field)
                self.rejects("requires_single_end|missing_or_multiple|requires_very_next_original_proof")
                self.f.row[field] = saved

    def test_wrong_short_neighbor_and_instruction_tail_hold(self):
        for text in ("3번", "2번 다음을 듣고", "2번과 3번", "2번째"):
            with self.subTest(text=text):
                self.f.next_number["segments"][0]["text"] = text
                self.f.sync()
                self.rejects("not_literal_very_next_numeral_only")

    def test_wrong_context_number_cannot_borrow_correct_short_number(self):
        self.f.next["segments"][0]["text"] = "3. " + self.f.instruction
        self.f.sync()
        self.rejects("context_wrong_original_number")

    def test_wrong_context_original_instruction_held(self):
        self.f.next["segments"][0]["text"] = "2. 대화를 듣고 여자의 직업을 고르시오."
        self.f.sync()
        self.rejects("original_instruction_not_heard")

    def test_truncated_context_and_completion_after_english_hold(self):
        self.f.next["segments"][0]["text"] = "2. 다음을 듣고"
        self.f.sync()
        self.rejects("instruction_missing_or_incomplete")
        self.f.next["segments"].extend([
            {**segment(202, "Yes.", 2.1, 3), "localStartSeconds": 2.1, "localEndSeconds": 3, "words": []},
            {**segment(203, "가장 적절한 것을 고르시오.", 3.1, 4), "localStartSeconds": 3.1, "localEndSeconds": 4, "words": []}])
        self.f.sync()
        self.rejects("instruction_crosses_dialogue")

    def test_context_nonfirst_and_short_nonfirst_speech_held(self):
        for probe in (self.f.next, self.f.next_number):
            with self.subTest(probe=probe["id"]):
                saved = copy.deepcopy(probe["segments"])
                probe["segments"][0].update(estimatedStartSeconds=2.1, estimatedEndSeconds=2.2,
                    localStartSeconds=2.1, localEndSeconds=2.2)
                if probe is self.f.next_number:
                    probe.update(frameCount=48000, durationSeconds=3, inputSampleCount=48000)
                self.f.sync()
                self.rejects("not_first_native_speech")
                probe["segments"] = saved

    def test_short_number_onset_correspondence_is_still_half_second(self):
        self.f.next_number["segments"][0].update(estimatedStartSeconds=1.0, estimatedEndSeconds=1.5,
            localStartSeconds=1.0, localEndSeconds=1.5)
        self.f.sync()
        self.rejects("numeral_onset_correspondence_missing")

    def test_different_start_onset_quiet_clock_are_held(self):
        for key in ("startFrame", "onsetFrame", "quietBeforeFrames", "sampleRate", "channels"):
            with self.subTest(key=key):
                original = self.f.next_number[key]
                self.f.next_number[key] += 1
                self.f.sync()
                self.rejects("different_native_onset|wrong_clock|catalog_source_bounds")
                self.f.next_number[key] = original

    def test_input_limits_remain_three_and_fourteen_seconds(self):
        for probe, seconds in ((self.f.next_number, 3.01), (self.f.next, 14.01)):
            with self.subTest(probe=probe["id"]):
                saved = copy.deepcopy(probe)
                probe.update(frameCount=int(seconds * 16000), durationSeconds=seconds, inputSampleCount=int(seconds * 16000))
                self.f.sync()
                self.rejects("probe_source_bounds")
                probe.clear()
                probe.update(saved)

    def test_wrong_or_missing_explicit_languages_hold(self):
        for probe in (self.f.next, self.f.next_number):
            for language in ("en", None):
                with self.subTest(probe=probe["id"], language=language):
                    probe["requestedLanguage"] = language
                    self.f.sync()
                    self.rejects("wrong_language")
            probe["requestedLanguage"] = "ko"

    def test_uncertain_and_overflow_flags_are_not_repaired(self):
        self.f.next_number["segments"][0]["uncertain"] = True
        self.f.sync()
        self.rejects("uncertain")
        self.f.next_number["segments"][0]["uncertain"] = False
        self.f.next["overflow"] = True
        self.f.sync()
        self.rejects("overflow")

    def test_wrong_reported_raw_quote_or_input_hash_hold(self):
        for field in ("nextProbeEvidence", "nextNumberClipEvidence"):
            with self.subTest(field=field):
                self.f.row[field]["text"] = "edited"
                self.rejects("raw_quote_changed")
                self.f.sync()
                self.f.row[field]["inputMonoFloat32Sha256"] = "forged"
                self.rejects("reference_input_hash")
                self.f.sync()

    def test_independent_pcm_replay_cannot_be_skipped(self):
        original = self.f.source_replay.replay
        self.f.source_replay.replay = lambda p: {**original(p), "clipPcmSha256": "different native PCM"}
        self.rejects("actual_probe_hash|replay_hash")

    def test_wrong_raw_source_and_request_hash_hold(self):
        self.f.container["sourceAudioSha256"] = "different raw source"
        self.f.sync()
        self.rejects("bounded_probe_wrong_source")

    def test_corrupt_nested_request_hold(self):
        self.f.request_path.write_text("{}", encoding="utf-8")
        self.rejects("artifact_hash_mismatch")

    def test_wrong_actual_next_pdf_bytes_hold(self):
        self.f.paper.write_bytes(b"changed original PDF")
        self.rejects("original_question_file_corruption")

    def test_missing_or_wrong_original_next_qid_ordinal_hold(self):
        prepared = v.read(self.f.prepared_path)
        prepared["questions"][1]["sourceNumber"] = 3
        self.f.write(self.f.prepared_path, prepared)
        self.f.source["preparedSha256"] = v.sha(self.f.prepared_path)
        self.rejects("original_question_or_ordinal_mismatch|original_question_identity_mismatch")

    def test_missing_current_snapshot_and_wrong_revision_hold(self):
        self.f.source_replay.current_snapshot_document["revision"] += 1
        self.rejects("current_snapshot_identity_mismatch")

    def test_same_onset_conflict_and_repeat_occurrence_hold(self):
        sibling = copy.deepcopy(self.f.next)
        sibling.update(id="conflict")
        sibling["segments"][0]["text"] = "3. " + self.f.instruction
        self.f.container["probes"].append(sibling)
        self.f.sync()
        self.rejects("contradictory_same_onset_number")
        sibling.update(startFrame=600000, onsetFrame=606400)
        sibling["segments"][0]["text"] = "2. " + self.f.instruction
        self.f.sync()
        self.rejects("number_at_distant_occurrence")

    def test_shared_member_or_shared_scope_start_cannot_use_pair(self):
        for kind, scope in (("shared_instruction_member", [1]), ("single", [1, 2])):
            with self.subTest(kind=kind):
                self.f.row.update(kind=kind, scopeQuestionNumbers=scope)
                self.rejects("wrong_source_version_or_start_scope")

    def test_own_start_numeral_tail_and_instruction_still_hold(self):
        self.f.number["segments"][0]["text"] = "1번 다음을 듣고"
        self.f.sync()
        self.rejects("not_literal_own_number_only")
        self.f.number["segments"][0]["text"] = "1번"
        self.f.raw["segments"][0]["text"] = "1. 대화를 듣고 여자의 직업을 고르시오."
        self.f.sync()
        self.rejects("own_instruction_absent")

    def test_own_first_words_and_word_confidence_cannot_be_repaired_by_paired_end(self):
        raw = self.f.dialogue["segments"][0]
        raw["words"][0]["probability"] = 0
        self.f.sync()
        self.rejects("word_timing_or_confidence_artifact")
        raw["words"][0]["probability"] = .99
        raw["words"][0]["localEndSeconds"] = raw["words"][0]["localStartSeconds"]
        self.f.sync()
        self.rejects("word_timing_or_confidence_artifact")

    def test_own_first_syllable_native_start_cannot_move_forward(self):
        self.f.row["nativeEvidence"]["startFrame"] += 320
        self.rejects("native_start_not_measured_quiet_lead|native_probe_bounds")

    def test_ancestry_raw_paired_segment_changes_cannot_inherit(self):
        row = self.f.admission()
        row["proofKey"]["pairedNextBoundary"]["numeralRawSegments"][0]["text"] = "3번"
        self.assertFalse(v.official_native_admission_origin(row))

    def test_unknown_start_version_and_terminal_shortcuts_hold(self):
        self.f.row["originalStartAdapter"] = "relaxed-start"
        self.rejects("unknown_frozen_start_contract")
        self.f.row["originalStartAdapter"] = pdf.ADAPTER
        self.f.row["officialTerminalEvidence"] = {"method": "source_end"}
        self.rejects("requires_very_next_original_proof")

    def test_ancestry_rejects_pair_start_end_number_and_missing_refs(self):
        original = self.f.admission()
        for key, value in (("maySupplySeekStart", True), ("onsetFrame", 1), ("scopeQuestionNumbers", [3]),
                           ("numeralProbe", None), ("originalNextIdentity", {})):
            with self.subTest(key=key):
                row = copy.deepcopy(original)
                row["proofKey"]["pairedNextBoundary"][key] = value
                self.assertFalse(v.official_native_admission_origin(row))
        row = copy.deepcopy(original)
        row["proofKey"]["boundReferences"] = []
        self.assertFalse(v.official_native_admission_origin(row))

    def test_ordinary_ancestry_rejects_late_opening_and_wrong_scope(self):
        self.f.ordinary()
        row = self.f.admission()
        row["proofKey"]["nativeFirstOpening"]["selectedStartFrame"] = row["proofKey"]["nextStartFrame"] + 1
        self.assertFalse(v.official_native_admission_origin(row))

    def test_dispatcher_executes_exact_new_version(self):
        self.assertIs(v.native_adapter_validator(pair.ADAPTER), pair.validate)

    def alias_fixture(self):
        f = self.f
        f.row["evidenceAdapter"] = old.ADAPTER
        f.row.pop("originalStartAdapter")
        f.container["probes"].remove(f.next_number)
        f.row.pop("nextNumberClipEvidence", None)
        del f.next_number
        f.next["segments"][0]["text"] = "2번과 3번입니다. 다음을 듣고 두 물음에 답하시오."
        f.sync()
        f.row["nextBoundaryProbeEvidence"] = copy.deepcopy(f.row.pop("nextProbeEvidence"))
        f.row["nextBoundaryNativeEvidence"] = {k: f.next[k] for k in ("startFrame", "onsetFrame", "quietBeforeFrames")}
        before = copy.deepcopy(f.row)
        marks = f.folder / "alias-input.json"
        f.write(marks, {"records": [f.row], "provider": "claude"})
        output = f.folder / "alias-output"
        process = subprocess.run([sys.executable, str(Path(__file__).with_name("prepare-next-pair-marks.py")),
            "--marks", str(marks), "--scope-question", f.question["id"],
            "--bind-joint-next-question", f.question["id"], "--output", str(output)], capture_output=True, text=True)
        self.assertEqual(process.returncode, 0, process.stderr)
        f.row = v.read(output / marks.name)["records"][0]
        return f, before, v.read(output / "adaptation.json")

    def refresh_alias(self):
        f = self.f
        f.sync()
        f.row["nextBoundaryProbeEvidence"] = copy.deepcopy(f.row["nextProbeEvidence"])

    def test_exact_joint_alias_preserves_both_numbers_and_all_other_raw_fields(self):
        f, before, audit = self.alias_fixture()
        self.assertEqual(f.row["nextProbeEvidence"], before["nextBoundaryProbeEvidence"])
        self.assertEqual(f.row["nextNativeEvidence"], before["nextBoundaryNativeEvidence"])
        allowed = {"evidenceAdapter", "nextProbeEvidence", "nextNativeEvidence"}
        self.assertEqual({k: val for k, val in before.items() if k not in allowed},
                         {k: val for k, val in f.row.items() if k not in allowed})
        self.assertFalse(audit["rawFactsChanged"])
        proof, _, _, _ = pdf.validate(f.row, f.source, f.question, f.clock, f.source_replay, v.index_segments(f.asr, 100))
        self.assertEqual(proof["nextSpokenNumbers"], [2, 3])

    def test_joint_alias_wrong_first_number_is_held(self):
        f, _, _ = self.alias_fixture()
        f.next["segments"][0]["text"] = "3번과 4번입니다. 다음을 듣고 두 물음에 답하시오."
        self.refresh_alias()
        with self.assertRaisesRegex(v.InvalidEvidence, "wrong_neighbor"):
            pdf.validate(f.row, f.source, f.question, f.clock, f.source_replay, v.index_segments(f.asr, 100))

    def test_joint_alias_wrong_source_is_held(self):
        f, _, _ = self.alias_fixture()
        f.container["sourceAudioSha256"] = "other original source"
        self.refresh_alias()
        with self.assertRaisesRegex(v.InvalidEvidence, "bounded_probe_wrong_source"):
            pdf.validate(f.row, f.source, f.question, f.clock, f.source_replay, v.index_segments(f.asr, 100))

    def test_joint_alias_wrong_native_onset_is_held(self):
        f, _, _ = self.alias_fixture()
        f.next["onsetFrame"] += 320
        self.refresh_alias()
        with self.assertRaisesRegex(v.InvalidEvidence, "auxiliary_onset_bounds"):
            pdf.validate(f.row, f.source, f.question, f.clock, f.source_replay, v.index_segments(f.asr, 100))

    def test_complete_population_uses_real_adapter_and_carries_pair_refs(self):
        f = self.f
        f.inventory.update(root=str(f.folder), liveSnapshotPath=str(f.snapshot_path), liveSnapshotSha256=v.sha(f.snapshot_path))
        f.write(f.inventory_path, f.inventory)
        f.write(f.clock_path, {"completeSourceClockReplay": True, "inventorySha256": v.sha(f.inventory_path), "records": [f.clock]})
        f.frozen_path.unlink()
        v.freeze_inputs(f.inventory, f.frozen_path)
        marks = f.folder / "pair-marks.json"
        held = {**copy.deepcopy(f.row), "questionId": f.next_question["id"], "sourceNumber": 2,
                "status": "held", "reasons": ["not_offered_fixture"]}
        f.write(marks, {"schemaVersion": 1, "evidenceContractVersion": 1, "provider": "claude",
                       "inventorySha256": v.sha(f.inventory_path), "records": [f.row, held]})
        result = v.run(f.inventory_path, [marks], f.clock_path, f.frozen_path, f.folder / "certificate",
                       source_replay_factory=lambda *args: f.source_replay)
        self.assertTrue(result["completeReplay"], result["errors"])
        row = result["records"][0]
        self.assertEqual(row["status"], "admitted", row["reasons"])
        self.assertEqual(row["audioRange"], {"startMs": 100, "endMs": 100000})
        self.assertEqual(row["nextNumberClipEvidence"], self.f.row["nextNumberClipEvidence"])
        self.assertTrue(v.official_native_admission_origin(row))


if __name__ == "__main__":
    unittest.main()
