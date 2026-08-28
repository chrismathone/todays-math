"""**RPM 원본은 라벨을 어디에 놓는가** — 지면 벡터에서 실측한다.

    python scripts/qa/measure-rpm-label-placement.py --books 1-2 --pages 60
    python scripts/qa/measure-rpm-label-placement.py --dump .tmp-orca/rpm-labels.json
    python scripts/qa/measure-rpm-label-placement.py --books 1-2 --pages 60 \
        --crops .tmp-orca/rpm-label-crops      # 표본을 **눈으로** 본다

## 왜 재는가

우리 배치기(`figure_scene._label_vectors`)는 꼭짓점 라벨의 방향을 «N, NE, E, SE,
S, SW, W, NW» 순으로 훑고 **잉크를 밟지 않는 첫 자리**를 고른다. 도형 «안쪽»은
대개 비어 있으므로 아래쪽 꼭짓점의 라벨이 **안으로 들어간다** — 원장님이 짚으신
구각형의 `D`·`E`, 오각형의 `C`·`D` 가 그 자리다(2026-08-28).

「바깥으로 밀어라」는 말은 쉬운데 **어느 쪽이 바깥이며 얼마나 떨어지나**가 문제다.
손으로 정하면 이 저장소가 되풀이해 밟은 자리로 간다 — 손 목록은 샌다. 그래서
**정본(RPM 지면)에서 뽑는다.**

## 바깥은 «덩어리 중심의 반대쪽»이 아니다

첫 판은 그렇게 쟀고 **28.3% 가 «안쪽»** 으로 나왔다 — 교재가 그럴 리 없다.
오목한 도형·한 덩어리에 든 두 그림에서 그 축은 바깥을 못 가린다.

바깥은 **국소적**이다. 꼭짓점 `V` 에 변 `V→N1 … V→Nk` 가 붙어 있으면

    바깥 = −normalize( Σ normalize(Ni − V) )

가 외각 이등분선이다. 다각형 꼭짓점이면 정확히 「두 변 사이의 바깥쪽」이고,
대각선이 여럿 붙어도 그 합의 반대는 여전히 도형 밖을 가리킨다.

⚠️ **합이 0에 가까우면(직선 위·좌표축 원점) 바깥이 정의되지 않는다.** 그 표본은
   따로 세어 찍는다 — 뭉개면 「몇 %가 바깥」이 다른 뜻이 된다.

## 무엇을 적나

- `dev`    — 라벨 방향이 바깥에서 몇 도 벗어났나. **0°가 정확히 바깥, 180°가 안쪽.**
- `dist`   — 꼭짓점에서 글자 상자 중심까지 (글자 크기 배수).
- `gap`    — 글자 상자와 가장 가까운 잉크 사이의 빈틈 (글자 크기 배수).

⚠️ **원본은 보기만 한다.** 여기서 나오는 것은 «라벨이 어디에 앉는가»라는 배치
   통계이고, 본문·수치·문항은 옮기지 않는다. 산출물은 `.tmp-orca/` 에 둔다.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field

import pymupdf

SRC = os.path.join(os.getcwd(), ".rpm-src")
BOOKS = ["1-1", "1-2", "2-1", "2-2", "3-1", "3-2"]

# 라벨로 볼 글자. 대문자는 꼭짓점 이름, 소문자 몇은 직선·각 이름이다.
LABEL_CHARS = set("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
LINE_CHARS = set("lmnpqrstabcxyzh")

VERTEX_TOL = 1.6   # 이 거리 안이면 같은 꼭짓점으로 본다 (pt)
DEGENERATE = 0.30  # 붙은 변들의 단위벡터 합이 이보다 짧으면 «바깥 없음»


# ────────────────────────────────────────────────────────────── 벡터 훑기
def _bezier(p0, p1, p2, p3, n=8):
    out = []
    for i in range(n + 1):
        t = i / n
        u = 1.0 - t
        out.append((
            u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
            u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
        ))
    return out


def _sample_line(a, b, step=3.0):
    dist = math.hypot(b[0] - a[0], b[1] - a[1])
    n = max(1, min(64, int(dist / step)))
    return [(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n) for i in range(n + 1)]


@dataclass
class Stroke:
    """한 획 — 표본점과 **끝점 두 개**, 그리고 끝점에서의 진행 방향."""
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


def _is_ink(drawing) -> bool:
    """**검은 획만** 본다.

    RPM 지면에는 «개념원리» 워터마크가 **벡터 그림**으로 깔려 있다. 그것까지 세면
    한 쪽에 획이 수천 개가 되어 덩어리 묶기가 안 끝나고, 게다가 워터마크는 도형이
    아니므로 **재는 것 자체가 틀린다.**
    """
    for key in ("color", "fill"):
        c = drawing.get(key)
        if c and len(c) >= 3 and (c[0] + c[1] + c[2]) / 3.0 < 0.45:
            return True
    return False


def page_strokes(page) -> list[Stroke]:
    out: list[Stroke] = []
    for drawing in page.get_drawings():
        if not _is_ink(drawing):
            continue
        for item in drawing["items"]:
            kind = item[0]
            if kind == "l":
                a = (item[1].x, item[1].y)
                b = (item[2].x, item[2].y)
                if math.hypot(b[0] - a[0], b[1] - a[1]) > 0.4:
                    out.append(Stroke(_sample_line(a, b)))
            elif kind == "c":
                p = [(q.x, q.y) for q in item[1:5]]
                out.append(Stroke(_bezier(*p)))
            elif kind in ("re", "qu"):
                if kind == "re":
                    r = item[1]
                    corners = [(r.x0, r.y0), (r.x1, r.y0), (r.x1, r.y1), (r.x0, r.y1)]
                else:
                    q = item[1]
                    corners = [(q.ul.x, q.ul.y), (q.ur.x, q.ur.y),
                               (q.lr.x, q.lr.y), (q.ll.x, q.ll.y)]
                for i in range(4):
                    out.append(Stroke(_sample_line(corners[i], corners[(i + 1) % 4])))
    return out


def _bbox(pts):
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
    boxes = [_bbox(s.pts) for s in strokes]
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


# ────────────────────────────────────────────────────────────── 글자 훑기
@dataclass
class Glyph:
    ch: str
    box: tuple
    size: float
    font: str


def page_glyphs(page) -> list[Glyph]:
    out = []
    for block in page.get_text("rawdict").get("blocks", []):
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                size = float(span.get("size", 0.0))
                font = str(span.get("font", ""))
                for ch in span.get("chars", []):
                    text = ch.get("c", "")
                    if not text or text.isspace():
                        continue
                    b = ch["bbox"]
                    out.append(Glyph(text, (b[0], b[1], b[2], b[3]), size, font))
    return out


def group_glyphs(glyphs: list[Glyph]) -> list[list[Glyph]]:
    """가로로 붙어 있는 글자를 한 라벨로 묶는다(`10`·`x°`)."""
    out: list[list[Glyph]] = []
    for g in sorted(glyphs, key=lambda g: (round((g.box[1] + g.box[3]) / 2, 1), g.box[0])):
        placed = False
        for group in out:
            last = group[-1]
            mid_last = (last.box[1] + last.box[3]) / 2
            mid_now = (g.box[1] + g.box[3]) / 2
            if (abs(mid_last - mid_now) < last.size * 0.5
                    and -last.size * 0.25 <= g.box[0] - last.box[2] <= last.size * 0.35):
                group.append(g)
                placed = True
                break
        if not placed:
            out.append([g])
    return out


# ────────────────────────────────────────────────────────────── 재기
def outward_at(vertex, group: list[Stroke]):
    """꼭짓점에 붙은 변들의 **반대 방향** = 외각 이등분선. 없으면 None."""
    sx = sy = 0.0
    incident = 0
    for s in group:
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


SKIPPED: list = []


def measure_page(page, page_no: int, book: str, rows: list, crops: list) -> None:
    strokes = page_strokes(page)
    if not strokes:
        return
    if len(strokes) > 3000:
        # ⚠️ **말없이 버리지 않는다.** 버린 쪽을 세어 찍어야 「전부 봤다」로 안 읽힌다.
        SKIPPED.append((book, page_no, len(strokes)))
        return
    glyphs = page_glyphs(page)
    for group in cluster(strokes):
        pts = [p for s in group for p in s.pts]
        if len(pts) < 6 or len(group) < 3:
            continue
        box = _bbox(pts)
        w, h = box[2] - box[0], box[3] - box[1]
        # 표·밑줄·쪽 장식은 그림이 아니다.
        if w < 22 or h < 22 or w > 520 or h > 700:
            continue
        ends = []
        for s in group:
            ends.append(s.a)
            ends.append(s.b)

        near = [g for g in glyphs
                if box[0] - 34 <= (g.box[0] + g.box[2]) / 2 <= box[2] + 34
                and box[1] - 34 <= (g.box[1] + g.box[3]) / 2 <= box[3] + 34]
        found = []
        for label in group_glyphs(near):
            text = "".join(g.ch for g in label)
            if len(text) > 4 or not text:
                continue
            head = text[0]
            if head not in LABEL_CHARS and head not in LINE_CHARS:
                continue
            size = max(g.size for g in label)
            if size <= 0:
                continue
            lb = _bbox([(g.box[0], g.box[1]) for g in label]
                       + [(g.box[2], g.box[3]) for g in label])
            lc = ((lb[0] + lb[2]) / 2, (lb[1] + lb[3]) / 2)

            vx, vy, vd = 0.0, 0.0, 1e9
            for p in ends:
                d = math.hypot(p[0] - lc[0], p[1] - lc[1])
                if d < vd:
                    vx, vy, vd = p[0], p[1], d
            if vd > size * 4.5:
                continue  # 꼭짓점 라벨이 아니다(본문·먼 주석)
            ink = min(math.hypot(p[0] - lc[0], p[1] - lc[1]) for p in pts)

            out_dir, incident = outward_at((vx, vy), group)
            dx, dy = lc[0] - vx, lc[1] - vy
            dl = math.hypot(dx, dy)
            row = {
                "book": book, "page": page_no, "text": text,
                "size": round(size, 2),
                "dist": round(vd / size, 3),
                "gap": round(ink / size, 3),
                "incident": incident,
                "dev": None,
            }
            if out_dir is not None and dl > 1e-6:
                cosine = max(-1.0, min(1.0, (dx * out_dir[0] + dy * out_dir[1]) / dl))
                row["dev"] = round(math.degrees(math.acos(cosine)), 1)
            rows.append(row)
            found.append((lb, row["dev"], (vx, vy), out_dir))
        if found and len(crops) < 40:
            crops.append({"page": page_no, "book": book, "box": box, "labels": found})


def draw_crops(crops, outdir: str) -> None:
    """표본을 **눈으로 본다** — 잰 것이 정말 그것인지 확인하는 유일한 길이다."""
    os.makedirs(outdir, exist_ok=True)
    by_book: dict[str, list] = defaultdict(list)
    for c in crops:
        by_book[c["book"]].append(c)
    for book, items in by_book.items():
        doc = pymupdf.open(os.path.join(SRC, f"RPM 중학 {book} 학생용.pdf"))
        for i, c in enumerate(items):
            page = doc[c["page"] - 1]
            b = c["box"]
            rect = pymupdf.Rect(b[0] - 40, b[1] - 40, b[2] + 40, b[3] + 40)
            pix = page.get_pixmap(clip=rect, matrix=pymupdf.Matrix(3, 3))
            path = os.path.join(outdir, f"{book}-p{c['page']}-{i}.png")
            pix.save(path)
        doc.close()
    print(f"→ 표본 그림 {len(crops)}장: {outdir}", file=sys.stderr)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--books", default=",".join(BOOKS))
    ap.add_argument("--pages", type=int, default=0, help="책마다 앞 N쪽만 (0=전량)")
    ap.add_argument("--dump", default="")
    ap.add_argument("--crops", default="")
    args = ap.parse_args()

    rows: list = []
    crops: list = []
    for book in args.books.split(","):
        path = os.path.join(SRC, f"RPM 중학 {book} 학생용.pdf")
        if not os.path.exists(path):
            print(f"없다: {path}", file=sys.stderr)
            continue
        doc = pymupdf.open(path)
        total = doc.page_count if args.pages == 0 else min(args.pages, doc.page_count)
        for i in range(total):
            measure_page(doc[i], i + 1, book, rows, crops)
        doc.close()
        print(f"{book}: {total}쪽 · 누적 라벨 {len(rows)}", file=sys.stderr)

    if not rows:
        print("라벨을 하나도 못 찾았다 — 열쇠가 죽었는지 먼저 보라.")
        sys.exit(1)

    if SKIPPED:
        print(f"⚠️ 획이 너무 많아 건너뛴 쪽 {len(SKIPPED)}개: "
              + ", ".join(f"{b} p{p}({n})" for b, p, n in SKIPPED[:8]))
    graded = [r for r in rows if r["dev"] is not None]
    degenerate = len(rows) - len(graded)
    print(f"라벨 {len(rows)}개 · 바깥을 정할 수 있는 것 {len(graded)}개"
          f" · **바깥 없음(직선 위·원점) {degenerate}개**")

    def pct(values, q):
        values = sorted(values)
        return values[max(0, min(len(values) - 1, int(len(values) * q)))]

    dev = [r["dev"] for r in graded]
    print()
    print("── 바깥에서 벗어난 각 dev (0°=정확히 바깥, 180°=정반대)")
    for q in (0.5, 0.75, 0.9, 0.95, 0.99):
        print(f"   {int(q * 100):3d}%   {pct(dev, q):5.1f}°")
    for limit in (30, 45, 60, 90, 120):
        n = sum(1 for d in dev if d <= limit)
        print(f"   ≤{limit:3d}° 안에 드는 것  {n:5d}  {n / len(dev) * 100:5.1f}%")

    print()
    print("── 꼭짓점에서 글자 중심까지 dist (글자 크기 배수)")
    for q in (0.05, 0.25, 0.5, 0.75, 0.95):
        print(f"   {int(q * 100):3d}%   {pct([r['dist'] for r in rows], q):.2f}")
    print()
    print("── 잉크와의 빈틈 gap (글자 크기 배수)")
    for q in (0.05, 0.25, 0.5, 0.75, 0.95):
        print(f"   {int(q * 100):3d}%   {pct([r['gap'] for r in rows], q):.2f}")

    print()
    print("── 붙은 변 수별 (라벨 10개 이상)")
    per = defaultdict(list)
    for r in graded:
        per[r["incident"]].append(r["dev"])
    for k in sorted(per):
        v = per[k]
        if len(v) < 10:
            continue
        n = sum(1 for d in v if d <= 60)
        print(f"   변 {k}개  {len(v):5d}개  ≤60° {n / len(v) * 100:5.1f}%  중앙 {pct(v, 0.5):5.1f}°")

    print()
    print("── 글자별 (10개 이상)")
    cnt = Counter(r["text"] for r in graded)
    for text, n in cnt.most_common(20):
        if n < 10:
            continue
        v = [r["dev"] for r in graded if r["text"] == text]
        ok = sum(1 for d in v if d <= 60)
        print(f"   {text:>4}  {n:5d}개  ≤60° {ok / n * 100:5.1f}%  중앙 {pct(v, 0.5):5.1f}°")

    if args.dump:
        os.makedirs(os.path.dirname(args.dump) or ".", exist_ok=True)
        with open(args.dump, "w", encoding="utf-8") as fh:
            json.dump(rows, fh, ensure_ascii=False)
        print(f"\n→ {args.dump}")
    if args.crops:
        draw_crops(crops, args.crops)


if __name__ == "__main__":
    main()
