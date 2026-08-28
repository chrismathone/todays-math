"""**라벨이 도형의 어디에 앉는가** — RPM 지면과 우리 SVG 를 **한 자로** 재는 공용 부품.

이 파일에는 «재는 규칙»만 둔다. 읽어 들이는 쪽은 둘이다:

- `measure-rpm-label-placement.py` — RPM PDF 벡터
- `measure-svg-label-placement.py` — 우리 엔진이 낸 SVG

⚠️ **규칙을 두 벌 두지 마라.** 한쪽만 고치면 두 성적표가 다른 것을 재게 되고,
   그러면 「RPM 보다 낫다/못하다」가 아무 뜻이 없어진다. 이 저장소가 되풀이해
   밟은 자리다(2026-08-18 「같은 규칙을 쓰는 자리가 둘이면 한 숫자를 두 곳이 쓰게」).

## 바깥은 «덩어리 중심의 반대쪽»이 아니다

첫 판은 그렇게 쟀고 RPM 에서 **28.3% 가 «안쪽»** 으로 나왔다 — 교재가 그럴 리 없다.
오목한 도형·한 덩어리에 든 두 그림에서 그 축은 바깥을 못 가린다.

바깥은 **국소적**이다. 꼭짓점 `V` 에 변 `V→N1 … V→Nk` 가 붙어 있으면

    바깥 = −normalize( Σ normalize(Ni − V) )

가 외각 이등분선이다. 다각형 꼭짓점이면 정확히 「두 변 사이의 바깥쪽」이고,
대각선이 여럿 붙어도 그 합의 반대는 여전히 도형 밖을 가리킨다.

⚠️ **합이 0에 가까우면(직선 위·좌표축 원점) 바깥이 정의되지 않는다.** 그 표본은
   따로 세어 찍는다 — 뭉개면 「몇 %가 바깥」이 다른 뜻이 된다.
"""
from __future__ import annotations

import math
from collections import Counter, defaultdict
from dataclasses import dataclass, field

VERTEX_TOL = 1.6   # 이 거리 안이면 같은 꼭짓점으로 본다 (그림 단위)
DEGENERATE = 0.30  # 붙은 변들의 단위벡터 합이 이보다 짧으면 «바깥 없음»


@dataclass
class Stroke:
    """한 획 — 표본점 목록. 양 끝이 «꼭짓점»이다."""
    pts: list = field(default_factory=list)

    @property
    def a(self):
        return self.pts[0]

    @property
    def b(self):
        return self.pts[-1]

    def dir_from(self, end: int):
        """끝점에서 획을 따라 들어가는 단위벡터. 짧은 획도 견딘다."""
        pts = self.pts if end == 0 else list(reversed(self.pts))
        p0 = pts[0]
        for p in pts[1:]:
            d = math.hypot(p[0] - p0[0], p[1] - p0[1])
            if d > 1.0:
                return ((p[0] - p0[0]) / d, (p[1] - p0[1]) / d)
        p = pts[-1]
        d = math.hypot(p[0] - p0[0], p[1] - p0[1])
        return None if d < 1e-6 else ((p[0] - p0[0]) / d, (p[1] - p0[1]) / d)


@dataclass
class Label:
    """조판된 라벨 하나 — 글자와 **지면 위 상자**."""
    text: str
    box: tuple      # (x0, y0, x1, y1)
    size: float


def sample_line(a, b, step=3.0):
    dist = math.hypot(b[0] - a[0], b[1] - a[1])
    n = max(1, min(64, int(dist / step)))
    return [(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n)
            for i in range(n + 1)]


def sample_bezier(p0, p1, p2, p3, n=8):
    out = []
    for i in range(n + 1):
        t = i / n
        u = 1.0 - t
        out.append((
            u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
            u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
        ))
    return out


def bbox(pts):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return (min(xs), min(ys), max(xs), max(ys))


def cluster(strokes: list[Stroke], gap: float = 14.0) -> list[list[Stroke]]:
    """가까운 획끼리 묶어 **그림 덩어리**를 만든다.

    ⚠️ 짝을 전부 견주면 O(n²) 이라 한 쪽에 획이 수천 개면 못 쓴다.
       격자에 넣고 **이웃 칸만** 본다.
    """
    n = len(strokes)
    parent = list(range(n))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    def union(i, j):
        ri, rj = find(i), find(j)
        if ri != rj:
            parent[rj] = ri

    cell = max(gap, 12.0)
    grid: dict[tuple, list[int]] = defaultdict(list)
    boxes = [bbox(s.pts) for s in strokes]
    for i, b in enumerate(boxes):
        for gx in range(int((b[0] - gap) // cell), int((b[2] + gap) // cell) + 1):
            for gy in range(int((b[1] - gap) // cell), int((b[3] + gap) // cell) + 1):
                grid[(gx, gy)].append(i)
    for members in grid.values():
        for idx, i in enumerate(members):
            bi = boxes[i]
            for j in members[idx + 1:]:
                bj = boxes[j]
                if (bi[0] - gap <= bj[2] and bj[0] - gap <= bi[2]
                        and bi[1] - gap <= bj[3] and bj[1] - gap <= bi[3]):
                    union(i, j)
    groups: dict[int, list[Stroke]] = {}
    for i in range(n):
        groups.setdefault(find(i), []).append(strokes[i])
    return list(groups.values())


def outward_at(vertex, strokes: list[Stroke]):
    """꼭짓점에 붙은 변들의 **반대 방향** = 외각 이등분선. 못 정하면 `(None, n)`."""
    sx = sy = 0.0
    incident = 0
    for s in strokes:
        for end in (0, 1):
            p = s.a if end == 0 else s.b
            if math.hypot(p[0] - vertex[0], p[1] - vertex[1]) <= VERTEX_TOL:
                d = s.dir_from(end)
                if d is not None:
                    sx += d[0]
                    sy += d[1]
                    incident += 1
    if incident == 0:
        return None, 0
    length = math.hypot(sx, sy)
    if length < DEGENERATE:
        return None, incident
    return (-sx / length, -sy / length), incident


def measure_label(label: Label, strokes: list[Stroke], pts: list,
                  reach: float = 4.5) -> dict | None:
    """라벨 하나를 잰다. 꼭짓점에서 너무 멀면 «꼭짓점 라벨이 아니다»로 버린다."""
    lb = label.box
    lc = ((lb[0] + lb[2]) / 2, (lb[1] + lb[3]) / 2)
    size = label.size
    if size <= 0:
        return None
    vx, vy, vd = 0.0, 0.0, 1e30
    for s in strokes:
        for p in (s.a, s.b):
            d = math.hypot(p[0] - lc[0], p[1] - lc[1])
            if d < vd:
                vx, vy, vd = p[0], p[1], d
    if vd > size * reach:
        return None
    ink = min(math.hypot(p[0] - lc[0], p[1] - lc[1]) for p in pts)
    out_dir, incident = outward_at((vx, vy), strokes)
    dx, dy = lc[0] - vx, lc[1] - vy
    dl = math.hypot(dx, dy)
    dev = None
    if out_dir is not None and dl > 1e-6:
        cosine = max(-1.0, min(1.0, (dx * out_dir[0] + dy * out_dir[1]) / dl))
        dev = round(math.degrees(math.acos(cosine)), 1)
    # 🔴 **«안쪽이냐 바깥이냐»는 절반의 질문이다.** 원장님 지시(2026-08-28):
    #    「꼭짓점의 위치에 따라 적절하게 있어야 한다」 — 즉 **어느 방향**인지가
    #    핵심이다. 그래서 방향을 **절대 각도**로도 남긴다.
    #      abs_deg — 꼭짓점 → 글자 중심. 0°=동, 90°=**북**(화면 y 는 아래가 +라 뒤집는다)
    #      bis_deg — 외각 이등분선의 절대 각도(같은 규약)
    #      signed  — 이등분선에서 **어느 쪽으로** 얼마나 돌았나(+ 는 반시계)
    abs_deg = round(math.degrees(math.atan2(-dy, dx)) % 360, 1) if dl > 1e-6 else None
    bis_deg = None
    signed = None
    if out_dir is not None:
        bis_deg = round(math.degrees(math.atan2(-out_dir[1], out_dir[0])) % 360, 1)
        if abs_deg is not None:
            signed = round(((abs_deg - bis_deg + 180) % 360) - 180, 1)
    return {
        "text": label.text,
        "size": round(size, 2),
        "dist": round(vd / size, 3),
        "gap": round(ink / size, 3),
        "incident": incident,
        "dev": dev,
        "abs_deg": abs_deg,
        "bis_deg": bis_deg,
        "signed": signed,
    }


# 8방위 — 라벨이 실제로 «어느 칸»에 앉는가. 0°=동, 반시계로 45°씩.
COMPASS8 = ["E", "NE", "N", "NW", "W", "SW", "S", "SE"]


def snap8(deg):
    """절대 각도 → 8방위 이름. 경계는 22.5°."""
    if deg is None:
        return None
    return COMPASS8[int(((deg % 360) + 22.5) // 45) % 8]


# ────────────────────────────────────────────────────────────────── 성적표
def quantile(values, q):
    values = sorted(values)
    if not values:
        return float("nan")
    return values[max(0, min(len(values) - 1, int(len(values) * q)))]


def report(rows: list, title: str) -> list[str]:
    out = []
    graded = [r for r in rows if r["dev"] is not None]
    degenerate = len(rows) - len(graded)
    out.append(f"{title} — 라벨 {len(rows)}개 · 바깥을 정할 수 있는 것 {len(graded)}개"
               f" · **바깥 없음(직선 위·원점) {degenerate}개**")
    if not graded:
        return out
    dev = [r["dev"] for r in graded]
    out.append("")
    out.append("── 바깥에서 벗어난 각 dev (0°=정확히 바깥, 180°=정반대)")
    for q in (0.5, 0.75, 0.9, 0.95):
        out.append(f"   {int(q * 100):3d}%   {quantile(dev, q):5.1f}°")
    for limit in (30, 45, 60, 90):
        n = sum(1 for d in dev if d <= limit)
        out.append(f"   ≤{limit:3d}° 안에 드는 것  {n:5d}  {n / len(dev) * 100:5.1f}%")
    inward = sum(1 for d in dev if d > 90)
    out.append(f"   **안쪽(>90°)  {inward:5d}  {inward / len(dev) * 100:5.1f}%**")
    out.append("")
    out.append("── 꼭짓점에서 글자 중심까지 dist (글자 크기 배수)")
    for q in (0.25, 0.5, 0.75, 0.95):
        out.append(f"   {int(q * 100):3d}%   {quantile([r['dist'] for r in rows], q):.2f}")
    out.append("")
    out.append("── 잉크와의 빈틈 gap (글자 크기 배수)")
    for q in (0.05, 0.25, 0.5, 0.75):
        out.append(f"   {int(q * 100):3d}%   {quantile([r['gap'] for r in rows], q):.2f}")
    out.append("")
    out.append("── 글자별 (10개 이상)")
    cnt = Counter(r["text"] for r in graded)
    for text, n in cnt.most_common(24):
        if n < 10:
            continue
        v = [r["dev"] for r in graded if r["text"] == text]
        ok = sum(1 for d in v if d <= 60)
        out.append(f"   {text:>4}  {n:5d}개  ≤60° {ok / n * 100:5.1f}%"
                   f"  중앙 {quantile(v, 0.5):5.1f}°")
    return out
