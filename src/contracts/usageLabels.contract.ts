import { z } from "zod";
import {
  ARITHMETIC_V2_CATALOG_VERSION,
  arithmeticV2TypeIdSchema,
} from "@/contracts/arithmeticV2.contract";

import {
  ARITHMETIC_CATALOG_VERSION,
  ARITHMETIC_SKILL_OPERATOR,
  type ArithmeticOperator,
  type ArithmeticSkillId,
  oneDigitAddConstraintsSchema,
  oneDigitSubConstraintsSchema,
  twoDigitDivOneConstraintsSchema,
  twoDigitTimesOneConstraintsSchema,
  twoDigitVerticalAddConstraintsSchema,
  twoDigitVerticalSubConstraintsSchema,
  timesTableConstraintsSchema,
} from "@/contracts/arithmetic.contract";
import { isoDateTimeSchema, uuidSchema } from "@/contracts/common.contract";
import { PROBLEM_INELIGIBLE_CODES } from "@/lib/problemEligibility";

/**
 * 문제은행 문항과 연산 유형의 읽기 전용 순위 계약.
 *
 * 순위는 요청에 실린 페이지가 아니라, 같은 차시 또는 같은 연산 기호의
 * 전체 모집단에서 센다. «내 출제»는 이 계정이 만든 확정·인쇄 시험만 센다.
 * 지점이나 반으로 볼 수 있는 다른 교사의 시험은 모집단이 아니다.
 * 시험 초안·미리보기·새로고침은 출제 기록이 아니다.
 * 지금 남아 있는 행만 세며, 지운 사건을 되살리지 않는다.
 */

export const USAGE_LABELS_CONTRACT_VERSION = 1 as const;

export const USAGE_LABEL_REQUEST_LIMIT = 100;
export const USAGE_LABEL_MIN_DISTINCT = 5;
export const USAGE_LABEL_MIN_CANDIDATES = 2;
export const USAGE_LABEL_TOP = 10;
export const USAGE_LABEL_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;
export const USAGE_LABEL_MAX_TESTS = 2_000;
export const USAGE_LABEL_MAX_TEST_LINKS = 20_000;
export const USAGE_LABEL_MAX_DOCUMENTS = 2_000;
export const USAGE_LABEL_MAX_COPY_ROWS = 2_000;
export const USAGE_LABEL_BODY_BYTES = 64 * 1024;
/** 이 계정의 확정·인쇄 시험. 지점으로 열린 다른 교사의 시험은 포함하지 않는다. */
export const USAGE_LABEL_PROBLEM_SCOPE =
  "owner-confirmed-printed-tests" as const;
export const USAGE_LABEL_ARITHMETIC_SCOPE = "owner-arithmetic-sheets" as const;

export const USAGE_LABEL_PERIODS = ["30d", "all"] as const;
export const usageLabelPeriodSchema = z.enum(USAGE_LABEL_PERIODS);
export type UsageLabelPeriod = z.infer<typeof usageLabelPeriodSchema>;

export const USAGE_PROBLEM_STATES = [
  "ranked",
  "unranked",
  "zero",
  "ineligible",
  "unknown",
  "unavailable",
] as const;
export const USAGE_ARITHMETIC_STATES = [
  "ranked",
  "unranked",
  "zero",
  "unknown",
  "unavailable",
] as const;
export const USAGE_LABEL_REASONS = [
  "ranked",
  "below-minimum",
  "sparse-population",
  "outside-top",
  "unused",
  "ineligible",
  "unknown",
  "unavailable",
] as const;

const usageArithmeticTypeSchema = z.discriminatedUnion("skillId", [
  z.strictObject({
    skillId: z.literal("one-digit-add"),
    constraints: oneDigitAddConstraintsSchema,
  }),
  z.strictObject({
    skillId: z.literal("one-digit-sub"),
    constraints: oneDigitSubConstraintsSchema,
  }),
  z.strictObject({
    skillId: z.literal("two-digit-vertical-add"),
    constraints: twoDigitVerticalAddConstraintsSchema,
  }),
  z.strictObject({
    skillId: z.literal("two-digit-vertical-sub"),
    constraints: twoDigitVerticalSubConstraintsSchema,
  }),
  z.strictObject({
    skillId: z.literal("times-table"),
    constraints: timesTableConstraintsSchema,
  }),
  z.strictObject({
    skillId: z.literal("two-digit-times-one"),
    constraints: twoDigitTimesOneConstraintsSchema,
  }),
  z.strictObject({
    skillId: z.literal("two-digit-div-one"),
    constraints: twoDigitDivOneConstraintsSchema,
  }),
]);
export type UsageArithmeticTypeRequest = z.infer<
  typeof usageArithmeticTypeSchema
>;

function arithmeticRequestIdentity(item: UsageArithmeticTypeRequest): string {
  if (item.skillId !== "times-table") {
    return `${item.skillId}:${JSON.stringify(item.constraints)}`;
  }
  return `${item.skillId}:${JSON.stringify({
    ...item.constraints,
    dans: [...item.constraints.dans].sort((left, right) => left - right),
  })}`;
}

export const usageLabelsRequestSchema = z
  .strictObject({
    problemIds: z.array(uuidSchema).max(USAGE_LABEL_REQUEST_LIMIT).optional(),
    arithmeticTypes: z
      .array(usageArithmeticTypeSchema)
      .max(USAGE_LABEL_REQUEST_LIMIT)
      .optional(),
    arithmeticV2TypeIds: z
      .array(arithmeticV2TypeIdSchema)
      .max(USAGE_LABEL_REQUEST_LIMIT)
      .optional(),
    period: usageLabelPeriodSchema.optional(),
    /** Same question's formats share the union of distinct owned test IDs. */
    identity: z.literal("question").optional(),
  })
  .superRefine((value, ctx) => {
    const problemIds = value.problemIds ?? [];
    if (new Set(problemIds).size !== problemIds.length) {
      ctx.addIssue({ code: "custom", message: "usage:duplicate-problem" });
    }
    const types = value.arithmeticTypes ?? [];
    const identities = types.map(arithmeticRequestIdentity);
    if (new Set(identities).size !== identities.length) {
      ctx.addIssue({ code: "custom", message: "usage:duplicate-type" });
    }
    const v2Ids = value.arithmeticV2TypeIds ?? [];
    if (new Set(v2Ids).size !== v2Ids.length)
      ctx.addIssue({ code: "custom", message: "usage:duplicate-type" });
  });
export type UsageLabelsRequest = z.infer<typeof usageLabelsRequestSchema>;

const metricSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
  population: z.string().min(1),
  countUnit: z.enum(["distinct-tests", "distinct-original-documents"]),
  minimumDistinctUses: z.literal(USAGE_LABEL_MIN_DISTINCT),
  minimumObservedCandidates: z.literal(USAGE_LABEL_MIN_CANDIDATES),
  top: z.literal(USAGE_LABEL_TOP),
  tie: z.literal("competition-joint"),
});

export const usageLabelScopeSchema = z.strictObject({
  viewerId: z.string().min(1),
  branchId: z.string().min(1).nullable(),
  problems: z.literal(USAGE_LABEL_PROBLEM_SCOPE),
  arithmetic: z.literal(USAGE_LABEL_ARITHMETIC_SCOPE),
});

export const usageLabelPeriodInfoSchema = z.strictObject({
  id: usageLabelPeriodSchema,
  label: z.string().min(1),
  from: isoDateTimeSchema.nullable(),
  to: isoDateTimeSchema,
  basis: z.literal("retained-created-at"),
  history: z.literal("not-an-event-log"),
  note: z.string().min(1),
});

const rankFields = {
  count: z.number().int().nonnegative().nullable(),
  rank: z.number().int().min(1).max(USAGE_LABEL_TOP).nullable(),
  tied: z.boolean().nullable(),
  label: z.string().min(1).nullable(),
  tooltip: z.string().min(1).nullable(),
  observedCandidates: z.number().int().nonnegative().nullable(),
};

export const usageProblemLabelSchema = z.strictObject({
  problemId: uuidSchema,
  state: z.enum(USAGE_PROBLEM_STATES),
  reason: z.enum(USAGE_LABEL_REASONS),
  unitId: uuidSchema.nullable(),
  unitName: z.string().min(1).nullable(),
  unitGrade: z.string().min(1).nullable(),
  unitChapter: z.string().min(1).nullable(),
  ineligibleCode: z.enum(PROBLEM_INELIGIBLE_CODES).nullable(),
  ...rankFields,
});
export type UsageProblemLabel = z.infer<typeof usageProblemLabelSchema>;

function arithmeticLabel<TSkillId extends ArithmeticSkillId>(
  skillId: TSkillId,
  operator: ArithmeticOperator,
  constraints: z.ZodTypeAny,
) {
  return z.strictObject({
    typeKey: z.string().min(1),
    skillId: z.literal(skillId),
    operator: z.literal(operator),
    catalogVersion: z.literal(ARITHMETIC_CATALOG_VERSION),
    constraints,
    state: z.enum(USAGE_ARITHMETIC_STATES),
    reason: z.enum(USAGE_LABEL_REASONS),
    ...rankFields,
  });
}

export const usageArithmeticLabelSchema = z.discriminatedUnion("skillId", [
  arithmeticLabel(
    "one-digit-add",
    ARITHMETIC_SKILL_OPERATOR["one-digit-add"],
    oneDigitAddConstraintsSchema,
  ),
  arithmeticLabel(
    "one-digit-sub",
    ARITHMETIC_SKILL_OPERATOR["one-digit-sub"],
    oneDigitSubConstraintsSchema,
  ),
  arithmeticLabel(
    "two-digit-vertical-add",
    ARITHMETIC_SKILL_OPERATOR["two-digit-vertical-add"],
    twoDigitVerticalAddConstraintsSchema,
  ),
  arithmeticLabel(
    "two-digit-vertical-sub",
    ARITHMETIC_SKILL_OPERATOR["two-digit-vertical-sub"],
    twoDigitVerticalSubConstraintsSchema,
  ),
  arithmeticLabel(
    "times-table",
    ARITHMETIC_SKILL_OPERATOR["times-table"],
    timesTableConstraintsSchema,
  ),
  arithmeticLabel(
    "two-digit-times-one",
    ARITHMETIC_SKILL_OPERATOR["two-digit-times-one"],
    twoDigitTimesOneConstraintsSchema,
  ),
  arithmeticLabel(
    "two-digit-div-one",
    ARITHMETIC_SKILL_OPERATOR["two-digit-div-one"],
    twoDigitDivOneConstraintsSchema,
  ),
]);
export type UsageArithmeticLabel = z.infer<typeof usageArithmeticLabelSchema>;

export const usageArithmeticV2LabelSchema = z.strictObject({
  typeId: arithmeticV2TypeIdSchema,
  typeKey: z.string().min(1),
  catalogVersion: z.literal(ARITHMETIC_V2_CATALOG_VERSION),
  rankGroup: z.string().min(1).nullable(),
  state: z.enum(USAGE_ARITHMETIC_STATES),
  reason: z.enum(USAGE_LABEL_REASONS),
  ...rankFields,
});
export type UsageArithmeticV2Label = z.infer<
  typeof usageArithmeticV2LabelSchema
>;

export const usageLabelsResponseSchema = z.strictObject({
  contractVersion: z.literal(USAGE_LABELS_CONTRACT_VERSION),
  observedAt: isoDateTimeSchema,
  period: usageLabelPeriodInfoSchema,
  scope: usageLabelScopeSchema,
  metrics: z.strictObject({
    problems: metricSchema.extend({
      id: z.literal("my-confirmed-test-rank"),
      label: z.literal("내 출제"),
      countUnit: z.literal("distinct-tests"),
      group: z.literal("차시"),
    }),
    arithmetic: metricSchema.extend({
      id: z.literal("my-sheet-type-rank"),
      label: z.literal("내 학습지 사용"),
      countUnit: z.literal("distinct-original-documents"),
      group: z.literal("operator"),
      copies: z.literal("excluded"),
    }),
    arithmeticV2: metricSchema
      .extend({
        id: z.literal("my-v2-sheet-type-rank"),
        label: z.literal("내 학습지 사용"),
        countUnit: z.literal("distinct-original-documents"),
        group: z.literal("rankGroup"),
        copies: z.literal("excluded"),
      })
      .optional(),
  }),
  problems: z.array(usageProblemLabelSchema).max(USAGE_LABEL_REQUEST_LIMIT),
  arithmeticTypes: z
    .array(usageArithmeticLabelSchema)
    .max(USAGE_LABEL_REQUEST_LIMIT),
  arithmeticV2Types: z
    .array(usageArithmeticV2LabelSchema)
    .max(USAGE_LABEL_REQUEST_LIMIT)
    .default([]),
});
export type UsageLabelsResponse = z.infer<typeof usageLabelsResponseSchema>;
