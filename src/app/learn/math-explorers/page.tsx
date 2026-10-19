import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/learn/studentRequest";

export const metadata: Metadata = { title: "개념 탐험 · 오늘 수학" };

export default async function StudentMathExplorersPage() {
  const student = await getStudentSession();
  if (!student) redirect("/learn/login");
  if (student.mustChangePassword) redirect("/learn/password");
  redirect("/learn");
}
