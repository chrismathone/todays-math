import {
  hasUnlinkedFigureChoices,
  UNLINKED_FIGURE_CHOICES_NOTICE,
} from "@/lib/problem/choiceFigureIndex";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";
import type { EditorialBlock } from "../editorial";
import { escapeHtml as esc, renderTextbookMarkdown as md } from "../markdown";
import type { RenderBlock } from "../model";
import { imageHtml, qrHtml, type RenderResources } from "./shared";
import { ANSWER_CASE_GRID_STYLE } from "../answerLayout";
import { dialogueMarkdownHtml, v15DisplayMarkdown } from "./dialogue";
import { renderSourceFragments } from "./semantic";

export function renderProblemHtml(
  block: Extract<EditorialBlock, { kind: "problem" }>,
  resources: RenderResources,
): string {
  const source = block.semantic?.source;
  const prose = source
    ? (text: string) => dialogueMarkdownHtml(v15DisplayMarkdown(text))
    : md;
  const { choices } = parseProblemContent(block.content);
  // Classify with the shared parser, but render the original Markdown.
  // Its normalized output has no source offsets, so place the one notice
  // before the whole prose rather than reconstructing or splitting it.
  const figureNotice = hasUnlinkedFigureChoices(
    block.figures.length,
    block.figures.map((f) => f.choiceIndex),
    choices,
  )
    ? `<p class="tb-choice-figure-notice">${esc(UNLINKED_FIGURE_CHOICES_NOTICE)}</p>`
    : "";
  const figures = block.figures
    .map(
      (f) =>
        `<figure class="tb-problem-figure" data-choice-index="${f.choiceIndex ?? "unknown"}">${f.choiceIndex && f.choiceIndex > 0 ? `<span class="tb-choice-label">${f.choiceIndex}번 보기</span>` : ""}${imageHtml(resources, f.assetId, f.altText ?? "문제 그림", f.sourceWidthMm ?? undefined)}</figure>`,
    )
    .join("");
  // Answer variant: an ordinary one-column problem keeps its question in a student column and
  // sets the answer in the column beside it (see answerLayout).
  const beside =
    block.answer !== undefined &&
    (block as RenderBlock & { answerPlacement?: string }).answerPlacement ===
      "beside";
  const answer =
    block.answer !== undefined
      ? `<section class="tb-answer"${beside ? ' style="margin-top:0"' : ""}><h4>정답${block.sourcePageLabel ? ` · 문제 ${esc(block.sourcePageLabel)}쪽` : ""}</h4>${prose(block.answer)}${block.solution !== null && block.solution !== undefined ? `<div>${prose(block.solution)}</div>` : ""}</section>`
      : block.publicWorkedExample
        ? `<section class="tb-worked"><h4>${source ? "풀이" : "함께 풀어 보기 · 풀이"}</h4>${block.publicWorkedExample.solution ? `<div class="tb-worked-solution">${prose(block.publicWorkedExample.solution)}</div>` : ""}<div class="tb-worked-answer"><b>답</b>${prose(block.publicWorkedExample.answer)}</div></section>`
        : "";
  const lines =
    block.answer === undefined && !block.publicWorkedExample
      ? block.layout.preferredWorkLines
      : 0;
  // In a linked group the writer names the solved example; every other member is an unsolved
  // confirmation, whatever stage its parent activity gave it.
  const group =
    block.semantic?.node?.kind === "exampleGroup"
      ? block.semantic.node
      : undefined;
  const role = !group
    ? undefined
    : block.itemId === group.exampleItemId
      ? "example"
      : group.confirmItemIds.includes(block.itemId)
        ? "confirm"
        : undefined;
  const worked = role
    ? role === "example"
    : Boolean(
        block.publicWorkedExample ||
        (block as RenderBlock & { learningStage?: string }).learningStage ===
          "worked-example",
      );
  const qr = block.qr ? qrHtml(resources, block.qr.id, block.qr.url) : "";
  // The QR sits beside the prompt: the ruled space below keeps the full column width.
  const html = `<section class="tb-problem${source ? " tb-source-problem" : ""}${worked ? " tb-problem-worked" : ""}${role === "confirm" ? " tb-problem-confirm" : ""}${block.layout.columnSpan === 2 && !beside ? " tb-problem-wide" : ""}${beside ? " tb-problem-answer-beside" : ""}${qr ? " tb-problem-has-qr" : ""}"${source ? ` data-source-kind="${esc(source.kind)}"` : ""}${worked ? ' aria-label="대표예제"' : ""}${block.semantic ? ` data-activity="${block.semantic.activity}"` : ""}${group && role ? ` data-example-group="${esc(group.groupId)}" data-example-role="${role}"${role === "confirm" ? ` data-confirm-index="${block.exampleConfirmIndex ?? group.confirmItemIds.indexOf(block.itemId)}"` : ""}` : ""}${beside ? ' data-answer-placement="beside"' : ""}>${beside ? `<div class="tb-answer-case" style="${ANSWER_CASE_GRID_STYLE}"><div class="tb-answer-case-question${qr ? " tb-problem-has-qr" : ""}">` : ""}<header class="tb-problem-head" data-anchor="problem-head"><strong>${esc(block.displayNumber)}</strong>${worked ? '<span class="tb-example-label">대표예제</span>' : ""}${role === "confirm" ? '<span class="tb-confirm-label">확인문제</span>' : ""}${block.questionType && !source ? `<span>${esc(block.questionType)}</span>` : ""}</header><div class="tb-problem-main"><div class="tb-problem-body"><div class="tb-problem-question">${figureNotice}<div class="tb-prose">${prose(block.content)}</div>${figures}</div>${beside ? "" : answer}</div>${qr}</div>${beside ? `</div>${answer}</div>` : ""}<div class="tb-work-area" style="min-height:${lines * 7}mm"${!lines ? " data-empty-work" : ""}>${lines ? `<div class="tb-work-lines" data-writing-space="work" aria-label="풀이 공간" style="min-height:${lines * 7}mm">${'<div class="tb-work-line"></div>'.repeat(lines)}</div>` : ""}</div></section>`;
  if (!source) return html;
  const header = block.semantic?.sourceQuestionHeader;
  const headStyle =
    block.sourceQuestionHeadHeightMm === undefined
      ? ""
      : ` style="height:${block.sourceQuestionHeadHeightMm}mm"`;
  let sourceHtml = html.replace(
    /<header class="tb-problem-head" data-anchor="problem-head">([\s\S]*?)<\/header>/,
    (_, contents: string) =>
      `<header class="tb-problem-head" data-anchor="problem-head"${headStyle}>${header ? renderSourceFragments(header, resources) : contents}</header>`,
  );
  if (block.sourceQuestionPromptMinHeightMm !== undefined)
    sourceHtml = sourceHtml.replace(
      '<div class="tb-prose">',
      `<div class="tb-prose" style="min-height:${block.sourceQuestionPromptMinHeightMm}mm">`,
    );
  return sourceHtml;
}
