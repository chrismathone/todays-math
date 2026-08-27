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
