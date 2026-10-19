import { z } from "zod";
import { sheetTagSchema } from "./sheetTag.contract";
import {
  parsePrintMeta,
  parsePrintOptions,
} from "@/components/unified/print/settings";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
} from "@/components/unified/print/types";

/** Optional UI state only. It never participates in generation or arithmetic verification. */
export const arithmeticPresentationSchema = z.strictObject({
  version: z.literal(1),
  step: z.enum(["scope", "review", "output"]),
  /** 시험지 태그(W8) — 내 시험지에서 거를 때만 쓴다. 지면에 찍지 않는다. 없으면 «태그 없음». */
  tag: sheetTagSchema.optional(),
  printOptions: z.record(z.string(), z.unknown()).transform((value, ctx) => {
    try {
      if (
        Object.keys(value).some(
          (key) => !Object.hasOwn(DEFAULT_PRINT_OPTIONS, key),
        )
      )
        throw new Error("Unknown print option");
      const options = parsePrintOptions(value);
      if (!options.quickAnswerOnly)
        throw new Error("Arithmetic output is answer-only");
      return options;
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "arithmetic:presentation-options",
      });
      return z.NEVER;
    }
  }),
  printMeta: z.record(z.string(), z.unknown()).transform((value, ctx) => {
    try {
      if (
        Object.keys(value).some(
          (key) => !Object.hasOwn(DEFAULT_PRINT_META, key),
        )
      )
        throw new Error("Unknown print metadata");
      return parsePrintMeta(value);
    } catch {
      ctx.addIssue({ code: "custom", message: "arithmetic:presentation-meta" });
      return z.NEVER;
    }
  }),
});
export type ArithmeticPresentation = z.infer<
  typeof arithmeticPresentationSchema
>;

export function defaultArithmeticPresentation(
  academyName?: string,
): ArithmeticPresentation {
  return {
    version: 1,
    step: "review",
    printOptions: {
      ...DEFAULT_PRINT_OPTIONS,
      template: "yuhyung",
      columns: 2,
      quickAnswerOnly: true,
      showChapter: false,
      showDifficulty: false,
    },
    printMeta: { ...DEFAULT_PRINT_META, academyName: academyName ?? "" },
  };
}
