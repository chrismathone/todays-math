# -*- coding: utf-8 -*-
"""교과서 쌍둥이 시범 — 한 번 고쳐 쓰기(새 판 `-r2` · Codex 2회차 A5).

  python revise.py <sources.jsonl> <r1 묶음> <저장소 밖 작업 폴더> [--jobs 3] [--model claude-opus-5-5]

r1 에서 보류된 문항(수학 · 검수 · 너무 닮음 · 그림 · 꼴)마다 저자 모델의 **새 세션**에 원본 · r1 쌍둥이 · 보류 까닭(검수자의 지적 ·
두 풀이의 답과 지적 · 너무 닮음 수치 · 엔진 오류)을 주고 고친 제안을 받는다 → `<작업>/author-r2/<문항 코드>.json`.
그 뒤 `materialize.py --round r2 --author-dir author-r2 --only-proposed` 로 새 판을 만들고, 새 풀이 · 새 검수를 받는다.
🔴 r1 의 기록은 고치지 않는다(새 판은 새 ID). 고친 판이 또 보류되면 그대로 보류(두 번째 고치기는 없다).
🔴 «답 표기(값은 같음)» 보류는 고치지 않는다 — 문항이 아니라 풀이자의 표기 문제다. 저자가 보류한 문항(«그림 — 엔진으로 못 그림» 등)도 다시 묻지 않는다.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import author  # noqa: E402
import integrity

REVISABLE_STAGES = {"figure", "shape", "engine", "source-copy"}


def reasons_for(code: str, r1: Path) -> tuple[dict | None, list[str]]:
    collect = json.loads((r1 / "collect.json").read_text(encoding="utf-8"))
    for row in collect["rows"]:
        if row["problemCode"] == code:
            cand = json.loads((r1 / "candidates" / f"{row['twinExternalId']}.json").read_text(encoding="utf-8"))
            lines = [f"상태: {row['status']}"] + [f"- {r}" for r in row["reasons"]]
            review_path = r1 / "reviews" / f"{row['twinExternalId']}.json"
            if review_path.exists():
                review = integrity.read_review(review_path).get("parsed") or {}
                lines.append("- 독립 검수 상세: " + json.dumps(review, ensure_ascii=False))
            for solver, s in row["solves"].items():
                lines.append(f"- 풀이자 {solver}: 답 {s['answer']!r} ({s['verdict']} — {s['why']}) · 지적 {s.get('issues') or []}")
            return cand, lines
    for hold in json.loads((r1 / "holds.json").read_text(encoding="utf-8")):
        if hold["problemCode"] == code:
            return None, [f"상태: 보류 — {hold['stage']}", f"- {hold['reason']}"]
    return None, []


def prompt_for(src: dict, cand: dict | None, lines: list[str], types: list[dict]) -> str:
    twin = (
        f"\n## r1 쌍둥이({cand['route']})\n{cand['content']}\n보기: {cand['choices']}\n정답: {cand['answer']}\n풀이:\n{cand['solution']}\n"
        if cand else "\n## r1 쌍둥이\n(만들지 못했다 — 아래 까닭)\n"
    )
    return (
        author.RULES
        + "\n## 이번 일\n아래 문항의 r1 쌍둥이가 보류됐다. 까닭을 읽고 **새 쌍둥이 하나**를 낸다(같은 꼴의 JSON 배열 · 객체 하나). "
        "지적을 그대로 고치되 쌍둥이의 뜻(같은 개념 · 절차 · 물음 꼴 · 난이도, 새 수 · 장면 · 문장)을 지킨다. "
        "엔진 유형이 정말 같을 때만 엔진을 고른다. 그림이 문제였으면 그림 스펙을 새로 짓는다(조건과 그림이 꼭 맞게).\n"
        + f"\n## ENGINE CONTRACT\n{author.FIGURE_CONTRACT.read_text(encoding='utf-8')}\n"
        + f"\n## 단원 «{src['section']}» — 엔진 유형\n{author.engine_block(types)}\n"
        + "\n## 원본\n" + author.present(src) + twin
        + "\n## 보류 까닭\n" + "\n".join(lines) + "\n"
    )


def revise_one(code: str, src: dict, r1: Path, work: Path, types: list[dict], model: str) -> str:
    out = work / "author-r2" / f"{code}.json"
    if out.exists():
        return f"{code}: 이미 있음"
    cand, lines = reasons_for(code, r1)
    if lines and lines[0] in ("상태: 통과", "상태: 보류 — 답 표기(값은 같음)"):
        return f"{code}: 대기 중 판정 확정 — 수정하지 않음"
    prompt = prompt_for(src, cand, lines, types)
    (work / "author-r2" / f"{code}.prompt.md").write_text(prompt, encoding="utf-8")
    envelope = author.run(prompt, model, Path(work))
    (work / "author-r2" / f"{code}.raw.json").write_text(json.dumps(envelope, ensure_ascii=False, indent=1), encoding="utf-8")
    proposals = author.parse_result(envelope.get("result", ""))
    if len(proposals) != 1 or proposals[0].get("problemCode") != code:
        raise ValueError(f"한 문항 응답의 코드/개수가 요청과 다르다: {code}")
    record = {"section": src["section"], "model": model, "sessionId": envelope.get("session_id"), "missing": [], "extra": [],
              "revisionOf": cand["twinExternalId"] if cand else None, "reasons": lines,
              "proposals": proposals}
    out.write_text(json.dumps(record, ensure_ascii=False, indent=1), encoding="utf-8")
    return f"{code}: {proposals[0].get('route') if proposals else None} · {envelope.get('_elapsedSec')}초"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("sources")
    parser.add_argument("r1")
    parser.add_argument("work")
    parser.add_argument("--catalog", default="")
    parser.add_argument("--jobs", type=int, default=3)
    parser.add_argument("--model", default=author.AUTHOR_MODEL)
    parser.add_argument("--only", default="", help="원본 문항 코드 쉼표 목록 — 단계별 재개")
    args = parser.parse_args()
    r1, work = Path(args.r1), Path(args.work)
    (work / "author-r2").mkdir(parents=True, exist_ok=True)
    sources = {s["problemCode"]: s for s in map(json.loads, open(args.sources, encoding="utf-8"))}
    catalog = json.loads(Path(args.catalog or work / "catalog.json").read_text(encoding="utf-8"))
    collect = json.loads((r1 / "collect.json").read_text(encoding="utf-8"))
    targets = [row["problemCode"] for row in collect["rows"]
               if row["status"] not in ("통과", "보류 — 답 표기(값은 같음)", "보류 — 봉인")]
    targets += [h["problemCode"] for h in json.loads((r1 / "holds.json").read_text(encoding="utf-8"))
                if h["stage"] in REVISABLE_STAGES]
    if args.only:
        targets = [code for code in targets if code in args.only.split(",")]
    print(f"고쳐 쓸 문항 {len(targets)}", flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.jobs) as pool:
        futures = {pool.submit(revise_one, code, sources[code], r1, work, catalog[sources[code]["section"]], args.model): code
                   for code in targets}
        for future in concurrent.futures.as_completed(futures):
            try:
                print(future.result(), flush=True)
            except Exception as error:
                print(f"실패 {futures[future]}: {error}", file=sys.stderr, flush=True)


if __name__ == "__main__":
    main()
