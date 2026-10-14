// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  MEASUREMENT_GEOMETRY_DEFINITIONS as definitions,
  MEASUREMENT_GEOMETRY_FIGURES as figures,
} from "../../lib/arithmetic-v2/families/geometryMeasure";
import type {
  ArithmeticV2Answer,
  ArithmeticV2Candidate,
} from "../../lib/arithmetic-v2/types";

function numeric(a: ArithmeticV2Answer) {
  const x = a.exact.map(Number);
  if (a.kind === "integer") return x[0];
  if (a.kind === "rational") return x[0] / x[1];
  if (a.kind === "surd") return (x[0] * Math.sqrt(x[1])) / x[2];
  if (a.kind === "polynomial") return x[0] / x[1] + (x[2] / x[3]) * Math.PI;
  throw new Error(`Unexpected kind ${a.kind}`);
}
/** Oracle uses actual circular fractions / trig functions / physical decompositions.
 * Never imports generation helpers or family solve/check functions. */
function expected(id: string, p: number[]) {
  const [a, b, c] = p;
  if (id === "m3-circle-tangent-chord") return b;
  if (id === "m3-circle-equal-tangents") return a;
  if (/^m1-(prism|pyramid)-(base-area|height)-volume$/.test(id))
    return id.includes("base-area") ? a : b;
  if (/^m1-prism-(base-area|height)-surface$/.test(id))
    return id.includes("base-area") ? a * b : c;
  if (id === "m1-pyramid-slant-surface") return b;
  if (/^m1-(cylinder|cone)-(height|radius)-volume$/.test(id))
    return id.includes("radius") ? a : b;
  if (/^m1-cylinder-(height|radius)-lateral$/.test(id))
    return id.includes("radius") ? a : b;
  if (id === "m1-cylinder-height-surface") return b;
  if (/^m1-cone-(radius|generator)-(lateral|surface)$/.test(id))
    return id.includes("radius") ? a : b;
  if (/^m1-sphere-radius-(surface|volume)$/.test(id)) return a;
  if (id === "m1-parallel-angle") return 180 - b;
  if (id === "m1-triangle-exterior") return a + b;
  if (id === "m1-triangle-interior-exterior") return b;
  if (id.includes("polygon")) {
    if (id.includes("sides")) return a;
    if (id.endsWith("-sum")) return (a - 2) * 180;
    if (id.endsWith("-interior")) return 180 - 360 / a;
    if (id.endsWith("-exterior")) return 360 / a;
    return (
      Array.from({ length: a }, () => a - 3).reduce((s, n) => s + n, 0) / 2
    );
  }
  if (id.startsWith("m1-circle"))
    return id.includes("radius")
      ? a
      : id.endsWith("area")
        ? Math.PI * a * a
        : Math.PI * 2 * a;
  if (id.startsWith("m1-sector")) {
    if (id.includes("angle")) return b;
    if (id.includes("radius")) return a;
    const radians = (b * Math.PI) / 180;
    return id.endsWith("perimeter")
      ? a * radians + 2 * a
      : id.endsWith("-arc") && !id.endsWith("area-arc")
        ? a * radians
        : (a * a * radians) / 2;
  }
  if (id === "m1-prism-volume") return a * b;
  if (id === "m1-prism-surface") return 2 * (a * b + a * c + b * c);
  if (id === "m1-pyramid-volume") return (a * b) / 3;
  if (id === "m1-pyramid-surface") return a * a + 4 * ((a * b) / 2);
  if (id.startsWith("m1-cylinder"))
    return id.endsWith("volume")
      ? Math.PI * a * a * b
      : 2 * Math.PI * a * b +
          (id.endsWith("surface") ? 2 * Math.PI * a * a : 0);
  if (id.startsWith("m1-cone"))
    return id.endsWith("volume")
      ? (Math.PI * a * a * b) / 3
      : Math.PI * a * b + (id.endsWith("surface") ? Math.PI * a * a : 0);
  if (id.startsWith("m1-sphere"))
    return id.endsWith("volume")
      ? (Math.PI * 4 * a * a * a) / 3
      : Math.PI * 4 * a * a;
  if (id === "m3-circle-inscribed" || id === "m3-circle-same-arc") return a;
  if (id === "m3-circle-central") return 2 * a;
  if (id === "m3-circle-cyclic-opposite") return 180 - a;
  if (id === "m3-circle-tangent-angle") return 90 - a;
  if (id.includes("chord"))
    return Math.sqrt(a * a - b * b) * (id.endsWith("length") ? 2 : 1);
  if (id === "m3-trig-ratio") {
    const triples = [
      [3, 4, 5],
      [4, 3, 5],
      [5, 12, 13],
      [12, 5, 13],
      [8, 15, 17],
      [15, 8, 17],
      [20, 21, 29],
      [21, 20, 29],
    ];
    const theta = Math.atan2(triples[a][0], triples[a][1]);
    return [Math.sin, Math.cos, Math.tan][c](theta);
  }
  if (id === "m3-trig-special-value")
    return [Math.sin, Math.cos, Math.tan][b]((a * Math.PI) / 180);
  if (id === "m3-trig-special-length") {
    const s = Math.sin((a * Math.PI) / 180),
      co = Math.cos((a * Math.PI) / 180),
      t = Math.tan((a * Math.PI) / 180);
    return b * [s, co, 1 / s, 1 / co, t, 1 / t][c];
  }
  if (id === "m3-trig-triangle-area")
    return (a * b * Math.sin((c * Math.PI) / 180)) / 2;
  throw new Error(`Missing independent oracle ${id}`);
}
const all = definitions.flatMap((d) =>
  Array.from({ length: d.domainSize }, (_, i) => ({ d, i, c: d.problemAt(i) })),
);

describe("measurement geometry finite domains", () => {
  it("independently reconstructs every inverse solid's visibly given measurement", () => {
    const coefficient = (text: string) => {
      const [n, d = "1"] = text.replace("π", "").split("/");
      return Number(n) / Number(d);
    };
    const read = (text: string, re: RegExp) => {
      const m = text.match(re);
      expect(m, text).not.toBeNull();
      return coefficient(m![1]);
    };
    let checked = 0;
    for (const { d, c } of all) {
      if (
        !/^m1-(prism|pyramid|cylinder|cone|sphere)-.+-(volume|surface|lateral)$/.test(
          d.id,
        ) ||
        c.prompt.layout !== "math"
      )
        continue;
      const t = c.prompt.text,
        x = numeric(c.answer),
        id = d.id;
      let rebuilt: number, given: number;
      if (id.includes("prism") || id.includes("pyramid")) {
        if (id.endsWith("volume")) {
          given = read(t, /부피 ([\d/]+) cm³/);
          const other = id.includes("height")
            ? read(t, /밑넓이 (\d+) cm²/)
            : read(t, /h=(\d+) cm/);
          rebuilt = (x * other) / (id.includes("pyramid") ? 3 : 1);
        } else if (id.includes("slant")) {
          given = read(t, /겉넓이 (\d+) cm²/);
          const edge = read(t, /a=(\d+) cm/);
          rebuilt = edge * edge + 2 * edge * x;
        } else {
          given = read(t, /겉넓이 (\d+) cm²/);
          const perimeter = read(t, /둘레 (\d+) cm/);
          rebuilt = id.includes("height")
            ? 2 * read(t, /밑넓이 (\d+) cm²/) + perimeter * x
            : 2 * x + perimeter * read(t, /h=(\d+) cm/);
        }
      } else if (id.includes("sphere")) {
        given = read(t, /(?:겉넓이|부피) ([\dπ/]+) cm/);
        rebuilt = id.endsWith("surface") ? 4 * x * x : (4 * x * x * x) / 3;
      } else if (id.endsWith("volume")) {
        given = read(t, /부피 ([\dπ/]+) cm³/);
        const r = id.includes("radius") ? x : read(t, /r=(\d+) cm/),
          h = id.includes("height") ? x : read(t, /h=(\d+) cm/);
        rebuilt = (r * r * h) / (id.includes("cone") ? 3 : 1);
      } else {
        given = read(t, /(?:겉넓이|옆넓이) ([\dπ/]+) cm²/);
        const r = id.includes("radius") ? x : read(t, /r=(\d+) cm/);
        const height = id.includes("radius") ? read(t, /[hl]=(\d+) cm/) : x;
        const base = id.endsWith("surface") ? r * r : 0;
        rebuilt = id.includes("cone")
          ? r * height + base
          : 2 * r * height + 2 * base;
      }
      expect(rebuilt!, id + " " + c.parameters).toBeCloseTo(given!, 10);
      checked++;
    }
    expect(checked).toBeGreaterThan(1000);
  });
  it("enumerates actual unique tasks, exact independent answers, prompts and lazy figures", () => {
    const ids = new Set<string>(),
      prompts = new Set<string>();
    for (const { d, c } of all) {
      expect(d.verify(c), `${d.id} ${c.parameters}`).toBe(true);
      expect(
        Math.abs(numeric(c.answer) - expected(d.id, c.parameters)),
        `${d.id} ${c.parameters}`,
      ).toBeLessThan(1e-8);
      expect(c.prompt.layout).toBe("math");
      if (c.prompt.layout !== "math") continue;
      expect(c.prompt.text.length).toBeGreaterThan(0);
      expect(c.prompt.instruction?.length).toBeGreaterThan(0);
      expect(c.prompt.answerUnit).toBeDefined();
      if (d.id.startsWith("m1-polygon-sides-"))
        expect(c.prompt.figureId).toBeUndefined();
      else {
        expect(c.prompt.figureId!.length).toBeLessThanOrEqual(64);
        expect(ids.has(c.prompt.figureId!)).toBe(false);
        ids.add(c.prompt.figureId!);
        expect(
          Object.getOwnPropertyDescriptor(figures, c.prompt.figureId!)?.get,
        ).toBeTypeOf("function");
      }
      const identity = c.prompt.latex;
      expect(prompts.has(identity), `${d.id} ${c.parameters}`).toBe(false);
      prompts.add(identity);
    }
    expect(Object.keys(figures).length).toBe(all.length - 25);
  });
  it("rejects every out of range/noninteger index", () => {
    for (const d of definitions)
      for (const i of [-1, d.domainSize, 1.5, NaN, Infinity])
        expect(() => d.problemAt(i)).toThrow();
  });
  it("accepts field reordering; rejects malformed parameters, displays, exact values and figures", () => {
    for (const d of definitions) {
      const c = d.problemAt(Math.floor(d.domainSize / 2));
      const reordered = {
        ...c,
        prompt: Object.fromEntries(Object.entries(c.prompt).reverse()),
      } as ArithmeticV2Candidate;
      expect(d.verify(reordered), d.id).toBe(true);
      const mutations: unknown[] = [
        null,
        {},
        { ...c, parameters: [] },
        { ...c, parameters: [...c.parameters, 1] },
        { ...c, parameters: [NaN] },
        { ...c, answer: { ...c.answer, exact: ["0"] } },
        { ...c, answer: { ...c.answer, text: "wrong" } },
        { ...c, answer: { ...c.answer, latex: "wrong" } },
        { ...c, answer: { ...c.answer, exact: ["01"] } },
        { ...c, prompt: { ...c.prompt, figureId: "bad" } },
        { ...c, prompt: { ...c.prompt, answerUnit: "bad" } },
        { ...c, prompt: { ...c.prompt, instruction: "bad" } },
        { ...c, prompt: { ...c.prompt, extra: "bad" } },
      ];
      for (const bad of mutations)
        expect(d.verify(bad as ArithmeticV2Candidate), d.id).toBe(false);
    }
  });
  it("keeps irrational, rational and symbolic-pi canonical answers exact", () => {
    const find = (id: string, p: number[]) =>
      all.find((x) => x.d.id === id && x.c.parameters.join() === p.join())!.c;
    expect(find("m3-trig-special-value", [30, 2]).answer.exact).toEqual([
      "1",
      "3",
      "3",
    ]);
    expect(find("m3-trig-special-length", [30, 7, 3]).answer.exact).toEqual([
      "14",
      "3",
      "3",
    ]);
    expect(find("m3-trig-special-length", [45, 7, 2]).answer.exact).toEqual([
      "7",
      "2",
      "1",
    ]);
    expect(find("m1-sector-perimeter", [2, 30]).answer.exact).toEqual([
      "4",
      "1",
      "1",
      "3",
    ]);
    expect(find("m1-sphere-volume", [2]).answer.exact).toEqual([
      "0",
      "1",
      "32",
      "3",
    ]);
    expect(find("m1-pyramid-volume", [5, 2]).answer.exact).toEqual(["10", "3"]);
    const d = definitions.find((d) => d.id === "m3-trig-special-value")!,
      c = find(d.id, [30, 2]);
    for (const exact of [
      ["2", "3", "6"],
      ["1", "12", "6"],
      ["-1", "3", "-3"],
    ])
      expect(d.verify({ ...c, answer: { ...c.answer, exact } })).toBe(false);
  });
});

describe("every exact SVG", () => {
  it("has safe primitives, readable label anchors, actual angles and perpendicular marks", () => {
    for (const { d, c } of all) {
      if (c.prompt.layout !== "math" || !c.prompt.figureId) continue;
      const s = figures[c.prompt.figureId!],
        context = `${d.id} ${c.parameters}`;
      expect(s).toContain("<desc>arithmetic-geometry-drill-v1</desc>");
      expect(s).toContain('viewBox="0 0 240 240"');
      expect(s).toContain('font-size="20"');
      expect(s).not.toMatch(/<script|<foreignObject|<image|href=|onload=|\?/);
      for (const match of s.matchAll(
        /<text x="([\d.-]+)" y="([\d.-]+)" data-drill-label="[^"]+"[^>]*>(.*?)<\/text>/g,
      )) {
        const x = Number(match[1]),
          y = Number(match[2]);
        expect(x, context).toBeGreaterThanOrEqual(12);
        expect(x, context).toBeLessThanOrEqual(228);
        expect(y, context).toBeGreaterThanOrEqual(12);
        expect(y, context).toBeLessThanOrEqual(228);
      }
      for (const match of s.matchAll(
        /data-drill-angle="(?:given|target)" data-points="([^"]+)"(?: data-given="([^"]+)")?/g,
      )) {
        const ps = match[1].split(" ").map((p) => p.split(",").map(Number));
        const [a, o, b] = ps,
          u = [a[0] - o[0], a[1] - o[1]],
          v = [b[0] - o[0], b[1] - o[1]];
        const measured =
          (Math.acos(
            Math.max(
              -1,
              Math.min(
                1,
                (u[0] * v[0] + u[1] * v[1]) /
                  (Math.hypot(...u) * Math.hypot(...v)),
              ),
            ),
          ) *
            180) /
          Math.PI;
        if (match[2])
          expect(Math.abs(measured - Number(match[2])), context).toBeLessThan(
            0.0001,
          );
        else if (!d.id.includes("trig"))
          expect(
            Math.abs(measured - numeric(c.answer)),
            `target ${context}`,
          ).toBeLessThan(0.0001);
      }
      for (const match of s.matchAll(
        /data-drill-right="true" data-points="([^"]+)"/g,
      )) {
        const [a, o, b] = match[1]
          .split(" ")
          .map((p) => p.split(",").map(Number));
        expect(
          Math.abs(
            (a[0] - o[0]) * (b[0] - o[0]) + (a[1] - o[1]) * (b[1] - o[1]),
          ),
          context,
        ).toBeLessThan(0.002);
      }
    }
  });
});
