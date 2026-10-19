import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/learn/studentRequest";

export const metadata: Metadata = { title: "초등 수학 자동 복습 · 오늘 수학" };

export default async function StudentMathSrsPage() {
  const student = await getStudentSession();
  if (!student) redirect("/learn/login");
  if (student.mustChangePassword) redirect("/learn/password");
  redirect("/learn");
}
