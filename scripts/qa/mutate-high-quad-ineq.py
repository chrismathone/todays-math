# -*- coding: utf-8 -*-
"""고등 공통수학1 「이차부등식과 연립이차부등식」(h1QuadIneq)의 **가드가 정말 무는가** — 변이 시험.

    python scripts/qa/mutate-high-quad-ineq.py            # 전량
    python scripts/qa/mutate-high-quad-ineq.py --list
    python scripts/qa/mutate-high-quad-ineq.py "판별식"    # 이름 조각으로 하나만

## 하네스를 옮겨 적지 않는다

판정 절차(㉠ 음성 대조 → ⑴ 앵커 1개 → ⑵ 파일이 바뀌었나 → ⑶ 산출물이 바뀌었나 → ⑷ 실패한 시험
이름)는 본보기 `mutate-high-identity.py` 에 **한 벌** 있다. 여기서는 그 모듈을 불러와 변이 목록과
시험 목록만 갈아 끼운다(`mutate-high-lin-ineq.py` 와 같은 모양). 원복도 그쪽이 **시작할 때 읽어 둔
바이트**로 한다.

⚠️ 연립일차 하네스와 **동시에 돌리지 않는다** — 둘 다 `highRegistry.test.ts` 를 돌리는데, 등록부는
두 모듈을 다 부르므로 한쪽 변이가 다른 쪽 음성 대조를 빨갛게 만든다.

## 변이가 겨누는 자리

  · 18 기본 — 판별식의 근(끝점)을 어긋나게 → 값 검산(판별식을 k 에 그대로 매겨 보는 쪽)이 물어야 한다
  · 18 응용 — 발문 둘째 방정식의 상수만 어긋남(facts·정답은 옛 값) → 방정식 대조(EQUATIONS)
  · 19 기본 — 두 근의 곱 조건 경계의 부호를 거꾸로 → 값 검산(근의 공식으로 근을 직접 구하는 쪽)
  · 19 응용 — 최솟값 4C/B² 를 4C/B 로 → 값 검산(경계 찾기)
  · 20 기본 — 경계의 등호를 뒤바꿈 → 값 검산(정수를 하나하나 대입)
  · 21 심화하 — 경곗값이 0 이 되는 k 의 부호 → 값 검산
  · 조사 — 정수해의 합 뒤 「과/와」를 손으로 → 등록부 조사 가드
"""
import importlib.util
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BASE = os.path.join(ROOT, "scripts", "qa", "mutate-high-identity.py")

QUAD = "src/lib/high/h1QuadIneq.ts"

TESTS = [
    "src/__tests__/unit/highQuadIneq.test.ts",
    "src/__tests__/unit/highRegistry.test.ts",
]

# (이름, 파일, 앵커, 바꿔 넣을 것) — 앵커는 LF 로 적는다(하네스가 파일의 CRLF 를 LF 로 읽는다)
MUTS = [
    (
        "18 기본 — 판별식의 근(아래 끝)을 어긋나게",
        QUAD,
        "      const lo = q(p - 2 * s, 3);\n      const hi = q(p + 2 * s, 3);",
        "      const lo = q(p - 2 * s + 1, 3);\n      const hi = q(p + 2 * s, 3);",
    ),
    (
        "18 응용 — 발문 둘째 방정식의 상수만 어긋남(facts 는 옛 값)",
        QUAD,
        "    const eq2 = `x^{2}-${bx}+a+b${plusConst(t)}=0`;",
        "    const eq2 = `x^{2}-${bx}+a+b${plusConst(t + 1)}=0`;",
    ),
    (
        # ⚠️ 판별식 쪽은 때리지 못했다. 조건을 통째로 빼도(`ivsMeet([sumRay], [prodRay])`),
        #    등호만 빼도(D≥0 → D>0) 정답의 두 끝이 다 열린 구간이 되어 등호 뒤집기 오답들이 서로
        #    겹치고, 오답 넷을 못 지어 생성기가 **재시도 초과로 죽는다** — 프로브가 안 돌아 «판정
        #    불가» 가 두 번 났다. 그래서 생성은 되고 뜻만 바뀌는 자리, 곧 두 근의 곱 조건의 경계
        #    부호(a ≷ −r/σ → a ≷ r/σ)를 때린다.
        "19 기본 — 두 근의 곱 조건 경계의 부호를 거꾸로",
        QUAD,
        '      const prodRay = rayIv(sigma > 0 ? ">" : "<", q(-r, sigma));',
        '      const prodRay = rayIv(sigma > 0 ? ">" : "<", q(r, sigma));',
    ),
    (
        "19 응용 — 최솟값 4C/B² 를 4C/B 로",
        QUAD,
        "      const K = q(4 * C, B * B);",
        "      const K = q(4 * C, B);",
    ),
    (
        "20 기본 — 경계의 등호를 뒤바꿈",
        QUAD,
        "      const ans = band(p + N, p + N + 1, true, false);",
        "      const ans = band(p + N, p + N + 1, false, true);",
    ),
    (
        "21 심화하 — 경곗값이 0 이 되는 k 의 부호를 거꾸로",
        QUAD,
        "    const kz = (e: number): Q => q(-(b * e + c), e * e + 1);",
        "    const kz = (e: number): Q => q(b * e + c, e * e + 1);",
    ),
    (
        "조사 — 정수해의 합 뒤 과/와 를 손으로",
        QUAD,
        "${gwa(String(S))} 같지 않다",
        "과 같지 않다",
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
