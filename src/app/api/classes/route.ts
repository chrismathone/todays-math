/**
 * POST/GET /api/classes — 반 생성 · 소유 범위 안의 반 목록 조회(페이지네이션).
 * 대응 계약: src/contracts/class.contract.ts
 * 소유 범위(D-130 — 관리자는 모든 반): src/lib/ownerScope.ts. 만든 반은 **만든 계정의 것**이다.
 */
import type { NextRequest } from "next/server";

import {
  classCreateRequestSchema,
  classListResponseSchema,
  classResponseSchema,
} from "@/contracts/class.contract";
import { paginationParamsSchema } from "@/contracts/common.contract";
import { jsonOk, unauthorizedError, validationError } from "@/lib/apiResponse";
import { db } from "@/lib/db";
import { ownedRowsWhere } from "@/lib/ownerScope";
import { serializeClass } from "@/lib/serializers";
import { getSessionUser } from "@/lib/session";

// POST /api/classes — 반 생성
export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const body = await request.json().catch(() => undefined);
  const parsed = classCreateRequestSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const created = await db.class.create({
    data: {
      userId: session.id,
      name: parsed.data.name,
      grade: parsed.data.grade,
      defaultProblemCount: parsed.data.defaultProblemCount,
      difficultyRatio: parsed.data.difficultyRatio,
    },
  });

  return jsonOk(
    classResponseSchema,
    { data: serializeClass(created) },
    { status: 201 },
  );
}

// GET /api/classes — 소유 범위 안의 반 목록(페이지네이션, 관리자가 아니면 타 사용자 반 제외)
export async function GET(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const url = new URL(request.url);
  const parsedParams = paginationParamsSchema.safeParse(
    Object.fromEntries(url.searchParams),
  );
  if (!parsedParams.success) return validationError(parsedParams.error);
  const { page, pageSize } = parsedParams.data;

  const where = ownedRowsWhere(session);
  const [rows, total] = await Promise.all([
    db.class.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    db.class.count({ where }),
  ]);

  return jsonOk(classListResponseSchema, {
    data: rows.map(serializeClass),
    meta: { page, pageSize, total },
  });
}
