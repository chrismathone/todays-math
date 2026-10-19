import {
  type ArithmeticConstraintsBySkill,
  type ArithmeticSkillId,
  type ArithmeticSkillSelection,
  isArithmeticSkillId,
  arithmeticConstraintSchemaBySkill,
} from "@/contracts/arithmetic.contract";
import { ArithmeticEngineError } from "@/lib/arithmetic/errors";

function copyRange(range: { min: number; max: number }) {
  return { min: range.min, max: range.max };
}

export function parseArithmeticSelection(
  skillId: unknown,
  constraints: unknown,
): ArithmeticSkillSelection {
  if (!isArithmeticSkillId(skillId)) {
    throw new ArithmeticEngineError("unsupported-skill");
  }
  return parseKnownSelection(skillId, constraints);
}

function parseKnownSelection<TSkillId extends ArithmeticSkillId>(
  skillId: TSkillId,
  constraints: unknown,
): Extract<ArithmeticSkillSelection, { skillId: TSkillId }> {
  const parsed = arithmeticConstraintSchemaBySkill[skillId].safeParse(constraints);
  if (!parsed.success) throw new ArithmeticEngineError("unsupported-constraint");
  switch (skillId) {
    case "one-digit-add": {
      const value = parsed.data as ArithmeticConstraintsBySkill["one-digit-add"];
      return {
        skillId,
        constraints: {
          carry: value.carry,
          left: copyRange(value.left),
          right: copyRange(value.right),
        },
      } as Extract<ArithmeticSkillSelection, { skillId: TSkillId }>;
    }
    case "one-digit-sub": {
      const value = parsed.data as ArithmeticConstraintsBySkill["one-digit-sub"];
      return {
        skillId,
        constraints: {
          minuend: copyRange(value.minuend),
          subtrahend: copyRange(value.subtrahend),
        },
      } as Extract<ArithmeticSkillSelection, { skillId: TSkillId }>;
    }
    case "two-digit-vertical-add": {
      const value =
        parsed.data as ArithmeticConstraintsBySkill["two-digit-vertical-add"];
      return {
        skillId,
        constraints: {
          carryCount: value.carryCount,
          left: copyRange(value.left),
          right: copyRange(value.right),
        },
      } as Extract<ArithmeticSkillSelection, { skillId: TSkillId }>;
    }
    case "two-digit-vertical-sub": {
      const value =
        parsed.data as ArithmeticConstraintsBySkill["two-digit-vertical-sub"];
      return {
        skillId,
        constraints: {
          borrowCount: value.borrowCount,
          minuend: copyRange(value.minuend),
          subtrahend: copyRange(value.subtrahend),
        },
      } as Extract<ArithmeticSkillSelection, { skillId: TSkillId }>;
    }
    case "times-table": {
      const value = parsed.data as ArithmeticConstraintsBySkill["times-table"];
      return {
        skillId,
        constraints: {
          dans: [...value.dans].sort((left, right) => left - right),
          multiplier: copyRange(value.multiplier),
        },
      } as Extract<ArithmeticSkillSelection, { skillId: TSkillId }>;
    }
    case "two-digit-times-one": {
      const value =
        parsed.data as ArithmeticConstraintsBySkill["two-digit-times-one"];
      return {
        skillId,
        constraints: {
          carryCount: value.carryCount,
          multiplicand: copyRange(value.multiplicand),
          multiplier: copyRange(value.multiplier),
        },
      } as Extract<ArithmeticSkillSelection, { skillId: TSkillId }>;
    }
    case "two-digit-div-one": {
      const value =
        parsed.data as ArithmeticConstraintsBySkill["two-digit-div-one"];
      return {
        skillId,
        constraints: {
          dividend: copyRange(value.dividend),
          divisor: copyRange(value.divisor),
        },
      } as Extract<ArithmeticSkillSelection, { skillId: TSkillId }>;
    }
    default: {
      const neverSkill: never = skillId;
      throw new ArithmeticEngineError(
        neverSkill === undefined ? "unsupported-skill" : "unsupported-skill",
      );
    }
  }
}
