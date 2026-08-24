# -*- coding: utf-8 -*-
"""4C 다항식 40유형의 가드를 **망가뜨려 본다** — 가드는 그래야 가드인 줄 안다.

    python scripts/qa/mutate-m3-poly.py [번호 …]

판정은 **3단**이다(CLAUDE.md 2026-08-21):
  ⑴ 파일이 바뀌었나        — 치환이 실제로 먹었나
  ⑵ **산출물이 바뀌었나**   — `probe-m3-poly.ts` 의 지문이 달라졌나
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
TARGET = os.path.join(ROOT, "src", "lib", "middle", "m3Poly.ts")
TEST = "src/__tests__/unit/middleM3Poly.test.ts"

ENV = dict(os.environ, PYTHONIOENCODING="utf-8")

# 콘솔이 cp949 면 한글 판정 줄에서 죽는다 — 표본 stdout 은 늘 UTF-8 로.
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
        "인수 02 — 공통인수를 덜 묶는다 (`x^2(12x+30y)`). 항등식은 그대로다",
        "          const common = `${k}${xs}${ys}`;\n"
        '          const inner = lin2(a, "x", b, "y");',
        "          const common = `${xs}${ys}`;\n"
        '          const inner = lin2(k * a, "x", k * b, "y");',
    ),
    (
        "인수 17 — `x^2+d` 의 `d` 에 음수를 허용한다 (인수가 더 갈라진다)",
        "        const d = intBetween(rng, 1, 9);",
        "        const d = nonZero(rng, -9, 9);",
    ),
    (
        "인수 21 — 두 이차인수가 더 갈라지는 조합을 막지 않는다",
        "      if (isSquare(s * s - 4 * c1) || isSquare(s * s - 4 * c2)) return null;",
        "      if (c1 === c2) return null;",
    ),
    (
        "곱셈 03 — 완전제곱식의 가운데 항을 두 배가 아니라 한 배로 쓴다",
        '        const src = `${par(lin2(a, "x", b, "y"))}^2`;\n'
        "        const out = polyTex([\n"
        '          [a * a, "x^2"],\n'
        '          [2 * a * b, "xy"],',
        '        const src = `${par(lin2(a, "x", b, "y"))}^2`;\n'
        "        const out = polyTex([\n"
        '          [a * a, "x^2"],\n'
        '          [a * b, "xy"],',
    ),
    (
        "곱셈 04 — 합차공식의 부호를 뒤집는다",
        '        const src = `${par(lin2(a, "x", b, "y"))}${par(lin2(a, "x", -b, "y"))}`;\n'
        "        const out = polyTex([\n"
        '          [a * a, "x^2"],\n'
        '          [-b * b, "y^2"],',
        '        const src = `${par(lin2(a, "x", b, "y"))}${par(lin2(a, "x", -b, "y"))}`;\n'
        "        const out = polyTex([\n"
        '          [a * a, "x^2"],\n'
        '          [b * b, "y^2"],',
    ),
    (
        "곱셈 02 — 특정 항의 계수에서 `bc` 를 빠뜨린다",
        "        const coef = which === 2 ? a * d + b * c : a * e + b * d;",
        "        const coef = which === 2 ? a * d : a * e + b * d;",
    ),
    (
        "곱셈 08 — 「늘이고 줄이고」의 부호를 맞바꾼다",
        '        [b * p - a * q, "x"],',
        '        [a * q - b * p, "x"],',
    ),
    (
        "곱셈 14 — `x=a±√b` 의 값에서 `a^2` 의 부호를 뒤집는다",
        "      const value = b - a * a + c;",
        "      const value = b + a * a + c;",
    ),
    (
        "곱셈 18 — `x^2+ax+1=0` 갈래의 상수를 `-2` 대신 `+2` 로 쓴다",
        "        const value = s === 1 ? a * a - 2 : a * a + 2;",
        "        const value = a * a + 2;",
    ),
    (
        "인수 05 — 범위를 무시하고 근호를 벗긴다 (부호가 거꾸로)",
        "          mode === 0\n            ? String(hi - lo)",
        "          mode === 0\n            ? String(lo - hi)",
    ),
    (
        "인수 11 — 인수가 되도록 정한 상수항의 부호를 뒤집는다",
        "        const C = -A * r * r - a * r;",
        "        const C = A * r * r - a * r;",
    ),
    (
        "인수 12 — 「잘못 본 것」 두 답을 맞바꿔 싣는다",
        "        const wrongA = `${par(lin(1, \"x\", p))}${par(lin(1, \"x\", q))}`;\n"
        "        const wrongB = `${par(lin(1, \"x\", u))}${par(lin(1, \"x\", v))}`;",
        "        const wrongB = `${par(lin(1, \"x\", p))}${par(lin(1, \"x\", q))}`;\n"
        "        const wrongA = `${par(lin(1, \"x\", u))}${par(lin(1, \"x\", v))}`;",
    ),
    (
        "RPM 색인이 잃은 수식을 «손으로 되살린다» (정본 바이트가 아니게 된다)",
        'def(MINOR_FAC, "21", "의 꼴의 인수분해", SEC.응용, "hard", (rng) =>',
        'def(MINOR_FAC, "21", "(  )(  )(  )(  )+k 의 꼴의 인수분해", SEC.응용, "hard", (rng) =>',
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

    code, base_out = npx("tsx", "scripts/qa/probe-m3-poly.ts")
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
            code, probe_out = npx("tsx", "scripts/qa/probe-m3-poly.ts")
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
