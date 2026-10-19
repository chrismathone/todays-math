import type { ExamStudyFamily } from "@/contracts/examStudy.contract";
import { intermediateTruthSetFamily, truthSetInclusionFamily } from "./logic";
import {
  absoluteRationalFamily,
  radicalAreaFamily,
  restrictedQuadraticFamily,
} from "./continuous";
import { finiteBijectionFamily, iteratedRangeFamily } from "./finite";
import { parabolaLineChainFamily } from "./graph";
import { splitIncentersFamily, twoCentersAngleFamily } from "./geometry";
import { incircleShadedAreaFamily } from "./incircle";
import {
  quadraticCoefficientReuseFamily,
  radicalInverseCircleFamily,
} from "./remaining";

/** Owned by the advanced authoring worker; isolated from legacy bank/SRS registries. */
export const ADVANCED_STUDY_FAMILIES: readonly ExamStudyFamily[] = [
  truthSetInclusionFamily,
  intermediateTruthSetFamily,
  restrictedQuadraticFamily,
  radicalAreaFamily,
  absoluteRationalFamily,
  finiteBijectionFamily,
  iteratedRangeFamily,
  parabolaLineChainFamily,
  splitIncentersFamily,
  twoCentersAngleFamily,
  incircleShadedAreaFamily,
  quadraticCoefficientReuseFamily,
  radicalInverseCircleFamily,
];
