import { angleSpecs } from "./geometryElementary/angles";
import { compile } from "./geometryElementary/core";
import { measurementSpecs } from "./geometryElementary/measurement";
import { planeSpecs } from "./geometryElementary/plane";
import { solidCircleSpecs } from "./geometryElementary/solidsCircle";

/** Local curriculum placement and exact-domain exclusions are recorded in
 * docs/reports/arithmetic-geometry-elementary-20261015.txt.
 * No imports of the registry, contracts, or the legacy shared figure pack.
 */
const compiled = compile([
  ...measurementSpecs,
  ...angleSpecs,
  ...planeSpecs,
  ...solidCircleSpecs,
]);
export const ELEMENTARY_GEOMETRY_DEFINITIONS = compiled.definitions;
/** Enumerable lazy accessors: looking up a chosen ID creates exactly that SVG. */
export const ELEMENTARY_GEOMETRY_FIGURES = compiled.figures;
