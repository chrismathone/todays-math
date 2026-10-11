"""Independent SymPy check of every generated answer; no database or network.

Usage: python verify_math.py candidates.json report.json
SymPy is deliberately an independent arithmetic implementation, not a port of the
TypeScript polynomial evaluator. Unsupported notation or any discrepancy fails.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

import sympy as sp
from sympy.parsing.sympy_parser import (
    implicit_multiplication_application,
    parse_expr,
    rationalize,
    standard_transformations,
)


def math_parts(text):
    return re.findall(r"\$([^$\n]+)\$", text)


def convert_fraction(text):
    def group_at(start):
        if text[start] != "{":
            raise ValueError("fraction missing braces")
        depth = 1
        end = start + 1
        while end < len(text) and depth:
            depth += (text[end] == "{") - (text[end] == "}")
            end += 1
        if depth:
            raise ValueError("unclosed fraction")
        return convert_fraction(text[start + 1 : end - 1]), end

    while "\\frac" in text:
        start = text.index("\\frac")
        numerator, end = group_at(start + 5)
        denominator, end = group_at(end)
        text = text[:start] + f"(({numerator})/({denominator}))" + text[end:]
    return text


def expr(text):
    text = re.sub(r"\\(?:left|right|bigl|bigr)\b", "", text)
    text = re.sub(r"\\(?:[,;:! ]|quad\b|qquad\b)", " ", text)
    text = re.sub(r"\\dfrac\b", r"\\frac", text)
    text = text.replace("\\times", "*").replace("\\cdot", "*")
    text = text.replace("\\div", "/").replace("×", "*").replace("÷", "/")
    text = text.replace("\\{", "{").replace("\\}", "}")
    text = convert_fraction(text).replace("^", "**")
    text = text.replace("{", "(").replace("}", ")")
    text = text.replace("[", "(").replace("]", ")")
    if not re.fullmatch(r"[0-9.abcxyzi+*/()\s-]+", text):
        raise ValueError(f"unsupported independent notation: {text}")
    symbols = {name: sp.Symbol(name) for name in "abcxyz"}
    symbols["i"] = sp.I
    return parse_expr(
        text,
        local_dict=symbols,
        global_dict={"Integer": sp.Integer, "Rational": sp.Rational, "Float": sp.Float},
        transformations=standard_transformations + (implicit_multiplication_application, rationalize),
    )


def same(left, right):
    return sp.simplify(left - right) == 0


def brace_group(text, start):
    while text[start].isspace():
        start += 1
    assert text[start] == "{"
    depth, end = 1, start + 1
    while depth:
        depth += (text[end] == "{") - (text[end] == "}")
        end += 1
    return text[start + 1 : end - 1], end


def calculus(text, recipe):
    text = re.sub(r"\\(?:[,;:! ]|quad\b|qquad\b)", " ", text)
    x = sp.Symbol("x")
    if recipe == "exact-derivative":
        return sp.diff(expr(text.split("=", 1)[1]), x)
    if recipe == "exact-polynomial-limit":
        prefix = re.match(r"\s*\\lim\s*_", text)
        bound, end = brace_group(text, prefix.end())
        point = expr(bound.split("\\to")[1].strip())
        return sp.limit(expr(text[end:]), x, point)
    prefix = re.match(r"\s*\\int\s*_", text)
    lower, end = brace_group(text, prefix.end())
    upper_prefix = re.match(r"\s*\^", text[end:])
    upper, end = brace_group(text, end + upper_prefix.end())
    body = re.sub(r"(?:d\s*x|\\mathrm\s*\{d\}\s*x)\s*$", "", text[end:])
    return sp.integrate(expr(body), (x, expr(lower), expr(upper)))


def verify(candidate):
    content = candidate["content"]
    question = math_parts(content.split("①")[0])
    answer = math_parts(candidate["answer"])
    recipe = candidate["recipe"]
    if candidate["questionType"] == "객관식":
        index = "①②③④⑤".index(candidate["answer"])
        options = math_parts(content[content.index("①") :])
        if recipe in ("exact-gcd", "exact-lcm"):
            values = [expr(part) for math in question for part in math.replace("\\,", "").split(",")]
            value = sp.gcd_list(values) if recipe == "exact-gcd" else sp.lcm_list(values)
        elif recipe == "exact-linear-equation":
            left, right = question[0].split("=")
            roots = sp.solve(expr(left) - expr(right), sp.Symbol("x"))
            assert len(roots) == 1
            value = roots[0]
        elif recipe in ("exact-polynomial-limit", "exact-polynomial-integral"):
            value = calculus(question[0], recipe)
        elif recipe == "exact-polynomial-coefficient":
            value = sp.Poly(expr(question[0]), *[sp.Symbol(v) for v in "abcxyz"]).coeff_monomial(expr(question[1]))
        else:
            value = expr(question[0])
        checks = [same(value, expr(re.sub(r"^x\s*=", "", option))) for option in options]
        assert sum(checks) == 1 and checks[index], "incorrect/nonunique choice"
        return len(question)
    if recipe == "exact-substitution":
        substitutions, start = {}, 0
        for math in question:
            if "=" not in math:
                break
            for assignment in math.replace("\\,", "").split(","):
                name, value = assignment.split("=")
                substitutions[sp.Symbol(name)] = expr(value)
            start += 1
        assert len(question[start:]) == len(answer)
        for left, right in zip(question[start:], answer):
            assert same(expr(left).subs(substitutions), expr(right))
        return len(answer)
    if recipe == "exact-polynomial-coefficient":
        assert len(question) == 2 and len(answer) == 1
        value = sp.Poly(expr(question[0]), *[sp.Symbol(v) for v in "abcxyz"]).coeff_monomial(expr(question[1]))
        assert same(value, expr(answer[0]))
        return 1
    if recipe in ("exact-gcd", "exact-lcm") and len(question) > len(answer) and len(answer) == 1:
        values = [expr(part) for math in question for part in math.replace("\\,", "").split(",")]
        target = sp.gcd_list(values) if recipe == "exact-gcd" else sp.lcm_list(values)
        assert same(target, expr(answer[0]))
        return 1
    assert len(question) == len(answer), "question/answer arity mismatch"
    for left, right in zip(question, answer):
        if recipe in ("exact-derivative", "exact-polynomial-limit", "exact-polynomial-integral"):
            assert same(calculus(left, recipe), expr(right))
            continue
        if recipe == "exact-linear-equation":
            a, b = left.split("=")
            name, root = right.split("=")
            value = expr(root)
            assert same(expr(a).subs(sp.Symbol(name), value), expr(b).subs(sp.Symbol(name), value))
            assert len(sp.solve(expr(a) - expr(b), sp.Symbol(name))) == 1
        elif recipe in ("exact-gcd", "exact-lcm"):
            values = [expr(part) for part in left.replace("\\,", "").split(",")]
            target = sp.gcd_list(values) if recipe == "exact-gcd" else sp.lcm_list(values)
            assert same(target, expr(right))
        else:
            assert same(expr(left), expr(right)), f"arithmetic differs: {left} != {right}"
            if recipe == "exact-prime-factorization":
                assert expr(left).is_Integer and sp.factorint(expr(left)), "not an integer factorization"
    return len(question)


def main():
    candidates_path, report_path = map(Path, sys.argv[1:])
    raw = candidates_path.read_bytes()
    packet = json.loads(raw)
    checked = 0
    failures = []
    for candidate in packet["candidates"]:
        try:
            checked += verify(candidate)
        except Exception as exc:
            failures.append({"sourceId": candidate["sourceId"], "slot": candidate["slot"], "error": str(exc)})
    report = {
        "engine": f"SymPy {sp.__version__}",
        "candidateFileSha256": hashlib.sha256(raw).hexdigest(),
        "candidates": len(packet["candidates"]),
        "subquestionsChecked": checked,
        "failedCandidates": len(failures),
        "failures": failures,
    }
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "failures"}, indent=2))
    return bool(failures)


if __name__ == "__main__":
    sys.exit(main())
