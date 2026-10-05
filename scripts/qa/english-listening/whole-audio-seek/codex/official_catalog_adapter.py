"""Official recovery adds catalog/neighbor checks to unchanged v1 script gates."""
import re

import claude_adapter as a
import localized_adapter as l
import verifier as v

ADAPTER = "official-catalogued-native-v1"


def terminal_population(row, source, replay):
    claim = row.get("officialTerminalEvidence", {})
    v.require(claim.get("method") == "exact_official_original_population_end_v1", "official_terminal_unknown_method")
    prepared_ref = {"path": source["preparedPath"], "sha256": source["preparedSha256"]}
    prepared = v.checked_ref(claim.get("prepared"), source["preparedPath"])
    v.require(claim["prepared"] == prepared_ref, "official_terminal_prepared_hash_mismatch")
    original_ref = {"path": prepared.get("originalPreparedPath"), "sha256": prepared.get("originalPreparedSha256")}
    original = v.checked_ref(claim.get("originalPrepared"), original_ref["path"])
    v.require(claim["originalPrepared"] == original_ref and prepared.get("sourceRecordId") == original.get("sourceRecordId")
              == source["sourceRecordId"], "official_terminal_original_source_mismatch")
    current = {(q["id"], q["sourceNumber"]) for q in source["questions"]}
    native = {(q["questionId"], q["sourceNumber"]) for q in prepared.get("questions", [])}
    numbers = sorted(q["sourceNumber"] for q in source["questions"])
    original_numbers = sorted(q["sourceNumber"] for g in original.get("editableInput", {}).get("groups", [])
                              for q in g.get("questions", []))
    v.require(current == native and len(current) == len(source["questions"]) == len(prepared.get("questions", []))
              and numbers == original_numbers == list(range(1, len(numbers) + 1)), "official_terminal_incomplete_original_population")
    v.require(numbers and row["scopeQuestionNumbers"][-1] == claim.get("lastOriginalNumber") == numbers[-1]
              and claim.get("sourceFrameCount") == replay.actual["frameCount"], "official_terminal_not_exact_last_original")
    for question in source["questions"]:
        identity = a.original_question_identity(source, question)
        v.require(claim.get("questionFile") == identity["questionFile"], "official_terminal_original_question_file_mismatch")
    return [prepared_ref, original_ref, claim["questionFile"]]


def validate(row, source, question, clock, replay, full_index):
    v.require(row.get("evidenceAdapter") == ADAPTER and not source["reconstructed"], "official_catalog_adapter_wrong_source_or_version")
    catalog, refs, diagnostics = l.replay_catalog(row, source, replay)
    old_proof, segments, grade, identity = a.validate(row, source, question, clock, replay, full_index)
    _, head_probe = a.checked_probe(row, source)
    l.measure_probe_onset(row, source, replay, "probeEvidence", head_probe)
    scope = row["scopeQuestionNumbers"]
    spoken = row.get("cueSpokenNumbers") or scope
    head_start = row["nativeEvidence"]["startFrame"]
    v.require(sum(bool(row.get(k)) for k in ("nextProbeEvidence", "nextCertificateEvidence", "officialTerminalEvidence")) == 1,
              "official_catalog_missing_or_multiple_next_boundaries")
    terminal = bool(row.get("officialTerminalEvidence"))
    if terminal:
        refs.extend(terminal_population(row, source, replay))
        if row.get("terminalProbeEvidence"):
            neighbor, next_spoken, _, terminal_refs = l.terminal_probe(row, source, replay, catalog,
                                                                     original_last_number=scope[-1])
            refs.extend(terminal_refs)
        else:
            neighbor = {"startFrame": replay.actual["frameCount"], "onsetFrame": replay.actual["frameCount"]}
            next_spoken = []
        next_scope = []
    elif row.get("nextCertificateEvidence"):
        from certified_boundary import validate as certified_boundary
        neighbor, next_scope, next_spoken, next_refs = certified_boundary(row, source, replay)
        refs.extend(next_refs)
    else:
        neighbor, next_spoken, _, _, next_refs = l.numbered_probe(row, source, replay, "nextProbeEvidence",
                                                                require_instruction=row.get("kind") != "shared_instruction_head")
        next_scope = [next_spoken[0]]
        refs.extend(next_refs)
    v.require((terminal or next_scope[0] == scope[-1] + 1) and neighbor["startFrame"] > head_start,
              "official_catalog_wrong_neighbor")
    for _, other, _ in catalog:
        if other.get("requestedLanguage") != "ko" or not other.get("segments"):
            continue
        text = other["segments"][0].get("text", "")
        numbers, _ = l.literal_cue(text)
        if other["startFrame"] == head_start:
            v.require(not numbers or numbers == spoken, "official_catalog_contradictory_head_number")
        elif numbers == spoken:
            v.require(abs(other.get("onsetFrame", -1) - row["nativeEvidence"]["onsetFrame"]) <= 3 * replay.actual["sampleRate"],
                      "official_catalog_distant_duplicate_head")
        if head_start < other["startFrame"] < neighbor["startFrame"]:
            bare = re.match(r"^\s*\d{1,2}\s*[.,]", text) and re.search(r"듣고|고르시오|고르세요|답하시오|선택하시오|listen\b|choose\b", text, re.I)
            v.require(not bare and (not numbers or numbers == spoken), "official_catalog_unresolved_internal_heading")
        if other["startFrame"] == neighbor["startFrame"]:
            v.require(not numbers or numbers == next_spoken, "official_catalog_contradictory_neighbor")
    for field in ("dialogueProbeEvidence",):
        if row.get(field):
            _, probe = a.checked_probe(row, source, field)
            v.require(head_start <= probe["startFrame"] < probe["startFrame"] + probe["frameCount"] <= neighbor["startFrame"],
                      "official_catalog_dialogue_clip_crosses_passage")
    refs.extend([{"path": row["nativeEvidence"]["cachePath"], "sha256": row["nativeEvidence"]["cacheSha256"]},
                 {"path": row["nativeEvidence"]["energyPath"], "sha256": row["nativeEvidence"]["energySha256"]}])
    proof = {**old_proof, "adapter": ADAPTER, "nextProbe": row.get("nextProbeEvidence"),
             "nextCertificate": row.get("nextCertificateEvidence"), "nextOnsetFrame": neighbor["onsetFrame"],
             "officialTerminalEvidence": row.get("officialTerminalEvidence"),
             "nextBoundaryKind": "exact_official_original_population_end_v1" if terminal else
                                 "exact_preserved_original_scope_v1" if row.get("nextCertificateEvidence") else "next_numbered_native",
             "nextSpokenNumbers": next_spoken, "probeCatalog": row["probeCatalog"],
             "catalogDiagnostics": diagnostics, "boundReferences": refs, "providerTimingAuthority": False}
    return proof, segments, grade, identity
