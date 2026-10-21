/** Authored inputs to the existing Python elementary engine; no drawing rules copied here.
 * Regenerate: npx tsx scripts/qa/srs-preview-cards/generate-figures.ts
 * Every fraction caption states what one whole means (one strip or the entire set).
 */
export const PREVIEW_FIGURE_SPECS = {
  "fraction-times-whole": {
    version: "elem-1",
    kind: "fracBars",
    cols: 4,
    rows: 2,
    filled: [0, 1, 2, 4, 5, 6],
  },
  "whole-times-fraction": {
    version: "elem-1",
    kind: "fracBars",
    cols: 4,
    rows: 1,
    filled: [0, 1, 2],
  },
  "proper-fractions": {
    version: "elem-1",
    kind: "fracBars",
    cols: 4,
    rows: 3,
    filled: [0, 1, 2, 4, 5, 6],
  },
  "mixed-fractions": {
    version: "elem-1",
    kind: "fracBars",
    cols: 3,
    rows: 2,
    filled: [0, 1, 3, 4],
  },
  congruence: {
    version: "elem-1",
    kind: "rotateFlip",
    op: "rot90",
    n: 4,
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 2],
    ],
  },
  "congruent-properties": {
    version: "elem-1",
    kind: "rotateFlip",
    op: "rot90",
    n: 4,
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
  "line-symmetry": {
    version: "elem-1",
    kind: "symmetry",
    axis: "v",
    n: 6,
    cells: [
      [2, 1],
      [3, 1],
      [1, 2],
      [2, 2],
      [3, 2],
      [4, 2],
      [2, 3],
      [3, 3],
    ],
  },
  "point-symmetry": {
    version: "elem-1",
    kind: "symmetry",
    axis: "point",
    n: 6,
    cells: [
      [1, 1],
      [2, 1],
      [2, 2],
      [3, 3],
      [3, 4],
      [4, 4],
    ],
  },
} as const;

export type PreviewEngineFigureId = keyof typeof PREVIEW_FIGURE_SPECS;
