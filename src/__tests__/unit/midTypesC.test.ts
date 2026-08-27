import { describe, expect, it } from "vitest";

import {
  FIGURE_TETRA_NET,
  NET_FOLD_DASH,
  NET_FOLD_EDGES,
} from "../../lib/middle/m1Geo1";
import { M2_CENTER } from "../../lib/middle/m2Center";
import { M2_FUNC } from "../../lib/middle/m2Func";
import { M2_INEQ_APPLY } from "../../lib/middle/m2IneqApply";

function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function generatedIneq(section: string, type: string, seed = 29) {
  const entry = M2_INEQ_APPLY.find(
    (item) => item.unitSection === section && item.rpmType === type,
  );
  expect(entry, `${section} ${type} 유형`).toBeDefined();
  return entry!.handler(rng(seed));
}

function generatedCenter(section: string, type: string, seed = 41) {
  const entry = M2_CENTER.find(
    (item) => item.unitSection === section && item.rpmType === type,
  );
  expect(entry, `${section} ${type} 유형`).toBeDefined();
  return entry!.handler(rng(seed));
}

function generatedFunc(section: string, type: string, seed = 17) {
  const entry = M2_FUNC.find(
    (item) => item.unitSection === section && item.rpmType === type,
  );
  expect(entry, `${section} ${type} 유형`).toBeDefined();
  return entry!.handler(rng(seed));
}

function generated(type: string, seed = 17) {
  const entry = M2_FUNC.find(
    (item) =>
      item.unitSection === "일차함수의 활용(온도, 길이)" &&
      item.rpmType === type,
  );
  expect(entry, `온도·길이 ${type} 유형`).toBeDefined();
  return entry!.handler(rng(seed));
}

describe("중등 유형 갈래 C — 일차함수의 활용(온도, 길이)", () => {
  it("25 산의 기온을 높이 단위 수로 다시 계산한다", () => {
    const { facts } = generated("25");
    expect(facts!.height).toBe(facts!.units * 100);
    expect(facts!.ans).toBe(facts!.ground - facts!.drop * facts!.units);
  });

  it("26 목표 온도까지 걸린 시간을 다시 계산한다", () => {
    const { facts } = generated("26");
    expect(facts!.time).toBe((facts!.start - facts!.target) / facts!.rate);
  });

  it("27 온도계 액주 길이를 다시 계산한다", () => {
    const { facts } = generated("27");
    expect(facts!.length).toBe(facts!.base + facts!.rate * facts!.temp);
  });

  it("28 금속 막대의 온도와 길이를 다시 계산한다", () => {
    const { facts } = generated("28");
    expect(facts!.temp).toBe(facts!.baseTemp + facts!.rise);
    expect(facts!.length).toBe(facts!.baseLength + facts!.rate * facts!.rise);
  });

  it("29 추를 단 용수철 길이를 다시 계산한다", () => {
    const { facts } = generated("29");
    expect(facts!.length).toBe(facts!.base + facts!.rate * facts!.weight);
  });

  it("30 목표 수위까지 걸린 시간을 다시 계산한다", () => {
    const { facts } = generated("30");
    expect(facts!.time).toBe((facts!.height - facts!.base) / facts!.rate);
  });

  it("31 두 양초의 같은 길이와 시간을 다시 계산한다", () => {
    const { facts } = generated("31");
    expect(facts!.startA - facts!.rateA * facts!.meet).toBe(facts!.length);
    expect(facts!.startB - facts!.rateB * facts!.meet).toBe(facts!.length);
  });

  it("32 두 시점의 양초 길이를 다시 계산한다", () => {
    const { facts } = generated("32");
    expect(facts!.start).toBe(facts!.length1 + facts!.rate * facts!.t1);
    expect(facts!.length2).toBe(facts!.start - facts!.rate * facts!.t2);
  });
});

describe("중등 유형 갈래 C — 일차부등식의 활용(농도)", () => {
  const section = "일차부등식의 활용(농도)";

  it("15 소금을 넣은 경계 농도를 다시 계산한다", () => {
    const { facts } = generatedIneq(section, "15");
    expect((facts!.A * facts!.B + 100 * facts!.x) / (facts!.B + facts!.x)).toBe(
      facts!.C,
    );
  });

  it("16 물을 증발시킨 경계 농도를 다시 계산한다", () => {
    const { facts } = generatedIneq(section, "16");
    expect((facts!.A * facts!.B) / (facts!.B - facts!.x)).toBe(facts!.C);
  });

  it("17 소금을 넣을 수 있는 최대량을 다시 계산한다", () => {
    const { facts } = generatedIneq(section, "17");
    expect((facts!.A * facts!.B + 100 * facts!.x) / (facts!.B + facts!.x)).toBe(
      facts!.C,
    );
  });

  it("18 넣을 수 있는 물의 최대량을 다시 계산한다", () => {
    const { facts } = generatedIneq(section, "18");
    expect((facts!.A * facts!.B) / (facts!.B + facts!.x)).toBe(facts!.C);
  });

  it("19 소금물을 물로 치환한 농도를 다시 계산한다", () => {
    const { facts } = generatedIneq(section, "19");
    expect((facts!.A * (facts!.B - facts!.x)) / facts!.B).toBe(facts!.C);
  });

  it("20 두 소금물의 혼합 농도를 다시 계산한다", () => {
    const { facts } = generatedIneq(section, "20");
    expect(
      (facts!.a * facts!.x + facts!.b * (facts!.T - facts!.x)) / facts!.T,
    ).toBe(facts!.c);
  });

  it("21 순수 단백질을 섞은 함량을 다시 계산한다", () => {
    const { facts } = generatedIneq(section, "21");
    expect((facts!.A * facts!.B + 100 * facts!.x) / (facts!.B + facts!.x)).toBe(
      facts!.C,
    );
  });
});

describe("중등 유형 갈래 C — 일차부등식의 활용(속력, 도형, 기타)", () => {
  const section = "일차부등식의 활용(속력, 도형, 기타)";

  it("22 직사각형의 경계 둘레를 다시 계산한다", () => {
    const { facts } = generatedIneq(section, "22");
    expect(2 * (facts!.width + facts!.length)).toBe(facts!.perimeter);
  });

  it("23 평행사변형의 경계 넓이를 다시 계산한다", () => {
    const { facts } = generatedIneq(section, "23");
    expect(facts!.base * facts!.height).toBe(facts!.area);
  });

  it("24 왕복 거리의 경계 시간을 다시 계산한다", () => {
    const { facts } = generatedIneq(section, "24");
    expect((2 * facts!.distance) / facts!.speed + facts!.stay).toBe(
      facts!.limit,
    );
  });

  it("25 통화 시간의 경계 요금을 다시 계산한다", () => {
    const { facts } = generatedIneq(section, "25");
    expect(facts!.base + facts!.rate * facts!.minutes).toBe(facts!.budget);
  });

  it("26 운동 시간의 경계 소비량을 다시 계산한다", () => {
    const { facts } = generatedIneq(section, "26");
    expect(facts!.initial + facts!.rate * facts!.minutes).toBe(facts!.target);
  });

  it("27 짐과 사람 무게의 합을 다시 계산한다", () => {
    const { facts } = generatedIneq(section, "27");
    expect(facts!.body + facts!.load).toBe(facts!.limit);
  });

  it("28 바퀴 수의 경계 시간을 다시 계산한다", () => {
    const { facts } = generatedIneq(section, "28");
    expect((facts!.lap * facts!.laps) / facts!.speed).toBe(facts!.limit);
  });
});

describe("중등 유형 갈래 C — 일차부등식의 활용(수, 평균, 정가)", () => {
  const section = "일차부등식의 활용(수, 평균, 정가)";

  it("29 연속하는 두 수의 경계 합을 다시 계산한다", () => {
    const { facts } = generatedIneq(section, "29");
    expect(facts!.n + (facts!.n + 1)).toBe(facts!.limit);
  });

  it("30 자연수의 배에서 뺀 경계값을 다시 계산한다", () => {
    const { facts } = generatedIneq(section, "30");
    expect(facts!.a * facts!.n - facts!.b).toBe(facts!.limit);
  });

  it("31 목표 평균의 최소 점수를 다시 계산한다", () => {
    const { facts } = generatedIneq(section, "31");
    expect((facts!.previous + facts!.score) / (facts!.count + 1)).toBe(
      facts!.target,
    );
  });

  it("32 목표 평균의 최대 점수를 다시 계산한다", () => {
    const { facts } = generatedIneq(section, "32");
    expect((facts!.previous + facts!.score) / (facts!.count + 1)).toBe(
      facts!.target,
    );
  });

  it("33 할인 뒤 판매 금액을 다시 계산한다", () => {
    const { facts } = generatedIneq(section, "33");
    expect(facts!.price - facts!.discount).toBe(facts!.cost);
  });

  it("34 목표 이익을 포함한 판매 가격을 다시 계산한다", () => {
    const { facts } = generatedIneq(section, "34");
    expect(facts!.price).toBe((facts!.cost * (100 + facts!.profit)) / 100);
  });

  it("35 할인 뒤 목표 이익을 다시 계산한다", () => {
    const { facts } = generatedIneq(section, "35");
    expect(facts!.price - facts!.discount - facts!.cost).toBe(
      (facts!.cost * facts!.profit) / 100,
    );
  });
});

describe("중등 유형 갈래 C — 닮은 도형", () => {
  const section = "닮은 도형";

  it("70 대응변의 길이를 닮음비로 다시 계산한다", () => {
    const { facts } = generatedCenter(section, "70");
    expect(facts!.answer).toBe(facts!.side * facts!.ratio);
  });

  it("71 두 대응변으로 닮음비를 다시 계산한다", () => {
    const { facts } = generatedCenter(section, "71");
    expect(facts!.large / facts!.small).toBe(facts!.ratio);
  });

  it("72 둘레의 길이를 닮음비로 다시 계산한다", () => {
    const { facts } = generatedCenter(section, "72");
    expect(facts!.answer).toBe(facts!.perimeter * facts!.ratio);
  });

  it("73 넓이를 닮음비의 제곱으로 다시 계산한다", () => {
    const { facts } = generatedCenter(section, "73");
    expect(facts!.answer).toBe(facts!.area * facts!.ratio ** 2);
  });

  it("74 지도 길이와 축척으로 실제 거리를 다시 계산한다", () => {
    const { facts } = generatedCenter(section, "74");
    expect(facts!.answer).toBe((facts!.mapLength * facts!.scale) / 100);
  });

  it("75 평행선으로 생긴 닮음비를 다시 계산한다", () => {
    const { facts } = generatedCenter(section, "75");
    expect(facts!.whole).toBe(facts!.upper + facts!.lower);
    expect(facts!.answer).toBe((facts!.small * facts!.whole) / facts!.upper);
  });
});

describe("중등 그림 — 삼각뿔 전개도의 접는 선", () => {
  /**
   * 전개도에서 **접는 선은 점선**, 자르는 선은 실선이다(초5 교과 규약).
   * 실선으로 그리면 그림이 전개도가 아니게 된다 — 원장님이 J10504-A05-005·006
   * 화면에서 짚으셨다.
   *
   * ⚠️ 「AB·BC·CA 가 점선인가」를 **목록으로 물으면 동어반복**이다(스펙에 적힌
   *    그 목록을 다시 읽는 것뿐이다). 그래서 접는 선을 **스펙의 이음새에서
   *    다시 구한다** — 접는 선은 세 면이 모이는 가운데 삼각형의 변이므로 두 끝점이
   *    모두 «여러 선분이 모이는 점»이고, 날개(자르는 선)는 한쪽 끝이 잎사귀 점이다.
   *    이러면 점을 옮기거나 선을 지워도 기대값이 같이 따라온다.
   */
  const segments = FIGURE_TETRA_NET.segments as Record<string, unknown>;

  function endpoints(item: unknown): [string, string] {
    if (Array.isArray(item)) return [String(item[0]), String(item[1])];
    const pts = (item as { points: unknown[] }).points;
    return [String(pts[0]), String(pts[1])];
  }

  /** 점마다 몇 개의 선분이 닿는가 — 가운데 삼각형의 꼭짓점만 셋 이상이다. */
  const degree = new Map<string, number>();
  for (const item of Object.values(segments)) {
    for (const pt of endpoints(item)) {
      degree.set(pt, (degree.get(pt) ?? 0) + 1);
    }
  }

  const foldByShape = Object.keys(segments)
    .filter((name) =>
      endpoints(segments[name]).every((pt) => (degree.get(pt) ?? 0) > 2),
    )
    .sort();

  const dashedNames = Object.keys(segments)
    .filter((name) => {
      const item = segments[name];
      return !Array.isArray(item) && "dash" in (item as object);
    })
    .sort();

  it("접는 선은 이음새로 다시 구해도 가운데 삼각형 세 변이다", () => {
    expect(foldByShape).toEqual([...NET_FOLD_EDGES].sort());
    expect(foldByShape).toHaveLength(3);
  });

  it("점선이 붙은 선분은 그 접는 선 셋뿐이다", () => {
    expect(dashedNames).toEqual(foldByShape);
  });

  it("접는 선 셋의 점선 무늬는 엔진이 받는 수 목록이다", () => {
    for (const name of foldByShape) {
      const dash = (segments[name] as { dash: string }).dash;
      expect(dash, name).toBe(NET_FOLD_DASH);
      // `figure_scene.py` 는 dash 를 숫자 목록으로 읽고, 양수가 하나도 없으면 던진다.
      const parts = dash.split(/[\s,]+/).map(Number);
      expect(parts.every((v) => Number.isFinite(v) && v >= 0)).toBe(true);
      expect(parts.some((v) => v > 0)).toBe(true);
    }
  });

  it("날개 여섯(자르는 선)에는 점선이 없다", () => {
    const wings = Object.keys(segments).filter((n) => !foldByShape.includes(n));
    expect(wings).toHaveLength(6);
    for (const n of wings) {
      const item = segments[n];
      const hasDash = !Array.isArray(item) && "dash" in (item as object);
      expect(hasDash, `${n} 은 자르는 선이라 실선이어야 한다`).toBe(false);
    }
  });
});

const SEC_FUNCVAL = "함수와 함숫값";

describe("중등 유형 갈래 C — 함수와 함숫값", () => {
  // 검산은 **발문에 적힌 수만** 쓴다. 생성기가 고른 중간값(a·b)을 그대로 되읽어
  // 비교하면 동어반복이라 아무것도 안 지킨다 — 발문의 조건식을 여기서 다시 세운다.

  it("70 대입한 함숫값이 발문의 값과 같다", () => {
    const { facts } = generatedFunc(SEC_FUNCVAL, "70");
    expect(facts!.a * facts!.p + facts!.b).toBe(facts!.q);
  });

  it("71 두 함숫값이 같은 식에서 나오고 답이 두 계수의 합이다", () => {
    const { facts } = generatedFunc(SEC_FUNCVAL, "71");
    expect(facts!.a * facts!.p + facts!.b).toBe(facts!.fp);
    expect(facts!.a * facts!.q + facts!.b).toBe(facts!.fq);
    expect(facts!.ans).toBe(facts!.a + facts!.b);
  });

  it("72 부호가 반대인 두 함숫값의 합에는 x항이 남지 않는다", () => {
    const { facts } = generatedFunc(SEC_FUNCVAL, "72");
    const f = (x: number) => facts!.a * x + facts!.b;
    expect(f(facts!.p) + f(-facts!.p)).toBe(facts!.s);
  });

  it("73 답에서만 x의 계수가 0이 된다 — 경계까지 본다", () => {
    const { facts } = generatedFunc(SEC_FUNCVAL, "73");
    const coef = (a: number) => a - facts!.k;
    expect(coef(facts!.k)).toBe(0);
    expect(coef(facts!.k + 1)).not.toBe(0);
    expect(coef(facts!.k - 1)).not.toBe(0);
  });

  it("74 정비례이므로 두 짝이 같은 비를 이룬다", () => {
    const { facts } = generatedFunc(SEC_FUNCVAL, "74");
    // 발문의 수 p·q·r 과 답만으로 — 기울기 a 를 되읽지 않는다.
    expect(facts!.ans * facts!.p).toBe(facts!.q * facts!.r);
  });

  it("75 함숫값의 차와 한 함숫값만으로 답이 정해진다", () => {
    const { facts } = generatedFunc(SEC_FUNCVAL, "75");
    // f(r) = f(q) + (r-q)/(p-q) · d  를 분모 없이 옮긴 꼴.
    expect(facts!.ans * (facts!.p - facts!.q)).toBe(
      facts!.e * (facts!.p - facts!.q) + (facts!.r - facts!.q) * facts!.d,
    );
  });
});

describe("중등 유형 갈래 C — 일차함수의 그래프와 기울기", () => {
  const SEC_SLOPE = "일차함수의 그래프와 기울기";

  it("76 증가량이 기울기와 x 증가량의 곱이다", () => {
    const { facts } = generatedFunc(SEC_SLOPE, "76");
    expect(facts!.ans).toBe(facts!.m * facts!.p);
  });

  it("77 기울기에 x 증가량을 곱하면 발문의 y 증가량이 된다", () => {
    const { facts } = generatedFunc(SEC_SLOPE, "77");
    expect(facts!.m * facts!.p).toBe(facts!.d);
  });

  it("78 답을 넣으면 두 점의 기울기가 발문의 기울기와 같다", () => {
    const { facts } = generatedFunc(SEC_SLOPE, "78");
    // 기울기 정의를 분모 없이 옮긴 꼴 — 발문의 수와 답만 쓴다.
    expect(facts!.y2 - facts!.y1).toBe(facts!.m * (facts!.x2 - facts!.a));
    expect(facts!.x2).not.toBe(facts!.a);
  });

  it("79 답에서만 x의 계수가 발문의 기울기가 된다 — 경계까지 본다", () => {
    const { facts } = generatedFunc(SEC_SLOPE, "79");
    const coef = (a: number) => facts!.mult * a - facts!.off;
    expect(coef(facts!.a)).toBe(facts!.m);
    expect(coef(facts!.a + 1)).not.toBe(facts!.m);
  });

  it("80 두 직선의 기울기가 같다 — 분모 없이 견준다", () => {
    const { facts } = generatedFunc(SEC_SLOPE, "80");
    expect((facts!.y2 - facts!.y1) * (facts!.x4 - facts!.x3)).toBe(
      (facts!.k - facts!.y3) * (facts!.x2 - facts!.x1),
    );
  });
});
