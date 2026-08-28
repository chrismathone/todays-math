"""**글자 «상자»가 아니라 «잉크»를 잰다** — PDF 라벨이 선과 겹쳤는지 물으려면.

## 왜 필요한가

PyMuPDF 가 주는 글자 상자는 **em 상자**다 — 줄의 어센더~디센더를 다 담는다.
실측(RPM `EHsang-Plain` 8pt): 상자 높이 **9.89pt = 1.24em** 인데 대문자 `O` 의
잉크는 그 안에서 절반 남짓이다. 그래서 em 상자로 「획이 상자 안에 들어왔나」를
물으면 **정본이 38.1% 겹친다**는 답이 나온다. 교과서가 그럴 리 없다.

원점 둘레를 9배로 확대해 보면 `O` 는 두 축 어디에도 **안 닿는다** — 여백이
글자 크기의 0.3배쯤 있다. **정본이 아니라 자가 틀렸다.**
(이 저장소가 여러 번 적은 「축이 틀리면 정본이 틀린 것처럼 나온다」와 같은 자리다.)

## 왜 글꼴에서 못 뽑나

`pymupdf.Font(fontbuffer=…).glyph_bbox()` 는 이 글꼴에서 **모든 글자에 같은 값**을
돌려준다(글꼴 전체의 bbox). 실측으로 확인했다 — `O`·`x`·`0`·`-` 이 전부
`x -0.693~2.797 · y -0.389~1.048` 이다. 못 쓴다.

## 그래서 정본에서 눈금을 맞춘다

**선이 지나지 않는** 글자만 골라 그 자리를 크게 렌더하고 어두운 화소의 상자를 잰다.
그 상자가 em 상자 안에서 차지하는 몫(들여쓴 값)을 글자마다 **중앙값**으로 모은다.

⚠️ **눈금을 못 맞춘 글자는 em 상자로 물러서되 «못 맞췄다»를 세어 찍는다.**
   조용히 물러서면 그 글자들의 겹침이 구조적으로 부풀고, 표는 「전부 쟀다」로 읽힌다.
"""
from __future__ import annotations

import json
import os

import pymupdf

# 어두운 화소로 볼 밝기(0~255). 워터마크는 옅은 회색이라 이 문턱 위로 빠진다.
INK_MAX = 110
# 확대 배율 — 8pt 글자가 64px 이 되어 잉크 경계를 1/8pt 로 읽는다.
ZOOM = 8.0
# 글자마다 이만큼 모이면 충분하다(중앙값을 쓴다).
PER_CHAR = 24


def _dark_bbox(page, clip) -> tuple | None:
    """clip 안의 어두운 화소를 감싸는 상자(지면 좌표). 없으면 None."""
    pm = page.get_pixmap(clip=clip, matrix=pymupdf.Matrix(ZOOM, ZOOM),
                         colorspace=pymupdf.csGRAY, alpha=False)
    data = pm.samples
    w, h, stride = pm.width, pm.height, pm.stride
    x0 = y0 = 10**9
    x1 = y1 = -1
    for row in range(h):
        base = row * stride
        line = data[base:base + w]
        if min(line) > INK_MAX:
            continue
        for col in range(w):
            if line[col] <= INK_MAX:
                if col < x0:
                    x0 = col
                if col > x1:
                    x1 = col
        if row < y0:
            y0 = row
        y1 = row
    if x1 < 0:
        return None
    return (clip.x0 + x0 / ZOOM, clip.y0 + y0 / ZOOM,
            clip.x0 + (x1 + 1) / ZOOM, clip.y0 + (y1 + 1) / ZOOM)


def _median(values: list[float]) -> float:
    s = sorted(values)
    n = len(s)
    return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2


class InkInsets:
    """글자 → em 상자에서 잉크까지 들여쓴 몫(글자 크기 단위)."""

    def __init__(self, table: dict[str, list[float]] | None = None):
        self.table = table or {}
        self.missing: dict[str, int] = {}

    def shrink(self, ch: str, box: tuple, size: float) -> tuple:
        """em 상자 → 잉크 상자. 눈금이 없으면 **그대로 돌려주고 세어 둔다.**"""
        ins = self.table.get(ch)
        if ins is None or size <= 0:
            self.missing[ch] = self.missing.get(ch, 0) + 1
            return box
        left, top, right, bottom = ins
        return (box[0] + left * size, box[1] + top * size,
                box[2] - right * size, box[3] - bottom * size)

    def known(self) -> int:
        return len(self.table)


def calibrate(pages, glyphs_of, strokes_of, cache: str | None = None,
              verbose: bool = True) -> InkInsets:
    """정본에서 글자별 잉크 몫을 잰다.

    `pages` — (page, 쪽번호) 목록.  `glyphs_of(page)` · `strokes_of(page)` 는
    호출자가 준다(추출 규칙을 여기서 다시 적지 않는다).
    """
    if cache and os.path.exists(cache):
        with open(cache, encoding="utf-8") as fh:
            return InkInsets(json.load(fh))

    samples: dict[str, list[tuple]] = {}
    for page, _no in pages:
        glyphs = glyphs_of(page)
        if not glyphs:
            continue
        pts = [p for s in strokes_of(page) for p in s.pts]
        for g in glyphs:
            if len(g.ch) != 1 or g.ch.isspace() or g.size <= 0:
                continue
            got = samples.setdefault(g.ch, [])
            if len(got) >= PER_CHAR:
                continue
            b = g.box
            # ⚠️ **다른 잉크가 상자에 없어야 한다.** 획이 지나가면 그 획까지
            #    잉크로 세어 상자가 커지고, 눈금이 통째로 망가진다.
            if any(b[0] - 0.6 <= p[0] <= b[2] + 0.6 and b[1] - 0.6 <= p[1] <= b[3] + 0.6
                   for p in pts):
                continue
            if any(o is not g and o.box[0] < b[2] and o.box[2] > b[0]
                   and o.box[1] < b[3] and o.box[3] > b[1] for o in glyphs):
                continue
            ink = _dark_bbox(page, pymupdf.Rect(*b))
            if ink is None:
                continue
            got.append((
                (ink[0] - b[0]) / g.size,
                (ink[1] - b[1]) / g.size,
                (b[2] - ink[2]) / g.size,
                (b[3] - ink[3]) / g.size,
            ))

    table = {}
    for ch, rows in samples.items():
        if len(rows) < 4:
            continue
        table[ch] = [_median([r[i] for r in rows]) for i in range(4)]
    if verbose:
        thin = sum(1 for rows in samples.values() if len(rows) < 4)
        print(f"잉크 눈금 — 글자 {len(table)}종 맞춤 "
              f"(표본이 4개 미만이라 못 맞춘 글자 {thin}종)")
        for ch in "O0xy1A":
            if ch in table:
                left, top, right, bottom = table[ch]
                print(f"    «{ch}»  위 {top:.3f} · 아래 {bottom:.3f} · "
                      f"좌 {left:.3f} · 우 {right:.3f}  (잉크 높이 "
                      f"{1.0 - top - bottom + 0.235:.3f}em 쯤)")
    if cache:
        os.makedirs(os.path.dirname(cache) or ".", exist_ok=True)
        with open(cache, "w", encoding="utf-8") as fh:
            json.dump(table, fh, ensure_ascii=False)
    return InkInsets(table)
