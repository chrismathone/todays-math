# -*- coding: utf-8 -*-
"""풀이자의 답과 저자(또는 엔진)의 답을 견준다 — 좁게 (Codex 1회차 E).

역할 · 부호 · 단위 · 소문항 순서를 지킨다. 표기만 접는다: `$` · 띄어쓰기 · `\\,` · `\\left`/`\\right` · `\\dfrac`→`\\frac` ·
`\\mathrm{}`/`\\text{}` 의 껍데기 · `^{\\circ}`→`°` · 끝의 마침표 · «답:» 머리 · 보기 기호 사이의 쉼표.
수 하나끼리는 같은 유리수면 같다(`0.5` 와 `\\frac{1}{2}`). 그 밖에 갈리면 «다름», 못 읽으면 «보류».
🔴 공백을 다 지워 비교하지 않는다 — `12` 와 `1 2` 를 같게 만든다(1회차 E 의 반례). 보기 기호 · 소문항 표지에서만 접는다.
"""
from __future__ import annotations

import re
from fractions import Fraction

CIRCLED = "①②③④⑤"
_SUB_MARKS = "⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽⑾⑿⒀⒁⒂⒃⒄⒅⒆⒇"
_SUB_MAP = {f"({i})": ch for i, ch in enumerate(_SUB_MARKS, 1)}
_ASCII_SUB = r"\((?:[1-9]|1[0-9]|20)\)"


def fold(text: str) -> str:
    t = (text or "").strip()
    t = re.sub(r"^(?:정답|답)\s*[:：]\s*", "", t)
    t = t.replace("$", "")
    t = re.sub(r"\\(?:left|right)\s*", "", t)
    t = t.replace("\\dfrac", "\\frac").replace("\\tfrac", "\\frac")
    t = re.sub(r"\\(?:mathrm|text|textrm|operatorname)\s*\{([^{}]*)\}", r"\1", t)
    t = re.sub(r"\^\s*\{?\s*\\circ\s*\}?", "°", t)
    t = t.replace("\\,", "").replace("\\;", "").replace("\\!", "").replace("~", "")
    t = t.replace("\\ ", " ")
    t = re.sub(r"\\(?:le|leq)\b", "≤", t)
    t = re.sub(r"\\(?:ge|geq)\b", "≥", t)
    t = t.replace("\\times", "×").replace("\\div", "÷").replace("\\cdot", "·")
    t = re.sub(r"\{\s*([^{}\s])\s*\}", r"\1", t)  # 한 글자 묶음 `x^{2}` → `x^2`
    t = re.sub(r"[.。]\s*$", "", t)
    # 괄호 숫자는 답 맨 앞에서 소문항이 시작할 때만 표지로 읽는다. x(1)은 함수/곱이다.
    if re.match(r"^" + _ASCII_SUB + r"\s", t):
        t = re.sub(r"(?<!\S)" + _ASCII_SUB + r"(?=\s)", lambda m: _SUB_MAP[m.group()], t)
    return t.strip()


def _space_fold(t: str) -> str:
    # 띄어쓰기는 기호 · 연산자 · 한글 둘레에서만 걷는다(수와 수 사이는 남긴다)
    t = re.sub(r"\s*([=+\-<>≤≥×÷·,°%()^_{}\\/])\s*", r"\1", t)
    t = re.sub(r"\s+(?=[가-힣])|(?<=[가-힣])\s+", "", t)
    t = re.sub(r"(?<=\d)\s+(?=[A-Za-z°%])", "", t)  # «12 cm» · «2 x» — 수와 단위 · 문자 사이
    return re.sub(r"\s+", " ", t).strip()


def choices_of(t: str) -> list[str] | None:
    """보기 기호만으로 된 답 — «③» · «①, ④» · «① ④»"""
    if re.fullmatch(rf"[{CIRCLED}](?:\s*[,，、및과와]?\s*[{CIRCLED}])*", t.strip()):
        return sorted(re.findall(rf"[{CIRCLED}]", t))
    return None


def parts_of(t: str) -> list[tuple[str, str]] | None:
    """소문항 «⑴ 3 ⑵ 5» → [(⑴, 3), (⑵, 5)] — 표지가 없으면 None"""
    marks = list(re.finditer(f"[{_SUB_MARKS}]", t))
    if not marks:
        return None
    if marks[0].start() != 0:
        return None
    out = []
    for i, m in enumerate(marks):
        end = marks[i + 1].start() if i + 1 < len(marks) else len(t)
        out.append((_SUB_MAP.get(m.group(), m.group()), t[m.end():end].strip(" ,;")))
    return out


def _number(t: str) -> Fraction | None:
    m = re.fullmatch(r"(-?)\\frac\{?(\d+)\}?\{?(\d+)\}?", t)
    if m:
        return Fraction(int(m.group(2)), int(m.group(3))) * (-1 if m.group(1) else 1) if int(m.group(3)) else None
    m = re.fullmatch(r"(-?)(\d+)/(\d+)", t)
    if m:
        return Fraction(int(m.group(2)), int(m.group(3))) * (-1 if m.group(1) else 1) if int(m.group(3)) else None
    m = re.fullmatch(r"-?\d+(?:\.\d+)?", t)
    if m:
        return Fraction(t)
    return None


def _same_value(a: str, b: str) -> bool:
    if a == b:
        return True
    ua, ub = re.match(r"^(.*?)([°%]|cm\^?2|cm\^?3|cm|m\^?2|m|개|가지|명|원|살|번|점|권|g|kg|L|mL|분|초|시간|km)?$", a), \
        re.match(r"^(.*?)([°%]|cm\^?2|cm\^?3|cm|m\^?2|m|개|가지|명|원|살|번|점|권|g|kg|L|mL|분|초|시간|km)?$", b)
    if ua and ub and (ua.group(2) or "") == (ub.group(2) or ""):
        na, nb = _number(ua.group(1)), _number(ub.group(1))
        if na is not None and nb is not None:
            return na == nb
    return False


_UNIT = re.compile(r"(?<=[\d}])(?:°|%|cm\^?2|cm\^?3|cm|km|m\^?2|m|mL|L|kg|g|개|가지|명|원|살|번|점|권|분|초|시간)")


def compare(expected: str, got: str) -> tuple[str, str]:
    """(match | different | hold, 까닭) — 단위가 한쪽에만 있고 값은 같으면 «hold»(단위를 지우고 같다고 하지 않는다)"""
    verdict, why = _compare(expected, got)
    if verdict == "different" and (got or "").strip():
        a, b = _space_fold(fold(expected)), _space_fold(fold(got))
        bare_a, bare_b = _UNIT.sub("", a), _UNIT.sub("", b)
        # 한쪽에만 단위가 있을 때만 — 양쪽 다 단위가 있는데 다르면(«cm» ≠ «m») 그대로 «다름»
        if (bare_a == a) != (bare_b == b) and _compare(bare_a, bare_b)[0] == "match":
            return "hold", "단위가 한쪽에만 — 값은 같다"
    return verdict, why


def _compare(expected: str, got: str) -> tuple[str, str]:
    if not (got or "").strip():
        return "hold", "풀이자 답이 비었다"
    a, b = _space_fold(fold(expected)), _space_fold(fold(got))
    ca, cb = choices_of(a), choices_of(b)
    if ca is not None or cb is not None:
        if ca is None or cb is None:
            return "different", "한쪽만 보기 기호"
        return ("match", "보기 기호") if ca == cb else ("different", f"보기 {''.join(ca)} ≠ {''.join(cb)}")
    pa, pb = parts_of(a), parts_of(b)
    if pa is not None or pb is not None:
        if pa is None or pb is None:
            return "different", "한쪽만 소문항"
        if [m for m, _ in pa] != [m for m, _ in pb]:
            return "different", "소문항 표지가 다르다"
        bad = [m for (m, x), (_, y) in zip(pa, pb) if not _same_value(x, y)]
        return ("match", "소문항마다 같다") if not bad else ("different", f"소문항 {''.join(bad)} 다르다")
    if _same_value(a, b):
        return "match", "같다" if a == b else "같은 값"
    return "different", "다르다"
