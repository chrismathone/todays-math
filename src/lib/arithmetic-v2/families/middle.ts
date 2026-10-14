import type { ArithmeticV2Definition } from "../types";
import { NUMERIC_DEFINITIONS } from "./middle/numeric";
import { POLYNOMIAL_DEFINITIONS } from "./middle/polynomial";
import { RADICAL_DEFINITIONS } from "./middle/radical";

/** Bounded direct arithmetic, with recommended grade placements only. */
export const MIDDLE_ARITHMETIC_DEFINITIONS: readonly ArithmeticV2Definition[] =
  [...NUMERIC_DEFINITIONS, ...POLYNOMIAL_DEFINITIONS, ...RADICAL_DEFINITIONS];
