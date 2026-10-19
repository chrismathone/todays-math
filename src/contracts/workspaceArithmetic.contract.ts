import type { ArithmeticGenerateRequest } from "@/contracts/arithmetic.contract";
import type { ArithmeticSheetPayload } from "@/contracts/arithmeticSheet.contract";
import type {
  ArithmeticCapacityViolation,
  ArithmeticEngineErrorCode,
  ArithmeticLimitDetail,
  ArithmeticSkillCatalogEntry,
} from "@/lib/arithmetic";

/** GET /api/arithmetic/catalog; independent of problem-bank inventory. */
export type WorkspaceArithmeticCatalogResponse = {
  data: {
    engineVersion: string;
    catalogVersion: string;
    skills: readonly ArithmeticSkillCatalogEntry[];
    limits: { itemsPerRound: number; itemsTotal: number; rounds: number };
    writerEnabled: boolean;
  };
};

/** POST /api/arithmetic/generate previews a snapshot without persisting it. */
export type WorkspaceArithmeticGenerateRequest = ArithmeticGenerateRequest;
export type WorkspaceArithmeticGenerateResponse = {
  data: ArithmeticSheetPayload;
};
export type WorkspaceArithmeticErrorResponse = {
  error: {
    code: ArithmeticEngineErrorCode;
    message: string;
    violations?: readonly ArithmeticCapacityViolation[];
    limit?: ArithmeticLimitDetail;
  };
};
