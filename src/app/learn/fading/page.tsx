import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { fadingEnabled } from "@/lib/fading/enabled";
import { getStudentSession } from "@/lib/learn/studentRequest";
import { StudentFadingApp } from "@/components/fading/StudentFadingApp";
export const metadata: Metadata = { title: "오늘의 기억" };
export default async function StudentFadingPage() {
  if (!fadingEnabled()) notFound();
  const student = await getStudentSession();
  if (!student) redirect("/learn/login");
  if (student.mustChangePassword) redirect("/learn/password");
  // 화면을 연 학생에게 고정한다(D1) — 요청마다 그 id 를 싣고, 학생이 바뀌면 `key` 로 원천 · 상태를 새로 짓는다.
  return (
    <StudentFadingApp key={student.studentId} studentId={student.studentId} />
  );
}
