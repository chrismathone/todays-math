/**
 * POST /api/tests/{id}/submit — 채점 결과 입력(자동 채점 + 예상 점수 산출).
 * 대응 계약: src/contracts/testresult.contract.ts
 */
import type { NextRequest } from "next/server";

import { idParamSchema } from "@/contracts/common.contract";
import { testResultSubmitRequestSchema } from "@/contracts/testresult.contract";
import {
  jsonError,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { getSessionUser } from "@/lib/session";
import { submitTestResult } from "@/lib/testResults/submitTestResult";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { wakeEywaResults } from "@/lib/eywa/resultsWake";

type RouteContext = { params: Promise<{ id: string }> };

async function handlePost(request: NextRequest, { params }: RouteContext) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const body = await request.json().catch(() => undefined);
  const parsed = testResultSubmitRequestSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const response = await submitTestResult(session, id, parsed.data);
    // 저장이 된 때만 에이와에 «가져가라» 신호(응답 뒤 · 실패 무시 — resultsWake.ts).
    if (response.ok) wakeEywaResults(id);
    return response;
  } catch {
    console.error("[POST /api/tests/{id}/submit] submission failed");
    return jsonError(
      "INTERNAL_ERROR",
      "채점 처리 중 오류가 발생했습니다.",
      500,
    );
  }
}

export const POST = withErrorLog("/api/tests/[id]/submit", handlePost);
