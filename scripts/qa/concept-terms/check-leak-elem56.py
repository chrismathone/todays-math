# -*- coding: utf-8 -*-
"""교재 원문 누출 검사 (트랙 elem56) — 시중 교재 원문은 저장소에 넣지 않는다.

네 권(큐브수학 개념 진도북 5-1·5-2·6-1·6-2) **전 쪽** 글자층에서 공백을 뺀 N자 조각(기본 10자)을 모으고,
검사 대상 글(브랜치 이력의 더한 줄 · 커밋 메시지 · 또는 파일)에 같은 조각이 있으면 누출로 센다.

허용(누출로 세지 않음): 조각이 다음 글 안에 통째로 들어 있을 때 — 차례의 장·소단원 이름, 개념 쪽 소단원 머리글,
판정 파일의 용어 이름·다른 표기, 탐험 카드의 이름·정의(앱 글). 이름은 옮겨도 되고 문장은 안 된다는 경계를 그대로 잰다.

목록을 손으로 쓰지 않는다 — 대조의 «참»은 PDF 글자층이다(18번 점검표 2·4).
이 검사가 무는지는 원문이 들어 있던 옛 커밋 범위에 대 보면 안다(--git 4f13be674..fc0bf2157 → 누출 다수).

실행(저장소 뿌리):
  python scripts/qa/concept-terms/check-leak-elem56.py --scratch <작업 폴더> --cards <카드.json> --git 4f13be674..HEAD
  python scripts/qa/concept-terms/check-leak-elem56.py --scratch <작업 폴더> --cards <카드.json> --files docs/reference/concept-terms
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location("ex", HERE / "extract-terms-elem56.py")
ex = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ex)


def textbook_grams(n: int) -> tuple[set[int], list[str]]:
    grams: set[int] = set()
    allowed: list[str] = []
    for g in ex.GRADES:
        book = ex.load_book(g)
        for ch in book["chapters"]:
            allowed.append(ex.norm(ch["title"]))
            for s in ch["sections"]:
                allowed += [ex.norm(s["title"]), ex.norm(s.get("tocTitle", ""))]
        for pg in book["pages"].values():
            for h in pg["heads"]:
                allowed.append(ex.norm(h["heading"]))
            if pg["concept"]:
                # 개념 쪽의 ⑴⑵ 소제목도 이름이다(«각기둥의 전개도의 특징» 등) — 40자 넘는 줄은 문장으로 본다.
                for ln in pg["lines"]:
                    t = ex.norm(ln["text"])
                    if t[:1] in "⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽" and len(t) <= 40:
                        allowed.append(t[1:])
            stream, _ = ex.page_stream(pg)
            for i in range(len(stream) - n + 1):
                grams.add(hash(stream[i : i + n]))
    return grams, allowed


def target_lines(args: argparse.Namespace) -> list[tuple[str, str]]:
    """(자리, 줄) — 이력이면 더한 줄과 커밋 메시지, 파일이면 줄마다."""
    out: list[tuple[str, str]] = []
    if args.git:
        diff = subprocess.run(["git", "log", "-p", "--format=", args.git], capture_output=True, text=True, encoding="utf-8").stdout
        cur = "?"
        for ln in diff.splitlines():
            if ln.startswith("+++ "):
                cur = ln[6:] if ln.startswith("+++ b/") else ln[4:]
            elif ln.startswith("+") and not ln.startswith("+++"):
                out.append((cur, ln[1:]))
        msgs = subprocess.run(["git", "log", "--format=%H%n%B%n@@END@@", args.git], capture_output=True, text=True, encoding="utf-8").stdout
        for ln in msgs.splitlines():
            out.append(("커밋 메시지", ln))
    for f in args.files or []:
        p = Path(f)
        for path in sorted(p.rglob("*") if p.is_dir() else [p]):
            if path.is_file() and path.suffix in (".json", ".md", ".py", ".ts", ".txt"):
                for ln in path.read_text(encoding="utf-8").splitlines():
                    out.append((str(path), ln))
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--scratch", required=True)
    ap.add_argument("--cards", required=True)
    ap.add_argument("--git", default="")
    ap.add_argument("--files", nargs="*")
    ap.add_argument("-n", type=int, default=10)
    ap.add_argument("--show", type=int, default=30)
    a = ap.parse_args()
    ex.CACHE_DIR = Path(a.scratch) / "elem56-cache"
    n = a.n
    grams, allowed = textbook_grams(n)
    cur = json.loads(ex.CURATION.read_text(encoding="utf-8"))
    for t in cur["terms"]:
        allowed += [ex.norm(x) for x in [t["term"], *t.get("aliases", [])]]
    for u in json.loads(Path(a.cards).read_text(encoding="utf-8")):
        allowed.append(ex.norm(u["title"]))
        for c in u["cards"]:
            allowed += [ex.norm(c["name"]), ex.norm(c["definition"])]
    allowed = [s for s in set(allowed) if len(s) >= 2]
    lines = target_lines(a)

    def is_allowed(w: str) -> bool:
        # 한글이 1자 이하인 조각(수·기호 나열 «10, 100, 1000») 은 문장이 아니다.
        if len(re.findall(r"[가-힣]", w)) <= 1:
            return True
        # 이름 앞뒤에 붙은 번호·기호(«1. 장 이름» · 표 칸의 «5-2 용어» · «⑶ 용어») 는 떼고 본다.
        core = re.sub(r"^[^가-힣]+|[^가-힣]+$", "", w)
        return any(core in al for al in allowed)

    hits = []
    for where, ln in lines:
        spans = []
        for seg in re.split(r"[|\"]", ln):  # 표 칸 · JSON 값 경계를 넘는 조각은 만들지 않는다
            s = ex.norm(seg)
            i = 0
            while i + n <= len(s):
                w = s[i : i + n]
                if hash(w) in grams and not is_allowed(w):
                    j = i + n
                    while j < len(s) and hash(s[j - n + 1 : j + 1]) in grams:
                        j += 1
                    spans.append(s[i:j])
                    i = j
                else:
                    i += 1
        if spans:
            hits.append((where, spans))
    print(f"조각 길이 {n} · 교재 조각 {len(grams):,} · 허용 글 {len(allowed)} · 검사 줄 {len(lines):,} · 누출 줄 {len(hits)}")
    for where, spans in hits[: a.show]:
        # 누출 조각은 앞 12자만 보인다(이 출력도 원문을 퍼뜨리지 않게).
        print(f"  {where}: " + " | ".join(sp[:12] + ("…" if len(sp) > 12 else "") for sp in spans[:3]))
    sys.exit(1 if hits else 0)


if __name__ == "__main__":
    main()
