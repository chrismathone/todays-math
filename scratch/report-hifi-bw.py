"""
`scratch/report-hifi/pdf/*.pdf` → **쪽수 표** + **흑백 PNG** (Hi-fi 브리프 §2 규칙 1·2 · §4-2).

    python scratch/report-hifi-bw.py

PDF 는 `shot-report-hifi.mjs` 가 크롬 인쇄 기본값(배경 그래픽 꺼짐)으로 뜬 것이다. 여기서는 그 PDF 를
그대로 그려(PyMuPDF) **회색조로 바꾼다** — 흑백 프린터가 찍는 모양에 가깝게. 쪽마다 한 장씩.
"""

import json
import pathlib

import fitz  # PyMuPDF
from PIL import Image

ROOT = pathlib.Path("scratch/report-hifi")
PDF = ROOT / "pdf"
BW = ROOT / "bw"
BW.mkdir(parents=True, exist_ok=True)

rows = []
for pdf in sorted(PDF.glob("*.pdf")):
    doc = fitz.open(pdf)
    pages = doc.page_count
    for i, page in enumerate(doc):
        pix = page.get_pixmap(dpi=110)
        img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        img.convert("L").save(BW / f"{pdf.stem}-p{i + 1}.png")
    # 둘째 쪽에 무엇이 넘어갔나 — 글자 몇 자
    spill = doc[1].get_text().strip()[:80].replace("\n", " ") if pages > 1 else ""
    rows.append({"pdf": pdf.name, "pages": pages, "spill": spill})
    print(f"{pdf.stem:24s} {pages}쪽" + (f"  ← 넘친 글자: {spill}" if spill else ""))

(ROOT / "pages.json").write_text(
    json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8"
)
