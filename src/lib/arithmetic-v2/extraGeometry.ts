import type { ArithmeticV2Definition } from "./types";

/** Integration boundary for independently checked, versioned geometry families.
 * Keep each family's figure map separate so lazy SVG getters stay lazy.
 */
export const EXTRA_GEOMETRY_DEFINITIONS: readonly ArithmeticV2Definition[] = [];
export const EXTRA_GEOMETRY_FIGURE_MAPS: readonly Readonly<
  Record<string, string>
>[] = [];
