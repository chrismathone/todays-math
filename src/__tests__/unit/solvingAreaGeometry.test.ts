import { describe, expect, it } from "vitest";
import {
  columnContentWidth,
  scaledItemStyle,
} from "@/components/unified/print/geometry";
import { DEFAULT_PRINT_OPTIONS } from "@/components/unified/print/types";
import { TEMPLATES } from "@/components/unified/print/settings";

describe("right solving area measurement", () => {
  it.each(TEMPLATES)(
    "measures $value questions at the width actually left beside the workspace",
    ({ value: template }) => {
      for (const margin of ["narrow", "normal", "wide"] as const) {
        const full = columnContentWidth(template, 1, margin);
        for (const solvingArea of ["blank", "ruled", "chalkboard"] as const) {
          const width = columnContentWidth(template, 1, margin, solvingArea);
          expect(width).toBeCloseTo((full - 20) * 0.6, 8);
          expect(columnContentWidth(template, 2, margin, solvingArea)).toBe(
            columnContentWidth(template, 2, margin),
          );
          expect(
            scaledItemStyle(
              {
                ...DEFAULT_PRINT_OPTIONS,
                template,
                marginPreset: margin,
                solvingArea,
              },
              0.8,
            )?.width,
          ).toBe(width);
        }
        expect(columnContentWidth(template, 1, margin, "off")).toBe(full);
      }
    },
  );
});
