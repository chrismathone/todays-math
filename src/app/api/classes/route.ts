/**
 * POST/GET /api/classes — 반 생성 · 소유 범위 안의 반 목록 조회(페이지네이션).
 * 대응 계약: src/contracts/class.contract.ts
 *
 * 반을 만들 때 **진도 계획을 같이** 받는다(`progressPlan`, D-129 — 원장님 「반 만들 때 같이, 이후에 따로
 * 관리도 가능」). 계획 없이도 지금처럼 만들어진다. 계획 칸만 틀리면 422, 반 칸이 틀리면 지금처럼 400.
 * 반과 계획은 **한 트랜잭션** — 계획이 못 들어가면 반도 안 남는다(반쪽 반이 목록에 떠 있지 않게).
 *
 * 소유 범위(D-130 — 관리자는 모든 반): src/lib/ownerScope.ts. 만든 반은 **만든 계정의 것**이다.
 *
 * 담당(D-132 — 관리자에게만): src/lib/class/classOwner.ts. 관리자 목록은 **내 반이 맨 위**, 나머지는
 * 지금 순서(`createdAt desc`) 그대로다. 관리자가 아니면 조회도 응답도 넓히기 전과 글자 그대로 같다.
 */
import type { NextRequest } from "next/server";

import {
  classCreateRequestSchema,
  classListResponseSchema,
  classResponseSchema,
} from "@/contracts/class.contract";
import { paginationParamsSchema } from "@/contracts/common.contract";
import { jsonOk, unauthorizedError, validationError } from "@/lib/apiResponse";
import {
  checkStartUnit,
  planCreateData,
  planValidationError,
} from "@/lib/daily/progressPlanStore";
import { showsClassOwner } from "@/lib/class/classOwner";
import { listClasses, serializeClassWithOwner } from "@/lib/class/listClasses";
import { db } from "@/lib/db";
import { canManageRoster } from "@/lib/ownerScope";
import { serializeClass } from "@/lib/serializers";
import { getSessionUser } from "@/lib/session";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

// POST /api/classes — 반 생성
async function handlePost(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();
  if (!canManageRoster(session))
    return Response.json(
      { error: { code: "FORBIDDEN", message: "지점관리 권한이 필요합니다." } },
      { status: 403 },
    );

  const body = await request.json().catch(() => undefined);
  const parsed = classCreateRequestSchema.safeParse(body);
  if (!parsed.success) {
    // 계획 칸만 틀렸으면 422(계획 경로와 같은 규약), 반 칸이 하나라도 틀렸으면 지금처럼 400.
    const planOnly = parsed.error.issues.every(
      (issue) => issue.path[0] === "progressPlan",
    );
    return planOnly
      ? planValidationError(parsed.error)
      : validationError(parsed.error);
  }

  const { progressPlan } = parsed.data;
  if (progressPlan) {
    const missingUnit = await checkStartUnit(progressPlan.startUnitId);
    if (missingUnit) return missingUnit;
  }

  const classData = {
    userId: session.id,
    branchId: session.branchId ?? null,
    name: parsed.data.name,
    grade: parsed.data.grade,
    defaultProblemCount: parsed.data.defaultProblemCount,
    difficultyRatio: parsed.data.difficultyRatio,
  };

  // 새 반이라 계획이 있을 수 없다 — 덮어쓰기 갈래 없이 바로 넣는다. 둘 다 **tx** 로 써야 같이 되돌아간다.
  const created = progressPlan
    ? await db.$transaction(async (tx) => {
        const cls = await tx.class.create({ data: classData });
        await tx.progressPlan.create({
          data: planCreateData(
            { classId: cls.id, studentId: null },
            progressPlan,
          ),
        });
        return cls;
      })
    : await db.class.create({ data: classData });

  // 관리자면 만든 반에 담당(내 반)을 싣는다 — 화면이 목록 끝에 붙일 때 담당 칸이 비지 않게.
  // 이름은 세션이 아니라 계정 행(`User.name`)에서 — 목록과 같은 값이어야 한다.
  const account = showsClassOwner(session)
    ? await db.user.findUnique({
        where: { id: session.id },
        select: { name: true },
      })
    : null;

  return jsonOk(
    classResponseSchema,
    {
      data: account
        ? serializeClassWithOwner(session, { ...created, user: account })
        : serializeClass(created),
    },
    { status: 201 },
  );
}

// GET /api/classes — 소유 범위 안의 반 목록(페이지네이션, 관리자가 아니면 타 사용자 반 제외)
async function handleGet(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const url = new URL(request.url);
  const parsedParams = paginationParamsSchema.safeParse(
    Object.fromEntries(url.searchParams),
  );
  if (!parsedParams.success) return validationError(parsedParams.error);
  const { page, pageSize } = parsedParams.data;

  return jsonOk(
    classListResponseSchema,
    await listClasses(session, page, pageSize),
  );
}

export const GET = withErrorLog("/api/classes", handleGet);
export const POST = withErrorLog("/api/classes", handlePost);
