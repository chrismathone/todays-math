import { inflateSync, strFromU8 } from "fflate";
import {
  decodeArithmeticPack,
  readArithmeticPack,
  remainingPackFamily,
} from "./packAssets";

type Family = Record<string, readonly [canonical: string, display: string]>;
const cache = new Map<string, Family>();

/** Display-only, after angle/dimension/segment presentation and canonical pack
 * validation. A full source-string match is required for the exact registered ID.
 * Importing does not inflate or render. At most four families are retained.
 * Assets are offline outputs of the actual public figure-editor operations.
 */
export function presentArithmeticRemainingSvg(
  id: string,
  originalSvg: string,
): string | undefined {
  const family = remainingPackFamily(id);
  if (!family) return undefined;
  let rows = cache.get(family);
  if (!rows) {
    rows = decodeArithmeticPack("remaining", family, () => {
      const bytes = Uint8Array.from(
        atob(readArithmeticPack("remaining", family)),
        (c) => c.charCodeAt(0),
      );
      return JSON.parse(strFromU8(inflateSync(bytes))) as Family;
    });
  }
  cache.delete(family);
  cache.set(family, rows);
  if (cache.size > 4) cache.delete(cache.keys().next().value!);
  const row = rows[id];
  return row?.[0] === originalSvg ? row[1] : undefined;
}
