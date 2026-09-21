export function parallelogramArea(base: number, height: number): number {
  return base * height;
}

export function triangleFromParallelogram(
  base: number,
  height: number,
): number {
  return (base * height) / 2;
}

export function rectangleFromCut(
  base: number,
  height: number,
  slide: number,
  cut: boolean,
): { complete: boolean; area: number } {
  return {
    complete: cut && slide === 100,
    area: parallelogramArea(base, height),
  };
}

export function unitSquareCount(cols: number, rows: number): number {
  return cols * rows;
}

export function sameAreaAfterMove(
  discarded: boolean,
  overlapped: boolean,
): boolean {
  return !discarded && !overlapped;
}
