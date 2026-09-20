import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  figureObjects,
  prepareFigureSvg,
} from "@/components/unified/figure-editor/figureSvgEditing";
import {
  ANGLE_MARK_RADIUS,
  angleMarkPath,
} from "@/components/unified/figure-editor/figureAngleMark";
import { applyFigureEdits } from "@/components/unified/figure-editor/figureEditApply";

/**
 * 새 각 표시의 크기 — 원장님 2026-09-20 «AI 가 새로 그리는 각 표시 호를 엔진과 같은 22 로».
 * 2026-09-20 전에는 이웃 각 표시가 없으면 `min(22, 긴 변의 8%)` 라, 엔진 그림(틀 150~310px)에서
 * 17~20 으로 그려져 **같은 그림 안의 엔진 호(22)보다 작았다**. 틀 크기는 이제 안 본다.
 * 그림이 작아 22 가 변을 넘치면 `angleMarkPath` 가 짧은 변의 절반까지 줄인다 — 그 한 자리뿐이다.
 */

// 도형 엔진 v2 가 실제로 그린 삼각형 ABC(scripts/figure/render_spec.py, 2026-09-20) — 각 표시가 **없는** 판.
// 틀이 206.654 × 147.324 라 옛 규칙이면 반지름이 0.08 × 206.654 = 16.53 이 된다.
const TRIANGLE = `<svg viewBox="0 0 206.654 147.324" xmlns="http://www.w3.org/2000/svg">
  <rect width="206.654" height="147.324" fill="#ffffff" />
  <g>
    <line x1="98.327" y1="29.948" x2="28.327" y2="129.948" stroke="#111111" stroke-width="1.9" />
    <line x1="28.327" y1="129.948" x2="178.327" y2="129.948" stroke="#111111" stroke-width="1.9" />
    <line x1="178.327" y1="129.948" x2="98.327" y2="29.948" stroke="#111111" stroke-width="1.9" />
  </g>
  <g>
  </g>
  <g>
    <text x="98.327" y="24.6" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" data-px="98.327" data-py="29.948" data-mj="A"><tspan font-style="normal">A</tspan></text>
    <text x="17.603" y="135.324" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" data-px="28.327" data-py="129.948" data-mj="B"><tspan font-style="normal">B</tspan></text>
    <text x="189.051" y="135.324" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" data-px="178.327" data-py="129.948" data-mj="C"><tspan font-style="normal">C</tspan></text>
  </g>
</svg>`;
// 같은 스펙에 `angles: {b: {vertex: "B", points: ["A", "C"]}}` 만 더해 엔진이 그린 각 B 의 호 —
// 반지름 22.0 이다(틀은 213.277 × 164.898 로 넓어진다). 우리가 더하는 호가 이것과 같아야 한다.
const ENGINE_ANGLE_B = `M 47.6 111.9 A 22.0 22.0 0 0 1 57.0 129.9`;

const arcOf = (d: string) => {
  expect(d).toMatch(
    /^M [-\d.]+ [-\d.]+ A [-\d.]+ [-\d.]+ 0 [01] [01] [-\d.]+ [-\d.]+$/,
  );
  const v = d.match(/[-\d.]+/g)!.map(Number);
  return { p0: [v[0], v[1]], r: v[2], p1: [v[7], v[8]] };
};

describe("새 각 표시의 반지름 — 엔진과 같은 22", () => {
  it("keeps the engine's radius in a small engine figure instead of shrinking with the canvas", () => {
    const triangle = prepareFigureSvg(TRIANGLE);
    const before = figureObjects(triangle).length;
    const result = applyFigureEdits(triangle, [
      { op: "addAngle", at: "B", from: "A", to: "C" },
    ]);
    expect(result.rejected).toEqual([]);
    const added = figureObjects(result.svg)[before];
    const { p0, r, p1 } = arcOf(added.attrs.d);
    // 엔진이 같은 각에 그린 호와 같은 반지름 — 틀의 8%(16.53)가 아니다
    expect(r).toBe(ANGLE_MARK_RADIUS);
    expect(arcOf(ENGINE_ANGLE_B).r).toBe(r);
    // 두 끝이 BA 위·BC 위, B 에서 22 만큼(끝점은 소수 둘째 자리로 반올림돼 0.03 까지 어긋난다)
    const B = [28.327, 129.948];
    const far = (p: number[]) => Math.hypot(p[0] - B[0], p[1] - B[1]);
    expect(far(p0)).toBeCloseTo(22, 1);
    expect(far(p1)).toBeCloseTo(22, 1);
  });

  it("still shrinks when 22 would overflow the shorter side", () => {
    // 변이 30 인 각 — 22 는 변을 넘는다. 짧은 변의 절반(15)까지 줄인다(그 한계는 angleMarkPath 한 곳).
    const tight = angleMarkPath({
      at: [0, 0],
      from: [30, 0],
      to: [0, 30],
      right: false,
    });
    expect("d" in tight && arcOf(tight.d).r).toBe(15);
    // 변이 넉넉하면 그대로 22
    const roomy = angleMarkPath({
      at: [0, 0],
      from: [120, 0],
      to: [0, 120],
      right: false,
    });
    expect("d" in roomy && arcOf(roomy.d).r).toBe(ANGLE_MARK_RADIUS);
  });

  it("matches the engine's own angle_radius", () => {
    // 엔진을 갱신했을 때 값이 갈라지면 여기서 걸린다(vendor 는 상류 사본이다)
    const engine = readFileSync(
      "vendor/figure-engine/core/figure_scene.py",
      "utf8",
    );
    const radius = engine.match(/^\s*angle_radius: float = ([\d.]+)$/m)?.[1];
    expect(radius).toBeDefined();
    expect(Number(radius)).toBe(ANGLE_MARK_RADIUS);
  });
});
