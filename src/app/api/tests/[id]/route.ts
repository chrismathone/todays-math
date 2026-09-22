/**
 * GET /api/tests/{id} — 테스트 단건 조회 (문항 목록 포함, 검수 화면 S-05).
 * 대응 계약: src/contracts/test.contract.ts
 */
import type { NextRequest } from "next/server";

import { idParamSchema } from "@/contracts/common.contract";
import { testDetailResponseSchema } from "@/contracts/test.contract";
import { jsonOk, unauthorizedError, validationError } from "@/lib/apiResponse";
import {
  CLASS_OWNER_NAME,
  showsClassOwner,
  toClassOwner,
} from "@/lib/class/classOwner";
import { db } from "@/lib/db";
import { requireOwnedTest } from "@/lib/ownership";
import { serializeTest } from "@/lib/serializers";
import { getSessionUser } from "@/lib/session";
import { loadTestProblemItems } from "@/lib/tests/loadTestProblems";
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

  // 반 이름은 검수 머리말이 쓴다. 소유 확인이 이미 끝났으므로 그 시험의 반만 곧장 읽는다
  // (`requireOwnedTest` 를 고치면 이 값이 필요 없는 다른 라우트까지 반을 끌고 온다).
  // 관리자면 같은 조회에 담당을 조인한다(D-132) — 관리자가 아니면 조회도 응답도 그대로다.
  const [problems, cls, student] = await Promise.all([
    loadTestProblemItems(id),
    showsClassOwner(session)
      ? db.class
          .findUnique({
            where: { id: owned.data.classId },
            select: { name: true, userId: true, ...CLASS_OWNER_NAME },
          })
          .then(
            (row) =>
              row && {
                name: row.name,
                classOwner: toClassOwner(session, row),
              },
          )
      : db.class.findUnique({
          where: { id: owned.data.classId },
          select: { name: true },
        }),
    // 반 전체 시험이면 `studentId` 가 없다 — 그때는 조회 자체를 안 한다.
    owned.data.studentId
      ? db.student.findUnique({
          where: { id: owned.data.studentId },
          select: { name: true },
        })
      : Promise.resolve(null),
  ]);

  return jsonOk(testDetailResponseSchema, {
    data: {
      test: serializeTest(owned.data),
      // 반이 지워진 시험은 지금 구조상 없지만(FK), 이름이 없다고 검수를 막지는 않는다.
      className: cls?.name ?? "",
      studentName: student?.name ?? null,
      ...(cls && "classOwner" in cls ? { classOwner: cls.classOwner } : {}),
      problems,
    },
  });
}

export const GET = withErrorLog("/api/tests/[id]", handleGet);
