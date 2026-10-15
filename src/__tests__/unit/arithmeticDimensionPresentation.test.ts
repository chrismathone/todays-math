import { describe, expect, it } from "vitest";
import { inflateSync, strFromU8 } from "fflate";
import asset from "../../lib/arithmetic-v2/presentation/dimensions-assets-v1.json";
import { presentArithmeticDimensionSvg } from "../../lib/arithmetic-v2/presentation/dimensions";
import { planeSpecs } from "../../lib/arithmetic-v2/families/geometryElementary/plane";
import { measurementSpecs } from "../../lib/arithmetic-v2/families/geometryElementary/measurement";
import { solidCircleSpecs } from "../../lib/arithmetic-v2/families/geometryElementary/solidsCircle";
import { netSpecs } from "../../lib/arithmetic-v2/families/geometryElementary/net";

const specs = [
  ...planeSpecs,
  ...measurementSpecs.filter((s) => s.id.startsWith("e3-circle-")),
  ...solidCircleSpecs,
  ...netSpecs,
];
const svgFor = (family: string, p: number[]) => {
  const spec = specs.find((s) => s.id === family)!;
  return presentArithmeticDimensionSvg(
    `age-${family}-v1-${p.join("-")}`,
    spec.present(p).svg(),
  )!;
};

describe("trusted arithmetic dimension presentation", () => {
  it("covers exactly the approved finite domain and matches every canonical SVG byte", () => {
    expect(Object.keys(asset.families).sort()).toEqual(
      specs.map((s) => s.id).sort(),
    );
    for (const spec of specs) {
      const pack = asset.families[spec.id as keyof typeof asset.families];
      const rows = JSON.parse(
        strFromU8(
          inflateSync(Uint8Array.from(atob(pack), (c) => c.charCodeAt(0))),
        ),
      ) as Record<string, [string, string]>;
      expect(Object.keys(rows).sort(), spec.id).toEqual(
        spec.domain.map((p) => p.join("-")).sort(),
      );
      for (const p of spec.domain) {
        const id = `age-${spec.id}-v1-${p.join("-")}`;
        const original = spec.present(p).svg();
        const before = JSON.stringify(spec.present(p));
        expect(rows[p.join("-")][0], id).toBe(original);
        const display = presentArithmeticDimensionSvg(id, original);
        expect(display, id).toBe(rows[p.join("-")][1]);
        expect(display, id).toContain(
          "arithmetic-geometry-drill-dimensions-v1",
        );
        expect(display, id).toContain("data-dimension-curve");
        expect(display, id).toContain("line-gap-");
        expect(display, id).not.toMatch(/<script|foreignObject|NaN|Infinity/);
        const numbers = (svg: string) =>
          [...svg.matchAll(/<text\b[^>]*>(.*?)<\/text>/g)]
            .flatMap((m) => m[1].match(/\d+(?:\.\d+)?/g) ?? [])
            .sort();
        expect(numbers(display!), `${id}: exact numerical givens`).toEqual(
          numbers(original),
        );
        const shape = /<path data-drill-shape="polygon" d="([^"]+)"/.exec(
          original,
        )?.[1];
        if (shape)
          expect(display, `${id}: source polygon geometry`).toContain(
            `d="${shape}"`,
          );
        expect(JSON.stringify(spec.present(p)), id).toBe(before);
      }
    }
  });

  it("fails closed for modified source, unknown IDs, unsupported families and prototypes", () => {
    const spec = planeSpecs[0],
      original = spec.present(spec.domain[0]).svg();
    const id = `age-${spec.id}-v1-${spec.domain[0].join("-")}`;
    expect(
      presentArithmeticDimensionSvg(id, original.replace("4 cm", "99 cm")),
    ).toBeUndefined();
    expect(presentArithmeticDimensionSvg(id, original + " ")).toBeUndefined();
    expect(
      presentArithmeticDimensionSvg(id, "<svg><script/></svg>"),
    ).toBeUndefined();
    for (const unknown of [
      "__proto__",
      "age-constructor-v1-4-3",
      "age-e5-rectangle-area-v1-999-999",
      "age-e6-cylinder-net-area-v1-4-8-314-0",
      "age-e5-rectangle-area-v2-4-3",
    ])
      expect(presentArithmeticDimensionSvg(unknown, original)).toBeUndefined();
  });

  it("measures the actual horizontal and vertical rectangle sides", () => {
    const svg = svgFor("e5-rectangle-area", [4, 3]);
    expect(svg).toContain('data-endpoints="-104 78 104 78"');
    expect(svg).toContain('data-endpoints="104 -78 104 78"');
    expect(svg).toContain(">4 cm</text>");
    expect(svg).toContain(">3 cm</text>");
    expect(svg.match(/data-dimension-curve=/g)).toHaveLength(2);
  });

  it("keeps inverse targets unnamed numerically and connects full diagonals", () => {
    const rectangle = svgFor("e5-rectangle-area-side", [4, 3]);
    expect(rectangle).toContain(">가로</text>");
    expect(rectangle).toContain(">넓이 12 cm²</text>");
    expect(rectangle).not.toContain(">4 cm</text>");
    const rhombus = svgFor("e5-rhombus-area-diagonal", [8, 6]);
    expect(rhombus).toContain('data-endpoints="-104 0 104 0"');
    expect(rhombus).toContain('data-endpoints="0 -78 0 78"');
    expect(rhombus).toContain(">가로 대각선</text>");
    expect(rhombus.match(/data-dimension-witness=/g)).toHaveLength(4);
    expect(rhombus).not.toContain(">8 cm</text>");
  });

  it("distinguishes radius from diameter and solid face area from edge length", () => {
    expect(svgFor("e3-circle-diameter", [4])).toContain(
      'data-endpoints="0 0 105.6 0"',
    );
    expect(svgFor("e3-circle-radius", [4])).toContain(
      'data-endpoints="-105.6 0 105.6 0"',
    );
    const inverse = svgFor("e6-circle-radius-area", [4, 314]);
    expect(inverse).toContain(">반지름</text>");
    expect(inverse).not.toContain(">4 cm</text>");
    const solid = svgFor("e6-cuboid-base-height", [12, 3]);
    expect(solid).toContain(">밑넓이 12 cm²</text>");
    expect(solid.match(/data-dimension-curve=/g)).toHaveLength(1);
    expect(solid).toContain('data-dimension="height"');
  });

  it("anchors net dimensions to the circular radius or diameter and to the rectangle height", () => {
    for (const spec of netSpecs)
      for (const p of spec.domain) {
        const original = spec.present(p).svg();
        const shown = svgFor(spec.id, p);
        const base =
          /<circle data-drill-net-base="true" cx="120" cy="([^"]+)" r="([^"]+)"/.exec(
            original,
          )!;
        const radius = Number(base[2]);
        // Derive the meaning from the published task, never from the display adapter.
        const type =
          spec.id.endsWith("-diameter") ||
          (!spec.id.endsWith("-radius") && p[3] === 1)
            ? "diameter"
            : "radius";
        const dimensions = [
          ...shown.matchAll(
            /<g data-dimension="([^"]+)" data-endpoints="([^"]+)"/g,
          ),
        ];
        expect(dimensions.map((m) => m[1]).sort()).toEqual(
          [type, "height"].sort(),
        );
        const endpoints = dimensions
          .find((m) => m[1] === type)![2]
          .split(" ")
          .map(Number);
        expect(endpoints[1]).toBeCloseTo((Number(base[1]) - 125) * 1.6, 4);
        expect(endpoints[3]).toBe(endpoints[1]);
        expect(endpoints[2] - endpoints[0]).toBeCloseTo(
          radius * 1.6 * (type === "diameter" ? 2 : 1),
          4,
        );
        expect(shown.match(/data-drill-net-base="true"/g)).toHaveLength(2);
        expect(shown).not.toContain('data-dimension="width"');
      }
  });
});
