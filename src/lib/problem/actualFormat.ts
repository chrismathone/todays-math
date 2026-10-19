import { createHash } from "node:crypto";
import type { FormatInput } from "./provenance";

/** Same transitive source fingerprint as the DB backfill. A test locks this to
 * formatRuleVersion(); update it and backfill after changing the classifier. */
export const ACTUAL_FORMAT_VERSION =
  "format-v1:1c653f6c01b41e1c9e9a78edab82a2e3373923af6d6c88aa9f21233aafa0e42a";

// Fallback scope belongs to one read transaction and its request-local map. It never
// becomes a process cache, nor survives into another transaction/client.
const verified = new WeakMap<
  object,
  { client: object; scopes: Set<string>; all: boolean }
>();
const visibleOnly = (where: unknown): boolean =>
  !!where &&
  typeof where === "object" &&
  Object.entries(where).every(([key, value]) =>
    key === "pool"
      ? value === "shared"
      : key === "AND" &&
        (Array.isArray(value) ? value : [value]).every(visibleOnly),
  );
export function formatsVerified(
  formats: object,
  client: object | undefined,
  where: unknown,
): boolean {
  const proof = verified.get(formats);
  return (
    !!client &&
    proof?.client === client &&
    (proof.all || proof.scopes.has(JSON.stringify(where)))
  );
}
export function verifyFormatScope(
  formats: object,
  client: object,
  where: unknown,
) {
  const prior = verified.get(formats);
  const proof =
    prior?.client === client
      ? prior
      : { client, scopes: new Set<string>(), all: false };
  proof.scopes.add(JSON.stringify(where));
  proof.all ||= visibleOnly(where);
  verified.set(formats, proof);
}

/** Exact UTF-8 JSON, including nulls, whitespace and line endings. */
export function actualFormatDigest(
  row: FormatInput & { questionGroupKey?: string | null },
): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        "problem-actual-format-input-v1",
        row.content,
        row.answer,
        row.questionType ?? null,
        row.problemType ?? null,
        row.familyKey,
        row.questionGroupKey ?? null,
      ]),
    )
    .digest("hex");
}
