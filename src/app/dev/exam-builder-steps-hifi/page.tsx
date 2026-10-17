import { notFound } from "next/navigation";
import { connection } from "next/server";

import { devPageVisible } from "@/lib/devPageAccess";

import { StepsHifi } from "./StepsHifi";

/**
 * **시험지 만들기 1 · 2단계 분리 — Hi-fi 4안** (D-07 · 2026-10-17 원장님 «추천으로 진행» — Wire B).
 * 지어낸 픽스처다 — DB 를 읽지 않는다.
 */
export default async function ExamBuilderStepsHifiPage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();
  return <StepsHifi />;
}
