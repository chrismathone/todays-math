"""Audit all offered outcomes and exact preserved ranges without new admission."""
import argparse
import collections
from pathlib import Path

import verifier as v


def candidates(document):
    rows = document if isinstance(document, list) else document["records"]
    return [r for r in rows if r.get("status") == "candidate"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for key in ("certificate", "baseline", "controls", "plan", "output"):
        parser.add_argument("--" + key, required=True)
    parser.add_argument("--marks", action="append", required=True)
    parser.add_argument("--cohort", action="append", default=[], help="NAME=PATH, first matching cohort wins")
    parser.add_argument("--previous")
    args = parser.parse_args()
    refs = {key: v.reference(getattr(args, key)) for key in ("certificate", "baseline", "controls", "plan")}
    current, baseline, grouped, plan = [v.checked_ref(refs[key]) for key in ("certificate", "baseline", "controls", "plan")]
    for certificate in (current, baseline):
        v.require(certificate.get("completeReplay") is True and certificate.get("errors") == [], "evaluation_incomplete_certificate")
        v.require(certificate.get("writesDatabase") is False and certificate.get("writesStorage") is False
                  and certificate.get("humanReviewed") is False, "evaluation_not_read_only_machine_evidence")
    index = {r["questionId"]: r for r in current["records"]}
    old_index = {r["questionId"]: r for r in baseline["records"]}
    v.require(len(index) == len(current["records"]) == len(old_index) == len(baseline["records"])
              and set(index) == set(old_index), "evaluation_changed_total_population")
    preserved = [r for r in baseline["records"] if r["status"] == "preserved"]
    for old in preserved:
        actual = index[old["questionId"]]
        v.require(actual["status"] == "preserved" and all(actual.get(key) == old.get(key) for key in
                  ("audioRange", "sourceRecordId", "setId", "questionId", "sourceNumber", "sourceAudioSha256", "playbackSha256")),
                  "evaluation_changed_existing_exact_range_or_identity")
    sources = {r["sourceRecordId"] for r in current["records"]}
    v.require(len(sources) == len(current["sourceChecks"]) == current["counts"]["sources"]
              and all(s["status"] == "passed" for s in current["sourceChecks"]), "evaluation_missing_actual_source_replay")
    cohorts = []
    for item in args.cohort:
        name, path = item.split("=", 1)
        key = "cohort:" + name
        v.require(key not in refs, "evaluation_duplicate_cohort_name")
        refs[key] = v.reference(path)
        cohorts.append((name, {r["questionId"] for r in candidates(v.checked_ref(refs[key]))}))
    previous_index = {}
    if args.previous:
        refs["previous"] = v.reference(args.previous)
        previous = v.checked_ref(refs["previous"])
        v.require(previous.get("completeReplay") is True and not previous.get("errors"), "evaluation_incomplete_previous_run")
        previous_index = {r["questionId"]: r for r in previous["records"]}
    families = {}
    v.require(grouped["inputs"]["inventory"]["sha256"] == current["inputs"]["inventory"]["sha256"], "evaluation_control_inventory_changed")
    for partition, groups in grouped["partitions"].items():
        for group in groups:
            sid, identity = group["sourceRecordId"], {"partition": partition, "familyId": group["familyId"]}
            v.require(sid not in families or families[sid] == identity, "evaluation_source_crosses_control_partition")
            families[sid] = identity
    offers = []
    for number, path in enumerate(args.marks):
        key = "marks:" + str(number)
        refs[key] = v.reference(path)
        offers.extend(candidates(v.checked_ref(refs[key])))
    offered_ids = {r["questionId"] for r in offers}
    v.require(len(offered_ids) == len(offers) and offered_ids <= set(index), "evaluation_duplicate_or_unknown_offer")
    v.require(all(index[q]["status"] in ("admitted", "held") for q in offered_ids), "evaluation_offer_not_explicitly_settled")
    v.require({r["questionId"] for r in current["records"] if r["status"] == "admitted"} <= offered_ids, "evaluation_unoffered_admission")
    outcomes, transitions = [], []
    pilot_ids = {r["questionId"] for r in plan["candidateQuestions"]}
    for offered in offers:
        qid = offered["questionId"]
        result = index[qid]
        cohort = next((name for name, ids in cohorts if qid in ids),
                      "new_boundary" if offered.get("nextBoundaryProbeEvidence") else "other_offered")
        physical = {key: offered.get("nativeEvidence", {}).get(key) for key in
                    ("sampleRate", "channels", "frameCount", "pcmSha256", "startFrame", "onsetFrame")}
        row = {"questionId": qid, "sourceRecordId": result["sourceRecordId"], "cohort": cohort,
               "frozenControlFamily": families.get(result["sourceRecordId"]), "inResearchPilot": qid in pilot_ids,
               "offeredAdapter": offered.get("evidenceAdapter"), "offeredStartMs": offered["seekStartMs"],
               "offeredScopeNumbers": offered.get("scopeQuestionNumbers"), "offeredNativeClock": physical,
               "status": result["status"], "reasons": result["reasons"], "audioRange": result.get("audioRange"),
               "evidenceGrade": result.get("evidenceGrade"), "humanGold": False}
        if result["status"] == "admitted":
            v.require(result["audioRange"]["startMs"] == offered["seekStartMs"]
                      and result["scopeQuestionNumbers"] == offered["scopeQuestionNumbers"], "evaluation_changed_offered_start_or_scope")
        outcomes.append(row)
        if qid in previous_index:
            prior = previous_index[qid]
            transitions.append({"questionId": qid, "cohort": cohort, "from": prior["status"], "to": result["status"],
                                "previousReasons": prior["reasons"], "currentReasons": result["reasons"],
                                "sameStartWhenBothAdmitted": prior.get("audioRange") == result.get("audioRange")
                                    if prior["status"] == result["status"] == "admitted" else None})
    counts = {"sources": len(sources), "questions": len(index), "exactPreserved": len(preserved), "offered": len(offers),
              "offeredOutcomes": dict(collections.Counter(r["status"] for r in outcomes)),
              "cohorts": {name: dict(collections.Counter(r["status"] for r in outcomes if r["cohort"] == name))
                          for name in sorted({r["cohort"] for r in outcomes})},
              "researchPilot": dict(collections.Counter(index[q]["status"] for q in pilot_ids)),
              "unofferedHeld": sum(r["status"] == "held" and r["questionId"] not in offered_ids for r in current["records"]),
              "byControlPartition": dict(collections.Counter((r["frozenControlFamily"] or {}).get("partition", "unassigned") + ":" + r["status"] for r in outcomes))}
    implementation = [v.reference(p) for p in sorted(Path(__file__).parent.iterdir()) if p.suffix in (".py", ".mts", ".md")]
    frozen = list(refs.values()) + list(current["inputs"].values()) + current["implementation"] + implementation
    for ref in frozen:
        v.require(v.sha(ref["path"]) == ref["sha256"], "evaluation_input_or_implementation_changed")
    v.immutable_write(args.output, {"schemaVersion": 1, "diagnosticOnly": True, "admissionAuthority": False,
        "writesDatabase": False, "writesStorage": False, "writesMedia": False, "humanReviewed": False,
        "inputs": refs, "implementation": implementation, "counts": counts, "offeredOutcomes": outcomes,
        "previousRunTransitions": transitions,
        "limitations": ["Admission authority remains the independently executed complete certificate.",
                        "Control families are existing certified regression references, not human or external gold.",
                        "Boundary-v3 design used observed pilot outcomes; this is outcome-informed development.",
                        "A source absent from frozen control families is explicitly unassigned, not a new holdout."]})
    print(counts)


if __name__ == "__main__":
    main()
