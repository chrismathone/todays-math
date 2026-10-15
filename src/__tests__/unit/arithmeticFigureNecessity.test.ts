import { describe, expect, it } from "vitest";
import { getArithmeticV2Definition } from "@/lib/arithmetic-v2/registry";
import {
  arithmeticGeometryAssetIds,
  arithmeticGeometryCatalogSvg,
} from "@/lib/arithmetic-v2/geometry";
import { ELEMENTARY_FIGURE_POLICY } from "@/lib/arithmetic-v2/presentation/figurePolicyElementary";
import { MIDDLE_FIGURE_POLICY } from "@/lib/arithmetic-v2/presentation/figurePolicyMiddle";
import { arithmeticFigurePresentation } from "@/lib/arithmetic-v2/presentation/figurePolicy";
import { arithmeticGeometryWording } from "@/lib/arithmetic-v2/presentation/text";
import { simplifyArithmeticFigureAnnotations } from "@/lib/arithmetic-v2/presentation/figureAnnotations";
import { presentArithmeticSegmentSvg } from "@/lib/arithmetic-v2/presentation/segments";
import { presentArithmeticRemainingSvg } from "@/lib/arithmetic-v2/presentation/remaining";

const policies = [...ELEMENTARY_FIGURE_POLICY, ...MIDDLE_FIGURE_POLICY];
const parse = (svg: string) =>
  new DOMParser().parseFromString(svg, "image/svg+xml");
const signatures = (nodes: Iterable<Element>) =>
  [...nodes].map((node) => {
    const copy = node.cloneNode(true) as Element;
    copy.removeAttribute("mask");
    return copy.outerHTML;
  });

describe("audited figure necessity and redundant annotations", () => {
  it("covers each canonical figure once and preserves the public text of every omitted candidate", () => {
    const seen = new Set<string>();
    let omitted = 0,
      retained = 0;
    for (const policy of policies) {
      const definition = getArithmeticV2Definition(policy.typeId);
      for (let index = 0; index < definition.domainSize; index++) {
        const { prompt } = definition.problemAt(index);
        if (prompt.layout !== "math" || !prompt.figureId)
          throw new Error(policy.typeId);
        expect(seen.has(prompt.figureId)).toBe(false);
        seen.add(prompt.figureId);
        const presentation = arithmeticFigurePresentation(
          prompt,
          policy.typeId,
        );
        expect(presentation).toEqual(arithmeticFigurePresentation(prompt));
        expect(presentation.showFigure).toBe(policy.showFigure);
        expect(presentation.lines.join("\n")).not.toContain("겨냥도");
        if (!policy.showFigure) {
          omitted++;
          expect(presentation.lines[0]).toBe(
            arithmeticGeometryWording(
              policy.typeId === "m1-triangle-exterior"
                ? prompt.text.replace("표시된 외각", "외각")
                : prompt.text,
            ),
          );
          expect(presentation.lines.join("\n")).not.toMatch(
            /그림|표시된|표시한|숫자가 없는/,
          );
        } else retained++;
      }
    }
    expect(seen).toEqual(arithmeticGeometryAssetIds);
    expect([policies.length, omitted, retained]).toEqual([248, 17375, 177]);
  });

  it("keeps every retained point and structural stroke while removing only repeated measurement annotations", () => {
    let checked = 0,
      dimensions = 0,
      chordCurves = 0,
      parallelNotes = 0;
    for (const policy of MIDDLE_FIGURE_POLICY.filter(
      (entry) => entry.showFigure,
    )) {
      const definition = getArithmeticV2Definition(policy.typeId);
      for (let index = 0; index < definition.domainSize; index++) {
        const { prompt } = definition.problemAt(index);
        if (prompt.layout !== "math" || !prompt.figureId)
          throw new Error(policy.typeId);
        const id = prompt.figureId;
        const canonical = arithmeticGeometryCatalogSvg(id)!;
        const original =
          presentArithmeticSegmentSvg(id, canonical) ??
          presentArithmeticRemainingSvg(id, canonical) ??
          canonical;
        const svg = simplifyArithmeticFigureAnnotations(id, original);
        const before = parse(original),
          after = parse(svg);
        expect(after.querySelector("parsererror"), id).toBeNull();
        expect(simplifyArithmeticFigureAnnotations(id, svg), id).toBe(svg);
        expect(arithmeticGeometryCatalogSvg(id), id).toBe(canonical);
        // Point positions and actual glyphs remain byte-for-byte identical.
        const pointLabels = (document: Document) =>
          [...document.querySelectorAll("[data-label],text")].filter((node) =>
            /^[A-Zℓm]$/.test(
              node.getAttribute("data-label") ?? node.textContent ?? "",
            ),
          );
        expect(signatures(pointLabels(after)), id).toEqual(
          signatures(pointLabels(before)),
        );
        const geometry = (document: Document) =>
          [
            ...document.querySelectorAll("circle,line,polyline,polygon,path"),
          ].filter(
            (node) =>
              !node.closest("defs,[data-label],[data-segment-dimension]") &&
              !(
                id.startsWith("gm-m3-circle-chord-length-") &&
                node.tagName === "path" &&
                node.getAttribute("stroke-dasharray") === "5 3" &&
                node.getAttribute("d")?.includes("Q")
              ),
          );
        expect(signatures(geometry(after)), id).toEqual(
          signatures(geometry(before)),
        );
        dimensions += before.querySelectorAll(
          "[data-segment-dimension]",
        ).length;
        expect(
          after.querySelectorAll(
            "[data-segment-dimension],[data-segment-number]",
          ).length,
          id,
        ).toBe(0);
        if (id.startsWith("gm-m3-circle-chord-length-")) {
          chordCurves += before.querySelectorAll(
            'path[stroke-dasharray="5 3"]',
          ).length;
          expect(
            after.querySelector('path[stroke-dasharray="5 3"],mask,[mask]'),
            id,
          ).toBeNull();
          expect(
            [...after.querySelectorAll("[data-label]")]
              .map((node) => node.getAttribute("data-label"))
              .sort(),
            id,
          ).toEqual(["A", "B", "M", "O"]);
          expect(
            after.querySelector('line[stroke-dasharray="4 4"]'),
            id,
          ).not.toBeNull();
        }
        if (id.startsWith("gm-m1-parallel-angle-")) {
          parallelNotes++;
          expect(svg, id).not.toContain('data-label="ℓ ∥ m"');
          const angles = (document: Document) =>
            [...document.querySelectorAll("[data-label]")].filter((node) =>
              /°|circ/.test(node.getAttribute("data-label")!),
            );
          expect(signatures(angles(after)), id).toEqual(
            signatures(angles(before)),
          );
        }
        checked++;
      }
    }
    expect([checked, dimensions, chordCurves, parallelNotes]).toEqual([
      177, 92, 66, 14,
    ]);
  });
});
