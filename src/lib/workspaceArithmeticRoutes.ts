import { ARITHMETIC_GENERATE_JSON_LIMITS } from "@/lib/arithmetic/byteBudget";
import "server-only";
import { authorizeAccount } from "@/lib/accountAccess";
import {
  ARITHMETIC_CATALOG_VERSION,
  ARITHMETIC_ENGINE_VERSION,
  ARITHMETIC_MAX_ITEMS_PER_ROUND,
  ARITHMETIC_MAX_ITEMS_TOTAL,
  ARITHMETIC_MAX_ROUNDS,
  buildArithmeticSheet,
  listArithmeticSkills,
} from "@/lib/arithmetic";
import {
  arithmeticEngineErrorResponse,
  arithmeticSheetWriterEnabled,
} from "@/lib/arithmeticDocumentPolicy";
import { privateError, privateHeaders } from "@/lib/privateWorkspace";
import { readStrictJson } from "@/lib/textbook/strictJson";
import type {
  WorkspaceArithmeticCatalogResponse,
  WorkspaceArithmeticGenerateResponse,
} from "@/contracts/workspaceArithmetic.contract";

async function authorizeArithmetic(request: Request) {
  const access = await authorizeAccount(request);
  if (access.response) return access.response;
  return access.account!.menus.includes("bank")
    ? null
    : privateError("시험지 만들기 메뉴를 사용할 권한이 없습니다.", 403);
}

export async function arithmeticCatalog(request: Request) {
  const denied = await authorizeArithmetic(request);
  if (denied) return denied;
  const body: WorkspaceArithmeticCatalogResponse = {
    data: {
      engineVersion: ARITHMETIC_ENGINE_VERSION,
      catalogVersion: ARITHMETIC_CATALOG_VERSION,
      skills: listArithmeticSkills(),
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

export async function generateArithmetic(request: Request) {
  const denied = await authorizeArithmetic(request);
  if (denied) return denied;
  let input: unknown;
  try {
    input = await readStrictJson(request, ARITHMETIC_GENERATE_JSON_LIMITS);
  } catch {
    return privateError("연산 생성 요청의 형식과 크기를 확인해 주세요.", 400);
  }
  try {
    const body: WorkspaceArithmeticGenerateResponse = {
      data: buildArithmeticSheet(input),
    };
    return Response.json(body, { headers: privateHeaders });
  } catch (error) {
    return arithmeticEngineErrorResponse(error);
  }
}
