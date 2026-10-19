/** Narrow authoring aid for lost backslashes; neither a TeX parser nor a math proof. */
function escaped(text, index) {
  let slashes = 0;
  for (let i = index - 1; i >= 0 && text[i] === '\\'; i--) slashes++;
  return slashes % 2 === 1;
}
function maskLiteralText(math) {
  // Regex indices and the diagnostic offsets both use UTF-16 code units.
  const chars = math.split('');
  const command = /\\(?:text|texttt|textrm|textsf|mathrm|operatorname)\s*\{/gu;
  for (const match of math.matchAll(command)) {
    let depth = 1, end = match.index + match[0].length;
    for (; end < math.length && depth; end++) {
      if (!escaped(math, end)) {
        if (math[end] === '{') depth++;
        if (math[end] === '}') depth--;
      }
    }
    if (!depth) for (let i = match.index; i < end; i++) chars[i] = ' ';
  }
  return chars.join('');
}
export function unescapedMathCommandWarnings(text) {
  const warnings = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '$' || escaped(text, i)) continue;
    const delimiter = text.startsWith('$$', i) ? '$$' : '$';
    const start = i + delimiter.length;
    let end = start;
    while (end < text.length && !(text.startsWith(delimiter, end) && !escaped(text, end))) end++;
    if (end === text.length) break;
    const math = maskLiteralText(text.slice(start, end));
    const lost = /(?<![A-Za-z\\])(?:sqrt(?=\s*[0-9A-Za-z{])|(?:dfrac|tfrac|frac)(?=\s*\{)|(?:ldots|cdots)\b)/gu;
    for (const match of math.matchAll(lost)) warnings.push({token:match[0],offset:start+match.index,delimiter});
    i = end + delimiter.length - 1;
  }
  return warnings;
}
