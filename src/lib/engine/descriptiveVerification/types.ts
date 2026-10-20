import type {
  NativeFact,
  NativePrintedProblem,
} from "../../../contracts/nativeDescriptive.contract";

/** Independently reconstructed targets. No generated problem is passed to an oracle. */
export type NativeVerification = {
  derived: NativeFact[];
  criterionChecks: {
    criterionId: string;
    expectedContains: string[];
    modelContains: string[];
    answerContains?: string[];
  }[];
  coverage: Record<string, string>;
};
export type NativeIndependentVerifier = (
  printed: NativePrintedProblem,
) => NativeVerification;
