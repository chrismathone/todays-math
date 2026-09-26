import { normalizeMathgenText } from "@/lib/math/normalizeMathgenText";
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
  // 인식 블록은 날것으로 저장된다(정본 — 시험지·HWPX 가 그대로 읽는다). 이어 붙인 글에는 입구
  // (`normalizeNativeOcr`)·시험지(`NativeProblem` → 렌더러 전처리)와 **같은 한 함수**를 건다 —
  // 안 걸면 카드에서만 `\displaystyle …` 가 날것으로, `\(f(x)\)` 가 괄호 글로 보였다(2026-09-26).
  const content = native
    ? normalizeMathgenText(
        blocksToMarkdown(
          crop.ocr!.blocks,
          crop.ocr!.choiceGroups,
          crop.ocr!.subQuestions,
        ),
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
