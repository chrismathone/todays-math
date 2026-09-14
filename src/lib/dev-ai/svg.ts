// A deliberately small static SVG grammar for CLI redraw output. The browser
// must also sanitize before applying it; this is not a general SVG sanitizer.
const TAGS = new Set([
  "svg",
  "g",
  "path",
  "line",
  "polyline",
  "polygon",
  "circle",
  "ellipse",
  "rect",
  "text",
  "tspan",
  "title",
  "desc",
  "defs",
  "use",
  "symbol",
  "clipPath",
  "mask",
  "marker",
  "pattern",
  "linearGradient",
  "radialGradient",
  "stop",
]);
const ENTITIES = /&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[\da-fA-F]+;)/;

function validText(value: string): boolean {
  if (ENTITIES.test(value)) return false;
  for (const entity of value.matchAll(/&#(x[\da-fA-F]+|\d+);/g)) {
    const code = entity[1].startsWith("x")
      ? Number.parseInt(entity[1].slice(1), 16)
      : Number(entity[1]);
    if (
      ![9, 10, 13].includes(code) &&
      !(code >= 0x20 && code <= 0xd7ff) &&
      !(code >= 0xe000 && code <= 0xfffd) &&
      !(code >= 0x10000 && code <= 0x10ffff)
    )
      return false;
  }
  return true;
}

function validAttribute(name: string, value: string): boolean {
  // Restrict attributes to literal/static values; no encoded URL/CSS payloads.
  if (/&|[\\\u0000-\u001f]/.test(value)) return false;
  const lower = name.toLowerCase();
  if (lower === "xmlns") return value === "http://www.w3.org/2000/svg";
  if (lower === "xmlns:xlink") return value === "http://www.w3.org/1999/xlink";
  if (lower === "href" || lower === "xlink:href")
    return /^#[\w.-]+$/.test(value);
  if (name.includes(":") || lower.startsWith("on") || lower === "style")
    return false;
  if (/javascript\s*:|expression\s*\(|\/\*|@/i.test(value)) return false;
  return !/url\s*\(/i.test(value.replace(/url\(\s*#[\w.-]+\s*\)/g, ""));
}

export function validDevAiSvg(source: string): boolean {
  const svg = source.trim();
  if (
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ud800-\udfff\ufffe\uffff]/u.test(
      svg,
    )
  )
    return false;
  const stack: string[] = [];
  let root = false;
  let shape = false;
  let index = 0;
  while (index < svg.length) {
    if (svg[index] !== "<") {
      const next = svg.indexOf("<", index);
      const end = next < 0 ? svg.length : next;
      const value = svg.slice(index, end);
      if ((!stack.length && value.trim()) || !validText(value)) return false;
      index = end;
      continue;
    }
    if (svg.startsWith("<!--", index)) {
      const end = svg.indexOf("-->", index + 4);
      if (end < 0 || svg.slice(index + 4, end).includes("--")) return false;
      index = end + 3;
      continue;
    }
    const close = /^<\/([A-Za-z][\w]*)\s*>/.exec(svg.slice(index));
    if (close) {
      if (stack.pop() !== close[1]) return false;
      index += close[0].length;
      continue;
    }
    const open = /^<([A-Za-z][\w]*)/.exec(svg.slice(index));
    if (!open || !TAGS.has(open[1])) return false;
    const tag = open[1];
    if (!stack.length) {
      if (root || tag !== "svg") return false;
      root = true;
    } else if (tag === "svg") return false;
    if (/^(path|line|polyline|polygon|circle|ellipse|rect|text|use)$/.test(tag))
      shape = true;
    index += open[0].length;
    const attributes = new Set<string>();
    while (true) {
      const end = /^\s*(\/?)>/.exec(svg.slice(index));
      if (end) {
        if (!end[1]) stack.push(tag);
        index += end[0].length;
        break;
      }
      const attribute =
        /^\s+([A-Za-z_][\w:.-]*)\s*=\s*(?:"([^"<]*)"|'([^'<]*)')/.exec(
          svg.slice(index),
        );
      if (!attribute || attributes.has(attribute[1])) return false;
      attributes.add(attribute[1]);
      if (!validAttribute(attribute[1], attribute[2] ?? attribute[3]))
        return false;
      index += attribute[0].length;
    }
  }
  return root && shape && stack.length === 0;
}
