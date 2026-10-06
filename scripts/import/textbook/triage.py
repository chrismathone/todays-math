# -*- coding: utf-8 -*-
"""HWP 의 미리보기 글(PrvText)만 읽어 «문제가 든 파일»을 고른다 — 한글을 띄우지 않는다.

  python triage.py <출력 triage.json>   → 파일마다 갈래 · 근거 + 요약
"""
import collections
import json
import pathlib
import re
import sys
import zipfile

import olefile

ROOTS = [pathlib.Path(r"G:\중등교과서"), pathlib.Path(r"G:\고등교과서")]

# 문제가 아닌 것이 이름에서 확실한 것
NOT_PROBLEM_NAME = re.compile(
    r"지도안|지도 ?계획|교육과정|비교표|평가 ?계획|평가 ?기준|성취 ?기준|채점 ?기준표|루브릭|안내|목차|연간|진도표|"
    r"수업 ?설계|가정통신|설문|체크리스트|교수 ?학습 ?과정안|과정안"
)
ANSWER_NAME = re.compile(r"정답|해설|답안|풀이")
# 미리보기 글의 문제 꼴
CHOICE = re.compile(r"①[^②]{0,200}②")
NUMBERED = re.compile(r"(?:^|\s)(?:0?[1-9]|[1-9]\d)\s*[.)]?\s*(?:다음|두|어떤|이|그림|오른쪽|아래|$)", re.M)
ASK = re.compile(r"구하시오|구하여라|고르시오|고른 것은|것은\?|쓰시오|나타내시오|하시오|구하면\?|값은\?")


def preview(path: pathlib.Path) -> str:
    if path.suffix.lower() == ".hwpx":
        try:
            with zipfile.ZipFile(path) as z:
                raw = z.read("Preview/PrvText.txt")
            return raw.decode("utf-8", "replace")
        except Exception:
            return ""
    try:
        with olefile.OleFileIO(str(path)) as ole:
            if not ole.exists("PrvText"):
                return ""
            return ole.openstream("PrvText").read().decode("utf-16-le", "replace")
    except Exception:
        return ""


def classify(path: pathlib.Path):
    name = path.name
    text = preview(path)
    asks = len(ASK.findall(text))
    choices = len(CHOICE.findall(text))
    signals = {"asks": asks, "choices": choices, "chars": len(text)}
    if NOT_PROBLEM_NAME.search(name):
        return "문제 아님(이름)", signals
    if ANSWER_NAME.search(name) and asks + choices < 2:
        return "정답·해설", signals
    if not text:
        return "미리보기 없음", signals
    if asks + choices >= 2:
        return "문제", signals
    if asks + choices == 1:
        return "문제 의심", signals
    return "문제 아님(글)", signals


def main():
    rows = []
    for root in ROOTS:
        for path in sorted(root.rglob("*")):
            if path.is_file() and path.suffix.lower() in (".hwp", ".hwpx"):
                kind, signals = classify(path)
                rel = path.relative_to(root.parent)
                parts = rel.parts
                rows.append({
                    "path": str(path),
                    "grade": parts[1] if len(parts) > 1 else "",
                    "book": parts[2] if len(parts) > 2 else "",
                    "kind": kind,
                    **signals,
                })
    pathlib.Path(sys.argv[1]).write_text(json.dumps(rows, ensure_ascii=False, indent=0), encoding="utf-8")
    total = collections.Counter(row["kind"] for row in rows)
    print("갈래:", dict(total))
    by_book = collections.defaultdict(collections.Counter)
    for row in rows:
        by_book[(row["grade"], row["book"])][row["kind"]] += 1
    for (grade, book), count in by_book.items():
        print(f"{grade} | {book[:30]} | 문제 {count['문제']} · 의심 {count['문제 의심']} · 정답 {count['정답·해설']} · 없음 {count['미리보기 없음']} · 아님 {count['문제 아님(이름)'] + count['문제 아님(글)']}")


if __name__ == "__main__":
    main()
