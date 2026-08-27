"""날 LaTeX 명령 가드의 변이 시험.

3단계로 판정한다(CLAUDE.md 2026-08-21):
  (1) 파일이 바뀌었나  (2) 산출물이 바뀌었나  (3) 그제서야 시험이 빨개지나
(2) 는 가드와 **다른 도구**(`_dumpAll.ts`)로 잰다.
"""

import io
import subprocess
import sys

DUMP = ["npx", "tsx", "scratch/_dumpAll.ts"]
TEST = [
    "npx",
    "vitest",
    "run",
    "src/__tests__/unit/midTypesA.test.ts",
    "--reporter=json",
]

# (설명, 파일, 찾을 것, 바꿀 것)
MUTATIONS = [
    (
        "overline 을 한 겹으로",
        "src/lib/middle/m2Quad.ts",
        "$\\\\overline{AO}=\\\\overline{CO}$",
        "$\\overline{AO}=\\overline{CO}$",
    ),
    (
        "퍼센트를 한 겹으로",
        "src/lib/middle/m2SystemApply.ts",
        "$${rateA}\\\\%$",
        "$${rateA}\\%$",
    ),
    (
        "times 를 한 겹으로 (탭이 된다)",
        "src/lib/middle/m2System.ts",
        "$${a}\\\\times(${x})",
        "$${a}\\times(${x})",
    ),
    (
        "cases 줄바꿈을 한 겹으로",
        "src/lib/middle/m2System.ts",
        "=${c1}\\\\\\\\${mc(r, \"x\")}",
        "=${c1}\\\\${mc(r, \"x\")}",
    ),
    (
        "mathrm 을 한 겹으로",
        "src/lib/middle/m1Extra.ts",
        "$\\\\mathrm{A}$의 도수가",
        "$\\mathrm{A}$의 도수가",
    ),
    (
        "20A: 이웃각을 대각으로",
        "src/lib/middle/m2Quad.ts",
        "      const a = intBetween(rng, 35, 145);\n      const b = 180 - a;",
        "      const a = intBetween(rng, 35, 145);\n      const b = a;",
    ),
    (
        "20A: 둘레를 두 배 안 한다",
        "src/lib/middle/m2Quad.ts",
        "    const peri = 2 * (m + n);",
        "    const peri = m + n;",
    ),
    (
        "20A: 갈래를 하나로 고정",
        "src/lib/middle/m2Quad.ts",
        'def("20A", "평행사변형의 대각과 대변", SEC.성질, "연산", (rng): Body => {\n    const mode = intBetween(rng, 0, 1);',
        'def("20A", "평행사변형의 대각과 대변", SEC.성질, "연산", (rng): Body => {\n    const mode = intBetween(rng, 0, 0);',
    ),
]


def run(cmd):
    return subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        shell=True,
    )


def read(path):
    return io.open(path, encoding="utf-8", newline="").read()


def write(path, text):
    io.open(path, "w", encoding="utf-8", newline="").write(text)


originals = {}
for _why, path, _a, _b in MUTATIONS:
    originals.setdefault(path, read(path))

# 음성 대조 — 변이 전에 초록이 아니면 이 도구는 도장이다.
base_dump = run(DUMP)
base_test = run(TEST)
if base_dump.returncode != 0 or base_test.returncode != 0:
    print("ABORT: baseline not green (dump=%d test=%d)" % (base_dump.returncode, base_test.returncode))
    print(base_test.stderr[-2000:])
    sys.exit(2)
print("baseline GREEN")

failures = []
try:
    for why, path, before, after in MUTATIONS:
        orig = originals[path]
        if before not in orig:
            print("ABORT: anchor not found -> %s (%s)" % (why, path))
            failures.append(why)
            continue
        write(path, orig.replace(before, after, 1))
        if read(path) == orig:
            print("SKIP (file unchanged) %s" % why)
            failures.append(why)
            write(path, orig)
            continue
        dump = run(DUMP)
        changed = dump.returncode != 0 or dump.stdout != base_dump.stdout
        if not changed:
            print("SKIP (output unchanged) %s" % why)
            failures.append(why)
            write(path, orig)
            continue
        res = run(TEST)
        verdict = "RED" if res.returncode != 0 else "GREEN <- NOT A GUARD"
        print("%s | %s" % (verdict, why))
        if res.returncode == 0:
            failures.append(why)
        write(path, orig)
finally:
    for path, orig in originals.items():
        write(path, orig)
    print("restored: %s" % all(read(p) == o for p, o in originals.items()))

print("weak mutations: %d / %d" % (len(failures), len(MUTATIONS)))
sys.exit(1 if failures else 0)
