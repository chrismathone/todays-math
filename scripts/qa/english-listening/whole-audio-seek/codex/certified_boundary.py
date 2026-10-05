"""A previously admitted original scope can supply an exact preserved neighbor."""
from pathlib import Path

import claude_adapter as a
import verifier as v


def origin_record(row, source):
    claim = row.get("nextCertificateEvidence", {})
    certificate = v.checked_ref(claim.get("certificate"))
    matches = [r for r in certificate.get("records", []) if r.get("sourceRecordId") == source["sourceRecordId"]
               and r.get("questionId") == claim.get("questionId")]
    v.require(len(matches) == 1, "next_certificate_wrong_question")
    return certificate, matches[0]


def validate(row, source, replay):
    claim = row.get("nextCertificateEvidence", {})
    reference = claim.get("certificate")
    certificate, origin = origin_record(row, source)
    v.require(certificate.get("completeReplay") is True and certificate.get("errors") == []
              and certificate.get("humanReviewed") is False and certificate.get("writesDatabase") is False
              and certificate.get("writesStorage") is False, "next_certificate_not_complete_source_proof")
    qid = claim.get("questionId")
    authority = getattr(replay, "trusted_boundaries", {}).get(qid)
    v.require(isinstance(authority, dict) and authority.get("certificate", {}).get("sha256") == reference.get("sha256")
              and Path(authority["certificate"]["path"]).resolve() == Path(reference["path"]).resolve()
              and authority.get("scopeQuestionNumbers") == claim.get("scopeQuestionNumbers")
              and authority.get("onsetFrame") == claim.get("nativeOnsetFrame") and authority.get("startMs") == claim.get("startMs"),
              "next_certificate_not_validated_ancestor_boundary")
    current = [q for q in source["questions"] if q["id"] == qid]
    v.require(len(current) == 1, "next_certificate_wrong_question")
    question = current[0]
    v.require(origin.get("status") == "admitted" and question.get("audioRange") == origin.get("audioRange")
              and origin.get("setId") == source["setId"] and origin.get("sourceNumber") == question["sourceNumber"]
              and origin.get("sourceAudioSha256") == source["sourceAudioSha256"]
              and origin.get("playbackSha256") == source["audio"]["sha256"], "next_certificate_not_exact_preserved_admission")
    scope = origin.get("scopeQuestionNumbers")
    v.require(isinstance(scope, list) and scope and scope == sorted(set(scope))
              and all(v.integer(n) and 1 <= n <= 50 for n in scope), "next_certificate_missing_original_scope")
    if source["reconstructed"]:
        v.require(v.reconstructed_admission_origin(origin), "next_certificate_reconstructed_origin_unverified")
    else:
        v.require(origin.get("evidenceGrade") in ("numbered_instruction", "numbered_section_own_dialogue", "official_alignment", "ordinal_only")
                  and question["sourceNumber"] in scope, "next_certificate_official_origin_unverified")
    native = origin.get("nativeEvidence", {})
    for key in ("sampleRate", "channels", "frameCount", "pcmSha256"):
        v.require(native.get(key) == replay.actual[key], "next_certificate_actual_pcm_mismatch:" + key)
    a.measured_onset(native, replay)
    cache = v.checked_ref({"path": native.get("cachePath"), "sha256": native.get("cacheSha256")})
    v.require(cache.get("sourceRecordId") == source["sourceRecordId"]
              and cache.get("sourceAudioSha256") == source["sourceAudioSha256"], "next_certificate_native_cache_wrong_source")
    for key in ("sampleRate", "channels", "frameCount"):
        v.require(cache["pcm"].get(key) == replay.actual[key], "next_certificate_cache_clock_mismatch:" + key)
    v.require(cache["pcm"].get("sha256") == replay.actual["pcmSha256"]
              and cache["playback"].get("sha256") == source["audio"]["sha256"], "next_certificate_cache_pcm_mismatch")
    v.require(v.sha(native.get("energyPath")) == native.get("energySha256")
              == cache["energy"].get("sha256") == replay.actual["energySha256"], "next_certificate_energy_mismatch")
    refs = [reference, {"path": native["cachePath"], "sha256": native["cacheSha256"]},
            {"path": native["energyPath"], "sha256": native["energySha256"]}]
    for ref in origin.get("proofKey", {}).get("boundReferences", []):
        v.require(v.sha(ref["path"]) == ref["sha256"], "next_certificate_nested_hash_mismatch")
        refs.append(ref)
    catalog = v.checked_ref(row.get("probeCatalog"))
    # A preserved certificate boundary still replays its original raw request
    # and recognition PCM; the historical provider timestamp has no authority.
    for field in ("probeEvidence", "dialogueProbeEvidence", "numberClipEvidence"):
        if not origin.get(field):
            continue
        v.require(any(r.get("sha256") == origin[field].get("sha256") and
                      Path(r.get("path", "")).resolve() == Path(origin[field].get("path", "")).resolve()
                      for r in catalog.get("rawArtifacts", [])), "next_certificate_raw_missing_from_catalog")
        container, probe = a.checked_probe(origin, source, field)
        refs.extend([origin[field], {"path": container["requestPath"], "sha256": container["requestSha256"]}])
        a.checked_full_pcm(container, replay.actual, "next_certificate_raw_full_pcm_mismatch")
        actual = replay.replay(probe)
        for key in ("clipPcmSha256", "inputMonoFloat32Sha256", "inputSampleCount"):
            v.require(probe.get(key) == actual[key], "next_certificate_raw_probe_hash:" + key)
        index = a.probe_segments(probe)
        selected = v.select_segments(index, origin[field].get("segmentIds"), allow_uncertain=bool(origin.get("scriptEvidence")))
        v.require(origin[field].get("text") == " ".join(s["text"] for s in selected)
                  and origin[field].get("inputMonoFloat32Sha256") == probe["inputMonoFloat32Sha256"],
                  "next_certificate_raw_quote_mismatch")
        if field == "probeEvidence":
            v.require(probe["startFrame"] == native["startFrame"] and probe["onsetFrame"] == native["onsetFrame"],
                      "next_certificate_raw_native_start_mismatch")
            if source["reconstructed"]:
                spoken, _ = a.leading_cue(" ".join(s["text"] for s in selected))
                v.require(spoken == origin.get("cueSpokenNumbers") and spoken and scope[0] in spoken,
                          "next_certificate_original_raw_scope_mismatch")
    v.require(origin.get("probeEvidence") is not None, "next_certificate_missing_native_probe")
    v.require(claim.get("scopeQuestionNumbers") == scope and claim.get("nativeOnsetFrame") == native.get("onsetFrame")
              and claim.get("startMs") == question["audioRange"]["startMs"] == native["startFrame"] * 1000 // native["sampleRate"],
              "next_certificate_original_scope_or_native_start_changed")
    return native, scope, origin.get("cueSpokenNumbers") or scope, refs
