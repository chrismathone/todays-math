/** Shared by the offline glyph build and the dependency-light display adapter. */
export const ARITHMETIC_CJK_RUN = /([ᄀ-ᇿ぀-ヿ㄰-㆏㐀-䶿一-鿿가-힯]+)/;

export interface ArithmeticLabelPart {
  text: string;
  /** Undefined means retain visible text, not an unrecognised TeX expression. */
  tex?: string;
}

/** Plain arithmetic labels use the editor's conventions: point names/words are
 * roman and single lowercase variables are italic. Explicit physical units and
 * Unicode powers/slash fractions are translated to unambiguous editor TeX.
 * Unknown syntax is retained, never evaluated or silently discarded.
 */
export function arithmeticLabelTex(
  text: string,
  unitHint = false,
): string | undefined {
  const source = text.trim();
  if (!source) return undefined;
  if (source.startsWith("$") && source.endsWith("$")) return source;
  if (/[^\dA-Za-z\s.,:;=+−\-?()/²³°πℓ∥]/.test(source)) return undefined;
  const tokens = source.match(/[A-Za-z]+|\d+(?:\.\d+)?|\s+|./g) ?? [];
  let previous = "";
  let tex = tokens
    .map((token, index) => {
      if (/^\s+$/.test(token)) return "\\,";
      const numericUnit =
        /^(?:m|g|s)$/.test(token) &&
        (unitHint ||
          /\d$/.test(previous) ||
          /^[²³]$/.test(tokens[index + 1] ?? ""));
      previous = token;
      if (/^[A-Za-z]{2,}$|^[A-Z]$/.test(token) || numericUnit)
        return `\\mathrm{${token}}`;
      return (
        {
          "²": "^{2}",
          "³": "^{3}",
          "°": "^{\\circ}",
          π: "\\pi{}",
          ℓ: "\\ell{}",
          "∥": "\\parallel{}",
          "−": "-",
        }[token] ?? token
      );
    })
    .join("");
  // The corpus's fractional quantities are n/d or nπ/d (including π/d).
  tex = tex.replace(
    /(\d+(?:\.\d+)?(?:\\pi\{\})?|\\pi\{\})\/(\d+)/g,
    "\\frac{$1}{$2}",
  );
  return `$${tex}$`;
}

export function arithmeticLabelParts(label: string): ArithmeticLabelPart[] {
  // Explicit editor TeX is one expression. Never split a command at CJK text.
  if (label.trim().startsWith("$") && label.trim().endsWith("$"))
    return [{ text: label.trim(), tex: label.trim() }];
  return label
    .trim()
    .split(ARITHMETIC_CJK_RUN)
    .filter(Boolean)
    .map((text) => ({
      text,
      tex: ARITHMETIC_CJK_RUN.test(text)
        ? undefined
        : arithmeticLabelTex(text, /(?:로|으로) 나타내기/.test(label)),
    }));
}

export const escapeTypographyXml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[char]!,
  );

export const unescapeTypographyXml = (value: string): string =>
  value.replace(
    /&(#x[\da-f]+|#\d+|quot|apos|lt|gt|amp);/gi,
    (whole, name: string) => {
      if (name.startsWith("#")) {
        const code =
          name[1].toLowerCase() === "x"
            ? parseInt(name.slice(2), 16)
            : Number(name.slice(1));
        return code > 0 &&
          code <= 0x10ffff &&
          !(code >= 0xd800 && code <= 0xdfff)
          ? String.fromCodePoint(code)
          : whole;
      }
      return (
        { quot: '"', apos: "'", lt: "<", gt: ">", amp: "&" }[name] ?? whole
      );
    },
  );
