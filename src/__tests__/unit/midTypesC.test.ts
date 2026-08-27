import { describe, expect, it } from "vitest";

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
