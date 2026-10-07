# -*- coding: utf-8 -*-
"""추출 결과 요약(개발용) — 책마다 파일 · 문항 · 답 붙은 수 · 답의 출처.

  python stats.py <출력 폴더> [--books]
"""
import collections
import json
import sys
from pathlib import Path

out = Path(sys.argv[1])
files = [json.loads(line) for line in (out / "files.jsonl").read_text(encoding="utf-8").splitlines()]
problems = [json.loads(line) for line in (out / "problems.jsonl").read_text(encoding="utf-8").splitlines()]
errors = [f for f in files if "error" in f]
answer_files = [f for f in files if f.get("role") == "answer-file"]
answered = sum(1 for p in problems if p["answer"])
print(f"파일 {len(files)} (정답 파일 {len(answer_files)} · 짝 붙음 {sum(1 for f in answer_files if f.get('pairedTo'))}) · 오류 {len(errors)}")
print(f"문항 {len(problems)} · 답 붙음 {answered} ({answered * 100 // max(1, len(problems))}%) · 그림 있는 문항 {sum(1 for p in problems if p['pictures'])}")
print("답의 출처:", dict(collections.Counter(p["answerFrom"] for p in problems)))
print("정답 파일로 채운 파일:", sum(1 for f in files if f.get("filledFromAnswerFile")))
if "--books" in sys.argv:
    by = collections.defaultdict(lambda: [0, 0])
    for p in problems:
        cell = by[(p["grade"], p["book"][:24])]
        cell[0] += 1
        cell[1] += 1 if p["answer"] else 0
    for (grade, book), (n, a) in sorted(by.items()):
        print(f"  {grade:6} {book:26} 문항 {n:5} · 답 {a:5} ({a * 100 // max(1, n)}%)")
for e in errors[:5]:
    print("오류:", e["path"][-60:], e["error"])
