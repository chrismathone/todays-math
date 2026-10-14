import { ELEMENTARY_ARITHMETIC_DEFINITIONS } from "./families/elementary";
import { MIDDLE_ARITHMETIC_DEFINITIONS } from "./families/middle";
import { arithmeticV2TypeIdSchema } from "@/contracts/arithmeticV2.contract";
import { ArithmeticV2EngineError } from "./errors";
import type { ArithmeticV2Definition } from "./types";

const definitions: readonly ArithmeticV2Definition[] = [
  ...ELEMENTARY_ARITHMETIC_DEFINITIONS,
  ...MIDDLE_ARITHMETIC_DEFINITIONS,
];
const byId = new Map<string, ArithmeticV2Definition>();
for (const definition of definitions) {
  if (
    !arithmeticV2TypeIdSchema.safeParse(definition.id).success ||
    byId.has(definition.id) ||
    !Number.isSafeInteger(definition.domainSize) ||
    definition.domainSize < 1 ||
    !definition.rankGroup.trim()
  ) {
    throw new Error(`Invalid arithmetic v2 definition: ${definition.id}`);
  }
  byId.set(definition.id, definition);
}
export function getArithmeticV2Definition(
  typeId: string,
): ArithmeticV2Definition {
  const definition = byId.get(typeId);
  if (!definition) throw new ArithmeticV2EngineError("unsupported-type");
  return definition;
}
export function arithmeticV2Definitions(): readonly ArithmeticV2Definition[] {
  return definitions;
}
