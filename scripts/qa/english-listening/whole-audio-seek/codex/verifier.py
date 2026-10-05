"""Offline start-only proof replay. No imports from the old cut verifiers."""
from __future__ import annotations

import argparse
import collections
import hashlib
import json
import math
import re
import subprocess
import sys
import time
from pathlib import Path


class InvalidEvidence(ValueError):
    pass


def require(condition, reason):
    if not condition:
        raise InvalidEvidence(reason)


def integer(value):
    return type(value) is int


def sha(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def immutable_write(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x", encoding="utf-8", newline="\n") as f:
        json.dump(value, f, ensure_ascii=False, indent=2, allow_nan=False)
        f.write("\n")


def reference(path):
    return {"path": str(Path(path).resolve()), "sha256": sha(path)}


def queue_provenance(queue, ledger_ref):
    """Queue lane ownership is independent of the actual evidence assembler."""
    result = {"laneProvider": queue["provider"], "ledger": ledger_ref, "compilerDeclared": False}
    names = ("compilerProvider", "compilerModel", "upstreamProducer", "upstreamArtifacts")
    if any(name in queue for name in names):
        require(all(isinstance(queue.get(name), str) and queue[name].strip() for name in names[:3]), "incomplete_compiler_provenance")
        require(queue["upstreamProducer"] == queue["provider"], "compiler_upstream_lane_mismatch")
        refs = queue.get("upstreamArtifacts")
        require(isinstance(refs, list) and refs, "missing_compiler_upstream_artifacts")
        for ref in refs:
            require(isinstance(ref, dict) and isinstance(ref.get("path"), str)
                    and sha(ref["path"]) == ref.get("sha256"), "compiler_upstream_artifact_corruption")
        result.update({name: queue[name] for name in names}, compilerDeclared=True)
    if "metadataAdapters" in queue:
        adapters = queue["metadataAdapters"]
        require(isinstance(adapters, list) and all(isinstance(item, dict) for item in adapters), "invalid_metadata_adapter_provenance")
        result["metadataAdapters"] = adapters
    return result


def checked_ref(ref, expected=None):
    require(isinstance(ref, dict) and isinstance(ref.get("path"), str), "missing_immutable_reference")
    if expected:
        require(Path(ref["path"]).resolve() == Path(expected).resolve(), "wrong_artifact_path")
    raw = Path(ref["path"]).read_bytes()
    require(hashlib.sha256(raw).hexdigest() == ref.get("sha256"), "artifact_hash_mismatch")
    return json.loads(raw.decode("utf-8-sig"))


def normalize(text):
    text = text.translate(str.maketrans({"’": "'", "‘": "'", "“": '"', "”": '"'}))
    return re.sub(r"\s+", "", text).casefold()


def scope_from_text(text):
    """Only explicit spoken numeric announcements; never infer a missing number."""
    text = text.strip()
    match = re.match(r"^(\d{1,2})\s*번(?:\s*(?:부터|에서|~|～|-|과|와)\s*(\d{1,2})\s*번)?", text)
    if match:
        first, last = int(match[1]), int(match[2] or match[1])
    else:
        match = re.match(r"^(?:questions?|numbers?)\s+(\d{1,2})(?:\s*(?:to|through|and|[-–])\s*(\d{1,2}))?\b", text, re.I)
        if not match:
            return None
        first, last = int(match[1]), int(match[2] or match[1])
    if not 1 <= first <= last <= 50:
        return None
    return list(range(first, last + 1))


def uncertain(segment):
    require(type(segment.get("uncertain")) is bool, "missing_raw_uncertainty")
    logp = segment.get("avgLogProbability")
    compression = segment.get("compressionRatio")
    nospeech = segment.get("noSpeechProbability")
    require(all(type(n) in (int, float) and math.isfinite(n) for n in (logp, compression, nospeech)), "missing_raw_confidence_metrics")
    require(0 <= nospeech <= 1 and compression >= 0 and logp <= 0, "invalid_raw_confidence_metrics")
    return segment["uncertain"] or logp < -1 or compression > 2.4 or (nospeech > .6 and logp < -.6)


def segment_bounds(segment):
    start, end = segment.get("estimatedStartSeconds"), segment.get("estimatedEndSeconds")
    require(all(type(n) in (int, float) and math.isfinite(n) for n in (start, end)), "invalid_raw_estimate")
    return start, end


def index_segments(document, duration_seconds):
    require(type(duration_seconds) in (int, float) and math.isfinite(duration_seconds) and duration_seconds > 0, "invalid_actual_duration")
    segments = document.get("segments")
    require(isinstance(segments, list) and segments, "missing_raw_segments")
    result = {}
    last_start = -1
    for s in segments:
        require(integer(s.get("id")) and s["id"] >= 0 and s["id"] not in result, "duplicate_or_invalid_raw_segment_id")
        require(isinstance(s.get("text"), str) and bool(s["text"].strip()), "empty_raw_segment")
        start, end = segment_bounds(s)
        require(0 <= start < end <= duration_seconds + 1e-6, "raw_segment_overflow")
        require(start >= last_start, "raw_segment_order")
        uncertain(s)  # Validate, without changing the original flag/metrics.
        last_start = start
        result[s["id"]] = s
    return result


def select_segments(index, ids, *, allow_uncertain=False):
    require(isinstance(ids, list) and ids and all(integer(i) for i in ids), "missing_segment_ids")
    require(len(set(ids)) == len(ids), "duplicate_segment_ids")
    require(all(i in index for i in ids), "unknown_segment_id")
    found = [index[i] for i in ids]
    require([segment_bounds(s)[0] for s in found] == sorted(segment_bounds(s)[0] for s in found), "selected_segment_order")
    require(allow_uncertain or not any(uncertain(s) for s in found), "uncertain_raw_evidence")
    return found


def diagnostic_segments(row, index):
    """Source-bound observations retain estimates without claiming passage proof."""
    ids = row.get("diagnosticAsrSegmentIds", [])
    require(isinstance(ids, list), "invalid_diagnostic_asr_ids")
    if not ids:
        require(row.get("diagnosticAsrText") in (None, ""), "diagnostic_asr_quote_without_ids")
        return []
    selected = select_segments(index, ids, allow_uncertain=True)
    require(row.get("diagnosticAsrText") == " ".join(s["text"] for s in selected), "diagnostic_asr_quote_changed")
    return selected


def validate_identity(row, source, question):
    for field, expected in {
        "sourceRecordId": source["sourceRecordId"], "setId": source["setId"],
        "revision": source["revision"], "documentSha256": source["documentSha256"],
        "questionId": question["id"], "sourceNumber": question["sourceNumber"],
        "sourceAudioSha256": source["sourceAudioSha256"], "playbackSha256": source["audio"]["sha256"],
        "asrSha256": source["asrSha256"],
    }.items():
        require(type(row.get(field)) is type(expected) and row.get(field) == expected, f"identity_mismatch:{field}")
    require(Path(row.get("asrPath", "")).resolve() == Path(source["asrPath"]).resolve(), "identity_mismatch:asrPath")
    require(row.get("status") in ("candidate", "held", "existing_verified"), "invalid_status")


def validate_clock(clock, source, asr):
    require(clock.get("status") == "passed", "native_playback_clock_unverified")
    for name, expected in (("sourceAudioSha256", source["sourceAudioSha256"]), ("playbackSha256", source["audio"]["sha256"]),
                           ("documentSha256", source["documentSha256"]), ("revision", source["revision"])):
        require(clock.get(name) == expected, f"native_clock_identity:{name}")
    require(clock.get("durationMs") == source["audio"]["durationMs"], "production_duration_drift")
    require(clock.get("sourceToPlaybackOffsetMs") == 0, "source_playback_offset_unverified")
    rate, count = clock.get("sampleRate"), clock.get("frameCount")
    require(integer(rate) and rate > 0 and integer(count) and count > 0, "invalid_native_clock")
    require(math.ceil(count * 1000 / rate) == clock["durationMs"], "native_frame_duration_mismatch")
    require(asr.get("sourceAudioSha256") == source["sourceAudioSha256"], "raw_asr_wrong_source")
    require(Path(asr.get("sourceAudioPath", "")).resolve() == Path(source["sourceAudioPath"]).resolve(), "raw_asr_wrong_source_path")
    require(abs(asr.get("durationSeconds", -1000) * 1000 - count * 1000 / rate) <= 50, "asr_native_clock_drift")
    return count / rate


def probe_contract(probe):
    """Canonical raw probe schema; explicit adapters may be added, never guessed."""
    return {
        "sourceAudioSha256": probe.get("sourceAudioSha256"), "sampleRate": probe.get("sampleRate"),
        "offset": probe.get("sourceOffsetFrame"), "count": probe.get("actualFrameCount"),
        "sourceCount": probe.get("sourceFrameCount"), "pcmSha256": probe.get("decodedMonoFloat32Sha256"),
        "onsets": probe.get("speechOnsetFrames"),
    }


def check_legacy_probe_transport(probe):
    """Grok smoke PCM transports cannot turn copied full-ASR estimates into recognition."""
    if probe.get("pcmLayout") != "float32le-interleaved":
        return
    duration = probe.get("durationSeconds")
    require(type(duration) in (int, float) and math.isfinite(duration) and duration > 0, "invalid_actual_probe_duration")
    for s in probe.get("segments", []):
        local = s.get("localEstimatedStartSeconds")
        raw_start, raw_end = s.get("rawEstimatedStartSeconds"), s.get("rawEstimatedEndSeconds")
        require(all(type(n) in (int, float) and math.isfinite(n) for n in (local, raw_start, raw_end)), "missing_raw_probe_bounds")
        local_end = local + raw_end - raw_start
        require(0 <= local < local_end <= duration, "raw_probe_estimate_or_anchor_overflow")
    raise InvalidEvidence("copied_full_asr_estimates_are_not_native_cue_recognition")


def validate_native(row, source, probe, replay):
    n = row.get("nativeEvidence")
    require(isinstance(n, dict), "missing_native_evidence")
    raw = probe_contract(probe)
    require(raw["sourceAudioSha256"] == n.get("sourceAudioSha256") == source["sourceAudioSha256"], "native_wrong_source")
    rate, offset, count = raw["sampleRate"], raw["offset"], raw["count"]
    require(integer(rate) and rate > 0 and all(integer(v) for v in (offset, count, raw["sourceCount"])), "invalid_probe_clock")
    require(0 <= offset < offset + count <= raw["sourceCount"] and 0 < count <= 120 * rate, "probe_overflow_or_unbounded")
    require(n.get("sampleRate") == rate and n.get("probeOffsetFrame") == offset and n.get("probeFrameCount") == count, "native_probe_bounds_mismatch")
    require(replay["sourceFrameCount"] == raw["sourceCount"] and replay["pcmSha256"] == raw["pcmSha256"] == n.get("pcmSha256"), "native_decode_hash_mismatch")
    require(abs(raw["sourceCount"] * 1000 / rate - source["audio"]["durationMs"]) <= 50, "native_proxy_duration_drift")
    require(replay["onsets"] == raw["onsets"], "native_onset_replay_mismatch")
    segments = index_segments(probe, count / rate)
    cues = select_segments(segments, n.get("cueProbeSegmentIds"), allow_uncertain=row.get("startEvidence", {}).get("method") == "official_alignment")
    onset = n.get("cueOnsetFrame")
    start = n.get("startFrame")
    require(integer(onset) and onset in [offset + i for i in replay["onsets"]], "unknown_native_cue_onset")
    require(integer(start) and 0 <= start <= onset < offset + count, "native_start_overflow_or_after_cue")
    require(onset - start <= rate // 2, "native_start_too_early")
    require(integer(row.get("seekStartMs")) and row["seekStartMs"] == start * 1000 // rate, "seek_native_clock_mismatch")
    cue_start, cue_end = segment_bounds(cues[0])
    onset_seconds = (onset - offset) / rate
    require(cue_start - .5 <= onset_seconds <= cue_end, "native_cue_raw_correspondence")
    candidates = [i for i in replay["onsets"] if cue_start - .5 <= i / rate <= cue_end]
    require(len(candidates) == 1 and candidates[0] + offset == onset, "ambiguous_native_cue_onset")
    return cues, segments


def full_asr_passage(index, row):
    cues = select_segments(index, row.get("cueSegmentIds"), allow_uncertain=row.get("startEvidence", {}).get("method") == "official_alignment")
    anchors = select_segments(index, row.get("anchorSegmentIds"))
    cue_start = segment_bounds(cues[0])[0]
    following = [s for s in index.values() if segment_bounds(s)[0] > cue_start and scope_from_text(s["text"])]
    next_start = min((segment_bounds(s)[0] for s in following), default=math.inf)
    require(all(cue_start <= segment_bounds(s)[0] < next_start for s in anchors), "anchor_outside_original_passage")
    return cues, anchors


def validate_scope(row, source, native_cues, full_cues):
    scope = row.get("scopeQuestionNumbers")
    require(isinstance(scope, list) and scope and all(integer(i) and 1 <= i <= 50 for i in scope), "invalid_original_scope")
    require(scope == sorted(set(scope)), "duplicate_or_unordered_scope")
    require(integer(row.get("cueNumber")) and row.get("cueNumber") == scope[0], "fabricated_cue_ordinal")
    raw_scopes = [scope_from_text(s["text"]) for s in native_cues]
    require(all(s == scope for s in raw_scopes), "native_spoken_scope_mismatch")
    full_scope = scope_from_text(full_cues[0]["text"])
    require(full_scope == scope and not any(uncertain(s) for s in full_cues), "full_raw_cue_uncertain_or_mismatch")
    if not source["reconstructed"]:
        require(row["sourceNumber"] in scope, "official_current_question_outside_scope")


def validate_mapping(row, source, question, index):
    if not source["reconstructed"]:
        return
    mapping = row.get("mappingEvidence", {})
    alignment = checked_ref(mapping.get("alignment"), source.get("alignmentPath"))
    require(alignment.get("sourceAudioSha256") == source["sourceAudioSha256"] and alignment.get("asrSha256") == source["asrSha256"], "mapping_wrong_source")
    require(alignment.get("sourceRecordId") == source["sourceRecordId"], "mapping_wrong_source_id")
    candidates = [c for c in alignment.get("candidates", []) if c.get("questionId") == question["id"]]
    require(len(candidates) == 1 and candidates[0].get("method") == "verified_generation_evidence_segments", "missing_current_question_source_grounding")
    ids = candidates[0].get("sourceSegmentIds")
    select_segments(index, ids)
    require(set(ids).issubset(set(row.get("anchorSegmentIds", []))), "generated_index_mapping_without_grounding")
    if "questionId" in mapping:
        require(mapping["questionId"] == question["id"], "mapping_wrong_current_question")
    if "sourceSegmentIds" in mapping:
        require(mapping["sourceSegmentIds"] == ids, "mapping_changed_original_grounding")
    if "method" in mapping:
        require(mapping["method"] == "verified_generation_evidence_segments", "mapping_method_mismatch")
    if "originalQuestionNumber" in mapping:
        require(mapping["originalQuestionNumber"] == row["cueNumber"], "mapping_original_number_mismatch")


def validate_official_alignment(row, source, native_index, full_index):
    require(not source["reconstructed"], "official_alignment_requires_official_source")
    scope = row.get("scopeQuestionNumbers")
    require(isinstance(scope, list) and scope and all(integer(i) and 1 <= i <= 50 for i in scope) and scope == sorted(set(scope)), "invalid_original_scope")
    require(integer(row.get("cueNumber")) and row["cueNumber"] == scope[0], "fabricated_cue_ordinal")
    current = next((q for q in source["questions"] if q["id"] == row["questionId"]), {})
    shared_instruction = current.get("instruction")
    if shared_instruction and re.search(r"물음에\s*답하", shared_instruction):
        expected = sorted(q["sourceNumber"] for q in source["questions"] if q.get("instruction") == shared_instruction)
        require(len(expected) == 2 and scope == expected, "official_section_true_shared_scope_mismatch")
    elif len(scope) > 1:
        require(False, "official_section_shared_scope_without_original_instruction")
    proof = row.get("startEvidence", {})
    script = checked_ref(proof.get("script"))
    require(script.get("sourceAudioSha256") == source["sourceAudioSha256"] and script.get("sourceRecordId") == source["sourceRecordId"], "official_script_wrong_source")
    prepared = read(source["preparedPath"])
    original = checked_ref(proof.get("originalPrepared"), prepared.get("originalPreparedPath"))
    require(proof["originalPrepared"]["sha256"] == prepared.get("originalPreparedSha256"), "official_prepared_hash_mismatch")
    original_transcript = "\n".join(g["transcript"]["text"] for g in original["editableInput"]["groups"])
    require(script.get("sourceTranscriptText") == original_transcript, "official_script_not_original_transcript")
    sections = [s for s in script.get("sections", []) if s.get("id") == proof.get("sectionId")]
    require(len(sections) == 1 and sections[0].get("questionNumbers") == row.get("scopeQuestionNumbers"), "official_section_scope_mismatch")
    require(row["sourceNumber"] in sections[0]["questionNumbers"] and row.get("cueNumber") == sections[0]["questionNumbers"][0], "official_section_current_question_mismatch")
    text = script.get("sourceTranscriptText", "")
    instruction, dialogue = proof.get("instructionQuote", ""), proof.get("firstDialogueQuote", "")
    require(len(normalize(instruction)) >= 12 and len(normalize(dialogue)) >= 16, "official_alignment_quotes_too_short")
    require(normalize(text).count(normalize(instruction)) == 1, "official_instruction_not_unique")
    utterances = sections[0].get("utterances", [])
    require(utterances and normalize(dialogue) in normalize(utterances[0]["text"]), "not_first_official_dialogue")
    require(normalize(text).count(normalize(dialogue)) == 1, "official_first_dialogue_not_unique")
    # A derived script section cannot merely label a later related utterance as
    # the current question's first. Replay its position in actual original text.
    markers = list(re.finditer(r"(?:^|\s)(\d{1,2})(?:번|\.)(?=\s)", text))
    current_markers = [m for m in markers if int(m[1]) == row["cueNumber"]]
    require(len(current_markers) == 1, "official_transcript_numbering_not_unique")
    marker = current_markers[0]
    stop = next((m.start() for m in markers if m.start() > marker.start()), len(text))
    body = text[marker.end():stop]
    speakers = list(re.finditer(r"(?:^|\s)(?:M|W|B|G|Man|Woman|Boy|Girl)\s*:\s*", body))
    first, head = None, ""
    for i, speaker in enumerate(speakers):
        end = speakers[i + 1].start() if i + 1 < len(speakers) else len(body)
        actual = re.sub(r"^\s*(?:\[[^\]]{1,100}\]\s*)+", "", body[speaker.end():end])
        if re.fullmatch(r"[\s_＿]+", actual):
            continue
        first, head = actual, body[:speaker.start()]
        break
    require(first is not None and normalize(first).startswith(normalize(dialogue)), "not_first_official_dialogue")
    require(instruction in head, "official_instruction_not_at_source_question")
    p_instruction = select_segments(native_index, proof.get("instructionProbeSegmentIds"))
    p_dialogue = select_segments(native_index, proof.get("dialogueProbeSegmentIds"))
    require(normalize(instruction) in normalize(" ".join(s["text"] for s in p_instruction)), "instruction_quote_absent_in_probe")
    require(normalize(dialogue) in normalize(" ".join(s["text"] for s in p_dialogue)), "first_dialogue_quote_absent_in_probe")
    require(segment_bounds(p_instruction[0])[0] < segment_bounds(p_dialogue[0])[0], "official_instruction_dialogue_order")
    # A contradictory reliable numeral cannot be overridden by script order.
    for s in select_segments(native_index, row["nativeEvidence"]["cueProbeSegmentIds"], allow_uncertain=True):
        spoken = scope_from_text(s["text"])
        require(spoken is None or spoken == sections[0]["questionNumbers"], "contradictory_spoken_numeral")
    return sections[0]["questionNumbers"]


def native_adapter_validator(adapter):
    import importlib
    modules = {"claude-native-probe-v1": "claude_adapter",
               "native-localized-generation-v2": "localized_adapter",
               "native-localized-generation-boundary-v3": "localized_boundary_adapter",
               "official-catalogued-native-v1": "official_catalog_adapter",
               "official-pdf-native-scope-v2": "official_pdf_scope_adapter"}
    require(adapter in modules, "unknown_native_adapter")
    return importlib.import_module(modules[adapter]).validate


class NativeReplay:
    """One full original in RAM at a time; VAD CPU only, no recognition/model download."""
    def __init__(self):
        self.source = None
        self.audio = None
        self.cache = {}

    def replay(self, source, probe):
        from faster_whisper.audio import decode_audio
        from faster_whisper.vad import VadOptions, get_speech_timestamps
        raw = probe_contract(probe)
        require(raw["sampleRate"] == 16000, "unsupported_probe_sample_rate")
        if self.source != source["sourceRecordId"]:
            self.audio = decode_audio(source["sourceAudioPath"], sampling_rate=16000)
            self.source = source["sourceRecordId"]
            self.cache = {}
        offset, count = raw["offset"], raw["count"]
        require(integer(offset) and integer(count) and 0 <= offset < offset + count <= len(self.audio) and count <= 120 * 16000, "probe_overflow_or_unbounded")
        key = (offset, count)
        if key not in self.cache:
            pcm = self.audio[offset:offset + count]
            options = probe.get("vadOptions")
            require(options == {"threshold": .5, "minSilenceDurationMs": 200, "speechPadMs": 0}, "unsupported_onset_measurement")
            events = get_speech_timestamps(pcm, VadOptions(threshold=.5, min_silence_duration_ms=200, speech_pad_ms=0), 16000)
            self.cache[key] = {"sourceFrameCount": len(self.audio), "pcmSha256": hashlib.sha256(pcm.tobytes()).hexdigest(), "onsets": [int(e["start"]) for e in events]}
        return self.cache[key]


def shared_native_key(row):
    proof = row["proofKey"]
    if row.get("evidenceAdapter") not in ("native-localized-generation-v2", "native-localized-generation-boundary-v3", "official-catalogued-native-v1", "official-pdf-native-scope-v2"):
        return proof
    # Every generated question has its own separately verified quote mapping.
    # A common passage key retains all common physical head/neighbor identity.
    native = row.get("nativeEvidence", {})
    return {"adapter": proof.get("adapter"), "sourceAudioSha256": row.get("sourceAudioSha256"),
            "scopeQuestionNumbers": row.get("scopeQuestionNumbers"), "cueSpokenNumbers": row.get("cueSpokenNumbers"),
            "nativeClock": {key: native.get(key) for key in ("sampleRate", "channels", "frameCount", "pcmSha256", "startFrame", "onsetFrame")},
            "probe": proof.get("probe"), "nextProbe": proof.get("nextProbe"),
            "probeId": proof.get("probeId"),
            "nextCertificate": {k: (proof.get("nextCertificate") or {}).get(k) for k in ("certificate", "scopeQuestionNumbers", "nativeOnsetFrame", "startMs")},
            "nextOnsetFrame": proof.get("nextOnsetFrame"), "nextSpokenNumbers": proof.get("nextSpokenNumbers")}


def check_order(rows):
    """Rows may be shuffled by generated index. Sort by actual original ordinals."""
    errors = collections.defaultdict(list)
    by_source = collections.defaultdict(list)
    for r in rows:
        if r["status"] == "admitted":
            by_source[r["sourceRecordId"]].append(r)
    for source_rows in by_source.values():
        scopes = collections.defaultdict(list)
        for r in source_rows:
            scopes[tuple(r["scopeQuestionNumbers"])].append(r)
        previous_start, previous_scope = -1, ()
        for scope, group in sorted(scopes.items()):
            starts = {r["audioRange"]["startMs"] for r in group}
            if len(starts) != 1:
                for r in group:
                    errors[r["questionId"]].append("shared_passage_start_mismatch")
            start = min(starts)
            if start <= previous_start or (previous_scope and scope[0] <= previous_scope[-1]):
                for r in group:
                    errors[r["questionId"]].append("original_spoken_order_or_overlapping_scope")
                for r in scopes[previous_scope]:
                    errors[r["questionId"]].append("original_spoken_order_or_overlapping_scope")
            if len(group) > 1 and len(scope) == 1 and not all(r.get("reconstructed") for r in group):
                for r in group:
                    errors[r["questionId"]].append("duplicate_single_question_passage")
            if len(group) > 1:
                native_keys = {json.dumps(shared_native_key(r), sort_keys=True) for r in group}
                if len(native_keys) != 1:
                    for r in group:
                        errors[r["questionId"]].append("shared_passage_evidence_mismatch")
            previous_start, previous_scope = start, scope
    preserved = collections.defaultdict(list)
    for r in rows:
        if r["status"] == "preserved":
            preserved[r["sourceRecordId"]].append(r)
    for r in rows:
        if r["status"] != "admitted":
            continue
        scope, start = r["scopeQuestionNumbers"], r["audioRange"]["startMs"]
        for old in preserved[r["sourceRecordId"]]:
            inherited = old.get("originalScopeEvidence")
            old_scope = inherited["scopeQuestionNumbers"] if inherited else [old["sourceNumber"]]
            old_start = old["audioRange"]["startMs"]
            overlap = bool(set(old_scope) & set(scope))
            bad = (old_scope[-1] < scope[0] and old_start >= start) or (old_scope[0] > scope[-1] and old_start <= start)
            if overlap:
                bad = bad or old_scope != scope or old_start != start
                if inherited:
                    bad = bad or r.get("nativeEvidence", {}).get("onsetFrame") != inherited["onsetFrame"]
            if bad:
                errors[r["questionId"]].append("start_order_conflicts_with_existing_verified")
    return errors


def check_ordinal_chronology(results, sources):
    errors = collections.defaultdict(list)
    for source in sources:
        rows = [r for r in results if r["sourceRecordId"] == source["sourceRecordId"]]
        ordinal_rows = [r for r in rows if r.get("evidenceGrade") == "ordinal_only" and r["status"] == "admitted"]
        if not ordinal_rows:
            continue
        expected = {q["sourceNumber"] for q in source["questions"]}
        recovered = set()
        for r in rows:
            if r["status"] == "admitted":
                recovered.update(r["scopeQuestionNumbers"])
            elif r["status"] == "preserved":
                recovered.add(r["sourceNumber"])
        if recovered != expected:
            for r in ordinal_rows:
                errors[r["questionId"]].append("ordinal_only_complete_source_chronology_missing")
    return errors


def check_dialogue_order(results, sources):
    """An offset first-dialogue proof cannot borrow a neighboring passage."""
    errors = collections.defaultdict(list)
    for source in sources:
        rows = [r for r in results if r["sourceRecordId"] == source["sourceRecordId"]]
        expected = sorted(q["sourceNumber"] for q in source["questions"])
        for row in rows:
            binding = row.get("proofKey", {}).get("dialogueBinding", {})
            if row["status"] == "admitted" and row.get("evidenceAdapter") == "official-pdf-native-scope-v2":
                if not official_native_admission_origin(row):
                    errors[row["questionId"]].append("official_scope_native_order_proof_missing_or_changed")
                continue
            if row["status"] != "admitted" or binding.get("method") != "measured_original_passage_offset_v1":
                continue
            later = [n for n in expected if n > row["scopeQuestionNumbers"][-1]]
            if not later:
                bound_ms = source["audio"]["durationMs"]
            else:
                following = [r for r in rows if (r["status"] == "admitted" and later[0] in r["scopeQuestionNumbers"])
                             or (r["status"] == "preserved" and r["sourceNumber"] == later[0])]
                if not following:
                    errors[row["questionId"]].append("dialogue_offset_next_original_passage_boundary_missing")
                    continue
                bound_ms = min(r["audioRange"]["startMs"] for r in following)
            rate = binding["sampleRate"]
            if not (binding["dialogueOnsetFrame"] * 1000 < bound_ms * rate
                    and binding["selectedEstimatedEndFrame"] * 1000 <= bound_ms * rate):
                errors[row["questionId"]].append("dialogue_probe_beyond_next_original_question")
    return errors


def settle_candidate_order(results, sources):
    """A candidate may depend only on neighbors that survive every order gate."""
    while True:
        errors = check_order(results)
        for qid, reasons in check_dialogue_order(results, sources).items():
            errors[qid].extend(reasons)
        changed = False
        for row in results:
            if row["status"] == "admitted" and row["questionId"] in errors:
                row["status"] = "held"
                row["reasons"].extend(errors[row["questionId"]])
                row.pop("audioRange", None)
                changed = True
        chronology_errors = check_ordinal_chronology(results, sources)
        for row in results:
            if row["status"] == "admitted" and row["questionId"] in chronology_errors:
                row["status"] = "held"
                row["reasons"].extend(chronology_errors[row["questionId"]])
                row.pop("audioRange", None)
                changed = True
        if not changed:
            return


def freeze_inputs(inventory, destination):
    records = []
    for s in inventory["records"]:
        files = {"source": reference(s["sourceAudioPath"]), "asr": reference(s["asrPath"]), "prepared": reference(s["preparedPath"])}
        require(files["source"]["sha256"] == s["sourceAudioSha256"] and files["asr"]["sha256"] == s["asrSha256"] and files["prepared"]["sha256"] == s["preparedSha256"], "inventory_input_hash_mismatch")
        if s.get("alignmentPath"):
            files["alignment"] = reference(s["alignmentPath"])
        prepared = read(s["preparedPath"])
        if prepared.get("originalPreparedPath"):
            files["originalPrepared"] = reference(prepared["originalPreparedPath"])
            require(files["originalPrepared"]["sha256"] == prepared["originalPreparedSha256"], "original_prepared_hash_mismatch")
            original = read(prepared["originalPreparedPath"])
            for file in original.get("sourceFiles", []):
                if file.get("kind") in ("questions", "transcript", "answers") and file.get("path") and file.get("sha256"):
                    key = "original_" + file["kind"]
                    require(key not in files, "duplicate_original_file_kind")
                    files[key] = reference(file["path"])
                    require(files[key]["sha256"] == file["sha256"], "original_official_file_hash_mismatch")
        records.append({"sourceRecordId": s["sourceRecordId"], "files": files})
    immutable_write(destination, {"schemaVersion": 1, "records": records})


def validate_frozen_source(source, manifest):
    require(manifest.get("sourceRecordId") == source["sourceRecordId"], "frozen_source_identity_mismatch")
    files = manifest.get("files")
    require(isinstance(files, dict), "missing_frozen_source_files")
    expected = {"source": (source["sourceAudioPath"], source["sourceAudioSha256"]),
                "asr": (source["asrPath"], source["asrSha256"]),
                "prepared": (source["preparedPath"], source["preparedSha256"])}
    if source.get("alignmentPath"):
        expected["alignment"] = (source["alignmentPath"], None)
    prepared = checked_ref({"path": source["preparedPath"], "sha256": source["preparedSha256"]})
    if prepared.get("originalPreparedPath"):
        expected["originalPrepared"] = (prepared["originalPreparedPath"], prepared["originalPreparedSha256"])
        original = checked_ref({"path": prepared["originalPreparedPath"], "sha256": prepared["originalPreparedSha256"]})
        for file in original.get("sourceFiles", []):
            if file.get("kind") in ("questions", "transcript", "answers") and file.get("path") and file.get("sha256"):
                key = "original_" + file["kind"]
                require(key not in expected, "duplicate_original_file_kind")
                expected[key] = (file["path"], file["sha256"])
    require(set(files) == set(expected), "incomplete_or_extra_frozen_source_files")
    for key, (path, expected_sha) in expected.items():
        ref = files[key]
        require(isinstance(ref, dict) and isinstance(ref.get("path"), str) and Path(ref["path"]).resolve() == Path(path).resolve(), "frozen_source_file_path_mismatch:" + key)
        require(expected_sha is None or ref.get("sha256") == expected_sha, "frozen_source_file_hash_mismatch:" + key)
        require(sha(ref["path"]) == ref.get("sha256"), "frozen_input_changed")


def official_native_admission_origin(row):
    """A named official PDF tier cannot inherit as an ordinary numbered grade."""
    if not isinstance(row, dict) or not isinstance(row.get("proofKey"), dict):
        return False
    proof = row.get("proofKey", {})
    identity = proof.get("officialSourceIdentity", {})
    binding = proof.get("dialogueBinding", {})
    opening = proof.get("nativeFirstOpening", {})
    scope, native = row.get("scopeQuestionNumbers"), row.get("nativeEvidence", {})
    if not all(isinstance(item, dict) for item in (identity, binding, opening, native)):
        return False
    if not (row.get("status") == "admitted" and row.get("reconstructed") is False
            and integer(row.get("sourceNumber")) and 1 <= row["sourceNumber"] <= 50
            and row.get("evidenceGrade") == "official_pdf_native_scope_v2"
            and row.get("evidenceAdapter") == proof.get("adapter") == "official-pdf-native-scope-v2"
            and identity == row.get("originalQuestionIdentity")
            and identity.get("method") in ("exact_original_pdf_placeholder_v2", "exact_original_pdf_native_member_v2")
            and identity.get("questionId") == proof.get("questionId") == row.get("questionId")
            and identity.get("sourceRecordId") == row.get("sourceRecordId")
            and identity.get("sourceNumber") == row.get("sourceNumber")
            and scope == [row.get("sourceNumber")]
            and all(proof.get(k) == row.get(k) for k in ("scopeQuestionNumbers", "cueNumber", "cueSpokenNumbers", "kind"))
            and proof.get("onsetFrame") == native.get("onsetFrame")
            and binding.get("method") == "measured_native_original_next_scope_v2"
            and binding.get("sampleRate") == native.get("sampleRate")
            and binding.get("nextScopeQuestionNumbers") == [scope[-1] + 1]
            and proof.get("nextSpokenNumbers") and proof["nextSpokenNumbers"][0] == scope[-1] + 1
            and integer(proof.get("nextStartFrame")) and integer(proof.get("nextOnsetFrame"))
            and binding.get("nextStartFrame") == proof["nextStartFrame"] < proof["nextOnsetFrame"] == binding.get("nextOnsetFrame")
            and opening.get("method") == "first_literal_native_opening_v2"
            and opening.get("purpose") == ("member_dialogue" if row.get("kind") == "shared_instruction_member" else "first_dialogue")
            and opening.get("maximumInputSeconds") == (14 if row.get("kind") == "shared_instruction_member" else 60)
            and opening.get("probe") == row.get("dialogueProbeEvidence")
            and integer(opening.get("selectedStartFrame")) and integer(opening.get("selectedEndFrame"))
            and native.get("onsetFrame", math.inf) <= opening["selectedStartFrame"] < opening["selectedEndFrame"]
                == binding.get("selectedEstimatedEndFrame") <= proof["nextStartFrame"]
            and binding.get("dialogueOnsetFrame", math.inf) < proof["nextStartFrame"]
            and proof.get("nextProbe") == row.get("nextProbeEvidence")
            and proof.get("nextCertificate") == row.get("nextCertificateEvidence")
            and proof.get("probeCatalog") == row.get("probeCatalog") and proof.get("providerTimingAuthority") is False):
        return False
    if identity["method"] == "exact_original_pdf_placeholder_v2":
        crop = identity.get("crop", {})
        if not (row.get("kind") == "single" and isinstance(crop, dict)
                and isinstance(identity.get("instructionQuote"), str) and identity["instructionQuote"]
                and identity.get("originalEditableQuestionSha256") == identity.get("currentQuestionSha256")
                and isinstance(identity.get("currentQuestionSha256"), str) and len(identity["currentQuestionSha256"]) == 64
                and crop.get("method") == "original_image_preserved" and crop.get("visualSha256")
                and integer(crop.get("width")) and crop["width"] > 0 and integer(crop.get("height")) and crop["height"] > 0):
            return False
    elif row.get("kind") != "shared_instruction_member" or row["sourceNumber"] != 19:
        return False
    refs = proof.get("boundReferences")
    if not isinstance(refs, list) or not refs or not all(isinstance(r, dict) for r in refs):
        return False
    next_ref = row.get("nextProbeEvidence") or (row.get("nextCertificateEvidence") or {}).get("certificate")
    required = [identity.get(k) for k in ("prepared", "originalPrepared", "questionFile", "liveSnapshot")]
    required.extend((row.get("probeEvidence"), row.get("dialogueProbeEvidence"), row.get("probeCatalog"), next_ref))
    for ref in required:
        if not isinstance(ref, dict) or not any(r.get("sha256") == ref.get("sha256") and
                Path(r.get("path", "")).resolve() == Path(ref.get("path", "")).resolve() for r in refs):
            return False
    for ref in refs:
        require(sha(ref["path"]) == ref["sha256"], "ancestor_official_scope_nested_evidence_corruption")
    return True


def reconstructed_admission_origin(row):
    """An additive grade inherits only its own complete, hash-bound proof shape."""
    if row.get("evidenceGrade") == "reconstructed_numbered_probe":
        return bool(row.get("scopeQuestionNumbers")) and integer(row.get("nativeEvidence", {}).get("onsetFrame"))
    from localized_adapter import ADAPTER, END_BOUNDARY_ADAPTER, END_BOUNDARY_GRADE
    boundary_only = row.get("evidenceGrade") == END_BOUNDARY_GRADE
    if row.get("evidenceGrade") != "localized_generation_native" and not boundary_only:
        return False
    proof = row.get("proofKey", {})
    mapping = proof.get("localizedMapping", {})
    claim = row.get("localizedMappingEvidence", {})
    adapter = END_BOUNDARY_ADAPTER if boundary_only else ADAPTER
    next_probe = row.get("nextBoundaryProbeEvidence") if boundary_only else row.get("nextProbeEvidence") or row.get("terminalProbeEvidence")
    if not (row.get("evidenceAdapter") == proof.get("adapter") == adapter
            and row.get("scopeQuestionNumbers") and integer(row.get("nativeEvidence", {}).get("onsetFrame"))
            and proof.get("onsetFrame") == row["nativeEvidence"]["onsetFrame"]
            and all(proof.get(key) == row.get(key) for key in ("scopeQuestionNumbers", "cueNumber", "cueSpokenNumbers", "kind"))
            and integer(proof.get("nextOnsetFrame")) and proof["nextOnsetFrame"] > proof["onsetFrame"]
            and proof.get("providerTimingAuthority") is False
            and mapping.get("method") == claim.get("method") == "exact_generation_anchor_native_v2"
            and mapping.get("questionId") == claim.get("questionId") == row.get("questionId")
            and mapping.get("sourceSegmentIds") == claim.get("sourceSegmentIds")
            and mapping.get("sourceSegmentIds") and mapping.get("quotes")
            and mapping.get("alignment") == claim.get("alignment") == row.get("mappingEvidence", {}).get("alignment")
            and proof.get("probe") == row.get("probeEvidence") and
            proof.get("probeCatalog") == row.get("probeCatalog") and
            proof.get("sharedHeadProbe") == row.get("sharedHeadProbeEvidence") and
            proof.get("nextCertificate") == row.get("nextCertificateEvidence") and
            proof.get("nextProbe") == next_probe):
        return False
    if boundary_only:
        end_identity = proof.get("nextEndIdentity", {})
        if not (proof.get("nextBoundaryKind") == "next_number_first_speech_boundary_v3"
                and end_identity.get("method") == "complete_original_identity_next_end_v3"
                and end_identity.get("maySupplySeekStart") is False
                and end_identity.get("identityMethod") in ("proved_original_shared_instruction_member", "literal_complete_korean_instruction")
                and end_identity.get("probe") == next_probe
                and end_identity.get("nativeEvidence") == row.get("nextBoundaryNativeEvidence")
                and end_identity.get("rawInstructionSegments") == proof.get("nextRawSegments")
                and end_identity.get("rawInstructionSegments")):
            return False
    refs = proof.get("boundReferences")
    if not isinstance(refs, list) or not refs:
        return False
    next_ref = next_probe or (row.get("nextCertificateEvidence") or {}).get("certificate")
    required = [claim.get("alignment"), claim.get("prepared"), row.get("probeEvidence"),
                next_ref, row.get("dialogueProbeEvidence"), row.get("probeCatalog")]
    if row.get("kind") == "shared_instruction_member":
        required.append(row.get("sharedHeadProbeEvidence"))
    for ref in required:
        if not isinstance(ref, dict) or not any(r.get("sha256") == ref.get("sha256") and
                Path(r.get("path", "")).resolve() == Path(ref.get("path", "")).resolve() for r in refs):
            return False
    for ref in refs:
        require(sha(ref["path"]) == ref["sha256"], "ancestor_localized_nested_evidence_corruption")
    return True


def verified_ancestor_rows(inventory, clocks, snapshots, boundary_authority=None, _ancestry_stack=None):
    """Preserve an exact previous adoption while retaining original cue scope."""
    claim = inventory.get("verifiedAncestor")
    if claim is None:
        return {}, None
    require(isinstance(claim, dict) and set(claim) == {"certificate", "inventory", "clock"}, "invalid_verified_ancestor")
    previous = checked_ref(claim["certificate"])
    stack = set(_ancestry_stack or ())
    ancestor_key = (str(Path(claim["certificate"]["path"]).resolve()), claim["certificate"]["sha256"])
    require(ancestor_key not in stack, "cyclic_verified_ancestor_chain")
    stack.add(ancestor_key)
    old_inventory = checked_ref(claim["inventory"])
    old_clock = checked_ref(claim["clock"])
    def same_reference(left, right):
        return isinstance(left, dict) and left.get("sha256") == right.get("sha256") and isinstance(left.get("path"), str) and Path(left["path"]).resolve() == Path(right["path"]).resolve()
    require(previous.get("completeReplay") is True and previous.get("errors") == [] and
            previous.get("humanReviewed") is False and previous.get("writesDatabase") is False and
            previous.get("writesStorage") is False and same_reference(previous.get("inputs", {}).get("inventory"), claim["inventory"]) and
            same_reference(previous.get("inputs", {}).get("clock"), claim["clock"]), "ancestor_is_not_complete_reviewed_source_proof")
    old_snapshot = checked_ref({"path": old_inventory["liveSnapshotPath"], "sha256": old_inventory["liveSnapshotSha256"]})
    old_sources = {s["sourceRecordId"]: s for s in old_inventory["records"]}
    sources = {s["sourceRecordId"]: s for s in inventory["records"]}
    require(len(old_sources) == len(old_inventory["records"]) == len(sources) == len(inventory["records"]) and
            set(old_sources) == set(sources), "ancestor_source_population_differs")
    previous_rows = {(r["sourceRecordId"], r["questionId"]): r for r in previous["records"]}
    expected = {(s["sourceRecordId"], q["id"]) for s in old_sources.values() for q in s["questions"]}
    require(len(previous_rows) == len(previous["records"]) == len(expected) and set(previous_rows) == expected,
            "ancestor_question_population_differs")
    old_docs = {s["id"]: s for s in old_snapshot["snapshots"]}
    new_docs = {s["id"]: s for s in snapshots}
    old_clocks = {s["sourceRecordId"]: s for s in old_clock["records"]}
    new_clocks = {s["sourceRecordId"]: s for s in clocks["records"]}
    require(old_clock.get("completeSourceClockReplay") is True and old_clock.get("inventorySha256") == claim["inventory"]["sha256"] and
            len(old_clocks) == len(old_clock["records"]) == len(old_sources) and set(old_clocks) == set(old_sources),
            "ancestor_physical_clock_population_differs")
    inherited = {}
    scope_origins = {}
    pending_boundaries = {}
    import copy
    for sid, old_source in old_sources.items():
        source = sources[sid]
        require(source["setId"] == old_source["setId"], "ancestor_set_identity_differs")
        old = old_docs[old_source["setId"]]
        expected_doc = copy.deepcopy(old["document"])
        new_count = 0
        for question in expected_doc["groups"][0]["questions"]:
            row = previous_rows[(sid, question["id"])]
            for key, value in (("setId", old_source["setId"]), ("revision", old_source["revision"]),
                               ("documentSha256", old_source["documentSha256"]), ("sourceNumber", question["sourceNumber"]),
                               ("sourceAudioSha256", old_source["sourceAudioSha256"]), ("playbackSha256", old_source["audio"]["sha256"])):
                require(row.get(key) == value, "ancestor_row_identity_differs:" + key)
            if row["status"] == "admitted":
                require(not question.get("audioRange") and row["audioRange"]["endMs"] == source["audio"]["durationMs"],
                        "ancestor_admission_overwrites_original")
                question["audioRange"] = copy.deepcopy(row["audioRange"])
                if row.get("evidenceGrade") == "official_pdf_native_scope_v2":
                    require(official_native_admission_origin(row), "ancestor_official_native_scope_unverified")
                new_count += 1
                if row.get("scopeQuestionNumbers") and integer(row.get("nativeEvidence", {}).get("onsetFrame")):
                    pending_boundaries[(sid, question["id"])] = {"certificate": claim["certificate"],
                        "scopeQuestionNumbers": row["scopeQuestionNumbers"], "onsetFrame": row["nativeEvidence"]["onsetFrame"],
                        "startMs": row["audioRange"]["startMs"]}
                if source["reconstructed"]:
                    require(reconstructed_admission_origin(row), "ancestor_original_scope_unverified")
                    inherited[(sid, question["id"])] = {"method": "previous_complete_source_admission_v1",
                        "certificate": claim["certificate"], "scopeQuestionNumbers": row["scopeQuestionNumbers"],
                        "onsetFrame": row["nativeEvidence"]["onsetFrame"]}
            elif row["status"] == "preserved":
                require(question.get("audioRange") == row.get("audioRange"), "ancestor_previous_range_changed")
                evidence = row.get("originalScopeEvidence")
                if source["reconstructed"] and evidence is not None:
                    require(isinstance(evidence, dict) and evidence.get("method") == "previous_complete_source_admission_v1",
                            "ancestor_preserved_original_scope_method_invalid")
                    origin_ref = evidence.get("certificate")
                    require(isinstance(origin_ref, dict) and isinstance(origin_ref.get("path"), str),
                            "ancestor_preserved_original_scope_reference_missing")
                    origin_key = (str(Path(origin_ref["path"]).resolve()), origin_ref.get("sha256"))
                    if origin_key not in scope_origins:
                        origin = checked_ref(origin_ref)
                        require(origin.get("completeReplay") is True and origin.get("errors") == [] and
                                origin.get("humanReviewed") is False and origin.get("writesDatabase") is False and
                                origin.get("writesStorage") is False, "ancestor_preserved_original_scope_origin_incomplete")
                        scope_origins[origin_key] = origin
                    matches = [r for r in scope_origins[origin_key]["records"]
                               if r["sourceRecordId"] == sid and r["questionId"] == question["id"]]
                    require(len(matches) == 1, "ancestor_preserved_original_scope_origin_not_unique")
                    original = matches[0]
                    require(original.get("status") == "admitted" and reconstructed_admission_origin(original) and
                            all(original.get(key) == row.get(key) for key in
                                ("sourceRecordId", "setId", "questionId", "sourceNumber", "sourceAudioSha256", "playbackSha256", "audioRange")) and
                            evidence.get("scopeQuestionNumbers") == original.get("scopeQuestionNumbers") and
                            evidence.get("onsetFrame") == original.get("nativeEvidence", {}).get("onsetFrame") and
                            integer(evidence.get("onsetFrame")), "ancestor_preserved_original_scope_differs_from_actual_admission")
                    inherited[(sid, question["id"])] = copy.deepcopy(evidence)
                    pending_boundaries[(sid, question["id"])] = {**copy.deepcopy(evidence),
                                                               "startMs": row["audioRange"]["startMs"]}
            else:
                require(row["status"] == "held" and not question.get("audioRange") and not row.get("audioRange"),
                        "ancestor_unproven_existing_range")
        expected_revision = old["revision"] + bool(new_count)
        if new_count:
            expected_doc["revision"] = expected_revision
        require(new_docs[source["setId"]]["document"] == expected_doc and source["revision"] == expected_revision and
                new_docs[source["setId"]]["revision"] == expected_revision, "current_baseline_not_exact_ancestor_adoption")
        projected = copy.deepcopy(source)
        projected["revision"] = old_source["revision"]
        projected["documentSha256"] = old_source["documentSha256"]
        for question in projected["questions"]:
            matching = [q for q in old_source["questions"] if q["id"] == question["id"]]
            require(len(matching) == 1, "ancestor_unknown_current_question")
            question["audioRange"] = matching[0].get("audioRange")
        require(projected == old_source, "ancestor_original_source_content_or_media_changed")
        rebound = copy.deepcopy(new_clocks[sid])
        rebound["revision"] = old_clocks[sid]["revision"]
        rebound["documentSha256"] = old_clocks[sid]["documentSha256"]
        require(rebound == old_clocks[sid], "ancestor_physical_clock_changed")
    if boundary_authority is not None:
        prior_boundaries = {}
        verified_ancestor_rows(old_inventory, old_clock, old_snapshot["snapshots"], prior_boundaries, stack)
        prior_boundaries.update(pending_boundaries)
        boundary_authority.update(prior_boundaries)
    return inherited, claim["certificate"]


def run(inventory_path, marks_paths, clock_path, frozen_path, output, native_replay=None, report_progress=False, source_replay_factory=None):
    started = time.monotonic()
    implementation = [reference(p) for p in sorted(Path(__file__).parent.iterdir()) if p.suffix in (".py", ".mts", ".md")]
    inventory_ref = reference(inventory_path)
    inventory = checked_ref(inventory_ref)
    inv_hash = inventory_ref["sha256"]
    require(sha(inventory["liveSnapshotPath"]) == inventory["liveSnapshotSha256"], "frozen_live_snapshot_corruption")
    snapshot_ref = {"path": inventory["liveSnapshotPath"], "sha256": inventory["liveSnapshotSha256"]}
    snapshot_rows = checked_ref(snapshot_ref)["snapshots"]
    snapshots = {s["id"]: s for s in snapshot_rows}
    require(len(snapshots) == len(snapshot_rows), "duplicate_frozen_document")
    clock_ref = reference(clock_path)
    clocks = checked_ref(clock_ref)
    require(clocks.get("inventorySha256") == inv_hash, "clock_wrong_inventory")
    trusted_boundaries = {}
    inherited_original_scopes, ancestor_ref = verified_ancestor_rows(inventory, clocks, snapshot_rows, trusted_boundaries)
    clock_index = {s["sourceRecordId"]: s for s in clocks["records"]}
    frozen_ref = reference(frozen_path)
    frozen_rows = checked_ref(frozen_ref)["records"]
    frozen = {s["sourceRecordId"]: s for s in frozen_rows}
    source_ids = {s["sourceRecordId"] for s in inventory["records"]}
    require(len(source_ids) == len(inventory["records"]), "duplicate_inventory_source")
    require(len(clock_index) == len(clocks["records"]) and set(clock_index) == source_ids, "incomplete_or_duplicate_source_clocks")
    require(len(frozen) == len(frozen_rows) and set(frozen) == source_ids, "incomplete_or_duplicate_frozen_sources")
    queues, rows, errors, provenance = {}, {}, [], {}
    references = {"inventory": inventory_ref, "liveSnapshot": reference(inventory["liveSnapshotPath"]), "clock": clock_ref, "frozen": frozen_ref}
    if ancestor_ref:
        references.update({"ancestorCertificate": ancestor_ref, "ancestorInventory": inventory["verifiedAncestor"]["inventory"],
                           "ancestorClock": inventory["verifiedAncestor"]["clock"]})
        known = {(str(Path(ref["path"]).resolve()), ref["sha256"]) for ref in references.values()}
        for evidence in inherited_original_scopes.values():
            ref = evidence["certificate"]
            key = (str(Path(ref["path"]).resolve()), ref["sha256"])
            if key not in known:
                references["ancestorScope:" + str(len(known))] = ref
                known.add(key)
    expected = {(s["sourceRecordId"], q["id"]): (s, q) for s in inventory["records"] for q in s["questions"]}
    require(len(expected) == sum(len(s["questions"]) for s in inventory["records"]), "duplicate_inventory_question")
    for p in marks_paths:
        queue_ref = reference(p)
        queue = checked_ref(queue_ref)
        provider = queue.get("provider")
        require(provider in ("claude", "grok") and provider not in queues, "duplicate_or_unknown_provider_queue")
        queues[provider] = queue
        references[provider] = queue_ref
        provenance[provider] = queue_provenance(queue, queue_ref)
        for i, ref in enumerate(provenance[provider].get("upstreamArtifacts", [])):
            references[f"{provider}:upstream:{i}"] = ref
        if not integer(queue.get("schemaVersion")) or queue.get("schemaVersion") != 1 or not integer(queue.get("evidenceContractVersion")) or queue.get("evidenceContractVersion") != 1 or queue.get("inventorySha256") != inv_hash:
            errors.append(f"queue_contract_or_inventory_mismatch:{provider}")
        require(isinstance(queue.get("records"), list), "missing_provider_rows")
        for row in queue["records"]:
            key = (row.get("sourceRecordId"), row.get("questionId"))
            if key not in expected:
                errors.append(f"extra_question_row:{provider}:{key}")
                continue
            if expected[key][0]["assignedAgent"] != provider:
                errors.append(f"wrong_provider_row:{provider}:{key}")
            if key in rows:
                errors.append(f"duplicate_question_row:{key}")
                rows[key] = None
            else:
                rows[key] = row
    native_replay = native_replay or NativeReplay()
    results = []
    preservation = []
    source_checks = []
    for source in inventory["records"]:
        sid = source["sourceRecordId"]
        source_error = None
        try:
            snap = snapshots.get(source["setId"])
            require(snap and snap["revision"] == source["revision"], "stale_frozen_revision")
            groups = snap["document"]["groups"]
            require(len(groups) == 1 and groups[0]["id"] == source["groupId"] and groups[0]["audio"] == source["audio"], "wrong_whole_original_group")
            live_questions = {q["id"]: q for q in groups[0]["questions"]}
            require(set(live_questions) == {q["id"] for q in source["questions"]}, "frozen_question_identity_mismatch")
            for q in source["questions"]:
                require(all(live_questions[q["id"]].get(k) == q.get(k) for k in ("sourceNumber", "prompt", "evidence", "metadata", "audioRange")), "frozen_current_question_content_mismatch")
            validate_frozen_source(source, frozen[sid])
            require(sha(source["asrPath"]) == source["asrSha256"] and sha(source["preparedPath"]) == source["preparedSha256"] and sha(source["sourceAudioPath"]) == source["sourceAudioSha256"], "input_corruption")
            asr = checked_ref({"path": source["asrPath"], "sha256": source["asrSha256"]})
            duration = validate_clock(clock_index.get(sid, {}), source, asr)
            index = index_segments(asr, duration)
        except (InvalidEvidence, OSError, KeyError, TypeError, ValueError) as e:
            source_error = str(e)
            index = {}
        source_checks.append({"sourceRecordId": sid, "status": "held" if source_error else "passed", "reason": source_error})
        adapter_replay = None
        adapter_error = None
        source_rows = [rows.get((sid, q["id"])) for q in source["questions"]]
        if not source_error and any(r and r.get("status") == "candidate" and r.get("probeEvidence") for r in source_rows):
            try:
                from claude_adapter import SourceReplay
                adapter_replay = (source_replay_factory or SourceReplay)(inventory["root"], source, clock_index[sid], source_rows)
                adapter_replay.current_snapshot_ref = references["liveSnapshot"]
                adapter_replay.current_snapshot_document = snapshots[source["setId"]]
                adapter_replay.trusted_boundaries = {qid: evidence for (source_id, qid), evidence in trusted_boundaries.items()
                                                     if source_id == sid}
            except (InvalidEvidence, OSError, KeyError, TypeError, ValueError, subprocess.SubprocessError) as e:
                adapter_error = str(e)
        for question in source["questions"]:
            key = (sid, question["id"])
            row = rows.get(key)
            result = {"sourceRecordId": sid, "setId": source["setId"], "revision": source["revision"], "documentSha256": source["documentSha256"],
                      "questionId": question["id"], "sourceNumber": question["sourceNumber"], "provider": source["assignedAgent"],
                      "sourceAudioSha256": source["sourceAudioSha256"], "playbackSha256": source["audio"]["sha256"], "status": "held", "reasons": []}
            result["reconstructed"] = source["reconstructed"]
            old = question.get("audioRange")
            if old:
                result.update(status="preserved", audioRange=old.copy(), reasons=[])
                if key in inherited_original_scopes:
                    result["originalScopeEvidence"] = inherited_original_scopes[key]
                preservation.append({"sourceRecordId": sid, "questionId": question["id"], "audioRange": old.copy()})
                if row is None:
                    errors.append(f"missing_existing_verified_row:{key}")
                else:
                    try:
                        validate_identity(row, source, question)
                        require(row["status"] == "existing_verified" and row["seekStartMs"] == old["startMs"] and row.get("seekEndMs", old["endMs"]) == old["endMs"], "existing_verified_changed")
                    except (InvalidEvidence, OSError, ValueError, TypeError, KeyError) as e:
                        errors.append(f"existing_preservation_error:{key}:{e}")
                results.append(result)
                continue
            try:
                require(row is not None, "omitted_or_duplicate_question_row")
                validate_identity(row, source, question)
                require(row["status"] != "existing_verified", "fabricated_existing_verification")
                if row["status"] == "held":
                    require(isinstance(row.get("reasons"), list) and row["reasons"], "held_without_diagnostics")
                    raise InvalidEvidence("provider_held:" + "|".join(str(r) for r in row["reasons"]))
                require(not source_error, f"source_replay_failed:{source_error}")
                n = row.get("nativeEvidence", {})
                require(isinstance(n, dict), "missing_native_evidence")
                require(not source["reconstructed"] or row.get("probeEvidence"), "reconstructed_requires_explicit_native_adapter_v2")
                if row.get("probeEvidence"):
                    require(adapter_replay is not None, "native_adapter_replay_failed:" + str(adapter_error))
                    adapter = row.get("evidenceAdapter", "claude-native-probe-v1")
                    validate_adapter = native_adapter_validator(adapter)
                    proof_key, native_segments, grade, original_identity = validate_adapter(row, source, question, clock_index[sid], adapter_replay, index)
                    full_cues = select_segments(index, row["cueSegmentIds"], allow_uncertain=True) if row["cueSegmentIds"] else []
                    anchors = select_segments(index, row["anchorSegmentIds"], allow_uncertain=True) if row["anchorSegmentIds"] else []
                else:
                    full_cues, anchors = full_asr_passage(index, row)
                    probe = checked_ref(n.get("probe"))
                    check_legacy_probe_transport(probe)
                    replay = native_replay.replay(source, probe)
                    native_cues, native_index = validate_native(row, source, probe, replay)
                    if row.get("startEvidence", {}).get("method") == "official_alignment":
                        validate_official_alignment(row, source, native_index, index)
                    else:
                        validate_scope(row, source, native_cues, full_cues)
                    proof_key = {"probe": n["probe"], "cueProbeSegmentIds": n["cueProbeSegmentIds"], "cueOnsetFrame": n["cueOnsetFrame"]}
                    native_segments = native_cues
                    grade, original_identity = "official_alignment" if row.get("startEvidence", {}).get("method") == "official_alignment" else "numbered_probe", None
                if row.get("evidenceAdapter") not in ("native-localized-generation-v2", "native-localized-generation-boundary-v3"):
                    validate_mapping(row, source, question, index)
                observed = diagnostic_segments(row, index)
                require(0 <= row["seekStartMs"] < source["audio"]["durationMs"], "invalid_seek_range")
                require(row.get("seekEndMs", source["audio"]["durationMs"]) == source["audio"]["durationMs"], "continuation_must_end_at_full_original")
                result.update(status="admitted", audioRange={"startMs": row["seekStartMs"], "endMs": source["audio"]["durationMs"]},
                              cueNumber=row["cueNumber"], scopeQuestionNumbers=row["scopeQuestionNumbers"],
                              proofKey=proof_key,
                              rawEstimates=[{k: s[k] for k in ("id", "text", "estimatedStartSeconds", "estimatedEndSeconds", "uncertain")} for s in full_cues + anchors],
                              diagnosticRawEstimates=[s.copy() for s in observed],
                              nativeEvidence=n, probeEvidence=row.get("probeEvidence"), rawNativeSegments=native_segments, evidenceGrade=grade,
                              originalQuestionIdentity=original_identity, cueSpokenNumbers=row.get("cueSpokenNumbers"),
                              mappingEvidence=row.get("mappingEvidence"), scriptEvidence=row.get("scriptEvidence"),
                              dialogueProbeEvidence=row.get("dialogueProbeEvidence"), nextProbeEvidence=row.get("nextProbeEvidence"),
                              nextBoundaryProbeEvidence=row.get("nextBoundaryProbeEvidence"), nextBoundaryNativeEvidence=row.get("nextBoundaryNativeEvidence"),
                              terminalProbeEvidence=row.get("terminalProbeEvidence"), sharedHeadProbeEvidence=row.get("sharedHeadProbeEvidence"),
                              nextCertificateEvidence=row.get("nextCertificateEvidence"),
                              officialTerminalEvidence=row.get("officialTerminalEvidence"),
                              probeCatalog=row.get("probeCatalog"), nextNativeEvidence=row.get("nextNativeEvidence"),
                              sharedHeadNativeEvidence=row.get("sharedHeadNativeEvidence"), terminalNativeEvidence=row.get("terminalNativeEvidence"),
                              evidenceAdapter=row.get("evidenceAdapter"), localizedMappingEvidence=row.get("localizedMappingEvidence"), reasons=[],
                              kind=row.get("kind"),
                              diagnostics=(row.get("reasons", []) + row.get("notes", [])))
            except (InvalidEvidence, OSError, KeyError, ValueError, TypeError, ImportError) as e:
                result["reasons"].append(str(e))
            results.append(result)
        if report_progress and (len(source_checks) % 10 == 0 or len(source_checks) == len(inventory["records"]) or source_error):
            print(json.dumps({"progress": {"processedSources": len(source_checks), "totalSources": len(inventory["records"]),
                                         "lastSourceRecordId": sid, "processedQuestions": len(results),
                                         "outcomesBeforeOrderChecks": dict(collections.Counter(r["status"] for r in results)),
                                         "elapsedSeconds": round(time.monotonic() - started, 2)}}), file=sys.stderr, flush=True)
    settle_candidate_order(results, inventory["records"])
    omitted = set(expected) - set(rows)
    errors.extend(f"omitted_question_row:{key}" for key in sorted(omitted))
    complete = set(queues) == {s["assignedAgent"] for s in inventory["records"]} and not errors and len(rows) == len(expected)
    for ref in list(references.values()) + implementation:
        require(sha(ref["path"]) == ref["sha256"], "replay_input_or_implementation_changed_during_run")
    for result in results:
        for ref in result.get("proofKey", {}).get("boundReferences", []):
            require(sha(ref["path"]) == ref["sha256"], "nested_native_evidence_changed_during_run")
    certificate = {"schemaVersion": 1, "evidenceContractVersion": 1, "completeReplay": complete,
                   "productionApplicationAuthorized": False, "writesDatabase": False, "writesStorage": False, "writesMedia": False, "humanReviewed": False,
                   "inputs": references, "implementation": implementation, "producerProvenance": provenance,
                   "counts": {"sources": len(inventory["records"]), "questions": len(results), "providers": dict(collections.Counter(r["provider"] for r in results)), "outcomes": dict(collections.Counter(r["status"] for r in results)),
                              "evidenceGrades": dict(collections.Counter(r.get("evidenceGrade") for r in results if r["status"] == "admitted"))},
                   "preservedExisting": preservation, "sourceChecks": source_checks, "errors": errors, "records": results}
    held = [r for r in results if r["status"] == "held"]
    immutable_write(Path(output) / "held-diagnostics.json", {"counts": dict(collections.Counter(reason.split(":")[0] for r in held for reason in r["reasons"])), "records": held, "errors": errors})
    immutable_write(Path(output) / "certificate.json", certificate)
    print(json.dumps({"completeReplay": complete, "counts": certificate["counts"], "errors": len(errors), "certificate": str(Path(output) / "certificate.json")}))
    return certificate


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inventory", required=True)
    parser.add_argument("--marks", action="append", default=[])
    parser.add_argument("--clock")
    parser.add_argument("--frozen", required=True)
    parser.add_argument("--output")
    parser.add_argument("--freeze", action="store_true")
    args = parser.parse_args()
    if args.freeze:
        freeze_inputs(read(args.inventory), args.frozen)
        return
    require(args.clock and args.output, "clock_and_output_required")
    run(args.inventory, args.marks, args.clock, args.frozen, args.output, report_progress=True)


if __name__ == "__main__":
    main()
