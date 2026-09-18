import { describe, expect, it } from "vitest";
import {
  figureObjects,
  prepareFigureSvg,
  setFigureGroup,
} from "@/components/unified/figure-editor/figureSvgEditing";
import { groupFigureObjects } from "@/components/unified/figure-editor/figureObjectGroups";

/**
 * 요소 목록을 역할로 묶는다 — 요소 38개가 «선분 선분 선분 … 글자 글자» 로 늘어서 무엇이 무엇인지 몰랐다
 * (원장님 2026-09-18 «요소목록을 스마트하게 그룹화» → «역할별로 묶고 사용자 커스텀도 가능하게»).
 */
const NS = "http://www.w3.org/2000/svg";
// 원장님 화면의 속력-시간 그래프와 같은 짜임 — 축 둘 · 화살촉 둘 · 꺾은선 5 · 눈금 10 · 점 6 · 숫자 11 · 축 이름 2
function speedGraph() {
  const X0 = 60,
    Y0 = 250,
    px = (t: number) => X0 + t * 1.9,
    py = (v: number) => Y0 - v * 45;
  const parts = [
    `<line x1="${X0}" y1="${Y0}" x2="${px(195)}" y2="${Y0}" stroke="#111"/>`,
    `<polygon points="${px(195)},${Y0 - 4} ${px(195) + 9},${Y0} ${px(195)},${Y0 + 4}" fill="#111"/>`,
    `<line x1="${X0}" y1="${Y0}" x2="${X0}" y2="${py(4.6)}" stroke="#111"/>`,
    `<polygon points="${X0 - 4},${py(4.6)} ${X0},${py(4.6) - 9} ${X0 + 4},${py(4.6)}" fill="#111"/>`,
  ];
  const pts: [number, number][] = [
    [0, 0],
    [30, 1],
    [60, 4],
    [120, 4],
    [150, 1],
    [180, 0],
  ];
  for (let i = 0; i < pts.length - 1; i++)
    parts.push(
      `<line x1="${px(pts[i][0])}" y1="${py(pts[i][1])}" x2="${px(pts[i + 1][0])}" y2="${py(pts[i + 1][1])}" stroke="#111"/>`,
    );
  for (const t of [30, 60, 90, 120, 150, 180])
    parts.push(
      `<line x1="${px(t)}" y1="${Y0 - 5}" x2="${px(t)}" y2="${Y0 + 5}" stroke="#111"/>`,
    );
  for (const v of [1, 2, 3, 4])
    parts.push(
      `<line x1="${X0 - 5}" y1="${py(v)}" x2="${X0 + 5}" y2="${py(v)}" stroke="#111"/>`,
    );
  for (const t of [0, 30, 60, 90, 120, 150, 180])
    parts.push(
      `<text x="${px(t) - 10}" y="${Y0 + 26}" font-size="20" data-mj="${t}">${t}</text>`,
    );
  for (const v of [1, 2, 3, 4])
    parts.push(
      `<text x="${X0 - 26}" y="${py(v) + 7}" font-size="20" data-mj="${v}">${v}</text>`,
    );
  parts.push(
    `<text x="${px(190)}" y="${Y0 + 30}" font-size="22" data-mj="x(초)">x(초)</text>`,
    `<text x="${X0 - 30}" y="${py(4.6) - 14}" font-size="22" data-mj="$y(\\mathrm{m/sec})$">y</text>`,
  );
  for (const [t, v] of pts)
    parts.push(`<circle cx="${px(t)}" cy="${py(v)}" r="2.5" fill="#111"/>`);
  return prepareFigureSvg(
    `<svg xmlns="${NS}" viewBox="0 0 480 300">${parts.join("")}</svg>`,
  );
}
const viewBoxOf = (svg: string) =>
  svg
    .match(/viewBox="([^"]+)"/)![1]
    .split(/[\s,]+/)
    .map(Number);
const grouped = (svg: string) => {
  const objects = figureObjects(svg);
  const number = new Map(objects.map((o, i) => [o.id, i + 1]));
  return groupFigureObjects(objects, viewBoxOf(svg)).map((g) => ({
    name: g.name,
    custom: g.custom,
    numbers: g.ids.map((id) => number.get(id)),
  }));
};

describe("groupFigureObjects — 역할로 묶기", () => {
  // 묶음 차례는 첫 요소의 번호 차례 — 그림 위 번호와 같은 차례로 읽힌다.
  it("좌표 그래프는 축·그래프·눈금·눈금 숫자·축 이름·점으로 묶는다", () => {
    expect(grouped(speedGraph())).toEqual([
      { name: "x축", custom: false, numbers: [1, 2] },
      { name: "y축", custom: false, numbers: [3, 4] },
      { name: "그래프", custom: false, numbers: [5, 6, 7, 8, 9] },
      {
        name: "눈금",
        custom: false,
        numbers: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
      },
      {
        name: "눈금 숫자",
        custom: false,
        numbers: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
      },
      { name: "축 이름", custom: false, numbers: [31, 32] },
      { name: "점", custom: false, numbers: [33, 34, 35, 36, 37, 38] },
    ]);
  });
  it("세로선이 곧아도 화살촉·눈금이 없으면 축으로 보지 않는다", () => {
    const svg = prepareFigureSvg(
      `<svg xmlns="${NS}" viewBox="0 0 300 200">` +
        `<line x1="40" y1="160" x2="260" y2="160" stroke="#111"/>` +
        `<line x1="150" y1="30" x2="150" y2="160" stroke="#111"/>` +
        `</svg>`,
    );
    expect(grouped(svg)).toEqual([
      { name: "선분", custom: false, numbers: [1, 2] },
    ]);
  });
  it("축이 없는 도형은 종류로 묶고, 점선은 따로 둔다", () => {
    const svg = prepareFigureSvg(
      `<svg xmlns="${NS}" viewBox="0 0 300 200">` +
        `<line x1="40" y1="160" x2="260" y2="160" stroke="#111"/>` +
        `<line x1="260" y1="160" x2="150" y2="30" stroke="#111"/>` +
        `<line x1="150" y1="30" x2="40" y2="160" stroke="#111"/>` +
        `<line x1="150" y1="30" x2="150" y2="160" stroke="#111" stroke-dasharray="5 4"/>` +
        `<circle cx="150" cy="110" r="40" fill="none" stroke="#111"/>` +
        `<text x="30" y="178">B</text><text x="262" y="178">C</text><text x="146" y="22">A</text>` +
        `</svg>`,
    );
    expect(grouped(svg)).toEqual([
      { name: "선분", custom: false, numbers: [1, 2, 3] },
      { name: "점선", custom: false, numbers: [4] },
      { name: "원", custom: false, numbers: [5] },
      { name: "글자", custom: false, numbers: [6, 7, 8] },
    ]);
  });
  it("사용자가 만든 묶음이 먼저 오고, 그 요소는 역할 묶음에서 빠진다", () => {
    const svg = setFigureGroup(speedGraph(), ["obj-4", "obj-5"], "앞 구간");
    const groups = grouped(svg);
    expect(groups[0]).toEqual({
      name: "앞 구간",
      custom: true,
      numbers: [5, 6],
    });
    expect(groups.find((g) => g.name === "그래프")!.numbers).toEqual([7, 8, 9]);
  });
  it("이름을 바꾸면 사용자 묶음이 되고, 원문에 남는다", () => {
    const graph = ["obj-4", "obj-5", "obj-6", "obj-7", "obj-8"];
    const renamed = setFigureGroup(speedGraph(), graph, "속력");
    expect(grouped(renamed)[0]).toEqual({
      name: "속력",
      custom: true,
      numbers: [5, 6, 7, 8, 9],
    });
    expect(grouped(renamed).some((g) => g.name === "그래프")).toBe(false);
    // 저장·다시 열기(원문 정리)를 거쳐도 남는다
    expect(prepareFigureSvg(renamed)).toContain('data-group="속력"');
    // 표시를 지우면 역할 어림으로 돌아간다
    expect(grouped(setFigureGroup(renamed, graph, null))[2].name).toBe(
      "그래프",
    );
  });
  it("역할 묶음 이름으로 옮기면 그 묶음에 번호 차례대로 합쳐진다", () => {
    const moved = setFigureGroup(speedGraph(), ["obj-19"], "그래프");
    expect(grouped(moved).find((g) => g.name === "그래프")!.numbers).toEqual([
      5, 6, 7, 8, 9, 20,
    ]);
    expect(grouped(moved).find((g) => g.name === "눈금 숫자")!.numbers).toEqual(
      [21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
    );
  });
  it("해제한 요소는 역할로 다시 묶지 않고 맨 끝 «묶음 없음»에 둔다", () => {
    const released = setFigureGroup(
      speedGraph(),
      ["obj-32", "obj-33", "obj-34"],
      "",
    );
    expect(released).toContain('data-group=""');
    const groups = grouped(released);
    expect(groups.at(-1)).toEqual({
      name: "묶음 없음",
      custom: false,
      numbers: [33, 34, 35],
    });
    expect(groups.find((g) => g.name === "점")!.numbers).toEqual([36, 37, 38]);
    expect(prepareFigureSvg(released)).toContain('data-group=""');
  });
  it("점을 글자(●)로 찍은 그림도 점으로 묶는다", () => {
    let n = 0;
    const svg = speedGraph().replace(
      /<circle [^>]*\/>/g,
      () => `<text x="${100 + 40 * n++}" y="160" font-size="10">●</text>`,
    );
    const groups = grouped(prepareFigureSvg(svg));
    expect(groups.find((g) => g.name === "점")!.numbers).toHaveLength(6);
    expect(groups.find((g) => g.name === "축 이름")!.numbers).toEqual([31, 32]);
  });
});
