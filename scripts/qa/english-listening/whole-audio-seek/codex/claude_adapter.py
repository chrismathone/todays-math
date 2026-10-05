"""Explicit claude-native-probe-v1 adapter, independently replayed from source."""
import base64
import collections
import hashlib
import io
import json
import math
import re
import struct
import subprocess
import unicodedata
import wave
from pathlib import Path

import verifier as v


SPELLED = {"일": 1, "이": 2, "삼": 3, "사": 4, "오": 5, "육": 6, "칠": 7, "팔": 8, "구": 9, "십": 10,
           "십일": 11, "십이": 12, "십삼": 13, "십사": 14, "십오": 15, "십육": 16, "십칠": 17, "십팔": 18, "십구": 19, "이십": 20}


def leading_cue(text):
    text = re.sub(r"^[\s\"'“”‘’.,·\-–—(\[]+", "", text)
    numbers = []
    for i in range(2):
        match = re.match(r"^(\d{1,2}|이십|십[일이삼사오육칠팔구]?|[일이삼사오육칠팔구])\s*번", text)
        if not match:
            break
        value = int(match[1]) if match[1].isdigit() else SPELLED[match[1]]
        if not 1 <= value <= 50:
            return None, text
        numbers.append(value)
        text = text[match.end():]
        if i == 0:
            joined = re.match(r"^\s*(?:과|와|,|그리고|하고|부터|에서|~|～|-)\s*", text)
            if joined:
                text = text[joined.end():]
            else:
                break
    return (numbers or None), text.lstrip(" .,:;까지입니다")


def compact(text):
    return re.sub(r"[^0-9a-z가-힣]", "", unicodedata.normalize("NFKC", str(text)).lower())


def coverage(official, raw):
    want, have = compact(official), compact(raw)
    a = collections.Counter(want[i:i+2] for i in range(len(want)-1))
    b = collections.Counter(have[i:i+2] for i in range(len(have)-1))
    return sum(min(n, b[g]) for g, n in a.items()) / sum(a.values()) if a else 0


def korean_sentence(text):
    text = text.strip()
    match = re.match(r"^.*?[가-힣]\s*[.?]", text)
    if match:
        return match[0].strip()
    return re.split(r"\s+(?:[A-Z][A-Za-z.' ]*:|_{3,})", text, maxsplit=1)[0].strip()


def own_instruction(question):
    text = re.sub(r"원본 문제지\s*\d+번 문항", " ", question.get("prompt", ""))
    instruction = question.get("instruction")
    if instruction and text.strip().startswith(instruction):
        text = text.strip()[len(instruction):]
    return korean_sentence(text) if re.search(r"[가-힣]", text) else ""


def original_question_identity(source, question):
    """Bind an official ordinal to actual original question-file bytes, including image-only questions."""
    v.require(not source["reconstructed"] and question.get("metadata", {}).get("origin") == "official_original", "ordinal_only_requires_original_official_question")
    v.require(question["metadata"].get("sourceNumber") == question["sourceNumber"], "official_original_number_mismatch")
    native = v.read(source["preparedPath"])
    expected = native.get("sourceQuestionPdfSha256")
    v.require(expected and expected == question["metadata"].get("sourceQuestionSha256"), "official_original_question_hash_mismatch")
    original_ref = {"path": native.get("originalPreparedPath"), "sha256": native.get("originalPreparedSha256")}
    original = v.checked_ref(original_ref)
    files = [f for f in original.get("sourceFiles", []) if f.get("kind") == "questions"]
    v.require(len(files) == 1 and files[0].get("sha256") == expected and v.sha(files[0]["path"]) == expected, "official_original_question_file_corruption")
    questions = [q for q in native.get("questions", []) if q.get("questionId") == question["id"]]
    v.require(len(questions) == 1 and questions[0].get("sourceNumber") == question["sourceNumber"], "official_original_question_identity_mismatch")
    return {"questionFile": {"path": files[0]["path"], "sha256": expected}, "originalPrepared": original_ref}


def original_transcript(source):
    native = v.read(source["preparedPath"])
    original = v.checked_ref({"path": native.get("originalPreparedPath"), "sha256": native.get("originalPreparedSha256")})
    return "\n".join(g["transcript"]["text"] for g in original["editableInput"]["groups"])


def original_script_markers(source, text):
    """Select a complete ordered literal source style, excluding incidental dates."""
    expected = sorted(q["sourceNumber"] for q in source["questions"])
    v.require(expected and len(expected) == len(set(expected)), "official_transcript_numbering_not_unique")
    for pattern in (r"(?:^|\s)(\d{1,2})번(?=\s)", r"(?:^|\s)(\d{1,2})[ \t]*\.(?=\s)"):
        markers = list(re.finditer(pattern, text))
        groups = {n: [m for m in markers if int(m[1]) == n] for n in expected}
        if any(len(group) > 1 for group in groups.values()):
            continue
        missing = {n for n in expected if not groups[n]}
        joint = []
        shared_markers = list(re.finditer(r"[\[【]\s*(\d{1,2})\s*[-~～]\s*(\d{1,2})\s*[\]】]", text))
        for m in shared_markers:
            numbers = [int(m[1]), int(m[2])]
            peers = [q for q in source["questions"] if q["sourceNumber"] in numbers]
            instructions = [q.get("instruction") for q in peers if q.get("instruction")]
            if (numbers[1] == numbers[0] + 1 and set(numbers) <= missing and len(peers) == 2 and instructions
                    and all(i == instructions[0] for i in instructions) and re.search(r"물음에\s*답하", instructions[0])
                    and v.normalize(instructions[0]) in v.normalize(text[m.end():m.end() + 200])):
                v.require(sum(int(x[1]) == numbers[0] and int(x[2]) == numbers[1] for x in shared_markers) == 1, "official_transcript_numbering_not_unique")
                joint.append(m)
                for n in numbers:
                    groups[n] = [m]
                missing.difference_update(numbers)
        if not missing:
            positions = [groups[n][0].start() for n in expected]
            if positions == sorted(positions):
                return sorted(markers + joint, key=lambda m: m.start())
    raise v.InvalidEvidence("official_transcript_numbering_not_unique")


def instruction_head_from_transcript(source, question, claim):
    text = original_transcript(source)
    markers = original_script_markers(source, text)
    matches = [m for m in markers if int(m[1]) == question["sourceNumber"]]
    v.require(len(matches) == 1, "official_transcript_numbering_not_unique")
    marker = matches[0]
    after = text[marker.end():]
    speaker = re.search(r"(?:^|\s)(?:M|W|B|G|Man|Woman|Boy|Girl)\s*:", after)
    v.require(speaker and speaker.start() > 0, "official_transcript_instruction_missing")
    instruction = after[:speaker.start()].strip()
    instruction = re.sub(r"(?:\s*\[[^\]]{1,100}\]\s*)+$", "", instruction).strip()
    v.require(claim.get("source") == "official_transcript_section_head" and claim.get("text") == instruction, "official_transcript_instruction_quote_mismatch")
    return instruction


def checked_probe(row, source, field="probeEvidence"):
    evidence = row.get(field)
    v.require(isinstance(evidence, dict), "missing_bounded_native_probe")
    container = v.checked_ref(evidence)
    v.require(container.get("sourceRecordId") == source["sourceRecordId"] and container.get("sourceAudioSha256") == source["sourceAudioSha256"], "bounded_probe_wrong_source")
    v.require(Path(container.get("sourceAudioPath", "")).resolve() == Path(source["sourceAudioPath"]).resolve(), "bounded_probe_wrong_source_path")
    v.require(container.get("originalAudioModified") is False and container.get("humanReviewed") is False, "probe_original_or_review_mutation")
    found = [p for p in container.get("probes", []) if p.get("id") == evidence.get("probeId")]
    v.require(len(found) == 1, "unknown_or_duplicate_probe_id")
    request = v.checked_ref({"path": container.get("requestPath"), "sha256": container.get("requestSha256")})
    source_requests = [s for s in request.get("sources", []) if s.get("sourceRecordId") == source["sourceRecordId"]]
    v.require(len(source_requests) == 1 and source_requests[0]["sourceAudioSha256"] == source["sourceAudioSha256"], "probe_request_wrong_source")
    wanted = [p for p in source_requests[0].get("probes", []) if p.get("id") == evidence.get("probeId")]
    v.require(len(wanted) == 1, "probe_not_in_frozen_request")
    probe = found[0]
    for k in ("startFrame", "frameCount", "onsetFrame", "quietBeforeFrames"):
        v.require(probe.get(k) == wanted[0].get(k), f"raw_probe_request_bounds:{k}")
    return container, probe


def checked_full_pcm(container, actual, reason):
    pcm = container.get("nativePcm")
    v.require(isinstance(pcm, dict), reason)
    for key in ("sampleRate", "channels", "frameCount"):
        v.require(v.integer(pcm.get(key)) and pcm[key] == actual[key], reason)
    v.require(pcm.get("sha256") == actual["pcmSha256"], reason)
    if "durationMs" in pcm:
        v.require(v.integer(pcm["durationMs"]) and pcm["durationMs"] == actual.get("durationMs"), reason + ":durationMs")
    if "energySha256" in pcm:
        v.require(pcm["energySha256"] == actual.get("energySha256"), reason + ":energySha256")


def probe_segments(probe, *, max_duration=14):
    duration = probe.get("durationSeconds")
    v.require(type(duration) in (int, float) and math.isfinite(duration) and 0 < duration <= max_duration, "invalid_bounded_probe_duration")
    v.require(probe.get("overflow") is False, "raw_probe_overflow")
    converted = []
    for s in probe.get("segments", []):
        v.require(0 <= s.get("localStartSeconds", -1) < s.get("localEndSeconds", -1) <= duration, "raw_probe_segment_overflow")
        for w in s.get("words", []):
            v.require(all(type(w.get(k)) in (int, float) and math.isfinite(w[k]) for k in ("localStartSeconds", "localEndSeconds")), "invalid_raw_word_bounds")
            v.require(0 <= w.get("localStartSeconds", -1) <= w.get("localEndSeconds", -1) <= duration, "raw_probe_word_overflow")
            v.require(type(w.get("probability")) in (int, float) and math.isfinite(w["probability"]) and 0 <= w["probability"] <= 1, "invalid_raw_word_probability")
        converted.append({**s, "estimatedStartSeconds": s["localStartSeconds"], "estimatedEndSeconds": s["localEndSeconds"]})
    return v.index_segments({"segments": converted}, duration)


class SourceReplay:
    def __init__(self, root, source, clock, rows):
        wanted = {}
        for row in rows:
            if row and row.get("status") == "candidate":
                for field in ("probeEvidence", "dialogueProbeEvidence"):
                    if row.get(field):
                        try:
                            _, p = checked_probe(row, source, field)
                            key = f"{p['startFrame']}:{p['frameCount']}"
                            wanted[key] = {"id": key, "startFrame": p["startFrame"], "frameCount": p["frameCount"],
                                           "maxDurationSeconds": 60 if field == "dialogueProbeEvidence" and p.get("purpose") == "first_dialogue" else 14}
                        except (v.InvalidEvidence, OSError, ValueError, KeyError, TypeError):
                            pass  # Invalid rows are diagnosed individually.
        spec = {"root": root, "source": source, "clock": clock, "probes": list(wanted.values())}
        script = Path(__file__).with_name("native-windows.mts")
        cli = Path(root) / "node_modules/tsx/dist/cli.mjs"
        completed = subprocess.run(["node", str(cli), str(script)], input=json.dumps(spec).encode("utf-8"), capture_output=True, timeout=180)
        v.require(completed.returncode == 0, "native_cpu_source_replay_failed:" + completed.stderr.decode("utf-8", errors="replace")[-1000:])
        self.actual = json.loads(completed.stdout)
        self.energy = [x[0] for x in struct.iter_unpack("<d", base64.b64decode(self.actual.pop("energyBase64")))]
        self.clips = {p["id"]: p for p in self.actual.pop("probes")}
        self.mono = {}

    def replay(self, probe):
        key = f"{probe['startFrame']}:{probe['frameCount']}"
        v.require(key in self.clips, "unrequested_native_probe")
        clip = self.clips[key]
        if key not in self.mono:
            from faster_whisper.audio import decode_audio
            from faster_whisper.vad import VadOptions, get_speech_timestamps
            pcm = base64.b64decode(clip["pcmBase64"])
            memory = io.BytesIO()
            with wave.open(memory, "wb") as wav:
                wav.setnchannels(self.actual["channels"])
                wav.setsampwidth(2)
                wav.setframerate(self.actual["sampleRate"])
                wav.writeframes(pcm)
            memory.seek(0)
            mono = decode_audio(memory, sampling_rate=16000)
            events = get_speech_timestamps(mono, VadOptions(threshold=.5, min_silence_duration_ms=200, speech_pad_ms=0), 16000)
            self.mono[key] = {"inputMonoFloat32Sha256": hashlib.sha256(mono.tobytes()).hexdigest(), "inputSampleCount": len(mono),
                              "cpuVad": {"sampleRate": 16000, "threshold": .5, "minSilenceDurationMs": 200, "speechPadMs": 0,
                                         "estimatedSpeechStarts": [int(e["start"]) for e in events]}}
            clip.pop("pcmBase64", None)
        return {**clip, **self.mono[key]}


def measured_onset(native, replay):
    actual, energy = replay.actual, replay.energy
    rate, wf = actual["sampleRate"], actual["windowFrames"]
    onset, start = native.get("onsetFrame"), native.get("startFrame")
    v.require(v.integer(onset) and v.integer(start) and 0 <= start < onset < actual["frameCount"], "native_start_or_onset_overflow")
    v.require(onset % wf == start % wf == 0, "native_start_off_measured_window_grid")
    method = native.get("onsetMethod", "absolute_energy_v2")
    v.require(method in ("absolute_energy_v2", "noise_floor_contrast_v1", "noise_floor_contrast_1second_v1"), "unsupported_native_onset_method")
    if method in ("noise_floor_contrast_v1", "noise_floor_contrast_1second_v1"):
        from noise_floor import verify
        threshold = verify(native, replay)
    else:
        threshold = wf * 32768 ** 2 * 10 ** (-50 / 10)
    window = onset // wf
    v.require(window < len(energy) and energy[window] >= threshold, "native_onset_is_not_sound")
    quiet = 0
    for i in range(window - 1, -1, -1):
        if energy[i] >= threshold:
            break
        quiet += 1
    v.require(quiet >= 5 and native.get("quietBeforeFrames") == quiet * wf, "native_quiet_lead_mismatch")
    # The start-only v2 policy permits a measured 100-400ms lead after bridge
    # music. The numbered recognition, not an island or dialogue-end cut, must
    # establish that this sound is the actual spoken cue.
    v.require(onset - start == min(20, quiet) * wf, "native_start_not_measured_quiet_lead")
    maximum = max(energy[start // wf:window])
    peak = 10 * math.log10(maximum / wf / 32768 ** 2) if maximum > 0 else None
    claimed = native.get("leadPeakDbfs")
    v.require((peak is None and claimed is None) or (type(claimed) in (int, float) and peak is not None and abs(claimed - peak) < 1e-8), "native_quiet_peak_mismatch")


def english_words(text):
    return re.findall(r"[a-z0-9]+(?:'[a-z]+)?", unicodedata.normalize("NFKC", text).lower().replace("’", "'"))


def dialogue_offset_binding(row, probe, dialogue_probe, replay):
    """A separately measured first-dialogue probe stays in the numbered passage."""
    rate = replay.actual["sampleRate"]
    for key in ("sampleRate", "channels", "startFrame", "onsetFrame", "frameCount", "quietBeforeFrames"):
        v.require(v.integer(dialogue_probe.get(key)), "dialogue_probe_invalid_native_integer:" + key)
    v.require(dialogue_probe["sampleRate"] == rate and dialogue_probe["channels"] == replay.actual["channels"], "dialogue_probe_wrong_native_clock")
    offset = dialogue_probe["startFrame"] - probe["startFrame"]
    if offset == 0:
        v.require(dialogue_probe["onsetFrame"] == probe["onsetFrame"], "dialogue_probe_not_same_original_onset")
        claimed = (row.get("dialogueProbeEvidence") or {}).get("offsetFromStartFrames", 0)
        v.require(v.integer(claimed) and claimed == 0, "dialogue_probe_offset_mismatch")
        return {"method": "same_original_onset", "offsetFromStartFrames": 0,
                "sampleRate": rate, "dialogueStartFrame": dialogue_probe["startFrame"], "dialogueOnsetFrame": dialogue_probe["onsetFrame"]}
    evidence = row.get("dialogueProbeEvidence") or {}
    claimed = evidence.get("offsetFromStartFrames")
    v.require(v.integer(claimed) and claimed == offset, "dialogue_probe_offset_mismatch")
    seconds = 6 if row.get("kind") == "shared_instruction_member" else 20
    v.require(0 < offset <= seconds * rate and dialogue_probe["startFrame"] >= probe["onsetFrame"]
              and 0 < dialogue_probe["onsetFrame"] - probe["onsetFrame"] <= seconds * rate,
              "dialogue_probe_offset_outside_original_passage_limit")
    wf = replay.actual["windowFrames"]
    start, onset = dialogue_probe["startFrame"], dialogue_probe["onsetFrame"]
    v.require(0 <= start < onset < start + dialogue_probe["frameCount"] <= replay.actual["frameCount"], "dialogue_probe_source_overflow")
    v.require(start % wf == onset % wf == 0, "dialogue_probe_onset_off_native_grid")
    bins = replay.energy[start // wf:onset // wf]
    v.require(bins, "dialogue_probe_quiet_lead_missing")
    maximum = max(bins)
    peak = 10 * math.log10(maximum / wf / 32768 ** 2) if maximum > 0 else None
    measured_onset({"startFrame": start, "onsetFrame": onset, "quietBeforeFrames": dialogue_probe["quietBeforeFrames"],
                    "leadPeakDbfs": peak}, replay)
    return {"method": "measured_original_passage_offset_v1", "offsetFromStartFrames": offset,
            "sampleRate": rate, "dialogueStartFrame": start, "dialogueOnsetFrame": onset,
            "dialogueQuietBeforeFrames": dialogue_probe["quietBeforeFrames"], "dialogueLeadPeakDbfs": peak}


SPEAKER = r"(?:^|\s)(?:M|W|B|G|Man|Woman|Boy|Girl)\s*:\s*"


def original_turns(body, source_start):
    """Select actual original turns, retaining exact text/character positions."""
    speakers = list(re.finditer(SPEAKER, body))
    turns = []
    for i, speaker in enumerate(speakers):
        last = speakers[i + 1].start() if i + 1 < len(speakers) else len(body)
        raw = body[speaker.end():last]
        # Blank printed answers and bracketed nonspoken stage directions are
        # source structure, not a short actual utterance that may be skipped.
        blank = re.sub(r"\[[^\]]{1,100}\]", "", raw)
        if re.fullmatch(r"[\s_＿]*", blank):
            continue
        lead = re.match(r"^\s*(?:\[[^\]]{1,100}\]\s*)*", raw).end()
        begin = speaker.end() + lead
        end = last
        while end > begin and body[end - 1].isspace():
            end -= 1
        turns.append({"speaker": speaker, "text": body[begin:end],
                      "startCharacter": source_start + begin, "endCharacter": source_start + end})
    return turns


def exact_opening_words(proof, text, turns):
    opening = proof.get("firstDialogueOpeningEvidence")
    v.require(isinstance(opening, dict) and opening.get("method") == "exact_original_opening_v1", "invalid_original_opening_method")
    quotes = opening.get("quotes")
    v.require(len(english_words(turns[0]["text"])) < 4, "opening_route_requires_actual_short_first_utterance")
    v.require(isinstance(quotes, list) and 2 <= len(quotes) <= 3 and len(quotes) <= len(turns), "invalid_original_opening_quotes")
    combined = []
    for i, quote in enumerate(quotes):
        v.require(isinstance(quote, dict), "invalid_original_opening_quote")
        start, end, literal = quote.get("startCharacter"), quote.get("endCharacter"), quote.get("text")
        turn = turns[i]
        v.require(v.integer(start) and v.integer(end) and turn["startCharacter"] <= start < end <= turn["endCharacter"]
                  and isinstance(literal, str) and literal == text[start:end], "original_opening_character_bounds_or_quote_mismatch")
        words = english_words(literal)
        actual_words = english_words(turn["text"])
        v.require(words and not english_words(text[turn["startCharacter"]:start]) and actual_words[:len(words)] == words,
                  "original_opening_skipped_first_or_contiguous_turn")
        if i < len(quotes) - 1:
            v.require(words == actual_words, "original_opening_truncated_prior_utterance")
        combined.extend(words)
    v.require(len(combined) >= 4, "original_opening_too_short")
    # Speaker labels are source formatting between these exact actual turns.
    corpus = english_words(re.sub(SPEAKER, " ", text))
    occurrences = sum(corpus[i:i+len(combined)] == combined for i in range(len(corpus) - len(combined) + 1))
    v.require(occurrences == 1, "original_opening_not_unique")
    return combined


def section_stays_before_next_heading(text, start, end, markers):
    next_markers = [m for m in markers if m.start() >= start]
    if next_markers:
        marker = next_markers[0]
        heading_start = marker.start() + len(marker[0]) - len(marker[0].lstrip())
        v.require(end <= heading_start, "official_section_overlaps_next_original_question")


def first_dialogue_alignment(row, source, probe, replay, *, require_instruction):
    """Explicit evidence for a bare/uncertain ordinal; never a nearest-number repair."""
    proof = row.get("scriptEvidence")
    v.require(isinstance(proof, dict), "ambiguous_cue_missing_official_alignment")
    text = original_transcript(source)
    if "transcriptSha256" in proof:
        v.require(proof["transcriptSha256"] == hashlib.sha256(text.encode("utf-8")).hexdigest(), "official_transcript_text_hash_mismatch")
    start, end = proof.get("sectionStartCharacter"), proof.get("sectionEndCharacter")
    v.require(v.integer(start) and v.integer(end) and 0 <= start < end <= len(text), "official_section_bounds_invalid")
    expected_number = row["cueNumber"]
    markers = original_script_markers(source, text)
    current = [m for m in markers if int(m[1]) == expected_number and m.end() <= start and not text[m.end():start].strip()]
    v.require(len(current) == 1, "official_section_not_current_original_number")
    if current[0].re.groups == 2:
        v.require(row.get("kind") == "shared_passage" and row.get("scopeQuestionNumbers") == [int(current[0][1]), int(current[0][2])], "official_shared_marker_scope_mismatch")
    section_stays_before_next_heading(text, start, end, markers)
    body = text[start:end]
    turns = original_turns(body, start)
    v.require(turns, "official_first_dialogue_missing")
    speaker, first = turns[0]["speaker"], turns[0]["text"]
    if proof.get("firstDialogueOpeningEvidence") is not None:
        words = exact_opening_words(proof, text, turns)
    else:
        quote = proof.get("firstDialogueQuote", "")
        v.require(isinstance(quote, str) and quote, "official_first_dialogue_quote_missing")
        words = english_words(quote)
        v.require(len(words) >= 4 and quote in first and english_words(first)[:len(words)] == words, "official_alignment_is_not_first_dialogue")
        if "firstDialogueStartCharacter" in proof:
            at = proof["firstDialogueStartCharacter"]
            v.require(v.integer(at) and start <= at < end and text[at:at + len(quote)] == quote, "official_first_dialogue_offset_mismatch")
        all_words = english_words(text)
        occurrences = sum(all_words[i:i+len(words)] == words for i in range(len(all_words) - len(words) + 1))
        v.require(occurrences == 1, "official_first_dialogue_not_unique")
    dialogue_field = "dialogueProbeEvidence" if row.get("dialogueProbeEvidence") else "probeEvidence"
    dialogue_container, dialogue_probe = checked_probe(row, source, dialogue_field)
    checked_full_pcm(dialogue_container, replay.actual, "dialogue_probe_wrong_full_native_pcm")
    binding = dialogue_offset_binding(row, probe, dialogue_probe, replay)
    v.require(v.integer(dialogue_probe["frameCount"]) and dialogue_probe["durationSeconds"] == dialogue_probe["frameCount"] / replay.actual["sampleRate"], "dialogue_probe_actual_duration_mismatch")
    actual = replay.replay(dialogue_probe)
    for k in ("clipPcmSha256", "inputMonoFloat32Sha256", "inputSampleCount"):
        v.require(dialogue_probe.get(k) == actual[k], f"dialogue_probe_decode_hash:{k}")
    index = probe_segments(dialogue_probe, max_duration=60 if dialogue_field == "dialogueProbeEvidence" and dialogue_probe.get("purpose") == "first_dialogue" else 14)
    selected = v.select_segments(index, proof.get("dialogueProbeSegmentIds"))
    heard = english_words(" ".join(s["text"] for s in selected))
    v.require(any(heard[i:i+len(words)] == words for i in range(len(heard) - len(words) + 1)), "official_first_dialogue_quote_absent_in_probe")
    if require_instruction:
        instruction = proof.get("instructionQuote", "")
        v.require(len(compact(instruction)) >= 12 and instruction in text and v.normalize(text).count(v.normalize(instruction)) == 1, "official_instruction_not_unique")
        if "instructionStartCharacter" in proof:
            at = proof["instructionStartCharacter"]
            v.require(v.integer(at) and 0 <= at < end and text[at:at + len(instruction)] == instruction, "official_instruction_offset_mismatch")
        header = body[:speaker.start()]
        current = next((q for q in source["questions"] if q["sourceNumber"] == expected_number), {})
        frozen_shared = current.get("instruction", "")
        at_section = v.normalize(instruction) in v.normalize(header)
        shared_head = frozen_shared and v.normalize(instruction) == v.normalize(frozen_shared) and v.normalize(instruction) in v.normalize(text[max(0, start - 1000):start])
        v.require(at_section or shared_head, "official_instruction_not_at_source_question")
        number_index = probe_segments(probe)
        instruction_segments = v.select_segments(number_index, proof.get("instructionProbeSegmentIds"))
        v.require(coverage(instruction, " ".join(s["text"] for s in instruction_segments)) >= .8, "official_unique_instruction_absent_in_probe")
    binding.update(probe={"path": row[dialogue_field]["path"], "sha256": row[dialogue_field]["sha256"]},
                   probeId=row[dialogue_field]["probeId"], selectedSegmentIds=[s["id"] for s in selected],
                   selectedEstimatedEndFrame=dialogue_probe["startFrame"] + math.ceil(max(v.segment_bounds(s)[1] for s in selected) * replay.actual["sampleRate"]))
    return binding


def reconstructed_scope(row, source, question, spoken, full_index):
    """Bind generated identity to an actual original numbered passage."""
    scope = row.get("scopeQuestionNumbers")
    v.require(isinstance(scope, list) and scope and all(v.integer(i) and 1 <= i <= 50 for i in scope) and scope == sorted(set(scope)), "invalid_original_scope")
    v.require(row.get("cueNumber") == scope[0], "fabricated_cue_ordinal")
    cues = v.select_segments(full_index, row.get("cueSegmentIds"))
    anchors = v.select_segments(full_index, row.get("anchorSegmentIds"))
    v.require(leading_cue(cues[0]["text"])[0] == spoken, "reconstructed_native_and_full_cue_mismatch")
    cue_start = v.segment_bounds(cues[0])[0]
    numbered = [(s, leading_cue(s["text"])[0]) for s in full_index.values()]
    matching = [s for s, numbers in numbered if numbers == spoken and not v.uncertain(s)]
    v.require(any(s["id"] == cues[0]["id"] for s in matching), "reconstructed_original_cue_not_reliable")
    if len(matching) > 1:
        native = row["nativeEvidence"]
        onset = native["onsetFrame"] / native["sampleRate"]
        containing = [s for s in matching if v.segment_bounds(s)[0] <= onset <= v.segment_bounds(s)[1]]
        # An estimate is a search span, not the physical seek timestamp. Only
        # unique exact containment of the independently measured native onset
        # disambiguates duplicated raw ordinals; distance never does.
        v.require(len(containing) == 1 and containing[0]["id"] == cues[0]["id"], "reconstructed_duplicate_cue_not_uniquely_bound_to_native_onset")
    next_start = min((v.segment_bounds(s)[0] for s, numbers in numbered if numbers and v.segment_bounds(s)[0] > cue_start), default=math.inf)
    v.require(all(cue_start <= v.segment_bounds(s)[0] < next_start for s in anchors), "anchor_outside_original_passage")
    kind = row.get("kind")
    if kind in ("single", "shared_instruction_member"):
        v.require(len(spoken) == 1 and spoken == scope, "single_original_scope_mismatch")
    elif kind == "shared_passage":
        v.require(len(spoken) == 2 and spoken == scope and spoken[1] == spoken[0] + 1, "true_shared_passage_spoken_scope_mismatch")
        raw = " ".join(s["text"] for s in cues)
        v.require(re.search(r"물음에\s*답하|두\s*물음|두\s*질문", raw), "reconstructed_shared_passage_instruction_missing")
        v.require(not any(numbers == [spoken[1]] and cue_start < v.segment_bounds(s)[0] < max(v.segment_bounds(a)[1] for a in anchors) for s, numbers in numbered), "shared_scope_contains_separate_member_cue")
    elif kind == "shared_instruction_head":
        v.require(len(spoken) == 2 and spoken[1] == spoken[0] + 1 and scope == [spoken[0]], "shared_instruction_head_scope_mismatch")
        following = [s for s, numbers in numbered if numbers == [spoken[1]] and not v.uncertain(s) and v.segment_bounds(s)[0] > cue_start]
        v.require(following and v.segment_bounds(following[0])[0] == next_start, "shared_instruction_missing_separate_member_cue")
        v.require(not re.search(r"물음에\s*답하|두\s*물음|두\s*질문", " ".join(s["text"] for s in cues)), "instruction_incorrectly_split_from_shared_passage")
    else:
        raise v.InvalidEvidence("unknown_original_question_kind")
    # The frozen generation evidence, current question ID and source hash remain
    # mandatory. Generated ordinal equality contributes no evidence.
    v.validate_mapping(row, source, question, full_index)
    return {"method": "unique_native_onset_containment" if len(matching) > 1 else "unique_raw_ordinal",
            "selectedSegmentId": cues[0]["id"], "matchingSegmentIds": [s["id"] for s in matching],
            "selectedEstimatedStartSeconds": v.segment_bounds(cues[0])[0],
            "selectedEstimatedEndSeconds": v.segment_bounds(cues[0])[1],
            "nativeOnsetFrame": row["nativeEvidence"]["onsetFrame"],
            "nativeSampleRate": row["nativeEvidence"]["sampleRate"]}


def official_asr_references(row, spoken, full_index):
    """Reported raw IDs must not contradict or point outside the original cue."""
    cue_ids, anchor_ids = row.get("cueSegmentIds"), row.get("anchorSegmentIds")
    v.require(isinstance(cue_ids, list) and isinstance(anchor_ids, list), "missing_full_asr_reference_arrays")
    cues, anchors = [], []
    for ids, quote, selected in ((cue_ids, row.get("cueText"), cues), (anchor_ids, row.get("anchorText"), anchors)):
        if ids:
            selected.extend(v.select_segments(full_index, ids, allow_uncertain=True))
            if quote is not None:
                v.require(quote == " ".join(s["text"] for s in selected), "full_asr_quote_changed")
    for cue in cues:
        numbers = leading_cue(cue["text"])[0]
        v.require(not numbers or v.uncertain(cue) or numbers == spoken, "reported_full_asr_cue_mismatch")
    if anchors:
        boundary = cues
        if not boundary:
            boundary = [s for s in full_index.values() if leading_cue(s["text"])[0] == spoken and not v.uncertain(s)]
            v.require(len(boundary) == 1, "reported_anchor_missing_original_cue_boundary")
        cue_start = v.segment_bounds(boundary[0])[0]
        next_start = min((v.segment_bounds(s)[0] for s in full_index.values()
                          if leading_cue(s["text"])[0] and v.segment_bounds(s)[0] > cue_start), default=math.inf)
        v.require(all(cue_start <= v.segment_bounds(s)[0] < next_start for s in anchors), "anchor_outside_original_passage")
    # These full-ASR bounds remain estimates. The native numbered/aligned probe
    # independently proves the actual physical start.


def validate(row, source, question, clock, replay, full_index):
    n = row.get("nativeEvidence")
    v.require(isinstance(n, dict), "missing_native_evidence")
    cache = v.checked_ref({"path": n.get("cachePath"), "sha256": n.get("cacheSha256")})
    actual = replay.actual
    v.require(cache.get("sourceRecordId") == source["sourceRecordId"] and cache.get("sourceAudioSha256") == actual["sourceAudioSha256"] == source["sourceAudioSha256"], "native_cache_wrong_source")
    for k in ("sampleRate", "channels", "frameCount"):
        v.require(v.integer(n.get(k)) and v.integer(cache["pcm"].get(k)) and n.get(k) == cache["pcm"].get(k) == actual.get(k), f"native_replay_clock:{k}")
    v.require(n.get("pcmSha256") == cache["pcm"]["sha256"] == actual["pcmSha256"] == clock["decodedInterleavedInt16Sha256"], "native_full_pcm_hash_mismatch")
    v.require(cache["playback"]["sha256"] == actual["playbackSha256"] == source["audio"]["sha256"], "native_playback_hash_mismatch")
    v.require(v.sha(n.get("energyPath")) == n.get("energySha256") == cache["energy"]["sha256"] == actual["energySha256"], "native_energy_replay_hash_mismatch")
    measured_onset(n, replay)
    v.require(v.integer(row.get("seekStartMs")) and row["seekStartMs"] == n["startFrame"] * 1000 // n["sampleRate"], "seek_native_clock_mismatch")
    container, probe = checked_probe(row, source)
    if actual.get("convertedClockProof"):
        v.require(container.get("convertedClockProof") == actual["convertedClockProof"], "converted_probe_clock_proof_mismatch")
        v.require(container.get("playbackSha256") == source["audio"]["sha256"] and Path(container.get("playbackAudioPath", "")).resolve() == Path(actual["playbackAudioPath"]).resolve(), "converted_probe_actual_playback_mismatch")
    checked_full_pcm(container, actual, "raw_probe_native_clock_mismatch")
    v.require(all(v.integer(probe.get(k)) for k in ("sampleRate", "channels", "startFrame", "onsetFrame")) and probe["sampleRate"] == n["sampleRate"] and probe["channels"] == n["channels"] and probe["startFrame"] == n["startFrame"] and probe["onsetFrame"] == n["onsetFrame"], "raw_probe_wrong_native_start")
    v.require(v.integer(probe["frameCount"]) and 0 < probe["frameCount"] <= 14 * n["sampleRate"] and probe["startFrame"] + probe["frameCount"] <= n["frameCount"], "probe_overflow_or_unbounded")
    v.require(probe["durationSeconds"] == probe["frameCount"] / n["sampleRate"], "raw_probe_actual_duration_mismatch")
    independent = replay.replay(probe)
    for k in ("clipPcmSha256", "inputMonoFloat32Sha256", "inputSampleCount"):
        v.require(probe.get(k) == independent[k], f"bounded_native_probe_replay_hash:{k}")
    index = probe_segments(probe)
    segments = v.select_segments(index, row["probeEvidence"].get("segmentIds"), allow_uncertain=bool(row.get("scriptEvidence")))
    v.require(segments[0]["id"] == next(iter(index)) and segments[0]["estimatedStartSeconds"] <= 2, "probe_does_not_begin_at_spoken_cue")
    raw_text = " ".join(s["text"] for s in segments)
    if n.get("onsetMethod") in ("noise_floor_contrast_v1", "noise_floor_contrast_1second_v1"):
        relative_onset = (n["onsetFrame"] - n["startFrame"]) / n["sampleRate"]
        v.require(segments[0]["estimatedStartSeconds"] - .5 <= relative_onset <= segments[0]["estimatedEndSeconds"], "noise_onset_raw_cue_correspondence_missing")
    v.require(row["probeEvidence"].get("text") == raw_text and row["probeEvidence"].get("inputMonoFloat32Sha256") == probe["inputMonoFloat32Sha256"], "raw_probe_quote_or_hash_mismatch")
    spoken, rest = leading_cue(raw_text)
    declared_spoken = row.get("cueSpokenNumbers")
    v.require(isinstance(declared_spoken, list) and all(v.integer(i) and 1 <= i <= 50 for i in declared_spoken)
              and declared_spoken == sorted(set(declared_spoken)), "invalid_declared_spoken_numbers")
    v.require(v.integer(row.get("cueNumber")), "fabricated_cue_ordinal")
    ambiguous = not spoken or any(v.uncertain(s) for s in segments)
    if source["reconstructed"]:
        v.require(not ambiguous and spoken == row.get("cueSpokenNumbers"), "reconstructed_native_cue_uncertain_or_missing")
        original_cue_proof = reconstructed_scope(row, source, question, spoken, full_index)
        for ids, quote in ((row.get("cueSegmentIds"), row.get("cueText")), (row.get("anchorSegmentIds"), row.get("anchorText"))):
            selected = v.select_segments(full_index, ids)
            if quote is not None:
                v.require(quote == " ".join(s["text"] for s in selected), "full_asr_quote_changed")
        return {"probe": {"path": row["probeEvidence"]["path"], "sha256": row["probeEvidence"]["sha256"]},
                "probeId": row["probeEvidence"]["probeId"], "onsetFrame": n["onsetFrame"],
                "fullAsrCueEvidence": original_cue_proof}, segments, "reconstructed_numbered_probe", None
    if not spoken and row.get("cueForm", row["probeEvidence"].get("cueForm")) == "bare":
        bare = re.match(r"^\s*(\d{1,2})\.\s+", raw_text)
        v.require(bare is not None, "bare_cue_not_literal_original_number")
        spoken, rest = [int(bare[1])], raw_text[bare.end():]
    dialogue_binding = None
    if ambiguous:
        dialogue_binding = first_dialogue_alignment(row, source, probe, replay, require_instruction=True)
    aligned_without_number = not spoken and row.get("cueForm") == "official_alignment"
    v.require((spoken and spoken == row.get("cueSpokenNumbers")) or (aligned_without_number and row.get("cueSpokenNumbers") == []), "bounded_spoken_ordinal_mismatch")
    if aligned_without_number:
        # This is the uniquely bound official section, never a claimed heard
        # ordinal. Keep cueSpokenNumbers empty in the replay certificate.
        spoken = row.get("scopeQuestionNumbers")
    scope = row.get("scopeQuestionNumbers")
    v.require(isinstance(scope, list) and scope and all(v.integer(i) and 1 <= i <= 50 for i in scope) and scope == sorted(set(scope)) and question["sourceNumber"] in scope and v.integer(row.get("cueNumber")) and row.get("cueNumber") == scope[0], "bounded_current_question_scope_mismatch")
    kind = row.get("kind")
    grade = "official_alignment" if ambiguous else "numbered_instruction"
    original_identity = None
    if kind == "single":
        v.require(spoken == scope == [question["sourceNumber"]], "single_question_scope_mismatch")
        instruction = own_instruction(question)
        if not instruction and (row.get("officialInstruction") or {}).get("source") == "official_transcript_section_head":
            instruction = instruction_head_from_transcript(source, question, row["officialInstruction"])
    elif kind == "shared_passage":
        v.require(len(scope) == 2 and spoken == scope, "true_shared_passage_spoken_scope_mismatch")
        peers = [q for q in source["questions"] if q["sourceNumber"] in scope]
        instructions = [q.get("instruction") for q in peers if q.get("instruction")]
        instruction = instructions[0] if instructions else ""
        v.require(re.search(r"물음에\s*답하", instruction), "shared_passage_missing_official_scope_instruction")
        v.require(len(peers) == 2 and all(s == instruction for s in instructions) and all(q.get("instruction") or not own_instruction(q) for q in peers), "shared_passage_official_scope_mismatch")
    elif kind == "shared_instruction_head":
        v.require(len(spoken) == 2 and scope == [spoken[0]] and spoken[1] == spoken[0] + 1, "shared_instruction_head_scope_mismatch")
        next_question = next((q for q in source["questions"] if q["sourceNumber"] == spoken[1]), {})
        instruction = question.get("instruction") or (next_question.get("instruction", "") if not own_instruction(question) else "")
        v.require(instruction and not re.search(r"물음에\s*답하", instruction), "instruction_incorrectly_split_from_shared_passage")
    elif kind == "shared_instruction_member":
        v.require(spoken == scope == [question["sourceNumber"]], "shared_instruction_member_scope_mismatch")
        instruction = ""
    else:
        raise v.InvalidEvidence("unknown_original_question_kind")
    if kind != "shared_instruction_member":
        if not instruction and kind == "single":
            original_identity = original_question_identity(source, question)
            grade = "ordinal_only"
        else:
            original_identity = None
            if len(compact(instruction)) < 12 or coverage(instruction, rest) < .8:
                dialogue_binding = first_dialogue_alignment(row, source, probe, replay, require_instruction=True)
    else:
        # A member must have its own source dialogue; a repeated shared instruction
        # is not sufficient to declare a second start.
        if row.get("dialogueProbeEvidence") and row.get("scriptEvidence"):
            dialogue_binding = first_dialogue_alignment(row, source, probe, replay, require_instruction=ambiguous)
        elif not any(re.search(r"[A-Za-z]{3}", s["text"]) for s in segments):
            original_identity = original_question_identity(source, question)
            grade = "ordinal_only"
    official_asr_references(row, spoken, full_index)
    return {"probe": {"path": row["probeEvidence"]["path"], "sha256": row["probeEvidence"]["sha256"]},
            "probeId": row["probeEvidence"]["probeId"], "onsetFrame": n["onsetFrame"],
            **({"dialogueBinding": dialogue_binding} if dialogue_binding else {})}, segments, grade, original_identity
