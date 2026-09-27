# -*- coding: utf-8 -*-
"""저장소에 시중 교재 원문이 새지 않았는지 센다 (elem34 · 원장님 2026-09-28 «원문은 저장소 밖»).

원천(= 교재 원문으로 아는 글): 저장소 밖 `I-개념용어/cube-{3-1..4-2}.json` 의 sentence,
`elem34/terms-elem34-text.json` 의 글귀 전부, `elem34/census-elem34.json` 의 후보 문장 전부.
허용(= 저장소에 있어도 되는 말): 용어 · 표기 변형 · 단원/소단원 이름 · 탐험 카드 이름과 정의(우리 제품 글).
원천에서 허용 말을 걷어낸 나머지를 빈칸 없이 12글자 창(한글 4자 이상)으로 잘라 대상에서 찾는다.

사용:
  python check-no-source-text-elem34.py --files             # 작업 트리의 elem34 산출·스크립트
  python check-no-source-text-elem34.py --git main..HEAD    # 그 범위 커밋이 «더한 줄» 전부
  python check-no-source-text-elem34.py --selftest          # 원문 한 문장을 심어 잡히는지(가드가 우는지)
종료 코드 0 = 원문 창 0 개.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

REPO = Path(__file__).resolve().parents[3]
DATA = Path(r"C:\Creative\testautocreator-data\I-개념용어")
BOOKS = ("3-1", "3-2", "4-1", "4-2")
WIN = 12
SEP = chr(0)  # 걷어낸 허용 말 자리 — 창이 이 자리를 넘지 않는다
TARGET_GLOBS = ["docs/reference/concept-terms/cube-[34]-[12]*", "scripts/qa/concept-terms/*elem34*"]


def squash(t: str) -> str:
    return re.sub(r"\s+", "", t)


def sources_and_allowed(data: Path) -> tuple[list[str], set[str]]:
    src: list[str] = []
    allowed: set[str] = set()
    for g in BOOKS:
        d = json.loads((data / f"cube-{g}.json").read_text(encoding="utf-8"))
        for c in d["toc"]:
            allowed.add(c["chapter"].split(". ", 1)[-1])
            allowed.update(c["sections"])
        for t in d["terms"]:
            src.append(t["sentence"])
            allowed.add(t["term"])
            allowed.update(t["aliases"])
            allowed.add(t["section"])
    text = json.loads((data / "elem34" / "terms-elem34-text.json").read_text(encoding="utf-8"))
    for a in text["anchors"].values():
        for k in ("anchor", "sentence"):
            if k in a:
                src.append(a[k])
        src.extend(a.get("anchors", []))
        src.extend(a.get("verify", []))
    src.extend(text["cardNoteQuotes"].values())
    census = json.loads((data / "elem34" / "census-elem34.json").read_text(encoding="utf-8"))
    for rows in census.values():
        for r in rows:
            src.append(r.get("text", ""))
    tsx = REPO / "node_modules" / "tsx" / "dist" / "cli.mjs"
    dump = Path(__file__).resolve().parent / "dump-explorer-cards-elem34.ts"
    cards = json.loads(subprocess.run(["node", str(tsx), str(dump), "3", "4"], cwd=REPO, capture_output=True, check=True).stdout.decode("utf-8"))
    for c in cards["cards"]:
        allowed.add(c["name"])
        allowed.add(c["definition"])
    return src, {a for a in allowed if a and len(squash(a)) >= 2}


def windows(src: list[str], allowed: set[str]) -> set[str]:
    allow_sq = sorted({squash(a) for a in allowed}, key=len, reverse=True)
    out: set[str] = set()
    for s in src:
        s = squash(s)
        for a in allow_sq:
            s = s.replace(a, SEP)
        for part in s.split(SEP):
            for i in range(0, max(0, len(part) - WIN + 1)):
                w = part[i : i + WIN]
                if len(re.findall(r"[가-힣]", w)) >= 4:
                    out.add(w)
    return out


def scan(text: str, wins: set[str], allow_sq: list[str]) -> list[str]:
    """대상 글에서도 허용 말을 가린다 — 탐험 카드 정의(우리 제품 글)가 교과서 표준 문구와 겹쳐도 원문 누출이 아니다."""
    t = squash(text)
    for a in allow_sq:
        t = t.replace(a, SEP)
    hits = []
    for i in range(0, max(0, len(t) - WIN + 1)):
        if t[i : i + WIN] in wins:
            hits.append(t[max(0, i - 8) : i + WIN + 8])
    return hits


def added_lines(rng: str) -> str:
    raw = subprocess.run(["git", "log", "-p", "--no-color", rng], cwd=REPO, capture_output=True, check=True).stdout.decode("utf-8", "replace")
    return "\n".join(l[1:] for l in raw.splitlines() if l.startswith("+") and not l.startswith("+++"))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--files", action="store_true")
    ap.add_argument("--git", default=None)
    ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--data", type=Path, default=DATA)
    args = ap.parse_args()
    src, allowed = sources_and_allowed(args.data)
    wins = windows(src, allowed)
    allow_sq = sorted({squash(a) for a in allowed}, key=len, reverse=True)
    print(f"원천 글 {len(src)} · 허용 말 {len(allowed)} · 원문 창 {len(wins)}")
    total = 0
    if args.selftest:
        planted = "아무 말 " + src[0] + " 아무 말"
        caught = scan(planted, wins, allow_sq)
        clean = scan("저장소에 있어도 되는 우리 말만 있는 줄입니다. 받아올림 · 직각삼각형", wins, allow_sq)
        print(f"selftest: 원문 한 문장을 심으면 {len(caught)} 창이 잡힘 · 깨끗한 줄은 {len(clean)}")
        if not caught or clean:
            raise SystemExit("selftest 실패 — 가드가 울지 않거나 헛짚는다")
    if args.files:
        for pat in TARGET_GLOBS:
            for f in sorted(REPO.glob(pat)):
                if f.suffix in (".pyc",) or f.is_dir():
                    continue
                hits = scan(f.read_text(encoding="utf-8"), wins, allow_sq)
                total += len(hits)
                for h in hits[:5]:
                    print(f"  🔴 {f.relative_to(REPO)}: …{h}…")
    if args.git:
        hits = scan(added_lines(args.git), wins, allow_sq)
        total += len(hits)
        print(f"git {args.git} 더한 줄: 원문 창 {len(hits)}")
        for h in hits[:10]:
            print(f"  🔴 …{h}…")
    print(f"원문 창 합 {total}")
    sys.exit(1 if total else 0)


if __name__ == "__main__":
    main()
