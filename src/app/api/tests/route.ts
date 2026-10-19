import { GENERAL_TESTS } from "@/lib/tests/generalTests";
import { accessibleTestsWhere } from "@/lib/classAccess";
/**
 * GET /api/tests — 소유 범위 안의 테스트 목록 (classId/studentId/status 필터, 페이지네이션).
 * 대응 계약: src/contracts/test.contract.ts
 * 소유 범위(D-130 — 관리자는 모든 반의 시험지): src/lib/ownerScope.ts
 */
import type { NextRequest } from "next/server";

import {
  testListQuerySchema,
  testListResponseSchema,
} from "@/contracts/test.contract";
import { jsonOk, unauthorizedError, validationError } from "@/lib/apiResponse";
import { db } from "@/lib/db";
import { serializeTest } from "@/lib/serializers";
import { getSessionUser } from "@/lib/session";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

async function handleGet(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const parsed = testListQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success) return validationError(parsed.error);

  const { classId, studentId, status, page, pageSize } = parsed.data;
  const where = {
    ...(await accessibleTestsWhere(session)),
    // 반에 낸 월말평가는 «내 시험지»에서 본다 — 이 목록(메인의 «오늘의 테스트»)에 섞지 않는다.
    ...GENERAL_TESTS,
    ...(classId ? { classId } : {}),
    ...(studentId ? { studentId } : {}),
    ...(status ? { status } : {}),
  };

  const [rows, total] = await Promise.all([
    db.test.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { testDate: "desc" },
    }),
    db.test.count({ where }),
  ]);

  return jsonOk(testListResponseSchema, {
    data: rows.map(serializeTest),
    meta: { page, pageSize, total },
  });
}

export const GET = withErrorLog("/api/tests", handleGet);
