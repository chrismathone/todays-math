import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/learn/studentRequest";

export default async function ListeningLayout({
  children,
}: {
  children: ReactNode;
}) {
  const student = await getStudentSession();
  if (!student) redirect("/learn/login");
  if (student.mustChangePassword) redirect("/learn/password");
  return children;
}
