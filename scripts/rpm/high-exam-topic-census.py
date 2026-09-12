# -*- coding: utf-8 -*-
"""고등 기출이 **어느 소단원을 얼마나** 내나 — 고등 엔진의 유형 우선순위를 정하는 자.

    python scripts/rpm/high-exam-topic-census.py            # → docs/planning/tracks/high-exam-topic-census.md

읽기 전용. 시험지 한글화 색인(`exam_index.db`, 저장소 밖 — `scripts/qa/tc_paths.py` 가
찾는다)의 고등 문항에 붙은 소단원 표기(`questions.topic`)를 우리 교육과정 시드
(`prisma/seed-data/units.ts`)의 소단원 이름에 맞대어 센다.

## 왜 이것이 필요한가

RPM 색인은 「어떤 유형이 **있나**」를 말하고, 이 자는 「학교가 무엇을 **내나**」를 말한다.
둘은 다른 축이다 — 색인에 있는데 기출에 한 번도 안 나온 소단원이 공통수학1 에서
47 중 18 이었다(2026-09-13 실측). 유형을 만드는 순서는 뒤엣것으로 정한다.

## 이 자가 못 보는 것 — 정직하게 적는다

- 시험지 표기와 시드 이름이 **글자가 다르면** 못 맞춘다(「나머지정리와 인수정리」 ↔
  「나머지와 인수정리(1)」). 그래서 못 맞춘 표기를 **빈도순으로 그대로 찍는다** —
  손으로 별칭표를 만들지 않는다(손 목록은 세는 쪽과 고치는 쪽을 같이 눈멀게 한다).
  표를 읽는 사람이 맞추면 된다.
- 문항이 뽑힌 시험지만 센다. 색인의 고등 시험지 3,342편 중 문항 단위로 뽑힌 것은
  일부다(`question_count` 가 0 인 편이 대부분). 그러니 이 표는 «전수»가 아니라 «표본»이고,
  분모(편수·문항수)를 표 머리에 같이 찍는다.
- 과목 표기가 두 벌이다 — 옛 이름(수상·수하)과 새 이름(공수1·공수2)이 섞여 있다.
  둘을 한 과목으로 합쳐 센다(`SUBJECT_MAP`).
"""

import io
import os
import re
import sqlite3
import sys
from collections import Counter, OrderedDict

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "qa"))
from tc_paths import exam_index_db  # noqa: E402

UNITS_TS = "prisma/seed-data/units.ts"
OUT = "docs/planning/tracks/high-exam-topic-census.md"

# 시험지 표기 → 우리 시드 과목명. 08-import-ledger §5.1.5 의 표 그대로.
SUBJECT_MAP = {
    "수상": "공통수학1",
    "공수1": "공통수학1",
    "수하": "공통수학2",
    "공수2": "공통수학2",
    "수1": "대수",
    "수2": "미적분1",
    "미적분": "미적분2",
    "확통": "확률과 통계",
    "기하": "기하",
    "기벡": "기하",
}
SUBJECT_ORDER = ["공통수학1", "공통수학2", "대수", "미적분1", "미적분2", "확률과 통계", "기하"]


def norm(s):
    """이름 맞대기용 열쇠 — 공백·구두점·괄호 번호를 뺀다. 「(1)」「(2)」는 같은 열쇠가 된다."""
    return re.sub(r"[\s·,.'’‘\"()\d_-]", "", s)


def seed_sections():
    """과목 → [(대단원, 소단원)] 시드 순서 그대로."""
    src = io.open(UNITS_TS, encoding="utf-8").read()
    out = OrderedDict()
    for m in re.finditer(
        r'grade:\s*"([^"]+)",\s*chapter:\s*"([^"]+)",\s*section:\s*"([^"]+)"', src
    ):
        g, ch, sec = m.groups()
        if g in SUBJECT_ORDER:
            out.setdefault(g, []).append((ch, sec))
    if not out:
        raise SystemExit(f"{UNITS_TS} 에서 고등 소단원을 하나도 못 읽었다 — 정규식을 확인하라")
    return out


def main():
    con = sqlite3.connect(exam_index_db())
    cur = con.cursor()
    seeds = seed_sections()

    # 과목별 분모
    exams = Counter()
    exams_with_q = Counter()
    questions = Counter()
    topics = {g: Counter() for g in SUBJECT_ORDER}
    for subj, qc in cur.execute(
        "select subject, question_count from exams where level='고'"
    ):
        g = SUBJECT_MAP.get(subj or "")
        if not g:
            continue
        exams[g] += 1
        if qc:
            exams_with_q[g] += 1
    for subj, topic in cur.execute(
        "select e.subject, q.topic from questions q join exams e on e.id=q.exam_id"
        " where e.level='고'"
    ):
        g = SUBJECT_MAP.get(subj or "")
        if not g:
            continue
        questions[g] += 1
        if topic:
            topics[g][topic.strip()] += 1

    lines = []
    lines.append("# 고등 기출 소단원 빈도 (자동 생성 — 손으로 고치지 말 것)\n")
    lines.append("`python scripts/rpm/high-exam-topic-census.py` 가 만든다. 근거는 시험지 한글화")
    lines.append("색인 `exam_index.db`(저장소 밖)의 고등 문항 `topic` 표기다.\n")
    lines.append("⚠️ **표본이다.** 색인의 고등 시험지 중 문항 단위로 뽑힌 편만 센다 — 분모를 과목마다")
    lines.append("적었다. 그리고 표기가 시드 이름과 글자가 다르면 못 맞추므로 «맞추지 못한 표기»를")
    lines.append("빈도순으로 같이 찍는다. 별칭표는 두지 않는다(추출기 머리말).\n")

    summary = []
    for g in SUBJECT_ORDER:
        secs = seeds.get(g, [])
        tc = topics[g]
        by_key = {}
        for ch, sec in secs:
            by_key.setdefault(norm(sec), []).append((ch, sec))
        matched = Counter()
        unmatched = Counter()
        for t, n in tc.items():
            k = norm(t)
            if k in by_key:
                matched[k] += n
            else:
                unmatched[t] += n
        tot = sum(tc.values())
        hit = sum(matched.values())
        never = [sec for k, lst in by_key.items() if k not in matched for _, sec in lst]

        lines.append(f"\n## {g} — 시험지 {exams[g]}편(문항 뽑힌 편 {exams_with_q[g]}) · 문항 {questions[g]}"
                     f" · 소단원 표기 있는 문항 {tot} · 시드 이름과 맞춘 것 {hit}"
                     f"({(hit / tot * 100) if tot else 0:.0f}%) · 기출에 한 번도 안 나온 시드 소단원 {len(never)}/{len(secs)}\n")
        summary.append((g, exams[g], questions[g], tot, hit, len(never), len(secs)))

        lines.append("| 대단원 | 소단원 (시드) | 기출 문항 |")
        lines.append("|---|---|---:|")
        seen = set()
        for ch, sec in secs:
            k = norm(sec)
            n = matched.get(k, 0)
            if k in seen:
                # (1)(2) 로 갈린 소단원은 같은 열쇠 — 첫 줄에만 수를 적고 나머지는 「〃」
                lines.append(f"| {ch} | {sec} | 〃 |")
                continue
            seen.add(k)
            lines.append(f"| {ch} | {sec} | {n} |")

        if unmatched:
            lines.append(f"\n**맞추지 못한 표기** (빈도순, 상위 30 / 전체 {len(unmatched)}종 · {sum(unmatched.values())}문항):\n")
            for t, n in unmatched.most_common(30):
                lines.append(f"- {t} — {n}")

    lines.insert(6, "\n| 과목 | 시험지 | 문항 | 표기 있음 | 맞춤 | 안 나온 시드 소단원 |")
    lines.insert(7, "|---|---:|---:|---:|---:|---:|")
    for i, (g, ex, q, tot, hit, nv, ns) in enumerate(summary):
        lines.insert(8 + i, f"| {g} | {ex} | {q} | {tot} | {hit} | {nv}/{ns} |")

    with io.open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    for g, ex, q, tot, hit, nv, ns in summary:
        print(f"{g}: 시험지 {ex} · 문항 {q} · 표기 {tot} · 맞춤 {hit} · 안 나온 소단원 {nv}/{ns}")
    print(f"→ {OUT}")


if __name__ == "__main__":
    main()
