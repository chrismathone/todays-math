"""**우리 그림은 라벨을 어디에 놓는가** — RPM 과 **같은 자**로 잰다.

    npx tsx scripts/qa/dump-figure-svgs.ts        # 먼저 코퍼스를 뽑고
    python scripts/qa/measure-svg-label-placement.py .tmp-orca/label-audit

규칙은 `scripts/qa/label_placement.py` 한 곳에 있다 — RPM 쪽과 **한 벌**이다.
두 벌이 되면 「RPM 보다 낫다/못하다」가 아무 뜻이 없어진다.

## SVG 에서 무엇을 읽나

- 기하: `line` · `path` · `polygon` · `polyline` · `rect` · `circle`
  (⚠️ **`[data-label]` 안쪽은 글리프 윤곽선이다** — 도형으로 세면 안 된다.)
- 라벨: `<g data-label … data-x data-base data-w data-a data-d data-anchor>`
  조판이 안 된 것은 `<text>` 로 남아 있고, 그 폭은 어림으로 잡는다(따로 센다).
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from label_placement import (  # noqa: E402
    Label, Stroke, bbox, measure_label, report, sample_bezier, sample_line,
)

SVG_NS = "{http://www.w3.org/2000/svg}"
NUM = re.compile(r"[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?")
CMD = re.compile(r"([MmLlHhVvCcSsQqTtAaZz])")

# 조판이 안 된 `<text>` 의 폭 어림 (em/글자). 상한이 아니라 **대략**이다 —
# 이 값으로 판정을 가르지 않고, 그런 라벨이 몇 개인지 따로 센다.
PLAIN_EM = 0.60


def _nums(text: str) -> list[float]:
    return [float(m.group()) for m in NUM.finditer(text)]


def _arc_points(p0, rx, ry, phi_deg, large, sweep, p1, n=12):
    """SVG 타원 호를 표본점으로. 끝점 매개변수 → 중심 매개변수(표준 변환)."""
    if rx == 0 or ry == 0:
        return [p0, p1]
    phi = math.radians(phi_deg)
    cos_p, sin_p = math.cos(phi), math.sin(phi)
    dx2 = (p0[0] - p1[0]) / 2.0
    dy2 = (p0[1] - p1[1]) / 2.0
    x1 = cos_p * dx2 + sin_p * dy2
    y1 = -sin_p * dx2 + cos_p * dy2
    rx, ry = abs(rx), abs(ry)
    lam = x1 * x1 / (rx * rx) + y1 * y1 / (ry * ry)
    if lam > 1:
        scale = math.sqrt(lam)
        rx *= scale
        ry *= scale
    num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1
    den = rx * rx * y1 * y1 + ry * ry * x1 * x1
    factor = math.sqrt(max(0.0, num / den)) if den else 0.0
    if large == sweep:
        factor = -factor
    cxp = factor * rx * y1 / ry
    cyp = -factor * ry * x1 / rx
    cx = cos_p * cxp - sin_p * cyp + (p0[0] + p1[0]) / 2.0
    cy = sin_p * cxp + cos_p * cyp + (p0[1] + p1[1]) / 2.0

    def angle_of(ux, uy):
        return math.atan2(uy, ux)

    th0 = angle_of((x1 - cxp) / rx, (y1 - cyp) / ry)
    th1 = angle_of((-x1 - cxp) / rx, (-y1 - cyp) / ry)
    dth = th1 - th0
    if sweep and dth < 0:
        dth += 2 * math.pi
    if not sweep and dth > 0:
        dth -= 2 * math.pi
    out = []
    for i in range(n + 1):
        th = th0 + dth * i / n
        x = cos_p * rx * math.cos(th) - sin_p * ry * math.sin(th) + cx
        y = sin_p * rx * math.cos(th) + cos_p * ry * math.sin(th) + cy
        out.append((x, y))
    return out


def path_strokes(d: str) -> list[Stroke]:
    """`d` 를 획 목록으로. 한 «부분경로»가 한 획이다(끝점이 곧 꼭짓점)."""
    tokens = [t for t in CMD.split(d) if t.strip()]
    out: list[Stroke] = []
    cur: list = []
    pos = (0.0, 0.0)
    start = (0.0, 0.0)
    i = 0
    prev = None
    while i < len(tokens):
        cmd = tokens[i]
        args = _nums(tokens[i + 1]) if i + 1 < len(tokens) and not CMD.fullmatch(tokens[i + 1]) else []
        i += 2 if args else 1
        rel = cmd.islower()
        up = cmd.upper()
        if up == "M":
            for k in range(0, len(args) - 1, 2):
                p = (args[k] + (pos[0] if rel else 0.0), args[k + 1] + (pos[1] if rel else 0.0))
                if k == 0:
                    if len(cur) > 1:
                        out.append(Stroke(cur))
                    cur = [p]
                    start = p
                else:
                    cur += sample_line(pos, p)
                pos = p
        elif up in ("L", "T"):
            for k in range(0, len(args) - 1, 2):
                p = (args[k] + (pos[0] if rel else 0.0), args[k + 1] + (pos[1] if rel else 0.0))
                cur += sample_line(pos, p)
                pos = p
        elif up == "H":
            for v in args:
                p = (v + (pos[0] if rel else 0.0), pos[1])
                cur += sample_line(pos, p)
                pos = p
        elif up == "V":
            for v in args:
                p = (pos[0], v + (pos[1] if rel else 0.0))
                cur += sample_line(pos, p)
                pos = p
        elif up == "C":
            for k in range(0, len(args) - 5, 6):
                base = pos if rel else (0.0, 0.0)
                c1 = (args[k] + base[0], args[k + 1] + base[1])
                c2 = (args[k + 2] + base[0], args[k + 3] + base[1])
                p = (args[k + 4] + base[0], args[k + 5] + base[1])
                cur += sample_bezier(pos, c1, c2, p)
                pos, prev = p, c2
        elif up == "S":
            for k in range(0, len(args) - 3, 4):
                base = pos if rel else (0.0, 0.0)
                c1 = (2 * pos[0] - prev[0], 2 * pos[1] - prev[1]) if prev else pos
                c2 = (args[k] + base[0], args[k + 1] + base[1])
                p = (args[k + 2] + base[0], args[k + 3] + base[1])
                cur += sample_bezier(pos, c1, c2, p)
                pos, prev = p, c2
        elif up == "Q":
            for k in range(0, len(args) - 3, 4):
                base = pos if rel else (0.0, 0.0)
                c = (args[k] + base[0], args[k + 1] + base[1])
                p = (args[k + 2] + base[0], args[k + 3] + base[1])
                c1 = (pos[0] + 2.0 / 3 * (c[0] - pos[0]), pos[1] + 2.0 / 3 * (c[1] - pos[1]))
                c2 = (p[0] + 2.0 / 3 * (c[0] - p[0]), p[1] + 2.0 / 3 * (c[1] - p[1]))
                cur += sample_bezier(pos, c1, c2, p)
                pos = p
        elif up == "A":
            for k in range(0, len(args) - 6, 7):
                base = pos if rel else (0.0, 0.0)
                p = (args[k + 5] + base[0], args[k + 6] + base[1])
                cur += _arc_points(pos, args[k], args[k + 1], args[k + 2],
                                   bool(args[k + 3]), bool(args[k + 4]), p)
                pos = p
        elif up == "Z":
            if cur:
                cur += sample_line(pos, start)
                pos = start
        if up != "C" and up != "S":
            prev = None
    if len(cur) > 1:
        out.append(Stroke(cur))
    return out


def _label_from_group(el) -> Label | None:
    text = el.get("data-label")
    if text is None:
        return None
    try:
        x = float(el.get("data-x", "nan"))
        base = float(el.get("data-base", el.get("data-y", "nan")))
        w = float(el.get("data-w", "nan"))
        asc = float(el.get("data-a", "nan"))
        desc = float(el.get("data-d", "0"))
        size = float(el.get("data-fs", "nan"))
    except ValueError:
        return None
    if any(math.isnan(v) for v in (x, base, w, asc, size)):
        return None
    anchor = el.get("data-anchor", "middle")
    x0 = x - (w / 2 if anchor == "middle" else w if anchor == "end" else 0.0)
    return Label(text, (x0, base - asc, x0 + w, base + desc), size)


def _label_from_text(el) -> Label | None:
    text = "".join(el.itertext()).strip()
    if not text:
        return None
    try:
        x = float(el.get("x", "nan"))
        y = float(el.get("y", "nan"))
    except ValueError:
        return None
    size = float(el.get("font-size", "13") or 13)
    if math.isnan(x) or math.isnan(y):
        return None
    w = PLAIN_EM * size * len(text)
    anchor = el.get("text-anchor", "middle")
    x0 = x - (w / 2 if anchor == "middle" else w if anchor == "end" else 0.0)
    return Label(text, (x0, y - size * 0.72, x0 + w, y + size * 0.2), size)


def walk(el, strokes: list, labels: list, in_label: bool) -> None:
    tag = el.tag.replace(SVG_NS, "")
    if el.get("data-label") is not None:
        lab = _label_from_group(el)
        if lab is not None:
            labels.append(lab)
        return  # 안쪽은 글리프 윤곽선이다 — 도형으로 세면 안 된다.
    if tag == "text":
        lab = _label_from_text(el)
        if lab is not None:
            labels.append((lab, "plain"))
        return
    if not in_label:
        if tag == "line":
            a = (float(el.get("x1", 0)), float(el.get("y1", 0)))
            b = (float(el.get("x2", 0)), float(el.get("y2", 0)))
            strokes.append(Stroke(sample_line(a, b)))
        elif tag == "path":
            d = el.get("d")
            if d:
                strokes.extend(path_strokes(d))
        elif tag in ("polygon", "polyline"):
            vals = _nums(el.get("points", ""))
            pts = [(vals[i], vals[i + 1]) for i in range(0, len(vals) - 1, 2)]
            if len(pts) >= 2:
                if tag == "polygon":
                    pts = pts + [pts[0]]
                for i in range(len(pts) - 1):
                    strokes.append(Stroke(sample_line(pts[i], pts[i + 1])))
        elif tag == "rect":
            # 바탕 흰 사각형은 도형이 아니다.
            if (el.get("fill") or "").lower() not in ("#ffffff", "white"):
                x = float(el.get("x", 0))
                y = float(el.get("y", 0))
                w = float(el.get("width", 0))
                h = float(el.get("height", 0))
                c = [(x, y), (x + w, y), (x + w, y + h), (x, y + h), (x, y)]
                for i in range(4):
                    strokes.append(Stroke(sample_line(c[i], c[i + 1])))
        elif tag == "circle":
            cx = float(el.get("cx", 0))
            cy = float(el.get("cy", 0))
            r = float(el.get("r", 0))
            n = max(16, int(r))
            pts = [(cx + r * math.cos(2 * math.pi * i / n),
                    cy + r * math.sin(2 * math.pi * i / n)) for i in range(n + 1)]
            strokes.append(Stroke(pts))
    for child in el:
        walk(child, strokes, labels, in_label)


def measure_svg(svg_text: str) -> tuple[list, int, float]:
    """라벨 성적 · 조판 안 된 라벨 수 · **도형이 지면에서 차지하는 몫**.

    셋째 값이 작으면 「라벨이 도형을 밀어내 지면이 부풀었다」는 뜻이다 — 원장님이
    보내신 그림 중 둘이 그 모양이었다(글자만 크게 떠 있고 도형이 작다). 라벨을
    바깥으로 옮기면 이 값도 같이 움직이므로 **함께 재야** 한 쪽만 좋아지는 것을 본다.
    """
    root = ET.fromstring(svg_text)
    strokes: list = []
    raw: list = []
    walk(root, strokes, raw, False)
    labels = [r if isinstance(r, Label) else r[0] for r in raw]
    plain = sum(1 for r in raw if not isinstance(r, Label))
    if not strokes or not labels:
        return [], plain, 1.0
    pts = [p for s in strokes for p in s.pts]
    vb = _nums(root.get("viewBox", "0 0 0 0"))
    share = 1.0
    if len(vb) == 4 and vb[2] > 0 and vb[3] > 0:
        gb = bbox(pts)
        share = ((gb[2] - gb[0]) * (gb[3] - gb[1])) / (vb[2] * vb[3])
    rows = []
    for lab in labels:
        row = measure_label(lab, strokes, pts)
        if row is not None:
            rows.append(row)
    return rows, plain, share


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("dir", nargs="?", default=".tmp-orca/label-audit")
    ap.add_argument("--dump", default="")
    ap.add_argument("--worst", type=int, default=0, help="안쪽으로 들어간 것 N개를 찍는다")
    args = ap.parse_args()

    files = sorted(f for f in os.listdir(args.dir) if f.endswith(".svg"))
    if not files:
        print(f"SVG 가 없다: {args.dir} — 먼저 dump-figure-svgs.ts 를 돌려라")
        sys.exit(1)
    rows: list = []
    plain_total = 0
    broken = 0
    shares: list = []
    for name in files:
        with open(os.path.join(args.dir, name), encoding="utf-8") as fh:
            try:
                got, plain, share = measure_svg(fh.read())
            except ET.ParseError:
                broken += 1
                continue
        plain_total += plain
        shares.append((share, name))
        for r in got:
            r["file"] = name
            rows.append(r)
    if not rows:
        print("라벨을 하나도 못 찾았다 — 열쇠가 죽었는지 먼저 보라.")
        sys.exit(1)
    print(f"그림 {len(files)}장 · 조판 안 된 `<text>` 라벨 {plain_total}개"
          + (f" · 못 읽은 파일 {broken}장" if broken else ""))
    print("\n".join(report(rows, "우리 엔진")))
    thin = [s for s in shares if s[0] < 0.25]
    print()
    print(f"── 도형이 지면의 1/4 도 못 차지하는 그림  {len(thin)}장"
          f" / {len(shares)}장  (라벨이 지면을 밀어낸 자리)")
    for share, name in sorted(thin)[:8]:
        print(f"   {share * 100:5.1f}%  {name}")

    # ── 🔴 **글자가 도형보다 크면 안 된다.**
    #
    #    RPM 실측은 「라벨 글자 ÷ 도형 선 길이 = 10.2%」다(`16-figure-recovery`
    #    옆 `rpm-engine-gaps.md` ①). 뒤집으면 **도형이 글자의 열 배쯤** 이라는 뜻.
    #    그런데 우리 쪽에는 문항의 수치를 **좌표로 그대로 쓴** 갈래가 있어
    #    「$\overline{AB}=14$cm」 가 지면에서 **14단위**가 된다 — 글자가 24 다.
    #    그런 그림은 라벨을 어디에 놓아도 안 된다. **배치가 아니라 축척 문제**라
    #    따로 센다.
    span: list = []
    for name in files:
        with open(os.path.join(args.dir, name), encoding="utf-8") as fh:
            try:
                root = ET.fromstring(fh.read())
            except ET.ParseError:
                continue
        strokes: list = []
        raw: list = []
        walk(root, strokes, raw, False)
        labels = [r if isinstance(r, Label) else r[0] for r in raw]
        if not strokes or not labels:
            continue
        pts = [p for s in strokes for p in s.pts]
        gb = bbox(pts)
        diag = math.hypot(gb[2] - gb[0], gb[3] - gb[1])
        size = max(lab.size for lab in labels)
        if size > 0:
            span.append((diag / size, name))
    small = [s for s in span if s[0] < 4.0]
    print()
    print(f"── **도형 지름 ÷ 글자 크기**가 4 미만인 그림  {len(small)}장 / {len(span)}장"
          "  (RPM 은 10 안팎)")
    for ratio, name in sorted(small)[:10]:
        print(f"   {ratio:5.2f}배  {name}")
    if args.worst:
        print()
        print(f"── 안쪽으로 들어간 것 (dev 큰 순 {args.worst}개)")
        bad = sorted((r for r in rows if r["dev"] is not None),
                     key=lambda r: -r["dev"])[:args.worst]
        for r in bad:
            print(f"   {r['dev']:5.1f}°  «{r['text']}»  {r['file']}")
    if args.dump:
        os.makedirs(os.path.dirname(args.dump) or ".", exist_ok=True)
        with open(args.dump, "w", encoding="utf-8") as fh:
            json.dump(rows, fh, ensure_ascii=False)
        print(f"\n→ {args.dump}")


if __name__ == "__main__":
    main()
