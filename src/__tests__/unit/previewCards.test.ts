// @vitest-environment node
/**
 * «배우기» preview cards (plan §3.4). The answers are recomputed here from the numbers in
 * each prompt — an independent check, not a copy of the data.
 */
import { describe, expect, it } from "vitest";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { definitionCard } from "@/lib/math-explorers/definition-cards";
import { PREVIEW_CARDS } from "@/lib/math-srs/preview/cards";
import {
  checkPreviewAnswer,
  previewCardFor,
  previewFigureSvg,
  previewMeaning,
} from "@/lib/math-srs/preview";

const card = (id: string) => previewCardFor(id)!;
const roundUp = (n: number, unit: number) => Math.ceil(n / unit) * unit;
const roundDown = (n: number, unit: number) => Math.floor(n / unit) * unit;
const roundHalf = (n: number, unit: number) =>
  Math.floor(n / unit + 0.5) * unit;

describe("preview cards", () => {
  it("covers every section of the pilot chapter, once each", () => {
    const pilot = COURSE_SECTIONS.filter((s) => s.id.startsWith("5-2-1-"));
    expect(pilot.length).toBe(6);
    for (const section of pilot)
      expect(previewCardFor(section.id)).not.toBeNull();
    const ids = PREVIEW_CARDS.map((c) => c.sectionId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids)
      expect(COURSE_SECTIONS.some((s) => s.id === id)).toBe(true);
    expect(previewCardFor("5-2-2-1")).toBeNull();
  });

  it("shows the explorer card's own meaning sentence", () => {
    const linked = card("5-2-1-1");
    expect(previewMeaning(linked)).toBe(
      definitionCard("g5-at-least").definition,
    );
    expect(previewMeaning(card("5-2-1-3"))).toContain("범위");
  });

  it("draws every card's figure exactly", () => {
    for (const c of PREVIEW_CARDS) {
      const svg = previewFigureSvg(c);
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg).toContain(`<title>${c.figure.title}</title>`);
    }
  });

  it("has practice answers that follow from their prompts", () => {
    const pick = (values: number[], keep: (n: number) => boolean) =>
      String(values.filter(keep).length);
    expect(card("5-2-1-1").practice.answer).toBe(
      pick([17, 20, 21, 19, 25], (n) => n <= 20),
    );
    expect(card("5-2-1-2").practice.answer).toBe(
      pick([8, 12, 10, 15, 9], (n) => n < 10),
    );
    expect(card("5-2-1-3").practice.answer).toBe(
      pick(
        Array.from({ length: 30 }, (_, i) => i + 1),
        (n) => n > 10 && n <= 14,
      ),
    );
    expect(card("5-2-1-4").practice.answer).toBe(String(roundUp(317, 10)));
    expect(card("5-2-1-5").practice.answer).toBe(String(roundDown(1999, 1000)));
    expect(card("5-2-1-6").practice.answer).toBe(String(roundHalf(476, 10)));
    // Worked examples too.
    expect(card("5-2-1-4").worked.map((w) => w.answer)).toEqual([
      String(roundUp(234, 10)),
      String(roundUp(250, 10)),
    ]);
    expect(card("5-2-1-5").worked.map((w) => w.answer)).toEqual([
      String(roundDown(238, 10)),
      String(roundDown(4567, 100)),
    ]);
    expect(card("5-2-1-6").worked.map((w) => w.answer)).toEqual([
      String(roundHalf(34, 10)),
      String(roundHalf(2650, 100)),
    ]);
    expect(card("5-2-1-1").worked[0].answer).toBe(
      [43, 45, 47, 44, 50].filter((n) => n >= 45).join(", "),
    );
    expect(card("5-2-1-2").worked[0].answer).toBe(
      [28, 30, 31, 35].filter((n) => n > 30).join(", "),
    );
    expect(card("5-2-1-3").worked[0].answer).toBe(
      [20, 21, 22, 23, 24, 25].filter((n) => n >= 20 && n < 25).join(", "),
    );
  });

  it("checks a typed practice answer", () => {
    const counting = card("5-2-1-1");
    for (const typed of ["3", " 3 ", "3개", "3 개"])
      expect(checkPreviewAnswer(counting, typed)).toBe(true);
    for (const typed of ["4", "", "삼", "3.0", "-3"])
      expect(checkPreviewAnswer(counting, typed)).toBe(false);
    const thousands = card("5-2-1-5");
    expect(checkPreviewAnswer(thousands, "1,000")).toBe(true);
    expect(checkPreviewAnswer(thousands, "1000")).toBe(true);
    expect(checkPreviewAnswer(thousands, "2000")).toBe(false);
  });
});
