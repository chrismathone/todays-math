import { strFromU8, unzlibSync } from "fflate";
import { arithmeticTypographyPacked } from "./typographyData";
import {
  arithmeticLabelParts,
  escapeTypographyXml as esc,
  unescapeTypographyXml as unesc,
} from "./typographyLabel";

type Metrics = [
  width: number,
  ascent: number,
  descent: number,
  template: string,
];
interface Dictionary {
  centerShiftEm: number;
  glyphs: string[];
  entries: Record<string, Metrics>;
}
interface Layout {
  width: number;
  ascent: number;
  descent: number;
  body: string;
}
type Attributes = Record<string, string>;
interface Context {
  tag: string;
  style: Attributes;
  skip: boolean;
}

let dictionary: Dictionary | undefined;
const fragments = new Map<string, Layout>();
/** Expanded glyphs only: never retain thousands of SVGs from catalog previews. */
const FRAGMENT_CACHE_LIMIT = 256;
const THIN_SPACE_EM = 1 / 6; // Exactly the editor's \, and mixed-label spacing.

function getDictionary(): Dictionary {
  if (!dictionary) {
    const bytes = Uint8Array.from(atob(arithmeticTypographyPacked), (c) =>
      c.charCodeAt(0),
    );
    dictionary = JSON.parse(strFromU8(unzlibSync(bytes))) as Dictionary;
  }
  return dictionary;
}

function mathLayout(tex: string): Layout | undefined {
  const cached = fragments.get(tex);
  if (cached) {
    fragments.delete(tex);
    fragments.set(tex, cached);
    return cached;
  }
  const data = getDictionary();
  if (!Object.hasOwn(data.entries, tex)) return undefined;
  const [width, ascent, descent, template] = data.entries[tex];
  const result = {
    width,
    ascent,
    descent,
    body: template.replace(
      /~(\d+)~/g,
      (_, index: string) => data.glyphs[Number(index)],
    ),
  };
  if (fragments.size >= FRAGMENT_CACHE_LIMIT)
    fragments.delete(fragments.keys().next().value!);
  fragments.set(tex, result);
  return result;
}

function layoutLabel(label: string, fontFamily: string): Layout | undefined {
  const parts = arithmeticLabelParts(label);
  if (!parts.some((part) => part.tex)) return undefined;
  let width = 0,
    ascent = 0,
    descent = 0;
  const bodies: string[] = [];
  for (const part of parts) {
    if (part.tex) {
      const laid = mathLayout(part.tex);
      if (!laid) return undefined; // Unknown labels remain visible in their entirety.
      width +=
        (part.text.length - part.text.trimStart().length) * THIN_SPACE_EM;
      bodies.push(
        `<g transform="translate(${(width * 1000).toFixed(3)} 0)">${laid.body}</g>`,
      );
      width +=
        laid.width +
        (part.text.length - part.text.trimEnd().length) * THIN_SPACE_EM;
      ascent = Math.max(ascent, laid.ascent);
      descent = Math.max(descent, laid.descent);
    } else if (part.text.trim()) {
      // Same CJK 1em advance and box as the editor. Keep the source fallback font.
      // Inline declarations override the source's `text { font:20px ... }` rule.
      bodies.push(
        `<text x="${(width * 1000).toFixed(3)}" y="0"` +
          ` style="font-family:${esc(fontFamily)};font-size:1000px;font-weight:400;font-style:normal;` +
          `text-anchor:start;dominant-baseline:alphabetic;fill:currentColor;stroke:none">${esc(part.text)}</text>`,
      );
      width += [...part.text].length;
      ascent = Math.max(ascent, 0.86);
      descent = Math.max(descent, 0.14);
    } else {
      width += part.text.length * THIN_SPACE_EM;
    }
  }
  return { width, ascent, descent, body: bodies.join("") };
}

const ATTRIBUTE = /([^\s=<>/]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
function attributes(tag: string): Attributes {
  return Object.fromEntries(
    [...tag.matchAll(ATTRIBUTE)].map((m) => [m[1], unesc(m[2] ?? m[3])]),
  );
}

function declarations(source: string): Attributes {
  const result: Attributes = {};
  for (const piece of source.split(";")) {
    const colon = piece.indexOf(":");
    if (colon < 0) continue;
    const key = piece.slice(0, colon).trim();
    const value = piece.slice(colon + 1).trim();
    if (key === "font") {
      const font =
        /^(?:(normal|italic|bold)\s+)?([\d.]+)px(?:\/[\d.]+)?\s+(.+)$/.exec(
          value,
        );
      if (!font) {
        result["font-size"] = "unsupported";
        continue;
      }
      result["font-size"] = font[2];
      result["font-family"] = font[3];
      result["font-weight"] = font[1] === "bold" ? "bold" : "400";
      result["font-style"] = font[1] === "italic" ? "italic" : "normal";
    } else result[key] = value;
  }
  return result;
}

const INHERITED = [
  "font-size",
  "font-family",
  "font-weight",
  "font-style",
  "text-anchor",
  "dominant-baseline",
  "fill",
  "stroke",
  "stroke-width",
  "color",
];
function inherited(attrs: Attributes): Attributes {
  return Object.fromEntries(
    INHERITED.filter((key) => attrs[key] !== undefined).map((key) => [
      key,
      attrs[key],
    ]),
  );
}
const number = (value: string | undefined, fallback: number): number =>
  value === undefined
    ? fallback
    : /^-?(?:\d+\.?\d*|\.\d+)(?:px)?$/.test(value)
      ? parseFloat(value)
      : NaN;
const fixed = (value: number): string => value.toFixed(3);

export interface ArithmeticTypographyOptions {
  /** Presentation wording only. The original label is retained as metadata. */
  normalizeLabel?: (label: string) => string;
}

/**
 * Typeset a TRUSTED, already validated arithmetic SVG for display only.
 * This is not an SVG sanitizer and must not run before saved-pack validation.
 * Synchronous, deterministic, browser/Node-safe; MathJax exists only in the build.
 * Geometry, viewBox, dimensions, IDs, anchors and outer transforms stay unchanged.
 * Unsupported labels/layouts stay visible; previously typeset engine groups skip.
 */
export function typesetArithmeticGeometrySvg(
  svg: string,
  options: ArithmeticTypographyOptions = {},
): string {
  if (!/<text\b/.test(svg)) return svg;
  // Current arithmetic source styles contain only the global text rule. Unknown
  // selectors may carry layout semantics we cannot measure without a browser.
  let textStyle: Attributes = {};
  for (const style of svg.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) {
    for (const rule of style[1].matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (rule[1].trim() !== "text") return svg;
      textStyle = { ...textStyle, ...declarations(rule[2]) };
    }
  }
  const stack: Context[] = [];
  // Quoted attributes may contain >. Capture a complete text element before its
  // child markup; complex tspans/textPaths deliberately keep their original SVG.
  const tags =
    /<!--[^]*?-->|<style\b[^>]*>[^]*?<\/style>|<text\b((?:[^"'>]|"[^"]*"|'[^']*')*)>([^]*?)<\/text>|<\/?([\w:-]+)\b((?:[^"'>]|"[^"]*"|'[^']*')*)>/g;
  return svg.replace(
    tags,
    (
      whole,
      textAttrs: string | undefined,
      text: string | undefined,
      tag: string | undefined,
      rawAttrs: string | undefined,
    ) => {
      const parent = stack[stack.length - 1];
      if (textAttrs !== undefined && text !== undefined) {
        const attrs = attributes(textAttrs);
        if (
          parent?.skip ||
          attrs["data-arithmetic-typeset"] ||
          text.includes("<")
        )
          return whole;
        const original = attrs["data-mj"] ?? unesc(text);
        const label = options.normalizeLabel?.(original) ?? original;
        const style = {
          ...parent?.style,
          ...inherited(attrs),
          ...textStyle,
          ...declarations(attrs.style ?? ""),
        };
        const fontSize = number(style["font-size"], 16);
        const x = number(attrs.x, 0) + number(attrs.dx, 0);
        const y = number(attrs.y, 0) + number(attrs.dy, 0);
        if (
          ![fontSize, x, y].every(Number.isFinite) ||
          fontSize <= 0 ||
          attrs.rotate ||
          attrs.textLength ||
          attrs.lengthAdjust ||
          (style["font-weight"] &&
            !["normal", "400"].includes(style["font-weight"])) ||
          (style["font-style"] && style["font-style"] !== "normal")
        )
          return whole;
        const laid = layoutLabel(
          label,
          style["font-family"] ?? "Arial, 'Malgun Gothic', sans-serif",
        );
        if (!laid) {
          if (label === original) return whole;
          return `<text${textAttrs} data-arithmetic-typeset="1" data-original-label="${esc(original)}">${esc(label)}</text>`;
        }
        const anchor = style["text-anchor"] ?? "start";
        const baseline = style["dominant-baseline"] ?? "auto";
        if (
          !["start", "middle", "end"].includes(anchor) ||
          !["auto", "alphabetic", "middle", "central"].includes(baseline)
        )
          return whole;
        const width = laid.width * fontSize;
        const left =
          x - (anchor === "middle" ? width / 2 : anchor === "end" ? width : 0);
        const base =
          y +
          (["middle", "central"].includes(baseline)
            ? getDictionary().centerShiftEm * fontSize
            : 0);
        const scale = fontSize / 1000;
        const fill = style.fill ?? "black";
        const stroke = style.stroke ?? "none";
        const strokeWidth = number(style["stroke-width"], 1);
        let body = laid.body;
        // Match the editor's whole-label halo-then-fill order, including mixed text.
        if (stroke !== "none" && strokeWidth > 0) {
          const ring = body
            .replace(
              /fill="currentColor" stroke="none"/g,
              `fill="none" stroke="${esc(stroke)}" stroke-width="${(strokeWidth / scale).toFixed(1)}" stroke-linejoin="round" stroke-linecap="round"`,
            )
            .replace(
              /fill:currentColor;stroke:none/g,
              `fill:none;stroke:${esc(stroke)};stroke-width:${(strokeWidth / scale).toFixed(1)}`,
            );
          body = ring + body;
        }
        return (
          `<g${textAttrs} data-arithmetic-typeset="1" data-original-label="${esc(original)}"` +
          `${attrs["aria-label"] === undefined ? ` aria-label="${esc(original)}"` : ""}${attrs.role === undefined ? ' role="img"' : ""}>` +
          `<g data-label="${esc(label)}" data-anchor="${anchor}" data-x="${fixed(x)}" data-y="${fixed(y)}" data-base="${fixed(base)}"` +
          ` data-fs="${fixed(fontSize)}" data-w="${fixed(width)}" data-a="${fixed(laid.ascent * fontSize)}" data-d="${fixed(laid.descent * fontSize)}"` +
          ` style="color:${esc(fill)}" transform="translate(${fixed(left)} ${fixed(base)}) scale(${scale.toFixed(6)})">${body}</g></g>`
        );
      }
      if (!tag) return whole;
      if (whole.startsWith("</")) {
        if (stack[stack.length - 1]?.tag === tag) stack.pop();
        return whole;
      }
      if (!whole.endsWith("/>")) {
        const attrs = attributes(rawAttrs ?? "");
        stack.push({
          tag,
          style: {
            ...parent?.style,
            ...inherited(attrs),
            ...declarations(attrs.style ?? ""),
          },
          skip: Boolean(
            parent?.skip ||
            /^(?:defs|clipPath|mask|marker|pattern)$/.test(tag) ||
            attrs["data-label"] !== undefined ||
            attrs["data-arithmetic-typeset"],
          ),
        });
      }
      return whole;
    },
  );
}
