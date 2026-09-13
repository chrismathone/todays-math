# -*- coding: utf-8 -*-
"""고등 공통수학1 「연립일차부등식」(h1LinIneq)의 **가드가 정말 무는가** — 변이 시험.

    python scripts/qa/mutate-high-lin-ineq.py            # 전량
    python scripts/qa/mutate-high-lin-ineq.py --list
    python scripts/qa/mutate-high-lin-ineq.py "정리형"    # 이름 조각으로 하나만

## 하네스를 옮겨 적지 않는다

판정 절차(㉠ 음성 대조 → ⑴ 앵커 1개 → ⑵ 파일이 바뀌었나 → ⑶ 산출물이 바뀌었나 → ⑷ 실패한 시험
이름)는 본보기 `mutate-high-identity.py` 에 **한 벌** 있다. 여기서는 그 모듈을 불러와 변이 목록과
시험 목록만 갈아 끼운다 — 절차가 두 벌이 되면 한쪽만 낡는다(2026-08-23 교훈). 원복도 그쪽이
**시작할 때 읽어 둔 바이트**로 한다.

## 변이가 겨누는 자리

  · 정리형 상수 — 발문과 facts 는 같이 움직이는데 **해(끝점)만 옛 값** → 값 검산이 물어야 한다
  · 정수 세기의 열린 끝 — 경계 정수를 하나 더 센다 → 값 검산
  · 절댓값 정수 개수 공식 — 발문의 N 이 틀린다 → 값 검산(자연수 a 가 하나로 안 정해진다)
  · 범위 답의 방향 — 음수로 나눌 때 부등호를 안 뒤집는다 → 값 검산(조건과 집합이 어긋난다)
  · 조사 — 분모를 없애는 줄의 「을/를」을 손으로 → 등록부 조사 가드
"""
import importlib.util
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BASE = os.path.join(ROOT, "scripts", "qa", "mutate-high-identity.py")

LIN = "src/lib/high/h1LinIneq.ts"

TESTS = [
    "src/__tests__/unit/highLinIneq.test.ts",
    "src/__tests__/unit/highRegistry.test.ts",
]

# (이름, 파일, 앵커, 바꿔 넣을 것) — 앵커는 LF 로 적는다(하네스가 파일의 CRLF 를 LF 로 읽는다)
MUTS = [
    (
        "01 정리형 — 우변 상수를 하나 어긋나게(해는 옛 끝점)",
        LIN,
        "  const c = (m * t.n) / t.d;\n  const R = randomSide(rng, L.a - m, L.b + c);",
        "  const c = (m * t.n) / t.d + 1;\n  const R = randomSide(rng, L.a - m, L.b + c);",
    ),
    (
        "정수 세기 — 열린 아래 끝의 정수를 센다",
        LIN,
        "  let a = qCeil(iv.lo.at);\n  if (!iv.lo.closed && qIsInt(iv.lo.at)) a += 1;\n  let b = qFloor(iv.hi.at);",
        "  let a = qCeil(iv.lo.at);\n  let b = qFloor(iv.hi.at);",
    ),
    (
        "07 심화하 — 정수 개수 공식에서 한 쌍을 빠뜨림",
        LIN,
        "    const N = 2 * (jmax - jmin + 1);",
        "    const N = 2 * (jmax - jmin);",
    ),
    (
        "05 응용 — k 의 부호로 부등호를 안 뒤집음",
        LIN,
        "      const relK = s * m2 > 0 ? base : flipRel(base);",
        "      const relK = base;",
    ),
    (
        "조사 — 분모를 없애는 줄의 을/를 을 손으로",
        LIN,
        "${eul(String(l.clear.by))} 곱하면",
        "을 곱하면",
    ),
]


def load_base():
    spec = importlib.util.spec_from_file_location("mutate_high_identity", BASE)
    mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    for name in ("main", "MUTS", "TESTS"):
        if not hasattr(mod, name):
            raise SystemExit(
                f"mutate-high-identity.py 에 {name} 가 없다 — 하네스를 옮겨 적지 말고 그쪽을 확인하라"
            )
    return mod


if __name__ == "__main__":
    base = load_base()
    base.MUTS = MUTS
    base.TESTS = TESTS
    raise SystemExit(base.main())
