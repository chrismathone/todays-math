import { describe, expect, it } from "vitest";
import {
  TRIANGLE_GEOMETRY_DEFINITIONS as definitions,
  TRIANGLE_GEOMETRY_FIGURES as figures,
} from "../../lib/arithmetic-v2/families/geometryTriangles";
import { CENTER_SPECS } from "../../lib/arithmetic-v2/families/geometryTriangles/centers";
import { RELATIONSHIP_SPECS } from "../../lib/arithmetic-v2/families/geometryTriangles/relationships";
import { PYTHAGORAS_SPECS } from "../../lib/arithmetic-v2/families/geometryTriangles/pythagoras";
import { PROPORTION_SPECS } from "../../lib/arithmetic-v2/families/geometryTriangles/proportions";
import type {
  Model,
  Point,
} from "../../lib/arithmetic-v2/families/geometryTriangles/core";
import type { ArithmeticV2Answer } from "../../lib/arithmetic-v2/types";

const specs = [
  ...CENTER_SPECS,
  ...RELATIONSHIP_SPECS,
  ...PYTHAGORAS_SPECS,
  ...PROPORTION_SPECS,
];
const length = (a: Point, b: Point) =>
  Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
const angle = (a: Point, b: Point, c: Point) =>
  (Math.acos(
    Math.max(
      -1,
      Math.min(
        1,
        ((a[0] - b[0]) * (c[0] - b[0]) + (a[1] - b[1]) * (c[1] - b[1])) /
          length(a, b) /
          length(b, c),
      ),
    ),
  ) *
    180) /
  Math.PI;
const area = (a: Point, b: Point, c: Point) =>
  Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
const lineDistance = (p: Point, a: Point, b: Point) =>
  (2 * area(p, a, b)) / length(a, b);
function scalar(a: ArithmeticV2Answer) {
  const v = a.exact.map(Number);
  return a.kind === "surd"
    ? (v[0] * Math.sqrt(v[1])) / v[2]
    : a.kind === "rational"
      ? v[0] / v[1]
      : v[0];
}
function segment(m: Model, key: string) {
  return length(m.points[key[0]], m.points[key[1]]);
}
function measured(m: Model, key: string) {
  return angle(m.points[key[0]], m.points[key[1]], m.points[key[2]]);
}
function triangleArea(m: Model, key: string) {
  return area(m.points[key[0]], m.points[key[1]], m.points[key[2]]);
}
function perimeter(m: Model, key = "ABC") {
  return (
    segment(m, key.slice(0, 2)) +
    segment(m, key.slice(1)) +
    segment(m, key[2] + key[0])
  );
}
function polygonArea(m: Model, key: string) {
  return (
    Math.abs(
      [...key].reduce((sum, k, i) => {
        const a = m.points[k],
          b = m.points[key[(i + 1) % key.length]];
        return sum + a[0] * b[1] - a[1] * b[0];
      }, 0),
    ) / 2
  );
}
function expected(key: string, p: readonly number[]): number {
  const [a, b, c, d] = p;
  if (key === "obtuse-circum-central-angle") return 2 * (180 - a);
  if (key === "obtuse-circum-vertex-angle") return a;
  if (key === "obtuse-circum-base-angle") return (180 - 2 * (180 - a)) / 2;
  // Independent numerical oracle. It never calls task(), relation(), problemAt(),
  // canonical(), or an implementation geometry/construction helper.
  if (key === "circum-central-angle" || key === "circum-base-central-angle")
    return 2 * a;
  if (
    key === "circum-vertex-angle" ||
    key === "circum-equal-radii" ||
    key === "right-circumradius"
  )
    return a;
  if (key === "circum-radius-base-angle") return (180 - 2 * a) / 2;
  if (key === "circum-three-base-angles") return 90 - b;
  if (key === "right-circum-diameter") return 2 * a;
  if (key === "incenter-half-angle") return a / 2;
  if (key === "incenter-whole-angle" || key === "incenter-inverse-angle")
    return a;
  if (key === "incenter-central-angle") return 180 - (180 - a) / 2;
  if (key === "incenter-three-half-angles") return (180 - 2 * a - 2 * b) / 2;
  if (key === "iso-incenter-base-half") return (180 - a) / 4;
  if (key.startsWith("incenter-")) {
    const u = (a ? 5 : 3) * b,
      v = (a ? 12 : 4) * b,
      h = Math.hypot(u, v),
      s = (u + v + h) / 2,
      S = (u * v) / 2;
    if (key === "incenter-area") return S;
    if (key === "incenter-perimeter") return 2 * s;
    if (key === "incenter-part-area") return (v * S) / s / 2;
    return S / s;
  }
  const centroidFactors: Record<string, number> = {
    "vertex-from-short": 2,
    "short-from-vertex": 0.5,
    "vertex-from-median": 2 / 3,
    "short-from-median": 1 / 3,
    "median-from-vertex": 1.5,
    "median-from-short": 3,
    "area-3": 2,
    "area-6": 1,
    "median-sum": 2,
  };
  if (key.startsWith("centroid-")) return a * centroidFactors[key.slice(9)];
  if (key === "iso-bisector-angle") return 90 - a;
  if (key === "iso-bisector-base") return 2 * a;
  if (key === "iso-bisector-half-base") return a;
  if (key === "triangle-midsegment") return a / 2;
  if (key === "midsegment-to-base") return 2 * a;
  if (key === "midsegment-area-small") return a;
  if (key === "midsegment-area-remainder") return 3 * a;
  if (key === "trapezoid-midline") return a + b / 2;
  if (key === "trapezoid-base") return a + b;
  if (key === "trapezoid-diagonal-midpoints") return b / 2;
  if (key.startsWith("similarity-ratio-power-"))
    return (b / a) ** Number(key.at(-1));
  if (key.startsWith("similarity-length-from-power-")) return b / a;
  if (key === "similarity-perimeter") return 12 * b * c;
  if (key.startsWith("similarity-")) {
    const power = key.includes("volume") ? 3 : key.includes("area") ? 2 : 1;
    return c * (key.endsWith("reduce") ? a : b) ** power;
  }
  if (key === "parallel-triangle-side-part") return b * c;
  if (key === "parallel-triangle-base") return 4 * (c + 1);
  if (key === "parallel-triangle-whole-side") return b * (c + 1);
  if (key === "triangle-bisector-segment") return (6 * c) / (1 + b / a);
  if (key === "parallelogram-adjacent" || key === "isosceles-trapezoid-angle")
    return 180 - a;
  if (
    key === "parallelogram-diagonal-half" ||
    key === "rectangle-diagonal-half"
  )
    return a / 2;
  if (key === "parallelogram-diagonal-whole") return 2 * a;
  if (key === "parallelogram-area-quarter") return a;
  if (key === "rhombus-diagonal-angle") return a / 2;
  if (key.startsWith("pythagoras-"))
    return Math.sqrt(
      key.includes("-leg-") ||
        key.includes("rectangle-side-") ||
        key.includes("isosceles-height-")
        ? b * b - a * a
        : a * a + b * b,
    );
  if (key === "right-radius-from-legs") return Math.hypot(a, b) / 2;
  if (key === "right-triangle-height") return (a * b) / Math.hypot(a, b);
  if (key === "right-triangle-projection") return (b * b) / Math.hypot(a, b);
  if (key === "right-triangle-area") return (a * b) / 2;
  if (key === "right-altitude-product") return a * b;
  if (key === "right-leg-product") return a * Math.hypot(a, b);
  if (key === "triangle-median-area") return a;
  if (key === "same-height-area-ratio" || key === "three-parallel-segments")
    return b * c;
  if (key === "trapezoid-parallel-section") return a + (b * c) / (c + d);
  if (key.startsWith("external-bisector-")) {
    const [u, v, w] = [
      [8, 5, 7],
      [7, 4, 6],
      [9, 5, 8],
    ][a];
    return key.endsWith("base") ? w * b : (w * b) / (u / v - 1);
  }
  if (key === "midpoint-triangle-perimeter-whole") return 2 * a;
  if (key === "midpoint-triangle-perimeter-part") return a / 2;
  throw new Error(`Missing independent oracle: ${key}`);
}

describe("geometryTriangles finite mathematical domains", () => {
  it("has unique identities, explicit units and enumerable lazy figure entries", () => {
    expect(new Set(definitions.map((d) => d.id)).size).toBe(definitions.length);
    expect(new Set(definitions.map((d) => d.title)).size).toBe(
      definitions.length,
    );
    expect(Object.keys(figures).length).toBe(
      definitions.reduce((n, d) => n + d.domainSize, 0),
    );
    for (const id of Object.keys(figures)) {
      expect(id.length).toBeLessThanOrEqual(64);
      expect(Object.getOwnPropertyDescriptor(figures, id)?.get).toBeTypeOf(
        "function",
      );
    }
  });
  for (const [familyIndex, def] of definitions.entries())
    it(`${def.id}: every candidate, actual geometry and mutation rejection`, () => {
      const spec = specs[familyIndex],
        identities = new Set<string>(),
        wording = new Set<string>();
      for (const bad of [-1, 0.5, NaN, Infinity, def.domainSize])
        expect(() => def.problemAt(bad)).toThrow();
      for (let i = 0; i < def.domainSize; i++) {
        const candidate = def.problemAt(i),
          p = candidate.parameters,
          task = spec.task(p),
          m = task.model,
          v = scalar(candidate.answer);
        expect(v, `${def.id} ${p}`).toBeCloseTo(expected(spec.key, p), 8);
        expect(def.verify(candidate)).toBe(true);
        expect(candidate.prompt.layout).toBe("math");
        if (candidate.prompt.layout !== "math") throw Error("layout");
        const prompt = candidate.prompt;
        expect(prompt.answerUnit).toBe(spec.unit);
        expect(identities.has(prompt.latex)).toBe(false);
        identities.add(prompt.latex);
        const words = prompt.text + prompt.instruction;
        expect(wording.has(words)).toBe(false);
        wording.add(words);
        expect(prompt.text).not.toMatch(/NaN|Infinity|\d+\.\d{6}/);
        const reordered = {
          ...candidate,
          prompt: {
            answerUnit: prompt.answerUnit,
            figureId: prompt.figureId,
            instruction: prompt.instruction,
            latex: prompt.latex,
            text: prompt.text,
            layout: "math" as const,
          },
          answer: {
            latex: candidate.answer.latex,
            text: candidate.answer.text,
            exact: candidate.answer.exact,
            kind: candidate.answer.kind,
          },
        };
        expect(def.verify(reordered)).toBe(true);
        expect(
          def.verify({
            ...candidate,
            answer: {
              ...candidate.answer,
              exact: [
                String(Number(candidate.answer.exact[0]) + 1),
                ...candidate.answer.exact.slice(1),
              ],
            },
          }),
        ).toBe(false);
        expect(
          def.verify({
            ...candidate,
            prompt: { ...prompt, text: prompt.text + "0" },
          }),
        ).toBe(false);
        expect(
          def.verify({
            ...candidate,
            prompt: { ...prompt, answerUnit: "wrong" },
          }),
        ).toBe(false);
        expect(def.verify({ ...candidate, parameters: [...p, 1] })).toBe(false);
        for (const point of Object.values(m.points))
          expect(point.every(Number.isFinite)).toBe(true);
        for (const right of m.right ?? [])
          expect(measured(m, right)).toBeCloseTo(90, 7);
        for (const equal of m.equal ?? [])
          for (const e of equal)
            expect(segment(m, e)).toBeCloseTo(segment(m, equal[0]), 7);
        for (const parallel of m.parallel ?? []) {
          const [u, w] = parallel[0].split("").map((k) => m.points[k]);
          for (const e of parallel) {
            const [a, b] = e.split("").map((k) => m.points[k]);
            expect(
              (b[0] - a[0]) * (w[1] - u[1]) - (b[1] - a[1]) * (w[0] - u[0]),
            ).toBeCloseTo(0, 6);
          }
        }
        for (const given of prompt.text.matchAll(/∠([A-Z]{3})=(\d+)°/g))
          expect(measured(m, given[1])).toBeCloseTo(Number(given[2]), 7);
        const requestedAngle = task.target.match(/^∠([A-Z]{3})$/);
        if (requestedAngle)
          expect(measured(m, requestedAngle[1])).toBeCloseTo(v, 7);
        const scales: number[] = [];
        for (const given of prompt.text.matchAll(
          /(?<![A-Z+])([A-Z]{2})=(\d+) cm/g,
        ))
          scales.push(Number(given[2]) / segment(m, given[1]));
        for (const s of scales) expect(s).toBeCloseTo(scales[0], 7);
        for (const ratio of prompt.text.matchAll(
          /([A-Z]{2}):([A-Z]{2})=(\d+):(\d+)/g,
        ))
          expect(segment(m, ratio[1]) / segment(m, ratio[2])).toBeCloseTo(
            Number(ratio[3]) / Number(ratio[4]),
            7,
          );
        const requestedSegment = task.target.match(
          /(?:^|높이 )([A-Z]{2})의 길이$/,
        );
        if (requestedSegment && scales.length)
          expect(segment(m, requestedSegment[1]) * scales[0]).toBeCloseTo(v, 7);
        const requestedArea = task.target.match(
          /(?:삼각형|사각형) ([A-Z]{3,4})의 넓이/,
        );
        if (requestedArea && scales.length)
          expect(polygonArea(m, requestedArea[1]) * scales[0] ** 2).toBeCloseTo(
            v,
            7,
          );
        const areaGiven = prompt.text.match(
          /삼각형 ([A-Z]{3})의 넓이는? (\d+) cm²/,
        );
        if (areaGiven && requestedArea)
          expect(
            (polygonArea(m, requestedArea[1]) / triangleArea(m, areaGiven[1])) *
              Number(areaGiven[2]),
          ).toBeCloseTo(v, 7);
        const perimeterGiven = prompt.text.match(
            /삼각형 ([A-Z]{3})의 둘레는 (\d+) cm/,
          ),
          perimeterTarget = task.target.match(/삼각형 ([A-Z]{3})의 둘레/);
        if (perimeterGiven && perimeterTarget)
          expect(
            (perimeter(m, perimeterTarget[1]) /
              perimeter(m, perimeterGiven[1])) *
              Number(perimeterGiven[2]),
          ).toBeCloseTo(v, 7);
        if (m.points.I) {
          const distances = ["AB", "BC", "CA"].map((e) =>
            lineDistance(m.points.I, m.points[e[0]], m.points[e[1]]),
          );
          distances.forEach((d) => expect(d).toBeCloseTo(distances[0], 7));
          for (const [vertex, u, w] of ["ABC", "BCA", "CAB"])
            expect(measured(m, `${u}${vertex}I`)).toBeCloseTo(
              measured(m, `I${vertex}${w}`),
              7,
            );
          const r = distances[0],
            S = triangleArea(m, "ABC");
          expect(2 * S).toBeCloseTo(r * perimeter(m), 7);
          if (m.circles) expect(m.circles[0].radius).toBeCloseTo(r, 7);
          const givenArea = prompt.text.match(/넓이=(\d+) cm²/);
          if (givenArea && scales.length)
            expect(S * scales[0] ** 2).toBeCloseTo(Number(givenArea[1]), 7);
        }
        if (
          m.points.O &&
          (spec.topic.includes("외심") || spec.key.startsWith("right-circum"))
        ) {
          const r = segment(m, "OA");
          expect(segment(m, "OB")).toBeCloseTo(r, 7);
          expect(segment(m, "OC")).toBeCloseTo(r, 7);
          if (spec.key.startsWith("obtuse-circum-")) {
            expect(m.points.O[1]).toBeLessThan(m.points.B[1]);
            expect(m.points.A[1]).toBeGreaterThan(m.points.B[1]);
            expect(measured(m, "BOC")).toBeLessThan(180);
            expect(
              triangleArea(m, "OAB") +
                triangleArea(m, "OCA") -
                triangleArea(m, "OBC"),
            ).toBeCloseTo(triangleArea(m, "ABC"), 7);
          } else {
            expect(
              triangleArea(m, "OAB") +
                triangleArea(m, "OBC") +
                triangleArea(m, "OCA"),
            ).toBeCloseTo(triangleArea(m, "ABC"), 7);
          }
        }
        if (m.points.G)
          for (let axis = 0; axis < 2; axis++)
            expect(m.points.G[axis]).toBeCloseTo(
              (m.points.A[axis] + m.points.B[axis] + m.points.C[axis]) / 3,
              7,
            );
        if (spec.key.startsWith("external-bisector-")) {
          expect(m.points.D[0]).toBeGreaterThan(m.points.C[0]);
          expect(measured(m, "XAD")).toBeCloseTo(measured(m, "DAC"), 7);
        }
        const svg = figures[prompt.figureId!];
        expect(svg).toContain("<desc>arithmetic-geometry-drill-v1</desc>");
        expect(svg).not.toMatch(
          /script|foreignObject|href=|\?|font-size="1[0-7]"/,
        );
        expect(svg).toContain('viewBox="0 0 240 240"');
        if (spec.key === "centroid-median-sum")
          expect(svg).not.toContain('data-drill-label="segment-CF"');
        const svgPoints: Record<string, Point> = {};
        for (const l of svg.matchAll(
          /<line x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)" data-segment="([A-Z]{2})"/g,
        )) {
          svgPoints[l[5][0]] = [Number(l[1]), Number(l[2])];
          svgPoints[l[5][1]] = [Number(l[3]), Number(l[4])];
        }
        if (m.points.O && !svgPoints.O)
          svgPoints.O = [
            (svgPoints.A[0] + svgPoints.C[0]) / 2,
            (svgPoints.A[1] + svgPoints.C[1]) / 2,
          ];
        const svgModel = { ...m, points: svgPoints };
        const svgArcs = [
          ...svg.matchAll(
            /<path d="M ([\d.-]+) ([\d.-]+) A ([\d.-]+) ([\d.-]+) 0 0 [01] ([\d.-]+) ([\d.-]+)"/g,
          ),
        ];
        expect(svgArcs.length).toBe(m.arcs?.length ?? 0);
        for (const [index, arc] of svgArcs.entries()) {
          const key = m.arcs![index],
            vertex = svgPoints[key[1]],
            start: Point = [Number(arc[1]), Number(arc[2])],
            end: Point = [Number(arc[5]), Number(arc[6])];
          expect(angle(start, vertex, end)).toBeCloseTo(measured(m, key), 3);
          expect(length(start, vertex)).toBeCloseTo(Number(arc[3]), 4);
          expect(length(end, vertex)).toBeCloseTo(Number(arc[4]), 4);
        }
        for (const key of m.right ?? [])
          expect(measured(svgModel, key)).toBeCloseTo(90, 4);
        for (const given of prompt.text.matchAll(/∠([A-Z]{3})=(\d+)°/g))
          expect(measured(svgModel, given[1])).toBeCloseTo(Number(given[2]), 4);
        const outputScales = m.edges.map(
          (e) => segment(svgModel, e) / segment(m, e),
        );
        outputScales.forEach((s) => expect(s).toBeCloseTo(outputScales[0], 4));
        const labels = [...svg.matchAll(/<text[^>]+font-size="(\d+)"/g)];
        expect(labels.length).toBeGreaterThanOrEqual(
          Object.keys(m.points).length,
        );
        for (const l of labels)
          expect((Number(l[1]) * 216) / 240).toBeGreaterThanOrEqual(18);
      }
    });
  it("rejects noncanonical surd and rational forms and stale SVG identities", () => {
    for (const def of definitions) {
      const c = def.problemAt(0);
      if (c.prompt.layout !== "math") continue;
      expect(
        def.verify({
          ...c,
          prompt: { ...c.prompt, figureId: "old-or-forged" },
        }),
      ).toBe(false);
      expect(
        def.verify({
          ...c,
          answer: {
            ...c.answer,
            exact: ["0" + c.answer.exact[0], ...c.answer.exact.slice(1)],
          },
        }),
      ).toBe(false);
      expect(def.verify({ ...c, answer: { ...c.answer, text: "wrong" } })).toBe(
        false,
      );
    }
    const d = definitions.find(
        (d) => d.id === "m3-pythagoras-hypotenuse-surd",
      )!,
      c = d.problemAt(0);
    expect(
      definitions.find((d) => d.id === "m2-pythagoras-hypotenuse-integer")
        ?.grade,
    ).toBe("중2");
    expect(d.grade).toBe("중3");
    expect(definitions.some((d) => (d.grade as string).startsWith("고"))).toBe(
      false,
    );
    expect(
      d.verify({
        ...c,
        answer: {
          ...c.answer,
          exact: [
            String(Number(c.answer.exact[0]) * 2),
            c.answer.exact[1],
            "2",
          ],
        },
      }),
    ).toBe(false);
    expect(
      d.verify({
        ...c,
        answer: { ...c.answer, exact: ["1", "9007199254740881", "1"] },
      }),
    ).toBe(false);
  });
});
