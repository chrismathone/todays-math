# -*- coding: utf-8 -*-
"""RPM 정답책에서 **「교과서문제 정복하기」 구역의 문항번호**를 뽑는다.

원장님 지시 2026-08-24: 「유형 문제 아닌 교과서 정복하기에서 나오는 문제는 전부 제거」.

## 무엇이 어렵나

⚠️ **구역 머리글(「교과서문제 정복하기」·「유형 익히기」)은 그림이라 텍스트 레이어에 없다.**
   찾아봐도 0건이다. 대신 그 옆에 붙은 **「▶본문 N쪽」 표기는 글자로 남아 있고**, 형태가
   구역을 가른다:

       본문 9, 11쪽    ← 쉼표/단일  = 교과서문제 정복하기
       본문 12 ~ 21쪽  ← 물결(범위) = 유형 익히기 등 그 뒤 구역

   즉 **「무엇을 찾을까」를 머리글에서 쪽 표기로 옮겨야** 보인다.

⚠️ **문항번호는 한 span 이 아니다.** `0001` 은 회색 `000` + 진한 `1` 로 **두 span**이라
   span 단위로 정규식을 대면 `'000'` 만 잡히고 번호가 통째로 0건이 된다(실제로 그랬다).
   줄 단위로 이어 붙여야 한다.

⚠️ **2단 조판이다.** y 좌표만으로 정렬하면 **옆 단 번호를 읽는다**(이 저장소 단골 함정).
   읽는 순서는 (쪽 → 단 → y) 다.

## 눈금

원장님이 3-2 의 정답을 직접 주셨다:
    1~46, 137~163, 244~266, 355~370, 437~451, 527~541, 589~613
`--verify 3-2` 가 그 값과 대 본다. **다른 책에 쓰기 전에 이 대조가 통과해야 한다** —
통과 못 하면 뽑은 범위를 믿을 근거가 없다.

사용:
    python scripts/rpm/extract-textbook-sections.py --verify
    python scripts/rpm/extract-textbook-sections.py --json > 구간.json
"""
import json
import re
import sys

import fitz

sys.stdout.reconfigure(encoding="utf-8")

BOOKS = {
    "rpm-middle-1-1": r"N:/개인/강아/교재자료/RPM/22/RPM 중학 1-1 정답.pdf",
    "rpm-middle-1-2": r"N:/개인/강아/교재자료/RPM/22/RPM 중학 1-2 정답.pdf",
    "rpm-middle-2-1": r"N:/개인/강아/교재자료/RPM/22/RPM 중학 2-1 정답.pdf",
    "rpm-middle-2-2": r"N:/개인/강아/교재자료/RPM/22/RPM 중학 2-2 정답.pdf",
    "rpm-middle-3-1": r"N:/개인/강아/교재자료/RPM/22/RPM 중학 3-1 정답.pdf",
    "rpm-middle-3-2": r"N:/개인/강아/교재자료/RPM/22/RPM 중학 3-2 정답.pdf",
}

# 원장님이 직접 읽어 주신 3-2 의 참값 — 눈금이다. 손으로 고치지 말 것.
TRUTH_3_2 = [
    (1, 46), (137, 163), (244, 266), (355, 370),
    (437, 451), (527, 541), (589, 613),
]

MARK = re.compile(r"본문\s*([\d,~\s]+)쪽")


def read_items(path):
    """(쪽, 단, y, 종류, 값) 목록을 읽는 순서대로 돌려준다."""
    doc = fitz.open(path)
    items = []
    for i in range(doc.page_count):
        page = doc[i]
        half = page.rect.width / 2
        for blk in page.get_text("dict")["blocks"]:
            for line in blk.get("lines", []):
                spans = line["spans"]
                if not spans:
                    continue
                x0, y0 = line["bbox"][0], line["bbox"][1]
                col = 0 if x0 < half else 1
                joined = "".join(s["text"] for s in spans)

                m = MARK.search(joined.replace("\n", " "))
                if m:
                    items.append((i, col, y0, "mark", m.group(1).strip()))

                # 문항번호 — 회색 `000` + 진한 숫자로 쪼개져 있어 **줄을 이어 붙여** 읽는다.
                if spans[0]["font"].startswith("DINPro"):
                    mm = re.match(r"^\s*(\d{4})(?!\d)", joined)
                    if mm:
                        items.append((i, col, y0, "num", int(mm.group(1))))
    items.sort(key=lambda r: (r[0], r[1], r[2]))
    return items


def sections_of(path):
    """「교과서문제 정복하기」 구간 [(첫번호, 끝번호), …]."""
    items = read_items(path)
    out, cur = [], None
    for _pg, _col, _y, kind, val in items:
        if kind == "mark":
            # 물결이 있으면 범위 표기 = 유형 익히기 등. 없으면 교과서문제 정복하기.
            cur = [] if "~" not in val else None
            if cur is not None:
                out.append(cur)
        elif cur is not None:
            cur.append(val)
    ranges = []
    for nums in out:
        if nums:
            ranges.append((min(nums), max(nums)))
    return ranges


def main():
    verify = "--verify" in sys.argv
    as_json = "--json" in sys.argv
    result = {}
    ok = True
    for book, path in BOOKS.items():
        try:
            rs = sections_of(path)
        except Exception as e:  # 파일이 없거나 열리지 않으면 그 책만 건너뛴다
            print(f"🔴 {book}: {e}", file=sys.stderr)
            ok = False
            continue
        result[book] = rs
        if not as_json:
            total = sum(b - a + 1 for a, b in rs)
            print(f"{book}: {len(rs)}구간 · 번호 {total}개")
            print("   " + ", ".join(f"{a}~{b}" for a, b in rs))

    if verify:
        got = result.get("rpm-middle-3-2", [])
        print("\n=== 눈금 (원장님이 읽어 주신 3-2) ===")
        print("  참값:", ", ".join(f"{a}~{b}" for a, b in TRUTH_3_2))
        print("  뽑음:", ", ".join(f"{a}~{b}" for a, b in got))
        if got == TRUTH_3_2:
            print("  ✅ 일치 — 다른 책의 값도 같은 방식으로 뽑은 것이다")
        else:
            ok = False
            print("  🔴 불일치 — **다른 책 값을 쓰면 안 된다**")

    if as_json:
        print(json.dumps(result, ensure_ascii=False, indent=1))
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
