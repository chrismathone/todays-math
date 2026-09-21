import { describe, expect, it } from "vitest";

import { judge } from "@/lib/lab/judge";
import {
  parallelogramArea,
  rectangleFromCut,
  sameAreaAfterMove,
  triangleFromParallelogram,
} from "@/lib/lab/judge/area";

describe("넓이 판정", () => {
  it("밑변과 수직 높이의 곱이 넓이다", () => {
    expect(parallelogramArea(6, 3)).toBe(18);
    expect(parallelogramArea(5, 4)).toBe(20);
  });

  it("기울어진 변을 높이로 쓰면 다른 값이 나온다", () => {
    expect(parallelogramArea(6, 5)).not.toBe(18);
  });

  it("조각을 끝까지 옮겨야 변환이 끝난다", () => {
    expect(rectangleFromCut(6, 3, 40, true).complete).toBe(false);
    expect(rectangleFromCut(6, 3, 100, false).complete).toBe(false);
    expect(rectangleFromCut(6, 3, 100, true)).toEqual({
      complete: true,
      area: 18,
    });
  });

  it("버리거나 겹치면 넓이가 보존되지 않는다", () => {
    expect(sameAreaAfterMove(false, false)).toBe(true);
    expect(sameAreaAfterMove(true, false)).toBe(false);
    expect(sameAreaAfterMove(false, true)).toBe(false);
  });

  it("대각선으로 나눈 삼각형은 절반이다", () => {
    expect(triangleFromParallelogram(6, 4)).toBe(12);
  });

  it("단위 칸은 덮은 개수가 넓이다", () => {
    const engine = { type: "unit-squares" as const, cols: 4, rows: 3 };
    expect(judge(engine, [0, 1, 2]).ok).toBe(false);
    expect(
      judge(
        engine,
        Array.from({ length: 12 }, (_, i) => i),
      ).ok,
    ).toBe(true);
    expect(judge(engine, 12).ok).toBe(true);
  });

  it("잘라 옮긴 뒤 이유까지 맞아야 정답이다", () => {
    const engine = { type: "area-cut" as const, base: 6, height: 3, skew: 2 };
    expect(judge(engine, { cut: true, slide: 100, reason: "looks" }).ok).toBe(
      false,
    );
    expect(judge(engine, { cut: true, slide: 100, reason: "same" }).ok).toBe(
      true,
    );
  });
});
