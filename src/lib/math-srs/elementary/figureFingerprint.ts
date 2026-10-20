/** Stable browser/server identity for JSON figure specs; never accepts renderable markup. */
export function courseFigureFingerprint(spec: Record<string, unknown>): string {
  const canonical = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
    if (value && typeof value === "object")
      return `{${Object.keys(value)
        .sort()
        .filter((key) => (value as Record<string, unknown>)[key] !== undefined)
        .map(
          (key) =>
            `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`,
        )
        .join(",")}}`;
    return JSON.stringify(value) ?? "null";
  };
  let hash = BigInt("0xcbf29ce484222325");
  for (const character of canonical(spec)) {
    hash ^= BigInt(character.codePointAt(0)!);
    hash = BigInt.asUintN(64, hash * BigInt("0x100000001b3"));
  }
  return hash.toString(16).padStart(16, "0");
}
