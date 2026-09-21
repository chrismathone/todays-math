import { describe, expect, it } from "vitest";

import {
  CUBE_OPPOSITE,
  isCubeNet,
  NET_SVG_PAD,
  netSvgMetrics,
  SAMPLE_NETS,
} from "@/lib/lab/cubeNets";
import { judge } from "@/lib/lab/judge";
import {
  DEMO_STACK,
  frontHeights,
  hiddenFromFront,
  nudgeStackHeight,
  rightHeights,
  voxelCount,
} from "@/lib/lab/stackMath";

describe("공간 판정", () => {
  it("정육면체 A의 맞은편은 F, B의 맞은편은 C다", () => {
    expect(CUBE_OPPOSITE.A).toBe("F");
    expect(CUBE_OPPOSITE.B).toBe("C");
    expect(CUBE_OPPOSITE.D).toBe("E");
  });

  it("알려진 전개도와 겹치는 띠를 가른다", () => {
    for (const net of SAMPLE_NETS) {
      expect(isCubeNet(net.cells), net.id).toBe(net.valid);
    }
  });

  it("전개도 SVG 보기 상자는 칸 테두리가 잘리지 않게 여백을 둔다", () => {
    expect(NET_SVG_PAD).toBeGreaterThanOrEqual(8);
    for (const net of SAMPLE_NETS) {
      const m = netSvgMetrics(net.cells);
      expect(m.width, net.id).toBe(m.cols * m.size + m.pad * 2);
      expect(m.height, net.id).toBe(m.rows * m.size + m.pad * 2);
      for (const [r, c] of net.cells) {
        const x = m.pad + (c - m.minC) * m.size;
        const y = m.pad + (r - m.minR) * m.size;
        expect(x, net.id).toBeGreaterThanOrEqual(m.pad);
        expect(y, net.id).toBeGreaterThanOrEqual(m.pad);
        expect(x + m.size, net.id).toBeLessThanOrEqual(m.width - m.pad);
        expect(y + m.size, net.id).toBeLessThanOrEqual(m.height - m.pad);
      }
    }
  });

  it("접기 전에는 맞은편을 맞춰도 접기 미완은 관찰 미완료다", () => {
    const engine = {
      type: "cube-fold" as const,
      model: "cube" as const,
      fromFace: "A",
      correct: "F",
      choices: ["F"],
    };
    expect(judge(engine, { prediction: "F", fold: 40 }).ok).toBe(false);
    expect(judge(engine, { prediction: "F", fold: 100 }).ok).toBe(true);
    expect(
      judge({ ...engine, foldable: false }, { prediction: "F", fold: 0 }).ok,
    ).toBe(true);
    expect(judge(engine, { prediction: "B", fold: 100 }).ok).toBe(false);
  });

  it("쌓기나무 12개의 앞·옆 높이와 가려진 칸을 계산한다", () => {
    expect(voxelCount(DEMO_STACK)).toBe(12);
    expect(frontHeights(DEMO_STACK)).toEqual([2, 3, 1]);
    expect(rightHeights(DEMO_STACK)).toEqual([1, 3, 2]);
    expect(hiddenFromFront(DEMO_STACK)).toBe(6);
  });

  it("쌓기 칸은 올려도 3에서 멈추고 내려도 0에서 멈춘다", () => {
    expect(nudgeStackHeight(0, 1)).toBe(1);
    expect(nudgeStackHeight(2, 1)).toBe(3);
    expect(nudgeStackHeight(3, 1)).toBe(3);
    expect(nudgeStackHeight(3, -1)).toBe(2);
    expect(nudgeStackHeight(1, -1)).toBe(0);
    expect(nudgeStackHeight(0, -1)).toBe(0);
  });

  it("앞모습만으로 개수가 정해진다고 하면 오답이다", () => {
    const engine = {
      type: "choice" as const,
      options: [
        { id: "no", label: "no" },
        { id: "yes", label: "yes" },
      ],
      correct: "no",
    };
    expect(judge(engine, "yes").ok).toBe(false);
    expect(judge(engine, "no").ok).toBe(true);
  });
});
