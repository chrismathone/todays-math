import type { TextbookLayout } from "../layout/paginate";
import {
  allocateSourceWritingSpace,
  type SourceWritingPageMeasurement,
  type SourceWritingSpaceMeasurement,
} from "../layout/sourceWritingSpace";
import type { RenderBlock, TextbookRenderModel } from "./model";

const KINDS = new Set(["exercise", "typepage", "reasoning", "practice"]);

/** The bank and saved source-absent layouts never take this native allocation path. */
export function sourceWritingBlockIds(model: TextbookRenderModel): string[] {
  if (model.variant !== "student") return [];
  return model.sections.flatMap((section) =>
    section.blocks.flatMap((block) =>
      block.kind === "problem" &&
      block.semantic?.source &&
      KINDS.has(block.semantic.source.kind) &&
      block.semantic.node?.kind !== "exampleGroup" &&
      block.answer === undefined &&
      !block.publicWorkedExample &&
      block.learningStage !== "worked-example" &&
      block.layout.preferredWorkLines > 0
        ? [block.id]
        : [],
    ),
  );
}

/** Clear transient allocation before measuring a reused browser preview model. */
export function resetSourceWriting(model: TextbookRenderModel): void {
  for (const section of model.sections)
    for (const block of section.blocks) {
      delete block.sourceWorkLines;
      delete block.sourceWorkMarginTopMm;
      delete block.sourceQuestionMinHeightMm;
    }
}

/** Self-contained: runs in Chromium with page.evaluate, or in a private preview host. */
export function measureSourceWritingDom(input: {
  blockIds: string[];
  rootSelector?: string;
}): {
  measurements: SourceWritingSpaceMeasurement[];
  pageMeasurements: SourceWritingPageMeasurement[];
} {
  const root = input.rootSelector
    ? document.querySelector(input.rootSelector)
    : document;
  if (!root) throw new Error("SOURCE_WRITING_SPACE: missing measurement host");
  const wanted = new Set(input.blockIds);
  const measurements: SourceWritingSpaceMeasurement[] = [];
  const pageMeasurements: SourceWritingPageMeasurement[] = [];
  const seen = new Set<string>();
  const present = new Set<string>();
  const mm = 25.4 / 96;
  for (const paper of root.querySelectorAll<HTMLElement>(
    "[data-textbook-page]",
  )) {
    const blocks = Array.from(
      paper.querySelectorAll<HTMLElement>("[data-block-id]"),
    );
    for (const block of blocks)
      if (wanted.has(block.dataset.blockId!))
        present.add(block.dataset.blockId!);
    if (!blocks.some((block) => wanted.has(block.dataset.blockId!))) continue;
    const content = paper.querySelector<HTMLElement>(".tb-reference-content");
    const stop = paper.querySelector<HTMLElement>(
      ".tb-source-page-footer,.tb-footer",
    );
    if (!content || !stop)
      throw new Error("SOURCE_WRITING_SPACE: missing measured content or stop");
    const origin = paper.getBoundingClientRect();
    const grid = Array.from(content.children).find((element) =>
      element.matches(
        ".tb-source-question-grid.question-grid,.tb-source-question-grid.reason-grid",
      ),
    );
    const direct = grid ? Array.from(grid.children) : [];
    const gridBlockIds: string[] = [];
    // Keep the allocator's conservative mixed-zero boundary: any explicitly empty
    // work container preserves the entire first grid, including its nonzero peers.
    const hasEmptyWork = direct.some((child) =>
      child.querySelector(".tb-source-problem .tb-work-area[data-empty-work]"),
    );
    for (const child of hasEmptyWork ? [] : direct) {
      if (
        !(child instanceof HTMLElement) ||
        !wanted.has(child.dataset.blockId!)
      )
        continue;
      const problem = child.querySelector<HTMLElement>(".tb-source-problem");
      const work = problem?.querySelector<HTMLElement>(
        ".tb-work-area:not([data-empty-work])",
      );
      if (!problem || !work)
        throw new Error(
          "SOURCE_WRITING_SPACE: missing measured question or work",
        );
      const blockId = child.dataset.blockId!;
      if (seen.has(blockId))
        throw new Error("SOURCE_WRITING_SPACE: duplicate measured question");
      seen.add(blockId);
      const q = problem.getBoundingClientRect();
      const w = work.getBoundingClientRect();
      const style = getComputedStyle(problem);
      const baseLines = work.querySelectorAll(".tb-work-line").length;
      if (!baseLines)
        throw new Error("SOURCE_WRITING_SPACE: missing measured writing lines");
      measurements.push({
        blockId,
        questionHeightMm: q.height * mm,
        workOffsetMm: (w.top - q.top) * mm,
        paddingBottomMm: parseFloat(style.paddingBottom) * mm,
        borderBottomMm: parseFloat(style.borderBottomWidth) * mm,
        workMarginTopMm: parseFloat(getComputedStyle(work).marginTop) * mm,
        baseLines,
      });
      gridBlockIds.push(blockId);
    }
    pageMeasurements.push({
      physicalPageIndex: Number(paper.dataset.textbookPage),
      contentBottomMm:
        (content.getBoundingClientRect().bottom - origin.top) * mm,
      stopTopMm: (stop.getBoundingClientRect().top - origin.top) * mm,
      gridKind: grid
        ? grid.classList.contains("reason-grid")
          ? "reason-grid"
          : "question-grid"
        : null,
      gridBlockIds,
      gridChildCount: direct.length,
      hasDailyBanner: Boolean(paper.querySelector(".daily-banner")),
    });
  }
  for (const id of wanted)
    if (!present.has(id))
      throw new Error(`SOURCE_WRITING_SPACE: missing planned question ${id}`);
  return { measurements, pageMeasurements };
}

export function applySourceWriting(
  model: TextbookRenderModel,
  layout: TextbookLayout,
  measured: ReturnType<typeof measureSourceWritingDom>,
): void {
  const plan = allocateSourceWritingSpace(
    model.sections,
    layout.pages,
    measured.measurements,
    measured.pageMeasurements,
  );
  const blocks = new Map<string, RenderBlock>(
    model.sections
      .flatMap((section) => section.blocks)
      .map((block) => [block.id, block]),
  );
  for (const assignment of plan.work) {
    const block = blocks.get(assignment.blockId)!;
    block.sourceWorkLines = assignment.lines;
    block.sourceWorkMarginTopMm = assignment.marginTopMm;
    block.sourceQuestionMinHeightMm = assignment.heightMm;
  }
  for (const assignment of plan.placements) {
    const page = layout.pages.find(
      (candidate) =>
        candidate.physicalPageIndex === assignment.physicalPageIndex,
    )!;
    const placement = page.blocks.find(
      (candidate) => candidate.blockId === assignment.blockId,
    )!;
    placement.yMm = assignment.yMm;
    placement.heightMm = assignment.heightMm;
  }
}
