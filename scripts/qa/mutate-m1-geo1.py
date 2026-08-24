# -*- coding: utf-8 -*-
"""6A 31유형(기본 도형 14 + 위치 관계 17)의 가드를 **망가뜨려 본다**.

    python scripts/qa/mutate-m1-geo1.py [번호 …]

가드는 그래야 가드인 줄 안다 — 「검사가 있다」는 「검사가 무언가를 지킨다」가 아니다.

판정은 **3단**이다(CLAUDE.md 2026-08-21·08-23, 물결 6 계약 8):
  ⑴ 파일이 바뀌었나        — 치환이 실제로 먹었나
  ⑵ **산출물이 바뀌었나**   — `probe-m1-geo1.ts` 의 지문이 달라졌나
  ⑶ 그제서야 시험이 빨개지나

⑵ 를 건너뛰면 「뜻을 안 바꾸는 변이」가 «초록 ← 가드가 아니다» 로 찍혀
**멀쩡한 가드를 의심하고 고치러 간다** — 가드가 없는 것보다 나쁘다.

## 이 스크립트는 대상 파일을 덮어쓴다
시작할 때 `git status` 로 **미커밋 변경이 없는지 먼저 묻고**, 되돌리기는 git 이 아니라
**시작할 때 읽어 둔 바이트 그대로** 쓴다(2026-08-23: 복원을 `git show HEAD:` 로 짜서
커밋 안 된 수정을 통째로 덮은 전례가 있다). 돌아가는 동안 대상 파일을 편집하지 말 것.
"""

from __future__ import annotations

import io
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TARGET = os.path.join(ROOT, "src", "lib", "middle", "m1Geo1.ts")
TESTS = ["src/__tests__/unit/middleM1Geo1.test.ts"]

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


# (제목, 찾을 것, 바꿀 것) — 각 변이는 «이 시험이 지키는 것 하나»를 겨눈다.
MUTATIONS: list[tuple[str, str, str]] = [
    (
        "01 각뿔의 꼭짓점 개수를 «2n» 으로 (각뿔은 n+1 이다)",
        "function vertsOf01(n: number, fam: number): number {\n"
        "  return fam === 1 ? n + 1 : 2 * n;\n}",
        "function vertsOf01(n: number, fam: number): number {\n  return 2 * n;\n}",
    ),
    (
        "01 각뿔의 모서리 개수를 «3n» 으로 (각뿔은 2n 이다)",
        "function edgesOf01(n: number, fam: number): number {\n"
        "  return fam === 1 ? 2 * n : 3 * n;\n}",
        "function edgesOf01(n: number, fam: number): number {\n  return 3 * n;\n}",
    ),
    (
        "02 반직선 판정에서 방향(부호)을 안 본다 — 시작점만 같으면 같다고 한다",
        "        const d1 = Math.sign(posOf(q1) - posOf(p1));\n"
        "        const d2 = Math.sign(posOf(q2) - posOf(p2));\n"
        "        return p1 === p2 && d1 === d2;",
        "        return p1 === p2;",
    ),
    (
        "03 일반 위치 n 점의 반직선 개수를 조합(직선과 같은 수)으로",
        "        const lines = (n * (n - 1)) / 2;\n        const rays = n * (n - 1);",
        "        const lines = (n * (n - 1)) / 2;\n        const rays = (n * (n - 1)) / 2;",
    ),
    (
        "04 한 직선 위 n 점의 반직선 개수를 «n-1» 로 (실제는 2(n-1))",
        "        const rays = 2 * (n - 1);",
        "        const rays = n - 1;",
    ),
    (
        "05 선분의 중점 연쇄에서 AN = (1/2)AB 로 (실제는 (3/4)AB)",
        "        const an = (3 * ab) / 4;",
        "        const an = ab / 2;",
    ),
    (
        "06 두 점 사이의 거리에서 MN = AB+BC 로 (실제는 그 절반)",
        "        const mn = (ab + bc) / 2;",
        "        const mn = ab + bc;",
    ),
    (
        "07 평각/직각 판정에서 세 번째 각(c)을 빠뜨린다",
        "        const b = total - c - a * x;",
        "        const b = total - a * x;",
    ),
    (
        "08 각의 조건에서 항의 개수를 하나 빠뜨린다((2+k) → (1+k))",
        "        const total = (2 + k) * p;",
        "        const total = (1 + k) * p;",
    ),
    (
        "09 각의 비에서 180 대신 360 을 쓴다",
        "        const ans = (180 * r) / sum;",
        "        const ans = (360 * r) / sum;",
    ),
    (
        "10 맞꼭지각 등식에서 부호를 뒤집는다(더하기를 빼기로)",
        "      const val = a * x + p;\n"
        "      const q = val - b2 * x;\n"
        "      if (q < 0 || q > 170 || val <= 0 || val >= 180) return null;",
        "      const val = a * x + p;\n"
        "      const q = val + b2 * x;\n"
        "      if (q < 0 || q > 170 || val <= 0 || val >= 180) return null;",
    ),
    (
        "12 맞꼭지각 쌍의 개수를 n(n-1) 대신 n(n-1)/2 로",
        "    const ans = n * (n - 1);\n    return {",
        "    const ans = (n * (n - 1)) / 2;\n    return {",
    ),
    (
        "13 «점 A 와 직선 사이의 거리는 AH 보다 항상 짧다» 를 참으로 뒤집는다",
        "          [\n"
        "            `점 $A$와 직선 $l$ 사이의 거리는 $\\\\overline{AH}$의 길이보다 항상 짧다.`,\n"
        "            false,\n"
        "          ],",
        "          [\n"
        "            `점 $A$와 직선 $l$ 사이의 거리는 $\\\\overline{AH}$의 길이보다 항상 짧다.`,\n"
        "            true,\n"
        "          ],",
    ),
    (
        "14 시계 시침의 분당 각속도를 1° 로 (실제는 0.5°)",
        "      const hourDeg = 30 * h + 0.5 * m;",
        "      const hourDeg = 30 * h + 1 * m;",
    ),
    (
        "위치01 부정문(neg) 처리를 뒤집는다 — «있지 않다» 가 «있다» 와 같은 판정이 된다",
        "          const claim = neg ? !isOn : isOn;",
        "          const claim = isOn;",
    ),
    (
        "위치02 정n각형에서 짝수/홀수 평행 판정을 뒤집는다",
        "      const b = even ? 1 : 0;\n      const a = n - 1 - b;",
        "      const b = even ? 0 : 1;\n      const a = n - 1 - b;",
    ),
    (
        "위치03 «꼬인 위치에 있는 두 직선은 하나의 평면을 정한다» 를 참으로",
        '  ["꼬인 위치에 있는 두 직선은 하나의 평면을 정한다.", false],',
        '  ["꼬인 위치에 있는 두 직선은 하나의 평면을 정한다.", true],',
    ),
    (
        "위치04 사면체 꼬인 위치를 «반대» 대신 «인접(공유 꼭짓점)» 모서리로",
        "function tetraOpposite(x: string, y: string): [string, string] {\n"
        "  const rest = TETRA_LETTERS.filter((l) => l !== x && l !== y);\n"
        "  return [rest[0]!, rest[1]!];\n}",
        "function tetraOpposite(x: string, y: string): [string, string] {\n"
        "  const rest = TETRA_LETTERS.filter((l) => l !== y);\n"
        "  return [rest[0]!, rest[1]!];\n}",
    ),
    (
        "위치05 삼각기둥에서 수직 판정 조건을 하나 빠뜨린다(같은 인덱스만 인정)",
        '  return vert.i === tri.i || vert.i === (tri.i + 1) % 3 ? "perp" : "skew";',
        '  return vert.i === tri.i ? "perp" : "skew";',
    ),
    (
        "위치09 잘라낸 입체에서 «축이 같다」 판정을 늘 참으로",
        '    return edgeAxis(e1) === edgeAxis(e2) ? "parallel" : "skew";',
        '    return "parallel";',
    ),
    (
        "위치10 전개도 물리 모서리 대응에서 CE 를 C-apex 대신 base 로 오기",
        '  CE: "C*",\n  CF: "C*",',
        '  CE: "CE",\n  CF: "C*",',
    ),
    (
        "위치11 동위각·엇각 등식(x 풀이)에서 부호를 뒤집는다",
        "      const val = a * x + p;\n"
        "      const q = val - b2 * x;\n"
        "      if (q < 0 || q > 170 || val <= 10 || val >= 170) return null;",
        "      const val = a * x + p;\n"
        "      const q = val + b2 * x;\n"
        "      if (q < 0 || q > 170 || val <= 10 || val >= 170) return null;",
    ),
    (
        "위치12 이웃각(평각) 계산에서 180 대신 90 을 쓴다",
        "        const theta = intBetween(rng, 20, 160);\n        const ans = 180 - theta;",
        "        const theta = intBetween(rng, 20, 160);\n        const ans = 90 - theta;",
    ),
    (
        "위치13 «맞꼭지각이 같으면 평행하다» 를 참으로 뒤집는다",
        '  ["맞꼭지각의 크기가 같으면 두 직선은 평행하다.", false],',
        '  ["맞꼭지각의 크기가 같으면 두 직선은 평행하다.", true],',
    ),
    (
        "위치14 삼각형의 성질 x=a+b 를 x=a-b 로",
        "        const a = intBetween(rng, 15, 80);\n"
        "        const b = intBetween(rng, 15, 80);\n"
        "        const x = a + b;",
        "        const a = intBetween(rng, 15, 80);\n"
        "        const b = intBetween(rng, 15, 80);\n"
        "        const x = a - b;",
    ),
    (
        "위치15 세 엇각의 합에서 한 항(c)을 빠뜨린다",
        "        const x = a + b + c;\n        if (x >= 175) return null;",
        "        const x = a + b;\n        if (x >= 175) return null;",
    ),
    (
        "위치16 가운데 각을 더하기로 (실제는 반대 방향이라 빼야 한다)",
        "        const x = b - a + c;",
        "        const x = b + a + c;",
    ),
    (
        "위치17 네 꺾인각의 합(180)에서 한 항을 빠뜨린다",
        "      const x = 180 - a - b - c;",
        "      const x = 180 - a - b;",
    ),
    (
        "위치18 접은 각(90-β)을 β 그대로 돌려준다",
        "        const x = 90 - beta;",
        "        const x = beta;",
    ),
    (
        "위치20 180/n 공식에서 n 대신 (n-1) 을 쓴다",
        "    const ans = 180 / n;",
        "    const ans = 180 / (n - 1);",
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

    code, base_out = npx("tsx", "scripts/qa/probe-m1-geo1.ts")
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
                print(
                    "[%d] %s\n    ⚠️  앵커가 %d개다. 포맷이 줄을 합쳤을 수 있다."
                    % (i, title, n)
                )
                continue
            io.open(TARGET, "wb").write(
                text.replace(probe_old, probe_new).encode("utf-8")
            )
            if io.open(TARGET, "rb").read() == original:
                verdicts.append((title, "⚠️  파일이 안 바뀜 — 판정 불가"))
                continue
            code, probe_out = npx("tsx", "scripts/qa/probe-m1-geo1.ts")
            digest = probe_out.strip().splitlines()[-1] if code == 0 else "PROBE-FAIL"
            if digest == baseline:
                verdicts.append((title, "⚠️  산출물이 그대로 — 판정 거부"))
                print(
                    "[%d] %s\n    ⚠️  뜻이 안 바뀌었다. 이 변이로는 아무것도 못 잰다."
                    % (i, title)
                )
                io.open(TARGET, "wb").write(original)
                continue
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
