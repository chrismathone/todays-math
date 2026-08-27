"""갈래 A 가 새로 세운 유형들의 **값 가드** 변이 시험.

3단계로 판정한다(CLAUDE.md 2026-08-21):
  (1) 파일이 바뀌었나  (2) 산출물이 바뀌었나  (3) 그제서야 시험이 빨개지나
(2) 는 가드와 **다른 도구**(`_dumpAll.ts`)로 잰다.

쓰기:
  python scratch/_mutateForms.py             # 전량
  python scratch/_mutateForms.py --only 대푯값  # 이름에 그 말이 든 것만
"""

import io
import subprocess
import sys

# 콘솔이 cp949 라 한글·— 를 못 찍고 죽는다. 판정을 못 보면 이 도구는 쓸모가 없다.
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DUMP = ["npx", "tsx", "scratch/_dumpAll.ts"]
TEST = [
    "npx",
    "vitest",
    "run",
    "src/__tests__/unit/midTypesA.test.ts",
    "--reporter=json",
]

Q = "src/lib/middle/m2Quad.ts"
B2 = "src/lib/middle/m1Book2.ts"
SA = "src/lib/middle/m2SystemApply.ts"
M3 = "src/lib/middle/m3.ts"
EX = "src/lib/middle/m1Extra.ts"

# (설명, 파일, 찾을 것, 바꿀 것)
MUTATIONS = [
    (
        "평행사변형 20A: 이웃각을 대각으로",
        Q,
        "      const a = intBetween(rng, 35, 145);\n      const b = 180 - a;",
        "      const a = intBetween(rng, 35, 145);\n      const b = a;",
    ),
    (
        "평행사변형 20A: 둘레를 두 배 안 한다",
        Q,
        "    const peri = 2 * (m + n);",
        "    const peri = m + n;",
    ),
    (
        "평행사변형 20A: 갈래를 하나로 고정",
        Q,
        'def("20A", "평행사변형의 대각과 대변", SEC.성질, "연산", (rng): Body => {\n    const mode = intBetween(rng, 0, 1);',
        'def("20A", "평행사변형의 대각과 대변", SEC.성질, "연산", (rng): Body => {\n    const mode = intBetween(rng, 0, 0);',
    ),
    (
        "대푯값 07A: 평균을 개수로 안 나눈다",
        B2,
        "      const M = sum / 4;",
        "      const M = sum;",
    ),
    (
        "대푯값 08A: 최빈값이 하나뿐인 자료",
        B2,
        "      const vals = shuffle(rng, [m1, m1, m2, m2, s1, s2]);",
        "      const vals = shuffle(rng, [m1, m1, m2, s1, s2, m2 + 100]);",
    ),
    (
        "대푯값 09A: 합한 평균을 두 평균의 평균으로",
        B2,
        "          answer: `$${total / (boys + girls)}$점`,",
        "          answer: `$${(boyAvg + girlAvg) / 2}$점`,",
    ),
    (
        "대푯값 10A: 중앙값을 가운데가 아닌 값으로",
        B2,
        "      const median = sorted[3]!;",
        "      const median = sorted[2]!;",
    ),
    (
        "대푯값 10A: 최빈값이 둘이 되게",
        B2,
        "      const vals = shuffle(rng, [mode, mode, mode, a, b, c, d]);",
        "      const vals = shuffle(rng, [mode, mode, mode, a, a, a, d]);",
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


only = None
if "--only" in sys.argv:
    only = sys.argv[sys.argv.index("--only") + 1]
todo = [m for m in MUTATIONS if only is None or only in m[0]]
if not todo:
    print("고를 변이가 없다")
    sys.exit(2)

originals = {}
for _why, path, _a, _b in todo:
    originals.setdefault(path, read(path))

# 미커밋 대상이 있으면 멈춘다 — 이 스크립트는 대상 파일을 덮어쓴다(2026-08-23 교훈).
dirty = run(["git", "status", "--porcelain", "--"] + list(originals.keys())).stdout.strip()
if dirty:
    print("WARN: uncommitted changes in target files")
    print(dirty)
    print("(원본은 메모리에 담아 두고 finally 에서 되돌린다)")

base_dump = run(DUMP)
base_test = run(TEST)
if base_dump.returncode != 0 or base_test.returncode != 0:
    print("ABORT: baseline not green (dump=%d test=%d)" % (base_dump.returncode, base_test.returncode))
    print(base_test.stderr[-2000:])
    sys.exit(2)
print("baseline GREEN")

failures = []
try:
    for why, path, before, after in todo:
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

print("weak mutations: %d / %d" % (len(failures), len(todo)))
sys.exit(1 if failures else 0)
