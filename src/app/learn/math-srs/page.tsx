import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StudentMathSrs } from "@/components/math-srs/StudentMathSrs";
import { getStudentSession } from "@/lib/learn/studentRequest";

export const metadata: Metadata = { title: "매일 수학 복습 · 오늘의수학" };

export default async function StudentMathSrsPage() {
  const student = await getStudentSession();
  if (!student) redirect("/learn/login");
  if (student.mustChangePassword) redirect("/learn/password");
  return <StudentMathSrs />;
}
