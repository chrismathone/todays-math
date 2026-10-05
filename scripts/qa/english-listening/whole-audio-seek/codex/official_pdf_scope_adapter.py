"""Exact original image-PDF identity and physical next-scope order, version two."""
import base64
import copy
import hashlib
import json
import math
import re
import struct

import claude_adapter as a
import official_catalog_adapter as official
import verifier as v

ADAPTER = "official-pdf-native-scope-v2"
GRADE = "official_pdf_native_scope_v2"


def canonical_question(question):
    result = copy.deepcopy(question)
    result.pop("audioRange", None)
    if isinstance(result.get("image"), dict) and result["image"].get("role") == "question":
        result["image"].pop("role")
    return result


def value_sha(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()


def source_identity(row, source, question, replay):
    prepared_ref = {"path": source["preparedPath"], "sha256": source["preparedSha256"]}
    native = v.checked_ref(prepared_ref)
    pdf_identity = a.original_question_identity(source, question)
    original = v.checked_ref(pdf_identity["originalPrepared"])
    v.require(native.get("sourceRecordId") == original.get("sourceRecordId") == source["sourceRecordId"],
              "official_scope_original_source_mismatch")
    native_questions = [q for q in native.get("questions", []) if q.get("questionId") == question["id"]]
    originals = [q for g in original.get("editableInput", {}).get("groups", []) if g.get("id") == source["groupId"]
                 for q in g.get("questions", []) if q.get("id") == question["id"]]
    v.require(len(native_questions) == len(originals) == 1 and v.integer(question["sourceNumber"])
              and native_questions[0].get("sourceNumber") == originals[0].get("sourceNumber") == question["sourceNumber"],
              "official_scope_original_question_or_ordinal_mismatch")
    snapshot_ref = getattr(replay, "current_snapshot_ref", None)
    v.require(isinstance(snapshot_ref, dict) and v.sha(snapshot_ref["path"]) == snapshot_ref["sha256"],
              "official_scope_missing_frozen_current_snapshot")
    snapshot = getattr(replay, "current_snapshot_document", {})
    v.require(isinstance(snapshot, dict) and snapshot.get("id") == source["setId"] and snapshot.get("revision") == source["revision"],
              "official_scope_current_snapshot_identity_mismatch")
    current = [q for g in snapshot.get("document", {}).get("groups", []) if g.get("id") == source["groupId"]
               for q in g.get("questions", []) if q.get("id") == question["id"]]
    v.require(len(current) == 1 and all(current[0].get(k) == question.get(k) for k in
              ("sourceNumber", "prompt", "instruction", "metadata", "evidence", "audioRange")),
              "official_scope_current_question_changed")
    identity = {"method": "exact_original_pdf_native_member_v2", "questionId": question["id"],
                "sourceNumber": question["sourceNumber"], "sourceRecordId": source["sourceRecordId"],
                **pdf_identity, "prepared": prepared_ref, "liveSnapshot": snapshot_ref}
    return identity, native_questions[0], originals[0], current[0]


def placeholder_identity(row, source, question, replay):
    number = question["sourceNumber"]
    v.require(row.get("kind") == "single" and row.get("scopeQuestionNumbers") == [number]
              and question.get("prompt") == f"원본 문제지 {number}번 문항" and not question.get("instruction"),
              "official_scope_not_exact_empty_instruction_placeholder")
    identity, native, original, current = source_identity(row, source, question, replay)
    v.require(not original.get("instruction") and not native.get("instruction")
              and canonical_question(current) == canonical_question(original),
              "official_scope_original_editable_question_changed")
    v.require(all(native.get(k) == original.get(k) for k in ("prompt", "sourceNumber", "choices", "answerChoiceId"))
              and canonical_question({"image": native.get("image")}) == canonical_question({"image": original.get("image")}),
              "official_scope_native_original_crop_binding_changed")
    conversion, image = native.get("conversion", {}), native.get("image", {})
    v.require(isinstance(conversion, dict) and isinstance(image, dict), "official_scope_missing_image_crop")
    v.require(conversion.get("method") == "original_image_preserved" and conversion.get("nativePrompt") is False
              and conversion.get("nativeChoices") is False and v.integer(conversion.get("sourcePage"))
              and conversion["sourcePage"] > 0, "official_scope_not_original_image_preservation")
    bounds = conversion.get("bounds")
    v.require(isinstance(bounds, list) and len(bounds) == 4 and all(type(n) in (int, float) and math.isfinite(n) for n in bounds)
              and 0 <= bounds[0] < bounds[2] and 0 <= bounds[1] < bounds[3], "official_scope_invalid_original_crop_bounds")
    data = image.get("dataUrl", "")
    v.require(isinstance(data, str) and data.startswith("data:image/png;base64,"), "official_scope_missing_original_png")
    try:
        png = base64.b64decode(data.split(",", 1)[1], validate=True)
    except (ValueError, TypeError) as error:
        raise v.InvalidEvidence("official_scope_invalid_original_png") from error
    v.require(png[:8] == b"\x89PNG\r\n\x1a\n" and png[12:16] == b"IHDR" and len(png) >= 24,
              "official_scope_invalid_original_png")
    width, height = struct.unpack(">II", png[16:24])
    visual = hashlib.sha256(png).hexdigest()
    v.require(width > 0 and height > 0 and width == image.get("width") and height == image.get("height")
              and visual == conversion.get("visualSha256"), "official_scope_original_visual_hash_or_dimensions_changed")
    instruction = row.get("scriptEvidence", {}).get("instructionQuote")
    v.require(isinstance(instruction, str) and len(a.compact(instruction)) >= 12,
              "official_scope_missing_substantive_original_instruction")
    identity.update(method="exact_original_pdf_placeholder_v2", instructionQuote=instruction,
        originalEditableQuestionSha256=value_sha(canonical_question(original)),
        currentQuestionSha256=value_sha(canonical_question(current)),
        crop={"method": conversion["method"], "visualSha256": visual, "width": width, "height": height,
              "sourcePage": conversion["sourcePage"], "bounds": bounds})
    return identity


def first_native_opening(row, source, replay, binding):
    v.require(row.get("dialogueProbeEvidence") and row.get("scriptEvidence"), "official_scope_requires_first_native_dialogue")
    _, probe = a.checked_probe(row, source, "dialogueProbeEvidence")
    member = row.get("kind") == "shared_instruction_member"
    expected_purpose = "member_dialogue" if member else "first_dialogue"
    v.require(probe.get("requestedLanguage") == "en" and probe.get("purpose") == expected_purpose,
              "official_scope_wrong_opening_language_or_purpose")
    index = a.probe_segments(probe, max_duration=14 if member else 60)
    selected = v.select_segments(index, row["scriptEvidence"].get("dialogueProbeSegmentIds"))
    evidence = row["dialogueProbeEvidence"]
    v.require(evidence.get("segmentIds") == [s["id"] for s in selected]
              and evidence.get("text") == " ".join(s["text"] for s in selected)
              and evidence.get("inputMonoFloat32Sha256") == probe["inputMonoFloat32Sha256"],
              "official_scope_opening_raw_quote_or_selection_changed")
    v.require(selected[0]["id"] == next(iter(index)) and selected[0]["estimatedStartSeconds"] <= 2,
              "official_scope_opening_not_first_native_speech")
    text = a.original_transcript(source)
    script = row["scriptEvidence"]
    turns = a.original_turns(text[script["sectionStartCharacter"]:script["sectionEndCharacter"]], script["sectionStartCharacter"])
    wanted = a.exact_opening_words(script, text, turns) if script.get("firstDialogueOpeningEvidence") else a.english_words(script["firstDialogueQuote"])
    heard = a.english_words(" ".join(s["text"] for s in selected))
    v.require(heard[:len(wanted)] == wanted, "official_scope_opening_not_first_native_words")
    words = [w for s in selected for w in s.get("words", [])]
    v.require(words and a.english_words(" ".join(w.get("text", w.get("word", "")) for w in words)) == heard,
              "official_scope_opening_word_text_artifact")
    previous = -1
    for segment in selected:
        for word in segment.get("words", []):
            lo, hi = word["localStartSeconds"], word["localEndSeconds"]
            v.require(segment["estimatedStartSeconds"] <= lo < hi <= segment["estimatedEndSeconds"]
                      and previous <= lo and word["probability"] > 0, "official_scope_opening_word_timing_or_confidence_artifact")
            previous = lo
    return {"method": "first_literal_native_opening_v2", "probe": row["dialogueProbeEvidence"],
            "purpose": expected_purpose, "maximumInputSeconds": 14 if member else 60,
            "rawSegments": selected, "selectedStartFrame": probe["startFrame"] + math.floor(selected[0]["estimatedStartSeconds"] * replay.actual["sampleRate"]),
            "selectedEndFrame": binding["selectedEstimatedEndFrame"]}


def validate(row, source, question, clock, replay, full_index):
    v.require(row.get("evidenceAdapter") == ADAPTER and not source["reconstructed"], "official_scope_wrong_source_or_version")
    for field in ("probeEvidence", "numberClipEvidence"):
        if row.get(field):
            _, probe = a.checked_probe(row, source, field)
            v.require(probe.get("requestedLanguage") == "ko", "official_scope_wrong_heading_language:" + field)
    v.require(not row.get("officialTerminalEvidence") and (row.get("nextProbeEvidence") or row.get("nextCertificateEvidence")),
              "official_scope_requires_very_next_original_proof")
    placeholder = re.fullmatch(r"원본 문제지 \d+번 문항", question.get("prompt", "")) is not None
    if placeholder:
        identity = placeholder_identity(row, source, question, replay)
        v.require(isinstance(row.get("officialIdentityEvidence"), dict)
                  and row["officialIdentityEvidence"].get("method") == "numbered_section_own_dialogue_v1",
                  "official_scope_placeholder_requires_unchanged_numbered_section")
    else:
        v.require(row.get("kind") == "shared_instruction_member" and question["sourceNumber"] == 19
                  and question.get("instruction"), "official_scope_outside_demonstrated_representation_gaps")
        identity, _, _, _ = source_identity(row, source, question, replay)
    proof, raw, _, _ = official.validate(row, source, question, clock, replay, full_index,
                                        native_scope=True, placeholder_identity=identity if placeholder else None)
    binding = proof.get("dialogueBinding", {})
    v.require(binding and proof.get("nextSpokenNumbers") and proof["nextSpokenNumbers"][0] == row["scopeQuestionNumbers"][-1] + 1,
              "official_scope_missing_exact_native_order_identity")
    next_start = proof["nextStartFrame"]
    opening = first_native_opening(row, source, replay, binding)
    v.require(row["nativeEvidence"]["onsetFrame"] <= opening["selectedStartFrame"] < opening["selectedEndFrame"] <= next_start
              and binding["dialogueOnsetFrame"] < next_start < proof["nextOnsetFrame"], "official_scope_native_dialogue_crosses_next_original")
    binding.update(method="measured_native_original_next_scope_v2", originalOffsetMethod=binding["method"],
                   nextStartFrame=next_start, nextOnsetFrame=proof["nextOnsetFrame"], nextScopeQuestionNumbers=[proof["nextSpokenNumbers"][0]])
    proof.update(officialSourceIdentity=identity, nativeFirstOpening=opening,
                 questionId=question["id"], scopeQuestionNumbers=row["scopeQuestionNumbers"],
                 cueSpokenNumbers=row["cueSpokenNumbers"], cueNumber=row["cueNumber"], kind=row["kind"])
    proof["boundReferences"].extend(identity[key] for key in ("prepared", "originalPrepared", "questionFile", "liveSnapshot"))
    return proof, raw, GRADE, identity
