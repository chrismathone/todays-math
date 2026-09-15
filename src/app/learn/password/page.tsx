import { StudentPasswordForm } from "@/components/learn/StudentPasswordForm";

export const metadata = {
  title: "오늘의 개념 · 비밀번호 바꾸기",
};

/** 첫 로그인 학생은 관문이 여기만 연다(`mustChangePassword` — student-auth §2.2) */
export default function StudentPasswordPage() {
  return <StudentPasswordForm />;
}
