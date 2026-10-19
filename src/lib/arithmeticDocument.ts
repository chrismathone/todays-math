import type { ArithmeticSheetPayload } from "@/contracts/arithmeticSheet.contract";
import type { ArithmeticV2SheetPayload } from "@/contracts/arithmeticV2.contract";
import { ArithmeticEngineError } from "@/lib/arithmetic/errors";
import { reopenArithmeticSheet } from "@/lib/arithmetic/reopen";
import { reopenArithmeticV2Sheet } from "@/lib/arithmetic-v2/reopen";

export type AnyArithmeticSheetPayload =
  ArithmeticSheetPayload | ArithmeticV2SheetPayload;
/** Reader dispatch only. V1 schema and engine stay frozen. */
export function reopenAnyArithmeticSheet(
  payload: unknown,
): AnyArithmeticSheetPayload {
  if (!payload || typeof payload !== "object" || !("payloadVersion" in payload))
    throw new ArithmeticEngineError("schema");
  if (payload.payloadVersion === 1) return reopenArithmeticSheet(payload);
  if (payload.payloadVersion === 2) return reopenArithmeticV2Sheet(payload);
  throw new ArithmeticEngineError("version");
}
export function anyArithmeticSheetProblemCount(payload: unknown): number {
  return reopenAnyArithmeticSheet(payload).rounds.reduce(
    (sum, round) => sum + round.items.length,
    0,
  );
}
