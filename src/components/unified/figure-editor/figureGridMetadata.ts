/** Shared editor boundary for the engine's single, square background layer. */
export function parseFigureGridData(value: string | null) {
  if (!value || !/^\s*-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s+\d+\s+\d+\s*$/.test(value)) return null;
  const [x, y, cellW, cellH, cols, rows] = value.trim().split(/\s+/).map(Number);
  if (![x, y, cellW, cellH, cols, rows].every(Number.isFinite) ||
      Math.abs(x!) > 1e7 || Math.abs(y!) > 1e7 || cellW! <= 0 || cellH! <= 0 ||
      cellW! > 1e7 || cellH! > 1e7 || Math.abs(cellW! - cellH!) > 0.002 ||
      !Number.isInteger(cols) || !Number.isInteger(rows) || cols! < 1 || rows! < 1 || cols! > 60 || rows! > 60 ||
      Math.abs(x! + cellW! * cols!) > 1e7 || Math.abs(y! + cellH! * rows!) > 1e7) return null;
  return { x: x!, y: y!, cellW: cellW!, cellH: cellH!, cols: cols!, rows: rows! };
}

const NON_RENDERING = new Set('defs title desc clipPath mask marker pattern linearGradient radialGradient'.split(' '));
export function isFigureGridLayer(node: Element): boolean {
  const root = node.ownerDocument.documentElement;
  const first = [...root.children].find((el) => !NON_RENDERING.has(el.localName));
  return node.localName === 'g' && node.parentElement === root && node === first &&
    !node.hasAttribute('transform') && parseFigureGridData(node.getAttribute('data-grid')) !== null &&
    node.children.length === 1 && node.children[0]!.localName === 'path' &&
    !node.children[0]!.hasAttribute('transform') && !node.children[0]!.hasAttribute('data-grid');
}
