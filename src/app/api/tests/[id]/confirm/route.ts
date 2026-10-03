import { accessibleTestsWhere, assertClassWrite } from "@/lib/classAccess";
/**
 * POST /api/tests/{id}/confirm — 테스트 확정 (draft → confirmed).
 * 대응 계약: src/contracts/test.contract.ts
 */
import type { NextRequest } from "next/server";

import { idParamSchema } from "@/contracts/common.contract";
import { testConfirmResponseSchema } from "@/contracts/test.contract";
import {
  jsonError,
  jsonOk,
  notFoundError,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { db } from "@/lib/db";
import { requireOwnedTest } from "@/lib/ownership";
import { serializeTest } from "@/lib/serializers";
import { getSessionUser } from "@/lib/session";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

type RouteContext = { params: Promise<{ id: string }> };

async function handlePost(_request: NextRequest, { params }: RouteContext) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const owned = await requireOwnedTest(id, session, "test:write");
  if (!owned.ok) return owned.response;

  if (owned.data.status !== "draft") {
    return jsonError("CONFLICT", "초안 테스트만 확정할 수 있습니다.", 409);
  }

  const result = await db.$transaction(async (tx) => {
    if (!owned.data.predictionRunId)
      await assertClassWrite(tx, session, owned.data.classId, "test:write");
    return tx.test.updateMany({
      where: {
        id,
        ...(await accessibleTestsWhere(session, "test:write")),
        status: "draft",
      },
      data: { status: "confirmed" },
    });
  });
  if (result.count === 0) {
    return jsonError("CONFLICT", "초안 테스트만 확정할 수 있습니다.", 409);
  }

  const updated = await db.test.findUnique({ where: { id } });
  if (!updated) return notFoundError("테스트");

  return jsonOk(testConfirmResponseSchema, { data: serializeTest(updated) });
}

export const POST = withErrorLog("/api/tests/[id]/confirm", handlePost);
