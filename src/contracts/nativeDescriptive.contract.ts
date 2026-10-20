/** Native reasoning tasks. This namespace never belongs to derived elem:/mid: rows. */
import type { Difficulty } from "./difficulty";

export const NATIVE_DESCRIPTIVE_FAMILY_PREFIX = "native-desc:";
export const NATIVE_DESCRIPTIVE_EXTERNAL_PREFIX = "engine-native-desc:";
const DEFINITION_ID = /^(?=.{1,64}$)[a-z0-9]+(?:-[a-z0-9]+)*-r[1-9][0-9]*$/;

export function assertNativeDefinitionId(id: string): void {
  if (typeof id !== "string" || !DEFINITION_ID.test(id))
    throw new Error(`Invalid versioned native definitionId: ${id}`);
}

export type NativeExternalParts = {
  definitionId: string;
  seed: number;
  variant: number;
};

export function nativeFamilyKey(definitionId: string): string {
  assertNativeDefinitionId(definitionId);
  return `${NATIVE_DESCRIPTIVE_FAMILY_PREFIX}${definitionId}`;
}

export function nativeExternalId(p: NativeExternalParts): string {
  assertNativeDefinitionId(p.definitionId);
  if (
    !Number.isSafeInteger(p.seed) ||
    !Number.isSafeInteger(p.variant) ||
    p.variant < 0
  )
    throw new Error(
      "Native seed/variant must be safe integers; variant must be nonnegative",
    );
  return `${NATIVE_DESCRIPTIVE_EXTERNAL_PREFIX}${p.definitionId}|s${p.seed}|v${p.variant}`;
}

export function parseNativeExternalId(id: string): NativeExternalParts | null {
  const m = /^engine-native-desc:([^|]+)\|s(-?\d+)\|v(\d+)$/.exec(id);
  if (!m) return null;
  const p = { definitionId: m[1]!, seed: Number(m[2]), variant: Number(m[3]) };
  try {
    return nativeExternalId(p) === id ? p : null;
  } catch {
    return null;
  }
}

export function parseNativeFamilyKey(key: string): string | null {
  if (!key.startsWith(NATIVE_DESCRIPTIVE_FAMILY_PREFIX)) return null;
  const id = key.slice(NATIVE_DESCRIPTIVE_FAMILY_PREFIX.length);
  try {
    assertNativeDefinitionId(id);
    return id;
  } catch {
    return null;
  }
}

export type NativeCriterionLegacy = {
  criterionId: string;
  expected: string;
  points: number;
  alternatives: string[];
  errors: string[];
};
export type NativeCriterionR2 = NativeCriterionLegacy & {
  requirementId: string;
  evidence: string;
  /** One intermediate/result group; several criteria may examine the same group. */
  factKey: string;
  role: "method" | "answer";
  scoring: {
    full: string;
    partial: { points: number; condition: string }[];
    zero: string;
  };
  carryForward: {
    fromFactKeys: string[];
    rule: "preserve-method-points";
    condition: string;
  };
};
export type NativeCriterion = NativeCriterionLegacy | NativeCriterionR2;
export type NativeRubricLegacy = {
  revision?: 1;
  totalPoints: number;
  criteria: NativeCriterionLegacy[];
};
export type NativeRubricR2 = {
  revision: 2;
  totalPoints: number;
  criteria: NativeCriterionR2[];
};
export type NativeRubric = NativeRubricLegacy | NativeRubricR2;
export type NativeGrade = "초4" | "중1" | "중2" | "중3";
export type NativeCurriculum = {
  revision: 2015 | 2022;
  schoolYear: number;
  grade: NativeGrade;
  semester: 1 | 2;
  achievementStandards: { code: string; description: string }[];
};
type NativeDefinitionBase = {
  definitionId: string;
  title: string;
  unitId: string;
  chapter: string;
  unitSection: string;
  difficulty: Difficulty;
  difficultyBasis: string;
  differentAction: string;
  limits: string;
};
export type NativeDefinition = NativeDefinitionBase &
  (
    | { revision?: 1; grade: "초4" | "중3" }
    | { revision: 2; grade: NativeGrade; curriculum: NativeCurriculum }
  );
/** Same open FigureSpec envelope as problem.contract.ts. The figure engine owns its shape. */
export type NativeFigureSpec = Record<string, unknown>;
export type NativePrintedProblem = Readonly<{
  content: string;
  figureSpec: NativeFigureSpec | null;
}>;
export type NativeFact = {
  factKey: string;
  kind: "given" | "intermediate" | "answer";
  /** Canonical value, not a rounded display percentage or generator-only hidden fact. */
  value: string;
  unit?: string;
};
export type NativeRequirement = {
  requirementId: string;
  /** Exact span of the printed question; IDs themselves need not be printed. */
  text: string;
  criterionIds: string[];
};
export type NativeReasoningStep = {
  stepId: string;
  kind: "deduction" | "restatement" | "unit-only" | "line-break";
  inputFactKeys: string[];
  relation: string;
  outputFactKey: string;
};
type NativeDescriptiveBase = NativeExternalParts & {
  familyKey: string;
  externalId: string;
  questionType: "서술형";
  problemType: "개념" | "활용";
  content: string;
  answer: string;
  modelAnswer: string;
  solution: string;
};
export type NativeDescriptiveProblemR2 = NativeDescriptiveBase & {
  revision: 2;
  rubric: NativeRubricR2;
  figureSpec: NativeFigureSpec | null;
  curriculum: NativeCurriculum;
  requirements: NativeRequirement[];
  facts: NativeFact[];
  steps: NativeReasoningStep[];
};
export type NativeDescriptiveProblem = NativeDescriptiveBase &
  (
    | { revision?: 1; rubric: NativeRubricLegacy; figureSpec: null }
    | Omit<NativeDescriptiveProblemR2, keyof NativeDescriptiveBase>
  );

const record = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new Error("Expected native object");
  return v as Record<string, unknown>;
};
const nonempty = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;
const strings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every(nonempty);
const unique = (xs: readonly string[]) => new Set(xs).size === xs.length;

export function assertNativeRubric(
  value: unknown,
): asserts value is NativeRubric {
  const r = record(value);
  if (
    (r.revision !== undefined && r.revision !== 1 && r.revision !== 2) ||
    !Number.isInteger(r.totalPoints) ||
    !Array.isArray(r.criteria) ||
    !r.criteria.length
  )
    throw new Error("Invalid native rubric");
  const ids: string[] = [];
  let sum = 0;
  for (const raw of r.criteria) {
    const c = record(raw);
    if (
      !nonempty(c.criterionId) ||
      !nonempty(c.expected) ||
      !Number.isInteger(c.points) ||
      (c.points as number) < 1 ||
      !strings(c.alternatives) ||
      !c.alternatives.length ||
      !strings(c.errors) ||
      !c.errors.length
    )
      throw new Error("Invalid native criterion");
    ids.push(c.criterionId);
    sum += c.points as number;
    if (
      r.revision !== 2 &&
      [
        "requirementId",
        "evidence",
        "factKey",
        "role",
        "scoring",
        "carryForward",
      ].some((key) => key in c)
    )
      throw new Error("Native r2 criterion requires rubric revision 2");
    if (r.revision === 2) {
      const scoring = record(c.scoring),
        carry = record(c.carryForward);
      // Empty predecessors are valid for independent subquestions. G2 checks
      // protection against the problem's actual reasoning dependencies.
      if (
        !nonempty(c.requirementId) ||
        !nonempty(c.evidence) ||
        !nonempty(c.factKey) ||
        !["method", "answer"].includes(c.role as string) ||
        !nonempty(scoring.full) ||
        !nonempty(scoring.zero) ||
        !Array.isArray(scoring.partial) ||
        ((c.points as number) > 1 && !scoring.partial.length) ||
        !strings(carry.fromFactKeys) ||
        !unique(carry.fromFactKeys) ||
        carry.rule !== "preserve-method-points" ||
        !nonempty(carry.condition)
      )
        throw new Error("Incomplete native r2 criterion");
      const partialPoints: number[] = [];
      for (const rawPartial of scoring.partial) {
        const part = record(rawPartial);
        if (
          !Number.isInteger(part.points) ||
          (part.points as number) <= 0 ||
          (part.points as number) >= (c.points as number) ||
          !nonempty(part.condition)
        )
          throw new Error("Invalid native partial score");
        partialPoints.push(part.points as number);
      }
      if (new Set(partialPoints).size !== partialPoints.length)
        throw new Error("Duplicate partial score");
    }
  }
  if (!unique(ids) || sum !== r.totalPoints)
    throw new Error("Invalid native rubric sum/IDs");
}

/** Read authored JSON without upgrading legacy payloads or changing stored solution bytes. */
export function parseNativeDescriptiveProblem(
  value: unknown,
): NativeDescriptiveProblem {
  const p = record(value);
  const parts =
    typeof p.externalId === "string"
      ? parseNativeExternalId(p.externalId)
      : null;
  if (
    !parts ||
    p.definitionId !== parts.definitionId ||
    p.seed !== parts.seed ||
    p.variant !== parts.variant ||
    p.familyKey !== nativeFamilyKey(parts.definitionId) ||
    p.questionType !== "서술형" ||
    !["개념", "활용"].includes(p.problemType as string) ||
    ![p.content, p.answer, p.modelAnswer, p.solution].every(nonempty)
  )
    throw new Error("Invalid native problem");
  assertNativeRubric(p.rubric);
  if (p.revision === 2) {
    const c = record(p.curriculum);
    if (
      p.rubric.revision !== 2 ||
      ![2015, 2022].includes(c.revision as number) ||
      !Number.isSafeInteger(c.schoolYear) ||
      (c.schoolYear as number) < 2000 ||
      !["초4", "중1", "중2", "중3"].includes(c.grade as string) ||
      ![1, 2].includes(c.semester as number) ||
      !Array.isArray(c.achievementStandards) ||
      !c.achievementStandards.length ||
      c.achievementStandards.some(
        (s) => !nonempty(record(s).code) || !nonempty(record(s).description),
      )
    )
      throw new Error("Invalid native curriculum");
    if (p.figureSpec !== null) record(p.figureSpec);
    if (
      !Array.isArray(p.requirements) ||
      !p.requirements.length ||
      p.requirements.some((raw) => {
        const r = record(raw);
        return (
          !nonempty(r.requirementId) ||
          !nonempty(r.text) ||
          !strings(r.criterionIds) ||
          !r.criterionIds.length
        );
      }) ||
      !Array.isArray(p.facts) ||
      !p.facts.length ||
      p.facts.some((raw) => {
        const f = record(raw);
        return (
          !nonempty(f.factKey) ||
          !nonempty(f.value) ||
          !["given", "intermediate", "answer"].includes(f.kind as string) ||
          (f.unit !== undefined && !nonempty(f.unit))
        );
      }) ||
      !Array.isArray(p.steps) ||
      !p.steps.length ||
      p.steps.some((raw) => {
        const s = record(raw);
        return (
          !nonempty(s.stepId) ||
          !strings(s.inputFactKeys) ||
          !s.inputFactKeys.length ||
          !nonempty(s.relation) ||
          !nonempty(s.outputFactKey) ||
          !["deduction", "restatement", "unit-only", "line-break"].includes(
            s.kind as string,
          )
        );
      })
    )
      throw new Error("Invalid native r2 evidence/steps");
  } else if (
    (p.revision !== undefined && p.revision !== 1) ||
    p.rubric.revision === 2 ||
    p.figureSpec !== null ||
    ["curriculum", "requirements", "facts", "steps"].some((key) => key in p)
  ) {
    throw new Error("Invalid native legacy revision");
  }
  return value as NativeDescriptiveProblem;
}

/** Structured authorship stays outside student content; existing teacher solution retains it. */
export function serializeNativeSolution(
  modelAnswer: string,
  rubric: NativeRubric,
): string {
  assertNativeRubric(rubric);
  if (rubric.revision === 2) {
    return (
      `${modelAnswer}\n\n채점 기준 (총 ${rubric.totalPoints}점)\n` +
      rubric.criteria
        .map(
          (c, i) =>
            `□ 기준 ${i + 1} (${c.points}점): ${c.expected} / 볼 증거: ${c.evidence} / 만점: ${c.scoring.full} / 부분: ${c.scoring.partial.map((p) => `${p.points}점 ${p.condition}`).join("; ") || "없음"} / 0점: ${c.scoring.zero} / 허용 다른 풀이: ${c.alternatives.join("; ")} / 흔한 오류: ${c.errors.join("; ")} / 선행 오류: ${c.carryForward.fromFactKeys.length ? `${c.carryForward.condition}; 앞 수치 오류를 뒤 기준의 방법 점수에서 다시 감점하지 않는다` : "선행 기준 없음"}`,
        )
        .join("\n")
    );
  }
  return (
    `${modelAnswer}\n\n채점 기준 (총 ${rubric.totalPoints}점)\n` +
    rubric.criteria
      .map(
        (c) =>
          `${c.criterionId} (${c.points}점): ${c.expected} / 허용 다른 풀이: ${c.alternatives.join("; ")} / 흔한 오류: ${c.errors.join("; ")}`,
      )
      .join("\n")
  );
}
