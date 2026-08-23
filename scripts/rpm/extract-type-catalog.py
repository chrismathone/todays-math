"""RPM 중학 6권의 **유형 색인**을 뽑는다 — 「어떤 유형이 존재하나」의 정본.

    python scripts/rpm/extract-type-catalog.py            # → scripts/rpm/rpm-type-catalog.json
    python scripts/rpm/extract-type-catalog.py --md       # 마크다운 색인도 같이 쓴다

## 왜 글꼴로 뽑나 — 글자로는 못 가른다

RPM 지면의 유형 머리는 네 조각이 **같은 y 밴드**에 놓인 상자다:

    [유형]  [01]  [소수와 합성수]        개념원리 중학 수학 1-1 13쪽
     ^라벨   ^번호  ^제목                  ^교과서 참조(윗줄)

「유형」이라는 낱말은 차례·머리말에도 나오고 두 자리 숫자는 지면에 널려 있다.
가르는 것은 **글꼴**이다 (실측, `C:/tmp/probe_rpm4.py`):

  라벨 `유형`   = SDGogoRound05Bd
  번호          = ITCAvantGardeStd-Bold  (낱글자 span 으로 쪼개져 나온다 — 이어 붙인다)
  제목          = YDVYGOStd14

⚠️ 지면이 **2단**이라 왼단(x≈61)과 오른단(x≈326)의 머리가 같은 y 밴드에 있다.
   밴드만 보고 묶으면 옆단 제목을 가져온다 — 반드시 **라벨 오른쪽·같은 단**으로 좁힌다.

## 단원은 바닥글에서 — 왼쪽·오른쪽이 **다른 것**을 보여 준다 (실측)

    왼쪽(짝수) 쪽 : [I](BodoniStd) [. 소인수분해](YDVYGOStd12)          ← 대단원
    오른쪽(홀수) 쪽: [01](DINPro-Medium) [ 소인수분해](YDVYGOStd12)      ← 중단원

한 컬럼만 보고 「단원」이라 부르면 대단원과 중단원이 섞여 유형 번호가 겹쳐 보인다
(첫 판이 그랬다 — 「소인수분해 18개 01~13」). 둘을 따로 들고 **이어 나른다**.

## 이어 나르기가 틀릴 수 있는 자리 — 그래서 가드가 있다

왼쪽 쪽에는 중단원 표시가 없어 **직전 오른쪽 쪽의 값**을 물려받는다. 중단원이 하필
왼쪽 쪽에서 시작하면 그 쪽의 유형이 앞 중단원으로 붙는다. 이건 조용히 틀리므로,
**유형 번호가 01 로 되돌아갔는데 중단원이 안 바뀐 자리**를 세어 보고에 찍는다
(`boundary_warnings`). 0 이 아니면 이어 나르기를 믿지 마라.
"""

import argparse
import io
import json
import os
import re
import sys

import pymupdf

SRC_DIR = ".rpm-src"
BOOKS = [
    ("중1", "1-1", "RPM 중학 1-1 학생용.pdf"),
    ("중1", "1-2", "RPM 중학 1-2 학생용.pdf"),
    ("중2", "2-1", "RPM 중학 2-1 학생용.pdf"),
    ("중2", "2-2", "RPM 중학 2-2 학생용.pdf"),
    ("중3", "3-1", "RPM 중학 3-1 학생용.pdf"),
    ("중3", "3-2", "RPM 중학 3-2 학생용.pdf"),
]

FONT_LABEL = "SDGogoRound05Bd"
FONT_NUM = "ITCAvantGardeStd-Bold"
# 제목 글꼴은 **하나가 아니다** — YDVYGOStd14 가 기본이지만 YDVYGOStd34·
# YDVYGOStd16(⑴⑵ 첨자) 도 쓴다. 하나만 적었더니 2-1 의 두 머리가 제목을 잃었다.
#
# ⚠️ **크기로는 못 자른다.** RPM 은 긴 제목을 상자에 맞추려 **줄여** 넣는다 —
#    「수직선 위의 두 점으로부터 같은 거리에 있는 점」은 9.86pt 다(1-1 p41 실측).
#    10.4pt 문턱을 걸었더니 멀쩡한 머리 25개가 「제목 없음」이 됐다.
#    가르는 축은 크기가 아니라 **글꼴 가족 + 세로 자리**다:
#      제목       = YDVYGO*  · 번호와 같은 줄(+접힌 둘째 줄까지 ≈11.7pt)
#      설명글     = YDVYGOStd12 · 번호보다 **26pt 아래** — 밴드 밖
#      교과서 참조 = YDVYGOStd13/11 · 번호보다 **11pt 위** — 밴드 밖
FONT_TITLE_PREFIX = "YDVYGO"
FONT_UNIT_NAME = "YDVYGOStd12"
FONT_MAJOR_MARK = "BodoniStd"  # 대단원 로마숫자
FONT_MINOR_MARK = "DINPro-Medium"  # 중단원 두 자리 번호

COLUMN_SPAN = 240.0
BAND_UP = 4.0
BAND_DOWN = 6.0
# 제목이 두 줄로 접히는 경우까지만. 설명글은 +26pt 라 여기 안 든다 —
# 넓히면 설명글이 제목으로 딸려 온다(조용히 틀린다).
TITLE_BAND_DOWN = 13.0
FOOTER_BAND = 70.0


def join_title(spans):
    """제목 span 들을 지면 순서대로 잇는다 — 같은 줄은 붙이고, 줄이 바뀌면 띄운다."""
    if not spans:
        return ""
    lines = {}
    for s in spans:
        lines.setdefault(round(s["bbox"][1] / 6.0), []).append(s)
    parts = []
    for key in sorted(lines):
        row = sorted(lines[key], key=lambda s: s["bbox"][0])
        parts.append("".join(s["text"] for s in row))
    return re.sub(r"\s+", " ", " ".join(parts)).strip()


def spans_of(page):
    out = []
    for b in page.get_text("dict")["blocks"]:
        if b.get("type") != 0:
            continue
        for line in b["lines"]:
            for s in line["spans"]:
                if s["text"].strip():
                    out.append(s)
    return out


def footer_units(spans, page_height):
    """(대단원, 중단원) — 그 쪽에 있는 것만. 없으면 None."""
    foot = [s for s in spans if s["bbox"][1] > page_height - FOOTER_BAND]
    names = [s for s in foot if s["font"] == FONT_UNIT_NAME]
    if not names:
        return None, None
    name = max(names, key=lambda s: len(s["text"])) ["text"]
    name = re.sub(r"^\s*[.\s]+", "", name).strip()

    has_major = any(s["font"] == FONT_MAJOR_MARK for s in foot)
    has_minor = any(s["font"] == FONT_MINOR_MARK for s in foot)
    if has_major and not has_minor:
        return name, None
    if has_minor and not has_major:
        return None, name
    return None, None


def extract_book(path):
    doc = pymupdf.open(path)
    rows = []
    incomplete = []
    cur_major = None
    cur_minor = None

    for pno in range(doc.page_count):
        page = doc[pno]
        spans = spans_of(page)
        major, minor = footer_units(spans, page.rect.height)
        if major:
            cur_major = major
        if minor:
            cur_minor = minor

        # 본문이 시작되기 전(차례·머리말)에는 단원 표시가 없다 — 그 구간의 「유형」은 버린다.
        in_body = cur_major is not None

        # 2단 지면이라 같은 줄에 머리가 둘이다 — 읽기 순서는 **줄 먼저, 그다음 왼→오른쪽**.
        # 정렬하지 않으면 오른단(04)이 왼단(03)보다 먼저 나와 「번호가 되돌아갔다」로 보인다.
        labels = sorted(
            (s for s in spans if s["font"] == FONT_LABEL and s["text"].strip() == "유형"),
            key=lambda s: (round(s["bbox"][1] / 6.0), s["bbox"][0]),
        )
        for lab in labels:
            lx0, ly0, _lx1, ly1 = lab["bbox"]
            band = [
                s
                for s in spans
                if s["bbox"][3] > ly0 - BAND_UP
                and s["bbox"][1] < ly1 + BAND_DOWN
                and s["bbox"][0] >= lx0
                and s["bbox"][0] < lx0 + COLUMN_SPAN
            ]
            nums = sorted(
                (s for s in band if s["font"] == FONT_NUM), key=lambda s: s["bbox"][0]
            )
            number = "".join(s["text"].strip() for s in nums)

            # 제목은 **두 줄로 접힐 수 있다** (「…미지수의 / 값 구하기」). 번호 밴드보다
            # 아래로 두 줄 더 본다 — 본문은 명조라 넓혀도 딸려 오지 않는다.
            title_spans = [
                s
                for s in spans
                if s["font"].startswith(FONT_TITLE_PREFIX)
                and s["bbox"][3] > ly0 - BAND_UP
                and s["bbox"][1] < ly1 + TITLE_BAND_DOWN
                and s["bbox"][0] >= lx0
                and s["bbox"][0] < lx0 + COLUMN_SPAN
            ]
            title = join_title(title_spans)

            if not in_body:
                continue
            if not number or not title:
                incomplete.append(
                    {
                        "page": pno + 1,
                        "major": cur_major,
                        "minor": cur_minor,
                        "number": number or None,
                        "title": title or None,
                    }
                )
                continue
            rows.append(
                {
                    "page": pno + 1,
                    "major": cur_major,
                    "minor": cur_minor,
                    "number": number,
                    "title": title,
                }
            )
    doc.close()
    return rows, incomplete


def boundary_warnings(rows):
    """유형 번호가 01 로 되돌아갔는데 중단원이 그대로인 자리 — 이어 나르기가 틀린 신호."""
    warns = []
    prev = None
    for r in rows:
        if prev is not None:
            try:
                n_now, n_prev = int(r["number"]), int(prev["number"])
            except ValueError:
                prev = r
                continue
            if n_now < n_prev and r["minor"] == prev["minor"]:
                warns.append(
                    f'p{r["page"]} {r["minor"]}: {prev["number"]} → {r["number"]} (중단원 그대로)'
                )
        prev = r
    return warns


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--md", action="store_true")
    ap.add_argument("--out", default="scripts/rpm/rpm-type-catalog.json")
    args = ap.parse_args()

    result = {}
    total = 0
    warn_total = 0
    inc_total = 0
    lines = []

    for grade, book, fname in BOOKS:
        path = os.path.join(SRC_DIR, fname)
        if not os.path.exists(path):
            print(f"[없음] {path}", file=sys.stderr)
            continue
        rows, incomplete = extract_book(path)
        warns = boundary_warnings(rows)
        total += len(rows)
        warn_total += len(warns)
        inc_total += len(incomplete)

        minors = []
        for r in rows:
            if r["minor"] and r["minor"] not in minors:
                minors.append(r["minor"])
        majors = []
        for r in rows:
            if r["major"] and r["major"] not in majors:
                majors.append(r["major"])

        result[book] = {
            "grade": grade,
            "file": fname,
            "types": rows,
            "incomplete": incomplete,
            "boundary_warnings": warns,
        }
        lines.append(
            f"{book}: 유형 {len(rows)} · 대단원 {len(majors)} · 중단원 {len(minors)}"
            f" · 깨진머리 {len(incomplete)} · 경계경고 {len(warns)}"
        )

    with io.open(args.out, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=1)

    report = "\n".join(lines) + f"\n\n합계 유형 {total} · 깨진머리 {inc_total} · 경계경고 {warn_total}\n"
    with io.open("C:/tmp/rpm-catalog-report.txt", "w", encoding="utf-8") as f:
        f.write(report)
        for book, data in result.items():
            if data["boundary_warnings"]:
                f.write(f"\n[{book} 경계경고]\n")
                for w in data["boundary_warnings"]:
                    f.write(f"  {w}\n")
            if data["incomplete"]:
                f.write(f"\n[{book} 깨진머리]\n")
                for i in data["incomplete"]:
                    f.write(f"  p{i['page']} {i['minor']} num={i['number']} title={i['title']}\n")
    print("report → C:/tmp/rpm-catalog-report.txt")

    if args.md:
        md_path = "docs/planning/tracks/rpm-type-catalog.md"
        with io.open(md_path, "w", encoding="utf-8") as f:
            f.write("# RPM 중학 유형 색인 (자동 생성 — 손으로 고치지 말 것)\n\n")
            f.write("`python scripts/rpm/extract-type-catalog.py --md` 가 만든다.\n")
            f.write("고칠 것이 있으면 추출기를 고쳐라.\n\n")
            f.write(f"6권 합계 **{total}개 유형**.\n")
            for book, data in result.items():
                f.write(f"\n## {data['grade']} ({book}) — {len(data['types'])}개\n")
                cur = None
                for r in data["types"]:
                    key = (r["major"], r["minor"])
                    if key != cur:
                        cur = key
                        f.write(f"\n### {r['major']} › {r['minor']}\n\n")
                    f.write(f"- **{r['number']}** {r['title']} <sub>p{r['page']}</sub>\n")
        print(f"마크다운 → {md_path}")


if __name__ == "__main__":
    main()
