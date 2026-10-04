"""Read-only bounded speech evidence review. Missing evidence never becomes an estimated cut."""

import hashlib
import json
import math
import os
import re
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from strict_stage_support import context

args = context(__doc__)
BASE = args.base
OUTPUT = args.output
WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"]


def tokens(value):
    value = unicodedata.normalize("NFKC", value).replace("‘", "'").replace("’", "'")
    value = re.sub(r"\b(?:ANN|[MW]\d?)\s*:", " ", value)
    value = re.sub(r"(?:^|\n)\s*[A-Z][a-z]{1,20}\s*:", " ", value)
    value = re.sub(r"\[[^]]*\]", " ", value)
    return re.findall(r"[a-z]+(?:'[a-z]+)?|\d+", value.lower())


def coverage(a, b):
    row = [0] * (len(b) + 1)
    for word in a:
        diagonal = 0
        for index, actual in enumerate(b, 1):
            previous = row[index]
            row[index] = diagonal + 1 if word == actual else max(row[index], row[index - 1])
            diagonal = previous
    count = row[-1]
    return {"recall": count / len(a) if a else 0, "precision": count / len(b) if b else 0}


def cue_numbers(text):
    text = text.strip().lower()
    match = re.match(r"^(\d{1,2})\s*번(?:\s*(?:부터|~|～|-|과|와)\s*(\d{1,2})\s*번)?", text)
    if match:
        first, last = int(match[1]), int(match[2] or match[1])
    else:
        word = "(?:[1-9]\\d?|" + "|".join(WORDS[1:]) + ")"
        match = re.match(r"^(?:number|questions?)\s+(" + word + r")(?:\s*(?:and|to|through|~|-)\s*(?:number\s+)?(" + word + r"))?\b", text)
        if not match:
            return []
        def number(value):
            return int(value) if value.isdigit() else WORDS.index(value)
        first, last = number(match[1]), number(match[2] or match[1])
    return list(range(first, last + 1)) if 1 <= first <= last <= 30 else []


def read(path):
    return json.loads(path.read_text("utf8"))


def file_ref(path):
    return {"path": str(path), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}


def atomic(path, value):
    temporary = path.with_suffix(".json.partial")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2), "utf8")
    os.replace(temporary, path)


def no_speech(events, start, end):
    return not any(e["startSample"] < end and e["endSample"] > start for e in events)


def inside(segment, start, end, events):
    a, b = math.floor(segment["estimatedStartSeconds"] * 16000), math.ceil(segment["estimatedEndSeconds"] * 16000)
    return b > start and a < end and (a >= start or no_speech(events, a, start)) and (b <= end or no_speech(events, end, b))


def edge_ids(expected, segments, front):
    selected = []
    ordered = segments if front else list(reversed(segments))
    for segment in ordered:
        selected.append(segment)
        current = selected if front else list(reversed(selected))
        score = coverage(expected, tokens(" ".join(s["text"] for s in current)))
        if score["recall"] >= .9:
            return [s["id"] for s in current], score
    current = selected if front else list(reversed(selected))
    return [s["id"] for s in current], coverage(expected, tokens(" ".join(s["text"] for s in current)))


def dialogue_only(section, candidate):
    # Keep a contiguous ASR interval bounded by the source's actual first/last
    # utterance. Announcer instructions are not part of the English dialogue.
    from difflib import SequenceMatcher
    flattened, owners = [], []
    for index, segment in enumerate(candidate["segments"]):
        words = tokens(segment["text"])
        flattened.extend(words)
        owners.extend([index] * len(words))
    expected = tokens("\n".join(u["text"] for u in section["utterances"]))
    blocks = [b for b in SequenceMatcher(None, expected, flattened, autojunk=False).get_matching_blocks() if b.size >= 3]
    if not blocks:
        return candidate
    first, last = owners[blocks[0].b], owners[blocks[-1].b + blocks[-1].size - 1]
    # Include any segment holding the first/last source words; never cut within
    # a segment or remove a middle segment to inflate coverage.
    for index in range(first, max(-1, first - 3), -1):
        text = " ".join(s["text"] for s in candidate["segments"][index:first + 2])
        if coverage(tokens(section["utterances"][0]["text"]), tokens(text))["recall"] >= .9:
            first = index
            break
    for index in range(last, min(len(candidate["segments"]), last + 3)):
        text = " ".join(s["text"] for s in candidate["segments"][max(first, last - 1):index + 1])
        if coverage(tokens(section["utterances"][-1]["text"]), tokens(text))["recall"] >= .9:
            last = index
            break
    selected = candidate["segments"][first:last + 1]
    return {**candidate, "segments": selected, "observed": tokens(" ".join(s["text"] for s in selected))}


def review(source_id, script_path):
    complete_script_path = OUTPUT / f"{source_id}.strict-script-complete.json"
    if complete_script_path.exists():
        script_path = complete_script_path
    script = read(script_path)
    activity_path = OUTPUT / f"{source_id}.strict-activity.json"
    activity = read(activity_path)
    events = activity["events"]
    prepared_path = next(directory / f"{source_id}.json" for directory in [BASE / "prepared-registration", BASE / "prepared-historical-registration"] if (directory / f"{source_id}.json").exists())
    prepared = read(prepared_path)
    questions = {q["sourceNumber"]: q for g in prepared["editableInput"]["groups"] for q in g["questions"]}
    cache_paths = {"auto": BASE / "official-asr-stage" / source_id / "asr-medium-multilingual.json", "english": BASE / "official-asr-stage" / source_id / "asr-medium-english.json"}
    baseline_english_path = cache_paths["english"]
    localized_english = args.asr_output / "asr-medium-english-localized.json"
    if localized_english.exists():
        cache_paths["english"] = localized_english
    derived_english = args.asr_output / "asr-medium-english-evidence.json"
    if derived_english.exists():
        cache_paths["english"] = derived_english
    korean = args.asr_output / "asr-medium-korean-announcements.json"
    if korean.exists():
        cache_paths["korean"] = korean
    caches = {kind: read(path) for kind, path in cache_paths.items()}
    if any(value["sourceAudioSha256"] != script["sourceAudioSha256"] for value in [activity, *caches.values()]):
        raise ValueError("Actual original audio SHA differs")
    actual_sha = hashlib.sha256(Path(prepared["audioFilePath"]).read_bytes()).hexdigest()
    if actual_sha != script["sourceAudioSha256"]:
        raise ValueError("Actual original bytes differ")

    cue_list = []
    fallback_path = OUTPUT / f"{source_id}.korean-cue-map.json"
    fallback = read(fallback_path) if fallback_path.exists() else None
    fallback_entries = {}
    if fallback:
        if "korean" not in cache_paths or any(Path(reference["path"]).resolve() != path.resolve() or reference["sha256"] != file_ref(path)["sha256"] for reference, path in [(fallback["korean"], cache_paths["korean"]), (fallback["script"], script_path)]):
            raise ValueError("Root core cue-map source binding differs")
        fallback_entries = {entry["segmentId"]: entry["sourceNumbers"] for entry in fallback["entries"]}
    for kind, cache in caches.items():
        for segment in cache["segments"]:
            numbers = cue_numbers(segment["text"])
            if not numbers and kind == "korean":
                numbers = fallback_entries.get(segment["id"], [])
            if numbers:
                cue_list.append({"cache": kind, "segment": segment, "questionNumbers": numbers})
    candidates = []
    for first in range(len(events)):
        for count in range(1, 5):
            last = first + count - 1
            if last >= len(events):
                break
            start, end = events[first]["startSample"], events[last]["endSample"]
            if end - start > 180 * 16000:
                break
            for kind in ["auto", "english"]:
                selected = [s for s in caches[kind]["segments"] if s["estimatedEndSeconds"] * 16000 > start and s["estimatedStartSeconds"] * 16000 < end]
                if not selected:
                    continue
                origins = {s.get("origin", {}).get("artifactSha256") for s in selected}
                for origin in origins:
                    subset = [s for s in selected if s.get("origin", {}).get("artifactSha256") == origin]
                    observed = tokens(" ".join(s["text"] for s in subset))
                    candidates.append({"startSample": start, "endSample": end, "eventIds": [e["id"] for e in events[first:last + 1]], "cache": kind, "segments": subset, "observed": observed, "wordCounts": Counter(observed)})

    sections = []
    for section in script["sections"]:
        expected = tokens("\n".join(u["text"] for u in section["utterances"]))
        counts = Counter(expected)
        shortlist = []
        for candidate in candidates:
            intersection = sum((counts & candidate["wordCounts"]).values())
            # A bound on LCS, never a substitute for the exact ordered comparison below.
            if intersection / max(1, len(expected)) < .80 or intersection / max(1, len(candidate["observed"])) < .50:
                continue
            shortlist.append((intersection / max(len(expected), len(candidate["observed"])), candidate))
        shortlist.sort(key=lambda item: item[0], reverse=True)
        scored = []
        for _, candidate in shortlist[:32]:
            candidate = dialogue_only(section, candidate)
            # Replace an endpoint observation with an unchanged complementary
            # observation only when the selected physical speech intervals do
            # not overlap. Never rewrite text or add duplicate observations to
            # inflate source coverage.
            if candidate["cache"] == "english" and caches["english"].get("derivedFrom"):
                expected_edges = [tokens(section["utterances"][0]["text"]), tokens(section["utterances"][-1]["text"])]
                selected = candidate["segments"][:]
                for edge_index, expected_edge in enumerate(expected_edges):
                    current_refs, current_score = edge_ids(expected_edge, selected, edge_index == 0)
                    current_edge = [s for s in selected if s["id"] in current_refs]
                    if current_score["recall"] >= .9 and all(inside(s, candidate["startSample"], candidate["endSample"], events) for s in current_edge):
                        continue
                    for alternative in candidates:
                        if alternative["cache"] != "english" or alternative["startSample"] != candidate["startSample"] or alternative["endSample"] != candidate["endSample"]:
                            continue
                        edge_ref, score = edge_ids(expected_edge, alternative["segments"], edge_index == 0)
                        if score["recall"] >= .9 and score["precision"] >= .7:
                            extra = [s for s in alternative["segments"] if s["id"] in edge_ref]
                            # Failed edge_ids can cover the entire copy. Do not
                            # pretend that means the entire body is replaceable.
                            if current_score["recall"] < .9:
                                continue
                            remainder = [s for s in selected if s["id"] not in current_refs]
                            proposed = sorted(remainder + extra, key=lambda s: (s["estimatedStartSeconds"], s["id"]))
                            if not all(inside(s, candidate["startSample"], candidate["endSample"], events) for s in extra):
                                continue
                            if any(not no_speech(events, math.floor(max(a["estimatedStartSeconds"], b["estimatedStartSeconds"]) * 16000), math.ceil(min(a["estimatedEndSeconds"], b["estimatedEndSeconds"]) * 16000)) for i, a in enumerate(proposed) for b in proposed[:i] if max(a["estimatedStartSeconds"], b["estimatedStartSeconds"]) < min(a["estimatedEndSeconds"], b["estimatedEndSeconds"])):
                                continue
                            selected = proposed
                            break
                candidate = {**candidate, "segments": selected, "observed": tokens(" ".join(s["text"] for s in selected))}
            full = coverage(expected, candidate["observed"])
            first_ids, first_score = edge_ids(tokens(section["utterances"][0]["text"]), candidate["segments"], True)
            last_ids, last_score = edge_ids(tokens(section["utterances"][-1]["text"]), candidate["segments"], False)
            reasons = []
            if full["recall"] < .9 or full["precision"] < .7:
                reasons.append("full_original_dialogue_coverage_below_gate")
            if first_score["recall"] < .9 or last_score["recall"] < .9:
                reasons.append("first_or_last_original_utterance_not_covered")
            if any(s["uncertain"] for s in candidate["segments"]):
                reasons.append("uncertain_asr_speech_reference")
            if any(not inside(s, candidate["startSample"], candidate["endSample"], events) for s in candidate["segments"]):
                reasons.append("asr_reference_crosses_adjacent_actual_speech")
            cues = [cue for cue in cue_list if cue["questionNumbers"] == section["questionNumbers"] and not cue["segment"]["uncertain"] and inside(cue["segment"], candidate["startSample"], candidate["endSample"], events) and cue["segment"]["estimatedStartSeconds"] <= candidate["segments"][0]["estimatedStartSeconds"]]
            cue = next((cue for cue in cues if cue["cache"] == "korean"), cues[0] if cues else None)
            scoped_cues = []
            if not cue:
                for scope_cue in cue_list:
                    scope = scope_cue["questionNumbers"]
                    if len(scope) <= 1 or scope_cue["segment"]["uncertain"] or not set(section["questionNumbers"]).issubset(scope):
                        continue
                    if scope_cue["segment"]["estimatedStartSeconds"] > candidate["segments"][0]["estimatedStartSeconds"] or scope_cue["segment"]["estimatedEndSeconds"] * 16000 > candidate["endSample"]:
                        continue
                    match = re.search(r"[【\[]\s*" + str(scope[0]) + r"\s*[-~～–—]\s*" + str(scope[-1]) + r"\s*[】\]]", script["sourceTranscriptText"])
                    if match:
                        scoped_cues.append({**scope_cue, "scopeEvidence": {"startCharacter": len(script["sourceTranscriptText"][:match.start() + 1].encode("utf-16-le")) // 2, "endCharacter": len(script["sourceTranscriptText"][:match.end() - 1].encode("utf-16-le")) // 2, "text": match.group(0)[1:-1]}})
                cue = next((cue for cue in scoped_cues if cue["cache"] == "korean"), scoped_cues[0] if scoped_cues else None)
            if not cue:
                reasons.append("explicit_monotone_source_number_cue_missing")
            scored.append({**candidate, "full": full, "first": first_score, "last": last_score, "firstIds": first_ids, "lastIds": last_ids, "cue": cue, "reasons": reasons})
        scored.sort(key=lambda value: (not value["reasons"], bool(value["cue"] and "scopeEvidence" not in value["cue"]), value["full"]["recall"] + value["full"]["precision"], -(value["endSample"] - value["startSample"])), reverse=True)
        selected_copies = []
        if scored:
            selected_copies = [scored[0]]
            if section["expectedRepetitions"] == 2:
                second = next((value for value in scored[1:] if value["endSample"] <= scored[0]["startSample"] or value["startSample"] >= scored[0]["endSample"]), None)
                if second:
                    selected_copies.append(second)
                selected_copies.sort(key=lambda value: value["startSample"])
        reasons = [reason for copy in selected_copies for reason in copy["reasons"]]
        if len(selected_copies) != section["expectedRepetitions"]:
            reasons.append("independent_original_repeat_or_dialogue_missing")
        sections.append({"section": section, "copies": selected_copies, "reasons": list(dict.fromkeys(reasons))})

    previous_end = 0
    previous_value = None
    for value in sections:
        if value["copies"]:
            start = min(copy["startSample"] for copy in value["copies"])
            end = max(copy["endSample"] for copy in value["copies"])
            if start < previous_end:
                value["reasons"].append("neighboring_original_passage_ranges_overlap")
                previous_value["reasons"].append("neighboring_original_passage_ranges_overlap")
            previous_end = max(previous_end, end)
            previous_value = value

    audit_questions = []
    for value in sections:
        section, copies = value["section"], value["copies"]
        for number in section["questionNumbers"]:
            candidates_serialized = []
            for copy in copies:
                cue = copy["cue"]
                cue_ref = ({"cache": cue["cache"], "segmentIds": [cue["segment"]["id"]], "questionNumbers": cue["questionNumbers"], **({"scopeEvidence": cue["scopeEvidence"]} if "scopeEvidence" in cue else {})} if cue else None)
                candidates_serialized.append({"cache": copy["cache"], "segmentIds": [s["id"] for s in copy["segments"]], "firstSegmentIds": copy["firstIds"], "lastSegmentIds": copy["lastIds"], "startSample": copy["startSample"], "endSample": copy["endSample"], "activityEventIds": copy["eventIds"], "cue": cue_ref, "coverage": {"full": copy["full"], "first": copy["first"], "last": copy["last"]}})
            audit_questions.append({"questionId": questions[number]["id"], "sourceNumber": number, "scriptSectionId": section["id"], "scriptQuestionNumbers": section["questionNumbers"], "expectedRepetitions": section["expectedRepetitions"], "decision": "candidate_checks_passed" if not value["reasons"] else "uncertain", "reasons": value["reasons"], "copies": candidates_serialized})
    refs = {"sourceAudio": {"path": prepared["audioFilePath"], "sha256": actual_sha}, "prepared": file_ref(prepared_path), "asr": {kind: file_ref(path) for kind, path in cache_paths.items()}, "officialScript": file_ref(script_path), "activity": file_ref(activity_path)}
    result = {"schemaVersion": 1, "sourceRecordId": source_id, "createdAt": datetime.now(timezone.utc).isoformat(), "humanReviewed": False, "originalAudioModified": False, "registeredAudioRanges": False, "wholeRoundApproval": False, "policy": "Read-only candidate checks; strict helper recomputation and whole-round completeness required before any cut.", **refs, "baselineEnglishPreserved": file_ref(baseline_english_path), "questions": audit_questions}
    if fallback:
        result["rootCoreCueMap"] = file_ref(fallback_path)
    atomic(OUTPUT / f"{source_id}.boundary-review.json", result)
    summary = {"sourceRecordId": source_id, "sourceQuestionCount": len(audit_questions), "sourcePassageCount": len(sections), "candidateChecksPassed": sum(q["decision"] == "candidate_checks_passed" for q in audit_questions), "uncertain": sum(q["decision"] == "uncertain" for q in audit_questions), "reasons": dict(Counter(reason for q in audit_questions for reason in q["reasons"]))}
    print(json.dumps(summary), flush=True)
    return summary


summary = review(args.source_id, OUTPUT / f"{args.source_id}.strict-script.json")
atomic(OUTPUT / f"{args.source_id}.review-summary.json", summary)
