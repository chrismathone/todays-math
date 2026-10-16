import type { ArithmeticV2Definition } from "../types";
import { GRADE1_COMPLETE } from "./elementaryComplete/grade1";
import { GRADE2_COMPLETE } from "./elementaryComplete/grade2";
import { GRADE3_COMPLETE } from "./elementaryComplete/grade3";
import { GRADE4_COMPLETE } from "./elementaryComplete/grade4";
import { GRADE5_COMPLETE } from "./elementaryComplete/grade5";
import { GRADE6_COMPLETE } from "./elementaryComplete/grade6";
import { DATA_COMPLETE } from "./elementaryComplete/data";

/** Append-only non-geometry school-unit calculations, audited 2026-10-15.
 * Existing arithmetic, geometry and published IDs are unchanged. Explicit unit
 * placement follows EBSMath's current grade navigation, checked against the local
 * seed. This is calculational coverage, not all achievement-standard mastery.
 */
export const ELEMENTARY_COMPLETE_DEFINITIONS: readonly ArithmeticV2Definition[] =
  [
    ...GRADE1_COMPLETE,
    ...GRADE2_COMPLETE,
    ...GRADE3_COMPLETE,
    ...GRADE4_COMPLETE,
    ...GRADE5_COMPLETE,
    ...GRADE6_COMPLETE,
    ...DATA_COMPLETE,
  ];
