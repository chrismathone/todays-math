/**
 * **치수를 그림에서 빼도 문항이 풀리는가** (2026-09-02).
 *
 * ## 이 시험이 지키는 것
 *
 * 그림 없이 적재된 214행을 되살리는 길은 제품 함수 `renderFigureSpec` 인데, 그것이
 * 「자리가 없다」는 치수를 **빼고 다시 그려서** 살린다. 그러면 그림에서 그 값이 사라진다.
 * 값을 **발문이 이미 말하고 있으면** 학생은 풀 수 있지만, 말하지 않으면 그 문항은
 * **못 푸는 문항**이 된다 — 지금(그림 없음)보다 나쁘다. 그림이 없으면 티라도 나는데,
 * 치수 하나 빠진 그림은 **멀쩡해 보이는 오답**이기 때문이다.
 *
 * ## 🔴 자가 먼저 틀렸다 — 스펙의 «점 이름»은 지면의 «라벨»이 아니다
 *
 * 첫 판은 치수 이름(`d_P1P2`)에서 점을 뜯어 발문에서 «P1P2» 를 찾았다. 12건이 «위험»으로
 * 걸렸는데 **전부 거짓 경보**였다 — 스펙이 점을 `P1`·`P2` 로 부르면서 `labels` 로
 * `P1→A`·`P2→B` 를 붙이고, 발문은 당연히 `AB` 라고 쓴다.
 * 표본 하나를 열어 보고서야 드러났다.
 *
 * ⚠️ **그래서 이 시험에는 «위험» 대조군이 반드시 있어야 한다.** 안전만 시험하면
 *    「전부 통과」가 「자가 위험을 못 본다」와 구분되지 않는다 — 0 은 「깨끗」과
 *    「못 셈」을 안 가른다(이 저장소가 반복해서 데인 자리).
 */
import { describe, expect, it } from "vitest";

import { dropIsCoveredByStem } from "../../../scripts/qa/fill-missing-figures";

/** 실데이터에서 그대로 가져온 스펙 (중2 평행선 사이의 선분의 길이의 비, v10). */
const REAL_SPEC = {
  points: {
    P1: [48.67, 80],
    P2: [65.02, 110.67],
    P3: [73.2, 172],
    Q1: [171.33, 80],
    Q2: [152.25, 110.67],
    Q3: [142.71, 172],
  },
  dimensions: {
    d_P1P2: { points: ["P1", "P2"], label: "4 cm", side: "auto" },
    d_P2P3: { points: ["P2", "P3"], label: "8 cm", side: "auto" },
    d_Q1Q2: { points: ["Q1", "Q2"], label: "3 cm", side: "auto" },
  },
  labels: { P1: "A", P2: "B", P3: "C", Q1: "D", Q2: "E", Q3: "F" },
} as Record<string, unknown>;

/** 그 문항의 실제 발문. 세 값(4·8·3)을 전부 말한다. */
const REAL_STEM =
  "그림과 같이 세 평행선 $l$, $m$, $n$이 두 직선과 만나는 점을 각각 $A$, $B$, $C$와 " +
  "$D$, $E$, $F$라 하자. $\\overline{AB}=4\\,\\mathrm{cm}$, $\\overline{BC}=8\\,\\mathrm{cm}$, " +
  "$\\overline{DE}=3\\,\\mathrm{cm}$일 때, $\\overline{EF}$의 길이를 구하시오.";

describe("치수를 빼도 되는가 — 양성 대조", () => {
  it("🔴 ㉠ 발문이 그 값을 말하면 **안전**하다 (점 이름 P1P2 → 지면 라벨 AB)", () => {
    const got = dropIsCoveredByStem("d_P1P2", REAL_STEM, REAL_SPEC);
    expect(got.safe).toBe(true);
  });

  it("㉡ 세 치수 전부 안전하다 — 발문이 4·8·3 을 다 말한다", () => {
    for (const d of ["d_P1P2", "d_P2P3", "d_Q1Q2"])
      expect(dropIsCoveredByStem(d, REAL_STEM, REAL_SPEC).safe).toBe(true);
  });

  it("㉢ 라벨을 안 봐도 **값**으로 통과한다 — 두 길 중 하나만 살아도 된다", () => {
    const noLabels = { ...REAL_SPEC, labels: {} };
    expect(dropIsCoveredByStem("d_P1P2", REAL_STEM, noLabels).safe).toBe(true);
  });
});

describe("🔴 음성 대조 — 자가 «위험»을 낼 수 있는가", () => {
  it("🔴 ㉣ 발문이 값을 **안** 말하면 위험이다 — 이게 안 걸리면 자가 장님이다", () => {
    const spec = {
      dimensions: { d_XY: { points: ["X", "Y"], label: "7 cm" } },
      labels: { X: "X", Y: "Y" },
    } as Record<string, unknown>;
    const stem = "그림의 삼각형에서 넓이를 구하시오.";
    const got = dropIsCoveredByStem("d_XY", stem, spec);
    expect(got.safe).toBe(false);
  });

  it("🔴 ㉤ 그 값만 빼면 **판정이 뒤집힌다** — 값이 판정을 정한다는 증거", () => {
    const spec = {
      dimensions: { d_XY: { points: ["X", "Y"], label: "7 cm" } },
      labels: {},
    } as Record<string, unknown>;
    expect(dropIsCoveredByStem("d_XY", "길이가 $7$ 인 변", spec).safe).toBe(
      true,
    );
    expect(dropIsCoveredByStem("d_XY", "길이가 $9$ 인 변", spec).safe).toBe(
      false,
    );
  });

  it("㉥ 스펙을 못 주면 **위험 쪽으로 민다** — 판정 불가를 안전으로 읽으면 안 된다", () => {
    expect(dropIsCoveredByStem("d_AH", "아무 말도 없는 발문").safe).toBe(false);
  });

  it("㉦ 라벨이 다른 점을 가리키면 위험이다 — 라벨 해석이 실제로 쓰인다는 증거", () => {
    const spec = {
      dimensions: { d_P1P2: { points: ["P1", "P2"], label: "5 cm" } },
      labels: { P1: "K", P2: "L" },
    } as Record<string, unknown>;
    // 발문은 AB 를 말하는데 이 치수는 KL 이다. 값 5 도 없다.
    expect(
      dropIsCoveredByStem("d_P1P2", "$\\overline{AB}=4$ 이다", spec).safe,
    ).toBe(false);
  });
});
