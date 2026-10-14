import type { ArithmeticV2Definition } from "../types";
import {
  ANGLE_FAMILIES,
  CIRCLE_ANGLE_FAMILIES,
} from "./geometryMeasure/angles";
import { buildFamily } from "./geometryMeasure/core";
import {
  CHORD_FAMILIES,
  ROUND_FAMILIES,
  TANGENT_FAMILIES,
} from "./geometryMeasure/round";
import {
  SOLID_FAMILIES,
  SOLID_INVERSE_FAMILIES,
} from "./geometryMeasure/solid";
import { TRIG_FAMILIES } from "./geometryMeasure/trig";

const figures: Record<string, string> = {};
export const MEASUREMENT_GEOMETRY_DEFINITIONS: readonly ArithmeticV2Definition[] =
  Object.freeze(
    [
      ...ANGLE_FAMILIES,
      ...ROUND_FAMILIES,
      ...SOLID_FAMILIES,
      ...CIRCLE_ANGLE_FAMILIES,
      ...CHORD_FAMILIES,
      ...TRIG_FAMILIES,
      ...SOLID_INVERSE_FAMILIES,
      ...TANGENT_FAMILIES,
    ].map((f) => buildFamily(f, figures)),
  );
/** Exact SVG strings are evaluated only when the selected figure is accessed. */
export const MEASUREMENT_GEOMETRY_FIGURES: Readonly<Record<string, string>> =
  Object.freeze(figures);
