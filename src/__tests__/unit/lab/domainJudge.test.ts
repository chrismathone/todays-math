import { describe, expect, it } from "vitest";

import {
  bundleParts,
  hourFromAngle,
  isBundled,
  isShaded,
  machineComplete,
  minuteFromAngle,
  nudgeCopies,
  nudgeTens,
  ratioAmounts,
  symmetryComplete,
} from "@/lib/lab/domainMath";
import { judge } from "@/lib/lab/judge";

describe("묶음·분수·대칭·대응·비 판정", () => {
  it("34는 십 묶음 3과 낱개 4이고 더 묶이지 않는다", () => {
    expect(bundleParts(34, 0)).toEqual({ tens: 0, ones: 34 });
    expect(nudgeTens(34, 0, 1)).toBe(1);
    expect(nudgeTens(34, 3, 1)).toBe(3);
    expect(nudgeTens(34, 0, -1)).toBe(0);
    expect(isBundled(34, 3)).toBe(true);
    expect(isBundled(34, 2)).toBe(false);
  });

  it("4칸 중 3칸을 칠하면 세 칸이고 두 칸은 아니다", () => {
    expect(isShaded([0, 2, 3], 4, 3)).toBe(true);
    expect(isShaded([0, 1], 4, 3)).toBe(false);
    expect(isShaded([0, 1, 1, 2], 4, 3)).toBe(true);
  });

  it("세로 대칭축 왼쪽 칸의 짝은 오른쪽이다", () => {
    const seed = [
      [0, 0],
      [1, 1],
    ] as const;
    expect(
      symmetryComplete([[...seed[0]], [...seed[1]]], ["0,3", "1,2"], 2, 4, "v"),
    ).toBe(true);
    expect(
      symmetryComplete([[...seed[0]], [...seed[1]]], ["0,3"], 2, 4, "v"),
    ).toBe(false);
  });

  it("대응 기계를 모두 넣어 보고 2:3 묶음 두 개가 4와 6이다", () => {
    expect(machineComplete(["1", "2", "3"], 3)).toBe(true);
    expect(machineComplete(["1", "1"], 3)).toBe(false);
    expect(ratioAmounts(2, 3, 2)).toEqual({ left: 4, right: 6 });
    expect(nudgeCopies(0, 1, 4)).toBe(1);
    expect(nudgeCopies(4, 1, 4)).toBe(4);
  });

  it("판정기가 새 조작 답을 가른다", () => {
    expect(judge({ type: "bundle", total: 34 }, 3).ok).toBe(true);
    expect(judge({ type: "bundle", total: 34 }, 2).ok).toBe(false);
    expect(
      judge({ type: "fraction-bar", parts: 4, filled: 3 }, [0, 1, 2]).ok,
    ).toBe(true);
    expect(
      judge(
        {
          type: "symmetry",
          rows: 2,
          cols: 4,
          axis: "v",
          seed: [
            [0, 0],
            [1, 1],
          ],
        },
        ["0,3", "1,2"],
      ).ok,
    ).toBe(true);
    expect(
      judge(
        {
          type: "machine",
          pairs: [
            [1, 3],
            [2, 5],
            [3, 7],
          ],
        },
        ["0", "1", "2"],
      ).ok,
    ).toBe(true);
    expect(judge({ type: "ratio", a: 2, b: 3, copies: 2 }, 2).ok).toBe(true);
    expect(judge({ type: "ratio", a: 2, b: 3, copies: 2 }, 1).ok).toBe(false);
    expect(judge({ type: "share", total: 12, groups: 3 }, [4, 4, 4]).ok).toBe(
      true,
    );
    expect(judge({ type: "share", total: 12, groups: 3 }, [5, 4, 3]).ok).toBe(
      false,
    );
    expect(hourFromAngle(0)).toBe(12);
    expect(hourFromAngle(90)).toBe(3);
    expect(minuteFromAngle(0)).toBe(0);
    expect(minuteFromAngle(180)).toBe(30);
    expect(
      judge({ type: "clock", hour: 3, minute: 0 }, { hour: 3, minute: 0 }).ok,
    ).toBe(true);
    expect(judge({ type: "angle", degrees: 90 }, 90).ok).toBe(true);
    expect(judge({ type: "nline", min: 0, max: 10, target: 7 }, 7).ok).toBe(
      true,
    );
    expect(judge({ type: "nline", min: 0, max: 10, target: 7 }, 6).ok).toBe(
      false,
    );
    expect(
      judge({ type: "level", piles: [3, 5, 7], target: 5 }, [5, 5, 5]).ok,
    ).toBe(true);
    expect(
      judge({ type: "surface", l: 3, w: 2, h: 4 }, [
        "top",
        "bottom",
        "front",
        "back",
        "left",
        "right",
      ]).ok,
    ).toBe(true);
    expect(
      judge(
        {
          type: "solid",
          shape: "cylinder",
          options: [{ id: "rect", label: "직사각형" }],
          correct: "rect",
        },
        "rect",
      ).ok,
    ).toBe(true);
  });
});
