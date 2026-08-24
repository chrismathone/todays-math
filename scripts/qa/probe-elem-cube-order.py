# -*- coding: utf-8 -*-
"""🟢 판정기 — **쌓기나무를 그리는 «순서»가 옳은가** (초6 2-3 공간과 입체).

    python scripts/qa/probe-elem-cube-order.py
    python scripts/qa/probe-elem-cube-order.py --selftest   # 눈금만

## 왜 이 축이 따로 필요한가

2026-08-25 원장님이 화면에서 「꼭 같은 위치에 있는 큐브가 에러난다」고 하셨다.
`_stack_cubes` 의 그리는 순서가 `(y, x, z)` **내림차순**이었다 — y 는 맞았지만
**x·z 가 거꾸로**라 앞의 큐브를 먼저 그리고 뒤의 큐브를 그 위에 덮었다.
지면에서는 **앞쪽 낮은 큐브의 윗면이 옆 높은 기둥의 앞면을 뚫고** 나와
계단 모양으로 파인다. 초6 2-3 여섯 문항 중 **다섯**이 그랬다.

**이 결함은 스스로 신고하지 않는다.** SVG 는 유효하고, 면 개수도 맞고, 도형
치수도 맞다. 「그림이 나오는가」·「면이 몇 개인가」를 세는 자로는 구조적으로 0이다.
가르는 것은 **폴리곤이 나열된 차례**뿐이다.

## 어떻게 재나 — 참을 제품 밖에서 가져온다

카메라는 `View.direction` 이 말하듯 **+x · -y · +z** 쪽에 있다. 그러면 큐브 B 가
A 를 가리는 조건은 **세 축 모두에서 앞**일 때다:

    B.x >= A.x  and  B.y <= A.y  and  B.z >= A.z   (B != A)

이 관계는 `paint_order` 의 정렬 키와 **무관하게** 정의된다 — 제품 상수로 정답을
정하지 않는다(2026-08-18 「지표의 «참»이 제품에서 오면 성적이 오른다」). 판정은
「가려지는 것이 **먼저** 그려졌는가」 하나다.

⚠️ 순서 규칙은 `scripts/figure/elem_advanced.py` 의 `paint_order` **한 곳**에 있고
   이 판정기는 그것을 **그대로 부른다**. 규칙을 옮겨 적지 않으므로 동어반복이
   아니다 — 참은 위의 가림 관계에서 오고, 재는 대상은 제품 함수다.

⚠️ 눈금에 **양성·음성이 둘 다** 있다. 양성은 옛 정렬 키를 그대로 되살려 「이
   판정기가 «아니오»를 낼 수 있는가」를 회차마다 증명한다 — 그것이 없으면 0은
   「깨끗」과 「못 셈」을 안 가른다(2026-08-23 「도장은 초록을 못 낸다」).

종료 코드: 0 깨끗 · 1 결함 · 2 울타리(엔진을 못 읽음)
"""
from __future__ import annotations

import io
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# 이 파일은 `<저장소>/scripts/qa/` 에 있다 — 저장소 뿌리는 **세 칸 위**다.
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(REPO, "scripts", "figure"))

try:
    # ⚠️ `elementary` 를 **먼저** 들여온다. 두 모듈은 서로를 부르는데
    #    (`elem_advanced` 는 위에서, `elementary` 는 맨 아래에서) `elem_advanced`
    #    쪽을 먼저 열면 «부분만 초기화된 모듈» 로 죽는다. 순서가 규약이다.
    import elementary  # noqa: F401,E402

    from elem_advanced import paint_order  # noqa: E402
except Exception as e:  # 엔진을 못 읽으면 «깨끗»이 아니라 «못 잼» 이다.
    print(f"울타리 — 그림 엔진을 못 읽는다: {type(e).__name__}: {e}")
    raise SystemExit(2)


Vox = tuple[int, int, int]

# 초6 2-3 공간과 입체가 **실제로 내는** 여섯 문항(씨앗 20260821)에 더해,
# 손으로 지은 경계 표본을 같이 본다. 실데이터만 보면 그 데이터가 안 건드리는
# 자리는 구조적으로 0이 된다.
CASES: list[tuple[str, list[Vox]]] = [
    ("초6 2-3 ①", [(0, 0, 0), (0, 0, 1), (2, 0, 0), (2, 0, 1), (2, 0, 2),
                   (0, 1, 0), (1, 1, 0), (2, 1, 0), (2, 1, 1), (2, 1, 2)]),
    ("초6 2-3 ②", [(0, 0, 0), (1, 0, 0), (1, 0, 1), (1, 0, 2),
                   (1, 1, 0), (1, 1, 1), (1, 1, 2)]),
    ("초6 2-3 ③", [(0, 0, 0), (0, 0, 1), (0, 0, 2), (2, 0, 0), (2, 0, 1), (2, 0, 2),
                   (3, 0, 0), (3, 0, 1), (3, 0, 2), (0, 1, 0), (0, 1, 1), (0, 1, 2),
                   (1, 1, 0), (1, 1, 1), (2, 1, 0), (3, 1, 0), (2, 2, 0), (2, 2, 1),
                   (2, 2, 2), (3, 2, 0), (3, 2, 1), (3, 2, 2)]),
    ("초6 2-3 ④", [(0, 0, 0), (1, 0, 0), (1, 0, 1), (2, 0, 0), (2, 0, 1), (3, 0, 0),
                   (1, 1, 0), (2, 1, 0), (3, 1, 0)]),
    ("초6 2-3 ⑤", [(1, 0, 0), (1, 0, 1), (1, 0, 2), (2, 0, 0), (2, 0, 1), (2, 0, 2),
                   (0, 1, 0), (0, 1, 1), (1, 1, 0), (1, 1, 1), (0, 2, 0), (1, 2, 0),
                   (1, 2, 1), (1, 2, 2), (2, 2, 0), (2, 2, 1)]),
    ("초6 2-3 ⑥", [(0, 0, 0), (1, 0, 0), (1, 0, 1), (1, 0, 2),
                   (0, 1, 0), (0, 1, 1), (0, 1, 2), (1, 1, 0), (1, 1, 1), (1, 1, 2)]),
    # 결함이 처음 드러난 모양 — 낮은 앞 큐브 옆에 높은 기둥.
    ("계단(앞낮음)", [(0, 0, 0), (1, 0, 0), (1, 0, 1)]),
    # 대각으로 한 칸 오른 자리 — 옛 키가 뒤집던 바로 그 짝.
    ("대각 한 칸", [(0, 0, 0), (1, 0, 1)]),
    # 깊이만 다른 짝 — 옛 키도 맞히던 자리(음성 쪽 확인).
    ("깊이만", [(0, 0, 0), (0, 1, 0)]),
    # 한 개짜리 — 견줄 것이 없어 언제나 0이어야 한다.
    ("하나뿐", [(0, 0, 0)]),
]

# 🔴 **옛 정렬 키** — 양성 대조군. 이것을 지우면 이 판정기는 「아니오」를 낼 수
#    없게 되고, 그때부터 초록은 아무것도 증명하지 않는다.
def _old_order(voxels: list[Vox]) -> list[Vox]:
    return sorted(voxels, key=lambda v: (v[1], v[0], v[2]), reverse=True)


def occludes(b: Vox, a: Vox) -> bool:
    """B 가 A 를 가리는가 — 카메라가 +x · -y · +z 쪽에 있을 때."""
    return b != a and b[0] >= a[0] and b[1] <= a[1] and b[2] >= a[2]


def violations(order: list[Vox]) -> list[tuple[Vox, Vox]]:
    """«가려지는 것 먼저» 를 어긴 짝. 가리는 B 가 A 보다 먼저 그려지면 어긋난 것."""
    at = {v: i for i, v in enumerate(order)}
    out = []
    for a in at:
        for b in at:
            if occludes(b, a) and at[b] < at[a]:
                out.append((a, b))
    return out


def calibrate() -> bool:
    """양성 4 · 음성 5 · 뼈대 1 = 눈금 10건."""
    gauges: list[tuple[str, bool]] = []
    # 음성 — 제품 순서는 어느 표본에서도 어긋나면 안 된다.
    for name, vox in CASES[:5]:
        gauges.append((f"[음성] {name} — 제품 순서가 깨끗하다",
                       len(violations(paint_order(vox))) == 0))
    # 양성 — 옛 키를 되살리면 **반드시** 걸려야 한다.
    for name, vox in [CASES[0], CASES[3], CASES[6], CASES[7]]:
        gauges.append((f"[양성] {name} — 옛 키를 되살리면 걸린다",
                       len(violations(_old_order(vox))) > 0))
    # 뼈대 — 가림 관계 자체가 옳은가.
    gauges.append(("[뼈대] (1,0,1) 이 (0,0,0) 을 가린다",
                   occludes((1, 0, 1), (0, 0, 0)) and not occludes((0, 0, 0), (1, 0, 1))))

    print(f"눈금 {len(gauges)}건")
    bad = 0
    for label, ok in gauges:
        if not ok:
            bad += 1
        print(f"{'✅' if ok else '❌'} {label}")
    if bad:
        print("🔴 눈금이 안 맞는다 — 판정을 믿을 수 없다")
    return bad == 0


def main() -> None:
    if not calibrate():
        raise SystemExit(1)
    if "--selftest" in sys.argv:
        return

    total = 0
    bad = 0
    for name, vox in CASES:
        v = violations(paint_order(vox))
        total += 1
        if v:
            bad += 1
            a, b = v[0]
            print(f"   · {name} — 순서 어긋남 {len(v)}건. 예) {a} 를 {b} 보다 늦게 그린다")
    print(
        f"\n✅ 쌓기나무 {total}개 표본 전부 순서가 옳다"
        if bad == 0
        else f"\n🔴 {bad}/{total} 표본에서 순서가 어긋난다 — 지면에서 앞면이 뚫린다."
    )
    raise SystemExit(0 if bad == 0 else 1)


main()
