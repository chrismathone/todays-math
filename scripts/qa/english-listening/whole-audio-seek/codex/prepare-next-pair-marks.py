"""Freeze explicitly scoped metadata adapters; raw provider/generation facts stay exact."""
import argparse
import copy
from pathlib import Path

import official_catalog_adapter as official
import official_next_pair_adapter as pair
import official_pdf_scope_adapter as pdf
import verifier as v


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--marks", action="append", required=True)
    parser.add_argument("--pair-question", action="append", default=[])
    parser.add_argument("--scope-question", action="append", default=[])
    parser.add_argument("--bind-joint-next-question", action="append", default=[])
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    destination = Path(args.output)
    v.require(not destination.exists(), "metadata_adapter_output_exists")
    paired, scope, joint = map(set, (args.pair_question, args.scope_question, args.bind_joint_next_question))
    v.require(not paired & scope and joint <= scope, "metadata_adapter_overlapping_or_unscoped_ids")
    inputs = [v.reference(path) for path in args.marks]
    seen, outputs, changes = set(), [], []
    for ref in inputs:
        original = v.checked_ref(ref)
        document = copy.deepcopy(original)
        for before, after in zip(original["records"], document["records"]):
            qid = before["questionId"]
            if qid not in paired | scope:
                v.require(before == after, "metadata_adapter_changed_unscoped_record")
                continue
            v.require(qid not in seen and before.get("status") == "candidate", "metadata_adapter_duplicate_or_not_candidate")
            seen.add(qid)
            allowed = {"evidenceAdapter"}
            if qid in paired:
                v.require(before.get("evidenceAdapter") in (official.ADAPTER, pdf.ADAPTER), "metadata_adapter_unknown_start_version")
                after.update(evidenceAdapter=pair.ADAPTER, originalStartAdapter=before["evidenceAdapter"])
                allowed.add("originalStartAdapter")
            else:
                v.require(before.get("evidenceAdapter") == official.ADAPTER, "metadata_adapter_not_original_official")
                after["evidenceAdapter"] = pdf.ADAPTER
            if qid in joint:
                v.require(not before.get("nextProbeEvidence") and not before.get("nextCertificateEvidence")
                          and before.get("nextBoundaryProbeEvidence") and before.get("nextBoundaryNativeEvidence"),
                          "metadata_adapter_missing_original_joint_end")
                after.update(nextProbeEvidence=copy.deepcopy(before["nextBoundaryProbeEvidence"]),
                             nextNativeEvidence=copy.deepcopy(before["nextBoundaryNativeEvidence"]))
                allowed.update(("nextProbeEvidence", "nextNativeEvidence"))
            v.require({k: val for k, val in before.items() if k not in allowed} ==
                      {k: val for k, val in after.items() if k not in allowed}, "metadata_adapter_changed_raw_or_generation_facts")
            changes.append({"questionId": qid, "changedFields": sorted(allowed),
                            "before": {k: before.get(k) for k in allowed}, "after": {k: after.get(k) for k in allowed}})
        outputs.append((Path(ref["path"]).name, document))
    v.require(seen == paired | scope, "metadata_adapter_missing_scoped_question")
    v.require(len({name for name, _ in outputs}) == len(outputs), "metadata_adapter_duplicate_output_filename")
    report = {"schemaVersion": 1, "inputs": inputs, "changes": changes, "rawFactsChanged": False,
              "generationAnchorsChanged": False, "newAudioExperiment": False, "writesDatabase": False, "writesStorage": False,
              "implementation": [v.reference(path) for path in sorted(Path(__file__).parent.iterdir()) if path.suffix in (".py", ".mts", ".md")]}
    v.immutable_write(destination / "adaptation.json", report)
    for name, document in outputs:
        document["nativeNextPairAdaptation"] = v.reference(destination / "adaptation.json")
        v.immutable_write(destination / name, document)
    print({"output": str(destination), "changes": len(changes), "marks": [name for name, _ in outputs]})


if __name__ == "__main__":
    main()
