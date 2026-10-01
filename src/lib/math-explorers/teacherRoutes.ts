/**
 * 개념 카드(탐험) 기록의 교사 끝점 둘 — **읽기만** (27번 문서 §4 공백 1 · 2 · 4).
 *
 *   GET /api/classes/{id}/math-srs/explorers   반 학생마다 요약 — 문지기는 `/api/classes/{id}/math-srs` 와 같다
 *   GET /api/students/{id}/math-srs/explorers  학생 한 명의 상세 — 문지기는 `/api/students/{id}/math-srs/course` 와 같다
 *
 * 저장 · 새 질의가 없다: 명단과 기록은 기존 읽기(`loadSrsClassRoster` · `loadCourseStudent` · `readSrsState`)로,
 * 소유 범위(지점 분리 — D-136)는 `requireOwnedClass` · `requireOwnedStudent` 로 묻는다.
 * 🔴 D-141 ⑵ — 응답은 `teacherSummary.ts` 의 투영뿐이고 strict 계약을 지난다(문항 글 · 보기 · 답 없음).
 */
import "server-only";
import { idParamSchema } from "@/contracts/common.contract";
import {
  explorerTeacherClassResponseSchema,
  explorerTeacherStudentResponseSchema,
} from "@/contracts/mathExplorersTeacher.contract";
import { authorizeAccount } from "@/lib/accountAccess";
import { accountRouteAllowed } from "@/lib/accountRouteAccess";
import {
  jsonError,
  jsonOk,
  notFoundError,
  validationError,
} from "@/lib/apiResponse";
import { kstDateOf } from "@/lib/kstDate";
import { noStore } from "@/lib/learn/accountRoutes";
import { loadCourseStudent } from "@/lib/math-srs/courseServer";
import { teacherGate } from "@/lib/math-srs/courseTeacherRoutes";
import { loadSrsClassRoster } from "@/lib/math-srs/serverContext";
import { srsFailureResponse } from "@/lib/math-srs/serverRoutes";
import {
  SrsUnavailable,
  type StoredSrsState,
} from "@/lib/math-srs/serverState";
import { readSrsState } from "@/lib/math-srs/serverStore";
import { requireOwnedClass, requireOwnedStudent } from "@/lib/ownership";
import { routeAccessFor } from "@/lib/routeAccess";
import {
  explorerTeacherDetail,
  explorerTeacherSummary,
  TEACHER_FLAG_POLICY,
  type ExplorerTeacherAccount,
  type ExplorerTeacherRecord,
} from "./teacherSummary";

/** 학생 행의 계정 사실 — 꺼진 계정은 없는 것으로 친다(반 복습 현황의 `hasAccount` 와 같다). 만든 날은 KST 날짜로. */
function accountFacts(
  account: { disabledAt: Date | null; createdAt?: Date } | null,
): ExplorerTeacherAccount {
  return {
    hasAccount: !!account && !account.disabledAt,
    createdOn: account?.createdAt ? kstDateOf(account.createdAt) : null,
  };
}

/** 투영이 읽는 두 칸. 다른 학생의 탐험 기록이 앉아 있으면 읽지 않는다(학생 끝점 `routes.ts` 와 같은 확인). */
function teacherRecord(
  state: StoredSrsState | undefined,
  studentId: string,
): ExplorerTeacherRecord | null {
  if (!state) return null;
  if (state.explorers && state.explorers.profile.id !== studentId)
    throw new SrsUnavailable(
      "저장된 개념 탐험 기록을 확인해야 합니다. 선생님께 알려 주세요.",
    );
  return { explorers: state.explorers, expedition: state.expedition };
}

export async function handleExplorerTeacherClass(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // 문지기 — `src/app/api/classes/[id]/math-srs/route.ts` 와 글자까지 같게(짝 시험이 두 끝점을 같은 표로 견준다).
  const access = await authorizeAccount(request);
  if (access.response) return noStore(access.response);
  const path = new URL(request.url).pathname;
  if (
    !accountRouteAllowed(access.account, "GET", path) ||
    (!access.account.isAdmin &&
      routeAccessFor(access.account.role, "GET", path) === "deny")
  )
    return noStore(
      jsonError("FORBIDDEN", "수업 · 학생 관리 권한이 필요합니다.", 403),
    );
  const parsed = idParamSchema.safeParse(await params);
  if (!parsed.success) return noStore(validationError(parsed.error));
  const owned = await requireOwnedClass(parsed.data.id, access.account);
  if (!owned.ok) return noStore(owned.response);
  try {
    const today = kstDateOf(new Date());
    const { students, states } = await loadSrsClassRoster(owned.data.id);
    return noStore(
      jsonOk(explorerTeacherClassResponseSchema, {
        data: {
          class: { id: owned.data.id, name: owned.data.name },
          today,
          policy: TEACHER_FLAG_POLICY,
          students: students.map((student) => {
            const account = accountFacts(student.studentAccount);
            return {
              id: student.id,
              name: student.name,
              hasAccount: account.hasAccount,
              summary: explorerTeacherSummary(
                teacherRecord(states.get(student.id), student.id),
                today,
                account,
              ),
            };
          }),
        },
      }),
    );
  } catch (error) {
    return srsFailureResponse(error);
  }
}

export async function handleExplorerTeacherStudent(
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
    const today = kstDateOf(new Date());
    const saved = await readSrsState(student.id);
    const account = accountFacts(student.studentAccount);
    return noStore(
      jsonOk(explorerTeacherStudentResponseSchema, {
        data: {
          student: {
            id: student.id,
            name: student.name,
            classId: student.classId,
            className: student.class.name,
            hasAccount: account.hasAccount,
          },
          today,
          policy: TEACHER_FLAG_POLICY,
          // 저장된 줄이 없으면 빈 기록이 온다 — 탐험 칸이 없어 «시작 전»으로 읽힌다
          detail: explorerTeacherDetail(
            teacherRecord(saved.state, student.id),
            today,
            account,
          ),
        },
      }),
    );
  } catch (error) {
    return srsFailureResponse(error);
  }
}
