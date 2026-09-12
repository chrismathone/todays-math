# -*- coding: utf-8 -*-
"""원본 지면에서 **표를 오려** 그림으로 붙인다 — 다시 그리지 않는다 (2026-09-12).

    python crop_tables.py --src <paper.pdf> --out <figures 폴더> --numbers 1,14

HWP 는 표를 한 줄에 한 칸씩 풀어 주고, 우리 렌더러는 표를 모른다(DB 에 표 0행).
원장님 원칙 「기출은 그림 완전 이전이 생명」대로 원본 지면의 표 구역을 **그대로**
렌더해 붙인다. 발문의 풀린 칸 줄은 `build-exam-drafts.ts` 가 걷는다.

## 표 구역을 어떻게 찾나 — 괘선

문항 영역(같은 단, 자기 번호 마커 ~ 같은 단 다음 마커) 안의 **괘선**(`get_drawings`)을
모아 상자를 짓는다. 빼는 것 둘 — **단 구분선**(세로로 지면을 가로지른다)과
**쪽 번호 꼬리 상자**(지면 맨 아래).

🔴 **상자는 좌표로 직접 합친다.** `fitz.Rect` 의 합집합은 «빈» 사각형을 버리는데,
   가로·세로 괘선은 폭이나 높이가 0 이라 **전부 «빈» 사각형**이다(CLAUDE.md 2026-08-19 —
   `is_empty` 는 한 변만 0 이어도 참). 그대로 합치면 표가 폭 0 으로 나온다(실제로 났다).

`index.json` 에 `kind: "table"` 로 덧붙인다. 같은 파일 이름이 있으면 바꾼다(멱등).
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

import pymupdf

NUM_RE = re.compile(r"^\s*(\d{1,2})\.\s")
COLUMN_SPLIT = 350.0
PT_TO_MM = 25.4 / 72.0
PAD = 3.0
#: 이만큼 벌어지면 다른 덩이다(표의 가로 괘선 간격은 20pt 안팎, 표와 보기 상자 사이는 20pt 넘는다).
GAP = 6.0
DPI = 300


def markers(page: pymupdf.Page) -> list[tuple[int, float, int]]:
    out = []
    for b in page.get_text("dict")["blocks"]:
        if b["type"] != 0:
            continue
        for ln in b["lines"]:
            t = "".join(s["text"] for s in ln["spans"])
            m = NUM_RE.match(t)
            if m:
                out.append((0 if ln["bbox"][0] < COLUMN_SPLIT else 1, ln["bbox"][1], int(m.group(1))))
    return sorted(out)


def main() -> int:
    a = sys.argv[1:]
    src = pathlib.Path(a[a.index("--src") + 1])
    out = pathlib.Path(a[a.index("--out") + 1])
    want = {int(x) for x in a[a.index("--numbers") + 1].split(",") if x}
    doc = pymupdf.open(src)
    idx_path = out / "index.json"
    idx = json.loads(idx_path.read_text(encoding="utf-8")) if idx_path.exists() else {"figures": [], "dropped": []}

    found: dict[int, dict] = {}
    for pno, page in enumerate(doc):
        mk = markers(page)
        if mk and pno > 0 and min(m[2] for m in mk) == 1:
            break  # 정답 쪽 — 번호가 1로 되돌아간다
        H, W = page.rect.height, page.rect.width
        for i, (col, y0, n) in enumerate(mk):
            if n not in want or n in found:
                continue
            nxt = [m[1] for m in mk[i + 1:] if m[0] == col]
            y1 = nxt[0] if nxt else H - 60
            x_lo, x_hi = (0.0, COLUMN_SPLIT) if col == 0 else (COLUMN_SPLIT, W)
            xs0, ys0, xs1, ys1 = [], [], [], []
            for dr in page.get_drawings():
                r = dr["rect"]
                cx, cy = (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2
                if not (x_lo <= cx < x_hi and y0 < cy < y1):
                    continue
                if r.height > 400:        # 단 구분선
                    continue
                if r.y0 > H - 90:         # 쪽 번호 꼬리
                    continue
                if max(r.width, r.height) <= 4:
                    continue
                xs0.append(r.x0); ys0.append(r.y0); xs1.append(r.x1); ys1.append(r.y1)
            if not xs0:
                print(f"🔴 문{n}: 괘선을 못 찾았다 — 멈춘다(표가 그림으로 박혀 있거나 괘선이 없다)")
                return 2
            # 🔴 문항 영역의 괘선을 **전부** 합치면 안 된다 — 동도중 문1 은 표 아래의
            #    〈보기〉 상자 테두리까지 한 덩이로 오려졌다(발문에도 보기가 있으니 두 번 나간다).
            #    세로로 GAP 보다 벌어진 곳에서 덩이를 끊고, 크기가 표다운 **맨 위 덩이**를 쓴다.
            boxes = sorted(zip(xs0, ys0, xs1, ys1), key=lambda b: b[1])
            groups = []
            for b in boxes:
                if groups and b[1] <= groups[-1][3] + GAP:
                    g = groups[-1]
                    groups[-1] = [min(g[0], b[0]), min(g[1], b[1]), max(g[2], b[2]), max(g[3], b[3])]
                else:
                    groups.append(list(b))
            big = [g for g in groups if g[2] - g[0] >= 40 and g[3] - g[1] >= 15]
            if not big:
                print(f"🔴 문{n}: 표만 한 괘선 덩이가 없다 — 멈춘다")
                return 2
            if len(groups) > 1:
                print(f"   문{n}: 괘선 덩이 {len(groups)}개 — 맨 위 표 덩이만 쓴다 " + str([[round(v) for v in g] for g in groups]))
            t = big[0]
            clip = pymupdf.Rect(t[0] - PAD, t[1] - PAD, t[2] + PAD, t[3] + PAD)
            if clip.width < 40 or clip.height < 15:
                print(f"🔴 문{n}: 표 상자가 {clip.width:.0f}x{clip.height:.0f}pt — 표로 보기엔 너무 작다, 멈춘다")
                return 2
            pix = page.get_pixmap(clip=clip, dpi=DPI)
            name = f"q{n:02d}-t.png"
            (out / name).write_bytes(pix.tobytes("png"))
            found[n] = {
                "number": n, "page": pno + 1, "file": name, "column": col, "kind": "table",
                "bbox": [round(v, 2) for v in (clip.x0, clip.y0, clip.x1, clip.y1)],
                "widthPt": round(clip.width, 2), "heightPt": round(clip.height, 2),
                "widthMm": round(clip.width * PT_TO_MM, 2), "px": [pix.width, pix.height],
                "dpi": DPI, "bytes": (out / name).stat().st_size,
            }
    missing = sorted(want - set(found))
    if missing:
        print(f"🔴 표를 못 찾은 문항 {missing} — 멈춘다")
        return 2
    keep = [f for f in idx["figures"] if f["file"] not in {v["file"] for v in found.values()}]
    idx["figures"] = sorted(keep + list(found.values()), key=lambda r: (r["number"], r["file"]))
    idx_path.write_text(json.dumps(idx, ensure_ascii=False, indent=2), encoding="utf-8")
    for n, f in sorted(found.items()):
        print(f"  문{n:2d} 표  p{f['page']} {'좌' if f['column'] == 0 else '우'}  {f['widthMm']:.1f}mm  {f['px'][0]}x{f['px'][1]}px")
    return 0


if __name__ == "__main__":
    sys.exit(main())
