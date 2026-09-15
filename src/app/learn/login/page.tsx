import { StudentLoginForm } from "@/components/learn/StudentLoginForm";

export const metadata = {
  title: "오늘의 개념 · 학생 로그인",
};

/**
 * 학생 로그인 — 원장님 로그인(`/login`)과 섞지 않는다(D-125 ⑷). 이미 들어온 학생은 관문이 `/learn` 으로 보낸다.
 */
export default function StudentLoginPage() {
  return <StudentLoginForm />;
}
