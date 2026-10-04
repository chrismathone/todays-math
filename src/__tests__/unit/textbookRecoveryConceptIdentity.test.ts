// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { TextbookConcept } from "@/contracts/textbookConcept.contract";
import { bank as e3 } from "@/lib/concept-blank/bank/e3";
import { definitionText } from "@/lib/textbook/conceptRows";
import { createTextbookRenderModel } from "@/lib/textbook/render/model";
import { renderConceptHtml } from "@/lib/textbook/render/blocks/concept";
import { textbookFixture } from "../helpers/textbookFixture";

/** Synthetic frozen container with real bank cards; this tests projection, not hash validation. */
function fixture(cards: boolean) {
  const exchange = textbookFixture(1, 0);
  const section = exchange.units[0].sections[0];
  section.startPolicy = "continue";
  section.templateKey = "auto-lesson";
  const entries = e3.concepts.slice(0, 3);
  const concept: TextbookConcept = {
    conceptKey: "synthetic-concept",
    unitKey: exchange.units[0].unitKey,
    sectionKey: section.sectionKey,
    title: "합성 개념 묶음",
    kind: entries[0].kind,
    unitId: null,
    body: {
      goal: "",
      prerequisites: [],
      definition: cards
        ? entries.map(definitionText).join("\n\n")
        : Array.from(
            { length: 12 },
            (_, i) => `정의 ${i + 1}: ${"설명 ".repeat(50)}`,
          ).join("\n\n"),
      conditions: null,
      examples: [],
      counterexamples: [],
      misconceptions: [],
      explainPrompt: null,
    },
    blankItems: [],
    links: [],
    mappingVersion: cards ? "quick-create.unit-triple.synthetic" : "manual",
    derivedFromConceptKey: null,
    frozen: cards
      ? {
          contentHash: "a".repeat(64),
          parserVersion: "synthetic",
          compositionVersion: "synthetic",
          mappingVersion: "quick-create.unit-triple.synthetic",
          sections: [],
          entries: entries.map((payload) => ({
            entryKind: "concept",
            payload,
          })),
          selection: [],
          assetHashes: [],
        }
      : null,
  };
  section.blocks = [
    {
      blockId: "synthetic-concept-block",
      kind: "concept",
      conceptKey: concept.conceptKey,
    },
  ];
  exchange.conceptIntegration = {
    version: "injaewon.textbook.concepts.v1",
    concepts: [concept],
  };
  return { exchange, entries };
}

describe("concept identity survives render splitting", () => {
  it.each(["student", "answers"] as const)(
    "prints each distinct frozen card with its own number and title (%s)",
    (variant) => {
      const { exchange, entries } = fixture(true);
      const before = JSON.stringify(exchange);
      const cards = createTextbookRenderModel(exchange, variant)
        .sections.flatMap((section) => section.blocks)
        .filter((block) => block.kind === "concept");
      expect(cards).toHaveLength(entries.length);
      expect(cards.map((card) => card.ordinal)).toEqual([1, 2, 3]);
      expect(cards.every((card) => !card.continuation)).toBe(true);
      for (let index = 0; index < cards.length; index++) {
        const card = cards[index];
        expect(card.title).toBe(entries[index].term);
        expect(card.semantic?.node).toMatchObject({
          conceptId: entries[index].id,
        });
        const html = renderConceptHtml(card, {
          assetUrl: () => "",
          qrDataUrl: () => "",
        });
        expect(html).toContain(`tb-concept-number">0${index + 1}</span>`);
        expect(html).not.toContain("tb-concept-continuation");
      }
      expect(JSON.stringify(exchange)).toBe(before);
    },
  );

  it("uses one number for an authored concept split over multiple blocks", () => {
    const { exchange } = fixture(false);
    const before = JSON.stringify(exchange);
    const cards = createTextbookRenderModel(exchange, "student")
      .sections.flatMap((section) => section.blocks)
      .filter((block) => block.kind === "concept");
    expect(cards.length).toBeGreaterThan(1);
    expect(new Set(cards.map((card) => card.ordinal))).toEqual(new Set([1]));
    expect(cards[0].continuation).toBe(false);
    expect(cards.slice(1).every((card) => card.continuation)).toBe(true);
    expect(cards.map((card) => card.body.definition).join("\n\n")).toBe(
      exchange.conceptIntegration!.concepts[0].body.definition,
    );
    expect(JSON.stringify(exchange)).toBe(before);
  });
});
