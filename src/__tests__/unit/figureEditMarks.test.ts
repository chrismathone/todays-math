import { describe, expect, it } from "vitest";
import {
  figureObjects,
  prepareFigureSvg,
  readFigureSvg,
} from "@/components/unified/figure-editor/figureSvgEditing";
import { describeFigureForEdit } from "@/components/unified/figure-editor/figureEditElements";
import { applyFigureEdits } from "@/components/unified/figure-editor/figureEditApply";
import {
  figureAngleKinds,
  groupFigureObjects,
} from "@/components/unified/figure-editor/figureObjectGroups";
import { flipFigureCurve } from "@/components/unified/figure-editor/figureFlip";
import { figureSegmentMarks } from "@/components/unified/figure-editor/figureSegmentMarks";

/**
 * «요청대로 고치기» 표시 명령(원장님 2026-09-19 «추가할 수 있는 것 전부») — 치수 · 같은 길이 표시 · 평행 표시 · 겹 각.
 * 정답은 **도형 엔진 v2 가 실제로 그린 SVG**(`scripts/figure/render_spec.py`)다. 엔진이 표시까지 그린 그림에서 표시만 뺀
 * 같은 그림에 AI 명령으로 되그려, 새 요소가 엔진의 요소와 **같은 자리·같은 모양**인지 본다.
 */
const NS = "http://www.w3.org/2000/svg";
const FONT =
  'font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111"';
const MARK = 'stroke="#111111" stroke-width="0.72" stroke-linecap="round"';
const svg = (viewBox: string, ...groups: string[]) =>
  `<svg viewBox="${viewBox}" xmlns="${NS}">${groups.map((g) => `<g>${g}</g>`).join("")}</svg>`;
const label = (name: string, x: number, y: number, px: number, py: number) =>
  `<text x="${x}" y="${y}" ${FONT} data-px="${px}" data-py="${py}" data-mj="${name}"><tspan font-style="normal">${name}</tspan></text>`;
const line = (x1: number, y1: number, x2: number, y2: number, rest = "") =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111111" stroke-width="1.9"${rest}/>`;

// 엔진 스펙: 삼각형 A(100,0) B(0,160) C(200,160) · AB·AC 같은 길이 1 · 각 B·C 이중 호 · BC 치수 «10»
const TRI_SIDES =
  line(134.95, 29.948, 34.95, 189.948) +
  line(134.95, 29.948, 234.95, 189.948) +
  line(34.95, 189.948, 234.95, 189.948);
const TRI_TICKS = `<line x1="88.342" y1="112.068" x2="81.558" y2="107.828" ${MARK}/><line x1="188.342" y1="107.828" x2="181.558" y2="112.068" ${MARK}/>`;
const B_ARCS =
  '<path d="M 46.6 171.3 A 22.0 22.0 0 0 1 57.0 189.9" fill="none" stroke="#111111" stroke-width="0.72"/>' +
  '<path d="M 45.0 173.8 A 19.0 19.0 0 0 1 54.0 189.9" fill="none" stroke="#111111" stroke-width="0.72"/>';
const C_ARCS =
  '<path d="M 223.3 171.3 A 22.0 22.0 0 0 0 212.9 189.9" fill="none" stroke="#111111" stroke-width="0.72"/>' +
  '<path d="M 224.9 173.8 A 19.0 19.0 0 0 0 215.9 189.9" fill="none" stroke="#111111" stroke-width="0.72"/>';
const BC_DIMENSION =
  '<path d="M 120.34 203.63 Q 79.145 201.839 37.95 189.948 M 149.56 203.63 Q 190.755 201.839 231.95 189.948" fill="none" stroke="#111111" stroke-width="0.72" stroke-dasharray="5 3" stroke-linecap="round"/>';
const BC_VALUE =
  '<text x="134.95" y="209.324" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" paint-order="stroke fill" stroke="#ffffff" stroke-width="5.6" stroke-linejoin="round" data-mj="10"><tspan font-style="normal">10</tspan></text>';
const TRI_LABELS =
  label("A", 134.95, 24.6, 134.95, 29.948) +
  label("B", 24.226, 195.324, 34.95, 189.948) +
  label("C", 245.674, 195.324, 234.95, 189.948);
const TRI_VIEW = "0 0 269.9 224.898";
const TRI_MARKED = svg(
  TRI_VIEW,
  TRI_SIDES,
  TRI_TICKS + B_ARCS + C_ARCS + BC_DIMENSION,
  BC_VALUE + TRI_LABELS,
);
const TRI_BASE = svg(TRI_VIEW, TRI_SIDES, TRI_LABELS);

// 같은 삼각형을 표시 없이 그린 엔진 그림(틀이 도형에 꼭 맞다) · AB 같은 길이 2 · AC 3 을 그린 엔진 그림
const PLAIN_SIDES =
  line(128.327, 29.948, 28.327, 189.948) +
  line(128.327, 29.948, 228.327, 189.948) +
  line(28.327, 189.948, 228.327, 189.948);
const PLAIN_LABELS =
  label("A", 128.327, 24.6, 128.327, 29.948) +
  label("B", 17.603, 195.324, 28.327, 189.948) +
  label("C", 239.051, 195.324, 228.327, 189.948);
const TRI_PLAIN = svg("0 0 256.654 207.324", PLAIN_SIDES, PLAIN_LABELS);
const TRI2_TICKS = [
  [82.514, 110.796, 75.73, 106.556],
  [80.924, 113.34, 74.14, 109.1],
  [180.129, 105.284, 173.345, 109.524],
  [181.719, 107.828, 174.935, 112.068],
  [183.309, 110.372, 176.525, 114.612],
];

// 평행사변형 A(50,0) B(0,130) C(200,130) D(250,0) · AB 평행 2(A→B) · BC 1(B→C) · CD 2(C→D) · DA 1(A→D)
const PARA_SIDES =
  line(78.327, 26.807, 28.327, 156.807) +
  line(28.327, 156.807, 228.327, 156.807) +
  line(228.327, 156.807, 278.327, 26.807) +
  line(78.327, 26.807, 278.327, 26.807);
const PARA_LABELS =
  label("A", 70.744, 24.6, 78.327, 26.807) +
  label("B", 17.603, 162.183, 28.327, 156.807) +
  label("C", 235.91, 169.766, 228.327, 156.807) +
  label("D", 289.051, 32.183, 278.327, 26.807);
const PARA_CHEVRONS = [
  [52.022, 86.147, 53.034, 92.567],
  [53.034, 92.567, 58.089, 88.48],
  [50.586, 89.88, 51.598, 96.301],
  [51.598, 96.301, 56.653, 92.213],
  [125.512, 160.057, 131.141, 156.807],
  [131.141, 156.807, 125.512, 153.557],
  [254.632, 97.467, 253.619, 91.047],
  [253.619, 91.047, 248.565, 95.134],
  [256.068, 93.734, 255.055, 87.313],
  [255.055, 87.313, 250.001, 91.401],
  [175.512, 30.057, 181.141, 26.807],
  [181.141, 26.807, 175.512, 23.557],
];
const lineMarks = (list: number[][]) =>
  list
    .map(
      ([x1, y1, x2, y2]) =>
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${MARK}/>`,
    )
    .join("");
const PARA_VIEW = "0 0 307.116 181.766";
const PARA_BASE = svg(PARA_VIEW, PARA_SIDES, PARA_LABELS);
const PARA_MARKED = svg(
  PARA_VIEW,
  PARA_SIDES,
  lineMarks(PARA_CHEVRONS),
  PARA_LABELS,
);

// 선분 AB 한가운데 점 M · AB 에 같은 길이 1 과 평행 1 을 함께(엔진은 둘을 6 씩 비켜 세운다) · AC 는 세로
const BOTH_SIDES =
  line(28.789, 29.948, 228.789, 29.948) + line(28.789, 29.948, 28.789, 149.948);
const BOTH_TICK = [[72.789, 25.948, 72.789, 33.948]];
const BOTH_CHEVRON = [
  [81.974, 33.198, 87.603, 29.948],
  [87.603, 29.948, 81.974, 26.698],
];
const BOTH_LABELS =
  label("A", 18.065, 35.324, 28.789, 29.948) +
  label("B", 239.513, 35.324, 228.789, 29.948) +
  label("C", 28.789, 166.048, 28.789, 149.948) +
  label("M", 128.789, 24.6, 128.789, 29.948);
const BOTH_VIEW = "0 0 257.116 178.048";
const BOTH_BASE = svg(BOTH_VIEW, BOTH_SIDES, BOTH_LABELS);

const prepared = (source: string) => prepareFigureSvg(source);
const added = (before: string, after: string) => {
  const ids = new Set(figureObjects(before).map((o) => o.id));
  return figureObjects(after).filter((o) => !ids.has(o.id));
};
const ends = (o: { attrs: Record<string, string> }) =>
  ["x1", "y1", "x2", "y2"].map((key) => Number(o.attrs[key]));
const expectClose = (actual: number[], expected: number[], digits = 2) => {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, i) =>
    expect(value, `${i}번째 값`).toBeCloseTo(expected[i], digits),
  );
};
const numbers = (d: string) =>
  (d.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)/g) ?? []).map(Number);
const viewBoxOf = (source: string) =>
  readFigureSvg(source)
    .documentElement.getAttribute("viewBox")!
    .split(/\s+/)
    .map(Number);
/** 요소 id → 묶음 이름(편집기 요소 목록). */
const groupNames = (source: string) => {
  const objects = figureObjects(source);
  return new Map(
    groupFigureObjects(objects, viewBoxOf(source)).flatMap((group) =>
      group.ids.map((id) => [id, group.name] as const),
    ),
  );
};
/** 선분 위 표시 판정 — 요소 id → «같은 길이 표시»·«평행 표시». */
const segmentMarks = (source: string) =>
  figureSegmentMarks(
    figureObjects(source),
    Math.max(...viewBoxOf(source).slice(2)),
  );
const kindOf = (source: string, id: string) => {
  const figure = describeFigureForEdit(source);
  const index = figureObjects(source).findIndex((o) => o.id === id);
  return figure.elements[index].kind;
};

describe("같은 길이 표시(addTick) — 엔진 `_segment_mark_lines` 와 같은 눈금", () => {
  it("draws the engine's tick across the middle of AB and of AC", () => {
    const source = prepared(TRI_BASE);
    const result = applyFigureEdits(source, [
      { op: "addTick", from: "A", to: "B" },
      { op: "addTick", from: "A", to: "C" },
    ]);
    expect(result.rejected).toEqual([]);
    expect(result.applied).toEqual([
      "선분 AB 같은 길이 표시 추가",
      "선분 AC 같은 길이 표시 추가",
    ]);
    const marks = added(source, result.svg);
    expect(marks.map((o) => o.type)).toEqual(["line", "line"]);
    expectClose(ends(marks[0]), [88.342, 112.068, 81.558, 107.828]);
    expectClose(ends(marks[1]), [188.342, 107.828, 181.558, 112.068]);
    for (const o of marks) {
      expect(o.attrs["stroke-width"]).toBe("0.72");
      expect(o.attrs["stroke-linecap"]).toBe("round");
      expect(o.attrs.stroke).toBe("#111111");
    }
  });

  it("spaces two and three ticks by the engine's gap", () => {
    const source = prepared(TRI_PLAIN);
    const result = applyFigureEdits(source, [
      { op: "addTick", from: "A", to: "B", count: 2 },
      { op: "addTick", from: "A", to: "C", count: 3 },
    ]);
    expect(result.applied).toEqual([
      "선분 AB 같은 길이 표시 추가(2겹)",
      "선분 AC 같은 길이 표시 추가(3겹)",
    ]);
    const marks = added(source, result.svg);
    expect(marks).toHaveLength(5);
    marks.forEach((o, i) => expectClose(ends(o), TRI2_TICKS[i]));
  });

  it("is read by the editor like the engine's own ticks — same name, same group, same mark", () => {
    const engine = prepared(TRI_MARKED);
    const engineTicks = figureObjects(engine).slice(3, 5);
    const source = prepared(TRI_BASE);
    const after = applyFigureEdits(source, [
      { op: "addTick", from: "A", to: "B" },
    ]).svg;
    const [tick] = added(source, after);
    expect(kindOf(after, tick.id)).toBe(kindOf(engine, engineTicks[0].id));
    expect(groupNames(after).get(tick.id)).toBe(
      groupNames(engine).get(engineTicks[0].id),
    );
    // 요소 목록·오른쪽 칸 제목·AI 요소 목록이 쓰는 한 이름(objectName)과 묶음
    expect(kindOf(after, tick.id)).toBe("같은 길이 표시");
    expect(groupNames(after).get(tick.id)).toBe("같은 길이 표시");
    // 선분 위 표시 판정(요소 이름에 쓰일 한 규칙)이 엔진 눈금과 새 눈금을 같게 읽는다
    const engineMarks = segmentMarks(engine);
    expect(engineMarks.get(engineTicks[0].id)).toBe("같은 길이 표시");
    expect(segmentMarks(after).get(tick.id)).toBe("같은 길이 표시");
  });

  // 엔진 `_segment_mark_center` — 선분 위에 얹힌 점(중점 M 등)을 피해 가장 넓은 빈 구간의 한복판
  it("steps aside from a point sitting on the segment, like the engine", () => {
    const source = prepared(BOTH_BASE);
    const result = applyFigureEdits(source, [
      { op: "addTick", from: "A", to: "B" },
      { op: "addTick", from: "M", to: "B" },
    ]);
    expect(result.rejected).toEqual([]);
    const [onAB, onMB] = added(source, result.svg);
    expectClose(ends(onAB), [78.789, 25.948, 78.789, 33.948]);
    // 그린 선은 AB 하나 — MB 는 그 일부라 그림에 있는 선분이다
    expectClose(ends(onMB), [178.789, 25.948, 178.789, 33.948]);
  });

  it("stands beside a parallel mark already on the segment, as the engine does", () => {
    const source = prepared(
      svg(BOTH_VIEW, BOTH_SIDES, lineMarks(BOTH_CHEVRON), BOTH_LABELS),
    );
    const result = applyFigureEdits(source, [
      { op: "addTick", from: "A", to: "B" },
    ]);
    expect(result.rejected).toEqual([]);
    expectClose(ends(added(source, result.svg)[0]), BOTH_TICK[0]);
  });

  it.each([
    [
      "선분이 그림에 없음",
      BOTH_BASE,
      { op: "addTick", from: "B", to: "C" },
      "선분 BC 같은 길이 표시 추가: 그림에 없는 선분입니다",
    ],
    [
      "점 이름을 못 찾음",
      TRI_BASE,
      { op: "addTick", from: "A", to: "Z" },
      "선분 AZ 같은 길이 표시 추가: 점 이름 Z — 그림에서 찾지 못했습니다",
    ],
    [
      "같은 표시가 이미 있음",
      TRI_MARKED,
      { op: "addTick", from: "B", to: "A", count: 2 },
      "선분 BA 같은 길이 표시 추가(2겹): 이미 같은 길이 표시가 있습니다(4번 같은 길이 표시)",
    ],
    [
      "두 점이 같음",
      TRI_BASE,
      { op: "addTick", from: "A", to: "A" },
      "선분 AA 같은 길이 표시 추가: 두 점이 같습니다",
    ],
  ])("refuses with a reason — %s", (_name, figure, command, reason) => {
    const source = prepared(figure);
    const result = applyFigureEdits(source, [command]);
    expect(result.rejected).toEqual([reason]);
    expect(result.svg).toBe(source);
    expect(result.summary).toBe("바꾼 것 없음");
  });

  it("refuses marks that would spill past the ends of a short segment", () => {
    const source = prepared(
      svg(
        "0 0 300 240",
        line(100, 100, 108, 100) + line(100, 100, 100, 200),
        label("P", 96, 96, 100, 100) + label("Q", 112, 96, 108, 100),
      ),
    );
    expect(
      applyFigureEdits(source, [
        { op: "addTick", from: "P", to: "Q", count: 3 },
      ]).rejected,
    ).toEqual([
      "선분 PQ 같은 길이 표시 추가(3겹): 선분이 짧아 표시가 넘칩니다",
    ]);
  });
});

describe("평행 표시(addParallelMark) — 엔진의 » 두 획", () => {
  it("draws the engine's chevrons pointing from → to, one or two per side", () => {
    const source = prepared(PARA_BASE);
    const result = applyFigureEdits(source, [
      { op: "addParallelMark", from: "A", to: "B", count: 2 },
      { op: "addParallelMark", from: "B", to: "C" },
      { op: "addParallelMark", from: "C", to: "D", count: 2 },
      { op: "addParallelMark", from: "A", to: "D" },
    ]);
    expect(result.rejected).toEqual([]);
    expect(result.applied).toEqual([
      "선분 AB 평행 표시 추가(2겹)",
      "선분 BC 평행 표시 추가",
      "선분 CD 평행 표시 추가(2겹)",
      "선분 AD 평행 표시 추가",
    ]);
    const marks = added(source, result.svg);
    expect(marks).toHaveLength(12);
    marks.forEach((o, i) => {
      expectClose(ends(o), PARA_CHEVRONS[i]);
      expect(o.attrs["stroke-width"]).toBe("0.72");
      expect(o.attrs["stroke-linecap"]).toBe("round");
    });
  });

  it("stands beside equal-length ticks already on the segment, as the engine does", () => {
    const source = prepared(
      svg(BOTH_VIEW, BOTH_SIDES, lineMarks(BOTH_TICK), BOTH_LABELS),
    );
    const result = applyFigureEdits(source, [
      { op: "addParallelMark", from: "A", to: "B" },
    ]);
    expect(result.rejected).toEqual([]);
    const marks = added(source, result.svg);
    marks.forEach((o, i) => expectClose(ends(o), BOTH_CHEVRON[i]));
  });

  it("is read by the editor like the engine's own chevrons", () => {
    const engine = prepared(PARA_MARKED);
    const engineArm = figureObjects(engine)[4];
    const source = prepared(PARA_BASE);
    const after = applyFigureEdits(source, [
      { op: "addParallelMark", from: "B", to: "C" },
    ]).svg;
    const arms = added(source, after);
    expect(arms.map((o) => kindOf(after, o.id))).toEqual([
      kindOf(engine, engineArm.id),
      kindOf(engine, engineArm.id),
    ]);
    expect(groupNames(after).get(arms[0].id)).toBe(
      groupNames(engine).get(engineArm.id),
    );
    expect(kindOf(after, arms[0].id)).toBe("평행 표시");
    expect(groupNames(after).get(arms[0].id)).toBe("평행 표시");
    const engineMarks = segmentMarks(engine);
    expect(
      figureObjects(engine)
        .slice(4)
        .filter((o) => o.type === "line")
        .map((o) => engineMarks.get(o.id)),
    ).toEqual(Array(12).fill("평행 표시"));
    const marks = segmentMarks(after);
    expect(arms.map((o) => marks.get(o.id))).toEqual([
      "평행 표시",
      "평행 표시",
    ]);
  });

  it("does not add a second parallel mark on the same side", () => {
    const source = prepared(PARA_MARKED);
    expect(
      applyFigureEdits(source, [{ op: "addParallelMark", from: "B", to: "C" }])
        .rejected,
    ).toEqual([
      "선분 BC 평행 표시 추가: 이미 평행 표시가 있습니다(9번 평행 표시)",
    ]);
  });

  it("puts parallel marks only on a drawn segment", () => {
    const source = prepared(PARA_BASE);
    expect(
      applyFigureEdits(source, [{ op: "addParallelMark", from: "A", to: "C" }])
        .rejected,
    ).toEqual(["선분 AC 평행 표시 추가: 그림에 없는 선분입니다"]);
  });
});

describe("선분 위 표시 판정 — 좌표축 눈금은 표시가 아니다", () => {
  it("does not read the scale ticks along an axis as equal-length marks", () => {
    const ticks = [60, 100, 140, 180, 220]
      .map((x) => `<line x1="${x}" y1="196" x2="${x}" y2="204" ${MARK}/>`)
      .join("");
    const source = prepared(
      svg(
        "0 0 300 240",
        line(20, 200, 280, 200) + line(40, 20, 40, 220),
        ticks,
      ),
    );
    expect(segmentMarks(source).size).toBe(0);
  });
});

describe("치수(addDimension) — 엔진 `_dimension_gapped_path` 와 같은 곡선", () => {
  const dimensionOf = (source: string, after: string) => {
    const [path, text] = added(source, after);
    return { path, text };
  };

  it("draws BC's dimension outside the triangle, with the value in a gap, like the engine", () => {
    const source = prepared(TRI_BASE);
    const result = applyFigureEdits(source, [
      { op: "addDimension", from: "B", to: "C", text: "10" },
    ]);
    expect(result.rejected).toEqual([]);
    expect(result.applied).toEqual(["선분 BC 치수 10 추가"]);
    const { path, text } = dimensionOf(source, result.svg);
    expect(path.type).toBe("path");
    expectClose(
      numbers(path.attrs.d),
      numbers(
        "M 120.34 203.63 Q 79.145 201.839 37.95 189.948 M 149.56 203.63 Q 190.755 201.839 231.95 189.948",
      ),
    );
    expect(path.attrs.d).toMatch(/^M [\d. ]+ Q [\d. ]+ M [\d. ]+ Q [\d. ]+$/);
    expect(path.attrs["stroke-dasharray"]).toBe("5 3");
    expect(path.attrs["stroke-width"]).toBe("0.72");
    expect(path.attrs["stroke-linecap"]).toBe("round");
    expect(path.attrs.fill).toBe("none");
    expect(text.type).toBe("text");
    expect(text.text).toBe("10");
    expectClose(
      [
        Number(text.attrs.x),
        Number(text.attrs.y),
        Number(text.attrs["font-size"]),
      ],
      [134.95, 209.324, 16.8],
    );
    expect(text.attrs["text-anchor"]).toBe("middle");
    expect(text.attrs["paint-order"]).toBe("stroke fill");
    expect(text.attrs.stroke).toBe("#ffffff");
    expect(text.attrs["stroke-width"]).toBe("5.6");
  });

  it("is read by the editor like the engine's dimension and value", () => {
    const engine = prepared(TRI_MARKED);
    const [enginePath, engineValue] = [
      figureObjects(engine)[9],
      figureObjects(engine)[10],
    ];
    expect(enginePath.type).toBe("path");
    expect(engineValue.text).toBe("10");
    const source = prepared(TRI_BASE);
    const after = applyFigureEdits(source, [
      { op: "addDimension", from: "B", to: "C", text: "10" },
    ]).svg;
    const { path, text } = dimensionOf(source, after);
    expect(kindOf(after, path.id)).toBe(kindOf(engine, enginePath.id));
    expect(kindOf(after, text.id)).toBe(kindOf(engine, engineValue.id));
    expect(groupNames(after).get(path.id)).toBe(
      groupNames(engine).get(enginePath.id),
    );
  });

  it.each([
    ["in", 175.948],
    ["above", 175.948],
    ["below", 203.948],
    ["out", 203.948],
  ])("puts the curve %s", (side, apexY) => {
    const source = prepared(TRI_BASE);
    const { text } = dimensionOf(
      source,
      applyFigureEdits(source, [
        { op: "addDimension", from: "B", to: "C", text: "10", side },
      ]).svg,
    );
    // 값의 가운데 = 곡선의 꼭대기(밑선은 0.32 글자 아래)
    expect(Number(text.attrs.y) - 0.32 * 16.8).toBeCloseTo(apexY, 2);
  });

  it("puts a side's dimension on the left of a slanted side when asked, which is also outside", () => {
    const source = prepared(TRI_BASE);
    for (const side of ["left", "out"]) {
      const { text } = dimensionOf(
        source,
        applyFigureEdits(source, [
          { op: "addDimension", from: "A", to: "B", text: "7", side },
        ]).svg,
      );
      expect(Number(text.attrs.x)).toBeLessThan(84.95);
      expect(Number(text.attrs.y)).toBeLessThan(109.948 + 5.376);
    }
  });

  it("refuses above/below for an upright segment and left/right for a level one", () => {
    const source = prepared(BOTH_BASE);
    expect(
      applyFigureEdits(source, [
        { op: "addDimension", from: "A", to: "C", text: "6", side: "above" },
        { op: "addDimension", from: "A", to: "B", text: "8", side: "left" },
      ]).rejected,
    ).toEqual([
      "선분 AC 치수 6 추가: 세로 선분이라 위·아래를 정할 수 없습니다",
      "선분 AB 치수 8 추가: 가로 선분이라 왼쪽·오른쪽을 정할 수 없습니다",
    ]);
  });

  it("does not add a second dimension to the same segment", () => {
    const source = prepared(TRI_MARKED);
    expect(
      applyFigureEdits(source, [
        { op: "addDimension", from: "C", to: "B", text: "10" },
      ]).rejected,
    ).toEqual(["선분 CB 치수 10 추가: 이미 치수가 있습니다(10번 곡선/경로)"]);
  });

  // 트랙 18 뒤집기의 «딸린 글자» 규칙과 맞물린다 — 새로 단 치수를 뒤집으면 값 글자가 같이 간다
  it("flips with its value, from the editor function and from a later AI flip", () => {
    const source = prepared(TRI_BASE);
    const after = applyFigureEdits(source, [
      { op: "addDimension", from: "B", to: "C", text: "10" },
    ]).svg;
    const { path, text } = dimensionOf(source, after);
    const flipped = flipFigureCurve(after, path.id);
    expect("labelId" in flipped && flipped.labelId).toBe(text.id);
    const n = figureObjects(after).findIndex((o) => o.id === path.id) + 1;
    const again = applyFigureEdits(after, [{ op: "flip", target: n }]);
    expect(again.applied).toEqual([
      `${n}번 곡선/경로 반대쪽으로 뒤집기(글자 10 함께)`,
    ]);
    // 곡선은 BC 위(안쪽)로 — 끝은 그대로
    const d = figureObjects(again.svg).find((o) => o.id === path.id)!.attrs.d;
    expect(
      numbers(d)
        .filter((_, i) => i % 2 === 1)
        .every((y) => y <= 189.948 + 1e-6),
    ).toBe(true);
  });

  it("widens a tight engine frame so the new value is not cut off", () => {
    const source = prepared(TRI_PLAIN);
    const result = applyFigureEdits(source, [
      { op: "addDimension", from: "B", to: "C", text: "10" },
    ]);
    const [x, y, width, height] = viewBoxOf(result.svg);
    expect([x, y, width]).toEqual([0, 0, 256.654]);
    const { text } = dimensionOf(source, result.svg);
    // 글자 아래 끝(가운데 + 반 글자)이 틀 안
    expect(height).toBeGreaterThan(Number(text.attrs.y) - 0.32 * 16.8 + 8.4);
    // 틀 안이면 건드리지 않는다
    const inside = applyFigureEdits(prepared(TRI_PLAIN), [
      { op: "addDimension", from: "B", to: "C", text: "10", side: "in" },
    ]);
    expect(viewBoxOf(inside.svg)).toEqual([0, 0, 256.654, 207.324]);
  });

  it("moves a long value just past the curve on a short segment, and keeps the curve whole", () => {
    const source = prepared(
      svg(
        "0 0 300 240",
        line(100, 120, 130, 120) + line(100, 120, 100, 200),
        label("P", 96, 116, 100, 120) + label("Q", 136, 116, 130, 120),
      ),
    );
    const { path, text } = dimensionOf(
      source,
      applyFigureEdits(source, [
        {
          op: "addDimension",
          from: "P",
          to: "Q",
          text: "12 cm",
          side: "above",
        },
      ]).svg,
    );
    expect(path.attrs.d.match(/M/g)).toHaveLength(1);
    // 꼭대기(120 − 14)보다 위에 선다
    expect(
      Number(text.attrs.y) - 0.32 * Number(text.attrs["font-size"]),
    ).toBeLessThan(106);
  });
});

describe("겹 각 표시(addAngle arcs) — 엔진 이중 호", () => {
  it("draws two arcs 3 apart at B, like the engine's double arc", () => {
    // C 에 엔진 이중 호가 있다 — 크기는 그것(바깥 호 22)을 따른다
    const source = prepared(
      svg(TRI_VIEW, TRI_SIDES, TRI_TICKS + C_ARCS, TRI_LABELS),
    );
    const result = applyFigureEdits(source, [
      { op: "addAngle", at: "B", from: "A", to: "C", arcs: 2 },
    ]);
    expect(result.rejected).toEqual([]);
    expect(result.applied).toEqual(["각 ABC 표시 추가(예각, 2겹)"]);
    const arcs = added(source, result.svg);
    expect(arcs.map((o) => o.type)).toEqual(["path", "path"]);
    expectClose(
      numbers(arcs[0].attrs.d),
      numbers("M 46.6 171.3 A 22.0 22.0 0 0 1 57.0 189.9"),
      0,
    );
    expectClose(
      numbers(arcs[1].attrs.d),
      numbers("M 45.0 173.8 A 19.0 19.0 0 0 1 54.0 189.9"),
      0,
    );
    const kinds = figureAngleKinds(
      figureObjects(result.svg),
      viewBoxOf(result.svg),
    );
    expect(arcs.map((o) => kinds.get(o.id))).toEqual(["예각", "예각"]);
    const groups = groupNames(result.svg);
    expect(arcs.map((o) => groups.get(o.id))).toEqual(["각", "각"]);
  });

  it("draws three arcs, and a later angle follows the outer arc, not the inner ones", () => {
    const source = prepared(TRI_BASE);
    const result = applyFigureEdits(source, [
      { op: "addAngle", at: "C", from: "A", to: "B", arcs: 3 },
      { op: "addAngle", at: "B", from: "A", to: "C" },
    ]);
    expect(result.rejected).toEqual([]);
    const arcs = added(source, result.svg);
    const radii = arcs.map((o) => numbers(o.attrs.d)[2]);
    expect(radii).toHaveLength(4);
    expect(radii[0] - radii[1]).toBeCloseTo(3, 5);
    expect(radii[1] - radii[2]).toBeCloseTo(3, 5);
    expect(radii[3]).toBeCloseTo(radii[0], 5);
  });

  // 손으로 고친 그림은 안쪽 호가 먼저 올 수 있다 — 반지름 가운데값(19)도, 먼저 온 호(16)도 아닌 바깥 호(22)
  it("follows the outer arc even when the inner arcs come first", () => {
    const arc = (r: number, x0: number, y0: number) =>
      `<path d="M ${x0} ${y0} A ${r} ${r} 0 0 0 ${234.95 - r} 189.948" fill="none" stroke="#111111" stroke-width="0.72"/>`;
    const source = prepared(
      svg(
        TRI_VIEW,
        TRI_SIDES,
        arc(16, 226.47, 176.38) +
          arc(19, 224.88, 173.83) +
          arc(22, 223.29, 171.29),
        TRI_LABELS,
      ),
    );
    const result = applyFigureEdits(source, [
      { op: "addAngle", at: "B", from: "A", to: "C" },
    ]);
    expect(result.rejected).toEqual([]);
    const [mark] = added(source, result.svg);
    expect(numbers(mark.attrs.d)[2]).toBeCloseTo(22, 1);
  });

  it("draws arcs, not a square corner, when several arcs mark a right angle", () => {
    const source = prepared(BOTH_BASE);
    const result = applyFigureEdits(source, [
      { op: "addAngle", at: "A", from: "B", to: "C", arcs: 2 },
    ]);
    expect(result.rejected).toEqual([]);
    expect(added(source, result.svg).map((o) => o.attrs.d)).toEqual([
      expect.stringMatching(/ A /),
      expect.stringMatching(/ A /),
    ]);
  });

  it("refuses a doubled square corner", () => {
    const source = prepared(BOTH_BASE);
    expect(
      applyFigureEdits(source, [
        { op: "addAngle", at: "A", from: "B", to: "C", right: true, arcs: 2 },
      ]).rejected,
    ).toEqual(["각 BAC 표시 추가: 직각 표시는 겹으로 하지 않습니다"]);
  });
});
