"""Independent SymPy verification of actual originals and both generated siblings.

Usage: python independent_math.py <math-evidence.json> <result.json>
Does not import the TypeScript solver, its computedAnswers, or a database client.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

import sympy as sp


def clean(text):
    text = re.sub(r"\\(?:left|right|bigl|bigr)\b", "", text)
    text = re.sub(r"\\(?:mathrm|text)\{([A-Za-z]+)\}", r"\1", text)
    text = text.replace(r"\dfrac", r"\frac")
    text = re.sub(r"\\(?:,|;|:|!|quad\b|qquad\b| )", "", text)
    return re.sub(r"[\s~$]", "", text).replace("−", "-")


def numeric(text):
    text = clean(text)

    def group(offset):
        if offset >= len(text) or text[offset] != "{":
            raise ValueError("expected brace")
        depth = 1
        end = offset + 1
        while end < len(text) and depth:
            depth += (text[end] == "{") - (text[end] == "}")
            end += 1
        if depth:
            raise ValueError("unbalanced brace")
        return text[offset + 1:end - 1], end

    output = ""
    i = 0
    while i < len(text):
        if text.startswith(r"\frac", i):
            a, end = group(i + 5)
            b, i = group(end)
            output += f"(({numeric(a)})/({numeric(b)}))"
        elif text.startswith(r"\sqrt", i):
            a, i = group(i + 5)
            output += f"sqrt({numeric(a)})"
        elif text.startswith(r"\times", i):
            output += "*"
            i += 6
        else:
            output += text[i]
            i += 1
    output = output.replace("^", "**").replace("{", "(").replace("}", ")")
    output = re.sub(r"(?<=[\d)])(?=sqrt)", "*", output)
    if re.sub(r"sqrt", "", output).strip("0123456789()+-*/. "):
        raise ValueError("unsupported numeric syntax: " + output)
    return sp.simplify(sp.sympify(output, locals={"sqrt": sp.sqrt}, rational=True))


def point_values(text):
    values = []
    for m in re.finditer(r"[A-Z]?\(([^()]*)\)", clean(text)):
        try:
            coords = [numeric(s) for s in m[1].split(",")]
            if 1 <= len(coords) <= 3:
                values.append(coords)
        except ValueError:
            pass
    return values


def split(text):
    masked = re.sub(r"\$[^$]*\$", lambda m: " " * len(m[0]), text)
    labels = list(re.finditer(r"\([1-9]\d?\)|(?<!\d)[1-9]\d?\)|[⑴-⒇]", masked))
    if not labels:
        directive = re.match(r"^(?:다음 두 점 사이의 거리를 구하시오\.|다음 점과 직선 사이의 거리를 구하시오\.|원점과 다음 직선 사이의 거리를 구하시오\.|다음 값을 구하시오\.|다음을 계산하시오\.|다음 식의 값을 구하시오\.)\s*", text)
        return (directive[0], [text[directive.end():]]) if directive else ("", [text])
    return text[:labels[0].start()], [text[m.end():labels[i + 1].start() if i + 1 < len(labels) else len(text)] for i, m in enumerate(labels)]


def math(text):
    return re.findall(r"\$([^$]+)\$", text)


def affine(text):
    x, y = sp.symbols("x y")
    c = clean(text)
    # Coefficients of the supported affine grammar, independently parsed by SymPy.
    c = re.sub(r"\\frac\{(\d+)\}\{(\d+)\}", r"(\1/\2)", c)
    c = re.sub(r"(?<=[\d)])(?=[xy])", "*", c)
    if c.strip("0123456789xy+-*/().=") or c.count("=") != 1:
        raise ValueError("affine syntax")
    left, right = c.split("=")
    p = sp.Poly(sp.sympify(left, locals={"x": x, "y": y}, rational=True) - sp.sympify(right, locals={"x": x, "y": y}, rational=True), x, y)
    a, b, c = p.coeff_monomial(x), p.coeff_monomial(y), p.coeff_monomial(1)
    if b:
        return sp.Line(sp.Point(0, -c/b), sp.Point(1, -(a+c)/b))
    return sp.Line(sp.Point(-c/a, 0), sp.Point(-c/a, 1))


def count(text):
    c = clean(text)
    m = re.fullmatch(r"(?:\{\})?_\{?(\d+)\}?(P|C|H|∏|\\Pi)_\{?(\d+)\}?", c)
    if m:
        n, r = int(m[1]), int(m[3])
        return sp.factorial(n)/sp.factorial(n-r) if m[2] == "P" else sp.binomial(n, r) if m[2] == "C" else sp.binomial(n+r-1, r) if m[2] == "H" else sp.Integer(n)**r
    nums = list(map(int, re.findall(r"\d+", c)))
    if "모자" in c and "목도리" in c or "단체티셔츠" in c or "장미꽃" in c or "흰공" in c:
        return sp.Integer(nums[0])*nums[1]
    if "◯,×형문제" in c or "○,×형문제" in c:
        n, a, b, total = nums
        assert a+b == total
        return sp.Integer(n)**a*sp.Integer(2)**b
    if "일렬로세우는" in c or "음식" in c and "일렬로배열" in c:
        return sp.factorial(nums[0])
    if "사진반,축구반,게임반" in c:
        return sp.Integer(3)**nums[0]
    if "라면과김밥" in c:
        return sp.Integer(2)**nums[0]
    if c.startswith("오지선다형문제"):
        return sp.Integer(5)**nums[0]
    if c.startswith("○,×로답하는"):
        return sp.Integer(2)**nums[0]
    if "진로체험동아리" in c:
        return sp.Integer(nums[1])**nums[0]
    if "남김없이나누어주는" in c:
        return sp.Integer(nums[1])**nums[0]
    raise ValueError("count template not independently implemented: " + c)


def recompute(content, recipe):
    # Strip all MCQ options, then solve the actual stem.
    content = content.split("①")[0].rstrip()
    head, items = split(content)
    shared = point_values(head)
    results = []
    for item in items:
        pts = point_values(item)
        c = clean(item)
        if recipe == "exact-finite-count":
            results.append([count(item)])
        elif recipe == "exact-point-distance":
            if len(pts[0]) == 1:
                results.append([abs(pts[1][0]-pts[0][0])])
            else:
                results.append([sp.Point(*pts[0]).distance(sp.Point(*pts[1]))])
        elif recipe == "exact-point-midpoint":
            results.append(list((sp.Matrix(pts[0])+sp.Matrix(pts[1]))/2))
        elif recipe == "exact-point-centroid":
            if "무게중심의좌표는" in c:
                results.append(list(3*sp.Matrix(pts[0])-2*sp.Matrix(pts[1])))
            else:
                results.append(list(sum((sp.Matrix(p) for p in pts), sp.zeros(len(pts[0]), 1))/3))
        elif recipe == "exact-section-point":
            pts = pts or shared
            ratio = re.search(r"(\d+):(\d+)", c) or re.search(r"(\d+):(\d+)", clean(head))
            m, n = int(ratio[1]), int(ratio[2])
            a, b = sp.Matrix(pts[0]), sp.Matrix(pts[1])
            results.append(list(a+sp.Rational(m, m+n)*(b-a)))
        elif recipe == "exact-point-line-distance":
            p = sp.Point(*(pts[0] if pts else [0, 0]))
            results.append([affine(math(item)[-1]).distance(p)])
        elif recipe == "exact-parallel-line-distance":
            a, b = map(affine, math(item))
            assert a.is_parallel(b)
            results.append([a.distance(b.p1)])
        elif recipe == "exact-coordinate-reflection":
            x, y = (pts or shared)[0]
            target = c if shared else clean(head)
            results.append([-x, -y] if "原点" in target or "원점" in target else [y, x] if "직선y=x" in target else [x, -y] if "x축" in target else [-x, y])
        elif recipe == "exact-coordinate-translation":
            shifts = re.findall(r"방향으로(.+?)만큼", clean(head))
            results.append([pts[0][i]+numeric(shifts[i]) for i in range(2)])
        else:
            raise ValueError(recipe)
    return results


def actual_answers(row):
    if row.get("question_type", row.get("questionType")) == "객관식":
        labels = list(re.finditer(r"[①-⑤]", row["content"]))
        idx = "①②③④⑤".index(row["answer"].strip())
        body = row["content"][labels[idx].end():labels[idx+1].start() if idx+1 < len(labels) else len(row["content"])].strip()
        return [[numeric(body)]]
    _, answers = split(row["answer"])
    result = []
    for a in answers:
        value = clean(a)
        result.append([numeric(v) for v in value[1:-1].split(",")] if value.startswith("(") and value.endswith(")") else [numeric(value)])
    return result


path, output = map(Path, sys.argv[1:3])
bytes_ = path.read_bytes()
evidence = json.loads(bytes_)
candidate_path = Path(sys.argv[3]) if len(sys.argv) > 3 else None
if candidate_path:
    candidates_bytes = candidate_path.read_bytes()
    candidates = json.loads(candidates_bytes)["candidates"]
    expected = [candidate for pair in evidence["evidence"] for candidate in pair["candidates"]]
    assert len({c["externalId"] for c in candidates}) == len(candidates)
    assert sorted(candidates, key=lambda c: c["externalId"]) == sorted(expected, key=lambda c: c["externalId"]), "exact candidate/evidence mismatch"
failures = []
checked_sources = checked_candidates = checked_values = 0
for pair in evidence["evidence"]:
    for row in [pair["source"], *pair["candidates"]]:
        kind = "source" if "id" in row else "candidate"
        recipe = pair["candidates"][0]["recipe"]
        try:
            computed, actual = recompute(row["content"], recipe), actual_answers(row)
            assert len(computed) == len(actual), "subquestion count"
            for a, b in zip(computed, actual):
                assert len(a) == len(b), "coordinate dimension"
                for expected, answer in zip(a, b):
                    assert sp.simplify(expected-answer) == 0, f"{expected} != {answer}"
                    checked_values += 1
            if kind == "source": checked_sources += 1
            else: checked_candidates += 1
        except Exception as e:
            failures.append({"kind": kind, "id": row.get("id", row.get("externalId")), "recipe": recipe, "error": str(e)})
result = {"sympyVersion": sp.__version__, "snapshotSha256": evidence["snapshotSha256"], "evidenceSha256": hashlib.sha256(bytes_).hexdigest(),
          "checkedSources": checked_sources, "checkedCandidates": checked_candidates, "checkedValues": checked_values, "failures": failures,
          "independent": "Own Python question/answer parser and SymPy geometry/integer computations; no TS imports or computedAnswers."}
if candidate_path:
    result.update(candidateFileSha256=hashlib.sha256(candidates_bytes).hexdigest(),
                  candidates=len(candidates), failedCandidates=sum(f["kind"] == "candidate" for f in failures))
    assert checked_candidates + result["failedCandidates"] == len(candidates)
output.write_text(json.dumps(result, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
print(json.dumps(result, ensure_ascii=False, indent=2))
sys.exit(bool(failures))
