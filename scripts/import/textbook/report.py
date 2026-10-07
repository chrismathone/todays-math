# -*- coding: utf-8 -*-
"""정답을 짝짓지 못한 문항의 보고서(Markdown) — 원장님 2026-10-07 «매핑 안되는 문제들은 따로 md 보고서».

  python report.py <추출 폴더> <보고서.md>

까닭을 넷으로 가른다(문항마다 하나):
  - `정답이 그림`        — 정답 칸이 통째로 그림이다(YBM «기초 · 실력 UP» 따위). 글로 읽을 수 없다.
  - `정답 없음`          — 파일 안에 정답 칸이 없고, 이름이 짝인 HWP 정답 파일도 없다. 같은 폴더의 PDF 를 같이 적는다.
  - `풀이만 있음`        — 풀이는 있는데 «답»을 뽑지 못했다(서술형 · 답이 문장 속에 있다). 지어내지 않는다.
  - `정답 칸에 번호 없음` — 정답 칸은 있는데 그 번호의 답이 없다(번호 짝 어긋남 — 사람 확인).
"""
from __future__ import annotations

import collections
import datetime
import json
import sys
from pathlib import Path

REASONS = ["정답이 그림", "정답 없음", "풀이만 있음", "정답 칸에 번호 없음", "정답 짝 의심", "보기 번호 없음"]


def reason_of(problem: dict, file_info: dict) -> str:
    if problem.get("answerFrom") == "rejected-mismatch":
        return "정답 짝 의심"
    if problem.get("answerFrom") == "choices-unnumbered":
        return "보기 번호 없음"
    if problem.get("answerSectionPicture"):
        return "정답이 그림"
    if not problem.get("answerSection") and not file_info.get("answerFiles"):
        return "정답 없음"
    if problem.get("solution"):
        return "풀이만 있음"
    return "정답 칸에 번호 없음"


def short_path(path: str) -> str:
    parts = Path(path).parts
    for i, part in enumerate(parts):
        if part in ("중등교과서", "고등교과서"):
            return "/".join(parts[i + 1 :])
    return path


def numbers_text(items: list[dict]) -> str:
    by_section: dict[int, list[int]] = collections.defaultdict(list)
    for item in items:
        by_section[item["section"]].append(item["number"])
    chunks = []
    for section in sorted(by_section):
        numbers = ", ".join(str(n) for n in sorted(by_section[section]))
        chunks.append(f"{section + 1}묶음 {numbers}" if len(by_section) > 1 else numbers)
    return " / ".join(chunks)


def main() -> None:
    source = Path(sys.argv[1])
    target = Path(sys.argv[2])
    files = {json.loads(l)["path"]: json.loads(l) for l in (source / "files.jsonl").read_text(encoding="utf-8").splitlines()}
    problems = [json.loads(l) for l in (source / "problems.jsonl").read_text(encoding="utf-8").splitlines()]

    in_scope = [p for p in problems if p["kind"] == "assessment" and p["isQuestion"]]
    not_question = [p for p in problems if p["kind"] == "assessment" and not p["isQuestion"]]
    textbook = [p for p in problems if p["kind"] == "textbook"]
    answered = [p for p in in_scope if p["answer"] and p["answerFrom"] != "choices-unnumbered"]
    missing = [p for p in in_scope if not p["answer"] or p["answerFrom"] == "choices-unnumbered"]
    for p in missing:
        p["reason"] = reason_of(p, files.get(p["path"], {}))
    orphan_answers = [f for f in files.values() if f.get("role") == "answer-file" and not f.get("pairedTo")]

    with (source / "unmapped.jsonl").open("w", encoding="utf-8") as out:
        for p in missing:
            out.write(json.dumps({k: p[k] for k in ("path", "book", "grade", "section", "number", "reason", "content")}, ensure_ascii=False) + "\n")

    lines: list[str] = []
    add = lines.append
    today = datetime.date.today().isoformat()
    add(f"# 교과서 문제 이관 — 정답을 짝짓지 못한 문항 ({today})")
    add("")
    add("G 드라이브 `중등교과서` · `고등교과서` 의 출판사 자료(2022 개정)에서 문항을 뽑고, 정답을 **같은 파일 끝의 정답 칸**과 "
        "**이름이 짝인 HWP 정답 파일**(`…_정답및해설` · `…_해설`)에서 찾아 붙였다. 여기 적은 것은 그래도 답을 못 붙인 문항이다.")
    add("답은 지어내지 않는다 — 풀이만 있고 답이 문장 속에 있는 문항은 «풀이만 있음»으로 남긴다.")
    add("")
    add("## 요약")
    add("")
    add("| | 문항 |")
    add("|---|---:|")
    add(f"| 평가 자료에서 뽑은 문항 | {len(in_scope):,} |")
    add(f"| 답을 붙인 문항 | {len(answered):,} ({len(answered) * 100 // max(1, len(in_scope))}%) |")
    add(f"| **답을 못 붙인 문항** | **{len(missing):,}** |")
    add(f"| (따로 셈) 물음이 아니라 거른 덩이 | {len(not_question):,} |")
    add(f"| (따로 셈) 교과서 본문 · 지도서에서 나온 덩이 — 다음 판 | {len(textbook):,} |")
    add("")
    add("답의 출처: " + " · ".join(f"{k} {v:,}" for k, v in collections.Counter(p["answerFrom"] for p in answered).most_common())
        + " (`key` 빠른 정답 · `solution-short` 풀이 칸이 곧 답 · `solution-choice` 풀이 끝의 보기 번호)")
    add("")
    add("## 못 붙인 까닭")
    add("")
    add("| 까닭 | 문항 | 뜻 · 다음에 할 일 |")
    add("|---|---:|---|")
    meaning = {
        "정답이 그림": "정답 칸이 통째로 그림이다. 그림을 글로 읽어야 한다(구독 모델로 읽힌 뒤 사람이 확인).",
        "정답 없음": "파일 안에 정답 칸이 없고 짝 HWP 정답 파일도 없다. 정답이 PDF(정답책 · 지도서)에 있을 수 있다 — 아래 «같은 폴더의 PDF».",
        "풀이만 있음": "풀이는 있는데 답만 따로 적힌 곳이 없다. 풀이의 마지막 줄에서 답을 사람이 고르거나, 규칙을 더해야 한다.",
        "정답 칸에 번호 없음": "정답 칸은 있는데 그 번호가 없다. 번호 짝이 어긋났을 수 있다 — 사람 확인.",
        "정답 짝 의심": "답을 붙였지만 그 묶음에 «보기 문항인데 답이 보기 번호가 아닌» 문항이 있어 묶음째 뺐다(번호 짝이 밀린 꼴). 사람 확인.",
        "보기 번호 없음": "답은 보기 번호(③)인데 본문에 ①~⑤가 없다 — 보기 번호가 그림 · 자동 번호라 글에 안 남았다. 본문을 고쳐야 넣을 수 있다.",
    }
    reasons = collections.Counter(p["reason"] for p in missing)
    for reason in REASONS:
        add(f"| {reason} | {reasons.get(reason, 0):,} | {meaning[reason]} |")
    add("")
    if orphan_answers:
        add(f"## 문제 파일 없이 정답 파일만 있는 것 ({len(orphan_answers)})")
        add("")
        for f in sorted(orphan_answers, key=lambda f: f["path"]):
            add(f"- `{short_path(f['path'])}`")
        add("")

    add("## 책별 · 파일별")
    add("")
    add("번호는 파일 안의 문항 번호다. 한 파일에 문제 묶음이 여럿이면(«기초 → 실력») `1묶음 1, 2 / 2묶음 3` 처럼 적는다.")
    add("")
    by_book: dict[tuple[str, str], list[dict]] = collections.defaultdict(list)
    for p in missing:
        by_book[(p["grade"], p["book"])].append(p)
    total_by_book = collections.Counter((p["grade"], p["book"]) for p in in_scope)
    for (grade, book), items in sorted(by_book.items()):
        add(f"### {grade} · {book} — 못 붙임 {len(items):,} / {total_by_book[(grade, book)]:,}")
        add("")
        add("| 파일 | 까닭 | 번호 |")
        add("|---|---|---|")
        by_file: dict[str, list[dict]] = collections.defaultdict(list)
        for p in items:
            by_file[p["path"]].append(p)
        for path, file_items in sorted(by_file.items()):
            for reason in REASONS:
                group = [p for p in file_items if p["reason"] == reason]
                if not group:
                    continue
                note = ""
                if reason == "정답 없음":
                    pdfs = sorted(q.name for q in Path(path).parent.glob("*.pdf") if "정답" in q.name or "해설" in q.name or "풀이" in q.name)
                    if pdfs:
                        note = f" — 같은 폴더의 PDF: {', '.join(pdfs[:3])}"
                add(f"| `{Path(path).name}` | {reason}{note} | {numbers_text(group)} |")
        add("")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"평가 자료 문항 {len(in_scope)} · 답 {len(answered)} · 못 붙임 {len(missing)} · 까닭 {dict(reasons)}")


if __name__ == "__main__":
    main()
