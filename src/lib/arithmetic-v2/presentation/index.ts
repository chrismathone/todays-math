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

export function arithmeticGeometryDisplaySize(svg: string) {
  const box = figureSvgViewBox(svg) ?? { width: 1, height: 1 };
  const scale = ARITHMETIC_GEOMETRY_EXTENT / Math.max(box.width, box.height);
  return { width: box.width * scale, height: box.height * scale };
}
