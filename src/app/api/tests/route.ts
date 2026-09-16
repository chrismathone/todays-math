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
import { ownedRowsWhere } from "@/lib/ownerScope";
import { serializeTest } from "@/lib/serializers";
import { getSessionUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const parsed = testListQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success) return validationError(parsed.error);

  const { classId, studentId, status, page, pageSize } = parsed.data;
  const where = {
    ...ownedRowsWhere(session),
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
