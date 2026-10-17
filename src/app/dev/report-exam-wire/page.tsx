import { notFound } from "next/navigation";
import { connection } from "next/server";

import { devPageVisible } from "@/lib/devPageAccess";

import { ReportExamWire } from "./ReportExamWire";

/**
 * **월말평가를 학부모 리포트에 — Wire 시안** (D-07 · 절대 규칙 1, 2026-10-17).
 *
 * 계획서 `docs/planning/monthly-exam-plan-20261017.md` §10.4 — 원장님 «추천으로 진행»(시험 1회 성적표 따로 없음 ·
 * AI 초안 없음 · 반 최고점 없음). 바탕은 23번 문서의 합의 Hi-fi H3(`/dev/report-hifi`)이고, 안끼리 다른 것은
 * **틀린 문항 · 다시 볼 단원을 A4 의 어디에 두나**뿐이다. DB 를 읽지 않는다 — 지어낸 작은 픽스처다.
 */
export default async function ReportExamWirePage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();
  return <ReportExamWire />;
}
