// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PREVIEW_CARDS } from "@/lib/math-srs/preview/cards";
import { previewFigureSvg } from "@/lib/math-srs/preview";
import { numberLineSvg } from "@/lib/math-srs/preview/numberLine";
import { PREVIEW_FIGURE_SPECS } from "@/lib/math-srs/preview/figureSpecs";
import { PREVIEW_ENGINE_SVGS } from "@/lib/math-srs/preview/generatedFigures";
import { renderPreviewFigures } from "../../../scripts/qa/srs-preview-cards/generate-figures";

describe("preview figure variants", () => {
  it("keeps the six number lines byte-for-byte unchanged", () => {
    for (const card of PREVIEW_CARDS.filter((c) =>
      c.sectionId.startsWith("5-2-1-"),
    )) {
      expect(card.figure.kind).toBe("numberLine");
      if (card.figure.kind === "numberLine")
        expect(previewFigureSvg(card)).toBe(numberLineSvg(card.figure));
    }
  });

  it("ships the exact local engine output with the existing preview palette", () => {
    expect(renderPreviewFigures()).toEqual(PREVIEW_ENGINE_SVGS);
    expect(Object.keys(PREVIEW_ENGINE_SVGS)).toEqual(
      Object.keys(PREVIEW_FIGURE_SPECS),
    );
    for (const svg of Object.values(PREVIEW_ENGINE_SVGS)) {
      expect(svg).toMatch(/^<svg/);
      expect(svg).not.toMatch(/<script|<image|href=|onload=|NaN|undefined/);
      const colors = [...svg.matchAll(/#[\da-f]{6}/g)].map((m) => m[0]);
      expect(
        colors.every((c) => ["#172b4d", "#3159df", "#ffffff"].includes(c)),
      ).toBe(true);
    }
  });

  it("inlines an engine figure and escapes its accessible title", () => {
    const card = {
      ...PREVIEW_CARDS[0],
      figure: {
        kind: "engine" as const,
        id: "fraction-times-whole" as const,
        title: "<뜻> & 그림",
      },
    };
    const svg = previewFigureSvg(card);
    expect(svg).toContain('role="img"');
    expect(svg).toContain("<title>&lt;뜻&gt; &amp; 그림</title>");
    expect(svg).toContain("<rect");
  });
});
