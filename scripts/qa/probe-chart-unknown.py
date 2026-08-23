# -*- coding: utf-8 -*-
"""차트가 «가려진 값(unknown)»을 받는가 — **선언이 한 곳인가**를 잰다.

    python scripts/qa/probe-chart-unknown.py

## 왜 따로 있나

예전에는 `_bar_chart` 만 `allow_unknown=True` 를 손으로 넘기고 `_line_chart` 는 안 넘겼다.
값은 맞았지만 **자리가 둘**이라, 세 번째 차트 종류가 생기면 같은 구멍이 또 열린다 —
새 차트를 만드는 사람이 이 축이 있다는 것조차 모르기 때문이다.

그래서 이 판정기가 재는 것은 「막대가 받고 꺾은선이 막는가」로 **끝나지 않는다.**
`CHART_ACCEPTS_UNKNOWN` 을 **뒤집었을 때 두 호출부가 같이 뒤집히는가**를 본다.
표를 바꿨는데 한쪽이 안 따라오면 그 호출부는 **표를 안 읽고 있는 것**이다.

## 이 판정기가 못 재는 것

「꺾은선이 가려진 값을 **그릴 수 있게** 되었는가」는 못 잰다 — 표를 `True` 로 바꿔도
`_line_chart` 는 y 를 못 정해 죽는다. 그것은 지면 모양 결정(D-07)이라 여기 밖이다.
아래 ③ 이 그 사실 자체를 못 박는다(「열려면 렌더러부터」를 다음 사람이 알게).
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "figure"))

# ⚠️ `elementary` 를 **먼저** 들여온다. 둘이 서로를 import 하는데 `elem_advanced` 를 먼저
#    들여오면 순환 import 로 죽는다(`ADV_FIELDS` 가 아직 안 만들어졌다).
import elementary  # noqa: E402
import elem_advanced as A  # noqa: E402


def spec(kind: str, *, hidden: bool):
    middle = {"label": "나", "unknown": True} if hidden else {"label": "나", "value": 6}
    return {
        "version": "elem-1",
        "kind": kind,
        "values": [{"label": "가", "value": 4}, middle, {"label": "다", "value": 7}],
        "yMax": 10,
    }


def draws(kind: str, *, hidden: bool) -> bool:
    """그려지면 True, 「가려진 값을 못 그린다」로 막히면 False. 다른 오류는 그대로 터뜨린다."""
    try:
        elementary.render_elementary(spec(kind, hidden=hidden))
        return True
    except ValueError as err:
        if "지워진 막대를 그리지 못합니다" in str(err):
            return False
        raise


rows: list[tuple[str, object, object]] = []

# ① 지금 정책 — 막대는 받고 꺾은선은 막는다.
rows.append(("막대는 가려진 값을 받는다", draws("barChart", hidden=True), True))
rows.append(("꺾은선은 가려진 값을 막는다", draws("lineChart", hidden=True), False))
# ② 음성 대조 — 가려진 값이 없으면 **둘 다** 그려져야 한다(막는 것이 값 자체가 아님을 못 박는다).
rows.append(("막대는 보통 값을 그린다", draws("barChart", hidden=False), True))
rows.append(("꺾은선은 보통 값을 그린다", draws("lineChart", hidden=False), True))

# ③ **선언이 한 곳인가** — 표를 뒤집으면 두 호출부가 같이 뒤집혀야 한다.
#    한쪽이라도 안 따라오면 그 호출부는 표를 안 읽고 자기가 정하고 있는 것이다.
saved = dict(A.CHART_ACCEPTS_UNKNOWN)
try:
    A.CHART_ACCEPTS_UNKNOWN["barChart"] = False
    rows.append(("표를 끄면 막대도 막힌다", draws("barChart", hidden=True), False))
    A.CHART_ACCEPTS_UNKNOWN["lineChart"] = True
    # 표를 켜면 «막는 것»은 사라진다. 그 뒤 렌더러가 y 를 못 정해 죽는 것은 별개다 —
    # 그래서 「막힘(False)이 아니다」까지만 본다.
    try:
        opened = draws("lineChart", hidden=True)
    except TypeError:
        opened = "렌더러가 못 그림"
    rows.append(("표를 켜면 꺾은선은 «막힘»이 아니다", opened != False, True))  # noqa: E712
    rows.append(
        ("그래도 꺾은선은 아직 못 그린다 (지면 결정 전)", opened, "렌더러가 못 그림")
    )
finally:
    A.CHART_ACCEPTS_UNKNOWN.clear()
    A.CHART_ACCEPTS_UNKNOWN.update(saved)

# ④ 표에 없는 종류는 조용히 막히지 않고 **던진다**.
try:
    A._chart_values_of("pieChart", [{"label": "가", "value": 1}], "values")
    rows.append(("표에 없는 종류는 던진다", "안 던짐", "던짐"))
except ValueError as err:
    rows.append(
        ("표에 없는 종류는 던진다", "던짐" if "안 정해졌" in str(err) else str(err), "던짐")
    )

bad = 0
for why, got, want in rows:
    ok = got == want
    if not ok:
        bad += 1
    print(f"  {'✅' if ok else '❌'} {why} — 기대 {want} / 실제 {got}")

print()
if bad == 0:
    print(f"✅ 눈금 {len(rows)}건 — 선언 한 곳을 두 호출부가 읽는다")
else:
    print(f"❌ {bad}건 어긋남 — **이 판정기를 믿지 마라**")
sys.exit(1 if bad else 0)
