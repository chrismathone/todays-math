import { figureSvgViewBox } from "@/lib/figure/figureSvgFrame";
import { typesetArithmeticGeometrySvg } from "./typography";
import { arithmeticGeometryNames } from "./text";
import { presentArithmeticAngleSvg } from "./angles";
import { presentArithmeticDimensionSvg } from "./dimensions";
import { presentArithmeticSegmentSvg } from "./segments";
import { presentArithmeticRemainingSvg } from "./remaining";
import { simplifyArithmeticFigureAnnotations } from "./figureAnnotations";

export const ARITHMETIC_GEOMETRY_EXTENT = 280;
const displayedFigures = new Map<
  string,
  { original: string; display: string }
>();

/** Called only with a canonical catalog figure or a validated saved figure.
 * This display projection must never replace the immutable saved SVG pack.
 */
export function presentArithmeticGeometrySvg(
  id: string,
  originalSvg: string,
): string {
  const cached = displayedFigures.get(id);
  if (cached?.original === originalSvg) {
    displayedFigures.delete(id);
    displayedFigures.set(id, cached);
    return cached.display;
  }
  const laidOut =
    presentArithmeticAngleSvg(id, originalSvg) ??
    presentArithmeticDimensionSvg(id, originalSvg) ??
    presentArithmeticSegmentSvg(id, originalSvg) ??
    presentArithmeticRemainingSvg(id, originalSvg) ??
    originalSvg;
  const withoutDrawingNote = simplifyArithmeticFigureAnnotations(
    id,
    laidOut,
  ).replace(/<text\b[^>]*>\s*겨냥도\s*<\/text>/g, "");
  const display = typesetArithmeticGeometrySvg(withoutDrawingNote, {
    normalizeLabel: arithmeticGeometryNames,
  }).replace(
    /(<svg\b[^>]*>)/,
    "$1<desc>arithmetic-geometry-presentation-v1</desc>",
  );
  if (displayedFigures.size >= 256)
    displayedFigures.delete(displayedFigures.keys().next().value!);
  displayedFigures.set(id, { original: originalSvg, display });
  return display;
}

/** The family's own display layout of a canonical figure, before typesetting. */
export function arithmeticGeometryLaidOutSvg(
  id: string,
  originalSvg: string,
): string {
  return (
    presentArithmeticAngleSvg(id, originalSvg) ??
    presentArithmeticDimensionSvg(id, originalSvg) ??
    presentArithmeticSegmentSvg(id, originalSvg) ??
    presentArithmeticRemainingSvg(id, originalSvg) ??
    originalSvg
  );
}

const figureFirstDisplays = new Map<
  string,
  { original: string; display: string }
>();

/** Figure-first display (owner, 2026-10-15/16): the family's own figure is
 * laid out as usual, then `compose` redraws or annotates it so that every
 * given and the target x are on the figure. The redundant-annotation pass is
 * skipped because the prose it relied on is no longer printed. Display only:
 * the canonical SVG passed in is never replaced.
 */
export function presentArithmeticFigureFirstSvg(
  id: string,
  originalSvg: string,
  compose: (laidOut: string, canonical: string) => string | undefined,
  options: { skipLayout?: boolean } = {},
): string | undefined {
  const cached = figureFirstDisplays.get(id);
  if (cached?.original === originalSvg) {
    figureFirstDisplays.delete(id);
    figureFirstDisplays.set(id, cached);
    return cached.display;
  }
  const laidOut = options.skipLayout
    ? originalSvg
    : arithmeticGeometryLaidOutSvg(id, originalSvg);
  const composed = compose(laidOut, originalSvg);
  if (composed === undefined) return undefined;
  const display = typesetArithmeticGeometrySvg(composed, {
    normalizeLabel: arithmeticGeometryNames,
  }).replace(
    /(<svg\b[^>]*>)/,
    "$1<desc>arithmetic-geometry-presentation-v1</desc>",
  );
  if (figureFirstDisplays.size >= 256)
    figureFirstDisplays.delete(figureFirstDisplays.keys().next().value!);
  figureFirstDisplays.set(id, { original: originalSvg, display });
  return display;
}

export function arithmeticGeometryDisplaySize(svg: string) {
  const box = figureSvgViewBox(svg) ?? { width: 1, height: 1 };
  const scale = ARITHMETIC_GEOMETRY_EXTENT / Math.max(box.width, box.height);
  return { width: box.width * scale, height: box.height * scale };
}
