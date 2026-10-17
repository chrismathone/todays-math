import { notFound } from "next/navigation";
import { connection } from "next/server";

import { devPageVisible } from "@/lib/devPageAccess";

import { ExamReportWire } from "./ExamReportWire";

/**
 * **월말평가 성적표 — Wire 시안** (D-07 · 절대 규칙 1, 2026-10-17).
 *
 * 원장님: 월말평가는 학생 성적표를 따로 낸다(일일 · 주간은 그 달 리포트에 회차 하나로) · 쪽수는 괜찮다 ·
 * 넣을 것 · 뺄 것은 미리 켜고 끄는 단추로 · 요약 한 장 시안 · 여러 장 시안 · 반 성적표 지면을 보자.
 * 계획서 `docs/planning/monthly-exam-plan-20261017.md` §10.6. DB 를 읽지 않는다 — 지어낸 작은 픽스처다.
 */
export default async function ExamReportWirePage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();
  return <ExamReportWire />;
}
