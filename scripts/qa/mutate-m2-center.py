# -*- coding: utf-8 -*-
"""6D 28유형(외심과 내심 13 + 무게중심 15)의 핵심 공식을 **망가뜨려 본다**.

    python scripts/qa/mutate-m2-center.py [번호 …]

가드는 그래야 가드인 줄 안다 — 「검사가 있다」는 「검사가 무언가를 지킨다」가 아니다.

판정은 **3단**이다(CLAUDE.md 2026-08-21):
  ⑴ 파일이 바뀌었나        — 치환이 실제로 먹었나
  ⑵ **산출물이 바뀌었나**   — `probe-m2-center.ts` 의 지문이 달라졌나
  ⑶ 그제서야 시험이 빨개지나

⑵ 를 건너뛰면 「뜻을 안 바꾸는 변이」가 «초록 ← 가드가 아니다» 로 찍혀
**멀쩡한 가드를 의심하고 고치러 간다** — 가드가 없는 것보다 나쁘다.

## 이 스크립트는 대상 파일을 덮어쓴다
시작할 때 `git status` 로 **미커밋 변경이 없는지 먼저 묻고**, 되돌리기는 git 이 아니라
**시작할 때 읽어 둔 바이트 그대로** 쓴다. 돌아가는 동안 대상 파일을 편집하지 말 것.
"""

from __future__ import annotations

import io
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CENTER = os.path.join(ROOT, "src", "lib", "middle", "m2Center.ts")
TESTS = ["src/__tests__/unit/middleM2Center.test.ts"]

ENV = dict(os.environ, PYTHONIOENCODING="utf-8")

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def run(cmd: list[str]) -> tuple[int, str]:
    p = subprocess.run(
        cmd, cwd=ROOT, env=ENV, stdout=subprocess.PIPE, stderr=subprocess.STDOUT
    )
    return p.returncode, p.stdout.decode("utf-8", errors="replace")


def npx(*args: str) -> tuple[int, str]:
    exe = "npx.cmd" if os.name == "nt" else "npx"
    return run([exe, *args])


# (제목, 찾을 것, 바꿀 것) — 각 변이는 「이 시험이 지키는 공식 하나」를 겨눈다.
MUTATIONS: list[tuple[str, str, str]] = [
    (
        "외심01 — 세 밑각의 합(90) 부호를 뒤집는다",
        "    const x = 90 - angB;",
        "    const x = 90 + angB;",
    ),
    (
        "외심02 — 빗변의 중점을 «절반» 아닌 «전체»로 낸다",
        "    const x = c / 2;",
        "    const x = c;",
    ),
    (
        "외심03 — 둔각 초과분(A-90)을 A-45 로 어긋낸다",
        "    const x = angA - 90;",
        "    const x = angA - 45;",
    ),
    (
        "외심04 — 중심각(2A)을 부분각 합이 아닌 A 자체로 낸다",
        "      const q = 90 - angB;\n      const x = 2 * angA;",
        "      const q = 90 - angB;\n      const x = angA;",
    ),
    (
        "외심05 — 중심각 공식의 배수 2 를 뗀다",
        "        const a = 180 - b - c;\n        return a >= 20 && a < 90 ? { angA: a, angB: b, angC: c } : null;\n      });\n      const x = 2 * angA;",
        "        const a = 180 - b - c;\n        return a >= 20 && a < 90 ? { angA: a, angB: b, angC: c } : null;\n      });\n      const x = angA;",
    ),
    (
        "내심06 — 반각(÷2)을 원각으로 낸다",
        "    const x = angC / 2;",
        "    const x = angC;",
    ),
    (
        "내심07 — 90+A/2 를 90-A/2 로 부호를 뒤집는다",
        "      const x = 90 + angA / 2;",
        "      const x = 90 - angA / 2;",
    ),
    (
        "내심08 — 역산(2m-180)에 상수 10 을 더한다",
        "      const x = angA;",
        "      const x = angA + 10;",
    ),
    (
        "내심09 — 둘레(합)를 차로 바꾼다",
        "    const x = b + c;",
        "    const x = b - c;",
    ),
    (
        "내심10 — 반지름 공식의 부호를 뒤집는다((p+q-h)→(p+q+h))",
        "      const x = (p + q - h) / 2;",
        "      const x = (p + q + h) / 2;",
    ),
    (
        "내심11 — 접선 길이에서 다리 p,q 를 바꿔 쓴다",
        "      const x = q - r;",
        "      const x = p - r;",
    ),
    (
        "내심12 — (B-C)/2 를 (B+C)/2 로 바꾼다",
        "    const x = (b - c) / 2;",
        "    const x = (b + c) / 2;",
    ),
    (
        "외심13 — R+r=(p+q)/2 의 나눗셈 2 를 뗀다",
        "      const [p, q, h] = pick(rng, EVEN_SUM);\n      const x = (p + q) / 2;",
        "      const [p, q, h] = pick(rng, EVEN_SUM);\n      const x = p + q;",
    ),
    (
        "무게중심07 — 사다리꼴 중점연결(÷2)을 뗀다",
        "        return { p: pp, q: qq };\n      });\n      const x = (p + q) / 2;",
        "        return { p: pp, q: qq };\n      });\n      const x = p + q;",
    ),
    (
        "무게중심09 — 무게중심 2:1 비율을 1:1(÷2)로 바꾼다",
        "      const x = (2 * h) / 3;",
        "      const x = h / 2;",
    ),
    (
        "무게중심10 — 닮음비에 쓸 m,n 을 서로 바꾼다",
        "    const x = 2 * j * m;",
        "    const x = 2 * j * n;",
    ),
    (
        "무게중심11 — GD+GE 계수(11)를 10 으로 어긋낸다",
        "      const x = 11 * s;",
        "      const x = 10 * s;",
    ),
    (
        "무게중심15 — 평행사변형 무게중심 3등분(÷3)을 ÷2 로 바꾼다",
        "      const x = d / 3;",
        "      const x = d / 2;",
    ),
]


def main() -> int:
    only = {int(a) for a in sys.argv[1:] if a.isdigit()}

    code, out = run(["git", "status", "--porcelain", "--", CENTER])
    if code != 0 or out.strip():
        print("멈춘다 — 대상 파일에 미커밋 변경이 있다. 이 스크립트는 그 파일을")
        print("덮어쓴다: 먼저 커밋하거나 되돌려라.")
        print(out)
        return 2

    original = io.open(CENTER, "rb").read()

    code, base_out = npx("tsx", "scripts/qa/probe-m2-center.ts")
    if code != 0:
        print("기준 지문을 못 얻었다:\n" + base_out)
        return 2
    baseline = base_out.strip().splitlines()[-1]
    print("기준 지문 " + baseline[:16] + "…")

    code, _ = npx("vitest", "run", *TESTS, "--pool=threads")
    if code != 0:
        print("멈춘다 — **기준 시험이 이미 빨갛다.** 변이 판정이 무의미하다.")
        return 2
    print("기준 시험 초록\n")

    verdicts: list[tuple[str, str]] = []
    try:
        for i, (title, old, new) in enumerate(MUTATIONS, start=1):
            if only and i not in only:
                continue
            text = original.decode("utf-8")
            crlf = "\r\n" in text
            probe_old = old.replace("\n", "\r\n") if crlf else old
            probe_new = new.replace("\n", "\r\n") if crlf else new
            n = text.count(probe_old)
            if n != 1:
                verdicts.append((title, "⚠️  앵커 %d개 — 판정 불가" % n))
                print("[%d] %s\n    ⚠️  앵커가 %d개다." % (i, title, n))
                continue
            io.open(CENTER, "wb").write(
                text.replace(probe_old, probe_new).encode("utf-8")
            )
            if io.open(CENTER, "rb").read() == original:
                verdicts.append((title, "⚠️  파일이 안 바뀜 — 판정 불가"))
                continue
            code, probe_out = npx("tsx", "scripts/qa/probe-m2-center.ts")
            digest = probe_out.strip().splitlines()[-1] if code == 0 else "PROBE-FAIL"
            if digest == baseline:
                verdicts.append((title, "⚠️  산출물이 그대로 — 판정 거부"))
                print("[%d] %s\n    ⚠️  뜻이 안 바뀌었다. 이 변이로는 아무것도 못 잰다." % (i, title))
                io.open(CENTER, "wb").write(original)
                continue
            code, _ = npx("vitest", "run", *TESTS, "--pool=threads")
            mark = "🔴 빨강 ← 가드가 산다" if code != 0 else "🟢 초록 ← 가드가 아니다"
            verdicts.append((title, mark))
            print("[%d] %s\n    %s" % (i, title, mark))
            io.open(CENTER, "wb").write(original)
    finally:
        io.open(CENTER, "wb").write(original)

    print("\n── 판정 ──")
    for title, mark in verdicts:
        print("  %s  %s" % (mark, title))
    bad = [v for v in verdicts if not v[1].startswith("🔴")]
    print("\n%d개 중 빨강 %d개" % (len(verdicts), len(verdicts) - len(bad)))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
