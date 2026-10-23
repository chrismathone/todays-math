import { createHash } from "node:crypto";
export function canonicalOntologyJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value))
    return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map(canonicalOntologyJson).join(",")}]`;
  if (typeof value === "object" && value)
    return `{${Object.keys(value)
      .sort()
      .map(
        (k) =>
          `${JSON.stringify(k)}:${canonicalOntologyJson((value as Record<string, unknown>)[k])}`,
      )
      .join(",")}}`;
  throw new Error("NON_CANONICAL_VALUE");
}
export const ontologyDigest = (bytes: string) =>
  `sha256:${createHash("sha256").update(bytes, "utf8").digest("hex")}` as const;
export function freezeOntology<T>(value: T): Readonly<T> {
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) freezeOntology(item);
    Object.freeze(value);
  }
  return value;
}
