/**
 * GET/PATCH/DELETE /api/problems/{id} — 문제 단건 조회 · 수정(본문/정답/풀이 등) · 삭제.
 * 대응 계약: src/contracts/problem.contract.ts
 * 접근 검증(존재하지 않으면 404, 타 사용자 private면 403): requireAccessibleProblem (D-31)
 *
 * ⚠️ reviewStatus는 이 엔드포인트로 수정할 수 없다(계약이 strictObject로 거부) — 승격은
 * PATCH /api/problems/{id}/review-status 전용 엔드포인트를 통해서만 가능하다(D-22).
 */
import type { NextRequest } from "next/server";

import {
  problemResponseSchema,
  problemUpdateRequestSchema,
} from "@/contracts/problem.contract";
import {
  deleteResponseSchema,
  idParamSchema,
} from "@/contracts/common.contract";
import {
  jsonError,
  jsonOk,
  notFoundError,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { db } from "@/lib/db";
import { requireAccessibleProblem } from "@/lib/ownership";
import { isPrismaErrorCode } from "@/lib/prismaErrors";
import { serializeProblem } from "@/lib/serializers";
import { withProblemSourceReferences } from "@/lib/problem/sourceReference";
import { withQuestionMetadata } from "@/lib/problem/questionQueries";
import { problemVisibleWhere } from "@/lib/problemPool";
import { getSessionUser } from "@/lib/session";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

type RouteContext = { params: Promise<{ id: string }> };

function problemInUseError() {
  return jsonError(
    "CONFLICT",
    "시험지에 포함된 문제는 삭제할 수 없습니다.",
    409,
  );
}

// GET /api/problems/{id} — 단건 조회(LaTeX 본문 무손실 반환)
async function handleGet(request: NextRequest, { params }: RouteContext) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const accessible = await requireAccessibleProblem(id, session.id);
  if (!accessible.ok) return accessible.response;

  const identity = new URL(request.url).searchParams.get("identity");
  if (identity !== null && identity !== "question")
    return Response.json(
      { error: "알 수 없는 문항 보기입니다." },
      { status: 400 },
    );
  if (identity === "question") {
    const data = await db.$transaction(
      async (tx) => {
        const current = await tx.problem.findFirst({
          where: { AND: [{ id }, problemVisibleWhere()] },
        });
        if (!current) return null;
        const rows = await withQuestionMetadata([current], tx);
        const row = (await withProblemSourceReferences(rows))[0]!;
        return {
          ...serializeProblem(row),
          questionId: row.questionId,
          questionFormats: row.questionFormats,
        };
      },
      { isolationLevel: "RepeatableRead", timeout: 10000 },
    );
    return data
      ? jsonOk(problemResponseSchema, { data })
      : notFoundError("문제");
  }

  return jsonOk(problemResponseSchema, {
    data: serializeProblem(
      (await withProblemSourceReferences([accessible.data]))[0]!,
    ),
  });
}

// PATCH /api/problems/{id} — 문제 수정
async function handlePatch(request: NextRequest, { params }: RouteContext) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const accessible = await requireAccessibleProblem(id, session.id);
  if (!accessible.ok) return accessible.response;

  const body = await request.json().catch(() => undefined);
  const parsed = problemUpdateRequestSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  if (parsed.data.unitId) {
    const unit = await db.unit.findUnique({
      where: { id: parsed.data.unitId },
    });
    if (!unit) return notFoundError("소단원");
  }

  let updated;
  try {
    updated = await db.problem.update({
      where: { id },
      data: parsed.data,
    });
  } catch (error) {
    if (parsed.data.unitId && isPrismaErrorCode(error, "P2003")) {
      const currentUnit = await db.unit.findUnique({
        where: { id: parsed.data.unitId },
      });
      if (!currentUnit) return notFoundError("소단원");
    }
    throw error;
  }
  return jsonOk(problemResponseSchema, {
    data: serializeProblem((await withProblemSourceReferences([updated]))[0]!),
  });
}

// DELETE /api/problems/{id} — 문제 삭제
async function handleDelete(request: NextRequest, { params }: RouteContext) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const accessible = await requireAccessibleProblem(id, session.id);
  if (!accessible.ok) return accessible.response;

  const usageCount = await db.testProblem.count({ where: { problemId: id } });
  if (usageCount > 0) return problemInUseError();

  try {
    await db.problem.delete({ where: { id } });
  } catch (error) {
    // count 이후 시험지에 편입된 경쟁 요청도 DB의 RESTRICT 제약으로 보존한다.
    if (isPrismaErrorCode(error, "P2003")) return problemInUseError();
    throw error;
  }
  return jsonOk(deleteResponseSchema, { data: { id } });
}

export const GET = withErrorLog("/api/problems/[id]", handleGet);
export const PATCH = withErrorLog("/api/problems/[id]", handlePatch);
export const DELETE = withErrorLog("/api/problems/[id]", handleDelete);
