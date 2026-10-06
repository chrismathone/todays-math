import "server-only";
import { idParamSchema, uuidSchema } from "@/contracts/common.contract";
import { FADING_VIEW_DAYS } from "@/contracts/fadingApi.contract";
import {
  fadingTeacherDashboardResponseSchema,
  fadingTeacherStudentResponseSchema,
} from "@/contracts/fadingTeacher.contract";
import {
  jsonError,
  jsonOk,
  notFoundError,
  validationError,
} from "@/lib/apiResponse";
import { ClassAccessDenied } from "@/lib/classAccess";
import { db } from "@/lib/db";
import { kstDateOf } from "@/lib/kstDate";
import { noStore } from "@/lib/learn/accountRoutes";
import { courseFailureResponse } from "@/lib/math-srs/courseRoutes";
import { loadCourseStudent, loadSrsRoster } from "@/lib/math-srs/courseServer";
import { teacherGate } from "@/lib/math-srs/courseTeacherRoutes";
import { readSrsState } from "@/lib/math-srs/serverStore";
import {
  requireTeacherBranch,
  teacherScopeSchema,
} from "@/lib/math-srs/teacherScope";
import {
  requireOwnedStudent,
  requireOwnedStudentInClass,
} from "@/lib/ownership";
import { fadingConceptMap } from "./catalog";
import { fadingReadable } from "./enabled";
import {
  FADING_TEACHER_POLICY,
  fadingTeacherConcepts,
  fadingTeacherSummary,
  type FadingTeacherAccount,
} from "./teacher";

/**
 * «오늘의 기억» 교사 현황의 끝점 둘 — 읽기뿐이다 (`docs/planning/srs-overhaul-20261006.md` §15 · 계약 `fadingTeacher.contract.ts`).
 *
 * 문지기 · 명단 · 범위는 옛 «SRS 현황»의 것을 **그대로** 쓴다(`teacherGate` · `loadSrsRoster` · 학생 소유 확인 · 주소의 지점 좁히기) —
 * 누가 어느 학생을 보는가를 두 벌로 적지 않는다. 문(`MATH_FADING`)이 꺼져 있으면 둘 다 404 다 —
 * 읽기뿐이라 «읽기만»(`read`)에서도 열린다(학생 기록의 새 칸을 쓰지 않는다 · `enabled.ts`).
 */

/** 학생 행의 계정 사실 — 꺼진 계정은 없는 것으로 친다. 만든 날은 한국 날짜로. */
function accountFacts(
  account: { disabledAt: Date | null; createdAt?: Date } | null,
): FadingTeacherAccount {
  return {
    hasAccount: !!account && !account.disabledAt,
    createdOn: account?.createdAt ? kstDateOf(account.createdAt) : null,
  };
}

const closed = () => noStore(notFoundError("주소"));

/** GET /api/math-srs/fading — 볼 수 있는 반의 학생마다 세는 값과 살펴볼 까닭. */
export async function handleFadingTeacherDashboard(
  request: Request,
): Promise<Response> {
  if (!fadingReadable()) return closed();
  const access = await teacherGate(request);
  if (access.response) return noStore(access.response);
  const scope = teacherScopeSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!scope.success) return noStore(validationError(scope.error));
  try {
    const roster = await loadSrsRoster(access.account, scope.data.branchId);
    const today = kstDateOf(new Date());
    const known = new Set(fadingConceptMap().keys());
    return noStore(
      jsonOk(fadingTeacherDashboardResponseSchema, {
        data: {
          today,
          policy: FADING_TEACHER_POLICY,
          management: roster.management,
          classes: roster.classes,
          students: roster.students.map(({ student, saved }) => {
            const account = accountFacts(student.studentAccount);
            return {
              id: student.id,
              name: student.name,
              classId: student.classId,
              className: student.class.name,
              classGrade: student.class.grade ?? null,
              hasAccount: account.hasAccount,
              summary: fadingTeacherSummary(
                saved.state.fading,
                today,
                account,
                known,
              ),
            };
          }),
        },
      }),
    );
  } catch (error) {
    if (error instanceof ClassAccessDenied)
      return noStore(jsonError("FORBIDDEN", error.message, 403));
    return courseFailureResponse(error);
  }
}

/** GET /api/students/{id}/math-srs/fading — 학생 하나의 숫자와 고른 개념의 상태(이름과 상태뿐 — 문장과 답은 싣지 않는다). */
export async function handleFadingTeacherStudent(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!fadingReadable()) return closed();
  const access = await teacherGate(request);
  if (access.response) return noStore(access.response);
  const parsed = idParamSchema.safeParse(await context.params);
  if (!parsed.success) return noStore(validationError(parsed.error));
  const url = new URL(request.url);
  const scope = teacherScopeSchema.safeParse(
    Object.fromEntries(url.searchParams),
  );
  if (!scope.success) return noStore(validationError(scope.error));
  const requestedClassId = url.searchParams.get("classId");
  const classId =
    requestedClassId === null ? null : uuidSchema.safeParse(requestedClassId);
  if (classId && !classId.success)
    return noStore(validationError(classId.error));
  const owned = classId?.success
    ? await requireOwnedStudentInClass(
        parsed.data.id,
        classId.data,
        access.account,
        "student:read",
      )
    : await requireOwnedStudent(parsed.data.id, access.account, "student:read");
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
    const today = kstDateOf(new Date());
    const concepts = fadingConceptMap();
    const fading = (await readSrsState(student.id)).state.fading;
    const account = accountFacts(student.studentAccount);
    return noStore(
      jsonOk(fadingTeacherStudentResponseSchema, {
        data: {
          today,
          policy: FADING_TEACHER_POLICY,
          student: {
            id: student.id,
            name: student.name,
            classId: student.classId,
            className: student.class.name,
            hasAccount: account.hasAccount,
          },
          summary: fadingTeacherSummary(
            fading,
            today,
            account,
            new Set(concepts.keys()),
          ),
          concepts: fadingTeacherConcepts(fading, concepts, today),
          days: fading?.days.slice(-FADING_VIEW_DAYS) ?? [],
        },
      }),
    );
  } catch (error) {
    if (error instanceof ClassAccessDenied)
      return noStore(jsonError("FORBIDDEN", error.message, 403));
    return courseFailureResponse(error);
  }
}
