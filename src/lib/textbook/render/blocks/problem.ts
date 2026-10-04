import {
  hasUnlinkedFigureChoices,
  UNLINKED_FIGURE_CHOICES_NOTICE,
} from "@/lib/problem/choiceFigureIndex";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";
import type { EditorialBlock } from "../editorial";
import { escapeHtml as esc, renderTextbookMarkdown as md } from "../markdown";
import type { RenderBlock } from "../model";
import { imageHtml, qrHtml, type RenderResources } from "./shared";

export function renderProblemHtml(
  block: Extract<EditorialBlock, { kind: "problem" }>,
  resources: RenderResources,
): string {
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
  const answer =
    block.answer !== undefined
      ? `<section class="tb-answer"><h4>정답${block.sourcePageLabel ? ` · 문제 ${esc(block.sourcePageLabel)}쪽` : ""}</h4>${md(block.answer)}${block.solution !== null && block.solution !== undefined ? `<div>${md(block.solution)}</div>` : ""}</section>`
      : block.publicWorkedExample
        ? `<section class="tb-worked"><h4>함께 풀어 보기 · 풀이</h4>${block.publicWorkedExample.solution ? `<div class="tb-worked-solution">${md(block.publicWorkedExample.solution)}</div>` : ""}<div class="tb-worked-answer"><b>답</b>${md(block.publicWorkedExample.answer)}</div></section>`
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
  return `<section class="tb-problem${worked ? " tb-problem-worked" : ""}${role === "confirm" ? " tb-problem-confirm" : ""}${block.layout.columnSpan === 2 ? " tb-problem-wide" : ""}${qr ? " tb-problem-has-qr" : ""}"${worked ? ' aria-label="대표예제"' : ""}${block.semantic ? ` data-activity="${block.semantic.activity}"` : ""}${group && role ? ` data-example-group="${esc(group.groupId)}" data-example-role="${role}"` : ""}><header class="tb-problem-head" data-anchor="problem-head"><strong>${esc(block.displayNumber)}</strong>${worked ? '<span class="tb-example-label">대표예제</span>' : ""}${role === "confirm" ? '<span class="tb-confirm-label">확인문제</span>' : ""}${block.questionType ? `<span>${esc(block.questionType)}</span>` : ""}</header><div class="tb-problem-main"><div class="tb-problem-body"><div class="tb-problem-question">${figureNotice}<div class="tb-prose">${md(block.content)}</div>${figures}</div>${answer}</div>${qr}</div><div class="tb-work-area" style="min-height:${lines * 7}mm">${lines ? `<div class="tb-work-lines" data-writing-space="work" aria-label="풀이 공간" style="min-height:${lines * 7}mm">${'<div class="tb-work-line"></div>'.repeat(lines)}</div>` : ""}</div></section>`;
}
