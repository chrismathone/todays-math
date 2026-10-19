import { NUMBER_DEFINITIONS } from "./algebraComplete/numbers";
import { EXPRESSION_DEFINITIONS } from "./algebraComplete/expressions";
import { LINEAR_DEFINITIONS } from "./algebraComplete/linear";
import { FACTORIZATION_DEFINITIONS } from "./algebraComplete/factorization";
import { QUADRATIC_DEFINITIONS } from "./algebraComplete/quadratic";

/** New finite families only. Legacy IDs, tuple order, prompts and packs stay frozen. */
export const ALGEBRA_COMPLETE_DEFINITIONS = [
  ...NUMBER_DEFINITIONS,
  ...EXPRESSION_DEFINITIONS,
  ...LINEAR_DEFINITIONS,
  ...FACTORIZATION_DEFINITIONS,
  ...QUADRATIC_DEFINITIONS,
];
