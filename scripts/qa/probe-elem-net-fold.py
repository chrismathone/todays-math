# -*- coding: utf-8 -*-
"""전개도의 **접는 선이 점선인가** — 전량 판정기.

원장님 지적(2026-08-27, `J10504-A05-005`): 「삼각뿔의 전개도라고 했는데, 실제로
접어지는 부분인 AC, AB, BC는 점선으로 표현해야 전개도가 맞을듯.」

초5 「직육면체의 전개도」 교과서 규약:
  · **실선 = 자르는 선** — 바깥 윤곽
  · **점선 = 접는 선** — 면과 면이 맞닿는 안쪽 변

## 열쇠는 손 목록이 아니라 **구조**다 — 그런데 열쇠가 **둘** 필요했다

⑴ **어느 그림이 전개도인가** — 엔진의 **배선표**에서 뽑는다(`is_net_spec`).
   kind 이름을 여기 나열하지 않는다: `_RENDER[kind]` 가 가리키는 함수 이름이
   `_net_` 로 시작하면 전개도이고, `net` 을 켤 수 있는 kind(`prism`)는 그 값이
   켜졌을 때 전개도다. 새 전개도 함수를 `_net_…` 로 만들면 **저절로 걸린다.**

   ⚠️ 이 열쇠 없이 ⑵ 만 쓰면 **거짓 경보가 쏟아진다.** 실측(2026-08-27, 말뭉치
   935장): 표의 칸·쌓기나무·겨냥도의 면·띠그래프·`trapFour` 조각이 전부 「변을
   공유하는 두 면」이라 **400건**이 걸렸다(진짜는 45건). 늘 우는 가드는 꺼진다.

⑵ **그 전개도의 어느 선이 접는 선인가** — SVG 좌표에서 뽑는다.
   **칠해진 면**(fill 이 none 이 아닌 rect·polygon)을 모두 꺼내 변으로 쪼갠 뒤,

    같은 변을 **두 면이 공유** → 안쪽 변 = **접는 선** → 점선이어야 한다
    한 면만 가진 변                → 바깥 윤곽 = **자르는 선** → 실선이어야 한다

   원·부채꼴은 곧은 변이 없어 면 목록에 안 넣는다(넣어도 공유할 변이 없다).

## 결함 세 가지

  F1  안쪽 변(접는 선)이 **실선**으로 덮여 있다        ← 원장님이 짚으신 것
  F2  바깥 윤곽(자르는 선)이 **점선**뿐이다            ← 반대로 틀리는 것
  F3  접는 선이 **치수 지문**(`#000` 1.4 `6 4`)으로 그려져 있다

F3 이 왜 결함인가 — `scripts/qa/probe-dim-outside.py` 는 그 지문을 보고 「치수」를
고른다. 접는 선을 그 지문으로 그리면 그 판정기가 전개도 **안쪽**의 접는 선을
전부 「치수가 도형 안에 있다」로 세어 **거짓 결함이 쏟아진다.** 두 판정기가 같은
지문을 두고 다투지 않게 여기서 막는다.

## ⚠️ 이 축이 **구조적으로 0** 이 되는 자리

`netCylinder`·`netCone` 은 옆면과 밑면이 **한 점에서 닿는다**(원은 직사각형의 긴
변에 접하고, 밑면 원은 부채꼴 호에 접한다). 공유하는 **변**이 없으므로 이 판정기는
그 둘에 대해 아무 말도 하지 않는다 — 「깨끗」이 아니라 **관할 밖**이다.
`--census` 가 kind 별로 「잰 그림 / 관할 밖」을 따로 찍어 그 사실이 숨지 않게 한다.

쓰기:
  python scripts/qa/probe-elem-net-fold.py --selftest              # 눈금 (양성·음성)
  python scripts/qa/probe-elem-net-fold.py                         # 붙박이 전개도 행렬
  python scripts/qa/probe-elem-net-fold.py --specs scratch/specs.json --census
"""
from __future__ import annotations

import json
import math
import re
import sys
from pathlib import Path

_REPO = Path(__file__).resolve().parents[2]
for _p in (Path(_REPO, "vendor", "figure-engine"), Path(r"F:/시험지변환기")):
    if _p.is_dir():
        sys.path.insert(0, str(_p))
        break
else:  # pragma: no cover - 엔진이 없으면 아무것도 못 잰다
    raise SystemExit("🔴 도형 엔진을 못 찾았다 — 이 판정기는 아무것도 못 잰다")
sys.path.insert(0, str(Path(_REPO, "scripts", "figure")))

_NUM = r"-?\d+(?:\.\d+)?"
_TAG_RE = re.compile(r"<(rect|polygon|polyline|line|path)\b([^>]*)>")
_ATTR_RE = re.compile(r'([\w:-]+)="([^"]*)"')
_PAIR_RE = re.compile(rf"({_NUM})[ ,]+({_NUM})")

# 좌표를 이 자리수로 반올림해 변을 맞댄다. 엔진은 `_n()` 으로 소수 둘째까지 찍으므로
# 맞닿는 변의 좌표는 **글자까지 같다** — 반올림은 그 뒤 `_svg` 의 밀기까지 견디게 하는 여유다.
_Q = 2
# 「이 선이 저 변을 덮는가」의 허용치(px). 접는 선은 변 위에 그대로 그린다.
_TOL = 0.25
# 「맞닿아야 할 두 면이 살짝 어긋났다」(F4)로 볼 틈. 실측으로 이 결함은 0.01px 였다 —
# `<rect>` 의 `x` 와 `width` 가 **따로** 반올림되어 이웃 면의 `x` 와 안 맞은 것이다.
# 이만큼 어긋나면 그 변은 「공유하는 변」으로 안 읽혀 접는 선이 조용히 윤곽이 된다.
_NEAR = 0.6

# `measured()` 치수 지문 — `probe-dim-outside.py` 와 **같은 값**을 본다.
# ⚠️ 두 곳에 적힌 값이다. 한쪽만 고치면 F3 이 조용히 죽는다.
_DIM_STROKE = "#000"
# ⚠️ **굵기로 치수를 알아보지 않는다.** 종전에는 `_DIM_WIDTH = 1.4` 를 같이 봤는데,
#    원장님 확정으로 치수 점선이 0.6 이 되자(2026-08-28) 그 조건이 **한 줄도 안 맞아**
#    치수선이 «접는 선»으로 세어진다 — 결함이 아니라 **거짓 결함이 쏟아진다.**
#    굵기는 치수를 가르는 성질이 아니다. 색(`#000`)과 파선 무늬(`6 4`)면 갈린다
#    (접는 선·숨은 모서리는 `#111111`). 같은 날 같은 결함이 세 곳에 있었다:
#    여기 · `probe-dim-outside.py` · `elementaryFigure.test.ts`.
_DIM_DASH = "6 4"


def _attrs(raw: str) -> dict[str, str]:
    return dict(_ATTR_RE.findall(raw))


def _f(a: dict[str, str], k: str, d: float = 0.0) -> float:
    v = a.get(k)
    try:
        return d if v is None else float(v)
    except ValueError:
        return d


def _pts(raw: str) -> list[tuple[float, float]]:
    return [(float(x), float(y)) for x, y in _PAIR_RE.findall(raw)]


def _key(p: tuple[float, float]) -> tuple[float, float]:
    return (round(p[0], _Q), round(p[1], _Q))


def _edge_key(a: tuple[float, float], b: tuple[float, float]):
    ka, kb = _key(a), _key(b)
    return (ka, kb) if ka <= kb else (kb, ka)


def _ring_edges(pts: list[tuple[float, float]]):
    for i in range(len(pts)):
        a, b = pts[i], pts[(i + 1) % len(pts)]
        if _key(a) != _key(b):
            yield a, b


def faces(svg: str) -> list[list[tuple[float, float]]]:
    """**칠해진** 면들의 꼭짓점 고리. 칠이 없으면 면이 아니라 선이다."""
    out = []
    for m in _TAG_RE.finditer(svg):
        tag, a = m.group(1), _attrs(m.group(2))
        fill = a.get("fill", "")
        if not fill or fill == "none":
            continue
        if tag == "rect":
            x, y, w, h = _f(a, "x"), _f(a, "y"), _f(a, "width"), _f(a, "height")
            if w <= 0 or h <= 0:
                continue
            out.append([(x, y), (x + w, y), (x + w, y + h), (x, y + h)])
        elif tag == "polygon":
            p = _pts(a.get("points", ""))
            if len(p) >= 3:
                out.append(p)
    return out


def _straight_runs(tag: str, a: dict[str, str]) -> list[tuple[tuple[float, float], tuple[float, float]]]:
    """이 태그가 그리는 **곧은** 선분들.

    ⚠️ 굽은 것(`Q`·`C`·`A`…)은 **일부러 뺀다** — `measured()` 치수 곡선이 변과
       나란히 지나가며 「덮었다」로 읽히는 것을 막는다. 그래서 접는 선을 굽은
       path 로 그리면 이 판정기가 못 본다(그럴 이유가 없다 — `_line` 을 쓴다).
    """
    if tag == "line":
        return [((_f(a, "x1"), _f(a, "y1")), (_f(a, "x2"), _f(a, "y2")))]
    if tag == "rect":
        x, y, w, h = _f(a, "x"), _f(a, "y"), _f(a, "width"), _f(a, "height")
        c = [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
        return list(_ring_edges(c))
    if tag in ("polygon", "polyline"):
        p = _pts(a.get("points", ""))
        if len(p) < 2:
            return []
        if tag == "polygon":
            return list(_ring_edges(p))
        return [(p[i], p[i + 1]) for i in range(len(p) - 1)]
    if tag == "path":
        d = a.get("d", "")
        if re.search(r"[QqCcSsTtAa]", d):
            return []
        toks = re.findall(rf"[MmLlHhVvZz]|{_NUM}", d)
        out, cur, start, cmd, i = [], None, None, "", 0
        while i < len(toks):
            t = toks[i]
            if t.isalpha():
                cmd = t
                i += 1
                if cmd in ("Z", "z"):
                    if cur and start:
                        out.append((cur, start))
                        cur = start
                    continue
            if cmd in ("M", "L"):
                if i + 1 >= len(toks):
                    break
                nxt = (float(toks[i]), float(toks[i + 1]))
                i += 2
                if cmd == "M":
                    cur, start = nxt, nxt
                    cmd = "L"
                else:
                    if cur:
                        out.append((cur, nxt))
                    cur = nxt
            else:
                i += 1
        return out
    return []


def strokes(svg: str):
    """(선분, 점선인가, 치수지문인가) 목록 — 실제로 **획이 그려지는** 것만."""
    out = []
    for m in _TAG_RE.finditer(svg):
        tag, a = m.group(1), _attrs(m.group(2))
        stroke = a.get("stroke", "")
        if not stroke or stroke == "none":
            continue
        if _f(a, "stroke-width", 1.0) <= 0:
            continue
        dashed = bool(a.get("stroke-dasharray"))
        is_dim = stroke == _DIM_STROKE and (a.get("stroke-dasharray") or "").strip() == _DIM_DASH
        for seg in _straight_runs(tag, a):
            out.append((seg, dashed, is_dim))
    return out


def _covers(seg, edge, tol: float = _TOL) -> bool:
    """선분 `seg` 가 변 `edge` 를 덮는가 — 같은 직선 위에서 edge ⊆ seg."""
    (ax, ay), (bx, by) = seg
    dx, dy = bx - ax, by - ay
    ln = math.hypot(dx, dy)
    if ln < 1e-9:
        return False
    ux, uy = dx / ln, dy / ln
    for px, py in edge:
        vx, vy = px - ax, py - ay
        t = vx * ux + vy * uy
        if t < -tol or t > ln + tol:
            return False
        if abs(vx * -uy + vy * ux) > tol:
            return False
    return True


def judge(svg: str):
    """전개도 하나의 판정.

    돌려주는 값:
      None                      — 관할 밖(면이 맞닿는 변이 없다)
      (folds, cuts, [결함…])    — 잰 것
    """
    fs = faces(svg)
    if len(fs) < 2:
        return None
    seen: dict = {}
    for ring in fs:
        for a, b in _ring_edges(ring):
            seen.setdefault(_edge_key(a, b), []).append((a, b))
    folds = [v[0] for k, v in seen.items() if len(v) >= 2]
    cuts = [v[0] for k, v in seen.items() if len(v) == 1]

    # F4 — 맞닿아야 할 두 면이 살짝 어긋났나. **`folds` 가 비었는지 보기 전에** 센다:
    # 어긋난 변은 「공유하지 않는 변」으로 읽히므로, 전부 어긋나면 `folds` 가 비고
    # 이 판정기가 「관할 밖」이라며 **조용해진다** — 결함이 가장 심할 때 침묵한다.
    near: set[int] = set()
    bad: list[str] = []
    for i in range(len(cuts)):
        for j in range(i + 1, len(cuts)):
            if _covers(cuts[i], cuts[j], _NEAR) and _covers(cuts[j], cuts[i], _NEAR):
                near |= {i, j}
                gap = max(
                    abs(cuts[i][k][ax] - cuts[j][k][ax]) for k in (0, 1) for ax in (0, 1)
                )
                bad.append(
                    f"F4 맞닿아야 할 두 면이 {gap:.2f}px 어긋남 — "
                    f"{_key(cuts[i][0])}~{_key(cuts[i][1])}"
                )
    if not folds and not near:
        return None

    st = strokes(svg)
    for e in folds:
        solid = any(_covers(s, e) for s, dashed, _ in st if not dashed)
        dash = [(s, dim) for s, dashed, dim in st if dashed and _covers(s, e)]
        if solid:
            bad.append(f"F1 접는 선이 실선 — {_key(e[0])}~{_key(e[1])}")
        elif not dash:
            bad.append(f"F1 접는 선이 아예 안 그려짐 — {_key(e[0])}~{_key(e[1])}")
        elif any(dim for _, dim in dash):
            bad.append(f"F3 접는 선이 치수 지문(#000 1.4) — {_key(e[0])}~{_key(e[1])}")
    # 어긋난 짝(F4)은 아래 F2 에도 걸리는데, 그때 나오는 「바깥 윤곽이 점선뿐」은
    # **원인을 가리키지 않는다.** 이미 F4 로 적었으니 건너뛴다.
    for i, e in enumerate(cuts):
        if i in near:
            continue
        covering = [(dashed, dim) for s, dashed, dim in st if _covers(s, e)]
        if not covering:
            bad.append(f"F2 자르는 선이 안 그려짐 — {_key(e[0])}~{_key(e[1])}")
        elif all(dashed for dashed, _ in covering):
            bad.append(f"F2 바깥 윤곽이 점선뿐 — {_key(e[0])}~{_key(e[1])}")
    return folds, cuts, bad


# ═══════════════════════════════════════════════════════════════════════════
# 눈금 — **양성과 음성을 둘 다** 넣는다. 양성만 넣으면 재현율만 재고 지어냄은
# 구조적으로 0이 된다(2026-08-20 「판정자를 눈금 맞출 때」).
# ═══════════════════════════════════════════════════════════════════════════
_SOLID = 'stroke="#111111" stroke-width="1.4"'
_DASH = 'stroke="#111111" stroke-width="1.4" stroke-dasharray="5 4"'
_DIM = 'stroke="#000" stroke-width="0.6" stroke-dasharray="6 4"'
# 나란히 붙은 정사각형 두 장. 공유 변은 x=50, y 10~50.
_F2 = ('<rect x="10" y="10" width="40" height="40" fill="#e4d3b8" stroke="none"/>'
       '<rect x="50" y="10" width="40" height="40" fill="#f2e6d4" stroke="none"/>')
_OUTLINE = ('<polyline points="10,10 90,10 90,50 10,50 10,10" fill="none" ' + _SOLID + "/>")
_FOLD_D = f'<line x1="50" y1="10" x2="50" y2="50" {_DASH}/>'

GAUGE = [
    # ── 양성 ────────────────────────────────────────────────────────────
    (
        "🟥 면마다 닫힌 실선 rect — 접는 선이 실선이다 (지금의 netCuboid)",
        True,
        '<rect x="10" y="10" width="40" height="40" fill="#e4d3b8" stroke="#111111" stroke-width="1.4"/>'
        '<rect x="50" y="10" width="40" height="40" fill="#f2e6d4" stroke="#111111" stroke-width="1.4"/>',
    ),
    (
        "🟥 점선을 얹었지만 실선도 남아 있다 (반쪽 수리)",
        True,
        '<rect x="10" y="10" width="40" height="40" fill="#e4d3b8" stroke="#111111" stroke-width="1.4"/>'
        '<rect x="50" y="10" width="40" height="40" fill="#f2e6d4" stroke="#111111" stroke-width="1.4"/>'
        + _FOLD_D,
    ),
    (
        "🟥 **바깥 윤곽까지 점선** — 반대로 틀린 것 (F2)",
        True,
        _F2
        + '<polyline points="10,10 90,10 90,50 10,50 10,10" fill="none" ' + _DASH + "/>"
        + _FOLD_D,
    ),
    (
        "🟥 접는 선을 **치수 지문**으로 그렸다 — dim 판정기가 오인한다 (F3)",
        True,
        _F2 + _OUTLINE + f'<line x1="50" y1="10" x2="50" y2="50" {_DIM}/>',
    ),
    (
        "🟥 접는 선을 아예 안 그렸다 — 면이 붙어 보인다",
        True,
        _F2 + _OUTLINE,
    ),
    (
        "🟥 두 면이 **0.01px 어긋났다** — 접는 선이 조용히 윤곽이 된다 (F4)",
        True,
        '<rect x="10" y="10" width="40" height="40" fill="#e4d3b8" stroke="none"/>'
        '<rect x="50.01" y="10" width="40" height="40" fill="#f2e6d4" stroke="none"/>'
        '<polyline points="10,10 90.01,10 90.01,50 10,50 10,10" fill="none" ' + _SOLID + "/>"
        + _FOLD_D,
    ),
    # ── 음성 ────────────────────────────────────────────────────────────
    (
        "🟩 윤곽은 실선 · 접는 선은 점선 — 옳은 전개도",
        False,
        _F2 + _OUTLINE + _FOLD_D,
    ),
    (
        "🟩 면이 하나뿐이면 접는 선이 없다 — 관할 밖(거짓 결함 금지)",
        False,
        '<rect x="10" y="10" width="40" height="40" fill="#e4d3b8" stroke="#111111" stroke-width="1.4"/>',
    ),
    (
        "🟩 원기둥 전개도처럼 **점에서만 닿으면** 관할 밖",
        False,
        '<rect x="10" y="30" width="80" height="30" fill="#e4d3b8" stroke="#111111" stroke-width="1.4"/>'
        '<circle cx="40" cy="20" r="10" fill="#f2e6d4" stroke="#111111" stroke-width="1.4"/>',
    ),
    (
        "🟩 치수 점선이 윤곽과 나란히 지나가도 결함이 아니다",
        False,
        _F2
        + _OUTLINE
        + _FOLD_D
        + f'<path d="M 10 52 Q 50 70 90 52" fill="none" {_DIM}/>',
    ),
    (
        "🟩 겨냥도의 숨은 모서리(도형 **안**의 점선)는 이 판정기 관할이 아니다",
        False,
        '<polygon points="10,10 90,10 90,50 10,50" fill="#e4d3b8" stroke="#111111" stroke-width="1.4"/>'
        f'<line x1="20" y1="20" x2="80" y2="40" {_DASH}/>',
    ),
]


def selftest() -> int:
    bad = 0
    for why, want, svg in GAUGE:
        got = judge(svg)
        hit = got is not None and bool(got[2])
        if hit != want:
            bad += 1
        print(f"  {'✅' if hit == want else '❌'} {why} — 기대 {want} / 실제 {hit}")
        if hit != want and got:
            for b in got[2]:
                print(f"        · {b}")
    pos = sum(1 for _, want, _ in GAUGE if want)
    # 🔴 양성·음성 **둘 다** 있어야 한다. 양성만 대면 재현율만 재고 지어냄은
    #    구조적으로 0이 된다(2026-08-20). 손으로 적은 수는 늘어나면 낡으므로 센다.
    if pos == 0 or pos == len(GAUGE):
        print(f"\n❌ 눈금이 한쪽뿐이다 (양성 {pos} · 음성 {len(GAUGE) - pos}) — 재현율만 잰다")
        return 1
    print(
        f"\n✅ 눈금 {len(GAUGE)}건 전부 맞다 (양성 {pos} · 음성 {len(GAUGE) - pos})"
        if bad == 0
        else f"\n❌ 눈금 {bad}건 어긋남 — 이 판정기를 믿을 수 없다"
    )
    return 0 if bad == 0 else 1


# 붙박이 전개도 행렬 — **말뭉치가 모집단을 정하지 않게** 한다.
# `netCone` 은 `scratch/specs.json` 에 한 장도 없다(실측 2026-08-27). 여기 없으면
# 그 kind 는 구조적으로 0이 된다 (CLAUDE.md 2026-08-25 「재는 단위도 틀이어야 한다」).
#
# ⚠️ **(10,6,2)·(12,7,2)·(10,2,4)·(6,7,4) 를 지우지 마라.** 이 넷이 `<rect>` 의
#    `x` 와 `width` 가 따로 반올림되어 맞닿는 면이 0.01px 어긋나던 자리다(F4).
#    처음엔 붙박이에 없어서 **변이 시험이 「가드가 아니다」로 초록**을 냈다 —
#    말뭉치에만 있으면 그 축은 기본 실행에서 구조적으로 0이다.
BUILTIN = (
    [{"version": "elem-1", "kind": "netCuboid", "w": w, "d": d, "h": h}
     for w, d, h in ((7, 4, 5), (3, 3, 3), (10, 2, 6), (2, 5, 9),
                     (10, 6, 2), (12, 7, 2), (10, 2, 4), (6, 7, 4))]
    + [{"version": "elem-1", "kind": "prism", "sides": n, "h": 4, "net": True}
       for n in (3, 4, 5, 6, 8)]
    + [{"version": "elem-1", "kind": "netCylinder", "r": 3, "h": 8, "layout": v}
       for v in ("opp", "oppFlip", "oppMid", "sameTop", "sameBot", "ends")]
    + [{"version": "elem-1", "kind": "netCone", "r": r, "l": l}
       for r, l in ((3, 9), (2, 8), (4, 6))]
)


def is_net_spec(spec) -> bool:
    """이 스펙이 **전개도**인가 — 엔진의 배선표에서 뽑는다(손 목록 아님).

    `_RENDER[kind]` 가 `_net_…` 함수면 전개도. `prism` 처럼 `net` 을 켤 수 있는
    kind 는 그 값이 켜졌을 때 전개도다(`_prism` 이 `_net_prism` 으로 갈라진다).
    """
    from elementary import _RENDER  # noqa: E402

    kind = spec.get("kind")
    fn = _RENDER.get(kind)
    if fn is None:
        return False
    if getattr(fn, "__name__", "").startswith("_net_"):
        return True
    return bool(spec.get("net"))


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()
    from elementary import render_elementary  # noqa: E402

    specs = list(BUILTIN)
    if "--specs" in sys.argv:
        raw = json.loads(Path(sys.argv[sys.argv.index("--specs") + 1]).read_text("utf-8"))
        specs += [s for s in raw if isinstance(s, dict)]

    tested = folds_seen = skipped = 0
    census: dict[str, list[int]] = {}
    bad_rows: list[str] = []
    for s in specs:
        if not is_net_spec(s):
            skipped += 1
            continue
        kind = str(s.get("kind")) + ("(net)" if s.get("net") else "")
        try:
            svg = render_elementary(s)
        except Exception:
            continue
        row = census.setdefault(kind, [0, 0, 0])
        got = judge(svg)
        if got is None:
            row[1] += 1  # 접는 «선»이 없다 — 곡면 전개도
            continue
        tested += 1
        row[0] += 1
        folds_seen += len(got[0])
        if got[2]:
            row[2] += 1
            if len(bad_rows) < 12:
                bad_rows.append(f"{kind} {s} — " + " / ".join(got[2][:3]))

    total_bad = sum(v[2] for v in census.values())
    print(
        f"전개도 스펙 {sum(a + b for a, b, _ in census.values())} "
        f"(전개도가 아니라 건너뜀 {skipped}) · "
        f"잰 전개도 {tested} · 접는 선 {folds_seen}개 · **결함 {total_bad}**"
    )
    if "--census" in sys.argv or total_bad:
        # 🔴 «관할밖» 을 따로 찍는다 — 「결함 0」이 «깨끗»인지 «이 축이 그 kind 에서
        #    구조적으로 침묵»인지 가르는 유일한 칸이다(netCylinder·netCone).
        print("\n  kind                 잰 것  관할밖  결함")
        for k in sorted(census):
            a, b, c = census[k]
            print(f"  {k:<20} {a:>5}  {b:>5}  {c:>5}")
    for b in bad_rows:
        print("   " + b)

    # 🔴 «0» 이 «깨끗»인지 «못 셈»인지 가른다. 면을 못 찾으면 이 판정기는 조용히
    #    아무것도 안 잰다 — 그때 멈춘다.
    if tested == 0:
        print("🔴 접는 선을 가진 전개도를 **한 장도 못 찾았다** — 열쇠가 낡았다. 0은 «깨끗»이 아니다.")
        return 1
    return 1 if total_bad else 0


if __name__ == "__main__":
    raise SystemExit(main())
