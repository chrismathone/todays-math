import { displayWidth } from "@/lib/math/displayWidth";
import { tokenizeMath } from "@/lib/math/segments";

export interface PracticeProblemList {
  introduction: string;
  items: string[];
  compact: boolean;
}

/**
 * Recognize a trailing list of complete formulas, never comma-separated pieces
 * inside a formula. Thus coordinates, function arguments, thousands separators,
 * sets and matrices stay exactly as authored. This is for the practice screen;
 * paper and source content continue to use their existing layout.
 */
export function practiceProblemList(
  content: string,
): PracticeProblemList | null {
  // Authored boxes, tables and lists already have an explicit layout.
  if (/^\s*(?:>|\||[-*] |\d+[.)] )/m.test(content)) return null;
  const segments = tokenizeMath(content);
  let introduction = "";

  for (let start = 0; start < segments.length; start += 1) {
    const segment = segments[start]!;
    if (segment.type === "text") {
      introduction += segment.value;
      continue;
    }
    const literal =
      segment.type === "display"
        ? `$$${segment.value}$$`
        : `$${segment.value}$`;
    // A list must follow a complete instruction, or be the entire content.
    if (introduction.trim() && !/[.?!。？！]\s*$/.test(introduction)) {
      introduction += literal;
      continue;
    }

    const items: string[] = [];
    let expectFormula = true;
    let valid = true;
    for (let index = start; index < segments.length; index += 1) {
      const part = segments[index]!;
      if (part.type !== "text") {
        if (!expectFormula) {
          valid = false;
          break;
        }
        items.push(
          part.type === "display" ? `$$${part.value}$$` : `$${part.value}$`,
        );
        expectFormula = false;
      } else if (index === segments.length - 1 && !part.value.trim()) {
        // Keep an optional trailing newline out of the math item.
      } else if (
        !expectFormula &&
        (/^\s*[,，;；]\s*$/.test(part.value) || /^\s*\n\s*$/.test(part.value))
      ) {
        expectFormula = true;
      } else {
        valid = false;
        break;
      }
    }
    if (valid && !expectFormula && items.length >= 2) {
      return {
        introduction: introduction.trim(),
        items,
        // Short numbers/fractions can share a row; expressions get a full row.
        compact: items.every((item) => displayWidth(item) <= 8),
      };
    }
    introduction += literal;
  }
  return null;
}
