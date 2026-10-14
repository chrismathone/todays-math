import {
  ARITHMETIC_CATALOG_VERSION,
  type ArithmeticConstraints,
  type ArithmeticSkillId,
} from "@/contracts/arithmetic.contract";
import { parseArithmeticSelection } from "@/lib/arithmetic/constraints";
import {
  ARITHMETIC_V2_CATALOG_VERSION,
  arithmeticV2TypeIdSchema,
} from "@/contracts/arithmeticV2.contract";

/**
 * 연산 유형의 동일성 키.
 *
 * 카탈로그 판, 기능, 정규화한 조건만 넣는다. 시드·문항 수·순서·피연산자는
 * 넣지 않는다. 곱셈구구의 단 순서가 달라도 같은 키다.
 */
export type ArithmeticUsageSelection = {
  skillId: ArithmeticSkillId | string;
  constraints: ArithmeticConstraints | unknown;
  catalogVersion?: string;
};

export function arithmeticUsageTypeKey(
  selection: ArithmeticUsageSelection,
): string {
  const parsed = parseArithmeticSelection(
    selection.skillId,
    selection.constraints,
  );
  const catalogVersion = selection.catalogVersion ?? ARITHMETIC_CATALOG_VERSION;
  return `${catalogVersion}\n${parsed.skillId}\n${JSON.stringify(parsed.constraints)}`;
}

/** Explicit stable type identity. Never folds a v2 family into a v1 operator. */
export function arithmeticV2UsageTypeKey(typeId: string): string {
  return `${ARITHMETIC_V2_CATALOG_VERSION}\n${arithmeticV2TypeIdSchema.parse(typeId)}`;
}
