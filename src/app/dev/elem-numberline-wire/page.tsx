import { notFound } from "next/navigation";
import { connection } from "next/server";

import { devPageVisible } from "@/lib/devPageAccess";

import { NumberLineWire } from "./NumberLineWire";

/**
 * **초등 그림 · 형식 보강(제안 3번) — 수의 범위 수직선 Wire 시안** (D-07 · 절대 규칙 1, 2026-10-18).
 *
 * 계획서 `docs/planning/monthly-exam-plan-20261017.md` §13 — 매쓰홀릭 10월 월말평가 초3 ~ 초6 100문항을
 * 우리 그림 종류에 대 본 결과, 초5 «수의 범위와 어림하기»(우리 그림 0%)가 수직선 범위 표시와
 * «수직선이 보기»를 쓴다. 정할 것 둘: 범위를 그리는 모양 · 수직선 보기를 놓는 자리.
 * DB 를 읽지 않는다 — 지어낸 작은 픽스처다.
 */
export default async function ElemNumberLineWirePage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();
  return <NumberLineWire />;
}
