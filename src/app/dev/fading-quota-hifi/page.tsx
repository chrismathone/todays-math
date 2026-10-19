import { notFound } from "next/navigation";
import { connection } from "next/server";

import { devPageVisible } from "@/lib/devPageAccess";

import { QuotaHifi } from "./QuotaHifi";

/**
 * **«오늘의 기억» 학생별 하루 분량 손잡이 — Hi-fi 4안** (D-07 · 절대 규칙 1, 2026-10-17).
 *
 * 원장님이 Wire B(학생 상세에서 근거를 보고 바꾸기)와 추천 기본값을 고르셨다. 바탕은 제품의 교사 현황 H2
 * (`TeacherFadingStatus.module.css`)와 학생 탐험 홈(`explorer-concept-memory.module.css` · `FadingRelearnCheck.module.css`)
 * 그대로이고, 안끼리 다른 것은 **덧붙는 부분의 시각 처리**뿐이다. 저장 상태 문구는 네 안이 같다(codex 3차 협의).
 *
 * DB 를 읽지 않는다 — 지어낸 작은 픽스처다. ⚠️ 아무것도 저장 · 호출하지 않는다.
 */
export default async function FadingQuotaHifiPage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();
  return <QuotaHifi />;
}
