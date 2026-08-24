# -*- coding: utf-8 -*-
"""5B 27유형(정비례와 반비례 21 + 좌표와 그래프 6)의 가드를 **망가뜨려 본다**.

    python scripts/qa/mutate-m1-prop.py [번호 …]

가드는 그래야 가드인 줄 안다 — 「검사가 있다」는 「검사가 무언가를 지킨다」가 아니다.

판정은 **3단**이다(CLAUDE.md 2026-08-21):
  ⑴ 파일이 바뀌었나        — 치환이 실제로 먹었나
  ⑵ **산출물이 바뀌었나**   — `probe-m1-prop.ts` 의 지문이 달라졌나
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
PROP = os.path.join(ROOT, "src", "lib", "middle", "m1Prop.ts")
TESTS = ["src/__tests__/unit/middleM1Prop.test.ts"]

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
        "좌표 01 — 순서쌍의 둘째 성분 부호를 뒤집는다 (되푼 $b$ 가 달라진다)",
        "        const v = b - dd;",
        "        const v = b + dd;",
    ),
    (
        "좌표 02 — 축 위 조건을 깨뜨린다 (그 점이 축 위가 아니게 된다)",
        "        const s = -r * t; // 0 이 되는 좌표: r·a + s",
        "        const s = r * t; // 0 이 되는 좌표: r·a + s",
    ),
    (
        "좌표 07 — 꺾이는 점의 높이를 나중 빠르기로 잰다",
        "        const h1 = p * t1; // 꺾이는 점의 높이",
        "        const h1 = q * t1; // 꺾이는 점의 높이",
    ),
    (
        "좌표 08 — 갈 때 걸린 시간을 **올 때** 속력으로 잰다 (속력×시간이 안 맞는다)",
        "      const t1 = (60 * d) / v1; // 갈 때 걸린 시간(분)",
        "      const t1 = (60 * d) / v2; // 갈 때 걸린 시간(분)",
    ),
    (
        "좌표 09 — 주기를 한 번 더 센다 ($k$번째가 아니라 $k+1$번째가 된다)",
        "          const ans = half + (k - 1) * period;",
        "          const ans = half + k * period;",
    ),
    (
        "좌표 11 — 형이 먼저 도착한다는 가드를 끈다 («몇 분 먼저»가 음수가 된다)",
        "        if (tA <= tB) return null; // 형이 먼저 도착해야 «몇 분 먼저»가 성립한다",
        "        if (tA <= 0) return null; // 형이 먼저 도착해야 «몇 분 먼저»가 성립한다",
    ),
    (
        "정비 01 — 대응표의 빈칸을 엉뚱한 $x$ 로 채운다 (비가 안 맞는다)",
        "        const bigA = a * x2;",
        "        const bigA = a * x3;",
    ),
    (
        "정비 02 — 비례상수와 지나는 점을 한 톨 어긋나게 한다",
        "      const q = a * p;\n      const branch = intBetween(rng, 0, 2);",
        "      const q = a * p + 1;\n      const branch = intBetween(rng, 0, 2);",
    ),
    (
        "정비 06 — 「$y$축에 가깝다」와 「$x$축에 가깝다」를 맞바꾼다",
        "        const target = branch === 0 ? Math.max(...chosen) : Math.min(...chosen);\n"
        "        const ansA = list.find((v) => Math.abs(v) === target)!;\n"
        "        const near = branch === 0 ? \"$y$축\" : \"$x$축\";",
        "        const target = branch === 0 ? Math.min(...chosen) : Math.max(...chosen);\n"
        "        const ansA = list.find((v) => Math.abs(v) === target)!;\n"
        "        const near = branch === 0 ? \"$y$축\" : \"$x$축\";",
    ),
    (
        "정비 08 — 지나는 사분면을 뒤집는다 (좌표로 재는 검사가 잡아야 한다)",
        '  return a > 0 ? "제$1$사분면과 제$3$사분면" : "제$2$사분면과 제$4$사분면";',
        '  return a > 0 ? "제$2$사분면과 제$4$사분면" : "제$1$사분면과 제$3$사분면";',
    ),
    (
        "정비 10 — 삼각형을 직사각형 넓이로 낸다 ($\\dfrac12$ 이 빠진다)",
        "        const tri = (p * q) / 2;",
        "        const tri = p * q;",
    ),
    (
        "정비 22 — 삼각형을 **이등분 못 하는** 기울기로 낸다 (중점이 아니다)",
        "        const den = 2 * w;",
        "        const den = w;",
    ),
    (
        "정비 23 — 「$y$축에 가깝다」 판정을 뒤집는다",
        "        const win = nearY ? (magA > magB ? a : b) : magA < magB ? a : b;",
        "        const win = nearY ? (magA < magB ? a : b) : magA > magB ? a : b;",
    ),
    (
        "반비 12 — 반비례 상수를 곱이 아니라 합으로 낸다 ($xy$ 가 일정하지 않다)",
        "      const k = p * q;\n      if (Math.abs(k) < 4 || Math.abs(k) > 48) return null;\n"
        "      const branch = intBetween(rng, 0, 2);\n"
        "      const head = `$y$가 $x$에 반비례하고 $x=${p}$일 때 $y=${q}$이다. `;",
        "      const k = p + q;\n      if (Math.abs(k) < 4 || Math.abs(k) > 48) return null;\n"
        "      const branch = intBetween(rng, 0, 2);\n"
        "      const head = `$y$가 $x$에 반비례하고 $x=${p}$일 때 $y=${q}$이다. `;",
    ),
    (
        "반비 20 — 삼각형 넓이를 직사각형 넓이로 낸다",
        "          answer: `$${k / 2}$`,",
        "          answer: `$${k}$`,",
    ),
    (
        "반비 21 — 다른 교점을 $x$축 대칭으로 잡는다 (그 점은 두 그래프 위가 아니다)",
        "            [-p, -q],",
        "            [p, -q],",
    ),
    (
        "그림 폭 — 범위 상한을 풀어 준다 (엔진이 «폭 4~12칸»에서 던진다)",
        "  return Math.min(6, Math.max(2, ...vals.map((v) => Math.abs(v) + 1)));",
        "  return Math.min(12, Math.max(2, ...vals.map((v) => Math.abs(v) + 1)));",
    ),
    (
        "조사 — 주격 조사를 뒤집는다 (「$(2, 4)$이」가 지면에 나간다)",
        '  return eulReul(n) === "를" ? "가" : "이";',
        '  return eulReul(n) === "를" ? "이" : "가";',
    ),
    (
        "INV_K — 축에 붙는 $k=2$ 를 끼운다 (쌍곡선이 점근선에 닿아 보인다)",
        "export const INV_K = [4, 6, 8, 10, 12, 15, 18, 20, 24] as const;",
        "export const INV_K = [2, 6, 8, 10, 12, 15, 18, 20, 24] as const;",
    ),
]


def main() -> int:
    only = {int(a) for a in sys.argv[1:] if a.isdigit()}

    code, out = run(["git", "status", "--porcelain", "--", PROP])
    if code != 0 or out.strip():
        print("멈춘다 — 대상 파일에 미커밋 변경이 있다. 이 스크립트는 그 파일을")
        print("덮어쓴다: 먼저 커밋하거나 되돌려라.")
        print(out)
        return 2

    original = io.open(PROP, "rb").read()

    code, base_out = npx("tsx", "scripts/qa/probe-m1-prop.ts")
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
                print("[%d] %s\n    ⚠️  앵커가 %d개다. 포맷이 줄을 합쳤을 수 있다." % (i, title, n))
                continue
            io.open(PROP, "wb").write(
                text.replace(probe_old, probe_new).encode("utf-8")
            )
            # ⑴ 파일이 바뀌었나
            if io.open(PROP, "rb").read() == original:
                verdicts.append((title, "⚠️  파일이 안 바뀜 — 판정 불가"))
                continue
            # ⑵ 산출물이 바뀌었나
            code, probe_out = npx("tsx", "scripts/qa/probe-m1-prop.ts")
            digest = probe_out.strip().splitlines()[-1] if code == 0 else "PROBE-FAIL"
            if digest == baseline:
                verdicts.append((title, "⚠️  산출물이 그대로 — 판정 거부"))
                print("[%d] %s\n    ⚠️  뜻이 안 바뀌었다. 이 변이로는 아무것도 못 잰다." % (i, title))
                io.open(PROP, "wb").write(original)
                continue
            # ⑶ 시험이 빨개지나
            code, _ = npx("vitest", "run", *TESTS, "--pool=threads")
            mark = "🔴 빨강 ← 가드가 산다" if code != 0 else "🟢 초록 ← 가드가 아니다"
            verdicts.append((title, mark))
            print("[%d] %s\n    %s" % (i, title, mark))
            io.open(PROP, "wb").write(original)
    finally:
        io.open(PROP, "wb").write(original)

    print("\n── 판정 ──")
    for title, mark in verdicts:
        print("  %s  %s" % (mark, title))
    bad = [v for v in verdicts if not v[1].startswith("🔴")]
    print("\n%d개 중 빨강 %d개" % (len(verdicts), len(verdicts) - len(bad)))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
