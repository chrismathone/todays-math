import copy
import struct
import tempfile
import unittest

import noise_floor as n
import verifier as v
from test_adapters import NativeProofFixture


class NoiseFloorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.f = NativeProofFixture(self.temp.name, reconstructed=True)
        f = self.f
        f.question["sourceNumber"] = f.row["sourceNumber"] = 14
        wf = f.actual["windowFrames"]
        self.hiss = wf * 32768 ** 2 * 10 ** (-46 / 10)
        self.voice = wf * 32768 ** 2 * 10 ** (-8 / 10)
        f.energy = [self.hiss] * 5000
        f.energy[125:130] = [self.voice] * 5
        f.source_replay.energy = f.energy
        native = f.row["nativeEvidence"]
        native.update(startFrame=105 * wf, onsetFrame=125 * wf, quietBeforeFrames=125 * wf,
                      onsetMethod=n.METHOD, leadPeakDbfs=-46.)
        stats, _ = n.measure(f.source_replay, native["onsetFrame"])
        native["noiseFloorEvidence"] = stats
        f.raw.update(startFrame=native["startFrame"], onsetFrame=native["onsetFrame"], quietBeforeFrames=native["quietBeforeFrames"])
        f.row["seekStartMs"] = 2100
        f.write(f.request_path, {"sources": [{"sourceRecordId": "source-A", "sourceAudioSha256": f.source["sourceAudioSha256"], "probes": [f.raw]}]})
        f.container["requestSha256"] = v.sha(f.request_path)
        energy_path = native["energyPath"]
        from pathlib import Path
        Path(energy_path).write_bytes(b"".join(struct.pack("<d", x) for x in f.energy))
        native["energySha256"] = f.actual["energySha256"] = v.sha(energy_path)
        cache = v.read(native["cachePath"])
        cache["energy"]["sha256"] = native["energySha256"]
        f.write(native["cachePath"], cache)
        native["cacheSha256"] = v.sha(native["cachePath"])
        f.refresh()

    def tearDown(self):
        self.temp.cleanup()

    def test_stationary_hiss_native_number_does_not_require_absolute_quiet_cut(self):
        self.assertEqual(self.f.validate()[2], "reconstructed_numbered_probe")
        self.f.row["nativeEvidence"].pop("onsetMethod")
        with self.assertRaisesRegex(v.InvalidEvidence, "native_quiet_lead_mismatch"):
            self.f.validate()

    def test_noise_threshold_alone_cannot_admit_wrong_or_missing_ordinal(self):
        self.f.row["cueSpokenNumbers"] = self.f.row["scopeQuestionNumbers"] = [2]
        self.f.row["cueNumber"] = 2
        with self.assertRaisesRegex(v.InvalidEvidence, "reconstructed_native_cue_uncertain_or_missing"):
            self.f.validate()
        self.f.raw["segments"][0]["text"] = "I love winter very much."
        self.f.refresh()
        with self.assertRaisesRegex(v.InvalidEvidence, "reconstructed_native_cue_uncertain_or_missing"):
            self.f.validate()

    def test_varying_music_baseline_is_not_stationary_hiss(self):
        self.f.energy[25:75] = [self.hiss * 10] * 50
        with self.assertRaisesRegex(v.InvalidEvidence, "noise_baseline_not_stationary"):
            n.measure(self.f.source_replay, self.f.row["nativeEvidence"]["onsetFrame"])

    def test_previous_speech_in_baseline_is_not_silently_ignored(self):
        self.f.energy[90] = self.voice
        with self.assertRaisesRegex(v.InvalidEvidence, "noise_baseline_contains_prior_signal"):
            n.measure(self.f.source_replay, self.f.row["nativeEvidence"]["onsetFrame"])

    def test_isolated_40ms_click_is_not_a_persistent_voice_onset(self):
        self.f.energy[127:130] = [self.hiss] * 3
        with self.assertRaisesRegex(v.InvalidEvidence, "noise_onset_is_isolated_transient"):
            n.measure(self.f.source_replay, self.f.row["nativeEvidence"]["onsetFrame"])

    def test_source_specific_threshold_and_span_hash_cannot_be_forged(self):
        native = self.f.row["nativeEvidence"]
        original = copy.deepcopy(native["noiseFloorEvidence"])
        for key, wrong in (("thresholdDbfs", -50), ("baselineEnergySha256", "invented"), ("baselineStartFrame", 0), ("contrastDb", True)):
            native["noiseFloorEvidence"] = {**original, key: wrong}
            with self.assertRaisesRegex(v.InvalidEvidence, "noise_floor_stat_mismatch:" + key):
                n.verify(native, self.f.source_replay)

    def test_silence_or_overflow_cannot_fabricate_a_noise_floor(self):
        with self.assertRaisesRegex(v.InvalidEvidence, "noise_baseline_or_confirmation_overflow"):
            n.measure(self.f.source_replay, 0)
        self.f.energy[40] = 0
        with self.assertRaisesRegex(v.InvalidEvidence, "noise_baseline_zero_or_invalid_energy"):
            n.measure(self.f.source_replay, self.f.row["nativeEvidence"]["onsetFrame"])

    def test_raw_number_estimate_must_correspond_to_measured_contrast_onset(self):
        segment = self.f.raw["segments"][0]
        segment["localStartSeconds"] = segment["estimatedStartSeconds"] = 1.2
        self.f.refresh()
        with self.assertRaisesRegex(v.InvalidEvidence, "noise_onset_raw_cue_correspondence_missing"):
            self.f.validate()

    def test_named_one_second_baseline_excludes_prior_intro_without_changing_two_second_gate(self):
        self.f.energy[50] = self.voice
        onset = self.f.row["nativeEvidence"]["onsetFrame"]
        with self.assertRaisesRegex(v.InvalidEvidence, "noise_baseline_contains_prior_signal"):
            n.measure(self.f.source_replay, onset)
        proof, limit = n.measure(self.f.source_replay, onset, baseline_windows=50)
        native = {"onsetMethod": n.METHOD_ONE_SECOND, "onsetFrame": onset, "noiseFloorEvidence": proof}
        self.assertEqual(n.verify(native, self.f.source_replay), limit)
        self.assertEqual(proof["baselineFrameCount"], 50 * self.f.actual["windowFrames"])

    def test_one_second_method_cannot_reuse_two_second_span_hash(self):
        native = copy.deepcopy(self.f.row["nativeEvidence"])
        native["onsetMethod"] = n.METHOD_ONE_SECOND
        with self.assertRaisesRegex(v.InvalidEvidence, "noise_floor_stat_mismatch:baselineStartFrame"):
            n.verify(native, self.f.source_replay)

    def test_one_second_span_rejects_prior_speech_inside_its_actual_baseline(self):
        self.f.energy[90] = self.voice
        with self.assertRaisesRegex(v.InvalidEvidence, "noise_baseline_contains_prior_signal"):
            n.measure(self.f.source_replay, self.f.row["nativeEvidence"]["onsetFrame"], baseline_windows=50)

    def test_arbitrary_short_noise_baseline_and_isolated_click_are_rejected(self):
        onset = self.f.row["nativeEvidence"]["onsetFrame"]
        with self.assertRaisesRegex(v.InvalidEvidence, "unsupported_noise_baseline_span"):
            n.measure(self.f.source_replay, onset, baseline_windows=10)
        self.f.energy[127:130] = [self.hiss] * 3
        with self.assertRaisesRegex(v.InvalidEvidence, "noise_onset_is_isolated_transient"):
            n.measure(self.f.source_replay, onset, baseline_windows=50)


if __name__ == "__main__":
    unittest.main()
