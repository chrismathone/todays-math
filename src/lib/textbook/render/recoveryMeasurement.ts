import type { TextbookRenderModel } from "./model";
import { isDialoguePlacement } from "./blocks/dialogue";
import { textbookBodyTopMm } from "../layout/paginate";
import { sourceQuestionRowPlan } from "./sourceQuestionRows";

export interface RecoveryMeasurePlan {
  rootSelector?: string;
  sourceMemoryRowKeys: string[];
  blocks: Array<{
    id: string;
    memoryGroup?: string;
    memoryHeading?: string;
    dialogueGroup?: string;
    dialoguePage?: string;
    dialogueCaption?: boolean;
  }>;
  dialogueBodyTopMm: number;
  dialogueBottomMm: number;
  sourceQuestionGroups?: Array<{ ids: string[]; alignPrompt: boolean }>;
}
export function recoveryMeasurePlan(
  model: TextbookRenderModel,
): RecoveryMeasurePlan {
  return {
    sourceQuestionGroups: sourceQuestionRowPlan(model),
    sourceMemoryRowKeys: model.sections.flatMap((section) =>
      section.blocks.flatMap((block) =>
        block.kind === "recall" && block.semantic?.source
          ? (block.displayRows ?? []).map((row) => row.rowKey)
          : [],
      ),
    ),
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
          ...((isDialoguePlacement(block) && block.semantic) ||
          block.dialogueLesson
            ? {
                dialogueGroup: section.blocks.some(
                  (candidate) => candidate.semantic?.source?.kind === "opening",
                )
                  ? section.unitKey
                  : section.sectionKey,
                dialoguePage: section.sectionKey,
                ...(block.dialogueLesson ? { dialogueCaption: true } : {}),
              }
            : {}),
        };
      }),
    ),
  };
}
/** Original multi-page scripts are fitted as one unit even when publishing divides the pages into steps. */
export function dialogueMeasurementModel(
  whole: TextbookRenderModel,
  selected: TextbookRenderModel,
): TextbookRenderModel {
  const wanted = new Set(
    selected.sections.flatMap((section) =>
      section.blocks.flatMap((block) =>
        block.semantic?.source?.kind === "opening" ? [section.unitKey] : [],
      ),
    ),
  );
  const selectedKeys = new Set(
    selected.sections.map(
      (section) => `${section.unitKey}:${section.sectionKey}`,
    ),
  );
  const extra = whole.sections
    .filter(
      (section) =>
        wanted.has(section.unitKey) &&
        !selectedKeys.has(`${section.unitKey}:${section.sectionKey}`),
    )
    .map((section) => ({
      ...section,
      blocks: section.blocks.filter(
        (block) => isDialoguePlacement(block) || block.dialogueLesson,
      ),
    }))
    .filter((section) => section.blocks.length > 0);
  const result = { ...selected, sections: [...selected.sections, ...extra] };
  if (
    result.sections.length > 8 ||
    result.sections.reduce((sum, section) => sum + section.blocks.length, 0) >
      600
  )
    throw new Error(
      "대화의 공통 글자 크기 측정 한도를 넘었습니다. 수업 구획을 줄여 주세요.",
    );
  return result;
}
export interface RecoveryMeasureResult {
  sourceQuestionSizesMm?: Record<
    string,
    { head: number; prompt?: number; main?: number }
  >;
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
  const seen = new Set<string>();
  return {
    ...answers,
    sections: answers.sections
      .map((section) => ({
        ...section,
        blocks: section.blocks.filter((block) => {
          const group = groups.get(block.id);
          if (
            block.kind !== "recall" ||
            group === undefined ||
            !wanted.has(group)
          )
            return false;
          const partition = JSON.stringify([
            group,
            (block.displayRows ?? []).map((row) => row.rowKey),
          ]);
          if (seen.has(partition)) return false;
          seen.add(partition);
          return true;
        }),
      }))
      .filter((section) => section.blocks.length > 0),
  };
}

/** Count every private helper before creating the bounded measurement DOM. */
export function assertRecoveryMeasurementBudget(
  sizing: TextbookRenderModel,
  probes?: TextbookRenderModel,
): void {
  const count = [sizing, probes].reduce(
    (sum, model) =>
      sum +
      (model?.sections.reduce(
        (total, section) => total + section.blocks.length,
        0,
      ) ?? 0),
    0,
  );
  if (sizing.sections.length > 8 || count > 600)
    throw new Error(
      "Render measurement exceeds 8 sections or 600 projected blocks including private helpers; split sections before publishing",
    );
}

/** Self-contained DOM function used verbatim in the preview and trusted Chromium page. */
export function measureIntroGeometry(
  root: ParentNode = document,
): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  const tolerance = (0.5 * 96) / 25.4;
  for (const element of root.querySelectorAll<HTMLElement>(
    "[data-measure-id]",
  )) {
    const intro = element.querySelector<HTMLElement>(".tb-auto-intro-left");
    if (!intro) continue;
    const frame = intro.getBoundingClientRect();
    const slots = [
      "h2",
      ".tb-intro-question",
      "figure",
      ".tb-intro-explanation",
      ".tb-intro-key",
    ].map((selector) =>
      intro.querySelector<HTMLElement>(selector)?.getBoundingClientRect(),
    );
    result[element.dataset.measureId!] = slots.every(
      (rect, index) =>
        rect !== undefined &&
        rect.bottom <= frame.bottom + tolerance &&
        (index === 0 || slots[index - 1]!.bottom <= rect.top + tolerance),
    );
  }
  return result;
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
  const sourceQuestionSizesMm: Record<
    string,
    { head: number; prompt?: number; main?: number }
  > = {};
  for (const group of plan.sourceQuestionGroups ?? []) {
    const members = group.ids.map((id) => elements.get(id));
    if (members.some((element) => !element))
      throw new Error("Missing source question row measurement");
    const heads = members.map((element) =>
      element!.querySelector<HTMLElement>(".tb-problem-head"),
    );
    const prompts = members.map((element) =>
      element!.querySelector<HTMLElement>(".tb-problem-question > .tb-prose"),
    );
    if (heads.some((head) => !head) || prompts.some((prompt) => !prompt))
      throw new Error("Missing native question heading or prompt");
    if (
      !group.alignPrompt &&
      heads.some(
        (element) =>
          element!.scrollHeight > element!.clientHeight + 2 ||
          element!.scrollWidth > element!.clientWidth + 2,
      )
    )
      throw new Error(
        "SOURCE_HEADER_OVERFLOW: linked question heading exceeds its native slot",
      );
    const head =
      Math.max(
        ...heads.map((element) => element!.getBoundingClientRect().height),
      ) * mm;
    const prompt = group.alignPrompt
      ? Math.max(
          ...prompts.map((element) => element!.getBoundingClientRect().height),
        ) * mm
      : undefined;
    group.ids.forEach((id, index) => {
      sourceQuestionSizesMm[id] = {
        head,
        ...(prompt === undefined ? {} : { prompt }),
      };
      heads[index]!.style.height = `${head}mm`;
      if (prompt !== undefined) prompts[index]!.style.minHeight = `${prompt}mm`;
    });
    // A figure or QR may be taller than the prose. Reserve that complete prompt row
    // before the writing area, without placing the QR inside it or changing stored data.
    if (
      group.alignPrompt &&
      members.some((element) =>
        element!.querySelector(".tb-qr,.tb-problem-figure"),
      )
    ) {
      const mains = members.map((element) =>
        element!.querySelector<HTMLElement>(".tb-problem-main"),
      );
      if (mains.some((element) => !element))
        throw new Error("Missing source question body measurement");
      const main =
        Math.max(
          ...mains.map((element) => element!.getBoundingClientRect().height),
        ) * mm;
      group.ids.forEach((id, index) => {
        sourceQuestionSizesMm[id].main = main;
        mains[index]!.style.minHeight = `${main}mm`;
      });
    }
  }
  const sourceRowKeys = new Set(plan.sourceMemoryRowKeys);
  for (const row of root.querySelectorAll<HTMLElement>(
    ".tb-memory-row[data-row-key]",
  )) {
    const key = row.dataset.rowKey!;
    // A masked sentence's writing floor must not enlarge the immutable source row.
    // Only the private canonical copy supplies source row heights.
    if (sourceRowKeys.has(key) && !row.closest("[data-recall-probe-id]"))
      continue;
    const precision = sourceRowKeys.has(key) ? 100 : 10;
    rowHeightsMm[key] = Math.max(
      rowHeightsMm[key] ?? 0,
      Math.ceil(row.getBoundingClientRect().height * mm * precision - 1e-6) /
        precision,
    );
  }
  for (const row of root.querySelectorAll<HTMLElement>(
    ".tb-memory-row[data-row-key]",
  )) {
    const height = rowHeightsMm[row.dataset.rowKey!];
    if (height === undefined)
      throw new Error("Missing canonical recall row measurement");
    row.classList.add("tb-memory-row-measured");
    row.style.height = `${height}mm`;
    const blank = row.querySelector<HTMLElement>(".tb-blank-sentence");
    if (blank)
      blank.innerHTML = '<span class="tb-write-line"></span>'.repeat(
        Math.max(
          1,
          Math.floor(
            (height - (sourceRowKeys.has(row.dataset.rowKey!) ? 3 : 2.2)) / 7,
          ),
        ),
      );
    if (
      blank &&
      sourceRowKeys.has(row.dataset.rowKey!) &&
      blank.children.length === 1
    )
      (blank.firstElementChild as HTMLElement).style.height = "100%";
  }
  const maxima: Record<string, number> = {};
  for (const block of plan.blocks) {
    const group = block.memoryGroup ?? block.memoryHeading,
      element = elements.get(block.id);
    if (group && element)
      maxima[group] = Math.max(
        maxima[group] ?? 0,
        element.getBoundingClientRect().height * mm,
      );
  }
  const blockMinHeightsMm: Record<string, number> = {};
  for (const block of plan.blocks) {
    const group = block.memoryGroup ?? block.memoryHeading,
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
    for (let tenth = 105; tenth >= 92; tenth--) {
      const pt = tenth / 10;
      for (const block of blocks)
        for (const element of [
          elements.get(block.id)!,
          ...elements
            .get(block.id)!
            .querySelectorAll<HTMLElement>(".tb-dialogue,.tb-dialogue-board"),
        ])
          element.style.setProperty("--tb-dialogue-size", `${pt}pt`);
      if (
        pages.every((page) => {
          const hs = blocks
            .filter((block) => block.dialoguePage === page)
            .map(
              (block) =>
                elements.get(block.id)!.getBoundingClientRect().height * mm +
                (block.dialogueCaption ? 4 : 0),
            );
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
      for (const element of [
        elements.get(block.id)!,
        ...elements
          .get(block.id)!
          .querySelectorAll<HTMLElement>(".tb-dialogue,.tb-dialogue-board"),
      ])
        element.style.setProperty("--tb-dialogue-size", `${chosen}pt`);
      if (!block.dialogueCaption) dialogueSizesPt[block.id] = chosen;
    }
    for (const page of pages) {
      const hs = blocks
          .filter((block) => block.dialoguePage === page)
          .map(
            (block) =>
              elements.get(block.id)!.getBoundingClientRect().height * mm +
              (block.dialogueCaption ? 4 : 0),
          ),
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
        if (!block.dialogueCaption) dialogueGapsMm[block.id] = gap;
    }
  }
  return {
    rowHeightsMm,
    sourceQuestionSizesMm,
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
      const sourceQuestionSize = result.sourceQuestionSizesMm?.[block.id];
      if (
        block.kind === "problem" &&
        block.semantic?.source &&
        sourceQuestionSize
      ) {
        block.sourceQuestionHeadHeightMm = sourceQuestionSize.head;
        block.sourceQuestionPromptMinHeightMm = sourceQuestionSize.prompt;
        block.sourceQuestionMainMinHeightMm = sourceQuestionSize.main;
      }
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
