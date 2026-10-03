import { StudentPasswordForm } from "@/components/learn/StudentPasswordForm";
import { getStudentSession } from "@/lib/learn/studentRequest";
import { normalizeStudentReturnTo } from "@/lib/learn/studentReturnTo";

export const metadata = {
  title: "오늘의 개념 · 비밀번호 바꾸기",
};

/**
 * 첫 로그인 학생은 관문이 여기만 연다(`mustChangePassword` — student-auth §2.2).
 * 윗줄 이름은 세션의 학생 이름이다(D-128 ⑵) — 반은 목록 API 가 주므로 이 화면은 이름만.
 */
export default async function StudentPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const [student, query] = await Promise.all([
    getStudentSession(),
    searchParams,
  ]);
  return (
    <StudentPasswordForm
      studentName={student?.name ?? null}
      returnTo={normalizeStudentReturnTo(query.returnTo)}
    />
  );
}
