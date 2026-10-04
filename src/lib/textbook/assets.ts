import type { AssetRef } from "@/contracts/textbookExchange.contract";

const starts = (bytes: Uint8Array, signature: number[]) =>
  signature.every((b, i) => bytes[i] === b);
const ascii = (bytes: Uint8Array, from: number, to: number) =>
  String.fromCharCode(...bytes.subarray(from, to));

/** Fail closed. This renderer's SVG subset has no CSS, scripts, entities, foreign content or external refs. */
export function assertSafeSvg(text: string): void {
  if (
    text.length > 4 * 1024 * 1024 ||
    /<!|<\?|[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)
  )
    throw new Error("Unsupported SVG declaration or control character");
  const tags = new Set([
    "svg",
    "g",
    "path",
    "rect",
    "circle",
    "ellipse",
    "line",
    "polyline",
    "polygon",
    "text",
    "tspan",
    "defs",
    "clipPath",
    "mask",
    "linearGradient",
    "radialGradient",
    "stop",
    "title",
    "desc",
  ]);
  const attributes = new Set([
    "xmlns",
    "viewBox",
    "width",
    "height",
    "x",
    "y",
    "x1",
    "x2",
    "y1",
    "y2",
    "cx",
    "cy",
    "r",
    "rx",
    "ry",
    "d",
    "points",
    "fill",
    "fill-opacity",
    "fill-rule",
    "stroke",
    "stroke-width",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-dasharray",
    "stroke-dashoffset",
    "stroke-opacity",
    "opacity",
    "transform",
    "id",
    "clip-path",
    "clip-rule",
    "mask",
    "gradientUnits",
    "gradientTransform",
    "offset",
    "stop-color",
    "stop-opacity",
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "text-anchor",
    "dominant-baseline",
    "alignment-baseline",
    "dx",
    "dy",
    "preserveAspectRatio",
    "version",
    "role",
    "aria-label",
    // The local figure renderer records original MathJax/editing labels as inert text.
    "data-mj",
    "data-label",
    "data-anchor",
    "data-x",
    "data-y",
    "data-base",
    "data-fs",
    "data-w",
    "data-a",
    "data-d",
    "data-halo",
    "data-px",
    "data-py",
    "data-c",
    "data-mml-node",
    "data-mjx-texclass",
  ]);
  const stack: string[] = [];
  let at = 0,
    roots = 0;
  for (const match of text.matchAll(/<\/?[A-Za-z][^<>]*>|[^<>]+/g)) {
    if (match.index !== at) throw new Error("Malformed SVG token");
    at += match[0].length;
    const token = match[0];
    if (!token.startsWith("<")) {
      if (!stack.length && token.trim())
        throw new Error("Text outside SVG root");
      if (/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);)/i.test(token))
        throw new Error("Unsupported SVG entity");
      continue;
    }
    const name = /^<\/?([A-Za-z][\w-]*)/.exec(token)?.[1];
    if (!name || !tags.has(name))
      throw new Error(`Unsupported SVG element ${name}`);
    if (token.startsWith("</")) {
      if (token !== `</${name}>` || stack.pop() !== name)
        throw new Error("Unbalanced SVG");
      continue;
    }
    if (!stack.length) {
      if (name !== "svg" || roots++)
        throw new Error("SVG requires a single root");
    }
    const body = token.slice(name.length + 1, token.endsWith("/>") ? -2 : -1);
    let rest = body;
    const seen = new Set<string>();
    while (rest.trim()) {
      const attr =
        /^\s+([A-Za-z][\w:-]*)\s*=\s*(?:"([^"<>]*)"|'([^'<>]*)')/.exec(rest);
      if (!attr) throw new Error("Malformed SVG attribute");
      const key = attr[1],
        value = attr[2] ?? attr[3];
      if (
        !attributes.has(key) ||
        seen.has(key) ||
        /[\u0000-\u001f]/.test(value)
      )
        throw new Error(`Unsupported SVG attribute ${key}`);
      const labelMetadata = key === "data-mj" || key === "data-label";
      if (
        labelMetadata &&
        /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);)/i.test(value)
      )
        throw new Error("Unsupported SVG label entity");
      if (!labelMetadata && value.includes("&"))
        throw new Error("SVG attribute entities are unsupported");
      if (key === "data-anchor" && !/^(start|middle|end)$/.test(value))
        throw new Error("Unsupported SVG label anchor");
      if (
        (key === "data-c" && !/^[0-9A-Fa-f]+$/.test(value)) ||
        (key === "data-mml-node" && !/^[A-Za-z][A-Za-z0-9-]*$/.test(value)) ||
        (key === "data-mjx-texclass" && !/^[A-Z]+$/.test(value))
      )
        throw new Error("Unsupported SVG MathJax metadata");
      if (
        /^data-(?:x|y|base|fs|w|a|d|halo|px|py)$/.test(key) &&
        (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) ||
          !Number.isFinite(Number(value)))
      )
        throw new Error("Unsupported SVG label coordinate");
      if (
        !labelMetadata &&
        /url\s*\(/i.test(value) &&
        !/^url\(#[A-Za-z][\w:.-]*\)$/.test(value)
      )
        throw new Error("External SVG resource");
      if (key === "xmlns" && value !== "http://www.w3.org/2000/svg")
        throw new Error("Unsupported SVG namespace");
      seen.add(key);
      rest = rest.slice(attr[0].length);
    }
    if (!token.endsWith("/>")) stack.push(name);
  }
  if (at !== text.length || stack.length || roots !== 1)
    throw new Error("Malformed SVG document");
}

/** Content sniffing precedes rendering or packaging; a claimed MIME never makes HTML an image. */
export function assertAssetMime(
  bytes: Uint8Array,
  mime: AssetRef["mimeType"],
): void {
  let matches = false;
  switch (mime) {
    case "image/png":
      matches =
        starts(bytes, [137, 80, 78, 71, 13, 10, 26, 10]) && bytes.length >= 33;
      break;
    case "image/jpeg":
      matches =
        starts(bytes, [255, 216, 255]) &&
        bytes.length > 4 &&
        bytes[bytes.length - 2] === 255 &&
        bytes[bytes.length - 1] === 217;
      break;
    case "image/webp":
      matches =
        ascii(bytes, 0, 4) === "RIFF" &&
        ascii(bytes, 8, 12) === "WEBP" &&
        bytes.length >= 20;
      break;
    case "font/woff2":
      matches = ascii(bytes, 0, 4) === "wOF2" && bytes.length >= 48;
      break;
    case "font/woff":
      matches = ascii(bytes, 0, 4) === "wOFF" && bytes.length >= 44;
      break;
    case "font/ttf":
      matches = starts(bytes, [0, 1, 0, 0]) && bytes.length >= 12;
      break;
    case "image/svg+xml": {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      assertSafeSvg(text);
      matches = true;
      break;
    }
  }
  if (!matches) throw new Error(`Asset bytes do not match ${mime}`);
}
