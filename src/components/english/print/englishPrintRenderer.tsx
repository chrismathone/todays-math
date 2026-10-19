import type { EnglishPrintRenderer } from "@/components/unified/print/EnglishPrintRenderer";
import {
  EnglishWorksheetAnswer,
  EnglishWorksheetQuestion,
} from "./EnglishWorksheetQuestion";

/** The shared print shell renders English items only through this renderer. */
export const ENGLISH_PRINT_RENDERER: EnglishPrintRenderer = {
  Question: EnglishWorksheetQuestion,
  Answer: ({ content, quick }) => (
    <EnglishWorksheetAnswer content={content} quick={quick ?? false} />
  ),
};
