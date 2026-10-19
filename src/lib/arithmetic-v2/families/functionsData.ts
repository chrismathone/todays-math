import { compile } from "./functionsData/core";
import { DATA_SPECS } from "./functionsData/data";
import { FUNCTION_SPECS } from "./functionsData/functions";
import { PROBABILITY_SPECS } from "./functionsData/probability";
import { QUADRATIC_SPECS } from "./functionsData/quadratic";

/** Explicit unit/semester metadata; shared registry integration is owned by the caller. */
export const FUNCTIONS_DATA_DEFINITIONS = compile([
  ...FUNCTION_SPECS,
  ...QUADRATIC_SPECS,
  ...DATA_SPECS,
  ...PROBABILITY_SPECS,
]);
