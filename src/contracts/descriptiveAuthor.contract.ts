/** Authorship is separate from school selection and from the reusable helper engines. */
import type { StudyRequirementId } from "./examStudy.contract";
import type {
  NativeDefinition,
  NativeDescriptiveProblemR2,
  NativeFigureSpec,
} from "./nativeDescriptive.contract";
import type { MidProblem } from "../lib/middle/types";

export type NativeAuthorContext = Readonly<{ seed: number; variant: number }>;
export type NativeAuthorDefinition = Omit<
  Extract<NativeDefinition, { revision: 2 }>,
  "unitId"
> & {
  /** A local author is identified by grade/section; a real DB unit is bound only at registration. */
  unitId?: string;
  assessmentObjective: string;
  studentEvidence: readonly string[];
  studyRequirementIds: readonly StudyRequirementId[];
  situation: string;
  subquestions: readonly {
    requirementId: string;
    text: string;
    points: number;
  }[];
};

export type NativeCalculationRequest = NativeAuthorContext & {
  id: string;
  kind: "calculation";
  engine: "middle";
  typeKey: string;
};
export type NativeFigureRequest = {
  id: string;
  kind: "figure" | "graph";
  spec: NativeFigureSpec;
};
export type NativeHelperRequest =
  NativeCalculationRequest | NativeFigureRequest;
export type NativeCalculationOutput = {
  id: string;
  kind: "calculation";
  engine: "middle";
  typeKey: string;
  problem: MidProblem;
};
export type NativeFigureOutput = {
  id: string;
  kind: "figure" | "graph";
  spec: NativeFigureSpec;
  svg: string;
};
export type NativeHelperOutput = NativeCalculationOutput | NativeFigureOutput;
export type NativeHelperResults = ReadonlyMap<string, NativeHelperOutput>;
export type NativeHelperTask = {
  id: string;
  kind: NativeHelperRequest["kind"];
  /** Earlier helper outputs may inform a later request; the author owns that dependency. */
  request(
    context: NativeAuthorContext,
    completed: NativeHelperResults,
  ): NativeHelperRequest;
};
export type NativeHelperResult<T extends NativeHelperOutput> =
  { ok: true; output: T } | { ok: false; error: string };
export type NativeHelperAdapters = {
  calculation(
    request: NativeCalculationRequest,
  ): Promise<NativeHelperResult<NativeCalculationOutput>>;
  figure(
    request: NativeFigureRequest,
  ): Promise<NativeHelperResult<NativeFigureOutput>>;
  graph(
    request: NativeFigureRequest,
  ): Promise<NativeHelperResult<NativeFigureOutput>>;
};

/** Exactly one author supplies the assessment, wording and rubric; helpers never author a task. */
export interface NativePrimaryAuthor {
  definition: NativeAuthorDefinition;
  helpers: readonly NativeHelperTask[];
  compose(
    context: NativeAuthorContext,
    completed: NativeHelperResults,
  ): NativeDescriptiveProblemR2;
}

export type NativeAuthoredTask = {
  authorId: string;
  definition: NativeAuthorDefinition;
  helpers: NativeHelperOutput[];
  problem: NativeDescriptiveProblemR2;
  figureSvg: string | null;
};
