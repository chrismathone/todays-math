import { getTextbookCharacter } from "../../characters";
import type { EditorialBlock } from "../editorial";
import { escapeHtml as esc, renderTextbookMarkdown as md } from "../markdown";
import { imageHtml, type RenderResources } from "./shared";

type DialogueBlock = Extract<EditorialBlock, { kind: "dialogue" }>;
type TextBlock = Extract<EditorialBlock, { kind: "text" }>;

/**
 * Render-only fields the projection may add to a dialogue block. None is stored in a
 * manuscript; when absent the block renders from its own stored fields.
 */
export interface DialogueRenderFields {
  /** The speaker's name as frozen with the book's cast: "지은 선생님", "다은". */
  speakerName?: string;
  /** The cast slot the speaker fills. Recorded for QA only; position comes from `side`. */
  castRole?: "teacher" | "student1" | "student2";
  /** The measured common size of this lesson's speech, 9.2–10.5pt in 0.1pt steps. */
  dialogueSizePt?: number;
}

/** The v15 conversation fit: one size per lesson, from 10.5pt down by 0.1pt to 9.2pt. */
export const DIALOGUE_FIT = {
  startPt: 10.5,
  stepPt: 0.1,
  floorPt: 9.2,
  /** Space between two placements: never less, and never stretched beyond the maximum. */
  minGapMm: 0.85,
  maxGapMm: 5,
} as const;

/** One backdrop is painted behind a page's dialogue; a turn itself paints none. */
export const DIALOGUE_BACKDROP = {
  className: "tb-dialogue-backdrop",
  /** From the first placement's top and below the last placement's bottom. */
  paddingBlockMm: 3,
  /** Turns are already inset by this much inside their own block width. */
  insetInlineMm: 3.5,
} as const;

const tenth = (value: number) => Math.round(value * 10) / 10;

/** 10.5, 10.4, … 9.2 — the only sizes the fit may try, in order. */
export function dialogueSizeSteps(): number[] {
  const steps: number[] = [];
  for (
    let size: number = DIALOGUE_FIT.startPt;
    size >= DIALOGUE_FIT.floorPt - 1e-9;
    size = tenth(size - DIALOGUE_FIT.stepPt)
  )
    steps.push(size);
  return steps;
}

function assertDialogueSize(sizePt: number): number {
  if (!dialogueSizeSteps().includes(sizePt))
    throw new Error(
      `대화 글자 크기는 9.2~10.5pt의 0.1pt 단위여야 합니다: ${sizePt}`,
    );
  return sizePt;
}

/**
 * The one custom property the measured fit sets on any ancestor of the turns. Portrait
 * size and bubble padding follow it in CSS, as they did in the v15 typesetter.
 */
export function dialogueSizeStyle(sizePt: number): string {
  return `--tb-dialogue-size:${assertDialogueSize(sizePt)}pt`;
}

/**
 * The largest allowed size at which a lesson fits. `fits` measures a real layout at the
 * given size. When even the floor does not fit, the floor is returned with `fits: false`:
 * the lesson then continues on the next page instead of shrinking further.
 */
export function solveDialogueSize(fits: (sizePt: number) => boolean): {
  sizePt: number;
  fits: boolean;
} {
  for (const sizePt of dialogueSizeSteps())
    if (fits(sizePt)) return { sizePt, fits: true };
  return { sizePt: DIALOGUE_FIT.floorPt, fits: false };
}

/** The spare height of a page shared between its placements, within the gap limits. */
export function dialogueGapMm(spareMm: number, placements: number): number {
  return Math.min(
    DIALOGUE_FIT.maxGapMm,
    DIALOGUE_FIT.minGapMm + Math.max(0, spareMm) / Math.max(1, placements - 1),
  );
}

/** "선생님" follows a teacher's name once, however the name was stored. */
export function dialogueSpeakerLabel(
  name: string,
  role: "teacher" | "student",
): string {
  const trimmed = name.trim();
  if (role !== "teacher") return trimmed;
  const given = trimmed.replace(/(?:\s*선생님)+$/u, "");
  return given ? `${given} 선생님` : "선생님";
}

/**
 * The v15 pages set every formula in display style, so an inline fraction keeps its full
 * size. The style is added to the formula as it is typeset; the stored text is not changed.
 */
export function displayStyleMath(markdown: string): string {
  if ((markdown.match(/\$/g) ?? []).length % 2) return markdown;
  return markdown.replace(
    /\$\$[\s\S]*?\$\$|\$([^$\n]+)\$/g,
    (token: string, tex?: string) =>
      tex === undefined || /^\s*\\displaystyle(?![A-Za-z])/.test(tex)
        ? token
        : `$\\displaystyle ${tex}$`,
  );
}

/**
 * CommonMark does not close `**` after a formula when a letter follows ("**$3$**이다").
 * Korean particles follow an emphasised formula without a space, so those marks would
 * print as asterisks. The pairs the parser left as text become emphasis here, within one
 * paragraph; the stored text is not changed.
 */
export function dialogueMarkdownHtml(markdown: string): string {
  return md(displayStyleMath(markdown)).replace(
    /\*\*((?:(?!\*\*|<\/?(?:p|li|ul|ol|h[1-6]|blockquote|pre|code|table|tr|td)[ >])[\s\S])+?)\*\*/g,
    "<strong>$1</strong>",
  );
}

/** Raw v15 text: `[[TeX]]` is a formula and `{{word}}` a key word. */
export function v15DisplayMarkdown(text: string): string {
  // Formulas are set aside first, so the braces inside TeX are never read as key words.
  const [open, close] = [
    String.fromCharCode(0xe000),
    String.fromCharCode(0xe001),
  ];
  if (text.includes(open) || text.includes(close))
    throw new Error("판서 글에 쓸 수 없는 문자가 있습니다.");
  const math: string[] = [];
  return text
    .replace(/\[\[([\s\S]*?)\]\]/g, (_, tex: string) => {
      math.push(tex);
      return `${open}${math.length - 1}${close}`;
    })
    .replace(/\{\{([^{}]*)\}\}/g, "**$1**")
    .replace(
      new RegExp(`${open}(\\d+)${close}`, "g"),
      (_, index: string) => `$${math[Number(index)]}$`,
    );
}

/** A title or name with its `$TeX$` typeset and everything else as plain text. */
export function renderDialogueInlineHtml(text: string): string {
  return text
    .split(/(\$[^$\n]+\$)/)
    .map((part) =>
      /^\$[^$\n]+\$$/.test(part)
        ? md(part).replace(/^<p>|<\/p>$/g, "")
        : esc(part),
    )
    .join("");
}

type Lesson = { lessonKey: string; lessonTitle: string };
const lessonAttrs = (lesson?: Lesson) =>
  lesson
    ? ` data-lesson-key="${esc(lesson.lessonKey)}" data-lesson-title="${esc(lesson.lessonTitle)}"`
    : "";
const sizeAttrs = (sizePt?: number) =>
  sizePt === undefined
    ? ""
    : ` data-dialogue-font-pt="${assertDialogueSize(sizePt)}" style="${dialogueSizeStyle(sizePt)}"`;

function boardHtml(input: {
  title: string;
  /** One formula, centred. */
  formula?: string;
  /** Prose with inline formulas, when the board is a statement instead of one formula. */
  text?: string;
  note?: string;
  lesson?: Lesson;
  sizePt?: number;
}): string {
  return `<div class="tb-dialogue-board" data-dialogue-role="board" data-dialogue-kind="board"${lessonAttrs(input.lesson)}${sizeAttrs(input.sizePt)}>${input.title ? `<small class="tb-board-title"><i aria-hidden="true"></i><span>${renderDialogueInlineHtml(input.title)}</span></small>` : ""}${input.formula ? `<div class="tb-board-formula">${dialogueMarkdownHtml(input.formula)}</div>` : ""}${input.text ? `<div class="tb-board-text">${dialogueMarkdownHtml(input.text)}</div>` : ""}${input.note ? `<div class="tb-board-note">${dialogueMarkdownHtml(input.note)}</div>` : ""}</div>`;
}

/** A board turn stores `**title**`, a blank line, then one formula or a statement, then notes. */
function boardParts(markdown: string) {
  const titled = /^\*\*([^\n]+?)\*\*\n\n([\s\S]+)$/.exec(markdown);
  const body = (titled?.[2] ?? markdown).split(/\n{2,}/);
  const formula = /^\$[^$\n]+\$$/.test(body[0]!.trim());
  return {
    title: titled?.[1] ?? "",
    ...(formula
      ? { formula: body[0]!.trim(), note: body.slice(1).join("\n\n") }
      : { text: body.join("\n\n") }),
  };
}

export function renderDialogueHtml(
  block: DialogueBlock & DialogueRenderFields,
  resources: RenderResources,
): string {
  const lesson = block.presentation;
  if (lesson?.kind === "board")
    return boardHtml({
      ...boardParts(block.markdown),
      lesson,
      sizePt: block.dialogueSizePt,
    });
  // Frozen bytes are addressed by SHA256. Only our explicit speaker namespace opts into
  // atlas clipping, so older single-image portraits and imported speakers keep their layout.
  const character = block.speakerId.startsWith("tb-portrait-")
    ? getTextbookCharacter(block.speakerId.slice("tb-portrait-".length))
    : undefined;
  if (character) {
    const expressions = {
      neutral: "편안한 표정",
      question: "질문하는 표정",
      thinking: "생각하는 표정",
      aha: "깨달은 표정",
    };
    const expression = Object.hasOwn(expressions, block.expression)
      ? (block.expression as keyof typeof expressions)
      : "neutral";
    const name = dialogueSpeakerLabel(
      block.speakerName ?? character.name,
      character.role,
    );
    return `<div class="tb-dialogue tb-dialogue-atlas tb-dialogue-${block.side} tb-speaker-${character.role}" data-expression="${expression}" data-speaker-id="${esc(block.speakerId)}" data-dialogue-role="${character.role}" data-dialogue-kind="speech"${block.castRole ? ` data-dialogue-cast="${block.castRole}"` : ""}${lessonAttrs(lesson)}${sizeAttrs(block.dialogueSizePt)}><div class="tb-portrait"><span class="tb-portrait-frame tb-expression-${expression}${block.mirrorPortrait ? " tb-frame-mirrored" : ""}">${imageHtml(resources, block.portraitAssetId, `${name} · ${expressions[expression]}`, undefined, true)}</span><span class="tb-portrait-name">${esc(name)}</span></div><div class="tb-bubble">${dialogueMarkdownHtml(block.markdown)}</div></div>`;
  }
  // An unknown speaker's portrait is one whole picture and is shown as one: it is never
  // cut as if it were an expression sheet.
  return `<div class="tb-dialogue tb-dialogue-${block.side}" data-expression="${esc(block.expression)}"><div class="tb-portrait${block.mirrorPortrait ? " tb-mirrored" : ""}">${imageHtml(resources, block.portraitAssetId, block.speakerId)}</div><div class="tb-bubble"><strong>${esc(block.speakerId)}</strong>${md(block.markdown)}</div></div>`;
}

const boardNode = (block: EditorialBlock) =>
  block.kind === "text" && block.semantic?.node?.kind === "board"
    ? block.semantic.node
    : undefined;

/**
 * A board that the source keeps as a text block with a `board` node (the raw v15
 * conversion): its title, its TeX and its note, not the block's markdown. The dispatcher
 * may pass its resources as it does for every block; a board has no asset and reads none.
 */
export const renderDialogueBoardHtml: (
  block: TextBlock & Pick<DialogueRenderFields, "dialogueSizePt">,
  resources?: RenderResources,
) => string = (block) => {
  const node = boardNode(block);
  if (!node) throw new Error("판서 노드가 없는 글 블록입니다.");
  if (/[$\n]/.test(node.tex))
    throw new Error("판서 수식에 쓸 수 없는 문자가 있습니다.");
  const source = block.semantic?.source;
  return boardHtml({
    title: node.title,
    formula: `$${node.tex}$`,
    note: node.note ? v15DisplayMarkdown(node.note) : "",
    lesson:
      source && block.semantic?.title
        ? { lessonKey: source.unit, lessonTitle: block.semantic.title }
        : undefined,
    sizePt: block.dialogueSizePt,
  });
};

/**
 * The three strips around a lesson, for the projection to place. Their words come from
 * the projection, which knows the lesson, the page and the activities that are on;
 * nothing here writes copy.
 */
export function renderDialogueLessonTitleHtml(
  lesson: Lesson,
  continued = false,
): string {
  return `<p class="tb-dialogue-lesson-title"${lessonAttrs(lesson)}${continued ? ' data-lesson-continued="true"' : ""}>${renderDialogueInlineHtml(lesson.lessonTitle)}</p>`;
}
export function renderDialogueGuideHtml(text: string): string {
  return `<p class="tb-dialogue-guide">${esc(text)}</p>`;
}
export function renderDialogueContinueHtml(input: {
  /** The activity's name, as the projection labels it. */
  label: string;
  /** This page among the lesson's pages, counted from 1. */
  index: number;
  total: number;
  /** What follows, decided from the pages and activities that actually follow. */
  note: string;
}): string {
  if (
    !Number.isInteger(input.index) ||
    !Number.isInteger(input.total) ||
    input.index < 1 ||
    input.index > input.total
  )
    throw new Error("대화 쪽 차례가 올바르지 않습니다.");
  return `<div class="tb-dialogue-continue" data-dialogue-page="${input.index}" data-dialogue-pages="${input.total}"><span>${esc(input.label)}</span><b>${input.index} / ${input.total}</b><span>${esc(input.note)}</span></div>`;
}

/** A speech turn or a board: what the page's one dialogue backdrop spans. */
export function isDialoguePlacement(block: EditorialBlock): boolean {
  return block.kind === "dialogue" || boardNode(block) !== undefined;
}

export interface DialogueLessonRun {
  lessonKey: string;
  lessonTitle: string;
  /** Render block ids in order: speech turns and boards. */
  blockIds: string[];
  speech: number;
  boards: number;
}

/**
 * Consecutive dialogue placements of one lesson. A lesson changes when its key or its
 * title changes: the raw v15 conversion keeps one key, the unit, for four titled pages.
 * A board kept as a text block joins the run it stands in. Any other block ends the run,
 * and a dialogue block without lesson metadata forms no run.
 */
export function dialogueLessonRuns(
  blocks: readonly EditorialBlock[],
): DialogueLessonRun[] {
  const runs: DialogueLessonRun[] = [];
  let open: DialogueLessonRun | undefined;
  for (const block of blocks) {
    if (block.kind === "dialogue" && block.presentation) {
      const { lessonKey, lessonTitle, kind } = block.presentation;
      if (
        !open ||
        open.lessonKey !== lessonKey ||
        open.lessonTitle !== lessonTitle
      )
        runs.push(
          (open = {
            lessonKey,
            lessonTitle,
            blockIds: [],
            speech: 0,
            boards: 0,
          }),
        );
      open.blockIds.push(block.id);
      if (kind === "board") open.boards += 1;
      else open.speech += 1;
    } else if (open && boardNode(block)) {
      open.blockIds.push(block.id);
      open.boards += 1;
    } else open = undefined;
  }
  return runs;
}
