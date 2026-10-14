import {
  ARITHMETIC_FACTOR,
  ARITHMETIC_ONE_DIGIT,
  ARITHMETIC_SKILL_IDS,
  ARITHMETIC_SKILL_NOTATION,
  ARITHMETIC_SKILL_OPERATOR,
  ARITHMETIC_TWO_DIGIT,
  type ArithmeticConstraintsBySkill,
  type ArithmeticSkillId,
} from "@/contracts/arithmetic.contract";
import { ArithmeticEngineError } from "@/lib/arithmetic/errors";

export type ArithmeticSkillCatalogEntry = {
  skillId: ArithmeticSkillId;
  label: string;
  purpose: string;
  prerequisites: readonly ArithmeticSkillId[];
  notation: "horizontal" | "vertical";
  operator: "+" | "-" | "×" | "÷";
  answerFormat: "nonnegative-integer";
  conditionSummary: string;
};

const CATALOG: readonly ArithmeticSkillCatalogEntry[] = [
  {
    skillId: "one-digit-add",
    label: "한 자리 덧셈",
    purpose: "한 자리 수의 덧셈을 받아올림 없음 또는 있음으로 연습한다.",
    prerequisites: [],
    notation: ARITHMETIC_SKILL_NOTATION["one-digit-add"],
    operator: ARITHMETIC_SKILL_OPERATOR["one-digit-add"],
    answerFormat: "nonnegative-integer",
    conditionSummary: `받아올림 없음 또는 있음. 피연산자는 ${ARITHMETIC_ONE_DIGIT.min}부터 ${ARITHMETIC_ONE_DIGIT.max}까지.`,
  },
  {
    skillId: "one-digit-sub",
    label: "한 자리 뺄셈",
    purpose: "한 자리 수의 뺄셈을 결과가 0 이상이 되도록 연습한다.",
    prerequisites: ["one-digit-add"],
    notation: ARITHMETIC_SKILL_NOTATION["one-digit-sub"],
    operator: ARITHMETIC_SKILL_OPERATOR["one-digit-sub"],
    answerFormat: "nonnegative-integer",
    conditionSummary: `결과는 0 이상. 피감수와 감수는 ${ARITHMETIC_ONE_DIGIT.min}부터 ${ARITHMETIC_ONE_DIGIT.max}까지.`,
  },
  {
    skillId: "two-digit-vertical-add",
    label: "두 자리 세로 덧셈",
    purpose: "두 자리 수의 세로 덧셈을 받아올림 횟수 0, 1, 2로 연습한다.",
    prerequisites: ["one-digit-add"],
    notation: ARITHMETIC_SKILL_NOTATION["two-digit-vertical-add"],
    operator: ARITHMETIC_SKILL_OPERATOR["two-digit-vertical-add"],
    answerFormat: "nonnegative-integer",
    conditionSummary: `받아올림 횟수 0, 1, 2. 피연산자는 ${ARITHMETIC_TWO_DIGIT.min}부터 ${ARITHMETIC_TWO_DIGIT.max}까지.`,
  },
  {
    skillId: "two-digit-vertical-sub",
    label: "두 자리 세로 뺄셈",
    purpose: "두 자리 수의 세로 뺄셈을 받아내림 0 또는 1과 0 이상인 결과로 연습한다.",
    prerequisites: ["one-digit-sub", "two-digit-vertical-add"],
    notation: ARITHMETIC_SKILL_NOTATION["two-digit-vertical-sub"],
    operator: ARITHMETIC_SKILL_OPERATOR["two-digit-vertical-sub"],
    answerFormat: "nonnegative-integer",
    conditionSummary: `받아내림 0 또는 1. 결과는 0 이상. 피연산자는 ${ARITHMETIC_TWO_DIGIT.min}부터 ${ARITHMETIC_TWO_DIGIT.max}까지.`,
  },
  {
    skillId: "times-table",
    label: "곱셈구구",
    purpose: "고른 단과 곱하는 수 범위의 곱셈구구를 연습한다.",
    prerequisites: ["one-digit-add"],
    notation: ARITHMETIC_SKILL_NOTATION["times-table"],
    operator: ARITHMETIC_SKILL_OPERATOR["times-table"],
    answerFormat: "nonnegative-integer",
    conditionSummary: `단과 곱하는 수는 ${ARITHMETIC_FACTOR.min}부터 ${ARITHMETIC_FACTOR.max}까지.`,
  },
  {
    skillId: "two-digit-times-one",
    label: "두 자리 수 곱하기 한 자리 수",
    purpose: "두 자리 수와 한 자리 수의 곱을 받아올림 횟수와 범위로 연습한다.",
    prerequisites: ["times-table"],
    notation: ARITHMETIC_SKILL_NOTATION["two-digit-times-one"],
    operator: ARITHMETIC_SKILL_OPERATOR["two-digit-times-one"],
    answerFormat: "nonnegative-integer",
    conditionSummary: `받아올림 횟수 0, 1, 2. 두 자리 수는 ${ARITHMETIC_TWO_DIGIT.min}부터 ${ARITHMETIC_TWO_DIGIT.max}, 한 자리 수는 ${ARITHMETIC_FACTOR.min}부터 ${ARITHMETIC_FACTOR.max}.`,
  },
  {
    skillId: "two-digit-div-one",
    label: "두 자리 수 나누기 한 자리 수",
    purpose: "두 자리 수를 0이 아닌 한 자리 수로 나누어 나머지가 0인 몫을 연습한다.",
    prerequisites: ["times-table", "two-digit-times-one"],
    notation: ARITHMETIC_SKILL_NOTATION["two-digit-div-one"],
    operator: ARITHMETIC_SKILL_OPERATOR["two-digit-div-one"],
    answerFormat: "nonnegative-integer",
    conditionSummary: `나누는 수는 ${ARITHMETIC_FACTOR.min}부터 ${ARITHMETIC_FACTOR.max}이고 0이 아니다. 몫은 정수이고 나머지는 0.`,
  },
];

export function listArithmeticSkills(): readonly ArithmeticSkillCatalogEntry[] {
  return CATALOG;
}

export function defaultArithmeticConstraints<TSkillId extends ArithmeticSkillId>(
  skillId: TSkillId,
): ArithmeticConstraintsBySkill[TSkillId] {
  if (!(ARITHMETIC_SKILL_IDS as readonly string[]).includes(skillId)) {
    throw new ArithmeticEngineError("unsupported-skill");
  }
  switch (skillId) {
    case "one-digit-add":
      return {
        carry: "none",
        left: { ...ARITHMETIC_ONE_DIGIT },
        right: { ...ARITHMETIC_ONE_DIGIT },
      } as ArithmeticConstraintsBySkill[TSkillId];
    case "one-digit-sub":
      return {
        minuend: { ...ARITHMETIC_ONE_DIGIT },
        subtrahend: { ...ARITHMETIC_ONE_DIGIT },
      } as ArithmeticConstraintsBySkill[TSkillId];
    case "two-digit-vertical-add":
      return {
        carryCount: 0,
        left: { ...ARITHMETIC_TWO_DIGIT },
        right: { ...ARITHMETIC_TWO_DIGIT },
      } as ArithmeticConstraintsBySkill[TSkillId];
    case "two-digit-vertical-sub":
      return {
        borrowCount: 0,
        minuend: { ...ARITHMETIC_TWO_DIGIT },
        subtrahend: { ...ARITHMETIC_TWO_DIGIT },
      } as ArithmeticConstraintsBySkill[TSkillId];
    case "times-table":
      return {
        dans: [2],
        multiplier: { ...ARITHMETIC_FACTOR },
      } as ArithmeticConstraintsBySkill[TSkillId];
    case "two-digit-times-one":
      return {
        carryCount: 0,
        multiplicand: { ...ARITHMETIC_TWO_DIGIT },
        multiplier: { ...ARITHMETIC_FACTOR },
      } as ArithmeticConstraintsBySkill[TSkillId];
    case "two-digit-div-one":
      return {
        dividend: { ...ARITHMETIC_TWO_DIGIT },
        divisor: { ...ARITHMETIC_FACTOR },
      } as ArithmeticConstraintsBySkill[TSkillId];
    default: {
      const neverSkill: never = skillId;
      throw new ArithmeticEngineError(
        neverSkill === undefined ? "unsupported-skill" : "unsupported-skill",
      );
    }
  }
}
