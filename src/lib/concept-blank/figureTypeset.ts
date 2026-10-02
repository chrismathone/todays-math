// This module uses the editor's DOM-free MathJax liteAdaptor core, not
// typesetFigureSvg (which needs DOMParser). It runs during SSR and client render.
import {
  isSafeFragment,
  placeLabel,
  typesetLabel,
} from "@/components/unified/figure-editor/mathjaxLabel";

const TEXT = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
const ATTR = /([\w:-]+)\s*=\s*(["'])(.*?)\2/g;
const SUPPORTED_ATTRIBUTES = new Set([
  "x",
  "y",
  "font-size",
  "font-family",
  "font-style",
  "font-weight",
  "fill",
  "text-anchor",
  "dominant-baseline",
  "transform",
]);
const CJK = /[ᄀ-ᇿ぀-ヿ㄰-㆏㐀-䶿一-鿿가-힯]/;
const escapeAttribute = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const decodeText = (value: string) =>
  value
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (whole, code: string) => {
      const n =
        code[0].toLowerCase() === "x"
          ? parseInt(code.slice(1), 16)
          : Number(code);
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole;
    })
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

function mathLabel(text: string, bold = false, textFont = "inherit") {
  // Bank tags contain plain roots (√2) and mixed names (x축). Keep Korean as
  // text while laying out the math run; wholly Korean/circled labels stay text.
  let label = text.replace(/√(\d+(?:\.\d+)?|[A-Za-z])/g, "\\sqrt{$1}");
  if (CJK.test(label) && /[A-Za-z0-9\\]/.test(label) && !label.startsWith("$"))
    label = `$${label}$`;
  // A bank answer such as ab denotes a product, not an English word/unit.
  if (/^[a-z]{2,}$/.test(label)) label = `\\mathit{${label}}`;
  const laid = typesetLabel(label, bold);
  // Mixed Korean runs follow the bank's font or the paper's answer font.
  // Clone the layout: typesetLabel caches it for other callers too.
  return laid
    ? {
        ...laid,
        inner: laid.inner.replace(
          /font-family="Batang, serif"/g,
          `font-family="${escapeAttribute(textFont)}"`,
        ),
      }
    : null;
}

/** Fixed bank SVG text format only. Unsupported labels retain their source. */
export function typesetConceptFigure(source: string): string | null {
  if (!isSafeFragment(source) || /\sstyle\s*=|<\s*[!?]/i.test(source))
    return null;
  return source.replace(TEXT, (whole, tag: string, content: string) => {
    if (content.includes("<")) return whole;
    const attrs = Object.fromEntries(
      [...tag.matchAll(ATTR)].map((match) => [match[1], decodeText(match[3])]),
    );
    if (Object.keys(attrs).some((name) => !SUPPORTED_ATTRIBUTES.has(name)))
      return whole;
    const x = Number(attrs.x),
      y = Number(attrs.y),
      size = Number(attrs["font-size"]);
    if (![x, y, size].every(Number.isFinite) || size <= 0) return whole;
    const text = decodeText(content);
    const laid = mathLabel(
      text,
      attrs["font-weight"] === "bold" || Number(attrs["font-weight"]) >= 600,
      attrs["font-family"],
    );
    if (!laid) return whole;
    const fill = attrs.fill ?? "#111111";
    if (!/^(?:#[\da-f]{3,8}|[a-z]+)$/i.test(fill)) return whole;
    const anchor = attrs["text-anchor"];
    const piece = placeLabel(laid, text, x, y, size, fill, undefined, {
      anchor: anchor === "middle" || anchor === "end" ? anchor : "start",
      centerY: ["middle", "central"].includes(attrs["dominant-baseline"]),
    });
    if (!piece) return whole;
    return attrs.transform
      ? `<g transform="${escapeAttribute(attrs.transform)}">${piece}</g>`
      : piece;
  });
}

/** Measure the real glyphs so a fraction/root fits the answer box in print. */
export function typesetConceptTag(
  answer: string,
  x: number,
  y: number,
  width: number,
  height: number,
): string | null {
  const laid = mathLabel(answer, true);
  if (!laid || laid.widthEm <= 0 || laid.ascentEm + laid.descentEm <= 0)
    return null;
  const size = Math.min(
    11,
    (width - 4) / laid.widthEm,
    (height - 4) / (laid.ascentEm + laid.descentEm),
  );
  const baseline =
    y + height / 2 + ((laid.ascentEm - laid.descentEm) * size) / 2;
  return placeLabel(
    laid,
    answer,
    x + width / 2,
    baseline,
    size,
    "var(--cb-key-strong)",
  );
}
