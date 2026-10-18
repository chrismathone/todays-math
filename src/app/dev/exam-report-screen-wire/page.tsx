import { notFound } from "next/navigation";
import { connection } from "next/server";

import { devPageVisible } from "@/lib/devPageAccess";

import { ExamReportScreenWire } from "./ExamReportScreenWire";

/**
 * **월말평가 성적표 — 원장님 화면 Wire** (D-07 · 절대 규칙 1, 2026-10-18).
 *
 * 지면은 H1 로 정해졌다(`/dev/exam-report-hifi`). 이 시안은 그 지면을 **여는 · 문장을 쓰는 · 확정하는**
 * 원장님 화면의 짜임 4안이다. 계획서 `docs/planning/monthly-exam-plan-20261017.md` §14.
 * DB 를 읽지 않는다 — 지어낸 작은 픽스처다.
 */
export default async function ExamReportScreenWirePage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();
  return <ExamReportScreenWire />;
}
