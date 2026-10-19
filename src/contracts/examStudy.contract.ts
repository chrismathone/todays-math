import { z } from "zod";
import { DIFFICULTY_LADDER, type Difficulty } from "./difficulty";
import type { NativeRubric } from "./nativeDescriptive.contract";

/** School-independent mathematical demands; school names never enter this vocabulary. */
export const STUDY_REQUIREMENT_IDS = [
  "algebra.linear-simplify",
  "algebra.equation-classification",
  "algebra.equality-truth",
  "algebra.candidate-verification",
  "algebra.linear-model",
  "algebra.natural-parameter",
  "algebra.inequality-solution-count",
  "algebra.shifted-system-coupling",
  "algebra.rational-root-parameter",
  "algebra.absolute-sign-cases",
  "algebra.error-identity",
  "concept.function-uniqueness",
  "coord.sign-quadrant",
  "graph.line-multi-properties",
  "graph.piecewise-multi-claim",
  "graph.translated-coefficient-reuse",
  "graph.parabola-line-chain",
  "graph.rule-translation",
  "coord.shared-side-square",
  "coord.inverse-area-ratio",
  "coord.inverse-equal-legs",
  "coord.ray-area-partition",
  "coord.signed-inverse-trapezoid",
  "coord.intercept-integer-area",
  "coord.intercept-trapezoid-cases",
  "coord.two-lines-dependent-area",
  "model.doubling-time-offset",
  "model.circle-revolution-percentage",
  "number.coprime-symbolic-sum",
  "written.dependent-formula-min-time",
  "written.linear-fuel-model",
  "written.stopped-travel",
  "written.two-work-rates",
  "written.rectangle-domain",
  "logic.truth-set-inclusion-param",
  "logic.intermediate-truth-set-count",
  "function.restricted-quadratic-bijection",
  "function.radical-area-maximum",
  "function.absolute-rational-level-count",
  "function.finite-bijection-chain",
  "function.iterated-finite-range",
  "function.radical-inverse-circle",
  "geometry.split-incenters",
  "geometry.incircle-shaded-area",
  "geometry.two-centers-angle",
  "geometry.arc-ratio-angle",
  "geometry.obtuse-circumcenter",
  "elementary.definition-audit",
  "elementary.visual-data",
  "statistics.shift-spread",
  "algebra.inverse-coefficient-sum",
  "number.inverse-root-table",
  "number.inverse-extreme-range",
] as const;

export const studyRequirementIdSchema = z.enum(STUDY_REQUIREMENT_IDS);
export type StudyRequirementId = (typeof STUDY_REQUIREMENT_IDS)[number];
export const EXAM_STUDY_COURSES = [
  "초3",
  "초4",
  "초5",
  "초6",
  "중1",
  "중2",
  "중3",
  "공통수학1",
  "공통수학2",
] as const;
export const examStudyCourseSchema = z.enum(EXAM_STUDY_COURSES);
export type ExamStudyCourse = (typeof EXAM_STUDY_COURSES)[number];
export const examStudyFormatSchema = z.enum(["객관식", "단답형", "서술형"]);
export type ExamStudyFormat = z.infer<typeof examStudyFormatSchema>;
export type StudyCoverageLevel =
  "full" | "component" | "unverified" | "unavailable";
export type StudyRepresentation =
  "text" | "figure-required" | "figure-optional";

export interface StudyRequirement {
  id: StudyRequirementId;
  title: string;
  concepts: readonly string[];
  conditionTopology: readonly string[];
  representation: StudyRepresentation;
  caseAnalysis: "none" | "enumerate" | "exclude";
  response: readonly ExamStudyFormat[];
  structuralDifficultyBasis: readonly string[];
}

export type CanonicalParam =
  string | number | boolean | null | readonly CanonicalParam[];
export type CanonicalParams = Readonly<Record<string, CanonicalParam>>;
export type ExamStudyEvidenceCheck =
  | "independent-solution"
  | "essential-conditions"
  | "visual-information"
  | "native-rubric";

/** These records point to executable checks; a declaration of full alone grants nothing. */
export interface ExamStudyEvidence {
  testFile: string;
  sampleCount: number;
  boundaryCases: readonly string[];
  checkedRequirements: readonly StudyRequirementId[];
  checks: readonly ExamStudyEvidenceCheck[];
}
export interface ExamStudyVerification {
  valid: boolean;
  checks: readonly ExamStudyEvidenceCheck[];
  errors: readonly string[];
}

/** A factory never supplies SVG or a school-original reference. */
export interface ExamStudyDraft {
  content: string;
  answer: string;
  solution: string;
  questionType: ExamStudyFormat;
  difficulty: Difficulty;
  difficultyBasis: readonly string[];
  parameters: CanonicalParams;
  figureSpec: Record<string, unknown> | null;
  rubric?: NativeRubric;
  /** Used only by the established numeric MC derivation, never to derive written tasks. */
  distractors?: readonly string[];
}

export interface ExamStudyFamily {
  id: string;
  version: string;
  title: string;
  course: ExamStudyCourse;
  unitIds: readonly string[];
  unitSections: readonly string[];
  source: "authored" | "elementary" | "middle" | "high" | "native";
  /** Intended maximum coverage; the planner must lower it when evidence is absent. */
  fulfills: readonly {
    requirement: StudyRequirementId;
    level: "full" | "component";
  }[];
  formats: readonly ExamStudyFormat[];
  /** Empty on legacy adapters whose actual per-question difficulty is checked at generation. */
  difficulties: readonly Difficulty[];
  representation: StudyRepresentation;
  figureKinds: readonly string[];
  paramDomain:
    | {
        kind: "finite";
        size: number;
        enumerate: () => readonly CanonicalParams[];
      }
    | { kind: "sampled"; description: string; maxAttempts: number };
  evidence?: ExamStudyEvidence;
  generate(seed: number, variant: number): ExamStudyDraft;
  canonicalParams(item: ExamStudyDraft): CanonicalParams;
  /** Independent checks read the printed task/spec; generator answer/facts are not an oracle. */
  verify(item: ExamStudyDraft): ExamStudyVerification;
}

export interface ExamStudyProfile {
  id: string;
  version: string;
  schoolId: string;
  schoolName: string;
  aliases: readonly string[];
  region: string;
  course: ExamStudyCourse;
  scope: {
    label: string;
    sourceYear: number;
    semester: 1 | 2;
    round: "중간" | "기말";
    reviewedOn: string;
    visibleCount: number;
    totalCount: number;
    unknownCount: number;
    difficultyCalibration: "unmeasured";
  };
  requirements: readonly { id: StudyRequirementId; weight: number }[];
}

export const EXAM_STUDY_LIMITS = {
  maxQuestions: 30,
  maxFamilies: 40,
  maxAttempts: 360,
  maxRenderRetries: 2,
  maxConcurrentRenders: 2,
  maxRequestBytes: 16_384,
} as const;

const unique = (xs: readonly string[]) => new Set(xs).size === xs.length;
export const examStudyGenerateRequestSchema = z
  .object({
    course: examStudyCourseSchema,
    profileId: z.string().min(1).max(120).optional(),
    /** Display/context only; mathematical seed and plan must ignore this string. */
    schoolName: z.string().trim().min(1).max(80).optional(),
    familyIds: z
      .array(z.string().min(1).max(240))
      .min(1)
      .max(EXAM_STUDY_LIMITS.maxFamilies)
      .refine(unique)
      .optional(),
    requirementIds: z
      .array(studyRequirementIdSchema)
      .min(1)
      .max(STUDY_REQUIREMENT_IDS.length)
      .refine(unique)
      .optional(),
    count: z.number().int().min(1).max(EXAM_STUDY_LIMITS.maxQuestions),
    format: z.enum(["혼합", "객관식", "단답형", "서술형"]).default("혼합"),
    difficulty: z.enum(DIFFICULTY_LADDER).optional(),
    seed: z.number().int().min(0).max(2_147_483_647),
    /** Explicit practice repetition; logical/content duplicates remain prohibited. */
    maxPerFamily: z
      .number()
      .int()
      .min(1)
      .max(EXAM_STUDY_LIMITS.maxQuestions)
      .default(1),
  })
  .strict();
export type ExamStudyGenerateRequest = z.infer<
  typeof examStudyGenerateRequestSchema
>;

export interface ExamStudyItem extends ExamStudyDraft {
  id: string;
  familyId: string;
  familyVersion: string;
  title: string;
  course: ExamStudyCourse;
  unitSections: readonly string[];
  logicalKey: string;
  contentDigest: string;
  seed: number;
  variant: number;
  requirements: readonly StudyRequirementId[];
  figureSvg: string | null;
}

export interface ExamStudyRequirementResult {
  id: StudyRequirementId;
  title: string;
  status: StudyCoverageLevel;
  requested: number;
  delivered: number;
  reason: string | null;
}
export interface ExamStudyGeneration {
  engineVersion: string;
  manifestVersion: string;
  profileId: string | null;
  profileVersion: string | null;
  recipe: ExamStudyGenerateRequest;
  digest: string;
  status: "complete" | "partial" | "unavailable";
  requestedCount: number;
  deliveredCount: number;
  questions: ExamStudyItem[];
  requirements: ExamStudyRequirementResult[];
  warnings: string[];
  schoolEvidence: ExamStudyProfile["scope"] | null;
}

export interface ExamStudyFamilySummary {
  id: string;
  version: string;
  title: string;
  course: ExamStudyCourse;
  unitSections: readonly string[];
  source: ExamStudyFamily["source"];
  formats: readonly ExamStudyFormat[];
  difficulties: readonly Difficulty[];
  representation: StudyRepresentation;
  fulfills: readonly {
    requirement: StudyRequirementId;
    level: StudyCoverageLevel;
  }[];
}
export interface ExamStudyCatalog {
  engineVersion: string;
  manifestVersion: string;
  courses: readonly ExamStudyCourse[];
  families: ExamStudyFamilySummary[];
  requirements: readonly StudyRequirement[];
  profiles: readonly ExamStudyProfile[];
  limits: typeof EXAM_STUDY_LIMITS;
}

/** A server-only caller supplies strict Python figure rendering. No renderer means no figure item. */
export interface ExamStudyGenerateOptions {
  families?: readonly ExamStudyFamily[];
  profiles?: readonly ExamStudyProfile[];
  prepare?: (
    item: ExamStudyDraft,
  ) => Promise<
    { ok: true; figureSvg: string | null } | { ok: false; reason: string }
  >;
}

export const examStudyResolveRequestSchema = z
  .object({
    recipe: examStudyGenerateRequestSchema,
    expectedDigest: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
