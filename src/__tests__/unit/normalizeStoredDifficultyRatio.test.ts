import { describe, expect, it } from "vitest";

import { normalizeStoredDifficultyRatio } from "@/lib/class/normalizeDifficultyRatio";

describe("normalizeStoredDifficultyRatio", () => {
  it("기존 사용자가 직접 설정한 3단계 배분을 보존한다", () => {
    expect(
      normalizeStoredDifficultyRatio({ easy: 2, mid: 5, hard: 1 }),
    ).toEqual({
      연산: 0,
      기본: 2,
      응용: 5,
      심화하: 1,
      심화중: 0,
      심화상: 0,
    });
  });

  it("4단계 배분의 심화를 심화하로 옮긴다", () => {
    expect(
      normalizeStoredDifficultyRatio({ 연산: 2, 기본: 2, 응용: 3, 심화: 1 }),
    ).toEqual({
      연산: 2,
      기본: 2,
      응용: 3,
      심화하: 1,
      심화중: 0,
      심화상: 0,
    });
  });

  it("알 수 없는 형태를 기본값으로 조용히 바꾸지 않는다", () => {
    expect(() => normalizeStoredDifficultyRatio({ easy: 8 })).toThrow();
  });
});
