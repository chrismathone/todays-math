# -*- coding: utf-8 -*-
"""6B 36유형(작도와 합동 14 + 다각형 22)의 가드를 **망가뜨려 본다**.

    python scripts/qa/mutate-m1-geo2.py [번호 …]

가드는 그래야 가드인 줄 안다 — 「검사가 있다」는 「검사가 무언가를 지킨다」가 아니다.

판정은 **3단**이다(CLAUDE.md 2026-08-21):
  ⑴ 파일이 바뀌었나        — 치환이 실제로 먹었나
  ⑵ **산출물이 바뀌었나**   — `probe-m1-geo2.ts` 의 지문이 달라졌나
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
TARGET = os.path.join(ROOT, "src", "lib", "middle", "m1Geo2.ts")
TESTS = ["src/__tests__/unit/middleM1Geo2.test.ts"]

ENV = dict(os.environ, PYTHONIOENCODING="utf-8")

# 콘솔이 cp949 면 한글·이모지 판정 줄에서 죽는다 — 표본 stdout 은 늘 UTF-8 로.
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


# (제목, 찾을 것, 바꿀 것) — 각 변이는 «이 시험이 지키는 것 하나»를 겨눈다.
MUTATIONS: list[tuple[str, str, str]] = [
    (
        "05(작도) 삼각형 세 변 관계 — 개수를 2b-1 이 아니라 2b+1 로",
        "const ans = 2 * b - 1;",
        "const ans = 2 * b + 1;",
    ),
    (
        "08(합동) 사각형 내각의 합 — 360-p-q-r 을 360-p-q+r 로",
        "const ans = 360 - p - q - r;",
        "const ans = 360 - p - q + r;",
    ),
    (
        "09(다각형) 이등분선 — 삼각형 내각의 합을 360 으로",
        "const A = 180 - B - C;",
        "const A = 360 - B - C;",
    ),
    (
        "09(다각형) 이등분선 — 절반을 안 나눈다",
        "const half = A / 2;",
        "const half = A;",
    ),
    (
        "10(다각형) 두 내각의 이등분선 — 90+A/2 를 90-A/2 로",
        "const ans = 90 + A / 2;",
        "const ans = 90 - A / 2;",
    ),
    (
        "11(다각형) 내각+외각 이등분선 — A/2 를 90-A/2 로",
        "const ans = A / 2;",
        "const ans = 90 - A / 2;",
    ),
    (
        "13(다각형) 리본 모양 — a+b-c 를 a+b+c 로",
        "const d = a + b - c;",
        "const d = a + b + c;",
    ),
    (
        "18(다각형) 활용 — 대각선 개수 공식을 (n-2) 로",
        "const diag = (n * (n - 3)) / 2;",
        "const diag = (n * (n - 2)) / 2;",
    ),
    (
        "21(다각형) 배수 — (n-2)/2 를 (n-1)/2 로",
        "const k = (n - 2) / 2;",
        "const k = (n - 1) / 2;",
    ),
    (
        "22(다각형) 대각선 활용 — n(n-1)/2 를 n(n+1)/2 로",
        "const K = (n * (n - 1)) / 2;",
        "const K = (n * (n + 1)) / 2;",
    ),
    (
        "23(다각형) 두 외각의 이등분선 — 90-A/2 를 90+A/2 로",
        "const ans = 90 - A / 2;",
        "const ans = 90 + A / 2;",
    ),
    (
        "24(다각형) 외각의 성질 활용 — 180-a-b-d 를 180-a-b+d 로",
        "const x = 180 - a - b - d;",
        "const x = 180 - a - b + d;",
    ),
    (
        "04(다각형) 한 꼭짓점 대각선 — n-3 을 n-2 로",
        "const n = intBetween(rng, 5, 12);\n      const v = n - 3;",
        "const n = intBetween(rng, 5, 12);\n      const v = n - 2;",
    ),
    (
        "05(다각형) 대각선 개수 — n(n-3)/2 를 n(n-2)/2 로",
        "const n = intBetween(rng, 5, 12);\n      const d = (n * (n - 3)) / 2;",
        "const n = intBetween(rng, 5, 12);\n      const d = (n * (n - 2)) / 2;",
    ),
    (
        "06(다각형) 대각선→변의 개수 — n(n-3)/2 를 n(n-2)/2 로",
        "const n = intBetween(rng, 4, 15);\n      const d = (n * (n - 3)) / 2;",
        "const n = intBetween(rng, 4, 15);\n      const d = (n * (n - 2)) / 2;",
    ),
    (
        "01(작도) T/F 은행 — 첫 항목의 진실값을 뒤집는다",
        '["작도에서는 눈금 없는 자를 사용하여 두 점을 지나는 직선을 그린다.", true],',
        '["작도에서는 눈금 없는 자를 사용하여 두 점을 지나는 직선을 그린다.", false],',
    ),
    (
        "10(합동) 대응각 표 — B 의 대응을 E 가 아니라 D 로 (라벨이 어긋난다)",
        'const CORR: Record<string, string> = { A: "D", B: "E", C: "F" };',
        'const CORR: Record<string, string> = { A: "E", B: "D", C: "F" };',
    ),
]


def main() -> int:
    only = {int(a) for a in sys.argv[1:] if a.isdigit()}

    code, out = run(["git", "status", "--porcelain", "--", TARGET])
    if code != 0 or out.strip():
        print("멈춘다 — 대상 파일에 미커밋 변경이 있다. 이 스크립트는 그 파일을")
        print("덮어쓴다: 먼저 커밋하거나 되돌려라.")
        print(out)
        return 2

    original = io.open(TARGET, "rb").read()

    code, base_out = npx("tsx", "scripts/qa/probe-m1-geo2.ts")
    if code != 0:
        print("기준 지문을 못 얻었다:\n" + base_out)
        return 2
    baseline = base_out.strip().splitlines()[-1]
    print("기준 지문 " + baseline[:16] + "…")

    # 음성 대조 — **변이를 넣기 전에** 초록인 것을 본다. 이게 없으면 「늘 빨강」인
    # 도장도 「가드가 산다」로 읽힌다(CLAUDE.md 2026-08-23).
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
            # 파일이 CRLF 로 저장돼 있어도 앵커는 LF 로 적는다.
            crlf = "\r\n" in text
            probe_old = old.replace("\n", "\r\n") if crlf else old
            probe_new = new.replace("\n", "\r\n") if crlf else new
            n = text.count(probe_old)
            if n != 1:
                verdicts.append((title, "⚠️  앵커 %d개 — 판정 불가" % n))
                print(
                    "[%d] %s\n    ⚠️  앵커가 %d개다. 포맷이 줄을 합쳤을 수 있다."
                    % (i, title, n)
                )
                continue
            io.open(TARGET, "wb").write(
                text.replace(probe_old, probe_new).encode("utf-8")
            )
            # ⑴ 파일이 바뀌었나
            if io.open(TARGET, "rb").read() == original:
                verdicts.append((title, "⚠️  파일이 안 바뀜 — 판정 불가"))
                continue
            # ⑵ 산출물이 바뀌었나
            code, probe_out = npx("tsx", "scripts/qa/probe-m1-geo2.ts")
            digest = probe_out.strip().splitlines()[-1] if code == 0 else "PROBE-FAIL"
            if digest == baseline:
                verdicts.append((title, "⚠️  산출물이 그대로 — 판정 거부"))
                print(
                    "[%d] %s\n    ⚠️  뜻이 안 바뀌었다. 이 변이로는 아무것도 못 잰다."
                    % (i, title)
                )
                io.open(TARGET, "wb").write(original)
                continue
            # ⑶ 시험이 빨개지나
            code, _ = npx("vitest", "run", *TESTS, "--pool=threads")
            mark = "🔴 빨강 ← 가드가 산다" if code != 0 else "🟢 초록 ← 가드가 아니다"
            verdicts.append((title, mark))
            print("[%d] %s\n    %s" % (i, title, mark))
            io.open(TARGET, "wb").write(original)
    finally:
        io.open(TARGET, "wb").write(original)

    print("\n── 판정 ──")
    for title, mark in verdicts:
        print("  %s  %s" % (mark, title))
    bad = [v for v in verdicts if not v[1].startswith("🔴")]
    print("\n%d개 중 빨강 %d개" % (len(verdicts), len(verdicts) - len(bad)))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
