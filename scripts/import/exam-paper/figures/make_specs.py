# -*- coding: utf-8 -*-
"""정화중 25-2-중간 그림 스펙 — **기하 조건에서 좌표를 계산**해 FigureSpec v2 로 낸다.

손으로 좌표를 적으면 지면에 적힌 수와 그림의 비가 어긋난다(문2 에서 실제로 1:2 로
그렸다 — 적힌 값은 6:8). 그래서 여기서는 **발문이 주는 값**(길이·각)으로 점을 잡고,
`verify_specs.py` 가 그 좌표를 되짚어 적힌 수와 맞는지 검산한다.

출력: spec/qNN.json
"""
from __future__ import annotations

import json
import math
import pathlib

OUT = pathlib.Path(__file__).parent / "spec"
OUT.mkdir(exist_ok=True)

D2R = math.pi / 180.0


def pol(cx: float, cy: float, r: float, deg: float) -> list[float]:
    """화면 좌표(y 아래로 증가)에서 중심 (cx,cy) · 반지름 r · 각 deg 인 점."""
    return [round(cx + r * math.cos(deg * D2R), 2), round(cy + r * math.sin(deg * D2R), 2)]


def line_inter(p, q, r, s):
    """직선 pq 와 rs 의 교점."""
    x1, y1 = p; x2, y2 = q; x3, y3 = r; x4, y4 = s
    d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    if abs(d) < 1e-9:
        raise ValueError("평행")
    a = x1 * y2 - y1 * x2
    b = x3 * y4 - y3 * x4
    return [round((a * (x3 - x4) - (x1 - x2) * b) / d, 2),
            round((a * (y3 - y4) - (y1 - y2) * b) / d, 2)]


def tangent_meet(cx, cy, r, t1, t2):
    """원 위 각 t1·t2 에서 그은 두 접선의 교점 (외심 방향 공식)."""
    half = (t1 - t2) / 2.0
    return pol(cx, cy, r / math.cos(half * D2R), (t1 + t2) / 2.0)


def bisect(f, lo, hi, n=200):
    """f(lo)·f(hi) < 0 인 구간에서 근을 찾는다."""
    flo = f(lo)
    for _ in range(n):
        mid = (lo + hi) / 2
        fm = f(mid)
        if (flo < 0) == (fm < 0):
            lo, flo = mid, fm
        else:
            hi = mid
    return (lo + hi) / 2


def write(name: str, spec: dict) -> None:
    (OUT / f"{name}.json").write_text(
        json.dumps(spec, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"[{name}] 점 {len(spec.get('points', {}))}개")


# ── 문1 · 직사각형 접기 (AD=37, AB=12, D→E on BC) ────────────────────────────
# 접으면 AE=AD=37 이므로 BE=√(37²−12²)=35. F 는 FD=FE 를 만족하는 DC 위의 점.
k = 6.0                      # 1cm = 6px
W, H = 37 * k, 12 * k
Ax, Ay = 30.0, 34.0
be = math.sqrt(37 ** 2 - 12 ** 2)                 # 35
fd = (12 ** 2 + (37 - be) ** 2) / (2 * 12) if False else (144 + (12 - be) ** 2) / 24
# FD=t, FC=12−t, EC=37−be, FE=FD → t² = (12−t)² + (37−be)²
ec = 37 - be
fd = (144 + ec ** 2) / 24.0
write("q01", {
    "version": 2,
    "points": {
        "A": [Ax, Ay], "D": [round(Ax + W, 2), Ay],
        "B": [Ax, round(Ay + H, 2)], "C": [round(Ax + W, 2), round(Ay + H, 2)],
        "E": [round(Ax + be * k, 2), round(Ay + H, 2)],
        "F": [round(Ax + W, 2), round(Ay + fd * k, 2)],
    },
    "segments": {"AB": ["A", "B"], "BC": ["B", "C"], "CD": ["C", "D"], "DA": ["D", "A"],
                 "AF": ["A", "F"], "FE": ["F", "E"], "AE": ["A", "E"]},
    "regions": {
        # 원본은 음영이 **두 겹**이다 — 접히기 전 자리(옅게)와 접힌 조각(진하게).
        "flat": {"boundary": [{"seg": ["A", "B"]}, {"seg": ["B", "E"]}, {"seg": ["E", "A"]}],
                 "fill": "#f1f1f1"},
        "fold": {"boundary": [{"seg": ["A", "F"]}, {"seg": ["F", "E"]}, {"seg": ["E", "A"]}],
                 "fill": "#c9c9c9"},   # 휘도 하한(0.78) 때문에 더 진하게는 못 간다
    },
    "angles": {"angx": {"vertex": "F", "points": ["E", "C"], "label": "x"}},
    "dimensions": {
        "dimAD": {"points": ["A", "D"], "label": "37cm", "side": "auto"},
        "dimAB": {"points": ["A", "B"], "label": "12cm", "side": "left"},
    },
    "labels": {"A": "A", "B": "B", "C": "C", "D": "D", "E": "E", "F": "F"},
})

# ── 문9 · 삼각형 ABC (AC=12, ∠A=30°, ∠C=15°) ───────────────────────────────
k = 15.0
Ax, Ay = 28.0, 148.0
ac = 12 * k
A = [Ax, Ay]
C = pol(Ax, Ay, ac, -30)                       # ∠A 를 밑변(수평)에서 30° 위로
ab = 12 * math.sin(15 * D2R) / math.sin(135 * D2R) * k
B = [round(Ax + ab, 2), Ay]
write("q09", {
    "version": 2,
    "points": {"A": A, "B": B, "C": C},
    "segments": {"AB": ["A", "B"], "BC": ["B", "C"], "CA": ["C", "A"]},
    "angles": {"angA": {"vertex": "A", "points": ["B", "C"], "label": "30°", "radius": 34},
               "angC": {"vertex": "C", "points": ["A", "B"], "label": "15°"}},
    "dimensions": {"dimAC": {"points": ["A", "C"], "label": "12", "side": "auto"}},
    "labels": {"A": "A", "B": "B", "C": "C"},
})

# ── 문15 · 정사각형 ABCD (M=BC 중점, CN=2DN) ───────────────────────────────
s = 180.0
Ax, Ay = 35.0, 30.0
A = [Ax, Ay]; D = [Ax + s, Ay]; B = [Ax, Ay + s]; C = [Ax + s, Ay + s]
M = [Ax + s / 2, Ay + s]                        # BC(아래 변)의 중점
N = [Ax + s, Ay + s / 3]                        # CD 위, CN=2DN → D 에서 1/3
write("q15", {
    "version": 2,
    "points": {"A": A, "B": B, "C": C, "D": D, "M": M, "N": N},
    "segments": {
        "AD": ["A", "D"], "DC": ["D", "C"], "CB": ["C", "B"], "BA": ["B", "A"],
        "AM": ["A", "M"], "AN": ["A", "N"], "MN": ["M", "N"],
        "BM": {"points": ["B", "M"], "ticks": 2},
        "MC": {"points": ["M", "C"], "ticks": 2},
    },
    "angles": {"angx": {"vertex": "A", "points": ["M", "N"], "label": "x"}},
    "labels": {"A": "A", "B": "B", "C": "C", "D": "D", "M": "M", "N": "N"},
})

# ── 문16 · ∠APB=60° 인 점 P (AB=9) ─────────────────────────────────────────
k = 20.0
A = [30.0, 175.0]
B = [round(30.0 + 9 * k, 2), 175.0]
# ∠P=60° 을 만족하는 한 점 — 정현법칙으로 PA 를 잡고 A 에서 각을 준다
# ∠A=45° · ∠B=75° · ∠P=60° — 원본처럼 P 가 오른쪽 위에 온다.
pa = 9 * math.sin(75 * D2R) / math.sin(60 * D2R) * k
P = pol(A[0], A[1], pa, -45)
write("q16", {
    "version": 2,
    "points": {"A": A, "B": B, "P": P},
    "segments": {"PA": {"points": ["P", "A"], "dash": "6 4"},
                 "PB": {"points": ["P", "B"], "dash": "6 4"},
                 "AB": ["A", "B"]},
    "angles": {"angP": {"vertex": "P", "points": ["A", "B"], "label": "60°"}},
    "dimensions": {"dimAB": {"points": ["A", "B"], "label": "9", "side": "auto"}},
    "labels": {"A": "A", "B": "B", "P": "P"},
})

# ── 문18 · 반원 위의 ∠ABC=90° ──────────────────────────────────────────────
cx, cy, r = 150.0, 155.0, 120.0
write("q18", {
    "version": 2,
    "points": {"O": [cx, cy], "A": pol(cx, cy, r, 180), "C": pol(cx, cy, r, 0),
               "B": pol(cx, cy, r, -38)},
    "circles": {"c": {"center": "O", "radius": r, "draw": False},
                "dotO": {"center": "O", "radius": 2.3}},
    "arcs": {"half": {"circle": "c", "from": "A", "to": "C", "dir": "cw"}},
    "segments": {"AC": ["A", "C"], "AB": ["A", "B"], "BC": ["B", "C"]},
    "labels": {"O": "O", "A": "A", "B": "B", "C": "C"},
})

# ── 문19 · 원 위에 같은 간격으로 4개 / 10개 ────────────────────────────────
for n, name in ((4, "q19a"), (10, "q19b")):
    cx, cy, r = 110.0, 110.0, 88.0
    pts = {f"P{i+1}": pol(cx, cy, r, -90 + 360 * i / n) for i in range(n)}
    # 🔴 점을 **실제로 찍는다**. 이 문항은 「원 위의 점 n개」가 전부라 점이 안
    #    보이면 그림이 아무것도 안 말한다. `style.show_points` 는 **선분·각이
    #    참조하는 점만** 찍는데 이 그림에는 선분이 없다 — 그래서 작은 원으로 그린다.
    #    중심 O 에는 점을 안 찍는다(원본에 없다 — 찍으면 학생이 점 하나를 더 센다).
    circles = {"c": {"center": "O", "radius": r}}
    circles.update({f"d{i+1}": {"center": f"P{i+1}", "radius": 2.3} for i in range(n)})
    write(name, {
        "version": 2,
        # ⚠️ `circle_width` 를 키우면 **원 둘레까지 굵어진다** — 원본은 가는 원에
        #    진한 점이다. 기본 굵기(1.9)에 반지름 2.3 이면 구멍이 0.45px 라 점으로 보인다.
        "points": {"O": [cx, cy], **pts},
        "circles": circles,
        "labels": {},
    })

# ── 문6 · 내접원 사각형 — 접선 길이로 풀어야 AB=8·BC=5·AD=10 이 맞는다 ────────
# 꼭짓점 접선 길이 a,b,c,d 에 대해 a+b=8, b+c=5, c+d=7(=AD+BC−AB), d+a=10.
a_, b_, c_, d_ = 5.0, 3.0, 2.0, 5.0
# 내접원 반지름 r: Σ 2·arctan(t/r) = 360°
r6 = bisect(lambda r: sum(2 * math.degrees(math.atan(t / r))
                          for t in (a_, b_, c_, d_)) - 360.0, 0.3, 40.0)
k6 = 17.5                                    # 1단위 = 17.5px (원본만큼 크게)
cx6, cy6 = 158.0, 150.0
# 접점 각을 차례로 쌓는다: P(AD) → A → Q(AB) → B → R(BC) → C → S(CD) → D → P
# 각을 **줄이며** 돈다 — 늘리며 돌면 A 가 오른쪽 위로 가서 원본과 좌우가 뒤집힌다.
start = -80.0
dP = start
dQ = dP - 2 * math.degrees(math.atan(a_ / r6))
dR = dQ - 2 * math.degrees(math.atan(b_ / r6))
dS = dR - 2 * math.degrees(math.atan(c_ / r6))
R6 = r6 * k6
write("q06", {
    "version": 2,
    "points": {
        "O": [cx6, cy6],
        "P": pol(cx6, cy6, R6, dP), "Q": pol(cx6, cy6, R6, dQ),
        "R": pol(cx6, cy6, R6, dR), "S": pol(cx6, cy6, R6, dS),
        "A": tangent_meet(cx6, cy6, R6, dP, dQ),
        "B": tangent_meet(cx6, cy6, R6, dQ, dR),
        "C": tangent_meet(cx6, cy6, R6, dR, dS),
        "D": tangent_meet(cx6, cy6, R6, dS, dP - 360),
    },
    "circles": {"c": {"center": "O", "radius": round(R6, 2)}},
    "segments": {"AB": ["A", "B"], "BC": ["B", "C"], "CD": ["C", "D"], "DA": ["D", "A"]},
    "dimensions": {
        "dimAD": {"points": ["A", "D"], "label": "10", "side": "auto"},
        "dimAB": {"points": ["A", "B"], "label": "8", "side": "auto"},
        "dimBC": {"points": ["B", "C"], "label": "5", "side": "auto"},
    },
    "labels": {"A": "A", "B": "B", "C": "C", "D": "D", "O": "O",
               "P": "P", "Q": "Q", "R": "R", "S": "S"},
})

# ── 문8 · ∠ABO=80° → △OAB 는 이등변이므로 호 AB = 180−2·80 = 20° ────────────
cx, cy, r = 145.0, 148.0, 105.0
tB, tA = -152.0, -132.0                        # 20° 차이
write("q08", {
    "version": 2,
    "points": {"O": [cx, cy],
               "A": pol(cx, cy, r, tA), "B": pol(cx, cy, r, tB),
               "C": pol(cx, cy, r, 158), "D": pol(cx, cy, r, 72),
               "E": pol(cx, cy, r, -8)},
    "circles": {"c": {"center": "O", "radius": r}},
    "segments": {"AB": ["A", "B"], "BC": ["B", "C"], "CD": ["C", "D"],
                 "DE": ["D", "E"], "EA": ["E", "A"],
                 "AO": ["A", "O"], "BO": ["B", "O"],
                 "AC": ["A", "C"], "AD": ["A", "D"]},
    "angles": {"angABO": {"vertex": "B", "points": ["A", "O"], "label": "80°"},
               "angBCD": {"vertex": "C", "points": ["B", "D"]},
               "angAED": {"vertex": "E", "points": ["A", "D"]}},
    "labels": {"A": "A", "B": "B", "C": "C", "D": "D", "E": "E", "O": "O"},
})

# ── 문10 · ∠BTC=30° → 호 BC=60° · ∠BPT=24° → 호 TB − 호 TA = 48° ───────────
cx, cy, r = 292.0, 130.0, 102.0
tT = 90.0
# 호 TC 는 자유변수다 — 키우면 P 가 멀어져 그림이 옆으로 길어지고,
# 그러면 지면 등급에 눌려 **라벨이 본문보다 작아진다**(실측 12.40px).
arc_TC, arc_CB = 42.0, 60.0
tC = tT - arc_TC
tB = tC - arc_CB
tA = tT + (arc_TC + arc_CB - 48.0)             # 호 TA = 호 TB − 48
T, C, B, A = (pol(cx, cy, r, t) for t in (tT, tC, tB, tA))
tdir = (-math.sin(tT * D2R), math.cos(tT * D2R))
P = line_inter(T, [T[0] + tdir[0] * 100, T[1] + tdir[1] * 100], A, B)
write("q10", {
    "version": 2,
    "points": {"O": [cx, cy], "T": T, "C": C, "B": B, "A": A, "P": P},
    "circles": {"c": {"center": "O", "radius": r}},
    "segments": {"PB": ["P", "B"], "PT": ["P", "T"], "TB": ["T", "B"],
                 "TC": ["T", "C"], "BC": ["B", "C"]},
    "angles": {"angP": {"vertex": "P", "points": ["T", "B"], "label": "24°"},
               "angBTC": {"vertex": "T", "points": ["B", "C"], "label": "30°"}},
    "labels": {"O": "O", "T": "T", "C": "C", "B": "B", "A": "A", "P": "P"},
})

# ── 문11 · OB=6(반지름) · AP=10(접선) → ∠AOP = arctan(10/6) ─────────────────
k11 = 10.5
r11 = 6 * k11
half = math.degrees(math.atan(10.0 / 6.0))
cx, cy = 178.0, 112.0
tA, tB = 180 + half, 180 - half          # A 가 위, B 가 아래 (원본 배치)
write("q11", {
    "version": 2,
    "points": {"O": [cx, cy], "A": pol(cx, cy, r11, tA), "B": pol(cx, cy, r11, tB),
               "P": tangent_meet(cx, cy, r11, tA, tB),
               # x 를 놓을 자리 — PO 는 원을 가로질러 치수 곡선이 못 들어간다.
               "X": [round((tangent_meet(cx, cy, r11, tA, tB)[0] + cx) / 2, 2),
                     round(cy - 12, 2)]},
    "circles": {"c": {"center": "O", "radius": round(r11, 2)}},
    "segments": {"PA": ["P", "A"], "PB": ["P", "B"], "PO": ["P", "O"],
                 "OA": ["O", "A"], "OB": ["O", "B"], "AB": ["A", "B"]},
    "dimensions": {
        "dimPA": {"points": ["P", "A"], "label": "10", "side": "auto"},
        "dimOB": {"points": ["O", "B"], "label": "6", "side": "auto"},
        # 🔴 발문이 **x²+y² 를 묻는다** — 그림에 x·y 가 없으면 문항이 성립하지 않는다.
        "dimPB": {"points": ["P", "B"], "label": "y", "side": "auto"},
    },
    "labels": {"O": "O", "A": "A", "B": "B", "P": "P",
               "X": {"text": "x", "italic": True}},
})

# ── 문13 · ∠BDC=58°(원주각) → 호 BC = 116° · CD 는 지름 ────────────────────
cx, cy, r = 170.0, 122.0, 72.0
tC = 198.0
tD = tC - 180
tB = tC - 116.0
_A13 = tangent_meet(cx, cy, r, tB, tC)
_B13, _C13 = pol(cx, cy, r, tB), pol(cx, cy, r, tC)
_ext = lambda p, t: [round(_A13[0] + (p[0] - _A13[0]) * t, 2),
                     round(_A13[1] + (p[1] - _A13[1]) * t, 2)]
write("q13", {
    "version": 2,
    "points": {"O": [cx, cy], "B": pol(cx, cy, r, tB), "C": pol(cx, cy, r, tC),
               "D": pol(cx, cy, r, tD), "A": tangent_meet(cx, cy, r, tB, tC),
               "TB": _ext(_B13, 1.5), "TC": _ext(_C13, 1.35)},
    "circles": {"c": {"center": "O", "radius": r}},
    "segments": {"AB": ["A", "TB"], "AC": ["A", "TC"], "CD": ["C", "D"],
                 "BD": ["B", "D"], "BC": ["B", "C"]},
    "angles": {"angBDC": {"vertex": "D", "points": ["B", "C"], "label": "58°"}},
    "labels": {"O": "O", "A": "A", "B": "B", "C": "C", "D": "D"},
})

# ── 문17 · N 을 AC 위에서 **풀어서** 잡는다 (∠CNM=30°) ──────────────────────
k = 62.0
A = [45.0, 300.0]
B = [round(45.0 + 2 * k, 2), 300.0]
am = 2 * math.sin(75 * D2R) / math.sin(45 * D2R) * k
M = pol(A[0], A[1], am, -60)
bm = 2 * math.sin(60 * D2R) / math.sin(45 * D2R) * k
ang_bm = math.atan2(M[1] - B[1], M[0] - B[0]) / D2R
bc = 2 * math.sin(75 * D2R) / math.sin(30 * D2R) * k
C = pol(B[0], B[1], bc, ang_bm)


def ang_at(v, p, q):
    a = (p[0] - v[0], p[1] - v[1]); b = (q[0] - v[0], q[1] - v[1])
    cos = (a[0] * b[0] + a[1] * b[1]) / (math.hypot(*a) * math.hypot(*b))
    return math.degrees(math.acos(max(-1.0, min(1.0, cos))))


def cnm(s):
    N = [A[0] + (C[0] - A[0]) * s, A[1] + (C[1] - A[1]) * s]
    return ang_at(N, C, M) - 30.0


s = bisect(cnm, 0.05, 0.95)
N = [round(A[0] + (C[0] - A[0]) * s, 2), round(A[1] + (C[1] - A[1]) * s, 2)]
write("q17", {
    "version": 2,
    "points": {"A": A, "B": B, "C": C, "M": M, "N": N},
    "segments": {"AB": ["A", "B"], "BM": ["B", "M"], "MC": ["M", "C"],
                 "CN": ["C", "N"], "NA": ["N", "A"],
                 "AM": ["A", "M"], "MN": ["M", "N"]},
    "angles": {"angMAB": {"vertex": "A", "points": ["M", "B"], "label": "60°"},
               "angAMB": {"vertex": "M", "points": ["A", "B"], "label": "45°"},
               "angC": {"vertex": "C", "points": ["N", "M"], "label": "30°"},
               "angCNM": {"vertex": "N", "points": ["C", "M"], "label": "30°"}},
    "dimensions": {"dimAB": {"points": ["A", "B"], "label": "2", "side": "auto"}},
    "labels": {"A": "A", "B": "B", "C": "C", "M": "M", "N": "N"},
})

print(f"내접원 r={r6:.3f}단위 · 문17 N 위치 s={s:.3f}")


# ── 문12 · 접선현각 60° · BD:AE = 2:3 · AB=10 ──────────────────────────────
# 접선과 현 AE 가 이루는 각 60° → 호 AE = 120° → AE = 2r·sin60.
# BD:AE = 2:3 → BD = (2/3)·AE → 호 BD = 2·arcsin(BD/2r).
cx12, cy12, r12 = 152.0, 150.0, 100.0
tA = 90.0                                        # 접점 A 는 아래쪽 (접선이 수평)
tE = tA - 120.0                                  # 호 AE = 120°
ae = 2 * r12 * math.sin(60 * D2R)
bd = ae * 2.0 / 3.0
arc_bd = 2 * math.degrees(math.asin(bd / (2 * r12)))
# B 위치는 자유변수다 — C 가 원 **가까이 밖**에 오도록 고른다(|OC|≈1.43r).
# 나란해지는 자리(tB≈175°)에서는 C 가 수천 px 밖으로 날아간다.
tB = 230.0
tD = tB + arc_bd
A12 = pol(cx12, cy12, r12, tA)
E12 = pol(cx12, cy12, r12, tE)
B12 = pol(cx12, cy12, r12, tB)
D12 = pol(cx12, cy12, r12, tD)
C12 = line_inter(B12, D12, A12, E12)             # 두 할선이 만나는 원 밖의 점
F12 = line_inter(B12, E12, A12, D12)             # BE 와 AD 의 교점
TL = [round(A12[0] - 92, 2), A12[1]]             # 접선의 왼쪽 끝
TR = [round(A12[0] + 92, 2), A12[1]]
write("q12", {
    "version": 2,
    "points": {"O": [cx12, cy12], "A": A12, "B": B12, "C": C12,
               "D": D12, "E": E12, "F": F12, "TL": TL, "TR": TR},
    "circles": {"c": {"center": "O", "radius": r12}},
    "segments": {"tan": ["TL", "TR"], "AB": ["A", "B"],
                 "AF": ["A", "F"], "FD": ["F", "D"], "DC": ["D", "C"],
                 "BF": ["B", "F"], "FE": ["F", "E"], "EC": ["E", "C"],
                 "AE": ["A", "E"]},
    "angles": {"angTAE": {"vertex": "A", "points": ["TR", "E"], "label": "60°"}},
    "dimensions": {"dimAB": {"points": ["A", "B"], "label": "10", "side": "auto"}},
    "labels": {"O": "O", "A": "A", "B": "B", "C": "C",
               "D": "D", "E": "E", "F": "F"},
})


# ── 손으로 좌표를 잡은 넷도 **여기서** 쓴다 (쓰는 자를 하나로) ──────────────
write("q02", {                       # 삼각형 AB=6 · ∠B=60° · BC=8
    "version": 2,
    "points": {"B": [25, 148], "C": [215, 148], "A": [96, 25]},
    "segments": {"AB": ["A", "B"], "BC": ["B", "C"], "CA": ["C", "A"]},
    "angles": {"angB": {"vertex": "B", "points": ["A", "C"], "label": "60°"}},
    "dimensions": {"dimAB": {"points": ["A", "B"], "label": "6", "side": "auto"},
                   "dimBC": {"points": ["B", "C"], "label": "8", "side": "auto"}},
    "labels": {"A": "A", "B": "B", "C": "C"},
})

write("q04", {                       # 반지름 1 인 사분원 · OB=3/5
    "version": 2,
    "points": {"O": [30, 240], "D": [180, 240], "T": [30, 90],
               "B": [120, 240], "A": [120, 120], "C": [180, 40]},
    "circles": {"c": {"center": "O", "radius": 150, "draw": False}},
    "arcs": {"quad": {"circle": "c", "from": "T", "to": "D", "dir": "cw"}},
    "segments": {"OT": ["O", "T"], "OD": ["O", "D"], "OC": ["O", "C"],
                 "AB": ["A", "B"], "CD": ["C", "D"]},
    "angles": {"rB": {"vertex": "B", "points": ["A", "D"], "right": True},
               "rD": {"vertex": "D", "points": ["C", "O"], "right": True}},
    # 아래 치수는 점 차례를 뒤집어 **반대쪽**에 놓는다 — 그대로 두면 B 라벨과 겹친다.
    "dimensions": {"dimOT": {"points": ["O", "T"], "label": "1", "side": "auto"},
                   "dimOD": {"points": ["D", "O"], "label": "1", "side": "auto"}},
    # 🔴 B 라벨은 **직각 표시 왼쪽·도형 안쪽**으로 못 박는다 (원장님 2026-09-05).
    #    자동 배치는 직각 표시와 아래 치수 「1」을 둘 다 피하려다 B 를 D 쪽으로 멀리
    #    밀어내서, 지면에서 **B 가 어느 점인지 안 보였다.** 여기는 자동이 고를 수 있는
    #    자리가 없다 — 아래도 오른쪽도 막혀 있으므로 안쪽(NW)이 유일하게 남은 자리다.
    #    NW 가 비어 있는지는 계산으로 확인했다: x=112 에서 대각선 OC 는 y≈131,
    #    호는 y≈114 로 둘 다 훨씬 위다(라벨은 y≈232).
    "labels": {"O": "O", "A": "A", "C": "C", "D": "D",
               "B": {"text": "B", "position": "NW"}},
})

write("q05", {                       # 삼각형 + 수선 AH · ∠B=55° · ∠C=40° · BC=8
    "version": 2,
    "points": {"B": [25, 130], "C": [214, 130], "H": [95, 130], "A": [95, 30]},
    "segments": {"AB": ["A", "B"], "BC": ["B", "C"], "CA": ["C", "A"], "AH": ["A", "H"]},
    "angles": {"angB": {"vertex": "B", "points": ["A", "C"], "label": "55°"},
               "angC": {"vertex": "C", "points": ["A", "B"], "label": "40°"},
               "rH": {"vertex": "H", "points": ["A", "C"], "right": True}},
    # 「8」 을 H 반대쪽으로 — 같은 쪽에 두면 H 라벨과 겹친다.
    # 「8」 은 **더 아래로** 민다 — 기본 자리는 수선의 발 H 라벨과 겹친다.
    "dimensions": {"dimBC": {"points": ["B", "C"], "label": "8", "side": "auto",
                             "offset": 26}},
    "labels": {"A": "A", "B": "B", "C": "C", "H": "H"},
})

write("q07", {                       # 접선 AD · ∠AOC=150°
    "version": 2,
    "points": {"O": [140, 110], "A": [140, 190], "C": [180, 41],
               "B": [205.6, 161.4],            # 원본처럼 A 가까운 오른쪽 아래
               "D": [60, 190], "R": [250, 190]},
    "circles": {"c": {"center": "O", "radius": 80}},
    "segments": {"DR": ["D", "R"], "OA": ["O", "A"], "OC": ["O", "C"],
                 "CA": ["C", "A"], "CB": ["C", "B"], "BA": ["B", "A"]},
    "angles": {"angAOC": {"vertex": "O", "points": ["C", "A"], "label": "150°", "label_distance": 34}},
    "labels": {"O": "O", "A": "A", "B": "B", "C": "C", "D": "D"},
})

# ── 문14 · 삼각형 ABC (AB=600m · ∠BAC=75° · ∠ABC=45°) ────────────────────────
# 🔴 원본은 **롯데월드 지도 사진** 위에 삼각형을 얹은 것이다. 지도는 배경이고
#    수학은 삼각형이 전부다 — 발문이 AB·∠A·∠B 를 다 말한다. 그래서 지도를
#    AI 로 지어내지 않았다(실제 장소를 지어내면 «그럴듯한 거짓»이 된다).
#    잃는 것은 지명뿐이고 그 지명은 **발문에 그대로 있다**
#    (「매직아일랜드가 있는 C지점」·「롯데월드타워가 있는 B지점」).
kk = 0.36                                        # 1m = 0.36px
_ab = 600 * kk
_A = [0.0, 0.0]
_B = pol(0, 0, _ab, -14)                         # 원본처럼 오른쪽 위로
_C = line_inter(_A, pol(_A[0], _A[1], 100, -14 + 75),      # ∠BAC=75° (AB 에서 시계)
                _B, pol(_B[0], _B[1], 100, (180 - 14) - 45))  # ∠ABC=45° (BA 에서 반시계)
_sx, _sy = 34.0, 86.0
write("q14", {
    "version": 2,
    "points": {"A": [round(_A[0] + _sx, 2), round(_A[1] + _sy, 2)],
               "B": [round(_B[0] + _sx, 2), round(_B[1] + _sy, 2)],
               "C": [round(_C[0] + _sx, 2), round(_C[1] + _sy, 2)]},
    "segments": {"AB": ["A", "B"], "BC": ["B", "C"], "CA": ["C", "A"]},
    "angles": {"angA": {"vertex": "A", "points": ["B", "C"], "label": "75°"},
               "angB": {"vertex": "B", "points": ["C", "A"], "label": "45°"}},
    "dimensions": {"dimAB": {"points": ["A", "B"], "label": "600 m", "side": "auto"}},
    "labels": {"A": "A", "B": "B", "C": "C"},
})

print("끝 — 스펙을 쓰는 자는 이 파일 **하나**뿐이다")

