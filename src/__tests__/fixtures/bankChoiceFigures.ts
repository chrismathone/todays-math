import daeguilDrafts from "../../../scripts/import/exam-paper/exams/2025-daeguil-3-2-mid/drafts.json";
import daeguilFigures from "../../../scripts/import/exam-paper/exams/2025-daeguil-3-2-mid/figures/index.json";
import sinmyeongDrafts from "../../../scripts/import/exam-paper/exams/2025-sinmyeongyeo-3-2-mid/drafts.json";
import sinmyeongFigures from "../../../scripts/import/exam-paper/exams/2025-sinmyeongyeo-3-2-mid/figures/index.json";

/** 실제 초안과 추출 색인 순서 그대로. DB·적재기를 실행하지 않는다. */
export const BANK_CHOICE_FIGURES = [
  { drafts: daeguilDrafts, figures: daeguilFigures.figures, number: 3 },
  { drafts: sinmyeongDrafts, figures: sinmyeongFigures.figures, number: 9 },
].map(({ drafts, figures, number }) => {
  const draft = drafts.find((row) => row.questionNumber === number)!;
  const images = figures.filter((row) => row.number === number);
  return {
    id: draft.externalId,
    content: draft.content,
    answer: draft.answer,
    solution: draft.solution,
    choiceFigureIndex: draft.choiceFigureIndex!,
    figureUrls: images.map(
      (image) =>
        `/scripts/import/exam-paper/exams/${draft.examId}/figures/${image.file}`,
    ),
    figureDims: images.flatMap((image) => image.px),
    figureSourceMm: images.map((image) => image.widthMm),
  };
});
