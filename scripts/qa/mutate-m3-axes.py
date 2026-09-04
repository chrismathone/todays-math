# -*- coding: utf-8 -*-
"""중3 확대 갈래의 **«지우기» 축과 그 눈금**이 가드인가 장식인가 — 변이로 판정한다.

    python scripts/qa/mutate-m3-axes.py            # 전량
    python scripts/qa/mutate-m3-axes.py --list     # 변이 목록
    python scripts/qa/mutate-m3-axes.py 2          # 하나만 (번호)

## 왜 이 하네스가 필요한가

`AXES_M3` 의 ㉠·㉡ 표는 **보고**라 저절로는 아무것도 안 지킨다. 지키는 것은
`--selftest` 의 눈금뿐이고, 그 눈금이 **정말 무는지**는 망가뜨려 봐야 안다
(2026-08-18 「가드는 망가뜨려 봐야 가드인 줄 안다」).

여기 담은 셋은 전부 **내가 실제로 먼저 틀렸던 자리**다 — 22T 를 $t$ 만 흔들어
24판 전부 「장식」을 찍었고, 58W 를 $\\pm2$ 까지만 흔들어 5판이 「장식」이었으며,
57W 의 여섯 자료값은 `facts` 에 없어 지면에서 되만든다. 셋 다 **되돌리면
빨개져야** 한다.

## 판정 순서 — 넷을 다 밟는다 (CLAUDE.md 2026-08-20·08-21·08-23)

  ㉠ **음성 대조** — 변이를 넣기 **전에** `--selftest` 이 초록인가. 아니면 판정 거부.
     루프 **밖**에서 한 번만 돈다(회차당 `N+1` 이지 `N×2` 가 아니다).
     이것이 있어야 「도장」(늘 빨강을 내는 판정기)이 판정 단계에 **못 온다**.
  ⑴ 앵커가 **정확히 하나**인가 — 아니면 판정 거부(조용히 0건 치환하지 않는다).
  ⑵ **파일 바이트**가 바뀌었나 — 안 바뀌면 치환이 헛돈 것이다.
  ⑶ 🔴 **산출물이 바뀌었나** — 파일이 바뀌어도 뜻이 안 바뀌면 「가드가 아니다」가
     거짓말이 되고, **멀쩡한 가드를 의심하고 고치러 간다**. 지문은
     `probe-middle-top-m3.ts --axes` 의 sha1 이다.
  ⑷ 그제서야 눈금이 빨개지나 — 빨간데 **어느 눈금인지 못 대면 판정 거부**.
     (옛 결함의 유일한 징후가 「빨간데 근거 줄이 비었다」였다.)

## 원복

시작할 때 읽어 둔 **바이트 그대로** 되쓴다. `git show HEAD:` 로 되돌리면 커밋 안 된
수정을 덮는다(2026-08-23 실제 사고). 그리고 이 하네스는 대상 파일을 덮어쓰므로
**미커밋 변경이 있으면 시작을 거부한다.**

⚠️ 이 도구가 도는 동안 대상 파일을 편집하지 마라 — 원복이 덮는다. 그리고 관문이
   도는 동안 이 도구를 돌리지 마라 — 워커가 변이본을 읽는다.
"""
from __future__ import annotations

import hashlib
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TARGET = os.path.join(ROOT, "scripts", "qa", "probe-middle-top-m3.ts")
REL = "scripts/qa/probe-middle-top-m3.ts"
TSX = os.path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs")

# (이름, 앵커, 치환, 어느 눈금을 지키나)
#
# 앵커는 **파일에 그대로 있는 글자**여야 하고 파일 안에서 **정확히 하나**여야 한다.
# 역슬래시가 필요하면 bytes([92]) 로 조립하라 — 도구 JSON 층이 한 겹 벗긴다.
MUTATIONS: list[tuple[str, str, str, str]] = [
    (
        "22T ㉡ 에서 «사분면 훑기»를 지운다 (t 만 흔든다)",
        "      for (const q2 of [1, 2, 3, 4]) {",
        "      for (const q2 of [] as number[]) {",
        "㉢ 음성 — 사분면까지 훑는 22T 축은 안 문다",
    ),
    (
        "58W ㉡ 의 흔들기 창을 ±60 에서 ±2 로 좁힌다",
        "        for (let dy = -60; dy <= 60; dy += 1) {",
        "        for (let dy = -2; dy <= 2; dy += 1) {",
        "㉢ 음성 — 넓게 훑는 58W 축은 안 문다",
    ),
    (
        "57W 되만들기가 지면의 **다른 줄**을 읽게 한다",
        '  const line = content.split("\\n")[1] ?? "";',
        '  const line = content.split("\\n")[2] ?? "";',
        "㉢ 양성 — 57W 의 자료 여섯을 **지면에서** 읽는다",
    ),
]


def run(args: list[str]) -> tuple[int, str]:
    # ⚠️ `npx` 를 거치지 않고 **node 로 tsx 를 직접** 부른다 — 윈도우에서 `.cmd` 는
    #    못 띄운다(관문의 `elemProbeGauges.test.ts` 가 같은 이유로 그렇게 한다).
    p = subprocess.run(
        ["node", TSX, REL, *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return p.returncode, f"{p.stdout}{p.stderr}"


def axes_print() -> str | None:
    """⑶ 의 지문 — `--axes` 표 전체의 sha1. 못 얻으면 `None`(판정 거부)."""
    code, text = run(["--axes"])
    if code != 0 or "㉠ 지름길" not in text:
        return None
    return hashlib.sha1(text.encode("utf-8")).hexdigest()


def selftest() -> tuple[bool, list[str]]:
    """`--selftest` 이 초록인가, 그리고 **어느 눈금이** 빨간가."""
    code, text = run(["--selftest"])
    bad = [
        ln.strip()[2:].strip()
        for ln in text.splitlines()
        if ln.strip().startswith("🔴")
    ]
    return code == 0, bad


def main() -> int:
    args = sys.argv[1:]
    if "--list" in args:
        for i, (name, _, _, guard) in enumerate(MUTATIONS, 1):
            print(f"  {i}. {name}\n       ↳ {guard}")
        return 0
    pick = next((int(a) for a in args if a.isdigit()), None)

    dirty = subprocess.run(
        ["git", "status", "--porcelain", "--", REL],
        cwd=ROOT,
        capture_output=True,
        text=True,
    ).stdout.strip()
    if dirty:
        print(f"⛔ {REL} 에 미커밋 변경이 있다 — 원복이 그것을 덮는다. 먼저 커밋하라.")
        return 2

    original = open(TARGET, "rb").read()

    # ㉠ 음성 대조 — 루프 **밖**에서 한 번. 이것이 없으면 「늘 빨강」인 도장이
    #    판정 단계까지 그대로 온다.
    ok, bad = selftest()
    if not ok:
        print(f"⛔ 기준 눈금이 이미 빨갛다 — 판정을 거부한다. 빨간 눈금: {bad}")
        return 2
    base_fp = axes_print()
    if base_fp is None:
        print("⛔ 기준 산출물(--axes)을 못 얻었다 — 판정을 거부한다.")
        return 2
    print(f"㉠ 음성 대조 ✅ 기준 눈금 초록 · 산출물 지문 {base_fp[:12]}\n")

    verdicts: list[tuple[str, str]] = []
    try:
        for i, (name, anchor, repl, guard) in enumerate(MUTATIONS, 1):
            if pick is not None and pick != i:
                continue
            text = original.decode("utf-8")
            n = text.count(anchor)
            if n != 1:
                verdicts.append((name, f"⛔ 앵커가 {n}개 — 판정 거부"))
                continue
            open(TARGET, "wb").write(text.replace(anchor, repl).encode("utf-8"))
            if open(TARGET, "rb").read() == original:
                verdicts.append((name, "⛔ 파일이 안 바뀌었다 — 판정 거부"))
                continue
            fp = axes_print()
            if fp is None:
                verdicts.append((name, "⛔ 산출물을 못 얻었다 — 판정 거부"))
                continue
            if fp == base_fp:
                verdicts.append((name, "⛔ 산출물이 그대로다 — 판정 거부"))
                continue
            ok, bad = selftest()
            if ok:
                verdicts.append((name, f"🟢 초록 ← 눈금이 이것을 안 문다 ({guard})"))
            elif not bad:
                verdicts.append((name, "⛔ 빨간데 어느 눈금인지 못 댄다 — 판정 거부"))
            else:
                hit = "✅" if any(guard in b for b in bad) else "⚠️ 다른 눈금"
                verdicts.append((name, f"🔴 RED {hit} ↳ {' / '.join(bad)}"))
    finally:
        open(TARGET, "wb").write(original)
        assert open(TARGET, "rb").read() == original, "원복 실패"

    print("=" * 78)
    for name, v in verdicts:
        print(f"  {v}\n     {name}")
    red = sum(1 for _, v in verdicts if v.startswith("🔴"))
    print("=" * 78)
    print(f"  변이 {len(verdicts)}개 중 **{red}개가 빨강**")
    return 0 if red == len(verdicts) else 1


if __name__ == "__main__":
    raise SystemExit(main())
