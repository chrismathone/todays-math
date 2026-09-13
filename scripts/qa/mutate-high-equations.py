# -*- coding: utf-8 -*-
"""물결 1 `h1-equation` — 「여러 가지 방정식」(h1Equations.ts)의 **가드가 정말 무는가** — 변이 시험.

    python scripts/qa/mutate-high-equations.py            # 전량
    python scripts/qa/mutate-high-equations.py --list
    python scripts/qa/mutate-high-equations.py "조사"      # 이름 조각으로 하나만

판정 순서·원복·미커밋 거부·겨눈 시험 대조는 `mutate-high-quadfunc.py` 의 `run` 을 **모듈째 import**
해서 그대로 쓴다(두 벌 두지 않는다). 여기에는 대상·시험·변이 목록만 둔다.
"""
import importlib.util
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location(
    "mutate_high_quadfunc", os.path.join(HERE, "mutate-high-quadfunc.py")
)
_base = importlib.util.module_from_spec(_spec)  # type: ignore[arg-type]
_spec.loader.exec_module(_base)  # type: ignore[union-attr]

TARGET = "src/lib/high/h1Equations.ts"
MINOR = "여러 가지 방정식"
TESTS = [
    "src/__tests__/unit/highEquations.test.ts",
    "src/__tests__/unit/highRegistry.test.ts",
]

# (이름, 앵커, 바꿔 넣을 것, 빨개져야 할 시험 제목 조각)
MUTS = [
    (
        "05 대표 — 중근의 두 경우 중 «이차식이 x=r 을 근으로» 쪽을 빠뜨림",
        "      const sum = a1 + a2 + a3;",
        "      const sum = a2 + a3;",
        _base.VERIFY,
    ),
    (
        "08 기본 — 나머지 두 근의 합에서 켤레를 안 씀(복소수 정답)",
        "      const ans = surdTex(surd(p + w, -sg, -s));",
        "      const ans = surdTex(surd(p + w, sg, -s));",
        _base.VERIFY,
    ),
    (
        "12 심화하 — |a-b| 의 최댓값을 최솟값으로",
        "    const ans = Math.max(...reals.map((d) => Math.sqrt(d)));",
        "    const ans = Math.min(...reals.map((d) => Math.sqrt(d)));",
        _base.VERIFY,
    ),
    (
        "17 대표 — 자연수 해를 셀 때 음의 약수 짝을 버림",
        "        ([d, e]) => p + d >= 1 && qv + e >= 1,",
        "        ([d, e]) => d > 0 && e > 0 && p + d >= 1 && qv + e >= 1,",
        _base.VERIFY,
    ),
    (
        # 답은 facts(t₁, t₂)로 맞게 나오고 **발문의 사차식만** 딴 식이 된다.
        "02 대표 — 발문 사차식의 상수항을 딴 수로",
        "      const Y = `(${inner})^{2}${termIf(A, `(${inner})`)}${plusConst(B)}`;",
        "      const Y = `(${inner})^{2}${termIf(A, `(${inner})`)}${plusConst(B + 1)}`;",
        _base.SHOWN,
    ),
    (
        "11 대표 — y 뒤 조사를 손으로 «은»",
        '이므로 $y$${eun("y")} 정수가 아니다.',
        "이므로 $y$은 정수가 아니다.",
        _base.JOSA,
    ),
    (
        # 2026-09-13 리드가 고친 «분수는 분자를 읽는다» 가 이 모듈에서도 살아 있나.
        "17 심화하 — 분수 1/n 뒤 조사를 분모 끝소리로 «를»",
        "${eul(rhs)} 만족시키는",
        "를 만족시키는",
        _base.JOSA,
    ),
    (
        "02 난이도 — 대표문제 꼴을 기본에서 뺌",
        '        difficulty: "기본",\n        facts: { mode, p, t1, t2, ask: ask === "합" ? 0 : 1 },',
        '        difficulty: "응용",\n        facts: { mode, p, t1, t2, ask: ask === "합" ? 0 : 1 },',
        _base.TIER,
    ),
]

if __name__ == "__main__":
    raise SystemExit(_base.run(TARGET, MINOR, TESTS, MUTS, sys.argv[1:]))
