import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LectureList } from "@/components/learn/LectureList";
import { getStudentSession } from "@/lib/learn/studentRequest";

export const metadata: Metadata = { title: "강의 자료 · 오늘 수학" };

export default async function LearnLecturesPage() {
  const student = await getStudentSession();
  if (!student) redirect("/learn/login");
  if (student.mustChangePassword) redirect("/learn/password");
  return <LectureList />;
}
