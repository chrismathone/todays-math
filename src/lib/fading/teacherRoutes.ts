import "server-only";
import { idParamSchema, uuidSchema } from "@/contracts/common.contract";
import { FADING_VIEW_DAYS } from "@/contracts/fadingApi.contract";
import {
  fadingTeacherDashboardResponseSchema,
  fadingTeacherQuotaInputSchema,
  fadingTeacherQuotaResponseSchema,
  fadingTeacherStudentResponseSchema,
} from "@/contracts/fadingTeacher.contract";
import {
  jsonError,
  jsonOk,
  notFoundError,
  validationError,
} from "@/lib/apiResponse";
import { recordAudit } from "@/lib/audit";
import {
  assertClassWrite,
  assertStudentEnrollment,
  ClassAccessDenied,
} from "@/lib/classAccess";
import { db } from "@/lib/db";
import { kstDateOf } from "@/lib/kstDate";
import { noStore } from "@/lib/learn/accountRoutes";
import { courseFailureResponse } from "@/lib/math-srs/courseRoutes";
import { loadCourseStudent, loadSrsRoster } from "@/lib/math-srs/courseServer";
import { teacherGate } from "@/lib/math-srs/courseTeacherRoutes";
import { readSrsState } from "@/lib/math-srs/serverStore";
import {
  assertTeacherBranch,
  requireTeacherBranch,
  teacherScopeSchema,
} from "@/lib/math-srs/teacherScope";
import {
  requireOwnedStudent,
  requireOwnedStudentInClass,
} from "@/lib/ownership";
import { fadingConceptMap } from "./catalog";
import { fadingEnabled, fadingReadable } from "./enabled";
import {
  canEditFadingQuota,
  fadingQuotaChange,
  fadingQuotaView,
  type FadingQuotaRow,
} from "./quota";
import {
  fadingCapDayCounts,
  fadingDateValue,
  fadingQuotaRowOf,
  readFadingQuotaRow,
} from "./quotaServer";
import { fadingRelearnLimits } from "./relearn";
import {
  FADING_QUOTA_CHECK_WINDOW_DAYS,
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
    // 분량 점검 필요의 근거 — 학생 기록 밖의 표에서 한 번에 센다.
    const capDays = await fadingCapDayCounts(
      roster.students.map(({ student }) => student.id),
      today,
      FADING_QUOTA_CHECK_WINDOW_DAYS,
    );
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
                { capDays: capDays.get(student.id) ?? 0 },
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
    const [quotaRow, capDays] = await Promise.all([
      readFadingQuotaRow(student.id),
      fadingCapDayCounts([student.id], today, FADING_QUOTA_CHECK_WINDOW_DAYS),
    ]);
    // 오늘 멈춘 문장 — 이름(용어)만. 은행에서 사라진 것은 내지 않는다.
    const relearnStops = fading?.relearn
      ? fadingRelearnLimits(
          fading.relearn,
          Date.parse(`${today}T12:00:00+09:00`),
        ).stopped.flatMap((key) => {
          const [conceptId, propositionId] = key.split("/") as [string, string];
          const proposition = concepts
            .get(conceptId)
            ?.propositions.find((p) => p.id === propositionId);
          return proposition
            ? [{ conceptId, propositionId, term: proposition.term }]
            : [];
        })
      : [];
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
            { capDays: capDays.get(student.id) ?? 0 },
          ),
          concepts: fadingTeacherConcepts(fading, concepts, today),
          days: fading?.days.slice(-FADING_VIEW_DAYS) ?? [],
          quota: {
            ...fadingQuotaView(quotaRow, today),
            canEdit: canEditFadingQuota(access.account),
          },
          relearnStops,
        },
      }),
    );
  } catch (error) {
    if (error instanceof ClassAccessDenied)
      return noStore(jsonError("FORBIDDEN", error.message, 403));
    return courseFailureResponse(error);
  }
}

export const FADING_QUOTA_CONFLICT =
  "분량 설정이 변경되었습니다. 최신 설정을 확인한 뒤 다시 저장해 주세요.";
export const FADING_QUOTA_FORBIDDEN =
  "분량 변경은 원장 · 지점 관리자가 할 수 있습니다.";
class QuotaConflict extends Error {}

/**
 * PUT /api/students/{id}/math-srs/fading — 다음 한국 날짜부터의 하루 분량(원장님 결정 2026-10-17 · `quota.ts`).
 * 문지기는 읽기와 같고(`teacherGate`), 바꾸는 사람은 원장 · 지점 관리자다(`canEditFadingQuota`). 소유 · 지점 · 지금 반 등록은
 * **저장 거래 안에서 다시** 본다(진도 계획 쓰기와 같은 꼴). 덮어쓰기는 revision 으로 막는다 — 다르면 409 이고 아무것도 쓰지 않는다.
 * 🔴 학생 기록 JSON 을 건드리지 않는다 — 정책 표(`fading_student_policy`) 한 행만 쓴다. 문(`MATH_FADING`)이 «읽기만»이면 404 다.
 */
export async function handleFadingTeacherQuota(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!fadingEnabled()) return closed();
  const access = await teacherGate(request);
  if (access.response) return noStore(access.response);
  if (!canEditFadingQuota(access.account))
    return noStore(jsonError("FORBIDDEN", FADING_QUOTA_FORBIDDEN, 403));
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
        "progress:write",
      )
    : await requireOwnedStudent(
        parsed.data.id,
        access.account,
        "progress:write",
      );
  if (!owned.ok) return noStore(owned.response);
  const input = fadingTeacherQuotaInputSchema.safeParse(
    await request.json().catch(() => undefined),
  );
  if (!input.success) return noStore(validationError(input.error));
  const studentId = parsed.data.id;
  const today = kstDateOf(new Date());
  try {
    const done = await db.$transaction(async (tx) => {
      await assertClassWrite(
        tx,
        access.account,
        owned.data.classId,
        "progress:write",
      );
      await assertStudentEnrollment(tx, studentId, owned.data.classId);
      await assertTeacherBranch(
        tx,
        owned.data.classId,
        scope.data.branchId,
        studentId,
      );
      const current = fadingQuotaRowOf(
        await tx.fadingStudentPolicy.findUnique({ where: { studentId } }),
      );
      if ((current?.revision ?? 0) !== input.data.expectedRevision)
        throw new QuotaConflict();
      const change = fadingQuotaChange(current, today, input.data.quota);
      if (!change) return { row: current, before: current };
      const data = {
        quota: change.quota,
        previousQuota: change.previousQuota,
        effectiveOn: fadingDateValue(change.effectiveOn),
        updatedById: access.account.id,
      };
      if (!current) {
        await tx.fadingStudentPolicy.create({
          data: { studentId, ...data, revision: 1 },
        });
      } else {
        const written = await tx.fadingStudentPolicy.updateMany({
          where: { studentId, revision: current.revision },
          data: { ...data, revision: current.revision + 1 },
        });
        if (written.count !== 1) throw new QuotaConflict();
      }
      const row: FadingQuotaRow = {
        ...change,
        revision: (current?.revision ?? 0) + 1,
      };
      return { row, before: current };
    });
    if (done.row !== done.before)
      await recordAudit({
        actorId: access.account.id,
        action: "math_srs.fading_quota_changed",
        outcome: "success",
        details: {
          studentId,
          revision: done.row!.revision,
          beforeQuota: done.before?.quota ?? null,
          afterQuota: done.row!.quota,
          effectiveOn: done.row!.effectiveOn,
        },
      });
    return noStore(
      jsonOk(fadingTeacherQuotaResponseSchema, {
        data: { ...fadingQuotaView(done.row, today), canEdit: true },
      }),
    );
  } catch (error) {
    // 처음 만드는 행을 둘이 동시에 만들면 하나는 고유 키에 걸린다 — 그것도 «먼저 바뀜»이다.
    if (
      error instanceof QuotaConflict ||
      (error as { code?: string } | null)?.code === "P2002"
    )
      return noStore(jsonError("CONFLICT", FADING_QUOTA_CONFLICT, 409));
    if (error instanceof ClassAccessDenied)
      return noStore(jsonError("FORBIDDEN", error.message, 403));
    return courseFailureResponse(error);
  }
}
