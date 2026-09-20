import { describe, expect, it } from "vitest";
import {
  figureObjects,
  prepareFigureSvg,
  readFigureSvg,
} from "@/components/unified/figure-editor/figureSvgEditing";
import {
  figureAngleKinds,
  groupFigureObjects,
} from "@/components/unified/figure-editor/figureObjectGroups";
import { objectName } from "@/components/unified/figure-editor/figureObjectNames";
import { applyFigureEdits } from "@/components/unified/figure-editor/figureEditApply";
import { describeFigureForEdit } from "@/components/unified/figure-editor/figureEditElements";

/**
 * 요소 이름 — 원장님 2026-09-20 «부채꼴의 호·AI 가 더한 호를 곡선이라 부르지 말고 «호»라고 해».
 * 이름이 나오는 **모든 자리**(요소 목록 단추 · 오른쪽 칸 제목 · AI 에게 보내는 요소 종류 · 적용 결과 줄)가
 * `objectName` 하나를 쓴다 — 여기서 그 한 함수로 세 갈래를 **한 그림**에서 견준다.
 *
 *   부채꼴의 호 = «호» · 치수 곡선 = «곡선/경로» · 각 표시 = «각»(직각·예각·둔각)
 *
 * 각 표시 판정(figureObjectGroups.ts `arcAngleMark`)이 **먼저**다 — 각의 호도 `M … A …` 한 획이라
 * 모양만으로는 부채꼴의 호와 같다. 가르는 것은 «중심을 지나는 변이 호 너머로 뻗는가»다.
 * 그림은 도형 엔진 v2 가 실제로 그린 것(scripts/figure/render_spec.py, 2026-09-20 —
 * 부채꼴 OAB(중심각 100°) · 중심각 표시 · 선분 OA 치수 «9 cm»).
 */
const SECTOR = `<svg viewBox="0 0 169.311 149.622" xmlns="http://www.w3.org/2000/svg">
  <rect width="169.311" height="149.622" fill="#ffffff" />
  <g>
    <line x1="52.052" y1="113.874" x2="140.685" y2="98.245" stroke="#111111" stroke-width="1.9" />
    <line x1="52.052" y1="113.874" x2="21.271" y2="29.301" stroke="#111111" stroke-width="1.9" />
    <path d="M 140.685 98.245 A 90 90 0 0 0 21.271 29.301" fill="none" stroke="#111111" stroke-width="1.9" />
  </g>
  <g>
    <path d="M 73.7 110.1 A 22.0 22.0 0 0 0 44.5 93.2" fill="none" stroke="#111111" stroke-width="0.72" />
    <path d="M 77.099 126.289 Q 66.488 122.29 55.007 113.353 M 121.396 118.479 Q 129.999 111.092 137.731 98.766" fill="none" stroke="#111111" stroke-width="0.72" stroke-dasharray="5 3" stroke-linecap="round" />
  </g>
  <g>
    <text x="64.582" y="97.547" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" font-style="italic" text-anchor="middle" fill="#111111" paint-order="stroke" stroke="#ffffff" stroke-width="3.15" stroke-linejoin="round" data-mj="100°"><tspan font-style="normal">100</tspan><tspan font-style="normal" font-size="10.584" dy="-5.342">°</tspan><tspan dy="5.342" /></text>
    <text x="100.404" y="134.322" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" paint-order="stroke fill" stroke="#ffffff" stroke-width="5.6" stroke-linejoin="round" data-mj="9 cm"><tspan font-style="normal">9 cm</tspan></text>
    <text x="151.246" y="101.759" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" data-px="140.685" data-py="98.245" data-mj="A"><tspan font-style="normal">A</tspan></text>
    <text x="17.603" y="24.6" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" data-px="21.271" data-py="29.301" data-mj="B"><tspan font-style="normal">B</tspan></text>
    <text x="41.491" y="121.112" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" data-px="52.052" data-py="113.874" data-mj="O"><tspan font-style="normal">O</tspan></text>
  </g>
</svg>`;

const viewBoxOf = (svg: string) =>
  readFigureSvg(svg)
    .documentElement.getAttribute("viewBox")!
    .split(/[\s,]+/)
    .map(Number);
/** 그림의 모든 요소 이름 — 요소 목록·오른쪽 칸 제목·AI 요소 목록·결과 줄이 다 이 한 줄을 쓴다. */
const namesIn = (svg: string) => {
  const objects = figureObjects(svg);
  const angles = figureAngleKinds(objects, viewBoxOf(svg));
  return objects.map((o) => objectName(o, angles));
};

describe("요소 이름 — 원호는 «호»", () => {
  const sector = prepareFigureSvg(SECTOR);

  it("tells the sector's arc, the dimension curve and the angle mark apart in one figure", () => {
    expect(namesIn(sector)).toEqual([
      "선분", // OA
      "선분", // OB
      "호", // 부채꼴의 호 — `M … A …` 한 획, 반지름 90
      "둔각", // 중심각 표시 — 같은 `M … A …` 한 획이지만 각 표시 판정이 먼저다
      "곡선/경로", // 치수선 — 두 조각 베지어(Q) 점선
      "글자", // 100°
      "글자", // 9 cm
      "글자", // A
      "글자", // B
      "글자", // O
    ]);
  });

  it("puts the arc in its own group and leaves the angle mark in «각»", () => {
    // 묶음 이름도 같은 함수에서 나온다(groupFigureObjects → objectName) — 목록이 «호»와 «곡선/경로»로 갈린다
    const groups = groupFigureObjects(figureObjects(sector), viewBoxOf(sector));
    expect(groups.map((g) => g.name)).toEqual([
      "선분",
      "호",
      "각",
      "점선", // 치수 곡선은 점선이라 역할 묶음이 먼저 잡는다 — 이름은 «곡선/경로» 그대로
      "글자",
    ]);
  });

  it("sends the same name to the AI as the list shows", () => {
    // 원장님 «모든 화면 일치» — AI 에게 보내는 요소 종류도 같은 `objectName` 에서 나온다
    const kinds = describeFigureForEdit(sector).elements.map((e) => e.kind);
    expect(kinds).toEqual(namesIn(sector));
    expect(kinds[2]).toBe("호");
  });

  it("names the arc that the AI adds «호», like the engine's own", () => {
    // AI 가 더한 호(addArc)도 엔진 호와 같은 `M … A …` 한 획이다 — 이름이 갈리면 안 된다
    const result = applyFigureEdits(sector, [
      { op: "addArc", center: "O", from: "A", to: "B" },
    ]);
    expect(result.rejected).toEqual([]);
    expect(namesIn(result.svg).at(-1)).toBe("호");
  });

  it("keeps a free curve and an elliptical arc as «곡선/경로»", () => {
    // 한 원 위의 호만 «호»다 — 베지어(Q·C) 자유 곡선·타원 호(rx ≠ ry)는 그대로
    const curves = prepareFigureSvg(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">` +
        `<path d="M 20 180 Q 80 20 140 180" fill="none" stroke="#111111" />` +
        `<path d="M 160 180 C 180 20 240 20 280 180" fill="none" stroke="#111111" />` +
        `<path d="M 20 100 A 60 30 0 0 1 140 100" fill="none" stroke="#111111" />` +
        `<path d="M 160 100 A 40 40 0 0 1 240 100" fill="none" stroke="#111111" />` +
        `</svg>`,
    );
    expect(namesIn(curves)).toEqual([
      "곡선/경로",
      "곡선/경로",
      "곡선/경로",
      "호",
    ]);
  });
});
