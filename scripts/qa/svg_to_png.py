"""SVG 파일 → PNG. 우리 그림을 **눈으로 보고** RPM 원본과 견주려고 쓴다.

    python scripts/qa/svg_to_png.py <입력.svg> <나갈.png> [--scale 3]

⚠️ PyMuPDF 의 SVG 처리는 폰트 대체가 원본 지면과 다를 수 있다. **모양·자리**를
   보는 용도이지 글꼴 검수용이 아니다.
"""

from __future__ import annotations

import sys

import pymupdf


def main() -> int:
    if len(sys.argv) < 3:
        sys.stderr.write(__doc__ or "")
        return 2
    src, out = sys.argv[1], sys.argv[2]
    scale = 3.0
    if "--scale" in sys.argv:
        scale = float(sys.argv[sys.argv.index("--scale") + 1])
    doc = pymupdf.open(src)
    pdf = doc.convert_to_pdf()
    page = pymupdf.open("pdf", pdf)[0]
    pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False)
    pix.save(out)
    sys.stdout.write(f"{out} ({pix.width}x{pix.height})\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
