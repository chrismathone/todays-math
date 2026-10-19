import type { ExamStudyFamily } from "@/contracts/examStudy.contract";
import { equalLegs, interceptTrapezoid, shiftedSystem } from "./algebra";
import { inverseArea, piecewise, rayPartition, square } from "./graphs";
import { signedTrapezoid } from "./signedTrapezoid";
import { fuelModel, minimumTime, stoppedTravel, twoWorkRates } from "./written";
import { MIDDLE_REMAINING_FAMILIES } from "./remaining";
import { inverseCoefficientSum } from "./inverseCoefficient";

export { MIDDLE_REMAINING_FAMILIES } from "./remaining";

/** Owned by the middle authoring worker; isolated from legacy bank/SRS registries. */
export const MIDDLE_STUDY_FAMILIES: readonly ExamStudyFamily[] = [
  piecewise,
  square,
  inverseArea,
  equalLegs,
  rayPartition,
  signedTrapezoid,
  shiftedSystem,
  interceptTrapezoid,
  minimumTime,
  fuelModel,
  stoppedTravel,
  twoWorkRates,
  ...MIDDLE_REMAINING_FAMILIES,
  inverseCoefficientSum,
];
