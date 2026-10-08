"""Read-only input inspection; all outputs confined to this new adjudication scope.

No candidate generation, original answer lookup, inference, DB, or source conversion.
Math output is supplemental and cannot supply curriculum permission.
"""
from pathlib import Path
from fractions import Fraction
import hashlib
import html
import json
import re
import struct
import subprocess
import sys
import urllib.request
import zlib

import fitz
import olefile

sys.stdout.reconfigure(encoding="utf-8")
OWN = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
PARENT = OWN.parent / "exam-extraction-resume-20261008"
QA = Path(".qa-artifacts/exam-resume-20261008")
OFFICIAL = OWN.parent / "exam-twin-curriculum-20261008" / QA / "sources"
REPORT = OWN / "docs/planning/tracks/reports/bumil-q07-curriculum-adjudication-r1-20261008.md"


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def save(name, data):
    p = OUT / name
    assert p.resolve().is_relative_to(OUT)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def ref(path, **kwargs):
    return {"path": Path(path).as_posix(), "sha256": sha(path), **kwargs}


def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def records(path, stream="BodyText/Section0"):
    with olefile.OleFileIO(str(path)) as o:
        flags = struct.unpack_from("<I", o.openstream("FileHeader").read(), 36)[0]
        data = o.openstream(stream).read()
        if flags & 1:
            data = zlib.decompress(data, -15)
    pos = rn = pn = 0
    rows = []
    while pos < len(data):
        offset = pos
        h = struct.unpack_from("<I", data, pos)[0]
        pos += 4
        tag, level, n = h & 1023, (h >> 10) & 1023, h >> 20
        if n == 4095:
            n = struct.unpack_from("<I", data, pos)[0]
            pos += 4
        payload = data[pos:pos+n]
        assert len(payload) == n
        pos += n
        rn += 1
        if tag == 67:
            pn += 1
            text = re.sub(r"[\x00-\x1f]", "", payload.decode("utf-16le")).strip()
            rows.append({"stream": stream, "tag": tag, "level": level,
                         "record_1based": rn, "paragraph_1based": pn,
                         "offset_in_uncompressed_stream": offset, "text": text})
    return rows


def html_text(path):
    text = Path(path).read_text(encoding="utf-8")
    text = re.sub(r"<(script|style)\b[^>]*>.*?</\1>", "", text, flags=re.S | re.I)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", text)))


def baseline():
    entries = {}
    def add(path, kind):
        p = Path(path).resolve()
        if p.is_file(): entries[p.as_posix()] = ref(p, kind=kind)
    tracked = subprocess.check_output(["git", "ls-files", "-z", "--", str(QA),
        "docs/planning/tracks/reports"], cwd=OWN).decode("utf-8").split("\0")
    for p in tracked:
        if p and ((OWN/p).is_relative_to(OWN/QA) or
                  Path(p).name.startswith("bumil") or Path(p).name.startswith("exam-twin")):
            add(OWN/p, "immutable_prior_worker_artifact_or_report")
    # Carry forward prior protected source/ledger/old-output hashes; no audit replay.
    for x in load(OWN/QA/"bumil-source-audit-r2/preservation-baseline.json"):
        p = Path(x["path"])
        assert sha(p) == x["sha256"], f"prior baseline changed: {p}"
        add(p, x["kind"])
    # Hash only these parent files. Do not parse author candidates, answers, or reviews.
    for prefix in ["bumil-authoring-r1", "bumil-authoring-r2", "bumil-review-r1",
                   "bumil-review-r2", "bumil-review-r3", "bumil-review-r4", "bumil-review-r5",
                   "bumil-current20-student-bankcap-r1", "bumil-current20-student-bankcap-r2",
                   "bumil-twin-v1", "bumil-twin-v2", "bumil-source-audit-r2"]:
        for p in (PARENT/QA/prefix).rglob("*"):
            if p.is_file(): add(p, "parent_frozen_scope_hash_only_no_content_review")
    for p in [PARENT/QA/"curriculum-evidence.json", PARENT/"src/lib/middle/m3Trig.ts",
              PARENT/"prisma/seed-data/units.ts", PARENT/QA/"bank-read-20261008.json",
              PARENT/QA/"bank-read-fresh-r2-20261008.json", PARENT/QA/"registry-read-20261008.json",
              Path("D:/todays-math/AGENTS.md"), OWN/".agents/skills/typesafe-ai/SKILL.md"]:
        add(p, "read_only_curriculum_or_rule_input")
    for n in [1,2,3]:
        add(PARENT/f"docs/planning/tracks/brief-exam-extraction-resume-20261008-addendum-{n}.md",
            "read_only_parent_addendum")
    for name in ["moe-2015-74-book8-math.pdf", "moe-2020-236-book8-math.hwp",
                 "moe-60747.html", "moe-81884.html", "moe-93458.html"]:
        add(OFFICIAL/name, "read_only_primary_official_cache")
    save("preservation-baseline.json", sorted(entries.values(), key=lambda x:x["path"]))
    print("Baseline inputs:", len(entries))


def collect():
    ce = load(PARENT/QA/"curriculum-evidence.json")
    qpath = OWN/QA/"bumil-source-audit-r2/question-only/q07/normalized-question.json"
    q = load(qpath)
    save("question-observation.json", {
        "questionNumber":7, "normalizedInput":ref(qpath),
        "parentNormalizedByteIdentical":sha(qpath)==sha(PARENT/QA/"bumil-source-audit-r2/question-only/q07/normalized-question.json"),
        "retainedSourceAuditCommit":"c348f02772f8d8eb4b698a61417c3a681e337b3e",
        "normalizedQuestion":q,
        "priorHold":ref(PARENT/QA/"bumil-authoring-r1/CURRICULUM-HOLD-q07.md"),
        "curriculumEvidence":ref(PARENT/QA/"curriculum-evidence.json"),
        "priorQuestionMapping":next(x for x in ce["question_mappings"] if x["question_number"]==7),
        "sourceAuditRepeated":False, "originalAnswerLookup":False,
        "priorExposure":"Original scan annotations were incidentally seen in the completed source audit. No original answer/solution agreement is used here; no blind original-answer claim."
    })
    hp = OFFICIAL/"moe-2020-236-book8-math.hwp"
    pp = OFFICIAL/"moe-2015-74-book8-math.pdf"
    allrows = records(hp)
    standards = ["9수01-07","9수01-10","9수02-12","9수02-13",
                 "9수04-13","9수04-14","9수04-16","9수04-17","9수04-18"]
    positions = {x["code"]: x for x in ce["achievement_standards"]}
    # Freshly decode exact records rather than adopting previous model mapping as permission.
    selected = []
    with fitz.open(str(pp)) as doc:
        page_text = {n:doc[n-1].get_text() for n in [33,34,38,39]}
        norm = lambda s:re.sub(r"[\s\x00-\x1f]", "", s)
        for code in standards:
            row = next(x for x in allrows if x["text"].startswith("["+code+"]"))
            page = 33 if code.startswith("9수01") else 34 if code.startswith("9수02") else 38
            expected = positions.get(code)
            if expected:
                assert row["record_1based"] == expected["hwp_locator"]["record_1based"]
                assert row["offset_in_uncompressed_stream"] == expected["hwp_locator"]["record_offset_in_uncompressed_stream"]
                assert row["text"] == "["+code+"]"+expected["verified_text"]
            assert norm(row["text"]) in norm(page_text[page])
            selected.append({"id":code, "hwp":row, "pdfPhysicalPage1based":page,
                             "pdfPrintedPage":page-4,"sameTextAfterWhitespaceControlNormalization":True})
        for identifier, paragraph, page in [("no_trig_ratio_relationships",908,39),
                                            ("angle_range",909,39),
                                            ("ratio_application_context",910,39)]:
            row = next(x for x in allrows if x["paragraph_1based"]==paragraph)
            assert norm(row["text"]) in norm(page_text[page])
            selected.append({"id":identifier,"hwp":row,"pdfPhysicalPage1based":page,
                             "pdfPrintedPage":page-4,"sameTextAfterWhitespaceControlNormalization":True})
        for n in [33,34,38,39]:
            p = OUT/f"official-pages/2015-math-physical-p{n:02}.png"
            p.parent.mkdir(exist_ok=True)
            doc[n-1].get_pixmap(matrix=fitz.Matrix(1.7,1.7), alpha=False).save(str(p))
    save("official-provisions.json", {
        "edition":"2015 revision, math book 8 as amended by MOE 2020-236",
        "pdf":ref(pp,url=next(x["url"] for x in ce["sources"] if x["id"]=="moe-2015-74-math-pdf"),archiveMember="별책8_수학과 교육과정.pdf"),
        "hwp":ref(hp,url=next(x["url"] for x in ce["sources"] if x["id"]=="moe-2020-236-math-hwp")),
        "provisions":selected,
        "trigContext":[x for x in allrows if 890<=x["paragraph_1based"]<=916],
        "contextLimit":"Notation paragraph 897 contains inline equation placeholder glyphs in HWP; visible PDF p38, not those glyphs, establishes sin/cos/tan notation.",
        "extraction":"Existing olefile: compressed flag then raw DEFLATE and sequential tag 67 UTF-16LE records; no HWP GUI/COM, no solutions. Existing PyMuPDF used because pdftoppm is unavailable; relevant official pages only."
    })
    rollout=[]
    for f in ["moe-60747.html","moe-93458.html"]:
        text=html_text(OFFICIAL/f)
        start=text.index("부 칙")
        end=text.index("2.",start)
        rollout.append({**ref(OFFICIAL/f),"locator":"부칙 제1항 가~라","text":text[start:end].strip()})
    save("rollout.json", {"officialCachedProvisions":rollout,
        "applicable2025Middle3":"2015_revision", "applicable2026Middle3":"2015_revision",
        "2027Middle3":"2022_revision_requires_new_exact_scope_review_not_automatic_allowance",
        "sourceDateConfirmedByPriorAudit":"2025-09-23",
        "futurePublicationApproval":False})
    # Polynomial identity and scaled right-triangle dependency, all exact rational checks.
    a,b,c=9,-12,4
    expansion=[3*3,2*3*(-2),(-2)*(-2)]
    assert expansion==[a,b,c]
    s=Fraction(2,3)
    assert a*s*s+b*s+c==0 and 0<s<1
    hyp,opp=Fraction(3),Fraction(2)
    adj_sq=hyp*hyp-opp*opp
    cos_sq=adj_sq/(hyp*hyp)
    tan_sq=opp*opp/adj_sq
    target=adj_sq/(hyp*opp)
    assert target*target==cos_sq/tan_sq
    save("supplemental-math.json", {
        "purpose":"Supplemental exact math and assessment dependency only. Not grade permission, a student candidate, or an original answer key check.",
        "engine":"Python standard-library Fraction; deterministic code",
        "factorization":{"polynomialCoefficients":[a,b,c],"expandedSquaredLinear":[3,-2],"expansionCoefficients":expansion,"identityChecked":True},
        "root":{"distinctRealRoots":[str(s)],"multiplicity":2,"polynomialAtRoot":"0","acuteSineRangeCheck":True},
        "scaledRightTriangle":{"hypotenuse":str(hyp),"opposite":str(opp),"adjacentSquared":str(adj_sq),"positiveLengths":True,
                                "scaleNotActualGivenLength":True},
        "ratios":{"sine":str(s),"cosine":"sqrt(5)/3","tangent":"2/sqrt(5)","cosineSquared":str(cos_sq),"tangentSquared":str(tan_sq),"compoundRatio":str(target)},
        "dependency":{"geometricExpression":"adjacent^2/(hypotenuse*opposite)",
                      "sameAngleRatioExpression":"(1-sine^2)/sine",
                      "statement":"These equivalent expressions are reviewer analysis of the preserved target, not formulas proposed for middle3 instruction.",
                      "squaredQuotientCheck":True},
        "choicesCompared":False,"originalKeyOrSolutionRead":False,"curriculumPermissionFromCalculation":False
    })
    bankpaths=[PARENT/QA/"bank-read-20261008.json",PARENT/QA/"bank-read-fresh-r2-20261008.json"]
    snapshots=[]
    unit_id="3e93bf73-4493-4299-b8a3-c4f5247e4413"
    fam="mid:3-2|삼각비|03"
    for p in bankpaths:
        d=load(p)
        ui=next(i for i,x in enumerate(d["units"]) if x["id"]==unit_id)
        fi=next(i for i,x in enumerate(d["liveFamilies"]) if x["family_key"]==fam)
        snapshots.append({**ref(p),"capturedAt":d["capturedAt"],"unitPointer":f"/units/{ui}","unit":d["units"][ui],
                          "familyPointer":f"/liveFamilies/{fi}","family":d["liveFamilies"][fi],"dbReadByThisWorker":False})
    rp=PARENT/QA/"registry-read-20261008.json"
    rd=load(rp);ri=next(i for i,x in enumerate(rd["entries"]) if x["key"]=="3-2|삼각비|03")
    gp=PARENT/"src/lib/middle/m3Trig.ts"
    lines=gp.read_text(encoding="utf-8").splitlines()
    anchor=lines.index('    "한 삼각비의 값을 알 때 다른 삼각비의 값 구하기",')
    lo=anchor-3;hi=next(i for i in range(anchor+1,len(lines)) if lines[i].startswith('  def("삼각비", "04"'))-1
    up=PARENT/"prisma/seed-data/units.ts";ulines=up.read_text(encoding="utf-8").splitlines()
    unitrefs=[]
    for order in [463,464,469,471,472,473,475,481]:
        at=next(i for i,line in enumerate(ulines) if line.strip()==f"orderIndex: {order},")
        unitrefs.append({"orderIndex":order,"lines1based":[at-3+1,at+2],"sourceExcerpt":"\n".join(ulines[at-3:at+2])})
    save("unit-family-evidence.json", {
        "snapshots":snapshots,"registry":{**ref(rp),"pointer":f"/entries/{ri}","entry":rd["entries"][ri]},
        "generator":{**ref(gp),"lines1based":[lo+1,hi],"excerpt":"\n".join(lines[lo:hi]),
                     "observedPurpose":"One same-angle trig ratio given; choose a different same-angle ratio as target; reconstruct missing side by Pythagoras. No ratio-relation curriculum exception is evidenced by this rule.",
                     "q07CompoundQuotientSupportedByThisExactRule":False},
        "unitPrerequisiteSeed":{**ref(up),"records":unitrefs},
        "classificationIsPermission":False,"exactQ07UnitFamilyAssignmentMade":False,
        "recommendation":{"family":fam,"curriculum":"2015","eligibility":"do_not_use_as_curriculum_allowance; explicit restriction-risk review required for same-angle ratio-to-ratio purpose",
                          "scope":"Recommendation only; no global row decision, code edit, DB lock, live-content approval, or automatic 2022 allowance."}
    })
    print("Collected official provisions:",len(selected),"; 4 relevant official page renders; exact supplemental math; Unit/family/rule refs")


def fetch_notice():
    url="https://www.moe.go.kr/boardCnts/fileDown.do?fileSeq=2b69253bc6744cab14e91cc8ce4150ad&m=&s=moe"
    p=OUT/"official-notices/moe-2022-2-notice.hwp"
    p.parent.mkdir(exist_ok=True)
    if not p.exists():
        req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0"})
        with urllib.request.urlopen(req,timeout=30) as response: raw=response.read()
        assert raw.startswith(bytes.fromhex("d0cf11e0a1b11ae1")), "Expected HWP OLE notice"
        p.write_bytes(raw)
    rows=records(p)
    save("official-notices/moe-2022-2-notice-records.json",{**ref(p,url=url),
        "noticeBoard":"https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=90411&lev=0&searchType=",
        "records":rows,"boundedCheck":"Read the actual list of amended books to determine whether this 2015-policy amendment changes math book 8; not an audit of unrelated policy."})
    for x in rows:
        if x["text"]: print(x["record_1based"],x["offset_in_uncompressed_stream"],x["text"])


def validate():
    rows=load(OUT/"preservation-baseline.json")
    failures=[x["path"] for x in rows if not Path(x["path"]).is_file() or sha(x["path"])!=x["sha256"]]
    result={"preservedFileCount":len(rows),"allBaselineBytesUnchanged":not failures,"changedPaths":failures,
            "ownPreviousEvidenceCount":sum(x["kind"]=="immutable_prior_worker_artifact_or_report" for x in rows),
            "parentFrozenHashOnlyCount":sum(x["kind"]=="parent_frozen_scope_hash_only_no_content_review" for x in rows),
            "baselineMode":"SHA-256 byte preservation, not provenance or curriculum proof",
            "scope":"New adjudication scope and named report only"}
    save("preservation-check.json",result)
    print(json.dumps(result,ensure_ascii=False))
    assert not failures


if __name__=="__main__":
    {"baseline":baseline,"collect":collect,"fetch-notice":fetch_notice,"validate":validate}[sys.argv[1]]()
