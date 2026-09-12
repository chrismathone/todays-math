"""RPM 고등(2022 개정) 7권의 **유형 색인**을 뽑는다 — 「어떤 유형이 존재하나」의 정본.

    python scripts/rpm/extract-high-type-catalog.py            # → scripts/rpm/rpm-high-type-catalog.json
    python scripts/rpm/extract-high-type-catalog.py --md       # 마크다운 색인도 같이 쓴다
    python scripts/rpm/extract-high-type-catalog.py --books 공통수학1,공통수학2

중등판(`extract-type-catalog.py`)과 **같은 일을 다른 글꼴로** 한다. 고등 RPM 은 조판이
달라 중등판이 유형 머리를 한 개도 못 본다(실측 2026-09-13). 상수만 바꿔 한 파일에 두 벌의
글꼴 표를 두지 않는다 — 그러면 「어느 표로 뽑았나」가 산출물에 안 남고, 한쪽 표를 고칠 때
다른 책이 조용히 깨진다.

## 어느 판인가 — 2022 개정, `N:\개인\강아\교재자료\RPM\22`

원장님이 2026-09-13 에 짚어 주신 폴더다. **책 이름이 우리 교육과정 시드와 같다**
(공통수학1·2 · 대수 · 미적분Ⅰ·Ⅱ · 확률과 통계 · 기하) — 과목명 대응표가 필요 없다.
E: 에 있는 「RPM 수학 상·하 / 수학Ⅰ·Ⅱ」는 **2015 개정**이라 쓰지 않는다(그 판은 조판도
다르고 2022 에서 새로 든 «행렬»이 없다). 이 폴더는 N드라이브라 끊길 때가 있으므로
`.rpm-src/22/` 에 복사해 두고 읽는다(커밋되지 않는다 — 10-handoff §1.2).

## 유형 머리 — **번호**로 잡는다 (실측 공통수학1 p10 · p28)

    [유형](YDVYGO14 7.8pt) [01](DINPro-Black 15.2pt) [다항식의 덧셈과 뺄셈](YDVYGO14 9.7pt)
     ^라벨 — 없을 때가 있다 ^번호 — 늘 있다             ^제목

🔴 **「유형」 라벨로 머리를 잡으면 안 된다.** 첫 판이 그렇게 했고 **42개를 놓쳤다**
   (공통수학1 22 · 공통수학2 20). 중단원의 뒤쪽 유형 머리에는 라벨이 **안 찍힌다**
   (p28 「13 조립제법과 항등식」·「14 수의 나눗셈에서 나머지정리의 활용」). 본보기 중단원의
   원문을 읽다가 드러났다 — 깨진머리 0 · 경계경고 0 인 채로 조용히 모자랐다.
   번호(DINPro-Black ≥14pt 두 자리)는 머리마다 있고, 그 수가 머리 수와 **정확히 같다**
   (공통수학1 170 = 148 + 22). 그래서 열쇠는 번호다.
⚠️ 큰 두 자리 숫자는 세 가지다 — 유형 번호(DINPro-Black 15pt) · 중단원 머리(DINPro-Medium
   20pt) · 대단원 머리(DIN-Bold 51pt). 글꼴 이름으로 가른다.
⚠️ 제목은 **여러 글꼴**이다 — 한글은 YDVYGO14(「조합」 중단원만 YDVYGO13), 제목 안의 수식은
   BTsusich-safe-input-bold 10pt(「$A^n$ 의 추정」·「방정식 $f(x, y)=0$ 이 나타내는 도형의」),
   쉼표는 YDVYMjO13. 셋을 다 받아야 제목이 성하다. 설명글(YDVYMjO12)·쪽 참조(5.8pt)는 안 받는다.
⚠️ 제목은 **번호 오른쪽, 같은 단 안**에서만 잡는다. 왼단 머리의 오른쪽 250pt 에는 **오른단 본문**
   (x≈322~330)이 들어온다 — 단 경계(x=312)에서 자른다.

## 문항마다 난이도 표가 붙어 있다 — 유형의 칸을 정하는 근거

    문항 번호 옆에 「상중하」 세 글자가 **늘 다 찍힌다.** 난이도는 **검은 글자**(#231F20)가
    말하고 나머지는 회색(#939598)이다. 한 칸 또는 이웃 두 칸이 검다:
      하 · 중하 · 중 · 상중 · 상  ← 검은 조각이 곧 그 문항의 난이도

🔴 **색을 안 보고 조각을 세면 틀린다.** 첫 판이 그렇게 셌다 — 「중」이 검으면 회색 「상」·「하」가
   같이 세어져 모든 유형이 「하2 … 상2」처럼 보였다(실측: 회색 하 404 · 회색 상 344 가 섞였다).
   원문 텍스트에는 「0126 상중하」로 세 글자가 다 나오므로 글자로는 못 가른다 — **색이 가른다.**
   공통수학1 실측(검은 것만): 중 290 · 상중 114 · 중하 54 · 하 4 · 상 1. 대표문제에는 표가 없다.

유형 머리 다음부터 다음 머리 전까지의 검은 표를 그 유형 것으로 센다(`levels`). 읽기 순서는
**열 단위**(왼단 위→아래, 그다음 오른단 — 아래 참고)라, 표도 같은 순서로 흘려 붙인다.
쪽이 바뀌어도 이어진다. 이 값이 6칸(연산~심화상) 배정의 **근거**다 —
`high-engine-plan.md` §1-4.

## 단원은 바닥글에서 — 왼쪽·오른쪽이 다른 것을 보여 준다 (실측)

    왼쪽(짝수) 쪽 : [Ⅰ.](YDVYMjO12) [ 다항식](YDVYGO12)                ← 대단원
    오른쪽(홀수) 쪽: [02](DIN-Medium) [항등식과 나머지정리](YDVYGO12)   ← 중단원

바닥글은 y≈798(지면 높이 842) 한 줄뿐이다. 띠를 넓게 잡으면 본문 마지막 줄이 바닥글로
잡힌다(2015 판에서 실제로 「㉠, ㉡이 일치해야 하므로」가 중단원이 됐다). 해설 쪽은 본문 마지막
줄(6.8pt)이 바닥글과 **같은 y** 에 놓여 「가장 긴 이름」을 고르면 「가 나타내는 그래프의」가
대단원이 된다. 그래서 이름은 **표시 바로 오른쪽 · 바닥글 크기(7.8pt)** 인 것만 받는다.

중등판과 **같은 이어 나르기 함정**이 있다 — 왼쪽 쪽에는 중단원 표시가 없어 직전
오른쪽 쪽의 값을 물려받는다. 중단원이 왼쪽 쪽에서 시작하면 그 쪽 유형이 앞 중단원으로
붙는다. 그래서 「번호가 되돌아갔는데 중단원이 안 바뀐 자리」를 `boundary_warnings` 로
찍는다. 0 이 아니면 이어 나르기를 믿지 마라.

## 번호는 열 단위로 흐른다

2단 지면인데 유형 번호는 왼단 위→아래, 그다음 오른단이다(2015 판 실측 p23: 03 왼단 위 ·
04 왼단 아래 · 05 오른단 위 — 2022 판도 같은 조판사). 중등판처럼 줄 단위로 읽으면
「번호가 되돌아갔다」가 아홉 자리 난다. 정렬 열쇠는 `(오른단인가, y)` 다.
"""

import argparse
import io
import json
import os
import re
import sys

import pymupdf

SRC_CANDIDATES = (
    ".rpm-src/22",
    r"N:\개인\강아\교재자료\RPM\22",
)

# (우리 시드 과목명 = 색인 키, 학생용 파일 이름). 파일 이름의 로마숫자(Ⅰ·Ⅱ)는 시드에서 1·2 다.
BOOKS = [
    ("공통수학1", "RPM 공통수학1 학생용.pdf"),
    ("공통수학2", "RPM 공통수학2 학생용.pdf"),
    ("대수", "RPM 대수 학생용.pdf"),
    ("미적분1", "RPM 미적분Ⅰ 학생용.pdf"),
    ("미적분2", "RPM 미적분Ⅱ 학생용.pdf"),
    ("확률과 통계", "RPM 확률과 통계 학생용.pdf"),
    ("기하", "RPM 기하 학생용.pdf"),
]

FONT_LABEL = "YDVYGO14"
LABEL_MAX_SIZE = 9.0  # 라벨 7.8pt · 제목 9.7pt — 같은 글꼴이라 크기로 가른다
FONT_LABEL_BOX = "YDVYGO13"  # 대표문제 상자의 「유형」 — 보고에만 센다
FONT_NUM = "DINPro-Black"
NUM_MIN_SIZE = 14.0
TWO_DIGITS = re.compile(r"^\d{2}$")

# 제목 조각 — (글꼴 접두, 최소 크기)
TITLE_FONTS = (
    ("YDVYGO", 9.0),  # 한글 제목(YDVYGO14 · 「조합」은 YDVYGO13)
    ("BTsusich-safe-input-bold", 9.5),  # 제목 안의 수식
    ("YDVYMjO13", 9.0),  # 제목 안의 쉼표
)
FONT_LEVEL = "YDVYGO13"
LEVELS = ("하", "중하", "중", "중상", "상중", "상")
LEVEL_ACTIVE_COLOR = 0x231F20  # 검은 조각 = 그 문항의 난이도. 회색(0x939598)은 꺼진 칸
FONT_FOOT_NAME = "YDVYGO12"
FONT_FOOT_MAJOR_MARK = "YDVYMjO12"  # 「Ⅰ.」
FONT_FOOT_MINOR_MARK = "DIN-Medium"  # 「02」
# 바닥글의 대단원 표시는 늘 「Ⅰ.」처럼 점이 붙는다. 점 없는 로마숫자는 본문(보기 Ⅰ·Ⅱ)이다.
ROMAN = re.compile(r"^[ⅠⅡⅢⅣⅤⅥⅦⅧ]\.$")

COLUMN_MID = 312.0  # 지면 폭 624 — 왼단 머리 번호 x≈80~98 · 오른단 x≈345~363
# 제목 띠 — 번호 윗변 기준. 제목은 +5~+9pt, 두 줄로 접히면 둘째 줄이 ≈+20pt.
# 쪽 참조(「▶ 개념원리 …쪽」)는 −4~−8pt, 설명글은 +26pt 아래라 둘 다 안 든다.
TITLE_UP = 2.0
TITLE_DOWN_FROM_BOTTOM = 6.0
# 바닥글은 y≈798~799(지면 842) 한 줄 — 위아래로 좁은 창만 본다.
FOOTER_TOP = 47.0  # y > H - 47
FOOTER_BOTTOM = 39.0  # y < H - 39
FOOTER_LINE_TOL = 4.0
FOOTER_NAME_MIN_SIZE = 7.5  # 바닥글 이름 7.8pt · 해설 본문 6.8pt


def source_dir():
    env = os.environ.get("RPM_HIGH_SRC")
    if env:
        if not os.path.isdir(env):
            raise SystemExit(f"RPM_HIGH_SRC 경로 없음: {env}")
        return env
    for c in SRC_CANDIDATES:
        if os.path.isdir(c):
            return c
    raise SystemExit(
        "RPM 고등(2022) PDF 폴더를 찾을 수 없다. RPM_HIGH_SRC 를 설정하라. "
        f"(후보: {', '.join(SRC_CANDIDATES)})"
    )


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
    """(대단원, 중단원) — 그 쪽에 있는 것만. 없으면 None.

    표시(로마숫자 또는 두 자리 번호)를 먼저 찾고, **그 표시와 같은 줄·바로 오른쪽**에 있는
    바닥글 크기의 이름만 받는다. 이름 글꼴은 본문에도 쓰이므로 글꼴만으로는 못 가른다.
    """
    foot = [
        s
        for s in spans
        if page_height - FOOTER_TOP < s["bbox"][1] < page_height - FOOTER_BOTTOM
    ]
    majors = [
        s
        for s in foot
        if s["font"] == FONT_FOOT_MAJOR_MARK and ROMAN.match(s["text"].strip())
    ]
    minors = [
        s
        for s in foot
        if s["font"] == FONT_FOOT_MINOR_MARK and TWO_DIGITS.match(s["text"].strip())
    ]
    if bool(majors) == bool(minors):
        return None, None
    mark = (majors or minors)[0]
    names = [
        s
        for s in foot
        if s["font"] == FONT_FOOT_NAME
        and s["size"] >= FOOTER_NAME_MIN_SIZE
        and s["bbox"][0] > mark["bbox"][0]
        and abs(s["bbox"][1] - mark["bbox"][1]) <= FOOTER_LINE_TOL
    ]
    if not names:
        return None, None
    name = min(names, key=lambda s: s["bbox"][0] - mark["bbox"][2])["text"]
    name = re.sub(r"^\s*[.\s]+", "", name).strip()
    return (name, None) if majors else (None, name)


def is_header_number(s):
    return (
        s["font"] == FONT_NUM
        and s["size"] >= NUM_MIN_SIZE
        and TWO_DIGITS.match(s["text"].strip()) is not None
    )


def is_label(s):
    return (
        s["font"] == FONT_LABEL
        and s["size"] < LABEL_MAX_SIZE
        and s["text"].strip() == "유형"
    )


def is_title_piece(s):
    return any(
        s["font"].startswith(prefix) and s["size"] >= min_size
        for prefix, min_size in TITLE_FONTS
    )


def reading_key(s):
    """열 단위 읽기 순서 — 왼단 전부, 그다음 오른단."""
    return (s["bbox"][0] >= COLUMN_MID, s["bbox"][1])


def extract_book(path):
    doc = pymupdf.open(path)
    rows = []
    incomplete = []
    box_labels = 0
    unlabeled = 0
    cur_major = None
    cur_minor = None
    # 난이도 표는 「가장 최근 유형 머리」에 붙는다 — 쪽·단을 넘어 이어진다.
    last_row = None

    for pno in range(doc.page_count):
        page = doc[pno]
        width = page.rect.width
        spans = spans_of(page)
        major, minor = footer_units(spans, page.rect.height)
        if major:
            cur_major = major
        if minor:
            cur_minor = minor

        # 본문이 시작되기 전(차례·머리말)에는 단원 표시가 없다 — 그 구간의 머리는 버린다.
        in_body = cur_major is not None

        box_labels += sum(
            1
            for s in spans
            if s["font"] == FONT_LABEL_BOX and s["text"].strip() == "유형"
        )

        events = sorted(
            (
                s
                for s in spans
                if is_header_number(s)
                or (s["font"] == FONT_LEVEL and s["text"].strip() in LEVELS)
            ),
            key=reading_key,
        )
        for ev in events:
            if not is_header_number(ev):
                if (
                    in_body
                    and last_row is not None
                    and ev["color"] == LEVEL_ACTIVE_COLOR
                ):
                    lv = ev["text"].strip()
                    last_row["levels"][lv] = last_row["levels"].get(lv, 0) + 1
                continue

            nx0, ny0, nx1, ny1 = ev["bbox"]
            number = ev["text"].strip()
            col_right = COLUMN_MID if nx0 < COLUMN_MID else width
            title_spans = [
                s
                for s in spans
                if is_title_piece(s)
                and s["bbox"][0] > nx1 - 1.0
                and s["bbox"][0] < col_right
                and ny0 - TITLE_UP <= s["bbox"][1] <= ny1 + TITLE_DOWN_FROM_BOTTOM
            ]
            title = join_title(title_spans)
            has_label = any(
                is_label(s)
                and s["bbox"][0] < nx0
                and s["bbox"][0] > nx0 - 40
                and abs(s["bbox"][1] - ny0) <= 12
                for s in spans
            )

            if not in_body:
                continue
            if not has_label:
                unlabeled += 1
            if not title:
                incomplete.append(
                    {
                        "page": pno + 1,
                        "major": cur_major,
                        "minor": cur_minor,
                        "number": number,
                        "title": None,
                    }
                )
                continue
            row = {
                "page": pno + 1,
                "major": cur_major,
                "minor": cur_minor,
                "number": number,
                "title": title,
                "levels": {},
            }
            rows.append(row)
            last_row = row
    doc.close()
    return rows, incomplete, box_labels, unlabeled


def boundary_warnings(rows):
    """유형 번호가 되돌아갔는데 중단원이 그대로인 자리 — 이어 나르기가 틀린 신호."""
    warns = []
    prev = None
    for r in rows:
        if prev is not None:
            try:
                n_now, n_prev = int(r["number"]), int(prev["number"])
            except ValueError:
                prev = r
                continue
            if n_now <= n_prev and r["minor"] == prev["minor"]:
                warns.append(
                    f'p{r["page"]} {r["minor"]}: {prev["number"]} → {r["number"]} (중단원 그대로)'
                )
        prev = r
    return warns


def gap_warnings(rows):
    """중단원 안에서 번호가 **건너뛴** 자리 — 머리를 놓친 신호(첫 판이 42개를 이렇게 놓쳤다)."""
    warns = []
    by_minor = {}
    for r in rows:
        by_minor.setdefault(r["minor"], []).append(int(r["number"]))
    for minor, nums in by_minor.items():
        want = set(range(1, max(nums) + 1))
        missing = sorted(want - set(nums))
        if missing:
            warns.append(f"{minor}: 빠진 번호 {missing}")
    return warns


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--md", action="store_true")
    ap.add_argument("--out", default="scripts/rpm/rpm-high-type-catalog.json")
    ap.add_argument(
        "--books",
        default="",
        help="쉼표로 과목을 골라 일부만 뽑는다 (예: 공통수학1,공통수학2). 비우면 7권 전부",
    )
    args = ap.parse_args()

    src = source_dir()
    wanted = {b for b in args.books.split(",") if b} or None

    result = {}
    total = 0
    warn_total = 0
    inc_total = 0
    lines = []

    for book, fname in BOOKS:
        if wanted and book not in wanted:
            continue
        path = os.path.join(src, fname)
        if not os.path.exists(path):
            print(f"[없음] {path}", file=sys.stderr)
            continue
        rows, incomplete, box_labels, unlabeled = extract_book(path)
        warns = boundary_warnings(rows) + gap_warnings(rows)
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
        no_levels = sum(1 for r in rows if not r["levels"])

        result[book] = {
            "grade": book,
            "edition": "2022",
            "file": fname,
            "types": rows,
            "incomplete": incomplete,
            "boundary_warnings": warns,
        }
        lines.append(
            f"{book}: 유형 {len(rows)} · 대단원 {len(majors)} · 중단원 {len(minors)}"
            f" · 깨진머리 {len(incomplete)} · 경계·빠짐 경고 {len(warns)}"
            f" · 라벨 없는 머리 {unlabeled} · 난이도표 없는 유형 {no_levels}"
            f" · 대표문제 표지 {box_labels}"
        )

    if not result:
        raise SystemExit("뽑힌 책이 없다 — 파일 이름과 원본 폴더를 확인하라.")

    with io.open(args.out, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=1)

    print(f"원본: {src}")
    print("\n".join(lines))
    print(f"\n합계 유형 {total} · 깨진머리 {inc_total} · 경고 {warn_total}")
    for book, data in result.items():
        if data["boundary_warnings"]:
            print(f"\n[{book} 경고]")
            for w in data["boundary_warnings"]:
                print(f"  {w}")
        if data["incomplete"]:
            print(f"\n[{book} 깨진머리]")
            for i in data["incomplete"]:
                print(f"  p{i['page']} {i['minor']} num={i['number']}")
    print(f"\n색인 → {args.out}")

    if args.md:
        md_path = "docs/planning/tracks/rpm-high-type-catalog.md"
        with io.open(md_path, "w", encoding="utf-8") as f:
            f.write("# RPM 고등(2022 개정) 유형 색인 (자동 생성 — 손으로 고치지 말 것)\n\n")
            f.write("`python scripts/rpm/extract-high-type-catalog.py --md` 가 만든다.\n")
            f.write("고칠 것이 있으면 추출기를 고쳐라.\n\n")
            f.write(
                "원본은 `N:\\개인\\강아\\교재자료\\RPM\\22`(원장님 2026-09-13)의 학생용 PDF 다. "
                "책 이름이 우리 시드와 같다.\n\n"
                "⚠️ 제목 안의 수식은 교재 조판 글자 그대로라(`A^n`·`f(x, y)=0`) 우리 표기와 "
                "다를 수 있다. 정본은 «과목|중단원|번호»이고 제목은 사람이 읽는 실마리다.\n\n"
                "유형 뒤의 `하·중하·중·상중·상` 은 그 유형에 실린 **문항의 난이도 표 개수**다 — "
                "6칸 배정의 근거(`high-engine-plan.md` §1-4).\n\n"
            )
            f.write(f"{len(result)}권 합계 **{total}개 유형**.\n")
            for book, data in result.items():
                f.write(f"\n## {book} — {len(data['types'])}개\n")
                cur = None
                for r in data["types"]:
                    key = (r["major"], r["minor"])
                    if key != cur:
                        cur = key
                        f.write(f"\n### {r['major']} › {r['minor']}\n\n")
                    lv = " ".join(
                        f"{k}{r['levels'][k]}" for k in LEVELS if k in r["levels"]
                    )
                    f.write(
                        f"- **{r['number']}** {r['title']} <sub>p{r['page']}"
                        f"{' · ' + lv if lv else ''}</sub>\n"
                    )
        print(f"마크다운 → {md_path}")


if __name__ == "__main__":
    main()
