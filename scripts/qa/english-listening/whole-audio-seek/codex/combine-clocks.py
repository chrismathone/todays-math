"""Combine the complete native MP3 replay with the measured converted exception."""
import argparse
import verifier as v


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inventory", required=True)
    parser.add_argument("--native", required=True)
    parser.add_argument("--converted", required=True)
    parser.add_argument("--output", required=True)
    a = parser.parse_args()
    inventory, native, converted = v.read(a.inventory), v.read(a.native), v.read(a.converted)
    v.require(native["inventorySha256"] == v.sha(a.inventory), "native_wrong_inventory")
    mapping = v.checked_ref(converted["convertedClockProof"])
    v.require(mapping["inventorySha256"] == v.sha(a.inventory) and mapping["status"] == "passed", "converted_wrong_inventory_or_not_passed")
    v.require(mapping["clock"]["sourceToPlaybackOffsetMs"] == 0 and mapping["clock"]["maxOffsetVariationMs"] == 0, "converted_clock_not_exactly_aligned")
    v.require(v.sha(mapping["original"]["path"]) == mapping["original"]["sha256"] == converted["sourceAudioSha256"], "converted_original_changed")
    v.require(v.sha(mapping["playback"]["path"]) == mapping["playback"]["sha256"] == converted["playbackSha256"], "converted_playback_changed")
    records = [converted if r["sourceRecordId"] == converted["sourceRecordId"] else r for r in native["records"]]
    v.require(len(records) == len(inventory["records"]) == 193 and all(r["status"] == "passed" for r in records), "native_clock_queue_incomplete")
    v.require({r["sourceRecordId"] for r in records} == {s["sourceRecordId"] for s in inventory["records"]}, "native_clock_source_set_mismatch")
    for r in records:
        s = next(s for s in inventory["records"] if s["sourceRecordId"] == r["sourceRecordId"])
        v.validate_clock(r, s, v.read(s["asrPath"]))
    result = {**native, "records": records, "sourceCount": len(records), "completeSourceClockReplay": True,
              "components": [v.reference(a.native), v.reference(a.converted), converted["convertedClockProof"]]}
    v.immutable_write(a.output, result)
    print({"sources": len(records), "passed": len(records), "output": a.output})


if __name__ == "__main__":
    main()
