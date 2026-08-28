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
import time
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))            # scripts/qa
# 🔴 **저장소 뿌리다** — `dirname` 한 번이면 `scripts/` 다(2026-08-24 실제 결함).
#    그때 `FIGDIR` 이 `scripts/scripts/figure` 가 되고, 무엇보다 ㉤ 의
#    `MUTATION-IN-PROGRESS.*` 훑기가 **엉뚱한 디렉터리**를 봐서 반쪽만 살았다.
#    그런데도 exit 1 이 나왔다 — 빵부스러기를 짚는 다른 줄이 물었기 때문이다.
#    **맞는 답이 맞는 이유를 증명하지 않는다.**
ROOT = os.path.dirname(os.path.dirname(HERE))                # 저장소 뿌리
FIGDIR = os.path.join(ROOT, "scripts", "figure")
assert os.path.isdir(FIGDIR), f"FIGDIR 이 없다: {FIGDIR} — ROOT 계산을 보라"
COLLECTOR = os.path.join(HERE, "probe-table-width.ts")


# 🔴 **이 판정기의 «아니오»는 전부 `die()` 를 지난다.** 그런데 이 환경의 파이썬
#    stdout 기본이 **cp949** 라, 🔴 를 쓰는 순간 `UnicodeEncodeError` 로 터진다 —
#    종료 코드는 1 이라 관문은 빨개지는데 **stdout 이 통째로 비고 트레이스백만 남는다.**
#    그러면 다음 사람은 「판정기가 깨졌네」로 읽지 「결함이 235건이네」로 안 읽는다.
#    **판정은 나오는데 근거가 안 나오는** 그 모양이다(2026-08-23 「근거 줄이 비었다」).
#    자식에게 주는 `PYTHONIOENCODING` 은 **자식 것**이라 여기엔 안 걸린다.
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, OSError):  # 파이프·리다이렉트로 못 바꾸는 경우
        pass


def die(msg: str) -> None:
    sys.stdout.write(f"\n\U0001f534 {msg}\n")
    sys.stdout.flush()
    raise SystemExit(1)


def fence(msg: str) -> None:
    """**결함이 아니라 울타리** — `exit 2`.

    이 판정기가 공용 관문(`npm run test`)에 들어가면, 다른 세션이 변이 회차를 도는
    동안 **모두의 관문이 빨개진다.** 그건 결함이 아니라 「지금은 못 잰다」이다.
    둘을 같은 코드로 내보내면 다음 사람이 **빨간데 근거가 없는** 것을 보고,
    몇 번 겪으면 이 검사를 끈다(2026-08-20 「거짓 경보는 가드를 끈다」).

    `exit 2` 는 이 저장소의 쓸기가 이미 「울타리」로 따로 세는 코드다.
    """
    sys.stdout.write(f"\n\U0001f7e1 {msg}\n")
    sys.stdout.flush()
    raise SystemExit(2)


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
        # 🔴 **죽은 회차도 표지를 남긴다.** 셧다운·한도로 죽은 세션은 스스로 신고하지
        #    않으므로(CLAUDE.md 2026-08-21), 표지가 있다고 회차가 사는 것은 아니다.
        #    그렇다고 나이로 자동 무시하면 «조용히 변이본을 재는» 구멍이 다시 열린다.
        #    그래서 **판단하지 말고 근거를 찍는다** — 사람이 지우게.
        lines = [
            f"   {os.path.basename(m)}  (수정 {(time.time() - os.path.getmtime(m)) / 60.0:.0f}분 전)"
            for m in live
        ]
        # ⚠️ **여기서 「그 PID 가 살아 있나」를 우리가 판정하지 않는다.**
        #    표지의 PID 는 bash 의 `$$` — Git Bash 에서 그것은 **MSYS 가짜 PID** 라
        #    Windows 쪽(파이썬 `os.kill`·PowerShell `Get-Process`)에서는 **늘 «없음»**이다.
        #    실측(2026-08-24): 회차가 도는 중에 `kill -0 55280` 은 「산다」인데
        #    `Get-Process -Id 55280` 은 빈 값이다. 그대로 두면 **100% 거짓 경보**이고,
        #    그 경보가 「살아 있는 회차의 표지를 지워라」라고 시킨다 — 없느니만 못하다
        #    (2026-08-20 「거짓 경보는 가드를 끈다」).
        #    표지 안에 **같은 셸에서 돌릴 `kill -0` 한 줄**이 이미 적혀 있다. 그쪽이 옳다.
        fence(
            "**변이 회차 표지가 있다** — 지금 재면 변이본을 잰다.\n"
            + "\n".join(lines)
            + "\n   회차가 끝난 뒤에 돌려라.\n"
            "   죽은 회차의 표지일 수도 있다 — **표지를 열어 그 안의 `kill -0` 을**\n"
            "   **bash 에서** 돌려 보고(우리가 대신 판정하지 않는다), 죽었으면 표지를\n"
            "   지우고 `git diff scripts/figure/` 로 변이 잔재부터 되돌려라."
        )


def engine_path() -> str:
    """㉠ 제품과 **같은 규칙**으로 엔진을 찾는다 — 결정은 `engine_path` 한 곳이다.

    종전에는 여기서 우선순위를 **다시 나열**했다. 그러면 제품이 순서를 바꾸는 날
    판정기만 옛 순서로 남는다 — 실제로 상수가 옮겨 가자 이 함수가 죽었다(2026-08-28).
    """
    sys.path.insert(0, FIGDIR)
    from engine_path import engine_root  # noqa: E402

    cand = engine_root()
    if cand:
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
        # 🔴 **이 문구는 「나는 초등 세션이 아닌데」에 답해야 한다.**
        #    이 검사는 공용 관문에 있어서, 중학 트랙이 kind 를 더한 날 **그쪽이** 막힌다.
        #    그 사람은 이 파일이 뭔지 모르고 자기 시험은 다 초록이다. 「왜 막나」와
        #    「어떻게 빠져나가나」가 그 줄에 없으면 **훅을 우회하거나 이 검사를 끈다** —
        #    거짓 경보가 아닌데도 결과가 같다(2026-08-20 의 사촌).
        die(
            f"**표본이 못 덮는 kind 가 있다: {missing}**\n"
            "\n"
            "   · 왜 막나 — 표본에 없는 kind 는 **변이 시험 밖**이라 그 코드를\n"
            "     망가뜨려도 아무 시험도 안 운다. 그 상태의 「전량 초록」은 참이 아니다.\n"
            "     막는 것은 그 트랙의 결함이라서가 아니라, **관문이 초록을 낼 자격이\n"
            "     없어서**다.\n"
            "\n"
            "   · 고치는 법 — `scripts/qa/probe-elem-figure.py` 의 목록에 그 kind 표본\n"
            "     **한 줄**. 규격은 짐작하지 말고 **엔진 소스에서 읽어** 맞춰라\n"
            "     (`elementary.py` 의 `KIND_FIELDS`·`OPTIONAL`, `elem_advanced.py` 의\n"
            "     `ADV_FIELDS`·`ADV_OPTIONAL` 이 키를 갖고, 값 범위는 그리는 함수의\n"
            "     `raise` 문에 있다).\n"
            "     넣은 뒤 이 판정기를 다시 돌리면 그 자리가 닫힌다.\n"
            "\n"
            "   · 내 일이 아니면 — **elem-figures 세션에 알려라. 30초면 넣는다.**\n"
            "     기다리는 동안 막히는 것이 곤란하면 그렇게 말하고 넘겨라."
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
