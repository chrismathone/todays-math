# -*- coding: utf-8 -*-
"""**정본(RPM) 비율과 우리 지면을 같은 자로 견준다** — 굵기·글자 크기.

    npx tsx scripts/qa/dump-figure-svgs.ts .tmp-orca/ratio
    python scripts/qa/measure-rpm-weight-ratio.py .tmp-orca/ratio

원장님 확정 2026-08-29: 「**rpm과 같은 비율이면 전부 통과**」. 그러면 승인이
**잴 수 있는 조건**이 된다 — 그래서 상수를 읽지 않고 **그려진 SVG** 를 잰다.
상수를 읽으면 「배선이 한쪽만 된」 자리를 구조적으로 못 본다(호출부가 `w=` 를
따로 주면 상수와 지면이 갈린다).

## 무엇으로 가르나 — 굵기가 아니라 **대시 무늬와 색**

2026-08-28 에 굵기로 치수를 알아보던 판정기 셋이 굵기를 바꾸자 동시에 눈이 멀었다.
그래서 여기서는 굵기를 **재는 대상**으로만 쓰고, 가르는 열쇠는 따로 둔다:

    각 호      stroke-dasharray="4 3"   (`angle_mark`, 점선이 기본)
    치수 파선  stroke-dasharray="6 4"
    접는 선    stroke="#111111"  dasharray="5 4"
    도형 실선  stroke="#000"/"#111" 이면서 **dasharray 없음**

## 정본 실측값 (근거: tracks/reports/rpm-engine-gaps.md ①·⑤·⑥)

    각 호 ÷ 도형 선        RPM 0.375   (0.30 / 0.80)
    치수 파선 ÷ 도형 선    RPM 0.375~0.625
    도형 대각 ÷ 라벨 글자  RPM 11.88   (실선만 세는 자)

⚠️ 「RPM 과 다르다」가 곧 「틀렸다」는 아니다(D-112). 이 자는 **차이를 숫자로**
   내놓을 뿐이고, 무엇에 맞출지는 원장님이 정한다.
"""
from __future__ import annotations

import math
import os
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict

SVG_NS = "{http://www.w3.org/2000/svg}"

# 정본 실측 — 이 파일이 유일한 우리 쪽 기록이다(교재는 보기만 한다).
RPM = {
    "arc_over_solid": 0.375,
    "dim_over_solid": (0.375, 0.625),
    "diag_over_label": 11.88,
}

NUM = re.compile(r"-?\d+(?:\.\d+)?")


def _f(v, default=None):
    if v is None:
        return default
    m = NUM.search(str(v))
    return float(m.group()) if m else default


def _pts(d: str):
    """path/polygon 좌표를 대충 훑어 bbox 를 낸다 — 곡선 제어점도 포함한다.

    ⚠️ 정확한 경로 파싱이 아니다. **bbox 는 과대평가될 수 있고**, 그러면 「도형
    대각」이 커져 성적이 좋게 나온다 — 그러니 이 값으로 «통과»를 선언하지 말고
    전·후 비교에만 쓴다. 같은 자를 양쪽에 대므로 편향은 상쇄된다.
    """
    return [float(x) for x in NUM.findall(d or "")]


def measure(path: str):
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError:
        return None
    solid, arc, dim, fold = [], [], [], []
    xs, ys = [], []
    fonts = []
    for el in root.iter():
        tag = el.tag.replace(SVG_NS, "")
        if tag == "text":
            fs = _f(el.get("font-size"))
            if fs:
                fonts.append(fs)
            continue
        # 🔴 **조판된 라벨에는 `<text>` 가 없다** (2026-08-28 MathJax 배선 이후).
        #    글자가 글리프 path 로 바뀌고 크기는 `<g data-fs="...">` 에만 남는다.
        #    `<text>` 만 보면 이 축이 **적재본 전체에서 구조적으로 0**이 된다 —
        #    실제로 그렇게 되어 있었고, 아래 `line()` 이 「침묵한다」고만 찍었다.
        #    0 이 「깨끗」인지 「못 셈」인지 갈라야 한다(2026-08-21).
        if el.get("data-fs") is not None:
            fs = _f(el.get("data-fs"))
            if fs:
                fonts.append(fs)
            continue
        sw = _f(el.get("stroke-width"))
        stroke = (el.get("stroke") or "").lower()
        dash = (el.get("stroke-dasharray") or "").strip()
        if sw is None or stroke in ("", "none"):
            continue
        # 🔴 `4 3` 대시는 **각 호만의 것이 아니다.** 좌표평면의 보조선(polyline)도
        #    같은 무늬를 쓴다 — 처음 이 자를 그렇게 짰다가 보조선 13장을 각 호로
        #    세어 「비 1.000」이라는 거짓 값을 냈다. 각 호는 `angle_mark` 가 내는
        #    **호(`A` 명령이 든 path)** 다. 대시 하나로는 안 갈린다.
        #
        # 🔴🔴 **그런데 이 좁힌 열쇠도 틀렸다** (2026-08-29 적대적 점검).
        #    ㉠ **제품(v2 장면 엔진)의 각 호는 점선이 아니다** — 실측
        #       `<path d="M … A 22 22 …" stroke="#111111" stroke-width="0.72"/>`,
        #       대시 없음. 그래서 이 축은 **진짜 각 호를 한 장도 못 본다.**
        #    ㉡ 대신 **내용 곡선**을 문다 — 적재본에서 걸린 6장은 전부
        #       `mid:1-2|원과 부채꼴|18` 의 **반지름 66짜리 파선 반원**(그림의 일부)
        #       이었고, 도형선과 같은 굵기인 것이 정상이다. 그 6장이
        #       「중앙값 1.000 · 정본 0.375」라는 **거짓 경보**를 냈다.
        #
        #    속성만으로는 «각 표시»와 «내용 곡선»이 안 갈린다 — 각 호인지는 «꼭짓점
        #    사이에 그렸는가»이지 색·대시가 아니다. 그래서 이 축은 **판정하지 않고**
        #    「파선 호」로만 세어 찍는다(아래 이름). 진짜 가드는 입력을 통제하는 쪽에
        #    있다: `src/__tests__/unit/figureWeightRatio.test.ts` 가 **각 표시만 든
        #    스펙을 직접 그려** 굵기 비를 잰다. 분류를 못 하겠으면 입력을 통제하라.
        is_arc = (
            dash.startswith("4 3")
            and tag == "path"
            and "A" in (el.get("d") or "")
        )
        if is_arc:
            arc.append(sw)
        elif dash.startswith("6 4"):
            dim.append(sw)
        elif dash:
            fold.append(sw)
        elif stroke in ("#000", "#000000", "#111", "#111111"):
            solid.append(sw)
            nums = _pts(el.get("d") or el.get("points") or "")
            xs += nums[0::2]
            ys += nums[1::2]
    if not solid:
        return None
    # 도형 실선의 **최빈값**을 쓴다 — 평균은 장식선 하나에 끌려간다.
    #
    # ⚠️ **최빈값도 끌려간다** (2026-08-29 적대적 점검). 화살촉은 짧은 선 두 개씩이라
    #    한 그림에 **수십 개**가 되고, 그러면 최빈값이 화살촉 굵기(0.72)가 된다.
    #    실측: `mid:1-5|…` 계열 18장이 「치수 파선 ÷ 도형 선 = 2.639」로 찍혔는데,
    #    분모가 도형선이 아니라 **화살촉**이었다(진짜 도형선은 그 파선 1.9 쪽이다).
    #    그래서 **띠 밖 값이 나오면 먼저 이 자를 의심하라** — 세 축 중 믿을 것은
    #    「도형 대각 ÷ 라벨」이고, 굵기 축은 입력을 통제한 시험
    #    (`figureWeightRatio.test.ts`)이 정본이다.
    sw_solid = Counter(solid).most_common(1)[0][0]
    diag = math.hypot(max(xs) - min(xs), max(ys) - min(ys)) if xs and ys else None
    return {
        "solid": sw_solid,
        "arc": Counter(arc).most_common(1)[0][0] if arc else None,
        "dim": Counter(dim).most_common(1)[0][0] if dim else None,
        "diag": diag,
        "font": Counter(fonts).most_common(1)[0][0] if fonts else None,
    }


def main() -> int:
    d = sys.argv[1] if len(sys.argv) > 1 else ".tmp-orca/ratio"
    files = sorted(f for f in os.listdir(d) if f.endswith(".svg"))
    rows = []
    for f in files:
        m = measure(os.path.join(d, f))
        if m:
            rows.append((f, m))
    print(f"SVG {len(files)}장 · 실선을 찾은 것 {len(rows)}장")
    if not rows:
        # 0 이 「깨끗」인지 「못 셈」인지 갈라야 한다.
        print("🔴 한 장도 못 쟀다 — 지문(색·대시)이 낡았는지 먼저 보라")
        return 2

    def ratio(key):
        return [m[key] / m["solid"] for _, m in rows if m[key]]

    arcs, dims = ratio("arc"), ratio("dim")
    diags = [m["diag"] / m["font"] for _, m in rows if m["diag"] and m["font"]]

    def line(name, vals, target):
        if not vals:
            print(f"   {name:22} — 잰 그림이 0장 (이 축은 이번 회차에 침묵한다)")
            return
        vals = sorted(vals)
        mid = vals[len(vals) // 2]
        print(
            f"   {name:22} 그림 {len(vals):3}장 · 중앙값 **{mid:.3f}** "
            f"(최소 {vals[0]:.3f} · 최대 {vals[-1]:.3f}) · 정본 {target}"
        )

    print("\n비 — 우리 지면 (같은 자로 잰 값)")
    # ⚠️ 판정이 아니라 **참고**다 — 위 주석 참고. 진짜 각 호 가드는
    #    `src/__tests__/unit/figureWeightRatio.test.ts` 다.
    line("파선 호 ÷ 도형 선(참고)", arcs, RPM["arc_over_solid"])
    if arcs:
        print(
            "   ⚠️ 위 «파선 호» 는 **각 표시가 아닐 수 있다**(내용 곡선이 섞인다). "
            "제품 각 호는 점선이 아니라 이 축이 못 본다 — 가드는 figureWeightRatio.test.ts."
        )
    line("치수 파선 ÷ 도형 선", dims, f'{RPM["dim_over_solid"][0]}~{RPM["dim_over_solid"][1]}')
    line("도형 대각 ÷ 라벨", diags, RPM["diag_over_label"])

    print("\n굵기 분포 (실측 리터럴)")
    for key, label in (("solid", "도형 실선"), ("arc", "각 호"), ("dim", "치수 파선")):
        c = Counter(m[key] for _, m in rows if m[key])
        print(f"   {label:10} {dict(sorted(c.items()))}")
    c = Counter(m["font"] for _, m in rows if m["font"])
    print(f"   {'라벨 글자':10} {dict(sorted(c.items()))}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
