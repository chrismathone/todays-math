# -*- coding: utf-8 -*-
"""외장 SSD 의 교과서 원본(HWP)을 다시 읽어 문항 · 정답 · 문단을 낸다 (교과서 원본 대조 · 2026-10-21 · 읽기만).

  python extract_originals.py <DB 덤프 JSONL> <출력 폴더> [--workers 2] [--only <원본 경로 조각>]

DB 문항이 가리키는 원본 파일(`source_file` — G 드라이브 경로)을 SSD 경로로 바꿔 열고, 같은 폴더의 짝 정답 파일을
이관과 같은 규칙(`extract.is_answer_file` · `pair_key`)으로 붙인다. 가르기 · 정답 짝짓기는 이관의 것(`segment.py` ·
`extract.resolve_answer`)을 **그대로** 쓴다 — 리더만 HWP 바이너리용(`hwp5_flow.py`)이다.

출력(🔴 교과서 글이 든다 — 저장소 밖에만):
  problems.jsonl  원본 문항 하나에 한 줄 — 열쇠 · 묶음 · 번호 · 본문 · 답 · 답의 출처 · 풀이 · 그림 · 표
  files.jsonl     파일 하나에 한 줄 — 문항 수 · 정답 칸 · 짝 정답 파일 · 오류
  paras/<열쇠>.jsonl  문단 하나에 한 줄 — 글 · 번호 그림 · 표 · 깊이(대조기의 «글 찾기»가 쓴다)
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import unicodedata
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parents[1] / "import" / "textbook"))

import hwp5_flow  # noqa: E402
from extract import (  # noqa: E402
    CIRCLED,
    is_answer_file,
    pair_key,
    problem_suspicious,
    resolve_answer,
    suspicious_sections,
)
from segment import embedded_number, lead_number, looks_like_question, merge_answer_file, segment  # noqa: E402

SSD = Path("/Volumes/새 볼륨")
#: 같이 쓰는 지시문의 머리 «[05~08]»
GROUP_HEAD = re.compile(r"^\[\s*\d{1,3}\s*[~∼\-]\s*\d{1,3}\s*\]")


def ssd_path(g_path: str) -> Path:
    """`G:\\중등교과서\\…` → `/Volumes/새 볼륨/중등교과서/…`. 이름은 NFC 로 적혀 있다(전수 확인 2026-10-21)."""
    rel = g_path.replace("\\", "/")
    if not re.match(r"^[A-Za-z]:/", rel):
        raise ValueError(f"G 드라이브 경로가 아니다: {g_path}")
    return SSD / unicodedata.normalize("NFC", rel[3:])


def g_path(path: Path) -> str:
    rel = unicodedata.normalize("NFC", str(path.relative_to(SSD)))
    return "G:\\" + rel.replace("/", "\\")


def material_key(g: str) -> str:
    """원본 경로의 sha1 앞 16자 — 이관의 열쇠(`source_input.py`)와 같은 셈."""
    return hashlib.sha1(g.encode("utf-8")).hexdigest()[:16]


def para_record(index: int, para) -> dict:
    return {
        "i": index,
        "text": para.text,
        "glyph": bool(para.lead_picture is not None and para.lead_picture.is_glyph),
        "pictures": len([p for p in para.pictures if not p.is_glyph]) + len(para.group_pictures),
        "table": para.table_id,
        "depth": para.table_depth,
        "shapes": para.shapes,
        "host": para.host,
        "parent": para.parent,
        "notes": para.notes,
    }


def title_vocabulary(source: str, paras) -> list[str]:
    """이 파일의 머리글 · 단원 제목으로 쓰인 글 — 대조기가 «원본에만 있는 머리 · 꼬리 글»을 군더더기로 볼 근거.

    파일 이름 · 첫 문항 앞의 문단 · 파일 안에서 두 번 넘게 되풀이된 짧은 문단(쪽마다 찍힌 머리글)."""
    stem = re.sub(r"\.hwp$", "", source.rsplit("\\", 1)[-1], flags=re.I)
    out = [stem]
    first = next((i for i, p in enumerate(paras) if (lead_number(p.text) or (0,))[0] == 1 or (p.lead_picture is not None and p.lead_picture.is_glyph)), len(paras))
    # 첫 문항 앞의 문단 — 문단 안의 줄마다(«다항식의 연산 ⏎ 01 ⏎ 다음 …» 처럼 제목이 문항 문단의 머리에 붙은 책)
    # 수식이 든 줄은 제목으로 두지 않는다 — 연산 학습지는 문항 줄(«절댓값이 $4$인 수»)이 첫 번호 앞에도 나온다(눈금 맞추기 3회차)
    for p in paras[:first]:
        out.extend(line.strip() for line in p.text.split("\n") if 0 < len(line.strip()) <= 60 and "$" not in line)
    if first < len(paras):
        # 첫 문항 문단은 번호 줄 **앞**의 줄만 — 그 뒤는 문항 글이다
        for line in paras[first].text.split("\n"):
            if lead_number(line.strip()) or (paras[first].lead_picture is not None and paras[first].lead_picture.is_glyph):
                break
            if 0 < len(line.strip()) <= 60 and "$" not in line:
                out.append(line.strip())
    counts: dict[str, int] = {}
    for p in paras:
        for line in p.text.split("\n"):
            line = line.strip()
            # 쪽마다 되풀이된 머리글 — 수식이 든 줄은 아니다(연산 학습지의 «절댓값이 $4$인 수» 같은 문항 줄도 되풀이된다)
            if line and len(line) <= 40 and "$" not in line:
                counts[line] = counts.get(line, 0) + 1
    out.extend(text for text, n in counts.items() if n >= 2)
    return sorted(set(out))


def extract_one(job: tuple[str, list[str], str]) -> tuple[list[dict], dict]:
    source, answer_sources, out_dir = job
    key = material_key(source)
    summary = {"path": source, "key": key, "answerFiles": answer_sources}
    rows: list[dict] = []
    try:
        paras = hwp5_flow.read_paras(ssd_path(source))
        for para in paras:
            # 같이 쓰는 지시문 «[05~08] 아래 그림과 같이 …,⏎다음 각의 …» — 줄 바꿈이 든 채로는 가르기(`segment._GROUP_STEM`)가
            # 지시문으로 못 알아보고 앞 문항의 끝에 붙인다. 이관 때의 HWPX 흐름에는 이 줄 바꿈이 없었다(같은 문항이 DB 에서 바르다)
            if GROUP_HEAD.match(para.text) and "\n" in para.text:
                para.text = re.sub(r"\s*\n\s*", " ", para.text)
        with open(Path(out_dir) / "paras" / f"{key}.jsonl", "w", encoding="utf-8") as handle:
            for index, para in enumerate(paras):
                handle.write(json.dumps(para_record(index, para), ensure_ascii=False) + "\n")
        doc = segment(paras)
        filled = 0
        for answer_source in answer_sources:
            answer_paras = hwp5_flow.read_paras(ssd_path(answer_source))
            filled += merge_answer_file(doc, answer_paras)
            akey = material_key(answer_source)
            with open(Path(out_dir) / "paras" / f"{akey}.jsonl", "w", encoding="utf-8") as handle:
                for index, para in enumerate(answer_paras):
                    handle.write(json.dumps(para_record(index, para), ensure_ascii=False) + "\n")
        resolved = {}
        for problem in doc.problems:
            has_choices = sum(1 for c in CIRCLED if c in problem.text) >= 4
            resolved[problem.key] = (has_choices, *resolve_answer(doc, problem.key, has_choices, problem.text))
        rejected = suspicious_sections(doc, resolved)
        titles = title_vocabulary(source, paras)
        for problem in doc.problems:
            has_choices, answer, answer_from = resolved[problem.key]
            if answer and (
                problem.section in rejected
                or problem_suspicious(problem.text, answer, answer_from, doc.solutions.get(problem.key))
            ):
                answer_from = "rejected-mismatch:" + answer_from
            rows.append({
                "key": key,
                "id": f"tb-{key}-{problem.section}-{problem.number}",
                "path": source,
                "section": problem.section,
                "number": problem.number,
                "glyphNumber": problem.glyph_number,
                "content": problem.text,
                #: 그림 · 자료 표의 자리를 `[[FIG:k]]` · `[[TBL:n]]` 로 적은 글(자료 표의 칸 글은 빠진다 — 이관의 그림 문항이 쓴 글)
                "contentFig": problem.marked_text if problem.figs or problem.tables else None,
                "isQuestion": has_choices or looks_like_question(problem.text),
                "hasChoices": has_choices,
                "answer": answer,
                "answerFrom": answer_from,
                "quickKey": doc.keys.get(problem.key),
                "solution": doc.solutions.get(problem.key),
                "pictures": len(problem.pictures),
                "figs": len(problem.figs),
                "shapes": problem.shapes,
                "tables": problem.tables,
                "embeddedNumber": embedded_number(problem),
            })
        summary.update(
            problems=len(doc.problems),
            sections=len({p.section for p in doc.problems}),
            answerSection=doc.answer_section,
            answerIsPicture=doc.answer_is_picture,
            filledFromAnswerFile=filled,
            rejectedSections=sorted(rejected),
            paras=len(paras),
            titles=titles,
        )
    except Exception as error:  # noqa: BLE001 — 파일 하나가 깨져도 전수는 계속한다(원장에 적는다)
        summary["error"] = f"{type(error).__name__}: {error}"[:300]
    return rows, summary


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("dump")
    parser.add_argument("out")
    parser.add_argument("--workers", type=int, default=2)
    parser.add_argument("--only", default="")
    args = parser.parse_args()
    out = Path(args.out)
    (out / "paras").mkdir(parents=True, exist_ok=True)

    sources = sorted({json.loads(line)["sourceFile"] for line in open(args.dump, encoding="utf-8") if line.strip()})
    if args.only:
        sources = [s for s in sources if args.only in s]
    # 같은 폴더의 정답 파일 — 이관과 같은 짝짓기(폴더 + 꼬리를 뗀 이름)
    answer_files: dict[tuple[str, str], list[str]] = {}
    for folder in sorted({ssd_path(s).parent for s in sources}):
        for name in sorted(os.listdir(folder)):
            if name.startswith("._") or not name.lower().endswith(".hwp"):
                continue
            g = g_path(folder / name)
            if is_answer_file(g):
                answer_files.setdefault(pair_key(g), []).append(g)
    jobs = [
        (source, [] if is_answer_file(source) else answer_files.get(pair_key(source), []), str(out))
        for source in sources
    ]
    with open(out / "problems.jsonl", "w", encoding="utf-8") as problems, open(out / "files.jsonl", "w", encoding="utf-8") as files:
        with ProcessPoolExecutor(max_workers=args.workers) as pool:
            for done, (rows, summary) in enumerate(pool.map(extract_one, jobs, chunksize=4), 1):
                for row in rows:
                    problems.write(json.dumps(row, ensure_ascii=False) + "\n")
                files.write(json.dumps(summary, ensure_ascii=False) + "\n")
                if done % 200 == 0:
                    print(f"{done}/{len(jobs)}", flush=True)
    print(f"파일 {len(jobs)}")


if __name__ == "__main__":
    main()
