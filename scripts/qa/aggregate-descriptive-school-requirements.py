#!/usr/bin/env python3
"""Read-only legacy ledger census. Outputs labels/counts only; never source text.

Usage:
  python3 scripts/qa/aggregate-descriptive-school-requirements.py --repo .
  python3 scripts/qa/aggregate-descriptive-school-requirements.py --repo . --json /tmp/result.json

No database, network, package dependency, or repository write is used.
The classification is deterministic lexical screening, NOT validated semantic
annotation. Sequential question markers are observable markers, not a certified
number of independent student response demands.
"""
import argparse
import collections as C
import gzip
import hashlib
import json
import re
import statistics
from pathlib import Path

VERSION = "desc-requirements-20261020-r1"
FILE_BAND = re.compile(r"\[([123])\]\[(\d{2,4})-([12])(?:-|\])")
REASON = re.compile(r"이유|설명|증명|정당화|근거")
PROCESS = re.compile(r"과정|풀이를|식[을를]\s*세|식으로\s*나타")
ERROR = re.compile(r"잘못|오류|틀린|바르게\s*계산")
GRAPH = re.compile(r"그래프|좌표|기울기|절편|사분면|평행이동|꼭짓점")
GEOM = re.compile(r"넓이|둘레|삼각형|사각형|직육면체|정육면체|도형|반지름|원주")
MODEL = re.compile(r"원가|정가|할인|요금|가격|이익|농도|소금|속력|시속|분속|거리|"
                   r"시간|분\s*후|분\s*동안|예금|저금|저축|작업|수도|물통|명|개씩")
COND = re.compile(r"조건|범위|만족|상수|모든|모두|최댓값|최솟값|"
                  r"최대(?!공약수)|최소(?!공배수)|"
                  r"(?:자연수|정수).{0,15}(?:개수|되도록|될\s*때)")
CALC = re.compile(r"계산|간단히|값|인수분해|소인수분해|해를|풀어")


def hit(pattern, text):
    return bool(re.search(pattern, text))


def file_band(p):
    m = FILE_BAND.search(p.get("sourceFile") or "")
    if not m:
        return None
    g, y, s = map(int, m.groups())
    return g, y + 2000 if y < 100 else y, s


def markers(text, strict):
    """Maximum consecutive sequence 1..n in a single marker alphabet.

    Strict: paragraph/line start, optional whitespace and dollar delimiter.
    Loose: anywhere. Circled choice numerals ①..⑳ intentionally excluded.
    Distinct labels only: repeated mentions never inflate n.
    """
    starts = r"(?m)^\s*\$?\s*" if strict else ""
    series = []
    for alphabet in ["⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽", "❶❷❸❹❺❻❼❽❾❿"]:
        found = {alphabet.index(m[1]) + 1 for m in
                 re.finditer(starts + "([" + alphabet + "])", text)}
        series.append(found)
    found = {int(m[1]) for m in
             re.finditer(starts + r"[（(]\s*([1-9]|10)\s*[)）]", text)}
    series.append(found)
    best = 0
    for found in series:
        n = 0
        while n + 1 in found:
            n += 1
        best = max(best, n)
    return best


def unit(grade, text):
    """Explicit semantic anchors only; no inference from numeric coefficients."""
    if grade == 1:
        if hit(r"그래프|좌표|정비례|반비례|사분면|순서쌍", text):
            return "그래프와 비례"
        if hit(r"일차방정식|방정식|항등식|문자|등식|다항식|동류항|일차식|"
               r"원가|정가|소금|농도|속력|시속|분속|요금|저금|할인", text):
            return "문자와 식·일차방정식"
        if hit(r"소인수|소수(?!점)|약수|배수|서로소|소인수분해", text):
            return "소인수분해"
        if hit(r"정수|유리수|양수|음수|절댓값|수직선|역수|부호|덧셈|뺄셈|"
               r"곱셈|나눗셈|계산", text):
            return "정수와 유리수"
    if grade == 2:
        if hit(r"일차함수|함수|그래프|기울기|절편", text):
            return "일차함수"
        if hit(r"연립|미지수가\s*2개|두\s*미지수", text):
            return "연립일차방정식"
        if hit(r"부등식|부등호", text):
            return "일차부등식"
        if hit(r"순환|소수|유리수|기약분수|분수|분모|분자|지수|거듭제곱|"
               r"단항식|다항식|전개|계산|간단히|식의\s*값", text):
            return "수와 식"
    if grade == 3:
        if hit(r"이차함수|함수|포물선|그래프|꼭짓점|대칭축", text):
            return "이차함수"
        if hit(r"이차방정식|방정식|중근|근의\s*공식|두\s*근", text):
            return "이차방정식"
        if hit(r"인수분해|다항식|곱셈\s*공식|전개|완전제곱식", text):
            return "곱셈과 인수분해"
        if hit(r"제곱근|근호|무리수|실수|유리화|sqrt|√", text):
            return "실수와 그 계산"
    return "미상"


def question_shape(text):
    # One primary shape; overlapping lexical features are reported separately.
    if ERROR.search(text):
        return "오류 진단·정정"
    if REASON.search(text):
        return "이유·설명·증명"
    if GRAPH.search(text):
        return "그래프·좌표"
    if GEOM.search(text):
        return "도형량·관계"
    if MODEL.search(text):
        return "상황 모델"
    if COND.search(text):
        return "조건·후보·범위"
    if CALC.search(text):
        return "식 계산·값"
    return "미상"


def number(value):
    if value is None or isinstance(value, bool):
        return None
    try:
        n = float(value)
        return n if 0 < n < 101 else None
    except (TypeError, ValueError):
        return None


def summarize(rows):
    counter = lambda key: dict(sorted(C.Counter(r[key] for r in rows).items(),
                                     key=lambda kv: str(kv[0])))
    scores = [r["score"] for r in rows if r["score"] is not None]
    papers = C.defaultdict(list)
    for r in rows:
        papers[r["paper"]].append(r)
    content_counts = C.Counter(r["digest"] for r in rows)
    dedup = list({r["digest"]: r for r in rows}.values())
    return {
        "rows": len(rows),
        "source_files": len(papers),
        "school_year_exam_groups": len({r["group"] for r in rows}),
        "schools": len({r["school"] for r in rows}),
        "years": counter("year"),
        "source_duplicate_excess": sum(n - 1 for n in content_counts.values()),
        "unique_content": len(content_counts),
        "exclusive_response_form": counter("form"),
        "response_form_unique_content": dict(C.Counter(r["form"] for r in dedup)),
        "strict_parts": counter("parts"),
        "loose_parts": counter("loose_parts"),
        "question_shape": counter("shape"),
        "unit": counter("unit"),
        "unit_shape": dict(sorted(C.Counter(r["unit"] + " / " + r["shape"]
                                           for r in rows).items())),
        "features": {key: sum(r[key] for r in rows) for key in
                     ["reason", "process", "error", "figure", "marker_disagreement"]},
        "scores": {
            "observed": len(scores), "missing": len(rows) - len(scores),
            "conflicting": sum(r["score_conflict"] for r in rows),
            "filled_from_examQuestion": sum(r["score_filled"] for r in rows),
            "histogram": dict(sorted(C.Counter(scores).items())),
            "median": statistics.median(scores) if scores else None,
            "mean": round(statistics.mean(scores), 4) if scores else None,
            "within_4_12": sum(4 <= s <= 12 for s in scores),
            "within_6_8": sum(6 <= s <= 8 for s in scores),
        },
        "paper_descriptive": {
            "median_rows": statistics.median(map(len, papers.values())) if papers else None,
            "complete_score_papers": sum(all(r["score"] is not None for r in rs)
                                         for rs in papers.values()),
            "median_total_on_complete_papers": statistics.median(
                [sum(r["score"] for r in rs) for rs in papers.values()
                 if all(r["score"] is not None for r in rs)]
            ) if papers else None,
        },
    }


def aggregate(repo):
    path = repo / "scripts/import/ledgers/legacy-corpus-delete.json.gz"
    raw = path.read_bytes()
    ledger = json.loads(gzip.decompress(raw))
    problems, exams, qs = {}, {}, C.defaultdict(list)
    for round_ in ledger["rounds"]:
        problems.update({p["id"]: p for p in round_["problem"]})
        exams.update({e["id"]: e for e in round_["exam"]})
        for q in round_["examQuestion"]:
            qs[q["problemId"]].append(q)
    middle = [p for p in problems.values() if p.get("source") == "past_exam"
              and p.get("subject") == "수학"
              and (p.get("school") or "").endswith("중")
              and p.get("questionType") == "서술형"]
    rows, recovered = [], []
    qa = C.Counter()
    for p in middle:
        file_info = file_band(p)
        joined = qs[p["id"]]
        metadata = {(int(exams[q["examId"]]["grade"]),
                     int(exams[q["examId"]]["year"]),
                     int(exams[q["examId"]]["semester"]))
                    for q in joined if q["examId"] in exams
                    and exams[q["examId"]]["level"] == "중"}
        qa["examQuestion_joined"] += bool(joined)
        qa["multiple_examQuestion_links"] += len(joined) > 1
        qa["qtype_disagreement_rows"] += any(q["qtype"] != p["questionType"] for q in joined)
        if file_info and metadata and any(file_info != m for m in metadata):
            qa["filename_metadata_conflict"] += 1
        is_recovered = False
        if not file_info:
            qa["filename_unparsed"] += 1
            if len(metadata) == 1:
                file_info = next(iter(metadata))
                is_recovered = True
                qa["metadata_recovered_all_semesters"] += 1
            else:
                qa["unresolved_metadata"] += 1
                continue
        grade, year, semester = file_info
        if semester != 1:
            continue
        text = p.get("content") or ""
        strict = markers(text, True)
        loose = markers(text, False)
        reason, process = bool(REASON.search(text)), bool(PROCESS.search(text))
        options = len(set(re.findall("[①②③④⑤⑥⑦⑧⑨⑩]", text)))
        mixed_choice = options >= 3 and strict < 2 and hit(r"옳은|고르|것은|아닌", text)
        form = ("선택형 혼입 신호" if mixed_choice else
                "이유·설명 지시" if reason else
                "과정·식 수립 지시" if process else
                "번호 소문항만" if strict >= 2 else "결과형·미판독")
        pscore = number(p.get("score"))
        qscore = {number(q.get("score")) for q in joined} - {None}
        conflict = len(qscore) > 1 or (pscore is not None and any(s != pscore for s in qscore))
        score = None if conflict else pscore if pscore is not None else next(iter(qscore), None)
        paper = p.get("sourceFile") or p["examId"]
        # Hashes are internal only. Report includes aggregated duplicate counts.
        digest = hashlib.sha256(re.sub(r"\s+", "", text).encode()).hexdigest()
        round_match = re.search(r"(중간|기말)", paper)
        item = dict(grade=grade, year=year, paper=paper,
                    group=(p["school"], grade, year, semester,
                           round_match[1] if round_match else "미상"),
                    school=p["school"], digest=digest, form=form,
                    parts=str(strict) if strict >= 2 else "분할표지 없음·1",
                    loose_parts=str(loose) if loose >= 2 else "분할표지 없음·1",
                    marker_disagreement=strict != loose,
                    reason=reason, process=process, error=bool(ERROR.search(text)),
                    figure=bool(p.get("figureSvg") or p.get("figureUrls")
                                or any(q.get("hasFigure") for q in joined)),
                    unit=unit(grade, text), shape=question_shape(text),
                    score=score, score_conflict=conflict,
                    score_filled=score is not None and pscore is None)
        (recovered if is_recovered else rows).append(item)
    result = {
        "version": VERSION,
        "ledger_sha256": hashlib.sha256(raw).hexdigest(),
        "rounds": len(ledger["rounds"]),
        "middle_descriptive_all_semesters": len(middle),
        "qa_all_semesters": dict(qa),
        "primary_file_cohort": {
            "all": summarize(rows),
            **{f"중{g}-1": summarize([r for r in rows if r["grade"] == g])
               for g in (1, 2, 3)},
        },
        "metadata_recovered_first_semester": len(recovered),
        "extended_cohort": {
            "all": summarize(rows + recovered),
            **{f"중{g}-1": summarize([r for r in rows + recovered if r["grade"] == g])
               for g in (1, 2, 3)},
        },
    }
    assert result["primary_file_cohort"]["all"]["rows"] == sum(
        result["primary_file_cohort"][f"중{g}-1"]["rows"] for g in (1, 2, 3))
    for cohort in (result["primary_file_cohort"], result["extended_cohort"]):
        for v in cohort.values():
            assert sum(v["exclusive_response_form"].values()) == v["rows"]
            assert sum(v["strict_parts"].values()) == v["rows"]
            assert sum(v["scores"]["histogram"].values()) == v["scores"]["observed"]
            assert v["scores"]["observed"] + v["scores"]["missing"] == v["rows"]
    return result


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--repo", type=Path, default=Path.cwd())
    ap.add_argument("--json", type=Path)
    args = ap.parse_args()
    result = aggregate(args.repo.resolve())
    encoded = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.json:
        target = args.json.resolve()
        if not str(target).startswith(("/tmp/", "/private/tmp/")):
            ap.error("--json must point inside /tmp")
        target.write_text(encoded)
        print(json.dumps({"output": str(args.json), "sha256": result["ledger_sha256"],
                          "rows": result["primary_file_cohort"]["all"]["rows"],
                          "extended_rows": result["extended_cohort"]["all"]["rows"]},
                         ensure_ascii=False))
    else:
        print(encoded, end="")


if __name__ == "__main__":
    main()
