/**
 * 학생 API(`/api/learn/**`)가 «지금 이 요청의 학생»을 읽는 자리.
 *
 * `session.student` 만 본다 — 원장 세션(`session.user`)은 여기서 **학생이 아니다.** 원장님이 학생 화면을
 * 열어 봐도 학생 API 는 401 이다(원장님 계정으로 시청 기록이 쌓이면 n/m 이 거짓이 된다).
 * 관문(`proxy.ts`)도 학생 세션을 허용 목록으로 가두지만, 라우트가 **스스로** 한 번 더 본다 —
 * 관문 하나에만 기대면 관문의 규칙이 새는 날 라우트가 열린다. 첫 로그인(`mustChangePassword`)도
 * 같은 까닭으로 라우트가 다시 본다.
 */
import "server-only";

import type { StudentSession } from "@/contracts/studentAccount.contract";
import type { StudentOptionalMenu } from "@/contracts/studentLearningMenus.contract";
import { getStudentLearningMenus } from "./studentLearningMenusStore";
import { jsonError, unauthorizedError } from "@/lib/apiResponse";
import { auth } from "@/lib/auth";
import { STUDENT_MUST_CHANGE_MESSAGE } from "@/lib/studentRouteAccess";

export async function getStudentSession(): Promise<StudentSession | null> {
  const session = await auth();
  return session?.student ?? null;
}

export type StudentGate =
  | { student: StudentSession; response: null }
  | { student: null; response: Response };

/**
 * 학생 세션이 없으면 401. `active` 면 첫 비밀번호를 바꾼 학생만 — 아니면 403(까닭을 말한다).
 */
export async function requireStudent(opts: {
  active: boolean;
  menu?: StudentOptionalMenu;
}): Promise<StudentGate> {
  const student = await getStudentSession();
  if (!student) return { student: null, response: unauthorizedError() };
  if (opts.active && student.mustChangePassword)
    return {
      student: null,
      response: jsonError("FORBIDDEN", STUDENT_MUST_CHANGE_MESSAGE, 403),
    };
  if (opts.menu) {
    const menus = await getStudentLearningMenus(student.studentId).catch(
      () => ({
        enabled: [],
      }),
    );
    const enabled: readonly StudentOptionalMenu[] = menus.enabled;
    if (!enabled.includes(opts.menu))
      return {
        student: null,
        response: jsonError(
          "FORBIDDEN",
          "지점장이 이 학생에게 열어 준 기능만 이용할 수 있습니다.",
          403,
        ),
      };
  }
  return { student, response: null };
}
