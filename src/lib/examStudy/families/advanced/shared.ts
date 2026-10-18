import type {
  CanonicalParams,
  ExamStudyDraft,
  ExamStudyEvidenceCheck,
  ExamStudyFamily,
  ExamStudyVerification,
  StudyRequirementId,
} from "@/contracts/examStudy.contract";
import type { NativeRubric } from "@/contracts/nativeDescriptive.contract";

export const ADVANCED_VERSION = "1.0.0";
export const BASIC_CHECKS = [
  "independent-solution",
  "essential-conditions",
] as const;
export const range = (lo: number, hi: number) =>
  Array.from({ length: Math.max(0, hi - lo + 1) }, (_, i) => lo + i);
export const setText = (xs: readonly number[]) => `{${xs.join(", ")}}`;
export const listText = (xs: readonly number[]) => `(${xs.join(", ")})`;
export const unique = (xs: readonly number[]) =>
  [...new Set(xs)].sort((a, b) => a - b);
export const sameNumbers = (a: readonly number[], b: readonly number[]) =>
  JSON.stringify(a) === JSON.stringify(b);

export function requireMatch(text: string, pattern: RegExp): RegExpMatchArray {
  const match = text.match(pattern);
  if (!match) throw new Error("필수 발문 조건을 읽을 수 없습니다.");
  return match;
}

export function readNumbers(text: string): number[] {
  if (!/^-?\d+(?:,\s*-?\d+)*$/.test(text.trim()))
    throw new Error("정수 목록이 아닙니다.");
  return text.split(",").map(Number);
}

export function permutations<T>(xs: readonly T[]): T[][] {
  if (xs.length === 0) return [[]];
  return xs.flatMap((x, i) =>
    permutations(xs.filter((_, j) => i !== j)).map((tail) => [x, ...tail]),
  );
}

export function allMaps(xs: readonly number[]): number[][] {
  let maps: number[][] = [[]];
  for (let i = 0; i < xs.length; i++)
    maps = maps.flatMap((map) => xs.map((y) => [...map, y]));
  return maps;
}

export function selectParams(
  domain: readonly CanonicalParams[],
  seed: number,
  variant: number,
): CanonicalParams {
  if (
    !Number.isSafeInteger(seed) ||
    !Number.isSafeInteger(variant) ||
    variant < 0
  )
    throw new Error(
      "seed/variant must be safe integers and variant nonnegative",
    );
  // Every tuple is reachable by variant 0..size-1; formats never enter identity.
  const at =
    ((seed % domain.length) + (variant % domain.length) + domain.length) %
    domain.length;
  return structuredClone(domain[at]!);
}

export function checked(
  checks: readonly ExamStudyEvidenceCheck[],
  inspect: () => void,
): ExamStudyVerification {
  try {
    inspect();
    return { valid: true, checks, errors: [] };
  } catch (error) {
    return {
      valid: false,
      checks: [],
      errors: [error instanceof Error ? error.message : "검산 실패"],
    };
  }
}

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function assertAnswer(item: ExamStudyDraft, expected: string): void {
  assert(
    item.answer === expected,
    "발문을 독립적으로 푼 답과 정답이 다릅니다.",
  );
  assert(item.solution.trim().length >= 35, "풀이가 없습니다.");
}

export interface AuthoredConfig {
  id: string;
  title: string;
  requirement: StudyRequirementId;
  course?: ExamStudyFamily["course"];
  unit: string;
  domain: readonly CanonicalParams[];
  boundaries: readonly string[];
  checks?: readonly ExamStudyEvidenceCheck[];
  written?: boolean;
  figure?: boolean;
  figureKinds?: readonly string[];
  build(params: CanonicalParams): ExamStudyDraft;
  verify(item: ExamStudyDraft): ExamStudyVerification;
}

export function authoredFamily(config: AuthoredConfig): ExamStudyFamily {
  return {
    id: config.id,
    version: ADVANCED_VERSION,
    title: config.title,
    course: config.course ?? "공통수학2",
    unitIds: [config.unit],
    unitSections: [config.unit],
    source: "authored",
    fulfills: [{ requirement: config.requirement, level: "full" }],
    formats: [config.written ? "서술형" : "단답형"],
    difficulties: ["심화하"],
    representation: config.figure ? "figure-required" : "text",
    figureKinds: config.figureKinds ?? (config.figure ? ["graph-1"] : []),
    paramDomain: {
      kind: "finite",
      size: config.domain.length,
      enumerate: () => config.domain,
    },
    evidence: {
      testFile: "src/__tests__/unit/examStudyAdvanced.test.ts",
      sampleCount: config.domain.length,
      boundaryCases: config.boundaries,
      checkedRequirements: [config.requirement],
      checks: config.checks ?? BASIC_CHECKS,
    },
    generate: (seed, variant) =>
      config.build(selectParams(config.domain, seed, variant)),
    canonicalParams: (item) => structuredClone(item.parameters),
    verify: config.verify,
  };
}

export function draft(
  parameters: CanonicalParams,
  content: string,
  answer: string,
  solution: string,
  difficultyBasis: readonly string[],
  extra: Partial<ExamStudyDraft> = {},
): ExamStudyDraft {
  return {
    parameters,
    content,
    answer,
    solution,
    difficultyBasis,
    difficulty: "심화하",
    questionType: "단답형",
    figureSpec: null,
    ...extra,
  };
}

export function rubric(
  criteria: readonly [string, string, string, string][],
): NativeRubric {
  return {
    totalPoints: criteria.length * 2,
    criteria: criteria.map(([criterionId, expected, alternative, error]) => ({
      criterionId,
      expected,
      points: 2,
      alternatives: [alternative],
      errors: [error],
    })),
  };
}

export function checkRubric(
  item: ExamStudyDraft,
  expectedIds: readonly string[],
): void {
  const r = item.rubric;
  assert(
    item.questionType === "서술형" && r,
    "본래 서술형의 채점 기준이 필요합니다.",
  );
  assert(
    sameNumbers([r.totalPoints], [expectedIds.length * 2]),
    "총 배점 오류",
  );
  assert(r.criteria.length === expectedIds.length, "채점 단계 누락");
  for (const [index, criterion] of r.criteria.entries()) {
    assert(
      criterion.criterionId === expectedIds[index] && criterion.points === 2,
      "채점 단계/배점 오류",
    );
    assert(
      criterion.expected.length > 10 &&
        item.solution.includes(criterion.expected),
      "모범 풀이가 채점 기준을 충족하지 않습니다.",
    );
    assert(
      criterion.alternatives.some((s) => s.length > 5) &&
        criterion.errors.some((s) => s.length > 5),
      "허용 다른 풀이/흔한 오류가 없습니다.",
    );
  }
  assert(
    r.criteria.reduce((n, c) => n + c.points, 0) === r.totalPoints,
    "배점 합 오류",
  );
}

/** Exact rational arithmetic for punctured-domain branch/end-point checks. */
export type Fraction = readonly [number, number];
export function fraction(n: number, d = 1): Fraction {
  assert(d !== 0, "분모 0");
  const gcd = (a: number, b: number): number =>
    b === 0 ? Math.abs(a) : gcd(b, a % b);
  const g = gcd(n, d);
  return d < 0 ? [-n / g, -d / g] : [n / g, d / g];
}
export const equalFraction = (x: Fraction, y: Fraction) =>
  x[0] * y[1] === y[0] * x[1];
export const fractionText = (x: Fraction) =>
  x[1] === 1 ? String(x[0]) : `${x[0]}/${x[1]}`;
