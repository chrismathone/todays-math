import type { ArithmeticV2Definition } from "../types";
import { DECIMAL_DEFINITIONS } from "./elementary/decimals";
import { FRACTION_DEFINITIONS } from "./elementary/fractions";
import { NATURAL_DEFINITIONS } from "./elementary/natural";

/** Recommended Korean grade placements from the 2026-10-14 audit, not a claim
 * of complete grade/achievement-standard coverage. Each task is direct arithmetic.
 * Domain identity preserves operand order; no generation, randomness, I/O or
 * materialized problem fixture is needed to import the catalog.
 */
export const ELEMENTARY_ARITHMETIC_DEFINITIONS: readonly ArithmeticV2Definition[] =
  [...NATURAL_DEFINITIONS, ...FRACTION_DEFINITIONS, ...DECIMAL_DEFINITIONS];
