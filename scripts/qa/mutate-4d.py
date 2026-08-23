# -*- coding: utf-8 -*-
"""4D 45유형(이차방정식 31 + 원주각의 활용 14)의 가드를 **망가뜨려 본다**.

    python scripts/qa/mutate-4d.py [번호 …]

가드는 그래야 가드인 줄 안다 — 「검사가 있다」는 「검사가 무언가를 지킨다」가 아니다.

판정은 **3단**이다(CLAUDE.md 2026-08-21):
  ⑴ 파일이 바뀌었나        — 치환이 실제로 먹었나
  ⑵ **산출물이 바뀌었나**   — `probe-4d.ts` 의 지문이 달라졌나
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
QUAD = os.path.join(ROOT, "src", "lib", "middle", "m3Quad.ts")
ANGLE = os.path.join(ROOT, "src", "lib", "middle", "m3AngleApply.ts")
TESTS = [
    "src/__tests__/unit/middleM3Quad.test.ts",
    "src/__tests__/unit/middleM3AngleApply.test.ts",
]

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


# (제목, 대상 파일, 찾을 것, 바꿀 것) — 각 변이는 «이 시험이 지키는 것 하나»를 겨눈다.
MUTATIONS: list[tuple[str, str, str, str]] = [
    (
        "풀이 06 — 인수분해 계수의 부호를 뒤집는다 (그 근이 근이 아니게 된다)",
        QUAD,
        "        const cb = -bigA * (p + q);",
        "        const cb = bigA * (p + q);",
    ),
    (
        "풀이 10 — 완전제곱식을 한 톨 깨뜨린다 (중근이 아니게 된다)",
        QUAD,
        "      const cc = bigA * m * m;",
        "      const cc = bigA * m * m + 1;",
    ),
    (
        "풀이 12 — 근호 안에 제곱인수를 넣는다 (`\\sqrt{8}` 이 지면에 나간다)",
        QUAD,
        "        const q = pick(rng, SURD_POOL);",
        "        const q = 4 * pick(rng, SURD_POOL);",
    ),
    (
        "활용 01 — 판별식에서 $a$ 를 빠뜨린다 (근의 공식이 틀린 값을 낸다)",
        QUAD,
        "      const bigD = b * b - 4 * a * c;",
        "      const bigD = b * b - 4 * c;",
    ),
    (
        "활용 06 — 부등호 방향만 뒤집는다 (수는 그대로라 판별식 검산은 초록이다)",
        QUAD,
        '        const sym = strict ? (less ? "<" : ">") : less ? "\\\\leq" : "\\\\geq";',
        '        const sym = strict ? (less ? ">" : "<") : less ? "\\\\geq" : "\\\\leq";',
    ),
    (
        "활용 09 — 두 자리 수 유일성 가드를 끈다 (답이 둘인 문항이 나간다)",
        QUAD,
        "          if (hits !== 1) return null;",
        "          if (hits !== -1) return null;",
    ),
    (
        "활용 11 — 물체의 높이를 $5$ 만큼 어긋나게 한다 (두 근이 그 높이가 아니게 된다)",
        QUAD,
        "        const bigH = h0 + 5 * t1 * t2;",
        "        const bigH = h0 + 5 * t1 * t2 + 5;",
    ),
    (
        "활용 14 — 상자 밑면의 세로에서 잘라 낸 폭을 한 번만 뺀다",
        QUAD,
        "          const bigA = (l - 2 * c) * (w - 2 * c);",
        "          const bigA = (l - 2 * c) * (w - c);",
    ),
    (
        "그림 01 — 호 배치를 어긋나게 한다 (그린 각이 발문과 달라진다)",
        ANGLE,
        "  const tC = onAng(t0 - o.p - 2 * o.a);",
        "  const tC = onAng(t0 - o.p - o.a);",
    ),
    (
        "그림 02 — 호를 «셋으로 고루» 나눈다 (2026-08-24 에 실제로 났던 오류)",
        ANGLE,
        "      // ∠BAD 가 보는 호는 **B→C→D** 뿐이다(A→B 는 빼야 한다). 셋으로 고루 나누면\n"
        "      // 그린 각이 $\\frac{2}{3}a$ 가 된다 — 실측 2026-08-24 에 그렇게 났다.\n"
        "      const tB = tA - (180 - a);\n"
        "      const tC = tB - a;\n"
        "      const tD = tC - a;",
        "      const tB = tA - (2 * a) / 3;\n"
        "      const tC = tB - (2 * a) / 3;\n"
        "      const tD = tC - (2 * a) / 3;",
    ),
    (
        "그림 06 — A 와 Q 를 현 PB 의 같은 쪽에 둔다 (∠PDC 가 보각이 아니게 된다)",
        ANGLE,
        "  const tB = onAng(tP - 2 * o.a);",
        "  const tB = onAng(tP + 2 * o.a);",
    ),
    (
        "그림 08 — 현 TA 를 접점의 같은 쪽에 둔다 (∠ABT 가 «180−b» 가 된다)",
        ANGLE,
        "  const tA = onAng(270 - 2 * o.b);",
        "  const tA = onAng(270 + 2 * o.b);",
    ),
    (
        "그림 12 — 현 TD 를 위쪽으로 돌린다 (∠DCT 가 «180−c» 가 된다)",
        ANGLE,
        "  const uD = [Math.cos((o.c - 90) * DEG), -Math.sin((o.c - 90) * DEG)] as Pt;",
        "  const uD = [Math.cos((90 - o.c) * DEG), -Math.sin((90 - o.c) * DEG)] as Pt;",
    ),
    (
        "그림 13 — 묻지 않은 각에도 «x» 를 적는다 (지면에서 어느 것을 묻는지 안 갈린다)",
        ANGLE,
        """        angATB: {
          vertex: "T",
          points: ["A", "B"],
          label: mode === 0 ? "x" : deg(t),
        },""",
        """        angATB: {
          vertex: "T",
          points: ["A", "B"],
          label: "x",
        },""",
    ),
    (
        "그림 폭 고정을 끈다 (지면 등급이 내용에 따라 떠다닌다)",
        ANGLE,
        "  const s = FIT_WIDTH / width;",
        "  const s = 1;",
    ),
    (
        "그림 14 — 수선의 발 위치를 어긋나게 한다 (그림에서 잰 길이비가 답과 달라진다)",
        ANGLE,
        "        const cosPhi = 1 - (2 * p) / d;",
        "        const cosPhi = 1 - p / d;",
    ),
]


def main() -> int:
    only = {int(a) for a in sys.argv[1:] if a.isdigit()}

    code, out = run(["git", "status", "--porcelain", "--", QUAD, ANGLE])
    if code != 0 or out.strip():
        print("멈춘다 — 대상 파일에 미커밋 변경이 있다. 이 스크립트는 그 파일을")
        print("덮어쓴다: 먼저 커밋하거나 되돌려라.")
        print(out)
        return 2

    originals = {path: io.open(path, "rb").read() for path in (QUAD, ANGLE)}

    code, base_out = npx("tsx", "scripts/qa/probe-4d.ts")
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
        for i, (title, path, old, new) in enumerate(MUTATIONS, start=1):
            if only and i not in only:
                continue
            text = originals[path].decode("utf-8")
            # 파일이 CRLF 로 저장돼 있어도 앵커는 LF 로 적는다.
            crlf = "\r\n" in text
            probe_old = old.replace("\n", "\r\n") if crlf else old
            probe_new = new.replace("\n", "\r\n") if crlf else new
            n = text.count(probe_old)
            if n != 1:
                verdicts.append((title, "⚠️  앵커 %d개 — 판정 불가" % n))
                print("[%d] %s\n    ⚠️  앵커가 %d개다. 포맷이 줄을 합쳤을 수 있다." % (i, title, n))
                continue
            io.open(path, "wb").write(
                text.replace(probe_old, probe_new).encode("utf-8")
            )
            # ⑴ 파일이 바뀌었나
            if io.open(path, "rb").read() == originals[path]:
                verdicts.append((title, "⚠️  파일이 안 바뀜 — 판정 불가"))
                continue
            # ⑵ 산출물이 바뀌었나
            code, probe_out = npx("tsx", "scripts/qa/probe-4d.ts")
            digest = probe_out.strip().splitlines()[-1] if code == 0 else "PROBE-FAIL"
            if digest == baseline:
                verdicts.append((title, "⚠️  산출물이 그대로 — 판정 거부"))
                print("[%d] %s\n    ⚠️  뜻이 안 바뀌었다. 이 변이로는 아무것도 못 잰다." % (i, title))
                io.open(path, "wb").write(originals[path])
                continue
            # ⑶ 시험이 빨개지나
            code, _ = npx("vitest", "run", *TESTS, "--pool=threads")
            mark = "🔴 빨강 ← 가드가 산다" if code != 0 else "🟢 초록 ← 가드가 아니다"
            verdicts.append((title, mark))
            print("[%d] %s\n    %s" % (i, title, mark))
            io.open(path, "wb").write(originals[path])
    finally:
        for path, data in originals.items():
            io.open(path, "wb").write(data)

    print("\n── 판정 ──")
    for title, mark in verdicts:
        print("  %s  %s" % (mark, title))
    bad = [v for v in verdicts if not v[1].startswith("🔴")]
    print("\n%d개 중 빨강 %d개" % (len(verdicts), len(verdicts) - len(bad)))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
