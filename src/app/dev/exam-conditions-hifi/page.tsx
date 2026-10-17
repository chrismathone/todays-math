import { notFound } from "next/navigation";
import { connection } from "next/server";

import { devPageVisible } from "@/lib/devPageAccess";

import { ConditionsHifi } from "./ConditionsHifi";

/**
 * **«구성 조건» 보강(M3) — Hi-fi 4안** (D-07 · 절대 규칙 1, 2026-10-17).
 *
 * Wire A(창 안에 줄 둘 더)를 원장님이 고르셨다(«추천으로 진행»). 바탕은 실제 창의 부품(`PickerDialog` ·
 * `ComposeConditions.module.css`)이고, 안끼리는 한 축만 다르다. DB 를 읽지 않는다 — 지어낸 작은 픽스처다.
 */
export default async function ExamConditionsHifiPage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();
  return <ConditionsHifi />;
}
