/**
 * GET /api/tests/{id}/results — 학생별 응시 결과 목록(최신순).
 * 대응 계약: src/contracts/testresult.contract.ts
 */
import type { NextRequest } from "next/server";

import { idParamSchema } from "@/contracts/common.contract";
import { testResultListResponseSchema } from "@/contracts/testresult.contract";
import { jsonOk, unauthorizedError, validationError } from "@/lib/apiResponse";
import { db } from "@/lib/db";
import { requireOwnedTest } from "@/lib/ownership";
import { serializeTestResult } from "@/lib/serializers";
import { getSessionUser } from "@/lib/session";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

type RouteContext = { params: Promise<{ id: string }> };

async function handleGet(_request: NextRequest, { params }: RouteContext) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const owned = await requireOwnedTest(id, session);
  if (!owned.ok) return owned.response;

  const rows = await db.testResult.findMany({
    where: { testId: id },
    orderBy: { takenAt: "desc" },
  });

  return jsonOk(testResultListResponseSchema, {
    data: rows.map(serializeTestResult),
  });
}

export const GET = withErrorLog("/api/tests/[id]/results", handleGet);
