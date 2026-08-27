"""m2Prob 01A~05A 가드 변이 시험.

3단계로 판정한다(CLAUDE.md 2026-08-21):
  (1) 파일이 바뀌었나  (2) 산출물이 바뀌었나  (3) 그제서야 시험이 빨개지나
(2) 를 건너뛰면 멀쩡한 가드를 의심하고 고치러 간다.
"""

import io
import subprocess
import sys

SRC = "src/lib/middle/m2Prob.ts"
DUMP = ["npx", "tsx", "scratch/_dump5.ts", "--wide"]
TEST = [
    "npx",
    "vitest",
    "run",
    "src/__tests__/unit/midTypesA.test.ts",
    "--reporter=json",
]

MUTATIONS = [
    (
        "04A: drop inclusion-exclusion term",
        "const favorable = countA + countB - countBoth;",
        "const favorable = countA + countB;",
    ),
    (
        "01A: print raw fraction twice instead of reduceTex",
        "$${reduceTex(favorable, total)}$",
        "$\\\\dfrac{${favorable}}{${total}}=${fracTex(p)}$",
    ),
    (
        "05A: answer one too many",
        "answer: `$${added}$개`,",
        "answer: `$${added + 1}$개`,",
    ),
    (
        "03A: count one fewer card",
        "const favorable = largest - threshold + 1;",
        "const favorable = largest - threshold;",
    ),
    (
        "02A: numerator is the red balls",
        "const p = red(blueCount, redCount + blueCount);",
        "const p = red(redCount, redCount + blueCount);",
    ),
    (
        "04A: allow b to be a multiple of a",
        "if (b % a === 0) return null;",
        "if (false) return null;",
    ),
    (
        "06A: multiply instead of add",
        "const ans = addF(P, Q);",
        "const ans = mulF(P, Q);",
    ),
    (
        "06A: allow the two probabilities to sum past 1",
        "if (P.n * Q.d + Q.n * P.d >= P.d * Q.d) return null;",
        "if (false) return null;",
    ),
    (
        "07A: forget the coin factor",
        "const p = red(c.count, 12);",
        "const p = red(c.count, 6);",
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


orig = read(SRC)

# 음성 대조 — 변이 전에 초록이 아니면 이 도구는 도장이다.
base_dump = run(DUMP)
base_test = run(TEST)
if base_dump.returncode != 0 or base_test.returncode != 0:
    print("ABORT: baseline is not green (dump=%d test=%d)" % (base_dump.returncode, base_test.returncode))
    print(base_test.stderr[-2000:])
    sys.exit(2)
print("baseline GREEN")

failures = []
try:
    for why, before, after in MUTATIONS:
        if before not in orig:
            print("ABORT: anchor not found -> %s" % why)
            failures.append(why)
            continue
        write(SRC, orig.replace(before, after, 1))
        if read(SRC) == orig:
            print("SKIP (file unchanged) %s" % why)
            failures.append(why)
            continue
        dump = run(DUMP)
        if dump.returncode != 0:
            output_changed = True  # 생성기가 아예 죽었다 = 산출물이 바뀐 것
        else:
            output_changed = dump.stdout != base_dump.stdout
        if not output_changed:
            print("SKIP (output unchanged) %s" % why)
            failures.append(why)
            continue
        res = run(TEST)
        verdict = "RED" if res.returncode != 0 else "GREEN <- NOT A GUARD"
        print("%s | %s" % (verdict, why))
        if res.returncode == 0:
            failures.append(why)
finally:
    write(SRC, orig)
    print("restored: %s" % (read(SRC) == orig))

print("weak mutations: %d / %d" % (len(failures), len(MUTATIONS)))
sys.exit(1 if failures else 0)
