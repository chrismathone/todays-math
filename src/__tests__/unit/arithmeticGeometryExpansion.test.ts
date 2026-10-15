// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  arithmeticV2CandidateSchema,
  arithmeticV2PromptIdentity,
} from "@/contracts/arithmeticV2.contract";
import {
  buildArithmeticV2Sheet,
  listArithmeticV2Types,
  reopenArithmeticV2Sheet,
} from "@/lib/arithmetic-v2";
import {
  EXTRA_GEOMETRY_DEFINITIONS,
  EXTRA_GEOMETRY_FIGURE_MAPS,
} from "@/lib/arithmetic-v2/extraGeometry";
import {
  arithmeticGeometryAssetIds,
  arithmeticGeometrySvg,
} from "@/lib/arithmetic-v2/geometry";
import { ARITHMETIC_GEOMETRY_PACK_MAX_LENGTH } from "@/lib/arithmetic-v2/geometryPack";
import { arithmeticToStudioProblems } from "@/lib/arithmeticOutput";
import { presentArithmeticGeometrySvg } from "@/lib/arithmetic-v2/presentation";
import {
  arithmeticGeometryText,
  arithmeticGeometryUnitText,
} from "@/lib/arithmetic-v2/presentation/text";
import { figureSvgAngleDrillWidthMm } from "@/lib/figure/figureSvgFrame";
import { regenerateArithmeticV2Items } from "@/lib/arithmeticRegeneration";
import { parseStrictJson } from "@/lib/textbook/strictJson";

const request = (ids: string[], seed = "all-grade-geometry") => ({
  engineVersion: "arithmetic-engine-v2" as const,
  catalogVersion: "arithmetic-catalog-v2" as const,
  seed,
  rounds: [0, 100]
    .map((offset) => ({
      allocations: ids.slice(offset, offset + 100).map((typeId) => ({
        typeId,
        count: 1,
      })),
    }))
    .filter((round) => round.allocations.length),
});

describe("integrated elementary and middle-school geometry", () => {
  it("registers distinct finite families in every applicable grade with usable default quantities", () => {
    expect(EXTRA_GEOMETRY_DEFINITIONS.length).toBeGreaterThan(0);
    const catalog = listArithmeticV2Types();
    const ids = EXTRA_GEOMETRY_DEFINITIONS.map((definition) => definition.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(
      new Set(EXTRA_GEOMETRY_DEFINITIONS.map((definition) => definition.grade)),
    ).toEqual(
      new Set(["초2", "초3", "초4", "초5", "초6", "중1", "중2", "중3"]),
    );
    const figureIds = EXTRA_GEOMETRY_FIGURE_MAPS.flatMap((figures) =>
      Object.keys(figures),
    );
    expect(new Set(figureIds).size).toBe(figureIds.length);
    for (const definition of EXTRA_GEOMETRY_DEFINITIONS) {
      const entry = catalog.find((type) => type.id === definition.id)!;
      expect(entry).toBeDefined();
      expect(entry.defaultCount).toBeGreaterThan(0);
      expect(entry.defaultCount).toBeLessThanOrEqual(definition.domainSize);
      expect(entry.example).toMatchObject({
        layout: "math",
        answerUnit: expect.any(String),
      });
    }
  });

  // The family suites independently check the mathematics. This gate verifies
  // every actual candidate survives the shared public contract and registry.
  for (const definition of EXTRA_GEOMETRY_DEFINITIONS) {
    it(`${definition.id}: every checked candidate fits the shared schema`, () => {
      const identities = new Set<string>();
      for (let index = 0; index < definition.domainSize; index++) {
        const candidate = arithmeticV2CandidateSchema.parse(
          definition.problemAt(index),
        );
        expect(definition.verify(candidate)).toBe(true);
        if (candidate.prompt.layout !== "math")
          throw new Error("Geometry must have a math prompt");
        if (candidate.prompt.figureId)
          expect(
            arithmeticGeometryAssetIds.has(candidate.prompt.figureId),
          ).toBe(true);
        expect(candidate.prompt.answerUnit).toBeDefined();
        expect(candidate.prompt.text.trim().length).toBeGreaterThan(0);
        const identity = arithmeticV2PromptIdentity(candidate.prompt);
        expect(identities.has(identity)).toBe(false);
        identities.add(identity);
      }
    });
  }

  it("round-trips every family, keeps givens and units in shared output, and remains within save/regenerate limits", () => {
    const definitions = EXTRA_GEOMETRY_DEFINITIONS;
    // 200 different types exercises the diverse-figure pack, not 200 copies.
    for (let offset = 0; offset < definitions.length; offset += 200) {
      const ids = definitions
        .slice(offset, offset + 200)
        .map((definition) => definition.id);
      const sheet = buildArithmeticV2Sheet(request(ids));
      expect(sheet.figures?.version).toBe(2);
      expect(sheet.figures!.svgPack.length).toBeLessThanOrEqual(
        ARITHMETIC_GEOMETRY_PACK_MAX_LENGTH,
      );
      const saveBody = JSON.stringify({
        kind: "arithmeticSheet",
        title: "도형 연습",
        payload: sheet,
        expectedRevision: null,
      });
      expect(Buffer.byteLength(saveBody)).toBeLessThan(256 * 1024);
      expect(() =>
        parseStrictJson(saveBody, { maxBytes: 256 * 1024, maxDepth: 16 }),
      ).not.toThrow();
      const body = JSON.stringify({
        sheet,
        seed: "new-shapes",
        target: { round: 1, orders: [1] },
      });
      expect(() =>
        parseStrictJson(body, {
          maxBytes: 256 * 1024,
          maxDepth: 16,
          maxTokens: 40_000,
          maxStringLength: ARITHMETIC_GEOMETRY_PACK_MAX_LENGTH,
        }),
      ).not.toThrow();
      const reopened = reopenArithmeticV2Sheet(
        JSON.parse(JSON.stringify(sheet)),
      );
      expect(reopened).toEqual(sheet);
      const output = arithmeticToStudioProblems(reopened);
      const items = sheet.rounds.flatMap((round) => round.items);
      expect(output).toHaveLength(items.length);
      items.forEach((item, index) => {
        if (item.prompt.layout !== "math")
          throw new Error("Geometry must have a math prompt");
        expect(output[index].content).toContain(
          arithmeticGeometryText(item.prompt.text),
        );
        if (item.prompt.answerUnit && item.prompt.answerUnit !== "°")
          expect(output[index].content).toContain(
            arithmeticGeometryUnitText(item.prompt.answerUnit),
          );
        expect(output[index].answer).toBe(`$${item.answer.latex}$`);
        if (item.prompt.figureId) {
          const displayed = presentArithmeticGeometrySvg(
            item.prompt.figureId,
            arithmeticGeometrySvg(item.prompt.figureId, sheet.figures!),
          );
          expect(output[index].figureSourceMm).toEqual([
            figureSvgAngleDrillWidthMm(displayed),
          ]);
          expect(output[index].figureSvg).toBe(displayed);
        } else {
          expect(output[index].figureSvg).toBeNull();
          expect(output[index].content).not.toContain("[그림1]");
        }
      });
    }
  });

  it("regenerates selected centers and measurements while retaining every other saved item and SVG", () => {
    const ids = [
      "m2-circum-central-angle",
      "m2-incenter-central-angle",
      "m2-centroid-area-3",
      "m3-pythagoras-hypotenuse-surd",
      "m1-sector-perimeter",
      "e6-circle-area-radius",
    ];
    const input = request(ids);
    input.rounds.push(input.rounds[0]);
    const before = buildArithmeticV2Sheet(input);
    const previousBytes = JSON.stringify(before);
    const result = regenerateArithmeticV2Items(
      before,
      { round: 2, orders: [1, 2, 5] },
      "new-centers",
    );
    expect(result.changedOrders).toEqual([1, 2, 5]);
    expect(result.unchangedOrders).toEqual([]);
    expect(JSON.stringify(before)).toBe(previousBytes);
    expect(result.sheet.rounds[0]).toEqual(before.rounds[0]);
    expect(reopenArithmeticV2Sheet(result.sheet)).toEqual(result.sheet);
    for (const round of before.rounds) {
      for (const item of round.items) {
        if (round.round === 2 && [1, 2, 5].includes(item.order)) continue;
        expect(
          result.sheet.rounds[round.round - 1].items[item.order - 1],
        ).toEqual(item);
        if (item.prompt.layout !== "math")
          throw new Error("Geometry must have a math prompt");
        expect(
          arithmeticGeometrySvg(item.prompt.figureId!, result.sheet.figures!),
        ).toBe(arithmeticGeometrySvg(item.prompt.figureId!, before.figures!));
      }
    }
  });
});
