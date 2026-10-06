# -*- coding: utf-8 -*-
"""한 파일을 가른 모양을 사람이 읽게 찍는다(개발용).

  python peek.py <file.hwpx> [--full]
"""
import sys
from pathlib import Path

from hwpx_flow import read_paras
from segment import segment

path = Path(sys.argv[1])
full = "--full" in sys.argv
doc = segment(read_paras(path))
print(f"문항 {len(doc.problems)} · 빠른 정답 {len(doc.keys)} · 풀이 {len(doc.solutions)} · 정답 칸 {doc.answer_section} · 정답 그림뿐 {doc.answer_is_picture}")
for problem in doc.problems:
    body = problem.text if full else problem.text[:160].replace("\n", " ⏎ ")
    figures = f" [그림 {len(problem.pictures)}]" if problem.pictures else ""
    print(f"--- {problem.section}-{problem.number}{' (번호 그림)' if problem.glyph_number else ''}{figures}: {body}")
    if problem.key in doc.keys:
        print(f"    답: {doc.keys[problem.key][:80]}")
    if problem.key in doc.solutions:
        print(f"    풀이: {doc.solutions[problem.key][:100].replace(chr(10), ' ⏎ ')}")
