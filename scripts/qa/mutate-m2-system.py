# -*- coding: utf-8 -*-
"""5C 30유형(일차부등식 9 + 연립일차방정식 13 + 활용 8)의 가드를 **망가뜨려 본다**.

    python scripts/qa/mutate-m2-system.py [번호 …]

가드는 그래야 가드인 줄 안다 — 「검사가 있다」는 「검사가 무언가를 지킨다」가 아니다.

판정은 **3단**이다(CLAUDE.md 2026-08-21):
  ⑴ 파일이 바뀌었나        — 치환이 실제로 먹었나
  ⑵ **산출물이 바뀌었나**   — `probe-m2-system.ts` 의 지문이 달라졌나
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
SYS_TS = os.path.join(ROOT, "src", "lib", "middle", "m2System.ts")
TESTS = ["src/__tests__/unit/middleM2System.test.ts"]

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
        "부등식 03 — $x$의 계수가 음수인데 인쇄되는 부등호를 안 뒤집는다",
        "      const c = a * t + b;\n"
        "      const prel = a > 0 ? ansRel : flipRel(ansRel);",
        "      const c = a * t + b;\n      const prel = ansRel;",
    ),
    (
        "부등식 05 — 음수를 곱했는데 **닫힘**(등호 유무)을 안 맞바꾼다",
        "      const rLo = m > 0 ? cLo : cHi;",
        "      const rLo = cLo;",
    ),
    (
        "부등식 04 — 「옳은 보기」 판정을 뒤집는다 (계수 부호와 부등호 방향)",
        "        items.push({ tex, ok: m > 0 ? rel === 0 : rel === 1 });",
        "        items.push({ tex, ok: m > 0 ? rel === 1 : rel === 0 });",
    ),
    (
        "부등식 01 — 「부등식이 아닌 것」 풀에 부등식을 섞는다",
        'const INEQ_NO = [\n  "x-5=2",',
        'const INEQ_NO = [\n  "x-5<2",',
    ),
    (
        "부등식 06 — 「일차부등식이 아닌 것」 풀에 일차부등식을 섞는다",
        '  "3-x<5-x",\n  "2x+3+4x>2(3x+1)",',
        '  "3-x<5-2x",\n  "2x+3+4x>2(3x+1)",',
    ),
    (
        "부등식 08 — 괄호를 푼 뒤의 상수항을 어긋나게 한다 (해가 답과 달라진다)",
        "        const w = a * s + p * u - q * v;",
        "        const w = a * s + p * u + q * v;",
    ),
    (
        "부등식 09 — 분모를 없앨 때 한쪽 분모를 빠뜨린다",
        "        const A = e + s2 * m * d;",
        "        const A = e + s2 * m;",
    ),
    (
        "연립 01 — 「미지수가 2개인 일차방정식이 아닌 것」 풀에 그 꼴을 섞는다",
        '  "xy+3x+y=5",',
        '  "x+3x+y=5",',
    ),
    (
        "연립 04 — 「해가 아닌 보기」를 만들 때 어긋내는 항을 안 넣는다",
        "          const d2 = ok || d1 === 1 ? 0 : 1;",
        "          const d2 = 0;",
    ),
    (
        "연립 07 — 계수 행렬식이 0 인 연립(해가 무수히 많다)을 그대로 낸다",
        # ⚠️ 들여쓰기는 **prettier 가 정한다.** 2026-08-24 에 이 앵커가 6칸이었다가
        #    def(...) 가 길어지며 8칸으로 바뀌어 「앵커 0개」가 났다. 커밋(포맷) 뒤에
        #    앵커를 다시 세는 것이 순서다.
        #
        # ⚠️ 가드만 끄면 **아무 일도 안 일어난다** — 무작위로 뽑은 계수가 우연히
        #    행렬식 0 이 되는 일이 표본에 없어서 산출물이 그대로다(1차에 실제로
        #    「산출물이 그대로 — 판정 거부」가 났다). 그래서 둘째 식을 **첫째 식의
        #    두 배로 못 박아** 반드시 그 자리에 닿게 한 뒤 가드를 끈다.
        "        const a2 = nonzero(rng, 1, 5);\n"
        "        const b2 = nonzero(rng, 1, 5);\n"
        "        const det = a1 * b2 - a2 * b1;\n"
        "        if (det === 0) return null;",
        "        const a2 = 2 * a1;\n"
        "        const b2 = 2 * b1;\n"
        "        const det = a1 * b2 - a2 * b1;\n"
        "        if (det === 12345) return null;",
    ),
    (
        "연립 08 — 괄호를 풀 때 $y$의 계수 부호를 안 바꾼다",
        "        const B2 = -k * r;",
        "        const B2 = k * r;",
    ),
    (
        "연립 09 — 소수 계수의 자릿수를 한 자리 어긋나게 인쇄한다",
        "          const row1 = `${decMono(a1, 1)}",
        "          const row1 = `${decMono(a1, 2)}",
    ),
    (
        "연립 10 — 비례식의 «외항의 곱 = 내항의 곱» 을 뒤바꾼다",
        "        const C2 = m * v - n * u;",
        "        const C2 = n * v - m * u;",
    ),
    (
        "연립 11 — $B=C$ 가 되도록 역산한 계수의 부호를 뒤집는다",
        "      const num = c - a2 * x0;",
        "      const num = c + a2 * x0;",
    ),
    (
        "연립 19 — 순환마디 표시를 빼고 유한소수로 인쇄한다 ($0.\\overline{3}\\ne0.3$)",
        "        const row1 = `0.\\\\overline{${p}}x+0.\\\\overline{${q}}y=${c1}`;",
        "        const row1 = `0.${p}x+0.\\\\overline{${q}}y=${c1}`;",
    ),
    (
        "연립 20 — 곱셈 쪽 지수를 합이 아니라 차로 만든다",
        "        const s = x0 + y0;",
        "        const s = x0 - y0;",
    ),
    (
        "활용 02 — 자리를 바꾼 수의 차를 $9$ 배가 아니라 $10$ 배로 적는다",
        "      const D = 9 * (units - tens);",
        "      const D = 10 * (units - tens);",
    ),
    (
        "활용 05 — 직사각형의 둘레를 두 변의 합으로 적는다",
        "      const L = 2 * (w + h);",
        "      const L = w + h;",
    ),
    (
        "활용 07 — 올해의 남학생 수에서 증가분을 잘못 더한다",
        "      const nowMale = km * (100 + a);",
        "      const nowMale = km * 100 + a;",
    ),
    (
        "활용 08 — 전체 이익을 백분율로 나누지 않는다",
        "      const P = (a * x + b * y) / 100;",
        "      const P = (a * x + b * y) / 10;",
    ),
]


def main() -> int:
    only = {int(a) for a in sys.argv[1:] if a.isdigit()}

    code, out = run(["git", "status", "--porcelain", "--", SYS_TS])
    if code != 0 or out.strip():
        print("멈춘다 — 대상 파일에 미커밋 변경이 있다. 이 스크립트는 그 파일을")
        print("덮어쓴다: 먼저 커밋하거나 되돌려라.")
        print(out)
        return 2

    original = io.open(SYS_TS, "rb").read()

    code, base_out = npx("tsx", "scripts/qa/probe-m2-system.ts")
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
            io.open(SYS_TS, "wb").write(
                text.replace(probe_old, probe_new).encode("utf-8")
            )
            # ⑴ 파일이 바뀌었나
            if io.open(SYS_TS, "rb").read() == original:
                verdicts.append((title, "⚠️  파일이 안 바뀜 — 판정 불가"))
                continue
            # ⑵ 산출물이 바뀌었나
            code, probe_out = npx("tsx", "scripts/qa/probe-m2-system.ts")
            digest = probe_out.strip().splitlines()[-1] if code == 0 else "PROBE-FAIL"
            if digest == baseline:
                verdicts.append((title, "⚠️  산출물이 그대로 — 판정 거부"))
                print(
                    "[%d] %s\n    ⚠️  뜻이 안 바뀌었다. 이 변이로는 아무것도 못 잰다."
                    % (i, title)
                )
                io.open(SYS_TS, "wb").write(original)
                continue
            # ⑶ 시험이 빨개지나
            code, _ = npx("vitest", "run", *TESTS, "--pool=threads")
            mark = "🔴 빨강 ← 가드가 산다" if code != 0 else "🟢 초록 ← 가드가 아니다"
            verdicts.append((title, mark))
            print("[%d] %s\n    %s" % (i, title, mark))
            io.open(SYS_TS, "wb").write(original)
    finally:
        io.open(SYS_TS, "wb").write(original)

    print("\n── 판정 ──")
    for title, mark in verdicts:
        print("  %s  %s" % (mark, title))
    bad = [v for v in verdicts if not v[1].startswith("🔴")]
    print("\n%d개 중 빨강 %d개" % (len(verdicts), len(verdicts) - len(bad)))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
