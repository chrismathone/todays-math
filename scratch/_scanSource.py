"""소스에서 «홑 역슬래시» 를 찾는다.

템플릿 문자열 안의 `\overline` 은 JS 가 조용히 `overline` 으로 바꾼다.
LaTeX 명령은 반드시 `\\` 로 적어야 한다. `\n` 만 예외(줄바꿈).
"""

import io
import re
import subprocess
import sys

FILES = [
    "src/lib/middle/m1Extra.ts",
    "src/lib/middle/m2SystemApply.ts",
    "src/lib/middle/m2System.ts",
    "src/lib/middle/m1Book2.ts",
    "src/lib/middle/m2Prob.ts",
    "src/lib/middle/m2Quad.ts",
    "src/lib/middle/m3.ts",
]

# 홑 역슬래시 + 글자/쉼표/퍼센트. `\\` 쌍은 앞뒤로 건너뛴다.
BAD = re.compile(r"(?<!\\)\\([A-Za-z,%])")


def is_ok(ch, line):
    # `\n` 은 진짜 줄바꿈으로 의도한 것이다.
    return ch == "n"


total = 0
for path in FILES:
    text = io.open(path, encoding="utf-8", newline="").read()
    lines = text.split("\n")
    hits = []
    for i, line in enumerate(lines, 1):
        # 주석 줄은 건너뛴다.
        stripped = line.lstrip()
        if stripped.startswith("*") or stripped.startswith("//"):
            continue
        # `\\` 를 지운 뒤 남은 홑 역슬래시를 본다.
        probe = line.replace("\\\\", "\x00")
        found = [m for m in re.finditer(r"\\([A-Za-z,%])", probe) if not is_ok(m.group(1), line)]
        if found:
            hits.append((i, sorted({m.group(1) for m in found})))
    if hits:
        print("=== %s (%d줄) ===" % (path, len(hits)))
        for i, chars in hits:
            blame = subprocess.run(
                ["git", "blame", "-L", "%d,%d" % (i, i), "--porcelain", "--", path],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
            ).stdout.split("\n")[0][:8]
            print("  %5d  %-12s  %s" % (i, blame, " ".join(chars)))
        total += len(hits)
print("")
print("홑 역슬래시 줄 %d" % total)
sys.exit(1 if total else 0)
