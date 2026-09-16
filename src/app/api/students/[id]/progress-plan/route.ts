/**
 * GET/PUT/PATCH/DELETE /api/students/{id}/progress-plan — **학생 계획** (매일 자동 출제 ④의 뒷단, D-129 ⑴).
 *
 * 대응 계약: src/contracts/dailyAutoTest.contract.ts
 * 브리프: docs/planning/tracks/briefs/daily-auto-test-plan-api.md
 *
 * 🔴 **개별 진도 학생만**(`Student.useIndividualProgress`) 학생 계획이 반 계획을 덮는다(`pickProgressPlan`).
 *    그래서 넣기·고치기는 개별 진도 학생에게만 받는다 — 아니면 422. 덮지도 않는 계획을 받아 두면
 *    화면에는 «이 학생 계획»이 보이는데 아침 8시 초안은 반 계획으로 선다.
 *    지우기는 누구에게나 받는다 — 개별 진도를 끈 뒤 남은 계획을 치우는 길이다.
 *
 * 학생 계획의 반은 **학생의 지금 반**이다(본문에 반 id 가 없다). 학생에 한 줄 — PUT 이 넣기·덮어쓰기.
 *
 * 소유 판정은 `ownership.ts` 의 404/403 헬퍼 — 관리자는 넘는다(D-130, 판정은 `ownerScope.ts` 한 곳).
 * 순서: 세션 401 → 경로 id 400 → 학생 404/403 → 본문 422 → 개별 진도 아님 422 → 계획 없음 404.
 */
import type { Student as StudentRow } from "@prisma/client";
import type { NextRequest } from "next/server";

import {
  deleteResponseSchema,
  idParamSchema,
} from "@/contracts/common.contract";
import {
  progressPlanPatchRequestSchema,
  progressPlanQuerySchema,
  progressPlanResponseSchema,
  progressPlanWriteRequestSchema,
  studentProgressPlanResponseSchema,
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
  planFieldError,
  planValidationError,
  putPlan,
  ruleOf,
  serializeProgressPlan,
} from "@/lib/daily/progressPlanStore";
import { db } from "@/lib/db";
import { kstDateOf } from "@/lib/kstDate";
import { requireOwnedStudent } from "@/lib/ownership";
import { getSessionUser } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

const NOT_INDIVIDUAL_MESSAGE = "개별 진도 학생만 학생 계획을 둘 수 있습니다.";

async function guard(params: RouteContext["params"]) {
  const session = await getSessionUser();
  if (!session) return { ok: false as const, response: unauthorizedError() };

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success)
    return { ok: false as const, response: validationError(idResult.error) };

  const owned = await requireOwnedStudent(id, session);
  if (!owned.ok) return owned;
  return { ok: true as const, student: owned.data };
}

const targetOf = (student: StudentRow) => ({
  classId: student.classId,
  studentId: student.id,
});

// GET — 학생 계획 · 지금 반 계획을 덮나 · 그 학생의 이번 주 예정
export async function GET(request: NextRequest, { params }: RouteContext) {
  const g = await guard(params);
  if (!g.ok) return g.response;

  const query = progressPlanQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!query.success) return planValidationError(query.error);
  const day = query.data.day ?? kstDateOf(new Date());

  const plan = await findPlan(targetOf(g.student));
  const inEffect = plan !== null && g.student.useIndividualProgress;
  const schedule =
    plan && inEffect
      ? await loadPlanSchedule({
          rule: ruleOf(plan),
          classId: g.student.classId,
          student: {
            id: g.student.id,
            useIndividualProgress: g.student.useIndividualProgress,
          },
          day,
        })
      : null;

  return jsonOk(studentProgressPlanResponseSchema, {
    data: {
      plan: plan ? serializeProgressPlan(plan) : null,
      inEffect,
      schedule,
    },
  });
}

// PUT — 넣기(201) · 덮어쓰기(200). 개별 진도 학생만.
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const g = await guard(params);
  if (!g.ok) return g.response;

  const body = await parsePlanBody(request, progressPlanWriteRequestSchema);
  if (!body.ok) return body.response;
  if (!g.student.useIndividualProgress)
    return planFieldError("useIndividualProgress", NOT_INDIVIDUAL_MESSAGE);
  const missingUnit = await checkStartUnit(body.data.startUnitId);
  if (missingUnit) return missingUnit;

  const { row, created } = await putPlan(targetOf(g.student), body.data);
  return jsonOk(
    progressPlanResponseSchema,
    { data: serializeProgressPlan(row) },
    { status: created ? 201 : 200 },
  );
}

// PATCH — 일부 고치기 · 켜기/끄기. 개별 진도 학생만.
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const g = await guard(params);
  if (!g.ok) return g.response;

  const body = await parsePlanBody(request, progressPlanPatchRequestSchema);
  if (!body.ok) return body.response;
  if (!g.student.useIndividualProgress)
    return planFieldError("useIndividualProgress", NOT_INDIVIDUAL_MESSAGE);
  const missingUnit = await checkStartUnit(body.data.startUnitId);
  if (missingUnit) return missingUnit;

  const plan = await findPlan(targetOf(g.student));
  if (!plan) return notFoundError("진도 계획");

  const updated = await patchPlan(plan.id, body.data);
  return jsonOk(progressPlanResponseSchema, {
    data: serializeProgressPlan(updated),
  });
}

// DELETE — 학생 계획만 지운다(반 계획은 남는다). 개별 진도가 꺼진 학생에게도 받는다(정리).
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const g = await guard(params);
  if (!g.ok) return g.response;

  const plan = await findPlan(targetOf(g.student));
  if (!plan) return notFoundError("진도 계획");

  await db.progressPlan.delete({ where: { id: plan.id } });
  return jsonOk(deleteResponseSchema, { data: { id: plan.id } });
}
