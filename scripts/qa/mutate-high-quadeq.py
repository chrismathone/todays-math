# -*- coding: utf-8 -*-
"""고등 물결 1 「이차방정식」 모듈의 **가드가 정말 무는가** — 변이 시험. (세션 h1-complex)

    python scripts/qa/mutate-high-quadeq.py            # 전량
    python scripts/qa/mutate-high-quadeq.py --list
    python scripts/qa/mutate-high-quadeq.py "칸"        # 이름 조각으로 하나만

판정 규칙·실행기·프로브는 `mutate-high-complex.py` 의 `main` 을 **모듈째** 불러 쓴다 — 두 벌이 되면
한쪽만 낡는다. 여기에는 변이 목록만 있다.

⚠️ 복소수 판과 **동시에 돌리지 말 것** — 두 하네스가 서로의 변이를 음성 대조에서 보게 된다.
"""
import importlib.util
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location(
    "mutate_high_complex", os.path.join(HERE, "mutate-high-complex.py")
)
base = importlib.util.module_from_spec(_spec)  # type: ignore[arg-type]
_spec.loader.exec_module(base)  # type: ignore[union-attr]

QUAD = "src/lib/high/h1QuadEq.ts"

MUTS = [
    (
        # 근과 계수의 관계 공식에서 (α+β) 를 한 번 빠뜨림 — 시험은 근을 근의 공식으로 구해
        # α³+β³ 를 직접 계산하므로 같이 틀릴 수 없다.
        "이차방정식 08 대표 — α³+β³ 에서 (α+β) 를 빠뜨림",
        QUAD,
        "            S ** 3 - 3 * P * S,",
        "            S ** 3 - 3 * P,",
        base.VALUE,
    ),
    (
        # 발문의 우변만 바꾸면 방정식이 달라진다 — 정답(facts 의 A, B, C 로 푼 근)은 그대로라
        # 값 검산은 초록이고 **지면 대조**(x=0,±1 로 계수 역산)만 문다.
        "이차방정식 01 대표 — 발문 우변의 상수항 부호",
        QUAD,
        "      const rhsP = [lhsP[0]! - Cc, lhsP[1]! - B, 1 - A];",
        "      const rhsP = [lhsP[0]! + Cc, lhsP[1]! - B, 1 - A];",
        base.SHOWN,
    ),
    (
        # 06 의 표는 「중 2」 뿐이다 — 심화하 칸을 내면 등록부 공통 시험이 막아야 한다.
        "이차방정식 06 꼴 1 — 표가 허락하지 않는 칸(심화하)",
        QUAD,
        '      difficulty: "응용",\n      facts: { mode, p, q: qv, r, imag: imag ? 1 : 0 },',
        '      difficulty: "심화하",\n      facts: { mode, p, q: qv, r, imag: imag ? 1 : 0 },',
        base.TIER,
    ),
]

if __name__ == "__main__":
    raise SystemExit(base.main(MUTS, sys.argv[1:]))
