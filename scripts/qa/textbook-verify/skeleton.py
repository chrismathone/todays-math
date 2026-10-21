# -*- coding: utf-8 -*-
"""글의 뼈대 — 원본(한글 수식)과 문제은행(LaTeX)을 같은 자로 견주려고 (교과서 원본 대조 · 2026-10-21).

두 쪽의 글은 표기가 다르다: 원본은 `{1} over {5} x` · `LEFT ( … RIGHT )` · `rm `m`, 문제은행은 `\\frac{1}{5}x` ·
`\\left( … \\right)` · `\\mathrm{m}`. 줄 잇기 · 빈칸 · 문장부호 · 끊긴 낱말 붙이기도 이관 중에 바뀌었다.
그래서 글을 **뼈대**로 줄여서 견준다 — 수식은 낱말을 기호로(`times`/`\\times` → `×`), 꼴만 정하는 낱말
(`over` · `\\frac` · `rm` · `\\left` · 묶음 괄호 · 첨자 표지)은 버리고, 빈칸 · 문장부호도 버린다.

- `strict` — 한글 · 숫자 · 로마자 · 그리스 문자 · 보기 번호 · 연산 기호 · 괄호. «같음» 의 자.
- `loose`  — `strict` 에서 연산 기호 · 괄호를 뺀 것.
- `numbers` · `hangul` · `letters` — 숫자 덩이 · 한글 음절 · 로마자.

이관이 **일부러** 바꾼 것은 두 쪽에서 똑같이 접는다(그래야 «같음»이 남는다):
배점 표시(`[4점]`) · 그림 자리 표지(`[그림]` · `[그림:2]`) · 그림을 가리키는 말(«오른쪽 그림» → «다음 그림», D-164 ③④).

수식 낱말의 목록은 제품 변환기의 어휘(`src/lib/math/hwpEquationVocab.json`)를 그대로 읽는다 — 새 목록을 손으로 짓지 않는다.
"""
from __future__ import annotations

import dataclasses
import json
import re
import unicodedata
from functools import lru_cache
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
VOCAB = REPO / "src" / "lib" / "math" / "hwpEquationVocab.json"

#: 출판사의 기호 글꼴이 쓰는 사용자 영역 글자 — 글꼴마다 뜻이 달라 읽을 수 없다(«∥» 가 `U+F005A` 였다).
#: 뼈대에서는 이 한 글자로 접는다. 대조기는 이것과 기호 하나가 맞선 자리를 «표기»로 본다.
UNKNOWN_SYMBOL = "⍰"

#: LaTeX 명령(역슬래시 뒤 낱말) → 뼈대의 글자. 여기 없는 명령은 버린다(꼴만 정하는 명령).
COMMAND = {
    "times": "×", "div": "÷", "cdot": "·", "pm": "±", "mp": "∓", "ast": "*",
    "le": "≤", "leq": "≤", "leqq": "≤", "leqslant": "≤", "ge": "≥", "geq": "≥", "geqq": "≥", "geqslant": "≥",
    "ne": "≠", "neq": "≠", "approx": "≈", "equiv": "≡", "cong": "≡", "sim": "∼", "simeq": "≃", "propto": "∝",
    "to": "→", "rightarrow": "→", "longrightarrow": "→", "Rightarrow": "⇒", "Longrightarrow": "⇒",
    "leftarrow": "←", "Leftarrow": "⇐", "leftrightarrow": "↔", "Leftrightarrow": "⇔", "iff": "⇔",
    "mapsto": "↦", "uparrow": "↑", "downarrow": "↓",
    "infty": "∞", "angle": "∠", "triangle": "△", "circ": "°", "degree": "°", "prime": "′",
    "therefore": "∴", "because": "∵", "in": "∈", "notin": "∉", "ni": "∋",
    "subset": "⊂", "subseteq": "⊆", "subsetneq": "⊊", "supset": "⊃", "supseteq": "⊇",
    "not": "¬", "neg": "¬", "lnot": "¬", "forall": "∀", "exists": "∃",
    "cup": "∪", "cap": "∩", "bigcup": "∪", "bigcap": "∩", "emptyset": "∅", "varnothing": "∅",
    "cdots": "…", "ldots": "…", "dots": "…", "vdots": "…", "ddots": "…", "dotsc": "…", "dotsb": "…",
    "sqrt": "√", "perp": "⊥", "bot": "⊥", "parallel": "∥", "Vert": "∥", "|": "∥", "lVert": "∥", "rVert": "∥",
    "vert": "|", "lvert": "|", "rvert": "|", "mid": "|",
    "wedge": "∧", "land": "∧", "vee": "∨", "lor": "∨",
    "sum": "Σ", "prod": "∏", "int": "∫", "oint": "∮", "partial": "∂",
    "overline": "‾", "bar": "‾", "overrightarrow": "⃗", "vec": "⃗", "overleftrightarrow": "↔",
    "overarc": "⌒", "frown": "⌒", "widehat": "^", "hat": "^",
    "square": "□", "Box": "□", "boxed": "□", "fbox": "□", "blacksquare": "■", "bigcirc": "○", "bullet": "•",
    "star": "☆", "{": "{", "}": "}", "lbrace": "{", "rbrace": "}", "langle": "⟨", "rangle": "⟩",
    "lfloor": "⌊", "rfloor": "⌋", "lceil": "⌈", "rceil": "⌉", "%": "%", "#": "#", "$": "$", "&": "&", "_": "_",
}
#: 그리스 문자 · 함수 이름 — 이름이 곧 글자다
GREEK = {
    "alpha": "α", "beta": "β", "gamma": "γ", "delta": "δ", "epsilon": "ε", "varepsilon": "ε", "zeta": "ζ", "eta": "η",
    "theta": "θ", "vartheta": "θ", "iota": "ι", "kappa": "κ", "lambda": "λ", "mu": "μ", "nu": "ν", "xi": "ξ",
    "pi": "π", "rho": "ρ", "sigma": "σ", "tau": "τ", "upsilon": "υ", "phi": "φ", "varphi": "φ", "chi": "χ",
    "psi": "ψ", "omega": "ω", "Gamma": "Γ", "Delta": "Δ", "Theta": "Θ", "Lambda": "Λ", "Xi": "Ξ", "Pi": "Π",
    "Sigma": "Σ", "Upsilon": "Υ", "Phi": "Φ", "Psi": "Ψ", "Omega": "Ω", "ell": "ℓ", "hbar": "ℏ",
}
FUNCTIONS = {
    "sin", "cos", "tan", "cot", "sec", "csc", "cosec", "log", "ln", "lg", "lim", "exp", "max", "min", "sup", "inf",
    "gcd", "lcm", "det", "dim", "arg", "arcsin", "arccos", "arctan", "sinh", "cosh", "tanh", "mod", "deg",
}
#: LaTeX 환경 이름 — `\begin{cases}` 의 `cases` 는 글자가 아니다
ENVIRONMENTS = {"cases", "matrix", "pmatrix", "bmatrix", "vmatrix", "Vmatrix", "array", "aligned", "align", "gathered",
                "split", "smallmatrix", "dcases", "rcases"}
#: 한글 수식의 «꼴» 낱말 — 버린다(대소문자 가리지 않는다)
HWP_STRUCT_DROP = {
    "over", "atop", "left", "right", "rm", "it", "bold", "from", "to", "of", "matrix", "pmatrix", "bmatrix",
    "dmatrix", "vmatrix", "pile", "lpile", "rpile", "cpile", "cases", "eqalign", "under", "lsub", "rsub",
    "lsup", "rsup", "dint", "tint", "oint", "inter", "union", "coprod", "big", "large", "bigg", "scriptsize",
}
#: 한글 수식 기호 낱말(정본에 없는 것)
HWP_EXTRA = {
    "DEG": "°", "CENTIGRADE": "°C", "FAHRENHEIT": "°F", "ANGSTROM": "Å", "LITER": "ℓ", "OHM": "Ω",
    "le": "≤", "ge": "≥", "ne": "≠", "DIVIDE": "÷", "UNDEROVER": "",
    "SMALLPROD": "∏", "SMALLSUM": "Σ", "CONG": "≡", "SIM": "∼", "BIGCIRC": "○", "CIRC": "°", "INF": "∞",
    "lbrace": "{", "rbrace": "}", "LBRACE": "{", "RBRACE": "}", "LDOTS": "…", "CDOTS": "…", "VDOTS": "…",
    "PRIME": "′", "TRIANGLE": "△", "ANGLE": "∠", "SQRT": "√", "ROOT": "√", "sqrt": "√", "root": "√",
    "bar": "‾", "BAR": "‾", "vec": "⃗", "VEC": "⃗", "dyad": "↔", "DYAD": "↔", "arch": "⌒", "hat": "^", "dot": "",
    "ddot": "", "tilde": "∼", "box": "□", "BOX": "□", "vert": "|", "VERT": "|", "rarrow": "→", "larrow": "←",
    "sum": "Σ", "SUM": "Σ", "int": "∫", "INT": "∫", "prod": "∏", "PROD": "∏", "lim": "lim", "LIM": "lim", "Lim": "lim",
}
#: 한글 수식의 기호 글자 묶음
HWP_SYMBOLS = [("<=>", "⇔"), ("<->", "↔"), ("->", "→"), ("=>", "⇒"), ("<=", "≤"), (">=", "≥"), ("!=", "≠"),
               ("+-", "±"), ("-+", "∓"), ("==", "≡"), ("//", "∥")]
#: `LEFT {` · `RIGHT }` 의 괄호는 글자 그대로의 괄호다(묶음 괄호가 아니다) — 자리 글자로 지켜 둔다
_HWP_LITERAL_BRACE = re.compile(r"(?i)\b(?:left|right)\s*([{}])")
_LITERAL_OPEN, _LITERAL_CLOSE = "\ue0a0", "\ue0a1"

#: 보기 번호 · 묶음 번호 · 로마 숫자(단원 번호 «Ⅶ») — 뜻을 지닌 글자다(정규화에서 지키는 칸 — NFKC 는 «Ⅶ» 를 «VII» 로 바꾼다)
_PROTECTED = re.compile(r"[\u2460-\u24ff\u3200-\u32ff\u3131-\u318e\u2776-\u2793\u2160-\u217f]")
_PAREN_NUMBER = {chr(0x2474 + i): f"({i + 1})" for i in range(20)}  # ⑴ → (1)
#: ㈎ ~ ㈛ → (가) ~ (하) — 문제은행은 괄호 글로 적는다
_PAREN_HANGUL = {chr(0x320E + i): f"({syllable})" for i, syllable in enumerate("가나다라마바사아자차카타파하")}
_CIRCLED_FOLD = {**{chr(0x2780 + i): chr(0x2460 + i) for i in range(10)}, **{chr(0x24F5 + i): chr(0x2460 + i) for i in range(10)},
                 **{chr(0x2776 + i): chr(0x2460 + i) for i in range(10)}}
_TEXT_FOLD = {"−": "-", "–": "-", "—": "-", "~": "∼", "∙": "·", "ㆍ": "·", "•": "·", "‧": "·",
              "≦": "≤", "≧": "≥", "℃": "°C", "˚": "°", "º": "°", "'": "′", "’": "′", "‘": "′", "`": "",
              "▢": "□", "☐": "□", "◯": "○", "⃝": "○", "‖": "∥", "⫽": "∥", "\u3000": " "}

_STRICT_SYMBOLS = set("=+-×÷·±∓<>≤≥≠≈≡∼≃∝→⇒←⇐↔⇔↦↑↓∞∠△°′∴∵∈∉∋⊂⊆⊊⊃⊇¬∀∃∪∩∅…√⊥∥∧∨Σ∏∫∮∂‾⃗⌒^□■○•☆{}⟨⟩⌊⌋⌈⌉%()[]|/:!*?") | {
    UNKNOWN_SYMBOL, "▣", "ˆ", "ˍ", "⁄"}


@lru_cache(maxsize=1)
def _hwp_words() -> dict[str, str]:
    """한글 수식 낱말 → 뼈대 글자. 정본 역매핑(LaTeX 명령)을 `COMMAND` · `GREEK` 로 한 번 더 바꾼다."""
    vocab = json.loads(VOCAB.read_text(encoding="utf-8"))
    out: dict[str, str] = {}
    for word, latex in vocab["reverse"].items():
        out[word] = latex_symbol(latex)
    for word, info in vocab.get("outsideCanon", {}).items():
        out[word] = latex_symbol(info.get("latex", ""))
    out.update(HWP_EXTRA)
    for word in HWP_STRUCT_DROP:
        out.setdefault(word, "")
        out.setdefault(word.upper(), "")
    # 붙은 낱말 속의 분수 · 첨자(«3piover2» · «xsup2»)도 표지로
    for word, mark in (("over", FRAC), ("atop", FRAC), ("sup", SUP), ("sub", SUB)):
        out[word] = out[word.upper()] = mark
    for word in FUNCTIONS:
        out.setdefault(word, word)
    for word, letter in GREEK.items():
        out.setdefault(word, letter)
    return out


def latex_symbol(latex: str) -> str:
    """정본 역매핑의 LaTeX 조각 하나(`\\times` · `^\\circ` · `+`) → 뼈대 글자."""
    text = latex.strip()
    if not text:
        return ""
    if text == "^\\circ":
        return "°"
    match = re.fullmatch(r"\\([A-Za-z]+)", text)
    if match:
        name = match.group(1)
        if name in COMMAND:
            return COMMAND[name]
        if name in GREEK:
            return GREEK[name]
        if name in FUNCTIONS:
            return name
        return ""
    return "" if text.startswith("\\") else text


def _is_private_use(ch: str) -> bool:
    code = ord(ch)
    return 0xE000 <= code <= 0xF8FF or code >= 0xF0000


def _fold_text(text: str) -> str:
    out = []
    for ch in text:
        if ch in (_LITERAL_OPEN, _LITERAL_CLOSE):
            out.append("{" if ch == _LITERAL_OPEN else "}")
        elif ch in _PAREN_NUMBER:
            out.append(_PAREN_NUMBER[ch])
        elif ch in _PAREN_HANGUL:
            out.append(_PAREN_HANGUL[ch])
        elif ch in _CIRCLED_FOLD:
            out.append(_CIRCLED_FOLD[ch])
        elif ch in _TEXT_FOLD:
            out.append(_TEXT_FOLD[ch])
        elif _PROTECTED.match(ch):
            out.append(ch)
        elif _is_private_use(ch):
            out.append(UNKNOWN_SYMBOL)
        else:
            out.append(unicodedata.normalize("NFKC", ch))
    return "".join(out)


_HWP_TOKEN = re.compile(r"([A-Za-z]+)|(\d+)|(\s+)|(.)", re.S)

#: 위첨자 · 아래첨자 · 분수 선의 자리 — 뼈대에 남긴다(Codex 1회차: `x²`↔`x₂` · `1/2`↔`12` 를 «같음»으로 읽었다)
SUP, SUB, FRAC = "ˆ", "ˍ", "⁄"
#: 꼴만 정하고 안의 글은 남기는 LaTeX 명령 — 인자 하나를 그대로 읽는다
_LATEX_KEEP_ARG = {"text", "textrm", "mathrm", "mathbf", "mathit", "mathsf", "mathtt", "mathcal", "mathbb", "boldsymbol", "bm",
                   "operatorname", "displaystyle", "textstyle", "underline", "hbox", "mbox", "textbf", "textit"}
_LATEX_FRAC = {"frac", "dfrac", "tfrac", "cfrac"}


class _Latex:
    """LaTeX 수식을 한 바퀴 읽어 뼈대 글자를 낸다 — 분수 · 근호 · 첨자 · `\\overset` 의 인자를 차례대로."""

    def __init__(self, body: str) -> None:
        self.s = _ARRAY_SPEC.sub(" ", body)
        self.i = 0

    def run(self) -> str:
        return self.until(None)

    def until(self, stop: str | None) -> str:
        out: list[str] = []
        while self.i < len(self.s):
            ch = self.s[self.i]
            if stop is not None and ch == stop:
                self.i += 1
                break
            out.append(self.item())
        return "".join(out)

    def arg(self) -> str:
        """인자 하나 — `{…}` · 명령 하나 · 글자 하나."""
        while self.i < len(self.s) and self.s[self.i] in " \t\n":
            self.i += 1
        if self.i >= len(self.s):
            return ""
        if self.s[self.i] == "{":
            self.i += 1
            return self.until("}")
        return self.item()

    def item(self) -> str:
        s, i = self.s, self.i
        ch = s[i]
        if ch == "{":
            self.i += 1
            return self.until("}")
        if ch in "}":
            self.i += 1
            return ""
        if ch in "^_":
            self.i += 1
            saved = self.i
            inner = self.arg()
            raw = s[saved:self.i]
            if re.fullmatch(r"\s*\{?\s*\\circ\s*\}?\s*", raw):
                return "°"
            if re.fullmatch(r"\s*\{?\s*\\prime\s*\}?\s*", raw):
                return "′"
            if not inner:
                return ""  # 빈 첨자 «\int_{}^{}» — 뜻이 없다
            return (SUP if ch == "^" else SUB) + inner
        if ch == "\\":
            m = re.match(r"\\(begin|end)\s*\{[A-Za-z*]+\}", s[i:])
            if m:
                self.i += m.end()
                return ""
            m = re.match(r"\\([A-Za-z]+)|\\(.)", s[i:], re.S)
            self.i += m.end()
            name = m.group(1) or m.group(2)
            if name in _LATEX_FRAC:
                top = self.arg()
                bottom = self.arg()
                return top + FRAC + bottom
            if name == "sqrt":
                index = ""
                while self.i < len(s) and s[self.i] == " ":
                    self.i += 1
                if self.i < len(s) and s[self.i] == "[":
                    close = s.find("]", self.i)
                    index = _Latex(s[self.i + 1 : close]).run() if close > 0 else ""
                    self.i = close + 1 if close > 0 else self.i
                return "√" + index + self.arg()
            if name in ("overset", "stackrel"):
                over = self.arg()
                return over + self.arg()
            if name == "boxed" or name == "fbox":
                return "□" + self.arg()
            if name == "textcircled":
                inner = self.arg()
                return chr(0x2460 + int(inner) - 1) if inner.isdigit() and 1 <= int(inner) <= 20 else inner
            if name in _LATEX_KEEP_ARG:
                return self.arg()
            if name in ("left", "right", "big", "Big", "bigl", "bigr", "Bigl", "Bigr"):
                return ""
            if name in COMMAND:
                return COMMAND[name]
            if name in GREEK:
                return GREEK[name]
            if name in FUNCTIONS:
                return name
            return ""
        self.i += 1
        if re.match(r"[A-Za-z]", ch):
            m = re.match(r"[A-Za-z]+", s[i:])
            self.i = i + m.end()
            word = m.group(0)
            return "" if word in ENVIRONMENTS else word
        if "0" <= ch <= "9":
            m = re.match(r"[0-9]+", s[i:])
            self.i = i + m.end()
            return m.group(0)
        if ch in " \t\n~&":
            return ""
        return _fold_text(ch)


def latex_math(body: str) -> str:
    """LaTeX 수식 → 뼈대 글자들."""
    return _Latex(body).run()


#: `\begin{array}{c|ccccc}` 의 열 꼴 — 글자가 아니다
_ARRAY_SPEC = re.compile(r"\\begin\s*\{(?:array|tabular)\}\s*\{[^{}]*\}")


def _lookup(word: str) -> str | None:
    """한글 수식 낱말 하나 — 한글 수식은 명령 낱말의 대소문자를 가리지 않는다(`times` = `TIMES`).
    그리스 문자만 대소문자가 뜻이다(`pi` · `Pi`) — 그래서 먼저 글자 그대로 찾는다."""
    words = _hwp_words()
    # 두 글자 이하는 글자 그대로만 — 대문자 `GE` 는 선분 이름이다(`ge` 만 부등호 · 제품 변환기와 같은 규칙)
    forms = (word,) if len(word) <= 2 else (word, word.upper(), word.lower())
    for form in forms:
        if form in words:
            return words[form]
    return None


def _split_hwp_word(word: str) -> list[str]:
    """한글 수식의 붙은 낱말(`timesa` · `boldx` · `16DEGRMC`의 `DEGRMC`) → 낱말 · 글자. 모르는 덩이는 글자 그대로."""
    found = _lookup(word)
    if found is not None:
        return [found]
    if word.lower() in HWP_STRUCT_DROP:
        return [""]
    # 앞에서부터 가장 긴 낱말을 뗀다 — 세 글자 넘는 낱말만(두 글자 `it` · `rm` · `le` 는 홀로 설 때만 낱말이다)
    for size in range(len(word) - 1, 2, -1):
        head = _lookup(word[:size])
        if head is not None:
            return [head, *_split_hwp_word(word[size:])]
    # 두 글자 그리스 문자 · 함수가 낱말 앞에 붙은 꼴(`piover` · `pir`) — 나머지가 **전부** 낱말로 갈릴 때만 뗀다
    for size in (2,):
        head = word[:size]
        if head in GREEK and len(word) > size:
            rest = _split_hwp_word(word[size:])
            if all(_lookup(part) is not None or part == "" or not re.fullmatch(r"[A-Za-z]+", part) for part in rest):
                return [GREEK[head], *rest]
    if len(word) >= 3 and word[:2].lower() in ("rm", "it"):
        return ["", *_split_hwp_word(word[2:])]
    return [word]


def hwp_math(script: str) -> str:
    """한글 수식 → 뼈대 글자들. 첨자(`^` · `_` · `sup` · `sub`) · 분수(`over` · `atop`)의 자리는 표지로 남긴다."""
    text = _HWP_LITERAL_BRACE.sub(lambda m: " " + (_LITERAL_OPEN if m.group(1) == "{" else _LITERAL_CLOSE) + " ", script)
    for raw, symbol in HWP_SYMBOLS:
        text = text.replace(raw, f" {symbol} ")
    # 빈 첨자 «int _{ } ^{ }» · «0 ^{`}» — 뜻이 없다
    text = re.sub(r"[_^]\s*\{[\s`~]*\}", " ", text)
    # 위첨자 동그라미는 도(°) — «^{circ}» · «^circ»
    text = re.sub(r"\^\s*\{?\s*(?i:circ)\s*\}?", " DEG ", text)
    text = re.sub(r"\^\s*\{?\s*(?i:prime)\s*\}?", " PRIME ", text)
    out: list[str] = []
    for match in _HWP_TOKEN.finditer(text):
        word, digits, _space, other = match.groups()
        if word is not None:
            low = word.lower()
            if low in ("over", "atop"):
                out.append(FRAC)
            elif low in ("from", "to") and out and out[-1] in ("Σ", "∫", "∏", "lim", "∮"):
                out.append(SUB if low == "from" else SUP)  # «sum from {k=1} to {10}» = «\sum_{k=1}^{10}»
            elif low == "to" and re.search(r"[Σ∫∏]", "".join(out[-12:])):
                out.append(SUP)
            elif low == "sup":
                out.append(SUP)
            elif low == "sub":
                out.append(SUB)
            else:
                out.extend(_split_hwp_word(word))
        elif digits is not None:
            out.append(digits)
        elif other == "^":
            out.append(SUP)
        elif other == "_":
            out.append(SUB)
        elif other is not None and other not in "{}~`#&\"":
            out.append(_fold_text(other))
    # 아무것도 안 따르는 첨자 표지(«(-2, 1)_» 로 끝나는 수식)는 뜻이 없다
    return re.sub(r"[ˆˍ]+$", "", "".join(out))


#: 수식 칸 — 줄 바꿈 수식(`$$ … $$`)을 먼저 본다(아니면 `$$` 가 빈 수식으로 읽혀 안쪽 LaTeX 가 글이 된다)
_MATH_SPAN = re.compile(r"\$\$([\s\S]*?)\$\$|\$([^$]*)\$")
#: 이관이 일부러 걷거나 바꾼 것 — 두 쪽에서 같이 접는다
_SCORE = re.compile(r"[\[(]\s*\d+(?:\.\d+)?\s*점\s*[\])]")
_FIGURE_MARK = re.compile(r"\[\s*그림\s*(?::\s*\d+)?\s*\]|\[\[(?:FIG|TBL):\d+\]\]")
#: 그림 · 자료 표의 자리 — 뼈대에 한 글자로 남긴다(대조기가 «원본의 글이 그림으로 실렸다»를 알아보는 닻)
FIGURE = "▣"
#: «오른쪽 그림» → «다음 그림»(D-164 ③④ — `scripts/qa/textbookFigureTextCore.ts`). «아래 …»도 같은 뜻으로 접는다
_POINTING = re.compile(
    # 그림 표지가 낱말 한가운데 매인 꼴(«오 [그림] 른쪽» · «그 [그림] 림에서»)도 — 원본은 그림을 글자 사이에 닻으로 둔다
    r"(?<![가-힣])(?:오\s*(?:▣\s*)*른\s*(?:▣\s*)*쪽|왼\s*(?:▣\s*)*쪽|아\s*(?:▣\s*)*래)"
    r"(?=\s*(?:▣\s*)*(?:의\s*)?(?:그\s*(?:▣\s*)*림|표|그래프|도형|수직선|좌표평면|전개도|히스토그램|도수분포|줄기|상자|보기|은|는|과|와)|\s*$)"
)


def flatten(text: str, *, source: str) -> str:
    """글 + 수식(`$…$`) → 뼈대 글자들의 줄글(빈칸은 남긴다). `source` 는 `hwp`(원본) · `latex`(문제은행)."""
    convert = hwp_math if source == "hwp" else latex_math
    text = _FIGURE_MARK.sub(f" {FIGURE} ", text or "")
    pieces: list[str] = []
    last = 0
    for match in _MATH_SPAN.finditer(text):
        pieces.append(_fold_text(text[last : match.start()]))
        body = match.group(1) if match.group(1) is not None else match.group(2)
        pieces.append(convert(body))
        last = match.end()
    pieces.append(_fold_text(text[last:]))
    flat = "".join(pieces)
    # 분자가 1 인 분수 뒤의 글자 하나는 분자로 옮겨도 같은 값이다(«1 over 3 pi» = «\frac{\pi}{3}»)
    flat = re.sub(r"(?<![\d.])1" + FRAC + r"(\d+)([A-Za-zπθαβ])(?![A-Za-z])", r"\2" + FRAC + r"\1", flat)
    # 중복순열 기호 — 한글 수식 «SMALLPROD»(∏)와 LaTeX «\Pi»(Π)는 같은 글자로 쓰인다(«₅Π₂»)
    flat = flat.replace("∏", "Π")
    # 배점은 수식 안에 수가 든 꼴(«[$4$점]»)도 있다 — 수식을 푼 뒤에 걷는다
    return _POINTING.sub("다음", _SCORE.sub(" ", flat))


_KEEP_LOOSE = re.compile(r"[가-힣ㄱ-ㅎㅏ-ㅣ0-9A-Za-zα-ωΑ-Ωℓ\u2460-\u2473\u3260-\u327f\u2160-\u217f]")


def strict_chars(flat: str) -> str:
    return "".join(ch for ch in flat if _KEEP_LOOSE.match(ch) or ch in _STRICT_SYMBOLS)


def loose_chars(flat: str) -> str:
    return "".join(ch for ch in flat if _KEEP_LOOSE.match(ch))


@dataclasses.dataclass(frozen=True)
class Skeleton:
    strict: str
    loose: str
    numbers: tuple[str, ...]
    hangul: str
    letters: str


_FUNCTION_WORDS = re.compile(r"(?<![A-Za-z])(?:" + "|".join(sorted(FUNCTIONS, key=len, reverse=True)) + r")(?![A-Za-z])")


def skeleton(text: str, *, source: str) -> Skeleton:
    flat = flatten(text, source=source)
    strict = strict_chars(flat)
    loose = loose_chars(flat)
    # 숫자 덩이는 소수점을 붙여 센다(`0.6`). 세 자리 자릿점(`2,000`)은 걷는다
    numbers = tuple(re.findall(r"\d+(?:\.\d+)?", re.sub(r"(?<=\d),(?=\d{3}(?!\d))", "", flat)))
    hangul = "".join(re.findall(r"[가-힣]", flat))
    letters = "".join(re.findall(r"[A-Za-z]", _FUNCTION_WORDS.sub("", flat)))
    return Skeleton(strict, loose, numbers, hangul, letters)
