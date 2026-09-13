# -*- coding: utf-8 -*-
"""고등 물결 1 「인수분해」(`h1Factor.ts`)의 **가드가 정말 무는가** — 변이 시험.

    python scripts/qa/mutate-high-factor.py            # 전량
    python scripts/qa/mutate-high-factor.py --list
    python scripts/qa/mutate-high-factor.py "조사"      # 이름 조각으로 하나만

판정 규칙(㉠ 음성 대조 → ⑴ 앵커 하나 → ⑵ 파일 바뀜 → ⑶ 산출물 바뀜 → ⑷ **겨눈 시험**이 빨강)은
`mutate-high-polyops.py` 의 `run()` 을 **모듈째 import** 해서 쓴다 — 여기에는 변이 목록만 둔다
(판정 규칙이 세 벌이 되면 한쪽만 낡는다, 2026-08-23).

⚠️ 변이는 **예외로 깨지는 자리**를 피했다. 오답 후보를 정답과 겹치게 만드는 변이는 `attempt` 가
재시도를 다 쓰고 던져서 모든 시험이 운다 — 그건 「가드가 문다」가 아니라 「생성기가 멈췄다」다.
"""
import importlib.util
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location(
    "mutate_high_polyops", os.path.join(HERE, "mutate-high-polyops.py")
)
_mod = importlib.util.module_from_spec(_spec)  # type: ignore[arg-type]
_spec.loader.exec_module(_mod)  # type: ignore[union-attr]

MOD = "src/lib/high/h1Factor.ts"
TESTS = ["src/__tests__/unit/highFactor.test.ts", _mod.REGISTRY]
MINOR = "인수분해"

# (이름, 파일, 앵커, 바꿔 넣을 것, 울어야 할 시험 이름 조각)
MUTS = [
    (
        "01 응용 — 세제곱 합·차 인수의 상수 c 부호",
        MOD,
        "    const c = m * m - sg * m * n + n * n;",
        "    const c = m * m + sg * m * n + n * n;",
        "facts 로 다시 세운 것과 같다",
    ),
    (
        # 답(인수분해한 식)은 그대로 두고 발문의 식만 딴 것으로 — 값 검산은 facts 만 보므로 못 본다.
        "04 기본 — 발문 식의 y 계수를 딴 수로",
        MOD,
        '          [q + s, "x"],\n          [p * s + q * r, "y"],',
        '          [q + s, "x"],\n          [p * s - q * r, "y"],',
        "식·수치를 그대로 보여 준다",
    ),
    (
        "07 기본 — 조건을 넣은 단항식의 부호",
        MOD,
        "      const cf = 4 * a * b;",
        "      const cf = -4 * a * b;",
        "facts 로 다시 세운 것과 같다",
    ),
    (
        "10 기본 — 이등변삼각형 둘레에서 같은 변을 잘못 셈",
        MOD,
        "      const v = 2 * vp + vr;",
        "      const v = vp + 2 * vr;",
        "facts 로 다시 세운 것과 같다",
    ),
    (
        "09 응용 — 제곱의 차 합을 심화하로",
        MOD,
        '        difficulty: "응용",\n        facts: { mode, fam, T },',
        '        difficulty: "심화하",\n        facts: { mode, fam, T },',
        "검은 표가 허락한 것뿐",
    ),
    (
        # p·q·r 문자 벌(끝이 r — 알, ㄹ 받침)과 세제곱 끝(제곱, ㅂ 받침)에서 「를」이 틀린다.
        "05 대표 — 순환식 뒤 을/를을 손으로 «를»",
        MOD,
        "$${cy.E}$${eul(cy.E)} 인수분해하시오.",
        "$${cy.E}$를 인수분해하시오.",
        "조사가 읽기와 맞는다",
    ),
]

if __name__ == "__main__":
    raise SystemExit(_mod.run(MUTS, TESTS, MINOR, "factor", sys.argv[1:]))
