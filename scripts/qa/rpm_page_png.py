"""RPM 학생용 PDF 의 한 쪽을 PNG 로 뽑는다 — **보기만 한다**(원본을 옮겨 적지 않는다).

    python scripts/qa/rpm_page_png.py <책> <쪽> <나갈파일> [--dpi 150]

책은 `1-2` · `2-2` · `3-2` 처럼 적는다. 우리 엔진 그림과 **1:1 로 견주기 위한**
QA 산출물이며, 저장소에 커밋하지 않는다(`.tmp-orca/` 아래에 둔다).

⚠️ 저작권 — 이 PNG 는 대조용이다. 문항 본문·수치를 우리 자료로 옮기지 않는다.
"""

from __future__ import annotations

import os
import sys

import pymupdf

ROOT = r"N:\개인\강아\교재자료\RPM\22"
FILES = {
    "1-1": "RPM 중학 1-1 학생용.pdf",
    "1-2": "RPM 중학 1-2 학생용.pdf",
    "2-1": "RPM 중학 2-1 학생용.pdf",
    "2-2": "RPM 중학 2-2 학생용.pdf",
    "3-1": "RPM 중학 3-1 학생용.pdf",
    "3-2": "RPM 중학 3-2 학생용.pdf",
}


def main() -> int:
    if len(sys.argv) < 4:
        sys.stderr.write(__doc__ or "")
        return 2
    book, page_no, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
    dpi = 150
    if "--dpi" in sys.argv:
        dpi = int(sys.argv[sys.argv.index("--dpi") + 1])
    if book not in FILES:
        sys.stderr.write(f"모르는 책: {book} (아는 것: {', '.join(FILES)})\n")
        return 2
    path = os.path.join(ROOT, FILES[book])
    if not os.path.exists(path):
        sys.stderr.write(f"원본이 없다: {path}\n")
        return 1
    doc = pymupdf.open(path)
    # 카탈로그의 `page` 는 **책 쪽 번호**다 — PDF 색인은 0부터라 그대로 쓰면 어긋난다.
    # 실측으로 맞춘 오프셋을 `--offset` 으로 넘길 수 있게 두고, 기본은 그대로 본다.
    index = page_no - 1
    if "--offset" in sys.argv:
        index += int(sys.argv[sys.argv.index("--offset") + 1])
    if not (0 <= index < doc.page_count):
        sys.stderr.write(f"쪽 범위 밖: {page_no} (전체 {doc.page_count})\n")
        return 1
    pix = doc[index].get_pixmap(dpi=dpi)
    pix.save(out)
    sys.stdout.write(f"{out} ({pix.width}x{pix.height}, 책 {page_no}쪽 → PDF {index})\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
