import { inflateSync, strFromU8 } from "fflate";
import {
  decodeArithmeticPack,
  segmentPackMatch,
  hasPackFamily,
  readArithmeticPack,
} from "./packAssets";

type Family = Record<string, readonly [canonical: string, display: string]>;
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
  const match = segmentPackMatch(id);
  if (!match || !hasPackFamily("segments", match[1])) return undefined;
  const family = match[1];
  let rows = cache.get(family);
  if (!rows) {
    rows = decodeArithmeticPack("segments", family, () => {
      const bytes = Uint8Array.from(
        atob(readArithmeticPack("segments", family)),
        (c) => c.charCodeAt(0),
      );
      return JSON.parse(strFromU8(inflateSync(bytes))) as Family;
    });
  }
  cache.delete(family);
  cache.set(family, rows);
  if (cache.size > MAX_FAMILIES) cache.delete(cache.keys().next().value!);
  const row = rows[match[2]];
  return row?.[0] === originalSvg ? row[1] : undefined;
}
