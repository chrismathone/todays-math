# -*- coding: utf-8 -*-
"""교과서 문항 전수 대조 — 문제은행(DB) ↔ 외장 SSD 원본 (2026-10-21 · 읽기만).

  python verify.py <DB 덤프 JSONL> <원본 폴더(extract_originals.py 의 출력)> <원장 JSONL> [--only <externalId 조각>]

문항마다 세 가지를 본다(판정은 `Verifier.judge` 한 곳 — 눈금 맞추기 `calibrate.py` 도 같은 길을 탄다).
  1. **본문** — 같은 열쇠(`tb-<자료>-<묶음>-<번호>`)의 원본 문항과 뼈대를 견준다(`compare.py`):
     `same`(같음) · `notation`(표기만 다름) · `different`(다른 문항) · `missing`(원본 못 찾음).
  2. **자리** — 이관의 가르기와 **따로**, DB 글이 원본 파일의 어디에 있는지 문단에서 찾고 그 앞의 가장 가까운 번호를 읽는다.
     같은 파일의 다른 원본 문항과 더 잘 맞으면 «다른 번호의 글»이다. (자리 검사는 판정에 안 쓰고 기록만 — 두 단 표 · «1)» 소문항 번호에서 헛짚는다)
  3. **정답** — 원본의 정답(빠른 정답 · 풀이 끝)과 견준다: `same` · `notation` · `partial` · `in-solution` · `different` · `none` · `picture`.
     `different` 는 다시 셋으로 — `final`(원본 풀이 끝의 값과 같다 — 같음으로 센다) · `string`(풀이에 글자만 있다) · `none`(근거 없음)
     (Codex 1회차: «풀이 어딘가에 있다»만으로 넘기지 않는다).

🔴 원장에 교과서 글이 든다 — 저장소 밖에만 쓴다.
"""
from __future__ import annotations

import argparse
import collections
import json
import re
import sys
from pathlib import Path

from rapidfuzz import fuzz

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parents[1] / "import" / "textbook"))

from compare import NOTATION_SYMBOLS, Context, compare  # noqa: E402
from skeleton import FIGURE, skeleton  # noqa: E402
from segment import lead_number  # noqa: E402

RECOVERY = HERE.parents[1] / "import" / "textbook" / "recovery-20261009"

#: «다른 번호의 글»로 볼 만큼 다른 문항과 더 잘 맞는가 — 뼈대 닮음 차이
OTHER_BETTER = 0.15
#: DB 글의 한 줄을 원본에서 찾았다고 볼 rapidfuzz 점수(부분 일치)
LOCATE_MIN = 90
#: «그림으로 실린 글»의 근거로 보는 표 칸 · 글상자의 범위 — 찾은 문단의 앞뒤 문단 수
BOX_RADIUS = 40
#: 여러 문항이 같이 쓰는 지시문 «[04~05] 다음 …» (`segment._GROUP_STEM` 과 같은 꼴)
_GROUP_STEM = re.compile(r"^\[\s*(\d{1,3})\s*[~∼\-]\s*(\d{1,3})\s*\]")
#: 번호 뒤에 글이 띄어쓰기 없이 붙은 꼴(`segment._TIGHT_NUMBER` 와 같은 꼴)
_TIGHT_NUMBER = re.compile(r"^(0[1-9]|[1-9]\d)(?=[^\d\s.,)%°~∼:/-])")
#: 뜻을 지닌 기호 — 정답 대조에서 부호 · 부등호 · 첨자 · 분수 선을 지킨다
_MEANING = re.compile(r"[=+\-<>≤≥≠±×÷√∠△∈∉⊂⊆⊃⊇∪∩ˆˍ⁄]")


def recorded_edits() -> dict[str, str]:
    """2026-10-09 복구 묶음이 일부러 고쳐 쓴 문항 — 문항 코드 → `rewrite` · `correction`."""
    out: dict[str, str] = {}
    for name in ("rewrites.json", "corrections-a.json", "corrections-b.json"):
        path = RECOVERY / name
        if path.exists():
            for entry in json.loads(path.read_text(encoding="utf-8"))["entries"]:
                if entry.get("kind") in ("rewrite", "correction"):
                    out[entry["problemCode"]] = entry["kind"]
    return out


#: 본문 머리에 남은 문항 번호 «1 다음 …» · «[그림] 1 다음 …»(이관이 번호를 못 뗐다)
_LEFT_NUMBER = re.compile(r"^(?:\[그림(?::\d+)?\]\s*)?(?:0?[1-9]|[1-9]\d)\s+(?=[가-힣$])")


def display_flags(content: str) -> list[str]:
    """대조와 따로 — DB 글 자체의 지면 흠 가운데 원본과 견주며 보인 것."""
    flags = []
    if _LEFT_NUMBER.match(content or ""):
        flags.append("본문 머리에 문항 번호가 남았다")
    return flags


def core(strict: str) -> str:
    """표기 기호를 뺀 뼈대 — 괄호 · 가운뎃점 · 그림 표지는 걷고 뜻을 지닌 기호는 둔다."""
    return "".join(ch for ch in strict if ch not in NOTATION_SYMBOLS)


def meaning(strict: str) -> str:
    return "".join(_MEANING.findall(strict))


def choice_blocks(strict: str) -> tuple[str, dict[str, str]]:
    """보기 앞 글 · 보기 번호별 글. 보기가 없으면 ({}, 글 전체)."""
    parts = re.split(r"([①-⑩])", strict)
    if len(parts) < 3:
        return strict, {}
    blocks: dict[str, str] = {}
    for i in range(1, len(parts) - 1, 2):
        blocks[parts[i]] = blocks.get(parts[i], "") + parts[i + 1]
    return parts[0], blocks


def _counts(text: str) -> tuple:
    return (
        collections.Counter(re.findall(r"\d+(?:\.\d+)?", text)),
        collections.Counter(re.findall(r"[A-Za-z]", text)),
        meaning(text),
    )


def restructured(db_strict: str, orig_strict: str, boxes: str) -> bool:
    """표를 줄로 풀어 쓴 보기인가 — 보기 번호마다 수 · 문자의 개수 · 뜻 기호의 차례 · 한글이 같다. DB 보기에 더 붙은 한글은
    원본 표의 머리 줄(원본의 보기 앞에만 있고 DB 의 보기 앞에는 없는 낱말 «계산 결과»)뿐이어야 한다
    (Codex 1회차: 보기 번호 · 행 · 열 제목 · 값의 대응이 맞아야 한다)."""
    db_stem, db_blocks = choice_blocks(db_strict.replace(FIGURE, ""))
    orig_stem, orig_blocks = choice_blocks(re.sub(r"교과서\d*쪽\d*", "", orig_strict.replace(FIGURE, "")))
    if not db_blocks or set(db_blocks) != set(orig_blocks):
        return False
    # 표의 머리 줄 — 원본 보기 앞의 글 가운데 **이 문항 가까이의 표 칸**에 든 낱말만(발문의 낱말은 머리가 아니다)
    header = sorted({w for w in re.findall(r"[가-힣]+", orig_stem) if w in boxes and w not in db_stem}, key=len, reverse=True)
    if not header:
        return False
    for mark, db_block in db_blocks.items():
        db_b, orig_b = re.sub(r"\(\d+\)", "", db_block), re.sub(r"\(\d+\)", "", orig_blocks[mark])
        if _counts(db_b) != _counts(orig_b):
            return False
        db_h = "".join(re.findall(r"[가-힣]", db_b))
        for word in header:
            db_h = db_h.replace(word, "")
        if db_h != "".join(re.findall(r"[가-힣]", orig_b)):
            return False
    # 보기 앞의 글(발문)도 수 · 문자 · 뜻 기호가 같아야 한다 — 머리 줄의 «(1) (2) 계산 결과» 표지 수는 걷는다
    orig_head = orig_stem
    for word in header:
        orig_head = orig_head.replace(word, "")
    db_head = re.sub(r"\(\d+\)", "", db_stem)
    orig_head = re.sub(r"\(\d+\)", "", orig_head)
    # 발문은 수 · 문자 · 뜻 기호 · 한글이 다 같아야 한다(«옳은» → «옳지 않은» 을 넘기던 구멍 — 눈금 맞추기 2회차)
    return _counts(db_head) == _counts(orig_head) and re.findall(r"[가-힣]", db_head) == re.findall(r"[가-힣]", orig_head)


class FileIndex:
    """원본 파일 하나의 문단 · 번호 자리 · 표 칸 글 — 자리 찾기와 «그림으로 실린 글»의 근거."""

    def __init__(self, paras: list[dict]) -> None:
        self.paras = paras
        self.skeletons = [skeleton(p["text"], source="hwp").strict for p in paras]
        self.stream = ""
        self.starts: list[int] = []
        for text in self.skeletons:
            self.starts.append(len(self.stream))
            self.stream += text
        self.markers: list[tuple[int, int | None]] = []
        for index, para in enumerate(paras):
            marker = lead_number(para["text"]) if para["text"] else None
            tight = _TIGHT_NUMBER.match(para["text"] or "")
            if marker is not None:
                self.markers.append((index, marker[0]))
            elif tight is not None:
                self.markers.append((index, int(tight.group(1))))  # «04어느 공장에서 …»
            elif para.get("glyph"):
                self.markers.append((index, None))

    def boxes_near(self, para: int | None) -> str:
        """찾은 문단 앞뒤의 **자료 표 칸** 글 — 이관이 그림으로 그려 붙인 표(`[[TBL:n]]`)의 글이다.
        글상자 · 배치용 표의 글은 넣지 않는다 — 문항 글 자체가 글상자 · 두 단 표에 든 책이 많다(눈금 맞추기 2회차: 상자 속
        조건 «(단, a, b, x 는 실수)» 를 지운 대조군이 «그림으로 실린 글»로 넘어갔다)."""
        if para is None:
            return ""
        lo, hi = max(0, para - BOX_RADIUS), min(len(self.paras), para + BOX_RADIUS + 1)
        return "".join(s for p, s in zip(self.paras[lo:hi], self.skeletons[lo:hi]) if p.get("table"))

    def para_at(self, offset: int) -> int:
        lo, hi = 0, len(self.starts) - 1
        while lo < hi:
            mid = (lo + hi + 1) // 2
            if self.starts[mid] <= offset:
                lo = mid
            else:
                hi = mid - 1
        return lo

    def locate(self, lines: list[str]) -> dict | None:
        """DB 글이 원본의 어디에 있나 — 이관의 가르기와 따로 찾는다.

        DB 줄 가운데 원본에서 **하나뿐인 자리**로 찾아지는 줄의 문단을 모으고, 그 가운데 **마지막** 문단을 쓴다.
        같이 쓰는 지시문(«[06~10] 다음 식을 …»)은 범위의 첫 문항 앞에 한 번 나온다 — 그 문단으로 번호를 읽으면 앞 문항(05)이다.
        그래서 지시문 문단은 따로 모은다(`stems` — 그 범위로 번호를 견준다). 문항 글이 지시문 · 그림뿐이면 범위로만 본다."""
        own: list[int] = []
        stems: list[tuple[int, int, int]] = []
        for line in lines:
            if len(line) < 4:
                continue
            first = self.stream.find(line)
            if first < 0:
                continue
            unique = self.stream.find(line, first + 1) < 0
            para = self.para_at(first)
            stem = _GROUP_STEM.match(self.paras[para]["text"])
            if stem is None and unique and len(line) >= 6:
                own.append(para)
            elif stem is not None or len(line) >= 8:
                at = first
                while at >= 0:
                    hit = self.para_at(at)
                    match = _GROUP_STEM.match(self.paras[hit]["text"])
                    if match:
                        stems.append((hit, int(match.group(1)), int(match.group(2))))
                    at = self.stream.find(line, at + 1)
        if own:
            return {"para": max(own), "score": 100.0, "how": "own-line"}
        if stems:
            return {"para": stems[0][0], "score": 100.0, "how": "stem", "ranges": sorted({(a, b) for _p, a, b in stems})}
        best = None
        for line in sorted(lines, key=len, reverse=True)[:3]:
            if len(line) < 8:
                continue
            if self.stream.count(line) >= 2:
                # 같은 글이 파일에 여럿(«다음 그림에서 ∠x 의 크기를 구하시오») — 글로는 자리를 못 정한다(그림이 가른다)
                return {"para": None, "score": 100.0, "how": "repeated"}
            found = fuzz.partial_ratio_alignment(line, self.stream)
            if found and (best is None or found.score > best["score"]):
                para = self.para_at(found.dest_start)
                if not _GROUP_STEM.match(self.paras[para]["text"]):
                    best = {"para": para, "score": round(found.score, 1), "how": "fuzzy"}
        return best

    def number_before(self, para: int) -> tuple[int | None, bool]:
        """그 문단(을 포함해) 앞의 가장 가까운 번호 — (번호, 번호가 그림인가)."""
        before = [m for m in self.markers if m[0] <= para]
        if not before:
            return None, False
        _index, number = before[-1]
        if number is not None:
            return number, False
        run = 0
        for _i, n in reversed(before):
            if n is not None:
                break
            run += 1
        return run, True


#: 정답 뼈대에서 걷는 말 — «$a=40$이다» · «( O )»
_ANSWER_TAIL = re.compile(r"(?:이다|입니다|이므로|임|다)$")
_UNIT_TAIL = re.compile(r"(?:cm|mm|km|m|g|kg|mL|L|°|%|원|개|명|회|점|시간|분|초)\d?$")


def _parts(strict: str) -> list[str]:
    """소문항 답 «(1)… (2)…» → 소문항마다. 소문항이 없으면 통째로 하나."""
    pieces = re.split(r"\(\d+\)", strict)
    return [p for p in pieces if p] if len(pieces) > 2 else [strict]


def _ends_with_value(text: str, value: str) -> bool:
    """원본(풀이 꼴)이 그 값으로 끝나나 — 마지막 «=» 의 오른쪽이 그 값이거나, 글이 그 값으로 끝난다(앞이 수 · 문자 · 부호가 아니다).
    «( O )» · «$=(+13)$» 처럼 괄호 · 덧셈 부호로 감싼 끝도 같은 값으로 본다."""
    text = _ANSWER_TAIL.sub("", text)
    for form in (value, f"({value})", f"(+{value})", f"+{value}", f"(={value})"):
        if form and text.endswith(form):
            before = text[: len(text) - len(form)]
            if not before or not re.match(r"[0-9A-Za-z.\-+ˆˍ⁄]", before[-1]):
                return True
    return False


def _ox(value: str, text: str) -> bool:
    """○× 문항 — 원본(풀이 꼴)에 «( O )» · «( X )» 가 그대로 있다."""
    return value in ("O", "X", "○", "×") and f"({value})" in text.replace("◯", "O").replace("✕", "X")


def _labelled(strict: str) -> dict[str, str]:
    """소문항 표지별 답 «(1)…(2)…» → {"1": …, "2": …}. 표지가 둘 미만이면 빈 사전."""
    parts = re.split(r"\((\d+)\)", strict)
    if len(parts) < 4:
        return {}
    return {parts[i]: parts[i + 1] for i in range(1, len(parts) - 1, 2) if parts[i + 1]}


def _terms(strict: str) -> list[str]:
    """«3ab+2b-b2» → 부호를 단 항들의 정렬 목록 — 항의 차례만 다른 식을 같게 본다(부호는 지킨다: «x-3» ≠ «3-x»)."""
    text = _UNIT_TAIL.sub("", strict.strip("()"))
    text = re.sub(r"^\((.*)\)$", r"\1", text)
    if "=" in text or not re.search(r"[+\-]", text[1:]):
        return [text]
    terms = re.findall(r"[+\-]?[^+\-]+", text)
    return sorted(t if t[0] in "+-" else "+" + t for t in terms)


def _label_fold(strict: str) -> str:
    """정답의 소문항 표지 — «①-㉠» 과 «(1)㉠» 은 같은 짝이다(보기 번호를 소문항 번호로 쓴 원본)."""
    out = re.sub("[①-⑳]", lambda m: f"({ord(m.group(0)) - 0x245F})", strict)
    # 표지 뒤의 줄표는 짝을 잇는 줄(«①-㉠»)일 때만 걷는다 — 음수 부호(«⑵ -18»)는 지킨다(눈금 맞추기 2회차)
    return re.sub(r"(\(\d+\))-(?=[㉠-㉯ㄱ-ㅎ가-힣])", r"\1", out)


def answer_verdict(db_answer: str, orig: dict, file_summary: dict) -> tuple[str, str]:
    """(판정, 근거). 판정: same · notation · partial · in-solution · different · none · picture.

    뜻을 지닌 기호(부호 · 부등호 · 첨자 · 분수 선)는 지킨다 — `−3` 과 `3` 은 다르다(Codex 1회차)."""
    original = orig.get("answer")
    source = orig.get("answerFrom") or ""
    a = skeleton(db_answer, source="latex")
    solution = skeleton(orig.get("solution") or "", source="hwp").strict
    if original:
        b = skeleton(original, source="hwp")
        if a.strict == b.strict:
            return "same", source
        if core(a.strict) == core(b.strict):
            return "notation", source + " · 괄호 · 가운뎃점만 다르다"
        choice = re.fullmatch(r"\s*([①-⑤])\s*", db_answer or "")
        if choice and b.strict.startswith(choice.group(1)) and not re.match(r"\s*[①-⑤]", b.strict[1:]):
            return "same", source
        rest = b.strict[len(a.strict):] if b.strict.startswith(a.strict) and a.strict else None
        if source == "key" and rest is not None and re.match(r"\d{1,2}(?=\D)|[①-⑤ㄱ-ㅎ(]", rest):
            # 빠른 정답 칸에 다음 번호의 답이 붙었다(«$a=1$, $b=0$ 2 ㄱ») — 빠른 정답 칸에서만(풀이 꼴의 «4×(-1)×(-2)=8» 은 아니다)
            return "same", source + " · 원본 정답 칸에 다음 번호가 붙어 있다"
        if not re.search(r"[0-9A-Za-z가-힣①-⑤ㄱ-ㅎα-ω]", b.strict.replace("cm", "").replace("m", "")):
            return "none", source + " · 원본 정답 칸이 깨졌다(단위뿐)"
        if _ox(a.strict, b.strict):
            return "same", source + " · ○× 가 풀이 안에"
        db_parts, orig_parts = _parts(a.strict), _parts(b.strict)
        if len(db_parts) == len(orig_parts) and all(_ends_with_value(o, d) or o == d for d, o in zip(db_parts, orig_parts)):
            return "same", source + " · 원본 정답이 풀이 꼴(끝의 값)"
        if source == "solution-last" and len(db_parts) == len(orig_parts) and all(
            _ends_with_value(d, o) or d == o for d, o in zip(db_parts, orig_parts)
        ):
            return "notation", source + " · 원본은 끝의 값만 뽑았다(DB 정답이 더 온전)"
        if _label_fold(a.strict) == _label_fold(b.strict):
            return "notation", source + " · 소문항 표지"
        common = _labelled(a.strict), _labelled(b.strict)
        shared = set(common[0]) & set(common[1])
        if shared and set(common[1]) <= set(common[0]) and all(
            _ends_with_value(common[1][k], common[0][k]) or common[1][k] == common[0][k] for k in shared
        ):
            # 원본 정답 칸이 소문항 일부만 담았다(«⑵ … ⑶ …» — ⑴ 이 앞 칸에 갈렸다). 나머지는 견줄 원본이 없다
            if set(common[0]) == shared:
                return "same", source
            return "partial", source + f" · 원본 정답 칸이 소문항 일부뿐(겹친 {len(shared)}개는 같음)"
        if a.strict.endswith("=" + b.strict) and re.fullmatch(r"[A-Za-zˍ0-9]+", a.strict[: -len(b.strict) - 1]):
            return "notation", source + " · DB 정답에 «a_n =» 같은 이름이 붙었다"
        if _terms(a.strict) == _terms(b.strict) and len(_terms(a.strict)) >= 2:
            return "notation", source + " · 항의 차례만 다르다"
        if a.numbers and a.numbers == b.numbers and a.letters == b.letters and meaning(a.strict) == meaning(b.strict):
            return "notation", source + " · 같은 수 · 같은 기호 · 다른 말"
        if not a.numbers and len(a.strict) >= 4 and fuzz.partial_ratio(a.strict, b.strict) >= 92 and meaning(a.strict) in meaning(b.strict):
            return "notation", source + " · 글 답이 원본 풀이 꼴 안에"
        return "different", source
    if solution and a.strict and a.strict in solution and _ends_with_value(solution, a.strict):
        return "in-solution", (source + " · " if source else "") + "원본 정답 칸은 없고 풀이 끝의 값과 같다"
    if file_summary.get("answerIsPicture"):
        return "picture", "원본 정답 칸이 그림이다"
    return "none", source or "원본 정답 없음"


def answer_evidence(db_answer: str, orig: dict) -> str:
    """«정답 다름»의 근거 셋(Codex 1회차) — `final`(원본 풀이 끝의 값과 소문항마다 같다) · `string`(풀이에 글자만 있다) · `none`."""
    a = skeleton(db_answer, source="latex").strict
    solution = skeleton(orig.get("solution") or "", source="hwp").strict
    if not a or not solution:
        return "none"
    db_parts, sol_parts = _labelled(a), _labelled(solution)
    if db_parts and set(db_parts) <= set(sol_parts) and all(_ends_with_value(sol_parts[k], v) for k, v in db_parts.items()):
        return "final"
    if not db_parts and _ends_with_value(solution, a):
        return "final"
    return "string" if a in solution else "none"


class Verifier:
    """원장 한 줄을 만드는 판정 한 곳 — `verify.py` 의 전수와 `calibrate.py` 의 대조군이 같은 길을 탄다(Codex 1회차)."""

    def __init__(self, dump: str | Path, orig_dir: str | Path) -> None:
        self.orig_dir = Path(orig_dir)
        self.db_rows = [json.loads(line) for line in open(dump, encoding="utf-8") if line.strip()]
        self.originals: dict[str, dict] = {}
        self.by_file: dict[str, list[dict]] = collections.defaultdict(list)
        for line in open(self.orig_dir / "problems.jsonl", encoding="utf-8"):
            row = json.loads(line)
            self.originals[row["id"]] = row
            self.by_file[row["key"]].append(row)
        self.files = {json.loads(line)["key"]: json.loads(line) for line in open(self.orig_dir / "files.jsonl", encoding="utf-8")}
        self.edits = recorded_edits()
        self.db_by_id = {row["externalId"]: row for row in self.db_rows}
        self.db_by_file: dict[str, list[dict]] = collections.defaultdict(list)
        for row in self.db_rows:
            self.db_by_file[row["sourceFile"]].append(row)
        self.skeletons = {row["externalId"]: skeleton(row["content"], source="latex").strict for row in self.db_rows}
        self.indexes: dict[str, FileIndex | None] = {}
        self.title_cache: dict[str, str] = {}
        # 과목마다의 차시 · 교과서 단원 · 자료 제목 — 머리의 «출제 범위: 1-1 유리수의 소수 표현 ~ 3-3 일차부등식» 같은 줄의 근거
        names: dict[str, set[str]] = collections.defaultdict(set)
        for row in self.db_rows:
            names[row["grade"]].update(filter(None, (row.get("chapter"), row.get("section"), row.get("unitRaw"))))
        self.grade_titles = {grade: "".join(skeleton(n, source="hwp").strict for n in sorted(found)) for grade, found in names.items()}

    def index_of(self, key: str) -> FileIndex | None:
        if key not in self.indexes:
            path = self.orig_dir / "paras" / f"{key}.jsonl"
            self.indexes[key] = FileIndex([json.loads(l) for l in open(path, encoding="utf-8")]) if path.exists() else None
        return self.indexes[key]

    def titles_of(self, row: dict, summary: dict) -> str:
        """이 파일의 머리글 · 되풀이 문단 · 파일 이름 + 이 파일 DB 문항의 차시 · 교과서 단원 이름 · 자료 제목(뼈대)."""
        key = row["sourceFile"]
        if key not in self.title_cache:
            names = list(summary.get("titles", []))
            for other in self.db_by_file[key]:
                names.extend(filter(None, (other.get("chapter"), other.get("section"), other.get("unitRaw"), other.get("materialTitle"))))
            # 과목 전체의 차시 이름은 넣지 않는다 — 문항 속 낱말(«겉넓이» · «절댓값»)까지 «제목»으로 읽었다(눈금 맞추기 2회차)
            self.title_cache[key] = "".join(skeleton(name, source="hwp").strict for name in dict.fromkeys(names))
        return self.title_cache[key]

    def neighbours_of(self, row: dict) -> tuple[str, ...]:
        """같은 묶음에서 번호가 둘 안쪽으로 이웃한 DB 문항의 뼈대(Codex 1회차: 같은 파일 아무 문항이 아니다)."""
        key, section, number = row["externalId"].rsplit("-", 2)
        out = []
        for step in (-2, -1, 1, 2):
            other = f"{key}-{section}-{int(number) + step}"
            if other in self.skeletons:
                out.append(self.skeletons[other])
        return tuple(out)

    def judge(self, row: dict, *, content: str | None = None, answer: str | None = None, orig: dict | None = None) -> dict:
        """문항 하나의 원장 줄. `content` · `answer` · `orig` 를 주면 그것으로 바꿔 판정한다(눈금 맞추기의 대조군)."""
        content = row["content"] if content is None else content
        db_answer = row["answer"] if answer is None else answer
        key = row["materialKey"].removeprefix("tb-")
        summary = self.files.get(key, {})
        orig = self.originals.get(row["externalId"]) if orig is None else orig
        record = {
            "problemCode": row["problemCode"],
            "externalId": row["externalId"],
            "sourceFile": row["sourceFile"],
            "bookKey": row["bookKey"],
            "grade": row["grade"],
            "materialKind": row["materialKind"],
            "directUseAllowed": row["directUseAllowed"],
            "hasFigures": bool(row["figureUrls"]),
            "recordedEdit": self.edits.get(row["problemCode"]),
        }
        if summary.get("error") or orig is None:
            record.update(body="missing", bodyReasons=[summary.get("error") or "같은 열쇠의 원본 문항이 없다"])
            return record
        index = self.index_of(key)
        db_skeleton = skeleton(content, source="latex")
        # 자리 — 이관의 가르기와 따로 찾는다(판정에는 «가까운 표 칸»의 범위로만 쓴다)
        found = None
        if index is not None:
            lines = [skeleton(line, source="latex").strict.replace(FIGURE, "") for line in content.split("\n")]
            found = index.locate(lines)
        located_para = found["para"] if found and found.get("score", 0) >= LOCATE_MIN else None
        _key, section, number = row["externalId"].rsplit("-", 2)
        following = f"{_key}-{section}-{int(number) + 1}"
        next_missing = following not in self.originals and (
            following in self.skeletons or f"{_key}-{section}-{int(number) + 2}" in self.originals
        )
        bold_lines = tuple(
            skeleton(line, source="hwp").strict for line in (orig.get("content") or "").split("\n") if re.search(r"(?i)\bbold", line)
        )
        previous = self.originals.get(f"{_key}-{section}-{int(number) - 1}")
        context = Context(
            db_has_figures=bool(row["figureUrls"]),
            titles=self.titles_of(row, summary),
            boxes=index.boxes_near(located_para) if index else "",
            neighbors=self.neighbours_of(row),
            bold_lines=bold_lines,
            next_missing=next_missing,
            prev_tail=skeleton(previous["content"], source="hwp").strict[-2:] if previous else "",
            stream=index.stream if index else "",
            figures_placed=len(re.findall(r"\[그림(?::\d+)?\]", content)) == len(row["figureUrls"]),
        )
        orig_text = orig["contentFig"] if (orig.get("contentFig") and row["figureUrls"]) else orig["content"]
        orig_skeleton = skeleton(orig_text, source="hwp")
        result = compare(db_skeleton, orig_skeleton, context)
        record.update(
            body=result.verdict,
            bodyReasons=result.reasons,
            similarity=round(result.similarity, 4),
            # 판정은 모든 자리로 한다 — 원장에는 표기 · 그림 표지를 뺀 앞의 12개만 남긴다(보기용)
            opcodes=[op.as_list() for op in result.opcodes if not op.why.startswith(("표기", "그림 표지"))][:12],
        )
        # 같은 파일의 다른 원본 문항과 더 잘 맞나 — 본문이 다른 번호의 것인 문항(§4 의 결함)
        if result.verdict == "different":
            best = max(
                ((other["id"], fuzz.ratio(db_skeleton.strict, skeleton(other["content"], source="hwp").strict) / 100)
                 for other in self.by_file.get(key, []) if other["id"] != row["externalId"]),
                key=lambda item: item[1],
                default=(None, 0.0),
            )
            if best[0] and best[1] >= result.similarity + OTHER_BETTER:
                record["otherMatch"] = {"id": best[0], "similarity": round(best[1], 4)}
        if found is None or found.get("score", 0) < LOCATE_MIN or found.get("para") is None:
            record.update(located=found, positionAgrees=None)
        elif found["how"] == "stem":
            record.update(located=found, positionAgrees=any(a <= row["questionNumber"] <= b for a, b in found["ranges"]))
        else:
            number_found, glyph = index.number_before(found["para"])
            found.update(number=number_found, glyph=glyph)
            record.update(located=found, positionAgrees=None if number_found is None or glyph else number_found == row["questionNumber"])
        verdict, why = answer_verdict(db_answer, orig, summary)
        if verdict == "different":
            evidence = answer_evidence(db_answer, orig)
            record["answerEvidence"] = evidence
            if evidence == "final":
                verdict, why = "same", why + " · 원본 풀이 끝의 값과 소문항마다 같다"
        record.update(answer=verdict, answerSource=why, originalAnswer=orig.get("answer"))
        # 표를 줄로 풀어 쓴 보기 — 보기마다 수 · 문자 · 뜻 기호가 맞고 더 붙은 낱말이 표 칸의 머리뿐이면 «표기»
        # (정답도 같아야 한다 — 보기의 값이 자리를 바꾼 문항은 정답이 갈린다)
        if record["body"] == "different" and verdict in ("same", "notation") and "otherMatch" not in record:
            if restructured(db_skeleton.strict, orig_skeleton.strict, context.boxes):
                record.update(body="notation", bodyReasons=sorted(set(record["bodyReasons"]) | {"표기: 표를 줄로 풀어 씀"}))
        flags = display_flags(content)
        if flags:
            record["displayFlags"] = flags
        return record


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("dump")
    parser.add_argument("orig")
    parser.add_argument("ledger")
    parser.add_argument("--only", default="")
    args = parser.parse_args()
    verifier = Verifier(args.dump, args.orig)
    rows = [row for row in verifier.db_rows if args.only in row["externalId"]] if args.only else verifier.db_rows
    tally = collections.Counter()
    with open(args.ledger, "w", encoding="utf-8") as out:
        for row in rows:
            record = verifier.judge(row)
            tally[(record["body"], record.get("answer"))] += 1
            out.write(json.dumps(record, ensure_ascii=False) + "\n")
    for (body, answer), n in sorted(tally.items(), key=lambda item: -item[1]):
        print(f"{body:10s} {str(answer):12s} {n}")


if __name__ == "__main__":
    main()
