# -*- coding: utf-8 -*-
"""실물 에셋 갤러리 생성기 — 커밋되는 육안 자료를 manifest 에서 다시 만든다.

에셋을 추가/수정하면 이 스크립트를 다시 돌려 산출물을 같이 커밋할 것.
(손으로 옮겨 적지 않는다 — 목록의 정본은 manifest*.json 하나다.)

산출물:
  - scripts/figure/assets/README.md            (GitHub 에서 바로 보이는 갤러리)
  - docs/planning/tracks/figure-asset-gallery.html  (원장님 육안용 — 실렌더 경로 통과본)

각 에셋은 assetScene → render_spec.py 실제 파이프라인(로더 검증 + 정제기)을
통과시켜 넣는다 — 파일을 그대로 붙이면 «로더가 거부할 에셋»도 갤러리에선
멀쩡해 보인다(지표가 실패를 셀 수 있는 형태여야 한다).

사용: python scripts/figure/build_asset_gallery.py
"""
from __future__ import annotations

import io
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)

from figure_assets import list_assets  # noqa: E402

README_PATH = os.path.join(HERE, "assets", "README.md")
HTML_PATH = os.path.join(ROOT, "docs", "planning", "tracks", "figure-asset-gallery.html")


def render_one(slug: str, vb_w: float, vb_h: float) -> str:
    """실제 파이프라인으로 렌더 — 실패는 그대로 던진다 (조용한 폴백 금지)."""
    aw = 100.0
    ah = aw * vb_h / vb_w
    spec = {
        "version": "elem-1",
        "kind": "assetScene",
        "items": [{"asset": slug, "x": 10, "y": 10, "w": aw}],
        "canvas": [max(40, min(480, aw + 20)), max(30, min(360, ah + 20))],
    }
    p = subprocess.run(
        [sys.executable, os.path.join(HERE, "render_spec.py")],
        input=json.dumps(spec).encode("utf-8"),
        capture_output=True,
        timeout=30,
    )
    res = json.loads(p.stdout.decode("utf-8"))
    if "svg" not in res:
        raise RuntimeError(f"에셋 {slug} 렌더 실패: {res.get('error', '?')}")
    return res["svg"]


def main() -> None:
    assets = sorted(list_assets(), key=lambda a: a["slug"])
    if not assets:
        raise RuntimeError("manifest 에 에셋이 없습니다")

    # 1) README.md — GitHub 렌더용 (svg 파일을 상대 경로로 직접 가리킨다)
    md = [
        "# 실물 에셋 목록",
        "",
        f"`assetScene` kind(figure_assets.py) 가 합성에 쓰는 자작 SVG {len(assets)}종.",
        "규격·검증은 `figure_assets.py` 가 강제한다 (허용 태그만 · text/id/href/url 금지).",
        "",
        "**이 문서는 `python scripts/figure/build_asset_gallery.py` 가 생성한다 —",
        "에셋을 추가/수정하면 다시 돌려 같이 커밋할 것.** (손 편집 금지)",
        "",
        "| 미리보기 | slug | 이름 | viewBox | tags |",
        "|---|---|---|---|---|",
    ]
    for a in assets:
        w, h = a["viewBox"]
        tags = " ".join(a.get("tags") or [])
        md.append(
            f'| <img src="{a["file"]}" width="90"> | `{a["slug"]}` | {a["label"]} | {w}×{h} | {tags} |'
        )
    md.append("")
    io.open(README_PATH, "w", encoding="utf-8", newline="\n").write("\n".join(md))

    # 2) 육안용 HTML — 실렌더 경로 통과본을 인라인으로 (자급자족 한 파일)
    cells = []
    for a in assets:
        w, h = a["viewBox"]
        svg = render_one(a["slug"], float(w), float(h))
        tags = " · ".join(a.get("tags") or [])
        cells.append(
            f"<div class='c'><div class='t'><b>{a['label']}</b> <code>{a['slug']}</code>"
            f" {w}×{h}<br><span class='g'>{tags}</span></div>{svg}</div>"
        )
    html = (
        "<meta charset='utf-8'><title>실물 에셋 갤러리</title>"
        "<style>body{font-family:sans-serif;background:#f4f4f2;margin:20px}"
        ".c{display:inline-block;vertical-align:top;background:#fff;border:1px solid #ddd;"
        "border-radius:8px;padding:8px;margin:6px}"
        ".t{font-size:12px;margin-bottom:4px}code{color:#888}.g{color:#7a8}</style>"
        f"<h2>실물 에셋 갤러리 ({len(assets)}종 — 실렌더 경로 통과본)</h2>"
        "<p>생성: <code>python scripts/figure/build_asset_gallery.py</code> · "
        "D-07: 실제 출제 지면 사용 전 원장님 확정 필요</p>" + "".join(cells)
    )
    io.open(HTML_PATH, "w", encoding="utf-8", newline="\n").write(html)

    print(f"에셋 {len(assets)}종 → README.md + figure-asset-gallery.html")


if __name__ == "__main__":
    main()
