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

/**
 * 직각삼각형의 두 변이 «y축»·«x축», 빗변이 «그래프», 꼭짓점 라벨이 «축 이름»·«눈금 숫자»로 묶였다(2026-09-19 트랙 5 가
 * 브라우저에서 발견). 꼭짓점 안쪽의 직각 표시(ㄱ자)가 변 끝 가까이 있어 화살촉으로 잡혔다 — 캔버스가 크면 작아 보여서.
 * 등변 표시(‖)도 같은 변을 가로지르는 짧은 두 획이라 눈금 둘로 잡혔다.
 * 아래 SVG 는 도형 엔진의 실출력이다(`renderFigureSpec` — v2 는 engine-catalog.json 의 v2_example 과 그 변형,
 * graph-1 은 catalog 의 graph-1 예시와 그 변형). 엔진이 바뀌면 다시 떠서 넣는다.
 */
// v2_example — ∠B 직각(`right: true`). 4번이 직각 표시: B 안쪽의 같은 길이 두 토막(figure_scene.py `_angle_mark_polylines`).
const V2_RIGHT_TRIANGLE = `<svg viewBox="0 0 305.997 241.186" xmlns="http://www.w3.org/2000/svg">
  <g>
    <line x1="37.208" y1="26.236" x2="37.208" y2="206.236" stroke="#111111" stroke-width="1.9" />
    <line x1="37.208" y1="206.236" x2="277.208" y2="206.236" stroke="#111111" stroke-width="1.9" />
    <line x1="277.208" y1="206.236" x2="37.208" y2="26.236" stroke="#111111" stroke-width="1.9" />
  </g>
  <g>
    <path d="M 37.208 194.136 L 49.308 194.136 L 49.308 206.236" fill="none" stroke="#111111" stroke-width="0.72" />
  </g>
  <g>
    <text x="29.625" y="24.029" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" data-px="37.208" data-py="26.236" data-mj="A"><tspan font-style="normal">A</tspan></text>
    <text x="26.484" y="211.612" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" data-px="37.208" data-py="206.236" data-mj="B"><tspan font-style="normal">B</tspan></text>
    <text x="287.932" y="211.612" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" data-px="277.208" data-py="206.236" data-mj="C"><tspan font-style="normal">C</tspan></text>
    <text x="17.208" y="121.612" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" data-px="17.208" data-py="116.236" data-mj="3"><tspan font-style="normal">3</tspan></text>
  </g>
</svg>`;
// 직각이등변삼각형 — AB·BC 에 등변 표시 둘(`ticks: 2`), ∠B 직각. 4~7번이 등변 표시, 8번이 직각 표시.
const V2_ISOSCELES_RIGHT = `<svg viewBox="0 0 243.739 241.186" xmlns="http://www.w3.org/2000/svg">
  <g>
    <line x1="34.95" y1="26.236" x2="34.95" y2="206.236" stroke="#111111" stroke-width="1.9" />
    <line x1="34.95" y1="206.236" x2="214.95" y2="206.236" stroke="#111111" stroke-width="1.9" />
    <line x1="214.95" y1="206.236" x2="34.95" y2="26.236" stroke="#111111" stroke-width="1.9" />
  </g>
  <g>
    <line x1="38.95" y1="114.736" x2="30.95" y2="114.736" stroke="#111111" stroke-width="0.72" stroke-linecap="round" />
    <line x1="38.95" y1="117.736" x2="30.95" y2="117.736" stroke="#111111" stroke-width="0.72" stroke-linecap="round" />
    <line x1="123.45" y1="202.236" x2="123.45" y2="210.236" stroke="#111111" stroke-width="0.72" stroke-linecap="round" />
    <line x1="126.45" y1="202.236" x2="126.45" y2="210.236" stroke="#111111" stroke-width="0.72" stroke-linecap="round" />
    <path d="M 34.95 194.136 L 47.05 194.136 L 47.05 206.236" fill="none" stroke="#111111" stroke-width="0.72" />
  </g>
  <g>
    <text x="27.367" y="24.029" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" data-px="34.95" data-py="26.236" data-mj="A"><tspan font-style="normal">A</tspan></text>
    <text x="24.226" y="211.612" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" data-px="34.95" data-py="206.236" data-mj="B"><tspan font-style="normal">B</tspan></text>
    <text x="225.674" y="211.612" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" data-px="214.95" data-py="206.236" data-mj="C"><tspan font-style="normal">C</tspan></text>
  </g>
</svg>`;
// graph-1 예시 — y = 9 − x² 와 내접 직사각형의 윗변. 축은 선 + 채운 삼각형 화살촉.
const GRAPH1_EXAMPLE = `<svg viewBox="0 0 520 460" xmlns="http://www.w3.org/2000/svg"><line x1="48.0" y1="356.0" x2="472.0" y2="356.0" stroke="#000" stroke-width="1.4" /><polygon points="472.000,356.000 464.000,353.000 464.000,359.000" fill="#111" /><line x1="260.0" y1="412.0" x2="260.0" y2="48.0" stroke="#000" stroke-width="1.4" /><polygon points="260.000,48.000 257.000,56.000 263.000,56.000" fill="#111" /><path d="M 84.3 411.7 L 87.9 399.2 L 91.5 387.0 L 95.1 375.0 L 98.7 363.3 L 102.3 351.8 L 105.9 340.6 L 109.5 329.7 L 113.1 319.0 L 116.7 308.6 L 120.3 298.4 L 123.9 288.5 L 127.6 278.9 L 131.2 269.5 L 134.8 260.3 L 138.4 251.5 L 142.0 242.9 L 145.6 234.5 L 149.2 226.4 L 152.8 218.6 L 156.4 211.0 L 160.0 203.7 L 163.6 196.6 L 167.2 189.8 L 170.8 183.3 L 174.4 177.0 L 178.0 171.0 L 181.6 165.2 L 185.2 159.7 L 188.8 154.5 L 192.4 149.5 L 196.0 144.8 L 199.6 140.3 L 203.2 136.1 L 206.8 132.2 L 210.4 128.5 L 214.0 125.0 L 217.7 121.9 L 221.3 119.0 L 224.9 116.3 L 228.5 113.9 L 232.1 111.8 L 235.7 109.9 L 239.3 108.3 L 242.9 106.9 L 246.5 105.8 L 250.1 105.0 L 253.7 104.4 L 257.3 104.1 L 260.9 104.0 L 264.5 104.2 L 268.1 104.7 L 271.7 105.4 L 275.3 106.3 L 278.9 107.6 L 282.5 109.1 L 286.1 110.8 L 289.7 112.8 L 293.3 115.1 L 296.9 117.6 L 300.5 120.4 L 304.1 123.4 L 307.8 126.7 L 311.4 130.3 L 315.0 134.1 L 318.6 138.2 L 322.2 142.5 L 325.8 147.1 L 329.4 152.0 L 333.0 157.1 L 336.6 162.5 L 340.2 168.1 L 343.8 174.0 L 347.4 180.1 L 351.0 186.5 L 354.6 193.2 L 358.2 200.1 L 361.8 207.3 L 365.4 214.8 L 369.0 222.5 L 372.6 230.4 L 376.2 238.7 L 379.8 247.1 L 383.4 255.9 L 387.0 264.9 L 390.6 274.1 L 394.2 283.7 L 397.9 293.4 L 401.5 303.5 L 405.1 313.8 L 408.7 324.3 L 412.3 335.1 L 415.9 346.2 L 419.5 357.5 L 423.1 369.1 L 426.7 380.9 L 430.3 393.1 L 433.9 405.4 L 435.7 411.7 L 435.7 411.7" fill="none" stroke="#000" stroke-width="2" stroke-linejoin="round" /><line x1="154.0" y1="216.0" x2="366.0" y2="216.0" stroke="#000" stroke-width="1.7" /><text x="244.0" y="101.0" font-size="20.0" font-family="Times New Roman, Batang, serif" text-anchor="middle" data-mj="9">9</text><text x="101.0" y="378.0" font-size="20.0" font-family="Times New Roman, Batang, serif" text-anchor="middle" data-mj="−3">−3</text><text x="419.0" y="378.0" font-size="20.0" font-family="Times New Roman, Batang, serif" text-anchor="middle" data-mj="3">3</text><text x="244.0" y="378.0" font-size="20.0" font-family="Times New Roman, Batang, serif" text-anchor="middle" data-mj="O">O</text><text x="361.5" y="96.0" font-size="20.0" font-family="Times New Roman, Batang, serif" text-anchor="middle" data-mj="y = 9 − x²">y = 9 − x²</text><text x="476.0" y="379.0" font-size="20.0" font-family="Times New Roman, Batang, serif" text-anchor="middle" data-mj="x">x</text><text x="247.0" y="40.0" font-size="20.0" font-family="Times New Roman, Batang, serif" text-anchor="middle" data-mj="y">y</text></svg>`;
// graph-1 — 좌표평면 위 삼각형 OAB(선분 셋, ∠A 직각). graph-1 은 직각 표시를 안 그려서 v2 와 같은 모양의 ㄱ자를
// A 안쪽에 손으로 넣었다(8번 — 한 변 12, `_angle_mark_polylines` 와 같은 꼴).
const GRAPH1_RIGHT_TRIANGLE = `<svg viewBox="0 0 520 460" xmlns="http://www.w3.org/2000/svg"><line x1="48.0" y1="351.3" x2="472.0" y2="351.3" stroke="#000" stroke-width="1.4" /><polygon points="472.000,351.333 464.000,348.333 464.000,354.333" fill="#111" /><line x1="118.7" y1="412.0" x2="118.7" y2="48.0" stroke="#000" stroke-width="1.4" /><polygon points="118.667,48.000 115.667,56.000 121.667,56.000" fill="#111" /><line x1="118.7" y1="351.3" x2="330.7" y2="351.3" stroke="#000" stroke-width="1.7" /><line x1="330.7" y1="351.3" x2="330.7" y2="108.7" stroke="#000" stroke-width="1.7" /><line x1="330.7" y1="108.7" x2="118.7" y2="351.3" stroke="#000" stroke-width="1.7" /><path d="M 318.7 351.3 L 318.7 339.3 L 330.7 339.3" fill="none" stroke="#000" stroke-width="0.72" /><text x="104.7" y="369.3" font-size="20.0" font-family="Times New Roman, Batang, serif" text-anchor="middle" data-mj="O">O</text><text x="336.7" y="369.3" font-size="20.0" font-family="Times New Roman, Batang, serif" text-anchor="middle" data-mj="A">A</text><text x="338.7" y="102.7" font-size="20.0" font-family="Times New Roman, Batang, serif" text-anchor="middle" data-mj="B">B</text><text x="476.0" y="374.3" font-size="20.0" font-family="Times New Roman, Batang, serif" text-anchor="middle" data-mj="x">x</text><text x="105.7" y="40.0" font-size="20.0" font-family="Times New Roman, Batang, serif" text-anchor="middle" data-mj="y">y</text></svg>`;

describe("groupFigureObjects — 직각 표시·등변 표시는 축의 증거가 아니다", () => {
  it("직각삼각형(엔진 v2 실출력)에는 축이 없다 — 꼭짓점 안쪽의 ㄱ자는 화살촉이 아니다", () => {
    expect(grouped(prepareFigureSvg(V2_RIGHT_TRIANGLE))).toEqual([
      { name: "선분", custom: false, numbers: [1, 2, 3] },
      { name: "곡선/경로", custom: false, numbers: [4] },
      { name: "글자", custom: false, numbers: [5, 6, 7, 8] },
    ]);
  });
  it("캔버스가 커서 직각 표시가 작아 보여도 화살촉이 아니다", () => {
    // 화살촉 크기 문턱(캔버스의 6%)은 캔버스를 따라 커진다 — 같은 그림을 넓은 캔버스에 올리면 ㄱ자가 그 안에 든다.
    const wide = V2_RIGHT_TRIANGLE.replace(
      'viewBox="0 0 305.997 241.186"',
      'viewBox="0 0 480 360"',
    );
    expect(grouped(prepareFigureSvg(wide)).map((g) => g.name)).toEqual([
      "선분",
      "곡선/경로",
      "글자",
    ]);
  });
  it("등변 표시(‖)가 붙은 직각이등변삼각형(엔진 v2 실출력)에도 축이 없다 — 한 자리에 모인 두 획은 눈금이 아니다", () => {
    expect(grouped(prepareFigureSvg(V2_ISOSCELES_RIGHT))).toEqual([
      { name: "선분", custom: false, numbers: [1, 2, 3, 4, 5, 6, 7] },
      { name: "곡선/경로", custom: false, numbers: [8] },
      { name: "글자", custom: false, numbers: [9, 10, 11] },
    ]);
  });
  it("좌표평면 위 직각삼각형 — 축은 축, 삼각형 변은 선분, 직각 표시는 그래프가 아니다", () => {
    expect(grouped(prepareFigureSvg(GRAPH1_RIGHT_TRIANGLE))).toEqual([
      { name: "x축", custom: false, numbers: [1, 2] },
      { name: "y축", custom: false, numbers: [3, 4] },
      { name: "선분", custom: false, numbers: [5, 6, 7] },
      { name: "곡선/경로", custom: false, numbers: [8] },
      { name: "눈금 숫자", custom: false, numbers: [9] },
      { name: "글자", custom: false, numbers: [10, 11] },
      { name: "축 이름", custom: false, numbers: [12, 13] },
    ]);
  });
  it("graph-1 실출력은 지금처럼 축·그래프·눈금 숫자·축 이름으로 묶는다", () => {
    expect(grouped(prepareFigureSvg(GRAPH1_EXAMPLE))).toEqual([
      { name: "x축", custom: false, numbers: [1, 2] },
      { name: "y축", custom: false, numbers: [3, 4] },
      { name: "그래프", custom: false, numbers: [5, 6] },
      { name: "눈금 숫자", custom: false, numbers: [7, 8, 9, 10] },
      { name: "글자", custom: false, numbers: [11] },
      { name: "축 이름", custom: false, numbers: [12, 13] },
    ]);
  });
  it("열린 V 화살촉은 직각 표시와 모양이 같아도(90°·같은 길이) 선 끝에서 바깥을 향하면 축이다", () => {
    const svg = prepareFigureSvg(
      `<svg xmlns="${NS}" viewBox="0 0 440 240">` +
        `<line x1="40" y1="200" x2="400" y2="200" stroke="#111"/>` +
        `<path d="M 392 192 L 400 200 L 392 208" fill="none" stroke="#111"/>` +
        `<line x1="60" y1="220" x2="60" y2="20" stroke="#111"/>` +
        `<path d="M 52 28 L 60 20 L 68 28" fill="none" stroke="#111"/>` +
        `<path d="M 80 190 L 160 120 L 240 90 L 320 80" fill="none" stroke="#111"/>` +
        `</svg>`,
    );
    expect(grouped(svg)).toEqual([
      { name: "x축", custom: false, numbers: [1, 2] },
      { name: "y축", custom: false, numbers: [3, 4] },
      { name: "그래프", custom: false, numbers: [5] },
    ]);
  });
  it("화살표 끝(marker-end)을 단 축도 축이다", () => {
    const svg = prepareFigureSvg(
      `<svg xmlns="${NS}" viewBox="0 0 440 240">` +
        `<defs><marker id="head" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z"/></marker></defs>` +
        `<line x1="40" y1="200" x2="400" y2="200" stroke="#111" marker-end="url(#head)"/>` +
        `<line x1="60" y1="220" x2="60" y2="20" stroke="#111" marker-end="url(#head)"/>` +
        `<path d="M 80 190 L 160 120 L 240 90 L 320 80" fill="none" stroke="#111"/>` +
        `</svg>`,
    );
    expect(grouped(svg)).toEqual([
      { name: "x축", custom: false, numbers: [1] },
      { name: "y축", custom: false, numbers: [2] },
      { name: "그래프", custom: false, numbers: [3] },
    ]);
  });
  it("직각 표시 둘이 달린 직사각형(엔진 v2 실출력)에도 축이 없다", () => {
    const svg =
      prepareFigureSvg(`<svg viewBox="0 0 329.9 229.9" xmlns="http://www.w3.org/2000/svg">
  <g>
    <line x1="34.95" y1="34.95" x2="34.95" y2="194.95" stroke="#111111" stroke-width="1.9" />
    <line x1="34.95" y1="194.95" x2="294.95" y2="194.95" stroke="#111111" stroke-width="1.9" />
    <line x1="294.95" y1="194.95" x2="294.95" y2="34.95" stroke="#111111" stroke-width="1.9" />
    <line x1="294.95" y1="34.95" x2="34.95" y2="34.95" stroke="#111111" stroke-width="1.9" />
  </g>
  <g>
    <path d="M 34.95 182.85 L 47.05 182.85 L 47.05 194.95" fill="none" stroke="#111111" stroke-width="0.72" />
    <path d="M 294.95 47.05 L 282.85 47.05 L 282.85 34.95" fill="none" stroke="#111111" stroke-width="0.72" />
  </g>
  <g>
    <text x="24.226" y="40.326" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" data-px="34.95" data-py="34.95" data-mj="A"><tspan font-style="normal">A</tspan></text>
    <text x="24.226" y="200.326" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" data-px="34.95" data-py="194.95" data-mj="B"><tspan font-style="normal">B</tspan></text>
    <text x="305.674" y="200.326" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" data-px="294.95" data-py="194.95" data-mj="C"><tspan font-style="normal">C</tspan></text>
    <text x="305.674" y="40.326" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" data-px="294.95" data-py="34.95" data-mj="D"><tspan font-style="normal">D</tspan></text>
  </g>
</svg>`);
    expect(grouped(svg)).toEqual([
      { name: "선분", custom: false, numbers: [1, 2, 3, 4] },
      { name: "곡선/경로", custom: false, numbers: [5, 6] },
      { name: "글자", custom: false, numbers: [7, 8, 9, 10] },
    ]);
  });
  it("등변 표시 셋(엔진 v2 실출력)이 붙은 선분은 수직선이 아니다", () => {
    const svg =
      prepareFigureSvg(`<svg viewBox="0 0 337.695 36.029" xmlns="http://www.w3.org/2000/svg">
  <g>
    <line x1="29.024" y1="18.653" x2="309.024" y2="18.653" stroke="#111111" stroke-width="1.9" />
  </g>
  <g>
    <line x1="166.024" y1="14.653" x2="166.024" y2="22.653" stroke="#111111" stroke-width="0.72" stroke-linecap="round" />
    <line x1="169.024" y1="14.653" x2="169.024" y2="22.653" stroke="#111111" stroke-width="0.72" stroke-linecap="round" />
    <line x1="172.024" y1="14.653" x2="172.024" y2="22.653" stroke="#111111" stroke-width="0.72" stroke-linecap="round" />
  </g>
  <g>
    <text x="18.3" y="24.029" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" data-px="29.024" data-py="18.653" data-mj="A"><tspan font-style="normal">A</tspan></text>
    <text x="319.748" y="24.029" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" data-px="309.024" data-py="18.653" data-mj="B"><tspan font-style="normal">B</tspan></text>
  </g>
</svg>`);
    expect(grouped(svg)).toEqual([
      { name: "선분", custom: false, numbers: [1, 2, 3, 4] },
      { name: "글자", custom: false, numbers: [5, 6] },
    ]);
  });
  it("눈금이 축을 따라 흩어진 수직선은 지금처럼 축이다", () => {
    const ticks = [40, 110, 180, 250, 320];
    const svg = prepareFigureSvg(
      `<svg xmlns="${NS}" viewBox="0 0 400 80">` +
        `<line x1="20" y1="40" x2="380" y2="40" stroke="#111"/>` +
        ticks
          .map(
            (x) => `<line x1="${x}" y1="34" x2="${x}" y2="46" stroke="#111"/>`,
          )
          .join("") +
        ticks
          .map(
            (x, i) =>
              `<text x="${x - 4}" y="66" font-size="16" data-mj="${i - 2}">${i - 2}</text>`,
          )
          .join("") +
        `</svg>`,
    );
    expect(grouped(svg)).toEqual([
      { name: "x축", custom: false, numbers: [1] },
      { name: "눈금", custom: false, numbers: [2, 3, 4, 5, 6] },
      { name: "눈금 숫자", custom: false, numbers: [7, 8, 9, 10, 11] },
    ]);
  });
});
