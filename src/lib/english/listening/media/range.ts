export interface ListeningByteRange {
  start: number;
  endExclusive: number;
}

/**
 * Outcome of evaluating a GET `Range` field value against a representation of `size` bytes,
 * following RFC 9110 §14.2:
 * - `single`: one satisfiable `bytes` range (the only partial form served here) → 206.
 * - `ignore`: the header is ignored and the full representation is sent (200). A range unit the
 *   server does not understand MUST be ignored; a multi-range `bytes` set MAY be ignored, and it
 *   is here because multipart/byteranges is not produced.
 * - `reject`: an invalid `bytes` ranges-specifier (MAY ignore or reject; rejected here) or a valid
 *   but unsatisfiable one (SHOULD 416) → 416 with `Content-Range: bytes * /size`.
 * HEAD never reaches this function: Range is defined for GET only.
 */
export type ListeningRangeDecision =
  | { kind: "single"; range: ListeningByteRange }
  | { kind: "ignore"; reason: "unknown_unit" | "multiple_ranges" }
  | { kind: "reject"; reason: "invalid" | "unsatisfiable" };

// range-unit = token (RFC 9110 §5.6.2 tchar); unit names are case-insensitive (§14.1).
const RANGES_SPECIFIER = /^([!#$%&'*+\-.^_`|~0-9A-Za-z]+)=([\s\S]*)$/;
const INT_RANGE = /^(\d+)-(\d*)$/;
const SUFFIX_RANGE = /^-(\d+)$/;
// range-set = 1#range-spec: optional whitespace only around commas; empty elements are ignored (§5.6.1).
const LIST_SEPARATOR = /[ \t]*,[ \t]*/;

export function decideListeningRange(
  value: string,
  size: number,
): ListeningRangeDecision {
  const reject = (
    reason: "invalid" | "unsatisfiable",
  ): ListeningRangeDecision => ({ kind: "reject", reason });
  if (value.length > 200 || !Number.isSafeInteger(size) || size <= 0)
    return reject("invalid");
  const specifier = RANGES_SPECIFIER.exec(value);
  if (!specifier) return reject("invalid");
  if (specifier[1].toLowerCase() !== "bytes")
    return { kind: "ignore", reason: "unknown_unit" };
  const specs = specifier[2]
    .split(LIST_SEPARATOR)
    .filter((spec) => spec.length > 0);
  if (specs.length === 0) return reject("invalid");
  const parsed: { first: number | null; last: number | null }[] = [];
  for (const spec of specs) {
    const int = INT_RANGE.exec(spec);
    if (int) {
      const first = Number(int[1]);
      const last = int[2] ? Number(int[2]) : null;
      // last-pos present and below first-pos makes the int-range invalid (§14.1.1).
      if (last !== null && last < first) return reject("invalid");
      parsed.push({ first, last });
      continue;
    }
    const suffix = SUFFIX_RANGE.exec(spec);
    if (suffix) {
      parsed.push({ first: null, last: Number(suffix[1]) });
      continue;
    }
    return reject("invalid");
  }
  if (parsed.length > 1) return { kind: "ignore", reason: "multiple_ranges" };
  const [spec] = parsed;
  if (spec.first === null) {
    // suffix-range with a zero suffix-length is unsatisfiable (§14.1.2).
    if (spec.last === 0) return reject("unsatisfiable");
    return {
      kind: "single",
      range: { start: Math.max(0, size - spec.last!), endExclusive: size },
    };
  }
  if (spec.first >= size) return reject("unsatisfiable");
  return {
    kind: "single",
    range: {
      start: spec.first,
      endExclusive:
        spec.last === null ? size : Math.min(spec.last, size - 1) + 1,
    },
  };
}
