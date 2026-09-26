import { describe, expect, it } from "vitest";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { ENGINE_CATALOG } from "@/lib/math-srs/engineCatalog";
import {
  definitionCards,
  definitionUnits,
} from "@/lib/math-explorers/definition-cards";
import {
  bankKindForExplorerUnit,
  bankSectionsForExplorerUnit,
  explorerCardForSection,
  explorerUnitForSection,
} from "@/lib/math-explorers/curriculumBridge";

describe("authored explorer to existing bank bridge", () => {
  it("covers all 230 actual elementary lessons exactly once without changing their grade or order", () => {
    const units = definitionUnits.filter((unit) => unit.grade <= 6);
    expect(units).toHaveLength(24);
    const covered = units.flatMap((unit) => {
      expect(bankKindForExplorerUnit(unit.id)).toBe("elementary");
      const ids = bankSectionsForExplorerUnit(unit.id);
      expect(ids.length).toBeGreaterThan(0);
      const sections = COURSE_SECTIONS.filter((section) =>
        ids.includes(section.id),
      );
      expect(sections.map((section) => section.id)).toEqual(ids);
      for (const section of sections) {
        expect(section.grade).toBe(unit.grade);
        expect(explorerUnitForSection(section.id)).toBe(unit.id);
      }
      return ids;
    });
    expect(COURSE_SECTIONS).toHaveLength(230);
    expect(covered).toHaveLength(230);
    expect(new Set(covered)).toEqual(
      new Set(COURSE_SECTIONS.map((section) => section.id)),
    );
  });

  it("keeps the ratio and proportion lesson boundary and the existing grade-five cursor", () => {
    expect(explorerUnitForSection("6-2-4-2")).toBe("g6-ratio");
    expect(explorerUnitForSection("6-2-4-3")).toBe("g6-proportion");
    expect(bankSectionsForExplorerUnit("g6-proportion")).toEqual([
      "6-2-4-3",
      "6-2-4-4",
      "6-2-4-5",
    ]);
    expect(explorerUnitForSection("5-1-4-3")).toBe("g5-fractions");
    expect(explorerCardForSection("5-1-4-3")).toBe("g5-common-denominator");
    // Proper/mixed fractions have no same-grade authored card; no grade jump.
    expect(explorerUnitForSection("3-2-4-5")).toBe("g3-fraction");
    expect(explorerCardForSection("3-2-4-5")).toBeNull();
  });

  it("connects only the 87 existing equation types and leaves other middle units unavailable", () => {
    expect(ENGINE_CATALOG).toHaveLength(87);
    expect(new Set(bankSectionsForExplorerUnit("g7-equation"))).toEqual(
      new Set(ENGINE_CATALOG.map((entry) => entry.unitSection)),
    );
    for (const entry of ENGINE_CATALOG)
      expect(explorerUnitForSection(entry.unitSection)).toBe("g7-equation");
    for (const unit of definitionUnits.filter((unit) => unit.grade >= 7)) {
      expect(bankKindForExplorerUnit(unit.id)).toBe(
        unit.id === "g7-equation" ? "middle" : null,
      );
      if (unit.id !== "g7-equation")
        expect(bankSectionsForExplorerUnit(unit.id)).toEqual([]);
    }
    expect(explorerUnitForSection("문자의 사용과 식의 값")).toBeNull();
    expect(explorerUnitForSection("3. 방정식")).toBeNull();
    expect(explorerUnitForSection("3-9-9-9")).toBeNull();
    expect(bankKindForExplorerUnit("unknown")).toBeNull();
  });

  it("associates only real authored cards in the matching unit, without importing answer content", () => {
    const sections = [
      ...COURSE_SECTIONS.map((section) => section.id),
      ...bankSectionsForExplorerUnit("g7-equation"),
    ];
    for (const sectionId of sections) {
      const cardId = explorerCardForSection(sectionId);
      if (!cardId) continue;
      const card = definitionCards.find((candidate) => candidate.id === cardId);
      expect(card, sectionId).toBeDefined();
      expect(card?.unit, sectionId).toBe(explorerUnitForSection(sectionId));
    }
    expect(explorerCardForSection("unknown")).toBeNull();
  });
});
