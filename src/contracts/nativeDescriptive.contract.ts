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

export type NativeCriterion = {
  criterionId: string;
  expected: string;
  points: number;
  alternatives: string[];
  errors: string[];
};
export type NativeRubric = { totalPoints: number; criteria: NativeCriterion[] };
export type NativeDefinition = {
  definitionId: string;
  title: string;
  unitId: string;
  grade: "초4" | "중3";
  chapter: string;
  unitSection: string;
  difficulty: Difficulty;
  difficultyBasis: string;
  differentAction: string;
  limits: string;
};
export type NativeDescriptiveProblem = NativeExternalParts & {
  familyKey: string;
  externalId: string;
  questionType: "서술형";
  problemType: "개념" | "활용";
  content: string;
  answer: string;
  modelAnswer: string;
  solution: string;
  rubric: NativeRubric;
  figureSpec: null;
};

/** Structured authorship stays outside student content; existing teacher solution retains it. */
export function serializeNativeSolution(
  modelAnswer: string,
  rubric: NativeRubric,
): string {
  if (
    !rubric.criteria.length ||
    new Set(rubric.criteria.map((c) => c.criterionId)).size !==
      rubric.criteria.length ||
    rubric.criteria.some(
      (c) =>
        !c.criterionId ||
        !c.expected ||
        !Number.isInteger(c.points) ||
        c.points <= 0 ||
        !c.alternatives.length ||
        !c.errors.length,
    ) ||
    rubric.criteria.reduce((n, c) => n + c.points, 0) !== rubric.totalPoints
  )
    throw new Error("Invalid native rubric");
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
