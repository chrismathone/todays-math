"""Measure the single existing converted playback clock against its actual MP4."""
import argparse
import hashlib
from pathlib import Path

import verifier as v


def alignment(source, playback, sample_rate=16000):
    """Independent local normalized cross-correlation at many whole-source positions."""
    import numpy as np
    from faster_whisper.audio import decode_audio
    original = decode_audio(str(source), sampling_rate=sample_rate)
    proxy = decode_audio(str(playback), sampling_rate=sample_rate)
    window, radius = 8 * sample_rate, 2 * sample_rate
    v.require(abs(len(original) - len(proxy)) <= sample_rate // 20, "converted_duration_drift")
    measurements = []
    for fraction in (.02, .14, .26, .38, .50, .62, .74, .86, .97):
        start = int(fraction * (len(original) - window))
        target_start = max(0, start - radius)
        target_end = min(len(proxy), start + window + radius)
        x = original[start:start + window].astype(np.float64)
        x -= x.mean()
        y = proxy[target_start:target_end].astype(np.float64)
        xx = float(np.dot(x, x))
        v.require(xx > .0001, "converted_alignment_silent_landmark")
        size = 1 << (len(y) + len(x) - 1).bit_length()
        convolution = np.fft.irfft(np.fft.rfft(y, size) * np.fft.rfft(x[::-1], size), size)
        dot = convolution[len(x) - 1:len(y)]
        cumsum = np.concatenate(([0.0], np.cumsum(y)))
        squared = np.concatenate(([0.0], np.cumsum(y * y)))
        sums = cumsum[len(x):] - cumsum[:-len(x)]
        variance = squared[len(x):] - squared[:-len(x)] - sums * sums / len(x)
        scores = dot / np.sqrt(np.maximum(variance * xx, 1e-30))
        best = int(scores.argmax())
        coefficient = float(scores[best])
        offset = target_start + best - start
        v.require(coefficient >= .995, "converted_alignment_not_identical_content")
        # Exclude the adjacent correlation peak; another distant peak is ambiguity.
        competitors = scores.copy()
        competitors[max(0, best - 160):best + 161] = -1
        second = float(competitors.max())
        v.require(coefficient - second >= .05, "converted_alignment_not_unique")
        measurements.append({"sourceFrameAt16000": start, "playbackMinusSourceFramesAt16000": offset,
                             "windowFramesAt16000": window, "correlation": coefficient, "nextDistantCorrelation": second})
    offsets = [m["playbackMinusSourceFramesAt16000"] for m in measurements]
    v.require(max(offsets) - min(offsets) <= 16, "converted_clock_offset_changes_over_source")
    return {"sampleRate": sample_rate, "sourceFrameCount": len(original), "playbackFrameCount": len(proxy),
            "sourceToPlaybackOffsetMs": sum(offsets) / len(offsets) * 1000 / sample_rate,
            "maxOffsetVariationMs": (max(offsets) - min(offsets)) * 1000 / sample_rate,
            "sourceDecodedMonoFloat32Sha256": hashlib.sha256(original.tobytes()).hexdigest(),
            "playbackDecodedMonoFloat32Sha256": hashlib.sha256(proxy.tobytes()).hexdigest(), "landmarks": measurements}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--inventory", required=True)
    p.add_argument("--receipt", required=True)
    p.add_argument("--output", required=True)
    args = p.parse_args()
    inventory = v.read(args.inventory)
    receipt = v.read(args.receipt)
    source = next(s for s in inventory["records"] if s["sourceRecordId"] == receipt["sourceRecordId"])
    playback = Path(inventory["root"]) / receipt["playbackPath"]
    v.require(v.sha(playback) == receipt["playbackSha256"] == source["audio"]["sha256"], "converted_existing_playback_hash_mismatch")
    v.require(v.sha(source["sourceAudioPath"]) == receipt["sourceAudioSha256"] == source["sourceAudioSha256"], "converted_original_hash_mismatch")
    result = {"schemaVersion": 1, "sourceRecordId": source["sourceRecordId"], "inventorySha256": v.sha(args.inventory),
              "original": v.reference(source["sourceAudioPath"]), "playback": v.reference(playback), "receipt": v.reference(args.receipt),
              "method": "nine independent 8-second whole-source normalized cross-correlation landmarks; no assumed zero offset",
              "writesMedia": False, "writesDatabase": False, "writesStorage": False}
    try:
        result.update(status="passed", clock=alignment(source["sourceAudioPath"], playback))
    except (v.InvalidEvidence, ValueError, OSError) as e:
        result.update(status="held", reasons=[str(e)])
    v.immutable_write(args.output, result)
    print({"status": result["status"], "clock": result.get("clock", {}).get("sourceToPlaybackOffsetMs"), "output": args.output})


if __name__ == "__main__":
    main()
