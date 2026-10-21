# -*- coding: utf-8 -*-
"""교과서 쌍둥이 시범 — 책 하나의 원본 묶음 (2026-10-21 · 읽기만).

  python build_sources.py <DB 덤프> <원본 추출 폴더> <대조 원장> <책 열쇠> <출력 폴더>

문항마다 한 줄(`sources.jsonl`): 문항 코드 · 외부 열쇠 · 차시 · 자료 · 형식 · 난이도 · DB 글(LaTeX) · SSD 원본 글 ·
정답 · 풀이 · 대조 판정 · 원본 파일(경로 · sha256 · 크기) · 그림(작업트리 `public/figures` 에서 복사).
🔴 출력에 교과서 글이 그대로 든다 — **저장소 밖**에 쓴다. 저자에게만 준다(풀이자 · 학생 면에는 안 간다).
🔴 원본 그림은 저자가 «문항을 이해하려고» 보기만 한다 — 쌍둥이 그림으로 쓰지 않는다(D-61 · 09 문서).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
sys.path.insert(0, str(HERE.parent / "textbook-verify"))

from extract_originals import ssd_path  # noqa: E402


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("dump")
    parser.add_argument("orig")
    parser.add_argument("ledger")
    parser.add_argument("book")
    parser.add_argument("out")
    args = parser.parse_args()
    out = Path(args.out)
    if out.resolve().is_relative_to(REPO.resolve()):
        raise SystemExit("교과서 글을 저장소 안에 쓰지 않는다 — 저장소 밖 경로를 주시오")
    (out / "figures").mkdir(parents=True, exist_ok=True)
    originals = {}
    for line in open(Path(args.orig) / "problems.jsonl", encoding="utf-8"):
        row = json.loads(line)
        originals[row["id"]] = row
    ledger = {}
    for line in open(args.ledger, encoding="utf-8"):
        row = json.loads(line)
        ledger[row["problemCode"]] = row
    file_hash: dict[str, tuple[str, int]] = {}
    rows = []
    for line in open(args.dump, encoding="utf-8"):
        db = json.loads(line)
        if db["bookKey"] != args.book:
            continue
        orig = originals[db["externalId"]]
        verdict = ledger[db["problemCode"]]
        path = ssd_path(db["sourceFile"])
        if str(path) not in file_hash:
            data = path.read_bytes()
            file_hash[str(path)] = (hashlib.sha256(data).hexdigest(), len(data))
        figures = []
        for i, url in enumerate(db["figureUrls"] or [], 1):
            local = REPO / "public" / url.lstrip("/")
            target = out / "figures" / f"{db['problemCode']}-{i}{local.suffix}"
            shutil.copyfile(local, target)
            figures.append({"url": url, "file": str(target), "sha256": hashlib.sha256(local.read_bytes()).hexdigest()})
        # 대조가 «다른 문항»이면 DB 글을 원본으로 믿지 않는다 — 저자에게는 SSD 원본 글 · 원본 정답을 준다
        trusted_db = verdict["body"] in ("same", "notation")
        rows.append({
            "problemCode": db["problemCode"],
            "externalId": db["externalId"],
            "unitId": db["unitId"],
            "grade": db["grade"],
            "semester": db["semester"],
            "chapter": db["chapter"],
            "section": db["section"],
            "materialKind": db["materialKind"],
            "materialTitle": db["materialTitle"],
            "questionNumber": db["questionNumber"],
            "questionType": db["questionType"],
            "difficulty": db["difficulty"],
            "problemType": db["problemType"],
            "familyKey": db["familyKey"],
            "directUseAllowed": db["directUseAllowed"],
            "choiceFigureIndex": db["choiceFigureIndex"],
            "verify": {"body": verdict["body"], "answer": verdict.get("answer"), "recordedEdit": verdict["recordedEdit"]},
            "trustedDbText": trusted_db,
            "dbContent": db["content"],
            "dbAnswer": db["answer"],
            "dbSolution": db["solution"],
            "origContent": orig["contentFig"] or orig["content"],
            "origAnswer": orig.get("answer"),
            "origSolution": orig.get("solution"),
            "sourceContentSha256": sha256_text(orig["content"]),
            "dbContentSha256": sha256_text(db["content"]),
            "sourceFile": {"path": db["sourceFile"], "ssdPath": str(path), "sha256": file_hash[str(path)][0],
                           "bytes": file_hash[str(path)][1]},
            "figures": figures,
        })
    rows.sort(key=lambda r: (r["semester"], r["chapter"], r["section"], r["problemCode"]))
    with open(out / "sources.jsonl", "w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(f"문항 {len(rows)} · 그림 {sum(len(r['figures']) for r in rows)} · 원본 파일 {len(file_hash)} → {out}")


if __name__ == "__main__":
    main()
