# -*- coding: utf-8 -*-
"""3E 삼각비 32유형의 가드를 **망가뜨려 본다** — 가드는 그래야 가드인 줄 안다.

    python scripts/qa/mutate-m3-trig.py [번호 …]

판정은 **3단**이다(CLAUDE.md 2026-08-21):
  ⑴ 파일이 바뀌었나        — 치환이 실제로 먹었나
  ⑵ **산출물이 바뀌었나**   — `probe-m3-trig.ts` 의 지문이 달라졌나
  ⑶ 그제서야 시험이 빨개지나

⑵ 를 건너뛰면 「뜻을 안 바꾸는 변이」가 «초록 ← 가드가 아니다» 로 찍혀
**멀쩡한 가드를 의심하고 고치러 간다** — 가드가 없는 것보다 나쁘다.

## 이 스크립트는 대상 파일을 덮어쓴다
그래서 시작할 때 `git status` 로 **미커밋 변경이 없는지 먼저 묻고**, 되돌리기는
git 이 아니라 **시작할 때 읽어 둔 바이트 그대로** 쓴다(2026-08-23: 복원을
`git show HEAD:` 로 짜서 커밋 안 된 수정을 통째로 덮은 전례가 있다).
돌아가는 동안 대상 파일을 편집하지 말 것.

역슬래시는 `chr(92)` 로 **조립**한다 — 도구 층이 리터럴을 한 겹 벗긴다.
"""

from __future__ import annotations

import io
import os
import subprocess
import sys

BS = chr(92)
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TARGET = os.path.join(ROOT, "src", "lib", "middle", "m3Trig.ts")
TEST = "src/__tests__/unit/middleM3Trig.test.ts"

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
        "surdDiv 를 옛 오류로 되돌린다 (d2·r2 를 빠뜨림 — 45° 계열에서만 맞는다)",
        "  return surd(a.n * b.d, a.r * b.r, a.d * b.n * b.r);",
        "  return surd(a.n * b.n * b.d * b.r, a.r * b.r, a.d * b.d * b.n * b.n * b.r);",
    ),
    (
        "특수각 표에서 sin 30° 와 cos 30° 를 맞바꾼다",
        "  30: [surd(1, 1, 2), surd(1, 3, 2), surd(1, 3, 3)],",
        "  30: [surd(1, 3, 2), surd(1, 1, 2), surd(1, 3, 3)],",
    ),
    (
        "삼각비 10 — 나누는 값이 1일 때도 분수를 쓴다 (지면에서 접힌다)",
        '          vText === "1"\n            ? `${g}`\n            : step.div',
        '          vText === "1XX"\n            ? `${g}`\n            : step.div',
    ),
    (
        "삼각비 01 — 그림의 치수를 발문보다 1 크게 적는다",
        "        dims: { AB: dimCm(ab), BC: dimCm(bc) },",
        "        dims: { AB: dimCm(ab + 1), BC: dimCm(bc) },",
    ),
    (
        "figAltitude — 직각 표시의 반직선을 빗변 밖의 점으로 바꾼다",
        '    r_A: { vertex: "A", points: ["B", "C"], right: true },',
        '    r_A: { vertex: "A", points: ["B", "H"], right: true },',
    ),
    (
        "figQuadDiag — D 를 B 와 «같은 쪽»에 놓는다 (사각형이 겹친다)",
        "  const s = -sideB;",
        "  const s = sideB;",
    ),
    (
        "삼각비의 표를 넷째 자리가 아니라 셋째 자리에서 끊는다",
        "  return Number(f(deg * DEG).toFixed(4));",
        "  return Number(f(deg * DEG).toFixed(3));",
    ),
    (
        "RPM 색인이 잃은 각도 표기를 «손으로 되살린다» (정본 바이트가 아니게 된다)",
        '  def("삼각비", "08", "의 삼각비의 값", SEC.값, "easy", (rng) =>',
        '  def("삼각비", "08", "30^\\circ 의 삼각비의 값", SEC.값, "easy", (rng) =>',
    ),
    (
        "삼각비 12 — 사분원 그림을 뗀다",
        "        figureSpec: figQuadrant({ ang }),",
        "        figureSpec: null,",
    ),
    (
        "활용 05 — 구하는 변을 «가까운 각» 대신 «먼 각»으로 잰다",
        "      const nearAng = ask === 0 ? cfg.b : cfg.c;",
        "      const nearAng = ask === 0 ? cfg.c : cfg.b;",
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

    code, base_out = npx("tsx", "scripts/qa/probe-m3-trig.ts")
    if code != 0:
        print("기준 지문을 못 얻었다:\n" + base_out)
        return 2
    baseline = base_out.strip().splitlines()[-1]
    print("기준 지문 " + baseline[:16] + "…")

    code, _ = npx("vitest", "run", TEST, "--pool=threads")
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
            probe_old = old.replace("\n", "\r\n") if "\r\n" in text else old
            probe_new = new.replace("\n", "\r\n") if "\r\n" in text else new
            n = text.count(probe_old)
            if n != 1:
                verdicts.append((title, "⚠️  앵커 %d개 — 판정 불가" % n))
                print("[%d] %s\n    ⚠️  앵커가 %d개다. 포맷이 줄을 합쳤을 수 있다." % (i, title, n))
                continue
            io.open(TARGET, "wb").write(
                text.replace(probe_old, probe_new).encode("utf-8")
            )
            # ⑴ 파일이 바뀌었나
            if io.open(TARGET, "rb").read() == original:
                verdicts.append((title, "⚠️  파일이 안 바뀜 — 판정 불가"))
                continue
            # ⑵ 산출물이 바뀌었나
            code, probe_out = npx("tsx", "scripts/qa/probe-m3-trig.ts")
            digest = probe_out.strip().splitlines()[-1] if code == 0 else "PROBE-FAIL"
            if digest == baseline:
                verdicts.append((title, "⚠️  산출물이 그대로 — 판정 거부"))
                print("[%d] %s\n    ⚠️  뜻이 안 바뀌었다. 이 변이로는 아무것도 못 잰다." % (i, title))
                io.open(TARGET, "wb").write(original)
                continue
            # ⑶ 시험이 빨개지나
            code, _ = npx("vitest", "run", TEST, "--pool=threads")
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
