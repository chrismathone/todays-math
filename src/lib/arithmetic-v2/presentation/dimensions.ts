import { inflateSync, strFromU8 } from "fflate";
import {
  decodeArithmeticPack,
  dimensionPackMatch,
  hasPackFamily,
  readArithmeticPack,
} from "./packAssets";

type Family = Record<string, readonly [canonical: string, display: string]>;
const cache = new Map<string, Family>();
const MAX_FAMILIES = 4;

/** Trusted display-only replacement, called AFTER canonical snapshot validation.
 * Unknown IDs or changed SVG bytes are deliberately left to the caller.
 * No Python/DOM/network at runtime, no mutation of the canonical source/pack.
 * Only requested families are inflated; bounded LRU avoids retaining the domain.
 */
export function presentArithmeticDimensionSvg(
  id: string,
  originalSvg: string,
): string | undefined {
  const match = dimensionPackMatch(id);
  if (!match || !hasPackFamily("dimensions", match[1])) return undefined;
  const family = match[1];
  let rows = cache.get(family);
  if (!rows) {
    rows = decodeArithmeticPack("dimensions", family, () => {
      const bytes = Uint8Array.from(
        atob(readArithmeticPack("dimensions", family)),
        (c) => c.charCodeAt(0),
      );
      return JSON.parse(strFromU8(inflateSync(bytes))) as Family;
    });
  }
  cache.delete(family);
  cache.set(family, rows);
  if (cache.size > MAX_FAMILIES) cache.delete(cache.keys().next().value!);
  const entry = rows[match[2]];
  return entry?.[0] === originalSvg ? entry[1] : undefined;
}
