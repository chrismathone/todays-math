import { notFound } from "next/navigation";
import { connection } from "next/server";

import { devPageVisible } from "@/lib/devPageAccess";

import { PublishWire } from "./PublishWire";

/**
 * **월말평가 M1 «반에 내기» — Wire 시안** (D-07 · 절대 규칙 1, 2026-10-17).
 *
 * 계획서 `docs/planning/monthly-exam-plan-20261017.md` §4 M1 — 원장님 «진행해»(설계 B · 낸 그대로 고정).
 * 안끼리 다른 것은 내는 자리다(출력 단계 · 보관함 · 넷째 단계 · 반 화면). DB 를 읽지 않는다 — 지어낸 작은 픽스처다.
 */
export default async function ExamPublishWirePage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();
  return <PublishWire />;
}
