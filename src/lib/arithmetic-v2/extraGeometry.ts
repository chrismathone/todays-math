import type { ArithmeticV2Definition } from "./types";
import {
  ELEMENTARY_GEOMETRY_DEFINITIONS,
  ELEMENTARY_GEOMETRY_FIGURES,
} from "./families/geometryElementary";
import {
  COUNT_GEOMETRY_DEFINITIONS,
  COUNT_GEOMETRY_FIGURES,
} from "./families/geometryCounts";
import {
  TRIANGLE_GEOMETRY_DEFINITIONS,
  TRIANGLE_GEOMETRY_FIGURES,
} from "./families/geometryTriangles";
import {
  MEASUREMENT_GEOMETRY_DEFINITIONS,
  MEASUREMENT_GEOMETRY_FIGURES,
} from "./families/geometryMeasure";

/** Integration boundary for independently checked, versioned geometry families.
 * Keep each family's figure map separate so lazy SVG getters stay lazy.
 */
export const EXTRA_GEOMETRY_DEFINITIONS: readonly ArithmeticV2Definition[] = [
  ...ELEMENTARY_GEOMETRY_DEFINITIONS,
  ...COUNT_GEOMETRY_DEFINITIONS,
  ...TRIANGLE_GEOMETRY_DEFINITIONS,
  ...MEASUREMENT_GEOMETRY_DEFINITIONS,
];
export const EXTRA_GEOMETRY_FIGURE_MAPS: readonly Readonly<
  Record<string, string>
>[] = [
  ELEMENTARY_GEOMETRY_FIGURES,
  COUNT_GEOMETRY_FIGURES,
  TRIANGLE_GEOMETRY_FIGURES,
  MEASUREMENT_GEOMETRY_FIGURES,
];
