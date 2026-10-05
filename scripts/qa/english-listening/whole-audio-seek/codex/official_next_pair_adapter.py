"""End-only paired native numeral/context evidence; own START contracts stay frozen."""
import copy
import math
import re
import unicodedata
from pathlib import Path

import claude_adapter as a
import localized_adapter as l
import official_catalog_adapter as official
import official_pdf_scope_adapter as pdf
import verifier as v

ADAPTER = "official-native-next-pair-v3"
GRADE = "official_native_next_pair_v3"
METHOD = "same_native_onset_next_numeral_instruction_v3"


def hangul(text):
    return re.sub(r"[^가-힣]", "", unicodedata.normalize("NFKC", text))


def original_next(row, source, replay):
    number = row["scopeQuestionNumbers"][-1] + 1
    questions = [q for q in source["questions"] if q["sourceNumber"] == number]
    v.require(len(questions) == 1, "next_pair_missing_very_next_original_question")
    identity, _, _, _ = pdf.source_identity(row, source, questions[0], replay)
    identity["method"] = "exact_original_pdf_next_instruction_v3"
    text = a.original_transcript(source)
    markers = a.original_script_markers(source, text)
    matches = [m for m in markers if int(m[1]) == number]
    v.require(len(matches) == 1 and matches[0].re.groups == 1, "next_pair_not_single_original_header")
    marker = matches[0]
    end = next((m.start() for m in markers if m.start() > marker.start()), len(text))
    speaker = re.search(a.SPEAKER, text[marker.end():end])
    v.require(speaker is not None, "next_pair_missing_original_next_dialogue")
    start = marker.end()
    stop = start + speaker.start()
    header = text[start:stop]
    leading = len(header) - len(header.lstrip())
    instruction = header.strip()
    v.require(len(hangul(instruction)) >= 12 and re.search(r"(?:고르시오|고르세요|답하시오|답하세요|선택하시오)(?=[\s.!?。]|$)", instruction),
              "next_pair_original_instruction_missing_or_incomplete")
    identity.update(instructionQuote=instruction, instructionStartCharacter=start + leading,
                    instructionEndCharacter=start + leading + len(instruction))
    return identity


def paired_boundary(row, source, replay):
    v.require(row.get("kind") == "single" and row.get("nextProbeEvidence") and row.get("nextNumberClipEvidence")
              and not row.get("nextCertificateEvidence") and not row.get("officialTerminalEvidence"),
              "next_pair_requires_single_end_with_both_raw_probes")
    context, index, selected, refs = l.replay_probe(row, source, replay, "nextProbeEvidence", language="ko", maximum=14)
    numeral, numeral_index, numeral_selected, numeral_refs = l.replay_probe(
        row, source, replay, "nextNumberClipEvidence", language="ko", maximum=3)
    for key in ("sampleRate", "channels", "startFrame", "onsetFrame", "quietBeforeFrames"):
        v.require(context[key] == numeral[key], "next_pair_different_native_onset:" + key)
    for name, raw_index, chosen in (("context", index, selected), ("numeral", numeral_index, numeral_selected)):
        v.require(chosen[0]["id"] == next(iter(raw_index)) and chosen[0]["estimatedStartSeconds"] <= 2,
                  "next_pair_not_first_native_speech:" + name)
    spoken, tail = l.literal_cue(" ".join(s["text"] for s in numeral_selected))
    expected = [row["scopeQuestionNumbers"][-1] + 1]
    v.require(spoken == expected and not tail.strip(), "next_pair_not_literal_very_next_numeral_only")
    onset_seconds = (numeral["onsetFrame"] - numeral["startFrame"]) / numeral["sampleRate"]
    v.require(numeral_selected[0]["estimatedStartSeconds"] - .5 <= onset_seconds <= numeral_selected[0]["estimatedEndSeconds"],
              "next_pair_numeral_onset_correspondence_missing")
    prefix, instruction = l.complete_instruction_prefix(index, selected)
    literal, rest = l.literal_cue(instruction)
    if literal is None:
        bare = re.match(r"^\s*(\d{1,2})\.\s+", instruction)
        v.require(bare is not None and [int(bare[1])] == expected, "next_pair_context_wrong_original_number")
        rest = instruction[bare.end():]
    else:
        v.require(literal == expected, "next_pair_context_wrong_original_number")
    identity = original_next(row, source, replay)
    wanted = hangul(identity["instructionQuote"])
    coverage = a.coverage(wanted, hangul(rest))
    v.require(coverage >= .8, "next_pair_original_instruction_not_heard")
    l.measure_probe_onset(row, source, replay, "nextProbeEvidence", context)
    # The short probe has the same physical clock/onset/quiet and is decoded
    # independently above; it cannot establish a second or later onset.
    catalog, _ = l.catalog_probes(row, source)
    for field, probe in (("nextProbeEvidence", context), ("nextNumberClipEvidence", numeral)):
        v.require(any(p.get("id") == probe["id"] and artifact["sha256"] == row[field]["sha256"]
                      and Path(artifact["path"]).resolve() == Path(row[field]["path"]).resolve()
                      for _, p, artifact in catalog), "next_pair_selected_probe_missing_from_catalog")
    for _, sibling, _ in catalog:
        if sibling.get("requestedLanguage") != "ko" or not sibling.get("segments"):
            continue
        text = sibling["segments"][0].get("text", "")
        numbers, _ = l.literal_cue(text)
        bare = re.match(r"^\s*(\d{1,2})\.\s+", text)
        if numbers is None and bare:
            numbers = [int(bare[1])]
        if sibling.get("startFrame") == context["startFrame"]:
            v.require(not numbers or numbers == expected, "next_pair_contradictory_same_onset_number")
        elif numbers == expected:
            v.require(v.integer(sibling.get("onsetFrame")) and abs(sibling["onsetFrame"] - context["onsetFrame"]) <= 3 * context["sampleRate"],
                      "next_pair_number_at_distant_occurrence")
    refs.extend(numeral_refs)
    refs.extend(identity[key] for key in ("prepared", "originalPrepared", "questionFile", "liveSnapshot"))
    source_audio = {"path": source["sourceAudioPath"], "sha256": source["sourceAudioSha256"]}
    refs.append(source_audio)
    proof = {"method": METHOD, "maySupplySeekStart": False, "scopeQuestionNumbers": expected,
             "startFrame": context["startFrame"], "onsetFrame": context["onsetFrame"],
             "contextProbe": row["nextProbeEvidence"], "numeralProbe": row["nextNumberClipEvidence"],
             "contextRawSegments": prefix, "numeralRawSegments": numeral_selected,
             "sourceAudio": source_audio,
             "originalNextIdentity": identity, "hangulCoverage": coverage,
             "providerTimingAuthority": False}
    return context, expected, refs, proof


def validate(row, source, question, clock, replay, full_index):
    v.require(row.get("evidenceAdapter") == ADAPTER and not source["reconstructed"]
              and row.get("kind") == "single" and row.get("scopeQuestionNumbers") == [question["sourceNumber"]],
              "next_pair_wrong_source_version_or_start_scope")
    start_adapter = row.get("originalStartAdapter")
    v.require(start_adapter in (official.ADAPTER, pdf.ADAPTER), "next_pair_unknown_frozen_start_contract")
    view = {**row, "evidenceAdapter": start_adapter}
    boundary = {}

    def end_only(checked_row, checked_source, checked_replay):
        neighbor, spoken, refs, evidence = paired_boundary(checked_row, checked_source, checked_replay)
        boundary.update(evidence)
        return neighbor, spoken, refs

    if start_adapter == pdf.ADAPTER:
        proof, raw, _, identity = pdf.validate(view, source, question, clock, replay, full_index, _next_boundary=end_only)
    else:
        proof, raw, _, _ = official.validate(view, source, question, clock, replay, full_index, _next_boundary=end_only)
        identity, _, _, _ = pdf.source_identity(row, source, question, replay)
        identity["method"] = "exact_original_pdf_native_single_v3"
        binding = proof.get("dialogueBinding", {})
        v.require(binding, "next_pair_missing_unchanged_own_dialogue_binding")
        opening = pdf.first_native_opening(row, source, replay, binding)
        v.require(row["nativeEvidence"]["onsetFrame"] <= opening["selectedStartFrame"] < opening["selectedEndFrame"] <= proof["nextStartFrame"]
                  and binding["dialogueOnsetFrame"] < proof["nextStartFrame"] < proof["nextOnsetFrame"], "next_pair_own_dialogue_crosses_next")
        binding.update(method="measured_native_original_next_scope_v2", originalOffsetMethod=binding["method"],
                       nextStartFrame=proof["nextStartFrame"], nextOnsetFrame=proof["nextOnsetFrame"], nextScopeQuestionNumbers=boundary["scopeQuestionNumbers"])
        proof.update(officialSourceIdentity=identity, nativeFirstOpening=opening, questionId=question["id"],
                     scopeQuestionNumbers=row["scopeQuestionNumbers"], cueSpokenNumbers=row["cueSpokenNumbers"],
                     cueNumber=row["cueNumber"], kind=row["kind"])
        proof["boundReferences"].extend(identity[key] for key in ("prepared", "originalPrepared", "questionFile", "liveSnapshot"))
    v.require(boundary, "next_pair_end_validator_not_executed")
    proof.update(adapter=ADAPTER, originalStartAdapter=start_adapter, nextBoundaryKind=METHOD, pairedNextBoundary=boundary)
    return proof, raw, GRADE, identity


def admission_origin(row):
    """A new grade inherits only its own complete start and paired-END proof."""
    if not isinstance(row, dict) or not isinstance(row.get("proofKey"), dict):
        return False
    proof, native = row["proofKey"], row.get("nativeEvidence", {})
    paired = proof.get("pairedNextBoundary", {})
    if not isinstance(paired, dict) or not isinstance(native, dict):
        return False
    identity = paired.get("originalNextIdentity", {})
    start_adapter = row.get("originalStartAdapter")
    if not (row.get("status") == "admitted" and row.get("reconstructed") is False and row.get("kind") == "single"
            and row.get("evidenceGrade") == GRADE and row.get("evidenceAdapter") == proof.get("adapter") == ADAPTER
            and start_adapter == proof.get("originalStartAdapter") and start_adapter in (official.ADAPTER, pdf.ADAPTER)
            and paired.get("method") == proof.get("nextBoundaryKind") == METHOD and paired.get("maySupplySeekStart") is False
            and paired.get("providerTimingAuthority") is False and paired.get("contextProbe") == row.get("nextProbeEvidence")
            and paired.get("numeralProbe") == row.get("nextNumberClipEvidence") and row.get("nextNumberClipEvidence")
            and paired.get("startFrame") == proof.get("nextStartFrame") and paired.get("onsetFrame") == proof.get("nextOnsetFrame")
            and isinstance(identity, dict) and v.integer(row.get("sourceNumber")) and row.get("scopeQuestionNumbers") == [row["sourceNumber"]]
            and paired.get("scopeQuestionNumbers") == [row["sourceNumber"] + 1]
            and identity.get("method") == "exact_original_pdf_next_instruction_v3" and identity.get("sourceNumber") == row["sourceNumber"] + 1
            and identity.get("sourceRecordId") == row.get("sourceRecordId") and identity.get("questionId") != row.get("questionId")
            and len(hangul(identity.get("instructionQuote", ""))) >= 12 and type(paired.get("hangulCoverage")) in (float, int)
            and .8 <= paired["hangulCoverage"] <= 1 and paired.get("contextRawSegments") and paired.get("numeralRawSegments")):
        return False
    if start_adapter == official.ADAPTER:
        own = row.get("originalQuestionIdentity", {})
        if not isinstance(own, dict) or own.get("method") != "exact_original_pdf_native_single_v3":
            return False
        return ordinary_single_origin(row) and bound_pair_refs(row, identity)
    # The placeholder branch passed the complete unchanged v2 START contract.
    # Reuse its strict physical opening/order and nested-ref proof guard.
    view = copy.deepcopy(row)
    view.update(evidenceAdapter=pdf.ADAPTER, evidenceGrade=pdf.GRADE)
    view["proofKey"]["adapter"] = pdf.ADAPTER
    return v.official_native_admission_origin(view) and bound_pair_refs(row, identity)


def ordinary_single_origin(row):
    proof, own, native = [row.get(k, {}) for k in ("proofKey", "originalQuestionIdentity", "nativeEvidence")]
    binding, opening = proof.get("dialogueBinding", {}), proof.get("nativeFirstOpening", {})
    if not all(isinstance(item, dict) for item in (own, native, binding, opening)):
        return False
    return (own == proof.get("officialSourceIdentity") and own.get("questionId") == proof.get("questionId") == row.get("questionId")
            and own.get("sourceRecordId") == row.get("sourceRecordId") and own.get("sourceNumber") == row.get("sourceNumber")
            and all(proof.get(k) == row.get(k) for k in ("scopeQuestionNumbers", "cueNumber", "cueSpokenNumbers", "kind"))
            and proof.get("onsetFrame") == native.get("onsetFrame") and proof.get("providerTimingAuthority") is False
            and binding.get("method") == "measured_native_original_next_scope_v2" and binding.get("sampleRate") == native.get("sampleRate")
            and binding.get("nextScopeQuestionNumbers") == proof.get("nextSpokenNumbers") == [row["sourceNumber"] + 1]
            and all(v.integer(proof.get(k)) for k in ("nextStartFrame", "nextOnsetFrame"))
            and binding.get("nextStartFrame") == proof["nextStartFrame"] < proof["nextOnsetFrame"] == binding.get("nextOnsetFrame")
            and opening.get("method") == "first_literal_native_opening_v2" and opening.get("purpose") == "first_dialogue"
            and opening.get("maximumInputSeconds") == 60 and opening.get("probe") == row.get("dialogueProbeEvidence")
            and all(v.integer(opening.get(k)) for k in ("selectedStartFrame", "selectedEndFrame"))
            and native.get("onsetFrame", math.inf) <= opening["selectedStartFrame"] < opening["selectedEndFrame"]
                == binding.get("selectedEstimatedEndFrame") <= proof["nextStartFrame"]
            and binding.get("dialogueOnsetFrame", math.inf) < proof["nextStartFrame"]
            and proof.get("nextProbe") == row.get("nextProbeEvidence") and proof.get("nextCertificate") == row.get("nextCertificateEvidence")
            and proof.get("probeCatalog") == row.get("probeCatalog"))


def bound_pair_refs(row, identity):
    refs = row["proofKey"].get("boundReferences")
    if not isinstance(refs, list) or not refs or not all(isinstance(r, dict) for r in refs):
        return False
    own = row.get("originalQuestionIdentity", {})
    required = [identity.get(k) for k in ("prepared", "originalPrepared", "questionFile", "liveSnapshot")]
    required.extend(own.get(k) for k in ("prepared", "originalPrepared", "questionFile", "liveSnapshot"))
    required.extend(row.get(k) for k in ("probeEvidence", "dialogueProbeEvidence", "probeCatalog", "nextProbeEvidence", "nextNumberClipEvidence"))
    source_audio = row["proofKey"]["pairedNextBoundary"].get("sourceAudio", {})
    if not isinstance(source_audio, dict) or source_audio.get("sha256") != row.get("sourceAudioSha256"):
        return False
    required.append(source_audio)
    for ref in required:
        if not isinstance(ref, dict) or not any(r.get("sha256") == ref.get("sha256") and Path(r.get("path", "")).resolve() == Path(ref.get("path", "")).resolve() for r in refs):
            return False
    for ref in refs:
        v.require(v.sha(ref["path"]) == ref["sha256"], "ancestor_next_pair_nested_evidence_corruption")
    paired = row["proofKey"]["pairedNextBoundary"]
    for field, segments_field, maximum in (("nextProbeEvidence", "contextRawSegments", 14),
                                            ("nextNumberClipEvidence", "numeralRawSegments", 3)):
        source = {"sourceRecordId": row["sourceRecordId"], "sourceAudioSha256": row["sourceAudioSha256"],
                  "sourceAudioPath": source_audio["path"]}
        _, probe = a.checked_probe(row, source, field)
        index = a.probe_segments(probe, max_duration=maximum)
        selected = v.select_segments(index, row[field].get("segmentIds"))
        if not (probe.get("requestedLanguage") == "ko" and probe.get("startFrame") == paired["startFrame"]
                and probe.get("onsetFrame") == paired["onsetFrame"] and row[field].get("inputMonoFloat32Sha256") == probe.get("inputMonoFloat32Sha256")
                and selected[0]["id"] == next(iter(index)) and selected[0]["estimatedStartSeconds"] <= 2
                and row[field].get("text") == " ".join(s["text"] for s in selected)):
            return False
        if field == "nextProbeEvidence":
            prefix, _ = l.complete_instruction_prefix(index, selected)
            if paired.get(segments_field) != prefix:
                return False
        elif paired.get(segments_field) != selected or l.literal_cue(" ".join(s["text"] for s in selected)) != (paired["scopeQuestionNumbers"], ""):
            return False
    return True
