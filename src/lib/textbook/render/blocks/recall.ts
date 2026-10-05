import { splitBlankSentence } from "@/contracts/conceptBlank.contract";
import type { TextbookSemanticRow } from "@/contracts/textbookSemantic.contract";
import type { EditorialBlock } from "../editorial";
import {
  escapeHtml as esc,
  renderTextbookMarkdown as md,
  renderTextbookLabel as labelHtml,
} from "../markdown";
import { displayStyleMath } from "./dialogue";

export type RecallPhase = "study" | "keywords" | "sentences";
/** Writing lines are 7mm apart everywhere; a memory row is a whole number of them tall. */
export const RECALL_LINE_PITCH_MM = 7;
/** Top and bottom padding of a row: sheets written from the bank, and original v15 pages. */
export const RECALL_ROW_PADDING_MM = { bank: 2.2, source: 3 } as const;
/**
 * A sheet converted from an original page carries these on its section and on every row
 * (`.tb-memory-row-source[data-row-origin="source"]`). Sheets written from the bank carry neither.
 */
export const RECALL_SOURCE_CLASS = "tb-memory-source";

type RecallBlock = Extract<EditorialBlock, { kind: "recall" }> & {
  /** `variant === "answers"`. Absent: inferred from the legacy pieces (see `revealed`). */
  answersVisible?: boolean;
  /** Enabled memory phases in book order; the tab strip never names a phase outside it. */
  memoryPhases?: readonly RecallPhase[];
  /** Measured common height per rowKey: the maximum over the three phases. */
  rowHeightsMm?: Readonly<Record<string, number>>;
  /** Page index within the phase, for the QA page-partition check. */
  relativePageIndex?: number;
  /**
   * Rows the model already projected for this variant with `recallDisplayRows`. When present
   * they are printed as given and the node's `rawText` (stripped for students) is never read.
   */
  displayRows?: readonly RecallDisplayRow[];
  /** The lesson a continued bank block belongs to; printed with "계속" in its reserved bar. */
  memoryContinuationTitle?: string;
};

export type RecallDisplayPiece =
  | { kind: "text"; markdown: string }
  | { kind: "key"; markdown: string }
  | { kind: "blank"; widthEm: number };
export interface RecallDisplayRow {
  rowKey: string;
  label: string;
  pieces: RecallDisplayPiece[];
  /** The whole body is withheld (student sentence writing). */
  hidden: boolean;
  /** Common height in line pitches: one pure function of the row, identical in every phase. */
  lines: number;
}

/** v15 source math `[[tex]]` as Markdown math. The TeX bytes are copied, never rewritten. */
export function v15TexToMarkdown(raw: string): string {
  return raw.replace(/\[\[([\s\S]*?)\]\]/g, (_, tex: string) => `$${tex}$`);
}

type CanonicalPiece = { kind: "text" | "key"; markdown: string };
/** `{{key}}` outside math. Braces inside `[[tex]]` belong to TeX (`\frac{1}{\sqrt{2}}`). */
function v15Pieces(raw: string): CanonicalPiece[] {
  const pieces: CanonicalPiece[] = [];
  let text = "";
  let key: string | null = null;
  const flush = () => {
    if (text) pieces.push({ kind: "text", markdown: v15TexToMarkdown(text) });
    text = "";
  };
  for (let at = 0; at < raw.length;) {
    if (raw.startsWith("[[", at)) {
      const close = raw.indexOf("]]", at + 2);
      const end = close < 0 ? raw.length : close + 2;
      if (key === null) text += raw.slice(at, end);
      else key += raw.slice(at, end);
      at = end;
    } else if (key === null && raw.startsWith("{{", at)) {
      flush();
      key = "";
      at += 2;
    } else if (key !== null && raw.startsWith("}}", at)) {
      pieces.push({ kind: "key", markdown: v15TexToMarkdown(key) });
      key = null;
      at += 2;
    } else {
      if (key === null) text += raw[at];
      else key += raw[at];
      at += 1;
    }
  }
  // An unclosed key stays hidden material: it is never demoted to public text.
  if (key !== null)
    pieces.push({ kind: "key", markdown: v15TexToMarkdown(key) });
  flush();
  return pieces;
}
function canonicalPieces(row: TextbookSemanticRow): CanonicalPiece[] {
  if (row.textFormat === "v15-tex") return v15Pieces(row.rawText);
  if (row.textFormat === "bank-blank")
    return splitBlankSentence(row.rawText).map((piece) => ({
      kind: piece.kind === "key" ? "key" : "text",
      markdown: piece.text,
    }));
  return [{ kind: "text", markdown: row.rawText }];
}

/** Printed advance in em. Math is counted by its symbols, not its commands. */
function advanceEm(markdown: string): number {
  let units = 0;
  const count = (text: string, scale: number) => {
    for (const ch of text)
      units +=
        scale * (/\s/.test(ch) ? 0.3 : ch.charCodeAt(0) < 0x2e80 ? 0.56 : 1);
  };
  let at = 0;
  for (const match of markdown.matchAll(/\$([^$]*)\$/g)) {
    count(markdown.slice(at, match.index), 1);
    count(
      match[1].replace(/\\[a-zA-Z]+/g, "0").replace(/[{}^_\\&]/g, ""),
      1.05,
    );
    at = match.index! + match[0].length;
  }
  count(markdown.slice(at).replace(/[*_`]/g, ""), 1);
  return units;
}
/** A blank keeps the length of what it hides, never the text. */
const blankWidthEm = (markdown: string) =>
  Math.round(Math.min(40, Math.max(2, advanceEm(markdown) + 0.6)) * 10) / 10;
/** Body column of a full-width sheet at 8.3pt holds about this many em before wrapping. */
const ROW_WRAP_EM = 44;

/**
 * The variant-safe display of the common rows. With `reveal` false the keyword and sentence
 * text is dropped here, so nothing downstream can paint or serialize it.
 */
export function recallDisplayRows(
  rows: readonly TextbookSemanticRow[],
  phase: RecallPhase,
  reveal: boolean,
): RecallDisplayRow[] {
  return rows.map((row) => {
    const source = canonicalPieces(row);
    const lines = Math.max(
      1,
      Math.ceil(
        advanceEm(source.map((p) => p.markdown).join("")) / ROW_WRAP_EM,
      ),
    );
    const base = { rowKey: row.rowKey, label: row.label, lines };
    if (phase === "sentences" && !reveal)
      return { ...base, pieces: [], hidden: true };
    return {
      ...base,
      hidden: false,
      pieces: source.map((piece): RecallDisplayPiece => {
        if (piece.kind === "text" || phase !== "keywords")
          return { kind: "text", markdown: piece.markdown };
        return reveal
          ? { kind: "key", markdown: piece.markdown }
          : { kind: "blank", widthEm: blankWidthEm(piece.markdown) };
      }),
    };
  });
}

/**
 * The common row heights for `rowHeightsMm`: measure every `[data-row-key]` row in all enabled
 * phases without heights, then give each key its tallest measurement (rounded up to 0.1mm).
 */
export function commonRecallRowHeights(
  measured: ReadonlyArray<{ rowKey: string; heightMm: number }>,
): Record<string, number> {
  const heights: Record<string, number> = {};
  for (const { rowKey, heightMm } of measured)
    heights[rowKey] = Math.max(
      heights[rowKey] ?? 0,
      Math.ceil(heightMm * 10 - 1e-6) / 10,
    );
  return heights;
}

/** Private-use markers survive Markdown and are swapped for markup afterwards. */
const MARK = String.fromCharCode(0xe000);
const OPEN = String.fromCharCode(0xe001);
const CLOSE = String.fromCharCode(0xe002);
const keywordBlank = (widthEm: number) =>
  `<span class="tb-blank tb-blank-keyword" data-writing-space="keyword" role="textbox" aria-label="빈칸" style="width:${widthEm}em"></span>`;
const SEAM = String.fromCharCode(0xe003);
/**
 * The pieces of one row, typeset as one Markdown source. A key that is a formula may touch the
 * formula after it (`{$50$}$\%$`); joined bare, the two `$` would open display math. A seam
 * between such pieces keeps them two inline formulas and is taken out of the typeset HTML, so
 * the formulas still touch on the page. The stored text and the pieces are not changed.
 */
export function typesetRecallPieces(
  parts: readonly string[],
  typeset: (markdown: string) => string,
): string {
  let markdown = "";
  for (const part of parts) {
    if (markdown.endsWith("$") && part.startsWith("$")) markdown += SEAM;
    markdown += part;
  }
  return typeset(markdown).replaceAll(SEAM, "");
}
const writingLines = (count: number, label: string) =>
  `<span class="tb-blank tb-blank-sentence" data-writing-space="sentence" role="textbox" aria-label="${label}">${'<span class="tb-write-line"></span>'.repeat(count)}</span>`;
/** The original sentence sheet: one rule under the space the hidden sentence would take. */
const writingRule = (label: string) =>
  `<span class="tb-blank tb-blank-sentence tb-blank-rule" data-writing-space="sentence" role="textbox" aria-label="${label}"><span class="tb-write-line"></span></span>`;

/**
 * `source`: the row is an original v15 row. Its formulas are set in display style as they are
 * typeset (the stored text keeps its TeX), and a hidden sentence short of two 7mm lines is one rule.
 */
function rowBodyHtml(
  row: RecallDisplayRow,
  lines: number,
  source = false,
): string {
  if (row.hidden)
    return source && lines < 2
      ? writingRule("문장으로 개념 쓰기")
      : writingLines(lines, "문장으로 개념 쓰기");
  const blanks: number[] = [];
  const parts = row.pieces.map((piece) => {
    if (piece.kind === "text") return piece.markdown;
    if (piece.kind === "key") return `${OPEN}${piece.markdown}${CLOSE}`;
    blanks.push(piece.widthEm);
    return MARK;
  });
  let blank = 0;
  return typesetRecallPieces(parts, (markdown) =>
    md(source ? displayStyleMath(markdown) : markdown),
  )
    .replaceAll(MARK, () => keywordBlank(blanks[blank++]))
    .replaceAll(OPEN, '<span class="tb-memory-key">')
    .replaceAll(CLOSE, "</span>");
}

const PHASES: Record<
  RecallPhase,
  { title: string; subtitle: string; ask: string }
> = {
  study: {
    title: "개념학습",
    subtitle: "정의와 성질을 읽고 예를 들어 설명하시오.",
    ask: "정의와 성질을 확인하시오.",
  },
  keywords: {
    title: "빈칸개념암기",
    subtitle: "빈칸에 알맞은 용어와 식을 쓰시오.",
    ask: "빈칸에 알맞은 내용을 쓰시오.",
  },
  sentences: {
    title: "통문장개념암기",
    subtitle: "책을 보지 않고 각 항목을 문장으로 쓰시오.",
    ask: "각 항목의 내용을 문장으로 쓰시오.",
  },
};
const NAME_DATE = "<span>이름 __________　날짜 __________</span>";
const ROUNDS =
  '<span class="tb-memory-rounds" aria-label="학습 반복 확인">1회<i></i>2회<i></i>3회<i></i>4회<i></i></span>';

/**
 * Whether hidden text may be printed. The model's flag decides; the study sheet hides nothing.
 * Without the flag only a whole block whose legacy pieces show no blank is taken as the answer
 * variant. A paragraph part of a split block is never evidence: its label paragraph has no
 * blank of its own in either variant, so guessing there would print a student's answers.
 */
function revealed(block: RecallBlock): boolean {
  if (block.answersVisible !== undefined) return block.answersVisible;
  if (block.phase === "study") return true;
  return (
    !block.continuation &&
    block.lastPart !== false &&
    block.pieces.length > 0 &&
    !block.pieces.some((p) => p.kind === "blank")
  );
}

/**
 * Rows the model projected are printed as given. A block explicitly marked as the student
 * variant still loses anything a projection should not have carried into it.
 */
function projectedRows(block: RecallBlock): RecallDisplayRow[] | undefined {
  const rows = block.displayRows;
  if (!rows) return undefined;
  if (block.answersVisible !== false || block.phase === "study")
    return [...rows];
  return rows.map((row) =>
    block.phase === "sentences"
      ? { ...row, pieces: [], hidden: true }
      : {
          ...row,
          pieces: row.pieces.map((piece): RecallDisplayPiece =>
            piece.kind === "key"
              ? { kind: "blank", widthEm: blankWidthEm(piece.markdown) }
              : piece,
          ),
        },
  );
}

/** An authored code such as C03 is printed as written; identifiers are never mined for digits. */
function conceptCode(conceptId: string): string {
  return /^[A-Za-z]{1,3}\d{1,3}$/.test(conceptId) ? conceptId : "";
}

/** Study, keyword and sentence sheets over one immutable row list. */
function memoryHtml(
  block: RecallBlock,
  node: Extract<
    NonNullable<NonNullable<RecallBlock["semantic"]>["node"]>,
    { kind: "rows" | "concept" }
  >,
): string {
  const phase = block.phase;
  const rows =
    projectedRows(block) ??
    recallDisplayRows(node.rows, phase, revealed(block));
  const conceptId = node.kind === "concept" ? node.conceptId : "";
  const group =
    node.kind === "concept" ? node.conceptId : (node.groupKey ?? "");
  const phases = block.memoryPhases ?? [];
  const continuation = block.continuation || block.semantic?.continuation;
  const tabs =
    phases.length > 1 && phases.includes(phase)
      ? `<div class="tb-recall-phases" aria-label="개념 정리 순서">${phases.map((p, i) => `<span${p === phase ? ' class="tb-recall-active" aria-current="step"' : ""}>${String(i + 1).padStart(2, "0")} ${PHASES[p].title}</span>`).join("")}</div>`
      : "";
  const intro = continuation
    ? ""
    : `${tabs}<div class="tb-recall-checkbar"><b>${PHASES[phase].ask}</b>${NAME_DATE}</div>`;
  // Only the study sheet is repeated four times.
  const rounds = phase === "study" && block.repetitionChecks ? ROUNDS : "";
  const code = node.kind === "concept" ? conceptCode(node.conceptId) : "";
  // An original v15 page: its own row geometry and display-style formulas (see the content CSS).
  const origin = block.semantic!.source;
  // A continued bank block has no concept name and no instruction of its own. It says what it
  // continues in the bar it reserves anyway, in every phase, so the bar keeps one height.
  const continued =
    continuation && !origin
      ? `<span class="tb-memory-continuation" data-continuation>${block.memoryContinuationTitle ? `<span class="tb-memory-continuation-title">${labelHtml(block.memoryContinuationTitle)}</span>` : ""}<small>계속</small></span>`
      : "";
  const title =
    node.kind === "concept"
      ? `<header class="tb-memory-title" data-anchor="memory-title">${code ? `<span class="tb-memory-code">${esc(code)}</span>` : ""}<b>${labelHtml(node.title)}</b>${rounds}</header>`
      : // Rows without a concept name keep the same bar in every phase, so the first row starts
        // at one height. Only the study sheet prints the repetition marks in it.
        `<header class="tb-memory-title tb-memory-title-bare" data-anchor="memory-title">${continued}${rounds}</header>`;
  const page =
    block.relativePageIndex === undefined
      ? ""
      : ` data-relative-page-index="${block.relativePageIndex}"`;
  const padding = RECALL_ROW_PADDING_MM[origin ? "source" : "bank"];
  const body = rows
    .map((row) => {
      const measured = block.rowHeightsMm?.[row.rowKey];
      // A measured row holds as many whole 7mm lines as fit above its padding. An unmeasured
      // source row keeps its natural height: the rule spans the estimated lines of its text.
      const lines =
        measured === undefined
          ? row.lines
          : Math.max(
              1,
              Math.floor((measured - padding) / RECALL_LINE_PITCH_MM),
            );
      const written = origin && measured === undefined ? 1 : lines;
      return `<div class="tb-memory-row${origin ? " tb-memory-row-source" : ""}${measured === undefined ? "" : " tb-memory-row-measured"}" data-row-key="${esc(row.rowKey)}" data-row-group="${esc(group)}" data-concept-id="${esc(conceptId)}" data-phase="${phase}"${origin ? ' data-row-origin="source"' : ""}${page} style="--tb-row-lines:${lines}${measured === undefined ? "" : `;height:${measured}mm`}"><div class="tb-memory-label" data-anchor="row-label">${labelHtml(row.label)}</div><div class="tb-memory-body" data-anchor="row-body">${rowBodyHtml(row, written, !!origin)}</div></div>`;
    })
    .join("");
  return `<section class="tb-recall tb-memory${origin ? ` ${RECALL_SOURCE_CLASS}` : ""}${continuation ? " tb-recall-continuation" : ""}" data-phase="${phase}" data-activity="${block.semantic!.activity}" data-row-group="${esc(group)}"${conceptId ? ` data-concept-id="${esc(conceptId)}"` : ""}${origin ? ` data-memory-origin="source" data-source-kind="${esc(origin.kind)}"` : ""}>${intro}${title}<div class="tb-memory-rows">${body}</div></section>`;
}

const recallTextHtml = (markdown: string) =>
  `${/^\s/.test(markdown) ? " " : ""}${md(markdown)}${/\s$/.test(markdown) ? " " : ""}`;

/** Statements judged true or false with a reason: its own instruction, never the memory tabs. */
function errorCheckHtml(block: RecallBlock): string {
  const instruction = block.continuation
    ? ""
    : `<div class="tb-recall-checkbar tb-activity-instruction"><b>문장이 옳으면 ○, 틀리면 ×에 표시하고 그 이유를 쓰시오.</b>${NAME_DATE}</div>`;
  const items: string[] = [];
  let statement = "";
  const close = (answer: string) => {
    if (statement.trim() || answer)
      items.push(
        `<div class="tb-error-item"><div class="tb-error-statement">${md(statement.trim())}</div>${answer}</div>`,
      );
    statement = "";
  };
  for (const piece of block.pieces) {
    if (piece.kind === "text") statement += piece.markdown;
    else
      close(
        `<div class="tb-error-answer"><span class="tb-error-ox" role="group" aria-label="옳음 또는 틀림 표시"><i>○</i><i>×</i></span>${writingLines(2, "이유 쓰기")}</div>`,
      );
  }
  close("");
  return `<section class="tb-recall tb-error-check${block.continuation ? " tb-recall-continuation" : ""}" data-activity="errorCheck" data-phase="${block.phase}">${instruction}<div class="tb-error-items">${items.join("")}</div></section>`;
}

/** A definition is read and its term is written: its own instruction, never the memory tabs. */
function termRecallHtml(block: RecallBlock): string {
  const instruction = block.continuation
    ? ""
    : `<div class="tb-recall-checkbar tb-activity-instruction"><b>뜻을 읽고 알맞은 용어를 쓰시오.</b>${NAME_DATE}</div>`;
  const node = block.semantic?.node;
  let rows: string;
  if (node?.kind === "rows") {
    const reveal = revealed(block);
    rows = recallDisplayRows(node.rows, "study", true)
      .map((row) => {
        const term = reveal
          ? `<span class="tb-memory-key">${labelHtml(row.label)}</span>`
          : keywordBlank(
              Math.round(
                Math.min(40, Math.max(4, advanceEm(row.label) + 1)) * 10,
              ) / 10,
            );
        return `<div class="tb-term-row" data-row-key="${esc(row.rowKey)}"><div class="tb-term-name">${term}</div><div class="tb-term-definition">${rowBodyHtml(row, row.lines)}</div></div>`;
      })
      .join("");
  } else {
    // Legacy grammar: each hidden term opens a row and the text after it is its definition.
    const parts: string[] = [];
    let term = "";
    let definition = "";
    const close = () => {
      if (term || definition.trim())
        parts.push(
          `<div class="tb-term-row"><div class="tb-term-name">${term}</div><div class="tb-term-definition">${md(definition.replace(/^\s*:\s*/, "").trim())}</div></div>`,
        );
      term = "";
      definition = "";
    };
    for (const piece of block.pieces) {
      if (piece.kind === "blank") {
        close();
        term =
          '<span class="tb-blank tb-blank-keyword" data-writing-space="keyword" role="textbox" aria-label="용어 쓰기"></span>';
      } else definition += piece.markdown;
    }
    close();
    rows = parts.join("");
  }
  return `<section class="tb-recall tb-term-recall${block.continuation ? " tb-recall-continuation" : ""}" data-activity="termRecall" data-phase="${block.phase}">${instruction}<div class="tb-term-rows">${rows}</div></section>`;
}

/** Manuscripts saved before semantic metadata: the paragraph sheet, with ruled writing space. */
function legacyHtml(block: RecallBlock): string {
  const introduction = block.continuation
    ? ""
    : `<div class="tb-recall-phases" aria-label="개념 정리 순서">${(
        Object.keys(PHASES) as RecallPhase[]
      )
        .map(
          (phase, i) =>
            `<span${phase === block.phase ? ' class="tb-recall-active" aria-current="step"' : ""}>${String(i + 1).padStart(2, "0")} ${PHASES[phase].title}</span>`,
        )
        .join(
          "",
        )}</div><div class="tb-recall-checkbar"><b>${PHASES[block.phase].subtitle}</b>${NAME_DATE}</div>`;
  return `<section class="tb-recall${block.continuation ? " tb-recall-continuation" : ""}" data-phase="${block.phase}">${introduction}<div class="tb-recall-content">${block.pieces.map((p) => (p.kind === "blank" ? (p.scope === "sentence" ? writingLines(3, "문장으로 개념 쓰기") : '<span class="tb-blank tb-blank-keyword" data-writing-space="keyword" role="textbox" aria-label="빈칸"></span>') : `<div class="tb-recall-text">${recallTextHtml(p.markdown)}</div>`)).join("")}</div>${block.repetitionChecks ? '<div class="tb-repetition" aria-label="학습 반복 확인">1회 ○　2회 ○　3회 ○　4회 ○</div>' : ""}${block.lastPart === false ? "" : `<p class="tb-study-footer">${block.phase === "study" ? "조건과 예를 함께 확인한다." : "이 단원의 개념학습으로 채점한다."}</p>`}</section>`;
}

export function renderRecallHtml(
  block: Extract<EditorialBlock, { kind: "recall" }>,
): string {
  const recall: RecallBlock = block;
  const semantic = recall.semantic;
  if (semantic?.activity === "errorCheck") return errorCheckHtml(recall);
  if (semantic?.activity === "termRecall") return termRecallHtml(recall);
  const node = semantic?.node;
  if (node?.kind === "rows" || node?.kind === "concept")
    return memoryHtml(recall, node);
  return legacyHtml(recall);
}
