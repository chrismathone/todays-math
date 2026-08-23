#!/usr/bin/env python
"""**갈래가 실제로 내는 스펙이 전부 그려지는가** — 초등 그림 전량 렌더 판정기.

    python scripts/qa/probe-elem-render-all.py            # 씨앗 40
    python scripts/qa/probe-elem-render-all.py 60         # 씨앗 60
    python scripts/qa/probe-elem-render-all.py 40 specs.json   # 이미 모아 둔 스펙으로

── 왜 있나 ────────────────────────────────────────────────────────────────────

**두 시험 사이에 아무도 안 보는 자리가 있었다.**

  · `elementaryFigure.test.ts` 는 **내가 고른 픽스처**를 그린다 — 갈래가 실제로
    무엇을 내는지 모른다.
  · 갈래 시험(`elemTiers*.test.ts`)은 **스펙의 필드**를 본다 — 그것이 그려지는지
    묻지 않는다.

그 사이가 「갈래가 내는 스펙을 **그려 본다**」이고, 2026-08-24 하루에 **세 번** 값을 했다:

  ⑴ 초4 표 **192건** — 글자가 지면 밖으로 최대 64.9단위 잘려 나가고 있었다.
     옛 엔진으로 좌표를 재서 확인 — 192/192 전부, 거짓 0건.
  ⑵ 초6 구 **5건** — `r` 이 렌더러 범위(0.4~20)를 넘는 25 였다. 갈래 시험 91개 전부 초록.
  ⑶ 초3 `pointGrid` **235건** — `cols·rows` 범위 초과. 아직 남아 있다(아래 ㉢).

세 번 다 **누가 마침 전량을 쓸었기 때문에** 나왔다. 사람이 기억할 일로 두면 그 사람이
안 쓰는 날 그대로 나간다 — 그래서 코드로 옮긴다.

── 이 판정기가 지키는 넷 (리드 요청, 2026-08-24) ──────────────────────────────

㉠ **엔진 경로를 스스로 잡는다.** `render_spec.py` 의 상수를 **import** 한다 — 두 벌로
   적지 않는다. 이걸 안 해서 `No module named 'core'` 1,552건을 진짜 결함에 섞었고,
   그 오염된 목록에서 뽑은 「던진 자리」를 그대로 보고했다(총계는 고쳤는데 내역은
   옛것이었다). **경로를 못 잡으면 세지 않고 멈춘다.**

㉡ **분모를 찍는다.** 「잰 스펙 N · 던짐 M」. **N 이 0이면 실패**다 — 0은 「깨끗」과
   「못 셈」을 안 가른다. 실제로 JSON 모양을 잘못 읽어 「잰 스펙 0 · 던짐 0」이 나온
   적이 있고, 분모를 찍었기에 알았다.

㉢ **예외 목록을 두지 않는다.** 「알려진 빚」을 통과시키면 그 목록이 곧 사각지대가
   된다(09 §4-22). 남은 것은 **빨간 채로** 두고 건수를 찍는다 — 고치면 저절로 준다.
   그래서 이 판정기는 **관문에 걸기 전에** 0이 되어야 한다.

㉣ **표본이 엔진의 전 kind 를 덮는가를 첫 줄에서 본다.** 2026-08-24 에 병합이 kind
   넷(`assetScene`·`histogram`·`freqPolygon`·`linearGraph`)을 들여왔는데 표본에 없어,
   변이 하네스 **62종이 통째로 판정 불능**이 됐다. 표본 가드가 소리는 냈지만 그 소리가
   「변이 판정 불가」로 **번역돼서** 나왔다 — 원인이 화면 어디에도 안 남는다.
   여기서는 **그 자체로 실패**하게 한다.

⚠️ **kind 를 미리 고르지 않는다.** 「표만 보자」로 짜면 그 목록이 사각지대가 된다 —
   실제로 그렇게 짠 쓸기가 위 ⑵(구)를 못 봤다. 나온 스펙을 **전부** 렌더에 넘긴다.
"""

from __future__ import annotations

import collections
import json
import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FIGDIR = os.path.join(ROOT, "scripts", "figure")
COLLECTOR = os.path.join(HERE, "probe-table-width.ts")


def die(msg: str) -> None:
    sys.stdout.write(f"\n\U0001f534 {msg}\n")
    raise SystemExit(1)


def refuse_during_mutation() -> None:
    """**변이 회차 중에는 판정하지 않는다.**

    변이 하네스는 `elementary.py`·`elem_advanced.py` 를 **제자리에서** 고쳤다 되돌린다.
    그 사이에 이 판정기를 돌리면 **변이본을 재고** 그 숫자를 진짜로 읽는다 — 에러도
    경고도 없이 그럴듯한 값이 나온다. 회차 표시가 있으면 멈춘다.
    """
    marks = [
        os.path.join(HERE, ".mutate-inflight.elem-figure.json"),
        *[
            os.path.join(ROOT, f)
            for f in (os.listdir(ROOT) if os.path.isdir(ROOT) else [])
            if f.startswith("MUTATION-IN-PROGRESS.")
        ],
    ]
    live = [m for m in marks if os.path.exists(m)]
    if live:
        die(
            "**변이 회차가 돌고 있다** — 지금 재면 변이본을 잰다.\n"
            "   " + " · ".join(os.path.basename(m) for m in live) + "\n"
            "   회차가 끝난 뒤에 돌려라."
        )


def engine_path() -> str:
    """㉠ `render_spec.py` 와 **같은 우선순위**로 엔진을 찾는다 — 상수를 import 한다."""
    sys.path.insert(0, FIGDIR)
    import render_spec  # noqa: E402

    for cand in (
        os.environ.get("FIGURE_ENGINE_PATH"),
        render_spec.VENDOR_ENGINE_PATH,
        render_spec.DEFAULT_ENGINE_PATH,
    ):
        if cand and os.path.isdir(os.path.join(cand, "core")):
            return cand
    die(
        "도형 엔진을 못 찾았다 — 세지 않고 멈춘다.\n"
        "   경로를 못 잡은 채로 세면 `No module named 'core'` 가 진짜 결함에 섞여\n"
        "   자리 목록이 통째로 거짓이 된다(2026-08-24 실제)."
    )
    raise AssertionError("unreachable")


def check_probe_covers_every_kind() -> int:
    """㉣ 표본이 엔진의 전 kind 를 덮는가 — **첫 줄에서, 그 자체로** 판정한다."""
    out = subprocess.run(
        [sys.executable, os.path.join(HERE, "probe-elem-figure.py")],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env={**os.environ, "PYTHONIOENCODING": "utf-8"},
        cwd=ROOT,
    )
    blob = (out.stdout or "") + (out.stderr or "")
    if "표본에 빠진 kind" in blob:
        missing = blob.split("변이 시험이 못 봅니다:", 1)[-1].strip().splitlines()[0]
        die(
            f"**표본이 못 덮는 kind 가 있다: {missing}**\n"
            "   그 kind 는 변이 시험 밖에 있다. `scripts/qa/probe-elem-figure.py` 에\n"
            "   표본을 넣어라 — 안 넣으면 그 자리를 망가뜨려도 아무도 모른다."
        )
    n = blob.count("### ")
    if out.returncode != 0 or n == 0:
        die(f"표본이 안 돈다 (exit {out.returncode}, 스펙 {n}). 먼저 고쳐라.")
    return n


def collect_specs(seeds: int) -> list[dict]:
    tmp = os.path.join(tempfile.gettempdir(), f"elem-specs-{seeds}.json")
    run = subprocess.run(
        ["npx", "tsx", COLLECTOR, tmp, str(seeds)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        cwd=ROOT,
        shell=(os.name == "nt"),
    )
    if run.returncode != 0 or not os.path.exists(tmp):
        die(f"스펙 수집이 실패했다 (exit {run.returncode})\n{(run.stderr or '')[-400:]}")
    with open(tmp, encoding="utf-8") as fh:
        return json.load(fh)["rows"]


def main() -> None:
    seeds = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 40
    given = sys.argv[2] if len(sys.argv) > 2 else None

    refuse_during_mutation()
    covered = check_probe_covers_every_kind()
    sys.stdout.write(f"표본이 전 kind 를 덮는다 (스펙 {covered}종)\n")

    eng = engine_path()
    sys.path.insert(0, eng)
    from elementary import render_elementary  # noqa: E402

    if given:
        with open(given, encoding="utf-8") as fh:
            rows = json.load(fh)["rows"]
    else:
        rows = collect_specs(seeds)

    measured = 0
    fails: list[tuple[dict, str]] = []
    for r in rows:
        spec = r["spec"]
        if not (isinstance(spec, dict) and spec.get("version") == "elem-1"):
            continue
        measured += 1
        try:
            render_elementary(spec)
        except Exception as exc:  # noqa: BLE001 — 무엇이든 「안 그려진다」다
            fails.append((r, f"{type(exc).__name__}: {exc}"))

    # ㉡ 분모를 판정 줄과 **같은 자리**에 찍는다.
    sys.stdout.write(f"잰 스펙 {measured} · 던짐 {len(fails)}\n")
    if measured == 0:
        die("**잰 스펙이 0이다** — 「깨끗」이 아니라 「못 셈」이다. 수집을 고쳐라.")

    if not fails:
        sys.stdout.write("\n✅ 갈래가 내는 스펙이 전부 그려진다\n")
        return

    by_kind = collections.Counter(
        (r["spec"].get("kind"), re.sub(r"[-\d.]+", "N", m)[:52]) for r, m in fails
    )
    sys.stdout.write("\n── 던진 사유 ──\n")
    for (kind, msg), n in by_kind.most_common():
        sys.stdout.write(f"  {n:>5}  {kind:<14} {msg}\n")
    where = collections.Counter(f'{r["grade"]} {r["section"]}' for r, _ in fails)
    sys.stdout.write("\n── 자리 ──\n")
    for sect, n in where.most_common(12):
        sys.stdout.write(f"  {n:>5}  {sect}\n")
    # ㉢ 예외 목록 없음 — 남은 건수를 그대로 드러내고 실패한다.
    die(
        f"**{len(fails)}건이 안 그려진다.** 예외 목록으로 통과시키지 마라 —\n"
        "   그 목록이 곧 사각지대가 된다(09 §4-22). 고치면 이 수가 저절로 준다."
    )


if __name__ == "__main__":
    main()
