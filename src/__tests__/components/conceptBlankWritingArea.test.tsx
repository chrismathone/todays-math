import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ConceptBlankPaper from "@/components/concept-blank/ConceptBlankPaper";
import { writingAreaSheets } from "../fixtures/conceptBlankWritingArea";

describe("개념 백지 공용 답란", () => {
  it.each(["legacy", "questions"] as const)(
    "%s의 공유 범위만 바꾼다",
    (mode) => {
      const { container } = render(
        <ConceptBlankPaper sheets={writingAreaSheets(mode)} view="both" />,
      );
      for (const form of ["recall", "term", "cloze", "map", "figure"]) {
        const sheets = [
          ...container.querySelectorAll(
            `[data-cb-part="student"][data-cb-sheet="${form}"]`,
          ),
        ];
        expect(sheets.length).toBeGreaterThan(0);
        expect(
          sheets.some((sheet) => sheet.querySelector("[data-writing-area]")),
        ).toBe(true);
      }
      const lines = [...container.querySelectorAll("[data-cb-ruled]")];
      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) {
        expect(line).toHaveAttribute("data-writing-area");
        expect(line).toHaveAttribute("data-pattern", "lines");
      }
      for (const box of container.querySelectorAll("[data-cb-box]")) {
        expect(box).toHaveAttribute("data-writing-area");
        expect(box).toHaveAttribute(
          "data-pattern",
          box.closest("[data-cb-zone]")?.getAttribute("data-cb-zone") === "그림"
            ? "grid"
            : "blank",
        );
      }
      for (const box of container.querySelectorAll('[data-cb-item="apply"]')) {
        expect(box).toHaveAttribute("data-writing-area");
        expect(box).toHaveAttribute("data-pattern", "blank");
      }
      expect(
        container.querySelector('[data-cb-part="key"] [data-writing-area]'),
      ).toBeNull();
      expect(
        container.querySelector(
          "[data-cb-blank][data-writing-area], [data-cb-tag][data-writing-area], [data-cb-line][data-writing-area]",
        ),
      ).toBeNull();
    },
  );
});
