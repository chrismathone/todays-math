import { inflateSync, strFromU8 } from "fflate";
import asset from "./segments-assets-v1.json";

type Family = Record<string, readonly [canonical: string, display: string]>;
const packs: Readonly<Record<string, string>> = asset.families;
const cache = new Map<string, Family>();
const MAX_FAMILIES = 4;

/** Display-only adapter, called AFTER trusted canonical snapshot validation.
 * A complete original-string match is required; hashes never authorize a match.
 * Importing draws/inflates nothing. Only requested families are decoded and a
 * four-family LRU bounds retained rows. No runtime DOM, MathJax or generation.
 */
export function presentArithmeticSegmentSvg(
  id: string,
  originalSvg: string,
): string | undefined {
  const match = /^gt1-(m[23]-[a-z-]+)-(\d+(?:-\d+)*)$/.exec(id);
  if (!match || !Object.hasOwn(packs, match[1])) return undefined;
  const family = match[1];
  let rows = cache.get(family);
  if (!rows) {
    const bytes = Uint8Array.from(atob(packs[family]), (c) => c.charCodeAt(0));
    rows = JSON.parse(strFromU8(inflateSync(bytes))) as Family;
  }
  cache.delete(family);
  cache.set(family, rows);
  if (cache.size > MAX_FAMILIES) cache.delete(cache.keys().next().value!);
  const row = rows[match[2]];
  return row?.[0] === originalSvg ? row[1] : undefined;
}
