import "server-only";
import { authorizeAccount } from "@/lib/accountAccess";
import {
  ARITHMETIC_MAX_ITEMS_PER_ROUND,
  ARITHMETIC_MAX_ITEMS_TOTAL,
  ARITHMETIC_MAX_ROUNDS,
  ARITHMETIC_V2_ENGINE_VERSION,
  ARITHMETIC_V2_CATALOG_VERSION,
  buildArithmeticV2Sheet,
  listArithmeticV2Types,
} from "@/lib/arithmetic-v2";
import {
  arithmeticEngineErrorResponse,
  arithmeticSheetWriterEnabled,
} from "@/lib/arithmeticDocumentPolicy";
import { privateError, privateHeaders } from "@/lib/privateWorkspace";
import { readStrictJson } from "@/lib/textbook/strictJson";
import type {
  WorkspaceArithmeticV2CatalogResponse,
  WorkspaceArithmeticV2GenerateResponse,
} from "@/contracts/arithmeticV2.contract";

async function authorize(request: Request) {
  const access = await authorizeAccount(request);
  if (access.response) return access.response;
  return access.account!.menus.includes("bank")
    ? null
    : privateError("시험지 만들기 메뉴를 사용할 권한이 없습니다.", 403);
}
export async function arithmeticV2Catalog(request: Request) {
  const denied = await authorize(request);
  if (denied) return denied;
  const body: WorkspaceArithmeticV2CatalogResponse = {
    data: {
      engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
      catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
      types: listArithmeticV2Types(),
      limits: {
        itemsPerRound: ARITHMETIC_MAX_ITEMS_PER_ROUND,
        itemsTotal: ARITHMETIC_MAX_ITEMS_TOTAL,
        rounds: ARITHMETIC_MAX_ROUNDS,
      },
      writerEnabled: arithmeticSheetWriterEnabled(),
    },
  };
  return Response.json(body, { headers: privateHeaders });
}
export async function generateArithmeticV2(request: Request) {
  const denied = await authorize(request);
  if (denied) return denied;
  let input: unknown;
  try {
    input = await readStrictJson(request, {
      maxBytes: 64 * 1024,
      maxDepth: 12,
      maxTokens: 20_000,
      maxStringLength: 128,
    });
  } catch {
    return privateError("연산 생성 요청의 형식과 크기를 확인해 주세요.", 400);
  }
  try {
    const body: WorkspaceArithmeticV2GenerateResponse = {
      data: buildArithmeticV2Sheet(input),
    };
    return Response.json(body, { headers: privateHeaders });
  } catch (error) {
    return arithmeticEngineErrorResponse(error);
  }
}
