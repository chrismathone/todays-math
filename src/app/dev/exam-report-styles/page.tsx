import { notFound } from "next/navigation";
import { connection } from "next/server";
import { devPageVisible } from "@/lib/devPageAccess";
import { ExamReportStyles } from "./ExamReportStyles";

export default async function ExamReportStylesPage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();
  return <ExamReportStyles />;
}
