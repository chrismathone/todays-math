"""Explicit frozen identity join for incomplete reconstructed assembler metadata.

No question, scope, cue, timestamp, recognition or status is repaired. The
strict actual-source admission verifier must run on the derived immutable queue.
"""
import argparse
import copy

import verifier as v


FIELDS = ("sourceAudioSha256", "playbackSha256", "asrPath", "asrSha256")


def recover(queue, inventory, inventory_ref, proposal_ref, implementation_ref, dispatch_id):
    v.require(queue.get("provider") == "grok", "identity_join_requires_reconstructed_lane")
    v.require(v.integer(queue.get("schemaVersion")) and queue["schemaVersion"] == 1
              and v.integer(queue.get("evidenceContractVersion")) and queue["evidenceContractVersion"] == 1,
              "identity_join_wrong_contract")
    v.require(queue.get("inventorySha256") == inventory_ref["sha256"], "identity_join_wrong_inventory")
    expected = {(s["sourceRecordId"], q["id"]): (s, q)
                for s in inventory["records"] if s["assignedAgent"] == "grok" for q in s["questions"]}
    v.require(expected and isinstance(queue.get("records"), list), "identity_join_missing_queue")
    result = copy.deepcopy(queue)
    seen, changes = set(), []
    for row in result["records"]:
        key = (row.get("sourceRecordId"), row.get("questionId"))
        v.require(key in expected and key not in seen, "identity_join_extra_or_duplicate_question")
        seen.add(key)
        source, question = expected[key]
        v.require(source["reconstructed"] and not question.get("audioRange"), "identity_join_must_not_change_existing_verified")
        values = {"sourceAudioSha256": source["sourceAudioSha256"], "playbackSha256": source["audio"]["sha256"],
                  "asrPath": source["asrPath"], "asrSha256": source["asrSha256"]}
        filled = []
        for field in FIELDS:
            if row.get(field) in (None, ""):
                row[field] = values[field]
                filled.append(field)
        # Populated conflicting fields, stale revision, wrong document/current
        # identity, fabricated generated ordinal and wrong statuses all reject.
        v.validate_identity(row, source, question)
        if filled:
            changes.append({"sourceRecordId": key[0], "questionId": key[1], "filledFields": filled})
    v.require(seen == set(expected), "identity_join_omitted_question")
    adapters = result.setdefault("metadataAdapters", [])
    v.require(isinstance(adapters, list), "invalid_prior_metadata_adapters")
    adapters.append({"contractVersion": 1, "operation": "frozen_source_identity_join_v1", "executedBy": "codex",
                     "dispatchId": dispatch_id, "implementation": implementation_ref,
                     "inputs": {"inventory": inventory_ref, "proposal": proposal_ref},
                     "allowedFilledFields": list(FIELDS), "questionsWithFilledMetadata": len(changes)})
    upstream = result.get("upstreamArtifacts", [])
    v.require(isinstance(upstream, list), "invalid_prior_upstream_artifacts")
    result["upstreamArtifacts"] = upstream + [proposal_ref, inventory_ref, implementation_ref]
    result["productionApplicationAuthorized"] = False
    result["humanReviewed"] = False
    return result, changes


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("inventory", "proposal", "dispatch-id", "output", "report"):
        parser.add_argument("--" + name, required=True)
    args = parser.parse_args()
    inventory_ref, proposal_ref = v.reference(args.inventory), v.reference(args.proposal)
    implementation_ref = v.reference(__file__)
    result, changes = recover(v.checked_ref(proposal_ref), v.checked_ref(inventory_ref),
                              inventory_ref, proposal_ref, implementation_ref, args.dispatch_id)
    for ref in (inventory_ref, proposal_ref, implementation_ref):
        v.require(v.sha(ref["path"]) == ref["sha256"], "identity_join_input_or_implementation_changed")
    v.immutable_write(args.output, result)
    report = {"schemaVersion": 1, "diagnosticOnly": True, "operation": "frozen_source_identity_join_v1",
              "productionApplicationAuthorized": False, "inputs": {"inventory": inventory_ref, "proposal": proposal_ref},
              "implementation": implementation_ref, "derivedQueue": v.reference(args.output),
              "questions": len(result["records"]), "questionsWithFilledMetadata": len(changes), "changes": changes,
              "requirement": "Derived rows remain proposals requiring complete actual-source proof, queue/order/preservation replay and independent coordinator review."}
    v.immutable_write(args.report, report)
    print({"questions": report["questions"], "questionsWithFilledMetadata": len(changes), "derivedQueue": report["derivedQueue"]})


if __name__ == "__main__":
    main()
