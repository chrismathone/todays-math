"""내 모듈에서 **역슬래시가 한 겹 사라진 LaTeX** 를 찾는다.

## 왜 조용한 결함인가

TS 템플릿 리터럴에서 `\d` 는 «모르는 이스케이프»라 자바스크립트가 **역슬래시를
그냥 버린다** — `\dfrac{1}{2}` 가 `dfrac{1}{2}` 가 되어 지면에 날 글자로 나간다.
`\t` 는 더 나쁘다: **탭 문자**가 되어 `\times` 가 «탭 + imes» 가 된다.

에러가 안 난다. tsc 초록 · vitest 초록 · KaTeX 초록(유효한 글자다) · 값 검산 초록
(검산은 `facts` 만 본다). CLAUDE.md 2026-08-16 「KaTeX 가 초록이라고 지면이 멀쩡한
게 아니다」와 정확히 같은 자리다.

원인은 셸 heredoc 이다 — 거치면서 `\\` 가 `\` 로 줄었다. 이 저장소가 여러 번
데인 자리라 「역슬래시가 든 코드는 Edit/Write 도구로」가 규칙이다.

쓰기:  python scratch/scan-lost-backslash.py [--fix]
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

MINE = [
    "m2Func",
    "m2Center",
    "m2IneqApply",
    "m1Geo1",
    "m1Geo2",
    "m1Calc",
    "m2Counting",
    "m3Func",
]

# 손 목록이 아니라 **모양**으로 센다 — 「역슬래시 하나 + 영문 두 글자 이상」.
# 목록을 손으로 적으면 목록에 없는 명령은 구조적으로 0이 된다(2026-08-18).
LONE = re.compile(r"(?<!\\)\\([A-Za-z]{2,})")

# 자바스크립트가 실제로 아는 이스케이프는 남겨 둔다(이건 우리가 쓴 것이 맞다).
KNOWN_JS = {"n"}


# ⚠️ **주석은 세면 안 된다.** 이 저장소의 주석은 「$\dfrac{4}{2}$ 로 끝나면」처럼
#    LaTeX 를 **한 겹**으로 적어 설명한다 — 그게 옳다. 처음에 71건이 나왔는데
#    그중 52건이 주석이었다. 그대로 «고쳤»으면 멀쩡한 문서를 망가뜨렸을 것이다
#    (2026-08-18 「반증하려고 넓힌 모집단을 처리 대상으로 물려받았다」와 같은 자리).
COMMENT = re.compile(r"^\s*(?://|\*|/\*)")


def scan(text: str) -> list[tuple[int, str]]:
    out: list[tuple[int, str]] = []
    for i, line in enumerate(text.splitlines(), 1):
        if COMMENT.match(line):
            continue
        # 줄 안의 `//` 뒤쪽(줄끝 주석)도 잘라 낸다.
        code = line.split("//")[0] if "//" in line and "://" not in line else line
        for m in LONE.finditer(code):
            word = m.group(1)
            if word in KNOWN_JS:
                continue
            out.append((i, m.group(0)))
    return out


def main() -> int:
    fix = "--fix" in sys.argv
    total = 0
    for name in MINE:
        p = Path(f"src/lib/middle/{name}.ts")
        s = p.read_text("utf-8")
        hits = scan(s)
        total += len(hits)
        if hits:
            print(f"\n== {name}.ts — {len(hits)}건")
            for ln, tok in hits[:6]:
                print(f"   {ln}: {tok}")
            if len(hits) > 6:
                print(f"   … 그 밖 {len(hits) - 6}건")
        if fix and hits:
            # 역슬래시 하나 + 영문 두 글자 이상 → 역슬래시 둘로 되돌린다.
            # **주석 줄은 건너뛴다** — 세는 쪽과 고치는 쪽이 같은 규칙을 써야 한다.
            out_lines: list[str] = []
            for line in s.splitlines():
                if COMMENT.match(line):
                    out_lines.append(line)
                    continue
                out_lines.append(
                    LONE.sub(
                        lambda m: (
                            m.group(0)
                            if m.group(1) in KNOWN_JS
                            else "\\\\" + m.group(1)
                        ),
                        line,
                    )
                )
            p.write_text("\n".join(out_lines) + "\n", encoding="utf-8", newline="")
    print(f"\n합계 {total}건" + (" — 고쳤다" if fix else ""))
    return 1 if total and not fix else 0


if __name__ == "__main__":
    sys.exit(main())
