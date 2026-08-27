"""홑 역슬래시를 `\\\\` 로 고친다 (LaTeX 명령이 지면에서 사라지는 것을 막는다).

`\\n`(줄바꿈)은 그대로 둔다. 주석 줄은 건드리지 않는다.
`--check` 를 주면 고치지 않고 목록만 찍는다.
"""

import io
import re
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

CHECK = "--check" in sys.argv
SHOW = "--show" in sys.argv


def is_comment(line):
    s = line.lstrip()
    return s.startswith("*") or s.startswith("//") or s.startswith("/*")


def code_end(line):
    """줄 끝 `//` 주석이 시작되는 자리 — 백틱 **밖**의 `//` 만 센다.

    `// 0:\\`<\\` 2:\\`\\le\\`` 같은 주석에도 백틱이 있어서, 백틱 안팎만 보고
    자르면 주석 속 `\\le` 를 고쳐 버린다(실측 `m2System.ts:481`).
    """
    inside = False
    i = 0
    while i < len(line):
        if line[i] == "`":
            inside = not inside
        elif not inside and line[i] == "/" and i + 1 < len(line) and line[i + 1] == "/":
            return i
        i += 1
    return len(line)


def fix_line(whole):
    """홑 역슬래시 + (n 이 아닌 글자 / 쉼표 / %) 를 두 겹으로."""
    cut = code_end(whole)
    line, tail = whole[:cut], whole[cut:]
    out = []
    i = 0
    changed = False
    while i < len(line):
        ch = line[i]
        if ch == "\\" and i + 1 < len(line):
            nxt = line[i + 1]
            if nxt == "\\":
                out.append("\\\\")
                i += 2
                continue
            if nxt == "n":
                out.append("\\n")
                i += 2
                continue
            if nxt.isalpha() or nxt in ",%":
                out.append("\\\\" + nxt)
                changed = True
                i += 2
                continue
        out.append(ch)
        i += 1
    return "".join(out) + tail, changed


total = 0
for path in FILES:
    text = io.open(path, encoding="utf-8", newline="").read()
    eol = "\r\n" if "\r\n" in text else "\n"
    lines = text.split(eol)
    hits = []
    for idx, line in enumerate(lines):
        if is_comment(line):
            continue
        fixed, changed = fix_line(line)
        if changed:
            hits.append(idx + 1)
            if SHOW:
                print("  %s:%d" % (path, idx + 1))
                print("    - " + line.strip()[:200])
                print("    + " + fixed.strip()[:200])
            if not CHECK:
                lines[idx] = fixed
    if hits:
        print("%s : %d줄" % (path, len(hits)))
        total += len(hits)
        if not CHECK:
            io.open(path, "w", encoding="utf-8", newline="").write(eol.join(lines))

print("")
print("%s %d줄" % ("고칠 곳" if CHECK else "고쳤다", total))
sys.exit(1 if (CHECK and total) else 0)
