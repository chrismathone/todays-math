# -*- coding: utf-8 -*-
"""변이 시험 — 전개도 접는 선 가드가 **정말 무는가**.

이 저장소가 여러 번 겪은 순서를 그대로 따른다:
  ⑴ 파일이 바뀌었나        (2026-08-20 — 치환이 헛돌면 판정이 거짓말이 된다)
  ⑵ **산출물이 바뀌었나**  (2026-08-21 — 파일이 바뀌어도 뜻이 안 바뀔 수 있다)
  ⑶ 그제서야 가드가 빨개지나

⚠️ 되돌리기는 **시작할 때 읽어 둔 바이트 그대로** 한다. `git show HEAD:` 로 되돌리면
   커밋 안 된 수정을 통째로 덮는다(09 §4-22 · 2026-08-23 에 실제로 그랬다).

쓰기: python scripts/qa/mutate-net-fold.py [--with-vitest]
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
TARGET = REPO / "scripts" / "figure" / "elem_advanced.py"
PROBE = REPO / "scripts" / "qa" / "probe-elem-net-fold.py"
VITEST = "src/__tests__/unit/elementaryFigure.test.ts"

# (이름, 찾을 것, 바꿀 것) — 각각 **다른 규칙 하나**를 망가뜨린다.
MUTANTS = [
    (
        "면을 다시 실선으로 그린다 (안쪽 변과 윤곽이 같은 획)",
        'return _rect(x0, y0, x1 - x0, y1 - y0, fill=fill, stroke="none", sw=NET_SW)',
        "return _rect(x0, y0, x1 - x0, y1 - y0, fill=fill, sw=NET_SW)",
    ),
    (
        "접는 선을 실선으로 긋는다",
        "parts += [_line(a, b, sw=NET_SW, dash=FOLD_DASH) for a, b in folds]",
        "parts += [_line(a, b, sw=NET_SW) for a, b in folds]",
    ),
    (
        "접는 선을 **치수 지문**으로 긋는다 (dim 판정기가 오인한다)",
        "parts += [_line(a, b, sw=NET_SW, dash=FOLD_DASH) for a, b in folds]",
        'parts += [f\'<line x1="{_n(a[0])}" y1="{_n(a[1])}" x2="{_n(b[0])}" '
        'y2="{_n(b[1])}" stroke="#000" stroke-width="0.6" stroke-dasharray="6 4"/>\' '
        "for a, b in folds]",
    ),
    (
        "바깥 윤곽까지 점선으로 긋는다 (반대로 틀리기)",
        "parts.append(_polyline(_net_outline_ring(cuts), sw=NET_SW))",
        "parts.append(_polyline(_net_outline_ring(cuts), sw=NET_SW, dash=FOLD_DASH))",
    ),
    (
        "폭을 **반올림 전** 꼭짓점에서 뺀다 (맞닿는 면이 0.01 어긋난다)",
        "x0, x1 = round(min(xs), 2), round(max(xs), 2)",
        "x0, x1 = min(xs), max(xs)",
    ),
    (
        "접는 선을 아예 안 긋는다",
        "parts += [_line(a, b, sw=NET_SW, dash=FOLD_DASH) for a, b in folds]",
        "parts += []",
    ),
]

SPECS = [
    {"version": "elem-1", "kind": "netCuboid", "w": 7, "d": 4, "h": 5},
    {"version": "elem-1", "kind": "netCuboid", "w": 12, "d": 7, "h": 2},
    {"version": "elem-1", "kind": "prism", "sides": 5, "h": 4, "net": True},
]


def render_all() -> str:
    """엔진을 **새 프로세스**에서 불러 산출물을 뽑는다(모듈 캐시를 피한다)."""
    code = (
        "import sys, json;"
        f"sys.path.insert(0, r'{REPO / 'vendor' / 'figure-engine'}');"
        f"sys.path.insert(0, r'{REPO / 'scripts' / 'figure'}');"
        "from elementary import render_elementary;"
        f"print(json.dumps([render_elementary(s) for s in {SPECS!r}], ensure_ascii=False))"
    )
    r = subprocess.run(
        [sys.executable, "-c", code], capture_output=True, text=True, encoding="utf-8",
        env={**__import__("os").environ, "PYTHONUTF8": "1"},
    )
    return r.stdout.strip() or f"<렌더 실패> {r.stderr[-300:]}"


def run(cmd: list[str]) -> int:
    # win32 에서 `npx` 는 `.cmd` 라 `CreateProcess` 가 못 찾는다 — 셸을 태운다.
    if cmd[0] == "npx":
        cmd = ["npx.cmd", *cmd[1:]]
    # ⚠️ `encoding` 을 안 주면 win32 기본이 cp949 라 한글 출력에서 리더 스레드가
    #    `UnicodeDecodeError` 로 죽는다. 판정은 `returncode` 라 답은 안 틀리지만
    #    **근거(무엇이 실패했나)가 통째로 사라진다** — 판정 줄만 남고 근거 줄이 비면
    #    다음 사람이 그 침묵을 못 알아챈다(2026-08-23 교훈).
    return subprocess.run(
        cmd, cwd=REPO, capture_output=True, text=True,
        encoding="utf-8", errors="replace",
        env={**__import__("os").environ, "PYTHONUTF8": "1"},
    ).returncode


def main() -> int:
    with_vitest = "--with-vitest" in sys.argv
    original = TARGET.read_bytes()
    base_out = render_all()

    # 🔴 음성 대조 — 변이를 넣기 **전에** 초록인 것을 본다. 이것이 없으면
    #    「늘 빨간 도장」이 전부 «가드가 문다»로 읽힌다(2026-08-23).
    if run([sys.executable, str(PROBE), "--selftest"]) != 0:
        print("🔴 눈금이 이미 빨갛다 — 판정을 거부한다")
        return 1
    if run([sys.executable, str(PROBE)]) != 0:
        print("🔴 기준 판정기가 이미 빨갛다 — 판정을 거부한다")
        return 1
    print("🟢 기준: 판정기 초록 · 눈금 초록\n")

    fails = 0
    try:
        for name, find, repl in MUTANTS:
            text = original.decode("utf-8")
            if text.count(find) != 1:
                print(f"❌ {name} — 앵커가 {text.count(find)}번 나온다(1이어야 한다)")
                fails += 1
                continue
            TARGET.write_bytes(text.replace(find, repl, 1).encode("utf-8"))

            # ⑵ 산출물이 실제로 바뀌었나
            if render_all() == base_out:
                print(f"❌ {name} — **산출물이 그대로다**. 판정을 거부한다")
                fails += 1
                continue

            # ⑶ 가드가 빨개지나
            red_py = run([sys.executable, str(PROBE)]) != 0
            mark = "🔴 빨강" if red_py else "🟢 초록 ← 가드가 아니다"
            extra = ""
            if with_vitest:
                red_ts = run(["npx", "vitest", "run", VITEST, "-t", "전개도의 접는 선",
                              "--reporter=dot"]) != 0
                extra = f" · vitest {'🔴' if red_ts else '🟢 ← 가드가 아니다'}"
                if not red_ts:
                    fails += 1
            print(f"  {mark}{extra}  {name}")
            if not red_py:
                fails += 1
    finally:
        TARGET.write_bytes(original)
        if render_all() != base_out:
            print("🔴 되돌린 뒤 산출물이 다르다 — 손으로 확인하라")
            fails += 1

    print(
        f"\n✅ 변이 {len(MUTANTS)}개 전부 빨강 — 가드가 문다"
        if fails == 0
        else f"\n❌ {fails}건 — 위를 보라"
    )
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
