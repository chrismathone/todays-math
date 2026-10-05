import copy
import hashlib
import struct
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

import claude_adapter as a
import verifier as v
from test_verifier import Fixture, segment


class NativeAdapterTests(unittest.TestCase):
    def test_two_second_pcm_transport_cannot_claim_33_second_anchor(self):
        probe = {"pcmLayout": "float32le-interleaved", "durationSeconds": 2,
                 "segments": [{"localEstimatedStartSeconds": 33.07, "rawEstimatedStartSeconds": 101.3, "rawEstimatedEndSeconds": 103.3}]}
        with self.assertRaisesRegex(v.InvalidEvidence, "raw_probe_estimate_or_anchor_overflow"):
            v.check_legacy_probe_transport(probe)

    def test_in_bounds_pcm_transport_is_not_new_bounded_recognition(self):
        probe = {"pcmLayout": "float32le-interleaved", "durationSeconds": 2,
                 "segments": [{"localEstimatedStartSeconds": .2, "rawEstimatedStartSeconds": 101.3, "rawEstimatedEndSeconds": 102.3}]}
        with self.assertRaisesRegex(v.InvalidEvidence, "copied_full_asr_estimates_are_not_native_cue_recognition"):
            v.check_legacy_probe_transport(probe)

    def test_korean_spelled_numbers_are_parsed_without_fabricated_order(self):
        for text, wanted in (("십팔 번입니다.", [18]), ("16번과 17번. 다음을 듣고", [16, 17]), ("이십번입니다", [20]), ("다음 대화는 3번 이야기", None)):
            self.assertEqual(a.leading_cue(text)[0], wanted)

    def test_raw_probe_segment_and_word_overflow_are_rejected(self):
        raw = {"durationSeconds": 14., "overflow": False, "segments": [segment(1, "1번입니다", 0, 1)]}
        s = raw["segments"][0]
        s.update(localStartSeconds=0, localEndSeconds=14.01, words=[])
        with self.assertRaisesRegex(v.InvalidEvidence, "raw_probe_segment_overflow"):
            a.probe_segments(raw)
        s["localEndSeconds"] = 1
        s["words"] = [{"text": "1번", "localStartSeconds": 0, "localEndSeconds": 15, "probability": .99}]
        with self.assertRaisesRegex(v.InvalidEvidence, "raw_probe_word_overflow"):
            a.probe_segments(raw)

    def test_energy_onset_400ms_quiet_lead_is_measured(self):
        wf = 960
        energy = [0] * 25 + [1e9] * 5
        replay = SimpleNamespace(actual={"sampleRate": 48000, "windowFrames": wf, "frameCount": 40 * wf}, energy=energy)
        native = {"startFrame": 5 * wf, "onsetFrame": 25 * wf, "quietBeforeFrames": 25 * wf, "leadPeakDbfs": None}
        a.measured_onset(native, replay)
        native["startFrame"] += 1
        with self.assertRaisesRegex(v.InvalidEvidence, "native_start_off_measured_window_grid"):
            a.measured_onset(native, replay)

    def test_quiet_lead_cannot_start_mid_previous_speech_or_music(self):
        wf = 960
        replay = SimpleNamespace(actual={"sampleRate": 48000, "windowFrames": wf, "frameCount": 40 * wf}, energy=[0] * 25 + [1e9] * 5)
        native = {"startFrame": 5 * wf, "onsetFrame": 25 * wf, "quietBeforeFrames": 25 * wf, "leadPeakDbfs": None}
        replay.energy[20] = 1e9
        with self.assertRaisesRegex(v.InvalidEvidence, "native_quiet_lead_mismatch|native_start_not_measured_quiet_lead"):
            a.measured_onset(native, replay)

    def test_short_bridge_quiet_uses_all_measured_lead_without_cut_end_proof(self):
        wf = 320
        replay = SimpleNamespace(actual={"sampleRate": 16000, "windowFrames": wf, "frameCount": 40 * wf}, energy=[1e8] * 20 + [0] * 5 + [1e8] * 15)
        native = {"startFrame": 20 * wf, "onsetFrame": 25 * wf, "quietBeforeFrames": 5 * wf, "leadPeakDbfs": None}
        a.measured_onset(native, replay)
        native["startFrame"] += wf
        with self.assertRaisesRegex(v.InvalidEvidence, "native_start_not_measured_quiet_lead"):
            a.measured_onset(native, replay)


class NativeProofFixture(Fixture):
    def __init__(self, folder, *, reconstructed=False):
        super().__init__(folder, reconstructed=reconstructed)
        instruction = "다음을 듣고 가장 적절한 것을 고르시오."
        self.question["prompt"] = instruction
        wf, rate = 320, 16000
        self.energy = [0] * 25 + [1e8] * 4975
        energy_path = self.folder / "energy.f64"
        energy_path.write_bytes(b"".join(struct.pack("<d", x) for x in self.energy))
        self.actual = {"sourceAudioSha256": self.source["sourceAudioSha256"], "playbackSha256": "playback-A",
                       "sampleRate": rate, "channels": 1, "frameCount": 1600000, "pcmSha256": "full-pcm",
                       "windowFrames": wf, "energySha256": v.sha(energy_path)}
        pcm = {"sampleRate": rate, "channels": 1, "frameCount": 1600000, "sha256": "full-pcm"}
        cache_path = self.folder / "native.json"
        self.write(cache_path, {"sourceRecordId": "source-A", "sourceAudioSha256": self.source["sourceAudioSha256"],
                               "pcm": pcm, "playback": {"sha256": "playback-A"}, "energy": {"sha256": v.sha(energy_path)}})
        self.raw = {"id": "native-1", "startFrame": 1600, "onsetFrame": 8000, "quietBeforeFrames": 8000,
                    "frameCount": 160000, "sampleRate": rate, "channels": 1, "durationSeconds": 10,
                    "clipPcmSha256": "clip-pcm", "inputMonoFloat32Sha256": "mono-pcm", "inputSampleCount": 160000,
                    "overflow": False, "segments": [{**segment(101, "1번입니다. " + instruction, .4, 2),
                                                      "localStartSeconds": .4, "localEndSeconds": 2, "words": []}]}
        self.request_path = self.folder / "request.json"
        self.write(self.request_path, {"sources": [{"sourceRecordId": "source-A", "sourceAudioSha256": self.source["sourceAudioSha256"], "probes": [self.raw]}]})
        self.container = {"sourceRecordId": "source-A", "sourceAudioSha256": self.source["sourceAudioSha256"],
                          "sourceAudioPath": self.source["sourceAudioPath"], "originalAudioModified": False, "humanReviewed": False,
                          "nativePcm": pcm, "requestPath": str(self.request_path), "requestSha256": v.sha(self.request_path), "probes": [self.raw]}
        self.row.update(kind="single", cueSpokenNumbers=[1], seekStartMs=100,
                        nativeEvidence={**{k: self.actual[k] for k in ("sampleRate", "channels", "frameCount", "pcmSha256")},
                                        "startFrame": 1600, "onsetFrame": 8000, "quietBeforeFrames": 8000, "leadPeakDbfs": None,
                                        "cachePath": str(cache_path), "cacheSha256": v.sha(cache_path), "energyPath": str(energy_path), "energySha256": v.sha(energy_path)})
        self.clock["decodedInterleavedInt16Sha256"] = "full-pcm"
        self.asr["segments"][0].update(text="1번입니다. " + instruction, estimatedStartSeconds=.4)
        self.write(self.asr_path, self.asr)
        self.source["asrSha256"] = self.row["asrSha256"] = v.sha(self.asr_path)
        self.alignment["asrSha256"] = self.source["asrSha256"]
        self.write(self.alignment_path, self.alignment)
        self.row["mappingEvidence"]["alignment"] = v.reference(self.alignment_path)
        self.refresh()
        self.source_replay = SimpleNamespace(actual=self.actual, energy=self.energy, replay=lambda p: {
            "clipPcmSha256": "clip-pcm", "inputMonoFloat32Sha256": "mono-pcm", "inputSampleCount": 160000})

    def refresh(self):
        self.write(self.probe_path, self.container)
        self.row["probeEvidence"] = {**v.reference(self.probe_path), "probeId": self.raw["id"],
                                     "segmentIds": [s["id"] for s in self.raw["segments"]],
                                     "text": " ".join(s["text"] for s in self.raw["segments"]), "inputMonoFloat32Sha256": self.raw["inputMonoFloat32Sha256"]}

    def validate(self):
        return a.validate(self.row, self.source, self.question, self.clock, self.source_replay, v.index_segments(self.asr, 100))


class FullNativeAdmissionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.f = NativeProofFixture(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def test_actual_shape_admits_number_instruction_without_dialogue_end(self):
        proof, raw, grade, identity = self.f.validate()
        self.assertEqual(grade, "numbered_instruction")
        self.assertEqual(raw[0]["localEndSeconds"], 2)
        self.assertEqual(proof["onsetFrame"], 8000)

    def test_copied_or_corrupt_recognition_input_cannot_pass_real_decode_hash(self):
        self.f.raw["inputMonoFloat32Sha256"] = "wrong-input"
        self.f.refresh()
        with self.assertRaisesRegex(v.InvalidEvidence, "bounded_native_probe_replay_hash:inputMonoFloat32Sha256"):
            self.f.validate()

    def test_raw_request_changed_bounds_cannot_pass_even_with_new_artifact_hash(self):
        self.f.raw["frameCount"] -= 1
        self.f.refresh()
        with self.assertRaisesRegex(v.InvalidEvidence, "raw_probe_request_bounds:frameCount"):
            self.f.validate()

    def test_converted_container_extra_native_measurements_match_actual_full_clock(self):
        self.f.actual["durationMs"] = 100000
        self.f.container["nativePcm"].update(durationMs=100000, energySha256=self.f.actual["energySha256"])
        self.f.refresh()
        self.assertEqual(self.f.validate()[2], "numbered_instruction")
        self.f.container["nativePcm"]["durationMs"] = 100001
        self.f.refresh()
        with self.assertRaisesRegex(v.InvalidEvidence, "raw_probe_native_clock_mismatch:durationMs"):
            self.f.validate()

    def test_extra_native_energy_claim_cannot_mask_wrong_source_energy(self):
        self.f.container["nativePcm"]["energySha256"] = "another_source"
        self.f.refresh()
        with self.assertRaisesRegex(v.InvalidEvidence, "raw_probe_native_clock_mismatch:energySha256"):
            self.f.validate()

    def test_unknown_and_duplicate_probe_segment_ids_are_rejected(self):
        for ids in ([999], [101, 101]):
            self.f.row["probeEvidence"]["segmentIds"] = ids
            with self.assertRaisesRegex(v.InvalidEvidence, "unknown_segment_id|duplicate_segment_ids"):
                self.f.validate()

    def test_boolean_scope_number_and_mono_channel_are_not_integer_evidence(self):
        self.f.row["scopeQuestionNumbers"] = [True]
        with self.assertRaisesRegex(v.InvalidEvidence, "bounded_current_question_scope_mismatch"):
            self.f.validate()
        self.f.row["scopeQuestionNumbers"] = [1]
        self.f.row["nativeEvidence"]["channels"] = True
        with self.assertRaisesRegex(v.InvalidEvidence, "native_replay_clock:channels"):
            self.f.validate()

    def test_boolean_heard_number_and_cue_number_are_not_ordinals(self):
        self.f.row["cueSpokenNumbers"] = [True]
        with self.assertRaisesRegex(v.InvalidEvidence, "invalid_declared_spoken_numbers"):
            self.f.validate()
        self.f.row["cueSpokenNumbers"] = [1]
        self.f.row["cueNumber"] = True
        with self.assertRaisesRegex(v.InvalidEvidence, "fabricated_cue_ordinal"):
            self.f.validate()

    def test_uncertain_native_cue_stays_held_without_explicit_official_alignment(self):
        self.f.raw["segments"][0]["avgLogProbability"] = -1.1
        self.f.refresh()
        with self.assertRaisesRegex(v.InvalidEvidence, "uncertain_raw_evidence"):
            self.f.validate()

    def test_reconstructed_generated_display_index_is_never_spoken_ordinal(self):
        f = self.f
        f.source["reconstructed"] = True
        f.question["sourceNumber"] = f.row["sourceNumber"] = 14
        self.assertEqual(f.validate()[2], "reconstructed_numbered_probe")
        f.row["cueSpokenNumbers"] = f.row["scopeQuestionNumbers"] = [14]
        f.row["cueNumber"] = 14
        with self.assertRaisesRegex(v.InvalidEvidence, "reconstructed_native_cue_uncertain_or_missing"):
            f.validate()

    def test_reconstructed_anchor_from_next_passage_stays_held(self):
        f = self.f
        f.source["reconstructed"] = True
        f.row["anchorSegmentIds"] = [2, 3]
        with self.assertRaisesRegex(v.InvalidEvidence, "anchor_outside_original_passage"):
            f.validate()

    def test_unique_native_number_cannot_bind_an_answer_option_far_from_original_cue(self):
        f = self.f; f.source["reconstructed"] = True
        f.asr["segments"][0]["estimatedStartSeconds"] = 1.5
        with self.assertRaisesRegex(v.InvalidEvidence, "native_original_cue_search_span_mismatch"):
            f.validate()

    def test_translated_original_heading_blocks_prior_anchor_assignment(self):
        f = self.f; f.source["reconstructed"] = True
        f.asr["segments"].insert(1, segment(4, "2. Listen to the conversation and choose a picture.", 2.1, 2.4))
        with self.assertRaisesRegex(v.InvalidEvidence, "anchor_outside_original_passage"):
            f.validate()

    def test_missing_original_neighbor_cannot_make_many_questions_share_previous_number(self):
        f = self.f; f.source["reconstructed"] = True
        f.asr["segments"][2]["text"] = "3번입니다."
        with self.assertRaisesRegex(v.InvalidEvidence, "original_neighbor_scope_unresolved_gap"):
            f.validate()

    def duplicate_raw_cue(self):
        f = self.f
        f.source["reconstructed"] = True
        f.asr["segments"][0]["estimatedStartSeconds"] = .4
        f.asr["segments"].append(segment(4, "1번입니다.", 60, 65))
        f.write(f.asr_path, f.asr)
        f.source["asrSha256"] = f.row["asrSha256"] = v.sha(f.asr_path)
        f.alignment["asrSha256"] = f.source["asrSha256"]
        f.write(f.alignment_path, f.alignment)
        f.row["mappingEvidence"]["alignment"] = v.reference(f.alignment_path)
        return f

    def test_duplicate_raw_ordinal_resolves_only_unique_exact_native_onset_span(self):
        f = self.duplicate_raw_cue()
        f.question["sourceNumber"] = f.row["sourceNumber"] = 14
        result = f.validate()
        self.assertEqual(result[2], "reconstructed_numbered_probe")
        self.assertEqual(result[0]["fullAsrCueEvidence"]["method"], "unique_native_onset_containment")
        self.assertEqual(result[0]["fullAsrCueEvidence"]["matchingSegmentIds"], [1, 4])

    def test_overlapping_duplicate_raw_cues_remain_ambiguous(self):
        f = self.duplicate_raw_cue()
        f.asr["segments"][-1].update(estimatedStartSeconds=.45, estimatedEndSeconds=1.9)
        f.asr["segments"].sort(key=lambda s: s["estimatedStartSeconds"])
        with self.assertRaisesRegex(v.InvalidEvidence, "duplicate_cue_not_uniquely_bound"):
            f.validate()

    def test_nearest_duplicate_raw_cue_cannot_substitute_for_exact_containment(self):
        f = self.duplicate_raw_cue()
        f.asr["segments"][0]["estimatedStartSeconds"] = .6
        with self.assertRaisesRegex(v.InvalidEvidence, "duplicate_cue_not_uniquely_bound"):
            f.validate()

    def test_correct_native_ordinal_cannot_select_wrong_duplicate_raw_passage(self):
        f = self.duplicate_raw_cue()
        f.row["cueSegmentIds"] = [4]
        with self.assertRaisesRegex(v.InvalidEvidence, "duplicate_cue_not_uniquely_bound"):
            f.validate()

    def test_official_reported_anchor_cannot_point_to_next_question(self):
        self.f.row["anchorSegmentIds"] = [2, 3]
        with self.assertRaisesRegex(v.InvalidEvidence, "anchor_outside_original_passage"):
            self.f.validate()

    def test_correct_native_cue_cannot_mask_wrong_reliable_full_asr_cue_id(self):
        self.f.row["cueSegmentIds"] = [3]
        with self.assertRaisesRegex(v.InvalidEvidence, "reported_full_asr_cue_mismatch"):
            self.f.validate()

    def test_reconstructed_source_grounding_cannot_be_omitted(self):
        f = self.f
        f.source["reconstructed"] = True
        f.row["mappingEvidence"] = {}
        with self.assertRaisesRegex(v.InvalidEvidence, "missing_immutable_reference"):
            f.validate()

    def official_alignment(self, *, uncertain_number=False, missing_number=False):
        f = self.f
        instruction = f.question["prompt"]
        dialogue = "Many people use these every day."
        text = f"1번 {instruction} M: {dialogue}"
        original = f.folder / "original.json"
        f.write(original, {"editableInput": {"groups": [{"transcript": {"text": text}}]}})
        f.write(f.prepared_path, {"originalPreparedPath": str(original), "originalPreparedSha256": v.sha(original)})
        if missing_number:
            f.raw["segments"] = [{**segment(101, instruction, .4, 2), "localStartSeconds": .4, "localEndSeconds": 2, "words": []}]
            instruction_ids = [101]
            f.row.update(cueForm="official_alignment", cueSpokenNumbers=[])
        elif uncertain_number:
            f.raw["segments"] = [{**segment(101, "1.", .4, .8, uncertain=True), "localStartSeconds": .4, "localEndSeconds": .8, "words": []},
                                 {**segment(102, instruction, .8, 2), "localStartSeconds": .8, "localEndSeconds": 2, "words": []}]
            instruction_ids = [102]
            f.row["cueForm"] = "bare"
        else:
            f.raw["segments"][0]["text"] = "1. " + instruction
            instruction_ids = [101]
            f.row["cueForm"] = "bare"
        f.raw["segments"].append({**segment(103, dialogue, 2, 3), "localStartSeconds": 2, "localEndSeconds": 3, "words": []})
        f.row["scriptEvidence"] = {"transcriptSha256": hashlib.sha256(text.encode()).hexdigest(),
                                  "sectionStartCharacter": 3, "sectionEndCharacter": len(text),
                                  "instructionQuote": instruction, "instructionStartCharacter": text.index(instruction),
                                  "instructionProbeSegmentIds": instruction_ids, "firstDialogueQuote": dialogue,
                                  "firstDialogueStartCharacter": text.index(dialogue), "dialogueProbeSegmentIds": [103]}
        f.refresh()
        return f, text

    def test_bare_number_requires_unique_actual_official_first_dialogue(self):
        f, _ = self.official_alignment()
        self.assertEqual(f.validate()[2], "official_alignment")
        f.row.pop("scriptEvidence")
        with self.assertRaisesRegex(v.InvalidEvidence, "ambiguous_cue_missing_official_alignment"):
            f.validate()

    def test_uncertain_number_can_resolve_only_reliable_instruction_and_first_dialogue(self):
        f, _ = self.official_alignment(uncertain_number=True)
        self.assertEqual(f.validate()[2], "official_alignment")
        f.raw["segments"][1]["uncertain"] = True
        f.refresh()
        with self.assertRaisesRegex(v.InvalidEvidence, "uncertain_raw_evidence"):
            f.validate()

    def test_missing_number_is_explicit_official_alignment_never_claimed_as_heard(self):
        f, _ = self.official_alignment(missing_number=True)
        self.assertEqual(f.validate()[2], "official_alignment")
        self.assertEqual(f.row["cueSpokenNumbers"], [])
        f.row["cueSpokenNumbers"] = [1]
        with self.assertRaisesRegex(v.InvalidEvidence, "bounded_spoken_ordinal_mismatch"):
            f.validate()

    def test_actual_first_dialogue_cannot_be_replaced_with_later_related_text(self):
        f, _ = self.official_alignment()
        f.row["scriptEvidence"]["firstDialogueQuote"] = "People use these every day."
        with self.assertRaisesRegex(v.InvalidEvidence, "official_alignment_is_not_first_dialogue"):
            f.validate()

    def test_printed_blank_answer_is_skipped_but_real_first_utterance_is_required(self):
        f, text = self.official_alignment()
        updated = text.replace("M: ", "Woman: _______________ M: ")
        original = f.folder / "original.json"
        f.write(original, {"editableInput": {"groups": [{"transcript": {"text": updated}}]}})
        f.write(f.prepared_path, {"originalPreparedPath": str(original), "originalPreparedSha256": v.sha(original)})
        proof = f.row["scriptEvidence"]
        proof.update(transcriptSha256=hashlib.sha256(updated.encode()).hexdigest(), sectionEndCharacter=len(updated),
                     firstDialogueStartCharacter=updated.index(proof["firstDialogueQuote"]))
        self.assertEqual(f.validate()[2], "official_alignment")
        updated = updated.replace("Woman: _______________", "Woman: Hello.")
        f.write(original, {"editableInput": {"groups": [{"transcript": {"text": updated}}]}})
        f.write(f.prepared_path, {"originalPreparedPath": str(original), "originalPreparedSha256": v.sha(original)})
        proof.update(transcriptSha256=hashlib.sha256(updated.encode()).hexdigest(), sectionEndCharacter=len(updated),
                     firstDialogueStartCharacter=updated.index(proof["firstDialogueQuote"]))
        with self.assertRaisesRegex(v.InvalidEvidence, "official_alignment_is_not_first_dialogue"):
            f.validate()

    def test_null_first_dialogue_is_a_specific_missing_evidence_diagnostic(self):
        f, _ = self.official_alignment()
        f.row["scriptEvidence"]["firstDialogueQuote"] = None
        with self.assertRaisesRegex(v.InvalidEvidence, "official_first_dialogue_quote_missing"):
            f.validate()

    def test_separate24second_first_dialogue_probe_preserves_exact_original_onset(self):
        f, _ = self.official_alignment()
        dialogue_text = f.row["scriptEvidence"]["firstDialogueQuote"]
        f.raw["segments"] = f.raw["segments"][:1]
        extended = {**f.raw, "id": "en-first", "purpose": "first_dialogue", "frameCount": 384000, "durationSeconds": 24,
                    "clipPcmSha256": "extended-clip", "inputMonoFloat32Sha256": "extended-mono", "inputSampleCount": 384000,
                    "segments": [{**segment(201, dialogue_text, 15, 16), "localStartSeconds": 15, "localEndSeconds": 16, "words": []}]}
        f.container["probes"] = [f.raw, extended]
        f.write(f.request_path, {"sources": [{"sourceRecordId": "source-A", "sourceAudioSha256": f.source["sourceAudioSha256"], "probes": [f.raw, extended]}]})
        f.container["requestSha256"] = v.sha(f.request_path)
        f.refresh()
        f.row["dialogueProbeEvidence"] = {**v.reference(f.probe_path), "probeId": "en-first", "segmentIds": [201],
                                           "text": dialogue_text, "inputMonoFloat32Sha256": "extended-mono"}
        f.row["scriptEvidence"]["dialogueProbeSegmentIds"] = [201]
        original_replay = f.source_replay.replay
        f.source_replay.replay = lambda p: {"clipPcmSha256": "extended-clip", "inputMonoFloat32Sha256": "extended-mono", "inputSampleCount": 384000} if p["id"] == "en-first" else original_replay(p)
        self.assertEqual(f.validate()[2], "official_alignment")
        extended["onsetFrame"] += 320
        f.refresh()
        f.row["dialogueProbeEvidence"].update(v.reference(f.probe_path))
        with self.assertRaisesRegex(v.InvalidEvidence, "raw_probe_request_bounds:onsetFrame|dialogue_probe_not_same_original_onset"):
            f.validate()

    def test_same_text_wrong_transcript_character_offset_is_rejected(self):
        f, _ = self.official_alignment()
        f.row["scriptEvidence"]["firstDialogueStartCharacter"] += 1
        with self.assertRaisesRegex(v.InvalidEvidence, "official_first_dialogue_offset_mismatch"):
            f.validate()

    def test_wrong_transcript_hash_and_source_question_marker_are_rejected(self):
        f, _ = self.official_alignment()
        f.row["scriptEvidence"]["transcriptSha256"] = "wrong-script"
        with self.assertRaisesRegex(v.InvalidEvidence, "official_transcript_text_hash_mismatch"):
            f.validate()
        f.row["scriptEvidence"].pop("transcriptSha256")
        f.row["scriptEvidence"]["sectionStartCharacter"] += 10
        with self.assertRaisesRegex(v.InvalidEvidence, "official_section_not_current_original_number"):
            f.validate()

    def test_reconstructed_shared_scope_requires_true_shared_passage_instruction(self):
        f = self.f
        f.source["reconstructed"] = True
        text = "1번과 2번. 다음 대화를 듣고 물음에 답하시오."
        f.asr["segments"][0]["text"] = text
        f.asr["segments"][2]["text"] = "3번입니다."
        f.raw["segments"][0]["text"] = text
        f.row.update(kind="shared_passage", cueSpokenNumbers=[1, 2], cueNumber=1, scopeQuestionNumbers=[1, 2])
        f.refresh()
        self.assertEqual(f.validate()[2], "reconstructed_numbered_probe")
        f.asr["segments"][0]["text"] = f.raw["segments"][0]["text"] = "1번과 2번. 다음 두 대화를 듣고 내용과 일치하는 것을 고르시오."
        f.refresh()
        with self.assertRaisesRegex(v.InvalidEvidence, "reconstructed_shared_passage_instruction_missing"):
            f.validate()

    def test_reconstructed_shared_instruction_has_separate_native_member_passage(self):
        f = self.f
        f.source["reconstructed"] = True
        text = "1번과 2번. 다음 두 대화를 듣고 내용과 일치하는 것을 고르시오."
        f.asr["segments"][0]["text"] = f.raw["segments"][0]["text"] = text
        f.row.update(kind="shared_instruction_head", cueSpokenNumbers=[1, 2], cueNumber=1, scopeQuestionNumbers=[1])
        f.refresh()
        self.assertEqual(f.validate()[2], "reconstructed_numbered_probe")
        f.asr["segments"][2]["text"] = "3번입니다."
        with self.assertRaisesRegex(v.InvalidEvidence, "shared_instruction_missing_separate_member_cue"):
            f.validate()


class OfficialAlignmentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.f = Fixture(self.temp.name)
        self.instruction = "다음을 듣고 무엇인지 가장 적절한 것을 고르시오."
        self.dialogue = "Many people use these every day."
        self.text = f"18번 {self.instruction} M: {self.dialogue}"
        original_path = Path(self.temp.name) / "original.json"
        self.f.write(original_path, {"editableInput": {"groups": [{"transcript": {"text": self.text}}]}})
        self.f.write(self.f.prepared_path, {"originalPreparedPath": str(original_path), "originalPreparedSha256": v.sha(original_path)})
        script_path = Path(self.temp.name) / "script.json"
        self.script = {"sourceAudioSha256": self.f.source["sourceAudioSha256"], "sourceRecordId": "source-A", "sourceTranscriptText": self.text,
                       "sections": [{"id": "source-18", "questionNumbers": [18], "utterances": [{"text": self.dialogue}]}]}
        self.f.write(script_path, self.script)
        self.script_path = script_path
        self.row = copy.deepcopy(self.f.row)
        self.row.update(sourceNumber=18, cueNumber=18, scopeQuestionNumbers=[18], startEvidence={"method": "official_alignment",
                        "script": v.reference(script_path), "originalPrepared": v.reference(original_path), "sectionId": "source-18",
                        "instructionQuote": self.instruction, "firstDialogueQuote": self.dialogue, "instructionProbeSegmentIds": [102], "dialogueProbeSegmentIds": [103]})
        self.index = {101: segment(101, "불분명한 번호", .5, 1, uncertain=True),
                      102: segment(102, self.instruction, 1, 2), 103: segment(103, self.dialogue, 2, 3)}

    def tearDown(self):
        self.temp.cleanup()

    def test_missing_numeral_resolves_only_unique_official_instruction_first_dialogue(self):
        self.assertEqual(v.validate_official_alignment(self.row, self.f.source, self.index, {}), [18])

    def test_reliable_contradictory_numeral_cannot_be_nearest_number_repaired(self):
        self.index[101]["text"] = "17번입니다"
        with self.assertRaisesRegex(v.InvalidEvidence, "contradictory_spoken_numeral"):
            v.validate_official_alignment(self.row, self.f.source, self.index, {})


    def test_first_dialogue_cannot_be_later_related_quote(self):
        self.row["startEvidence"]["firstDialogueQuote"] = "Other people often use these at work."
        with self.assertRaisesRegex(v.InvalidEvidence, "not_first_official_dialogue"):
            v.validate_official_alignment(self.row, self.f.source, self.index, {})

    def test_fabricated_section_cannot_relabel_another_original_questions_first_dialogue(self):
        other = "Other people use these at work every day."
        updated = self.text + " 19번 다른 문제의 지시문입니다. M: " + other
        original_path = Path(self.temp.name) / "original.json"
        self.f.write(original_path, {"editableInput": {"groups": [{"transcript": {"text": updated}}]}})
        self.f.write(self.f.prepared_path, {"originalPreparedPath": str(original_path), "originalPreparedSha256": v.sha(original_path)})
        self.script.update(sourceTranscriptText=updated)
        self.script["sections"][0]["utterances"][0]["text"] = other
        self.f.write(self.script_path, self.script)
        self.row["startEvidence"].update(script=v.reference(self.script_path), originalPrepared=v.reference(original_path), firstDialogueQuote=other)
        self.index[103]["text"] = other
        with self.assertRaisesRegex(v.InvalidEvidence, "not_first_official_dialogue"):
            v.validate_official_alignment(self.row, self.f.source, self.index, {})

    def test_untrusted_script_section_cannot_add_a_false_shared_question_scope(self):
        self.script["sections"][0]["questionNumbers"] = [18, 19]
        self.f.write(self.script_path, self.script)
        self.row["startEvidence"]["script"] = v.reference(self.script_path)
        self.row["scopeQuestionNumbers"] = [18, 19]
        with self.assertRaisesRegex(v.InvalidEvidence, "official_section_shared_scope_without_original_instruction"):
            v.validate_official_alignment(self.row, self.f.source, self.index, {})

    def test_uncertain_instruction_does_not_resolve_uncertain_numeral(self):
        self.index[102]["uncertain"] = True
        with self.assertRaisesRegex(v.InvalidEvidence, "uncertain_raw_evidence"):
            v.validate_official_alignment(self.row, self.f.source, self.index, {})

    def test_script_source_swap_is_rejected(self):
        self.script["sourceAudioSha256"] = "another source"
        self.f.write(self.script_path, self.script)
        self.row["startEvidence"]["script"] = v.reference(self.script_path)
        with self.assertRaisesRegex(v.InvalidEvidence, "official_script_wrong_source"):
            v.validate_official_alignment(self.row, self.f.source, self.index, {})


class OrdinalOnlyTests(unittest.TestCase):
    def test_original_official_pdf_and_current_question_identity_are_required(self):
        with tempfile.TemporaryDirectory() as folder:
            f = Fixture(folder)
            pdf = Path(folder) / "original-questions.pdf"
            pdf.write_bytes(b"original question file fixture")
            digest = v.sha(pdf)
            original = Path(folder) / "original.json"
            f.write(original, {"sourceFiles": [{"kind": "questions", "path": str(pdf), "sha256": digest}]})
            f.write(f.prepared_path, {"sourceQuestionPdfSha256": digest, "originalPreparedPath": str(original), "originalPreparedSha256": v.sha(original),
                                     "questions": [{"questionId": f.question["id"], "sourceNumber": 1}]})
            f.question["metadata"].update(origin="official_original", sourceNumber=1, sourceQuestionSha256=digest)
            proof = a.original_question_identity(f.source, f.question)
            self.assertEqual(proof["questionFile"]["sha256"], digest)
            pdf.write_bytes(b"wrong question file")
            with self.assertRaisesRegex(v.InvalidEvidence, "official_original_question_file_corruption"):
                a.original_question_identity(f.source, f.question)

    def test_ordinal_only_missing_source_neighbor_stays_held(self):
        source = {"sourceRecordId": "A", "questions": [{"sourceNumber": 1}, {"sourceNumber": 2}]}
        rows = [{"sourceRecordId": "A", "questionId": "q1", "status": "admitted", "scopeQuestionNumbers": [1], "evidenceGrade": "ordinal_only"},
                {"sourceRecordId": "A", "questionId": "q2", "status": "held"}]
        self.assertIn("ordinal_only_complete_source_chronology_missing", v.check_ordinal_chronology(rows, [source])["q1"])
        rows[1].update(status="admitted", scopeQuestionNumbers=[2], evidenceGrade="numbered_instruction")
        self.assertFalse(v.check_ordinal_chronology(rows, [source]))

    def test_shared_scope_covers_true_original_neighbors_without_extra_dialogue_end(self):
        source = {"sourceRecordId": "A", "questions": [{"sourceNumber": 16}, {"sourceNumber": 17}]}
        rows = [{"sourceRecordId": "A", "questionId": "q16", "status": "admitted", "scopeQuestionNumbers": [16, 17], "evidenceGrade": "ordinal_only"},
                {"sourceRecordId": "A", "questionId": "q17", "status": "admitted", "scopeQuestionNumbers": [16, 17], "evidenceGrade": "ordinal_only"}]
        self.assertFalse(v.check_ordinal_chronology(rows, [source]))

if __name__ == "__main__":
    unittest.main()
