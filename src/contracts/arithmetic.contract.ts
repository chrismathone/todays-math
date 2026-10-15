import { z } from "zod";

/**
 * 연산대장 첫 출시의 명세 계약.
 *
 * 문항은 문제은행 행이나 기존 초등·중등 장의 산출이 아니다. 공개 명세에는
 * 풀이(`solution`)와 정답을 넣지 않는다. 정답은 학습지 스냅샷에만 둔다.
 */

export const ARITHMETIC_ENGINE_VERSION = "arithmetic-engine-v1" as const;
export const ARITHMETIC_CATALOG_VERSION = "arithmetic-catalog-v1" as const;
export const ARITHMETIC_SHEET_PAYLOAD_VERSION = 1 as const;
export const ARITHMETIC_SHEET_KIND = "arithmeticSheet" as const;

export const ARITHMETIC_MAX_ITEMS_PER_ROUND = 200;
export const ARITHMETIC_MAX_ROUNDS = 10;
export const ARITHMETIC_MAX_ITEMS_TOTAL =
  ARITHMETIC_MAX_ROUNDS * ARITHMETIC_MAX_ITEMS_PER_ROUND;
/** Historical sheets may have 20 rounds. This is a reader floor, not a writer limit. */
export const ARITHMETIC_MAX_SAVED_ROUNDS = 20;
export const ARITHMETIC_MAX_SEED_LENGTH = 128;
/** 조건 조합을 세거나 고를 때 이 횟수를 넘기면 생성을 멈춘다. */
export const ARITHMETIC_MAX_DOMAIN_SCAN = 10_000;

export const ARITHMETIC_ONE_DIGIT = { min: 0, max: 9 } as const;
export const ARITHMETIC_TWO_DIGIT = { min: 10, max: 99 } as const;
export const ARITHMETIC_FACTOR = { min: 1, max: 9 } as const;

export const ARITHMETIC_SKILL_IDS = [
  "one-digit-add",
  "one-digit-sub",
  "two-digit-vertical-add",
  "two-digit-vertical-sub",
  "times-table",
  "two-digit-times-one",
  "two-digit-div-one",
] as const;
export type ArithmeticSkillId = (typeof ARITHMETIC_SKILL_IDS)[number];

export const ARITHMETIC_SKILL_OPERATOR = {
  "one-digit-add": "+",
  "one-digit-sub": "-",
  "two-digit-vertical-add": "+",
  "two-digit-vertical-sub": "-",
  "times-table": "×",
  "two-digit-times-one": "×",
  "two-digit-div-one": "÷",
} as const satisfies Record<ArithmeticSkillId, "+" | "-" | "×" | "÷">;

export const ARITHMETIC_SKILL_NOTATION = {
  "one-digit-add": "horizontal",
  "one-digit-sub": "horizontal",
  "two-digit-vertical-add": "vertical",
  "two-digit-vertical-sub": "vertical",
  "times-table": "horizontal",
  "two-digit-times-one": "horizontal",
  "two-digit-div-one": "horizontal",
} as const satisfies Record<ArithmeticSkillId, "horizontal" | "vertical">;

export type ArithmeticOperator =
  (typeof ARITHMETIC_SKILL_OPERATOR)[ArithmeticSkillId];
export type ArithmeticNotation =
  (typeof ARITHMETIC_SKILL_NOTATION)[ArithmeticSkillId];

export type ArithmeticRange = { min: number; max: number };

export function isArithmeticSkillId(
  value: unknown,
): value is ArithmeticSkillId {
  return (
    typeof value === "string" &&
    (ARITHMETIC_SKILL_IDS as readonly string[]).includes(value)
  );
}

export function arithmeticIdentityKey(
  skillId: ArithmeticSkillId,
  operands: readonly [number, number],
): string {
  return `${skillId}:${operands[0]}:${operands[1]}`;
}

function rangeSchema(bounds: { min: number; max: number }) {
  return z
    .strictObject({
      min: z.number().int(),
      max: z.number().int(),
    })
    .superRefine((range, ctx) => {
      if (
        range.min > range.max ||
        range.min < bounds.min ||
        range.max > bounds.max
      ) {
        ctx.addIssue({
          code: "custom",
          message: "arithmetic:unsupported-constraint",
        });
      }
    });
}

const countSchema = z.number().int().min(1).max(ARITHMETIC_MAX_ITEMS_PER_ROUND);

export const arithmeticSeedSchema = z.string().regex(/^[\x20-\x7E]{1,128}$/);

export const arithmeticAnswerSchema = z.string().regex(/^(0|[1-9][0-9]{0,2})$/);

export const oneDigitAddConstraintsSchema = z.strictObject({
  carry: z.enum(["none", "some"]),
  left: rangeSchema(ARITHMETIC_ONE_DIGIT),
  right: rangeSchema(ARITHMETIC_ONE_DIGIT),
});

export const oneDigitSubConstraintsSchema = z.strictObject({
  minuend: rangeSchema(ARITHMETIC_ONE_DIGIT),
  subtrahend: rangeSchema(ARITHMETIC_ONE_DIGIT),
});

export const twoDigitVerticalAddConstraintsSchema = z.strictObject({
  carryCount: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  left: rangeSchema(ARITHMETIC_TWO_DIGIT),
  right: rangeSchema(ARITHMETIC_TWO_DIGIT),
});

export const twoDigitVerticalSubConstraintsSchema = z.strictObject({
  borrowCount: z.union([z.literal(0), z.literal(1)]),
  minuend: rangeSchema(ARITHMETIC_TWO_DIGIT),
  subtrahend: rangeSchema(ARITHMETIC_TWO_DIGIT),
});

export const timesTableConstraintsSchema = z.strictObject({
  dans: z
    .array(
      z.number().int().min(ARITHMETIC_FACTOR.min).max(ARITHMETIC_FACTOR.max),
    )
    .min(1)
    .max(ARITHMETIC_FACTOR.max)
    .superRefine((dans, ctx) => {
      if (new Set(dans).size !== dans.length) {
        ctx.addIssue({
          code: "custom",
          message: "arithmetic:unsupported-constraint",
        });
      }
    }),
  multiplier: rangeSchema(ARITHMETIC_FACTOR),
});

export const twoDigitTimesOneConstraintsSchema = z.strictObject({
  carryCount: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  multiplicand: rangeSchema(ARITHMETIC_TWO_DIGIT),
  multiplier: rangeSchema(ARITHMETIC_FACTOR),
});

export const twoDigitDivOneConstraintsSchema = z.strictObject({
  dividend: rangeSchema(ARITHMETIC_TWO_DIGIT),
  divisor: rangeSchema(ARITHMETIC_FACTOR),
});

export const arithmeticConstraintSchemaBySkill = {
  "one-digit-add": oneDigitAddConstraintsSchema,
  "one-digit-sub": oneDigitSubConstraintsSchema,
  "two-digit-vertical-add": twoDigitVerticalAddConstraintsSchema,
  "two-digit-vertical-sub": twoDigitVerticalSubConstraintsSchema,
  "times-table": timesTableConstraintsSchema,
  "two-digit-times-one": twoDigitTimesOneConstraintsSchema,
  "two-digit-div-one": twoDigitDivOneConstraintsSchema,
} as const;

export type ArithmeticOneDigitAddConstraints = z.infer<
  typeof oneDigitAddConstraintsSchema
>;
export type ArithmeticOneDigitSubConstraints = z.infer<
  typeof oneDigitSubConstraintsSchema
>;
export type ArithmeticTwoDigitVerticalAddConstraints = z.infer<
  typeof twoDigitVerticalAddConstraintsSchema
>;
export type ArithmeticTwoDigitVerticalSubConstraints = z.infer<
  typeof twoDigitVerticalSubConstraintsSchema
>;
export type ArithmeticTimesTableConstraints = z.infer<
  typeof timesTableConstraintsSchema
>;
export type ArithmeticTwoDigitTimesOneConstraints = z.infer<
  typeof twoDigitTimesOneConstraintsSchema
>;
export type ArithmeticTwoDigitDivOneConstraints = z.infer<
  typeof twoDigitDivOneConstraintsSchema
>;

export type ArithmeticConstraintsBySkill = {
  "one-digit-add": ArithmeticOneDigitAddConstraints;
  "one-digit-sub": ArithmeticOneDigitSubConstraints;
  "two-digit-vertical-add": ArithmeticTwoDigitVerticalAddConstraints;
  "two-digit-vertical-sub": ArithmeticTwoDigitVerticalSubConstraints;
  "times-table": ArithmeticTimesTableConstraints;
  "two-digit-times-one": ArithmeticTwoDigitTimesOneConstraints;
  "two-digit-div-one": ArithmeticTwoDigitDivOneConstraints;
};

export type ArithmeticConstraints =
  ArithmeticConstraintsBySkill[ArithmeticSkillId];

export type ArithmeticSkillSelection = {
  [TSkillId in ArithmeticSkillId]: {
    skillId: TSkillId;
    constraints: ArithmeticConstraintsBySkill[TSkillId];
  };
}[ArithmeticSkillId];

export type ArithmeticAllocation = ArithmeticSkillSelection & { count: number };

const allocationSchema = z.discriminatedUnion("skillId", [
  z.strictObject({
    skillId: z.literal("one-digit-add"),
    count: countSchema,
    constraints: oneDigitAddConstraintsSchema,
  }),
  z.strictObject({
    skillId: z.literal("one-digit-sub"),
    count: countSchema,
    constraints: oneDigitSubConstraintsSchema,
  }),
  z.strictObject({
    skillId: z.literal("two-digit-vertical-add"),
    count: countSchema,
    constraints: twoDigitVerticalAddConstraintsSchema,
  }),
  z.strictObject({
    skillId: z.literal("two-digit-vertical-sub"),
    count: countSchema,
    constraints: twoDigitVerticalSubConstraintsSchema,
  }),
  z.strictObject({
    skillId: z.literal("times-table"),
    count: countSchema,
    constraints: timesTableConstraintsSchema,
  }),
  z.strictObject({
    skillId: z.literal("two-digit-times-one"),
    count: countSchema,
    constraints: twoDigitTimesOneConstraintsSchema,
  }),
  z.strictObject({
    skillId: z.literal("two-digit-div-one"),
    count: countSchema,
    constraints: twoDigitDivOneConstraintsSchema,
  }),
]);

export const arithmeticGenerateRequestSchema = z
  .strictObject({
    engineVersion: z.literal(ARITHMETIC_ENGINE_VERSION),
    catalogVersion: z.literal(ARITHMETIC_CATALOG_VERSION),
    seed: arithmeticSeedSchema,
    rounds: z
      .array(
        z.strictObject({
          skills: z
            .array(allocationSchema)
            .min(1)
            .max(ARITHMETIC_MAX_ITEMS_PER_ROUND),
        }),
      )
      .min(1)
      .max(ARITHMETIC_MAX_ROUNDS),
  })
  .superRefine((request, ctx) => {
    let total = 0;
    request.rounds.forEach((round, roundIndex) => {
      const roundCount = round.skills.reduce(
        (sum, skill) => sum + skill.count,
        0,
      );
      total += roundCount;
      if (roundCount > ARITHMETIC_MAX_ITEMS_PER_ROUND) {
        ctx.addIssue({
          code: "custom",
          path: ["rounds", roundIndex],
          message: "arithmetic:limit",
        });
      }
    });
    if (total > ARITHMETIC_MAX_ITEMS_TOTAL) {
      ctx.addIssue({
        code: "custom",
        path: ["rounds"],
        message: "arithmetic:limit",
      });
    }
  });

export type ArithmeticGenerateRequest = z.infer<
  typeof arithmeticGenerateRequestSchema
>;

export const arithmeticConstraintsSchema = z.union([
  oneDigitAddConstraintsSchema,
  oneDigitSubConstraintsSchema,
  twoDigitVerticalAddConstraintsSchema,
  twoDigitVerticalSubConstraintsSchema,
  timesTableConstraintsSchema,
  twoDigitTimesOneConstraintsSchema,
  twoDigitDivOneConstraintsSchema,
]);

export const arithmeticSpecSchema = z
  .strictObject({
    engineVersion: z.literal(ARITHMETIC_ENGINE_VERSION),
    catalogVersion: z.literal(ARITHMETIC_CATALOG_VERSION),
    skillId: z.enum(ARITHMETIC_SKILL_IDS),
    constraints: arithmeticConstraintsSchema,
    operator: z.enum(["+", "-", "×", "÷"]),
    operands: z.tuple([z.number().int(), z.number().int()]),
    seed: arithmeticSeedSchema,
    round: z.number().int().min(1).max(ARITHMETIC_MAX_SAVED_ROUNDS),
    order: z.number().int().min(1).max(ARITHMETIC_MAX_ITEMS_PER_ROUND),
  })
  .superRefine((spec, ctx) => {
    if (spec.operator !== ARITHMETIC_SKILL_OPERATOR[spec.skillId]) {
      ctx.addIssue({
        code: "custom",
        path: ["operator"],
        message: "arithmetic:operator",
      });
    }
    const constraints = arithmeticConstraintSchemaBySkill[
      spec.skillId
    ].safeParse(spec.constraints);
    if (!constraints.success) {
      ctx.addIssue({
        code: "custom",
        path: ["constraints"],
        message: "arithmetic:unsupported-constraint",
      });
    }
  });

export type ArithmeticSpec = z.infer<typeof arithmeticSpecSchema>;

const horizontalPromptSchema = z.strictObject({
  notation: z.literal("horizontal"),
  operator: z.enum(["+", "-", "×", "÷"]),
  operands: z.tuple([z.number().int(), z.number().int()]),
  expression: z.string().regex(/^\d{1,2}[+\-×÷]\d{1,2}$/),
});

const verticalPromptSchema = z.strictObject({
  notation: z.literal("vertical"),
  operator: z.enum(["+", "-"]),
  operands: z.tuple([z.number().int(), z.number().int()]),
  rows: z.tuple([z.string().regex(/^\d{2}$/), z.string().regex(/^\d{2}$/)]),
});

export const arithmeticPromptSchema = z.discriminatedUnion("notation", [
  horizontalPromptSchema,
  verticalPromptSchema,
]);
export type ArithmeticPrompt = z.infer<typeof arithmeticPromptSchema>;
