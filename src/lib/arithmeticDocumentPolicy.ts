import "server-only";
import { ArithmeticEngineError, reopenArithmeticSheet } from "@/lib/arithmetic";
import { privateError, privateHeaders } from "@/lib/privateWorkspace";
import type { WorkspaceArithmeticErrorResponse } from "@/contracts/workspaceArithmetic.contract";

/** Open only after the CHECK migration and all compatible readers are deployed. */
export function arithmeticSheetWriterEnabled(): boolean {
  return process.env.ARITHMETIC_SHEET_WRITE === "on";
}

export function arithmeticSheetWriteError(): Response | null {
  return arithmeticSheetWriterEnabled()
    ? null
    : privateError(
        "연산 학습지 저장을 준비하고 있습니다. 잠시 후 다시 시도해 주세요.",
        503,
        "ARITHMETIC_WRITE_DISABLED",
      );
}

export function arithmeticEngineErrorResponse(error: unknown): Response {
  if (!(error instanceof ArithmeticEngineError)) throw error;
  const body: WorkspaceArithmeticErrorResponse = {
    error: {
      code: error.code,
      message: error.message,
      ...(error.violations ? { violations: error.violations } : {}),
      ...(error.limit ? { limit: error.limit } : {}),
    },
  };
  return Response.json(body, { status: 400, headers: privateHeaders });
}

/** Reopen checks stored prompts and answers; it never generates replacements. */
export function arithmeticSheetPayloadError(payload: unknown): Response | null {
  try {
    reopenArithmeticSheet(payload);
    return null;
  } catch (error) {
    return arithmeticEngineErrorResponse(error);
  }
}
