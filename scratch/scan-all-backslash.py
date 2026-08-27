"""src/lib/middle 전량에 «역슬래시가 한 겹 사라진 LaTeX» 가 있는지 훑는다.

내 여덟 파일에서 19건이 나왔는데(2026-08-27), 같은 함정을 다른 갈래도 밟았을 수
있다. 반대쪽 모집단에 대 보는 것이다 — 「내 것만 보면 남의 것은 구조적으로 0」.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

LONE = re.compile(r"(?<!\\)\\([A-Za-z]{2,})")
COMMENT = re.compile(r"^\s*(?://|\*|/\*)")
KNOWN_JS = {"n"}

MINE = {
    "m2Func",
    "m2Center",
    "m2IneqApply",
    "m1Geo1",
    "m1Geo2",
    "m1Calc",
    "m2Counting",
    "m3Func",
}


def scan(text: str) -> list[tuple[int, str]]:
    out: list[tuple[int, str]] = []
    for i, line in enumerate(text.splitlines(), 1):
        if COMMENT.match(line):
            continue
        code = line.split("//")[0] if "//" in line and "://" not in line else line
        for m in LONE.finditer(code):
            if m.group(1) not in KNOWN_JS:
                out.append((i, m.group(0)))
    return out


def main() -> int:
    total = 0
    for p in sorted(Path("src/lib/middle").glob("*.ts")):
        hits = scan(p.read_text("utf-8"))
        if not hits:
            continue
        total += len(hits)
        owner = "내 것" if p.stem in MINE else "남의 것"
        print(f"{p.name} ({owner}) — {len(hits)}건")
        for ln, tok in hits[:5]:
            print(f"   {ln}: {tok}")
    print(f"\n합계 {total}건")
    return 0


if __name__ == "__main__":
    sys.exit(main())
