import { inflateSync, strFromU8 } from "fflate";
import {
  decodeArithmeticPack,
  isAnglePackId,
  readArithmeticPack,
} from "./packAssets";

let figures: Readonly<Record<string, string>> | undefined;
/** Trusted DISPLAY adapter, called after canonical ID/SVG validation. The result
 * must never replace source SVG, saved figure snapshots, or canonical packs.
 * The synchronous pack is required and inflated only for a matching family;
 * importing this adapter performs no asset decompression or server work.
 */
export function presentArithmeticAngleSvg(
  id: string,
  originalSvg: string,
): string | undefined {
  if (
    !isAnglePackId(id) ||
    !originalSvg.includes("arithmetic-geometry-drill-v1")
  )
    return undefined;
  if (!figures) {
    figures = decodeArithmeticPack("angles", "all", () => {
      const pack = readArithmeticPack("angles", "all");
      const bytes = Uint8Array.from(atob(pack), (c) => c.charCodeAt(0));
      return Object.freeze(JSON.parse(strFromU8(inflateSync(bytes))));
    });
  }
  return Object.prototype.hasOwnProperty.call(figures, id)
    ? figures![id]
    : undefined;
}
