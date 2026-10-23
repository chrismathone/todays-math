import { createHash } from "node:crypto";
import type { MathOntologySourceDigest } from "@/contracts/mathOntologySource.contract";
/** Deterministic UTF-8 JSON for the source transport; not an RDF canonicalizer. */
export function compareSourceStrings(a: string, b: string): number {
  return Buffer.compare(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}
export function canonicalSourceJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Non-finite source metadata");
    return JSON.stringify(value);
  }
  if (Array.isArray(value))
    return `[${value.map(canonicalSourceJson).join(",")}]`;
  if (
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort(compareSourceStrings)
      .map((k) => `${JSON.stringify(k)}:${canonicalSourceJson(obj[k])}`)
      .join(",")}}`;
  }
  throw new Error("Source transport must contain only JSON values");
}
export function sourceDigest(value: unknown): MathOntologySourceDigest {
  return `sha256:${createHash("sha256").update(canonicalSourceJson(value), "utf8").digest("hex")}`;
}
export function sourceByteDigest(
  bytes: Uint8Array | string,
): MathOntologySourceDigest {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}
export function freezeSourceValue<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeSourceValue(child);
    Object.freeze(value);
  }
  return value;
}
