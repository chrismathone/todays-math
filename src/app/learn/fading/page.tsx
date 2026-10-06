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
  return <StudentFadingApp />;
}
