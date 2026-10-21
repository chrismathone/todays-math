import { describe, expect, it } from "vitest";

import {
  numberRetention,
  numbersIn,
  seedOf,
  splitChoices,
} from "../../../scripts/qa/textbook-twin/twinHelpers";

describe("교과서 쌍둥이 시범 — 엔진 쪽 순수 함수", () => {
  it("씨앗은 문항 코드마다 결정적이고 코드가 다르면 갈린다", () => {
    expect(seedOf("J20501-A65-001")).toBe(seedOf("J20501-A65-001"));
    expect(seedOf("J20501-A65-001")).not.toBe(seedOf("J20501-A65-002"));
    expect(Number.isInteger(seedOf("x"))).toBe(true);
  });

  it("수는 소수점을 붙여 세고 세 자리 자릿점은 걷는다", () => {
    expect(numbersIn("$2,000$원과 $0.5$ 배, $x^{2}$")).toEqual([
      "2000",
      "0.5",
      "2",
    ]);
    expect(numbersIn("$1,5$ 와 $12,3456$")).toEqual(["1", "5", "12", "3456"]);
  });

  it("수 보존율은 원본의 서로 다른 수 가운데 쌍둥이에 남은 몫이다(0 · 1 도 센다)", () => {
    expect(numberRetention(["1", "3", "3", "5"], ["1", "7", "9"])).toBeCloseTo(
      1 / 3,
    );
    expect(numberRetention(["2", "4"], ["2", "4"])).toBe(1);
    expect(numberRetention([], ["2"])).toBe(0);
  });

  it("보기 ①~⑤ 를 줄마다 · 한 줄에 붙은 꼴 모두 떼어 낸다", () => {
    expect(
      splitChoices("다음 중 옳은 것은?\n① $1$\n② $2$\n③ $3$\n④ $4$\n⑤ $5$"),
    ).toEqual({
      stem: "다음 중 옳은 것은?",
      choices: ["$1$", "$2$", "$3$", "$4$", "$5$"],
    });
    expect(splitChoices("값은?\n① 1 ② 2 ③ 3 ④ 4 ⑤ 5").choices).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
    expect(splitChoices("보기 없는 발문")).toEqual({
      stem: "보기 없는 발문",
      choices: [],
    });
  });
});
