import { blocksToMarkdown } from "@/lib/mathgen/blocksToMarkdown";
import {
  repositionScore,
  stripLeadingProblemNumber,
} from "./nativeProblemLayout";
import type { StudioCrop } from "./studioHelpers";

// The visual editor escapes literal Markdown brackets when serializing.
const unescapeScores = (content: string) =>
  content.replace(/\\\[(\s*\d+(?:\.\d+)?\s*점\s*)\\\]/g, "[$1]");

/** Review and editing start from the same visible source, including OCR score metadata. */
export function studioReviewContent(
  crop: Pick<StudioCrop, "content" | "ocr">,
): string {
  const native = crop.ocr && !crop.ocr.contentEdited;
  const content = native
    ? blocksToMarkdown(
        crop.ocr!.blocks,
        crop.ocr!.choiceGroups,
        crop.ocr!.subQuestions,
      )
    : crop.content;
  const text = stripLeadingProblemNumber(
    unescapeScores(content),
    crop.ocr?.number,
  );
  // A manually edited score stays exactly where the user put it. Removing it is
  // also an edit, so old OCR metadata must not resurrect it on the read screen.
  return native
    ? repositionScore(text, crop.ocr!.printedScore ?? crop.ocr!.score)
    : text;
}

/** Keep metadata in step with an explicit body edit; subquestion scores are separate. */
export function editedScoreMetadata(content: string) {
  const main = unescapeScores(content).split(
    /\n(?=[ \t]*(?:[①-⑳]|\(\s*(?:\d{1,2}|[가-힣])\s*\)\s))/,
  )[0];
  const printedScore = main.match(/\[\s*(\d+(?:\.\d+)?)\s*점\s*\]/)?.[1];
  return {
    printedScore,
    score: printedScore === undefined ? undefined : Number(printedScore),
  };
}
