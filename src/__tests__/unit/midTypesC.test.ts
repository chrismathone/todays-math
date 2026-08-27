import { readFileSync } from "node:fs";
import path from "node:path";

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

describe("중등 유형 갈래 C — 일차함수의 그래프와 절편", () => {
  const SEC_INT = "일차함수의 그래프와 절편";

  it("81 답에서만 상수항이 발문의 y절편이 된다 — 경계까지 본다", () => {
    const { facts } = generatedFunc(SEC_INT, "81");
    const constTerm = (a: number) => facts!.mult * a - facts!.off;
    expect(constTerm(facts!.a)).toBe(facts!.b);
    expect(constTerm(facts!.a + 1)).not.toBe(facts!.b);
  });

  it("82 x절편에서만 y가 0이 된다 — 경계까지 본다", () => {
    const { facts } = generatedFunc(SEC_INT, "82");
    const y = (x: number) => facts!.m * x + facts!.b;
    expect(y(facts!.x0)).toBe(0);
    expect(y(facts!.x0 + 1)).not.toBe(0);
  });

  it("83 두 절편이 실제로 절편이고 답이 그 곱이다", () => {
    const { facts } = generatedFunc(SEC_INT, "83");
    expect(facts!.m * facts!.x0 + facts!.b).toBe(0); // x절편
    expect(facts!.ans).toBe(facts!.x0 * facts!.b);
  });

  it("84 답을 넣으면 발문의 x절편에서 y가 0이 된다", () => {
    const { facts } = generatedFunc(SEC_INT, "84");
    expect(facts!.m * facts!.p + facts!.b).toBe(0);
    expect(facts!.m * (facts!.p + 1) + facts!.b).not.toBe(0);
  });

  it("85 두 그래프가 같은 점에서 x축을 지난다", () => {
    const { facts } = generatedFunc(SEC_INT, "85");
    expect(facts!.m1 * facts!.x0 + facts!.b1).toBe(0);
    expect(facts!.m2 * facts!.x0 + facts!.k).toBe(0);
    expect(facts!.m1).not.toBe(facts!.m2);
  });

  it("86 답을 넣으면 두 절편의 합이 발문의 값이 된다", () => {
    const { facts } = generatedFunc(SEC_INT, "86");
    expect(facts!.m * facts!.x0 + facts!.b).toBe(0); // x절편이 맞나
    expect(facts!.x0 + facts!.b).toBe(facts!.sum);
  });
});

describe("중등 유형 갈래 C — 일차함수의 식 구하기", () => {
  const SEC_EQ = "일차함수의 식 구하기";

  it("70 두 점을 잇는 직선이 답에서 x축을 지난다 — 분모 없이 견준다", () => {
    const { facts } = generatedFunc(SEC_EQ, "70");
    // y1(x2-x1) + (y2-y1)(x0-x1) = 0  ← 두 점을 지나는 직선이 (x0,0) 을 지난다
    expect(
      facts!.y1 * (facts!.x2 - facts!.x1) +
        (facts!.y2 - facts!.y1) * (facts!.x0 - facts!.x1),
    ).toBe(0);
    expect(facts!.x2).not.toBe(facts!.x1);
  });

  it("71 기울기와 한 점에서 이어 간 직선이 답에서 x축을 지난다", () => {
    const { facts } = generatedFunc(SEC_EQ, "71");
    expect(facts!.q + facts!.m * (facts!.x0 - facts!.p)).toBe(0);
    expect(facts!.q + facts!.m * (facts!.x0 + 1 - facts!.p)).not.toBe(0);
  });

  it("72 답이 두 절편을 잇는 기울기다", () => {
    const { facts } = generatedFunc(SEC_EQ, "72");
    // (x0,0) 과 (0,b) 를 지나는 직선의 기울기가 m 이면 m·x0 + b = 0.
    expect(facts!.m * facts!.x0 + facts!.b).toBe(0);
  });

  it("73 평행 — 기울기는 그대로고 답을 넣으면 그 점을 지난다", () => {
    const { facts } = generatedFunc(SEC_EQ, "73");
    expect(facts!.m * facts!.p + facts!.b).toBe(facts!.q);
    expect(facts!.b).not.toBe(facts!.c); // 같으면 «평행»이 아니라 같은 그래프다
  });

  it("74 세 점이 한 직선 위에 있다 — 분모 없이 견준다", () => {
    const { facts } = generatedFunc(SEC_EQ, "74");
    expect((facts!.y2 - facts!.y1) * (facts!.r - facts!.x1)).toBe(
      (facts!.k - facts!.y1) * (facts!.x2 - facts!.x1),
    );
  });

  it("75 세운 식이 발문의 점을 지나고 답이 두 계수의 합이다", () => {
    const { facts } = generatedFunc(SEC_EQ, "75");
    expect(facts!.m * facts!.p + facts!.b).toBe(facts!.q);
    expect(facts!.ans).toBe(facts!.m + facts!.b);
  });
});

describe("중등 유형 갈래 C — 일차함수의 그래프의 성질", () => {
  const SEC_PROP = "일차함수의 그래프의 성질";

  it("76 답한 사분면에는 그래프 위의 점이 하나도 없다 — 좌표로 훑어 센다", () => {
    const { facts } = generatedFunc(SEC_PROP, "76");
    const m = facts!.m;
    const b = facts!.b;
    // 부호 표로 답하지 않는다. 그래프 위의 점을 촘촘히 찍어 **어느 사분면에
    // 들어가는지 세고**, 답한 사분면만 0인지 본다.
    const seen = new Set<number>();
    for (let i = -4000; i <= 4000; i += 1) {
      const x = i / 100;
      const y = m * x + b;
      if (x === 0 || y === 0) continue;
      seen.add(x > 0 ? (y > 0 ? 1 : 4) : y > 0 ? 2 : 3);
    }
    expect(seen.has(facts!.miss), `제${facts!.miss}사분면`).toBe(false);
    expect(seen.size).toBe(3); // 나머지 셋은 실제로 지난다
  });

  it("77 답에서는 기울기가 음수이고 답+1 에서는 아니다 — 경계", () => {
    const { facts } = generatedFunc(SEC_PROP, "77");
    const slope = (a: number) => a - facts!.k;
    expect(slope(facts!.ans)).toBeLessThan(0);
    expect(slope(facts!.ans + 1)).not.toBeLessThan(0);
  });

  it("78 평행이동한 그래프에 x=0 을 넣으면 답이 나온다", () => {
    const { facts } = generatedFunc(SEC_PROP, "78");
    const moved = (x: number) => facts!.m * x + facts!.b + facts!.k;
    expect(moved(0)).toBe(facts!.ans);
  });

  it("79 답을 넣으면 두 그래프의 y축 위의 점이 같아진다", () => {
    const { facts } = generatedFunc(SEC_PROP, "79");
    const second = (a: number) => facts!.mult * a - facts!.off;
    expect(second(facts!.a)).toBe(facts!.b);
    expect(second(facts!.a + 1)).not.toBe(facts!.b);
    expect(facts!.m1).not.toBe(facts!.m2); // 기울기까지 같으면 «y축 위에서»가 무의미
  });

  it("80 답만큼 옮기면 두 그래프가 모든 x 에서 같아진다", () => {
    const { facts } = generatedFunc(SEC_PROP, "80");
    const moved = (x: number) => facts!.m * x + facts!.b + facts!.k;
    const target = (x: number) => facts!.m * x + facts!.c;
    for (const x of [-3, 0, 1, 5]) expect(moved(x)).toBe(target(x));
    expect(facts!.k).not.toBe(0); // 안 옮겨도 같으면 문제가 안 된다
  });
});

describe("중등 유형 갈래 C — 연립방정식의 해 · 일차함수와 일차방정식", () => {
  const SEC_SOL = "일차함수의 그래프와 연립방정식의 해";
  const SEC_LEQ = "일차함수와 일차방정식";

  it("70 교점이 두 그래프 위에 다 있고 답이 좌표의 합이다", () => {
    const { facts } = generatedFunc(SEC_SOL, "70");
    expect(facts!.m1 * facts!.p + facts!.b1).toBe(facts!.q);
    expect(facts!.m2 * facts!.p + facts!.b2).toBe(facts!.q);
    expect(facts!.m1).not.toBe(facts!.m2); // 기울기가 같으면 교점이 하나가 아니다
    expect(facts!.ans).toBe(facts!.p + facts!.q);
  });

  it("71 세 직선이 모두 그 교점을 지난다", () => {
    const { facts } = generatedFunc(SEC_SOL, "71");
    expect(facts!.m1 * facts!.p + facts!.b1).toBe(facts!.q);
    expect(facts!.m2 * facts!.p + facts!.b2).toBe(facts!.q);
    expect(facts!.m3 * facts!.p + facts!.b3).toBe(facts!.q);
    expect(new Set([facts!.m1, facts!.m2, facts!.m3]).size).toBe(3);
  });

  it("72 답을 넣어야 두 그래프가 그 x좌표에서 만난다 — 경계", () => {
    const { facts } = generatedFunc(SEC_SOL, "72");
    expect(facts!.m1 * facts!.p + facts!.b1).toBe(facts!.q);
    expect(facts!.m2 * facts!.p + facts!.k).toBe(facts!.q);
    expect(facts!.m2 * facts!.p + facts!.k + 1).not.toBe(facts!.q);
  });

  it("73 두 일차방정식이 그 교점에서 모두 성립하고 답이 두 상수의 곱이다", () => {
    const { facts } = generatedFunc(SEC_SOL, "73");
    expect(facts!.a * facts!.p + facts!.q).toBe(facts!.c1);
    expect(facts!.p + facts!.b * facts!.q).toBe(facts!.c2);
    expect(facts!.ans).toBe(facts!.a * facts!.b);
  });

  it("74 답이 ax+by+c=0 의 기울기다 — 분모 없이 견준다", () => {
    const { facts } = generatedFunc(SEC_LEQ, "74");
    // y=mx+n 이면 a + b·m = 0 이다 (m = -a/b 를 옮긴 꼴).
    expect(facts!.a + facts!.b * facts!.m).toBe(0);
    expect(facts!.b).not.toBe(0);
  });
});

describe("중등 유형 갈래 C — 일차부등식의 응용", () => {
  const SEC_APP = "일차부등식의 응용";

  // 「가장 큰/작은 정수」·「개수」는 **경계가 곧 답**이다. 답만 넣어 보면
  // 한 칸 옆도 만족하는 식(생성기 오류)을 못 가려낸다 — 늘 양쪽을 본다.

  it("70 답은 만족하고 답+1 은 만족하지 않는다", () => {
    const { facts } = generatedIneq(SEC_APP, "70");
    const ok = (x: number) => facts!.a * x + facts!.b <= facts!.c;
    expect(ok(facts!.n)).toBe(true);
    expect(ok(facts!.n + 1)).toBe(false);
  });

  it("71 자연수 해를 실제로 세어 답과 맞댄다", () => {
    const { facts } = generatedIneq(SEC_APP, "71");
    let count = 0;
    for (let x = 1; x <= 200; x += 1) {
      if (facts!.a * x - facts!.b < facts!.d) count += 1;
    }
    expect(count).toBe(facts!.n);
  });

  it("72 답은 만족하고 답-1 은 만족하지 않는다", () => {
    const { facts } = generatedIneq(SEC_APP, "72");
    const ok = (x: number) =>
      facts!.a * (x - facts!.p) > facts!.b * (x + facts!.q);
    expect(ok(facts!.n)).toBe(true);
    expect(ok(facts!.n - 1)).toBe(false);
  });

  it("73 두 부등식을 동시에 만족하는 정수를 실제로 세어 맞댄다", () => {
    const { facts } = generatedIneq(SEC_APP, "73");
    let count = 0;
    for (let x = -300; x <= 300; x += 1) {
      const a = facts!.a1 * x + facts!.b1 < facts!.c1;
      const b = facts!.a2 * x + facts!.b2 >= facts!.c2;
      if (a && b) count += 1;
    }
    expect(count).toBe(facts!.ans);
  });

  it("74 답에서만 자연수 해가 발문의 개수가 된다 — 경계", () => {
    const { facts } = generatedIneq(SEC_APP, "74");
    const naturals = (a: number) => {
      let c = 0;
      for (let x = 1; x <= 300; x += 1) if (facts!.m * x - a <= 0) c += 1;
      return c;
    };
    expect(naturals(facts!.ans)).toBe(facts!.n);
    expect(naturals(facts!.ans - 1)).not.toBe(facts!.n); // 최솟값이 맞나
  });
});

describe("중등 유형 갈래 C — 일차부등식의 활용(개수, 예금액, 유리한 방법)", () => {
  const SEC_CNT = "일차부등식의 활용(개수, 예금액, 유리한 방법)";

  it("70 답 개월에 목표를 넘고 한 달 전에는 못 넘는다", () => {
    const { facts } = generatedIneq(SEC_CNT, "70");
    const bal = (x: number) => facts!.a0 + facts!.p * x;
    expect(bal(facts!.n)).toBeGreaterThanOrEqual(facts!.T);
    expect(bal(facts!.n - 1)).toBeLessThan(facts!.T);
  });

  it("71 답 개월에 처음의 k배를 넘고 한 달 전에는 못 넘는다", () => {
    const { facts } = generatedIneq(SEC_CNT, "71");
    const bal = (x: number) => facts!.a0 + facts!.p * x;
    const goal = facts!.k * facts!.a0;
    expect(bal(facts!.n)).toBeGreaterThanOrEqual(goal);
    expect(bal(facts!.n - 1)).toBeLessThan(goal);
  });

  it("72 답 개수에서 기준을 넘고 한 개 적으면 못 넘는다", () => {
    const { facts } = generatedIneq(SEC_CNT, "72");
    const score = (x: number) => facts!.a * x - facts!.b * (facts!.N - x);
    expect(score(facts!.n)).toBeGreaterThanOrEqual(facts!.M);
    expect(score(facts!.n - 1)).toBeLessThan(facts!.M);
    expect(facts!.n).toBeLessThanOrEqual(facts!.N); // 낼 수 있는 문제 수를 넘지 않는다
  });

  it("73 답 횟수면 다 나르고 한 번 적으면 남는다", () => {
    const { facts } = generatedIneq(SEC_CNT, "73");
    expect(facts!.w * facts!.n).toBeGreaterThanOrEqual(facts!.W);
    expect(facts!.w * (facts!.n - 1)).toBeLessThan(facts!.W);
  });

  it("74 답 개수는 예산 안이고 한 개 더 사면 넘는다", () => {
    const { facts } = generatedIneq(SEC_CNT, "74");
    const cost = (x: number) => facts!.p2 * x + facts!.p1 * (facts!.N - x);
    expect(cost(facts!.n)).toBeLessThanOrEqual(facts!.T);
    expect(cost(facts!.n + 1)).toBeGreaterThan(facts!.T);
    expect(facts!.n).toBeLessThanOrEqual(facts!.N);
  });
});

describe("중등 유형 갈래 C — 지면에 날 글자가 안 나간다", () => {
  /**
   * **역슬래시가 한 겹 사라진 LaTeX** 를 막는다.
   *
   * TS 템플릿 리터럴에서 `\d` 는 «모르는 이스케이프»라 자바스크립트가 역슬래시를
   * 그냥 버린다 — `\dfrac{1}{2}` 가 `dfrac{1}{2}` 로 지면에 나간다. `\t` 는 더
   * 나쁘다: **탭 문자**가 되어 `\times` 가 «탭 + imes» 가 된다.
   *
   * 2026-08-27 에 실제로 났다. 셸 heredoc 을 거치며 `\\` 가 `\` 로 줄었고,
   * **tsc·vitest·KaTeX·값 검산이 전부 초록**이었다 — 값은 맞고 글자만 틀리기
   * 때문이다. 지면 냄새 판정기(`probe-middle-page-smells`)도 이 부류는 안 센다.
   *
   * 열쇠는 **손 목록이 아니다** — 「역슬래시 하나 + 영문 두 글자 이상」이라는
   * 모양으로 센다. 목록을 손으로 적으면 목록에 없는 명령은 구조적으로 0이 된다.
   * 주석 줄은 뺀다: 이 저장소의 주석은 LaTeX 를 한 겹으로 적어 설명하고, 그게 옳다.
   */
  const MINE = [
    "m2Func",
    "m2Center",
    "m2IneqApply",
    "m1Geo1",
    "m1Geo2",
    "m1Calc",
    "m2Counting",
    "m3Func",
  ];

  /** 자바스크립트가 실제로 아는 이스케이프 — 이건 우리가 쓴 것이 맞다. */
  const KNOWN_JS = new Set(["n"]);

  function lonelyBackslashes(src: string): string[] {
    const out: string[] = [];
    for (const rawLine of src.split("\n")) {
      const line = rawLine.trimStart();
      if (
        line.startsWith("//") ||
        line.startsWith("*") ||
        line.startsWith("/*")
      ) {
        continue;
      }
      const code =
        rawLine.includes("//") && !rawLine.includes("://")
          ? rawLine.slice(0, rawLine.indexOf("//"))
          : rawLine;
      for (const m of code.matchAll(/(?<!\\)\\([A-Za-z]{2,})/g)) {
        if (!KNOWN_JS.has(m[1]!)) out.push(m[0]!);
      }
    }
    return out;
  }

  it("눈금 — 이 검사가 «아니오» 를 낼 수 있다", () => {
    // 양성: 한 겹짜리는 잡는다.
    expect(lonelyBackslashes("const s = `$\\dfrac{1}{2}$`;")).toEqual([
      "\\dfrac",
    ]);
    // 음성: 두 겹짜리는 안 잡는다.
    expect(lonelyBackslashes("const s = `$\\\\dfrac{1}{2}$`;")).toEqual([]);
    // 음성: 주석은 한 겹이 옳다.
    expect(lonelyBackslashes(" * $\\dfrac{4}{2}$ 로 끝나면")).toEqual([]);
    // 음성: 줄바꿈은 우리가 쓴 것이 맞다.
    expect(lonelyBackslashes("const s = `가\\n나`;")).toEqual([]);
  });

  it.each(MINE)("%s.ts 의 문자열에 한 겹짜리 LaTeX 가 없다", (name) => {
    const src = readFileSync(
      path.resolve(process.cwd(), `src/lib/middle/${name}.ts`),
      "utf8",
    );
    const hits = lonelyBackslashes(src);
    expect(
      hits.slice(0, 8),
      `${name}.ts 에 역슬래시가 한 겹인 LaTeX ${hits.length}건 — 지면에 날 글자가 나간다`,
    ).toEqual([]);
  });
});

describe("중등 유형 갈래 C — 삼각형의 외심·내심", () => {
  const SEC_O = "삼각형의 외심";
  const SEC_I = "삼각형의 내심";

  it("70 외심이 만드는 세 이등변삼각형의 밑각 셋을 더하면 직각이다", () => {
    const { facts } = generatedCenter(SEC_O, "70");
    expect(facts!.p + facts!.q + facts!.x).toBe(90);
    expect(facts!.x).toBeGreaterThan(0);
  });

  it("71 세 변이 실제로 피타고라스를 이루고 넓이가 (빗변/2)^2·π 다", () => {
    const { facts } = generatedCenter(SEC_O, "71");
    expect(facts!.p ** 2 + facts!.q ** 2).toBe(facts!.h ** 2);
    expect(facts!.h % 2).toBe(0); // 반지름이 정수라야 지면이 깨끗하다
    expect(facts!.area).toBe((facts!.h / 2) ** 2);
  });

  it("72 반지름의 두 배가 빗변이고 나머지 변이 피타고라스로 맞는다", () => {
    const { facts } = generatedCenter(SEC_O, "72");
    expect(2 * facts!.r).toBe(facts!.h);
    expect(facts!.p ** 2 + facts!.q ** 2).toBe(facts!.h ** 2);
  });

  it("73 답한 변만 빗변이다 — 나머지 둘로는 성립하지 않는다", () => {
    const { facts } = generatedCenter(SEC_O, "73");
    const { p, q, h } = facts!;
    expect(p ** 2 + q ** 2).toBe(h ** 2);
    expect(p ** 2 + h ** 2).not.toBe(q ** 2);
    expect(q ** 2 + h ** 2).not.toBe(p ** 2);
  });

  it("74 밑각이 세 내각의 합에서 나오고 답이 그 절반이다", () => {
    const { facts } = generatedCenter(SEC_I, "74");
    expect(facts!.angA + 2 * facts!.base).toBe(180);
    expect(2 * facts!.x).toBe(facts!.base);
  });

  it("75 △IBC 의 넓이가 밑변×높이÷2 다 — 높이는 내접원의 반지름", () => {
    const { facts } = generatedCenter(SEC_I, "75");
    expect(2 * facts!.area).toBe(facts!.a * facts!.r);
  });

  it("76 답한 둘레로 되돌리면 발문의 넓이가 나온다", () => {
    const { facts } = generatedCenter(SEC_I, "76");
    // S = ½ · r · (둘레)
    expect(2 * facts!.S).toBe(facts!.r * facts!.perimeter);
  });
});

describe("중등 유형 갈래 C — 중점연결·무게중심·피타고라스", () => {
  const SEC_MID = "삼각형의 두 변의 중점을 연결한 선분";
  const SEC_G = "삼각형의 무게중심";
  const SEC_PY = "피타고라스 정리";

  it("70 사다리꼴 넓이 + 작은 삼각형 넓이 = 전체", () => {
    const { facts } = generatedCenter(SEC_MID, "70");
    // 닮음비 1:2 → 넓이비 1:4. 작은 쪽은 전체의 ¼.
    expect(4 * (facts!.S - facts!.ans)).toBe(facts!.S);
  });

  it("71 두 대각선의 중점을 이은 선분은 두 밑변 차의 절반이다", () => {
    const { facts } = generatedCenter(SEC_MID, "71");
    expect(2 * facts!.ans).toBe(facts!.bc - facts!.ad);
    expect(facts!.bc).toBeGreaterThan(facts!.ad); // 사다리꼴이 성립해야 한다
  });

  it("72 사각형 MBDN 의 둘레는 네 조각을 따로 더한 값과 같다", () => {
    const { facts } = generatedCenter(SEC_MID, "72");
    const MB = facts!.c / 2;
    const BD = facts!.a / 2;
    const DN = facts!.c / 2; // 중점연결정리 — AB 의 절반
    const NM = facts!.a / 2; // 중점연결정리 — BC 의 절반
    expect(MB + BD + DN + NM).toBe(facts!.ans);
  });

  it("73 답은 세 중선 합의 3분의 2 다", () => {
    const { facts } = generatedCenter(SEC_G, "73");
    expect(3 * facts!.ans).toBe(2 * facts!.total);
  });

  it("74 사각형 넓이 + 작은 삼각형 넓이 = 전체 (넓이비 4:9)", () => {
    const { facts } = generatedCenter(SEC_G, "74");
    const small = facts!.S - facts!.ans;
    expect(9 * small).toBe(4 * facts!.S);
  });

  it("70 세 변이 피타고라스를 이루고 넓이가 두 직각변의 곱의 절반이다", () => {
    const { facts } = generatedCenter(SEC_PY, "70");
    expect(facts!.p ** 2 + facts!.q ** 2).toBe(facts!.h ** 2);
    expect(2 * facts!.area).toBe(facts!.p * facts!.q);
  });
});
