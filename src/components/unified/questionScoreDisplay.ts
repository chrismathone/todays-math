// Display-only: consume complete point labels, never numbers inside a larger equation.
// Keep image/figure markup, links, code, table rows and choice values opaque.
const TOKENS = new RegExp(
  [
    // Whole figures precede individual HTML tags so their text/attributes stay opaque.
    /<svg\b[\s\S]*?<\/svg>|<figure\b[\s\S]*?<\/figure>|<table\b[\s\S]*?<\/table>|<[^>]*>/
      .source,
    /```[^\n]*\n[\s\S]*?```|~~~[^\n]*\n[\s\S]*?~~~|`+[^`\n]*`+/.source,
    /!?\[(?:\\.|[^\]\\\n]|\[[^\]\n]*\])*\]\((?:\\.|[^)\\\n]|\([^)]*\))*\)/
      .source,
    /!?\[(?:\\.|[^\]\\\n]|\[[^\]\n]*\])*\]\[[^\]\n]*\]/.source,
    /!\[(?:\\.|[^\]\\\n]|\[[^\]\n]*\])*\]/.source,
    /^[ \t]*\[[^\]\n]+\]:[^\n]*|^[ \t]*\|[^\n]*|^[ \t]*[①-⑳][^\n]*/.source,
    /\*\*[^*\n]+\*\*|__[^_\n]+__/.source,
    /\$\$[\s\S]*?\$\$|\$(?:\\.|[^$\\\n])*\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/
      .source,
    /\[(?:\\.|[^\]\\\n])*\]/.source,
  ].join("|"),
  "gim",
);

function pointValue(token: string): string | undefined {
  const normalized = token
    .replace(/^\$+|\$+$/g, "")
    .replace(/^\\[([]|\\[)\]]$/g, "")
    .replace(/\\(?:left|right)\s*/g, "")
    .replace(/\\(?:text|mathrm|textrm)\{([^{}]*)\}/g, "$1")
    .replace(/\\[,;!: ]|\\(?:quad|qquad)\b|~/g, " ")
    .replace(/\$/g, "");
  // Bare "3점" can be a mathematical value (e.g. points earned per win).
  // Escaped brackets are also accepted as imported Markdown score labels.
  if (
    !/^\\\[[\s\S]*\\\]$/.test(token) &&
    !/^\s*\[[\s\S]*\]\s*$/.test(normalized)
  )
    return undefined;
  const value = normalized.replace(/^\s*\[|\]\s*$/g, "").trim();
  return /^(?:(?:총|배점)\s*:?\s*)?(\d+(?:\.\d+)?)\s*점$/.exec(value)?.[1];
}

/** Also used by native score placement so source figure labels cannot become scores. */
export function replaceQuestionScores(
  text: string,
  replace: (score: string) => string,
): string {
  return text.replace(TOKENS, (token) => {
    if (token.startsWith("**") || token.startsWith("__")) {
      const inside = replaceQuestionScores(token.slice(2, -2), replace);
      return inside.trim() ? token.slice(0, 2) + inside + token.slice(-2) : "";
    }
    // Only bracket/math tokens can represent point labels; all other tokens are protected.
    if (!/^(?:\[|\$|\\[([])/.test(token)) return token;
    const score = pointValue(token);
    return score === undefined ? token : replace(score);
  });
}

export const hideQuestionScores = (text: string): string =>
  replaceQuestionScores(text, () => "");
