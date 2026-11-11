/**
 * Mathgen's AI sanitizeText/sanitizeAnswer stage, used by intake.
 * Keep source notation here; sizing, geometry labels and Hangul extraction belong
 * to textPreprocess. Repairs require structural evidence, not English keywords.
 */
import { reviveEscapedStyleLeak } from "./escapedStyleLeak";
import { canonicalCircled } from "./circledNumber";
import {
  KATEX_COMMAND_NAMES,
  KATEX_INFIX_NAMES,
} from "./katexCommands.generated";

// `\\displaystyle` is what an escaped editor save leaves in prose; one leftover
// backslash is as visible as the command, so the whole run goes.
const STYLE =
  /\\+(?:displaystyle|textstyle|scriptstyle|scriptscriptstyle|limits|nolimits)\b[ \t]*/g;
const INLINE = /(?<![\\$])\$(?!\$)[^$\n]+(?<!\\)\$(?!\$)/;
const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;
const HANGUL_START = /^[ \t]*[가-힣ㄱ-ㅎㅏ-ㅣ]/;
const SIZED_DELIMITER = /\\(?:left|right|bigg?[lrm]?|Bigg?[lrm]?)\s*$/;
const SIZED_PROSE =
  /\\left[ \t]*([([|])((?:(?!\\right)[^$\\\n])*[가-힣ㄱ-ㅎㅏ-ㅣ](?:(?!\\right)[^$\\\n])*)\\right[ \t]*([)\]|])/g;
// `\[a,b\]` (and half-open `\[a,b)`, `(a,b\]`) is Markdown-escaped interval
// notation: two short operands, no relation. A display holding only "a, b"
// would say nothing, and turning it into `$$a,b$$` erased the brackets.
const INTERVAL_OPERAND = String.raw`(?:[^,[\]()$\n\\=<>가-힣ㄱ-ㅎㅏ-ㅣ]|\\[A-Za-z]+){1,24}`;
const INTERVAL = new RegExp(
  String.raw`(\\\[|\()(${INTERVAL_OPERAND},${INTERVAL_OPERAND})(\\\]|\))`,
  "y",
);
type Delimiter = "$" | "$$" | "\\(" | "\\[";
const CLOSER: Record<Delimiter, string> = {
  $: "$",
  $$: "$$",
  "\\(": "\\)",
  "\\[": "\\]",
};
const isDisplay = (delimiter: string) =>
  delimiter === "$$" || delimiter === "\\[" || delimiter === "\\]";
const EMPTY_KATEX_PLACEHOLDER =
  /^(?:<span\b[^>]*\bdata-katex-id\s*=\s*["'][^"']+["'][^>]*>\s*<\/span>|&lt;span\b[^&]*data-katex-id\s*=\s*(?:&quot;|["'])[^&"']+(?:&quot;|["'])[^&]*&gt;\s*&lt;\/span&gt;)$/i;
const PROTECTED_SPAN =
  /```[\s\S]*?```|`[^`\n]*`|<(svg|table|pre|code)\b[^>]*>[\s\S]*?<\/\1\s*>|!?\[[^\]\n]*\]\([^\n]*?\)|<span\b[^>]*data-katex-id[^>]*>\s*<\/span>|&lt;span\b[^&]*data-katex-id\s*=\s*(?:&quot;|["'])[^&"']+(?:&quot;|["'])[^&]*&gt;\s*&lt;\/span&gt;|<[^>\n]+>/gi;

function escaped(text: string, index: number): boolean {
  let slashes = 0;
  while (index > 0 && text[--index] === "\\") slashes++;
  return slashes % 2 === 1;
}

function lastUnescaped(text: string, token: string): number {
  let at = text.lastIndexOf(token);
  while (at >= 0 && escaped(text, at)) at = text.lastIndexOf(token, at - 1);
  return at;
}

/** An unescaped delimiter that can close a formula, starting at `at`. */
function closerAt(text: string, at: number): string {
  if (at >= text.length || escaped(text, at)) return "";
  if (text.startsWith("$$", at)) return "$$";
  if (text[at] === "$") return "$";
  if (text.startsWith("\\)", at) || text.startsWith("\\]", at))
    return text.slice(at, at + 2);
  return "";
}

/** Is the `\)` or `\]` at `at` a Markdown-escaped bracket rather than a closer? */
function escapedLiteralBracket(text: string, at: number): boolean {
  const lineHead = text.slice(text.lastIndexOf("\n", at - 1) + 1, at);
  if (/^[ \t>]*\d{1,9}$/.test(lineHead)) return true;
  let open = 0;
  for (let k = 0; k < lineHead.length; k++) {
    const ch = lineHead[k];
    if (ch !== "(" && ch !== ")" && ch !== "[" && ch !== "]") continue;
    // `\(` `\[` are delimiters, not brackets; `\)` `\]` close what is open.
    if (lineHead[k - 1] === "\\" && (ch === "(" || ch === "[")) continue;
    open += ch === "(" || ch === "[" ? 1 : -1;
    if (open < 0) open = 0;
  }
  return open > 0;
}

/**
 * A display opener alone at the end of its line: the formula is the following
 * non-blank lines, as long as each one is wholly formula. Returns the end of
 * the last such line, or -1.
 */
function displayBlockEnd(text: string, at: number): number {
  let end = -1;
  while (text[at] === "\n" || text[at] === "\r") {
    const lineStart = at + (text.startsWith("\r\n", at) ? 2 : 1);
    let lineEnd = lineStart;
    while (lineEnd < text.length && !/[\r\n]/.test(text[lineEnd])) lineEnd++;
    const line = text.slice(lineStart, lineEnd);
    if (!line.trim() || /[$가-힣ㄱ-ㅎㅏ-ㅣ]/.test(line)) break;
    const runStart = lineStart + line.length - line.trimStart().length;
    const runEnd = mathRunEnd(text, runStart, 0, true);
    if (runEnd === runStart || !/^[ \t.,:]*$/.test(text.slice(runEnd, lineEnd)))
      break;
    end = at = lineEnd;
  }
  return end;
}

/**
 * Transform text/math separately, without interpreting code, images or HTML.
 *
 * This is also the one place that knows whether a delimiter opens or closes,
 * so the structural repairs live here, each on evidence in the source:
 * - a bogus outer display around prose that holds its own inline math
 *   (`\displaystyle $$이동 거리= $x…$`, at a line head or mid-line);
 * - an opener with no closer: close it where its formula ends, or drop it
 *   when no formula follows — never leave a lone delimiter on paper;
 * - mismatched pairs (`\(x$`, `\[x$$`, `$$x\]`) and stray `\)` `\]`;
 * - Markdown-escaped interval notation `\[a,b\]`, whose brackets are content.
 */
function mapSpans(
  text: string,
  prose: (s: string) => string,
  math: (s: string) => string,
): string {
  const protectedSpans = [...text.matchAll(PROTECTED_SPAN)];
  let protectedIndex = 0;
  let out = "";
  let plainStart = 0;
  // The closing delimiter of a bogus outer display, dropped with its opener.
  let dropAt = -1;
  let dropLength = 0;
  const emit = (end: number, replacement: string, next: number) => {
    out += prose(text.slice(plainStart, end)) + replacement;
    plainStart = next;
    return next;
  };
  for (let i = 0; i < text.length;) {
    const protectedSpan = protectedSpans[protectedIndex];
    if (protectedSpan && protectedSpan.index! < i) {
      protectedIndex++;
      continue;
    }
    if (protectedSpan?.index === i) {
      i = emit(
        i,
        EMPTY_KATEX_PLACEHOLDER.test(protectedSpan[0]) ? "" : protectedSpan[0],
        i + protectedSpan[0].length,
      );
      protectedIndex++;
      continue;
    }
    if (dropAt >= 0 && i > dropAt) dropAt = -1;
    if (i === dropAt) {
      i = emit(i, "", i + dropLength);
      dropAt = -1;
      continue;
    }
    const ch = text[i];
    const unescaped = (ch === "\\" || ch === "$") && !escaped(text, i);
    const slash =
      ch === "\\" &&
      unescaped &&
      /[()[\]]/.test(text[i + 1] ?? "") &&
      !SIZED_DELIMITER.test(text.slice(plainStart, i));
    if (
      (slash && text[i + 1] === "[") ||
      (ch === "(" && text[i - 1] !== "\\")
    ) {
      INTERVAL.lastIndex = i;
      const interval = INTERVAL.exec(text);
      if (
        interval &&
        (interval[1] !== "(" || interval[3] !== ")") &&
        /[0-9A-Za-z]/.test(interval[2])
      ) {
        const open = interval[1].slice(-1);
        const close = interval[3].slice(-1);
        i = emit(
          i,
          `$${open}${math(interval[2])}${close}$`,
          i + interval[0].length,
        );
        continue;
      }
    }
    if (slash && (text[i + 1] === ")" || text[i + 1] === "]")) {
      // A matched closer leaves with its opener; this one closes nothing —
      // unless it is an escaped literal bracket: the problem parser writes a
      // line-head `1)` as `1\)` so Markdown won't start a list, and `(가\)`
      // or `[0, 1\)` close a bracket that is open in the same line.
      if (!escapedLiteralBracket(text, i)) {
        i = emit(i, "", i + 2);
        continue;
      }
      i += 2;
      continue;
    }
    let open: Delimiter;
    if (slash) open = text.slice(i, i + 2) as Delimiter;
    else if (ch === "$" && unescaped) {
      let run = 1;
      while (text[i + run] === "$") run++;
      // `$$$` cannot open anything; `$$A$$$B$` closes before it gets here.
      if (run >= 3) {
        i = emit(i, "", i + run - 2);
        continue;
      }
      open = run === 2 ? "$$" : "$";
    } else {
      i++;
      continue;
    }
    const bodyStart = i + open.length;
    const closer = CLOSER[open];
    if (isDisplay(open)) {
      let lineEnd = bodyStart;
      while (
        lineEnd < text.length &&
        text[lineEnd] !== "\n" &&
        text[lineEnd] !== "\r"
      )
        lineEnd++;
      const tail = text.slice(bodyStart, lineEnd);
      // A real display holding Hangul closes before any inline pair; a bogus
      // one closes after it (`…= $x$$$` ends the inline pair, then the display).
      const close = lastUnescaped(tail, closer);
      if (
        HANGUL_START.test(tail) &&
        INLINE.test(close < 0 ? tail : tail.slice(0, close))
      ) {
        i = emit(i, "", bodyStart);
        if (close >= 0) {
          dropAt = bodyStart + close;
          dropLength = closer.length;
        }
        continue;
      }
    }
    let end = text.indexOf(closer, bodyStart);
    // Once inside inline math, the next unescaped dollar closes that span.
    // In $A$$B$, the following dollar belongs to B; skipping A's closer sends
    // B's LaTeX into prose and protectLooseLatex adds dollars on every pass.
    while (end >= 0 && escaped(text, end)) {
      end = text.indexOf(closer, end + closer.length);
    }
    // `\( … $ … \)`: the dollar closed the slash opener, the `\)` is another's.
    if (slash && end >= 0 && /(?<!\\)\$/.test(text.slice(bodyStart, end)))
      end = -1;
    if (end >= 0) {
      const inner = text.slice(bodyStart, end);
      const next = end + closer.length;
      const bracketedProse =
        slash && HANGUL.test(inner) && !/[\\$=^_]/.test(inner);
      if (!inner.trim()) i = emit(i, "", next);
      // A whole-line sentence in `\[…\]` is a bogus display, not a bracketed
      // label like `\[참고\]`: drop both delimiters and read the sentence.
      else if (
        bracketedProse &&
        open === "\\[" &&
        HANGUL_START.test(inner) &&
        /[.?!][ \t]*$/.test(inner) &&
        /^[ \t]*(?:>[ \t]*)?(?:\d+\.[ \t]*)?$/.test(
          text.slice(text.lastIndexOf("\n", i - 1) + 1, i).replace(STYLE, ""),
        ) &&
        /^[ \t]*(?:\r?\n|$)/.test(text.slice(next))
      ) {
        i = emit(i, "", bodyStart);
        dropAt = end;
        dropLength = closer.length;
      }
      // Escaped prose brackets are not a mathematical display delimiter.
      else if (bracketedProse) i = emit(i, text.slice(i, next), next);
      else {
        const delimiter = isDisplay(open) ? "$$" : "$";
        i = emit(i, delimiter + math(inner) + delimiter, next);
      }
      continue;
    }
    // No closer. Whatever follows decides: a formula is closed where it ends
    // (or at a mismatched closer), anything else means the opener was noise.
    // Spaces only: a tab may be the JSON-damaged `\t` of `\theta`.
    let runStart = bodyStart;
    while (text[runStart] === " ") runStart++;
    if (
      isDisplay(open) &&
      (runStart >= text.length || /[\r\n]/.test(text[runStart]))
    ) {
      const blockEnd = displayBlockEnd(text, runStart);
      if (blockEnd >= 0) {
        i = emit(i, `$$${math(text.slice(bodyStart, blockEnd))}\n$$`, blockEnd);
        continue;
      }
      const lineHead = text.slice(text.lastIndexOf("\n", i - 1) + 1, i);
      const lineBreak = text.slice(runStart).match(/^\r?\n/)?.[0] ?? "";
      i = emit(
        i,
        "",
        /^[ \t]*$/.test(lineHead) ? runStart + lineBreak.length : bodyStart,
      );
      continue;
    }
    const runEnd = mathRunEnd(text, runStart, 0, true);
    let after = runEnd;
    while (text[after] === " " || text[after] === "\t") after++;
    const mismatch = closerAt(text, after);
    const formula = text.slice(runStart, runEnd);
    if (!formula) {
      i = emit(i, "", mismatch ? after + mismatch.length : bodyStart);
      continue;
    }
    // `$5` is a price, not an unclosed formula — keep it as written.
    if (open === "$" && !mismatch && /^\d[\d,]*(?:\.\d+)?$/.test(formula)) {
      i++;
      continue;
    }
    const delimiter =
      isDisplay(open) && (!mismatch || isDisplay(mismatch)) ? "$$" : "$";
    i = emit(
      i,
      delimiter + math(formula) + delimiter,
      mismatch ? after + mismatch.length : runEnd,
    );
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

// JSON turned `\f` `\t` `\b` `\r` into control characters (`\frac` → FF + "rac").
const CONTROL_LETTER: Record<string, string> = {
  "\f": "f",
  "\t": "t",
  "\x08": "b",
  "\r": "r",
};

/**
 * End of the formula starting at `start`: commands KaTeX knows, variables,
 * numbers, operators and balanced groups — never English words or Hangul.
 * `controlDamage` reads a JSON-damaged command as the command; only callers
 * that pass the run through `fixLatexEscaping(…, true)` may ask for it.
 */
function mathRunEnd(
  text: string,
  start: number,
  openBraces = 0,
  controlDamage = false,
): number {
  const environment = text.slice(start).match(/^\\begin\{([A-Za-z*]+)\}/);
  if (environment) {
    const closer = `\\end{${environment[1]}}`;
    const end = text.indexOf(closer, start + environment[0].length);
    return end < 0 ? start : end + closer.length;
  }
  let i = start;
  // A prefix like `A^{` already opened a group; the run must reach its `}`.
  let braces = openBraces;
  // `\,dt` — after a math space, a `d` + variable is a differential, not English.
  let afterSpacing = false;
  for (; i < text.length;) {
    const ch = text[i];
    if (ch === "\\") {
      const command = text
        .slice(i)
        .match(/^\\(?:[A-Za-z]+|[()[\]{},;:!%#&_ |\\])/);
      if (
        !command ||
        (!braces && command[0].length > 2 && !isKnownCommand(command[0])) ||
        // `\(` `\)` `\[` `\]` delimit a formula unless a sizer owns them.
        (!braces &&
          /^\\[()[\]]$/.test(command[0]) &&
          !SIZED_DELIMITER.test(text.slice(start, i)))
      )
        break;
      i += command[0].length;
      afterSpacing = /^\\[,;:! ]$/.test(command[0]);
      continue;
    }
    const damaged = controlDamage ? CONTROL_LETTER[ch] : undefined;
    if (damaged) {
      const stem = text.slice(i + 1).match(/^[A-Za-z]+/)?.[0];
      if (stem && isKnownCommand(`\\${damaged}${stem}`)) {
        i += 1 + stem.length;
        afterSpacing = false;
        continue;
      }
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
      if (
        word.length > 1 &&
        !/^[A-Z]{2,3}$/.test(word) &&
        !(afterSpacing && /^d[A-Za-z]$/.test(word))
      )
        break;
      i += word.length;
      afterSpacing = false;
      continue;
    }
    if (!/[0-9 \t()[\]+\-*/=<>|^_.,:°′″]/.test(ch)) break;
    if (ch !== " " && ch !== "\t") afterSpacing = false;
    i++;
  }
  // Never introduce a new unmatched group around bad input.
  if (braces) return start;
  // Never hide punctuation — but the `,` of `\,` is a command, not punctuation;
  // trimming it left `\` behind to escape the closing dollar (`v(t)\$,dt`).
  let end = i;
  while (
    end > start &&
    /[ \t.,:]/.test(text[end - 1]) &&
    !(text[end - 2] === "\\" && !escaped(text, end - 2))
  )
    end--;
  return end;
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
      !isKnownCommand(match[0])
    )
      continue;
    const before = text.slice(last, commandStart);
    // Keep problem/choice numbers outside. Pull in only an adjacent math prefix
    // with an operator (e.g. 5 - \frac or x=\sqrt), not English words/quantities
    // — or the left operand of a relation/binary command (0 \le t, a \ne 0), or
    // a quantity before a math space (8\,\mathrm{m}).
    const prefix =
      before.match(
        /(?<![A-Za-z0-9])(?:[A-Za-z]|\d+(?:\.\d+)?)[ \t]*[=+*/^-][ \t]*(?:[()[\]{}][ \t]*)?$/,
      )?.[0] ??
      (INFIX_COMMANDS.has(match[0].slice(1))
        ? before.match(
            /(?<![A-Za-z0-9\\_^])(?:[A-Za-z]|\d+(?:\.\d+)?)[ \t]*$/,
          )?.[0]
        : undefined) ??
      before.match(
        /(?<![A-Za-z0-9\\_^])(?:[A-Za-z]|\d+(?:\.\d+)?)?(?:\\[,;:!])+[ \t]*$/,
      )?.[0] ??
      "";
    const end = mathRunEnd(
      text,
      commandStart,
      /\{[ \t]*$/.test(prefix) ? 1 : 0,
    );
    if (end === commandStart) continue;
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
// The hand list above (kept for textPreprocess, which shares it) knew 140 names;
// every other command KaTeX draws leaked as raw text when it stood alone.
const KATEX_COMMANDS = new Set(KATEX_COMMAND_NAMES.trim().split(/\s+/));
const INFIX_COMMANDS = new Set(KATEX_INFIX_NAMES.trim().split(/\s+/));

/** `command` includes its backslash. */
function isKnownCommand(command: string): boolean {
  return KATEX_COMMANDS.has(command.slice(1)) || KNOWN_COMMAND.test(command);
}

export function normalizeMathgenText(text: string): string {
  if (!text) return text;
  // 편집 칸이 굳혀 저장한 `\\displaystyle \$\$…` 를 먼저 되살린다 — 편집기만 되살리면 해설 읽기·정답지는
  // 역슬래시와 달러를 그린다(모든 화면 일치, 2026-09-26). 되살린 뒤엔 대상이 없어 멱등이다.
  return mapSpans(
    reviveEscapedStyleLeak(text),
    (prose) => {
      const fixed = fixLatexEscaping(prose, false)
        .replace(STYLE, "")
        // Sizing delimiters around a Hangul word are plain parentheses; as math
        // they were cut in half at the Hangul (`$\left($넓이$\right)$`).
        .replace(SIZED_PROSE, "$1$2$3")
        .replace(/(?<!\\)\\n\\n/g, "\n\n")
        // 해설의 줄머리 «step2)» 앞 글자 그대로의 `\n` — 영문자가 뒤따라 아래 규칙(`\neq` 같은 명령을
        // 살린다)이 건너뛰었다. 2026-11-11 시연 해설 19개 중 8개가 «…이다.\nstep2)»로 찍혔다.
        .replace(/(?<!\\)\\n(?=step\d)/g, "\n")
        .replace(/(?<!\\)\\n(?![A-Za-z])/g, "\n")
        .replace(/(?<!\\)\\t(?![A-Za-z])/g, "\t");
      return protectLooseLatex(fixed);
    },
    // `\(` `\)` are not KaTeX commands: inside math they are only parentheses —
    // except inside a text-mode group, where KaTeX draws `\(…\)` as inline math
    // (the renderer moves nested `$x$` there; unwrapping it broke idempotence).
    (math) =>
      outsideTextGroups(fixLatexEscaping(math, true), (part) =>
        part.replace(/(?<!\\)((?:\\\\)*)\\([()])/g, "$1$2"),
      ),
  );
}

const TEXT_GROUP = /\\(?:text(?:rm|bf|it|sf|tt|up|md|normal)?|mbox|hbox)\s*\{/g;

/** Apply `fn` to the parts of a formula that are not inside `\text{…}`-like groups. */
function outsideTextGroups(math: string, fn: (part: string) => string): string {
  let out = "";
  let last = 0;
  TEXT_GROUP.lastIndex = 0;
  for (let match; (match = TEXT_GROUP.exec(math));) {
    let depth = 1;
    let end = TEXT_GROUP.lastIndex;
    for (; end < math.length && depth > 0; end++) {
      const ch = math[end];
      if (ch === "\\") end++;
      else if (ch === "{") depth++;
      else if (ch === "}") depth--;
    }
    if (depth > 0) break;
    out += fn(math.slice(last, match.index)) + math.slice(match.index, end);
    last = end;
    TEXT_GROUP.lastIndex = end;
  }
  return out + fn(math.slice(last));
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
