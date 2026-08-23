# -*- coding: utf-8 -*-
"""FigureSpec v2 «regions·arcs» 축 실증 — RPM 1-2 색칠·끈 문항 재현.

    python scripts/qa/probe-figure-regions.py

원본 지면(RPM 1-2 p91~93)의 **모양만** 재현한다 — 본문·수치는 베끼지 않는다
(치수 숫자는 문항이 그림에 적어 둔 값 그대로가 아니라 모양 확인용이다).
산출물은 전부 `C:/tmp/v2-regions/` 에 남긴다(D-07 — 병합 검수 때 바로 본다):

  repro-<id>.svg          엔진이 낸 SVG (render_spec.py 실경로 통과)
  repro-<id>.png          Chromium 렌더 (scripts/figure/render-svg-shots.mjs)
  side-<id>.png           원본 오림 | 재현 나란히 (원본 PDF 가 있으면)

렌더 실패는 **던진다** — 조용한 폴백 금지.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = r"C:/tmp/v2-regions"
RPM_PDF = r"C:/Creative/testautocreator/.rpm-src/RPM 중학 1-2 학생용.pdf"
RENDER_SPEC = os.path.join(ROOT, "scripts", "figure", "render_spec.py")
SHOTS_MJS = os.path.join(ROOT, "scripts", "figure", "render-svg-shots.mjs")

# ── 재현 스펙 8개 ──────────────────────────────────────────────────────────
# 원본 오림 좌표는 140dpi 픽셀 기준(px * 72/140 = pt).  (page_index, x0,y0,x1,y1)

SPECS: dict[str, dict] = {}

# ① 0607 — 부채꼴 고리(45°).  안 4 cm + 밖 4 cm, 고리만 채색.
SPECS["0607-annulus"] = {
    "crop": (90, 430, 750, 620, 890),
    "spec": {
        "version": 2,
        "points": {
            "O": [0, 200],
            "Ain": {"type": "on_circle", "circle": "cin", "angle": 45},
            "Aout": {"type": "on_circle", "circle": "cout", "angle": 45},
            "Bin": {"type": "on_circle", "circle": "cin", "angle": 0},
            "Bout": {"type": "on_circle", "circle": "cout", "angle": 0},
        },
        "circles": {
            "cin": {"center": "O", "radius": 80, "draw": False},
            "cout": {"center": "O", "radius": 160, "draw": False},
        },
        "segments": {"sA": ["O", "Aout"], "sB": ["O", "Bout"]},
        "arcs": {
            "arcIn": {"circle": "cin", "from": "Bin", "to": "Ain", "dir": "ccw"},
            "arcOut": {"circle": "cout", "from": "Bout", "to": "Aout", "dir": "ccw"},
        },
        "regions": {
            "ring": {
                "boundary": [
                    {"seg": ["Ain", "Aout"]},
                    {"arc": {"circle": "cout", "from": "Aout", "to": "Bout", "dir": "cw"}},
                    {"seg": ["Bout", "Bin"]},
                    {"arc": {"circle": "cin", "from": "Bin", "to": "Ain", "dir": "ccw"}},
                ],
                "fill": "#f5d9b8",
            },
        },
        "angles": {"angO": {"vertex": "O", "points": ["Bout", "Aout"], "label": "45°"}},
        "dimensions": {
            "dimIn": {"points": ["O", "Ain"], "label": "4 cm"},
            "dimOut": {"points": ["Ain", "Aout"], "label": "4 cm"},
        },
    },
}

# ② 0614 — 꽃잎 4장.  정사각형 + 반원 4개가 가운데서 만난다.
SPECS["0614-petals"] = {
    "crop": (91, 430, 400, 620, 540),
    "spec": {
        "version": 2,
        "points": {
            "TL": [0, 0], "TR": [240, 0], "BL": [0, 240], "BR": [240, 240],
            "M": [120, 120],
            "MT": [120, 0], "MR": [240, 120], "MB": [120, 240], "ML": [0, 120],
        },
        "circles": {
            "cT": {"center": "MT", "radius": 120, "draw": False},
            "cR": {"center": "MR", "radius": 120, "draw": False},
            "cB": {"center": "MB", "radius": 120, "draw": False},
            "cL": {"center": "ML", "radius": 120, "draw": False},
        },
        "segments": {
            "top": ["TL", "TR"], "right": ["TR", "BR"],
            "bottom": ["BL", "BR"], "left": ["TL", "BL"],
            "midV": ["MT", "MB"], "midH": ["ML", "MR"],
        },
        "arcs": {
            "arcT": {"circle": "cT", "from": "TR", "to": "TL", "dir": "cw"},
            "arcR": {"circle": "cR", "from": "BR", "to": "TR", "dir": "cw"},
            "arcB": {"circle": "cB", "from": "BL", "to": "BR", "dir": "cw"},
            "arcL": {"circle": "cL", "from": "TL", "to": "BL", "dir": "cw"},
        },
        "regions": {
            "petalTR": {"boundary": [
                {"arc": {"circle": "cT", "from": "M", "to": "TR", "dir": "ccw"}},
                {"arc": {"circle": "cR", "from": "TR", "to": "M", "dir": "ccw"}},
            ], "fill": "#f5ddc4"},
            "petalTL": {"boundary": [
                {"arc": {"circle": "cT", "from": "TL", "to": "M", "dir": "ccw"}},
                {"arc": {"circle": "cL", "from": "M", "to": "TL", "dir": "ccw"}},
            ], "fill": "#f5ddc4"},
            "petalBL": {"boundary": [
                {"arc": {"circle": "cB", "from": "M", "to": "BL", "dir": "ccw"}},
                {"arc": {"circle": "cL", "from": "BL", "to": "M", "dir": "ccw"}},
            ], "fill": "#f5ddc4"},
            "petalBR": {"boundary": [
                {"arc": {"circle": "cB", "from": "BR", "to": "M", "dir": "ccw"}},
                {"arc": {"circle": "cR", "from": "M", "to": "BR", "dir": "ccw"}},
            ], "fill": "#f5ddc4"},
        },
        "dimensions": {"dimBot": {"points": ["BL", "BR"], "label": "12 cm"}},
    },
}

# ③ 0616 — 정사각형 + 왼변 반원 + 대각선.  위쪽 굽은 삼각형만 채색.
SPECS["0616-semi-diag"] = {
    "crop": (91, 420, 1010, 590, 1170),
    "spec": {
        "version": 2,
        "points": {
            "TL": [0, 0], "TR": [160, 0], "BL": [0, 160], "BR": [160, 160],
            "Mid": [0, 80], "P": [80, 80],
        },
        "circles": {"cL": {"center": "Mid", "radius": 80, "draw": False}},
        "segments": {
            "top": ["TL", "TR"], "right": ["TR", "BR"],
            "bottom": ["BL", "BR"], "left": ["TL", "BL"],
            "diag": ["BL", "TR"], "rad": ["Mid", "P"],
        },
        "arcs": {"semi": {"circle": "cL", "from": "TL", "to": "BL", "dir": "cw"}},
        "regions": {
            "shade": {"boundary": [
                {"arc": {"circle": "cL", "from": "TL", "to": "P", "dir": "cw"}},
                {"seg": ["P", "TR"]},
                {"seg": ["TR", "TL"]},
            ], "fill": "#ded9ea"},
        },
        "dimensions": {
            "dimL": {"points": ["TL", "BL"], "label": "8 cm", "side": "left"},
            "dimB": {"points": ["BL", "BR"], "label": "8 cm"},
        },
    },
}

# ④ 0619 — 정사각형 ABCD 노란 돔(위 반원 + 아래 사분원 두 개, 가운데 뾰족점).
SPECS["0619-dome"] = {
    "crop": (91, 900, 680, 1120, 870),
    "spec": {
        "version": 2,
        "points": {
            "A": [0, 0], "D": [200, 0], "B": [0, 200], "C": [200, 200],
            "L": [0, 100], "R": [200, 100], "Mb": [100, 200], "SqC": [100, 100],
        },
        "circles": {
            "cM": {"center": "SqC", "radius": 100, "draw": False},
            "cB2": {"center": "B", "radius": 100, "draw": False},
            "cC2": {"center": "C", "radius": 100, "draw": False},
        },
        "segments": {
            "top": ["A", "D"], "right": ["D", "C"],
            "bottom": ["B", "C"], "left": ["A", "B"],
        },
        "arcs": {
            "arcTop": {"circle": "cM", "from": "L", "to": "R", "dir": "cw"},
            "arcRight": {"circle": "cC2", "from": "R", "to": "Mb", "dir": "ccw"},
            "arcLeft": {"circle": "cB2", "from": "Mb", "to": "L", "dir": "ccw"},
        },
        "regions": {
            "dome": {"boundary": [
                {"arc": {"circle": "cM", "from": "L", "to": "R", "dir": "cw"}},
                {"arc": {"circle": "cC2", "from": "R", "to": "Mb", "dir": "ccw"}},
                {"arc": {"circle": "cB2", "from": "Mb", "to": "L", "dir": "ccw"}},
            ], "fill": "#fbe4a2"},
        },
        "labels": {
            "A": {"position": "NW"}, "D": {"position": "NE"},
            "B": {"position": "SW"}, "C": {"position": "SE"},
        },
        "dimensions": {
            "dim5a": {"points": ["A", "L"], "label": "5 cm", "side": "left"},
            "dim5b": {"points": ["L", "B"], "label": "5 cm", "side": "left"},
            "dim10": {"points": ["B", "C"], "label": "10 cm"},
        },
    },
}

# ⑤ 0622 — 반원을 A 중심으로 60° 회전.  (회전 반원 ∪ 부채꼴) − 원래 반원 채색.
SPECS["0622-rotate"] = {
    "crop": (92, 430, 400, 620, 540),
    "spec": {
        "version": 2,
        "points": {
            "A": [0, 300],
            "B": {"type": "on_circle", "circle": "cA", "angle": 0},
            "Bp": {"type": "on_circle", "circle": "cA", "angle": 60},
            "M": [100, 300],
            "M2": {"type": "on_circle", "circle": "cA2", "angle": 60},
        },
        "circles": {
            "cA": {"center": "A", "radius": 200, "draw": False},
            "cA2": {"center": "A", "radius": 100, "draw": False},
            "cM": {"center": "M", "radius": 100, "draw": False},
            "cR": {"center": "M2", "radius": 100, "draw": False},
        },
        "segments": {"AB": ["A", "B"], "ABp": ["A", "Bp"]},
        "arcs": {
            "arcOrig": {"circle": "cM", "from": "B", "to": "A", "dir": "ccw"},
            "arcRot": {"circle": "cR", "from": "A", "to": "Bp", "dir": "cw"},
            "arcSec": {"circle": "cA", "from": "Bp", "to": "B", "dir": "cw"},
        },
        "regions": {
            "moon": {"boundary": [
                {"arc": {"circle": "cR", "from": "A", "to": "Bp", "dir": "cw"}},
                {"arc": {"circle": "cA", "from": "Bp", "to": "B", "dir": "cw"}},
                {"arc": {"circle": "cM", "from": "B", "to": "A", "dir": "ccw"}},
            ], "fill": "#d7e6f0"},
        },
        "angles": {"angA": {"vertex": "A", "points": ["B", "Bp"], "label": "60°"}},
        "labels": {
            "A": {"position": "SW"}, "B": {"position": "SE"},
            "Bp": {"text": "B′", "position": "N"},
        },
        "dimensions": {"dimAB": {"points": ["A", "B"], "label": "10 cm"}},
    },
}

# ⑥ 0623 — 직각삼각형(3·4·5)의 각 변 위 반원.  초승달 두 장만 채색.
SPECS["0623-lunes"] = {
    "crop": (92, 420, 820, 620, 960),
    "spec": {
        "version": 2,
        "points": {
            "B": [0, 240], "C": [300, 240], "A": [192, 96],
            "MAB": [96, 168], "MAC": [246, 168], "MBC": [150, 240],
            "RA1": [180.8, 104.4], "RA3": [189.2, 115.6], "RA2": [200.4, 107.2],
        },
        "circles": {
            "cAB": {"center": "MAB", "radius": 120, "draw": False},
            "cAC": {"center": "MAC", "radius": 90, "draw": False},
            "cBC": {"center": "MBC", "radius": 150, "draw": False},
        },
        "segments": {
            "AB": ["A", "B"], "AC": ["A", "C"], "BC": ["B", "C"],
            "ra1": ["RA1", "RA3"], "ra2": ["RA3", "RA2"],
        },
        "arcs": {
            "sAB": {"circle": "cAB", "from": "A", "to": "B", "dir": "ccw"},
            "sAC": {"circle": "cAC", "from": "A", "to": "C", "dir": "cw"},
            "sBC": {"circle": "cBC", "from": "B", "to": "C", "dir": "cw"},
        },
        "regions": {
            "luneL": {"boundary": [
                {"arc": {"circle": "cAB", "from": "A", "to": "B", "dir": "ccw"}},
                {"arc": {"circle": "cBC", "from": "B", "to": "A", "dir": "cw"}},
            ], "fill": "#f7ddd6"},
            "luneR": {"boundary": [
                {"arc": {"circle": "cAC", "from": "A", "to": "C", "dir": "cw"}},
                {"arc": {"circle": "cBC", "from": "C", "to": "A", "dir": "ccw"}},
            ], "fill": "#f7ddd6"},
        },
        "labels": {
            "A": {"position": "N"}, "B": {"position": "W"}, "C": {"position": "E"},
        },
        "dimensions": {
            # inset 20 — 직각 기호 다리가 두 빗변 위 14px 지점에 있어,
            # 치수 곡선이 기호를 지나서 시작해야 교차하지 않는다.
            "dimAB": {"points": ["A", "B"], "label": "4 cm", "side": "right", "inset": 20},
            "dimAC": {"points": ["A", "C"], "label": "3 cm", "side": "left", "inset": 20},
            "dimBC": {"points": ["B", "C"], "label": "5 cm"},
        },
    },
}

# ⑦ 0626 — 끈(원기둥 3개).  원 3개 + 접선 3개 + 120° 호 3개 — 호 스트로크 실증.
SPECS["0626-belt3"] = {
    "crop": (92, 950, 840, 1120, 1000),
    "spec": {
        "version": 2,
        "points": {
            "O1": [150, 100],
            "O2": {"type": "on_circle", "circle": "cH", "angle": 240},
            "O3": {"type": "on_circle", "circle": "cH", "angle": 300},
            "T1L": {"type": "on_circle", "circle": "c1", "angle": 150},
            "T1R": {"type": "on_circle", "circle": "c1", "angle": 30},
            "T2L": {"type": "on_circle", "circle": "c2", "angle": 150},
            "T2B": {"type": "on_circle", "circle": "c2", "angle": 270},
            "T3B": {"type": "on_circle", "circle": "c3", "angle": 270},
            "T3R": {"type": "on_circle", "circle": "c3", "angle": 30},
        },
        "circles": {
            "cH": {"center": "O1", "radius": 180, "draw": False},
            "c1": {"center": "O1", "radius": 90},
            "c2": {"center": "O2", "radius": 90},
            "c3": {"center": "O3", "radius": 90},
        },
        "segments": {
            "beltL": ["T1L", "T2L"], "beltB": ["T2B", "T3B"], "beltR": ["T3R", "T1R"],
        },
        "arcs": {
            "b1": {"circle": "c1", "from": "T1R", "to": "T1L", "dir": "ccw"},
            "b2": {"circle": "c2", "from": "T2L", "to": "T2B", "dir": "ccw"},
            "b3": {"circle": "c3", "from": "T3B", "to": "T3R", "dir": "ccw"},
        },
        "dimensions": {"dimR": {"points": ["O1", "T1R"], "label": "3 cm"}},
    },
}

# ⑧ 0625 — 끈(원기둥 6개, 2×3).  모서리 4곳 90° 호 + 접선 4개.
SPECS["0625-belt6"] = {
    "crop": (92, 930, 390, 1120, 570),
    "spec": {
        "version": 2,
        "points": {
            "Otl": [110, 60], "Otr": [220, 60], "Oml": [110, 170],
            "Omr": [220, 170], "Obl": [110, 280], "Obr": [220, 280],
            "TtlT": {"type": "on_circle", "circle": "ctl", "angle": 90},
            "TtrT": {"type": "on_circle", "circle": "ctr", "angle": 90},
            "TtlL": {"type": "on_circle", "circle": "ctl", "angle": 180},
            "TblL": {"type": "on_circle", "circle": "cbl", "angle": 180},
            "TblB": {"type": "on_circle", "circle": "cbl", "angle": 270},
            "TbrB": {"type": "on_circle", "circle": "cbr", "angle": 270},
            "TbrR": {"type": "on_circle", "circle": "cbr", "angle": 0},
            "TtrR": {"type": "on_circle", "circle": "ctr", "angle": 0},
        },
        "circles": {
            "ctl": {"center": "Otl", "radius": 55}, "ctr": {"center": "Otr", "radius": 55},
            "cml": {"center": "Oml", "radius": 55}, "cmr": {"center": "Omr", "radius": 55},
            "cbl": {"center": "Obl", "radius": 55}, "cbr": {"center": "Obr", "radius": 55},
        },
        "segments": {
            "beltT": ["TtrT", "TtlT"], "beltL": ["TtlL", "TblL"],
            "beltB": ["TblB", "TbrB"], "beltR": ["TbrR", "TtrR"],
        },
        "arcs": {
            "atl": {"circle": "ctl", "from": "TtlT", "to": "TtlL", "dir": "ccw"},
            "abl": {"circle": "cbl", "from": "TblL", "to": "TblB", "dir": "ccw"},
            "abr": {"circle": "cbr", "from": "TbrB", "to": "TbrR", "dir": "ccw"},
            "atr": {"circle": "ctr", "from": "TtrR", "to": "TtrT", "dir": "ccw"},
        },
        # font_size 12 — 반지름 55 원 안에서 fs 15 라벨 상자는 모서리가
        # 원둘레를 2.7px 넘어 엔진이 (옳게) 거부한다.
        "dimensions": {"dimR": {"points": ["Otr", "TtrT"], "label": "2 cm",
                                 "font_size": 12}},
    },
}


def render_one(name: str, spec: dict) -> str:
    """render_spec.py(제품 실경로)로 스펙 → SVG.  실패는 던진다."""

    proc = subprocess.run(
        [sys.executable, RENDER_SPEC],
        input=json.dumps(spec, ensure_ascii=False).encode("utf-8"),
        capture_output=True, cwd=ROOT, timeout=60,
    )
    out = json.loads(proc.stdout.decode("utf-8"))
    if "error" in out:
        raise RuntimeError(f"{name}: {out['error']}")
    return out["svg"]


def viewbox_wh(svg: str) -> tuple[float, float]:
    head = svg.split(">", 1)[0]
    vb = head.split('viewBox="', 1)[1].split('"', 1)[0].split()
    return float(vb[2]), float(vb[3])


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    jobs = []
    for name, entry in SPECS.items():
        svg = render_one(name, entry["spec"])
        svg_path = os.path.join(OUT, f"repro-{name}.svg")
        with open(svg_path, "w", encoding="utf-8") as fh:
            fh.write(svg)
        w, h = viewbox_wh(svg)
        scale = min(2.0, 760.0 / max(w, h))
        jobs.append({
            "svg": svg_path,
            "png": os.path.join(OUT, f"repro-{name}.png"),
            "w": int(round(w * scale)), "h": int(round(h * scale)),
        })
        print(f"repro {name}: {len(svg)} bytes, viewBox {w:g}x{h:g}")

    jobs_path = os.path.join(OUT, "jobs.json")
    with open(jobs_path, "w", encoding="utf-8") as fh:
        json.dump(jobs, fh, ensure_ascii=False)
    shots = subprocess.run(["node", SHOTS_MJS, jobs_path],
                           capture_output=True, cwd=ROOT, timeout=300)
    print(shots.stdout.decode("utf-8", "replace").strip())
    if shots.returncode != 0:
        raise RuntimeError(f"render-svg-shots 실패: {shots.stderr.decode('utf-8', 'replace')[:400]}")

    # 원본 오림 + 나란히 붙이기 — 원본 PDF 가 있는 컴퓨터에서만.
    if not os.path.isfile(RPM_PDF):
        print(f"원본 PDF 없음({RPM_PDF}) — side-*.png 생략")
        return
    import fitz  # noqa: PLC0415
    from PIL import Image  # noqa: PLC0415
    doc = fitz.open(RPM_PDF)
    for name, entry in SPECS.items():
        pno, x0, y0, x1, y1 = entry["crop"]
        s = 72 / 140  # crop 좌표는 140dpi 픽셀 기준
        pix = doc[pno].get_pixmap(dpi=300, clip=fitz.Rect(x0 * s, y0 * s, x1 * s, y1 * s))
        crop_path = os.path.join(OUT, f"orig-{name}.png")
        pix.save(crop_path)
        left = Image.open(crop_path).convert("RGB")
        right = Image.open(os.path.join(OUT, f"repro-{name}.png")).convert("RGB")
        height = 420
        left = left.resize((int(left.width * height / left.height), height))
        right = right.resize((int(right.width * height / right.height), height))
        board = Image.new("RGB", (left.width + right.width + 24, height), "#ffffff")
        board.paste(left, (0, 0))
        board.paste(right, (left.width + 24, 0))
        board.save(os.path.join(OUT, f"side-{name}.png"))
        print(f"side {name}: {board.width}x{board.height}")


if __name__ == "__main__":
    main()
