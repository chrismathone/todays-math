/**
 * PATCH/DELETE /api/students/{id} — 학생 수정(이름/개별 진도 사용 여부) · 삭제.
 * 대응 계약: src/contracts/class.contract.ts
 * 소유권 검증(존재하지 않으면 404, 소속 반이 타 사용자 소유면 403): src/lib/ownership.ts requireOwnedStudent
 */
import type { NextRequest } from "next/server";

import {
  studentResponseSchema,
  studentUpdateRequestSchema,
} from "@/contracts/class.contract";
import {
  deleteResponseSchema,
  idParamSchema,
} from "@/contracts/common.contract";
import { jsonOk, unauthorizedError, validationError } from "@/lib/apiResponse";
import { db } from "@/lib/db";
import { isRetainedRelationError } from "@/lib/databaseErrors";
import { canManageRoster } from "@/lib/ownerScope";
import { requireOwnedStudent } from "@/lib/ownership";
import { serializeStudent } from "@/lib/serializers";
import { getSessionUser } from "@/lib/session";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/students/{id} — 학생 수정
async function handlePatch(request: NextRequest, { params }: RouteContext) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const owned = await requireOwnedStudent(id, session);
  if (!owned.ok) return owned.response;

  const body = await request.json().catch(() => undefined);
  const parsed = studentUpdateRequestSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  if (parsed.data.name !== undefined && !canManageRoster(session))
    return Response.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "학생 명단은 지점 관리자만 변경할 수 있습니다.",
        },
      },
      { status: 403 },
    );

  const updated = await db.student.update({ where: { id }, data: parsed.data });
  return jsonOk(studentResponseSchema, { data: serializeStudent(updated) });
}

// DELETE /api/students/{id} — 학생 삭제
async function handleDelete(request: NextRequest, { params }: RouteContext) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();
  if (!canManageRoster(session))
    return Response.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "학생 삭제는 지점 관리자만 할 수 있습니다.",
        },
      },
      { status: 403 },
    );

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const owned = await requireOwnedStudent(id, session);
  if (!owned.ok) return owned.response;

  try {
    await db.student.delete({ where: { id } });
  } catch (error) {
    if (isRetainedRelationError(error)) {
      return Response.json(
        {
          error: {
            code: "RECORDS_RETAINED",
            message: "학습 기록이 연결되어 있어 학생을 삭제할 수 없습니다.",
          },
        },
        { status: 409 },
      );
    }
    throw error;
  }
  return jsonOk(deleteResponseSchema, { data: { id } });
}

export const PATCH = withErrorLog("/api/students/[id]", handlePatch);
export const DELETE = withErrorLog("/api/students/[id]", handleDelete);
