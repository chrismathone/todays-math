import type { CourseDef } from "../types";
import { AREA_COURSE } from "./area";
import { CALC_COURSE } from "./calc";
import { CLOCK_COURSE } from "./clock";
import { DATA_COURSE } from "./data";
import { FRACTION_COURSE } from "./fraction";
import { MEASURE_COURSE } from "./measure";
import { NUMBER_COURSE } from "./number";
import { PATTERN_COURSE } from "./pattern";
import { RATIO_COURSE } from "./ratio";
import { SHAPE_COURSE } from "./shape";
import { SPACE_COURSE } from "./space";
import { VOLUME_COURSE } from "./volume";

export const COURSES: CourseDef[] = [
  NUMBER_COURSE,
  MEASURE_COURSE,
  CLOCK_COURSE,
  CALC_COURSE,
  PATTERN_COURSE,
  FRACTION_COURSE,
  SHAPE_COURSE,
  DATA_COURSE,
  AREA_COURSE,
  SPACE_COURSE,
  VOLUME_COURSE,
  RATIO_COURSE,
];

export function courseById(id: string): CourseDef | undefined {
  return COURSES.find((c) => c.id === id);
}
