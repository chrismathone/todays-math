import "server-only";
import { idParamSchema } from "@/contracts/common.contract";
import {
  courseDashboardResponseSchema,
  coursePlanInputSchema,
  courseRosterStudentResponseSchema,
  courseStudentDetailResponseSchema,
} from "@/contracts/mathSrsCourse.contract";
import { authorizeAccount } from "@/lib/accountAccess";
import { accountRouteAllowed } from "@/lib/accountRouteAccess";
import {
  jsonError,
  jsonOk,
  notFoundError,
  validationError,
} from "@/lib/apiResponse";
import { noStore } from "@/lib/learn/accountRoutes";
import { requireOwnedStudent } from "@/lib/ownership";
import { routeAccessFor } from "@/lib/routeAccess";
import { emptyCourseState, setCoursePlan } from "./courseAutomation";
import { courseFailureResponse } from "./courseRoutes";
import {
  courseRosterDto,
  loadCourseDashboard,
  loadCourseStudent,
  loadCourseStudentDetail,
} from "./courseServer";
import { changeSrsState } from "./serverStore";

/** «오늘의 기억» 교사 끝점의 문지기 — 탐험 교사 보기(`math-explorers/teacherRoutes.ts`)도 이것을 지난다. */
export async function teacherGate(request: Request) {
  const access = await authorizeAccount(request);
  if (access.response) return access;
  const path = new URL(request.url).pathname;
  if (
    !accountRouteAllowed(access.account, request.method, path) ||
    (!access.account.isAdmin &&
      routeAccessFor(access.account.role, request.method, path) === "deny") ||
    (!access.account.isAdmin && !access.account.menus.includes("srs"))
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
  try {
    return noStore(
      jsonOk(courseDashboardResponseSchema, {
        data: await loadCourseDashboard(access.account, new Date()),
      }),
    );
  } catch (error) {
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
  const owned = await requireOwnedStudent(parsed.data.id, access.account);
  if (!owned.ok) return noStore(owned.response);
  try {
    const student = await loadCourseStudent(parsed.data.id);
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
    const saved = await changeSrsState(
      student.id,
      (state) => ({
        ...state,
        course: setCoursePlan(
          state.course ?? emptyCourseState(),
          input.data,
          now,
        ),
      }),
      undefined,
      input.data.expectedRevision,
      // A frozen student mission must not lock the teacher out of the plan.
      { teacher: true },
    );
    return noStore(
      jsonOk(courseRosterStudentResponseSchema, {
        data: courseRosterDto(student, saved, now),
      }),
    );
  } catch (error) {
    return courseFailureResponse(error);
  }
}
