// @vitest-environment node
import { describe, expect, it } from "vitest";
import { arithmeticGeometryText } from "@/lib/arithmetic-v2/presentation/text";
import {
  COUNT_GEOMETRY_DEFINITIONS as definitions,
  COUNT_GEOMETRY_FIGURES as figures,
} from "@/lib/arithmetic-v2/families/geometryCounts";
import { arithmeticV2CandidateSchema } from "@/contracts/arithmeticV2.contract";
import {
  buildArithmeticV2Sheet,
  reopenArithmeticV2Sheet,
} from "@/lib/arithmetic-v2";
import { arithmeticToStudioProblems } from "@/lib/arithmeticOutput";

describe("direct polygon and polyhedron counts", () => {
  it("checks every finite count from vertex degrees, Euler or polygon partitions", () => {
    expect(definitions).toHaveLength(23);
    let checked = 0;
    for (const definition of definitions) {
      const texts = new Set<string>();
      for (let index = 0; index < definition.domainSize; index++) {
        const candidate = arithmeticV2CandidateSchema.parse(
          definition.problemAt(index),
        );
        const [n] = candidate.parameters;
        const id = definition.id;
        const inverse = id.includes("-base-from-") || id.includes("-sides-");
        let expected = n;
        if (!inverse) {
          if (id === "m1-polygon-vertex-diagonals") expected = n - 3;
          else if (id === "m1-polygon-fan-triangles") expected = n - 2;
          else {
            const pyramid = id.includes("-pyramid-");
            const vertexCount = pyramid ? n + 1 : n * 2;
            const degreeSum = pyramid ? n * 3 + n : vertexCount * 3;
            expected = id.includes("-vertices-")
              ? vertexCount
              : id.includes("-edges-")
                ? degreeSum / 2
                : 2 - vertexCount + degreeSum / 2;
          }
        }
        expect(candidate.answer).toEqual({
          kind: "integer",
          exact: [String(expected)],
          text: `${expected}개`,
          latex: `${expected}\\,\\text{개}`,
        });
        expect(definition.verify(candidate)).toBe(true);
        expect(
          definition.verify({
            ...candidate,
            answer: { ...candidate.answer, exact: [String(expected + 1)] },
          }),
        ).toBe(false);
        const reordered = {
          ...candidate,
          prompt: Object.fromEntries(
            Object.entries(candidate.prompt).reverse(),
          ) as typeof candidate.prompt,
        };
        expect(definition.verify(reordered)).toBe(true);
        if (candidate.prompt.layout !== "math")
          throw new Error("math expected");
        expect(texts.has(candidate.prompt.text)).toBe(false);
        texts.add(candidate.prompt.text);
        if (inverse) expect(candidate.prompt.figureId).toBeUndefined();
        else
          expect(figures[candidate.prompt.figureId!]).toContain(
            "arithmetic-geometry-drill-v1",
          );
        checked++;
      }
      for (const index of [-1, 0.5, NaN, Infinity, definition.domainSize])
        expect(() => definition.problemAt(index)).toThrow();
    }
    expect(checked).toBe(256);
  });

  it("draws exactly the actual polyhedron edges and vertices without numeric answer labels", () => {
    for (const definition of definitions.filter(
      (d) => !d.id.includes("polygon") && d.id.endsWith("-count"),
    )) {
      for (let index = 0; index < definition.domainSize; index++) {
        const candidate = definition.problemAt(index);
        if (candidate.prompt.layout !== "math")
          throw new Error("math expected");
        const svg = figures[candidate.prompt.figureId!];
        const edges = [
          ...svg.matchAll(
            /<line x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"/g,
          ),
        ];
        const vertices = new Set(
          edges.flatMap((m) => [`${m[1]},${m[2]}`, `${m[3]},${m[4]}`]),
        );
        const actual = definition.id.includes("-faces-")
          ? 2 - vertices.size + edges.length
          : definition.id.includes("-edges-")
            ? edges.length
            : vertices.size;
        expect(actual).toBe(Number(candidate.answer.exact[0]));
        expect(svg.match(/<text\b/g)).toHaveLength(1);
        expect(svg).not.toMatch(/<script|foreignObject|\bon\w+=|(?:href|src)=/);
      }
    }
  });

  it("keeps inverse answers hidden and gives text-only problems their count unit in saved output", () => {
    const ids = definitions
      .filter((d) => d.id.includes("-base-from-") || d.id.includes("-sides-"))
      .map((d) => d.id);
    const sheet = buildArithmeticV2Sheet({
      engineVersion: "arithmetic-engine-v2",
      catalogVersion: "arithmetic-catalog-v2",
      seed: "inverse-counts",
      rounds: [{ allocations: ids.map((typeId) => ({ typeId, count: 2 })) }],
    });
    expect(sheet.figures).toBeUndefined();
    expect(reopenArithmeticV2Sheet(JSON.parse(JSON.stringify(sheet)))).toEqual(
      sheet,
    );
    const problems = arithmeticToStudioProblems(sheet);
    for (const [index, item] of sheet.rounds[0].items.entries()) {
      if (item.prompt.layout !== "math") throw new Error("math expected");
      expect(problems[index].content).toContain(
        arithmeticGeometryText(item.prompt.text),
      );
      expect(problems[index].content).toContain("$ 개");
      expect(problems[index].content).not.toContain("[그림1]");
      expect(problems[index].figureSvg).toBeNull();
    }
  });
});
