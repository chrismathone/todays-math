import "server-only";
import { idParamSchema, uuidSchema } from "@/contracts/common.contract";
import {
  courseDashboardResponseSchema,
  coursePlanInputSchema,
  courseRosterStudentResponseSchema,
  courseStudentDetailResponseSchema,
} from "@/contracts/mathSrsCourse.contract";
import { authorizeAccount } from "@/lib/accountAccess";
import {
  accountRouteAllowed,
  srsTeacherManagementRoute,
} from "@/lib/accountRouteAccess";
import { recordAudit } from "@/lib/audit";
import {
  jsonError,
  jsonOk,
  notFoundError,
  validationError,
} from "@/lib/apiResponse";
import { noStore } from "@/lib/learn/accountRoutes";
import {
  requireOwnedStudent,
  requireOwnedStudentInClass,
} from "@/lib/ownership";
import { routeAccessFor } from "@/lib/routeAccess";
import { emptyCourseState, setCoursePlan } from "./courseAutomation";
import { courseFailureResponse } from "./courseRoutes";
import {
  courseRosterDto,
  loadCourseDashboard,
  loadCourseStudent,
  loadCourseStudentDetail,
} from "./courseServer";
import { db } from "@/lib/db";
import {
  assertClassWrite,
  assertStudentEnrollment,
  ClassAccessDenied,
} from "@/lib/classAccess";
import {
  teacherScopeSchema,
  requireTeacherBranch,
  assertTeacherBranch,
} from "./teacherScope";
import { changeSrsState, guardedSrsStateTable } from "./serverStore";

/** «오늘의 기억» 교사 끝점의 문지기 — 탐험 교사 보기(`math-explorers/teacherRoutes.ts`)도 이것을 지난다. */
export async function teacherGate(request: Request) {
  const access = await authorizeAccount(request);
  if (access.response) return access;
  const path = new URL(request.url).pathname;
  // The admin console can manage only these established SRS endpoints without a workspace menu.
  const adminTeacherRoute =
    access.account.isSuperAdmin &&
    srsTeacherManagementRoute(request.method, path);
  if (
    !accountRouteAllowed(access.account, request.method, path) ||
    (!access.account.isAdmin &&
      !access.account.isSuperAdmin &&
      routeAccessFor(access.account.role, request.method, path) === "deny") ||
    (!adminTeacherRoute && !access.account.menus.includes("srs"))
  )
    return {
      account: null,
      response: noStore(
        jsonError("FORBIDDEN", "자동 복습 관리 권한이 필요합니다.", 403),
      ),
    };
  return access;
}

export async function handleCourseDashboard(request: Request) {
  const access = await teacherGate(request);
  if (access.response) return noStore(access.response);
  const scope = teacherScopeSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!scope.success) return noStore(validationError(scope.error));
  try {
    return noStore(
      jsonOk(courseDashboardResponseSchema, {
        data: await loadCourseDashboard(
          access.account,
          new Date(),
          scope.data.branchId,
        ),
      }),
    );
  } catch (error) {
    if (error instanceof ClassAccessDenied)
      return noStore(jsonError("FORBIDDEN", error.message, 403));
    return courseFailureResponse(error);
  }
}

export async function handleCourseTeacherStudent(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await teacherGate(request);
  if (access.response) return noStore(access.response);
  const parsed = idParamSchema.safeParse(await context.params);
  if (!parsed.success) return noStore(validationError(parsed.error));
  const scope = teacherScopeSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!scope.success) return noStore(validationError(scope.error));
  const requestedClassId = new URL(request.url).searchParams.get("classId");
  const classId =
    requestedClassId === null ? null : uuidSchema.safeParse(requestedClassId);
  if (classId && !classId.success)
    return noStore(validationError(classId.error));
  const capability =
    request.method === "GET" ? "student:read" : "progress:write";
  const owned = classId?.success
    ? await requireOwnedStudentInClass(
        parsed.data.id,
        classId.data,
        access.account,
        capability,
      )
    : await requireOwnedStudent(parsed.data.id, access.account, capability);
  if (!owned.ok) return noStore(owned.response);
  try {
    const branchDenied = await requireTeacherBranch(
      owned.data.classId,
      scope.data.branchId,
      db,
      parsed.data.id,
    );
    if (branchDenied) return noStore(branchDenied);
    const student = await loadCourseStudent(parsed.data.id, owned.data.classId);
    if (!student) return noStore(notFoundError("학생"));
    const now = new Date();
    if (request.method === "GET")
      return noStore(
        jsonOk(courseStudentDetailResponseSchema, {
          data: await loadCourseStudentDetail(student, now),
        }),
      );
    const input = coursePlanInputSchema.safeParse(
      await request.json().catch(() => undefined),
    );
    if (!input.success) return noStore(validationError(input.error));
    let changes: Record<string, string | number | boolean | null> = {};
    const guardedTable = guardedSrsStateTable(async (tx) => {
      await assertClassWrite(
        tx,
        access.account,
        student.classId,
        "progress:write",
      );
      await assertStudentEnrollment(tx, student.id, student.classId);
      await assertTeacherBranch(
        tx,
        student.classId,
        scope.data.branchId,
        student.id,
      );
    });
    const saved = await changeSrsState(
      student.id,
      (state) => {
        const previous = state.course ?? emptyCourseState();
        const course = setCoursePlan(previous, input.data, now);
        // The save may retry: compare against that attempt's snapshot, then
        // record only after the atomic write has actually succeeded.
        changes = {};
        for (const [field, suffix] of [
          ["startSectionId", "StartSectionId"],
          ["dailyQuestionCount", "DailyQuestionCount"],
          ["enabled", "Enabled"],
        ] as const) {
          const before = previous.plan?.[field] ?? null;
          const after = input.data[field];
          if (before !== after) {
            changes[`before${suffix}`] = before;
            changes[`after${suffix}`] = after;
          }
        }
        return Object.keys(changes).length ? { ...state, course } : state;
      },
      guardedTable,
      input.data.expectedRevision,
      // A frozen student mission must not lock the teacher out of the plan.
      { teacher: true },
    );
    if (Object.keys(changes).length)
      await recordAudit({
        actorId: access.account.id,
        action: "math_srs.course_plan_changed",
        outcome: "success",
        details: {
          studentId: student.id,
          revision: saved.revision,
          ...changes,
        },
      });
    return noStore(
      jsonOk(courseRosterStudentResponseSchema, {
        data: courseRosterDto(student, saved, now),
      }),
    );
  } catch (error) {
    if (error instanceof ClassAccessDenied)
      return noStore(jsonError("FORBIDDEN", error.message, 403));
    return courseFailureResponse(error);
  }
}
