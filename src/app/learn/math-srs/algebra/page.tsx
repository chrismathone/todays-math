import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/learn/studentRequest";

export const metadata: Metadata = {
  title: "중등 일차방정식 연습 · 오늘 수학",
};

export default async function StudentAlgebraSrsPage() {
  const student = await getStudentSession();
  if (!student) redirect("/learn/login");
  if (student.mustChangePassword) redirect("/learn/password");
  redirect("/learn");
}
