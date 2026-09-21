export function measuredLength(objectStart: number, objectEnd: number): number {
  return objectEnd - objectStart;
}

export function rulerAligned(rulerZero: number, objectStart: number): boolean {
  return rulerZero === objectStart;
}

export function endTickReading(objectEnd: number, rulerZero: number): number {
  return objectEnd - rulerZero;
}

export function coverComplete(placed: number, length: number): boolean {
  return placed === length;
}

export function compareLonger(
  left: number,
  right: number,
): "left" | "right" | "same" {
  if (left === right) return "same";
  return left > right ? "left" : "right";
}
