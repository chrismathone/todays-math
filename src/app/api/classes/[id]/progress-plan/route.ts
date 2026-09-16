/**
 * GET/PUT/PATCH/DELETE /api/classes/{id}/progress-plan — **반 계획** (매일 자동 출제 ④의 뒷단, D-129).
 *
 * 대응 계약: src/contracts/dailyAutoTest.contract.ts
 * 브리프: docs/planning/tracks/briefs/daily-auto-test-plan-api.md
 *
 * 반 계획은 **반에 한 줄**이라 id 없는 단일 자원으로 둔다 — `PUT` 이 넣기(201)와 덮어쓰기(200)를 같이 한다
 * (까닭은 `progressPlanStore.ts` 머리말). 학생 계획은 `/api/students/{id}/progress-plan`.
 *
 * 소유 판정은 `ownership.ts` 의 404/403 헬퍼 — 관리자는 넘는다(D-130, 판정은 `ownerScope.ts` 한 곳).
 * 순서: 세션 401 → 경로 id 400 → 반 404/403 → 본문 422 → 계획 없음 404.
 */
import type { NextRequest } from "next/server";

import {
  deleteResponseSchema,
  idParamSchema,
} from "@/contracts/common.contract";
import {
  classProgressPlanResponseSchema,
  progressPlanPatchRequestSchema,
  progressPlanQuerySchema,
  progressPlanResponseSchema,
  progressPlanWriteRequestSchema,
} from "@/contracts/dailyAutoTest.contract";
import {
  jsonOk,
  notFoundError,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import {
  checkStartUnit,
  findPlan,
  loadPlanSchedule,
  parsePlanBody,
  patchPlan,
  planValidationError,
  putPlan,
  ruleOf,
  serializeProgressPlan,
} from "@/lib/daily/progressPlanStore";
import { db } from "@/lib/db";
import { kstDateOf } from "@/lib/kstDate";
import { requireOwnedClass } from "@/lib/ownership";
import { getSessionUser } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

/** 세션 → 경로 id → 반 소유. 통과하면 반 id 를 돌려준다. */
async function guard(params: RouteContext["params"]) {
  const session = await getSessionUser();
  if (!session) return { ok: false as const, response: unauthorizedError() };

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success)
    return { ok: false as const, response: validationError(idResult.error) };

  const owned = await requireOwnedClass(id, session);
  if (!owned.ok) return owned;
  return { ok: true as const, classId: id };
}

// GET — 반 계획 · 이번 주 예정 · 이 반의 학생 계획들
export async function GET(request: NextRequest, { params }: RouteContext) {
  const g = await guard(params);
  if (!g.ok) return g.response;

  const query = progressPlanQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!query.success) return planValidationError(query.error);
  const day = query.data.day ?? kstDateOf(new Date());

  const [plan, studentPlans] = await Promise.all([
    findPlan({ classId: g.classId, studentId: null }),
    db.progressPlan.findMany({
      where: { classId: g.classId, studentId: { not: null } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const schedule = plan
    ? await loadPlanSchedule({
        rule: ruleOf(plan),
        classId: g.classId,
        student: null,
        day,
      })
    : null;

  return jsonOk(classProgressPlanResponseSchema, {
    data: {
      plan: plan ? serializeProgressPlan(plan) : null,
      schedule,
      studentPlans: studentPlans.map(serializeProgressPlan),
    },
  });
}

// PUT — 넣기(201) · 덮어쓰기(200)
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const g = await guard(params);
  if (!g.ok) return g.response;

  const body = await parsePlanBody(request, progressPlanWriteRequestSchema);
  if (!body.ok) return body.response;
  const missingUnit = await checkStartUnit(body.data.startUnitId);
  if (missingUnit) return missingUnit;

  const { row, created } = await putPlan(
    { classId: g.classId, studentId: null },
    body.data,
  );
  return jsonOk(
    progressPlanResponseSchema,
    { data: serializeProgressPlan(row) },
    { status: created ? 201 : 200 },
  );
}

// PATCH — 일부 고치기 · 켜기/끄기
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const g = await guard(params);
  if (!g.ok) return g.response;

  const body = await parsePlanBody(request, progressPlanPatchRequestSchema);
  if (!body.ok) return body.response;
  const missingUnit = await checkStartUnit(body.data.startUnitId);
  if (missingUnit) return missingUnit;

  const plan = await findPlan({ classId: g.classId, studentId: null });
  if (!plan) return notFoundError("진도 계획");

  const updated = await patchPlan(plan.id, body.data);
  return jsonOk(progressPlanResponseSchema, {
    data: serializeProgressPlan(updated),
  });
}

// DELETE — 반 계획만 지운다. 반 계획을 따르던 학생은 자동 출제에서 빠진다(학생 계획이 있는 개별 진도 학생은 남는다).
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const g = await guard(params);
  if (!g.ok) return g.response;

  const plan = await findPlan({ classId: g.classId, studentId: null });
  if (!plan) return notFoundError("진도 계획");

  await db.progressPlan.delete({ where: { id: plan.id } });
  return jsonOk(deleteResponseSchema, { data: { id: plan.id } });
}
