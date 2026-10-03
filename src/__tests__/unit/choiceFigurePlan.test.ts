/**
 * 「보기 칸에 어느 그림을 넣는가」 — 조판 · 넘침 자 · 적재기가 같이 쓰는 판단(2026-10-03 3자 합의 B1).
 *
 * 요점은 «모를 때 어느 쪽으로 받는가»다. 반쪽만 맞는 짝은 받지 않는다 —
 * 그림 하나가 글 보기를 가리키거나, `[그림]` 보기 하나가 그림을 못 받으면 통째로 «모른다».
 */
import { describe, expect, it } from "vitest";

import {
  hasUnlinkedFigureChoices,
  isFigureChoice,
  planChoiceFigures,
} from "@/lib/problem/choiceFigureIndex";

const FIVE = ["[그림]", "[그림]", "[그림]", "[그림]", "[그림]"];

describe("isFigureChoice", () => {
  it("본문이 자국뿐인 보기만 그림 보기다", () => {
    expect(isFigureChoice("[그림]")).toBe(true);
    expect(isFigureChoice("  [그림] ")).toBe(true);
    expect(isFigureChoice("[그림] 위로 볼록한 곡선")).toBe(false);
    expect(isFigureChoice("$y=2x$")).toBe(false);
    expect(isFigureChoice("")).toBe(false);
  });
});

describe("planChoiceFigures", () => {
  it("대구일 3 의 꼴 — 보기 다섯 뒤에 발문 그림 한 장", () => {
    const plan = planChoiceFigures(6, [1, 2, 3, 4, 5, 0], FIVE);
    expect(plan).not.toBeNull();
    expect(plan!.stem).toEqual([5]);
    expect(plan!.byChoice).toEqual({ 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 });
  });

  it("발문 그림이 없어도 된다 — 안심 8 의 꼴", () => {
    const plan = planChoiceFigures(5, [1, 2, 3, 4, 5], FIVE);
    expect(plan!.stem).toEqual([]);
    expect(Object.keys(plan!.byChoice)).toHaveLength(5);
  });

  it("발문 그림은 여럿일 수 있고 원래 차례를 지킨다", () => {
    const plan = planChoiceFigures(7, [0, 1, 2, 0, 3, 4, 5], FIVE);
    expect(plan!.stem).toEqual([0, 3]);
    expect(plan!.byChoice[3]).toBe(4);
  });

  it("⑤ 만 글인 문항 — 그림 넷이 ① ~ ④ 에 붙는다", () => {
    const choices = [
      "[그림]",
      "[그림]",
      "[그림]",
      "[그림]",
      "해당하는 그래프가 없다.",
    ];
    const plan = planChoiceFigures(4, [1, 2, 3, 4], choices);
    expect(plan!.byChoice).toEqual({ 1: 0, 2: 1, 3: 2, 4: 3 });
  });

  it("빈 배열 · 길이가 다른 배열 · 겹친 번호는 «모른다»", () => {
    expect(planChoiceFigures(6, [], FIVE)).toBeNull();
    expect(planChoiceFigures(6, null, FIVE)).toBeNull();
    expect(planChoiceFigures(6, [1, 2, 3, 4, 5], FIVE)).toBeNull();
    expect(planChoiceFigures(6, [1, 2, 3, 3, 5, 0], FIVE)).toBeNull();
  });

  it("그림이 «글 보기»를 가리키면 «모른다» — 그 그림은 조판에서 사라질 것이다", () => {
    const choices = ["[그림]", "[그림]", "[그림]", "[그림]", "$y=2x$"];
    expect(planChoiceFigures(5, [1, 2, 3, 4, 5], choices)).toBeNull();
  });

  it("그림이 없는 보기 번호를 가리키면 «모른다»", () => {
    expect(planChoiceFigures(6, [1, 2, 3, 4, 6, 0], FIVE)).toBeNull();
  });

  it("`[그림]` 보기 하나가 그림을 못 받으면 «모른다» — 반쪽 짝은 받지 않는다", () => {
    expect(planChoiceFigures(5, [1, 2, 3, 4, 0], FIVE)).toBeNull();
  });

  it("보기 그림이 하나도 없으면 «모른다» — 오늘의 조판과 다를 것이 없다", () => {
    expect(
      planChoiceFigures(2, [0, 0], ["$1$", "$2$", "$3$", "$4$", "$5$"]),
    ).toBeNull();
  });
});

describe("hasUnlinkedFigureChoices", () => {
  it("`[그림]` 보기가 있는데 짝을 모르면 참 — 출제에서 뺄 문항이다", () => {
    expect(hasUnlinkedFigureChoices(6, [], FIVE)).toBe(true);
    expect(hasUnlinkedFigureChoices(5, [1, 2, 3, 4, 0], FIVE)).toBe(true);
  });

  it("짝을 알면 거짓", () => {
    expect(hasUnlinkedFigureChoices(6, [1, 2, 3, 4, 5, 0], FIVE)).toBe(false);
  });

  it("글 보기뿐인 문항은 배열이 비어 있어도 거짓 — 은행의 거의 전부가 이 꼴이다", () => {
    expect(
      hasUnlinkedFigureChoices(1, [], ["$1$", "$2$", "$3$", "$4$", "$5$"]),
    ).toBe(false);
    expect(hasUnlinkedFigureChoices(0, [], [])).toBe(false);
  });
});
