/**
 * POST/GET /api/students — 학생 등록(이름만 — 최소 수집 원칙) · 반별 학생 목록 조회(classId 필수).
 * 대응 계약: src/contracts/class.contract.ts
 */
import type { NextRequest } from "next/server";

import {
  studentCreateRequestSchema,
  studentListQuerySchema,
  studentListResponseSchema,
  studentResponseSchema,
} from "@/contracts/class.contract";
import { jsonOk, unauthorizedError, validationError } from "@/lib/apiResponse";
import { db } from "@/lib/db";
import { canManageRoster } from "@/lib/ownerScope";
import { requireOwnedClass } from "@/lib/ownership";
import { serializeStudent } from "@/lib/serializers";
import { getSessionUser } from "@/lib/session";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

// POST /api/students — 학생 등록(classId + 이름만)
async function handlePost(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();
  if (!canManageRoster(session))
    return Response.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "학생 배정은 지점 관리자만 할 수 있습니다.",
        },
      },
      { status: 403 },
    );

  const body = await request.json().catch(() => undefined);
  const parsed = studentCreateRequestSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const owned = await requireOwnedClass(parsed.data.classId, session);
  if (!owned.ok) return owned.response;

  const created = await db.student.create({
    data: { classId: parsed.data.classId, name: parsed.data.name },
  });

  return jsonOk(
    studentResponseSchema,
    { data: serializeStudent(created) },
    { status: 201 },
  );
}

// GET /api/students?classId=... — 학생 목록 조회(classId 쿼리 필수)
async function handleGet(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const url = new URL(request.url);
  const parsed = studentListQuerySchema.safeParse(
    Object.fromEntries(url.searchParams),
  );
  if (!parsed.success) return validationError(parsed.error);

  const owned = await requireOwnedClass(parsed.data.classId, session);
  if (!owned.ok) return owned.response;

  const { page, pageSize, classId } = parsed.data;
  const [rows, total] = await Promise.all([
    db.student.findMany({
      where: { classId },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "asc" },
    }),
    db.student.count({ where: { classId } }),
  ]);

  return jsonOk(studentListResponseSchema, {
    data: rows.map(serializeStudent),
    meta: { page, pageSize, total },
  });
}

export const GET = withErrorLog("/api/students", handleGet);
export const POST = withErrorLog("/api/students", handlePost);
