import { BODY_CHOICE_MARKS } from "@/lib/math/circledNumber";

/**
 * Choice rows of a bank problem whose formulas are taller than a text line.
 *
 * A display fraction is taller than the line it sits on, so the line box grows to exactly the
 * formula's box. Five such choices in a column then stack with no leading at all: one choice's
 * denominator touches the next choice's numerator. The rows below mark each choice line, and
 * `FRACTION_CHOICE_CSS` keeps a clearance around every formula inside a marked row.
 *
 * Only tags are inserted. The rendered Markdown, its TeX and the order of the lines stay as they
 * were, and removing the row tags gives back the bytes this function was handed.
 */
export const CHOICE_ROW_CLASS = "tb-choice-row";

/** Space kept above and below each formula of a choice row, in the formula's own em. */
export const CHOICE_FORMULA_CLEARANCE_EM = 0.36;

/**
 * A formula is tall when its box reaches further than bracketed text does: text-style fractions
 * (depth .345em) and everything larger. Brackets (.25em deep) and radicals (.91em high) are not.
 */
export const TALL_FORMULA_EM = { up: 1, down: 0.32 } as const;

/**
 * The margin belongs to KaTeX's `.katex-base`, the inline-block that carries a formula's box. A line
 * therefore grows only where a formula would otherwise reach its edge; a formula that breaks
 * across lines keeps the clearance on each of them, and plain rows keep their height.
 */
export const FRACTION_CHOICE_CSS = `.tb-problem .${CHOICE_ROW_CLASS} .katex .katex-base{margin-block:${CHOICE_FORMULA_CLEARANCE_EM}em}`;

const STRUT =
  /<span class="katex-strut" style="height:([0-9.]+)em;(?:vertical-align:(-?[0-9.]+)em;)?"><\/span>/g;

/** How far the formulas in rendered HTML reach above and below the baseline, in KaTeX em. */
export function formulaExtentEm(html: string): { up: number; down: number } {
  let up = 0;
  let down = 0;
  for (const [, height, shift] of html.matchAll(STRUT)) {
    const depth = shift ? -Number(shift) : 0;
    up = Math.max(up, Number(height) - depth);
    down = Math.max(down, depth);
  }
  return { up, down };
}

export function hasTallFormula(html: string): boolean {
  const { up, down } = formulaExtentEm(html);
  return up > TALL_FORMULA_EM.up || down > TALL_FORMULA_EM.down;
}

const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g;
const VOID = new Set(["br", "hr", "img"]);

interface Line {
  start: number;
  end: number;
}

/**
 * The lines of the top-level paragraphs: the pieces between the `<br>`s that sit directly in a
 * `<p>`. Both ends of a piece are at the paragraph's own depth, so every piece is balanced and a
 * row tag can enclose it; a break inside emphasis stays inside its piece.
 */
function paragraphLines(html: string): Line[] | null {
  const lines: Line[] = [];
  let depth = 0;
  let lineStart = -1;
  for (const tag of html.matchAll(TAG)) {
    const name = tag[2].toLowerCase();
    const at = tag.index;
    const after = at + tag[0].length;
    if (name === "br") {
      if (lineStart >= 0 && depth === 1) {
        lines.push({ start: lineStart, end: at });
        lineStart = after;
      }
      continue;
    }
    if (VOID.has(name) || tag[3]) continue;
    if (!tag[1]) {
      if (name === "p" && depth === 0) lineStart = after;
      depth++;
      continue;
    }
    depth--;
    if (depth < 0) return null;
    if (name === "p" && depth === 0 && lineStart >= 0) {
      lines.push({ start: lineStart, end: at });
      lineStart = -1;
    }
  }
  return depth === 0 ? lines : null;
}

const LEADING_MARK = new RegExp(`^[ \\t\\n]*([${BODY_CHOICE_MARKS}])`);

/**
 * Marks the choice lines of a rendered prompt as rows when at least one of them is tall.
 *
 * `choiceCount` is the shared parser's count for the same content. The rows must be the lines
 * that open with the marks from the first one on, in order, and as many as the parser found;
 * any other shape is returned untouched.
 */
export function fractionChoiceRows(html: string, choiceCount: number): string {
  if (choiceCount < 2 || choiceCount > BODY_CHOICE_MARKS.length) return html;
  const lines = paragraphLines(html);
  if (!lines) return html;
  const rows: Line[] = [];
  for (const line of lines) {
    const mark = LEADING_MARK.exec(html.slice(line.start, line.end))?.[1];
    if (!mark) continue;
    if (mark !== BODY_CHOICE_MARKS[rows.length]) return html;
    rows.push(line);
  }
  if (rows.length !== choiceCount) return html;
  if (!rows.some((row) => hasTallFormula(html.slice(row.start, row.end))))
    return html;
  let out = "";
  let at = 0;
  rows.forEach((row, index) => {
    out += `${html.slice(at, row.start)}<span class="${CHOICE_ROW_CLASS}" data-choice-row="${index + 1}">${html.slice(row.start, row.end)}</span>`;
    at = row.end;
  });
  return out + html.slice(at);
}
