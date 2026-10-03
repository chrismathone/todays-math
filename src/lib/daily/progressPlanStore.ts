/**
 * 진도 계획 **읽기·쓰기** — 반 계획 라우트 · 학생 계획 라우트 · 반 만들기가 같이 쓴다 (D-129 ④의 뒷단).
 *
 * 규칙(날짜 펴기)은 여기 없다 — `progressPlan.ts` · `planSchedule.ts` 순수 함수다. 여기는 DB 와 응답 모양만.
 * 소유 판정도 여기 없다 — 라우트가 먼저 한다(`ownership.ts` · D-130).
 *
 * ## 🔴 한 줄 규칙 — 둘째 계획은 **덮어쓴다**
 *
 * 반 계획은 반에 하나(부분 unique `progress_plan_class_only_key`), 학생 계획은 학생에 하나
 * (`progress_plan_student_id_key`). PUT 은 있으면 **같은 행을 고쳐 쓰고**(200) 없으면 만든다(201).
 * 까닭: 계획은 기록이 아니라 **규칙**이다 — 지난 규칙을 남길 까닭이 없고(실제는 `Progress` 가 남긴다),
 * 거절(409)로 두면 화면이 «있나 없나»를 먼저 물어야 하고 두 번 누른 저장이 오류로 보인다.
 * 두 요청이 동시에 «없음»을 보고 둘 다 만들려 하면 DB 의 unique 가 하나를 막는다(P2002) —
 * 그때는 막힌 쪽이 다시 찾아 고쳐 쓴다. 조용히 두 줄이 되는 길은 없다.
 *
 * ## 422 — 본문이 계약을 어기면
 *
 * 형식(요일·차시 수·날짜)도, 없는 차시도 422 `VALIDATION_ERROR` 에 칸 이름을 싣는다(브리프 §3).
 * 없는 차시를 DB 에 맡기면 FK(Restrict)가 500 으로 터진다 — 넣기 전에 본다.
 */
import type { Prisma, ProgressPlan as ProgressPlanRow } from "@prisma/client";
import type { z, ZodError } from "zod";

import type {
  PlanScheduleEntity,
  PlanUnitRef,
  ProgressPlanEntity,
  ProgressPlanPatchRequest,
  ProgressPlanWriteRequest,
} from "@/contracts/dailyAutoTest.contract";
import { jsonError, toFieldErrorDetails } from "@/lib/apiResponse";
import {
  buildPlanSchedule,
  planScheduleWindow,
} from "@/lib/daily/planSchedule";
import { loadLastTeachableUnitId } from "@/lib/daily/teachableBoundary";
import type { ProgressPlanRule } from "@/lib/daily/progressPlan";
import { db } from "@/lib/db";
import { assertClassWrite, assertStudentEnrollment } from "@/lib/classAccess";
import type { ScopeViewer } from "@/lib/ownerScope";
import { isPrismaErrorCode } from "@/lib/prismaErrors";

const isoDay = (value: Date): string => value.toISOString().slice(0, 10);
const dayToDate = (day: string): Date => new Date(`${day}T00:00:00.000Z`);

export function serializeProgressPlan(
  row: ProgressPlanRow,
): ProgressPlanEntity {
  return {
    id: row.id,
    classId: row.classId,
    studentId: row.studentId,
    weekdays: [...row.weekdays],
    unitsPerLesson: row.unitsPerLesson,
    startUnitId: row.startUnitId,
    startDate: isoDay(row.startDate),
    active: row.active,
  };
}

/** 저장된 행을 규칙 순수 함수의 입력 모양으로. */
export function ruleOf(row: ProgressPlanRow): ProgressPlanRule {
  return {
    weekdays: row.weekdays,
    unitsPerLesson: row.unitsPerLesson,
    startUnitId: row.startUnitId,
    startDate: isoDay(row.startDate),
    active: row.active,
  };
}

// ─────────────────────────────────────────────
// 422
// ─────────────────────────────────────────────

const INVALID_MESSAGE = "요청 값이 올바르지 않습니다.";

export function planValidationError(error: ZodError) {
  return jsonError(
    "VALIDATION_ERROR",
    INVALID_MESSAGE,
    422,
    toFieldErrorDetails(error),
  );
}

/** 한 칸짜리 422 — 없는 차시 · 개별 진도 학생이 아님. */
export function planFieldError(field: string, message: string) {
  return jsonError("VALIDATION_ERROR", message, 422, [{ field, message }]);
}

export const MISSING_UNIT_MESSAGE = "시작 차시를 찾을 수 없습니다.";

/** 본문을 읽어 계약으로 거른다. JSON 이 아니어도 422 다(본문이 계약을 어긴 것). */
export async function parsePlanBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: Response }> {
  const body = await request.json().catch(() => undefined);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return { ok: false, response: planValidationError(parsed.error) };
  return { ok: true, data: parsed.data };
}

/** 시작 차시가 있나 — 없으면 422 응답을 돌려준다. `startUnitId` 가 안 왔으면 묻지 않는다. */
export async function checkStartUnit(
  startUnitId: string | undefined,
): Promise<Response | null> {
  if (startUnitId === undefined) return null;
  const unit = await db.unit.findUnique({ where: { id: startUnitId } });
  return unit ? null : planFieldError("startUnitId", MISSING_UNIT_MESSAGE);
}

// ─────────────────────────────────────────────
// 쓰기
// ─────────────────────────────────────────────

/** 요일은 겹침 없이 차례대로 둔다 — 같은 규칙이 두 모양으로 저장되지 않게. */
const normalizeWeekdays = (weekdays: readonly number[]): number[] =>
  [...new Set(weekdays)].sort((a, b) => a - b);

type PlanData = {
  weekdays?: number[];
  unitsPerLesson?: number;
  startUnitId?: string;
  startDate?: Date;
  active?: boolean;
};

function toPlanData(
  input: ProgressPlanWriteRequest | ProgressPlanPatchRequest,
): PlanData {
  const data: PlanData = {};
  if (input.weekdays !== undefined)
    data.weekdays = normalizeWeekdays(input.weekdays);
  if (input.unitsPerLesson !== undefined)
    data.unitsPerLesson = input.unitsPerLesson;
  if (input.startUnitId !== undefined) data.startUnitId = input.startUnitId;
  if (input.startDate !== undefined)
    data.startDate = dayToDate(input.startDate);
  if (input.active !== undefined) data.active = input.active;
  return data;
}

/** 반 계획이면 `studentId: null`, 학생 계획이면 그 학생 — 한 줄을 찾는 조건. */
export type PlanTarget = { classId: string; studentId: string | null };

export function findPlan(
  target: PlanTarget,
  client: Prisma.TransactionClient = db,
) {
  return client.progressPlan.findFirst({
    where:
      target.studentId === null
        ? { classId: target.classId, studentId: null }
        : { studentId: target.studentId, classId: target.classId },
  });
}

/** 새 계획 한 줄의 데이터 — 반 만들기(트랜잭션 안)와 `putPlan` 이 같이 쓴다. */
export function planCreateData(
  target: PlanTarget,
  input: ProgressPlanWriteRequest,
) {
  const data = toPlanData(input);
  return {
    classId: target.classId,
    studentId: target.studentId,
    weekdays: data.weekdays!,
    unitsPerLesson: data.unitsPerLesson!,
    startUnitId: data.startUnitId!,
    startDate: data.startDate!,
    active: data.active!,
  };
}

/** 넣기 또는 덮어쓰기. `created` 가 참이면 새 행(201). */
async function authorizePlanWrite(
  tx: Prisma.TransactionClient,
  viewer: ScopeViewer,
  target: PlanTarget,
) {
  await assertClassWrite(tx, viewer, target.classId, "progress:write");
  if (target.studentId)
    await assertStudentEnrollment(tx, target.studentId, target.classId);
}

export async function putPlan(
  target: PlanTarget,
  input: ProgressPlanWriteRequest,
  viewer: ScopeViewer,
): Promise<{ row: ProgressPlanRow; created: boolean }> {
  const attempt = () =>
    db.$transaction(async (tx) => {
      await authorizePlanWrite(tx, viewer, target);
      const existing = await findPlan(target, tx);
      if (existing)
        return {
          row: await tx.progressPlan.update({
            where: { id: existing.id },
            data: toPlanData(input),
          }),
          created: false,
        };
      return {
        row: await tx.progressPlan.create({
          data: planCreateData(target, input),
        }),
        created: true,
      };
    });
  try {
    return await attempt();
  } catch (error) {
    // PostgreSQL aborts the losing transaction on a unique conflict. Retry in a fresh one.
    if (!isPrismaErrorCode(error, "P2002")) throw error;
    return attempt();
  }
}

export function patchPlan(
  id: string,
  input: ProgressPlanPatchRequest,
  target: PlanTarget,
  viewer: ScopeViewer,
) {
  return db.$transaction(async (tx) => {
    await authorizePlanWrite(tx, viewer, target);
    return tx.progressPlan.update({
      where: { id, ...target },
      data: toPlanData(input),
    });
  });
}

export function deletePlan(
  id: string,
  target: PlanTarget,
  viewer: ScopeViewer,
) {
  return db.$transaction(async (tx) => {
    await authorizePlanWrite(tx, viewer, target);
    return tx.progressPlan.delete({ where: { id, ...target } });
  });
}

// ─────────────────────────────────────────────
// 읽기 — 이번 주 예정
// ─────────────────────────────────────────────

const PROGRESS_SELECT = {
  id: true,
  classId: true,
  studentId: true,
  unitId: true,
  recordedAt: true,
  createdAt: true,
} as const;

type ProgressPick = {
  id: string;
  classId: string;
  studentId: string | null;
  unitId: string;
  recordedAt: Date;
  createdAt: Date;
};

const toRecord = (r: ProgressPick) => ({
  id: r.id,
  classId: r.classId,
  studentId: r.studentId,
  unitId: r.unitId,
  recordedAt: isoDay(r.recordedAt),
  createdAt: r.createdAt.toISOString(),
});

/**
 * 계획을 이번 주 예정으로 편다. 반 계획이면 반 진도만, 학생 계획이면 그 학생의 **적용 진도**
 * (`applicableProgress` — 개별 기록이 없으면 반 기록)로 편다.
 */
export async function loadPlanSchedule(args: {
  rule: ProgressPlanRule;
  classId: string;
  student: { id: string; useIndividualProgress: boolean } | null;
  day: string;
}): Promise<PlanScheduleEntity> {
  const { rule, classId, student, day } = args;
  const { from, to } = planScheduleWindow(day);

  const [units, classRows, studentRows] = await Promise.all([
    db.unit.findMany({
      select: {
        id: true,
        grade: true,
        chapter: true,
        section: true,
        orderIndex: true,
      },
    }),
    db.progress.findMany({
      where: { retiredAt: null, classId, studentId: null },
      select: PROGRESS_SELECT,
    }),
    student
      ? db.progress.findMany({
          where: { retiredAt: null, studentId: student.id, classId },
          select: PROGRESS_SELECT,
        })
      : Promise.resolve([] as ProgressPick[]),
  ]);

  const rows = buildPlanSchedule({
    rule,
    units,
    classProgress: classRows.map(toRecord),
    studentProgress: studentRows.map(toRecord),
    useIndividualProgress: student?.useIndividualProgress ?? false,
    from,
    to,
    // 🔴 아침 회차·오늘의 확인테스트와 **같은 경계** — 예정 목록만 공통수학1 로 걸어 들어가면
    //    「목록과 아침 초안이 다른」 반이 된다(2026-09-18 시뮬레이션 ⑵).
    lastTeachableUnitId: await loadLastTeachableUnitId(units),
  });

  const refById = new Map<string, PlanUnitRef>(
    units.map((u) => [
      u.id,
      { id: u.id, grade: u.grade, chapter: u.chapter, section: u.section },
    ]),
  );
  const refs = (ids: readonly string[]) =>
    ids.flatMap((id) => {
      const ref = refById.get(id);
      return ref ? [ref] : [];
    });

  return {
    from,
    to,
    rows: rows.map((r) => ({
      date: r.date,
      weekday: r.weekday,
      lesson: r.lesson,
      planned: refs(r.plannedUnitIds),
      actual: refs(r.actualUnitIds),
      driftDays: r.driftDays,
      atCurriculumEnd: r.atCurriculumEnd,
    })),
  };
}
