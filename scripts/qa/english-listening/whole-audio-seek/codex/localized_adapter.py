"""Additive native-localized-generation-v2; provider timestamps never own identity."""
import math
import re
from pathlib import Path

import claude_adapter as a
import verifier as v

ADAPTER = "native-localized-generation-v2"
END_BOUNDARY_ADAPTER = "native-localized-generation-boundary-v3"
END_BOUNDARY_GRADE = "localized_generation_native_boundary_v3"


def upstream_refs(container, source):
    refs = []
    for ref in container.get("upstreamArtifacts", []):
        artifact = v.checked_ref(ref)
        refs.append(ref)
        for key in ("sourceRecordId", "sourceAudioSha256"):
            if key in artifact:
                v.require(artifact[key] == source[key], "localized_upstream_wrong_source:" + key)
        if artifact.get("rawPath") is not None or artifact.get("rawSha256") is not None:
            raw_ref = {"path": artifact.get("rawPath"), "sha256": artifact.get("rawSha256")}
            v.checked_ref(raw_ref)
            refs.append(raw_ref)
    return refs


def catalog_probes(row, source):
    ref = row.get("probeCatalog")
    catalog = v.checked_ref(ref)
    artifacts, roots = catalog.get("rawArtifacts"), catalog.get("roots")
    v.require(isinstance(artifacts, list) and artifacts and isinstance(roots, list) and roots, "localized_missing_complete_probe_catalog")
    registered = {str(Path(r["path"]).resolve()) for r in artifacts}
    v.require(len(registered) == len(artifacts), "localized_duplicate_catalog_artifact")
    observed = set()
    for root in roots:
        path = Path(root["path"])
        v.require(path.is_dir(), "localized_missing_catalog_root")
        patterns = root.get("patterns", [root.get("pattern")])
        v.require(isinstance(patterns, list) and patterns and len(patterns) == len(set(patterns)), "localized_invalid_catalog_patterns")
        for pattern in patterns:
            v.require(isinstance(pattern, str) and (pattern in ("*.json", "*.probes.json", "probe.json") or
                      re.fullmatch(r"probes/round-(?:\*|\d+)/[a-z0-9-]+\.json", pattern)), "localized_invalid_catalog_pattern")
            if root.get("rounds") is not None:
                v.require("/" in pattern and pattern.split("/")[1] in root["rounds"], "localized_catalog_unbound_round")
            matches = path.glob(pattern) if "/" in pattern else path.rglob(pattern)
            observed.update(str(p.resolve()) for p in matches if p.is_file())
    v.require(observed == registered, "localized_incomplete_probe_catalog")
    probes, refs = [], [ref]
    for artifact_ref in artifacts:
        container = v.checked_ref(artifact_ref)
        refs.append(artifact_ref)
        if container.get("sourceRecordId") != source["sourceRecordId"]:
            continue
        v.require(container.get("sourceAudioSha256") == source["sourceAudioSha256"], "localized_catalog_wrong_source")
        for probe in container.get("probes", []):
            probes.append((container, probe, artifact_ref))
    v.require(probes, "localized_source_missing_from_catalog")
    for field in ("probeEvidence", "nextProbeEvidence", "nextBoundaryProbeEvidence", "sharedHeadProbeEvidence", "terminalProbeEvidence", "dialogueProbeEvidence"):
        evidence = row.get(field)
        if evidence:
            v.require(any(str(Path(r["path"]).resolve()) == str(Path(evidence["path"]).resolve())
                          and r["sha256"] == evidence["sha256"] for r in artifacts), "localized_selected_probe_missing_from_catalog")
    return probes, refs


def replay_catalog(row, source, replay):
    cache_key = (row.get("probeCatalog", {}).get("path"), row.get("probeCatalog", {}).get("sha256"), source["sourceRecordId"])
    cached = getattr(replay, "_localized_catalog_replays", {})
    if cache_key in cached:
        return cached[cache_key]
    probes, refs = catalog_probes(row, source)
    diagnostics = []
    checked_containers = set()
    for container, probe, artifact in probes:
        a.checked_full_pcm(container, replay.actual, "localized_catalog_full_pcm_mismatch")
        container_key = (str(Path(artifact["path"]).resolve()), artifact["sha256"])
        if container_key not in checked_containers:
            refs.extend(upstream_refs(container, source))
            refs.append({"path": container["requestPath"], "sha256": container["requestSha256"]})
            checked_containers.add(container_key)
        reference = {**artifact, "probeId": probe.get("id")}
        a.checked_probe({"probeEvidence": reference}, source)
        actual = replay.actual
        for key in ("sampleRate", "channels", "startFrame", "frameCount"):
            v.require(v.integer(probe.get(key)), "localized_catalog_invalid_clock:" + key)
        v.require(probe["sampleRate"] == actual["sampleRate"] and probe["channels"] == actual["channels"]
                  and 0 <= probe["startFrame"] < probe["startFrame"] + probe["frameCount"] <= actual["frameCount"], "localized_catalog_source_bounds")
        independent = replay.replay(probe)
        for key in ("clipPcmSha256", "inputMonoFloat32Sha256", "inputSampleCount"):
            v.require(probe.get(key) == independent[key], "localized_catalog_actual_probe_hash:" + key)
        try:
            a.probe_segments(probe, max_duration=60 if probe.get("purpose") in ("first_dialogue", "localized_generation") else 14)
        except (v.InvalidEvidence, KeyError, TypeError, ValueError) as error:
            diagnostics.append({"probe": reference, "reason": str(error), "startFrame": probe["startFrame"], "frameCount": probe["frameCount"]})
    result = probes, refs, diagnostics
    cached[cache_key] = result
    replay._localized_catalog_replays = cached
    return result


def literal_cue(text):
    numbers, rest = a.leading_cue(text)
    # Korean ordinal adjectives emitted for English answer options are not
    # original question announcements ("5번째" is not "5번입니다").
    return (None, text) if rest.lstrip().startswith("째") else (numbers, rest)


def head_coverage(spoken, raw_text):
    if spoken and len(spoken) == 2 and re.search(r"번\s*(?:부터|에서|~|～|-)\s*", raw_text):
        v.require(1 <= spoken[0] < spoken[1] <= 50, "localized_invalid_literal_range")
        return list(range(spoken[0], spoken[1] + 1))
    return spoken


def complete_instruction_prefix(index, selected):
    ordered = list(index.values())
    v.require([s["id"] for s in selected] == [s["id"] for s in ordered[:len(selected)]],
              "localized_instruction_selected_not_contiguous_prefix")
    prefix = [ordered[0]]
    endings = r"(?:고르시오|고르세요|답하시오|답하세요|선택하시오)(?=[\s.!?。]|$)"
    for segment in ordered[1:]:
        if re.search(endings, " ".join(s["text"] for s in prefix)):
            break
        numbers, _ = literal_cue(segment["text"])
        v.require(not numbers, "localized_instruction_crosses_next_heading")
        words, hangul = a.english_words(segment["text"]), re.findall(r"[가-힣]", segment["text"])
        v.require(not (words and not hangul) and not (len(words) >= 4 and len(hangul) < 8),
                  "localized_instruction_crosses_dialogue")
        v.require(not v.uncertain(segment), "uncertain_raw_evidence")
        prefix.append(segment)
    text = " ".join(s["text"] for s in prefix)
    _, rest = literal_cue(text)
    ending = re.search(endings, rest)
    v.require(ending is not None, "localized_instruction_missing_or_incomplete")
    return prefix, rest[:ending.end()]


def exact_occurrences(needle, haystack):
    return [i for i in range(len(haystack) - len(needle) + 1)
            if haystack[i:i + len(needle)] == needle]


def replay_probe(row, source, replay, field, *, language, maximum):
    container, probe = a.checked_probe(row, source, field)
    a.checked_full_pcm(container, replay.actual, "localized_probe_full_pcm_mismatch")
    actual = replay.actual
    if actual.get("convertedClockProof"):
        v.require(container.get("convertedClockProof") == actual["convertedClockProof"]
                  and container.get("playbackSha256") == source["audio"]["sha256"],
                  "localized_converted_clock_mismatch")
    required_keys = ("sampleRate", "channels", "startFrame", "frameCount")
    if language == "ko":
        required_keys += ("onsetFrame", "quietBeforeFrames")
    for key in required_keys:
        v.require(v.integer(probe.get(key)), "localized_probe_invalid_integer:" + key)
    v.require(probe["requestedLanguage"] == language, "localized_wrong_language:" + field)
    v.require(probe["sampleRate"] == actual["sampleRate"] and probe["channels"] == actual["channels"],
              "localized_probe_wrong_clock")
    v.require(0 <= probe["startFrame"] < probe["startFrame"] + probe["frameCount"] <= actual["frameCount"]
              and 0 < probe["frameCount"] <= maximum * actual["sampleRate"], "localized_probe_source_bounds")
    if language == "ko":
        v.require(probe["startFrame"] < probe["onsetFrame"] < probe["startFrame"] + probe["frameCount"], "localized_number_onset_outside_probe")
    v.require(probe["durationSeconds"] == probe["frameCount"] / actual["sampleRate"], "localized_probe_actual_duration")
    independent = replay.replay(probe)
    for key in ("clipPcmSha256", "inputMonoFloat32Sha256", "inputSampleCount"):
        v.require(probe.get(key) == independent[key], "localized_probe_replay_hash:" + key)
    evidence = row[field]
    v.require(evidence.get("inputMonoFloat32Sha256") == probe["inputMonoFloat32Sha256"], "localized_reference_input_hash")
    index = a.probe_segments(probe, max_duration=maximum)
    selected = v.select_segments(index, evidence.get("segmentIds"))
    v.require(evidence.get("text") == " ".join(s["text"] for s in selected), "localized_raw_quote_changed")
    refs = [v.reference(evidence["path"]), {"path": container["requestPath"], "sha256": container["requestSha256"]}]
    # Any provider profiles supplied for discovery retain their nested raw hashes.
    # A valid profile is diagnostic; it never supplies physical onset authority.
    refs.extend(upstream_refs(container, source))
    return probe, index, selected, refs


def measure_probe_onset(row, source, replay, field, probe):
    wf = replay.actual["windowFrames"]
    bins = replay.energy[probe["startFrame"] // wf:probe["onsetFrame"] // wf]
    peak = 10 * math.log10(max(bins) / wf / 32768 ** 2) if bins and max(bins) > 0 else None
    onset = {"startFrame": probe["startFrame"], "onsetFrame": probe["onsetFrame"],
             "quietBeforeFrames": probe["quietBeforeFrames"], "leadPeakDbfs": peak}
    named = {"probeEvidence": "nativeEvidence", "nextProbeEvidence": "nextNativeEvidence",
             "nextBoundaryProbeEvidence": "nextBoundaryNativeEvidence",
             "sharedHeadProbeEvidence": "sharedHeadNativeEvidence", "terminalProbeEvidence": "terminalNativeEvidence"}.get(field)
    supplied = row.get(named) if named else None
    if supplied is not None:
        v.require(all(supplied.get(k) == probe[k] for k in ("startFrame", "onsetFrame")), "localized_auxiliary_onset_bounds")
        if supplied.get("quietEvidenceMethod") == "independent_full_source_quiet_v1":
            v.require(v.integer(supplied.get("quietBeforeFrames")) and
                      supplied.get("rawProbeQuietBeforeFrames") == probe["quietBeforeFrames"], "localized_raw_discovery_quiet_changed")
            context = supplied.get("quietDiscoveryEvidence", {})
            baseline = supplied.get("noiseFloorEvidence", {})
            expected_windows = {"noise_floor_contrast_v1": 100, "noise_floor_contrast_1second_v1": 50}.get(supplied.get("onsetMethod"))
            v.require(expected_windows is not None and context.get("method") == "noise_baseline_capped_discovery_v1",
                      "localized_unproven_discovery_quiet_context")
            expected_frames = expected_windows * wf
            v.require(context.get("contextFrameCount") == baseline.get("baselineFrameCount") == expected_frames
                      and context.get("contextStartFrame") == baseline.get("baselineStartFrame") == probe["onsetFrame"] - expected_frames
                      and context.get("contextEnergySha256") == baseline.get("baselineEnergySha256")
                      and probe["quietBeforeFrames"] == min(supplied["quietBeforeFrames"], expected_frames),
                      "localized_discovery_quiet_cap_relation")
            container, _ = a.checked_probe(row, source, field)
            request = {"path": container["requestPath"], "sha256": container["requestSha256"]}
            claimed_request = context.get("request", {})
            v.require(isinstance(claimed_request.get("path"), str) and
                      Path(claimed_request["path"]).resolve() == Path(request["path"]).resolve()
                      and claimed_request.get("sha256") == request["sha256"] and context.get("probeId") == probe["id"],
                      "localized_discovery_quiet_wrong_raw_request")
        else:
            v.require(supplied.get("quietEvidenceMethod") is None and
                      supplied.get("quietBeforeFrames") == probe["quietBeforeFrames"], "localized_auxiliary_onset_bounds")
        onset = supplied
    if "onsetMethod" in probe:
        v.require(probe["onsetMethod"] == onset.get("onsetMethod", "absolute_energy_v2"), "localized_probe_onset_method_mismatch")
    a.measured_onset(onset, replay)


def numbered_probe(row, source, replay, field, *, require_instruction=True, end_boundary_only=False):
    v.require(not end_boundary_only or (row.get("evidenceAdapter") == END_BOUNDARY_ADAPTER
              and field == "nextBoundaryProbeEvidence"), "localized_boundary_not_next_end_only")
    probe, index, selected, refs = replay_probe(row, source, replay, field, language="ko", maximum=14)
    v.require(selected[0]["id"] == next(iter(index)) and selected[0]["estimatedStartSeconds"] <= 2,
              "localized_probe_missing_first_syllable")
    text = " ".join(s["text"] for s in selected)
    spoken, rest = literal_cue(text)
    v.require(spoken is not None, "localized_missing_original_number")
    siblings, _ = catalog_probes(row, source)
    for _, sibling, sibling_ref in siblings:
        if (sibling.get("id") == probe["id"] and sibling_ref["sha256"] == row[field]["sha256"]) or sibling.get("requestedLanguage") != "ko":
            continue
        sibling_segments = sibling.get("segments", [])
        if not sibling_segments:
            continue
        sibling_spoken, _ = literal_cue(sibling_segments[0].get("text", ""))
        if sibling.get("startFrame") == probe["startFrame"]:
            v.require(not sibling_spoken or sibling_spoken == spoken, "localized_contradictory_same_onset_number")
        elif sibling_spoken == spoken:
            v.require(v.integer(sibling.get("onsetFrame")) and
                      abs(sibling["onsetFrame"] - probe["onsetFrame"]) <= 3 * probe["sampleRate"],
                      "localized_number_at_two_distant_onsets")
    # 듣고 is only the introductory clause; later words can change a pair
    # into a genuinely joint passage. Classify only a complete instruction.
    if require_instruction:
        # Preserve the full raw segments, but classify only the literal first
        # complete instruction. A following English turn may share a segment.
        selected, rest = complete_instruction_prefix(index, selected)
        if end_boundary_only:
            v.require(len(re.findall(r"[가-힣]", rest)) >= 8 and
                      re.search(r"듣고|보고|대화|담화|물음|다음|질문", rest),
                      "localized_boundary_not_genuine_korean_instruction")
    relative = (probe["onsetFrame"] - probe["startFrame"]) / probe["sampleRate"]
    if not end_boundary_only:
        v.require(selected[0]["estimatedStartSeconds"] - .5 <= relative <= selected[0]["estimatedEndSeconds"],
                  "localized_onset_number_correspondence")
    measure_probe_onset(row, source, replay, field, probe)
    return probe, spoken, rest, selected, refs


def terminal_probe(row, source, replay, catalog, *, original_last_number=None):
    probe, index, selected, refs = replay_probe(row, source, replay, "terminalProbeEvidence", language="ko", maximum=14)
    v.require(selected[0]["id"] == next(iter(index)), "localized_closing_not_first_segment")
    text = " ".join(s["text"] for s in selected)
    v.require(re.match(r"^\s*(?:수고하셨(?:습니다|읍니다)|(?:이상으로\s*)?(?:시험을\s*|듣기\s*평가를\s*)?마치겠습니다|끝났습니다)", text),
              "localized_closing_not_literal")
    relative = (probe["onsetFrame"] - probe["startFrame"]) / probe["sampleRate"]
    v.require(selected[0]["estimatedStartSeconds"] <= relative + .5 and
              selected[0]["estimatedEndSeconds"] >= relative, "localized_closing_onset_correspondence")
    measure_probe_onset(row, source, replay, "terminalProbeEvidence", probe)
    observed = []
    for _, other, _ in catalog:
        if other.get("requestedLanguage") == "ko" and other.get("segments"):
            numbers, _ = literal_cue(other["segments"][0].get("text", ""))
            if numbers:
                v.require(other["startFrame"] < probe["startFrame"], "localized_number_after_claimed_closing")
                observed.extend(numbers)
    # This specifically named tier covers the original twenty-question middle
    # school recording. A closing after an arbitrary observed number is unsafe.
    if original_last_number is None:
        v.require(source.get("source", {}).get("provider") == "EBS 중학" and row["scopeQuestionNumbers"][-1] == 20
                  and observed and max(observed) == 20, "localized_terminal_original_population_unproved")
    else:
        v.require(not source["reconstructed"] and row.get("officialTerminalEvidence")
                  and row["scopeQuestionNumbers"][-1] == original_last_number
                  and observed and max(observed) == original_last_number, "official_terminal_original_population_unproved")
    return probe, [], selected, refs


def generation_quotes(row, source, question, full_index, dialogue, native_index, next_onset):
    claim = row.get("localizedMappingEvidence", {})
    v.require(claim.get("method") == "exact_generation_anchor_native_v2" and claim.get("questionId") == question["id"],
              "localized_mapping_wrong_question_or_method")
    alignment = v.checked_ref(claim.get("alignment"), source.get("alignmentPath"))
    v.require(alignment.get("sourceAudioSha256") == source["sourceAudioSha256"]
              and alignment.get("asrSha256") == source["asrSha256"]
              and alignment.get("sourceRecordId") == source["sourceRecordId"], "localized_mapping_wrong_source")
    candidates = [c for c in alignment.get("candidates", []) if c.get("questionId") == question["id"]]
    v.require(len(candidates) == 1 and candidates[0].get("method") == "verified_generation_evidence_segments",
              "missing_current_question_source_grounding")
    ids = candidates[0].get("sourceSegmentIds")
    anchors = v.select_segments(full_index, ids, allow_uncertain=True)
    v.require(claim.get("sourceSegmentIds") == ids == row.get("anchorSegmentIds"), "localized_changed_generation_anchors")
    prepared = v.checked_ref(claim.get("prepared"), source.get("preparedPath"))
    v.require(claim["prepared"]["sha256"] == source["preparedSha256"], "localized_changed_prepared_grounding")
    ordinal = candidates[0].get("generatedOrdinal")
    grounding = [g for g in prepared.get("verification", {}).get("grounding", []) if g.get("generatedOrdinal") == ordinal]
    v.require(v.integer(ordinal) and len(grounding) == 1 and grounding[0].get("sourceSegmentIds") == ids
              and grounding[0].get("included") is True and claim.get("generatedOrdinal") == ordinal,
              "localized_missing_frozen_grounding")
    old_mapping = row.get("mappingEvidence", {})
    v.require(old_mapping.get("alignment") == claim.get("alignment"), "localized_changed_generation_alignment")
    for key, expected in (("questionId", question["id"]), ("sourceSegmentIds", ids)):
        if key in old_mapping:
            v.require(old_mapping[key] == expected, "localized_changed_original_grounding:" + key)
    quotes = claim.get("quotes")
    v.require(isinstance(quotes, list) and quotes, "localized_missing_generation_quotes")
    frozen_quotes = grounding[0].get("evidenceQuotes")
    v.require(isinstance(frozen_quotes, list) and frozen_quotes and
              [q.get("text") for q in quotes] == frozen_quotes, "localized_missing_or_changed_supporting_quote")
    covered, total, proof = set(), 0, []
    # Repeated text in another generation source segment is ambiguous. Keep it
    # held instead of picking the nearest provider timestamp or current index.
    extras = claim.get("anchorSegments", [])
    v.require(isinstance(extras, list), "localized_invalid_additional_anchor_segments")
    extra_ids = [q.get("sourceSegmentId") for q in extras]
    v.require(len(extra_ids) == len(set(extra_ids)), "localized_duplicate_additional_anchor")
    items = list(quotes)
    for extra in extras:
        sid = extra.get("sourceSegmentId")
        v.require(sid in ids and extra.get("text") == full_index[sid]["text"], "localized_wrong_additional_anchor_text")
        items.append({**extra, "startCharacter": 0, "endCharacter": len(extra["text"]), "additionalWholeAnchorSegment": True})
    for quote in items:
        quote_ids = quote.get("sourceSegmentIds", [quote.get("sourceSegmentId")])
        start, end = quote.get("startCharacter"), quote.get("endCharacter")
        v.require(isinstance(quote_ids, list) and quote_ids and set(quote_ids) <= set(ids)
                  and v.integer(start) and v.integer(end), "localized_quote_invalid_source_span")
        source_segments = v.select_segments(full_index, quote_ids, allow_uncertain=True)
        positions = [list(full_index).index(sid) for sid in quote_ids]
        v.require(positions == list(range(positions[0], positions[-1] + 1)), "localized_quote_skips_source_segment")
        original = " ".join(s["text"] for s in source_segments)
        text = quote.get("text")
        v.require(0 <= start < end <= len(original) and text == original[start:end], "localized_wrong_original_quote")
        tokens = a.english_words(text)
        v.require(tokens, "localized_quote_has_no_english_words")
        all_tokens = a.english_words(" ".join(s["text"] for s in full_index.values()))
        v.require(len(exact_occurrences(tokens, all_tokens)) == 1, "localized_repeat_occurrence_ambiguous")
        segments = v.select_segments(native_index, quote.get("probeSegmentIds"))
        heard = a.english_words(" ".join(s["text"] for s in segments))
        v.require(len(exact_occurrences(tokens, heard)) == 1, "localized_wrong_or_repeated_native_quote")
        words = [w for s in segments for w in s.get("words", [])]
        # Segment probability cannot conceal zero-length or low-confidence words.
        v.require(words and a.english_words(" ".join(w.get("text", w.get("word", "")) for w in words)) == heard,
                  "localized_word_text_artifact")
        previous = -1
        for segment in segments:
            for word in segment.get("words", []):
                v.require(segment["estimatedStartSeconds"] <= word["localStartSeconds"] < word["localEndSeconds"]
                          <= segment["estimatedEndSeconds"], "localized_word_outside_own_segment")
        for word in words:
            lo, hi = word["localStartSeconds"], word["localEndSeconds"]
            v.require(previous <= lo < hi and word["probability"] > 0, "localized_word_timing_or_confidence_artifact")
            previous = lo
        lo = dialogue["startFrame"] / dialogue["sampleRate"] + min(s["estimatedStartSeconds"] for s in segments)
        hi = dialogue["startFrame"] / dialogue["sampleRate"] + max(s["estimatedEndSeconds"] for s in segments)
        v.require(row["nativeEvidence"]["onsetFrame"] / dialogue["sampleRate"] <= lo < hi <= next_onset / dialogue["sampleRate"],
                  "localized_quote_outside_native_passage")
        cursor = 0
        for source_segment in source_segments:
            segment_end = cursor + len(source_segment["text"])
            if max(start, cursor) < min(end, segment_end):
                covered.add(source_segment["id"])
            cursor = segment_end + 1
        total += len(tokens)
        proof.append({**quote, "nativeEstimatedStartSeconds": lo, "nativeEstimatedEndSeconds": hi})
    v.require(covered == set(ids) and sum(len(a.english_words(q["text"])) for q in quotes) >= 4,
              "localized_incomplete_generation_anchor_coverage")
    return {"method": claim["method"], "alignment": claim["alignment"], "questionId": question["id"],
            "sourceSegmentIds": ids, "rawGenerationSegments": anchors, "quotes": proof}, [claim["alignment"], claim["prepared"]]


def validate(row, source, question, clock, replay, full_index, *, end_boundary_only=False):
    adapter = END_BOUNDARY_ADAPTER if end_boundary_only else ADAPTER
    v.require(row.get("evidenceAdapter") == adapter and source["reconstructed"], "localized_adapter_requires_reconstructed_source")
    v.require(end_boundary_only or not row.get("nextBoundaryProbeEvidence"), "localized_boundary_requires_explicit_v3")
    for ids, quote in ((row.get("cueSegmentIds"), row.get("cueText")), (row.get("anchorSegmentIds"), row.get("anchorText"))):
        v.require(isinstance(ids, list), "missing_full_asr_reference_arrays")
        selected = v.select_segments(full_index, ids, allow_uncertain=True) if ids else []
        v.require(quote is None or quote == " ".join(s["text"] for s in selected), "full_asr_quote_changed")
    catalog, catalog_refs, catalog_diagnostics = replay_catalog(row, source, replay)
    n, actual = row.get("nativeEvidence", {}), replay.actual
    cache_ref = {"path": n.get("cachePath"), "sha256": n.get("cacheSha256")}
    cache = v.checked_ref(cache_ref)
    v.require(cache.get("sourceRecordId") == source["sourceRecordId"]
              and cache.get("sourceAudioSha256") == source["sourceAudioSha256"] == actual["sourceAudioSha256"], "localized_cache_wrong_source")
    for key in ("sampleRate", "channels", "frameCount"):
        v.require(v.integer(n.get(key)) and n[key] == cache["pcm"].get(key) == actual[key], "localized_native_clock:" + key)
    v.require(n.get("pcmSha256") == cache["pcm"]["sha256"] == actual["pcmSha256"] == clock["decodedInterleavedInt16Sha256"],
              "localized_full_pcm_hash")
    v.require(cache["playback"]["sha256"] == actual["playbackSha256"] == source["audio"]["sha256"], "localized_playback_hash")
    energy_ref = {"path": n.get("energyPath"), "sha256": n.get("energySha256")}
    v.require(v.sha(energy_ref["path"]) == energy_ref["sha256"] == cache["energy"]["sha256"] == actual["energySha256"], "localized_energy_hash")
    v.require(v.integer(row.get("seekStartMs")) and row["seekStartMs"] == n["startFrame"] * 1000 // n["sampleRate"], "seek_native_clock_mismatch")
    head, spoken, rest, raw, refs = numbered_probe(row, source, replay, "probeEvidence",
                                                 require_instruction=row.get("kind") != "shared_instruction_member")
    v.require(head["startFrame"] == n["startFrame"] and head["onsetFrame"] == n["onsetFrame"], "localized_head_wrong_native_start")
    scope, kind = row.get("scopeQuestionNumbers"), row.get("kind")
    coverage = head_coverage(spoken, " ".join(s["text"] for s in raw))
    v.require(isinstance(scope, list) and scope and all(v.integer(i) and 1 <= i <= 50 for i in scope)
              and scope == sorted(set(scope)) and v.integer(row.get("cueNumber")) and row["cueNumber"] == scope[0]
              and spoken == row.get("cueSpokenNumbers"), "localized_invalid_original_scope")
    if kind == "single":
        v.require(spoken == scope and len(scope) == 1, "localized_single_scope_mismatch")
    elif kind == "shared_passage":
        v.require(spoken == scope and len(scope) == 2 and scope[1] == scope[0] + 1
                  and re.search(r"물음에\s*답하|두\s*물음|두\s*질문", rest), "localized_shared_passage_mismatch")
    elif kind == "shared_instruction_head":
        v.require(len(coverage) >= 2 and scope == [coverage[0]]
                  and not re.search(r"물음에\s*답하|두\s*물음|두\s*질문", rest), "localized_shared_member_confusion")
    elif kind == "shared_instruction_member":
        joint, joint_numbers, joint_rest, joint_raw, joint_refs = numbered_probe(row, source, replay, "sharedHeadProbeEvidence")
        joint_coverage = head_coverage(joint_numbers, " ".join(s["text"] for s in joint_raw))
        v.require(spoken == scope and len(scope) == 1 and len(joint_coverage) >= 2
                  and scope[0] in joint_coverage[1:]
                  and joint["onsetFrame"] < head["onsetFrame"]
                  and not re.search(r"물음에\s*답하|두\s*물음|두\s*질문", joint_rest), "localized_shared_member_confusion")
        refs.extend(joint_refs)
    else:
        raise v.InvalidEvidence("localized_unproven_shared_member_or_kind")
    terminal = row.get("terminalProbeEvidence") is not None
    certified = row.get("nextCertificateEvidence") is not None
    fields = ("nextProbeEvidence", "terminalProbeEvidence", "nextCertificateEvidence", "nextBoundaryProbeEvidence")
    v.require(sum(bool(row.get(k)) for k in fields) == 1,
              "localized_missing_or_multiple_next_boundaries")
    v.require(not end_boundary_only or (row.get("nextBoundaryProbeEvidence") and row.get("nextBoundaryNativeEvidence")),
              "localized_boundary_missing_explicit_raw_and_native")
    boundary_proof = None
    if end_boundary_only:
        shared_coverage = coverage if kind == "shared_instruction_head" else joint_coverage if kind == "shared_instruction_member" else []
        shared_member = scope[-1] + 1 in shared_coverage
        neighbor, next_numbers, next_rest, next_raw, next_refs = numbered_probe(
            row, source, replay, "nextBoundaryProbeEvidence", require_instruction=not shared_member, end_boundary_only=True)
        v.require(next_numbers[0] == scope[-1] + 1 and (not shared_member or next_numbers == [scope[-1] + 1]),
                  "localized_wrong_neighbor")
        first = next_raw[0]
        relative = (neighbor["onsetFrame"] - neighbor["startFrame"]) / neighbor["sampleRate"]
        boundary_proof = {"method": "complete_original_identity_next_end_v3", "maySupplySeekStart": False,
            "probe": row["nextBoundaryProbeEvidence"], "nativeEvidence": row["nextBoundaryNativeEvidence"],
            "firstSpeechStartSeconds": first["estimatedStartSeconds"], "firstSpeechEndSeconds": first["estimatedEndSeconds"],
            "onsetNumberCorrespondence": first["estimatedStartSeconds"] - .5 <= relative <= first["estimatedEndSeconds"],
            "identityMethod": "proved_original_shared_instruction_member" if shared_member else "literal_complete_korean_instruction",
            "instructionText": next_rest, "rawInstructionSegments": next_raw,
            "sharedCoverage": shared_coverage if shared_member else None,
            "sharedHeadProbe": row["probeEvidence"] if kind == "shared_instruction_head" and shared_member
                               else row.get("sharedHeadProbeEvidence") if shared_member else None}
    elif certified:
        from certified_boundary import validate as certified_boundary
        neighbor, next_numbers, next_spoken, next_refs = certified_boundary(row, source, replay)
        next_raw = []
        v.require(next_numbers[0] == scope[-1] + 1, "localized_wrong_neighbor")
    elif terminal:
        v.require(not row.get("nextProbeEvidence"), "localized_two_next_boundary_kinds")
        neighbor, next_numbers, next_raw, next_refs = terminal_probe(row, source, replay, catalog)
    else:
        neighbor, next_numbers, _, next_raw, next_refs = numbered_probe(row, source, replay, "nextProbeEvidence",
                                                                      require_instruction=not (kind == "shared_instruction_head" or
                                                                          (kind == "shared_instruction_member" and scope[0] + 1 in joint_coverage)))
        v.require(next_numbers[0] == scope[-1] + 1, "localized_wrong_neighbor")
    v.require(neighbor["onsetFrame"] > head["onsetFrame"], "localized_wrong_neighbor")
    dialogue, native_index, _, dialogue_refs = replay_probe(row, source, replay, "dialogueProbeEvidence", language="en", maximum=60)
    v.require(dialogue.get("purpose") == "localized_generation" and head["startFrame"] <= dialogue["startFrame"]
              < dialogue["startFrame"] + dialogue["frameCount"] <= neighbor["startFrame"], "localized_dialogue_wrong_passage")
    mapping, mapping_refs = generation_quotes(row, source, question, full_index, dialogue, native_index, neighbor["startFrame"])
    for _, other, other_ref in catalog:
        raw_segments = other.get("segments", [])
        if not raw_segments:
            continue
        if other.get("requestedLanguage") == "ko" and head["startFrame"] < other["startFrame"] < neighbor["startFrame"]:
            raw_text = raw_segments[0].get("text", "")
            numbers, _ = literal_cue(raw_text)
            bare = re.match(r"^\s*(\d{1,2})\s*[.,]\s*(?:" + a.ORIGINAL_ENGLISH_INSTRUCTION + r")", raw_text, re.I)
            if not bare and re.match(r"^\s*\d{1,2}\s*[.,]", raw_text):
                bare = re.search(r"듣고|고르시오|고르세요|답하시오|선택하시오", raw_text)
            v.require(not bare and (not numbers or numbers == spoken), "localized_unresolved_internal_number_reading")
        if certified and other.get("requestedLanguage") == "ko" and other["startFrame"] == neighbor["startFrame"]:
            numbers, _ = literal_cue(raw_segments[0].get("text", ""))
            v.require(not numbers or numbers == next_spoken, "localized_contradictory_certified_next_number")
        if other.get("requestedLanguage") == "en" and (other["startFrame"] + other["frameCount"] <= head["startFrame"] or other["startFrame"] >= neighbor["startFrame"]):
            words = a.english_words(" ".join(s.get("text", "") for s in raw_segments))
            for quote in row["localizedMappingEvidence"]["quotes"]:
                v.require(not exact_occurrences(a.english_words(quote["text"]), words), "localized_quote_heard_in_other_passage")
    # Internal recognized headings cannot be ignored to attach a neighbor quote.
    for s in native_index.values():
        numbers, _ = a.leading_cue(s["text"])
        v.require(not numbers or numbers == spoken, "localized_internal_neighbor_heading")
    proof = {"adapter": adapter, "probe": row["probeEvidence"], "onsetFrame": n["onsetFrame"],
             "scopeQuestionNumbers": scope, "cueNumber": row["cueNumber"], "cueSpokenNumbers": spoken, "kind": kind,
             "nextProbe": row.get("nextBoundaryProbeEvidence") or row.get("nextProbeEvidence") or row.get("terminalProbeEvidence"),
             "nextCertificate": row.get("nextCertificateEvidence"),
             "nextBoundaryKind": "next_number_first_speech_boundary_v3" if end_boundary_only else "exact_preserved_original_scope_v1" if certified else "literal_original_closing_v1" if terminal else "next_numbered_native",
             "nextEndIdentity": boundary_proof,
             "sharedHeadProbe": row.get("sharedHeadProbeEvidence"),
             "instructionContext": {"method": "literal_complete_native_instruction_v1",
                                    "segmentIds": [s["id"] for s in raw], "rawSegments": raw},
             "sharedHeadRawSegments": joint_raw if kind == "shared_instruction_member" else None,
             "nextOnsetFrame": neighbor["onsetFrame"],
             "nextSpokenNumbers": next_spoken if certified else next_numbers,
             "nextScopeQuestionNumbers": next_numbers, "nextRawSegments": next_raw, "localizedMapping": mapping,
             "rawNativeDialogueSegments": list(native_index.values()),
             "catalogDiagnostics": catalog_diagnostics,
             "probeCatalog": row.get("probeCatalog"),
             "boundReferences": refs + next_refs + dialogue_refs + mapping_refs + catalog_refs + [cache_ref, energy_ref],
             "providerTimingAuthority": False}
    return proof, raw, END_BOUNDARY_GRADE if end_boundary_only else "localized_generation_native", None
