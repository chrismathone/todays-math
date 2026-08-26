import { readFileSync } from "node:fs";

function fnLines(src: string, name: string): number {
  const start = src.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`없음 ${name}`);
  let depth = 0;
  let seen = false;
  for (let i = start; i < src.length; i += 1) {
    if (src[i] === "{") {
      depth += 1;
      seen = true;
    } else if (src[i] === "}") {
      depth -= 1;
      if (seen && depth === 0) {
        return src.slice(start, i + 1).split(/\n/).length;
      }
    }
  }
  throw new Error(`닫기 없음 ${name}`);
}

const groups = [
  {
    file: "src/lib/elementary/g3.ts",
    fig: true,
    names: [
      "circ231NameVar",
      "circ231DefRadius",
      "circ231DefDiameter",
      "circ231Midpoint",
      "circ231Longest",
      "circ231TwoRadii",
      "circ231FoldHalf",
    ],
    figNames: ["circ231NameVar"],
  },
  {
    file: "src/lib/elementary/g4.ts",
    fig: false,
    names: [
      "eq165LeftBlank",
      "eq165Commute",
      "eq165MiddleBlank",
      "eq165Sub",
      "eq165LeftSub",
      "eq165Times",
    ],
    figNames: [] as string[],
  },
  {
    file: "src/lib/elementary/g5.ts",
    fig: true,
    names: [
      "boxRectFaces",
      "boxRectVertices",
      "boxRectEdgeCount",
      "boxRectFacePairs",
      "boxRectVertexEdges",
      "boxRectFaceKinds",
      "boxRectGivenFaceCount",
    ],
    figNames: [
      "boxRectFaces",
      "boxRectVertices",
      "boxRectEdgeCount",
      "boxRectFacePairs",
      "boxRectVertexEdges",
      "boxRectFaceKinds",
      "boxRectGivenFaceCount",
    ],
  },
] as const;

for (const g of groups) {
  const src = readFileSync(g.file, "utf8");
  const rows = g.names.map((name) => ({
    name,
    lines: fnLines(src, name),
    fig: g.figNames.includes(name),
  }));
  const sum = rows.reduce((s, r) => s + r.lines, 0);
  console.log(
    JSON.stringify(
      { file: g.file, sum, avg: Number((sum / rows.length).toFixed(1)), rows },
      null,
      2,
    ),
  );
}
