import type { NetCell } from "./types";

type Dir = "n" | "s" | "e" | "w";
type Cube = {
  top: number;
  bottom: number;
  n: number;
  s: number;
  e: number;
  w: number;
};

const STEP: Record<Dir, readonly [number, number]> = {
  n: [-1, 0],
  s: [1, 0],
  e: [0, 1],
  w: [0, -1],
};

function roll(c: Cube, dir: Dir): Cube {
  const { top, bottom, n, s, e, w } = c;
  switch (dir) {
    case "n":
      return { top: s, bottom: n, n: top, s: bottom, e, w };
    case "s":
      return { top: n, bottom: s, n: bottom, s: top, e, w };
    case "e":
      return { top: w, bottom: e, n, s, e: top, w: bottom };
    case "w":
      return { top: e, bottom: w, n, s, e: bottom, w: top };
  }
}

function key(r: number, c: number) {
  return `${r},${c}`;
}

export function normalizeCells(cells: NetCell[]): string {
  const minR = Math.min(...cells.map((c) => c[0]));
  const minC = Math.min(...cells.map((c) => c[1]));
  return cells
    .map(([r, c]) => key(r - minR, c - minC))
    .sort()
    .join(";");
}

export function isHexomino(cells: NetCell[]): boolean {
  if (cells.length !== 6) return false;
  const set = new Set(cells.map(([r, c]) => key(r, c)));
  if (set.size !== 6) return false;
  const seen = new Set<string>();
  const start = key(cells[0][0], cells[0][1]);
  const q = [start];
  seen.add(start);
  while (q.length) {
    const [r, c] = q.pop()!.split(",").map(Number);
    for (const [dr, dc] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const n = key(r + dr, c + dc);
      if (set.has(n) && !seen.has(n)) {
        seen.add(n);
        q.push(n);
      }
    }
  }
  return seen.size === 6;
}

export function isCubeNet(cells: NetCell[]): boolean {
  if (!isHexomino(cells)) return false;
  const set = new Set(cells.map(([r, c]) => key(r, c)));
  const start = cells[0];
  const placed = new Map<string, number>();
  const cube0: Cube = { top: 1, bottom: 2, n: 3, s: 4, e: 5, w: 6 };
  const q: { r: number; c: number; cube: Cube }[] = [
    { r: start[0], c: start[1], cube: cube0 },
  ];
  placed.set(key(start[0], start[1]), cube0.bottom);
  while (q.length) {
    const cur = q.pop()!;
    (Object.keys(STEP) as Dir[]).forEach((dir) => {
      const [dr, dc] = STEP[dir];
      const r = cur.r + dr;
      const c = cur.c + dc;
      const k = key(r, c);
      if (!set.has(k)) return;
      const next = roll(cur.cube, dir);
      const face = next.bottom;
      if (placed.has(k)) {
        if (placed.get(k) !== face) placed.set(k, -1);
        return;
      }
      placed.set(k, face);
      q.push({ r, c, cube: next });
    });
  }
  if (placed.size !== 6) return false;
  const faces = [...placed.values()];
  if (faces.includes(-1)) return false;
  return new Set(faces).size === 6;
}

export const NET_SVG_CELL = 24;
export const NET_SVG_PAD = 10;

export function netSvgMetrics(
  cells: NetCell[],
  size = NET_SVG_CELL,
  pad = NET_SVG_PAD,
) {
  if (cells.length === 0) {
    return {
      minR: 0,
      minC: 0,
      cols: 0,
      rows: 0,
      size,
      pad,
      width: pad * 2,
      height: pad * 2,
    };
  }
  const rs = cells.map((c) => c[0]);
  const cs = cells.map((c) => c[1]);
  const minR = Math.min(...rs);
  const minC = Math.min(...cs);
  const cols = Math.max(...cs) - minC + 1;
  const rows = Math.max(...rs) - minR + 1;
  return {
    minR,
    minC,
    cols,
    rows,
    size,
    pad,
    width: cols * size + pad * 2,
    height: rows * size + pad * 2,
  };
}

export const SAMPLE_NETS: { id: string; cells: NetCell[]; valid: boolean }[] = [
  {
    id: "cross",
    cells: [
      [0, 1],
      [1, 1],
      [2, 0],
      [2, 1],
      [2, 2],
      [3, 1],
    ],
    valid: true,
  },
  {
    id: "t",
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
    valid: true,
  },
  {
    id: "z",
    cells: [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [3, 2],
    ],
    valid: true,
  },
  {
    id: "t4",
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 1],
      [2, 1],
    ],
    valid: false,
  },
  {
    id: "strip",
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [0, 5],
    ],
    valid: false,
  },
  {
    id: "square-plus",
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    valid: false,
  },
  {
    id: "branch-overlap",
    cells: [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 1],
      [3, 1],
    ],
    valid: true,
  },
];

export const CUBE_OPPOSITE: Record<string, string> = {
  A: "F",
  F: "A",
  B: "C",
  C: "B",
  D: "E",
  E: "D",
};

export const CUBOID_OPPOSITE: Record<string, string> = {
  "1": "6",
  "6": "1",
  "2": "4",
  "4": "2",
  "3": "5",
  "5": "3",
};
