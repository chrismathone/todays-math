"""Read-only frozen-anchor mapping audit; structural support never admits a start."""
from __future__ import annotations

import argparse
import collections
import re
from pathlib import Path

import claude_adapter as a
import verifier as v


JOINT = r"물음에\s*답하|두\s*물음|두\s*질문"


def boundaries(index):
    """Use immutable array order, retaining unresolved/uncertain cue barriers."""
    return a.original_scope_boundaries(index)


def passage_mapping(source, question, alignment, index):
    v.require(source["reconstructed"], "mapping_audit_requires_reconstructed_source")
    v.require(alignment.get("sourceRecordId") == source["sourceRecordId"]
              and alignment.get("sourceAudioSha256") == source["sourceAudioSha256"]
              and alignment.get("asrSha256") == source["asrSha256"], "mapping_wrong_source")
    matches = [c for c in alignment.get("candidates", []) if c.get("questionId") == question["id"]]
    v.require(len(matches) == 1 and matches[0].get("method") == "verified_generation_evidence_segments", "missing_current_question_source_grounding")
    ids = matches[0].get("sourceSegmentIds")
    anchors = v.select_segments(index, ids)
    positions = {sid: i for i, sid in enumerate(index)}
    selected_positions = [positions[s["id"]] for s in anchors]
    cue_bounds = boundaries(index)
    containing = []
    for i, cue in enumerate(cue_bounds):
        stop = cue_bounds[i + 1]["position"] if i + 1 < len(cue_bounds) else len(index)
        if all(cue["position"] <= p < stop for p in selected_positions):
            containing.append((i, cue, stop))
    v.require(len(containing) == 1, "anchors_outside_one_numbered_passage")
    ci, cue, stop = containing[0]
    spoken = cue["spoken"]
    v.require(spoken is not None, "original_cue_number_unresolved")
    v.require(not v.uncertain(cue["segment"]), "original_raw_cue_uncertain")
    following = cue_bounds[ci + 1] if ci + 1 < len(cue_bounds) else None
    if len(spoken) == 1:
        kind, scope = "single", spoken
    else:
        v.require(len(spoken) == 2 and spoken[1] == spoken[0] + 1, "nonconsecutive_original_spoken_scope")
        if re.search(JOINT, cue["segment"]["text"]):
            kind, scope = "shared_passage", spoken
        else:
            v.require(following and following["spoken"] == [spoken[1]]
                      and not v.uncertain(following["segment"]), "shared_instruction_missing_separate_member_cue")
            kind, scope = "shared_instruction_head", [spoken[0]]
    _, _, _, instruction_context = a.original_scope_context(index, cue["segment"]["id"], scope, kind)
    cue_start = v.segment_bounds(cue["segment"])[0]
    next_start = v.segment_bounds(following["segment"])[0] if following else None
    # Array identity determines membership; reject contradictory raw time order.
    v.require(all(cue_start <= v.segment_bounds(s)[0]
                  and (next_start is None or v.segment_bounds(s)[0] < next_start) for s in anchors), "anchor_raw_time_order_conflicts_with_passage")
    return {"kind": kind, "cueNumber": scope[0], "cueSpokenNumbers": spoken,
            "scopeQuestionNumbers": scope, "cueSegmentIds": [cue["segment"]["id"]],
            "cueText": cue["segment"]["text"], "anchorSegmentIds": ids,
            "anchorText": " ".join(s["text"] for s in anchors),
            "anchorArrayPositions": selected_positions, "cueArrayPosition": cue["position"],
            "nextCueArrayPosition": stop if following else None,
            "nextCueSegmentId": following["segment"]["id"] if following else None,
            "rawEstimatedCueStartSeconds": cue_start,
            "rawEstimatedCueEndSeconds": v.segment_bounds(cue["segment"])[1],
            "rawEstimatedNextCueStartSeconds": next_start,
            "scopeBoundaryContract": "original_instruction_neighbors_v2", "instructionContext": instruction_context,
            "mappingEvidence": {"alignment": v.reference(source["alignmentPath"]),
                                "questionId": question["id"], "sourceSegmentIds": ids,
                                "method": "verified_generation_evidence_segments"}}


def native_support(container, probe, request_source, source, clock, index):
    """Check exact request identity/raw bounds only; CPU source replay is still required."""
    v.require(container.get("sourceRecordId") == request_source.get("sourceRecordId") == source["sourceRecordId"], "native_probe_wrong_source_id")
    v.require(container.get("sourceAudioSha256") == request_source.get("sourceAudioSha256") == source["sourceAudioSha256"], "native_probe_wrong_source_hash")
    v.require(Path(container.get("sourceAudioPath", "")).resolve() == Path(source["sourceAudioPath"]).resolve(), "native_probe_wrong_source_path")
    pcm = container.get("nativePcm", {})
    for key in ("sampleRate", "channels", "frameCount"):
        v.require(v.integer(pcm.get(key)) and pcm[key] == clock[key], "native_probe_clock_mismatch:" + key)
    v.require(pcm.get("sha256") == clock["decodedInterleavedInt16Sha256"], "native_probe_pcm_hash_mismatch")
    requested = [p for p in request_source.get("probes", []) if p.get("id") == probe.get("id")]
    v.require(len(requested) == 1, "native_probe_missing_unique_request")
    v.require(requested[0].get("purpose") in (None, probe.get("purpose")), "native_probe_request_purpose_mismatch")
    for key in ("startFrame", "frameCount", "onsetFrame", "quietBeforeFrames"):
        v.require(v.integer(probe.get(key)) and probe[key] == requested[0].get(key), "native_probe_request_mismatch:" + key)
    rate, start, count = pcm["sampleRate"], probe["startFrame"], probe["frameCount"]
    v.require(all(v.integer(probe.get(key)) and probe[key] == pcm[key] for key in ("sampleRate", "channels")), "native_probe_local_clock_mismatch")
    v.require(0 <= start < start + count <= pcm["frameCount"] and count <= 14 * rate, "native_probe_overflow")
    v.require(start <= probe["onsetFrame"] < start + count, "native_probe_onset_overflow")
    raw = a.probe_segments(probe)
    first = next(iter(raw.values()))
    v.require(not v.uncertain(first) and first["estimatedStartSeconds"] <= 2, "native_cue_uncertain_or_not_opening")
    if probe.get("purpose") in ("noise_floor_contrast_v1", "noise_floor_contrast_1second_v1"):
        relative_onset = (probe["onsetFrame"] - start) / rate
        v.require(first["estimatedStartSeconds"] - .5 <= relative_onset <= first["estimatedEndSeconds"], "noise_onset_raw_cue_correspondence_missing")
    spoken, _ = a.leading_cue(first["text"])
    v.require(spoken is not None, "native_spoken_number_missing")
    cue_id = probe.get("asrSegmentId", requested[0].get("asrSegmentId"))
    v.require(v.integer(cue_id) and cue_id in index, "native_request_missing_original_cue_id")
    v.require(requested[0].get("asrSegmentId") in (None, cue_id), "native_probe_request_cue_identity_mismatch")
    cue = index[cue_id]
    v.require(not v.uncertain(cue) and a.leading_cue(cue["text"])[0] == spoken, "native_and_requested_original_cue_mismatch")
    matching = [s for s in index.values() if a.leading_cue(s["text"])[0] == spoken and not v.uncertain(s)]
    if len(matching) > 1:
        onset = probe["onsetFrame"] / rate
        containing = [s for s in matching if v.segment_bounds(s)[0] <= onset <= v.segment_bounds(s)[1]]
        v.require(len(containing) == 1 and containing[0]["id"] == cue_id, "duplicate_original_cue_not_uniquely_bound_to_native_onset")
    else:
        onset = probe["onsetFrame"] / rate
        v.require(v.segment_bounds(cue)[0] <= onset <= v.segment_bounds(cue)[1], "native_original_cue_search_span_mismatch")
    v.require(probe.get("inputSampleRate") == 16000 and v.integer(probe.get("inputSampleCount"))
              and probe["inputSampleCount"] > 0, "invalid_native_recognizer_input_clock")
    for key in ("clipPcmSha256", "inputMonoFloat32Sha256"):
        v.require(isinstance(probe.get(key), str) and re.fullmatch(r"[0-9a-f]{64}", probe[key]), "missing_native_input_hash:" + key)
    return {"cueSegmentId": cue_id, "spokenNumbers": spoken, "probeId": probe["id"],
            "startFrame": start, "onsetFrame": probe["onsetFrame"], "sampleRate": rate,
            "seekStartMs": start * 1000 // rate, "segmentIds": [first["id"]], "text": first["text"],
            "clipPcmSha256": probe["clipPcmSha256"], "inputMonoFloat32Sha256": probe["inputMonoFloat32Sha256"],
            "purpose": probe.get("purpose"), "independentSourceDecodeRequired": True}


def compare_proposal(row, mapping, source, question):
    v.validate_identity(row, source, question)
    for key in ("cueNumber", "cueSpokenNumbers", "scopeQuestionNumbers", "cueSegmentIds", "anchorSegmentIds"):
        if row.get(key) not in (None, []):
            v.require(row[key] == mapping[key], "proposal_wrong_original_mapping:" + key)
    if row.get("mappingEvidence"):
        v.validate_mapping(row, source, question, v.index_segments(v.read(source["asrPath"]), source["audio"]["durationMs"] / 1000))


def run(inventory_path, clock_path, frozen_path, probes_root, proposal_paths, output):
    inputs = {"inventory": v.reference(inventory_path), "clock": v.reference(clock_path), "frozen": v.reference(frozen_path)}
    implementation = [v.reference(p) for p in sorted(Path(__file__).parent.iterdir()) if p.suffix in (".py", ".mts", ".md")]
    inventory = v.checked_ref(inputs["inventory"])
    inputs["liveSnapshot"] = {"path": inventory["liveSnapshotPath"], "sha256": inventory["liveSnapshotSha256"]}
    snapshot_rows = v.checked_ref(inputs["liveSnapshot"])["snapshots"]
    snapshots = {s["id"]: s for s in snapshot_rows}
    v.require(len(snapshots) == len(snapshot_rows), "duplicate_frozen_document")
    clocks_doc, frozen_doc = v.checked_ref(inputs["clock"]), v.checked_ref(inputs["frozen"])
    v.require(clocks_doc["inventorySha256"] == inputs["inventory"]["sha256"], "clock_wrong_inventory")
    clocks = {s["sourceRecordId"]: s for s in clocks_doc["records"]}
    frozen = {s["sourceRecordId"]: s for s in frozen_doc["records"]}
    sources = {s["sourceRecordId"]: s for s in inventory["records"] if s["reconstructed"]}
    indexes, alignments = {}, {}
    for sid, source in sources.items():
        snap = snapshots.get(source["setId"])
        v.require(snap and snap["revision"] == source["revision"], "stale_frozen_revision")
        groups = snap["document"]["groups"]
        v.require(len(groups) == 1 and groups[0]["id"] == source["groupId"] and groups[0]["audio"] == source["audio"], "wrong_whole_original_group")
        live_questions = {q["id"]: q for q in groups[0]["questions"]}
        v.require(set(live_questions) == {q["id"] for q in source["questions"]}, "frozen_question_identity_mismatch")
        for q in source["questions"]:
            v.require(all(live_questions[q["id"]].get(k) == q.get(k) for k in ("sourceNumber", "prompt", "evidence", "metadata", "audioRange")), "frozen_current_question_content_mismatch")
        v.validate_frozen_source(source, frozen[sid])
        asr = v.checked_ref({"path": source["asrPath"], "sha256": source["asrSha256"]})
        indexes[sid] = v.index_segments(asr, v.validate_clock(clocks[sid], source, asr))
        alignments[sid] = v.checked_ref(frozen[sid]["files"]["alignment"])
    proposals = []
    for path in proposal_paths:
        ref = v.reference(path); inputs["proposal:" + str(len(proposals))] = ref
        doc = v.checked_ref(ref)
        v.require(doc.get("inventorySha256") == inputs["inventory"]["sha256"], "proposal_wrong_inventory")
        proposals.append((ref, {(r["sourceRecordId"], r["questionId"]): r for r in doc["records"]}))
    support, probe_diagnostics = collections.defaultdict(list), []
    probe_refs, request_refs = [], {}
    for path in sorted(Path(probes_root).glob("round-*/*.json")):
        try:
            ref = v.reference(path); container = v.checked_ref(ref)
            if not container.get("probes"):
                continue
            sid = container["sourceRecordId"]
            v.require(sid in sources, "probe_source_outside_reconstructed_lane")
            v.require(container.get("inventorySha256") == inputs["inventory"]["sha256"], "probe_wrong_inventory")
            request_ref = {"path": container["requestPath"], "sha256": container["requestSha256"]}
            request = v.checked_ref(request_ref)
            request_refs[request_ref["path"]] = request_ref
            request_sources = [s for s in request["sources"] if s["sourceRecordId"] == sid]
            v.require(len(request_sources) == 1, "probe_request_source_not_unique")
            probe_refs.append(ref)
            for probe in container["probes"]:
                diagnostic = {"artifact": ref, "sourceRecordId": sid, "probeId": probe.get("id")}
                try:
                    item = native_support(container, probe, request_sources[0], sources[sid], clocks[sid], indexes[sid])
                    item["artifact"] = ref
                    support[(sid, item["cueSegmentId"])].append(item)
                    diagnostic.update(status="structurally_supported", **item)
                except (v.InvalidEvidence, KeyError, ValueError, TypeError) as e:
                    diagnostic.update(status="held", reason=str(e))
                probe_diagnostics.append(diagnostic)
        except (v.InvalidEvidence, OSError, KeyError, ValueError, TypeError) as e:
            probe_diagnostics.append({"artifactPath": str(path), "status": "container_held", "reason": str(e)})
    records = []
    groups = collections.defaultdict(list)
    for sid, source in sources.items():
        for question in source["questions"]:
            row = {"sourceRecordId": sid, "setId": source["setId"], "revision": source["revision"],
                   "documentSha256": source["documentSha256"], "questionId": question["id"],
                   "generatedSourceNumber": question["sourceNumber"], "status": "held", "proposalCrossChecks": []}
            try:
                mapping = passage_mapping(source, question, alignments[sid], indexes[sid])
                row.update(mapping, status="mapped", nativeSupport=support[(sid, mapping["cueSegmentIds"][0])])
                row["generatedNumberDiffersFromOriginalScope"] = question["sourceNumber"] not in mapping["scopeQuestionNumbers"]
                groups[(sid, tuple(mapping["cueSegmentIds"]))].append(row)
                for ref, rows in proposals:
                    check = {"artifact": ref, "status": "passed"}
                    try:
                        v.require((sid, question["id"]) in rows, "proposal_missing_question")
                        compare_proposal(rows[(sid, question["id"])], mapping, source, question)
                    except (v.InvalidEvidence, KeyError, ValueError, TypeError) as e:
                        check.update(status="held", reason=str(e))
                    row["proposalCrossChecks"].append(check)
            except (v.InvalidEvidence, KeyError, ValueError, TypeError) as e:
                row["reason"] = str(e)
            records.append(row)
    for peers in groups.values():
        for row in peers:
            row["currentQuestionsInOriginalPassage"] = len(peers)
            row["peerQuestionIds"] = [r["questionId"] for r in peers]
    for ref in list(inputs.values()) + implementation + probe_refs + list(request_refs.values()):
        v.require(v.sha(ref["path"]) == ref["sha256"], "mapping_audit_input_or_implementation_changed")
    counts = {"sources": len(sources), "questions": len(records), "status": dict(collections.Counter(r["status"] for r in records)),
              "mappedPassages": len(groups), "mappedWithNativeStructuralSupport": sum(bool(r.get("nativeSupport")) for r in records),
              "multipleCurrentQuestions": sum(len(peers) for peers in groups.values() if len(peers) > 1),
              "generatedNumberDiffersFromOriginalScope": sum(r.get("generatedNumberDiffersFromOriginalScope", False) for r in records),
              "probeStatus": dict(collections.Counter(r["status"] for r in probe_diagnostics)),
              "proposalCrossCheckStatus": dict(collections.Counter(c["status"] for r in records for c in r["proposalCrossChecks"]))}
    report = {"schemaVersion": 1, "evidenceContractVersion": 1, "auditKind": "frozen_anchor_original_passage_v2",
              "diagnosticOnly": True, "productionApplicationAuthorized": False, "humanReviewed": False,
              "writesDatabase": False, "writesStorage": False, "writesMedia": False,
              "inputs": inputs, "implementation": implementation, "probeArtifacts": probe_refs,
              "probeRequests": list(request_refs.values()), "counts": counts, "records": records,
              "probeDiagnostics": probe_diagnostics,
              "admissionRequirement": "Every mapped current question still requires complete verifier replay of actual source decode, onset, clip/input hashes, true scope, frozen identity, peer proof equality, order and full-source endpoint."}
    v.immutable_write(output, report)
    print(counts)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("inventory", "clock", "frozen", "probes-root", "output"):
        parser.add_argument("--" + name, required=True)
    parser.add_argument("--proposal", action="append", default=[])
    args = parser.parse_args()
    run(args.inventory, args.clock, args.frozen, args.probes_root, args.proposal, args.output)
