import { expect, it } from "vitest";
import { parsePrintOptions } from "@/components/unified/print/settings";
import { DEFAULT_PRINT_OPTIONS } from "@/components/unified/print/types";
import { printPresetOptionsSchema } from "@/contracts/printPreset.contract";
import {
  arithmeticPresentationSchema,
  defaultArithmeticPresentation,
} from "@/contracts/arithmeticPresentation.contract";

it("reads additive smart flags and treats omitted flags as the historical layout", () => {
  expect(parsePrintOptions({}).smartSpacing).toBe(false);
  expect(parsePrintOptions({ smartSpacing: true }).smartSpacing).toBe(true);
  expect(() => parsePrintOptions({ smartSpacing: 1 })).toThrow();
  const legacy = { ...DEFAULT_PRINT_OPTIONS };
  delete legacy.smartSpacing;
  expect(printPresetOptionsSchema.parse(legacy).smartSpacing).toBeUndefined();
  expect(
    printPresetOptionsSchema.parse({ ...legacy, smartSpacing: true })
      .smartSpacing,
  ).toBe(true);
  const arithmetic = defaultArithmeticPresentation();
  delete arithmetic.printOptions.smartSpacing;
  expect(
    arithmeticPresentationSchema.parse(arithmetic).printOptions.smartSpacing,
  ).toBe(false);
});
