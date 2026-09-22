import type { CubeOperation } from "./types";

/** Only givens belong here. An exploration never receives an answer key. */
export type BundleExperiment = {
  kind: "bundles";
  prompt: string;
  /** Hundreds, tens, ones; noncanonical counts model regrouping. */
  counts: readonly [number, number, number];
  startPacked?: boolean;
};

export type JourneyExperiment = {
  kind: "journey";
  prompt: string;
  start: number;
  steps: readonly {
    amount: number;
    operation: CubeOperation;
    label?: string;
  }[];
};

export type RelationExperiment = {
  kind: "relation";
  prompt: string;
  mode: "join" | "compare" | "part";
  parts: readonly { label: string; value: number }[];
  /** In part mode, the whole is given, and the learner adjusts the missing part. */
  total?: number;
  answerField?: string;
};

export type AlignmentExperiment = {
  kind: "alignment";
  prompt: string;
  top: number;
  moving: number;
};

export type DigitExperiment = {
  kind: "digits";
  prompt: string;
  operation: CubeOperation;
  /** Each row contains known digits or a field id for a missing digit. */
  rows: readonly (readonly (number | string)[])[];
};

export type ComparisonExperiment = {
  kind: "comparison";
  prompt: string;
  routes: readonly {
    label: string;
    value: string;
    start: number;
    amount: number;
    operation: CubeOperation;
  }[];
};

export type CubeExperiment =
  | BundleExperiment
  | JourneyExperiment
  | RelationExperiment
  | AlignmentExperiment
  | DigitExperiment
  | ComparisonExperiment;
