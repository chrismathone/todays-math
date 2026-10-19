import { inflateSync, strFromU8 } from "fflate";

let figures: Readonly<Record<string, string>> | undefined;
const handled =
  /^age-e4-(?:angle-(?:sum|difference|(?:right|straight|turn)-remainder)|quadrilateral-missing-angle|isosceles-(?:base|apex)-angle)-v1-\d+(?:-\d+)*$/;

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
    !handled.test(id) ||
    !originalSvg.includes("arithmetic-geometry-drill-v1")
  )
    return undefined;
  if (!figures) {
    // Keep the Python engine and MathJax build toolchain out of client imports.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pack = require("./angles.assets.json") as { svgPack: string };
    const bytes = Uint8Array.from(atob(pack.svgPack), (c) => c.charCodeAt(0));
    figures = Object.freeze(JSON.parse(strFromU8(inflateSync(bytes))));
  }
  return Object.prototype.hasOwnProperty.call(figures, id)
    ? figures![id]
    : undefined;
}
