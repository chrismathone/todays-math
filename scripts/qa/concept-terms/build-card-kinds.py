"""탐험 카드 230장의 갈래 결론 → docs/reference/concept-terms/card-kinds.json (트랙 coverage, 2026-09-28).

원천:
  - 옆 트랙 concept-context 의 갈래 초안 TSV(카드 230장 · 초안 갈래 · 애매 · 메모 · 문장 모양) — 저장소 밖(리드 scratchpad).
    필요한 칸은 결과 JSON 에 그대로 옮겨 적는다(우리 제품 글이라 저장소에 둬도 된다).
  - coverage-matches.json(이 트랙) — 카드마다 짝이 된 교재 용어의 갈래.
  - DECISIONS(아래) — 초안 «애매» 26장 + 초안과 교재 쪽 갈래가 다른 13장(합 39장)을 Claude · codex · grok 세 답(각자 따로, 같은 브리프)으로 정한 결론.
갈래 이름은 일곱(정의 · 성질 · 공식 · 방법 · 법칙 · 정리 · 단위) 그대로 — 세 답 일치. 교재 추출용 «기호» · «기타»는 학생 딱지로 쓰지 않는다.

실행: python scripts/qa/concept-terms/build-card-kinds.py --cards <카드.json> --draft <concept-context-kinds-draft.tsv> [--check]
"""

import argparse
import collections
import csv
import json
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
OUT = os.path.join(ROOT, "docs", "reference", "concept-terms", "card-kinds.json")
MATCHES = os.path.join(ROOT, "docs", "reference", "concept-terms", "coverage-matches.json")
KINDS = ["정의", "성질", "공식", "방법", "법칙", "정리", "단위"]

# 가르는 규칙 — 세 답을 합친 것(coverage.md §8.3).
RULES = [
    "0 딱지는 학생이 조립하는 빈칸 쪽을 따른다(세 답 일치). 뜻 뒤에 사실을 덧붙여 빈칸이 사실 쪽에만 있으면, 문장을 보정해 빈칸을 뜻 쪽으로 옮기고 딱지는 정의로 둔다",
    "정의 — 카드 이름(낱말 · 기호)의 뜻을 빈칸이 묻는다. «~는 것»으로 끝나며 낱말의 뜻을 세우면 계산 이름이어도 정의(받아올림 · 반올림 · 밀기 · 근호)",
    "성질 — 이미 뜻이 있는 대상에 늘 성립하는 사실(관계 · 조건)을 빈칸이 묻는다. 합동 조건 · 닮은 도형의 넓이비도 여기",
    "공식 — 빈칸이 값을 구하는 식(넓이 · 부피 · 비교하는 양 · 일어나지 않을 확률)",
    "방법 — 문장이 «~방법»으로 끝나거나 계산 · 풀이의 차례를 시킨다(대입법 · 가감법 · 분수의 곱셈 · 혼합 계산의 순서). 교재의 계산 상자(기타)도 여기",
    "법칙 — 이름에 «법칙»이 있거나 이름 붙은 연산 법칙(지수 · 분배 · 경우의 수의 합 · 곱)",
    "정리 — 이름에 «정리»가 있거나 교재가 정리라 부르는 것만(지금 피타고라스 하나). 교재가 정리라 부르지 않는 사실(삼각형의 세 각의 합)은 성질",
    "단위 — 빈칸이 단위 사이의 관계(1cm=10mm · 1L=1000mL)",
]

CL, CX, GR = "claude", "codex", "grok"


def v(c, x, g):
    return {CL: c, CX: x, GR: g}


# id → (결론, 세 답, 까닭 · 우리 말, 조건)
DECISIONS: dict = {
    "g3-carry": ("정의", v("정의", "정의", "방법"), "빈칸이 받아올림이라는 낱말의 뜻(10을 윗자리 1로) — grok 은 계산 걸음으로 봐 방법", ""),
    "g3-borrow": ("정의", v("정의", "정의", "방법"), "받아올림과 같은 결", ""),
    "g3-check-division": ("성질", v("성질", "성질", "성질"), "빈칸이 늘 성립하는 검산 관계(곱 · 나머지)", ""),
    "g3-decimal": ("정의", v("정의", "정의", "정의"), "그 자리가 무엇을 나타내는지 — 교재 «기타»는 정의 상자가 없다는 추출 갈래일 뿐", ""),
    "g3-length": ("단위", v("단위", "단위", "단위"), "빈칸이 1cm=10mm", ""),
    "g3-kilometer": ("단위", v("단위", "단위", "단위"), "이름은 낱말이지만 빈칸이 1km=1000m", ""),
    "g3-time": ("단위", v("단위", "단위", "단위"), "빈칸이 1분=60초", ""),
    "g3-capacity": ("단위", v("정의", "단위", "단위"), "빈칸 둘이 1L · 1000mL(환산) — 뜻(그릇에 담을 수 있는 양)은 빈칸 밖. codex 는 이름을 «들이 단위»로 바꾸자고도 함(1표)", ""),
    "g3-mass": ("단위", v("단위", "단위", "단위"), "빈칸이 1kg=1000g", ""),
    "g4-estimate-quotient": ("방법", v("방법", "방법", "방법"), "«~하기» — 빈칸이 어림하는 절차", ""),
    "g4-triangle-sum": ("성질", v("성질", "성질", "정리"), "교재 원문이 «정리»라 부르지 않는다(4-1 · 1-2 확인 — 트랙 딱지일 뿐). grok 은 교재가 정리라 부른다는 전제로 정리", ""),
    "g4-slide": ("정의", v("정의", "정의", "정의"), "이동의 이름과 뜻", ""),
    "g4-flip": ("정의", v("정의", "정의", "정의"), "이동의 이름과 뜻", ""),
    "g4-turn": ("정의", v("정의", "정의", "정의"), "이동의 이름과 뜻", ""),
    "g4-number-rule": ("방법", v("방법", "방법", "방법"), "빈칸이 관계를 찾아 다음 수를 예측하는 절차(codex 는 이름을 «수 배열에서 규칙 찾기»로 제안 — 1표)", ""),
    "g5-operation-order": ("방법", v("방법", "방법", "방법"), "계산 차례의 약속 — 이름 붙은 법칙이 아니다", ""),
    "g5-fraction-multiply": ("방법", v("방법", "방법", "방법"), "계산 절차", ""),
    "g5-decimal-multiply": ("방법", v("방법", "방법", "방법"), "계산 절차", ""),
    "g5-round": ("정의", v("정의", "정의", "정의"), "교재도 반올림을 뜻매김한다 — 빈칸이 그 뜻(5 이상 · 5 미만)", ""),
    "g5-round-up": ("정의", v("정의", "정의", "정의"), "두 낱말의 뜻을 가른다", ""),
    "g5-rule-expression": ("방법", v("방법", "방법", "방법"), "«나타내기» — 대응 규칙을 식으로 적는 절차", ""),
    "g5-perimeter": ("정의", v("정의", "정의", "정의"), "첫 빈칸이 둘레는 길이라는 뜻 — 구하는 법은 덧붙임", ""),
    "g6-fraction-divide": ("방법", v("방법", "방법", "방법"), "계산 카드끼리 맞춤 — 성질로도 읽히나 이름이 계산", ""),
    "g6-rate-amount": ("공식", v("공식", "공식", "공식"), "빈칸이 기준량 × 비율", ""),
    "g6-part-of-ratio": ("공식", v("공식", "공식", "공식"), "빈칸이 a/(a+b) · b/(a+b)", ""),
    "g6-cone-sphere": ("정의", v("정의", "정의", "정의"), "두 입체의 뜻 — 보정 표가 구의 뜻을 채운다", ""),
    "g7-vertical-angle": ("정의", v("정의", "정의", "정의"), "보정 표가 빈칸을 뜻(마주 보는 각) 쪽으로 옮긴다 — 크기가 같다는 성질은 보기 · 함정에",
                          "보정 표(card-sentence-fixes.json)와 함께 — 지금 문장은 빈칸이 성질 쪽이라 보정 전에는 성질"),
    "g7-sss": ("성질", v("성질", "성질", "성질"), "합동 조건 — 교재도 성질", ""),
    "g8-substitution": ("방법", v("정의", "방법", "방법"), "문장이 «~푸는 방법»이고 빈칸이 넣어 푸는 동작 — 교재는 이름을 뜻매김하지만 학생 딱지는 방법(Claude 는 받아올림·반올림과 같이 정의로 봄)", ""),
    "g8-elimination": ("방법", v("정의", "방법", "방법"), "대입법과 같은 결", ""),
    "g8-common-solution": ("방법", v("방법", "방법", "방법"), "모든 식에 넣어 보는 절차", ""),
    "g8-similarity-area": ("성질", v("성질", "성질", "공식"), "닮음비와 넓이비 · 부피비의 관계 — 교재도 성질(grok 은 계산 식으로 봐 공식)", ""),
    "g8-complement": ("공식", v("공식", "공식", "공식"), "빈칸이 1에서 빼는 식 — 교재도 공식", ""),
    "g9-root-symbol": ("정의", v("정의", "정의", "정의"), "기호 √a 의 뜻 — 학생 딱지에 «기호»는 없다", ""),
    "g9-polynomial-multiply": ("방법", v("방법", "방법", "방법"), "빈칸이 분배 · 동류항 정리라는 절차", ""),
    "g9-common-factor": ("방법", v("방법", "방법", "방법"), "«묶기» — 인수분해 절차", ""),
    "g9-vertex": ("정의", v("정의", "정의", "정의"), "보정 표가 포물선과 축이 만나는 점으로 뜻을 세운다 — 교재도 정의",
                  "보정 표와 함께 — 지금 문장은 빈칸 둘이 좌표 · 위치(성질) 쪽"),
    "g9-axis": ("성질", v("성질", "성질", "정의"),
                "채택된 보정도 «대칭축은 직선 x=p · y축에 평행»으로 축의 자리 · 방향을 묻는다(성질). Claude 답은 «뜻을 세우게 보정하면 정의, 아니면 성질» — 채택된 보정이 뜻을 세우지 않아 성질로 셈", ""),
    "g9-inscribed-angle": ("정의", v("정의", "정의", "정의"), "보정 표가 둘째 빈칸을 뜻(현) 쪽으로 옮긴다 — 중심각의 절반은 보기 · 함정에",
                           "보정 표와 함께 — 지금 문장은 둘째 빈칸이 성질 쪽"),
}

# 둘째 협의(리드 요청 2026-09-28 · coverage.md §9 ④) — 첫 협의 목록 밖이던 두 장. 갈래는 초안 그대로 정의, 보정과 함께.
SECOND_ROUND: dict = {
    "g7-origin": ("정의", v("정의", "정의", "정의"), "보정 표가 빈칸 둘을 뜻(두 좌표축이 만나는 점) 쪽으로 옮긴다 — 좌표 (0,0)은 보기 · 함정에",
                  "보정 표와 함께 — 지금 문장은 빈칸 둘이 좌표 사실 쪽"),
    "g9-double-root": ("정의", v("정의", "정의", "정의"), "보정 표가 빈칸 둘을 뜻(서로 같은 두 근 · 그 근) 쪽으로 옮긴다 — 완전제곱식 꼴 · 해 한 개는 보기 · 함정 · 해설에",
                       "보정 표와 함께 — 지금 문장은 빈칸 둘이 해의 개수 · 값 쪽"),
}

# 협의 목록 밖이지만 빈칸 둘이 모두 덧붙인 사실 쪽인 카드(coverage.md §4.4) — 초안 갈래를 두고 표시만 한다.
ASSEMBLY_NOTE = {
    "g7-origin": "지금 빈칸 둘((0,0) · 0)이 좌표 사실 쪽 — 보정 표가 뜻 쪽으로 옮긴다(둘째 협의)",
    "g9-double-root": "지금 빈칸 둘(한 개 · a)이 해의 개수 · 값 쪽 — 보정 표가 뜻 쪽으로 옮긴다(둘째 협의)",
    "g3-right-angle": "지금 빈칸(90 · 도)은 각도 쪽 — 보정 표가 뜻 쪽으로 옮긴다",
    "g3-capacity": "빈칸이 환산 쪽이라 딱지를 단위로 정했다",
    "g7-vertical-angle": "보정 표가 빈칸을 뜻 쪽으로 옮긴다",
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cards", required=True)
    ap.add_argument("--draft", required=True)
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    units = json.load(open(a.cards, encoding="utf-8"))
    cards = [dict(c, grade=u["grade"], unit=u["id"], unitTitle=u["title"]) for u in units for c in u["cards"]]
    assert len(cards) == 230
    draft = {x["id"]: x for x in csv.DictReader(open(a.draft, encoding="utf-8"), delimiter="\t")}
    assert set(draft) == {c["id"] for c in cards}, "초안 id 가 카드와 다르다"
    matches = json.load(open(MATCHES, encoding="utf-8"))
    by_card = collections.defaultdict(list)
    for r in matches["rows"]:
        if r["match"] in ("exact", "alias"):
            for cid in r["cards"]:
                by_card[cid].append(r)
    unknown = (set(DECISIONS) | set(SECOND_ROUND) | set(ASSEMBLY_NOTE)) - set(draft)
    assert not set(DECISIONS) & set(SECOND_ROUND)
    assert not unknown, unknown
    # 39장 = 초안 애매 26 + 초안과 교재 쪽 갈래가 다른 13 — DECISIONS 가 빠짐없이 덮는지 본다.
    amb = {k for k, d in draft.items() if d["애매"]}
    diff = set()
    for k, d in draft.items():
        tk = [r["kind"] for r in by_card[k] if r["match"] == "exact"] or [r["kind"] for r in by_card[k]]
        if tk and d["갈래초안"] not in tk:
            diff.add(k)
    assert amb | diff == set(DECISIONS), sorted((amb | diff) ^ set(DECISIONS))
    out = []
    for c in cards:
        d = draft[c["id"]]
        tk = [dict(book=r["book"], key=r["key"], term=r["term"], kind=r["kind"], match=r["match"]) for r in by_card[c["id"]]]
        if c["id"] in DECISIONS or c["id"] in SECOND_ROUND:
            kind, votes, why, cond = DECISIONS.get(c["id"]) or SECOND_ROUND[c["id"]]
            tally = collections.Counter(votes.values())
            assert tally[kind] >= 2, (c["id"], votes)
            how = "3자 일치" if tally[kind] == 3 else "2:1(" + " · ".join(k for k, x in votes.items() if x == kind) + ")"
        else:
            kind, votes, why, cond, how = d["갈래초안"], None, "", "", "초안 유지"
        assert kind in KINDS, (c["id"], kind)
        out.append(dict(
            id=c["id"], name=c["name"], grade=c["grade"], unit=c["unit"], unitTitle=c["unitTitle"],
            kind=kind, decidedBy=how, votes=votes, why=why, condition=cond,
            assemblyNote=ASSEMBLY_NOTE.get(c["id"], ""),
            draftKind=d["갈래초안"], draftAmbiguous=bool(d["애매"]), draftNote=d["메모"], shape=d["문장모양"],
            textbookKinds=tk, changedFromDraft=kind != d["갈래초안"],
        ))
    counts = collections.Counter(x["kind"] for x in out)
    doc = dict(
        generatedBy="scripts/qa/concept-terms/build-card-kinds.py",
        names=KINDS, namesDecision="일곱 그대로 — Claude · codex · grok 일치. 교재 추출용 «기호» · «기타»는 학생 딱지로 쓰지 않는다",
        rules=RULES,
        counts={k: counts.get(k, 0) for k in KINDS},
        draftCounts={k: sum(1 for d in draft.values() if d["갈래초안"] == k) for k in KINDS},
        decided=len(DECISIONS) + len(SECOND_ROUND),
        secondRound=sorted(SECOND_ROUND),
        decidedUnanimous=sum(1 for x in out if x["decidedBy"] == "3자 일치"),
        changedFromDraft=[x["id"] for x in out if x["changedFromDraft"]],
        conditional=[x["id"] for x in out if x["condition"]],
        note="교재 문장은 저장소 밖 — textbookKinds 는 짝이 된 교재 용어의 이름 · 갈래 · 키만.",
        cards=out,
    )
    s = json.dumps(doc, ensure_ascii=False, indent=1) + "\n"
    if a.check:
        same = os.path.exists(OUT) and open(OUT, encoding="utf-8").read() == s
        print("같음" if same else "다름")
        sys.exit(0 if same else 1)
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(s)
    print(json.dumps(doc["counts"], ensure_ascii=False), "| 결정", doc["decided"], "· 3자 일치", doc["decidedUnanimous"],
          "| 초안과 다름", doc["changedFromDraft"], "| 조건부", doc["conditional"])


if __name__ == "__main__":
    main()
