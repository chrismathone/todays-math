# -*- coding: utf-8 -*-
"""정답 칸이 **그림뿐인** 자료 — 그 그림을 꺼내 읽을 묶음을 짓고, 읽은 답을 추출에 붙인다 (교과서 이관 · 2026-10-08).

  python answer_pictures.py build <작업 폴더> [--extract extract5] [--out answers]
  python answer_pictures.py collect <작업 폴더> [--out answers]
  python answer_pictures.py merge <작업 폴더> --extract extract5 --into extract6 [--out answers]

YBM 고등 «기초 UP · 실력 UP 문제»(190파일 · 1,105문항)는 정답 칸이 «번호 → 답» 표를 찍은 그림 한 장이다. 글이 없어 짝을 못 지었다.

  build   — 정답 그림을 `answers/img/<key>/a<n>.png` 로 꺼내고, 파일마다 읽을 묶음(`answers/batch/<key>.json` — 그림 · 문항 번호들)을 쓴다.
  (읽기) — 구독 모델이 그림을 Read 로 열고 `answers/out/<key>.txt` 에 «번호: 답» 줄을 쓴다(`READ.md`).
  collect — 출력을 읽어 `answers/read.jsonl`(key · 번호 · 답)을 쓴다. 꼴이 어긋난 줄 · 묶음에 없는 번호는 버린다.
  merge   — 추출의 답이 없는 그 문항에 읽은 답을 붙인다(`answerFrom: "picture"`). 🔴 읽은 답은 **확인된 답이 아니다** —
            다음 검토가 정답을 안 보고 풀어 대조한다(다르면 둘째 검토). 지어낸 답이 그대로 실리는 길은 없다.
"""
from __future__ import annotations

import collections
import io
import json
import pathlib
import re
import sys
import zipfile

sys.path.insert(0, str(pathlib.Path(__file__).parent))

from hwpx_flow import read_paras  # noqa: E402
from segment import segment  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

#: 읽은 답 한 줄 — «3: $\frac{8}{9}$» · «12: ③» · «2-1: …»(묶음이 여럿이면 «묶음-번호»)
_LINE = re.compile(r"^\s*(?:(\d+)\s*-\s*)?(\d+)\s*[:：]\s*(.+?)\s*$")


def targets(rows: list[dict]) -> dict[str, list[dict]]:
    by_key: dict[str, list[dict]] = collections.defaultdict(list)
    for row in rows:
        if row.get("kind") == "assessment" and row.get("isQuestion", True) and not row.get("answer") and row.get("answerSectionPicture"):
            by_key[row["key"]].append(row)
    return dict(sorted(by_key.items()))


def build(root: pathlib.Path, extract: str, out: pathlib.Path) -> None:
    from PIL import Image  # noqa: E402

    rows = [json.loads(line) for line in (root / extract / "problems.jsonl").open(encoding="utf-8")]
    for name in ("img", "batch", "out"):
        (out / name).mkdir(parents=True, exist_ok=True)
    index = []
    for key, items in targets(rows).items():
        source = root / "hwpx" / f"{key}.hwpx"
        doc = segment(read_paras(source))
        files = []
        with zipfile.ZipFile(source) as z:
            names = {pathlib.PurePosixPath(n).stem: n for n in z.namelist() if n.startswith("BinData/")}
            for n, picture in enumerate(doc.answer_pictures, 1):
                if picture.bin_id not in names:
                    continue
                image = Image.open(io.BytesIO(z.read(names[picture.bin_id]))).convert("RGB")
                target = out / "img" / key / f"a{n}.png"
                target.parent.mkdir(parents=True, exist_ok=True)
                image.save(target)
                files.append(str(target))
        sections = sorted({row["section"] for row in items})
        numbers = [f"{row['section'] + 1}-{row['number']}" if len(sections) > 1 else str(row["number"]) for row in sorted(items, key=lambda r: (r["section"], r["number"]))]
        batch = {"key": key, "material": pathlib.PurePath(items[0]["path"]).name, "pictures": files, "numbers": numbers, "multiSection": len(sections) > 1}
        (out / "batch" / f"{key}.json").write_text(json.dumps(batch, ensure_ascii=False, indent=1), encoding="utf-8")
        index.append({"key": key, "pictures": len(files), "problems": len(items)})
    (out / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps({"파일": len(index), "그림": sum(i["pictures"] for i in index), "문항": sum(i["problems"] for i in index), "그림 없는 파일": sum(1 for i in index if not i["pictures"])}, ensure_ascii=False))


def collect(out: pathlib.Path) -> None:
    index = json.loads((out / "index.json").read_text(encoding="utf-8"))
    counts = collections.Counter()
    with (out / "read.jsonl").open("w", encoding="utf-8") as sink:
        for item in index:
            result = out / "out" / f"{item['key']}.txt"
            if not result.exists():
                counts["출력 없음"] += 1
                continue
            batch = json.loads((out / "batch" / f"{item['key']}.json").read_text(encoding="utf-8"))
            wanted = set(batch["numbers"])
            seen = set()
            for line in result.read_bytes().decode("utf-8").splitlines():
                match = _LINE.match(line)
                if not match:
                    continue
                section, number, answer = match.group(1), match.group(2), match.group(3)
                label = f"{section}-{number}" if batch["multiSection"] and section else number
                if label not in wanted or label in seen or answer in ("?", "모름", "-"):
                    counts["버린 줄"] += 1
                    continue
                seen.add(label)
                sec = int(section) - 1 if batch["multiSection"] and section else None
                sink.write(json.dumps({"key": item["key"], "section": sec, "number": int(number), "answer": answer}, ensure_ascii=False) + "\n")
                counts["읽은 답"] += 1
            counts["못 읽은 문항"] += len(wanted - seen)
    print(json.dumps(dict(counts), ensure_ascii=False))


def merge(root: pathlib.Path, extract: str, into: str, out: pathlib.Path) -> None:
    read: dict[tuple, str] = {}
    for item in map(json.loads, (out / "read.jsonl").open(encoding="utf-8")):
        read[(item["key"], item["section"], item["number"])] = item["answer"]
    target = root / into
    target.mkdir(parents=True, exist_ok=True)
    filled = 0
    with (root / extract / "problems.jsonl").open(encoding="utf-8") as lines, (target / "problems.jsonl").open("w", encoding="utf-8") as sink:
        sections_of: dict[str, set] = collections.defaultdict(set)
        rows = [json.loads(line) for line in lines]
        for row in rows:
            sections_of[row["key"]].add(row["section"])
        for row in rows:
            if row.get("kind") == "assessment" and not row.get("answer") and row.get("answerSectionPicture"):
                section = row["section"] if len(sections_of[row["key"]]) > 1 else None
                answer = read.get((row["key"], section, row["number"]))
                if answer:
                    row = {**row, "answer": answer, "answerFrom": "picture"}
                    filled += 1
            sink.write(json.dumps(row, ensure_ascii=False) + "\n")
    for name in ("files.jsonl",):
        if (root / extract / name).exists():
            (target / name).write_bytes((root / extract / name).read_bytes())
    print(json.dumps({"붙인 답": filled}, ensure_ascii=False))


def main() -> None:
    command, root = sys.argv[1], pathlib.Path(sys.argv[2])
    option = lambda name, default: sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default  # noqa: E731
    out = root / option("--out", "answers")
    if command == "build":
        build(root, option("--extract", "extract5"), out)
    elif command == "collect":
        collect(out)
    elif command == "merge":
        merge(root, option("--extract", "extract5"), option("--into", "extract6"), out)
    else:
        raise SystemExit(f"모르는 명령 {command}")


if __name__ == "__main__":
    main()
