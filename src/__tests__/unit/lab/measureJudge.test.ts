import { describe, expect, it } from "vitest";

import { judge } from "@/lib/lab/judge";
import {
  compareLonger,
  measuredLength,
  rulerAligned,
} from "@/lib/lab/judge/measure";

describe("길이 판정", () => {
  it("시작과 끝의 차이가 길이다", () => {
    expect(measuredLength(3, 10)).toBe(7);
    expect(measuredLength(2, 8)).toBe(6);
    expect(measuredLength(4, 12)).toBe(8);
  });

  it("자의 0이 막대 시작과 같을 때만 정렬로 본다", () => {
    expect(rulerAligned(3, 3)).toBe(true);
    expect(rulerAligned(0, 3)).toBe(false);
  });

  it("시작을 맞춘 비교는 더 긴 쪽을 고른다", () => {
    expect(compareLonger(7, 5)).toBe("left");
    expect(compareLonger(4, 4)).toBe("same");
  });

  it("정렬 모드에서 0이 안 맞으면 길이가 맞아도 오답이다", () => {
    const engine = {
      type: "ruler" as const,
      objectStart: 3,
      objectEnd: 10,
      rulerZero: 0,
      mode: "align" as const,
      max: 14,
    };
    expect(judge(engine, { rulerZero: 0, value: 7 }).ok).toBe(false);
    expect(judge(engine, { rulerZero: 3, value: 7 }).ok).toBe(true);
  });

  it("끝 숫자만 읽은 6이 아니라 2에서 8까지는 6이다", () => {
    const engine = {
      type: "ruler" as const,
      objectStart: 2,
      objectEnd: 8,
      rulerZero: 0,
      mode: "offset" as const,
      max: 14,
    };
    expect(judge(engine, { rulerZero: 0, value: 8 }).ok).toBe(false);
    expect(judge(engine, { rulerZero: 0, value: 6 }).ok).toBe(true);
  });
});
