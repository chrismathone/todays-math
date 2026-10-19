/**
 * `/api/tests/{id}/grade` — **채점 입력**(A안: 표 = 학생 × 문항, 틀린 번호만).
 *
 *   GET  — 채점표: 시험지 대상 학생 · 문항 · 지금까지 채점된 것(없으면 «아직 안 봄»)
 *   POST — 한 시험지의 **여러 학생을 한 번에** 저장
 *
 * 대응 계약: `src/contracts/testresult.contract.ts` · 몸통: `src/lib/testResults/gradeSheet.ts`
 *
 * 🔴 **기존 `POST /api/tests/{id}/submit` 은 한 글자도 안 건드렸다** — 예측 문제지 쪽이 쓴다.
 *    왜 같은 경로의 다른 본문이 아니라 새 경로인지는 보고서 `tracks/reports/grading-input.md` ② 에 있다.
 */
import type { NextRequest } from "next/server";

import { idParamSchema } from "@/contracts/common.contract";
import { gradeSubmitRequestSchema } from "@/contracts/testresult.contract";
import {
  jsonError,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { getSessionUser } from "@/lib/session";
import { loadGradeSheet, saveGradingMarks } from "@/lib/testResults/gradeSheet";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { wakeEywaResults } from "@/lib/eywa/resultsWake";

type RouteContext = { params: Promise<{ id: string }> };

async function handleGet(_request: NextRequest, { params }: RouteContext) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  return loadGradeSheet(session, idResult.data.id);
}

async function handlePost(request: NextRequest, { params }: RouteContext) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const body = await request.json().catch(() => undefined);
  const parsed = gradeSubmitRequestSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const response = await saveGradingMarks(session, idResult.data.id, parsed.data);
    // 저장이 된 때만 에이와에 «가져가라» 신호(응답 뒤 · 실패 무시 — resultsWake.ts).
    if (response.ok) wakeEywaResults(idResult.data.id);
    return response;
  } catch {
    console.error("[POST /api/tests/{id}/grade] 채점 저장 실패");
    return jsonError(
      "INTERNAL_ERROR",
      "채점 처리 중 오류가 발생했습니다.",
      500,
    );
  }
}

export const GET = withErrorLog("/api/tests/[id]/grade", handleGet);
export const POST = withErrorLog("/api/tests/[id]/grade", handlePost);
