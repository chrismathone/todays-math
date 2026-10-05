"""Explicit measured stationary-noise onset tier; original samples are unchanged."""
import hashlib
import math
import struct

import verifier as v


METHOD = "noise_floor_contrast_v1"
METHOD_ONE_SECOND = "noise_floor_contrast_1second_v1"


def dbfs(energy, window_frames):
    v.require(type(energy) in (int, float) and math.isfinite(energy) and energy > 0, "noise_baseline_zero_or_invalid_energy")
    return 10 * math.log10(energy / window_frames / 32768 ** 2)


def measure(replay, onset_frame, *, baseline_windows=100):
    """Reproduce one explicitly named original baseline without changing samples."""
    v.require(type(baseline_windows) is int and baseline_windows in (50, 100), "unsupported_noise_baseline_span")
    actual, energy = replay.actual, replay.energy
    wf = actual["windowFrames"]
    v.require(v.integer(onset_frame) and onset_frame % wf == 0, "noise_onset_off_native_grid")
    at = onset_frame // wf
    v.require(at >= baseline_windows and at + 5 <= len(energy), "noise_baseline_or_confirmation_overflow")
    baseline = energy[at - baseline_windows:at]
    levels = sorted(dbfs(e, wf) for e in baseline)
    median, p10, p90 = (levels[math.ceil(p * baseline_windows) - 1] for p in (.5, .1, .9))
    threshold = median + 10
    v.require(p90 - p10 <= 6, "noise_baseline_not_stationary")
    limit = wf * 32768 ** 2 * 10 ** (threshold / 10)
    v.require(all(e < limit for e in baseline), "noise_baseline_contains_prior_signal")
    v.require(energy[at] >= limit, "noise_onset_has_no_measured_contrast")
    v.require(sum(e >= limit for e in energy[at:at + 5]) >= 3, "noise_onset_is_isolated_transient")
    return {"baselineStartFrame": (at - baseline_windows) * wf, "baselineFrameCount": baseline_windows * wf,
            "baselineEnergySha256": hashlib.sha256(b"".join(struct.pack("<d", e) for e in baseline)).hexdigest(),
            "medianDbfs": median, "p10Dbfs": p10, "p90Dbfs": p90, "thresholdDbfs": threshold,
            "contrastDb": 10, "percentileMethod": "nearest_rank"}, limit


def verify(native, replay):
    method = native.get("onsetMethod")
    v.require(method in (METHOD, METHOD_ONE_SECOND), "unsupported_native_onset_method")
    claimed = native.get("noiseFloorEvidence")
    v.require(isinstance(claimed, dict), "missing_measured_noise_floor_evidence")
    actual, limit = measure(replay, native.get("onsetFrame"), baseline_windows=50 if method == METHOD_ONE_SECOND else 100)
    for key, expected in actual.items():
        supplied = claimed.get(key)
        if type(expected) is float:
            v.require(type(supplied) in (int, float) and math.isfinite(supplied) and abs(supplied - expected) < 1e-8, "noise_floor_stat_mismatch:" + key)
        else:
            v.require(type(supplied) is type(expected) and supplied == expected, "noise_floor_stat_mismatch:" + key)
    return limit
