/**
 * 연산대장 엔진.
 *
 * 기존 초등·중등 장, 문제은행, 외부 모델은 문항 원천이 아니다.
 * 저장소의 문서 API와 화면은 여기 있는 명세와 스냅샷만 받아 간다.
 * 다시 열기는 저장된 발문·정답을 검사할 뿐 시드로 다시 뽑지 않는다.
 */

export {
  ARITHMETIC_CATALOG_VERSION,
  ARITHMETIC_ENGINE_VERSION,
  ARITHMETIC_FACTOR,
  ARITHMETIC_MAX_DOMAIN_SCAN,
  ARITHMETIC_MAX_ITEMS_PER_ROUND,
  ARITHMETIC_MAX_ITEMS_TOTAL,
  ARITHMETIC_MAX_ROUNDS,
  ARITHMETIC_MAX_SEED_LENGTH,
  ARITHMETIC_ONE_DIGIT,
  ARITHMETIC_SHEET_KIND,
  ARITHMETIC_SHEET_PAYLOAD_VERSION,
  ARITHMETIC_SKILL_IDS,
  ARITHMETIC_SKILL_NOTATION,
  ARITHMETIC_SKILL_OPERATOR,
  ARITHMETIC_TWO_DIGIT,
  arithmeticAnswerSchema,
  arithmeticGenerateRequestSchema,
  arithmeticIdentityKey,
  arithmeticPromptSchema,
  arithmeticSeedSchema,
  arithmeticSpecSchema,
  isArithmeticSkillId,
} from "@/contracts/arithmetic.contract";
export type {
  ArithmeticAllocation,
  ArithmeticConstraints,
  ArithmeticConstraintsBySkill,
  ArithmeticGenerateRequest,
  ArithmeticPrompt,
  ArithmeticRange,
  ArithmeticSkillId,
  ArithmeticSkillSelection,
  ArithmeticSpec,
} from "@/contracts/arithmetic.contract";

export {
  arithmeticSheetPayloadSchema,
} from "@/contracts/arithmeticSheet.contract";
export type {
  ArithmeticSheetItem,
  ArithmeticSheetPayload,
} from "@/contracts/arithmeticSheet.contract";

export {
  defaultArithmeticConstraints,
  listArithmeticSkills,
} from "@/lib/arithmetic/catalog";
export type { ArithmeticSkillCatalogEntry } from "@/lib/arithmetic/catalog";

export { arithmeticDomainSize } from "@/lib/arithmetic/domain";
export {
  ARITHMETIC_ENGINE_ERROR_CODES,
  ArithmeticEngineError,
} from "@/lib/arithmetic/errors";
export type {
  ArithmeticCapacityViolation,
  ArithmeticEngineErrorCode,
  ArithmeticLimitDetail,
} from "@/lib/arithmetic/errors";

export { generateArithmeticSpecs } from "@/lib/arithmetic/generate";
export { renderArithmeticPrompt } from "@/lib/arithmetic/render";
export { reopenArithmeticSheet } from "@/lib/arithmetic/reopen";
export {
  arithmeticSheetProblemCount,
  buildArithmeticSheet,
  listArithmeticAnswerViews,
  listArithmeticPrintItems,
  listArithmeticProblemViews,
} from "@/lib/arithmetic/sheet";
export type {
  ArithmeticAnswerView,
  ArithmeticPrintItem,
  ArithmeticProblemView,
} from "@/lib/arithmetic/sheet";
export { validateArithmeticRequest } from "@/lib/arithmetic/request";
export {
  arithmeticAnswerMatches,
  verifyArithmeticSpec,
} from "@/lib/arithmetic/verify";
export type { ArithmeticVerification } from "@/lib/arithmetic/verify";
