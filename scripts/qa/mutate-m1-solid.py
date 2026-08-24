# -*- coding: utf-8 -*-
"""5E 35유형(다면체와 회전체 20 + 겉넓이와 부피 15)의 가드를 **망가뜨려 본다**.

    python scripts/qa/mutate-m1-solid.py [번호 …]

가드는 그래야 가드인 줄 안다 — 「검사가 있다」는 「검사가 무언가를 지킨다」가 아니다.

판정은 **3단**이다(CLAUDE.md 2026-08-21):
  ⑴ 파일이 바뀌었나        — 치환이 실제로 먹었나
  ⑵ **산출물이 바뀌었나**   — `probe-m1-solid.ts` 의 지문이 달라졌나
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
SOLID = os.path.join(ROOT, "src", "lib", "middle", "m1Solid.ts")
TESTS = ["src/__tests__/unit/middleM1Solid.test.ts"]

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
        "면의 개수 표를 각뿔에도 «n+2» 로 (각뿔은 n+1 이다)",
        "function facesOf(n: number, fam: number): number {\n"
        "  return fam === 1 ? n + 1 : n + 2;\n}",
        "function facesOf(n: number, fam: number): number {\n  return n + 2;\n}",
    ),
    (
        "모서리 표를 각뿔에도 «3n» 으로 (각뿔은 2n 이다)",
        "function edgesOf(n: number, fam: number): number {\n"
        "  return fam === 1 ? 2 * n : 3 * n;\n}",
        "function edgesOf(n: number, fam: number): number {\n  return 3 * n;\n}",
    ),
    (
        "꼭짓점 표를 각뿔에도 «2n» 으로 (각뿔은 n+1 이다)",
        "function vertsOf(n: number, fam: number): number {\n"
        "  return fam === 1 ? n + 1 : 2 * n;\n}",
        "function vertsOf(n: number, fam: number): number {\n  return 2 * n;\n}",
    ),
    (
        "정팔면체의 «한 꼭짓점에 모인 면의 개수» 를 3 으로 (실제는 4)",
        '{ name: "정팔면체", face: "정삼각형", f: 8, e: 12, v: 6, p: 3, q: 4 }',
        '{ name: "정팔면체", face: "정삼각형", f: 8, e: 12, v: 6, p: 3, q: 3 }',
    ),
    (
        "정십이면체의 모서리를 20 으로 (실제는 30 — 오일러가 깨진다)",
        '{ name: "정십이면체", face: "정오각형", f: 12, e: 30, v: 20, p: 5, q: 3 }',
        '{ name: "정십이면체", face: "정오각형", f: 12, e: 20, v: 20, p: 5, q: 3 }',
    ),
    (
        "20 쌍대를 «자기 자신» 으로 (면의 한가운데 점은 꼭짓점이 된다)",
        "        const dual = platoByFaces(s.v);",
        "        const dual = platoByFaces(s.f);",
    ),
    (
        "14 회전축을 뒤집는다 (반지름과 높이가 맞바뀐다 — 이 유형의 전부다)",
        "        const r = axis === 0 ? a : b;",
        "        const r = axis === 0 ? b : a;",
    ),
    (
        "17 원뿔 전개도의 중심각을 절반으로 (호의 길이 ≠ 밑면의 둘레)",
        "      const l = intBetween(rng, r + 1, 18);\n"
        "      const deg = (360 * r) / l;",
        "      const l = intBetween(rng, r + 1, 18);\n"
        "      const deg = (180 * r) / l;",
    ),
    (
        "05 원기둥 전개도의 가로를 반지름으로 (둘레가 아니라 반지름을 적는다)",
        "          const w = 2 * r;\n          const S = 2 * r * (r + h);",
        "          const w = r;\n          const S = 2 * r * (r + h);",
    ),
    (
        "07 구멍 뚫린 기둥에서 **안쪽 옆넓이**를 빠뜨린다",
        "          const S = 2 * (R * R - r * r) + 2 * R * h + 2 * r * h;",
        "          const S = 2 * (R * R - r * r) + 2 * R * h;",
    ),
    (
        "08 잘라 낸 직육면체의 겉넓이에서 홈의 바닥을 빼 버린다",
        "        const S = 2 * (w * d + d * h + h * w);\n"
        "        const V = w * d * h - cw * cd * ch;",
        "        const S = 2 * (w * d + d * h + h * w) - 2 * cw * cd;\n"
        "        const V = w * d * h - cw * cd * ch;",
    ),
    (
        "08 그림의 컷을 **가운데**로 옮긴다 (그러면 겉넓이가 안 변한다는 말이 거짓이 된다)",
        "            cut: { x: 0, w: cw, d: cd, h: ch },",
        "            cut: { w: cw, d: cd, h: ch },",
    ),
    (
        "12 원뿔대의 옆넓이를 π(R−r)s 로 (실제는 π(R+r)s)",
        "      const side = (R + r) * s;",
        "      const side = (R - r) * s;",
    ),
    (
        "15 사각뿔대의 부피를 큰 뿔 «+» 작은 뿔로",
        "        const V = (big - small) / 3;",
        "        const V = (big + small) / 3;",
    ),
    (
        "10 사각뿔의 옆넓이를 두 배로 (옆면은 넷인데 여덟로 센다)",
        "      const S = a * a + 2 * a * l;",
        "      const S = a * a + 4 * a * l;",
    ),
    (
        "19 다면체 «모서리가 꼭짓점보다 몇 개 많은가» 를 하나 어긋나게",
        "        const d = e - v;",
        "        const d = e - v + 1;",
    ),
    (
        "17 그릇에 남은 물(삼각기둥)에서 밑넓이의 ½ 을 빠뜨린다",
        "          const V = ((a * c) / 2) * b;",
        "          const V = (a * c) * b;",
    ),
    (
        "19 전개도 그림이 **모선까지** 적게 한다 (발문이 이미 말한 수를 이중표기)",
        '            labels: ["angle"],',
        '            labels: ["slant", "angle"],',
    ),
    (
        "05 옆면이 사다리꼴인 것을 «각뿔» 로 센다",
        "        target === 2\n          ? name.endsWith(\"뿔대\")",
        "        target === 2\n          ? name.endsWith(\"뿔\")",
    ),
    (
        "06 참·거짓을 거꾸로 센다 (옳은 것의 개수가 «옳지 않은 것»의 개수가 된다)",
        "        const ans = picks.filter(\n"
        "          (s) => s.k === countOf(s.n, s.fam, s.q),\n"
        "        ).length;",
        "        const ans = picks.filter(\n"
        "          (s) => s.k !== countOf(s.n, s.fam, s.q),\n"
        "        ).length;",
    ),
]


def main() -> int:
    only = {int(a) for a in sys.argv[1:] if a.isdigit()}

    code, out = run(["git", "status", "--porcelain", "--", SOLID])
    if code != 0 or out.strip():
        print("멈춘다 — 대상 파일에 미커밋 변경이 있다. 이 스크립트는 그 파일을")
        print("덮어쓴다: 먼저 커밋하거나 되돌려라.")
        print(out)
        return 2

    original = io.open(SOLID, "rb").read()

    code, base_out = npx("tsx", "scripts/qa/probe-m1-solid.ts")
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
            io.open(SOLID, "wb").write(
                text.replace(probe_old, probe_new).encode("utf-8")
            )
            # ⑴ 파일이 바뀌었나
            if io.open(SOLID, "rb").read() == original:
                verdicts.append((title, "⚠️  파일이 안 바뀜 — 판정 불가"))
                continue
            # ⑵ 산출물이 바뀌었나
            code, probe_out = npx("tsx", "scripts/qa/probe-m1-solid.ts")
            digest = probe_out.strip().splitlines()[-1] if code == 0 else "PROBE-FAIL"
            if digest == baseline:
                verdicts.append((title, "⚠️  산출물이 그대로 — 판정 거부"))
                print(
                    "[%d] %s\n    ⚠️  뜻이 안 바뀌었다. 이 변이로는 아무것도 못 잰다."
                    % (i, title)
                )
                io.open(SOLID, "wb").write(original)
                continue
            # ⑶ 시험이 빨개지나
            code, _ = npx("vitest", "run", *TESTS, "--pool=threads")
            mark = "🔴 빨강 ← 가드가 산다" if code != 0 else "🟢 초록 ← 가드가 아니다"
            verdicts.append((title, mark))
            print("[%d] %s\n    %s" % (i, title, mark))
            io.open(SOLID, "wb").write(original)
    finally:
        io.open(SOLID, "wb").write(original)

    print("\n── 판정 ──")
    for title, mark in verdicts:
        print("  %s  %s" % (mark, title))
    bad = [v for v in verdicts if not v[1].startswith("🔴")]
    print("\n%d개 중 빨강 %d개" % (len(verdicts), len(verdicts) - len(bad)))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
