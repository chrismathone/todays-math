"""봉인 입력을 바꾸지 않는 답 비교 변경 영향 재생. 상세 답은 외부 출력에만 쓴다."""
from __future__ import annotations

import argparse
import collections
import itertools
import json
import subprocess
import types
from pathlib import Path

import answers
import collect
import integrity


def replay(candidate, row, review, module):
    """662b의 관문 우선순위. 봉인 검사는 기존 결과를 유지하며 새로 인증하지 않는다."""
    solves = [{**value, "verdict": module.compare(candidate["answer"], value["answer"])[0],
               "why": module.compare(candidate["answer"], value["answer"])[1]}
              for value in row["solves"].values()]
    previous_module = collect.answers
    try:
        collect.answers = module
        derived = collect.derived_verdict(review, candidate)
    finally:
        collect.answers = previous_module
    if row["status"] == "보류 — 봉인":
        return row["status"], derived
    if row["similarity"] == "hold":
        return "보류 — 너무 닮음", derived
    unit = [s for s in solves if s["verdict"] == "hold" and s["why"].startswith("단위가 한쪽에만")]
    if "codex" not in row["solves"] or len(solves) < 2 or any(s["verdict"] != "match" or s["issues"] for s in solves):
        other = [s for s in solves if s["verdict"] != "match" and s not in unit]
        return ("보류 — 답 표기(값은 같음)" if unit and not other and len(solves) >= 2 else "보류 — 수학"), derived
    if derived != "pass":
        return "보류 — 검수", derived
    if row["similarity"] in ("warn", "manual") and collect.check_value(review["checks"].get("distinctPresentation")) is not True:
        return "보류 — 너무 닮음", derived
    return "통과", derived


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundle", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--baseline", default="662b7c10c2d7e9168b0ede49050e262ec99439ac")
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[3]
    if args.output.resolve().is_relative_to(repo):
        parser.error("상세 답 비교 출력은 저장소 밖에만 허용")
    old_source = subprocess.check_output(["git", "-C", str(repo), "show",
        f"{args.baseline}:scripts/qa/textbook-twin/answers.py"], text=True)
    old = types.ModuleType("baseline_answers")
    exec(compile(old_source, "baseline_answers.py", "exec"), old.__dict__)
    evidence, comparisons, changes, mismatches, rounds = [], [], [], [], {}
    status_by_id = {}

    def read(path):
        data = path.read_bytes()
        evidence.append({"path": str(path.resolve()), "sha256": integrity.digest(data)})
        return json.loads(data)

    for rnd in ("r1", "r2"):
        bundle = args.bundle / rnd
        original = read(bundle / "collect.json")
        before, after = collections.Counter(), collections.Counter()
        for row in original["rows"]:
            tid = row["twinExternalId"]
            candidate = read(bundle / "candidates" / f"{tid}.json")
            pointer = read(bundle / "reviews" / f"{tid}.json")
            record = read(Path(pointer["externalReview"]))
            if evidence[-1]["sha256"] != pointer["sha256"]:
                raise ValueError(f"외부 검수 바이트가 달라짐: {tid}")
            review = record["parsed"]
            values = {"candidate": candidate["answer"], "review": review.get("verifiedAnswer") or ""}
            for solver, stored in row["solves"].items():
                solve = read(bundle / "solve" / solver / f"{tid}.json")
                value = solve["parsed"].get("answer") or ""
                if value != stored["answer"]:
                    raise ValueError(f"집계와 봉인 풀이 답이 다름: {tid}/{solver}")
                values[solver] = value
            for (a, left), (b, right) in itertools.combinations(values.items(), 2):
                previous, current = old.compare(left, right), answers.compare(left, right)
                item = {"twinExternalId": tid, "roles": [a, b], "answers": [left, right],
                        "before": previous, "after": current}
                comparisons.append(item)
                if previous != current:
                    changes.append(item)
            prior_status, prior_review = replay(candidate, row, review, old)
            next_status, next_review = replay(candidate, row, review, answers)
            if prior_status != row["status"] or prior_review != row["review"]["derived"]:
                mismatches.append({"twinExternalId": tid, "stored": row["status"], "replayed": prior_status})
            before[prior_status] += 1
            after[next_status] += 1
            status_by_id[tid] = {"before": prior_status, "after": next_status,
                                 "reviewBefore": prior_review, "reviewAfter": next_review}
        for hold in read(bundle / "holds.json"):
            status = "보류 — " + collect.STAGE_LABELS[hold["stage"]]
            before[status] += 1
            after[status] += 1
        rounds[rnd] = {"before": dict(before), "after": dict(after)}
    final = read(args.bundle / "collect.json")
    final_before, final_after = collections.Counter(), collections.Counter()
    final_changes = []
    for row in final["rows"]:
        tid = row["twinExternalId"]
        status = status_by_id[tid]
        if row["status"] != status["before"]:
            mismatches.append({"twinExternalId": tid, "error": "최종 선택 상태 불일치"})
        final_before[status["before"]] += 1
        final_after[status["after"]] += 1
        if status["before"] != status["after"]:
            final_changes.append({"twinExternalId": tid, **status})
    for hold in read(args.bundle / "holds.json"):
        final_before[hold["status"]] += 1
        final_after[hold["status"]] += 1
    result = {"baseline": args.baseline, "beforeCodeSha256": integrity.digest(old_source.encode()),
              "afterCodeSha256": integrity.digest(Path(answers.__file__).read_bytes()),
              "scope": "답 비교와 답 의존 검수/집계만 재생. 기존 봉인/계보의 재인증이 아니다.",
              "candidateCount": len(status_by_id), "answerCount": len(status_by_id) * 4,
              "pairComparisons": len(comparisons), "rounds": rounds,
              "finalBefore": dict(final_before), "finalAfter": dict(final_after),
              "baselineMismatches": mismatches, "comparisonChanges": changes,
              "candidateStatuses": status_by_id, "finalStatusChanges": final_changes,
              "comparisons": comparisons, "inputs": evidence}
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=1) + "\n")
    print(json.dumps({k: result[k] for k in ("candidateCount", "answerCount", "pairComparisons",
        "finalBefore", "finalAfter", "baselineMismatches", "finalStatusChanges")}, ensure_ascii=False))
    print("comparisonChanges", len(changes))
    if mismatches:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
