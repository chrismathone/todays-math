/** Export the finite, authoritative model domains; measure independent geometric
 * invariants before deciding whether a model can carry dimension labels. */
import { triangleFigureFirstPlan } from "../../../src/lib/arithmetic-v2/presentation/figureFirstTriangles";
import { writeFileSync } from "node:fs";
import { CENTER_SPECS } from "../../../src/lib/arithmetic-v2/families/geometryTriangles/centers";
import { RELATIONSHIP_SPECS } from "../../../src/lib/arithmetic-v2/families/geometryTriangles/relationships";
import { PYTHAGORAS_SPECS } from "../../../src/lib/arithmetic-v2/families/geometryTriangles/pythagoras";
import { PROPORTION_SPECS } from "../../../src/lib/arithmetic-v2/families/geometryTriangles/proportions";
import { TRIANGLE_FIGURE_FIRST } from "../../../src/lib/arithmetic-v2/presentation/figureFirstTriangles";
import { isCenterAngleType } from "../../../src/lib/arithmetic-v2/presentation/centerAngles";
import { arithmeticGeometryCatalogSvg } from "../../../src/lib/arithmetic-v2/geometry";
import { getArithmeticV2Definition } from "../../../src/lib/arithmetic-v2/registry";
const out: Array<Record<string, unknown>> = [];
for (const s of [
  ...CENTER_SPECS,
  ...RELATIONSHIP_SPECS,
  ...PYTHAGORAS_SPECS,
  ...PROPORTION_SPECS,
])
  for (const p of s.rows) {
    const family = `${s.grade === "중3" ? "m3" : "m2"}-${s.key}`;
    const task = s.task(p);
    const center = isCenterAngleType(family);
    const plan =
      triangleFigureFirstPlan(s, p) ??
      (center
        ? {
            model: task.model,
            givens: [...task.text.matchAll(/∠([A-Z]{3})=(\d+)°/g)].map((m) => ({
              key: m[1],
              text: `${m[2]}°`,
              kind: "angle",
            })),
            target: {
              key: task.target.replace("∠", ""),
              text: "x",
              kind: "angle",
            },
            text: task.text,
          }
        : undefined);
    out.push({
      id: `gt1-${family}-${p.join("-")}`,
      family,
      key: s.key,
      parameters: p,
      unit: s.unit,
      task,
      plan,
      figureFirst: Object.hasOwn(TRIANGLE_FIGURE_FIRST, family) || center,
      canonical: arithmeticGeometryCatalogSvg(`gt1-${family}-${p.join("-")}`),
    });
  }
const special = getArithmeticV2Definition("m3-trig-special-length");
for (let i = 0; i < special.domainSize; i++) {
  const c = special.problemAt(i),
    p = c.prompt;
  if (p.layout !== "math") throw Error();
  const match = /^gm-m3-trig-special-length-(30|45|60)-(\d+)-([0-5])$/.exec(
    p.figureId!,
  );
  if (!match) throw Error();
  const angle = Number(match[1]),
    k = match[2],
    mode = Number(match[3]);
  const keys = ["BC", "AB", "AC"];
  const [given, target] = [
    [2, 0],
    [2, 1],
    [0, 2],
    [1, 2],
    [1, 0],
    [0, 1],
  ][mode];
  const model = {
    points: { A: [0, 0], B: [1, 0], C: [1, Math.tan((angle * Math.PI) / 180)] },
    edges: ["AB", "BC", "CA"],
    right: ["ABC"],
    arcs: ["CAB"],
  };
  out.push({
    id: p.figureId!,
    family: special.id,
    key: "trig-special-length",
    parameters: c.parameters,
    unit: "cm",
    task: { text: p.text, model },
    plan: {
      model,
      givens: [
        { key: "CAB", text: `${angle}°`, kind: "angle" },
        { key: keys[given], text: k, kind: "segment" },
      ],
      target: { key: keys[target], text: "x", kind: "segment" },
      text: p.text,
    },
    figureFirst: true,
    canonical: arithmeticGeometryCatalogSvg(p.figureId!),
  });
}
writeFileSync(
  "/tmp/arithmetic-figure-quality/models.json",
  JSON.stringify(out),
);
console.log({
  models: out.length,
  figureFirst: out.filter((r) => r.figureFirst).length,
});
