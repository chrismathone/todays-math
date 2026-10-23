import type { MathOntologySourceDigest } from "@/contracts/mathOntologySource.contract";
const BASE = "urn:todaymath:math-source:";
/** RFC3986 UTF-8 percent encoding: uppercase escapes, no trim or Unicode normalization.
 * Python equivalent: urllib.parse.quote(value, safe='-._~', encoding='utf-8', errors='strict'). */
function component(value: string): string {
  if (!value.length) throw new Error("Empty source identity component");
  for (const char of value) {
    const code = char.codePointAt(0)!;
    if (code >= 0xd800 && code <= 0xdfff)
      throw new Error("Source identity must contain Unicode scalar values");
  }
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}
function version(iri: string, digest: string): string {
  if (!/^sha256:[a-f0-9]{64}$/.test(digest))
    throw new Error("Invalid immutable source byte digest");
  return `${iri}:version:${digest.slice(7)}`;
}
export function sourceEntityIri(ref: {
  namespace: string;
  nativeId: string;
  scope: string;
}): string {
  return `${BASE}entity:${component(ref.namespace)}:${component(ref.scope)}:${component(ref.nativeId)}`;
}
export function sourceEntityVersionIri(
  ref: { namespace: string; nativeId: string; scope: string },
  sourceVersion: MathOntologySourceDigest | string,
): string {
  return version(sourceEntityIri(ref), sourceVersion);
}
export function sourceAssertionIri(ref: {
  nativeId: string;
  scope: string;
}): string {
  return `${BASE}assertion:${component(ref.scope)}:${component(ref.nativeId)}`;
}
export function sourceAssertionVersionIri(
  ref: { nativeId: string; scope: string },
  sourceVersion: MathOntologySourceDigest | string,
): string {
  return version(sourceAssertionIri(ref), sourceVersion);
}
