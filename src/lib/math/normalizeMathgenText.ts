/**
 * Mathgen's AI sanitizeText/sanitizeAnswer stage, shared by intake and rendering.
 * Keep source notation here; sizing, geometry labels and Hangul extraction belong
 * to textPreprocess. Repairs require structural evidence, not English keywords.
 */
import { canonicalCircled } from "./circledNumber";

const STYLE =
  /\\(?:displaystyle|textstyle|scriptstyle|scriptscriptstyle|limits|nolimits)\b[ \t]*/g;
const INLINE = /(?<![\\$])\$(?!\$)[^$\n]+(?<!\\)\$(?!\$)/;
const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;
const EMPTY_KATEX_PLACEHOLDER =
  /^(?:<span\b[^>]*\bdata-katex-id\s*=\s*["'][^"']+["'][^>]*>\s*<\/span>|&lt;span\b[^&]*data-katex-id\s*=\s*(?:&quot;|["'])[^&"']+(?:&quot;|["'])[^&]*&gt;\s*&lt;\/span&gt;)$/i;
const PROTECTED_SPAN =
  /```[\s\S]*?```|`[^`\n]*`|<(svg|table|pre|code)\b[^>]*>[\s\S]*?<\/\1\s*>|!?\[[^\]\n]*\]\([^\n]*?\)|<span\b[^>]*data-katex-id[^>]*>\s*<\/span>|&lt;span\b[^&]*data-katex-id\s*=\s*(?:&quot;|["'])[^&"']+(?:&quot;|["'])[^&]*&gt;\s*&lt;\/span&gt;|<[^>\n]+>/gi;

function escaped(text: string, index: number): boolean {
  let slashes = 0;
  while (index > 0 && text[--index] === "\\") slashes++;
  return slashes % 2 === 1;
}

/** A bogus outer display around prose containing its own inline math. */
export function repairProsePrefixedInlineMath(text: string): string {
  // Do not unwrap a real display containing \text{한글}, or literal brackets.
  const protectedSpans = [...text.matchAll(PROTECTED_SPAN)];
  return text.replace(
    /(^|\n)([ \t]*(?:\\(?:displaystyle|textstyle|scriptstyle|scriptscriptstyle)\b[ \t]*)?(?:\d+\.[ \t]*)?)(\\\[|\$\$)([^\n]*)/g,
    (
      whole,
      start: string,
      prefix: string,
      opener: string,
      tail: string,
      offset: number,
    ) => {
      if (
        protectedSpans.some(
          (span) =>
            offset >= span.index! && offset < span.index! + span[0].length,
        )
      )
        return whole;
      if (!/^[ \t]*[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(tail) || !INLINE.test(tail))
        return whole;
      const closer = opener === "\\[" ? "\\]" : "$$";
      // A closing outer delimiter, if present, must follow the inline pair.
      const close = tail.lastIndexOf(closer);
      if (close >= 0 && !INLINE.test(tail.slice(0, close))) return whole;
      const body =
        close >= 0
          ? tail.slice(0, close) + tail.slice(close + closer.length)
          : tail;
      return start + prefix.replace(STYLE, "") + body;
    },
  );
}

/** Transform text/math separately, without interpreting code, images or HTML. */
function mapSpans(
  text: string,
  prose: (s: string) => string,
  math: (s: string) => string,
): string {
  const protectedSpans = [...text.matchAll(PROTECTED_SPAN)];
  let protectedIndex = 0;
  let out = "";
  let plainStart = 0;
  for (let i = 0; i < text.length;) {
    const protectedSpan = protectedSpans[protectedIndex];
    if (protectedSpan && protectedSpan.index! < i) {
      protectedIndex++;
      continue;
    }
    if (protectedSpan?.index === i) {
      out +=
        prose(text.slice(plainStart, i)) +
        (EMPTY_KATEX_PLACEHOLDER.test(protectedSpan[0])
          ? ""
          : protectedSpan[0]);
      i += protectedSpan[0].length;
      plainStart = i;
      protectedIndex++;
      continue;
    }
    const dollar = text[i] === "$" && !escaped(text, i);
    const slashDelimiter =
      text[i] === "\\" &&
      !escaped(text, i) &&
      /[([]/.test(text[i + 1] ?? "") &&
      !/\\(?:left|right|bigg?[lrm]?|Bigg?[lrm]?)\s*$/.test(
        text.slice(plainStart, i),
      );
    if (!dollar && !slashDelimiter) {
      i++;
      continue;
    }
    const open = dollar
      ? text.startsWith("$$", i)
        ? "$$"
        : "$"
      : text.slice(i, i + 2);
    const close = open === "\\[" ? "\\]" : open === "\\(" ? "\\)" : open;
    let end = text.indexOf(close, i + open.length);
    while (
      end >= 0 &&
      (escaped(text, end) || (open === "$" && text[end + 1] === "$"))
    ) {
      end = text.indexOf(close, end + close.length);
    }
    if (end < 0) {
      i += open.length;
      continue;
    }
    const inner = text.slice(i + open.length, end);
    // Escaped prose brackets are not a mathematical display delimiter.
    if (slashDelimiter && HANGUL.test(inner) && !/[\\$=^_]/.test(inner)) {
      out +=
        prose(text.slice(plainStart, i)) + text.slice(i, end + close.length);
    } else {
      const delimiter = open === "\\[" ? "$$" : open === "\\(" ? "$" : open;
      out +=
        prose(text.slice(plainStart, i)) + delimiter + math(inner) + delimiter;
    }
    i = end + close.length;
    plainStart = i;
  }
  return out + prose(text.slice(plainStart));
}

function normalizeCircledMarkers(text: string): string {
  return text.replace(
    /\\textcircled\{(\d+|[가나다라마바사아자차카타파하ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ])\}/g,
    (whole, value: string) => {
      if (/^\d+$/.test(value)) return canonicalCircled(Number(value)) ?? whole;
      const syllable = "가나다라마바사아자차카타파하".indexOf(value);
      if (syllable >= 0) return String.fromCodePoint(0x326e + syllable);
      return String.fromCodePoint(
        0x3260 + "ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ".indexOf(value),
      );
    },
  );
}

function fixLatexEscaping(text: string, inMath: boolean): string {
  let out = text
    .replace(/\f(?=rac\s*\{)/g, "\\f")
    .replace(/\t(?=imes\b|ext\s*\{)/g, "\\t")
    .replace(/\x08(?=(?:inom|ar|oxed|egin|ig|oldsymbol)\b)/g, "\\b")
    .replace(
      /(?<![A-Za-z\\])(?:d?frac|sqrt)(?=\s*\{)/g,
      (command) => `\\${command}`,
    );
  if (inMath) {
    // Newlines and tabs in ordinary prose are whitespace, even before English.
    out = out
      .replace(/\t(?=(?:imes|heta|an|ext|frac|o|riangle)\b)/g, "\\t")
      .replace(/\r(?=(?:ho|ight|angle|ceil|floor)\b)/g, "\\r")
      .replace(/\n(?=(?:abla|eq|e|otin|u)\b)/g, "\\n");
  }
  return normalizeCircledMarkers(out);
}

function mathRunEnd(text: string, start: number): number {
  const environment = text.slice(start).match(/^\\begin\{([A-Za-z*]+)\}/);
  if (environment) {
    const closer = `\\end{${environment[1]}}`;
    const end = text.indexOf(closer, start + environment[0].length);
    return end < 0 ? start : end + closer.length;
  }
  let i = start;
  let braces = 0;
  for (; i < text.length;) {
    const ch = text[i];
    if (ch === "\\") {
      const command = text
        .slice(i)
        .match(/^\\(?:[A-Za-z]+|[()[\]{},;:!%#&_ |\\])/);
      if (
        !command ||
        (!braces && command[0].length > 2 && !KNOWN_COMMAND.test(command[0]))
      )
        break;
      i += command[0].length;
      continue;
    }
    if (ch === "{") {
      braces++;
      i++;
      continue;
    }
    if (ch === "}" && braces) {
      braces--;
      i++;
      continue;
    }
    if (braces) {
      i++;
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      const word = text.slice(i).match(/^[A-Za-z]+/)![0];
      // A standalone variable/geometry label is evidence; English prose isn't.
      if (word.length > 1 && !/^[A-Z]{2,3}$/.test(word)) break;
      i += word.length;
      continue;
    }
    if (!/[0-9 \t()[\]+\-*/=<>|^_.,:]/.test(ch)) break;
    i++;
  }
  // Never hide punctuation or introduce a new unmatched group around bad input.
  return braces
    ? start
    : start + text.slice(start, i).replace(/[ \t.,:]+$/, "").length;
}

/** Mathgen's line wrap + balanced-token fallback, stopping at prose/choices. */
function protectLooseLatex(text: string): string {
  let out = "";
  let last = 0;
  for (const match of text.matchAll(/\\[A-Za-z]+/g)) {
    const commandStart = match.index!;
    if (
      commandStart < last ||
      escaped(text, commandStart) ||
      !KNOWN_COMMAND.test(match[0])
    )
      continue;
    const end = mathRunEnd(text, commandStart);
    if (end === commandStart) continue;
    const before = text.slice(last, commandStart);
    // Keep problem/choice numbers outside. Pull in only an adjacent math prefix
    // with an operator (e.g. 5 - \frac or x=\sqrt), not English words/quantities.
    const prefix =
      before.match(
        /(?<![A-Za-z0-9])(?:[A-Za-z]|\d+(?:\.\d+)?)[ \t]*[=+*/^-][ \t]*(?:[()[\]{}][ \t]*)?$/,
      )?.[0] ?? "";
    const start = commandStart - prefix.length;
    out += text.slice(last, start) + `$${text.slice(start, end)}$`;
    last = end;
  }
  return out + text.slice(last);
}

export const LATEX_WRAP_TRIGGER_SOURCE =
  "\\\\(?:displaystyle|textstyle|scriptstyle|d?frac|tfrac|cfrac|sqrt|left|right|" +
  "bigg?[lrm]?|Bigg?[lrm]?|d?binom|tbinom|sum|prod|coprod|int|iint|iiint|oint|" +
  "lim|limsup|liminf|cdot|times|div|pm|mp|cdots|ldots|dots|vdots|ddots|dot|vec|" +
  "ast|star|bigstar|backsim|because|therefore|big|hline|mid|middle|not|" +
  "parallel|perp|rightarrow|Rightarrow|leftrightarrow|Leftrightarrow|to|" +
  "widehat|widetilde|hat|tilde|bar|overline|underline|overrightarrow|" +
  "overleftarrow|overset|underset|overbrace|underbrace|" +
  "stackrel|begin|end|over|atop|max|min|log|ln|exp|sin|cos|tan|sec|csc|cot|" +
  "partial|nabla|alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|" +
  "lambda|mu|nu|xi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|" +
  "Lambda|Xi|Pi|Sigma|Phi|Psi|Omega|infty|cup|cap|subset|supset|subseteq|" +
  "supseteq|notin|in|neq|leq|geq|approx|equiv|cong|sim|angle|triangle|square|circ|" +
  "prime|varnothing|mathrm|mathbf|mathbb|mathcal|mathfrak|text|boxed|phantom|operatorname)\\b";

const KNOWN_COMMAND = new RegExp(`^(?:${LATEX_WRAP_TRIGGER_SOURCE})$`);

export function normalizeMathgenText(text: string): string {
  if (!text) return text;
  const repaired = repairProsePrefixedInlineMath(text);
  return mapSpans(
    repaired,
    (prose) => {
      const fixed = fixLatexEscaping(prose, false)
        .replace(STYLE, "")
        .replace(/(?<!\\)\\n\\n/g, "\n\n")
        .replace(/(?<!\\)\\n(?![A-Za-z])/g, "\n")
        .replace(/(?<!\\)\\t(?![A-Za-z])/g, "\t");
      return protectLooseLatex(fixed);
    },
    (math) => fixLatexEscaping(math, true),
  );
}

export function normalizeMathgenAnswer(text: string): string {
  return mapSpans(
    normalizeMathgenText(text),
    (prose) => {
      // Grouped quantities are ambiguous with lists; preserve the entire number.
      return prose.replace(
        /[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?|,(?=\S|$)/g,
        (match) => (match === "," ? ", " : match),
      );
    },
    (math) => math,
  );
}
