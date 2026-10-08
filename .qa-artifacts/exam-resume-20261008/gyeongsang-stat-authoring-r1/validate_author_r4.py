"""Second author self-check, not an independent blind review or grade approval."""
from pathlib import Path
from fractions import Fraction
import json
import hashlib
import statistics
import math

root = Path(__file__).resolve().parent
index = json.loads((root / "candidate-index-r4.json").read_text("utf-8"))
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
records = []
for row in index["candidates"]:
    file = root / row["candidatePath"]
    candidate = json.loads(file.read_text("utf-8"))
    assert sha(file) == row["candidateFileSha256"]
    evidence = candidate["metadata"]["authorEvidence"]
    assert evidence["statisticsKernelSha256"] == sha("scripts/import/exam-twin/statisticsConditions.mjs")
    assert evidence["scriptSha256"] == sha(root / "author.mjs")
    number = row["questionNumber"]
    correct = []
    if number == 10:
        value = 5 * 7 - sum([4, 7, 3, 6, 5, 3])
        correct = [i for i, x in enumerate([3, 4, 5, 6, 7]) if x == value]
    elif number == 11:
        allowed = [x for x in range(1, 13) if statistics.median([8, 3, 5, x, 12, 10, 2]) == 7]
        assert allowed == [7]
        correct = [i for i, x in enumerate([5, 6, 7, 8, 9]) if x in allowed]
    elif number == 12:
        values = [20, 25, 30, 35, 40]
        known = dict(zip(values, [4, 4, 3, 2, 1]))
        for i, value in enumerate(values):
            counts = dict(known)
            counts[value] += 1
            modes = [x for x, count in counts.items() if count == max(counts.values())]
            if modes == [25]:
                correct.append(i)
    elif number == 13:
        missing = -sum([6, -5, 7])
        mean = 78 - missing
        assert Fraction(sum([92, 81, 78, 93]), 4) == mean
        correct = [i for i, x in enumerate([78, 80, 84, 86, 90]) if x == mean]
    elif number == 14:
        values = [1, 4, 5, 6, 6, 6, 6, 7, 8, 11]
        mean = Fraction(sum(values), len(values))
        variance = sum((Fraction(x) - mean) ** 2 for x in values) / len(values)
        assert variance == 6
        pairs = [(4, 4), (6, 6), (6, 36), (10, 10), (60, 60)]
        correct = [i for i, (v, sd_squared) in enumerate(pairs) if variance == v == sd_squared]
    elif number == 15:
        options = list(map(Fraction, ["0.7", "0.8", "0.9", "1.0", "1.1"]))
        others = list(map(Fraction, ["0.8", "0.9", "1.1", "1.3"]))
        correct = [i for i, value in enumerate(options) if all(value < other for other in others)]
        for mean, sd in zip([12, 13, 11, 14, 10], [.7, .8, .9, 1.1, 1.3]):
            deviation = sd * math.sqrt(5 / 2)
            values = [mean - deviation, mean, mean, mean, mean + deviation]
            assert min(values) > 0
            assert abs(statistics.pvariance(values) - sd * sd) < 1e-12
    elif number == 22:
        values = [1, 2, 2, 3, 3, 3, 4, 4, 4, 4, 5, 5, 6, 6, 7, 8, 9, 11, 12, 60]
        assert len(values) == 20 and sum(values) == 159
        assert Fraction(sum(values), 20) == Fraction(159, 20)
        assert statistics.median(values) == 4.5
        assert sum(x["score"] for x in candidate["facts"]["writtenRubric"]) == candidate["score"]
        assert max(values[:-1]) == 12
        correct = None
    if correct is not None:
        assert len(correct) == 1
        assert chr(9312 + correct[0]) == candidate["answer"]
    records.append({
        "questionNumber": number, "candidateSha256": sha(file), "freshPythonAuthorSelfCheck": True,
        "exactlyOneMCOptionIndexes": correct, "independentWorkerReview": False,
        "studentWithSolutionsPreview": {"path": f"solution-preview-r4/q{number:02d}.solution.png", "sha256": sha(root / f"solution-preview-r4/q{number:02d}.solution.png"), "viewedByRoot": True},
        "studentPreview": {"path": f"student-preview-r4/q{number:02d}.png", "sha256": sha(root / f"student-preview-r4/q{number:02d}.png")},
        "noKnownCurrentVisualDefects": True,
    })
result = {
    "kind": "actual-authoring-and-visual-check/v1", "currentIndexSha256": sha(root / "candidate-index-r4.json"),
    "checkedCurrentProposals": 7, "mc": 6, "written": 1, "newTables": 5, "newSvg": 0, "points": 29,
    "fullGradeIndependentApprovals": 0, "mathIndependentApprovals": 0, "rightsApprovals": 0, "loadable": 0,
    "finalPreviewsViewed": "All seven expanded solution previews include student text, choices, tables and full new answers/solutions; q10 blank visibly repaired.",
    "priorVersions": "r1 keyword failure, r2 code-format binding drift and r3 escaped-blank defect retained; no reused approvals.",
    "nativeReaderParity": False, "records": records,
}
out = root / "author-validation-r4.json"
if out.exists():
    assert json.loads(out.read_text("utf-8")) == result
else:
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"actualAuthorChecks": 7, "tables": 5, "uniqueMC": 6, "independentApprovals": 0}))
