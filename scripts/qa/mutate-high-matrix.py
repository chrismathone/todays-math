# -*- coding: utf-8 -*-
"""고등 물결 1 「행렬」(`h1Matrix.ts`)의 **가드가 정말 무는가** — 변이 시험.

    python scripts/qa/mutate-high-matrix.py            # 전량
    python scripts/qa/mutate-high-matrix.py --list
    python scripts/qa/mutate-high-matrix.py "조사"      # 이름 조각으로 하나만

판정 규칙(㉠ 음성 대조 → ⑴ 앵커 하나 → ⑵ 파일 바뀜 → ⑶ 산출물 바뀜 → ⑷ **겨눈 시험**이 빨강)은
`mutate-high-polyops.py` 의 `run()` 을 **모듈째 import** 해서 쓴다 — 여기에는 변이 목록만 둔다.
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

MOD = "src/lib/high/h1Matrix.ts"
TESTS = ["src/__tests__/unit/highMatrix.test.ts", _mod.REGISTRY]
MINOR = "행렬"

# (이름, 파일, 앵커, 바꿔 넣을 것, 울어야 할 시험 이름 조각)
MUTS = [
    (
        "06 대표 — 근과 계수로 줄인 성분 합의 부호",
        MOD,
        "      const value = s * s + k * p;",
        "      const value = s * s - k * p;",
        "facts 로 다시 세운 것과 같다",
    ),
    (
        # 답(a+b)은 facts 로 지으니 그대로 — 발문의 행렬 성분만 딴 수로. 값 검산은 못 본다.
        "02 대표 — 발문 행렬의 (1, 2) 성분을 딴 수로",
        MOD,
        '        ["x^{2}", g],',
        '        ["x^{2}", g + 1],',
        "행렬·식을 그대로 보여 준다",
    ),
    (
        "05 응용 — 미지의 성분 꼴을 심화하로",
        MOD,
        '      difficulty: "응용",\n      facts: {\n        mode,\n        hr,',
        '      difficulty: "심화하",\n      facts: {\n        mode,\n        hr,',
        "검은 표가 허락한 것뿐",
    ),
    (
        "07 대표 — 문자 X 뒤 을/를을 손으로 «을»",
        MOD,
        'X$${eul("X")} 구하시오. (단, $a$, $b$, $c$, $d$',
        "X$을 구하시오. (단, $a$, $b$, $c$, $d$",
        "조사가 읽기와 맞는다",
    ),
    (
        "11 심화하 — 세 자리 가장 작은 n 을 한 주기 넘겨 셈",
        MOD,
        "      ask === 0 ? Math.ceil(100 / ord) * ord : Math.floor(99 / ord) * ord;",
        "      ask === 0 ? Math.ceil(100 / ord) * ord + ord : Math.floor(99 / ord) * ord;",
        "facts 로 다시 세운 것과 같다",
    ),
]

if __name__ == "__main__":
    raise SystemExit(_mod.run(MUTS, TESTS, MINOR, "matrix", sys.argv[1:]))
