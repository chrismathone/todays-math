# -*- coding: utf-8 -*-
"""대조 원장 → 마무리 원장 · 목록 · 요약 (교과서 원본 대조 · 2026-10-21).

  python report.py <원장(verify.py)> <손 판정(manual JSON)> <눈금(calibrate.py 의 controls.json)> <출력 폴더> [--date 20261021]

낸다(🔴 저장소 밖 — 문항 코드와 짧은 까닭만 적지만 원장 줄에는 원본 정답이 든다):
  ledger-<날짜>.jsonl          문항마다 한 줄 — 본문 판정(같음 · 표기만 다름 · 다른 문항 · 원본 못 찾음) · 정답 판정 · 손 판정
  lock-candidates-<날짜>.json  잠금 후보 — 쓰는 문항(`direct_use_allowed`) 가운데 «다른 문항 — DB 글이 빠짐»(손 판정 A).
                               적용은 리드가 한다(이 도구는 DB 를 안 만진다)
  review-<날짜>.json           확인 목록 — DB 가 원본과 다르게 고친 문항(B) · 정답이 원본과 다른 문항 · 뜻이 걸린 표기 흠
  summary-<날짜>.md            요약
"""
from __future__ import annotations

import argparse
import collections
import json
from pathlib import Path

BODY_KO = {"same": "같음", "notation": "표기만 다름", "different": "다른 문항", "missing": "원본 못 찾음"}
ANSWER_KO = {
    "same": "같음", "notation": "표기만 다름", "partial": "일부만 대조(소문항 일부)", "in-solution": "원본 풀이 끝의 값과 같음",
    "different": "다름", "none": "원본 정답 없음", "picture": "원본 정답이 그림(대조 못 함)",
}
EDIT_KO = {"correction": "고침", "rewrite": "다시 씀"}
#: 뜻이 걸린 표기 흠 — «표기만 다름»이지만 지면에서 뜻이 달라 보일 수 있다
MEANING_FLAGS = ("표기: 합동 기호가 등호로", "표기: 선분 기호 빠짐", "안내: (정답 n개) 빠짐")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("ledger")
    parser.add_argument("manual")
    parser.add_argument("controls")
    parser.add_argument("out")
    parser.add_argument("--date", default="20261021")
    args = parser.parse_args()
    out = Path(args.out)
    rows = [json.loads(line) for line in open(args.ledger, encoding="utf-8")]
    manual = json.load(open(args.manual, encoding="utf-8"))
    controls = json.load(open(args.controls, encoding="utf-8"))

    final = []
    for row in rows:
        row = dict(row)
        row["본문"] = BODY_KO[row["body"]]
        row["정답"] = ANSWER_KO.get(row.get("answer"), row.get("answer"))
        if row["problemCode"] in manual:
            row["손판정"] = manual[row["problemCode"]]
        final.append(row)
    with open(out / f"ledger-{args.date}.jsonl", "w", encoding="utf-8") as handle:
        for row in final:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")

    def item(row: dict, why: str) -> dict:
        return {"problemCode": row["problemCode"], "externalId": row["externalId"], "bookKey": row["bookKey"],
                "materialKind": row["materialKind"], "directUseAllowed": row["directUseAllowed"], "why": why}

    lock = [item(r, r["손판정"]["note"]) for r in final if r.get("손판정", {}).get("category") == "A" and r["directUseAllowed"]]
    edited = [item(r, r["손판정"]["note"]) for r in final if r.get("손판정", {}).get("category") == "B"]
    answers = [
        {**item(r, r.get("answerSource", "")), "evidence": r.get("answerEvidence"), "originalAnswer": r.get("originalAnswer")}
        for r in final if r.get("answer") == "different" and r["directUseAllowed"]
    ]
    flags = [
        item(r, " · ".join(f for f in r.get("bodyReasons", []) if f in MEANING_FLAGS) or " · ".join(r.get("displayFlags", [])))
        for r in final if r["directUseAllowed"] and (set(r.get("bodyReasons", [])) & set(MEANING_FLAGS) or r.get("displayFlags"))
    ]
    (out / f"lock-candidates-{args.date}.json").write_text(json.dumps(lock, ensure_ascii=False, indent=1), encoding="utf-8")
    (out / f"review-{args.date}.json").write_text(
        json.dumps({"edited": edited, "answers": answers, "meaningFlags": flags}, ensure_ascii=False, indent=1), encoding="utf-8"
    )

    body = collections.Counter(r["본문"] for r in final)
    body_use = collections.Counter((r["본문"], r["directUseAllowed"]) for r in final)
    answer = collections.Counter(r["정답"] for r in final)
    recorded = collections.Counter((EDIT_KO[r["recordedEdit"]], r["본문"]) for r in final if r["recordedEdit"])
    recorded_usable = sum(1 for r in final if r["recordedEdit"] and r["directUseAllowed"])
    unrecorded_diff = [r for r in final if r["body"] == "different" and not r["recordedEdit"]]
    manual_tally = collections.Counter(r.get("손판정", {}).get("category", "?") for r in unrecorded_diff)
    c_reasons = collections.Counter(r["손판정"]["note"] for r in unrecorded_diff if r.get("손판정", {}).get("category") == "C")
    by_grade = collections.defaultdict(collections.Counter)
    for r in final:
        by_grade[r["grade"]][r["본문"]] += 1
    reasons = collections.Counter()
    for r in final:
        if r["body"] == "notation":
            for why in r["bodyReasons"]:
                reasons[why] += 1
    position = collections.Counter(r.get("positionAgrees") for r in final if r["body"] in ("same", "notation"))
    evidence = collections.Counter(r.get("answerEvidence") for r in final if r.get("answer") == "different" and r["directUseAllowed"])

    lines = [
        f"# 교과서 문항 원본 대조 — 요약 ({args.date})",
        "",
        f"DB 교과서 문항 {len(final):,}개(`source = school_textbook`)를 외장 SSD 원본 HWP 와 하나씩 견줬다. 읽기만 — DB 는 안 만졌다.",
        "",
        "## 본문",
        "",
        "| 판정 | 문항 | 쓰는 문항 | 잠긴 문항 |",
        "|---|---:|---:|---:|",
    ]
    for ko in ("같음", "표기만 다름", "다른 문항", "원본 못 찾음"):
        lines.append(f"| {ko} | {body[ko]:,} | {body_use[(ko, True)]:,} | {body_use[(ko, False)]:,} |")
    lines += [
        "",
        "«다른 문항»의 갈래:",
        "",
        f"- 2026-10-09 잠금 문항 복구 후보(`scripts/import/textbook/recovery-20261009/`)에 든 문항 — "
        + " · ".join(f"{kind} {n}" for (kind, body_ko), n in sorted(recorded.items()) if body_ko == "다른 문항")
        + f" — 복구 묶음의 문항 {sum(recorded.values())} 가운데 쓰는 문항 {recorded_usable}"
        + ("(전부 이미 잠겨 있다 · `direct_use_allowed = false`). 기록만." if recorded_usable == 0 else " — 확인 필요."),
        f"- 기록 없는 «다른 문항» {len(unrecorded_diff)} — 손으로 다 읽었다: "
        f"A(DB 글이 빠짐 · 잠금 후보) {manual_tally['A']} · B(DB 가 원본과 다르게 고침 · 확인 목록) {manual_tally['B']} · "
        f"C(DB 이상 없음 — 대조기 쪽 차이) {manual_tally['C']}",
    ]
    for reason, n in c_reasons.most_common():
        lines.append(f"  - C · {reason}: {n}")
    lines += ["", "«표기만 다름»의 까닭(문항마다 여럿일 수 있다):", ""]
    for why, n in reasons.most_common():
        lines.append(f"- {why}: {n:,}")
    lines += ["", "## 정답", "", "| 판정 | 문항 |", "|---|---:|"]
    for ko, n in answer.most_common():
        lines.append(f"| {ko} | {n:,} |")
    lines += [
        "",
        f"쓰는 문항 가운데 정답 «다름» {sum(evidence.values())} — 근거: 원본 풀이에 DB 정답이 글자로만 있다 {evidence['string']} · "
        f"근거 없음 {evidence['none']}. 대부분은 원본 쪽 정답 짝짓기의 꼴(풀이 끝 값만 · 소문항 일부 · 다른 문항의 빠른 정답)이다 — "
        "이관 때 DB 정답은 검토자가 **정답 없이** 풀어 출판사 정답과 맞춘 값이다. 확인 목록으로만 둔다(잠금 후보 아님).",
        "",
        "## 자리(이관 가르기와 따로 읽은 번호)",
        "",
        f"같음 · 표기만 다름 가운데 번호가 맞음 {position[True]:,} · 어긋남 {position[False]:,} · 못 읽음 {position[None]:,}"
        " (어긋남은 손으로 봤다 — 두 단 표의 보기 줄 · «1)» 소문항 번호 · 같은 발문이 되풀이된 자리에서 이 대조기가 헛짚은 것. 판정에는 안 쓴다)",
        "",
        "## 눈금(틀린 대조군 · 표기 대조군 — 전수와 같은 판정 길)",
        "",
        "| 대조군 | 수 | 결과 |",
        "|---|---:|---|",
    ]
    for kind, counter in controls["results"].items():
        total = sum(counter.values())
        good = total - counter.get("different", 0) if kind == "notation" else counter.get("different", 0)
        lines.append(f"| {kind} | {total} | {'통과' if kind == 'notation' else '잡음'} {good} ({good / total:.1%}) |")
    if "labels" in controls:
        lines += ["", "손 판정 표본(진짜 → 대조기):", ""]
        for name, info in controls["labels"].items():
            lines.append(f"- {name}: " + " · ".join(f"{k} {v}" for k, v in info["confusion"].items()))
    lines += ["", "## 학년 · 과목", "", "| 과목 | 같음 | 표기만 다름 | 다른 문항 |", "|---|---:|---:|---:|"]
    for grade in sorted(by_grade):
        c = by_grade[grade]
        lines.append(f"| {grade} | {c['같음']:,} | {c['표기만 다름']:,} | {c['다른 문항']:,} |")
    lines += [
        "",
        f"## 목록",
        "",
        f"- 잠금 후보 {len(lock)} — `lock-candidates-{args.date}.json`",
        f"- 확인 목록 — DB 가 고친 문항 {len(edited)} · 정답 다름 {len(answers)} · 뜻이 걸린 표기 흠 {len(flags)} — `review-{args.date}.json`",
        "",
        "## 한계",
        "",
        "- 글이 같고 그림만 다른 짝은 못 가른다 — 대조군 shift 의 놓침 3/400 이 전부 이것(이웃 문항과 발문이 글자째 같다). 그림은 견주지 않았다.",
        "- 머리글 · 이웃 문항 면제가 진짜 빠진 글을 넘길 수 있다 — 대조군 drop 의 놓침 1 · tail 의 놓침 3(/400)이 전부 이것"
        "(빠진 글이 같은 파일에서 되풀이되는 짧은 줄이거나 이웃 문항의 글과 같았다).",
        "- 원본 정답이 그림인 문항은 정답을 대조하지 못했다.",
        "- 원본은 HWP 이진 판을 직접 읽었다(`hwp5_flow.py` — 한컴 COM 없이). 이관은 HWPX 변환본을 읽었으므로 문단 경계가 다른 자리가 있다 —"
        " 손 판정 C 의 «대조기 쪽 경계»가 그것이다.",
        "- 손 판정 표본의 «다른 문항» 정밀도가 낮다(셋째 표본 6/15) — 그래서 기록 없는 «다른 문항»은 표본이 아니라 **전부** 손으로 읽었다."
        " 반대로 표본의 «같음» 60 · «표기만 다름» 대부분은 손 판정과 같았고 진짜 «다른 문항»을 놓친 것은 0 이다.",
        "",
    ]
    (out / f"summary-{args.date}.md").write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
