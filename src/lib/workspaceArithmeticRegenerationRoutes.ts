import "server-only";
import { authorizeAccount } from "@/lib/accountAccess";
import { arithmeticEngineErrorResponse } from "@/lib/arithmeticDocumentPolicy";
import { privateError, privateHeaders } from "@/lib/privateWorkspace";
import { readStrictJson } from "@/lib/textbook/strictJson";
import type { ArithmeticSheetPayload } from "@/contracts/arithmeticSheet.contract";
import type { ArithmeticV2SheetPayload } from "@/contracts/arithmeticV2.contract";
import { ARITHMETIC_SHEET_JSON_LIMITS } from "@/lib/arithmetic/byteBudget";
import {
  arithmeticRegenerationRequestSchema,
  regenerateArithmeticItems,
  regenerateArithmeticV2Items,
} from "@/lib/arithmeticRegeneration";

async function regenerate(request: Request, version: 1 | 2) {
  // Identical authorization and same-origin protection to the generate routes.
  const access = await authorizeAccount(request);
  if (access.response) return access.response;
  if (!access.account!.menus.includes("arithmetic"))
    return privateError("연산대장 메뉴를 사용할 권한이 없습니다.", 403);
  let input: unknown;
  try {
    input = await readStrictJson(request, ARITHMETIC_SHEET_JSON_LIMITS);
  } catch {
    return privateError("숫자 변경 요청의 형식과 크기를 확인해 주세요.", 400);
  }
  const parsed = arithmeticRegenerationRequestSchema.safeParse(input);
  if (!parsed.success)
    return privateError("숫자를 바꿀 회차와 문항 번호를 확인해 주세요.", 400);
  try {
    const { sheet, target, seed } = parsed.data;
    // Both helpers fully reopen/verify the input before sampling. No storage I/O.
    const data =
      version === 1
        ? regenerateArithmeticItems(
            sheet as ArithmeticSheetPayload,
            target,
            seed,
          )
        : regenerateArithmeticV2Items(
            sheet as ArithmeticV2SheetPayload,
            target,
            seed,
          );
    return Response.json({ data }, { headers: privateHeaders });
  } catch (error) {
    return arithmeticEngineErrorResponse(error);
  }
}

export const regenerateArithmetic = (request: Request) =>
  regenerate(request, 1);
export const regenerateArithmeticV2 = (request: Request) =>
  regenerate(request, 2);
