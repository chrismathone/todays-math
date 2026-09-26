import type { Metadata } from "next";
import { redirect } from "next/navigation";
import StudentMathExplorers from "@/components/math-explorers/StudentMathExplorers";
import { getStudentSession } from "@/lib/learn/studentRequest";

export const metadata: Metadata = { title: "수학 탐험 · 오늘의수학" };

/** One entry for bank practice, concepts and review, sharing the same expedition. */
export default async function LearnHomePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const [student, query] = await Promise.all([
    getStudentSession(),
    searchParams,
  ]);
  if (!student) redirect("/learn/login");
  if (student.mustChangePassword) redirect("/learn/password");
  const view = query.view === "collection" ? "collection" : undefined;
  return <StudentMathExplorers key={view ?? "home"} initialView={view} />;
}
