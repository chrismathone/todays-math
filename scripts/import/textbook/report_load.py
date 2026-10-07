# -*- coding: utf-8 -*-
"""답은 붙었지만 문제은행에 못 실었거나 잠가 둔 문항의 보고서(Markdown) — 원장님 2026-10-07 «매핑 안되는 문제들은 따로 md 보고서».

  python report_load.py <작업 폴더> <보고서.md> [--extract extract2] [--prepared prepared2]

`report.py` 는 «정답을 못 붙인 문항»을 적는다. 이 보고서는 그 다음 단계다 — 정답이 붙은 문항이 문제은행까지 가는 길에서
어디서 얼마나 빠졌나:

  1. 미룬 문항      그림 · 한글 도형 · 자료 표가 든 문항(원장님 «그림 없는 것 먼저 하고 그림은 마지막에 따로»)
  2. 검토에서 빠진 문항   검토자가 정답 없이 풀어 본 결과 — 실을 수 없다 · 정답지가 이 문항의 답이 아니다 · 차시가 없다 …
  3. 싣고 잠가 둔 문항   답은 확인됐지만 지면에 낼 꼴이 아니다(`direct_use_allowed = false` — 은행에는 보이고 출제에는 안 뽑힌다)

읽는 것: `<추출>/problems.jsonl` · `<준비>/prepared.jsonl` · `load/plan.json`(적재기의 마지막 계획).
"""
from __future__ import annotations

import collections
import datetime
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))

from prepare import eligible  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

DEFERRED = ("그림", "한글 도형", "자료 표", "그림을 가리키는 말", "붙은 문항", "본문이 너무 길다", "답이 «풀이 참조»")
DEFERRED_MEANING = {
    "그림": "본문에 그림 파일이 있다 — 그림을 문항에 붙이는 길을 만든 뒤에 싣는다.",
    "한글 도형": "한글에서 그린 도형(선 · 상자)이 있다 — 그림으로 떠야 한다.",
    "자료 표": "자료가 든 표가 있다 — 문제은행은 표를 그림으로 싣는다.",
    "그림을 가리키는 말": "«그림과 같이 …»라고 하는데 그림을 못 잡았다 — 원본을 봐야 한다.",
    "붙은 문항": "한 덩이에 다른 문항의 번호가 들어 있다 — 가르는 규칙을 더해야 한다.",
    "본문이 너무 길다": "한 문항으로 보기에 길다 — 여러 문항이 붙었을 수 있다.",
    "답이 «풀이 참조»": "정답 칸이 «풀이 참조»다 — 서술형. 채점 기준이 있어야 한다.",
}


def short_path(path: str) -> str:
    parts = pathlib.PureWindowsPath(path).parts
    for i, part in enumerate(parts):
        if part in ("중등교과서", "고등교과서"):
            return "/".join(parts[i + 1 :])
    return path


def head_of(reason: str) -> str:
    """까닭의 머리 — 표로 묶을 이름."""
    head = reason.split(" — ")[0].split(" · ")[0]
    head = re.sub(r"«.*»", "«…»", head)
    head = re.sub(r"(남은 표기) .*", r"\1", head)
    head = re.sub(r"(지면 검토): .*", r"\1", head)
    head = re.sub(r"(죽은 역슬래시) .*", r"\1", head)
    return head[:40]


def numbers_text(items: list[dict]) -> str:
    by_section: dict[int, list[int]] = collections.defaultdict(list)
    for item in items:
        by_section[item["section"]].append(item["number"])
    chunks = []
    for section in sorted(by_section):
        numbers = ", ".join(str(n) for n in sorted(by_section[section]))
        chunks.append(f"{section + 1}묶음 {numbers}" if len(by_section) > 1 else numbers)
    return " / ".join(chunks)


def listing(add, rows: list[dict], total_by_book: collections.Counter, detail: bool) -> None:
    """책별 · 파일별 표. rows 의 원소: grade · book · path · section · number · reason(머리) · why(자세한 까닭)."""
    by_book: dict[tuple[str, str], list[dict]] = collections.defaultdict(list)
    for row in rows:
        by_book[(row["grade"], row["book"])].append(row)
    for (grade, book), items in sorted(by_book.items()):
        add(f"### {grade} · {book} — {len(items):,} / {total_by_book[(grade, book)]:,}")
        add("")
        add("| 파일 | 까닭 | 번호 |")
        add("|---|---|---|")
        by_file: dict[tuple[str, str], list[dict]] = collections.defaultdict(list)
        for row in items:
            by_file[(row["path"], row["why"] if detail else row["reason"])].append(row)
        for (path, why), group in sorted(by_file.items()):
            add(f"| `{pathlib.PureWindowsPath(path).name}` | {why.replace('|', '¦')[:160]} | {numbers_text(group)} |")
        add("")


def main() -> None:
    root, target = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    option = lambda name, default: sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default  # noqa: E731
    problems = [json.loads(line) for line in (root / option("--extract", "extract2") / "problems.jsonl").open(encoding="utf-8")]
    prepared = {row["id"]: row for row in map(json.loads, (root / option("--prepared", "prepared2") / "prepared.jsonl").open(encoding="utf-8"))}
    plan = json.loads((root / "load" / "plan.json").read_text(encoding="utf-8"))
    # 문항 번호(문제은행에서 찾는 값) — 적재기의 원장에서
    ledger_path = root / "load" / "ledger.json"
    codes = {row["externalId"]: row["problemCode"] for row in json.loads(ledger_path.read_text(encoding="utf-8"))["problems"]} if ledger_path.exists() else {}

    answered = [p for p in problems if p.get("kind") == "assessment" and p.get("isQuestion", True) and eligible(p) != "답이 없다"]
    deferred = [dict(p, reason=eligible(p)) for p in answered if eligible(p) in DEFERRED]
    text_only = [p for p in answered if eligible(p) is None]
    total_by_book = collections.Counter((p["grade"], p["book"]) for p in answered)

    def located(external_id: str) -> dict:
        row = prepared[external_id]
        return {"grade": row["grade"], "book": row["book"], "path": row["path"], "section": row["section"], "number": row["number"]}

    skipped = [dict(located(s["externalId"]), reason=head_of(s["reason"]), why=s["reason"]) for s in plan["skipped"] if s["externalId"] in prepared]
    held = [
        dict(located(row["externalId"]), reason=head_of(reason), why=reason, code=codes.get(row["externalId"], ""), unit=row["section"])
        for row in plan["rows"]
        for reason in row["hold"]
    ]
    held_rows = sum(1 for row in plan["rows"] if row["hold"])
    open_rows = len(plan["rows"]) - held_rows
    not_rendered = len(text_only) - len(plan["rows"]) - len(skipped)

    lines: list[str] = []
    add = lines.append
    add(f"# 교과서 문제 이관 — 답은 붙었지만 못 실었거나 잠가 둔 문항 ({datetime.date.today().isoformat()})")
    add("")
    add("정답을 못 붙인 문항은 [`unmapped.md`](unmapped.md)에 있다. 여기는 그 다음 — **정답이 붙은 문항**이 문제은행까지 가는 길에서 어디서 빠졌는가다.")
    add("")
    add("## 요약")
    add("")
    add("| 단계 | 문항 | |")
    add("|---|---:|---|")
    add(f"| 정답이 붙은 문항 | {len(answered):,} | 평가 자료 · 물음이 있는 것 |")
    add(f"| − 그림 · 표 때문에 미룬 문항 | {len(deferred):,} | 아래 1 — «그림은 마지막에 따로» |")
    add(f"| = 글만으로 된 문항 | {len(text_only):,} | |")
    add(f"| − 수식이 그려지지 않아 검토에 못 올린 문항 | {max(0, not_rendered):,} | 변환이 실패한 것 |")
    add(f"| − 검토에서 빠진 문항 | {len(skipped):,} | 아래 2 |")
    add(f"| = **문제은행에 실은 문항** | **{len(plan['rows']):,}** | 출처 «교과서»(`school_textbook`) |")
    add(f"| 　그 가운데 출제에 쓰는 문항 | {open_rows:,} | 지면 검토를 지났다 |")
    add(f"| 　그 가운데 잠가 둔 문항 | {held_rows:,} | 아래 3 — 은행에는 보이고 출제에는 안 뽑힌다 |")
    add("")

    add("## 1. 그림 · 표 때문에 미룬 문항")
    add("")
    add("원장님 2026-10-07: «그림 없는 것 먼저 하고 그림은 마지막에 따로». 아래는 문항마다 **첫 까닭 하나**다.")
    add("")
    add("| 까닭 | 문항 | 뜻 |")
    add("|---|---:|---|")
    counts = collections.Counter(p["reason"] for p in deferred)
    for reason in DEFERRED:
        if counts[reason]:
            add(f"| {reason} | {counts[reason]:,} | {DEFERRED_MEANING[reason]} |")
    add("")
    add("| 과목 · 책 | 미룬 문항 | 정답이 붙은 문항 |")
    add("|---|---:|---:|")
    for (grade, book), count in sorted(collections.Counter((p["grade"], p["book"]) for p in deferred).items()):
        add(f"| {grade} · {book} | {count:,} | {total_by_book[(grade, book)]:,} |")
    add("")

    add("## 2. 검토에서 빠진 문항")
    add("")
    add("검토자(구독 모델)가 **정답 없이** 문항을 풀고, 그 답을 출판사 정답과 기계로 대조했다. 답이 다르면 둘째 검토자가 갈랐다.")
    add("")
    add("| 까닭 | 문항 |")
    add("|---|---:|")
    for reason, count in collections.Counter(row["reason"] for row in skipped).most_common():
        add(f"| {reason} | {count:,} |")
    add("")
    add("- **실을 수 없는 문항** — 그림 · 표 · 앞 문항 없이는 못 푼다, 글이 깨졌다, 물음이 아니다, 답을 기계로 대조할 수 없다(열린 물음).")
    add("- **정답지가 이 문항의 답이 아니다** — 뽑는 과정에서 다른 문항의 답이 붙었다. 그대로 실었으면 틀린 답이다.")
    add("- **차시가 없다** — 우리 단원 나무에 맞는 차시가 없다(초등 내용의 진단 평가 따위).")
    add("")
    listing(add, skipped, total_by_book, detail=False)

    add("## 3. 싣고 잠가 둔 문항")
    add("")
    add("답은 확인됐다. 지면에 낼 꼴이 아니어서 출제에서 뺐다 — 문제은행에서 보고 고칠 수 있다. 한 문항에 까닭이 둘일 수 있다.")
    add("")
    add("| 까닭 | 건 |")
    add("|---|---:|")
    for reason, count in collections.Counter(row["reason"] for row in held).most_common():
        add(f"| {reason} | {count:,} |")
    add("")
    add("문제은행의 검색 칸에 **문항 번호**를 넣으면 그 문항이 나온다. 검수 화면의 «출제에서 빠져 있다» 줄에도 나온다 — 거기서 «통과»를 준 문항은")
    add("`hold-school-textbook.ts --release-passed` 가 푼다. 문제은행에서 고친 글은 적재기가 다시 덮어쓰지 않는다.")
    add("")
    add("| 문항 번호 | 과목 · 차시 | 파일 · 번호 | 까닭 |")
    add("|---|---|---|---|")
    for row in sorted(held, key=lambda r: (r["grade"], r["unit"], r["code"])):
        name = pathlib.PureWindowsPath(row["path"]).name
        add(f"| `{row['code']}` | {row['grade']} · {row['unit']} | `{name}` {row['number']}번 | {row['why'].replace('|', '¦')[:200]} |")
    add("")

    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {"answered": len(answered), "deferred": len(deferred), "textOnly": len(text_only), "skipped": len(skipped), "loaded": len(plan["rows"]), "open": open_rows, "held": held_rows},
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
