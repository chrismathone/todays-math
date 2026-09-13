# -*- coding: utf-8 -*-
"""고등 공통수학1 「조합」(`h1Comb.ts`)의 **가드가 정말 무는가** — 변이 시험.

    python scripts/qa/mutate-high-comb.py            # 전량
    python scripts/qa/mutate-high-comb.py --list
    python scripts/qa/mutate-high-comb.py "대진표"    # 이름 조각으로 하나만

실행기(음성 대조 → 앵커 하나 → 파일 바뀜 → 산출물 바뀜 → 겨눈 시험이 빨강)는 같은 세션의
`mutate-high-perm.py` 의 `run_cli` 를 **모듈째 불러** 쓴다 — 두 벌 두지 않는다.
⚠️ `mutate-high-perm.py` 와 **동시에** 돌리지 말 것(`highRegistry` 가 두 모듈을 다 읽는다).
"""
import importlib.util
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location(
    "mutate_high_perm", os.path.join(HERE, "mutate-high-perm.py")
)
H = importlib.util.module_from_spec(_spec)  # type: ignore[arg-type]
_spec.loader.exec_module(H)  # type: ignore[union-attr]

MINOR = "조합"
TESTS = [
    "src/__tests__/unit/highComb.test.ts",
    "src/__tests__/unit/highRegistry.test.ts",
]
COMB = "src/lib/high/h1Comb.ts"
PROOF = "답 식이 줄의 등식을 채우고"  # highComb — 02 증명의 빈칸

# (이름, 파일, 앵커, 바꿔 넣을 것, 물어야 하는 시험 이름 조각)
MUTS = [
    (
        "05 한 명만 — 「A만」과 「B만」 두 경우를 하나로 셈",
        COMB,
        "    const ans = 2 * x;",
        "    const ans = x;",
        H.VALUE,
    ),
    (
        # 11 분할 · 12 분배 · 13 대진표가 같이 쓰는 자리 — 같은 크기 묶음의 순서만 바꾼 나눔을 겹쳐 센다.
        "11~13 나누기 — 같은 크기 묶음을 k! 로 나누지 않음",
        COMB,
        "  for (const m of divs) value /= fact(m);",
        "  for (const m of divs) value /= 1;",
        H.VALUE,
    ),
    (
        # 정답이 식인 유형 — 값 검산이 아니라 「줄의 등식을 채우는가」가 물어야 한다.
        "02 증명 — ₙCₙ₋ᵣ 빈칸의 답을 (n-r)! 로",
        COMB,
        '    answers: ["r!"],',
        '    answers: ["(n-r)!"],',
        PROOF,
    ),
    (
        "13 대진표 — 3팀 조에서 부전승 팀을 정하는 가짓수를 1로",
        COMB,
        "const GROUP_WAYS: Readonly<Record<number, number>> = { 2: 1, 3: 3, 4: 3 };",
        "const GROUP_WAYS: Readonly<Record<number, number>> = { 2: 1, 3: 1, 4: 3 };",
        H.VALUE,
    ),
    (
        # 답은 facts 로 세므로 그대로다 — 발문 대조(SHOWN)만 이 자리를 본다.
        "03 발문 — 남자 수를 하나 크게 찍음(답은 그대로)",
        COMB,
        "content: `남자 $${m}$명, 여자 $${w}$명 중에서 $${k}$명을 뽑을 때",
        "content: `남자 $${m + 1}$명, 여자 $${w}$명 중에서 $${k}$명을 뽑을 때",
        H.SHOWN,
    ),
]

if __name__ == "__main__":
    raise SystemExit(H.run_cli(MINOR, TESTS, MUTS, "comb", sys.argv[1:]))
