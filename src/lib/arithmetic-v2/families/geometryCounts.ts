import type {
  ArithmeticV2Answer,
  ArithmeticV2Candidate,
  ArithmeticV2Definition,
  ArithmeticV2Prompt,
} from "../types";

/** Direct counting relations from m1Geo2, m1Book2 and m1Solid. Inverse counts
 * deliberately have no full figure: counting its vertices would disclose the
 * requested answer. gc1 drawing and prompt identities are immutable once saved. */
type Point = readonly [number, number];
type Solid = "prism" | "pyramid" | "frustum";
type Measure = "faces" | "edges" | "vertices";
type Spec = {
  id: string;
  title: string;
  topic: string;
  values: number[];
  text(n: number): string;
  instruction: string;
  solve(n: number): number;
  holds(n: number, value: number): boolean;
  figure?: (n: number) => string;
};
const range = (low: number, high: number) =>
  Array.from({ length: high - low + 1 }, (_, i) => i + low);
const point = (p: Point) => p.map((v) => Number(v.toFixed(3))).join(",");
const line = (a: Point, b: Point, hidden = false) =>
  `<line x1="${Number(a[0].toFixed(3))}" y1="${Number(a[1].toFixed(3))}" x2="${Number(b[0].toFixed(3))}" y2="${Number(b[1].toFixed(3))}"${hidden ? ' stroke-dasharray="4 3"' : ""}/>`;
const label = (text: string) =>
  `<text x="120" y="25" font-size="20" font-family="Arial, sans-serif" text-anchor="middle" fill="#111" stroke="none">${text}</text>`;
const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><desc>arithmetic-geometry-drill-v1</desc><g fill="none" stroke="#111" stroke-width="1.7" stroke-linejoin="round">${body}</g></svg>`;
const ring = (
  n: number,
  xRadius: number,
  yRadius: number,
  cy: number,
): Point[] =>
  range(0, n - 1).map((i) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / n;
    return [120 + xRadius * Math.cos(a), cy + yRadius * Math.sin(a)];
  });
function polygonFigure(n: number): string {
  const points = ring(n, 76, 76, 133);
  return svg(
    label(`${n}각형`) +
      `<polygon points="${points.map(point).join(" ")}"/>` +
      points
        .slice(2, -1)
        .map((p) => line(points[0], p, true))
        .join(""),
  );
}
const solidName: Record<Solid, string> = {
  prism: "각기둥",
  pyramid: "각뿔",
  frustum: "각뿔대",
};
const countName: Record<Measure, string> = {
  faces: "면",
  edges: "모서리",
  vertices: "꼭짓점",
};
function solidFigure(kind: Solid, n: number): string {
  const bottom = ring(n, 78, 26, 180);
  const top =
    kind === "pyramid"
      ? []
      : ring(n, kind === "frustum" ? 43 : 78, kind === "frustum" ? 15 : 26, 79);
  let body = label(`${n}${solidName[kind]}`);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    body += line(bottom[i], bottom[j], (bottom[i][1] + bottom[j][1]) / 2 < 180);
    if (kind === "pyramid")
      body += line([120, 54], bottom[i], bottom[i][1] < 180);
    else
      body +=
        line(top[i], top[j]) + line(top[i], bottom[i], bottom[i][1] < 180);
  }
  return svg(body);
}
const count = (kind: Solid, measure: Measure, n: number) =>
  measure === "faces"
    ? n + (kind === "pyramid" ? 1 : 2)
    : measure === "edges"
      ? n * (kind === "pyramid" ? 2 : 3)
      : kind === "pyramid"
        ? n + 1
        : 2 * n;
// Euler's relation and vertex degrees provide independent forward checks.
function relation(kind: Solid, measure: Measure, n: number, value: number) {
  const vertices = kind === "pyramid" ? n + 1 : 2 * n;
  const degreeSum = kind === "pyramid" ? 3 * n + n : 3 * vertices;
  const faces = n + (kind === "pyramid" ? 1 : 2);
  return measure === "faces"
    ? vertices - degreeSum / 2 + value === 2
    : measure === "edges"
      ? 2 * value === degreeSum
      : value - degreeSum / 2 + faces === 2;
}
const specs: Spec[] = [
  {
    id: "m1-polygon-vertex-diagonals",
    title: "한 꼭짓점에서 그을 수 있는 대각선 수",
    topic: "다각형",
    values: range(4, 15),
    text: (n) => `${n}각형의 한 꼭짓점에서 대각선을 모두 긋습니다.`,
    instruction: "한 꼭짓점에서 그을 수 있는 대각선의 개수를 구하세요.",
    solve: (n) => n - 3,
    holds: (n, x) => x + 3 === n,
    figure: polygonFigure,
  },
  {
    id: "m1-polygon-fan-triangles",
    title: "한 꼭짓점의 대각선으로 나눈 삼각형 수",
    topic: "다각형",
    values: range(4, 15),
    text: (n) => `${n}각형의 한 꼭짓점에서 대각선을 모두 긋습니다.`,
    instruction: "나누어진 삼각형의 개수를 구하세요.",
    solve: (n) => n - 2,
    holds: (n, x) => x + 2 === n,
    figure: polygonFigure,
  },
  {
    id: "m1-polygon-sides-vertex-diagonals",
    title: "한 꼭짓점의 대각선 수에서 변의 수",
    topic: "다각형",
    values: range(4, 20),
    text: (n) =>
      `한 꼭짓점에서 그을 수 있는 대각선이 ${n - 3}개인 다각형입니다.`,
    instruction: "다각형의 변의 수를 구하세요.",
    solve: (n) => n,
    holds: (n, x) => x - 3 === n - 3,
  },
  {
    id: "m1-polygon-sides-fan-triangles",
    title: "나누어진 삼각형 수에서 변의 수",
    topic: "다각형",
    values: range(4, 20),
    text: (n) =>
      `다각형의 한 꼭짓점에서 대각선을 모두 그었더니 삼각형 ${n - 2}개로 나누어졌습니다.`,
    instruction: "다각형의 변의 수를 구하세요.",
    solve: (n) => n,
    holds: (n, x) => x - 2 === n - 2,
  },
  {
    id: "m1-polygon-sides-sum",
    title: "내각의 합에서 다각형의 변의 수",
    topic: "다각형의 내각과 외각",
    values: range(3, 20),
    text: (n) => `다각형의 내각의 크기의 합은 ${180 * (n - 2)}°입니다.`,
    instruction: "다각형의 변의 수를 구하세요.",
    solve: (n) => n,
    holds: (n, x) => 180 * (x - 2) === 180 * (n - 2),
  },
];
for (const kind of ["prism", "pyramid", "frustum"] as const) {
  for (const measure of ["faces", "edges", "vertices"] as const) {
    specs.push({
      id: `m1-${kind}-${measure}-count`,
      title: `${solidName[kind]}의 ${countName[measure]} 수`,
      topic: "다면체",
      values: range(3, 12),
      text: (n) => `${n}${solidName[kind]}입니다. 그림은 겨냥도입니다.`,
      instruction: `${countName[measure]}의 개수를 구하세요.`,
      solve: (n) => count(kind, measure, n),
      holds: (n, x) => relation(kind, measure, n, x),
      figure: (n) => solidFigure(kind, n),
    });
    specs.push({
      id: `m1-${kind}-base-from-${measure}`,
      title: `${solidName[kind]}의 ${countName[measure]} 수에서 밑면의 변 수`,
      topic: "다면체",
      values: range(3, 12),
      text: (n) =>
        `${solidName[kind]}의 ${countName[measure]}의 개수는 모두 ${count(kind, measure, n)}개입니다.`,
      instruction: "밑면인 다각형의 변의 수를 구하세요.",
      solve: (n) => n,
      holds: (n, x) => relation(kind, measure, x, count(kind, measure, n)),
    });
  }
}
const answer = (value: number): ArithmeticV2Answer => ({
  kind: "integer",
  exact: [String(value)],
  text: `${value}개`,
  latex: `${value}\\,\\text{개}`,
});
const figureId = (spec: Spec, n: number) => `gc1-${spec.id}-${n}`;
const prompt = (spec: Spec, n: number): ArithmeticV2Prompt => ({
  layout: "math",
  text: spec.text(n),
  latex: `\\text{${spec.text(n)}}`,
  instruction: spec.instruction,
  answerUnit: "개",
  ...(spec.figure ? { figureId: figureId(spec, n) } : {}),
});
const sameFields = (a: object, b: object) =>
  JSON.stringify(Object.entries(a).sort(([x], [y]) => x.localeCompare(y))) ===
  JSON.stringify(Object.entries(b).sort(([x], [y]) => x.localeCompare(y)));
const figures: Record<string, string> = Object.create(null);
export const COUNT_GEOMETRY_DEFINITIONS: readonly ArithmeticV2Definition[] =
  specs.map((spec) => {
    if (spec.figure)
      for (const n of spec.values)
        Object.defineProperty(figures, figureId(spec, n), {
          enumerable: true,
          get: () => spec.figure!(n),
        });
    return {
      id: spec.id,
      grade: "중1",
      strand: "도형",
      title: spec.title,
      description: `${spec.topic}의 개수 관계를 직접 계산합니다.`,
      labels: [spec.topic, "개수 계산"],
      rankGroup: spec.id,
      domainSize: spec.values.length,
      problemAt(index: number): ArithmeticV2Candidate {
        if (
          !Number.isSafeInteger(index) ||
          index < 0 ||
          index >= spec.values.length
        )
          throw new RangeError("Invalid geometry count index");
        const n = spec.values[index];
        return {
          parameters: [n],
          prompt: prompt(spec, n),
          answer: answer(spec.solve(n)),
        };
      },
      verify(candidate: ArithmeticV2Candidate) {
        const [n] = candidate.parameters;
        if (
          candidate.parameters.length !== 1 ||
          !Number.isInteger(n) ||
          !spec.values.includes(n)
        )
          return false;
        const value = Number(candidate.answer.exact[0]);
        return (
          Number.isSafeInteger(value) &&
          spec.holds(n, value) &&
          sameFields(candidate.answer, answer(value)) &&
          sameFields(candidate.prompt, prompt(spec, n))
        );
      },
    };
  });
export const COUNT_GEOMETRY_FIGURES: Readonly<Record<string, string>> =
  Object.freeze(figures);
