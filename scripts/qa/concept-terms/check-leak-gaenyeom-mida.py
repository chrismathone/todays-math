# -*- coding: utf-8 -*-
"""교재 원문 누출 검사 (트랙 mida) — 시중 교재 원문은 저장소에 넣지 않는다(원장님 2026-09-28).

개념원리 중학 1-1 · 1-2 · 2-1 **전 쪽** 글자층에서 공백을 뺀 N자 조각(기본 10자)을 모으고, 검사 대상 글
(브랜치 이력의 더한 줄 · 커밋 메시지 · 또는 파일)에 같은 조각이 있으면 누출로 센다.

허용(누출로 세지 않음): 조각이 다음 글 안에 통째로 들어 있을 때 — 대단원·중단원·소단원 이름, 개념 쪽 소주제 제목,
개념 쪽의 ⑴⑵ 굵은 머리(40자 이하), 판정 파일의 용어 이름·다른 표기, 탐험 카드의 이름·정의(앱 글).
이름은 옮겨도 되고 문장은 안 된다는 경계를 그대로 잰다. 한글이 1자 이하인 조각(수·기호 나열)은 문장이 아니다.

목록을 손으로 쓰지 않는다 — 대조의 «참»은 PDF 글자층이다(18번 점검표 2·4). 트랙 elem56 의 같은 검사
(check-leak-elem56.py)와 규칙을 맞췄다. 이 검사가 무는지는 원문이 들어 있던 옛 커밋에 대 보면 안다
(--git 4f13be674..5297d61f2 → 누출 다수).

실행(저장소 뿌리, GAENYEOM_DIR · GAENYEOM_CACHE 는 추출기와 같다):
  python scripts/qa/concept-terms/check-leak-gaenyeom-mida.py --git 4f13be674..HEAD
  python scripts/qa/concept-terms/check-leak-gaenyeom-mida.py --files docs/reference/concept-terms scripts/qa/concept-terms
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import gaenyeom_curation_mida as C  # noqa: E402
import gaenyeom_pages_mida as P  # noqa: E402

spec = importlib.util.spec_from_file_location("ex", HERE / "extract-gaenyeom-terms-mida.py")
EX = importlib.util.module_from_spec(spec)
spec.loader.exec_module(EX)

TOPIC_MARK = "⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽"


def norm(s: str) -> str:
    return "".join(s.split())


def textbook_grams(n: int) -> tuple[set[int], list[str]]:
    grams: set[int] = set()
    allowed: list[str] = []
    for g in EX.GRADES:
        book = P.load_book(g)
        for part in EX.build_toc(book):
            allowed.append(norm(re.sub(r"^[ⅠⅡⅢⅣⅤⅥ]+\.\s*", "", part["part"])))
            for ch in part["chapters"]:
                allowed.append(norm(re.sub(r"^\d\.\s*", "", ch["chapter"])))
                allowed += [norm(re.sub(r"^0\d\s*", "", s["section"])) for s in ch["sections"]]
        for pno, lines in enumerate(book.lines, start=1):
            concept = pno in book.concept
            for ln in lines:
                t = norm(ln.text)
                if concept and (EX.is_topic(ln) or EX.is_heading(ln)):
                    allowed.append(t.lstrip(TOPIC_MARK))
                elif concept and t[:1] in TOPIC_MARK and len(t) <= 40 and not re.search("다[.]?$", t):
                    allowed.append(t[1:])  # «⑴ 소제목»은 이름, «⑷ …이다.»는 문장이라 허용하지 않는다
            stream = norm("".join(ln.text for ln in lines))
            for i in range(len(stream) - n + 1):
                grams.add(hash(stream[i:i + n]))
    return grams, allowed


def target_lines(a: argparse.Namespace) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    if a.git:
        diff = subprocess.run(["git", "log", "-p", "--format=", a.git], capture_output=True, text=True,
                              encoding="utf-8").stdout
        cur = "?"
        for ln in diff.splitlines():
            if ln.startswith("+++ "):
                cur = ln[6:] if ln.startswith("+++ b/") else ln[4:]
            elif ln.startswith("+") and not ln.startswith("+++"):
                out.append((cur, ln[1:]))
        msgs = subprocess.run(["git", "log", "--format=%B", a.git], capture_output=True, text=True,
                              encoding="utf-8").stdout
        out += [("커밋 메시지", ln) for ln in msgs.splitlines()]
    for f in a.files or []:
        p = Path(f)
        for path in sorted(p.rglob("*") if p.is_dir() else [p]):
            if path.is_file() and path.suffix in (".json", ".md", ".py", ".ts", ".txt"):
                out += [(str(path), ln) for ln in path.read_text(encoding="utf-8").splitlines()]
    return out


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--git", default="")
    ap.add_argument("--files", nargs="*")
    ap.add_argument("-n", type=int, default=10)
    ap.add_argument("--show", type=int, default=40)
    a = ap.parse_args()
    n = a.n
    grams, allowed = textbook_grams(n)
    for g in EX.GRADES:
        allowed.append(norm(f"개념원리 중학 수학 {g}"))  # 책 이름
        for t in C.TERMS[g]:
            allowed += [norm(x) for x in (t.term, *t.aliases)]
    cards = EX.load_cards()
    for c in cards:
        allowed += [norm(c["name"]), norm(c["definition"]), norm(c["unitTitle"])]
    allowed = [s for s in set(allowed) if len(s) >= 2]
    lines = target_lines(a)

    def is_allowed(w: str) -> bool:
        if len(re.findall("[가-힣]", w)) <= 1:
            return True
        core = re.sub("^[^가-힣]+|[^가-힣]+$", "", w)
        return any(core in al for al in allowed)

    hits = []
    for where, ln in lines:
        spans = []
        for seg in re.split(r"[|\"«»]", ln):  # 표 칸 · JSON 값 · 인용표 경계를 넘는 조각은 만들지 않는다
            s = norm(seg)
            i = 0
            while i + n <= len(s):
                w = s[i:i + n]
                if hash(w) in grams and not is_allowed(w):
                    j = i + n
                    while j < len(s) and hash(s[j - n + 1:j + 1]) in grams:
                        j += 1
                    spans.append(s[i:j])
                    i = j
                else:
                    i += 1
        if spans:
            hits.append((where, spans))
    print(f"조각 길이 {n} · 교재 조각 {len(grams):,} · 허용 글 {len(allowed)} · 검사 줄 {len(lines):,} · 누출 줄 {len(hits)}")
    show = int(os.environ.get("LEAK_SHOW_FULL", "0"))
    for where, spans in hits[:a.show]:
        # 누출 조각은 앞 12자만 보인다(이 출력도 원문을 퍼뜨리지 않게). LEAK_SHOW_FULL=1 이면 다 보인다(고칠 때만).
        print(f"  {where}: " + " | ".join(sp if show else sp[:12] + ("…" if len(sp) > 12 else "") for sp in spans[:4]))
    sys.exit(1 if hits else 0)


if __name__ == "__main__":
    main()
