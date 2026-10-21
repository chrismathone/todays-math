import registry from "@/lib/figure/asset-editor-geometry.json";
import legacyRegistry from "@/lib/figure/asset-editor-geometry-legacy-20261021.json";
import { applyPoint, elementMatrix, type Point } from "./figureEditGeometry";

type AssetIdentity = { viewBox: number[]; signature: string };
const REGISTRIES: ReadonlyArray<Readonly<Record<string, AssetIdentity>>> = [registry.assets, legacyRegistry.assets];
const ATTRS = new Set("x y x1 y1 x2 y2 cx cy r rx ry width height d points transform".split(" "));
const TAGS = new Set("g path rect line circle ellipse polygon polyline".split(" "));
const NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

// elementMatrix intentionally falls back to identity for unsupported input.
// Do not certify an asset frame using that fallback for a malformed transform.
function validFrameTransform(node: Element): boolean {
  const root = node.ownerDocument.documentElement;
  if (root.getAttribute("transform")?.trim()) return false;
  for (let el: Element | null = node; el && el !== root; el = el.parentElement) {
    const value = el.getAttribute("transform") ?? "";
    if (value.length > 2048) return false;
    let end = 0;
    for (const match of value.matchAll(/(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^()]*)\)/g)) {
      if (value.slice(end, match.index).trim()) return false;
      const body = match[2].trim();
      if (!body || /(^|,)\s*(,|$)/.test(body)) return false;
      const values = body.split(/[\s,]+/);
      if (!values.every((v) => NUMBER.test(v) && Number.isFinite(Number(v)) && Math.abs(Number(v)) <= 1e7)) return false;
      const sizes = match[1] === "matrix" ? [6] : match[1] === "rotate" ? [1, 3] : match[1].startsWith("skew") ? [1] : [1, 2];
      if (!sizes.includes(values.length)) return false;
      end = match.index! + match[0].length;
    }
    if (value.slice(end).trim()) return false;
  }
  const m = elementMatrix(node);
  return m.every((v) => Number.isFinite(v) && Math.abs(v) <= 1e7) && Math.abs(m[0] * m[3] - m[1] * m[2]) > 1e-12;
}

// Paint may change in the editor; geometry and nested transforms must still be
// the registered stock shape. A marker alone never hides arbitrary math lines.
function signature(node: Element, depth = 0): unknown[] | null {
  if (depth > 32 || !TAGS.has(node.localName)) return null;
  if ([...node.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim())) return null;
  const attrs = [...node.attributes]
    .filter(({ name }) => ATTRS.has(name))
    .map(({ name, value }) => [name, value.trim().replace(/\s+/g, " ")])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const children = [...node.children].map((child) => signature(child, depth + 1));
  if (children.some((child) => child === null)) return null;
  return [node.localName, attrs, children];
}

function matchedIdentity(node: Element): AssetIdentity | null {
  if (node.localName !== "g") return null;
  if (!validFrameTransform(node)) return null;
  if ([...node.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim())) return null;
  const slug = node.getAttribute("data-asset") ?? "";
  const candidates = REGISTRIES.filter((assets) => Object.hasOwn(assets, slug)).map((assets) => assets[slug]);
  if (!candidates.length) return null;
  const children = [...node.children].map((child) => signature(child));
  if (children.some((child) => child === null)) return null;
  const actual = JSON.stringify(children);
  return candidates.find((entry) => entry.signature === actual) ?? null;
}

/** A stock picture identity, never a source licence, question or grade approval. */
export function isFigureAssetLayer(node: Element): boolean {
  return matchedIdentity(node) !== null;
}

/** The verified stock viewBox is a conservative container, not sampled ink bounds. */
export function figureAssetLocalFrame(node: Element): Point[] | null {
  const identity = matchedIdentity(node);
  if (!identity) return null;
  // A reused slug does not make a new artwork's frame valid for an older SVG.
  const [width, height] = identity.viewBox;
  if (!(typeof width === "number" && typeof height === "number" && Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0)) return null;
  return [[0, 0], [width, 0], [width, height], [0, height]];
}

export function figureAssetRootFrame(node: Element): Point[] | null {
  const frame = figureAssetLocalFrame(node);
  if (!frame) return null;
  const matrix = elementMatrix(node);
  const points = frame.map((point) => applyPoint(matrix, point));
  return points.every((point) => point.every(Number.isFinite)) ? points : null;
}
