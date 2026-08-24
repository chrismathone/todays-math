# -*- coding: utf-8 -*-
"""5A 42유형(이차함수의 그래프 ⑴ 21 + ⑵ 21)의 가드를 **망가뜨려 본다**.

    python scripts/qa/mutate-m3-func.py [번호 …]

가드는 그래야 가드인 줄 안다 — 「검사가 있다」는 「검사가 무언가를 지킨다」가 아니다.

판정은 **3단**이다(CLAUDE.md 2026-08-21):
  ⑴ 파일이 바뀌었나        — 치환이 실제로 먹었나
  ⑵ **산출물이 바뀌었나**   — `probe-m3-func.ts` 의 지문이 달라졌나
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
import json
import os
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FUNC = os.path.join(ROOT, "src", "lib", "middle", "m3Func.ts")
TESTS = ["src/__tests__/unit/middleM3Func.test.ts"]

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


def vitest() -> tuple[int, list[str], list[str]]:
    """시험을 돌리고 **실패한 시험 이름과 사유**까지 받아 온다.

    ⚠️ 「빨갛다」만 보면 안 된다. 다중 세션으로 부하가 걸린 날에는 **시간 초과**가
    빨강으로 나오고, 그러면 가드와 아무 상관 없는 변이도 «가드가 산다» 로 찍힌다
    (CLAUDE.md 2026-08-23 — 빨간데 실패한 시험을 못 대면 판정을 거부한다).
    """
    out_dir = tempfile.mkdtemp(prefix="mut-m3func-")
    out_json = os.path.join(out_dir, "result.json").replace(os.sep, "/")
    code, _ = npx(
        "vitest",
        "run",
        *TESTS,
        "--pool=threads",
        "--reporter=json",
        "--outputFile.json=" + out_json,
    )
    names: list[str] = []
    reasons: list[str] = []
    try:
        data = json.load(io.open(out_json, encoding="utf-8"))
        for f in data.get("testResults", []):
            for a in f.get("assertionResults", []):
                if a.get("status") == "failed":
                    names.append(a.get("fullName") or a.get("title") or "?")
                    reasons.append(" ".join(a.get("failureMessages") or []))
    except Exception:
        pass
    return code, names, reasons


# (제목, 찾을 것, 바꿀 것) — 각 변이는 «이 시험이 지키는 것 하나»를 겨눈다.
MUTATIONS: list[tuple[str, str, str]] = [
    (
        "⑴01 — 보기 진리표의 한 칸을 뒤집는다 (「$x(x+2)-x^2$ 은 이차식」)",
        "      const truth = [\n        true,\n        false,\n        false,",
        "      const truth = [\n        true,\n        false,\n        true,",
    ),
    (
        "⑴02 — 조건을 $k \\neq u$ 로 낮춘다 (그 $k$ 에서 이차항이 안 사라진다)",
        "    const ans = u * u;",
        "    const ans = u;",
    ),
    (
        "⑴03 — 함숫값을 $1$ 만큼 어긋나게 한다 (지면의 일반형과 갈린다)",
        "      const fp = a * (p - h) * (p - h) + k;",
        "      const fp = a * (p - h) * (p - h) + k + 1;",
    ),
    (
        "⑴04 — 「폭이 넓다」와 「좁다」를 맞바꾼다 (수는 그대로다)",
        "      const target = mode === 0 ? Math.min(...abs) : Math.max(...abs);",
        "      const target = mode === 0 ? Math.max(...abs) : Math.min(...abs);",
    ),
    (
        "⑴05 — $x$축 대칭에서 부호를 안 뒤집는다",
        "      const b = rNeg(a);",
        "      const b = a;",
    ),
    (
        "⑴07 — 지나는 점의 $y$좌표를 $am$ 으로 만든다 (표식이 곡선 밖으로 나간다)",
        "      const v = rMul(a, rInt(m * m));\n      if (v[1] !== 1) return null;",
        "      const v = rMul(a, rInt(m));\n      if (v[1] !== 1) return null;",
    ),
    (
        "⑴09 — $y$축 평행이동의 부호를 뒤집는다",
        "만큼 평행이동한 그래프를 나타내는 이차함수의 식을 구하시오.`,\n"
        "          answer: `$y=${stdRhs(a, 0, q)}$`,",
        "만큼 평행이동한 그래프를 나타내는 이차함수의 식을 구하시오.`,\n"
        "          answer: `$y=${stdRhs(a, 0, -q)}$`,",
    ),
    (
        "⑴12 — $x$축 평행이동의 부호를 뒤집는다 (「$-3$만큼」과 `(x+3)` 이 어긋난다)",
        "          answer: `$y=${stdRhs(a, p, 0)}$`,\n"
        "          solution: `$x$축의 방향으로",
        "          answer: `$y=${stdRhs(a, -p, 0)}$`,\n"
        "          solution: `$x$축의 방향으로",
    ),
    (
        "⑴16 — 증가·감소를 가르는 $a$ 의 부호를 뒤집는다",
        "    const growRight = av > 0;",
        "    const growRight = av < 0;",
    ),
    (
        "⑴18 — 그림의 두 번째 표식을 곡선에서 한 칸 띄운다",
        "      const fig = parabolaFig(a, p, q, [\n        [p, q],\n        [m, v[0]],\n      ]);",
        "      const fig = parabolaFig(a, p, q, [\n        [p, q],\n        [m, v[0] + 1],\n      ]);",
    ),
    (
        "⑴19 — 평행이동을 빼기로 바꾼다 (부호가 두 번 뒤집힌다)",
        "      const p2 = p + mx;\n      const q2 = q + my;\n      if (Math.abs(p2) > 9",
        "      const p2 = p - mx;\n      const q2 = q + my;\n      if (Math.abs(p2) > 9",
    ),
    (
        "⑴20 — $p$ 의 부호를 거꾸로 읽는다 (그려진 그래프와 어긋난다)",
        '      const sp = p > 0 ? ">" : "<";',
        '      const sp = p > 0 ? "<" : ">";',
    ),
    (
        "표준형 → 일반형 전개에서 일차항의 부호를 뒤집는다 (두 꼴이 다른 함수가 된다)",
        "    B: rMul(a, rInt(-2 * p)),",
        "    B: rMul(a, rInt(2 * p)),",
    ),
    (
        "⑵03 — 지나지 않는 사분면을 한 칸 밀어 적는다",
        "      const miss = cfg === 0 ? 3 : cfg === 1 ? 4 : cfg === 2 ? 2 : 1;",
        "      const miss = cfg === 0 ? 4 : cfg === 1 ? 3 : cfg === 2 ? 1 : 2;",
    ),
    (
        "⑵08 — 삼각형의 넓이에서 $\\dfrac{1}{2}$ 을 빠뜨린다",
        "      const area = (Math.abs(r2 - r1) * Math.abs(C[0])) / 2;",
        "      const area = Math.abs(r2 - r1) * Math.abs(C[0]);",
    ),
    (
        "⑵14 — 최댓값·최솟값을 가르는 $a$ 의 부호를 뒤집는다 (답이 없는 문항이 나간다)",
        "\n      const isMax = a < 0;",
        "\n      const isMax = a > 0;",
    ),
    (
        "⑵17 — 합이 일정한 두 수의 곱의 최댓값을 $1$ 만큼 어긋나게 한다",
        "content: `합이 $${m}$인 두 수의 곱의 최댓값을 구하시오.`,\n"
        "          answer: `$${h * h}$`,",
        "content: `합이 $${m}$인 두 수의 곱의 최댓값을 구하시오.`,\n"
        "          answer: `$${h * h + 1}$`,",
    ),
    (
        "⑵20 — 최댓값의 최솟값을 두 배로 만든다",
        "        const ans = -((t * t) / 4);",
        "        const ans = -((t * t) / 2);",
    ),
    (
        "⑵21 — 직사각형의 최대 넓이에서 $h$ 를 한 번만 곱한다",
        "        const ans = m * h * h;",
        "        const ans = m * h;",
    ),
    (
        "`baseTex` — 양수도 괄호로 싼다 (`\\times(2)^2` 가 지면에 나간다)",
        "  return v < 0 ? `(${v})` : String(v);",
        "  return `(${v})`;",
    ),
    (
        "`termTex` — 계수 $1$ 을 적는다 (`1x^2` 가 지면에 나간다)",
        "  if (abs[0] === 1 && abs[1] === 1) return `${sign}${v}`;",
        "  if (abs[0] === 0 && abs[1] === 1) return `${sign}${v}`;",
    ),
    (
        "`toStdLines` — $|a|=1$ 갈래에서 둘째 줄을 지운다 (해설이 한 줄로 뭉친다)",
        '      `따라서 $y=${std}$이다.`,\n    ];',
        "    ];",
    ),
]


def main() -> int:
    only = {int(a) for a in sys.argv[1:] if a.isdigit()}

    code, out = run(["git", "status", "--porcelain", "--", FUNC])
    if code != 0 or out.strip():
        print("멈춘다 — 대상 파일에 미커밋 변경이 있다. 이 스크립트는 그 파일을")
        print("덮어쓴다: 먼저 커밋하거나 되돌려라.")
        print(out)
        return 2

    original = io.open(FUNC, "rb").read()

    code, base_out = npx("tsx", "scripts/qa/probe-m3-func.ts")
    if code != 0:
        print("기준 지문을 못 얻었다:\n" + base_out)
        return 2
    baseline = base_out.strip().splitlines()[-1]
    print("기준 지문 " + baseline[:16] + "…")

    # 음성 대조 — 변이를 넣기 **전에** 시험이 초록인지 본다. 이게 없으면
    # 「늘 빨강」인 도장도 「가드가 산다」로 찍힌다 (2026-08-23).
    code, names, _ = vitest()
    if code != 0:
        print("멈춘다 — **기준 시험이 이미 빨갛다.** 변이 판정이 무의미하다.")
        print("  " + " · ".join(names[:5]))
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
            io.open(FUNC, "wb").write(
                text.replace(probe_old, probe_new).encode("utf-8")
            )
            # ⑴ 파일이 바뀌었나
            if io.open(FUNC, "rb").read() == original:
                verdicts.append((title, "⚠️  파일이 안 바뀜 — 판정 불가"))
                continue
            # ⑵ 산출물이 바뀌었나
            code, probe_out = npx("tsx", "scripts/qa/probe-m3-func.ts")
            digest = probe_out.strip().splitlines()[-1] if code == 0 else "PROBE-FAIL"
            if digest == baseline:
                verdicts.append((title, "⚠️  산출물이 그대로 — 판정 거부"))
                print(
                    "[%d] %s\n    ⚠️  뜻이 안 바뀌었다. 이 변이로는 아무것도 못 잰다."
                    % (i, title)
                )
                io.open(FUNC, "wb").write(original)
                continue
            # ⑶ 시험이 빨개지나 — **그리고 어느 시험이 깨졌는지 댈 수 있나**
            code, names, reasons = vitest()
            if code == 0:
                mark = "🟢 초록 ← 가드가 아니다"
            elif not names:
                mark = "⚠️  빨간데 실패한 시험을 못 댄다 — 판정 거부"
            elif all("timed out" in r for r in reasons):
                mark = "⚠️  시간 초과뿐이다(부하) — 판정 거부"
            else:
                mark = "🔴 빨강 ← 가드가 산다"
            verdicts.append((title, mark))
            detail = ("\n        ↳ " + names[0][:90]) if names else ""
            print("[%d] %s\n    %s%s" % (i, title, mark, detail))
            io.open(FUNC, "wb").write(original)
    finally:
        io.open(FUNC, "wb").write(original)

    print("\n── 판정 ──")
    for title, mark in verdicts:
        print("  %s  %s" % (mark, title))
    bad = [v for v in verdicts if not v[1].startswith("🔴")]
    print("\n%d개 중 빨강 %d개" % (len(verdicts), len(verdicts) - len(bad)))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
