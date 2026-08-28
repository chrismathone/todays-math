"""**RPM 함수 파트는 라벨을 선과 어떻게 «안 겹치게» 놓는가** — 여백을 잰다.

    python scripts/qa/measure-rpm-function-labels.py [--crops .tmp-orca/fn-crops]

원장님 지시(2026-08-28): 「RPM 1학기 교재에서 함수파트를 보고 함수 파트에서 라벨
위치를 분석하고 학습해. 그래야 어떻게 라벨위치를 선과 안겹치게 배치하는지
파악할 수 있을것 같네」.

## 왜 함수 파트인가

다각형은 라벨이 **꼭짓점**에 붙는다 — 바깥으로 밀면 대개 끝난다. 함수 지면은
다르다. 라벨이 붙을 꼭짓점이 **없고**(직선·포물선), 좌표축 둘이 지면을 가로지르며,
원점에서는 «바깥»이 아예 정의되지 않는다(선 넷이 사방으로 뻗어 합이 0이다).
「선을 피한다」는 규칙이 가장 세게 드러나는 자리다.

## 앞 회차가 못 보던 축

앞서 잰 것은 «꼭짓점에서 얼마나 · 어느 방향»이었다. 그 둘은 **획이 글자 상자
안으로 들어왔는지**를 구조적으로 못 본다 — 방향이 옳고 거리가 옳아도 획 위에
앉을 수 있다. 여기서는 그것을 잰다:

    여백 = 글자 **상자**에서 가장 가까운 획까지 ÷ 글자 크기
           (획이 상자 안이면 **0** — 겹쳤다)

⚠️ **글자 «중심»에서 재면 안 된다.** 큰 라벨(`y=2x`)은 중심이 멀어도 상자 모서리가
   선에 닿는다. 상자로 재야 「겹쳤나」에 답한다. 이 저장소가 여러 번 적은
   「지표가 실패를 셀 수 있는 형태인가」가 바로 이 자리다.

⚠️ 잉크만 본다(`_is_ink`) — 「개념원리」 워터마크는 벡터 그림이라 획으로 세면
   지면이 온통 획으로 덮인다.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
import os
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from glyph_ink import InkInsets, calibrate  # noqa: E402
from label_placement import (  # noqa: E402
    COMPASS8,
    bbox,
    cluster,
    quantile,
    snap8,
)

# 🔴 **추출 규칙은 옮겨 적지 않는다.** `measure-rpm-label-placement.py` 가 이미
#    잉크 걸러내기·획 뽑기·글자 묶기를 갖고 있다. 여기서 다시 쓰면 두 벌이 되고,
#    한쪽만 고치면 「함수 파트는 다르더라」가 **자 차이**인지 **정본 차이**인지
#    영영 못 가른다(2026-08-28 에 실제로 그렇게 성적표가 전부 0 이 나왔다).
_spec = importlib.util.spec_from_file_location(
    "mrpm", os.path.join(os.path.dirname(os.path.abspath(__file__)),
                         "measure-rpm-label-placement.py"))
mrpm = importlib.util.module_from_spec(_spec)
sys.modules["mrpm"] = mrpm  # dataclass 가 제 모듈을 되찾을 수 있어야 한다
_spec.loader.exec_module(mrpm)

# ───────────────────────────────────────────────────────── 어디를 볼 것인가
# 1학기 교재의 함수 단원. 쪽 번호는 본문 낱말로 훑어 찾았다(`좌표평면`·`일차함수`
# ·`이차함수` 가 연속으로 나오는 구간). 손으로 적은 값이므로 **표지 낱말이 실제로
# 그 쪽에 있는지 확인하고**, 안 맞으면 멈춘다 — 쪽이 밀리면 엉뚱한 단원을 잰다.
CHAPTERS = [
    ("1-1", "RPM 중학 1-1 학생용.pdf", 123, 153, ("좌표", "정비례", "반비례")),
    ("2-1", "RPM 중학 2-1 학생용.pdf", 119, 162, ("일차함수",)),
    ("3-1", "RPM 중학 3-1 학생용.pdf", 125, 164, ("이차함수",)),
]

# 라벨로 볼 글자 — 함수 지면은 다각형과 달리 **숫자와 식**이 라벨의 다수다.
LABEL_HEADS = set("ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                  "abcdefghijklmnopqrstuvwxyz"
                  "0123456789-")


def point_to_box(px: float, py: float, box: tuple) -> float:
    """점에서 상자까지의 거리. **상자 안이면 0** — 그것이 「겹쳤다」이다."""
    dx = max(box[0] - px, 0.0, px - box[2])
    dy = max(box[1] - py, 0.0, py - box[3])
    return math.hypot(dx, dy)


def classify_label(text: str, font: str) -> str:
    """라벨 종류. 함수 지면에서 규칙이 갈리는 단위다."""
    if text == "O":
        return "원점 O"
    if text in ("x", "y") :
        return "축 이름"
    if "=" in text:
        return "식"
    if len(text) == 1 and text.isascii() and text.isupper():
        return "점 이름"
    stripped = text.lstrip("-")
    if stripped and all(c.isdigit() for c in stripped):
        return "눈금 수"
    return "그 밖"


def stroke_kind(stroke) -> str:
    """가장 가까운 획이 **축**인가 **그래프**인가."""
    (ax, ay), (bx, by) = stroke.a, stroke.b
    dx, dy = bx - ax, by - ay
    length = math.hypot(dx, dy)
    if length < 1e-6:
        return "점"
    # 곡선은 표본점이 직선에서 벗어난다 — 끝점을 잇는 선과의 최대 어긋남으로 본다.
    sag = 0.0
    for p in stroke.pts:
        t = ((p[0] - ax) * dx + (p[1] - ay) * dy) / (length * length)
        t = max(0.0, min(1.0, t))
        sag = max(sag, math.hypot(p[0] - (ax + dx * t), p[1] - (ay + dy * t)))
    if sag > 0.06 * length and sag > 1.5:
        return "곡선"
    deg = abs(math.degrees(math.atan2(dy, dx))) % 180
    if deg < 8 or deg > 172:
        return "가로선"
    if abs(deg - 90) < 8:
        return "세로선"
    return "기울어진 선"


def origin_of(group) -> tuple | None:
    """좌표축 두 개가 만나는 점 — 있으면 돌려준다.

    긴 가로획과 긴 세로획이 서로의 몸통을 지나면 좌표평면으로 본다.
    ⚠️ 「가장 긴 획 둘」로 잡으면 안 된다 — 막대그래프의 눈금선도 길다.
    """
    hor = [s for s in group if stroke_kind(s) == "가로선"]
    ver = [s for s in group if stroke_kind(s) == "세로선"]
    if not hor or not ver:
        return None
    h = max(hor, key=lambda s: abs(s.b[0] - s.a[0]))
    v = max(ver, key=lambda s: abs(s.b[1] - s.a[1]))
    hx0, hx1 = sorted((h.a[0], h.b[0]))
    vy0, vy1 = sorted((v.a[1], v.b[1]))
    x, y = v.a[0], h.a[1]
    if hx0 - 2 <= x <= hx1 + 2 and vy0 - 2 <= y <= vy1 + 2:
        # 축은 지면을 «가로질러야» 한다 — 짧은 십자 표시를 배제한다.
        if (hx1 - hx0) > 40 and (vy1 - vy0) > 40:
            return (x, y)
    return None


QUADS = ("Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ")


def quadrant_of(dx: float, dy: float) -> str:
    """원점 기준 사분면. dy 는 **위가 +** (지면 좌표를 뒤집어 넘길 것)."""
    if dx >= 0 and dy >= 0:
        return QUADS[0]
    if dx < 0 and dy >= 0:
        return QUADS[1]
    if dx < 0 and dy < 0:
        return QUADS[2]
    return QUADS[3]


def free_quadrants(group, origin, size: float) -> list:
    """`O` 를 놓을 만한 «그래프가 안 지나는» 사분면.

    ⚠️ **축 자체는 빼야 한다** — 축은 네 사분면 경계에 늘 있으므로 세면 전부 «찼다»가
       되어 이 지표가 구조적으로 0 이 된다. 축 위(±2pt)의 표본점은 안 센다.
    ⚠️ 그리고 **`O` 가 앉을 만한 반경 안**만 본다. 지면 끝의 그래프는 상관없다.
    """
    ox, oy = origin
    inner, outer = 0.25 * size, 2.6 * size
    used = set()
    for s in group:
        for p in s.pts:
            dx, dy = p[0] - ox, -(p[1] - oy)
            r = math.hypot(dx, dy)
            if r < inner or r > outer:
                continue
            if abs(dx) <= 2.0 or abs(dy) <= 2.0:
                continue  # 축 (그리고 축 위 눈금)
            used.add(quadrant_of(dx, dy))
    return [q for q in QUADS if q not in used]


def measure_page(page, page_no: int, book: str, rows: list, crops: list,
                 insets: InkInsets) -> None:
    strokes = mrpm.page_strokes(page)
    if not strokes:
        return
    if len(strokes) > 3000:
        mrpm.SKIPPED.append((book, page_no, len(strokes)))
        return
    glyphs = mrpm.page_glyphs(page)
    for group in cluster(strokes):
        pts = [p for s in group for p in s.pts]
        if len(pts) < 6 or len(group) < 3:
            continue
        box = bbox(pts)
        w, h = box[2] - box[0], box[3] - box[1]
        if w < 22 or h < 22 or w > 520 or h > 700:
            continue
        origin = origin_of(group)
        near = [g for g in glyphs
                if box[0] - 34 <= (g.box[0] + g.box[2]) / 2 <= box[2] + 34
                and box[1] - 34 <= (g.box[1] + g.box[3]) / 2 <= box[3] + 34]
        found = []
        for label in mrpm.group_glyphs(near):
            text = "".join(g.ch for g in label)
            if not text or len(text) > 8:
                continue
            if text[0] not in LABEL_HEADS:
                continue
            size = max(g.size for g in label)
            if size <= 0:
                continue
            # 🔴 **em 상자가 아니라 잉크 상자로 잰다.** em 상자로 물으면 정본이
            #    38.1% 겹친 것으로 나온다 — 확대해 보면 `O` 는 축에 안 닿는다.
            shrunk = [insets.shrink(g.ch, g.box, g.size) for g in label]
            lb = bbox([(b[0], b[1]) for b in shrunk]
                      + [(b[2], b[3]) for b in shrunk])
            # 가장 가까운 획과 그 여백
            best = None
            for s in group:
                for p in s.pts:
                    d = point_to_box(p[0], p[1], lb)
                    if best is None or d < best[0]:
                        best = (d, s)
            if best is None:
                continue
            clear, near_stroke = best
            if clear > size * 4.0:
                continue  # 그림에 딸린 라벨이 아니다 (본문 글씨)
            font = label[0].font
            row = {
                "book": book,
                "page": page_no,
                "text": text,
                "size": round(size, 2),
                "clear": round(clear / size, 3),
                "overlap": clear <= 0.0,
                "kind": classify_label(text, font),
                "near": stroke_kind(near_stroke),
                "italic": "Italic" in font,
            }
            lc = ((lb[0] + lb[2]) / 2, (lb[1] + lb[3]) / 2)
            if origin is not None:
                ox, oy = origin
                d = math.hypot(lc[0] - ox, lc[1] - oy)
                row["from_origin"] = round(d / size, 2)
                if d > 1e-6:
                    row["origin_deg"] = round(
                        math.degrees(math.atan2(-(lc[1] - oy), lc[0] - ox)) % 360, 1)
                if text == "O":
                    row["quad"] = quadrant_of(lc[0] - ox, -(lc[1] - oy))
                    row["free_quads"] = free_quadrants(group, origin, size)
            rows.append(row)
            found.append((lb, None, None, None))
        if found and len(crops) < 36:
            crops.append({"page": page_no, "book": book, "box": box, "labels": found})


def band(rows: list, title: str, keyfn) -> list[str]:
    out = [title]
    groups: dict = defaultdict(list)
    for r in rows:
        groups[keyfn(r)].append(r)
    for k in sorted(groups, key=lambda k: -len(groups[k])):
        g = groups[k]
        vals = [r["clear"] for r in g]
        over = sum(1 for r in g if r["overlap"])
        out.append(
            f"  {str(k):>12}  {len(g):5d}개 · 겹침 {over:4d} ({over / len(g) * 100:5.1f}%)"
            f" · 여백 25% {quantile(vals, .25):5.2f}"
            f" · 중앙 {quantile(vals, .5):5.2f}"
            f" · 75% {quantile(vals, .75):5.2f}")
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--crops", default=os.path.join(".tmp-orca", "fn-crops"))
    ap.add_argument("--dump", default=os.path.join(".tmp-orca", "rpm-function-labels.json"))
    args = ap.parse_args()

    import pymupdf

    rows: list = []
    crops: list = []
    all_insets: list = []
    for book, name, first, last, marks in CHAPTERS:
        path = os.path.join(".rpm-src", name)
        if not os.path.exists(path):
            print(f"⚠️ {path} 가 없다 — 건너뛴다")
            continue
        doc = pymupdf.open(path)
        # ⚠️ **쪽 번호가 맞는지 먼저 확인한다.** 손으로 적은 구간이라 밀리면
        #    엉뚱한 단원을 재고, 그래도 숫자는 그럴듯하게 나온다.
        sample = doc[first - 1].get_text("text") + doc[last - 1].get_text("text")
        if not any(m in sample for m in marks):
            raise SystemExit(
                f"{book}: {first}~{last}쪽에서 표지 낱말 {marks} 를 못 찾았다 — "
                "구간이 밀렸다. 재기 전에 멈춘다.")
        pages = [(doc[i], i + 1) for i in range(first - 1, min(last, doc.page_count))]
        insets = calibrate(pages, mrpm.page_glyphs, mrpm.page_strokes,
                           cache=os.path.join(".tmp-orca", f"ink-insets-{book}.json"))
        all_insets.append((book, insets))
        before = len(rows)
        for page, no in pages:
            measure_page(page, no, book, rows, crops, insets)
        doc.close()
        print(f"{book} {first}~{last}쪽 — 라벨 {len(rows) - before}개")

    # ⚠️ **눈금을 못 맞춘 글자를 세어 찍는다.** 그 글자들은 em 상자로 물러섰으므로
    #    겹침이 부풀어 있다 — 안 찍으면 표가 「전부 쟀다」로 읽힌다.
    for book, ins in all_insets:
        if ins.missing:
            top = sorted(ins.missing.items(), key=lambda kv: -kv[1])[:6]
            total = sum(ins.missing.values())
            print(f"⚠️ {book}: 잉크 눈금이 없어 em 상자로 물러선 글자 {total}개 — "
                  + ", ".join(f"«{c}»{n}" for c, n in top))

    if mrpm.SKIPPED:
        print(f"⚠️ 획이 너무 많아 건너뛴 쪽 {len(mrpm.SKIPPED)}개 "
              "— 「전부 봤다」가 아니다")

    print()
    print("=" * 74)
    print(f"RPM 1학기 함수 단원 — 그림에 딸린 라벨 **{len(rows)}개**")
    print("=" * 74)
    print("\n".join(band(rows, "\n── ⑴ 라벨 종류별 «선과의 여백»", lambda r: r["kind"])))
    print("\n".join(band(rows, "\n── ⑵ 가장 가까운 획의 종류별", lambda r: r["near"])))
    print("\n".join(band(rows, "\n── ⑶ 교재별", lambda r: r["book"])))

    # ⑷ 원점 O — 원장님이 처음 짚은 결함이 바로 이 자리다(`O` 가 축에 붙어 있었다).
    o = [r for r in rows if r["kind"] == "원점 O" and r.get("origin_deg") is not None]
    print(f"\n── ⑷ **원점 `O` 는 어느 쪽에 앉나** ({len(o)}개)")
    if o:
        cnt = Counter(snap8(r["origin_deg"]) for r in o)
        for k in COMPASS8:
            n = cnt.get(k, 0)
            if n:
                print(f"  {k:>2}  {n:4d}  {n / len(o) * 100:5.1f}%  " + "█" * round(n / len(o) * 60))
        d = [r["from_origin"] for r in o]
        print(f"  원점에서 글자 중심까지 ÷ 글자크기 — "
              f"25% {quantile(d, .25):.2f} · 중앙 {quantile(d, .5):.2f} · 75% {quantile(d, .75):.2f}")

    # ⑸ 축 이름 x·y
    ax = [r for r in rows if r["kind"] == "축 이름" and r.get("origin_deg") is not None]
    if ax:
        print(f"\n── ⑸ 축 이름 `x`·`y` ({len(ax)}개)")
        for t in ("x", "y"):
            g = [r for r in ax if r["text"] == t]
            if not g:
                continue
            cnt = Counter(snap8(r["origin_deg"]) for r in g)
            top = ", ".join(f"{k} {v}" for k, v in cnt.most_common(3))
            it = sum(1 for r in g if r["italic"]) / len(g) * 100
            print(f"  `{t}`  {len(g):4d}개 · 원점 기준 {top} · 이탤릭 {it:.0f}%")

    # ⑺ 🔴 **원장님 질문의 핵심** — 「선과 안 겹치게 어떻게 놓나」.
    #    좌표평면에서 `O` 가 앉을 자리는 네 사분면뿐인데, 그래프가 지나는
    #    사분면에 놓으면 반드시 겹친다. **정본이 그 사분면을 비켜 가는가**를 센다.
    q = [r for r in rows if r["kind"] == "원점 O" and r.get("free_quads") is not None]
    if q:
        avoid = sum(1 for r in q if r["quad"] in r["free_quads"])
        no_free = sum(1 for r in q if not r["free_quads"])
        print()
        print(f"── ⑺ **`O` 가 «그래프가 안 지나는 사분면»을 고르는가** ({len(q)}개)")
        print(f"  비어 있는 사분면을 골랐다  {avoid}/{len(q)} = **{avoid / len(q) * 100:.1f}%**")
        print(f"  (네 사분면이 다 찬 그림 {no_free}개 — 고를 자리가 없다)")
        usable = [r for r in q if r["free_quads"]]
        if usable:
            hit = sum(1 for r in usable if r["quad"] in r["free_quads"])
            print(f"  고를 자리가 있을 때만 보면  {hit}/{len(usable)} = "
                  f"**{hit / len(usable) * 100:.1f}%**")
            cnt = Counter()
            for r in usable:
                cnt[(len(r["free_quads"]), r["quad"] in r["free_quads"])] += 1
            for k in sorted(cnt):
                n = cnt[k]
                print(f"     빈 사분면 {k[0]}개 · {'비켰다' if k[1] else '안 비켰다'}  {n:4d}")

    # ⑹ 겹친 것 — **있으면 반드시 눈으로 본다.**
    over = [r for r in rows if r["overlap"]]
    print(f"\n── ⑹ 획이 글자 상자 **안**으로 들어온 라벨  {len(over)}개 "
          f"/ {len(rows)}  ({len(over) / max(1, len(rows)) * 100:.1f}%)")
    for r in over[:12]:
        print(f"     {r['book']} p.{r['page']}  «{r['text']}»  가까운 획 {r['near']}")

    with open(args.dump, "w", encoding="utf-8") as fh:
        json.dump(rows, fh, ensure_ascii=False)
    print(f"\n→ {args.dump}")
    if crops:
        mrpm.draw_crops(crops, args.crops)
        print(f"→ 표본 그림 {len(crops)}장 {args.crops} — **눈으로 볼 것**")


if __name__ == "__main__":
    main()
