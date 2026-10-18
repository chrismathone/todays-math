import { notFound } from "next/navigation";
import { connection } from "next/server";

import { devPageVisible } from "@/lib/devPageAccess";
import { ExamReportHifi } from "./ExamReportHifi";

/** D-07 시안만. 계정 판정 외에 학생·시험 DB를 읽지 않는다. */
export default async function ExamReportHifiPage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();
  return <ExamReportHifi />;
}
