"""Verify bindings/preservation/output scope; curriculum permission is not computed."""
from pathlib import Path
from collections import Counter
from fractions import Fraction
import ast
import json
import re
import subprocess
import sys

from collect_evidence import OWN, OUT, REPORT, load, sha, save, validate

sys.stdout.reconfigure(encoding="utf-8")
validate()
d=load(OUT/"adjudication.json")
assert d["status"]=="rejected" and d["eligibleFor2015FaithfulTwinAuthoring"] is False
assert len(d["sevenStudentSurfaces"])==7
assert len({x["surface"] for x in d["sevenStudentSurfaces"]})==7
assert d["materialConflict"]["officialDocumentExplicitlyNamesQ07"] is False
assert d["originalAnswerAgreementUsed"] is False and d["supplementalMathIsGradePermission"] is False
assert d["pending"]["materialQ07CurriculumScopeUnknowns"]==[]
for x in d["evidenceFiles"]:
    assert sha(x["path"])==x["sha256"]
q=load(OUT/"question-observation.json")
assert sha(q["normalizedInput"]["path"])==d["reference"]["normalizedQuestionSha256"]
assert sha(q["priorHold"]["path"])==q["priorHold"]["sha256"]
assert q["parentNormalizedByteIdentical"] is True
p=load(OUT/"official-provisions.json")
assert len(p["provisions"])==12
assert all(x["sameTextAfterWhitespaceControlNormalization"] for x in p["provisions"])
restriction=next(x for x in p["provisions"] if x["id"]=="no_trig_ratio_relationships")
assert restriction["hwp"]["record_1based"]==4440
assert restriction["hwp"]["offset_in_uncompressed_stream"]==224820
# Separate deterministic check in normalized opposite/hypotenuse coordinates.
m=load(OUT/"supplemental-math.json")
s=Fraction(m["ratios"]["sine"])
normalized_adj_sq=1-s*s
assert normalized_adj_sq==Fraction(m["ratios"]["cosineSquared"])
assert normalized_adj_sq/s==Fraction(m["ratios"]["compoundRatio"])
assert (Fraction(9)*s-Fraction(6))**2==0
assert m["choicesCompared"] is False and m["originalKeyOrSolutionRead"] is False
assert m["curriculumPermissionFromCalculation"] is False
for name in ["collect_evidence.py","finalize_report.py","validate_adjudication.py"]:
    ast.parse((OUT/name).read_text(encoding="utf-8"))
report=REPORT.read_text(encoding="utf-8")
assert "**rejected" in report and "4440 / 908 / 224820" in report
assert "2025·2026" in report and "2027" in report
local_links=re.findall(r"\]\((\.\.[^)]+)\)",report)
for link in local_links: assert (REPORT.parent/link).resolve().is_file(),link
new_files=sorted(p for p in OUT.rglob("*") if p.is_file())
assert not any("__pycache__" in p.parts for p in new_files)
assert not any(p.name.endswith((".pyc",".sqlite")) for p in new_files)
allowed=set(str(p.relative_to(OWN)).replace("\\","/") for p in new_files)|{REPORT.relative_to(OWN).as_posix()}
git_status=subprocess.check_output(["git","status","--porcelain=v1","--untracked-files=all"],cwd=OWN).decode("utf-8")
for line in git_status.splitlines():
    path=line[3:].strip('"')
    assert path in allowed, f"Out-of-scope visible modification: {line}"
result={
    "status":"passed","questionNumber":7,"verdict":"rejected",
    "boundEvidenceFileCount":len(d["evidenceFiles"]),"officialProvisionCount":len(p["provisions"]),
    "sevenStudentSurfacesCount":7,"relevantOfficialPagesRenderedAndViewed":[33,34,38,39],
    "independentNormalizedCoordinateMathCheck":True,"mathCheckIsCurriculumPermission":False,
    "primaryRecordAndWholeParagraphBindingsValid":True,"localReportLinksResolve":True,
    "priorHoldAndBaselineFilesUnchanged":True,
    "preservation":load(OUT/"preservation-check.json"),
    "candidateCreated":False,"originalKeyAgreementTest":False,"inferenceApiCalls":0,"dbActions":0,
    "ownVisibleChangesWithinNewAllowedScope":True,
    "semanticReview":"Reviewer application of cited exclusion; this checker validates binding and integrity, not independent curricular truth."
}
save("validation.json",result)
manifest=[]
for path in sorted(p for p in OUT.rglob("*") if p.is_file() and p.name!="artifact-manifest.json"):
    manifest.append({"path":path.relative_to(OWN).as_posix(),"bytes":path.stat().st_size,"sha256":sha(path)})
manifest.append({"path":REPORT.relative_to(OWN).as_posix(),"bytes":REPORT.stat().st_size,"sha256":sha(REPORT)})
save("artifact-manifest.json",{"schema":"owned-q07-adjudication-artifacts.v1","artifacts":manifest,
    "manifestSelfHashExcluded":True,"authorInput":False,"scope":"Reviewer policy adjudication; supplemental computed ratios must not be fed as original solutions to authoring."})
print(json.dumps({"result":"passed","adjudicationSha256":sha(OUT/"adjudication.json"),
                  "reportSha256":sha(REPORT),"manifestArtifactCount":len(manifest)},ensure_ascii=False))
