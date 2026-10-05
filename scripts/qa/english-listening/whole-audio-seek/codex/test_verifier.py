"""Adversarial offline tests exercise the evidence, never a network/model call."""
import copy
import json
import tempfile
import unittest
from pathlib import Path

import verifier as v


def segment(id, text, start, end, **extra):
    return {"id": id, "text": text, "estimatedStartSeconds": start,
            "estimatedEndSeconds": end, "uncertain": False, "avgLogProbability": -.1,
            "compressionRatio": 1.2, "noSpeechProbability": .1, **extra}


class Fixture:
    def __init__(self, folder, *, reconstructed=False, existing=0):
        self.folder = Path(folder)
        self.source_audio = self.folder / "source.mp3"
        self.source_audio.write_bytes(b"immutable original source fixture")
        self.asr_path = self.folder / "asr.json"
        self.prepared_path = self.folder / "prepared.json"
        self.probe_path = self.folder / "probe.json"
        self.alignment_path = self.folder / "alignment.json"
        self.source = {"sourceRecordId": "source-A", "setId": "set-A", "revision": 3,
                       "documentSha256": "document-A", "reconstructed": reconstructed,
                       "assignedAgent": "grok" if reconstructed else "claude", "groupId": "group-A",
                       "audio": {"assetId": "asset-A", "sha256": "playback-A", "durationMs": 100000},
                       "sourceAudioSha256": v.sha(self.source_audio), "sourceAudioPath": str(self.source_audio),
                       "asrPath": str(self.asr_path), "preparedPath": str(self.prepared_path),
                       "alignmentPath": str(self.alignment_path), "questions": []}
        self.question = {"id": "question-A", "sourceNumber": 1, "prompt": "Museum sign?", "evidence": [],
                         "metadata": {"sourceRecordId": "source-A", "sourceAudioSha256": self.source["sourceAudioSha256"]}, "audioRange": None}
        self.source["questions"].append(self.question)
        self.asr = {"sourceAudioSha256": self.source["sourceAudioSha256"], "sourceAudioPath": str(self.source_audio), "durationSeconds": 100,
                    "segments": [segment(1, "1번입니다.", 1.5, 2), segment(2, "You cannot take pictures in the museum.", 2.5, 3), segment(3, "2번입니다.", 50, 50.5)]}
        self.probe = {"sourceAudioSha256": self.source["sourceAudioSha256"], "sampleRate": 16000,
                      "sourceOffsetFrame": 16000, "actualFrameCount": 80000, "sourceFrameCount": 1600000,
                      "decodedMonoFloat32Sha256": "probe-PCM", "speechOnsetFrames": [8000],
                      "vadOptions": {"threshold": .5, "minSilenceDurationMs": 200, "speechPadMs": 0},
                      "segments": [segment(101, "1번입니다.", .5, 1), segment(102, "You cannot take pictures in the museum.", 1.5, 2)]}
        self.replay = {"sourceFrameCount": 1600000, "pcmSha256": "probe-PCM", "onsets": [8000]}
        self.write(self.asr_path, self.asr)
        self.write(self.prepared_path, {"sourceRecordId": "source-A"})
        self.write(self.probe_path, self.probe)
        self.alignment = {"sourceRecordId": "source-A", "sourceAudioSha256": self.source["sourceAudioSha256"],
                          "asrSha256": v.sha(self.asr_path), "candidates": [{"questionId": self.question["id"],
                          "generatedOrdinal": 1, "method": "verified_generation_evidence_segments", "sourceSegmentIds": [2]}]}
        self.write(self.alignment_path, self.alignment)
        self.source.update(asrSha256=v.sha(self.asr_path), preparedSha256=v.sha(self.prepared_path))
        self.row = {"sourceRecordId": "source-A", "setId": "set-A", "revision": 3, "documentSha256": "document-A",
                    "questionId": "question-A", "sourceNumber": 1, "status": "candidate", "seekStartMs": 1500,
                    "sourceAudioSha256": self.source["sourceAudioSha256"], "playbackSha256": "playback-A",
                    "asrPath": str(self.asr_path), "asrSha256": self.source["asrSha256"], "cueSegmentIds": [1],
                    "anchorSegmentIds": [2], "cueNumber": 1, "scopeQuestionNumbers": [1], "reasons": [],
                    "nativeEvidence": {"sourceAudioSha256": self.source["sourceAudioSha256"], "sampleRate": 16000,
                    "startFrame": 24000, "probe": v.reference(self.probe_path), "probeOffsetFrame": 16000,
                    "probeFrameCount": 80000, "cueProbeSegmentIds": [101], "cueOnsetFrame": 24000, "pcmSha256": "probe-PCM"},
                    "mappingEvidence": {"alignment": v.reference(self.alignment_path), "originalQuestionNumber": 1}}
        self.clock = {"sourceRecordId": "source-A", "status": "passed", "sourceAudioSha256": self.source["sourceAudioSha256"],
                      "playbackSha256": "playback-A", "documentSha256": "document-A", "revision": 3,
                      "durationMs": 100000, "sampleRate": 16000, "frameCount": 1600000, "sourceToPlaybackOffsetMs": 0}
        self.rows = [self.row]
        for i in range(existing):
            q = copy.deepcopy(self.question)
            q.update(id=f"existing-{i}", sourceNumber=i + 2, audioRange={"startMs": 4000 + i * 1000, "endMs": 100000})
            self.source["questions"].append(q)
            row = copy.deepcopy(self.row)
            row.update(questionId=q["id"], sourceNumber=q["sourceNumber"], status="existing_verified", seekStartMs=q["audioRange"]["startMs"])
            self.rows.append(row)
        snapshot_path = self.folder / "snapshot.json"
        self.write(snapshot_path, {"snapshots": [{"id": "set-A", "revision": 3, "document": {"groups": [{"id": "group-A", "audio": self.source["audio"], "questions": self.source["questions"]}]}}]})
        self.inventory_path = self.folder / "inventory.json"
        self.inventory = {"liveSnapshotPath": str(snapshot_path), "liveSnapshotSha256": v.sha(snapshot_path), "records": [self.source]}
        self.write(self.inventory_path, self.inventory)
        self.clock_path = self.folder / "clock.json"
        self.write(self.clock_path, {"inventorySha256": v.sha(self.inventory_path), "records": [self.clock]})
        self.frozen_path = self.folder / "frozen.json"
        v.freeze_inputs(self.inventory, self.frozen_path)

    @staticmethod
    def write(path, value):
        Path(path).write_text(json.dumps(value, ensure_ascii=False), encoding="utf-8")

    def run(self, rows=None, *, version=1):
        marks = self.folder / "marks.json"
        self.write(marks, {"schemaVersion": 1, "evidenceContractVersion": version, "inventorySha256": v.sha(self.inventory_path),
                           "provider": self.source["assignedAgent"], "records": rows if rows is not None else self.rows})
        fixture = self

        class Replay:
            def replay(self, source, probe):
                return fixture.replay

        return v.run(self.inventory_path, [marks], self.clock_path, self.frozen_path, self.folder / "result", Replay())


class EvidenceTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.f = Fixture(self.temporary.name)

    def tearDown(self):
        self.temporary.cleanup()

    def rejects(self, fn, reason):
        with self.assertRaisesRegex(v.InvalidEvidence, reason):
            fn()

    def test_valid_start_continues_to_full_original_without_end_proof(self):
        result = self.f.run()
        self.assertTrue(result["completeReplay"])
        self.assertEqual(result["records"][0]["audioRange"], {"startMs": 1500, "endMs": 100000})
        self.assertEqual(result["counts"]["outcomes"], {"admitted": 1})

    def test_corrupt_asr_holds_candidate(self):
        self.f.asr_path.write_text("{}", encoding="utf-8")
        result = self.f.run()
        self.assertEqual(result["records"][0]["status"], "held")
        self.assertIn("frozen_input_changed", result["records"][0]["reasons"][0])

    def test_missing_original_inputs_in_frozen_manifest_cannot_be_silently_ignored(self):
        frozen = v.read(self.f.frozen_path)
        frozen["records"][0]["files"].pop("source")
        self.f.write(self.f.frozen_path, frozen)
        result = self.f.run()
        self.assertEqual(result["records"][0]["status"], "held")
        self.assertIn("incomplete_or_extra_frozen_source_files", result["records"][0]["reasons"][0])

    def test_duplicate_native_clock_and_frozen_source_entries_are_invalid(self):
        for path in (self.f.clock_path, self.f.frozen_path):
            original = v.read(path)
            changed = copy.deepcopy(original)
            changed["records"].append(copy.deepcopy(changed["records"][0]))
            self.f.write(path, changed)
            self.rejects(lambda: self.f.run(), "incomplete_or_duplicate_source_clocks|incomplete_or_duplicate_frozen_sources")
            self.f.write(path, original)

    def test_identity_wrong_source_question_revision_document_playback(self):
        for key in ("sourceRecordId", "questionId", "revision", "documentSha256", "sourceAudioSha256", "playbackSha256", "sourceNumber"):
            with self.subTest(field=key):
                row = copy.deepcopy(self.f.row)
                row[key] = 99 if isinstance(row[key], int) else "wrong"
                self.rejects(lambda: v.validate_identity(row, self.f.source, self.f.question), f"identity_mismatch:{key}")

    def test_boolean_timestamp_and_frame_are_invalid(self):
        for field in ("seekStartMs", "startFrame"):
            row = copy.deepcopy(self.f.row)
            if field == "seekStartMs":
                row[field] = True
            else:
                row["nativeEvidence"][field] = True
            self.rejects(lambda: v.validate_native(row, self.f.source, self.f.probe, self.f.replay), "native_start|seek_native")

    def test_asr_segment_overflow_nan_negative_duplicate(self):
        for change in ({"estimatedEndSeconds": 101}, {"estimatedStartSeconds": -1}, {"estimatedEndSeconds": float("nan")}):
            raw = copy.deepcopy(self.f.asr)
            raw["segments"][0].update(change)
            self.rejects(lambda: v.index_segments(raw, 100), "raw_segment_overflow|invalid_raw_estimate")
        raw = copy.deepcopy(self.f.asr)
        raw["segments"][1]["id"] = 1
        self.rejects(lambda: v.index_segments(raw, 100), "duplicate_or_invalid_raw_segment_id")

    def test_unknown_duplicate_cues_and_anchors(self):
        index = v.index_segments(self.f.asr, 100)
        for ids, reason in (([999], "unknown_segment_id"), ([1, 1], "duplicate_segment_ids")):
            self.rejects(lambda: v.select_segments(index, ids), reason)

    def test_diagnostic_asr_ids_preserve_uncertain_estimates_without_admission_authority(self):
        index = v.index_segments(self.f.asr, 100)
        index[2]["uncertain"] = True
        row = {"diagnosticAsrSegmentIds": [2], "diagnosticAsrText": index[2]["text"]}
        observed = v.diagnostic_segments(row, index)
        self.assertTrue(observed[0]["uncertain"])
        self.assertEqual(observed[0]["estimatedStartSeconds"], 2.5)
        for ids, reason in (([999], "unknown_segment_id"), ([2, 2], "duplicate_segment_ids")):
            row["diagnosticAsrSegmentIds"] = ids
            self.rejects(lambda: v.diagnostic_segments(row, index), reason)
        row.update(diagnosticAsrSegmentIds=[2], diagnosticAsrText="fabricated quotation")
        self.rejects(lambda: v.diagnostic_segments(row, index), "diagnostic_asr_quote_changed")

    def test_raw_uncertainty_cannot_be_masked(self):
        for change in ({"uncertain": True}, {"avgLogProbability": -1.01}, {"compressionRatio": 2.41}, {"noSpeechProbability": .9, "avgLogProbability": -.7}):
            raw = copy.deepcopy(self.f.probe)
            raw["segments"][0].update(change)
            self.rejects(lambda: v.validate_native(self.f.row, self.f.source, raw, self.f.replay), "uncertain_raw_evidence")

    def test_no_speech_alone_does_not_invent_uncertainty(self):
        raw = copy.deepcopy(self.f.probe)
        raw["segments"][0]["noSpeechProbability"] = .99
        v.validate_native(self.f.row, self.f.source, raw, self.f.replay)

    def test_probe_overflow_and_actual_duration_bound(self):
        for offset, count in ((-1, 80000), (1590000, 80000), (0, 16000 * 121)):
            raw = copy.deepcopy(self.f.probe)
            raw.update(sourceOffsetFrame=offset, actualFrameCount=count)
            self.rejects(lambda: v.validate_native(self.f.row, self.f.source, raw, self.f.replay), "probe_overflow_or_unbounded")

    def test_native_pcm_corruption_and_source_swap(self):
        replay = {**self.f.replay, "pcmSha256": "corrupt"}
        self.rejects(lambda: v.validate_native(self.f.row, self.f.source, self.f.probe, replay), "native_decode_hash_mismatch")
        raw = {**self.f.probe, "sourceAudioSha256": "another source"}
        self.rejects(lambda: v.validate_native(self.f.row, self.f.source, raw, self.f.replay), "native_wrong_source")

    def test_native_proxy_clock_drift(self):
        replay = {**self.f.replay, "sourceFrameCount": 1600000 + 16000}
        raw = {**self.f.probe, "sourceFrameCount": replay["sourceFrameCount"]}
        self.rejects(lambda: v.validate_native(self.f.row, self.f.source, raw, replay), "native_proxy_duration_drift")
        clock = {**self.f.clock, "sourceToPlaybackOffsetMs": 1000}
        self.rejects(lambda: v.validate_clock(clock, self.f.source, self.f.asr), "source_playback_offset_unverified")

    def test_start_after_cue_or_guessed_before_onset(self):
        for start, reason in ((24001, "native_start_overflow_or_after_cue"), (15000, "native_start_too_early")):
            row = copy.deepcopy(self.f.row)
            row["nativeEvidence"]["startFrame"] = start
            self.rejects(lambda: v.validate_native(row, self.f.source, self.f.probe, self.f.replay), reason)

    def test_ambiguous_native_onset_in_long_raw_segment(self):
        raw = copy.deepcopy(self.f.probe)
        raw["speechOnsetFrames"] = [8000, 10000]
        replay = {**self.f.replay, "onsets": [8000, 10000]}
        self.rejects(lambda: v.validate_native(self.f.row, self.f.source, raw, replay), "ambiguous_native_cue_onset")

    def test_fabricated_ordinal_and_incomplete_shared_scope(self):
        native = [segment(101, "16번부터 17번까지입니다.", .5, 1)]
        full = [segment(1, "16번부터 17번까지입니다.", 1.5, 2)]
        row = {**self.f.row, "cueNumber": 16, "sourceNumber": 16, "scopeQuestionNumbers": [16]}
        self.rejects(lambda: v.validate_scope(row, self.f.source, native, full), "native_spoken_scope_mismatch")
        row["scopeQuestionNumbers"] = [16, 17]
        v.validate_scope(row, self.f.source, native, full)
        row["cueNumber"] = 17
        self.rejects(lambda: v.validate_scope(row, self.f.source, native, full), "fabricated_cue_ordinal")

    def test_anchor_cannot_cross_into_next_true_passage(self):
        row = {**self.f.row, "anchorSegmentIds": [3]}
        self.rejects(lambda: v.full_asr_passage(v.index_segments(self.f.asr, 100), row), "anchor_outside_original_passage")

    def test_reconstructed_generated_index_mismatch_requires_grounding(self):
        source = {**self.f.source, "reconstructed": True}
        row = {**self.f.row, "sourceNumber": 19}
        index = v.index_segments(self.f.asr, 100)
        v.validate_mapping(row, source, self.f.question, index)
        row["anchorSegmentIds"] = [3]
        self.rejects(lambda: v.validate_mapping(row, source, self.f.question, index), "generated_index_mapping_without_grounding")

    def test_legacy_reconstructed_probe_cannot_bypass_v2_scope_and_native_identity(self):
        with tempfile.TemporaryDirectory() as folder:
            f = Fixture(folder, reconstructed=True)
            result = f.run()
        self.assertEqual(result["counts"]["outcomes"], {"held": 1})
        self.assertIn("reconstructed_requires_explicit_native_adapter_v2", result["records"][0]["reasons"])

    def test_order_uses_original_spoken_order_and_shared_passage_identity(self):
        def admitted(id, ordinal, start, scope=None, proof="same"):
            return {"status": "admitted", "sourceRecordId": "A", "questionId": id, "sourceNumber": 99 - ordinal,
                    "scopeQuestionNumbers": scope or [ordinal], "audioRange": {"startMs": start, "endMs": 100000}, "proofKey": proof}
        rows = [admitted("q2", 2, 3000), admitted("q1", 1, 1000)]
        self.assertFalse(v.check_order(rows))
        rows[0]["audioRange"]["startMs"] = 500
        self.assertTrue(v.check_order(rows))
        shared = [admitted("q16", 16, 1000, [16, 17]), admitted("q17", 17, 1000, [16, 17])]
        self.assertFalse(v.check_order(shared))
        shared[1]["proofKey"] = "another probe"
        self.assertIn("shared_passage_evidence_mismatch", v.check_order(shared)["q17"])

    def test_new_order_cannot_overrun_preserved_verified_start(self):
        rows = [{"status": "preserved", "sourceRecordId": "A", "questionId": "old", "sourceNumber": 1, "audioRange": {"startMs": 1000, "endMs": 100000}},
                {"status": "admitted", "sourceRecordId": "A", "questionId": "new", "sourceNumber": 2, "scopeQuestionNumbers": [2], "audioRange": {"startMs": 900, "endMs": 100000}, "proofKey": "probe"}]
        self.assertIn("start_order_conflicts_with_existing_verified", v.check_order(rows)["new"])

    def test_omitted_extra_and_duplicate_question_rows(self):
        result = self.f.run([])
        self.assertFalse(result["completeReplay"])
        self.assertEqual(result["records"][0]["status"], "held")
        self.assertTrue(any("omitted_question_row" in e for e in result["errors"]))

    def test_duplicate_question_rows_fail_completeness(self):
        result = self.f.run([self.f.row, self.f.row])
        self.assertFalse(result["completeReplay"])
        self.assertEqual(result["records"][0]["status"], "held")

    def test_extra_question_rows_fail_completeness(self):
        result = self.f.run([self.f.row, {**self.f.row, "questionId": "extra"}])
        self.assertFalse(result["completeReplay"])
        self.assertTrue(any("extra_question_row" in e for e in result["errors"]))

    def test_question_cutoff_end_is_rejected(self):
        self.f.row["seekEndMs"] = 3000
        result = self.f.run()
        self.assertIn("continuation_must_end_at_full_original", result["records"][0]["reasons"])

    def test_stale_queue_contract_fails_complete_replay(self):
        self.assertFalse(self.f.run(version=99)["completeReplay"])

    def test_boolean_contract_version_cannot_equal_integer_version_one(self):
        self.assertFalse(self.f.run(version=True)["completeReplay"])

    def test_boolean_cue_number_cannot_pass_canonical_spoken_scope(self):
        self.f.row["cueNumber"] = True
        cues = [segment(1, "1번입니다.", .5, 1)]
        with self.assertRaisesRegex(v.InvalidEvidence, "fabricated_cue_ordinal"):
            v.validate_scope(self.f.row, self.f.source, cues, cues)

    def test_immutable_output_refuses_overwrite(self):
        p = self.f.folder / "immutable.json"
        v.immutable_write(p, {"a": 1})
        with self.assertRaises(FileExistsError):
            v.immutable_write(p, {"a": 2})


class PreservationTests(unittest.TestCase):
    def test_exact_38_previous_verified_ranges_are_preserved(self):
        with tempfile.TemporaryDirectory() as folder:
            f = Fixture(folder, existing=38)
            expected = [q["audioRange"].copy() for q in f.source["questions"] if q["audioRange"]]
            result = f.run()
            self.assertEqual(result["counts"]["outcomes"], {"admitted": 1, "preserved": 38})
            self.assertEqual([r["audioRange"] for r in result["preservedExisting"]], expected)

    def test_attempted_existing_change_fails_certificate_and_keeps_exact38(self):
        with tempfile.TemporaryDirectory() as folder:
            f = Fixture(folder, existing=38)
            f.rows[-1]["seekStartMs"] += 1
            result = f.run()
            self.assertFalse(result["completeReplay"])
            self.assertEqual(len(result["preservedExisting"]), 38)
            self.assertEqual(result["preservedExisting"][-1]["audioRange"], f.source["questions"][-1]["audioRange"])


if __name__ == "__main__":
    unittest.main()
