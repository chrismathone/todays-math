import { notFound } from "next/navigation";
import { connection } from "next/server";
import { devPageVisible } from "@/lib/devPageAccess";
import { ExamReportScreenHifi } from "./ExamReportScreenHifi";

/** 원장님 화면 A의 세부 비교 시안. 실제 화면·확정 쓰기와 연결하지 않는다. */
export default async function ExamReportScreenHifiPage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();
  return <ExamReportScreenHifi />;
}
