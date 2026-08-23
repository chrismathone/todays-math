# -*- coding: utf-8 -*-
"""변이 시험 — `curveGraph`·`netCone`·좌표평면 한 벌의 가드를 **망가뜨려** 본다.

    python scripts/qa/mutate-curve-graph.py [번호 ...]

## 판정은 3단이다 (2026-08-21 교훈)

  ⑴ 파일이 바뀌었나  ⑵ **산출물이 바뀌었나**  ⑶ 그제서야 시험이 빨개지나

⑵ 를 건너뛰면 「가드가 아니다」가 거짓말이 된다 — 이 저장소에서 실제로 여러 번 났다.
여기서 산출물은 `scripts/qa/probe-curve-render.py` 가 **엔진을 실제로 돌린** 결과다.
표본을 하네스 안에 두지 않는 이유는, 하네스를 고칠 때 표본까지 흔들리면 무엇이
바뀌었는지 알 수 없기 때문이다.

## 되돌리기

시작할 때 읽어 둔 **바이트 그대로** 되돌린다. `git show HEAD:` 로 되돌리면 커밋 안 된
수정을 덮는다(2026-08-23). 그리고 시작 전에 대상 파일이 깨끗한지 먼저 묻는다 —
이 스크립트는 그 파일을 덮어쓴다.

⚠️ **이 스크립트가 도는 동안 대상 파일을 고치지 마라.** 되돌리기가 그 수정을 덮는다.
   중간에 죽었으면 `git checkout HEAD -- scripts/figure/elem_advanced.py` 로 되살려라.
"""
from __future__ import annotations

import hashlib
import io
import os
import subprocess
import sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TARGET_REL = "scripts/figure/elem_advanced.py"
TARGET = os.path.join(REPO, TARGET_REL)
TESTS = (
    "src/__tests__/unit/figureCurveGraph.test.ts "
    "src/__tests__/unit/figureNetCone.test.ts "
    "src/__tests__/unit/figureLinearGraph.test.ts"
)

# (이름, 무엇을 지키나, 원본 조각, 변이 조각)
#
# 조각은 **파일에 정확히 한 번**만 나와야 한다 — 아니면 멈춘다. 낱말이 아니라
# 그 구조 자체의 모양을 골랐다(2026-08-18 「LOOP 가 있나」로 재시도를 지킨 사건).
MUTANTS: list[tuple[str, str, str, str]] = [
    (
        "폭 박기",
        "viewBox 폭을 240 에 박고 벌어지면 던진다",
        '    svg = _svg(width, height, body)\n'
        '    m = _SVG_SPLIT.match(svg)',
        '    return _svg(0.0, height, body)\n'
        '    m = _SVG_SPLIT.match(svg)',
    ),
    (
        "눈금 글자 크기",
        "지면에서 본문(12.5px) 이상 — 옛 12 는 폭 240 에서 12.0px 이라 미달이었다",
        "CP_FONT = 13.0",
        "CP_FONT = 12.0",
    ),
    (
        "marks 검산",
        "marks 가 어느 그래프 위에도 없으면 던진다",
        "        if not on_graph(mx, my):",
        "        if False:",
    ),
    (
        "marks 허용치",
        "반올림한 손 좌표를 걸러 낸다 (1e-9)",
        "CP_ON_EPS = 1e-9",
        "CP_ON_EPS = 1e-3",
    ),
    (
        "쌍곡선 두 가지",
        "한 가지만 그리면 반비례가 아니다",
        "        if len(left) != 1 or len(right) != 1:",
        "        if False:",
    ),
    (
        "점근선 간격",
        "곡선이 좌표축에 붙으면 던진다",
        "            if near_x < CG_ASYM_GAP or near_y < CG_ASYM_GAP:",
        "            if False:",
    ),
    (
        "곡선 자르기",
        "범위 상자 밖은 안 그린다",
        "        return y is not None and pl.ylo - 1e-12 <= y <= pl.yhi + 1e-12",
        "        return y is not None",
    ),
    (
        "원뿔 중심각",
        "중심각은 임의가 아니라 360r/l 이다",
        "    deg = 360.0 * r / l",
        "    deg = 120.0",
    ),
    (
        "원뿔 밑면 접촉",
        "밑면 원이 호에 닿는다",
        "    base_cy = l + r  #",
        "    base_cy = l + r * 2.0  #",
    ),
    (
        "원뿔 모선 검사",
        "모선이 밑면 반지름 이하면 원뿔이 아니다",
        "    if l <= r:",
        "    if False:",
    ),
]


def eol(s: str) -> str:
    """대상 파일은 CRLF 다 — 앵커도 같은 줄끝이어야 찾힌다.

    이 한 줄이 없으면 여러 줄 앵커가 **조용히 0번** 나오고, 그러면 변이가 적용되지
    않은 채 「초록 ← 가드가 아니다」로 찍힐 수 있다(2026-08-23 실제로 그렇게 났다).
    그래서 앵커가 정확히 한 번이 아니면 **아예 멈춘다**.
    """
    return s.replace("\r\n", "\n").replace("\n", "\r\n")


def run(cmd: str) -> subprocess.CompletedProcess[str]:
    # Windows 에서 `npx` 는 `.cmd` 라 shell 없이는 못 찾는다.
    return subprocess.run(
        cmd, cwd=REPO, capture_output=True, text=True, shell=True,
        encoding="utf-8", errors="replace",
    )


def probe() -> str:
    env = dict(os.environ, PYTHONIOENCODING="utf-8")
    p = subprocess.run(
        [sys.executable, os.path.join(REPO, "scripts", "qa", "probe-curve-render.py")],
        cwd=REPO, capture_output=True, env=env,
    )
    out = p.stdout.decode("utf-8", "replace")
    if p.returncode != 0 or not out.strip():
        # 표본이 죽으면 «산출물이 바뀌었나»가 트레이스백끼리 견주는 일이 된다.
        raise SystemExit(
            "표본이 실패했다 — 판정하지 않는다:\n" + p.stderr.decode("utf-8", "replace")[:800]
        )
    return out


def main() -> int:
    dirty = run(f'git status --porcelain -- "{TARGET_REL}"').stdout.strip()
    if dirty:
        print("멈춘다 — 대상 파일에 커밋 안 된 수정이 있다. 이 스크립트는 그 파일을 덮어쓴다:")
        print(" ", dirty)
        return 2

    picked = {int(a) for a in sys.argv[1:] if a.isdigit()}
    original = io.open(TARGET, "rb").read()
    md5_before = hashlib.md5(original).hexdigest()
    text = original.decode("utf-8")
    for name, _why, old, _new in MUTANTS:
        got = text.count(eol(old))
        if got != 1:
            print(f"멈춘다 — 「{name}」 앵커가 {got}번 나온다(1번이어야 한다). 앵커를 고쳐라.")
            return 2

    out_before = probe()
    print(f"기준 산출물 {len(out_before.splitlines())}줄 · md5 {hashlib.md5(out_before.encode()).hexdigest()[:12]}")
    print()

    red = green = skipped = 0
    try:
        for i, (name, why, old, new) in enumerate(MUTANTS, start=1):
            if picked and i not in picked:
                continue
            print(f"[{i:2}] {name} — {why}")
            mutated = text.replace(eol(old), eol(new), 1)
            io.open(TARGET, "wb").write(mutated.encode("utf-8"))

            # ⑴ 파일이 바뀌었나
            if hashlib.md5(io.open(TARGET, "rb").read()).hexdigest() == md5_before:
                print("     ⚪ 판정 안 함 — 파일이 안 바뀌었다")
                skipped += 1
                continue
            # ⑵ 산출물이 바뀌었나
            out_after = probe()
            if out_after == out_before:
                print("     ⚪ 판정 안 함 — **산출물이 그대로다**. 변이가 뜻을 안 바꿨다")
                skipped += 1
                continue
            moved = sum(1 for a, b in zip(out_before.splitlines(), out_after.splitlines()) if a != b)
            # ⑶ 시험이 빨개지나
            p = run(f"npx vitest run {TESTS}")
            if p.returncode != 0:
                print(f"     🔴 빨강 — 가드가 산다 (표본 {moved}줄이 달라졌다)")
                red += 1
            else:
                print(f"     🟢 초록 ← **가드가 아니다** (표본 {moved}줄이 달라졌는데 시험은 초록)")
                green += 1
    finally:
        io.open(TARGET, "wb").write(original)
        back = hashlib.md5(io.open(TARGET, "rb").read()).hexdigest()
        print()
        print("되돌림:", "OK" if back == md5_before else f"❗ 실패 {back} != {md5_before}")

    print(f"빨강 {red} · 초록 {green} · 판정 안 함 {skipped}")
    return 0 if green == 0 and skipped == 0 else 1


sys.exit(main())
