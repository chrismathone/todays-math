import type { TextbookRenderModel } from "./model";
import { isDialoguePlacement } from "./blocks/dialogue";
import { textbookBodyTopMm } from "../layout/paginate";

export interface RecoveryMeasurePlan {
  rootSelector?: string;
  blocks: Array<{
    id: string;
    memoryGroup?: string;
    memoryHeading?: string;
    dialogueGroup?: string;
    dialoguePage?: string;
  }>;
  dialogueBodyTopMm: number;
  dialogueBottomMm: number;
}
export function recoveryMeasurePlan(
  model: TextbookRenderModel,
): RecoveryMeasurePlan {
  return {
    dialogueBodyTopMm: 63.42,
    dialogueBottomMm: 263,
    blocks: model.sections.flatMap((section) =>
      section.blocks.map((block) => {
        const node = block.semantic?.node;
        return {
          id: block.id,
          ...(block.kind === "recall" &&
          (node?.kind === "rows" || node?.kind === "concept")
            ? {
                memoryGroup: `${section.unitKey}:${node.kind === "concept" ? node.conceptId : (node.groupKey ?? block.sourceBlockId)}`,
              }
            : {}),
          ...(block.kind === "heading" &&
          ["conceptStudy", "clozeRecall", "sentenceRecall"].includes(
            block.semantic?.activity ?? "",
          )
            ? { memoryHeading: `${section.unitKey}.memory-heading` }
            : {}),
          ...(isDialoguePlacement(block) && block.semantic
            ? {
                dialogueGroup: section.unitKey,
                dialoguePage: section.sectionKey,
              }
            : {}),
        };
      }),
    ),
  };
}
export interface RecoveryMeasureResult {
  rowHeightsMm: Record<string, number>;
  blockMinHeightsMm: Record<string, number>;
  dialogueSizesPt: Record<string, number>;
  dialogueGapsMm: Record<string, number>;
  dialogueTopMm: number;
}

/** Private measurement material contains canonical recall rows, never problem answers. */
export function recallMeasurementModel(
  answers: TextbookRenderModel,
  selected: TextbookRenderModel,
): TextbookRenderModel {
  const wanted = new Set(
    recoveryMeasurePlan(selected).blocks.flatMap((block) =>
      block.memoryGroup ? [block.memoryGroup] : [],
    ),
  );
  const groups = new Map(
    recoveryMeasurePlan(answers).blocks.map((block) => [
      block.id,
      block.memoryGroup,
    ]),
  );
  return {
    ...answers,
    sections: answers.sections
      .map((section) => ({
        ...section,
        blocks: section.blocks.filter((block) => {
          const group = groups.get(block.id);
          return (
            block.kind === "recall" && group !== undefined && wanted.has(group)
          );
        }),
      }))
      .filter((section) => section.blocks.length > 0),
  };
}

/** Self-contained DOM function used verbatim in the preview and trusted Chromium page. */
export function measureRecoveryDom(
  plan: RecoveryMeasurePlan,
): RecoveryMeasureResult {
  const mm = 25.4 / 96;
  const root = plan.rootSelector
    ? document.querySelector(plan.rootSelector)
    : document;
  if (!root) throw new Error("Missing recovery measurement root");
  const elements = new Map(
    Array.from(root.querySelectorAll<HTMLElement>("[data-measure-id]")).map(
      (element) => [element.dataset.measureId!, element],
    ),
  );
  const rowHeightsMm: Record<string, number> = {};
  for (const row of root.querySelectorAll<HTMLElement>(
    ".tb-memory-row[data-row-key]",
  )) {
    const key = row.dataset.rowKey!;
    rowHeightsMm[key] = Math.max(
      rowHeightsMm[key] ?? 0,
      Math.ceil(row.getBoundingClientRect().height * mm * 10 - 1e-6) / 10,
    );
  }
  for (const row of root.querySelectorAll<HTMLElement>(
    ".tb-memory-row[data-row-key]",
  )) {
    const height = rowHeightsMm[row.dataset.rowKey!];
    row.classList.add("tb-memory-row-measured");
    row.style.height = `${height}mm`;
    const blank = row.querySelector<HTMLElement>(".tb-blank-sentence");
    if (blank)
      blank.innerHTML = '<span class="tb-write-line"></span>'.repeat(
        Math.max(1, Math.floor((height - 2.2) / 7)),
      );
  }
  const maxima: Record<string, number> = {};
  const groupOf = (block: RecoveryMeasurePlan["blocks"][number]) =>
    block.memoryGroup ?? block.memoryHeading;
  for (const block of plan.blocks) {
    const group = groupOf(block),
      element = elements.get(block.id);
    if (group && element)
      maxima[group] = Math.max(
        maxima[group] ?? 0,
        element.getBoundingClientRect().height * mm,
      );
  }
  const blockMinHeightsMm: Record<string, number> = {};
  for (const block of plan.blocks) {
    const group = groupOf(block),
      element = elements.get(block.id);
    if (group && element) {
      blockMinHeightsMm[block.id] = Math.ceil(maxima[group] * 100) / 100;
      element.style.minHeight = `${blockMinHeightsMm[block.id]}mm`;
    }
  }
  const dialogueSizesPt: Record<string, number> = {},
    dialogueGapsMm: Record<string, number> = {};
  const groups = [
    ...new Set(
      plan.blocks.flatMap((block) =>
        block.dialogueGroup ? [block.dialogueGroup] : [],
      ),
    ),
  ];
  for (const group of groups) {
    const blocks = plan.blocks.filter(
      (block) => block.dialogueGroup === group && elements.has(block.id),
    );
    const pages = [...new Set(blocks.map((block) => block.dialoguePage!))];
    let chosen = 9.2;
    const heights = (page: string) =>
      blocks
        .filter((block) => block.dialoguePage === page)
        .map(
          (block) =>
            elements.get(block.id)!.getBoundingClientRect().height * mm,
        );
    for (let tenth = 105; tenth >= 92; tenth--) {
      const pt = tenth / 10;
      for (const block of blocks)
        elements
          .get(block.id)!
          .style.setProperty("--tb-dialogue-size", `${pt}pt`);
      if (
        pages.every((page) => {
          const hs = heights(page);
          return (
            hs.reduce((sum, height) => sum + height, 0) +
              0.85 * Math.max(0, hs.length - 1) <=
            plan.dialogueBottomMm - plan.dialogueBodyTopMm
          );
        })
      ) {
        chosen = pt;
        break;
      }
    }
    for (const block of blocks) {
      elements
        .get(block.id)!
        .style.setProperty("--tb-dialogue-size", `${chosen}pt`);
      dialogueSizesPt[block.id] = chosen;
    }
    for (const page of pages) {
      const hs = heights(page),
        spare =
          plan.dialogueBottomMm -
          plan.dialogueBodyTopMm -
          hs.reduce((sum, height) => sum + height, 0) -
          0.85 * Math.max(0, hs.length - 1);
      const gap = Math.min(
        5,
        0.85 + Math.max(0, spare) / Math.max(1, hs.length - 1),
      );
      for (const block of blocks.filter(
        (candidate) => candidate.dialoguePage === page,
      ))
        dialogueGapsMm[block.id] = gap;
    }
  }
  return {
    rowHeightsMm,
    blockMinHeightsMm,
    dialogueSizesPt,
    dialogueGapsMm,
    dialogueTopMm: plan.dialogueBodyTopMm,
  };
}

export function applyRecoveryMeasurements(
  model: TextbookRenderModel,
  result: RecoveryMeasureResult,
): void {
  for (const section of model.sections)
    for (const block of section.blocks) {
      if (block.kind === "recall" && block.displayRows)
        block.rowHeightsMm = result.rowHeightsMm;
      if (result.blockMinHeightsMm[block.id])
        block.measurementMinHeightMm = result.blockMinHeightsMm[block.id];
      if (result.dialogueSizesPt[block.id] !== undefined) {
        block.dialogueSizePt = result.dialogueSizesPt[block.id];
        block.dialogueGapMm = result.dialogueGapsMm[block.id];
        block.dialogueTopMm = Math.max(
          result.dialogueTopMm,
          textbookBodyTopMm(section),
        );
      }
    }
}
