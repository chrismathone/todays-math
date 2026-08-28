# -*- coding: utf-8 -*-
"""치수 라벨이 **도형** 위에 앉는가 — 말뭉치 전량을 재는 **자**(판정기가 아니다).

    npx tsx scripts/qa/build-dim-corpus.ts .tmp-orca/dim-after
    python scripts/qa/measure-dim-label-clear.py .tmp-orca/dim-after

관문이 무는 것은 `src/__tests__/unit/figureDimLabel.test.ts` 다(엔진을 실제로 태운다).
여기는 「전량에서 몇 %인가」를 재는 쪽이라 종료 코드로 판정하지 않는다.

## ⚠️ 자기 치수 점선은 겹침이 아니다

`measured()` 는 라벨을 제 점선 위에 흰 halo 를 깔고 앉힌다 — 제도 관행이고
정본(RPM 중1-2 0849·0845)도 그렇게 한다. 처음 만든 자가 그것까지 세어
「치수 겹침 16.8%」라는 **거짓 경보**를 냈고, 눈으로 보니 걸린 3장이 3장 다
멀쩡했다. 늘 우는 가드는 꺼진다(2026-08-20). 자기 점선은
«문서 순서에서 바로 앞에 붙어 나온 `6 4` 파선»이다(meas → label 순서).

## 실측 (2026-08-28, 그림 149장 · 치수 라벨 50개)

    고치기 전   겹침 16 (32.0%)     그 밖의 라벨 21 (2.8%)
    고친 뒤     겹침  6 (12.0%)     그 밖의 라벨 21 (2.8%)  ← 안 건드렸다

남은 6 중 4 는 **거짓 경보**다 — 화살표 치수를 쓰는 삽화(`90 m`·`140 m`·`80 m`
·`150 m`)라 「자기 치수선」예외가 파선에만 걸려 안 먹는다. 눈으로 확인했다.
"""

import importlib.util, os, sys, math, re
from collections import defaultdict
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.join("scripts", "qa"))
from label_placement import quantile

spec = importlib.util.spec_from_file_location(
    "msvg", os.path.join("scripts", "qa", "measure-svg-label-placement.py"))
msvg = importlib.util.module_from_spec(spec); sys.modules["msvg"] = msvg
spec.loader.exec_module(msvg)

SVG_NS = msvg.SVG_NS
DIM = re.compile(r"^\s*[\d.]+\s*(cm|m|mm|km)\s*$")
DIM_DASH = "6 4"


def _walk(el, out, dash):
    """(kind, payload) 를 **문서 순서로** 담는다. kind: 'stroke' | 'label'."""
    tag = el.tag.replace(SVG_NS, "")
    d = el.get("stroke-dasharray") or dash
    if el.get("data-label") is not None:
        lab = msvg._label_from_group(el)
        if lab is not None:
            out.append(("label", lab, False))
        return
    if tag == "text":
        lab = msvg._label_from_text(el)
        if lab is not None:
            out.append(("label", lab, True))
        return
    ss = []
    if tag == "line":
        a = (float(el.get("x1", 0)), float(el.get("y1", 0)))
        b = (float(el.get("x2", 0)), float(el.get("y2", 0)))
        ss.append(msvg.Stroke(msvg.sample_line(a, b)))
    elif tag == "path" and el.get("d"):
        ss.extend(msvg.path_strokes(el.get("d")))
    elif tag in ("polygon", "polyline"):
        vals = msvg._nums(el.get("points", ""))
        pts = [(vals[i], vals[i + 1]) for i in range(0, len(vals) - 1, 2)]
        if len(pts) >= 2:
            if tag == "polygon":
                pts = pts + [pts[0]]
            for i in range(len(pts) - 1):
                ss.append(msvg.Stroke(msvg.sample_line(pts[i], pts[i + 1])))
    elif tag == "rect":
        if (el.get("fill") or "").lower() not in ("#ffffff", "white"):
            x, y = float(el.get("x", 0)), float(el.get("y", 0))
            w, h = float(el.get("width", 0)), float(el.get("height", 0))
            c = [(x, y), (x + w, y), (x + w, y + h), (x, y + h), (x, y)]
            for i in range(4):
                ss.append(msvg.Stroke(msvg.sample_line(c[i], c[i + 1])))
    elif tag == "circle":
        cx, cy = float(el.get("cx", 0)), float(el.get("cy", 0))
        r = float(el.get("r", 0))
        n = max(16, int(r))
        ss.append(msvg.Stroke([(cx + r * math.cos(2 * math.pi * i / n),
                                cy + r * math.sin(2 * math.pi * i / n))
                               for i in range(n + 1)]))
    for s in ss:
        out.append(("stroke", s, d))
    for child in el:
        _walk(child, out, d)


def point_to_box(px, py, box):
    dx = max(box[0] - px, 0.0, px - box[2])
    dy = max(box[1] - py, 0.0, py - box[3])
    return math.hypot(dx, dy)


def rows_of(path):
    root = ET.fromstring(open(path, encoding="utf-8").read())
    seq = []
    _walk(root, seq, None)
    out = []
    for i, item in enumerate(seq):
        if item[0] != "label":
            continue
        lab, plain = item[1], item[2]
        if lab.size <= 0:
            continue
        dim = bool(DIM.match(lab.text))
        # 자기 치수 점선 — 바로 앞에 **붙어 나온** `6 4` 파선 묶음
        own = set()
        if dim:
            j = i - 1
            while j >= 0 and seq[j][0] == "stroke" and seq[j][2] == DIM_DASH:
                own.add(j); j -= 1
        best = 1e9
        for j, it in enumerate(seq):
            if it[0] != "stroke" or j in own:
                continue
            for p in it[1].pts:
                dd = point_to_box(p[0], p[1], lab.box)
                if dd < best:
                    best = dd
        if best > 1e8:
            continue
        out.append({"text": lab.text, "clear": round(best / lab.size, 3),
                    "overlap": best <= 0.0, "plain": plain, "dim": dim,
                    "own": len(own)})
    return out


d = sys.argv[1]
only = sys.argv[2:] or None
rows = []
for name in sorted(os.listdir(d)):
    if not name.endswith(".svg") or (only and name not in only):
        continue
    try:
        for g in rows_of(os.path.join(d, name)):
            g["file"] = name
            rows.append(g)
    except Exception as e:
        print("실패", name, e)

pl = [r for r in rows if r["plain"]]
rows = [r for r in rows if not r["plain"]]
print(f"(폭이 어림인 라벨 {len(pl)}개는 뺐다 — 그중 치수 {sum(1 for r in pl if r['dim'])}개)")

def report(name, sel):
    if not sel:
        print(f"{name}: 0개"); return
    v = [r["clear"] for r in sel]
    o = sum(1 for r in sel if r["overlap"])
    print(f"{name}: {len(sel)}개 · 겹침 {o} ({o/len(sel)*100:.1f}%) · "
          f"여백 10% {quantile(v,.1):.2f} · 25% {quantile(v,.25):.2f} · 중앙 {quantile(v,.5):.2f}")

report("치수 라벨", [r for r in rows if r["dim"]])
report("그 밖   ", [r for r in rows if not r["dim"]])

per = defaultdict(list)
for r in rows:
    if r["overlap"]:
        per[r["file"]].append(("치수:" if r["dim"] else "") + r["text"])
print(f"\n== 겹친 라벨이 있는 그림 {len(per)}장 "
      f"(치수가 낀 것 {sum(1 for ts in per.values() if any(t.startswith('치수:') for t in ts))}장)")
for f, ts in sorted(per.items(), key=lambda kv: -len(kv[1]))[:30]:
    print(f"   {len(ts):2d}개  {f}   {' '.join(ts[:8])}")
