/**
 * POST/GET /api/classes — 반 생성 · 본인 소유 반 목록 조회(페이지네이션).
 * 대응 계약: src/contracts/class.contract.ts
 *
 * 반을 만들 때 **진도 계획을 같이** 받는다(`progressPlan`, D-129 — 원장님 「반 만들 때 같이, 이후에 따로
 * 관리도 가능」). 계획 없이도 지금처럼 만들어진다. 계획 칸만 틀리면 422, 반 칸이 틀리면 지금처럼 400.
 * 반과 계획은 **한 트랜잭션** — 계획이 못 들어가면 반도 안 남는다(반쪽 반이 목록에 떠 있지 않게).
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
import { db } from "@/lib/db";
import { serializeClass } from "@/lib/serializers";
import { getSessionUser } from "@/lib/session";

// POST /api/classes — 반 생성
export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

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

  return jsonOk(
    classResponseSchema,
    { data: serializeClass(created) },
    { status: 201 },
  );
}

// GET /api/classes — 본인 소유 반 목록(페이지네이션, 타 사용자 반 제외)
export async function GET(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const url = new URL(request.url);
  const parsedParams = paginationParamsSchema.safeParse(
    Object.fromEntries(url.searchParams),
  );
  if (!parsedParams.success) return validationError(parsedParams.error);
  const { page, pageSize } = parsedParams.data;

  const [rows, total] = await Promise.all([
    db.class.findMany({
      where: { userId: session.id },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    db.class.count({ where: { userId: session.id } }),
  ]);

  return jsonOk(classListResponseSchema, {
    data: rows.map(serializeClass),
    meta: { page, pageSize, total },
  });
}
