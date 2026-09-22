export interface FigureGroupBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

/** Rendered bounds include nested transforms and typeset math, in root SVG units. */
export function figureGroupBounds(
  root: SVGSVGElement,
  ids: readonly string[],
): FigureGroupBounds | null {
  const screen = root.getScreenCTM?.();
  if (!screen || !ids.length) return null;
  const inverse = screen.inverse();
  let left = Infinity,
    top = Infinity,
    right = -Infinity,
    bottom = -Infinity;
  for (const id of ids) {
    const node = root.querySelector<SVGGraphicsElement>(
      `[data-object-id="${id}"]`,
    );
    const matrix = node?.getScreenCTM?.();
    if (!node || !matrix) continue;
    const box = node.getBBox();
    const transform = inverse.multiply(matrix);
    for (const [x, y] of [
      [box.x, box.y],
      [box.x + box.width, box.y],
      [box.x + box.width, box.y + box.height],
      [box.x, box.y + box.height],
    ]) {
      const point = new DOMPoint(x, y).matrixTransform(transform);
      left = Math.min(left, point.x);
      top = Math.min(top, point.y);
      right = Math.max(right, point.x);
      bottom = Math.max(bottom, point.y);
    }
  }
  if (![left, top, right, bottom].every(Number.isFinite)) return null;
  const scale = Math.hypot(screen.a, screen.b) || 1;
  const padding = 8 / scale;
  return {
    x: left - padding,
    y: top - padding,
    width: right - left + 2 * padding,
    height: bottom - top + 2 * padding,
    scale,
  };
}
