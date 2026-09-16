/**
 * MSW 핸들러 — 반 진도 계획 (D-129 ④ · 화면 트랙 D-131).
 * 대응 계약: src/contracts/dailyAutoTest.contract.ts
 * 대응 API 경로:
 *   GET/PUT /api/classes/{id}/progress-plan
 *   POST    /api/classes/{id}/progress-plan/preview
 *
 * ⚠️ 상태를 갖지 않는다(class.ts 와 같은 원칙) — GET 은 늘 «계획 없음», PUT 은 «넣었다면 이런 모양»을
 *    새로 계산해 돌려준다. 계획이 있는 화면은 시험이 `server.use` 로 얹는다.
 *    예정(schedule)은 **제품 함수**(`buildPlanSchedule`)로 편다 — 대역이 날짜를 따로 펴면 화면 시험이
 *    실제와 다른 달력을 본다.
 */
import { http, type HttpHandler } from "msw";

import {
  classProgressPlanResponseSchema,
  progressPlanPreviewResponseSchema,
  progressPlanQuerySchema,
  progressPlanResponseSchema,
  progressPlanWriteRequestSchema,
  type PlanScheduleEntity,
  type ProgressPlanWriteRequest,
} from "@/contracts/dailyAutoTest.contract";
import {
  buildPlanSchedule,
  planScheduleWindow,
} from "@/lib/daily/planSchedule";

import {
  CLASS_OTHER_ID,
  MOCK_CLASSES,
  MOCK_PROGRESS,
  MOCK_UNITS,
} from "../data";
import {
  forbiddenError,
  jsonError,
  jsonOk,
  notFoundError,
  toFieldErrorDetails,
} from "./_helpers";

function guardClass(id: string) {
  if (id === CLASS_OTHER_ID) return forbiddenError();
  if (!MOCK_CLASSES.some((c) => c.id === id)) return notFoundError("반");
  return null;
}

/** 대역의 «오늘» — 쿼리가 없으면 고정일(시험이 흔들리지 않게). */
const MOCK_PLAN_DAY = "2026-09-16";

export function mockPlanSchedule(
  classId: string,
  rule: ProgressPlanWriteRequest,
  day: string,
): PlanScheduleEntity {
  const { from, to } = planScheduleWindow(day);
  const refs = new Map(
    MOCK_UNITS.map((u) => [
      u.id,
      { id: u.id, grade: u.grade, chapter: u.chapter, section: u.section },
    ]),
  );
  const rows = buildPlanSchedule({
    rule,
    units: MOCK_UNITS,
    classProgress: MOCK_PROGRESS.filter(
      (p) => p.classId === classId && p.studentId === null,
    ),
    from,
    to,
  });
  const names = (ids: string[]) => ids.flatMap((id) => refs.get(id) ?? []);
  return {
    from,
    to,
    rows: rows.map((r) => ({
      date: r.date,
      weekday: r.weekday,
      lesson: r.lesson,
      planned: names(r.plannedUnitIds),
      actual: names(r.actualUnitIds),
      driftDays: r.driftDays,
      atCurriculumEnd: r.atCurriculumEnd,
    })),
  };
}

async function readRule(request: Request) {
  const body = await request.json().catch(() => undefined);
  return progressPlanWriteRequestSchema.safeParse(body);
}

function invalid(error: Parameters<typeof toFieldErrorDetails>[0]) {
  return jsonError(
    "VALIDATION_ERROR",
    "요청 값이 올바르지 않습니다.",
    422,
    toFieldErrorDetails(error),
  );
}

export const progressPlanHandlers: HttpHandler[] = [
  http.get("/api/classes/:id/progress-plan", ({ params }) => {
    const denied = guardClass(String(params.id));
    if (denied) return denied;
    return jsonOk(classProgressPlanResponseSchema, {
      data: { plan: null, schedule: null, studentPlans: [] },
    });
  }),

  http.put("/api/classes/:id/progress-plan", async ({ params, request }) => {
    const classId = String(params.id);
    const denied = guardClass(classId);
    if (denied) return denied;
    const parsed = await readRule(request);
    if (!parsed.success) return invalid(parsed.error);
    return jsonOk(
      progressPlanResponseSchema,
      {
        data: {
          id: crypto.randomUUID(),
          classId,
          studentId: null,
          ...parsed.data,
          weekdays: [...new Set(parsed.data.weekdays)].sort((a, b) => a - b),
        },
      },
      { status: 201 },
    );
  }),

  http.post(
    "/api/classes/:id/progress-plan/preview",
    async ({ params, request }) => {
      const classId = String(params.id);
      const denied = guardClass(classId);
      if (denied) return denied;
      const query = progressPlanQuerySchema.safeParse(
        Object.fromEntries(new URL(request.url).searchParams),
      );
      if (!query.success) return invalid(query.error);
      const parsed = await readRule(request);
      if (!parsed.success) return invalid(parsed.error);
      return jsonOk(progressPlanPreviewResponseSchema, {
        data: {
          schedule: mockPlanSchedule(
            classId,
            parsed.data,
            query.data.day ?? MOCK_PLAN_DAY,
          ),
        },
      });
    },
  ),
];
