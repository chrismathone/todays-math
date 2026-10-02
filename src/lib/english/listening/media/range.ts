export interface ListeningByteRange {
  start: number;
  endExclusive: number;
}

/** Strict single byte ranges. Unsupported/multiple/malformed ranges fail with 416. */
export function parseListeningByteRange(
  value: string,
  size: number,
): ListeningByteRange | null {
  if (value.length > 200 || !Number.isSafeInteger(size) || size <= 0)
    return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) return null;
  const first = match[1] ? Number(match[1]) : null;
  const last = match[2] ? Number(match[2]) : null;
  if (
    (first !== null && !Number.isSafeInteger(first)) ||
    (last !== null && !Number.isSafeInteger(last))
  )
    return null;
  if (first === null) {
    if (!last) return null;
    return { start: Math.max(0, size - last), endExclusive: size };
  }
  if (first >= size || (last !== null && last < first)) return null;
  return {
    start: first,
    endExclusive: last === null ? size : Math.min(last, size - 1) + 1,
  };
}
