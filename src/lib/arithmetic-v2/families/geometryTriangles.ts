import { build } from "./geometryTriangles/core";
import { CENTER_SPECS } from "./geometryTriangles/centers";
import { RELATIONSHIP_SPECS } from "./geometryTriangles/relationships";
import { PYTHAGORAS_SPECS } from "./geometryTriangles/pythagoras";
import { PROPORTION_SPECS } from "./geometryTriangles/proportions";
import type { ArithmeticV2Definition } from "../types";

/**
 * Finite direct geometry drills. Exact surds use [coefficient, squarefreeRadicand,
 * positiveDenominator], reduced; rational answers use reduced numerator/denominator.
 * No pi-valued family is needed here. Ratio answers use explicit answerUnit="".
 * The figure map has enumerable lazy getters: importing the catalog draws no SVG.
 * gt1 identities freeze both the wording and the SVG construction contract.
 */
const built = build([
  ...CENTER_SPECS,
  ...RELATIONSHIP_SPECS,
  ...PYTHAGORAS_SPECS,
  ...PROPORTION_SPECS,
]);
export const TRIANGLE_GEOMETRY_DEFINITIONS: readonly ArithmeticV2Definition[] =
  built.definitions;
export const TRIANGLE_GEOMETRY_FIGURES: Readonly<Record<string, string>> =
  built.figures;
