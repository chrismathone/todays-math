/** Production print-column SSR. No candidate rewriting and no database access. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PaperProblemView } from "@/components/print/PaperProblemView";
import {
  PAPER_COLUMN_WIDTH,
  PAPER_CSS_VARIABLES,
} from "@/components/print/tokens";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";
import { choiceFigureMode } from "@/lib/problem/choiceFigureIndex";
import { retryReviewPayloadDigest } from "@/lib/import/schoolTextbook/qualification";
import "katex/dist/katex.min.css";
import "qa-paper-fonts.css";

export interface Candidate {
  sourceId?: string;
  originProblemId?: string;
  externalId?: string;
  id?: string;
  slot: number;
  content: string;
  answer: string;
  solution: string;
  figureSvg?: string | null;
  figureUrls?: string[];
  figureDims?: (number | null)[];
  figureSourceMm?: (number | null)[];
  choiceFigureIndex?: (number | null)[];
  [key: string]: unknown;
}

export function renderCandidate(candidate: Candidate) {
  const figures = {
    figureSvg: candidate.figureSvg,
    figureUrls: candidate.figureUrls,
    figureDims: candidate.figureDims,
    figureSourceMm: candidate.figureSourceMm,
    choiceFigureIndex: candidate.choiceFigureIndex,
  };
  const render = (content: string, withFigures: boolean) =>
    renderToStaticMarkup(
      createElement(PaperProblemView, {
        content,
        ...(withFigures ? figures : {}),
        // Print templates supply their own column and tokens. This disables lazy
        // figures, including any future deferred geometric figure wrapper.
        framed: false,
      }),
    );
  const { choices } = parseProblemContent(candidate.content);
  return {
    content: render(candidate.content, true),
    answer: render(candidate.answer, false),
    solution: render(candidate.solution, false),
    choiceCount: choices.length,
    figureMode: choiceFigureMode(
      candidate.figureUrls?.length ?? 0,
      candidate.choiceFigureIndex,
      choices,
    ),
  };
}

export const columnWidth = PAPER_COLUMN_WIDTH;
export const paperVariables = PAPER_CSS_VARIABLES;
export const candidatePayloadDigest = retryReviewPayloadDigest;
